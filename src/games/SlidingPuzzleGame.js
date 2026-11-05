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
  triggerPerfectHaptic,
} from '../utils/haptics';
import {
  playTapSound,
  playPerfectSound,
} from '../utils/sound';

const STORAGE_KEY = '@game_tower:best_slide15_v1';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const generateSolvableBoard = (shuffleSteps = 45) => {
  const tiles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0];
  let emptyIdx = 15;

  for (let i = 0; i < shuffleSteps; i += 1) {
    const r = Math.floor(emptyIdx / 4);
    const c = emptyIdx % 4;
    const neighbors = [];
    if (r > 0) neighbors.push((r - 1) * 4 + c);
    if (r < 3) neighbors.push((r + 1) * 4 + c);
    if (c > 0) neighbors.push(r * 4 + (c - 1));
    if (c < 3) neighbors.push(r * 4 + (c + 1));

    const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
    [tiles[emptyIdx], tiles[pick]] = [tiles[pick], tiles[emptyIdx]];
    emptyIdx = pick;
  }
  return tiles;
};

const isSolved = (tiles) => {
  for (let i = 0; i < 15; i += 1) {
    if (tiles[i] !== i + 1) return false;
  }
  return tiles[15] === 0;
};

export default function SlidingPuzzleGame({ onBackToHub, onScoreUpdate }) {
  const { width } = useWindowDimensions();
  const boardSize = Math.min(352, width - 32);
  const cellSize = Math.floor((boardSize - 36) / 4);
  const juiceRef = useRef(null);

  const [tiles, setTiles] = useState(() => generateSolvableBoard(42));
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [won, setWon] = useState(false);

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

  const handleReset = useCallback(() => {
    setTiles(generateSolvableBoard(42));
    setMoves(0);
    setWon(false);
    if (juiceRef.current) juiceRef.current.flash(COLORS.solarGold);
  }, []);

  const handleTilePress = useCallback(
    (idx) => {
      if (won || tiles[idx] === 0) return;
      const emptyIdx = tiles.indexOf(0);
      const r1 = Math.floor(idx / 4);
      const c1 = idx % 4;
      const r2 = Math.floor(emptyIdx / 4);
      const c2 = emptyIdx % 4;

      if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return;

      const movedVal = tiles[idx];
      const next = [...tiles];
      [next[idx], next[emptyIdx]] = [next[emptyIdx], next[idx]];
      const nextMoves = moves + 1;
      setTiles(next);
      setMoves(nextMoves);

      if (isSolved(next)) {
        const bonus = Math.max(150, 500 - nextMoves * 2);
        const nextScore = score + bonus;
        setScore(nextScore);
        setWon(true);
        updateBest(nextScore);
        triggerPerfectHaptic(3);
        playPerfectSound(6);
        if (juiceRef.current) {
          juiceRef.current.celebrate(
            'SEQUENCE SOLVED!',
            `+${bonus} PTS IN ${nextMoves} MOVES`,
            COLORS.matrixMint
          );
        }
      } else {
        triggerLightHaptic();
        playTapSound();
        if (movedVal === emptyIdx + 1 && juiceRef.current) {
          juiceRef.current.burst(undefined, undefined, COLORS.matrixMint, 8);
        }
      }
    },
    [won, tiles, moves, score, updateBest]
  );

  const correctCount = tiles.filter(
    (val, idx) => val !== 0 && val === idx + 1
  ).length;

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={localStyles.container}>
        <LinearGradient
          colors={['#03030A', '#0E0A24', '#1F103C']}
          style={StyleSheet.absoluteFillObject}
        />

        <MiniGameHeader
          title="CYBER SLIDE 15"
          floorLabel="FLOOR 07 // SPATIAL LOGIC"
          score={score}
          bestScore={bestScore}
          accentColor={COLORS.solarGold}
          onBack={onBackToHub}
          onReset={handleReset}
        />

        <View style={localStyles.body}>
          <View style={[localStyles.statusRow, { width: boardSize }]}>
            <Text style={localStyles.statText}>
              {`ALIGNED: ${correctCount}/15`}
            </Text>
            <Text style={[localStyles.statText, { color: COLORS.cyan }]}>
              {`MOVES: ${moves}`}
            </Text>
          </View>

          <View
            style={[
              localStyles.board,
              { width: boardSize, height: boardSize },
            ]}
          >
            {tiles.map((num, idx) => {
              if (num === 0) {
                return (
                  <View
                    key={`empty_${idx}`}
                    style={{ width: cellSize, height: cellSize }}
                  />
                );
              }
              const inPlace = num === idx + 1;
              return (
                <Pressable
                  key={`tile_${num}`}
                  onPress={() => handleTilePress(idx)}
                  style={[
                    localStyles.tile,
                    {
                      width: cellSize,
                      height: cellSize,
                      borderColor: inPlace
                        ? COLORS.matrixMint
                        : COLORS.solarGold,
                      backgroundColor: inPlace
                        ? 'rgba(0, 245, 212, 0.22)'
                        : 'rgba(255, 209, 102, 0.14)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      localStyles.tileNum,
                      { color: inPlace ? COLORS.matrixMint : '#FFFFFF' },
                    ]}
                  >
                    {num}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <GameResultModal
            visible={won}
            type="VICTORY"
            title="SEQUENCE ORDERED!"
            subtitle={`15-PUZZLE SOLVED IN ${moves} MOVES`}
            score={score}
            bestScore={bestScore}
            accentColor={COLORS.solarGold}
            onRetry={handleReset}
            retryLabel="NEXT 15-MATRIX"
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
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  statText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.solarGold,
    letterSpacing: 1,
  },
  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
    backgroundColor: 'rgba(8, 8, 22, 0.92)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 209, 102, 0.4)',
    padding: 8,
  },
  tile: {
    borderRadius: 12,
    borderWidth: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileNum: {
    fontSize: 24,
    fontFamily: monoFont,
    fontWeight: '900',
  },
  winBanner: {
    marginTop: 18,
    backgroundColor: COLORS.matrixMint,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  winText: {
    fontSize: 11.5,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#030308',
    letterSpacing: 1.2,
  },
});
