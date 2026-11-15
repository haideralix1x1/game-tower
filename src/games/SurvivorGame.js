import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  Platform,
  Modal,
} from 'react-native';
import Svg, {
  Path,
  Rect,
  Circle,
  G,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import MiniGameHeader from '../components/MiniGameHeader';
import GameResultModal from '../components/GameResultModal';
import JuiceEngine from '../components/JuiceEngine';
import {
  playTapSound,
  playSliceSound,
  playPerfectSound,
  playGameOverSound,
} from '../utils/sound';
import {
  triggerLightHaptic,
  triggerMediumHaptic,
  triggerHeavyHaptic,
  triggerPerfectHaptic,
  triggerGameOverHaptic,
} from '../utils/haptics';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const STORAGE_BEST_KEY = '@game_tower:best_survivor_v1';
const ARENA_WIDTH = 400;
const ARENA_HEIGHT = 620;

// Upgrades Pool for 3-Card Rogue-Lite Selection
const ALL_UPGRADES = [
  {
    id: 'plasma_speed',
    name: 'RAPID PLASMA',
    desc: '+30% Plasma firing rate and velocity',
    icon: '⚡',
    color: '#00F5FF',
  },
  {
    id: 'plasma_count',
    name: 'MULTI BLASTER',
    desc: 'Fire +1 additional plasma projectile',
    icon: '🔥',
    color: '#FF0055',
  },
  {
    id: 'orbital_blade',
    name: 'ORBITAL BLADE',
    desc: 'Summon an additional energy blade orbiting around you',
    icon: '🌀',
    color: '#00F5D4',
  },
  {
    id: 'orbital_speed',
    name: 'CYCLONE SPIN',
    desc: '+35% blade rotation speed and +25% contact damage',
    icon: '💫',
    color: '#7928CA',
  },
  {
    id: 'tesla_coil',
    name: 'TESLA SURGE',
    desc: 'Chain lightning strikes 2 additional random enemies',
    icon: '🌩️',
    color: '#FFE600',
  },
  {
    id: 'magnet_boost',
    name: 'QUANTUM MAGNET',
    desc: '+75% XP gem vacuum attraction radius',
    icon: '🧲',
    color: '#38BDF8',
  },
  {
    id: 'nanite_armor',
    name: 'NANO SHIELD',
    desc: '+35 Max HP and immediately restore 40 HP',
    icon: '🛡️',
    color: '#F59E0B',
  },
];

export default function SurvivorGame({
  onBackToHub,
  onScoreUpdate,
  isPaused = false,
}) {
  const isPausedRef = useRef(isPaused);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const { width, height } = useWindowDimensions();
  const arenaScale = Math.min(
    (width - 24) / ARENA_WIDTH,
    (height - 180) / ARENA_HEIGHT,
    1.08
  );

  const juiceRef = useRef(null);

  // High score
  const [highScore, setHighScore] = useState(0);
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

  // Game UI States
  const [score, setScore] = useState(0);
  const [kills, setKills] = useState(0);
  const [playerLvl, setPlayerLvl] = useState(1);
  const [xp, setXp] = useState(0);
  const [xpToNextLvl, setXpToNextLvl] = useState(10);
  const [playerHp, setPlayerHp] = useState(100);
  const [maxHp, setMaxHp] = useState(100);
  const [survivalSecs, setSurvivalSecs] = useState(0);
  const [levelUpChoices, setLevelUpChoices] = useState([]);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [modalType, setModalType] = useState('GAMEOVER');

  // Direct Drag Tracking State
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({
    touchX: 0,
    touchY: 0,
    playerStartX: ARENA_WIDTH / 2,
    playerStartY: ARENA_HEIGHT / 2,
    active: false,
  });

  // State flags as refs to prevent frame race conditions
  const isLevelUpRef = useRef(false);
  const isGameOverRef = useRef(false);

  // Frame render state for pure, reactive JSX rendering
  const [renderFrame, setRenderFrame] = useState({
    playerX: ARENA_WIDTH / 2,
    playerY: ARENA_HEIGHT / 2,
    playerRadius: 15,
    isInvuln: false,
    bullets: [],
    enemies: [],
    gems: [],
    zaps: [],
    bladesCount: 1,
    bladeAngle: 0,
    bladeRadius: 48,
  });

  // Physics simulation refs
  const animFrameRef = useRef(null);
  const lastTimeRef = useRef(0);

  const playerRef = useRef({
    x: ARENA_WIDTH / 2,
    y: ARENA_HEIGHT / 2,
    vx: 0,
    vy: 0,
    radius: 15,
    speed: 3.5,
    hp: 100,
    maxHp: 100,
    level: 1,
    xp: 0,
    xpNeeded: 10,
    magnetRadius: 80,
    invulnTimer: 0,
  });

  const weaponsRef = useRef({
    plasmaRate: 40,
    plasmaTimer: 0,
    plasmaCount: 1,
    plasmaSpeed: 9.8,
    plasmaDmg: 25,

    bladesCount: 1,
    bladeAngle: 0,
    bladeSpeed: 0.052,
    bladeRadius: 50,
    bladeDmg: 20,

    teslaInterval: 85,
    teslaTimer: 0,
    teslaTargets: 2,
    teslaDmg: 40,
  });

  const bulletsRef = useRef([]);
  const enemiesRef = useRef([]);
  const gemsRef = useRef([]);
  const lightningZapsRef = useRef([]);

  const statsRef = useRef({
    kills: 0,
    score: 0,
    timerSecs: 0,
    spawnTimer: 0,
    bossSpawned60: false,
  });

  // Present 3-Card Rogue-Lite Selection safely
  const triggerLevelUp = useCallback(() => {
    isLevelUpRef.current = true;
    try {
      playPerfectSound();
      triggerPerfectHaptic(2);
    } catch {}

    if (juiceRef.current) {
      try {
        juiceRef.current.celebrate('LEVEL UP!', `REACHED LEVEL ${playerRef.current.level}!`, '#00F5FF');
      } catch {}
    }

    // Pick 3 random unique upgrades
    const shuffled = [...ALL_UPGRADES].sort(() => Math.random() - 0.5);
    setLevelUpChoices(shuffled.slice(0, 3));
    setShowLevelUpModal(true);
  }, []);

  // Apply chosen upgrade and safely resume
  const handleSelectUpgrade = (upgrade) => {
    try {
      playTapSound();
      triggerMediumHaptic();
    } catch {}

    const w = weaponsRef.current;
    const p = playerRef.current;

    switch (upgrade.id) {
      case 'plasma_speed':
        w.plasmaRate = Math.max(16, Math.floor(w.plasmaRate * 0.76));
        w.plasmaSpeed *= 1.25;
        break;
      case 'plasma_count':
        w.plasmaCount += 1;
        break;
      case 'orbital_blade':
        w.bladesCount += 1;
        w.bladeRadius += 6;
        break;
      case 'orbital_speed':
        w.bladeSpeed *= 1.35;
        w.bladeDmg = Math.floor(w.bladeDmg * 1.25);
        break;
      case 'tesla_coil':
        w.teslaTargets += 2;
        w.teslaInterval = Math.max(38, Math.floor(w.teslaInterval * 0.8));
        break;
      case 'magnet_boost':
        p.magnetRadius = Math.floor(p.magnetRadius * 1.75);
        break;
      case 'nanite_armor':
        p.maxHp += 35;
        p.hp = Math.min(p.maxHp, p.hp + 40);
        setMaxHp(p.maxHp);
        setPlayerHp(p.hp);
        break;
    }

    lastTimeRef.current = 0;
    setShowLevelUpModal(false);
    isLevelUpRef.current = false;
  };

  // Main 60 FPS Game Loop
  useEffect(() => {
    let active = true;

    const gameLoop = (timestamp) => {
      if (!active) return;

      if (!isPausedRef.current && !isLevelUpRef.current && !isGameOverRef.current) {
        if (!lastTimeRef.current) lastTimeRef.current = timestamp;
        const delta = Math.min((timestamp - lastTimeRef.current) / 1000, 0.08);
        lastTimeRef.current = timestamp;

        const p = playerRef.current;
        const w = weaponsRef.current;
        const st = statsRef.current;

        // 1. Survival Timer Update
        st.timerSecs += delta;
        const secInt = Math.floor(st.timerSecs);
        setSurvivalSecs((prev) => (prev !== secInt ? secInt : prev));

        // 2. Invulnerability frames
        if (p.invulnTimer > 0) p.invulnTimer -= 1;

        // 3. Weapons: Orbital Blades Rotation
        w.bladeAngle = (w.bladeAngle + w.bladeSpeed) % (Math.PI * 2);

        // 4. Weapons: Auto-Firing Plasma Blaster
        w.plasmaTimer += 1;
        if (w.plasmaTimer >= w.plasmaRate && enemiesRef.current.length > 0) {
          w.plasmaTimer = 0;

          // Find closest enemy
          let nearest = null;
          let nearestDist = Infinity;
          for (const enemy of enemiesRef.current) {
            const d = Math.hypot(enemy.x - p.x, enemy.y - p.y);
            if (d < nearestDist) {
              nearestDist = d;
              nearest = enemy;
            }
          }

          if (nearest) {
            const angle = Math.atan2(nearest.y - p.y, nearest.x - p.x);
            const spreadStep = 0.15;
            const startAngle = angle - ((w.plasmaCount - 1) * spreadStep) / 2;

            for (let i = 0; i < w.plasmaCount; i++) {
              const curAngle = startAngle + i * spreadStep;
              bulletsRef.current.push({
                x: p.x,
                y: p.y,
                vx: Math.cos(curAngle) * w.plasmaSpeed,
                vy: Math.sin(curAngle) * w.plasmaSpeed,
                radius: 4,
                dmg: w.plasmaDmg,
                life: 90,
              });
            }
            try {
              playSliceSound();
            } catch {}
          }
        }

        // 5. Weapons: Tesla Lightning Strike
        w.teslaTimer += 1;
        if (w.teslaTimer >= w.teslaInterval && enemiesRef.current.length > 0) {
          w.teslaTimer = 0;
          const targets = [...enemiesRef.current]
            .sort(() => Math.random() - 0.5)
            .slice(0, w.teslaTargets);

          const zaps = [];
          for (const target of targets) {
            target.hp -= w.teslaDmg;
            zaps.push({
              x1: p.x,
              y1: p.y,
              x2: target.x,
              y2: target.y,
              cx: (p.x + target.x) / 2 + (Math.random() - 0.5) * 30,
              cy: (p.y + target.y) / 2 + (Math.random() - 0.5) * 30,
              life: 6,
            });
          }
          lightningZapsRef.current = zaps;
          try {
            triggerLightHaptic();
          } catch {}
        } else if (lightningZapsRef.current.length > 0) {
          lightningZapsRef.current = lightningZapsRef.current
            .map((z) => ({ ...z, life: z.life - 1 }))
            .filter((z) => z.life > 0);
        }

        // 6. Enemy Spawning Wave System
        st.spawnTimer += 1;
        const spawnInterval = Math.max(20, 60 - Math.floor(st.timerSecs * 0.45));
        if (st.spawnTimer >= spawnInterval) {
          st.spawnTimer = 0;

          // Spawn from outer edges
          const edge = Math.floor(Math.random() * 4);
          let sx = 0,
            sy = 0;
          if (edge === 0) {
            sx = Math.random() * ARENA_WIDTH;
            sy = -16;
          } else if (edge === 1) {
            sx = ARENA_WIDTH + 16;
            sy = Math.random() * ARENA_HEIGHT;
          } else if (edge === 2) {
            sx = Math.random() * ARENA_WIDTH;
            sy = ARENA_HEIGHT + 16;
          } else {
            sx = -16;
            sy = Math.random() * ARENA_HEIGHT;
          }

          const isBrute = st.timerSecs > 40 && Math.random() < 0.22;
          enemiesRef.current.push({
            id: `en_${Date.now()}_${Math.random()}`,
            x: sx,
            y: sy,
            radius: isBrute ? 18 : 11,
            hp: isBrute ? 95 : 20 + Math.floor(st.timerSecs * 0.6),
            maxHp: isBrute ? 95 : 20 + Math.floor(st.timerSecs * 0.6),
            speed: isBrute ? 1.05 : 1.6 + Math.min(1.2, st.timerSecs * 0.015),
            color: isBrute ? '#FF0055' : '#7928CA',
            isBoss: false,
          });
        }

        // 60-Second Elite Boss
        if (st.timerSecs >= 60 && !st.bossSpawned60) {
          st.bossSpawned60 = true;
          enemiesRef.current.push({
            id: 'boss_60',
            x: ARENA_WIDTH / 2,
            y: -30,
            radius: 28,
            hp: 600,
            maxHp: 600,
            speed: 1.25,
            color: '#FF0055',
            isBoss: true,
            name: 'TITAN BOSS',
          });
          if (juiceRef.current) {
            try {
              juiceRef.current.shake(12, 8);
              juiceRef.current.popup('⚠️ BOSS INCOMING!', 'TITAN ENEMY SPAWNED', '#FF0055');
            } catch {}
          }
          try {
            triggerHeavyHaptic();
          } catch {}
        }

        // 7. Update Bullets & Bullet-Enemy Collisions
        const nextBullets = [];
        for (const b of bulletsRef.current) {
          b.x += b.vx;
          b.y += b.vy;
          b.life -= 1;

          let hit = false;
          for (const e of enemiesRef.current) {
            const dist = Math.hypot(e.x - b.x, e.y - b.y);
            if (dist < e.radius + b.radius) {
              e.hp -= b.dmg;
              hit = true;
              break;
            }
          }

          if (!hit && b.life > 0 && b.x >= 0 && b.x <= ARENA_WIDTH && b.y >= 0 && b.y <= ARENA_HEIGHT) {
            nextBullets.push(b);
          }
        }
        bulletsRef.current = nextBullets;

        // 8. Update Orbital Blades Collisions
        const bladeCount = w.bladesCount;
        for (let i = 0; i < bladeCount; i++) {
          const bAngle = w.bladeAngle + (i * Math.PI * 2) / bladeCount;
          const bx = p.x + Math.cos(bAngle) * w.bladeRadius;
          const by = p.y + Math.sin(bAngle) * w.bladeRadius;

          for (const e of enemiesRef.current) {
            const dist = Math.hypot(e.x - bx, e.y - by);
            if (dist < e.radius + 12) {
              e.hp -= w.bladeDmg * 0.12;
            }
          }
        }

        // 9. Update Enemies & Player Contact
        const nextEnemies = [];
        for (const e of enemiesRef.current) {
          const angle = Math.atan2(p.y - e.y, p.x - e.x);
          e.x += Math.cos(angle) * e.speed;
          e.y += Math.sin(angle) * e.speed;

          // Check player collision
          const distToPlayer = Math.hypot(p.x - e.x, p.y - e.y);
          if (distToPlayer < p.radius + e.radius && p.invulnTimer <= 0) {
            const dmg = e.isBoss ? 28 : 12;
            p.hp = Math.max(0, p.hp - dmg);
            p.invulnTimer = 35;
            setPlayerHp(p.hp);
            try {
              triggerHeavyHaptic();
            } catch {}
            if (juiceRef.current) {
              try {
                juiceRef.current.shake(10, 6);
              } catch {}
            }

            if (p.hp <= 0) {
              isGameOverRef.current = true;
              try {
                playGameOverSound();
                triggerGameOverHaptic();
              } catch {}
              setModalType('GAMEOVER');
              setResultModalVisible(true);
              return;
            }
          }

          // Enemy Death Check
          if (e.hp <= 0) {
            st.kills += 1;
            const pts = e.isBoss ? 1500 : 50;
            st.score += pts;
            setKills(st.kills);
            setScore(st.score);
            try {
              onScoreUpdate?.(st.score);
            } catch {}

            if (st.score > highScore) {
              setHighScore(st.score);
              AsyncStorage.setItem(STORAGE_BEST_KEY, String(st.score)).catch(() => {});
            }

            // Drop XP Energy Gems
            const gemCount = e.isBoss ? 12 : 1;
            for (let g = 0; g < gemCount; g++) {
              gemsRef.current.push({
                id: `gem_${Date.now()}_${Math.random()}`,
                x: e.x + (Math.random() - 0.5) * (e.isBoss ? 30 : 8),
                y: e.y + (Math.random() - 0.5) * (e.isBoss ? 30 : 8),
                value: e.isBoss ? 8 : 1,
              });
            }
          } else {
            nextEnemies.push(e);
          }
        }
        enemiesRef.current = nextEnemies;

        // 10. Vacuum & Collect XP Gems (Atomic Level Up Guard)
        const nextGems = [];
        let didLevelUp = false;

        for (const gem of gemsRef.current) {
          const dist = Math.hypot(p.x - gem.x, p.y - gem.y);

          if (dist < p.magnetRadius) {
            const angle = Math.atan2(p.y - gem.y, p.x - gem.x);
            const speed = 8 + (1 - dist / p.magnetRadius) * 6;
            gem.x += Math.cos(angle) * speed;
            gem.y += Math.sin(angle) * speed;
          }

          if (dist < p.radius + 8) {
            p.xp += gem.value;
            try {
              triggerLightHaptic();
            } catch {}

            if (!didLevelUp && p.xp >= p.xpNeeded) {
              p.xp -= p.xpNeeded;
              p.level += 1;
              p.xpNeeded = Math.floor(p.xpNeeded * 1.55);
              setPlayerLvl(p.level);
              setXpToNextLvl(p.xpNeeded);
              didLevelUp = true;
            }
            setXp(p.xp);
          } else {
            nextGems.push(gem);
          }
        }
        gemsRef.current = nextGems;

        if (didLevelUp) {
          triggerLevelUp();
        }

        // Sync React render frame
        setRenderFrame({
          playerX: p.x,
          playerY: p.y,
          playerRadius: p.radius,
          isInvuln: p.invulnTimer > 0,
          bullets: [...bulletsRef.current],
          enemies: [...enemiesRef.current],
          gems: [...gemsRef.current],
          zaps: [...lightningZapsRef.current],
          bladesCount: w.bladesCount,
          bladeAngle: w.bladeAngle,
          bladeRadius: w.bladeRadius,
        });
      }

      animFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [triggerLevelUp, highScore, onScoreUpdate]);

  // Restart Game
  const handleRestart = () => {
    isLevelUpRef.current = false;
    isGameOverRef.current = false;

    playerRef.current = {
      x: ARENA_WIDTH / 2,
      y: ARENA_HEIGHT / 2,
      vx: 0,
      vy: 0,
      radius: 15,
      speed: 3.5,
      hp: 100,
      maxHp: 100,
      level: 1,
      xp: 0,
      xpNeeded: 10,
      magnetRadius: 80,
      invulnTimer: 0,
    };
    weaponsRef.current = {
      plasmaRate: 40,
      plasmaTimer: 0,
      plasmaCount: 1,
      plasmaSpeed: 9.8,
      plasmaDmg: 25,
      bladesCount: 1,
      bladeAngle: 0,
      bladeSpeed: 0.052,
      bladeRadius: 50,
      bladeDmg: 20,
      teslaInterval: 85,
      teslaTimer: 0,
      teslaTargets: 2,
      teslaDmg: 40,
    };
    bulletsRef.current = [];
    enemiesRef.current = [];
    gemsRef.current = [];
    lightningZapsRef.current = [];
    statsRef.current = {
      kills: 0,
      score: 0,
      timerSecs: 0,
      spawnTimer: 0,
      bossSpawned60: false,
    };

    setScore(0);
    setKills(0);
    setPlayerLvl(1);
    setXp(0);
    setXpToNextLvl(10);
    setPlayerHp(100);
    setMaxHp(100);
    setSurvivalSecs(0);
    setShowLevelUpModal(false);
    setResultModalVisible(false);
    lastTimeRef.current = 0;
  };

  // Draggable Player Touch Handlers ("LIKE I CAN SIMPLY DRAG THE PLAYER")
  const handleTouchStart = (e) => {
    if (isLevelUpRef.current || isGameOverRef.current) return;
    const { locationX, locationY } = e.nativeEvent;
    const p = playerRef.current;

    dragRef.current = {
      touchX: locationX,
      touchY: locationY,
      playerStartX: p.x,
      playerStartY: p.y,
      active: true,
    };
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!dragRef.current.active || isLevelUpRef.current || isGameOverRef.current) return;
    const { locationX, locationY } = e.nativeEvent;
    const p = playerRef.current;

    const dx = locationX - dragRef.current.touchX;
    const dy = locationY - dragRef.current.touchY;

    // Directly update player position relative to touch drag
    p.x = Math.max(p.radius, Math.min(ARENA_WIDTH - p.radius, dragRef.current.playerStartX + dx));
    p.y = Math.max(p.radius, Math.min(ARENA_HEIGHT - p.radius, dragRef.current.playerStartY + dy));
  };

  const handleTouchEnd = () => {
    dragRef.current.active = false;
    setIsDragging(false);
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={styles.container}>
        {/* Hub MiniGameHeader without CYBER in title */}
        <MiniGameHeader
          floorNum={10}
          gameTitle="SURVIVOR"
          category="ROGUELITE SWARM"
          accentColor="#00F5FF"
          score={score}
          highScore={highScore}
          onBack={onBackToHub}
          onBackToHub={onBackToHub}
        />

        {/* Top Status & XP HUD */}
        <View style={styles.topHud}>
          {/* Level Badge & XP Bar */}
          <View style={styles.xpRow}>
            <View style={styles.lvlBadge}>
              <Text style={styles.lvlBadgeText}>LV.{playerLvl}</Text>
            </View>
            <View style={styles.xpTrack}>
              <View
                style={[
                  styles.xpFill,
                  { width: `${Math.min(100, (xp / xpToNextLvl) * 100)}%` },
                ]}
              />
            </View>
          </View>

          {/* HP Bar, Timer & Kills */}
          <View style={styles.statsRow}>
            {/* HP Bar */}
            <View style={styles.hpContainer}>
              <Text style={styles.statLabel}>HP</Text>
              <View style={styles.hpTrack}>
                <View
                  style={[
                    styles.hpFill,
                    {
                      width: `${Math.max(0, Math.min(100, (playerHp / maxHp) * 100))}%`,
                      backgroundColor: playerHp > 40 ? '#10B981' : '#EF4444',
                    },
                  ]}
                />
              </View>
              <Text style={styles.hpValText}>
                {playerHp}/{maxHp}
              </Text>
            </View>

            {/* Timer */}
            <View style={styles.timerBadge}>
              <Text style={styles.timerText}>⏱️ {formatTimer(survivalSecs)}</Text>
            </View>

            {/* Kills */}
            <View style={styles.killsBadge}>
              <Text style={styles.killsText}>💀 {kills}</Text>
            </View>
          </View>
        </View>

        {/* Scaled Arena with 60 FPS SVG rendering */}
        <View style={styles.arenaWrapper}>
          <View
            style={[
              styles.arena,
              {
                width: ARENA_WIDTH,
                height: ARENA_HEIGHT,
                transform: [{ scale: arenaScale }],
              },
            ]}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <Svg width={ARENA_WIDTH} height={ARENA_HEIGHT} style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id="arenaBg" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#0B0F19" />
                  <Stop offset="100%" stopColor="#050811" />
                </LinearGradient>
                <LinearGradient id="heroGlow" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor="#00F5FF" />
                  <Stop offset="100%" stopColor="#0070F3" />
                </LinearGradient>
              </Defs>

              {/* Arena Grid Background */}
              <Rect width={ARENA_WIDTH} height={ARENA_HEIGHT} fill="url(#arenaBg)" rx={14} />

              {/* Subtle Grid Coordinates */}
              {Array.from({ length: 9 }).map((_, i) => (
                <Path
                  key={`gx_${i}`}
                  d={`M ${(i + 1) * 40} 0 L ${(i + 1) * 40} ${ARENA_HEIGHT}`}
                  stroke="rgba(0, 245, 255, 0.05)"
                  strokeWidth={1}
                />
              ))}
              {Array.from({ length: 14 }).map((_, i) => (
                <Path
                  key={`gy_${i}`}
                  d={`M 0 ${(i + 1) * 44} L ${ARENA_WIDTH} ${(i + 1) * 44}`}
                  stroke="rgba(0, 245, 255, 0.05)"
                  strokeWidth={1}
                />
              ))}

              {/* XP Energy Gems */}
              {renderFrame.gems.map((gem) => (
                <G key={gem.id}>
                  <Circle
                    cx={gem.x}
                    cy={gem.y}
                    r={gem.value > 1 ? 5.5 : 3.5}
                    fill={gem.value > 1 ? '#FFE600' : '#00F5FF'}
                  />
                  <Circle
                    cx={gem.x}
                    cy={gem.y}
                    r={gem.value > 1 ? 8.5 : 5.5}
                    stroke={gem.value > 1 ? '#FFE600' : '#00F5FF'}
                    strokeWidth={1}
                    opacity={0.4}
                  />
                </G>
              ))}

              {/* Enemies */}
              {renderFrame.enemies.map((en) => (
                <G key={en.id}>
                  {/* Enemy Body */}
                  <Circle
                    cx={en.x}
                    cy={en.y}
                    r={en.radius}
                    fill={en.color}
                    stroke="#FFFFFF"
                    strokeWidth={en.isBoss ? 2 : 1}
                  />
                  {/* Boss HP Bar overhead */}
                  {en.isBoss ? (
                    <G>
                      <Rect
                        x={en.x - 30}
                        y={en.y - en.radius - 12}
                        width={60}
                        height={6}
                        fill="rgba(0,0,0,0.7)"
                        rx={3}
                      />
                      <Rect
                        x={en.x - 30}
                        y={en.y - en.radius - 12}
                        width={Math.max(0, 60 * (en.hp / en.maxHp))}
                        height={6}
                        fill="#FF0055"
                        rx={3}
                      />
                    </G>
                  ) : null}
                </G>
              ))}

              {/* Plasma Projectiles */}
              {renderFrame.bullets.map((b, idx) => (
                <Circle
                  key={`bl_${idx}`}
                  cx={b.x}
                  cy={b.y}
                  r={b.radius}
                  fill="#00F5FF"
                  stroke="#FFFFFF"
                  strokeWidth={1}
                />
              ))}

              {/* Tesla Lightning Zaps */}
              {renderFrame.zaps.map((zap, idx) => (
                <Path
                  key={`zap_${idx}`}
                  d={`M ${zap.x1} ${zap.y1} Q ${zap.cx} ${zap.cy} ${zap.x2} ${zap.y2}`}
                  stroke="#FFE600"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
              ))}

              {/* Orbital Blades */}
              {Array.from({ length: renderFrame.bladesCount }).map((_, i) => {
                const bAngle = renderFrame.bladeAngle + (i * Math.PI * 2) / renderFrame.bladesCount;
                const bx = renderFrame.playerX + Math.cos(bAngle) * renderFrame.bladeRadius;
                const by = renderFrame.playerY + Math.sin(bAngle) * renderFrame.bladeRadius;
                return (
                  <G key={`bld_${i}`}>
                    <Circle cx={bx} cy={by} r={7} fill="#00F5D4" stroke="#FFFFFF" strokeWidth={1.5} />
                    <Path
                      d={`M ${renderFrame.playerX} ${renderFrame.playerY} L ${bx} ${by}`}
                      stroke="rgba(0, 245, 212, 0.22)"
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                    />
                  </G>
                );
              })}

              {/* Player Hero Exosuit (Follows Touch Drag Directly) */}
              <G>
                {/* Dragging Active Aura */}
                {isDragging ? (
                  <Circle
                    cx={renderFrame.playerX}
                    cy={renderFrame.playerY}
                    r={renderFrame.playerRadius + 14}
                    stroke="rgba(0, 245, 255, 0.25)"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fill="none"
                  />
                ) : null}
                {/* Invulnerability Flash or Energy Shield */}
                <Circle
                  cx={renderFrame.playerX}
                  cy={renderFrame.playerY}
                  r={renderFrame.playerRadius + 6}
                  stroke={renderFrame.isInvuln ? '#FF0055' : 'rgba(0, 245, 255, 0.45)'}
                  strokeWidth={2}
                  fill="none"
                />
                {/* Player Core */}
                <Circle
                  cx={renderFrame.playerX}
                  cy={renderFrame.playerY}
                  r={renderFrame.playerRadius}
                  fill="url(#heroGlow)"
                  stroke="#FFFFFF"
                  strokeWidth={2}
                />
                {/* Inner reactor dot */}
                <Circle cx={renderFrame.playerX} cy={renderFrame.playerY} r={5} fill="#FFFFFF" />
              </G>
            </Svg>
          </View>
        </View>

        {/* Rogue-Lite 3-Card Level Up Modal */}
        <Modal
          visible={showLevelUpModal}
          transparent
          animationType="fade"
          onRequestClose={() => {}}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>⚡ LEVEL UP! ⚡</Text>
                <Text style={styles.modalSubtitle}>CHOOSE 1 UPGRADE PROTOCOL</Text>
              </View>

              <View style={styles.cardsRow}>
                {levelUpChoices.map((upg) => (
                  <Pressable
                    key={upg.id}
                    style={({ pressed }) => [
                      styles.upgradeCard,
                      { borderColor: upg.color },
                      pressed && styles.upgradeCardPressed,
                    ]}
                    onPress={() => handleSelectUpgrade(upg)}
                  >
                    <Text style={styles.cardIcon}>{upg.icon}</Text>
                    <Text style={[styles.cardTitle, { color: upg.color }]}>
                      {upg.name}
                    </Text>
                    <Text style={styles.cardDesc}>{upg.desc}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </Modal>

        {/* Game Result Modal */}
        <GameResultModal
          visible={resultModalVisible}
          type={modalType}
          title={modalType === 'VICTORY' ? 'SECTOR CLEARED!' : 'SURVIVOR DOWN!'}
          subtitle={`Survived ${formatTimer(survivalSecs)} // Defeated ${kills} Enemies`}
          score={score}
          highScore={highScore}
          onRestart={handleRestart}
          onBackToHub={onBackToHub}
        />
      </View>
    </JuiceEngine>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05070E',
  },
  topHud: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(10, 16, 30, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 245, 255, 0.15)',
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  lvlBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(0, 245, 255, 0.15)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00F5FF',
    marginRight: 8,
  },
  lvlBadgeText: {
    fontFamily: monoFont,
    color: '#00F5FF',
    fontSize: 12,
    fontWeight: '900',
  },
  xpTrack: {
    flex: 1,
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.25)',
  },
  xpFill: {
    height: '100%',
    backgroundColor: '#00F5FF',
    borderRadius: 5,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  statLabel: {
    fontFamily: monoFont,
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: 'bold',
    marginRight: 6,
  },
  hpTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginRight: 6,
  },
  hpFill: {
    height: '100%',
    borderRadius: 4,
  },
  hpValText: {
    fontFamily: monoFont,
    color: '#F8FAFC',
    fontSize: 10,
    fontWeight: '700',
  },
  timerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 6,
    marginRight: 8,
  },
  timerText: {
    fontFamily: monoFont,
    color: '#FFE600',
    fontSize: 12,
    fontWeight: '800',
  },
  killsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(255, 0, 85, 0.12)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 85, 0.35)',
  },
  killsText: {
    fontFamily: monoFont,
    color: '#FF0055',
    fontSize: 12,
    fontWeight: '800',
  },
  arenaWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arena: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 245, 255, 0.35)',
    backgroundColor: '#070A14',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0B1120',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#00F5FF',
    padding: 18,
    alignItems: 'center',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: monoFont,
    color: '#00F5FF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontFamily: monoFont,
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cardsRow: {
    width: '100%',
    gap: 12,
  },
  upgradeCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    alignItems: 'center',
  },
  upgradeCardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  cardIcon: {
    fontSize: 26,
    marginBottom: 6,
  },
  cardTitle: {
    fontFamily: monoFont,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
    textAlign: 'center',
  },
  cardDesc: {
    fontFamily: monoFont,
    color: '#CBD5E1',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
});
