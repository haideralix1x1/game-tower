import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { COLORS } from '../../styles';
import MiniGameHeader from '../components/MiniGameHeader';
import GameResultModal from '../components/GameResultModal';
import JuiceEngine from '../components/JuiceEngine';
import { playTapSound, playSliceSound, playGameOverSound } from '../utils/sound';
import { triggerLightHaptic, triggerMediumHaptic } from '../utils/haptics';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const TUBE_CAPACITY = 4;

const NEON_PALETTE = [
  '#00F5FF', // Cyan
  '#FF007F', // Magenta
  '#FFD166', // Solar Gold
  '#39FF14', // Electric Lime
  '#9D4EDD', // Quantum Purple
  '#FF6D00', // Plasma Orange
];

export default function ColorTubeSortGame({ onBackToHub, onScoreUpdate }) {
  const { width, height } = useWindowDimensions();

  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [selectedTube, setSelectedTube] = useState(null);
  const [tubes, setTubes] = useState([]);
  const [history, setHistory] = useState([]);

  // Result modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('win');

  // Generate scrambled valid puzzle
  const initLevel = useCallback((lvl) => {
    setSelectedTube(null);
    setHistory([]);
    setMoves(0);
    setModalVisible(false);

    const colorCount = Math.min(NEON_PALETTE.length, 3 + Math.floor((lvl - 1) / 2));
    const activeColors = NEON_PALETTE.slice(0, colorCount);

    // Create 4 items of each color
    let allLiquids = [];
    activeColors.forEach((color) => {
      for (let i = 0; i < TUBE_CAPACITY; i++) {
        allLiquids.push(color);
      }
    });

    // Shuffle liquids deterministically
    allLiquids.sort(() => Math.random() - 0.5);

    // Fill colorCount tubes, plus 1 or 2 empty tubes
    const emptyCount = lvl >= 4 ? 2 : 1;
    const initialTubes = [];

    for (let i = 0; i < colorCount; i++) {
      initialTubes.push(allLiquids.slice(i * TUBE_CAPACITY, (i + 1) * TUBE_CAPACITY));
    }
    for (let i = 0; i < emptyCount; i++) {
      initialTubes.push([]);
    }

    setTubes(initialTubes);
  }, []);

  useEffect(() => {
    initLevel(level);
  }, [level, initLevel]);

  // Check win condition
  const checkVictory = (currentTubes) => {
    for (const tube of currentTubes) {
      if (tube.length === 0) continue;
      if (tube.length !== TUBE_CAPACITY) return false;
      const firstColor = tube[0];
      if (!tube.every((c) => c === firstColor)) return false;
    }
    return true;
  };

  const handleTubePress = (index) => {
    if (selectedTube === null) {
      // Cannot select empty tube
      if (tubes[index].length === 0) return;
      setSelectedTube(index);
      playTapSound();
      triggerLightHaptic();
    } else if (selectedTube === index) {
      // Deselect
      setSelectedTube(null);
      playTapSound();
    } else {
      // Try pouring from selectedTube to index
      const src = tubes[selectedTube];
      const dest = tubes[index];

      if (dest.length >= TUBE_CAPACITY) {
        // Destination is full
        setSelectedTube(index);
        playTapSound();
        return;
      }

      const topSrcColor = src[src.length - 1];
      const topDestColor = dest.length > 0 ? dest[dest.length - 1] : null;

      // Can pour if dest is empty or matching color
      if (topDestColor === null || topDestColor === topSrcColor) {
        // Count how many matching consecutive layers can pour
        let pourCount = 0;
        for (let i = src.length - 1; i >= 0; i--) {
          if (src[i] === topSrcColor && dest.length + pourCount < TUBE_CAPACITY) {
            pourCount++;
          } else {
            break;
          }
        }

        if (pourCount > 0) {
          // Save history for undo
          setHistory((prev) => [...prev, JSON.parse(JSON.stringify(tubes))]);

          const newTubes = tubes.map((t) => [...t]);
          const moving = newTubes[selectedTube].splice(
            newTubes[selectedTube].length - pourCount,
            pourCount
          );
          newTubes[index].push(...moving);

          setTubes(newTubes);
          setSelectedTube(null);
          setMoves((m) => m + 1);
          playSliceSound();
          triggerMediumHaptic();

          // Victory check
          if (checkVictory(newTubes)) {
            const levelPoints = 250 + Math.max(0, 100 - moves * 5);
            const nextScore = score + levelPoints;
            setScore(nextScore);
            onScoreUpdate?.(nextScore);
            JuiceEngine.celebrate(width / 2, height / 2);
            setModalType('win');
            setModalVisible(true);
          }
        } else {
          setSelectedTube(index);
        }
      } else {
        // Different color, switch selection to dest
        setSelectedTube(index);
        playTapSound();
      }
    }
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setTubes(prev);
    setSelectedTube(null);
    playTapSound();
    triggerLightHaptic();
  };

  const handleNextLevel = () => {
    setLevel((lvl) => lvl + 1);
  };

  const handleRetry = () => {
    initLevel(level);
  };

  return (
    <View style={styles.container}>
      <MiniGameHeader
        floorNum={24}
        gameTitle="COLOR TUBE SORT"
        category="LOGIC PUZZLE"
        accentColor="#00F5FF"
        score={score}
        onBackToHub={onBackToHub}
      />

      {/* Control HUD */}
      <View style={styles.topHud}>
        <View style={styles.hudStat}>
          <Text style={styles.hudLabel}>STAGE</Text>
          <Text style={[styles.hudVal, { color: COLORS.cyan }]}>{level}</Text>
        </View>
        <View style={styles.hudStat}>
          <Text style={styles.hudLabel}>MOVES</Text>
          <Text style={[styles.hudVal, { color: COLORS.solarGold }]}>{moves}</Text>
        </View>
        <Pressable
          style={[styles.undoBtn, history.length === 0 && { opacity: 0.4 }]}
          onPress={handleUndo}
          disabled={history.length === 0}
        >
          <Text style={styles.undoText}>↩ UNDO</Text>
        </Pressable>
        <Pressable style={styles.resetBtn} onPress={handleRetry}>
          <Text style={styles.resetText}>🔄 RESET</Text>
        </Pressable>
      </View>

      {/* Tubes Grid Area */}
      <View style={styles.tubesContainer}>
        {tubes.map((tube, idx) => {
          const isSelected = selectedTube === idx;
          return (
            <Pressable
              key={`tube_${idx}`}
              style={[
                styles.tubeWrapper,
                isSelected && styles.tubeSelected,
              ]}
              onPress={() => handleTubePress(idx)}
            >
              {/* Top Tube Rim */}
              <View style={[styles.tubeRim, isSelected && { borderColor: COLORS.cyan }]} />

              {/* Glass Tube Body */}
              <View style={[styles.tubeBody, isSelected && { borderColor: COLORS.cyan }]}>
                {/* 4 Liquid Layers from bottom up */}
                {Array.from({ length: TUBE_CAPACITY }).map((_, slotIdx) => {
                  const liquidColor = tube[slotIdx]; // 0 is bottom
                  return (
                    <View
                      key={`slot_${slotIdx}`}
                      style={[
                        styles.liquidLayer,
                        liquidColor ? { backgroundColor: liquidColor } : styles.emptySlot,
                      ]}
                    >
                      {liquidColor && <View style={styles.liquidShine} />}
                    </View>
                  );
                })}
              </View>
            </Pressable>
          );
        })}
      </View>

      <GameResultModal
        visible={modalVisible}
        type={modalType}
        score={score}
        level={level}
        onRetry={modalType === 'win' ? handleNextLevel : handleRetry}
        onBackToHub={onBackToHub}
        buttonText={modalType === 'win' ? 'NEXT STAGE' : 'TRY AGAIN'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#03020F',
  },
  topHud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(10, 8, 30, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 245, 255, 0.2)',
  },
  hudStat: {
    alignItems: 'center',
  },
  hudLabel: {
    fontFamily: monoFont,
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.55)',
    fontWeight: '700',
  },
  hudVal: {
    fontFamily: monoFont,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  undoBtn: {
    backgroundColor: 'rgba(0, 245, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.4)',
  },
  undoText: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '800',
    color: '#00F5FF',
  },
  resetBtn: {
    backgroundColor: 'rgba(255, 0, 127, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 127, 0.4)',
  },
  resetText: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '800',
    color: '#FF007F',
  },
  tubesContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    gap: 20,
  },
  tubeWrapper: {
    alignItems: 'center',
    paddingBottom: 10,
  },
  tubeSelected: {
    transform: [{ translateY: -14 }],
  },
  tubeRim: {
    width: 48,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginBottom: -2,
    zIndex: 2,
  },
  tubeBody: {
    width: 42,
    height: 140,
    borderWidth: 2.2,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    borderTopWidth: 0,
    borderBottomLeftRadius: 21,
    borderBottomRightRadius: 21,
    backgroundColor: 'rgba(15, 20, 45, 0.75)',
    flexDirection: 'column-reverse',
    overflow: 'hidden',
    padding: 2,
  },
  liquidLayer: {
    width: '100%',
    height: 32,
    position: 'relative',
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  emptySlot: {
    backgroundColor: 'transparent',
  },
  liquidShine: {
    position: 'absolute',
    top: 2,
    right: 4,
    width: 3,
    height: 16,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
});
