import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, {
  Rect,
  Circle,
  Path,
  G,
  Polygon,
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
} from '../utils/haptics';
import {
  playTapSound,
  playPerfectSound,
  playSliceSound,
  playSnapTickSound,
} from '../utils/sound';

const STORAGE_KEY = '@game_tower:best_pathfinder_v1';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

// Grid Dimensions: Exactly 24 Boxes (4 columns x 6 rows)
const GRID_COLS = 4;
const GRID_ROWS = 6;
const TILE_SIZE = 48;
const TILE_GAP = 3;

const TILE_POOL = [
  'STRAIGHT_H',
  'STRAIGHT_V',
  'CURVE_TR',
  'CURVE_RB',
  'CURVE_BL',
  'CURVE_LT',
  'CROSS',
];

/**
 * Tile Path Definitions matching the Forest / Cyber Tileset reference image
 * Ports define available exits: { top, right, bottom, left }
 */
const TILE_DEFS = {
  STRAIGHT_H: {
    id: 'STRAIGHT_H',
    name: 'HORIZONTAL',
    ports: { left: true, right: true },
  },
  STRAIGHT_V: {
    id: 'STRAIGHT_V',
    name: 'VERTICAL',
    ports: { top: true, bottom: true },
  },
  CURVE_TR: {
    id: 'CURVE_TR',
    name: 'TOP-RIGHT',
    ports: { top: true, right: true },
  },
  CURVE_RB: {
    id: 'CURVE_RB',
    name: 'RIGHT-DOWN',
    ports: { right: true, bottom: true },
  },
  CURVE_BL: {
    id: 'CURVE_BL',
    name: 'DOWN-LEFT',
    ports: { bottom: true, left: true },
  },
  CURVE_LT: {
    id: 'CURVE_LT',
    name: 'LEFT-TOP',
    ports: { left: true, top: true },
  },
  CROSS: {
    id: 'CROSS',
    name: 'CROSSWAY',
    ports: { top: true, right: true, bottom: true, left: true },
  },
};

/**
 * Helper to build rich tray inventories containing the required path tiles
 * plus ample filler tiles so player can fill all 24 grid boxes!
 */
const makeTray = (primaryList, count = 12, prefix = 't') => {
  const result = primaryList.map((type, idx) => ({ id: `${prefix}_${idx}`, type }));
  const fillers = ['STRAIGHT_H', 'STRAIGHT_V', 'CURVE_TR', 'CURVE_RB', 'CURVE_BL', 'CURVE_LT', 'CROSS'];
  let fIdx = 0;
  while (result.length < count) {
    result.push({
      id: `${prefix}_fill_${result.length}`,
      type: fillers[fIdx % fillers.length],
    });
    fIdx++;
  }
  return result;
};

/**
 * Ensures dock never runs dry by replenishing when low
 */
