import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../../styles';
import MiniGameHeader from '../components/MiniGameHeader';
import JuiceEngine from '../components/JuiceEngine';
import GameResultModal from '../components/GameResultModal';
import {
  triggerLightHaptic,
  triggerPerfectHaptic,
  triggerGameOverHaptic,
} from '../utils/haptics';
import {
  playTapSound,
  playPerfectSound,
  playGameOverSound,
} from '../utils/sound';

const STORAGE_KEY = '@game_tower:best_snake_v1';
const GRID_COUNT = 15;

export const SNAKE_SPEEDS = [
  { id: 'SLOW', label: '1.0× CHILL', ms: 155, accent: '#00F5D4' },
  { id: 'NORMAL', label: '1.5× CLASSIC', ms: 110, accent: '#00F5FF' },
  { id: 'FAST', label: '2.0× TURBO', ms: 75, accent: '#FFE600' },
  { id: 'HYPER', label: '2.5× HYPER', ms: 52, accent: '#FF0055' },
];

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const randomFood = (snake) => {
  while (true) {
    const r = Math.floor(Math.random() * GRID_COUNT);
    const c = Math.floor(Math.random() * GRID_COUNT);
    if (!snake.some((s) => s.r === r && s.c === c)) {
      return { r, c, isGold: Math.random() < 0.22 };
    }
  }
};

