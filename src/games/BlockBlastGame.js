import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  useWindowDimensions,
  PanResponder,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../../styles';
import MiniGameHeader from '../components/MiniGameHeader';
import JuiceEngine from '../components/JuiceEngine';
import GameResultModal from '../components/GameResultModal';
import {
  triggerLightHaptic,
  triggerSliceHaptic,
  triggerPerfectHaptic,
  triggerGameOverHaptic,
} from '../utils/haptics';
import {
  playTapSound,
  playPerfectSound,
  playGameOverSound,
} from '../utils/sound';

const STORAGE_KEY = '@game_tower:best_blockblast_v1';
const GRID_SIZE = 8;

const SHAPES = [
  { cells: [[0, 0]], color: '#FFE600', name: 'DOT' },
  { cells: [[0, 0], [0, 1]], color: '#00F5FF', name: 'DUO-H' },
  { cells: [[0, 0], [1, 0]], color: '#00F5FF', name: 'DUO-V' },
  { cells: [[0, 0], [0, 1], [0, 2]], color: '#FF007F', name: 'BAR-3H' },
  { cells: [[0, 0], [1, 0], [2, 0]], color: '#FF007F', name: 'BAR-3V' },
  { cells: [[0, 0], [0, 1], [1, 0], [1, 1]], color: '#FF5E00', name: 'QUAD' },
  { cells: [[0, 0], [1, 0], [1, 1]], color: '#9D4EDD', name: 'CORNER' },
  { cells: [[0, 0], [0, 1], [0, 2], [1, 1]], color: '#FF007F', name: 'T-CORE' },
  { cells: [[0, 0], [1, 0], [2, 0], [2, 1]], color: '#0070F3', name: 'L-SHAPE' },
  { cells: [[0, 0], [0, 1], [0, 2], [0, 3]], color: '#00F5D4', name: 'LONG-4' },
];

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const randomHand = () =>
  Array.from({ length: 3 }, (_, i) => ({
    ...SHAPES[Math.floor(Math.random() * SHAPES.length)],
    id: `piece_${Date.now()}_${i}_${Math.random()}`,
    used: false,
  }));

function checkPieceFit(g, piece, r, c) {
  if (!piece || r < 0 || c < 0) return false;
  for (const [dr, dc] of piece.cells) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) return false;
    if (g[nr][nc] !== null) return false;
  }
  return true;
}

/**
 * 3D Glossy Candy/Jewel Block with Specular Shine & Bevel
 */
function JuicyBlock({ color, size, isPreview = false }) {
  return (
    <View
      style={{
        width: size - 2,
        height: size - 2,
        margin: 1,
        borderRadius: 5,
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
        opacity: isPreview ? 0.65 : 1,
        shadowColor: color,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.65,
        shadowRadius: 5,
        elevation: 4,
      }}
    >
      {/* Top Gloss Reflection */}
      <View
        style={{
          position: 'absolute',
          top: 1.5,
          left: 1.5,
          right: 1.5,
          height: (size - 2) * 0.38,
          backgroundColor: 'rgba(255, 255, 255, 0.4)',
          borderTopLeftRadius: 3.5,
          borderTopRightRadius: 3.5,
        }}
      />
      {/* Top-Left Sparkle */}
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

/**
 * Draggable Dock Card Piece
 */
function DraggableDockPiece({
  piece,
  idx,
  selected,
  isDraggingThis,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
}) {
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !piece.used,
        onMoveShouldSetPanResponder: (evt, gesture) =>
          !piece.used && (Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4),
        onPanResponderGrant: (evt, gesture) => {
          onSelect(idx);
          onDragStart(idx, piece, gesture.x0, gesture.y0);
        },
        onPanResponderMove: (evt, gesture) => {
          onDragMove(gesture.moveX, gesture.moveY);
        },
        onPanResponderRelease: (evt, gesture) => {
          onDragEnd(gesture.moveX, gesture.moveY, Math.hypot(gesture.dx, gesture.dy) > 8);
        },
        onPanResponderTerminate: () => {
          onDragEnd(0, 0, false);
        },
      }),
    [piece, idx, onSelect, onDragStart, onDragMove, onDragEnd]
  );

  return (
    <View
      {...panResponder.panHandlers}
      style={[
        localStyles.dockCard,
        selected && {
          borderColor: piece.color,
          backgroundColor: `${piece.color}25`,
          shadowColor: piece.color,
          shadowOpacity: 0.8,
          shadowRadius: 10,
          elevation: 8,
          transform: [{ scale: 1.05 }],
        },
        piece.used && { opacity: 0.2 },
        isDraggingThis && { opacity: 0.3 },
      ]}
    >
      <View style={localStyles.miniPieceContainer}>
        {piece.cells.map(([r, c], cIdx) => (
          <View
            key={`cell_preview_${cIdx}`}
            style={[
              localStyles.miniPieceDot,
              {
                left: c * 13,
                top: r * 13,
                backgroundColor: piece.color,
              },
            ]}
          />
        ))}
      </View>

      <Text style={[localStyles.dockName, { color: piece.color }]}>
        {piece.name}
      </Text>
    </View>
  );
}

