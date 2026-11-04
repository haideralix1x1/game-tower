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

export default function CyberSnakeGame({ onBackToHub, onScoreUpdate }) {
  const { width } = useWindowDimensions();
  const boardSize = Math.min(360, width - 28);
  const cellSize = Math.floor((boardSize - 16) / GRID_COUNT);
  const juiceRef = useRef(null);

  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [status, setStatus] = useState('PLAYING');
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
    running: true,
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

  const resetGame = useCallback(() => {
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
      running: true,
    };
    setScore(0);
    setStatus('PLAYING');
    setRenderState({ snake: startSnake, food: startFood });
    if (juiceRef.current) juiceRef.current.flash(COLORS.matrixMint);
  }, []);

  const changeDirection = useCallback((dr, dc) => {
    const cur = engineRef.current.dir;
    if (cur.dr + dr === 0 && cur.dc + dc === 0) return;
    engineRef.current.nextDir = { dr, dc };
    triggerLightHaptic();
    playTapSound();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
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
    }, 125);

    return () => clearInterval(timer);
  }, [persistBest]);

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
          title="CYBER SNAKE"
          floorLabel="FLOOR 11 // NEON SERPENT"
          score={score}
          bestScore={bestScore}
          accentColor={COLORS.matrixMint}
          onBack={onBackToHub}
          onReset={resetGame}
        />

        <View style={localStyles.body}>
          <GestureDetector gesture={panGesture}>
            <View
              style={[
                localStyles.board,
                {
                  width: cellSize * GRID_COUNT + 16,
                  height: cellSize * GRID_COUNT + 16,
                },
              ]}
            >
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
                        idx === 0 ? '#FFFFFF' : COLORS.matrixMint,
                      opacity: Math.max(0.45, 1 - idx * 0.025),
                    },
                  ]}
                />
              ))}

              {status === 'GAME_OVER' && (
                <View style={localStyles.overlay}>
                  <Text style={localStyles.overTitle}>SERPENT CRASHED</Text>
                  <Pressable onPress={resetGame} style={localStyles.retryBtn}>
                    <Text style={localStyles.retryText}>PLAY AGAIN</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </GestureDetector>

          <View style={localStyles.dpadContainer}>
            <Pressable
              onPress={() => changeDirection(-1, 0)}
              style={localStyles.dpadBtn}
            >
              <Text style={localStyles.dpadArrow}>▲</Text>
            </Pressable>
            <View style={localStyles.dpadMid}>
              <Pressable
                onPress={() => changeDirection(0, -1)}
                style={localStyles.dpadBtn}
              >
                <Text style={localStyles.dpadArrow}>◀</Text>
              </Pressable>
              <Pressable
                onPress={() => changeDirection(1, 0)}
                style={localStyles.dpadBtn}
              >
                <Text style={localStyles.dpadArrow}>▼</Text>
              </Pressable>
              <Pressable
                onPress={() => changeDirection(0, 1)}
                style={localStyles.dpadBtn}
              >
                <Text style={localStyles.dpadArrow}>▶</Text>
              </Pressable>
            </View>
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
  dpadContainer: {
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  dpadMid: {
    flexDirection: 'row',
    gap: 10,
  },
  dpadBtn: {
    width: 64,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 245, 212, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 212, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadArrow: {
    fontSize: 17,
    color: COLORS.matrixMint,
    fontWeight: '900',
  },
});
