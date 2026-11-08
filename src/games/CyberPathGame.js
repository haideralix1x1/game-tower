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
const TILE_SIZE = 50;
const TILE_GAP = 3;

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
 * 10 Curated Escalating Levels of 24-box Puzzles
 * With pre-placed scenery (Pond, Trees, Rocks), Start, and Exit
 * Left and Right trays hold available tiles to place!
 */
const CURATED_LEVELS = [
  // Level 1: Tutorial Direct Route (Row 1)
  {
    name: 'MEADOW OVERVIEW',
    start: { col: 0, row: 1, dir: 'right' },
    exit: { col: 3, row: 1, dir: 'right' },
    scenery: [
      { col: 1, row: 3, type: 'POND' },
      { col: 2, row: 4, type: 'TREES' },
    ],
    leftTray: [
      { id: 'lt_0', type: 'STRAIGHT_H' },
      { id: 'lt_1', type: 'STRAIGHT_H' },
      { id: 'lt_2', type: 'CURVE_RB' },
    ],
    rightTray: [
      { id: 'rt_0', type: 'STRAIGHT_H' },
      { id: 'rt_1', type: 'CURVE_BL' },
      { id: 'rt_2', type: 'STRAIGHT_V' },
    ],
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
    leftTray: [
      { id: 'lt_0', type: 'CURVE_RB' },
      { id: 'lt_1', type: 'STRAIGHT_H' },
      { id: 'lt_2', type: 'CURVE_TR' },
    ],
    rightTray: [
      { id: 'rt_0', type: 'CURVE_LT' },
      { id: 'rt_1', type: 'STRAIGHT_V' },
      { id: 'rt_2', type: 'CURVE_BL' },
    ],
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
    leftTray: [
      { id: 'lt_0', type: 'CURVE_RB' },
      { id: 'lt_1', type: 'STRAIGHT_H' },
      { id: 'lt_2', type: 'CURVE_BL' },
      { id: 'lt_3', type: 'CURVE_TR' },
    ],
    rightTray: [
      { id: 'rt_0', type: 'CURVE_LT' },
      { id: 'rt_1', type: 'STRAIGHT_V' },
      { id: 'rt_2', type: 'CURVE_RB' },
      { id: 'rt_3', type: 'STRAIGHT_H' },
    ],
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
    leftTray: [
      { id: 'lt_0', type: 'CURVE_TR' },
      { id: 'lt_1', type: 'STRAIGHT_V' },
      { id: 'lt_2', type: 'CURVE_RB' },
      { id: 'lt_3', type: 'STRAIGHT_H' },
    ],
    rightTray: [
      { id: 'rt_0', type: 'CURVE_BL' },
      { id: 'rt_1', type: 'STRAIGHT_V' },
      { id: 'rt_2', type: 'CURVE_LT' },
      { id: 'rt_3', type: 'CURVE_TR' },
    ],
  },

  // Level 5: Boulder Canyon
  {
    name: 'BOULDER CANYON',
    start: { col: 1, row: 0, dir: 'bottom' },
    exit: { col: 2, row: 5, dir: 'bottom' },
    scenery: [
      { col: 1, row: 2, type: 'ROCKS' },
      { col: 2, row: 3, type: 'ROCKS' },
      { col: 0, row: 4, type: 'POND' },
    ],
    leftTray: [
      { id: 'lt_0', type: 'CURVE_BL' },
      { id: 'lt_1', type: 'CURVE_TR' },
      { id: 'lt_2', type: 'STRAIGHT_V' },
      { id: 'lt_3', type: 'CURVE_RB' },
    ],
    rightTray: [
      { id: 'rt_0', type: 'STRAIGHT_H' },
      { id: 'rt_1', type: 'CURVE_LT' },
      { id: 'rt_2', type: 'STRAIGHT_V' },
      { id: 'rt_3', type: 'CURVE_BL' },
    ],
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
    leftTray: [
      { id: 'lt_0', type: 'CROSS' },
      { id: 'lt_1', type: 'STRAIGHT_H' },
      { id: 'lt_2', type: 'CURVE_RB' },
      { id: 'lt_3', type: 'CURVE_BL' },
    ],
    rightTray: [
      { id: 'rt_0', type: 'CURVE_TR' },
      { id: 'rt_1', type: 'STRAIGHT_V' },
      { id: 'rt_2', type: 'CURVE_LT' },
      { id: 'rt_3', type: 'STRAIGHT_H' },
    ],
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
    leftTray: [
      { id: 'lt_0', type: 'CURVE_RB' },
      { id: 'lt_1', type: 'STRAIGHT_V' },
      { id: 'lt_2', type: 'CURVE_BL' },
      { id: 'lt_3', type: 'CURVE_TR' },
    ],
    rightTray: [
      { id: 'rt_0', type: 'STRAIGHT_H' },
      { id: 'rt_1', type: 'CURVE_LT' },
      { id: 'rt_2', type: 'STRAIGHT_V' },
      { id: 'rt_3', type: 'CURVE_RB' },
    ],
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
    leftTray: [
      { id: 'lt_0', type: 'CURVE_RB' },
      { id: 'lt_1', type: 'STRAIGHT_H' },
      { id: 'lt_2', type: 'CURVE_BL' },
      { id: 'lt_3', type: 'CURVE_TR' },
    ],
    rightTray: [
      { id: 'rt_0', type: 'STRAIGHT_V' },
      { id: 'rt_1', type: 'CURVE_LT' },
      { id: 'rt_2', type: 'CURVE_RB' },
      { id: 'rt_3', type: 'STRAIGHT_H' },
    ],
  },
];

