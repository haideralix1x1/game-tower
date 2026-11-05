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
  triggerGameOverHaptic,
} from '../utils/haptics';
import {
  playTapSound,
  playPerfectSound,
  playGameOverSound,
} from '../utils/sound';

const STORAGE_KEY = '@game_tower:best_math_v1';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export const MATH_MODES = {
  EASY: {
    id: 'EASY',
    label: 'EASY (+ -)',
    ops: ['+', '-'],
    time: 30,
    pointBase: 15,
    accent: COLORS.matrixMint,
  },
  MEDIUM: {
    id: 'MEDIUM',
    label: 'MED (+ - ×)',
    ops: ['+', '-', '×'],
    time: 22,
    pointBase: 25,
    accent: COLORS.cyan,
  },
  HARD: {
    id: 'HARD',
    label: 'HARD (ALL)',
    ops: ['+', '-', '×', '÷'],
    time: 15,
    pointBase: 40,
    accent: COLORS.magenta,
  },
};

const generateQuestion = (modeKey = 'MEDIUM', level = 1) => {
  const m = MATH_MODES[modeKey] || MATH_MODES.MEDIUM;
  const ops = m.ops;
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a = 2 + Math.floor(Math.random() * (modeKey === 'EASY' ? 9 : 8 + level * 2));
  let b = 2 + Math.floor(Math.random() * (modeKey === 'EASY' ? 9 : 8 + level * 2));
  let answer = 0;

  if (op === '+') answer = a + b;
  else if (op === '-') {
    if (b > a) [a, b] = [b, a];
    answer = a - b;
  } else if (op === '×') {
    a = 2 + Math.floor(Math.random() * (modeKey === 'HARD' ? 12 : 9));
    b = 2 + Math.floor(Math.random() * (modeKey === 'HARD' ? 12 : 8));
    answer = a * b;
  } else if (op === '÷') {
    b = 2 + Math.floor(Math.random() * 8);
    const quotient = 2 + Math.floor(Math.random() * 9);
    a = b * quotient;
    answer = quotient;
  }

  const choices = new Set([answer]);
  while (choices.size < 4) {
    const delta = (Math.floor(Math.random() * 7) + 1) * (Math.random() > 0.5 ? 1 : -1);
    const candidate = Math.max(0, answer + delta);
    choices.add(candidate);
  }

  const shuffled = Array.from(choices).sort(() => Math.random() - 0.5);
  return { text: `${a} ${op} ${b}`, answer, choices: shuffled };
};

