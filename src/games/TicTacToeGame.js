import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  triggerSliceHaptic,
  triggerPerfectHaptic,
  triggerGameOverHaptic,
} from '../utils/haptics';
import {
  playTapSound,
  playPerfectSound,
  playGameOverSound,
} from '../utils/sound';

const STORAGE_KEY = '@game_tower:best_ttt_v1';

export const TTT_MODES = {
  EASY: { id: 'EASY', label: 'EASY (DRONE)', accent: COLORS.matrixMint },
  MEDIUM: { id: 'MEDIUM', label: 'MED (TACTICAL)', accent: COLORS.cyan },
  HARD: { id: 'HARD', label: 'HARD (APEX AI)', accent: COLORS.magenta },
};

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const checkWinner = (cells) => {
  for (const [a, b, c] of WIN_LINES) {
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
      return { winner: cells[a], line: [a, b, c] };
    }
  }
  if (cells.every(Boolean)) return { winner: 'DRAW', line: [] };
  return null;
};

// Minimax algorithm for unbeatable Hard AI
const minimax = (board, depth, isMaximizing) => {
  const win = checkWinner(board);
  if (win?.winner === 'O') return 10 - depth;
  if (win?.winner === 'X') return depth - 10;
  if (win?.winner === 'DRAW') return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < 9; i += 1) {
      if (!board[i]) {
        board[i] = 'O';
        best = Math.max(best, minimax(board, depth + 1, false));
        board[i] = null;
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i += 1) {
      if (!board[i]) {
        board[i] = 'X';
        best = Math.min(best, minimax(board, depth + 1, true));
        board[i] = null;
      }
    }
    return best;
  }
};

const pickAiMove = (cells, difficulty = 'MEDIUM') => {
  const empty = cells
    .map((v, idx) => (v === null ? idx : -1))
    .filter((idx) => idx !== -1);
  if (empty.length === 0) return -1;

  // EASY: 70% random moves
  if (difficulty === 'EASY') {
    if (Math.random() < 0.70) {
      return empty[Math.floor(Math.random() * empty.length)];
    }
  }

  // HARD: Minimax (Unbeatable Apex AI)
  if (difficulty === 'HARD') {
    let bestVal = -Infinity;
    let bestMove = empty[0];
    for (const idx of empty) {
      const copy = [...cells];
      copy[idx] = 'O';
      const moveVal = minimax(copy, 0, false);
      if (moveVal > bestVal) {
        bestVal = moveVal;
        bestMove = idx;
      }
    }
    return bestMove;
  }

  // MEDIUM: Heuristic smart moves (win, block, center, random)
  for (let i = 0; i < 9; i += 1) {
    if (!cells[i]) {
      const copy = [...cells];
      copy[i] = 'O';
      if (checkWinner(copy)?.winner === 'O') return i;
    }
  }
  for (let i = 0; i < 9; i += 1) {
    if (!cells[i]) {
      const copy = [...cells];
      copy[i] = 'X';
      if (checkWinner(copy)?.winner === 'X') return i;
    }
  }
  if (!cells[4]) return 4;
  return empty[Math.floor(Math.random() * empty.length)];
};

