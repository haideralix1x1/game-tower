import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, {
  Rect,
  Circle,
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
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
} from '../utils/haptics';
import {
  playTapSound,
  playPerfectSound,
  playSliceSound,
  playSnapTickSound,
} from '../utils/sound';

const STORAGE_KEY = '@game_tower:best_screw_v1';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

// Board dimensions
const BOARD_W = 340;
const BOARD_H = 400;

/**
 * Neon Cyberpunk Palette for Struts and Screws
 */
const STRUT_COLORS = [
  '#00F5FF', // Cyan
  '#FF007F', // Neon Pink / Magenta
  '#FFE600', // Electric Gold
  '#39FF14', // Acid Green
  '#9D4EDD', // Quantum Violet
  '#FF5E00', // Plasma Orange
  '#00F5D4', // Matrix Mint
  '#4D96FF', // Neon Blue
];

/**
 * 12 Curated Escalating Levels of Cyber Screws and Interlocking Struts
 */
const CURATED_LEVELS = [
  // Level 1: Tutorial // Dual Strut (2 bars, 1 empty hole)
  {
    name: 'INITIAL OVERRIDE',
    parMoves: 4,
    holes: [
      { id: 'h0', x: 80, y: 130 },
      { id: 'h1', x: 260, y: 130 },
      { id: 'h2', x: 170, y: 270 },
      { id: 'h_empty1', x: 170, y: 70 }, // Spare empty
    ],
    planks: [
      { id: 'p0', name: 'CYAN STRUT', holes: ['h0', 'h1'], color: '#00F5FF', layer: 2 },
      { id: 'p1', name: 'MAGENTA STRUT', holes: ['h0', 'h2'], color: '#FF007F', layer: 1 },
    ],
    screws: {
      h0: { color: '#00F5FF' },
      h1: { color: '#00F5FF' },
      h2: { color: '#FF007F' },
    },
  },

  // Level 2: Crossfire (3 bars, 2 empty holes)
  {
    name: 'CROSSFIRE MATRIX',
    parMoves: 6,
    holes: [
      { id: 'h0', x: 70, y: 120 },
      { id: 'h1', x: 270, y: 120 },
      { id: 'h2', x: 70, y: 260 },
      { id: 'h3', x: 270, y: 260 },
      { id: 'h4', x: 170, y: 190 },
      { id: 'h_empty1', x: 170, y: 70 },
      { id: 'h_empty2', x: 170, y: 310 },
    ],
    planks: [
      { id: 'p0', name: 'GOLD BEAM', holes: ['h0', 'h1'], color: '#FFE600', layer: 3 },
      { id: 'p1', name: 'CYAN BEAM', holes: ['h2', 'h3'], color: '#00F5FF', layer: 2 },
      { id: 'p2', name: 'LIME DIAGONAL', holes: ['h0', 'h3'], color: '#39FF14', layer: 1 },
    ],
    screws: {
      h0: { color: '#FFE600' },
      h1: { color: '#FFE600' },
      h2: { color: '#00F5FF' },
      h3: { color: '#00F5FF' },
      h4: { color: '#39FF14' },
    },
  },

  // Level 3: Triad Nexus (Triangle of 3 interlocking bars, 1 center hole)
  {
    name: 'TRIAD NEXUS',
    parMoves: 7,
    holes: [
      { id: 'h0', x: 90, y: 110 },
      { id: 'h1', x: 250, y: 110 },
      { id: 'h2', x: 170, y: 270 },
      { id: 'h_center', x: 170, y: 170 }, // Spare center hole
    ],
    planks: [
      { id: 'p0', name: 'VIOLET STRUT', holes: ['h0', 'h1'], color: '#9D4EDD', layer: 3 },
      { id: 'p1', name: 'ORANGE STRUT', holes: ['h1', 'h2'], color: '#FF5E00', layer: 2 },
      { id: 'p2', name: 'CYAN STRUT', holes: ['h2', 'h0'], color: '#00F5FF', layer: 1 },
    ],
    screws: {
      h0: { color: '#9D4EDD' },
      h1: { color: '#FF5E00' },
      h2: { color: '#00F5FF' },
    },
  },

  // Level 4: Cyber Z-Link (Classic Z strut layout)
  {
    name: 'CYBER Z-LINK',
    parMoves: 8,
    holes: [
      { id: 'h0', x: 70, y: 90 },
      { id: 'h1', x: 270, y: 90 },
      { id: 'h2', x: 70, y: 290 },
      { id: 'h3', x: 270, y: 290 },
      { id: 'h_spare1', x: 170, y: 130 },
      { id: 'h_spare2', x: 170, y: 250 },
    ],
    planks: [
      { id: 'p0', name: 'TOP BAR', holes: ['h0', 'h1'], color: '#00F5FF', layer: 3 },
      { id: 'p1', name: 'DIAGONAL Z', holes: ['h1', 'h2'], color: '#FFE600', layer: 2 },
      { id: 'p2', name: 'BOTTOM BAR', holes: ['h2', 'h3'], color: '#FF007F', layer: 1 },
    ],
    screws: {
      h0: { color: '#00F5FF' },
      h1: { color: '#00F5FF' },
      h2: { color: '#FFE600' },
      h3: { color: '#FF007F' },
    },
  },

  // Level 5: Pentaplex (4 bars, interlocking square + diagonal)
  {
    name: 'PENTAPLEX CORE',
    parMoves: 9,
    holes: [
      { id: 'h0', x: 80, y: 110 },
      { id: 'h1', x: 260, y: 110 },
      { id: 'h2', x: 260, y: 270 },
      { id: 'h3', x: 80, y: 270 },
      { id: 'h_s1', x: 170, y: 190 },
      { id: 'h_s2', x: 170, y: 60 },
    ],
    planks: [
      { id: 'p0', name: 'NORTH STRUT', holes: ['h0', 'h1'], color: '#00F5FF', layer: 4 },
      { id: 'p1', name: 'EAST STRUT', holes: ['h1', 'h2'], color: '#39FF14', layer: 3 },
      { id: 'p2', name: 'SOUTH STRUT', holes: ['h2', 'h3'], color: '#FF007F', layer: 2 },
      { id: 'p3', name: 'DIAGONAL CROSS', holes: ['h0', 'h2'], color: '#FFE600', layer: 1 },
    ],
    screws: {
      h0: { color: '#00F5FF' },
      h1: { color: '#39FF14' },
      h2: { color: '#FF007F' },
      h3: { color: '#FFE600' },
    },
  },

  // Level 6: Double Chevron (5 bars, 2 spare holes)
  {
    name: 'DOUBLE CHEVRON',
    parMoves: 10,
    holes: [
      { id: 'h0', x: 70, y: 90 },
      { id: 'h1', x: 270, y: 90 },
      { id: 'h2', x: 170, y: 180 },
      { id: 'h3', x: 70, y: 290 },
      { id: 'h4', x: 270, y: 290 },
      { id: 'h_s1', x: 100, y: 200 },
      { id: 'h_s2', x: 240, y: 200 },
    ],
    planks: [
      { id: 'p0', name: 'UPPER LEFT', holes: ['h0', 'h2'], color: '#FF5E00', layer: 5 },
      { id: 'p1', name: 'UPPER RIGHT', holes: ['h1', 'h2'], color: '#00F5FF', layer: 4 },
      { id: 'p2', name: 'LOWER LEFT', holes: ['h3', 'h2'], color: '#39FF14', layer: 3 },
      { id: 'p3', name: 'LOWER RIGHT', holes: ['h4', 'h2'], color: '#9D4EDD', layer: 2 },
      { id: 'p4', name: 'BASE TIE', holes: ['h3', 'h4'], color: '#FFE600', layer: 1 },
    ],
    screws: {
      h0: { color: '#FF5E00' },
      h1: { color: '#00F5FF' },
      h2: { color: '#FFE600' },
      h3: { color: '#39FF14' },
      h4: { color: '#9D4EDD' },
    },
  },

  // Level 7: Hexa-Lattice (5 bars, 3 spare holes)
  {
    name: 'HEXA LATTICE',
    parMoves: 11,
    holes: [
      { id: 'h0', x: 80, y: 100 },
      { id: 'h1', x: 260, y: 100 },
      { id: 'h2', x: 60, y: 200 },
      { id: 'h3', x: 280, y: 200 },
      { id: 'h4', x: 80, y: 300 },
      { id: 'h5', x: 260, y: 300 },
      { id: 'h_s1', x: 170, y: 140 },
      { id: 'h_s2', x: 170, y: 260 },
    ],
    planks: [
      { id: 'p0', name: 'TOP HORIZON', holes: ['h0', 'h1'], color: '#00F5FF', layer: 5 },
      { id: 'p1', name: 'LEFT WING', holes: ['h0', 'h2'], color: '#FF007F', layer: 4 },
      { id: 'p2', name: 'RIGHT WING', holes: ['h1', 'h3'], color: '#FFE600', layer: 3 },
      { id: 'p3', name: 'CROSS STRUT A', holes: ['h2', 'h5'], color: '#39FF14', layer: 2 },
      { id: 'p4', name: 'BOTTOM HORIZON', holes: ['h4', 'h5'], color: '#9D4EDD', layer: 1 },
    ],
    screws: {
      h0: { color: '#00F5FF' },
      h1: { color: '#FF007F' },
      h2: { color: '#FFE600' },
      h3: { color: '#39FF14' },
      h4: { color: '#9D4EDD' },
      h5: { color: '#00F5FF' },
    },
  },

  // Level 8: Titanium Cage (6 bars, 2 spare holes)
  {
    name: 'TITANIUM CAGE',
    parMoves: 13,
    holes: [
      { id: 'h0', x: 70, y: 90 },
      { id: 'h1', x: 170, y: 90 },
      { id: 'h2', x: 270, y: 90 },
      { id: 'h3', x: 70, y: 280 },
      { id: 'h4', x: 170, y: 280 },
      { id: 'h5', x: 270, y: 280 },
      { id: 'h_s1', x: 120, y: 185 },
      { id: 'h_s2', x: 220, y: 185 },
    ],
    planks: [
      { id: 'p0', name: 'TOP HORIZON', holes: ['h0', 'h2'], color: '#00F5FF', layer: 6 },
      { id: 'p1', name: 'LEFT POST', holes: ['h0', 'h3'], color: '#FF007F', layer: 5 },
      { id: 'p2', name: 'CENTER POST', holes: ['h1', 'h4'], color: '#FFE600', layer: 4 },
      { id: 'p3', name: 'RIGHT POST', holes: ['h2', 'h5'], color: '#39FF14', layer: 3 },
      { id: 'p4', name: 'DIAGONAL CROSS', holes: ['h0', 'h5'], color: '#FF5E00', layer: 2 },
      { id: 'p5', name: 'BASE HORIZON', holes: ['h3', 'h5'], color: '#9D4EDD', layer: 1 },
    ],
    screws: {
      h0: { color: '#00F5FF' },
      h1: { color: '#FF007F' },
      h2: { color: '#FFE600' },
      h3: { color: '#39FF14' },
      h4: { color: '#FF5E00' },
      h5: { color: '#9D4EDD' },
    },
  },

  // Level 9: Neo Labyrinth (6 bars, 3 spare holes)
  {
    name: 'NEO LABYRINTH',
    parMoves: 14,
    holes: [
      { id: 'h0', x: 80, y: 80 },
      { id: 'h1', x: 260, y: 80 },
      { id: 'h2', x: 170, y: 140 },
      { id: 'h3', x: 80, y: 220 },
      { id: 'h4', x: 260, y: 220 },
      { id: 'h5', x: 170, y: 300 },
      { id: 'h_s1', x: 100, y: 150 },
      { id: 'h_s2', x: 240, y: 150 },
      { id: 'h_s3', x: 170, y: 220 },
    ],
    planks: [
      { id: 'p0', name: 'ROOF BEAM', holes: ['h0', 'h1'], color: '#00F5FF', layer: 6 },
      { id: 'p1', name: 'CHEVRON LEFT', holes: ['h0', 'h2'], color: '#39FF14', layer: 5 },
      { id: 'p2', name: 'CHEVRON RIGHT', holes: ['h1', 'h2'], color: '#FF007F', layer: 4 },
      { id: 'p3', name: 'MID HORIZON', holes: ['h3', 'h4'], color: '#FFE600', layer: 3 },
      { id: 'p4', name: 'V-LEFT', holes: ['h3', 'h5'], color: '#FF5E00', layer: 2 },
      { id: 'p5', name: 'V-RIGHT', holes: ['h4', 'h5'], color: '#9D4EDD', layer: 1 },
    ],
    screws: {
      h0: { color: '#00F5FF' },
      h1: { color: '#39FF14' },
      h2: { color: '#FF007F' },
      h3: { color: '#FFE600' },
      h4: { color: '#FF5E00' },
      h5: { color: '#9D4EDD' },
    },
  },

  // Level 10: Nano Reactor (7 bars, 3 spare holes)
  {
    name: 'NANO REACTOR CORE',
    parMoves: 16,
    holes: [
      { id: 'h0', x: 170, y: 70 },
      { id: 'h1', x: 270, y: 140 },
      { id: 'h2', x: 270, y: 260 },
      { id: 'h3', x: 170, y: 330 },
      { id: 'h4', x: 70, y: 260 },
      { id: 'h5', x: 70, y: 140 },
      { id: 'h6', x: 170, y: 200 }, // Center
      { id: 'h_s1', x: 120, y: 130 },
      { id: 'h_s2', x: 220, y: 130 },
      { id: 'h_s3', x: 170, y: 270 },
    ],
    planks: [
      { id: 'p0', name: 'SPOKE N', holes: ['h0', 'h6'], color: '#00F5FF', layer: 7 },
      { id: 'p1', name: 'SPOKE NE', holes: ['h1', 'h6'], color: '#FF007F', layer: 6 },
      { id: 'p2', name: 'SPOKE SE', holes: ['h2', 'h6'], color: '#FFE600', layer: 5 },
      { id: 'p3', name: 'SPOKE S', holes: ['h3', 'h6'], color: '#39FF14', layer: 4 },
      { id: 'p4', name: 'SPOKE SW', holes: ['h4', 'h6'], color: '#9D4EDD', layer: 3 },
      { id: 'p5', name: 'SPOKE NW', holes: ['h5', 'h6'], color: '#FF5E00', layer: 2 },
      { id: 'p6', name: 'CROSS SHIELD', holes: ['h5', 'h1'], color: '#00F5D4', layer: 1 },
    ],
    screws: {
      h0: { color: '#00F5FF' },
      h1: { color: '#FF007F' },
      h2: { color: '#FFE600' },
      h3: { color: '#39FF14' },
      h4: { color: '#9D4EDD' },
      h5: { color: '#FF5E00' },
      h6: { color: '#00F5D4' },
    },
  },

  // Level 11: Vortex Weave (8 bars, 3 spare holes)
  {
    name: 'VORTEX WEAVE',
    parMoves: 18,
    holes: [
      { id: 'h0', x: 70, y: 80 },
      { id: 'h1', x: 270, y: 80 },
      { id: 'h2', x: 70, y: 180 },
      { id: 'h3', x: 270, y: 180 },
      { id: 'h4', x: 70, y: 280 },
      { id: 'h5', x: 270, y: 280 },
      { id: 'h_s1', x: 170, y: 110 },
      { id: 'h_s2', x: 170, y: 210 },
      { id: 'h_s3', x: 170, y: 310 },
    ],
    planks: [
      { id: 'p0', name: 'ROW 1', holes: ['h0', 'h1'], color: '#00F5FF', layer: 8 },
      { id: 'p1', name: 'ROW 2', holes: ['h2', 'h3'], color: '#FF007F', layer: 7 },
      { id: 'p2', name: 'ROW 3', holes: ['h4', 'h5'], color: '#FFE600', layer: 6 },
      { id: 'p3', name: 'LEFT COL', holes: ['h0', 'h4'], color: '#39FF14', layer: 5 },
      { id: 'p4', name: 'RIGHT COL', holes: ['h1', 'h5'], color: '#9D4EDD', layer: 4 },
      { id: 'p5', name: 'DIAGONAL A', holes: ['h0', 'h3'], color: '#FF5E00', layer: 3 },
      { id: 'p6', name: 'DIAGONAL B', holes: ['h2', 'h5'], color: '#00F5D4', layer: 2 },
      { id: 'p7', name: 'CENTER TIE', holes: ['h1', 'h4'], color: '#4D96FF', layer: 1 },
    ],
    screws: {
      h0: { color: '#00F5FF' },
      h1: { color: '#FF007F' },
      h2: { color: '#FFE600' },
      h3: { color: '#39FF14' },
      h4: { color: '#9D4EDD' },
      h5: { color: '#FF5E00' },
    },
  },

  // Level 12: Apex Overdrive (8 bars, Master Challenge)
  {
    name: 'APEX OVERDRIVE',
    parMoves: 20,
    holes: [
      { id: 'h0', x: 80, y: 70 },
      { id: 'h1', x: 260, y: 70 },
      { id: 'h2', x: 170, y: 130 },
      { id: 'h3', x: 60, y: 210 },
      { id: 'h4', x: 280, y: 210 },
      { id: 'h5', x: 170, y: 270 },
      { id: 'h6', x: 80, y: 330 },
      { id: 'h7', x: 260, y: 330 },
      { id: 'h_s1', x: 120, y: 200 },
      { id: 'h_s2', x: 220, y: 200 },
      { id: 'h_s3', x: 170, y: 200 },
    ],
    planks: [
      { id: 'p0', name: 'TITAN NORTH', holes: ['h0', 'h1'], color: '#00F5FF', layer: 8 },
      { id: 'p1', name: 'NORTH CHEVRON', holes: ['h0', 'h2'], color: '#FF007F', layer: 7 },
      { id: 'p2', name: 'NORTH LINK', holes: ['h1', 'h2'], color: '#FFE600', layer: 6 },
      { id: 'p3', name: 'OUTER LEFT', holes: ['h3', 'h6'], color: '#39FF14', layer: 5 },
      { id: 'p4', name: 'OUTER RIGHT', holes: ['h4', 'h7'], color: '#9D4EDD', layer: 4 },
      { id: 'p5', name: 'SOUTH LINK', holes: ['h5', 'h6'], color: '#FF5E00', layer: 3 },
      { id: 'p6', name: 'SOUTH CHEVRON', holes: ['h5', 'h7'], color: '#00F5D4', layer: 2 },
      { id: 'p7', name: 'TITAN SOUTH', holes: ['h6', 'h7'], color: '#4D96FF', layer: 1 },
    ],
    screws: {
      h0: { color: '#00F5FF' },
      h1: { color: '#FF007F' },
      h2: { color: '#FFE600' },
      h3: { color: '#39FF14' },
      h4: { color: '#9D4EDD' },
      h5: { color: '#FF5E00' },
      h6: { color: '#00F5D4' },
      h7: { color: '#4D96FF' },
    },
  },
];

