import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  PanResponder,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import MiniGameHeader from '../components/MiniGameHeader';
import GameResultModal from '../components/GameResultModal';
import {
  playWordLetterSound,
  playWordSolvedSound,
  playVictorySound,
} from '../utils/sound';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_SIZE = 9;
const BOARD_PADDING = 16;
const BOARD_WIDTH = SCREEN_WIDTH - BOARD_PADDING * 2;
const CELL_SIZE = Math.floor(BOARD_WIDTH / GRID_SIZE);

// Word puzzle themes
const PUZZLE_LEVELS = [
  {
    theme: 'GALACTIC VOYAGE',
    words: ['PLANET', 'ORBIT', 'STAR', 'MOON', 'SOLAR', 'COMET'],
  },
  {
    theme: 'TECH MATRIX',
    words: ['ROBOT', 'LASER', 'CIRCUIT', 'DRONE', 'RADAR', 'PULSE'],
  },
  {
    theme: 'DEEP OCEAN',
    words: ['SHARK', 'CORAL', 'WHALE', 'TIDE', 'ABYSS', 'PEARL'],
  },
  {
    theme: 'WILD NATURE',
    words: ['TIGER', 'EAGLE', 'FOREST', 'RIVER', 'STORM', 'FROST'],
  },
  {
    theme: 'ANCIENT REALMS',
    words: ['TEMPLE', 'CASTLE', 'SWORD', 'SHIELD', 'CROWN', 'RELIC'],
  },
];

const HIGHLIGHT_COLORS = [
  '#00F0FF',
  '#FF007F',
  '#FFE600',
  '#00FF66',
  '#A855F7',
  '#FF6B00',
];

// Generator to build letter grid and place words
function generateWordSearch(wordList, size = GRID_SIZE) {
  const grid = Array.from({ length: size }, () => Array(size).fill(''));
  const placedWords = [];

  const directions = [
    { dr: 0, dc: 1 },  // Horizontal right
    { dr: 1, dc: 0 },  // Vertical down
    { dr: 1, dc: 1 },  // Diagonal down-right
    { dr: -1, dc: 1 }, // Diagonal up-right
  ];

  // Try placing each word
  for (const word of wordList) {
    let placed = false;
    let attempts = 0;

    while (!placed && attempts < 100) {
      attempts++;
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const startR = Math.floor(Math.random() * size);
      const startC = Math.floor(Math.random() * size);

      const endR = startR + dir.dr * (word.length - 1);
      const endC = startC + dir.dc * (word.length - 1);

      if (endR >= 0 && endR < size && endC >= 0 && endC < size) {
        let fits = true;
        for (let i = 0; i < word.length; i++) {
          const r = startR + dir.dr * i;
          const c = startC + dir.dc * i;
          const currentCell = grid[r][c];
          if (currentCell !== '' && currentCell !== word[i]) {
            fits = false;
            break;
          }
        }

        if (fits) {
          const cells = [];
          for (let i = 0; i < word.length; i++) {
            const r = startR + dir.dr * i;
            const c = startC + dir.dc * i;
            grid[r][c] = word[i];
            cells.push({ r, c });
          }
          placedWords.push({ word, cells });
          placed = true;
        }
      }
    }
  }

  // Fill empty cells with random letters
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
      }
    }
  }

  return { grid, placedWords };
}

