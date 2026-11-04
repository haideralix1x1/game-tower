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

const STORAGE_KEY = '@game_tower:best_ttt_v1';

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

const pickAiMove = (cells) => {
  // 1. Win if possible
  for (let i = 0; i < 9; i += 1) {
    if (!cells[i]) {
      const copy = [...cells];
      copy[i] = 'O';
      if (checkWinner(copy)?.winner === 'O') return i;
    }
  }
  // 2. Block player X win
  for (let i = 0; i < 9; i += 1) {
    if (!cells[i]) {
      const copy = [...cells];
      copy[i] = 'X';
      if (checkWinner(copy)?.winner === 'X') return i;
    }
  }
  // 3. Take center
  if (!cells[4]) return 4;
  // 4. Random available
  const empty = cells
    .map((v, idx) => (v === null ? idx : -1))
    .filter((idx) => idx !== -1);
  return empty[Math.floor(Math.random() * empty.length)];
};

export default function TicTacToeGame({ onBackToHub, onScoreUpdate }) {
  const { width } = useWindowDimensions();
  const boardSize = Math.min(340, width - 32);
  const cellSize = Math.floor((boardSize - 32) / 3);
  const juiceRef = useRef(null);

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
    if (juiceRef.current) juiceRef.current.flash(COLORS.cyan);
  }, []);

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
          const nextScore = score + 100;
          setScore(nextScore);
          updateBest(nextScore);
          triggerPerfectHaptic(3);
          playPerfectSound(6);
          if (juiceRef.current) {
            juiceRef.current.celebrate('PLAYER X WINS!', '+100 PTS', COLORS.cyan);
          }
        } else if (outcome.winner === 'DRAW') {
          const nextScore = score + 25;
          setScore(nextScore);
          updateBest(nextScore);
          if (juiceRef.current) {
            juiceRef.current.popup('GRID DRAW', '+25 PTS', COLORS.solarGold);
          }
        } else {
          triggerGameOverHaptic();
          playGameOverSound();
          if (juiceRef.current) {
            juiceRef.current.celebrate('O WINS!', 'ROUND OVER', COLORS.magenta);
          }
        }
        return;
      }

      if (vsAi) {
        const aiIdx = pickAiMove(next);
        if (aiIdx !== undefined) {
          next[aiIdx] = 'O';
          const aiOutcome = checkWinner(next);
          if (aiOutcome) {
            setResult(aiOutcome);
            if (aiOutcome.winner === 'O') {
              triggerGameOverHaptic();
              playGameOverSound();
              if (juiceRef.current) {
                juiceRef.current.shake(10, 6);
                juiceRef.current.flash(COLORS.danger);
              }
            } else if (aiOutcome.winner === 'DRAW') {
              const nextScore = score + 25;
              setScore(nextScore);
              updateBest(nextScore);
            }
          }
        }
        setCells(next);
      } else {
        setCells(next);
        setTurn(turn === 'X' ? 'O' : 'X');
      }
    },
    [result, cells, turn, vsAi, score, updateBest]
  );

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={localStyles.container}>
        <LinearGradient
          colors={['#03030A', '#0D0824', '#1B0C38']}
          style={StyleSheet.absoluteFillObject}
        />

        <MiniGameHeader
          title="CYBER TIC-TAC-TOE"
          floorLabel="FLOOR 13 // TACTICAL XO"
          score={score}
          bestScore={bestScore}
          accentColor={COLORS.cyan}
          onBack={onBackToHub}
          onReset={resetRound}
        />

        <View style={localStyles.body}>
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
                {vsAi ? 'MODE: VS CYBER AI' : 'MODE: 2 PLAYERS'}
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
                      localStyles.symbol,
                      {
                        color: val === 'X' ? COLORS.cyan : COLORS.magenta,
                      },
                    ]}
                  >
                    {val || ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {result && (
            <Pressable onPress={resetRound} style={localStyles.nextBtn}>
              <Text style={localStyles.nextBtnText}>NEXT MATCH</Text>
            </Pressable>
          )}
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
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  turnLabel: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.cyan,
  },
  modeBtn: {
    backgroundColor: 'rgba(255, 0, 127, 0.18)',
    borderWidth: 1,
    borderColor: COLORS.magenta,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
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
    backgroundColor: 'rgba(8, 8, 22, 0.92)',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 245, 255, 0.38)',
    padding: 8,
  },
  cell: {
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbol: {
    fontSize: 44,
    fontFamily: monoFont,
    fontWeight: '900',
  },
  nextBtn: {
    marginTop: 20,
    backgroundColor: COLORS.cyan,
    paddingHorizontal: 26,
    paddingVertical: 12,
    borderRadius: 14,
  },
  nextBtnText: {
    fontSize: 12.5,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#030308',
    letterSpacing: 1.5,
  },
});
