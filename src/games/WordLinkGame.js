import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  useWindowDimensions,
  PanResponder,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, {
  Circle,
  Line,
  Defs,
  RadialGradient,
  Stop,
  Text as SvgText,
  G,
} from 'react-native-svg';
import MiniGameHeader from '../components/MiniGameHeader';
import JuiceEngine from '../components/JuiceEngine';
import GameResultModal from '../components/GameResultModal';
import {
  triggerLightHaptic,
  triggerMediumHaptic,
  triggerPerfectHaptic,
} from '../utils/haptics';
import {
  playTapSound,
  playSliceSound,
  playWordLetterSound,
  playWordSolvedSound,
  playVictorySound,
  playFailSound,
  playSnapTickSound,
  startBGM,
  stopBGM,
} from '../utils/sound';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const STORAGE_BEST_KEY = '@game_tower:best_wordlink_v1';

// Handcrafted Word Link Crossword Puzzles matching the real game
const WORD_LINK_LEVELS = [
  {
    id: 1,
    title: 'LEVEL 1: CROSSWORD 01',
    wheelLetters: ['M', 'A', 'R', 'C', 'H', 'F', 'T', 'S', 'U'],
    gridW: 7,
    gridH: 6,
    words: [
      { id: 'w1', word: 'MARCH', r: 1, c: 0, dir: 'H' },
      { id: 'w2', word: 'CRAFT', r: 1, c: 3, dir: 'V' },
      { id: 'w3', word: 'STUFF', r: 5, c: 2, dir: 'H' },
      { id: 'w4', word: 'SMART', r: 0, c: 0, dir: 'V' },
    ],
  },
  {
    id: 2,
    title: 'LEVEL 2: CROSSWORD 02',
    wheelLetters: ['F', 'L', 'O', 'A', 'T', 'N', 'G', 'S', 'W', 'I', 'M'],
    gridW: 7,
    gridH: 6,
    words: [
      { id: 'w1', word: 'FLOAT', r: 2, c: 2, dir: 'H' },
      { id: 'w2', word: 'AMONG', r: 0, c: 4, dir: 'V' },
      { id: 'w3', word: 'SWING', r: 4, c: 0, dir: 'H' },
    ],
  },
  {
    id: 3,
    title: 'LEVEL 3: CROSSWORD 03',
    wheelLetters: ['S', 'T', 'O', 'N', 'E'],
    gridW: 5,
    gridH: 5,
    words: [
      { id: 'w1', word: 'STONE', r: 0, c: 0, dir: 'H' },
      { id: 'w2', word: 'TONE', r: 0, c: 1, dir: 'V' },
      { id: 'w3', word: 'NEST', r: 2, c: 1, dir: 'H' },
      { id: 'w4', word: 'NOTE', r: 0, c: 3, dir: 'V' },
    ],
  },
  {
    id: 4,
    title: 'LEVEL 4: CROSSWORD 04',
    wheelLetters: ['H', 'E', 'A', 'R', 'T'],
    gridW: 5,
    gridH: 5,
    words: [
      { id: 'w1', word: 'HEART', r: 0, c: 0, dir: 'H' },
      { id: 'w2', word: 'HEAT', r: 0, c: 0, dir: 'V' },
      { id: 'w3', word: 'EARTH', r: 0, c: 1, dir: 'V' },
      { id: 'w4', word: 'HATE', r: 3, c: 0, dir: 'H' },
    ],
  },
  {
    id: 5,
    title: 'LEVEL 5: CROSSWORD 05',
    wheelLetters: ['P', 'L', 'A', 'N', 'T', 'E'],
    gridW: 5,
    gridH: 5,
    words: [
      { id: 'w1', word: 'PLANT', r: 0, c: 0, dir: 'H' },
      { id: 'w2', word: 'PLAN', r: 0, c: 0, dir: 'V' },
      { id: 'w3', word: 'LANE', r: 0, c: 1, dir: 'V' },
      { id: 'w4', word: 'NEAT', r: 3, c: 0, dir: 'H' },
    ],
  },
];

