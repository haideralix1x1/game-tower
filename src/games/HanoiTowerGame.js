import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
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
  playPerfectSound,
} from '../utils/sound';

const STORAGE_KEY = '@game_tower:best_hanoi_v1';
const DISC_COLORS = ['#00F5FF', '#00F5D4', '#FFD166', '#FF007F', '#C77DFF'];

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export default function HanoiTowerGame({ onBackToHub, onScoreUpdate }) {
  const juiceRef = useRef(null);
  const [discCount, setDiscCount] = useState(4);
  const [rods, setRods] = useState([[1, 2, 3, 4], [], []]);
  const [selectedRod, setSelectedRod] = useState(null);
  const [moves, setMoves] = useState(0);
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

  const resetRods = useCallback((count = discCount) => {
    const initial = Array.from({ length: count }, (_, i) => i + 1);
    setRods([initial, [], []]);
    setSelectedRod(null);
    setMoves(0);
    if (juiceRef.current) juiceRef.current.flash(COLORS.solarGold);
  }, [discCount]);

  const handleRodTap = useCallback(
    (rodIdx) => {
      if (selectedRod === null) {
        if (rods[rodIdx].length === 0) return;
        setSelectedRod(rodIdx);
        triggerLightHaptic();
        playTapSound();
        return;
      }

      if (selectedRod === rodIdx) {
        setSelectedRod(null);
        triggerLightHaptic();
        return;
      }

      const sourceStack = rods[selectedRod];
      const targetStack = rods[rodIdx];
      const movingDisc = sourceStack[0];

      if (targetStack.length > 0 && targetStack[0] < movingDisc) {
        triggerSliceHaptic();
        if (juiceRef.current) {
          juiceRef.current.shake(6, 3);
          juiceRef.current.popup('INVALID MOVE', 'SMALLER ON TOP ONLY', COLORS.danger);
        }
        setSelectedRod(null);
        return;
      }

      const nextRods = rods.map((r) => [...r]);
      nextRods[selectedRod].shift();
      nextRods[rodIdx].unshift(movingDisc);
      const nextMoves = moves + 1;

      setRods(nextRods);
      setSelectedRod(null);
      setMoves(nextMoves);
      triggerLightHaptic();
      playTapSound();

      if (nextRods[2].length === discCount) {
        const gained = 200 + discCount * 50;
        const nextScore = score + gained;
        setScore(nextScore);
        updateBest(nextScore);
        triggerPerfectHaptic(3);
        playPerfectSound(6);
        if (juiceRef.current) {
          juiceRef.current.celebrate(
            'SPIRE SYNCHRONIZED!',
            `+${gained} PTS IN ${nextMoves} MOVES`,
            COLORS.solarGold
          );
        }
      }
    },
    [selectedRod, rods, moves, discCount, score, updateBest]
  );

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={localStyles.container}>
        <LinearGradient
          colors={['#03030A', '#100B24', '#1E103A']}
          style={StyleSheet.absoluteFillObject}
        />

        <MiniGameHeader
          title="TOWER OF HANOI"
          floorLabel="FLOOR 18 // QUANTUM RINGS"
          score={score}
          bestScore={bestScore}
          accentColor={COLORS.solarGold}
          onBack={onBackToHub}
          onReset={() => resetRods(discCount)}
        />

        <View style={localStyles.body}>
          <View style={localStyles.topRow}>
            <Text style={localStyles.movesText}>{`MOVES: ${moves} (MIN ${Math.pow(2, discCount) - 1})`}</Text>
            <Pressable
              onPress={() => {
                const nextCount = discCount === 3 ? 4 : discCount === 4 ? 5 : 3;
                setDiscCount(nextCount);
                resetRods(nextCount);
              }}
              style={localStyles.diffBtn}
            >
              <Text style={localStyles.diffBtnText}>{`${discCount} RINGS`}</Text>
            </Pressable>
          </View>

          <Text style={localStyles.hintText}>
            MOVE ALL RINGS TO SPIRE C (RIGHT)
          </Text>

          <View style={localStyles.spiresContainer}>
            {rods.map((stack, rIdx) => {
              const isSelected = selectedRod === rIdx;
              return (
                <Pressable
                  key={`rod_${rIdx}`}
                  onPress={() => handleRodTap(rIdx)}
                  style={[
                    localStyles.spireColumn,
                    isSelected && localStyles.spireSelected,
                  ]}
                >
                  <View style={localStyles.pole} />
                  <View style={localStyles.discsWrap}>
                    {stack.map((discSize) => {
                      const wPct = 36 + (discSize / discCount) * 56;
                      const col = DISC_COLORS[(discSize - 1) % DISC_COLORS.length];
                      return (
                        <View
                          key={`disc_${discSize}`}
                          style={[
                            localStyles.disc,
                            {
                              width: `${wPct}%`,
                              backgroundColor: col,
                            },
                          ]}
                        />
                      );
                    })}
                  </View>
                  <Text style={localStyles.spireLabel}>
                    {`SPIRE ${['A', 'B', 'C'][rIdx]}`}
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
    paddingHorizontal: 14,
    paddingBottom: 20,
  },
  topRow: {
    width: '94%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  movesText: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.solarGold,
  },
  diffBtn: {
    backgroundColor: 'rgba(255, 209, 102, 0.2)',
    borderWidth: 1,
    borderColor: COLORS.solarGold,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  diffBtnText: {
    fontSize: 10.5,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.solarGold,
  },
  hintText: {
    fontSize: 10,
    fontFamily: monoFont,
    color: COLORS.textSecondary,
    marginBottom: 18,
  },
  spiresContainer: {
    width: '100%',
    height: 290,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  spireColumn: {
    flex: 1,
    backgroundColor: 'rgba(8, 8, 22, 0.9)',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 14,
    position: 'relative',
  },
  spireSelected: {
    borderColor: COLORS.cyan,
    backgroundColor: 'rgba(0, 245, 255, 0.12)',
  },
  pole: {
    position: 'absolute',
    top: 34,
    bottom: 34,
    width: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  discsWrap: {
    width: '100%',
    alignItems: 'center',
    gap: 5,
    marginBottom: 12,
  },
  disc: {
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  spireLabel: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.textSecondary,
  },
});
