import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, {
  Rect,
  Circle,
  Path,
  G,
  Line,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import MiniGameHeader from '../components/MiniGameHeader';
import JuiceEngine from '../components/JuiceEngine';
import GameResultModal from '../components/GameResultModal';
import {
  triggerLightHaptic,
  triggerMediumHaptic,
  triggerHeavyHaptic,
  triggerPerfectHaptic,
  triggerGameOverHaptic,
} from '../utils/haptics';
import {
  playTapSound,
  playPerfectSound,
  playGameOverSound,
  playChessMoveSound,
  playChessCaptureSound,
  playChessCheckSound,
  playVictorySound,
  startBGM,
  stopBGM,
} from '../utils/sound';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const STORAGE_BEST_KEY = '@game_tower:best_chess_v1';

// Piece Types: P = Pawn, N = Knight (Horse), B = Bishop, R = Rook, Q = Queen, K = King
// Colors: 'w' = White (Cyan Player), 'b' = Black (Red Bot)
const PIECE_VALUES = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Piece-Square Positional Tables (PST) for AI Evaluation (8x8)
const PAWN_PST = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const KNIGHT_PST = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

const BISHOP_PST = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 10, 10, 5, 0, -10],
  [-10, 5, 5, 10, 10, 5, 5, -10],
  [-10, 0, 10, 10, 10, 10, 0, -10],
  [-10, 10, 10, 10, 10, 10, 10, -10],
  [-10, 5, 0, 0, 0, 0, 5, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
];

const ROOK_PST = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [5, 10, 10, 10, 10, 10, 10, 5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [0, 0, 0, 5, 5, 0, 0, 0],
];

const QUEEN_PST = [
  [-20, -10, -10, -5, -5, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 5, 5, 5, 0, -10],
  [-5, 0, 5, 5, 5, 5, 0, -5],
  [0, 0, 5, 5, 5, 5, 0, -5],
  [-10, 5, 5, 5, 5, 5, 0, -10],
  [-10, 0, 5, 0, 0, 0, 0, -10],
  [-20, -10, -10, -5, -5, -10, -10, -20],
];

const KING_PST = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [20, 20, 0, 0, 0, 0, 20, 20],
  [20, 30, 10, 0, 0, 10, 30, 20],
];

// Standard Initial 8x8 Chess Board Setup
function getInitialBoard() {
  return [
    // Rank 8 (Black - Bot)
    [
      { type: 'r', color: 'b' },
      { type: 'n', color: 'b' },
      { type: 'b', color: 'b' },
      { type: 'q', color: 'b' },
      { type: 'k', color: 'b' },
      { type: 'b', color: 'b' },
      { type: 'n', color: 'b' },
      { type: 'r', color: 'b' },
    ],
    // Rank 7 (Black Pawns)
    Array.from({ length: 8 }, () => ({ type: 'p', color: 'b' })),
    // Rank 6
    Array.from({ length: 8 }, () => null),
    // Rank 5
    Array.from({ length: 8 }, () => null),
    // Rank 4
    Array.from({ length: 8 }, () => null),
    // Rank 3
    Array.from({ length: 8 }, () => null),
    // Rank 2 (White Pawns)
    Array.from({ length: 8 }, () => ({ type: 'p', color: 'w' })),
    // Rank 1 (White - Player)
    [
      { type: 'r', color: 'w' },
      { type: 'n', color: 'w' },
      { type: 'b', color: 'w' },
      { type: 'q', color: 'w' },
      { type: 'k', color: 'w' },
      { type: 'b', color: 'w' },
      { type: 'n', color: 'w' },
      { type: 'r', color: 'w' },
    ],
  ];
}

// Chess Piece Unicode & Display Glyphs
const PIECE_GLYPHS = {
  k: '♚',
  q: '♛',
  r: '♜',
  b: '♝',
  n: '♞',
  p: '♟',
};

const PIECE_NAMES = {
  k: 'KING',
  q: 'QUEEN',
  r: 'ROOK',
  b: 'BISHOP',
  n: 'KNIGHT (HORSE)',
  p: 'PAWN',
};

