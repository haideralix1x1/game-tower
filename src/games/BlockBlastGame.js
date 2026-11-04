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
} from '../utils/haptics';
import {
  playTapSound,
  playSliceSound,
  playPerfectSound,
} from '../utils/sound';

const STORAGE_KEY = '@game_tower:best_blockblast_v1';
const GRID_SIZE = 8;

const SHAPES = [
  { cells: [[0, 0]], color: '#00F5FF', name: 'DOT' },
  { cells: [[0, 0], [0, 1]], color: '#00F5D4', name: 'DUO-H' },
  { cells: [[0, 0], [1, 0]], color: '#00F5D4', name: 'DUO-V' },
  { cells: [[0, 0], [0, 1], [0, 2]], color: '#FF007F', name: 'BAR-3H' },
  { cells: [[0, 0], [1, 0], [2, 0]], color: '#FF007F', name: 'BAR-3V' },
  { cells: [[0, 0], [0, 1], [1, 0], [1, 1]], color: '#FFD166', name: 'QUAD' },
  { cells: [[0, 0], [1, 0], [1, 1]], color: '#C77DFF', name: 'CORNER' },
  { cells: [[0, 0], [0, 1], [0, 2], [1, 1]], color: '#FF5E00', name: 'T-CORE' },
];

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const randomHand = () =>
  Array.from({ length: 3 }, (_, i) => ({
    id: `piece_${i}_${Math.random()}`,
    ...SHAPES[Math.floor(Math.random() * SHAPES.length)],
    used: false,
  }));

