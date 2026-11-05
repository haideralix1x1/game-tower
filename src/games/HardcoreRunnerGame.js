import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, {
  Rect,
  Polygon,
  Circle,
  Line,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  G,
  Path,
  Text as SvgText,
} from 'react-native-svg';
import MiniGameHeader from '../components/MiniGameHeader';
import GameResultModal from '../components/GameResultModal';
import JuiceEngine from '../components/JuiceEngine';
import { playTapSound, playSliceSound, playGameOverSound } from '../utils/sound';
import {
  triggerLightHaptic,
  triggerMediumHaptic,
  triggerGameOverHaptic,
} from '../utils/haptics';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const STORAGE_HIGH_SCORE_KEY = '@game_tower:best_dash_v1';


function getGroundSurfaceAtX(worldX, platforms, baseFloorY) {
  for (let i = 0; i < platforms.length; i++) {
    const p = platforms[i];
    if (worldX >= p.x && worldX <= p.x + p.w) {
      if (p.type === 'RAMP_UP') {
        const ratio = Math.max(0, Math.min(1, (worldX - p.x) / p.w));
        return baseFloorY - ratio * p.h;
      } else if (p.type === 'RAMP_DOWN') {
        const ratio = Math.max(0, Math.min(1, (worldX - p.x) / p.w));
        return baseFloorY - (1 - ratio) * p.h;
      } else if (p.type === 'PLATFORM') {
        return baseFloorY - p.h;
      }
    }
  }
  return baseFloorY;
}

// Cube and physics parameters
const CUBE_SIZE = 22;
const SPEED = 4.8;
const GRAVITY = 0.52;
const JUMP_VELOCITY = -8.2;
const CORRIDOR_HEIGHT = 114;

// Phase Thresholds in Distance (Endless Mode Progression)
const PHASE_THRESHOLDS = [
  { phase: 1, name: 'CUBE PROTOCOL', desc: 'BASIC HURDLE RUN', startDist: 0, color: '#FFE600' },
  { phase: 2, name: 'SPIKE MATRIX', desc: 'SHARP GROUND SPIKES', startDist: 1000, color: '#FF0055' },
  { phase: 3, name: 'AERO-DROP HAZARDS', desc: 'ARROW SPIKES SLAMMING DOWN', startDist: 2400, color: '#FF6D00' },
  { phase: 4, name: 'PLASMA BARRAGE', desc: 'INCOMING FRONT PROJECTILES', startDist: 4000, color: '#00F5FF' },
  { phase: 5, name: 'VOID CHASMS', desc: 'BOTTOM LINE GAPS // ABYSS', startDist: 5800, color: '#9D4EDD' },
];

function getPhaseForDistance(dist) {
  for (let i = PHASE_THRESHOLDS.length - 1; i >= 0; i--) {
    if (dist >= PHASE_THRESHOLDS[i].startDist) {
      return PHASE_THRESHOLDS[i];
    }
  }
  return PHASE_THRESHOLDS[0];
}

// Generate static ambient background stars (lightweight, zero per-frame math)
function createGalaxyStars(count = 20) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      id: `star_${i}`,
      origX: Math.random() * 1200,
      yRatio: Math.random(),
      r: Math.random() > 0.7 ? 1.5 : 1.0,
      parallax: 0.15 + (i % 3) * 0.08,
      color: i % 3 === 0 ? '#00F5FF' : i % 3 === 1 ? '#FFE600' : '#FFFFFF',
      opacity: 0.35 + (i % 4) * 0.15,
    });
  }
  return stars;
}

// Cute Kawaii Space Pals roaming OUTSIDE the 2 corridor lines
function createInitialNpcShips() {
  return [
    {
      id: 'ship_ufo_1',
      zone: 'UPPER',
      type: 'CUTE_UFO',
      x: 70,
      offsetY: 42,
      speed: 0.9,
      dir: 1,
      scale: 1.0,
      phase: 0.5,
    },
    {
      id: 'ship_rocket_1',
      zone: 'LOWER',
      type: 'CHIBI_ROCKET',
      x: 240,
      offsetY: 46,
      speed: 1.3,
      dir: 1,
      scale: 0.95,
      phase: 2.1,
    },
    {
      id: 'ship_kitty_1',
      zone: 'UPPER',
      type: 'STAR_KITTY',
      x: 320,
      offsetY: 58,
      speed: 0.75,
      dir: -1,
      scale: 0.95,
      phase: 3.6,
    },
  ];
}

