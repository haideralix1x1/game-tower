import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  useWindowDimensions,
  Platform,
} from 'react-native';
import Svg, {
  Line,
  Circle,
  Rect,
  G,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Path,
} from 'react-native-svg';
import { COLORS } from '../../styles';
import MiniGameHeader from '../components/MiniGameHeader';
import GameResultModal from '../components/GameResultModal';
import JuiceEngine from '../components/JuiceEngine';
import { playSliceSound, playTapSound, playGameOverSound } from '../utils/sound';
import {
  triggerSliceHaptic,
  triggerGameOverHaptic,
  triggerMediumHaptic,
} from '../utils/haptics';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const STORAGE_LEVEL_KEY = '@game_tower:level_rope_v1';
const STORAGE_BEST_KEY = '@game_tower:best_rope_v1';

const BALL_RADIUS = 15;
const BUCKET_WIDTH = 76;
const BUCKET_HEIGHT = 44;
const GRAVITY = 0.42;

// Check line segment intersection
function checkLineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (Math.abs(denom) < 0.000001) return null;
  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

  if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
    return {
      x: x3 + ub * (x4 - x3),
      y: y3 + ub * (y4 - y3),
      ropeT: ub,
    };
  }
  return null;
}

/**
 * Level Archetype Generator with 7+ distinct puzzle types,
 * varying ropes, pinball bouncers, quantum portals, moving buckets, and laser hazards.
 */
