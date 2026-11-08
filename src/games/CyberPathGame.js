import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, {
  Rect,
  Circle,
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  G,
} from 'react-native-svg';
import { COLORS } from '../../styles';
import MiniGameHeader from '../components/MiniGameHeader';
import JuiceEngine from '../components/JuiceEngine';
import GameResultModal from '../components/GameResultModal';
import {
  triggerLightHaptic,
  triggerMediumHaptic,
  triggerPerfectHaptic,
  triggerGameOverHaptic,
} from '../utils/haptics';
import {
  playTapSound,
  playPerfectSound,
  playSliceSound,
  playGameOverSound,
} from '../utils/sound';

const STORAGE_KEY = '@game_tower:best_pathfinder_v1';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

/**
 * Tile Types & Connection Port Definitions
 * Ports: [TOP, RIGHT, BOTTOM, LEFT]
 */
export const TILE_TYPES = {
  STRAIGHT_H: { id: 'STRAIGHT_H', label: 'STRAIGHT H', ports: [0, 1, 0, 1] },
  STRAIGHT_V: { id: 'STRAIGHT_V', label: 'STRAIGHT V', ports: [1, 0, 1, 0] },
  CURVE_TR: { id: 'CURVE_TR', label: 'CURVE TR', ports: [1, 1, 0, 0] },
  CURVE_RB: { id: 'CURVE_RB', label: 'CURVE RB', ports: [0, 1, 1, 0] },
  CURVE_BL: { id: 'CURVE_BL', label: 'CURVE BL', ports: [0, 0, 1, 1] },
  CURVE_LT: { id: 'CURVE_LT', label: 'CURVE LT', ports: [1, 0, 0, 1] },
  CROSS: { id: 'CROSS', label: 'CROSS 4-WAY', ports: [1, 1, 1, 1] },
};

export const ROTATION_MAP = {
  STRAIGHT_H: 'STRAIGHT_V',
  STRAIGHT_V: 'STRAIGHT_H',
  CURVE_TR: 'CURVE_RB',
  CURVE_RB: 'CURVE_BL',
  CURVE_BL: 'CURVE_LT',
  CURVE_LT: 'CURVE_TR',
  CROSS: 'CROSS',
};

/**
 * Hand-crafted levels escalating in grid size, obstacles, and conduit challenges.
 */
