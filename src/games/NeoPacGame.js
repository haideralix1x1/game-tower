import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  PanResponder,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import MiniGameHeader from '../components/MiniGameHeader';
import GameResultModal from '../components/GameResultModal';
import {
  playPacChompSound,
  playPacEatGhostSound,
  playPacPowerSound,
  playPacDieSound,
  playVictorySound,
  playFailSound,
  startBGM,
  stopBGM,
} from '../utils/sound';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Maze Grid Definition: 15 cols x 17 rows
// 1 = Wall, 0 = Dot, 2 = Power Pellet, 3 = Empty/Ghost House, 4 = Warp
const MAZE_COLS = 15;
const MAZE_ROWS = 17;
const TILE_SIZE = Math.floor((SCREEN_WIDTH - 20) / MAZE_COLS);
const MAZE_WIDTH = TILE_SIZE * MAZE_COLS;
const MAZE_HEIGHT = TILE_SIZE * MAZE_ROWS;

const INITIAL_MAZE = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 2, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 2, 1],
  [1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 0, 1, 3, 3, 3, 1, 0, 1, 1, 1, 1],
  [4, 3, 3, 1, 0, 1, 3, 3, 3, 1, 0, 1, 3, 3, 4],
  [1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1],
  [1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1],
  [1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1],
  [1, 2, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 2, 1],
  [1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

const GHOST_DATA = [
  { id: 'blinky', name: 'Blinky', color: '#FF0055', homeR: 7, homeC: 7 },
  { id: 'pinky', name: 'Pinky', color: '#FF77AA', homeR: 6, homeC: 7 },
  { id: 'inky', name: 'Inky', color: '#00F0FF', homeR: 7, homeC: 6 },
  { id: 'clyde', name: 'Clyde', color: '#FF9900', homeR: 7, homeC: 8 },
];

const DIRS = {
  UP: { dr: -1, dc: 0, angle: '-90deg', name: 'UP' },
  DOWN: { dr: 1, dc: 0, angle: '90deg', name: 'DOWN' },
  LEFT: { dr: 0, dc: -1, angle: '180deg', name: 'LEFT' },
  RIGHT: { dr: 0, dc: 1, angle: '0deg', name: 'RIGHT' },
  NONE: { dr: 0, dc: 0, angle: '0deg', name: 'NONE' },
};

export default function NeoPacGame({ onScoreUpdate, onExit }) {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);
  const [frightenedTime, setFrightenedTime] = useState(0);

  // Render tick
  const [, setRenderTrigger] = useState(0);

  // Game internal refs
  const mazeRef = useRef(INITIAL_MAZE.map((r) => [...r]));
  const pacmanRef = useRef({
    r: 13,
    c: 7,
    x: 7 * TILE_SIZE + TILE_SIZE / 2,
    y: 13 * TILE_SIZE + TILE_SIZE / 2,
    dir: DIRS.NONE,
    bufferedDir: DIRS.NONE,
    mouthOpen: true,
  });

  const ghostsRef = useRef(
    GHOST_DATA.map((g) => ({
      ...g,
      r: g.homeR,
      c: g.homeC,
      x: g.homeC * TILE_SIZE + TILE_SIZE / 2,
      y: g.homeR * TILE_SIZE + TILE_SIZE / 2,
      dir: DIRS.UP,
      isFrightened: false,
      isEaten: false,
    }))
  );

  const loopRef = useRef(null);
  const stepCountRef = useRef(0);
  const totalPelletsRef = useRef(0);
  const eatenPelletsRef = useRef(0);

  // Reset/Init Level
  const initGame = useCallback((lvl, resetScore = true) => {
    mazeRef.current = INITIAL_MAZE.map((r) => [...r]);
    mazeRef.current[13][7] = 3; // Clear dot under Pac-Man at spawn
    pacmanRef.current = {
      r: 13,
      c: 7,
      x: 7 * TILE_SIZE + TILE_SIZE / 2,
      y: 13 * TILE_SIZE + TILE_SIZE / 2,
      dir: DIRS.NONE,
      bufferedDir: DIRS.NONE,
      mouthOpen: true,
    };

    ghostsRef.current = GHOST_DATA.map((g) => ({
      ...g,
      r: g.homeR,
      c: g.homeC,
      x: g.homeC * TILE_SIZE + TILE_SIZE / 2,
      y: g.homeR * TILE_SIZE + TILE_SIZE / 2,
      dir: DIRS.UP,
      isFrightened: false,
      isEaten: false,
    }));

    let pellets = 0;
    for (let r = 0; r < MAZE_ROWS; r++) {
      for (let c = 0; c < MAZE_COLS; c++) {
        if (mazeRef.current[r][c] === 0 || mazeRef.current[r][c] === 2) {
          pellets++;
        }
      }
    }
    totalPelletsRef.current = pellets;
    eatenPelletsRef.current = 0;

    if (resetScore) setScore(0);
    setLives(3);
    setGameOver(false);
    setVictory(false);
    setFrightenedTime(0);
  }, []);

  // Load Saved Level Progression
  useEffect(() => {
    (async () => {
      try {
        const savedLvl = await AsyncStorage.getItem('@game_tower:neopac_current_level');
        if (savedLvl !== null) {
          const parsed = parseInt(savedLvl, 10);
          if (!isNaN(parsed) && parsed >= 1) {
            setLevel(parsed);
            initGame(parsed, true);
            return;
          }
        }
        initGame(1, true);
      } catch {
        initGame(1, true);
      }
    })();
  }, [initGame]);

  // Direction buffering for ULTRA RESPONSIVE mobile controls
  const requestDirection = useCallback((newDir) => {
    pacmanRef.current.bufferedDir = newDir;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  // Check if tile is walkable
  const canMoveTo = (r, c) => {
    // Warp tunnels on row 7
    if (r === 7 && (c < 0 || c >= MAZE_COLS)) return true;
    if (r < 0 || r >= MAZE_ROWS || c < 0 || c >= MAZE_COLS) return false;
    return mazeRef.current[r][c] !== 1;
  };

  // Pan Responder for anywhere-on-screen fluid swipe
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderRelease: (evt, gestureState) => {
        const { dx, dy } = gestureState;
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 20) requestDirection(DIRS.RIGHT);
          else if (dx < -20) requestDirection(DIRS.LEFT);
        } else {
          if (dy > 20) requestDirection(DIRS.DOWN);
          else if (dy < -20) requestDirection(DIRS.UP);
        }
      },
    })
  ).current;

  // Main 60 FPS Game Loop
  useEffect(() => {
    const update = () => {
      loopRef.current = requestAnimationFrame(update);

      if (gameOver || victory) return;

      stepCountRef.current++;
      const pac = pacmanRef.current;

      // 1. Check if buffered direction is now possible
      if (pac.bufferedDir !== DIRS.NONE) {
        const nextR = pac.r + pac.bufferedDir.dr;
        const nextC = pac.c + pac.bufferedDir.dc;
        if (canMoveTo(nextR, nextC)) {
          // If 180-degree reversal, reverse immediately
          if (
            (pac.dir === DIRS.LEFT && pac.bufferedDir === DIRS.RIGHT) ||
            (pac.dir === DIRS.RIGHT && pac.bufferedDir === DIRS.LEFT) ||
            (pac.dir === DIRS.UP && pac.bufferedDir === DIRS.DOWN) ||
            (pac.dir === DIRS.DOWN && pac.bufferedDir === DIRS.UP)
          ) {
            pac.dir = pac.bufferedDir;
            pac.bufferedDir = DIRS.NONE;
          } else {
            // Check closeness to tile center for 90-degree corner turning
            const targetCenterX = pac.c * TILE_SIZE + TILE_SIZE / 2;
            const targetCenterY = pac.r * TILE_SIZE + TILE_SIZE / 2;
            const dist = Math.hypot(pac.x - targetCenterX, pac.y - targetCenterY);

            if (dist < 4) {
              pac.x = targetCenterX;
              pac.y = targetCenterY;
              pac.dir = pac.bufferedDir;
              pac.bufferedDir = DIRS.NONE;
            }
          }
        }
      }

      // 2. Move Pac-Man
      const pacSpeed = 1.6;
      if (pac.dir !== DIRS.NONE) {
        const nextX = pac.x + pac.dir.dc * pacSpeed;
        const nextY = pac.y + pac.dir.dr * pacSpeed;

        // Current tile
        const nextTileC = Math.floor(nextX / TILE_SIZE);
        const nextTileR = Math.floor(nextY / TILE_SIZE);

        // Warp tunnel handling
        if (pac.r === 7) {
          if (nextX < 0) {
            pac.x = MAZE_WIDTH - 2;
            pac.c = MAZE_COLS - 1;
          } else if (nextX > MAZE_WIDTH) {
            pac.x = 2;
            pac.c = 0;
          }
        }

        if (canMoveTo(nextTileR, nextTileC)) {
          pac.x = nextX;
          pac.y = nextY;
          pac.r = Math.floor(pac.y / TILE_SIZE);
          pac.c = Math.floor(pac.x / TILE_SIZE);
        } else {
          // Stop at tile center
          pac.x = pac.c * TILE_SIZE + TILE_SIZE / 2;
          pac.y = pac.r * TILE_SIZE + TILE_SIZE / 2;
        }

        // Chomp animation
        if (stepCountRef.current % 6 === 0) {
          pac.mouthOpen = !pac.mouthOpen;
        }
      }

      // 3. Pellet Eating
      if (pac.r >= 0 && pac.r < MAZE_ROWS && pac.c >= 0 && pac.c < MAZE_COLS) {
        const cell = mazeRef.current[pac.r][pac.c];
        if (cell === 0) {
          // Regular dot
          mazeRef.current[pac.r][pac.c] = 3;
          eatenPelletsRef.current++;
          playPacChompSound();
          setScore((s) => {
            const next = s + 10;
            if (onScoreUpdate) onScoreUpdate(next);
            return next;
          });
        } else if (cell === 2) {
          // Power Pellet!
          mazeRef.current[pac.r][pac.c] = 3;
          eatenPelletsRef.current++;
          playPacPowerSound();
          setScore((s) => {
            const next = s + 50;
            if (onScoreUpdate) onScoreUpdate(next);
            return next;
          });
          setFrightenedTime(300); // ~5 seconds frightened
          for (const g of ghostsRef.current) {
            if (!g.isEaten) g.isFrightened = true;
          }
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }

        // Check Victory
        if (eatenPelletsRef.current >= totalPelletsRef.current && totalPelletsRef.current > 0) {
          setVictory(true);
          playVictorySound();
        }
      }

      // 4. Update Frightened Timer
      setFrightenedTime((ft) => {
        if (ft <= 1 && ft > 0) {
          for (const g of ghostsRef.current) {
            g.isFrightened = false;
          }
          return 0;
        }
        return Math.max(0, ft - 1);
      });

      // 5. Ghost AI & Movement (Smooth continuous maze traversal)
      const ghostSpeed = frightenedTime > 0 ? 1.0 : 1.4;
      for (const ghost of ghostsRef.current) {
        const gx = ghost.x + ghost.dir.dc * ghostSpeed;
        const gy = ghost.y + ghost.dir.dr * ghostSpeed;

        const nextTileR = Math.floor(gy / TILE_SIZE);
        const nextTileC = Math.floor(gx / TILE_SIZE);

        const enteredNewTile = nextTileR !== ghost.r || nextTileC !== ghost.c;
        const isWallAhead = !canMoveTo(nextTileR, nextTileC);

        if (enteredNewTile || isWallAhead) {
          if (!isWallAhead) {
            ghost.r = nextTileR;
            ghost.c = nextTileC;
            ghost.x = gx;
            ghost.y = gy;
          }

          // Pick next valid direction at junction
          const possibleDirs = [DIRS.UP, DIRS.DOWN, DIRS.LEFT, DIRS.RIGHT].filter((d) => {
            if (!isWallAhead && d.dr === -ghost.dir.dr && d.dc === -ghost.dir.dc) return false;
            return canMoveTo(ghost.r + d.dr, ghost.c + d.dc);
          });

          if (possibleDirs.length > 0) {
            if (ghost.id === 'blinky' && !ghost.isFrightened) {
              possibleDirs.sort((a, b) => {
                const distA = Math.hypot(ghost.r + a.dr - pac.r, ghost.c + a.dc - pac.c);
                const distB = Math.hypot(ghost.r + b.dr - pac.r, ghost.c + b.dc - pac.c);
                return distA - distB;
              });
              ghost.dir = possibleDirs[0];
            } else {
              ghost.dir = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
            }
          } else {
            ghost.dir = {
              dr: -ghost.dir.dr,
              dc: -ghost.dir.dc,
              angle: '0deg',
              name: 'REVERSE',
            };
          }
        } else {
          ghost.x = gx;
          ghost.y = gy;
        }

        // 6. Collision with Pac-Man
        const distToPac = Math.hypot(ghost.x - pac.x, ghost.y - pac.y);
        if (distToPac < TILE_SIZE * 0.75) {
          if (ghost.isFrightened && !ghost.isEaten) {
            // Eat ghost!
            ghost.isEaten = true;
            ghost.isFrightened = false;
            ghost.x = ghost.homeC * TILE_SIZE + TILE_SIZE / 2;
            ghost.y = ghost.homeR * TILE_SIZE + TILE_SIZE / 2;
            ghost.r = ghost.homeR;
            ghost.c = ghost.homeC;

            playPacEatGhostSound();
            setScore((s) => {
              const next = s + 200;
              if (onScoreUpdate) onScoreUpdate(next);
              return next;
            });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
          } else if (!ghost.isEaten) {
            // Pac-Man hit!
            playPacDieSound();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
            setLives((l) => {
              if (l <= 1) {
                setGameOver(true);
                playFailSound();
                return 0;
              } else {
                // Respawn Pac-Man at start
                pac.r = 13;
                pac.c = 7;
                pac.x = 7 * TILE_SIZE + TILE_SIZE / 2;
                pac.y = 13 * TILE_SIZE + TILE_SIZE / 2;
                pac.dir = DIRS.NONE;
                pac.bufferedDir = DIRS.NONE;
                return l - 1;
              }
            });
          }
        }
      }

      setRenderTrigger((t) => (t + 1) % 10000);
    };

    loopRef.current = requestAnimationFrame(update);
    return () => {
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
    };
  }, [gameOver, victory, frightenedTime, onScoreUpdate]);

  const pac = pacmanRef.current;

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <MiniGameHeader
        floorNum={27}
        gameTitle="NEO PAC"
        category="ARCADE MAZE"
        accentColor="#FFE600"
        score={score}
        onBack={onExit}
        onBackToHub={onExit}
        onReset={() => {
          setLevel(1);
          AsyncStorage.setItem('@game_tower:neopac_current_level', '1').catch(() => {});
          initGame(1, true);
        }}
        resetLabel="NEW"
        rightExtra={
          <View style={styles.livesContainer}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Text
                key={`life-${i}`}
                style={{
                  fontSize: 14,
                  opacity: i < lives ? 1 : 0.25,
                }}
              >
                ❤️
              </Text>
            ))}
          </View>
        }
      />

      {/* Maze Board */}
      <View style={styles.boardWrapper} {...panResponder.panHandlers}>
        <View style={{ width: MAZE_WIDTH, height: MAZE_HEIGHT, position: 'relative' }}>
          {/* Maze Tiles */}
          {mazeRef.current.map((row, r) => (
            <View key={`row-${r}`} style={styles.mazeRow}>
              {row.map((cell, c) => {
                const isWall = cell === 1;
                const isDot = cell === 0;
                const isPower = cell === 2;

                return (
                  <View
                    key={`cell-${r}-${c}`}
                    style={[
                      styles.mazeCell,
                      isWall && styles.wallCell,
                    ]}
                  >
                    {isDot && <View style={styles.pelletDot} />}
                    {isPower && <View style={styles.powerPellet} />}
                  </View>
                );
              })}
            </View>
          ))}

          {/* Pac-Man Character */}
          <View
            style={[
              styles.pacman,
              {
                left: pac.x - TILE_SIZE / 2,
                top: pac.y - TILE_SIZE / 2,
                transform: [
                  {
                    rotate:
                      pac.dir === DIRS.RIGHT
                        ? '0deg'
                        : pac.dir === DIRS.DOWN
                        ? '90deg'
                        : pac.dir === DIRS.LEFT
                        ? '180deg'
                        : pac.dir === DIRS.UP
                        ? '270deg'
                        : '0deg',
                  },
                ],
              },
            ]}
          >
            <View style={styles.pacBody}>
              {pac.mouthOpen && <View style={styles.pacMouth} />}
            </View>
          </View>

          {/* Ghosts */}
          {ghostsRef.current.map((g) => {
            const isFrightened = g.isFrightened && !g.isEaten;
            const ghostColor = isFrightened
              ? frightenedTime < 60 && Math.floor(frightenedTime / 10) % 2 === 0
                ? '#FFFFFF'
                : '#1E40AF'
              : g.color;

            return (
              <View
                key={g.id}
                style={[
                  styles.ghost,
                  {
                    left: g.x - TILE_SIZE / 2,
                    top: g.y - TILE_SIZE / 2,
                    backgroundColor: ghostColor,
                    shadowColor: ghostColor,
                  },
                ]}
              >
                {/* Eyes */}
                <View style={styles.ghostEyes}>
                  <View style={styles.eye}>
                    <View style={styles.pupil} />
                  </View>
                  <View style={styles.eye}>
                    <View style={styles.pupil} />
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Virtual Glowing D-Pad with Pre-Turn Buffering */}
      <View style={styles.dpadContainer}>
        <View style={styles.dpadRow}>
          <TouchableOpacity
            style={[styles.dpadBtn, pac.bufferedDir === DIRS.UP && styles.dpadBtnActive]}
            onPress={() => requestDirection(DIRS.UP)}
          >
            <Text style={{ color: '#00F0FF', fontSize: 24, fontWeight: '900' }}>▲</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dpadMiddleRow}>
          <TouchableOpacity
            style={[styles.dpadBtn, pac.bufferedDir === DIRS.LEFT && styles.dpadBtnActive]}
            onPress={() => requestDirection(DIRS.LEFT)}
          >
            <Text style={{ color: '#00F0FF', fontSize: 24, fontWeight: '900' }}>◀</Text>
          </TouchableOpacity>

          <View style={styles.dpadCenter} />

          <TouchableOpacity
            style={[styles.dpadBtn, pac.bufferedDir === DIRS.RIGHT && styles.dpadBtnActive]}
            onPress={() => requestDirection(DIRS.RIGHT)}
          >
            <Text style={{ color: '#00F0FF', fontSize: 24, fontWeight: '900' }}>▶</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dpadRow}>
          <TouchableOpacity
            style={[styles.dpadBtn, pac.bufferedDir === DIRS.DOWN && styles.dpadBtnActive]}
            onPress={() => requestDirection(DIRS.DOWN)}
          >
            <Text style={{ color: '#00F0FF', fontSize: 24, fontWeight: '900' }}>▼</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Game Result Modal */}
      <GameResultModal
        visible={gameOver || victory}
        type={victory ? 'VICTORY' : 'GAME_OVER'}
        title={victory ? 'MAZE CLEARED!' : 'GAME OVER'}
        subtitle={victory ? `LEVEL ${level} COMPLETED` : 'CAUGHT BY CYBER GHOST'}
        score={score}
        level={level}
        accentColor={victory ? '#00FF66' : '#FF0055'}
        onRestart={() => {
          if (victory) {
            const nextLvl = level + 1;
            setLevel(nextLvl);
            AsyncStorage.setItem('@game_tower:neopac_current_level', String(nextLvl)).catch(() => {});
            initGame(nextLvl, false);
          } else {
            initGame(level, true);
          }
        }}
        onNext={() => {
          const nextLvl = level + 1;
          setLevel(nextLvl);
          AsyncStorage.setItem('@game_tower:neopac_current_level', String(nextLvl)).catch(() => {});
          initGame(nextLvl, false);
        }}
        onBackToHub={onExit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05070E',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 240, 255, 0.15)',
  },
  backBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  scoreValue: {
    color: '#FFE600',
    fontSize: 20,
    fontWeight: '900',
  },
  livesContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  boardWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  mazeRow: {
    flexDirection: 'row',
    height: TILE_SIZE,
  },
  mazeCell: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wallCell: {
    backgroundColor: '#1E1B4B',
    borderWidth: 1,
    borderColor: '#38BDF8',
    borderRadius: 3,
  },
  pelletDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFE600',
    shadowColor: '#FFE600',
    shadowOpacity: 0.8,
    shadowRadius: 3,
  },
  powerPellet: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFF',
    shadowColor: '#FFF',
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  pacman: {
    position: 'absolute',
    width: TILE_SIZE,
    height: TILE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  pacBody: {
    width: TILE_SIZE - 2,
    height: TILE_SIZE - 2,
    borderRadius: (TILE_SIZE - 2) / 2,
    backgroundColor: '#FFE600',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#FFE600',
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  pacMouth: {
    position: 'absolute',
    right: 0,
    top: '25%',
    width: '50%',
    height: '50%',
    backgroundColor: '#05070E',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  ghost: {
    position: 'absolute',
    width: TILE_SIZE - 2,
    height: TILE_SIZE - 2,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    zIndex: 9,
    shadowOpacity: 0.7,
    shadowRadius: 4,
  },
  ghostEyes: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 4,
  },
  eye: {
    width: 5,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pupil: {
    width: 2.5,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: '#000',
  },
  dpadContainer: {
    alignItems: 'center',
    marginTop: 6,
  },
  dpadRow: {
    alignItems: 'center',
  },
  dpadMiddleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dpadCenter: {
    width: 48,
    height: 48,
  },
  dpadBtn: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadBtnActive: {
    borderColor: '#00F0FF',
    backgroundColor: 'rgba(0, 240, 255, 0.25)',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  modalCard: {
    width: '80%',
    padding: 24,
    borderRadius: 20,
    backgroundColor: '#0E1326',
    borderWidth: 2,
    borderColor: '#00F0FF',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#00F0FF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    marginVertical: 12,
  },
  modalScore: {
    color: '#FFF',
    fontSize: 16,
    marginBottom: 20,
    fontWeight: '700',
  },
  modalBtn: {
    backgroundColor: '#00F0FF',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  modalBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
