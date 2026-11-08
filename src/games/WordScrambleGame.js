import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../../styles';
import MiniGameHeader from '../components/MiniGameHeader';
import JuiceEngine from '../components/JuiceEngine';
import GameResultModal from '../components/GameResultModal';
import { isValidWord } from '../data/scrabbleDictionary';
import {
  triggerLightHaptic,
  triggerMediumHaptic,
  triggerPerfectHaptic,
  triggerSliceHaptic,
  triggerGameOverHaptic,
} from '../utils/haptics';
import {
  playTapSound,
  playSliceSound,
  playPerfectSound,
  playGameOverSound,
} from '../utils/sound';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const STORAGE_LEVEL_KEY = '@game_tower:level_scramble_v1';
const STORAGE_BEST_KEY = '@game_tower:best_scramble_v1';

// Rich, diverse anagram letter sets for dynamic, non-repeating gameplay
const LETTER_SETS_5 = [
  ['S', 'T', 'A', 'R', 'E'],
  ['P', 'L', 'A', 'N', 'T'],
  ['S', 'M', 'A', 'R', 'T'],
  ['C', 'R', 'A', 'N', 'E'],
  ['G', 'A', 'M', 'E', 'S'],
  ['H', 'E', 'A', 'R', 'T'],
  ['S', 'H', 'I', 'N', 'E'],
  ['T', 'R', 'A', 'I', 'N'],
  ['W', 'A', 'T', 'E', 'R'],
  ['D', 'R', 'E', 'A', 'M'],
  ['S', 'T', 'O', 'R', 'M'],
  ['L', 'E', 'A', 'S', 'T'],
  ['P', 'O', 'I', 'N', 'T'],
  ['R', 'E', 'A', 'C', 'T'],
  ['F', 'L', 'A', 'M', 'E'],
  ['T', 'R', 'A', 'C', 'E'],
  ['S', 'H', 'A', 'R', 'E'],
  ['B', 'R', 'E', 'A', 'D'],
  ['G', 'U', 'I', 'D', 'E'],
  ['B', 'E', 'A', 'S', 'T'],
  ['P', 'L', 'A', 'T', 'E'],
  ['S', 'T', 'O', 'N', 'E'],
  ['S', 'P', 'A', 'R', 'K'],
  ['G', 'R', 'A', 'C', 'E'],
  ['C', 'L', 'O', 'U', 'D'],
];

const LETTER_SETS_6 = [
  ['C', 'L', 'O', 'U', 'D', 'S'],
  ['S', 'P', 'R', 'I', 'N', 'G'],
  ['F', 'L', 'I', 'G', 'H', 'T'],
  ['P', 'L', 'A', 'N', 'E', 'T'],
  ['S', 'T', 'R', 'E', 'A', 'M'],
  ['S', 'P', 'A', 'R', 'K', 'S'],
  ['C', 'A', 'S', 'T', 'L', 'E'],
  ['S', 'I', 'L', 'V', 'E', 'R'],
  ['W', 'I', 'N', 'T', 'E', 'R'],
  ['M', 'A', 'R', 'K', 'E', 'T'],
  ['D', 'A', 'N', 'G', 'E', 'R'],
  ['F', 'O', 'R', 'E', 'S', 'T'],
  ['G', 'A', 'R', 'D', 'E', 'N'],
  ['B', 'R', 'I', 'G', 'H', 'T'],
  ['T', 'R', 'A', 'V', 'E', 'L'],
  ['M', 'A', 'S', 'T', 'E', 'R'],
  ['W', 'O', 'N', 'D', 'E', 'R'],
  ['A', 'C', 'T', 'I', 'O', 'N'],
  ['B', 'E', 'A', 'U', 'T', 'Y'],
  ['F', 'R', 'I', 'E', 'N', 'D'],
  ['B', 'R', 'I', 'D', 'G', 'E'],
  ['N', 'A', 'T', 'U', 'R', 'E'],
  ['S', 'I', 'L', 'E', 'N', 'T'],
  ['G', 'O', 'L', 'D', 'E', 'N'],
  ['S', 'T', 'R', 'O', 'N', 'G'],
];

