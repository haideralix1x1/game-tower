import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, {
  Rect,
  Circle,
  Ellipse,
  Line,
  Defs,
  LinearGradient,
  Stop,
  G,
} from 'react-native-svg';
import { COLORS } from '../../styles';
import MiniGameHeader from '../components/MiniGameHeader';
import GameResultModal from '../components/GameResultModal';
import JuiceEngine from '../components/JuiceEngine';
import { playTapSound, playSliceSound } from '../utils/sound';
import {
  triggerLightHaptic,
  triggerMediumHaptic,
  triggerSliceHaptic,
} from '../utils/haptics';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const STORAGE_LEVEL_KEY = '@game_tower:level_tubes_v1';
const STORAGE_BEST_KEY = '@game_tower:best_tubes_v1';

const TUBE_CAPACITY = 4;
const UNIT_HEIGHT = 28;
const TUBE_WIDTH = 46;
const TUBE_HEIGHT = 144;
const MAX_LIQUID_HEIGHT = TUBE_CAPACITY * UNIT_HEIGHT; // 112px

// Rich 10-Color Cyber Neon Palette
const NEON_PALETTE = [
  { id: 'cyan', hex: '#00F5FF', name: 'CYAN' },
  { id: 'magenta', hex: '#FF007F', name: 'MAGENTA' },
  { id: 'gold', hex: '#FFD166', name: 'GOLD' },
  { id: 'lime', hex: '#39FF14', name: 'LIME' },
  { id: 'purple', hex: '#9D4EDD', name: 'PURPLE' },
  { id: 'orange', hex: '#FF6D00', name: 'ORANGE' },
  { id: 'blue', hex: '#0066FF', name: 'COBALT' },
  { id: 'emerald', hex: '#00F5D4', name: 'EMERALD' },
  { id: 'crimson', hex: '#FF2A85', name: 'CRIMSON' },
  { id: 'solar', hex: '#FFE600', name: 'SOLAR' },
];

/**
 * Generates a 100% mathematically solvable scrambled puzzle by starting
 * with completed tubes and applying valid reverse-pour operations.
 */
function generateSolvablePuzzle(level) {
  const colorCount = Math.min(
    NEON_PALETTE.length,
    Math.max(3, 3 + Math.floor((level - 1) * 0.7))
  );
  const emptyCount = level >= 3 ? 2 : 1;
  const totalTubes = colorCount + emptyCount;
  const hiddenDepth = level <= 2 ? 0 : level <= 4 ? 1 : 2;

  const activeColors = NEON_PALETTE.slice(0, colorCount).map((c) => c.hex);

  // 1. Start with fully sorted tubes
  const tubes = [];
  for (let c = 0; c < colorCount; c++) {
    const color = activeColors[c];
    const tube = [];
    for (let slot = 0; slot < TUBE_CAPACITY; slot++) {
      tube.push({ color, hidden: false });
    }
    tubes.push(tube);
  }
  for (let e = 0; e < emptyCount; e++) {
    tubes.push([]);
  }

  // 2. Perform reverse scramble steps
  const scrambleSteps = 24 + level * 6;
  for (let s = 0; s < scrambleSteps; s++) {
    const nonEmptyIndices = [];
    const availableDestIndices = [];

    for (let i = 0; i < totalTubes; i++) {
      if (tubes[i].length > 0) nonEmptyIndices.push(i);
      if (tubes[i].length < TUBE_CAPACITY) availableDestIndices.push(i);
    }

    if (nonEmptyIndices.length === 0 || availableDestIndices.length === 0) continue;

    const fromIdx = nonEmptyIndices[Math.floor(Math.random() * nonEmptyIndices.length)];
    const validDests = availableDestIndices.filter((idx) => idx !== fromIdx);
    if (validDests.length === 0) continue;

    const toIdx = validDests[Math.floor(Math.random() * validDests.length)];

    const moved = tubes[fromIdx].pop();
    tubes[toIdx].push(moved);
  }

  // 3. Apply hidden / unknown layers ('?' layers) to lower slots
  for (let i = 0; i < totalTubes; i++) {
    const t = tubes[i];
    if (t.length > 1 && hiddenDepth > 0) {
      for (let slot = 0; slot < t.length - 1; slot++) {
        if (slot < hiddenDepth) {
          t[slot].hidden = true;
        }
      }
    }
  }

  return { tubes, colorCount, emptyCount, hiddenDepth };
}

