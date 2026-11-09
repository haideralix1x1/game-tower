import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../../styles';
import MiniGameHeader from '../components/MiniGameHeader';
import JuiceEngine from '../components/JuiceEngine';
import GameResultModal from '../components/GameResultModal';
import {
  triggerLightHaptic,
  triggerMediumHaptic,
  triggerPerfectHaptic,
} from '../utils/haptics';
import {
  playTapSound,
  playPerfectSound,
} from '../utils/sound';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

// Difficulty Modes Definition: Easy (15), Medium (30), Hard (45)
export const SLIDE_MODES = {
  EASY: {
    id: 'EASY',
    title: 'SLIDE 15',
    badge: '15-PUZZLE // EASY',
    storageKey: '@game_tower:best_slide15_v1',
    rows: 4,
    cols: 4, // 15 tiles (1..15) + 1 blank
    totalTiles: 15,
    parMoves: 45,
    baseBonus: 300,
    accent: COLORS.matrixMint,
    tag: 'EASY (15)',
    gridLabel: '4×4 (15 TILES)',
  },
  MEDIUM: {
    id: 'MEDIUM',
    title: 'SLIDE 30',
    badge: '30-PUZZLE // MEDIUM',
    storageKey: '@game_tower:best_slide30_v1',
    rows: 6,
    cols: 5, // 29 tiles (1..29) + 1 blank = 30 cells
    totalTiles: 29,
    parMoves: 85,
    baseBonus: 600,
    accent: COLORS.solarGold,
    tag: 'MED (30)',
    gridLabel: '6×5 (30 CELLS)',
  },
  HARD: {
    id: 'HARD',
    title: 'SLIDE 45',
    badge: '45-PUZZLE // HARD',
    storageKey: '@game_tower:best_slide45_v1',
    rows: 9,
    cols: 5, // 44 tiles (1..44) + 1 blank = 45 cells
    totalTiles: 44,
    parMoves: 140,
    baseBonus: 1000,
    accent: '#FF007F',
    tag: 'HARD (45)',
    gridLabel: '9×5 (45 CELLS)',
  },
};

/**
 * Counts how many tiles are already in their solved home position (index i has value i + 1).
 */
const countAligned = (tiles) => {
  let count = 0;
  for (let i = 0; i < tiles.length - 1; i += 1) {
    if (tiles[i] === i + 1) count += 1;
  }
  return count;
};

/**
 * Generates an inherently solvable sliding puzzle board with ZERO tiles in their
 * home position at game start (no already aligned numbers in any mode).
 */
const generateSolvableBoard = (rows = 4, cols = 4) => {
  const total = rows * cols;
  let bestTiles = null;
  let minAligned = Infinity;

  // Search for a permutation where ZERO numbers are in their starting/home position
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const tiles = Array.from({ length: total }, (_, i) => (i === total - 1 ? 0 : i + 1));
    let emptyIdx = total - 1;
    let prevPick = -1;

    // Substantial number of non-backtracking shuffle moves
    const steps = Math.max(180, total * 12);
    for (let i = 0; i < steps; i += 1) {
      const r = Math.floor(emptyIdx / cols);
      const c = emptyIdx % cols;
      const neighbors = [];
      if (r > 0) neighbors.push((r - 1) * cols + c);
      if (r < rows - 1) neighbors.push((r + 1) * cols + c);
      if (c > 0) neighbors.push(r * cols + (c - 1));
      if (c < cols - 1) neighbors.push(r * cols + (c + 1));

      // Avoid immediately undoing the previous slide
      const nonBacktracking = neighbors.filter((n) => n !== prevPick);
      const candidates = nonBacktracking.length > 0 ? nonBacktracking : neighbors;
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      prevPick = emptyIdx;

      [tiles[emptyIdx], tiles[pick]] = [tiles[pick], tiles[emptyIdx]];
      emptyIdx = pick;
    }

    const aligned = countAligned(tiles);
    if (aligned === 0) {
      return tiles; // Guaranteed: ZERO numbers already aligned!
    }

    if (aligned < minAligned) {
      minAligned = aligned;
      bestTiles = [...tiles];
    }
  }

  return bestTiles;
};

/**
 * Checks whether all numbered tiles are in strict ascending order (1..N-1)
 * with the empty blank slot (0) at the very bottom-right.
 */
const isSolved = (tiles) => {
  const total = tiles.length;
  for (let i = 0; i < total - 1; i += 1) {
    if (tiles[i] !== i + 1) return false;
  }
  return tiles[total - 1] === 0;
};

