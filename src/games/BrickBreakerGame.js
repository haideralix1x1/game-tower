import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  useWindowDimensions,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MiniGameHeader from '../components/MiniGameHeader';
import JuiceEngine from '../components/JuiceEngine';
import GameResultModal from '../components/GameResultModal';
import {
  triggerLightHaptic,
  triggerMediumHaptic,
  triggerSliceHaptic,
  triggerPerfectHaptic,
  triggerGameOverHaptic,
} from '../utils/haptics';
import {
  playTapSound,
  playSliceSound,
  playSpeedUpSound,
  playGameOverSound,
} from '../utils/sound';

const STORAGE_KEY = '@game_tower:best_breaker_v5';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

// Safe helper for haptics so hardware exceptions never crash the game loop
const safeHaptic = (fn, ...args) => {
  try {
    fn?.(...args);
  } catch {}
};

const safeSound = (fn, ...args) => {
  try {
    fn?.(...args);
  } catch {}
};

// 3 Game Modes
const MODES = [
  {
    id: 'SINGLE_BRICKS',
    label: '🧱 SOLO BRICKS',
    color: '#00F5FF',
    desc: 'Classic brick breaker with designs, armored bricks & falling power-ups',
  },
  {
    id: 'AI_BRICK_DUEL',
    label: '⚔️ CENTER DUEL',
    color: '#00F5D4',
    desc: 'Center brick field score battle against AI rival',
  },
  {
    id: 'HARD_SPHERE_DUEL',
    label: '🔥 HARD AI DUEL',
    color: '#FF0055',
    desc: 'No bricks, pure high-velocity balls vs predictive AI',
  },
];

// Artistic Brick Designs for Solo and Center Duel
// Artistic Brick Designs for Solo and Center Duel (10 Distinct Levels)
const BRICK_DESIGNS = [
  {
    name: 'HEART',
    icon: '❤️',
    rows: [
      '. S S . . S S .',
      'S A P S S P A S',
      'S A A A A A A S',
      '. S A A A A S .',
      '. . S A A S . .',
      '. . . S S . . .',
    ],
  },
  {
    name: 'DIAMOND',
    icon: '💎',
    rows: [
      '. . . S S . . .',
      '. . S P P S . .',
      '. S A A A A S .',
      'S A P A A P A S',
      '. S A A A A S .',
      '. . S E E S . .',
      '. . . S S . . .',
    ],
  },
  {
    name: 'SMILEY',
    icon: '😊',
    rows: [
      '. S S S S S S .',
      'S S E S S E S S',
      'S S S S S S S S',
      'S A . . . . A S',
      'S S A A A A S S',
      '. S S S S S S .',
    ],
  },
  {
    name: 'INVADER',
    icon: '👾',
    rows: [
      '. . S . . S . .',
      '. . . S S . . .',
      '. S S S S S S .',
      'S S P S S P S S',
      'S S S S S S S S',
      'S . S S S S . S',
    ],
  },
  {
    name: 'FORTRESS',
    icon: '🏰',
    rows: [
      'S . S . . S . S',
      'S S S . . S S S',
      'S U S S S S U S',
      'S A A A A A A S',
      'S A P A A P A S',
      'S S S S S S S S',
    ],
  },
  {
    name: 'CROWN',
    icon: '👑',
    rows: [
      'S . . S . . S .',
      'S S . S . S S .',
      'S A S S S A S S',
      'S P A A A A P S',
      'S S S S S S S S',
    ],
  },
  {
    name: 'STAR',
    icon: '⭐',
    rows: [
      '. . . S S . . .',
      '. S S S S S S .',
      '. . S P P S . .',
      'S S A A A A S S',
      '. . S A A S . .',
      '. S S . . S S .',
    ],
  },
  {
    name: 'PYRAMID',
    icon: '🔺',
    rows: [
      '. . . S S . . .',
      '. . S P P S . .',
      '. S A A A A S .',
      'S A E A A E A S',
      'S S S S S S S S',
    ],
  },
  {
    name: 'SKULL',
    icon: '💀',
    rows: [
      '. S S S S S S .',
      'S A E S S E A S',
      'S A S S S S A S',
      '. S S A A S S .',
      '. . S S S S . .',
    ],
  },
  {
    name: 'GALAXY',
    icon: '🌌',
    rows: [
      'S P S . . S P S',
      'A S A S S A S A',
      '. A S E E S A .',
      'A S A S S A S A',
      'S P S . . S P S',
    ],
  },
];

// Power-Up Capsule Types falling from bricks (10 Various Abilities)
const CAPSULE_TYPES = [
  { id: 'MULTI_BALL', name: 'MULTI-BALL', icon: '🔮', color: '#FFE600' },
  { id: 'WIDE_PADDLE', name: 'WIDE PADDLE', icon: '📏', color: '#00F5FF' },
  { id: 'FIRE_BALL', name: 'FIRE COMET', icon: '🔥', color: '#FF6D00' },
  { id: 'SLOW_BALL', name: 'SLOW MOTION', icon: '⏱️', color: '#C77DFF' },
  { id: 'SAFETY_SHIELD', name: 'SHIELD NET', icon: '🛡️', color: '#00F5D4' },
  { id: 'LASER_CANNON', name: 'LASER BLASTER', icon: '🔫', color: '#FF0055' },
  { id: 'PENETRATING_BALL', name: 'PLASMA PIERCER', icon: '⚡', color: '#A066FF' },
  { id: 'MAGNET_PADDLE', name: 'MAGNET CATCH', icon: '🧲', color: '#FFB703' },
  { id: 'EXPLOSIVE_BALL', name: 'BOMB SHOCKWAVE', icon: '💣', color: '#FF3366' },
  { id: 'EXTRA_LIFE', name: 'SHIELD REPAIR', icon: '❤️', color: '#FF2A6D' },
];

// Sphere Duel Ability Types (Mode 3)
const SPHERE_ABILITIES = [
  { id: 'MULTI_BALL', name: 'MULTI-BALL', icon: '🔮', duration: 8 },
  { id: 'SPEED_UP', name: 'HYPER SPEED', icon: '⚡', duration: 7 },
  { id: 'BIG_BALL', name: 'MEGA HEAVY', icon: '💥', duration: 8 },
  { id: 'MINI_BALL', name: 'MINI BALL', icon: '🌀', duration: 8 },
];

const INITIAL_HEARTS = 4;
const DEFAULT_BALL_RADIUS = 8;
const HEAVY_BALL_RADIUS = 18;
const PADDLE_HEIGHT = 14;

