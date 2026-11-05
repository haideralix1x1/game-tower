import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  useWindowDimensions,
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, {
  Path,
  Rect,
  Circle,
  Polygon,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import { COLORS } from '../../styles';
import MiniGameHeader from '../components/MiniGameHeader';
import JuiceEngine from '../components/JuiceEngine';
import GameResultModal from '../components/GameResultModal';
import {
  triggerLightHaptic,
  triggerSliceHaptic,
  triggerPerfectHaptic,
  triggerGameOverHaptic,
} from '../utils/haptics';
import {
  playTapSound,
  playSliceSound,
  playPerfectSound,
  playGameOverSound,
} from '../utils/sound';

const STORAGE_KEY = '@game_tower:best_shooter_v1';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

// Power-up Types Definition
const POWERUP_TYPES = {
  SPREAD: {
    id: 'SPREAD',
    label: '3X SPREAD',
    badge: '🔱 3X SPREAD',
    color: '#00F5FF',
    duration: 11,
  },
  MEGA: {
    id: 'MEGA',
    label: 'MEGA CANNON',
    badge: '💥 MEGA PLASMA',
    color: '#FF007F',
    duration: 10,
  },
  RAPID: {
    id: 'RAPID',
    label: 'TURBO RAPID',
    badge: '⚡ TURBO FIRE',
    color: '#FFD166',
    duration: 10,
  },
  SHIELD: {
    id: 'SHIELD',
    label: 'CYBER SHIELD',
    badge: '🛡️ ENERGY SHIELD',
    color: '#00F5D4',
    duration: 14,
  },
};

export default function SpaceShooterGame({ onBackToHub, onScoreUpdate, isPaused = false }) {
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  const { width, height } = useWindowDimensions();
  const arenaWidth = Math.min(390, width - 24);
  const arenaHeight = Math.min(520, Math.max(380, height - 215));
  const shipW = 48;
  const shipH = 34;
  const shipY = arenaHeight - 56;

  const juiceRef = useRef(null);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [status, setStatus] = useState('PLAYING');
  const [activePowerup, setActivePowerup] = useState(null);

  const [frame, setFrame] = useState({
    shipX: (arenaWidth - shipW) / 2,
    bullets: [],
    enemies: [],
    enemyBullets: [],
    powerups: [],
    explosions: [],
    hasShield: false,
    powerupTimeLeft: 0,
  });

  const engRef = useRef({
    running: true,
    shipX: (arenaWidth - shipW) / 2,
    bullets: [],
    enemies: [],
    enemyBullets: [],
    powerups: [],
    explosions: [],
    activePowerup: null,
    hasShield: false,
    fireTimer: 0,
    spawnTimer: 0,
    score: 0,
    best: 0,
  });

  const dragStartRef = useRef({ startShipX: (arenaWidth - shipW) / 2 });

  // 1:1 Smooth Delta PanResponder - Completely fixes the left/right snapping bug
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => Boolean(engRef.current.running),
      onMoveShouldSetPanResponder: () => Boolean(engRef.current.running),
      onPanResponderGrant: (evt, gestureState) => {
        dragStartRef.current.startShipX = engRef.current.shipX;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (!engRef.current.running) return;
        const targetX = dragStartRef.current.startShipX + gestureState.dx;
        engRef.current.shipX = Math.max(
          4,
          Math.min(arenaWidth - shipW - 4, targetX)
        );
      },
    })
  ).current;

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
      running: true,
      shipX: (arenaWidth - shipW) / 2,
      bullets: [],
      enemies: [],
      enemyBullets: [],
      powerups: [],
      explosions: [],
      activePowerup: null,
      hasShield: false,
      fireTimer: 0,
      spawnTimer: 0,
      score: 0,
    };
    setScore(0);
    setActivePowerup(null);
    setStatus('PLAYING');
    setFrame({
      shipX: (arenaWidth - shipW) / 2,
      bullets: [],
      enemies: [],
      enemyBullets: [],
      powerups: [],
      explosions: [],
      hasShield: false,
      powerupTimeLeft: 0,
    });
  }, [arenaWidth, shipW]);

  // Main 60FPS High-Action Space Shooter Game Loop
  useEffect(() => {
    let rafId = null;
    let lastTs = 0;

    const tick = (ts) => {
      if (isPausedRef.current) {
        lastTs = ts;
        rafId = requestAnimationFrame(tick);
        return;
      }
      if (!lastTs) lastTs = ts;
      const dt = Math.min(0.033, (ts - lastTs) / 1000);
      lastTs = ts;

      const eng = engRef.current;
      if (eng.running) {
        // --- 1. Manage Active Power-up Timer ---
        if (eng.activePowerup) {
          eng.activePowerup.timeLeft -= dt;
          if (eng.activePowerup.timeLeft <= 0) {
            if (eng.activePowerup.type === 'SHIELD') {
              eng.hasShield = false;
            }
            eng.activePowerup = null;
            setActivePowerup(null);
          }
        }

        // --- 2. Auto-Fire Lasers based on abilities ---
        const isRapid = eng.activePowerup?.type === 'RAPID';
        const isSpread = eng.activePowerup?.type === 'SPREAD';
        const isMega = eng.activePowerup?.type === 'MEGA';

        const fireInterval = isRapid ? 0.095 : 0.25;
        eng.fireTimer += dt;

        if (eng.fireTimer >= fireInterval) {
          eng.fireTimer = 0;
          const sx = eng.shipX;
          const sy = shipY - 6;

          if (isSpread) {
            // Triple Spread Laser
            eng.bullets.push(
              { id: `b_l_${ts}`, x: sx + 6, y: sy, vx: -120, vy: -480, w: 5, h: 14, color: '#00F5FF' },
              { id: `b_c_${ts}`, x: sx + shipW / 2 - 2, y: sy - 4, vx: 0, vy: -520, w: 5, h: 16, color: '#FFFFFF' },
              { id: `b_r_${ts}`, x: sx + shipW - 10, y: sy, vx: 120, vy: -480, w: 5, h: 14, color: '#00F5FF' }
            );
          } else if (isMega) {
            // Giant Piercing Plasma Blast
            eng.bullets.push({
              id: `b_m_${ts}`,
              x: sx + shipW / 2 - 8,
              y: sy - 10,
              vx: 0,
              vy: -460,
              w: 16,
              h: 24,
              color: '#FF007F',
              isMega: true,
              pierceLeft: 3,
            });
          } else {
            // Standard Dual Neon Lasers
            eng.bullets.push(
              { id: `bl_${ts}`, x: sx + 8, y: sy, vx: 0, vy: -500, w: 4, h: 13, color: '#00F5FF' },
              { id: `br_${ts}`, x: sx + shipW - 12, y: sy, vx: 0, vy: -500, w: 4, h: 13, color: '#00F5FF' }
            );
          }
          playTapSound();
        }

        // --- 3. Dynamic Enemy Spawning: Multi-Enemy Squadrons & Dive Bombers ---
        eng.spawnTimer += dt;
        const spawnDelay = Math.max(0.55, 0.95 - eng.score * 0.0004);

        if (eng.spawnTimer >= spawnDelay) {
          eng.spawnTimer = 0;
          const roll = Math.random();

          // Armored Turret Gun Platform (Heavy 5 HP Boss-Mini with Dual Autocannons)
          if (roll < 0.22 && eng.score > 80) {
            const ex = 18 + Math.random() * (arenaWidth - 68);
            eng.enemies.push({
              id: `en_turret_${ts}`,
              x: ex,
              y: -42,
              w: 48,
              h: 36,
              speed: 48 + Math.min(30, eng.score * 0.04),
              color: '#00F5FF',
              type: 'TURRET',
              maxHp: 5,
              hp: 5,
              shootTimer: 1.2,
              hitFlash: 0,
              alive: true,
            });
          } else if (roll < 0.45 && eng.score > 100) {
            // Double Squadron
            const x1 = 12 + Math.random() * (arenaWidth * 0.4 - 36);
            const x2 = arenaWidth * 0.5 + Math.random() * (arenaWidth * 0.4 - 36);
            eng.enemies.push(
              {
                id: `en_d1_${ts}`,
                x: x1,
                y: -28,
                w: 28,
                h: 22,
                speed: 110 + Math.min(130, eng.score * 0.12),
                color: COLORS.cyan,
                type: 'SCOUT',
                hp: 1,
                shootTimer: 999,
                alive: true,
              },
              {
                id: `en_d2_${ts}`,
                x: x2,
                y: -28,
                w: 28,
                h: 22,
                speed: 110 + Math.min(130, eng.score * 0.12),
                color: COLORS.magenta,
                type: 'SCOUT',
                hp: 1,
                shootTimer: 999,
                alive: true,
              }
            );
          } else if (roll < 0.60 && eng.score > 250) {
            // Speed Diver: High-Velocity Dive-Bomber!
            const ex = 16 + Math.random() * (arenaWidth - 60);
            eng.enemies.push({
              id: `en_div_${ts}`,
              x: ex,
              y: -30,
              w: 26,
              h: 26,
              speed: 215 + Math.min(130, eng.score * 0.14), // Fast Dive!
              color: COLORS.solarGold,
              type: 'DIVER',
              hp: 1,
              shootTimer: 999,
              alive: true,
            });
          } else if (roll < 0.82 && eng.score > 150) {
            // Heavy Gunship Cruiser (Shoots enemy bullets!)
            const ex = 20 + Math.random() * (arenaWidth - 70);
            eng.enemies.push({
              id: `en_cr_${ts}`,
              x: ex,
              y: -35,
              w: 42,
              h: 28,
              speed: 70 + Math.min(60, eng.score * 0.06),
              color: '#FF0055',
              type: 'CRUISER',
              maxHp: 3,
              hp: 3,
              shootTimer: 0.9,
              hitFlash: 0,
              alive: true,
            });
          } else {
            // Standard Scout Drone
            const ex = 14 + Math.random() * (arenaWidth - 54);
            const colors = [COLORS.cyan, COLORS.magenta, '#00F5D4', '#C77DFF'];
            eng.enemies.push({
              id: `en_sc_${ts}`,
              x: ex,
              y: -26,
              w: 30,
              h: 22,
              speed: 100 + Math.min(120, eng.score * 0.1),
              color: colors[Math.floor(Math.random() * colors.length)],
              type: 'SCOUT',
              hp: 1,
              shootTimer: 999,
              alive: true,
            });
          }
        }

        // --- 4. Update Player Bullets & Collision with Enemies ---
        const nextBullets = [];
        for (let i = 0; i < eng.bullets.length; i += 1) {
          const b = eng.bullets[i];
          const nx = b.x + (b.vx || 0) * dt;
          const ny = b.y + (b.vy || -500) * dt;
          let removeBullet = false;

          for (let j = 0; j < eng.enemies.length; j += 1) {
            const en = eng.enemies[j];
            if (!en.alive) continue;

            if (
              nx + b.w >= en.x &&
              nx <= en.x + en.w &&
              ny <= en.y + en.h &&
              ny + b.h >= en.y
            ) {
              en.hp -= 1;
              en.hitFlash = 0.14;

              // Armor deflection sparks when taking damage
              for (let s = 0; s < 4; s += 1) {
                eng.explosions.push({
                  id: `def_${ts}_${s}_${Math.random()}`,
                  x: nx + b.w / 2,
                  y: ny,
                  vx: (Math.random() - 0.5) * 140,
                  vy: (Math.random() - 0.5) * 140,
                  size: 2.5,
                  color: en.hitFlash ? '#FFFFFF' : '#FFE600',
                  opacity: 0.9,
                  decay: 3.5,
                });
              }

              if (en.hp <= 0) {
                en.alive = false;
                const pointGain = en.type === 'TURRET' ? 100 : en.type === 'CRUISER' ? 50 : en.type === 'DIVER' ? 35 : 25;
                eng.score += pointGain;
                setScore(eng.score);
                persistBest(eng.score);
                triggerSliceHaptic();
                playPerfectSound((eng.score / 25) % 8 + 1);

                // Spawn localized in-arena blast particles right over the enemy!
                const exX = en.x + en.w / 2;
                const exY = en.y + en.h / 2;
                const sparkCount = en.type === 'TURRET' ? 32 : en.type === 'CRUISER' ? 22 : 14;
                for (let k = 0; k < sparkCount; k += 1) {
                  const angle = (Math.PI * 2 * k) / sparkCount + (Math.random() - 0.5) * 0.35;
                  const speed = 70 + Math.random() * 160;
                  eng.explosions.push({
                    id: `ex_${ts}_${k}_${Math.random()}`,
                    x: exX,
                    y: exY,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 3.5 + Math.random() * 4.5,
                    color: k % 2 === 0 ? en.color : (k % 3 === 0 ? '#FFFFFF' : '#FFD700'),
                    opacity: 1,
                    decay: 2.2 + Math.random() * 1.1,
                  });
                }

                if (juiceRef.current) {
                  juiceRef.current.shake(5, 3);
                }

                // Power-up Drop Chance: 28% from any enemy, 100% from Cruisers
                const shouldDrop = en.type === 'TURRET' || en.type === 'CRUISER' || Math.random() < 0.28;
                if (shouldDrop) {
                  const pKeys = Object.keys(POWERUP_TYPES);
                  const pType = POWERUP_TYPES[pKeys[Math.floor(Math.random() * pKeys.length)]];
                  eng.powerups.push({
                    id: `pu_${ts}_${Math.random()}`,
                    x: en.x + en.w / 2 - 16,
                    y: en.y,
                    w: 32,
                    h: 22,
                    speed: 85,
                    data: pType,
                  });
                }
              } else {
                // Cruiser hit flash
                triggerLightHaptic();
                playTapSound();
              }

              if (b.isMega) {
                b.pierceLeft -= 1;
                if (b.pierceLeft <= 0) removeBullet = true;
              } else {
                removeBullet = true;
                break;
              }
            }
          }

          if (!removeBullet && ny > -20 && nx > -10 && nx < arenaWidth + 10) {
            nextBullets.push({ ...b, x: nx, y: ny });
          }
        }
        eng.bullets = nextBullets;

        // --- 5. Update Enemies & Enemy Shooting ---
        const nextEnemies = [];
        for (let i = 0; i < eng.enemies.length; i += 1) {
          const en = eng.enemies[i];
          if (!en.alive) continue;

          // Enemy Shooting AI (Cruisers & Armored Turrets)
          if (en.hitFlash > 0) {
            en.hitFlash = Math.max(0, en.hitFlash - dt);
          }

          if (en.type === 'TURRET') {
            en.shootTimer -= dt;
            if (en.shootTimer <= 0) {
              en.shootTimer = 1.4;
              playSliceSound();
              // Left autocannon barrel
              eng.enemyBullets.push({
                id: `eb_t1_${ts}_${Math.random()}`,
                x: en.x + 8,
                y: en.y + en.h + 2,
                vy: 220 + Math.min(70, eng.score * 0.07),
                w: 6,
                h: 14,
                color: '#FFE600',
              });
              // Right autocannon barrel
              eng.enemyBullets.push({
                id: `eb_t2_${ts}_${Math.random()}`,
                x: en.x + en.w - 14,
                y: en.y + en.h + 2,
                vy: 220 + Math.min(70, eng.score * 0.07),
                w: 6,
                h: 14,
                color: '#FFE600',
              });
            }
          } else if (en.type === 'CRUISER') {
            en.shootTimer -= dt;
            if (en.shootTimer <= 0) {
              en.shootTimer = 1.6;
              eng.enemyBullets.push({
                id: `eb_${ts}_${Math.random()}`,
                x: en.x + en.w / 2 - 2,
                y: en.y + en.h + 2,
                vy: 240 + Math.min(80, eng.score * 0.08),
                w: 5,
                h: 12,
                color: '#FF0055',
              });
            }
          }

          const ny = en.y + en.speed * dt;

          // Check collision with player ship
          const shipHit =
            ny + en.h >= shipY + 4 &&
            en.y <= shipY + shipH &&
            en.x + en.w >= eng.shipX + 4 &&
            en.x <= eng.shipX + shipW - 4;

          if (shipHit) {
            if (eng.hasShield) {
              // Shield absorbs the collision!
              eng.hasShield = false;
              eng.activePowerup = null;
              setActivePowerup(null);
              en.alive = false;
              playSliceSound();
              triggerSliceHaptic();
              if (juiceRef.current) {
                juiceRef.current.shake(10, 6);
                juiceRef.current.flash(COLORS.cyan);
                juiceRef.current.popup('SHIELD BROKEN', 'IMPACT DEFLECTED', COLORS.cyan, eng.shipX, shipY);
              }
            } else {
              // Game Over on ship collision
              eng.running = false;
              setStatus('GAME_OVER');
              triggerGameOverHaptic();
              playGameOverSound();
              const pX = eng.shipX + shipW / 2;
              const pY = shipY + shipH / 2;
              for (let k = 0; k < 22; k += 1) {
                const angle = (Math.PI * 2 * k) / 22 + (Math.random() - 0.5) * 0.3;
                const speed = 70 + Math.random() * 170;
                eng.explosions.push({
                  id: `pex_${ts}_${k}`,
                  x: pX,
                  y: pY,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  size: 4 + Math.random() * 5,
                  color: k % 2 === 0 ? COLORS.danger : (k % 3 === 0 ? '#FFFFFF' : COLORS.orange),
                  opacity: 1,
                  decay: 1.8,
                });
              }
              if (juiceRef.current) {
                juiceRef.current.shake(14, 10);
                juiceRef.current.flash(COLORS.danger);
              }
              break;
            }
          }

          // If enemy bypasses ship at bottom
          if (ny + en.h >= arenaHeight + 10) {
            // Passed screen safely
            continue;
          }

          nextEnemies.push({ ...en, y: ny });
        }
        eng.enemies = nextEnemies;

        // --- 6. Update Enemy Bullets & Collision with Player ---
        const nextEnemyBullets = [];
        for (let i = 0; i < eng.enemyBullets.length; i += 1) {
          const eb = eng.enemyBullets[i];
          const ny = eb.y + eb.vy * dt;

          // Check collision with player ship
          const bulletHit =
            ny + eb.h >= shipY + 4 &&
            eb.y <= shipY + shipH &&
            eb.x + eb.w >= eng.shipX + 6 &&
            eb.x <= eng.shipX + shipW - 6;

          if (bulletHit) {
            if (eng.hasShield) {
              // Shield absorbs bullet
              eng.hasShield = false;
              eng.activePowerup = null;
              setActivePowerup(null);
              playSliceSound();
              triggerSliceHaptic();
              if (juiceRef.current) {
                juiceRef.current.shake(8, 5);
                juiceRef.current.popup('SHIELD ABSORB', 'LASER DEFLECTED', COLORS.cyan, eng.shipX, shipY);
              }
            } else {
              // Direct hit -> Game Over!
              eng.running = false;
              setStatus('GAME_OVER');
              triggerGameOverHaptic();
              playGameOverSound();
              const pX = eng.shipX + shipW / 2;
              const pY = shipY + shipH / 2;
              for (let k = 0; k < 22; k += 1) {
                const angle = (Math.PI * 2 * k) / 22 + (Math.random() - 0.5) * 0.3;
                const speed = 70 + Math.random() * 170;
                eng.explosions.push({
                  id: `pex_b_${ts}_${k}`,
                  x: pX,
                  y: pY,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  size: 4 + Math.random() * 5,
                  color: k % 2 === 0 ? COLORS.danger : (k % 3 === 0 ? '#FFFFFF' : COLORS.orange),
                  opacity: 1,
                  decay: 1.8,
                });
              }
              if (juiceRef.current) {
                juiceRef.current.shake(14, 10);
                juiceRef.current.flash(COLORS.danger);
              }
              break;
            }
          } else if (ny < arenaHeight + 10) {
            nextEnemyBullets.push({ ...eb, y: ny });
          }
        }
        eng.enemyBullets = nextEnemyBullets;

        // --- 7. Update Power-ups & Collection by Player ---
        const nextPowerups = [];
        for (let i = 0; i < eng.powerups.length; i += 1) {
          const pu = eng.powerups[i];
          const ny = pu.y + pu.speed * dt;

          // Check collection by starfighter
          const collected =
            ny + pu.h >= shipY - 4 &&
            pu.y <= shipY + shipH &&
            pu.x + pu.w >= eng.shipX - 6 &&
            pu.x <= eng.shipX + shipW + 6;

          if (collected) {
            const pType = pu.data;
            eng.activePowerup = {
              type: pType.id,
              timeLeft: pType.duration,
              maxTime: pType.duration,
              badge: pType.badge,
              color: pType.color,
            };
            if (pType.id === 'SHIELD') {
              eng.hasShield = true;
            }
            setActivePowerup(eng.activePowerup);
            playPerfectSound(6);
            triggerPerfectHaptic(4);
            if (juiceRef.current) {
              juiceRef.current.flash(pType.color);
              juiceRef.current.popup(pType.badge, 'ONLINE', pType.color, eng.shipX + shipW / 2, shipY - 20);
            }
          } else if (ny < arenaHeight + 10) {
            nextPowerups.push({ ...pu, y: ny });
          }
        }
        eng.powerups = nextPowerups;

        // --- 8. Update In-Arena Blast Explosions ---
        const nextExplosions = [];
        for (let i = 0; i < eng.explosions.length; i += 1) {
          const ep = eng.explosions[i];
          const nextOp = ep.opacity - ep.decay * dt;
          if (nextOp > 0.04) {
            nextExplosions.push({
              ...ep,
              x: ep.x + ep.vx * dt,
              y: ep.y + ep.vy * dt,
              vx: ep.vx * 0.90,
              vy: ep.vy * 0.90,
              opacity: nextOp,
            });
          }
        }
        eng.explosions = nextExplosions;

        setFrame({
          shipX: eng.shipX,
          bullets: [...eng.bullets],
          enemies: [...eng.enemies],
          enemyBullets: [...eng.enemyBullets],
          powerups: [...eng.powerups],
          explosions: [...eng.explosions],
          hasShield: eng.hasShield,
          powerupTimeLeft: eng.activePowerup ? eng.activePowerup.timeLeft : 0,
        });
      } else if (eng.explosions.length > 0) {
        // Allow in-arena game over death explosions to finish smoothly
        const nextExplosions = [];
        for (let i = 0; i < eng.explosions.length; i += 1) {
          const ep = eng.explosions[i];
          const nextOp = ep.opacity - ep.decay * dt;
          if (nextOp > 0.04) {
            nextExplosions.push({
              ...ep,
              x: ep.x + ep.vx * dt,
              y: ep.y + ep.vy * dt,
              vx: ep.vx * 0.90,
              vy: ep.vy * 0.90,
              opacity: nextOp,
            });
          }
        }
        eng.explosions = nextExplosions;
        setFrame((prev) => ({ ...prev, explosions: [...eng.explosions] }));
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [arenaWidth, arenaHeight, shipY, shipW, shipH, persistBest]);

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={localStyles.container}>
        <LinearGradient
          colors={['#020208', '#090720', '#180934']}
          style={StyleSheet.absoluteFillObject}
        />

        <MiniGameHeader
          title="SPACE SHOOTER NEO"
          floorLabel="FLOOR 20 // APEX STARFIGHTER"
          score={score}
          bestScore={bestScore}
          accentColor={COLORS.cyan}
          onBack={onBackToHub}
          onReset={resetGame}
        />

        <View style={localStyles.body}>
          {/* Active Power-up HUD Gauge Banner */}
          {activePowerup && (
            <View style={[localStyles.powerupHudBanner, { borderColor: `${activePowerup.color}88` }]}>
              <View style={localStyles.powerupHudTop}>
                <Text style={[localStyles.powerupHudText, { color: activePowerup.color }]}>
                  {activePowerup.badge}
                </Text>
                <Text style={[localStyles.powerupTimerText, { color: activePowerup.color }]}>
                  {Math.ceil(frame.powerupTimeLeft)}s
                </Text>
              </View>
              <View style={localStyles.powerupGaugeTrack}>
                <View
                  style={[
                    localStyles.powerupGaugeFill,
                    {
                      backgroundColor: activePowerup.color,
                      width: `${Math.max(0, Math.min(100, (frame.powerupTimeLeft / activePowerup.maxTime) * 100))}%`,
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Interactive Battle Arena with PanResponder */}
          <View
            {...panResponder.panHandlers}
            style={[
              localStyles.arena,
              { width: arenaWidth, height: arenaHeight },
            ]}
          >
            {/* Background Grid Stars */}
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
              <View style={[localStyles.bgStar, { top: 40, left: 50 }]} />
              <View style={[localStyles.bgStar, { top: 120, right: 60 }]} />
              <View style={[localStyles.bgStar, { top: 240, left: 80 }]} />
              <View style={[localStyles.bgStar, { top: 320, right: 90 }]} />
            </View>

            {/* Player Lasers */}
            {frame.bullets.map((b) => (
              <View
                key={b.id}
                pointerEvents="none"
                style={[
                  localStyles.bullet,
                  {
                    left: b.x,
                    top: b.y,
                    width: b.w || 4,
                    height: b.h || 13,
                    backgroundColor: b.color || COLORS.cyan,
                    shadowColor: b.color || COLORS.cyan,
                  },
                  b.isMega && localStyles.megaBullet,
                ]}
              />
            ))}

            {/* Enemy Lasers */}
            {frame.enemyBullets.map((eb) => (
              <View
                key={eb.id}
                pointerEvents="none"
                style={[
                  localStyles.enemyBullet,
                  {
                    left: eb.x,
                    top: eb.y,
                    width: eb.w || 5,
                    height: eb.h || 12,
                    backgroundColor: eb.color || '#FF0055',
                    shadowColor: eb.color || '#FF0055',
                  },
                ]}
              />
            ))}

            {/* Dropping Power-up Pickups */}
            {frame.powerups.map((pu) => (
              <View
                key={pu.id}
                pointerEvents="none"
                style={[
                  localStyles.powerupPill,
                  {
                    left: pu.x,
                    top: pu.y,
                    borderColor: pu.data.color,
                    shadowColor: pu.data.color,
                  },
                ]}
              >
                <Text style={localStyles.powerupIconText}>{pu.data.label}</Text>
              </View>
            ))}

            {/* Alien Neon Enemies (Drones, Divers, Cruisers) */}
            {frame.enemies.map((en) => (
              <View
                key={en.id}
                pointerEvents="none"
                style={[
                  localStyles.enemyBox,
                  {
                    left: en.x,
                    top: en.y,
                    width: en.w,
                    height: en.h,
                    borderColor: en.color,
                  },
                ]}
              >
                {/* Armored Mini Health Bar */}
                {en.maxHp && en.maxHp > 1 && (
                  <View style={localStyles.healthBarTrack}>
                    <View
                      style={[
                        localStyles.healthBarFill,
                        {
                          width: `${Math.max(0, (en.hp / en.maxHp) * 100)}%`,
                          backgroundColor:
                            en.hp / en.maxHp > 0.5
                              ? '#39FF14'
                              : en.hp / en.maxHp > 0.25
                              ? '#FFD166'
                              : '#FF0055',
                        },
                      ]}
                    />
                  </View>
                )}

                {en.type === 'TURRET' ? (
                  <Svg width={en.w} height={en.h} viewBox="0 0 48 36">
                    {/* Armored Octagonal Fortress Base */}
                    <Polygon
                      points="12,0 36,0 48,10 48,26 36,36 12,36 0,26 0,10"
                      fill={en.hitFlash > 0 ? '#FFFFFF' : '#1A0E2E'}
                      stroke={en.hitFlash > 0 ? '#FFE600' : '#00F5FF'}
                      strokeWidth="2.2"
                    />
                    {/* Left Autocannon Barrel */}
                    <Rect x="6" y="22" width="6" height="12" fill="#FFE600" stroke="#FFFFFF" strokeWidth="1" />
                    {/* Right Autocannon Barrel */}
                    <Rect x="36" y="22" width="6" height="12" fill="#FFE600" stroke="#FFFFFF" strokeWidth="1" />
                    {/* Rotating Turret Dome */}
                    <Circle cx="24" cy="18" r="9" fill="#0C152B" stroke="#00F5FF" strokeWidth="1.8" />
                    {/* Targeting Eye */}
                    <Circle cx="24" cy="18" r="4.5" fill="#FF0055" />
                    <Circle cx="24" cy="18" r="1.8" fill="#FFFFFF" />
                  </Svg>
                ) : en.type === 'CRUISER' ? (
                  <Svg width={en.w} height={en.h} viewBox="0 0 42 28">
                    <Polygon
                      points="21,0 42,12 36,28 6,28 0,12"
                      fill={en.hitFlash > 0 ? '#FFFFFF' : '#240722'}
                      stroke={en.hitFlash > 0 ? '#FFE600' : '#FF0055'}
                      strokeWidth="2"
                    />
                    <Circle cx="21" cy="14" r="4" fill="#FF0055" />
                    <Rect x="8" y="24" width="4" height="4" fill="#FF5E00" />
                    <Rect x="30" y="24" width="4" height="4" fill="#FF5E00" />
                  </Svg>
                ) : en.type === 'DIVER' ? (
                  <Svg width={en.w} height={en.h} viewBox="0 0 26 26">
                    <Polygon points="13,26 0,0 13,8 26,0" fill="#FFD166" stroke="#FFFFFF" strokeWidth="1.5" />
                  </Svg>
                ) : (
                  <Svg width={en.w} height={en.h} viewBox="0 0 30 22">
                    <Polygon points="15,22 0,4 6,0 15,10 24,0 30,4" fill={en.color} stroke="#FFFFFF" strokeWidth="1.2" />
                  </Svg>
                )}
              </View>
            ))}

            {/* In-Arena Enemy & Starfighter Blast Explosions */}
            {frame.explosions && frame.explosions.map((ex) => (
              <View
                key={ex.id}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: ex.x - ex.size / 2,
                  top: ex.y - ex.size / 2,
                  width: ex.size,
                  height: ex.size,
                  borderRadius: ex.size / 2,
                  backgroundColor: ex.color,
                  opacity: ex.opacity,
                  shadowColor: ex.color,
                  shadowOffset: { width: 0, height: 0 },
                  shadowRadius: 6,
                  shadowOpacity: 0.95,
                  elevation: 4,
                }}
              />
            ))}

            {/* Player Starfighter */}
            <View
              pointerEvents="none"
              style={[
                localStyles.shipWrapper,
                {
                  left: frame.shipX,
                  top: shipY,
                  width: shipW,
                  height: shipH,
                },
              ]}
            >
              {/* Energy Shield Bubble */}
              {frame.hasShield && (
                <View style={localStyles.shieldBubble} />
              )}

              {/* High-Tech Vector Jet */}
              <Svg width={shipW} height={shipH} viewBox="0 0 48 34">
                <Defs>
                  <SvgLinearGradient id="shipGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#FFFFFF" />
                    <Stop offset="50%" stopColor="#00F5FF" />
                    <Stop offset="100%" stopColor="#0055D4" />
                  </SvgLinearGradient>
                </Defs>
                {/* Main Hull */}
                <Polygon points="24,0 36,22 48,28 32,32 24,28 16,32 0,28 12,22" fill="url(#shipGrad)" stroke="#FFFFFF" strokeWidth="1.5" />
                {/* Cockpit Canopy */}
                <Polygon points="24,6 28,16 20,16" fill="#00F5D4" />
                {/* Twin Thruster Flames */}
                <Rect x="18" y="29" width="3" height="5" fill="#FF9E00" />
                <Rect x="27" y="29" width="3" height="5" fill="#FF9E00" />
              </Svg>
            </View>

          </View>

          <Text style={localStyles.hint}>
            DRAG ANYWHERE TO PILOT JET // DODGE LASERS // COLLECT 3X & MEGA POWERUPS
          </Text>
        </View>

        <GameResultModal
          visible={status === 'GAME_OVER'}
          type="GAME_OVER"
          title="SECTOR BREACHED!"
          subtitle="STARFIGHTER HULL INTEGRITY LOST"
          score={score}
          bestScore={bestScore}
          accentColor="#00F5FF"
          onRetry={resetGame}
          retryLabel="SCRAMBLE FIGHTER"
          onBackToHub={onBackToHub}
        />
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
  powerupHudBanner: {
    width: '90%',
    backgroundColor: 'rgba(8, 6, 24, 0.88)',
    borderRadius: 12,
    borderWidth: 1.2,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 8,
  },
  powerupHudTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  powerupHudText: {
    fontFamily: monoFont,
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  powerupTimerText: {
    fontFamily: monoFont,
    fontSize: 10.5,
    fontWeight: '900',
  },
  powerupGaugeTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  powerupGaugeFill: {
    height: '100%',
    borderRadius: 2,
  },
  arena: {
    backgroundColor: 'rgba(4, 5, 16, 0.96)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 245, 255, 0.45)',
    position: 'relative',
    overflow: 'hidden',
  },
  bgStar: {
    position: 'absolute',
    width: 2.5,
    height: 2.5,
    borderRadius: 1.25,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  bullet: {
    position: 'absolute',
    borderRadius: 2.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 2,
  },
  megaBullet: {
    borderRadius: 8,
    shadowRadius: 10,
    shadowOpacity: 1,
    elevation: 4,
  },
  enemyBullet: {
    position: 'absolute',
    borderRadius: 2.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
  },
  enemyBox: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthBarTrack: {
    position: 'absolute',
    top: -7,
    left: 2,
    right: 2,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 2,
    borderWidth: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    overflow: 'hidden',
  },
  healthBarFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  powerupPill: {
    position: 'absolute',
    backgroundColor: 'rgba(8, 8, 26, 0.92)',
    borderRadius: 8,
    borderWidth: 1.4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 6,
    elevation: 3,
  },
  powerupIconText: {
    fontFamily: monoFont,
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  shipWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldBubble: {
    position: 'absolute',
    width: 58,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#00F5D4',
    backgroundColor: 'rgba(0, 245, 212, 0.16)',
    shadowColor: '#00F5D4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 3, 12, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  overTitle: {
    fontSize: 24,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.magenta,
  },
  overScore: {
    fontSize: 13,
    fontFamily: monoFont,
    fontWeight: '800',
    color: COLORS.solarGold,
    letterSpacing: 1,
  },
  retryBtn: {
    backgroundColor: COLORS.cyan,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: COLORS.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
  },
  retryText: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#030308',
  },
  hint: {
    fontSize: 9,
    fontFamily: monoFont,
    fontWeight: '800',
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});
