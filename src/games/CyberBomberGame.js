import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, {
  Rect,
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  RadialGradient as SvgRadialGradient,
  Stop,
  G,
  Line,
  Text as SvgText,
} from 'react-native-svg';
import { COLORS } from '../../styles';
import MiniGameHeader from '../components/MiniGameHeader';
import JuiceEngine from '../components/JuiceEngine';
import GameResultModal from '../components/GameResultModal';
import {
  triggerLightHaptic,
  triggerMediumHaptic,
  triggerPerfectHaptic,
  triggerGameOverHaptic,
  triggerSelectionHaptic,
} from '../utils/haptics';
import {
  playTapSound,
  playPerfectSound,
  playSliceSound,
  playSnapTickSound,
  playGameOverSound,
} from '../utils/sound';

const STORAGE_KEY = '@game_tower:best_bomber_v1';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

// Grid Constants
const COLS = 11;
const ROWS = 13;
const CELL_SIZE = 29; // 11 * 29 = 319px width, 13 * 29 = 377px height

// Tile Types
const TILE_EMPTY = 0;
const TILE_HARD = 1; // Indestructible Wall
const TILE_SOFT = 2; // Destructible Cyber Crate

// Item Types
const ITEM_NONE = 0;
const ITEM_EXIT = 1;
const ITEM_BOMB = 2;   // +1 Max Bomb
const ITEM_FIRE = 3;   // +1 Blast Radius
const ITEM_SPEED = 4;  // +Speed Skates
const ITEM_SHIELD = 5; // +Shield

// Enemy Types
const ENEMY_WANDERER = 'WANDERER';
const ENEMY_HUNTER = 'HUNTER';
const ENEMY_SPEEDER = 'SPEEDER';

// Direction Vectors
const DIRS = [
  { dx: 0, dy: -1 }, // UP
  { dx: 1, dy: 0 },  // RIGHT
  { dx: 0, dy: 1 },  // DOWN
  { dx: -1, dy: 0 }, // LEFT
];

/**
 * Builds arena layout for a given stage
 */
function createStage(stageNum) {
  const grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(TILE_EMPTY));
  const items = Array.from({ length: ROWS }, () => new Array(COLS).fill(ITEM_NONE));

  // 1. Outer Borders
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
        grid[r][c] = TILE_HARD;
      } else if (r % 2 === 0 && c % 2 === 0) {
        // Indestructible inner pillars
        grid[r][c] = TILE_HARD;
      }
    }
  }

  // 2. Candidate tiles for Soft Blocks (exclude player spawn zone at 1,1)
  const softCandidates = [];
  for (let r = 1; r < ROWS - 1; r++) {
    for (let c = 1; c < COLS - 1; c++) {
      if (grid[r][c] !== TILE_EMPTY) continue;
      // Keep (1,1), (1,2), (2,1) clear for player starting corner
      if ((r === 1 && c === 1) || (r === 1 && c === 2) || (r === 2 && c === 1)) {
        continue;
      }
      softCandidates.push({ r, c });
    }
  }

  // Shuffle candidates
  for (let i = softCandidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [softCandidates[i], softCandidates[j]] = [softCandidates[j], softCandidates[i]];
  }

  // Place soft blocks (~65% density)
  const softCount = Math.floor(softCandidates.length * 0.65);
  const softPlaced = softCandidates.slice(0, softCount);
  softPlaced.forEach(({ r, c }) => {
    grid[r][c] = TILE_SOFT;
  });

  // Assign 1 Exit Portal under a soft block
  if (softPlaced.length > 0) {
    const exitIdx = Math.floor(Math.random() * softPlaced.length);
    items[softPlaced[exitIdx].r][softPlaced[exitIdx].c] = ITEM_EXIT;
  }

  // Assign Power-Ups under soft blocks
  const powerPool = [ITEM_BOMB, ITEM_FIRE, ITEM_SPEED, ITEM_SHIELD];
  let pIdx = 0;
  softPlaced.forEach(({ r, c }) => {
    if (items[r][c] !== ITEM_NONE) return;
    if (Math.random() < 0.28 && pIdx < powerPool.length * 2) {
      items[r][c] = powerPool[pIdx % powerPool.length];
      pIdx++;
    }
  });

  // 3. Spawn Enemies far from player - GUARANTEE at least 2 enemies on every level!
  const targetEnemyCount = Math.max(2, Math.min(8, 1 + stageNum));
  const openForEnemies = [];
  for (let r = 1; r < ROWS - 1; r++) {
    for (let c = 1; c < COLS - 1; c++) {
      if (grid[r][c] === TILE_EMPTY && r + c > 5) {
        openForEnemies.push({ r, c });
      }
    }
  }

  // Shuffle open tiles
  for (let i = openForEnemies.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [openForEnemies[i], openForEnemies[j]] = [openForEnemies[j], openForEnemies[i]];
  }

  // If there are fewer than targetEnemyCount open tiles, carve out soft blocks to guarantee enemy spawn!
  if (openForEnemies.length < targetEnemyCount) {
    for (let r = ROWS - 2; r >= 1 && openForEnemies.length < targetEnemyCount; r--) {
      for (let c = COLS - 2; c >= 1 && openForEnemies.length < targetEnemyCount; c--) {
        if (grid[r][c] === TILE_SOFT && items[r][c] !== ITEM_EXIT && (r + c > 5)) {
          grid[r][c] = TILE_EMPTY;
          openForEnemies.push({ r, c });
        }
      }
    }
  }

  // Fallback corners guarantee at least 2 enemies even in extreme edge cases
  const fallbackSpots = [
    { r: ROWS - 2, c: COLS - 2 },
    { r: ROWS - 2, c: 1 },
    { r: 1, c: COLS - 2 },
  ];
  for (const spot of fallbackSpots) {
    if (openForEnemies.length >= targetEnemyCount) break;
    if (!openForEnemies.some((p) => p.r === spot.r && p.c === spot.c)) {
      grid[spot.r][spot.c] = TILE_EMPTY;
      if (items[spot.r][spot.c] === ITEM_EXIT) {
        items[spot.r][spot.c] = ITEM_NONE;
      }
      openForEnemies.push(spot);
    }
  }

  const enemies = [];
  const actualSpawnCount = Math.max(2, Math.min(targetEnemyCount, openForEnemies.length));
  for (let i = 0; i < actualSpawnCount; i++) {
    const pos = openForEnemies[i];
    let type = ENEMY_WANDERER;
    let color = '#FF0055';
    let speed = 0.038 + stageNum * 0.004;

    if (i >= 2 && stageNum >= 2) {
      type = ENEMY_HUNTER;
      color = '#FFE600';
      speed = 0.046 + stageNum * 0.005;
    } else if (i >= 4 && stageNum >= 4) {
      type = ENEMY_SPEEDER;
      color = '#00F5FF';
      speed = 0.058 + stageNum * 0.005;
    }

    enemies.push({
      id: `bot_${i}`,
      type,
      x: pos.c,
      y: pos.r,
      dir: DIRS[Math.floor(Math.random() * 4)],
      speed,
      color,
      isAlive: true,
    });
  }

  return { grid, items, enemies };
}

