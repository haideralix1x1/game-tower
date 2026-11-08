import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, {
  Rect,
  Circle,
  Path,
  Defs,
  RadialGradient as SvgRadialGradient,
  Stop,
  G,
  Line,
} from 'react-native-svg';
import { COLORS } from '../../styles';
import MiniGameHeader from '../components/MiniGameHeader';
import JuiceEngine from '../components/JuiceEngine';
import GameResultModal from '../components/GameResultModal';
import {
  triggerLightHaptic,
  triggerMediumHaptic,
  triggerPerfectHaptic,
  triggerSelectionHaptic,
  triggerGameOverHaptic,
} from '../utils/haptics';
import {
  playTapSound,
  playPerfectSound,
  playSliceSound,
  playSnapTickSound,
  playGameOverSound,
} from '../utils/sound';

const STORAGE_KEY = '@game_tower:best_screw_v1';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

// Board dimensions
const BOARD_W = 340;
const BOARD_H = 420;

// Universal Top Spare Rack Sockets (guarantees every level is solvable & fair)
const SPARE_SOCKETS = [
  { id: 'spare_0', x: 95, y: 50, isSpare: true },
  { id: 'spare_1', x: 170, y: 50, isSpare: true },
  { id: 'spare_2', x: 245, y: 50, isSpare: true },
];

/**
 * 12 Curated Escalating Levels of Cyber Screws and Interlocking Struts
 */
