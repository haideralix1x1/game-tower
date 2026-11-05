import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  useWindowDimensions,
  PanResponder,
} from 'react-native';
import Animated, { ZoomIn, FadeIn } from 'react-native-reanimated';
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
  playGameOverSound,
} from '../utils/sound';

const STORAGE_KEY = '@game_tower:best_2048_drop_v1';
const COLS = 5;
const ROWS = 7;

const TILE_THEMES = {
  0: { bg: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.01)'], border: 'rgba(255, 255, 255, 0.08)', text: 'transparent' },
  2: { bg: ['#0077B6', '#0096C7'], border: '#00F5FF', text: '#FFFFFF' },
  4: { bg: ['#008080', '#0A9396'], border: '#00F5D4', text: '#FFFFFF' },
  8: { bg: ['#4361EE', '#3A0CA3'], border: '#72EFDD', text: '#FFFFFF' },
  16: { bg: ['#7209B7', '#560BAD'], border: '#C77DFF', text: '#FFFFFF' },
  32: { bg: ['#B5179E', '#7209B7'], border: '#FF66D9', text: '#FFFFFF' },
  64: { bg: ['#D00000', '#F72585'], border: '#FF007F', text: '#FFFFFF' },
  128: { bg: ['#E85D04', '#FF5E00'], border: '#FF9E00', text: '#FFFFFF' },
  256: { bg: ['#F77F00', '#FFD166'], border: '#FFD166', text: '#05050C' },
  512: { bg: ['#06D6A0', '#00F5D4'], border: '#FFFFFF', text: '#05050C' },
  1024: { bg: ['#00F5FF', '#00B4D8'], border: '#FFFFFF', text: '#05050C' },
  2048: { bg: ['#FF007F', '#FFD166'], border: '#FFFFFF', text: '#05050C' },
  4096: { bg: ['#7928CA', '#FF007F'], border: '#00F5FF', text: '#FFFFFF' },
  8192: { bg: ['#00F5FF', '#7928CA'], border: '#FFD166', text: '#FFFFFF' },
};

const getTileTheme = (val) => {
  if (TILE_THEMES[val]) return TILE_THEMES[val];
  return { bg: ['#FF0055', '#7928CA'], border: '#00F5FF', text: '#FFFFFF' };
};

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const createEmptyGrid = () =>
  Array.from({ length: ROWS }, () => Array(COLS).fill(0));

const pickSpawnValue = (highestTile = 2) => {
  const pool = [2, 2, 2, 4, 4, 8];
  if (highestTile >= 64) pool.push(8, 16);
  if (highestTile >= 256) pool.push(16, 32);
  if (highestTile >= 1024) pool.push(32, 64);
  return pool[Math.floor(Math.random() * pool.length)];
};