const LETTER_SETS_7 = [
  ['C', 'R', 'Y', 'S', 'T', 'A', 'L'],
  ['D', 'I', 'A', 'M', 'O', 'N', 'D'],
  ['T', 'H', 'U', 'N', 'D', 'E', 'R'],
  ['R', 'A', 'I', 'N', 'B', 'O', 'W'],
  ['K', 'I', 'N', 'G', 'D', 'O', 'M'],
  ['M', 'Y', 'S', 'T', 'E', 'R', 'Y'],
  ['F', 'O', 'R', 'T', 'U', 'N', 'E'],
  ['P', 'H', 'A', 'N', 'T', 'O', 'M'],
  ['V', 'I', 'C', 'T', 'O', 'R', 'Y'],
  ['C', 'H', 'A', 'M', 'P', 'I', 'O', 'N'],
  ['S', 'H', 'A', 'D', 'O', 'W', 'S'],
  ['P', 'A', 'L', 'A', 'D', 'I', 'N'],
  ['F', 'E', 'A', 'T', 'H', 'E', 'R'],
  ['C', 'A', 'P', 'T', 'A', 'I', 'N'],
  ['B', 'A', 'L', 'L', 'O', 'O', 'N'],
  ['P', 'R', 'O', 'M', 'I', 'S', 'E'],
  ['J', 'O', 'U', 'R', 'N', 'E', 'Y'],
  ['H', 'O', 'R', 'I', 'Z', 'O', 'N'],
  ['B', 'L', 'O', 'S', 'S', 'O', 'M'],
  ['W', 'A', 'R', 'R', 'I', 'O', 'R'],
];

/**
 * Picks a brand new letter set guaranteed to be DIFFERENT from the previous set!
 */
function pickNewLetterSet(lvlNum, previousLetters) {
  let pool = LETTER_SETS_5;
  let goal = 4;
  let roundTime = 50;

  if (lvlNum >= 6 && lvlNum <= 15) {
    pool = LETTER_SETS_6;
    goal = 5;
    roundTime = 55;
  } else if (lvlNum >= 16) {
    pool = LETTER_SETS_7;
    goal = 6;
    roundTime = 60;
  }

  // Filter out previous letters so next time the letters are NEVER the same!
  const prevSignature = previousLetters ? [...previousLetters].sort().join('') : '';
  const candidatePool = pool.filter((s) => [...s].sort().join('') !== prevSignature);
  const finalPool = candidatePool.length > 0 ? candidatePool : pool;

  const chosen = finalPool[Math.floor(Math.random() * finalPool.length)];

  // Shuffle letters for circular dial
  const letters = [...chosen];
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }

  return { letters, goal, roundTime };
}

// Calculate score for a word based on length
function getWordScore(word) {
  const len = word.length;
  if (len === 2) return 20;
  if (len === 3) return 40;
  if (len === 4) return 80;
  if (len === 5) return 150;
  if (len === 6) return 250;
  if (len === 7) return 400;
  return len * 60;
}