const CURATED_LEVELS = [
  // Level 1: Dual Strut Override
  {
    name: 'INITIAL OVERRIDE',
    parMoves: 4,
    maxMoves: 6,
    holes: [
      { id: 'h0', x: 90, y: 160 },
      { id: 'h1', x: 250, y: 160 },
      { id: 'h2', x: 170, y: 290 },
    ],
    planks: [
      { id: 'p0', name: 'CYAN STRUT', holes: ['h0', 'h1'], color: '#00F5FF', layer: 2 },
      { id: 'p1', name: 'MAGENTA STRUT', holes: ['h0', 'h2'], color: '#FF007F', layer: 1 },
    ],
    initialScrews: {
      h0: { color: '#00F5FF' },
      h1: { color: '#00F5FF' },
      h2: { color: '#FF007F' },
    },
  },

  // Level 2: Crossfire Matrix
  {
    name: 'CROSSFIRE MATRIX',
    parMoves: 6,
    maxMoves: 9,
    holes: [
      { id: 'h0', x: 80, y: 140 },
      { id: 'h1', x: 260, y: 140 },
      { id: 'h2', x: 80, y: 280 },
      { id: 'h3', x: 260, y: 280 },
      { id: 'h4', x: 170, y: 210 }, // Central board socket
    ],
    planks: [
      { id: 'p0', name: 'GOLD BEAM', holes: ['h0', 'h1'], color: '#FFE600', layer: 3 },
      { id: 'p1', name: 'CYAN BEAM', holes: ['h2', 'h3'], color: '#00F5FF', layer: 2 },
      { id: 'p2', name: 'LIME DIAGONAL', holes: ['h0', 'h3'], color: '#39FF14', layer: 1 },
    ],
    initialScrews: {
      h0: { color: '#FFE600' },
      h1: { color: '#FFE600' },
      h2: { color: '#00F5FF' },
      h3: { color: '#00F5FF' },
    },
  },

  // Level 3: Triad Nexus (Triangle of 3 interlocking struts)
  {
    name: 'TRIAD NEXUS',
    parMoves: 7,
    maxMoves: 10,
    holes: [
      { id: 'h0', x: 90, y: 135 },
      { id: 'h1', x: 250, y: 135 },
      { id: 'h2', x: 170, y: 285 },
      { id: 'h_center', x: 170, y: 190 },
    ],
    planks: [
      { id: 'p0', name: 'VIOLET STRUT', holes: ['h0', 'h1'], color: '#9D4EDD', layer: 3 },
      { id: 'p1', name: 'ORANGE STRUT', holes: ['h1', 'h2'], color: '#FF5E00', layer: 2 },
      { id: 'p2', name: 'CYAN STRUT', holes: ['h2', 'h0'], color: '#00F5FF', layer: 1 },
    ],
    initialScrews: {
      h0: { color: '#9D4EDD' },
      h1: { color: '#FF5E00' },
      h2: { color: '#00F5FF' },
    },
  },

  // Level 4: Z-Link Matrix
  {
    name: 'Z-LINK MATRIX',
    parMoves: 8,
    maxMoves: 12,
    holes: [
      { id: 'h0', x: 80, y: 130 },
      { id: 'h1', x: 260, y: 130 },
      { id: 'h2', x: 80, y: 290 },
      { id: 'h3', x: 260, y: 290 },
      { id: 'h_spare1', x: 170, y: 160 },
      { id: 'h_spare2', x: 170, y: 250 },
    ],
    planks: [
      { id: 'p0', name: 'TOP BAR', holes: ['h0', 'h1'], color: '#00F5FF', layer: 3 },
      { id: 'p1', name: 'DIAGONAL Z', holes: ['h1', 'h2'], color: '#FFE600', layer: 2 },
      { id: 'p2', name: 'BOTTOM BAR', holes: ['h2', 'h3'], color: '#FF007F', layer: 1 },
    ],
    initialScrews: {
      h0: { color: '#00F5FF' },
      h1: { color: '#00F5FF' },
      h2: { color: '#FFE600' },
      h3: { color: '#FF007F' },
    },
  },

  // Level 5: Pentaplex Core
  {
    name: 'PENTAPLEX CORE',
    parMoves: 9,
    maxMoves: 14,
    holes: [
      { id: 'h0', x: 80, y: 130 },
      { id: 'h1', x: 260, y: 130 },
      { id: 'h2', x: 260, y: 290 },
      { id: 'h3', x: 80, y: 290 },
      { id: 'h_center', x: 170, y: 210 },
    ],
    planks: [
      { id: 'p0', name: 'NORTH STRUT', holes: ['h0', 'h1'], color: '#00F5FF', layer: 4 },
      { id: 'p1', name: 'EAST STRUT', holes: ['h1', 'h2'], color: '#39FF14', layer: 3 },
      { id: 'p2', name: 'SOUTH STRUT', holes: ['h2', 'h3'], color: '#FF007F', layer: 2 },
      { id: 'p3', name: 'DIAGONAL CROSS', holes: ['h0', 'h2'], color: '#FFE600', layer: 1 },
    ],
    initialScrews: {
      h0: { color: '#00F5FF' },
      h1: { color: '#39FF14' },
      h2: { color: '#FF007F' },
      h3: { color: '#FFE600' },
    },
  },

  // Level 6: Double Chevron
  {
    name: 'DOUBLE CHEVRON',
    parMoves: 10,
    maxMoves: 15,
    holes: [
      { id: 'h0', x: 80, y: 120 },
      { id: 'h1', x: 260, y: 120 },
      { id: 'h2', x: 170, y: 200 },
      { id: 'h3', x: 80, y: 300 },
      { id: 'h4', x: 260, y: 300 },
    ],
    planks: [
      { id: 'p0', name: 'UPPER LEFT', holes: ['h0', 'h2'], color: '#FF5E00', layer: 4 },
      { id: 'p1', name: 'UPPER RIGHT', holes: ['h1', 'h2'], color: '#00F5FF', layer: 3 },
      { id: 'p2', name: 'LOWER LEFT', holes: ['h3', 'h2'], color: '#39FF14', layer: 2 },
      { id: 'p3', name: 'LOWER RIGHT', holes: ['h4', 'h2'], color: '#9D4EDD', layer: 1 },
    ],
    initialScrews: {
      h0: { color: '#FF5E00' },
      h1: { color: '#00F5FF' },
      h2: { color: '#FFE600' },
      h3: { color: '#39FF14' },
      h4: { color: '#9D4EDD' },
    },
  },

  // Level 7: Hexa-Lattice
  {
    name: 'HEXA LATTICE',
    parMoves: 11,
    maxMoves: 16,
    holes: [
      { id: 'h0', x: 80, y: 120 },
      { id: 'h1', x: 260, y: 120 },
      { id: 'h2', x: 60, y: 210 },
      { id: 'h3', x: 280, y: 210 },
      { id: 'h4', x: 80, y: 300 },
      { id: 'h5', x: 260, y: 300 },
      { id: 'h_c', x: 170, y: 210 },
    ],
    planks: [
      { id: 'p0', name: 'TOP HORIZON', holes: ['h0', 'h1'], color: '#00F5FF', layer: 4 },
      { id: 'p1', name: 'LEFT WING', holes: ['h0', 'h2'], color: '#FF007F', layer: 3 },
      { id: 'p2', name: 'RIGHT WING', holes: ['h1', 'h3'], color: '#FFE600', layer: 2 },
      { id: 'p3', name: 'BOTTOM HORIZON', holes: ['h4', 'h5'], color: '#9D4EDD', layer: 1 },
    ],
    initialScrews: {
      h0: { color: '#00F5FF' },
      h1: { color: '#FF007F' },
      h2: { color: '#FFE600' },
      h3: { color: '#39FF14' },
      h4: { color: '#9D4EDD' },
      h5: { color: '#00F5FF' },
    },
  },

  // Level 8: Titanium Cage
  {
    name: 'TITANIUM CAGE',
    parMoves: 13,
    maxMoves: 18,
    holes: [
      { id: 'h0', x: 80, y: 120 },
      { id: 'h1', x: 170, y: 120 },
      { id: 'h2', x: 260, y: 120 },
      { id: 'h3', x: 80, y: 290 },
      { id: 'h4', x: 170, y: 290 },
      { id: 'h5', x: 260, y: 290 },
    ],
    planks: [
      { id: 'p0', name: 'TOP HORIZON', holes: ['h0', 'h2'], color: '#00F5FF', layer: 5 },
      { id: 'p1', name: 'LEFT POST', holes: ['h0', 'h3'], color: '#FF007F', layer: 4 },
      { id: 'p2', name: 'CENTER POST', holes: ['h1', 'h4'], color: '#FFE600', layer: 3 },
      { id: 'p3', name: 'RIGHT POST', holes: ['h2', 'h5'], color: '#39FF14', layer: 2 },
      { id: 'p4', name: 'BASE HORIZON', holes: ['h3', 'h5'], color: '#9D4EDD', layer: 1 },
    ],
    initialScrews: {
      h0: { color: '#00F5FF' },
      h1: { color: '#FF007F' },
      h2: { color: '#FFE600' },
      h3: { color: '#39FF14' },
      h4: { color: '#FF5E00' },
      h5: { color: '#9D4EDD' },
    },
  },
];

