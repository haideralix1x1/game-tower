import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
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

const STORAGE_KEY = '@game_tower:best_sudoku_v1';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export const SUDOKU_MODES = {
  EASY: {
    id: 'EASY',
    label: 'EASY',
    clues: 42,
    bonus: 200,
    accent: COLORS.matrixMint,
  },
  MEDIUM: {
    id: 'MEDIUM',
    label: 'MEDIUM',
    clues: 34,
    bonus: 400,
    accent: COLORS.cyan,
  },
  HARD: {
    id: 'HARD',
    label: 'HARD',
    clues: 26,
    bonus: 750,
    accent: COLORS.magenta,
  },
};

// Check if placing num at (row, col) is valid
const isValidMove = (grid, row, col, num) => {
  for (let c = 0; c < 9; c += 1) {
    if (grid[row][c] === num) return false;
  }
  for (let r = 0; r < 9; r += 1) {
    if (grid[r][col] === num) return false;
  }
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 3; c += 1) {
      if (grid[startRow + r][startCol + c] === num) return false;
    }
  }
  return true;
};

// Backtracking solver
const solveSudoku = (grid) => {
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      if (grid[r][c] === 0) {
        const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
        for (const num of nums) {
          if (isValidMove(grid, r, c, num)) {
            grid[r][c] = num;
            if (solveSudoku(grid)) return true;
            grid[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
};

// Full mathematical puzzle generator
const generateSudokuPuzzle = (clueCount = 34) => {
  const grid = Array.from({ length: 9 }, () => Array(9).fill(0));

  // Pre-fill 3 diagonal independent 3x3 boxes with random permutations
  for (let b = 0; b < 9; b += 3) {
    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
    let idx = 0;
    for (let r = 0; r < 3; r += 1) {
      for (let c = 0; c < 3; c += 1) {
        grid[b + r][b + c] = nums[idx];
        idx += 1;
      }
    }
  }

  // Solve completely
  solveSudoku(grid);
  const solution = grid.map((row) => [...row]);

  // Remove numbers to reach target clue count
  const puzzle = grid.map((row) => [...row]);
  const removeCount = 81 - clueCount;
  const positions = [];
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      positions.push([r, c]);
    }
  }
  positions.sort(() => Math.random() - 0.5);

  for (let i = 0; i < removeCount; i += 1) {
    const [r, c] = positions[i];
    puzzle[r][c] = 0;
  }

  return { puzzle, solution };
};

export default function CyberSudokuGame({ onBackToHub, onScoreUpdate }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const safeBottom = Math.max(insets.bottom || 0, Platform.OS === 'android' ? 24 : 14);

  const boardSize = Math.min(364, width - 24);
  const cellSize = Math.floor((boardSize - 16) / 9);

  const juiceRef = useRef(null);
  const [modeKey, setModeKey] = useState('MEDIUM');
  const activeMode = SUDOKU_MODES[modeKey] || SUDOKU_MODES.MEDIUM;

  const [puzzleData, setPuzzleData] = useState(() => generateSudokuPuzzle(SUDOKU_MODES.MEDIUM.clues));
  const [board, setBoard] = useState(() => {
    const { puzzle } = generateSudokuPuzzle(SUDOKU_MODES.MEDIUM.clues);
    return puzzle.map((row, r) =>
      row.map((val, c) => ({
        r,
        c,
        value: val,
        initial: val !== 0,
        notes: [],
        error: false,
      }))
    );
  });

  const [selected, setSelected] = useState([4, 4]); // [row, col]
  const [pencilMode, setPencilMode] = useState(false);
  const [history, setHistory] = useState([]);
  const [mistakes, setMistakes] = useState(0);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [timerSec, setTimerSec] = useState(0);
  const [gameState, setGameState] = useState('PLAYING');

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) setBestScore(parseInt(saved, 10) || 0);
      } catch {}
    })();
  }, []);

  // Timer
  useEffect(() => {
    if (gameState !== 'PLAYING') return () => {};
    const interval = setInterval(() => {
      setTimerSec((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState]);

  const updateBest = useCallback(
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

  const initGame = useCallback((mKey) => {
    const m = mKey ? SUDOKU_MODES[mKey] : activeMode;
    const generated = generateSudokuPuzzle(m.clues);
    setPuzzleData(generated);
    setBoard(
      generated.puzzle.map((row, r) =>
        row.map((val, c) => ({
          r,
          c,
          value: val,
          initial: val !== 0,
          notes: [],
          error: false,
        }))
      )
    );
    setSelected([4, 4]);
    setHistory([]);
    setMistakes(0);
    setTimerSec(0);
    setGameState('PLAYING');
    if (juiceRef.current) juiceRef.current.flash(m.accent);
  }, [activeMode]);

  const switchMode = useCallback((newKey) => {
    if (newKey === modeKey) return;
    triggerLightHaptic();
    playTapSound();
    setModeKey(newKey);
    initGame(newKey);
  }, [modeKey, initGame]);

  // Deep clone of board for immutable state updates & history
  const cloneBoard = (currentBoard) =>
    currentBoard.map((row) =>
      row.map((cell) => ({
        ...cell,
        notes: [...cell.notes],
      }))
    );

  // Keypad Number Press Handler
  const handleNumberInput = useCallback(
    (num) => {
      if (gameState !== 'PLAYING' || !selected) return;
      const [r, c] = selected;
      const cell = board[r][c];
      if (cell.initial) return;

      const previousBoard = cloneBoard(board);

      if (pencilMode) {
        // Toggle Pencil Note
        const newBoard = cloneBoard(board);
        const targetCell = newBoard[r][c];
        targetCell.value = 0; // Clear solid value if entering note
        targetCell.error = false;

        if (targetCell.notes.includes(num)) {
          targetCell.notes = targetCell.notes.filter((n) => n !== num);
        } else {
          targetCell.notes = [...targetCell.notes, num].sort((a, b) => a - b);
        }

        setHistory((prev) => [...prev, previousBoard]);
        setBoard(newBoard);
        triggerLightHaptic();
        playTapSound();
      } else {
        // Solid Digit Entry
        const newBoard = cloneBoard(board);
        const targetCell = newBoard[r][c];
        const correctVal = puzzleData.solution[r][c];

        if (targetCell.value === num) {
          // Toggle off
          targetCell.value = 0;
          targetCell.error = false;
        } else {
          targetCell.value = num;
          targetCell.notes = []; // Clear notes upon placing solid number

          const isWrong = num !== correctVal;
          targetCell.error = isWrong;

          if (isWrong) {
            triggerSliceHaptic();
            playSliceSound();
            const nextMistakes = mistakes + 1;
            setMistakes(nextMistakes);

            if (nextMistakes >= 3) {
              setGameState('GAME_OVER');
              triggerGameOverHaptic();
              playGameOverSound();
              if (juiceRef.current) {
                juiceRef.current.shake(14, 10);
                juiceRef.current.flash(COLORS.danger);
                juiceRef.current.popup('LOCKDOWN', '3/3 MISTAKES REACHED', COLORS.danger);
              }
            } else {
              if (juiceRef.current) {
                juiceRef.current.shake(6, 4);
                juiceRef.current.popup(`MISTAKE ${nextMistakes}/3`, 'INCORRECT DIGIT', COLORS.danger);
              }
            }
          } else {
            // Correct digit placed
            triggerLightHaptic();
            playTapSound();

            // Clear this number from notes in same row, col, and 3x3 box
            const startR = Math.floor(r / 3) * 3;
            const startC = Math.floor(c / 3) * 3;
            for (let i = 0; i < 9; i += 1) {
              newBoard[r][i].notes = newBoard[r][i].notes.filter((n) => n !== num);
              newBoard[i][c].notes = newBoard[i][c].notes.filter((n) => n !== num);
            }
            for (let ro = 0; ro < 3; ro += 1) {
              for (let co = 0; co < 3; co += 1) {
                newBoard[startR + ro][startC + co].notes = newBoard[startR + ro][startC + co].notes.filter((n) => n !== num);
              }
            }

            // Score gain
            const gained = 15;
            setScore((s) => s + gained);
            updateBest(score + gained);

            // Check Puzzle Completion
            let complete = true;
            for (let rr = 0; rr < 9; rr += 1) {
              for (let cc = 0; cc < 9; cc += 1) {
                if (newBoard[rr][cc].value !== puzzleData.solution[rr][cc]) {
                  complete = false;
                  break;
                }
              }
              if (!complete) break;
            }

            if (complete) {
              setGameState('WON');
              const finalBonus = activeMode.bonus + Math.max(0, 300 - timerSec);
              const finalScore = score + gained + finalBonus;
              setScore(finalScore);
              updateBest(finalScore);
              triggerPerfectHaptic(3);
              playPerfectSound(8);
              if (juiceRef.current) {
                juiceRef.current.celebrate(
                  'CYBER SUDOKU SOLVED!',
                  `+${finalBonus} PTS // TIME: ${formatTime(timerSec)}`,
                  activeMode.accent
                );
              }
            }
          }
        }

        setHistory((prev) => [...prev, previousBoard]);
        setBoard(newBoard);
      }
    },
    [gameState, selected, board, pencilMode, puzzleData, score, timerSec, activeMode, updateBest, mistakes]
  );

  // Erase button
  const handleErase = useCallback(() => {
    if (gameState !== 'PLAYING' || !selected) return;
    const [r, c] = selected;
    const cell = board[r][c];
    if (cell.initial) return;

    if (cell.value !== 0 || cell.notes.length > 0) {
      const previousBoard = cloneBoard(board);
      const newBoard = cloneBoard(board);
      newBoard[r][c].value = 0;
      newBoard[r][c].notes = [];
      newBoard[r][c].error = false;

      setHistory((prev) => [...prev, previousBoard]);
      setBoard(newBoard);
      triggerLightHaptic();
      playTapSound();
    }
  }, [gameState, selected, board]);

  // Undo button
  const handleUndo = useCallback(() => {
    if (history.length === 0 || gameState !== 'PLAYING') return;
    const prevBoard = history[history.length - 1];
    setHistory((h) => h.slice(0, h.length - 1));
    setBoard(prevBoard);
    triggerLightHaptic();
    playTapSound();
  }, [history, gameState]);

  // Hint button
  const handleHint = useCallback(() => {
    if (gameState !== 'PLAYING' || !selected) return;
    const [r, c] = selected;
    const cell = board[r][c];
    if (cell.initial) return;

    const correctVal = puzzleData.solution[r][c];
    if (cell.value === correctVal) return;

    const previousBoard = cloneBoard(board);
    const newBoard = cloneBoard(board);
    newBoard[r][c].value = correctVal;
    newBoard[r][c].notes = [];
    newBoard[r][c].error = false;

    setHistory((prev) => [...prev, previousBoard]);
    setBoard(newBoard);
    playPerfectSound(4);
    triggerLightHaptic();
    if (juiceRef.current) {
      juiceRef.current.popup(`HINT: ${correctVal}`, 'CELL DECODED', activeMode.accent);
    }
  }, [gameState, selected, board, puzzleData, activeMode]);

  // Format timer MM:SS
  const formatTime = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Selected cell coordinates and value
  const selRow = selected ? selected[0] : -1;
  const selCol = selected ? selected[1] : -1;
  const selVal = selected ? board[selRow][selCol]?.value : 0;

  // Remaining counts of each digit 1-9
  const digitCounts = {};
  for (let n = 1; n <= 9; n += 1) {
    let count = 0;
    for (let r = 0; r < 9; r += 1) {
      for (let c = 0; c < 9; c += 1) {
        if (board[r][c].value === n) count += 1;
      }
    }
    digitCounts[n] = 9 - count;
  }

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={localStyles.container}>
        <LinearGradient
          colors={['#03030A', '#080E24', '#101B3B']}
          style={StyleSheet.absoluteFillObject}
        />

        <MiniGameHeader
          title={`CYBER SUDOKU // ${activeMode.id}`}
          floorLabel="FLOOR 21 // QUANTUM 9×9"
          score={score}
          bestScore={bestScore}
          accentColor={activeMode.accent}
          onBack={onBackToHub}
          onReset={() => initGame()}
        />

        <View style={localStyles.body}>
          {/* Difficulty Modes Selector */}
          <View style={localStyles.modeSelectorBar}>
            {Object.keys(SUDOKU_MODES).map((k) => {
              const m = SUDOKU_MODES[k];
              const isSelected = k === modeKey;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => switchMode(k)}
                  style={[
                    localStyles.modePill,
                    isSelected && {
                      backgroundColor: `${m.accent}25`,
                      borderColor: m.accent,
                    },
                  ]}
                >
                  <Text
                    style={[
                      localStyles.modePillText,
                      { color: isSelected ? m.accent : COLORS.textMuted },
                    ]}
                  >
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Status Bar: Timer, Mistakes, Clues */}
          <View style={[localStyles.statusBar, { width: boardSize, borderColor: `${activeMode.accent}55` }]}>
            <View style={localStyles.statusItem}>
              <Text style={localStyles.statusLabel}>TIME</Text>
              <Text style={[localStyles.statusVal, { color: activeMode.accent }]}>
                {formatTime(timerSec)}
              </Text>
            </View>
            <View style={localStyles.statusDivider} />
            <View style={localStyles.statusItem}>
              <Text style={localStyles.statusLabel}>MISTAKES</Text>
              <Text
                style={[
                  localStyles.statusVal,
                  {
                    color:
                      mistakes >= 2
                        ? COLORS.danger
                        : mistakes === 1
                          ? COLORS.solarGold
                          : COLORS.matrixMint,
                  },
                ]}
              >
                {`${mistakes}/3`}
              </Text>
            </View>
            <View style={localStyles.statusDivider} />
            <View style={localStyles.statusItem}>
              <Text style={localStyles.statusLabel}>MODE</Text>
              <Text style={[localStyles.statusVal, { color: activeMode.accent }]}>
                {activeMode.id}
              </Text>
            </View>
          </View>

          {/* 9x9 Sudoku Board */}
          <View
            style={[
              localStyles.board,
              { width: boardSize, height: boardSize, borderColor: activeMode.accent },
            ]}
          >
            {board.map((row, r) => (
              <View key={`srow_${r}`} style={localStyles.row}>
                {row.map((cell, c) => {
                  const isSelectedCell = r === selRow && c === selCol;
                  const isSameHouse = r === selRow || c === selCol || (Math.floor(r / 3) === Math.floor(selRow / 3) && Math.floor(c / 3) === Math.floor(selCol / 3));
                  const isSameNumber = selVal > 0 && cell.value === selVal;

                  // 3x3 box borders
                  const borderRightThick = c === 2 || c === 5;
                  const borderBottomThick = r === 2 || r === 5;

                  let cellBg = 'rgba(6, 8, 22, 0.9)';
                  if (isSelectedCell) {
                    cellBg = `${activeMode.accent}45`;
                  } else if (isSameNumber) {
                    cellBg = 'rgba(0, 245, 255, 0.22)';
                  } else if (isSameHouse) {
                    cellBg = 'rgba(255, 255, 255, 0.05)';
                  }

                  let cellTextColor = '#FFFFFF';
                  if (cell.error) {
                    cellTextColor = COLORS.danger;
                  } else if (cell.initial) {
                    cellTextColor = '#E2E8F0';
                  } else {
                    cellTextColor = activeMode.accent;
                  }

                  return (
                    <Pressable
                      key={`scell_${r}_${c}`}
                      onPress={() => {
                        setSelected([r, c]);
                        triggerLightHaptic();
                      }}
                      style={[
                        localStyles.cell,
                        {
                          width: cellSize,
                          height: cellSize,
                          backgroundColor: cellBg,
                          borderRightWidth: borderRightThick ? 2 : 0.6,
                          borderRightColor: borderRightThick ? activeMode.accent : 'rgba(255, 255, 255, 0.12)',
                          borderBottomWidth: borderBottomThick ? 2 : 0.6,
                          borderBottomColor: borderBottomThick ? activeMode.accent : 'rgba(255, 255, 255, 0.12)',
                          borderLeftWidth: c === 0 ? 0 : 0.6,
                          borderTopWidth: r === 0 ? 0 : 0.6,
                          borderColor: isSelectedCell ? activeMode.accent : 'rgba(255, 255, 255, 0.12)',
                        },
                        isSelectedCell && localStyles.cellSelected,
                      ]}
                    >
                      {cell.value > 0 ? (
                        <Text style={[localStyles.cellText, { color: cellTextColor }]}>
                          {cell.value}
                        </Text>
                      ) : cell.notes.length > 0 ? (
                        <View style={localStyles.notesGrid}>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                            <Text
                              key={n}
                              style={[
                                localStyles.noteNum,
                                {
                                  color: cell.notes.includes(n)
                                    ? COLORS.solarGold
                                    : 'transparent',
                                },
                              ]}
                            >
                              {n}
                            </Text>
                          ))}
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ))}

            {/* Game Over Modal (3 Mistakes Exceeded) */}
            <GameResultModal
              visible={gameState === 'GAME_OVER'}
              type="GAME_OVER"
              title="SYSTEM LOCKDOWN"
              subtitle={`3/3 MISTAKES EXCEEDED // TIME: ${formatTime(timerSec)}`}
              score={score}
              bestScore={bestScore}
              accentColor={COLORS.danger}
              onRetry={() => initGame(modeKey)}
              retryLabel="TRY AGAIN"
              onBackToHub={onBackToHub}
            />

            {/* Victory Modal */}
            <GameResultModal
              visible={gameState === 'WON'}
              type="VICTORY"
              title="QUANTUM SOLVED!"
              subtitle={`CYBER SUDOKU SOLVED IN ${formatTime(timerSec)} // ${activeMode.label}`}
              score={score}
              bestScore={bestScore}
              accentColor={activeMode.accent}
              onRetry={() => initGame(modeKey)}
              retryLabel="NEW PUZZLE"
              onBackToHub={onBackToHub}
            />
          </View>

          {/* Action Tools Bar (Undo, Erase, Pencil Mode, Hint) */}
          <View style={[localStyles.actionsRow, { width: boardSize }]}>
            {/* Undo */}
            <Pressable
              onPress={handleUndo}
              style={({ pressed }) => [
                localStyles.actionBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={localStyles.actionBtnIcon}>↩️</Text>
              <Text style={localStyles.actionBtnLabel}>UNDO</Text>
            </Pressable>

            {/* Erase */}
            <Pressable
              onPress={handleErase}
              style={({ pressed }) => [
                localStyles.actionBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={localStyles.actionBtnIcon}>⌫</Text>
              <Text style={localStyles.actionBtnLabel}>ERASE</Text>
            </Pressable>

            {/* Pencil Mode Toggle */}
            <Pressable
              onPress={() => {
                triggerLightHaptic();
                playTapSound();
                setPencilMode((p) => !p);
              }}
              style={[
                localStyles.actionBtn,
                pencilMode && {
                  backgroundColor: 'rgba(255, 209, 102, 0.25)',
                  borderColor: COLORS.solarGold,
                },
              ]}
            >
              <Text style={localStyles.actionBtnIcon}>✏️</Text>
              <Text
                style={[
                  localStyles.actionBtnLabel,
                  pencilMode && { color: COLORS.solarGold, fontWeight: '900' },
                ]}
              >
                {pencilMode ? 'NOTES: ON' : 'NOTES: OFF'}
              </Text>
            </Pressable>

            {/* Hint */}
            <Pressable
              onPress={handleHint}
              style={({ pressed }) => [
                localStyles.actionBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={localStyles.actionBtnIcon}>💡</Text>
              <Text style={localStyles.actionBtnLabel}>HINT</Text>
            </Pressable>
          </View>

          {/* 1-9 Number Keypad with Remaining Digits */}
          <View style={[localStyles.keypadContainer, { width: boardSize, paddingBottom: safeBottom + 6 }]}>
            <View style={localStyles.keypadRow}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                const remaining = digitCounts[num] || 0;
                const isExhausted = remaining <= 0;

                return (
                  <Pressable
                    key={`num_${num}`}
                    onPress={() => handleNumberInput(num)}
                    style={({ pressed }) => [
                      localStyles.keyBtn,
                      isExhausted && { opacity: 0.35 },
                      pressed && { transform: [{ scale: 0.94 }], opacity: 0.8 },
                    ]}
                  >
                    <Text style={localStyles.keyNumText}>{num}</Text>
                    <Text style={localStyles.keyRemainText}>
                      {remaining > 0 ? remaining : '✓'}
                    </Text>
                  </Pressable>
                );
              })}
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
    paddingTop: 4,
    paddingBottom: 8,
  },
  modeSelectorBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  modePill: {
    paddingHorizontal: 12,
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
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(8, 12, 28, 0.85)',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 6,
  },
  statusItem: {
    alignItems: 'center',
  },
  statusDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  statusLabel: {
    fontSize: 8.5,
    fontFamily: monoFont,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.6,
  },
  statusVal: {
    fontSize: 13,
    fontFamily: monoFont,
    fontWeight: '900',
  },
  board: {
    backgroundColor: 'rgba(4, 6, 18, 0.96)',
    borderRadius: 14,
    borderWidth: 2,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellSelected: {
    borderWidth: 2,
  },
  cellText: {
    fontSize: 19,
    fontFamily: monoFont,
    fontWeight: '900',
  },
  notesGrid: {
    width: '90%',
    height: '90%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteNum: {
    width: '33.33%',
    textAlign: 'center',
    fontSize: 7.5,
    fontFamily: monoFont,
    fontWeight: '800',
    lineHeight: 9,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    marginTop: 6,
  },
  actionBtn: {
    flex: 1,
    marginHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(12, 16, 36, 0.88)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    paddingVertical: 6,
  },
  actionBtnIcon: {
    fontSize: 14,
    marginBottom: 2,
  },
  actionBtnLabel: {
    fontSize: 8.5,
    fontFamily: monoFont,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  keypadContainer: {
    marginTop: 4,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  keyBtn: {
    flex: 1,
    marginHorizontal: 2,
    backgroundColor: 'rgba(10, 16, 38, 0.94)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  keyNumText: {
    fontSize: 18,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  keyRemainText: {
    fontSize: 8,
    fontFamily: monoFont,
    fontWeight: '700',
    color: COLORS.cyan,
    marginTop: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 4, 14, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 99,
  },
  overlayCard: {
    width: '94%',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 14, 32, 0.98)',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: COLORS.danger,
    padding: 20,
  },
  overlayDangerTitle: {
    fontSize: 18,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.danger,
    letterSpacing: 1.4,
  },
  overlayDangerBadge: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.solarGold,
    backgroundColor: 'rgba(255, 0, 85, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 85, 0.45)',
    marginVertical: 10,
    letterSpacing: 0.8,
  },
  overlayTitle: {
    fontSize: 20,
    fontFamily: monoFont,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  overlaySub: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '700',
    color: '#E2E8F0',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: COLORS.cyan,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#030308',
    letterSpacing: 1.2,
  },
});
