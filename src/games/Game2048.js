import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { ZoomIn, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../../styles';
import MiniGameHeader from '../components/MiniGameHeader';
import JuiceEngine from '../components/JuiceEngine';
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
  playGameOverSound,
} from '../utils/sound';

const STORAGE_KEY = '@game_tower:best_2048_v1';
const GRID_SIZE = 4;

const TILE_THEMES = {
  0: { colors: ['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.02)'], border: 'rgba(0, 245, 255, 0.12)', text: 'transparent' },
  2: { colors: ['#0B2545', '#134074'], border: '#00F5FF', text: '#E0FFFF' },
  4: { colors: ['#005F73', '#0A9396'], border: '#00F5D4', text: '#FFFFFF' },
  8: { colors: ['#3A0CA3', '#4361EE'], border: '#72EFDD', text: '#FFFFFF' },
  16: { colors: ['#5A189A', '#7209B7'], border: '#C77DFF', text: '#FFFFFF' },
  32: { colors: ['#7209B7', '#B5179E'], border: '#FF66D9', text: '#FFFFFF' },
  64: { colors: ['#B5179E', '#F72585'], border: '#FF007F', text: '#FFFFFF' },
  128: { colors: ['#D00000', '#FF2A55'], border: '#FF9E00', text: '#FFFFFF' },
  256: { colors: ['#E85D04', '#FF9E00'], border: '#FFD166', text: '#FFFFFF' },
  512: { colors: ['#F77F00', '#FFD166'], border: '#FFFFFF', text: '#05050C' },
  1024: { colors: ['#06D6A0', '#00F5D4'], border: '#FFFFFF', text: '#05050C' },
  2048: { colors: ['#00F5FF', '#FF007F'], border: '#FFD166', text: '#FFFFFF' },
};

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const createEmptyGrid = () =>
  Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));

const cloneGrid = (g) => g.map((row) => [...row]);

const addRandomTile = (grid) => {
  const empty = [];
  for (let r = 0; r < GRID_SIZE; r += 1) {
    for (let c = 0; c < GRID_SIZE; c += 1) {
      if (grid[r][c] === 0) empty.push([r, c]);
    }
  }
  if (empty.length === 0) return grid;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const next = cloneGrid(grid);
  next[r][c] = Math.random() < 0.88 ? 2 : 4;
  return next;
};

const slideAndMergeRow = (row) => {
  const nonZero = row.filter((v) => v !== 0);
  const merged = [];
  let gainedScore = 0;
  let maxMerged = 0;

  let i = 0;
  while (i < nonZero.length) {
    if (i + 1 < nonZero.length && nonZero[i] === nonZero[i + 1]) {
      const val = nonZero[i] * 2;
      merged.push(val);
      gainedScore += val;
      if (val > maxMerged) maxMerged = val;
      i += 2;
    } else {
      merged.push(nonZero[i]);
      i += 1;
    }
  }
  while (merged.length < GRID_SIZE) {
    merged.push(0);
  }
  return { row: merged, gainedScore, maxMerged };
};

const canAnyMove = (grid) => {
  for (let r = 0; r < GRID_SIZE; r += 1) {
    for (let c = 0; c < GRID_SIZE; c += 1) {
      if (grid[r][c] === 0) return true;
      if (c + 1 < GRID_SIZE && grid[r][c] === grid[r][c + 1]) return true;
      if (r + 1 < GRID_SIZE && grid[r][c] === grid[r + 1][c]) return true;
    }
  }
  return false;
};