/**
 * Procedural Endless Level Generator (for Level 9+)
 */
function generateProceduralLevel(lvl) {
  return {
    name: `ENDLESS GLADE // LVL ${lvl}`,
    start: { col: 0, row: (lvl % 4), dir: 'right' },
    exit: { col: 3, row: 5 - (lvl % 4), dir: 'right' },
    scenery: [
      { col: 1, row: 2, type: 'POND' },
      { col: 2, row: 3, type: 'TREES' },
    ],
    leftTray: [
      { id: 'lt_0', type: 'CURVE_RB' },
      { id: 'lt_1', type: 'STRAIGHT_H' },
      { id: 'lt_2', type: 'CURVE_BL' },
      { id: 'lt_3', type: 'CURVE_TR' },
    ],
    rightTray: [
      { id: 'rt_0', type: 'STRAIGHT_V' },
      { id: 'rt_1', type: 'CURVE_LT' },
      { id: 'rt_2', type: 'STRAIGHT_H' },
      { id: 'rt_3', type: 'CURVE_RB' },
    ],
  };
}

/**
 * Pathfinding Validator:
 * Traces if a valid continuous path connects Start to Exit!
 */
function validatePath(grid, start, exit) {
  const visited = new Set();
  const pathSteps = [];

  let curCol = start.col;
  let curRow = start.row;
  let inDir = start.dir; // direction moving into next tile ('right', 'left', 'top', 'bottom')

  pathSteps.push({ col: curCol, row: curRow });

  // Trace step by step through connected tiles
  for (let step = 0; step < 30; step++) {
    // If reached exit
    if (curCol === exit.col && curRow === exit.row) {
      return { isValid: true, steps: pathSteps };
    }

    const key = `${curCol}_${curRow}`;
    const tileType = grid[key];
    if (!tileType) break;

    const def = TILE_DEFS[tileType];
    if (!def) break;

    // Check entry port
    // If moving 'right', we enter from 'left'
    const entryPort = inDir === 'right' ? 'left' : inDir === 'left' ? 'right' : inDir === 'bottom' ? 'top' : 'bottom';
    if (!def.ports[entryPort]) {
      break; // Tile does not connect to incoming path!
    }

    // Determine exit port
    let outDir = null;
    const availableExits = Object.keys(def.ports).filter((p) => p !== entryPort && def.ports[p]);
    if (availableExits.length === 0) break;
    outDir = availableExits[0];

    // Next coordinates
    let nextCol = curCol;
    let nextRow = curRow;
    if (outDir === 'right') nextCol += 1;
    else if (outDir === 'left') nextCol -= 1;
    else if (outDir === 'bottom') nextRow += 1;
    else if (outDir === 'top') nextRow -= 1;

    // Boundary check
    if (nextCol < 0 || nextCol >= GRID_COLS || nextRow < 0 || nextRow >= GRID_ROWS) {
      break;
    }

    const nextKey = `${nextCol}_${nextRow}`;
    if (visited.has(nextKey)) break; // Loop
    visited.add(nextKey);

    curCol = nextCol;
    curRow = nextRow;
    inDir = outDir;
    pathSteps.push({ col: curCol, row: curRow });
  }

  // Check if final step reached exit
  if (curCol === exit.col && curRow === exit.row) {
    return { isValid: true, steps: pathSteps };
  }

  return { isValid: false, steps: [] };
}

