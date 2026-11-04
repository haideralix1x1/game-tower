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
  triggerPerfectHaptic,
  triggerGameOverHaptic,
} from '../utils/haptics';
import {
  playPerfectSound,
  playGameOverSound,
} from '../utils/sound';

const STORAGE_KEY = '@game_tower:best_math_v1';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const generateQuestion = (level = 1) => {
  const ops = ['+', '-', '×'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a = 2 + Math.floor(Math.random() * (8 + level * 2));
  let b = 2 + Math.floor(Math.random() * (8 + level * 2));
  let answer = 0;

  if (op === '+') answer = a + b;
  else if (op === '-') {
    if (b > a) [a, b] = [b, a];
    answer = a - b;
  } else {
    a = 2 + Math.floor(Math.random() * 10);
    b = 2 + Math.floor(Math.random() * 9);
    answer = a * b;
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
  const [question, setQuestion] = useState(() => generateQuestion(1));
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
    setQuestion(generateQuestion(1));
    if (juiceRef.current) juiceRef.current.flash(COLORS.cyan);
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

  const handleAnswer = useCallback(
    (val) => {
      if (!running) return;
      if (val === question.answer) {
        const nextStreak = streak + 1;
        const gained = 20 + nextStreak * 5;
        const nextScore = score + gained;
        setStreak(nextStreak);
        setScore(nextScore);
        setTimeLeft((t) => Math.min(30, t + 1));
        updateBest(nextScore);
        setQuestion(generateQuestion(Math.floor(nextStreak / 3) + 1));
        triggerPerfectHaptic(2);
        playPerfectSound(Math.min(8, nextStreak));
        if (juiceRef.current) {
          juiceRef.current.shake(4, 3);
          juiceRef.current.burst(undefined, undefined, COLORS.matrixMint, 14);
          juiceRef.current.popup(
            `+${gained} PTS`,
            `STREAK x${nextStreak} (+1S)`,
            COLORS.matrixMint
          );
        }
      } else {
        setStreak(0);
        setTimeLeft((t) => Math.max(0, t - 3));
        triggerGameOverHaptic();
        playGameOverSound();
        if (juiceRef.current) {
          juiceRef.current.shake(10, 6);
          juiceRef.current.flash(COLORS.danger);
          juiceRef.current.popup('WRONG!', '-3 SECONDS', COLORS.danger);
        }
      }
    },
    [running, question, streak, score, updateBest]
  );

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={localStyles.container}>
        <LinearGradient
          colors={['#03030A', '#081426', '#10243C']}
          style={StyleSheet.absoluteFillObject}
        />

        <MiniGameHeader
          title="MATH BLITZ"
          floorLabel="FLOOR 16 // NEURAL ARITHMETIC"
          score={score}
          bestScore={bestScore}
          accentColor={COLORS.cyan}
          onBack={onBackToHub}
          onReset={resetGame}
        />

        <View style={localStyles.body}>
          <View style={localStyles.statusRow}>
            <Text style={localStyles.timerText}>{`TIMER: ${timeLeft}S`}</Text>
            <Text style={localStyles.streakText}>{`STREAK x${streak + 1}`}</Text>
          </View>

          <View style={localStyles.equationCard}>
            <Text style={localStyles.equationLabel}>SOLVE EQUATION</Text>
            <Text style={localStyles.equationValue}>{question.text}</Text>
          </View>

          <View style={localStyles.choicesGrid}>
            {question.choices.map((c, idx) => (
              <Pressable
                key={`ans_${idx}_${c}`}
                onPress={() => handleAnswer(c)}
                style={({ pressed }) => [
                  localStyles.choiceBtn,
                  pressed && { transform: [{ scale: 0.95 }], opacity: 0.85 },
                ]}
              >
                <Text style={localStyles.choiceText}>{c}</Text>
              </Pressable>
            ))}
          </View>

          {!running && (
            <Pressable onPress={resetGame} style={localStyles.retryBtn}>
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
  equationCard: {
    width: '100%',
    backgroundColor: 'rgba(8, 12, 28, 0.94)',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: COLORS.cyan,
    paddingVertical: 32,
    alignItems: 'center',
    marginBottom: 22,
  },
  equationLabel: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 2,
    marginBottom: 8,
  },
  equationValue: {
    fontSize: 46,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#FFFFFF',
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
    height: 74,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 245, 255, 0.14)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 245, 255, 0.45)',
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
