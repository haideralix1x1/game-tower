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
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  playSpeedUpSound,
  playGameOverSound,
} from '../utils/sound';

const STORAGE_KEY = '@game_tower:best_breaker_v2';
const BRICK_ROWS = 6;
const BRICK_COLS = 6;
const MODES = [
  { id: 'EASY', label: 'EASY', color: COLORS.matrixMint },
  { id: 'NORMAL', label: 'NORMAL', color: COLORS.cyan },
  { id: 'HARD', label: '⚔️ RIVAL AI', color: '#FF0055' },
];

const hexToRgba = (hex, alpha = 1) => {
  if (!hex || typeof hex !== 'string') return `rgba(0, 245, 255, ${alpha})`;
  const clean = hex.replace('#', '');
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
};

const ROW_THEMES = [
  { primary: '#FF007F', secondary: '#B5179E', hp: 2 },
  { primary: '#FF5E00', secondary: '#D00000', hp: 2 },
  { primary: '#FFD166', secondary: '#F77F00', hp: 1 },
  { primary: '#00F5D4', secondary: '#06D6A0', hp: 1 },
  { primary: '#00F5FF', secondary: '#0088FF', hp: 1 },
  { primary: '#C77DFF', secondary: '#7209B7', hp: 1 },
];

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const buildBricks = (arenaWidth, arenaHeight, wave = 1, mode = 'NORMAL') => {
  const padX = 10;
  const gap = 5;
  const brickW = Math.floor(
    (arenaWidth - padX * 2 - gap * (BRICK_COLS - 1)) / BRICK_COLS
  );
  const brickH = 20;
  const list = [];
  const totalBrickH = BRICK_ROWS * brickH + (BRICK_ROWS - 1) * gap;
  // In HARD mode (AI Rival), bricks are positioned right in the middle between AI and Player!
  const startY =
    mode === 'HARD' ? Math.floor(arenaHeight * 0.5 - totalBrickH / 2) : 38;

  for (let r = 0; r < BRICK_ROWS; r += 1) {
    const theme = ROW_THEMES[r % ROW_THEMES.length];
    const maxHp = r < 2 ? theme.hp + Math.floor((wave - 1) / 2) : 1;

    for (let c = 0; c < BRICK_COLS; c += 1) {
      // Hazard bricks (~18% chance, especially in rows 2-4)
      const isHazard =
        r >= 1 &&
        r <= 4 &&
        ((r * BRICK_COLS + c) % 5 === 2 || (mode === 'HARD' && (r * BRICK_COLS + c) % 7 === 1));

      list.push({
        id: `b_${wave}_${r}_${c}`,
        x: padX + c * (brickW + gap),
        y: startY + r * (brickH + gap),
        width: brickW,
        height: brickH,
        color: isHazard ? '#FF0055' : theme.primary,
        secondary: isHazard ? '#880022' : theme.secondary,
        hp: isHazard ? 1 : maxHp,
        maxHp: isHazard ? 1 : maxHp,
        isHazard,
        alive: true,
      });
    }
  }
  return list;
};

