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
} from '../utils/haptics';
import {
  playTapSound,
  playPerfectSound,
} from '../utils/sound';

const STORAGE_KEY = '@game_tower:best_numhunt_v1';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

// Difficulty Modes
export const NUMBER_HUNT_MODES = {
  EASY: {
    id: 'EASY',
    label: 'EASY (3×3)',
    count: 9,
    cols: 3,
    bonus: 100,
    accent: COLORS.matrixMint,
  },
  MEDIUM: {
    id: 'MEDIUM',
    label: 'MEDIUM (5×5)',
    count: 25,
    cols: 5,
    bonus: 250,
    accent: COLORS.cyan,
  },
  HARD: {
    id: 'HARD',
    label: 'HARD (6×6)',
    count: 36,
    cols: 6,
    bonus: 500,
    accent: COLORS.magenta,
  },
};

const shuffleNumbers = (count) => {
  const arr = Array.from({ length: count }, (_, i) => i + 1);
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export default function NumberHuntGame({ onBackToHub, onScoreUpdate }) {
  const { width } = useWindowDimensions();
  const boardSize = Math.min(360, width - 28);
  const juiceRef = useRef(null);

  const [modeKey, setModeKey] = useState('MEDIUM');
  const activeMode = NUMBER_HUNT_MODES[modeKey] || NUMBER_HUNT_MODES.MEDIUM;

  const [numbers, setNumbers] = useState(() => shuffleNumbers(NUMBER_HUNT_MODES.MEDIUM.count));
  const [target, setTarget] = useState(1);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  const cols = activeMode.cols;
  const count = activeMode.count;
  const cellGap = cols === 3 ? 10 : cols === 5 ? 6 : 5;
  const cellSize = Math.floor((boardSize - 20 - (cols - 1) * cellGap) / cols);
  const numFontSize = cols === 3 ? 32 : cols === 5 ? 20 : 16;

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

  const resetBoard = useCallback((overrideMode) => {
    const m = overrideMode ? NUMBER_HUNT_MODES[overrideMode] : activeMode;
    setNumbers(shuffleNumbers(m.count));
    setTarget(1);
    if (juiceRef.current) juiceRef.current.flash(m.accent);
  }, [activeMode]);

  const switchMode = useCallback((newModeKey) => {
    if (newModeKey === modeKey) return;
    triggerLightHaptic();
    playTapSound();
    setModeKey(newModeKey);
    resetBoard(newModeKey);
  }, [modeKey, resetBoard]);

  const handleTapNum = useCallback(
    (num) => {
      if (num !== target) {
        triggerSliceHaptic();
        if (juiceRef.current) juiceRef.current.shake(5, 3);
        return;
      }

      const isCompleted = num === count;
      const nextScore = score + (cols === 3 ? 10 : cols === 5 ? 20 : 30) + (isCompleted ? activeMode.bonus : 0);
      setScore(nextScore);
      updateBest(nextScore);

      if (isCompleted) {
        setTarget(count + 1);
        triggerPerfectHaptic(3);
        playPerfectSound(8);
        if (juiceRef.current) {
          juiceRef.current.celebrate(
            `${activeMode.id} COMPLETED!`,
            `+${activeMode.bonus} SPEED BONUS`,
            activeMode.accent
          );
        }
      } else {
        setTarget(num + 1);
        triggerLightHaptic();
        playPerfectSound((num % 8) + 1);
        if (juiceRef.current) {
          juiceRef.current.burst(undefined, undefined, activeMode.accent, 8);
        }
      }
    },
    [target, score, count, cols, activeMode, updateBest]
  );

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={localStyles.container}>
        <LinearGradient
          colors={['#03030A', '#071824', '#0F2A3D']}
          style={StyleSheet.absoluteFillObject}
        />

        <MiniGameHeader
          title={`NUMBER HUNT ${count}`}
          floorLabel={`FLOOR 19 // ${activeMode.id} MATRIX`}
          score={score}
          bestScore={bestScore}
          accentColor={activeMode.accent}
          onBack={onBackToHub}
          onReset={() => resetBoard()}
        />

        <View style={localStyles.body}>
          {/* Mode Selector (EASY / MEDIUM / HARD) */}
          <View style={localStyles.modeSelectorBar}>
            {Object.keys(NUMBER_HUNT_MODES).map((k) => {
              const m = NUMBER_HUNT_MODES[k];
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

          {/* Target Banner */}
          <View style={[localStyles.targetBanner, { borderColor: activeMode.accent }]}>
            <Text style={localStyles.targetLabel}>FIND NEXT NUMBER // </Text>
            <Text style={[localStyles.targetValue, { color: activeMode.accent }]}>
              {target <= count ? target : 'CLEAR!'}
            </Text>
          </View>

          {/* Number Matrix Grid */}
          <View
            style={[
              localStyles.grid,
              {
                width: boardSize,
                height: boardSize,
                borderColor: `${activeMode.accent}66`,
              },
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
                        ? `${activeMode.accent}28`
                        : 'rgba(255, 255, 255, 0.06)',
                      borderColor: cleared
                        ? activeMode.accent
                        : 'rgba(0, 245, 255, 0.35)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      localStyles.numText,
                      {
                        fontSize: numFontSize,
                        color: cleared ? activeMode.accent : '#FFFFFF',
                      },
                    ]}
                  >
                    {num}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <GameResultModal
            visible={target > count}
            type="VICTORY"
            title={`${count}-SCHULTE PURGED!`}
            subtitle={`ALL ${count} QUANTUM DIGITS RESOLVED // ${activeMode.id}`}
            score={score}
            bestScore={bestScore}
            accentColor={activeMode.accent}
            onRetry={() => resetBoard()}
            retryLabel={`NEXT ${count}-MATRIX`}
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
  targetBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 245, 212, 0.12)',
    borderWidth: 1.2,
    paddingHorizontal: 18,
    paddingVertical: 7,
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
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
    backgroundColor: 'rgba(8, 8, 22, 0.92)',
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 10,
  },
  cell: {
    borderRadius: 10,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: {
    fontFamily: monoFont,
    fontWeight: '900',
  },
  nextBtn: {
    marginTop: 16,
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
