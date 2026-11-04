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

const STORAGE_KEY = '@game_tower:best_mines_v1';
const GRID_SIZE = 7;
const MINE_COUNT = 8;

const NUM_COLORS = {
  1: '#00F5FF',
  2: '#00F5D4',
  3: '#FFD166',
  4: '#FF007F',
  5: '#FF2A55',
  6: '#C77DFF',
  7: '#FFFFFF',
  8: '#FF5E00',
};

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const buildBoard = (safeR = -1, safeC = -1) => {
  const cells = Array.from({ length: GRID_SIZE }, (_, r) =>
    Array.from({ length: GRID_SIZE }, (__, c) => ({
      r,
      c,
      isMine: false,
      revealed: false,
      flagged: false,
      neighborMines: 0,
    }))
  );

  let placed = 0;
  while (placed < MINE_COUNT) {
    const r = Math.floor(Math.random() * GRID_SIZE);
    const c = Math.floor(Math.random() * GRID_SIZE);
    if (
      !cells[r][c].isMine &&
      !(Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1)
    ) {
      cells[r][c].isMine = true;
      placed += 1;
    }
  }

  for (let r = 0; r < GRID_SIZE; r += 1) {
    for (let c = 0; c < GRID_SIZE; c += 1) {
      if (cells[r][c].isMine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
          const nr = r + dr;
          const nc = c + dc;
          if (
            nr >= 0 &&
            nr < GRID_SIZE &&
            nc >= 0 &&
            nc < GRID_SIZE &&
            cells[nr][nc].isMine
          ) {
            count += 1;
          }
        }
      }
      cells[r][c].neighborMines = count;
    }
  }

  return cells;
};

