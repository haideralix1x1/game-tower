import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../styles';
import MiniGameHeader from '../components/MiniGameHeader';
import GameResultModal from '../components/GameResultModal';
import JuiceEngine from '../components/JuiceEngine';
import { playTapSound, playSliceSound, playGameOverSound, playPerfectSound } from '../utils/sound';
import { triggerLightHaptic, triggerMediumHaptic, triggerPerfectHaptic, triggerGameOverHaptic } from '../utils/haptics';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const COLS = 10;
const ROWS = 18;

// Juicy Neon Jewel Tetrominoes
const TETROMINOES = {
  I: { shape: [[1, 1, 1, 1]], color: '#00F5FF' }, // Electric Cyan
  O: { shape: [[1, 1], [1, 1]], color: '#FFE600' }, // Solar Gold
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: '#9D4EDD' }, // Neon Violet
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: '#39FF14' }, // Emerald Green
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: '#FF007F' }, // Candy Pink / Magenta
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: '#0070F3' }, // Royal Blue
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: '#FF5E00' }, // Plasma Orange
};

const TETRO_KEYS = Object.keys(TETROMINOES);

function rotateMatrix(matrix) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const result = [];
  for (let c = 0; c < cols; c++) {
    const newRow = [];
    for (let r = rows - 1; r >= 0; r--) {
      newRow.push(matrix[r][c]);
    }
    result.push(newRow);
  }
  return result;
}

const getInitialTetrisPiece = () => {
  const first = TETRO_KEYS[Math.floor(Math.random() * TETRO_KEYS.length)];
  const second = TETRO_KEYS[Math.floor(Math.random() * TETRO_KEYS.length)];
  const template = TETROMINOES[first];
  const startCol = Math.floor((COLS - template.shape[0].length) / 2);
  return {
    piece: { type: first, shape: template.shape, color: template.color },
    pos: { r: 0, c: startCol },
    nextType: second,
  };
};

/**
 * 3D Glossy Candy/Jewel Block with Specular Shine & Bevel
 */
function JuicyBlock({ color, size, isGhost = false, isActive = false }) {
  if (isGhost) {
    return (
      <View
        style={{
          width: size - 2,
          height: size - 2,
          margin: 1,
          borderRadius: 4,
          borderWidth: 1.5,
          borderColor: `${color}99`,
          borderStyle: 'dashed',
          backgroundColor: `${color}22`,
        }}
      />
    );
  }

  return (
    <View
      style={{
        width: size - 2,
        height: size - 2,
        margin: 1,
        borderRadius: 4.5,
        backgroundColor: color,
        borderTopWidth: 2.2,
        borderTopColor: 'rgba(255, 255, 255, 0.7)',
        borderLeftWidth: 1.8,
        borderLeftColor: 'rgba(255, 255, 255, 0.45)',
        borderRightWidth: 1.8,
        borderRightColor: 'rgba(0, 0, 0, 0.35)',
        borderBottomWidth: 3,
        borderBottomColor: 'rgba(0, 0, 0, 0.55)',
        overflow: 'hidden',
        shadowColor: color,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isActive ? 0.95 : 0.5,
        shadowRadius: isActive ? 7 : 3,
        elevation: isActive ? 7 : 3,
      }}
    >
      {/* Top Gloss Specular Shine Reflection */}
      <View
        style={{
          position: 'absolute',
          top: 1.5,
          left: 1.5,
          right: 1.5,
          height: (size - 2) * 0.36,
          backgroundColor: 'rgba(255, 255, 255, 0.4)',
          borderTopLeftRadius: 3,
          borderTopRightRadius: 3,
        }}
      />
      {/* Top-Left Glistening Sparkle Dot */}
      <View
        style={{
          position: 'absolute',
          top: 2.5,
          left: 2.5,
          width: 3.5,
          height: 3.5,
          borderRadius: 2,
          backgroundColor: '#FFFFFF',
          opacity: 0.9,
        }}
      />
    </View>
  );
}

