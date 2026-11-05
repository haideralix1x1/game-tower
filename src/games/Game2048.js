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

export default function Game2048({ onBackToHub, onScoreUpdate, isPaused = false }) {
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  const { width } = useWindowDimensions();
  const boardWidth = Math.min(360, width - 24);
  const cellWidth = Math.floor((boardWidth - 16) / COLS);
  const cellHeight = Math.floor(cellWidth * 1.05);
  const boardHeight = cellHeight * ROWS + 16;

  const juiceRef = useRef(null);

  const [grid, setGrid] = useState(() => createEmptyGrid());
  const [fallingCol, setFallingCol] = useState(2);
  const [fallingRow, setFallingRow] = useState(0);
  const [currentVal, setCurrentVal] = useState(2);
  const [nextVal, setNextVal] = useState(4);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [maxTile, setMaxTile] = useState(2);
  const [isGameOver, setIsGameOver] = useState(false);

  const gridRef = useRef(grid);
  gridRef.current = grid;
  const fallingColRef = useRef(fallingCol);
  fallingColRef.current = fallingCol;
  const fallingRowRef = useRef(fallingRow);
  fallingRowRef.current = fallingRow;
  const currentValRef = useRef(currentVal);
  currentValRef.current = currentVal;
  const nextValRef = useRef(nextVal);
  nextValRef.current = nextVal;
  const scoreRef = useRef(score);
  scoreRef.current = score;
  const maxTileRef = useRef(maxTile);
  maxTileRef.current = maxTile;
  const isLockingRef = useRef(false);
  const boardRef = useRef(null);
  const boardPosRef = useRef({ pageX: 0, width: boardWidth });
  const panStartRef = useRef({ startX: 0, startY: 0, startCol: 2, hasDropped: false });

  const updateBoardPosition = useCallback(() => {
    if (boardRef.current) {
      boardRef.current.measureInWindow((x, y, w, h) => {
        if (w > 0) {
          boardPosRef.current = { pageX: x, width: w };
        }
      });
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(updateBoardPosition, 250);
    return () => clearTimeout(t);
  }, [updateBoardPosition]);

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
    const emptyGrid = createEmptyGrid();
    setGrid(emptyGrid);
    gridRef.current = emptyGrid;
    setScore(0);
    scoreRef.current = 0;
    setMaxTile(2);
    maxTileRef.current = 2;
    setFallingCol(2);
    fallingColRef.current = 2;
    setFallingRow(0);
    fallingRowRef.current = 0;
    const initialVal = pickSpawnValue(2);
    const initialNext = pickSpawnValue(2);
    setCurrentVal(initialVal);
    currentValRef.current = initialVal;
    setNextVal(initialNext);
    nextValRef.current = initialNext;
    setIsGameOver(false);
    isLockingRef.current = false;
    if (juiceRef.current) juiceRef.current.flash(COLORS.cyan);
  }, []);

  // Calculate lowest empty row in column
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

  // Lock falling tile in target position and trigger merge cascade
  const lockFallingTile = useCallback(
    (targetRow, targetCol) => {
      if (isLockingRef.current || isGameOver) return;
      isLockingRef.current = true;

      triggerLightHaptic();
      playTapSound();

      // Place block at target position
      const val = currentValRef.current;
      const initialPlaced = gridRef.current.map((row) => [...row]);
      initialPlaced[targetRow][targetCol] = val;
      gridRef.current = initialPlaced;
      setGrid(initialPlaced);

      setTimeout(() => {
        // Run full merge & gravity cascade
        const { finalGrid, scoreGained, maxTile: highestMerged, combos } =
          processCascade(initialPlaced);

        gridRef.current = finalGrid;
        setGrid(finalGrid);

        const nextScore = scoreRef.current + scoreGained;
        scoreRef.current = nextScore;
        setScore(nextScore);
        saveBest(nextScore);

        let newMax = Math.max(maxTileRef.current, highestMerged, val);
        maxTileRef.current = newMax;
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

        // Advance to next tile
        const nextValToUse = nextValRef.current;
        const newUpcoming = pickSpawnValue(newMax);
        currentValRef.current = nextValToUse;
        setCurrentVal(nextValToUse);
        nextValRef.current = newUpcoming;
        setNextVal(newUpcoming);

        // Position new tile at top
        let nextSpawnCol = fallingColRef.current;
        if (finalGrid[0][nextSpawnCol] !== 0) {
          const availableCols = [2, 1, 3, 0, 4].filter((c) => finalGrid[0][c] === 0);
          if (availableCols.length === 0) {
            // Check if any move is possible in the full grid
            let anyPossible = false;
            for (let r = 0; r < ROWS; r += 1) {
              for (let c = 0; c < COLS; c += 1) {
                const v = finalGrid[r][c];
                if (
                  (r + 1 < ROWS && finalGrid[r + 1][c] === v) ||
                  (c + 1 < COLS && finalGrid[r][c + 1] === v)
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
              isLockingRef.current = false;
              return;
            }
            nextSpawnCol = 2;
          } else {
            nextSpawnCol = availableCols[0];
          }
        }

        fallingColRef.current = nextSpawnCol;
        setFallingCol(nextSpawnCol);
        fallingRowRef.current = 0;
        setFallingRow(0);
        isLockingRef.current = false;
      }, 90);
    },
    [isGameOver, saveBest]
  );

  // Instantly slam current tile down to the lowest empty spot in current column
  const hardDrop = useCallback(() => {
    if (isPausedRef.current || isGameOver || isLockingRef.current) return;
    const curCol = fallingColRef.current;
    const lowestRow = getLowestEmptyRow(gridRef.current, curCol);
    if (lowestRow === -1) {
      triggerSliceHaptic();
      return;
    }
    lockFallingTile(lowestRow, curCol);
  }, [isGameOver, lockFallingTile]);

  // Horizontally shift the falling tile to target column if path is clear
  const moveHorizontal = useCallback(
    (targetCol) => {
      if (isPausedRef.current || isGameOver || isLockingRef.current) return;
      const col = Math.max(0, Math.min(COLS - 1, targetCol));
      const curRow = fallingRowRef.current;

      // Check if target column is open from top down to curRow
      let canMove = true;
      for (let r = 0; r <= curRow; r += 1) {
        if (gridRef.current[r][col] !== 0) {
          canMove = false;
          break;
        }
      }

      if (canMove && col !== fallingColRef.current) {
        fallingColRef.current = col;
        setFallingCol(col);
        triggerLightHaptic();
        playTapSound();
      }
    },
    [isGameOver]
  );

  // Step falling tile down by one row (Tetris auto-drop)
  const stepDown = useCallback(() => {
    if (isPausedRef.current || isGameOver || isLockingRef.current) return;

    const curCol = fallingColRef.current;
    const curRow = fallingRowRef.current;

    if (curRow + 1 < ROWS && gridRef.current[curRow + 1][curCol] === 0) {
      const nextRow = curRow + 1;
      fallingRowRef.current = nextRow;
      setFallingRow(nextRow);
    } else {
      // Reached floor or another block -> lock in place
      lockFallingTile(curRow, curCol);
    }
  }, [isGameOver, lockFallingTile]);

  // Auto-drop interval (slowly descends like Tetris)
  useEffect(() => {
    if (isGameOver) return;

    const dropInterval = Math.max(420, 750 - Math.floor(score / 600) * 30);
    const timer = setInterval(() => {
      stepDown();
    }, dropInterval);

    return () => clearInterval(timer);
  }, [isGameOver, score, stepDown]);

    // PanResponder to swipe across screen to shift columns or swipe down to hard drop
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.hypot(gesture.dx, gesture.dy) > 5,
      onPanResponderGrant: (evt) => {
        if (isPausedRef.current || isGameOver || isLockingRef.current) return;
        const { pageX, pageY } = evt.nativeEvent;
        panStartRef.current = {
          startX: pageX,
          startY: pageY,
          startCol: fallingColRef.current,
          hasDropped: false,
        };

        const relX = pageX - (boardPosRef.current.pageX || 0);
        const targetCol = Math.max(0, Math.min(COLS - 1, Math.floor((relX - 8) / cellWidth)));
        if (targetCol !== fallingColRef.current) {
          moveHorizontal(targetCol);
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        if (isPausedRef.current || isGameOver || isLockingRef.current) return;
        const { dy, vy } = gestureState;

        // Fast downward swipe triggers Hard Drop
        if (!panStartRef.current.hasDropped && (dy > 40 || vy > 0.8)) {
          panStartRef.current.hasDropped = true;
          hardDrop();
          return;
        }

        // Horizontal finger tracking across columns
        const { pageX } = evt.nativeEvent;
        const relX = pageX - (boardPosRef.current.pageX || 0);
        const targetCol = Math.max(0, Math.min(COLS - 1, Math.floor((relX - 8) / cellWidth)));
        if (targetCol !== fallingColRef.current) {
          moveHorizontal(targetCol);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (isPausedRef.current || isGameOver || isLockingRef.current) return;
        const { dx, dy, vy } = gestureState;

        if (!panStartRef.current.hasDropped) {
          if (dy > 30 || vy > 0.6) {
            hardDrop();
          } else if (Math.abs(dx) > 24) {
            const dir = dx > 0 ? 1 : -1;
            moveHorizontal(fallingColRef.current + dir);
          } else if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
            const { pageX } = evt.nativeEvent;
            const relX = pageX - (boardPosRef.current.pageX || 0);
            const tappedCol = Math.max(0, Math.min(COLS - 1, Math.floor((relX - 8) / cellWidth)));
            if (tappedCol === fallingColRef.current) {
              hardDrop();
            } else {
              moveHorizontal(tappedCol);
            }
          }
        }
      },
    })
  ).current;

  // Ghost landing indicator row for active falling column
  const landingRow = getLowestEmptyRow(grid, fallingCol);

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
              <Text style={localStyles.launcherLabel}>FALLING BOX</Text>
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
            ref={boardRef}
            {...panResponder.panHandlers}
            onLayout={updateBoardPosition}
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
                  left: 8 + fallingCol * cellWidth,
                  width: cellWidth,
                  height: boardHeight - 16,
                },
              ]}
            />

            {/* Matrix Grid of Blocks */}
            <View pointerEvents="none" style={localStyles.gridInner}>
              {grid.map((row, rIdx) => (
              <View key={`row_${rIdx}`} style={localStyles.row}>
                {row.map((val, cIdx) => {
                  const isFalling =
                    !isGameOver && rIdx === fallingRow && cIdx === fallingCol;
                  const isGhostTarget =
                    !isGameOver &&
                    !isFalling &&
                    val === 0 &&
                    rIdx === landingRow &&
                    cIdx === fallingCol;

                  const displayVal = isFalling ? currentVal : val;
                  const theme = getTileTheme(displayVal);

                  return (
                    <View
                      key={`cell_${rIdx}_${cIdx}`}
                      style={[
                        localStyles.cell,
                        {
                          width: cellWidth,
                          height: cellHeight,
                          borderColor: isFalling
                            ? '#FFFFFF'
                            : isGhostTarget
                            ? getTileTheme(currentVal).border
                            : theme.border,
                          borderStyle: isGhostTarget ? 'dashed' : 'solid',
                          borderWidth: isFalling ? 2.5 : isGhostTarget ? 2 : 1.2,
                          backgroundColor: isFalling
                            ? theme.bg[0]
                            : isGhostTarget
                            ? 'rgba(0, 245, 255, 0.12)'
                            : theme.bg[0],
                          transform: isFalling ? [{ scale: 1.05 }] : undefined,
                          zIndex: isFalling ? 5 : 1,
                        },
                      ]}
                    >
                      {displayVal > 0 ? (
                        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                          <Text
                            style={[
                              localStyles.tileNumber,
                              {
                                color: theme.text,
                                fontSize:
                                  displayVal >= 1024 ? 13 : displayVal >= 128 ? 15 : 18,
                              },
                            ]}
                          >
                            {displayVal}
                          </Text>
                          {isFalling && (
                            <Text style={localStyles.fallingIndicator}>▼</Text>
                          )}
                        </View>
                      ) : isGhostTarget ? (
                        <Text style={localStyles.ghostText}>▼</Text>
                      ) : null}
                    </View>
                    );
                  })}
                </View>
              ))}
            </View>

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
                const isSelected = fallingCol === c;
                return (
                  <Pressable
                    key={`col_btn_${c}`}
                    onPress={() => {
                      if (fallingCol === c) {
                        hardDrop();
                      } else {
                        moveHorizontal(c);
                      }
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
              onPress={hardDrop}
              style={({ pressed }) => [
                localStyles.dropActionBtn,
                pressed && { transform: [{ scale: 0.96 }], opacity: 0.85 },
              ]}
            >
              <Text style={localStyles.dropActionText}>
                HARD DROP IN COL {fallingCol + 1} ▾ (OR SWIPE DOWN)
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
  fallingIndicator: {
    fontSize: 8,
    color: '#FFFFFF',
    marginTop: -2,
    fontWeight: '900',
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
