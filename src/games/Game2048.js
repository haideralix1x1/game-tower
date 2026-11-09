import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  useWindowDimensions,
  PanResponder,
  Animated as RNAnimated,
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
  const [slideInfo, setSlideInfo] = useState(null);
  const slideAnim = useRef(new RNAnimated.Value(0)).current;

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
    setSlideInfo(null);
    if (juiceRef.current) juiceRef.current.flash(COLORS.cyan);
  }, []);

  // Calculate lowest empty row in column
  const getLowestEmptyRow = (g, col) => {
    for (let r = ROWS - 1; r >= 0; r -= 1) {
      if (g[r][col] === 0) return r;
    }
    return -1;
  };

  // Gravity: drop blocks down in each column to fill holes
  const applyGravity = (g) => {
    let moved = false;
    const nextGrid = g.map((row) => [...row]);
    for (let c = 0; c < COLS; c += 1) {
      let writeRow = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r -= 1) {
        if (nextGrid[r][c] !== 0) {
          if (writeRow !== r) {
            nextGrid[writeRow][c] = nextGrid[r][c];
            nextGrid[r][c] = 0;
            moved = true;
          }
          writeRow -= 1;
        }
      }
    }
    return { nextGrid, moved };
  };

  // Complete the drop turn and advance to next upcoming number
  const finishDropTurn = useCallback(
    (finalGrid) => {
      // Advance to next upcoming tile
      const nextValToUse = nextValRef.current;
      const newUpcoming = pickSpawnValue(maxTileRef.current);
      currentValRef.current = nextValToUse;
      setCurrentVal(nextValToUse);
      nextValRef.current = newUpcoming;
      setNextVal(newUpcoming);

      // Check if all columns are completely full
      const anyEmptyCol = [0, 1, 2, 3, 4].some((c) => getLowestEmptyRow(finalGrid, c) !== -1);
      if (!anyEmptyCol) {
        setIsGameOver(true);
        triggerGameOverHaptic();
        playGameOverSound();
        juiceRef.current?.shake(16, 12);
        juiceRef.current?.flash(COLORS.danger);
        isLockingRef.current = false;
        return;
      }

      // Reset falling position to top
      fallingRowRef.current = 0;
      setFallingRow(0);
      isLockingRef.current = false;
    },
    []
  );

  // Directional sliding auto-merge cascade:
  // When a number matches, it slides auto towards that direction into the existing number!
  const runMergeCascade = useCallback(
    (startGrid, checkRow, checkCol, comboCount = 0) => {
      const val = startGrid[checkRow]?.[checkCol];
      let fromR = checkRow;
      let fromC = checkCol;
      let toR = null;
      let toC = null;

      if (val && val > 0) {
        // Priority 1: Match Bottom -> slide DOWN into the existing number below
        if (checkRow + 1 < ROWS && startGrid[checkRow + 1][checkCol] === val) {
          toR = checkRow + 1;
          toC = checkCol;
        }
        // Priority 2: Match Right -> slide RIGHT into existing number on right side!
        else if (checkCol + 1 < COLS && startGrid[checkRow][checkCol + 1] === val) {
          toR = checkRow;
          toC = checkCol + 1;
        }
        // Priority 3: Match Left -> slide LEFT into existing number on left side!
        else if (checkCol - 1 >= 0 && startGrid[checkRow][checkCol - 1] === val) {
          toR = checkRow;
          toC = checkCol - 1;
        }
      }

      // If no match found at designated cell, scan whole grid for any adjacent matches
      if (toR === null) {
        for (let r = ROWS - 1; r >= 0; r -= 1) {
          for (let c = 0; c < COLS; c += 1) {
            const v = startGrid[r][c];
            if (v === 0) continue;
            // Check bottom
            if (r + 1 < ROWS && startGrid[r + 1][c] === v) {
              fromR = r;
              fromC = c;
              toR = r + 1;
              toC = c;
              break;
            }
            // Check right
            if (c + 1 < COLS && startGrid[r][c + 1] === v) {
              fromR = r;
              fromC = c;
              toR = r;
              toC = c + 1;
              break;
            }
          }
          if (toR !== null) break;
        }
      }

      // If a match is found, slide the upcoming/matching block towards that direction!
      if (toR !== null && toC !== null) {
        const mergeVal = startGrid[fromR][fromC];
        setSlideInfo({ fromR, fromC, toR, toC, val: mergeVal });
        slideAnim.setValue(0);

        RNAnimated.timing(slideAnim, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }).start(() => {
          setSlideInfo(null);

          // Apply merge: target cell becomes doubled (e.g. 4 merges into 4 on right to become 8)
          const nextGrid = startGrid.map((row) => [...row]);
          const newVal = mergeVal * 2;
          nextGrid[toR][toC] = newVal;
          nextGrid[fromR][fromC] = 0;

          // Apply gravity in all columns
          const { nextGrid: gravityGrid } = applyGravity(nextGrid);
          gridRef.current = gravityGrid;
          setGrid(gravityGrid);

          // Locate where the merged number settled in column toC after gravity
          let finalTargetRow = toR;
          for (let r = ROWS - 1; r >= 0; r -= 1) {
            if (gravityGrid[r][toC] === newVal) {
              finalTargetRow = r;
              break;
            }
          }

          // Update Score & Max Tile
          const nextScore = scoreRef.current + newVal;
          scoreRef.current = nextScore;
          setScore(nextScore);
          saveBest(nextScore);

          if (newVal > maxTileRef.current) {
            maxTileRef.current = newVal;
            setMaxTile(newVal);
          }

          // Sound & Haptic Feedback
          const currentCombos = comboCount + 1;
          if (newVal >= 2048) {
            triggerPerfectHaptic(4);
            playPerfectSound(8);
            juiceRef.current?.celebrate('2048 TRANSCENDENCE!', `+${newVal} PTS`, COLORS.solarGold);
          } else if (newVal >= 64 || currentCombos >= 2) {
            triggerPerfectHaptic(currentCombos);
            playPerfectSound(Math.min(8, currentCombos + 3));
            juiceRef.current?.celebrate(
              currentCombos >= 2 ? `${currentCombos}X CHAIN SLIDE!` : `${newVal} MERGED!`,
              `+${newVal} PTS`,
              COLORS.cyan
            );
          } else {
            triggerSliceHaptic();
            playTapSound();
            juiceRef.current?.burst(undefined, undefined, getTileTheme(newVal).border, 12);
          }

          // Chain reaction: check if newly formed tile can slide & merge further!
          setTimeout(() => {
            runMergeCascade(gravityGrid, finalTargetRow, toC, currentCombos);
          }, 45);
        });
      } else {
        // Cascade completely finished! No more matches!
        finishDropTurn(startGrid);
      }
    },
    [saveBest, finishDropTurn]
  );

  // Lock falling tile in target position and start auto-merge cascade
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
        // Run directional slide-into merge cascade starting from the landing tile
        runMergeCascade(initialPlaced, targetRow, targetCol, 0);
      }, 70);
    },
    [isGameOver, runMergeCascade]
  );

  // Horizontally steer the falling tile to target column without snapping
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

  // Step falling tile down by one row (slow auto-drop)
  const stepDown = useCallback(() => {
    if (isPausedRef.current || isGameOver || isLockingRef.current) return;

    const curCol = fallingColRef.current;
    const curRow = fallingRowRef.current;
    const lowestEmpty = getLowestEmptyRow(gridRef.current, curCol);

    // If the whole column is full and the upcoming number falls on it -> GAME OVER
    if (lowestEmpty === -1) {
      setIsGameOver(true);
      triggerGameOverHaptic();
      playGameOverSound();
      if (juiceRef.current) {
        juiceRef.current.shake(16, 12);
        juiceRef.current.flash(COLORS.danger);
        juiceRef.current.celebrate('COLUMN OVERFLOW!', 'Column full // Game Over', COLORS.danger);
      }
      return;
    }

    if (curRow < lowestEmpty) {
      const nextRow = curRow + 1;
      fallingRowRef.current = nextRow;
      setFallingRow(nextRow);
    } else {
      // Reached lowest empty spot in column -> lock and auto-merge
      lockFallingTile(curRow, curCol);
    }
  }, [isGameOver, lockFallingTile]);

  // Auto-drop interval: slow, steady pace giving player ample time to steer
  useEffect(() => {
    if (isGameOver) return;

    const dropInterval = Math.max(800, 1250 - Math.floor(score / 3000) * 30);
    const timer = setInterval(() => {
      stepDown();
    }, dropInterval);

    return () => clearInterval(timer);
  }, [isGameOver, score, stepDown]);

  // PanResponder: touch and swipe horizontally to steer columns (NEVER SNAPS ON CLICK)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.hypot(gesture.dx, gesture.dy) > 5,
      onPanResponderGrant: (evt) => {
        if (isPausedRef.current || isGameOver || isLockingRef.current) return;
        const { pageX } = evt.nativeEvent;
        const relX = pageX - (boardPosRef.current.pageX || 0);
        const targetCol = Math.max(0, Math.min(COLS - 1, Math.floor((relX - 8) / cellWidth)));
        moveHorizontal(targetCol);
      },
      onPanResponderMove: (evt) => {
        if (isPausedRef.current || isGameOver || isLockingRef.current) return;
        // Horizontal finger tracking across columns (NO FAST SNAP)
        const { pageX } = evt.nativeEvent;
        const relX = pageX - (boardPosRef.current.pageX || 0);
        const targetCol = Math.max(0, Math.min(COLS - 1, Math.floor((relX - 8) / cellWidth)));
        moveHorizontal(targetCol);
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (isPausedRef.current || isGameOver || isLockingRef.current) return;
        const { dx } = gestureState;
        if (Math.abs(dx) > 24) {
          const dir = dx > 0 ? 1 : -1;
          moveHorizontal(fallingColRef.current + dir);
        } else {
          // On click/tap: steer column gently without snapping down fast
          const { pageX } = evt.nativeEvent;
          const relX = pageX - (boardPosRef.current.pageX || 0);
          const tappedCol = Math.max(0, Math.min(COLS - 1, Math.floor((relX - 8) / cellWidth)));
          moveHorizontal(tappedCol);
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

                  const isOriginOfSlide =
                    slideInfo &&
                    slideInfo.fromR === rIdx &&
                    slideInfo.fromC === cIdx;
                  const displayVal = isOriginOfSlide ? 0 : isFalling ? currentVal : val;
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

            {/* Sliding Merge Overlay: smooth animated translation towards matching neighbor */}
            {slideInfo && (
              <RNAnimated.View
                pointerEvents="none"
                style={[
                  localStyles.cell,
                  {
                    position: 'absolute',
                    top: 8 + slideInfo.fromR * cellHeight,
                    left: 8 + slideInfo.fromC * cellWidth,
                    width: cellWidth,
                    height: cellHeight,
                    zIndex: 25,
                    backgroundColor: getTileTheme(slideInfo.val).bg[0],
                    borderColor: '#FFFFFF',
                    borderWidth: 2.2,
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: [
                      {
                        translateX: slideAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, (slideInfo.toC - slideInfo.fromC) * cellWidth],
                        }),
                      },
                      {
                        translateY: slideAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, (slideInfo.toR - slideInfo.fromR) * cellHeight],
                        }),
                      },
                      {
                        scale: slideAnim.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [1, 1.15, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Text
                  style={[
                    localStyles.tileNumber,
                    {
                      color: getTileTheme(slideInfo.val).text,
                      fontSize: slideInfo.val >= 1024 ? 13 : slideInfo.val >= 128 ? 15 : 18,
                    },
                  ]}
                >
                  {slideInfo.val}
                </Text>
              </RNAnimated.View>
            )}
          </View>

          {/* Game Over Modal */}
          <GameResultModal
            visible={isGameOver}
            type="GAME_OVER"
            title="COLUMN OVERFLOW // GAME OVER"
            subtitle={`MAX TILE MERGED: ${maxTile} // COLUMN BECAME FULL`}
            score={score}
            bestScore={bestScore}
            accentColor={COLORS.magenta}
            onRetry={startNewGame}
            retryLabel="PLAY AGAIN"
            onBackToHub={onBackToHub}
          />

          {/* Tactical Column Steering Bar (Numbers fall auto slowly - no snapping) */}
          <View style={[localStyles.bottomControls, { width: boardWidth }]}>
            <View style={localStyles.columnSelectorRow}>
              {[0, 1, 2, 3, 4].map((c) => {
                const isSelected = fallingCol === c;
                const isFull = getLowestEmptyRow(grid, c) === -1;
                return (
                  <Pressable
                    key={`col_btn_${c}`}
                    onPress={() => moveHorizontal(c)}
                    style={[
                      localStyles.colBtn,
                      { width: cellWidth - 4 },
                      isSelected && localStyles.colBtnActive,
                      isFull && {
                        borderColor: '#FF0055',
                        backgroundColor: 'rgba(255, 0, 85, 0.22)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        localStyles.colBtnText,
                        isSelected && { color: COLORS.cyan, fontWeight: '900' },
                        isFull && { color: '#FF0055', fontWeight: '900' },
                      ]}
                    >
                      {isFull ? 'FULL' : `COL ${c + 1}`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={localStyles.tacticalStatusBar}>
              <Text style={localStyles.tacticalStatusText}>
                STEER COLUMNS ◄ ► (AUTO-DROPS SLOWLY)
              </Text>
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
  tacticalStatusBar: {
    width: '100%',
    backgroundColor: 'rgba(8, 12, 28, 0.88)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.28)',
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tacticalStatusText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '800',
    color: COLORS.cyan,
    letterSpacing: 1,
  },
});