export default function BrickBreakerGame({ onBackToHub, onScoreUpdate }) {
  const { width, height } = useWindowDimensions();
  const arenaWidth = Math.min(390, width - 24);
  const arenaHeight = Math.min(520, Math.max(380, height - 200));
  const basePaddleW = 96;
  const paddleHeight = 14;
  const paddleY = arenaHeight - 34;
  const ballRadius = 8;

  // AI Rival specifications (for HARD mode)
  const aiPaddleY = 24;
  const baseAiPaddleW = 86;
  const aiPaddleHeight = 14;

  const juiceRef = useRef(null);

  const [mode, setMode] = useState('NORMAL');
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);
  const [status, setStatus] = useState('READY'); // 'READY' | 'PLAYING' | 'GAME_OVER'
  const [speedActive, setSpeedActive] = useState(false);

  const [renderState, setRenderState] = useState(() => ({
    paddleX: (arenaWidth - basePaddleW) / 2,
    paddleW: basePaddleW,
    aiPaddleX: (arenaWidth - baseAiPaddleW) / 2,
    aiPaddleW: baseAiPaddleW,
    aiStunned: false,
    balls: [
      {
        id: 'ball_0',
        x: arenaWidth / 2,
        y: paddleY - ballRadius - 2,
        trail: [],
        lastHitBy: 'PLAYER',
      },
    ],
    powerUps: [],
    hazards: [],
    bricks: buildBricks(arenaWidth, arenaHeight, 1, 'NORMAL'),
  }));

  const engineRef = useRef({
    mode: 'NORMAL',
    status: 'READY',
    paddleX: (arenaWidth - basePaddleW) / 2,
    paddleW: basePaddleW,
    wideTimer: 0,
    speedTimer: 0,
    aiPaddleX: (arenaWidth - baseAiPaddleW) / 2,
    aiPaddleW: baseAiPaddleW,
    aiWideTimer: 0,
    aiStunTimer: 0,
    balls: [
      {
        id: 'ball_0',
        x: arenaWidth / 2,
        y: paddleY - ballRadius - 2,
        vx: 215,
        vy: -285,
        trail: [],
        lastHitBy: 'PLAYER',
      },
    ],
    powerUps: [],
    hazards: [],
    bricks: buildBricks(arenaWidth, arenaHeight, 1, 'NORMAL'),
    score: 0,
    best: 0,
    lives: 3,
    wave: 1,
    combo: 0,
    ballCounter: 1,
  });

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = parseInt(saved, 10) || 0;
          setBestScore(parsed);
          engineRef.current.best = parsed;
        }
      } catch {}
    })();
  }, []);

  const persistBest = useCallback(
    async (nextScore) => {
      if (onScoreUpdate) onScoreUpdate(nextScore);
      if (nextScore > engineRef.current.best) {
        engineRef.current.best = nextScore;
        setBestScore(nextScore);
        try {
          await AsyncStorage.setItem(STORAGE_KEY, String(nextScore));
        } catch {}
      }
    },
    [onScoreUpdate]
  );

  const launchBall = useCallback(() => {
    const eng = engineRef.current;
    if (eng.status === 'READY') {
      eng.status = 'PLAYING';
      const baseSpeed =
        eng.mode === 'HARD' ? 240 : eng.mode === 'EASY' ? 175 : 205;
      const angle = (Math.random() > 0.5 ? 1 : -1) * (baseSpeed * 0.7);

      const initialBalls = [
        {
          id: 'ball_player',
          x: eng.paddleX + eng.paddleW / 2,
          y: paddleY - ballRadius - 2,
          vx: angle,
          vy: -baseSpeed,
          trail: [],
          lastHitBy: 'PLAYER',
        },
      ];

      // In HARD mode (Rival AI), AI launches with its own separate ball!
      if (eng.mode === 'HARD') {
        initialBalls.push({
          id: 'ball_ai',
          x: eng.aiPaddleX + eng.aiPaddleW / 2,
          y: aiPaddleY + aiPaddleHeight + ballRadius + 2,
          vx: -angle,
          vy: baseSpeed,
          trail: [],
          lastHitBy: 'AI',
        });
      }

      eng.balls = initialBalls;
      setStatus('PLAYING');
      triggerLightHaptic();
      playTapSound();
    }
  }, [paddleY, aiPaddleY, aiPaddleHeight, ballRadius]);

  const resetFullGame = useCallback(
    (chosenMode) => {
      const activeMode = chosenMode || engineRef.current.mode;
      const freshBricks = buildBricks(arenaWidth, arenaHeight, 1, activeMode);
      const startPadX = (arenaWidth - basePaddleW) / 2;
      const startAiX = (arenaWidth - baseAiPaddleW) / 2;

      const initBalls = [
        {
          id: 'ball_0',
          x: startPadX + basePaddleW / 2,
          y: paddleY - ballRadius - 2,
          vx: 210,
          vy: -280,
          trail: [],
          lastHitBy: 'PLAYER',
        },
      ];

      if (activeMode === 'HARD') {
        initBalls.push({
          id: 'ball_ai_0',
          x: startAiX + baseAiPaddleW / 2,
          y: aiPaddleY + aiPaddleHeight + ballRadius + 2,
          vx: -210,
          vy: 280,
          trail: [],
          lastHitBy: 'AI',
        });
      }

      engineRef.current = {
        ...engineRef.current,
        mode: activeMode,
        status: 'READY',
        paddleX: startPadX,
        paddleW: basePaddleW,
        wideTimer: 0,
        speedTimer: 0,
        aiPaddleX: startAiX,
        aiPaddleW: baseAiPaddleW,
        aiWideTimer: 0,
        aiStunTimer: 0,
        balls: initBalls,
        powerUps: [],
        hazards: [],
        bricks: freshBricks,
        score: 0,
        lives: 3,
        wave: 1,
        combo: 0,
        ballCounter: 1,
      };

      setScore(0);
      setLives(3);
      setWave(1);
      setRenderState({
        paddleX: startPadX,
        paddleW: basePaddleW,
        aiPaddleX: startAiX,
        aiPaddleW: baseAiPaddleW,
        aiStunned: false,
        balls: initBalls,
        powerUps: [],
        hazards: [],
        bricks: freshBricks,
      });
      setStatus('READY');
      setSpeedActive(false);
    },
    [arenaWidth, arenaHeight, basePaddleW, baseAiPaddleW, paddleY, aiPaddleY, aiPaddleHeight, ballRadius]
  );

  const switchMode = (newMode) => {
    setMode(newMode);
    resetFullGame(newMode);
    triggerLightHaptic();
  };

  useEffect(() => {
    let rafId = null;
    let lastTime = 0;

    const tick = (ts) => {
      if (!lastTime) lastTime = ts;
      const dt = Math.min(0.032, (ts - lastTime) / 1000);
      lastTime = ts;

      const eng = engineRef.current;

      // Handle Wide Paddle Timer
      if (eng.wideTimer > 0) {
        eng.wideTimer -= dt;
        if (eng.wideTimer <= 0) {
          eng.paddleW = basePaddleW;
        }
      }

      // Handle AI Wide Paddle Timer
      if (eng.aiWideTimer > 0) {
        eng.aiWideTimer -= dt;
        if (eng.aiWideTimer <= 0) {
          eng.aiPaddleW = baseAiPaddleW;
        }
      }

      // Handle AI Stun Timer
      if (eng.aiStunTimer > 0) {
        eng.aiStunTimer -= dt;
      }

      // Handle 2X Speed Timer
      if (eng.speedTimer > 0) {
        eng.speedTimer -= dt;
        if (eng.speedTimer <= 0) {
          setSpeedActive(false);
        }
      }

      // READY state: ball sticks to player's paddle (and AI's paddle in HARD mode)
      if (eng.status === 'READY') {
        const bx = eng.paddleX + eng.paddleW / 2;
        const by = paddleY - ballRadius - 2;

        const readyBalls = [
          {
            id: 'ball_player_ready',
            x: bx,
            y: by,
            vx: 0,
            vy: 0,
            trail: [],
            lastHitBy: 'PLAYER',
          },
        ];

        if (eng.mode === 'HARD') {
          const aiBx = eng.aiPaddleX + eng.aiPaddleW / 2;
          const aiBy = aiPaddleY + aiPaddleHeight + ballRadius + 2;
          readyBalls.push({
            id: 'ball_ai_ready',
            x: aiBx,
            y: aiBy,
            vx: 0,
            vy: 0,
            trail: [],
            lastHitBy: 'AI',
          });
        }

        eng.balls = readyBalls;
        setRenderState((prev) => ({
          ...prev,
          paddleX: eng.paddleX,
          paddleW: eng.paddleW,
          aiPaddleX: eng.aiPaddleX,
          aiPaddleW: eng.aiPaddleW,
          aiStunned: false,
          balls: readyBalls,
        }));
      } else if (eng.status === 'PLAYING') {
        const speedMult = eng.speedTimer > 0 ? 1.6 : 1.0;
        const pointMult = eng.speedTimer > 0 ? 2 : 1;

        // 1. AI Rival Paddle Movement (HARD MODE)
        if (eng.mode === 'HARD') {
          if (eng.aiStunTimer <= 0) {
            // Find the ball traveling toward AI (vy < 0) with lowest y
            let targetBall = null;
            let lowestY = arenaHeight;
            for (let i = 0; i < eng.balls.length; i += 1) {
              const b = eng.balls[i];
              if (b.vy < 0 && b.y < lowestY) {
                targetBall = b;
                lowestY = b.y;
              }
            }
            if (targetBall) {
              const targetX = targetBall.x - eng.aiPaddleW / 2;
              const diff = targetX - eng.aiPaddleX;
              const aiMaxStep = 240 * dt;
              eng.aiPaddleX += Math.max(-aiMaxStep, Math.min(aiMaxStep, diff));
            } else {
              // Return towards center if no incoming ball
              const centerX = (arenaWidth - eng.aiPaddleW) / 2;
              const diff = centerX - eng.aiPaddleX;
              eng.aiPaddleX += Math.max(-80 * dt, Math.min(80 * dt, diff));
            }
          }
          eng.aiPaddleX = Math.max(
            4,
            Math.min(arenaWidth - eng.aiPaddleW - 4, eng.aiPaddleX)
          );
        }

        // 2. Update Balls Physics & Collisions
        const aliveBalls = [];

        for (let bIdx = 0; bIdx < eng.balls.length; bIdx += 1) {
          const ball = eng.balls[bIdx];
          let nx = ball.x + ball.vx * dt * speedMult;
          let ny = ball.y + ball.vy * dt * speedMult;

          // Trail
          const newTrail = [
            { x: ball.x, y: ball.y },
            ...ball.trail.slice(0, eng.speedTimer > 0 ? 7 : 4),
          ];

          // Wall bounces (Left & Right)
          if (nx - ballRadius <= 4) {
            nx = 4 + ballRadius;
            ball.vx = Math.abs(ball.vx);
            playTapSound();
          } else if (nx + ballRadius >= arenaWidth - 4) {
            nx = arenaWidth - 4 - ballRadius;
            ball.vx = -Math.abs(ball.vx);
            playTapSound();
          }

          // Top Collision: AI Rival Paddle (HARD mode) or Solid Ceiling (NORMAL/EASY)
          if (eng.mode === 'HARD') {
            // Check AI Paddle bounce
            if (
              ball.vy < 0 &&
              ny - ballRadius <= aiPaddleY + aiPaddleHeight &&
              ny + ballRadius >= aiPaddleY &&
              nx >= eng.aiPaddleX - 8 &&
              nx <= eng.aiPaddleX + eng.aiPaddleW + 8
            ) {
              ny = aiPaddleY + aiPaddleHeight + ballRadius;
              const offset =
                (nx - (eng.aiPaddleX + eng.aiPaddleW / 2)) / (eng.aiPaddleW / 2);
              ball.vx = offset * 280;
              ball.vy = Math.min(480, Math.abs(ball.vy) * 1.03);
              ball.lastHitBy = 'AI';
              playSliceSound();
              if (juiceRef.current) {
                juiceRef.current.burst(nx, aiPaddleY + 80, '#FF0055', 8);
              }
            } else if (ny - ballRadius <= 0) {
              // Ball passed AI Rival -> PLAYER SCORES A GOAL!
              ny = ballRadius + 6;
              ball.vy = Math.abs(ball.vy);
              eng.score += 500 * pointMult;
              eng.aiStunTimer = 1.6;
              setScore(eng.score);
              persistBest(eng.score);
              triggerPerfectHaptic(3);
              playSpeedUpSound();
              if (juiceRef.current) {
                juiceRef.current.celebrate(
                  'GOAL! +500 PTS',
                  'BALL PASSED AI RIVAL',
                  COLORS.neonYellow
                );
                juiceRef.current.shake(8, 6);
                juiceRef.current.burst(nx, 80, COLORS.neonYellow, 16);
              }
            }
          } else {
            // Normal ceiling bounce
            if (ny - ballRadius <= 6) {
              ny = 6 + ballRadius;
              ball.vy = Math.abs(ball.vy);
              playTapSound();
            }
          }

          // Player Paddle Collision
          if (
            ball.vy > 0 &&
            ny + ballRadius >= paddleY &&
            ny - ballRadius <= paddleY + paddleHeight + 6 &&
            nx >= eng.paddleX - 8 &&
            nx <= eng.paddleX + eng.paddleW + 8
          ) {
            ny = paddleY - ballRadius;
            const hitOffset =
              (nx - (eng.paddleX + eng.paddleW / 2)) / (eng.paddleW / 2);
            ball.vx = hitOffset * 290;
            ball.vy = -Math.min(500, Math.abs(ball.vy) * 1.02);
            ball.lastHitBy = 'PLAYER';
            eng.combo = 0;
            triggerLightHaptic();
            playSliceSound();
            if (juiceRef.current) {
              juiceRef.current.burst(nx, paddleY + 50, COLORS.cyan, 8);
            }
          }

          // Brick Collisions
          for (let i = 0; i < eng.bricks.length; i += 1) {
            const b = eng.bricks[i];
            if (!b.alive) continue;
            if (
              nx + ballRadius >= b.x &&
              nx - ballRadius <= b.x + b.width &&
              ny + ballRadius >= b.y &&
              ny - ballRadius <= b.y + b.height
            ) {
              ball.vy = -ball.vy;
              b.hp -= 1;
              eng.combo += 1;

              if (b.hp <= 0) {
                b.alive = false;
                const gained = 20 * Math.min(6, eng.combo) * pointMult;
                eng.score += gained;
                setScore(eng.score);
                persistBest(eng.score);
                triggerSliceHaptic();
                playPerfectSound(Math.min(9, eng.combo));

                if (juiceRef.current) {
                  juiceRef.current.shake(5, 4);
                  juiceRef.current.burst(
                    b.x + b.width / 2,
                    b.y + 85,
                    b.color,
                    14
                  );
                  if (eng.combo >= 2) {
                    juiceRef.current.popup(
                      `COMBO x${eng.combo}!`,
                      `+${gained} PTS`,
                      b.color,
                      b.x + b.width / 2,
                      b.y + 70
                    );
                  }
                }

                // If this is a Hazard Brick: releases a falling hazard entity!
                if (b.isHazard) {
                  eng.hazards.push({
                    id: `haz_${ts}_${i}`,
                    x: b.x + b.width / 2 - 14,
                    y: b.y + b.height,
                    width: 28,
                    height: 16,
                    vy:
                      eng.mode === 'HARD'
                        ? 190
                        : eng.mode === 'NORMAL'
                          ? 155
                          : 120,
                  });
                  if (juiceRef.current) {
                    juiceRef.current.popup(
                      '⚠️ HAZARD RELEASED!',
                      'DODGE WITH PADDLE',
                      COLORS.danger,
                      b.x + b.width / 2,
                      b.y + 70
                    );
                  }
                } else {
                  // 28% chance to drop Power-Up capsule
                  if (Math.random() < 0.28) {
                    const types = ['MULTI', 'SPEED_2X', 'WIDE', 'LIFE', 'BONUS'];
                    const pick =
                      types[Math.floor(Math.random() * types.length)];
                    const isAiDrop =
                      eng.mode === 'HARD' && ball.lastHitBy === 'AI';

                    eng.powerUps.push({
                      id: `pu_${ts}_${i}`,
                      x: b.x + b.width / 2 - 20,
                      y: b.y,
                      type: pick,
                      target: isAiDrop ? 'AI' : 'PLAYER',
                      vy: isAiDrop ? -145 : 150,
                      color:
                        pick === 'MULTI'
                          ? '#C084FC'
                          : pick === 'SPEED_2X'
                            ? '#FF5E00'
                            : pick === 'WIDE'
                              ? COLORS.cyan
                              : pick === 'LIFE'
                                ? COLORS.magenta
                                : COLORS.solarGold,
                    });
                  }
                }
              } else {
                // Armored brick cracked
                eng.score += 10 * pointMult;
                setScore(eng.score);
                triggerLightHaptic();
                playTapSound();
                if (juiceRef.current) {
                  juiceRef.current.shake(3, 2);
                }
              }
              break;
            }
          }

          // Check if ball fell below the bottom
          if (ny - ballRadius > arenaHeight) {
            // Ball lost out of bounds
            continue;
          }

          aliveBalls.push({
            ...ball,
            x: nx,
            y: ny,
            trail: newTrail,
          });
        }

        eng.balls = aliveBalls;

        // 3. Update Falling Hazards (Dodging Gameplay)
        if (eng.hazards.length > 0) {
          const nextHazards = [];
          for (let i = 0; i < eng.hazards.length; i += 1) {
            const h = eng.hazards[i];
            const hy = h.y + h.vy * dt;

            // Check if hazard touches player paddle
            const hitPaddle =
              hy + h.height >= paddleY &&
              hy <= paddleY + paddleHeight + 6 &&
              h.x + h.width >= eng.paddleX - 4 &&
              h.x <= eng.paddleX + eng.paddleW + 4;

            if (hitPaddle) {
              eng.lives -= 1;
              setLives(eng.lives);
              triggerGameOverHaptic();
              playGameOverSound();
              if (juiceRef.current) {
                juiceRef.current.shake(14, 12);
                juiceRef.current.flash(COLORS.danger);
                juiceRef.current.popup(
                  '⚠️ HAZARD HIT!',
                  '-1 SHIELD LOST',
                  COLORS.danger,
                  h.x,
                  paddleY - 20
                );
              }
              if (eng.lives <= 0) {
                eng.status = 'GAME_OVER';
                setStatus('GAME_OVER');
                break;
              }
            } else if (hy < arenaHeight) {
              nextHazards.push({ ...h, y: hy });
            }
          }
          eng.hazards = nextHazards;
        }

        // 4. Update Power-Up Capsules
        if (eng.powerUps.length > 0) {
          const nextPu = [];
          for (let i = 0; i < eng.powerUps.length; i += 1) {
            const p = eng.powerUps[i];
            const py = p.y + p.vy * dt;

            if (p.target === 'AI') {
              // Dropping UPWARD towards AI Rival Paddle
              const aiCaught =
                py <= aiPaddleY + aiPaddleHeight + 4 &&
                py >= aiPaddleY &&
                p.x + 40 >= eng.aiPaddleX &&
                p.x <= eng.aiPaddleX + eng.aiPaddleW;

              if (aiCaught) {
                if (p.type === 'WIDE') {
                  eng.aiPaddleW = Math.min(140, baseAiPaddleW + 36);
                  eng.aiWideTimer = 10;
                }
                playTapSound();
                if (juiceRef.current) {
                  juiceRef.current.popup(
                    'AI RIVAL BOOSTED!',
                    `POWERED UP ${p.type}`,
                    '#FF0055',
                    p.x,
                    aiPaddleY + 30
                  );
                }
              } else if (py > 0) {
                nextPu.push({ ...p, y: py });
              }
            } else {
              // Dropping DOWNWARD towards Player Paddle
              const playerCaught =
                py + 20 >= paddleY &&
                py <= paddleY + paddleHeight + 8 &&
                p.x + 40 >= eng.paddleX &&
                p.x <= eng.paddleX + eng.paddleW;

              if (playerCaught) {
                triggerPerfectHaptic(2);
                playSpeedUpSound();

                if (p.type === 'MULTI') {
                  // Multi-ball: multiplies balls by spawning extras from existing balls
                  const newBalls = [];
                  const maxCap = 6;
                  eng.balls.forEach((b) => {
                    newBalls.push(b);
                    if (newBalls.length < maxCap) {
                      eng.ballCounter += 1;
                      newBalls.push({
                        id: `b_extra_${eng.ballCounter}_A`,
                        x: b.x,
                        y: b.y,
                        vx: b.vx * 0.85 - 110,
                        vy: b.vy,
                        trail: [],
                        lastHitBy: 'PLAYER',
                      });
                    }
                    if (newBalls.length < maxCap) {
                      eng.ballCounter += 1;
                      newBalls.push({
                        id: `b_extra_${eng.ballCounter}_B`,
                        x: b.x,
                        y: b.y,
                        vx: b.vx * 0.85 + 110,
                        vy: b.vy,
                        trail: [],
                        lastHitBy: 'PLAYER',
                      });
                    }
                  });
                  eng.balls = newBalls;
                  if (juiceRef.current) {
                    juiceRef.current.celebrate(
                      '3X MULTI-BALL!',
                      'SPHERES MULTIPLIED',
                      '#C084FC'
                    );
                  }
                } else if (p.type === 'SPEED_2X') {
                  // 2X Speed & Double Points for 8 seconds
                  eng.speedTimer = 8;
                  setSpeedActive(true);
                  if (juiceRef.current) {
                    juiceRef.current.celebrate(
                      '2X TURBO SPEED!',
                      '8S DOUBLE SCORE',
                      '#FF5E00'
                    );
                  }
                } else if (p.type === 'WIDE') {
                  eng.paddleW = Math.min(150, basePaddleW + 44);
                  eng.wideTimer = 10;
                  if (juiceRef.current) {
                    juiceRef.current.celebrate(
                      'WIDE PADDLE!',
                      '10S EXPANSION',
                      COLORS.cyan
                    );
                  }
                } else if (p.type === 'LIFE') {
                  eng.lives = Math.min(5, eng.lives + 1);
                  setLives(eng.lives);
                  if (juiceRef.current) {
                    juiceRef.current.celebrate(
                      '+1 SHIELD!',
                      'EXTRA SPHERE',
                      COLORS.magenta
                    );
                  }
                } else {
                  eng.score += 150 * pointMult;
                  setScore(eng.score);
                  persistBest(eng.score);
                  if (juiceRef.current) {
                    juiceRef.current.celebrate(
                      '+150 BONUS!',
                      'POWER CORE',
                      COLORS.solarGold
                    );
                  }
                }
              } else if (py < arenaHeight) {
                nextPu.push({ ...p, y: py });
              }
            }
          }
          eng.powerUps = nextPu;
        }

        // 5. Check if all bricks cleared -> Next Wave
        if (eng.bricks.every((b) => !b.alive)) {
          eng.wave += 1;
          eng.bricks = buildBricks(arenaWidth, arenaHeight, eng.wave, eng.mode);
          eng.score += 300 * pointMult;
          eng.status = 'READY';
          setWave(eng.wave);
          setScore(eng.score);
          setStatus('READY');
          persistBest(eng.score);
          triggerPerfectHaptic(3);
          playSpeedUpSound();
          if (juiceRef.current) {
            juiceRef.current.celebrate(
              `WAVE ${eng.wave}!`,
              '+300 CLEAR BONUS',
              COLORS.matrixMint
            );
          }
        }

        // 6. Check if ALL balls were lost
        if (eng.balls.length === 0 && eng.status === 'PLAYING') {
          eng.lives -= 1;
          setLives(eng.lives);
          triggerGameOverHaptic();
          playGameOverSound();
          if (juiceRef.current) {
            juiceRef.current.shake(12, 9);
            juiceRef.current.flash(COLORS.danger);
          }

          if (eng.lives <= 0) {
            eng.status = 'GAME_OVER';
            setStatus('GAME_OVER');
          } else {
            eng.status = 'READY';
            setStatus('READY');
          }
        }

        // 7. Update UI Render State
        setRenderState({
          paddleX: eng.paddleX,
          paddleW: eng.paddleW,
          aiPaddleX: eng.aiPaddleX,
          aiPaddleW: eng.aiPaddleW,
          aiStunned: eng.aiStunTimer > 0,
          balls: eng.balls.map((b) => ({
            id: b.id,
            x: b.x,
            y: b.y,
            trail: [...b.trail],
            lastHitBy: b.lastHitBy,
          })),
          powerUps: [...eng.powerUps],
          hazards: [...eng.hazards],
          bricks: [...eng.bricks],
        });
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [arenaWidth, arenaHeight, paddleY, persistBest]);

  const dragStartRef = useRef({ startPaddleX: (arenaWidth - basePaddleW) / 2 });

  // 1:1 Smooth Delta PanResponder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartRef.current.startPaddleX = engineRef.current.paddleX;
        if (engineRef.current.status === 'READY') {
          launchBall();
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const eng = engineRef.current;
        const targetX = dragStartRef.current.startPaddleX + gestureState.dx;
        const clamped = Math.max(
          4,
          Math.min(arenaWidth - eng.paddleW - 4, targetX)
        );
        eng.paddleX = clamped;
      },
    })
  ).current;

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={localStyles.container}>
        <LinearGradient
          colors={['#03030A', '#090B22', '#170B32']}
          style={StyleSheet.absoluteFillObject}
        />

        <MiniGameHeader
          title="BRICK BREAKER NEO"
          floorLabel={
            mode === 'HARD'
              ? 'FLOOR 10 // AI RIVAL DUEL'
              : 'FLOOR 10 // PLASMA ARKANOID'
          }
          score={score}
          bestScore={bestScore}
          accentColor={mode === 'HARD' ? '#FF0055' : COLORS.cyan}
          onBack={onBackToHub}
          onReset={() => resetFullGame(mode)}
        />

        <View style={localStyles.body}>
          {/* Mode Selector & Status Header */}
          <View style={[localStyles.statusBar, { width: arenaWidth }]}>
            <View style={localStyles.modeSelector}>
              {MODES.map((m) => {
                const isActive = mode === m.id;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => switchMode(m.id)}
                    style={[
                      localStyles.modeTab,
                      isActive && {
                        backgroundColor: hexToRgba(m.color, 0.28),
                        borderColor: m.color,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        localStyles.modeTabText,
                        isActive && { color: m.color, fontWeight: '900' },
                      ]}
                    >
                      {m.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={localStyles.statsRight}>
              {speedActive && (
                <View style={localStyles.speedPill}>
                  <Text style={localStyles.speedPillText}>⚡ 2X SPD</Text>
                </View>
              )}
              <Text style={localStyles.waveBadge}>{`W0${wave}`}</Text>
              <Text style={localStyles.heartsText}>
                {Array.from({ length: Math.max(0, lives) })
                  .map(() => '♥')
                  .join(' ')}
              </Text>
            </View>
          </View>

          {/* Interactive Touch Arena with Smooth PanResponder */}
          <View
            {...panResponder.panHandlers}
            style={[
              localStyles.arena,
              { width: arenaWidth, height: arenaHeight },
              mode === 'HARD' && { borderColor: 'rgba(255, 0, 85, 0.45)' },
            ]}
          >
            {/* Top AI Rival Paddle in HARD Mode */}
            {mode === 'HARD' && (
              <View
                pointerEvents="none"
                style={[
                  localStyles.aiPaddle,
                  {
                    left: renderState.aiPaddleX,
                    top: aiPaddleY,
                    width: renderState.aiPaddleW,
                    height: aiPaddleHeight,
                    opacity: renderState.aiStunned ? 0.35 : 1,
                  },
                ]}
              >
                <LinearGradient
                  colors={['#FF0055', '#7928CA']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFillObject}
                />
                <Text style={localStyles.aiPaddleLabel}>
                  {renderState.aiStunned ? '⚡ STUNNED' : 'RIVAL AI'}
                </Text>
              </View>
            )}

            {/* Neon Bricks */}
            {renderState.bricks.map(
              (b) =>
                b.alive && (
                  <View
                    key={b.id}
                    pointerEvents="none"
                    style={[
                      localStyles.brick,
                      {
                        left: b.x,
                        top: b.y,
                        width: b.width,
                        height: b.height,
                        borderColor: b.isHazard
                          ? '#FF0055'
                          : b.hp > 1
                            ? '#FFFFFF'
                            : b.color,
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={[b.color, b.secondary]}
                      style={StyleSheet.absoluteFillObject}
                    />
                    {b.isHazard ? (
                      <Text style={localStyles.hazardIcon}>⚠️</Text>
                    ) : (
                      b.hp > 1 && <View style={localStyles.armorStripe} />
                    )}
                  </View>
                )
            )}

            {/* Falling Hazards (Watch Out!) */}
            {renderState.hazards.map((h) => (
              <View
                key={h.id}
                pointerEvents="none"
                style={[
                  localStyles.hazardBlock,
                  {
                    left: h.x,
                    top: h.y,
                    width: h.width,
                    height: h.height,
                  },
                ]}
              >
                <Text style={localStyles.hazardFallingText}>⚠️</Text>
              </View>
            ))}

            {/* Power-Up Capsules */}
            {renderState.powerUps.map((p) => (
              <View
                key={p.id}
                pointerEvents="none"
                style={[
                  localStyles.powerUpPill,
                  {
                    left: p.x,
                    top: p.y,
                    borderColor: p.color,
                    backgroundColor: hexToRgba(p.color, 0.25),
                  },
                ]}
              >
                <Text style={[localStyles.powerUpText, { color: p.color }]}>
                  {p.type === 'SPEED_2X'
                    ? '2X SPD'
                    : p.type === 'MULTI'
                      ? '3X BALL'
                      : p.type}
                </Text>
              </View>
            ))}

            {/* Comet Trails for All Active Balls */}
            {renderState.balls.map((b) =>
              b.trail.map((pt, idx) => {
                const size = Math.max(3, ballRadius * 2 * (1 - idx * 0.18));
                return (
                  <View
                    key={`trail_${b.id}_${idx}`}
                    pointerEvents="none"
                    style={[
                      localStyles.ballTrail,
                      {
                        left: pt.x - size / 2,
                        top: pt.y - size / 2,
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        backgroundColor: speedActive
                          ? '#FF5E00'
                          : b.lastHitBy === 'AI'
                            ? '#FF0055'
                            : COLORS.cyan,
                        opacity: 0.45 - idx * 0.08,
                      },
                    ]}
                  />
                );
              })
            )}

            {/* All Plasma Balls */}
            {renderState.balls.map((b) => (
              <View
                key={b.id}
                pointerEvents="none"
                style={[
                  localStyles.ball,
                  {
                    left: b.x - ballRadius,
                    top: b.y - ballRadius,
                    width: ballRadius * 2,
                    height: ballRadius * 2,
                    borderRadius: ballRadius,
                    borderColor: speedActive
                      ? '#FF5E00'
                      : b.lastHitBy === 'AI'
                        ? '#FF0055'
                        : COLORS.cyan,
                  },
                ]}
              />
            ))}

            {/* Cyber Player Paddle */}
            <View
              pointerEvents="none"
              style={[
                localStyles.paddle,
                {
                  left: renderState.paddleX,
                  top: paddleY,
                  width: renderState.paddleW,
                  height: paddleHeight,
                },
              ]}
            >
              <LinearGradient
                colors={[COLORS.cyan, COLORS.electricBlue]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
            </View>

            {/* Tap to Launch Prompt */}
            {status === 'READY' && (
              <View style={localStyles.readyBanner} pointerEvents="none">
                <Text style={localStyles.readyText}>
                  TAP OR SLIDE ARENA TO LAUNCH
                </Text>
              </View>
            )}

            {/* Game Over Modal */}
            <GameResultModal
              visible={status === 'GAME_OVER'}
              type="GAME_OVER"
              title="SHIELDS DEPLETED!"
              subtitle={`ALL SPHERES LOST // WAVE 0${wave} // ${mode === 'HARD' ? 'RIVAL AI' : mode}`}
              score={score}
              bestScore={bestScore}
              accentColor="#FF007F"
              onRetry={() => resetFullGame(mode)}
              retryLabel="PLAY AGAIN"
              onBackToHub={onBackToHub}
            />
          </View>

          {/* Dedicated Left/Right Slide Buttons */}
          <View style={[localStyles.controlsRow, { width: arenaWidth }]}>
            <Pressable
              onPress={() => {
                if (engineRef.current.status === 'READY') launchBall();
                const eng = engineRef.current;
                eng.paddleX = Math.max(
                  4,
                  Math.min(arenaWidth - eng.paddleW - 4, eng.paddleX - 44)
                );
              }}
              style={localStyles.moveBtn}
            >
              <Text style={localStyles.moveBtnText}>◀ LEFT</Text>
            </Pressable>

            <Text style={localStyles.dragHint}>
              {mode === 'HARD'
                ? 'OUTPLAY AI RIVAL & DODGE ⚠️'
                : 'SLIDE FINGER ON ARENA'}
            </Text>

            <Pressable
              onPress={() => {
                if (engineRef.current.status === 'READY') launchBall();
                const eng = engineRef.current;
                eng.paddleX = Math.max(
                  4,
                  Math.min(arenaWidth - eng.paddleW - 4, eng.paddleX + 44)
                );
              }}
              style={localStyles.moveBtn}
            >
              <Text style={localStyles.moveBtnText}>RIGHT ▶</Text>
            </Pressable>
          </View>
        </View>
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
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 4,
  },
  modeTab: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  modeTabText: {
    fontSize: 9.5,
    fontFamily: monoFont,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  statsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  speedPill: {
    backgroundColor: 'rgba(255, 94, 0, 0.22)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FF5E00',
  },
  speedPillText: {
    fontSize: 9.5,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#FF5E00',
  },
  waveBadge: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.cyan,
    letterSpacing: 1.1,
  },
  heartsText: {
    fontSize: 15,
    color: COLORS.magenta,
    letterSpacing: 2.5,
  },
  arena: {
    backgroundColor: 'rgba(6, 8, 22, 0.94)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 245, 255, 0.42)',
    position: 'relative',
    overflow: 'hidden',
  },
  aiPaddle: {
    position: 'absolute',
    borderRadius: 6,
    borderWidth: 1.2,
    borderColor: '#FF0055',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiPaddleLabel: {
    fontSize: 7.5,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  brick: {
    position: 'absolute',
    borderRadius: 6,
    borderWidth: 1.2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hazardIcon: {
    fontSize: 10,
  },
  hazardBlock: {
    position: 'absolute',
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#FF0055',
    backgroundColor: 'rgba(255, 0, 85, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hazardFallingText: {
    fontSize: 9.5,
  },
  armorStripe: {
    height: 3,
    width: '60%',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 1.5,
  },
  powerUpPill: {
    position: 'absolute',
    width: 48,
    height: 19,
    borderRadius: 9.5,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  powerUpText: {
    fontSize: 8.5,
    fontFamily: monoFont,
    fontWeight: '900',
  },
  ballTrail: {
    position: 'absolute',
  },
  ball: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
  },
  paddle: {
    position: 'absolute',
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
  },
  readyBanner: {
    position: 'absolute',
    bottom: 78,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  readyText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.solarGold,
    backgroundColor: 'rgba(4, 4, 14, 0.88)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.solarGold,
    letterSpacing: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 4, 14, 0.86)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  overlayCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(12, 12, 28, 0.96)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.magenta,
    padding: 24,
    width: '90%',
  },
  overlayTitle: {
    fontSize: 22,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.magenta,
    letterSpacing: 1.5,
  },
  overlaySub: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '800',
    color: '#FFFFFF',
    marginVertical: 12,
  },
  retryBtn: {
    backgroundColor: COLORS.cyan,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 4,
  },
  retryText: {
    fontSize: 12.5,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#030308',
    letterSpacing: 1.4,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  moveBtn: {
    backgroundColor: 'rgba(0, 245, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.45)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  moveBtnText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.cyan,
  },
  dragHint: {
    fontSize: 9.5,
    fontFamily: monoFont,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
});
