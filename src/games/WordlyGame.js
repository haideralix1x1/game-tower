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
  triggerGameOverHaptic,
} from '../utils/haptics';
import {
  playTapSound,
  playSliceSound,
  playPerfectSound,
  playGameOverSound,
} from '../utils/sound';

const STORAGE_KEY = '@game_tower:best_wordly_v1';

const WORD_BANK = [
  'CYBER', 'LASER', 'NEONS', 'PULSE', 'TOWER', 'BLOCK', 'STACK', 'PIXEL',
  'HYPER', 'NEXUS', 'ORBIT', 'PRISM', 'SPARK', 'FLASH', 'SOLAR', 'LUNAR',
  'SYNTH', 'LOGIC', 'QUEST', 'POWER', 'SPEED', 'GHOST', 'BLAZE', 'CROWN',
  'DRIFT', 'FLAME', 'FORCE', 'GLIDE', 'HEART', 'LIGHT', 'MAGIC', 'METAL',
  'NIGHT', 'OCEAN', 'PEARL', 'PHASE', 'PRIME', 'RADAR', 'REALM', 'ROBOT',
  'SCORE', 'SHARP', 'SHIFT', 'SHOCK', 'SIGHT', 'SKILL', 'SLICE', 'SMART',
  'SONIC', 'SPACE', 'STAGE', 'START', 'STEAM', 'STEEL', 'STORM', 'SURGE',
  'SWIFT', 'SWORD', 'TIGER', 'TITAN', 'TRACK', 'TRAIL', 'TURBO', 'ULTRA',
  'UNITY', 'VALOR', 'VAULT', 'VIPER', 'VITAL', 'VOICE', 'WATCH', 'WATER',
  'WAVES', 'WORLD', 'YOUTH', 'ZEBRA', 'AGENT', 'ALPHA', 'AMBER', 'ANGEL',
  'ARENA', 'ARMOR', 'ARROW', 'ATLAS', 'AUDIO', 'BADGE', 'BEAST', 'BLADE',
];

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DEL'],
];

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const evaluateGuess = (guess, target) => {
  const res = Array(5).fill('ABSENT');
  const targetArr = target.split('');
  const guessArr = guess.split('');

  for (let i = 0; i < 5; i += 1) {
    if (guessArr[i] === targetArr[i]) {
      res[i] = 'CORRECT';
      targetArr[i] = null;
      guessArr[i] = null;
    }
  }
  for (let i = 0; i < 5; i += 1) {
    if (guessArr[i] !== null) {
      const idx = targetArr.indexOf(guessArr[i]);
      if (idx !== -1) {
        res[i] = 'PRESENT';
        targetArr[idx] = null;
      }
    }
  }
  return res;
};

