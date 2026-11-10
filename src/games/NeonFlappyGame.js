import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Polygon, Circle, Rect, G, Ellipse, Line } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../../styles';
import MiniGameHeader from '../components/MiniGameHeader';
import JuiceEngine from '../components/JuiceEngine';
import GameResultModal from '../components/GameResultModal';
import {
  triggerLightHaptic,
  triggerMediumHaptic,
  triggerPerfectHaptic,
  triggerGameOverHaptic,
  triggerSelectionHaptic,
} from '../utils/haptics';
import {
  playTapSound,
  playPerfectSound,
  playGameOverSound,
  playSliceSound,
  playSpeedUpSound,
} from '../utils/sound';

const STORAGE_KEY = '@game_tower:best_flappy_v1';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

// Power-up types
const POWERUP_SHIELD = 'SHIELD';
const POWERUP_BLASTER = 'BLASTER';
const POWERUP_SLOWMO = 'SLOWMO';

export default function NeonFlappyGame({ onBackToHub, onScoreUpdate, isPaused = false }) {
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  const { width, height } = useWindowDimensions();
  const arenaWidth = Math.min(380, width - 24);
  const arenaHeight = Math.min(490, Math.max(350, height - 190));
  const baseGapHeight = 168; // Initial forgiving gap for smooth learning curve
  const pipeWidth = 48;
  const droneSize = 26;
  const droneX = 68;

  // Helper for dynamic difficulty scaling
  const getGapHeight = (cleared) => {
    // 0 cleared -> 168px (very spacious, easy to learn rhythm)
    // 10 cleared -> ~152px
    // 20 cleared -> ~136px
    // 35+ cleared -> 118px (tight expert challenge)
    return Math.max(118, Math.round(168 - Math.min(cleared, 35) * 1.42));
  };

  const getScrollSpeed = (cleared) => {
    // 0 cleared -> 115 px/s (relaxed, gentle pace)
    // 10 cleared -> 138 px/s
    // 20 cleared -> 160 px/s (standard baseline)
    // 35+ cleared -> 195 px/s (blistering fast)
    return Math.min(195, 115 + Math.min(cleared, 35) * 2.3);
  };

  const juiceRef = useRef(null);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [status, setStatus] = useState('READY');
  const [hasShield, setHasShield] = useState(false);
  const [activePowerUp, setActivePowerUp] = useState(null);

  const [frame, setFrame] = useState({
    droneY: arenaHeight * 0.45,
    pipes: [],
    enemies: [],
    pickups: [],
    lasers: [],
    hasShield: false,
    activePowerUp: null,
  });

  const engRef = useRef({
    status: 'READY',
    droneY: arenaHeight * 0.45,
    vy: 0,
    pipes: [],
    enemies: [],
    pickups: [],
    lasers: [],
    spawnTimer: 0,
    enemySpawnTimer: 0,
    laserCooldown: 0,
    shield: false,
    blasterTimer: 0,
    slowTimer: 0,
    score: 0,
    best: 0,
    gameTime: 0,
    pipesCleared: 0,
  });

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = parseInt(saved, 10) || 0;
          setBestScore(parsed);
          engRef.current.best = parsed;
        }
      } catch {}
    })();
  }, []);

  const persistBest = useCallback(
    async (nextScore) => {
      if (onScoreUpdate) onScoreUpdate(nextScore);
      if (nextScore > engRef.current.best) {
        engRef.current.best = nextScore;
        setBestScore(nextScore);
        try {
          await AsyncStorage.setItem(STORAGE_KEY, String(nextScore));
        } catch {}
      }
    },
    [onScoreUpdate]
  );

  const resetGame = useCallback(() => {
    engRef.current = {
      ...engRef.current,
      status: 'READY',
      droneY: arenaHeight * 0.45,
      vy: 0,
      pipes: [],
      enemies: [],
      pickups: [],
      lasers: [],
      spawnTimer: 0,
      enemySpawnTimer: 0,
      laserCooldown: 0,
      shield: false,
      blasterTimer: 0,
      slowTimer: 0,
      score: 0,
      gameTime: 0,
      pipesCleared: 0,
    };
    setScore(0);
    setStatus('READY');
    setHasShield(false);
    setActivePowerUp(null);
    setFrame({
      droneY: arenaHeight * 0.45,
      pipes: [],
      enemies: [],
      pickups: [],
      lasers: [],
      hasShield: false,
      activePowerUp: null,
    });
  }, [arenaHeight]);

  const handleThrust = useCallback(() => {
    if (isPausedRef.current) return;
    const eng = engRef.current;
    if (eng.status === 'GAME_OVER') return;

    if (eng.status === 'READY') {
      eng.status = 'PLAYING';
      setStatus('PLAYING');
    }

    eng.vy = -320;
    triggerLightHaptic();
    playTapSound();

    // Shoot blaster laser if active
    if (eng.blasterTimer > 0) {
      eng.lasers.push({
        id: `lz_${Date.now()}_${Math.random()}`,
        x: droneX + droneSize + 4,
        y: eng.droneY + droneSize / 2 - 2,
        vx: 480,
      });
      playSliceSound();
    }

    if (juiceRef.current) {
      juiceRef.current.burst(droneX, eng.droneY + droneSize + 4, COLORS.cyan, 6);
    }
  }, []);

  useEffect(() => {
    let rafId = null;
    let lastTs = 0;

    const loop = (ts) => {
      if (isPausedRef.current) {
        lastTs = ts;
        rafId = requestAnimationFrame(loop);
        return;
      }
      if (!lastTs) lastTs = ts;
      const rawDt = Math.min(0.032, (ts - lastTs) / 1000);
      lastTs = ts;

      const eng = engRef.current;

      if (eng.status === 'PLAYING') {
        const timeScale = eng.slowTimer > 0 ? 0.6 : 1.0;
        const dt = rawDt * timeScale;
        eng.gameTime += dt;
        const pipesCleared = eng.pipesCleared || 0;
        const currentSpeed = getScrollSpeed(pipesCleared);

        // Update Timers
        if (eng.blasterTimer > 0) eng.blasterTimer -= dt;
        if (eng.slowTimer > 0) eng.slowTimer -= dt;

        // Auto-fire laser when blaster is active
        if (eng.blasterTimer > 0) {
          eng.laserCooldown -= dt;
          if (eng.laserCooldown <= 0) {
            eng.laserCooldown = 0.28;
            eng.lasers.push({
              id: `lz_${Date.now()}_${Math.random()}`,
              x: droneX + droneSize + 4,
              y: eng.droneY + droneSize / 2 - 2,
              vx: 520,
            });
            playTapSound();
          }
        }

        // Drone Gravity & Movement
        eng.vy += 880 * dt;
        eng.droneY += eng.vy * dt;

        // Ceiling and Floor Collision
        if (eng.droneY <= 0 || eng.droneY + droneSize >= arenaHeight) {
          if (eng.shield) {
            eng.shield = false;
            setHasShield(false);
            eng.vy = eng.droneY <= 0 ? 120 : -220;
            eng.droneY = Math.max(2, Math.min(arenaHeight - droneSize - 2, eng.droneY));
            triggerMediumHaptic();
            playSpeedUpSound();
            juiceRef.current?.flash('#00F5FF');
            juiceRef.current?.popup('🛡️ SHIELD SAVED!', 'Barrier absorbed crash', COLORS.cyan);
          } else {
            eng.status = 'GAME_OVER';
            setStatus('GAME_OVER');
            triggerGameOverHaptic();
            playGameOverSound();
            if (juiceRef.current) {
              juiceRef.current.shake(12, 9);
              juiceRef.current.flash(COLORS.danger);
            }
          }
        }

        // 1. Pipe Spawning & Gradual Scaling
        const currentGap = getGapHeight(pipesCleared);
        const currentSpawnInterval = 235 / currentSpeed;
        eng.spawnTimer += dt;
        if (eng.spawnTimer >= currentSpawnInterval) {
          eng.spawnTimer = 0;
          const minTop = 36;
          const maxTop = arenaHeight - currentGap - 45;
          const initialTop = minTop + Math.random() * Math.max(20, maxTop - minTop);

          // Moving pipes only after 7 pipes cleared
          let isMoving = false;
          let moveAmp = 20;
          if (pipesCleared >= 25) {
            isMoving = Math.random() < 0.45;
            moveAmp = 24;
          } else if (pipesCleared >= 15) {
            isMoving = Math.random() < 0.35;
            moveAmp = 18;
          } else if (pipesCleared >= 7) {
            isMoving = Math.random() < 0.20;
            moveAmp = 12;
          }

          // Laser barriers only after 12 pipes cleared
          const isLaserBarrier = pipesCleared >= 25
            ? Math.random() < 0.25
            : pipesCleared >= 12
            ? Math.random() < 0.15
            : false;

          const pipeId = `p_${ts}_${Math.random()}`;
          eng.pipes.push({
            id: pipeId,
            x: arenaWidth,
            topH: initialTop,
            baseTopH: initialTop,
            gapHeight: currentGap,
            isMoving,
            moveAmp,
            moveSpeed: 1.2 + Math.random() * 1.4,
            moveOffset: Math.random() * Math.PI * 2,
            isLaserBarrier,
            passed: false,
          });

          // Chance to spawn floating energy shard or power-up in gap
          const pickupChance = pipesCleared < 6 ? 0.70 : 0.50;
          if (Math.random() < pickupChance) {
            const isPowerup = pipesCleared < 6 ? (Math.random() < 0.50) : (Math.random() < 0.35);
            const pTypes = [POWERUP_SHIELD, POWERUP_BLASTER, POWERUP_SLOWMO];
            const pType = (pipesCleared < 6 && Math.random() < 0.6)
              ? POWERUP_SHIELD
              : pTypes[Math.floor(Math.random() * pTypes.length)];

            eng.pickups.push({
              id: `pick_${ts}`,
              x: arenaWidth + pipeWidth / 2 - 8,
              y: initialTop + currentGap / 2 - 8,
              type: isPowerup ? pType : 'SHARD',
              color: isPowerup ? (pType === POWERUP_SHIELD ? '#00F5FF' : pType === POWERUP_BLASTER ? '#FF0055' : '#FFE600') : '#00F5D4',
              icon: isPowerup ? (pType === POWERUP_SHIELD ? '🛡️' : pType === POWERUP_BLASTER ? '⚡' : '⏱️') : '💎',
              size: isPowerup ? 20 : 16,
            });
          }
        }

        // 2. Enemy Patrol Drones Spawning - ONLY once player has reached 8+ pipes
        if (pipesCleared >= 8) {
          eng.enemySpawnTimer += dt;
          const enemyInterval = pipesCleared >= 20 ? 3.5 : 5.5;
          if (eng.enemySpawnTimer >= enemyInterval) {
            eng.enemySpawnTimer = 0;
            const ey = 60 + Math.random() * (arenaHeight - 120);
            const droneSpeed = pipesCleared >= 20 ? (120 + Math.random() * 40) : (90 + Math.random() * 25);
            eng.enemies.push({
              id: `en_${ts}_${Math.random()}`,
              x: arenaWidth + 20,
              y: ey,
              baseY: ey,
              vx: droneSpeed,
              bobSpeed: 1.8 + Math.random() * 1.4,
              bobAmp: pipesCleared >= 20 ? 25 : 15,
              size: 20,
              hp: 1,
            });
          }
        }

        // 3. Update Lasers
        const nextLasers = [];
        for (let l = 0; l < eng.lasers.length; l++) {
          const lz = eng.lasers[l];
          lz.x += lz.vx * dt;
          let hit = false;

          // Check hit enemy drones
          for (let e = 0; e < eng.enemies.length; e++) {
            const en = eng.enemies[e];
            if (
              lz.x >= en.x &&
              lz.x <= en.x + en.size &&
              lz.y >= en.y - 4 &&
              lz.y <= en.y + en.size + 4
            ) {
              hit = true;
              en.hp -= 1;
              triggerMediumHaptic();
              playSliceSound();
              juiceRef.current?.burst(en.x, en.y, '#FF0055', 12);
              juiceRef.current?.popup('💥 DRONE VAPORIZED!', '+50 PTS', '#FF0055');
              eng.score += 50;
              setScore(eng.score);
              persistBest(eng.score);
              break;
            }
          }

          if (!hit && lz.x < arenaWidth + 20) {
            nextLasers.push(lz);
          }
        }
        eng.lasers = nextLasers;

        // 4. Update Enemies
        const nextEnemies = [];
        for (let e = 0; e < eng.enemies.length; e++) {
          const en = eng.enemies[e];
          if (en.hp <= 0) continue;

          en.x -= en.vx * dt;
          en.y = en.baseY + Math.sin(eng.gameTime * en.bobSpeed) * en.bobAmp;

          // Check collision with Player Drone
          const colX = droneX + droneSize > en.x && droneX < en.x + en.size;
          const colY = eng.droneY + droneSize > en.y && eng.droneY < en.y + en.size;

          if (colX && colY) {
            if (eng.shield) {
              eng.shield = false;
              setHasShield(false);
              triggerMediumHaptic();
              playSpeedUpSound();
              juiceRef.current?.burst(en.x, en.y, '#00F5FF', 14);
              juiceRef.current?.popup('🛡️ SHIELD DEFLECTED!', 'Destroyed enemy drone', COLORS.cyan);
              continue; // destroy enemy
            } else {
              eng.status = 'GAME_OVER';
              setStatus('GAME_OVER');
              triggerGameOverHaptic();
              playGameOverSound();
              if (juiceRef.current) {
                juiceRef.current.shake(12, 9);
                juiceRef.current.flash(COLORS.danger);
              }
            }
          }

          if (en.x > -en.size - 10) {
            nextEnemies.push(en);
          }
        }
        eng.enemies = nextEnemies;

        // 5. Update Pickups
        const nextPickups = [];
        for (let k = 0; k < eng.pickups.length; k++) {
          const pick = eng.pickups[k];
          pick.x -= currentSpeed * dt;

          // Check collection by Player Drone
          const dist = Math.hypot(droneX + droneSize / 2 - (pick.x + pick.size / 2), eng.droneY + droneSize / 2 - (pick.y + pick.size / 2));
          if (dist < droneSize / 2 + pick.size / 2 + 6) {
            triggerSelectionHaptic();
            playPerfectSound();
            juiceRef.current?.burst(pick.x, pick.y, pick.color, 12);

            if (pick.type === 'SHARD') {
              eng.score += 15;
              juiceRef.current?.popup('💎 +15 SHARD!', 'ENERGY RESTORED', COLORS.matrixMint);
            } else if (pick.type === POWERUP_SHIELD) {
              eng.shield = true;
              setHasShield(true);
              juiceRef.current?.popup('🛡️ CYBER SHIELD ARMED!', 'Absorbs 1 Collision', COLORS.cyan);
            } else if (pick.type === POWERUP_BLASTER) {
              eng.blasterTimer = 7.0;
              juiceRef.current?.popup('⚡ PULSE BLASTER ARMED!', 'Vaporize obstacles (7s)', '#FF0055');
            } else if (pick.type === POWERUP_SLOWMO) {
              eng.slowTimer = 6.0;
              juiceRef.current?.popup('⏱️ TIME WARP ACTIVE!', 'Game Slowed (6s)', '#FFE600');
            }

            setScore(eng.score);
            persistBest(eng.score);
            continue; // Collected!
          }

          if (pick.x > -pick.size - 10) {
            nextPickups.push(pick);
          }
        }
        eng.pickups = nextPickups;

        // 6. Update Pipes & Collision
        const nextPipes = [];
        for (let i = 0; i < eng.pipes.length; i += 1) {
          const p = eng.pipes[i];
          const nx = p.x - currentSpeed * dt;
          const pipeGap = p.gapHeight || baseGapHeight;

          // Oscillating pipes
          if (p.isMoving) {
            p.topH = p.baseTopH + Math.sin(eng.gameTime * p.moveSpeed + p.moveOffset) * (p.moveAmp || 20);
          }

          // Check collision with player
          const inX = droneX + droneSize > nx && droneX < nx + pipeWidth;
          const hitTop = eng.droneY < p.topH;
          const hitBottom = eng.droneY + droneSize > p.topH + pipeGap;

          if (inX && (hitTop || hitBottom)) {
            if (eng.shield) {
              eng.shield = false;
              setHasShield(false);
              eng.droneY = p.topH + pipeGap / 2 - droneSize / 2;
              eng.vy = 0;
              triggerMediumHaptic();
              playSpeedUpSound();
              juiceRef.current?.flash('#00F5FF');
              juiceRef.current?.popup('🛡️ SHIELD SAVED!', 'Gate collision deflected', COLORS.cyan);
            } else {
              eng.status = 'GAME_OVER';
              setStatus('GAME_OVER');
              triggerGameOverHaptic();
              playGameOverSound();
              if (juiceRef.current) {
                juiceRef.current.shake(12, 9);
                juiceRef.current.flash(COLORS.danger);
              }
            }
          }

          if (!p.passed && nx + pipeWidth < droneX) {
            p.passed = true;
            eng.pipesCleared = (eng.pipesCleared || 0) + 1;
            eng.score += 25;
            setScore(eng.score);
            persistBest(eng.score);
            triggerPerfectHaptic(2);
            playPerfectSound(Math.min(8, Math.floor(eng.score / 25)));
            if (juiceRef.current) {
              juiceRef.current.popup('+25 GATE!', 'CLEAR', COLORS.solarGold);
            }
          }

          if (nx > -pipeWidth - 10) {
            nextPipes.push({ ...p, x: nx });
          }
        }
        eng.pipes = nextPipes;

        // Sync Render Frame
        setFrame({
          droneY: eng.droneY,
          pipes: [...eng.pipes],
          enemies: [...eng.enemies],
          pickups: [...eng.pickups],
          lasers: [...eng.lasers],
          hasShield: eng.shield,
          activePowerUp: eng.blasterTimer > 0 ? '⚡ BLASTER' : eng.slowTimer > 0 ? '⏱️ SLOW-MO' : null,
        });
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [arenaWidth, arenaHeight, persistBest]);

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={localStyles.container}>
        <LinearGradient
          colors={['#03030A', '#0A0B24', '#180D36']}
          style={StyleSheet.absoluteFillObject}
        />

        <MiniGameHeader
          title="NEON FLAPPY"
          floorLabel="FLOOR 08 // CYBER DRONE"
          score={score}
          bestScore={bestScore}
          accentColor={COLORS.cyan}
          onBack={onBackToHub}
          onReset={resetGame}
        />

        <View style={localStyles.body}>
          <Pressable
            onPressIn={handleThrust}
            style={[
              localStyles.arena,
              { width: arenaWidth, height: arenaHeight },
            ]}
          >
            {/* Active Buff Status Strip */}
            {(frame.hasShield || frame.activePowerUp) && (
              <View style={localStyles.buffBadge} pointerEvents="none">
                {frame.hasShield && <Text style={localStyles.buffText}>🛡️ SHIELD</Text>}
                {frame.activePowerUp && <Text style={[localStyles.buffText, { color: '#FFE600' }]}>{frame.activePowerUp}</Text>}
              </View>
            )}

            {/* Laser Gate Pillars */}
            {frame.pipes.map((p) => {
              const pipeGap = p.gapHeight || baseGapHeight;
              const pipeColor = p.isLaserBarrier ? '#FF0055' : p.isMoving ? '#00F5FF' : COLORS.magenta;
              return (
                <React.Fragment key={p.id}>
                  {/* Top Pipe */}
                  <View
                    style={[
                      localStyles.pipe,
                      {
                        left: p.x,
                        top: 0,
                        width: pipeWidth,
                        height: p.topH,
                        borderColor: pipeColor,
                      },
                    ]}
                  >
                    <View style={[localStyles.pipeCap, { bottom: 0, backgroundColor: pipeColor }]} />
                  </View>

                  {/* Bottom Pipe */}
                  <View
                    style={[
                      localStyles.pipe,
                      {
                        left: p.x,
                        top: p.topH + pipeGap,
                        width: pipeWidth,
                        height: Math.max(0, arenaHeight - (p.topH + pipeGap)),
                        borderColor: pipeColor,
                      },
                    ]}
                  >
                    <View style={[localStyles.pipeCap, { top: 0, backgroundColor: pipeColor }]} />
                  </View>
                </React.Fragment>
              );
            })}

            {/* Floating Pickups (Power-ups & Shards) */}
            {frame.pickups.map((pick) => (
              <View
                key={pick.id}
                style={[
                  localStyles.pickup,
                  {
                    left: pick.x,
                    top: pick.y,
                    width: pick.size,
                    height: pick.size,
                    borderColor: pick.color,
                  },
                ]}
              >
                <Text style={{ fontSize: pick.size * 0.75 }}>{pick.icon}</Text>
              </View>
            ))}

            {/* Enemy Patrol Alien UFOs */}
            {frame.enemies.map((en) => {
              const ufoW = (en.size || 22) * 1.5;
              const ufoH = (en.size || 22) * 1.1;
              return (
                <View
                  key={en.id}
                  style={{
                    position: 'absolute',
                    left: en.x - (ufoW - en.size) / 2,
                    top: en.y - (ufoH - en.size) / 2,
                    width: ufoW,
                    height: ufoH,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Svg width={ufoW} height={ufoH} viewBox="0 0 34 26">
                    {/* UFO Saucer Disc */}
                    <Ellipse cx={17} cy={15} rx={16} ry={6.5} fill="#1C0614" stroke="#FF0055" strokeWidth={1.8} />
                    {/* Glowing Saucer Dome */}
                    <Ellipse cx={17} cy={9.5} rx={8.5} ry={6} fill="#0A0208" stroke="#FF0055" strokeWidth={1.5} />
                    {/* Alien Cockpit Visor / Eye */}
                    <Ellipse cx={17} cy={9.5} rx={4.5} ry={2.8} fill="#FF0055" />
                    <Circle cx={18} cy={9} r={1.2} fill="#FFFFFF" />
                    {/* Rotating Saucer Lights */}
                    <Circle cx={4} cy={15} r={1.6} fill="#FFE600" />
                    <Circle cx={10} cy={17} r={1.6} fill="#FF0055" />
                    <Circle cx={17} cy={18} r={2} fill="#FFE600" />
                    <Circle cx={24} cy={17} r={1.6} fill="#FF0055" />
                    <Circle cx={30} cy={15} r={1.6} fill="#FFE600" />
                    {/* Underbelly Anti-Gravity Glow */}
                    <Line x1={12} y1={20} x2={22} y2={20} stroke="#FF007F" strokeWidth={1.8} strokeLinecap="round" />
                  </Svg>
                </View>
              );
            })}

            {/* Blaster Lasers in Flight */}
            {frame.lasers.map((lz) => (
              <View
                key={lz.id}
                style={[
                  localStyles.laserBeam,
                  {
                    left: lz.x,
                    top: lz.y,
                  },
                ]}
              />
            ))}

            {/* Player Cyber Drone / Jet Plane */}
            <View
              style={{
                position: 'absolute',
                left: droneX - 5,
                top: frame.droneY - 2,
                width: 38,
                height: 30,
              }}
            >
              <Svg width={38} height={30} viewBox="0 0 38 30">
                {/* Plasma Jet Flame */}
                <Polygon points="5,15 -2,12 -8,15 -2,18" fill="#00F5FF" opacity={0.85} />
                <Polygon points="5,15 1,13 -3,15 1,17" fill="#FFFFFF" />
                {/* Swept Drone/Plane Wings */}
                <Polygon points="14,15 4,3 15,9 26,15" fill="#0A2540" stroke="#00F5FF" strokeWidth={1.4} />
                <Polygon points="14,15 4,27 15,21 26,15" fill="#0A2540" stroke="#00F5FF" strokeWidth={1.4} />
                {/* Wingtip Lights */}
                <Circle cx={4} cy={3} r={1.8} fill="#39FF14" />
                <Circle cx={4} cy={27} r={1.8} fill="#39FF14" />
                {/* Main Cyber Jet Fuselage */}
                <Polygon points="35,15 18,9 8,11 6,15 8,19 18,21" fill="#0D1B2A" stroke="#00F5FF" strokeWidth={1.6} />
                {/* Jet Cockpit Canopy */}
                <Polygon points="28,15 20,11.5 13,12.5 19,15" fill="#00F5FF" stroke="#FFFFFF" strokeWidth={0.8} />
                {/* Center Core Reactor */}
                <Circle cx={16} cy={15} r={2.5} fill="#FFFFFF" />
              </Svg>

              {/* Shield Bubble if active */}
              {frame.hasShield && (
                <View
                  style={{
                    position: 'absolute',
                    left: -3,
                    top: -7,
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    borderWidth: 2,
                    borderColor: '#39FF14',
                    backgroundColor: 'rgba(57, 255, 20, 0.15)',
                  }}
                />
              )}
            </View>

            {status === 'READY' && (
              <View style={localStyles.centerPrompt} pointerEvents="none">
                <Text style={localStyles.promptText}>
                  TAP TO THRUST & LAUNCH
                </Text>
              </View>
            )}

            <GameResultModal
              visible={status === 'GAME_OVER'}
              type="GAME_OVER"
              title="DRONE CRASHED!"
              subtitle="COLLISION DETECTED"
              score={score}
              bestScore={bestScore}
              accentColor="#00F5D4"
              onRetry={resetGame}
              retryLabel="RELAUNCH DRONE"
              onBackToHub={onBackToHub}
            />
          </Pressable>
        </View>
      </View>
    </JuiceEngine>
  );
}

const localStyles = StyleSheet.create({
  container: { flex: 1 },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 14,
  },
  arena: {
    backgroundColor: 'rgba(6, 8, 22, 0.94)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 245, 255, 0.42)',
    position: 'relative',
    overflow: 'hidden',
  },
  buffBadge: {
    position: 'absolute',
    top: 10,
    right: 14,
    flexDirection: 'row',
    gap: 8,
    zIndex: 10,
  },
  buffText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#00F5FF',
    backgroundColor: 'rgba(5, 7, 18, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.3)',
  },
  pipe: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 0, 127, 0.28)',
    borderWidth: 1.5,
    borderColor: COLORS.magenta,
  },
  pipeCap: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
  },
  drone: {
    position: 'absolute',
    borderRadius: 8,
    backgroundColor: COLORS.cyan,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  droneVisor: {
    width: 14,
    height: 6,
    borderRadius: 2,
    backgroundColor: '#060914',
  },
  shieldBubble: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.8,
    borderColor: '#39FF14',
    backgroundColor: 'rgba(57, 255, 20, 0.15)',
  },
  pickup: {
    position: 'absolute',
    borderRadius: 10,
    backgroundColor: 'rgba(5, 7, 18, 0.85)',
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enemyDrone: {
    position: 'absolute',
    borderRadius: 10,
    backgroundColor: 'rgba(255, 0, 85, 0.35)',
    borderWidth: 1.5,
    borderColor: '#FF0055',
    alignItems: 'center',
    justifyContent: 'center',
  },
  enemyCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF0055',
  },
  laserBeam: {
    position: 'absolute',
    width: 16,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00F5FF',
    shadowColor: '#00F5FF',
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  centerPrompt: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  promptText: {
    fontSize: 11.5,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.cyan,
    backgroundColor: 'rgba(4, 4, 14, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cyan,
  },
});