function createLevelConfig(lvl, arenaW, arenaH) {
  const archetypeIdx = (lvl - 1) % 7;

  let title = 'CASCADE DROP';
  let ropes = [];
  let bouncers = [];
  let portals = null;
  let laserHazards = [];
  let movingBucket = false;
  let bucketX = arenaW * 0.5 - BUCKET_WIDTH / 2;
  let spawnX = arenaW * 0.5;
  let spawnY = 75;

  if (archetypeIdx === 0) {
    // LEVEL 1: CASCADE DROP (Classic 3-tier slalom)
    title = 'CASCADE DROP';
    spawnX = arenaW * 0.45;
    ropes = [
      { id: 'r1', x1: arenaW * 0.2, y1: 150, x2: arenaW * 0.8, y2: 170, color: '#00F5FF' },
      { id: 'r2', x1: arenaW * 0.15, y1: 290, x2: arenaW * 0.72, y2: 320, color: '#39FF14' },
      { id: 'r3', x1: arenaW * 0.28, y1: 430, x2: arenaW * 0.85, y2: 450, color: '#FFD166' },
    ];
    bucketX = arenaW * 0.5 - BUCKET_WIDTH / 2;
  } else if (archetypeIdx === 1) {
    // LEVEL 2: TWIN HAMMOCK (Intersecting V-cradle)
    title = 'TWIN HAMMOCK';
    spawnX = arenaW * 0.5;
    ropes = [
      // Left cradle arm
      { id: 'r_left', x1: arenaW * 0.15, y1: 150, x2: arenaW * 0.58, y2: 240, color: '#FF007F' },
      // Right cradle arm
      { id: 'r_right', x1: arenaW * 0.42, y1: 240, x2: arenaW * 0.85, y2: 150, color: '#00F5FF' },
      // Mid deflector
      { id: 'r_mid', x1: arenaW * 0.25, y1: 370, x2: arenaW * 0.75, y2: 385, color: '#39FF14' },
      // Lower slide
      { id: 'r_bot', x1: arenaW * 0.35, y1: 490, x2: arenaW * 0.88, y2: 510, color: '#FFD166' },
    ];
    bucketX = arenaW * 0.25 - BUCKET_WIDTH / 2;
  } else if (archetypeIdx === 2) {
    // LEVEL 3: BOUNCER PINBALL (Elastic Neon Bumper Pads)
    title = 'BOUNCER PINBALL';
    spawnX = arenaW * 0.32;
    ropes = [
      { id: 'r1', x1: arenaW * 0.15, y1: 140, x2: arenaW * 0.65, y2: 160, color: '#00F5FF' },
      { id: 'r2', x1: arenaW * 0.4, y1: 320, x2: arenaW * 0.9, y2: 340, color: '#FF007F' },
      { id: 'r3', x1: arenaW * 0.1, y1: 460, x2: arenaW * 0.55, y2: 480, color: '#FFE600' },
    ];
    bouncers = [
      { id: 'b1', x: arenaW * 0.8, y: 230, r: 24, color: '#FF007F', flash: 0 },
      { id: 'b2', x: arenaW * 0.25, y: 390, r: 24, color: '#00F5FF', flash: 0 },
    ];
    bucketX = arenaW * 0.75 - BUCKET_WIDTH / 2;
  } else if (archetypeIdx === 3) {
    // LEVEL 4: KINETIC MAG-RAIL (Moving Target Receptor)
    title = 'KINETIC MAG-RAIL';
    spawnX = arenaW * 0.5;
    movingBucket = true;
    ropes = [
      { id: 'r1', x1: arenaW * 0.22, y1: 160, x2: arenaW * 0.78, y2: 160, color: '#00F5FF' },
      { id: 'r2', x1: arenaW * 0.1, y1: 290, x2: arenaW * 0.58, y2: 310, color: '#39FF14' },
      { id: 'r3', x1: arenaW * 0.42, y1: 420, x2: arenaW * 0.9, y2: 440, color: '#FF007F' },
      { id: 'r4', x1: arenaW * 0.2, y1: 520, x2: arenaW * 0.8, y2: 520, color: '#FFD166' },
    ];
    bucketX = arenaW * 0.5 - BUCKET_WIDTH / 2;
  } else if (archetypeIdx === 4) {
    // LEVEL 5: QUANTUM WORMHOLE (Portals Teleportation)
    title = 'QUANTUM WORMHOLE';
    spawnX = arenaW * 0.25;
    ropes = [
      { id: 'r1', x1: arenaW * 0.1, y1: 150, x2: arenaW * 0.55, y2: 180, color: '#00F5FF' },
      { id: 'r2', x1: arenaW * 0.45, y1: 420, x2: arenaW * 0.9, y2: 450, color: '#9D4EDD' },
    ];
    portals = {
      in: { x: arenaW * 0.75, y: 250, r: 20, color: '#00F5FF' },
      out: { x: arenaW * 0.25, y: 340, r: 20, color: '#9D4EDD' },
    };
    bouncers = [
      { id: 'b1', x: arenaW * 0.82, y: 350, r: 22, color: '#FF0055', flash: 0 },
    ];
    bucketX = arenaW * 0.5 - BUCKET_WIDTH / 2;
  } else if (archetypeIdx === 5) {
    // LEVEL 6: LASER SPIKE GRID (Static Lethal Beam)
    title = 'LASER HAZARD GRID';
    spawnX = arenaW * 0.5;
    ropes = [
      { id: 'r1', x1: arenaW * 0.15, y1: 140, x2: arenaW * 0.85, y2: 150, color: '#00F5FF' },
      { id: 'r2', x1: arenaW * 0.08, y1: 270, x2: arenaW * 0.48, y2: 300, color: '#39FF14' },
      { id: 'r3', x1: arenaW * 0.52, y1: 390, x2: arenaW * 0.92, y2: 420, color: '#FFD166' },
      { id: 'r4', x1: arenaW * 0.2, y1: 520, x2: arenaW * 0.8, y2: 530, color: '#FF007F' },
    ];
    // Mid-air lethal laser barrier
    laserHazards = [
      { id: 'lz1', x1: arenaW * 0.35, y1: 340, x2: arenaW * 0.65, y2: 340, color: '#FF0055' },
    ];
    bucketX = arenaW * 0.5 - BUCKET_WIDTH / 2;
  } else {
    // LEVEL 7+: GRAND QUANTUM LAB (Portals + Bouncers + Moving Bucket)
    title = 'GRAND QUANTUM LAB';
    spawnX = arenaW * 0.45;
    movingBucket = true;
    ropes = [
      { id: 'r1', x1: arenaW * 0.18, y1: 140, x2: arenaW * 0.82, y2: 150, color: '#00F5FF' },
      { id: 'r2', x1: arenaW * 0.1, y1: 270, x2: arenaW * 0.58, y2: 290, color: '#FF007F' },
      { id: 'r3', x1: arenaW * 0.42, y1: 410, x2: arenaW * 0.9, y2: 430, color: '#39FF14' },
    ];
    bouncers = [
      { id: 'b1', x: arenaW * 0.8, y: 220, r: 24, color: '#FFE600', flash: 0 },
    ];
    portals = {
      in: { x: arenaW * 0.2, y: 370, r: 20, color: '#00F5FF' },
      out: { x: arenaW * 0.65, y: 480, r: 20, color: '#9D4EDD' },
    };
    bucketX = arenaW * 0.5 - BUCKET_WIDTH / 2;
  }

  // Common rope properties
  const initializedRopes = ropes.map((r) => ({
    ...r,
    status: 'INTACT',
    swingAngle: 0,
    swingSpeed: 0,
  }));

  // 3 Strategic Collectible Stars along natural trajectory
  const stars = [
    { id: 's1', x: arenaW * 0.35 + ((lvl * 37) % 60), y: 210, taken: false },
    { id: 's2', x: arenaW * 0.68 - ((lvl * 29) % 50), y: 340, taken: false },
    { id: 's3', x: arenaW * 0.5 + (((lvl % 2) * 2 - 1) * 35), y: 470, taken: false },
  ];

  return {
    title,
    spawnX,
    spawnY,
    ropes: initializedRopes,
    bouncers,
    portals,
    laserHazards,
    movingBucket,
    bucketX,
    stars,
  };
}