export default function NeonMinesGame({ onBackToHub, onScoreUpdate }) {
  const { width } = useWindowDimensions();
  const boardSize = Math.min(364, width - 28);
  const cellSize = Math.floor((boardSize - 32) / GRID_SIZE);
  const juiceRef = useRef(null);

  const [board, setBoard] = useState(() => buildBoard());
  const [firstClick, setFirstClick] = useState(true);
  const [flagMode, setFlagMode] = useState(false);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameState, setGameState] = useState('PLAYING');

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

  const resetGame = useCallback(() => {
    setBoard(buildBoard());
    setFirstClick(true);
    setGameState('PLAYING');
    setScore(0);
    if (juiceRef.current) juiceRef.current.flash(COLORS.magenta);
  }, []);

  const handleCellPress = useCallback(
    (r, c) => {
      if (gameState !== 'PLAYING') return;

      let working = board.map((row) => row.map((cell) => ({ ...cell })));

      if (flagMode) {
        if (working[r][c].revealed) return;
        working[r][c].flagged = !working[r][c].flagged;
        triggerLightHaptic();
        playTapSound();
        setBoard(working);
        return;
      }

      if (working[r][c].flagged || working[r][c].revealed) return;

      if (firstClick) {
        working = buildBoard(r, c);
        setFirstClick(false);
      }

      if (working[r][c].isMine) {
        for (let rr = 0; rr < GRID_SIZE; rr += 1) {
          for (let cc = 0; cc < GRID_SIZE; cc += 1) {
            if (working[rr][cc].isMine) working[rr][cc].revealed = true;
          }
        }
        setBoard(working);
        setGameState('LOST');
        triggerGameOverHaptic();
        playGameOverSound();
        if (juiceRef.current) {
          juiceRef.current.celebrate(
            'MINE DETONATED!',
            'GRID COLLAPSE',
            COLORS.danger
          );
        }
        return;
      }

      const stack = [[r, c]];
      let newlyRevealed = 0;
      while (stack.length > 0) {
        const [cr, cc] = stack.pop();
        const cell = working[cr][cc];
        if (cell.revealed || cell.flagged) continue;
        cell.revealed = true;
        newlyRevealed += 1;

        if (cell.neighborMines === 0 && !cell.isMine) {
          for (let dr = -1; dr <= 1; dr += 1) {
            for (let dc = -1; dc <= 1; dc += 1) {
              const nr = cr + dr;
              const nc = cc + dc;
              if (
                nr >= 0 &&
                nr < GRID_SIZE &&
                nc >= 0 &&
                nc < GRID_SIZE &&
                !working[nr][nc].revealed
              ) {
                stack.push([nr, nc]);
              }
            }
          }
        }
      }

      let unrevealedSafe = 0;
      for (let rr = 0; rr < GRID_SIZE; rr += 1) {
        for (let cc = 0; cc < GRID_SIZE; cc += 1) {
          if (!working[rr][cc].isMine && !working[rr][cc].revealed) {
            unrevealedSafe += 1;
          }
        }
      }

      const gained = newlyRevealed * 15 + (unrevealedSafe === 0 ? 250 : 0);
      const nextScore = score + gained;
      setBoard(working);
      setScore(nextScore);
      updateBest(nextScore);

      if (unrevealedSafe === 0) {
        setGameState('WON');
        triggerPerfectHaptic(3);
        playPerfectSound(6);
        if (juiceRef.current) {
          juiceRef.current.celebrate(
            'SECTOR CLEARED!',
            '+250 BONUS',
            COLORS.matrixMint
          );
        }
      } else if (newlyRevealed > 3) {
        triggerSliceHaptic();
        playPerfectSound(2);
        if (juiceRef.current) {
          juiceRef.current.shake(5, 4);
          juiceRef.current.burst(undefined, undefined, COLORS.cyan, 16);
          juiceRef.current.popup(
            `CASCADE +${gained}`,
            `${newlyRevealed} CELLS`,
            COLORS.cyan
          );
        }
      } else {
        triggerLightHaptic();
        playSliceSound();
      }
    },
    [board, flagMode, firstClick, gameState, score, updateBest]
  );

  const flagsUsed = board.flat().filter((c) => c.flagged).length;

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={localStyles.container}>
        <LinearGradient
          colors={['#03030A', '#12061E', '#22092E']}
          style={StyleSheet.absoluteFillObject}
        />

        <MiniGameHeader
          title="NEON MINES"
          floorLabel="FLOOR 04 // TACTICAL GRID"
          score={score}
          bestScore={bestScore}
          accentColor={COLORS.magenta}
          onBack={onBackToHub}
          onReset={resetGame}
        />

        <View style={localStyles.body}>
          <View style={[localStyles.controlRow, { width: boardSize }]}>
            <View style={localStyles.mineCounter}>
              <Text style={localStyles.mineLabel}>PLASMA MINES // </Text>
              <Text style={localStyles.mineValue}>
                {Math.max(0, MINE_COUNT - flagsUsed)}
              </Text>
            </View>

            <Pressable
              onPress={() => {
                triggerLightHaptic();
                playTapSound();
                setFlagMode((prev) => !prev);
              }}
              style={[
                localStyles.modeToggle,
                flagMode && localStyles.modeToggleActive,
              ]}
            >
              <Text
                style={[
                  localStyles.modeToggleText,
                  flagMode && { color: '#030308' },
                ]}
              >
                {flagMode ? 'FLAG MODE: ON' : 'SCAN MODE (TAP)'}
              </Text>
            </Pressable>
          </View>

          <View
            style={[
              localStyles.board,
              { width: boardSize, height: boardSize },
            ]}
          >
            {board.map((row, rIdx) => (
              <View key={`mrow_${rIdx}`} style={localStyles.row}>
                {row.map((cell, cIdx) => {
                  const bg = cell.revealed
                    ? cell.isMine
                      ? '#FF2A55'
                      : 'rgba(0, 245, 255, 0.08)'
                    : cell.flagged
                      ? 'rgba(255, 209, 102, 0.22)'
                      : 'rgba(255, 255, 255, 0.07)';

                  const border = cell.revealed
                    ? cell.isMine
                      ? '#FFFFFF'
                      : 'rgba(0, 245, 255, 0.28)'
                    : cell.flagged
                      ? COLORS.solarGold
                      : 'rgba(255, 0, 127, 0.35)';

                  return (
                    <Pressable
                      key={`mcell_${rIdx}_${cIdx}`}
                      onPress={() => handleCellPress(rIdx, cIdx)}
                      onLongPress={() => {
                        if (cell.revealed) return;
                        const copy = board.map((r) => r.map((x) => ({ ...x })));
                        copy[rIdx][cIdx].flagged = !copy[rIdx][cIdx].flagged;
                        triggerSliceHaptic();
                        setBoard(copy);
                      }}
                      style={[
                        localStyles.cell,
                        {
                          width: cellSize,
                          height: cellSize,
                          backgroundColor: bg,
                          borderColor: border,
                        },
                      ]}
                    >
                      {cell.revealed && cell.isMine && (
                        <Text style={localStyles.mineIcon}>✸</Text>
                      )}
                      {cell.revealed &&
                        !cell.isMine &&
                        cell.neighborMines > 0 && (
                          <Text
                            style={[
                              localStyles.numText,
                              { color: NUM_COLORS[cell.neighborMines] || '#FFF' },
                            ]}
                          >
                            {cell.neighborMines}
                          </Text>
                        )}
                      {!cell.revealed && cell.flagged && (
                        <Text style={localStyles.flagIcon}>⚑</Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          {gameState !== 'PLAYING' && (
            <View style={localStyles.resultBanner}>
              <Text
                style={[
                  localStyles.resultTitle,
                  {
                    color:
                      gameState === 'WON' ? COLORS.matrixMint : COLORS.danger,
                  },
                ]}
              >
                {gameState === 'WON'
                  ? 'SECTOR CLEARED! +250 BONUS'
                  : 'MINE DETONATED!'}
              </Text>
              <Pressable onPress={resetGame} style={localStyles.retryBtn}>
                <Text style={localStyles.retryText}>NEW MINEFIELD</Text>
              </Pressable>
            </View>
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
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  mineCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 127, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 127, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  mineLabel: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  mineValue: {
    fontSize: 14,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.magenta,
  },
  modeToggle: {
    backgroundColor: 'rgba(255, 209, 102, 0.15)',
    borderWidth: 1.2,
    borderColor: COLORS.solarGold,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  modeToggleActive: {
    backgroundColor: COLORS.solarGold,
  },
  modeToggleText: {
    fontSize: 10.5,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.solarGold,
  },
  board: {
    backgroundColor: 'rgba(8, 8, 22, 0.92)',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 0, 127, 0.4)',
    padding: 8,
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cell: {
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: {
    fontSize: 17,
    fontFamily: monoFont,
    fontWeight: '900',
  },
  mineIcon: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  flagIcon: {
    fontSize: 16,
    color: COLORS.solarGold,
  },
  resultBanner: {
    marginTop: 18,
    alignItems: 'center',
    gap: 10,
  },
  resultTitle: {
    fontSize: 16,
    fontFamily: monoFont,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  retryBtn: {
    backgroundColor: COLORS.cyan,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 12,
  },
  retryText: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#030308',
    letterSpacing: 1.4,
  },
});