// Check if square is inside board
function inBounds(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

// Clone Board deeply
function cloneBoard(board) {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

// Generate pseudo-legal moves for a piece at (r, c)
function getPseudoLegalMoves(board, r, c) {
  const piece = board[r][c];
  if (!piece) return [];

  const moves = [];
  const { type, color } = piece;
  const oppColor = color === 'w' ? 'b' : 'w';

  if (type === 'p') {
    const dir = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;

    // Advance 1
    if (inBounds(r + dir, c) && !board[r + dir][c]) {
      moves.push({ r: r + dir, c });
      // Advance 2 from start
      if (r === startRow && inBounds(r + dir * 2, c) && !board[r + dir * 2][c]) {
        moves.push({ r: r + dir * 2, c });
      }
    }
    // Diagonal Captures
    for (const dc of [-1, 1]) {
      const nr = r + dir;
      const nc = c + dc;
      if (inBounds(nr, nc) && board[nr][nc] && board[nr][nc].color === oppColor) {
        moves.push({ r: nr, c: nc });
      }
    }
  } else if (type === 'n') {
    // Knight / Horse (L-shape moves)
    const knightOffsets = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1],
    ];
    for (const [dr, dc] of knightOffsets) {
      const nr = r + dr;
      const nc = c + dc;
      if (inBounds(nr, nc)) {
        if (!board[nr][nc] || board[nr][nc].color === oppColor) {
          moves.push({ r: nr, c: nc });
        }
      }
    }
  } else if (type === 'b' || type === 'r' || type === 'q') {
    // Sliding pieces
    const directions = [];
    if (type === 'b' || type === 'q') {
      directions.push([-1, -1], [-1, 1], [1, -1], [1, 1]); // Diagonals
    }
    if (type === 'r' || type === 'q') {
      directions.push([-1, 0], [1, 0], [0, -1], [0, 1]); // Orthogonals
    }

    for (const [dr, dc] of directions) {
      let step = 1;
      while (true) {
        const nr = r + dr * step;
        const nc = c + dc * step;
        if (!inBounds(nr, nc)) break;
        if (!board[nr][nc]) {
          moves.push({ r: nr, c: nc });
        } else {
          if (board[nr][nc].color === oppColor) {
            moves.push({ r: nr, c: nc });
          }
          break; // Blocked by piece
        }
        step++;
      }
    }
  } else if (type === 'k') {
    // King (1 square in any direction)
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (inBounds(nr, nc)) {
          if (!board[nr][nc] || board[nr][nc].color === oppColor) {
            moves.push({ r: nr, c: nc });
          }
        }
      }
    }
  }

  return moves;
}

// Find king position of given color
function findKing(board, color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === 'k' && p.color === color) {
        return { r, c };
      }
    }
  }
  return null;
}

// Check if square (r, c) is attacked by opponent
function isSquareAttacked(board, r, c, attackerColor) {
  for (let pr = 0; pr < 8; pr++) {
    for (let pc = 0; pc < 8; pc++) {
      const p = board[pr][pc];
      if (p && p.color === attackerColor) {
        const moves = getPseudoLegalMoves(board, pr, pc);
        if (moves.some((m) => m.r === r && m.c === c)) {
          return true;
        }
      }
    }
  }
  return false;
}

// Check if color is in Check
function isInCheck(board, color) {
  const king = findKing(board, color);
  if (!king) return false;
  const oppColor = color === 'w' ? 'b' : 'w';
  return isSquareAttacked(board, king.r, king.c, oppColor);
}

// Generate fully LEGAL moves (moves that do not leave own King in Check)
function getLegalMovesForSquare(board, r, c) {
  const piece = board[r][c];
  if (!piece) return [];

  const pseudoMoves = getPseudoLegalMoves(board, r, c);
  const legalMoves = [];

  for (const m of pseudoMoves) {
    const nextB = cloneBoard(board);
    nextB[m.r][m.c] = nextB[r][c];
    nextB[r][c] = null;

    // Pawn Promotion to Queen
    if (nextB[m.r][m.c].type === 'p') {
      if ((nextB[m.r][m.c].color === 'w' && m.r === 0) || (nextB[m.r][m.c].color === 'b' && m.r === 7)) {
        nextB[m.r][m.c].type = 'q';
      }
    }

    if (!isInCheck(nextB, piece.color)) {
      legalMoves.push(m);
    }
  }

  return legalMoves;
}

// Get all legal moves for a given side
function getAllLegalMoves(board, color) {
  const allMoves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === color) {
        const moves = getLegalMovesForSquare(board, r, c);
        for (const m of moves) {
          allMoves.push({ from: { r, c }, to: { r: m.r, c: m.c } });
        }
      }
    }
  }
  return allMoves;
}