export default function HardcoreRunnerGame({ onBackToHub, onScoreUpdate, isPaused = false }) {
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const { width, height } = useWindowDimensions();
  const arenaWidth = width;
  const arenaHeight = height - 120;

  // Horizontal Corridor geometry (The 2 Lines)
  const corridorCenterY = arenaHeight * 0.52;
  const ceilingY = corridorCenterY - CORRIDOR_HEIGHT / 2;
  const floorY = corridorCenterY + CORRIDOR_HEIGHT / 2;
  const groundY = floorY - CUBE_SIZE;
  const playerScreenX = 72;

  // Game & visual state
  const [isPlaying, setIsPlaying] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [currentPhase, setCurrentPhase] = useState(PHASE_THRESHOLDS[0]);
  const [phaseBanner, setPhaseBanner] = useState(null);

  // Consolidated 60 FPS visual state (Only 1 state update per frame to eliminate lag)
  const [frameState, setFrameState] = useState({
    distance: 0,
    playerY: groundY,
    rotation: 0,
    score: 0,
  });

  // Result modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('gameover');
  const [crashCause, setCrashCause] = useState('COLLISION');

  // Physics refs for 60 FPS synchronous calculation
  const playerYRef = useRef(groundY);
  const playerVyRef = useRef(0);
  const distanceRef = useRef(0);
  const rotationRef = useRef(0);
  const obstaclesRef = useRef([]);
  const gapsRef = useRef([]);
  const platformsRef = useRef([]);
  const spawnCursorXRef = useRef(420);
  const currentPhaseRef = useRef(currentPhase);
  const animFrameRef = useRef(null);
  const tickCountRef = useRef(0);

  // Ambient galaxy refs
  const starsRef = useRef(createGalaxyStars());
  const npcShipsRef = useRef(createInitialNpcShips());

  // Load high score
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_HIGH_SCORE_KEY);
        if (saved !== null) {
          const val = parseInt(saved, 10);
          if (!isNaN(val)) setHighScore(val);
        }
      } catch {}
    })();
  }, []);

  /**
   * Procedural Endless Obstacle Spawner.
   * All obstacles spawn strictly ON THE BOTTOM LINE or inside the corridor.
   */
  const spawnAhead = useCallback((targetWorldX) => {
    let curX = spawnCursorXRef.current;
    const newObs = [];
    const newGaps = [];
    const newPlatforms = [];

    while (curX < targetWorldX) {
      // ALL enemies and obstacles active immediately right from the start!
      const options = [
        'BLOCK',
        'SPIKE_BOTTOM',
        'SPIKE_BOTTOM_DOUBLE',
        'RAMP_SECTION',
        'SPIKE_DROP',
        'PROJECTILE_LOW',
        'PROJECTILE_HIGH',
        'GAP',
      ];

      const pick = options[Math.floor(Math.random() * options.length)];

      if (pick === 'BLOCK') {
        newObs.push({
          id: `blk_${curX}`,
          type: 'BLOCK',
          x: curX,
          w: 24,
          h: 22,
        });
        curX += 300 + Math.random() * 80;
      } else if (pick === 'SPIKE_BOTTOM') {
        newObs.push({
          id: `sp_f_${curX}`,
          type: 'SPIKE_BOTTOM',
          x: curX,
          w: 22,
          h: 22,
        });
        curX += 290 + Math.random() * 80;
      } else if (pick === 'SPIKE_BOTTOM_DOUBLE') {
        newObs.push({
          id: `sp_f1_${curX}`,
          type: 'SPIKE_BOTTOM',
          x: curX,
          w: 20,
          h: 22,
        });
        newObs.push({
          id: `sp_f2_${curX}`,
          type: 'SPIKE_BOTTOM',
          x: curX + 20,
          w: 20,
          h: 22,
        });
        curX += 350 + Math.random() * 90;
      } else if (pick === 'RAMP_SECTION') {
        // Ramp Up -> Elevated Platform -> Ramp Down
        const rampW = 64;
        const platW = 110;
        const rampH = 26;
        newPlatforms.push({
          id: `ramp_u_${curX}`,
          type: 'RAMP_UP',
          x: curX,
          w: rampW,
          h: rampH,
        });
        newPlatforms.push({
          id: `plat_${curX}`,
          type: 'PLATFORM',
          x: curX + rampW,
          w: platW,
          h: rampH,
        });
        newPlatforms.push({
          id: `ramp_d_${curX}`,
          type: 'RAMP_DOWN',
          x: curX + rampW + platW,
          w: rampW,
          h: rampH,
        });
        curX += rampW * 2 + platW + 280 + Math.random() * 80;
      } else if (pick === 'SPIKE_DROP') {
        newObs.push({
          id: `sp_drop_${curX}`,
          type: 'SPIKE_DROP',
          x: curX,
          w: 22,
          h: 24,
        });
        curX += 320 + Math.random() * 90;
      } else if (pick === 'PROJECTILE_LOW') {
        newObs.push({
          id: `proj_l_${curX}`,
          type: 'PROJECTILE',
          altitude: 'LOW',
          x: curX,
          spawnDist: curX - 550,
          w: 28,
          h: 10,
        });
        curX += 360 + Math.random() * 100;
      } else if (pick === 'PROJECTILE_HIGH') {
        newObs.push({
          id: `proj_h_${curX}`,
          type: 'PROJECTILE',
          altitude: 'HIGH',
          x: curX,
          spawnDist: curX - 550,
          w: 28,
          h: 10,
        });
        curX += 360 + Math.random() * 100;
      } else if (pick === 'GAP') {
        const gapWidth = 92;
        newGaps.push({
          id: `gap_${curX}`,
          x: curX,
          w: gapWidth,
        });
        curX += gapWidth + 300 + Math.random() * 100;
      }
    }

    spawnCursorXRef.current = curX;
    if (newObs.length > 0) {
      obstaclesRef.current = [...obstaclesRef.current, ...newObs];
    }
    if (newGaps.length > 0) {
      gapsRef.current = [...gapsRef.current, ...newGaps];
    }
    if (newPlatforms.length > 0) {
      platformsRef.current = [...platformsRef.current, ...newPlatforms];
    }
  }, []);

  // Initialize level
  const initLevel = useCallback(() => {
    playerYRef.current = groundY;
    playerVyRef.current = 0;
    distanceRef.current = 0;
    rotationRef.current = 0;
    spawnCursorXRef.current = 420;
    tickCountRef.current = 0;
    obstaclesRef.current = [];
    gapsRef.current = [];
    platformsRef.current = [];

    setFrameState({
      distance: 0,
      playerY: groundY,
      rotation: 0,
      score: 0,
    });
    setIsPlaying(false);
    setModalVisible(false);
    setCurrentPhase(PHASE_THRESHOLDS[0]);
    currentPhaseRef.current = PHASE_THRESHOLDS[0];
    setPhaseBanner(null);

    // Initial runway spawn
    spawnAhead(1400);
  }, [groundY, spawnAhead]);

  useEffect(() => {
    initLevel();
  }, [initLevel]);

  // Handle jump
  const handleJump = () => {
    if (isPausedRef.current) return;
    if (!isPlaying) {
      setIsPlaying(true);
    }

    const curDist = distanceRef.current;
    const curPlayerCenterX = curDist + playerScreenX + CUBE_SIZE * 0.5;
    const currentFloor = getGroundSurfaceAtX(curPlayerCenterX, platformsRef.current, floorY);
    const targetSurfaceY = currentFloor - CUBE_SIZE;

    const onPlatform = platformsRef.current.some(
      (p) => curPlayerCenterX >= p.x && curPlayerCenterX <= p.x + p.w
    );

    // Fair gap collision: Player ONLY falls if center has actually crossed into gap
    const isOverGap =
      !onPlatform &&
      gapsRef.current.some(
        (g) => curPlayerCenterX >= g.x + 8 && curPlayerCenterX <= g.x + g.w - 8
      );

    const isGrounded = !isOverGap && playerYRef.current >= targetSurfaceY - 5;

    if (isGrounded) {
      playerVyRef.current = JUMP_VELOCITY;
      playTapSound();
      triggerLightHaptic();
    }
  };

  // High-performance 60 FPS Physics & Game Loop
  useEffect(() => {
    if (!isPlaying) return;

    let active = true;

    const tick = () => {
      if (!active) return;
      if (isPausedRef.current) {
        animFrameRef.current = requestAnimationFrame(tick);
        return;
      }
      tickCountRef.current += 1;

      const nextDist = distanceRef.current + SPEED;
      distanceRef.current = nextDist;

      const nextScore = Math.floor(nextDist / 5);

      // Check progression phase updates
      const newPhase = getPhaseForDistance(nextDist);
      if (newPhase.phase !== currentPhaseRef.current.phase) {
        currentPhaseRef.current = newPhase;
        setCurrentPhase(newPhase);
        setPhaseBanner(newPhase);
        triggerMediumHaptic();
        playSliceSound();
        setTimeout(() => {
          setPhaseBanner((curr) => (curr?.phase === newPhase.phase ? null : curr));
        }, 2400);
      }

      // Dynamically spawn more track ahead in endless mode
      if (spawnCursorXRef.current < nextDist + arenaWidth + 900) {
        spawnAhead(nextDist + arenaWidth + 1800);
      }

      // Cull offscreen obstacles behind player periodically
      if (tickCountRef.current % 120 === 0) {
        obstaclesRef.current = obstaclesRef.current.filter((o) => o.x > nextDist - 250);
        gapsRef.current = gapsRef.current.filter((g) => g.x + g.w > nextDist - 250);
        platformsRef.current = platformsRef.current.filter((p) => p.x + p.w > nextDist - 250);
      }

      // Update ambient roaming cute space pals
      const ships = npcShipsRef.current;
      for (const ship of ships) {
        ship.x += ship.speed * ship.dir;
        if (ship.dir === 1 && ship.x > arenaWidth + 60) {
          ship.x = -60;
        } else if (ship.dir === -1 && ship.x < -60) {
          ship.x = arenaWidth + 60;
        }
      }

      // Player coordinate calculations
      const curPlayerCenterX = nextDist + playerScreenX + CUBE_SIZE * 0.5;
      const curFloorSurface = getGroundSurfaceAtX(curPlayerCenterX, platformsRef.current, floorY);
      const targetGroundY = curFloorSurface - CUBE_SIZE;

      const onPlatform = platformsRef.current.some(
        (p) => curPlayerCenterX >= p.x && curPlayerCenterX <= p.x + p.w
      );

      // Fair gap collision: Player ONLY falls if center is inside the gap with 8px edge safety margin
      const isOverGap =
        !onPlatform &&
        gapsRef.current.some(
          (g) => curPlayerCenterX >= g.x + 8 && curPlayerCenterX <= g.x + g.w - 8
        );

      // Vertical movement & gravity
      let nextVy = playerVyRef.current + GRAVITY;
      let nextY = playerYRef.current + nextVy;

      let isGrounded = false;
      if (!isOverGap) {
        if (nextY >= targetGroundY) {
          nextY = targetGroundY;
          nextVy = 0;
          isGrounded = true;
        } else if (nextY <= ceilingY) {
          nextY = ceilingY;
          nextVy = 0;
        }
      } else {
        if (nextY <= ceilingY) {
          nextY = ceilingY;
          nextVy = 0;
        }
        if (nextY > floorY + 35) {
          handleCrash('VOID_FALL');
          return;
        }
      }

      playerVyRef.current = nextVy;
      playerYRef.current = nextY;

      // Cube Rotation
      let nextRot = 0;
      if (!isGrounded) {
        nextRot = (rotationRef.current + 8) % 360;
        rotationRef.current = nextRot;
      } else {
        rotationRef.current = 0;
      }

      // Single consolidated frame state update (Zero lag)
      setFrameState({
        distance: nextDist,
        playerY: nextY,
        rotation: nextRot,
        score: nextScore,
      });

      // Player Hitbox
      const pHit = {
        left: playerScreenX + 3,
        right: playerScreenX + CUBE_SIZE - 3,
        top: nextY + 3,
        bottom: nextY + CUBE_SIZE - 3,
      };

      // Collision checks with active obstacles
      const obsList = obstaclesRef.current;
      for (let i = 0; i < obsList.length; i++) {
        const obs = obsList[i];
        if (obs.type === 'PROJECTILE') {
          const projDistTraveled = (nextDist - obs.spawnDist) * 0.45;
          const projWorldX = obs.x - projDistTraveled;
          const projScreenX = projWorldX - nextDist + playerScreenX;

          if (projScreenX < -40 || projScreenX > arenaWidth + 50) continue;

          const projY =
            obs.altitude === 'LOW'
              ? floorY - obs.h - 4
              : ceilingY + 16;

          if (
            pHit.right > projScreenX + 2 &&
            pHit.left < projScreenX + obs.w - 2 &&
            pHit.bottom > projY + 1 &&
            pHit.top < projY + obs.h - 1
          ) {
            handleCrash('PROJECTILE');
            return;
          }
          continue;
        }

        const obsScreenX = obs.x - nextDist + playerScreenX;
        if (obsScreenX < -40 || obsScreenX > arenaWidth + 40) continue;

        if (obs.type === 'SPIKE_BOTTOM') {
          if (
            pHit.right > obsScreenX + 4 &&
            pHit.left < obsScreenX + obs.w - 4 &&
            pHit.bottom > floorY - obs.h + 4 &&
            pHit.top < floorY
          ) {
            handleCrash('COLLISION');
            return;
          }
        } else if (obs.type === 'BLOCK') {
          if (
            pHit.right > obsScreenX + 3 &&
            pHit.left < obsScreenX + obs.w - 3 &&
            pHit.bottom > floorY - obs.h + 3 &&
            pHit.top < floorY
          ) {
            handleCrash('COLLISION');
            return;
          }
        } else if (obs.type === 'SPIKE_DROP') {
          const curPlayerX = nextDist + playerScreenX;
          const distToPlayer = obs.x - curPlayerX;
          let spikeY = ceilingY;
          if (distToPlayer <= 290 && distToPlayer > 170) {
            // Telegraph hint: stays at ceiling
            spikeY = ceilingY;
          } else if (distToPlayer <= 170) {
            // Drops down slowly and smoothly over 100px travel
            const dropProgress = Math.min(1, Math.max(0, (170 - distToPlayer) / 100));
            spikeY = ceilingY + (floorY - obs.h - ceilingY) * dropProgress;
          }

          if (
            pHit.right > obsScreenX + 4 &&
            pHit.left < obsScreenX + obs.w - 4 &&
            pHit.bottom > spikeY + 3 &&
            pHit.top < spikeY + obs.h - 3
          ) {
            handleCrash('DROP_SPIKE');
            return;
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [
    arenaWidth,
    ceilingY,
    floorY,
    groundY,
    isPlaying,
    playerScreenX,
    spawnAhead,
  ]);

  const handleCrash = (cause) => {
    setIsPlaying(false);
    playGameOverSound();
    triggerGameOverHaptic();
    setCrashCause(cause);

    const curScore = Math.floor(distanceRef.current / 5);
    if (curScore > highScore) {
      setHighScore(curScore);
      AsyncStorage.setItem(STORAGE_HIGH_SCORE_KEY, String(curScore)).catch(() => {});
      onScoreUpdate?.(curScore);
    } else {
      onScoreUpdate?.(curScore);
    }

    setModalType('gameover');
    setModalVisible(true);
  };

  const handleRetry = () => {
    initLevel();
  };

  const { distance, playerY, rotation, score } = frameState;

  // Viewport Culling: Obstacles & Gaps
  const visiblePlatforms = platformsRef.current.filter(
    (p) => p.x - distance + playerScreenX > -140 && p.x - distance + playerScreenX < arenaWidth + 140
  );

  const visibleGaps = gapsRef.current.filter((g) => {
    const sX = g.x - distance + playerScreenX;
    return sX + g.w > -50 && sX < arenaWidth + 50;
  });

  const visibleObstacles = obstaclesRef.current.filter((obs) => {
    const sX = obs.x - distance + playerScreenX;
    return sX > -60 && sX < arenaWidth + 60;
  });

  return (
    <View style={styles.container}>
      <MiniGameHeader
        floorNum={25}
        gameTitle="CYBER CUBE DASH"
        category="ENDLESS RUNNER"
        accentColor="#FFE600"
        score={score}
        onBack={onBackToHub}
        onBackToHub={onBackToHub}
      />

      {/* Top HUD */}
      <View style={styles.topHud}>
        <View style={styles.hudBadge}>
          <Text style={[styles.hudPhaseText, { color: currentPhase.color }]}>
            PHASE {currentPhase.phase} // {currentPhase.name}
          </Text>
        </View>

        <View style={styles.hudStatsGroup}>
          <Text style={styles.hudScoreLabel}>
            DIST <Text style={styles.hudScoreVal}>{score}m</Text>
          </Text>
          <Text style={styles.hudBestLabel}>
            BEST <Text style={styles.hudBestVal}>{highScore}m</Text>
          </Text>
        </View>
      </View>

      {/* Milestone Phase Banner */}
      {phaseBanner && (
        <View style={[styles.phaseBannerBox, { borderColor: phaseBanner.color }]}>
          <Text style={[styles.phaseBannerTitle, { color: phaseBanner.color }]}>
            ⚡ PHASE {phaseBanner.phase}: {phaseBanner.name} ⚡
          </Text>
          <Text style={styles.phaseBannerDesc}>{phaseBanner.desc}</Text>
        </View>
      )}

      {/* Touch Arena */}
      <Pressable style={styles.arena} onPress={handleJump}>
        <Svg width={arenaWidth} height={arenaHeight} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="cubeGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#FFE600" stopOpacity="1" />
              <Stop offset="100%" stopColor="#FF6D00" stopOpacity="1" />
            </LinearGradient>
            <RadialGradient id="nebulaViolet" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#7928CA" stopOpacity="0.22" />
              <Stop offset="100%" stopColor="#7928CA" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="nebulaCyan" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#00F5FF" stopOpacity="0.16" />
              <Stop offset="100%" stopColor="#00F5FF" stopOpacity="0" />
            </RadialGradient>
          </Defs>

          {/* GALAXY DEEP SPACE BACKGROUND */}
          <Circle cx={arenaWidth * 0.22} cy={arenaHeight * 0.18} r={120} fill="url(#nebulaViolet)" />
          <Circle cx={arenaWidth * 0.82} cy={arenaHeight * 0.82} r={140} fill="url(#nebulaCyan)" />

          {/* Ambient Parallax Galaxy Stars (Lightweight) */}
          {starsRef.current.map((star) => {
            const screenX =
              ((star.origX - distance * star.parallax) % (arenaWidth + 80) +
                arenaWidth +
                80) %
                (arenaWidth + 80) -
              40;
            const screenY = star.yRatio * arenaHeight;

            return (
              <Circle
                key={star.id}
                cx={screenX}
                cy={screenY}
                r={star.r}
                fill={star.color}
                opacity={star.opacity}
              />
            );
          })}

          {/* ROAMING CUTE SPACE PALS (Strictly OUTSIDE the 2 corridor lines) */}
          {npcShipsRef.current.map((ship) => {
            const sY =
              ship.zone === 'UPPER'
                ? Math.max(22, ceilingY - ship.offsetY)
                : Math.min(arenaHeight - 24, floorY + ship.offsetY);

            const scaleX = ship.dir * ship.scale;
            const scaleY = ship.scale;

            return (
              <G
                key={ship.id}
                transform={`translate(${ship.x}, ${sY}) scale(${scaleX}, ${scaleY})`}
              >
                {ship.type === 'CUTE_UFO' && (
                  <G>
                    {/* Soft pastel beam */}
                    <Polygon points="-8,7 8,7 15,22 -15,22" fill="rgba(0, 245, 212, 0.18)" />
                    {/* Glass Bubble Cockpit */}
                    <Circle cx={0} cy={-5} r={9} fill="rgba(0, 245, 212, 0.4)" stroke="#00F5D4" strokeWidth={1.5} />
                    {/* Cute smiling Alien with rosy cheeks */}
                    <Circle cx={0} cy={-5} r={5} fill="#39FF14" />
                    <Circle cx={-2} cy={-6} r={1.2} fill="#050510" />
                    <Circle cx={2} cy={-6} r={1.2} fill="#050510" />
                    <Circle cx={-3.2} cy={-3.5} r={1} fill="#FF007F" opacity={0.7} />
                    <Circle cx={3.2} cy={-3.5} r={1} fill="#FF007F" opacity={0.7} />
                    {/* Saucer Hull */}
                    <Rect x={-18} y={-1} width={36} height={8} rx={4} fill="#FF70A6" stroke="#FFFFFF" strokeWidth={1.4} />
                    {/* Glowing rim beads */}
                    <Circle cx={-10} cy={3} r={1.6} fill="#FFE600" />
                    <Circle cx={0} cy={3} r={1.6} fill="#FFE600" />
                    <Circle cx={10} cy={3} r={1.6} fill="#FFE600" />
                  </G>
                )}

                {ship.type === 'CHIBI_ROCKET' && (
                  <G>
                    {/* Cute flame trail */}
                    <Circle cx={-16} cy={0} r={3.5} fill="#FFE600" />
                    <Circle cx={-21} cy={0} r={2} fill="#FF6D00" />
                    {/* Rocket Fins */}
                    <Polygon points="-8,-8 -13,-12 -11,-3" fill="#7928CA" />
                    <Polygon points="-8,8 -13,12 -11,3" fill="#7928CA" />
                    {/* Chubby Rocket Body */}
                    <Path
                      d="M 15 0 C 11 -7 -7 -7 -11 -4 C -12 0 -12 0 -11 4 C -7 7 11 7 15 0 Z"
                      fill="#FFFFFF"
                      stroke="#00F5FF"
                      strokeWidth={1.5}
                    />
                    {/* Nose Cone */}
                    <Path d="M 15 0 C 12 -3.5 8 -3.5 8 0 C 8 3.5 12 3.5 15 0 Z" fill="#FF007F" />
                    {/* Porthole with smiley eyes */}
                    <Circle cx={-1} cy={0} r={4.5} fill="#180A2E" stroke="#FFE600" strokeWidth={1.2} />
                    <Circle cx={-2} cy={-0.8} r={0.9} fill="#00F5FF" />
                    <Circle cx={0.5} cy={-0.8} r={0.9} fill="#00F5FF" />
                  </G>
                )}

                {ship.type === 'STAR_KITTY' && (
                  <G>
                    {/* Soft pink stardust trail */}
                    <Circle cx={-16} cy={0} r={2.5} fill="#FFB3C6" opacity={0.7} />
                    <Circle cx={-22} cy={0} r={1.5} fill="#FF70A6" opacity={0.5} />
                    {/* Kitty Ears */}
                    <Polygon points="-8,-8 -4,-16 0,-10" fill="#FF70A6" stroke="#FFFFFF" strokeWidth={1} />
                    <Polygon points="2,-10 6,-16 10,-8" fill="#FF70A6" stroke="#FFFFFF" strokeWidth={1} />
                    {/* Spherical Pod */}
                    <Circle cx={0} cy={0} r={11} fill="#FFE5EC" stroke="#FF70A6" strokeWidth={1.5} />
                    {/* Glass bubble visor */}
                    <Circle cx={0} cy={0} r={11} fill="none" stroke="rgba(0, 245, 255, 0.45)" strokeWidth={1.2} />
                    {/* Kitty Face */}
                    <Circle cx={-3.2} cy={-1.5} r={1.3} fill="#331832" />
                    <Circle cx={3.2} cy={-1.5} r={1.3} fill="#331832" />
                    <Polygon points="0,0.8 -1.2,0 1.2,0" fill="#FF007F" />
                    <Circle cx={-5.5} cy={1.2} r={1.4} fill="#FF70A6" opacity={0.6} />
                    <Circle cx={5.5} cy={1.2} r={1.4} fill="#FF70A6" opacity={0.6} />
                  </G>
                )}
              </G>
            );
          })}

                    {/* ELEVATED PLATFORMS & RAMPS (UP AND DOWN) */}
          {visiblePlatforms.map((p) => {
            const sX = p.x - distance + playerScreenX;
            if (p.type === 'RAMP_UP') {
              const points = `${sX},${floorY} ${sX + p.w},${floorY} ${sX + p.w},${floorY - p.h}`;
              return (
                <G key={p.id}>
                  <Polygon points={points} fill="rgba(0, 245, 255, 0.16)" stroke="#00F5FF" strokeWidth={2} />
                  <Line x1={sX} y1={floorY} x2={sX + p.w} y2={floorY - p.h} stroke="#FFFFFF" strokeWidth={2.5} />
                  <Polygon
                    points={`${sX + p.w * 0.4},${floorY - p.h * 0.3} ${sX + p.w * 0.55},${floorY - p.h * 0.6} ${sX + p.w * 0.7},${floorY - p.h * 0.3}`}
                    fill="#FFE600"
                  />
                </G>
              );
            }
            if (p.type === 'RAMP_DOWN') {
              const points = `${sX},${floorY} ${sX},${floorY - p.h} ${sX + p.w},${floorY}`;
              return (
                <G key={p.id}>
                  <Polygon points={points} fill="rgba(157, 78, 221, 0.18)" stroke="#9D4EDD" strokeWidth={2} />
                  <Line x1={sX} y1={floorY - p.h} x2={sX + p.w} y2={floorY} stroke="#FFFFFF" strokeWidth={2.5} />
                  <Polygon
                    points={`${sX + p.w * 0.3},${floorY - p.h * 0.7} ${sX + p.w * 0.45},${floorY - p.h * 0.4} ${sX + p.w * 0.6},${floorY - p.h * 0.7}`}
                    fill="#00F5D4"
                  />
                </G>
              );
            }
            if (p.type === 'PLATFORM') {
              return (
                <G key={p.id}>
                  <Rect
                    x={sX}
                    y={floorY - p.h}
                    width={p.w}
                    height={p.h}
                    fill="rgba(10, 15, 38, 0.95)"
                    stroke="#00F5FF"
                    strokeWidth={1.8}
                  />
                  <Line
                    x1={sX}
                    y1={floorY - p.h}
                    x2={sX + p.w}
                    y2={floorY - p.h}
                    stroke="#FFE600"
                    strokeWidth={2.5}
                  />
                </G>
              );
            }
            return null;
          })}

          {/* THE 2 CORRIDOR BOUNDARY LINES */}
          {/* 1. TOP CORRIDOR CEILING LINE (Solid Neon Magenta) */}
          <Line
            x1={-20}
            y1={ceilingY}
            x2={arenaWidth + 20}
            y2={ceilingY}
            stroke="#9D4EDD"
            strokeWidth={3}
          />

          {/* 2. BOTTOM CORRIDOR FLOOR LINE (Solid Neon Cyan) */}
          <Line
            x1={-20}
            y1={floorY}
            x2={arenaWidth + 20}
            y2={floorY}
            stroke="#00F5FF"
            strokeWidth={3}
          />

          {/* VOID CHASM GAPS (Cover bottom line over active void gaps) */}
          {visibleGaps.map((gap) => {
            const startScreenX = gap.x - distance + playerScreenX;
            return (
              <G key={`gap_visual_${gap.id}`}>
                {/* Mask hole over the cyan line */}
                <Rect
                  x={startScreenX}
                  y={floorY - 2}
                  width={gap.w}
                  height={6}
                  fill="#03030A"
                />
                {/* Left Edge Hazard Beacon */}
                <Line
                  x1={startScreenX}
                  y1={floorY - 3}
                  x2={startScreenX}
                  y2={floorY + 16}
                  stroke="#FF0055"
                  strokeWidth={2.5}
                />
                <Circle cx={startScreenX} cy={floorY} r={2.5} fill="#FFE600" />

                {/* Right Edge Hazard Beacon */}
                <Line
                  x1={startScreenX + gap.w}
                  y1={floorY - 3}
                  x2={startScreenX + gap.w}
                  y2={floorY + 16}
                  stroke="#FF0055"
                  strokeWidth={2.5}
                />
                <Circle cx={startScreenX + gap.w} cy={floorY} r={2.5} fill="#FFE600" />
              </G>
            );
          })}

          {/* OBSTACLES (Strictly ON THE BOTTOM LINE or INSIDE the corridor) */}
          {visibleObstacles.map((obs) => {
            const sX = obs.x - distance + playerScreenX;

            if (obs.type === 'BLOCK') {
              return (
                <G key={obs.id}>
                  <Rect
                    x={sX}
                    y={floorY - obs.h}
                    width={obs.w}
                    height={obs.h}
                    rx={4}
                    fill="#150A2E"
                    stroke="#FFE600"
                    strokeWidth={2}
                  />
                  <Rect
                    x={sX + 4}
                    y={floorY - obs.h + 4}
                    width={obs.w - 8}
                    height={obs.h - 8}
                    rx={2}
                    fill="rgba(255, 230, 0, 0.2)"
                  />
                </G>
              );
            }

            if (obs.type === 'SPIKE_BOTTOM') {
              const tipX = sX + obs.w / 2;
              const tipY = floorY - obs.h;
              const pLeft = `${sX},${floorY}`;
              const pTip = `${tipX},${tipY}`;
              const pRight = `${sX + obs.w},${floorY}`;

              return (
                <G key={obs.id}>
                  <Polygon
                    points={`${pLeft} ${pTip} ${pRight}`}
                    fill="#FF0055"
                    stroke="#FFFFFF"
                    strokeWidth={1}
                  />
                  <Polygon
                    points={`${sX + 3},${floorY} ${tipX},${tipY + 4} ${sX + obs.w - 3},${floorY}`}
                    fill="rgba(255, 255, 255, 0.3)"
                  />
                </G>
              );
            }

            if (obs.type === 'SPIKE_DROP') {
              const curPlayerX = distance + playerScreenX;
              const distToPlayer = obs.x - curPlayerX;
              const isTelegraphing = distToPlayer <= 290 && distToPlayer > 170;
              const isDropping = distToPlayer <= 170;
              const dropProgress = isDropping ? Math.min(1, Math.max(0, (170 - distToPlayer) / 100)) : 0;
              const curSpikeY = ceilingY + (floorY - obs.h - ceilingY) * dropProgress;

              const tipX = sX + obs.w / 2;
              const tipY = curSpikeY + obs.h;
              const pLeft = `${sX},${curSpikeY}`;
              const pTip = `${tipX},${tipY}`;
              const pRight = `${sX + obs.w},${curSpikeY}`;

              return (
                <G key={obs.id}>
                  {/* Warning Telegraph Beam & Ground Target Ring */}
                  {isTelegraphing && (
                    <G>
                      <Line
                        x1={tipX}
                        y1={ceilingY + obs.h}
                        x2={tipX}
                        y2={floorY}
                        stroke="#FF0055"
                        strokeWidth={1.5}
                        strokeDasharray="4,4"
                        opacity={0.85}
                      />
                      <Polygon
                        points={`${tipX - 7},${floorY - 2} ${tipX},${floorY - 9} ${tipX + 7},${floorY - 2} ${tipX},${floorY + 5}`}
                        fill="rgba(255, 0, 85, 0.5)"
                        stroke="#FFE600"
                        strokeWidth={1.2}
                      />
                      <SvgText
                        x={tipX}
                        y={ceilingY + obs.h + 16}
                        textAnchor="middle"
                        fontSize={11}
                        fill="#FFE600"
                        fontWeight="900"
                      >
                        ⚠️
                      </SvgText>
                    </G>
                  )}

                  <Polygon
                    points={`${pLeft} ${pTip} ${pRight}`}
                    fill={isDropping ? '#FF0055' : '#FF6D00'}
                    stroke="#FFE600"
                    strokeWidth={1.6}
                  />
                  <Line
                    x1={tipX}
                    y1={curSpikeY}
                    x2={tipX}
                    y2={tipY - 5}
                    stroke="#FFE600"
                    strokeWidth={1.5}
                  />
                </G>
              );
            }

            if (obs.type === 'PROJECTILE') {
              const projDistTraveled = (distance - obs.spawnDist) * 0.45;
              const projWorldX = obs.x - projDistTraveled;
              const projScreenX = projWorldX - distance + playerScreenX;

              const projY =
                obs.altitude === 'LOW'
                  ? floorY - obs.h - 4
                  : ceilingY + 16;

              const launcherScreenX = obs.x - distance + playerScreenX;

              return (
                <G key={obs.id}>
                  {/* Cyber Drone Sentry Bot */}
                  {launcherScreenX > -40 && launcherScreenX < arenaWidth + 80 && (
                    <G transform={`translate(${launcherScreenX}, ${projY - 4})`}>
                      <Rect x={-10} y={-8} width={20} height={16} rx={4} fill="#180A2E" stroke="#FF0055" strokeWidth={1.5} />
                      <Circle cx={-3} cy={0} r={3} fill="#FF0055" />
                      <Circle cx={-3} cy={0} r={1.2} fill="#FFE600" />
                      <Rect x={-16} y={-2} width={7} height={4} rx={1.5} fill="#FF0055" />
                    </G>
                  )}

                  <Rect
                    x={projScreenX}
                    y={projY}
                    width={obs.w}
                    height={obs.h}
                    rx={obs.h / 2}
                    fill="#00F5FF"
                    stroke="#FFFFFF"
                    strokeWidth={1.5}
                  />
                  <Circle
                    cx={projScreenX + 5}
                    cy={projY + obs.h / 2}
                    r={obs.h / 2 - 1}
                    fill="#FFE600"
                  />
                  <Circle
                    cx={projScreenX + obs.w + 4}
                    cy={projY + obs.h / 2}
                    r={2.5}
                    fill="#FF0055"
                    opacity={0.8}
                  />
                </G>
              );
            }

            return null;
          })}

          {/* THE PLAYER CUBE */}
          <G
            transform={`rotate(${rotation}, ${playerScreenX + CUBE_SIZE / 2}, ${
              playerY + CUBE_SIZE / 2
            })`}
          >
            <Rect
              x={playerScreenX}
              y={playerY}
              width={CUBE_SIZE}
              height={CUBE_SIZE}
              rx={5}
              fill="url(#cubeGrad)"
              stroke="#FFFFFF"
              strokeWidth={1.8}
            />
            {/* Inner Core */}
            <Rect
              x={playerScreenX + 5}
              y={playerY + 5}
              width={CUBE_SIZE - 10}
              height={CUBE_SIZE - 10}
              rx={3}
              fill="#180A2E"
            />
            {/* Cyber Visor Eye */}
            <Circle
              cx={playerScreenX + CUBE_SIZE / 2}
              cy={playerY + CUBE_SIZE / 2}
              r={2.5}
              fill="#00F5FF"
            />
          </G>
        </Svg>

        {/* Start / Jump Tap Overlay Hint */}
        {!isPlaying && (
          <View style={styles.startHintBox}>
            <Text style={styles.startHintTitle}>TAP ANYWHERE TO DASH</Text>
            <Text style={styles.startHintSub}>SURVIVE THE 5 HAZARD PHASES</Text>
          </View>
        )}
      </Pressable>

      <GameResultModal
        visible={modalVisible}
        type={modalType}
        score={score}
        level={highScore}
        onRetry={handleRetry}
        onBackToHub={onBackToHub}
        buttonText="TRY AGAIN"
        subtitle={
          crashCause === 'VOID_FALL'
            ? 'FELL INTO THE COSMIC VOID'
            : crashCause === 'PROJECTILE'
              ? 'OBLITERATED BY INCOMING PLASMA'
              : crashCause === 'DROP_SPIKE'
                ? 'CRUSHED BY SLAMMING AERO-SPIKE'
                : 'COLLISION WITH GROUND HAZARD'
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#03030A',
  },
  topHud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(8, 8, 22, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 230, 0, 0.2)',
  },
  hudBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  hudPhaseText: {
    fontFamily: monoFont,
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 1,
  },
  hudStatsGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  hudScoreLabel: {
    fontFamily: monoFont,
    fontSize: 10,
    color: '#8A8F9E',
    fontWeight: '800',
  },
  hudScoreVal: {
    color: '#FFE600',
    fontWeight: '900',
    fontSize: 12,
  },
  hudBestLabel: {
    fontFamily: monoFont,
    fontSize: 10,
    color: '#8A8F9E',
    fontWeight: '800',
  },
  hudBestVal: {
    color: '#00F5FF',
    fontWeight: '900',
    fontSize: 12,
  },
  phaseBannerBox: {
    position: 'absolute',
    top: 56,
    alignSelf: 'center',
    backgroundColor: 'rgba(10, 5, 28, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    zIndex: 999,
    shadowColor: '#FFE600',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  phaseBannerTitle: {
    fontFamily: monoFont,
    fontSize: 12.5,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  phaseBannerDesc: {
    fontFamily: monoFont,
    fontSize: 10,
    color: '#E2E8F0',
    fontWeight: '700',
    marginTop: 2,
  },
  arena: {
    flex: 1,
    backgroundColor: '#02010A',
  },
  startHintBox: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 50,
    backgroundColor: 'rgba(255, 230, 0, 0.12)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 230, 0, 0.4)',
    alignItems: 'center',
  },
  startHintTitle: {
    fontFamily: monoFont,
    fontSize: 12,
    fontWeight: '900',
    color: '#FFE600',
    letterSpacing: 1,
  },
  startHintSub: {
    fontFamily: monoFont,
    fontSize: 9.5,
    color: '#A0A5B5',
    fontWeight: '700',
    marginTop: 3,
  },
});
