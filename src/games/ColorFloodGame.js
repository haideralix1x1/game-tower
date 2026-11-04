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

const STORAGE_KEY = '@game_tower:best_flood_v1';
const GRID_SIZE = 8;
const MAX_MOVES = 18;

const FLOOD_COLORS = [
  '#00F5FF',
  '#FF007F',
  '#00F5D4',
  '#FFD166',
  '#9D4EDD',
  '#FF5E00',
];

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const createFloodGrid = () =>
  Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () =>
      Math.floor(Math.random() * FLOOD_COLORS.length)
    )
  );

export default function ColorFloodGame({ onBackToHub, onScoreUpdate }) {
  const { width } = useWindowDimensions();
  const boardSize = Math.min(352, width - 32);
  const cellSize = Math.floor((boardSize - 24) / GRID_SIZE);
  const juiceRef = useRef(null);

  const [grid, setGrid] = useState(() => createFloodGrid());
  const [movesLeft, setMovesLeft] = useState(MAX_MOVES);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [status, setStatus] = useState('PLAYING');

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

  const resetBoard = useCallback(() => {
    setGrid(createFloodGrid());
    setMovesLeft(MAX_MOVES);
    setStatus('PLAYING');
    if (juiceRef.current) juiceRef.current.flash('#FF5E00');
  }, []);

  const handleSelectColor = useCallback(
    (targetColorIdx) => {
      if (status !== 'PLAYING') return;
      const startColor = grid[0][0];
      if (targetColorIdx === startColor) return;

      const nextGrid = grid.map((r) => [...r]);
      const visited = Array.from({ length: GRID_SIZE }, () =>
        Array(GRID_SIZE).fill(false)
      );
      const queue = [[0, 0]];
      visited[0][0] = true;

      while (queue.length > 0) {
        const [r, c] = queue.shift();
        nextGrid[r][c] = targetColorIdx;

        const dirs = [
          [r - 1, c],
          [r + 1, c],
          [r, c - 1],
          [r, c + 1],
        ];
        for (const [nr, nc] of dirs) {
          if (
            nr >= 0 &&
            nr < GRID_SIZE &&
            nc >= 0 &&
            nc < GRID_SIZE &&
            !visited[nr][nc] &&
            grid[nr][nc] === startColor
          ) {
            visited[nr][nc] = true;
            queue.push([nr, nc]);
          }
        }
      }

      const nextMoves = movesLeft - 1;
      setGrid(nextGrid);
      setMovesLeft(nextMoves);

      const allSame = nextGrid.every((row) =>
        row.every((c) => c === targetColorIdx)
      );

      if (allSame) {
        const gained = 150 + nextMoves * 35;
        const nextScore = score + gained;
        setScore(nextScore);
        setStatus('WON');
        updateBest(nextScore);
        triggerPerfectHaptic(3);
        playPerfectSound(6);
        if (juiceRef.current) {
          juiceRef.current.celebrate(
            'CHROMA UNIFIED!',
            `+${gained} PTS`,
            FLOOD_COLORS[targetColorIdx]
          );
        }
      } else if (nextMoves <= 0) {
        setStatus('LOST');
        triggerGameOverHaptic();
        playGameOverSound();
        if (juiceRef.current) {
          juiceRef.current.shake(10, 6);
          juiceRef.current.flash(COLORS.danger);
        }
      } else {
        triggerLightHaptic();
        playTapSound();
        if (juiceRef.current) {
          juiceRef.current.shake(3, 2);
          juiceRef.current.burst(
            undefined,
            undefined,
            FLOOD_COLORS[targetColorIdx],
            10
          );
        }
      }
    },
    [status, grid, movesLeft, score, updateBest]
  );

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={localStyles.container}>
        <LinearGradient
          colors={['#03030A', '#100826', '#1E0E3A']}
          style={StyleSheet.absoluteFillObject}
        />

        <MiniGameHeader
          title="CHROMA FLOOD"
          floorLabel="FLOOR 08 // VIRAL SPREAD"
          score={score}
          bestScore={bestScore}
          accentColor="#FF5E00"
          onBack={onBackToHub}
          onReset={resetBoard}
        />

        <View style={localStyles.body}>
          <View style={[localStyles.statusRow, { width: boardSize }]}>
            <Text style={localStyles.statText}>
              UNIFY ALL CELLS FROM TOP-LEFT
            </Text>
            <Text style={[localStyles.statText, { color: COLORS.cyan }]}>
              {`MOVES LEFT: ${movesLeft}`}
            </Text>
          </View>

          <View
            style={[
              localStyles.board,
              { width: boardSize, height: boardSize },
            ]}
          >
            {grid.map((row, rIdx) => (
              <View key={`frow_${rIdx}`} style={localStyles.row}>
                {row.map((colorIdx, cIdx) => (
                  <View
                    key={`fcell_${rIdx}_${cIdx}`}
                    style={[
                      localStyles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: FLOOD_COLORS[colorIdx],
                      },
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>

          <View style={[localStyles.swatchesRow, { width: boardSize }]}>
            {FLOOD_COLORS.map((hex, idx) => (
              <Pressable
                key={hex}
                onPress={() => handleSelectColor(idx)}
                style={({ pressed }) => [
                  localStyles.swatchBtn,
                  { backgroundColor: hex },
                  grid[0][0] === idx && localStyles.swatchActive,
                  pressed && { transform: [{ scale: 0.92 }] },
                ]}
              />
            ))}
          </View>

          {status !== 'PLAYING' && (
            <Pressable onPress={resetBoard} style={localStyles.nextBtn}>
              <Text style={localStyles.nextBtnText}>
                {status === 'WON'
                  ? 'GRID INFECTED! NEXT BOARD'
                  : 'OUT OF MOVES // RETRY'}
              </Text>
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
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.solarGold,
    letterSpacing: 0.8,
  },
  board: {
    backgroundColor: 'rgba(8, 8, 22, 0.94)',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    padding: 8,
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cell: {
    borderRadius: 5,
  },
  swatchesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  swatchBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  swatchActive: {
    borderColor: '#FFFFFF',
    borderWidth: 3.5,
    transform: [{ scale: 1.06 }],
  },
  nextBtn: {
    marginTop: 16,
    backgroundColor: COLORS.cyan,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 12,
  },
  nextBtnText: {
    fontSize: 11.5,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#030308',
    letterSpacing: 1.2,
  },
});