export default function RopeCutGame({ onBackToHub, onScoreUpdate, isPaused = false }) {
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  const { width, height } = useWindowDimensions();
  const arenaWidth = width;
  const arenaHeight = height - 130;

  const [level, setLevel] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const savedLvl = await AsyncStorage.getItem(STORAGE_LEVEL_KEY);
        const savedScore = await AsyncStorage.getItem(STORAGE_BEST_KEY);
        if (savedLvl !== null) {
          const pLvl = parseInt(savedLvl, 10);
          if (!isNaN(pLvl) && pLvl >= 1) setLevel(pLvl);
        }
        if (savedScore !== null) {
          const pScore = parseInt(savedScore, 10);
          if (!isNaN(pScore)) setScore(pScore);
        }
      } catch {}
    })();
  }, []);
  const [levelTitle, setLevelTitle] = useState('CASCADE DROP');
  const [score, setScore] = useState(0);
  const [starsCollected, setStarsCollected] = useState(0);

  // Ball physics
  const [ball, setBall] = useState({
    x: arenaWidth * 0.5,
    y: 80,
    vx: 0,
    vy: 0,
  });

  // Level components
  const [ropes, setRopes] = useState([]);
  const [bouncers, setBouncers] = useState([]);
  const [portals, setPortals] = useState(null);
  const [laserHazards, setLaserHazards] = useState([]);
  const [stars, setStars] = useState([]);
  const [bucket, setBucket] = useState({
    x: arenaWidth * 0.5 - BUCKET_WIDTH / 2,
    y: arenaHeight - 65,
    baseX: arenaWidth * 0.5 - BUCKET_WIDTH / 2,
    isMoving: false,
  });

  const [cutTrail, setCutTrail] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('win');

  const ballRef = useRef(ball);
  ballRef.current = ball;
  const ropesRef = useRef(ropes);
  ropesRef.current = ropes;
  const bouncersRef = useRef(bouncers);
  bouncersRef.current = bouncers;
  const portalsRef = useRef(portals);
  portalsRef.current = portals;
  const laserHazardsRef = useRef(laserHazards);
  laserHazardsRef.current = laserHazards;
  const bucketRef = useRef(bucket);
  bucketRef.current = bucket;

  const tickCountRef = useRef(0);
  const portalCooldownRef = useRef(0);
  const animFrameRef = useRef(null);
  const isPlayingRef = useRef(true);
  const tickRef = useRef(null);

  // Initialize level
  const initLevel = useCallback(
    (lvl) => {
      isPlayingRef.current = true;
      setStarsCollected(0);
      setModalVisible(false);
      setCutTrail(null);
      tickCountRef.current = 0;
      portalCooldownRef.current = 0;

      if (!animFrameRef.current && tickRef.current) {
        animFrameRef.current = requestAnimationFrame(tickRef.current);
      }

      const cfg = createLevelConfig(lvl, arenaWidth, arenaHeight);
      setLevelTitle(cfg.title);

      const initBall = {
        x: cfg.spawnX,
        y: cfg.spawnY,
        vx: (lvl % 2 === 0 ? 0.4 : -0.4),
        vy: 0,
      };
      setBall(initBall);
      ballRef.current = initBall;

      setRopes(cfg.ropes);
      ropesRef.current = cfg.ropes;

      setBouncers(cfg.bouncers);
      bouncersRef.current = cfg.bouncers;

      setPortals(cfg.portals);
      portalsRef.current = cfg.portals;

      setLaserHazards(cfg.laserHazards);
      laserHazardsRef.current = cfg.laserHazards;

      setStars(cfg.stars);

      const initBucket = {
        x: cfg.bucketX,
        baseX: cfg.bucketX,
        y: arenaHeight - 65,
        isMoving: cfg.movingBucket,
      };
      setBucket(initBucket);
      bucketRef.current = initBucket;
    },
    [arenaWidth, arenaHeight]
  );

  useEffect(() => {
    initLevel(level);
  }, [level, initLevel]);

  // PanResponder to slice ropes
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isPausedRef.current && isPlayingRef.current,
      onMoveShouldSetPanResponder: () => !isPausedRef.current && isPlayingRef.current,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCutTrail({ x1: locationX, y1: locationY, x2: locationX, y2: locationY });
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCutTrail((prev) => {
          if (!prev) return { x1: locationX, y1: locationY, x2: locationX, y2: locationY };
          const p1 = { x: prev.x2, y: prev.y2 };
          const p2 = { x: locationX, y: locationY };

          setRopes((currentRopes) => {
            const updated = currentRopes.map((r) => {
              if (r.status !== 'INTACT') return r;

              const hit = checkLineIntersection(p1.x, p1.y, p2.x, p2.y, r.x1, r.y1, r.x2, r.y2);
              if (hit) {
                playSliceSound();
                triggerSliceHaptic();

                const isLeftCut = hit.x < (r.x1 + r.x2) / 2;
                const nextStatus = isLeftCut ? 'CUT_LEFT' : 'CUT_RIGHT';
                const initSwingSpeed = isLeftCut ? 5 : -5;

                return {
                  ...r,
                  status: nextStatus,
                  swingSpeed: initSwingSpeed,
                };
              }
              return r;
            });
            ropesRef.current = updated;
            return updated;
          });

          return { x1: prev.x1, y1: prev.y1, x2: locationX, y2: locationY };
        });
      },
      onPanResponderRelease: () => {
        setCutTrail(null);
      },
    })
  ).current;

  // 60 FPS Physics & Game Loop
  useEffect(() => {
    let active = true;

    const tick = () => {
      if (!active) return;
      if (isPausedRef.current || !isPlayingRef.current) {
        animFrameRef.current = requestAnimationFrame(tick);
        return;
      }
      tickCountRef.current += 1;

      if (portalCooldownRef.current > 0) {
        portalCooldownRef.current -= 1;
      }

      // 1. Moving Bucket Physics (if level enables moving target)
      const currentBucket = { ...bucketRef.current };
      if (currentBucket.isMoving) {
        const range = 75;
        const speed = 0.038;
        currentBucket.x =
          currentBucket.baseX + Math.sin(tickCountRef.current * speed) * range;
        bucketRef.current = currentBucket;
        setBucket(currentBucket);
      }

      // 2. Ball Gravity & Drag
      const currentBall = { ...ballRef.current };
      currentBall.vy += GRAVITY;
      currentBall.vx *= 0.99;

      let nextX = currentBall.x + currentBall.vx;
      let nextY = currentBall.y + currentBall.vy;

      // 3. Collision with Ropes
      const currentRopes = ropesRef.current;
      for (let i = 0; i < currentRopes.length; i++) {
        const r = currentRopes[i];

        if (r.status === 'INTACT') {
          const minX = Math.min(r.x1, r.x2) - 5;
          const maxX = Math.max(r.x1, r.x2) + 5;

          if (nextX >= minX && nextX <= maxX) {
            const ratio = (nextX - r.x1) / (r.x2 - r.x1 || 1);
            const ropeY = r.y1 + ratio * (r.y2 - r.y1);

            if (
              currentBall.y <= ropeY - BALL_RADIUS + 8 &&
              nextY >= ropeY - BALL_RADIUS - 4
            ) {
              nextY = ropeY - BALL_RADIUS;
              const slope = (r.y2 - r.y1) / (r.x2 - r.x1 || 1);
              currentBall.vx += slope * 0.45;
              currentBall.vy = currentBall.vx * slope;
              currentBall.vx *= 0.94;
            }
          }
        } else if (r.status === 'CUT_LEFT') {
          const ropeLen = Math.hypot(r.x2 - r.x1, r.y2 - r.y1);
          const rad = (r.swingAngle * Math.PI) / 180;
          const curX1 = r.x2 - ropeLen * Math.cos(rad);
          const curY1 = r.y2 + ropeLen * Math.sin(rad);

          if (nextX >= curX1 && nextX <= r.x2) {
            const ratio = (nextX - curX1) / (r.x2 - curX1 || 1);
            const ropeY = curY1 + ratio * (r.y2 - curY1);
            if (nextY >= ropeY - BALL_RADIUS && currentBall.y <= ropeY + BALL_RADIUS) {
              nextY = ropeY - BALL_RADIUS;
              currentBall.vx -= 1.2;
            }
          }
        } else if (r.status === 'CUT_RIGHT') {
          const ropeLen = Math.hypot(r.x2 - r.x1, r.y2 - r.y1);
          const rad = (r.swingAngle * Math.PI) / 180;
          const curX2 = r.x1 + ropeLen * Math.cos(rad);
          const curY2 = r.y1 + ropeLen * Math.sin(rad);

          if (nextX >= r.x1 && nextX <= curX2) {
            const ratio = (nextX - r.x1) / (curX2 - r.x1 || 1);
            const ropeY = r.y1 + ratio * (curY2 - r.y1);
            if (nextY >= ropeY - BALL_RADIUS && currentBall.y <= ropeY + BALL_RADIUS) {
              nextY = ropeY - BALL_RADIUS;
              currentBall.vx += 1.2;
            }
          }
        }
      }

      // 4. Collision with Pinball Neon Bouncers
      const currentBouncers = bouncersRef.current;
      for (const b of currentBouncers) {
        const dist = Math.hypot(nextX - b.x, nextY - b.y);
        if (dist < BALL_RADIUS + b.r) {
          const nx = (nextX - b.x) / dist;
          const ny = (nextY - b.y) / dist;
          const dot = currentBall.vx * nx + currentBall.vy * ny;

          // Elastic bounce deflection
          currentBall.vx = (currentBall.vx - 2 * dot * nx) * 1.18;
          currentBall.vy = (currentBall.vy - 2 * dot * ny) * 1.18;

          nextX = b.x + nx * (BALL_RADIUS + b.r + 3);
          nextY = b.y + ny * (BALL_RADIUS + b.r + 3);

          playTapSound();
          triggerMediumHaptic();
          b.flash = 12;
        }
      }

      // 5. Quantum Wormhole Portals
      const currentPortals = portalsRef.current;
      if (currentPortals && currentPortals.in && currentPortals.out) {
        const distIn = Math.hypot(nextX - currentPortals.in.x, nextY - currentPortals.in.y);
        if (distIn < BALL_RADIUS + currentPortals.in.r && portalCooldownRef.current <= 0) {
          // Teleport to Out Portal!
          nextX = currentPortals.out.x;
          nextY = currentPortals.out.y + 14;
          currentBall.vy = Math.max(3, Math.abs(currentBall.vy));
          portalCooldownRef.current = 40;
          playSliceSound();
          triggerSliceHaptic();
        }
      }

      // 6. Laser Hazards Collision
      const currentHazards = laserHazardsRef.current;
      for (const lz of currentHazards) {
        if (
          nextX >= lz.x1 - BALL_RADIUS &&
          nextX <= lz.x2 + BALL_RADIUS &&
          Math.abs(nextY - lz.y1) < BALL_RADIUS + 4
        ) {
          handleLose('DISINTEGRATED BY LETHAL LASER!');
          return;
        }
      }

      // 7. Wall Bouncing
      if (nextX < BALL_RADIUS) {
        nextX = BALL_RADIUS;
        currentBall.vx = -currentBall.vx * 0.65;
      } else if (nextX > arenaWidth - BALL_RADIUS) {
        nextX = arenaWidth - BALL_RADIUS;
        currentBall.vx = -currentBall.vx * 0.65;
      }

      currentBall.x = nextX;
      currentBall.y = nextY;
      ballRef.current = currentBall;
      setBall(currentBall);

      // 8. Animate Swinging Ropes
      setRopes((prev) =>
        prev.map((r) => {
          if (r.status === 'CUT_LEFT') {
            const nextAngle = Math.min(75, r.swingAngle + r.swingSpeed);
            return { ...r, swingAngle: nextAngle, swingSpeed: r.swingSpeed * 0.96 };
          }
          if (r.status === 'CUT_RIGHT') {
            const nextAngle = Math.min(75, r.swingAngle + Math.abs(r.swingSpeed));
            return { ...r, swingAngle: nextAngle, swingSpeed: r.swingSpeed * 0.96 };
          }
          return r;
        })
      );

      // 9. Collect Stars
      setStars((prevStars) =>
        prevStars.map((st) => {
          if (st.taken) return st;
          if (Math.hypot(nextX - st.x, nextY - st.y) < BALL_RADIUS + 16) {
            playSliceSound();
            setStarsCollected((c) => c + 1);
            return { ...st, taken: true };
          }
          return st;
        })
      );

      // 10. Check Bucket Catch (Victory)
      if (
        nextX >= currentBucket.x + 6 &&
        nextX <= currentBucket.x + BUCKET_WIDTH - 6 &&
        nextY >= currentBucket.y - 10 &&
        nextY <= currentBucket.y + BUCKET_HEIGHT
      ) {
        handleWin();
        return;
      }

      // 11. Check Fall Past Floor (Defeat)
      if (nextY > arenaHeight + 35) {
        handleLose('BALL FELL INTO THE ABYSS!');
        return;
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    tickRef.current = tick;
    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      active = false;
      tickRef.current = null;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [arenaWidth, arenaHeight]);

  const handleWin = () => {
    isPlayingRef.current = false;
    playTapSound();
    triggerSliceHaptic();

    const starBonus = starsCollected * 50;
    const levelScore = 200 + level * 50 + starBonus;
    const nextScore = score + levelScore;
    setScore(nextScore);
    onScoreUpdate?.(nextScore);
      AsyncStorage.setItem(STORAGE_BEST_KEY, String(nextScore)).catch(() => {});

    JuiceEngine.celebrate(width / 2, height / 2);
    setModalType('win');
    setModalVisible(true);
  };

  const [defeatMessage, setDefeatMessage] = useState('TRY AGAIN');
  const handleLose = (msg = 'BALL MISSED THE TARGET!') => {
    isPlayingRef.current = false;
    playGameOverSound();
    triggerGameOverHaptic();
    setDefeatMessage(msg);
    setModalType('gameover');
    setModalVisible(true);
  };

  const handleNextLevel = () => {
    setLevel((l) => {
      const nl = l + 1;
      AsyncStorage.setItem(STORAGE_LEVEL_KEY, String(nl)).catch(() => {});
      return nl;
    });
  };

  const handleRetry = () => {
    initLevel(level);
  };

  return (
    <View style={styles.container}>
      <MiniGameHeader
        floorNum={22}
        gameTitle="ROPE DROP"
        category="PHYSICS PUZZLE"
        accentColor="#00F5D4"
        score={score}
        onBack={onBackToHub}
        onBackToHub={onBackToHub}
      />

      {/* Top HUD: Stage Title & Stars */}
      <View style={styles.topHud}>
        <View style={styles.stageBox}>
          <Text style={styles.stageNum}>STAGE {level}</Text>
          <Text style={styles.stageTitle}>{levelTitle}</Text>
        </View>

        <View style={styles.starsRow}>
          {[0, 1, 2].map((i) => (
            <Text
              key={i}
              style={[
                styles.starIcon,
                { opacity: i < starsCollected ? 1 : 0.25 },
              ]}
            >
              ⭐
            </Text>
          ))}
        </View>

        <Text style={styles.hudHint}>SWIPE TO CUT</Text>
      </View>

      {/* Touch Arena for Physics & Slicing */}
      <View style={styles.arena} {...panResponder.panHandlers}>
        <Svg width={arenaWidth} height={arenaHeight} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="ballGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#00F5FF" stopOpacity="1" />
              <Stop offset="50%" stopColor="#0088FF" stopOpacity="1" />
              <Stop offset="100%" stopColor="#7928CA" stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id="bucketGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#00F5D4" stopOpacity="0.85" />
              <Stop offset="100%" stopColor="#0A2E2A" stopOpacity="0.95" />
            </LinearGradient>
            <RadialGradient id="bouncerGlow" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#FF007F" stopOpacity="0.8" />
              <Stop offset="70%" stopColor="#7928CA" stopOpacity="0.3" />
              <Stop offset="100%" stopColor="#7928CA" stopOpacity="0" />
            </RadialGradient>
          </Defs>

          {/* Ropes as Platforms */}
          {ropes.map((r) => {
            if (r.status === 'SEVERED') return null;

            let x1 = r.x1;
            let y1 = r.y1;
            let x2 = r.x2;
            let y2 = r.y2;

            if (r.status === 'CUT_LEFT') {
              const len = Math.hypot(r.x2 - r.x1, r.y2 - r.y1);
              const rad = (r.swingAngle * Math.PI) / 180;
              x1 = r.x2 - len * Math.cos(rad);
              y1 = r.y2 + len * Math.sin(rad);
            } else if (r.status === 'CUT_RIGHT') {
              const len = Math.hypot(r.x2 - r.x1, r.y2 - r.y1);
              const rad = (r.swingAngle * Math.PI) / 180;
              x2 = r.x1 + len * Math.cos(rad);
              y2 = r.y1 + len * Math.sin(rad);
            }

            return (
              <G key={r.id}>
                {/* Left and Right Anchors */}
                <Circle
                  cx={r.x1}
                  cy={r.y1}
                  r={6}
                  fill="#FFFFFF"
                  opacity={r.status === 'CUT_LEFT' ? 0.3 : 0.9}
                />
                <Circle
                  cx={r.x2}
                  cy={r.y2}
                  r={6}
                  fill="#FFFFFF"
                  opacity={r.status === 'CUT_RIGHT' ? 0.3 : 0.9}
                />
                {/* Thick Rope Body */}
                <Line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={r.color}
                  strokeWidth={4.5}
                  strokeLinecap="round"
                />
                {/* Rope Core Highlight */}
                <Line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  opacity={0.8}
                />
              </G>
            );
          })}

          {/* Neon Pinball Bouncers */}
          {bouncers.map((b) => (
            <G key={b.id}>
              {/* Outer Bumper Pulse Ring */}
              <Circle
                cx={b.x}
                cy={b.y}
                r={b.r + 6}
                stroke={b.color}
                strokeWidth={2}
                strokeDasharray="4 3"
                opacity={0.7}
              />
              {/* Core Solid Bumper */}
              <Circle cx={b.x} cy={b.y} r={b.r} fill="#140A28" stroke={b.color} strokeWidth={3} />
              <Circle cx={b.x} cy={b.y} r={b.r * 0.45} fill={b.color} opacity={0.9} />
            </G>
          ))}

          {/* Quantum Wormhole Portals */}
          {portals && (
            <G>
              {/* Portal IN (Cyan Vortex) */}
              <Circle
                cx={portals.in.x}
                cy={portals.in.y}
                r={portals.in.r}
                fill="#001828"
                stroke={portals.in.color}
                strokeWidth={3}
                strokeDasharray="5 3"
              />
              <Circle cx={portals.in.x} cy={portals.in.y} r={8} fill={portals.in.color} />

              {/* Portal OUT (Purple Vortex) */}
              <Circle
                cx={portals.out.x}
                cy={portals.out.y}
                r={portals.out.r}
                fill="#1C0632"
                stroke={portals.out.color}
                strokeWidth={3}
                strokeDasharray="5 3"
              />
              <Circle cx={portals.out.x} cy={portals.out.y} r={8} fill={portals.out.color} />
            </G>
          )}

          {/* Laser Hazard Barriers */}
          {laserHazards.map((lz) => (
            <G key={lz.id}>
              <Circle cx={lz.x1} cy={lz.y1} r={5} fill="#FF0055" />
              <Circle cx={lz.x2} cy={lz.y2} r={5} fill="#FF0055" />
              <Line
                x1={lz.x1}
                y1={lz.y1}
                x2={lz.x2}
                y2={lz.y2}
                stroke="#FF0055"
                strokeWidth={3.5}
              />
              <Line
                x1={lz.x1}
                y1={lz.y1}
                x2={lz.x2}
                y2={lz.y2}
                stroke="#FFFFFF"
                strokeWidth={1}
                strokeDasharray="4 2"
              />
            </G>
          ))}

          {/* Collectible Stars */}
          {stars.map((st) => {
            if (st.taken) return null;
            return (
              <G key={st.id}>
                <Circle cx={st.x} cy={st.y} r={14} fill="rgba(255, 209, 102, 0.25)" />
                <Circle cx={st.x} cy={st.y} r={8} fill="#FFD166" />
                <Circle cx={st.x} cy={st.y} r={3} fill="#FFFFFF" />
              </G>
            );
          })}

          {/* Target Receptor Bucket on Floor */}
          <G>
            {/* Mag-Rail track if bucket is moving */}
            {bucket.isMoving && (
              <Line
                x1={bucket.baseX - 75}
                y1={bucket.y + BUCKET_HEIGHT - 2}
                x2={bucket.baseX + BUCKET_WIDTH + 75}
                y2={bucket.y + BUCKET_HEIGHT - 2}
                stroke="#00F5FF"
                strokeWidth={2}
                strokeDasharray="6 4"
                opacity={0.6}
              />
            )}

            <Rect
              x={bucket.x}
              y={bucket.y}
              width={BUCKET_WIDTH}
              height={BUCKET_HEIGHT}
              fill="url(#bucketGrad)"
              stroke="#00F5D4"
              strokeWidth={2.5}
              rx={8}
            />
            {/* Bucket Rim */}
            <Rect
              x={bucket.x - 3}
              y={bucket.y}
              width={BUCKET_WIDTH + 6}
              height={6}
              fill="#FFFFFF"
              rx={3}
            />
          </G>

          {/* Falling Physics Ball */}
          <Circle
            cx={ball.x}
            cy={ball.y}
            r={BALL_RADIUS}
            fill="url(#ballGrad)"
            stroke="#FFFFFF"
            strokeWidth={2}
          />

          {/* Slicing Trail Line */}
          {cutTrail && (
            <Line
              x1={cutTrail.x1}
              y1={cutTrail.y1}
              x2={cutTrail.x2}
              y2={cutTrail.y2}
              stroke="#FFFFFF"
              strokeWidth={3}
              strokeLinecap="round"
            />
          )}
        </Svg>
      </View>

      <GameResultModal
        visible={modalVisible}
        type={modalType}
        score={score}
        level={level}
        onRetry={modalType === 'win' ? handleNextLevel : handleRetry}
        onBackToHub={onBackToHub}
        buttonText={modalType === 'win' ? 'NEXT LEVEL' : 'TRY AGAIN'}
        message={
          modalType === 'win'
            ? `STAGE ${level} SECURED! (+${starsCollected} STARS)`
            : defeatMessage
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#03020E',
  },
  topHud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(8, 4, 24, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 245, 212, 0.25)',
  },
  stageBox: {
    flexDirection: 'column',
  },
  stageNum: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '900',
    color: '#00F5D4',
    letterSpacing: 0.5,
  },
  stageTitle: {
    fontFamily: monoFont,
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starIcon: {
    fontSize: 14,
  },
  hudHint: {
    fontFamily: monoFont,
    fontSize: 9.5,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.65)',
    letterSpacing: 0.8,
  },
  arena: {
    flex: 1,
    position: 'relative',
  },
});