const getRefilledTray = (currentTray, prefix) => {
  if (currentTray.length >= 4) return currentTray;
  const needed = 4 - currentTray.length;
  const newTiles = [];
  for (let i = 0; i < needed; i++) {
    const randomType = TILE_POOL[Math.floor(Math.random() * TILE_POOL.length)];
    newTiles.push({
      id: `${prefix}_gen_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: randomType,
    });
  }
  return [...currentTray, ...newTiles];
};

/**
 * 8 Curated Escalating Levels of 24-box Puzzles
 * Entry and Exit are positioned OUTSIDE the 4x6 grid:
 * Entry is on the LEFT outside col 0, Exit is on the RIGHT outside col 3.
 * Left and Right docks hold ample tiles to fill all 24 boxes!
 */
const CURATED_LEVELS = [
  // Level 1: Direct Meadow Route (Row 1)
  {
    name: 'MEADOW TRAIL',
    start: { col: 0, row: 1, dir: 'right' },
    exit: { col: 3, row: 1, dir: 'right' },
    scenery: [
      { col: 1, row: 3, type: 'POND' },
      { col: 2, row: 4, type: 'TREES' },
    ],
    leftTray: makeTray(['STRAIGHT_H', 'STRAIGHT_H', 'CURVE_RB', 'STRAIGHT_V', 'CROSS'], 12, 'lt1'),
    rightTray: makeTray(['STRAIGHT_H', 'CURVE_BL', 'STRAIGHT_V', 'CURVE_TR', 'CROSS'], 12, 'rt1'),
  },

  // Level 2: Gentle Detour around Pond
  {
    name: 'POND DETOUR',
    start: { col: 0, row: 0, dir: 'right' },
    exit: { col: 3, row: 2, dir: 'right' },
    scenery: [
      { col: 1, row: 0, type: 'ROCKS' },
      { col: 1, row: 1, type: 'POND' },
      { col: 2, row: 3, type: 'TREES' },
    ],
    leftTray: makeTray(['CURVE_RB', 'STRAIGHT_V', 'CURVE_TR', 'STRAIGHT_H', 'CROSS'], 12, 'lt2'),
    rightTray: makeTray(['STRAIGHT_H', 'STRAIGHT_H', 'CURVE_BL', 'STRAIGHT_V', 'CROSS'], 12, 'rt2'),
  },

  // Level 3: Serpentine Brook
  {
    name: 'SERPENTINE BROOK',
    start: { col: 0, row: 0, dir: 'right' },
    exit: { col: 3, row: 4, dir: 'right' },
    scenery: [
      { col: 1, row: 1, type: 'POND' },
      { col: 2, row: 2, type: 'TREES' },
      { col: 1, row: 3, type: 'ROCKS' },
    ],
    leftTray: makeTray(['CURVE_RB', 'STRAIGHT_V', 'STRAIGHT_V', 'CURVE_TR', 'STRAIGHT_H'], 12, 'lt3'),
    rightTray: makeTray(['STRAIGHT_V', 'STRAIGHT_H', 'STRAIGHT_H', 'CURVE_BL', 'CROSS'], 12, 'rt3'),
  },

  // Level 4: Twin Groves
  {
    name: 'TWIN GROVES',
    start: { col: 0, row: 5, dir: 'right' },
    exit: { col: 3, row: 1, dir: 'right' },
    scenery: [
      { col: 1, row: 2, type: 'TREES' },
      { col: 2, row: 2, type: 'TREES' },
      { col: 1, row: 4, type: 'POND' },
    ],
    leftTray: makeTray(['CURVE_TR', 'STRAIGHT_V', 'STRAIGHT_V', 'CURVE_RB', 'STRAIGHT_H'], 12, 'lt4'),
    rightTray: makeTray(['STRAIGHT_V', 'STRAIGHT_H', 'STRAIGHT_H', 'CURVE_BL', 'CROSS'], 12, 'rt4'),
  },

  // Level 5: Boulder Canyon
  {
    name: 'BOULDER CANYON',
    start: { col: 0, row: 1, dir: 'right' },
    exit: { col: 3, row: 4, dir: 'right' },
    scenery: [
      { col: 1, row: 2, type: 'ROCKS' },
      { col: 2, row: 3, type: 'ROCKS' },
      { col: 0, row: 4, type: 'POND' },
    ],
    leftTray: makeTray(['CURVE_RB', 'CURVE_BL', 'STRAIGHT_V', 'CURVE_TR', 'STRAIGHT_H'], 12, 'lt5'),
    rightTray: makeTray(['CURVE_BL', 'STRAIGHT_V', 'CURVE_LT', 'CURVE_RB', 'CROSS'], 12, 'rt5'),
  },

  // Level 6: Emerald Crossroads
  {
    name: 'EMERALD CROSSROADS',
    start: { col: 0, row: 2, dir: 'right' },
    exit: { col: 3, row: 3, dir: 'right' },
    scenery: [
      { col: 1, row: 1, type: 'TREES' },
      { col: 2, row: 4, type: 'POND' },
      { col: 0, row: 5, type: 'ROCKS' },
    ],
    leftTray: makeTray(['STRAIGHT_H', 'STRAIGHT_H', 'CURVE_BL', 'CURVE_TR', 'CROSS'], 12, 'lt6'),
    rightTray: makeTray(['CROSS', 'STRAIGHT_V', 'CURVE_LT', 'CURVE_RB', 'STRAIGHT_H'], 12, 'rt6'),
  },

  // Level 7: Enchanted Glade
  {
    name: 'ENCHANTED GLADE',
    start: { col: 0, row: 1, dir: 'right' },
    exit: { col: 3, row: 5, dir: 'right' },
    scenery: [
      { col: 2, row: 1, type: 'POND' },
      { col: 1, row: 3, type: 'TREES' },
      { col: 2, row: 3, type: 'ROCKS' },
    ],
    leftTray: makeTray(['CURVE_RB', 'STRAIGHT_V', 'STRAIGHT_V', 'CURVE_TR', 'CROSS'], 12, 'lt7'),
    rightTray: makeTray(['STRAIGHT_V', 'STRAIGHT_H', 'STRAIGHT_H', 'CURVE_BL', 'STRAIGHT_V'], 12, 'rt7'),
  },

  // Level 8: Apex Valley
  {
    name: 'APEX VALLEY',
    start: { col: 0, row: 0, dir: 'right' },
    exit: { col: 3, row: 5, dir: 'right' },
    scenery: [
      { col: 1, row: 1, type: 'TREES' },
      { col: 2, row: 2, type: 'POND' },
      { col: 1, row: 4, type: 'ROCKS' },
    ],
    leftTray: makeTray(['CURVE_RB', 'STRAIGHT_V', 'STRAIGHT_V', 'CURVE_TR', 'STRAIGHT_H'], 12, 'lt8'),
    rightTray: makeTray(['STRAIGHT_V', 'STRAIGHT_V', 'STRAIGHT_H', 'STRAIGHT_H', 'CURVE_BL'], 12, 'rt8'),
  },
];

/**
 * Procedural Endless Level Generator (for Level 9+)
 */
function generateProceduralLevel(lvl) {
  const sRow = lvl % 5;
  const eRow = (lvl + 2) % 6;
  return {
    name: `ENDLESS GLADE // LVL ${lvl}`,
    start: { col: 0, row: sRow, dir: 'right' },
    exit: { col: 3, row: eRow, dir: 'right' },
    scenery: [
      { col: 1, row: 2, type: 'POND' },
      { col: 2, row: 3, type: 'TREES' },
    ],
    leftTray: makeTray(['CURVE_RB', 'STRAIGHT_H', 'CURVE_BL', 'CURVE_TR'], 12, `p_lt_${lvl}`),
    rightTray: makeTray(['STRAIGHT_V', 'CURVE_LT', 'STRAIGHT_H', 'CURVE_RB'], 12, `p_rt_${lvl}`),
  };
}

/**
 * Intelligent Pathfinding Validator:
 * Traces continuous connected path from External Start (outside col 0)
 * to External Exit (outside col 3), checking port connectivity.
 */
function validatePath(grid, start, exit) {
  const OPPOSITE_PORT = {
    right: 'left',
    left: 'right',
    bottom: 'top',
    top: 'bottom',
  };

  const startKey = `${start.col}_${start.row}`;
  const startTile = grid[startKey];
  const requiredEntryPort = OPPOSITE_PORT[start.dir] || 'left';

  // Entry grid cell has no tile placed yet
  if (!startTile) {
    return {
      isValid: false,
      steps: [],
      nextNeeded: { col: start.col, row: start.row },
    };
  }

  const startDef = TILE_DEFS[startTile];
  if (!startDef || !startDef.ports[requiredEntryPort]) {
    // Placed tile doesn't connect to entrance
    return {
      isValid: false,
      steps: [],
      nextNeeded: { col: start.col, row: start.row },
    };
  }

  let bestResult = {
    isValid: false,
    steps: [{ col: start.col, row: start.row }],
    nextNeeded: null,
  };

  const portDirs = Object.keys(startDef.ports).filter(
    (p) => p !== requiredEntryPort && startDef.ports[p]
  );

  for (const outDir of portDirs) {
    let curCol = start.col;
    let curRow = start.row;
    let inDir = outDir;
    const steps = [{ col: curCol, row: curRow }];
    const visited = new Set([startKey]);
    let nextNeeded = null;
    let reached = false;

    // Check if start tile itself connects directly to exit
    if (
      curCol === exit.col &&
      curRow === exit.row &&
      startDef.ports[exit.dir || 'right']
    ) {
      return { isValid: true, steps, nextNeeded: null };
    }

    for (let s = 0; s < 24; s++) {
      const nextCol = curCol + (inDir === 'right' ? 1 : inDir === 'left' ? -1 : 0);
      const nextRow = curRow + (inDir === 'bottom' ? 1 : inDir === 'top' ? -1 : 0);

      if (nextCol < 0 || nextCol >= GRID_COLS || nextRow < 0 || nextRow >= GRID_ROWS) break;

      const nextKey = `${nextCol}_${nextRow}`;
      if (visited.has(nextKey)) break;

      const nextTile = grid[nextKey];
      if (!nextTile) {
        nextNeeded = { col: nextCol, row: nextRow };
        break;
      }

      const nDef = TILE_DEFS[nextTile];
      const reqPort = OPPOSITE_PORT[inDir];
      if (!nDef.ports[reqPort]) break;

      steps.push({ col: nextCol, row: nextRow });
      visited.add(nextKey);

      // Check if this step is the exit cell AND it has an open port exiting to the outside!
      if (nextCol === exit.col && nextRow === exit.row && nDef.ports[exit.dir || 'right']) {
        reached = true;
        break;
      }

      const exits = Object.keys(nDef.ports).filter((p) => p !== reqPort && nDef.ports[p]);
      if (exits.length === 0) break;
      curCol = nextCol;
      curRow = nextRow;
      inDir = exits[0];
    }

    if (reached) {
      return { isValid: true, steps, nextNeeded: null };
    }
    if (steps.length > bestResult.steps.length) {
      bestResult = { isValid: false, steps, nextNeeded };
    }
  }

  return bestResult;
}

/**
 * Beautiful SVG Tile Graphic Renderer
 * Faithfully matches the Forest Tileset cartoon reference image!
 * Shows live glowing active road when part of the connected trail!
 */
function TileGraphic({ type, size = TILE_SIZE, isGhost = false, isConnected = false }) {
  const half = size / 2;

  // Render Scenery
  if (type === 'POND') {
    return (
      <Svg width={size} height={size}>
        {/* Grass Base */}
        <Rect x={1} y={1} width={size - 2} height={size - 2} rx={9} fill="#2E7D32" stroke="#1B4D20" strokeWidth={1.5} />
        {/* Water Pond */}
        <Path
          d={`M ${half - 14} ${half - 6} Q ${half} ${half - 16} ${half + 14} ${half - 8} Q ${half + 18} ${half + 8} ${half + 10} ${half + 14} Q ${half - 6} ${half + 16} ${half - 14} ${half + 6} Z`}
          fill="#4FC3F7"
          stroke="#0288D1"
          strokeWidth={1.5}
        />
        {/* White water ripple */}
        <Path d={`M ${half - 6} ${half - 4} Q ${half} ${half - 8} ${half + 6} ${half - 4}`} stroke="#FFFFFF" strokeWidth={1.2} fill="none" opacity={0.7} />
        {/* Shore pebbles */}
        <Circle cx={half - 12} cy={half + 12} r={2.5} fill="#B0BEC5" />
        <Circle cx={half + 12} cy={half + 12} r={3} fill="#90A4AE" />
      </Svg>
    );
  }

  if (type === 'TREES') {
    return (
      <Svg width={size} height={size}>
        <Rect x={1} y={1} width={size - 2} height={size - 2} rx={9} fill="#2E7D32" stroke="#1B4D20" strokeWidth={1.5} />
        {/* Left Tree */}
        <Rect x={half - 14} y={half + 2} width={5} height={10} fill="#5D4037" rx={1} />
        <Polygon points={`${half - 12},${half - 14} ${half - 3},${half + 4} ${half - 21},${half + 4}`} fill="#1B5E20" />
        <Polygon points={`${half - 12},${half - 10} ${half - 5},${half + 4} ${half - 19},${half + 4}`} fill="#388E3C" />
        {/* Right Tree */}
        <Rect x={half + 8} y={half + 4} width={5} height={10} fill="#5D4037" rx={1} />
        <Polygon points={`${half + 10},${half - 12} ${half + 19},${half + 6} ${half + 1},${half + 6}`} fill="#1B5E20" />
        <Polygon points={`${half + 10},${half - 8} ${half + 17},${half + 6} ${half + 3},${half + 6}`} fill="#43A047" />
      </Svg>
    );
  }

  if (type === 'ROCKS') {
    return (
      <Svg width={size} height={size}>
        <Rect x={1} y={1} width={size - 2} height={size - 2} rx={9} fill="#2E7D32" stroke="#1B4D20" strokeWidth={1.5} />
        {/* Boulder 1 */}
        <Circle cx={half - 4} cy={half + 2} r={11} fill="#78909C" stroke="#37474F" strokeWidth={1.5} />
        <Circle cx={half - 6} cy={half - 1} r={8} fill="#90A4AE" />
        {/* Small Stone */}
        <Circle cx={half + 11} cy={half + 8} r={6} fill="#B0BEC5" stroke="#37474F" strokeWidth={1.2} />
      </Svg>
    );
  }

  // Render Path Tiles (Grass + Sand Pathway)
  const pathW = 24;
  const pathHalf = pathW / 2;

  let pathD = '';
  if (type === 'STRAIGHT_H') {
    pathD = `M 0 ${half - pathHalf} L ${size} ${half - pathHalf} L ${size} ${half + pathHalf} L 0 ${half + pathHalf} Z`;
  } else if (type === 'STRAIGHT_V') {
    pathD = `M ${half - pathHalf} 0 L ${half + pathHalf} 0 L ${half + pathHalf} ${size} L ${half - pathHalf} ${size} Z`;
  } else if (type === 'CURVE_TR') {
    pathD = `M ${half - pathHalf} 0 L ${half + pathHalf} 0 A ${half - pathHalf} ${half - pathHalf} 0 0 1 ${size} ${half + pathHalf} L ${size} ${half - pathHalf} A ${half + pathHalf} ${half + pathHalf} 0 0 0 ${half - pathHalf} 0 Z`;
  } else if (type === 'CURVE_RB') {
    pathD = `M ${size} ${half - pathHalf} L ${size} ${half + pathHalf} A ${half - pathHalf} ${half - pathHalf} 0 0 1 ${half - pathHalf} ${size} L ${half + pathHalf} ${size} A ${half + pathHalf} ${half + pathHalf} 0 0 0 ${size} ${half - pathHalf} Z`;
  } else if (type === 'CURVE_BL') {
    pathD = `M ${half + pathHalf} ${size} L ${half - pathHalf} ${size} A ${half - pathHalf} ${half - pathHalf} 0 0 1 0 ${half - pathHalf} L 0 ${half + pathHalf} A ${half + pathHalf} ${half + pathHalf} 0 0 0 ${half + pathHalf} ${size} Z`;
  } else if (type === 'CURVE_LT') {
    pathD = `M 0 ${half + pathHalf} L 0 ${half - pathHalf} A ${half - pathHalf} ${half - pathHalf} 0 0 1 ${half + pathHalf} 0 L ${half - pathHalf} 0 A ${half + pathHalf} ${half + pathHalf} 0 0 0 0 ${half + pathHalf} Z`;
  } else if (type === 'CROSS') {
    pathD = `
      M 0 ${half - pathHalf} L ${half - pathHalf} ${half - pathHalf} L ${half - pathHalf} 0 L ${half + pathHalf} 0 L ${half + pathHalf} ${half - pathHalf} L ${size} ${half - pathHalf}
      L ${size} ${half + pathHalf} L ${half + pathHalf} ${half + pathHalf} L ${half + pathHalf} ${size} L ${half - pathHalf} ${size} L ${half - pathHalf} ${half + pathHalf} L 0 ${half + pathHalf} Z
    `;
  }

  const def = TILE_DEFS[type];

  return (
    <Svg width={size} height={size} opacity={isGhost ? 0.45 : 1}>
      {/* Grass Base Background */}
      <Rect
        x={1}
        y={1}
        width={size - 2}
        height={size - 2}
        rx={9}
        fill={isConnected ? '#1E5A22' : '#2E7D32'}
        stroke={isConnected ? '#FFE600' : '#1B4D20'}
        strokeWidth={isConnected ? 2 : 1.5}
      />

      {/* Dirt / Golden Pathway */}
      {Boolean(pathD) && (
        <G>
          <Path
            d={pathD}
            fill={isConnected ? '#FFB300' : '#D7A15C'}
            stroke={isConnected ? '#FFE600' : '#8D6E63'}
            strokeWidth={isConnected ? 2.2 : 1.8}
          />
          {/* Subtle Ground Specks or Glowing Trail */}
          {isConnected ? (
            <G>
              <Circle cx={half} cy={half} r={3} fill="#FFFFFF" opacity={0.8} />
              <Circle cx={half - 5} cy={half - 3} r={1.8} fill="#FFE600" />
              <Circle cx={half + 5} cy={half + 3} r={1.8} fill="#FFE600" />
            </G>
          ) : (
            <G>
              <Circle cx={half - 4} cy={half - 2} r={1.5} fill="#B07D3E" />
              <Circle cx={half + 5} cy={half + 3} r={1.2} fill="#B07D3E" />
            </G>
          )}
        </G>
      )}

      {/* Connection Edge Ports (clear indicators of where path goes) */}
      {def?.ports?.top && (
        <Rect x={half - 4} y={0} width={8} height={3} rx={1.5} fill={isConnected ? '#FFE600' : '#FFD54F'} />
      )}
      {def?.ports?.bottom && (
        <Rect x={half - 4} y={size - 3} width={8} height={3} rx={1.5} fill={isConnected ? '#FFE600' : '#FFD54F'} />
      )}
      {def?.ports?.left && (
        <Rect x={0} y={half - 4} width={3} height={8} rx={1.5} fill={isConnected ? '#FFE600' : '#FFD54F'} />
      )}
      {def?.ports?.right && (
        <Rect x={size - 3} y={half - 4} width={3} height={8} rx={1.5} fill={isConnected ? '#FFE600' : '#FFD54F'} />
      )}

      {/* Grass Edge Tuft Detailing */}
      <Circle cx={4} cy={4} r={3} fill="#4CAF50" />
      <Circle cx={size - 4} cy={size - 4} r={3} fill="#4CAF50" />
    </Svg>
  );
}

export default function CyberPathGame({
  isPaused = false,
  onBackToHub,
  onScoreUpdate,
}) {
  const juiceRef = useRef(null);

  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  // Active level config
  const levelIdx = Math.min(level - 1, CURATED_LEVELS.length - 1);
  const levelConfig = useMemo(() => {
    return level <= CURATED_LEVELS.length
      ? CURATED_LEVELS[levelIdx]
      : generateProceduralLevel(level);
  }, [level, levelIdx]);

  // Placed tiles on 24-box grid: { "col_row": "STRAIGHT_H" }
  const [gridTiles, setGridTiles] = useState({});

  // Inventory Trays (Left and Right docks)
  const [leftTray, setLeftTray] = useState(() => levelConfig.leftTray.map((t) => ({ ...t })));
  const [rightTray, setRightTray] = useState(() => levelConfig.rightTray.map((t) => ({ ...t })));

  // Selected tile from trays: { id, type, source: 'left' | 'right' | 'grid', col?: number, row?: number }
  const [selectedTile, setSelectedTile] = useState(null);

  // Walking hero state: { isWalking: boolean, stepIdx: number, col: number, row: number }
  const [walkerState, setWalkerState] = useState({
    isWalking: false,
    stepIdx: 0,
    col: -1,
    row: levelConfig.start.row,
  });

  const [victoryModal, setVictoryModal] = useState(false);

  // Load High Score
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((val) => {
        if (val) setHighScore(parseInt(val, 10) || 0);
      })
      .catch(() => {});
  }, []);

  // Initialize level
  const initLevel = useCallback((lvl) => {
    const cfg = lvl <= CURATED_LEVELS.length
      ? CURATED_LEVELS[Math.min(lvl - 1, CURATED_LEVELS.length - 1)]
      : generateProceduralLevel(lvl);

    setGridTiles({});
    setLeftTray(cfg.leftTray.map((t) => ({ ...t })));
    setRightTray(cfg.rightTray.map((t) => ({ ...t })));
    setSelectedTile(null);
    setWalkerState({
      isWalking: false,
      stepIdx: 0,
      col: -1,
      row: cfg.start.row,
    });
    setVictoryModal(false);
  }, []);

  // Scenery Map: { "col_row": "POND" | "TREES" | "ROCKS" }
  const sceneryMap = useMemo(() => {
    const map = {};
    levelConfig.scenery.forEach((sc) => {
      map[`${sc.col}_${sc.row}`] = sc.type;
    });
    return map;
  }, [levelConfig.scenery]);

  // Full Grid check: all 24 boxes must be filled (tiles + scenery) to escape!
  const totalFilled = useMemo(() => {
    return Object.keys(gridTiles).length + Object.keys(sceneryMap).length;
  }, [gridTiles, sceneryMap]);

  const isGridFull = totalFilled >= GRID_COLS * GRID_ROWS;

  // Validate path on grid changes
  const pathResult = useMemo(() => {
    return validatePath(gridTiles, levelConfig.start, levelConfig.exit);
  }, [gridTiles, levelConfig.start, levelConfig.exit]);

  // Ready to escape condition: route valid AND full 24-box grid filled!
  const canEscape = pathResult.isValid && isGridFull;

  // Handle Tray Tile Selection
  const handleSelectTrayTile = (tile, source) => {
    if (walkerState.isWalking || isPaused || victoryModal) return;

    if (selectedTile && selectedTile.id === tile.id) {
      // Deselect
      setSelectedTile(null);
      playSnapTickSound();
      triggerLightHaptic();
    } else {
      setSelectedTile({ ...tile, source });
      playSliceSound();
      triggerSelectionHaptic();
    }
  };

  // Handle Box Tap on the 24-box Grid
  const handleGridBoxPress = (col, row) => {
    if (walkerState.isWalking || isPaused || victoryModal) return;

    const key = `${col}_${row}`;

    // Disallow placing on scenery
    if (sceneryMap[key]) {
      triggerLightHaptic();
      juiceRef.current?.popup('OBSTACLE', 'Cannot build over nature', '#FF0055');
      return;
    }

    const currentTileOnBox = gridTiles[key];

    if (selectedTile) {
      // Placing the selected tile onto this box!
      const nextGrid = { ...gridTiles };
      nextGrid[key] = selectedTile.type;
      setGridTiles(nextGrid);

      // Remove tile from source tray and auto-refill if running low
      if (selectedTile.source === 'left') {
        setLeftTray((prev) =>
          getRefilledTray(prev.filter((t) => t.id !== selectedTile.id), 'lt')
        );
      } else if (selectedTile.source === 'right') {
        setRightTray((prev) =>
          getRefilledTray(prev.filter((t) => t.id !== selectedTile.id), 'rt')
        );
      }

      // If there was already a tile on this box, return it to the left tray
      if (currentTileOnBox) {
        setLeftTray((prev) => [
          ...prev,
          { id: `returned_${Date.now()}`, type: currentTileOnBox },
        ]);
      }

      setSelectedTile(null);
      playTapSound();
      triggerMediumHaptic();

      // Check if newly placed tile completed the entire route AND filled the full grid!
      const nextVal = validatePath(nextGrid, levelConfig.start, levelConfig.exit);
      const nextFilled = Object.keys(nextGrid).length + Object.keys(sceneryMap).length;
      if (nextVal.isValid && nextFilled >= GRID_COLS * GRID_ROWS) {
        triggerPerfectHaptic();
        playPerfectSound();
        juiceRef.current?.celebrate('⚡ ESCAPE READY!', 'All 24 boxes filled & route connected!', COLORS.matrixMint);
      } else if (nextVal.isValid) {
        triggerLightHaptic();
        playTapSound();
        juiceRef.current?.popup('ROUTE READY', `Fill ${24 - nextFilled} more boxes to escape!`, '#FFE600');
      }
    } else {
      // No tile selected: if tapping an existing placed tile, pick it back up to Left Tray
      if (currentTileOnBox) {
        const nextGrid = { ...gridTiles };
        delete nextGrid[key];
        setGridTiles(nextGrid);

        setLeftTray((prev) => [
          ...prev,
          { id: `tray_${Date.now()}`, type: currentTileOnBox },
        ]);

        playSliceSound();
        triggerLightHaptic();
        juiceRef.current?.popup('RETURNED', 'Tile moved to rack', '#FFE600');
      }
    }
  };

  // Start walking along the completed path!
  const handleWalkPath = useCallback(() => {
    if (!canEscape || walkerState.isWalking || isPaused) return;

    triggerPerfectHaptic();
    playPerfectSound();

    setWalkerState({
      isWalking: true,
      stepIdx: 0,
      col: -1,
      row: levelConfig.start.row,
    });
  }, [canEscape, walkerState.isWalking, isPaused, levelConfig.start.row]);

  // Walking Loop: steps tile by tile along the validated route to the exit
  useEffect(() => {
    if (!walkerState.isWalking) return;

    const fullRoute = [
      { col: -1, row: levelConfig.start.row },
      ...pathResult.steps,
      { col: GRID_COLS, row: levelConfig.exit.row },
    ];

    const timer = setTimeout(() => {
      const nextStep = walkerState.stepIdx + 1;

      if (nextStep < fullRoute.length) {
        const nextPos = fullRoute[nextStep];
        setWalkerState({
          isWalking: true,
          stepIdx: nextStep,
          col: nextPos.col,
          row: nextPos.row,
        });

        playSnapTickSound();
        triggerLightHaptic();
      } else {
        // Reached exit outside grid! VICTORY!
        setWalkerState({
          isWalking: false,
          stepIdx: 0,
          col: GRID_COLS,
          row: levelConfig.exit.row,
        });
        triggerPerfectHaptic();
        playPerfectSound();

        const earned = 300 + level * 150;
        setScore((s) => {
          const nextScore = s + earned;
          if (nextScore > highScore) {
            setHighScore(nextScore);
            AsyncStorage.setItem(STORAGE_KEY, String(nextScore)).catch(() => {});
          }
          onScoreUpdate?.(nextScore);
          return nextScore;
        });

        juiceRef.current?.celebrate('🏆 ESCAPE SUCCESSFUL!', `Level ${level} Cleared! +${earned} PTS`, COLORS.matrixMint);

        setTimeout(() => {
          setVictoryModal(true);
        }, 700);
      }
    }, 240);

    return () => clearTimeout(timer);
  }, [walkerState, pathResult.steps, levelConfig, level, highScore, onScoreUpdate]);

  // Next level handler
  const handleNextLevel = () => {
    const nextLvl = level + 1;
    setLevel(nextLvl);
    initLevel(nextLvl);
  };

  // Restart level
  const handleRestart = () => {
    initLevel(level);
    playTapSound();
    triggerLightHaptic();
  };

  return (
    <View style={styles.container}>
      <MiniGameHeader
        title="PATHFINDER"
        floorLabel="FLOOR 18"
        category="PUZZLE"
        score={score}
        bestScore={highScore}
        accentColor="#00F5FF"
        onBackToHub={onBackToHub}
        onReset={handleRestart}
        disabled={isPaused}
      />

      <JuiceEngine ref={juiceRef}>
        {/* Subheader Status Strip */}
        <View style={styles.statusStrip}>
          <View style={styles.statusBox}>
            <Text style={styles.statusDim}>LEVEL</Text>
            <Text style={[styles.statusVal, { color: '#FFE600' }]}>{levelConfig.name}</Text>
          </View>

          <View style={styles.statusBox}>
            <Text style={styles.statusDim}>GRID FILLED</Text>
            <Text
              style={[
                styles.statusVal,
                { color: isGridFull ? COLORS.matrixMint : '#FFE600' },
              ]}
            >
              {totalFilled}/24 BOXES
            </Text>
          </View>

          <View style={styles.statusBox}>
            <Text style={styles.statusDim}>ESCAPE ROUTE</Text>
            <Text
              style={[
                styles.statusVal,
                {
                  color: canEscape
                    ? COLORS.matrixMint
                    : pathResult.isValid
                      ? '#FFE600'
                      : '#FF0055',
                },
              ]}
            >
              {canEscape
                ? 'READY ➔'
                : pathResult.isValid
                  ? 'NEED FULL GRID'
                  : 'INCOMPLETE ⚠️'}
            </Text>
          </View>
        </View>

        {/* Dynamic Step-by-Step Instruction Guide Banner */}
        <View style={styles.guideCard}>
          <Text style={styles.guideText}>
            {walkerState.isWalking
              ? '🚶 Escaping along the conduit trail to the exit trophy...'
              : canEscape
                ? '🎉 FULL GRID FILLED & ROUTE CONNECTED! Tap "WALK TO ESCAPE"!'
                : pathResult.isValid
                  ? `⚠️ Route connected! Fill all remaining boxes to escape! (${totalFilled}/24 filled)`
                  : selectedTile
                    ? `🎯 Step 2: Tap an empty box (highlighted) to place ${selectedTile.name || selectedTile.type}`
                    : pathResult.steps.length > 0
                      ? `⚡ Step 3: Link path to EXIT 🏆 (${pathResult.steps.length} linked, ${totalFilled}/24 filled)`
                      : '👆 Step 1: Pick a tile from LEFT or RIGHT tray to begin'}
          </Text>
        </View>

        {/* Main Arena: Left Tray, 24-Box Center Grid (4x6), Right Tray */}
        <View style={styles.arenaRow}>
          {/* Left Tile Selection Dock */}
          <View style={styles.sideDock}>
            <Text style={styles.dockTitle}>LEFT ({leftTray.length})</Text>
            <ScrollView
              style={styles.dockScroll}
              contentContainerStyle={styles.dockSlots}
              showsVerticalScrollIndicator={false}
            >
              {leftTray.map((tile) => {
                const isSelected = selectedTile?.id === tile.id;
                return (
                  <Pressable
                    key={tile.id}
                    style={[
                      styles.dockCard,
                      isSelected && styles.dockCardSelected,
                    ]}
                    onPress={() => handleSelectTrayTile(tile, 'left')}
                  >
                    <TileGraphic type={tile.type} size={42} />
                    {isSelected && (
                      <View style={styles.pickedBadge}>
                        <Text style={styles.pickedText}>PICKED</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Center 24-Box Grid with External Start and Exit Markers */}
          <View style={styles.gridBoardWrapper}>
            {/* EXTERNAL START ARCH (OUTSIDE GRID ON LEFT) */}
            <View
              style={[
                styles.externalStartBadge,
                { top: levelConfig.start.row * (TILE_SIZE + TILE_GAP) + 8 },
              ]}
            >
              <Text style={styles.externalMarkerIcon}>🚩</Text>
              <Text style={styles.externalMarkerArrow}>➔</Text>
              {walkerState.isWalking && walkerState.col === -1 && (
                <View style={styles.walkerExternalOverlay}>
                  <Text style={{ fontSize: 16 }}>🚶</Text>
                </View>
              )}
            </View>

            {/* Center 24-Box Grid (4 Columns x 6 Rows = 24 Boxes) */}
            <View style={styles.gridBoard}>
              {Array.from({ length: GRID_ROWS }).map((_, r) => (
                <View key={`row_${r}`} style={styles.gridRow}>
                  {Array.from({ length: GRID_COLS }).map((__, c) => {
                    const key = `${c}_${r}`;
                    const placedTileType = gridTiles[key];
                    const sceneryType = sceneryMap[key];
                    const isPlayerHere = walkerState.col === c && walkerState.row === r;
                    const isConnected = pathResult.steps.some((s) => s.col === c && s.row === r);
                    const isNextNeeded =
                      !pathResult.isValid &&
                      pathResult.nextNeeded &&
                      pathResult.nextNeeded.col === c &&
                      pathResult.nextNeeded.row === r;

                    return (
                      <Pressable
                        key={key}
                        style={[
                          styles.gridBox,
                          isConnected && styles.gridBoxConnected,
                          isNextNeeded && styles.gridBoxNextNeeded,
                        ]}
                        onPress={() => handleGridBoxPress(c, r)}
                      >
                        {/* Empty Box Recess Outline */}
                        <View style={styles.boxRecess} />

                        {/* Scenery Tile (Pond, Trees, Rocks) */}
                        {Boolean(sceneryType) && (
                          <TileGraphic type={sceneryType} size={TILE_SIZE} />
                        )}

                        {/* Placed Path Tile */}
                        {Boolean(placedTileType) && (
                          <TileGraphic
                            type={placedTileType}
                            size={TILE_SIZE}
                            isConnected={isConnected}
                          />
                        )}

                        {/* Next Box Hint Badge */}
                        {isNextNeeded && !placedTileType && !sceneryType && (
                          <View style={styles.nextHintBadge}>
                            <Text style={styles.nextHintText}>
                              {c === levelConfig.start.col && r === levelConfig.start.row
                                ? 'ENTER ➔'
                                : 'NEXT ➔'}
                            </Text>
                          </View>
                        )}

                        {/* Walking Player Character Silhouette */}
                        {isPlayerHere && (
                          <View style={styles.playerSprite}>
                            <Svg width={28} height={28} viewBox="0 0 28 28">
                              <Circle cx={14} cy={14} r={12} fill="#FFE600" stroke="#FFFFFF" strokeWidth={2} />
                              <Circle cx={14} cy={11} r={4.5} fill="#050814" />
                              <Path d="M 9 19 Q 14 15 19 19" stroke="#050814" strokeWidth={3} fill="none" strokeLinecap="round" />
                            </Svg>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>

            {/* EXTERNAL EXIT ARCH (OUTSIDE GRID ON RIGHT) */}
            <View
              style={[
                styles.externalExitBadge,
                { top: levelConfig.exit.row * (TILE_SIZE + TILE_GAP) + 8 },
              ]}
            >
              <Text style={styles.externalMarkerArrow}>➔</Text>
              <Text style={styles.externalMarkerIcon}>🏆</Text>
              {walkerState.isWalking && walkerState.col === GRID_COLS && (
                <View style={styles.walkerExternalOverlay}>
                  <Text style={{ fontSize: 16 }}>🚶</Text>
                </View>
              )}
            </View>
          </View>

          {/* Right Tile Selection Dock */}
          <View style={styles.sideDock}>
            <Text style={styles.dockTitle}>RIGHT ({rightTray.length})</Text>
            <ScrollView
              style={styles.dockScroll}
              contentContainerStyle={styles.dockSlots}
              showsVerticalScrollIndicator={false}
            >
              {rightTray.map((tile) => {
                const isSelected = selectedTile?.id === tile.id;
                return (
                  <Pressable
                    key={tile.id}
                    style={[
                      styles.dockCard,
                      isSelected && styles.dockCardSelected,
                    ]}
                    onPress={() => handleSelectTrayTile(tile, 'right')}
                  >
                    <TileGraphic type={tile.type} size={42} />
                    {isSelected && (
                      <View style={styles.pickedBadge}>
                        <Text style={styles.pickedText}>PICKED</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* Action Controls Bar: Walk Path, Undo & Clear */}
        <View style={styles.controlsBar}>
          <Pressable
            style={[
              styles.walkBtn,
              !canEscape && styles.btnDisabled,
              canEscape && styles.walkBtnReady,
            ]}
            onPress={handleWalkPath}
            disabled={!canEscape || walkerState.isWalking}
          >
            <Text style={styles.walkBtnText}>
              {canEscape
                ? '🚶 WALK TO ESCAPE ➔'
                : pathResult.isValid
                  ? `FILL ALL BOXES (${totalFilled}/24)`
                  : 'CONNECT TILES TO EXIT'}
            </Text>
          </Pressable>

          <Pressable style={styles.actionBtn} onPress={handleRestart} disabled={walkerState.isWalking}>
            <Text style={styles.actionIcon}>⚡</Text>
            <Text style={styles.actionText}>RESET</Text>
          </Pressable>
        </View>
      </JuiceEngine>

      {/* Victory / Next Level Modal */}
      <GameResultModal
        visible={victoryModal}
        type="VICTORY"
        title="ESCAPED THE GRID!"
        subtitle="All 24 boxes powered and full route escaped successfully!"
        score={score}
        bestScore={highScore}
        accentColor="#00F5FF"
        buttonText="NEXT LEVEL ▶"
        onRetry={handleNextLevel}
        onBackToHub={onBackToHub}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05070E',
  },
  statusStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(8, 10, 24, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 245, 255, 0.15)',
  },
  statusBox: {
    alignItems: 'center',
  },
  statusDim: {
    fontFamily: monoFont,
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 0.8,
  },
  statusVal: {
    fontFamily: monoFont,
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  guideCard: {
    marginHorizontal: 12,
    marginTop: 6,
    marginBottom: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 245, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideText: {
    fontFamily: monoFont,
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFE600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  arenaRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 6,
    gap: 34,
  },
  sideDock: {
    width: 50,
    height: 324,
    alignItems: 'center',
    backgroundColor: 'rgba(10, 14, 28, 0.92)',
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: 'rgba(0, 245, 255, 0.25)',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  dockScroll: {
    width: '100%',
  },
  dockTitle: {
    fontFamily: monoFont,
    fontSize: 7.5,
    fontWeight: '900',
    color: '#00F5FF',
    marginBottom: 4,
    letterSpacing: 0.4,
  },
  dockSlots: {
    gap: 6,
    alignItems: 'center',
    paddingVertical: 2,
  },
  dockCard: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#070A14',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  dockCardSelected: {
    borderColor: '#FFE600',
    transform: [{ scale: 1.06 }],
    shadowColor: '#FFE600',
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  pickedBadge: {
    position: 'absolute',
    bottom: 1,
    backgroundColor: 'rgba(255, 230, 0, 0.85)',
    paddingHorizontal: 3,
    borderRadius: 3,
  },
  pickedText: {
    fontFamily: monoFont,
    fontSize: 6,
    fontWeight: '900',
    color: '#05060D',
  },
  gridBoardWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  externalStartBadge: {
    position: 'absolute',
    left: -32,
    width: 28,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#0A1E14',
    borderWidth: 1.5,
    borderColor: '#00FF9D',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    shadowColor: '#00FF9D',
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 6,
  },
  externalExitBadge: {
    position: 'absolute',
    right: -32,
    width: 28,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#1E1805',
    borderWidth: 1.5,
    borderColor: '#FFE600',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    shadowColor: '#FFE600',
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 6,
  },
  externalMarkerIcon: {
    fontSize: 14,
  },
  externalMarkerArrow: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '900',
    color: '#00F5FF',
    marginTop: 1,
  },
  walkerExternalOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridBoard: {
    backgroundColor: '#070914',
    padding: 6,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(0, 245, 255, 0.35)',
    shadowColor: '#00F5FF',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  gridRow: {
    flexDirection: 'row',
    gap: TILE_GAP,
    marginBottom: TILE_GAP,
  },
  gridBox: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  gridBoxStart: {
    borderWidth: 1.8,
    borderColor: COLORS.matrixMint,
  },
  gridBoxExit: {
    borderWidth: 1.8,
    borderColor: '#FFE600',
  },
  gridBoxConnected: {
    borderWidth: 1.8,
    borderColor: '#FFE600',
    shadowColor: '#FFE600',
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 6,
  },
  gridBoxNextNeeded: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#39FF14',
    shadowColor: '#39FF14',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 8,
  },
  nextHintBadge: {
    position: 'absolute',
    top: 2,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 3,
    backgroundColor: 'rgba(57, 255, 20, 0.9)',
    zIndex: 10,
  },
  nextHintText: {
    fontFamily: monoFont,
    fontSize: 6.5,
    fontWeight: '900',
    color: '#05060D',
  },
  boxRecess: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10,
    backgroundColor: '#0F1322',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  markerBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerIcon: {
    fontSize: 16,
  },
  markerText: {
    fontFamily: monoFont,
    fontSize: 7.5,
    fontWeight: '900',
    color: COLORS.matrixMint,
  },
  exitBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 14, 28, 0.85)',
    paddingHorizontal: 3,
    borderRadius: 4,
  },
  exitIcon: {
    fontSize: 12,
  },
  exitText: {
    fontFamily: monoFont,
    fontSize: 6,
    fontWeight: '900',
    color: '#FFE600',
  },
  playerSprite: {
    position: 'absolute',
    zIndex: 99,
    shadowColor: '#00F5FF',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 12,
  },
  controlsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(8, 10, 24, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 245, 255, 0.15)',
  },
  walkBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#141829',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 245, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walkBtnReady: {
    backgroundColor: '#00F5D4',
    borderColor: '#FFFFFF',
    shadowColor: '#00F5D4',
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  walkBtnText: {
    fontFamily: monoFont,
    fontSize: 11.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  actionBtn: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#1A1624',
    borderWidth: 1.5,
    borderColor: '#FFE600',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIcon: {
    fontSize: 14,
  },
  actionText: {
    fontFamily: monoFont,
    fontSize: 10.5,
    fontWeight: '900',
    color: '#FFE600',
    letterSpacing: 0.5,
  },
  btnDisabled: {
    opacity: 0.45,
  },
});