/**
 * Procedural Endless Level Generator (for Level 13+)
 */
function generateProceduralLevel(levelNum) {
  const barCount = Math.min(8, 4 + Math.floor((levelNum - 12) / 2));
  const holes = [];
  const planks = [];
  const screws = {};

  // Grid coordinates
  const rows = 3;
  const cols = 3;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      holes.push({
        id: `h_${r}_${c}`,
        x: 80 + c * 90,
        y: 100 + r * 95,
      });
    }
  }

  // Extra 2 spare sockets
  holes.push({ id: 'h_spare_top', x: 170, y: 55 });
  holes.push({ id: 'h_spare_bot', x: 170, y: 345 });

  // Connect pairs of holes for struts
  const availableIndices = [];
  for (let i = 0; i < 9; i++) availableIndices.push(i);

  for (let i = 0; i < barCount; i++) {
    const idx1 = availableIndices[i % availableIndices.length];
    const idx2 = (idx1 + 1 + (i % 3)) % 9;
    const h1 = holes[idx1].id;
    const h2 = holes[idx2].id;
    const color = STRUT_COLORS[i % STRUT_COLORS.length];

    planks.push({
      id: `proc_p_${i}`,
      name: `STRUT ${i + 1}`,
      holes: [h1, h2],
      color,
      layer: barCount - i,
    });

    screws[h1] = { color };
    screws[h2] = { color };
  }

  return {
    name: `ENDLESS CORE // LVL ${levelNum}`,
    parMoves: barCount * 2 + 4,
    holes,
    planks,
    screws,
  };
}

