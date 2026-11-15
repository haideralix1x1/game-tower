import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
  Animated,
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
  Stop,
  Text as SvgText,
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
  playLaserBlastSound,
  playExplosionSound,
  playJumpSound,
  playVictorySound,
  playFailSound,
  playSnapTickSound,
  startBGM,
  stopBGM,
} from '../utils/sound';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const STORAGE_LEVEL_KEY = '@game_tower:snow_chamber_level_v1';
const STORAGE_SCORE_KEY = '@game_tower:snow_chamber_score_v1';

const ARENA_WIDTH = 340;
const ARENA_HEIGHT = 480;
const MID_Y = ARENA_HEIGHT / 2;
const DIVIDER_HEIGHT = 14;

// 5 Distinct World Themes
const WORLDS = [
  { id: 1, name: 'FROZEN DUNGEON', bg: '#080F1E', accent: '#00F5FF', enemyTypes: ['red_devil', 'green_hopper'], boss: 'ROCK GOLEM' },
  { id: 2, name: 'CRYSTAL LAB', bg: '#0C0A1E', accent: '#A855F7', enemyTypes: ['chameleon', 'bat'], boss: 'TWIN-HORN CYCLOPS' },
  { id: 3, name: 'HAUNTED SPIRES', bg: '#071618', accent: '#10B981', enemyTypes: ['ghost', 'spiky'], boss: 'GARGOYLE MONARCH' },
  { id: 4, name: 'VOLCANIC CORE', bg: '#1C0B0A', accent: '#FF5500', enemyTypes: ['salamander', 'drone'], boss: 'MECHA TITAN' },
  { id: 5, name: 'COSMIC VOID', bg: '#05040D', accent: '#FFE600', enemyTypes: ['shade', 'imp'], boss: 'COSMIC EMPEROR' },
];

