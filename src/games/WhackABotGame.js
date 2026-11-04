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
  playPerfectSound,
  playGameOverSound,
} from '../utils/sound';

const STORAGE_KEY = '@game_tower:best_whack_v1';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export default function WhackABotGame({ onBackToHub, onScoreUpdate }) {
  const { width } = useWindowDimensions();
  const boardSize = Math.min(348, width - 32);
  const holeSize = Math.floor((boardSize - 34) / 3);
  const juiceRef = useRef(null);

  const [activeSlot, setActiveSlot] = useState({ idx: -1, type: 'BOT' });
  const [timeLeft, setTimeLeft] = useState(30);
  const [combo, setCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [running, setRunning] = useState(true);

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

  const startNewGame = useCallback(() => {
    setScore(0);
    setCombo(0);
    setTimeLeft(30);
    setRunning(true);
    if (juiceRef.current) juiceRef.current.flash(COLORS.cyan);
  }, []);

  useEffect(() => {
    if (!running) return undefined;
    const spawnInterval = setInterval(() => {
      const idx = Math.floor(Math.random() * 9);
      const roll = Math.random();
      const type = roll < 0.16 ? 'BOMB' : roll < 0.38 ? 'GOLD' : 'BOT';
      setActiveSlot({ idx, type });
    }, 580);

    const clockInterval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setRunning(false);
          setActiveSlot({ idx: -1, type: 'BOT' });
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      clearInterval(spawnInterval);
      clearInterval(clockInterval);
    };
  }, [running]);

  const handleHoleTap = useCallback(
    (idx) => {
      if (!running || activeSlot.idx !== idx) return;

      const { type } = activeSlot;
      setActiveSlot({ idx: -1, type: 'BOT' });

      if (type === 'BOMB') {
        setCombo(0);
        const nextScore = Math.max(0, score - 40);
        setScore(nextScore);
        triggerGameOverHaptic();
        playGameOverSound();
        if (juiceRef.current) {
          juiceRef.current.celebrate('PLASMA BOMB!', '-40 PTS', COLORS.danger);
        }
        return;
      }

      const nextCombo = combo + 1;
      const base = type === 'GOLD' ? 50 : 20;
      const gained = base + Math.min(40, nextCombo * 5);
      const nextScore = score + gained;

      setCombo(nextCombo);
      setScore(nextScore);
      updateBest(nextScore);

      if (type === 'GOLD') {
        triggerPerfectHaptic(3);
        playPerfectSound(6);
        if (juiceRef.current) {
          juiceRef.current.celebrate(
            `GOLDEN BOT! +${gained}`,
            `STREAK x${nextCombo}`,
            COLORS.solarGold
          );
        }
      } else {
        triggerLightHaptic();
        playPerfectSound(Math.min(8, nextCombo));
        if (juiceRef.current) {
          juiceRef.current.shake(4, 3);
          juiceRef.current.burst(undefined, undefined, COLORS.cyan, 12);
          juiceRef.current.popup(
            `+${gained}`,
            `COMBO x${nextCombo}`,
            COLORS.cyan
          );
        }
      }
    },
    [running, activeSlot, combo, score, updateBest]
  );

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={localStyles.container}>
        <LinearGradient
          colors={['#03030A', '#120822', '#240B36']}
          style={StyleSheet.absoluteFillObject}
        />

        <MiniGameHeader
          title="WHACK-A-BOT"
          floorLabel="FLOOR 15 // CYBER REFLEX"
          score={score}
          bestScore={bestScore}
          accentColor={COLORS.magenta}
          onBack={onBackToHub}
          onReset={startNewGame}
        />

        <View style={localStyles.body}>
          <View style={[localStyles.statusRow, { width: boardSize }]}>
            <Text style={localStyles.timerText}>{`TIME: ${timeLeft}S`}</Text>
            <Text style={localStyles.comboText}>{`STREAK x${combo + 1}`}</Text>
          </View>

          <View
            style={[
              localStyles.grid,
              { width: boardSize, height: boardSize },
            ]}
          >
            {Array.from({ length: 9 }).map((_, idx) => {
              const active = activeSlot.idx === idx;
              const isGold = active && activeSlot.type === 'GOLD';
              const isBomb = active && activeSlot.type === 'BOMB';
              const color = isBomb
                ? COLORS.danger
                : isGold
                  ? COLORS.solarGold
                  : COLORS.cyan;

              return (
                <Pressable
                  key={`hole_${idx}`}
                  onPressIn={() => handleHoleTap(idx)}
                  style={[
                    localStyles.hole,
                    {
                      width: holeSize,
                      height: holeSize,
                      borderColor: active ? color : 'rgba(255,255,255,0.15)',
                      backgroundColor: active
                        ? `${color}2E`
                        : 'rgba(255,255,255,0.04)',
                    },
                  ]}
                >
                  {active && (
                    <>
                      <Text style={localStyles.botGlyph}>
                        {isBomb ? '💣' : isGold ? '👑' : '🤖'}
                      </Text>
                      <Text style={[localStyles.botTag, { color }]}>
                        {isBomb ? 'AVOID!' : isGold ? '+50 GOLD' : 'SMASH!'}
                      </Text>
                    </>
                  )}
                </Pressable>
              );
            })}
          </View>

          {!running && (
            <Pressable onPress={startNewGame} style={localStyles.retryBtn}>
              <Text style={localStyles.retryText}>
                {`TIME UP! SCORE: ${score} // PLAY AGAIN`}
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
    marginBottom: 14,
  },
  timerText: {
    fontSize: 13,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.cyan,
  },
  comboText: {
    fontSize: 13,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.solarGold,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
    backgroundColor: 'rgba(8, 8, 22, 0.92)',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 0, 127, 0.38)',
    padding: 8,
  },
  hole: {
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botGlyph: {
    fontSize: 32,
  },
  botTag: {
    fontSize: 9,
    fontFamily: monoFont,
    fontWeight: '900',
    marginTop: 4,
  },
  retryBtn: {
    marginTop: 18,
    backgroundColor: COLORS.cyan,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
  },
  retryText: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#030308',
  },
});