/**
 * Helper to clone deep level config
 */
function cloneLevel(cfg) {
  return {
    name: cfg.name,
    parMoves: cfg.parMoves,
    holes: cfg.holes.map((h) => ({ ...h })),
    planks: cfg.planks.map((p) => ({ ...p, holes: [...p.holes] })),
    screws: { ...cfg.screws },
  };
}

/**
 * Independent Animated Strut Plank Component
 * Encapsulates dropping and pivoting physics to comply with React 19 rules.
 */
function StrutPlank({
  plank,
  h1,
  h2,
  isFallen,
  remainingScrewsCount,
  onPlankDropStarted,
  onPlankDropFinished,
}) {
  const [translateY] = useState(() => new Animated.Value(0));
  const [rotate] = useState(() => new Animated.Value(0));
  const [opacity] = useState(() => new Animated.Value(1));
  const isDroppingRef = useRef(false);

  // Geometric calculations
  const dx = h2.x - h1.x;
  const dy = h2.y - h1.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const initialAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const cx = (h1.x + h2.x) / 2;
  const cy = (h1.y + h2.y) / 2;
  const barWidth = length + 44;
  const barHeight = 38;

  useEffect(() => {
    if (isFallen) return;

    if (remainingScrewsCount === 0) {
      if (isDroppingRef.current) return;
      isDroppingRef.current = true;
      onPlankDropStarted?.(plank, cx, cy);

      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 500,
          duration: 550,
          easing: Easing.bezier(0.4, 0, 1, 1),
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: 35,
          duration: 550,
          easing: Easing.quad,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 450,
          delay: 100,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onPlankDropFinished?.(plank.id);
      });
    } else if (remainingScrewsCount === 1) {
      Animated.spring(rotate, {
        toValue: 20,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(rotate, {
        toValue: 0,
        friction: 6,
        useNativeDriver: true,
      }).start();
    }
  }, [remainingScrewsCount, isFallen, plank, cx, cy, onPlankDropStarted, onPlankDropFinished, translateY, rotate, opacity]);

  if (isFallen) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.plankView,
        {
          width: barWidth,
          height: barHeight,
          left: cx - barWidth / 2,
          top: cy - barHeight / 2,
          transform: [
            { translateY },
            {
              rotate: rotate.interpolate({
                inputRange: [-180, 180],
                outputRange: [`${initialAngle - 180}deg`, `${initialAngle + 180}deg`],
              }),
            },
          ],
          opacity,
        },
      ]}
    >
      <Svg width={barWidth} height={barHeight}>
        <Defs>
          <SvgLinearGradient id={`plankGrad_${plank.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={plank.color} stopOpacity="0.35" />
            <Stop offset="50%" stopColor="#0B0D1A" stopOpacity="0.85" />
            <Stop offset="100%" stopColor={plank.color} stopOpacity="0.35" />
          </SvgLinearGradient>
        </Defs>

        {/* Main Strut Capsule Body */}
        <Rect
          x={2}
          y={2}
          width={barWidth - 4}
          height={barHeight - 4}
          rx={17}
          fill={`url(#plankGrad_${plank.id})`}
          stroke={plank.color}
          strokeWidth={2.2}
        />

        {/* Center Energy Core Line */}
        <Line
          x1={24}
          y1={barHeight / 2}
          x2={barWidth - 24}
          y2={barHeight / 2}
          stroke={plank.color}
          strokeWidth={2}
          opacity={0.6}
          strokeDasharray="6 3"
        />

        {/* Drilled Holes Grommets at endpoints */}
        <Circle cx={22} cy={barHeight / 2} r={15} fill="#060812" stroke={plank.color} strokeWidth={1.5} />
        <Circle
          cx={barWidth - 22}
          cy={barHeight / 2}
          r={15}
          fill="#060812"
          stroke={plank.color}
          strokeWidth={1.5}
        />
      </Svg>
    </Animated.View>
  );
}

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

  // Active level state (initialized lazily to avoid React 19 setState in effect)
  const [levelConfig, setLevelConfig] = useState(() => cloneLevel(CURATED_LEVELS[0]));
  const [screws, setScrews] = useState(() => ({ ...CURATED_LEVELS[0].screws }));
  const [fallenPlanks, setFallenPlanks] = useState(() => new Set());
  const [selectedHoleId, setSelectedHoleId] = useState(null);
  const [undoStack, setUndoStack] = useState([]);
  const [isWon, setIsWon] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);

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
    const config =
      lvl <= CURATED_LEVELS.length
        ? cloneLevel(CURATED_LEVELS[lvl - 1])
        : generateProceduralLevel(lvl);

    setLevelConfig(config);
    setScrews({ ...config.screws });
    setFallenPlanks(new Set());
    setSelectedHoleId(null);
    setUndoStack([]);
    setMovesCount(0);
    setIsWon(false);
    setShowResultModal(false);
  }, []);

  // Map of hole ID to Hole object for quick lookup
  const holeMap = useMemo(() => {
    const map = {};
    levelConfig.holes.forEach((h) => {
      map[h.id] = h;
    });
    return map;
  }, [levelConfig.holes]);

  // Check victory callback
  const checkVictory = useCallback(
    (currentFallenSet) => {
      if (currentFallenSet.size === levelConfig.planks.length) {
        setIsWon(true);
        triggerPerfectHaptic();
        playPerfectSound();

        const parBonus = Math.max(0, (levelConfig.parMoves - movesCount) * 20);
        const earned = 200 + currentLevel * 100 + parBonus;
        const nextScore = totalScore + earned;
        setTotalScore(nextScore);

        if (nextScore > highScore) {
          setHighScore(nextScore);
          AsyncStorage.setItem(STORAGE_KEY, String(nextScore)).catch(() => {});
        }
        onScoreUpdate?.(nextScore);

        juiceRef.current?.celebrate(
          '⚡ ALL STRUTS DISMANTLED!',
          `Cleared in ${movesCount + 1} moves! +${earned} PTS`,
          COLORS.matrixMint
        );

        setTimeout(() => {
          setShowResultModal(true);
        }, 1200);
      }
    },
    [levelConfig.planks.length, levelConfig.parMoves, movesCount, currentLevel, totalScore, highScore, onScoreUpdate]
  );

  // Plank drop event handlers
  const handlePlankDropStarted = useCallback((plank, cx, cy) => {
    juiceRef.current?.burst(cx, cy, plank.color, 16);
    juiceRef.current?.shake(3, 4);
    playPerfectSound();
    triggerLightHaptic();
  }, []);

  const handlePlankDropFinished = useCallback(
    (plankId) => {
      setFallenPlanks((prev) => {
        const next = new Set(prev);
        next.add(plankId);
        checkVictory(next);
        return next;
      });
    },
    [checkVictory]
  );

  // Handle tap on a hole (either selecting a screw or moving selected screw into empty hole)
  const handleHolePress = useCallback(
    (holeId) => {
      if (isPaused || isWon) return;

      const hasScrew = !!screws[holeId];

      if (!selectedHoleId) {
        // No screw selected yet
        if (hasScrew) {
          // Select this screw!
          setSelectedHoleId(holeId);
          playSliceSound();
          triggerSelectionHaptic();
        } else {
          // Tapped empty hole with nothing selected
          playSnapTickSound();
          triggerLightHaptic();
        }
      } else {
        // A screw is already selected
        if (selectedHoleId === holeId) {
          // Tapped the same screw -> Deselect
          setSelectedHoleId(null);
          playSnapTickSound();
          triggerLightHaptic();
        } else if (hasScrew) {
          // Tapped another screw -> Switch selection to the new screw
          setSelectedHoleId(holeId);
          playSliceSound();
          triggerSelectionHaptic();
        } else {
          // Tapped an EMPTY hole -> RELOCATE SCREW HERE!
          const movingScrew = screws[selectedHoleId];
          const nextScrews = { ...screws };
          delete nextScrews[selectedHoleId];
          nextScrews[holeId] = movingScrew;

          // Push move to undo stack
          setUndoStack((prev) => [
            ...prev,
            {
              fromHole: selectedHoleId,
              toHole: holeId,
              screwsSnapshot: { ...screws },
              fallenSnapshot: new Set(fallenPlanks),
            },
          ]);

          setScrews(nextScrews);
          setSelectedHoleId(null);
          setMovesCount((m) => m + 1);

          playTapSound();
          triggerMediumHaptic();

          // Flash socket juice
          const destHole = holeMap[holeId];
          if (destHole) {
            juiceRef.current?.burst(destHole.x, destHole.y, movingScrew.color, 8);
          }
        }
      }
    },
    [isPaused, isWon, screws, selectedHoleId, fallenPlanks, holeMap]
  );

  // Undo previous screw relocation
  const handleUndo = useCallback(() => {
    if (isPaused || undoStack.length === 0 || isWon) return;

    const lastMove = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));

    setScrews(lastMove.screwsSnapshot);
    setFallenPlanks(new Set(lastMove.fallenSnapshot));
    setSelectedHoleId(null);

    playTapSound();
    triggerLightHaptic();
    juiceRef.current?.popup('↺ UNDO', 'Move reverted', COLORS.cyan);
  }, [isPaused, undoStack, isWon]);

  // Restart current level
  const handleRestart = useCallback(() => {
    if (isPaused) return;
    initLevel(currentLevel);
    playTapSound();
    triggerLightHaptic();
    juiceRef.current?.popup('⚡ RESTART', `Level ${currentLevel} reset`, COLORS.solarGold);
  }, [isPaused, initLevel, currentLevel]);

  // Hint: Highlights a recommended screw to relocate
  const handleHint = useCallback(() => {
    if (isPaused || isWon) return;

    // Find a plank that has only 1 or 2 screws left
    const activePlanks = levelConfig.planks.filter((p) => !fallenPlanks.has(p.id));
    if (activePlanks.length === 0) return;

    // Pick top layer active plank
    const targetPlank = activePlanks.reduce((top, p) => (p.layer > top.layer ? p : top), activePlanks[0]);
    const screwHole = targetPlank.holes.find((hId) => !!screws[hId]);

    // Find an empty hole
    const emptyHole = levelConfig.holes.find((h) => !screws[h.id]);

    if (screwHole && emptyHole) {
      setSelectedHoleId(screwHole);
      juiceRef.current?.popup('💡 TACTICAL HINT', `Relocate bolt from ${targetPlank.name}`, targetPlank.color);
      playTapSound();
      triggerMediumHaptic();
    }
  }, [isPaused, isWon, levelConfig.planks, levelConfig.holes, fallenPlanks, screws]);

  // Next level handler
  const handleNextLevel = useCallback(() => {
    initLevel(currentLevel + 1);
    setCurrentLevel((lvl) => lvl + 1);
  }, [initLevel, currentLevel]);

  // Calculate remaining struts count
  const remainingCount = levelConfig.planks.length - fallenPlanks.size;

  return (
    <View style={styles.container}>
      <MiniGameHeader
        title="CYBER SCREW PIN"
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
              <Text style={styles.statDim}>MOVES</Text>
              <Text style={styles.statBright}>{movesCount}</Text>
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
            {/* Background Grid & Cyber Border */}
            <Svg width={BOARD_W} height={BOARD_H} style={StyleSheet.absoluteFill}>
              <Defs>
                <SvgRadialGradient id="bgGrad" cx="50%" cy="50%" r="60%">
                  <Stop offset="0%" stopColor="#141829" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#080A14" stopOpacity="1" />
                </SvgRadialGradient>
              </Defs>

              {/* Panel Base */}
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

              {/* High-tech Corner Decals */}
              <Path d="M 8 28 L 8 8 L 28 8" stroke="#00F5FF" strokeWidth={2} fill="none" />
              <Path
                d={`M ${BOARD_W - 28} 8 L ${BOARD_W - 8} 8 L ${BOARD_W - 8} 28`}
                stroke="#00F5FF"
                strokeWidth={2}
                fill="none"
              />
              <Path
                d={`M 8 ${BOARD_H - 28} L 8 ${BOARD_H - 8} L 28 ${BOARD_H - 8}`}
                stroke="#00F5FF"
                strokeWidth={2}
                fill="none"
              />
              <Path
                d={`M ${BOARD_W - 28} ${BOARD_H - 8} L ${BOARD_W - 8} ${BOARD_H - 8} L ${BOARD_W - 8} ${BOARD_H - 28}`}
                stroke="#00F5FF"
                strokeWidth={2}
                fill="none"
              />

              {/* Subtle Tech Lines */}
              <Line x1={20} y1={50} x2={BOARD_W - 20} y2={50} stroke="#00F5FF15" strokeDasharray="4 4" />
              <Line
                x1={20}
                y1={BOARD_H - 50}
                x2={BOARD_W - 20}
                y2={BOARD_H - 50}
                stroke="#00F5FF15"
                strokeDasharray="4 4"
              />

              {/* Base Sockets (Empty Holes Background) */}
              {levelConfig.holes.map((h) => {
                const isSelected = selectedHoleId === h.id;
                const hasBolt = !!screws[h.id];
                return (
                  <G key={`socket_bg_${h.id}`}>
                    {/* Socket Recessed Cavity */}
                    <Circle
                      cx={h.x}
                      cy={h.y}
                      r={19}
                      fill="#060810"
                      stroke={isSelected ? '#FFE600' : hasBolt ? '#00F5FF33' : '#00F5FF66'}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                    />
                    <Circle cx={h.x} cy={h.y} r={13} fill="#020306" />
                    {/* Socket Thread Cross */}
                    {!hasBolt && (
                      <G opacity={0.4}>
                        <Line x1={h.x - 7} y1={h.y} x2={h.x + 7} y2={h.y} stroke="#00F5FF" strokeWidth={1} />
                        <Line x1={h.x} y1={h.y - 7} x2={h.x} y2={h.y + 7} stroke="#00F5FF" strokeWidth={1} />
                      </G>
                    )}
                  </G>
                );
              })}
            </Svg>

            {/* Overlapping Planks / Struts Layer (Sorted by layer) */}
            {levelConfig.planks
              .slice()
              .sort((a, b) => a.layer - b.layer)
              .map((plank) => {
                const h1 = holeMap[plank.holes[0]];
                const h2 = holeMap[plank.holes[1]];
                if (!h1 || !h2) return null;

                const remainingScrews = plank.holes.filter((hId) => !!screws[hId]).length;

                return (
                  <StrutPlank
                    key={`plank_${plank.id}`}
                    plank={plank}
                    h1={h1}
                    h2={h2}
                    isFallen={fallenPlanks.has(plank.id)}
                    remainingScrewsCount={remainingScrews}
                    onPlankDropStarted={handlePlankDropStarted}
                    onPlankDropFinished={handlePlankDropFinished}
                  />
                );
              })}

            {/* Interactive Screws & Sockets Layer */}
            {levelConfig.holes.map((hole) => {
              const screw = screws[hole.id];
              const isSelected = selectedHoleId === hole.id;

              return (
                <Pressable
                  key={`hole_touch_${hole.id}`}
                  style={[
                    styles.holeTouchTarget,
                    {
                      left: hole.x - 28,
                      top: hole.y - 28,
                    },
                  ]}
                  onPress={() => handleHolePress(hole.id)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  {/* Empty Hole Target Ring (when a screw is selected and this socket is empty) */}
                  {!screw && selectedHoleId && (
                    <View style={styles.openTargetPulse}>
                      <View style={styles.openTargetInner} />
                    </View>
                  )}

                  {/* Active Plasma Screw / Bolt */}
                  {screw && (
                    <View
                      style={[
                        styles.boltHead,
                        isSelected && styles.boltHeadSelected,
                        { borderColor: isSelected ? '#FFE600' : screw.color },
                      ]}
                    >
                      <Svg width={36} height={36} viewBox="0 0 36 36">
                        <Defs>
                          <SvgRadialGradient id={`screwCap_${hole.id}`} cx="40%" cy="35%" r="60%">
                            <Stop offset="0%" stopColor="#4A5568" />
                            <Stop offset="70%" stopColor="#1A202C" />
                            <Stop offset="100%" stopColor="#0D1117" />
                          </SvgRadialGradient>
                        </Defs>

                        {/* Bolt Flange */}
                        <Circle cx={18} cy={18} r={16} fill={`url(#screwCap_${hole.id})`} />
                        <Circle
                          cx={18}
                          cy={18}
                          r={16}
                          fill="none"
                          stroke={isSelected ? '#FFE600' : screw.color}
                          strokeWidth={2}
                        />

                        {/* Metallic Phillips Head Cutouts (+) */}
                        <Line
                          x1={10}
                          y1={18}
                          x2={26}
                          y2={18}
                          stroke={isSelected ? '#FFE600' : '#FFFFFF'}
                          strokeWidth={3.5}
                          strokeLinecap="round"
                        />
                        <Line
                          x1={18}
                          y1={10}
                          x2={18}
                          y2={26}
                          stroke={isSelected ? '#FFE600' : '#FFFFFF'}
                          strokeWidth={3.5}
                          strokeLinecap="round"
                        />

                        {/* Glowing Central Quantum Core */}
                        <Circle cx={18} cy={18} r={4.5} fill={isSelected ? '#FFE600' : screw.color} />
                      </Svg>
                    </View>
                  )}
                </Pressable>
              );
            })}
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

      {/* Victory / Next Level Modal */}
      <GameResultModal
        visible={showResultModal}
        type="VICTORY"
        title="CORE UNLOCKED!"
        subtitle={`All struts cleared in ${movesCount} moves!`}
        score={totalScore}
        bestScore={highScore}
        accentColor="#FFE600"
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
    paddingVertical: 10,
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
  plankView: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  holeTouchTarget: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
  },
  boltHead: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    backgroundColor: '#101424',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.6,
    shadowRadius: 5,
    elevation: 6,
  },
  boltHeadSelected: {
    transform: [{ scale: 1.25 }],
    shadowColor: '#FFE600',
    shadowOpacity: 0.85,
    shadowRadius: 10,
    elevation: 12,
  },
  openTargetPulse: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#00F5FF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 245, 255, 0.12)',
  },
  openTargetInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00F5FF',
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
