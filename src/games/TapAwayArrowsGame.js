import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  Platform,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Path,
  Polygon,
  Rect,
  G,
  Line,
  Circle,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import JuiceEngine from '../components/JuiceEngine';
import {
  playTapSound,
  playSliceSound,
  playGameOverSound,
  playPerfectSound,
} from '../utils/sound';
import {
  triggerLightHaptic,
  triggerMediumHaptic,
  triggerGameOverHaptic,
  triggerPerfectHaptic,
} from '../utils/haptics';

const COLS = 10;
const ROWS = 14;

const DIRS = [
  { dr: -1, dc: 0, name: 'UP' },
  { dr: 0, dc: 1, name: 'RIGHT' },
  { dr: 1, dc: 0, name: 'DOWN' },
  { dr: 0, dc: -1, name: 'LEFT' },
];

const STORAGE_LEVEL_KEY = '@game_tower:level_arrows_v1';
const STORAGE_BEST_KEY = '@game_tower:best_arrows_v1';

// Theme color definitions - exact Arrow Go aesthetic
const THEMES = {
  CREAM: {
    name: 'CREAM',
    bg: '#F6EFE5',
    boardBg: '#F6EFE5',
    gridDot: '#DDD1BF',
    headerText: '#B47641',
    headerIcon: '#B47641',
    divider: '#EAE0D0',
    cardBg: '#FFFFFF',
    cardText: '#B47641',
    dropletActive: '#38A6F5',
    dropletInactive: '#D4C7B5',
    arrowBlocked: '#2E2018',
    arrowMovableStart: '#F5A623',
    arrowMovableEnd: '#FFD15C',
    rainbowStart: '#00C9A7',
    rainbowMid: '#845EC2',
    rainbowEnd: '#FFC75F',
    errorFlash: '#E74C3C',
  },
  DARK: {
    name: 'DARK',
    bg: '#181310',
    boardBg: '#181310',
    gridDot: '#382D26',
    headerText: '#E6A872',
    headerIcon: '#E6A872',
    divider: '#2E221B',
    cardBg: '#251D18',
    cardText: '#E6A872',
    dropletActive: '#38A6F5',
    dropletInactive: '#4A3B31',
    arrowBlocked: '#E8D8C4',
    arrowMovableStart: '#F5A623',
    arrowMovableEnd: '#FFD15C',
    rainbowStart: '#00C9A7',
    rainbowMid: '#845EC2',
    rainbowEnd: '#FFC75F',
    errorFlash: '#FF4757',
  },
};

const PATTERN_TYPES = [
  {
    name: 'LABYRINTH PRISM',
    mask: (r, c, midR, midC) =>
      Math.abs(r - midR) * 1.05 + Math.abs(c - midC) * 1.35 <= 5.8,
    minCount: 22,
    maxCount: 34,
  },
  {
    name: 'EXPANSE MAZE',
    mask: (r, c) => r >= 1 && r <= ROWS - 2 && c >= 1 && c <= COLS - 2,
    minCount: 24,
    maxCount: 38,
  },
  {
    name: 'TITAN CROSS',
    mask: (r, c, midR, midC) =>
      (Math.abs(c - midC) <= 2 && Math.abs(r - midR) <= 5) ||
      (Math.abs(r - midR) <= 2 && Math.abs(c - midC) <= 4),
    minCount: 20,
    maxCount: 32,
  },
  {
    name: 'SPIRAL CITADEL',
    mask: (r, c, midR, midC) =>
      Math.abs(r - midR) <= 5 &&
      Math.abs(c - midC) <= 4 &&
      Math.abs(r - midR) + Math.abs(c - midC) <= 7,
    minCount: 22,
    maxCount: 36,
  },
];

/**
 * Reverse-generate guaranteed 100% solvable labyrinths
 * Strictly packs arrows directly adjacent to each other with turns and bends
 */
