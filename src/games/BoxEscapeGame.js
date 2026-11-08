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
  Line,
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
} from '../utils/haptics';
import {
  playTapSound,
  playPerfectSound,
  playSliceSound,
} from '../utils/sound';

const STORAGE_KEY = '@game_tower:best_boxescape_v1';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

/**
 * Hand-crafted puzzle levels that escalate in complexity and grid size.
 * Legend:
 * '#' = Solid Cyber Wall
 * '.' = Floor
 * 'P' = Player Start
 * 'B' = Movable Cyber Box / Crate
 * 'E' = Escape Exit Portal
 * 'S' = Pressure Switch Plate
 * 'L' = Laser Security Barrier (deactivated when box is on S)
 */
const CURATED_LEVELS = [
  // Level 1: Tutorial breach - push 1 crate out of hallway to escape
  {
    name: 'SECTOR BREACH',
    grid: [
      '#####',
      '#P..#',
      '#.B.#',
      '#..E#',
      '#####',
    ],
    parMoves: 6,
  },
  // Level 2: Dual crates blocking corridor
  {
    name: 'CARGO CHUTE',
    grid: [
      '######',
      '#P...#',
      '##.B.#',
      '#..B.#',
      '#...E#',
      '######',
    ],
    parMoves: 8,
  },
  // Level 3: Tight corner logistics
  {
    name: 'STORAGE LAB',
    grid: [
      '######',
      '#P.B.#',
      '#.##.#',
      '#.B..#',
      '#..B.#',
      '#...E#',
      '######',
    ],
    parMoves: 12,
  },
  // Level 4: Introduction to Laser Security Gate & Switch Pad
  {
    name: 'LASER LOCKDOWN',
    grid: [
      '#######',
      '#P....#',
      '#.B...#',
      '#..S..#',
      '####L##',
      '#....E#',
      '#######',
    ],
    parMoves: 14,
  },
  // Level 5: Corridors & Heavy Crate Maze
  {
    name: 'CORRIDOR NINE',
    grid: [
      '#######',
      '#P..B.#',
      '#.#...#',
      '#.B.B.#',
      '#..#.##',
      '#..B.E#',
      '#######',
    ],
    parMoves: 16,
  },
  // Level 6: Dual Laser Bypass
  {
    name: 'DUAL OVERRIDE',
    grid: [
      '########',
      '#P.....#',
      '#.B.B..#',
      '#..S.S.#',
      '###L#L##',
      '#......#',
      '#.....E#',
      '########',
    ],
    parMoves: 20,
  },
  // Level 7: The Vault Antechamber
  {
    name: 'VAULT ENCLAVE',
    grid: [
      '########',
      '#P.#...#',
      '#..B.B.#',
      '##...#.#',
      '#.B#...#',
      '#..S.B.#',
      '####L###',
      '#.....E#',
      '########',
    ],
    parMoves: 24,
  },
  // Level 8: Quantum Logistics Bay
  {
    name: 'QUANTUM DEPOT',
    grid: [
      '#########',
      '#P......#',
      '#.B.#.B.#',
      '#...#...#',
      '#.B.S.B.#',
      '#...#...#',
      '###.L.###',
      '#......E#',
      '#########',
    ],
    parMoves: 26,
  },
  // Level 9: Hypercube Terminal
  {
    name: 'HYPERCUBE GATE',
    grid: [
      '#########',
      '#P...#..#',
      '#.B..B..#',
      '#..#.#..#',
      '#.B..S.B#',
      '#..#.#..#',
      '#.B..L..#',
      '#......E#',
      '#########',
    ],
    parMoves: 30,
  },
  // Level 10: Apex Citadel Confinement
  {
    name: 'APEX CONFINEMENT',
    grid: [
      '##########',
      '#P.......#',
      '#.B.#..B.#',
      '#...#....#',
      '#.B.S.S.B#',
      '#...#.##.#',
      '###.L.L.##',
      '#...#....#',
      '#.......E#',
      '##########',
    ],
    parMoves: 36,
  },
];

/**
 * Parses raw ASCII grid into structured level state
 */