export default function Game2048({ onBackToHub, onScoreUpdate }) {
  const { width } = useWindowDimensions();
  const boardWidth = Math.min(360, width - 24);
  const cellWidth = Math.floor((boardWidth - 16) / COLS);
  const cellHeight = Math.floor(cellWidth * 1.05);
  const boardHeight = cellHeight * ROWS + 16;

  const juiceRef = useRef(null);

  const [grid, setGrid] = useState(() => createEmptyGrid());
  const [aimCol, setAimCol] = useState(2);
  const [currentVal, setCurrentVal] = useState(2);
  const [nextVal, setNextVal] = useState(4);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [maxTile, setMaxTile] = useState(2);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isDropping, setIsDropping] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = parseInt(saved, 10) || 0;
          setBestScore(parsed);
        }
      } catch {}
    })();
  }, []);

  const saveBest = useCallback(
    async (nextScore) => {
      if (onScoreUpdate) onScoreUpdate(nextScore);
      if (nextScore > bestScore) {
        setBestScore(nextScore);
        try {
          await AsyncStorage.setItem(STORAGE_KEY, String(nextScore));
        } catch {}
      }
    },
    [bestScore, onScoreUpdate]
  );

  const startNewGame = useCallback(() => {
    setGrid(createEmptyGrid());
    setScore(0);
    setMaxTile(2);
    setAimCol(2);
    setCurrentVal(pickSpawnValue(2));
    setNextVal(pickSpawnValue(2));
    setIsGameOver(false);
    setIsDropping(false);
    if (juiceRef.current) juiceRef.current.flash(COLORS.cyan);
  }, []);

  // Calculate lowest empty row in aimed column
  const getLowestEmptyRow = (g, col) => {
    for (let r = ROWS - 1; r >= 0; r -= 1) {
      if (g[r][col] === 0) return r;
    }
    return -1;
  };

  // Process merges and gravity cascade across all 4 directions (left, right, up, down)
  const processCascade = (startGrid) => {
    let current = startGrid.map((row) => [...row]);
    let totalGained = 0;
    let highestMerged = 0;
    let comboChain = 0;
    let keepMerging = true;

    while (keepMerging) {
      keepMerging = false;

      // 1. Gravity: drop blocks down in each column to fill holes
      for (let c = 0; c < COLS; c += 1) {
        let writeRow = ROWS - 1;
        for (let r = ROWS - 1; r >= 0; r -= 1) {
          if (current[r][c] !== 0) {
            if (writeRow !== r) {
              current[writeRow][c] = current[r][c];
              current[r][c] = 0;
            }
            writeRow -= 1;
          }
        }
      }

      // 2. Scan for adjacent matching blocks in all 4 directions (Left, Right, Bottom, Top)
      let foundMerge = false;
      for (let r = ROWS - 1; r >= 0; r -= 1) {
        for (let c = 0; c < COLS; c += 1) {
          const val = current[r][c];
          if (val === 0) continue;

          // Check orthogonal neighbors
          const neighbors = [
            [r + 1, c], // Bottom
            [r, c - 1], // Left
            [r, c + 1], // Right
            [r - 1, c], // Top
          ];

          const matchingNeighbors = [];
          for (const [nr, nc] of neighbors) {
            if (
              nr >= 0 &&
              nr < ROWS &&
              nc >= 0 &&
              nc < COLS &&
              current[nr][nc] === val
            ) {
              matchingNeighbors.push([nr, nc]);
            }
          }

          if (matchingNeighbors.length > 0) {
            // Merge matching neighbors into (r, c)
            comboChain += 1;
            const multiplier = Math.pow(2, matchingNeighbors.length);
            const newVal = val * multiplier;
            current[r][c] = newVal;

            for (const [mr, mc] of matchingNeighbors) {
              current[mr][mc] = 0;
            }

            const stepPoints = newVal * (comboChain > 1 ? comboChain : 1);
            totalGained += stepPoints;
            if (newVal > highestMerged) highestMerged = newVal;

            foundMerge = true;
            keepMerging = true;
            break; // Break inner loop to apply gravity and chain reaction
          }
        }
        if (foundMerge) break;
      }
    }

    return {
      finalGrid: current,
      scoreGained: totalGained,
      maxTile: highestMerged,
      combos: comboChain,
    };
  };

  // Perform drop of current box into selected column
  const dropBox = useCallback(
    (targetCol) => {
      if (isGameOver || isDropping) return;

      const col = typeof targetCol === 'number' ? targetCol : aimCol;
      const targetRow = getLowestEmptyRow(grid, col);

      // If column is completely full to the top -> check if game over
      if (targetRow === -1) {
        triggerSliceHaptic();
        if (juiceRef.current) {
          juiceRef.current.shake(6, 4);
          juiceRef.current.popup('COLUMN FULL', 'CHOOSE ANOTHER', COLORS.danger);
        }

        // Check if all columns are full
        const allFull = grid[0].every((v) => v !== 0);
        if (allFull) {
          setIsGameOver(true);
          triggerGameOverHaptic();
          playGameOverSound();
          if (juiceRef.current) {
            juiceRef.current.shake(14, 10);
            juiceRef.current.flash(COLORS.danger);
          }
        }
        return;
      }

      setIsDropping(true);
      triggerLightHaptic();
      playTapSound();

      // Place block at target position
      const initialPlaced = grid.map((row) => [...row]);
      initialPlaced[targetRow][col] = currentVal;
      setGrid(initialPlaced);

      setTimeout(() => {
        // Run full merge & gravity cascade
        const { finalGrid, scoreGained, maxTile: highestMerged, combos } =
          processCascade(initialPlaced);

        setGrid(finalGrid);
        setIsDropping(false);

        const nextScore = score + scoreGained;
        setScore(nextScore);
        saveBest(nextScore);

        let newMax = Math.max(maxTile, highestMerged, currentVal);
        setMaxTile(newMax);

        // Feedback & Celebrations
        if (highestMerged >= 2048) {
          triggerPerfectHaptic(4);
          playPerfectSound(8);
          if (juiceRef.current) {
            juiceRef.current.celebrate(
              '2048 TRANSCENDENCE!',
              `+${scoreGained} PTS // QUANTUM CORE`,
              COLORS.solarGold
            );
          }
        } else if (highestMerged >= 64 || combos >= 2) {
          triggerPerfectHaptic(combos);
          playPerfectSound(Math.min(8, combos + 3));
          if (juiceRef.current) {
            juiceRef.current.celebrate(
              combos >= 2 ? `${combos}X CHAIN MERGE!` : `${highestMerged} MERGED!`,
              `+${scoreGained} PTS`,
              COLORS.cyan
            );
          }
        } else if (scoreGained > 0) {
          triggerSliceHaptic();
          playSliceSound();
          if (juiceRef.current) {
            juiceRef.current.shake(4, 3);
            juiceRef.current.burst(undefined, undefined, COLORS.cyan, 12);
          }
        }

        // Advance Next Drop Block
        setCurrentVal(nextVal);
        setNextVal(pickSpawnValue(newMax));

        // Check Game Over condition: all top row cells filled and no adjacent merges exist
        const topRowFull = finalGrid[0].every((v) => v !== 0);
        if (topRowFull) {
          // Check if any move is possible in the full grid
          let anyPossible = false;
          for (let r = 0; r < ROWS; r += 1) {
            for (let c = 0; c < COLS; c += 1) {
              const val = finalGrid[r][c];
              if (
                (r + 1 < ROWS && finalGrid[r + 1][c] === val) ||
                (c + 1 < COLS && finalGrid[r][c + 1] === val)
              ) {
                anyPossible = true;
                break;
              }
            }
            if (anyPossible) break;
          }

          if (!anyPossible) {
            setIsGameOver(true);
            triggerGameOverHaptic();
            playGameOverSound();
            if (juiceRef.current) {
              juiceRef.current.shake(14, 10);
              juiceRef.current.flash(COLORS.danger);
            }
          }
        }
      }, 90);
    },
    [isGameOver, isDropping, aimCol, grid, currentVal, nextVal, score, maxTile, saveBest]
  );

  // PanResponder to drag aimCol across columns
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt) => {
        const touchX = evt.nativeEvent.locationX;
        const col = Math.max(0, Math.min(COLS - 1, Math.floor(touchX / cellWidth)));
        setAimCol(col);
      },
      onPanResponderRelease: (evt) => {
        const touchX = evt.nativeEvent.locationX;
        const col = Math.max(0, Math.min(COLS - 1, Math.floor(touchX / cellWidth)));
        setAimCol(col);
        dropBox(col);
      },
    })
  ).current;

  // Ghost landing indicator row for aimed column
  const landingRow = getLowestEmptyRow(grid, aimCol);

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={localStyles.container}>
        <LinearGradient
          colors={['#03030A', '#080E24', '#15143A']}
          style={StyleSheet.absoluteFillObject}
        />

        <MiniGameHeader
          title="DROP 2048 NEO"
          floorLabel="FLOOR 02 // VERTICAL MERGE"
          score={score}
          bestScore={bestScore}
          accentColor={COLORS.cyan}
          onBack={onBackToHub}
          onReset={startNewGame}
        />

        <View style={localStyles.body}>
          {/* Top Drop Launcher HUD */}
          <View style={[localStyles.launcherHud, { width: boardWidth }]}>
            <View style={localStyles.launcherInfoBox}>
              <Text style={localStyles.launcherLabel}>AIMING BOX</Text>
              <View
                style={[
                  localStyles.previewTile,
                  {
                    backgroundColor: getTileTheme(currentVal).bg[0],
                    borderColor: getTileTheme(currentVal).border,
                  },
                ]}
              >
                <Text
                  style={[
                    localStyles.previewTileText,
                    { color: getTileTheme(currentVal).text },
                  ]}
                >
                  {currentVal}
                </Text>
              </View>
            </View>

            <View style={localStyles.launcherDivider} />

            <View style={localStyles.launcherInfoBox}>
              <Text style={localStyles.launcherLabel}>NEXT BOX</Text>
              <View
                style={[
                  localStyles.previewTileSmall,
                  {
                    backgroundColor: getTileTheme(nextVal).bg[0],
                    borderColor: getTileTheme(nextVal).border,
                  },
                ]}
              >
                <Text
                  style={[
                    localStyles.previewTileSmallText,
                    { color: getTileTheme(nextVal).text },
                  ]}
                >
                  {nextVal}
                </Text>
              </View>
            </View>

            <View style={localStyles.launcherDivider} />

            <View style={localStyles.launcherInfoBox}>
              <Text style={localStyles.launcherLabel}>PEAK TILE</Text>
              <Text style={localStyles.maxTileText}>{maxTile}</Text>
            </View>
          </View>

          {/* Interactive Drop Board Container */}
          <View
            {...panResponder.panHandlers}
            style={[
              localStyles.board,
              { width: boardWidth, height: boardHeight },
            ]}
          >
            {/* Aiming Beam Column Glow */}
            <View
              pointerEvents="none"
              style={[
                localStyles.aimBeam,
                {
                  left: 8 + aimCol * cellWidth,
                  width: cellWidth,
                  height: boardHeight - 16,
                },
              ]}
            />

            {/* Matrix Grid of Blocks */}
            {grid.map((row, rIdx) => (
              <View key={`row_${rIdx}`} style={localStyles.row}>
                {row.map((val, cIdx) => {
                  const theme = getTileTheme(val);
                  const isGhostTarget =
                    val === 0 && rIdx === landingRow && cIdx === aimCol;

                  return (
                    <Pressable
                      key={`cell_${rIdx}_${cIdx}`}
                      onPress={() => dropBox(cIdx)}
                      style={[
                        localStyles.cell,
                        {
                          width: cellWidth,
                          height: cellHeight,
                          borderColor: isGhostTarget
                            ? getTileTheme(currentVal).border
                            : theme.border,
                          borderStyle: isGhostTarget ? 'dashed' : 'solid',
                          borderWidth: isGhostTarget ? 2 : 1.2,
                          backgroundColor: isGhostTarget
                            ? 'rgba(0, 245, 255, 0.12)'
                            : theme.bg[0],
                        },
                      ]}
                    >
                      {val > 0 ? (
                        <Text
                          style={[
                            localStyles.tileNumber,
                            {
                              color: theme.text,
                              fontSize:
                                val >= 1024 ? 13 : val >= 128 ? 15 : 18,
                            },
                          ]}
                        >
                          {val}
                        </Text>
                      ) : isGhostTarget ? (
                        <Text style={localStyles.ghostText}>▼</Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ))}

            {/* Game Over Modal */}
            <GameResultModal
              visible={isGameOver}
              type="GAME_OVER"
              title="BOARD FULL // GAME OVER"
              subtitle={`MAX TILE MERGED: ${maxTile} // COLUMNS OVERFLOWED`}
              score={score}
              bestScore={bestScore}
              accentColor={COLORS.magenta}
              onRetry={startNewGame}
              retryLabel="PLAY AGAIN"
              onBackToHub={onBackToHub}
            />
          </View>

          {/* Quick Column Selection & Fast Drop Buttons */}
          <View style={[localStyles.bottomControls, { width: boardWidth }]}>
            <View style={localStyles.columnSelectorRow}>
              {[0, 1, 2, 3, 4].map((c) => {
                const isSelected = aimCol === c;
                return (
                  <Pressable
                    key={`col_btn_${c}`}
                    onPress={() => {
                      setAimCol(c);
                      dropBox(c);
                    }}
                    style={[
                      localStyles.colBtn,
                      { width: cellWidth - 4 },
                      isSelected && localStyles.colBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        localStyles.colBtnText,
                        isSelected && { color: COLORS.cyan, fontWeight: '900' },
                      ]}
                    >
                      {`COL ${c + 1}`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => dropBox(aimCol)}
              style={({ pressed }) => [
                localStyles.dropActionBtn,
                pressed && { transform: [{ scale: 0.96 }], opacity: 0.85 },
              ]}
            >
              <Text style={localStyles.dropActionText}>
                DROP INTO COLUMN {aimCol + 1} ▾
              </Text>
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
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  launcherHud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(8, 12, 28, 0.92)',
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: 'rgba(0, 245, 255, 0.35)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 6,
  },
  launcherInfoBox: {
    alignItems: 'center',
  },
  launcherLabel: {
    fontSize: 8,
    fontFamily: monoFont,
    fontWeight: '800',
    color: COLORS.textSecondary,
    marginBottom: 4,
    letterSpacing: 0.8,
  },
  launcherDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  previewTile: {
    width: 44,
    height: 34,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTileText: {
    fontFamily: monoFont,
    fontSize: 15,
    fontWeight: '900',
  },
  previewTileSmall: {
    width: 36,
    height: 28,
    borderRadius: 6,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTileSmallText: {
    fontFamily: monoFont,
    fontSize: 12,
    fontWeight: '900',
  },
  maxTileText: {
    fontFamily: monoFont,
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.solarGold,
  },
  board: {
    backgroundColor: 'rgba(6, 8, 20, 0.96)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 245, 255, 0.38)',
    padding: 8,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  aimBeam: {
    position: 'absolute',
    top: 8,
    backgroundColor: 'rgba(0, 245, 255, 0.08)',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.22)',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cell: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileNumber: {
    fontFamily: monoFont,
    fontWeight: '900',
  },
  ghostText: {
    fontSize: 12,
    color: 'rgba(0, 245, 255, 0.65)',
  },
  bottomControls: {
    marginTop: 6,
    alignItems: 'center',
  },
  columnSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 6,
  },
  colBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    backgroundColor: 'rgba(10, 16, 36, 0.85)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  colBtnActive: {
    borderColor: COLORS.cyan,
    backgroundColor: 'rgba(0, 245, 255, 0.22)',
  },
  colBtnText: {
    fontSize: 9,
    fontFamily: monoFont,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  dropActionBtn: {
    width: '100%',
    backgroundColor: COLORS.cyan,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropActionText: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#030208',
    letterSpacing: 1.1,
  },
});