export default function Game2048({ onBackToHub, onScoreUpdate }) {
  const { width } = useWindowDimensions();
  const boardWidth = Math.min(360, width - 32);
  const cellSize = Math.floor((boardWidth - 40) / 4);
  const juiceRef = useRef(null);

  const [grid, setGrid] = useState(() =>
    addRandomTile(addRandomTile(createEmptyGrid()))
  );
  const [prevSnapshot, setPrevSnapshot] = useState(null);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [maxTile, setMaxTile] = useState(2);
  const [isGameOver, setIsGameOver] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) setBestScore(parseInt(saved, 10) || 0);
      } catch {}
    })();
  }, []);

  const saveBest = useCallback(
    async (newScore) => {
      if (onScoreUpdate) onScoreUpdate(newScore);
      if (newScore > bestScore) {
        setBestScore(newScore);
        try {
          await AsyncStorage.setItem(STORAGE_KEY, String(newScore));
        } catch {}
      }
    },
    [bestScore, onScoreUpdate]
  );

  const startNewGame = useCallback(() => {
    const fresh = addRandomTile(addRandomTile(createEmptyGrid()));
    setGrid(fresh);
    setPrevSnapshot(null);
    setScore(0);
    setMaxTile(2);
    setIsGameOver(false);
    if (juiceRef.current) {
      juiceRef.current.flash(COLORS.cyan);
    }
  }, []);

  const performMove = useCallback(
    (direction) => {
      if (isGameOver) return;

      let working = cloneGrid(grid);
      let totalGained = 0;
      let highestMerge = 0;

      const rotateRight = (m) =>
        m[0].map((_, index) => m.map((row) => row[index]).reverse());
      const rotateLeft = (m) =>
        m[0].map((_, index) => m.map((row) => row[row.length - 1 - index]));

      if (direction === 'RIGHT') {
        working = working.map((r) => [...r].reverse());
      } else if (direction === 'UP') {
        working = rotateLeft(working);
      } else if (direction === 'DOWN') {
        working = rotateRight(working);
      }

      const processed = working.map((row) => {
        const res = slideAndMergeRow(row);
        totalGained += res.gainedScore;
        if (res.maxMerged > highestMerge) highestMerge = res.maxMerged;
        return res.row;
      });

      let restored = processed;
      if (direction === 'RIGHT') {
        restored = processed.map((r) => [...r].reverse());
      } else if (direction === 'UP') {
        restored = rotateRight(processed);
      } else if (direction === 'DOWN') {
        restored = rotateLeft(processed);
      }

      const changed = JSON.stringify(grid) !== JSON.stringify(restored);
      if (!changed) return;

      setPrevSnapshot({ grid: cloneGrid(grid), score });

      const withRandom = addRandomTile(restored);
      const nextScore = score + totalGained;
      let currentMax = maxTile;
      for (let r = 0; r < GRID_SIZE; r += 1) {
        for (let c = 0; c < GRID_SIZE; c += 1) {
          if (withRandom[r][c] > currentMax) currentMax = withRandom[r][c];
        }
      }

      setGrid(withRandom);
      setScore(nextScore);
      setMaxTile(currentMax);
      saveBest(nextScore);

      if (highestMerge >= 64) {
        triggerPerfectHaptic(3);
        playPerfectSound(Math.min(8, Math.log2(highestMerge)));
        if (juiceRef.current) {
          juiceRef.current.celebrate(
            `${highestMerge} CORE!`,
            `+${totalGained} PTS`,
            COLORS.magenta
          );
        }
      } else if (totalGained > 0) {
        triggerSliceHaptic();
        playPerfectSound(2);
        if (juiceRef.current) {
          juiceRef.current.shake(5, 4);
          juiceRef.current.burst(undefined, undefined, COLORS.cyan, 14);
          juiceRef.current.popup(
            `+${totalGained}`,
            `MERGED ${highestMerge}`,
            COLORS.cyan
          );
        }
      } else {
        triggerLightHaptic();
        playTapSound();
      }

      if (!canAnyMove(withRandom)) {
        setIsGameOver(true);
        triggerGameOverHaptic();
        playGameOverSound();
        if (juiceRef.current) {
          juiceRef.current.shake(12, 9);
          juiceRef.current.flash(COLORS.danger);
        }
      }
    },
    [grid, isGameOver, score, maxTile, saveBest]
  );

  const handleUndo = useCallback(() => {
    if (!prevSnapshot) return;
    triggerLightHaptic();
    playSliceSound();
    setGrid(prevSnapshot.grid);
    setScore(prevSnapshot.score);
    setPrevSnapshot(null);
    setIsGameOver(false);
  }, [prevSnapshot]);

  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .minDistance(18)
    .onEnd((e) => {
      const dx = e.translationX;
      const dy = e.translationY;
      if (Math.abs(dx) > Math.abs(dy)) {
        performMove(dx > 0 ? 'RIGHT' : 'LEFT');
      } else {
        performMove(dy > 0 ? 'DOWN' : 'UP');
      }
    });

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={localStyles.container}>
        <LinearGradient
          colors={['#03030A', '#0A081C', '#180B30']}
          style={StyleSheet.absoluteFillObject}
        />

        <MiniGameHeader
          title="CYBER 2048"
          floorLabel="FLOOR 02 // MERGE PUZZLE"
          score={score}
          bestScore={bestScore}
          accentColor={COLORS.cyan}
          onBack={onBackToHub}
          onReset={startNewGame}
        />

        <View style={localStyles.body}>
          <View style={[localStyles.statusRow, { width: boardWidth }]}>
            <View style={localStyles.badgePill}>
              <Text style={localStyles.badgeLabel}>PEAK MODULE // </Text>
              <Text style={localStyles.badgeValue}>{maxTile}</Text>
            </View>

            <Pressable
              onPress={handleUndo}
              disabled={!prevSnapshot}
              style={({ pressed }) => [
                localStyles.undoBtn,
                !prevSnapshot && { opacity: 0.35 },
                pressed && { transform: [{ scale: 0.95 }] },
              ]}
            >
              <Text style={localStyles.undoText}>UNDO MOVE</Text>
            </Pressable>
          </View>

          <GestureDetector gesture={panGesture}>
            <View
              style={[
                localStyles.boardContainer,
                { width: boardWidth, height: boardWidth },
              ]}
            >
              {grid.map((row, rIdx) => (
                <View key={`row_${rIdx}`} style={localStyles.gridRow}>
                  {row.map((val, cIdx) => {
                    const theme = TILE_THEMES[val] || TILE_THEMES[2048];
                    return (
                      <View
                        key={`cell_${rIdx}_${cIdx}`}
                        style={[
                          localStyles.tileCell,
                          {
                            width: cellSize,
                            height: cellSize,
                            borderColor: theme.border,
                          },
                        ]}
                      >
                        <LinearGradient
                          colors={theme.colors}
                          style={StyleSheet.absoluteFillObject}
                        />
                        {val > 0 && (
                          <Animated.View
                            entering={ZoomIn.duration(140)}
                            style={localStyles.tileInner}
                          >
                            <View
                              style={[
                                localStyles.tileTopBevel,
                                { backgroundColor: theme.border },
                              ]}
                            />
                            <Text
                              style={[
                                localStyles.tileText,
                                {
                                  color: theme.text,
                                  fontSize:
                                    val >= 1024 ? 19 : val >= 128 ? 22 : 26,
                                },
                              ]}
                            >
                              {val}
                            </Text>
                          </Animated.View>
                        )}
                      </View>
                    );
                  })}
                </View>
              ))}

              {isGameOver && (
                <Animated.View
                  entering={FadeIn.duration(220)}
                  style={localStyles.gameOverOverlay}
                >
                  <Text style={localStyles.gameOverTitle}>GRID LOCKED</Text>
                  <Text style={localStyles.gameOverSub}>
                    {`FINAL SCORE: ${score} // MAX TILE: ${maxTile}`}
                  </Text>
                  <Pressable
                    onPress={startNewGame}
                    style={localStyles.playAgainBtn}
                  >
                    <Text style={localStyles.playAgainText}>REBOOT GRID</Text>
                  </Pressable>
                </Animated.View>
              )}
            </View>
          </GestureDetector>

          <Text style={localStyles.hintText}>
            SWIPE ANYWHERE ON GRID OR TAP DIRECTIONAL CONTROLS
          </Text>

          <View style={localStyles.dpadContainer}>
            <Pressable
              onPress={() => performMove('UP')}
              style={({ pressed }) => [
                localStyles.dpadBtn,
                pressed && localStyles.dpadPressed,
              ]}
            >
              <Text style={localStyles.dpadArrow}>▲</Text>
            </Pressable>
            <View style={localStyles.dpadMidRow}>
              <Pressable
                onPress={() => performMove('LEFT')}
                style={({ pressed }) => [
                  localStyles.dpadBtn,
                  pressed && localStyles.dpadPressed,
                ]}
              >
                <Text style={localStyles.dpadArrow}>◀</Text>
              </Pressable>
              <Pressable
                onPress={() => performMove('DOWN')}
                style={({ pressed }) => [
                  localStyles.dpadBtn,
                  pressed && localStyles.dpadPressed,
                ]}
              >
                <Text style={localStyles.dpadArrow}>▼</Text>
              </Pressable>
              <Pressable
                onPress={() => performMove('RIGHT')}
                style={({ pressed }) => [
                  localStyles.dpadBtn,
                  pressed && localStyles.dpadPressed,
                ]}
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
    paddingBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.35)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeLabel: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  badgeValue: {
    fontSize: 14,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.cyan,
  },
  undoBtn: {
    backgroundColor: 'rgba(255, 0, 127, 0.16)',
    borderWidth: 1,
    borderColor: COLORS.magenta,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  undoText: {
    fontSize: 10.5,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#FF75B5',
    letterSpacing: 1,
  },
  boardContainer: {
    backgroundColor: 'rgba(8, 8, 22, 0.92)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 245, 255, 0.35)',
    padding: 8,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tileCell: {
    borderRadius: 12,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tileInner: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTopBevel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.85,
  },
  tileText: {
    fontFamily: monoFont,
    fontWeight: '900',
  },
  hintText: {
    fontSize: 9.5,
    fontFamily: monoFont,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginTop: 14,
    marginBottom: 10,
  },
  dpadContainer: {
    alignItems: 'center',
    gap: 6,
  },
  dpadMidRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dpadBtn: {
    width: 58,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 245, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadPressed: {
    backgroundColor: 'rgba(0, 245, 255, 0.3)',
    transform: [{ scale: 0.94 }],
  },
  dpadArrow: {
    fontSize: 16,
    color: COLORS.cyan,
    fontWeight: '900',
  },
  gameOverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 4, 14, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  gameOverTitle: {
    fontSize: 28,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.magenta,
    letterSpacing: 2,
  },
  gameOverSub: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginVertical: 12,
  },
  playAgainBtn: {
    backgroundColor: COLORS.cyan,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 6,
  },
  playAgainText: {
    fontSize: 13,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#030308',
    letterSpacing: 1.5,
  },
});