export default function CyberScrewGame({
  isPaused = false,
  onBackToHub,
  onScoreUpdate,
}) {
  const juiceRef = useRef(null);

  const [currentLevel, setCurrentLevel] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [movesCount, setMovesCount] = useState(0);

  // Active level config
  const levelIdx = Math.min(currentLevel - 1, CURATED_LEVELS.length - 1);
  const levelConfig = CURATED_LEVELS[levelIdx];

  // Board holes + Top Spare sockets combined
  const allHoles = useMemo(() => {
    return [...SPARE_SOCKETS, ...levelConfig.holes];
  }, [levelConfig.holes]);

  const holeMap = useMemo(() => {
    const map = {};
    allHoles.forEach((h) => {
      map[h.id] = h;
    });
    return map;
  }, [allHoles]);

  // Current screws mapping: { [holeId]: { color } }
  const [screws, setScrews] = useState(() => ({ ...levelConfig.initialScrews }));
  // Fallen planks set: Set<plankId>
  const [fallenPlanks, setFallenPlanks] = useState(() => new Set());
  // Selected screw hole ID
  const [selectedHoleId, setSelectedHoleId] = useState(null);
  // Undo history stack
  const [undoStack, setUndoStack] = useState([]);
  const [isWon, setIsWon] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);

  // Maximum moves allowed for current puzzle
  const maxMoves = levelConfig.maxMoves || Math.max(levelConfig.parMoves + 3, Math.round(levelConfig.parMoves * 1.4));
  const movesLeft = Math.max(0, maxMoves - movesCount);

  // Load high score
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((val) => {
        if (val) setHighScore(parseInt(val, 10) || 0);
      })
      .catch(() => {});
  }, []);

  // Initialize level
  const initLevel = useCallback((lvl) => {
    const cfg = CURATED_LEVELS[Math.min(lvl - 1, CURATED_LEVELS.length - 1)];
    setScrews({ ...cfg.initialScrews });
    setFallenPlanks(new Set());
    setSelectedHoleId(null);
    setUndoStack([]);
    setMovesCount(0);
    setIsWon(false);
    setIsGameOver(false);
    setShowResultModal(false);
  }, []);

  // Check victory condition
  const checkVictory = useCallback(
    (currentFallenSet, currentMoves) => {
      if (currentFallenSet.size === levelConfig.planks.length) {
        setIsWon(true);
        triggerPerfectHaptic();
        playPerfectSound();

        const parBonus = Math.max(0, (levelConfig.parMoves - currentMoves) * 25);
        const earned = 250 + currentLevel * 100 + parBonus;
        const nextScore = totalScore + earned;
        setTotalScore(nextScore);

        if (nextScore > highScore) {
          setHighScore(nextScore);
          AsyncStorage.setItem(STORAGE_KEY, String(nextScore)).catch(() => {});
        }
        onScoreUpdate?.(nextScore);

        juiceRef.current?.celebrate(
          '⚡ ALL STRUTS DISMANTLED!',
          `Core unlocked in ${currentMoves} moves! +${earned} PTS`,
          COLORS.matrixMint
        );

        setTimeout(() => {
          setShowResultModal(true);
        }, 1100);
      }
    },
    [levelConfig.planks.length, levelConfig.parMoves, currentLevel, totalScore, highScore, onScoreUpdate]
  );

  // Handle tap on a hole or socket
  const handleHolePress = useCallback(
    (holeId) => {
      if (isPaused || isWon || isGameOver) return;

      const hasScrew = !!screws[holeId];

      if (!selectedHoleId) {
        // Step 1: Select a screw
        if (hasScrew) {
          setSelectedHoleId(holeId);
          playSliceSound();
          triggerSelectionHaptic();
        } else {
          // Tapped an empty socket with no screw selected
          playSnapTickSound();
          triggerLightHaptic();
        }
      } else {
        // Step 2: A screw is currently selected
        if (selectedHoleId === holeId) {
          // Tapped the same screw -> Deselect
          setSelectedHoleId(null);
          playSnapTickSound();
          triggerLightHaptic();
        } else if (hasScrew) {
          // Tapped another screw -> Switch selection
          setSelectedHoleId(holeId);
          playSliceSound();
          triggerSelectionHaptic();
        } else {
          // Tapped an EMPTY socket -> MOVE SCREW HERE!
          const movingScrew = screws[selectedHoleId];
          const nextScrews = { ...screws };
          delete nextScrews[selectedHoleId];
          nextScrews[holeId] = movingScrew;

          const nextMoves = movesCount + 1;
          setMovesCount(nextMoves);

          // Save to Undo stack
          setUndoStack((prev) => [
            ...prev,
            {
              screwsSnapshot: { ...screws },
              fallenSnapshot: new Set(fallenPlanks),
              moves: movesCount,
            },
          ]);

          setScrews(nextScrews);
          setSelectedHoleId(null);

          playTapSound();
          triggerMediumHaptic();

          // Spark juice at target socket
          const destHole = holeMap[holeId];
          if (destHole) {
            juiceRef.current?.burst(destHole.x, destHole.y, movingScrew.color, 10);
          }

          // Check if any active plank now has ZERO screws holding it!
          const nextFallen = new Set(fallenPlanks);
          let dropOccurred = false;

          levelConfig.planks.forEach((plank) => {
            if (nextFallen.has(plank.id)) return;

            // Count how many screws are currently in this plank's holes
            const remaining = plank.holes.filter((hId) => !!nextScrews[hId]).length;
            if (remaining === 0) {
              // ALL SCREWS REMOVED! THE PLANK DROPS!
              nextFallen.add(plank.id);
              dropOccurred = true;

              const h1 = holeMap[plank.holes[0]];
              const h2 = holeMap[plank.holes[1]];
              const cx = h1 && h2 ? (h1.x + h2.x) / 2 : 170;
              const cy = h1 && h2 ? (h1.y + h2.y) / 2 : 200;

              juiceRef.current?.burst(cx, cy, plank.color, 20);
              juiceRef.current?.shake(6, 6);
              juiceRef.current?.popup('💥 STRUT FREED!', plank.name, plank.color);
            }
          });

          if (dropOccurred) {
            setFallenPlanks(nextFallen);
            playPerfectSound();
            triggerPerfectHaptic();
            checkVictory(nextFallen, nextMoves);
          } else {
            // Check moves limit when no struts dropped
            if (nextFallen.size < levelConfig.planks.length && nextMoves >= maxMoves) {
              setIsGameOver(true);
              playGameOverSound();
              triggerGameOverHaptic();
              juiceRef.current?.popup('NO MOVES LEFT', `Max ${maxMoves} reached!`, '#FF0055');
              setTimeout(() => {
                setShowResultModal(true);
              }, 900);
            }
          }
        }
      }
    },
    [isPaused, isWon, isGameOver, screws, selectedHoleId, movesCount, maxMoves, fallenPlanks, holeMap, levelConfig.planks, checkVictory]
  );

  // Undo move
  const handleUndo = useCallback(() => {
    if (isPaused || undoStack.length === 0 || isWon) return;

    const last = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));

    setScrews(last.screwsSnapshot);
    setFallenPlanks(new Set(last.fallenSnapshot));
    setMovesCount(last.moves);
    setSelectedHoleId(null);
    setIsGameOver(false);
    setShowResultModal(false);

    playTapSound();
    triggerLightHaptic();
    juiceRef.current?.popup('↺ UNDO', 'Move reverted', COLORS.cyan);
  }, [isPaused, undoStack, isWon]);

  // Restart level
  const handleRestart = useCallback(() => {
    if (isPaused) return;
    initLevel(currentLevel);
    playTapSound();
    triggerLightHaptic();
    juiceRef.current?.popup('⚡ RESTART', `Level ${currentLevel} reset`, COLORS.solarGold);
  }, [isPaused, initLevel, currentLevel]);

  // Hint
  const handleHint = useCallback(() => {
    if (isPaused || isWon) return;

    // Find an active plank that has 1 screw left
    const activePlanks = levelConfig.planks.filter((p) => !fallenPlanks.has(p.id));
    if (activePlanks.length === 0) return;

    let targetPlank = activePlanks.find((p) => {
      const remaining = p.holes.filter((hId) => !!screws[hId]).length;
      return remaining === 1;
    });

    if (!targetPlank) {
      targetPlank = activePlanks.reduce((top, p) => (p.layer > top.layer ? p : top), activePlanks[0]);
    }

    const screwHole = targetPlank.holes.find((hId) => !!screws[hId]);
    if (screwHole) {
      setSelectedHoleId(screwHole);
      playTapSound();
      triggerMediumHaptic();
      juiceRef.current?.popup('💡 TACTICAL HINT', `Relocate screw from ${targetPlank.name}`, targetPlank.color);
    }
  }, [isPaused, isWon, levelConfig.planks, fallenPlanks, screws]);

  // Next level handler
  const handleNextLevel = useCallback(() => {
    const nextLvl = currentLevel + 1;
    setCurrentLevel(nextLvl);
    initLevel(nextLvl);
  }, [currentLevel, initLevel]);

  // Calculate remaining struts count
  const remainingCount = levelConfig.planks.length - fallenPlanks.size;

  return (
    <View style={styles.container}>
      <MiniGameHeader
        title="SCREW PUZZLE"
        floorLabel="FLOOR 32"
        category="PUZZLE"
        score={totalScore}
        bestScore={highScore}
        accentColor="#FFE600"
        onBackToHub={onBackToHub}
        onReset={handleRestart}
        disabled={isPaused}
      />

      <JuiceEngine ref={juiceRef}>
        {/* Subheader Status Strip */}
        <View style={styles.statusStrip}>
          <View style={styles.statusBadge}>
            <Text style={styles.levelLabel}>LVL {currentLevel}</Text>
            <Text style={styles.levelName}>{levelConfig.name}</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statDim}>MOVES LEFT</Text>
              <Text
                style={[
                  styles.statBright,
                  {
                    color:
                      movesLeft <= 1
                        ? '#FF0055'
                        : movesLeft <= 3
                          ? '#FFE600'
                          : '#00F5FF',
                  },
                ]}
              >
                {movesLeft} / {maxMoves}
              </Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statDim}>STRUTS</Text>
              <Text style={[styles.statBright, { color: '#00F5FF' }]}>
                {remainingCount}/{levelConfig.planks.length}
              </Text>
            </View>
          </View>
        </View>

        {/* Board Arena */}
        <View style={styles.boardWrapper}>
          <View style={styles.boardCard}>
            {/* SVG Visual Layer: Board, Spare Rack, Planks, Sockets, and Screws */}
            <Svg width={BOARD_W} height={BOARD_H} style={StyleSheet.absoluteFill}>
              <Defs>
                {/* Background Radial Gradient */}
                <SvgRadialGradient id="bgGrad" cx="50%" cy="50%" r="65%">
                  <Stop offset="0%" stopColor="#141829" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#080A14" stopOpacity="1" />
                </SvgRadialGradient>

                {/* Metallic Screw Head Radial Gradient */}
                <SvgRadialGradient id="screwCapGrad" cx="35%" cy="30%" r="60%">
                  <Stop offset="0%" stopColor="#4A5568" />
                  <Stop offset="65%" stopColor="#1A202C" />
                  <Stop offset="100%" stopColor="#0A0E18" />
                </SvgRadialGradient>
              </Defs>

              {/* Panel Base Plate */}
              <Rect
                x={4}
                y={4}
                width={BOARD_W - 8}
                height={BOARD_H - 8}
                rx={18}
                fill="url(#bgGrad)"
                stroke="#00F5FF33"
                strokeWidth={2}
              />

              {/* Cyber Decal Corners */}
              <Path d="M 10 30 L 10 10 L 30 10" stroke="#00F5FF" strokeWidth={2} fill="none" />
              <Path d={`M ${BOARD_W - 30} 10 L ${BOARD_W - 10} 10 L ${BOARD_W - 10} 30`} stroke="#00F5FF" strokeWidth={2} fill="none" />
              <Path d={`M 10 ${BOARD_H - 30} L 10 ${BOARD_H - 10} L 30 ${BOARD_H - 10}`} stroke="#00F5FF" strokeWidth={2} fill="none" />
              <Path d={`M ${BOARD_W - 30} ${BOARD_H - 10} L ${BOARD_W - 10} ${BOARD_H - 10} L ${BOARD_W - 10} ${BOARD_H - 30}`} stroke="#00F5FF" strokeWidth={2} fill="none" />

              {/* Top Spare Sockets Tray Header */}
              <Rect
                x={40}
                y={18}
                width={BOARD_W - 80}
                height={64}
                rx={12}
                fill="#0A0D1C"
                stroke="rgba(0, 245, 255, 0.25)"
                strokeWidth={1.5}
              />
              <Line x1={40} y1={82} x2={BOARD_W - 40} y2={82} stroke="#00F5FF22" strokeWidth={1} strokeDasharray="4 4" />

              {/* Base Sockets for All Holes (Spare Sockets + Board Holes) */}
              {allHoles.map((h) => {
                const hasBolt = !!screws[h.id];
                const isTarget = selectedHoleId != null && !hasBolt;

                return (
                  <G key={`socket_${h.id}`}>
                    {/* Socket Recessed Cavity */}
                    <Circle
                      cx={h.x}
                      cy={h.y}
                      r={18}
                      fill="#060812"
                      stroke={h.isSpare ? 'rgba(255, 230, 0, 0.45)' : 'rgba(0, 245, 255, 0.35)'}
                      strokeWidth={1.5}
                    />
                    <Circle cx={h.x} cy={h.y} r={12} fill="#020306" />

                    {/* Empty Socket Thread Details */}
                    {!hasBolt && !isTarget && (
                      <G opacity={0.35}>
                        <Line x1={h.x - 6} y1={h.y} x2={h.x + 6} y2={h.y} stroke="#00F5FF" strokeWidth={1} />
                        <Line x1={h.x} y1={h.y - 6} x2={h.x} y2={h.y + 6} stroke="#00F5FF" strokeWidth={1} />
                      </G>
                    )}

                    {/* Pulsing Target Ring when a screw is selected and this socket is free */}
                    {isTarget && (
                      <G>
                        <Circle
                          cx={h.x}
                          cy={h.y}
                          r={18}
                          fill="rgba(0, 245, 255, 0.16)"
                          stroke="#00F5FF"
                          strokeWidth={2}
                          strokeDasharray="5 3"
                        />
                        <Circle cx={h.x} cy={h.y} r={4.5} fill="#00F5FF" />
                      </G>
                    )}
                  </G>
                );
              })}

              {/* Layered Cyber Struts / Planks */}
              {levelConfig.planks
                .slice()
                .sort((a, b) => a.layer - b.layer)
                .map((plank) => {
                  if (fallenPlanks.has(plank.id)) return null;

                  const h1 = holeMap[plank.holes[0]];
                  const h2 = holeMap[plank.holes[1]];
                  if (!h1 || !h2) return null;

                  const hasS1 = !!screws[plank.holes[0]];
                  const hasS2 = !!screws[plank.holes[1]];

                  // Geometric calculations
                  const dx = h2.x - h1.x;
                  const dy = h2.y - h1.y;
                  const length = Math.sqrt(dx * dx + dy * dy);
                  const initialAngle = (Math.atan2(dy, dx) * 180) / Math.PI;

                  // Determine pivot and rotation based on remaining screws
                  let pivotX = h1.x;
                  let pivotY = h1.y;
                  let angle = initialAngle;

                  if (hasS1 && !hasS2) {
                    // Pinned ONLY at h1 -> h2 drops down under gravity
                    pivotX = h1.x;
                    pivotY = h1.y;
                    angle = initialAngle + (dx >= 0 ? 35 : -35);
                  } else if (!hasS1 && hasS2) {
                    // Pinned ONLY at h2 -> h1 drops down under gravity
                    pivotX = h2.x;
                    pivotY = h2.y;
                    const reverseAngle = (Math.atan2(-dy, -dx) * 180) / Math.PI;
                    angle = reverseAngle + (-dx >= 0 ? 35 : -35);
                  }

                  return (
                    <G
                      key={`plank_${plank.id}`}
                      transform={`translate(${pivotX}, ${pivotY}) rotate(${angle})`}
                    >
                      {/* Main Strut Capsule Body */}
                      <Rect
                        x={-18}
                        y={-17}
                        width={length + 36}
                        height={34}
                        rx={17}
                        fill="#0A0E1C"
                        stroke={plank.color}
                        strokeWidth={2.5}
                      />

                      {/* Center Energy Core Line */}
                      <Line
                        x1={16}
                        y1={0}
                        x2={length - 16}
                        y2={0}
                        stroke={plank.color}
                        strokeWidth={2}
                        strokeDasharray="6 4"
                        opacity={0.65}
                      />

                      {/* Grommet Cutout Holes at endpoints */}
                      <Circle cx={0} cy={0} r={13} fill="#050711" stroke={plank.color} strokeWidth={1.5} />
                      <Circle cx={length} cy={0} r={13} fill="#050711" stroke={plank.color} strokeWidth={1.5} />
                    </G>
                  );
                })}

              {/* Active Screws / Bolts */}
              {allHoles.map((h) => {
                const screw = screws[h.id];
                if (!screw) return null;

                const isSelected = selectedHoleId === h.id;
                const r = isSelected ? 19 : 16;

                return (
                  <G key={`bolt_${h.id}`}>
                    {/* Selected Glowing Halo */}
                    {isSelected && (
                      <Circle
                        cx={h.x}
                        cy={h.y}
                        r={25}
                        fill="none"
                        stroke="#FFE600"
                        strokeWidth={2}
                        strokeDasharray="5 3"
                      />
                    )}

                    {/* Screw Head Flange */}
                    <Circle
                      cx={h.x}
                      cy={h.y}
                      r={r}
                      fill="url(#screwCapGrad)"
                      stroke={isSelected ? '#FFE600' : screw.color}
                      strokeWidth={isSelected ? 2.8 : 2}
                    />

                    {/* Phillips Head Cross Cut */}
                    <Line
                      x1={h.x - (isSelected ? 10 : 8)}
                      y1={h.y}
                      x2={h.x + (isSelected ? 10 : 8)}
                      y2={h.y}
                      stroke={isSelected ? '#FFE600' : '#FFFFFF'}
                      strokeWidth={3}
                      strokeLinecap="round"
                    />
                    <Line
                      x1={h.x}
                      y1={h.y - (isSelected ? 10 : 8)}
                      x2={h.x}
                      y2={h.y + (isSelected ? 10 : 8)}
                      stroke={isSelected ? '#FFE600' : '#FFFFFF'}
                      strokeWidth={3}
                      strokeLinecap="round"
                    />

                    {/* Central Glowing Core */}
                    <Circle
                      cx={h.x}
                      cy={h.y}
                      r={isSelected ? 5 : 4}
                      fill={isSelected ? '#FFE600' : screw.color}
                    />
                  </G>
                );
              })}
            </Svg>

            {/* Direct Touch Targets Layer (Unobstructed, guaranteed high-precision mobile taps) */}
            {allHoles.map((hole) => (
              <Pressable
                key={`touch_${hole.id}`}
                style={[
                  styles.holeTouchTarget,
                  {
                    left: hole.x - 26,
                    top: hole.y - 26,
                  },
                ]}
                onPress={() => handleHolePress(hole.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              />
            ))}
          </View>
        </View>

        {/* Tactical Control Bar */}
        <View style={styles.controlsBar}>
          <Pressable
            style={[styles.actionBtn, undoStack.length === 0 && styles.btnDisabled]}
            onPress={handleUndo}
            disabled={undoStack.length === 0 || isPaused}
          >
            <Text style={styles.actionIcon}>↺</Text>
            <Text style={styles.actionText}>UNDO</Text>
          </Pressable>

          <Pressable style={styles.actionBtn} onPress={handleRestart} disabled={isPaused}>
            <Text style={styles.actionIcon}>⚡</Text>
            <Text style={styles.actionText}>RESTART</Text>
          </Pressable>

          <Pressable style={styles.actionBtn} onPress={handleHint} disabled={isPaused}>
            <Text style={styles.actionIcon}>💡</Text>
            <Text style={styles.actionText}>HINT</Text>
          </Pressable>
        </View>
      </JuiceEngine>

      {/* Victory / Next Level / Game Over Modal */}
      <GameResultModal
        visible={showResultModal}
        type={isWon ? 'VICTORY' : 'GAMEOVER'}
        title={isWon ? 'ALL STRUTS FREED!' : 'OUT OF MOVES!'}
        subtitle={
          isWon
            ? `Puzzle solved in ${movesCount} moves!`
            : `Exceeded the ${maxMoves}-move limit. Try a different strategy!`
        }
        score={totalScore}
        bestScore={highScore}
        accentColor={isWon ? '#FFE600' : '#FF0055'}
        buttonText={isWon ? 'NEXT LEVEL ▶' : 'TRY AGAIN ↺'}
        onRetry={isWon ? handleNextLevel : () => initLevel(currentLevel)}
        onBackToHub={onBackToHub}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05060D',
  },
  statusStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(8, 10, 20, 0.75)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 245, 255, 0.15)',
  },
  statusBadge: {
    flexDirection: 'column',
  },
  levelLabel: {
    fontFamily: monoFont,
    fontSize: 11,
    fontWeight: '900',
    color: '#FFE600',
    letterSpacing: 1.5,
  },
  levelName: {
    fontFamily: monoFont,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statBox: {
    alignItems: 'center',
  },
  statDim: {
    fontFamily: monoFont,
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 1,
  },
  statBright: {
    fontFamily: monoFont,
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  boardWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  boardCard: {
    width: BOARD_W,
    height: BOARD_H,
    position: 'relative',
    borderRadius: 18,
    shadowColor: '#00F5FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  holeTouchTarget: {
    position: 'absolute',
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  controlsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(8, 10, 20, 0.85)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 245, 255, 0.12)',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#12162A',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 245, 255, 0.35)',
  },
  btnDisabled: {
    opacity: 0.35,
  },
  actionIcon: {
    fontSize: 16,
    color: '#FFE600',
  },
  actionText: {
    fontFamily: monoFont,
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});
