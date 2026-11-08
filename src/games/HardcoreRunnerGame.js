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

// Cube and physics parameters
const CUBE_SIZE = 22;
const SPEED = 4.8;
const GRAVITY = 0.52;
const JUMP_VELOCITY = -8.2;
const CORRIDOR_HEIGHT = 120;

// Phase Thresholds in Distance (Endless Mode Progression)
const PHASE_THRESHOLDS = [
  { phase: 1, name: 'CUBE PROTOCOL', desc: 'BASIC HURDLE RUN', startDist: 0, color: '#FFE600' },
  { phase: 2, name: 'SPIKE MATRIX', desc: 'SHARP GROUND SPIKES', startDist: 1000, color: '#FF0055' },
  { phase: 3, name: 'AERO-DROP HAZARDS', desc: 'ARROW SPIKES SLAMMING DOWN', startDist: 2400, color: '#FF6D00' },
  { phase: 4, name: 'PLASMA TURRET BARRAGE', desc: 'CEILING MOUNTED HOMING CANNONS', startDist: 4000, color: '#00F5FF' },
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

/**
 * Returns the exact ground elevation at worldX along the segmented terrain path.
 * Supports:
 * - STRAIGHT: Flat horizontal line
 * - SMOOTH: Gentle sine wave hills and dips
 * - SHARP: Angular zigzag ridges and plateaus
 * - RAMP: Elevated launch ramps and highway descents
 */
function getGroundSurfaceAtX(worldX, segments, baseFloorY) {
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    if (worldX >= s.x && worldX <= s.x + s.w) {
      if (s.type === 'SMOOTH') {
        const t = (worldX - s.x) / s.w;
        return baseFloorY - s.amp * Math.sin(Math.PI * t);
      } else if (s.type === 'SHARP') {
        const relX = worldX - s.x;
        const upW = s.upW || 35;
        const platW = s.platW || 80;
        const downW = s.downW || 35;
        const h = s.h || 24;
        if (relX < upW) {
          return baseFloorY - (relX / upW) * h;
        } else if (relX < upW + platW) {
          return baseFloorY - h;
        } else {
          const downRel = relX - (upW + platW);
          return baseFloorY - h * (1 - Math.min(1, downRel / downW));
        }
      } else if (s.type === 'RAMP') {
        const relX = worldX - s.x;
        const upW = s.upW || 55;
        const platW = s.platW || 110;
        const downW = s.downW || 55;
        const h = s.h || 30;
        if (relX < upW) {
          return baseFloorY - (relX / upW) * h;
        } else if (relX < upW + platW) {
          return baseFloorY - h;
        } else {
          const downRel = relX - (upW + platW);
          return baseFloorY - h * (1 - Math.min(1, downRel / downW));
        }
      }
      return baseFloorY;
    }
  }
  return baseFloorY;
}

/**
 * Calculate tangent slope angle in degrees at worldX for tilting the player cube
 */
function getGroundSlopeAngle(worldX, segments, baseFloorY) {
  const y1 = getGroundSurfaceAtX(worldX - 3, segments, baseFloorY);
  const y2 = getGroundSurfaceAtX(worldX + 3, segments, baseFloorY);
  const slope = (y2 - y1) / 6;
  return Math.atan(slope) * (180 / Math.PI);
}

// Generate static ambient background stars
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

// Cute Space Pals roaming outside the 2 corridor lines
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
    },
  ];
}

