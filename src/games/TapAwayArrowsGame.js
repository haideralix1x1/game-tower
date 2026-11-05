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
import { playTapSound, playSliceSound, playGameOverSound } from '../utils/sound';
import { triggerLightHaptic, triggerMediumHaptic, triggerGameOverHaptic } from '../utils/haptics';

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

/**
 * Reverse-generate a guaranteed 100% solvable labyrinth of thin neon line arrows
 * with perfectly collinear arrowheads
 */
function generateSolvableArrows(targetCount = 20) {
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  const arrows = [];

  for (let id = 0; id < targetCount; id++) {
    for (let attempt = 0; attempt < 120; attempt++) {
      const hr = Math.floor(Math.random() * ROWS);
      const hc = Math.floor(Math.random() * COLS);
      if (grid[hr][hc] !== null) continue;

      const dIdx = Math.floor(Math.random() * 4);
      const dir = DIRS[dIdx];

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

      // First step backwards MUST be opposite to dir so the line enters head straight
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
      const len = 2 + Math.floor(Math.random() * 4); // 2 to 5 cells long

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
          id: `arr_${id}`,
          path: path.reverse(), // Ordered from tail to head
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

  return arrows;
}

export default function TapAwayArrowsGame({ onBackToHub, onScoreUpdate }) {
  const { width, height } = useWindowDimensions();

  // Maze board dimensions
  const boardPadding = 18;
  const boardWidth = Math.min(width - 32, 380);
  const cellW = (boardWidth - boardPadding * 2) / COLS;
  const cellH = cellW * 1.12;
  const boardHeight = cellH * ROWS + boardPadding * 2;

  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [arrows, setArrows] = useState([]);
  const [blockedArrowId, setBlockedArrowId] = useState(null);
  const [blockingArrowId, setBlockingArrowId] = useState(null);
  const [escapingIds, setEscapingIds] = useState(new Set());

  // Result modal
  const [modalVisible, setModalVisible] = useState(false);

  // Initialize level
  const initLevel = useCallback((lvl) => {
    setEscapingIds(new Set());
    setBlockedArrowId(null);
    setBlockingArrowId(null);
    setModalVisible(false);

    const arrowCount = Math.min(26, 16 + lvl * 2);
    const generated = generateSolvableArrows(arrowCount);
    setArrows(generated);
  }, []);

  useEffect(() => {
    initLevel(level);
  }, [level, initLevel]);

  // Handle tap on the maze
  const handleBoardPress = (evt) => {
    const { locationX, locationY } = evt.nativeEvent;

    // Convert pixel coordinate to grid cell
    const c = Math.floor((locationX - boardPadding) / cellW);
    const r = Math.floor((locationY - boardPadding) / cellH);

    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;

    // Find which active arrow covers or is near this grid cell
    const clickedArrow = arrows.find(
      (a) =>
        !escapingIds.has(a.id) &&
        a.path.some((pt) => Math.hypot(pt.c - c, pt.r - r) <= 0.85)
    );

    if (!clickedArrow) return;
    tryEscapeArrow(clickedArrow);
  };

  // Check if arrow has clear path to exit
  const tryEscapeArrow = (arrow) => {
    const head = arrow.path[arrow.path.length - 1];
    let rayR = head.r + arrow.dr;
    let rayC = head.c + arrow.dc;
    let blocker = null;

    while (rayR >= 0 && rayR < ROWS && rayC >= 0 && rayC < COLS) {
      for (const other of arrows) {
        if (other.id !== arrow.id && !escapingIds.has(other.id)) {
          if (other.path.some((p) => p.r === rayR && p.c === rayC)) {
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

      setTimeout(() => {
        setBlockedArrowId(null);
        setBlockingArrowId(null);
      }, 450);
    } else {
      // FREE TO ESCAPE!
      playSliceSound();
      triggerMediumHaptic();

      setEscapingIds((prev) => {
        const next = new Set(prev);
        next.add(arrow.id);

        const remainingCount = arrows.length - next.size;
        const pts = 50 + level * 10;
        setScore((s) => {
          const ns = s + pts;
          onScoreUpdate?.(ns);
          return ns;
        });

        if (remainingCount === 0) {
          setTimeout(() => {
            JuiceEngine.celebrate(width / 2, height / 2);
            setModalVisible(true);
          }, 350);
        }

        return next;
      });
    }
  };

  const handleNextLevel = () => {
    setLevel((lvl) => lvl + 1);
  };

  // Convert arrow grid path to SVG path string, ending right at the base of arrowhead
  const getSvgPathString = (arrow) => {
    return arrow.path.reduce((acc, pt, idx) => {
      const px = boardPadding + (pt.c + 0.5) * cellW;
      const py = boardPadding + (pt.r + 0.5) * cellH;
      return `${acc} ${idx === 0 ? 'M' : 'L'} ${px} ${py}`;
    }, '');
  };

  // Generate razor-sharp triangular arrowhead seamlessly connected to line end
  const getArrowHeadPoints = (arrow) => {
    const head = arrow.path[arrow.path.length - 1];
    const hx = boardPadding + (head.c + 0.5) * cellW;
    const hy = boardPadding + (head.r + 0.5) * cellH;

    const headLen = Math.min(cellW, cellH) * 0.44;
    const wingW = Math.min(cellW, cellH) * 0.32;

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

  const remainingCount = arrows.filter((a) => !escapingIds.has(a.id)).length;

  return (
    <View style={styles.container}>
      <MiniGameHeader
        floorNum={29}
        gameTitle="CYBER ARROWS MAZE"
        category="LOGIC UNRAVEL"
        accentColor="#00F5FF"
        score={score}
        onBack={onBackToHub}
        onBackToHub={onBackToHub}
      />

      {/* Top HUD: Level & Remaining Counter */}
      <View style={styles.topHud}>
        <View style={styles.hudBadge}>
          <Text style={styles.hudBadgeLabel}>LEVEL</Text>
          <Text style={styles.hudBadgeVal}>{level}</Text>
        </View>

        <View style={styles.centerHintBox}>
          <Text style={styles.hintTitle}>TAP ARROWS WITH OPEN EXIT</Text>
          <Text style={styles.hintSub}>
            REMAINING: <Text style={styles.remainCount}>{remainingCount}</Text>
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
          <Svg
            width={boardWidth}
            height={boardHeight}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
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

            {/* Thin Neon Line Arrows with Perfectly Aligned Heads */}
            {arrows.map((arrow) => {
              if (escapingIds.has(arrow.id)) return null;

              const isBlocked = blockedArrowId === arrow.id;
              const isBlocker = blockingArrowId === arrow.id;

              // Neon color styling
              let strokeColor = arrow.color;
              if (isBlocked) strokeColor = '#FF0055'; // Fiery red warning
              if (isBlocker) strokeColor = '#FFE600'; // Amber blocker warning

              return (
                <G key={arrow.id}>
                  {/* Neon Glow Halo */}
                  <Path
                    d={getSvgPathString(arrow)}
                    stroke={strokeColor}
                    strokeWidth={isBlocked ? 7 : 5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    opacity={0.3}
                  />

                  {/* Sharp Thin Neon Line Body */}
                  <Path
                    d={getSvgPathString(arrow)}
                    stroke={strokeColor}
                    strokeWidth={isBlocked ? 4 : 3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />

                  {/* Sharp Triangular Arrowhead perfectly collinear with line end */}
                  <Polygon
                    points={getArrowHeadPoints(arrow)}
                    fill={strokeColor}
                  />
                  {/* Arrowhead White Tip Core */}
                  <Circle
                    cx={
                      boardPadding +
                      (arrow.path[arrow.path.length - 1].c + 0.5) * cellW
                    }
                    cy={
                      boardPadding +
                      (arrow.path[arrow.path.length - 1].r + 0.5) * cellH
                    }
                    r={2}
                    fill="#FFFFFF"
                    opacity={0.8}
                  />
                </G>
              );
            })}
          </Svg>
        </Pressable>
      </View>

      <GameResultModal
        visible={modalVisible}
        type="win"
        score={score}
        level={level}
        onRetry={handleNextLevel}
        onBackToHub={onBackToHub}
        buttonText="NEXT PUZZLE"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#040114',
  },
  topHud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(10, 6, 26, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 245, 255, 0.25)',
  },
  hudBadge: {
    alignItems: 'center',
  },
  hudBadgeLabel: {
    fontFamily: monoFont,
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.55)',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  hudBadgeVal: {
    fontFamily: monoFont,
    fontSize: 16,
    fontWeight: '900',
    color: '#00F5FF',
    marginTop: 2,
  },
  centerHintBox: {
    alignItems: 'center',
  },
  hintTitle: {
    fontFamily: monoFont,
    fontSize: 11,
    fontWeight: '900',
    color: '#00F5FF',
    letterSpacing: 0.5,
  },
  hintSub: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  remainCount: {
    color: '#39FF14',
    fontWeight: '900',
  },
  resetBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  resetBtnText: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  arenaCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  mazeBoard: {
    backgroundColor: '#07031A',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 245, 255, 0.4)',
    shadowColor: '#00F5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 18,
    shadowOpacity: 0.35,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
});