export default function BlockBlastGame({ onBackToHub, onScoreUpdate }) {
  const { width } = useWindowDimensions();
  const boardSize = Math.min(352, width - 28);
  const cellSize = Math.floor((boardSize - 24) / GRID_SIZE);
  const juiceRef = useRef(null);

  const [grid, setGrid] = useState(() =>
    Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null))
  );
  const [hand, setHand] = useState(() => randomHand());
  const [selectedIdx, setSelectedIdx] = useState(0);
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

  const resetGame = useCallback(() => {
    setGrid(
      Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null))
    );
    setHand(randomHand());
    setSelectedIdx(0);
    setScore(0);
    if (juiceRef.current) juiceRef.current.flash(COLORS.cyan);
  }, []);

  const handleCellTap = useCallback(
    (r, c) => {
      const piece = hand[selectedIdx];
      if (!piece || piece.used) return;

      // Verify all cells fit and are empty
      for (const [dr, dc] of piece.cells) {
        const nr = r + dr;
        const nc = c + dc;
        if (
          nr < 0 ||
          nr >= GRID_SIZE ||
          nc < 0 ||
          nc >= GRID_SIZE ||
          grid[nr][nc] !== null
        ) {
          triggerSliceHaptic();
          if (juiceRef.current) juiceRef.current.shake(5, 3);
          return;
        }
      }

      const nextGrid = grid.map((row) => [...row]);
      for (const [dr, dc] of piece.cells) {
        nextGrid[r + dr][c + dc] = piece.color;
      }

      // Check full rows and columns to blast
      const fullRows = [];
      const fullCols = [];
      for (let rr = 0; rr < GRID_SIZE; rr += 1) {
        if (nextGrid[rr].every((v) => v !== null)) fullRows.push(rr);
      }
      for (let cc = 0; cc < GRID_SIZE; cc += 1) {
        if (nextGrid.every((row) => row[cc] !== null)) fullCols.push(cc);
      }

      fullRows.forEach((rr) => {
        for (let cc = 0; cc < GRID_SIZE; cc += 1) nextGrid[rr][cc] = null;
      });
      fullCols.forEach((cc) => {
        for (let rr = 0; rr < GRID_SIZE; rr += 1) nextGrid[rr][cc] = null;
      });

      const linesCleared = fullRows.length + fullCols.length;
      const gained =
        piece.cells.length * 10 + linesCleared * linesCleared * 60;
      const nextScore = score + gained;

      const nextHand = hand.map((h, idx) =>
        idx === selectedIdx ? { ...h, used: true } : h
      );
      const finalHand = nextHand.every((h) => h.used)
        ? randomHand()
        : nextHand;
      const nextValidIdx = finalHand.findIndex((h) => !h.used);

      setGrid(nextGrid);
      setHand(finalHand);
      setSelectedIdx(nextValidIdx >= 0 ? nextValidIdx : 0);
      setScore(nextScore);
      updateBest(nextScore);

      if (linesCleared > 0) {
        triggerPerfectHaptic(linesCleared);
        playPerfectSound(Math.min(8, linesCleared + 3));
        if (juiceRef.current) {
          juiceRef.current.celebrate(
            `${linesCleared}x LINE BLAST!`,
            `+${gained} PTS`,
            piece.color
          );
        }
      } else {
        triggerLightHaptic();
        playSliceSound();
      }
    },
    [hand, selectedIdx, grid, score, updateBest]
  );

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={localStyles.container}>
        <LinearGradient
          colors={['#03030A', '#0B0924', '#1A0B38']}
          style={StyleSheet.absoluteFillObject}
        />

        <MiniGameHeader
          title="BLOCK BLAST 8x8"
          floorLabel="FLOOR 14 // GRID BLASTER"
          score={score}
          bestScore={bestScore}
          accentColor="#FFD166"
          onBack={onBackToHub}
          onReset={resetGame}
        />

        <View style={localStyles.body}>
          <Text style={localStyles.hintBanner}>
            SELECT A MODULE BELOW & TAP GRID TO PLACE
          </Text>

          <View
            style={[
              localStyles.board,
              { width: boardSize, height: boardSize },
            ]}
          >
            {grid.map((row, rIdx) => (
              <View key={`brow_${rIdx}`} style={localStyles.row}>
                {row.map((color, cIdx) => (
                  <Pressable
                    key={`bcell_${rIdx}_${cIdx}`}
                    onPress={() => handleCellTap(rIdx, cIdx)}
                    style={[
                      localStyles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: color || 'rgba(255, 255, 255, 0.05)',
                        borderColor: color
                          ? '#FFFFFF'
                          : 'rgba(255, 255, 255, 0.12)',
                      },
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>

          {/* 3-Piece Dock */}
          <View style={[localStyles.dockRow, { width: boardSize }]}>
            {hand.map((piece, idx) => {
              const selected = idx === selectedIdx && !piece.used;
              return (
                <Pressable
                  key={piece.id}
                  disabled={piece.used}
                  onPress={() => {
                    triggerLightHaptic();
                    playTapSound();
                    setSelectedIdx(idx);
                  }}
                  style={[
                    localStyles.dockCard,
                    selected && {
                      borderColor: piece.color,
                      backgroundColor: `${piece.color}22`,
                    },
                    piece.used && { opacity: 0.25 },
                  ]}
                >
                  <Text
                    style={[localStyles.dockName, { color: piece.color }]}
                  >
                    {piece.name}
                  </Text>
                  <Text style={localStyles.dockSub}>
                    {`${piece.cells.length} CELLS`}
                  </Text>
                </Pressable>
              );
            })}
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
    justifyContent: 'center',
    paddingBottom: 16,
  },
  hintBanner: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.solarGold,
    letterSpacing: 1,
    marginBottom: 10,
  },
  board: {
    backgroundColor: 'rgba(8, 8, 22, 0.92)',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 209, 102, 0.4)',
    padding: 8,
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cell: {
    borderRadius: 6,
    borderWidth: 1,
  },
  dockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 10,
  },
  dockCard: {
    flex: 1,
    height: 68,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockName: {
    fontSize: 13,
    fontFamily: monoFont,
    fontWeight: '900',
  },
  dockSub: {
    fontSize: 9.5,
    fontFamily: monoFont,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
});
