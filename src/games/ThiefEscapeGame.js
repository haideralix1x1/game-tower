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
  Text as SvgText,
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
const STORAGE_LEVEL_KEY = '@game_tower:thief_current_level_v1';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

// Arena Dimensions
const ARENA_W = 340;
const ARENA_H = 420;
const FLASHLIGHT_LEN = 60; // 60px flashlight beam ensures ladder corridors stay safe

// Architectural Windows: players can ONLY hide inside these windows
const WINDOW_X_LIST = [50, 120, 170, 220, 290];
const WINDOW_PROXIMITY = 18; // Must be within 18px of window center to hide

const getNearestWindowX = (playerX) => {
  let nearest = null;
  let minDist = Infinity;
  for (const wx of WINDOW_X_LIST) {
    const d = Math.abs(playerX - wx);
    if (d < minDist) {
      minDist = d;
      nearest = wx;
    }
  }
  return minDist <= WINDOW_PROXIMITY ? nearest : null;
};

/**
 * Curated Levels with Escalating Guards, Petrol Missions, Rival Thieves & Full-Floor Patrols
 * Guards patrol the full floor (minX: 45 to maxX: 295), bypassing ladders to give clear stealth timing windows.
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
      { id: 'g0', floor: 1, minX: 45, maxX: 295, x: 60, dir: 1, speed: 1.1, pauseTimer: 0, alertTimer: 0 },
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
    hasRival: true,
    stairs: [
      { fromFloor: 0, toFloor: 1, x: 75 },
      { fromFloor: 1, toFloor: 2, x: 265 },
    ],
    guards: [
      { id: 'g0', floor: 1, minX: 45, maxX: 295, x: 60, dir: 1, speed: 1.15, pauseTimer: 0, alertTimer: 0 },
      { id: 'g1', floor: 2, minX: 45, maxX: 295, x: 280, dir: -1, speed: 1.2, pauseTimer: 0, alertTimer: 0 },
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
      { id: 'g0', floor: 1, minX: 45, maxX: 295, x: 60, dir: 1, speed: 1.2, pauseTimer: 0, alertTimer: 0 },
      { id: 'g1', floor: 2, minX: 45, maxX: 295, x: 280, dir: -1, speed: 1.25, pauseTimer: 0, alertTimer: 0 },
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
      { id: 'g0', floor: 1, minX: 45, maxX: 295, x: 60, dir: 1, speed: 1.25, pauseTimer: 0, alertTimer: 0 },
      { id: 'g1', floor: 2, minX: 45, maxX: 295, x: 280, dir: -1, speed: 1.3, pauseTimer: 0, alertTimer: 0 },
      { id: 'g2', floor: 3, minX: 45, maxX: 295, x: 60, dir: 1, speed: 1.35, pauseTimer: 0, alertTimer: 0 },
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
      { id: 'g0', floor: 1, minX: 45, maxX: 295, x: 60, dir: 1, speed: 1.3, pauseTimer: 0, alertTimer: 0 },
      { id: 'g1', floor: 2, minX: 45, maxX: 295, x: 280, dir: -1, speed: 1.35, pauseTimer: 0, alertTimer: 0 },
      { id: 'g2', floor: 3, minX: 45, maxX: 295, x: 60, dir: 1, speed: 1.4, pauseTimer: 0, alertTimer: 0 },
      { id: 'g3', floor: 4, minX: 45, maxX: 295, x: 280, dir: -1, speed: 1.45, pauseTimer: 0, alertTimer: 0 },
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

  // Player State: supports smooth ladder climbing & window hiding
  const [player, setPlayer] = useState({
    floor: 0,
    x: levelConfig.car.x + (levelConfig.car.x < 150 ? 50 : -50),
    y: null, // null when on floor; continuous coordinate when climbing
    isClimbing: false,
    stairIdx: null,
    isHiding: false,
    hiddenWindowX: null,
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
    isHiding: false,
    hiddenWindowX: null,
    hideTimer: 0,
    snatchCooldown: 0,
    stepTimer: 0,
  }));

  // Loot items state
  const [diamondTaken, setDiamondTaken] = useState(false);
  const [petrolTaken, setPetrolTaken] = useState(!levelConfig.requiresPetrol);

  // Getaway Car State: drives off screen once thief jumps inside!
  const [carState, setCarState] = useState(() => ({
    x: levelConfig.car.x,
    isEscaping: false,
    thiefInside: false,
    jumpPhase: 0,
    vx: 3,
    escapeDir: levelConfig.car.x < 150 ? -1 : 1,
  }));
  const carStateRef = useRef(carState);
  useEffect(() => {
    carStateRef.current = carState;
  }, [carState]);

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

  const hasDiamondRef = useRef(false);
  const hasPetrolRef = useRef(!levelConfig.requiresPetrol);
  const fuelWarningCooldownRef = useRef(false);

  // Save current level to persistent storage
  const saveCurrentLevel = useCallback(async (lvl) => {
    try {
      await AsyncStorage.setItem(STORAGE_LEVEL_KEY, String(lvl));
    } catch {}
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
        hiddenWindowX: null,
        hasDiamond: false,
        hasPetrol: !cfg.requiresPetrol,
        facing: cfg.car.x < 150 ? 1 : -1,
      };
      setPlayer(initialPlayer);
      playerRef.current = initialPlayer;

      const initialGuards = cfg.guards.map((g) => ({
        ...g,
        alertTimer: 0,
        pauseTimer: 0,
        isInvestigating: false,
        investigateTargetX: g.x,
        investigateTimer: 0,
        investigateSpeed: g.speed,
      }));
      setGuards(initialGuards);
      guardsRef.current = initialGuards;

      const initialRival = {
        floor: 0,
        x: cfg.car.x + (cfg.car.x < 150 ? 140 : -140),
        facing: 1,
        hasDiamond: false,
        isAlive: cfg.hasRival,
        isHiding: false,
        hiddenWindowX: null,
        hideTimer: 0,
        snatchCooldown: 0,
        stepTimer: 0,
      };
      setRival(initialRival);
      rivalRef.current = initialRival;

      setDiamondTaken(false);
      diamondTakenRef.current = false;
      hasDiamondRef.current = false;
      setPetrolTaken(!cfg.requiresPetrol);
      petrolTakenRef.current = !cfg.requiresPetrol;
      hasPetrolRef.current = !cfg.requiresPetrol;

      setStones(3);
      stonesRef.current = 3;
      setThrownStones([]);
      thrownStonesRef.current = [];
      setStonePickupTaken(false);
      stonePickupTakenRef.current = false;

      const initialCar = {
        x: cfg.car.x,
        isEscaping: false,
        thiefInside: false,
        jumpPhase: 0,
        vx: 3,
        escapeDir: cfg.car.x < 150 ? -1 : 1,
      };
      setCarState(initialCar);
      carStateRef.current = initialCar;

      inputDirRef.current = 0;
      climbDirRef.current = 0;
      isSneakRef.current = false;
      setIsGameOver(false);
      setVictoryModal(false);
    },
    []
  );

  // Load High Score and Continue Saved Level on startup
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((val) => {
        if (val) setHighScore(parseInt(val, 10) || 0);
      })
      .catch(() => {});

    AsyncStorage.getItem(STORAGE_LEVEL_KEY)
      .then((savedLvl) => {
        if (savedLvl) {
          const l = Math.max(1, parseInt(savedLvl, 10) || 1);
          setLevel(l);
          initLevel(l);
        }
      })
      .catch(() => {});
  }, [initLevel]);

  // Player Caught / Damaged
  const handlePlayerBusted = useCallback((reason = 'BUSTED!') => {
    triggerGameOverHaptic();
    playGameOverSound();
    juiceRef.current?.shake(10, 10);
    juiceRef.current?.flash(COLORS.danger);

    setLives((l) => {
      const nextLives = l - 1;
      if (nextLives <= 0) {
        setIsGameOver(true);
        juiceRef.current?.popup(`🚨 ${reason}`, 'Caught or failed objective', COLORS.danger);
        return 0;
      } else {
        initLevel(level);
        juiceRef.current?.popup(`⚠️ ${reason}`, `${nextLives} Lives remaining`, COLORS.solarGold);
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
      x: curP.x + dir * 8,
      y: curY - 14,
      vx: dir * 2.8, // Shorter, controlled throw distance (lands ~55-70px away instead of 180px!)
      vy: -2.4, // Gentle upward arc
      active: true,
      life: 60,
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

      // 1. Update Player Movement (Smooth Ladder Climbing OR Walking / Window Hiding)
      if (curPlayer.isClimbing && curPlayer.stairIdx != null) {
        const stair = levelConfig.stairs[curPlayer.stairIdx];
        const yBottom = getFloorY(stair.fromFloor);
        const yTop = getFloorY(stair.toFloor);

        // Cannot hide while climbing on ladders
        curPlayer.isHiding = false;
        curPlayer.hiddenWindowX = null;

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
        // Player is on a floor catwalk: check window hiding vs walking
        if (curPlayer.isHiding) {
          // If player is currently hidden inside a window, movement steps out of the window
          if (inputDirRef.current !== 0) {
            curPlayer.isHiding = false;
            curPlayer.hiddenWindowX = null;
            isSneakRef.current = false;
            curPlayer.x += inputDirRef.current * 2.6;
            curPlayer.facing = inputDirRef.current;
          }
        } else {
          // Normal horizontal walking on platform
          if (inputDirRef.current !== 0) {
            curPlayer.x += inputDirRef.current * 2.6;
            curPlayer.facing = inputDirRef.current;
          }
          curPlayer.x = Math.max(30, Math.min(ARENA_W - 30, curPlayer.x));

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
      }

      // 2. Update Guards Patrol & Alert Distractions
      curGuards.forEach((g) => {
        if (g.alertTimer > 0) {
          g.alertTimer -= 1;
        }

        if (g.isInvestigating) {
          // Guard is actively moving towards where the stone landed!
          const distToNoise = g.investigateTargetX - g.x;
          if (Math.abs(distToNoise) > 5) {
            g.dir = distToNoise > 0 ? 1 : -1;
            g.x += g.dir * (g.investigateSpeed || g.speed * 0.95);
            g.x = Math.max(g.minX, Math.min(g.maxX, g.x));
          } else {
            // Reached the spot where stone landed! Looks around
            g.x = g.investigateTargetX;
            g.investigateTimer = (g.investigateTimer || 0) - 1;
            if (g.investigateTimer <= 0) {
              g.isInvestigating = false;
              g.pauseTimer = 25; // brief pause before resuming normal patrol
            }
          }
        } else if (g.pauseTimer > 0) {
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
          // Stone hit floor: make sound & alert guards on this floor to walk towards it!
          playSnapTickSound();
          triggerLightHaptic();
          juiceRef.current?.burst(st.x, st.y, '#FFE600', 14);

          curGuards.forEach((g) => {
            if (g.floor === hitFloor) {
              const dist = Math.abs(g.x - st.x);
              if (dist < 180) {
                // Guard hears stone! Walk towards impact point to investigate
                g.isInvestigating = true;
                g.investigateTargetX = Math.max(g.minX, Math.min(g.maxX, st.x));
                g.investigateTimer = 110;
                g.alertTimer = 110;
                g.pauseTimer = 0; // Don't stay frozen!
                g.dir = g.investigateTargetX > g.x ? 1 : -1;
                g.investigateSpeed = Math.max(0.85, g.speed * 0.95);
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
      // Only detected if player is NOT hidden in a window, not escaping in car, and aligns with guard level
      if (!curPlayer.isHiding && !carStateRef.current.isEscaping && !carStateRef.current.thiefInside) {
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

      // 5. Update Rival AI Thief: Sneaks, Hides from Guards, Snatches Diamond, Pursues Player, Escapes to Screen Edge
      if (levelConfig.hasRival && curRival.isAlive) {
        if (curRival.snatchCooldown > 0) curRival.snatchCooldown -= 1;
        if (curRival.hideTimer > 0) curRival.hideTimer -= 1;

        // Check if there is a guard on rival's floor
        const guardOnFloor = curGuards.find((g) => g.floor === curRival.floor);
        let guardThreat = false;
        let distToGuard = 999;
        let guardFacingRival = false;

        if (guardOnFloor) {
          distToGuard = curRival.x - guardOnFloor.x;
          guardFacingRival =
            (guardOnFloor.dir === 1 && distToGuard > 0) ||
            (guardOnFloor.dir === -1 && distToGuard < 0);
          const absDist = Math.abs(distToGuard);

          // Threat if guard is facing rival within 110px
          if (guardFacingRival && absDist < 110) {
            guardThreat = true;
          }

          // Caught in guard flashlight cone while NOT hiding
          if (!curRival.isHiding && guardFacingRival && absDist < FLASHLIGHT_LEN) {
            guardOnFloor.alertTimer = 60;
            if (curRival.hasDiamond) {
              curRival.hasDiamond = false;
              levelConfig.diamond.floor = curRival.floor;
              levelConfig.diamond.x = Math.max(30, Math.min(ARENA_W - 30, curRival.x));
              diamondTakenRef.current = false;
              setDiamondTaken(false);
              triggerSliceHaptic();
              playSliceSound();
              juiceRef.current?.popup('🚨 GUARD SPOTTED RIVAL!', 'Rival dropped the diamond!', '#FFE600');
            }
          }
        }

        // HIDING LOGIC:
        if (curRival.isHiding) {
          if (guardThreat) {
            curRival.hideTimer = 35; // keep hiding while guard approaches
          } else if (curRival.hideTimer <= 0) {
            // Guard turned away or safe -> emerge from hiding
            curRival.isHiding = false;
            curRival.hiddenWindowX = null;
          }
        } else if (guardThreat) {
          // Guard approaching! Find nearest window on this floor to HIDE!
          let bestWin = WINDOW_X_LIST[0];
          let bestDist = Infinity;
          for (const wx of WINDOW_X_LIST) {
            const d = Math.abs(curRival.x - wx);
            if (d < bestDist) {
              bestDist = d;
              bestWin = wx;
            }
          }

          if (Math.abs(curRival.x - bestWin) <= 6) {
            curRival.x = bestWin;
            curRival.isHiding = true;
            curRival.hiddenWindowX = bestWin;
            curRival.hideTimer = 40;
          } else {
            // Sneak-sprint to window
            curRival.facing = curRival.x < bestWin ? 1 : -1;
            curRival.x += curRival.facing * 2.2;
          }
        } else {
          // SAFE TO SNEAK, PURSUE OR ESCAPE
          const hasD = curRival.hasDiamond;
          const playerHasD = curPlayer.hasDiamond || hasDiamondRef.current;

          let targetFloor = 0;
          let targetX = 0;
          let isEscaping = false;

          if (hasD) {
            // Rival has diamond: Escape down to Floor 0, then run to screen end!
            targetFloor = 0;
            const exitX = levelConfig.car.x < 170 ? ARENA_W - 12 : 12;
            targetX = exitX;
            isEscaping = true;
          } else if (playerHasD) {
            // Player has diamond: Rival actively follows player to snatch it back!
            targetFloor = curPlayer.floor;
            targetX = curPlayer.x;
          } else {
            // Diamond uncollected: Rival sneaks up to steal it
            targetFloor = levelConfig.diamond.floor;
            targetX = levelConfig.diamond.x;
          }

          if (curRival.floor < targetFloor) {
            const upStair = levelConfig.stairs.find((s) => s.fromFloor === curRival.floor);
            if (upStair) {
              if (Math.abs(curRival.x - upStair.x) < 6) {
                curRival.floor += 1;
                curRival.x = upStair.x;
              } else {
                curRival.facing = curRival.x < upStair.x ? 1 : -1;
                const speed = playerHasD ? 2.0 : 1.5;
                curRival.x += curRival.facing * speed;
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
                const speed = isEscaping ? 2.4 : 1.6;
                curRival.x += curRival.facing * speed;
              }
            }
          } else {
            // Same floor as target:
            if (isEscaping && curRival.floor === 0) {
              // SPRINT TOWARDS SCREEN END TO ESCAPE!
              curRival.facing = curRival.x < targetX ? 1 : -1;
              curRival.x += curRival.facing * 2.5;

              // Check if reached screen edge
              const reachedEdge =
                (targetX > 170 && curRival.x >= targetX - 4) ||
                (targetX < 170 && curRival.x <= targetX + 4);

              if (reachedEdge) {
                curRival.isAlive = false;
                handlePlayerBusted('RIVAL THIEF ESCAPED WITH THE DIAMOND!');
                juiceRef.current?.popup('❌ HEIST FAILED!', 'Rival escaped with the loot!', COLORS.danger);
                return;
              }
            } else if (playerHasD && curRival.floor === curPlayer.floor) {
              // PURSUING PLAYER TO SNATCH DIAMOND BACK!
              curRival.facing = curRival.x < curPlayer.x ? 1 : -1;
              curRival.x += curRival.facing * 2.0;

              // If reaches player and player is NOT hiding: SNATCH BACK!
              if (
                Math.abs(curRival.x - curPlayer.x) < 22 &&
                !curPlayer.isHiding &&
                !curPlayer.isClimbing &&
                curRival.snatchCooldown <= 0
              ) {
                curRival.hasDiamond = true;
                curPlayer.hasDiamond = false;
                hasDiamondRef.current = false;
                curRival.snatchCooldown = 75;
                triggerMediumHaptic();
                playSliceSound();
                juiceRef.current?.burst(curPlayer.x, getFloorY(curPlayer.floor), '#FF0055', 20);
                juiceRef.current?.popup('⚠️ RIVAL SNATCHED DIAMOND!', 'Chase him before he reaches the exit!', '#FF0055');
              }
            } else if (!hasD && !diamondTakenRef.current && curRival.floor === levelConfig.diamond.floor) {
              if (Math.abs(curRival.x - levelConfig.diamond.x) < 8) {
                playSliceSound();
                triggerMediumHaptic();
                juiceRef.current?.popup('⚠️ RIVAL STOLE DIAMOND!', 'Intercept him before he escapes!', '#FF0055');
                curRival.hasDiamond = true;
                setDiamondTaken(true);
                diamondTakenRef.current = true;
              } else {
                curRival.facing = curRival.x < levelConfig.diamond.x ? 1 : -1;
                curRival.x += curRival.facing * 1.5;
              }
            }
          }
        }
      }

      // 6. Check Item Pickups: Diamond
      if (!curPlayer.hasDiamond && !diamondTakenRef.current && curPlayer.floor === levelConfig.diamond.floor && !curPlayer.isClimbing) {
        if (Math.abs(curPlayer.x - levelConfig.diamond.x) < 26) {
          curPlayer.hasDiamond = true;
          hasDiamondRef.current = true;
          setDiamondTaken(true);
          diamondTakenRef.current = true;
          try {
            triggerPerfectHaptic();
            playPerfectSound();
            juiceRef.current?.burst(levelConfig.diamond.x, getFloorY(curPlayer.floor), '#00F5FF', 24);
          } catch {}
          if (!levelConfig.requiresPetrol || curPlayer.hasPetrol) {
            juiceRef.current?.popup('💎 DIAMOND SECURED!', 'Escape to the getaway car on Floor 0!', '#00F5FF');
          } else {
            juiceRef.current?.popup('💎 DIAMOND SECURED!', `Now get fuel on Floor ${levelConfig.petrol?.floor || 1}!`, '#00F5FF');
          }
        }
      }

      // 7. Check Item Pickups: Petrol Canister
      if (levelConfig.requiresPetrol && !curPlayer.hasPetrol && levelConfig.petrol && curPlayer.floor === levelConfig.petrol.floor && !curPlayer.isClimbing) {
        if (Math.abs(curPlayer.x - levelConfig.petrol.x) < 26) {
          curPlayer.hasPetrol = true;
          hasPetrolRef.current = true;
          setPetrolTaken(true);
          petrolTakenRef.current = true;
          triggerSelectionHaptic();
          playTapSound();
          juiceRef.current?.burst(levelConfig.petrol.x, getFloorY(curPlayer.floor), '#FFE600', 16);
          juiceRef.current?.popup('⛽ FUEL CANISTER SECURED!', 'Car fueled! Head to Floor 0 to escape!', '#FFE600');
        }
      }

      // 8. Check Item Pickups: Stone Cache Refill
      if (levelConfig.stonePickup && !stonePickupTakenRef.current && curPlayer.floor === levelConfig.stonePickup.floor && !curPlayer.isClimbing) {
        if (Math.abs(curPlayer.x - levelConfig.stonePickup.x) < 24) {
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
        if (Math.abs(curPlayer.x - curRival.x) < 26) {
          curRival.hasDiamond = false;
          curPlayer.hasDiamond = true;
          hasDiamondRef.current = true;
          curRival.snatchCooldown = 75;
          triggerPerfectHaptic();
          playPerfectSound();
          juiceRef.current?.popup('🥷 TACKLED RIVAL!', 'Diamond reclaimed!', COLORS.matrixMint);
        }
      }

      // 10. Check Escape to Car on Ground Floor
      const isGroundFloor = curPlayer.floor === 0 || (curPlayer.y != null && curPlayer.y >= getFloorY(0) - 16);
      const isAtCar = Math.abs(curPlayer.x - carStateRef.current.x) <= 55;
      const playerHasDiamond = curPlayer.hasDiamond || diamondTakenRef.current || hasDiamondRef.current;
      const playerHasPetrol = !levelConfig.requiresPetrol || curPlayer.hasPetrol || petrolTakenRef.current || hasPetrolRef.current;

      if (isGroundFloor && isAtCar && !carStateRef.current.isEscaping) {
        if (playerHasDiamond && playerHasPetrol) {
          inputDirRef.current = 0;
          climbDirRef.current = 0;
          curPlayer.floor = 0;
          curPlayer.y = null;
          curPlayer.isClimbing = false;
          curPlayer.isHiding = false;

          carStateRef.current = {
            ...carStateRef.current,
            isEscaping: true,
            thiefInside: false,
            jumpPhase: 0.05,
            vx: 3.5,
            escapeDir: carStateRef.current.x < 150 ? -1 : 1,
          };
          setCarState({ ...carStateRef.current });
          triggerPerfectHaptic();
          playPerfectSound();
          juiceRef.current?.popup('🚗 JUMPING INTO CAR!', 'Hop into getaway vehicle!', COLORS.matrixMint);
        } else if (playerHasDiamond && !playerHasPetrol) {
          if (!fuelWarningCooldownRef.current) {
            fuelWarningCooldownRef.current = true;
            setTimeout(() => {
              fuelWarningCooldownRef.current = false;
            }, 1800);
            triggerMediumHaptic();
            juiceRef.current?.popup('⛽ NEED FUEL TO START!', `Canister is on Floor ${levelConfig.petrol?.floor || 1}!`, '#FF0055');
          }
        }
      }

      // 11. Update Getaway Car Escape & Jump Sequence
      if (carStateRef.current.isEscaping) {
        const cState = { ...carStateRef.current };
        if (!cState.thiefInside) {
          // Thief hops in an arc directly into the car cabin
          cState.jumpPhase = Math.min(1, cState.jumpPhase + 0.08);
          if (cState.jumpPhase >= 1) {
            cState.jumpPhase = 1;
            cState.thiefInside = true;
            playTapSound();
            triggerMediumHaptic();
            juiceRef.current?.popup('💨 TIRE SCREECH!', 'Escaping the building!', '#FFE600');
          }
        } else {
          // Car accelerates and speeds off the screen
          cState.vx = Math.min(18, cState.vx + 0.8);
          cState.x += cState.escapeDir * cState.vx;

          // Once car has completely driven off screen, show victory popup for next level!
          if (cState.x < -90 || cState.x > ARENA_W + 90) {
            cState.isEscaping = false;
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
        carStateRef.current = cState;
        setCarState(cState);
      }

      // Commit State updates synchronously to both refs and React state!
      playerRef.current = curPlayer;
      guardsRef.current = curGuards;
      rivalRef.current = curRival;
      setPlayer(curPlayer);
      setGuards(curGuards);
      setRival(curRival);
    }, 20);

    return () => clearInterval(interval);
  }, [isPaused, isGameOver, victoryModal, levelConfig, getFloorY, handlePlayerBusted, level, highScore, onScoreUpdate]);

  // Sneak / Hide Toggle: ONLY allows hiding if standing close to a window!
  const handleSneakPressIn = () => {
    if (playerRef.current.isClimbing) {
      triggerLightHaptic();
      juiceRef.current?.popup('CANNOT HIDE ON LADDER', 'Step onto a floor first', '#FF0055');
      return;
    }

    const nearWinX = getNearestWindowX(playerRef.current.x);
    if (nearWinX != null) {
      // Successfully duck inside the window!
      isSneakRef.current = true;
      setPlayer((p) => ({
        ...p,
        x: nearWinX, // Snaps precisely inside the window frame
        isHiding: true,
        hiddenWindowX: nearWinX,
      }));
      triggerSelectionHaptic();
      playSnapTickSound();
      juiceRef.current?.popup('🪟 HIDDEN IN WINDOW', 'Shadow gray silhouette active', '#94A3B8');
    } else {
      // Not close to any window
      triggerLightHaptic();
      juiceRef.current?.popup('NO WINDOW NEARBY!', 'Move close to a window to hide', '#FF0055');
    }
  };

  const handleSneakPressOut = () => {
    isSneakRef.current = false;
    setPlayer((p) => ({
      ...p,
      isHiding: false,
      hiddenWindowX: null,
    }));
  };

  // Next Level Handler (continues to next level and saves progress)
  const handleNextLevel = useCallback(() => {
    const nextLvl = level + 1;
    setLevel(nextLvl);
    saveCurrentLevel(nextLvl);
    initLevel(nextLvl);
  }, [level, initLevel, saveCurrentLevel]);

  // Retry Current Level Handler (continues same level on game over)
  const handleRetryCurrentLevel = useCallback(() => {
    setLives(3);
    setIsGameOver(false);
    initLevel(level);
  }, [level, initLevel]);

  // New Game / Reset Handler (resets to Level 1 ONLY when user explicitly presses new button)
  const handleNewGame = useCallback(() => {
    setLives(3);
    setScore(0);
    setLevel(1);
    setIsGameOver(false);
    saveCurrentLevel(1);
    initLevel(1);
    juiceRef.current?.popup('NEW HEIST STARTED', 'Reset to Level 1', '#00F5FF');
  }, [initLevel, saveCurrentLevel]);

  // Active player vertical position
  const activePlayerY = player.isClimbing && player.y != null ? player.y : getFloorY(player.floor);

  // Check if player is currently close enough to a window to hide
  const isNearWindow = !player.isClimbing && getNearestWindowX(player.x) != null;

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
        onReset={handleNewGame}
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
            <Text style={[styles.statusVal, { color: '#FFE600' }]}>{`LVL ${level} // ${levelConfig.name}`}</Text>
          </View>

          <View style={styles.statusBox}>
            <Text style={styles.statusDim}>STONES</Text>
            <Text style={[styles.statusVal, { color: stones > 0 ? '#FFE600' : 'rgba(255,255,255,0.4)' }]}>
              {`🪨 x${stones}`}
            </Text>
          </View>

          <View style={styles.statusBox}>
            <Text style={styles.statusDim}>FUEL</Text>
            <Text style={[styles.statusVal, { color: (!levelConfig.requiresPetrol || player.hasPetrol) ? COLORS.matrixMint : '#FF0055' }]}>
              {!levelConfig.requiresPetrol ? 'FULL ⛽' : player.hasPetrol ? 'READY ⛽' : 'EMPTY ⚠️'}
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

              {/* Architectural Windows in Noir Comic Style & Window Hiding Spots */}
              {Array.from({ length: levelConfig.floorsCount }).map((_, f) => {
                const fy = getFloorY(f);
                const winY = fy - 48;

                return (
                  <G key={`windows_${f}`}>
                    {WINDOW_X_LIST.map((wx) => {
                      // Skip window if blocked by ground floor car
                      if (f === 0 && Math.abs(wx - levelConfig.car.x) < 32) return null;

                      const isPlayerHiddenHere = player.isHiding && player.floor === f && player.hiddenWindowX === wx;
                      const isRivalHiddenHere = rival.isHiding && rival.floor === f && rival.hiddenWindowX === wx;
                      const isPlayerNearHere = !player.isHiding && !player.isClimbing && player.floor === f && Math.abs(player.x - wx) <= WINDOW_PROXIMITY;

                      return (
                        <G key={`win_${f}_${wx}`}>
                          {/* Outer Window Frame */}
                          <Rect
                            x={wx - 14}
                            y={winY}
                            width={28}
                            height={40}
                            rx={4}
                            fill={isPlayerHiddenHere ? '#0F1322' : isRivalHiddenHere ? '#1A0A26' : (f % 2 === 0 && wx === 170 ? '#FFE60020' : '#070914')}
                            stroke={isPlayerHiddenHere ? '#94A3B8' : isRivalHiddenHere ? '#9D4EDD' : isPlayerNearHere ? '#00F5FF' : 'rgba(0, 245, 255, 0.25)'}
                            strokeWidth={isPlayerHiddenHere ? 2 : isRivalHiddenHere ? 2 : isPlayerNearHere ? 1.6 : 1.2}
                          />

                          {/* Subtle arrow prompt when standing close to this window */}
                          {isPlayerNearHere && (
                            <Polygon
                              points={`${wx},${winY - 2} ${wx - 5},${winY - 8} ${wx + 5},${winY - 8}`}
                              fill="#00F5FF"
                            />
                          )}

                          {/* Interior Window Pane */}
                          <Rect
                            x={wx - 11}
                            y={winY + 3}
                            width={22}
                            height={34}
                            rx={2}
                            fill={isPlayerHiddenHere ? '#1E2333' : '#0B0E1B'}
                          />

                          {/* Thief Hiding INSIDE the Window (Turned completely to Shadow Slate Gray) */}
                          {isPlayerHiddenHere && (
                            <G>
                              {/* Gray Shadow Body */}
                              <Rect
                                x={wx - 6}
                                y={fy - 25}
                                width={12}
                                height={22}
                                rx={3}
                                fill="#334155"
                                stroke="#94A3B8"
                                strokeWidth={1.5}
                              />
                              {/* Gray Shadow Head */}
                              <Circle cx={wx} cy={fy - 27} r={5} fill="#475569" stroke="#94A3B8" strokeWidth={1} />
                              {/* Soft Silver Visor Slit */}
                              <Line
                                x1={wx - 3}
                                y1={fy - 27}
                                x2={wx + player.facing * 4}
                                y2={fy - 27}
                                stroke="#CBD5E1"
                                strokeWidth={1.5}
                              />
                              {/* Gray Shadow Diamond if carried */}
                              {player.hasDiamond && (
                                <Polygon
                                  points={`${wx},${fy - 34} ${wx + 4},${fy - 30} ${wx},${fy - 26} ${wx - 4},${fy - 30}`}
                                  fill="#475569"
                                  stroke="#94A3B8"
                                  strokeWidth={1}
                                />
                              )}
                            </G>
                          )}

                          {/* Rival Hiding INSIDE the Window (Purple Shadow Silhouette) */}
                          {isRivalHiddenHere && (
                            <G>
                              <Rect
                                x={wx - 6}
                                y={fy - 25}
                                width={12}
                                height={22}
                                rx={3}
                                fill="#2A0845"
                                stroke="#9D4EDD"
                                strokeWidth={1.5}
                              />
                              <Circle cx={wx} cy={fy - 27} r={5} fill="#4A1270" stroke="#9D4EDD" strokeWidth={1} />
                              <Line
                                x1={wx - 3}
                                y1={fy - 27}
                                x2={wx + rival.facing * 4}
                                y2={fy - 27}
                                stroke="#FF007F"
                                strokeWidth={1.5}
                              />
                              {rival.hasDiamond && (
                                <Polygon
                                  points={`${wx},${fy - 34} ${wx + 4},${fy - 30} ${wx},${fy - 26} ${wx - 4},${fy - 30}`}
                                  fill="#00F5FF"
                                  stroke="#FFFFFF"
                                  strokeWidth={1}
                                />
                              )}
                            </G>
                          )}

                          {/* Window Mullions / Crossbars (always rendered in front of window interior) */}
                          <Line
                            x1={wx}
                            y1={winY + 3}
                            x2={wx}
                            y2={winY + 37}
                            stroke={isPlayerHiddenHere ? 'rgba(148, 163, 184, 0.5)' : 'rgba(0, 245, 255, 0.2)'}
                            strokeWidth={1}
                          />
                          <Line
                            x1={wx - 11}
                            y1={winY + 20}
                            x2={wx + 11}
                            y2={winY + 20}
                            stroke={isPlayerHiddenHere ? 'rgba(148, 163, 184, 0.5)' : 'rgba(0, 245, 255, 0.2)'}
                            strokeWidth={1}
                          />

                          {/* Architectural Window Sill */}
                          <Rect
                            x={wx - 15}
                            y={winY + 38}
                            width={30}
                            height={3.5}
                            rx={1}
                            fill="#181D2E"
                            stroke={isPlayerHiddenHere ? '#94A3B8' : 'rgba(0, 245, 255, 0.2)'}
                            strokeWidth={1}
                          />
                        </G>
                      );
                    })}
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

              {/* Ground Floor Getaway Car with Animated Escape Beacon & Getaway Drive */}
              <G>
                {/* Active Escape Zone indicator when diamond & fuel are ready and not yet escaping */}
                {player.hasDiamond && (!levelConfig.requiresPetrol || player.hasPetrol) && !carState.isEscaping && (
                  <G>
                    <Rect
                      x={carState.x - 44}
                      y={getFloorY(0) - 44}
                      width={88}
                      height={18}
                      rx={6}
                      fill="rgba(0, 245, 212, 0.25)"
                      stroke={COLORS.matrixMint}
                      strokeWidth={1.5}
                    />
                    <SvgText
                      x={carState.x}
                      y={getFloorY(0) - 31}
                      fontSize={8}
                      fontWeight="bold"
                      fill={COLORS.matrixMint}
                      textAnchor="middle"
                    >
                      ESCAPE HERE
                    </SvgText>
                    <Polygon
                      points={`${carState.x},${getFloorY(0) - 22} ${carState.x - 7},${getFloorY(0) - 30} ${carState.x + 7},${getFloorY(0) - 30}`}
                      fill={COLORS.matrixMint}
                    />
                  </G>
                )}

                {/* Warning beacon if diamond is ready but petrol still needed */}
                {player.hasDiamond && levelConfig.requiresPetrol && !player.hasPetrol && !carState.isEscaping && (
                  <G>
                    <Rect
                      x={carState.x - 46}
                      y={getFloorY(0) - 44}
                      width={92}
                      height={18}
                      rx={6}
                      fill="rgba(255, 0, 85, 0.25)"
                      stroke="#FF0055"
                      strokeWidth={1.5}
                    />
                    <SvgText
                      x={carState.x}
                      y={getFloorY(0) - 31}
                      fontSize={7.5}
                      fontWeight="bold"
                      fill="#FF0055"
                      textAnchor="middle"
                    >
                      NEED FUEL
                    </SvgText>
                    <Polygon
                      points={`${carState.x},${getFloorY(0) - 22} ${carState.x - 6},${getFloorY(0) - 29} ${carState.x + 6},${getFloorY(0) - 29}`}
                      fill="#FF0055"
                    />
                  </G>
                )}

                {/* Headlight beam shining when car is escaping off screen */}
                {carState.isEscaping && (
                  <Polygon
                    points={`${carState.x + carState.escapeDir * 28},${getFloorY(0) - 14} ${carState.x + carState.escapeDir * 95},${getFloorY(0) - 26} ${carState.x + carState.escapeDir * 95},${getFloorY(0) - 2}`}
                    fill="rgba(255, 230, 0, 0.35)"
                  />
                )}

                {/* Exhaust flames / smoke when driving away */}
                {carState.isEscaping && carState.thiefInside && (
                  <G>
                    <Circle cx={carState.x - carState.escapeDir * 32} cy={getFloorY(0) - 10} r={5} fill="#FF0055" opacity={0.8} />
                    <Circle cx={carState.x - carState.escapeDir * 42} cy={getFloorY(0) - 11} r={7} fill="#FFE600" opacity={0.6} />
                    <Circle cx={carState.x - carState.escapeDir * 54} cy={getFloorY(0) - 12} r={9} fill="rgba(255,255,255,0.3)" opacity={0.4} />
                  </G>
                )}

                {/* Car Chassis */}
                <Rect x={carState.x - 28} y={getFloorY(0) - 18} width={56} height={16} rx={5} fill="#141829" stroke={player.hasDiamond && (!levelConfig.requiresPetrol || player.hasPetrol) ? COLORS.matrixMint : '#FF0055'} strokeWidth={1.8} />
                <Circle cx={carState.x - 18} cy={getFloorY(0) - 2} r={5} fill="#05060C" stroke={player.hasDiamond && (!levelConfig.requiresPetrol || player.hasPetrol) ? COLORS.matrixMint : '#FF0055'} strokeWidth={1} />
                <Circle cx={carState.x + 18} cy={getFloorY(0) - 2} r={5} fill="#05060C" stroke={player.hasDiamond && (!levelConfig.requiresPetrol || player.hasPetrol) ? COLORS.matrixMint : '#FF0055'} strokeWidth={1} />
                <Polygon
                  points={
                    carState.escapeDir === -1
                      ? `${carState.x + 12},${getFloorY(0) - 18} ${carState.x - 8},${getFloorY(0) - 18} ${carState.x - 16},${getFloorY(0) - 8} ${carState.x + 18},${getFloorY(0) - 8}`
                      : `${carState.x - 12},${getFloorY(0) - 18} ${carState.x + 8},${getFloorY(0) - 18} ${carState.x + 16},${getFloorY(0) - 8} ${carState.x - 18},${getFloorY(0) - 8}`
                  }
                  fill={carState.thiefInside ? '#00F5FF88' : '#00F5FF44'}
                />

                {/* Thief Head visible through windshield once inside */}
                {carState.thiefInside && (
                  <Circle
                    cx={carState.x + (carState.escapeDir === -1 ? -4 : 4)}
                    cy={getFloorY(0) - 13}
                    r={3.5}
                    fill="#00F5FF"
                  />
                )}
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
              {levelConfig.hasRival && rival.isAlive && !rival.isHiding && (
                <G>
                  <Rect x={rival.x - 6} y={getFloorY(rival.floor) - 24} width={12} height={22} rx={3} fill="#2A0845" stroke="#9D4EDD" strokeWidth={1.4} />
                  <Circle cx={rival.x} cy={getFloorY(rival.floor) - 26} r={5} fill="#9D4EDD" />
                  {rival.hasDiamond && (
                    <Circle cx={rival.x} cy={getFloorY(rival.floor) - 34} r={4} fill="#00F5FF" stroke="#FFFFFF" strokeWidth={1} />
                  )}
                </G>
              )}

              {/* Player Stealth Thief Operative: Hidden when inside window or inside getaway car */}
              {!player.isHiding && !carState.thiefInside && (() => {
                const curThiefX = carState.isEscaping
                  ? player.x + (carState.x - player.x) * carState.jumpPhase
                  : player.x;
                const curThiefY = carState.isEscaping
                  ? activePlayerY - Math.sin(carState.jumpPhase * Math.PI) * 22
                  : activePlayerY;

                return player.isClimbing ? (
                  <G>
                    {/* Gripping Hands on Ladder Rails */}
                    <Line x1={curThiefX - 11} y1={curThiefY - 18} x2={curThiefX - 5} y2={curThiefY - 14} stroke="#00F5FF" strokeWidth={2.2} />
                    <Line x1={curThiefX + 5} y1={curThiefY - 14} x2={curThiefX + 11} y2={curThiefY - 18} stroke="#00F5FF" strokeWidth={2.2} />

                    {/* Body climbing back silhouette */}
                    <Rect
                      x={curThiefX - 6}
                      y={curThiefY - 24}
                      width={12}
                      height={20}
                      rx={3}
                      fill="#080C1E"
                      stroke="#00F5FF"
                      strokeWidth={1.8}
                    />

                    {/* Head */}
                    <Circle cx={curThiefX} cy={curThiefY - 26} r={5} fill="#00F5FF" />

                    {/* Gripping Feet on Ladder Rungs */}
                    <Line x1={curThiefX - 10} y1={curThiefY - 4} x2={curThiefX - 4} y2={curThiefY - 2} stroke="#00F5FF" strokeWidth={2.2} />
                    <Line x1={curThiefX + 4} y1={curThiefY - 2} x2={curThiefX + 10} y2={curThiefY - 4} stroke="#00F5FF" strokeWidth={2.2} />

                    {/* Diamond on operative's back */}
                    {player.hasDiamond && (
                      <Polygon
                        points={`${curThiefX},${curThiefY - 33} ${curThiefX + 5},${curThiefY - 28} ${curThiefX},${curThiefY - 23} ${curThiefX - 5},${curThiefY - 28}`}
                        fill="#00F5FF"
                        stroke="#FFFFFF"
                        strokeWidth={1.2}
                      />
                    )}
                  </G>
                ) : (
                  <G>
                    <Rect
                      x={curThiefX - 7}
                      y={curThiefY - 26}
                      width={14}
                      height={24}
                      rx={3}
                      fill="#080C1E"
                      stroke="#00F5FF"
                      strokeWidth={1.8}
                    />
                    <Circle cx={curThiefX} cy={curThiefY - 28} r={5} fill="#00F5FF" />
                    <Line
                      x1={curThiefX - 4}
                      y1={curThiefY - 28}
                      x2={curThiefX + player.facing * 5}
                      y2={curThiefY - 28}
                      stroke="#FFFFFF"
                      strokeWidth={2}
                    />
                    {player.hasDiamond && (
                      <Circle cx={curThiefX} cy={curThiefY - 36} r={5} fill="#00F5FF" stroke="#FFFFFF" strokeWidth={1.5} />
                    )}
                  </G>
                );
              })()}
            </Svg>
          </View>
        </View>

        {/* Tactical Control Bar: Horizontal Walk, Smooth Ladder Climb, Stone Distractor & Window Hide */}
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

          {/* Actions: Distractor Stone Throw & Window Hide */}
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

            {/* Window Hide Button: Highlights when standing close to a window */}
            <Pressable
              style={({ pressed }) => [
                styles.sneakBtn,
                isNearWindow && styles.sneakBtnAvailable,
                player.isHiding && styles.sneakBtnActive,
                !isNearWindow && !player.isHiding && styles.sneakBtnDimmed,
                pressed && styles.sneakBtnPressed,
              ]}
              onPressIn={handleSneakPressIn}
              onPressOut={handleSneakPressOut}
            >
              <Text style={styles.sneakIcon}>🪟</Text>
              <Text style={[styles.sneakText, player.isHiding && { color: '#94A3B8' }]}>
                {player.isHiding ? 'INSIDE' : isNearWindow ? 'HIDE' : 'NO WIN'}
              </Text>
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
        onNextLevel={handleNextLevel}
        onNext={handleNextLevel}
        onRetry={handleNextLevel}
        onBackToHub={onBackToHub}
      />

      {/* Game Over Modal */}
      <GameResultModal
        visible={isGameOver}
        type="GAME_OVER"
        title="HEIST COMPROMISED"
        subtitle={`Security lockdown on Level ${level}. Operative detected.`}
        score={score}
        bestScore={highScore}
        accentColor="#FF0055"
        buttonText="RETRY LEVEL ▶"
        onRetry={handleRetryCurrentLevel}
        onRestart={handleRetryCurrentLevel}
        onNextLevel={handleRetryCurrentLevel}
        onNext={handleRetryCurrentLevel}
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
    backgroundColor: '#151926',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sneakBtnAvailable: {
    borderColor: '#00F5FF',
    backgroundColor: '#142338',
  },
  sneakBtnActive: {
    backgroundColor: '#334155',
    borderColor: '#94A3B8',
    transform: [{ scale: 0.94 }],
  },
  sneakBtnDimmed: {
    opacity: 0.5,
  },
  sneakBtnPressed: {
    transform: [{ scale: 0.94 }],
  },
  sneakIcon: {
    fontSize: 15,
  },
  sneakText: {
    fontFamily: monoFont,
    fontSize: 7.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
