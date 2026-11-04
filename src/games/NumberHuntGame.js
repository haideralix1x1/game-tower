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
  playPerfectSound,
} from '../utils/sound';

const STORAGE_KEY = '@game_tower:best_numhunt_v1';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const shuffled25 = () => {
  const arr = Array.from({ length: 25 }, (_, i) => i + 1);
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export default function NumberHuntGame({ onBackToHub, onScoreUpdate }) {
  const { width } = useWindowDimensions();
  const boardSize = Math.min(355, width - 28);
  const cellSize = Math.floor((boardSize - 38) / 5);
  const juiceRef = useRef(null);

  const [numbers, setNumbers] = useState(() => shuffled25());
  const [target, setTarget] = useState(1);
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

  const resetBoard = useCallback(() => {
    setNumbers(shuffled25());
    setTarget(1);
    if (juiceRef.current) juiceRef.current.flash(COLORS.matrixMint);
  }, []);

  const handleTapNum = useCallback(
    (num) => {
      if (num !== target) {
        triggerSliceHaptic();
        if (juiceRef.current) juiceRef.current.shake(5, 3);
        return;
      }

      const nextScore = score + 20 + (num === 25 ? 250 : 0);
      setScore(nextScore);
      updateBest(nextScore);

      if (num === 25) {
        setTarget(26);
        triggerPerfectHaptic(3);
        playPerfectSound(8);
        if (juiceRef.current) {
          juiceRef.current.celebrate(
            'GRID COMPLETED!',
            '+250 SPEED BONUS',
            COLORS.matrixMint
          );
        }
      } else {
        setTarget(num + 1);
        triggerLightHaptic();
        playPerfectSound((num % 8) + 1);
        if (juiceRef.current) {
          juiceRef.current.burst(undefined, undefined, COLORS.cyan, 8);
        }
      }
    },
    [target, score, updateBest]
  );

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={localStyles.container}>
        <LinearGradient
          colors={['#03030A', '#071824', '#0F2A3D']}
          style={StyleSheet.absoluteFillObject}
        />

        <MiniGameHeader
          title="NUMBER HUNT 25"
          floorLabel="FLOOR 19 // SPEED MATRIX"
          score={score}
          bestScore={bestScore}
          accentColor={COLORS.matrixMint}
          onBack={onBackToHub}
          onReset={resetBoard}
        />

        <View style={localStyles.body}>
          <View style={localStyles.targetBanner}>
            <Text style={localStyles.targetLabel}>FIND NEXT NUMBER // </Text>
            <Text style={localStyles.targetValue}>
              {target <= 25 ? target : 'CLEAR!'}
            </Text>
          </View>

          <View
            style={[
              localStyles.grid,
              { width: boardSize, height: boardSize },
            ]}
          >
            {numbers.map((num) => {
              const cleared = num < target;
              return (
                <Pressable
                  key={`nh_${num}`}
                  onPressIn={() => handleTapNum(num)}
                  style={[
                    localStyles.cell,
                    {
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: cleared
                        ? 'rgba(0, 245, 212, 0.22)'
                        : 'rgba(255, 255, 255, 0.06)',
                      borderColor: cleared
                        ? COLORS.matrixMint
                        : 'rgba(0, 245, 255, 0.35)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      localStyles.numText,
                      { color: cleared ? COLORS.matrixMint : '#FFFFFF' },
                    ]}
                  >
                    {num}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {target > 25 && (
            <Pressable onPress={resetBoard} style={localStyles.nextBtn}>
              <Text style={localStyles.nextBtnText}>NEW 25-MATRIX</Text>
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
  targetBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 245, 212, 0.14)',
    borderWidth: 1.2,
    borderColor: COLORS.matrixMint,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 14,
    marginBottom: 14,
  },
  targetLabel: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  targetValue: {
    fontSize: 20,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.matrixMint,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
    backgroundColor: 'rgba(8, 8, 22, 0.92)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 245, 212, 0.4)',
    padding: 8,
  },
  cell: {
    borderRadius: 10,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: {
    fontSize: 19,
    fontFamily: monoFont,
    fontWeight: '900',
  },
  nextBtn: {
    marginTop: 18,
    backgroundColor: COLORS.matrixMint,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  nextBtnText: {
    fontSize: 12.5,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#030308',
  },
});