export default function CyberSnakeGame({ onBackToHub, onScoreUpdate, isPaused = false }) {
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const { width } = useWindowDimensions();
  const boardSize = Math.min(360, width - 28);
  const cellSize = Math.floor((boardSize - 16) / GRID_COUNT);
  const juiceRef = useRef(null);

  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [selectedSpeedKey, setSelectedSpeedKey] = useState('NORMAL');
  const [status, setStatus] = useState('SPEED_SELECT');
  const activeSpeed = SNAKE_SPEEDS.find((s) => s.id === selectedSpeedKey) || SNAKE_SPEEDS[1];

  const [renderState, setRenderState] = useState(() => {
    const initialSnake = [
      { r: 7, c: 7 },
      { r: 7, c: 6 },
      { r: 7, c: 5 },
    ];
    return {
      snake: initialSnake,
      food: randomFood(initialSnake),
    };
  });

  const engineRef = useRef({
    snake: [
      { r: 7, c: 7 },
      { r: 7, c: 6 },
      { r: 7, c: 5 },
    ],
    dir: { dr: 0, dc: 1 },
    nextDir: { dr: 0, dc: 1 },
    food: { r: 4, c: 10, isGold: false },
    score: 0,
    best: 0,
    running: false,
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

  const resetGame = useCallback((forceSpeedSelect = false) => {
    const startSnake = [
      { r: 7, c: 7 },
      { r: 7, c: 6 },
      { r: 7, c: 5 },
    ];
    const startFood = randomFood(startSnake);
    engineRef.current = {
      ...engineRef.current,
      snake: startSnake,
      dir: { dr: 0, dc: 1 },
      nextDir: { dr: 0, dc: 1 },
      food: startFood,
      score: 0,
      running: !forceSpeedSelect,
    };
    setScore(0);
    setStatus(forceSpeedSelect ? 'SPEED_SELECT' : 'PLAYING');
    setRenderState({ snake: startSnake, food: startFood });
    if (juiceRef.current) juiceRef.current.flash(activeSpeed.accent);
  }, [activeSpeed]);

  const changeDirection = useCallback((dr, dc) => {
    if (isPausedRef.current) return;
    const cur = engineRef.current.dir;
    if (cur.dr + dr === 0 && cur.dc + dc === 0) return;
    engineRef.current.nextDir = { dr, dc };
    triggerLightHaptic();
    playTapSound();
  }, []);

  // Screen Left / Right Tap Cycle Steering:
  // Left Tap = Counter-Clockwise Cycle (Relative Left: UP -> LEFT -> DOWN -> RIGHT)
  // Right Tap = Clockwise / Reverse Cycle (Relative Right: UP -> RIGHT -> DOWN -> LEFT)
  const turnCycle = useCallback((isReverseCycle) => {
    if (isPausedRef.current || !engineRef.current.running) return;
    const cur = engineRef.current.nextDir || engineRef.current.dir;
    let next = null;

    if (cur.dr === -1 && cur.dc === 0) {
      // Currently moving UP
      next = isReverseCycle ? { dr: 0, dc: 1 } : { dr: 0, dc: -1 }; // RIGHT or LEFT
    } else if (cur.dr === 0 && cur.dc === 1) {
      // Currently moving RIGHT
      next = isReverseCycle ? { dr: 1, dc: 0 } : { dr: -1, dc: 0 }; // DOWN or UP
    } else if (cur.dr === 1 && cur.dc === 0) {
      // Currently moving DOWN
      next = isReverseCycle ? { dr: 0, dc: -1 } : { dr: 0, dc: 1 }; // LEFT or RIGHT
    } else if (cur.dr === 0 && cur.dc === -1) {
      // Currently moving LEFT
      next = isReverseCycle ? { dr: -1, dc: 0 } : { dr: 1, dc: 0 }; // UP or DOWN
    }

    if (next) {
      engineRef.current.nextDir = next;
      triggerLightHaptic();
      playTapSound();
    }
  }, []);

  useEffect(() => {
    if (status !== 'PLAYING') return;

    const timer = setInterval(() => {
      if (isPausedRef.current) return;
      const eng = engineRef.current;
      if (!eng.running) return;

      eng.dir = eng.nextDir;
      const head = eng.snake[0];
      const nr = head.r + eng.dir.dr;
      const nc = head.c + eng.dir.dc;

      // Wall or self collision
      if (
        nr < 0 ||
        nr >= GRID_COUNT ||
        nc < 0 ||
        nc >= GRID_COUNT ||
        eng.snake.some((s) => s.r === nr && s.c === nc)
      ) {
        eng.running = false;
        setStatus('GAME_OVER');
        triggerGameOverHaptic();
        playGameOverSound();
        if (juiceRef.current) {
          juiceRef.current.shake(12, 9);
          juiceRef.current.flash(COLORS.danger);
        }
        return;
      }

      const nextSnake = [{ r: nr, c: nc }, ...eng.snake];
      if (nr === eng.food.r && nc === eng.food.c) {
        const gained = eng.food.isGold ? 50 : 20;
        eng.score += gained;
        setScore(eng.score);
        persistBest(eng.score);
        triggerPerfectHaptic(2);
        playPerfectSound(Math.min(8, Math.floor(eng.score / 40) + 1));

        if (juiceRef.current) {
          juiceRef.current.shake(5, 4);
          juiceRef.current.burst(
            undefined,
            undefined,
            eng.food.isGold ? COLORS.solarGold : COLORS.matrixMint,
            16
          );
          juiceRef.current.popup(
            eng.food.isGold ? 'GOLD CORE! +50' : `+${gained} PTS`,
            `LENGTH ${nextSnake.length}`,
            eng.food.isGold ? COLORS.solarGold : COLORS.matrixMint
          );
        }
        eng.food = randomFood(nextSnake);
      } else {
        nextSnake.pop();
      }

      eng.snake = nextSnake;
      setRenderState({
        snake: [...nextSnake],
        food: { ...eng.food },
      });
    }, activeSpeed.ms);

    return () => clearInterval(timer);
  }, [status, activeSpeed.ms, persistBest]);

  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .minDistance(16)
    .onEnd((e) => {
      if (Math.abs(e.translationX) > Math.abs(e.translationY)) {
        changeDirection(0, e.translationX > 0 ? 1 : -1);
      } else {
        changeDirection(e.translationY > 0 ? 1 : -1, 0);
      }
    });

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={localStyles.container}>
        <LinearGradient
          colors={['#03030A', '#061814', '#0A2820']}
          style={StyleSheet.absoluteFillObject}
        />

        <MiniGameHeader
          title="SNAKE"
          floorLabel={status === 'SPEED_SELECT' ? 'FLOOR 11 // SPEED SELECT' : `FLOOR 11 // ${activeSpeed.label}`}
          score={score}
          bestScore={bestScore}
          accentColor={activeSpeed.accent}
          onBack={onBackToHub}
          onReset={() => resetGame(true)}
        />

        <View style={localStyles.body}>
          <GestureDetector gesture={panGesture}>
            <View
              style={[
                localStyles.board,
                {
                  width: cellSize * GRID_COUNT + 16,
                  height: cellSize * GRID_COUNT + 16,
                  borderColor: `${activeSpeed.accent}77`,
                },
              ]}
            >
              {/* Left / Right Screen Tap Zones */}
              <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
                <View style={localStyles.tapZonesRow} pointerEvents="box-none">
                  <Pressable
                    style={localStyles.tapZoneHalf}
                    onPress={() => turnCycle(false)}
                  />
                  <Pressable
                    style={localStyles.tapZoneHalf}
                    onPress={() => turnCycle(true)}
                  />
                </View>
              </View>

              {/* Food Orb */}
              <View
                style={[
                  localStyles.foodDot,
                  {
                    left: 8 + renderState.food.c * cellSize,
                    top: 8 + renderState.food.r * cellSize,
                    width: cellSize - 2,
                    height: cellSize - 2,
                    borderRadius: cellSize / 2,
                    backgroundColor: renderState.food.isGold
                      ? COLORS.solarGold
                      : COLORS.magenta,
                  },
                ]}
              />

              {/* Snake Segments */}
              {renderState.snake.map((seg, idx) => (
                <View
                  key={`seg_${idx}`}
                  style={[
                    localStyles.snakeSeg,
                    {
                      left: 8 + seg.c * cellSize,
                      top: 8 + seg.r * cellSize,
                      width: cellSize - 2,
                      height: cellSize - 2,
                      backgroundColor:
                        idx === 0 ? '#FFFFFF' : activeSpeed.accent,
                      opacity: Math.max(0.45, 1 - idx * 0.025),
                    },
                  ]}
                />
              ))}

              {/* Speed Selection Overlay Before Game Starts */}
              {status === 'SPEED_SELECT' && (
                <View style={localStyles.speedOverlay}>
                  <Text style={localStyles.speedTitle}>SELECT SPEED</Text>
                  <Text style={localStyles.speedSub}>CHOOSE SERPENT VELOCITY</Text>

                  <View style={localStyles.speedPillsContainer}>
                    {SNAKE_SPEEDS.map((sp) => {
                      const isSel = sp.id === selectedSpeedKey;
                      return (
                        <Pressable
                          key={sp.id}
                          onPress={() => {
                            setSelectedSpeedKey(sp.id);
                            triggerLightHaptic();
                            playTapSound();
                          }}
                          style={[
                            localStyles.speedPill,
                            isSel && {
                              borderColor: sp.accent,
                              backgroundColor: `${sp.accent}2A`,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              localStyles.speedPillText,
                              { color: isSel ? sp.accent : '#8E9AA8' },
                            ]}
                          >
                            {sp.label}
                          </Text>
                          <Text
                            style={[
                              localStyles.speedPillMs,
                              { color: isSel ? '#FFFFFF' : '#5E6773' },
                            ]}
                          >
                            {sp.ms}ms / step
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Pressable
                    onPress={() => {
                      triggerPerfectHaptic(2);
                      playTapSound();
                      setStatus('PLAYING');
                      engineRef.current.running = true;
                      if (juiceRef.current) juiceRef.current.flash(activeSpeed.accent);
                    }}
                    style={[localStyles.launchBtn, { backgroundColor: activeSpeed.accent }]}
                  >
                    <Text style={localStyles.launchBtnText}>▶ START SERPENT</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </GestureDetector>

          <GameResultModal
            visible={status === 'GAME_OVER'}
            type="GAME_OVER"
            title="SERPENT CRASHED!"
            subtitle={`SPEED: ${activeSpeed.label} // TAIL: ${renderState.snake.length} BLOCKS`}
            score={score}
            bestScore={bestScore}
            accentColor={activeSpeed.accent}
            onRetry={() => resetGame(true)}
            retryLabel="CHANGE SPEED / RETRY"
            onBackToHub={onBackToHub}
          />

          {/* Dual Cyber Steering Pedals (Tap Screen or Buttons to Cycle) */}
          <View style={[localStyles.steeringRow, { width: cellSize * GRID_COUNT + 16 }]}>
            <Pressable
              onPress={() => turnCycle(false)}
              style={({ pressed }) => [
                localStyles.steeringPedal,
                localStyles.steeringPedalLeft,
                pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] },
              ]}
            >
              <Text style={localStyles.steeringPedalIcon}>⟲</Text>
              <View style={localStyles.steeringTextWrap}>
                <Text style={localStyles.steeringPedalTitle}>CYCLE</Text>
                <Text style={localStyles.steeringPedalSub}>TAP LEFT</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => turnCycle(true)}
              style={({ pressed }) => [
                localStyles.steeringPedal,
                localStyles.steeringPedalRight,
                pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] },
              ]}
            >
              <View style={[localStyles.steeringTextWrap, { alignItems: 'flex-end' }]}>
                <Text style={[localStyles.steeringPedalTitle, { color: COLORS.cyan }]}>REVERSE</Text>
                <Text style={localStyles.steeringPedalSub}>TAP RIGHT</Text>
              </View>
              <Text style={[localStyles.steeringPedalIcon, { color: COLORS.cyan }]}>⟳</Text>
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
  board: {
    backgroundColor: 'rgba(5, 12, 14, 0.94)',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 245, 212, 0.45)',
    position: 'relative',
    overflow: 'hidden',
  },
  foodDot: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  snakeSeg: {
    position: 'absolute',
    borderRadius: 5,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 4, 14, 0.86)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  overTitle: {
    fontSize: 24,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.danger,
  },
  retryBtn: {
    backgroundColor: COLORS.matrixMint,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
  },
  retryText: {
    fontSize: 12.5,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#030308',
  },
  tapZonesRow: {
    flex: 1,
    flexDirection: 'row',
  },
  tapZoneHalf: {
    flex: 1,
    height: '100%',
  },
  steeringRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
  },
  steeringPedal: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 10,
    backgroundColor: 'rgba(8, 16, 24, 0.85)',
  },
  steeringPedalLeft: {
    borderColor: 'rgba(0, 245, 212, 0.45)',
    shadowColor: COLORS.matrixMint,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 3,
  },
  steeringPedalRight: {
    borderColor: 'rgba(0, 245, 255, 0.45)',
    shadowColor: COLORS.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 3,
  },
  steeringTextWrap: {
    flexDirection: 'column',
  },
  steeringPedalTitle: {
    fontFamily: monoFont,
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.matrixMint,
    letterSpacing: 1.2,
  },
  steeringPedalSub: {
    fontFamily: monoFont,
    fontSize: 8.5,
    fontWeight: '800',
    color: '#8A8F9E',
    letterSpacing: 0.8,
    marginTop: 1,
  },
  steeringPedalIcon: {
    fontSize: 22,
    color: COLORS.matrixMint,
    fontWeight: '900',
  },
  speedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 7, 16, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    zIndex: 20,
  },
  speedTitle: {
    fontSize: 16,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  speedSub: {
    fontSize: 9.5,
    fontFamily: monoFont,
    fontWeight: '800',
    color: '#6A7684',
    letterSpacing: 0.8,
    marginTop: 2,
    marginBottom: 16,
  },
  speedPillsContainer: {
    width: '100%',
    gap: 8,
    marginBottom: 18,
  },
  speedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  speedPillText: {
    fontFamily: monoFont,
    fontSize: 12.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  speedPillMs: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '800',
  },
  launchBtn: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00F5D4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  launchBtnText: {
    fontSize: 13.5,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#030308',
    letterSpacing: 1,
  },
});
