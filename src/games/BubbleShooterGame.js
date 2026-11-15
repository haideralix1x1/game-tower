import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import MiniGameHeader from '../components/MiniGameHeader';
import GameResultModal from '../components/GameResultModal';
import {
  playBubbleShootSound,
  playBubblePopSound,
  playBubbleBounceSound,
  playVictorySound,
  playFailSound,
} from '../utils/sound';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Bubble grid sizing
const GRID_COLS = 8;
const BUBBLE_RADIUS = Math.floor((SCREEN_WIDTH - 24) / (GRID_COLS * 2));
const BUBBLE_DIAMETER = BUBBLE_RADIUS * 2;
const ROW_HEIGHT = Math.floor(BUBBLE_DIAMETER * 0.866); // cos(30 deg) for hex packing
const GRID_ROWS_MAX = 15;
const TOP_OFFSET = 95;
const CANNON_Y = SCREEN_HEIGHT - 135;
const CANNON_X = SCREEN_WIDTH / 2;
// Critical danger line placed very down, directly above the shooting cannon
const DANGER_LINE_Y = CANNON_Y - BUBBLE_DIAMETER - 24;

const BUBBLE_COLORS = [
  { id: 'cyan', hex: '#00F0FF', glow: 'rgba(0, 240, 255, 0.4)' },
  { id: 'magenta', hex: '#FF007F', glow: 'rgba(255, 0, 127, 0.4)' },
  { id: 'amber', hex: '#FFE600', glow: 'rgba(255, 230, 0, 0.4)' },
  { id: 'lime', hex: '#00FF66', glow: 'rgba(0, 255, 102, 0.4)' },
  { id: 'purple', hex: '#A855F7', glow: 'rgba(168, 85, 247, 0.4)' },
];

function getRandomColor() {
  return BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)];
}

