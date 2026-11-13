import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  Platform,
} from 'react-native';
import Svg, {
  Path,
  Polygon,
  Rect,
  G,
  Circle,
} from 'react-native-svg';
import MiniGameHeader from '../components/MiniGameHeader';
import GameResultModal from '../components/GameResultModal';
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

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

// Dense grid dimensions matching Arrow Go tightly packed labyrinth
const COLS = 16;
const ROWS = 22;

const DIRS = [
  { dr: -1, dc: 0, name: 'UP' },
  { dr: 0, dc: 1, name: 'RIGHT' },
  { dr: 1, dc: 0, name: 'DOWN' },
  { dr: 0, dc: -1, name: 'LEFT' },
];

const STORAGE_LEVEL_KEY = '@game_tower:level_arrows_v1';
const STORAGE_BEST_KEY = '@game_tower:best_arrows_v1';

/**
 * Reverse-generate guaranteed 100% solvable labyrinths
 * Tightly packs arrows side-by-side with multi-turn shapes (L, U, spiral, straight)
 */
function generateDenseLabyrinth(lvl = 1) {
  // Target arrow count scales with level (28 up to 48 arrows)
  const targetCount = Math.min(48, 28 + Math.floor(lvl * 0.9));

  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  const arrows = [];
  const placedPoints = [];
  const midR = Math.floor(ROWS / 2);
  const midC = Math.floor(COLS / 2);

  for (let id = 0; id < targetCount; id++) {
    let placed = false;

    // Gather candidate head positions
    const candidates = [];
    if (placedPoints.length === 0) {
      // Start in central region
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          candidates.push({ r: midR + dr, c: midC + dc });
        }
      }
    } else {
      // Prioritize cells directly adjacent to already-placed arrows to pack them tightly
      for (let r = 1; r < ROWS - 1; r++) {
        for (let c = 1; c < COLS - 1; c++) {
          if (grid[r][c] === null) {
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
          if (grid[r][c] === null) {
            candidates.push({ r, c });
          }
        }
      }
    }

    // Shuffle candidates
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    for (const cand of candidates) {
      const hr = cand.r;
      const hc = cand.c;
      if (grid[hr][hc] !== null) continue;

      // Try all 4 exit directions
      const dirOrder = [0, 1, 2, 3].sort(() => Math.random() - 0.5);

      for (const dIdx of dirOrder) {
        const dir = DIRS[dIdx];

        // Raycast check: must have open ray to border at time of placement
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

        // First step backwards MUST be opposite to dir so line enters straight to the head
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

        const path = [
          { r: hr, c: hc },
          { r: step1R, c: step1C },
        ];
        let curR = step1R;
        let curC = step1C;
        let bodyDir = (dIdx + 2) % 4; // backward direction

        // Variable length: some short (2-3), some medium (4-6), some long labyrinthine (7-12)
        const lenDice = Math.random();
        const maxLen = lenDice > 0.4 ? 4 + Math.floor(Math.random() * 8) : 3 + Math.floor(Math.random() * 3);

        for (let s = 2; s < maxLen; s++) {
          // Can continue straight, turn 90 deg left, or turn 90 deg right
          const choices = [bodyDir, (bodyDir + 1) % 4, (bodyDir + 3) % 4];
          // Give higher weight to straight or hugging adjacent lines
          choices.sort(() => Math.random() - 0.4);

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
            path: path.reverse(), // head is last element
            headDir: dir.name,
            dr: dir.dr,
            dc: dir.dc,
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

      if (placed) break;
    }

    if (!placed && arrows.length >= 24) {
      break;
    }
  }

  return { arrows };
}

export default function TapAwayArrowsGame({
  onBackToHub,
  onScoreUpdate,
  isPaused = false,
}) {
  const isPausedRef = useRef(isPaused);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const { width } = useWindowDimensions();

  // Dense board dimensions: responsive fit
  const boardPadding = 12;
  const boardWidth = Math.min(width - 24, 380);
  const cellW = (boardWidth - boardPadding * 2) / COLS;
  const cellH = cellW * 1.12;
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

  // Result modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('VICTORY');

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
    escapingRef.current = [];
    setEscapingArrows([]);
    setBlockedArrowId(null);
    setHintedArrowId(null);
    setMistakes(0);
    setModalVisible(false);
    setModalType('VICTORY');

    const generated = generateDenseLabyrinth(lvl);
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

  // Frame Loop for Smooth Fly-Off Animation
  const runEscapeLoop = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const updateFrame = () => {
      if (isPausedRef.current) {
        animFrameRef.current = requestAnimationFrame(updateFrame);
        return;
      }
      const current = escapingRef.current;
      if (current.length === 0) return;

      const MAX_OFFSET = 600;
      const next = [];

      for (let i = 0; i < current.length; i++) {
        const item = current[i];
        const speed = 22 + Math.pow(item.progress, 0.7) * 32;
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

      escapingRef.current = next;
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

  // Set of movable arrow IDs in real-time (used for logic & live counter, NOT highlighted!)
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
    const c = (locationX - boardPadding) / cellW;
    const r = (locationY - boardPadding) / cellH;

    // Find arrow whose path is closest to tap point
    let bestArrow = null;
    let minDistance = 0.95;

    for (const arrow of arrows) {
      if (!arrow || !arrow.path) continue;
      for (const pt of arrow.path) {
        const d = Math.hypot(pt.c + 0.5 - c, pt.r + 0.5 - r);
        if (d < minDistance) {
          minDistance = d;
          bestArrow = arrow;
        }
      }
    }

    if (!bestArrow) return;
    tryEscapeArrow(bestArrow);
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
            ? 'NO ENERGY LEFT!'
            : `${MAX_MISTAKES - nextMistakes} CHANCES LEFT`,
          '#FF0055'
        );
      }

      setTimeout(() => {
        setBlockedArrowId(null);
      }, 350);

      if (nextMistakes >= MAX_MISTAKES) {
        setTimeout(() => {
          playGameOverSound();
          triggerGameOverHaptic();
          setModalType('GAMEOVER');
          setModalVisible(true);
        }, 400);
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

      const nextEscaping = [...escapingRef.current, newEscapingItem];
      escapingRef.current = nextEscaping;
      setEscapingArrows(nextEscaping);
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
              'MAZE SOLVED!',
              `LEVEL ${level} CLEARED!`,
              '#00F5FF'
            );
          }
          setModalType('VICTORY');
          setModalVisible(true);
        }, 350);
      }
    }
  };

  // Hint button: Highlights and frees one unblocked arrow
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
          '#00F5FF'
        );
      }
      setTimeout(() => {
        tryEscapeArrow(chosen);
      }, 300);
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
    const headLen = Number((Math.min(cellW, cellH) * 0.46).toFixed(1));
    const wingW = Number((Math.min(cellW, cellH) * 0.35).toFixed(1));

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
    const hx = Number((boardPadding + (head.c + 0.5) * cellW).toFixed(1));
    const hy = Number((boardPadding + (head.r + 0.5) * cellH).toFixed(1));

    const headLen = Number((Math.min(cellW, cellH) * 0.46).toFixed(1));
    const wingW = Number((Math.min(cellW, cellH) * 0.35).toFixed(1));

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

  // UNIFORM THEME: All arrows share the same cyber neon cyan style (#00F5FF)
  // No arrows are pre-highlighted as movable, preserving the true puzzle challenge!
  const ARROW_DEFAULT_COLOR = '#00F5FF';
  const ARROW_BLOCKED_FLASH = '#FF0055';
  const ARROW_HINT_COLOR = '#FFE600';

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={styles.container}>
        {/* App-Matching MiniGameHeader */}
        <MiniGameHeader
          floorNum={8}
          gameTitle="ARROW MAZE"
          category="LOGIC UNRAVEL"
          accentColor="#00F5FF"
          score={score}
          highScore={bestScore}
          onBack={onBackToHub}
          onBackToHub={onBackToHub}
        />

        {/* Arrow Go Layout: Status Row with Droplets, Floating Pill Banner, and Hint */}
        <View style={styles.statusRow}>
          {/* Energy Droplets on Left */}
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
                      fill={active ? '#00F5FF' : 'rgba(0, 245, 255, 0.18)'}
                    />
                  </Svg>
                </View>
              );
            })}
          </View>

          {/* Center Floating Glassmorphic Pill Card */}
          <View style={styles.movablePillCard}>
            <Text style={styles.movablePillText} numberOfLines={1}>
              Currently {movableCount} {movableCount === 1 ? 'arrow can' : 'arrows can'} move
            </Text>
          </View>

          {/* Hint Lightbulb on Right */}
          <Pressable
            onPress={handleUseHint}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.hintBtn}
          >
            <View style={styles.adBadge}>
              <Text style={styles.adBadgeText}>AD</Text>
            </View>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Path
                d="M9 18h6m-4 3h2m-7-9a6 6 0 1110 0c0 2-1 3-2 4H10c-1-1-2-2-2-4z"
                stroke="#FFE600"
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
                {/* Dark Matrix Glass Board Background */}
                <Rect
                  x={0}
                  y={0}
                  width={boardWidth}
                  height={boardHeight}
                  fill="#080D1D"
                  rx={16}
                />

                {/* Faint Grid Dots across all cells */}
                {Array.from({ length: ROWS }).map((_, r) =>
                  Array.from({ length: COLS }).map((_, c) => {
                    const cx = boardPadding + (c + 0.5) * cellW;
                    const cy = boardPadding + (r + 0.5) * cellH;
                    return (
                      <Circle
                        key={`dot_${r}_${c}`}
                        cx={cx}
                        cy={cy}
                        r={1.2}
                        fill="rgba(0, 245, 255, 0.18)"
                      />
                    );
                  })
                )}

                {/* Active Arrows in Maze - ALL SAME UNIFORM COLOR */}
                {arrows.map((arrow) => {
                  if (!arrow || !arrow.path || arrow.path.length < 2)
                    return null;

                  const isBlocked = blockedArrowId === arrow.id;
                  const isHinted = hintedArrowId === arrow.id;

                  // All arrows share the exact same cyber neon color (#00F5FF)
                  let color = ARROW_DEFAULT_COLOR;
                  if (isBlocked) color = ARROW_BLOCKED_FLASH;
                  else if (isHinted) color = ARROW_HINT_COLOR;

                  const pathStr = getSvgPathString(arrow);
                  const headPoints = getArrowHeadPoints(arrow);

                  return (
                    <G key={arrow.id}>
                      {/* Hint Glow */}
                      {isHinted && pathStr ? (
                        <Path
                          d={pathStr}
                          fill="none"
                          stroke="#FFFFFF"
                          strokeWidth={8}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity={0.8}
                        />
                      ) : null}

                      {/* Main Arrow Body - ALWAYS fill="none" */}
                      {pathStr ? (
                        <Path
                          d={pathStr}
                          fill="none"
                          stroke={color}
                          strokeWidth={isBlocked ? 5.8 : 4.6}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ) : null}

                      {/* Direction Arrowhead */}
                      {headPoints ? (
                        <Polygon
                          points={headPoints}
                          fill={color}
                          stroke="#FFFFFF"
                          strokeWidth={0.8}
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
                      {/* Trail glow */}
                      {pathStr ? (
                        <Path
                          d={pathStr}
                          fill="none"
                          stroke="#FFFFFF"
                          strokeWidth={7}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity={0.5}
                        />
                      ) : null}
                      {pathStr ? (
                        <Path
                          d={pathStr}
                          fill="none"
                          stroke="#00F5FF"
                          strokeWidth={4.8}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ) : null}
                      {headPoints ? (
                        <Polygon
                          points={headPoints}
                          fill="#00F5FF"
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

        {/* Global App Result Modal */}
        <GameResultModal
          visible={modalVisible}
          type={modalType}
          title={modalType === 'VICTORY' ? 'PATTERN SOLVED!' : 'PATTERN LOCKED OUT!'}
          subtitle={
            modalType === 'VICTORY'
              ? `LEVEL ${level} CLEARED // ZERO CONFLICTS`
              : '3 MISTAKES EXCEEDED // TRAJECTORY BLOCKED'
          }
          score={score}
          bestScore={bestScore}
          accentColor={modalType === 'VICTORY' ? '#00F5FF' : '#FF0055'}
          onRetry={modalType === 'VICTORY' ? handleNextLevel : () => initLevel(level)}
          retryLabel={modalType === 'VICTORY' ? 'NEXT PATTERN' : 'RETRY PATTERN'}
          onBackToHub={onBackToHub}
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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropletGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minWidth: 64,
  },
  dropletWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropletInactive: {
    opacity: 0.3,
  },
  movablePillCard: {
    flex: 1,
    marginHorizontal: 10,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(11, 20, 42, 0.88)',
    borderWidth: 1.2,
    borderColor: 'rgba(0, 245, 255, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#00F5FF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      default: {},
    }),
  },
  movablePillText: {
    fontFamily: monoFont,
    fontSize: 11,
    fontWeight: '800',
    color: '#00F5FF',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  hintBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  },
  adBadge: {
    borderWidth: 1,
    borderColor: '#FFE600',
    borderRadius: 5,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginBottom: 2,
    backgroundColor: 'rgba(255, 230, 0, 0.12)',
  },
  adBadgeText: {
    fontFamily: monoFont,
    fontSize: 8,
    fontWeight: '900',
    color: '#FFE600',
    lineHeight: 9,
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
    borderWidth: 1.4,
    borderColor: 'rgba(0, 245, 255, 0.3)',
    ...Platform.select({
      ios: {
        shadowColor: '#00F5FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
      default: {},
    }),
  },
});