export default function SlidingPuzzleGame({ onBackToHub, onScoreUpdate }) {
  const { width, height } = useWindowDimensions();
  const juiceRef = useRef(null);

  const [currentMode, setCurrentMode] = useState('EASY');
  const modeConfig = SLIDE_MODES[currentMode] || SLIDE_MODES.EASY;

  // Grid dimensions automatically determined by the selected mode
  const rows = modeConfig.rows;
  const cols = modeConfig.cols;
  const totalTilesCount = modeConfig.totalTiles;

  const [tiles, setTiles] = useState(() =>
    generateSolvableBoard(SLIDE_MODES.EASY.rows, SLIDE_MODES.EASY.cols)
  );
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [bestScores, setBestScores] = useState({
    EASY: 0,
    MEDIUM: 0,
    HARD: 0,
  });
  const [won, setWon] = useState(false);

  // Load high scores for all 3 modes
  useEffect(() => {
    (async () => {
      try {
        const [easySaved, medSaved, hardSaved] = await Promise.all([
          AsyncStorage.getItem(SLIDE_MODES.EASY.storageKey),
          AsyncStorage.getItem(SLIDE_MODES.MEDIUM.storageKey),
          AsyncStorage.getItem(SLIDE_MODES.HARD.storageKey),
        ]);
        setBestScores({
          EASY: parseInt(easySaved, 10) || 0,
          MEDIUM: parseInt(medSaved, 10) || 0,
          HARD: parseInt(hardSaved, 10) || 0,
        });
      } catch {}
    })();
  }, []);

  const currentBest = bestScores[currentMode] || 0;

  const updateBest = useCallback(
    async (nextScore) => {
      if (onScoreUpdate) onScoreUpdate(nextScore);
      if (nextScore > (bestScores[currentMode] || 0)) {
        setBestScores((prev) => ({ ...prev, [currentMode]: nextScore }));
        try {
          await AsyncStorage.setItem(modeConfig.storageKey, String(nextScore));
        } catch {}
      }
    },
    [bestScores, currentMode, modeConfig.storageKey, onScoreUpdate]
  );

  // Initialize or reset puzzle
  const handleReset = useCallback(() => {
    const nextTiles = generateSolvableBoard(rows, cols);
    setTiles(nextTiles);
    setMoves(0);
    setWon(false);
    if (juiceRef.current) juiceRef.current.flash(modeConfig.accent);
  }, [rows, cols, modeConfig.accent]);

  // Switch difficulty mode (SLIDE 15, SLIDE 30, SLIDE 45)
  const switchMode = useCallback(
    (newMode) => {
      if (newMode === currentMode) return;
      setCurrentMode(newMode);
      const newConfig = SLIDE_MODES[newMode];
      setTiles(generateSolvableBoard(newConfig.rows, newConfig.cols));
      setMoves(0);
      setWon(false);
      triggerMediumHaptic();
      playTapSound();
      if (juiceRef.current) juiceRef.current.flash(newConfig.accent);
    },
    [currentMode]
  );

  // Move tile on press
  const handleTilePress = useCallback(
    (idx) => {
      if (won || tiles[idx] === 0) return;
      const emptyIdx = tiles.indexOf(0);
      const r1 = Math.floor(idx / cols);
      const c1 = idx % cols;
      const r2 = Math.floor(emptyIdx / cols);
      const c2 = emptyIdx % cols;

      if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return;

      const movedVal = tiles[idx];
      const next = [...tiles];
      [next[idx], next[emptyIdx]] = [next[emptyIdx], next[idx]];
      const nextMoves = moves + 1;
      setTiles(next);
      setMoves(nextMoves);

      if (isSolved(next)) {
        const bonus = Math.max(
          150,
          modeConfig.baseBonus - Math.max(0, (nextMoves - modeConfig.parMoves) * 8)
        );
        const nextScore = score + bonus;
        setScore(nextScore);
        setWon(true);
        updateBest(nextScore);
        triggerPerfectHaptic(3);
        playPerfectSound(6);
        if (juiceRef.current) {
          juiceRef.current.celebrate(
            `${modeConfig.title} SOLVED!`,
            `+${bonus} PTS IN ${nextMoves} MOVES`,
            modeConfig.accent
          );
        }
      } else {
        triggerLightHaptic();
        playTapSound();
        if (movedVal === emptyIdx + 1 && juiceRef.current) {
          juiceRef.current.burst(undefined, undefined, COLORS.matrixMint, 8);
        }
      }
    },
    [won, tiles, cols, moves, modeConfig, score, updateBest]
  );

  // Tile dimensions dynamically fitted to screen
  const maxAvailableH = Math.max(340, height - 310);
  const maxAvailableW = Math.min(352, width - 28);
  const cellW = Math.floor((maxAvailableW - 20) / cols);
  const cellH = Math.floor((maxAvailableH - 20) / rows);
  const cellSize = Math.min(cellW, cellH);
  const actualBoardW = cellSize * cols + 16;
  const actualBoardH = cellSize * rows + 16;

  // Font sizing adjusted for larger grids
  const tileFontSize = useMemo(() => {
    if (cellSize > 68) return 24;
    if (cellSize > 50) return 18;
    return 13;
  }, [cellSize]);

  const correctCount = tiles.filter(
    (val, idx) => val !== 0 && val === idx + 1
  ).length;

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={localStyles.container}>
        <LinearGradient
          colors={['#03030A', '#0C0820', '#180B34']}
          style={StyleSheet.absoluteFillObject}
        />

        <MiniGameHeader
          title={modeConfig.title}
          floorLabel={`FLOOR 06 // ${modeConfig.badge}`}
          score={score}
          bestScore={currentBest}
          accentColor={modeConfig.accent}
          onBack={onBackToHub}
          onReset={handleReset}
        />

        <View style={localStyles.body}>
          {/* Difficulty Mode Switcher: SLIDE 15 (Easy), SLIDE 30 (Medium), SLIDE 45 (Hard) */}
          <View style={localStyles.modeTabBar}>
            {Object.keys(SLIDE_MODES).map((modeKey) => {
              const m = SLIDE_MODES[modeKey];
              const isSelected = currentMode === modeKey;
              return (
                <Pressable
                  key={modeKey}
                  onPress={() => switchMode(modeKey)}
                  style={[
                    localStyles.modeTab,
                    isSelected && {
                      backgroundColor: `${m.accent}26`,
                      borderColor: m.accent,
                      shadowColor: m.accent,
                      shadowOpacity: 0.6,
                      shadowRadius: 8,
                      elevation: 4,
                    },
                  ]}
                >
                  <Text
                    style={[
                      localStyles.modeTabText,
                      { color: isSelected ? m.accent : 'rgba(255, 255, 255, 0.45)' },
                    ]}
                  >
                    {m.title}
                  </Text>
                  <Text
                    style={[
                      localStyles.modeSubText,
                      { color: isSelected ? m.accent : 'rgba(255, 255, 255, 0.3)' },
                    ]}
                  >
                    {m.tag}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Sub-Telemetry Bar */}
          <View style={[localStyles.statusRow, { width: actualBoardW }]}>
            <View style={localStyles.statBadge}>
              <Text style={localStyles.statLabel}>ALIGNED</Text>
              <Text style={[localStyles.statVal, { color: modeConfig.accent }]}>
                {`${correctCount}/${totalTilesCount}`}
              </Text>
            </View>

            <View style={localStyles.gridInfoBadge}>
              <Text style={localStyles.gridInfoText}>
                {modeConfig.gridLabel}
              </Text>
            </View>

            <View style={localStyles.statBadge}>
              <Text style={localStyles.statLabel}>MOVES</Text>
              <Text style={[localStyles.statVal, { color: COLORS.cyan }]}>
                {moves}
              </Text>
            </View>
          </View>

          {/* Dynamic Puzzle Matrix Board */}
          <View
            style={[
              localStyles.board,
              {
                width: actualBoardW,
                height: actualBoardH,
                borderColor: `${modeConfig.accent}55`,
              },
            ]}
          >
            {tiles.map((num, idx) => {
              if (num === 0) {
                return (
                  <View
                    key={`empty_${idx}`}
                    style={{ width: cellSize, height: cellSize }}
                  />
                );
              }
              const inPlace = num === idx + 1;
              return (
                <Pressable
                  key={`tile_${num}`}
                  onPress={() => handleTilePress(idx)}
                  style={[
                    localStyles.tile,
                    {
                      width: cellSize - 2,
                      height: cellSize - 2,
                      margin: 1,
                      borderColor: inPlace
                        ? COLORS.matrixMint
                        : modeConfig.accent,
                      backgroundColor: inPlace
                        ? 'rgba(0, 245, 212, 0.22)'
                        : `${modeConfig.accent}1A`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      localStyles.tileNum,
                      {
                        fontSize: tileFontSize,
                        color: inPlace ? COLORS.matrixMint : '#FFFFFF',
                      },
                    ]}
                  >
                    {num}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <GameResultModal
            visible={won}
            type="VICTORY"
            title={`${modeConfig.title} SOLVED!`}
            subtitle={`${modeConfig.badge} ORDERED IN ${moves} MOVES`}
            score={score}
            bestScore={currentBest}
            accentColor={modeConfig.accent}
            onRetry={handleReset}
            retryLabel={`REPLAY ${modeConfig.title}`}
            onBackToHub={onBackToHub}
          />
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
  modeTabBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  modeTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(12, 10, 28, 0.85)',
    borderWidth: 1.4,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  modeTabText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  modeSubText: {
    fontSize: 7.5,
    fontFamily: monoFont,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(8, 8, 24, 0.75)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 70,
  },
  statLabel: {
    fontSize: 7.5,
    fontFamily: monoFont,
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.6,
  },
  statVal: {
    fontSize: 13,
    fontFamily: monoFont,
    fontWeight: '900',
  },
  gridInfoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  gridInfoText: {
    fontSize: 8.5,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#E0AAFF',
    letterSpacing: 0.6,
  },
  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignContent: 'center',
    backgroundColor: 'rgba(6, 6, 18, 0.95)',
    borderRadius: 18,
    borderWidth: 1.6,
    padding: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  tile: {
    borderRadius: 10,
    borderWidth: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileNum: {
    fontFamily: monoFont,
    fontWeight: '900',
    includeFontPadding: false,
  },
});