// Static Board Evaluation for AI (Material + PST tables)
function evaluateBoard(board) {
  let score = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;

      const baseVal = PIECE_VALUES[p.type] || 0;
      let pstVal = 0;

      // Flip PST row for Black (Bot)
      const pstRow = p.color === 'w' ? r : 7 - r;

      if (p.type === 'p') pstVal = PAWN_PST[pstRow][c];
      else if (p.type === 'n') pstVal = KNIGHT_PST[pstRow][c];
      else if (p.type === 'b') pstVal = BISHOP_PST[pstRow][c];
      else if (p.type === 'r') pstVal = ROOK_PST[pstRow][c];
      else if (p.type === 'q') pstVal = QUEEN_PST[pstRow][c];
      else if (p.type === 'k') pstVal = KING_PST[pstRow][c];

      const totalVal = baseVal + pstVal;
      if (p.color === 'b') {
        score += totalVal; // Positive for Black (Bot)
      } else {
        score -= totalVal; // Negative for White (Player)
      }
    }
  }

  return score;
}

// Minimax with Alpha-Beta Pruning for Bot Move Calculation
function minimax(board, depth, alpha, beta, isMaximizing) {
  if (depth === 0) {
    return { evalScore: evaluateBoard(board) };
  }

  const color = isMaximizing ? 'b' : 'w';
  const legalMoves = getAllLegalMoves(board, color);

  if (legalMoves.length === 0) {
    if (isInCheck(board, color)) {
      // Checkmate!
      return { evalScore: isMaximizing ? -99999 + (3 - depth) : 99999 - (3 - depth) };
    }
    // Stalemate
    return { evalScore: 0 };
  }

  let bestMove = null;

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const m of legalMoves) {
      const nextB = cloneBoard(board);
      nextB[m.to.r][m.to.c] = nextB[m.from.r][m.from.c];
      nextB[m.from.r][m.from.c] = null;
      if (nextB[m.to.r]?.[m.to.c]?.type === 'p' && m.to.r === 7) {
        nextB[m.to.r][m.to.c].type = 'q';
      }

      const res = minimax(nextB, depth - 1, alpha, beta, false);
      if (res && res.evalScore > maxEval) {
        maxEval = res.evalScore;
        bestMove = m;
      }
      alpha = Math.max(alpha, res?.evalScore ?? -Infinity);
      if (beta <= alpha) break; // Pruning
    }
    return { evalScore: maxEval, bestMove };
  } else {
    let minEval = Infinity;
    for (const m of legalMoves) {
      const nextB = cloneBoard(board);
      nextB[m.to.r][m.to.c] = nextB[m.from.r][m.from.c];
      nextB[m.from.r][m.from.c] = null;
      if (nextB[m.to.r]?.[m.to.c]?.type === 'p' && m.to.r === 0) {
        nextB[m.to.r][m.to.c].type = 'q';
      }

      const res = minimax(nextB, depth - 1, alpha, beta, true);
      if (res && res.evalScore < minEval) {
        minEval = res.evalScore;
        bestMove = m;
      }
      beta = Math.min(beta, res?.evalScore ?? Infinity);
      if (beta <= alpha) break; // Pruning
    }
    return { evalScore: minEval, bestMove };
  }
}

