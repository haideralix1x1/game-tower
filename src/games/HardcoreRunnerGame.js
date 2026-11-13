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
  ClipPath,
} from 'react-native-svg';
import MiniGameHeader from '../components/MiniGameHeader';
import GameResultModal from '../components/GameResultModal';
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

// Cube and physics parameters (Smooth & responsive arcade feel)
const CUBE_SIZE = 22;
const BASE_SPEED = 6.8;
const GRAVITY = 0.58;
const JUMP_VELOCITY = -8.8;
const CORRIDOR_HEIGHT = 118;

// Phase Thresholds in Distance (Endless Mode Progression)
const PHASE_THRESHOLDS = [
  { phase: 1, name: 'CUBE PROTOCOL', desc: 'BASIC HURDLE RUN', startDist: 0, color: '#FFE600' },
  { phase: 2, name: 'SPIKE MATRIX', desc: 'SHARP GROUND SPIKES', startDist: 1200, color: '#FF0055' },
  { phase: 3, name: 'AERO-DROP HAZARDS', desc: 'ARROW SPIKES SLAMMING DOWN', startDist: 2800, color: '#FF6D00' },
  { phase: 4, name: 'PLASMA TURRET BARRAGE', desc: 'CEILING MOUNTED HOMING CANNONS', startDist: 4500, color: '#00F5FF' },
  { phase: 5, name: 'VOID CHASMS', desc: 'BOTTOM LINE GAPS // ABYSS', startDist: 6500, color: '#9D4EDD' },
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
 * Every curve segment starts and ends at elevation 0 AND derivative slope 0 (C1 continuous),
 * perfectly matching the flat straight segments with zero angular kinks, jerks, or sudden jumps!
 * - STRAIGHT: Flat horizontal baseline (0). Static cubes, spikes & void gaps spawn here.
 * - SMOOTH: C1 continuous gentle rolling hill (smooth raised cosine with 0 slope at boundaries).
 * - VALLEY: C1 continuous gentle dip (smooth inverted cosine with 0 slope at boundaries).
 * - WAVE: C1 continuous dual-phase wave seamlessly blended to zero slope at boundaries.
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
        // C1 continuous raised cosine hill: 0 at t=0, slope 0 at t=0, 0 at t=1, slope 0 at t=1! Zero kinks!
        return s.amp * 0.5 * (1 - Math.cos(2 * Math.PI * t));
      }

      if (s.type === 'VALLEY') {
        // C1 continuous smooth dip: 0 at t=0, slope 0 at t=0, 0 at t=1, slope 0 at t=1! Zero kinks!
        return -s.amp * 0.5 * (1 - Math.cos(2 * Math.PI * t));
      }

      if (s.type === 'WAVE') {
        // Smooth dual-phase wave seamlessly blended to zero slope at both ends
        return s.amp * Math.sin(2 * Math.PI * t) * Math.pow(Math.sin(Math.PI * t), 2);
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

export default function HardcoreRunnerGame({ onBackToHub, onScoreUpdate, isPaused = false }) {
  const isPausedRef = useRef(isPaused);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

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
  const [lives, setLives] = useState(3);
  const livesRef = useRef(3);
  const invulnerableUntilRef = useRef(0);

  // Consolidated 60 FPS visual state
  const [frameState, setFrameState] = useState(() => ({
    distance: 0,
    playerY: groundY,
    rotation: 0,
    score: 0,
    lives: 3,
    isInvulnerable: false,
    segments: [],
    obstacles: [],
    turrets: [],
    projectiles: [],
    gaps: [],
  }));

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
  const lastGroundedTimeRef = useRef(0);
  const isGroundedRef = useRef(true);

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
   * Progression is gated strictly in phases by curX (world position):
   * - Phase 1 (0..1200): Straight flat path, ONLY single static cube blocks (learn jumps)
   * - Phase 2 (1200..2800): Ground spikes introduced (single & double spikes) + gentle smooth curves
   * - Phase 3 (2800..4500): Aero-drop spikes slam down from ceiling + sharp cyber ridges
   * - Phase 4 (4500..6500): Ceiling plasma turrets aim & fire + launch ramps
   * - Phase 5 (6500+): Void chasms (bottom line gaps) + all hazards combined
   */
  const spawnAhead = useCallback((targetWorldX) => {
    let curX = spawnCursorXRef.current;
    const newSegments = [];
    const newObs = [];
    const newTurrets = [];
    const newGaps = [];

    while (curX < targetWorldX) {
      // Gate available terrain types by distance
      let terrainType = 'STRAIGHT';
      if (curX >= 6500) {
        const pool = ['STRAIGHT', 'STRAIGHT', 'SMOOTH', 'VALLEY', 'WAVE'];
        terrainType = pool[Math.floor(Math.random() * pool.length)];
      } else if (curX >= 4500) {
        const pool = ['STRAIGHT', 'STRAIGHT', 'STRAIGHT', 'SMOOTH', 'VALLEY'];
        terrainType = pool[Math.floor(Math.random() * pool.length)];
      } else if (curX >= 2800) {
        const pool = ['STRAIGHT', 'STRAIGHT', 'STRAIGHT', 'STRAIGHT', 'SMOOTH'];
        terrainType = pool[Math.floor(Math.random() * pool.length)];
      } else {
        terrainType = 'STRAIGHT';
      }

      if (terrainType === 'STRAIGHT') {
        const segW = 460 + Math.floor(Math.random() * 140);
        newSegments.push({
          id: `seg_str_${curX}`,
          type: 'STRAIGHT',
          x: curX,
          w: segW,
        });

        // Obstacle spawning strictly phased by curX
        if (curX < 1200) {
          // Phase 1: ONLY single static cube blocks with generous spacing
          if (Math.random() < 0.65) {
            newObs.push({
              id: `blk_${curX}`,
              type: 'BLOCK',
              x: curX + 160 + Math.random() * (segW - 280),
              w: 24,
              h: 22,
            });
          }
        } else if (curX < 2600) {
          // Phase 2: Gradually introduce ground spikes and occasional small void gaps
          const rand = Math.random();
          if (rand < 0.35) {
            newObs.push({
              id: `blk_${curX}`,
              type: 'BLOCK',
              x: curX + 130 + Math.random() * (segW - 260),
              w: 24,
              h: 22,
            });
          } else if (rand < 0.75) {
            const isDouble = Math.random() > 0.65;
            const spX = curX + 130 + Math.random() * (segW - 260);
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
          } else if (curX >= 1800 && terrainType === 'STRAIGHT') {
            // Early gentle void gap
            const gapW = 76;
            const gapX = curX + 140 + Math.random() * (segW - gapW - 180);
            newGaps.push({
              id: `gap_${gapX}`,
              x: gapX,
              w: gapW,
            });
          }
        } else if (curX < 4500) {
          // Phase 3: 2 obstacles per segment (ground obstacles, drop spikes, void gaps)
          const spX1 = curX + 110 + Math.random() * (segW * 0.35);
          if (Math.random() < 0.40) {
            newObs.push({
              id: `blk_${spX1}`,
              type: 'BLOCK',
              x: spX1,
              w: 24,
              h: 22,
            });
          } else {
            newObs.push({
              id: `sp_1_${spX1}`,
              type: 'SPIKE_BOTTOM',
              x: spX1,
              w: 22,
              h: 22,
            });
          }

          // Second obstacle in segment
          if (Math.random() < 0.45 && terrainType === 'STRAIGHT') {
            const gapW = 80;
            const gapX = curX + segW * 0.55 + Math.random() * (segW * 0.25);
            newGaps.push({
              id: `gap_${gapX}`,
              x: gapX,
              w: gapW,
            });
          } else if (Math.random() < 0.50) {
            newObs.push({
              id: `sp_drop_${curX}`,
              type: 'SPIKE_DROP',
              x: curX + segW * 0.72,
              w: 22,
              h: 24,
            });
          } else {
            const spX2 = curX + segW * 0.62 + Math.random() * (segW * 0.25);
            newObs.push({
              id: `sp_2_${spX2}`,
              type: 'SPIKE_BOTTOM',
              x: spX2,
              w: 22,
              h: 22,
            });
          }
        } else if (curX < 6500) {
          // Phase 4: 2 to 3 obstacles per segment (turrets, drop spikes, ground hazards, gaps)
          const spX1 = curX + 100 + Math.random() * (segW * 0.28);
          newObs.push({
            id: `sp_1_${spX1}`,
            type: Math.random() < 0.35 ? 'BLOCK' : 'SPIKE_BOTTOM',
            x: spX1,
            w: 24,
            h: 22,
          });

          // Second obstacle
          if (terrainType === 'STRAIGHT' && Math.random() < 0.50) {
            const gapW = 82;
            const gapX = curX + segW * 0.45 + Math.random() * (segW * 0.2);
            newGaps.push({
              id: `gap_${gapX}`,
              x: gapX,
              w: gapW,
            });
          } else {
            newObs.push({
              id: `sp_drop_${curX}`,
              type: 'SPIKE_DROP',
              x: curX + segW * 0.52,
              w: 22,
              h: 24,
            });
          }

          // Turret or third obstacle
          if (Math.random() < 0.45) {
            newTurrets.push({
              id: `turret_${curX}`,
              x: curX + segW * 0.78,
              fired: false,
            });
          }
        } else {
          // Phase 5: High density obstacles (3 obstacles per segment)
          const spX1 = curX + 90 + Math.random() * (segW * 0.25);
          newObs.push({
            id: `sp_1_${spX1}`,
            type: Math.random() < 0.3 ? 'BLOCK' : 'SPIKE_BOTTOM',
            x: spX1,
            w: 24,
            h: 22,
          });

          if (terrainType === 'STRAIGHT' && Math.random() < 0.60) {
            const gapW = 84;
            const gapX = curX + segW * 0.42 + Math.random() * (segW * 0.2);
            newGaps.push({
              id: `gap_${gapX}`,
              x: gapX,
              w: gapW,
            });
          } else {
            newObs.push({
              id: `sp_drop_${curX}`,
              type: 'SPIKE_DROP',
              x: curX + segW * 0.48,
              w: 22,
              h: 24,
            });
          }

          if (Math.random() < 0.55) {
            newTurrets.push({
              id: `turret_${curX}`,
              x: curX + segW * 0.76,
              fired: false,
            });
          } else {
            const spX3 = curX + segW * 0.74 + Math.random() * (segW * 0.18);
            newObs.push({
              id: `sp_3_${spX3}`,
              type: 'SPIKE_BOTTOM',
              x: spX3,
              w: 22,
              h: 22,
            });
          }
        }

        curX += segW;
      } else if (terrainType === 'SMOOTH') {
        const segW = 440 + Math.floor(Math.random() * 80);
        const amp = 16 + Math.floor(Math.random() * 6);
        newSegments.push({
          id: `seg_sm_${curX}`,
          type: 'SMOOTH',
          x: curX,
          w: segW,
          amp,
        });

        // Turrets only appear on curves in phase 4+ (curX >= 4500)
        if (curX >= 4500 && Math.random() < 0.35) {
          newTurrets.push({
            id: `turret_${curX}`,
            x: curX + segW * 0.5,
            fired: false,
          });
        }

        curX += segW;
      } else if (terrainType === 'VALLEY') {
        const segW = 440 + Math.floor(Math.random() * 80);
        const amp = 14 + Math.floor(Math.random() * 6);
        newSegments.push({
          id: `seg_val_${curX}`,
          type: 'VALLEY',
          x: curX,
          w: segW,
          amp,
        });

        if (curX >= 4500 && Math.random() < 0.35) {
          newTurrets.push({
            id: `turret_${curX}`,
            x: curX + segW * 0.5,
            fired: false,
          });
        }

        curX += segW;
      } else if (terrainType === 'WAVE') {
        const segW = 480 + Math.floor(Math.random() * 80);
        const amp = 15 + Math.floor(Math.random() * 5);
        newSegments.push({
          id: `seg_wav_${curX}`,
          type: 'WAVE',
          x: curX,
          w: segW,
          amp,
        });

        if (curX >= 4500 && Math.random() < 0.35) {
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

    isGroundedRef.current = true;
    livesRef.current = 3;
    setLives(3);
    invulnerableUntilRef.current = 0;

    setFrameState({
      distance: 0,
      playerY: groundY,
      rotation: 0,
      score: 0,
      lives: 3,
      isInvulnerable: false,
      segments: [...segmentsRef.current],
      obstacles: [],
      turrets: [],
      projectiles: [],
      gaps: [],
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
    const timer = setTimeout(() => {
      initLevel();
    }, 0);
    return () => clearTimeout(timer);
  }, [initLevel]);

  // Handle jump with responsive Coyote time
  const handleJump = () => {
    if (isPausedRef.current) return;
    if (!isPlaying) {
      setIsPlaying(true);
    }

    const curDist = distanceRef.current;
    const playerCenterX = curDist + CUBE_SIZE * 0.5;
    const currentElev = getTrackElevation(playerCenterX, segmentsRef.current);
    const targetFloorY = baseFloorY - currentElev;
    const targetSurfaceY = targetFloorY - CUBE_SIZE;

    // Accurate gap check: solid ground supports cube until center crosses gap threshold
    const isOverGap = gapsRef.current.some(
      (g) => playerCenterX >= g.x + 4 && playerCenterX <= g.x + g.w
    );

    const now = Date.now();
    const isCloseToGround = Math.abs(playerYRef.current - targetSurfaceY) <= 8;
    const canCoyoteJump = now - lastGroundedTimeRef.current < 120;

    if (!isOverGap && (isCloseToGround || canCoyoteJump)) {
      playerVyRef.current = JUMP_VELOCITY;
      isGroundedRef.current = false;
      lastGroundedTimeRef.current = 0;
      playTapSound();
      triggerLightHaptic();
    }
  };

  const handleCrash = useCallback(
    (cause) => {
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
    },
    [highScore, onScoreUpdate]
  );

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

      // Dynamic speed progression: normal base speed that intensifies smoothly as distance grows
      const currentSpeed = BASE_SPEED + Math.min(4.2, (distanceRef.current / 5000) * 4.2);
      const nextDist = distanceRef.current + currentSpeed;
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

      // Take damage from obstacles or void
      const takeHit = (cause) => {
        if (Date.now() < invulnerableUntilRef.current) return false;
        if (livesRef.current > 1) {
          livesRef.current -= 1;
          setLives(livesRef.current);
          invulnerableUntilRef.current = Date.now() + 1800;
          playSliceSound();
          triggerMediumHaptic();
          return false; // survived with remaining life
        } else {
          livesRef.current = 0;
          setLives(0);
          handleCrash(cause);
          return true; // died
        }
      };

      // Exact mathematical elevation at player's center of mass
      const playerCenterX = nextDist + CUBE_SIZE * 0.5;
      const currentElev = getTrackElevation(playerCenterX, segmentsRef.current);
      const curFloorSurface = baseFloorY - currentElev;
      const curCeilSurface = curFloorSurface - CORRIDOR_HEIGHT;
      const targetGroundY = curFloorSurface - CUBE_SIZE;

      // VOID GAP TEST:
      // Player is over a void gap if their horizontal footprint overlaps the gap opening
      const pLeft = nextDist + 4;
      const pRight = nextDist + CUBE_SIZE - 4;
      const activeGap = gapsRef.current.find(
        (g) => (playerCenterX >= g.x && playerCenterX <= g.x + g.w) || (pRight > g.x && pLeft < g.x + g.w)
      );
      const isOverGap = !!activeGap;

      // Track if cube is submerged below solid floor line
      const isFallingInVoid = playerYRef.current > targetGroundY + 6 || (isOverGap && nextY > targetGroundY + 6);

      // Check if landing on static BLOCK from above
      let landedOnBlock = false;
      let blockTopY = 0;
      const obsList = obstaclesRef.current;
      for (let i = 0; i < obsList.length; i++) {
        const obs = obsList[i];
        if (obs.type === 'BLOCK') {
          const obsScreenX = obs.x - nextDist + playerScreenX;
          const pLeftScr = playerScreenX + 3;
          const pRightScr = playerScreenX + CUBE_SIZE - 3;
          const oLeft = obsScreenX;
          const oRight = obsScreenX + obs.w;
          const oTop = baseFloorY - obs.h;

          // If horizontally overlapping and falling onto block surface
          if (pRightScr > oLeft && pLeftScr < oRight) {
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
      } else if (!isOverGap && !isFallingInVoid) {
        // Solid floor under the cube
        if (isGroundedRef.current && playerVyRef.current === 0) {
          // Smoothly conform to ground elevation changes without lifting off or snapping
          nextY = targetGroundY;
          nextVy = 0;
          isGrounded = true;
          lastGroundedTimeRef.current = Date.now();
        } else if (nextY >= targetGroundY) {
          // Touchdown / land onto solid ground
          nextY = targetGroundY;
          nextVy = 0;
          isGrounded = true;
          lastGroundedTimeRef.current = Date.now();
        } else if (nextY <= curCeilSurface) {
          // Ceiling collision
          nextY = curCeilSurface;
          nextVy = 0;
        }
      } else {
        // Free fall into void gap!
        if (nextY <= curCeilSurface) {
          nextY = curCeilSurface;
          nextVy = 0;
        }
        // Cube plunges into the gap: INSTANT GAP DEATH!
        if (nextY > targetGroundY + 12) {
          playGameOverSound();
          triggerGameOverHaptic();
          if (takeHit('VOID_FALL')) return;
          // Respawn safely onto solid floor past the gap if extra lives remaining
          const gap = activeGap || gapsRef.current.find((g) => playerCenterX >= g.x - 20 && playerCenterX <= g.x + g.w + 40);
          const safeX = gap ? gap.x + gap.w + 30 : nextDist + 120;
          distanceRef.current = safeX;
          nextY = baseFloorY - getTrackElevation(safeX + CUBE_SIZE * 0.5, segmentsRef.current) - CUBE_SIZE;
          nextVy = 0;
          isGrounded = true;
        }
      }

      isGroundedRef.current = isGrounded;
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
        const currentRot = rotationRef.current;
        const targetRot = Math.round(slopeDeg * 10) / 10;
        const smoothedRot = currentRot + (targetRot - currentRot) * 0.35;
        rotationRef.current = smoothedRot;
        nextRot = smoothedRot;
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
          projs.splice(i, 1);
          if (takeHit('PROJECTILE')) return;
          continue;
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
        lives: livesRef.current,
        isInvulnerable: Date.now() < invulnerableUntilRef.current,
        segments: segmentsRef.current,
        obstacles: obstaclesRef.current,
        turrets: turretsRef.current,
        projectiles: projectilesRef.current,
        gaps: gapsRef.current,
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
            if (takeHit('COLLISION')) return;
            distanceRef.current += 38;
            playerVyRef.current = -5;
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
            if (takeHit('COLLISION')) return;
            distanceRef.current += 38;
            playerVyRef.current = -5;
          }
        } else if (obs.type === 'SPIKE_DROP') {
          const distToPlayer = obs.x - nextDist;
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
            if (takeHit('DROP_SPIKE')) return;
            distanceRef.current += 38;
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
    arenaHeight,
    baseFloorY,
    groundY,
    isPlaying,
    playerScreenX,
    spawnAhead,
    handleCrash,
  ]);

  const handleRetry = () => {
    initLevel();
  };

  const {
    distance,
    playerY,
    rotation,
    score,
    lives: curLives = 3,
    isInvulnerable = false,
    segments = [],
    obstacles = [],
    turrets = [],
    gaps = [],
    projectiles = [],
  } = frameState;

  // Viewport sampling for continuous corridor lines (top ceiling & bottom floor)
  const sampleStep = 8; // Fine-grained sampling matching exact player screen position
  const numSteps = Math.ceil((arenaWidth + 80) / sampleStep) + 6;
  const samplePoints = [];
  for (let i = 0; i < numSteps; i++) {
    const sX = -40 + i * sampleStep;
    const worldX = distance + (sX - playerScreenX);
    const elev = getTrackElevation(worldX, segments);
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
  let topWallPath = `M -40 0 L ${arenaWidth + 40} 0 L ${arenaWidth + 40} ${samplePoints[samplePoints.length - 1].cY}`;
  for (let i = samplePoints.length - 1; i >= 0; i--) {
    topWallPath += ` L ${samplePoints[i].sX} ${samplePoints[i].cY}`;
  }
  topWallPath += ' Z';

  // Bottom Solid Wall SVG Path
  let botWallPath = `M ${samplePoints[0].sX} ${samplePoints[0].fY}`;
  for (let i = 1; i < samplePoints.length; i++) {
    botWallPath += ` L ${samplePoints[i].sX} ${samplePoints[i].fY}`;
  }
  botWallPath += ` L ${arenaWidth + 40} ${arenaHeight} L -40 ${arenaHeight} Z`;

  // Floor continuous neon guideway path (with physical gaps over void chasms)
  const activeGaps = gaps;
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
  const visibleGaps = gaps.filter((g) => {
    const sX = g.x - distance + playerScreenX;
    return sX + g.w > -50 && sX < arenaWidth + 50;
  });

  const visibleObstacles = obstacles.filter((obs) => {
    const sX = obs.x - distance + playerScreenX;
    return sX > -60 && sX < arenaWidth + 60;
  });

  const visibleTurrets = turrets.filter((t) => {
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
            PHASE {currentPhase.phase} {'//'} {currentPhase.name}
          </Text>
        </View>

        <View style={styles.hudLivesGroup}>
          <Text style={styles.hudLivesIcons}>
            {Array.from({ length: 3 }).map((_, i) => (i < curLives ? '❤️' : '🖤')).join(' ')}
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
            <LinearGradient id="topWallGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#060314" stopOpacity="0.96" />
              <Stop offset="100%" stopColor="#14082C" stopOpacity="0.96" />
            </LinearGradient>
            <LinearGradient id="bottomWallGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#14082C" stopOpacity="0.96" />
              <Stop offset="100%" stopColor="#060314" stopOpacity="0.96" />
            </LinearGradient>
          </Defs>

          {/* TOP SOLID WALL (Curves dynamically with track elevations) */}
          <Path d={topWallPath} fill="url(#topWallGrad)" />

          {/* BOTTOM SOLID WALL (Curves dynamically with track elevations) */}
          <Path d={botWallPath} fill="url(#bottomWallGrad)" />

          {/* TOP CEILING NEON GUIDEWAY LINE (Moves UP & DOWN with the path) */}
          <Path
            d={ceilingLinePath}
            stroke="#9D4EDD"
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
          />

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
            const tElev = getTrackElevation(turret.x, segments);
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
          {projectiles.map((proj) => {
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
                {/* Void Abyss chasm cutout opening through the floor */}
                <Rect
                  x={startScreenX}
                  y={baseFloorY - 1}
                  width={gap.w}
                  height={arenaHeight - baseFloorY + 10}
                  fill="#030009"
                />
                <Line
                  x1={startScreenX}
                  y1={baseFloorY + 28}
                  x2={endScreenX}
                  y2={baseFloorY + 28}
                  stroke="#FF0055"
                  strokeWidth={1.5}
                  strokeDasharray="4,4"
                  opacity={0.35}
                />

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
              const distToPlayer = obs.x - distance;
              const obsElev = getTrackElevation(obs.x, segments);
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
            opacity={isInvulnerable ? 0.65 : 1}
          >
            <Rect
              x={playerScreenX}
              y={playerY}
              width={CUBE_SIZE}
              height={CUBE_SIZE}
              rx={5}
              fill="url(#cubeGrad)"
              stroke={isInvulnerable ? '#00F5FF' : '#FFFFFF'}
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

          {/* Invulnerability Shield Bubble */}
          {isInvulnerable && (
            <Circle
              cx={playerScreenX + CUBE_SIZE / 2}
              cy={playerY + CUBE_SIZE / 2}
              r={CUBE_SIZE * 0.88}
              stroke="#00F5FF"
              strokeWidth={2}
              fill="rgba(0, 245, 255, 0.18)"
              strokeDasharray="4,3"
            />
          )}
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
  hudLivesGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  hudLivesIcons: {
    fontSize: 13,
    letterSpacing: 2,
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