export default function BrickBreakerGame({ onBackToHub, onScoreUpdate, isPaused = false }) {
  const insets = useSafeAreaInsets();
  const isPausedRef = useRef(isPaused);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const { width, height } = useWindowDimensions();
  const arenaWidth = Math.min(width - 24, 420);
  const availableHeight = height - insets.top - insets.bottom;
  const arenaHeight = Math.max(400, Math.min(560, availableHeight - 165));

  const basePaddleW = Math.min(94, arenaWidth * 0.26);
  const paddleY = arenaHeight - 38;
  const aiPaddleY = 32;

  // Selected Mode
  const [mode, setMode] = useState('SINGLE_BRICKS');
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  // Lives / Hearts
  const [playerHearts, setPlayerHearts] = useState(INITIAL_HEARTS);
  const [aiHearts, setAiHearts] = useState(INITIAL_HEARTS);

  // Ball launched state (all modes require Tap to Start)
  const [ballLaunched, setBallLaunched] = useState(false);

  // Ability state
  const [nextAbilityCountdown, setNextAbilityCountdown] = useState(5);
  const [activeAbility, setActiveAbility] = useState(null);

  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('win');
  const [modalTitle, setModalTitle] = useState('');
  const [modalSubtitle, setModalSubtitle] = useState('');

  // 60 FPS Render state
  const [renderState, setRenderState] = useState({
    paddleX: (arenaWidth - basePaddleW) / 2,
    paddleW: basePaddleW,
    paddleOffsetY: 0,
    aiPaddleX: (arenaWidth - basePaddleW) / 2,
    aiPaddleW: basePaddleW,
    aiPaddleOffsetY: 0,
    balls: [],
    bricks: [],
    capsules: [],
    lasers: [],
    hasShield: false,
    aiHasShield: false,
    hasLaser: false,
    hasMagnet: false,
  });

  const juiceRef = useRef(null);

  // Engine Mutable Reference
  const engineRef = useRef({
    running: true,
    mode: 'SINGLE_BRICKS',
    level: 1,
    score: 0,
    aiScore: 0,
    best: 0,
    playerHearts: INITIAL_HEARTS,
    aiHearts: INITIAL_HEARTS,
    paddleX: (arenaWidth - basePaddleW) / 2,
    paddleW: basePaddleW,
    paddleRecoil: 0,
    aiPaddleX: (arenaWidth - basePaddleW) / 2,
    aiPaddleW: basePaddleW,
    aiPaddleRecoil: 0,
    balls: [],
    bricks: [],
    capsules: [],
    lasers: [],
    hasShield: false,
    aiHasShield: false,
    ballLaunched: false,
    // Periodic ball spawn timer for AI vs Player duel (every 18 seconds)
    ballSpawnTimer: 18.0,
    // Power-up timers
    wideTimer: 0,
    aiWideTimer: 0,
    fireBallTimer: 0,
    slowTimer: 0,
    laserTimer: 0,
    laserCooldown: 0,
    pierceTimer: 0,
    magnetTimer: 0,
    explosiveTimer: 0,
    levelClearing: false,
    // Sphere duel ability timer (Mode 3)
    abilityTimer: 5.0,
    nextAbilityIdx: 0,
    activeAbility: null,
    activeAbilityTimer: 0,
  });

  // Load high score
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
      onScoreUpdate?.(nextScore);
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

  // Generate Bricks Grid from Artistic Design
  const createBricksForLevel = useCallback((lvl, curMode) => {
    const design = BRICK_DESIGNS[(lvl - 1) % BRICK_DESIGNS.length];
    const rows = design.rows;
    const numCols = 8;
    const numRows = rows.length;

    const marginX = 14;
    const gap = 4;
    const brickW = Math.floor((arenaWidth - marginX * 2 - (numCols - 1) * gap) / numCols);
    const brickH = 16;

    // Start Y: top half for Solo, middle of arena for Center Duel
    let startY = 48;
    if (curMode === 'AI_BRICK_DUEL') {
      startY = Math.floor(arenaHeight * 0.35);
    }

    const bricks = [];
    for (let r = 0; r < numRows; r++) {
      const rowTokens = rows[r].trim().split(/\s+/);
      for (let c = 0; c < numCols; c++) {
        const token = rowTokens[c] || '.';
        if (token === '.') continue;

        const bx = marginX + c * (brickW + gap);
        const by = startY + r * (brickH + gap);

        let type = 'SOFT';
        let hp = 1;
        let color = '#00F5FF';
        let pts = 10;

        if (token === 'S') {
          type = 'SOFT';
          hp = 1;
          color = '#00F5FF';
          pts = 10;
        } else if (token === 'A') {
          type = 'ARMORED';
          hp = 2;
          color = '#C77DFF';
          pts = 30;
        } else if (token === 'H') {
          type = 'HEAVY';
          hp = 3;
          color = '#FFD166';
          pts = 50;
        } else if (token === 'U') {
          type = 'UNBREAKABLE';
          hp = Infinity;
          color = '#8A8F9E';
          pts = 5;
        } else if (token === 'E') {
          type = 'EXPLOSIVE';
          hp = 1;
          color = '#FF0055';
          pts = 40;
        } else if (token === 'P') {
          type = 'POWERUP';
          hp = 1;
          color = '#00F5D4';
          pts = 30;
        }

        bricks.push({
          id: `b_${r}_${c}`,
          row: r,
          col: c,
          x: bx,
          y: by,
          w: brickW,
          h: brickH,
          type,
          hp,
          maxHp: hp,
          color,
          pts,
        });
      }
    }
    return bricks;
  }, [arenaWidth, arenaHeight]);

  // Reset or Start Game
  const resetGame = useCallback(
    (chosenMode = mode, nextLvl = 1, keepScore = false) => {
      const eng = engineRef.current;
      const startPadX = (arenaWidth - basePaddleW) / 2;
      const safeLvl = Math.max(1, Math.min(BRICK_DESIGNS.length, nextLvl));

      eng.running = true;
      eng.levelClearing = false;
      eng.mode = chosenMode;
      eng.level = safeLvl;
      if (!keepScore) {
        eng.score = 0;
        eng.aiScore = 0;
        eng.playerHearts = INITIAL_HEARTS;
        eng.aiHearts = INITIAL_HEARTS;
      } else {
        eng.playerHearts = Math.min(INITIAL_HEARTS, eng.playerHearts + 1);
      }
      eng.paddleX = startPadX;
      eng.paddleW = basePaddleW;
      eng.paddleRecoil = 0;
      eng.aiPaddleX = startPadX;
      eng.aiPaddleW = basePaddleW;
      eng.aiPaddleRecoil = 0;
      eng.capsules = [];
      eng.lasers = [];
      eng.hasShield = false;
      eng.aiHasShield = false;
      eng.ballLaunched = false;
      eng.ballSpawnTimer = 18.0;
      eng.wideTimer = 0;
      eng.aiWideTimer = 0;
      eng.fireBallTimer = 0;
      eng.slowTimer = 0;
      eng.laserTimer = 0;
      eng.laserCooldown = 0;
      eng.pierceTimer = 0;
      eng.magnetTimer = 0;
      eng.explosiveTimer = 0;
      eng.abilityTimer = 5.0;
      eng.nextAbilityIdx = 0;
      eng.activeAbility = null;
      eng.activeAbilityTimer = 0;

      let initialBricks = [];
      let initialBalls = [];

      if (chosenMode === 'SINGLE_BRICKS') {
        // Mode 1: Solo Bricks (1 ball docked to player paddle)
        initialBricks = createBricksForLevel(safeLvl, chosenMode);
        initialBalls = [
          {
            id: 'solo_ball_1',
            x: startPadX + basePaddleW / 2,
            y: paddleY - DEFAULT_BALL_RADIUS - 2,
            vx: 0,
            vy: 0,
            r: DEFAULT_BALL_RADIUS,
            color: '#00F5FF',
            isFire: false,
            isHeavy: false,
            lastHitter: 'PLAYER',
            owner: 'PLAYER',
          },
        ];
      } else if (chosenMode === 'AI_BRICK_DUEL') {
        // Mode 2: Center Brick Duel (1 ball on Player paddle, 1 ball on AI paddle)
        initialBricks = createBricksForLevel(safeLvl, chosenMode);
        initialBalls = [
          {
            id: 'duel_ball_player',
            x: startPadX + basePaddleW / 2,
            y: paddleY - DEFAULT_BALL_RADIUS - 2,
            vx: 0,
            vy: 0,
            r: DEFAULT_BALL_RADIUS,
            color: '#00F5FF',
            isFire: false,
            isHeavy: false,
            lastHitter: 'PLAYER',
            owner: 'PLAYER',
          },
          {
            id: 'duel_ball_ai',
            x: startPadX + basePaddleW / 2,
            y: aiPaddleY + PADDLE_HEIGHT + DEFAULT_BALL_RADIUS + 2,
            vx: 0,
            vy: 0,
            r: DEFAULT_BALL_RADIUS,
            color: '#FF007F',
            isFire: false,
            isHeavy: false,
            lastHitter: 'AI',
            owner: 'AI',
          },
        ];
      } else {
        // Mode 3: Hard AI Ball Duel (No Bricks: 1 ball on Player, 1 ball on AI)
        initialBricks = [];
        initialBalls = [
          {
            id: 'hard_ball_player',
            x: startPadX + basePaddleW / 2,
            y: paddleY - DEFAULT_BALL_RADIUS - 2,
            vx: 0,
            vy: 0,
            r: DEFAULT_BALL_RADIUS,
            color: '#00F5FF',
            isFire: false,
            isHeavy: false,
            lastHitter: 'PLAYER',
            owner: 'PLAYER',
          },
          {
            id: 'hard_ball_ai',
            x: startPadX + basePaddleW / 2,
            y: aiPaddleY + PADDLE_HEIGHT + DEFAULT_BALL_RADIUS + 2,
            vx: 0,
            vy: 0,
            r: DEFAULT_BALL_RADIUS,
            color: '#FF007F',
            isFire: false,
            isHeavy: false,
            lastHitter: 'AI',
            owner: 'AI',
          },
        ];
      }

      eng.bricks = initialBricks;
      eng.balls = initialBalls;

      setMode(chosenMode);
      setLevel(safeLvl);
      if (!keepScore) {
        setScore(0);
        setAiScore(0);
        setPlayerHearts(INITIAL_HEARTS);
        setAiHearts(INITIAL_HEARTS);
      } else {
        setScore(eng.score);
        setPlayerHearts(eng.playerHearts);
      }
      setBallLaunched(false);
      setNextAbilityCountdown(5);
      setActiveAbility(null);
      setModalVisible(false);

      setRenderState({
        paddleX: startPadX,
        paddleW: basePaddleW,
        paddleOffsetY: 0,
        aiPaddleX: startPadX,
        aiPaddleW: basePaddleW,
        aiPaddleOffsetY: 0,
        balls: initialBalls,
        bricks: initialBricks,
        capsules: [],
        lasers: [],
        hasShield: false,
        aiHasShield: false,
        hasLaser: false,
        hasMagnet: false,
      });

      if (juiceRef.current) {
        juiceRef.current.flash(chosenMode === 'HARD_SPHERE_DUEL' ? '#FF0055' : '#00F5FF');
      }
    },
    [arenaWidth, basePaddleW, paddleY, aiPaddleY, createBricksForLevel, mode]
  );

  // Seamless Level Clear Transition
  const handleLevelClear = useCallback(
    (clearedLvl) => {
      const eng = engineRef.current;
      if (eng.levelClearing) return;
      eng.levelClearing = true;
      eng.running = false;

      const clearBonus = 150;
      eng.score += clearBonus;
      setScore(eng.score);
      persistBest(eng.score);

      safeSound(playPerfectSound);
      safeHaptic(triggerPerfectHaptic);

      const nextLvl = (clearedLvl % BRICK_DESIGNS.length) + 1;

      if (juiceRef.current) {
        juiceRef.current.flash(COLORS.matrixMint);
        juiceRef.current.burst(arenaWidth / 2, arenaHeight / 2, COLORS.matrixMint, 36);
        juiceRef.current.popup(
          '🎉 DESIGN CLEARED!',
          `+${clearBonus} PTS! ADVANCING TO LEVEL ${nextLvl}...`,
          COLORS.matrixMint
        );
      }

      setTimeout(() => {
        eng.levelClearing = false;
        if (clearedLvl < BRICK_DESIGNS.length) {
          resetGame('SINGLE_BRICKS', clearedLvl + 1, true);
        } else {
          setModalType('win');
          setModalTitle('CHAMPION VICTORY!');
          setModalSubtitle(`ALL ${BRICK_DESIGNS.length} DESIGNS CONQUERED!\nFINAL SCORE: ${eng.score}`);
          setModalVisible(true);
        }
      }, 1200);
    },
    [arenaWidth, arenaHeight, persistBest, resetGame]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      resetGame(mode, 1);
    }, 0);
    return () => clearTimeout(timer);
  }, [mode, resetGame]);

  // Launch Balls on Tap or Release Caught Balls
  const handleLaunchBall = useCallback(() => {
    const eng = engineRef.current;

    // Wake up physics engine immediately
    eng.running = true;

    // Check for any magnet-caught balls on player paddle to release immediately
    const hasCaughtBall = eng.balls.some((b) => b.caught);
    if (hasCaughtBall) {
      let releasedAny = false;
      for (const b of eng.balls) {
        if (b.caught) {
          b.caught = false;
          b.caughtTimer = 0;
          const hitOffset = (b.x - (eng.paddleX + eng.paddleW / 2)) / (eng.paddleW / 2);
          const maxAngle = Math.PI * 0.38;
          const angle = -Math.PI / 2 + Math.max(-1, Math.min(1, hitOffset)) * maxAngle;
          const spd = 340;
          b.vx = Math.cos(angle) * spd;
          b.vy = Math.sin(angle) * spd;
          releasedAny = true;
        }
      }
      if (releasedAny) {
        safeSound(playTapSound);
        safeHaptic(triggerLightHaptic);
      }
      eng.ballLaunched = true;
      setBallLaunched(true);
      return;
    }

    // Guarantee balls array is never empty when launching
    if (eng.balls.length === 0) {
      if (eng.mode === 'SINGLE_BRICKS') {
        eng.balls = [
          {
            id: `solo_ball_${Date.now()}`,
            x: eng.paddleX + eng.paddleW / 2,
            y: paddleY - DEFAULT_BALL_RADIUS - 2,
            vx: 0,
            vy: 0,
            r: DEFAULT_BALL_RADIUS,
            color: '#00F5FF',
            isFire: false,
            isHeavy: false,
            lastHitter: 'PLAYER',
            owner: 'PLAYER',
          },
        ];
      } else {
        eng.balls = [
          {
            id: `duel_ball_player_${Date.now()}`,
            x: eng.paddleX + eng.paddleW / 2,
            y: paddleY - DEFAULT_BALL_RADIUS - 2,
            vx: 0,
            vy: 0,
            r: DEFAULT_BALL_RADIUS,
            color: '#00F5FF',
            isFire: false,
            isHeavy: false,
            lastHitter: 'PLAYER',
            owner: 'PLAYER',
          },
          {
            id: `duel_ball_ai_${Date.now()}`,
            x: eng.aiPaddleX + eng.aiPaddleW / 2,
            y: aiPaddleY + PADDLE_HEIGHT + DEFAULT_BALL_RADIUS + 2,
            vx: 0,
            vy: 0,
            r: DEFAULT_BALL_RADIUS,
            color: '#FF007F',
            isFire: false,
            isHeavy: false,
            lastHitter: 'AI',
            owner: 'AI',
          },
        ];
      }
    }

    eng.ballLaunched = true;
    setBallLaunched(true);
    safeSound(playTapSound);
    safeHaptic(triggerLightHaptic);

    if (eng.mode === 'SINGLE_BRICKS') {
      if (eng.balls.length > 0) {
        const b = eng.balls[0];
        b.caught = false;
        b.caughtTimer = 0;
        const speed = 320;
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
        b.vx = Math.cos(angle) * speed;
        b.vy = Math.sin(angle) * speed;
      }
    } else if (eng.mode === 'AI_BRICK_DUEL') {
      const speed = 270;
      if (eng.balls[0]) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
        eng.balls[0].vx = Math.cos(angle) * speed;
        eng.balls[0].vy = Math.sin(angle) * speed;
        eng.balls[0].lastHitter = 'PLAYER';
      }
      if (eng.balls[1]) {
        const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
        eng.balls[1].vx = Math.cos(angle) * speed;
        eng.balls[1].vy = Math.sin(angle) * speed;
        eng.balls[1].lastHitter = 'AI';
      }
    } else {
      const speed = 340;
      if (eng.balls[0]) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
        eng.balls[0].vx = Math.cos(angle) * speed;
        eng.balls[0].vy = Math.sin(angle) * speed;
        eng.balls[0].lastHitter = 'PLAYER';
      }
      if (eng.balls[1]) {
        const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.6;
        eng.balls[1].vx = Math.cos(angle) * speed;
        eng.balls[1].vy = Math.sin(angle) * speed;
        eng.balls[1].lastHitter = 'AI';
      }
    }
  }, [paddleY, aiPaddleY]);

  // Main 60 FPS Physics Loop
  useEffect(() => {
    let lastTime = Date.now();
    let frameId = null;

    const tick = () => {
      const now = Date.now();
      const dt = Math.min(0.04, (now - lastTime) / 1000);
      lastTime = now;

      const eng = engineRef.current;

      try {
        if (!isPausedRef.current && eng.running) {
          // --- 0. SPRING BACK PADDLE RECOIL ---
          if (Math.abs(eng.paddleRecoil) > 0.05) {
            eng.paddleRecoil *= 0.82;
          } else {
            eng.paddleRecoil = 0;
          }
          if (Math.abs(eng.aiPaddleRecoil) > 0.05) {
            eng.aiPaddleRecoil *= 0.82;
          } else {
            eng.aiPaddleRecoil = 0;
          }

          // --- 0B. PRE-LAUNCH STATE: BALLS STICK TO PADDLES ---
          if (!eng.ballLaunched) {
            for (const b of eng.balls) {
              if (b.owner === 'AI' || b.lastHitter === 'AI') {
                b.x = eng.aiPaddleX + eng.aiPaddleW / 2;
                b.y = aiPaddleY + PADDLE_HEIGHT + b.r + 2;
                b.vx = 0;
                b.vy = 0;
              } else {
                b.x = eng.paddleX + eng.paddleW / 2;
                b.y = paddleY - b.r - 2;
                b.vx = 0;
                b.vy = 0;
              }
            }
            setRenderState({
              paddleX: eng.paddleX,
              paddleW: eng.paddleW,
              paddleOffsetY: eng.paddleRecoil,
              aiPaddleX: eng.aiPaddleX,
              aiPaddleW: eng.aiPaddleW,
              aiPaddleOffsetY: eng.aiPaddleRecoil,
              balls: [...eng.balls],
              bricks: [...eng.bricks],
              capsules: [...eng.capsules],
              lasers: [...eng.lasers],
              hasShield: eng.hasShield,
              aiHasShield: eng.aiHasShield,
              hasLaser: eng.laserTimer > 0,
              hasMagnet: eng.magnetTimer > 0,
            });
            frameId = requestAnimationFrame(tick);
            return;
          }

          // --- 1. PERIODIC BALL SPAWNER (EVERY 18 SECONDS IN DUEL MODES) ---
          if (eng.mode !== 'SINGLE_BRICKS' && eng.ballLaunched) {
            eng.ballSpawnTimer -= dt;
            if (eng.ballSpawnTimer <= 0) {
              eng.ballSpawnTimer = 18.0;
              const isHeavy = Math.random() < 0.45;
              const spd = isHeavy ? 190 : 230;
              const angle = (Math.random() - 0.5) * 0.8 + (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);

              eng.balls.push({
                id: `spawn_${Date.now()}_${Math.random()}`,
                x: arenaWidth / 2 + (Math.random() - 0.5) * 50,
                y: arenaHeight / 2 + (Math.random() - 0.5) * 30,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                r: isHeavy ? HEAVY_BALL_RADIUS : DEFAULT_BALL_RADIUS,
                color: isHeavy ? '#FF4500' : '#FFE600',
                isFire: isHeavy,
                isHeavy: isHeavy,
                lastHitter: Math.random() > 0.5 ? 'PLAYER' : 'AI',
                owner: 'NEUTRAL',
              });

              safeSound(playSpeedUpSound);
              safeHaptic(triggerSliceHaptic);
              if (juiceRef.current) {
                juiceRef.current.popup(
                  isHeavy ? '🔥 HEAVY BALL INCOMING!' : '🔮 NEW SPHERE SPAWNED!',
                  'ARENA EXPANSION',
                  isHeavy ? '#FF4500' : '#FFE600'
                );
              }
            }
          }

          // --- 2. MODE 3 ABILITY COUNTDOWN ---
          if (eng.mode === 'HARD_SPHERE_DUEL') {
            if (!eng.activeAbility) {
              eng.abilityTimer -= dt;
              const displaySec = Math.max(1, Math.ceil(eng.abilityTimer));
              setNextAbilityCountdown(displaySec);

              if (eng.abilityTimer <= 0) {
                const ability = SPHERE_ABILITIES[eng.nextAbilityIdx % SPHERE_ABILITIES.length];
                eng.activeAbility = ability;
                eng.activeAbilityTimer = ability.duration;
                setActiveAbility(ability);
                safeSound(playSpeedUpSound);
                safeHaptic(triggerSliceHaptic);

                if (ability.id === 'MULTI_BALL') {
                  const extra = [];
                  eng.balls.forEach((b, idx) => {
                    const spd = Math.hypot(b.vx, b.vy) || 240;
                    extra.push({
                      id: `extra_${Date.now()}_${idx}`,
                      x: b.x + (idx % 2 === 0 ? 12 : -12),
                      y: b.y + (b.vy > 0 ? -12 : 12),
                      vx: Math.cos(0.5) * spd * (idx % 2 === 0 ? 1 : -1),
                      vy: Math.sin(0.5) * spd,
                      r: b.r,
                      color: '#FFE600',
                      isFire: false,
                      isHeavy: false,
                      lastHitter: b.lastHitter,
                      owner: b.owner,
                    });
                  });
                  eng.balls.push(...extra);
                } else if (ability.id === 'SPEED_UP') {
                  eng.balls.forEach((b) => {
                    b.vx *= 1.35;
                    b.vy *= 1.35;
                  });
                } else if (ability.id === 'BIG_BALL') {
                  // TURNS ALL BALLS INTO HEAVY MEGA BALLS
                  eng.balls.forEach((b) => {
                    b.r = HEAVY_BALL_RADIUS;
                    b.isHeavy = true;
                    b.color = '#FF4500';
                  });
                } else if (ability.id === 'MINI_BALL') {
                  eng.balls.forEach((b) => {
                    b.r = 5;
                    b.isHeavy = false;
                  });
                }
                eng.nextAbilityIdx += 1;
              }
            } else {
              eng.activeAbilityTimer -= dt;
              if (eng.activeAbilityTimer <= 0) {
                if (eng.activeAbility.id === 'BIG_BALL' || eng.activeAbility.id === 'MINI_BALL') {
                  eng.balls.forEach((b) => {
                    b.r = DEFAULT_BALL_RADIUS;
                    b.isHeavy = false;
                  });
                }
                eng.activeAbility = null;
                eng.abilityTimer = 6.0;
                setActiveAbility(null);
              }
            }
          }

          // --- 3. POWER-UP TIMERS (Solo & Center Duel) ---
          if (eng.wideTimer > 0) {
            eng.wideTimer -= dt;
            if (eng.wideTimer <= 0) eng.paddleW = basePaddleW;
          }
          if (eng.aiWideTimer > 0) {
            eng.aiWideTimer -= dt;
            if (eng.aiWideTimer <= 0) eng.aiPaddleW = basePaddleW;
          }
          if (eng.fireBallTimer > 0) {
            eng.fireBallTimer -= dt;
            if (eng.fireBallTimer <= 0) {
              eng.balls.forEach((b) => {
                if (!b.isHeavy) b.isFire = false;
              });
            }
          }
          if (eng.slowTimer > 0) {
            eng.slowTimer -= dt;
          }
          if (eng.pierceTimer > 0) {
            eng.pierceTimer -= dt;
            if (eng.pierceTimer <= 0) {
              eng.balls.forEach((b) => {
                b.isPierce = false;
              });
            }
          }
          if (eng.magnetTimer > 0) {
            eng.magnetTimer -= dt;
          }
          if (eng.explosiveTimer > 0) {
            eng.explosiveTimer -= dt;
            if (eng.explosiveTimer <= 0) {
              eng.balls.forEach((b) => {
                b.isExplosive = false;
              });
            }
          }

          // Laser Cannon Blaster shooting
          if (eng.laserTimer > 0) {
            eng.laserTimer -= dt;
            eng.laserCooldown -= dt;
            if (eng.laserCooldown <= 0) {
              eng.laserCooldown = 0.34;
              const ySpawn = paddleY - 4;
              eng.lasers.push(
                { id: `lz_${Date.now()}_1`, x: eng.paddleX + 10, y: ySpawn, vy: -580 },
                { id: `lz_${Date.now()}_2`, x: eng.paddleX + eng.paddleW - 10, y: ySpawn, vy: -580 }
              );
              safeSound(playTapSound);
              safeHaptic(triggerLightHaptic);
            }
          }

          // Laser beam physics & brick collision
          if (eng.lasers.length > 0) {
            const nextLasers = [];
            for (let l = 0; l < eng.lasers.length; l++) {
              const lz = eng.lasers[l];
              lz.y += lz.vy * dt;
              let hit = false;
              if (eng.bricks.length > 0) {
                for (let j = eng.bricks.length - 1; j >= 0; j--) {
                  const brk = eng.bricks[j];
                  if (
                    lz.x >= brk.x - 4 &&
                    lz.x <= brk.x + brk.w + 4 &&
                    lz.y >= brk.y &&
                    lz.y <= brk.y + brk.h
                  ) {
                    hit = true;
                    safeSound(playTapSound);
                    if (brk.type !== 'UNBREAKABLE') {
                      brk.hp -= 1;
                      eng.score += 25;
                      setScore(eng.score);
                      persistBest(eng.score);
                      if (brk.hp <= 0) {
                        eng.bricks.splice(j, 1);
                        safeSound(playSliceSound);
                        safeHaptic(triggerMediumHaptic);
                        if (juiceRef.current) {
                          juiceRef.current.popup('⚡ LASER BLAST!', '+25 PTS', '#FF0055');
                        }
                      }
                    }
                    break;
                  }
                }
              }
              if (!hit && lz.y > 10) {
                nextLasers.push(lz);
              }
            }
            eng.lasers = nextLasers;
          }

          // --- 4. FALLING POWER-UP CAPSULES UPDATE ---
          const nextCapsules = [];
          for (let i = 0; i < eng.capsules.length; i++) {
            const cap = eng.capsules[i];
            cap.y += cap.vy * dt;

            // Check player paddle catch
            if (
              cap.y + 12 >= paddleY &&
              cap.y <= paddleY + PADDLE_HEIGHT &&
              cap.x + 16 >= eng.paddleX &&
              cap.x - 16 <= eng.paddleX + eng.paddleW
            ) {
              safeSound(playSpeedUpSound);
              safeHaptic(triggerPerfectHaptic, 2);
              if (juiceRef.current) {
                juiceRef.current.popup(cap.name, '+50 PTS', cap.color);
              }
              eng.score += 50;
              setScore(eng.score);
              persistBest(eng.score);

              if (cap.type === 'MULTI_BALL') {
                const extra = [];
                eng.balls.forEach((b) => {
                  extra.push({
                    id: `p_extra_${Date.now()}_${Math.random()}`,
                    x: b.x,
                    y: b.y,
                    vx: -b.vx * 0.9,
                    vy: b.vy,
                    r: b.r,
                    color: '#FFE600',
                    isFire: b.isFire,
                    isHeavy: b.isHeavy || false,
                    isPierce: b.isPierce || false,
                    isExplosive: b.isExplosive || false,
                    lastHitter: 'PLAYER',
                    owner: 'PLAYER',
                  });
                });
                eng.balls.push(...extra);
              } else if (cap.type === 'WIDE_PADDLE') {
                eng.paddleW = basePaddleW * 1.5;
                eng.wideTimer = 12;
              } else if (cap.type === 'FIRE_BALL') {
                eng.balls.forEach((b) => {
                  b.isFire = true;
                  b.color = '#FF6D00';
                });
                eng.fireBallTimer = 10;
              } else if (cap.type === 'SLOW_BALL') {
                eng.balls.forEach((b) => {
                  b.vx *= 0.72;
                  b.vy *= 0.72;
                });
                eng.slowTimer = 9;
              } else if (cap.type === 'SAFETY_SHIELD') {
                eng.hasShield = true;
              } else if (cap.type === 'LASER_CANNON') {
                eng.laserTimer = 10;
                eng.laserCooldown = 0;
              } else if (cap.type === 'PENETRATING_BALL') {
                eng.pierceTimer = 10;
                eng.balls.forEach((b) => {
                  b.isPierce = true;
                  b.color = '#A066FF';
                });
              } else if (cap.type === 'MAGNET_PADDLE') {
                eng.magnetTimer = 12;
              } else if (cap.type === 'EXPLOSIVE_BALL') {
                eng.explosiveTimer = 10;
                eng.balls.forEach((b) => {
                  b.isExplosive = true;
                  b.color = '#FF3366';
                });
              } else if (cap.type === 'EXTRA_LIFE') {
                eng.playerHearts = Math.min(INITIAL_HEARTS + 1, eng.playerHearts + 1);
                setPlayerHearts(eng.playerHearts);
                safeSound(playSpeedUpSound);
                safeHaptic(triggerPerfectHaptic);
              }
              continue;
            }

            // Check AI paddle catch (Mode 2 Center Duel)
            if (
              eng.mode === 'AI_BRICK_DUEL' &&
              cap.y <= aiPaddleY + PADDLE_HEIGHT + 8 &&
              cap.y >= aiPaddleY - 8 &&
              cap.x + 16 >= eng.aiPaddleX &&
              cap.x - 16 <= eng.aiPaddleX + eng.aiPaddleW
            ) {
              eng.aiScore += 50;
              setAiScore(eng.aiScore);
              safeSound(playTapSound);
              if (juiceRef.current) {
                juiceRef.current.popup(`AI: ${cap.name}!`, '+50 PTS', cap.color);
              }

              if (cap.type === 'WIDE_PADDLE') {
                eng.aiPaddleW = basePaddleW * 1.45;
                eng.aiWideTimer = 11;
              } else if (cap.type === 'MULTI_BALL') {
                eng.balls.push({
                  id: `ai_extra_${Date.now()}_${Math.random()}`,
                  x: eng.aiPaddleX + eng.aiPaddleW / 2,
                  y: aiPaddleY + PADDLE_HEIGHT + 14,
                  vx: (Math.random() - 0.5) * 160,
                  vy: 200,
                  r: DEFAULT_BALL_RADIUS,
                  color: '#FF007F',
                  isFire: false,
                  isHeavy: false,
                  lastHitter: 'AI',
                  owner: 'AI',
                });
              } else if (cap.type === 'SAFETY_SHIELD') {
                eng.aiHasShield = true;
              } else if (cap.type === 'FIRE_BALL') {
                eng.balls.forEach((b) => {
                  if (b.lastHitter === 'AI') {
                    b.isFire = true;
                    b.color = '#FF0055';
                  }
                });
              }
              continue;
            }

            // Offscreen cull
            if (cap.y > -20 && cap.y < arenaHeight + 30) {
              nextCapsules.push(cap);
            }
          }
          eng.capsules = nextCapsules;

          // --- 5. PREDICTIVE AI PADDLE (Prioritize ball, but collect abilities when safe) ---
          if (eng.mode !== 'SINGLE_BRICKS' && eng.ballLaunched) {
            let threatBall = null;
            let minThreatTime = Infinity;

            for (const b of eng.balls) {
              if (b.vy < 0) {
                const timeToReach = (b.y - aiPaddleY) / Math.abs(b.vy);
                if (timeToReach < minThreatTime) {
                  minThreatTime = timeToReach;
                  threatBall = b;
                }
              }
            }

            let targetCapsule = null;
            let minCapDist = Infinity;

            if (eng.mode === 'AI_BRICK_DUEL' && eng.capsules.length > 0) {
              for (const cap of eng.capsules) {
                if (cap.y < arenaHeight * 0.65 || cap.vy < 0) {
                  const d = Math.hypot(cap.x - (eng.aiPaddleX + eng.aiPaddleW / 2), cap.y - aiPaddleY);
                  if (d < minCapDist) {
                    minCapDist = d;
                    targetCapsule = cap;
                  }
                }
              }
            }

            const isBallUrgentThreat =
              threatBall && (threatBall.y < arenaHeight * 0.44 || minThreatTime < 0.85);

            let targetX = eng.aiPaddleX + eng.aiPaddleW / 2;

            if (isBallUrgentThreat) {
              // Priority 1: Defend against ball
              let predictedX = threatBall.x + threatBall.vx * minThreatTime;
              while (predictedX < 0 || predictedX > arenaWidth) {
                if (predictedX < 0) predictedX = -predictedX;
                if (predictedX > arenaWidth) predictedX = 2 * arenaWidth - predictedX;
              }
              targetX = predictedX;
            } else if (targetCapsule) {
              // Priority 2: Collect ability capsule
              targetX = targetCapsule.x;
            } else if (threatBall) {
              let predictedX = threatBall.x + threatBall.vx * minThreatTime;
              while (predictedX < 0 || predictedX > arenaWidth) {
                if (predictedX < 0) predictedX = -predictedX;
                if (predictedX > arenaWidth) predictedX = 2 * arenaWidth - predictedX;
              }
              targetX = predictedX;
            }

            const aiCenter = eng.aiPaddleX + eng.aiPaddleW / 2;
            const diff = targetX - aiCenter;
            const aiMaxSpeed = eng.mode === 'HARD_SPHERE_DUEL' ? 480 : 270;
            const moveStep = Math.sign(diff) * Math.min(Math.abs(diff), aiMaxSpeed * dt);
            eng.aiPaddleX = Math.max(4, Math.min(arenaWidth - eng.aiPaddleW - 4, eng.aiPaddleX + moveStep));
          }

          // --- 5B. GLOBAL LEVEL CLEAR CHECK (ALL BREAKABLE BRICKS DESTROYED BY ANY SOURCE) ---
          if (eng.mode !== 'HARD_SPHERE_DUEL' && eng.ballLaunched && !eng.levelClearing) {
            const breakableLeft = eng.bricks.filter((bk) => bk.type !== 'UNBREAKABLE').length;
            if (breakableLeft === 0) {
              if (eng.mode === 'SINGLE_BRICKS') {
                handleLevelClear(eng.level);
                frameId = requestAnimationFrame(tick);
                return;
              } else if (eng.mode === 'AI_BRICK_DUEL') {
                eng.running = false;
                eng.levelClearing = true;
                const won = eng.score >= eng.aiScore;
                safeSound(won ? playPerfectSound : playGameOverSound);
                setModalType(won ? 'win' : 'gameover');
                setModalTitle(won ? 'DUEL VICTORY!' : 'AI RIVAL WON!');
                setModalSubtitle(`FINAL SCORE: ${eng.score} VS AI: ${eng.aiScore}`);
                setModalVisible(true);
                frameId = requestAnimationFrame(tick);
                return;
              }
            }
          }

          // --- 6. BALL PHYSICS & COLLISIONS ---
          const nextBalls = [];

          for (let i = 0; i < eng.balls.length; i++) {
            const b = eng.balls[i];

            // If ball is magnet-caught on player paddle, stick to paddle or auto-release after 2s
            if (b.caught) {
              b.caughtTimer = (b.caughtTimer || 0) + dt;
              // Auto-launch after 2.0s timeout or if magnet powerup expired so ball never stays stuck
              if (b.caughtTimer >= 2.0 || eng.magnetTimer <= 0) {
                b.caught = false;
                b.caughtTimer = 0;
                const hitOffset = (b.x - (eng.paddleX + eng.paddleW / 2)) / (eng.paddleW / 2);
                const maxAngle = Math.PI * 0.38;
                const angle = -Math.PI / 2 + Math.max(-1, Math.min(1, hitOffset)) * maxAngle;
                const spd = 340;
                b.vx = Math.cos(angle) * spd;
                b.vy = Math.sin(angle) * spd;
                safeSound(playTapSound);
                safeHaptic(triggerLightHaptic);
                nextBalls.push(b);
                continue;
              }

              const offsetX = b.caughtOffset ?? eng.paddleW / 2;
              b.x = Math.max(
                eng.paddleX + b.r,
                Math.min(eng.paddleX + eng.paddleW - b.r, eng.paddleX + offsetX)
              );
              b.y = paddleY + eng.paddleRecoil - b.r - 2;
              b.vx = 0;
              b.vy = 0;
              nextBalls.push(b);
              continue;
            }

            let nextX = b.x + b.vx * dt;
            let nextY = b.y + b.vy * dt;

            // Wall Collisions (Left & Right)
            if (nextX - b.r <= 0) {
              nextX = b.r;
              b.vx = Math.abs(b.vx);
              safeSound(playTapSound);
            } else if (nextX + b.r >= arenaWidth) {
              nextX = arenaWidth - b.r;
              b.vx = -Math.abs(b.vx);
              safeSound(playTapSound);
            }

            // Top Boundary Check
            if (eng.mode === 'SINGLE_BRICKS') {
              // Solid energy reflector wall at top
              if (nextY - b.r <= 12) {
                nextY = 12 + b.r;
                b.vy = Math.abs(b.vy);
                safeSound(playTapSound);
                safeHaptic(triggerLightHaptic);
              }
            } else {
              // AI Paddle at Top
              const aiTop = aiPaddleY + eng.aiPaddleRecoil;
              const aiBottom = aiPaddleY + eng.aiPaddleRecoil + PADDLE_HEIGHT;
              if (
                b.vy < 0 &&
                nextY - b.r <= aiBottom &&
                b.y + b.r >= aiTop &&
                nextX >= eng.aiPaddleX - 6 &&
                nextX <= eng.aiPaddleX + eng.aiPaddleW + 6
              ) {
                nextY = aiBottom + b.r;
                const hitOffset = (nextX - (eng.aiPaddleX + eng.aiPaddleW / 2)) / (eng.aiPaddleW / 2);
                const maxAngle = Math.PI * 0.38;
                const angle = hitOffset * maxAngle;
                const spd = Math.hypot(b.vx, b.vy);
                b.vx = spd * Math.sin(angle);
                b.vy = Math.abs(spd * Math.cos(angle));
                b.lastHitter = 'AI';

                if (b.isHeavy) {
                  // HEAVY BALL PUSHES AI PADDLE UPWARDS & SHAKES
                  eng.aiPaddleRecoil = -12;
                  eng.aiPaddleX += Math.sign(b.vx || hitOffset) * 16;
                  eng.aiPaddleX = Math.max(4, Math.min(arenaWidth - eng.aiPaddleW - 4, eng.aiPaddleX));

                  safeSound(playSliceSound);
                  safeHaptic(triggerPerfectHaptic, 2);
                  if (juiceRef.current) {
                    juiceRef.current.shake(6, 4);
                    juiceRef.current.popup('💥 AI RECOILED!', 'HEAVY IMPACT', '#FF0055');
                  }
                } else {
                  safeSound(playTapSound);
                  safeHaptic(triggerLightHaptic);
                }
              } else if (nextY - b.r < 0) {
                // Ball collided with AI Shield or breached AI baseline!
                if (eng.aiHasShield) {
                  // AI Safety Shield Matrix absorbs and DESTROYS the ball!
                  eng.aiHasShield = false;
                  safeSound(playSpeedUpSound);
                  safeHaptic(triggerMediumHaptic);
                  if (juiceRef.current) {
                    juiceRef.current.popup('AI SHIELD VAPORIZED BALL!', 'DEFENSE MATRIX', '#FF0055');
                    juiceRef.current.flash('#FF0055');
                  }

                  const otherBallsAlive = nextBalls.length + (eng.balls.length - 1 - i);
                  if (otherBallsAlive > 0) {
                    // DESTROY THE BALL!
                    continue;
                  } else {
                    nextY = aiPaddleY + PADDLE_HEIGHT + b.r + 4;
                    b.vy = Math.abs(b.vy);
                    b.x = nextX;
                    b.y = nextY;
                    nextBalls.push(b);
                    continue;
                  }
                } else {
                  // Baseline breached: AI loses 1 heart
                  eng.aiHearts = Math.max(0, eng.aiHearts - 1);
                  setAiHearts(eng.aiHearts);
                  eng.score += 100;
                  setScore(eng.score);
                  persistBest(eng.score);

                  safeSound(playSliceSound);
                  safeHaptic(triggerMediumHaptic);

                  if (juiceRef.current) {
                    juiceRef.current.popup('AI BASELINE BREACHED!', '+100 PTS', '#00F5D4');
                  }

                  if (eng.aiHearts <= 0) {
                    eng.running = false;
                    setModalType('win');
                    setModalTitle('AI DEFEATED!');
                    setModalSubtitle(`FINAL SCORE: ${eng.score} VS AI: ${eng.aiScore}`);
                    setModalVisible(true);
                    eng.balls = [];
                    setRenderState((prev) => ({ ...prev, balls: [] }));
                    return;
                  }

                  // Ball is destroyed on colliding with baseline if other balls are in play
                  const otherBallsAlive = nextBalls.length + (eng.balls.length - 1 - i);
                  if (otherBallsAlive > 0) {
                    // Vaporize this ball
                    continue;
                  } else {
                    // Respawn a fresh ball from center
                    nextBalls.push({
                      id: `respawn_${Date.now()}`,
                      x: arenaWidth / 2,
                      y: arenaHeight / 2,
                      vx: (Math.random() - 0.5) * 160,
                      vy: 200,
                      r: DEFAULT_BALL_RADIUS,
                      color: '#FF007F',
                      isFire: false,
                      isHeavy: false,
                      lastHitter: 'AI',
                      owner: 'AI',
                    });
                    continue;
                  }
                }
              }
            }

            // Bottom Player Paddle Collision with Recoil Check
            const pTop = paddleY + eng.paddleRecoil;
            const pBottom = paddleY + eng.paddleRecoil + PADDLE_HEIGHT;
            if (
              b.vy > 0 &&
              nextY + b.r >= pTop &&
              b.y - b.r <= pBottom &&
              nextX >= eng.paddleX - 6 &&
              nextX <= eng.paddleX + eng.paddleW + 6
            ) {
              // Magnet Paddle Catch
              if (eng.magnetTimer > 0) {
                b.caught = true;
                b.caughtTimer = 0;
                b.caughtOffset = nextX - eng.paddleX;
                b.x = nextX;
                b.y = pTop - b.r - 2;
                b.vx = 0;
                b.vy = 0;
                safeSound(playSpeedUpSound);
                safeHaptic(triggerPerfectHaptic);
                if (juiceRef.current) {
                  juiceRef.current.popup('🧲 MAGNET LOCKED!', 'TAP OR RELEASE TO LAUNCH', '#FFB703');
                }
                nextBalls.push(b);
                continue;
              }

              nextY = pTop - b.r;
              const hitOffset = (nextX - (eng.paddleX + eng.paddleW / 2)) / (eng.paddleW / 2);
              const maxAngle = Math.PI * 0.40;
              const angle = hitOffset * maxAngle;
              let spd = Math.hypot(b.vx, b.vy);
              // Ensure minimum speed floor in Solo Bricks (310 px/s)
              if (eng.mode === 'SINGLE_BRICKS' && eng.slowTimer <= 0) {
                spd = Math.max(310, spd);
              }
              b.vx = spd * Math.sin(angle);
              b.vy = -Math.abs(spd * Math.cos(angle));
              b.lastHitter = 'PLAYER';

              if (b.isHeavy) {
                // HEAVY BALL PUSHES PLAYER PADDLE BACKWARDS!
                eng.paddleRecoil = 12; // Pushes paddle downwards towards bottom
                eng.paddleX += Math.sign(b.vx || hitOffset) * 16;
                eng.paddleX = Math.max(4, Math.min(arenaWidth - eng.paddleW - 4, eng.paddleX));

                safeSound(playSliceSound);
                safeHaptic(triggerPerfectHaptic, 2);
                if (juiceRef.current) {
                  juiceRef.current.shake(7, 5);
                  juiceRef.current.popup('💥 HEAVY IMPACT!', 'PADDLE RECOIL', '#FF6D00');
                }
              } else {
                safeSound(playTapSound);
                safeHaptic(triggerLightHaptic);
              }
            }

            // --- 7. BRICK COLLISIONS (Solo & Center Duel: strictly 1 brick per impact) ---
            if (eng.mode !== 'HARD_SPHERE_DUEL' && eng.bricks.length > 0) {
              for (let j = eng.bricks.length - 1; j >= 0; j--) {
                const brk = eng.bricks[j];

                const testX = Math.max(brk.x, Math.min(nextX, brk.x + brk.w));
                const testY = Math.max(brk.y, Math.min(nextY, brk.y + brk.h));
                const distSq = (nextX - testX) ** 2 + (nextY - testY) ** 2;

                if (distSq <= b.r * b.r) {
                  // Determine collision face & separate ball cleanly to prevent tunneling/multiple hits
                  const overlapLeft = nextX + b.r - brk.x;
                  const overlapRight = brk.x + brk.w - (nextX - b.r);
                  const overlapTop = nextY + b.r - brk.y;
                  const overlapBottom = brk.y + brk.h - (nextY - b.r);

                  const minOverlapX = Math.min(overlapLeft, overlapRight);
                  const minOverlapY = Math.min(overlapTop, overlapBottom);

                  if (minOverlapX < minOverlapY) {
                    // Hit vertical edge (Left or Right)
                    if (overlapLeft < overlapRight) {
                      b.vx = -Math.abs(b.vx);
                      nextX = brk.x - b.r - 1;
                    } else {
                      b.vx = Math.abs(b.vx);
                      nextX = brk.x + brk.w + b.r + 1;
                    }
                  } else {
                    // Hit horizontal edge (Top or Bottom)
                    if (overlapTop < overlapBottom) {
                      b.vy = -Math.abs(b.vy);
                      nextY = brk.y - b.r - 1;
                    } else {
                      b.vy = Math.abs(b.vy);
                      nextY = brk.y + brk.h + b.r + 1;
                    }
                  }

                  // Award points for hitting this single brick
                  if (b.lastHitter === 'PLAYER') {
                    eng.score += brk.pts;
                    setScore(eng.score);
                    persistBest(eng.score);
                  } else {
                    eng.aiScore += brk.pts;
                    setAiScore(eng.aiScore);
                  }

                  safeSound(playTapSound);
                  safeHaptic(triggerLightHaptic);

                  // Unbreakable brick bounces ball without taking damage
                  if (brk.type === 'UNBREAKABLE') {
                    break;
                  }

                  // Damage exactly this 1 brick
                  brk.hp -= 1;

                  if (brk.hp <= 0) {
                    eng.bricks.splice(j, 1);
                    safeSound(playSliceSound);

                    // Drop falling power-up capsule
                    if (brk.type === 'POWERUP' || Math.random() < 0.28) {
                      const capType = CAPSULE_TYPES[Math.floor(Math.random() * CAPSULE_TYPES.length)];
                      const isUpward = eng.mode === 'AI_BRICK_DUEL' && b.lastHitter === 'AI';
                      eng.capsules.push({
                        id: `cap_${Date.now()}_${Math.random()}`,
                        type: capType.id,
                        name: capType.name,
                        icon: capType.icon,
                        color: capType.color,
                        x: brk.x + brk.w / 2,
                        y: brk.y + brk.h / 2,
                        vy: isUpward ? -155 : 165,
                      });
                    }

                    // Check if all breakable bricks cleared!
                    const breakableLeft = eng.bricks.filter((bk) => bk.type !== 'UNBREAKABLE').length;
                    if (breakableLeft === 0) {
                      if (eng.mode === 'SINGLE_BRICKS') {
                        handleLevelClear(eng.level);
                        return;
                      } else if (eng.mode === 'AI_BRICK_DUEL') {
                        eng.running = false;
                        eng.levelClearing = true;
                        const won = eng.score >= eng.aiScore;
                        safeSound(won ? playPerfectSound : playGameOverSound);
                        setModalType(won ? 'win' : 'gameover');
                        setModalTitle(won ? 'DUEL VICTORY!' : 'AI RIVAL WON!');
                        setModalSubtitle(`FINAL SCORE: ${eng.score} VS AI: ${eng.aiScore}`);
                        setModalVisible(true);
                        return;
                      }
                    }
                  }

                  // Strictly 1 brick per bounce/impact — break out of brick loop immediately
                  break;
                }
              }
            }

            // --- 8. BOTTOM BOUNDARY CHECK (PLAYER SHIELD / BASELINE) ---
            if (nextY + b.r >= arenaHeight) {
              // Safety shield check
              if (eng.hasShield) {
                // Safety Shield Matrix absorbs and DESTROYS the ball!
                eng.hasShield = false;
                safeSound(playSpeedUpSound);
                safeHaptic(triggerMediumHaptic);
                if (juiceRef.current) {
                  juiceRef.current.popup('SHIELD VAPORIZED BALL!', 'DEFENSE MATRIX', '#00F5D4');
                  juiceRef.current.flash('#00F5D4');
                }

                const otherBallsAlive = nextBalls.length + (eng.balls.length - 1 - i);
                if (otherBallsAlive > 0) {
                  // DESTROY THE BALL!
                  continue;
                } else {
                  nextY = arenaHeight - 8 - b.r;
                  b.vy = -Math.abs(b.vy);
                  b.x = nextX;
                  b.y = nextY;
                  nextBalls.push(b);
                  continue;
                }
              }

              // Ball lost past bottom
              if (eng.mode === 'SINGLE_BRICKS') {
                const otherBallsAlive = nextBalls.length + (eng.balls.length - 1 - i);
                if (otherBallsAlive > 0) {
                  safeSound(playTapSound);
                  continue; // drop extra ball, keep remaining
                }

                eng.playerHearts = Math.max(0, eng.playerHearts - 1);
                setPlayerHearts(eng.playerHearts);
                safeSound(playGameOverSound);
                safeHaptic(triggerGameOverHaptic);

                if (eng.playerHearts <= 0) {
                  eng.running = false;
                  eng.ballLaunched = false;
                  setBallLaunched(false);
                  setModalType('gameover');
                  setModalTitle('SHIELD DEPLETED!');
                  setModalSubtitle(`FINAL SCORE: ${eng.score} IN LEVEL ${eng.level}`);
                  setModalVisible(true);
                  eng.balls = [];
                  setRenderState((prev) => ({ ...prev, balls: [] }));
                  return;
                } else {
                  // Reset ball to paddle
                  eng.ballLaunched = false;
                  setBallLaunched(false);
                  nextBalls.push({
                    id: `solo_ball_${Date.now()}`,
                    x: eng.paddleX + eng.paddleW / 2,
                    y: paddleY - DEFAULT_BALL_RADIUS - 2,
                    vx: 0,
                    vy: 0,
                    r: DEFAULT_BALL_RADIUS,
                    color: '#00F5FF',
                    isFire: false,
                    isHeavy: false,
                    lastHitter: 'PLAYER',
                    owner: 'PLAYER',
                  });
                  break;
                }
              } else {
                // Duel modes: player loses 1 heart
                eng.playerHearts = Math.max(0, eng.playerHearts - 1);
                setPlayerHearts(eng.playerHearts);
                eng.aiScore += 100;
                setAiScore(eng.aiScore);
                safeSound(playGameOverSound);
                safeHaptic(triggerGameOverHaptic);

                if (eng.playerHearts <= 0) {
                  eng.running = false;
                  eng.ballLaunched = false;
                  setBallLaunched(false);
                  setModalType('gameover');
                  setModalTitle('YOUR SHIELD SHATTERED!');
                  setModalSubtitle(`AI WINS ${eng.aiScore} TO ${eng.score}`);
                  setModalVisible(true);
                  eng.balls = [];
                  setRenderState((prev) => ({ ...prev, balls: [] }));
                  return;
                }

                // In AI vs Player duel: ball is destroyed on colliding with shield/baseline!
                const otherBallsAlive = nextBalls.length + (eng.balls.length - 1 - i);
                if (otherBallsAlive > 0) {
                  if (juiceRef.current) {
                    juiceRef.current.popup('BALL DESTROYED!', '-1 HEART', '#FF0055');
                  }
                  continue; // DESTROY BALL!
                } else {
                  // Respawn a fresh ball from center so duel never stalls
                  nextBalls.push({
                    id: `respawn_${Date.now()}`,
                    x: arenaWidth / 2,
                    y: arenaHeight / 2,
                    vx: (Math.random() - 0.5) * 160,
                    vy: -200,
                    r: DEFAULT_BALL_RADIUS,
                    color: '#00F5FF',
                    isFire: false,
                    isHeavy: false,
                    lastHitter: 'PLAYER',
                    owner: 'PLAYER',
                  });
                  continue;
                }
              }
            }

            b.x = nextX;
            b.y = nextY;
            b.speed = Math.hypot(b.vx, b.vy);
            nextBalls.push(b);
          }

          // --- 9. BALL-TO-BALL ELASTIC COLLISIONS (WITH HARD AI DUEL SPEED ACCELERATION) ---
          if (nextBalls.length > 1) {
            for (let i = 0; i < nextBalls.length; i++) {
              for (let j = i + 1; j < nextBalls.length; j++) {
                const b1 = nextBalls[i];
                const b2 = nextBalls[j];

                const dx = b2.x - b1.x;
                const dy = b2.y - b1.y;
                const distSq = dx * dx + dy * dy;
                const minDist = b1.r + b2.r;

                if (distSq < minDist * minDist && distSq > 0.0001) {
                  const dist = Math.sqrt(distSq);
                  const nx = dx / dist;
                  const ny = dy / dist;

                  // Positional separation to prevent sticking
                  const overlap = minDist - dist;
                  b1.x -= nx * overlap * 0.5;
                  b1.y -= ny * overlap * 0.5;
                  b2.x += nx * overlap * 0.5;
                  b2.y += ny * overlap * 0.5;

                  const m1 = b1.isHeavy ? 3.5 : 1.0;
                  const m2 = b2.isHeavy ? 3.5 : 1.0;

                  // Relative velocity
                  const kx = b1.vx - b2.vx;
                  const ky = b1.vy - b2.vy;
                  const p = nx * kx + ny * ky;

                  // Exchange momentum if moving towards each other
                  if (p > 0) {
                    const impulse = (2 * p) / (m1 + m2);
                    b1.vx -= impulse * m2 * nx;
                    b1.vy -= impulse * m2 * ny;
                    b2.vx += impulse * m1 * nx;
                    b2.vy += impulse * m1 * ny;

                    if (eng.mode === 'HARD_SPHERE_DUEL') {
                      // Physics kinetic energy increase on collision in Hard AI Duel!
                      const MAX_DUEL_BALL_SPEED = 620;
                      const SPEED_BOOST_MULTIPLIER = 1.22;
                      const MIN_SPEED_ADD = 35;

                      const spd1 = Math.hypot(b1.vx, b1.vy);
                      const spd2 = Math.hypot(b2.vx, b2.vy);

                      const newSpd1 = Math.min(
                        MAX_DUEL_BALL_SPEED,
                        Math.max(spd1 * SPEED_BOOST_MULTIPLIER, spd1 + MIN_SPEED_ADD)
                      );
                      const newSpd2 = Math.min(
                        MAX_DUEL_BALL_SPEED,
                        Math.max(spd2 * SPEED_BOOST_MULTIPLIER, spd2 + MIN_SPEED_ADD)
                      );

                      if (spd1 > 0.001) {
                        b1.vx = (b1.vx / spd1) * newSpd1;
                        b1.vy = (b1.vy / spd1) * newSpd1;
                      }
                      if (spd2 > 0.001) {
                        b2.vx = (b2.vx / spd2) * newSpd2;
                        b2.vy = (b2.vy / spd2) * newSpd2;
                      }

                      b1.speed = newSpd1;
                      b2.speed = newSpd2;

                      safeSound(playSpeedUpSound);
                      safeHaptic(triggerSliceHaptic);
                      if (juiceRef.current) {
                        juiceRef.current.pulse(1.14);
                        juiceRef.current.shake(4, 3);
                        juiceRef.current.flash('#FF0055');
                        juiceRef.current.popup(
                          '⚡ KINETIC COLLISION!',
                          `SPEED: ${Math.round(Math.max(newSpd1, newSpd2))} PX/S`,
                          '#FFE600'
                        );
                      }
                    } else if (b1.isHeavy || b2.isHeavy) {
                      b1.speed = Math.hypot(b1.vx, b1.vy);
                      b2.speed = Math.hypot(b2.vx, b2.vy);
                      safeSound(playSliceSound);
                      safeHaptic(triggerMediumHaptic);
                      if (juiceRef.current) juiceRef.current.pulse(1.08);
                    } else {
                      b1.speed = Math.hypot(b1.vx, b1.vy);
                      b2.speed = Math.hypot(b2.vx, b2.vy);
                      safeSound(playTapSound);
                      safeHaptic(triggerLightHaptic);
                      if (juiceRef.current) juiceRef.current.pulse(1.04);
                    }
                  }
                }
              }
            }
          }

          eng.balls = nextBalls;

          setRenderState({
            paddleX: eng.paddleX,
            paddleW: eng.paddleW,
            paddleOffsetY: eng.paddleRecoil,
            aiPaddleX: eng.aiPaddleX,
            aiPaddleW: eng.aiPaddleW,
            aiPaddleOffsetY: eng.aiPaddleRecoil,
            balls: [...eng.balls],
            bricks: [...eng.bricks],
            capsules: [...eng.capsules],
            lasers: [...eng.lasers],
            hasShield: eng.hasShield,
            aiHasShield: eng.aiHasShield,
            hasLaser: eng.laserTimer > 0,
            hasMagnet: eng.magnetTimer > 0,
          });
        }
      } catch (_err) {
        // Prevent any game-loop error from crashing the entire app
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [arenaWidth, arenaHeight, paddleY, aiPaddleY, persistBest, basePaddleW, handleLevelClear]);

  // PanResponder for smooth 1:1 paddle dragging & tap-to-start detection
  const dragStartRef = useRef({ startX: 0, startPaddleX: 0, hasMoved: false });

  const panResponder = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs
      PanResponder.create({
        onStartShouldSetPanResponder: () => !isPausedRef.current,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return !isPausedRef.current && Math.abs(gestureState.dx) > 3;
        },
        onPanResponderGrant: (evt) => {
          dragStartRef.current.startX = evt.nativeEvent.pageX;
          dragStartRef.current.startPaddleX = engineRef.current.paddleX;
          dragStartRef.current.hasMoved = false;

          // If ball is not launched or caught by magnet, tapping launches immediately!
          if (!engineRef.current.ballLaunched || engineRef.current.balls.some((b) => b.caught)) {
            handleLaunchBall();
          }
        },
        onPanResponderMove: (evt) => {
          const dx = evt.nativeEvent.pageX - dragStartRef.current.startX;
          if (Math.abs(dx) > 5) {
            dragStartRef.current.hasMoved = true;
          }
          const eng = engineRef.current;
          const targetX = dragStartRef.current.startPaddleX + dx;
          const clamped = Math.max(4, Math.min(arenaWidth - eng.paddleW - 4, targetX));
          eng.paddleX = clamped;
        },
        onPanResponderRelease: () => {
          if (!engineRef.current.ballLaunched || engineRef.current.balls.some((b) => b.caught)) {
            handleLaunchBall();
          }
        },
        onPanResponderTerminate: () => {
          if (!engineRef.current.ballLaunched || engineRef.current.balls.some((b) => b.caught)) {
            handleLaunchBall();
          }
        },
      }),
    [arenaWidth, handleLaunchBall]
  );

  // Nudge button controls
  const handleNudge = (delta) => {
    const eng = engineRef.current;
    const targetX = eng.paddleX + delta;
    eng.paddleX = Math.max(4, Math.min(arenaWidth - eng.paddleW - 4, targetX));
    safeSound(playTapSound);
    safeHaptic(triggerLightHaptic);
  };

  const currentDesign = BRICK_DESIGNS[(level - 1) % BRICK_DESIGNS.length];

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={localStyles.container}>
        <LinearGradient
          colors={['#050212', '#080824', '#040212']}
          style={StyleSheet.absoluteFillObject}
        />

        <View
          style={{ flex: 1 }}
          pointerEvents={modalVisible ? 'none' : 'auto'}
        >
          <MiniGameHeader
            title="BRICK BREAKER"
            floorLabel="FLOOR 09 // QUANTUM ARENA"
            score={score}
            bestScore={bestScore}
            accentColor={mode === 'HARD_SPHERE_DUEL' ? '#FF0055' : '#00F5FF'}
            onBack={onBackToHub}
            onReset={() => resetGame(mode, level)}
            disabled={modalVisible}
          />

          {/* 3 Game Modes Selector */}
          <View style={localStyles.modeSelectorBar}>
            {MODES.map((m) => {
              const isSelected = mode === m.id;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => resetGame(m.id, 1)}
                  style={[
                    localStyles.modePill,
                    isSelected && {
                      backgroundColor: `${m.color}25`,
                      borderColor: m.color,
                    },
                  ]}
                >
                  <Text
                    style={[
                      localStyles.modePillText,
                      { color: isSelected ? m.color : '#8A8F9E' },
                    ]}
                  >
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Status / Hearts Row */}
          <View style={[localStyles.heartsRow, { width: arenaWidth }]}>
            {mode === 'SINGLE_BRICKS' ? (
              <>
                <View style={localStyles.levelSelectorBox}>
                  <Pressable
                    style={localStyles.levelNavBtn}
                    onPress={() => {
                      const cur = engineRef.current.level || level;
                      const prev = cur > 1 ? cur - 1 : BRICK_DESIGNS.length;
                      resetGame('SINGLE_BRICKS', prev);
                    }}
                    hitSlop={12}
                  >
                    <Text style={localStyles.levelNavBtnText}>◀</Text>
                  </Pressable>

                  <View style={localStyles.levelCenterInfo}>
                    <Text style={localStyles.heartLabel}>
                      LVL {level}/{BRICK_DESIGNS.length}: {currentDesign.name} {currentDesign.icon}
                    </Text>
                    <Text style={localStyles.subInfoText}>
                      BRICKS: {renderState.bricks.filter((b) => b.type !== 'UNBREAKABLE').length} REMAINING
                    </Text>
                  </View>

                  <Pressable
                    style={localStyles.levelNavBtn}
                    onPress={() => {
                      const cur = engineRef.current.level || level;
                      const next = cur < BRICK_DESIGNS.length ? cur + 1 : 1;
                      resetGame('SINGLE_BRICKS', next);
                    }}
                    hitSlop={12}
                  >
                    <Text style={localStyles.levelNavBtnText}>▶</Text>
                  </Pressable>
                </View>

                <View style={[localStyles.heartSide, { alignItems: 'flex-end' }]}>
                  <Text style={localStyles.heartLabel}>SHIELD LIVES</Text>
                  <View style={localStyles.heartsContainer}>
                    {Array.from({ length: INITIAL_HEARTS }).map((_, i) => (
                      <Text key={`p_h_${i}`} style={localStyles.heartIcon}>
                        {i < playerHearts ? '💙' : '🖤'}
                      </Text>
                    ))}
                  </View>
                </View>
              </>
            ) : (
              <>
                {/* Opponent Hearts / Score */}
                <View style={localStyles.heartSide}>
                  <Text style={localStyles.heartLabel}>
                    {mode === 'HARD_SPHERE_DUEL' ? '🔥 AI HARD' : '🤖 AI RIVAL'}: {aiScore} PTS
                  </Text>
                  <View style={localStyles.heartsContainer}>
                    {Array.from({ length: INITIAL_HEARTS }).map((_, i) => (
                      <Text key={`ai_h_${i}`} style={localStyles.heartIcon}>
                        {i < aiHearts ? '❤️' : '🖤'}
                      </Text>
                    ))}
                  </View>
                </View>

                {/* Player Hearts / Score */}
                <View style={[localStyles.heartSide, { alignItems: 'flex-end' }]}>
                  <Text style={localStyles.heartLabel}>YOU: {score} PTS</Text>
                  <View style={localStyles.heartsContainer}>
                    {Array.from({ length: INITIAL_HEARTS }).map((_, i) => (
                      <Text key={`p_h_${i}`} style={localStyles.heartIcon}>
                        {i < playerHearts ? '💙' : '🖤'}
                      </Text>
                    ))}
                  </View>
                </View>
              </>
            )}
          </View>

          {/* PLAYABLE ARENA */}
          <View style={localStyles.arenaWrapper}>
            <View
              {...panResponder.panHandlers}
              style={[
                localStyles.arena,
                {
                  width: arenaWidth,
                  height: arenaHeight,
                  borderColor: mode === 'HARD_SPHERE_DUEL' ? 'rgba(255, 0, 85, 0.45)' : 'rgba(0, 245, 255, 0.35)',
                },
              ]}
            >
              {/* Top Boundary: Solid Reflector Wall in Solo, AI Paddle in Duel */}
              {mode === 'SINGLE_BRICKS' ? (
                <View style={localStyles.singleTopWall}>
                  <View style={localStyles.wallGleam} />
                  <Text style={localStyles.singleWallText}>ENERGY REFLECTOR WALL</Text>
                </View>
              ) : (
                <View
                  style={[
                    localStyles.aiPaddle,
                    {
                      left: renderState.aiPaddleX,
                      top: aiPaddleY + renderState.aiPaddleOffsetY,
                      width: renderState.aiPaddleW,
                      height: PADDLE_HEIGHT,
                      borderColor: mode === 'HARD_SPHERE_DUEL' ? '#FF0055' : '#00F5D4',
                    },
                  ]}
                >
                  <View
                    style={[
                      localStyles.paddleInnerCore,
                      { backgroundColor: mode === 'HARD_SPHERE_DUEL' ? '#FF0055' : '#00F5D4' },
                    ]}
                  />
                </View>
              )}

              {/* AI Safety Shield Line if AI picked shield */}
              {renderState.aiHasShield && (
                <View style={[localStyles.aiSafetyShieldLine, { width: arenaWidth }]} />
              )}

              {/* Mode 3 Ability Radar Countdown on Left Side */}
              {mode === 'HARD_SPHERE_DUEL' && (
                <View style={localStyles.abilityRadarBox} pointerEvents="none">
                  <Text style={localStyles.abilityRadarHeader}>RADAR</Text>
                  {activeAbility ? (
                    <View style={localStyles.activeAbilityCard}>
                      <Text style={localStyles.abilityIconLarge}>{activeAbility.icon}</Text>
                      <Text style={localStyles.activeAbilityTitle}>ACTIVE</Text>
                      <Text style={localStyles.activeAbilityName}>{activeAbility.name}</Text>
                    </View>
                  ) : (
                    <View style={localStyles.nextAbilityCard}>
                      <Text style={localStyles.abilityIconLarge}>⚡</Text>
                      <Text style={localStyles.nextAbilityLabel}>UP NEXT</Text>
                      <View style={localStyles.countdownPill}>
                        <Text style={localStyles.countdownText}>{nextAbilityCountdown}s</Text>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* BRICKS (Modes 1 & 2) */}
              {renderState.bricks.map((brk) => (
                <View
                  key={brk.id}
                  style={[
                    localStyles.brick,
                    {
                      left: brk.x,
                      top: brk.y,
                      width: brk.w,
                      height: brk.h,
                      borderColor: brk.color,
                      backgroundColor:
                        brk.type === 'UNBREAKABLE'
                          ? 'rgba(100, 116, 139, 0.7)'
                          : brk.hp < brk.maxHp
                            ? 'rgba(255, 0, 85, 0.4)'
                            : `${brk.color}35`,
                    },
                  ]}
                >
                  {brk.type === 'POWERUP' && (
                    <Text style={localStyles.brickIcon}>★</Text>
                  )}
                  {brk.type === 'EXPLOSIVE' && (
                    <Text style={localStyles.brickIcon}>💣</Text>
                  )}
                  {brk.type === 'UNBREAKABLE' && (
                    <Text style={localStyles.brickIcon}>🔒</Text>
                  )}
                  {brk.type === 'ARMORED' && (
                    <Text style={localStyles.brickHp}>{brk.hp}</Text>
                  )}
                </View>
              ))}

              {/* LASER BLASTER PROJECTILES */}
              {renderState.lasers.map((lz) => (
                <View
                  key={lz.id}
                  pointerEvents="none"
                  style={[
                    localStyles.laserBeam,
                    {
                      left: lz.x - 2,
                      top: lz.y,
                    },
                  ]}
                />
              ))}

              {/* FALLING POWER-UP CAPSULES */}
              {renderState.capsules.map((cap) => (
                <View
                  key={cap.id}
                  style={[
                    localStyles.capsulePill,
                    {
                      left: cap.x - 14,
                      top: cap.y - 10,
                      borderColor: cap.color,
                    },
                  ]}
                >
                  <Text style={localStyles.capsuleIcon}>{cap.icon}</Text>
                </View>
              ))}

              {/* BALLS WITH HEAVY BALL, PIERCE, EXPLOSIVE & HIGH-VELOCITY KINETIC STYLING */}
              {renderState.balls.map((b) => {
                const isHighSpeed = mode === 'HARD_SPHERE_DUEL' && (b.speed || 0) > 310;
                return (
                  <View
                    key={b.id}
                    pointerEvents="none"
                    style={[
                      localStyles.ball,
                      {
                        left: b.x - b.r,
                        top: b.y - b.r,
                        width: b.r * 2,
                        height: b.r * 2,
                        borderRadius: b.r,
                        backgroundColor: b.isHeavy
                          ? '#FF4500'
                          : b.isFire
                          ? '#FF6D00'
                          : b.isPierce
                          ? '#A066FF'
                          : b.isExplosive
                          ? '#FF3366'
                          : isHighSpeed
                          ? '#FF0055'
                          : b.color,
                        shadowColor: b.isHeavy
                          ? '#FF4500'
                          : b.isFire
                          ? '#FF6D00'
                          : b.isPierce
                          ? '#A066FF'
                          : b.isExplosive
                          ? '#FF3366'
                          : isHighSpeed
                          ? '#FFE600'
                          : b.color,
                        shadowRadius: isHighSpeed ? 14 : 8,
                        elevation: isHighSpeed ? 10 : 6,
                        borderWidth: b.isHeavy ? 2.5 : isHighSpeed || b.isPierce ? 1.5 : 0,
                        borderColor: b.isHeavy || isHighSpeed ? '#FFE600' : b.isPierce ? '#E0AAFF' : 'transparent',
                      },
                    ]}
                  >
                    <View
                      style={[
                        localStyles.ballCore,
                        b.isHeavy
                          ? { backgroundColor: '#FFE600', width: '48%', height: '48%' }
                          : b.isFire
                          ? { backgroundColor: '#FFE600' }
                          : b.isPierce
                          ? { backgroundColor: '#E0AAFF', width: '50%', height: '50%' }
                          : b.isExplosive
                          ? { backgroundColor: '#FFE600', width: '45%', height: '45%' }
                          : isHighSpeed
                          ? { backgroundColor: '#FFE600', width: '45%', height: '45%' }
                          : null,
                      ]}
                    />
                  </View>
                );
              })}

              {/* Bottom Safety Shield Line */}
              {renderState.hasShield && (
                <View style={[localStyles.safetyShieldLine, { width: arenaWidth }]} />
              )}

              {/* Player Paddle with Recoil Offset & Laser Blaster Turrets */}
              <View
                style={[
                  localStyles.playerPaddle,
                  {
                    left: renderState.paddleX,
                    top: paddleY + renderState.paddleOffsetY,
                    width: renderState.paddleW,
                    height: PADDLE_HEIGHT,
                    borderColor: renderState.hasMagnet
                      ? '#FFB703'
                      : renderState.hasLaser
                      ? '#FF0055'
                      : '#00F5FF',
                  },
                ]}
              >
                <View
                  style={[
                    localStyles.paddleInnerCore,
                    {
                      backgroundColor: renderState.hasMagnet
                        ? '#FFB703'
                        : renderState.hasLaser
                        ? '#FF0055'
                        : '#00F5FF',
                    },
                  ]}
                />
                {renderState.hasLaser && (
                  <>
                    <View style={localStyles.paddleLaserLeft} />
                    <View style={localStyles.paddleLaserRight} />
                  </>
                )}
              </View>

              {/* PROMINENT "TAP TO START" BUTTON IN ALL MODES */}
              {!ballLaunched && (
                <View style={localStyles.launchOverlay} pointerEvents="box-none">
                  <Pressable
                    style={localStyles.launchBtnCard}
                    onPress={handleLaunchBall}
                    hitSlop={20}
                  >
                    <Text style={localStyles.launchBtnIcon}>🚀</Text>
                    <Text style={localStyles.launchBtnText}>TAP TO START</Text>
                    <Text style={localStyles.launchSubText}>
                      {mode === 'SINGLE_BRICKS'
                        ? 'LAUNCH BALL TO BREAK BRICKS'
                        : mode === 'AI_BRICK_DUEL'
                        ? '1 BALL EACH // CENTER BRICK BATTLE'
                        : '1 BALL EACH // HIGH VELOCITY DUEL'}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>

          {/* Bottom Paddle Nudge Controls with Safe Area Insets */}
          <View style={[localStyles.controlsRow, { width: arenaWidth, paddingBottom: Math.max(16, insets.bottom + 10) }]}>
            <Pressable
              style={localStyles.controlBtn}
              onPress={() => handleNudge(-30)}
              hitSlop={10}
            >
              <Text style={localStyles.controlBtnText}>◀</Text>
            </Pressable>

            <View style={localStyles.dragHint}>
              <Text style={localStyles.dragHintText}>DRAG ANYWHERE TO STEER</Text>
            </View>

            <Pressable
              style={localStyles.controlBtn}
              onPress={() => handleNudge(30)}
              hitSlop={10}
            >
              <Text style={localStyles.controlBtnText}>▶</Text>
            </Pressable>
          </View>
        </View>

        {/* Victory / Defeat Modal */}
        <GameResultModal
          visible={modalVisible}
          type={modalType}
          title={modalTitle}
          subtitle={modalSubtitle}
          score={score}
          bestScore={bestScore}
          accentColor={mode === 'HARD_SPHERE_DUEL' ? '#FF0055' : '#00F5FF'}
          onNextLevel={() => {
            const nextLvl = ((engineRef.current.level - 1 + 1) % BRICK_DESIGNS.length) + 1;
            resetGame(mode, nextLvl, true);
          }}
          onRetry={() => {
            if (modalType === 'win' && mode === 'SINGLE_BRICKS') {
              const nextLvl = ((engineRef.current.level - 1 + 1) % BRICK_DESIGNS.length) + 1;
              resetGame(mode, nextLvl, true);
            } else {
              resetGame(mode, engineRef.current.level, false);
            }
          }}
          retryLabel={
            modalType === 'win' && mode === 'SINGLE_BRICKS' ? 'NEXT LEVEL ➔' : 'PLAY AGAIN'
          }
          onBackToHub={onBackToHub}
        />
      </View>
    </JuiceEngine>
  );
}

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modeSelectorBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    marginTop: 4,
    marginBottom: 6,
  },
  modePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(10, 8, 25, 0.85)',
  },
  modePillText: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  heartsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'center',
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  heartSide: {
    justifyContent: 'center',
  },
  heartLabel: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '900',
    color: '#E0AAFF',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  subInfoText: {
    fontFamily: monoFont,
    fontSize: 9,
    color: '#64748B',
    fontWeight: '800',
  },
  heartsContainer: {
    flexDirection: 'row',
    gap: 3,
  },
  heartIcon: {
    fontSize: 13,
  },
  arenaWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arena: {
    backgroundColor: 'rgba(6, 4, 18, 0.95)',
    borderRadius: 18,
    borderWidth: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  singleTopWall: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 14,
    backgroundColor: 'rgba(0, 245, 255, 0.25)',
    borderBottomWidth: 2,
    borderBottomColor: '#00F5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wallGleam: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  singleWallText: {
    fontFamily: monoFont,
    fontSize: 7.5,
    fontWeight: '900',
    color: '#00F5FF',
    letterSpacing: 1.5,
  },
  aiPaddle: {
    position: 'absolute',
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: 'rgba(12, 10, 28, 0.9)',
    overflow: 'hidden',
    shadowColor: '#00F5D4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  playerPaddle: {
    position: 'absolute',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#00F5FF',
    backgroundColor: 'rgba(12, 10, 28, 0.9)',
    overflow: 'hidden',
    shadowColor: '#00F5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 8,
    elevation: 4,
  },
  paddleInnerCore: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 8,
    right: 8,
    borderRadius: 4,
    backgroundColor: '#00F5FF',
    opacity: 0.8,
  },
  brick: {
    position: 'absolute',
    borderRadius: 4,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  brickIcon: {
    fontSize: 10,
    color: '#FFFFFF',
  },
  brickHp: {
    fontFamily: monoFont,
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  capsulePill: {
    position: 'absolute',
    width: 28,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.8,
    backgroundColor: 'rgba(15, 10, 35, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  capsuleIcon: {
    fontSize: 11,
  },
  ball: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6,
  },
  ballCore: {
    width: '40%',
    height: '40%',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  safetyShieldLine: {
    position: 'absolute',
    bottom: 4,
    left: 0,
    height: 3,
    backgroundColor: '#00F5D4',
    shadowColor: '#00F5D4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  aiSafetyShieldLine: {
    position: 'absolute',
    top: 4,
    left: 0,
    height: 3,
    backgroundColor: '#FF0055',
    shadowColor: '#FF0055',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  launchOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 25,
  },
  launchBtnCard: {
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(10, 8, 28, 0.95)',
    borderWidth: 2,
    borderColor: '#00F5FF',
    alignItems: 'center',
    shadowColor: '#00F5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 14,
    elevation: 8,
  },
  launchBtnIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  launchBtnText: {
    fontFamily: monoFont,
    fontSize: 14,
    fontWeight: '900',
    color: '#00F5FF',
    letterSpacing: 1.5,
  },
  launchSubText: {
    fontFamily: monoFont,
    fontSize: 8.5,
    fontWeight: '800',
    color: '#A0AEC0',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  abilityRadarBox: {
    position: 'absolute',
    left: 8,
    top: 50,
    width: 66,
    alignItems: 'center',
  },
  abilityRadarHeader: {
    fontFamily: monoFont,
    fontSize: 8,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  nextAbilityCard: {
    width: '100%',
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(15, 10, 35, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.3)',
    alignItems: 'center',
  },
  activeAbilityCard: {
    width: '100%',
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 0, 85, 0.2)',
    borderWidth: 1,
    borderColor: '#FF0055',
    alignItems: 'center',
  },
  abilityIconLarge: {
    fontSize: 18,
  },
  nextAbilityLabel: {
    fontFamily: monoFont,
    fontSize: 7,
    fontWeight: '800',
    color: '#8A8F9E',
    marginTop: 2,
  },
  activeAbilityTitle: {
    fontFamily: monoFont,
    fontSize: 7,
    fontWeight: '900',
    color: '#FF0055',
    marginTop: 2,
  },
  activeAbilityName: {
    fontFamily: monoFont,
    fontSize: 7,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 1,
  },
  countdownPill: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 245, 255, 0.2)',
  },
  countdownText: {
    fontFamily: monoFont,
    fontSize: 8.5,
    fontWeight: '900',
    color: '#00F5FF',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  controlBtn: {
    width: 48,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnText: {
    fontSize: 16,
    color: '#00F5FF',
    fontWeight: '900',
  },
  dragHint: {
    alignItems: 'center',
  },
  dragHintText: {
    fontFamily: monoFont,
    fontSize: 9,
    color: '#64748B',
    fontWeight: '800',
    letterSpacing: 1,
  },
  levelSelectorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  levelNavBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 245, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNavBtnText: {
    fontSize: 12,
    color: '#00F5FF',
    fontWeight: '900',
  },
  levelCenterInfo: {
    justifyContent: 'center',
  },
  laserBeam: {
    position: 'absolute',
    width: 4,
    height: 14,
    borderRadius: 2,
    backgroundColor: '#FF0055',
    shadowColor: '#FF0055',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  paddleLaserLeft: {
    position: 'absolute',
    top: -6,
    left: 4,
    width: 6,
    height: 8,
    borderRadius: 2,
    backgroundColor: '#FF0055',
    borderWidth: 1,
    borderColor: '#FFE600',
  },
  paddleLaserRight: {
    position: 'absolute',
    top: -6,
    right: 4,
    width: 6,
    height: 8,
    borderRadius: 2,
    backgroundColor: '#FF0055',
    borderWidth: 1,
    borderColor: '#FFE600',
  },
});