export default function SnowBrosChamberGame({
  onBackToHub,
  onExit,
  onScoreUpdate,
  isPaused = false,
}) {
  const handleExit = onBackToHub || onExit;
  const isPausedRef = useRef(isPaused);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const { width } = useWindowDimensions();
  const scale = Math.min((width - 20) / ARENA_WIDTH, 1.15);

  const juiceRef = useRef(null);

  // Level & Progression State
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameState, setGameState] = useState('PLAYING'); // 'PLAYING' | 'WIN' | 'GAMEOVER'
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [modalType, setModalType] = useState('VICTORY');

  // World Calculation
  const worldIndex = Math.min(Math.floor((level - 1) / 10), 4);
  const currentWorld = WORLDS[worldIndex];
  const isBossLevel = level % 10 === 0;

  // Render tick for 60 FPS loop
  const [, setRenderTrigger] = useState(0);

  // Entities Ref
  // Heroes: Nick (Bottom, Normal Gravity) & Tom (Top, Inverted Gravity)
  const heroesRef = useRef({
    nick: {
      x: 40,
      y: ARENA_HEIGHT - 35,
      vx: 0,
      vy: 0,
      facing: 1, // 1 = right, -1 = left
      isGrounded: false,
      isInvincible: 0,
    },
    tom: {
      x: 40,
      y: 35,
      vx: 0,
      vy: 0,
      facing: 1,
      isGrounded: false,
      isInvincible: 0,
    },
  });

  const controlsRef = useRef({
    left: false,
    right: false,
  });

  // Projectiles: [{ id, x, y, vx, chamber: 'bottom' | 'top' }]
  const snowBlastsRef = useRef([]);

  // Snowballs rolling: [{ id, x, y, vx, vy, chamber, radius, life }]
  const snowballsRef = useRef([]);

  // Enemies: [{ id, type, x, y, vx, vy, chamber, freezeLevel, isBoss, hp, maxHp }]
  const enemiesRef = useRef([]);

  // Platforms: [{ x, y, w, h, chamber }]
  const platformsRef = useRef([]);

  // Load Saved Progress
  useEffect(() => {
    (async () => {
      try {
        const savedLvl = await AsyncStorage.getItem(STORAGE_LEVEL_KEY);
        if (savedLvl !== null) {
          const l = parseInt(savedLvl, 10);
          if (!isNaN(l)) setLevel(l);
        }
        const savedScore = await AsyncStorage.getItem(STORAGE_SCORE_KEY);
        if (savedScore !== null) {
          const s = parseInt(savedScore, 10);
          if (!isNaN(s)) setHighScore(s);
        }
      } catch {}
    })();
  }, []);

  // Initialize Level & Platforms
  const initLevel = useCallback((lvl) => {
    const isBoss = lvl % 10 === 0;
    const wIdx = Math.min(Math.floor((lvl - 1) / 10), 4);
    const world = WORLDS[wIdx];

    // Reset Heroes Position
    heroesRef.current = {
      nick: {
        x: 40,
        y: ARENA_HEIGHT - 35,
        vx: 0,
        vy: 0,
        facing: 1,
        isGrounded: false,
        isInvincible: 40,
      },
      tom: {
        x: 40,
        y: 35,
        vx: 0,
        vy: 0,
        facing: 1,
        isGrounded: false,
        isInvincible: 40,
      },
    };

    snowBlastsRef.current = [];
    snowballsRef.current = [];

    // Build Platforms for Both Chambers
    const platList = [
      // Central Dividing Barrier
      { x: 0, y: MID_Y - DIVIDER_HEIGHT / 2, w: ARENA_WIDTH, h: DIVIDER_HEIGHT, isDivider: true },

      // Bottom Chamber (Nick) Platforms
      { x: 0, y: ARENA_HEIGHT - 12, w: ARENA_WIDTH, h: 12, chamber: 'bottom' }, // Floor
      { x: 30, y: ARENA_HEIGHT - 75, w: 100, h: 8, chamber: 'bottom' },
      { x: 210, y: ARENA_HEIGHT - 75, w: 100, h: 8, chamber: 'bottom' },
      { x: 100, y: ARENA_HEIGHT - 140, w: 140, h: 8, chamber: 'bottom' },
      { x: 20, y: ARENA_HEIGHT - 195, w: 80, h: 8, chamber: 'bottom' },
      { x: 240, y: ARENA_HEIGHT - 195, w: 80, h: 8, chamber: 'bottom' },

      // Top Chamber (Tom) Inverted Ceiling Platforms
      { x: 0, y: 0, w: ARENA_WIDTH, h: 12, chamber: 'top' }, // Ceiling
      { x: 30, y: 75, w: 100, h: 8, chamber: 'top' },
      { x: 210, y: 75, w: 100, h: 8, chamber: 'top' },
      { x: 100, y: 140, w: 140, h: 8, chamber: 'top' },
      { x: 20, y: 195, w: 80, h: 8, chamber: 'top' },
      { x: 240, y: 195, w: 80, h: 8, chamber: 'top' },
    ];
    platformsRef.current = platList;

    // Spawn Enemies
    const spawnedEnemies = [];
    const enemyCount = isBoss ? 1 : 2 + Math.min(Math.floor((lvl % 10) / 2), 3);

    if (isBoss) {
      // Spawn Boss in Bottom & Minion in Top (or Giant Dual Boss)
      spawnedEnemies.push({
        id: 'boss_bottom',
        type: 'boss',
        name: world.boss,
        x: ARENA_WIDTH - 70,
        y: ARENA_HEIGHT - 50,
        vx: -1.2,
        vy: 0,
        chamber: 'bottom',
        freezeLevel: 0,
        isBoss: true,
        hp: 20 + lvl * 2,
        maxHp: 20 + lvl * 2,
        radius: 24,
      });
      spawnedEnemies.push({
        id: 'boss_top',
        type: 'boss',
        name: `${world.boss} REFLECTION`,
        x: ARENA_WIDTH - 70,
        y: 50,
        vx: -1.2,
        vy: 0,
        chamber: 'top',
        freezeLevel: 0,
        isBoss: true,
        hp: 20 + lvl * 2,
        maxHp: 20 + lvl * 2,
        radius: 24,
      });
    } else {
      // Spawn regular world enemies in both chambers
      const types = world.enemyTypes;
      for (let i = 0; i < enemyCount; i++) {
        // Bottom Enemy
        spawnedEnemies.push({
          id: `b_enemy_${i}`,
          type: types[i % types.length],
          x: 120 + i * 65,
          y: ARENA_HEIGHT - 35,
          vx: (i % 2 === 0 ? 1 : -1) * (1.1 + lvl * 0.04),
          vy: 0,
          chamber: 'bottom',
          freezeLevel: 0,
          isBoss: false,
          hp: 3,
          radius: 12,
        });

        // Top Inverted Enemy
        spawnedEnemies.push({
          id: `t_enemy_${i}`,
          type: types[(i + 1) % types.length],
          x: 120 + i * 65,
          y: 35,
          vx: (i % 2 === 0 ? -1 : 1) * (1.1 + lvl * 0.04),
          vy: 0,
          chamber: 'top',
          freezeLevel: 0,
          isBoss: false,
          hp: 3,
          radius: 12,
        });
      }
    }

    enemiesRef.current = spawnedEnemies;
    setGameState('PLAYING');
    setResultModalVisible(false);
  }, []);

  useEffect(() => {
    initLevel(level);
  }, [level, initLevel]);

  // Jump Action for Both Heroes
  const handleJump = () => {
    const { nick, tom } = heroesRef.current;
    let didJump = false;

    // Nick jumps UP (Normal Gravity)
    if (nick.isGrounded) {
      nick.vy = -10.5;
      nick.isGrounded = false;
      didJump = true;
    }

    // Tom jumps DOWN (Inverted Gravity)
    if (tom.isGrounded) {
      tom.vy = 10.5;
      tom.isGrounded = false;
      didJump = true;
    }

    if (didJump) {
      playJumpSound();
      triggerLightHaptic();
    }
  };

  // Snow Blast & Kick Action
  const handleSnowBlast = () => {
    const { nick, tom } = heroesRef.current;
    playLaserBlastSound();
    triggerMediumHaptic();

    // Check if Nick or Tom is near a fully frozen snowball to KICK it
    let kicked = false;
    for (const enemy of enemiesRef.current) {
      if (enemy.freezeLevel >= 3) {
        const dNick = Math.hypot(nick.x - enemy.x, nick.y - enemy.y);
        const dTom = Math.hypot(tom.x - enemy.x, tom.y - enemy.y);

        if ((enemy.chamber === 'bottom' && dNick < 35) || (enemy.chamber === 'top' && dTom < 35)) {
          // KICK SNOWBALL!
          const kickDir = enemy.chamber === 'bottom' ? nick.facing : tom.facing;
          snowballsRef.current.push({
            id: `sb_${Date.now()}_${Math.random()}`,
            x: enemy.x,
            y: enemy.y,
            vx: kickDir * 9,
            vy: 0,
            chamber: enemy.chamber,
            radius: 18,
            life: 140,
          });

          // Remove the frozen enemy
          enemiesRef.current = enemiesRef.current.filter((e) => e.id !== enemy.id);
          playExplosionSound();
          triggerHeavyHaptic();
          if (juiceRef.current) {
            juiceRef.current.popup('SNOWBALL KICK!', '+200', '#00F5FF');
          }
          setScore((s) => s + 200);
          kicked = true;
          break;
        }
      }
    }

    if (!kicked) {
      // Fire regular snow blasts from both heroes!
      snowBlastsRef.current.push({
        id: `sb_nick_${Date.now()}`,
        x: nick.x + nick.facing * 14,
        y: nick.y,
        vx: nick.facing * 8.5,
        chamber: 'bottom',
        life: 30,
      });

      snowBlastsRef.current.push({
        id: `sb_tom_${Date.now()}`,
        x: tom.x + tom.facing * 14,
        y: tom.y,
        vx: tom.facing * 8.5,
        chamber: 'top',
        life: 30,
      });
    }
  };

  // Main 60 FPS Physics & Game Loop
  useEffect(() => {
    let animId = null;

    const loop = () => {
      animId = requestAnimationFrame(loop);

      if (isPausedRef.current || gameState !== 'PLAYING') return;

      const { nick, tom } = heroesRef.current;
      const { left, right } = controlsRef.current;

      // 1. Move Heroes
      const moveSpeed = 3.6;
      if (left) {
        nick.vx = -moveSpeed;
        nick.facing = -1;
        tom.vx = -moveSpeed;
        tom.facing = -1;
      } else if (right) {
        nick.vx = moveSpeed;
        nick.facing = 1;
        tom.vx = moveSpeed;
        tom.facing = 1;
      } else {
        nick.vx *= 0.72;
        tom.vx *= 0.72;
      }

      // Normal Gravity on Nick (Pulls DOWN)
      nick.vy += 0.52;
      nick.x += nick.vx;
      nick.y += nick.vy;

      // Inverted Gravity on Tom (Pulls UP)
      tom.vy -= 0.52;
      tom.x += tom.vx;
      tom.y += tom.vy;

      // Arena horizontal boundaries
      nick.x = Math.max(14, Math.min(ARENA_WIDTH - 14, nick.x));
      tom.x = Math.max(14, Math.min(ARENA_WIDTH - 14, tom.x));

      // Hero Invincibility decrement
      if (nick.isInvincible > 0) nick.isInvincible--;
      if (tom.isInvincible > 0) tom.isInvincible--;

      // 2. Platform Collisions
      nick.isGrounded = false;
      tom.isGrounded = false;

      for (const p of platformsRef.current) {
        // Nick vs Bottom Platforms (landing from above)
        if (p.chamber === 'bottom' || p.isDivider) {
          if (
            nick.x >= p.x - 10 &&
            nick.x <= p.x + p.w + 10 &&
            nick.y + 14 >= p.y &&
            nick.y - nick.vy + 14 <= p.y + 10 &&
            nick.vy >= 0
          ) {
            nick.y = p.y - 14;
            nick.vy = 0;
            nick.isGrounded = true;
          }
        }

        // Tom vs Top Inverted Platforms (landing from below onto ceiling)
        if (p.chamber === 'top' || p.isDivider) {
          if (
            tom.x >= p.x - 10 &&
            tom.x <= p.x + p.w + 10 &&
            tom.y - 14 <= p.y + p.h &&
            tom.y - tom.vy - 14 >= p.y &&
            tom.vy <= 0
          ) {
            tom.y = p.y + p.h + 14;
            tom.vy = 0;
            tom.isGrounded = true;
          }
        }
      }

      // 3. Update Snow Blasts
      const remainingBlasts = [];
      for (const b of snowBlastsRef.current) {
        b.x += b.vx;
        b.life--;

        let hitEnemy = false;
        for (const enemy of enemiesRef.current) {
          if (enemy.chamber === b.chamber) {
            const dist = Math.hypot(b.x - enemy.x, b.y - enemy.y);
            if (dist < (enemy.radius || 14) + 6) {
              hitEnemy = true;
              playSnapTickSound();
              triggerLightHaptic();

              if (enemy.isBoss) {
                enemy.hp--;
                if (enemy.hp <= 0) {
                  enemiesRef.current = enemiesRef.current.filter((e) => e.id !== enemy.id);
                  playExplosionSound();
                  setScore((s) => s + 1000);
                }
              } else {
                enemy.freezeLevel = Math.min(3, enemy.freezeLevel + 1);
              }
              break;
            }
          }
        }

        if (!hitEnemy && b.life > 0 && b.x > 0 && b.x < ARENA_WIDTH) {
          remainingBlasts.push(b);
        }
      }
      snowBlastsRef.current = remainingBlasts;

      // 4. Update Rolling Snowballs
      const remainingSnowballs = [];
      for (const sb of snowballsRef.current) {
        sb.x += sb.vx;
        sb.life--;

        // Wall Bounce
        if (sb.x < 18) {
          sb.x = 18;
          sb.vx = -sb.vx;
          playLaserBlastSound();
        } else if (sb.x > ARENA_WIDTH - 18) {
          sb.x = ARENA_WIDTH - 18;
          sb.vx = -sb.vx;
          playLaserBlastSound();
        }

        // Snowball squashes enemies!
        for (const enemy of enemiesRef.current) {
          if (enemy.chamber === sb.chamber) {
            const dist = Math.hypot(sb.x - enemy.x, sb.y - enemy.y);
            if (dist < sb.radius + 14) {
              enemiesRef.current = enemiesRef.current.filter((e) => e.id !== enemy.id);
              playExplosionSound();
              triggerHeavyHaptic();
              setScore((s) => s + 250);
              if (juiceRef.current) {
                juiceRef.current.popup('SMASH!', '+250', '#FFE600');
              }
            }
          }
        }

        if (sb.life > 0) {
          remainingSnowballs.push(sb);
        }
      }
      snowballsRef.current = remainingSnowballs;

      // 5. Update Enemies
      for (const enemy of enemiesRef.current) {
        if (enemy.freezeLevel < 3) {
          // Move enemy if not fully frozen
          enemy.x += enemy.vx * (enemy.freezeLevel > 0 ? 0.35 : 1.0);

          // Wall bounce
          if (enemy.x < 24) {
            enemy.x = 24;
            enemy.vx = Math.abs(enemy.vx);
          } else if (enemy.x > ARENA_WIDTH - 24) {
            enemy.x = ARENA_WIDTH - 24;
            enemy.vx = -Math.abs(enemy.vx);
          }

          // Check Hero Collision (Hurt Player)
          const targetHero = enemy.chamber === 'bottom' ? nick : tom;
          if (targetHero.isInvincible <= 0) {
            const distHero = Math.hypot(enemy.x - targetHero.x, enemy.y - targetHero.y);
            if (distHero < (enemy.radius || 14) + 12) {
              // Hero Hit!
              playFailSound();
              triggerGameOverHaptic();
              targetHero.isInvincible = 60;

              setLives((l) => {
                const nextLives = l - 1;
                if (nextLives <= 0) {
                  setGameState('GAMEOVER');
                  setModalType('GAME_OVER');
                  setResultModalVisible(true);
                }
                return nextLives;
              });
            }
          }
        }
      }

      // 6. Check Level Victory (All enemies eliminated)
      if (enemiesRef.current.length === 0 && gameState === 'PLAYING') {
        setGameState('WIN');
        playVictorySound();
        triggerPerfectHaptic(3);
        if (juiceRef.current) {
          juiceRef.current.celebrate('CHAMBER ESCAPED!', `LEVEL ${level} CLEARED!`, '#00F5FF');
        }

        const nextScore = score + (isBossLevel ? 1500 : 500);
        setScore(nextScore);
        setHighScore((prev) => {
          const nw = Math.max(prev, nextScore);
          AsyncStorage.setItem(STORAGE_SCORE_KEY, String(nw)).catch(() => {});
          onScoreUpdate?.(nw);
          return nw;
        });

        setTimeout(() => {
          setModalType('VICTORY');
          setResultModalVisible(true);
        }, 1200);
      }

      setRenderTrigger((t) => (t + 1) % 10000);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [gameState, level, score, isBossLevel, onScoreUpdate]);

  const { nick, tom } = heroesRef.current;

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={styles.container}>
        {/* Unified Game Tower Header */}
        <MiniGameHeader
          floorNum={9}
          gameTitle="DUAL GRAVITY"
          category="SNOW CHAMBERS"
          accentColor={currentWorld.accent}
          score={score}
          highScore={highScore}
          onBack={handleExit}
          onBackToHub={handleExit}
          onReset={() => {
            setLevel(1);
            setScore(0);
            AsyncStorage.setItem(STORAGE_LEVEL_KEY, '1').catch(() => {});
            initLevel(1);
          }}
          resetLabel="NEW"
          rightExtra={
            <View style={styles.livesRow}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Text
                  key={`life_${i}`}
                  style={{ fontSize: 13, opacity: i < lives ? 1 : 0.25 }}
                >
                  ❤️
                </Text>
              ))}
            </View>
          }
        />

        {/* Level Banner */}
        <View style={styles.levelBanner}>
          <Text style={[styles.worldName, { color: currentWorld.accent }]}>
            {currentWorld.name} // LVL {level}/50
          </Text>
          <View style={styles.bossBadge}>
            <Text style={styles.bossBadgeText}>
              {isBossLevel ? `⚠️ BOSS: ${currentWorld.boss}` : `ENEMIES: ${enemiesRef.current.length}`}
            </Text>
          </View>
        </View>

        {/* Dual Gravity Chamber Viewport */}
        <View style={[styles.arenaBox, { width: ARENA_WIDTH, height: ARENA_HEIGHT, backgroundColor: currentWorld.bg }]}>
          <Svg width={ARENA_WIDTH} height={ARENA_HEIGHT}>
            <Defs>
              <LinearGradient id="dividerGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor="#00F5FF" />
                <Stop offset="50%" stopColor="#FFE600" />
                <Stop offset="100%" stopColor="#FF007F" />
              </LinearGradient>
            </Defs>

            {/* Platforms */}
            {platformsRef.current.map((p, i) => (
              <Rect
                key={`plat_${i}`}
                x={p.x}
                y={p.y}
                width={p.w}
                height={p.h}
                fill={p.isDivider ? 'url(#dividerGlow)' : '#1E293B'}
                stroke={p.isDivider ? '#FFFFFF' : '#334155'}
                strokeWidth={1.5}
                rx={p.isDivider ? 0 : 3}
              />
            ))}

            {/* Snow Blasts */}
            {snowBlastsRef.current.map((b) => (
              <Circle
                key={b.id}
                cx={b.x}
                cy={b.y}
                r={5.5}
                fill="#FFFFFF"
                stroke="#00F5FF"
                strokeWidth={2}
              />
            ))}

            {/* Rolling Snowballs */}
            {snowballsRef.current.map((sb) => (
              <G key={sb.id}>
                <Circle
                  cx={sb.x}
                  cy={sb.y}
                  r={sb.radius}
                  fill="#FFFFFF"
                  stroke="#00F5FF"
                  strokeWidth={3}
                />
                <Circle cx={sb.x - 4} cy={sb.y - 4} r={3} fill="#A5F3FC" />
              </G>
            ))}

            {/* Enemies */}
            {enemiesRef.current.map((enemy) => {
              const isFrozen = enemy.freezeLevel > 0;
              const radius = enemy.radius || 12;

              return (
                <G key={enemy.id}>
                  {/* Enemy Body */}
                  <Circle
                    cx={enemy.x}
                    cy={enemy.y}
                    r={radius}
                    fill={
                      enemy.freezeLevel >= 3
                        ? '#FFFFFF'
                        : enemy.freezeLevel > 0
                        ? '#7DD3FC'
                        : enemy.isBoss
                        ? '#FF0055'
                        : '#F59E0B'
                    }
                    stroke={enemy.freezeLevel >= 3 ? '#00F5FF' : '#FFFFFF'}
                    strokeWidth={2}
                  />

                  {/* Enemy Face / Boss Crown */}
                  {enemy.isBoss ? (
                    <SvgText
                      x={enemy.x}
                      y={enemy.y + 6}
                      fill="#FFFFFF"
                      fontSize={16}
                      fontWeight="900"
                      textAnchor="middle"
                    >
                      👑
                    </SvgText>
                  ) : (
                    <SvgText
                      x={enemy.x}
                      y={enemy.y + 4}
                      fill="#000000"
                      fontSize={11}
                      fontWeight="900"
                      textAnchor="middle"
                    >
                      {enemy.freezeLevel >= 3 ? '❄️' : '😈'}
                    </SvgText>
                  )}

                  {/* Boss Health Bar */}
                  {enemy.isBoss && (
                    <G>
                      <Rect
                        x={enemy.x - 22}
                        y={enemy.chamber === 'bottom' ? enemy.y - 32 : enemy.y + 26}
                        width={44}
                        height={6}
                        fill="#0F172A"
                        stroke="#334155"
                        strokeWidth={1}
                        rx={3}
                      />
                      <Rect
                        x={enemy.x - 22}
                        y={enemy.chamber === 'bottom' ? enemy.y - 32 : enemy.y + 26}
                        width={Math.max(0, (enemy.hp / enemy.maxHp) * 44)}
                        height={6}
                        fill="#FF0055"
                        rx={3}
                      />
                    </G>
                  )}
                </G>
              );
            })}

            {/* Nick (Bottom Hero - Blue) */}
            <G opacity={nick.isInvincible % 4 < 2 ? 1 : 0.4}>
              <Circle cx={nick.x} cy={nick.y} r={13} fill="#0284C7" stroke="#FFFFFF" strokeWidth={2} />
              <SvgText x={nick.x} y={nick.y + 4.5} fill="#FFFFFF" fontSize={12} fontWeight="900" textAnchor="middle">
                ☃️
              </SvgText>
            </G>

            {/* Tom (Top Hero - Cyan Inverted) */}
            <G opacity={tom.isInvincible % 4 < 2 ? 1 : 0.4}>
              <Circle cx={tom.x} cy={tom.y} r={13} fill="#06B6D4" stroke="#FFFFFF" strokeWidth={2} />
              <SvgText x={tom.x} y={tom.y + 4.5} fill="#FFFFFF" fontSize={12} fontWeight="900" textAnchor="middle">
                ⛄
              </SvgText>
            </G>
          </Svg>
        </View>

        {/* Dual Parallel Action Controls */}
        <View style={styles.controlsBar}>
          {/* Movement Arrows */}
          <View style={styles.dpadGroup}>
            <TouchableOpacity
              style={styles.dpadBtn}
              onPressIn={() => {
                controlsRef.current.left = true;
              }}
              onPressOut={() => {
                controlsRef.current.left = false;
              }}
            >
              <Text style={styles.btnText}>◀</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dpadBtn}
              onPressIn={() => {
                controlsRef.current.right = true;
              }}
              onPressOut={() => {
                controlsRef.current.right = false;
              }}
            >
              <Text style={styles.btnText}>▶</Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsGroup}>
            <TouchableOpacity style={styles.jumpBtn} onPress={handleJump}>
              <Text style={styles.actionBtnLabel}>▲ JUMP</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.snowBtn} onPress={handleSnowBlast}>
              <Text style={styles.actionBtnLabel}>❄️ SNOW / KICK</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Victory & Level Modal */}
        <GameResultModal
          visible={resultModalVisible}
          type={modalType}
          score={score}
          highScore={highScore}
          onRestart={() => {
            if (modalType === 'VICTORY') {
              const nextLvl = (level % 50) + 1;
              setLevel(nextLvl);
              AsyncStorage.setItem(STORAGE_LEVEL_KEY, String(nextLvl)).catch(() => {});
            } else {
              setLives(3);
              initLevel(level);
            }
          }}
          onBackToHub={handleExit}
        />
      </View>
    </JuiceEngine>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
    alignItems: 'center',
  },
  livesRow: {
    flexDirection: 'row',
    gap: 3,
  },
  levelBanner: {
    width: ARENA_WIDTH,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
    paddingHorizontal: 4,
  },
  worldName: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  bossBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  bossBadgeText: {
    fontFamily: monoFont,
    fontSize: 9,
    fontWeight: '800',
    color: '#FFE600',
  },
  arenaBox: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1E293B',
    overflow: 'hidden',
  },
  controlsBar: {
    width: ARENA_WIDTH,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  dpadGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  dpadBtn: {
    width: 58,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#00F5FF',
    fontSize: 22,
    fontWeight: '900',
  },
  actionsGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  jumpBtn: {
    paddingHorizontal: 16,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#0F766E',
    borderWidth: 1.5,
    borderColor: '#14B8A6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  snowBtn: {
    paddingHorizontal: 16,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#0284C7',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnLabel: {
    fontFamily: monoFont,
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