export default function CyberTetrisGame({ onBackToHub, onScoreUpdate, isPaused = false }) {
  const isPausedRef = useRef(isPaused);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const juiceRef = useRef(null);

  const maxAvailableHeight = height - (insets.top + insets.bottom + 210);
  const cellSizeByHeight = Math.floor(maxAvailableHeight / ROWS);
  const cellSizeByWidth = Math.floor((width - 150) / COLS);
  const cellSize = Math.max(16, Math.min(cellSizeByHeight, cellSizeByWidth, 24));

  const [initialData] = useState(() => getInitialTetrisPiece());
  const [grid, setGrid] = useState(() => Array.from({ length: ROWS }, () => Array(COLS).fill(null)));
  const [currentPiece, setCurrentPiece] = useState(initialData.piece);
  const [pos, setPos] = useState(initialData.pos);
  const [nextPieceType, setNextPieceType] = useState(initialData.nextType);
  const [holdPieceType, setHoldPieceType] = useState(null);
  const [canHold, setCanHold] = useState(true);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [linesCleared, setLinesCleared] = useState(0);
  const [level, setLevel] = useState(1);
  const [isGameOver, setIsGameOver] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const gridRef = useRef(grid);
  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  const pieceRef = useRef(currentPiece);
  useEffect(() => {
    pieceRef.current = currentPiece;
  }, [currentPiece]);

  const posRef = useRef(pos);
  useEffect(() => {
    posRef.current = pos;
  }, [pos]);

  const dropTimerRef = useRef(null);

  // Check collision against grid boundaries and locked blocks
  const checkCollision = useCallback((shape, r, c, customGrid = null) => {
    const targetGrid = customGrid || gridRef.current;
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const newR = r + row;
          const newC = c + col;
          if (newC < 0 || newC >= COLS || newR >= ROWS) {
            return true;
          }
          if (newR >= 0 && targetGrid[newR][newC] !== null) {
            return true;
          }
        }
      }
    }
    return false;
  }, []);

  const handleGameOver = useCallback(() => {
    setIsGameOver(true);
    if (dropTimerRef.current) clearInterval(dropTimerRef.current);
    playGameOverSound();
    triggerGameOverHaptic();
    juiceRef.current?.shake(10, 10);
    juiceRef.current?.flash(COLORS.danger);
    setModalVisible(true);
  }, []);

  // Spawn new piece
  const spawnPiece = useCallback(
    (typeToSpawn = null) => {
      const type =
        typeToSpawn ||
        nextPieceType ||
        TETRO_KEYS[Math.floor(Math.random() * TETRO_KEYS.length)];
      const nextType = TETRO_KEYS[Math.floor(Math.random() * TETRO_KEYS.length)];
      setNextPieceType(nextType);

      const template = TETROMINOES[type];
      const startCol = Math.floor((COLS - template.shape[0].length) / 2);
      const startRow = 0;

      // Check immediate top out
      if (checkCollision(template.shape, startRow, startCol)) {
        handleGameOver();
        return;
      }

      const newPiece = {
        type,
        shape: template.shape,
        color: template.color,
      };

      setCurrentPiece(newPiece);
      setPos({ r: startRow, c: startCol });
      pieceRef.current = newPiece;
      posRef.current = { r: startRow, c: startCol };
      setCanHold(true);
    },
    [checkCollision, nextPieceType, handleGameOver]
  );

  // Initialize / Restart Game
  const initGame = useCallback(() => {
    const data = getInitialTetrisPiece();
    setGrid(Array.from({ length: ROWS }, () => Array(COLS).fill(null)));
    setScore(0);
    setLinesCleared(0);
    setLevel(1);
    setIsGameOver(false);
    setModalVisible(false);
    setHoldPieceType(null);
    setCanHold(true);
    setNextPieceType(data.nextType);
    setCurrentPiece(data.piece);
    setPos(data.pos);
    playTapSound();
  }, []);

  // Lock piece into grid & clear lines with juice
  const lockPiece = useCallback(() => {
    const piece = pieceRef.current;
    const p = posRef.current;
    if (!piece) return;

    const newGrid = gridRef.current.map((row) => [...row]);
    let lockedAtTop = false;

    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c]) {
          const boardR = p.r + r;
          const boardC = p.c + c;
          if (boardR <= 0) {
            lockedAtTop = true;
          }
          if (boardR >= 0 && boardR < ROWS && boardC >= 0 && boardC < COLS) {
            newGrid[boardR][boardC] = piece.color;
          }
        }
      }
    }

    // Check full rows
    const survivingRows = [];
    let lines = 0;
    const clearedRowIndices = [];

    for (let r = 0; r < ROWS; r++) {
      if (newGrid[r].every((cell) => cell !== null)) {
        lines++;
        clearedRowIndices.push(r);
      } else {
        survivingRows.push(newGrid[r]);
      }
    }

    // Add empty rows at top
    while (survivingRows.length < ROWS) {
      survivingRows.unshift(Array(COLS).fill(null));
    }

    if (lines > 0) {
      playSliceSound();
      triggerMediumHaptic();

      // Screen shake and spark bursts
      juiceRef.current?.shake(lines * 3, lines * 3);

      clearedRowIndices.forEach((r) => {
        juiceRef.current?.burst(width / 2, r * cellSize + 150, piece.color, 14);
      });

      const points =
        lines === 4
          ? 1000 // TETRIS!
          : lines === 3
            ? 500
            : lines === 2
              ? 300
              : 100;

      if (lines === 4) {
        triggerPerfectHaptic();
        playPerfectSound();
        juiceRef.current?.celebrate('⚡ TETRIS OVERDRIVE!', '+1000 PTS', COLORS.solarGold);
      } else if (lines === 3) {
        juiceRef.current?.popup('TRIPLE CLEAR!', `+${points * level} PTS`, COLORS.cyan);
      } else if (lines === 2) {
        juiceRef.current?.popup('DOUBLE CLEAR!', `+${points * level} PTS`, COLORS.matrixMint);
      }

      setScore((s) => {
        const ns = s + points * level;
        if (ns > highScore) setHighScore(ns);
        onScoreUpdate?.(ns);
        return ns;
      });

      setLinesCleared((l) => {
        const nextLines = l + lines;
        setLevel(Math.floor(nextLines / 8) + 1);
        return nextLines;
      });
    } else {
      triggerLightHaptic();
    }

    setGrid(survivingRows);
    gridRef.current = survivingRows;

    // Game Over if blocks reached top
    if (lockedAtTop && lines === 0) {
      handleGameOver();
      return;
    }
    if (survivingRows[0].some((cell) => cell !== null)) {
      handleGameOver();
      return;
    }

    spawnPiece();
  }, [level, spawnPiece, width, cellSize, highScore, onScoreUpdate, handleGameOver]);

  // Drop step tick
  const dropStep = useCallback(() => {
    if (isPausedRef.current) return;
    if (!pieceRef.current || isGameOver) return;
    const curPos = posRef.current;
    if (!checkCollision(pieceRef.current.shape, curPos.r + 1, curPos.c)) {
      setPos((p) => ({ ...p, r: p.r + 1 }));
      posRef.current = { ...curPos, r: curPos.r + 1 };
    } else {
      lockPiece();
    }
  }, [checkCollision, isGameOver, lockPiece]);

  // Auto gravity timer
  useEffect(() => {
    if (isGameOver) return;
    const speed = Math.max(120, 800 - (level - 1) * 75);
    dropTimerRef.current = setInterval(dropStep, speed);
    return () => clearInterval(dropTimerRef.current);
  }, [level, isGameOver, dropStep]);

  // Player Controls
  const moveLeft = () => {
    if (!currentPiece || isGameOver || isPaused) return;
    if (!checkCollision(currentPiece.shape, pos.r, pos.c - 1)) {
      setPos((p) => ({ ...p, c: p.c - 1 }));
      posRef.current = { ...pos, c: pos.c - 1 };
      playTapSound();
      triggerLightHaptic();
    }
  };

  const moveRight = () => {
    if (!currentPiece || isGameOver || isPaused) return;
    if (!checkCollision(currentPiece.shape, pos.r, pos.c + 1)) {
      setPos((p) => ({ ...p, c: p.c + 1 }));
      posRef.current = { ...pos, c: pos.c + 1 };
      playTapSound();
      triggerLightHaptic();
    }
  };

  const rotatePiece = () => {
    if (!currentPiece || isGameOver || isPaused) return;
    const rotated = rotateMatrix(currentPiece.shape);

    // Wall-kick assist: test normal, left kick, right kick
    let kickCol = pos.c;
    if (checkCollision(rotated, pos.r, kickCol)) {
      if (!checkCollision(rotated, pos.r, kickCol - 1)) {
        kickCol -= 1;
      } else if (!checkCollision(rotated, pos.r, kickCol + 1)) {
        kickCol += 1;
      } else if (!checkCollision(rotated, pos.r, kickCol - 2)) {
        kickCol -= 2;
      } else if (!checkCollision(rotated, pos.r, kickCol + 2)) {
        kickCol += 2;
      } else {
        return; // Rotation blocked
      }
    }

    const updated = { ...currentPiece, shape: rotated };
    setCurrentPiece(updated);
    setPos((p) => ({ ...p, c: kickCol }));
    pieceRef.current = updated;
    posRef.current = { ...pos, c: kickCol };
    playSliceSound();
    triggerLightHaptic();
  };

  const softDrop = () => {
    if (!currentPiece || isGameOver || isPaused) return;
    dropStep();
    triggerLightHaptic();
  };

  const hardDrop = () => {
    if (!currentPiece || isGameOver || isPaused) return;
    let targetR = pos.r;
    while (!checkCollision(currentPiece.shape, targetR + 1, pos.c)) {
      targetR++;
    }
    setPos((p) => ({ ...p, r: targetR }));
    posRef.current = { ...pos, r: targetR };
    triggerMediumHaptic();
    playTapSound();
    juiceRef.current?.shake(4, 4);
    lockPiece();
  };

  const holdPiece = () => {
    if (!currentPiece || !canHold || isGameOver || isPaused) return;
    const currentType = currentPiece.type;
    playSliceSound();
    triggerMediumHaptic();

    if (!holdPieceType) {
      setHoldPieceType(currentType);
      spawnPiece();
    } else {
      const prevHold = holdPieceType;
      setHoldPieceType(currentType);
      spawnPiece(prevHold);
    }
    setCanHold(false);
  };

  // Next rotation preview shape
  const nextRotationShape = currentPiece ? rotateMatrix(currentPiece.shape) : null;

  // Swipe & Tap Touch Gestures on Board
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });

  const handleTouchStart = (e) => {
    touchStartRef.current = {
      x: e.nativeEvent.pageX,
      y: e.nativeEvent.pageY,
      time: Date.now(),
    };
  };

  const handleTouchEnd = (e) => {
    if (isGameOver || isPaused) return;
    const dx = e.nativeEvent.pageX - touchStartRef.current.x;
    const dy = e.nativeEvent.pageY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;

    if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && dt < 280) {
      rotatePiece();
    } else if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 25) moveRight();
      else if (dx < -25) moveLeft();
    } else {
      if (dy > 40) hardDrop();
      else if (dy > 15) softDrop();
    }
  };

  // Calculate ghost drop row for piece landing preview
  let ghostR = pos.r;
  if (currentPiece) {
    while (!checkCollision(currentPiece.shape, ghostR + 1, pos.c)) {
      ghostR++;
    }
  }

  return (
    <View style={styles.container}>
      <JuiceEngine ref={juiceRef}>
        <View style={{ flex: 1 }} pointerEvents={modalVisible ? 'none' : 'auto'}>
          <MiniGameHeader
            floorNum={26}
            gameTitle="TETRIS NEO"
            category="ARCADE BLOCKS"
            accentColor="#00F5FF"
            score={score}
            onBackToHub={onBackToHub}
            disabled={modalVisible}
          />

          {/* Subheader Status Strip */}
          <View style={styles.statusStrip}>
            <View style={styles.badgeRow}>
              <Text style={styles.crownIcon}>👑</Text>
              <Text style={styles.badgeDim}>BEST</Text>
              <Text style={styles.badgeBright}>{highScore}</Text>
            </View>

            <View style={styles.badgeRow}>
              <Text style={styles.badgeDim}>LINES</Text>
              <Text style={[styles.badgeBright, { color: '#00F5FF' }]}>{linesCleared}</Text>
            </View>

            <View style={styles.badgeRow}>
              <Text style={styles.badgeDim}>LEVEL</Text>
              <Text style={[styles.badgeBright, { color: '#FFE600' }]}>{level}</Text>
            </View>
          </View>

          {/* Main Playfield with Sidebars */}
          <View style={styles.mainPlayfield}>
            {/* Left Side: Hold Container */}
            <View style={styles.sideCol}>
              <Text style={styles.sideLabel}>HOLD</Text>
              <Pressable style={styles.sideBox} onPress={holdPiece} disabled={!canHold}>
                {holdPieceType && (
                  <View style={styles.miniPieceGrid}>
                    {TETROMINOES[holdPieceType].shape.map((row, r) => (
                      <View key={`hr_${r}`} style={styles.miniRow}>
                        {row.map((val, c) => (
                          <View
                            key={`hc_${c}`}
                            style={[
                              styles.miniCell,
                              val ? { backgroundColor: TETROMINOES[holdPieceType].color } : null,
                            ]}
                          />
                        ))}
                      </View>
                    ))}
                  </View>
                )}
              </Pressable>

              <Text style={[styles.sideLabel, { marginTop: 14 }]}>LINES</Text>
              <Text style={[styles.sideVal, { color: '#00F5FF' }]}>{linesCleared}</Text>
            </View>

            {/* Central Matrix Grid with Juicy 3D Blocks */}
            <View
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              style={[
                styles.gridBorder,
                { width: COLS * cellSize + 6, height: ROWS * cellSize + 6 },
              ]}
            >
              {Array.from({ length: ROWS }).map((_, r) => (
                <View key={`r_${r}`} style={{ flexDirection: 'row' }}>
                  {Array.from({ length: COLS }).map((_, c) => {
                    // Determine block color
                    let color = grid[r][c];
                    let isActive = false;

                    // Active falling piece
                    if (
                      currentPiece &&
                      r >= pos.r &&
                      r < pos.r + currentPiece.shape.length &&
                      c >= pos.c &&
                      c < pos.c + currentPiece.shape[0].length &&
                      currentPiece.shape[r - pos.r][c - pos.c]
                    ) {
                      color = currentPiece.color;
                      isActive = true;
                    }

                    // Ghost piece landing preview
                    let isGhost = false;
                    if (
                      !color &&
                      currentPiece &&
                      r >= ghostR &&
                      r < ghostR + currentPiece.shape.length &&
                      c >= pos.c &&
                      c < pos.c + currentPiece.shape[0].length &&
                      currentPiece.shape[r - ghostR][c - pos.c]
                    ) {
                      isGhost = true;
                    }

                    if (color) {
                      return (
                        <JuicyBlock
                          key={`c_${c}`}
                          color={color}
                          size={cellSize}
                          isActive={isActive}
                        />
                      );
                    }

                    if (isGhost) {
                      return (
                        <JuicyBlock
                          key={`c_${c}`}
                          color={currentPiece.color}
                          size={cellSize}
                          isGhost={true}
                        />
                      );
                    }

                    // Empty recessed slot
                    return (
                      <View
                        key={`c_${c}`}
                        style={[
                          styles.emptySlot,
                          { width: cellSize - 2, height: cellSize - 2 },
                        ]}
                      />
                    );
                  })}
                </View>
              ))}
            </View>

            {/* Right Side: Next Piece Preview & Rotation Preview */}
            <View style={styles.sideCol}>
              <Text style={styles.sideLabel}>NEXT</Text>
              <View style={styles.sideBox}>
                {nextPieceType && (
                  <View style={styles.miniPieceGrid}>
                    {TETROMINOES[nextPieceType].shape.map((row, r) => (
                      <View key={`nr_${r}`} style={styles.miniRow}>
                        {row.map((val, c) => (
                          <View
                            key={`nc_${c}`}
                            style={[
                              styles.miniCell,
                              val ? { backgroundColor: TETROMINOES[nextPieceType].color } : null,
                            ]}
                          />
                        ))}
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Next Rotation Preview */}
              <Text style={[styles.sideLabel, { marginTop: 14 }]}>ROTATE ↷</Text>
              <View style={styles.sideBox}>
                {nextRotationShape && currentPiece && (
                  <View style={styles.miniPieceGrid}>
                    {nextRotationShape.map((row, r) => (
                      <View key={`rr_${r}`} style={styles.miniRow}>
                        {row.map((val, c) => (
                          <View
                            key={`rc_${c}`}
                            style={[
                              styles.miniCell,
                              val ? { backgroundColor: currentPiece.color } : null,
                            ]}
                          />
                        ))}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Cyber Arcade D-Pad Controls */}
          <View style={[styles.controlsRow, { paddingBottom: Math.max(insets.bottom, 12) + 6 }]}>
            <Pressable hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }} style={styles.ctrlBtn} onPress={moveLeft}>
              <Text style={styles.ctrlText}>◀</Text>
            </Pressable>
            <Pressable hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }} style={styles.ctrlBtn} onPress={rotatePiece}>
              <Text style={[styles.ctrlText, { color: COLORS.solarGold }]}>⟳</Text>
            </Pressable>
            <Pressable hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }} style={styles.ctrlBtn} onPress={moveRight}>
              <Text style={styles.ctrlText}>▶</Text>
            </Pressable>
            <Pressable hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }} style={styles.ctrlBtn} onPress={softDrop}>
              <Text style={styles.ctrlText}>▼</Text>
            </Pressable>
            <Pressable hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }} style={[styles.ctrlBtn, styles.hardDropBtn]} onPress={hardDrop}>
              <Text style={[styles.ctrlText, { color: '#00F5FF' }]}>⚡</Text>
            </Pressable>
            <Pressable hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }} style={styles.ctrlBtn} onPress={holdPiece}>
              <Text style={[styles.ctrlText, { fontSize: 10 }]}>HOLD</Text>
            </Pressable>
          </View>
        </View>
      </JuiceEngine>

      <GameResultModal
        visible={modalVisible}
        type="gameover"
        score={score}
        level={level}
        onRetry={initGame}
        onBackToHub={onBackToHub}
        buttonText="PLAY AGAIN"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050414',
  },
  statusStrip: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(12, 10, 26, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 245, 255, 0.12)',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  crownIcon: {
    fontSize: 14,
  },
  badgeDim: {
    fontFamily: monoFont,
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '700',
  },
  badgeBright: {
    fontFamily: monoFont,
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  mainPlayfield: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  sideCol: {
    width: 62,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  sideLabel: {
    fontFamily: monoFont,
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.55)',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sideBox: {
    width: 56,
    height: 56,
    backgroundColor: 'rgba(12, 14, 28, 0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 245, 255, 0.25)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#00F5FF',
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  sideVal: {
    fontFamily: monoFont,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  miniPieceGrid: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniRow: {
    flexDirection: 'row',
  },
  miniCell: {
    width: 9,
    height: 9,
    margin: 1,
    borderRadius: 2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.5)',
  },
  gridBorder: {
    backgroundColor: '#080918',
    borderWidth: 2.5,
    borderColor: '#7928CA',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#7928CA',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 16,
    shadowOpacity: 0.75,
    elevation: 10,
    padding: 1,
  },
  emptySlot: {
    margin: 1,
    borderRadius: 4,
    backgroundColor: '#0E1022',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.06)',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 8,
    backgroundColor: 'rgba(8, 6, 20, 0.96)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 245, 255, 0.18)',
  },
  ctrlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 245, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hardDropBtn: {
    borderColor: '#00F5FF',
    backgroundColor: 'rgba(0, 245, 255, 0.18)',
    shadowColor: '#00F5FF',
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  ctrlText: {
    fontFamily: monoFont,
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