function generatePatternArrows(lvl = 1) {
  const patternIndex = (lvl - 1) % PATTERN_TYPES.length;
  const pattern = PATTERN_TYPES[patternIndex];
  const targetCount = Math.min(
    pattern.maxCount,
    pattern.minCount + Math.floor(lvl * 0.75)
  );

  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  const arrows = [];
  const placedPoints = [];
  const midR = Math.floor(ROWS / 2);
  const midC = Math.floor(COLS / 2);

  for (let id = 0; id < targetCount; id++) {
    let placed = false;

    // Gather candidate cells inside the pattern mask
    const candidates = [];
    if (placedPoints.length === 0) {
      candidates.push({ r: midR, c: midC });
      candidates.push({ r: midR - 1, c: midC });
      candidates.push({ r: midR + 1, c: midC });
      candidates.push({ r: midR, c: midC - 1 });
      candidates.push({ r: midR, c: midC + 1 });
    } else {
      for (let r = 1; r < ROWS - 1; r++) {
        for (let c = 1; c < COLS - 1; c++) {
          if (grid[r][c] === null && pattern.mask(r, c, midR, midC)) {
            const isAdj = placedPoints.some(
              (p) => Math.abs(p.r - r) + Math.abs(p.c - c) === 1
            );
            if (isAdj) candidates.push({ r, c });
          }
        }
      }
    }

    if (candidates.length === 0) {
      for (let r = 1; r < ROWS - 1; r++) {
        for (let c = 1; c < COLS - 1; c++) {
          if (grid[r][c] === null && pattern.mask(r, c, midR, midC)) {
            const isNear = placedPoints.some(
              (p) => Math.abs(p.r - r) + Math.abs(p.c - c) <= 2
            );
            if (isNear) candidates.push({ r, c });
          }
        }
      }
    }

    // Try candidates in random order
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    for (const cand of candidates) {
      const hr = cand.r;
      const hc = cand.c;
      const dIdx = Math.floor(Math.random() * 4);
      const dir = DIRS[dIdx];

      if (grid[hr][hc] !== null) continue;

      // Raycast check: must have open ray to border
      let rayR = hr + dir.dr;
      let rayC = hc + dir.dc;
      let rayClear = true;
      while (rayR >= 0 && rayR < ROWS && rayC >= 0 && rayC < COLS) {
        if (grid[rayR][rayC] !== null) {
          rayClear = false;
          break;
        }
        rayR += dir.dr;
        rayC += dir.dc;
      }
      if (!rayClear) continue;

      // First step backwards MUST be opposite to dir so line enters straight
      const step1R = hr - dir.dr;
      const step1C = hc - dir.dc;
      if (
        step1R < 0 ||
        step1R >= ROWS ||
        step1C < 0 ||
        step1C >= COLS ||
        grid[step1R][step1C] !== null ||
        !pattern.mask(step1R, step1C, midR, midC)
      ) {
        continue;
      }

      const path = [
        { r: hr, c: hc },
        { r: step1R, c: step1C },
      ];
      let curR = step1R;
      let curC = step1C;
      let bodyDir = (dIdx + 2) % 4;

      // Scale path length for realistic multi-turn maze shapes
      const maxLen = Math.min(8, 3 + Math.floor(lvl / 3));
      const len = 2 + Math.floor(Math.random() * (maxLen - 1));

      for (let s = 2; s < len; s++) {
        // Preference for straight or 90-degree turns
        const choices = [bodyDir, (bodyDir + 1) % 4, (bodyDir + 3) % 4];
        let found = false;
        for (const testIdx of choices) {
          const td = DIRS[testIdx];
          const nr = curR + td.dr;
          const nc = curC + td.dc;
          if (
            nr >= 0 &&
            nr < ROWS &&
            nc >= 0 &&
            nc < COLS &&
            grid[nr][nc] === null &&
            pattern.mask(nr, nc, midR, midC) &&
            !path.some((p) => p.r === nr && p.c === nc)
          ) {
            curR = nr;
            curC = nc;
            bodyDir = testIdx;
            path.push({ r: curR, c: curC });
            found = true;
            break;
          }
        }
        if (!found) break;
      }

      if (path.length >= 2) {
        const isRainbow = id % 5 === 1;
        const arrow = {
          id: 'arr_' + id + '_' + Math.random().toString(36).substring(2, 6),
          path: path.reverse(), // head is last element
          headDir: dir.name,
          dr: dir.dr,
          dc: dir.dc,
          isRainbow,
        };

        for (const pt of arrow.path) {
          grid[pt.r][pt.c] = arrow.id;
          placedPoints.push(pt);
        }

        arrows.push(arrow);
        placed = true;
        break;
      }
    }

    if (!placed && arrows.length >= pattern.minCount) {
      break;
    }
  }

  return { arrows, patternName: pattern.name };
}