export default function CyberBomberGame({
  isPaused = false,
  onBackToHub,
  onScoreUpdate,
}) {
  const juiceRef = useRef(null);

  const [stage, setStage] = useState(1);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [victoryModal, setVictoryModal] = useState(false);

  // Player Stats
  const [maxBombs, setMaxBombs] = useState(1);
  const [blastRadius, setBlastRadius] = useState(2);
  const [playerSpeed, setPlayerSpeed] = useState(0.08);
  const [hasShield, setHasShield] = useState(false);

  // Core Game State
  const initialStageData = useMemo(() => createStage(1), []);
  const [grid, setGrid] = useState(initialStageData.grid);
  const [items, setItems] = useState(initialStageData.items);
  const [revealedItems, setRevealedItems] = useState({});
  const [playerPos, setPlayerPos] = useState({ x: 1, y: 1 });
  const [playerFacing, setPlayerFacing] = useState('DOWN');
  const [bombs, setBombs] = useState([]);
  const [flames, setFlames] = useState([]);
  const [enemies, setEnemies] = useState(initialStageData.enemies);
  const [exitUnlocked, setExitUnlocked] = useState(false);

  // Movement Input Ref
  const inputDirRef = useRef({ dx: 0, dy: 0 });
  const playerPosRef = useRef({ x: 1, y: 1 });
  const bombsRef = useRef([]);
  const flamesRef = useRef([]);
  const enemiesRef = useRef([]);
  const gridRef = useRef(grid);
  const itemsRef = useRef(items);
  const revealedRef = useRef(revealedItems);
  const isInvulnerableRef = useRef(false);

  // Sync refs
  useEffect(() => {
    bombsRef.current = bombs;
  }, [bombs]);
  useEffect(() => {
    flamesRef.current = flames;
  }, [flames]);
  useEffect(() => {
    enemiesRef.current = enemies;
  }, [enemies]);
  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => {
    revealedRef.current = revealedItems;
  }, [revealedItems]);

  // Load High Score
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((val) => {
        if (val) setHighScore(parseInt(val, 10) || 0);
      })
      .catch(() => {});
  }, []);

  // Initialize Stage
  const startStage = useCallback((lvl) => {
    const data = createStage(lvl);
    setGrid(data.grid);
    setItems(data.items);
    setRevealedItems({});
    setEnemies(data.enemies);
    setBombs([]);
    setFlames([]);
    setPlayerPos({ x: 1, y: 1 });
    playerPosRef.current = { x: 1, y: 1 };
    inputDirRef.current = { dx: 0, dy: 0 };
    setExitUnlocked(false);
    setGameOver(false);
    setVictoryModal(false);
  }, []);

  // Drop Bomb
  const handleDropBomb = useCallback(() => {
    if (isPaused || gameOver) return;

    const curBombs = bombsRef.current;
    if (curBombs.length >= maxBombs) {
      triggerLightHaptic();
      return;
    }

    const bx = Math.round(playerPosRef.current.x);
    const by = Math.round(playerPosRef.current.y);

    // Can't drop where another bomb already exists
    if (curBombs.some((b) => b.x === bx && b.y === by)) return;

    const newBomb = {
      id: `bomb_${Date.now()}_${Math.random()}`,
      x: bx,
      y: by,
      radius: blastRadius,
      timer: 2400, // 2.4 seconds
      placedPlayerPos: { ...playerPosRef.current },
    };

    setBombs((prev) => [...prev, newBomb]);
    triggerMediumHaptic();
    playTapSound();
    juiceRef.current?.popup('💣 CHARGE ARMED', '2.4s', COLORS.cyan);
  }, [isPaused, gameOver, maxBombs, blastRadius]);

  // Detonate Bomb and radiate cross flame
  const detonateBomb = useCallback(
    (bombToDetonate) => {
      const { x: bx, y: by, radius } = bombToDetonate;
      triggerGameOverHaptic();
      playSliceSound();
      juiceRef.current?.shake(6, 6);

      const flameTiles = [{ x: bx, y: by }];
      const currentGrid = gridRef.current;
      const currentItems = itemsRef.current;
      const currentRevealed = { ...revealedRef.current };
      const nextGrid = currentGrid.map((row) => [...row]);
      let softBlocksDestroyed = 0;

      // 4 blast directions: UP, RIGHT, DOWN, LEFT
      DIRS.forEach(({ dx, dy }) => {
        for (let r = 1; r <= radius; r++) {
          const tx = bx + dx * r;
          const ty = by + dy * r;

          if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) break;

          const tile = nextGrid[ty][tx];

          if (tile === TILE_HARD) {
            // Indestructible wall stops flame
            break;
          }

          if (tile === TILE_SOFT) {
            // Destroy soft block!
            nextGrid[ty][tx] = TILE_EMPTY;
            softBlocksDestroyed++;
            flameTiles.push({ x: tx, y: ty });

            // Reveal hidden item if present
            if (currentItems[ty][tx] !== ITEM_NONE) {
              currentRevealed[`${tx}_${ty}`] = currentItems[ty][tx];
            }
            break; // Soft block absorbs rest of flame in this direction
          }

          // Open floor
          flameTiles.push({ x: tx, y: ty });

          // Chain reaction: check if another bomb is in path
          const chained = bombsRef.current.find((b) => b.x === tx && b.y === ty && b.id !== bombToDetonate.id);
          if (chained) {
            chained.timer = 0; // Trigger immediately
          }
        }
      });

      // Update grid & revealed items
      if (softBlocksDestroyed > 0) {
        setGrid(nextGrid);
        setRevealedItems(currentRevealed);
        setScore((s) => s + softBlocksDestroyed * 20);
      }

      // Add Flame segments with 400ms duration
      const flameGroup = {
        id: `flame_${Date.now()}_${Math.random()}`,
        tiles: flameTiles,
        expiresAt: Date.now() + 450,
      };
      setFlames((prev) => [...prev, flameGroup]);

      // Remove the detonated bomb
      setBombs((prev) => prev.filter((b) => b.id !== bombToDetonate.id));

      // Burst spark effects
      juiceRef.current?.burst(bx * CELL_SIZE + CELL_SIZE / 2, by * CELL_SIZE + CELL_SIZE / 2, '#FF0055', 18);
    },
    []
  );

  // Player Damage handler
  const handlePlayerDamage = useCallback(() => {
    if (isInvulnerableRef.current || gameOver) return;

    if (hasShield) {
      // Shield absorbs hit
      setHasShield(false);
      triggerMediumHaptic();
      playPerfectSound();
      juiceRef.current?.flash(COLORS.cyan);
      juiceRef.current?.popup('🛡️ SHIELD DEFLECTED!', 'Attack Absorbed', COLORS.cyan);
      isInvulnerableRef.current = true;
      setTimeout(() => {
        isInvulnerableRef.current = false;
      }, 1200);
      return;
    }

    triggerGameOverHaptic();
    playGameOverSound();
    juiceRef.current?.shake(10, 10);
    juiceRef.current?.flash(COLORS.danger);

    setLives((l) => {
      const nextLives = l - 1;
      if (nextLives <= 0) {
        setGameOver(true);
        juiceRef.current?.popup('☠️ TERMINATED', 'System Overload', COLORS.danger);
        return 0;
      } else {
        // Respawn player at safe start
        setPlayerPos({ x: 1, y: 1 });
        playerPosRef.current = { x: 1, y: 1 };
        isInvulnerableRef.current = true;
        juiceRef.current?.popup('⚠️ SYSTEM REBOOT', `${nextLives} Lives Remaining`, COLORS.solarGold);
        setTimeout(() => {
          isInvulnerableRef.current = false;
        }, 1500);
        return nextLives;
      }
    });
  }, [hasShield, gameOver]);

  // Main 60 FPS Engine Tick Loop
  useEffect(() => {
    if (isPaused || gameOver || victoryModal) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const currentGrid = gridRef.current;
      const currentBombs = bombsRef.current;

      // 1. Update Bombs Countdown & Detonations
      currentBombs.forEach((b) => {
        b.timer -= 20;
        if (b.timer <= 0) {
          detonateBomb(b);
        }
      });

      // 2. Remove Expired Flames
      setFlames((prev) => prev.filter((f) => f.expiresAt > now));

      // 3. Move Player with Corner-Assist
      const { dx, dy } = inputDirRef.current;
      if (dx !== 0 || dy !== 0) {
        const curP = playerPosRef.current;
        let nx = curP.x + dx * playerSpeed;
        let ny = curP.y + dy * playerSpeed;

        // Bounding collision box against walls & blocks (centers are integer tile coords)
        const checkSolid = (cx, cy) => {
          const col = Math.round(cx);
          const row = Math.round(cy);
          if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return true;
          if (currentGrid[row][col] !== TILE_EMPTY) return true;

          // Check bombs (unless player hasn't stepped off the bomb they just placed)
          const b = currentBombs.find((bomb) => bomb.x === col && bomb.y === row);
          if (b) {
            const distFromPlace = Math.hypot(b.placedPlayerPos.x - curP.x, b.placedPlayerPos.y - curP.y);
            if (distFromPlace > 0.8) return true; // solidified
          }
          return false;
        };

        const radius = 0.30;
        // Test X-axis movement
        if (
          !checkSolid(nx - radius, curP.y - radius) &&
          !checkSolid(nx + radius, curP.y - radius) &&
          !checkSolid(nx - radius, curP.y + radius) &&
          !checkSolid(nx + radius, curP.y + radius)
        ) {
          curP.x = nx;
        } else {
          // Corner-sliding assist along Y
          const centerRow = Math.round(curP.y);
          if (Math.abs(curP.y - centerRow) < 0.35) {
            curP.y += (centerRow - curP.y) * 0.25;
          }
        }

        // Test Y-axis movement
        if (
          !checkSolid(curP.x - radius, ny - radius) &&
          !checkSolid(curP.x + radius, ny - radius) &&
          !checkSolid(curP.x - radius, ny + radius) &&
          !checkSolid(curP.x + radius, ny + radius)
        ) {
          curP.y = ny;
        } else {
          // Corner-sliding assist along X
          const centerCol = Math.round(curP.x);
          if (Math.abs(curP.x - centerCol) < 0.35) {
            curP.x += (centerCol - curP.x) * 0.25;
          }
        }

        setPlayerPos({ x: curP.x, y: curP.y });

        // Update Facing Direction
        if (Math.abs(dx) > Math.abs(dy)) {
          setPlayerFacing(dx > 0 ? 'RIGHT' : 'LEFT');
        } else {
          setPlayerFacing(dy > 0 ? 'DOWN' : 'UP');
        }

        // 4. Check Item Pickups
        const cellX = Math.round(curP.x);
        const cellY = Math.round(curP.y);
        const itemKey = `${cellX}_${cellY}`;
        const itemAtCell = revealedRef.current[itemKey];

        if (itemAtCell) {
          if (itemAtCell === ITEM_EXIT) {
            // Check if all enemies are defeated to unlock exit
            const aliveBots = enemiesRef.current.filter((e) => e.isAlive);
            if (aliveBots.length === 0) {
              // EXIT REACHED! STAGE CLEAR!
              triggerPerfectHaptic();
              playPerfectSound();
              setVictoryModal(true);

              const stageBonus = 500 + stage * 200;
              const nextTotal = score + stageBonus;
              setScore(nextTotal);

              if (nextTotal > highScore) {
                setHighScore(nextTotal);
                AsyncStorage.setItem(STORAGE_KEY, String(nextTotal)).catch(() => {});
              }
              onScoreUpdate?.(nextTotal);

              juiceRef.current?.celebrate('⚡ UPLINK ESTABLISHED!', `Sector ${stage} Cleared! +${stageBonus} PTS`, COLORS.matrixMint);
            } else {
              juiceRef.current?.popup('🔒 EXIT LOCKED', `Neutralize ${aliveBots.length} remaining bots!`, COLORS.danger);
            }
          } else {
            // Powerup collected!
            triggerSelectionHaptic();
            playPerfectSound();

            if (itemAtCell === ITEM_BOMB) {
              setMaxBombs((b) => b + 1);
              juiceRef.current?.popup('💣 +1 CAPACITY', 'Max Bombs Increased', COLORS.cyan);
            } else if (itemAtCell === ITEM_FIRE) {
              setBlastRadius((r) => r + 1);
              juiceRef.current?.popup('🔥 +1 BLAST RANGE', 'Plasma Range Expanded', '#FF0055');
            } else if (itemAtCell === ITEM_SPEED) {
              setPlayerSpeed((s) => Math.min(0.13, s + 0.015));
              juiceRef.current?.popup('⚡ SPEED BOOST', 'Movement Accelerated', COLORS.solarGold);
            } else if (itemAtCell === ITEM_SHIELD) {
              setHasShield(true);
              juiceRef.current?.popup('🛡️ CYBER SHIELD', 'Shield Activated', COLORS.matrixMint);
            }

            setScore((s) => s + 100);
            setRevealedItems((prev) => {
              const copy = { ...prev };
              delete copy[itemKey];
              return copy;
            });
          }
        }
      }

      // 5. Update Enemies AI & Patrol
      const currentEnemies = enemiesRef.current;
      const currentFlames = flamesRef.current;
      const updatedEnemies = [];

      currentEnemies.forEach((bot) => {
        if (!bot.isAlive) return;

        // Check if enemy hit by flame
        const botTileX = Math.round(bot.x);
        const botTileY = Math.round(bot.y);
        const caughtInFlame = currentFlames.some((fg) => fg.tiles.some((t) => t.x === botTileX && t.y === botTileY));

        if (caughtInFlame) {
          // Enemy destroyed!
          bot.isAlive = false;
          triggerMediumHaptic();
          playTapSound();
          juiceRef.current?.burst(bot.x * CELL_SIZE + CELL_SIZE / 2, bot.y * CELL_SIZE + CELL_SIZE / 2, bot.color, 14);
          juiceRef.current?.popup('💥 TARGET ELIMINATED', '+150 PTS', bot.color);
          setScore((s) => s + 150);
          return;
        }

        // Enemy AI Movement
        let { dx, dy } = bot.dir;
        let nx = bot.x + dx * bot.speed;
        let ny = bot.y + dy * bot.speed;

        const checkBotSolid = (cx, cy) => {
          const c = Math.round(cx);
          const r = Math.round(cy);
          if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return true;
          if (currentGrid[r][c] !== TILE_EMPTY) return true;
          if (currentBombs.some((b) => b.x === c && b.y === r)) return true;
          return false;
        };

        const radius = 0.30;
        const isBlocked =
          checkBotSolid(nx - radius, ny - radius) ||
          checkBotSolid(nx + radius, ny - radius) ||
          checkBotSolid(nx - radius, ny + radius) ||
          checkBotSolid(nx + radius, ny + radius);

        if (isBlocked) {
          // Choose a new random open direction
          const validDirs = DIRS.filter((d) => {
            const testX = bot.x + d.dx * 0.5;
            const testY = bot.y + d.dy * 0.5;
            return !checkBotSolid(testX, testY);
          });

          if (validDirs.length > 0) {
            bot.dir = validDirs[Math.floor(Math.random() * validDirs.length)];
          } else {
            bot.dir = { dx: -dx, dy: -dy }; // Reverse
          }
        } else {
          bot.x = nx;
          bot.y = ny;

          // Hunter drone: line of sight check
          if (bot.type === ENEMY_HUNTER && Math.random() < 0.05) {
            const pX = playerPosRef.current.x;
            const pY = playerPosRef.current.y;
            if (Math.abs(bot.x - pX) < 0.5) {
              bot.dir = { dx: 0, dy: pY > bot.y ? 1 : -1 };
            } else if (Math.abs(bot.y - pY) < 0.5) {
              bot.dir = { dx: pX > bot.x ? 1 : -1, dy: 0 };
            }
          }
        }

        // Check collision between enemy and player
        const distToPlayer = Math.hypot(bot.x - playerPosRef.current.x, bot.y - playerPosRef.current.y);
        if (distToPlayer < 0.6) {
          handlePlayerDamage();
        }

        updatedEnemies.push(bot);
      });

      // Check if all enemies eliminated -> Unlock Exit
      const livingBots = updatedEnemies.filter((e) => e.isAlive);
      if (livingBots.length === 0 && !exitUnlocked) {
        setExitUnlocked(true);
        triggerPerfectHaptic();
        playPerfectSound();
        juiceRef.current?.popup('🔓 EXIT UNLOCKED', 'Steal the data and escape!', COLORS.matrixMint);
      }

      // Check if flame hit player
      const pTileX = Math.round(playerPosRef.current.x);
      const pTileY = Math.round(playerPosRef.current.y);
      const playerInFlame = currentFlames.some((fg) => fg.tiles.some((t) => t.x === pTileX && t.y === pTileY));
      if (playerInFlame) {
        handlePlayerDamage();
      }
    }, 20); // 50 updates per second

    return () => clearInterval(interval);
  }, [isPaused, gameOver, victoryModal, playerSpeed, detonateBomb, handlePlayerDamage, exitUnlocked, score, highScore, stage, onScoreUpdate]);

  // Touch Direction Handlers (Press & Hold for D-Pad)
  const pressTimerRef = useRef(null);

  // Touch Direction Handlers (Press & Hold or Tap for D-Pad)
  const handleDirectionPressIn = (dx, dy) => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    inputDirRef.current = { dx, dy };
    triggerSelectionHaptic();
    playSnapTickSound();
  };

  const handleDirectionPressOut = () => {
    // Keep moving for 90ms after release so brief taps result in a clean, responsive step
    pressTimerRef.current = setTimeout(() => {
      inputDirRef.current = { dx: 0, dy: 0 };
    }, 90);
  };

  useEffect(() => {
    return () => {
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    };
  }, []);

  // Next Level Handler
  const handleNextStage = () => {
    const nextLvl = stage + 1;
    setStage(nextLvl);
    startStage(nextLvl);
  };

  // Restart Game
  const handleRestart = () => {
    setLives(3);
    setScore(0);
    setStage(1);
    setMaxBombs(1);
    setBlastRadius(2);
    setPlayerSpeed(0.08);
    setHasShield(false);
    startStage(1);
  };

  const aliveEnemiesCount = enemies.filter((e) => e.isAlive).length;

  return (
    <View style={styles.container}>
      <MiniGameHeader
        title="BOMBERMAN"
        floorLabel="FLOOR 33"
        category="ARCADE"
        score={score}
        bestScore={highScore}
        accentColor="#FF0055"
        onBackToHub={onBackToHub}
        onReset={handleRestart}
        disabled={isPaused}
      />

      <JuiceEngine ref={juiceRef}>
        {/* HUD Telemetry Bar */}
        <View style={styles.telemetryBar}>
          <View style={styles.statBox}>
            <Text style={styles.statDim}>LIVES</Text>
            <Text style={[styles.statVal, { color: '#FF0055' }]}>
              {Array.from({ length: lives }).map(() => '♥').join(' ') || '💀'}
            </Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statDim}>STAGE</Text>
            <Text style={[styles.statVal, { color: '#FFE600' }]}>{stage} / 10</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statDim}>BOMBS</Text>
            <Text style={[styles.statVal, { color: '#00F5FF' }]}>
              {bombs.length}/{maxBombs}
            </Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statDim}>BOTS</Text>
            <Text style={[styles.statVal, { color: aliveEnemiesCount === 0 ? COLORS.matrixMint : '#FF5E00' }]}>
              {aliveEnemiesCount === 0 ? 'CLEARED' : `${aliveEnemiesCount} LEFT`}
            </Text>
          </View>
        </View>

        {/* Main Game Arena */}
        <View style={styles.arenaWrapper}>
          <View style={styles.arenaCard}>
            <Svg width={COLS * CELL_SIZE} height={ROWS * CELL_SIZE} style={StyleSheet.absoluteFill}>
              <Defs>
                {/* Wall Pillars Gradient */}
                <SvgLinearGradient id="hardWallGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor="#2A3048" />
                  <Stop offset="50%" stopColor="#141829" />
                  <Stop offset="100%" stopColor="#0B0E1B" />
                </SvgLinearGradient>

                {/* Soft Cyber Crate Gradient */}
                <SvgLinearGradient id="softCrateGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor="#FF9E00" />
                  <Stop offset="50%" stopColor="#FF5400" />
                  <Stop offset="100%" stopColor="#7928CA" />
                </SvgLinearGradient>

                {/* Plasma Flame Radial Gradient */}
                <SvgRadialGradient id="flameGrad" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor="#FFFFFF" />
                  <Stop offset="40%" stopColor="#FFE600" />
                  <Stop offset="75%" stopColor="#FF0055" />
                  <Stop offset="100%" stopColor="#7928CA" stopOpacity="0.8" />
                </SvgRadialGradient>

                {/* Bomb Radial Gradient */}
                <SvgRadialGradient id="bombGrad" cx="35%" cy="35%" r="65%">
                  <Stop offset="0%" stopColor="#00F5FF" />
                  <Stop offset="50%" stopColor="#101832" />
                  <Stop offset="100%" stopColor="#050814" />
                </SvgRadialGradient>
              </Defs>

              {/* Floor Tiles */}
              {Array.from({ length: ROWS }).map((_, r) =>
                Array.from({ length: COLS }).map((__, c) => (
                  <Rect
                    key={`floor_${c}_${r}`}
                    x={c * CELL_SIZE + 0.5}
                    y={r * CELL_SIZE + 0.5}
                    width={CELL_SIZE - 1}
                    height={CELL_SIZE - 1}
                    rx={3}
                    fill="#080A15"
                    stroke="rgba(0, 245, 255, 0.05)"
                    strokeWidth={0.5}
                  />
                ))
              )}

              {/* Revealed Items on Floor */}
              {Object.entries(revealedItems).map(([key, itemType]) => {
                const [cx, cy] = key.split('_').map(Number);
                const x = cx * CELL_SIZE;
                const y = cy * CELL_SIZE;

                if (itemType === ITEM_EXIT) {
                  return (
                    <G key={`item_${key}`}>
                      <Rect
                        x={x + 2}
                        y={y + 2}
                        width={CELL_SIZE - 4}
                        height={CELL_SIZE - 4}
                        rx={6}
                        fill={exitUnlocked ? 'rgba(0, 245, 212, 0.4)' : 'rgba(255, 0, 85, 0.2)'}
                        stroke={exitUnlocked ? '#00F5D4' : '#FF0055'}
                        strokeWidth={1.5}
                      />
                      <Circle
                        cx={x + CELL_SIZE / 2}
                        cy={y + CELL_SIZE / 2}
                        r={CELL_SIZE / 3.5}
                        stroke={exitUnlocked ? '#00F5D4' : '#FF0055'}
                        strokeWidth={1.2}
                        fill="none"
                      />
                    </G>
                  );
                }

                // Powerup icons
                let pColor = '#00F5FF';
                let symbol = '💣';
                if (itemType === ITEM_FIRE) {
                  pColor = '#FF0055';
                  symbol = '🔥';
                } else if (itemType === ITEM_SPEED) {
                  pColor = '#FFE600';
                  symbol = '⚡';
                } else if (itemType === ITEM_SHIELD) {
                  pColor = '#39FF14';
                  symbol = '🛡️';
                }

                return (
                  <G key={`item_${key}`}>
                    <Circle
                      cx={x + CELL_SIZE / 2}
                      cy={y + CELL_SIZE / 2}
                      r={CELL_SIZE / 2 - 3}
                      fill="rgba(8, 12, 28, 0.9)"
                      stroke={pColor}
                      strokeWidth={1.8}
                    />
                    <SvgText
                      x={x + CELL_SIZE / 2}
                      y={y + CELL_SIZE / 2 + 4.5}
                      fontSize={13}
                      textAnchor="middle"
                    >
                      {symbol}
                    </SvgText>
                  </G>
                );
              })}

              {/* Grid Obstacles: Hard Pillars & Soft Blocks */}
              {grid.map((row, r) =>
                row.map((tile, c) => {
                  const x = c * CELL_SIZE;
                  const y = r * CELL_SIZE;

                  if (tile === TILE_HARD) {
                    return (
                      <G key={`hard_${c}_${r}`}>
                        <Rect
                          x={x + 1}
                          y={y + 1}
                          width={CELL_SIZE - 2}
                          height={CELL_SIZE - 2}
                          rx={5}
                          fill="url(#hardWallGrad)"
                          stroke="rgba(0, 245, 255, 0.3)"
                          strokeWidth={1.2}
                        />
                        <Circle cx={x + CELL_SIZE / 2} cy={y + CELL_SIZE / 2} r={3} fill="#00F5FF" opacity={0.7} />
                      </G>
                    );
                  }

                  if (tile === TILE_SOFT) {
                    return (
                      <G key={`soft_${c}_${r}`}>
                        <Rect
                          x={x + 2}
                          y={y + 2}
                          width={CELL_SIZE - 4}
                          height={CELL_SIZE - 4}
                          rx={5}
                          fill="url(#softCrateGrad)"
                          stroke="#FFE600"
                          strokeWidth={1.2}
                        />
                        <Line
                          x1={x + 4}
                          y1={y + 4}
                          x2={x + CELL_SIZE - 4}
                          y2={y + CELL_SIZE - 4}
                          stroke="rgba(255, 255, 255, 0.35)"
                          strokeWidth={1}
                        />
                        <Line
                          x1={x + CELL_SIZE - 4}
                          y1={y + 4}
                          x2={x + 4}
                          y2={y + CELL_SIZE - 4}
                          stroke="rgba(255, 255, 255, 0.35)"
                          strokeWidth={1}
                        />
                      </G>
                    );
                  }

                  return null;
                })
              )}

              {/* Active Plasma Bombs */}
              {bombs.map((b) => {
                const bx = b.x * CELL_SIZE + CELL_SIZE / 2;
                const by = b.y * CELL_SIZE + CELL_SIZE / 2;
                return (
                  <G key={b.id}>
                    <Circle cx={bx} cy={by} r={CELL_SIZE / 2 - 3} fill="url(#bombGrad)" stroke="#00F5FF" strokeWidth={1.8} />
                    {/* Glowing Core Fuse */}
                    <Circle cx={bx} cy={by} r={4.5} fill="#FF0055" />
                    {/* Pulsing countdown tick ring */}
                    <Circle
                      cx={bx}
                      cy={by}
                      r={CELL_SIZE / 2 - 6}
                      stroke="#FFE600"
                      strokeWidth={1}
                      strokeDasharray="4 2"
                      fill="none"
                    />
                  </G>
                );
              })}

              {/* Active Plasma Flame Cross Blasts */}
              {flames.map((fg) =>
                fg.tiles.map((t, idx) => (
                  <G key={`flame_${fg.id}_${idx}`}>
                    <Rect
                      x={t.x * CELL_SIZE + 1}
                      y={t.y * CELL_SIZE + 1}
                      width={CELL_SIZE - 2}
                      height={CELL_SIZE - 2}
                      rx={4}
                      fill="url(#flameGrad)"
                    />
                    <Circle cx={t.x * CELL_SIZE + CELL_SIZE / 2} cy={t.y * CELL_SIZE + CELL_SIZE / 2} r={CELL_SIZE / 4} fill="#FFFFFF" />
                  </G>
                ))
              )}

              {/* Enemies (AI Bots) */}
              {enemies.map((bot) => {
                if (!bot.isAlive) return null;
                const ex = bot.x * CELL_SIZE + CELL_SIZE / 2;
                const ey = bot.y * CELL_SIZE + CELL_SIZE / 2;
                return (
                  <G key={bot.id}>
                    <Circle cx={ex} cy={ey} r={CELL_SIZE / 2 - 4} fill="#140A24" stroke={bot.color} strokeWidth={1.8} />
                    {/* Bot Glowing Eye Visor */}
                    <Circle cx={ex} cy={ey} r={4.5} fill={bot.color} />
                    <Line x1={ex - 6} y1={ey} x2={ex + 6} y2={ey} stroke="#FFFFFF" strokeWidth={1.2} />
                  </G>
                );
              })}

              {/* Player Cyber Bomber Operative */}
              <G>
                <Circle
                  cx={playerPos.x * CELL_SIZE + CELL_SIZE / 2}
                  cy={playerPos.y * CELL_SIZE + CELL_SIZE / 2}
                  r={CELL_SIZE / 2 - 3}
                  fill="#00F5FF"
                  stroke="#FFFFFF"
                  strokeWidth={hasShield ? 2.5 : 1.5}
                />
                {/* Operative Visor oriented by playerFacing */}
                <Rect
                  x={
                    playerPos.x * CELL_SIZE +
                    (playerFacing === 'LEFT' ? 4 : playerFacing === 'RIGHT' ? 10 : 7)
                  }
                  y={
                    playerPos.y * CELL_SIZE +
                    (playerFacing === 'UP' ? 6 : playerFacing === 'DOWN' ? 14 : 10)
                  }
                  width={playerFacing === 'LEFT' || playerFacing === 'RIGHT' ? 10 : CELL_SIZE - 14}
                  height={playerFacing === 'UP' || playerFacing === 'DOWN' ? 6 : 8}
                  rx={2}
                  fill="#060914"
                />
                {/* Cyber Shield Aura */}
                {hasShield && (
                  <Circle
                    cx={playerPos.x * CELL_SIZE + CELL_SIZE / 2}
                    cy={playerPos.y * CELL_SIZE + CELL_SIZE / 2}
                    r={CELL_SIZE / 2 + 1}
                    stroke="#39FF14"
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    fill="none"
                  />
                )}
              </G>
            </Svg>
          </View>
        </View>

        {/* Tactical Controls: 4-Way D-Pad on Left, Bomb Button on Right */}
        <View style={styles.controlsRow}>
          {/* Virtual D-Pad */}
          <View style={styles.dpadMatrix}>
            {/* UP */}
            <Pressable
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              pressRetentionOffset={{ top: 25, bottom: 25, left: 25, right: 25 }}
              style={({ pressed }) => [styles.dpadBtn, styles.dpadUp, pressed && styles.dpadBtnActive]}
              onPressIn={() => handleDirectionPressIn(0, -1)}
              onPressOut={handleDirectionPressOut}
            >
              <Text style={styles.dpadText}>▲</Text>
            </Pressable>

            {/* MIDDLE ROW (LEFT, CORE, RIGHT) */}
            <View style={styles.dpadMiddle}>
              <Pressable
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                pressRetentionOffset={{ top: 25, bottom: 25, left: 25, right: 25 }}
                style={({ pressed }) => [styles.dpadBtn, styles.dpadLeft, pressed && styles.dpadBtnActive]}
                onPressIn={() => handleDirectionPressIn(-1, 0)}
                onPressOut={handleDirectionPressOut}
              >
                <Text style={styles.dpadText}>◀</Text>
              </Pressable>

              <View style={styles.dpadCore}>
                <Text style={{ fontSize: 13, color: '#00F5FF' }}>⚡</Text>
              </View>

              <Pressable
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                pressRetentionOffset={{ top: 25, bottom: 25, left: 25, right: 25 }}
                style={({ pressed }) => [styles.dpadBtn, styles.dpadRight, pressed && styles.dpadBtnActive]}
                onPressIn={() => handleDirectionPressIn(1, 0)}
                onPressOut={handleDirectionPressOut}
              >
                <Text style={styles.dpadText}>▶</Text>
              </Pressable>
            </View>

            {/* DOWN */}
            <Pressable
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              pressRetentionOffset={{ top: 25, bottom: 25, left: 25, right: 25 }}
              style={({ pressed }) => [styles.dpadBtn, styles.dpadDown, pressed && styles.dpadBtnActive]}
              onPressIn={() => handleDirectionPressIn(0, 1)}
              onPressOut={handleDirectionPressOut}
            >
              <Text style={styles.dpadText}>▼</Text>
            </Pressable>
          </View>

          {/* Action Trigger Button: DROP BOMB */}
          <View style={styles.actionContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.bombActionBtn,
                pressed && styles.bombActionBtnActive,
                bombs.length >= maxBombs && styles.bombActionBtnDisabled,
              ]}
              onPress={handleDropBomb}
            >
              <Text style={styles.bombActionIcon}>💣</Text>
              <Text style={styles.bombActionText}>DROP</Text>
            </Pressable>
          </View>
        </View>
      </JuiceEngine>

      {/* Victory / Next Level Modal */}
      <GameResultModal
        visible={victoryModal}
        type="VICTORY"
        title="SECTOR OVERRIDDEN!"
        subtitle={`Stage ${stage} Cleared! Data Uplink Secured.`}
        score={score}
        bestScore={highScore}
        accentColor="#00F5FF"
        buttonText="NEXT SECTOR ▶"
        onRetry={handleNextStage}
        onBackToHub={onBackToHub}
      />

      {/* Game Over Modal */}
      <GameResultModal
        visible={gameOver}
        type="GAME_OVER"
        title="OPERATIVE DOWN"
        subtitle="Defeated by Enemy Patrol. Try again!"
        score={score}
        bestScore={highScore}
        accentColor="#FF0055"
        buttonText="RETRY MISSION"
        onRetry={handleRestart}
        onBackToHub={onBackToHub}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05060D',
  },
  telemetryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'rgba(8, 10, 20, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 245, 255, 0.15)',
  },
  statBox: {
    alignItems: 'center',
  },
  statDim: {
    fontFamily: monoFont,
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 1,
  },
  statVal: {
    fontFamily: monoFont,
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  arenaWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  arenaCard: {
    width: COLS * CELL_SIZE,
    height: ROWS * CELL_SIZE,
    position: 'relative',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(0, 245, 255, 0.35)',
    backgroundColor: '#060812',
    overflow: 'hidden',
    shadowColor: '#00F5FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(8, 10, 20, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 245, 255, 0.15)',
  },
  dpadMatrix: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadMiddle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dpadBtn: {
    width: 50,
    height: 50,
    backgroundColor: '#12162A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 245, 255, 0.4)',
  },
  dpadBtnActive: {
    backgroundColor: 'rgba(0, 245, 255, 0.35)',
    transform: [{ scale: 0.95 }],
  },
  dpadUp: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  dpadDown: {
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  dpadLeft: {
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  dpadRight: {
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
  },
  dpadCore: {
    width: 42,
    height: 42,
    backgroundColor: '#0A0D1B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadText: {
    fontSize: 18,
    color: '#00F5FF',
    fontWeight: '900',
  },
  actionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bombActionBtn: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#1A0E24',
    borderWidth: 3,
    borderColor: '#FF0055',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF0055',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
  },
  bombActionBtnActive: {
    transform: [{ scale: 0.92 }],
    backgroundColor: 'rgba(255, 0, 85, 0.4)',
  },
  bombActionBtnDisabled: {
    opacity: 0.4,
    borderColor: 'rgba(255, 0, 85, 0.3)',
  },
  bombActionIcon: {
    fontSize: 30,
  },
  bombActionText: {
    fontFamily: monoFont,
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
    marginTop: 2,
  },
});
