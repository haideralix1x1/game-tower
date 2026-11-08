import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  Platform,
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Line, Circle, G } from 'react-native-svg';
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

const createInitialBoard = (lvl) => {
  const targetBricks = Math.min(12, 3 + lvl);
  const targetStars = Math.min(8, 2 + (lvl % 3));

  const newGrid = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const row = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      let fruit = getRandomFruit();
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

  return { newGrid, targetBricks, targetStars };
};

/**
 * Pre-validates if swapping cellA and cellB produces a genuine match in memory.
 * Prevents invalid swaps from ever touching board state or allowing illegal force-swipes!
 */
function canSwapMakeMatch(board, r1, c1, r2, c2) {
  const itemA = board[r1]?.[c1];
  const itemB = board[r2]?.[c2];
  if (!itemA || !itemB) return false;
  if (itemA.type === 'brick' || itemA.type === 'star' || itemB.type === 'brick' || itemB.type === 'star') {
    return false;
  }
  // Special fruits (Bomb or Laser) always trigger valid detonations when swapped!
  if (itemA.special || itemB.special) return true;

  // In-memory simulation
  const sim = board.map((row) => [...row]);
  sim[r1][c1] = itemB;
  sim[r2][c2] = itemA;

  // Horizontal match check
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE - 2; c++) {
      const t = sim[r][c]?.type;
      if (t && t !== 'brick' && t !== 'star' && t === sim[r][c + 1]?.type && t === sim[r][c + 2]?.type) {
        return true;
      }
    }
  }

  // Vertical match check
  for (let c = 0; c < GRID_SIZE; c++) {
    for (let r = 0; r < GRID_SIZE - 2; r++) {
      const t = sim[r][c]?.type;
      if (t && t !== 'brick' && t !== 'star' && t === sim[r + 1][c]?.type && t === sim[r + 2][c]?.type) {
        return true;
      }
    }
  }

  return false;
}