// Comprehensive Bonus Dictionary for Extra Words
const BONUS_DICTIONARY = new Set([
  'ACT', 'ARC', 'ARM', 'ART', 'ATE', 'CAR', 'CAT', 'CHAR', 'CHAT', 'FAR',
  'FAST', 'FAT', 'FIT', 'FOG', 'FUST', 'GAS', 'HAT', 'HIT', 'LOG', 'MAR',
  'MART', 'MAT', 'NET', 'NOT', 'ONE', 'OUT', 'PAN', 'PAT', 'PET', 'RAM',
  'RAT', 'RUST', 'SAG', 'SAT', 'SET', 'SIN', 'SING', 'SIT', 'SON', 'SONG',
  'STAR', 'SURF', 'TAG', 'TAN', 'TAR', 'TEA', 'TEN', 'TIN', 'TOE', 'TON',
  'TUFF', 'WIN', 'WING', 'EAT', 'EAR', 'ERA', 'ARE', 'HEAR', 'HEAT', 'HATE',
  'PLAN', 'LANE', 'PALE', 'LEAP', 'PLEA', 'NAP', 'TAP', 'ANT', 'LATE', 'TALE',
  'TAME', 'MATE', 'TEAM', 'MEAT', 'STEM', 'STEP', 'PEST', 'TEST', 'EAST',
  'SEAT', 'REST', 'RUSH', 'HUSH', 'CRASH', 'FLASH', 'MASH', 'CASH', 'TRASH',
  'SMASH', 'CART', 'DART', 'PART', 'START', 'CHART', 'ARCH', 'CRAM', 'SCRAM',
  'FORM', 'FARM', 'HARM', 'WARM', 'STORM', 'FLOW', 'WOLF', 'BLOW', 'BOWL',
  'GROW', 'GLOW', 'SLOW', 'FOWL', 'FOAL', 'LOAF', 'OAF', 'OAT', 'TOAD',
]);