export default function WordlyGame({ onBackToHub, onScoreUpdate }) {
  const { width } = useWindowDimensions();
  const boxSize = Math.min(54, Math.floor((width - 64) / 5));
  const juiceRef = useRef(null);

  const [targetWord, setTargetWord] = useState(
    () => WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)]
  );
  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [statusMessage, setStatusMessage] = useState('DECODE THE 5-LETTER CYBER WORD');
  const [gameState, setGameState] = useState('PLAYING');

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) setBestScore(parseInt(saved, 10) || 0);
      } catch {}
    })();
  }, []);

  const saveScore = useCallback(
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

  const startNextRound = useCallback((resetScore = false) => {
    const nextWord = WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)];
    setTargetWord(nextWord);
    setGuesses([]);
    setCurrentGuess('');
    setGameState('PLAYING');
    setStatusMessage('NEW CIPHER INITIALIZED // 6 ATTEMPTS');
    if (resetScore) {
      setScore(0);
      setStreak(0);
    }
    if (juiceRef.current) {
      juiceRef.current.flash(COLORS.matrixMint);
    }
  }, []);

  const handleKeyPress = useCallback(
    (key) => {
      if (gameState !== 'PLAYING') return;

      if (key === 'DEL') {
        triggerLightHaptic();
        playTapSound();
        setCurrentGuess((prev) => prev.slice(0, -1));
        return;
      }

      if (key === 'ENTER') {
        if (currentGuess.length < 5) {
          triggerSliceHaptic();
          if (juiceRef.current) juiceRef.current.shake(6, 2);
          setStatusMessage('NEED ALL 5 LETTERS TO SUBMIT!');
          return;
        }

        const evaluation = evaluateGuess(currentGuess, targetWord);
        const nextGuesses = [
          ...guesses,
          { word: currentGuess, states: evaluation },
        ];
        setGuesses(nextGuesses);
        setCurrentGuess('');

        if (currentGuess === targetWord) {
          const remainingBonus = (6 - nextGuesses.length + 1) * 50;
          const nextStreak = streak + 1;
          const gained = remainingBonus + nextStreak * 25;
          const nextScore = score + gained;
          setScore(nextScore);
          setStreak(nextStreak);
          setGameState('WON');
          setStatusMessage(`CIPHER CRACKED! +${gained} PTS`);
          saveScore(nextScore);
          triggerPerfectHaptic(3);
          playPerfectSound(5);
          if (juiceRef.current) {
            juiceRef.current.celebrate(
              'CIPHER CRACKED!',
              `+${gained} PTS // STREAK x${nextStreak}`,
              COLORS.matrixMint
            );
          }
        } else if (nextGuesses.length >= 6) {
          setGameState('LOST');
          setStreak(0);
          setStatusMessage(`DECRYPTION FAILED // WORD WAS: ${targetWord}`);
          triggerGameOverHaptic();
          playGameOverSound();
          if (juiceRef.current) {
            juiceRef.current.shake(10, 6);
            juiceRef.current.flash(COLORS.danger);
          }
        } else {
          const greenCount = evaluation.filter((e) => e === 'CORRECT').length;
          triggerSliceHaptic();
          playSliceSound();
          if (juiceRef.current) {
            juiceRef.current.shake(4, 3);
            if (greenCount > 0) {
              juiceRef.current.burst(undefined, undefined, COLORS.matrixMint, 10);
            }
          }
          setStatusMessage(`${6 - nextGuesses.length} ATTEMPTS REMAINING`);
        }
        return;
      }

      if (currentGuess.length < 5) {
        triggerLightHaptic();
        playTapSound();
        setCurrentGuess((prev) => prev + key);
      }
    },
    [gameState, currentGuess, targetWord, guesses, streak, score, saveScore]
  );

  const handleUseHint = useCallback(() => {
    if (gameState !== 'PLAYING') return;
    triggerLightHaptic();
    playTapSound();
    const pos = Math.min(4, currentGuess.length);
    setStatusMessage(`HINT // LETTER #${pos + 1} IS "${targetWord[pos]}"`);
    if (juiceRef.current) {
      juiceRef.current.popup(
        `LETTER #${pos + 1}: ${targetWord[pos]}`,
        'CYBER INTEL',
        COLORS.solarGold
      );
    }
  }, [gameState, currentGuess, targetWord]);

  const keyStates = {};
  guesses.forEach((g) => {
    g.word.split('').forEach((ch, idx) => {
      const st = g.states[idx];
      if (st === 'CORRECT') {
        keyStates[ch] = 'CORRECT';
      } else if (st === 'PRESENT' && keyStates[ch] !== 'CORRECT') {
        keyStates[ch] = 'PRESENT';
      } else if (!keyStates[ch]) {
        keyStates[ch] = 'ABSENT';
      }
    });
  });

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={localStyles.container}>
        <LinearGradient
          colors={['#03030A', '#0A081E', '#15092C']}
          style={StyleSheet.absoluteFillObject}
        />

        <MiniGameHeader
          title="WORDLY NEO"
          floorLabel="FLOOR 03 // WORD CIPHER"
          score={score}
          bestScore={bestScore}
          accentColor={COLORS.matrixMint}
          onBack={onBackToHub}
          onReset={() => startNextRound(false)}
        />

        <View style={localStyles.body}>
          <View style={localStyles.statusRow}>
            <Text numberOfLines={1} style={localStyles.statusBanner}>
              {statusMessage}
            </Text>
            <Pressable onPress={handleUseHint} style={localStyles.hintBtn}>
              <Text style={localStyles.hintBtnText}>HINT</Text>
            </Pressable>
          </View>

          <View style={localStyles.gridWrapper}>
            {Array.from({ length: 6 }).map((_, rowIdx) => {
              const submitted = guesses[rowIdx];
              const isCurrent =
                rowIdx === guesses.length && gameState === 'PLAYING';
              return (
                <View key={`wrow_${rowIdx}`} style={localStyles.wordRow}>
                  {Array.from({ length: 5 }).map((__, colIdx) => {
                    const char = submitted
                      ? submitted.word[colIdx]
                      : isCurrent
                        ? currentGuess[colIdx] || ''
                        : '';
                    const st = submitted ? submitted.states[colIdx] : 'IDLE';

                    const bg =
                      st === 'CORRECT'
                        ? '#06D6A0'
                        : st === 'PRESENT'
                          ? '#F77F00'
                          : st === 'ABSENT'
                            ? 'rgba(255, 255, 255, 0.08)'
                            : isCurrent && char
                              ? 'rgba(0, 245, 212, 0.18)'
                              : 'rgba(10, 10, 26, 0.85)';

                    const border =
                      st === 'CORRECT'
                        ? '#00F5D4'
                        : st === 'PRESENT'
                          ? '#FFD166'
                          : isCurrent && char
                            ? '#00F5D4'
                            : 'rgba(255, 255, 255, 0.15)';

                    return (
                      <View
                        key={`wcell_${rowIdx}_${colIdx}`}
                        style={[
                          localStyles.letterBox,
                          {
                            width: boxSize,
                            height: boxSize,
                            backgroundColor: bg,
                            borderColor: border,
                          },
                        ]}
                      >
                        <Text style={localStyles.letterText}>{char}</Text>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>

          {gameState !== 'PLAYING' && (
            <Pressable
              onPress={() => startNextRound(false)}
              style={localStyles.nextWordBtn}
            >
              <Text style={localStyles.nextWordText}>
                {gameState === 'WON' ? 'NEXT CIPHER (+STREAK)' : 'TRY NEW WORD'}
              </Text>
            </Pressable>
          )}

          <View style={localStyles.keyboardContainer}>
            {KEYBOARD_ROWS.map((row, rIdx) => (
              <View key={`krow_${rIdx}`} style={localStyles.kbRow}>
                {row.map((key) => {
                  const isWide = key === 'ENTER' || key === 'DEL';
                  const st = keyStates[key];
                  const keyBg =
                    st === 'CORRECT'
                      ? '#06D6A0'
                      : st === 'PRESENT'
                        ? '#F77F00'
                        : st === 'ABSENT'
                          ? 'rgba(255, 255, 255, 0.06)'
                          : 'rgba(0, 245, 255, 0.14)';

                  return (
                    <Pressable
                      key={key}
                      onPress={() => handleKeyPress(key)}
                      style={({ pressed }) => [
                        localStyles.kbKey,
                        isWide && localStyles.kbKeyWide,
                        { backgroundColor: keyBg },
                        pressed && { opacity: 0.7, transform: [{ scale: 0.94 }] },
                      ]}
                    >
                      <Text
                        style={[
                          localStyles.kbKeyText,
                          st === 'ABSENT' && { color: COLORS.textMuted },
                        ]}
                      >
                        {key}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
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
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  statusRow: {
    width: '92%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 245, 212, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 212, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statusBanner: {
    flex: 1,
    fontSize: 10.5,
    fontFamily: monoFont,
    fontWeight: '800',
    color: COLORS.matrixMint,
    letterSpacing: 0.6,
  },
  hintBtn: {
    backgroundColor: 'rgba(255, 209, 102, 0.2)',
    borderWidth: 1,
    borderColor: COLORS.solarGold,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  hintBtnText: {
    fontSize: 9.5,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.solarGold,
  },
  gridWrapper: {
    gap: 6,
    marginVertical: 4,
  },
  wordRow: {
    flexDirection: 'row',
    gap: 6,
  },
  letterBox: {
    borderRadius: 10,
    borderWidth: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterText: {
    fontSize: 22,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  nextWordBtn: {
    backgroundColor: COLORS.matrixMint,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 14,
  },
  nextWordText: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#030308',
    letterSpacing: 1.4,
  },
  keyboardContainer: {
    width: '100%',
    paddingHorizontal: 6,
    gap: 6,
    paddingBottom: 10,
  },
  kbRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  kbKey: {
    minWidth: 30,
    height: 44,
    paddingHorizontal: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kbKeyWide: {
    minWidth: 52,
    paddingHorizontal: 10,
  },
  kbKeyText: {
    fontSize: 12.5,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
