import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  Platform,
} from 'react-native';
import Svg, { Circle, Rect, G } from 'react-native-svg';
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

const GRID_SIZE = 7;

// Vibrant Juicy Fruit Types
const FRUIT_TYPES = [
  { id: 'strawberry', name: 'Strawberry', icon: '🍓', color: '#FF0055', bg: 'rgba(255, 0, 85, 0.18)' },
  { id: 'orange', name: 'Orange', icon: '🍊', color: '#FF6D00', bg: 'rgba(255, 109, 0, 0.18)' },
  { id: 'lemon', name: 'Lemon', icon: '🍋', color: '#FFE600', bg: 'rgba(255, 230, 0, 0.18)' },
  { id: 'apple', name: 'Apple', icon: '🍏', color: '#39FF14', bg: 'rgba(57, 255, 20, 0.18)' },
  { id: 'grape', name: 'Grape', icon: '🍇', color: '#9D4EDD', bg: 'rgba(157, 78, 221, 0.18)' },
  { id: 'watermelon', name: 'Watermelon', icon: '🍉', color: '#00F5D4', bg: 'rgba(0, 245, 212, 0.18)' },
];

const JUICE_CALLOUTS = ['JUICY! 🍓', 'SWEET! 🍬', 'DELICIOUS! 🍊', 'SUPER BLAST! 💥', 'FRESH! 🍉'];