export default function MathBlitzGame({ onBackToHub, onScoreUpdate }) {
  const juiceRef = useRef(null);

  const [modeKey, setModeKey] = useState('MEDIUM');
  const activeMode = MATH_MODES[modeKey] || MATH_MODES.MEDIUM;

  const [question, setQuestion] = useState(() => generateQuestion('MEDIUM', 1));
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(MATH_MODES.MEDIUM.time);
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

  const resetGame = useCallback((overrideModeKey) => {
    const mKey = overrideModeKey || modeKey;
    const m = MATH_MODES[mKey] || activeMode;
    setScore(0);
    setStreak(0);
    setTimeLeft(m.time);
    setRunning(true);
    setQuestion(generateQuestion(mKey, 1));
    if (juiceRef.current) juiceRef.current.flash(m.accent);
  }, [modeKey, activeMode]);

  const switchMode = useCallback((newKey) => {
    if (newKey === modeKey) return;
    triggerLightHaptic();
    playTapSound();
    setModeKey(newKey);
    resetGame(newKey);
  }, [modeKey, resetGame]);

  useEffect(() => {
    if (!running) return () => {};
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          setRunning(false);
          triggerGameOverHaptic();
          playGameOverSound();
          if (juiceRef.current) {
            juiceRef.current.celebrate('TIME EXPIRED!', 'FINAL SCORE SAVED', COLORS.danger);
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [running]);

  const handleAnswer = useCallback(
    (chosen) => {
      if (!running) return;

      if (chosen === question.answer) {
        const bonus = (streak + 1) * 5;
        const gained = activeMode.pointBase + bonus;
        const nextScore = score + gained;
        const nextStreak = streak + 1;
        setScore(nextScore);
        setStreak(nextStreak);
        updateBest(nextScore);
        setTimeLeft((t) => Math.min(activeMode.time + 5, t + (modeKey === 'HARD' ? 2 : 3)));
        triggerPerfectHaptic(nextStreak);
        playPerfectSound(Math.min(8, nextStreak));
        setQuestion(generateQuestion(modeKey, Math.floor(nextStreak / 3) + 1));
        if (juiceRef.current) {
          juiceRef.current.burst(undefined, undefined, activeMode.accent, 8);
        }
      } else {
        setStreak(0);
        setTimeLeft((t) => Math.max(0, t - 3));
        triggerSliceHaptic();
        if (juiceRef.current) {
          juiceRef.current.shake(6, 4);
          juiceRef.current.popup('-3 SECONDS', 'INCORRECT', COLORS.danger);
        }
      }
    },
    [running, question, streak, score, activeMode, modeKey, updateBest]
  );

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={localStyles.container}>
        <LinearGradient
          colors={['#03030A', '#081726', '#0F2638']}
          style={StyleSheet.absoluteFillObject}
        />

        <MiniGameHeader
          title={`MATH BLITZ // ${activeMode.id}`}
          floorLabel="FLOOR 16 // SPEED ARITHMETIC"
          score={score}
          bestScore={bestScore}
          accentColor={activeMode.accent}
          onBack={onBackToHub}
          onReset={() => resetGame()}
        />

        <View style={localStyles.body}>
          {/* Mode Selector (EASY / MEDIUM / HARD) */}
          <View style={localStyles.modeSelectorBar}>
            {Object.keys(MATH_MODES).map((k) => {
              const m = MATH_MODES[k];
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

          <View style={localStyles.statusRow}>
            <Text style={[localStyles.timerText, { color: timeLeft <= 5 ? COLORS.danger : activeMode.accent }]}>
              {`TURBO CLOCK: ${timeLeft}S`}
            </Text>
            <Text style={[localStyles.streakText, { color: activeMode.accent }]}>
              {`STREAK x${streak + 1}`}
            </Text>
          </View>

          <View style={[localStyles.equationCard, { borderColor: `${activeMode.accent}66` }]}>
            <Text style={localStyles.equationLabel}>SOLVE EQUATION</Text>
            <Text style={[localStyles.equationValue, { color: activeMode.accent }]}>
              {question.text}
            </Text>
          </View>

          <View style={localStyles.choicesGrid}>
            {question.choices.map((c, idx) => (
              <Pressable
                key={`ans_${idx}_${c}`}
                onPress={() => handleAnswer(c)}
                style={({ pressed }) => [
                  localStyles.choiceBtn,
                  { borderColor: `${activeMode.accent}55` },
                  pressed && { transform: [{ scale: 0.95 }], opacity: 0.85 },
                ]}
              >
                <Text style={localStyles.choiceText}>{c}</Text>
              </Pressable>
            ))}
          </View>

          <GameResultModal
            visible={!running}
            type={score > 120 ? 'VICTORY' : 'GAME_OVER'}
            title={score > 120 ? 'MATH MATRIX CRACKED!' : 'TURBO CLOCK EXPIRED'}
            subtitle={`DIFFICULTY: ${activeMode.label} // STREAK: x${streak + 1}`}
            score={score}
            bestScore={bestScore}
            accentColor={activeMode.accent}
            onRetry={() => resetGame()}
            retryLabel={`PLAY AGAIN (${activeMode.id})`}
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
  modeSelectorBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
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
  statusRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timerText: {
    fontSize: 14,
    fontFamily: monoFont,
    fontWeight: '900',
  },
  streakText: {
    fontSize: 14,
    fontFamily: monoFont,
    fontWeight: '900',
  },
  equationCard: {
    width: '100%',
    backgroundColor: 'rgba(5, 10, 24, 0.94)',
    borderRadius: 20,
    borderWidth: 1.5,
    paddingVertical: 28,
    alignItems: 'center',
    marginBottom: 20,
  },
  equationLabel: {
    fontSize: 10.5,
    fontFamily: monoFont,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  equationValue: {
    fontSize: 44,
    fontFamily: monoFont,
    fontWeight: '900',
  },
  choicesGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  choiceBtn: {
    width: '48%',
    backgroundColor: 'rgba(8, 14, 32, 0.88)',
    borderRadius: 14,
    borderWidth: 1.2,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceText: {
    fontSize: 26,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  retryBtn: {
    marginTop: 20,
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