/**
 * Beautiful SVG Tile Graphic Renderer
 * Faithfully matches the Forest Tileset cartoon reference image!
 */
function TileGraphic({ type, size = TILE_SIZE, isGhost = false }) {
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

  return (
    <Svg width={size} height={size} opacity={isGhost ? 0.45 : 1}>
      {/* Grass Base Background */}
      <Rect
        x={1}
        y={1}
        width={size - 2}
        height={size - 2}
        rx={9}
        fill="#2E7D32"
        stroke="#1B4D20"
        strokeWidth={1.5}
      />

      {/* Dirt Pathway */}
      {Boolean(pathD) && (
        <G>
          <Path d={pathD} fill="#D7A15C" stroke="#8D6E63" strokeWidth={1.8} />
          {/* Subtle Ground Specks */}
          <Circle cx={half - 4} cy={half - 2} r={1.5} fill="#B07D3E" />
          <Circle cx={half + 5} cy={half + 3} r={1.2} fill="#B07D3E" />
        </G>
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

  // Walking hero state: { isWalking: boolean, stepIdx: number, playerPos: { x, y } }
  const [walkerState, setWalkerState] = useState({
    isWalking: false,
    stepIdx: 0,
    col: levelConfig.start.col,
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
      col: cfg.start.col,
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

  // Validate path on grid changes
  const pathResult = useMemo(() => {
    return validatePath(gridTiles, levelConfig.start, levelConfig.exit);
  }, [gridTiles, levelConfig.start, levelConfig.exit]);

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

      // Remove tile from source tray
      if (selectedTile.source === 'left') {
        setLeftTray((prev) => prev.filter((t) => t.id !== selectedTile.id));
      } else if (selectedTile.source === 'right') {
        setRightTray((prev) => prev.filter((t) => t.id !== selectedTile.id));
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

      // Check if newly placed tile completed the entire route!
      const nextVal = validatePath(nextGrid, levelConfig.start, levelConfig.exit);
      if (nextVal.isValid) {
        triggerPerfectHaptic();
        playPerfectSound();
        juiceRef.current?.celebrate('⚡ PATH COMPLETE!', 'Ready to walk to exit!', COLORS.matrixMint);
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
    if (!pathResult.isValid || walkerState.isWalking || isPaused) return;

    triggerPerfectHaptic();
    playPerfectSound();

    setWalkerState({
      isWalking: true,
      stepIdx: 0,
      col: pathResult.steps[0].col,
      row: pathResult.steps[0].row,
    });
  }, [pathResult, walkerState.isWalking, isPaused]);

  // Walking Loop: steps tile by tile along the validated route
  useEffect(() => {
    if (!walkerState.isWalking) return;

    const timer = setTimeout(() => {
      const nextStep = walkerState.stepIdx + 1;

      if (nextStep < pathResult.steps.length) {
        // Step to next tile
        const nextPos = pathResult.steps[nextStep];
        setWalkerState({
          isWalking: true,
          stepIdx: nextStep,
          col: nextPos.col,
          row: nextPos.row,
        });

        playSnapTickSound();
        triggerLightHaptic();
      } else {
        // Reached exit! VICTORY!
        setWalkerState((w) => ({ ...w, isWalking: false }));
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
        }, 800);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [walkerState, pathResult.steps, level, highScore, onScoreUpdate]);

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
        title="CYBER PATHFINDER"
        floorLabel="FLOOR 18"
        category="STRATEGY"
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
            <Text style={styles.statusDim}>STATUS</Text>
            <Text
              style={[
                styles.statusVal,
                { color: pathResult.isValid ? COLORS.matrixMint : '#FF0055' },
              ]}
            >
              {pathResult.isValid ? 'ROUTE READY! ➔' : 'INCOMPLETE ⚠️'}
            </Text>
          </View>
        </View>

        {/* Main Arena: Left Tray, 24-Box Center Grid (4x6), Right Tray */}
        <View style={styles.arenaRow}>
          {/* Left Tile Selection Dock */}
          <View style={styles.sideDock}>
            <Text style={styles.dockTitle}>LEFT TILES</Text>
            <View style={styles.dockSlots}>
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
                    <TileGraphic type={tile.type} size={44} />
                    {isSelected && (
                      <View style={styles.pickedBadge}>
                        <Text style={styles.pickedText}>PICKED</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Center 24-Box Grid (4 Columns x 6 Rows = 24 Boxes) */}
          <View style={styles.gridBoard}>
            {Array.from({ length: GRID_ROWS }).map((_, r) => (
              <View key={`row_${r}`} style={styles.gridRow}>
                {Array.from({ length: GRID_COLS }).map((__, c) => {
                  const key = `${c}_${r}`;
                  const placedTileType = gridTiles[key];
                  const sceneryType = sceneryMap[key];
                  const isStart = levelConfig.start.col === c && levelConfig.start.row === r;
                  const isExit = levelConfig.exit.col === c && levelConfig.exit.row === r;
                  const isPlayerHere = walkerState.col === c && walkerState.row === r;

                  return (
                    <Pressable
                      key={key}
                      style={[
                        styles.gridBox,
                        isStart && styles.gridBoxStart,
                        isExit && styles.gridBoxExit,
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
                        <TileGraphic type={placedTileType} size={TILE_SIZE} />
                      )}

                      {/* Start Arch & Player Indicator */}
                      {isStart && !placedTileType && (
                        <View style={styles.markerBadge}>
                          <Text style={styles.markerIcon}>🚩</Text>
                          <Text style={styles.markerText}>START</Text>
                        </View>
                      )}

                      {/* Exit Golden Chest Indicator */}
                      {isExit && (
                        <View style={styles.exitBadge}>
                          <Text style={styles.exitIcon}>🏆</Text>
                          <Text style={styles.exitText}>EXIT</Text>
                        </View>
                      )}

                      {/* Walking Player Character Silhouette */}
                      {isPlayerHere && (
                        <View style={styles.playerSprite}>
                          <Svg width={28} height={28} viewBox="0 0 28 28">
                            <Circle cx={14} cy={14} r={12} fill="#00F5FF" stroke="#FFFFFF" strokeWidth={2} />
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

          {/* Right Tile Selection Dock */}
          <View style={styles.sideDock}>
            <Text style={styles.dockTitle}>RIGHT TILES</Text>
            <View style={styles.dockSlots}>
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
                    <TileGraphic type={tile.type} size={44} />
                    {isSelected && (
                      <View style={styles.pickedBadge}>
                        <Text style={styles.pickedText}>PICKED</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* Action Controls Bar: Walk Path, Undo & Clear */}
        <View style={styles.controlsBar}>
          <Pressable
            style={[
              styles.walkBtn,
              !pathResult.isValid && styles.btnDisabled,
              pathResult.isValid && styles.walkBtnReady,
            ]}
            onPress={handleWalkPath}
            disabled={!pathResult.isValid || walkerState.isWalking}
          >
            <Text style={styles.walkBtnText}>
              {pathResult.isValid ? '▶ WALK TO EXIT!' : 'BUILD CONNECTED ROUTE'}
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
        title="ROUTE COMPLETE!"
        subtitle={`Player walked through the 24-box map and escaped safely!`}
        score={score}
        bestScore={highScore}
        accentColor="#00F5FF"
        buttonText="NEXT SECTOR ▶"
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
  arenaRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 6,
  },
  sideDock: {
    width: 52,
    alignItems: 'center',
    backgroundColor: 'rgba(10, 14, 28, 0.92)',
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: 'rgba(0, 245, 255, 0.25)',
    paddingVertical: 6,
    paddingHorizontal: 2,
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
  },
  dockCard: {
    width: 46,
    height: 46,
    borderRadius: 10,
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
    borderWidth: 1.5,
    borderColor: COLORS.matrixMint,
  },
  gridBoxExit: {
    borderWidth: 1.5,
    borderColor: '#FFE600',
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