export default function BubbleShooterGame({ onScoreUpdate, onExit }) {
  // Game state
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [shotsUntilDrop, setShotsUntilDrop] = useState(5);
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);

  // Bubble ammo with ref sync to eliminate PanResponder closure traps
  const currentAmmoRef = useRef(getRandomColor());
  const nextAmmoRef = useRef(getRandomColor());
  const [currentAmmo, setCurrentAmmo] = useState(currentAmmoRef.current);
  const [nextAmmo, setNextAmmo] = useState(nextAmmoRef.current);

  // Cannon aim angle in radians (-PI/2 is straight up)
  const aimAngleRef = useRef(-Math.PI / 2);
  const [aimAngle, setAimAngle] = useState(-Math.PI / 2);
  const [isAiming, setIsAiming] = useState(false);

  // Grid representation: 2D array [row][col] -> null or { id, hex, glow, animOffset }
  const gridRef = useRef([]);
  // Flying bubble: { x, y, vx, vy, color } or null
  const bulletRef = useRef(null);
  // Falling orphan bubbles: [{ x, y, vx, vy, color, alpha }]
  const orphansRef = useRef([]);
  // Pop particle bursts: [{ x, y, vx, vy, color, life }]
  const particlesRef = useRef([]);

  // Render tick state
  const [renderTrigger, setRenderTrigger] = useState(0);
  const animFrameRef = useRef(null);
  const lastTimeRef = useRef(Date.now());

  // Initialize Level Grid
  const initLevel = useCallback((lvl) => {
    const rows = 4 + Math.min(lvl, 3);
    const newGrid = [];
    for (let r = 0; r < GRID_ROWS_MAX; r++) {
      const isOdd = r % 2 === 1;
      const cols = isOdd ? GRID_COLS - 1 : GRID_COLS;
      const rowArr = [];
      for (let c = 0; c < cols; c++) {
        if (r < rows) {
          rowArr.push(getRandomColor());
        } else {
          rowArr.push(null);
        }
      }
      newGrid.push(rowArr);
    }
    gridRef.current = newGrid;
    bulletRef.current = null;
    orphansRef.current = [];
    particlesRef.current = [];
    setShotsUntilDrop(5);
    setGameOver(false);
    setVictory(false);
    const firstAmmo = getRandomColor();
    const secondAmmo = getRandomColor();
    currentAmmoRef.current = firstAmmo;
    nextAmmoRef.current = secondAmmo;
    setCurrentAmmo(firstAmmo);
    setNextAmmo(secondAmmo);
  }, []);

  // Load Saved Level & High Score
  useEffect(() => {
    (async () => {
      try {
        const savedLvl = await AsyncStorage.getItem('@game_tower:bubble_shooter_current_level');
        if (savedLvl !== null) {
          const parsed = parseInt(savedLvl, 10);
          if (!isNaN(parsed) && parsed >= 1) {
            setLevel(parsed);
          }
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    initLevel(level);
  }, [level, initLevel]);

  // Hex coordinate conversion
  const getCellCenter = (r, c) => {
    const isOdd = r % 2 === 1;
    const xOffset = isOdd ? 12 + BUBBLE_RADIUS * 2 : 12 + BUBBLE_RADIUS;
    const x = xOffset + c * BUBBLE_DIAMETER;
    const y = TOP_OFFSET + r * ROW_HEIGHT + BUBBLE_RADIUS;
    return { x, y };
  };

  // Find nearest grid cell for a given coordinate
  const getNearestCell = (px, py) => {
    let bestR = 0;
    let bestC = 0;
    let minDist = Infinity;

    for (let r = 0; r < GRID_ROWS_MAX; r++) {
      const isOdd = r % 2 === 1;
      const cols = isOdd ? GRID_COLS - 1 : GRID_COLS;
      for (let c = 0; c < cols; c++) {
        if (!gridRef.current[r] || gridRef.current[r][c] !== null) continue;
        const center = getCellCenter(r, c);
        const dist = Math.hypot(center.x - px, center.y - py);
        if (dist < minDist) {
          minDist = dist;
          bestR = r;
          bestC = c;
        }
      }
    }
    return { r: bestR, c: bestC };
  };

  // Get hex neighbors of a cell
  const getNeighbors = (r, c) => {
    const isOdd = r % 2 === 1;
    const deltas = isOdd
      ? [
          { r: 0, c: -1 },
          { r: 0, c: 1 },
          { r: -1, c: 0 },
          { r: -1, c: 1 },
          { r: 1, c: 0 },
          { r: 1, c: 1 },
        ]
      : [
          { r: 0, c: -1 },
          { r: 0, c: 1 },
          { r: -1, c: -1 },
          { r: -1, c: 0 },
          { r: 1, c: -1 },
          { r: 1, c: 0 },
        ];

    const neighbors = [];
    for (const d of deltas) {
      const nr = r + d.r;
      const nc = c + d.c;
      if (nr >= 0 && nr < GRID_ROWS_MAX) {
        const maxC = nr % 2 === 1 ? GRID_COLS - 1 : GRID_COLS;
        if (nc >= 0 && nc < maxC) {
          neighbors.push({ r: nr, c: nc });
        }
      }
    }
    return neighbors;
  };

  // Flood-fill to find connected matching bubbles
  const findMatches = (startR, startC, targetId) => {
    const matches = [];
    const visited = new Set();
    const queue = [{ r: startR, c: startC }];
    visited.add(`${startR},${startC}`);

    while (queue.length > 0) {
      const { r, c } = queue.shift();
      matches.push({ r, c });

      const nbs = getNeighbors(r, c);
      for (const nb of nbs) {
        const key = `${nb.r},${nb.c}`;
        if (!visited.has(key)) {
          visited.add(key);
          const cell = gridRef.current[nb.r]?.[nb.c];
          if (cell && cell.id === targetId) {
            queue.push(nb);
          }
        }
      }
    }
    return matches;
  };

  // Detect and drop orphan clusters (bubbles not connected to row 0)
  const dropOrphans = () => {
    const anchored = new Set();
    const queue = [];

    // All bubbles in row 0 are anchored
    if (gridRef.current[0]) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (gridRef.current[0][c] !== null) {
          anchored.add(`0,${c}`);
          queue.push({ r: 0, c });
        }
      }
    }

    // Traverse connected component from ceiling
    while (queue.length > 0) {
      const { r, c } = queue.shift();
      const nbs = getNeighbors(r, c);
      for (const nb of nbs) {
        const key = `${nb.r},${nb.c}`;
        if (!anchored.has(key)) {
          if (gridRef.current[nb.r]?.[nb.c] !== null) {
            anchored.add(key);
            queue.push(nb);
          }
        }
      }
    }

    // Any non-null bubble not in anchored is an orphan!
    let droppedCount = 0;
    for (let r = 0; r < GRID_ROWS_MAX; r++) {
      const cols = r % 2 === 1 ? GRID_COLS - 1 : GRID_COLS;
      for (let c = 0; c < cols; c++) {
        const cell = gridRef.current[r]?.[c];
        if (cell !== null && !anchored.has(`${r},${c}`)) {
          const center = getCellCenter(r, c);
          orphansRef.current.push({
            x: center.x,
            y: center.y,
            vx: (Math.random() - 0.5) * 4,
            vy: Math.random() * -3,
            color: cell,
            alpha: 1.0,
          });
          gridRef.current[r][c] = null;
          droppedCount++;
        }
      }
    }

    if (droppedCount > 0) {
      const bonus = droppedCount * 30;
      setScore((s) => {
        const next = s + bonus;
        if (onScoreUpdate) onScoreUpdate(next);
        return next;
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  };

  // Descend ceiling by 1 row
  const descendCeiling = () => {
    const newGrid = [];
    // Insert new top row
    const newTop = [];
    for (let c = 0; c < GRID_COLS; c++) {
      newTop.push(getRandomColor());
    }
    newGrid.push(newTop);

    for (let r = 0; r < GRID_ROWS_MAX - 1; r++) {
      newGrid.push(gridRef.current[r]);
    }
    gridRef.current = newGrid;

    // Check danger line
    checkDangerLine();
  };

  const checkDangerLine = () => {
    for (let r = 0; r < GRID_ROWS_MAX; r++) {
      const cols = r % 2 === 1 ? GRID_COLS - 1 : GRID_COLS;
      for (let c = 0; c < cols; c++) {
        if (gridRef.current[r]?.[c] !== null) {
          const pos = getCellCenter(r, c);
          if (pos.y + BUBBLE_RADIUS >= DANGER_LINE_Y) {
            setGameOver(true);
            playFailSound();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
            return;
          }
        }
      }
    }

    // Check victory
    let remaining = 0;
    for (let r = 0; r < GRID_ROWS_MAX; r++) {
      const cols = r % 2 === 1 ? GRID_COLS - 1 : GRID_COLS;
      for (let c = 0; c < cols; c++) {
        if (gridRef.current[r]?.[c] !== null) remaining++;
      }
    }
    if (remaining === 0) {
      setVictory(true);
      playVictorySound();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  };

  // Helper to pick a color present on board if available
  const getBoardColor = () => {
    const present = new Set();
    for (const row of gridRef.current) {
      for (const cell of row) {
        if (cell) present.add(cell.id);
      }
    }
    const filtered = BUBBLE_COLORS.filter((c) => present.has(c.id));
    const pool = filtered.length > 0 ? filtered : BUBBLE_COLORS;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  // Shoot current bubble
  const shootBubble = () => {
    if (bulletRef.current || gameOver || victory) return;

    const currentAmmoToShoot = currentAmmoRef.current;
    const currentAngle = aimAngleRef.current;

    const speed = 18;
    const vx = Math.cos(currentAngle) * speed;
    const vy = Math.sin(currentAngle) * speed;

    bulletRef.current = {
      x: CANNON_X,
      y: CANNON_Y,
      vx,
      vy,
      color: currentAmmoToShoot,
    };

    playBubbleShootSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    // Prepare next ammo
    const newCurrent = nextAmmoRef.current;
    const newNext = getBoardColor();
    currentAmmoRef.current = newCurrent;
    nextAmmoRef.current = newNext;
    setCurrentAmmo(newCurrent);
    setNextAmmo(newNext);
  };

  // Swap ammo
  const swapAmmo = () => {
    if (bulletRef.current || gameOver || victory) return;
    const temp = currentAmmoRef.current;
    currentAmmoRef.current = nextAmmoRef.current;
    nextAmmoRef.current = temp;
    setCurrentAmmo(currentAmmoRef.current);
    setNextAmmo(nextAmmoRef.current);
    Haptics.selectionAsync().catch(() => {});
  };

  const updateAim = (tx, ty) => {
    const dx = tx - CANNON_X;
    const dy = ty - CANNON_Y;
    if (dy < -10) {
      let angle = Math.atan2(dy, dx);
      // Clamp angle so user cannot shoot horizontal or downwards
      const minAngle = -Math.PI + 0.15;
      const maxAngle = -0.15;
      angle = Math.max(minAngle, Math.min(maxAngle, angle));
      aimAngleRef.current = angle;
      setAimAngle(angle);
    }
  };

  // Touch Pan Responder for laser aiming & firing
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setIsAiming(true);
        updateAim(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
      },
      onPanResponderMove: (evt) => {
        updateAim(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
      },
      onPanResponderRelease: () => {
        setIsAiming(false);
        shootBubble();
      },
    })
  ).current;

  // Main game animation loop
  useEffect(() => {
    const loop = () => {
      animFrameRef.current = requestAnimationFrame(loop);

      let dirty = false;

      // 1. Update bullet physics
      if (bulletRef.current) {
        dirty = true;
        const b = bulletRef.current;
        b.x += b.vx;
        b.y += b.vy;

        // Bounce off side walls
        if (b.x <= BUBBLE_RADIUS + 8) {
          b.x = BUBBLE_RADIUS + 8;
          b.vx = -b.vx;
          playBubbleBounceSound();
        } else if (b.x >= SCREEN_WIDTH - BUBBLE_RADIUS - 8) {
          b.x = SCREEN_WIDTH - BUBBLE_RADIUS - 8;
          b.vx = -b.vx;
          playBubbleBounceSound();
        }

        // Collision with ceiling
        let collided = false;
        if (b.y <= TOP_OFFSET + BUBBLE_RADIUS) {
          collided = true;
        }

        // Collision with existing bubbles in grid
        if (!collided) {
          for (let r = 0; r < GRID_ROWS_MAX; r++) {
            const cols = r % 2 === 1 ? GRID_COLS - 1 : GRID_COLS;
            for (let c = 0; c < cols; c++) {
              if (gridRef.current[r]?.[c] !== null) {
                const cellPos = getCellCenter(r, c);
                const dist = Math.hypot(cellPos.x - b.x, cellPos.y - b.y);
                if (dist <= BUBBLE_DIAMETER * 0.92) {
                  collided = true;
                  break;
                }
              }
            }
            if (collided) break;
          }
        }

        // Handle collision snap
        if (collided) {
          const { r, c } = getNearestCell(b.x, b.y);
          if (gridRef.current[r]) {
            gridRef.current[r][c] = b.color;
          }

          // Spawn landing sparks
          for (let i = 0; i < 6; i++) {
            particlesRef.current.push({
              x: b.x,
              y: b.y,
              vx: (Math.random() - 0.5) * 6,
              vy: (Math.random() - 0.5) * 6,
              color: b.color.hex,
              life: 1.0,
            });
          }

          // Check matches
          const matches = findMatches(r, c, b.color.id);
          if (matches.length >= 3) {
            // Burst matched bubbles
            for (const m of matches) {
              const center = getCellCenter(m.r, m.c);
              for (let i = 0; i < 8; i++) {
                particlesRef.current.push({
                  x: center.x,
                  y: center.y,
                  vx: (Math.random() - 0.5) * 8,
                  vy: (Math.random() - 0.5) * 8,
                  color: b.color.hex,
                  life: 1.0,
                });
              }
              gridRef.current[m.r][m.c] = null;
            }

            const pointsEarned = matches.length * 15;
            setScore((s) => {
              const next = s + pointsEarned;
              if (onScoreUpdate) onScoreUpdate(next);
              return next;
            });

            playBubblePopSound();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

            // Drop disconnected orphans
            dropOrphans();
          } else {
            // Missed shot decreases countdown to ceiling drop
            setShotsUntilDrop((cnt) => {
              if (cnt <= 1) {
                descendCeiling();
                return 5;
              }
              return cnt - 1;
            });
          }

          bulletRef.current = null;
          checkDangerLine();
        }
      }

      // 2. Update orphan falling bubbles
      if (orphansRef.current.length > 0) {
        dirty = true;
        const remainingOrphans = [];
        for (const o of orphansRef.current) {
          o.x += o.vx;
          o.y += o.vy;
          o.vy += 0.45; // gravity
          o.alpha -= 0.02;
          if (o.y < SCREEN_HEIGHT && o.alpha > 0.05) {
            remainingOrphans.push(o);
          }
        }
        orphansRef.current = remainingOrphans;
      }

      // 3. Update particles
      if (particlesRef.current.length > 0) {
        dirty = true;
        const remainingParticles = [];
        for (const p of particlesRef.current) {
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.04;
          if (p.life > 0) {
            remainingParticles.push(p);
          }
        }
        particlesRef.current = remainingParticles;
      }

      if (dirty) {
        setRenderTrigger((t) => (t + 1) % 10000);
      }
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [aimAngle, currentAmmo, nextAmmo, gameOver, victory]);

  // Compute laser guide trajectory points (with wall bounce)
  const computeGuideLine = () => {
    const points = [];
    let curX = CANNON_X;
    let curY = CANNON_Y;
    let vx = Math.cos(aimAngle);
    let vy = Math.sin(aimAngle);

    for (let step = 0; step < 40; step++) {
      curX += vx * 12;
      curY += vy * 12;

      if (curX <= 12) {
        curX = 12;
        vx = -vx;
      } else if (curX >= SCREEN_WIDTH - 12) {
        curX = SCREEN_WIDTH - 12;
        vx = -vx;
      }

      if (curY <= TOP_OFFSET) {
        points.push({ x: curX, y: curY });
        break;
      }

      points.push({ x: curX, y: curY });
    }
    return points;
  };

  const guidePoints = isAiming ? computeGuideLine() : [];

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <MiniGameHeader
        floorNum={5}
        gameTitle="BUBBLE SHOOTER"
        category="ARCADE SHOOTER"
        accentColor="#00F0FF"
        score={score}
        onBack={onExit}
        onBackToHub={onExit}
        onReset={() => {
          setLevel(1);
          setScore(0);
          AsyncStorage.setItem('@game_tower:bubble_shooter_current_level', '1').catch(() => {});
          initLevel(1);
        }}
        resetLabel="NEW"
        rightExtra={
          <View style={styles.levelContainer}>
            <Text style={styles.levelLabel}>LVL {level}</Text>
            <View style={styles.dropTracker}>
              <Text style={{ color: '#FF9900', fontSize: 10 }}>⚠️</Text>
              <Text style={styles.dropText}>{shotsUntilDrop}</Text>
            </View>
          </View>
        }
      />

      {/* Danger Line */}
      <View style={[styles.dangerLine, { top: DANGER_LINE_Y }]}>
        <View style={styles.dangerTag}>
          <Text style={styles.dangerTagText}>CRITICAL LIMIT</Text>
        </View>
      </View>

      {/* Hex Grid of Bubbles */}
      <View style={styles.gridContainer} pointerEvents="none">
        {gridRef.current.map((row, r) => {
          return row.map((cell, c) => {
            if (!cell) return null;
            const pos = getCellCenter(r, c);
            return (
              <View
                key={`${r}-${c}`}
                style={[
                  styles.bubble,
                  {
                    left: pos.x - BUBBLE_RADIUS,
                    top: pos.y - BUBBLE_RADIUS,
                    backgroundColor: cell.hex,
                    borderColor: cell.glow,
                    shadowColor: cell.hex,
                  },
                ]}
              >
                <View style={styles.bubbleGloss} />
              </View>
            );
          });
        })}
      </View>

      {/* Orphan Falling Bubbles */}
      {orphansRef.current.map((o, idx) => (
        <View
          key={`orphan-${idx}`}
          style={[
            styles.bubble,
            {
              left: o.x - BUBBLE_RADIUS,
              top: o.y - BUBBLE_RADIUS,
              backgroundColor: o.color.hex,
              opacity: o.alpha,
            },
          ]}
          pointerEvents="none"
        >
          <View style={styles.bubbleGloss} />
        </View>
      ))}

      {/* Particles */}
      {particlesRef.current.map((p, idx) => (
        <View
          key={`particle-${idx}`}
          style={[
            styles.particle,
            {
              left: p.x - 3,
              top: p.y - 3,
              backgroundColor: p.color,
              opacity: p.life,
              transform: [{ scale: p.life }],
            },
          ]}
          pointerEvents="none"
        />
      ))}

      {/* Dotted Laser Guide */}
      {guidePoints.map((pt, idx) => (
        <View
          key={`guide-${idx}`}
          style={[
            styles.guideDot,
            {
              left: pt.x - 3,
              top: pt.y - 3,
              backgroundColor: currentAmmo.hex,
              opacity: (idx % 2 === 0 ? 0.9 : 0.3) * (1 - idx / guidePoints.length * 0.4),
            },
          ]}
          pointerEvents="none"
        />
      ))}

      {/* Flying Bullet */}
      {bulletRef.current && (
        <View
          style={[
            styles.bubble,
            {
              left: bulletRef.current.x - BUBBLE_RADIUS,
              top: bulletRef.current.y - BUBBLE_RADIUS,
              backgroundColor: bulletRef.current.color.hex,
              shadowColor: bulletRef.current.color.hex,
            },
          ]}
          pointerEvents="none"
        >
          <View style={styles.bubbleGloss} />
        </View>
      )}

      {/* Bottom Cannon & Ammo Bay */}
      <View style={styles.cannonBay} pointerEvents="box-none">
        {/* Next Bubble Preview & Swap Button */}
        <TouchableOpacity style={styles.nextAmmoContainer} onPress={swapAmmo}>
          <Text style={styles.ammoLabel}>NEXT</Text>
          <View
            style={[
              styles.nextBubble,
              { backgroundColor: nextAmmo.hex, shadowColor: nextAmmo.hex },
            ]}
          >
            <Text style={{ color: '#000', fontSize: 13, fontWeight: '900' }}>⇄</Text>
          </View>
        </TouchableOpacity>

        {/* Cannon Base & Loaded Ammo */}
        <View style={styles.cannonCenter}>
          {/* Armored Dual-Rail Plasma Launcher Turret */}
          <View
            style={[
              styles.cannonTurretBarrel,
              {
                transform: [
                  { rotate: `${aimAngle + Math.PI / 2}rad` },
                ],
              },
            ]}
          >
            {/* Plasma Barrel Rails */}
            <View style={styles.barrelRailLeft} />
            <View style={[styles.barrelEnergyCore, { backgroundColor: currentAmmo.hex }]} />
            <View style={styles.barrelRailRight} />
            <View style={[styles.barrelMuzzle, { borderColor: currentAmmo.hex }]}>
              <View style={[styles.muzzlePlasmaGlow, { backgroundColor: currentAmmo.hex }]} />
            </View>
          </View>

          {/* Cannon Heavy Pedestal Base */}
          <View style={styles.cannonPedestal}>
            <View style={[styles.pedestalRing, { borderColor: currentAmmo.hex }]} />
          </View>

          {/* Current Loaded Plasma Bubble */}
          <View
            style={[
              styles.loadedBubble,
              { backgroundColor: currentAmmo.hex, shadowColor: currentAmmo.hex },
            ]}
          >
            <View style={styles.bubbleGloss} />
          </View>
        </View>

        {/* Level Clear Progress / Quick Hint */}
        <View style={styles.dropWarningBadge}>
          <Text style={{ fontSize: 14 }}>⚡</Text>
          <Text style={styles.ammoLabel}>AIM & DRAG</Text>
        </View>
      </View>

      {/* Touch Pan Surface for Smooth Drag Aiming */}
      <View style={styles.touchPad} {...panResponder.panHandlers} />

      {/* Game Result Modal */}
      <GameResultModal
        visible={gameOver || victory}
        type={victory ? 'VICTORY' : 'GAME_OVER'}
        title={victory ? 'LEVEL CLEARED!' : 'GAME OVER'}
        subtitle={victory ? `LEVEL ${level} COMPLETE` : 'BUBBLES REACHED DANGER LINE'}
        score={score}
        level={level}
        accentColor={victory ? '#00FF66' : '#FF0055'}
        onNext={() => {
          const nextLvl = level + 1;
          setLevel(nextLvl);
          AsyncStorage.setItem('@game_tower:bubble_shooter_current_level', String(nextLvl)).catch(() => {});
          initLevel(nextLvl);
        }}
        onRestart={() => {
          if (victory) {
            const nextLvl = level + 1;
            setLevel(nextLvl);
            AsyncStorage.setItem('@game_tower:bubble_shooter_current_level', String(nextLvl)).catch(() => {});
            initLevel(nextLvl);
          } else {
            setScore(0);
            initLevel(level);
          }
        }}
        onBackToHub={onExit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070814',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 10,
    backgroundColor: 'rgba(10, 15, 30, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 240, 255, 0.2)',
    zIndex: 50,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  scoreValue: {
    color: '#00F0FF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  levelContainer: {
    alignItems: 'flex-end',
  },
  levelLabel: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  dropTracker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  dropText: {
    color: '#FF9900',
    fontSize: 12,
    fontWeight: '800',
  },
  gridContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  dangerLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 85, 0.4)',
    zIndex: 10,
  },
  dangerTag: {
    position: 'absolute',
    right: 12,
    top: -10,
    backgroundColor: 'rgba(255, 0, 85, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FF0055',
  },
  dangerTagText: {
    color: '#FF0055',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  bubble: {
    position: 'absolute',
    width: BUBBLE_DIAMETER,
    height: BUBBLE_DIAMETER,
    borderRadius: BUBBLE_RADIUS,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  bubbleGloss: {
    position: 'absolute',
    top: 3,
    left: 5,
    width: BUBBLE_RADIUS * 0.7,
    height: BUBBLE_RADIUS * 0.45,
    borderRadius: BUBBLE_RADIUS,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  guideDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  touchPad: {
    position: 'absolute',
    top: TOP_OFFSET,
    bottom: 80,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  cannonBay: {
    position: 'absolute',
    bottom: 18,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: 'rgba(10, 15, 30, 0.92)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 240, 255, 0.35)',
    zIndex: 30,
  },
  cannonCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    width: BUBBLE_DIAMETER * 2.2,
    height: BUBBLE_DIAMETER * 2.2,
  },
  cannonTurretBarrel: {
    position: 'absolute',
    width: 24,
    height: 64,
    bottom: BUBBLE_RADIUS + 4,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  barrelRailLeft: {
    position: 'absolute',
    left: 2,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#00F0FF',
  },
  barrelRailRight: {
    position: 'absolute',
    right: 2,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#00F0FF',
  },
  barrelEnergyCore: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    width: 6,
    borderRadius: 3,
    opacity: 0.85,
  },
  barrelMuzzle: {
    position: 'absolute',
    top: 0,
    width: 18,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  muzzlePlasmaGlow: {
    width: 10,
    height: 3,
    borderRadius: 2,
  },
  cannonPedestal: {
    position: 'absolute',
    width: BUBBLE_DIAMETER + 18,
    height: BUBBLE_DIAMETER + 18,
    borderRadius: (BUBBLE_DIAMETER + 18) / 2,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderWidth: 2,
    borderColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pedestalRing: {
    width: BUBBLE_DIAMETER + 10,
    height: BUBBLE_DIAMETER + 10,
    borderRadius: (BUBBLE_DIAMETER + 10) / 2,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    opacity: 0.6,
  },
  loadedBubble: {
    width: BUBBLE_DIAMETER + 4,
    height: BUBBLE_DIAMETER + 4,
    borderRadius: (BUBBLE_DIAMETER + 4) / 2,
    borderWidth: 2,
    borderColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 8,
  },
  nextAmmoContainer: {
    alignItems: 'center',
    padding: 6,
  },
  ammoLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  nextBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropWarningBadge: {
    alignItems: 'center',
    padding: 6,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  modalCard: {
    width: '82%',
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