const CURATED_LEVELS = [
  // Level 1: 3x3 Tutorial (Straight & simple turn)
  {
    name: 'INITIAL CIRCUIT',
    cols: 3,
    rows: 3,
    entry: { col: -1, row: 1, dir: 'RIGHT' }, // Enters at (0, 1) from left
    exit: { col: 3, row: 1, dir: 'RIGHT' },   // Exits at (2, 1) to right
    obstacles: [],
    fixedTiles: {},
    tray: [
      { type: 'STRAIGHT_H', count: 3 },
    ],
    parMoves: 3,
  },
  // Level 2: 3x3 U-turn detour around central pillar
  {
    name: 'CORE DETOUR',
    cols: 3,
    rows: 3,
    entry: { col: -1, row: 0, dir: 'RIGHT' },
    exit: { col: 3, row: 2, dir: 'RIGHT' },
    obstacles: [{ col: 1, row: 1 }],
    fixedTiles: {},
    tray: [
      { type: 'CURVE_TR', count: 1 },
      { type: 'CURVE_RB', count: 1 },
      { type: 'CURVE_BL', count: 1 },
      { type: 'CURVE_LT', count: 1 },
      { type: 'STRAIGHT_H', count: 1 },
    ],
    parMoves: 5,
  },
  // Level 3: 4x4 S-Curve Pathway
  {
    name: 'SERPENTINE BUS',
    cols: 4,
    rows: 4,
    entry: { col: -1, row: 0, dir: 'RIGHT' },
    exit: { col: 4, row: 3, dir: 'RIGHT' },
    obstacles: [
      { col: 1, row: 1 },
      { col: 2, row: 2 },
    ],
    fixedTiles: {},
    tray: [
      { type: 'STRAIGHT_H', count: 3 },
      { type: 'STRAIGHT_V', count: 2 },
      { type: 'CURVE_RB', count: 2 },
      { type: 'CURVE_LT', count: 2 },
    ],
    parMoves: 7,
  },
  // Level 4: 4x4 Crossover Junction
  {
    name: 'CROSSOVER NODE',
    cols: 4,
    rows: 4,
    entry: { col: -1, row: 1, dir: 'RIGHT' },
    exit: { col: 4, row: 2, dir: 'RIGHT' },
    obstacles: [
      { col: 0, row: 3 },
      { col: 3, row: 0 },
    ],
    fixedTiles: {},
    tray: [
      { type: 'CROSS', count: 1 },
      { type: 'STRAIGHT_H', count: 2 },
      { type: 'CURVE_TR', count: 2 },
      { type: 'CURVE_BL', count: 2 },
      { type: 'STRAIGHT_V', count: 1 },
    ],
    parMoves: 8,
  },
  // Level 5: 4x4 Precision Weave
  {
    name: 'PRECISION WEAVE',
    cols: 4,
    rows: 4,
    entry: { col: -1, row: 2, dir: 'RIGHT' },
    exit: { col: 4, row: 0, dir: 'RIGHT' },
    obstacles: [
      { col: 1, row: 2 },
      { col: 2, row: 1 },
    ],
    fixedTiles: {
      '0_2': 'CURVE_LT',
    },
    tray: [
      { type: 'STRAIGHT_V', count: 2 },
      { type: 'STRAIGHT_H', count: 2 },
      { type: 'CURVE_TR', count: 2 },
      { type: 'CURVE_RB', count: 1 },
    ],
    parMoves: 8,
  },
  // Level 6: 5x5 Plasma Chamber
  {
    name: 'PLASMA ARTERY',
    cols: 5,
    rows: 5,
    entry: { col: -1, row: 0, dir: 'RIGHT' },
    exit: { col: 5, row: 4, dir: 'RIGHT' },
    obstacles: [
      { col: 2, row: 1 },
      { col: 1, row: 3 },
      { col: 3, row: 3 },
    ],
    fixedTiles: {},
    tray: [
      { type: 'STRAIGHT_H', count: 4 },
      { type: 'STRAIGHT_V', count: 3 },
      { type: 'CURVE_RB', count: 2 },
      { type: 'CURVE_BL', count: 2 },
      { type: 'CURVE_TR', count: 1 },
    ],
    parMoves: 10,
  },
  // Level 7: 5x5 Quantum Crossroads
  {
    name: 'QUANTUM CROSSROADS',
    cols: 5,
    rows: 5,
    entry: { col: -1, row: 2, dir: 'RIGHT' },
    exit: { col: 5, row: 2, dir: 'RIGHT' },
    obstacles: [
      { col: 2, row: 2 },
      { col: 1, row: 1 },
      { col: 3, row: 3 },
    ],
    fixedTiles: {},
    tray: [
      { type: 'CROSS', count: 1 },
      { type: 'CURVE_TR', count: 2 },
      { type: 'CURVE_RB', count: 2 },
      { type: 'CURVE_BL', count: 2 },
      { type: 'CURVE_LT', count: 2 },
      { type: 'STRAIGHT_H', count: 2 },
    ],
    parMoves: 12,
  },
  // Level 8: 5x5 Deep Transit
  {
    name: 'SUB-SECTOR TRANSIT',
    cols: 5,
    rows: 5,
    entry: { col: -1, row: 4, dir: 'RIGHT' },
    exit: { col: 5, row: 0, dir: 'RIGHT' },
    obstacles: [
      { col: 1, row: 4 },
      { col: 3, row: 2 },
      { col: 2, row: 0 },
    ],
    fixedTiles: {},
    tray: [
      { type: 'STRAIGHT_V', count: 4 },
      { type: 'STRAIGHT_H', count: 3 },
      { type: 'CURVE_TR', count: 2 },
      { type: 'CURVE_RB', count: 2 },
      { type: 'CURVE_LT', count: 1 },
    ],
    parMoves: 12,
  },
  // Level 9: 6x6 Apex Nexus
  {
    name: 'APEX NEXUS',
    cols: 6,
    rows: 6,
    entry: { col: -1, row: 1, dir: 'RIGHT' },
    exit: { col: 6, row: 4, dir: 'RIGHT' },
    obstacles: [
      { col: 2, row: 1 },
      { col: 3, row: 2 },
      { col: 1, row: 4 },
      { col: 4, row: 4 },
    ],
    fixedTiles: {},
    tray: [
      { type: 'STRAIGHT_H', count: 5 },
      { type: 'STRAIGHT_V', count: 4 },
      { type: 'CURVE_TR', count: 3 },
      { type: 'CURVE_RB', count: 3 },
      { type: 'CURVE_BL', count: 2 },
      { type: 'CURVE_LT', count: 2 },
    ],
    parMoves: 15,
  },
  // Level 10: 6x6 Master Circuit Labyrinth
  {
    name: 'CHRONO LABYRINTH',
    cols: 6,
    rows: 6,
    entry: { col: -1, row: 0, dir: 'RIGHT' },
    exit: { col: 6, row: 5, dir: 'RIGHT' },
    obstacles: [
      { col: 1, row: 1 },
      { col: 4, row: 1 },
      { col: 2, row: 3 },
      { col: 3, row: 4 },
    ],
    fixedTiles: {},
    tray: [
      { type: 'STRAIGHT_H', count: 6 },
      { type: 'STRAIGHT_V', count: 5 },
      { type: 'CURVE_TR', count: 3 },
      { type: 'CURVE_RB', count: 3 },
      { type: 'CURVE_BL', count: 3 },
      { type: 'CURVE_LT', count: 3 },
      { type: 'CROSS', count: 1 },
    ],
    parMoves: 18,
  },
];

/**
 * Procedural level generator for infinite levels (11+)
 */
