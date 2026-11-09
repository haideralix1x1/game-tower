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
  const baseGapHeight = 130;
  const pipeWidth = 48;
  const droneSize = 26;
  const droneX = 68;

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

        // 1. Pipe Spawning & Oscillating Hurdles
        eng.spawnTimer += dt;
        if (eng.spawnTimer >= 1.6) {
          eng.spawnTimer = 0;
          const minTop = 40;
          const maxTop = arenaHeight - baseGapHeight - 50;
          const initialTop = minTop + Math.random() * Math.max(40, maxTop - minTop);
          const isMoving = Math.random() < 0.45; // 45% of pipes oscillate dynamically!
          const isLaserBarrier = Math.random() < 0.25;

          const pipeId = `p_${ts}_${Math.random()}`;
          eng.pipes.push({
            id: pipeId,
            x: arenaWidth,
            topH: initialTop,
            baseTopH: initialTop,
            isMoving,
            moveSpeed: 1.2 + Math.random() * 1.5,
            moveOffset: Math.random() * Math.PI * 2,
            isLaserBarrier,
            passed: false,
          });

          // Chance to spawn floating energy shard or power-up in gap
          if (Math.random() < 0.55) {
            const isPowerup = Math.random() < 0.35;
            const pTypes = [POWERUP_SHIELD, POWERUP_BLASTER, POWERUP_SLOWMO];
            const pType = pTypes[Math.floor(Math.random() * pTypes.length)];

            eng.pickups.push({
              id: `pick_${ts}`,
              x: arenaWidth + pipeWidth / 2 - 8,
              y: initialTop + baseGapHeight / 2 - 8,
              type: isPowerup ? pType : 'SHARD',
              color: isPowerup ? (pType === POWERUP_SHIELD ? '#00F5FF' : pType === POWERUP_BLASTER ? '#FF0055' : '#FFE600') : '#00F5D4',
              icon: isPowerup ? (pType === POWERUP_SHIELD ? '🛡️' : pType === POWERUP_BLASTER ? '⚡' : '⏱️') : '💎',
              size: isPowerup ? 20 : 16,
            });
          }
        }

        // 2. Enemy Patrol Drones Spawning
        eng.enemySpawnTimer += dt;
        if (eng.enemySpawnTimer >= 3.2) {
          eng.enemySpawnTimer = 0;
          const ey = 60 + Math.random() * (arenaHeight - 120);
          eng.enemies.push({
            id: `en_${ts}_${Math.random()}`,
            x: arenaWidth + 20,
            y: ey,
            baseY: ey,
            vx: 130 + Math.random() * 40,
            bobSpeed: 2.2 + Math.random() * 1.5,
            bobAmp: 25 + Math.random() * 20,
            size: 20,
            hp: 1,
          });
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
          pick.x -= 160 * dt;

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
          const nx = p.x - 160 * dt;

          // Oscillating pipes
          if (p.isMoving) {
            p.topH = p.baseTopH + Math.sin(eng.gameTime * p.moveSpeed + p.moveOffset) * 26;
          }

          // Check collision with player
          const inX = droneX + droneSize > nx && droneX < nx + pipeWidth;
          const hitTop = eng.droneY < p.topH;
          const hitBottom = eng.droneY + droneSize > p.topH + baseGapHeight;

          if (inX && (hitTop || hitBottom)) {
            if (eng.shield) {
              eng.shield = false;
              setHasShield(false);
              eng.droneY = p.topH + baseGapHeight / 2 - droneSize / 2;
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
          floorLabel="FLOOR 12 // CYBER DRONE"
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
            {frame.pipes.map((p) => (
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
                      borderColor: p.isMoving ? '#00F5FF' : COLORS.magenta,
                    },
                  ]}
                >
                  <View style={[localStyles.pipeCap, { bottom: 0, backgroundColor: p.isMoving ? '#00F5FF' : COLORS.magenta }]} />
                </View>

                {/* Bottom Pipe */}
                <View
                  style={[
                    localStyles.pipe,
                    {
                      left: p.x,
                      top: p.topH + baseGapHeight,
                      width: pipeWidth,
                      height: Math.max(0, arenaHeight - (p.topH + baseGapHeight)),
                      borderColor: p.isMoving ? '#00F5FF' : COLORS.magenta,
                    },
                  ]}
                >
                  <View style={[localStyles.pipeCap, { top: 0, backgroundColor: p.isMoving ? '#00F5FF' : COLORS.magenta }]} />
                </View>
              </React.Fragment>
            ))}

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

            {/* Enemy Patrol Drones */}
            {frame.enemies.map((en) => (
              <View
                key={en.id}
                style={[
                  localStyles.enemyDrone,
                  {
                    left: en.x,
                    top: en.y,
                    width: en.size,
                    height: en.size,
                  },
                ]}
              >
                <View style={localStyles.enemyCore} />
              </View>
            ))}

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

            {/* Player Cyber Drone */}
            <View
              style={[
                localStyles.drone,
                {
                  left: droneX,
                  top: frame.droneY,
                  width: droneSize,
                  height: droneSize,
                  borderColor: frame.hasShield ? '#39FF14' : '#FFFFFF',
                },
              ]}
            >
              {/* Drone Eye Visor */}
              <View style={localStyles.droneVisor} />
              {/* Shield Bubble */}
              {frame.hasShield && <View style={localStyles.shieldBubble} />}
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