export default function ChessGame({
  onBackToHub,
  onScoreUpdate,
  isPaused = false,
}) {
  const isPausedRef = useRef(isPaused);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const { width } = useWindowDimensions();
  const boardSize = Math.min(width - 24, 340);
  const cellSize = boardSize / 8;

  const juiceRef = useRef(null);

  // Difficulty & Matches
  const [difficulty, setDifficulty] = useState('MEDIUM'); // 'EASY' | 'MEDIUM' | 'HARD'
  const [highScore, setHighScore] = useState(0);
  const [gamesWon, setGamesWon] = useState(0);

  // Game Board & Move State
  const initialBoard = getInitialBoard();
  const [board, setBoard] = useState(initialBoard);
  const boardRef = useRef(initialBoard);
  const [turn, setTurn] = useState('w'); // 'w' = White (Player), 'b' = Black (Bot)
  const [selectedSquare, setSelectedSquare] = useState(null); // { r, c }
  const [validMoves, setValidMoves] = useState([]); // array of { r, c }
  const [lastMove, setLastMove] = useState(null); // { from: {r, c}, to: {r, c} }
  const [checkStatus, setCheckStatus] = useState(null); // null | 'w' | 'b'

  // Captured pieces
  const [capturedByPlayer, setCapturedByPlayer] = useState([]);
  const [capturedByBot, setCapturedByBot] = useState([]);

  // History for Undo
  const historyRef = useRef([]);

  // Result Modal
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [modalType, setModalType] = useState('VICTORY');

  // Load Saved High Score
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_BEST_KEY);
        if (saved !== null) {
          const val = parseInt(saved, 10);
          if (!isNaN(val)) {
            setHighScore(val);
            setGamesWon(val);
          }
        }
      } catch {}
    })();
  }, []);

  // Bot Turn Trigger
  const triggerBotMove = useCallback((boardToUse) => {
    setTimeout(() => {
      const currentBoard = boardToUse || boardRef.current;
      const allLegal = getAllLegalMoves(currentBoard, 'b');

      if (allLegal.length === 0) {
        // Player Wins by Checkmate!
        playVictorySound();
        triggerPerfectHaptic(3);
        setModalType('VICTORY');
        setResultModalVisible(true);
        const nextWon = gamesWon + 1;
        setGamesWon(nextWon);
        setHighScore(nextWon);
        AsyncStorage.setItem(STORAGE_BEST_KEY, String(nextWon)).catch(() => {});
        onScoreUpdate?.(nextWon * 100);
        return;
      }

      let chosenMove = null;

      try {
        if (difficulty === 'EASY') {
          // Easy Bot: 65% random moves, 35% captures
          const captures = allLegal.filter((m) => currentBoard[m.to.r][m.to.c] !== null);
          if (captures.length > 0 && Math.random() < 0.35) {
            chosenMove = captures[Math.floor(Math.random() * captures.length)];
          } else {
            chosenMove = allLegal[Math.floor(Math.random() * allLegal.length)];
          }
        } else if (difficulty === 'MEDIUM') {
          // Medium Bot: Depth 1 Minimax
          const res = minimax(currentBoard, 1, -Infinity, Infinity, true);
          chosenMove = res.bestMove || allLegal[Math.floor(Math.random() * allLegal.length)];
        } else {
          // Hard Bot: Depth 2 Minimax with Alpha-Beta Pruning (fast & non-blocking)
          const res = minimax(currentBoard, 2, -Infinity, Infinity, true);
          chosenMove = res.bestMove || allLegal[Math.floor(Math.random() * allLegal.length)];
        }
      } catch (err) {
        chosenMove = allLegal[Math.floor(Math.random() * allLegal.length)];
      }

      if (!chosenMove) return;

      const targetPiece = currentBoard[chosenMove.to.r][chosenMove.to.c];
      if (targetPiece) {
        setCapturedByBot((prev) => [...prev, targetPiece]);
        playChessCaptureSound();
        triggerMediumHaptic();
      } else {
        playChessMoveSound();
        triggerLightHaptic();
      }

      const nextB = cloneBoard(currentBoard);
      nextB[chosenMove.to.r][chosenMove.to.c] = nextB[chosenMove.from.r][chosenMove.from.c];
      nextB[chosenMove.from.r][chosenMove.from.c] = null;

      // Pawn Promotion for Bot
      if (nextB[chosenMove.to.r][chosenMove.to.c].type === 'p' && chosenMove.to.r === 7) {
        nextB[chosenMove.to.r][chosenMove.to.c].type = 'q';
      }

      boardRef.current = nextB;
      setBoard(nextB);
      setLastMove(chosenMove);

      // Check if Player is now in Check or Checkmate
      if (isInCheck(nextB, 'w')) {
        const playerMoves = getAllLegalMoves(nextB, 'w');
        if (playerMoves.length === 0) {
          // Bot wins by Checkmate!
          setCheckStatus('w');
          setModalType('GAMEOVER');
          setResultModalVisible(true);
          playGameOverSound();
          triggerGameOverHaptic();
          if (juiceRef.current) juiceRef.current.shake(16, 12);
        } else {
          setCheckStatus('w');
          playChessCheckSound();
          triggerHeavyHaptic();
          if (juiceRef.current) juiceRef.current.popup('CHECK!', 'YOUR KING IS UNDER ATTACK', '#FF0055');
        }
      } else {
        setCheckStatus(null);
      }

      setTurn('w');
    }, 280);
  }, [difficulty, gamesWon, onScoreUpdate]);

  // Player Square Tap Handler
  const handleSquarePress = (r, c) => {
    if (turn !== 'w' || isPausedRef.current) return;

    const clickedPiece = board[r][c];

    // If tapping an already selected square, deselect
    if (selectedSquare && selectedSquare.r === r && selectedSquare.c === c) {
      setSelectedSquare(null);
      setValidMoves([]);
      return;
    }

    // Check if tapping a valid move square for selected piece
    if (selectedSquare) {
      const isLegal = validMoves.some((m) => m.r === r && m.c === c);
      if (isLegal) {
        // EXECUTE PLAYER MOVE
        const fromPiece = board[selectedSquare.r][selectedSquare.c];
        const targetPiece = board[r][c];

        // Save history for undo
        historyRef.current.push({
          board: cloneBoard(board),
          capturedP: [...capturedByPlayer],
          capturedB: [...capturedByBot],
          lastMove,
        });

        if (targetPiece) {
          setCapturedByPlayer((prev) => [...prev, targetPiece]);
          playChessCaptureSound();
          triggerMediumHaptic();
          if (juiceRef.current) {
            juiceRef.current.burst(c * cellSize + cellSize / 2, r * cellSize + cellSize / 2, '#00F5FF', 14);
          }
        } else {
          playChessMoveSound();
          triggerLightHaptic();
        }

        const nextB = cloneBoard(board);
        nextB[r][c] = nextB[selectedSquare.r][selectedSquare.c];
        nextB[selectedSquare.r][selectedSquare.c] = null;

        // Pawn Promotion to Queen
        if (nextB[r][c].type === 'p' && r === 0) {
          nextB[r][c].type = 'q';
          playVictorySound();
          triggerPerfectHaptic(2);
          if (juiceRef.current) juiceRef.current.celebrate('PROMOTION!', 'PAWN BECAME QUEEN!', '#FFE600');
        }

        boardRef.current = nextB;
        setBoard(nextB);
        setLastMove({ from: selectedSquare, to: { r, c } });
        setSelectedSquare(null);
        setValidMoves([]);

        // Check if Bot is in Check
        if (isInCheck(nextB, 'b')) {
          const botMoves = getAllLegalMoves(nextB, 'b');
          if (botMoves.length === 0) {
            // Player Wins by Checkmate!
            setCheckStatus('b');
            setModalType('VICTORY');
            setResultModalVisible(true);
            playVictorySound();
            triggerPerfectHaptic(3);
            if (juiceRef.current) juiceRef.current.celebrate('CHECKMATE!', 'VICTORY OVER BOT!', '#00F5FF');
            const nextWon = gamesWon + 1;
            setGamesWon(nextWon);
            setHighScore(nextWon);
            AsyncStorage.setItem(STORAGE_BEST_KEY, String(nextWon)).catch(() => {});
            onScoreUpdate?.(nextWon * 100);
            return;
          } else {
            setCheckStatus('b');
            playChessCheckSound();
            if (juiceRef.current) juiceRef.current.popup('CHECK!', 'BOT KING TARGETED', '#00F5FF');
          }
        } else {
          setCheckStatus(null);
        }

        // Switch to Bot Turn
        setTurn('b');
        triggerBotMove(nextB);
        return;
      }
    }

    // Select Player Piece
    if (clickedPiece && clickedPiece.color === 'w') {
      playTapSound();
      triggerLightHaptic();
      setSelectedSquare({ r, c });
      const moves = getLegalMovesForSquare(board, r, c);
      setValidMoves(moves);
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  };

  // Undo Move Handler
  const handleUndo = () => {
    if (historyRef.current.length === 0 || turn !== 'w') return;
    playTapSound();
    triggerLightHaptic();
    const prev = historyRef.current.pop();
    boardRef.current = prev.board;
    setBoard(prev.board);
    setCapturedByPlayer(prev.capturedP);
    setCapturedByBot(prev.capturedB);
    setLastMove(prev.lastMove);
    setSelectedSquare(null);
    setValidMoves([]);
    setCheckStatus(null);
  };

  // Reset / New Game
  const handleRestart = (newDiff = difficulty) => {
    playTapSound();
    triggerLightHaptic();
    const fresh = getInitialBoard();
    boardRef.current = fresh;
    setBoard(fresh);
    setTurn('w');
    setSelectedSquare(null);
    setValidMoves([]);
    setLastMove(null);
    setCheckStatus(null);
    setCapturedByPlayer([]);
    setCapturedByBot([]);
    historyRef.current = [];
    setResultModalVisible(false);
  };

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={styles.container}>
        {/* Header */}
        <MiniGameHeader
          floorNum={1}
          gameTitle="CHESS"
          category="VS BOT AI"
          accentColor="#00F5FF"
          score={gamesWon}
          highScore={highScore}
          onBack={onBackToHub}
          onBackToHub={onBackToHub}
        />

        {/* Difficulty Selector Bar */}
        <View style={styles.diffBar}>
          <View style={styles.diffGroup}>
            {['EASY', 'MEDIUM', 'HARD'].map((d) => (
              <Pressable
                key={d}
                onPress={() => {
                  setDifficulty(d);
                  handleRestart(d);
                }}
                style={[
                  styles.diffPill,
                  difficulty === d && {
                    backgroundColor:
                      d === 'EASY' ? '#10B981' : d === 'MEDIUM' ? '#00F5FF' : '#FF0055',
                    borderColor: '#FFF',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.diffPillText,
                    difficulty === d && styles.diffPillTextActive,
                  ]}
                >
                  {d}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Turn Indicator */}
          <View style={styles.turnBadge}>
            <View
              style={[
                styles.turnDot,
                { backgroundColor: turn === 'w' ? '#00F5FF' : '#FF0055' },
              ]}
            />
            <Text
              style={[
                styles.turnText,
                { color: turn === 'w' ? '#00F5FF' : '#FF0055' },
              ]}
            >
              {turn === 'w' ? 'YOUR MOVE' : 'BOT THINKING...'}
            </Text>
          </View>
        </View>

        {/* Captured By Bot (Red pieces taken from player) */}
        <View style={styles.capturedBar}>
          <Text style={styles.capturedLabel}>BOT RACK:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.capturedScroll}>
            {capturedByBot.map((p, i) => (
              <Text key={`cb_${i}`} style={styles.capturedPieceCyan}>
                {PIECE_GLYPHS[p.type]}
              </Text>
            ))}
          </ScrollView>
        </View>

        {/* 8x8 Cyber Chess Board */}
        <View style={[styles.boardWrapper, { width: boardSize, height: boardSize }]}>
          <Svg width={boardSize} height={boardSize} viewBox={`0 0 ${boardSize} ${boardSize}`}>
            <Defs>
              <LinearGradient id="darkSquareGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#141E33" />
                <Stop offset="1" stopColor="#0B1120" />
              </LinearGradient>
              <LinearGradient id="lightSquareGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#1E2C4A" />
                <Stop offset="1" stopColor="#17223B" />
              </LinearGradient>
            </Defs>

            {/* Render 64 Squares */}
            {board.map((row, r) =>
              row.map((cell, c) => {
                const isLight = (r + c) % 2 === 0;
                const isSelected = selectedSquare && selectedSquare.r === r && selectedSquare.c === c;
                const isValidTarget = validMoves.some((m) => m.r === r && m.c === c);
                const isLastMoveSquare =
                  lastMove &&
                  ((lastMove.from.r === r && lastMove.from.c === c) ||
                    (lastMove.to.r === r && lastMove.to.c === c));

                return (
                  <G key={`sq_${r}_${c}`}>
                    {/* Square Base */}
                    <Rect
                      x={c * cellSize}
                      y={r * cellSize}
                      width={cellSize}
                      height={cellSize}
                      fill={isLight ? 'url(#lightSquareGrad)' : 'url(#darkSquareGrad)'}
                      stroke={isSelected ? '#00F5FF' : isLastMoveSquare ? '#FFE600' : '#1C2945'}
                      strokeWidth={isSelected ? 2 : isLastMoveSquare ? 1.5 : 0.5}
                    />

                    {/* Check Highlight for King */}
                    {checkStatus &&
                      cell &&
                      cell.type === 'k' &&
                      cell.color === checkStatus && (
                        <Rect
                          x={c * cellSize + 2}
                          y={r * cellSize + 2}
                          width={cellSize - 4}
                          height={cellSize - 4}
                          fill="#FF0055"
                          opacity={0.35}
                          rx={4}
                        />
                      )}

                    {/* Valid Move Indicator Dot or Ring */}
                    {isValidTarget && (
                      <Circle
                        cx={c * cellSize + cellSize / 2}
                        cy={r * cellSize + cellSize / 2}
                        r={cell ? cellSize / 2.6 : 5}
                        fill={cell ? 'none' : '#00F5FF'}
                        stroke={cell ? '#00F5FF' : 'none'}
                        strokeWidth={cell ? 2.5 : 0}
                        opacity={0.75}
                      />
                    )}
                  </G>
                );
              })
            )}
          </Svg>

          {/* Interactive Pieces Overlay Grid */}
          <View style={StyleSheet.absoluteFill}>
            {board.map((row, r) => (
              <View key={`row_${r}`} style={styles.boardRow}>
                {row.map((cell, c) => (
                  <Pressable
                    key={`cell_${r}_${c}`}
                    style={[styles.cellPressable, { width: cellSize, height: cellSize }]}
                    onPress={() => handleSquarePress(r, c)}
                  >
                    {cell && (
                      <Text
                        style={[
                          styles.pieceText,
                          {
                            color: cell.color === 'w' ? '#00F5FF' : '#FF0055',
                            textShadowColor: cell.color === 'w' ? '#00F5FF' : '#FF0055',
                          },
                        ]}
                      >
                        {PIECE_GLYPHS[cell.type]}
                      </Text>
                    )}
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        </View>

        {/* Captured By Player (Cyan pieces taken from bot) */}
        <View style={styles.capturedBar}>
          <Text style={styles.capturedLabel}>YOUR RACK:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.capturedScroll}>
            {capturedByPlayer.map((p, i) => (
              <Text key={`cp_${i}`} style={styles.capturedPieceRed}>
                {PIECE_GLYPHS[p.type]}
              </Text>
            ))}
          </ScrollView>
        </View>

        {/* Bottom Bar: Undo & New Match */}
        <View style={styles.bottomControlBar}>
          <Pressable onPress={handleUndo} style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>↩ UNDO</Text>
          </Pressable>
          <Pressable onPress={() => handleRestart()} style={[styles.actionBtn, styles.newMatchBtn]}>
            <Text style={[styles.actionBtnText, styles.newMatchBtnText]}>⚡ NEW GAME</Text>
          </Pressable>
        </View>

        {/* Check & Checkmate Result Modal */}
        <GameResultModal
          visible={resultModalVisible}
          type={modalType}
          title={modalType === 'VICTORY' ? 'CHECKMATE! YOU WON' : 'CHECKMATE! BOT WON'}
          subtitle={modalType === 'VICTORY' ? 'You outplayed the Bot!' : 'The Bot cornered your King!'}
          score={gamesWon}
          highScore={highScore}
          onRestart={() => handleRestart()}
          onBackToHub={onBackToHub}
        />
      </View>
    </JuiceEngine>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#04060A',
    alignItems: 'center',
  },
  diffBar: {
    width: '100%',
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  diffGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  diffPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#263353',
    backgroundColor: '#0F1626',
  },
  diffPillText: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '700',
    color: '#8E9BB5',
    letterSpacing: 0.8,
  },
  diffPillTextActive: {
    color: '#05070D',
    fontWeight: '900',
  },
  turnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0E1729',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1D2A47',
  },
  turnDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  turnText: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  capturedBar: {
    width: '100%',
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
    marginBottom: 4,
  },
  capturedLabel: {
    fontFamily: monoFont,
    fontSize: 9,
    fontWeight: '700',
    color: '#657494',
    marginRight: 6,
  },
  capturedScroll: {
    flex: 1,
    flexDirection: 'row',
  },
  capturedPieceCyan: {
    fontSize: 16,
    color: '#00F5FF',
    marginRight: 4,
  },
  capturedPieceRed: {
    fontSize: 16,
    color: '#FF0055',
    marginRight: 4,
  },
  boardWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#1F2C47',
    backgroundColor: '#070B14',
    shadowColor: '#00F5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  boardRow: {
    flexDirection: 'row',
  },
  cellPressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieceText: {
    fontSize: 27,
    fontWeight: '900',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  bottomControlBar: {
    width: '100%',
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#0F1626',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#263353',
    alignItems: 'center',
  },
  actionBtnText: {
    fontFamily: monoFont,
    fontSize: 12,
    fontWeight: '800',
    color: '#8E9BB5',
    letterSpacing: 0.8,
  },
  newMatchBtn: {
    backgroundColor: '#00F5FF',
    borderColor: '#00F5FF',
  },
  newMatchBtnText: {
    color: '#04060A',
    fontWeight: '900',
  },
});