export default function WordSearchGame({ onScoreUpdate, onExit }) {
  const [levelIdx, setLevelIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [grid, setGrid] = useState([]);
  const [targetWords, setTargetWords] = useState([]);
  const [foundWords, setFoundWords] = useState([]); // [{ word, cells, color }]
  const [selectedCells, setSelectedCells] = useState([]); // [{ r, c }]
  const [currentSelectionStr, setCurrentSelectionStr] = useState('');
  const [hintCell, setHintCell] = useState(null);
  const [victory, setVictory] = useState(false);

  // Synchronization refs to prevent PanResponder stale closure
  const gridRef = useRef([]);
  const targetWordsRef = useRef([]);
  const foundWordsRef = useRef([]);
  const selectedCellsRef = useRef([]);
  const currentSelectionStrRef = useRef('');
  const startLocalPosRef = useRef({ x: 0, y: 0 });
  const startCellRef = useRef(null);

  const currentLevel = PUZZLE_LEVELS[levelIdx % PUZZLE_LEVELS.length];

  // Initialize level
  const initLevel = useCallback((lvl) => {
    const levelData = PUZZLE_LEVELS[lvl % PUZZLE_LEVELS.length];
    const { grid: newGrid, placedWords } = generateWordSearch(levelData.words);
    gridRef.current = newGrid;
    targetWordsRef.current = placedWords;
    foundWordsRef.current = [];
    selectedCellsRef.current = [];
    currentSelectionStrRef.current = '';

    setGrid(newGrid);
    setTargetWords(placedWords);
    setFoundWords([]);
    setSelectedCells([]);
    setCurrentSelectionStr('');
    setHintCell(null);
    setVictory(false);
  }, []);

  // Load Saved Level Progression
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('@game_tower:wordsearch_current_level');
        if (saved !== null) {
          const parsed = parseInt(saved, 10);
          if (!isNaN(parsed) && parsed >= 0) {
            setLevelIdx(parsed);
          }
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    initLevel(levelIdx);
  }, [levelIdx, initLevel]);

  // Convert local board touch coordinate to grid row & col
  const getCellFromLocalCoords = (localX, localY) => {
    if (localX < 0 || localX >= BOARD_WIDTH || localY < 0 || localY >= BOARD_WIDTH) {
      return null;
    }
    const c = Math.floor(localX / CELL_SIZE);
    const r = Math.floor(localY / CELL_SIZE);
    if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
      return { r, c };
    }
    return null;
  };

  // Compute straight-line cells between startCell and currentCell
  const computeLineCells = (start, end) => {
    const dr = end.r - start.r;
    const dc = end.c - start.c;

    const absDr = Math.abs(dr);
    const absDc = Math.abs(dc);

    // Must be strictly horizontal, vertical, or 45-degree diagonal
    if (absDr !== 0 && absDc !== 0 && absDr !== absDc) {
      return [start];
    }

    const stepR = dr === 0 ? 0 : dr > 0 ? 1 : -1;
    const stepC = dc === 0 ? 0 : dc > 0 ? 1 : -1;
    const length = Math.max(absDr, absDc);

    const cells = [];
    for (let i = 0; i <= length; i++) {
      cells.push({
        r: start.r + stepR * i,
        c: start.c + stepC * i,
      });
    }
    return cells;
  };

  // Check if current selected word matches any target words
  const checkWordMatch = (strToCheck, cellsToCheck) => {
    const forwardStr = strToCheck;
    const reverseStr = forwardStr.split('').reverse().join('');
    const targets = targetWordsRef.current;
    const alreadyFound = foundWordsRef.current;

    // Find in target words
    const matched = targets.find(
      (tw) =>
        (tw.word === forwardStr || tw.word === reverseStr) &&
        !alreadyFound.some((fw) => fw.word === tw.word)
    );

    if (matched) {
      const color = HIGHLIGHT_COLORS[alreadyFound.length % HIGHLIGHT_COLORS.length];
      const newFound = [...alreadyFound, { word: matched.word, cells: matched.cells, color }];
      foundWordsRef.current = newFound;
      setFoundWords(newFound);
      playWordSolvedSound();

      const addedScore = matched.word.length * 25;
      setScore((s) => {
        const next = s + addedScore;
        if (onScoreUpdate) onScoreUpdate(next);
        return next;
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      // Check level victory
      if (newFound.length === targets.length) {
        setVictory(true);
        playVictorySound();
      }
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  // Pan Responder for touch dragging selection with zero coordinate drift
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const localX = evt.nativeEvent.locationX;
        const localY = evt.nativeEvent.locationY;
        startLocalPosRef.current = { x: localX, y: localY };

        const cell = getCellFromLocalCoords(localX, localY);
        if (cell) {
          startCellRef.current = cell;
          selectedCellsRef.current = [cell];
          setSelectedCells([cell]);
          const char = gridRef.current[cell.r]?.[cell.c] || '';
          currentSelectionStrRef.current = char;
          setCurrentSelectionStr(char);
          playWordLetterSound();
          Haptics.selectionAsync().catch(() => {});
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        if (!startCellRef.current) return;
        const localX = startLocalPosRef.current.x + gestureState.dx;
        const localY = startLocalPosRef.current.y + gestureState.dy;

        const currentCell = getCellFromLocalCoords(localX, localY);
        if (currentCell) {
          const line = computeLineCells(startCellRef.current, currentCell);
          selectedCellsRef.current = line;
          setSelectedCells(line);
          const str = line.map((p) => gridRef.current[p.r]?.[p.c] || '').join('');
          currentSelectionStrRef.current = str;
          setCurrentSelectionStr(str);
        }
      },
      onPanResponderRelease: () => {
        const cells = selectedCellsRef.current;
        const str = currentSelectionStrRef.current;
        if (cells && cells.length > 0 && str) {
          checkWordMatch(str, cells);
        }
        startCellRef.current = null;
        selectedCellsRef.current = [];
        currentSelectionStrRef.current = '';
        setSelectedCells([]);
        setCurrentSelectionStr('');
      },
      onPanResponderTerminate: () => {
        startCellRef.current = null;
        selectedCellsRef.current = [];
        currentSelectionStrRef.current = '';
        setSelectedCells([]);
        setCurrentSelectionStr('');
      },
    })
  ).current;

  // Hint button reveals first letter of first unfound word
  const giveHint = () => {
    const unfound = targetWords.filter((tw) => !foundWords.some((fw) => fw.word === tw.word));
    if (unfound.length > 0) {
      const hintTarget = unfound[0];
      setHintCell(hintTarget.cells[0]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      setTimeout(() => setHintCell(null), 3000);
    }
  };

  // Check if a cell is highlighted by found words
  const getCellHighlightColor = (r, c) => {
    for (const fw of foundWords) {
      if (fw.cells.some((p) => p.r === r && p.c === c)) {
        return fw.color;
      }
    }
    return null;
  };

  const isCellSelected = (r, c) => {
    return selectedCells.some((p) => p.r === r && p.c === c);
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <MiniGameHeader
        floorNum={18}
        gameTitle="WORD SEARCH"
        category={currentLevel.theme}
        accentColor="#00F5FF"
        score={score}
        onBack={onExit}
        onBackToHub={onExit}
        onReset={() => {
          setLevelIdx(0);
          setScore(0);
          AsyncStorage.setItem('@game_tower:wordsearch_current_level', '0').catch(() => {});
          initLevel(0);
        }}
        resetLabel="NEW"
        rightExtra={
          <View style={styles.scoreContainer}>
            <Text style={{ color: '#00F0FF', fontFamily: 'monospace', fontSize: 11, fontWeight: '800' }}>
              LVL {levelIdx + 1}
            </Text>
          </View>
        }
      />

      {/* Target Words Pill Strip */}
      <View style={styles.wordListContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.wordListScroll}
        >
          {targetWords.map((item, idx) => {
            const isFound = foundWords.some((fw) => fw.word === item.word);
            const foundData = foundWords.find((fw) => fw.word === item.word);
            return (
              <View
                key={`word-${idx}`}
                style={[
                  styles.wordBadge,
                  isFound && {
                    backgroundColor: foundData?.color || '#00F0FF',
                    borderColor: 'transparent',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.wordBadgeText,
                    isFound && { color: '#000', textDecorationLine: 'line-through' },
                  ]}
                >
                  {item.word}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Current selection preview */}
      <View style={styles.selectionPreview}>
        <Text style={styles.selectionPreviewText}>
          {currentSelectionStr || 'DRAG ACROSS LETTERS'}
        </Text>
      </View>

      {/* Word Search Grid */}
      <View
        style={styles.boardWrapper}
        {...panResponder.panHandlers}
      >
        {grid.map((row, r) => (
          <View key={`row-${r}`} style={styles.gridRow}>
            {row.map((letter, c) => {
              const highlightColor = getCellHighlightColor(r, c);
              const selected = isCellSelected(r, c);
              const isHint = hintCell && hintCell.r === r && hintCell.c === c;

              return (
                <View
                  key={`cell-${r}-${c}`}
                  style={[
                    styles.cell,
                    highlightColor && { backgroundColor: `${highlightColor}33` },
                    selected && styles.cellSelected,
                    isHint && styles.cellHint,
                  ]}
                >
                  <Text
                    style={[
                      styles.cellLetter,
                      highlightColor && { color: highlightColor, fontWeight: '900' },
                      selected && { color: '#000' },
                      isHint && { color: '#FFE600' },
                    ]}
                  >
                    {letter}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.toolBtn} onPress={giveHint}>
          <Text style={{ fontSize: 16 }}>💡</Text>
          <Text style={styles.toolBtnText}>HINT</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolBtn}
          onPress={() => {
            initLevel(levelIdx);
          }}
        >
          <Text style={{ fontSize: 16 }}>🔄</Text>
          <Text style={styles.toolBtnText}>RESET</Text>
        </TouchableOpacity>
      </View>

      {/* Game Result Modal */}
      <GameResultModal
        visible={victory}
        type="VICTORY"
        title="PUZZLE SOLVED!"
        subtitle={`LEVEL ${levelIdx + 1}: ${currentLevel.theme}`}
        score={score}
        level={levelIdx + 1}
        accentColor="#00F5FF"
        onNext={() => {
          const next = levelIdx + 1;
          setLevelIdx(next);
          AsyncStorage.setItem('@game_tower:wordsearch_current_level', String(next)).catch(() => {});
          initLevel(next);
        }}
        onRestart={() => {
          const next = levelIdx + 1;
          setLevelIdx(next);
          AsyncStorage.setItem('@game_tower:wordsearch_current_level', String(next)).catch(() => {});
          initLevel(next);
        }}
        onBackToHub={onExit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070814',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 240, 255, 0.15)',
  },
  backBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
  },
  headerCenter: {
    alignItems: 'center',
  },
  themeTitle: {
    color: '#00F0FF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  levelSubtitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  scoreValue: {
    color: '#FFE600',
    fontSize: 18,
    fontWeight: '900',
  },
  wordListContainer: {
    paddingVertical: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  wordListScroll: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  wordBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    backgroundColor: 'rgba(0, 240, 255, 0.05)',
  },
  wordBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  selectionPreview: {
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  selectionPreviewText: {
    color: '#00F0FF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 3,
  },
  boardWrapper: {
    alignSelf: 'center',
    width: BOARD_WIDTH,
    height: BOARD_WIDTH,
    backgroundColor: '#0D1424',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    overflow: 'hidden',
  },
  gridRow: {
    flexDirection: 'row',
    height: CELL_SIZE,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  cellSelected: {
    backgroundColor: '#00F0FF',
    borderRadius: 6,
  },
  cellHint: {
    backgroundColor: 'rgba(255, 230, 0, 0.3)',
    borderColor: '#FFE600',
    borderWidth: 1.5,
    borderRadius: 6,
  },
  cellLetter: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '700',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 20,
    paddingHorizontal: 24,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  toolBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  modalCard: {
    width: '80%',
    padding: 24,
    borderRadius: 20,
    backgroundColor: '#0E1326',
    borderWidth: 2,
    borderColor: '#00F0FF',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#00F0FF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    marginVertical: 12,
  },
  modalScore: {
    color: '#FFF',
    fontSize: 16,
    marginBottom: 20,
    fontWeight: '700',
  },
  modalBtn: {
    backgroundColor: '#00F0FF',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  modalBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
