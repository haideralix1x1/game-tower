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
const CORRIDOR_HEIGHT = 118;

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
 * Continuous mathematical elevation profile along the track.
 * Every segment smoothly starts and ends at elevation 0 so the corridor
 * has zero discontinuities and both lines (top and bottom) move up and down together!
 * - STRAIGHT: Flat horizontal baseline (0). Static cubes, spikes & void gaps spawn ONLY here!
 * - SMOOTH: Full sine wave cycle (curves smoothly up to +amp, dips to -amp, returns to 0)
 * - SHARP: Angular cyber peaks and valleys (angles up to +h, slopes down to -h, angles back to 0)
 * - RAMP: Launch ramp climbing up to high highway plateau (+h), then declining back to 0
 */
function getTrackElevation(worldX, segments) {
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    if (worldX >= s.x && worldX < s.x + s.w) {
      const relX = worldX - s.x;
      const t = relX / s.w;

      if (s.type === 'STRAIGHT') {
        return 0;
      }

      if (s.type === 'SMOOTH') {
        // Full smooth sine cycle: starts at 0, climbs to +amp, crosses 0, dips to -amp, ends at 0
        return s.amp * Math.sin(2 * Math.PI * t);
      }

      if (s.type === 'SHARP') {
        // Angular cyber peaks and valleys
        if (t < 0.25) return (t / 0.25) * s.h;
        if (t < 0.50) return (1 - (t - 0.25) / 0.25) * s.h;
        if (t < 0.75) return -((t - 0.50) / 0.25) * s.h;
        return -((1 - (t - 0.75) / 0.25)) * s.h;
      }

      if (s.type === 'RAMP') {
        // Elevated launch ramp to highway plateau
        if (t < 0.22) return (t / 0.22) * s.h;
        if (t < 0.78) return s.h;
        return (1 - (t - 0.78) / 0.22) * s.h;
      }
    }
  }
  return 0;
}

/**
 * Slope calculation for tilting the player cube parallel to the track angle
 */
