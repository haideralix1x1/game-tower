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
  triggerPerfectHaptic,
  triggerGameOverHaptic,
} from '../utils/haptics';
import {
  playPerfectSound,
  playGameOverSound,
} from '../utils/sound';

const STORAGE_KEY = '@game_tower:best_stroop_v1';

const COLOR_ITEMS = [
  { name: 'CYAN', hex: '#00F5FF' },
  { name: 'PINK', hex: '#FF007F' },
  { name: 'GOLD', hex: '#FFD166' },
  { name: 'GREEN', hex: '#00F5D4' },
  { name: 'PURPLE', hex: '#C77DFF' },
];

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const nextPrompt = () => {
  const wordItem = COLOR_ITEMS[Math.floor(Math.random() * COLOR_ITEMS.length)];
  const isMatch = Math.random() < 0.5;
  if (isMatch) {
    return { word: wordItem.name, inkHex: wordItem.hex, isMatch: true };
  }
  const others = COLOR_ITEMS.filter((c) => c.name !== wordItem.name);
  const ink = others[Math.floor(Math.random() * others.length)];
  return { word: wordItem.name, inkHex: ink.hex, isMatch: false };
};

export default function ColorStroopGame({ onBackToHub, onScoreUpdate }) {
  const juiceRef = useRef(null);
  const [prompt, setPrompt] = useState(() => nextPrompt());
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(25);
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

  const resetGame = useCallback(() => {
    setScore(0);
    setStreak(0);
    setTimeLeft(25);
    setRunning(true);
    setPrompt(nextPrompt());
    if (juiceRef.current) juiceRef.current.flash(COLORS.magenta);
  }, []);

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setRunning(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const handleChoice = useCallback(
    (userSaysMatch) => {
      if (!running) return;
      if (userSaysMatch === prompt.isMatch) {
        const nextStreak = streak + 1;
        const gained = 20 + nextStreak * 5;
        const nextScore = score + gained;
        setStreak(nextStreak);
        setScore(nextScore);
        updateBest(nextScore);
        setPrompt(nextPrompt());
        triggerPerfectHaptic(2);
        playPerfectSound(Math.min(8, nextStreak));
        if (juiceRef.current) {
          juiceRef.current.shake(4, 3);
          juiceRef.current.burst(undefined, undefined, prompt.inkHex, 14);
          juiceRef.current.popup(
            `+${gained}`,
            `STREAK x${nextStreak}`,
            prompt.inkHex
          );
        }
      } else {
        setStreak(0);
        setTimeLeft((t) => Math.max(0, t - 3));
        setPrompt(nextPrompt());
        triggerGameOverHaptic();
        playGameOverSound();
        if (juiceRef.current) {
          juiceRef.current.shake(10, 6);
          juiceRef.current.flash(COLORS.danger);
          juiceRef.current.popup('MISMATCH!', '-3 SECONDS', COLORS.danger);
        }
      }
    },
    [running, prompt, streak, score, updateBest]
  );

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={localStyles.container}>
        <LinearGradient
          colors={['#03030A', '#140824', '#260B38']}
          style={StyleSheet.absoluteFillObject}
        />

        <MiniGameHeader
          title="COLOR STROOP"
          floorLabel="FLOOR 17 // CORTEX REFLEX"
          score={score}
          bestScore={bestScore}
          accentColor={COLORS.magenta}
          onBack={onBackToHub}
          onReset={resetGame}
        />

        <View style={localStyles.body}>
          <View style={localStyles.statusRow}>
            <Text style={localStyles.timerText}>{`TIMER: ${timeLeft}S`}</Text>
            <Text style={localStyles.streakText}>{`STREAK x${streak + 1}`}</Text>
          </View>

          <View style={localStyles.card}>
            <Text style={localStyles.cardHint}>
              DOES WORD MEANING MATCH THE INK COLOR?
            </Text>
            <Text style={[localStyles.wordDisplay, { color: prompt.inkHex }]}>
              {prompt.word}
            </Text>
          </View>

          <View style={localStyles.btnRow}>
            <Pressable
              onPress={() => handleChoice(false)}
              style={[localStyles.choiceBtn, { borderColor: COLORS.danger }]}
            >
              <Text style={[localStyles.choiceText, { color: COLORS.danger }]}>
                ✕ NO MATCH
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleChoice(true)}
              style={[
                localStyles.choiceBtn,
                { borderColor: COLORS.matrixMint },
              ]}
            >
              <Text
                style={[localStyles.choiceText, { color: COLORS.matrixMint }]}
              >
                ✓ MATCH
              </Text>
            </Pressable>
          </View>

          <GameResultModal
            visible={!running}
            type={score > 100 ? 'VICTORY' : 'GAME_OVER'}
            title={score > 100 ? 'CORTEX OVERDRIVE!' : 'TIMER DEPLETED'}
            subtitle={`STROOP REFLEX TEST COMPLETED // STREAK: x${streak + 1}`}
            score={score}
            bestScore={bestScore}
            accentColor={COLORS.magenta}
            onRetry={resetGame}
            retryLabel="PLAY AGAIN"
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
    paddingHorizontal: 22,
    paddingBottom: 20,
  },
  statusRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  timerText: {
    fontSize: 14,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.cyan,
  },
  streakText: {
    fontSize: 14,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.solarGold,
  },
  card: {
    width: '100%',
    backgroundColor: 'rgba(10, 10, 26, 0.94)',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 38,
    alignItems: 'center',
    marginBottom: 24,
  },
  cardHint: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  wordDisplay: {
    fontSize: 52,
    fontFamily: monoFont,
    fontWeight: '900',
    letterSpacing: 3,
  },
  btnRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
  },
  choiceBtn: {
    flex: 1,
    height: 72,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceText: {
    fontSize: 16,
    fontFamily: monoFont,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  retryBtn: {
    marginTop: 22,
    backgroundColor: COLORS.cyan,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 14,
  },
  retryText: {
    fontSize: 12.5,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#030308',
  },
});
