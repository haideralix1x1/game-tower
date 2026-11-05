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

const STORAGE_KEY = '@game_tower:best_mines_v1';

export const MINE_MODES = {
  EASY: {
    id: 'EASY',
    label: 'EASY (6×6)',
    size: 6,
    mines: 5,
    accent: COLORS.matrixMint,
  },
  MEDIUM: {
    id: 'MEDIUM',
    label: 'MED (7×7)',
    size: 7,
    mines: 8,
    accent: COLORS.cyan,
  },
  HARD: {
    id: 'HARD',
    label: 'HARD (8×8)',
    size: 8,
    mines: 14,
    accent: COLORS.magenta,
  },
};

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

const buildBoard = (size, mines, safeR = -1, safeC = -1) => {
  const cells = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (__, c) => ({
      r,
      c,
      isMine: false,
      revealed: false,
      flagged: false,
      neighborMines: 0,
    }))
  );

  let placed = 0;
  while (placed < mines) {
    const r = Math.floor(Math.random() * size);
    const c = Math.floor(Math.random() * size);
    if (
      !cells[r][c].isMine &&
      !(Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1)
    ) {
      cells[r][c].isMine = true;
      placed += 1;
    }
  }

  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (cells[r][c].isMine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
          const nr = r + dr;
          const nc = c + dc;
          if (
            nr >= 0 &&
            nr < size &&
            nc >= 0 &&
            nc < size &&
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
  const juiceRef = useRef(null);

  const [modeKey, setModeKey] = useState('MEDIUM');
  const activeMode = MINE_MODES[modeKey] || MINE_MODES.MEDIUM;
  const gridSize = activeMode.size;
  const mineCount = activeMode.mines;
  const cellSize = Math.floor((boardSize - 20) / gridSize);

  const [board, setBoard] = useState(() => buildBoard(MINE_MODES.MEDIUM.size, MINE_MODES.MEDIUM.mines));
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

  const resetGame = useCallback((overrideModeKey) => {
    const m = overrideModeKey ? MINE_MODES[overrideModeKey] : activeMode;
    setBoard(buildBoard(m.size, m.mines));
    setFirstClick(true);
    setGameState('PLAYING');
    setScore(0);
    if (juiceRef.current) juiceRef.current.flash(m.accent);
  }, [activeMode]);

  const switchMode = useCallback((newKey) => {
    if (newKey === modeKey) return;
    triggerLightHaptic();
    playTapSound();
    setModeKey(newKey);
    resetGame(newKey);
  }, [modeKey, resetGame]);

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
        working = buildBoard(gridSize, mineCount, r, c);
        setFirstClick(false);
      }

      if (working[r][c].isMine) {
        for (let rr = 0; rr < gridSize; rr += 1) {
          for (let cc = 0; cc < gridSize; cc += 1) {
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
        const item = stack.pop();
        if (!item) continue;
        const [cr, cc] = item;
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
                nr < gridSize &&
                nc >= 0 &&
                nc < gridSize &&
                !working[nr][nc].revealed
              ) {
                stack.push([nr, nc]);
              }
            }
          }
        }
      }

      let unrevealedSafe = 0;
      for (let rr = 0; rr < gridSize; rr += 1) {
        for (let cc = 0; cc < gridSize; cc += 1) {
          if (!working[rr][cc].isMine && !working[rr][cc].revealed) {
            unrevealedSafe += 1;
          }
        }
      }

      const gained = newlyRevealed * 15 + (unrevealedSafe === 0 ? 300 : 0);
      const nextScore = score + gained;
      setBoard(working);
      setScore(nextScore);
      updateBest(nextScore);

      if (unrevealedSafe === 0) {
        setGameState('WON');
        triggerPerfectHaptic(3);
        playPerfectSound(8);
        if (juiceRef.current) {
          juiceRef.current.celebrate(
            'SECTOR SECURED!',
            `+300 MINE CLEAR // ${activeMode.id}`,
            activeMode.accent
          );
        }
      } else {
        triggerLightHaptic();
        playTapSound();
      }
    },
    [gameState, board, flagMode, firstClick, gridSize, mineCount, score, updateBest, activeMode]
  );

  const flagsUsed = board.reduce(
    (sum, row) => sum + row.filter((c) => c.flagged).length,
    0
  );

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={localStyles.container}>
        <LinearGradient
          colors={['#03030A', '#130718', '#260B2A']}
          style={StyleSheet.absoluteFillObject}
        />

        <MiniGameHeader
          title={`NEON MINES (${mineCount})`}
          floorLabel={`FLOOR 04 // ${activeMode.id} GRID`}
          score={score}
          bestScore={bestScore}
          accentColor={activeMode.accent}
          onBack={onBackToHub}
          onReset={() => resetGame()}
        />

        <View style={localStyles.body}>
          {/* Difficulty Modes Selector */}
          <View style={localStyles.modeSelectorBar}>
            {Object.keys(MINE_MODES).map((k) => {
              const m = MINE_MODES[k];
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

          <View style={[localStyles.controlRow, { width: boardSize }]}>
            <View style={[localStyles.mineCounter, { borderColor: activeMode.accent }]}>
              <Text style={localStyles.mineLabel}>PLASMA MINES // </Text>
              <Text style={[localStyles.mineValue, { color: activeMode.accent }]}>
                {Math.max(0, mineCount - flagsUsed)}
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
                flagMode && { backgroundColor: COLORS.solarGold, borderColor: COLORS.solarGold },
              ]}
            >
              <Text
                style={[
                  localStyles.modeToggleText,
                  flagMode && { color: '#030308' },
                ]}
              >
                {flagMode ? 'FLAG MODE: ON 🚩' : 'SCAN MODE (TAP)'}
              </Text>
            </Pressable>
          </View>

          <View
            style={[
              localStyles.board,
              { width: boardSize, height: boardSize, borderColor: `${activeMode.accent}55` },
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

                  const numColor = NUM_COLORS[cell.neighborMines] || '#FFFFFF';

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
                              { color: numColor, fontSize: gridSize === 6 ? 18 : gridSize === 7 ? 16 : 14 },
                            ]}
                          >
                            {cell.neighborMines}
                          </Text>
                        )}
                      {!cell.revealed && cell.flagged && (
                        <Text style={localStyles.flagIcon}>🚩</Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          <GameResultModal
            visible={gameState !== 'PLAYING'}
            type={gameState === 'WON' ? 'VICTORY' : 'GAME_OVER'}
            title={gameState === 'WON' ? 'SECTOR SECURED!' : 'MINE DETONATED!'}
            subtitle={
              gameState === 'WON'
                ? `ALL MINES CLEARED // ${activeMode.id} GRID`
                : 'PLASMA MINE TRIPPED // SECTOR COLLAPSED'
            }
            score={score}
            bestScore={bestScore}
            accentColor={gameState === 'WON' ? activeMode.accent : COLORS.danger}
            onRetry={() => resetGame()}
            retryLabel={gameState === 'WON' ? `NEXT ${activeMode.id}` : 'REBOOT SCAN'}
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
    marginBottom: 10,
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
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mineCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 127, 0.12)',
    borderWidth: 1.2,
    borderColor: COLORS.magenta,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  mineLabel: {
    fontSize: 9.5,
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
    backgroundColor: 'rgba(0, 245, 255, 0.12)',
    borderWidth: 1.2,
    borderColor: COLORS.cyan,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  modeToggleText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.cyan,
  },
  board: {
    backgroundColor: 'rgba(5, 5, 18, 0.94)',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 6,
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
  mineIcon: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  numText: {
    fontFamily: monoFont,
    fontWeight: '900',
  },
  flagIcon: {
    fontSize: 13,
  },
  restartBtn: {
    marginTop: 16,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 12,
  },
  restartBtnText: {
    fontSize: 11.5,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#030308',
  },
});
