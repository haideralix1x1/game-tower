import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, {
  Rect,
  Circle,
  Path,
  G,
  Line,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Polygon,
} from 'react-native-svg';
import MiniGameHeader from '../components/MiniGameHeader';
import JuiceEngine from '../components/JuiceEngine';
import GameResultModal from '../components/GameResultModal';
import {
  triggerLightHaptic,
  triggerMediumHaptic,
  triggerHeavyHaptic,
  triggerPerfectHaptic,
  triggerGameOverHaptic,
} from '../utils/haptics';
import {
  playTapSound,
  playPerfectSound,
  playGameOverSound,
  playVictorySound,
  playZumaShootSound,
  playZumaComboSound,
  playZumaMagnetSound,
  startBGM,
  stopBGM,
} from '../utils/sound';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const STORAGE_BEST_KEY = '@game_tower:best_zuma_v1';

// Arena Dimensions
const ARENA_W = 340;
const ARENA_H = 440;
const TURRET_X = 170;
const TURRET_Y = 220;
const ORB_RADIUS = 11;
const ORB_DIAMETER = ORB_RADIUS * 2;
const BASE_TRAIN_SPEED = 0.52;
const BULLET_SPEED = 14.5;

// Cyber Neon Plasma Colors
const ORB_COLORS = [
  { id: 'CYAN', hex: '#00F5FF', glow: 'rgba(0, 245, 255, 0.45)', core: '#FFFFFF' },
  { id: 'MAGENTA', hex: '#FF0055', glow: 'rgba(255, 0, 85, 0.45)', core: '#FFE4EE' },
  { id: 'AMBER', hex: '#FFE600', glow: 'rgba(255, 230, 0, 0.45)', core: '#FFFFF0' },
  { id: 'LIME', hex: '#10B981', glow: 'rgba(16, 185, 129, 0.45)', core: '#E6FFF5' },
  { id: 'PURPLE', hex: '#A855F7', glow: 'rgba(168, 85, 247, 0.45)', core: '#FAF5FF' },
];

/**
 * Generate smooth winding non-overlapping spiral track waypoints.
 * Starts from outer orbital rim, wraps cleanly around the arena,
 * and spirals inwards towards the Singularity Vortex maintaining
 * a strict minimum 45px clearance between track arms and 75px clearance
 * from the central firing turret.
 */