export default function TapAwayArrowsGame({
  onBackToHub,
  onScoreUpdate,
  isPaused = false,
}) {
  const insets = useSafeAreaInsets();
  const isPausedRef = useRef(isPaused);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const { width } = useWindowDimensions();

  // Maze board dimensions: clean responsive fit
  const boardPadding = 12;
  const boardWidth = Math.min(width - 24, 380);
  const cellW = (boardWidth - boardPadding * 2) / COLS;
  const cellH = cellW * 1.1;
  const boardHeight = cellH * ROWS + boardPadding * 2;

  const MAX_MISTAKES = 3;
  const [level, setLevel] = useState(1);
  const [bestScore, setBestScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [score, setScore] = useState(0);
  const [arrows, setArrows] = useState([]);
  const [blockedArrowId, setBlockedArrowId] = useState(null);
  const [hintedArrowId, setHintedArrowId] = useState(null);

  // Escaping animated arrows
  const [escapingArrows, setEscapingArrows] = useState([]);
  const escapingRef = useRef([]);
  useEffect(() => {
    escapingRef.current = escapingArrows;
  }, [escapingArrows]);
  const animFrameRef = useRef(null);

  // Modals & themes
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('VICTORY');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [themeMode, setThemeMode] = useState('CREAM');
  const theme = THEMES[themeMode] || THEMES.CREAM;

  const juiceRef = useRef(null);

  // Load saved progress
  useEffect(() => {
    (async () => {
      try {
        const savedLvl = await AsyncStorage.getItem(STORAGE_LEVEL_KEY);
        const savedScore = await AsyncStorage.getItem(STORAGE_BEST_KEY);
        if (savedLvl !== null) {
          const pLvl = parseInt(savedLvl, 10);
          if (!isNaN(pLvl) && pLvl >= 1) setLevel(pLvl);
        }
        if (savedScore !== null) {
          const pScore = parseInt(savedScore, 10);
          if (!isNaN(pScore)) setBestScore(pScore);
        }
      } catch {}
    })();
  }, []);

  // Initialize level
  const initLevel = useCallback((lvl) => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setEscapingArrows([]);
    setBlockedArrowId(null);
    setHintedArrowId(null);
    setMistakes(0);
    setModalVisible(false);
    setModalType('VICTORY');

    const generated = generatePatternArrows(lvl);
    setArrows(generated.arrows);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      initLevel(level);
    }, 0);
    return () => {
      clearTimeout(timer);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [level, initLevel]);

  // Frame Loop for Smooth Fly-Off Animation to that direction
  const runEscapeLoop = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const updateFrame = () => {
      if (isPausedRef.current) {
        animFrameRef.current = requestAnimationFrame(updateFrame);
        return;
      }
      const current = escapingRef.current;
      if (current.length === 0) return;

      const MAX_OFFSET = 550;
      const next = [];

      for (let i = 0; i < current.length; i++) {
        const item = current[i];
        const speed = 18 + Math.pow(item.progress, 0.7) * 26;
        const newOffset = item.offset + speed;
        const progress = Math.min(1, newOffset / MAX_OFFSET);

        if (progress < 1) {
          next.push({
            ...item,
            offset: newOffset,
            progress,
          });
        }
      }

      setEscapingArrows(next);

      if (next.length > 0) {
        animFrameRef.current = requestAnimationFrame(updateFrame);
      }
    };

    animFrameRef.current = requestAnimationFrame(updateFrame);
  }, []);

  // Check if arrow has clear path to exit
  const isArrowMovable = useCallback(
    (arrow, allArrows) => {
      if (!arrow || !arrow.path || arrow.path.length === 0) return false;
      const head = arrow.path[arrow.path.length - 1];
      if (!head) return false;

      let rayR = head.r + arrow.dr;
      let rayC = head.c + arrow.dc;

      while (rayR >= 0 && rayR < ROWS && rayC >= 0 && rayC < COLS) {
        for (const other of allArrows) {
          if (other && other.id !== arrow.id) {
            if (other.path && other.path.some((p) => p.r === rayR && p.c === rayC)) {
              return false;
            }
          }
        }
        rayR += arrow.dr;
        rayC += arrow.dc;
      }
      return true;
    },
    []
  );

  // Set of movable arrow IDs in real-time
  const movableArrowIds = useMemo(() => {
    const ids = new Set();
    for (const a of arrows) {
      if (isArrowMovable(a, arrows)) {
        ids.add(a.id);
      }
    }
    return ids;
  }, [arrows, isArrowMovable]);

  const movableCount = movableArrowIds.size;

  // Handle tap on the maze
  const handleBoardPress = (evt) => {
    if (isPausedRef.current) return;
    if (!evt || !evt.nativeEvent) return;
    const { locationX, locationY } = evt.nativeEvent;

    // Convert pixel coordinate to grid cell
    const c = Math.floor((locationX - boardPadding) / cellW);
    const r = Math.floor((locationY - boardPadding) / cellH);

    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;

    // Find which active arrow covers or is near this grid cell
    const clickedArrow = arrows.find(
      (a) =>
        a &&
        a.path &&
        a.path.some((pt) => Math.hypot(pt.c - c, pt.r - r) <= 0.88)
    );

    if (!clickedArrow) return;
    tryEscapeArrow(clickedArrow);
  };

  // Attempt escape
  const tryEscapeArrow = (arrow) => {
    if (!arrow || !arrow.path || arrow.path.length === 0) return;

    const canMove = movableArrowIds.has(arrow.id);

    if (!canMove) {
      // Blocked!
      const nextMistakes = mistakes + 1;
      setMistakes(nextMistakes);
      playTapSound();
      triggerLightHaptic();
      setBlockedArrowId(arrow.id);

      if (juiceRef.current) {
        juiceRef.current.shake(6, 4);
        juiceRef.current.popup(
          `BLOCKED! (${nextMistakes}/${MAX_MISTAKES})`,
          nextMistakes >= MAX_MISTAKES
            ? 'NO CHANCES LEFT!'
            : `${MAX_MISTAKES - nextMistakes} CHANCES LEFT`,
          '#FF0055'
        );
      }

      setTimeout(() => {
        setBlockedArrowId(null);
      }, 400);

      if (nextMistakes >= MAX_MISTAKES) {
        setTimeout(() => {
          playGameOverSound();
          triggerGameOverHaptic();
          setModalType('GAMEOVER');
          setModalVisible(true);
        }, 450);
      }
    } else {
      // FREE TO ESCAPE!
      playSliceSound();
      triggerMediumHaptic();

      // Remove from maze collision
      const remainingArrows = arrows.filter((a) => a.id !== arrow.id);
      setArrows(remainingArrows);
      setHintedArrowId(null);

      // Add to escaping animation list
      const newEscapingItem = {
        id: arrow.id,
        arrow,
        offset: 0,
        progress: 0,
      };

      setEscapingArrows((prev) => [...prev, newEscapingItem]);
      runEscapeLoop();

      const pts = 50 + level * 10;
      setScore((s) => {
        const ns = s + pts;
        onScoreUpdate?.(ns);
        AsyncStorage.setItem(STORAGE_BEST_KEY, String(ns)).catch(() => {});
        return ns;
      });

      if (remainingArrows.length === 0) {
        setTimeout(() => {
          playPerfectSound(8);
          triggerPerfectHaptic(3);
          if (juiceRef.current) {
            juiceRef.current.celebrate(
              'LEVEL COMPLETE!',
              `LEVEL ${level} SOLVED!`,
              '#B47641'
            );
          }
          setModalType('VICTORY');
          setModalVisible(true);
        }, 400);
      }
    }
  };

  // Hint button: Highlights or executes a free arrow
  const handleUseHint = () => {
    const freeArrows = arrows.filter((a) => movableArrowIds.has(a.id));
    if (freeArrows.length > 0) {
      const chosen = freeArrows[0];
      setHintedArrowId(chosen.id);
      playTapSound();
      triggerMediumHaptic();
      if (juiceRef.current) {
        juiceRef.current.popup(
          '💡 HINT ACTIVATED!',
          `Follow ${chosen.headDir} arrow!`,
          '#F5A623'
        );
      }
      setTimeout(() => {
        tryEscapeArrow(chosen);
      }, 250);
    } else {
      triggerLightHaptic();
      if (juiceRef.current) {
        juiceRef.current.popup('NO ARROWS FREE', 'Wait or reset', '#FF0055');
      }
    }
  };

  const handleNextLevel = () => {
    const nextLvl = level + 1;
    setLevel(nextLvl);
    AsyncStorage.setItem(STORAGE_LEVEL_KEY, String(nextLvl)).catch(() => {});
  };

  const handleToggleTheme = () => {
    triggerLightHaptic();
    setThemeMode((prev) => (prev === 'CREAM' ? 'DARK' : 'CREAM'));
  };

  // Geometry for escaping arrows
  const getEscapingGeometry = (item) => {
    const { arrow, offset } = item;
    if (!arrow || !arrow.path || arrow.path.length < 2) {
      return { pathStr: '', headPoints: '' };
    }

    const rawPts = arrow.path.map((pt) => ({
      x: boardPadding + (pt.c + 0.5) * cellW,
      y: boardPadding + (pt.r + 0.5) * cellH,
    }));
    const N = rawPts.length;

    const segLens = [];
    const cumDists = [0];
    let totalLen = 0;
    for (let i = 0; i < N - 1; i++) {
      const dx = rawPts[i + 1].x - rawPts[i].x;
      const dy = rawPts[i + 1].y - rawPts[i].y;
      const len = Math.hypot(dx, dy);
      segLens.push(len);
      totalLen += len;
      cumDists.push(totalLen);
    }

    if (totalLen <= 0.001) {
      return { pathStr: '', headPoints: '' };
    }

    const dirX = arrow.dc;
    const dirY = arrow.dr;

    const getTrackPoint = (d) => {
      if (d <= 0) return { ...rawPts[0] };
      if (d >= totalLen) {
        const over = d - totalLen;
        return {
          x: rawPts[N - 1].x + dirX * over,
          y: rawPts[N - 1].y + dirY * over,
        };
      }
      for (let i = 0; i < N - 1; i++) {
        if (d <= cumDists[i + 1]) {
          const t = segLens[i] > 0 ? (d - cumDists[i]) / segLens[i] : 0;
          return {
            x: rawPts[i].x + t * (rawPts[i + 1].x - rawPts[i].x),
            y: rawPts[i].y + t * (rawPts[i + 1].y - rawPts[i].y),
          };
        }
      }
      return { ...rawPts[N - 1] };
    };

    const tailDist = offset;
    const headDist = offset + totalLen;
    const pts = [];

    pts.push(getTrackPoint(tailDist));

    for (let i = 1; i < N - 1; i++) {
      if (cumDists[i] > tailDist + 0.8 && cumDists[i] < headDist - 0.8) {
        pts.push({ ...rawPts[i] });
      }
    }

    const headPt = getTrackPoint(headDist);
    pts.push(headPt);

    const straightenDist = 120;
    const straightenRatio = Math.min(
      1,
      Math.pow(Math.min(1, offset / straightenDist), 1.25)
    );

    const finalPts = pts.map((p) => {
      if (dirX !== 0) {
        return {
          x: p.x,
          y: p.y + (headPt.y - p.y) * straightenRatio,
        };
      } else {
        return {
          x: p.x + (headPt.x - p.x) * straightenRatio,
          y: p.y,
        };
      }
    });

    const pathStr = finalPts
      .map(
        (p, idx) =>
          `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
      )
      .join(' ');

    const hx = Number(headPt.x.toFixed(1));
    const hy = Number(headPt.y.toFixed(1));
    const headLen = Number((Math.min(cellW, cellH) * 0.44).toFixed(1));
    const wingW = Number((Math.min(cellW, cellH) * 0.32).toFixed(1));

    let headPoints = '';
    switch (arrow.headDir) {
      case 'UP':
        headPoints = `${hx},${hy - headLen} ${hx - wingW},${hy} ${hx + wingW},${hy}`;
        break;
      case 'DOWN':
        headPoints = `${hx},${hy + headLen} ${hx - wingW},${hy} ${hx + wingW},${hy}`;
        break;
      case 'LEFT':
        headPoints = `${hx - headLen},${hy} ${hx},${hy - wingW} ${hx},${hy + wingW}`;
        break;
      case 'RIGHT':
      default:
        headPoints = `${hx + headLen},${hy} ${hx},${hy - wingW} ${hx},${hy + wingW}`;
        break;
    }

    return { pathStr, headPoints };
  };

  // Convert arrow grid path to SVG path string
  const getSvgPathString = (arrow) => {
    if (!arrow || !arrow.path || arrow.path.length === 0) return '';
    return arrow.path
      .map((pt, idx) => {
        const px = (boardPadding + (pt.c + 0.5) * cellW).toFixed(1);
        const py = (boardPadding + (pt.r + 0.5) * cellH).toFixed(1);
        return `${idx === 0 ? 'M' : 'L'} ${px} ${py}`;
      })
      .join(' ');
  };

  // Triangular arrowhead
  const getArrowHeadPoints = (arrow) => {
    if (!arrow || !arrow.path || arrow.path.length === 0) return '';
    const head = arrow.path[arrow.path.length - 1];
    if (!head) return '';
    const hx = Number(
      (boardPadding + (head.c + 0.5) * cellW).toFixed(1)
    );
    const hy = Number(
      (boardPadding + (head.r + 0.5) * cellH).toFixed(1)
    );

    const headLen = Number((Math.min(cellW, cellH) * 0.44).toFixed(1));
    const wingW = Number((Math.min(cellW, cellH) * 0.32).toFixed(1));

    switch (arrow.headDir) {
      case 'UP':
        return `${hx},${hy - headLen} ${hx - wingW},${hy} ${hx + wingW},${hy}`;
      case 'DOWN':
        return `${hx},${hy + headLen} ${hx - wingW},${hy} ${hx + wingW},${hy}`;
      case 'LEFT':
        return `${hx - headLen},${hy} ${hx},${hy - wingW} ${hx},${hy + wingW}`;
      case 'RIGHT':
      default:
        return `${hx + headLen},${hy} ${hx},${hy - wingW} ${hx},${hy + wingW}`;
    }
  };

  return (
    <JuiceEngine ref={juiceRef}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.bg,
            paddingTop: Math.max(insets.top, 14),
          },
        ]}
      >
        {/* Top Header matching Arrow Go */}
        <View style={styles.header}>
          <Pressable
            onPress={onBackToHub}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.headerBtn}
          >
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Path
                d="M19 12H5M12 19l-7-7 7-7"
                stroke={theme.headerIcon}
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>

          <Text style={[styles.headerTitle, { color: theme.headerText }]}>
            Level {level}
          </Text>

          <View style={styles.headerRight}>
            {/* Theme / Palette Button */}
            <Pressable
              onPress={handleToggleTheme}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[styles.circleIconBtn, { borderColor: theme.divider }]}
            >
              <Text style={styles.paletteIconText}>🎨</Text>
            </Pressable>

            {/* Settings Button */}
            <Pressable
              onPress={() => setSettingsVisible(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[styles.circleIconBtn, { borderColor: theme.divider }]}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 15a3 3 0 100-6 3 3 0 000 6z"
                  stroke={theme.headerIcon}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"
                  stroke={theme.headerIcon}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </Pressable>
          </View>
        </View>

        <View style={[styles.headerDivider, { backgroundColor: theme.divider }]} />

        {/* Status Row with Droplets, Floating Pill Banner, and Hint */}
        <View style={styles.statusRow}>
          {/* Water Droplets on Left */}
          <View style={styles.dropletGroup}>
            {[0, 1, 2].map((i) => {
              const active = i < MAX_MISTAKES - mistakes;
              return (
                <View
                  key={i}
                  style={[
                    styles.dropletWrapper,
                    !active && styles.dropletInactive,
                  ]}
                >
                  <Svg width={18} height={24} viewBox="0 0 20 26" fill="none">
                    <Path
                      d="M10 2C10 2 2 12.5 2 17.5C2 21.6421 5.58172 25 10 25C14.4183 25 18 21.6421 18 17.5C18 12.5 10 2 10 2Z"
                      fill={active ? theme.dropletActive : theme.dropletInactive}
                    />
                  </Svg>
                </View>
              );
            })}
          </View>

          {/* Center Floating White Pill Card */}
          <View
            style={[
              styles.movablePillCard,
              { backgroundColor: theme.cardBg },
            ]}
          >
            <Text
              style={[styles.movablePillText, { color: theme.cardText }]}
              numberOfLines={1}
            >
              Currently {movableCount} {movableCount === 1 ? 'arrow can' : 'arrows can'} move
            </Text>
          </View>

          {/* Hint Lightbulb on Right */}
          <Pressable
            onPress={handleUseHint}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.hintBtn}
          >
            <View style={[styles.adBadge, { borderColor: theme.headerIcon }]}>
              <Text style={[styles.adBadgeText, { color: theme.headerIcon }]}>
                AD
              </Text>
            </View>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Path
                d="M9 18h6m-4 3h2m-7-9a6 6 0 1110 0c0 2-1 3-2 4H10c-1-1-2-2-2-4z"
                stroke={theme.headerIcon}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>
        </View>

        {/* Main Maze Arena */}
        <View style={styles.arenaCenter}>
          <Pressable
            style={[
              styles.mazeBoard,
              {
                width: boardWidth,
                height: boardHeight,
                backgroundColor: theme.boardBg,
              },
            ]}
            onPress={handleBoardPress}
          >
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <Svg
                width={boardWidth}
                height={boardHeight}
                style={StyleSheet.absoluteFill}
              >
                <Defs>
                  {/* Warm Amber Gold Gradient for Movable Arrows */}
                  <LinearGradient
                    id="goldArrowGrad"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <Stop offset="0%" stopColor={theme.arrowMovableStart} />
                    <Stop offset="100%" stopColor={theme.arrowMovableEnd} />
                  </LinearGradient>

                  {/* Special Rainbow Gradient for Feature Arrows */}
                  <LinearGradient
                    id="rainbowArrowGrad"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <Stop offset="0%" stopColor={theme.rainbowStart} />
                    <Stop offset="50%" stopColor={theme.rainbowMid} />
                    <Stop offset="100%" stopColor={theme.rainbowEnd} />
                  </LinearGradient>
                </Defs>

                {/* Faint Grid Dots for empty/all cells - Exactly matching Arrow Go */}
                {Array.from({ length: ROWS }).map((_, r) =>
                  Array.from({ length: COLS }).map((_, c) => {
                    const cx = boardPadding + (c + 0.5) * cellW;
                    const cy = boardPadding + (r + 0.5) * cellH;
                    return (
                      <Circle
                        key={`dot_${r}_${c}`}
                        cx={cx}
                        cy={cy}
                        r={1.6}
                        fill={theme.gridDot}
                      />
                    );
                  })
                )}

                {/* Active Arrows in Maze */}
                {arrows.map((arrow) => {
                  if (!arrow || !arrow.path || arrow.path.length < 2)
                    return null;

                  const isBlocked = blockedArrowId === arrow.id;
                  const isMovable = movableArrowIds.has(arrow.id);
                  const isHinted = hintedArrowId === arrow.id;

                  // Styling matching Arrow Go
                  let strokeColor = theme.arrowBlocked;
                  let fillColor = theme.arrowBlocked;

                  if (isBlocked) {
                    strokeColor = theme.errorFlash;
                    fillColor = theme.errorFlash;
                  } else if (isMovable) {
                    if (arrow.isRainbow) {
                      strokeColor = 'url(#rainbowArrowGrad)';
                      fillColor = theme.rainbowEnd;
                    } else {
                      strokeColor = 'url(#goldArrowGrad)';
                      fillColor = theme.arrowMovableEnd;
                    }
                  }

                  const pathStr = getSvgPathString(arrow);
                  const headPoints = getArrowHeadPoints(arrow);

                  return (
                    <G key={arrow.id}>
                      {/* Hint Highlight Glow */}
                      {isHinted && pathStr ? (
                        <Path
                          d={pathStr}
                          stroke="#FFFFFF"
                          strokeWidth={9}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity={0.8}
                        />
                      ) : null}

                      {/* Main Arrow Body */}
                      {pathStr ? (
                        <Path
                          d={pathStr}
                          stroke={strokeColor}
                          strokeWidth={isBlocked ? 6.5 : 5.4}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ) : null}

                      {/* Direction Arrowhead */}
                      {headPoints ? (
                        <Polygon
                          points={headPoints}
                          fill={fillColor}
                          stroke={
                            isMovable && !isBlocked
                              ? theme.arrowMovableStart
                              : fillColor
                          }
                          strokeWidth={0.5}
                        />
                      ) : null}
                    </G>
                  );
                })}

                {/* Flying / Escaping Animated Arrows zooming off screen */}
                {escapingArrows.map((item) => {
                  const { arrow, progress } = item;
                  const opacity = Math.max(0, 1 - progress);
                  const { pathStr, headPoints } = getEscapingGeometry(item);

                  const escapeStroke = arrow.isRainbow
                    ? 'url(#rainbowArrowGrad)'
                    : 'url(#goldArrowGrad)';
                  const escapeFill = arrow.isRainbow
                    ? theme.rainbowEnd
                    : theme.arrowMovableEnd;

                  return (
                    <G key={`esc_${item.id}`} opacity={opacity}>
                      {/* Trail glow */}
                      {pathStr ? (
                        <Path
                          d={pathStr}
                          stroke="#FFFFFF"
                          strokeWidth={8}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity={0.4}
                        />
                      ) : null}
                      {pathStr ? (
                        <Path
                          d={pathStr}
                          stroke={escapeStroke}
                          strokeWidth={5.4}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ) : null}
                      {headPoints ? (
                        <Polygon
                          points={headPoints}
                          fill={escapeFill}
                          stroke="#FFFFFF"
                          strokeWidth={1}
                        />
                      ) : null}
                    </G>
                  );
                })}
              </Svg>
            </View>
          </Pressable>
        </View>

        {/* Settings / Options Modal */}
        <Modal
          visible={settingsVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setSettingsVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.dialogCard,
                { backgroundColor: theme.cardBg },
              ]}
            >
              <Text
                style={[styles.dialogTitle, { color: theme.headerText }]}
              >
                SETTINGS
              </Text>
              <Text style={styles.dialogSubtitle}>
                Level {level} · Best Score: {bestScore}
              </Text>

              <Pressable
                style={[
                  styles.dialogBtnPrimary,
                  { backgroundColor: theme.headerText },
                ]}
                onPress={() => {
                  setSettingsVisible(false);
                  initLevel(level);
                }}
              >
                <Text style={styles.dialogBtnPrimaryText}>↺ RESTART LEVEL</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.dialogBtnSecondary,
                  { borderColor: theme.divider },
                ]}
                onPress={handleToggleTheme}
              >
                <Text
                  style={[
                    styles.dialogBtnSecondaryText,
                    { color: theme.headerText },
                  ]}
                >
                  🎨 THEME: {themeMode}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.dialogBtnSecondary,
                  { borderColor: theme.divider },
                ]}
                onPress={() => setSettingsVisible(false)}
              >
                <Text
                  style={[
                    styles.dialogBtnSecondaryText,
                    { color: theme.headerText },
                  ]}
                >
                  CLOSE
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Victory & Game Over Modal matching Warm Paper Aesthetic */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.dialogCard,
                { backgroundColor: theme.cardBg },
              ]}
            >
              <Text style={styles.dialogIcon}>
                {modalType === 'VICTORY' ? '🎉' : '💔'}
              </Text>
              <Text
                style={[styles.dialogTitle, { color: theme.headerText }]}
              >
                {modalType === 'VICTORY'
                  ? 'LEVEL COMPLETE!'
                  : 'OUT OF CHANCES!'}
              </Text>
              <Text style={styles.dialogSubtitle}>
                {modalType === 'VICTORY'
                  ? `Level ${level} Cleared! All arrows unraveled.`
                  : 'You hit 3 blocked arrows. Try again!'}
              </Text>

              <Text style={[styles.dialogScore, { color: theme.headerText }]}>
                Score: {score}
              </Text>

              <Pressable
                style={[
                  styles.dialogBtnPrimary,
                  { backgroundColor: theme.headerText },
                ]}
                onPress={
                  modalType === 'VICTORY'
                    ? handleNextLevel
                    : () => initLevel(level)
                }
              >
                <Text style={styles.dialogBtnPrimaryText}>
                  {modalType === 'VICTORY' ? 'NEXT LEVEL ➔' : 'TRY AGAIN ↺'}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.dialogBtnSecondary,
                  { borderColor: theme.divider },
                ]}
                onPress={onBackToHub}
              >
                <Text
                  style={[
                    styles.dialogBtnSecondaryText,
                    { color: theme.headerText },
                  ]}
                >
                  BACK TO HUB
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </JuiceEngine>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  circleIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paletteIconText: {
    fontSize: 16,
  },
  headerDivider: {
    height: 1,
    width: '100%',
    opacity: 0.85,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropletGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minWidth: 60,
  },
  dropletWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropletInactive: {
    opacity: 0.35,
  },
  movablePillCard: {
    flex: 1,
    marginHorizontal: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      default: {},
    }),
  },
  movablePillText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  hintBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  },
  adBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginBottom: 2,
  },
  adBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    lineHeight: 10,
  },
  arenaCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 16,
  },
  mazeBoard: {
    overflow: 'hidden',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(38, 25, 17, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
      default: {},
    }),
  },
  dialogIcon: {
    fontSize: 42,
    marginBottom: 10,
  },
  dialogTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  dialogSubtitle: {
    fontSize: 13.5,
    color: '#8A7A6E',
    textAlign: 'center',
    marginBottom: 12,
  },
  dialogScore: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 18,
  },
  dialogBtnPrimary: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  dialogBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dialogBtnSecondary: {
    width: '100%',
    paddingVertical: 11,
    borderRadius: 16,
    borderWidth: 1.2,
    alignItems: 'center',
    marginBottom: 8,
  },
  dialogBtnSecondaryText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
});