export default function WordScrambleGame({ onBackToHub, onScoreUpdate, isPaused = false }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const juiceRef = useRef(null);
  const lastLettersRef = useRef(null);

  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  // Round configuration & letter setup
  const [roundConfig, setRoundConfig] = useState(() => {
    const initialCfg = pickNewLetterSet(1, null);
    lastLettersRef.current = initialCfg.letters;
    return initialCfg;
  });

  const [shuffledLetters, setShuffledLetters] = useState(() => roundConfig.letters);
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [foundWords, setFoundWords] = useState([]);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState(roundConfig.roundTime);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // Modal result state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('VICTORY'); // 'VICTORY' | 'GAME_OVER'

  // Rotation animation for shuffle button
  const shuffleSpin = useRef(new Animated.Value(0)).current;

  // Latest state refs to eliminate timer stale closures
  const foundWordsRef = useRef(foundWords);
  foundWordsRef.current = foundWords;
  const roundConfigRef = useRef(roundConfig);
  roundConfigRef.current = roundConfig;
  const levelRef = useRef(level);
  levelRef.current = level;

  // Load saved level & score
  useEffect(() => {
    (async () => {
      try {
        const savedLvl = await AsyncStorage.getItem(STORAGE_LEVEL_KEY);
        const savedScore = await AsyncStorage.getItem(STORAGE_BEST_KEY);
        if (savedLvl !== null) {
          const pLvl = parseInt(savedLvl, 10);
          if (!isNaN(pLvl) && pLvl >= 1) {
            setLevel(pLvl);
            startRound(pLvl);
          }
        }
        if (savedScore !== null) {
          const pScore = parseInt(savedScore, 10);
          if (!isNaN(pScore)) setBestScore(pScore);
        }
      } catch {}
    })();
  }, []);

  // Starts a fresh round with guaranteed DIFFERENT letters
  const startRound = useCallback((lvl) => {
    const nextCfg = pickNewLetterSet(lvl, lastLettersRef.current);
    lastLettersRef.current = nextCfg.letters;

    setRoundConfig(nextCfg);
    setShuffledLetters(nextCfg.letters);
    setSelectedIndices([]);
    setFoundWords([]);
    setFeedbackMsg(null);
    setTimeLeft(nextCfg.roundTime);
    setIsTimerRunning(true);
    setModalVisible(false);
  }, []);

  // When time runs out: check if goal is met
  const handleTimeUp = useCallback(() => {
    setIsTimerRunning(false);
    const goalReached = foundWordsRef.current.length >= roundConfigRef.current.goal;

    if (goalReached) {
      // VICTORY! Level cleared!
      playPerfectSound(5);
      triggerPerfectHaptic(5);
      setModalType('VICTORY');
      setModalVisible(true);
    } else {
      // FAILED / GAME OVER!
      playGameOverSound();
      triggerGameOverHaptic();
      setModalType('GAME_OVER');
      setModalVisible(true);
    }
  }, []);

  // 1-second Countdown Timer
  useEffect(() => {
    if (!isTimerRunning || modalVisible || isPaused) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleTimeUp();
          return 0;
        }
        if (prev <= 6) {
          triggerLightHaptic();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, modalVisible, isPaused, handleTimeUp]);

  // Current word formed by selected letter indices
  const currentWord = selectedIndices.map((idx) => shuffledLetters[idx]).join('');

  // Handle letter tap on dial
  const handleTapLetter = (idx) => {
    if (selectedIndices.includes(idx)) {
      // Tap on already-selected letter -> remove it
      setSelectedIndices((prev) => prev.filter((i) => i !== idx));
      triggerLightHaptic();
      playTapSound();
      return;
    }

    triggerLightHaptic();
    playTapSound();
    setSelectedIndices((prev) => [...prev, idx]);
  };

  // Backspace last tapped letter
  const handleBackspace = () => {
    if (selectedIndices.length === 0) return;
    triggerLightHaptic();
    playTapSound();
    setSelectedIndices((prev) => prev.slice(0, -1));
  };

  // Clear all selected letters
  const handleClear = () => {
    if (selectedIndices.length === 0) return;
    triggerLightHaptic();
    playTapSound();
    setSelectedIndices([]);
  };

  // Shuffle letter order on the dial
  const handleShuffle = () => {
    triggerMediumHaptic();
    playSliceSound();

    Animated.sequence([
      Animated.timing(shuffleSpin, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(shuffleSpin, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }),
    ]).start();

    const lettersWithIds = shuffledLetters.map((char, originalIdx) => ({
      char,
      originalIdx,
      isSelected: selectedIndices.includes(originalIdx),
      selectedOrder: selectedIndices.indexOf(originalIdx),
    }));

    for (let i = lettersWithIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [lettersWithIds[i], lettersWithIds[j]] = [lettersWithIds[j], lettersWithIds[i]];
    }

    const newShuffledLetters = lettersWithIds.map((item) => item.char);
    const newSelectedIndices = [];

    const selectedItems = lettersWithIds
      .filter((item) => item.isSelected)
      .sort((a, b) => a.selectedOrder - b.selectedOrder);

    selectedItems.forEach((item) => {
      const newIdx = lettersWithIds.findIndex((x) => x === item);
      if (newIdx !== -1) newSelectedIndices.push(newIdx);
    });

    setShuffledLetters(newShuffledLetters);
    setSelectedIndices(newSelectedIndices);
  };

  // Submit current word: Wrong submissions cut -10 score!
  const handleSubmitWord = useCallback(() => {
    if (currentWord.length < 2) {
      setFeedbackMsg('AT LEAST 2 LETTERS REQUIRED!');
      playSliceSound();
      triggerSliceHaptic();
      if (juiceRef.current) juiceRef.current.shake(3, 2);
      return;
    }

    if (foundWords.includes(currentWord)) {
      const penalizedScore = Math.max(0, score - 10);
      setScore(penalizedScore);
      onScoreUpdate?.(penalizedScore);
      setFeedbackMsg(`ALREADY FOUND "${currentWord}"! (-10 PTS)`);
      playSliceSound();
      triggerSliceHaptic();
      if (juiceRef.current) juiceRef.current.shake(4, 2);
      setSelectedIndices([]);
      return;
    }

    if (!isValidWord(currentWord)) {
      const penalizedScore = Math.max(0, score - 10);
      setScore(penalizedScore);
      onScoreUpdate?.(penalizedScore);
      setFeedbackMsg(`"${currentWord}" IS NOT A VALID WORD! (-10 PTS)`);
      playSliceSound();
      triggerSliceHaptic();
      if (juiceRef.current) juiceRef.current.shake(5, 2);
      setSelectedIndices([]);
      return;
    }

    // Valid new word!
    const pts = getWordScore(currentWord);
    const newScore = score + pts;
    const newFound = [...foundWords, currentWord];

    setScore(newScore);
    setFoundWords(newFound);
    setSelectedIndices([]);
    setFeedbackMsg(`+${pts} PTS! "${currentWord}" FOUND!`);

    triggerPerfectHaptic(Math.min(5, currentWord.length));
    playPerfectSound(Math.min(5, currentWord.length));

    if (newScore > bestScore) {
      setBestScore(newScore);
      AsyncStorage.setItem(STORAGE_BEST_KEY, String(newScore)).catch(() => {});
    }
    onScoreUpdate?.(newScore);

    if (juiceRef.current) {
      juiceRef.current.celebrate(
        `+${pts} PTS!`,
        `"${currentWord}" ADDED`,
        '#00F5FF'
      );
    }

    // Celebrate milestone when goal reached
    if (newFound.length === roundConfig.goal) {
      setTimeout(() => {
        if (juiceRef.current) {
          juiceRef.current.celebrate(
            'GOAL REACHED!',
            `LEVEL ${level} GOAL UNLOCKED!`,
            '#FFD166'
          );
        }
      }, 400);
    }
  }, [bestScore, currentWord, foundWords, level, onScoreUpdate, roundConfig.goal, score]);

  // Advance to next level (guaranteed DIFFERENT letters)
  const handleNextLevel = () => {
    const nextLvl = level + 1;
    setLevel(nextLvl);
    AsyncStorage.setItem(STORAGE_LEVEL_KEY, String(nextLvl)).catch(() => {});
    triggerMediumHaptic();
    playTapSound();
    startRound(nextLvl);
  };

  // Retry level on fail (guaranteed DIFFERENT letters)
  const handleRetry = () => {
    triggerMediumHaptic();
    playTapSound();
    startRound(level);
  };

  const spinInterpolation = shuffleSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const isGoalReached = foundWords.length >= roundConfig.goal;

  // Geometry for circular letter dial (scaled with safe area to avoid any overflow)
  const availableDialHeight = Math.max(160, Math.min(220, height * 0.28));
  const dialSize = Math.min(availableDialHeight, width - 64);
  const dialRadius = dialSize * 0.38;
  const letterCount = shuffledLetters.length;
  const letterBtnSize = Math.max(38, Math.min(50, Math.floor((dialSize * 2.6) / (letterCount + 2))));

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={styles.container}>
        <LinearGradient
          colors={['#03030A', '#0D0822', '#1A0B36']}
          style={StyleSheet.absoluteFillObject}
        />

        <MiniGameHeader
          floorNum={3}
          gameTitle="WORD SCRAMBLE"
          category="ANAGRAM MATRIX"
          accentColor="#00F5FF"
          score={score}
          bestScore={bestScore}
          onBack={onBackToHub}
          onBackToHub={onBackToHub}
          onReset={() => startRound(level)}
        />

        {/* Top HUD: Level, Countdown Timer & Goal Progress */}
        <View style={styles.hudRow}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>LEVEL {level}</Text>
          </View>

          {/* Glowing Countdown Timer */}
          <View style={[styles.timerBadge, timeLeft <= 10 && styles.timerBadgeUrgent]}>
            <Text style={[styles.timerText, timeLeft <= 10 && styles.timerTextUrgent]}>
              ⏱️ {String(Math.floor(timeLeft / 60))}:{String(timeLeft % 60).padStart(2, '0')}
            </Text>
          </View>

          {/* Goal Badge / Early Next Level Button */}
          <View style={styles.goalInfo}>
            <Text style={styles.goalLabel}>
              GOAL: {foundWords.length}/{roundConfig.goal}
            </Text>
            {isGoalReached ? (
              <Pressable style={styles.nextLevelBtn} onPress={handleNextLevel}>
                <Text style={styles.nextLevelBtnText}>NEXT ➔</Text>
              </Pressable>
            ) : (
              <Text style={styles.goalSub}>
                {roundConfig.goal - foundWords.length} MORE
              </Text>
            )}
          </View>
        </View>

        {/* Time Progress Gauge Bar */}
        <View style={styles.timerGaugeTrack}>
          <View
            style={[
              styles.timerGaugeFill,
              {
                width: `${Math.max(0, Math.min(100, (timeLeft / roundConfig.roundTime) * 100))}%`,
                backgroundColor: timeLeft <= 10 ? '#FF0055' : timeLeft <= 20 ? '#FFE600' : '#00F5FF',
              },
            ]}
          />
        </View>

        {/* Found Words Tray */}
        <View style={styles.foundWordsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.foundWordsList}
          >
            {foundWords.length === 0 ? (
              <Text style={styles.emptyWordsHint}>
                Create 2+ letter words from the letters below!
              </Text>
            ) : (
              foundWords.map((w, idx) => (
                <View key={`fw_${idx}`} style={styles.wordChip}>
                  <Text style={styles.wordChipText}>{w}</Text>
                  <Text style={styles.wordChipPts}>+{getWordScore(w)}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>

        {/* Feedback / Error Toast Message */}
        <View style={styles.feedbackRow}>
          <Text
            style={[
              styles.feedbackText,
              feedbackMsg?.includes('!') && !feedbackMsg?.includes('FOUND')
                ? { color: '#FF0055' }
                : { color: '#00F5FF' },
            ]}
          >
            {feedbackMsg || ' '}
          </Text>
        </View>

        {/* Current Word Spelling Tray */}
        <View style={styles.trayContainer}>
          <View style={styles.wordSlotsRow}>
            {currentWord.length === 0 ? (
              <Text style={styles.wordPlaceholder}>TAP LETTERS TO SPELL</Text>
            ) : (
              currentWord.split('').map((char, i) => (
                <View key={`slot_${i}`} style={styles.letterTile}>
                  <Text style={styles.letterTileText}>{char}</Text>
                </View>
              ))
            )}
          </View>

          {/* Action buttons (Backspace, Clear) */}
          {currentWord.length > 0 && (
            <View style={styles.trayActions}>
              <Pressable
                onPress={handleBackspace}
                style={styles.trayActionBtn}
                hitSlop={8}
              >
                <Text style={styles.trayActionBtnText}>⌫</Text>
              </Pressable>
              <Pressable
                onPress={handleClear}
                style={[styles.trayActionBtn, { borderColor: 'rgba(255, 0, 85, 0.4)' }]}
                hitSlop={8}
              >
                <Text style={[styles.trayActionBtnText, { color: '#FF0055' }]}>✕</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Circular Letter Dial with Center Shuffle */}
        <View style={styles.dialArena}>
          <View style={[styles.dialRing, { width: dialSize, height: dialSize }]}>
            {/* Center Shuffle Button */}
            <Pressable
              onPress={handleShuffle}
              style={[styles.centerShuffleBtn, { width: dialSize * 0.34, height: dialSize * 0.34 }]}
            >
              <Animated.Text
                style={[
                  styles.shuffleIcon,
                  { transform: [{ rotate: spinInterpolation }] },
                ]}
              >
                🔀
              </Animated.Text>
              <Text style={styles.shuffleLabel}>SHUFFLE</Text>
            </Pressable>

            {/* Radially Placed Letter Buttons */}
            {shuffledLetters.map((char, idx) => {
              const angle = (idx / letterCount) * 2 * Math.PI - Math.PI / 2;
              const cx = dialSize / 2 + dialRadius * Math.cos(angle) - letterBtnSize / 2;
              const cy = dialSize / 2 + dialRadius * Math.sin(angle) - letterBtnSize / 2;
              const isUsed = selectedIndices.includes(idx);

              return (
                <Pressable
                  key={`dial_char_${idx}`}
                  onPress={() => handleTapLetter(idx)}
                  style={[
                    styles.letterDialBtn,
                    {
                      width: letterBtnSize,
                      height: letterBtnSize,
                      left: cx,
                      top: cy,
                    },
                    isUsed && styles.letterDialBtnUsed,
                  ]}
                >
                  <Text
                    style={[
                      styles.letterDialBtnText,
                      isUsed && styles.letterDialBtnTextUsed,
                    ]}
                  >
                    {char}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Submit Button (Padded safely above navigation buttons) */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(20, insets.bottom + 14) }]}>
          <Pressable
            onPress={handleSubmitWord}
            disabled={currentWord.length < 2}
            style={[
              styles.submitBtn,
              currentWord.length >= 2 ? styles.submitBtnActive : styles.submitBtnDisabled,
            ]}
          >
            <Text
              style={[
                styles.submitBtnText,
                currentWord.length >= 2 && styles.submitBtnTextActive,
              ]}
            >
              SUBMIT WORD ✔
            </Text>
          </Pressable>
        </View>

        {/* Victory / Game Over Modal */}
        <GameResultModal
          visible={modalVisible}
          type={modalType}
          title={modalType === 'VICTORY' ? `LEVEL ${level} CLEARED!` : "TIME'S UP! LEVEL FAILED"}
          subtitle={
            modalType === 'VICTORY'
              ? `DISCOVERED ${foundWords.length}/${roundConfig.goal} WORDS!`
              : `ONLY FOUND ${foundWords.length} OF ${roundConfig.goal} REQUIRED WORDS!`
          }
          score={score}
          bestScore={bestScore}
          accentColor={modalType === 'VICTORY' ? '#00F5FF' : '#FF0055'}
          onRetry={modalType === 'VICTORY' ? handleNextLevel : handleRetry}
          retryLabel={modalType === 'VICTORY' ? 'NEXT LEVEL ➔' : 'TRY AGAIN ⟳'}
          buttonText={modalType === 'VICTORY' ? 'NEXT LEVEL ➔' : 'TRY AGAIN ⟳'}
          onBackToHub={onBackToHub}
        />
      </View>
    </JuiceEngine>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#03030A',
  },
  hudRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(8, 8, 22, 0.92)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 245, 255, 0.18)',
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 245, 255, 0.15)',
    borderWidth: 1,
    borderColor: '#00F5FF',
  },
  levelBadgeText: {
    fontFamily: monoFont,
    fontSize: 11,
    fontWeight: '900',
    color: '#00F5FF',
    letterSpacing: 0.8,
  },
  timerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 245, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.35)',
  },
  timerBadgeUrgent: {
    backgroundColor: 'rgba(255, 0, 85, 0.18)',
    borderColor: '#FF0055',
  },
  timerText: {
    fontFamily: monoFont,
    fontSize: 12,
    fontWeight: '900',
    color: '#00F5FF',
    letterSpacing: 0.8,
  },
  timerTextUrgent: {
    color: '#FF0055',
  },
  timerGaugeTrack: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    width: '100%',
  },
  timerGaugeFill: {
    height: '100%',
  },
  goalInfo: {
    alignItems: 'flex-end',
  },
  goalLabel: {
    fontFamily: monoFont,
    fontSize: 10.5,
    fontWeight: '900',
    color: '#FFE600',
    letterSpacing: 0.5,
  },
  goalSub: {
    fontFamily: monoFont,
    fontSize: 8.5,
    color: '#8A8F9E',
    fontWeight: '700',
    marginTop: 1,
  },
  nextLevelBtn: {
    backgroundColor: 'rgba(57, 255, 20, 0.2)',
    borderWidth: 1,
    borderColor: '#39FF14',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  nextLevelBtnText: {
    fontFamily: monoFont,
    fontSize: 9.5,
    fontWeight: '900',
    color: '#39FF14',
    letterSpacing: 0.6,
  },
  foundWordsContainer: {
    height: 48,
    backgroundColor: 'rgba(10, 8, 25, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
  },
  foundWordsList: {
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 8,
  },
  emptyWordsHint: {
    fontFamily: monoFont,
    fontSize: 10,
    color: '#64748B',
    fontStyle: 'italic',
  },
  wordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 245, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  wordChipText: {
    fontFamily: monoFont,
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  wordChipPts: {
    fontFamily: monoFont,
    fontSize: 9,
    fontWeight: '800',
    color: '#FFE600',
  },
  feedbackRow: {
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  feedbackText: {
    fontFamily: monoFont,
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  trayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginHorizontal: 16,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(18, 12, 38, 0.92)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 245, 255, 0.35)',
  },
  wordSlotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flex: 1,
  },
  wordPlaceholder: {
    fontFamily: monoFont,
    fontSize: 11,
    color: '#555577',
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  letterTile: {
    width: 34,
    height: 38,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 245, 255, 0.18)',
    borderWidth: 1.5,
    borderColor: '#00F5FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00F5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 4,
  },
  letterTileText: {
    fontFamily: monoFont,
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  trayActions: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 8,
  },
  trayActionBtn: {
    width: 32,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trayActionBtnText: {
    fontFamily: monoFont,
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  dialArena: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  dialRing: {
    position: 'relative',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(157, 78, 221, 0.25)',
    backgroundColor: 'rgba(12, 10, 28, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerShuffleBtn: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(157, 78, 221, 0.2)',
    borderWidth: 1.5,
    borderColor: '#9D4EDD',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  shuffleIcon: {
    fontSize: 18,
  },
  shuffleLabel: {
    fontFamily: monoFont,
    fontSize: 7.5,
    fontWeight: '900',
    color: '#E0AAFF',
    marginTop: 2,
    letterSpacing: 0.6,
  },
  letterDialBtn: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(20, 14, 45, 0.95)',
    borderWidth: 2,
    borderColor: '#00F5FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00F5FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  letterDialBtnUsed: {
    backgroundColor: 'rgba(10, 10, 20, 0.5)',
    borderColor: 'rgba(100, 116, 139, 0.4)',
    opacity: 0.45,
  },
  letterDialBtnText: {
    fontFamily: monoFont,
    fontSize: 20,
    fontWeight: '900',
    color: '#00F5FF',
  },
  letterDialBtnTextUsed: {
    color: '#64748B',
  },
  bottomBar: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  submitBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  submitBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  submitBtnActive: {
    backgroundColor: 'rgba(0, 245, 255, 0.22)',
    borderColor: '#00F5FF',
    shadowColor: '#00F5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 6,
  },
  submitBtnText: {
    fontFamily: monoFont,
    fontSize: 13,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 1.2,
  },
  submitBtnTextActive: {
    color: '#00F5FF',
    textShadowColor: 'rgba(0, 245, 255, 0.7)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});
