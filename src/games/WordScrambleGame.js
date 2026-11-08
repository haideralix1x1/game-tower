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
} from '../utils/haptics';
import {
  playTapSound,
  playSliceSound,
  playPerfectSound,
} from '../utils/sound';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const STORAGE_LEVEL_KEY = '@game_tower:level_scramble_v1';
const STORAGE_BEST_KEY = '@game_tower:best_scramble_v1';

// Curated 30+ Levels with rich anagram combinations
const PRESET_LEVELS = [
  { level: 1, letters: ['S', 'T', 'A', 'R', 'E'], goal: 5 },
  { level: 2, letters: ['P', 'L', 'A', 'N', 'T'], goal: 5 },
  { level: 3, letters: ['S', 'M', 'A', 'R', 'T'], goal: 5 },
  { level: 4, letters: ['B', 'L', 'A', 'Z', 'E'], goal: 5 },
  { level: 5, letters: ['C', 'R', 'O', 'W', 'N'], goal: 5 },
  { level: 6, letters: ['C', 'L', 'O', 'U', 'D', 'S'], goal: 6 },
  { level: 7, letters: ['S', 'P', 'R', 'I', 'N', 'G'], goal: 6 },
  { level: 8, letters: ['F', 'L', 'I', 'G', 'H', 'T'], goal: 6 },
  { level: 9, letters: ['P', 'L', 'A', 'N', 'E', 'T'], goal: 6 },
  { level: 10, letters: ['S', 'T', 'R', 'E', 'A', 'M'], goal: 6 },
  { level: 11, letters: ['S', 'P', 'A', 'R', 'K', 'S'], goal: 6 },
  { level: 12, letters: ['C', 'A', 'S', 'T', 'L', 'E'], goal: 6 },
  { level: 13, letters: ['S', 'I', 'L', 'V', 'E', 'R'], goal: 6 },
  { level: 14, letters: ['W', 'I', 'N', 'T', 'E', 'R'], goal: 6 },
  { level: 15, letters: ['M', 'A', 'R', 'K', 'E', 'T'], goal: 6 },
  { level: 16, letters: ['C', 'R', 'Y', 'S', 'T', 'A', 'L'], goal: 7 },
  { level: 17, letters: ['D', 'I', 'A', 'M', 'O', 'N', 'D'], goal: 7 },
  { level: 18, letters: ['T', 'H', 'U', 'N', 'D', 'E', 'R'], goal: 7 },
  { level: 19, letters: ['R', 'A', 'I', 'N', 'B', 'O', 'W'], goal: 7 },
  { level: 20, letters: ['K', 'I', 'N', 'G', 'D', 'O', 'M'], goal: 7 },
  { level: 21, letters: ['M', 'Y', 'S', 'T', 'E', 'R', 'Y'], goal: 7 },
  { level: 22, letters: ['F', 'O', 'R', 'T', 'U', 'N', 'E'], goal: 7 },
  { level: 23, letters: ['P', 'H', 'A', 'N', 'T', 'O', 'M'], goal: 7 },
  { level: 24, letters: ['V', 'I', 'C', 'T', 'O', 'R', 'Y'], goal: 7 },
  { level: 25, letters: ['C', 'H', 'A', 'M', 'P', 'I', 'O', 'N'], goal: 8 },
];

