import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  Platform,
} from 'react-native';
import Svg, { Path, Polygon, Rect, G, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { COLORS } from '../../styles';
import MiniGameHeader from '../components/MiniGameHeader';
import GameResultModal from '../components/GameResultModal';
import JuiceEngine from '../components/JuiceEngine';
import { playTapSound, playSliceSound } from '../utils/sound';
import { triggerLightHaptic, triggerMediumHaptic } from '../utils/haptics';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const COLS = 9;
const ROWS = 13;

const DIRS = [
  { dr: -1, dc: 0, name: 'UP' },
  { dr: 0, dc: 1, name: 'RIGHT' },
  { dr: 1, dc: 0, name: 'DOWN' },
  { dr: 0, dc: -1, name: 'LEFT' },
];

const NEON_PALETTE = [
  '#00F5FF', // Neon Cyan
  '#39FF14', // Electric Lime
  '#FFD166', // Solar Gold
  '#FF007F', // Neon Magenta
  '#FF6D00', // Radiant Orange
  '#9D4EDD', // Cyber Violet
];

const STORAGE_LEVEL_KEY = '@game_tower:level_arrows_v1';
const STORAGE_BEST_KEY = '@game_tower:best_arrows_v1';

const PATTERN_TYPES = [
  { name: 'PINWHEEL VORTEX', bias: 'vortex', minCount: 16, maxCount: 20 },
  { name: 'CONCENTRIC FORTRESS', bias: 'fortress', minCount: 18, maxCount: 22 },
  { name: 'TWIN HIGHWAYS', bias: 'highways', minCount: 18, maxCount: 24 },
  { name: 'SPIRAL GALAXY', bias: 'spiral', minCount: 20, maxCount: 24 },
  { name: 'CHEVRON MATRIX', bias: 'chevron', minCount: 20, maxCount: 26 },
  { name: 'CYBER LABYRINTH', bias: 'labyrinth', minCount: 22, maxCount: 28 },
];

/**
 * Reverse-generate guaranteed 100% solvable labyrinths according to architectural pattern templates
 */
function generatePatternArrows(lvl = 1) {
  const patternIndex = (lvl - 1) % PATTERN_TYPES.length;
  const pattern = PATTERN_TYPES[patternIndex];
  const targetCount = Math.min(pattern.maxCount, pattern.minCount + Math.floor(lvl / 2));

  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  const arrows = [];

  for (let id = 0; id < targetCount; id++) {
    for (let attempt = 0; attempt < 220; attempt++) {
      let hr = Math.floor(Math.random() * ROWS);
      let hc = Math.floor(Math.random() * COLS);
      let dIdx = Math.floor(Math.random() * 4);

      if (pattern.bias === 'fortress') {
        if (hr < 4) dIdx = 0; // Top ring UP
        else if (hr > 8) dIdx = 2; // Bottom ring DOWN
        else if (hc < 3) dIdx = 3; // Left flank LEFT
        else if (hc > 5) dIdx = 1; // Right flank RIGHT
        else dIdx = Math.floor(Math.random() * 4);
      } else if (pattern.bias === 'vortex') {
        if (hr < 6 && hc < 4) dIdx = Math.random() > 0.4 ? 0 : 1;
        else if (hr < 6 && hc >= 4) dIdx = Math.random() > 0.4 ? 1 : 2;
        else if (hr >= 6 && hc >= 4) dIdx = Math.random() > 0.4 ? 2 : 3;
        else dIdx = Math.random() > 0.4 ? 3 : 0;
      } else if (pattern.bias === 'highways') {
        if (hc <= 2) dIdx = hr < 6 ? 0 : 2;
        else if (hc >= 6) dIdx = hr < 6 ? 2 : 0;
        else dIdx = hr % 2 === 0 ? 1 : 3;
      } else if (pattern.bias === 'spiral') {
        const ring = Math.min(hr, hc, ROWS - 1 - hr, COLS - 1 - hc);
        if (hr === ring) dIdx = 1;
        else if (hc === COLS - 1 - ring) dIdx = 2;
        else if (hr === ROWS - 1 - ring) dIdx = 3;
        else dIdx = 0;
      } else if (pattern.bias === 'chevron') {
        dIdx = hc % 2 === 0 ? 0 : 2;
      }

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
        grid[step1R][step1C] !== null
      ) {
        continue;
      }

      const path = [{ r: hr, c: hc }, { r: step1R, c: step1C }];
      let curR = step1R;
      let curC = step1C;
      let bodyDir = (dIdx + 2) % 4;
      const len = 2 + Math.floor(Math.random() * 4);

      for (let s = 2; s < len; s++) {
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
        const arrow = {
          id: 'arr_' + id + '_' + Math.random().toString(36).substring(2, 6),
          path: path.reverse(),
          headDir: dir.name,
          dr: dir.dr,
          dc: dir.dc,
          color: NEON_PALETTE[id % NEON_PALETTE.length],
        };

        for (const pt of arrow.path) {
          grid[pt.r][pt.c] = arrow.id;
        }

        arrows.push(arrow);
        break;
      }
    }
  }

  return { arrows, patternName: pattern.name };
}

