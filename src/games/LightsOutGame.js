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
import GameResultModal from '../components/GameResultModal';
import {
  triggerLightHaptic,
  triggerPerfectHaptic,
} from '../utils/haptics';
import {
  playTapSound,
  playPerfectSound,
} from '../utils/sound';

const STORAGE_KEY = '@game_tower:best_lightsout_v1';
const GRID_SIZE = 5;

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const applyToggle = (grid, r, c) => {
  const next = grid.map((row) => [...row]);
  const coords = [
    [r, c],
    [r - 1, c],
    [r + 1, c],
    [r, c - 1],
    [r, c + 1],
  ];
  coords.forEach(([nr, nc]) => {
    if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
      next[nr][nc] = !next[nr][nc];
    }
  });
  return next;
};

const createSolvablePuzzle = (steps = 6) => {
  let grid = Array.from({ length: GRID_SIZE }, () =>
    Array(GRID_SIZE).fill(false)
  );
  const solutionMoves = new Set();

  for (let i = 0; i < steps; i += 1) {
    const r = Math.floor(Math.random() * GRID_SIZE);
    const c = Math.floor(Math.random() * GRID_SIZE);
    const key = `${r},${c}`;
    grid = applyToggle(grid, r, c);
    if (solutionMoves.has(key)) {
      solutionMoves.delete(key);
    } else {
      solutionMoves.add(key);
    }
  }

  if (solutionMoves.size === 0) {
    grid = applyToggle(grid, 2, 2);
    solutionMoves.add('2,2');
  }

  return { grid, solutionMoves: Array.from(solutionMoves) };
};