export default function Match3SagaGame({ onBackToHub, onScoreUpdate, isPaused = false }) {
  const isPausedRef = useRef(isPaused);
  const { width, height } = useWindowDimensions();
  const cellSize = Math.floor(Math.min((width - 48) / GRID_SIZE, (height - 310) / GRID_SIZE));
  const cellStep = cellSize + 4;
  const boardWidth = GRID_SIZE * cellStep;

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
  const initialData = useMemo(() => createInitialBoard(1), []);
  const [bricksLeft, setBricksLeft] = useState(initialData.targetBricks);
  const [starsLeft, setStarsLeft] = useState(initialData.targetStars);
  const [grid, setGrid] = useState(initialData.newGrid);
  const [selectedCell, setSelectedCell] = useState(null);
  const [floatingJuice, setFloatingJuice] = useState(null);

  // Visible neon swipe trajectory beam & localized tile blasts
  const [swipeTrace, setSwipeTrace] = useState(null);
  const [tileBlasts, setTileBlasts] = useState([]);

  // Result modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('win');

  const juiceRef = useRef(null);
  const timerRef = useRef(null);
  const boardRef = useRef(null);
  const boardLayoutRef = useRef({ pageX: 0, pageY: 0, width: boardWidth, height: boardWidth });

  // STRICT LOCK REF: Allows exactly ONE swipe at a time, completely preventing double/forced swiping!
  const isLockedRef = useRef(false);
  const selectedCellRef = useRef(null);
  const executeSwapRef = useRef(null);
  const gridRef = useRef(grid);
  const checkAndClearMatchesRef = useRef(null);
  const isFirstMountRef = useRef(true);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    selectedCellRef.current = selectedCell;
  }, [selectedCell]);

  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

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

  // Initialize board with fruits & hurdles
  const initBoard = useCallback((lvl) => {
    isLockedRef.current = false;
    const { newGrid, targetBricks, targetStars } = createInitialBoard(lvl);
    setBricksLeft(targetBricks);
    setStarsLeft(targetStars);
    setTimeLeft(60);
    setSelectedCell(null);
    setSwipeTrace(null);
    setTileBlasts([]);
    setModalVisible(false);
    setGrid(newGrid);
  }, []);

  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    initBoard(level);
  }, [level, initBoard]);

  const handleWin = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (juiceRef.current) {
      juiceRef.current.celebrate('LEVEL COMPLETED!', 'CYBER HARVEST READY!', '#39FF14');
    }
    setModalType('win');
    setModalVisible(true);
  }, []);

  const handleGameOver = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    playGameOverSound();
    triggerGameOverHaptic();
    setModalType('gameover');
    setModalVisible(true);
  }, []);

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
  }, [handleGameOver]);

  /**
   * Check matches, burst particles directly on matched tiles, drop tiles, and auto-cascade combos
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

      // No matches found -> Unlock input so player can swipe again!
      if (toClear.size === 0) {
        isLockedRef.current = false;
        return false;
      }

      // Special Fruit Activations (Striped lasers & Sugar Bombs)
      const expandedClear = new Set(toClear);
      toClear.forEach((key) => {
        const [r, c] = key.split(',').map(Number);
        const tile = board[r][c];
        if (tile?.special === 'STRIPED_H') {
          for (let sc = 0; sc < cols; sc++) expandedClear.add(`${r},${sc}`);
        } else if (tile?.special === 'STRIPED_V') {
          for (let sr = 0; sr < rows; sr++) expandedClear.add(`${sr},${c}`);
        } else if (tile?.special === 'BOMB') {
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

      // LOCALIZED TILE BLASTS: Spawn blasts and particles directly on each matching tile!
      const boardBox = boardLayoutRef.current;
      const newBlasts = [];

      expandedClear.forEach((key) => {
        const [r, c] = key.split(',').map(Number);
        const tile = newBoard[r][c];
        const tileColor = tile?.color || '#00F5FF';

        const centerTileX = c * cellStep + cellStep / 2;
        const centerTileY = r * cellStep + cellStep / 2;

        newBlasts.push({
          id: `blast_${r}_${c}_${Date.now()}_${Math.random()}`,
          x: centerTileX,
          y: centerTileY,
          color: tileColor,
          size: cellSize,
        });

        // Global particle burst from JuiceEngine directly over that specific tile!
        if (boardBox.pageX > 0 && boardBox.pageY > 0 && juiceRef.current) {
          const globalX = boardBox.pageX + centerTileX;
          const globalY = boardBox.pageY + centerTileY;
          juiceRef.current.burst(globalX, globalY, tileColor, 12);
        }

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

      setTileBlasts(newBlasts);
      setTimeout(() => setTileBlasts([]), 260);

      // Spawn newly created special fruits at epicenter
      specialSpawnList.forEach(({ r, c, special, base }) => {
        if (r >= 0 && r < rows && c >= 0 && c < cols && base) {
          newBoard[r][c] = {
            ...base,
            special,
            icon: special === 'BOMB' ? '💣' : special === 'STRIPED_H' ? '⚡' : '✨',
          };
        }
      });

      // Haptic shake & callout
      if (juiceRef.current) {
        juiceRef.current.shake(3 + comboCount * 2, 2 + comboCount * 2);
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

      // Check cascading combos after gravity drops!
      setTimeout(() => {
        checkAndClearMatchesRef.current?.(newBoard, comboCount + 1);
      }, 260);

      return true;
    },
    [bricksLeft, cellSize, cellStep, handleWin, onScoreUpdate, starsLeft]
  );

  useEffect(() => {
    checkAndClearMatchesRef.current = checkAndClearMatches;
  }, [checkAndClearMatches]);

  /**
   * Swap two adjacent cells (strictly validated before committing!)
   */
  const executeSwap = useCallback(
    (cellA, cellB) => {
      if (!cellA || !cellB || isLockedRef.current || isPausedRef.current) return;
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

      if (!itemA || !itemB || itemA.type === 'brick' || itemA.type === 'star' || itemB.type === 'brick' || itemB.type === 'star') {
        setSelectedCell(null);
        return;
      }

      // PRE-VALIDATE IN MEMORY: Will this swap create a match?
      const isValid = canSwapMakeMatch(currentBoard, r1, c1, r2, c2);

      if (!isValid) {
        // INVALID SWAP: Lock briefly, shake, and DO NOT alter the board!
        // This stops players from double-swiping or forcing illegal matches!
        isLockedRef.current = true;
        setSelectedCell(null);
        playTapSound();
        triggerLightHaptic();
        if (juiceRef.current) juiceRef.current.shake(3, 2);

        setTimeout(() => {
          isLockedRef.current = false;
        }, 180);
        return;
      }

      // VALID SWAP: Lock board, perform swap, and clear matches!
      isLockedRef.current = true;
      setSelectedCell(null);
      playTapSound();
      triggerLightHaptic();

      const nextGrid = currentBoard.map((row) => [...row]);
      nextGrid[r1][c1] = itemB;
      nextGrid[r2][c2] = itemA;
      setGrid(nextGrid);

      checkAndClearMatches(nextGrid, 1);
    },
    [checkAndClearMatches]
  );

  useEffect(() => {
    executeSwapRef.current = executeSwap;
  }, [executeSwap]);

  /**
   * PanResponder with Visible Neon Trajectory Line & Strict Single-Swipe Locking
   */
  const panStartRef = useRef({ r: -1, c: -1, startX: 0, startY: 0, hasSwapped: false });

  const panResponder = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs
      PanResponder.create({
        onStartShouldSetPanResponder: () => !isLockedRef.current && !isPausedRef.current,
        onMoveShouldSetPanResponder: (_, gesture) =>
          !isLockedRef.current && !isPausedRef.current && Math.hypot(gesture.dx, gesture.dy) > 5,
        onPanResponderGrant: (evt) => {
          if (isLockedRef.current || isPausedRef.current) return;
          const { pageX, pageY, locationX, locationY } = evt.nativeEvent;

          let relX = locationX;
          let relY = locationY;
          if (boardLayoutRef.current.width > 0 && boardLayoutRef.current.pageX > 0) {
            relX = pageX - boardLayoutRef.current.pageX;
            relY = pageY - boardLayoutRef.current.pageY;
          }

          const c = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(relX / cellStep)));
          const r = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(relY / cellStep)));

          const tileCenterX = c * cellStep + cellStep / 2;
          const tileCenterY = r * cellStep + cellStep / 2;

          panStartRef.current = {
            r,
            c,
            startX: tileCenterX,
            startY: tileCenterY,
            hasSwapped: false,
          };

          // Initialize neon swipe beam starting from tile center
          setSwipeTrace({
            startX: tileCenterX,
            startY: tileCenterY,
            curX: relX,
            curY: relY,
          });
        },
        onPanResponderMove: (evt, gesture) => {
          const { r, c, startX, startY, hasSwapped } = panStartRef.current;
          if (hasSwapped || r < 0 || c < 0 || isLockedRef.current || isPausedRef.current) {
            setSwipeTrace(null);
            return;
          }

          const { dx, dy } = gesture;
          const curX = startX + dx;
          const curY = startY + dy;

          // Render visible electric neon trajectory line following finger!
          setSwipeTrace({
            startX,
            startY,
            curX,
            curY,
          });

          const SWIPE_THRESHOLD = 18;

          if (Math.hypot(dx, dy) >= SWIPE_THRESHOLD) {
            panStartRef.current.hasSwapped = true;
            setSwipeTrace(null);

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
          setSwipeTrace(null);
          const { r, c, hasSwapped } = panStartRef.current;

          if (!hasSwapped && r >= 0 && c >= 0 && !isLockedRef.current && !isPausedRef.current) {
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
      }),
    [cellStep]
  );

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
          gameTitle="MATCH 3 SAGA"
          category="JUICY SAGA"
          accentColor="#FF007F"
          score={score}
          bestScore={bestScore}
          onReset={() => initBoard(level)}
          onBack={onBackToHub}
          onBackToHub={onBackToHub}
          disabled={isPaused}
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
            <View
              pointerEvents="none"
              style={[styles.boardInner, { width: boardWidth, height: boardWidth }]}
            >
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

            {/* SVG OVERLAY: Visible Neon Trajectory Line & Tile Blasts */}
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
              <Svg
                width={boardWidth}
                height={boardWidth}
                pointerEvents="none"
              >
              {/* VISIBLE NEON SWIPE LINE BEAM */}
              {swipeTrace && (
                <G>
                  {/* Outer Diffuse Glow */}
                  <Line
                    x1={swipeTrace.startX}
                    y1={swipeTrace.startY}
                    x2={swipeTrace.curX}
                    y2={swipeTrace.curY}
                    stroke="rgba(0, 245, 255, 0.35)"
                    strokeWidth={8}
                    strokeLinecap="round"
                  />
                  {/* Inner Crisp Neon Beam */}
                  <Line
                    x1={swipeTrace.startX}
                    y1={swipeTrace.startY}
                    x2={swipeTrace.curX}
                    y2={swipeTrace.curY}
                    stroke="#00F5FF"
                    strokeWidth={3}
                    strokeLinecap="round"
                  />
                  {/* Origin Tile Anchor Ring */}
                  <Circle
                    cx={swipeTrace.startX}
                    cy={swipeTrace.startY}
                    r={cellSize * 0.35}
                    fill="rgba(0, 245, 255, 0.15)"
                    stroke="#00F5FF"
                    strokeWidth={1.8}
                  />
                  {/* Finger Spark Dot */}
                  <Circle
                    cx={swipeTrace.curX}
                    cy={swipeTrace.curY}
                    r={5}
                    fill="#FFE600"
                    stroke="#FFFFFF"
                    strokeWidth={1.2}
                  />
                </G>
              )}

              {/* LOCALIZED BLASTS DIRECTLY ON MATCHED TILES */}
              {tileBlasts.map((blast) => (
                <G key={blast.id}>
                  {/* Inner Core Flash */}
                  <Circle
                    cx={blast.x}
                    cy={blast.y}
                    r={blast.size * 0.55}
                    fill={blast.color}
                    opacity={0.7}
                  />
                  {/* Expanding Shockwave Ring */}
                  <Circle
                    cx={blast.x}
                    cy={blast.y}
                    r={blast.size * 0.7}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth={2.5}
                  />
                </G>
              ))}
            </Svg>
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
    overflow: 'hidden',
  },
  boardInner: {
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