export default function TapAwayArrowsGame({ onBackToHub, onScoreUpdate, isPaused = false }) {
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  const { width } = useWindowDimensions();

  // Maze board dimensions
  const boardPadding = 18;
  const boardWidth = Math.min(width - 32, 380);
  const cellW = (boardWidth - boardPadding * 2) / COLS;
  const cellH = cellW * 1.12;
  const boardHeight = cellH * ROWS + boardPadding * 2;

  const [level, setLevel] = useState(1);
  const [bestScore, setBestScore] = useState(0);

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
  const [score, setScore] = useState(0);
  const [patternName, setPatternName] = useState('PINWHEEL VORTEX');
  const [arrows, setArrows] = useState([]);
  const [blockedArrowId, setBlockedArrowId] = useState(null);
  const [blockingArrowId, setBlockingArrowId] = useState(null);

  // Escaping animated arrows
  const [escapingArrows, setEscapingArrows] = useState([]);
  const escapingRef = useRef([]);
  escapingRef.current = escapingArrows;
  const animFrameRef = useRef(null);

  // Result modal
  const [modalVisible, setModalVisible] = useState(false);
  const juiceRef = useRef(null);

  // Initialize level
  const initLevel = useCallback((lvl) => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setEscapingArrows([]);
    setBlockedArrowId(null);
    setBlockingArrowId(null);
    setModalVisible(false);

    const generated = generatePatternArrows(lvl);
    setArrows(generated.arrows);
    setPatternName(generated.patternName);
  }, []);

  useEffect(() => {
    initLevel(level);
    return () => {
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
        // Dynamic acceleration: 16px start (unbending clearly visible) -> 40px hypersonic escape
        const speed = 16 + Math.pow(item.progress, 0.7) * 24;
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

  // Check if arrow has clear path to exit
  const tryEscapeArrow = (arrow) => {
    if (!arrow || !arrow.path || arrow.path.length === 0) return;
    const head = arrow.path[arrow.path.length - 1];
    if (!head) return;

    let rayR = head.r + arrow.dr;
    let rayC = head.c + arrow.dc;
    let blocker = null;

    while (rayR >= 0 && rayR < ROWS && rayC >= 0 && rayC < COLS) {
      for (const other of arrows) {
        if (other && other.id !== arrow.id) {
          if (other.path && other.path.some((p) => p.r === rayR && p.c === rayC)) {
            blocker = other;
            break;
          }
        }
      }
      if (blocker) break;
      rayR += arrow.dr;
      rayC += arrow.dc;
    }

    if (blocker) {
      // Blocked! Shake and flash warning
      playTapSound();
      triggerLightHaptic();
      setBlockedArrowId(arrow.id);
      setBlockingArrowId(blocker.id);

      if (juiceRef.current) juiceRef.current.shake(3, 2);

      setTimeout(() => {
        setBlockedArrowId(null);
        setBlockingArrowId(null);
      }, 420);
    } else {
      // FREE TO ESCAPE! Fly off the screen!
      playSliceSound();
      triggerMediumHaptic();

      // Instantly remove from maze collision
      const remainingArrows = arrows.filter((a) => a.id !== arrow.id);
      setArrows(remainingArrows);

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

      if (juiceRef.current) {
        juiceRef.current.popup(
          `+${pts} PTS`,
          `${arrow.headDir} ESCAPE!`,
          arrow.color
        );
      }

      if (remainingArrows.length === 0) {
        setTimeout(() => {
          if (juiceRef.current) {
            juiceRef.current.celebrate(
              'MAZE SOLVED!',
              `${patternName} CLEARED!`,
              '#00F5FF'
            );
          }
          setModalVisible(true);
        }, 400);
      }
    }
  };

  const handleNextLevel = () => {
    const nextLvl = level + 1;
    setLevel(nextLvl);
    AsyncStorage.setItem(STORAGE_LEVEL_KEY, String(nextLvl)).catch(() => {});
  };

  // Dynamic track-following & straightening geometry for escaping arrows
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

    // Segment lengths and cumulative distances along original arrow polyline
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

    // 1. Dynamic tail position advancing along the body track
    pts.push(getTrackPoint(tailDist));

    // 2. Intermediate body corners still active between tail and head
    for (let i = 1; i < N - 1; i++) {
      if (cumDists[i] > tailDist + 0.8 && cumDists[i] < headDist - 0.8) {
        pts.push({ ...rawPts[i] });
      }
    }

    // 3. Dynamic leading head position shooting in the exit direction
    const headPt = getTrackPoint(headDist);
    pts.push(headPt);

    // 4. Smooth unbending: as the arrow slides out, smoothly straighten any
    // lateral bends into the heading axis (reaches 100% straight within ~120px)
    const straightenDist = 120;
    const straightenRatio = Math.min(1, Math.pow(Math.min(1, offset / straightenDist), 1.25));

    const finalPts = pts.map((p) => {
      if (dirX !== 0) {
        // Moving horizontally (LEFT or RIGHT) -> lateral axis is Y
        return {
          x: p.x,
          y: p.y + (headPt.y - p.y) * straightenRatio,
        };
      } else {
        // Moving vertically (UP or DOWN) -> lateral axis is X
        return {
          x: p.x + (headPt.x - p.x) * straightenRatio,
          y: p.y,
        };
      }
    });

    const pathStr = finalPts
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
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

  // Convert arrow grid path to SVG path string with optional offset
  const getSvgPathString = (arrow, offsetX = 0, offsetY = 0) => {
    if (!arrow || !arrow.path || arrow.path.length === 0) return '';
    return arrow.path
      .map((pt, idx) => {
        const px = (boardPadding + (pt.c + 0.5) * cellW + offsetX).toFixed(1);
        const py = (boardPadding + (pt.r + 0.5) * cellH + offsetY).toFixed(1);
        return `${idx === 0 ? 'M' : 'L'} ${px} ${py}`;
      })
      .join(' ');
  };

  // Generate razor-sharp triangular arrowhead with optional offset
  const getArrowHeadPoints = (arrow, offsetX = 0, offsetY = 0) => {
    if (!arrow || !arrow.path || arrow.path.length === 0) return '';
    const head = arrow.path[arrow.path.length - 1];
    if (!head) return '';
    const hx = Number((boardPadding + (head.c + 0.5) * cellW + offsetX).toFixed(1));
    const hy = Number((boardPadding + (head.r + 0.5) * cellH + offsetY).toFixed(1));

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
      <View style={styles.container}>
        <MiniGameHeader
          floorNum={28}
          gameTitle="CYBER ARROWS MAZE"
          category="LOGIC UNRAVEL"
          accentColor="#00F5FF"
          score={score}
          onBack={onBackToHub}
          onBackToHub={onBackToHub}
        />

        {/* Top HUD: Level & Pattern Name & Remaining Counter */}
        <View style={styles.topHud}>
          <View style={styles.hudBadge}>
            <Text style={styles.hudBadgeLabel}>LEVEL</Text>
            <Text style={styles.hudBadgeVal}>{level}</Text>
          </View>

          <View style={styles.centerHintBox}>
            <Text style={styles.hintPattern}>{patternName}</Text>
            <Text style={styles.hintSub}>
              REMAINING: <Text style={styles.remainCount}>{arrows.length}</Text>
            </Text>
          </View>

          <Pressable
            style={styles.resetBtn}
            onPress={() => initLevel(level)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.resetBtnText}>↺ RESET</Text>
          </Pressable>
        </View>

        {/* Main Cyber Neon Maze Arena */}
        <View style={styles.arenaCenter}>
          <Pressable
            style={[styles.mazeBoard, { width: boardWidth, height: boardHeight }]}
            onPress={handleBoardPress}
          >
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <Svg
                width={boardWidth}
                height={boardHeight}
                style={StyleSheet.absoluteFill}
              >
                <Defs>
                  <LinearGradient id="boardBg" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#0B051E" stopOpacity="0.96" />
                    <Stop offset="100%" stopColor="#040210" stopOpacity="0.98" />
                  </LinearGradient>
                </Defs>

                {/* Cyber Board Background */}
                <Rect
                  x={0}
                  y={0}
                  width={boardWidth}
                  height={boardHeight}
                  fill="url(#boardBg)"
                  rx={16}
                />

                {/* Subtle Grid Guidelines */}
                {Array.from({ length: COLS - 1 }).map((_, i) => {
                  const x = boardPadding + (i + 1) * cellW;
                  return (
                    <Line
                      key={`gx_${i}`}
                      x1={x}
                      y1={boardPadding}
                      x2={x}
                      y2={boardHeight - boardPadding}
                      stroke="rgba(0, 245, 255, 0.04)"
                      strokeWidth={1}
                    />
                  );
                })}
                {Array.from({ length: ROWS - 1 }).map((_, i) => {
                  const y = boardPadding + (i + 1) * cellH;
                  return (
                    <Line
                      key={`gy_${i}`}
                      x1={boardPadding}
                      y1={y}
                      x2={boardWidth - boardPadding}
                      y2={y}
                      stroke="rgba(0, 245, 255, 0.04)"
                      strokeWidth={1}
                    />
                  );
                })}

                {/* Outer Glowing Neon Wall Frame */}
                <Rect
                  x={boardPadding - 4}
                  y={boardPadding - 4}
                  width={boardWidth - (boardPadding - 4) * 2}
                  height={boardHeight - (boardPadding - 4) * 2}
                  fill="none"
                  stroke="#00F5FF"
                  strokeWidth={2}
                  rx={8}
                  opacity={0.7}
                />
                {/* Inner Cyber Frame */}
                <Rect
                  x={boardPadding - 1}
                  y={boardPadding - 1}
                  width={boardWidth - (boardPadding - 1) * 2}
                  height={boardHeight - (boardPadding - 1) * 2}
                  fill="none"
                  stroke="rgba(157, 78, 221, 0.4)"
                  strokeWidth={1}
                  strokeDasharray="8 8"
                />

                {/* Active Arrows in Maze */}
                {arrows.map((arrow) => {
                  if (!arrow || !arrow.path || arrow.path.length < 2) return null;

                  const isBlocked = blockedArrowId === arrow.id;
                  const isBlocker = blockingArrowId === arrow.id;

                  // Neon color styling
                  let strokeColor = arrow.color;
                  if (isBlocked) strokeColor = '#FF0055'; // Fiery red warning
                  if (isBlocker) strokeColor = '#FFE600'; // Amber blocker warning

                  const pathStr = getSvgPathString(arrow);
                  const headPoints = getArrowHeadPoints(arrow);

                  return (
                    <G key={arrow.id}>
                      {/* Neon Glow Halo */}
                      {pathStr ? (
                        <Path
                          d={pathStr}
                          stroke={strokeColor}
                          strokeWidth={isBlocked ? 7 : 5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity={0.35}
                        />
                      ) : null}

                      {/* Crisp Laser Line Core */}
                      {pathStr ? (
                        <Path
                          d={pathStr}
                          stroke={isBlocked ? '#FF0055' : strokeColor}
                          strokeWidth={isBlocked ? 4 : 3}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ) : null}

                      {/* Direction Arrowhead */}
                      {headPoints ? (
                        <Polygon
                          points={headPoints}
                          fill={strokeColor}
                          stroke="#FFFFFF"
                          strokeWidth={1}
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

                  return (
                    <G key={`esc_${item.id}`} opacity={opacity}>
                      {/* Motion streak glow */}
                      {pathStr ? (
                        <Path
                          d={pathStr}
                          stroke="#FFFFFF"
                          strokeWidth={6}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity={0.7}
                        />
                      ) : null}
                      {pathStr ? (
                        <Path
                          d={pathStr}
                          stroke={arrow.color}
                          strokeWidth={4}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ) : null}
                      {headPoints ? (
                        <Polygon
                          points={headPoints}
                          fill={arrow.color}
                          stroke="#FFFFFF"
                          strokeWidth={1.5}
                        />
                      ) : null}
                    </G>
                  );
                })}
              </Svg>
            </View>
          </Pressable>
        </View>

        <GameResultModal
          visible={modalVisible}
          type="win"
          score={score}
          onRetry={handleNextLevel}
          onBackToHub={onBackToHub}
          buttonText="NEXT PATTERN"
        />
      </View>
    </JuiceEngine>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#03030A',
  },
  topHud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  hudBadge: {
    backgroundColor: 'rgba(0, 245, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.35)',
    alignItems: 'center',
  },
  hudBadgeLabel: {
    fontFamily: monoFont,
    fontSize: 9,
    color: '#A09FB1',
    fontWeight: '800',
  },
  hudBadgeVal: {
    fontFamily: monoFont,
    fontSize: 14,
    color: '#00F5FF',
    fontWeight: '900',
  },
  centerHintBox: {
    alignItems: 'center',
  },
  hintPattern: {
    fontFamily: monoFont,
    fontSize: 11,
    fontWeight: '900',
    color: '#FFD166',
    letterSpacing: 1.2,
  },
  hintSub: {
    fontFamily: monoFont,
    fontSize: 10.5,
    color: '#A09FB1',
    fontWeight: '700',
    marginTop: 2,
  },
  remainCount: {
    color: '#00F5FF',
    fontWeight: '900',
  },
  resetBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  resetBtnText: {
    fontFamily: monoFont,
    fontSize: 10.5,
    fontWeight: '800',
    color: '#E2E8F0',
  },
  arenaCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 20,
  },
  mazeBoard: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#00F5FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
});