function generateProceduralLevel(levelNum) {
  const size = Math.min(6, 4 + Math.floor((levelNum - 10) / 4));
  const entryRow = 1 + (levelNum % (size - 2));
  const exitRow = (size - 2) - (levelNum % (size - 2));

  const obstacles = [];
  const obstacleCount = Math.min(5, 2 + Math.floor((levelNum - 10) / 3));
  for (let i = 0; i < obstacleCount; i++) {
    const oc = 1 + (i * 2 + 1) % (size - 2);
    const or = 1 + (i * 2) % (size - 2);
    if (!(oc === 0 && or === entryRow) && !(oc === size - 1 && or === exitRow)) {
      obstacles.push({ col: oc, row: or });
    }
  }

  return {
    name: `CIRCUIT MATRIX - ${levelNum}`,
    cols: size,
    rows: size,
    entry: { col: -1, row: entryRow, dir: 'RIGHT' },
    exit: { col: size, row: exitRow, dir: 'RIGHT' },
    obstacles,
    fixedTiles: {},
    tray: [
      { type: 'STRAIGHT_H', count: size },
      { type: 'STRAIGHT_V', count: size - 1 },
      { type: 'CURVE_TR', count: 3 },
      { type: 'CURVE_RB', count: 3 },
      { type: 'CURVE_BL', count: 3 },
      { type: 'CURVE_LT', count: 3 },
      { type: 'CROSS', count: 1 },
    ],
    parMoves: 14 + levelNum * 2,
  };
}

/**
 * Traces if there is a valid connected conduit from Entry to Exit.
 * Returns { valid: boolean, pathNodes: Array<{col, row}>, failurePoint: {col, row} | null }
 */
function tracePath(level, grid) {
  const { cols, rows, entry, exit } = level;

  let curCol = 0;
  let curRow = entry.row;
  let fromDir = 'LEFT'; // Entered from left side

  const pathNodes = [];
  const visited = new Set();

  while (curCol >= 0 && curCol < cols && curRow >= 0 && curRow < rows) {
    const key = `${curCol}_${curRow}`;
    if (visited.has(key)) {
      // Loop detected
      return { valid: false, pathNodes, failurePoint: { col: curCol, row: curRow } };
    }
    visited.add(key);

    const tileType = grid[key];
    if (!tileType) {
      // Disconnected: Empty socket
      return { valid: false, pathNodes, failurePoint: { col: curCol, row: curRow } };
    }

    const tileDef = TILE_TYPES[tileType];
    if (!tileDef) {
      return { valid: false, pathNodes, failurePoint: { col: curCol, row: curRow } };
    }

    // Port index mapping: [TOP: 0, RIGHT: 1, BOTTOM: 2, LEFT: 3]
    const inPortIdx =
      fromDir === 'TOP'
        ? 0
        : fromDir === 'RIGHT'
          ? 1
          : fromDir === 'BOTTOM'
            ? 2
            : 3;

    if (tileDef.ports[inPortIdx] !== 1) {
      // The incoming edge doesn't connect to this tile!
      return { valid: false, pathNodes, failurePoint: { col: curCol, row: curRow } };
    }

    pathNodes.push({ col: curCol, row: curRow });

    // Determine outgoing direction
    let outDir = null;
    if (tileType === 'STRAIGHT_H') {
      outDir = fromDir === 'LEFT' ? 'RIGHT' : 'LEFT';
    } else if (tileType === 'STRAIGHT_V') {
      outDir = fromDir === 'TOP' ? 'BOTTOM' : 'TOP';
    } else if (tileType === 'CURVE_TR') {
      outDir = fromDir === 'TOP' ? 'RIGHT' : 'TOP';
    } else if (tileType === 'CURVE_RB') {
      outDir = fromDir === 'RIGHT' ? 'BOTTOM' : 'RIGHT';
    } else if (tileType === 'CURVE_BL') {
      outDir = fromDir === 'BOTTOM' ? 'LEFT' : 'BOTTOM';
    } else if (tileType === 'CURVE_LT') {
      outDir = fromDir === 'LEFT' ? 'TOP' : 'LEFT';
    } else if (tileType === 'CROSS') {
      outDir =
        fromDir === 'LEFT'
          ? 'RIGHT'
          : fromDir === 'RIGHT'
            ? 'LEFT'
            : fromDir === 'TOP'
              ? 'BOTTOM'
              : 'TOP';
    }

    if (!outDir) {
      return { valid: false, pathNodes, failurePoint: { col: curCol, row: curRow } };
    }

    // Step into next neighbor
    let nextCol = curCol;
    let nextRow = curRow;
    let nextFromDir = '';

    if (outDir === 'RIGHT') {
      nextCol = curCol + 1;
      nextFromDir = 'LEFT';
    } else if (outDir === 'LEFT') {
      nextCol = curCol - 1;
      nextFromDir = 'RIGHT';
    } else if (outDir === 'TOP') {
      nextRow = curRow - 1;
      nextFromDir = 'BOTTOM';
    } else if (outDir === 'BOTTOM') {
      nextRow = curRow + 1;
      nextFromDir = 'TOP';
    }

    // Did we reach the Exit Gate?
    if (nextCol === exit.col && nextRow === exit.row) {
      return { valid: true, pathNodes, failurePoint: null };
    }

    curCol = nextCol;
    curRow = nextRow;
    fromDir = nextFromDir;
  }

  return { valid: false, pathNodes, failurePoint: null };
}

