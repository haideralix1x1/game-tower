import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  Platform,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

const COLS = 10;
const ROWS = 18;

// Tetromino Definitions & Neon Colors
const TETROMINOES = {
  I: { shape: [[1, 1, 1, 1]], color: '#00F5FF' },
  O: { shape: [[1, 1], [1, 1]], color: '#FFD166' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: '#9D4EDD' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: '#39FF14' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: '#FF0055' },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: '#0088FF' },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: '#FF6D00' },
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

export default function CyberTetrisGame({ onBackToHub, onScoreUpdate, isPaused = false }) {
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const maxAvailableHeight = height - (insets.top + insets.bottom + 220);
  const cellSize = Math.max(16, Math.floor(Math.min((width - 130) / COLS, maxAvailableHeight / ROWS)));

  const [grid, setGrid] = useState(() =>
    Array.from({ length: ROWS }, () => Array(COLS).fill(null))
  );

  const [score, setScore] = useState(0);
  const [linesCleared, setLinesCleared] = useState(0);
  const [level, setLevel] = useState(1);
  const [isGameOver, setIsGameOver] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Current falling piece
  const [currentPiece, setCurrentPiece] = useState(null);
  const [pos, setPos] = useState({ r: 0, c: 3 });
  const [nextPieceType, setNextPieceType] = useState('T');
  const [holdPieceType, setHoldPieceType] = useState(null);
  const [canHold, setCanHold] = useState(true);

  const gridRef = useRef(grid);
  gridRef.current = grid;
  const pieceRef = useRef(currentPiece);
  pieceRef.current = currentPiece;
  const posRef = useRef(pos);
  posRef.current = pos;

  const dropTimerRef = useRef(null);

  // Check collision with walls or placed blocks
  const checkCollision = useCallback((pieceMatrix, row, col, curGrid = gridRef.current) => {
    for (let r = 0; r < pieceMatrix.length; r++) {
      for (let c = 0; c < pieceMatrix[r].length; c++) {
        if (pieceMatrix[r][c]) {
          const newR = row + r;
          const newC = col + c;
          if (newR < 0 || newR >= ROWS || newC < 0 || newC >= COLS) {
            return true;
          }
          if (curGrid[newR] && curGrid[newR][newC] !== null) {
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

  // Initialize Game
  const initGame = useCallback(() => {
    setGrid(Array.from({ length: ROWS }, () => Array(COLS).fill(null)));
    setScore(0);
    setLinesCleared(0);
    setLevel(1);
    setIsGameOver(false);
    setModalVisible(false);
    setHoldPieceType(null);
    setCanHold(true);

    const firstType = TETRO_KEYS[Math.floor(Math.random() * TETRO_KEYS.length)];
    const secondType = TETRO_KEYS[Math.floor(Math.random() * TETRO_KEYS.length)];
    setNextPieceType(secondType);

    const template = TETROMINOES[firstType];
    const startCol = Math.floor((COLS - template.shape[0].length) / 2);
    setCurrentPiece({
      type: firstType,
      shape: template.shape,
      color: template.color,
    });
    setPos({ r: 0, c: startCol });
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  // Lock piece into grid and check line clears
  const lockPiece = useCallback(() => {
    const piece = pieceRef.current;
    const { r: curR, c: curC } = posRef.current;
    if (!piece) return;

    let lockedAtTop = false;
    const newGrid = gridRef.current.map((row) => [...row]);
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c]) {
          const targetR = curR + r;
          const targetC = curC + c;
          if (targetR <= 0) {
            lockedAtTop = true;
          }
          if (targetR >= 0 && targetR < ROWS && targetC >= 0 && targetC < COLS) {
            newGrid[targetR][targetC] = piece.color;
          }
        }
      }
    }

    // Check full rows
    const survivingRows = [];
    let lines = 0;
    for (let r = 0; r < ROWS; r++) {
      if (newGrid[r].every((cell) => cell !== null)) {
        lines++;
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
      const points =
        lines === 4
          ? 1000 // TETRIS!
          : lines === 3
            ? 500
            : lines === 2
              ? 300
              : 100;

      if (lines === 4) {
        JuiceEngine.celebrate(width / 2, height / 2);
      }

      setScore((s) => {
        const ns = s + points * level;
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

    // Game Over if blocks reached the top and were not cleared, or row 0 is occupied
    if (lockedAtTop && lines === 0) {
      handleGameOver();
      return;
    }
    if (survivingRows[0].some((cell) => cell !== null)) {
      handleGameOver();
      return;
    }

    spawnPiece();
  }, [level, spawnPiece, width, height, onScoreUpdate, handleGameOver]);

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
    const interval = Math.max(450, 950 - (level - 1) * 35);
    dropTimerRef.current = setInterval(dropStep, interval);

    return () => {
      if (dropTimerRef.current) clearInterval(dropTimerRef.current);
    };
  }, [dropStep, level, isGameOver]);

  // Player controls
  const moveLeft = () => {
    if (isPausedRef.current || !currentPiece) return;
    if (!checkCollision(currentPiece.shape, pos.r, pos.c - 1)) {
      setPos((p) => ({ ...p, c: p.c - 1 }));
      playTapSound();
    }
  };

  const moveRight = () => {
    if (isPausedRef.current || !currentPiece) return;
    if (!checkCollision(currentPiece.shape, pos.r, pos.c + 1)) {
      setPos((p) => ({ ...p, c: p.c + 1 }));
      playTapSound();
    }
  };

  const rotatePiece = () => {
    if (isPausedRef.current || !currentPiece) return;
    const rotated = rotateMatrix(currentPiece.shape);
    // Wall kick attempts
    if (!checkCollision(rotated, pos.r, pos.c)) {
      setCurrentPiece((p) => ({ ...p, shape: rotated }));
      playTapSound();
    } else if (!checkCollision(rotated, pos.r, pos.c - 1)) {
      setCurrentPiece((p) => ({ ...p, shape: rotated }));
      setPos((p) => ({ ...p, c: p.c - 1 }));
      playTapSound();
    } else if (!checkCollision(rotated, pos.r, pos.c + 1)) {
      setCurrentPiece((p) => ({ ...p, shape: rotated }));
      setPos((p) => ({ ...p, c: p.c + 1 }));
      playTapSound();
    }
  };

  const softDrop = () => {
    dropStep();
  };

  const hardDrop = () => {
    if (isPausedRef.current || !currentPiece) return;
    let targetR = pos.r;
    while (!checkCollision(currentPiece.shape, targetR + 1, pos.c)) {
      targetR++;
    }
    posRef.current = { ...pos, r: targetR };
    setPos({ ...pos, r: targetR });
    lockPiece();
    playSliceSound();
    triggerMediumHaptic();
  };

  const holdPiece = () => {
    if (!canHold || !currentPiece) return;
    setCanHold(false);
    const curType = currentPiece.type;

    if (holdPieceType) {
      spawnPiece(holdPieceType);
    } else {
      spawnPiece();
    }
    setHoldPieceType(curType);
    playTapSound();
  };

  // Next rotation shape preview for side panel
  const nextRotationShape = currentPiece ? rotateMatrix(currentPiece.shape) : null;

  const matrixPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.hypot(gesture.dx, gesture.dy) > 10,
      onPanResponderRelease: (_, gesture) => {
        if (isPausedRef.current || isGameOver) return;
        const { dx, dy, vy } = gesture;
        if (dy > 45 || vy > 0.8) {
          hardDrop();
        } else if (dy > 20) {
          softDrop();
        } else if (dx < -20) {
          moveLeft();
        } else if (dx > 20) {
          moveRight();
        } else if (Math.hypot(dx, dy) < 10) {
          rotatePiece();
        }
      },
    })
  ).current;

  
  return (
    <View style={styles.container}>
      <MiniGameHeader
        floorNum={26}
        gameTitle="TETRIS NEO"
        category="ARCADE BLOCKS"
        accentColor="#00F5FF"
        score={score}
        onBackToHub={onBackToHub}
      />

      {/* Main Playfield with Sidebars */}
      <View style={styles.mainPlayfield}>
        {/* Left Side: Hold Container */}
        <View style={styles.sideCol}>
          <Text style={styles.sideLabel}>HOLD</Text>
          <View style={styles.sideBox}>
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
          </View>

          <Text style={[styles.sideLabel, { marginTop: 14 }]}>LVL</Text>
          <Text style={[styles.sideVal, { color: COLORS.cyan }]}>{level}</Text>

          <Text style={[styles.sideLabel, { marginTop: 10 }]}>LINES</Text>
          <Text style={[styles.sideVal, { color: COLORS.solarGold }]}>{linesCleared}</Text>
        </View>

        {/* Center: Tetris Matrix Grid */}
        <View
          {...matrixPanResponder.panHandlers}
          style={[
            { width: COLS * cellSize + 4, height: ROWS * cellSize + 4 },
          ]}
        >
          {Array.from({ length: ROWS }).map((_, r) => (
            <View key={`r_${r}`} style={{ flexDirection: 'row' }}>
              {Array.from({ length: COLS }).map((_, c) => {
                // Determine block color
                let color = grid[r][c];

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
                }

                return (
                  <View
                    key={`c_${c}`}
                    style={[
                      styles.cell,
                      { width: cellSize, height: cellSize },
                      color
                        ? {
                            backgroundColor: color,
                            borderColor: '#FFFFFF',
                            borderWidth: 0.8,
                          }
                        : null,
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

          {/* Next Rotation Preview in the side space */}
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

      {/* Cyber D-Pad Controls */}
      <View style={[styles.controlsRow, { paddingBottom: Math.max(insets.bottom, 14) + 10 }]}>
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
    backgroundColor: '#040114',
  },
  mainPlayfield: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  sideCol: {
    width: 60,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  sideLabel: {
    fontFamily: monoFont,
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.55)',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sideBox: {
    width: 54,
    height: 54,
    backgroundColor: 'rgba(15, 10, 35, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.25)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
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
    borderRadius: 1.5,
  },
  gridBorder: {
    backgroundColor: 'rgba(10, 6, 26, 0.95)',
    borderWidth: 2,
    borderColor: '#00F5FF',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#00F5FF',
    shadowRadius: 10,
    shadowOpacity: 0.5,
    elevation: 4,
  },
  cell: {
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 2,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 10,
    backgroundColor: 'rgba(10, 6, 28, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 245, 255, 0.2)',
  },
  ctrlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hardDropBtn: {
    borderColor: '#00F5FF',
    backgroundColor: 'rgba(0, 245, 255, 0.15)',
  },
  ctrlText: {
    fontFamily: monoFont,
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
