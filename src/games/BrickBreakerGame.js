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

const STORAGE_KEY = '@game_tower:best_breaker_v3';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

// 3 Game Modes
const MODES = [
  { id: 'SINGLE', label: 'SOLO SHIELD', color: COLORS.cyan, desc: 'Solo survival vs energy wall' },
  { id: 'AI_RIVAL', label: '⚔️ AI RIVAL', color: '#00F5D4', desc: 'Standard AI opponent' },
  { id: 'AI_HARD', label: '🔥 AI HARD', color: '#FF0055', desc: 'Fast predictive AI opponent' },
];

// Ability Types
const ABILITY_TYPES = [
  { id: 'MULTI_BALL', name: 'MULTI-BALL', icon: '🔮', desc: 'Converts into multiple balls', duration: 8 },
  { id: 'SPEED_UP', name: 'HYPER SPEED', icon: '⚡', desc: 'Supercharged ball velocity', duration: 7 },
  { id: 'BIG_BALL', name: 'MEGA BALL', icon: '💥', desc: 'Enlarged sphere impact', duration: 8 },
  { id: 'MINI_BALL', name: 'MINI BALL', icon: '🌀', desc: 'Micro high-agility spheres', duration: 8 },
];

const INITIAL_HEARTS = 4;
const DEFAULT_BALL_RADIUS = 8;
const PADDLE_HEIGHT = 14;

