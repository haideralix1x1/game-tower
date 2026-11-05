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
  const [isSolved, setIsSolved] = useState(false);

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
    setIsSolved(false);
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
        setIsSolved(true);
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
          {/* Mode Selector (EASY / MEDIUM / HARD) */}
          <View style={localStyles.modeSelectorBar}>
            {[
              { id: 3, label: 'EASY (3)', color: '#00F5D4' },
              { id: 4, label: 'MED (4)', color: '#FFD166' },
              { id: 5, label: 'HARD (5)', color: '#FF007F' },
            ].map((m) => {
              const isSelected = discCount === m.id;
              return (
                <Pressable
                  key={`mode_${m.id}`}
                  onPress={() => {
                    if (discCount === m.id) return;
                    triggerLightHaptic();
                    playTapSound();
                    setDiscCount(m.id);
                    resetRods(m.id);
                  }}
                  style={[
                    localStyles.modePill,
                    isSelected && {
                      backgroundColor: `${m.color}25`,
                      borderColor: m.color,
                    },
                  ]}
                >
                  <Text
                    style={[
                      localStyles.modePillText,
                      { color: isSelected ? m.color : COLORS.textMuted },
                    ]}
                  >
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={localStyles.topRow}>
            <Text style={localStyles.movesText}>{`MOVES: ${moves} // MIN: ${Math.pow(2, discCount) - 1}`}</Text>
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

          <GameResultModal
            visible={isSolved}
            type="VICTORY"
            title="SPIRE SYNCHRONIZED!"
            subtitle={`ALL ${discCount} QUANTUM RINGS MOVED IN ${moves} MOVES`}
            score={score}
            bestScore={bestScore}
            accentColor={COLORS.solarGold}
            onRetry={() => resetRods(discCount)}
            retryLabel="NEW RINGS RUN"
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
    paddingHorizontal: 14,
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
    width: '94%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  movesText: {
    fontSize: 12,
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