export default function WordLinkGame({
  onBackToHub,
  onExit,
  onScoreUpdate,
  isPaused = false,
}) {
  const handleExit = onBackToHub || onExit;
  const isPausedRef = useRef(isPaused);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const { width } = useWindowDimensions();
  const arenaWidth = Math.min(width - 24, 340);
  const juiceRef = useRef(null);

  // Level & Score
  const [level, setLevel] = useState(1);
  const [highScore, setHighScore] = useState(0);
  const [score, setScore] = useState(0);
  const [solvedWords, setSolvedWords] = useState([]);
  const [shuffledWheel, setShuffledWheel] = useState([]);
  const [hintsRemaining, setHintsRemaining] = useState(1);
  const [bonusWords, setBonusWords] = useState([]);

  // Selection state
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [currentWord, setCurrentWord] = useState('');
  const [touchPos, setTouchPos] = useState(null);
  const [bonusPopup, setBonusPopup] = useState(null);
  const bonusPopupTimerRef = useRef(null);

  // Refs for gesture event synchronization
  const selectedIndicesRef = useRef([]);
  const currentWordRef = useRef('');
  const solvedWordsRef = useRef([]);
  const bonusWordsRef = useRef([]);
  const currentLevelDataRef = useRef(WORD_LINK_LEVELS[0]);

  // Result Modal
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [modalType, setModalType] = useState('VICTORY');

  const currentLevelData = WORD_LINK_LEVELS[(level - 1) % WORD_LINK_LEVELS.length];

  useEffect(() => {
    currentLevelDataRef.current = currentLevelData;
    const letters = [...currentLevelData.wheelLetters];
    setShuffledWheel(letters);
    setSolvedWords([]);
    solvedWordsRef.current = [];
    setBonusWords([]);
    bonusWordsRef.current = [];
    setHintsRemaining(1);
    setSelectedIndices([]);
    selectedIndicesRef.current = [];
    setCurrentWord('');
    currentWordRef.current = '';
    setTouchPos(null);
    setResultModalVisible(false);
  }, [level, currentLevelData]);

  // Load Saved Level & High Score
  useEffect(() => {
    (async () => {
      try {
        const [savedLvl, savedBest] = await Promise.all([
          AsyncStorage.getItem('@game_tower:wordlink_current_level'),
          AsyncStorage.getItem(STORAGE_BEST_KEY),
        ]);
        if (savedLvl !== null) {
          const val = parseInt(savedLvl, 10);
          if (!isNaN(val) && val >= 1 && val <= LEVEL_DATABASE.length) {
            setLevel(val);
          }
        }
        if (savedBest !== null) {
          const val = parseInt(savedBest, 10);
          if (!isNaN(val)) setHighScore(val);
        }
      } catch {}
    })();
  }, []);

  // Compute Crossword Cell Matrix
  const crosswordGrid = useMemo(() => {
    const { gridW, gridH, words } = currentLevelData;
    const grid = Array.from({ length: gridH }, () =>
      Array.from({ length: gridW }, () => null)
    );

    for (const w of words) {
      const isSolved = solvedWords.includes(w.word);
      for (let i = 0; i < w.word.length; i++) {
        const r = w.dir === 'V' ? w.r + i : w.r;
        const c = w.dir === 'H' ? w.c + i : w.c;
        if (r < gridH && c < gridW) {
          grid[r][c] = {
            char: w.word[i],
            solved: isSolved || (grid[r][c] && grid[r][c].solved),
          };
        }
      }
    }
    return grid;
  }, [currentLevelData, solvedWords]);

  // Circular Wheel Math
  const WHEEL_DIAMETER = 210;
  const WHEEL_CENTER = WHEEL_DIAMETER / 2;
  const WHEEL_RADIUS = 74;

  const letterNodes = useMemo(() => {
    const total = shuffledWheel.length;
    return shuffledWheel.map((char, i) => {
      const angle = (i / total) * Math.PI * 2 - Math.PI / 2;
      return {
        index: i,
        char,
        x: WHEEL_CENTER + Math.cos(angle) * WHEEL_RADIUS,
        y: WHEEL_CENTER + Math.sin(angle) * WHEEL_RADIUS,
      };
    });
  }, [shuffledWheel, WHEEL_CENTER, WHEEL_RADIUS]);

  const letterNodesRef = useRef(letterNodes);
  useEffect(() => {
    letterNodesRef.current = letterNodes;
  }, [letterNodes]);

  // Check Level Win
  const checkLevelCompletion = useCallback((currentSolved) => {
    const totalWords = currentLevelDataRef.current.words.length;
    if (currentSolved.length >= totalWords) {
      playVictorySound();
      triggerPerfectHaptic(3);
      if (juiceRef.current) {
        juiceRef.current.celebrate('PUZZLE COMPLETED!', `LEVEL ${level} CLEARED!`, '#FFE600');
      }
      setModalType('VICTORY');
      setResultModalVisible(true);

      const nextScore = score + 400;
      setScore(nextScore);
      setHighScore((prev) => {
        const next = Math.max(prev, nextScore);
        AsyncStorage.setItem(STORAGE_BEST_KEY, String(next)).catch(() => {});
        onScoreUpdate?.(next);
        return next;
      });

      const nextLvl = level < LEVEL_DATABASE.length ? level + 1 : 1;
      AsyncStorage.setItem('@game_tower:wordlink_current_level', String(nextLvl)).catch(() => {});
    }
  }, [level, score, onScoreUpdate]);

  // Shuffle Wheel Letters
  const handleShuffle = () => {
    playTapSound();
    triggerLightHaptic();
    setShuffledWheel((prev) => {
      const arr = [...prev];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    });
  };

  // Hint: 1 Hint per level limit
  const handleHint = () => {
    if (hintsRemaining <= 0) {
      playFailSound();
      triggerLightHaptic();
      if (juiceRef.current) {
        juiceRef.current.popup('HINTS USED', '1 HINT PER LEVEL!', '#FF0055');
      }
      return;
    }
    setHintsRemaining(0);
    playSliceSound();
    triggerMediumHaptic();
    const unsolved = currentLevelData.words.filter(
      (w) => !solvedWordsRef.current.includes(w.word)
    );
    if (unsolved.length > 0) {
      const target = unsolved[0];
      const next = [...solvedWordsRef.current, target.word];
      solvedWordsRef.current = next;
      setSolvedWords(next);
      checkLevelCompletion(next);
    }
  };

  // Touch & Pointer Gesture Handlers
  const handlePointerDown = useCallback((localX, localY) => {
    setTouchPos({ x: localX, y: localY });
    for (const node of letterNodesRef.current) {
      if (Math.hypot(localX - node.x, localY - node.y) < 28) {
        selectedIndicesRef.current = [node.index];
        currentWordRef.current = node.char;
        setSelectedIndices([node.index]);
        setCurrentWord(node.char);
        playSnapTickSound();
        triggerLightHaptic();
        break;
      }
    }
  }, []);

  const handlePointerMove = useCallback((localX, localY) => {
    setTouchPos({ x: localX, y: localY });
    for (const node of letterNodesRef.current) {
      if (Math.hypot(localX - node.x, localY - node.y) < 28) {
        if (!selectedIndicesRef.current.includes(node.index)) {
          const nextIndices = [...selectedIndicesRef.current, node.index];
          const nextWord = currentWordRef.current + node.char;
          selectedIndicesRef.current = nextIndices;
          currentWordRef.current = nextWord;
          setSelectedIndices(nextIndices);
          setCurrentWord(nextWord);
          playWordLetterSound();
          triggerLightHaptic();
        }
        break;
      }
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    const word = currentWordRef.current;
    if (word.length >= 2) {
      const matching = currentLevelDataRef.current.words.find(
        (w) => w.word === word && !solvedWordsRef.current.includes(word)
      );

      if (matching) {
        // SOLVED WORD!
        playWordSolvedSound();
        triggerPerfectHaptic(2);
        const nextSolved = [...solvedWordsRef.current, word];
        solvedWordsRef.current = nextSolved;
        setSolvedWords(nextSolved);
        setScore((s) => s + word.length * 60);

        if (juiceRef.current) {
          juiceRef.current.popup('WORD FOUND!', word, '#F59E0B');
        }

        checkLevelCompletion(nextSolved);
      } else if (
        BONUS_DICTIONARY.has(word) &&
        !bonusWordsRef.current.includes(word)
      ) {
        // BONUS WORD!
        playWordSolvedSound();
        triggerMediumHaptic();
        const nextBonus = [...bonusWordsRef.current, word];
        bonusWordsRef.current = nextBonus;
        setBonusWords(nextBonus);
        setScore((s) => s + 50);

        setBonusPopup({ word, score: 50 });
        if (bonusPopupTimerRef.current) clearTimeout(bonusPopupTimerRef.current);
        bonusPopupTimerRef.current = setTimeout(() => {
          setBonusPopup(null);
        }, 1000);

        if (juiceRef.current) {
          juiceRef.current.popup('BONUS WORD! +50', word, '#00F0FF');
        }
      } else {
        // Invalid or already found
        playFailSound();
        triggerLightHaptic();
        if (juiceRef.current) {
          juiceRef.current.shake(6, 4);
        }
      }
    }

    selectedIndicesRef.current = [];
    currentWordRef.current = '';
    setSelectedIndices([]);
    setCurrentWord('');
    setTouchPos(null);
  }, [checkLevelCompletion]);

  // Robust PanResponder with zero coordinate drift on Android
  const gestureOriginRef = useRef({ pageX: 0, pageY: 0 });
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt, gestureState) => {
          const localX = evt.nativeEvent.locationX;
          const localY = evt.nativeEvent.locationY;
          gestureOriginRef.current = {
            pageX: gestureState.x0 - localX,
            pageY: gestureState.y0 - localY,
          };
          handlePointerDown(localX, localY);
        },
        onPanResponderMove: (evt, gestureState) => {
          const localX = gestureState.moveX - gestureOriginRef.current.pageX;
          const localY = gestureState.moveY - gestureOriginRef.current.pageY;
          handlePointerMove(localX, localY);
        },
        onPanResponderRelease: () => {
          handlePointerUp();
        },
        onPanResponderTerminate: () => {
          handlePointerUp();
        },
      }),
    [handlePointerDown, handlePointerMove, handlePointerUp]
  );

  const cellSize = Math.min(38, Math.floor((arenaWidth - 24) / currentLevelData.gridW));

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={styles.container}>
        {/* Standardized Tower Header */}
        <MiniGameHeader
          floorNum={2}
          gameTitle="WORD LINK"
          category="CROSSWORD DIAL"
          accentColor="#FFE600"
          score={score}
          highScore={highScore}
          onBack={handleExit}
          onBackToHub={handleExit}
          onReset={() => {
            setLevel(1);
            setScore(0);
            AsyncStorage.setItem('@game_tower:wordlink_current_level', '1').catch(() => {});
          }}
          resetLabel="NEW"
          rightExtra={
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>LVL {level}</Text>
            </View>
          }
        />

        {/* 1-Second Vibrant Bonus Word Popup */}
        {bonusPopup && (
          <View style={styles.bonusPopupContainer} pointerEvents="none">
            <View style={styles.bonusPopupCard}>
              <Text style={styles.bonusPopupTag}>⭐ BONUS WORD FOUND! ⭐</Text>
              <Text style={styles.bonusPopupWord}>{bonusPopup.word}</Text>
              <Text style={styles.bonusPopupScore}>+50 BONUS SCORE</Text>
            </View>
          </View>
        )}

        {/* Level Banner */}
        <View style={styles.levelBanner}>
          <Text style={styles.levelTitle}>{currentLevelData.title}</Text>
          <View style={styles.levelProgress}>
            <Text style={styles.levelProgressText}>
              FOUND: {solvedWords.length}/{currentLevelData.words.length}
            </Text>
          </View>
        </View>

        {/* 3D Golden Crossword Grid (Top) */}
        <View style={[styles.crosswordContainer, { width: arenaWidth }]}>
          {crosswordGrid.map((row, r) => (
            <View key={`r_${r}`} style={styles.gridRow}>
              {row.map((cell, c) => (
                <View
                  key={`c_${r}_${c}`}
                  style={[
                    styles.gridCell,
                    { width: cellSize, height: cellSize },
                    cell && styles.gridCellActive,
                    cell && cell.solved && styles.gridCellSolved,
                  ]}
                >
                  {cell && cell.solved ? (
                    <Text style={styles.cellCharSolved}>{cell.char}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Connected Word Preview Ribbon */}
        <View style={styles.wordPreviewBar}>
          <View style={styles.wordPreviewPill}>
            <Text style={styles.wordPreviewText}>
              {currentWord ? currentWord.split('').join(' ') : 'SWIPE LETTERS TO SOLVE'}
            </Text>
          </View>
        </View>

        {/* Letter Wheel & Actions (Bottom) */}
        <View style={styles.wheelArea}>
          {/* Circular Wheel Dial */}
          <View
            style={[styles.wheelTouchBox, { width: WHEEL_DIAMETER, height: WHEEL_DIAMETER }]}
            {...panResponder.panHandlers}
          >
            <Svg width={WHEEL_DIAMETER} height={WHEEL_DIAMETER} viewBox={`0 0 ${WHEEL_DIAMETER} ${WHEEL_DIAMETER}`}>
              <Defs>
                <RadialGradient id="wheelGlow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor="#1E2A44" stopOpacity="0.9" />
                  <Stop offset="100%" stopColor="#0B111F" stopOpacity="0.98" />
                </RadialGradient>
              </Defs>

              {/* Wheel Outer Disc */}
              <Circle
                cx={WHEEL_CENTER}
                cy={WHEEL_CENTER}
                r={WHEEL_CENTER - 4}
                fill="url(#wheelGlow)"
                stroke="#29395A"
                strokeWidth={2.5}
              />

              {/* Connecting lines between selected letters */}
              {selectedIndices.map((nodeIdx, idx) => {
                if (idx === 0) return null;
                const prev = letterNodes[selectedIndices[idx - 1]];
                const curr = letterNodes[nodeIdx];
                return (
                  <Line
                    key={`line_${idx}`}
                    x1={prev.x}
                    y1={prev.y}
                    x2={curr.x}
                    y2={curr.y}
                    stroke="#FBBF24"
                    strokeWidth={5}
                    strokeLinecap="round"
                  />
                );
              })}

              {/* Trailing guide line to touch position */}
              {touchPos && selectedIndices.length > 0 && (
                <Line
                  x1={letterNodes[selectedIndices[selectedIndices.length - 1]].x}
                  y1={letterNodes[selectedIndices[selectedIndices.length - 1]].y}
                  x2={touchPos.x}
                  y2={touchPos.y}
                  stroke="#FBBF24"
                  strokeWidth={2.5}
                  strokeDasharray="4,4"
                  opacity={0.8}
                />
              )}

              {/* Letter Buttons on Dial */}
              {letterNodes.map((node) => {
                const isSelected = selectedIndices.includes(node.index);
                return (
                  <G key={`node_${node.index}`}>
                    <Circle
                      cx={node.x}
                      cy={node.y}
                      r={22}
                      fill={isSelected ? '#F59E0B' : '#141E34'}
                      stroke={isSelected ? '#FFFFFF' : '#33486F'}
                      strokeWidth={isSelected ? 2.5 : 1.8}
                    />
                    <SvgText
                      x={node.x}
                      y={node.y + 6.5}
                      fill={isSelected ? '#000000' : '#FFFFFF'}
                      fontSize={18}
                      fontWeight="900"
                      fontFamily={monoFont}
                      textAnchor="middle"
                    >
                      {node.char}
                    </SvgText>
                  </G>
                );
              })}
            </Svg>
          </View>

          {/* Shuffle & Hint Action Buttons */}
          <View style={styles.wheelActions}>
            <Pressable onPress={handleShuffle} style={styles.actionCircleBtn}>
              <Text style={styles.actionBtnIcon}>🔀</Text>
              <Text style={styles.actionBtnLabel}>SHUFFLE</Text>
            </Pressable>
            <Pressable onPress={handleHint} style={styles.actionCircleBtn}>
              <Text style={styles.actionBtnIcon}>💡</Text>
              <Text style={styles.actionBtnLabel}>HINT ({hintsRemaining})</Text>
            </Pressable>
          </View>
        </View>

        {/* Victory Modal */}
        <GameResultModal
          visible={resultModalVisible}
          type={modalType}
          score={score}
          highScore={highScore}
          onRestart={() => setLevel((l) => (l % WORD_LINK_LEVELS.length) + 1)}
          onBackToHub={onBackToHub}
        />
      </View>
    </JuiceEngine>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05070D',
    alignItems: 'center',
  },
  levelBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  levelBadgeText: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '800',
    color: '#FFE600',
  },
  levelBanner: {
    width: '100%',
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  levelTitle: {
    fontFamily: monoFont,
    fontSize: 11,
    fontWeight: '800',
    color: '#E0E7FF',
    letterSpacing: 0.6,
  },
  levelProgress: {
    backgroundColor: '#121A2D',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#24324F',
  },
  levelProgressText: {
    fontFamily: monoFont,
    fontSize: 9,
    fontWeight: '700',
    color: '#FFE600',
  },
  crosswordContainer: {
    backgroundColor: '#090E1A',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 185,
  },
  gridRow: {
    flexDirection: 'row',
  },
  gridCell: {
    margin: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCellActive: {
    backgroundColor: '#151D2D',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#283854',
  },
  gridCellSolved: {
    backgroundColor: '#F59E0B',
    borderRadius: 6,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
    borderLeftWidth: 1,
    borderLeftColor: '#FBBF24',
    borderRightWidth: 1,
    borderRightColor: '#D97706',
    borderBottomWidth: 3.5,
    borderBottomColor: '#B45309',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.7,
    shadowRadius: 4,
    elevation: 5,
  },
  cellCharSolved: {
    fontFamily: monoFont,
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  wordPreviewBar: {
    height: 38,
    marginVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordPreviewPill: {
    backgroundColor: '#0D1424',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: '#293C60',
  },
  wordPreviewText: {
    fontFamily: monoFont,
    fontSize: 13,
    fontWeight: '900',
    color: '#FFE600',
    letterSpacing: 2,
  },
  wheelArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 16,
    marginTop: 2,
  },
  wheelTouchBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelActions: {
    marginLeft: 16,
    gap: 12,
  },
  actionCircleBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#101726',
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: '#283A5E',
  },
  actionBtnIcon: {
    fontSize: 18,
  },
  actionBtnLabel: {
    fontFamily: monoFont,
    fontSize: 7.5,
    fontWeight: '800',
    color: '#8E9BB5',
    marginTop: 1,
  },
  bonusPopupContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  bonusPopupCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderWidth: 2,
    borderColor: '#FFE600',
    borderRadius: 16,
    paddingHorizontal: 22,
    paddingVertical: 10,
    alignItems: 'center',
    shadowColor: '#FFE600',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
  },
  bonusPopupTag: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '900',
    color: '#00F0FF',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  bonusPopupWord: {
    fontFamily: monoFont,
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  bonusPopupScore: {
    fontFamily: monoFont,
    fontSize: 11,
    fontWeight: '900',
    color: '#FFE600',
    letterSpacing: 1,
    marginTop: 2,
  },
});
