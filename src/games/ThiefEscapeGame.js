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
const FLASHLIGHT_LEN = 60; // 60px flashlight beam ensures ladder zones remain safe

/**
 * Curated Levels with Escalating Guards, Petrol Missions, Rival Thieves & Safe Ladder Corridors
 * Guard patrol boundaries (minX, maxX) keep guard beams safely away from ladder zones (x: 75 & x: 265).
 */
const CURATED_LEVELS = [
  // Level 1: Tutorial Infiltration (3 Floors, 1 Guard, Straight Heist)
  {
    name: 'ROOFTOP VAULT',
    floorsCount: 3,
    requiresPetrol: false,
    hasRival: false,
    stairs: [
      { fromFloor: 0, toFloor: 1, x: 265 }, // Right stair to floor 1
      { fromFloor: 1, toFloor: 2, x: 75 },  // Left stair to floor 2
    ],
    guards: [
      { id: 'g0', floor: 1, minX: 140, maxX: 195, x: 170, dir: 1, speed: 1.1, pauseTimer: 0, alertTimer: 0 },
    ],
    diamond: { floor: 2, x: 250 },
    petrol: null,
    car: { floor: 0, x: 60 },
    stonePickup: null,
  },

  // Level 2: Petrol Shortage (3 Floors, 2 Guards, Fuel Needed)
  {
    name: 'FUEL RESERVES',
    floorsCount: 3,
    requiresPetrol: true,
    hasRival: false,
    stairs: [
      { fromFloor: 0, toFloor: 1, x: 75 },
      { fromFloor: 1, toFloor: 2, x: 265 },
    ],
    guards: [
      { id: 'g0', floor: 1, minX: 140, maxX: 195, x: 170, dir: -1, speed: 1.2, pauseTimer: 0, alertTimer: 0 },
      { id: 'g1', floor: 2, minX: 140, maxX: 195, x: 170, dir: 1, speed: 1.25, pauseTimer: 0, alertTimer: 0 },
    ],
    diamond: { floor: 2, x: 70 },
    petrol: { floor: 1, x: 285 },
    car: { floor: 0, x: 265 },
    stonePickup: { floor: 1, x: 45 },
  },

  // Level 3: Rival Heist (4 Floors, 2 Guards, 1 Rival Thief)
  {
    name: 'RIVAL SHADOWS',
    floorsCount: 4,
    requiresPetrol: false,
    hasRival: true,
    stairs: [
      { fromFloor: 0, toFloor: 1, x: 75 },
      { fromFloor: 1, toFloor: 2, x: 265 },
      { fromFloor: 2, toFloor: 3, x: 75 },
    ],
    guards: [
      { id: 'g0', floor: 1, minX: 140, maxX: 195, x: 170, dir: 1, speed: 1.3, pauseTimer: 0, alertTimer: 0 },
      { id: 'g1', floor: 2, minX: 140, maxX: 195, x: 170, dir: -1, speed: 1.35, pauseTimer: 0, alertTimer: 0 },
    ],
    diamond: { floor: 3, x: 265 },
    petrol: null,
    car: { floor: 0, x: 265 },
    stonePickup: { floor: 2, x: 285 },
  },

  // Level 4: Full Lockdown (4 Floors, 3 Guards, Petrol + Rival Thief)
  {
    name: 'GRAND HIGH-RISE',
    floorsCount: 4,
    requiresPetrol: true,
    hasRival: true,
    stairs: [
      { fromFloor: 0, toFloor: 1, x: 265 },
      { fromFloor: 1, toFloor: 2, x: 75 },
      { fromFloor: 2, toFloor: 3, x: 265 },
    ],
    guards: [
      { id: 'g0', floor: 1, minX: 140, maxX: 195, x: 160, dir: 1, speed: 1.35, pauseTimer: 0, alertTimer: 0 },
      { id: 'g1', floor: 2, minX: 140, maxX: 195, x: 180, dir: -1, speed: 1.4, pauseTimer: 0, alertTimer: 0 },
      { id: 'g2', floor: 3, minX: 140, maxX: 195, x: 170, dir: 1, speed: 1.45, pauseTimer: 0, alertTimer: 0 },
    ],
    diamond: { floor: 3, x: 70 },
    petrol: { floor: 1, x: 65 },
    car: { floor: 0, x: 60 },
    stonePickup: { floor: 2, x: 45 },
  },

  // Level 5: Penthouse Apex (5 Floors, 4 Guards, Master Infiltration)
  {
    name: 'PENTHOUSE APEX',
    floorsCount: 5,
    requiresPetrol: true,
    hasRival: true,
    stairs: [
      { fromFloor: 0, toFloor: 1, x: 75 },
      { fromFloor: 1, toFloor: 2, x: 265 },
      { fromFloor: 2, toFloor: 3, x: 75 },
      { fromFloor: 3, toFloor: 4, x: 265 },
    ],
    guards: [
      { id: 'g0', floor: 1, minX: 140, maxX: 195, x: 170, dir: 1, speed: 1.45, pauseTimer: 0, alertTimer: 0 },
      { id: 'g1', floor: 2, minX: 140, maxX: 195, x: 170, dir: -1, speed: 1.5, pauseTimer: 0, alertTimer: 0 },
      { id: 'g2', floor: 3, minX: 140, maxX: 195, x: 170, dir: 1, speed: 1.55, pauseTimer: 0, alertTimer: 0 },
      { id: 'g3', floor: 4, minX: 140, maxX: 195, x: 170, dir: -1, speed: 1.6, pauseTimer: 0, alertTimer: 0 },
    ],
    diamond: { floor: 4, x: 70 },
    petrol: { floor: 2, x: 65 },
    car: { floor: 0, x: 265 },
    stonePickup: { floor: 3, x: 285 },
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

  // Distractor stones
  const [stones, setStones] = useState(3);
  const [thrownStones, setThrownStones] = useState([]);
  const [stonePickupTaken, setStonePickupTaken] = useState(false);

  // Active Level Config
  const levelConfig = CURATED_LEVELS[Math.min(level - 1, CURATED_LEVELS.length - 1)];

  // Floor Height Calculator
  const floorHeight = ARENA_H / (levelConfig.floorsCount + 0.3);
  const getFloorY = useCallback(
    (floorIdx) => ARENA_H - 35 - floorIdx * floorHeight,
    [floorHeight]
  );

  // Player State: supports smooth ladder climbing & stopping midway
  const [player, setPlayer] = useState({
    floor: 0,
    x: levelConfig.car.x + (levelConfig.car.x < 150 ? 50 : -50),
    y: null, // null when on floor; continuous coordinate when climbing
    isClimbing: false,
    stairIdx: null,
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

  // Movement & Action Input Refs
  const inputDirRef = useRef(0); // -1 = left, 0 = idle, 1 = right
  const climbDirRef = useRef(0); // -1 = climb up, 0 = hold/stop, 1 = climb down
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

  const stonesRef = useRef(stones);
  useEffect(() => {
    stonesRef.current = stones;
  }, [stones]);

  const thrownStonesRef = useRef(thrownStones);
  useEffect(() => {
    thrownStonesRef.current = thrownStones;
  }, [thrownStones]);

  const stonePickupTakenRef = useRef(stonePickupTaken);
  useEffect(() => {
    stonePickupTakenRef.current = stonePickupTaken;
  }, [stonePickupTaken]);

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
        y: null,
        isClimbing: false,
        stairIdx: null,
        isHiding: false,
        hasDiamond: false,
        hasPetrol: !cfg.requiresPetrol,
        facing: cfg.car.x < 150 ? 1 : -1,
      };
      setPlayer(initialPlayer);
      playerRef.current = initialPlayer;

      const initialGuards = cfg.guards.map((g) => ({ ...g, alertTimer: 0 }));
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

      setStones(3);
      stonesRef.current = 3;
      setThrownStones([]);
      thrownStonesRef.current = [];
      setStonePickupTaken(false);
      stonePickupTakenRef.current = false;

      inputDirRef.current = 0;
      climbDirRef.current = 0;
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

  // Throw Distractor Stone in player's facing direction
  const handleThrowStone = useCallback(() => {
    if (isGameOver || isPaused || victoryModal) return;
    if (stonesRef.current <= 0) {
      triggerLightHaptic();
      juiceRef.current?.popup('NO STONES!', 'Search floors for pebbles', '#FF0055');
      return;
    }

    const curP = playerRef.current;
    const curY = curP.isClimbing && curP.y != null ? curP.y : getFloorY(curP.floor);
    const dir = curP.facing || 1;

    const newStone = {
      id: Date.now() + Math.random(),
      x: curP.x + dir * 10,
      y: curY - 18,
      vx: dir * 5.2,
      vy: -3.8, // ballistic upward angle
      active: true,
      life: 90,
    };

    setStones((s) => {
      const next = s - 1;
      stonesRef.current = next;
      return next;
    });

    thrownStonesRef.current = [...thrownStonesRef.current, newStone];
    setThrownStones(thrownStonesRef.current);

    playSliceSound();
    triggerMediumHaptic();
    juiceRef.current?.popup('🪨 DISTRACTOR THROWN!', dir > 0 ? 'Towards Right ➔' : 'Towards Left ⬅', '#FFE600');
  }, [isGameOver, isPaused, victoryModal, getFloorY]);

  // Main 60 FPS Game Loop
  useEffect(() => {
    if (isPaused || isGameOver || victoryModal) return;

    const interval = setInterval(() => {
      const curPlayer = { ...playerRef.current };
      const curGuards = guardsRef.current.map((g) => ({ ...g }));
      const curRival = { ...rivalRef.current };

      // 1. Update Player Movement (Smooth Ladder Climbing OR Walking)
      if (curPlayer.isClimbing && curPlayer.stairIdx != null) {
        const stair = levelConfig.stairs[curPlayer.stairIdx];
        const yBottom = getFloorY(stair.fromFloor);
        const yTop = getFloorY(stair.toFloor);

        // Continuous vertical climbing movement
        if (climbDirRef.current !== 0) {
          curPlayer.y += climbDirRef.current * 2.4; // -1 moves up towards yTop, +1 moves down towards yBottom
        }

        // Stepping off onto Top Floor
        if (curPlayer.y <= yTop) {
          curPlayer.y = null;
          curPlayer.floor = stair.toFloor;
          curPlayer.isClimbing = false;
          curPlayer.stairIdx = null;
          triggerLightHaptic();
          playSnapTickSound();
        }
        // Stepping off onto Bottom Floor
        else if (curPlayer.y >= yBottom) {
          curPlayer.y = null;
          curPlayer.floor = stair.fromFloor;
          curPlayer.isClimbing = false;
          curPlayer.stairIdx = null;
          triggerLightHaptic();
          playSnapTickSound();
        }
        // Optional quick horizontal step off if near platform edge
        else if (inputDirRef.current !== 0) {
          if (Math.abs(curPlayer.y - yTop) < 14) {
            curPlayer.y = null;
            curPlayer.floor = stair.toFloor;
            curPlayer.isClimbing = false;
            curPlayer.stairIdx = null;
            curPlayer.x += inputDirRef.current * 2.0;
          } else if (Math.abs(curPlayer.y - yBottom) < 14) {
            curPlayer.y = null;
            curPlayer.floor = stair.fromFloor;
            curPlayer.isClimbing = false;
            curPlayer.stairIdx = null;
            curPlayer.x += inputDirRef.current * 2.0;
          }
        }
      } else {
        // Normal horizontal walking on platform
        if (inputDirRef.current !== 0) {
          curPlayer.x += inputDirRef.current * (isSneakRef.current ? 1.4 : 2.6);
          curPlayer.facing = inputDirRef.current;
        }
        curPlayer.x = Math.max(30, Math.min(ARENA_W - 30, curPlayer.x));
        curPlayer.isHiding = isSneakRef.current;

        // Ladder Climb Up Entry Check: near stair going up
        if (climbDirRef.current === -1) {
          const upIdx = levelConfig.stairs.findIndex(
            (s) => s.fromFloor === curPlayer.floor && Math.abs(curPlayer.x - s.x) < 24
          );
          if (upIdx !== -1) {
            const stair = levelConfig.stairs[upIdx];
            curPlayer.isClimbing = true;
            curPlayer.stairIdx = upIdx;
            curPlayer.x = stair.x;
            curPlayer.y = getFloorY(stair.fromFloor) - 4;
            playSliceSound();
            triggerLightHaptic();
          }
        }
        // Ladder Climb Down Entry Check: near stair going down
        else if (climbDirRef.current === 1) {
          const downIdx = levelConfig.stairs.findIndex(
            (s) => s.toFloor === curPlayer.floor && Math.abs(curPlayer.x - s.x) < 24
          );
          if (downIdx !== -1) {
            const stair = levelConfig.stairs[downIdx];
            curPlayer.isClimbing = true;
            curPlayer.stairIdx = downIdx;
            curPlayer.x = stair.x;
            curPlayer.y = getFloorY(stair.toFloor) + 4;
            playSliceSound();
            triggerLightHaptic();
          }
        }
      }

      // 2. Update Guards Patrol & Alert Distractions
      curGuards.forEach((g) => {
        if (g.alertTimer > 0) {
          g.alertTimer -= 1;
        }

        if (g.pauseTimer > 0) {
          g.pauseTimer -= 1;
        } else {
          g.x += g.dir * g.speed;
          if (g.x >= g.maxX) {
            g.x = g.maxX;
            g.dir = -1;
            g.pauseTimer = 35;
          } else if (g.x <= g.minX) {
            g.x = g.minX;
            g.dir = 1;
            g.pauseTimer = 35;
          }
        }
      });

      // 3. Update Thrown Stones Projectile Physics & Guard Distraction
      const nextStones = [];
      thrownStonesRef.current.forEach((st) => {
        if (!st.active) return;

        st.x += st.vx;
        st.y += st.vy;
        st.vy += 0.24; // gravity
        st.life -= 1;

        // Check impact with metal catwalk floors
        let hitFloor = null;
        for (let f = 0; f < levelConfig.floorsCount; f++) {
          const fy = getFloorY(f);
          if (st.vy > 0 && st.y >= fy - 6 && st.y <= fy + 14 && st.x >= 20 && st.x <= ARENA_W - 20) {
            hitFloor = f;
            st.y = fy - 2;
            break;
          }
        }

        const groundY = getFloorY(0);
        if (st.y >= groundY) {
          hitFloor = 0;
          st.y = groundY;
        }

        if (hitFloor !== null && st.life > 0) {
          // Stone hit floor: make sound & alert guards on this floor
          playSnapTickSound();
          triggerLightHaptic();
          juiceRef.current?.burst(st.x, st.y, '#FFE600', 14);

          curGuards.forEach((g) => {
            if (g.floor === hitFloor) {
              const dist = Math.abs(g.x - st.x);
              if (dist < 150) {
                g.pauseTimer = 100; // freeze in place / investigate for 1.6s
                g.alertTimer = 100;
                g.dir = st.x > g.x ? 1 : -1; // turn towards noise!
              }
            }
          });

          st.active = false;
        } else if (st.life > 0 && st.x > 10 && st.x < ARENA_W - 10) {
          nextStones.push(st);
        }
      });
      thrownStonesRef.current = nextStones;
      setThrownStones(nextStones);

      // 4. Update Vision Detection against Player
      // Note: If player is climbing mid-ladder, player is between floors and safe from horizontal beams!
      if (!curPlayer.isHiding) {
        const playerY = curPlayer.isClimbing && curPlayer.y != null ? curPlayer.y : getFloorY(curPlayer.floor);

        curGuards.forEach((g) => {
          const gy = getFloorY(g.floor);
          // Only detected if player's vertical position aligns with guard's eye level (within 18px)
          if (Math.abs(playerY - gy) < 18) {
            const dist = curPlayer.x - g.x;
            const inCone = g.dir === 1 ? dist > 0 && dist < FLASHLIGHT_LEN : dist < 0 && dist > -FLASHLIGHT_LEN;
            if (inCone) {
              handlePlayerBusted();
            }
          }
        });
      }

      // 5. Update Rival AI Thief
      if (levelConfig.hasRival && curRival.isAlive) {
        const hasD = curRival.hasDiamond;
        const targetFloor = hasD ? 0 : levelConfig.diamond.floor;

        if (curRival.floor < targetFloor) {
          const upStair = levelConfig.stairs.find((s) => s.fromFloor === curRival.floor);
          if (upStair) {
            if (Math.abs(curRival.x - upStair.x) < 6) {
              curRival.floor += 1;
              curRival.x = upStair.x;
            } else {
              curRival.facing = curRival.x < upStair.x ? 1 : -1;
              curRival.x += curRival.facing * 1.6;
            }
          }
        } else if (curRival.floor > targetFloor) {
          const downStair = levelConfig.stairs.find((s) => s.toFloor === curRival.floor);
          if (downStair) {
            if (Math.abs(curRival.x - downStair.x) < 6) {
              curRival.floor -= 1;
              curRival.x = downStair.x;
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
            if (curRival.floor === 0 && Math.abs(curRival.x - levelConfig.car.x) < 25) {
              handlePlayerBusted();
            }
          }
        }
      }

      // 6. Check Item Pickups: Diamond
      if (!curPlayer.hasDiamond && !diamondTakenRef.current && curPlayer.floor === levelConfig.diamond.floor && !curPlayer.isClimbing) {
        if (Math.abs(curPlayer.x - levelConfig.diamond.x) < 22) {
          curPlayer.hasDiamond = true;
          setDiamondTaken(true);
          diamondTakenRef.current = true;
          triggerPerfectHaptic();
          playPerfectSound();
          juiceRef.current?.burst(levelConfig.diamond.x, getFloorY(curPlayer.floor), '#00F5FF', 24);
          juiceRef.current?.popup('💎 DIAMOND SECURED!', 'Now escape to the getaway car!', '#00F5FF');
        }
      }

      // 7. Check Item Pickups: Petrol Canister
      if (levelConfig.requiresPetrol && !curPlayer.hasPetrol && levelConfig.petrol && curPlayer.floor === levelConfig.petrol.floor && !curPlayer.isClimbing) {
        if (Math.abs(curPlayer.x - levelConfig.petrol.x) < 22) {
          curPlayer.hasPetrol = true;
          setPetrolTaken(true);
          petrolTakenRef.current = true;
          triggerSelectionHaptic();
          playTapSound();
          juiceRef.current?.burst(levelConfig.petrol.x, getFloorY(curPlayer.floor), '#FFE600', 16);
          juiceRef.current?.popup('⛽ FUEL CANISTER SECURED!', 'Getaway car fueled up', '#FFE600');
        }
      }

      // 8. Check Item Pickups: Stone Cache Refill
      if (levelConfig.stonePickup && !stonePickupTakenRef.current && curPlayer.floor === levelConfig.stonePickup.floor && !curPlayer.isClimbing) {
        if (Math.abs(curPlayer.x - levelConfig.stonePickup.x) < 22) {
          setStonePickupTaken(true);
          stonePickupTakenRef.current = true;
          setStones((s) => {
            const next = s + 2;
            stonesRef.current = next;
            return next;
          });
          triggerSelectionHaptic();
          playTapSound();
          juiceRef.current?.popup('🪨 FOUND STONES (+2)!', 'Restocked distractor rocks', '#FFE600');
        }
      }

      // 9. Check Stealing Diamond Back from Rival Thief
      if (levelConfig.hasRival && curRival.hasDiamond && curPlayer.floor === curRival.floor && !curPlayer.isClimbing) {
        if (Math.abs(curPlayer.x - curRival.x) < 24) {
          curRival.hasDiamond = false;
          curPlayer.hasDiamond = true;
          triggerPerfectHaptic();
          playPerfectSound();
          juiceRef.current?.popup('🥷 TACKLED RIVAL!', 'Diamond reclaimed!', COLORS.matrixMint);
        }
      }

      // 10. Check Escape to Car on Ground Floor (Wide 55px Hitbox ensures level clears smoothly!)
      if (curPlayer.floor === 0 && !curPlayer.isClimbing && curPlayer.hasDiamond && curPlayer.hasPetrol) {
        if (Math.abs(curPlayer.x - levelConfig.car.x) <= 55) {
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

  // Active player vertical position
  const activePlayerY = player.isClimbing && player.y != null ? player.y : getFloorY(player.floor);

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
            <Text style={styles.statusDim}>STONES</Text>
            <Text style={[styles.statusVal, { color: stones > 0 ? '#FFE600' : 'rgba(255,255,255,0.4)' }]}>
              {`🪨 x${stones}`}
            </Text>
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

                {/* Guard Flashlight Beam Gradients */}
                <SvgLinearGradient id="beamGradRight" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0%" stopColor="#FFE600" stopOpacity="0.45" />
                  <Stop offset="100%" stopColor="#FFE600" stopOpacity="0.0" />
                </SvgLinearGradient>

                <SvgLinearGradient id="beamGradLeft" x1="1" y1="0" x2="0" y2="0">
                  <Stop offset="0%" stopColor="#FFE600" stopOpacity="0.45" />
                  <Stop offset="100%" stopColor="#FFE600" stopOpacity="0.0" />
                </SvgLinearGradient>

                {/* Alert Distraction Beam Gradients */}
                <SvgLinearGradient id="beamAlertRight" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0%" stopColor="#FF9900" stopOpacity="0.6" />
                  <Stop offset="100%" stopColor="#FF9900" stopOpacity="0.0" />
                </SvgLinearGradient>

                <SvgLinearGradient id="beamAlertLeft" x1="1" y1="0" x2="0" y2="0">
                  <Stop offset="0%" stopColor="#FF9900" stopOpacity="0.6" />
                  <Stop offset="100%" stopColor="#FF9900" stopOpacity="0.0" />
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

              {/* Fire Escape Stairs / Ladders connecting floors with continuous rungs */}
              {levelConfig.stairs.map((stair, idx) => {
                const y1 = getFloorY(stair.fromFloor);
                const y2 = getFloorY(stair.toFloor);
                const rungCount = Math.max(6, Math.floor(Math.abs(y1 - y2) / 12));
                return (
                  <G key={`stair_${idx}`}>
                    <Line x1={stair.x - 11} y1={y1} x2={stair.x - 11} y2={y2} stroke="#FFE600" strokeWidth={2.2} />
                    <Line x1={stair.x + 11} y1={y1} x2={stair.x + 11} y2={y2} stroke="#FFE600" strokeWidth={2.2} />
                    {Array.from({ length: rungCount }).map((__, stepIdx) => {
                      const stepY = y1 + ((y2 - y1) / rungCount) * stepIdx;
                      return (
                        <Line
                          key={`step_${stepIdx}`}
                          x1={stair.x - 11}
                          y1={stepY}
                          x2={stair.x + 11}
                          y2={stepY}
                          stroke="#FFE600"
                          strokeWidth={1.8}
                          strokeOpacity={0.85}
                        />
                      );
                    })}
                  </G>
                );
              })}

              {/* Ground Floor Getaway Car with Animated Escape Beacon */}
              <G>
                {/* Active Escape Zone indicator when diamond & fuel are ready */}
                {player.hasDiamond && player.hasPetrol && (
                  <G>
                    <Rect
                      x={levelConfig.car.x - 34}
                      y={getFloorY(0) - 24}
                      width={68}
                      height={26}
                      rx={8}
                      fill="none"
                      stroke={COLORS.matrixMint}
                      strokeWidth={2}
                      strokeDasharray="6 4"
                    />
                    <Polygon
                      points={`${levelConfig.car.x},${getFloorY(0) - 26} ${levelConfig.car.x - 7},${getFloorY(0) - 34} ${levelConfig.car.x + 7},${getFloorY(0) - 34}`}
                      fill={COLORS.matrixMint}
                    />
                  </G>
                )}

                {/* Warning beacon if diamond is ready but petrol still needed */}
                {player.hasDiamond && !player.hasPetrol && (
                  <Polygon
                    points={`${levelConfig.car.x},${getFloorY(0) - 24} ${levelConfig.car.x - 6},${getFloorY(0) - 32} ${levelConfig.car.x + 6},${getFloorY(0) - 32}`}
                    fill="#FFE600"
                  />
                )}

                <Rect x={levelConfig.car.x - 28} y={getFloorY(0) - 18} width={56} height={16} rx={5} fill="#141829" stroke={player.hasDiamond && player.hasPetrol ? COLORS.matrixMint : '#FF0055'} strokeWidth={1.8} />
                <Circle cx={levelConfig.car.x - 18} cy={getFloorY(0) - 2} r={5} fill="#05060C" stroke={player.hasDiamond && player.hasPetrol ? COLORS.matrixMint : '#FF0055'} strokeWidth={1} />
                <Circle cx={levelConfig.car.x + 18} cy={getFloorY(0) - 2} r={5} fill="#05060C" stroke={player.hasDiamond && player.hasPetrol ? COLORS.matrixMint : '#FF0055'} strokeWidth={1} />
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

              {/* Stone Refill Cache on certain floors */}
              {levelConfig.stonePickup && !stonePickupTaken && (
                <G>
                  <Circle cx={levelConfig.stonePickup.x - 3} cy={getFloorY(levelConfig.stonePickup.floor) - 5} r={3} fill="#8892B0" stroke="#FFFFFF" strokeWidth={0.8} />
                  <Circle cx={levelConfig.stonePickup.x + 3} cy={getFloorY(levelConfig.stonePickup.floor) - 5} r={3.2} fill="#8892B0" stroke="#FFFFFF" strokeWidth={0.8} />
                  <Circle cx={levelConfig.stonePickup.x} cy={getFloorY(levelConfig.stonePickup.floor) - 9} r={3} fill="#CCD6F6" stroke="#FFFFFF" strokeWidth={0.8} />
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

              {/* Patrolling Security Guards & Vision Beams */}
              {guards.map((g) => {
                const gy = getFloorY(g.floor);
                const isAlerted = g.alertTimer > 0;
                const beamRightId = isAlerted ? 'url(#beamAlertRight)' : 'url(#beamGradRight)';
                const beamLeftId = isAlerted ? 'url(#beamAlertLeft)' : 'url(#beamGradLeft)';

                return (
                  <G key={g.id}>
                    {/* Flashlight Beam */}
                    {g.dir === 1 ? (
                      <Polygon
                        points={`${g.x + 8},${gy - 18} ${g.x + FLASHLIGHT_LEN},${gy - 32} ${g.x + FLASHLIGHT_LEN},${gy - 2}`}
                        fill={beamRightId}
                      />
                    ) : (
                      <Polygon
                        points={`${g.x - 8},${gy - 18} ${g.x - FLASHLIGHT_LEN},${gy - 32} ${g.x - FLASHLIGHT_LEN},${gy - 2}`}
                        fill={beamLeftId}
                      />
                    )}

                    {/* Alert Question Mark Bubble when distracted by stone */}
                    {isAlerted && (
                      <G>
                        <Circle cx={g.x} cy={gy - 38} r={8} fill="#FF9900" stroke="#FFFFFF" strokeWidth={1.5} />
                        <Line x1={g.x} y1={gy - 42} x2={g.x} y2={gy - 38} stroke="#05060E" strokeWidth={2.2} />
                        <Circle cx={g.x} cy={gy - 34} r={1.2} fill="#05060E" />
                      </G>
                    )}

                    <Rect x={g.x - 6} y={gy - 26} width={12} height={24} rx={3} fill="#0A0E24" stroke={isAlerted ? '#FF9900' : '#FFE600'} strokeWidth={1.4} />
                    <Circle cx={g.x} cy={gy - 28} r={5} fill="#0A0E24" />
                    <Line x1={g.x - 4} y1={gy - 28} x2={g.x + g.dir * 6} y2={gy - 28} stroke={isAlerted ? '#FF9900' : '#FFE600'} strokeWidth={2} />
                  </G>
                );
              })}

              {/* Thrown Distractor Stones in Flight */}
              {thrownStones.map((st) => (
                <G key={st.id}>
                  <Circle cx={st.x} cy={st.y} r={3.5} fill="#FFE600" stroke="#FFFFFF" strokeWidth={1} />
                  <Circle cx={st.x - st.vx * 1.5} cy={st.y - st.vy * 1.5} r={2} fill="rgba(255, 230, 0, 0.4)" />
                </G>
              ))}

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

              {/* Player Stealth Thief Operative (Renders smooth climbing vs on-floor walking) */}
              {player.isClimbing ? (
                <G>
                  {/* Gripping Hands on Ladder Rails */}
                  <Line x1={player.x - 11} y1={activePlayerY - 18} x2={player.x - 5} y2={activePlayerY - 14} stroke="#00F5FF" strokeWidth={2.2} />
                  <Line x1={player.x + 5} y1={activePlayerY - 14} x2={player.x + 11} y2={activePlayerY - 18} stroke="#00F5FF" strokeWidth={2.2} />

                  {/* Body climbing back silhouette */}
                  <Rect
                    x={player.x - 6}
                    y={activePlayerY - 24}
                    width={12}
                    height={20}
                    rx={3}
                    fill="#080C1E"
                    stroke="#00F5FF"
                    strokeWidth={1.8}
                  />

                  {/* Head */}
                  <Circle cx={player.x} cy={activePlayerY - 26} r={5} fill="#00F5FF" />

                  {/* Gripping Feet on Ladder Rungs */}
                  <Line x1={player.x - 10} y1={activePlayerY - 4} x2={player.x - 4} y2={activePlayerY - 2} stroke="#00F5FF" strokeWidth={2.2} />
                  <Line x1={player.x + 4} y1={activePlayerY - 2} x2={player.x + 10} y2={activePlayerY - 4} stroke="#00F5FF" strokeWidth={2.2} />

                  {/* Diamond on operative's back */}
                  {player.hasDiamond && (
                    <Polygon
                      points={`${player.x},${activePlayerY - 33} ${player.x + 5},${activePlayerY - 28} ${player.x},${activePlayerY - 23} ${player.x - 5},${activePlayerY - 28}`}
                      fill="#00F5FF"
                      stroke="#FFFFFF"
                      strokeWidth={1.2}
                    />
                  )}
                </G>
              ) : (
                <G>
                  <Rect
                    x={player.x - 7}
                    y={activePlayerY - (player.isHiding ? 14 : 26)}
                    width={14}
                    height={player.isHiding ? 12 : 24}
                    rx={3}
                    fill={player.isHiding ? 'rgba(0, 245, 255, 0.25)' : '#080C1E'}
                    stroke="#00F5FF"
                    strokeWidth={1.8}
                  />
                  <Circle cx={player.x} cy={activePlayerY - (player.isHiding ? 16 : 28)} r={5} fill="#00F5FF" />
                  <Line
                    x1={player.x - 4}
                    y1={activePlayerY - (player.isHiding ? 16 : 28)}
                    x2={player.x + player.facing * 5}
                    y2={activePlayerY - (player.isHiding ? 16 : 28)}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  />
                  {player.hasDiamond && (
                    <Circle cx={player.x} cy={activePlayerY - 36} r={5} fill="#00F5FF" stroke="#FFFFFF" strokeWidth={1.5} />
                  )}
                </G>
              )}
            </Svg>
          </View>
        </View>

        {/* Tactical Control Bar: Horizontal Walk, Smooth Ladder Climb, Stone Distractor & Hide */}
        <View style={styles.controlsRow}>
          {/* Movement D-Pad (Left & Right) */}
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

          {/* Smooth Ladder Climbing: Hold to climb, release to stand in the middle */}
          <View style={styles.dirGroup}>
            <Pressable
              style={({ pressed }) => [styles.climbBtn, pressed && styles.climbBtnPressed]}
              onPressIn={() => (climbDirRef.current = -1)}
              onPressOut={() => (climbDirRef.current = 0)}
            >
              <Text style={styles.climbText}>▲</Text>
              <Text style={styles.climbSub}>CLIMB</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.climbBtn, pressed && styles.climbBtnPressed]}
              onPressIn={() => (climbDirRef.current = 1)}
              onPressOut={() => (climbDirRef.current = 0)}
            >
              <Text style={styles.climbText}>▼</Text>
              <Text style={styles.climbSub}>CLIMB</Text>
            </Pressable>
          </View>

          {/* Actions: Distractor Stone Throw & Shadow Hide */}
          <View style={styles.actionGroup}>
            <Pressable
              style={({ pressed }) => [
                styles.stoneBtn,
                pressed && styles.stoneBtnPressed,
                stones <= 0 && styles.btnDisabled,
              ]}
              onPress={handleThrowStone}
            >
              <Text style={styles.stoneIcon}>🪨</Text>
              <Text style={styles.stoneCount}>{stones}</Text>
            </Pressable>

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
        subtitle={`Escaped successfully in the getaway car! Sector ${level} cleared.`}
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
    paddingHorizontal: 14,
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
    letterSpacing: 0.8,
  },
  statusVal: {
    fontFamily: monoFont,
    fontSize: 11,
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
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: 'rgba(8, 10, 24, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 245, 255, 0.15)',
  },
  dirGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  ctrlBtn: {
    width: 44,
    height: 48,
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
    fontSize: 16,
    fontWeight: '900',
    color: '#00F5FF',
  },
  climbBtn: {
    width: 46,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1B1810',
    borderWidth: 1.5,
    borderColor: '#FFE600',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  climbBtnPressed: {
    backgroundColor: 'rgba(255, 230, 0, 0.35)',
    transform: [{ scale: 0.94 }],
  },
  climbText: {
    fontFamily: monoFont,
    fontSize: 13,
    fontWeight: '900',
    color: '#FFE600',
  },
  climbSub: {
    fontFamily: monoFont,
    fontSize: 7.5,
    fontWeight: '900',
    color: '#FFE600',
    letterSpacing: 0.5,
  },
  actionGroup: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  stoneBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1E1912',
    borderWidth: 1.5,
    borderColor: '#FFE600',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stoneBtnPressed: {
    backgroundColor: 'rgba(255, 230, 0, 0.3)',
    transform: [{ scale: 0.94 }],
  },
  stoneIcon: {
    fontSize: 15,
  },
  stoneCount: {
    fontFamily: monoFont,
    fontSize: 9.5,
    fontWeight: '900',
    color: '#FFE600',
  },
  btnDisabled: {
    opacity: 0.4,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  sneakBtn: {
    width: 48,
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
    fontSize: 15,
  },
  sneakText: {
    fontFamily: monoFont,
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