function getLevelData(lvlNum) {
  if (lvlNum <= PRESET_LEVELS.length) {
    return PRESET_LEVELS[lvlNum - 1];
  }
  // Procedural generator for endless high levels
  const extraPools = [
    ['S', 'H', 'A', 'D', 'O', 'W', 'S'],
    ['P', 'A', 'L', 'A', 'D', 'I', 'N'],
    ['F', 'E', 'A', 'T', 'H', 'E', 'R'],
    ['C', 'A', 'P', 'T', 'A', 'I', 'N'],
    ['B', 'A', 'L', 'L', 'O', 'O', 'N'],
    ['P', 'R', 'O', 'M', 'I', 'S', 'E'],
    ['S', 'U', 'N', 'S', 'H', 'I', 'N', 'E'],
  ];
  const idx = (lvlNum - PRESET_LEVELS.length - 1) % extraPools.length;
  return {
    level: lvlNum,
    letters: extraPools[idx],
    goal: 6,
  };
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

export default function WordScrambleGame({ onBackToHub, onScoreUpdate }) {
  const { width, height } = useWindowDimensions();

  const juiceRef = useRef(null);

  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  // Current level letter configuration
  const currentLevelConfig = getLevelData(level);
  const [shuffledLetters, setShuffledLetters] = useState(() => [...currentLevelConfig.letters]);
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [foundWords, setFoundWords] = useState([]);
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [levelClearedModal, setLevelClearedModal] = useState(false);

  // Rotation animation for shuffle button
  const shuffleSpin = useRef(new Animated.Value(0)).current;

  // Load saved level & score
  useEffect(() => {
    (async () => {
      try {
        const savedLvl = await AsyncStorage.getItem(STORAGE_LEVEL_KEY);
        const savedScore = await AsyncStorage.getItem(STORAGE_BEST_KEY);
        if (savedLvl !== null) {
          const pLvl = parseInt(savedLvl, 10);
          if (!isNaN(pLvl) && pLvl >= 1) setLevel(pLvl);
        }
        if (savedScore !== null) {
          const pScore = parseInt(savedScore, 10);
          if (!isNaN(pScore)) setBestScore(pScore);
        }
      } catch {}
    })();
  }, []);

  // Sync letter set when level changes
  useEffect(() => {
    const cfg = getLevelData(level);
    setShuffledLetters([...cfg.letters]);
    setSelectedIndices([]);
    setFoundWords([]);
    setFeedbackMsg(null);
  }, [level]);

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

  // Backspace last letter
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

    // Shuffle letters while maintaining selected word integrity
    const lettersWithIds = shuffledLetters.map((char, originalIdx) => ({
      char,
      originalIdx,
      isSelected: selectedIndices.includes(originalIdx),
      selectedOrder: selectedIndices.indexOf(originalIdx),
    }));

    // Fisher-Yates shuffle
    for (let i = lettersWithIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [lettersWithIds[i], lettersWithIds[j]] = [lettersWithIds[j], lettersWithIds[i]];
    }

    const newShuffledLetters = lettersWithIds.map((item) => item.char);
    const newSelectedIndices = [];

    // Reconstruct selected indices in their previous order
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

  // Submit current word
  const handleSubmitWord = useCallback(() => {
    if (currentWord.length < 2) {
      setFeedbackMsg('AT LEAST 2 LETTERS REQUIRED!');
      playSliceSound();
      triggerSliceHaptic();
      if (juiceRef.current) juiceRef.current.shake(3, 2);
      return;
    }

    if (foundWords.includes(currentWord)) {
      setFeedbackMsg(`ALREADY FOUND "${currentWord}"!`);
      playSliceSound();
      triggerSliceHaptic();
      if (juiceRef.current) juiceRef.current.shake(4, 2);
      setSelectedIndices([]);
      return;
    }

    if (!isValidWord(currentWord)) {
      setFeedbackMsg(`"${currentWord}" IS NOT A VALID WORD!`);
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

    // Check if level goal just achieved
    if (newFound.length === currentLevelConfig.goal) {
      setTimeout(() => {
        if (juiceRef.current) {
          juiceRef.current.celebrate(
            'GOAL ACHIEVED!',
            `LEVEL ${level} CLEARED!`,
            '#FFD166'
          );
        }
      }, 400);
    }
  }, [bestScore, currentLevelConfig.goal, currentWord, foundWords, level, onScoreUpdate, score]);

  // Advance to next level
  const handleNextLevel = () => {
    const nextLvl = level + 1;
    setLevel(nextLvl);
    AsyncStorage.setItem(STORAGE_LEVEL_KEY, String(nextLvl)).catch(() => {});
    setLevelClearedModal(false);
    triggerMediumHaptic();
    playTapSound();
  };

  const spinInterpolation = shuffleSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const isGoalReached = foundWords.length >= currentLevelConfig.goal;

  // Geometry for circular letter dial
  const dialSize = Math.min(240, Math.min(width - 40, height * 0.32));
  const dialRadius = dialSize * 0.40;
  const letterCount = shuffledLetters.length;
  const letterBtnSize = Math.max(40, Math.min(54, Math.floor((dialSize * 2.8) / (letterCount + 2))));

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
          onReset={() => {
            setSelectedIndices([]);
            setFoundWords([]);
            setFeedbackMsg(null);
          }}
        />

        {/* Top HUD: Level & Goal Progress Banner */}
        <View style={styles.hudRow}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>LEVEL {level}</Text>
          </View>

          <View style={styles.goalInfo}>
            <Text style={styles.goalLabel}>
              GOAL: {foundWords.length}/{currentLevelConfig.goal} WORDS
            </Text>
            {isGoalReached ? (
              <Pressable style={styles.nextLevelBtn} onPress={handleNextLevel}>
                <Text style={styles.nextLevelBtnText}>NEXT LEVEL ➔</Text>
              </Pressable>
            ) : (
              <Text style={styles.goalSub}>
                FIND {currentLevelConfig.goal - foundWords.length} MORE TO UNLOCK
              </Text>
            )}
          </View>
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

        {/* Submit Button */}
        <View style={styles.bottomBar}>
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

        {/* Level Complete Modal */}
        <GameResultModal
          visible={levelClearedModal}
          type="VICTORY"
          title="ANAGRAM MATRIX CRACKED!"
          subtitle={`DISCOVERED ${foundWords.length} WORDS IN LEVEL ${level}!`}
          score={score}
          bestScore={bestScore}
          accentColor="#00F5FF"
          onRetry={handleNextLevel}
          retryLabel="NEXT LEVEL ➔"
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
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 245, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.35)',
  },
  levelBadgeText: {
    fontFamily: monoFont,
    fontSize: 11,
    fontWeight: '900',
    color: '#00F5FF',
    letterSpacing: 1,
  },
  goalInfo: {
    alignItems: 'flex-end',
  },
  goalLabel: {
    fontFamily: monoFont,
    fontSize: 10.5,
    fontWeight: '900',
    color: '#E0AAFF',
    letterSpacing: 0.6,
  },
  goalSub: {
    fontFamily: monoFont,
    fontSize: 9,
    color: '#8A8F9E',
    marginTop: 2,
    fontWeight: '700',
  },
  nextLevelBtn: {
    marginTop: 2,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: 'rgba(255, 209, 102, 0.2)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFD166',
  },
  nextLevelBtnText: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '900',
    color: '#FFD166',
    letterSpacing: 0.8,
  },
  foundWordsContainer: {
    height: 44,
    backgroundColor: 'rgba(12, 10, 28, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(157, 78, 221, 0.2)',
    justifyContent: 'center',
  },
  foundWordsList: {
    paddingHorizontal: 12,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 245, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.35)',
    gap: 4,
  },
  wordChipText: {
    fontFamily: monoFont,
    fontSize: 10.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  wordChipPts: {
    fontFamily: monoFont,
    fontSize: 8.5,
    fontWeight: '900',
    color: '#00F5FF',
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
    paddingBottom: 20,
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