export default function HardcoreRunnerGame({ onBackToHub, onScoreUpdate, isPaused = false }) {
  const isPausedRef = useRef(isPaused);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

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

  // Consolidated 60 FPS visual state
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

  // Physics refs
  const playerYRef = useRef(groundY);
  const playerVyRef = useRef(0);
  const distanceRef = useRef(0);
  const rotationRef = useRef(0);
  const segmentsRef = useRef([]);
  const obstaclesRef = useRef([]);
  const turretsRef = useRef([]);
  const projectilesRef = useRef([]);
  const gapsRef = useRef([]);
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
   * Procedural Endless World Spawner.
   * Path alternates between:
   * - STRAIGHT (ONLY terrain where static cubes and spikes spawn)
   * - SMOOTH (gentle sine wave hills)
   * - SHARP (angular cyber ridges)
   * - RAMP (elevated launch ramps)
   * Ceiling turrets spawn mounted at the top line and shoot at the player.
   */
  const spawnAhead = useCallback((targetWorldX) => {
    let curX = spawnCursorXRef.current;
    const newSegments = [];
    const newObs = [];
    const newTurrets = [];
    const newGaps = [];

    const terrainTypes = ['STRAIGHT', 'SMOOTH', 'STRAIGHT', 'SHARP', 'STRAIGHT', 'RAMP'];

    while (curX < targetWorldX) {
      const terrainType = terrainTypes[Math.floor(Math.random() * terrainTypes.length)];

      if (terrainType === 'STRAIGHT') {
        const segW = 340 + Math.floor(Math.random() * 140);
        newSegments.push({
          id: `seg_str_${curX}`,
          type: 'STRAIGHT',
          x: curX,
          w: segW,
        });

        // ONLY on STRAIGHT sections: spawn static cubes, ground spikes, or void gaps!
        const randChoice = Math.random();
        if (randChoice < 0.32) {
          // Static cube block
          newObs.push({
            id: `blk_${curX}`,
            type: 'BLOCK',
            x: curX + 130 + Math.random() * (segW - 200),
            w: 24,
            h: 22,
          });
        } else if (randChoice < 0.60) {
          // Ground spikes (single or double)
          const isDouble = Math.random() > 0.5;
          const spX = curX + 120 + Math.random() * (segW - 220);
          newObs.push({
            id: `sp_1_${spX}`,
            type: 'SPIKE_BOTTOM',
            x: spX,
            w: 22,
            h: 22,
          });
          if (isDouble) {
            newObs.push({
              id: `sp_2_${spX}`,
              type: 'SPIKE_BOTTOM',
              x: spX + 22,
              w: 22,
              h: 22,
            });
          }
        } else if (randChoice < 0.82) {
          // Void gap (well-centered within straight section so player has runway before and after)
          const gapW = 88;
          const gapX = curX + 110 + Math.random() * (segW - gapW - 140);
          newGaps.push({
            id: `gap_${gapX}`,
            x: gapX,
            w: gapW,
          });
        }

        // Ceiling Turret chance
        if (Math.random() < 0.45) {
          newTurrets.push({
            id: `turret_${curX}`,
            x: curX + segW * 0.5,
            y: ceilingY,
            fired: false,
          });
        }

        // Aero-Drop Spike chance
        if (Math.random() < 0.35) {
          newObs.push({
            id: `sp_drop_${curX}`,
            type: 'SPIKE_DROP',
            x: curX + segW * 0.7,
            w: 22,
            h: 24,
          });
        }

        curX += segW;
      } else if (terrainType === 'SMOOTH') {
        // Smooth sine wave hill
        const segW = 300 + Math.floor(Math.random() * 80);
        const amp = 22 + Math.floor(Math.random() * 8);
        newSegments.push({
          id: `seg_sm_${curX}`,
          type: 'SMOOTH',
          x: curX,
          w: segW,
          amp,
        });

        // Turret or drop spike can appear above smooth hills, but NEVER static ground cubes or spikes
        if (Math.random() < 0.4) {
          newTurrets.push({
            id: `turret_${curX}`,
            x: curX + segW * 0.5,
            y: ceilingY,
            fired: false,
          });
        }

        curX += segW;
      } else if (terrainType === 'SHARP') {
        // Sharp angular cyber ridge (steep up, flat crest, steep down)
        const upW = 35;
        const platW = 75 + Math.floor(Math.random() * 30);
        const downW = 35;
        const h = 24;
        const segW = upW + platW + downW;
        newSegments.push({
          id: `seg_shp_${curX}`,
          type: 'SHARP',
          x: curX,
          w: segW,
          upW,
          platW,
          downW,
          h,
        });

        // NO static cubes and NO spikes on sharp ridges
        if (Math.random() < 0.4) {
          newTurrets.push({
            id: `turret_${curX}`,
            x: curX + upW + platW * 0.5,
            y: ceilingY,
            fired: false,
          });
        }

        curX += segW;
      } else if (terrainType === 'RAMP') {
        // Elevated launch ramp
        const upW = 55;
        const platW = 95 + Math.floor(Math.random() * 35);
        const downW = 55;
        const h = 30;
        const segW = upW + platW + downW;
        newSegments.push({
          id: `seg_ramp_${curX}`,
          type: 'RAMP',
          x: curX,
          w: segW,
          upW,
          platW,
          downW,
          h,
        });

        // NO static cubes and NO spikes on ramps
        if (Math.random() < 0.4) {
          newTurrets.push({
            id: `turret_${curX}`,
            x: curX + upW + platW * 0.5,
            y: ceilingY,
            fired: false,
          });
        }

        curX += segW;
      }
    }

    spawnCursorXRef.current = curX;
    if (newSegments.length > 0) {
      segmentsRef.current = [...segmentsRef.current, ...newSegments];
    }
    if (newObs.length > 0) {
      obstaclesRef.current = [...obstaclesRef.current, ...newObs];
    }
    if (newTurrets.length > 0) {
      turretsRef.current = [...turretsRef.current, ...newTurrets];
    }
    if (newGaps.length > 0) {
      gapsRef.current = [...gapsRef.current, ...newGaps];
    }
  }, [ceilingY]);

  // Initialize level
  const initLevel = useCallback(() => {
    playerYRef.current = groundY;
    playerVyRef.current = 0;
    distanceRef.current = 0;
    rotationRef.current = 0;
    spawnCursorXRef.current = 0;
    tickCountRef.current = 0;
    segmentsRef.current = [];
    obstaclesRef.current = [];
    turretsRef.current = [];
    projectilesRef.current = [];
    gapsRef.current = [];

    // Initial safe runway
    segmentsRef.current.push({
      id: 'init_runway',
      type: 'STRAIGHT',
      x: 0,
      w: 520,
    });
    spawnCursorXRef.current = 520;

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

    // Spawn ahead into the distance
    spawnAhead(1600);
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
    const playerLeftX = curDist + playerScreenX;
    const playerRightX = playerLeftX + CUBE_SIZE;
    const curPlayerCenterX = playerLeftX + CUBE_SIZE * 0.5;

    const currentFloor = getGroundSurfaceAtX(curPlayerCenterX, segmentsRef.current, floorY);
    const targetSurfaceY = currentFloor - CUBE_SIZE;

    // Accurate gap test: Player ONLY falls if their entire base has completely crossed over the edge
    const isOverGap = gapsRef.current.some(
      (g) => playerLeftX >= g.x && playerRightX <= g.x + g.w + 2
    );

    const isGrounded = !isOverGap && playerYRef.current >= targetSurfaceY - 6;

    if (isGrounded) {
      playerVyRef.current = JUMP_VELOCITY;
      playTapSound();
      triggerLightHaptic();
    }
  };

  // 60 FPS Physics & Game Loop
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

      // Phase updates
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

      // Dynamically spawn more track ahead
      if (spawnCursorXRef.current < nextDist + arenaWidth + 900) {
        spawnAhead(nextDist + arenaWidth + 1800);
      }

      // Periodic cull
      if (tickCountRef.current % 120 === 0) {
        segmentsRef.current = segmentsRef.current.filter((s) => s.x + s.w > nextDist - 250);
        obstaclesRef.current = obstaclesRef.current.filter((o) => o.x > nextDist - 250);
        turretsRef.current = turretsRef.current.filter((t) => t.x > nextDist - 250);
        gapsRef.current = gapsRef.current.filter((g) => g.x + g.w > nextDist - 250);
        projectilesRef.current = projectilesRef.current.filter((p) => p.x > nextDist - 300);
      }

      // Update roaming space pals
      const ships = npcShipsRef.current;
      for (let i = 0; i < ships.length; i++) {
        const ship = ships[i];
        ship.x += ship.speed * ship.dir;
        if (ship.dir === 1 && ship.x > arenaWidth + 60) {
          ship.x = -60;
        } else if (ship.dir === -1 && ship.x < -60) {
          ship.x = arenaWidth + 60;
        }
      }

      // Player coordinate calculations
      const playerLeftX = nextDist + playerScreenX;
      const playerRightX = playerLeftX + CUBE_SIZE;
      const curPlayerCenterX = playerLeftX + CUBE_SIZE * 0.5;

      const curFloorSurface = getGroundSurfaceAtX(curPlayerCenterX, segmentsRef.current, floorY);
      const targetGroundY = curFloorSurface - CUBE_SIZE;

      // FIXED GAP COLLISION:
      // Player only falls if their rear edge has left the solid ground (playerLeftX >= g.x)
      // and front edge has not landed on the other side (playerRightX <= g.x + g.w + 2).
      // They NEVER fall before reaching the gap!
      const isOverGap = gapsRef.current.some(
        (g) => playerLeftX >= g.x && playerRightX <= g.x + g.w + 2
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
        if (nextY > floorY + 36) {
          handleCrash('VOID_FALL');
          return;
        }
      }

      playerVyRef.current = nextVy;
      playerYRef.current = nextY;

      // Cube Rotation: Tilts along slope when grounded, spins when airborne
      let nextRot = 0;
      if (!isGrounded) {
        nextRot = (rotationRef.current + 8) % 360;
        rotationRef.current = nextRot;
      } else {
        const slopeDeg = getGroundSlopeAngle(curPlayerCenterX, segmentsRef.current, floorY);
        rotationRef.current = slopeDeg;
        nextRot = slopeDeg;
      }

      // CEILING MOUNTED TURRETS: Aim at player & shoot plasma projectiles!
      const pMidX = playerScreenX + CUBE_SIZE / 2;
      const pMidY = nextY + CUBE_SIZE / 2;

      const turrets = turretsRef.current;
      for (let i = 0; i < turrets.length; i++) {
        const turret = turrets[i];
        const tScreenX = turret.x - nextDist + playerScreenX;

        // When player is approaching within firing distance: turret shoots towards player!
        if (!turret.fired && tScreenX - pMidX < 320 && tScreenX - pMidX > 90) {
          turret.fired = true;

          const dx = pMidX - tScreenX;
          const dy = pMidY - (ceilingY + 12);
          const dist = Math.hypot(dx, dy) || 1;
          const projSpeed = 5.2;

          projectilesRef.current.push({
            id: `plasma_${turret.id}_${Math.random()}`,
            x: turret.x,
            y: ceilingY + 12,
            vx: (dx / dist) * projSpeed,
            vy: (dy / dist) * projSpeed,
            color: '#00F5FF',
          });
        }
      }

      // UPDATE ACTIVE PLASMA PROJECTILES & HIT CHECKS
      const projs = projectilesRef.current;
      for (let i = projs.length - 1; i >= 0; i--) {
        const p = projs[i];
        p.x += p.vx;
        p.y += p.vy;

        const projScreenX = p.x - nextDist + playerScreenX;
        const projScreenY = p.y;

        // Collision with player cube
        const distToCube = Math.hypot(projScreenX - pMidX, projScreenY - pMidY);
        if (distToCube < CUBE_SIZE * 0.68) {
          handleCrash('PROJECTILE');
          return;
        }

        // Remove if offscreen or past floor
        if (projScreenX < -60 || projScreenY > floorY + 40) {
          projs.splice(i, 1);
        }
      }

      // Single consolidated frame state update
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
            spikeY = ceilingY;
          } else if (distToPlayer <= 170) {
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

  // Viewport culling for visible elements
  const visibleSegments = segmentsRef.current.filter((s) => {
    const sX = s.x - distance + playerScreenX;
    return sX + s.w > -60 && sX < arenaWidth + 60;
  });

  const visibleGaps = gapsRef.current.filter((g) => {
    const sX = g.x - distance + playerScreenX;
    return sX + g.w > -50 && sX < arenaWidth + 50;
  });

  const visibleObstacles = obstaclesRef.current.filter((obs) => {
    const sX = obs.x - distance + playerScreenX;
    return sX > -60 && sX < arenaWidth + 60;
  });

  const visibleTurrets = turretsRef.current.filter((t) => {
    const sX = t.x - distance + playerScreenX;
    return sX > -60 && sX < arenaWidth + 60;
  });

  const pMidX = playerScreenX + CUBE_SIZE / 2;
  const pMidY = playerY + CUBE_SIZE / 2;

  return (
    <View style={styles.container}>
      <MiniGameHeader
        floorNum={25}
        gameTitle="CUBE DASH"
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
            <LinearGradient id="rampGlow" x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0%" stopColor="#00F5FF" stopOpacity="0.08" />
              <Stop offset="100%" stopColor="#00F5FF" stopOpacity="0.3" />
            </LinearGradient>
          </Defs>

          {/* GALAXY DEEP SPACE BACKGROUND */}
          <Circle cx={arenaWidth * 0.22} cy={arenaHeight * 0.18} r={120} fill="url(#nebulaViolet)" />
          <Circle cx={arenaWidth * 0.82} cy={arenaHeight * 0.82} r={140} fill="url(#nebulaCyan)" />

          {/* Ambient Parallax Galaxy Stars */}
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

          {/* ROAMING CUTE SPACE PALS */}
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
                    <Polygon points="-8,7 8,7 15,22 -15,22" fill="rgba(0, 245, 212, 0.18)" />
                    <Circle cx={0} cy={-5} r={9} fill="rgba(0, 245, 212, 0.4)" stroke="#00F5D4" strokeWidth={1.5} />
                    <Circle cx={0} cy={-5} r={5} fill="#39FF14" />
                    <Circle cx={-2} cy={-6} r={1.2} fill="#050510" />
                    <Circle cx={2} cy={-6} r={1.2} fill="#050510" />
                    <Circle cx={-3.2} cy={-3.5} r={1} fill="#FF007F" opacity={0.7} />
                    <Circle cx={3.2} cy={-3.5} r={1} fill="#FF007F" opacity={0.7} />
                    <Rect x={-18} y={-1} width={36} height={8} rx={4} fill="#FF70A6" stroke="#FFFFFF" strokeWidth={1.4} />
                    <Circle cx={-10} cy={3} r={1.6} fill="#FFE600" />
                    <Circle cx={0} cy={3} r={1.6} fill="#FFE600" />
                    <Circle cx={10} cy={3} r={1.6} fill="#FFE600" />
                  </G>
                )}

                {ship.type === 'CHIBI_ROCKET' && (
                  <G>
                    <Circle cx={-16} cy={0} r={3.5} fill="#FFE600" />
                    <Circle cx={-21} cy={0} r={2} fill="#FF6D00" />
                    <Polygon points="-8,-8 -13,-12 -11,-3" fill="#7928CA" />
                    <Polygon points="-8,8 -13,12 -11,3" fill="#7928CA" />
                    <Path
                      d="M 15 0 C 11 -7 -7 -7 -11 -4 C -12 0 -12 0 -11 4 C -7 7 11 7 15 0 Z"
                      fill="#FFFFFF"
                      stroke="#00F5FF"
                      strokeWidth={1.5}
                    />
                    <Path d="M 15 0 C 12 -3.5 8 -3.5 8 0 C 8 3.5 12 3.5 15 0 Z" fill="#FF007F" />
                    <Circle cx={-1} cy={0} r={4.5} fill="#180A2E" stroke="#FFE600" strokeWidth={1.2} />
                    <Circle cx={-2} cy={-0.8} r={0.9} fill="#00F5FF" />
                    <Circle cx={0.5} cy={-0.8} r={0.9} fill="#00F5FF" />
                  </G>
                )}

                {ship.type === 'STAR_KITTY' && (
                  <G>
                    <Circle cx={-16} cy={0} r={2.5} fill="#FFB3C6" opacity={0.7} />
                    <Circle cx={-22} cy={0} r={1.5} fill="#FF70A6" opacity={0.5} />
                    <Polygon points="-8,-8 -4,-16 0,-10" fill="#FF70A6" stroke="#FFFFFF" strokeWidth={1} />
                    <Polygon points="2,-10 6,-16 10,-8" fill="#FF70A6" stroke="#FFFFFF" strokeWidth={1} />
                    <Circle cx={0} cy={0} r={11} fill="#FFE5EC" stroke="#FF70A6" strokeWidth={1.5} />
                    <Circle cx={0} cy={0} r={11} fill="none" stroke="rgba(0, 245, 255, 0.45)" strokeWidth={1.2} />
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

          {/* TOP CEILING CORRIDOR LINE */}
          <Line
            x1={-20}
            y1={ceilingY}
            x2={arenaWidth + 20}
            y2={ceilingY}
            stroke="#9D4EDD"
            strokeWidth={3}
          />

          {/* CEILING-MOUNTED UPPER TURRETS (Rotating toward & shooting at player cube!) */}
          {visibleTurrets.map((turret) => {
            const tScreenX = turret.x - distance + playerScreenX;
            const tScreenY = ceilingY;

            // Angle towards player cube
            const dx = pMidX - tScreenX;
            const dy = pMidY - (tScreenY + 6);
            const aimAngleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
            // Relative rotation for downward-pointing barrel
            const barrelRot = aimAngleDeg - 90;

            const isAiming = tScreenX - pMidX < 360 && tScreenX - pMidX > 40;

            return (
              <G key={turret.id}>
                {/* Red Target Laser Line (Telegraph when aiming) */}
                {isAiming && (
                  <Line
                    x1={tScreenX}
                    y1={tScreenY + 8}
                    x2={pMidX}
                    y2={pMidY}
                    stroke="#FF0055"
                    strokeWidth={1.2}
                    strokeDasharray="4,4"
                    opacity={0.6}
                  />
                )}

                {/* Ceiling Mount Base Plate */}
                <Rect
                  x={tScreenX - 16}
                  y={tScreenY - 4}
                  width={32}
                  height={8}
                  rx={3}
                  fill="#1C0B38"
                  stroke="#9D4EDD"
                  strokeWidth={1.6}
                />
                <Circle cx={tScreenX - 10} cy={tScreenY} r={1.5} fill="#FFE600" />
                <Circle cx={tScreenX + 10} cy={tScreenY} r={1.5} fill="#FFE600" />

                {/* Swivel Pivot Dome */}
                <Circle
                  cx={tScreenX}
                  cy={tScreenY + 6}
                  r={8}
                  fill="#14092A"
                  stroke="#00F5FF"
                  strokeWidth={1.8}
                />

                {/* Rotating Turret Cannon Barrels */}
                <G transform={`rotate(${barrelRot}, ${tScreenX}, ${tScreenY + 6})`}>
                  {/* Twin Barrels */}
                  <Rect
                    x={tScreenX - 4}
                    y={tScreenY + 4}
                    width={8}
                    height={16}
                    rx={2}
                    fill="#261048"
                    stroke="#FF0055"
                    strokeWidth={1.4}
                  />
                  {/* Energy Muzzle Glow */}
                  <Circle cx={tScreenX - 2.5} cy={tScreenY + 20} r={2} fill="#FFE600" />
                  <Circle cx={tScreenX + 2.5} cy={tScreenY + 20} r={2} fill="#FFE600" />
                </G>

                {/* Center Core Eye */}
                <Circle cx={tScreenX} cy={tScreenY + 6} r={3} fill="#FF0055" />
                <Circle cx={tScreenX} cy={tScreenY + 6} r={1.2} fill="#FFE600" />
              </G>
            );
          })}

          {/* FIRED PLASMA PROJECTILES FLYING TOWARDS PLAYER */}
          {projectilesRef.current.map((proj) => {
            const sX = proj.x - distance + playerScreenX;
            const sY = proj.y;
            if (sX < -40 || sX > arenaWidth + 50) return null;

            return (
              <G key={proj.id}>
                {/* Plasma Energy Trail */}
                <Line
                  x1={sX - proj.vx * 2.5}
                  y1={sY - proj.vy * 2.5}
                  x2={sX}
                  y2={sY}
                  stroke="#FF0055"
                  strokeWidth={5}
                  strokeLinecap="round"
                  opacity={0.5}
                />
                <Line
                  x1={sX - proj.vx * 1.5}
                  y1={sY - proj.vy * 1.5}
                  x2={sX}
                  y2={sY}
                  stroke="#FFE600"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                {/* Plasma Core Ball */}
                <Circle cx={sX} cy={sY} r={7} fill="#00F5FF" stroke="#FFFFFF" strokeWidth={1.5} />
                <Circle cx={sX} cy={sY} r={3.5} fill="#FFE600" />
              </G>
            );
          })}

          {/* DIVERSE TERRAIN PATH SEGMENTS (Straight, Smooth Waves, Sharp Ridges, Ramps) */}
          {visibleSegments.map((seg) => {
            const sX = seg.x - distance + playerScreenX;

            if (seg.type === 'STRAIGHT') {
              // Flat horizontal line
              return (
                <G key={seg.id}>
                  <Line
                    x1={sX}
                    y1={floorY}
                    x2={sX + seg.w}
                    y2={floorY}
                    stroke="#00F5FF"
                    strokeWidth={3}
                  />
                  {/* Subtle ground guideline glow underneath */}
                  <Line
                    x1={sX}
                    y1={floorY + 3}
                    x2={sX + seg.w}
                    y2={floorY + 3}
                    stroke="rgba(0, 245, 255, 0.25)"
                    strokeWidth={1}
                  />
                </G>
              );
            }

            if (seg.type === 'SMOOTH') {
              // Smooth sine wave hill
              // Cubic bezier control points approximating sine curve
              const cp1X = sX + seg.w * 0.28;
              const cp1Y = floorY - seg.amp * 1.05;
              const cp2X = sX + seg.w * 0.72;
              const cp2Y = floorY - seg.amp * 1.05;
              const pathD = `M ${sX} ${floorY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${sX + seg.w} ${floorY}`;
              const fillD = `${pathD} L ${sX + seg.w} ${floorY} L ${sX} ${floorY} Z`;

              return (
                <G key={seg.id}>
                  {/* Glowing hill fill */}
                  <Path d={fillD} fill="rgba(0, 245, 255, 0.12)" />
                  {/* Smooth neon crest line */}
                  <Path
                    d={pathD}
                    fill="none"
                    stroke="#00F5FF"
                    strokeWidth={3}
                    strokeLinecap="round"
                  />
                </G>
              );
            }

            if (seg.type === 'SHARP') {
              // Sharp angular cyber ridge: steep climb, flat crest, steep descent
              const p1 = `${sX},${floorY}`;
              const p2 = `${sX + seg.upW},${floorY - seg.h}`;
              const p3 = `${sX + seg.upW + seg.platW},${floorY - seg.h}`;
              const p4 = `${sX + seg.w},${floorY}`;

              return (
                <G key={seg.id}>
                  <Polygon
                    points={`${p1} ${p2} ${p3} ${p4}`}
                    fill="rgba(157, 78, 221, 0.18)"
                    stroke="#9D4EDD"
                    strokeWidth={2.5}
                  />
                  <Line
                    x1={sX + seg.upW}
                    y1={floorY - seg.h}
                    x2={sX + seg.upW + seg.platW}
                    y2={floorY - seg.h}
                    stroke="#FFE600"
                    strokeWidth={2.8}
                  />
                </G>
              );
            }

            if (seg.type === 'RAMP') {
              // Elevated Launch Ramp with directional chevrons
              const p1 = `${sX},${floorY}`;
              const p2 = `${sX + seg.upW},${floorY - seg.h}`;
              const p3 = `${sX + seg.upW + seg.platW},${floorY - seg.h}`;
              const p4 = `${sX + seg.w},${floorY}`;

              return (
                <G key={seg.id}>
                  <Polygon
                    points={`${p1} ${p2} ${p3} ${p4}`}
                    fill="url(#rampGlow)"
                    stroke="#00F5FF"
                    strokeWidth={2.5}
                  />
                  {/* Ascending launch arrows */}
                  <Polygon
                    points={`${sX + seg.upW * 0.4},${floorY - seg.h * 0.3} ${sX + seg.upW * 0.55},${floorY - seg.h * 0.6} ${sX + seg.upW * 0.7},${floorY - seg.h * 0.3}`}
                    fill="#FFE600"
                  />
                  {/* High neon runway */}
                  <Line
                    x1={sX + seg.upW}
                    y1={floorY - seg.h}
                    x2={sX + seg.upW + seg.platW}
                    y2={floorY - seg.h}
                    stroke="#FFFFFF"
                    strokeWidth={2.5}
                  />
                </G>
              );
            }

            return null;
          })}

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

          {/* STATIC CUBES & GROUND SPIKES (Spawned ONLY on STRAIGHT path sections) */}
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
