import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  PanResponder,
  useWindowDimensions,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, {
  Rect,
  Circle,
  Line,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  G,
  Polygon,
} from 'react-native-svg';
import MiniGameHeader from '../components/MiniGameHeader';
import GameResultModal from '../components/GameResultModal';
import JuiceEngine from '../components/JuiceEngine';
import { playTapSound, playSliceSound, playGameOverSound } from '../utils/sound';
import {
  triggerLightHaptic,
  triggerMediumHaptic,
  triggerGameOverHaptic,
} from '../utils/haptics';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const STORAGE_HIGH_SCORE_KEY = '@game_tower:best_climber_v2';

const PLAYER_SIZE = 26;
const GRAVITY = 0.52;
const NORMAL_JUMP = -11.8;
const HIGH_JUMP = -14.2;
const PLAT_HEIGHT = 14;

export default function IcyTowerClimberGame({ onBackToHub, onScoreUpdate, isPaused = false }) {
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  const { width, height } = useWindowDimensions();
  const arenaWidth = width;
  const arenaHeight = height - 130;

  // High score
  const [highScore, setHighScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [crashCause, setCrashCause] = useState('FALL');

  // Single consolidated frame state for 60 FPS butter-smooth rendering
  const [frameData, setFrameData] = useState({
    playerX: arenaWidth * 0.5 - PLAYER_SIZE / 2,
    playerY: arenaHeight - 65,
    cameraY: 0,
    score: 0,
    floorsClimbed: 0,
    laserFloorY: arenaHeight + 80,
    isGrounded: true,
  });

  // Active game world objects (platforms, sentry bombs, turrets, projectiles, explosions)
  const [platforms, setPlatforms] = useState([]);
  const [sentryBombs, setSentryBombs] = useState([]);
  const [turrets, setTurrets] = useState([]);
  const [projectiles, setProjectiles] = useState([]);
  const [explosions, setExplosions] = useState([]);

  // Physics refs
  const playerRef = useRef({
    x: arenaWidth * 0.5 - PLAYER_SIZE / 2,
    y: arenaHeight - 65,
    vx: 0,
    vy: 0,
    isGrounded: true,
    currentPlatId: 'plat_0',
  });

  const cameraYRef = useRef(0);
  const laserFloorYRef = useRef(arenaHeight + 80);
  const scoreRef = useRef(0);
  const highestFloorRef = useRef(0);

  const platformsRef = useRef([]);
  const sentryBombsRef = useRef([]);
  const turretsRef = useRef([]);
  const projectilesRef = useRef([]);
  const explosionsRef = useRef([]);

  const nextPlatIndexRef = useRef(1);
  const highestGenYRef = useRef(arenaHeight - 40);
  const animFrameRef = useRef(null);
  const tickCountRef = useRef(0);

  // Load high score
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_HIGH_SCORE_KEY);
        if (saved !== null) {
          const val = parseInt(saved, 10);
          if (!isNaN(val)) setHighScore(val);
        }
      } catch {}
    })();
  }, []);

  /**
   * Procedural Endless Platform Spawner.
   * Generates platforms upwards to infinity, scaling difficulty with floor level.
   */
  const spawnAhead = useCallback((targetMinY) => {
    let curY = highestGenYRef.current;
    let idx = nextPlatIndexRef.current;

    const newPlats = [];
    const newBombs = [];
    const newTurrets = [];

    while (curY > targetMinY) {
      curY -= 68; // Vertical gap between platform tiers
      const floor = idx;

      // Platform width scales down slightly at higher floors
      const platW = Math.max(65, 125 - Math.floor(floor / 15) * 8);
      const platX = Math.random() * (arenaWidth - platW - 30) + 15;

      // Platform Type Distribution based on altitude / difficulty
      let type = 'NORMAL';
      const rand = Math.random();

      if (floor > 8 && rand < 0.22) {
        // Fire Hazard Platform (MUST AVOID!)
        type = 'FIRE';
      } else if (floor > 12 && rand < 0.44) {
        // Moving Mag-Rail Platform
        type = 'MOVING';
      } else if (rand < 0.56) {
        // Super Bounce Pad
        type = 'BOUNCE';
      } else if (floor > 16 && rand < 0.68) {
        // Crumbling Platform
        type = 'CRUMBLE';
      }

      const platId = `plat_${idx}`;
      const platObj = {
        id: platId,
        x: platX,
        y: curY,
        w: platW,
        type,
        floor,
        broken: false,
        crumbleTimer: 0,
        // For moving platforms
        vx: type === 'MOVING' ? (Math.random() > 0.5 ? 1.4 : -1.4) * (1 + Math.min(1.2, floor / 40)) : 0,
        minX: 10,
        maxX: arenaWidth - platW - 10,
      };
      newPlats.push(platObj);

      // Red Enemy Sentry Box (Kamikaze Bomb)
      // Spawns standing on certain platforms starting at floor 14+
      if (floor >= 14 && type !== 'FIRE' && type !== 'BOUNCE' && Math.random() < 0.25) {
        newBombs.push({
          id: `bomb_${idx}`,
          platId,
          x: platX + platW * 0.5 - 10,
          y: curY - 20,
          w: 20,
          h: 20,
          state: 'IDLE', // 'IDLE' | 'RUSH' | 'EXPLODED'
          speed: 2.2 + Math.min(1.5, floor / 50),
          fuse: 45, // ~750ms fuse after activation
          color: '#FF0055',
        });
      }

      // Defense Turrets mounted on walls starting at floor 20+
      if (floor >= 20 && floor % 7 === 0) {
        const wall = Math.random() > 0.5 ? 'LEFT' : 'RIGHT';
        newTurrets.push({
          id: `turret_${floor}`,
          wall,
          x: wall === 'LEFT' ? 0 : arenaWidth - 22,
          y: curY + 15,
          cooldown: 90 + Math.floor(Math.random() * 60),
          charge: 0,
          isAiming: false,
        });
      }

      idx += 1;
    }

    highestGenYRef.current = curY;
    nextPlatIndexRef.current = idx;

    if (newPlats.length > 0) {
      platformsRef.current = [...platformsRef.current, ...newPlats];
      setPlatforms(platformsRef.current);
    }
    if (newBombs.length > 0) {
      sentryBombsRef.current = [...sentryBombsRef.current, ...newBombs];
      setSentryBombs(sentryBombsRef.current);
    }
    if (newTurrets.length > 0) {
      turretsRef.current = [...turretsRef.current, ...newTurrets];
      setTurrets(turretsRef.current);
    }
  }, [arenaWidth]);

  // Initialize game
  const initTower = useCallback(() => {
    scoreRef.current = 0;
    highestFloorRef.current = 0;
    cameraYRef.current = 0;
    laserFloorYRef.current = arenaHeight + 80;
    tickCountRef.current = 0;
    nextPlatIndexRef.current = 1;
    highestGenYRef.current = arenaHeight - 40;

    const startPlayer = {
      x: arenaWidth * 0.5 - PLAYER_SIZE / 2,
      y: arenaHeight - 65,
      vx: 0,
      vy: 0,
      isGrounded: true,
      currentPlatId: 'plat_0',
    };
    playerRef.current = startPlayer;

    // Base Floor
    const basePlat = {
      id: 'plat_0',
      x: 0,
      y: arenaHeight - 38,
      w: arenaWidth,
      type: 'NORMAL',
      floor: 0,
      broken: false,
      crumbleTimer: 0,
      vx: 0,
    };

    platformsRef.current = [basePlat];
    sentryBombsRef.current = [];
    turretsRef.current = [];
    projectilesRef.current = [];
    explosionsRef.current = [];

    setPlatforms([basePlat]);
    setSentryBombs([]);
    setTurrets([]);
    setProjectiles([]);
    setExplosions([]);
    setIsPlaying(false);
    setModalVisible(false);

    setFrameData({
      playerX: startPlayer.x,
      playerY: startPlayer.y,
      cameraY: 0,
      score: 0,
      floorsClimbed: 0,
      laserFloorY: arenaHeight + 80,
      isGrounded: true,
    });

    // Spawn runway of platforms up ahead
    spawnAhead(arenaHeight - 1600);
  }, [arenaWidth, arenaHeight, spawnAhead]);

  useEffect(() => {
    initTower();
  }, [initTower]);

  // Jump execution with STRICT GROUNDING (NO JUMPING IN MID-AIR!)
  const executeJump = useCallback((direction = 'CENTER', isHigh = false) => {
    if (isPausedRef.current) return;
    const p = playerRef.current;

    // CANNOT JUMP IN MID-AIR!
    if (!p.isGrounded) {
      // In mid-air: allow subtle air drift steering, but NO VERTICAL JUMP
      if (direction === 'LEFT') {
        p.vx = Math.max(-5.5, p.vx - 3.2);
      } else if (direction === 'RIGHT') {
        p.vx = Math.min(5.5, p.vx + 3.2);
      }
      return;
    }

    // GROUNDED: Execute Full Jump Impulse!
    p.isGrounded = false;
    p.currentPlatId = null;

    const jumpPower = isHigh ? HIGH_JUMP : NORMAL_JUMP;
    p.vy = jumpPower;

    if (direction === 'LEFT') {
      p.vx = -5.8;
    } else if (direction === 'RIGHT') {
      p.vx = 5.8;
    } else {
      p.vx = 0;
    }

    playTapSound();
    triggerLightHaptic();
  }, []);

  // Touch & Swipe Controls
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderRelease: (evt, gesture) => {
        if (!isPlaying) {
          setIsPlaying(true);
        }

        const isUpSwipe = gesture.dy < -35;
        let dir = 'CENTER';

        if (gesture.dx > 25) {
          dir = 'RIGHT';
        } else if (gesture.dx < -25) {
          dir = 'LEFT';
        } else {
          // Tap on left or right half
          const tapX = evt.nativeEvent.locationX;
          dir = tapX > arenaWidth * 0.5 ? 'RIGHT' : 'LEFT';
        }

        executeJump(dir, isUpSwipe);
      },
    })
  ).current;

  // 60 FPS Physics & Endless Loop
  useEffect(() => {
    if (!isPlaying) return;

    let active = true;

    const tick = () => {
      if (!active) return;
      if (isPausedRef.current) {
        animFrameRef.current = requestAnimationFrame(tick);
        return;
      }
      tickCountRef.current += 1;

      const p = playerRef.current;
      let camY = cameraYRef.current;

      // 1. Update Laser Floor (rises continuously)
      const currentHighest = highestFloorRef.current;
      const laserSpeed = 0.65 + Math.min(0.9, currentHighest / 60);
      laserFloorYRef.current -= laserSpeed;

      // 2. Update Moving Platforms
      const plats = platformsRef.current;
      for (const plat of plats) {
        if (plat.type === 'MOVING' && plat.vx !== 0) {
          plat.x += plat.vx;
          if (plat.x <= plat.minX) {
            plat.x = plat.minX;
            plat.vx = Math.abs(plat.vx);
          } else if (plat.x >= plat.maxX) {
            plat.x = plat.maxX;
            plat.vx = -Math.abs(plat.vx);
          }

          // If player is standing on this moving platform, slide player with it!
          if (p.isGrounded && p.currentPlatId === plat.id) {
            p.x += plat.vx;
          }
        }

        // Handle Crumbling platforms
        if (plat.type === 'CRUMBLE' && plat.crumbleTimer > 0) {
          plat.crumbleTimer -= 1;
          if (plat.crumbleTimer <= 0) {
            plat.broken = true;
            if (p.currentPlatId === plat.id) {
              p.isGrounded = false;
              p.currentPlatId = null;
            }
          }
        }
      }

      // 3. Update Red Sentry Bombs
      const bombs = sentryBombsRef.current;
      for (const bomb of bombs) {
        if (bomb.state === 'EXPLODED') continue;

        // If player is on the same platform, activate sentry bomb to rush towards player!
        if (p.isGrounded && p.currentPlatId === bomb.platId && bomb.state === 'IDLE') {
          bomb.state = 'RUSH';
          triggerLightHaptic();
        }

        if (bomb.state === 'RUSH') {
          // Rush towards player's X position
          const targetX = p.x;
          const diff = targetX - bomb.x;
          if (Math.abs(diff) > 2) {
            bomb.x += Math.sign(diff) * bomb.speed;
          }

          bomb.fuse -= 1;

          // Check contact or fuse expiration -> DETONATE!
          const distToPlayer = Math.hypot((bomb.x + 10) - (p.x + PLAYER_SIZE / 2), (bomb.y + 10) - (p.y + PLAYER_SIZE / 2));
          if (bomb.fuse <= 0 || distToPlayer < 24) {
            bomb.state = 'EXPLODED';

            // Spawn explosion shockwave
            explosionsRef.current.push({
              id: `exp_${Date.now()}_${Math.random()}`,
              x: bomb.x + 10,
              y: bomb.y + 10,
              r: 10,
              maxR: 44,
              opacity: 1,
            });

            triggerMediumHaptic();
            playSliceSound();

            // Did the explosion catch the player?
            if (distToPlayer < 42) {
              handleGameOver('BLASTED BY SENTRY BOMB!');
              return;
            }
          }
        }
      }

      // 4. Update Defense Turrets & Projectiles
      const turretsList = turretsRef.current;
      for (const turret of turretsList) {
        turret.cooldown -= 1;
        if (turret.cooldown <= 30 && turret.cooldown > 0) {
          turret.isAiming = true;
        } else if (turret.cooldown <= 0) {
          turret.isAiming = false;
          turret.cooldown = 110 + Math.floor(Math.random() * 40);

          // Fire plasma projectile horizontally across the shaft
          const dir = turret.wall === 'LEFT' ? 1 : -1;
          projectilesRef.current.push({
            id: `proj_${Date.now()}_${Math.random()}`,
            x: turret.wall === 'LEFT' ? turret.x + 22 : turret.x - 12,
            y: turret.y + 4,
            vx: dir * 5.5,
            w: 18,
            h: 8,
          });
        }
      }

      // 5. Update Projectiles
      const projs = projectilesRef.current;
      for (let i = projs.length - 1; i >= 0; i--) {
        const pr = projs[i];
        pr.x += pr.vx;

        // Check collision with player
        const pHit = {
          left: p.x + 3,
          right: p.x + PLAYER_SIZE - 3,
          top: p.y + 3,
          bottom: p.y + PLAYER_SIZE - 3,
        };

        if (
          pr.x + pr.w > pHit.left &&
          pr.x < pHit.right &&
          pr.y + pr.h > pHit.top &&
          pr.y < pHit.bottom
        ) {
          handleGameOver('VAPORIZED BY TURRET LASER!');
          return;
        }

        // Out of screen bounds
        if (pr.x < -30 || pr.x > arenaWidth + 30) {
          projs.splice(i, 1);
        }
      }

      // 6. Update Explosions
      const exps = explosionsRef.current;
      for (let i = exps.length - 1; i >= 0; i--) {
        const exp = exps[i];
        exp.r += 2.8;
        exp.opacity -= 0.055;
        if (exp.opacity <= 0) {
          exps.splice(i, 1);
        }
      }

      // 7. Player Physics & Gravity
      let vx = p.vx * 0.90;
      let vy = p.vy;

      if (!p.isGrounded) {
        vy += GRAVITY;
      }

      let nextX = p.x + vx;
      let nextY = p.y + vy;

      // Screen boundary bounce
      if (nextX < 4) {
        nextX = 4;
        vx = -vx * 0.65;
      } else if (nextX > arenaWidth - PLAYER_SIZE - 4) {
        nextX = arenaWidth - PLAYER_SIZE - 4;
        vx = -vx * 0.65;
      }

      // 8. Platform Landing Collision Detection (Only while moving downward: vy > 0)
      if (vy > 0) {
        for (const plat of plats) {
          if (plat.broken) continue;

          // Check if player feet pass through the platform top
          if (
            p.y + PLAYER_SIZE <= plat.y + 6 &&
            nextY + PLAYER_SIZE >= plat.y &&
            nextX + PLAYER_SIZE - 4 > plat.x &&
            nextX + 4 < plat.x + plat.w
          ) {
            // FIRE PLATFORM: INSTANT INCINERATION!
            if (plat.type === 'FIRE') {
              handleGameOver('INCINERATED BY FIRE PLATFORM!');
              return;
            }

            // BOUNCE / SPRING PAD
            if (plat.type === 'BOUNCE') {
              nextY = plat.y - PLAYER_SIZE;
              vy = -16.5; // Huge catapult boost
              p.isGrounded = false;
              p.currentPlatId = null;
              playSliceSound();
              triggerMediumHaptic();
            } else {
              // Solid Landing!
              nextY = plat.y - PLAYER_SIZE;
              vy = 0;
              p.isGrounded = true;
              p.currentPlatId = plat.id;
              playTapSound();

              // Handle Crumble trigger
              if (plat.type === 'CRUMBLE' && plat.crumbleTimer === 0) {
                plat.crumbleTimer = 22; // ~350ms before breaking
              }
            }

            // Score & Altitude tracking
            if (plat.floor > highestFloorRef.current) {
              highestFloorRef.current = plat.floor;
              scoreRef.current += 60;
              onScoreUpdate?.(scoreRef.current);
            }
            break;
          }
        }
      }

      // If walking off the edge of a platform
      if (p.isGrounded && p.currentPlatId) {
        const curPlat = plats.find((pl) => pl.id === p.currentPlatId);
        if (curPlat) {
          if (nextX + PLAYER_SIZE < curPlat.x || nextX > curPlat.x + curPlat.w || curPlat.broken) {
            p.isGrounded = false;
            p.currentPlatId = null;
          }
        }
      }

      // 9. Camera Upward Tracking (Scrolls smoothly upwards with player)
      const targetCam = Math.max(0, arenaHeight * 0.55 - nextY);
      if (targetCam > camY) {
        camY += (targetCam - camY) * 0.14;
        cameraYRef.current = camY;
      }

      // 10. Dynamically Spawn Ahead
      if (highestGenYRef.current > -camY - 700) {
        spawnAhead(-camY - 1500);
      }

      // 11. Cull objects far below camera every 90 frames
      if (tickCountRef.current % 90 === 0) {
        const cullThreshold = -camY + arenaHeight + 150;
        platformsRef.current = platformsRef.current.filter((pl) => pl.y < cullThreshold);
        sentryBombsRef.current = sentryBombsRef.current.filter((b) => b.y < cullThreshold);
        turretsRef.current = turretsRef.current.filter((t) => t.y < cullThreshold);
        setPlatforms(platformsRef.current);
        setSentryBombs(sentryBombsRef.current);
        setTurrets(turretsRef.current);
      }

      // 12. Check Fall into Abyss or Laser Overload Floor
      if (nextY + camY > arenaHeight + 40 || nextY >= laserFloorYRef.current) {
        handleGameOver('CONSUMED BY RISING OVERLOAD!');
        return;
      }

      p.x = nextX;
      p.y = nextY;
      p.vx = vx;
      p.vy = vy;

      // Update consolidated frame state
      setFrameData({
        playerX: nextX,
        playerY: nextY,
        cameraY: camY,
        score: scoreRef.current,
        floorsClimbed: highestFloorRef.current,
        laserFloorY: laserFloorYRef.current,
        isGrounded: p.isGrounded,
      });

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, arenaWidth, arenaHeight, onScoreUpdate, spawnAhead]);

  const handleGameOver = (cause = 'PLUMMETED!') => {
    setIsPlaying(false);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    playGameOverSound();
    triggerGameOverHaptic();

    setCrashCause(cause);
    const finalScore = scoreRef.current;
    if (finalScore > highScore) {
      setHighScore(finalScore);
      AsyncStorage.setItem(STORAGE_HIGH_SCORE_KEY, String(finalScore)).catch(() => {});
      JuiceEngine.celebrate(width / 2, height / 2);
    }

    setModalVisible(true);
  };

  const handleRetry = () => {
    initTower();
  };

  const { playerX, playerY, cameraY, score, floorsClimbed, laserFloorY, isGrounded } = frameData;

  // Filter visible platforms and objects for feather-light 60 FPS rendering
  const visiblePlatforms = platforms.filter((plat) => {
    if (plat.broken) return null;
    const dy = plat.y + cameraY;
    return dy > -40 && dy < arenaHeight + 40;
  });

  const visibleBombs = sentryBombs.filter((b) => {
    if (b.state === 'EXPLODED') return false;
    const dy = b.y + cameraY;
    return dy > -40 && dy < arenaHeight + 40;
  });

  const visibleTurrets = turrets.filter((t) => {
    const dy = t.y + cameraY;
    return dy > -40 && dy < arenaHeight + 40;
  });

  const laserDrawY = laserFloorY + cameraY;

  return (
    <View style={styles.container}>
      <MiniGameHeader
        floorNum={29}
        gameTitle="SPIRE ASCENT"
        category="ENDLESS VERTICAL"
        accentColor="#00F5FF"
        score={score}
        onBack={onBackToHub}
        onBackToHub={onBackToHub}
      />

      {/* Top HUD: Altitude, Score & Ground Status */}
      <View style={styles.topHud}>
        <View style={styles.hudStatBox}>
          <Text style={styles.hudLabel}>ALTITUDE</Text>
          <Text style={styles.hudValue}>{floorsClimbed}F</Text>
        </View>

        <View style={styles.hudCenterBadge}>
          <Text
            style={[
              styles.hudStatusText,
              { color: isGrounded ? '#00F5FF' : '#FF6D00' },
            ]}
          >
            {isGrounded ? '⚡ GROUNDED // READY' : '✈ IN-FLIGHT'}
          </Text>
        </View>

        <View style={styles.hudStatBox}>
          <Text style={styles.hudLabel}>BEST</Text>
          <Text style={[styles.hudValue, { color: '#FFE600' }]}>{highScore}</Text>
        </View>
      </View>

      {/* Main Touch Arena with Svg Platforms */}
      <View style={styles.arena} {...panResponder.panHandlers}>
        <Svg width={arenaWidth} height={arenaHeight} style={StyleSheet.absoluteFill}>
          <Defs>
            {/* Fire Platform Blazing Gradient */}
            <LinearGradient id="firePlatGrad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor="#FF0055" stopOpacity="1" />
              <Stop offset="50%" stopColor="#FF3300" stopOpacity="1" />
              <Stop offset="100%" stopColor="#FFE600" stopOpacity="1" />
            </LinearGradient>

            {/* Bounce Platform Spring Gradient */}
            <LinearGradient id="bouncePlatGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#39FF14" stopOpacity="1" />
              <Stop offset="100%" stopColor="#0B5D1E" stopOpacity="1" />
            </LinearGradient>

            {/* Moving Mag-Rail Platform Gradient */}
            <LinearGradient id="movingPlatGrad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor="#FFE600" stopOpacity="1" />
              <Stop offset="50%" stopColor="#FF6D00" stopOpacity="1" />
              <Stop offset="100%" stopColor="#FFE600" stopOpacity="1" />
            </LinearGradient>

            {/* Rising Laser Floor Gradient */}
            <LinearGradient id="laserFloorGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FF0055" stopOpacity="0.9" />
              <Stop offset="40%" stopColor="#7928CA" stopOpacity="0.6" />
              <Stop offset="100%" stopColor="#050114" stopOpacity="0.95" />
            </LinearGradient>

            <RadialGradient id="turretEyeGrad" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#FF0055" stopOpacity="1" />
              <Stop offset="100%" stopColor="#FF0055" stopOpacity="0" />
            </RadialGradient>
          </Defs>

          {/* Tower Wall Guideways */}
          <Line x1={2} y1={0} x2={2} y2={arenaHeight} stroke="rgba(0, 245, 255, 0.25)" strokeWidth={3} />
          <Line x1={arenaWidth - 2} y1={0} x2={arenaWidth - 2} y2={arenaHeight} stroke="rgba(0, 245, 255, 0.25)" strokeWidth={3} />

          {/* Platforms translated by cameraY */}
          {visiblePlatforms.map((plat) => {
            const drawY = plat.y + cameraY;

            // 1. FIRE PLATFORM (HAZARD TO AVOID!)
            if (plat.type === 'FIRE') {
              return (
                <G key={plat.id}>
                  {/* Blazing Flame Aura */}
                  <Rect
                    x={plat.x - 2}
                    y={drawY - 4}
                    width={plat.w + 4}
                    height={PLAT_HEIGHT + 8}
                    rx={6}
                    fill="rgba(255, 0, 85, 0.2)"
                  />
                  {/* Fire Platform Core */}
                  <Rect
                    x={plat.x}
                    y={drawY}
                    width={plat.w}
                    height={PLAT_HEIGHT}
                    rx={5}
                    fill="url(#firePlatGrad)"
                    stroke="#FFFFFF"
                    strokeWidth={1.5}
                  />
                  {/* Flickering Fire Warning Text */}
                  <Text
                    x={plat.x + plat.w / 2}
                    y={drawY + 11}
                    textAnchor="middle"
                    fill="#050114"
                    fontSize={8.5}
                    fontWeight="900"
                    fontFamily={monoFont}
                  >
                    🔥 DANGER 🔥
                  </Text>
                </G>
              );
            }

            // 2. MOVING MAG-RAIL PLATFORM
            if (plat.type === 'MOVING') {
              return (
                <G key={plat.id}>
                  {/* Mag-rail Guide Line */}
                  <Line
                    x1={plat.minX}
                    y1={drawY + PLAT_HEIGHT / 2}
                    x2={plat.maxX + plat.w}
                    y2={drawY + PLAT_HEIGHT / 2}
                    stroke="rgba(255, 230, 0, 0.25)"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                  />
                  <Rect
                    x={plat.x}
                    y={drawY}
                    width={plat.w}
                    height={PLAT_HEIGHT}
                    rx={5}
                    fill="url(#movingPlatGrad)"
                    stroke="#FFFFFF"
                    strokeWidth={1.5}
                  />
                  {/* Mag-thrust indicators */}
                  <Circle cx={plat.x + 6} cy={drawY + PLAT_HEIGHT / 2} r={2.5} fill="#050114" />
                  <Circle cx={plat.x + plat.w - 6} cy={drawY + PLAT_HEIGHT / 2} r={2.5} fill="#050114" />
                </G>
              );
            }

            // 3. SUPER BOUNCE PLATFORM
            if (plat.type === 'BOUNCE') {
              return (
                <G key={plat.id}>
                  <Rect
                    x={plat.x}
                    y={drawY}
                    width={plat.w}
                    height={PLAT_HEIGHT}
                    rx={5}
                    fill="url(#bouncePlatGrad)"
                    stroke="#39FF14"
                    strokeWidth={1.5}
                  />
                  <Polygon
                    points={`${plat.x + plat.w / 2},${drawY + 2} ${plat.x + plat.w / 2 - 8},${drawY + 11} ${plat.x + plat.w / 2 + 8},${drawY + 11}`}
                    fill="#FFFFFF"
                  />
                </G>
              );
            }

            // 4. CRUMBLE PLATFORM
            if (plat.type === 'CRUMBLE') {
              const isShaking = plat.crumbleTimer > 0;
              const shakeX = isShaking ? (Math.random() - 0.5) * 4 : 0;
              return (
                <G key={plat.id} transform={`translate(${shakeX}, 0)`}>
                  <Rect
                    x={plat.x}
                    y={drawY}
                    width={plat.w}
                    height={PLAT_HEIGHT}
                    rx={5}
                    fill="#1A0A30"
                    stroke={isShaking ? '#FF0055' : '#7928CA'}
                    strokeWidth={1.5}
                    strokeDasharray={isShaking ? '3 2' : 'none'}
                  />
                  <Line
                    x1={plat.x + 12}
                    y1={drawY + 3}
                    x2={plat.x + plat.w - 12}
                    y2={drawY + PLAT_HEIGHT - 3}
                    stroke="rgba(255, 0, 85, 0.6)"
                    strokeWidth={1}
                  />
                </G>
              );
            }

            // 5. NORMAL SOLID PLATFORM
            return (
              <G key={plat.id}>
                <Rect
                  x={plat.x}
                  y={drawY}
                  width={plat.w}
                  height={PLAT_HEIGHT}
                  rx={5}
                  fill="#11092B"
                  stroke="#00F5FF"
                  strokeWidth={1.5}
                />
                <Line
                  x1={plat.x + 4}
                  y1={drawY + 3}
                  x2={plat.x + plat.w - 4}
                  y2={drawY + 3}
                  stroke="rgba(0, 245, 255, 0.4)"
                  strokeWidth={1}
                />
              </G>
            );
          })}

          {/* RED ENEMY SENTRY BOXES (Standing on platforms & rushing towards player) */}
          {visibleBombs.map((bomb) => {
            const drawY = bomb.y + cameraY;
            const isRushing = bomb.state === 'RUSH';
            const strobe = isRushing && tickCountRef.current % 4 < 2;

            return (
              <G key={bomb.id}>
                {/* Sentry Body */}
                <Rect
                  x={bomb.x}
                  y={drawY}
                  width={bomb.w}
                  height={bomb.h}
                  rx={3}
                  fill={strobe ? '#FFFFFF' : '#FF0055'}
                  stroke="#FF1744"
                  strokeWidth={1.5}
                />
                {/* Menacing Cyber Eye */}
                <Rect
                  x={bomb.x + 4}
                  y={drawY + 6}
                  width={bomb.w - 8}
                  height={4}
                  fill={isRushing ? '#FFE600' : '#050114'}
                />
                {/* Fuse Warning Antenna */}
                {isRushing && (
                  <>
                    <Line
                      x1={bomb.x + bomb.w / 2}
                      y1={drawY}
                      x2={bomb.x + bomb.w / 2}
                      y2={drawY - 6}
                      stroke="#FFE600"
                      strokeWidth={1.5}
                    />
                    <Circle cx={bomb.x + bomb.w / 2} cy={drawY - 7} r={2} fill="#FF0055" />
                  </>
                )}
              </G>
            );
          })}

          {/* DEFENSE TURRETS & TARGETING LASERS */}
          {visibleTurrets.map((turret) => {
            const drawY = turret.y + cameraY;
            const isAiming = turret.isAiming;

            return (
              <G key={turret.id}>
                {/* Turret Base Mount */}
                <Rect
                  x={turret.x}
                  y={drawY}
                  width={22}
                  height={16}
                  rx={3}
                  fill="#140A28"
                  stroke="#FF0055"
                  strokeWidth={1.5}
                />
                {/* Turret Barrel */}
                <Circle
                  cx={turret.wall === 'LEFT' ? turret.x + 16 : turret.x + 6}
                  cy={drawY + 8}
                  r={4}
                  fill="#FF0055"
                />

                {/* Pre-Fire Aiming Laser Beam */}
                {isAiming && (
                  <Line
                    x1={turret.wall === 'LEFT' ? turret.x + 22 : turret.x}
                    y1={drawY + 8}
                    x2={turret.wall === 'LEFT' ? arenaWidth : 0}
                    y2={drawY + 8}
                    stroke="#FF0055"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    opacity={0.85}
                  />
                )}
              </G>
            );
          })}

          {/* ACTIVE PLASMA PROJECTILES */}
          {projectiles.map((pr) => {
            const drawY = pr.y + cameraY;
            return (
              <G key={pr.id}>
                <Rect
                  x={pr.x}
                  y={drawY}
                  width={pr.w}
                  height={pr.h}
                  rx={3}
                  fill="#00F5FF"
                  stroke="#FFFFFF"
                  strokeWidth={1}
                />
              </G>
            );
          })}

          {/* ACTIVE EXPLOSIONS */}
          {explosions.map((exp) => {
            const drawY = exp.y + cameraY;
            return (
              <G key={exp.id}>
                <Circle
                  cx={exp.x}
                  cy={drawY}
                  r={exp.r}
                  fill="none"
                  stroke="#FF0055"
                  strokeWidth={3}
                  opacity={exp.opacity}
                />
                <Circle
                  cx={exp.x}
                  cy={drawY}
                  r={exp.r * 0.65}
                  fill="rgba(255, 109, 0, 0.4)"
                  opacity={exp.opacity}
                />
              </G>
            );
          })}

          {/* PLAYER CYBER CUBE */}
          <G transform={`translate(${playerX}, ${playerY + cameraY})`}>
            {/* Jet Engine Flare (while rising) */}
            {playerRef.current.vy < -2 && (
              <Polygon
                points={`6,${PLAYER_SIZE} ${PLAYER_SIZE / 2},${PLAYER_SIZE + 10} ${PLAYER_SIZE - 6},${PLAYER_SIZE}`}
                fill="#00F5FF"
                opacity={0.85}
              />
            )}
            {/* Main Cube Body */}
            <Rect
              x={0}
              y={0}
              width={PLAYER_SIZE}
              height={PLAYER_SIZE}
              rx={6}
              fill="#0E0826"
              stroke="#00F5FF"
              strokeWidth={2}
            />
            {/* Cyber Visor Eye */}
            <Rect
              x={4}
              y={6}
              width={PLAYER_SIZE - 8}
              height={5}
              rx={2}
              fill="#FFE600"
            />
            {/* Energy Core Light */}
            <Circle cx={PLAYER_SIZE / 2} cy={PLAYER_SIZE - 7} r={2.5} fill="#39FF14" />
          </G>

          {/* RISING LASER OVERLOAD FLOOR */}
          {laserDrawY < arenaHeight + 100 && (
            <G>
              <Rect
                x={0}
                y={laserDrawY}
                width={arenaWidth}
                height={arenaHeight - laserDrawY + 50}
                fill="url(#laserFloorGrad)"
              />
              <Line
                x1={0}
                y1={laserDrawY}
                x2={arenaWidth}
                y2={laserDrawY}
                stroke="#FF0055"
                strokeWidth={3}
              />
              <Text
                x={arenaWidth / 2}
                y={laserDrawY + 22}
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize={10}
                fontWeight="900"
                fontFamily={monoFont}
                letterSpacing={2}
              >
                ⚠ OVERLOAD PURGE RISING ⚠
              </Text>
            </G>
          )}
        </Svg>

        {/* Start Game Prompt Overlay */}
        {!isPlaying && (
          <View style={styles.promptOverlay} pointerEvents="none">
            <Text style={styles.promptText}>SWIPE UP TO ASCEND</Text>
            <Text style={styles.promptSub}>
              NO AIR JUMPS • AVOID FIRE PLATFORMS • OUTRUN SENTRY BOMBS
            </Text>
          </View>
        )}
      </View>

      <GameResultModal
        visible={modalVisible}
        type="gameover"
        score={score}
        level={floorsClimbed}
        onRetry={handleRetry}
        onBackToHub={onBackToHub}
        buttonText="ASCEND AGAIN"
        message={crashCause}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#040214',
  },
  topHud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(8, 4, 24, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 245, 255, 0.25)',
  },
  hudStatBox: {
    alignItems: 'center',
  },
  hudLabel: {
    fontFamily: monoFont,
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  hudValue: {
    fontFamily: monoFont,
    fontSize: 14,
    fontWeight: '900',
    color: '#00F5FF',
  },
  hudCenterBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  hudStatusText: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  arena: {
    flex: 1,
    position: 'relative',
  },
  promptOverlay: {
    position: 'absolute',
    top: '38%',
    left: 20,
    right: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(6, 2, 20, 0.92)',
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 245, 255, 0.4)',
    shadowColor: '#00F5FF',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  promptText: {
    fontFamily: monoFont,
    fontSize: 18,
    fontWeight: '900',
    color: '#00F5FF',
    letterSpacing: 2,
    textAlign: 'center',
  },
  promptSub: {
    fontFamily: monoFont,
    fontSize: 9.5,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 8,
    letterSpacing: 0.5,
    textAlign: 'center',
    lineHeight: 14,
  },
});