export default function LightsOutGame({ onBackToHub, onScoreUpdate }) {
  const { width } = useWindowDimensions();
  const boardSize = Math.min(350, width - 32);
  const cellSize = Math.floor((boardSize - 38) / GRID_SIZE);
  const juiceRef = useRef(null);

  const [level, setLevel] = useState(1);
  const [puzzle, setPuzzle] = useState(() => createSolvablePuzzle(4));
  const [moves, setMoves] = useState(0);
  const [hintCell, setHintCell] = useState(null);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [levelCleared, setLevelCleared] = useState(false);

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

  const startLevel = useCallback((targetLevel = 1) => {
    const steps = Math.min(12, 3 + targetLevel);
    setPuzzle(createSolvablePuzzle(steps));
    setMoves(0);
    setHintCell(null);
    if (juiceRef.current) juiceRef.current.flash(COLORS.cyan);
  }, []);

  const advanceToNextLevel = useCallback(() => {
    setLevelCleared(false);
    const nextLvl = level + 1;
    setLevel(nextLvl);
    setPuzzle(createSolvablePuzzle(Math.min(12, 3 + nextLvl)));
    setMoves(0);
    setHintCell(null);
    if (juiceRef.current) juiceRef.current.flash(COLORS.cyan);
  }, [level]);

  const handleToggleCell = useCallback(
    (r, c) => {
      if (levelCleared) return;
      triggerLightHaptic();
      playTapSound();
      if (juiceRef.current) {
        juiceRef.current.shake(3, 2);
        juiceRef.current.burst(undefined, undefined, COLORS.cyan, 8);
      }

      const nextGrid = applyToggle(puzzle.grid, r, c);
      const key = `${r},${c}`;
      const nextSolution = new Set(puzzle.solutionMoves);
      if (nextSolution.has(key)) {
        nextSolution.delete(key);
      } else {
        nextSolution.add(key);
      }

      setHintCell(null);
      const nextMoves = moves + 1;
      setMoves(nextMoves);

      const solved = nextGrid.every((row) => row.every((val) => !val));
      if (solved) {
        const gained = 100 + level * 40;
        const nextScore = score + gained;
        setScore(nextScore);
        updateBest(nextScore);
        setLevelCleared(true);
        triggerPerfectHaptic(3);
        playPerfectSound(6);

        if (juiceRef.current) {
          juiceRef.current.celebrate(
            `FIREWALL BREACHED!`,
            `SECTOR ${level} // +${gained} PTS`,
            COLORS.cyan
          );
        }
      } else {
        setPuzzle({
          grid: nextGrid,
          solutionMoves: Array.from(nextSolution),
        });
      }
    },
    [levelCleared, puzzle, moves, level, score, updateBest]
  );

  const handleRequestHint = useCallback(() => {
    if (puzzle.solutionMoves.length === 0) return;
    triggerLightHaptic();
    playTapSound();
    setHintCell(puzzle.solutionMoves[0]);
    if (juiceRef.current) {
      juiceRef.current.popup('NODE TARGETED', 'TAP GOLD BORDER', COLORS.solarGold);
    }
  }, [puzzle.solutionMoves]);

  const activeLights = puzzle.grid.flat().filter(Boolean).length;

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={localStyles.container}>
        <LinearGradient
          colors={['#03030A', '#061522', '#0A2538']}
          style={StyleSheet.absoluteFillObject}
        />

        <MiniGameHeader
          title="GRID HACKER"
          floorLabel="FLOOR 06 // LIGHTS OUT"
          score={score}
          bestScore={bestScore}
          accentColor={COLORS.cyan}
          onBack={onBackToHub}
          onReset={() => startLevel(level)}
        />

        <View style={localStyles.body}>
          <View style={[localStyles.infoRow, { width: boardSize }]}>
            <Text style={localStyles.infoText}>
              {`SECTOR LVL ${level} // ACTIVE NODES: ${activeLights}`}
            </Text>
            <Pressable onPress={handleRequestHint} style={localStyles.hintBtn}>
              <Text style={localStyles.hintBtnText}>AUTO-HINT</Text>
            </Pressable>
          </View>

          <View
            style={[
              localStyles.board,
              { width: boardSize, height: boardSize },
            ]}
          >
            {puzzle.grid.map((row, rIdx) => (
              <View key={`lrow_${rIdx}`} style={localStyles.row}>
                {row.map((isOn, cIdx) => {
                  const isHint = hintCell === `${rIdx},${cIdx}`;
                  return (
                    <Pressable
                      key={`lcell_${rIdx}_${cIdx}`}
                      onPress={() => handleToggleCell(rIdx, cIdx)}
                      style={[
                        localStyles.cell,
                        {
                          width: cellSize,
                          height: cellSize,
                          backgroundColor: isOn
                            ? 'rgba(0, 245, 255, 0.28)'
                            : 'rgba(255, 255, 255, 0.04)',
                          borderColor: isHint
                            ? COLORS.solarGold
                            : isOn
                              ? COLORS.cyan
                              : 'rgba(255, 255, 255, 0.14)',
                          borderWidth: isHint ? 2.5 : 1.4,
                        },
                      ]}
                    >
                      <View
                        style={[
                          localStyles.innerCore,
                          {
                            backgroundColor: isOn
                              ? COLORS.cyan
                              : 'rgba(255, 255, 255, 0.1)',
                          },
                        ]}
                      />
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          <Text style={localStyles.footerNote}>
            DEACTIVATE ALL GLOWING CYAN NODES TO BREACH THE FIREWALL
          </Text>

          <GameResultModal
            visible={levelCleared}
            type="VICTORY"
            title="FIREWALL BREACHED!"
            subtitle={`SECTOR LEVEL ${level} CLEARED IN ${moves} MOVES`}
            score={score}
            bestScore={bestScore}
            accentColor={COLORS.cyan}
            onRetry={advanceToNextLevel}
            retryLabel={`ENTER LEVEL ${level + 1}`}
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
    paddingBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  infoText: {
    fontSize: 10.5,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.cyan,
    letterSpacing: 0.8,
  },
  hintBtn: {
    backgroundColor: 'rgba(255, 209, 102, 0.2)',
    borderWidth: 1,
    borderColor: COLORS.solarGold,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  hintBtnText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.solarGold,
  },
  board: {
    backgroundColor: 'rgba(6, 10, 24, 0.92)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 245, 255, 0.38)',
    padding: 8,
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cell: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCore: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  footerNote: {
    marginTop: 18,
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 28,
    letterSpacing: 0.8,
  },
});