export default function BrickBreakerGame({ onBackToHub, onScoreUpdate, isPaused = false }) {
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const { width, height } = useWindowDimensions();
  const arenaWidth = Math.min(width - 24, 440);
  const arenaHeight = Math.max(480, height - 160);

  const basePaddleW = Math.min(100, arenaWidth * 0.28);
  const paddleY = arenaHeight - 38;
  const aiPaddleY = 32;

  // Selected Mode: 'SINGLE' | 'AI_RIVAL' | 'AI_HARD'
  const [mode, setMode] = useState('AI_RIVAL');
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  // 4 Heart Chances for each side
  const [playerHearts, setPlayerHearts] = useState(INITIAL_HEARTS);
  const [aiHearts, setAiHearts] = useState(INITIAL_HEARTS);

  // Ability Countdown state (displayed on the left side!)
  const [nextAbilityCountdown, setNextAbilityCountdown] = useState(5);
  const [nextAbility, setNextAbility] = useState(ABILITY_TYPES[0]);
  const [activeAbility, setActiveAbility] = useState(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('win');
  const [modalTitle, setModalTitle] = useState('');
  const [modalSubtitle, setModalSubtitle] = useState('');

  // Render state for 60fps frame
  const [renderState, setRenderState] = useState({
    paddleX: (arenaWidth - basePaddleW) / 2,
    paddleW: basePaddleW,
    aiPaddleX: (arenaWidth - basePaddleW) / 2,
    aiPaddleW: basePaddleW,
    balls: [],
  });

  const juiceRef = useRef(null);

  // Engine mutable physics reference
  const engineRef = useRef({
    running: true,
    mode: 'AI_RIVAL',
    score: 0,
    best: 0,
    playerHearts: INITIAL_HEARTS,
    aiHearts: INITIAL_HEARTS,
    paddleX: (arenaWidth - basePaddleW) / 2,
    paddleW: basePaddleW,
    aiPaddleX: (arenaWidth - basePaddleW) / 2,
    aiPaddleW: basePaddleW,
    balls: [],
    // Ability timer
    abilityTimer: 5.0, // seconds until next ability triggers
    nextAbilityIdx: 0,
    activeAbility: null,
    activeAbilityTimer: 0,
    rallies: 0,
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

  // Spawn 2 initial balls with diverging angles
  const createInitialBalls = useCallback((ballRadius = DEFAULT_BALL_RADIUS) => {
    const midX = arenaWidth / 2;
    const midY = arenaHeight / 2;
    const speed = 210;

    return [
      {
        id: `ball_1_${Date.now()}`,
        x: midX - 30,
        y: midY,
        vx: -speed * 0.65,
        vy: speed * 0.76,
        r: ballRadius,
        color: COLORS.cyan,
      },
      {
        id: `ball_2_${Date.now()}`,
        x: midX + 30,
        y: midY - 20,
        vx: speed * 0.70,
        vy: -speed * 0.71,
        r: ballRadius,
        color: '#FF007F',
      },
    ];
  }, [arenaWidth, arenaHeight]);

  // Reset or Start Game with chosen mode
  const resetGame = useCallback(
    (chosenMode = 'AI_RIVAL') => {
      const startPadX = (arenaWidth - basePaddleW) / 2;
      const initialBalls = createInitialBalls();

      const eng = engineRef.current;
      eng.running = true;
      eng.mode = chosenMode;
      eng.score = 0;
      eng.playerHearts = INITIAL_HEARTS;
      eng.aiHearts = INITIAL_HEARTS;
      eng.paddleX = startPadX;
      eng.paddleW = basePaddleW;
      eng.aiPaddleX = startPadX;
      eng.aiPaddleW = basePaddleW;
      eng.balls = initialBalls;
      eng.abilityTimer = 5.0;
      eng.nextAbilityIdx = 0;
      eng.activeAbility = null;
      eng.activeAbilityTimer = 0;
      eng.rallies = 0;

      setMode(chosenMode);
      setScore(0);
      setPlayerHearts(INITIAL_HEARTS);
      setAiHearts(INITIAL_HEARTS);
      setNextAbilityCountdown(5);
      setNextAbility(ABILITY_TYPES[0]);
      setActiveAbility(null);
      setModalVisible(false);

      setRenderState({
        paddleX: startPadX,
        paddleW: basePaddleW,
        aiPaddleX: startPadX,
        aiPaddleW: basePaddleW,
        balls: initialBalls,
      });

      if (juiceRef.current) {
        juiceRef.current.flash(chosenMode === 'AI_HARD' ? '#FF0055' : COLORS.cyan);
      }
    },
    [arenaWidth, basePaddleW, createInitialBalls]
  );

  useEffect(() => {
    resetGame(mode);
  }, []);

  // Main 60 FPS Physics Loop
  useEffect(() => {
    let lastTime = Date.now();
    let frameId = null;

    const tick = () => {
      const now = Date.now();
      const dt = Math.min(0.04, (now - lastTime) / 1000);
      lastTime = now;

      const eng = engineRef.current;

      if (!isPausedRef.current && eng.running) {
        // --- 1. ABILITY COUNTDOWN ON LEFT SIDE ---
        if (!eng.activeAbility) {
          eng.abilityTimer -= dt;
          const displaySec = Math.max(1, Math.ceil(eng.abilityTimer));
          setNextAbilityCountdown(displaySec);

          if (eng.abilityTimer <= 0) {
            // Trigger Ability!
            const ability = ABILITY_TYPES[eng.nextAbilityIdx % ABILITY_TYPES.length];
            eng.activeAbility = ability;
            eng.activeAbilityTimer = ability.duration;
            setActiveAbility(ability);

            playSpeedUpSound();
            triggerSliceHaptic();

            if (juiceRef.current) {
              juiceRef.current.popup(
                `ABILITY ACTIVATED!`,
                ability.name,
                ability.id === 'SPEED_UP' ? '#FFD166' : COLORS.cyan
              );
              juiceRef.current.shake(6, 4);
            }

            // Apply immediate effect
            if (ability.id === 'MULTI_BALL') {
              // Suddenly convert into multiple balls!
              const extraBalls = [];
              eng.balls.forEach((b, idx) => {
                const angleOffset = idx % 2 === 0 ? 0.6 : -0.6;
                const spd = Math.hypot(b.vx, b.vy) || 220;
                extraBalls.push({
                  id: `extra_${Date.now()}_${idx}`,
                  x: b.x + (idx % 2 === 0 ? 10 : -10),
                  y: b.y + (b.vy > 0 ? -12 : 12),
                  vx: Math.cos(angleOffset) * spd * (idx % 2 === 0 ? 1 : -1),
                  vy: Math.sin(angleOffset) * spd,
                  r: b.r,
                  color: idx % 2 === 0 ? '#FFE600' : '#39FF14',
                });
              });
              eng.balls.push(...extraBalls);
            } else if (ability.id === 'SPEED_UP') {
              eng.balls.forEach((b) => {
                b.vx *= 1.45;
                b.vy *= 1.45;
              });
            } else if (ability.id === 'BIG_BALL') {
              eng.balls.forEach((b) => {
                b.r = 18; // Mega ball!
              });
            } else if (ability.id === 'MINI_BALL') {
              eng.balls.forEach((b) => {
                b.r = 5; // Mini ball!
              });
            }

            // Queue up next ability for countdown
            eng.nextAbilityIdx = (eng.nextAbilityIdx + 1) % ABILITY_TYPES.length;
            setNextAbility(ABILITY_TYPES[eng.nextAbilityIdx]);
          }
        } else {
          // Count down active ability
          eng.activeAbilityTimer -= dt;
          if (eng.activeAbilityTimer <= 0) {
            // Revert active ability effects
            if (eng.activeAbility.id === 'BIG_BALL' || eng.activeAbility.id === 'MINI_BALL') {
              eng.balls.forEach((b) => {
                b.r = DEFAULT_BALL_RADIUS;
              });
            } else if (eng.activeAbility.id === 'SPEED_UP') {
              eng.balls.forEach((b) => {
                const currentSpd = Math.hypot(b.vx, b.vy);
                const normalSpd = 210;
                if (currentSpd > normalSpd) {
                  b.vx = (b.vx / currentSpd) * normalSpd;
                  b.vy = (b.vy / currentSpd) * normalSpd;
                }
              });
            }

            eng.activeAbility = null;
            setActiveAbility(null);
            eng.abilityTimer = 5.0; // Reset countdown to 5 sec
            setNextAbilityCountdown(5);
          }
        }

        // --- 2. AI PADDLE AI (AI RIVAL / AI HARD) ---
        if (eng.mode === 'AI_RIVAL' || eng.mode === 'AI_HARD') {
          let targetBall = null;
          let lowestY = Infinity;

          for (const b of eng.balls) {
            if (b.vy < 0 && b.y < lowestY) {
              lowestY = b.y;
              targetBall = b;
            }
          }

          if (targetBall) {
            const aiCenter = eng.aiPaddleX + eng.aiPaddleW / 2;
            let targetX = targetBall.x;

            if (eng.mode === 'AI_HARD') {
              const timeToReach = Math.max(0, (targetBall.y - aiPaddleY) / Math.abs(targetBall.vy || 1));
              targetX = targetBall.x + targetBall.vx * timeToReach;
              targetX += Math.sin(now * 0.005) * 8;
            }

            const diff = targetX - aiCenter;
            const aiSpeed = eng.mode === 'AI_HARD' ? 380 : 250;
            const moveDelta = Math.sign(diff) * Math.min(Math.abs(diff), aiSpeed * dt);
            eng.aiPaddleX = Math.max(4, Math.min(arenaWidth - eng.aiPaddleW - 4, eng.aiPaddleX + moveDelta));
          }
        }

        // --- 3. BALLS PHYSICS & COLLISION ---
        const nextBalls = [];

        for (let i = 0; i < eng.balls.length; i++) {
          const b = eng.balls[i];
          let nx = b.x + b.vx * dt;
          let ny = b.y + b.vy * dt;
          let ballAlive = true;

          // Side wall bounce
          if (nx - b.r <= 4) {
            nx = 4 + b.r;
            b.vx = Math.abs(b.vx);
            playTapSound();
          } else if (nx + b.r >= arenaWidth - 4) {
            nx = arenaWidth - 4 - b.r;
            b.vx = -Math.abs(b.vx);
            playTapSound();
          }

          // Top Collision: AI Paddle or Top Barrier (Single Mode)
          if (eng.mode === 'SINGLE') {
            if (ny - b.r <= 8) {
              ny = 8 + b.r;
              b.vy = Math.abs(b.vy);

              eng.rallies += 1;
              eng.score += 15;
              setScore(eng.score);
              persistBest(eng.score);
              playTapSound();
              triggerLightHaptic();
            }
          } else {
            const aiPadLeft = eng.aiPaddleX;
            const aiPadRight = eng.aiPaddleX + eng.aiPaddleW;

            if (
              ny - b.r <= aiPaddleY + PADDLE_HEIGHT &&
              ny + b.r >= aiPaddleY &&
              nx >= aiPadLeft - 6 &&
              nx <= aiPadRight + 6 &&
              b.vy < 0
            ) {
              ny = aiPaddleY + PADDLE_HEIGHT + b.r;
              const hitOffset = (nx - (aiPadLeft + eng.aiPaddleW / 2)) / (eng.aiPaddleW / 2);
              b.vx = hitOffset * 220;
              b.vy = Math.abs(b.vy);

              playTapSound();
              triggerLightHaptic();
            } else if (ny - b.r <= 0) {
              // AI MISSED! Ball touched AI Shield boundary!
              ballAlive = false;
              eng.aiHearts -= 1;
              setAiHearts(eng.aiHearts);

              eng.score += 120;
              setScore(eng.score);
              persistBest(eng.score);

              playPerfectSound(4);
              triggerPerfectHaptic(2);

              if (juiceRef.current) {
                juiceRef.current.shake(10, 6);
                juiceRef.current.flash(COLORS.cyan);
                juiceRef.current.popup('AI SHIELD BREACHED!', '-1 HEART', COLORS.cyan);
              }

              if (eng.aiHearts <= 0) {
                eng.running = false;
                setModalType('win');
                setModalTitle('VICTORY!');
                setModalSubtitle(
                  eng.mode === 'AI_HARD'
                    ? 'AI HARD OVERLOADED // APEX CHAMPION'
                    : 'AI RIVAL NEUTRALIZED // SHIELD INTACT'
                );
                setModalVisible(true);
                return;
              }
            }
          }

          // Bottom Collision: Player Paddle
          const padLeft = eng.paddleX;
          const padRight = eng.paddleX + eng.paddleW;

          if (
            ny + b.r >= paddleY &&
            ny - b.r <= paddleY + PADDLE_HEIGHT &&
            nx >= padLeft - 6 &&
            nx <= padRight + 6 &&
            b.vy > 0
          ) {
            ny = paddleY - b.r;
            const hitOffset = (nx - (padLeft + eng.paddleW / 2)) / (eng.paddleW / 2);
            b.vx = hitOffset * 240;
            b.vy = -Math.abs(b.vy);

            eng.rallies += 1;
            eng.score += 10;
            setScore(eng.score);
            persistBest(eng.score);

            playSliceSound();
            triggerSliceHaptic();

            if (juiceRef.current) {
              juiceRef.current.shake(4, 2);
            }
          } else if (ny + b.r >= arenaHeight) {
            // PLAYER MISSED! Ball touched Player Shield boundary!
            ballAlive = false;
            eng.playerHearts -= 1;
            setPlayerHearts(eng.playerHearts);

            playGameOverSound();
            triggerGameOverHaptic();

            if (juiceRef.current) {
              juiceRef.current.shake(12, 8);
              juiceRef.current.flash(COLORS.danger);
              juiceRef.current.popup('SHIELD DAMAGED!', '-1 HEART', COLORS.danger);
            }

            if (eng.playerHearts <= 0) {
              eng.running = false;
              setModalType('gameover');
              setModalTitle('SHIELD COMPROMISED!');
              setModalSubtitle('ALL 4 HEARTS DEPLETED // REBOOT SYSTEM');
              setModalVisible(true);
              return;
            }
          }

          if (ballAlive) {
            b.x = nx;
            b.y = ny;
            nextBalls.push(b);
          }
        }

        // Guarantee at least 2 balls in play at all times!
        while (nextBalls.length < 2) {
          const isTopLaunch = Math.random() > 0.5;
          const speed = 210;
          nextBalls.push({
            id: `respawn_${Date.now()}_${Math.random()}`,
            x: arenaWidth / 2 + (Math.random() - 0.5) * 60,
            y: arenaHeight / 2,
            vx: (Math.random() - 0.5) * speed,
            vy: isTopLaunch ? speed * 0.75 : -speed * 0.75,
            r: DEFAULT_BALL_RADIUS,
            color: nextBalls.length % 2 === 0 ? COLORS.cyan : '#FF007F',
          });
        }

        eng.balls = nextBalls;

        setRenderState({
          paddleX: eng.paddleX,
          paddleW: eng.paddleW,
          aiPaddleX: eng.aiPaddleX,
          aiPaddleW: eng.aiPaddleW,
          balls: [...eng.balls],
        });
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [arenaWidth, arenaHeight, paddleY, aiPaddleY, persistBest]);

  // PanResponder for smooth 1:1 horizontal paddle dragging
  const dragStartRef = useRef({ startX: 0, startPaddleX: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isPausedRef.current,
      onMoveShouldSetPanResponder: () => !isPausedRef.current,
      onPanResponderGrant: (evt) => {
        dragStartRef.current.startX = evt.nativeEvent.pageX;
        dragStartRef.current.startPaddleX = engineRef.current.paddleX;
      },
      onPanResponderMove: (evt) => {
        const dx = evt.nativeEvent.pageX - dragStartRef.current.startX;
        const eng = engineRef.current;
        const targetX = dragStartRef.current.startPaddleX + dx;
        const clamped = Math.max(4, Math.min(arenaWidth - eng.paddleW - 4, targetX));
        eng.paddleX = clamped;
      },
    })
  ).current;

  // Nudge buttons for optional button control
  const handleNudge = (delta) => {
    const eng = engineRef.current;
    const targetX = eng.paddleX + delta;
    eng.paddleX = Math.max(4, Math.min(arenaWidth - eng.paddleW - 4, targetX));
    playTapSound();
    triggerLightHaptic();
  };

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={localStyles.container}>
        <LinearGradient
          colors={['#050212', '#080824', '#040212']}
          style={StyleSheet.absoluteFillObject}
        />

        <MiniGameHeader
          title="BRICK BREAKER"
          floorLabel="FLOOR 10 // SPHERE DUEL ARENA"
          score={score}
          bestScore={bestScore}
          accentColor={mode === 'AI_HARD' ? '#FF0055' : COLORS.cyan}
          onBack={onBackToHub}
          onReset={() => resetGame(mode)}
        />

        {/* Mode Selector */}
        <View style={localStyles.modeSelectorBar}>
          {MODES.map((m) => {
            const isSelected = mode === m.id;
            return (
              <Pressable
                key={m.id}
                onPress={() => resetGame(m.id)}
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

        {/* Heart Lives Bar (AI at Top, Player at Bottom) */}
        <View style={[localStyles.heartsRow, { width: arenaWidth }]}>
          {/* Opponent Hearts */}
          <View style={localStyles.heartSide}>
            <Text style={localStyles.heartLabel}>
              {mode === 'SINGLE' ? 'CORE INTEGRITY' : mode === 'AI_HARD' ? 'AI HARD' : 'AI RIVAL'}
            </Text>
            <View style={localStyles.heartsContainer}>
              {Array.from({ length: INITIAL_HEARTS }).map((_, i) => (
                <Text key={`ai_h_${i}`} style={localStyles.heartIcon}>
                  {i < aiHearts ? '❤️' : '🖤'}
                </Text>
              ))}
            </View>
          </View>

          {/* Player Hearts */}
          <View style={[localStyles.heartSide, { alignItems: 'flex-end' }]}>
            <Text style={localStyles.heartLabel}>YOUR SHIELD</Text>
            <View style={localStyles.heartsContainer}>
              {Array.from({ length: INITIAL_HEARTS }).map((_, i) => (
                <Text key={`p_h_${i}`} style={localStyles.heartIcon}>
                  {i < playerHearts ? '💙' : '🖤'}
                </Text>
              ))}
            </View>
          </View>
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
                borderColor: mode === 'AI_HARD' ? 'rgba(255, 0, 85, 0.45)' : 'rgba(0, 245, 255, 0.35)',
              },
            ]}
          >
            {/* ABILITY COUNTDOWN RADAR (On the Left Side!) */}
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
                  <Text style={localStyles.abilityIconLarge}>{nextAbility.icon}</Text>
                  <Text style={localStyles.nextAbilityLabel}>UP NEXT</Text>
                  <Text style={localStyles.nextAbilityName}>{nextAbility.name}</Text>
                  <View style={localStyles.countdownPill}>
                    <Text style={localStyles.countdownText}>{nextAbilityCountdown}s</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Top Opponent (AI Paddle in Rival/Hard, Energy Wall in Single) */}
            {mode === 'SINGLE' ? (
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
                    top: aiPaddleY,
                    width: renderState.aiPaddleW,
                    height: PADDLE_HEIGHT,
                    borderColor: mode === 'AI_HARD' ? '#FF0055' : '#00F5D4',
                  },
                ]}
              >
                <View
                  style={[
                    localStyles.paddleInnerCore,
                    { backgroundColor: mode === 'AI_HARD' ? '#FF0055' : '#00F5D4' },
                  ]}
                />
              </View>
            )}

            {/* Arena Balls (Starts with 2, can convert into multiple balls) */}
            {renderState.balls.map((b) => (
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
                    backgroundColor: b.color,
                    shadowColor: b.color,
                  },
                ]}
              >
                <View style={localStyles.ballCore} />
              </View>
            ))}

            {/* Bottom Player Paddle */}
            <View
              style={[
                localStyles.playerPaddle,
                {
                  left: renderState.paddleX,
                  top: paddleY,
                  width: renderState.paddleW,
                  height: PADDLE_HEIGHT,
                },
              ]}
            >
              <View style={localStyles.paddleInnerCore} />
            </View>
          </View>
        </View>

        {/* Bottom Paddle Nudge Controls */}
        <View style={[localStyles.controlsRow, { width: arenaWidth }]}>
          <Pressable
            style={({ pressed }) => [
              localStyles.nudgeBtn,
              pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
            ]}
            onPress={() => handleNudge(-36)}
          >
            <Text style={localStyles.nudgeArrow}>◀ NUDGE LEFT</Text>
          </Pressable>

          <Text style={localStyles.dragHint}>DRAG PADDLE TO DEFEND</Text>

          <Pressable
            style={({ pressed }) => [
              localStyles.nudgeBtn,
              pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
            ]}
            onPress={() => handleNudge(36)}
          >
            <Text style={localStyles.nudgeArrow}>NUDGE RIGHT ▶</Text>
          </Pressable>
        </View>

        {/* Victory / Defeat Modal */}
        <GameResultModal
          visible={modalVisible}
          type={modalType}
          title={modalTitle}
          subtitle={modalSubtitle}
          score={score}
          bestScore={bestScore}
          accentColor={modalType === 'win' ? COLORS.cyan : COLORS.danger}
          onRetry={() => resetGame(mode)}
          retryLabel="PLAY AGAIN"
          onBackToHub={onBackToHub}
        />
      </View>
    </JuiceEngine>
  );
}

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#040212',
  },
  modeSelectorBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  modePill: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backgroundColor: 'rgba(8, 8, 24, 0.65)',
  },
  modePillText: {
    fontFamily: monoFont,
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  heartsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  heartSide: {
    flexDirection: 'column',
  },
  heartLabel: {
    fontFamily: monoFont,
    fontSize: 8.5,
    color: '#8A8F9E',
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  heartsContainer: {
    flexDirection: 'row',
    gap: 2,
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
    borderRadius: 16,
    borderWidth: 1.8,
    backgroundColor: 'rgba(5, 4, 18, 0.88)',
    position: 'relative',
    overflow: 'hidden',
  },
  abilityRadarBox: {
    position: 'absolute',
    left: 8,
    top: 60,
    width: 68,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.3)',
    backgroundColor: 'rgba(4, 8, 22, 0.85)',
    alignItems: 'center',
    zIndex: 10,
  },
  abilityRadarHeader: {
    fontFamily: monoFont,
    fontSize: 8,
    fontWeight: '900',
    color: '#8A8F9E',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  abilityIconLarge: {
    fontSize: 18,
    marginBottom: 2,
  },
  nextAbilityCard: {
    alignItems: 'center',
  },
  nextAbilityLabel: {
    fontFamily: monoFont,
    fontSize: 7.5,
    fontWeight: '800',
    color: COLORS.cyan,
  },
  nextAbilityName: {
    fontFamily: monoFont,
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 1,
  },
  countdownPill: {
    backgroundColor: 'rgba(0, 245, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 0.8,
    borderColor: 'rgba(0, 245, 255, 0.5)',
  },
  countdownText: {
    fontFamily: monoFont,
    fontSize: 9.5,
    fontWeight: '900',
    color: COLORS.cyan,
  },
  activeAbilityCard: {
    alignItems: 'center',
  },
  activeAbilityTitle: {
    fontFamily: monoFont,
    fontSize: 7.5,
    fontWeight: '900',
    color: '#39FF14',
    letterSpacing: 0.5,
  },
  activeAbilityName: {
    fontFamily: monoFont,
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  singleTopWall: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 16,
    backgroundColor: 'rgba(0, 245, 255, 0.25)',
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  singleWallText: {
    fontFamily: monoFont,
    fontSize: 8,
    fontWeight: '900',
    color: COLORS.cyan,
    letterSpacing: 1,
  },
  wallGleam: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#FFFFFF',
    opacity: 0.6,
  },
  aiPaddle: {
    position: 'absolute',
    borderRadius: 7,
    borderWidth: 1.5,
    backgroundColor: 'rgba(20, 10, 35, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  playerPaddle: {
    position: 'absolute',
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: COLORS.cyan,
    backgroundColor: 'rgba(10, 25, 45, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 8,
    elevation: 4,
  },
  paddleInnerCore: {
    width: '75%',
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.cyan,
  },
  ball: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 7,
    elevation: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ballCore: {
    width: '40%',
    height: '40%',
    borderRadius: 99,
    backgroundColor: '#FFFFFF',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingBottom: 12,
    marginTop: 4,
  },
  nudgeBtn: {
    backgroundColor: 'rgba(0, 245, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.35)',
  },
  nudgeArrow: {
    fontFamily: monoFont,
    fontSize: 9.5,
    fontWeight: '900',
    color: COLORS.cyan,
  },
  dragHint: {
    fontFamily: monoFont,
    fontSize: 9,
    color: '#8A8F9E',
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