export default function Match3SagaGame({ onBackToHub, onScoreUpdate }) {
  const { width, height } = useWindowDimensions();
  const cellSize = Math.floor(Math.min((width - 48) / GRID_SIZE, (height - 300) / GRID_SIZE));

  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [bricksLeft, setBricksLeft] = useState(4);
  const [starsLeft, setStarsLeft] = useState(3);

  const [grid, setGrid] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);

  // Juice Feedback: Floating text & burst particles
  const [floatingJuice, setFloatingJuice] = useState(null);
  const [juiceParticles, setJuiceParticles] = useState([]);
  const particleAnimRef = useRef(null);
  const particlesRef = useRef([]);

  // Result modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('win');

  const timerRef = useRef(null);

  // Helper random fruit
  const getRandomFruit = () => {
    const pick = FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
    return {
      type: pick.id,
      icon: pick.icon,
      color: pick.color,
      bg: pick.bg,
      special: null, // null | 'STRIPED' | 'BOMB'
    };
  };

  // Spawn juice splash particles across all matched tiles
  const triggerJuiceBurst = (matchedTiles) => {
    if (!matchedTiles || matchedTiles.length === 0) return;

    const newParticles = [];
    matchedTiles.forEach((tile, tileIdx) => {
      const cx = 4 + (tile.c + 0.5) * (cellSize + 4);
      const cy = 4 + (tile.r + 0.5) * (cellSize + 4);
      const count = 9;
      for (let i = 0; i < count; i += 1) {
        const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        const speed = 40 + Math.random() * 85;
        newParticles.push({
          id: `p_${Date.now()}_${tileIdx}_${i}_${Math.random()}`,
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          r: 3 + Math.random() * 3.5,
          color: i % 2 === 0 ? tile.color : (i % 3 === 0 ? '#FFFFFF' : '#FFD700'),
          opacity: 1,
          decay: 2.2 + Math.random() * 1.0,
        });
      }
    });

    particlesRef.current = newParticles;
    setJuiceParticles(newParticles);

    const callout = JUICE_CALLOUTS[Math.floor(Math.random() * JUICE_CALLOUTS.length)];
    setFloatingJuice(callout);

    if (particleAnimRef.current) cancelAnimationFrame(particleAnimRef.current);
    let lastTime = Date.now();

    const animateParticles = () => {
      const now = Date.now();
      const dt = Math.min(0.04, (now - lastTime) / 1000);
      lastTime = now;

      const current = particlesRef.current;
      const updated = [];
      for (let i = 0; i < current.length; i += 1) {
        const p = current[i];
        const nextOp = p.opacity - p.decay * dt;
        if (nextOp > 0.05) {
          updated.push({
            ...p,
            x: p.x + p.vx * dt,
            y: p.y + p.vy * dt,
            vx: p.vx * 0.88,
            vy: p.vy * 0.88,
            opacity: nextOp,
          });
        }
      }

      particlesRef.current = updated;
      setJuiceParticles(updated);

      if (updated.length > 0) {
        particleAnimRef.current = requestAnimationFrame(animateParticles);
      } else {
        setJuiceParticles([]);
        setFloatingJuice(null);
      }
    };

    particleAnimRef.current = requestAnimationFrame(animateParticles);
  };

  // Initialize board with fruits & hurdles
  const initBoard = useCallback((lvl) => {
    const targetBricks = 3 + lvl;
    const targetStars = 2 + (lvl % 2);
    setBricksLeft(targetBricks);
    setStarsLeft(targetStars);
    setTimeLeft(60);
    setSelectedCell(null);
    setModalVisible(false);

    // Create 7x7 grid
    const newGrid = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      const row = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        row.push(getRandomFruit());
      }
      newGrid.push(row);
    }

    // Sugar Bricks 🧱
    let placedBricks = 0;
    while (placedBricks < targetBricks) {
      const r = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
      const c = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
      if (newGrid[r][c].type !== 'brick' && newGrid[r][c].type !== 'star') {
        newGrid[r][c] = {
          type: 'brick',
          icon: '🧱',
          color: '#8D99AE',
          bg: 'rgba(141, 153, 174, 0.25)',
          hp: 2,
        };
        placedBricks++;
      }
    }

    // Star Fruits ⭐
    let placedStars = 0;
    while (placedStars < targetStars) {
      const r = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
      const c = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
      if (newGrid[r][c].type !== 'brick' && newGrid[r][c].type !== 'star') {
        newGrid[r][c] = {
          type: 'star',
          icon: '⭐',
          color: '#FFD166',
          bg: 'rgba(255, 209, 102, 0.25)',
        };
        placedStars++;
      }
    }

    setGrid(newGrid);
  }, []);

  useEffect(() => {
    initBoard(level);
  }, [level, initBoard]);

  // Timer Countdown
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          handleGameOver();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (particleAnimRef.current) cancelAnimationFrame(particleAnimRef.current);
    };
  }, []);

  // Check matching lines & clear
  const checkAndClearMatches = (board) => {
    const toClear = new Set();
    const rows = GRID_SIZE;
    const cols = GRID_SIZE;

    // Horizontal check
    for (let r = 0; r < rows; r++) {
      let matchLen = 1;
      for (let c = 1; c < cols; c++) {
        const cur = board[r][c];
        const prev = board[r][c - 1];
        if (
          cur &&
          prev &&
          cur.type === prev.type &&
          cur.type !== 'brick' &&
          cur.type !== 'star'
        ) {
          matchLen++;
        } else {
          if (matchLen >= 3) {
            for (let k = 0; k < matchLen; k++) toClear.add(`${r},${c - 1 - k}`);
          }
          matchLen = 1;
        }
      }
      if (matchLen >= 3) {
        for (let k = 0; k < matchLen; k++) toClear.add(`${r},${cols - 1 - k}`);
      }
    }

    // Vertical check
    for (let c = 0; c < cols; c++) {
      let matchLen = 1;
      for (let r = 1; r < rows; r++) {
        const cur = board[r][c];
        const prev = board[r - 1][c];
        if (
          cur &&
          prev &&
          cur.type === prev.type &&
          cur.type !== 'brick' &&
          cur.type !== 'star'
        ) {
          matchLen++;
        } else {
          if (matchLen >= 3) {
            for (let k = 0; k < matchLen; k++) toClear.add(`${r - 1 - k},${c}`);
          }
          matchLen = 1;
        }
      }
      if (matchLen >= 3) {
        for (let k = 0; k < matchLen; k++) toClear.add(`${rows - 1 - k},${c}`);
      }
    }

    if (toClear.size === 0) return false;

    // Collect all matched tiles for localized particle smash bursts
    const matchedTiles = [];

    // Clear matched tiles and damage adjacent sugar bricks
    const newBoard = board.map((row) => [...row]);
    let bricksDestroyed = 0;
    let starsPicked = 0;

    toClear.forEach((key) => {
      const [r, c] = key.split(',').map(Number);
      const color = newBoard[r][c]?.color || '#FF0055';
      matchedTiles.push({ r, c, color });

      // Check 4 adjacent neighbors
      const neighbors = [
        [r - 1, c],
        [r + 1, c],
        [r, c - 1],
        [r, c + 1],
      ];
      neighbors.forEach(([nr, nc]) => {
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          const item = newBoard[nr][nc];
          if (item && item.type === 'brick') {
            item.hp -= 1;
            if (item.hp <= 0) {
              newBoard[nr][nc] = getRandomFruit();
              bricksDestroyed++;
            }
          } else if (item && item.type === 'star') {
            newBoard[nr][nc] = getRandomFruit();
            starsPicked++;
          }
        }
      });

      newBoard[r][c] = null;
    });

    // Particle burst across all matched locations
    triggerJuiceBurst(matchedTiles);

    if (bricksDestroyed > 0) {
      setBricksLeft((b) => Math.max(0, b - bricksDestroyed));
    }
    if (starsPicked > 0) {
      setStarsLeft((s) => Math.max(0, s - starsPicked));
    }

    // Drop fruits down by gravity
    for (let c = 0; c < cols; c++) {
      let emptyRow = rows - 1;
      for (let r = rows - 1; r >= 0; r--) {
        if (newBoard[r][c] !== null) {
          const val = newBoard[r][c];
          newBoard[r][c] = null;
          newBoard[emptyRow][c] = val;
          emptyRow--;
        }
      }
      while (emptyRow >= 0) {
        newBoard[emptyRow][c] = getRandomFruit();
        emptyRow--;
      }
    }

    setGrid(newBoard);
    playSliceSound();
    triggerMediumHaptic();

    setScore((s) => {
      const ns = s + toClear.size * 35 + bricksDestroyed * 120 + starsPicked * 200;
      onScoreUpdate?.(ns);
      return ns;
    });

    // Check Victory
    if (bricksLeft - bricksDestroyed <= 0 && starsLeft - starsPicked <= 0) {
      handleWin();
    }

    return true;
  };

  const handleCellPress = (r, c) => {
    if (!selectedCell) {
      setSelectedCell({ r, c });
      playTapSound();
      triggerLightHaptic();
      return;
    }

    const { r: prevR, c: prevC } = selectedCell;
    const isAdjacent = Math.abs(r - prevR) + Math.abs(c - prevC) === 1;

    if (!isAdjacent) {
      setSelectedCell({ r, c });
      playTapSound();
      return;
    }

    // Cannot swap bricks or stars directly
    if (
      grid[r][c].type === 'brick' ||
      grid[r][c].type === 'star' ||
      grid[prevR][prevC].type === 'brick' ||
      grid[prevR][prevC].type === 'star'
    ) {
      setSelectedCell(null);
      return;
    }

    // Perform swap
    const nextGrid = grid.map((row) => [...row]);
    const temp = nextGrid[r][c];
    nextGrid[r][c] = nextGrid[prevR][prevC];
    nextGrid[prevR][prevC] = temp;

    setSelectedCell(null);

    const cleared = checkAndClearMatches(nextGrid);
    if (!cleared) {
      playTapSound();
    }
  };

  const handleWin = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    JuiceEngine.celebrate(width / 2, height / 2);
    setModalType('win');
    setModalVisible(true);
  };

  const handleGameOver = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    playGameOverSound();
    triggerGameOverHaptic();
    setModalType('gameover');
    setModalVisible(true);
  };

  const handleNextLevel = () => {
    setLevel((lvl) => lvl + 1);
  };

  const boardWidth = GRID_SIZE * (cellSize + 4);

  return (
    <View style={styles.container}>
      <MiniGameHeader
        floorNum={28}
        gameTitle="CYBER FRUIT MATCH 3"
        category="JUICY SAGA"
        accentColor="#FF007F"
        score={score}
        onBack={onBackToHub}
        onBackToHub={onBackToHub}
      />

      {/* Target Objectives HUD */}
      <View style={styles.topHud}>
        <View style={styles.hudGoal}>
          <View style={styles.goalChip}>
            <Text style={styles.goalText}>🧱 {bricksLeft}</Text>
          </View>
          <View style={styles.goalChip}>
            <Text style={styles.goalText}>⭐ {starsLeft}</Text>
          </View>
        </View>

        {floatingJuice && (
          <View style={styles.calloutBadge}>
            <Text style={styles.calloutText}>{floatingJuice}</Text>
          </View>
        )}

        <View style={styles.timerBadge}>
          <Text
            style={[
              styles.timerText,
              { color: timeLeft <= 10 ? '#FF0055' : COLORS.cyan },
            ]}
          >
            ⏱️ {timeLeft}s
          </Text>
        </View>
      </View>

      {/* Main 7x7 Juicy Grid */}
      <View style={styles.gridContainer}>
        <View style={[styles.boardWrapper, { width: boardWidth }]}>
          {grid.map((row, r) => (
            <View key={`row_${r}`} style={styles.gridRow}>
              {row.map((cell, c) => {
                const isSelected = selectedCell && selectedCell.r === r && selectedCell.c === c;
                return (
                  <Pressable
                    key={`cell_${r}_${c}`}
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: cell?.bg || 'rgba(15, 10, 35, 0.7)',
                        borderColor: isSelected
                          ? '#FFFFFF'
                          : cell?.color
                            ? cell.color + '55'
                            : 'rgba(255, 255, 255, 0.1)',
                        borderWidth: isSelected ? 2.5 : 1,
                        transform: [{ scale: isSelected ? 1.08 : 1 }],
                      },
                    ]}
                    onPress={() => handleCellPress(r, c)}
                  >
                    <Text style={[styles.fruitIcon, { fontSize: cellSize * 0.52 }]}>
                      {cell ? cell.icon : ''}
                    </Text>
                    {cell && cell.type === 'brick' && cell.hp > 1 && (
                      <View style={styles.armorStripe} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}

          {/* Juice Burst Particle Overlay */}
          {juiceParticles.length > 0 && (
            <Svg style={StyleSheet.absoluteFillObject} pointerEvents="none">
              {juiceParticles.map((p) => (
                <Circle
                  key={p.id}
                  cx={p.x}
                  cy={p.y}
                  r={p.r}
                  fill={p.color}
                  opacity={p.opacity}
                />
              ))}
            </Svg>
          )}
        </View>
      </View>

      <GameResultModal
        visible={modalVisible}
        type={modalType}
        score={score}
        level={level}
        onRetry={modalType === 'win' ? handleNextLevel : () => initBoard(level)}
        onBackToHub={onBackToHub}
        buttonText={modalType === 'win' ? 'NEXT STAGE' : 'TRY AGAIN'}
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
    backgroundColor: 'rgba(12, 8, 30, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 0, 127, 0.25)',
  },
  hudGoal: {
    flexDirection: 'row',
    gap: 8,
  },
  goalChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  goalText: {
    fontFamily: monoFont,
    fontSize: 12,
    fontWeight: '900',
    color: '#FFD166',
  },
  calloutBadge: {
    backgroundColor: 'rgba(255, 0, 127, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FF007F',
  },
  calloutText: {
    fontFamily: monoFont,
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  timerBadge: {
    backgroundColor: 'rgba(0, 245, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.3)',
  },
  timerText: {
    fontFamily: monoFont,
    fontSize: 13,
    fontWeight: '900',
  },
  gridContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  boardWrapper: {
    position: 'relative',
    backgroundColor: 'rgba(10, 6, 26, 0.95)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 0, 127, 0.35)',
    padding: 4,
    shadowColor: '#FF007F',
    shadowRadius: 16,
    shadowOpacity: 0.35,
    elevation: 6,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  cell: {
    borderRadius: 10,
    margin: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    shadowOpacity: 0.4,
    elevation: 2,
  },
  fruitIcon: {
    textAlign: 'center',
  },
  armorStripe: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF0055',
  },
});