export default function BlockBlastGame({
  onScoreUpdate,
  onBackToHub,
  isPaused = false,
}) {
  const { width } = useWindowDimensions();
  const juiceRef = useRef(null);

  const [grid, setGrid] = useState(() =>
    Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null))
  );
  const [hand, setHand] = useState(() => randomHand());
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);

  // Dragging states
  const [draggingPiece, setDraggingPiece] = useState(null);
  const [draggingPos, setDraggingPos] = useState({ x: 0, y: 0 });
  const [hoverCell, setHoverCell] = useState(null);

  const boardRef = useRef(null);
  const boardRectRef = useRef(null);
  const hoverCellRef = useRef(null);
  const draggingPieceRef = useRef(null);

  const boardSize = Math.min(width - 32, 360);
  const cellSize = Math.floor((boardSize - 16) / GRID_SIZE);

  const updateBoardRect = useCallback(() => {
    if (boardRef.current && boardRef.current.measureInWindow) {
      boardRef.current.measureInWindow((x, y, w, h) => {
        if (w > 0 && h > 0) {
          boardRectRef.current = { x, y, width: w, height: h };
        }
      });
    }
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((val) => {
        if (val) setBestScore(parseInt(val, 10) || 0);
      })
      .catch(() => {});
  }, []);

  const updateBest = useCallback(
    async (nextScore) => {
      if (onScoreUpdate) onScoreUpdate(nextScore);
      if (nextScore > bestScore) {
        setBestScore(nextScore);
        try {
          await AsyncStorage.setItem(STORAGE_KEY, String(nextScore));
        } catch {}
      }
    },
    [bestScore, onScoreUpdate]
  );

  const resetGame = useCallback(() => {
    setGrid(
      Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null))
    );
    setHand(randomHand());
    setSelectedIdx(0);
    setScore(0);
    setIsGameOver(false);
    setDraggingPiece(null);
    setHoverCell(null);
  }, []);

  const canPieceFitAnywhere = (g, piece) => {
    for (let r = 0; r < GRID_SIZE; r += 1) {
      for (let c = 0; c < GRID_SIZE; c += 1) {
        let fits = true;
        for (const [dr, dc] of piece.cells) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE || g[nr][nc] !== null) {
            fits = false;
            break;
          }
        }
        if (fits) return true;
      }
    }
    return false;
  };

  const executePlacement = useCallback(
    (r, c, pieceIdx) => {
      if (isGameOver || isPaused) return false;
      const piece = hand[pieceIdx];
      if (!piece || piece.used) return false;

      // Verify all cells fit and are empty
      for (const [dr, dc] of piece.cells) {
        const nr = r + dr;
        const nc = c + dc;
        if (
          nr < 0 ||
          nr >= GRID_SIZE ||
          nc < 0 ||
          nc >= GRID_SIZE ||
          grid[nr][nc] !== null
        ) {
          return false;
        }
      }

      // Valid placement!
      triggerLightHaptic();
      playTapSound();

      const nextGrid = grid.map((row) => [...row]);
      for (const [dr, dc] of piece.cells) {
        nextGrid[r + dr][c + dc] = piece.color;
      }

      let placedPoints = piece.cells.length * 10;

      // Detect full rows
      const fullRows = [];
      for (let rowIdx = 0; rowIdx < GRID_SIZE; rowIdx += 1) {
        if (nextGrid[rowIdx].every((cell) => cell !== null)) {
          fullRows.push(rowIdx);
        }
      }

      // Detect full cols
      const fullCols = [];
      for (let colIdx = 0; colIdx < GRID_SIZE; colIdx += 1) {
        let isFull = true;
        for (let rowIdx = 0; rowIdx < GRID_SIZE; rowIdx += 1) {
          if (nextGrid[rowIdx][colIdx] === null) {
            isFull = false;
            break;
          }
        }
        if (isFull) fullCols.push(colIdx);
      }

      const totalLines = fullRows.length + fullCols.length;
      if (totalLines > 0) {
        triggerPerfectHaptic();
        playPerfectSound();
        if (juiceRef.current) {
          juiceRef.current.flash(piece.color);
          juiceRef.current.shake(6 * totalLines, 6 * totalLines);
          juiceRef.current.burst(width / 2, 260, piece.color, 16 * totalLines);
          juiceRef.current.popup(
            totalLines > 1 ? `COMBO x${totalLines}!` : 'LINE CLEARED!',
            `+${totalLines * 120} PTS`,
            piece.color
          );
        }

        fullRows.forEach((rowIdx) => {
          for (let col = 0; col < GRID_SIZE; col += 1) {
            nextGrid[rowIdx][col] = null;
          }
        });
        fullCols.forEach((colIdx) => {
          for (let row = 0; row < GRID_SIZE; row += 1) {
            nextGrid[row][colIdx] = null;
          }
        });

        placedPoints += totalLines * 120;
      }

      const nextScore = score + placedPoints;
      setScore(nextScore);
      updateBest(nextScore);
      setGrid(nextGrid);

      // Mark piece used
      const nextHand = hand.map((p, idx) =>
        idx === pieceIdx ? { ...p, used: true } : p
      );

      // If all pieces used, deal 3 new pieces
      const allUsed = nextHand.every((p) => p.used);
      const activeHand = allUsed ? randomHand() : nextHand;
      setHand(activeHand);

      // Select next available piece
      const firstAvailable = activeHand.findIndex((p) => !p.used);
      setSelectedIdx(firstAvailable !== -1 ? firstAvailable : 0);

      // Check Game Over
      const anyCanFit = activeHand.some(
        (p) => !p.used && canPieceFitAnywhere(nextGrid, p)
      );

      if (!anyCanFit) {
        setIsGameOver(true);
        triggerGameOverHaptic();
        playGameOverSound();
        if (juiceRef.current) {
          juiceRef.current.flash(COLORS.danger);
          juiceRef.current.popup('NO MOVES LEFT', 'GRID IS FULL', COLORS.danger);
        }
      }

      return true;
    },
    [isGameOver, isPaused, hand, grid, score, updateBest, width]
  );

  const handleCellTap = useCallback(
    (r, c) => {
      const success = executePlacement(r, c, selectedIdx);
      if (!success) {
        triggerSliceHaptic();
        if (juiceRef.current) juiceRef.current.shake(5, 3);
      }
    },
    [executePlacement, selectedIdx]
  );

  // Drag callbacks
  const handleDragStart = useCallback(
    (idx, piece, x0, y0) => {
      updateBoardRect();
      triggerLightHaptic();
      const maxR = Math.max(...piece.cells.map((c) => c[0]));
      const maxC = Math.max(...piece.cells.map((c) => c[1]));
      const dragObj = { ...piece, idx, maxR, maxC };
      draggingPieceRef.current = dragObj;
      setDraggingPiece(dragObj);
      setDraggingPos({ x: x0, y: y0 });
      setHoverCell(null);
      hoverCellRef.current = null;
    },
    [updateBoardRect]
  );

  const handleDragMove = useCallback(
    (moveX, moveY) => {
      setDraggingPos({ x: moveX, y: moveY });
      const piece = draggingPieceRef.current;
      if (!piece || !boardRectRef.current) return;

      const rect = boardRectRef.current;
      const floatingCenterX = moveX;
      const floatingCenterY = moveY - 65; // Lifted above thumb
      const anchorX = floatingCenterX - ((piece.maxC + 1) * cellSize) / 2;
      const anchorY = floatingCenterY - ((piece.maxR + 1) * cellSize) / 2;

      const boardLeft = rect.x + 6;
      const boardTop = rect.y + 6;

      const c = Math.round((anchorX - boardLeft) / cellSize);
      const r = Math.round((anchorY - boardTop) / cellSize);

      const valid = checkPieceFit(grid, piece, r, c);
      const nextHover = { r, c, valid };
      hoverCellRef.current = nextHover;
      setHoverCell(nextHover);
    },
    [cellSize, grid]
  );

  const handleDragEnd = useCallback(
    (moveX, moveY, wasDragged) => {
      const activeHover = hoverCellRef.current;
      const piece = draggingPieceRef.current;

      if (wasDragged && activeHover && activeHover.valid && piece) {
        executePlacement(activeHover.r, activeHover.c, piece.idx);
      } else if (wasDragged) {
        triggerSliceHaptic();
      }

      draggingPieceRef.current = null;
      hoverCellRef.current = null;
      setDraggingPiece(null);
      setHoverCell(null);
    },
    [executePlacement]
  );

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={localStyles.container}>
        <MiniGameHeader
          floorNum={13}
          gameTitle="BLOCK BLAST 8x8"
          category="PUZZLE"
          score={score}
          bestScore={bestScore}
          accentColor="#FFD166"
          onBack={onBackToHub}
          onReset={resetGame}
        />

        <View style={localStyles.body}>
          {/* Subheader Status Strip */}
          <View style={localStyles.statusStrip}>
            <View style={localStyles.badgeRow}>
              <Text style={{ fontSize: 13 }}>👑</Text>
              <Text style={localStyles.badgeDim}>BEST</Text>
              <Text style={localStyles.badgeBright}>{bestScore}</Text>
            </View>

            <View style={localStyles.badgeRow}>
              <Text style={localStyles.badgeDim}>SCORE</Text>
              <Text style={[localStyles.badgeBright, { color: '#00F5FF' }]}>{score}</Text>
            </View>
          </View>

          {/* 8x8 Board with Juicy 3D Blocks */}
          <View
            ref={boardRef}
            onLayout={updateBoardRect}
            style={[
              localStyles.board,
              { width: boardSize, height: boardSize },
            ]}
          >
            {grid.map((row, rIdx) => (
              <View key={`brow_${rIdx}`} style={localStyles.row}>
                {row.map((color, cIdx) => {
                  const isGhost =
                    hoverCell &&
                    hoverCell.valid &&
                    draggingPiece &&
                    draggingPiece.cells.some(
                      ([dr, dc]) =>
                        hoverCell.r + dr === rIdx && hoverCell.c + dc === cIdx
                    );

                  if (color) {
                    return (
                      <Pressable
                        key={`bcell_${rIdx}_${cIdx}`}
                        onPress={() => handleCellTap(rIdx, cIdx)}
                      >
                        <JuicyBlock color={color} size={cellSize} />
                      </Pressable>
                    );
                  }

                  if (isGhost && draggingPiece) {
                    return (
                      <View
                        key={`bcell_${rIdx}_${cIdx}`}
                        style={{
                          width: cellSize - 2,
                          height: cellSize - 2,
                          margin: 1,
                        }}
                      >
                        <JuicyBlock
                          color={draggingPiece.color}
                          size={cellSize}
                          isPreview={true}
                        />
                      </View>
                    );
                  }

                  return (
                    <Pressable
                      key={`bcell_${rIdx}_${cIdx}`}
                      onPress={() => handleCellTap(rIdx, cIdx)}
                      style={[
                        localStyles.emptySlot,
                        {
                          width: cellSize - 2,
                          height: cellSize - 2,
                        },
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </View>

          {/* 3-Piece Draggable Dock at Bottom */}
          <View style={[localStyles.dockRow, { width: boardSize }]}>
            {hand.map((piece, idx) => (
              <DraggableDockPiece
                key={piece.id}
                piece={piece}
                idx={idx}
                selected={idx === selectedIdx && !piece.used}
                isDraggingThis={draggingPiece?.idx === idx}
                onSelect={setSelectedIdx}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
              />
            ))}
          </View>

          <GameResultModal
            visible={isGameOver}
            type="GAME_OVER"
            title="NO MOVES REMAINING"
            subtitle="GRID HAS NO VALID CELLS FOR REMAINING MODULES"
            score={score}
            bestScore={bestScore}
            accentColor="#FFD166"
            onRetry={resetGame}
            retryLabel="PLAY AGAIN"
            onBackToHub={onBackToHub}
          />
        </View>

        {/* Floating Draggable Piece Following Finger */}
        {draggingPiece && (
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              { zIndex: 9999, elevation: 9999 },
            ]}
          >
            <View
              style={{
                position: 'absolute',
                left: draggingPos.x - ((draggingPiece.maxC + 1) * cellSize) / 2,
                top: draggingPos.y - 65 - ((draggingPiece.maxR + 1) * cellSize) / 2,
                width: (draggingPiece.maxC + 1) * cellSize,
                height: (draggingPiece.maxR + 1) * cellSize,
              }}
            >
              {draggingPiece.cells.map(([dr, dc], cIdx) => (
                <View
                  key={`floating_cell_${cIdx}`}
                  style={{
                    position: 'absolute',
                    left: dc * cellSize,
                    top: dr * cellSize,
                  }}
                >
                  <JuicyBlock color={draggingPiece.color} size={cellSize} />
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </JuiceEngine>
  );
}

const localStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050414' },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 16,
  },
  statusStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(12, 10, 26, 0.85)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.15)',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeDim: {
    fontFamily: monoFont,
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.55)',
    fontWeight: '700',
  },
  badgeBright: {
    fontFamily: monoFont,
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  board: {
    backgroundColor: '#080918',
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: '#7928CA',
    padding: 6,
    justifyContent: 'space-between',
    shadowColor: '#7928CA',
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  emptySlot: {
    margin: 1,
    borderRadius: 4.5,
    backgroundColor: '#0E1022',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.08)',
  },
  dockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    gap: 10,
  },
  dockCard: {
    flex: 1,
    height: 78,
    backgroundColor: 'rgba(12, 14, 28, 0.85)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 245, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  miniPieceContainer: {
    width: 44,
    height: 38,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniPieceDot: {
    position: 'absolute',
    width: 11,
    height: 11,
    borderRadius: 2.5,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.6)',
  },
  dockName: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 4,
  },
});
