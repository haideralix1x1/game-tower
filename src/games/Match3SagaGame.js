import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  Platform,
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../styles';
import MiniGameHeader from '../components/MiniGameHeader';
import GameResultModal from '../components/GameResultModal';
import JuiceEngine from '../components/JuiceEngine';
import {
  playTapSound,
  playSliceSound,
  playPerfectSound,
  playGameOverSound,
} from '../utils/sound';
import {
  triggerLightHaptic,
  triggerMediumHaptic,
  triggerPerfectHaptic,
  triggerGameOverHaptic,
} from '../utils/haptics';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const STORAGE_LEVEL_KEY = '@game_tower:level_match3_v1';
const STORAGE_BEST_KEY = '@game_tower:best_match3_v1';

const GRID_SIZE = 7;

// Vibrant Juicy Cyber Fruit Types
const FRUIT_TYPES = [
  { id: 'strawberry', name: 'Strawberry', icon: '🍓', color: '#FF0055', bg: 'rgba(255, 0, 85, 0.22)' },
  { id: 'orange', name: 'Orange', icon: '🍊', color: '#FF6D00', bg: 'rgba(255, 109, 0, 0.22)' },
  { id: 'lemon', name: 'Lemon', icon: '🍋', color: '#FFE600', bg: 'rgba(255, 230, 0, 0.22)' },
  { id: 'apple', name: 'Apple', icon: '🍏', color: '#39FF14', bg: 'rgba(57, 255, 20, 0.22)' },
  { id: 'grape', name: 'Grape', icon: '🍇', color: '#9D4EDD', bg: 'rgba(157, 78, 221, 0.22)' },
  { id: 'watermelon', name: 'Watermelon', icon: '🍉', color: '#00F5D4', bg: 'rgba(0, 245, 212, 0.22)' },
];

const JUICE_CALLOUTS = [
  'JUICY! 🍓',
  'SWEET! 🍬',
  'DELICIOUS! 🍊',
  'SUPER BLAST! 💥',
  'FRESH! 🍉',
  'MEGA CRUNCH! ⚡',
];