function generateTrackWaypoints() {
  const points = [];
  const totalSamples = 800;
  const startAngle = 0.2 * Math.PI;
  const sweepAngle = 3.2 * Math.PI;
  const startRadius = 152;
  const endRadius = 75;

  for (let i = 0; i <= totalSamples; i++) {
    const t = i / totalSamples;
    const angle = startAngle + t * sweepAngle;
    const r = startRadius - t * (startRadius - endRadius);
    const x = TURRET_X + r * Math.cos(angle) * 0.88;
    const y = TURRET_Y + r * Math.sin(angle) * 1.15;
    points.push({ x, y });
  }

  // Pre-calculate cumulative arc length for constant-speed traversal
  const waypoints = [{ x: points[0].x, y: points[0].y, dist: 0 }];
  let accumDist = 0;

  for (let i = 1; i < points.length; i++) {
    const pPrev = points[i - 1];
    const pCurr = points[i];
    const segDist = Math.hypot(pCurr.x - pPrev.x, pCurr.y - pPrev.y);
    accumDist += segDist;
    waypoints.push({ x: pCurr.x, y: pCurr.y, dist: accumDist });
  }

  const svgPath = waypoints.reduce(
    (acc, p, idx) =>
      idx === 0
        ? `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
        : `${acc} L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`,
    ''
  );

  return { waypoints, totalLength: accumDist, svgPath };
}

const {
  waypoints: TRACK_WAYPOINTS,
  totalLength: TRACK_LENGTH,
  svgPath: TRACK_SVG_PATH,
} = generateTrackWaypoints();

// Helper: Get coordinate (x, y) at exact path distance
function getPointAtDistance(d) {
  if (d <= 0) return { x: TRACK_WAYPOINTS[0].x, y: TRACK_WAYPOINTS[0].y };
  if (d >= TRACK_LENGTH) {
    const last = TRACK_WAYPOINTS[TRACK_WAYPOINTS.length - 1];
    return { x: last.x, y: last.y };
  }

  // Binary search for segment
  let low = 0;
  let high = TRACK_WAYPOINTS.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (TRACK_WAYPOINTS[mid].dist < d) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const idx = Math.max(1, low);
  const p0 = TRACK_WAYPOINTS[idx - 1];
  const p1 = TRACK_WAYPOINTS[idx];
  const segmentLen = p1.dist - p0.dist || 0.001;
  const ratio = (d - p0.dist) / segmentLen;

  return {
    x: p0.x + (p1.x - p0.x) * ratio,
    y: p0.y + (p1.y - p0.y) * ratio,
  };
}

export default function NeonZumaGame({
  onBackToHub,
  onScoreUpdate,
  isPaused = false,
}) {
  const isPausedRef = useRef(isPaused);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const { width, height } = useWindowDimensions();
  const arenaScale = Math.min((width - 24) / ARENA_W, (height - 230) / ARENA_H, 1.15);

  const juiceRef = useRef(null);

  // High score & Match score
  const [highScore, setHighScore] = useState(0);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const [gameState, setGameState] = useState('PLAYING'); // 'PLAYING' | 'GAMEOVER' | 'VICTORY'
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [modalType, setModalType] = useState('VICTORY');

  // Turret State
  const [turretAngle, setTurretAngle] = useState(0); // in radians
  const [currentOrbColor, setCurrentOrbColor] = useState(ORB_COLORS[0]);
  const [nextOrbColor, setNextOrbColor] = useState(ORB_COLORS[1]);

  // Simulation Refs (60 FPS Performance)
  const animFrameRef = useRef(null);
  const orbsChainRef = useRef([]); // array of { id, color, dist }
  const firedBulletsRef = useRef([]); // array of { id, x, y, vx, vy, color }
  const orbsToSpawnRemainingRef = useRef(38);
  const reverseRollTimerRef = useRef(0);
  const slowTimerRef = useRef(0);
  const nextOrbIdRef = useRef(1);

  // Reactive state for 60 FPS rendering
  const [renderOrbs, setRenderOrbs] = useState([]);
  const [renderBullets, setRenderBullets] = useState([]);

  // Load Saved High Score
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_BEST_KEY);
        if (saved !== null) {
          const val = parseInt(saved, 10);
          if (!isNaN(val)) setHighScore(val);
        }
      } catch {}
    })();
  }, []);

  // Pick random color from available colors currently present on the track
  const pickSmartColor = useCallback(() => {
    const chain = orbsChainRef.current;
    if (chain.length > 0 && Math.random() < 0.85) {
      const existingColors = Array.from(new Set(chain.map((o) => o.color.id)));
      const matchingObjs = ORB_COLORS.filter((c) => existingColors.includes(c.id));
      if (matchingObjs.length > 0) {
        return matchingObjs[Math.floor(Math.random() * matchingObjs.length)];
      }
    }
    return ORB_COLORS[Math.floor(Math.random() * ORB_COLORS.length)];
  }, []);

  // Initialize Game Level
  const initLevel = useCallback(
    (lvl = 1) => {
      const initialCount = 18 + lvl * 4;
      const initialChain = [];
      const leadStartDist = (initialCount - 1) * ORB_DIAMETER + 40;

      for (let i = 0; i < initialCount; i++) {
        const color = ORB_COLORS[Math.floor(Math.random() * Math.min(3 + lvl, ORB_COLORS.length))];
        initialChain.push({
          id: nextOrbIdRef.current++,
          color,
          dist: leadStartDist - i * ORB_DIAMETER,
        });
      }

      orbsChainRef.current = initialChain;
      orbsToSpawnRemainingRef.current = 20 + lvl * 8;
      firedBulletsRef.current = [];
      reverseRollTimerRef.current = 0;
      slowTimerRef.current = 0;

      const c1 = ORB_COLORS[Math.floor(Math.random() * ORB_COLORS.length)];
      const c2 = ORB_COLORS[Math.floor(Math.random() * ORB_COLORS.length)];
      setCurrentOrbColor(c1);
      setNextOrbColor(c2);

      setScore(0);
      setComboMultiplier(1);
      setGameState('PLAYING');
      setResultModalVisible(false);
    },
    []
  );

  useEffect(() => {
    initLevel(level);
  }, [initLevel, level]);

  // Background Music removed per user request (pure crisp sound effects)
  useEffect(() => {
    stopBGM();
    return () => {
      stopBGM();
    };
  }, []);

  // Swap Current & Next Orb (Zuma Spacebar / Turret Tap)
  const handleSwapOrbs = useCallback(() => {
    playTapSound();
    triggerLightHaptic();
    setCurrentOrbColor(nextOrbColor);
    setNextOrbColor(currentOrbColor);
  }, [currentOrbColor, nextOrbColor]);

  // Aim & Shoot Orb
  const handleShoot = useCallback(
    (targetX, targetY) => {
      if (gameState !== 'PLAYING') return;

      const dx = targetX - TURRET_X;
      const dy = targetY - TURRET_Y;
      const dist = Math.hypot(dx, dy);

      // If tapped directly on the turret itself, swap orbs!
      if (dist < 32) {
        handleSwapOrbs();
        return;
      }

      const angle = Math.atan2(dy, dx);
      setTurretAngle(angle);

      // Fire projectile
      const vx = Math.cos(angle) * BULLET_SPEED;
      const vy = Math.sin(angle) * BULLET_SPEED;

      firedBulletsRef.current.push({
        id: nextOrbIdRef.current++,
        x: TURRET_X + Math.cos(angle) * 24,
        y: TURRET_Y + Math.sin(angle) * 24,
        vx,
        vy,
        color: currentOrbColor,
      });

      playZumaShootSound();
      triggerMediumHaptic();

      // Reload Turret with next orb and pick new next orb
      setCurrentOrbColor(nextOrbColor);
      setNextOrbColor(pickSmartColor());
    },
    [gameState, currentOrbColor, nextOrbColor, handleSwapOrbs, pickSmartColor]
  );

  // Check & Resolve Matches of 3+ Consecutive Same-Color Orbs
  const checkMatchesAt = useCallback((chain, startIndex) => {
    if (startIndex < 0 || startIndex >= chain.length) return false;

    const targetColor = chain[startIndex].color.id;
    let left = startIndex;
    let right = startIndex;

    // Scan left
    while (left > 0 && chain[left - 1].color.id === targetColor) {
      left--;
    }
    // Scan right
    while (right < chain.length - 1 && chain[right + 1].color.id === targetColor) {
      right++;
    }

    const matchCount = right - left + 1;
    if (matchCount >= 3) {
      // POP MATCH!
      const popped = chain.splice(left, matchCount);

      // Calculate score & trigger juice
      const points = matchCount * 120;
      setScore((s) => s + points);
      playZumaComboSound();
      triggerPerfectHaptic(2);

      const popPos = getPointAtDistance(popped[0].dist);
      if (juiceRef.current) {
        juiceRef.current.burst(popPos.x, popPos.y, popped[0].color.hex, 16);
        juiceRef.current.popup(`+${points}`, `${matchCount}x COMBO!`, popped[0].color.hex);
      }

      // Magnetic Attraction Check: If colors on both sides of the gap match, pull back!
      if (left > 0 && left < chain.length) {
        if (chain[left - 1].color.id === chain[left].color.id) {
          reverseRollTimerRef.current = 28; // Rapid pull back
          playZumaMagnetSound();
          triggerLightHaptic();
        }
      }

      return true;
    }
    return false;
  }, []);

  // Main 60 FPS Engine
  useEffect(() => {
    let active = true;

    const gameLoop = () => {
      if (!active) return;
      animFrameRef.current = requestAnimationFrame(gameLoop);

      if (isPausedRef.current || gameState !== 'PLAYING') return;

      const chain = orbsChainRef.current;
      const bullets = firedBulletsRef.current;

      // 1. Advance / Roll Train along Track
      let trainDelta = BASE_TRAIN_SPEED;
      if (reverseRollTimerRef.current > 0) {
        trainDelta = -1.5; // Roll backwards during magnetic snap
        reverseRollTimerRef.current--;
      } else if (slowTimerRef.current > 0) {
        trainDelta *= 0.35;
        slowTimerRef.current--;
      }

      // Update positions along track
      if (chain.length > 0) {
        // Advance lead orb
        chain[0].dist += trainDelta;

        // Advance follower orbs with rigid collision & magnetic snap constraint
        for (let i = 1; i < chain.length; i++) {
          const maxAllowed = chain[i - 1].dist - ORB_DIAMETER;
          if (reverseRollTimerRef.current > 0) {
            // Gap closing magnetic attraction
            if (chain[i].dist < maxAllowed) {
              chain[i].dist += 3.2; // Rapid pull towards orb ahead
              if (chain[i].dist >= maxAllowed) {
                chain[i].dist = maxAllowed;
                checkMatchesAt(chain, i);
              }
            } else {
              chain[i].dist = maxAllowed;
            }
          } else {
            // Normal forward roll
            if (chain[i].dist < maxAllowed) {
              chain[i].dist += trainDelta;
              if (chain[i].dist > maxAllowed) {
                chain[i].dist = maxAllowed;
              }
            } else {
              chain[i].dist = maxAllowed;
            }
          }
        }
      }

      // Spawn incoming orbs at TAIL of train if quota remains
      if (orbsToSpawnRemainingRef.current > 0) {
        if (chain.length === 0) {
          const newColor = ORB_COLORS[Math.floor(Math.random() * ORB_COLORS.length)];
          chain.push({
            id: nextOrbIdRef.current++,
            color: newColor,
            dist: 0,
          });
          orbsToSpawnRemainingRef.current--;
        } else {
          const tail = chain[chain.length - 1];
          if (tail.dist >= ORB_DIAMETER) {
            const newColor = ORB_COLORS[Math.floor(Math.random() * ORB_COLORS.length)];
            chain.push({
              id: nextOrbIdRef.current++,
              color: newColor,
              dist: tail.dist - ORB_DIAMETER,
            });
            orbsToSpawnRemainingRef.current--;
          }
        }
      }

      // 2. Check Game Over (Leading orb enters Singularity Vortex at end of track)
      if (chain.length > 0 && chain[0].dist >= TRACK_LENGTH - 10) {
        setGameState('GAMEOVER');
        setModalType('GAMEOVER');
        setResultModalVisible(true);
        playGameOverSound();
        triggerGameOverHaptic();
        if (juiceRef.current) juiceRef.current.shake(20, 15);
        return;
      }

      // 3. Check Victory (All spawned orbs cleared from track)
      if (chain.length === 0 && orbsToSpawnRemainingRef.current <= 0) {
        setGameState('VICTORY');
        setModalType('VICTORY');
        setResultModalVisible(true);
        playVictorySound();
        triggerPerfectHaptic(3);
        if (juiceRef.current) {
          juiceRef.current.celebrate('LEVEL CLEARED!', `SCORE: ${score}`, '#00F5FF');
        }
        setHighScore((prev) => {
          const next = Math.max(prev, score);
          if (next > prev) {
            AsyncStorage.setItem(STORAGE_BEST_KEY, String(next)).catch(() => {});
            onScoreUpdate?.(next);
          }
          return next;
        });
        return;
      }

      // 4. Update Fired Bullets & Collision Check with Orb Chain
      for (let bIdx = bullets.length - 1; bIdx >= 0; bIdx--) {
        const b = bullets[bIdx];
        b.x += b.vx;
        b.y += b.vy;

        // Check arena boundary exit
        if (b.x < -20 || b.x > ARENA_W + 20 || b.y < -20 || b.y > ARENA_H + 20) {
          bullets.splice(bIdx, 1);
          continue;
        }

        // Check collision against all orbs in chain
        let hit = false;
        for (let oIdx = 0; oIdx < chain.length; oIdx++) {
          const orb = chain[oIdx];
          const orbPos = getPointAtDistance(orb.dist);
          const dist = Math.hypot(b.x - orbPos.x, b.y - orbPos.y);

          if (dist < ORB_RADIUS * 1.85) {
            // Collision! Insert orb into chain
            hit = true;
            playTapSound();
            triggerMediumHaptic();

            // Tangent along track at orb position
            const p0 = getPointAtDistance(Math.max(0, orb.dist - 1));
            const p1 = getPointAtDistance(Math.min(TRACK_LENGTH, orb.dist + 1));
            const tx = p1.x - p0.x;
            const ty = p1.y - p0.y;
            const bx = b.x - orbPos.x;
            const by = b.y - orbPos.y;
            const isFront = (bx * tx + by * ty) > 0;

            let insertIdx;
            let targetDist;

            if (isFront) {
              // Hit front of orb: push all orbs ahead (0 .. oIdx - 1) forward towards danger vortex!
              for (let k = 0; k < oIdx; k++) {
                chain[k].dist += ORB_DIAMETER;
              }
              targetDist = orb.dist + ORB_DIAMETER;
              insertIdx = oIdx;
            } else {
              // Hit back of orb: push all orbs ahead including hit orb (0 .. oIdx) forward towards danger vortex!
              const oldOrbDist = orb.dist;
              for (let k = 0; k <= oIdx; k++) {
                chain[k].dist += ORB_DIAMETER;
              }
              targetDist = oldOrbDist;
              insertIdx = oIdx + 1;
            }

            // Insert new orb at insertIdx with exact spacing
            chain.splice(insertIdx, 0, {
              id: nextOrbIdRef.current++,
              color: b.color,
              dist: targetDist,
            });

            bullets.splice(bIdx, 1);

            // Check for match-3 pop
            checkMatchesAt(chain, insertIdx);
            break;
          }
        }
      }

      // 5. Sync visual render list
      const rendered = chain.map((o) => {
        const pt = getPointAtDistance(o.dist);
        return {
          id: o.id,
          x: pt.x,
          y: pt.y,
          color: o.color,
        };
      });

      setRenderOrbs(rendered);
      setRenderBullets(bullets.map((b) => ({ ...b })));
    };

    animFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, score, checkMatchesAt, onScoreUpdate]);

  // Touch Aim & Shoot
  const handleTouch = (e) => {
    const { locationX, locationY } = e.nativeEvent;
    handleShoot(locationX / arenaScale, locationY / arenaScale);
  };

  const vortexPos = getPointAtDistance(TRACK_LENGTH);

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={styles.container}>
        {/* Header */}
        <MiniGameHeader
          floorNum={26}
          gameTitle="NEON ZUMA"
          category="MARBLE SHOOTER"
          accentColor="#00F5FF"
          score={score}
          highScore={highScore}
          onBack={onBackToHub}
          onBackToHub={onBackToHub}
        />

        {/* Live Match HUD */}
        <View style={styles.hudBar}>
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>ORBS REMAINING</Text>
            <Text style={styles.statValue}>
              {renderOrbs.length + orbsToSpawnRemainingRef.current}
            </Text>
          </View>

          <Pressable onPress={handleSwapOrbs} style={styles.swapBtn}>
            <Text style={styles.swapBtnText}>🔄 SWAP ORB</Text>
          </Pressable>

          <View style={styles.statPill}>
            <Text style={styles.statLabel}>NEXT ORB</Text>
            <View
              style={[
                styles.nextOrbDot,
                { backgroundColor: nextOrbColor.hex, shadowColor: nextOrbColor.hex },
              ]}
            />
          </View>
        </View>

        {/* 2D Cyber Zuma Arena */}
        <View
          style={[
            styles.arenaWrapper,
            { width: ARENA_W * arenaScale, height: ARENA_H * arenaScale },
          ]}
          onTouchStart={handleTouch}
        >
          <Svg
            width={ARENA_W * arenaScale}
            height={ARENA_H * arenaScale}
            viewBox={`0 0 ${ARENA_W} ${ARENA_H}`}
          >
            <Defs>
              <LinearGradient id="bgZuma" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#060913" />
                <Stop offset="1" stopColor="#020307" />
              </LinearGradient>
              <RadialGradient id="singularityGlow" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor="#FF0055" stopOpacity="0.85" />
                <Stop offset="70%" stopColor="#A855F7" stopOpacity="0.35" />
                <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </RadialGradient>
              <RadialGradient id="turretAura" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor="#00F5FF" stopOpacity="0.3" />
                <Stop offset="100%" stopColor="#00F5FF" stopOpacity="0" />
              </RadialGradient>
            </Defs>

            {/* Arena Floor */}
            <Rect x={0} y={0} width={ARENA_W} height={ARENA_H} fill="url(#bgZuma)" />

            {/* Cyber Circuit Grid */}
            {Array.from({ length: 9 }).map((_, i) => (
              <Line
                key={`hl_${i}`}
                x1={0}
                y1={i * 50}
                x2={ARENA_W}
                y2={i * 50}
                stroke="#131B2E"
                strokeWidth={1}
                strokeDasharray="4,6"
              />
            ))}
            {Array.from({ length: 7 }).map((_, i) => (
              <Line
                key={`vl_${i}`}
                x1={i * 50}
                y1={0}
                x2={i * 50}
                y2={ARENA_H}
                stroke="#131B2E"
                strokeWidth={1}
                strokeDasharray="4,6"
              />
            ))}

            {/* Winding Non-Overlapping Track Glow Trench */}
            <Path
              d={TRACK_SVG_PATH}
              stroke="#0A1124"
              strokeWidth={26}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d={TRACK_SVG_PATH}
              stroke="#1A2744"
              strokeWidth={20}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d={TRACK_SVG_PATH}
              stroke="#00F5FF"
              strokeWidth={1.5}
              strokeDasharray="4,6"
              fill="none"
              opacity={0.4}
            />

            {/* The Singularity Core (Danger Hole at end of track) */}
            <Circle
              cx={vortexPos.x}
              cy={vortexPos.y}
              r={28}
              fill="url(#singularityGlow)"
            />
            <Circle
              cx={vortexPos.x}
              cy={vortexPos.y}
              r={16}
              fill="#060913"
              stroke="#FF0055"
              strokeWidth={2.5}
              strokeDasharray="5,3"
            />
            <Circle cx={vortexPos.x} cy={vortexPos.y} r={7} fill="#FF0055" />

            {/* Moving Train of Colored Plasma Orbs */}
            {renderOrbs.map((orb) => (
              <G key={`orb_${orb.id}`}>
                {/* Glow Aura */}
                <Circle
                  cx={orb.x}
                  cy={orb.y}
                  r={ORB_RADIUS + 3}
                  fill={orb.color.glow}
                />
                {/* Outer Plasma Sphere */}
                <Circle
                  cx={orb.x}
                  cy={orb.y}
                  r={ORB_RADIUS}
                  fill={orb.color.hex}
                  stroke="#FFFFFF"
                  strokeWidth={1}
                />
                {/* Radiant Core */}
                <Circle
                  cx={orb.x - 3}
                  cy={orb.y - 3}
                  r={3.5}
                  fill={orb.color.core}
                  opacity={0.85}
                />
              </G>
            ))}

            {/* In-Flight Fired Plasma Bullets */}
            {renderBullets.map((b) => (
              <G key={`b_${b.id}`}>
                <Circle cx={b.x} cy={b.y} r={ORB_RADIUS + 4} fill={b.color.glow} />
                <Circle
                  cx={b.x}
                  cy={b.y}
                  r={ORB_RADIUS}
                  fill={b.color.hex}
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                />
                <Circle cx={b.x} cy={b.y} r={4} fill="#FFFFFF" />
              </G>
            ))}

            {/* Central Rotating Cyber Cannon Turret */}
            <G>
              {/* Turret Base Aura */}
              <Circle
                cx={TURRET_X}
                cy={TURRET_Y}
                r={44}
                fill="url(#turretAura)"
              />
              <Circle
                cx={TURRET_X}
                cy={TURRET_Y}
                r={30}
                fill="#0A1020"
                stroke="#00F5FF"
                strokeWidth={2}
              />

              {/* Aiming Laser Sight Line */}
              <Line
                x1={TURRET_X + Math.cos(turretAngle) * 32}
                y1={TURRET_Y + Math.sin(turretAngle) * 32}
                x2={TURRET_X + Math.cos(turretAngle) * 220}
                y2={TURRET_Y + Math.sin(turretAngle) * 220}
                stroke="#00F5FF"
                strokeWidth={1.2}
                strokeDasharray="4,4"
                opacity={0.45}
              />

              {/* Turret Dual Barrels */}
              <Line
                x1={TURRET_X + Math.cos(turretAngle) * 16}
                y1={TURRET_Y + Math.sin(turretAngle) * 16}
                x2={TURRET_X + Math.cos(turretAngle) * 36}
                y2={TURRET_Y + Math.sin(turretAngle) * 36}
                stroke="#1E2D4A"
                strokeWidth={8}
                strokeLinecap="round"
              />
              <Line
                x1={TURRET_X + Math.cos(turretAngle) * 16}
                y1={TURRET_Y + Math.sin(turretAngle) * 16}
                x2={TURRET_X + Math.cos(turretAngle) * 36}
                y2={TURRET_Y + Math.sin(turretAngle) * 36}
                stroke="#00F5FF"
                strokeWidth={2}
                strokeLinecap="round"
              />

              {/* Ready Loaded Orb inside Cannon Turret */}
              <Circle
                cx={TURRET_X}
                cy={TURRET_Y}
                r={ORB_RADIUS + 2}
                fill={currentOrbColor.glow}
              />
              <Circle
                cx={TURRET_X}
                cy={TURRET_Y}
                r={ORB_RADIUS}
                fill={currentOrbColor.hex}
                stroke="#FFFFFF"
                strokeWidth={1.5}
              />
              <Circle cx={TURRET_X - 2.5} cy={TURRET_Y - 2.5} r={3.5} fill="#FFFFFF" />
            </G>
          </Svg>
        </View>

        {/* Bottom Helper Instruction */}
        <View style={styles.tipBox}>
          <Text style={styles.tipText}>
            TAP SCREEN TO FIRE • TAP TURRET TO SWAP ORB • MATCH 3 TO EXPLODE
          </Text>
        </View>

        {/* Result & High Score Modal */}
        <GameResultModal
          visible={resultModalVisible}
          type={modalType}
          score={score}
          highScore={highScore}
          onRestart={() => initLevel(level)}
          onBackToHub={onBackToHub}
        />
      </View>
    </JuiceEngine>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030509',
    alignItems: 'center',
  },
  hudBar: {
    width: '100%',
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statPill: {
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: monoFont,
    fontSize: 9,
    fontWeight: '700',
    color: '#657494',
    letterSpacing: 0.8,
  },
  statValue: {
    fontFamily: monoFont,
    fontSize: 15,
    fontWeight: '900',
    color: '#00F5FF',
  },
  swapBtn: {
    backgroundColor: '#0F182E',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00F5FF',
  },
  swapBtnText: {
    fontFamily: monoFont,
    fontSize: 11,
    fontWeight: '900',
    color: '#00F5FF',
    letterSpacing: 0.8,
  },
  nextOrbDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  arenaWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#19253F',
    backgroundColor: '#020307',
    shadowColor: '#00F5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  tipBox: {
    marginTop: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  tipText: {
    fontFamily: monoFont,
    fontSize: 9,
    fontWeight: '700',
    color: '#657494',
    textAlign: 'center',
    letterSpacing: 0.6,
  },
});