export default function CyberPathGame({
  onBackToHub,
  onScoreUpdate,
  isPaused = false,
}) {
  const { width } = useWindowDimensions();
  const juiceRef = useRef(null);

  const [currentLevel, setCurrentLevel] = useState(1);
  const [highScore, setHighScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);

  // Level configuration
  const [levelConfig, setLevelConfig] = useState(() => CURATED_LEVELS[0]);
  const [grid, setGrid] = useState(() => ({ ...CURATED_LEVELS[0].fixedTiles }));
  const [trayPieces, setTrayPieces] = useState(() =>
    CURATED_LEVELS[0].tray.map((t) => ({ ...t }))
  );
  const [selectedTrayIndex, setSelectedTrayIndex] = useState(0);

  // Playback / testing state
  const [isSimulating, setIsSimulating] = useState(false);
  const [runnerIndex, setRunnerIndex] = useState(-1);
  const [activePathKeys, setActivePathKeys] = useState([]);
  const [movesCount, setMovesCount] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);

  // Load high score
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved !== null) {
          const val = parseInt(saved, 10);
          if (!isNaN(val)) setHighScore(val);
        }
      } catch {}
    })();
  }, []);

  // Initialize Level setup
  const initLevel = useCallback((lvlNum) => {
    setCurrentLevel(lvlNum);
    const cfg =
      lvlNum <= CURATED_LEVELS.length
        ? CURATED_LEVELS[lvlNum - 1]
        : generateProceduralLevel(lvlNum);

    setLevelConfig(cfg);

    // Initial grid with fixed tiles
    const initialGrid = { ...cfg.fixedTiles };
    setGrid(initialGrid);

    // Deep clone tray inventory
    const initialTray = cfg.tray.map((t) => ({ ...t }));
    setTrayPieces(initialTray);
    setSelectedTrayIndex(0);

    setMovesCount(0);
    setIsSimulating(false);
    setRunnerIndex(-1);
    setActivePathKeys([]);
  }, []);

  // Handle tap on grid cell
  const handleCellPress = useCallback(
    (col, row) => {
      if (isSimulating || isPaused) return;

      const key = `${col}_${row}`;

      // Check if this cell is an obstacle
      if (levelConfig.obstacles.some((o) => o.col === col && o.row === row)) {
        triggerLightHaptic();
        juiceRef.current?.flash('#FF0055');
        return;
      }

      // Check if it's a permanent fixed tile
      if (levelConfig.fixedTiles[key]) {
        triggerLightHaptic();
        return;
      }

      const existingTile = grid[key];

      if (existingTile) {
        // Tile already placed: Tap to ROTATE 90° clockwise!
        const nextRotated = ROTATION_MAP[existingTile];
        setGrid((prev) => ({ ...prev, [key]: nextRotated }));
        setMovesCount((m) => m + 1);
        playSliceSound();
        triggerMediumHaptic();
      } else {
        // Empty cell: Place selected piece from tray!
        const selItem = trayPieces[selectedTrayIndex];
        if (!selItem || selItem.count <= 0) {
          triggerLightHaptic();
          return;
        }

        // Place on grid
        setGrid((prev) => ({ ...prev, [key]: selItem.type }));

        // Deduct from tray inventory
        setTrayPieces((prev) => {
          const next = [...prev];
          next[selectedTrayIndex] = {
            ...next[selectedTrayIndex],
            count: next[selectedTrayIndex].count - 1,
          };
          return next;
        });

        setMovesCount((m) => m + 1);
        playTapSound();
        triggerLightHaptic();
      }
    },
    [
      isSimulating,
      isPaused,
      levelConfig,
      grid,
      trayPieces,
      selectedTrayIndex,
    ]
  );

  // Retract a placed tile back into tray inventory
  const handleRetractCell = useCallback(
    (col, row) => {
      if (isSimulating || isPaused) return;

      const key = `${col}_${row}`;
      if (levelConfig.fixedTiles[key]) return;

      const existingTile = grid[key];
      if (!existingTile) return;

      // Find matching base type in tray
      let baseType = existingTile;
      if (existingTile.startsWith('STRAIGHT_')) baseType = 'STRAIGHT_H';

      // Remove from grid
      setGrid((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });

      // Return count to tray
      setTrayPieces((prev) => {
        const next = [...prev];
        const matchIdx = next.findIndex(
          (t) => t.type === existingTile || t.type === baseType
        );
        if (matchIdx !== -1) {
          next[matchIdx] = { ...next[matchIdx], count: next[matchIdx].count + 1 };
        } else {
          next.push({ type: existingTile, count: 1 });
        }
        return next;
      });

      playTapSound();
      triggerLightHaptic();
    },
    [isSimulating, isPaused, levelConfig, grid]
  );

  // Test Run: Simulates the drone navigating the conduit path!
  const handleTestRun = useCallback(() => {
    if (isSimulating || isPaused) return;

    triggerMediumHaptic();
    playTapSound();

    const result = tracePath(levelConfig, grid);
    setIsSimulating(true);

    if (result.pathNodes.length === 0) {
      // Immediate block at entry
      setTimeout(() => {
        setIsSimulating(false);
        triggerGameOverHaptic();
        playGameOverSound();
        juiceRef.current?.flash('#FF0055');
        juiceRef.current?.popup(
          'PATH DISCONNECTED',
          'Align a conduit with the Entry Gate!',
          '#FF0055'
        );
      }, 400);
      return;
    }

    // Step-by-step animated transit
    let step = 0;
    const pathKeys = [];

    const interval = setInterval(() => {
      if (step < result.pathNodes.length) {
        const node = result.pathNodes[step];
        pathKeys.push(`${node.col}_${node.row}`);
        setActivePathKeys([...pathKeys]);
        setRunnerIndex(step);

        playSliceSound();
        triggerLightHaptic();
        step += 1;
      } else {
        clearInterval(interval);

        if (result.valid) {
          // SUCCESS! Reached Exit Portal!
          playPerfectSound();
          triggerPerfectHaptic();

          const earned = Math.max(
            120,
            currentLevel * 180 - Math.max(0, movesCount - levelConfig.parMoves) * 12
          );
          const nextScore = totalScore + earned;
          setTotalScore(nextScore);

          if (nextScore > highScore) {
            setHighScore(nextScore);
            AsyncStorage.setItem(STORAGE_KEY, String(nextScore)).catch(() => {});
          }
          onScoreUpdate?.(nextScore);

          juiceRef.current?.flash(COLORS.matrixMint);
          juiceRef.current?.burst(width / 2, 280, COLORS.matrixMint, 32);
          juiceRef.current?.popup(
            '⚡ CIRCUIT ONLINE!',
            `Level ${currentLevel} escaped in ${movesCount} moves!`,
            COLORS.matrixMint
          );

          setTimeout(() => {
            if (currentLevel < CURATED_LEVELS.length + 5) {
              initLevel(currentLevel + 1);
            } else {
              setModalVisible(true);
            }
          }, 1400);
        } else {
          // FAILURE: Blocked or disconnected inside circuit
          setIsSimulating(false);
          triggerGameOverHaptic();
          playGameOverSound();

          if (result.failurePoint) {
            juiceRef.current?.flash('#FF0055');
            juiceRef.current?.popup(
              '⚠️ CIRCUIT FAULT',
              'Conduit disconnected before reaching Exit!',
              '#FF0055'
            );
          }
        }
      }
    }, 280);
  }, [
    isSimulating,
    isPaused,
    levelConfig,
    grid,
    currentLevel,
    movesCount,
    totalScore,
    highScore,
    width,
    onScoreUpdate,
    initLevel,
  ]);

  // Reset current level
  const handleReset = useCallback(() => {
    triggerMediumHaptic();
    playTapSound();
    initLevel(currentLevel);
  }, [initLevel, currentLevel]);

  // Calculate cell sizing to dynamically fit arena perfectly
  const arenaPadding = 28;
  const availableWidth = width - arenaPadding * 2;
  const cellSize = Math.min(54, Math.floor(availableWidth / levelConfig.cols));
  const gridWidth = cellSize * levelConfig.cols;
  const gridHeight = cellSize * levelConfig.rows;

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={styles.container}>
        <MiniGameHeader
          title="CYBER PATHFINDER"
          score={totalScore}
          bestScore={highScore}
          onBackToHub={onBackToHub}
        />

      {/* Level Info Bar */}
      <View style={styles.telemetryBar}>
        <View style={styles.telemetryPill}>
          <Text style={styles.telemetryLabel}>CIRCUIT</Text>
          <Text style={[styles.telemetryVal, { color: COLORS.cyan }]}>
            {String(currentLevel).padStart(2, '0')}
          </Text>
        </View>

        <View style={styles.centerNameWrap}>
          <Text style={styles.levelTitle}>{levelConfig.name}</Text>
          <Text style={styles.levelSubtitle}>
            TAP CELL TO PLACE • TAP TO ROTATE • CONNECT EXIT
          </Text>
        </View>

        <View style={styles.telemetryPill}>
          <Text style={styles.telemetryLabel}>MOVES</Text>
          <Text style={[styles.telemetryVal, { color: COLORS.solarGold }]}>
            {movesCount}
          </Text>
        </View>
      </View>

      {/* Main Grid Chamber with Entry & Exit Terminals */}
      <View style={styles.gridOuterFrame}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* ENTRY PORTAL ON LEFT */}
          <View
            style={[
              styles.gateMarker,
              styles.gateEntry,
              { top: levelConfig.entry.row * cellSize + cellSize / 2 - 16 },
            ]}
          >
            <Text style={styles.gateIcon}>▶</Text>
            <Text style={styles.gateLabel}>ENTRY</Text>
          </View>

          {/* PUZZLE MATRIX SVG */}
          <View
            style={[
              styles.matrixBox,
              { width: gridWidth + 4, height: gridHeight + 4 },
            ]}
          >
            <Svg width={gridWidth} height={gridHeight}>
              <Defs>
                <SvgLinearGradient id="neonLaser" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor="#00F5FF" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#7928CA" stopOpacity="0.9" />
                </SvgLinearGradient>

                <SvgLinearGradient id="activeLaser" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor="#39FF14" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#00F5D4" stopOpacity="0.95" />
                </SvgLinearGradient>

                <SvgLinearGradient id="exitGlow" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor="#FFE600" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#FF0055" stopOpacity="0.9" />
                </SvgLinearGradient>
              </Defs>

              {/* Grid Background Plates */}
              {Array.from({ length: levelConfig.rows }).map((_, r) =>
                Array.from({ length: levelConfig.cols }).map((__, c) => {
                  const key = `${c}_${r}`;
                  const isObstacle = levelConfig.obstacles.some(
                    (o) => o.col === c && o.row === r
                  );

                  return (
                    <G key={`bg_${key}`}>
                      <Rect
                        x={c * cellSize + 1}
                        y={r * cellSize + 1}
                        width={cellSize - 2}
                        height={cellSize - 2}
                        rx={6}
                        fill={isObstacle ? '#140618' : '#0B091E'}
                        stroke={
                          isObstacle
                            ? 'rgba(255, 0, 85, 0.45)'
                            : 'rgba(0, 245, 255, 0.12)'
                        }
                        strokeWidth={1}
                      />

                      {/* Obstacle Icon */}
                      {isObstacle && (
                        <G>
                          <Circle
                            cx={c * cellSize + cellSize / 2}
                            cy={r * cellSize + cellSize / 2}
                            r={cellSize / 3.5}
                            fill="#FF0055"
                            opacity={0.35}
                          />
                          <Rect
                            x={c * cellSize + cellSize / 2 - 7}
                            y={r * cellSize + cellSize / 2 - 7}
                            width={14}
                            height={14}
                            rx={3}
                            fill="#FF0055"
                          />
                        </G>
                      )}

                      {/* Empty Socket Crosshair */}
                      {!isObstacle && !grid[key] && (
                        <G opacity={0.35}>
                          <Circle
                            cx={c * cellSize + cellSize / 2}
                            cy={r * cellSize + cellSize / 2}
                            r={3}
                            fill="#00F5FF"
                          />
                        </G>
                      )}
                    </G>
                  );
                })
              )}

              {/* Render Placed Conduit Pieces */}
              {Object.entries(grid).map(([key, tileType]) => {
                const [cStr, rStr] = key.split('_');
                const c = parseInt(cStr, 10);
                const r = parseInt(rStr, 10);
                const isActive = activePathKeys.includes(key);

                const cx = c * cellSize + cellSize / 2;
                const cy = r * cellSize + cellSize / 2;
                const half = cellSize / 2;

                const conduitColor = isActive ? '#39FF14' : '#00F5FF';

                return (
                  <G key={`tile_${key}`}>
                    {/* Render conduit geometry based on type */}
                    {tileType === 'STRAIGHT_H' && (
                      <G>
                        <Path
                          d={`M ${cx - half} ${cy} L ${cx + half} ${cy}`}
                          stroke="#150E35"
                          strokeWidth={14}
                          strokeLinecap="round"
                        />
                        <Path
                          d={`M ${cx - half} ${cy} L ${cx + half} ${cy}`}
                          stroke={conduitColor}
                          strokeWidth={6}
                        />
                        <Path
                          d={`M ${cx - half} ${cy} L ${cx + half} ${cy}`}
                          stroke="#FFFFFF"
                          strokeWidth={2}
                        />
                      </G>
                    )}

                    {tileType === 'STRAIGHT_V' && (
                      <G>
                        <Path
                          d={`M ${cx} ${cy - half} L ${cx} ${cy + half}`}
                          stroke="#150E35"
                          strokeWidth={14}
                          strokeLinecap="round"
                        />
                        <Path
                          d={`M ${cx} ${cy - half} L ${cx} ${cy + half}`}
                          stroke={conduitColor}
                          strokeWidth={6}
                        />
                        <Path
                          d={`M ${cx} ${cy - half} L ${cx} ${cy + half}`}
                          stroke="#FFFFFF"
                          strokeWidth={2}
                        />
                      </G>
                    )}

                    {tileType === 'CURVE_TR' && (
                      <G>
                        <Path
                          d={`M ${cx} ${cy - half} Q ${cx} ${cy} ${cx + half} ${cy}`}
                          stroke="#150E35"
                          strokeWidth={14}
                          strokeLinecap="round"
                          fill="none"
                        />
                        <Path
                          d={`M ${cx} ${cy - half} Q ${cx} ${cy} ${cx + half} ${cy}`}
                          stroke={conduitColor}
                          strokeWidth={6}
                          fill="none"
                        />
                        <Path
                          d={`M ${cx} ${cy - half} Q ${cx} ${cy} ${cx + half} ${cy}`}
                          stroke="#FFFFFF"
                          strokeWidth={2}
                          fill="none"
                        />
                      </G>
                    )}

                    {tileType === 'CURVE_RB' && (
                      <G>
                        <Path
                          d={`M ${cx + half} ${cy} Q ${cx} ${cy} ${cx} ${cy + half}`}
                          stroke="#150E35"
                          strokeWidth={14}
                          strokeLinecap="round"
                          fill="none"
                        />
                        <Path
                          d={`M ${cx + half} ${cy} Q ${cx} ${cy} ${cx} ${cy + half}`}
                          stroke={conduitColor}
                          strokeWidth={6}
                          fill="none"
                        />
                        <Path
                          d={`M ${cx + half} ${cy} Q ${cx} ${cy} ${cx} ${cy + half}`}
                          stroke="#FFFFFF"
                          strokeWidth={2}
                          fill="none"
                        />
                      </G>
                    )}

                    {tileType === 'CURVE_BL' && (
                      <G>
                        <Path
                          d={`M ${cx} ${cy + half} Q ${cx} ${cy} ${cx - half} ${cy}`}
                          stroke="#150E35"
                          strokeWidth={14}
                          strokeLinecap="round"
                          fill="none"
                        />
                        <Path
                          d={`M ${cx} ${cy + half} Q ${cx} ${cy} ${cx - half} ${cy}`}
                          stroke={conduitColor}
                          strokeWidth={6}
                          fill="none"
                        />
                        <Path
                          d={`M ${cx} ${cy + half} Q ${cx} ${cy} ${cx - half} ${cy}`}
                          stroke="#FFFFFF"
                          strokeWidth={2}
                          fill="none"
                        />
                      </G>
                    )}

                    {tileType === 'CURVE_LT' && (
                      <G>
                        <Path
                          d={`M ${cx - half} ${cy} Q ${cx} ${cy} ${cx} ${cy - half}`}
                          stroke="#150E35"
                          strokeWidth={14}
                          strokeLinecap="round"
                          fill="none"
                        />
                        <Path
                          d={`M ${cx - half} ${cy} Q ${cx} ${cy} ${cx} ${cy - half}`}
                          stroke={conduitColor}
                          strokeWidth={6}
                          fill="none"
                        />
                        <Path
                          d={`M ${cx - half} ${cy} Q ${cx} ${cy} ${cx} ${cy - half}`}
                          stroke="#FFFFFF"
                          strokeWidth={2}
                          fill="none"
                        />
                      </G>
                    )}

                    {tileType === 'CROSS' && (
                      <G>
                        {/* 4-way Crossroad */}
                        <Path
                          d={`M ${cx - half} ${cy} L ${cx + half} ${cy}`}
                          stroke="#150E35"
                          strokeWidth={14}
                        />
                        <Path
                          d={`M ${cx} ${cy - half} L ${cx} ${cy + half}`}
                          stroke="#150E35"
                          strokeWidth={14}
                        />
                        <Path
                          d={`M ${cx - half} ${cy} L ${cx + half} ${cy}`}
                          stroke={conduitColor}
                          strokeWidth={6}
                        />
                        <Path
                          d={`M ${cx} ${cy - half} L ${cx} ${cy + half}`}
                          stroke={conduitColor}
                          strokeWidth={6}
                        />
                        <Circle cx={cx} cy={cy} r={3.5} fill="#FFFFFF" />
                      </G>
                    )}

                    {/* Central Junction Hub Indicator */}
                    <Circle
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill={isActive ? '#39FF14' : '#FFE600'}
                    />
                  </G>
                );
              })}

              {/* Animated Drone Runner while simulating path */}
              {isSimulating && runnerIndex >= 0 && activePathKeys[runnerIndex] && (
                (() => {
                  const [cStr, rStr] = activePathKeys[runnerIndex].split('_');
                  const rc = parseInt(cStr, 10);
                  const rr = parseInt(rStr, 10);
                  const rx = rc * cellSize + cellSize / 2;
                  const ry = rr * cellSize + cellSize / 2;

                  return (
                    <G>
                      <Circle cx={rx} cy={ry} r={14} fill="rgba(57, 255, 20, 0.35)" />
                      <Circle cx={rx} cy={ry} r={8} fill="#39FF14" stroke="#FFFFFF" strokeWidth={2} />
                      <Circle cx={rx} cy={ry} r={3} fill="#030208" />
                    </G>
                  );
                })()
              )}
            </Svg>

            {/* Clickable Overlay Matrix for Touch Interaction */}
            <View
              style={[
                StyleSheet.absoluteFillObject,
                { flexDirection: 'column' },
              ]}
            >
              {Array.from({ length: levelConfig.rows }).map((_, r) => (
                <View
                  key={`row_${r}`}
                  style={{ flexDirection: 'row', height: cellSize }}
                >
                  {Array.from({ length: levelConfig.cols }).map((__, c) => (
                    <Pressable
                      key={`touch_${c}_${r}`}
                      onPress={() => handleCellPress(c, r)}
                      onLongPress={() => handleRetractCell(c, r)}
                      style={{
                        width: cellSize,
                        height: cellSize,
                      }}
                    />
                  ))}
                </View>
              ))}
            </View>
          </View>

          {/* EXIT RECEPTOR GATE ON RIGHT */}
          <View
            style={[
              styles.gateMarker,
              styles.gateExit,
              { top: levelConfig.exit.row * cellSize + cellSize / 2 - 16 },
            ]}
          >
            <Text style={styles.gateIcon}>🚪</Text>
            <Text style={styles.gateLabel}>EXIT</Text>
          </View>
        </View>
      </View>

      {/* Blueprint Conduit Tray & Action Dashboard */}
      <View style={styles.dashboardContainer}>
        <Text style={styles.trayHeader}>SELECT CONDUIT BLUEPRINT (TAP CELL TO PLACE/ROTATE)</Text>

        {/* Conduit Inventory Tray */}
        <View style={styles.trayScroll}>
          {trayPieces.map((item, idx) => {
            const isSelected = selectedTrayIndex === idx;
            const isExhausted = item.count <= 0;

            return (
              <Pressable
                key={item.type}
                onPress={() => {
                  setSelectedTrayIndex(idx);
                  triggerLightHaptic();
                  playTapSound();
                }}
                style={[
                  styles.trayCard,
                  isSelected && styles.trayCardSelected,
                  isExhausted && styles.trayCardExhausted,
                ]}
              >
                {/* Count Badge */}
                <View
                  style={[
                    styles.countPill,
                    isSelected && { backgroundColor: COLORS.cyan },
                  ]}
                >
                  <Text
                    style={[
                      styles.countText,
                      isSelected && { color: '#030208' },
                    ]}
                  >
                    ×{item.count}
                  </Text>
                </View>

                {/* Mini SVG Preview */}
                <Svg width={36} height={36}>
                  <Rect
                    x={2}
                    y={2}
                    width={32}
                    height={32}
                    rx={6}
                    fill="#100C2A"
                    stroke={isSelected ? '#00F5FF' : 'rgba(255, 255, 255, 0.2)'}
                    strokeWidth={1}
                  />
                  {item.type.includes('STRAIGHT_H') && (
                    <Path
                      d="M 4 18 L 32 18"
                      stroke={isSelected ? '#00F5FF' : '#CBD5E1'}
                      strokeWidth={4}
                    />
                  )}
                  {item.type.includes('STRAIGHT_V') && (
                    <Path
                      d="M 18 4 L 18 32"
                      stroke={isSelected ? '#00F5FF' : '#CBD5E1'}
                      strokeWidth={4}
                    />
                  )}
                  {item.type.includes('CURVE') && (
                    <Path
                      d="M 8 18 Q 18 18 18 8"
                      stroke={isSelected ? '#00F5FF' : '#CBD5E1'}
                      strokeWidth={4}
                      fill="none"
                    />
                  )}
                  {item.type.includes('CROSS') && (
                    <G>
                      <Path
                        d="M 4 18 L 32 18"
                        stroke={isSelected ? '#00F5FF' : '#CBD5E1'}
                        strokeWidth={3}
                      />
                      <Path
                        d="M 18 4 L 18 32"
                        stroke={isSelected ? '#00F5FF' : '#CBD5E1'}
                        strokeWidth={3}
                      />
                    </G>
                  )}
                </Svg>
              </Pressable>
            );
          })}
        </View>

        {/* Master Control Buttons */}
        <View style={styles.actionRow}>
          <Pressable
            onPress={handleReset}
            disabled={isSimulating}
            style={({ pressed }) => [
              styles.resetBtn,
              pressed && { transform: [{ scale: 0.95 }] },
            ]}
          >
            <Text style={styles.resetBtnText}>↺ RESET</Text>
          </Pressable>

          <Pressable
            onPress={handleTestRun}
            disabled={isSimulating}
            style={({ pressed }) => [
              styles.launchBtn,
              isSimulating && { opacity: 0.6 },
              pressed && { transform: [{ scale: 0.96 }] },
            ]}
          >
            <Text style={styles.launchBtnText}>
              {isSimulating ? 'TRANSMITTING...' : '⚡ LAUNCH OPERATIVE ▶'}
            </Text>
          </Pressable>
        </View>
      </View>

        <GameResultModal
          visible={modalVisible}
          type="victory"
          score={totalScore}
          level={currentLevel}
          onRetry={() => initLevel(1)}
          onBackToHub={onBackToHub}
          buttonText="RE-RUN CIRCUITS"
          subtitle={`ALL ${CURATED_LEVELS.length} PATHFINDER SECTORS CLEARED!`}
        />
      </View>
    </JuiceEngine>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030208',
  },
  telemetryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(12, 10, 28, 0.92)',
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(0, 245, 255, 0.3)',
  },
  telemetryPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 245, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.25)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 54,
  },
  telemetryLabel: {
    fontSize: 8,
    fontFamily: monoFont,
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
  },
  telemetryVal: {
    fontSize: 14,
    fontFamily: monoFont,
    fontWeight: '900',
  },
  centerNameWrap: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  levelTitle: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  levelSubtitle: {
    fontSize: 7.5,
    fontFamily: monoFont,
    color: COLORS.cyan,
    letterSpacing: 0.6,
    marginTop: 2,
    textAlign: 'center',
  },
  gridOuterFrame: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    position: 'relative',
  },
  matrixBox: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#00F5FF',
    backgroundColor: 'rgba(6, 4, 18, 0.96)',
    shadowColor: '#00F5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  gateMarker: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
  gateEntry: {
    left: -22,
  },
  gateExit: {
    right: -22,
  },
  gateIcon: {
    fontSize: 16,
    color: '#39FF14',
  },
  gateLabel: {
    fontSize: 7,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#39FF14',
    letterSpacing: 0.5,
  },
  dashboardContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    backgroundColor: 'rgba(8, 6, 22, 0.95)',
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(0, 245, 255, 0.25)',
  },
  trayHeader: {
    fontSize: 8.5,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    marginVertical: 8,
    textAlign: 'center',
  },
  trayScroll: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  trayCard: {
    padding: 4,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(16, 12, 36, 0.9)',
    alignItems: 'center',
  },
  trayCardSelected: {
    borderColor: '#00F5FF',
    shadowColor: '#00F5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
    backgroundColor: 'rgba(0, 245, 255, 0.12)',
  },
  trayCardExhausted: {
    opacity: 0.35,
  },
  countPill: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    zIndex: 2,
  },
  countText: {
    fontSize: 8,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 0, 85, 0.5)',
    backgroundColor: 'rgba(255, 0, 85, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtnText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#FF0055',
    letterSpacing: 1,
  },
  launchBtn: {
    flex: 2.5,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#00F5D4',
    backgroundColor: '#00F5D4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00F5D4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
  },
  launchBtnText: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#030208',
    letterSpacing: 1.2,
  },
});