export default function Match3SagaGame({ onBackToHub, onScoreUpdate, isPaused = false }) {
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  const { width, height } = useWindowDimensions();
  const cellSize = Math.floor(Math.min((width - 48) / GRID_SIZE, (height - 310) / GRID_SIZE));
  const boardWidth = GRID_SIZE * (cellSize + 4);

  const [level, setLevel] = useState(1);
  const [bestScore, setBestScore] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const savedLvl = await AsyncStorage.getItem(STORAGE_LEVEL_KEY);
        const savedScore = await AsyncStorage.getItem(STORAGE_BEST_KEY);
        if (savedLvl !== null) {
          const pLvl = parseInt(savedLvl, 10);
          if (!isNaN(pLvl) && pLvl >= 1) setLevel(pLvl);
        }
        if (savedScore !== null) {
          const pScore = parseInt(savedScore, 10);
          if (!isNaN(pScore)) setBestScore(pScore);
        }
      } catch {}
    })();
  }, []);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [bricksLeft, setBricksLeft] = useState(4);
  const [starsLeft, setStarsLeft] = useState(3);

  const [grid, setGrid] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);
  const [floatingJuice, setFloatingJuice] = useState(null);

  // Result modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('win');

  const juiceRef = useRef(null);
  const timerRef = useRef(null);
  const boardRef = useRef(null);
  const boardLayoutRef = useRef({ pageX: 0, pageY: 0, width: boardWidth, height: boardWidth });
  const isSwappingRef = useRef(false);
  const selectedCellRef = useRef(null);
  selectedCellRef.current = selectedCell;
  const executeSwapRef = useRef(null);
  const gridRef = useRef([]);
  gridRef.current = grid;

  const updateBoardPosition = useCallback(() => {
    if (boardRef.current) {
      boardRef.current.measureInWindow((x, y, w, h) => {
        if (w > 0 && h > 0) {
          boardLayoutRef.current = { pageX: x, pageY: y, width: w, height: h };
        }
      });
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(updateBoardPosition, 300);
    return () => clearTimeout(timer);
  }, [updateBoardPosition]);

  // Helper random fruit
  const getRandomFruit = () => {
    const pick = FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
    return {
      type: pick.id,
      icon: pick.icon,
      color: pick.color,
      bg: pick.bg,
      special: null, // null | 'STRIPED_H' | 'STRIPED_V' | 'BOMB'
    };
  };

  // Initialize board with fruits & hurdles
  const initBoard = useCallback((lvl) => {
    isSwappingRef.current = false;
    const targetBricks = Math.min(12, 3 + lvl);
    const targetStars = Math.min(8, 2 + (lvl % 3));
    setBricksLeft(targetBricks);
    setStarsLeft(targetStars);
    setTimeLeft(60);
    setSelectedCell(null);
    setModalVisible(false);

    // Create 7x7 grid without initial 3-in-a-row matches
    const newGrid = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      const row = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        let fruit = getRandomFruit();
        // Prevent accidental matches on spawn
        while (
          (c >= 2 && row[c - 1]?.type === fruit.type && row[c - 2]?.type === fruit.type) ||
          (r >= 2 && newGrid[r - 1][c]?.type === fruit.type && newGrid[r - 2][c]?.type === fruit.type)
        ) {
          fruit = getRandomFruit();
        }
        row.push(fruit);
      }
      newGrid.push(row);
    }

    // Sugar Bricks 🧱
    let placedBricks = 0;
    while (placedBricks < targetBricks) {
      const r = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
      const c = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
      if (newGrid[r][c].type !== 'brick' && newGrid[r][c].type !== 'star') {
        newGrid[r][c] = {
          type: 'brick',
          icon: '🧱',
          color: '#8D99AE',
          bg: 'rgba(141, 153, 174, 0.35)',
          hp: 2,
        };
        placedBricks++;
      }
    }

    // Star Fruits ⭐
    let placedStars = 0;
    while (placedStars < targetStars) {
      const r = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
      const c = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
      if (newGrid[r][c].type !== 'brick' && newGrid[r][c].type !== 'star') {
        newGrid[r][c] = {
          type: 'star',
          icon: '⭐',
          color: '#FFD166',
          bg: 'rgba(255, 209, 102, 0.35)',
        };
        placedStars++;
      }
    }

    setGrid(newGrid);
  }, []);

  useEffect(() => {
    initBoard(level);
  }, [level, initBoard]);

  // Timer Countdown
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (isPausedRef.current) return;
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          handleGameOver();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleWin = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (juiceRef.current) {
      juiceRef.current.celebrate('LEVEL COMPLETED!', 'CYBER HARVEST READY!', '#39FF14');
    }
    setModalType('win');
    setModalVisible(true);
  };

  const handleGameOver = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    playGameOverSound();
    triggerGameOverHaptic();
    setModalType('gameover');
    setModalVisible(true);
  };

  /**
   * Check matches, burst particles, drop tiles, and auto-cascade combos
   */
  const checkAndClearMatches = useCallback(
    (board, comboCount = 1) => {
      const toClear = new Set();
      const rows = GRID_SIZE;
      const cols = GRID_SIZE;
      const specialSpawnList = [];

      // Horizontal check
      for (let r = 0; r < rows; r++) {
        let matchLen = 1;
        for (let c = 1; c < cols; c++) {
          const cur = board[r][c];
          const prev = board[r][c - 1];
          if (
            cur &&
            prev &&
            cur.type === prev.type &&
            cur.type !== 'brick' &&
            cur.type !== 'star'
          ) {
            matchLen++;
          } else {
            if (matchLen >= 3) {
              for (let k = 0; k < matchLen; k++) toClear.add(`${r},${c - 1 - k}`);
              if (matchLen === 4) {
                specialSpawnList.push({ r, c: c - 2, special: 'STRIPED_H', base: prev });
              } else if (matchLen >= 5) {
                specialSpawnList.push({ r, c: c - 3, special: 'BOMB', base: prev });
              }
            }
            matchLen = 1;
          }
        }
        if (matchLen >= 3) {
          for (let k = 0; k < matchLen; k++) toClear.add(`${r},${cols - 1 - k}`);
          if (matchLen === 4) {
            specialSpawnList.push({ r, c: cols - 2, special: 'STRIPED_H', base: board[r][cols - 1] });
          } else if (matchLen >= 5) {
            specialSpawnList.push({ r, c: cols - 3, special: 'BOMB', base: board[r][cols - 1] });
          }
        }
      }

      // Vertical check
      for (let c = 0; c < cols; c++) {
        let matchLen = 1;
        for (let r = 1; r < rows; r++) {
          const cur = board[r][c];
          const prev = board[r - 1][c];
          if (
            cur &&
            prev &&
            cur.type === prev.type &&
            cur.type !== 'brick' &&
            cur.type !== 'star'
          ) {
            matchLen++;
          } else {
            if (matchLen >= 3) {
              for (let k = 0; k < matchLen; k++) toClear.add(`${r - 1 - k},${c}`);
              if (matchLen === 4) {
                specialSpawnList.push({ r: r - 2, c, special: 'STRIPED_V', base: prev });
              } else if (matchLen >= 5) {
                specialSpawnList.push({ r: r - 3, c, special: 'BOMB', base: prev });
              }
            }
            matchLen = 1;
          }
        }
        if (matchLen >= 3) {
          for (let k = 0; k < matchLen; k++) toClear.add(`${rows - 1 - k},${c}`);
          if (matchLen === 4) {
            specialSpawnList.push({ r: rows - 2, c, special: 'STRIPED_V', base: board[rows - 1][c] });
          } else if (matchLen >= 5) {
            specialSpawnList.push({ r: rows - 3, c, special: 'BOMB', base: board[rows - 1][c] });
          }
        }
      }

      if (toClear.size === 0) {
        isSwappingRef.current = false;
        return false;
      }

      // Handle Special Fruit Activations (Striped lasers & Sugar Bombs)
      const expandedClear = new Set(toClear);
      toClear.forEach((key) => {
        const [r, c] = key.split(',').map(Number);
        const tile = board[r][c];
        if (tile?.special === 'STRIPED_H') {
          // Clear entire row
          for (let sc = 0; sc < cols; sc++) expandedClear.add(`${r},${sc}`);
        } else if (tile?.special === 'STRIPED_V') {
          // Clear entire column
          for (let sr = 0; sr < rows; sr++) expandedClear.add(`${sr},${c}`);
        } else if (tile?.special === 'BOMB') {
          // Clear 3x3 blast area
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                expandedClear.add(`${nr},${nc}`);
              }
            }
          }
        }
      });

      const newBoard = board.map((row) => [...row]);
      let bricksDestroyed = 0;
      let starsPicked = 0;
      let burstColor = '#FF0055';

      // Clear tiles and damage adjacent sugar bricks
      expandedClear.forEach((key) => {
        const [r, c] = key.split(',').map(Number);
        if (newBoard[r][c]?.color) burstColor = newBoard[r][c].color;

        // Damage adjacent bricks & collect stars
        const neighbors = [
          [r - 1, c],
          [r + 1, c],
          [r, c - 1],
          [r, c + 1],
        ];
        neighbors.forEach(([nr, nc]) => {
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            const item = newBoard[nr][nc];
            if (item && item.type === 'brick') {
              item.hp -= 1;
              if (item.hp <= 0) {
                newBoard[nr][nc] = getRandomFruit();
                bricksDestroyed++;
              }
            } else if (item && item.type === 'star') {
              newBoard[nr][nc] = getRandomFruit();
              starsPicked++;
            }
          }
        });

        newBoard[r][c] = null;
      });

      // Spawn any newly created special fruits at their epicenter
      specialSpawnList.forEach(({ r, c, special, base }) => {
        if (r >= 0 && r < rows && c >= 0 && c < cols && base) {
          newBoard[r][c] = {
            ...base,
            special,
            icon: special === 'BOMB' ? '💣' : special === 'STRIPED_H' ? '⚡' : '✨',
          };
        }
      });

      // Juice Engine Burst FX & Shake
      const boardBox = boardLayoutRef.current;
      const midR = Math.floor(rows / 2);
      const midC = Math.floor(cols / 2);
      const splashX = boardBox.x + (midC + 0.5) * (cellSize + 4);
      const splashY = boardBox.y + (midR + 0.5) * (cellSize + 4);

      if (juiceRef.current) {
        juiceRef.current.burst(splashX, splashY, burstColor, Math.min(30, expandedClear.size * 5));
        juiceRef.current.shake(3 + comboCount * 2, 2 + comboCount * 2);

        if (comboCount > 1) {
          juiceRef.current.popup(
            `COMBO x${comboCount}!`,
            `+${expandedClear.size * 40 * comboCount} PTS`,
            '#FFE600',
            splashX,
            splashY
          );
        }
      }

      const callout = JUICE_CALLOUTS[Math.floor(Math.random() * JUICE_CALLOUTS.length)];
      setFloatingJuice(comboCount > 1 ? `COMBO x${comboCount}!` : callout);

      if (bricksDestroyed > 0) {
        setBricksLeft((b) => Math.max(0, b - bricksDestroyed));
      }
      if (starsPicked > 0) {
        setStarsLeft((s) => Math.max(0, s - starsPicked));
      }

      // Drop fruits down by gravity
      for (let c = 0; c < cols; c++) {
        let emptyRow = rows - 1;
        for (let r = rows - 1; r >= 0; r--) {
          if (newBoard[r][c] !== null) {
            const val = newBoard[r][c];
            newBoard[r][c] = null;
            newBoard[emptyRow][c] = val;
            emptyRow--;
          }
        }
        while (emptyRow >= 0) {
          newBoard[emptyRow][c] = getRandomFruit();
          emptyRow--;
        }
      }

      setGrid(newBoard);
      playSliceSound();
      if (comboCount > 1) {
        playPerfectSound(comboCount);
        triggerPerfectHaptic(comboCount);
      } else {
        triggerMediumHaptic();
      }

      setScore((s) => {
        const gained =
          expandedClear.size * 35 * comboCount +
          bricksDestroyed * 120 +
          starsPicked * 200;
        const ns = s + gained;
        onScoreUpdate?.(ns);
        AsyncStorage.setItem(STORAGE_BEST_KEY, String(ns)).catch(() => {});
        return ns;
      });

      // Check Victory
      if (bricksLeft - bricksDestroyed <= 0 && starsLeft - starsPicked <= 0) {
        setTimeout(handleWin, 300);
        return true;
      }

      // Check for cascading combos after gravity drops!
      setTimeout(() => {
        checkAndClearMatches(newBoard, comboCount + 1);
      }, 260);

      return true;
    },
    [bricksLeft, cellSize, onScoreUpdate, starsLeft]
  );

  /**
   * Swap two adjacent cells
   */
  const executeSwap = useCallback(
    (cellA, cellB) => {
      if (!cellA || !cellB || isSwappingRef.current || isPausedRef.current) return;
      const { r: r1, c: c1 } = cellA;
      const { r: r2, c: c2 } = cellB;

      if (
        r1 < 0 || r1 >= GRID_SIZE || c1 < 0 || c1 >= GRID_SIZE ||
        r2 < 0 || r2 >= GRID_SIZE || c2 < 0 || c2 >= GRID_SIZE
      ) {
        return;
      }

      const currentBoard = gridRef.current;
      const itemA = currentBoard[r1]?.[c1];
      const itemB = currentBoard[r2]?.[c2];

      // Cannot swap bricks or stars directly
      if (!itemA || !itemB || itemA.type === 'brick' || itemA.type === 'star' || itemB.type === 'brick' || itemB.type === 'star') {
        setSelectedCell(null);
        return;
      }

      isSwappingRef.current = true;
      setSelectedCell(null);
      playTapSound();
      triggerLightHaptic();

      // Perform optimistic swap
      const nextGrid = currentBoard.map((row) => [...row]);
      nextGrid[r1][c1] = itemB;
      nextGrid[r2][c2] = itemA;
      setGrid(nextGrid);

      // Check if match was created
      const cleared = checkAndClearMatches(nextGrid, 1);
      if (!cleared) {
        // Swap back with juice rejection
        setTimeout(() => {
          setGrid((g) => {
            const reverted = g.map((row) => [...row]);
            reverted[r1][c1] = itemA;
            reverted[r2][c2] = itemB;
            return reverted;
          });
          if (juiceRef.current) juiceRef.current.shake(4, 2);
          playTapSound();
          isSwappingRef.current = false;
        }, 220);
      }
    },
    [checkAndClearMatches]
  );
  executeSwapRef.current = executeSwap;

  /**
   * PanResponder for Direct Finger Swiping across the Grid
   */
  const panStartRef = useRef({ r: -1, c: -1, startX: 0, startY: 0, hasSwapped: false });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.hypot(gesture.dx, gesture.dy) > 6,
      onPanResponderGrant: (evt) => {
        if (isSwappingRef.current || isPausedRef.current) return;
        const { pageX, pageY, locationX, locationY } = evt.nativeEvent;
        const cellStep = cellSize + 4;

        let relX = locationX;
        let relY = locationY;
        if (boardLayoutRef.current.width > 0 && boardLayoutRef.current.pageX > 0) {
          relX = pageX - boardLayoutRef.current.pageX;
          relY = pageY - boardLayoutRef.current.pageY;
        }

        const c = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(relX / cellStep)));
        const r = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(relY / cellStep)));

        panStartRef.current = {
          r,
          c,
          startX: pageX,
          startY: pageY,
          hasSwapped: false,
        };
      },
      onPanResponderMove: (_, gesture) => {
        const { r, c, hasSwapped } = panStartRef.current;
        if (hasSwapped || r < 0 || c < 0 || isSwappingRef.current || isPausedRef.current) return;

        const { dx, dy } = gesture;
        const SWIPE_THRESHOLD = 16;

        if (Math.hypot(dx, dy) >= SWIPE_THRESHOLD) {
          panStartRef.current.hasSwapped = true;
          let targetR = r;
          let targetC = c;

          if (Math.abs(dx) > Math.abs(dy)) {
            targetC = dx > 0 ? c + 1 : c - 1;
          } else {
            targetR = dy > 0 ? r + 1 : r - 1;
          }

          if (targetR >= 0 && targetR < GRID_SIZE && targetC >= 0 && targetC < GRID_SIZE) {
            executeSwapRef.current?.({ r, c }, { r: targetR, c: targetC });
          }
          setSelectedCell(null);
        }
      },
      onPanResponderRelease: () => {
        const { r, c, hasSwapped } = panStartRef.current;
        if (!hasSwapped && r >= 0 && c >= 0 && !isSwappingRef.current && !isPausedRef.current) {
          const prev = selectedCellRef.current;
          if (prev) {
            const isAdjacent = Math.abs(r - prev.r) + Math.abs(c - prev.c) === 1;
            const isSame = r === prev.r && c === prev.c;
            if (isSame) {
              setSelectedCell(null);
              playTapSound();
            } else if (isAdjacent) {
              executeSwapRef.current?.(prev, { r, c });
              setSelectedCell(null);
            } else {
              setSelectedCell({ r, c });
              playTapSound();
              triggerLightHaptic();
            }
          } else {
            setSelectedCell({ r, c });
            playTapSound();
            triggerLightHaptic();
          }
        }
        panStartRef.current = { r: -1, c: -1, startX: 0, startY: 0, hasSwapped: false };
      },
    })
  ).current;

  const handleNextLevel = () => {
    const nextLvl = level + 1;
    setLevel(nextLvl);
    AsyncStorage.setItem(STORAGE_LEVEL_KEY, String(nextLvl)).catch(() => {});
  };

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={styles.container}>
        <LinearGradient
          colors={['#03030A', '#13051C', '#0A0314']}
          style={StyleSheet.absoluteFillObject}
        />

        <MiniGameHeader
          floorNum={27}
          gameTitle="CYBER FRUIT MATCH 3"
          category="JUICY SAGA"
          accentColor="#FF007F"
          score={score}
          onBack={onBackToHub}
          onBackToHub={onBackToHub}
        />

        {/* Target Objectives HUD */}
        <View style={styles.topHud}>
          <View style={styles.hudGoal}>
            <View style={styles.goalChip}>
              <Text style={styles.goalText}>🧱 {bricksLeft}</Text>
            </View>
            <View style={styles.goalChip}>
              <Text style={styles.goalText}>⭐ {starsLeft}</Text>
            </View>
          </View>

          {floatingJuice && (
            <View style={styles.calloutBadge}>
              <Text style={styles.calloutText}>{floatingJuice}</Text>
            </View>
          )}

          <View style={styles.timerBadge}>
            <Text
              style={[
                styles.timerText,
                { color: timeLeft <= 10 ? '#FF0055' : COLORS.cyan },
              ]}
            >
              ⏱️ {timeLeft}s
            </Text>
          </View>
        </View>

        {/* Main 7x7 Juicy Grid with Direct Finger Swiping */}
        <View style={styles.gridContainer}>
          <View
            ref={boardRef}
            {...panResponder.panHandlers}
            onLayout={updateBoardPosition}
            style={[styles.boardWrapper, { width: boardWidth, height: boardWidth }]}
          >
            <View pointerEvents="none" style={styles.boardInner}>
              {grid.map((row, r) => (
                <View key={`row_${r}`} style={styles.gridRow}>
                  {row.map((cell, c) => {
                    const isSelected = selectedCell && selectedCell.r === r && selectedCell.c === c;
                    const isSpecial = Boolean(cell?.special);

                    return (
                      <View
                        key={`cell_${r}_${c}`}
                        style={[
                          styles.cell,
                          {
                            width: cellSize,
                            height: cellSize,
                            backgroundColor: cell?.bg || 'rgba(15, 10, 35, 0.7)',
                            borderColor: isSelected
                              ? '#00F5FF'
                              : isSpecial
                                ? '#FFE600'
                                : cell?.color
                                  ? cell.color + '66'
                                  : 'rgba(255, 255, 255, 0.1)',
                            borderWidth: isSelected ? 2.5 : isSpecial ? 2 : 1,
                            transform: [{ scale: isSelected ? 1.08 : 1 }],
                            shadowColor: isSelected ? '#00F5FF' : cell?.color || '#000',
                            shadowOpacity: isSelected || isSpecial ? 0.75 : 0.2,
                            shadowRadius: isSelected || isSpecial ? 8 : 2,
                          },
                        ]}
                      >
                        <Text style={[styles.fruitIcon, { fontSize: cellSize * 0.52 }]}>
                          {cell ? cell.icon : ''}
                        </Text>

                        {/* Armor stripe on damaged bricks */}
                        {cell && cell.type === 'brick' && cell.hp > 1 && (
                          <View style={styles.armorStripe} />
                        )}

                        {/* Glowing Ring for Special Fruits */}
                        {isSpecial && (
                          <View
                            style={[
                              styles.specialAura,
                              { borderColor: cell.special === 'BOMB' ? '#FF0055' : '#FFE600' },
                            ]}
                          />
                        )}
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        </View>

        <GameResultModal
          visible={modalVisible}
          type={modalType}
          score={score}
          onRetry={modalType === 'win' ? handleNextLevel : () => initBoard(level)}
          onBackToHub={onBackToHub}
          buttonText={modalType === 'win' ? 'NEXT STAGE' : 'TRY AGAIN'}
        />
      </View>
    </JuiceEngine>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#03030A',
  },
  topHud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  hudGoal: {
    flexDirection: 'row',
    gap: 8,
  },
  goalChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  goalText: {
    fontFamily: monoFont,
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  calloutBadge: {
    backgroundColor: 'rgba(255, 0, 127, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF007F',
  },
  calloutText: {
    fontFamily: monoFont,
    fontSize: 11,
    fontWeight: '900',
    color: '#FF007F',
    letterSpacing: 0.8,
  },
  timerBadge: {
    backgroundColor: 'rgba(0, 245, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.35)',
  },
  timerText: {
    fontFamily: monoFont,
    fontSize: 12,
    fontWeight: '900',
  },
  gridContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardWrapper: {
    backgroundColor: 'rgba(8, 5, 20, 0.85)',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 0, 127, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  boardInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridRow: {
    flexDirection: 'row',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    margin: 2,
    borderRadius: 10,
  },
  fruitIcon: {
    textAlign: 'center',
  },
  armorStripe: {
    position: 'absolute',
    bottom: 3,
    width: 14,
    height: 3,
    backgroundColor: '#00F5FF',
    borderRadius: 1.5,
  },
  specialAura: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
});