function parseLevel(levelData) {
  const rows = levelData.grid;
  const height = rows.length;
  const width = rows[0].length;

  let player = { x: 1, y: 1 };
  let exit = { x: width - 2, y: height - 2 };
  const boxes = [];
  const walls = [];
  const switches = [];
  const lasers = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const char = rows[y][x];
      if (char === '#') {
        walls.push({ x, y });
      } else if (char === 'P') {
        player = { x, y };
      } else if (char === 'B') {
        boxes.push({ id: `box_${x}_${y}`, x, y });
      } else if (char === 'E') {
        exit = { x, y };
      } else if (char === 'S') {
        switches.push({ id: `sw_${x}_${y}`, x, y });
      } else if (char === 'L') {
        lasers.push({ id: `laser_${x}_${y}`, x, y });
      }
    }
  }

  return {
    width,
    height,
    player,
    exit,
    boxes,
    walls,
    switches,
    lasers,
    name: levelData.name,
    parMoves: levelData.parMoves || 15,
  };
}

/**
 * Procedurally generates an escalating solvable puzzle chamber for high levels (11+)
 */
function generateProceduralLevel(levelNum) {
  const size = Math.min(10, 6 + Math.floor((levelNum - 10) / 4));
  const numBoxes = Math.min(6, 3 + Math.floor((levelNum - 10) / 3));
  const hasLaser = levelNum % 2 === 0;

  const walls = [];
  // Outer border
  for (let x = 0; x < size; x++) {
    walls.push({ x, y: 0 });
    walls.push({ x, y: size - 1 });
  }
  for (let y = 1; y < size - 1; y++) {
    walls.push({ x: 0, y });
    walls.push({ x: size - 1, y });
  }

  // Internal pillars
  const pillarCount = Math.floor(size / 3);
  for (let i = 0; i < pillarCount; i++) {
    const px = 2 + (i * 2) % (size - 4);
    const py = 2 + ((i + 1) * 2) % (size - 4);
    walls.push({ x: px, y: py });
  }

  const player = { x: 1, y: 1 };
  const exit = { x: size - 2, y: size - 2 };

  const boxes = [];
  for (let b = 0; b < numBoxes; b++) {
    const bx = 2 + (b % (size - 4));
    const by = 1 + Math.floor(b / (size - 4)) * 2;
    if (
      !walls.some((w) => w.x === bx && w.y === by) &&
      !(bx === player.x && by === player.y) &&
      !(bx === exit.x && by === exit.y)
    ) {
      boxes.push({ id: `pbox_${b}`, x: bx, y: by });
    }
  }

  const switches = [];
  const lasers = [];
  if (hasLaser) {
    const sx = Math.floor(size / 2);
    const sy = Math.floor(size / 2);
    switches.push({ id: `psw_${levelNum}`, x: sx, y: sy });
    lasers.push({ id: `plaser_${levelNum}`, x: size - 2, y: size - 3 });
  }

  return {
    width: size,
    height: size,
    player,
    exit,
    boxes,
    walls,
    switches,
    lasers,
    name: `ZONE DELTA - ${levelNum}`,
    parMoves: 18 + levelNum * 2,
  };
}

