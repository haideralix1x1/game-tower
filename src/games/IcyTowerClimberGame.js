import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
  Stop,
  G,
  Polygon,
  Text as SvgText,
} from 'react-native-svg';
import MiniGameHeader from '../components/MiniGameHeader';
import GameResultModal from '../components/GameResultModal';
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

  // Player Abilities: Shields (absorbs lethal hits)
  const [shields, setShields] = useState(1);
  const shieldsRef = useRef(1);
  const invulnerableUntilRef = useRef(0);

  // Single consolidated frame state for 60 FPS butter-smooth rendering
  const [frameData, setFrameData] = useState({
    playerX: arenaWidth * 0.5 - PLAYER_SIZE / 2,
    playerY: arenaHeight - 65,
    cameraY: 0,
    score: 0,
    floorsClimbed: 0,
    laserFloorY: arenaHeight + 80,
    isGrounded: true,
    vy: 0,
    projectiles: [],
    explosions: [],
    turrets: [],
  });

  // Active game world objects (platforms, sentry bombs, turrets, projectiles, scanning lasers, explosions)
  const [platforms, setPlatforms] = useState([]);
  const [sentryBombs, setSentryBombs] = useState([]);
  const [turrets, setTurrets] = useState([]);
  const [scanLasers, setScanLasers] = useState([]);
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
  const scanLasersRef = useRef([]);
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
   * Generates platforms upwards to infinity, scaling difficulty GRADUALLY:
   * - Floors 0-15: Simple & relaxing! Wide platforms (135px), Normal & Bounce only, frequent Shield & Spring pickups, NO lethal hazards.
   * - Floors 16-30: Gentle Movement & Crumbling platforms, extra Shields.
   * - Floors 31-50: Introduction of Lava platforms (generous 1.5s grace) and rare narrow Spikes.
   * - Floors 51-70: Wall Turrets (every 10 floors) and Sweeping Security Lasers (every 12 floors).
   * - Floors 71+: Rare Sentry Bombs on high-tier platforms.
   */
  const spawnAhead = useCallback((targetMinY) => {
    let curY = highestGenYRef.current;
    let idx = nextPlatIndexRef.current;

    const newPlats = [];
    const newBombs = [];
    const newTurrets = [];
    const newLasers = [];

    while (curY > targetMinY) {
      curY -= 68; // Vertical gap between platform tiers
      const floor = idx;

      // Platform width scales down gently
      const platW = floor <= 15 ? 135 : floor <= 30 ? 120 : floor <= 50 ? 105 : floor <= 75 ? 95 : 85;

      // Platform Type Distribution based on altitude / gradual difficulty
      let type = 'NORMAL';
      const rand = Math.random();
      const prevWasSpike =
        newPlats.length > 0 && newPlats[newPlats.length - 1].type === 'SPIKE';

      if (floor <= 15) {
        // Floors 0-15: Simple & Gentle! Only Normal & Super Bounce platforms!
        if (rand < 0.22) {
          type = 'BOUNCE';
        }
      } else if (floor <= 30) {
        // Floors 16-30: Gentle Movement & Crumble
        if (rand < 0.25) {
          type = 'MOVING';
        } else if (rand < 0.40) {
          type = 'CRUMBLE';
        } else if (rand < 0.58) {
          type = 'BOUNCE';
        }
      } else if (floor <= 50) {
        // Floors 31-50: Environmental Hazards Intro
        if (!prevWasSpike && rand < 0.12) {
          type = 'SPIKE';
        } else if (rand < 0.26) {
          type = 'FIRE';
        } else if (rand < 0.48) {
          type = 'MOVING';
        } else if (rand < 0.62) {
          type = 'CRUMBLE';
        } else if (rand < 0.76) {
          type = 'BOUNCE';
        }
      } else {
        // Floors 51+: High-tier Apex Spire
        if (!prevWasSpike && rand < 0.16) {
          type = 'SPIKE';
        } else if (rand < 0.32) {
          type = 'FIRE';
        } else if (rand < 0.52) {
          type = 'MOVING';
        } else if (rand < 0.68) {
          type = 'CRUMBLE';
        } else if (rand < 0.82) {
          type = 'BOUNCE';
        }
      }

      // Spiked platforms are narrower so player can maneuver around them
      const actualW = type === 'SPIKE' ? Math.min(platW, 68) : platW;
      const platX = Math.random() * (arenaWidth - actualW - 30) + 15;

      // Powerups on platforms: Shields and Super Springs!
      let powerup = null;
      if (type === 'NORMAL' || type === 'MOVING') {
        if (floor % 7 === 0 || (floor < 30 && floor % 5 === 0)) {
          powerup = 'SHIELD';
        } else if (floor % 11 === 4) {
          powerup = 'SPRING';
        }
      }

      const platId = `plat_${idx}`;
      const platObj = {
        id: platId,
        x: platX,
        y: curY,
        w: actualW,
        type,
        floor,
        powerup,
        broken: false,
        crumbleTimer: 0,
        heatTimer: 0, // Heat frames while player is standing on lava platform
        maxHeat: 90, // Generous 1.5 seconds grace period on lava!
        vx: type === 'MOVING' ? (Math.random() > 0.5 ? 1.0 : -1.0) * (1 + Math.min(0.8, floor / 60)) : 0,
        minX: 10,
        maxX: arenaWidth - actualW - 10,
      };
      newPlats.push(platObj);

      // Defense Turrets: Mounted on spire walls (Gradual: only floor 50+)
      if (floor >= 50 && floor % 10 === 0) {
        const wall = Math.random() > 0.5 ? 'LEFT' : 'RIGHT';
        newTurrets.push({
          id: `turret_${floor}`,
          wall,
          x: wall === 'LEFT' ? 0 : arenaWidth - 22,
          y: curY + 14,
          cooldown: 90 + Math.floor(Math.random() * 50),
          aimAngle: wall === 'LEFT' ? 0 : 180,
          isAiming: false,
          targetX: 0,
          targetY: 0,
        });
      }

      // Scanning Security Lasers: Sweeping deadly beams (Gradual: only floor 55+)
      if (floor >= 55 && floor % 12 === 3) {
        const laserType = Math.random() > 0.5 ? 'SWEEP' : 'BARRIER';
        const wall = Math.random() > 0.5 ? 'LEFT' : 'RIGHT';
        newLasers.push({
          id: `scan_laser_${floor}`,
          y: curY + 34,
          type: laserType,
          wall,
          phase: Math.floor(Math.random() * 160),
          period: 160,
          state: 'COOLDOWN',
          sweepAngle: 0,
        });
      }

      // Red Enemy Sentry Box: Only floor 65+
      if (floor >= 65 && type === 'NORMAL' && Math.random() < 0.20) {
        newBombs.push({
          id: `bomb_${idx}`,
          platId,
          x: platX + platW * 0.5 - 10,
          y: curY - 20,
          w: 20,
          h: 20,
          platMinX: platX + 4,
          platMaxX: Math.max(platX + 4, platX + platW - 24),
          patrolDir: Math.random() > 0.5 ? 1 : -1,
          state: 'IDLE',
          alertTimer: 0,
          speed: 0.65 + Math.min(0.35, floor / 100),
          fuse: 100,
          color: '#FF0055',
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
    if (newLasers.length > 0) {
      scanLasersRef.current = [...scanLasersRef.current, ...newLasers];
      setScanLasers(scanLasersRef.current);
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

    // Base safe starting floor
    const basePlat = {
      id: 'plat_0',
      x: 0,
      y: arenaHeight - 38,
      w: arenaWidth,
      type: 'NORMAL',
      floor: 0,
      broken: false,
      crumbleTimer: 0,
      heatTimer: 0,
      maxHeat: 60,
      vx: 0,
    };

    platformsRef.current = [basePlat];
    sentryBombsRef.current = [];
    turretsRef.current = [];
    scanLasersRef.current = [];
    projectilesRef.current = [];
    explosionsRef.current = [];

    setPlatforms([basePlat]);
    setSentryBombs([]);
    setTurrets([]);
    setScanLasers([]);
    setProjectiles([]);
    setExplosions([]);
    setIsPlaying(false);
    setModalVisible(false);

    shieldsRef.current = 1;
    setShields(1);
    invulnerableUntilRef.current = 0;

    setFrameData({
      playerX: startPlayer.x,
      playerY: startPlayer.y,
      cameraY: 0,
      score: 0,
      floorsClimbed: 0,
      laserFloorY: arenaHeight + 80,
      isGrounded: true,
      vy: 0,
      projectiles: [],
      explosions: [],
      turrets: [],
    });

    // Spawn runway of platforms up ahead
    spawnAhead(arenaHeight - 1600);
  }, [arenaWidth, arenaHeight, spawnAhead]);

  useEffect(() => {
    initTower();
  }, [initTower]);

  // Jump execution with GROUNDING (No mid-air infinite jumps)
  const executeJump = useCallback((direction = 'CENTER', isHigh = false) => {
    if (isPausedRef.current) return;
    const p = playerRef.current;

    if (!p.isGrounded) {
      // In mid-air: allow subtle air drift steering
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

      // 1. Update Laser Floor (rises continuously, gentle start on early floors)
      const currentHighest = highestFloorRef.current;
      const laserSpeed = currentHighest < 15 ? 0.28 : currentHighest < 35 ? 0.44 : 0.62 + Math.min(0.8, currentHighest / 80);
      laserFloorYRef.current -= laserSpeed;

      // Shield Absorption Helper
      const absorbHitWithShield = () => {
        if (Date.now() < invulnerableUntilRef.current) return true;
        if (shieldsRef.current > 0) {
          shieldsRef.current -= 1;
          setShields(shieldsRef.current);
          invulnerableUntilRef.current = Date.now() + 1800;
          triggerMediumHaptic();
          playSliceSound();
          p.vy = -12.5;
          return true;
        }
        return false;
      };

      // 2. Update Moving & Crumbling Platforms
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

      // 3. LAVA PLATFORM DELAYED KILL (Allowed to jump on, kills after 1 second if not jumped off!)
      const curStandingPlat = plats.find((pl) => pl.id === p.currentPlatId);
      if (p.isGrounded && curStandingPlat && curStandingPlat.type === 'FIRE') {
        curStandingPlat.heatTimer = (curStandingPlat.heatTimer || 0) + 1;

        // Pulsing warning sizzle haptic every 15 frames
        if (curStandingPlat.heatTimer % 15 === 0) {
          triggerLightHaptic();
          playSliceSound();
        }

        // If player stayed on lava platform for 90 frames (1.5 seconds grace): MELTED!
        if (curStandingPlat.heatTimer >= curStandingPlat.maxHeat) {
          if (absorbHitWithShield()) {
            curStandingPlat.heatTimer = 0;
            p.isGrounded = false;
            p.currentPlatId = null;
          } else {
            handleGameOver('MELTED BY LAVA PLATFORM!');
            return;
          }
        }
      } else {
        // Gradually cool down fire platforms when player jumps off
        for (const pl of plats) {
          if (pl.type === 'FIRE' && pl.heatTimer > 0) {
            pl.heatTimer = Math.max(0, pl.heatTimer - 2);
          }
        }
      }

      // 4. Update Red Sentry Bombs (Slowed bot enemies with telegraph alert and bounded platforms)
      const bombs = sentryBombsRef.current;
      for (const bomb of bombs) {
        if (bomb.state === 'EXPLODED') continue;

        if (bomb.state === 'IDLE') {
          // Slow pacing patrol along the platform so the player can see its timing
          bomb.x += (bomb.patrolDir || 1) * 0.45;
          if (bomb.platMinX !== undefined && bomb.x <= bomb.platMinX) {
            bomb.x = bomb.platMinX;
            bomb.patrolDir = 1;
          } else if (bomb.platMaxX !== undefined && bomb.x >= bomb.platMaxX) {
            bomb.x = bomb.platMaxX;
            bomb.patrolDir = -1;
          }

          // Trigger warning telegraph when player lands on this platform
          if (p.isGrounded && p.currentPlatId === bomb.platId) {
            bomb.state = 'ALERT';
            bomb.alertTimer = 22; // ~0.36s warning window to give player time to leap to next platform
            triggerLightHaptic();
          }
        } else if (bomb.state === 'ALERT') {
          bomb.alertTimer = (bomb.alertTimer || 22) - 1;
          if (bomb.alertTimer <= 0) {
            bomb.state = 'RUSH';
          }
        } else if (bomb.state === 'RUSH') {
          const targetX = p.x;
          const diff = targetX - bomb.x;
          if (Math.abs(diff) > 2) {
            bomb.x += Math.sign(diff) * bomb.speed;
            if (bomb.platMinX !== undefined && bomb.platMaxX !== undefined) {
              bomb.x = Math.max(bomb.platMinX, Math.min(bomb.platMaxX, bomb.x));
            }
          }

          bomb.fuse -= 1;
          const distToPlayer = Math.hypot((bomb.x + 10) - (p.x + PLAYER_SIZE / 2), (bomb.y + 10) - (p.y + PLAYER_SIZE / 2));
          if (bomb.fuse <= 0 || distToPlayer < 18) {
            bomb.state = 'EXPLODED';
            explosionsRef.current.push({
              id: `exp_${Date.now()}_${Math.random()}`,
              x: bomb.x + 10,
              y: bomb.y + 10,
              r: 10,
              maxR: 36,
              opacity: 1,
            });
            triggerMediumHaptic();
            playSliceSound();

            if (distToPlayer < 30) {
              if (!absorbHitWithShield()) {
                handleGameOver('BLASTED BY SENTRY BOMB!');
                return;
              }
            }
          }
        }
      }

      // 5. DEFENSE TURRETS: ROTATE, AIM, AND SHOOT TOWARDS PLAYER!
      const turretsList = turretsRef.current;
      const pMidX = p.x + PLAYER_SIZE / 2;
      const pMidY = p.y + PLAYER_SIZE / 2;

      for (const turret of turretsList) {
        turret.cooldown -= 1;

        const muzzleX = turret.wall === 'LEFT' ? turret.x + 22 : turret.x;
        const muzzleY = turret.y + 8;
        const dx = pMidX - muzzleX;
        const dy = pMidY - muzzleY;
        const distToPlayer = Math.hypot(dx, dy) || 1;

        // Turret rotates towards player's position
        turret.aimAngle = Math.atan2(dy, dx) * (180 / Math.PI);

        // Aiming tracking when in vertical range (< 420px)
        if (Math.abs(dy) < 420) {
          if (turret.cooldown <= 40 && turret.cooldown > 0) {
            turret.isAiming = true;
            turret.chargeRatio = (40 - turret.cooldown) / 40;
            turret.targetX = pMidX;
            turret.targetY = pMidY;
          } else if (turret.cooldown <= 0) {
            turret.isAiming = false;
            turret.chargeRatio = 0;
            turret.cooldown = 110 + Math.floor(Math.random() * 45);

            // Shoot glowing ballistic plasma projectile directly towards player!
            const projSpeed = 4.4; // Clearly visible, dodgeable ballistic plasma shot
            projectilesRef.current.push({
              id: `proj_${Date.now()}_${Math.random()}`,
              x: muzzleX - 7,
              y: muzzleY - 7,
              vx: (dx / distToPlayer) * projSpeed,
              vy: (dy / distToPlayer) * projSpeed,
              w: 14,
              h: 14,
            });
            playTapSound();
          }
        } else {
          turret.isAiming = false;
          turret.chargeRatio = 0;
        }
      }

      // 6. UPDATE SCANNING SECURITY LASERS (Sweeping deadly beams)
      const lasers = scanLasersRef.current;
      for (const laser of lasers) {
        const cycle = (laser.phase + tickCountRef.current) % laser.period;

        if (cycle < 65) {
          laser.state = 'COOLDOWN';
        } else if (cycle < 105) {
          laser.state = 'TELEGRAPH';
        } else {
          laser.state = 'ACTIVE';
        }

        // Sweeping angle calculation
        if (laser.type === 'SWEEP') {
          const tProgress = (cycle % 70) / 70;
          laser.sweepAngle = Math.sin(tProgress * 2 * Math.PI) * 26;
        }

        // Check laser collision with player during ACTIVE state
        if (laser.state === 'ACTIVE') {
          if (laser.type === 'BARRIER') {
            // Horizontal barrier across spire
            if (p.y + PLAYER_SIZE > laser.y - 4 && p.y < laser.y + 4) {
              if (!absorbHitWithShield()) {
                handleGameOver('VAPORIZED BY SCANNING LASER!');
                return;
              }
            }
          } else if (laser.type === 'SWEEP') {
            // Angled sweep beam from wall emitter
            const emitterX = laser.wall === 'LEFT' ? 4 : arenaWidth - 4;
            const rad = (laser.sweepAngle * Math.PI) / 180;
            const targetX = laser.wall === 'LEFT' ? arenaWidth : 0;
            const targetY = laser.y + Math.tan(rad) * arenaWidth;

            // Distance from player center to line segment (emitter -> target)
            const ldx = targetX - emitterX;
            const ldy = targetY - laser.y;
            const lineLen = Math.hypot(ldx, ldy) || 1;
            const u = Math.max(0, Math.min(1, ((pMidX - emitterX) * ldx + (pMidY - laser.y) * ldy) / (lineLen * lineLen)));
            const closestX = emitterX + u * ldx;
            const closestY = laser.y + u * ldy;
            const distToBeam = Math.hypot(pMidX - closestX, pMidY - closestY);

            if (distToBeam < 15) {
              if (!absorbHitWithShield()) {
                handleGameOver('VAPORIZED BY SCANNING LASER!');
                return;
              }
            }
          }
        }
      }

      // 7. Update Projectiles & Player Collision
      const projs = projectilesRef.current;
      for (let i = projs.length - 1; i >= 0; i--) {
        const pr = projs[i];
        pr.x += pr.vx;
        pr.y += pr.vy;

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
          explosionsRef.current.push({
            id: `exp_${Date.now()}_${Math.random()}`,
            x: pr.x + pr.w / 2,
            y: pr.y + pr.h / 2,
            r: 10,
            opacity: 1,
            color: '#00F5FF',
          });
          projs.splice(i, 1);
          if (!absorbHitWithShield()) {
            handleGameOver('VAPORIZED BY TURRET PLASMA!');
            return;
          }
          continue;
        }

        if (pr.x < -40 || pr.x > arenaWidth + 40 || pr.y < -camY - 100 || pr.y > -camY + arenaHeight + 100) {
          projs.splice(i, 1);
        }
      }

      // 8. Update Explosions
      const exps = explosionsRef.current;
      for (let i = exps.length - 1; i >= 0; i--) {
        const exp = exps[i];
        exp.r += 2.8;
        exp.opacity -= 0.055;
        if (exp.opacity <= 0) {
          exps.splice(i, 1);
        }
      }

      // 9. Player Physics & Gravity
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

      // 10. Check collision with deadly Spike Platforms
      for (const plat of plats) {
        if (plat.type === 'SPIKE') {
          const spikeTop = plat.y - 8;
          const spikeBottom = plat.y + 5;
          if (
            nextX + PLAYER_SIZE - 4 > plat.x &&
            nextX + 4 < plat.x + plat.w &&
            nextY + PLAYER_SIZE > spikeTop &&
            nextY < spikeBottom
          ) {
            if (!absorbHitWithShield()) {
              handleGameOver('IMPALED BY PLATFORM SPIKES!');
              triggerGameOverHaptic();
              playGameOverSound();
              return;
            }
          }
        }
      }

      // 11. Platform Landing Collision Detection (Only while moving downward: vy > 0)
      if (vy > 0) {
        for (const plat of plats) {
          if (plat.broken) continue;

          if (
            p.y + PLAYER_SIZE <= plat.y + 6 &&
            nextY + PLAYER_SIZE >= plat.y &&
            nextX + PLAYER_SIZE - 4 > plat.x &&
            nextX + 4 < plat.x + plat.w
          ) {
            // SPIKE PLATFORM: LETHAL ON IMPACT!
            if (plat.type === 'SPIKE') {
              if (!absorbHitWithShield()) {
                handleGameOver('IMPALED BY PLATFORM SPIKES!');
                triggerGameOverHaptic();
                playGameOverSound();
                return;
              }
            } else if (plat.type === 'FIRE') {
              // LAVA PLATFORM: SAFE LANDING ALLOWED, STARTS TIMER
              nextY = plat.y - PLAYER_SIZE;
              vy = 0;
              p.isGrounded = true;
              p.currentPlatId = plat.id;
              plat.heatTimer = plat.heatTimer || 0;
              playTapSound();
              triggerMediumHaptic();
            } else if (plat.type === 'BOUNCE') {
              // BOUNCE / SPRING PAD
              nextY = plat.y - PLAYER_SIZE;
              vy = -16.5;
              p.isGrounded = false;
              p.currentPlatId = null;
              playSliceSound();
              triggerMediumHaptic();
            } else {
              // Solid Normal, Moving, or Crumble Platform
              nextY = plat.y - PLAYER_SIZE;
              vy = 0;
              p.isGrounded = true;
              p.currentPlatId = plat.id;
              playTapSound();

              // Powerup pickups on platform!
              if (plat.powerup === 'SHIELD') {
                plat.powerup = null;
                shieldsRef.current = Math.min(3, shieldsRef.current + 1);
                setShields(shieldsRef.current);
                triggerMediumHaptic();
                playSliceSound();
              } else if (plat.powerup === 'SPRING') {
                plat.powerup = null;
                vy = -20.5;
                p.isGrounded = false;
                p.currentPlatId = null;
                triggerMediumHaptic();
                playSliceSound();
              }

              if (plat.type === 'CRUMBLE' && plat.crumbleTimer === 0) {
                plat.crumbleTimer = 22;
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

      // 11. Camera Upward Tracking
      const targetCam = Math.max(0, arenaHeight * 0.55 - nextY);
      if (targetCam > camY) {
        camY += (targetCam - camY) * 0.14;
        cameraYRef.current = camY;
      }

      // 12. Dynamically Spawn Ahead
      if (highestGenYRef.current > -camY - 700) {
        spawnAhead(-camY - 1500);
      }

      // 13. Cull objects far below camera every 90 frames
      if (tickCountRef.current % 90 === 0) {
        const cullThreshold = -camY + arenaHeight + 150;
        platformsRef.current = platformsRef.current.filter((pl) => pl.y < cullThreshold);
        sentryBombsRef.current = sentryBombsRef.current.filter((b) => b.y < cullThreshold);
        turretsRef.current = turretsRef.current.filter((t) => t.y < cullThreshold);
        scanLasersRef.current = scanLasersRef.current.filter((l) => l.y < cullThreshold);
        setPlatforms(platformsRef.current);
        setSentryBombs(sentryBombsRef.current);
        setTurrets(turretsRef.current);
        setScanLasers(scanLasersRef.current);
      }

      // 14. Check Fall into Abyss or Laser Overload Floor
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
        vy,
        projectiles: [...projectilesRef.current],
        explosions: [...explosionsRef.current],
        turrets: [...turretsRef.current],
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
    }

    setModalVisible(true);
  };

  const handleRetry = () => {
    initTower();
  };

  const {
    playerX,
    playerY,
    cameraY,
    score,
    floorsClimbed,
    laserFloorY,
    isGrounded,
    projectiles: frameProjectiles = [],
    explosions: frameExplosions = [],
    turrets: frameTurrets = [],
  } = frameData;

  // Filter visible elements
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

  const activeTurretList = frameTurrets.length > 0 ? frameTurrets : turrets;
  const visibleTurrets = activeTurretList.filter((t) => {
    const dy = t.y + cameraY;
    return dy > -40 && dy < arenaHeight + 40;
  });

  const activeProjectiles = frameProjectiles.length > 0 ? frameProjectiles : projectiles;
  const activeExplosions = frameExplosions.length > 0 ? frameExplosions : explosions;

  const visibleLasers = scanLasers.filter((l) => {
    const dy = l.y + cameraY;
    return dy > -60 && dy < arenaHeight + 60;
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
            {isGrounded ? '⚡ READY' : '✈ IN-FLIGHT'}
          </Text>
          <Text style={[styles.hudStatusText, { color: shields > 0 ? '#00F5FF' : '#718096', fontSize: 9.5, marginTop: 2 }]}>
            {`🛡️ SHIELD: ${shields}/3`}
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
          </Defs>

          {/* Tower Wall Guideways */}
          <Line x1={2} y1={0} x2={2} y2={arenaHeight} stroke="rgba(0, 245, 255, 0.25)" strokeWidth={3} />
          <Line x1={arenaWidth - 2} y1={0} x2={arenaWidth - 2} y2={arenaHeight} stroke="rgba(0, 245, 255, 0.25)" strokeWidth={3} />

          {/* Platforms translated by cameraY */}
          {visiblePlatforms.map((plat) => {
            const drawY = plat.y + cameraY;

            // 1. SPIKED HAZARD PLATFORM (Lethal to land on!)
            if (plat.type === 'SPIKE') {
              const spikeCount = Math.max(4, Math.floor(plat.w / 14));
              const spikeW = plat.w / spikeCount;
              const spikes = [];
              for (let sIdx = 0; sIdx < spikeCount; sIdx++) {
                const sx = plat.x + sIdx * spikeW;
                spikes.push(
                  <Polygon
                    key={sIdx}
                    points={`${sx},${drawY + 1} ${sx + spikeW / 2},${drawY - 9} ${sx + spikeW},${drawY + 1}`}
                    fill="#FF0055"
                    stroke="#FFE600"
                    strokeWidth={1}
                  />
                );
              }

              return (
                <G key={plat.id}>
                  {/* Danger Crimson Aura */}
                  <Rect
                    x={plat.x - 3}
                    y={drawY - 11}
                    width={plat.w + 6}
                    height={PLAT_HEIGHT + 13}
                    rx={6}
                    fill="rgba(255, 0, 85, 0.22)"
                  />
                  {/* Sharp Metallic Spikes */}
                  {spikes}
                  {/* Platform Base */}
                  <Rect
                    x={plat.x}
                    y={drawY}
                    width={plat.w}
                    height={PLAT_HEIGHT}
                    rx={4}
                    fill="#180516"
                    stroke="#FF0055"
                    strokeWidth={1.5}
                  />
                  {/* Hazard Accent Stripes on Base */}
                  <Line
                    x1={plat.x + 6}
                    y1={drawY + PLAT_HEIGHT / 2}
                    x2={plat.x + plat.w - 6}
                    y2={drawY + PLAT_HEIGHT / 2}
                    stroke="#FFE600"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                  />
                </G>
              );
            }

            // 2. LAVA PLATFORM (Safe to land on, must jump off within 1 second - No black text!)
            if (plat.type === 'FIRE') {
              const isStepped = plat.heatTimer > 0;
              const safeRatio = Math.max(0, (plat.maxHeat - plat.heatTimer) / plat.maxHeat);

              return (
                <G key={plat.id}>
                  {/* Blazing Flame Aura */}
                  <Rect
                    x={plat.x - 3}
                    y={drawY - 5}
                    width={plat.w + 6}
                    height={PLAT_HEIGHT + 10}
                    rx={7}
                    fill={isStepped ? 'rgba(255, 0, 85, 0.45)' : 'rgba(255, 0, 85, 0.2)'}
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

                  {/* Active Molten Heat Timer Gauge Bar (No black text) */}
                  {isStepped && (
                    <Rect
                      x={plat.x}
                      y={drawY - 7}
                      width={plat.w * safeRatio}
                      height={4}
                      rx={2}
                      fill="#FFE600"
                      stroke="#FF0055"
                      strokeWidth={0.8}
                    />
                  )}

                  {/* Glowing Lava Core Seam */}
                  <Line
                    x1={plat.x + 6}
                    y1={drawY + PLAT_HEIGHT / 2}
                    x2={plat.x + plat.w - 6}
                    y2={drawY + PLAT_HEIGHT / 2}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                  />
                </G>
              );
            }

            // 2. MOVING MAG-RAIL PLATFORM
            if (plat.type === 'MOVING') {
              return (
                <G key={plat.id}>
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
                {/* Floating Collectible Powerup Item */}
                {plat.powerup === 'SHIELD' && (
                  <G transform={`translate(${plat.x + plat.w / 2}, ${drawY - 14})`}>
                    <Circle cx={0} cy={0} r={9} fill="rgba(0, 245, 255, 0.25)" stroke="#00F5FF" strokeWidth={1.8} />
                    <SvgText x={0} y={4} fontSize={9} fill="#FFFFFF" fontWeight="900" textAnchor="middle">
                      🛡️
                    </SvgText>
                  </G>
                )}
                {plat.powerup === 'SPRING' && (
                  <G transform={`translate(${plat.x + plat.w / 2}, ${drawY - 14})`}>
                    <Circle cx={0} cy={0} r={9} fill="rgba(255, 230, 0, 0.25)" stroke="#FFE600" strokeWidth={1.8} />
                    <SvgText x={0} y={4} fontSize={9} fill="#FFFFFF" fontWeight="900" textAnchor="middle">
                      ⚡
                    </SvgText>
                  </G>
                )}
              </G>
            );
          })}

          {/* SCANNING SECURITY LASERS (Sweeping or Barrier Beams) */}
          {visibleLasers.map((laser) => {
            const drawY = laser.y + cameraY;
            const isTelegraph = laser.state === 'TELEGRAPH';
            const isActive = laser.state === 'ACTIVE';

            if (laser.state === 'COOLDOWN') {
              // Dim emitters on walls
              return (
                <G key={laser.id}>
                  <Circle cx={4} cy={drawY} r={3} fill="#331A4D" />
                  <Circle cx={arenaWidth - 4} cy={drawY} r={3} fill="#331A4D" />
                </G>
              );
            }

            if (laser.type === 'BARRIER') {
              return (
                <G key={laser.id}>
                  {/* Left & Right Wall Emitters */}
                  <Rect x={0} y={drawY - 6} width={10} height={12} rx={2} fill="#1C0A33" stroke="#FF0055" strokeWidth={1} />
                  <Rect x={arenaWidth - 10} y={drawY - 6} width={10} height={12} rx={2} fill="#1C0A33" stroke="#FF0055" strokeWidth={1} />
                  <Circle cx={5} cy={drawY} r={2.5} fill={isActive ? '#FFE600' : '#FF0055'} />
                  <Circle cx={arenaWidth - 5} cy={drawY} r={2.5} fill={isActive ? '#FFE600' : '#FF0055'} />

                  {/* Laser Beam */}
                  {isTelegraph ? (
                    <Line
                      x1={10}
                      y1={drawY}
                      x2={arenaWidth - 10}
                      y2={drawY}
                      stroke="#FF0055"
                      strokeWidth={1.5}
                      strokeDasharray="6 4"
                      opacity={0.65}
                    />
                  ) : (
                    <G>
                      <Line
                        x1={10}
                        y1={drawY}
                        x2={arenaWidth - 10}
                        y2={drawY}
                        stroke="#FF0055"
                        strokeWidth={6}
                        opacity={0.4}
                      />
                      <Line
                        x1={10}
                        y1={drawY}
                        x2={arenaWidth - 10}
                        y2={drawY}
                        stroke="#00F5FF"
                        strokeWidth={2.5}
                      />
                      <Line
                        x1={10}
                        y1={drawY}
                        x2={arenaWidth - 10}
                        y2={drawY}
                        stroke="#FFFFFF"
                        strokeWidth={1}
                      />
                    </G>
                  )}
                </G>
              );
            }

            if (laser.type === 'SWEEP') {
              const emitterX = laser.wall === 'LEFT' ? 6 : arenaWidth - 6;
              const rad = (laser.sweepAngle * Math.PI) / 180;
              const targetX = laser.wall === 'LEFT' ? arenaWidth - 6 : 6;
              const targetY = drawY + Math.tan(rad) * arenaWidth;

              return (
                <G key={laser.id}>
                  {/* Swiveling Wall Emitter Pylon */}
                  <Circle cx={emitterX} cy={drawY} r={6} fill="#1C0A33" stroke="#FF0055" strokeWidth={1.5} />
                  <Circle cx={emitterX} cy={drawY} r={2.5} fill={isActive ? '#FFE600' : '#FF0055'} />

                  {/* Sweeping Beam */}
                  {isTelegraph ? (
                    <Line
                      x1={emitterX}
                      y1={drawY}
                      x2={targetX}
                      y2={targetY}
                      stroke="#FF0055"
                      strokeWidth={1.5}
                      strokeDasharray="6 4"
                      opacity={0.65}
                    />
                  ) : (
                    <G>
                      <Line
                        x1={emitterX}
                        y1={drawY}
                        x2={targetX}
                        y2={targetY}
                        stroke="#FF0055"
                        strokeWidth={6}
                        opacity={0.4}
                      />
                      <Line
                        x1={emitterX}
                        y1={drawY}
                        x2={targetX}
                        y2={targetY}
                        stroke="#FFE600"
                        strokeWidth={2.5}
                      />
                      <Line
                        x1={emitterX}
                        y1={drawY}
                        x2={targetX}
                        y2={targetY}
                        stroke="#FFFFFF"
                        strokeWidth={1}
                      />
                    </G>
                  )}
                </G>
              );
            }

            return null;
          })}

          {/* RED ENEMY SENTRY BOXES (Kamikaze bomb) */}
          {visibleBombs.map((bomb) => {
            const drawY = bomb.y + cameraY;
            const isRushing = bomb.state === 'RUSH';
            const isAlert = bomb.state === 'ALERT';
            const strobe = (isRushing || isAlert) && tickCountRef.current % 4 < 2;

            return (
              <G key={bomb.id}>
                {/* Warning indicator when alerting */}
                {isAlert && (
                  <SvgText
                    x={bomb.x + bomb.w / 2}
                    y={drawY - 8}
                    fill={strobe ? '#FFE600' : '#FF0055'}
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    !
                  </SvgText>
                )}
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
                <Rect
                  x={bomb.x + 4}
                  y={drawY + 6}
                  width={bomb.w - 8}
                  height={4}
                  fill={isRushing || isAlert ? '#FFE600' : '#050114'}
                />
                {(isRushing || isAlert) && (
                  <>
                    <Line
                      x1={bomb.x + bomb.w / 2}
                      y1={drawY}
                      x2={bomb.x + bomb.w / 2}
                      y2={drawY - 6}
                      stroke="#FFE600"
                      strokeWidth={1.5}
                    />
                    <Circle cx={bomb.x + bomb.w / 2} cy={drawY - 7} r={2} fill={strobe ? '#FFE600' : '#FF0055'} />
                  </>
                )}
              </G>
            );
          })}

          {/* DEFENSE TURRETS (Aiming & Rotating toward player, telegraphing laser, shooting plasma!) */}
          {visibleTurrets.map((turret) => {
            const drawY = turret.y + cameraY;
            const pivotX = turret.wall === 'LEFT' ? turret.x + 10 : turret.x + 12;
            const pivotY = drawY + 8;
            const isAiming = turret.isAiming;

            return (
              <G key={turret.id}>
                {/* Aiming Tracking Sight Line (Faint dashed targeting guide, not a laser weapon) */}
                {isAiming && (
                  <>
                    <Line
                      x1={pivotX}
                      y1={pivotY}
                      x2={turret.targetX}
                      y2={turret.targetY + cameraY}
                      stroke="#FF0055"
                      strokeWidth={1}
                      strokeDasharray="3 6"
                      opacity={0.35}
                    />
                    {/* Charging plasma spark at muzzle before launching projectile */}
                    <Circle
                      cx={turret.wall === 'LEFT' ? turret.x + 22 : turret.x}
                      cy={drawY + 8}
                      r={2 + (turret.chargeRatio || 0) * 4.5}
                      fill="#00F5FF"
                      opacity={0.85}
                    />
                  </>
                )}

                {/* Turret Base Wall Mount */}
                <Rect
                  x={turret.x}
                  y={drawY}
                  width={22}
                  height={16}
                  rx={3}
                  fill="#140A28"
                  stroke="#9D4EDD"
                  strokeWidth={1.5}
                />

                {/* Rotating Turret Swivel Head */}
                <G transform={`rotate(${turret.aimAngle}, ${pivotX}, ${pivotY})`}>
                  {/* Turret Barrel */}
                  <Rect
                    x={pivotX}
                    y={pivotY - 3}
                    width={14}
                    height={6}
                    rx={1.5}
                    fill="#FF0055"
                    stroke="#FFE600"
                    strokeWidth={1}
                  />
                  <Circle cx={pivotX + 13} cy={pivotY} r={2.5} fill="#FFE600" />
                </G>

                {/* Turret Pivot Core Eye */}
                <Circle cx={pivotX} cy={pivotY} r={4.5} fill="#140A28" stroke="#00F5FF" strokeWidth={1.5} />
                <Circle cx={pivotX} cy={pivotY} r={2} fill="#FF0055" />
              </G>
            );
          })}

          {/* ACTIVE PLASMA PROJECTILES (Glowing Ballistic Energy Orbs) */}
          {activeProjectiles.map((pr) => {
            const drawY = pr.y + cameraY;
            const cx = pr.x + pr.w / 2;
            const cy = drawY + pr.h / 2;
            return (
              <G key={pr.id}>
                {/* Outer Plasma Glow Halo */}
                <Circle
                  cx={cx}
                  cy={cy}
                  r={9}
                  fill="#00F5FF"
                  opacity={0.35}
                />
                {/* Plasma Fire Ball */}
                <Circle
                  cx={cx}
                  cy={cy}
                  r={6}
                  fill="#00F5FF"
                  stroke="#FFE600"
                  strokeWidth={1.5}
                />
                {/* White Hot Core */}
                <Circle
                  cx={cx}
                  cy={cy}
                  r={3}
                  fill="#FFFFFF"
                />
              </G>
            );
          })}

          {/* ACTIVE EXPLOSIONS */}
          {activeExplosions.map((exp) => {
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
            {frameData.vy < -2 && (
              <Polygon
                points={`6,${PLAYER_SIZE} ${PLAYER_SIZE / 2},${PLAYER_SIZE + 10} ${PLAYER_SIZE - 6},${PLAYER_SIZE}`}
                fill="#00F5FF"
                opacity={0.85}
              />
            )}
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
            <Rect
              x={4}
              y={6}
              width={PLAYER_SIZE - 8}
              height={5}
              rx={2}
              fill="#FFE600"
            />
            <Circle cx={PLAYER_SIZE / 2} cy={PLAYER_SIZE - 7} r={2.5} fill="#39FF14" />

            {/* Glowing Active Shield Bubble */}
            {shields > 0 && (
              <Circle
                cx={PLAYER_SIZE / 2}
                cy={PLAYER_SIZE / 2}
                r={PLAYER_SIZE * 0.94}
                stroke="#00F5FF"
                strokeWidth={2}
                fill="rgba(0, 245, 255, 0.22)"
                strokeDasharray="5 3"
              />
            )}
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
              <SvgText
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
              </SvgText>
            </G>
          )}
        </Svg>

        {/* Start Game Prompt Overlay */}
        {!isPlaying && (
          <View style={styles.promptOverlay} pointerEvents="none">
            <Text style={styles.promptText}>SWIPE UP TO ASCEND</Text>
            <Text style={styles.promptSub}>
              NO AIR JUMPS • LAVA GRACE: 1s • DODGE TURRETS & SCAN LASERS
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
        subtitle={crashCause}
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
