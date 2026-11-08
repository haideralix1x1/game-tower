import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, {
  Rect,
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  RadialGradient as SvgRadialGradient,
  Stop,
  G,
  Line,
  Polygon,
} from 'react-native-svg';
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
  playSliceSound,
  playGameOverSound,
  playSnapTickSound,
} from '../utils/sound';

const STORAGE_KEY = '@game_tower:best_thief_v1';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

// Arena Dimensions
const ARENA_W = 340;
const ARENA_H = 420;

/**
 * Curated Levels with Escalating Guards, Petrol Missions & Rival Thieves
 */
const CURATED_LEVELS = [
  // Level 1: Tutorial Infiltration (3 Floors, 1 Guard, Straight Heist)
  {
    name: 'ROOFTOP VAULT',
    floorsCount: 3,
    requiresPetrol: false,
    hasRival: false,
    stairs: [
      { fromFloor: 0, toFloor: 1, x: 260 }, // Right stair to floor 1
      { fromFloor: 1, toFloor: 2, x: 80 },  // Left stair to floor 2
    ],
    guards: [
      { id: 'g0', floor: 1, minX: 110, maxX: 230, x: 170, dir: 1, speed: 1.1, pauseTimer: 0 },
    ],
    diamond: { floor: 2, x: 250 },
    petrol: null,
    car: { floor: 0, x: 60 },
  },

  // Level 2: Petrol Shortage (3 Floors, 2 Guards, Fuel Needed)
  {
    name: 'FUEL RESERVES',
    floorsCount: 3,
    requiresPetrol: true,
    hasRival: false,
    stairs: [
      { fromFloor: 0, toFloor: 1, x: 70 },
      { fromFloor: 1, toFloor: 2, x: 270 },
    ],
    guards: [
      { id: 'g0', floor: 1, minX: 100, maxX: 240, x: 140, dir: -1, speed: 1.2, pauseTimer: 0 },
      { id: 'g1', floor: 2, minX: 80, maxX: 220, x: 180, dir: 1, speed: 1.3, pauseTimer: 0 },
    ],
    diamond: { floor: 2, x: 70 },
    petrol: { floor: 1, x: 280 }, // Petrol on Floor 1 right side
    car: { floor: 0, x: 280 },
  },

  // Level 3: Rival Heist (4 Floors, 2 Guards, 1 Rival Thief)
  {
    name: 'RIVAL SHADOWS',
    floorsCount: 4,
    requiresPetrol: false,
    hasRival: true,
    stairs: [
      { fromFloor: 0, toFloor: 1, x: 80 },
      { fromFloor: 1, toFloor: 2, x: 260 },
      { fromFloor: 2, toFloor: 3, x: 80 },
    ],
    guards: [
      { id: 'g0', floor: 1, minX: 110, maxX: 230, x: 160, dir: 1, speed: 1.3, pauseTimer: 0 },
      { id: 'g1', floor: 2, minX: 110, maxX: 230, x: 180, dir: -1, speed: 1.4, pauseTimer: 0 },
    ],
    diamond: { floor: 3, x: 260 },
    petrol: null,
    car: { floor: 0, x: 270 },
  },

  // Level 4: Full Lockdown (4 Floors, 3 Guards, Petrol + Rival Thief)
  {
    name: 'GRAND HIGH-RISE',
    floorsCount: 4,
    requiresPetrol: true,
    hasRival: true,
    stairs: [
      { fromFloor: 0, toFloor: 1, x: 260 },
      { fromFloor: 1, toFloor: 2, x: 80 },
      { fromFloor: 2, toFloor: 3, x: 260 },
    ],
    guards: [
      { id: 'g0', floor: 1, minX: 110, maxX: 230, x: 130, dir: 1, speed: 1.4, pauseTimer: 0 },
      { id: 'g1', floor: 2, minX: 110, maxX: 230, x: 200, dir: -1, speed: 1.5, pauseTimer: 0 },
      { id: 'g2', floor: 3, minX: 70, maxX: 190, x: 140, dir: 1, speed: 1.6, pauseTimer: 0 },
    ],
    diamond: { floor: 3, x: 70 },
    petrol: { floor: 1, x: 70 },
    car: { floor: 0, x: 60 },
  },

  // Level 5: Penthouse Apex (5 Floors, 4 Guards, Master Infiltration)
  {
    name: 'PENTHOUSE APEX',
    floorsCount: 5,
    requiresPetrol: true,
    hasRival: true,
    stairs: [
      { fromFloor: 0, toFloor: 1, x: 70 },
      { fromFloor: 1, toFloor: 2, x: 270 },
      { fromFloor: 2, toFloor: 3, x: 70 },
      { fromFloor: 3, toFloor: 4, x: 270 },
    ],
    guards: [
      { id: 'g0', floor: 1, minX: 100, maxX: 240, x: 160, dir: 1, speed: 1.5, pauseTimer: 0 },
      { id: 'g1', floor: 2, minX: 100, maxX: 240, x: 140, dir: -1, speed: 1.6, pauseTimer: 0 },
      { id: 'g2', floor: 3, minX: 100, maxX: 240, x: 200, dir: 1, speed: 1.7, pauseTimer: 0 },
      { id: 'g3', floor: 4, minX: 60, maxX: 180, x: 120, dir: -1, speed: 1.8, pauseTimer: 0 },
    ],
    diamond: { floor: 4, x: 70 },
    petrol: { floor: 2, x: 60 },
    car: { floor: 0, x: 270 },
  },
];