export default function BoxEscapeGame({
  onBackToHub,
  onScoreUpdate,
  isPaused = false,
}) {
  const { width } = useWindowDimensions();
  const juiceRef = useRef(null);

  const [currentLevel, setCurrentLevel] = useState(1);
  const [highScore, setHighScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);

  // Level state
  const [levelConfig, setLevelConfig] = useState(() =>
    parseLevel(CURATED_LEVELS[0])
  );
  const [playerPos, setPlayerPos] = useState(() =>
    parseLevel(CURATED_LEVELS[0]).player
  );
  const [boxes, setBoxes] = useState(() =>
    parseLevel(CURATED_LEVELS[0]).boxes.map((b) => ({ ...b }))
  );
  const [movesCount, setMovesCount] = useState(0);
  const [moveHistory, setMoveHistory] = useState([]);
  const [isVictorious, setIsVictorious] = useState(false);
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

  // Initialize level
  const startLevel = useCallback((lvlNum) => {
    setCurrentLevel(lvlNum);
    const cfg =
      lvlNum <= CURATED_LEVELS.length
        ? parseLevel(CURATED_LEVELS[lvlNum - 1])
        : generateProceduralLevel(lvlNum);
    setLevelConfig(cfg);
    setPlayerPos({ ...cfg.player });
    setBoxes(cfg.boxes.map((b) => ({ ...b })));
    setMovesCount(0);
    setMoveHistory([]);
    setIsVictorious(false);
  }, []);

  // Check if switches are activated (box or player on switch)
  const isSwitchActive = useCallback(
    (sw) => {
      return (
        boxes.some((b) => b.x === sw.x && b.y === sw.y) ||
        (playerPos.x === sw.x && playerPos.y === sw.y)
      );
    },
    [boxes, playerPos]
  );

  // Are laser barriers open? (All switches must be pressed)
  const areLasersOpen = useCallback(() => {
    if (levelConfig.switches.length === 0) return true;
    return levelConfig.switches.every((sw) => isSwitchActive(sw));
  }, [levelConfig.switches, isSwitchActive]);

  // Move execution with physical force pushing
  const handleMove = useCallback(
    (dx, dy) => {
      if (isPaused || isVictorious) return;

      const newPx = playerPos.x + dx;
      const newPy = playerPos.y + dy;

      // 1. Boundary and Wall check
      if (
        newPx < 0 ||
        newPx >= levelConfig.width ||
        newPy < 0 ||
        newPy >= levelConfig.height
      ) {
        triggerLightHaptic();
        return;
      }

      if (levelConfig.walls.some((w) => w.x === newPx && w.y === newPy)) {
        triggerLightHaptic();
        return;
      }

      // Laser barrier check
      if (
        !areLasersOpen() &&
        levelConfig.lasers.some((l) => l.x === newPx && l.y === newPy)
      ) {
        triggerLightHaptic();
        juiceRef.current?.flash('#FF0055');
        return;
      }

      // 2. Check if a movable Box is in front of the player
      const hitBoxIndex = boxes.findIndex((b) => b.x === newPx && b.y === newPy);

      if (hitBoxIndex !== -1) {
        // Physical force push! Target position behind the box:
        const pushBx = newPx + dx;
        const pushBy = newPy + dy;

        // Is the space behind the box blocked by walls?
        if (
          pushBx < 0 ||
          pushBx >= levelConfig.width ||
          pushBy < 0 ||
          pushBy >= levelConfig.height ||
          levelConfig.walls.some((w) => w.x === pushBx && w.y === pushBy)
        ) {
          triggerLightHaptic(); // Heavy solid resistance
          return;
        }

        // Is behind the box blocked by another box?
        if (boxes.some((b) => b.x === pushBx && b.y === pushBy)) {
          triggerLightHaptic(); // Multi-crate resistance
          return;
        }

        // Is behind the box blocked by an active laser?
        if (
          !areLasersOpen() &&
          levelConfig.lasers.some((l) => l.x === pushBx && l.y === pushBy)
        ) {
          triggerLightHaptic();
          return;
        }

        // PHYSICAL CRATE PUSH SUCCESS!
        const updatedBoxes = [...boxes];
        const pushedBox = { ...updatedBoxes[hitBoxIndex], x: pushBx, y: pushBy };
        updatedBoxes[hitBoxIndex] = pushedBox;

        // Record history for Undo
        setMoveHistory((prev) => [
          ...prev,
          {
            player: { ...playerPos },
            boxIndex: hitBoxIndex,
            boxFrom: { x: newPx, y: newPy },
          },
        ]);

        setPlayerPos({ x: newPx, y: newPy });
        setBoxes(updatedBoxes);
        setMovesCount((m) => m + 1);

        playSliceSound();
        triggerMediumHaptic();
        juiceRef.current?.shake(4, 3);
      } else {
        // Empty Floor move
        setMoveHistory((prev) => [
          ...prev,
          {
            player: { ...playerPos },
            boxIndex: null,
            boxFrom: null,
          },
        ]);

        setPlayerPos({ x: newPx, y: newPy });
        setMovesCount((m) => m + 1);

        playTapSound();
        triggerLightHaptic();
      }

      // 3. Check Escape Exit Condition!
      if (newPx === levelConfig.exit.x && newPy === levelConfig.exit.y) {
        // ESCAPE ACHIEVED!
        setIsVictorious(true);
        playPerfectSound();
        triggerPerfectHaptic();

        const levelScore = Math.max(
          100,
          currentLevel * 150 - Math.max(0, (movesCount - levelConfig.parMoves) * 10)
        );
        const nextTotal = totalScore + levelScore;
        setTotalScore(nextTotal);

        if (nextTotal > highScore) {
          setHighScore(nextTotal);
          AsyncStorage.setItem(STORAGE_KEY, String(nextTotal)).catch(() => {});
        }
        onScoreUpdate?.(nextTotal);

        juiceRef.current?.flash(COLORS.matrixMint);
        juiceRef.current?.burst(width / 2, 280, COLORS.matrixMint, 32);
        juiceRef.current?.popup(
          '🎉 SECTOR ESCAPED!',
          `Level ${currentLevel} cleared in ${movesCount + 1} moves!`,
          COLORS.matrixMint
        );

        setTimeout(() => {
          if (currentLevel < CURATED_LEVELS.length + 5) {
            startLevel(currentLevel + 1);
          } else {
            setModalVisible(true);
          }
        }, 1200);
      }
    },
    [
      isPaused,
      isVictorious,
      playerPos,
      levelConfig,
      areLasersOpen,
      boxes,
      totalScore,
      highScore,
      currentLevel,
      movesCount,
      width,
      onScoreUpdate,
      startLevel,
    ]
  );

  // Undo last move
  const handleUndo = useCallback(() => {
    if (moveHistory.length === 0 || isVictorious) return;

    const last = moveHistory[moveHistory.length - 1];
    setPlayerPos(last.player);

    if (last.boxIndex !== null) {
      setBoxes((prev) => {
        const next = [...prev];
        next[last.boxIndex] = {
          ...next[last.boxIndex],
          x: last.boxFrom.x,
          y: last.boxFrom.y,
        };
        return next;
      });
    }

    setMoveHistory((prev) => prev.slice(0, -1));
    setMovesCount((m) => Math.max(0, m - 1));
    triggerLightHaptic();
    playTapSound();
  }, [moveHistory, isVictorious]);

  // Restart level
  const handleRestart = useCallback(() => {
    triggerMediumHaptic();
    playTapSound();
    startLevel(currentLevel);
  }, [startLevel, currentLevel]);

  // Swipe gesture support
  const touchStartRef = useRef({ x: 0, y: 0 });
  const handleTouchStart = (e) => {
    touchStartRef.current = {
      x: e.nativeEvent.pageX,
      y: e.nativeEvent.pageY,
    };
  };

  const handleTouchEnd = (e) => {
    const dx = e.nativeEvent.pageX - touchStartRef.current.x;
    const dy = e.nativeEvent.pageY - touchStartRef.current.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (Math.max(absX, absY) > 28) {
      if (absX > absY) {
        handleMove(dx > 0 ? 1 : -1, 0);
      } else {
        handleMove(0, dy > 0 ? 1 : -1);
      }
    }
  };

  // Cell sizing based on grid dimensions
  const arenaPadding = 24;
  const availableWidth = width - arenaPadding * 2;
  const cellSize = Math.min(
    48,
    Math.floor(availableWidth / levelConfig.width)
  );
  const gridPixelWidth = cellSize * levelConfig.width;
  const gridPixelHeight = cellSize * levelConfig.height;

  const lasersDeactivated = areLasersOpen();

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={styles.container}>
        <MiniGameHeader
          title="BOX ESCAPE"
          score={totalScore}
          bestScore={highScore}
          onBackToHub={onBackToHub}
        />

      {/* Top Level Telemetry */}
      <View style={styles.telemetryBar}>
        <View style={styles.telemetryPill}>
          <Text style={styles.telemetryLabel}>LEVEL</Text>
          <Text style={[styles.telemetryVal, { color: COLORS.cyan }]}>
            {String(currentLevel).padStart(2, '0')}
          </Text>
        </View>

        <View style={styles.missionCenterTag}>
          <Text style={styles.missionName}>{levelConfig.name}</Text>
          <Text style={styles.missionSub}>
            PUSH BOXES • FORGE YOUR PATH • REACH EXIT
          </Text>
        </View>

        <View style={styles.telemetryPill}>
          <Text style={styles.telemetryLabel}>MOVES</Text>
          <Text
            style={[
              styles.telemetryVal,
              {
                color:
                  movesCount <= levelConfig.parMoves
                    ? COLORS.matrixMint
                    : COLORS.solarGold,
              },
            ]}
          >
            {movesCount}
          </Text>
        </View>
      </View>

      {/* Main Puzzle Grid Chamber */}
      <View
        style={styles.gridOuterFrame}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <View
          style={[
            styles.gridMatrixBox,
            { width: gridPixelWidth + 4, height: gridPixelHeight + 4 },
          ]}
        >
          <Svg width={gridPixelWidth} height={gridPixelHeight}>
            <Defs>
              <SvgLinearGradient id="crateGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#FF9E00" stopOpacity="1" />
                <Stop offset="50%" stopColor="#FF5400" stopOpacity="0.95" />
                <Stop offset="100%" stopColor="#7928CA" stopOpacity="0.9" />
              </SvgLinearGradient>

              <SvgLinearGradient id="portalGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#00F5FF" stopOpacity="1" />
                <Stop offset="60%" stopColor="#00F5D4" stopOpacity="0.8" />
                <Stop offset="100%" stopColor="#39FF14" stopOpacity="0.95" />
              </SvgLinearGradient>

              <SvgLinearGradient id="playerGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#00F5FF" stopOpacity="1" />
                <Stop offset="100%" stopColor="#7209B7" stopOpacity="1" />
              </SvgLinearGradient>
            </Defs>

            {/* Floor tiles */}
            {Array.from({ length: levelConfig.height }).map((_, y) =>
              Array.from({ length: levelConfig.width }).map((__, x) => (
                <Rect
                  key={`floor_${x}_${y}`}
                  x={x * cellSize + 0.5}
                  y={y * cellSize + 0.5}
                  width={cellSize - 1}
                  height={cellSize - 1}
                  rx={3}
                  fill="rgba(12, 10, 28, 0.75)"
                  stroke="rgba(0, 245, 255, 0.08)"
                  strokeWidth={0.5}
                />
              ))
            )}

            {/* Pressure Switches */}
            {levelConfig.switches.map((sw) => {
              const active = isSwitchActive(sw);
              return (
                <G key={sw.id}>
                  <Rect
                    x={sw.x * cellSize + 3}
                    y={sw.y * cellSize + 3}
                    width={cellSize - 6}
                    height={cellSize - 6}
                    rx={cellSize / 4}
                    fill={active ? 'rgba(57, 255, 20, 0.35)' : 'rgba(255, 230, 0, 0.18)'}
                    stroke={active ? '#39FF14' : '#FFE600'}
                    strokeWidth={1.5}
                  />
                  <Circle
                    cx={sw.x * cellSize + cellSize / 2}
                    cy={sw.y * cellSize + cellSize / 2}
                    r={cellSize / 5}
                    fill={active ? '#39FF14' : '#FFE600'}
                  />
                </G>
              );
            })}

            {/* Escape Exit Portal */}
            <G>
              <Rect
                x={levelConfig.exit.x * cellSize + 2}
                y={levelConfig.exit.y * cellSize + 2}
                width={cellSize - 4}
                height={cellSize - 4}
                rx={8}
                fill="url(#portalGrad)"
                stroke="#FFFFFF"
                strokeWidth={1.5}
              />
              <Circle
                cx={levelConfig.exit.x * cellSize + cellSize / 2}
                cy={levelConfig.exit.y * cellSize + cellSize / 2}
                r={cellSize / 3}
                stroke="#FFFFFF"
                strokeWidth={1.2}
                fill="none"
              />
              <Circle
                cx={levelConfig.exit.x * cellSize + cellSize / 2}
                cy={levelConfig.exit.y * cellSize + cellSize / 2}
                r={cellSize / 6}
                fill="#FFFFFF"
              />
            </G>

            {/* Laser Security Gates */}
            {levelConfig.lasers.map((laser) => {
              if (lasersDeactivated) {
                // Open gate (deactivated green pulse)
                return (
                  <G key={laser.id}>
                    <Rect
                      x={laser.x * cellSize + 2}
                      y={laser.y * cellSize + 2}
                      width={cellSize - 4}
                      height={cellSize - 4}
                      rx={4}
                      fill="rgba(57, 255, 20, 0.1)"
                      stroke="#39FF14"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                    />
                  </G>
                );
              }

              // Active lethal laser barrier
              return (
                <G key={laser.id}>
                  <Rect
                    x={laser.x * cellSize + 2}
                    y={laser.y * cellSize + 2}
                    width={cellSize - 4}
                    height={cellSize - 4}
                    rx={4}
                    fill="rgba(255, 0, 85, 0.35)"
                    stroke="#FF0055"
                    strokeWidth={1.5}
                  />
                  <Line
                    x1={laser.x * cellSize + 4}
                    y1={laser.y * cellSize + cellSize / 2}
                    x2={laser.x * cellSize + cellSize - 4}
                    y2={laser.y * cellSize + cellSize / 2}
                    stroke="#FFE600"
                    strokeWidth={3}
                  />
                </G>
              );
            })}

            {/* Solid Cyber Walls */}
            {levelConfig.walls.map((w, idx) => (
              <G key={`wall_${idx}`}>
                <Rect
                  x={w.x * cellSize + 1.5}
                  y={w.y * cellSize + 1.5}
                  width={cellSize - 3}
                  height={cellSize - 3}
                  rx={5}
                  fill="#140828"
                  stroke="#7928CA"
                  strokeWidth={1.5}
                />
                <Rect
                  x={w.x * cellSize + 5}
                  y={w.y * cellSize + 5}
                  width={cellSize - 10}
                  height={cellSize - 10}
                  rx={3}
                  fill="#0B0318"
                  stroke="rgba(0, 245, 255, 0.25)"
                  strokeWidth={0.8}
                />
              </G>
            ))}

            {/* Movable Quantum Boxes / Crates */}
            {boxes.map((b) => (
              <G key={b.id}>
                {/* 3D Drop Shadow */}
                <Rect
                  x={b.x * cellSize + 3}
                  y={b.y * cellSize + 5}
                  width={cellSize - 6}
                  height={cellSize - 6}
                  rx={6}
                  fill="rgba(0, 0, 0, 0.6)"
                />
                {/* Main Crate Body */}
                <Rect
                  x={b.x * cellSize + 2.5}
                  y={b.y * cellSize + 2.5}
                  width={cellSize - 5}
                  height={cellSize - 5}
                  rx={6}
                  fill="url(#crateGrad)"
                  stroke="#FFE600"
                  strokeWidth={1.5}
                />
                {/* Physical Grips & Cross Braces */}
                <Line
                  x1={b.x * cellSize + 6}
                  y1={b.y * cellSize + 6}
                  x2={b.x * cellSize + cellSize - 6}
                  y2={b.y * cellSize + cellSize - 6}
                  stroke="rgba(255, 255, 255, 0.45)"
                  strokeWidth={1.2}
                />
                <Line
                  x1={b.x * cellSize + cellSize - 6}
                  y1={b.y * cellSize + 6}
                  x2={b.x * cellSize + 6}
                  y2={b.y * cellSize + cellSize - 6}
                  stroke="rgba(255, 255, 255, 0.45)"
                  strokeWidth={1.2}
                />
                {/* Center Core LED */}
                <Circle
                  cx={b.x * cellSize + cellSize / 2}
                  cy={b.y * cellSize + cellSize / 2}
                  r={cellSize / 6}
                  fill="#FFFFFF"
                />
              </G>
            ))}

            {/* Player Cyber Operative */}
            <G>
              <Circle
                cx={playerPos.x * cellSize + cellSize / 2}
                cy={playerPos.y * cellSize + cellSize / 2}
                r={cellSize / 2 - 3}
                fill="url(#playerGrad)"
                stroke="#00F5FF"
                strokeWidth={2}
              />
              {/* Operative Visor */}
              <Rect
                x={playerPos.x * cellSize + cellSize / 2 - cellSize / 4}
                y={playerPos.y * cellSize + cellSize / 2 - cellSize / 6}
                width={cellSize / 2}
                height={cellSize / 4}
                rx={3}
                fill="#FFE600"
              />
              <Circle
                cx={playerPos.x * cellSize + cellSize / 2}
                cy={playerPos.y * cellSize + cellSize / 2 + cellSize / 6}
                r={2.5}
                fill="#39FF14"
              />
            </G>
          </Svg>
        </View>
      </View>

      {/* Cyber D-Pad Physical Push Controls & Action Buttons */}
      <View style={styles.controlsContainer}>
        {/* Undo and Restart Bar */}
        <View style={styles.actionToolBar}>
          <Pressable
            onPress={handleUndo}
            disabled={moveHistory.length === 0}
            style={({ pressed }) => [
              styles.actionBtn,
              moveHistory.length === 0 && styles.actionBtnDisabled,
              pressed && { transform: [{ scale: 0.95 }] },
            ]}
          >
            <Text style={styles.actionBtnText}>↺ UNDO</Text>
          </Pressable>

          <Pressable
            onPress={handleRestart}
            style={({ pressed }) => [
              styles.actionBtn,
              pressed && { transform: [{ scale: 0.95 }] },
            ]}
          >
            <Text style={styles.actionBtnText}>⚡ RESTART</Text>
          </Pressable>
        </View>

        {/* 4-Way Push Directional D-Pad */}
        <View style={styles.dpadCenter}>
          <Pressable
            onPress={() => handleMove(0, -1)}
            style={({ pressed }) => [
              styles.dpadBtn,
              styles.dpadUp,
              pressed && styles.dpadBtnPressed,
            ]}
          >
            <Text style={styles.dpadArrow}>▲</Text>
          </Pressable>

          <View style={styles.dpadMiddleRow}>
            <Pressable
              onPress={() => handleMove(-1, 0)}
              style={({ pressed }) => [
                styles.dpadBtn,
                styles.dpadLeft,
                pressed && styles.dpadBtnPressed,
              ]}
            >
              <Text style={styles.dpadArrow}>◀</Text>
            </Pressable>

            <View style={styles.dpadCore}>
              <Text style={{ fontSize: 13, color: COLORS.cyan }}>⚡</Text>
            </View>

            <Pressable
              onPress={() => handleMove(1, 0)}
              style={({ pressed }) => [
                styles.dpadBtn,
                styles.dpadRight,
                pressed && styles.dpadBtnPressed,
              ]}
            >
              <Text style={styles.dpadArrow}>▶</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => handleMove(0, 1)}
            style={({ pressed }) => [
              styles.dpadBtn,
              styles.dpadDown,
              pressed && styles.dpadBtnPressed,
            ]}
          >
            <Text style={styles.dpadArrow}>▼</Text>
          </Pressable>
        </View>
      </View>

        <GameResultModal
          visible={modalVisible}
          type="victory"
          score={totalScore}
          level={currentLevel}
          onRetry={handleRestart}
          onBackToHub={onBackToHub}
          buttonText="RE-RUN SYSTEM"
          subtitle={`ALL ${CURATED_LEVELS.length} SECTORS COMPLETED!`}
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
  missionCenterTag: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  missionName: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  missionSub: {
    fontSize: 7.5,
    fontFamily: monoFont,
    color: COLORS.textSecondary,
    letterSpacing: 0.6,
    marginTop: 2,
    textAlign: 'center',
  },
  gridOuterFrame: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  gridMatrixBox: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#00F5FF',
    backgroundColor: 'rgba(6, 4, 18, 0.96)',
    shadowColor: '#00F5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
    overflow: 'hidden',
  },
  controlsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    alignItems: 'center',
  },
  actionToolBar: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 245, 255, 0.12)',
    borderWidth: 1.2,
    borderColor: COLORS.cyan,
  },
  actionBtnDisabled: {
    opacity: 0.35,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionBtnText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.cyan,
    letterSpacing: 1,
  },
  dpadCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadMiddleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 6,
  },
  dpadBtn: {
    width: 62,
    height: 52,
    borderRadius: 12,
    backgroundColor: 'rgba(22, 16, 46, 0.92)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 245, 255, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.cyan,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  dpadBtnPressed: {
    backgroundColor: 'rgba(0, 245, 255, 0.3)',
    borderColor: COLORS.cyan,
    transform: [{ scale: 0.94 }],
  },
  dpadArrow: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '900',
  },
  dpadUp: {
    marginBottom: 2,
  },
  dpadDown: {
    marginTop: 2,
  },
  dpadLeft: {},
  dpadRight: {},
  dpadCore: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(10, 6, 24, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