export default function TicTacToeGame({ onBackToHub, onScoreUpdate }) {
  const { width } = useWindowDimensions();
  const boardSize = Math.min(340, width - 32);
  const cellSize = Math.floor((boardSize - 32) / 3);
  const juiceRef = useRef(null);

  const [difficulty, setDifficulty] = useState('MEDIUM');
  const activeMode = TTT_MODES[difficulty] || TTT_MODES.MEDIUM;

  const [cells, setCells] = useState(Array(9).fill(null));
  const [vsAi, setVsAi] = useState(true);
  const [turn, setTurn] = useState('X');
  const [result, setResult] = useState(null);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) setBestScore(parseInt(saved, 10) || 0);
      } catch {}
    })();
  }, []);

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

  const resetRound = useCallback(() => {
    setCells(Array(9).fill(null));
    setTurn('X');
    setResult(null);
    if (juiceRef.current) juiceRef.current.flash(activeMode.accent);
  }, [activeMode]);

  const handleCellTap = useCallback(
    (idx) => {
      if (result || cells[idx]) return;

      triggerLightHaptic();
      playTapSound();

      const next = [...cells];
      next[idx] = turn;
      const outcome = checkWinner(next);

      if (outcome) {
        setCells(next);
        setResult(outcome);

        if (outcome.winner === 'X') {
          const winBonus = difficulty === 'HARD' ? 250 : difficulty === 'MEDIUM' ? 100 : 50;
          const nextScore = score + winBonus;
          setScore(nextScore);
          updateBest(nextScore);
          triggerPerfectHaptic(3);
          playPerfectSound(8);
          if (juiceRef.current) {
            juiceRef.current.celebrate(
              'X TRIUMPHS!',
              `+${winBonus} PTS // ${activeMode.label}`,
              COLORS.cyan
            );
          }
        } else if (outcome.winner === 'DRAW') {
          const drawBonus = difficulty === 'HARD' ? 100 : 25;
          const nextScore = score + drawBonus;
          setScore(nextScore);
          updateBest(nextScore);
          playTapSound();
          if (juiceRef.current) {
            juiceRef.current.popup('STALEMATE', `+${drawBonus} PTS (DRAW)`, COLORS.solarGold);
          }
        } else {
          triggerGameOverHaptic();
          playGameOverSound();
          if (juiceRef.current) {
            juiceRef.current.shake(10, 6);
            juiceRef.current.popup('AI CLAIMS GRID', 'DEFEAT', COLORS.danger);
          }
        }
        return;
      }

      const nextTurn = turn === 'X' ? 'O' : 'X';
      setCells(next);
      setTurn(nextTurn);

      // AI response move
      if (vsAi && nextTurn === 'O') {
        setTimeout(() => {
          const aiMove = pickAiMove(next, difficulty);
          if (aiMove === -1) return;

          const aiBoard = [...next];
          aiBoard[aiMove] = 'O';
          const aiOutcome = checkWinner(aiBoard);

          triggerLightHaptic();
          playTapSound();
          setCells(aiBoard);

          if (aiOutcome) {
            setResult(aiOutcome);
            if (aiOutcome.winner === 'O') {
              triggerGameOverHaptic();
              playGameOverSound();
              if (juiceRef.current) {
                juiceRef.current.shake(10, 6);
                juiceRef.current.popup('AI DEFEAT', 'CYBER CORE WINS', COLORS.danger);
              }
            } else if (aiOutcome.winner === 'DRAW') {
              const drawBonus = difficulty === 'HARD' ? 100 : 25;
              const nextScore = score + drawBonus;
              setScore(nextScore);
              updateBest(nextScore);
              if (juiceRef.current) {
                juiceRef.current.popup('STALEMATE', `+${drawBonus} PTS`, COLORS.solarGold);
              }
            }
          } else {
            setTurn('X');
          }
        }, 220);
      }
    },
    [result, cells, turn, vsAi, score, difficulty, activeMode, updateBest]
  );

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={localStyles.container}>
        <LinearGradient
          colors={['#03030A', '#0D0820', '#1C0B35']}
          style={StyleSheet.absoluteFillObject}
        />

        <MiniGameHeader
          title={`TIC-TAC-TOE // ${activeMode.id}`}
          floorLabel="FLOOR 13 // TACTICAL XO"
          score={score}
          bestScore={bestScore}
          accentColor={activeMode.accent}
          onBack={onBackToHub}
          onReset={resetRound}
        />

        <View style={localStyles.body}>
          {/* Mode Selector (EASY / MEDIUM / HARD) */}
          {vsAi && (
            <View style={localStyles.modeSelectorBar}>
              {Object.keys(TTT_MODES).map((k) => {
                const m = TTT_MODES[k];
                const isSelected = k === difficulty;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => {
                      if (difficulty === k) return;
                      triggerLightHaptic();
                      playTapSound();
                      setDifficulty(k);
                      resetRound();
                    }}
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
          )}

          <View style={[localStyles.topRow, { width: boardSize }]}>
            <Text style={localStyles.turnLabel}>
              {result
                ? result.winner === 'DRAW'
                  ? 'STALEMATE DRAW!'
                  : `WINNER: ${result.winner}!`
                : `ACTIVE TURN: ${turn}`}
            </Text>

            <Pressable
              onPress={() => {
                setVsAi((v) => !v);
                resetRound();
              }}
              style={localStyles.modeBtn}
            >
              <Text style={localStyles.modeBtnText}>
                {vsAi ? 'VS AI' : '2 PLAYERS'}
              </Text>
            </Pressable>
          </View>

          <View
            style={[
              localStyles.board,
              { width: boardSize, height: boardSize },
            ]}
          >
            {cells.map((val, idx) => {
              const inWinLine = result?.line?.includes(idx);
              return (
                <Pressable
                  key={`xo_${idx}`}
                  onPress={() => handleCellTap(idx)}
                  style={[
                    localStyles.cell,
                    {
                      width: cellSize,
                      height: cellSize,
                      borderColor: inWinLine
                        ? COLORS.solarGold
                        : val === 'X'
                          ? COLORS.cyan
                          : val === 'O'
                            ? COLORS.magenta
                            : 'rgba(255, 255, 255, 0.16)',
                      backgroundColor: inWinLine
                        ? 'rgba(255, 209, 102, 0.22)'
                        : 'rgba(255, 255, 255, 0.04)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      localStyles.cellText,
                      {
                        color:
                          val === 'X'
                            ? COLORS.cyan
                            : val === 'O'
                              ? COLORS.magenta
                              : 'transparent',
                      },
                    ]}
                  >
                    {val || ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <GameResultModal
            visible={result !== null}
            type={
              result?.winner === 'X'
                ? 'VICTORY'
                : result?.winner === 'DRAW'
                  ? 'DRAW'
                  : 'GAME_OVER'
            }
            title={
              result?.winner === 'X'
                ? vsAi
                  ? 'AI CORE DEFEATED!'
                  : 'PLAYER X WINS!'
                : result?.winner === 'DRAW'
                  ? 'STALEMATE TIE'
                  : vsAi
                    ? 'AI CORE PREVAILED'
                    : 'PLAYER O WINS!'
            }
            subtitle={
              vsAi
                ? `DIFFICULTY: ${activeMode.label}`
                : 'LOCAL 2-PLAYER MATCH COMPLETED'
            }
            score={score}
            bestScore={bestScore}
            accentColor={
              result?.winner === 'X'
                ? COLORS.cyan
                : result?.winner === 'DRAW'
                  ? COLORS.solarGold
                  : COLORS.magenta
            }
            onRetry={resetRound}
            retryLabel="NEW MATCH"
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
    paddingBottom: 20,
  },
  modeSelectorBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  modePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
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
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  turnLabel: {
    fontSize: 13,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.cyan,
  },
  modeBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  modeBtnText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#FF75B5',
  },
  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
    backgroundColor: 'rgba(6, 6, 20, 0.94)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 245, 255, 0.35)',
    padding: 10,
  },
  cell: {
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 42,
    fontFamily: monoFont,
    fontWeight: '900',
  },
  nextBtn: {
    marginTop: 18,
    backgroundColor: COLORS.cyan,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
  },
  nextBtnText: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#030308',
    letterSpacing: 1.5,
  },
});