function getTrackSlope(worldX, segments) {
  const delta = 4;
  const y1 = getTrackElevation(worldX - delta, segments);
  const y2 = getTrackElevation(worldX + delta, segments);
  return (y2 - y1) / (2 * delta);
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

// Roaming cute space pals outside the corridor lines
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
  isPausedRef.current = isPaused;

  const { width, height } = useWindowDimensions();
  const arenaWidth = width;
  const arenaHeight = height - 120;

  // Base horizontal corridor geometry
  const baseCenterY = arenaHeight * 0.52;
  const baseFloorY = baseCenterY + CORRIDOR_HEIGHT / 2;
  const baseCeilingY = baseCenterY - CORRIDOR_HEIGHT / 2;
  const groundY = baseFloorY - CUBE_SIZE;
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
  const lastGroundedTimeRef = useRef(Date.now());

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
   * Path alternates continuously between:
   * - STRAIGHT (flat baseline; ONLY place where static cubes, spikes & void gaps spawn)
   * - SMOOTH (continuous sine wave roller coaster; both lines curve up and down)
   * - SHARP (angular cyber ridges & valleys; both lines angle up and down)
   * - RAMP (high elevated highway plateau; both lines climb up and down)
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
        const segW = 460 + Math.floor(Math.random() * 140);
        newSegments.push({
          id: `seg_str_${curX}`,
          type: 'STRAIGHT',
          x: curX,
          w: segW,
        });

        // ONLY on STRAIGHT path sections: spawn static cubes, ground spikes, or void gaps!
        const randChoice = Math.random();
        if (randChoice < 0.32) {
          // Static cube block
          newObs.push({
            id: `blk_${curX}`,
            type: 'BLOCK',
            x: curX + 140 + Math.random() * (segW - 240),
            w: 24,
            h: 22,
          });
        } else if (randChoice < 0.62) {
          // Ground spikes (single or double)
          const isDouble = Math.random() > 0.5;
          const spX = curX + 130 + Math.random() * (segW - 240);
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
          // Void gap (well-centered with generous runway before and after)
          const gapW = 82;
          const gapX = curX + 140 + Math.random() * (segW - gapW - 180);
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
            fired: false,
          });
        }

        // Aero-Drop Spike chance
        if (Math.random() < 0.35) {
          newObs.push({
            id: `sp_drop_${curX}`,
            type: 'SPIKE_DROP',
            x: curX + segW * 0.72,
            w: 22,
            h: 24,
          });
        }

        curX += segW;
      } else if (terrainType === 'SMOOTH') {
        // Continuous sine wave cycle (goes up to +amp, down to -amp, ends at 0)
        const segW = 380 + Math.floor(Math.random() * 80);
        const amp = 28 + Math.floor(Math.random() * 8);
        newSegments.push({
          id: `seg_sm_${curX}`,
          type: 'SMOOTH',
          x: curX,
          w: segW,
          amp,
        });

        // Turret mounted on upper ceiling line
        if (Math.random() < 0.45) {
          newTurrets.push({
            id: `turret_${curX}`,
            x: curX + segW * 0.5,
            fired: false,
          });
        }

        curX += segW;
      } else if (terrainType === 'SHARP') {
        // Angular cyber peaks and valleys (sharp up, sharp down, ends at 0)
        const segW = 360 + Math.floor(Math.random() * 80);
        const h = 26 + Math.floor(Math.random() * 6);
        newSegments.push({
          id: `seg_shp_${curX}`,
          type: 'SHARP',
          x: curX,
          w: segW,
          h,
        });

        // Turret mounted on upper ceiling line
        if (Math.random() < 0.45) {
          newTurrets.push({
            id: `turret_${curX}`,
            x: curX + segW * 0.5,
            fired: false,
          });
        }

        curX += segW;
      } else if (terrainType === 'RAMP') {
        // Elevated launch ramp to highway plateau
        const segW = 420 + Math.floor(Math.random() * 80);
        const h = 34 + Math.floor(Math.random() * 8);
        newSegments.push({
          id: `seg_ramp_${curX}`,
          type: 'RAMP',
          x: curX,
          w: segW,
          h,
        });

        // Turret mounted on upper ceiling line
        if (Math.random() < 0.45) {
          newTurrets.push({
            id: `turret_${curX}`,
            x: curX + segW * 0.5,
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
  }, []);

  // Initialize level
  const initLevel = useCallback(() => {
    playerYRef.current = groundY;
    playerVyRef.current = 0;
    distanceRef.current = 0;
    rotationRef.current = 0;
    spawnCursorXRef.current = 0;
    tickCountRef.current = 0;
    lastGroundedTimeRef.current = Date.now();
    segmentsRef.current = [];
    obstaclesRef.current = [];
    turretsRef.current = [];
    projectilesRef.current = [];
    gapsRef.current = [];

    // Initial safe flat runway
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

  // Handle jump with responsive Coyote time
  const handleJump = () => {
    if (isPausedRef.current) return;
    if (!isPlaying) {
      setIsPlaying(true);
    }

    const curDist = distanceRef.current;
    const playerCenterX = curDist + playerScreenX + CUBE_SIZE * 0.5;
    const currentElev = getTrackElevation(playerCenterX, segmentsRef.current);
    const targetFloorY = baseFloorY - currentElev;
    const targetSurfaceY = targetFloorY - CUBE_SIZE;

    // Accurate gap check: solid ground supports cube until center crosses gap threshold
    const isOverGap = gapsRef.current.some(
      (g) => playerCenterX >= g.x + 8 && playerCenterX <= g.x + g.w - 8
    );

    const now = Date.now();
    const isCloseToGround = Math.abs(playerYRef.current - targetSurfaceY) <= 8;
    const canCoyoteJump = now - lastGroundedTimeRef.current < 120;

    if (!isOverGap && (isCloseToGround || canCoyoteJump)) {
      playerVyRef.current = JUMP_VELOCITY;
      lastGroundedTimeRef.current = 0;
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

      // Exact mathematical elevation at player's center of mass
      const playerCenterX = nextDist + playerScreenX + CUBE_SIZE * 0.5;
      const currentElev = getTrackElevation(playerCenterX, segmentsRef.current);
      const curFloorSurface = baseFloorY - currentElev;
      const curCeilSurface = curFloorSurface - CORRIDOR_HEIGHT;
      const targetGroundY = curFloorSurface - CUBE_SIZE;

      // VOID GAP TEST:
      // Player center must reach g.x + 8 before falling into abyss!
      // They NEVER fall before the gap!
      const isOverGap = gapsRef.current.some(
        (g) => playerCenterX >= g.x + 8 && playerCenterX <= g.x + g.w - 8
      );

      // Check if landing on static BLOCK from above
      let landedOnBlock = false;
      let blockTopY = 0;
      const obsList = obstaclesRef.current;
      for (let i = 0; i < obsList.length; i++) {
        const obs = obsList[i];
        if (obs.type === 'BLOCK') {
          const obsScreenX = obs.x - nextDist + playerScreenX;
          const pLeft = playerScreenX + 3;
          const pRight = playerScreenX + CUBE_SIZE - 3;
          const oLeft = obsScreenX;
          const oRight = obsScreenX + obs.w;
          const oTop = baseFloorY - obs.h;

          // If horizontally overlapping and falling onto block surface
          if (pRight > oLeft && pLeft < oRight) {
            if (playerVyRef.current >= 0 && playerYRef.current + CUBE_SIZE <= oTop + 6) {
              landedOnBlock = true;
              blockTopY = oTop - CUBE_SIZE;
              break;
            }
          }
        }
      }

      // Vertical movement & gravity
      let nextVy = playerVyRef.current + GRAVITY;
      let nextY = playerYRef.current + nextVy;

      let isGrounded = false;
      if (landedOnBlock) {
        nextY = blockTopY;
        nextVy = 0;
        isGrounded = true;
        lastGroundedTimeRef.current = Date.now();
      } else if (!isOverGap) {
        if (nextY >= targetGroundY) {
          nextY = targetGroundY;
          nextVy = 0;
          isGrounded = true;
          lastGroundedTimeRef.current = Date.now();
        } else if (nextY <= curCeilSurface) {
          nextY = curCeilSurface;
          nextVy = 0;
        }
      } else {
        // Falling into void gap
        if (nextY <= curCeilSurface) {
          nextY = curCeilSurface;
          nextVy = 0;
        }
        if (nextY > baseFloorY + 40) {
          handleCrash('VOID_FALL');
          return;
        }
      }

      playerVyRef.current = nextVy;
      playerYRef.current = nextY;

      // Cube Rotation: Tilts parallel to track slope when grounded, spins when airborne
      let nextRot = 0;
      if (!isGrounded) {
        nextRot = (rotationRef.current + 8) % 360;
        rotationRef.current = nextRot;
      } else {
        const slope = getTrackSlope(playerCenterX, segmentsRef.current);
        const slopeDeg = -Math.atan(slope) * (180 / Math.PI);
        rotationRef.current = slopeDeg;
        nextRot = slopeDeg;
      }

      // CEILING MOUNTED TURRETS: Mounted to top line, aiming & shooting at player!
      const pMidX = playerScreenX + CUBE_SIZE / 2;
      const pMidY = nextY + CUBE_SIZE / 2;

      const turrets = turretsRef.current;
      for (let i = 0; i < turrets.length; i++) {
        const turret = turrets[i];
        const tScreenX = turret.x - nextDist + playerScreenX;
        const tElev = getTrackElevation(turret.x, segmentsRef.current);
        const tCeilY = baseFloorY - tElev - CORRIDOR_HEIGHT;

        // Approaching within firing distance: turret shoots plasma towards player!
        if (!turret.fired && tScreenX - pMidX < 320 && tScreenX - pMidX > 90) {
          turret.fired = true;

          const dx = pMidX - tScreenX;
          const dy = pMidY - (tCeilY + 12);
          const dist = Math.hypot(dx, dy) || 1;
          const projSpeed = 5.2;

          projectilesRef.current.push({
            id: `plasma_${turret.id}_${Math.random()}`,
            x: turret.x,
            y: tCeilY + 12,
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
        if (projScreenX < -60 || projScreenY > baseFloorY + 50) {
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
        bottom: nextY + CUBE_SIZE - 2,
      };

      // Collision checks with active obstacles
      for (let i = 0; i < obsList.length; i++) {
        const obs = obsList[i];
        const obsScreenX = obs.x - nextDist + playerScreenX;
        if (obsScreenX < -40 || obsScreenX > arenaWidth + 40) continue;

        if (obs.type === 'SPIKE_BOTTOM') {
          // Precise triangular inset hitbox
          const sLeft = obsScreenX + 5;
          const sRight = obsScreenX + obs.w - 5;
          const sTop = baseFloorY - obs.h + 4;
          const sBottom = baseFloorY;

          if (
            pHit.right > sLeft &&
            pHit.left < sRight &&
            pHit.bottom > sTop &&
            pHit.top < sBottom
          ) {
            handleCrash('COLLISION');
            return;
          }
        } else if (obs.type === 'BLOCK') {
          // If hit the front face (not landed on top)
          const bLeft = obsScreenX + 3;
          const bRight = obsScreenX + obs.w - 3;
          const bTop = baseFloorY - obs.h + 5;
          const bBottom = baseFloorY;

          if (
            pHit.right > bLeft &&
            pHit.left < bRight &&
            pHit.bottom > bTop &&
            pHit.top < bBottom
          ) {
            handleCrash('COLLISION');
            return;
          }
        } else if (obs.type === 'SPIKE_DROP') {
          const curPlayerX = nextDist + playerScreenX;
          const distToPlayer = obs.x - curPlayerX;
          const obsElev = getTrackElevation(obs.x, segmentsRef.current);
          const obsCeil = baseFloorY - obsElev - CORRIDOR_HEIGHT;
          const obsFloor = baseFloorY - obsElev;

          let spikeY = obsCeil;
          if (distToPlayer <= 170) {
            const dropProgress = Math.min(1, Math.max(0, (170 - distToPlayer) / 100));
            spikeY = obsCeil + (obsFloor - obs.h - obsCeil) * dropProgress;
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
    baseFloorY,
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

  // Viewport sampling for continuous corridor lines (top ceiling & bottom floor)
  const sampleStep = 8;
  const numSteps = Math.ceil((arenaWidth + 60) / sampleStep) + 3;
  const samplePoints = [];
  for (let i = 0; i < numSteps; i++) {
    const sX = -30 + i * sampleStep;
    const worldX = distance + sX;
    const elev = getTrackElevation(worldX, segmentsRef.current);
    const fY = baseFloorY - elev;
    const cY = fY - CORRIDOR_HEIGHT;
    samplePoints.push({ sX, fY, cY, worldX });
  }

  // Ceiling continuous neon guideway path
  let ceilingLinePath = `M ${samplePoints[0].sX} ${samplePoints[0].cY}`;
  for (let i = 1; i < samplePoints.length; i++) {
    ceilingLinePath += ` L ${samplePoints[i].sX} ${samplePoints[i].cY}`;
  }

  // Top Solid Wall SVG Path (From y=0 down to ceiling curve)
  let topWallPath = `M -30 0 L ${arenaWidth + 30} 0 L ${arenaWidth + 30} ${samplePoints[samplePoints.length - 1].cY}`;
  for (let i = samplePoints.length - 1; i >= 0; i--) {
    topWallPath += ` L ${samplePoints[i].sX} ${samplePoints[i].cY}`;
  }
  topWallPath += ' Z';

  // Bottom Solid Wall SVG Path
  let botWallPath = `M ${samplePoints[0].sX} ${samplePoints[0].fY}`;
  for (let i = 1; i < samplePoints.length; i++) {
    botWallPath += ` L ${samplePoints[i].sX} ${samplePoints[i].fY}`;
  }
  botWallPath += ` L ${arenaWidth + 30} ${arenaHeight} L -30 ${arenaHeight} Z`;

  // Floor continuous neon guideway path (with physical gaps over void chasms)
  const activeGaps = gapsRef.current;
  function isWorldXInGap(wX) {
    for (let g = 0; g < activeGaps.length; g++) {
      if (wX >= activeGaps[g].x && wX <= activeGaps[g].x + activeGaps[g].w) {
        return activeGaps[g];
      }
    }
    return null;
  }

  let floorLinePath = '';
  let isDrawingFloor = false;
  for (let i = 0; i < samplePoints.length; i++) {
    const pt = samplePoints[i];
    const gap = isWorldXInGap(pt.worldX);
    if (!gap) {
      if (!isDrawingFloor) {
        floorLinePath += ` M ${pt.sX} ${pt.fY}`;
        isDrawingFloor = true;
      } else {
        floorLinePath += ` L ${pt.sX} ${pt.fY}`;
      }
    } else {
      isDrawingFloor = false;
    }
  }

  // Visible elements for rendering
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
            <LinearGradient id="topWallGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#060314" stopOpacity="0.96" />
              <Stop offset="100%" stopColor="#14082C" stopOpacity="0.96" />
            </LinearGradient>
            <LinearGradient id="bottomWallGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#14082C" stopOpacity="0.96" />
              <Stop offset="100%" stopColor="#060314" stopOpacity="0.96" />
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

          {/* ROAMING CUTE SPACE PALS OUTSIDE TUNNEL */}
          {npcShipsRef.current.map((ship) => {
            const sY =
              ship.zone === 'UPPER'
                ? Math.max(22, baseCeilingY - ship.offsetY)
                : Math.min(arenaHeight - 24, baseFloorY + ship.offsetY);

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

          {/* TOP SOLID WALL (Curves dynamically with track elevations) */}
          <Path d={topWallPath} fill="url(#topWallGrad)" />

          {/* TOP CEILING NEON GUIDEWAY LINE (Moves UP & DOWN with the path) */}
          <Path
            d={ceilingLinePath}
            stroke="#9D4EDD"
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
          />

          {/* BOTTOM SOLID WALL (Curves dynamically with track elevations) */}
          <Path d={botWallPath} fill="url(#bottomWallGrad)" />

          {/* BOTTOM FLOOR NEON GUIDEWAY LINE (Moves UP & DOWN with the path) */}
          <Path
            d={floorLinePath}
            stroke="#00F5FF"
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
          />

          {/* CEILING-MOUNTED UPPER TURRETS (Mounted to top line, aiming & shooting at player!) */}
          {visibleTurrets.map((turret) => {
            const tScreenX = turret.x - distance + playerScreenX;
            const tElev = getTrackElevation(turret.x, segmentsRef.current);
            const tCeilY = baseFloorY - tElev - CORRIDOR_HEIGHT;

            // Angle towards player cube
            const dx = pMidX - tScreenX;
            const dy = pMidY - (tCeilY + 6);
            const aimAngleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
            const barrelRot = aimAngleDeg - 90;

            const isAiming = tScreenX - pMidX < 360 && tScreenX - pMidX > 40;

            return (
              <G key={turret.id}>
                {/* Red Target Laser Line (Telegraph when aiming) */}
                {isAiming && (
                  <Line
                    x1={tScreenX}
                    y1={tCeilY + 8}
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
                  y={tCeilY - 4}
                  width={32}
                  height={8}
                  rx={3}
                  fill="#1C0B38"
                  stroke="#9D4EDD"
                  strokeWidth={1.6}
                />
                <Circle cx={tScreenX - 10} cy={tCeilY} r={1.5} fill="#FFE600" />
                <Circle cx={tScreenX + 10} cy={tCeilY} r={1.5} fill="#FFE600" />

                {/* Swivel Pivot Dome */}
                <Circle
                  cx={tScreenX}
                  cy={tCeilY + 6}
                  r={8}
                  fill="#14092A"
                  stroke="#00F5FF"
                  strokeWidth={1.8}
                />

                {/* Rotating Turret Cannon Barrels */}
                <G transform={`rotate(${barrelRot}, ${tScreenX}, ${tCeilY + 6})`}>
                  <Rect
                    x={tScreenX - 4}
                    y={tCeilY + 4}
                    width={8}
                    height={16}
                    rx={2}
                    fill="#261048"
                    stroke="#FF0055"
                    strokeWidth={1.4}
                  />
                  <Circle cx={tScreenX - 2.5} cy={tCeilY + 20} r={2} fill="#FFE600" />
                  <Circle cx={tScreenX + 2.5} cy={tCeilY + 20} r={2} fill="#FFE600" />
                </G>

                {/* Center Core Eye */}
                <Circle cx={tScreenX} cy={tCeilY + 6} r={3} fill="#FF0055" />
                <Circle cx={tScreenX} cy={tCeilY + 6} r={1.2} fill="#FFE600" />
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

          {/* VOID CHASM HAZARD BEACONS (Flanking each side of the missing floor line) */}
          {visibleGaps.map((gap) => {
            const startScreenX = gap.x - distance + playerScreenX;
            const endScreenX = startScreenX + gap.w;

            return (
              <G key={`gap_visual_${gap.id}`}>
                {/* Left Edge Hazard Warning Beacon */}
                <Line
                  x1={startScreenX}
                  y1={baseFloorY - 6}
                  x2={startScreenX}
                  y2={baseFloorY + 18}
                  stroke="#FF0055"
                  strokeWidth={2.8}
                />
                <Circle cx={startScreenX} cy={baseFloorY} r={3.2} fill="#FFE600" stroke="#FF0055" strokeWidth={1} />

                {/* Right Edge Hazard Warning Beacon */}
                <Line
                  x1={endScreenX}
                  y1={baseFloorY - 6}
                  x2={endScreenX}
                  y2={baseFloorY + 18}
                  stroke="#FF0055"
                  strokeWidth={2.8}
                />
                <Circle cx={endScreenX} cy={baseFloorY} r={3.2} fill="#FFE600" stroke="#FF0055" strokeWidth={1} />
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
                    y={baseFloorY - obs.h}
                    width={obs.w}
                    height={obs.h}
                    rx={4}
                    fill="#150A2E"
                    stroke="#FFE600"
                    strokeWidth={2}
                  />
                  <Rect
                    x={sX + 4}
                    y={baseFloorY - obs.h + 4}
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
              const tipY = baseFloorY - obs.h;
              const pLeft = `${sX},${baseFloorY}`;
              const pTip = `${tipX},${tipY}`;
              const pRight = `${sX + obs.w},${baseFloorY}`;

              return (
                <G key={obs.id}>
                  <Polygon
                    points={`${pLeft} ${pTip} ${pRight}`}
                    fill="#FF0055"
                    stroke="#FFFFFF"
                    strokeWidth={1}
                  />
                  <Polygon
                    points={`${sX + 3},${baseFloorY} ${tipX},${tipY + 4} ${sX + obs.w - 3},${baseFloorY}`}
                    fill="rgba(255, 255, 255, 0.3)"
                  />
                </G>
              );
            }

            if (obs.type === 'SPIKE_DROP') {
              const curPlayerX = distance + playerScreenX;
              const distToPlayer = obs.x - curPlayerX;
              const obsElev = getTrackElevation(obs.x, segmentsRef.current);
              const obsCeil = baseFloorY - obsElev - CORRIDOR_HEIGHT;
              const obsFloor = baseFloorY - obsElev;

              const isTelegraphing = distToPlayer <= 290 && distToPlayer > 170;
              const isDropping = distToPlayer <= 170;
              const dropProgress = isDropping ? Math.min(1, Math.max(0, (170 - distToPlayer) / 100)) : 0;
              const curSpikeY = obsCeil + (obsFloor - obs.h - obsCeil) * dropProgress;

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
                        y1={obsCeil + obs.h}
                        x2={tipX}
                        y2={obsFloor}
                        stroke="#FF0055"
                        strokeWidth={1.5}
                        strokeDasharray="4,4"
                        opacity={0.85}
                      />
                      <Polygon
                        points={`${tipX - 7},${obsFloor - 2} ${tipX},${obsFloor - 9} ${tipX + 7},${obsFloor - 2} ${tipX},${obsFloor + 5}`}
                        fill="rgba(255, 0, 85, 0.5)"
                        stroke="#FFE600"
                        strokeWidth={1.2}
                      />
                      <SvgText
                        x={tipX}
                        y={obsCeil + obs.h + 16}
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

          {/* THE PLAYER CUBE (Riding precisely on top of the floor line, tilting with track slope) */}
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