export default function ThiefEscapeGame({
  isPaused = false,
  onBackToHub,
  onScoreUpdate,
}) {
  const juiceRef = useRef(null);

  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [isGameOver, setIsGameOver] = useState(false);
  const [victoryModal, setVictoryModal] = useState(false);

  // Active Level Config
  const levelConfig = CURATED_LEVELS[Math.min(level - 1, CURATED_LEVELS.length - 1)];

  // Floor Height Calculator
  const floorHeight = ARENA_H / (levelConfig.floorsCount + 0.3);
  const getFloorY = useCallback(
    (floorIdx) => ARENA_H - 35 - floorIdx * floorHeight,
    [floorHeight]
  );

  // Player State
  const [player, setPlayer] = useState({
    floor: 0,
    x: levelConfig.car.x + 40,
    isHiding: false,
    hasDiamond: false,
    hasPetrol: !levelConfig.requiresPetrol,
    facing: 1, // 1 = right, -1 = left
  });

  // Guards State
  const [guards, setGuards] = useState(() =>
    levelConfig.guards.map((g) => ({ ...g }))
  );

  // Rival Thief State
  const [rival, setRival] = useState(() => ({
    floor: 0,
    x: levelConfig.car.x + (levelConfig.car.x < 150 ? 140 : -140),
    facing: 1,
    hasDiamond: false,
    isAlive: levelConfig.hasRival,
    stepTimer: 0,
  }));

  // Loot items state
  const [diamondTaken, setDiamondTaken] = useState(false);
  const [petrolTaken, setPetrolTaken] = useState(!levelConfig.requiresPetrol);

  // Input Movement Refs
  const inputDirRef = useRef(0); // -1 = left, 0 = idle, 1 = right
  const isSneakRef = useRef(false);

  const playerRef = useRef(player);
  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  const guardsRef = useRef(guards);
  useEffect(() => {
    guardsRef.current = guards;
  }, [guards]);

  const rivalRef = useRef(rival);
  useEffect(() => {
    rivalRef.current = rival;
  }, [rival]);

  const diamondTakenRef = useRef(diamondTaken);
  useEffect(() => {
    diamondTakenRef.current = diamondTaken;
  }, [diamondTaken]);

  const petrolTakenRef = useRef(petrolTaken);
  useEffect(() => {
    petrolTakenRef.current = petrolTaken;
  }, [petrolTaken]);

  // Load High Score
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((val) => {
        if (val) setHighScore(parseInt(val, 10) || 0);
      })
      .catch(() => {});
  }, []);

  // Initialize Level
  const initLevel = useCallback(
    (lvl) => {
      const cfg = CURATED_LEVELS[Math.min(lvl - 1, CURATED_LEVELS.length - 1)];
      const initialPlayer = {
        floor: 0,
        x: cfg.car.x + (cfg.car.x < 150 ? 50 : -50),
        isHiding: false,
        hasDiamond: false,
        hasPetrol: !cfg.requiresPetrol,
        facing: 1,
      };
      setPlayer(initialPlayer);
      playerRef.current = initialPlayer;

      const initialGuards = cfg.guards.map((g) => ({ ...g }));
      setGuards(initialGuards);
      guardsRef.current = initialGuards;

      const initialRival = {
        floor: 0,
        x: cfg.car.x + (cfg.car.x < 150 ? 140 : -140),
        facing: 1,
        hasDiamond: false,
        isAlive: cfg.hasRival,
        stepTimer: 0,
      };
      setRival(initialRival);
      rivalRef.current = initialRival;

      setDiamondTaken(false);
      diamondTakenRef.current = false;
      setPetrolTaken(!cfg.requiresPetrol);
      petrolTakenRef.current = !cfg.requiresPetrol;

      inputDirRef.current = 0;
      isSneakRef.current = false;
      setIsGameOver(false);
      setVictoryModal(false);
    },
    []
  );

  // Player Caught / Damaged
  const handlePlayerBusted = useCallback(() => {
    triggerGameOverHaptic();
    playGameOverSound();
    juiceRef.current?.shake(10, 10);
    juiceRef.current?.flash(COLORS.danger);

    setLives((l) => {
      const nextLives = l - 1;
      if (nextLives <= 0) {
        setIsGameOver(true);
        juiceRef.current?.popup('🚨 BUSTED!', 'Caught by security', COLORS.danger);
        return 0;
      } else {
        initLevel(level);
        juiceRef.current?.popup('⚠️ DETECTED!', `${nextLives} Lives remaining`, COLORS.solarGold);
        return nextLives;
      }
    });
  }, [initLevel, level]);

  // Main 60 FPS Game Loop
  useEffect(() => {
    if (isPaused || isGameOver || victoryModal) return;

    const interval = setInterval(() => {
      const curPlayer = { ...playerRef.current };
      const curGuards = guardsRef.current.map((g) => ({ ...g }));
      const curRival = { ...rivalRef.current };

      // 1. Update Player Movement along platform
      if (inputDirRef.current !== 0) {
        curPlayer.x += inputDirRef.current * (isSneakRef.current ? 1.4 : 2.6);
        curPlayer.facing = inputDirRef.current;
      }
      curPlayer.x = Math.max(30, Math.min(ARENA_W - 30, curPlayer.x));
      curPlayer.isHiding = isSneakRef.current;

      // 2. Update Guards Patrol
      curGuards.forEach((g) => {
        if (g.pauseTimer > 0) {
          g.pauseTimer -= 1;
        } else {
          g.x += g.dir * g.speed;
          if (g.x >= g.maxX) {
            g.x = g.maxX;
            g.dir = -1;
            g.pauseTimer = 30;
          } else if (g.x <= g.minX) {
            g.x = g.minX;
            g.dir = 1;
            g.pauseTimer = 30;
          }
        }
      });

      // 3. Update Vision Detection against Player
      if (!curPlayer.isHiding) {
        curGuards.forEach((g) => {
          if (g.floor === curPlayer.floor) {
            const dist = curPlayer.x - g.x;
            const inCone = g.dir === 1 ? dist > 0 && dist < 85 : dist < 0 && dist > -85;
            if (inCone) {
              handlePlayerBusted();
            }
          }
        });
      }

      // 4. Update Rival AI Thief
      if (levelConfig.hasRival && curRival.isAlive) {
        const hasD = curRival.hasDiamond;
        const targetFloor = hasD ? 0 : levelConfig.diamond.floor;

        if (curRival.floor < targetFloor) {
          const upStair = levelConfig.stairs.find((s) => s.fromFloor === curRival.floor);
          if (upStair) {
            if (Math.abs(curRival.x - upStair.x) < 5) {
              curRival.floor += 1;
            } else {
              curRival.facing = curRival.x < upStair.x ? 1 : -1;
              curRival.x += curRival.facing * 1.6;
            }
          }
        } else if (curRival.floor > targetFloor) {
          const downStair = levelConfig.stairs.find((s) => s.toFloor === curRival.floor);
          if (downStair) {
            if (Math.abs(curRival.x - downStair.x) < 5) {
              curRival.floor -= 1;
            } else {
              curRival.facing = curRival.x < downStair.x ? 1 : -1;
              curRival.x += curRival.facing * 1.6;
            }
          }
        } else {
          if (!hasD && !diamondTakenRef.current) {
            if (Math.abs(curRival.x - levelConfig.diamond.x) < 8) {
              playSliceSound();
              triggerMediumHaptic();
              juiceRef.current?.popup('⚠️ RIVAL STOLE DIAMOND!', 'Intercept him!', '#FF0055');
              curRival.hasDiamond = true;
              setDiamondTaken(true);
              diamondTakenRef.current = true;
            } else {
              curRival.facing = curRival.x < levelConfig.diamond.x ? 1 : -1;
              curRival.x += curRival.facing * 1.6;
            }
          } else if (hasD) {
            if (curRival.floor === 0 && Math.abs(curRival.x - levelConfig.car.x) < 20) {
              handlePlayerBusted();
            }
          }
        }
      }

      // 5. Check Item Pickups: Diamond
      if (!curPlayer.hasDiamond && !diamondTakenRef.current && curPlayer.floor === levelConfig.diamond.floor) {
        if (Math.abs(curPlayer.x - levelConfig.diamond.x) < 18) {
          curPlayer.hasDiamond = true;
          setDiamondTaken(true);
          diamondTakenRef.current = true;
          triggerPerfectHaptic();
          playPerfectSound();
          juiceRef.current?.burst(levelConfig.diamond.x, getFloorY(curPlayer.floor), '#00F5FF', 24);
          juiceRef.current?.popup('💎 DIAMOND SECURED!', 'Now escape to the car!', '#00F5FF');
        }
      }

      // 6. Check Item Pickups: Petrol
      if (levelConfig.requiresPetrol && !curPlayer.hasPetrol && levelConfig.petrol && curPlayer.floor === levelConfig.petrol.floor) {
        if (Math.abs(curPlayer.x - levelConfig.petrol.x) < 18) {
          curPlayer.hasPetrol = true;
          setPetrolTaken(true);
          petrolTakenRef.current = true;
          triggerSelectionHaptic();
          playTapSound();
          juiceRef.current?.burst(levelConfig.petrol.x, getFloorY(curPlayer.floor), '#FFE600', 16);
          juiceRef.current?.popup('⛽ FUEL CANISTER SECURED!', 'Car fueled up', '#FFE600');
        }
      }

      // 7. Check Stealing Diamond Back from Rival Thief
      if (levelConfig.hasRival && curRival.hasDiamond && curPlayer.floor === curRival.floor) {
        if (Math.abs(curPlayer.x - curRival.x) < 22) {
          curRival.hasDiamond = false;
          curPlayer.hasDiamond = true;
          triggerPerfectHaptic();
          playPerfectSound();
          juiceRef.current?.popup('🥷 TACKLED RIVAL!', 'Diamond reclaimed!', COLORS.matrixMint);
        }
      }

      // 8. Check Escape to Car on Ground Floor
      if (curPlayer.floor === 0 && curPlayer.hasDiamond && curPlayer.hasPetrol) {
        if (Math.abs(curPlayer.x - levelConfig.car.x) < 24) {
          triggerPerfectHaptic();
          playPerfectSound();
          setVictoryModal(true);

          const earned = 500 + level * 250;
          setScore((s) => {
            const nextScore = s + earned;
            if (nextScore > highScore) {
              setHighScore(nextScore);
              AsyncStorage.setItem(STORAGE_KEY, String(nextScore)).catch(() => {});
            }
            onScoreUpdate?.(nextScore);
            return nextScore;
          });

          juiceRef.current?.celebrate('🚗 GETAWAY SUCCESSFUL!', `Level ${level} Cleared! +${earned} PTS`, COLORS.matrixMint);
        }
      }

      // Commit State updates
      setPlayer(curPlayer);
      setGuards(curGuards);
      setRival(curRival);
    }, 20);

    return () => clearInterval(interval);
  }, [isPaused, isGameOver, victoryModal, levelConfig, getFloorY, handlePlayerBusted, level, highScore, onScoreUpdate]);

  // Climb Up / Down Stairs handlers
  const handleClimbUp = () => {
    if (isGameOver || isPaused) return;

    const stair = levelConfig.stairs.find(
      (s) => s.fromFloor === player.floor && Math.abs(player.x - s.x) < 26
    );

    if (stair) {
      setPlayer((p) => ({
        ...p,
        floor: stair.toFloor,
        x: stair.x,
      }));
      playSliceSound();
      triggerLightHaptic();
      juiceRef.current?.popup('▲ ASCENDING', `Floor ${stair.toFloor}`, COLORS.cyan);
    } else {
      triggerLightHaptic();
    }
  };

  const handleClimbDown = () => {
    if (isGameOver || isPaused) return;

    const stair = levelConfig.stairs.find(
      (s) => s.toFloor === player.floor && Math.abs(player.x - s.x) < 26
    );

    if (stair) {
      setPlayer((p) => ({
        ...p,
        floor: stair.fromFloor,
        x: stair.x,
      }));
      playSliceSound();
      triggerLightHaptic();
      juiceRef.current?.popup('▼ DESCENDING', `Floor ${stair.fromFloor}`, COLORS.solarGold);
    } else {
      triggerLightHaptic();
    }
  };

  // Sneak / Hide Toggle
  const handleSneakPressIn = () => {
    isSneakRef.current = true;
    setPlayer((p) => ({ ...p, isHiding: true }));
    triggerSelectionHaptic();
    playSnapTickSound();
  };

  const handleSneakPressOut = () => {
    isSneakRef.current = false;
    setPlayer((p) => ({ ...p, isHiding: false }));
  };

  // Next Level Handler
  const handleNextLevel = () => {
    const nextLvl = level + 1;
    setLevel(nextLvl);
    initLevel(nextLvl);
  };

  // Restart Handler
  const handleRestart = () => {
    setLives(3);
    setScore(0);
    setLevel(1);
    initLevel(1);
  };

  return (
    <View style={styles.container}>
      <MiniGameHeader
        title="THIEF ESCAPE"
        floorLabel="FLOOR 34"
        category="STRATEGY"
        score={score}
        bestScore={highScore}
        accentColor="#00F5FF"
        onBackToHub={onBackToHub}
        onReset={handleRestart}
        disabled={isPaused}
      />

      <JuiceEngine ref={juiceRef}>
        {/* Subheader Status Strip */}
        <View style={styles.statusStrip}>
          <View style={styles.statusBox}>
            <Text style={styles.statusDim}>LIVES</Text>
            <Text style={[styles.statusVal, { color: '#FF0055' }]}>
              {Array.from({ length: lives }).map(() => '♥').join(' ') || '💀'}
            </Text>
          </View>

          <View style={styles.statusBox}>
            <Text style={styles.statusDim}>STAGE</Text>
            <Text style={[styles.statusVal, { color: '#FFE600' }]}>{levelConfig.name}</Text>
          </View>

          <View style={styles.statusBox}>
            <Text style={styles.statusDim}>FUEL</Text>
            <Text style={[styles.statusVal, { color: player.hasPetrol ? COLORS.matrixMint : '#FF0055' }]}>
              {player.hasPetrol ? 'READY ⛽' : 'EMPTY ⚠️'}
            </Text>
          </View>

          <View style={styles.statusBox}>
            <Text style={styles.statusDim}>DIAMOND</Text>
            <Text style={[styles.statusVal, { color: player.hasDiamond ? '#00F5FF' : 'rgba(255,255,255,0.4)' }]}>
              {player.hasDiamond ? 'CARRIED 💎' : 'IN VAULT'}
            </Text>
          </View>
        </View>

        {/* Building Heist Arena */}
        <View style={styles.arenaWrapper}>
          <View style={styles.arenaCard}>
            <Svg width={ARENA_W} height={ARENA_H} style={StyleSheet.absoluteFill}>
              <Defs>
                {/* Midnight Noir Brick Gradient */}
                <SvgLinearGradient id="buildingGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor="#1B1E38" />
                  <Stop offset="60%" stopColor="#0D1022" />
                  <Stop offset="100%" stopColor="#050610" />
                </SvgLinearGradient>

                {/* Guard Flashlight Beam Gradient */}
                <SvgLinearGradient id="beamGradRight" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0%" stopColor="#FFE600" stopOpacity="0.45" />
                  <Stop offset="100%" stopColor="#FFE600" stopOpacity="0.0" />
                </SvgLinearGradient>

                <SvgLinearGradient id="beamGradLeft" x1="1" y1="0" x2="0" y2="0">
                  <Stop offset="0%" stopColor="#FFE600" stopOpacity="0.45" />
                  <Stop offset="100%" stopColor="#FFE600" stopOpacity="0.0" />
                </SvgLinearGradient>

                {/* Vault Glow Gradient */}
                <SvgRadialGradient id="vaultGlow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor="#00F5FF" stopOpacity="0.8" />
                  <Stop offset="100%" stopColor="#00F5FF" stopOpacity="0.0" />
                </SvgRadialGradient>
              </Defs>

              {/* Building Facade Background */}
              <Rect x={10} y={15} width={ARENA_W - 20} height={ARENA_H - 45} rx={12} fill="url(#buildingGrad)" stroke="rgba(0, 245, 255, 0.25)" strokeWidth={2} />

              {/* Building Windows in Noir Comic Style */}
              {Array.from({ length: levelConfig.floorsCount }).map((_, f) => {
                const fy = getFloorY(f);
                return (
                  <G key={`windows_${f}`}>
                    <Rect x={45} y={fy - 48} width={26} height={38} rx={3} fill="#090C1A" stroke="rgba(0, 245, 255, 0.2)" strokeWidth={1.2} />
                    <Rect x={155} y={fy - 48} width={26} height={38} rx={3} fill={f % 2 === 0 ? '#FFE60033' : '#090C1A'} stroke="rgba(0, 245, 255, 0.2)" strokeWidth={1.2} />
                    <Rect x={265} y={fy - 48} width={26} height={38} rx={3} fill="#090C1A" stroke="rgba(0, 245, 255, 0.2)" strokeWidth={1.2} />
                  </G>
                );
              })}

              {/* Fire Escape Metal Catwalks (Floors) */}
              {Array.from({ length: levelConfig.floorsCount }).map((_, f) => {
                const fy = getFloorY(f);
                return (
                  <G key={`floor_${f}`}>
                    <Line x1={20} y1={fy} x2={ARENA_W - 20} y2={fy} stroke="#00F5FF" strokeWidth={3} />
                    <Line x1={20} y1={fy - 12} x2={ARENA_W - 20} y2={fy - 12} stroke="rgba(0, 245, 255, 0.4)" strokeWidth={1.2} strokeDasharray="6 4" />
                  </G>
                );
              })}

              {/* Fire Escape Stairs / Ladders connecting floors */}
              {levelConfig.stairs.map((stair, idx) => {
                const y1 = getFloorY(stair.fromFloor);
                const y2 = getFloorY(stair.toFloor);
                return (
                  <G key={`stair_${idx}`}>
                    <Line x1={stair.x - 12} y1={y1} x2={stair.x - 12} y2={y2} stroke="#FFE600" strokeWidth={2} />
                    <Line x1={stair.x + 12} y1={y1} x2={stair.x + 12} y2={y2} stroke="#FFE600" strokeWidth={2} />
                    {Array.from({ length: 6 }).map((__, stepIdx) => {
                      const stepY = y1 + ((y2 - y1) / 6) * stepIdx;
                      return (
                        <Line
                          key={`step_${stepIdx}`}
                          x1={stair.x - 12}
                          y1={stepY}
                          x2={stair.x + 12}
                          y2={stepY}
                          stroke="#FFE600"
                          strokeWidth={1.5}
                        />
                      );
                    })}
                  </G>
                );
              })}

              {/* Ground Floor Getaway Car */}
              <G>
                <Rect x={levelConfig.car.x - 28} y={getFloorY(0) - 18} width={56} height={16} rx={5} fill="#141829" stroke="#FF0055" strokeWidth={1.5} />
                <Circle cx={levelConfig.car.x - 18} cy={getFloorY(0) - 2} r={5} fill="#05060C" stroke="#FF0055" strokeWidth={1} />
                <Circle cx={levelConfig.car.x + 18} cy={getFloorY(0) - 2} r={5} fill="#05060C" stroke="#FF0055" strokeWidth={1} />
                <Polygon
                  points={`${levelConfig.car.x - 12},${getFloorY(0) - 18} ${levelConfig.car.x + 8},${getFloorY(0) - 18} ${levelConfig.car.x + 16},${getFloorY(0) - 8} ${levelConfig.car.x - 18},${getFloorY(0) - 8}`}
                  fill="#00F5FF44"
                />
              </G>

              {/* Fuel Canister (Petrol) on required levels */}
              {levelConfig.requiresPetrol && !petrolTaken && levelConfig.petrol && (
                <G>
                  <Rect
                    x={levelConfig.petrol.x - 8}
                    y={getFloorY(levelConfig.petrol.floor) - 18}
                    width={16}
                    height={16}
                    rx={3}
                    fill="#FFE600"
                    stroke="#FFFFFF"
                    strokeWidth={1.2}
                  />
                  <Circle cx={levelConfig.petrol.x} cy={getFloorY(levelConfig.petrol.floor) - 10} r={3} fill="#060914" />
                </G>
              )}

              {/* Quantum Diamond in Vault */}
              {!diamondTaken && (
                <G>
                  <Circle cx={levelConfig.diamond.x} cy={getFloorY(levelConfig.diamond.floor) - 14} r={18} fill="url(#vaultGlow)" />
                  <Polygon
                    points={`${levelConfig.diamond.x},${getFloorY(levelConfig.diamond.floor) - 24} ${levelConfig.diamond.x + 10},${getFloorY(levelConfig.diamond.floor) - 14} ${levelConfig.diamond.x},${getFloorY(levelConfig.diamond.floor) - 4} ${levelConfig.diamond.x - 10},${getFloorY(levelConfig.diamond.floor) - 14}`}
                    fill="#00F5FF"
                    stroke="#FFFFFF"
                    strokeWidth={1.5}
                  />
                </G>
              )}

              {/* Patrolling Security Guards & Flashlight Vision Beams */}
              {guards.map((g) => {
                const gy = getFloorY(g.floor);
                return (
                  <G key={g.id}>
                    {g.dir === 1 ? (
                      <Polygon
                        points={`${g.x + 8},${gy - 20} ${g.x + 85},${gy - 38} ${g.x + 85},${gy - 2}`}
                        fill="url(#beamGradRight)"
                      />
                    ) : (
                      <Polygon
                        points={`${g.x - 8},${gy - 20} ${g.x - 85},${gy - 38} ${g.x - 85},${gy - 2}`}
                        fill="url(#beamGradLeft)"
                      />
                    )}

                    <Rect x={g.x - 6} y={gy - 26} width={12} height={24} rx={3} fill="#0A0E24" stroke="#FFE600" strokeWidth={1.4} />
                    <Circle cx={g.x} cy={gy - 28} r={5} fill="#0A0E24" />
                    <Line x1={g.x - 4} y1={gy - 28} x2={g.x + g.dir * 6} y2={gy - 28} stroke="#FFE600" strokeWidth={2} />
                  </G>
                );
              })}

              {/* Rival Thief */}
              {levelConfig.hasRival && rival.isAlive && (
                <G>
                  <Rect x={rival.x - 6} y={getFloorY(rival.floor) - 24} width={12} height={22} rx={3} fill="#2A0845" stroke="#9D4EDD" strokeWidth={1.4} />
                  <Circle cx={rival.x} cy={getFloorY(rival.floor) - 26} r={5} fill="#9D4EDD" />
                  {rival.hasDiamond && (
                    <Circle cx={rival.x} cy={getFloorY(rival.floor) - 34} r={4} fill="#00F5FF" stroke="#FFFFFF" strokeWidth={1} />
                  )}
                </G>
              )}

              {/* Player Stealth Thief Operative */}
              <G>
                <Rect
                  x={player.x - 7}
                  y={getFloorY(player.floor) - (player.isHiding ? 14 : 26)}
                  width={14}
                  height={player.isHiding ? 12 : 24}
                  rx={3}
                  fill={player.isHiding ? 'rgba(0, 245, 255, 0.25)' : '#080C1E'}
                  stroke="#00F5FF"
                  strokeWidth={1.8}
                />
                <Circle cx={player.x} cy={getFloorY(player.floor) - (player.isHiding ? 16 : 28)} r={5} fill="#00F5FF" />
                <Line
                  x1={player.x - 4}
                  y1={getFloorY(player.floor) - (player.isHiding ? 16 : 28)}
                  x2={player.x + player.facing * 5}
                  y2={getFloorY(player.floor) - (player.isHiding ? 16 : 28)}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                />
                {player.hasDiamond && (
                  <Circle cx={player.x} cy={getFloorY(player.floor) - 36} r={5} fill="#00F5FF" stroke="#FFFFFF" strokeWidth={1.5} />
                )}
              </G>
            </Svg>
          </View>
        </View>

        {/* Tactical Control Bar */}
        <View style={styles.controlsRow}>
          {/* Horizontal Movement Buttons (Left & Right) */}
          <View style={styles.dirGroup}>
            <Pressable
              style={({ pressed }) => [styles.ctrlBtn, pressed && styles.ctrlBtnPressed]}
              onPressIn={() => (inputDirRef.current = -1)}
              onPressOut={() => (inputDirRef.current = 0)}
            >
              <Text style={styles.ctrlText}>◀</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.ctrlBtn, pressed && styles.ctrlBtnPressed]}
              onPressIn={() => (inputDirRef.current = 1)}
              onPressOut={() => (inputDirRef.current = 0)}
            >
              <Text style={styles.ctrlText}>▶</Text>
            </Pressable>
          </View>

          {/* Vertical Stair Climbing Buttons */}
          <View style={styles.dirGroup}>
            <Pressable style={({ pressed }) => [styles.ctrlBtn, pressed && styles.ctrlBtnPressed]} onPress={handleClimbUp}>
              <Text style={[styles.ctrlText, { color: '#FFE600' }]}>▲ STAIRS</Text>
            </Pressable>

            <Pressable style={({ pressed }) => [styles.ctrlBtn, pressed && styles.ctrlBtnPressed]} onPress={handleClimbDown}>
              <Text style={[styles.ctrlText, { color: '#FFE600' }]}>▼ STAIRS</Text>
            </Pressable>
          </View>

          {/* Sneak / Hide in Shadow Button */}
          <View style={styles.actionGroup}>
            <Pressable
              style={({ pressed }) => [
                styles.sneakBtn,
                (pressed || player.isHiding) && styles.sneakBtnActive,
              ]}
              onPressIn={handleSneakPressIn}
              onPressOut={handleSneakPressOut}
            >
              <Text style={styles.sneakIcon}>👤</Text>
              <Text style={styles.sneakText}>HIDE</Text>
            </Pressable>
          </View>
        </View>
      </JuiceEngine>

      {/* Victory / Next Level Modal */}
      <GameResultModal
        visible={victoryModal}
        type="VICTORY"
        title="HEIST COMPLETE!"
        subtitle={`Diamond secured! Escaped from Sector ${level}.`}
        score={score}
        bestScore={highScore}
        accentColor="#00F5FF"
        buttonText="NEXT HEIST ▶"
        onRetry={handleNextLevel}
        onBackToHub={onBackToHub}
      />

      {/* Game Over Modal */}
      <GameResultModal
        visible={isGameOver}
        type="GAME_OVER"
        title="HEIST COMPROMISED"
        subtitle="Security lockdown. All operatives detained."
        score={score}
        bestScore={highScore}
        accentColor="#FF0055"
        buttonText="RETRY MISSION"
        onRetry={handleRestart}
        onBackToHub={onBackToHub}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05060E',
  },
  statusStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(8, 10, 24, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 245, 255, 0.15)',
  },
  statusBox: {
    alignItems: 'center',
  },
  statusDim: {
    fontFamily: monoFont,
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 1,
  },
  statusVal: {
    fontFamily: monoFont,
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  arenaWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  arenaCard: {
    width: ARENA_W,
    height: ARENA_H,
    position: 'relative',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(0, 245, 255, 0.35)',
    backgroundColor: '#070914',
    overflow: 'hidden',
    shadowColor: '#00F5FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'rgba(8, 10, 24, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 245, 255, 0.15)',
  },
  dirGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  ctrlBtn: {
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#12162A',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 245, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctrlBtnPressed: {
    backgroundColor: 'rgba(0, 245, 255, 0.35)',
    transform: [{ scale: 0.94 }],
  },
  ctrlText: {
    fontFamily: monoFont,
    fontSize: 13,
    fontWeight: '900',
    color: '#00F5FF',
  },
  actionGroup: {
    alignItems: 'center',
  },
  sneakBtn: {
    width: 68,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1C122C',
    borderWidth: 1.5,
    borderColor: '#9D4EDD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sneakBtnActive: {
    backgroundColor: 'rgba(157, 78, 221, 0.4)',
    borderColor: '#00F5FF',
    transform: [{ scale: 0.94 }],
  },
  sneakIcon: {
    fontSize: 16,
  },
  sneakText: {
    fontFamily: monoFont,
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});