export default function ColorTubeSortGame({ onBackToHub, onScoreUpdate, isPaused = false }) {
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const { width } = useWindowDimensions();

  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [tubes, setTubes] = useState([]);
  const [selectedTube, setSelectedTube] = useState(null);
  const [history, setHistory] = useState([]);
  const [isPouring, setIsPouring] = useState(false);

  // Smooth Pour Physics Animations
  const pourAnimPos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const pourAnimRot = useRef(new Animated.Value(0)).current;
  const streamAnim = useRef(new Animated.Value(0)).current;
  const transferProgress = useRef(new Animated.Value(0)).current;

  // Track active pouring state
  const [activePour, setActivePour] = useState(null);

  // Layout cache
  const tubeLayouts = useRef({});
  const gridLayout = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // Result modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('win');

  // Load persisted level and best score from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const savedLvl = await AsyncStorage.getItem(STORAGE_LEVEL_KEY);
        const savedScore = await AsyncStorage.getItem(STORAGE_BEST_KEY);
        if (savedLvl !== null) {
          const parsedLvl = parseInt(savedLvl, 10);
          if (!isNaN(parsedLvl) && parsedLvl >= 1) setLevel(parsedLvl);
        }
        if (savedScore !== null) {
          const parsedScore = parseInt(savedScore, 10);
          if (!isNaN(parsedScore)) setScore(parsedScore);
        }
      } catch {}
    })();
  }, []);

  // Initialize Level
  const initLevel = useCallback((lvl) => {
    setSelectedTube(null);
    setHistory([]);
    setMoves(0);
    setModalVisible(false);
    setIsPouring(false);
    setActivePour(null);
    pourAnimPos.setValue({ x: 0, y: 0 });
    pourAnimRot.setValue(0);
    streamAnim.setValue(0);
    transferProgress.setValue(0);

    const puzzle = generateSolvablePuzzle(lvl);
    setTubes(puzzle.tubes);
  }, [pourAnimPos, pourAnimRot, streamAnim, transferProgress]);

  useEffect(() => {
    initLevel(level);
  }, [level, initLevel]);

  // Check if all tubes are solved
  const checkVictory = (currentTubes) => {
    for (const tube of currentTubes) {
      if (tube.length === 0) continue;
      if (tube.length !== TUBE_CAPACITY) return false;
      const firstColor = tube[0].color;
      if (!tube.every((item) => item.color === firstColor && !item.hidden)) {
        return false;
      }
    }
    return true;
  };

  const totalTubes = tubes.length;
  const rowCount = totalTubes <= 4 ? 1 : 2;
  const topRowCount = rowCount === 1 ? totalTubes : Math.ceil(totalTubes / 2);

  const rackWidth = Math.min(width - 24, 400);
  const GAP = 14;

  const getTubePos = (index) => {
    const isTop = index < topRowCount;
    const countInRow = isTop ? topRowCount : totalTubes - topRowCount;
    const rowIdx = isTop ? index : index - topRowCount;
    const rowWidth = countInRow * TUBE_WIDTH + (countInRow - 1) * GAP;
    const rowStartX = (rackWidth - rowWidth) / 2;
    const x = rowStartX + rowIdx * (TUBE_WIDTH + GAP);
    const y = isTop ? 0 : TUBE_HEIGHT + 36;
    return {
      x,
      y,
      centerX: x + TUBE_WIDTH / 2,
      centerY: y + TUBE_HEIGHT / 2,
      lipY: y,
    };
  };

  const handleTubeLayout = (index, event) => {
    const { x, y, width: w, height: h } = event.nativeEvent.layout;
    const rowYOffset = index >= topRowCount ? TUBE_HEIGHT + 36 : 0;
    tubeLayouts.current[index] = {
      x,
      y: y + rowYOffset,
      width: w || TUBE_WIDTH,
      height: h || TUBE_HEIGHT,
    };
  };

  const handleTubePress = (index) => {
    if (isPausedRef.current || isPouring) return;

    if (selectedTube === null) {
      if (tubes[index].length === 0) return;
      setSelectedTube(index);
      playTapSound();
      triggerLightHaptic();
    } else if (selectedTube === index) {
      setSelectedTube(null);
      playTapSound();
    } else {
      const src = tubes[selectedTube];
      const dest = tubes[index];

      if (dest.length >= TUBE_CAPACITY) {
        setSelectedTube(index);
        playTapSound();
        return;
      }

      const topSrcItem = src[src.length - 1];
      const topDestItem = dest.length > 0 ? dest[dest.length - 1] : null;

      if (topDestItem === null || topDestItem.color === topSrcItem.color) {
        let pourCount = 0;
        for (let i = src.length - 1; i >= 0; i--) {
          if (src[i].color === topSrcItem.color && !src[i].hidden) {
            pourCount++;
          } else {
            break;
          }
        }

        const maxCanAccept = TUBE_CAPACITY - dest.length;
        pourCount = Math.min(pourCount, maxCanAccept);

        if (pourCount > 0) {
          executePour(selectedTube, index, pourCount, topSrcItem.color);
        } else {
          setSelectedTube(index);
          playTapSound();
        }
      } else {
        setSelectedTube(index);
        playTapSound();
        triggerLightHaptic();
      }
    }
  };

  const executePour = (srcIdx, destIdx, pourCount, pourColor) => {
    setIsPouring(true);
    setSelectedTube(null);

    setHistory((prev) => [
      ...prev,
      tubes.map((t) => t.map((item) => ({ ...item }))),
    ]);

    const srcPos = getTubePos(srcIdx);
    const destPos = getTubePos(destIdx);

    const tiltDeg = destPos.centerX >= srcPos.centerX ? 65 : -65;
    const theta = (tiltDeg * Math.PI) / 180;

    const mouthOffsetX = (TUBE_HEIGHT / 2) * Math.sin(theta);
    const mouthOffsetY = -(TUBE_HEIGHT / 2) * Math.cos(theta);

    const targetMouthX = destPos.centerX + (tiltDeg > 0 ? 6 : -6);
    const targetMouthY = destPos.lipY - 12;

    const targetSrcCenterX = targetMouthX - mouthOffsetX;
    const targetSrcCenterY = targetMouthY - mouthOffsetY;

    const deltaX = targetSrcCenterX - srcPos.centerX;
    const deltaY = targetSrcCenterY - srcPos.centerY;

    setActivePour({
      srcIdx,
      destIdx,
      color: pourColor,
      pourCount,
      tiltDeg,
      mouthX: targetMouthX,
      mouthY: targetMouthY,
      destCenterX: destPos.centerX,
      destLipY: destPos.lipY,
    });

    pourAnimPos.setValue({ x: 0, y: 0 });
    pourAnimRot.setValue(0);
    streamAnim.setValue(0);
    transferProgress.setValue(0);

    // 1. Glide towards target lip
    Animated.timing(pourAnimPos, {
      toValue: { x: deltaX, y: deltaY },
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      // 2. Tilt mouth towards opening
      Animated.timing(pourAnimRot, {
        toValue: tiltDeg > 0 ? 1 : -1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        // 3. Fluid Stream Flow & Dynamic Fluid Transfer
        playSliceSound();
        triggerSliceHaptic();

        Animated.parallel([
          Animated.sequence([
            Animated.timing(streamAnim, {
              toValue: 1,
              duration: 60,
              useNativeDriver: false,
            }),
            Animated.delay(260),
            Animated.timing(streamAnim, {
              toValue: 0,
              duration: 60,
              useNativeDriver: false,
            }),
          ]),
          Animated.timing(transferProgress, {
            toValue: 1,
            duration: 340,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: false,
          }),
        ]).start(() => {
          // Transfer liquids in state
          const newTubes = tubes.map((t) => t.map((item) => ({ ...item })));
          const moved = newTubes[srcIdx].splice(
            newTubes[srcIdx].length - pourCount,
            pourCount
          );
          newTubes[destIdx].push(...moved);

          // Reveal newly exposed top layer in source tube if hidden
          if (newTubes[srcIdx].length > 0) {
            const newTop = newTubes[srcIdx][newTubes[srcIdx].length - 1];
            if (newTop.hidden) {
              newTop.hidden = false;
              playTapSound();
              triggerMediumHaptic();
            }
          }

          setTubes(newTubes);
          setMoves((m) => m + 1);
          transferProgress.setValue(0);

          // 4. Return to home slot
          Animated.parallel([
            Animated.timing(pourAnimRot, {
              toValue: 0,
              duration: 180,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(pourAnimPos, {
              toValue: { x: 0, y: 0 },
              duration: 220,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
          ]).start(() => {
            setIsPouring(false);
            setActivePour(null);

            // 5. Victory Check
            if (checkVictory(newTubes)) {
              const basePoints = 250 + level * 50;
              const bonus = Math.max(0, 120 - moves * 4);
              const nextScore = score + basePoints + bonus;
              setScore(nextScore);
              onScoreUpdate?.(nextScore);

              AsyncStorage.setItem(STORAGE_BEST_KEY, String(nextScore)).catch(() => {});

              JuiceEngine.celebrate(width / 2, 280);
              setModalType('win');
              setModalVisible(true);
            }
          });
        });
      });
    });
  };

  const handleUndo = () => {
    if (history.length === 0 || isPouring) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, h.length - 1));
    setTubes(prev);
    setMoves((m) => Math.max(0, m - 1));
    playTapSound();
    triggerLightHaptic();
  };

  const handleRetry = () => {
    if (isPouring) return;
    initLevel(level);
    playTapSound();
  };

  const handleNextLevel = () => {
    const next = level + 1;
    setLevel(next);
    AsyncStorage.setItem(STORAGE_LEVEL_KEY, String(next)).catch(() => {});
  };

  const rotateInterpolation = pourAnimRot.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-65deg', '0deg', '65deg'],
  });

  const topRowTubes = tubes.slice(0, topRowCount);
  const bottomRowTubes = rowCount === 2 ? tubes.slice(topRowCount) : [];

  // Render authentic liquid meniscus surface
  const renderMeniscus = (color, isAnimatedRipple = false) => (
    <View style={styles.meniscusContainer}>
      <View style={[styles.meniscusSurface, { backgroundColor: color }]} />
      <View style={styles.meniscusGleam} />
      {isAnimatedRipple && <View style={styles.rippleGlow} />}
    </View>
  );

  // Render individual realistic liquid layer unit
  const renderLiquidUnit = (color, isHidden, isBottom, isTop, keyId) => {
    return (
      <View
        key={keyId}
        style={[
          styles.liquidLayer,
          isHidden ? styles.hiddenLayer : { backgroundColor: color },
          isBottom && styles.bottomLiquidCurve,
        ]}
      >
        {!isHidden && (
          <>
            {/* Cylindrical left glass reflection */}
            <View style={styles.liquidShine} />

            {/* Suspended micro-bubbles for real fluid translucency */}
            <View style={[styles.bubble, { left: 9, bottom: 8 }]} />
            <View style={[styles.bubble, { right: 8, bottom: 16, width: 2, height: 2 }]} />

            {/* Meniscus surface curve at the top edge */}
            {isTop && renderMeniscus(color)}
          </>
        )}

        {isHidden && <Text style={styles.hiddenText}>?</Text>}
      </View>
    );
  };

  // Unified Realistic Tube Component
  const renderTube = (tube, globalIdx) => {
    const isSelected = selectedTube === globalIdx;
    const isThisPouring = activePour && activePour.srcIdx === globalIdx;
    const isThisReceiving = activePour && activePour.destIdx === globalIdx;

    // Split liquid units during active pouring animation for smooth continuous drain/fill
    let renderedUnits = null;

    if (isThisPouring) {
      // Source tube: remaining stable units at bottom, top pouring units drain down
      const stableCount = tube.length - activePour.pourCount;
      const stableItems = tube.slice(0, stableCount);

      const drainHeight = transferProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [activePour.pourCount * UNIT_HEIGHT, 0],
      });

      renderedUnits = (
        <>
          {/* Stable bottom liquid layers */}
          {stableItems.map((item, idx) =>
            renderLiquidUnit(
              item.color,
              item.hidden,
              idx === 0,
              idx === stableItems.length - 1 && activePour.pourCount === 0,
              `stable_${globalIdx}_${idx}`
            )
          )}

          {/* Smoothly draining top liquid layer */}
          <Animated.View style={[styles.animatedFluidWrap, { height: drainHeight }]}>
            <View
              style={[
                styles.fluidFill,
                {
                  backgroundColor: activePour.color,
                  height: activePour.pourCount * UNIT_HEIGHT,
                },
                stableCount === 0 && styles.bottomLiquidCurve,
              ]}
            >
              <View style={styles.liquidShine} />
              {renderMeniscus(activePour.color)}
            </View>
          </Animated.View>
        </>
      );
    } else if (isThisReceiving) {
      // Destination tube: existing units at bottom, incoming units rise smoothly
      const incomingHeight = transferProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, activePour.pourCount * UNIT_HEIGHT],
      });

      renderedUnits = (
        <>
          {/* Pre-existing liquid in destination */}
          {tube.map((item, idx) =>
            renderLiquidUnit(
              item.color,
              item.hidden,
              idx === 0,
              idx === tube.length - 1,
              `dest_exist_${globalIdx}_${idx}`
            )
          )}

          {/* Smoothly rising incoming liquid layer */}
          <Animated.View style={[styles.animatedFluidWrap, { height: incomingHeight }]}>
            <View
              style={[
                styles.fluidFill,
                {
                  backgroundColor: activePour.color,
                  height: activePour.pourCount * UNIT_HEIGHT,
                },
                tube.length === 0 && styles.bottomLiquidCurve,
              ]}
            >
              <View style={styles.liquidShine} />
              {renderMeniscus(activePour.color, true)}
            </View>
          </Animated.View>
        </>
      );
    } else {
      // Normal state: render all units from bottom to top
      renderedUnits = tube.map((item, idx) =>
        renderLiquidUnit(
          item.color,
          item.hidden,
          idx === 0,
          idx === tube.length - 1,
          `unit_${globalIdx}_${idx}`
        )
      );
    }

    // Check if tube is completely solved (filled with 4 matching colors)
    const isCompleted =
      tube.length === TUBE_CAPACITY &&
      tube.every((item) => item.color === tube[0].color && !item.hidden);

    return (
      <View
        key={`tube_${globalIdx}`}
        style={styles.tubeSlot}
        onLayout={(e) => handleTubeLayout(globalIdx, e)}
      >
        <Animated.View
          style={[
            styles.tubeWrapper,
            isSelected && styles.tubeSelected,
            isThisPouring && {
              transform: [
                { translateX: pourAnimPos.x },
                { translateY: pourAnimPos.y },
                { rotate: rotateInterpolation },
              ],
              zIndex: 9999,
              elevation: 999,
            },
          ]}
        >
          <Pressable
            style={styles.tubeHitArea}
            onPress={() => handleTubePress(globalIdx)}
            disabled={isPouring}
          >
            {/* Laboratory Glass Rim / Lip */}
            <View
              style={[
                styles.tubeRim,
                isSelected && styles.rimSelected,
                isCompleted && styles.rimCompleted,
              ]}
            >
              <View style={styles.rimInnerHole} />
            </View>

            {/* Test Tube Glass Cylinder */}
            <View
              style={[
                styles.tubeBody,
                isSelected && styles.bodySelected,
                isCompleted && styles.bodyCompleted,
              ]}
            >
              {/* Actual Fluid Column (flexDirection: column-reverse fills strictly from bottom) */}
              <View style={styles.fluidContainer}>{renderedUnits}</View>

              {/* OVERLAY: Cylindrical Vertical Specular Glass Glare */}
              <View pointerEvents="none" style={styles.glassSpecularStreak} />

              {/* OVERLAY: Etched Laboratory Measurement Ticks (25%, 50%, 75%, 100%) */}
              <View pointerEvents="none" style={styles.measurementRuler}>
                <View style={[styles.tickMark, styles.tick100]} />
                <View style={[styles.tickMark, styles.tick75]} />
                <View style={[styles.tickMark, styles.tick50]} />
                <View style={[styles.tickMark, styles.tick25]} />
              </View>

              {/* OVERLAY: Subtle right-edge ambient glass glow */}
              <View pointerEvents="none" style={styles.glassRightReflect} />
            </View>

            {/* Hemispherical Base Glow */}
            <View
              style={[
                styles.tubeBaseGlow,
                isSelected && { backgroundColor: COLORS.cyan },
                isCompleted && { backgroundColor: COLORS.lime },
              ]}
            />
          </Pressable>
        </Animated.View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <MiniGameHeader
        title="COLOR TUBES"
        score={score}
        onBack={onBackToHub}
        highScoreTitle="SOLVED"
      />

      {/* HUD Bar */}
      <View style={styles.hudBar}>
        <View style={styles.hudItem}>
          <Text style={styles.hudLabel}>LEVEL</Text>
          <Text style={[styles.hudVal, { color: COLORS.cyan }]}>{level}</Text>
        </View>
        <View style={styles.hudItem}>
          <Text style={styles.hudLabel}>MOVES</Text>
          <Text style={[styles.hudVal, { color: '#FFF' }]}>{moves}</Text>
        </View>
        <Pressable
          style={[
            styles.hudBtn,
            (history.length === 0 || isPouring) && { opacity: 0.4 },
          ]}
          onPress={handleUndo}
          disabled={history.length === 0 || isPouring}
        >
          <Text style={styles.undoText}>↩ UNDO</Text>
        </Pressable>
        <Pressable
          style={[styles.hudBtn, isPouring && { opacity: 0.4 }]}
          onPress={handleRetry}
          disabled={isPouring}
        >
          <Text style={styles.resetText}>🔄 RESET</Text>
        </Pressable>
      </View>

      {/* CENTERED PLAYABLE ARENA */}
      <View style={styles.centerArena}>
        <View
          style={[styles.rackWrapper, { width: rackWidth }]}
          onLayout={(e) => {
            gridLayout.current = e.nativeEvent.layout;
          }}
        >
          {/* Top Row of Tubes */}
          <View style={styles.tubesRow}>
            {topRowTubes.map((tube, rowIdx) => renderTube(tube, rowIdx))}
          </View>

          {/* Bottom Row of Tubes */}
          {bottomRowTubes.length > 0 && (
            <View style={[styles.tubesRow, { marginTop: 36 }]}>
              {bottomRowTubes.map((tube, rowIdx) =>
                renderTube(tube, topRowCount + rowIdx)
              )}
            </View>
          )}

          {/* FLUID STREAM OVERLAY (Active during pouring) */}
          {activePour && (
            <Animated.View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                { opacity: streamAnim, zIndex: 9998 },
              ]}
            >
              <Svg width="100%" height="100%">
                <Defs>
                  <LinearGradient id="streamGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={activePour.color} stopOpacity="0.85" />
                    <Stop offset="100%" stopColor={activePour.color} stopOpacity="1" />
                  </LinearGradient>
                </Defs>

                <G>
                  {/* Outer Glowing Fluid Aura */}
                  <Line
                    x1={activePour.mouthX}
                    y1={activePour.mouthY}
                    x2={activePour.destCenterX}
                    y2={activePour.destLipY + 16}
                    stroke={activePour.color}
                    strokeWidth={7}
                    strokeOpacity={0.35}
                    strokeLinecap="round"
                  />

                  {/* Inner Vibrant Liquid Stream Core */}
                  <Line
                    x1={activePour.mouthX}
                    y1={activePour.mouthY}
                    x2={activePour.destCenterX}
                    y2={activePour.destLipY + 16}
                    stroke="url(#streamGrad)"
                    strokeWidth={3.5}
                    strokeLinecap="round"
                  />

                  {/* Specular Stream Highlight */}
                  <Line
                    x1={activePour.mouthX}
                    y1={activePour.mouthY}
                    x2={activePour.destCenterX}
                    y2={activePour.destLipY + 16}
                    stroke="rgba(255, 255, 255, 0.7)"
                    strokeWidth={1.2}
                    strokeLinecap="round"
                  />

                  {/* Impact Splash Rings at Destination Rim */}
                  <Ellipse
                    cx={activePour.destCenterX}
                    cy={activePour.destLipY + 5}
                    rx={12}
                    ry={4}
                    fill="none"
                    stroke={activePour.color}
                    strokeWidth={2}
                  />
                  <Circle
                    cx={activePour.destCenterX}
                    cy={activePour.destLipY + 5}
                    r={3}
                    fill="#FFF"
                  />
                </G>
              </Svg>
            </Animated.View>
          )}

          {/* Cyber Lab Platform Base */}
          <View style={styles.labPedestal}>
            <View style={styles.pedestalBar} />
            <Text style={styles.pedestalText}>QUANTUM FLUID LAB</Text>
          </View>
        </View>
      </View>

      {/* Result Modal */}
      <GameResultModal
        visible={modalVisible}
        type={modalType}
        score={score}
        onRetry={handleRetry}
        onRestart={handleRetry}
        onNext={handleNextLevel}
        onNextLevel={handleNextLevel}
        onBackToHub={onBackToHub}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0612',
  },
  hudBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  hudItem: {
    alignItems: 'center',
  },
  hudLabel: {
    fontFamily: monoFont,
    fontSize: 9,
    color: '#8A8F9E',
    fontWeight: '800',
    marginBottom: 2,
    letterSpacing: 0.8,
  },
  hudVal: {
    fontFamily: monoFont,
    fontSize: 14,
    fontWeight: '900',
  },
  hudBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  undoText: {
    fontFamily: monoFont,
    fontSize: 10.5,
    fontWeight: '900',
    color: '#E2E8F0',
  },
  resetText: {
    fontFamily: monoFont,
    fontSize: 10.5,
    fontWeight: '900',
    color: '#FFE600',
  },
  centerArena: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  rackWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  tubesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },
  tubeSlot: {
    width: TUBE_WIDTH,
    height: TUBE_HEIGHT + 14,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  tubeWrapper: {
    width: TUBE_WIDTH,
    height: TUBE_HEIGHT,
    alignItems: 'center',
  },
  tubeSelected: {
    transform: [{ translateY: -16 }],
    shadowColor: '#00F5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 14,
    elevation: 10,
  },
  tubeHitArea: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
  },
  tubeRim: {
    width: TUBE_WIDTH + 8,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1.8,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    marginBottom: -2,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rimSelected: {
    borderColor: COLORS.cyan,
    backgroundColor: 'rgba(0, 245, 255, 0.25)',
  },
  rimCompleted: {
    borderColor: COLORS.lime,
    backgroundColor: 'rgba(57, 255, 20, 0.25)',
  },
  rimInnerHole: {
    width: TUBE_WIDTH - 6,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(10, 15, 30, 0.8)',
  },
  tubeBody: {
    width: TUBE_WIDTH,
    height: TUBE_HEIGHT - 6,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    borderWidth: 2.2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    backgroundColor: 'rgba(15, 12, 32, 0.72)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  bodySelected: {
    borderColor: COLORS.cyan,
  },
  bodyCompleted: {
    borderColor: COLORS.lime,
  },
  fluidContainer: {
    width: '100%',
    flexDirection: 'column-reverse',
    justifyContent: 'flex-start',
  },
  liquidLayer: {
    width: '100%',
    height: UNIT_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
  },
  fluidFill: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  animatedFluidWrap: {
    width: '100%',
    overflow: 'hidden',
  },
  bottomLiquidCurve: {
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  hiddenLayer: {
    backgroundColor: '#1E1630',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hiddenText: {
    fontFamily: monoFont,
    fontSize: 14,
    fontWeight: '900',
    color: '#FFE600',
  },
  liquidShine: {
    position: 'absolute',
    left: 4,
    top: 0,
    bottom: 0,
    width: 3.5,
    backgroundColor: 'rgba(255, 255, 255, 0.26)',
    borderRadius: 1.5,
  },
  bubble: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  meniscusContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 5,
    overflow: 'hidden',
  },
  meniscusSurface: {
    width: '100%',
    height: 3,
    opacity: 0.95,
  },
  meniscusGleam: {
    position: 'absolute',
    top: 0,
    left: 2,
    right: 2,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderRadius: 1,
  },
  rippleGlow: {
    position: 'absolute',
    top: 1,
    left: 8,
    right: 8,
    height: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderRadius: 1.5,
  },
  glassSpecularStreak: {
    position: 'absolute',
    left: 4,
    top: 6,
    bottom: 18,
    width: 2.8,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: 1.4,
    zIndex: 10,
  },
  glassRightReflect: {
    position: 'absolute',
    right: 3,
    top: 10,
    bottom: 22,
    width: 1.2,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 0.6,
    zIndex: 10,
  },
  measurementRuler: {
    position: 'absolute',
    right: 2,
    bottom: 0,
    height: MAX_LIQUID_HEIGHT,
    width: 14,
    justifyContent: 'flex-end',
    zIndex: 11,
  },
  tickMark: {
    position: 'absolute',
    right: 0,
    height: 1.4,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 0.7,
  },
  tick25: {
    bottom: UNIT_HEIGHT,
    width: 5,
  },
  tick50: {
    bottom: UNIT_HEIGHT * 2,
    width: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.48)',
  },
  tick75: {
    bottom: UNIT_HEIGHT * 3,
    width: 5,
  },
  tick100: {
    bottom: UNIT_HEIGHT * 4,
    width: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  tubeBaseGlow: {
    width: 24,
    height: 3,
    backgroundColor: 'rgba(0, 245, 255, 0.3)',
    borderRadius: 1.5,
    marginTop: 3,
  },
  labPedestal: {
    position: 'absolute',
    bottom: 12,
    alignItems: 'center',
  },
  pedestalBar: {
    width: 140,
    height: 2,
    backgroundColor: 'rgba(0, 245, 255, 0.3)',
    marginBottom: 6,
  },
  pedestalText: {
    fontFamily: monoFont,
    fontSize: 9,
    color: '#6B7280',
    fontWeight: '800',
    letterSpacing: 1.2,
  },
});
