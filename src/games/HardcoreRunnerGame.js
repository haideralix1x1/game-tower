import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  Platform,
} from 'react-native';
import Svg, { Rect, Polygon, Circle, Line, Defs, LinearGradient, Stop, G, Path } from 'react-native-svg';
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

// Cube and physics parameters
const CUBE_SIZE = 22;
const SPEED = 4.8; // Tuned faster for snappy, thrilling gameplay
const GRAVITY = 0.50;
const JUMP_VELOCITY = -7.8;
// Extra narrow corridor
const CORRIDOR_HEIGHT = 105;

/**
 * Procedural track elevation profile with ramps up, plateaus, and ramps down
 */
function getTrackElevation(worldX) {
  // Cycle length of 1600px
  const cycle = ((worldX % 1600) + 1600) % 1600;

  if (cycle < 300) {
    // Base flat level
    return 0;
  } else if (cycle < 520) {
    // Ramp UP (rises by 46px over 220px)
    const t = (cycle - 300) / 220;
    return 46 * (0.5 - 0.5 * Math.cos(t * Math.PI));
  } else if (cycle < 850) {
    // Elevated Plateau
    return 46;
  } else if (cycle < 1070) {
    // Ramp DOWN (descends 46px back to baseline)
    const t = (cycle - 850) / 220;
    return 46 * (0.5 + 0.5 * Math.cos(t * Math.PI));
  } else if (cycle < 1250) {
    // Gentle Dip (-28px)
    const t = (cycle - 1070) / 180;
    return -28 * (0.5 - 0.5 * Math.cos(t * Math.PI));
  } else if (cycle < 1430) {
    // Ramp back up from dip
    const t = (cycle - 1250) / 180;
    return -28 * (0.5 + 0.5 * Math.cos(t * Math.PI));
  } else {
    return 0;
  }
}

function getTrackSlope(worldX) {
  const delta = 5;
  return (getTrackElevation(worldX + delta) - getTrackElevation(worldX - delta)) / (2 * delta);
}

export default function HardcoreRunnerGame({ onBackToHub, onScoreUpdate }) {
  const { width, height } = useWindowDimensions();
  const arenaWidth = width;
  const arenaHeight = height - 130;

  // Middle center line of screen
  const baseCenterY = arenaHeight * 0.5;
  const baseFloorY = baseCenterY + CORRIDOR_HEIGHT / 2;

  const [score, setScore] = useState(0);
  const [attempt, setAttempt] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progressPct, setProgressPct] = useState(0);

  // Player physics
  const playerScreenX = 75;
  const [playerY, setPlayerY] = useState(baseFloorY - CUBE_SIZE);
  const [playerVy, setPlayerVy] = useState(0);
  const [rotation, setRotation] = useState(0);

  // Level obstacles
  const [distance, setDistance] = useState(0);
  const [obstacles, setObstacles] = useState([]);

  // Result modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('gameover');

  const playerYRef = useRef(playerY);
  playerYRef.current = playerY;
  const playerVyRef = useRef(playerVy);
  playerVyRef.current = playerVy;
  const distanceRef = useRef(distance);
  distanceRef.current = distance;
  const rotationRef = useRef(rotation);
  rotationRef.current = rotation;

  const animFrameRef = useRef(null);

  // Level obstacle track generation
  const LEVEL_LENGTH = 6400;
  const initLevel = useCallback(() => {
    const initFloorY = baseFloorY - getTrackElevation(playerScreenX);
    setPlayerY(initFloorY - CUBE_SIZE);
    setPlayerVy(0);
    setRotation(0);
    setDistance(0);
    setProgressPct(0);
    setIsPlaying(false);
    setModalVisible(false);

    playerYRef.current = initFloorY - CUBE_SIZE;
    playerVyRef.current = 0;
    distanceRef.current = 0;
    rotationRef.current = 0;

    // Build obstacle sequence across flats, ramps, and plateaus
    const obs = [];
    let curX = 420;

    while (curX < LEVEL_LENGTH) {
      const pick = Math.floor(Math.random() * 5);

      if (pick === 0) {
        // Floor Spike (bottom ramp)
        obs.push({
          id: `sp_f_${curX}`,
          type: 'SPIKE_BOTTOM',
          x: curX,
          w: 22,
          h: 22,
        });
        curX += 280 + Math.random() * 80;
      } else if (pick === 1) {
        // Double Floor Spike
        obs.push({
          id: `sp_f1_${curX}`,
          type: 'SPIKE_BOTTOM',
          x: curX,
          w: 20,
          h: 22,
        });
        obs.push({
          id: `sp_f2_${curX}`,
          type: 'SPIKE_BOTTOM',
          x: curX + 20,
          w: 20,
          h: 22,
        });
        curX += 340 + Math.random() * 100;
      } else if (pick === 2) {
        // Ceiling Spike (points down from top wall)
        obs.push({
          id: `sp_c_${curX}`,
          type: 'SPIKE_TOP',
          x: curX,
          w: 22,
          h: 22,
        });
        curX += 300 + Math.random() * 90;
      } else if (pick === 3) {
        // Low Hurdle Block on ramp floor
        obs.push({
          id: `blk_f_${curX}`,
          type: 'BLOCK',
          x: curX,
          w: 24,
          h: 22,
        });
        curX += 320 + Math.random() * 110;
      } else {
        // High Hurdle Block hanging from ceiling
        obs.push({
          id: `blk_c_${curX}`,
          type: 'BLOCK_TOP',
          x: curX,
          w: 24,
          h: 22,
        });
        curX += 320 + Math.random() * 110;
      }
    }

    setObstacles(obs);
  }, [baseFloorY, playerScreenX]);

  useEffect(() => {
    initLevel();
  }, [initLevel]);

  // Jump trigger
  const handleJump = () => {
    if (!isPlaying) {
      setIsPlaying(true);
    }

    const curDist = distanceRef.current;
    const curPlayerX = curDist + playerScreenX;
    const curElevation = getTrackElevation(curPlayerX);
    const curFloorY = baseFloorY - curElevation;
    const groundY = curFloorY - CUBE_SIZE;

    // Check if grounded on ramp floor
    const isGrounded = playerYRef.current >= groundY - 3;

    if (isGrounded) {
      playerVyRef.current = JUMP_VELOCITY;
      setPlayerVy(JUMP_VELOCITY);
      playTapSound();
      triggerLightHaptic();
    }
  };

  // Main 60 FPS Physics Loop
  useEffect(() => {
    if (!isPlaying) return;

    let active = true;

    const tick = () => {
      if (!active) return;

      const nextDist = distanceRef.current + SPEED;
      distanceRef.current = nextDist;
      setDistance(nextDist);

      const pct = Math.min(100, Math.floor((nextDist / LEVEL_LENGTH) * 100));
      setProgressPct(pct);

      // Current track elevations under player
      const curPlayerX = nextDist + playerScreenX;
      const curElevation = getTrackElevation(curPlayerX);
      const curSlope = getTrackSlope(curPlayerX);

      const curFloorY = baseFloorY - curElevation;
      const curCeilingY = curFloorY - CORRIDOR_HEIGHT;
      const groundY = curFloorY - CUBE_SIZE;

      // Vertical movement & gravity
      let nextVy = playerVyRef.current + GRAVITY;
      let nextY = playerYRef.current + nextVy;

      let isGrounded = false;
      if (nextY >= groundY) {
        nextY = groundY;
        nextVy = 0;
        isGrounded = true;
      } else if (nextY <= curCeilingY) {
        // Hit narrow ceiling
        nextY = curCeilingY;
        nextVy = 0;
      }

      playerVyRef.current = nextVy;
      playerYRef.current = nextY;
      setPlayerY(nextY);
      setPlayerVy(nextVy);

      // Rotation: if on ramp, tilt with ramp slope; if in air, tumble
      if (isGrounded) {
        const rampAngle = (Math.atan2(-curSlope, 1) * 180) / Math.PI;
        rotationRef.current = rampAngle;
        setRotation(rampAngle);
      } else {
        const nextRot = (rotationRef.current + 7.5) % 360;
        rotationRef.current = nextRot;
        setRotation(nextRot);
      }

      // Check level completion
      if (nextDist >= LEVEL_LENGTH) {
        handleWin();
        return;
      }

      // Player hitbox
      const pHit = {
        left: playerScreenX + 3,
        right: playerScreenX + CUBE_SIZE - 3,
        top: nextY + 3,
        bottom: nextY + CUBE_SIZE - 3,
      };

      // Obstacle collision check along ramped tunnel
      for (const obs of obstacles) {
        const obsScreenX = obs.x - nextDist + playerScreenX;
        if (obsScreenX < -40 || obsScreenX > arenaWidth + 40) continue;

        const obsElevation = getTrackElevation(obs.x);
        const obsFloorY = baseFloorY - obsElevation;
        const obsCeilingY = obsFloorY - CORRIDOR_HEIGHT;

        if (obs.type === 'SPIKE_BOTTOM') {
          // Bottom spike on ramp floor
          if (
            pHit.right > obsScreenX + 4 &&
            pHit.left < obsScreenX + obs.w - 4 &&
            pHit.bottom > obsFloorY - obs.h + 5 &&
            pHit.top < obsFloorY
          ) {
            handleCrash();
            return;
          }
        } else if (obs.type === 'SPIKE_TOP') {
          // Top spike on ramp ceiling
          if (
            pHit.right > obsScreenX + 4 &&
            pHit.left < obsScreenX + obs.w - 4 &&
            pHit.top < obsCeilingY + obs.h - 5 &&
            pHit.bottom > obsCeilingY
          ) {
            handleCrash();
            return;
          }
        } else if (obs.type === 'BLOCK') {
          // Block hurdle on floor
          if (
            pHit.right > obsScreenX + 3 &&
            pHit.left < obsScreenX + obs.w - 3 &&
            pHit.bottom > obsFloorY - obs.h + 3 &&
            pHit.top < obsFloorY
          ) {
            handleCrash();
            return;
          }
        } else if (obs.type === 'BLOCK_TOP') {
          // Block hurdle from ceiling
          if (
            pHit.right > obsScreenX + 3 &&
            pHit.left < obsScreenX + obs.w - 3 &&
            pHit.top < obsCeilingY + obs.h - 3 &&
            pHit.bottom > obsCeilingY
          ) {
            handleCrash();
            return;
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, arenaWidth, baseFloorY, obstacles]);

  const handleCrash = () => {
    setIsPlaying(false);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    playGameOverSound();
    triggerGameOverHaptic();
    setAttempt((a) => a + 1);
    setModalType('gameover');
    setModalVisible(true);
  };

  const handleWin = () => {
    setIsPlaying(false);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    const winPoints = 500;
    const nextScore = score + winPoints;
    setScore(nextScore);
    onScoreUpdate?.(nextScore);
    JuiceEngine.celebrate(width / 2, height / 2);
    setModalType('win');
    setModalVisible(true);
  };

  const handleRetry = () => {
    initLevel();
  };

  // Generate SVG Ramped Tunnel Polyline Data across visible screen
  const step = 16;
  const numSteps = Math.ceil((arenaWidth + 40) / step) + 2;
  const samplePoints = [];
  for (let i = 0; i < numSteps; i++) {
    const sX = -20 + i * step;
    const worldX = distance + sX;
    const elev = getTrackElevation(worldX);
    const fY = baseFloorY - elev;
    const cY = fY - CORRIDOR_HEIGHT;
    samplePoints.push({ sX, fY, cY });
  }

  // Top Wall SVG Path (From y=0 down to ceiling curve)
  let topWallPath = `M -20 0 L ${arenaWidth + 40} 0 L ${arenaWidth + 40} ${samplePoints[samplePoints.length - 1].cY}`;
  for (let i = samplePoints.length - 1; i >= 0; i--) {
    topWallPath += ` L ${samplePoints[i].sX} ${samplePoints[i].cY}`;
  }
  topWallPath += ' Z';

  // Bottom Wall SVG Path (From floor curve down to arenaHeight)
  let botWallPath = `M ${samplePoints[0].sX} ${samplePoints[0].fY}`;
  for (let i = 1; i < samplePoints.length; i++) {
    botWallPath += ` L ${samplePoints[i].sX} ${samplePoints[i].fY}`;
  }
  botWallPath += ` L ${arenaWidth + 40} ${arenaHeight} L -20 ${arenaHeight} Z`;

  // Neon Guideway Lines
  let ceilingLinePath = `M ${samplePoints[0].sX} ${samplePoints[0].cY}`;
  let floorLinePath = `M ${samplePoints[0].sX} ${samplePoints[0].fY}`;
  for (let i = 1; i < samplePoints.length; i++) {
    ceilingLinePath += ` L ${samplePoints[i].sX} ${samplePoints[i].cY}`;
    floorLinePath += ` L ${samplePoints[i].sX} ${samplePoints[i].fY}`;
  }

  return (
    <View style={styles.container}>
      <MiniGameHeader
        floorNum={26}
        gameTitle="CYBER CUBE DASH"
        category="HARDCORE RUNNER"
        accentColor="#FFE600"
        score={score}
        onBack={onBackToHub}
        onBackToHub={onBackToHub}
      />

      {/* Top HUD: Progress & Attempts */}
      <View style={styles.topHud}>
        <Text style={styles.hudAttempt}>ATTEMPT {attempt}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>
        <Text style={styles.hudPct}>{progressPct}%</Text>
      </View>

      {/* Main Touch Arena with Ramped Up/Down Narrow Corridor */}
      <Pressable style={styles.arena} onPress={handleJump}>
        <Svg width={arenaWidth} height={arenaHeight} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="cubeGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#FFE600" stopOpacity="1" />
              <Stop offset="100%" stopColor="#FF6D00" stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id="spikeGradUp" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FF0055" stopOpacity="1" />
              <Stop offset="100%" stopColor="#7928CA" stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id="spikeGradDown" x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0%" stopColor="#FF0055" stopOpacity="1" />
              <Stop offset="100%" stopColor="#7928CA" stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id="topWallGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#080418" stopOpacity="0.96" />
              <Stop offset="100%" stopColor="#140A30" stopOpacity="0.96" />
            </LinearGradient>
            <LinearGradient id="bottomWallGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#140A30" stopOpacity="0.96" />
              <Stop offset="100%" stopColor="#080418" stopOpacity="0.96" />
            </LinearGradient>
          </Defs>

          {/* TOP SOLID WALL (Curves over ramps) */}
          <Path d={topWallPath} fill="url(#topWallGrad)" />
          {/* Top Wall Neon Guideway Border */}
          <Path
            d={ceilingLinePath}
            stroke="#9D4EDD"
            strokeWidth={3}
            fill="none"
          />

          {/* BOTTOM SOLID WALL (Curves under ramps) */}
          <Path d={botWallPath} fill="url(#bottomWallGrad)" />
          {/* Bottom Wall Neon Guideway Border */}
          <Path
            d={floorLinePath}
            stroke="#00F5FF"
            strokeWidth={3}
            fill="none"
          />

          {/* Obstacles riding along ramp elevations */}
          {obstacles.map((obs) => {
            const screenX = obs.x - distance + playerScreenX;
            if (screenX < -40 || screenX > arenaWidth + 40) return null;

            const obsElev = getTrackElevation(obs.x);
            const obsSlope = getTrackSlope(obs.x);
            const obsAngle = (Math.atan2(-obsSlope, 1) * 180) / Math.PI;

            const obsFloorY = baseFloorY - obsElev;
            const obsCeilY = obsFloorY - CORRIDOR_HEIGHT;
            const centerX = screenX + obs.w / 2;

            if (obs.type === 'SPIKE_BOTTOM') {
              return (
                <G
                  key={obs.id}
                  transform={`rotate(${obsAngle}, ${centerX}, ${obsFloorY})`}
                >
                  <Polygon
                    points={`${screenX},${obsFloorY} ${centerX},${obsFloorY - obs.h} ${screenX + obs.w},${obsFloorY}`}
                    fill="url(#spikeGradUp)"
                    stroke="#FF0055"
                    strokeWidth={1.5}
                  />
                </G>
              );
            }

            if (obs.type === 'SPIKE_TOP') {
              return (
                <G
                  key={obs.id}
                  transform={`rotate(${obsAngle}, ${centerX}, ${obsCeilY})`}
                >
                  <Polygon
                    points={`${screenX},${obsCeilY} ${centerX},${obsCeilY + obs.h} ${screenX + obs.w},${obsCeilY}`}
                    fill="url(#spikeGradDown)"
                    stroke="#FF0055"
                    strokeWidth={1.5}
                  />
                </G>
              );
            }

            if (obs.type === 'BLOCK') {
              return (
                <G
                  key={obs.id}
                  transform={`rotate(${obsAngle}, ${centerX}, ${obsFloorY})`}
                >
                  <Rect
                    x={screenX}
                    y={obsFloorY - obs.h}
                    width={obs.w}
                    height={obs.h}
                    fill="#1A1438"
                    stroke="#00F5FF"
                    strokeWidth={1.5}
                    rx={3}
                  />
                  <Rect
                    x={screenX + 3}
                    y={obsFloorY - obs.h + 3}
                    width={obs.w - 6}
                    height={obs.h - 6}
                    fill="rgba(0, 245, 255, 0.25)"
                    rx={2}
                  />
                </G>
              );
            }

            if (obs.type === 'BLOCK_TOP') {
              return (
                <G
                  key={obs.id}
                  transform={`rotate(${obsAngle}, ${centerX}, ${obsCeilY})`}
                >
                  <Rect
                    x={screenX}
                    y={obsCeilY}
                    width={obs.w}
                    height={obs.h}
                    fill="#1A1438"
                    stroke="#FF007F"
                    strokeWidth={1.5}
                    rx={3}
                  />
                  <Rect
                    x={screenX + 3}
                    y={obsCeilY + 3}
                    width={obs.w - 6}
                    height={obs.h - 6}
                    fill="rgba(255, 0, 127, 0.25)"
                    rx={2}
                  />
                </G>
              );
            }

            return null;
          })}

          {/* Player Cyber Cube (Rotates with ramp incline & jumps) */}
          <G
            transform={`rotate(${rotation}, ${playerScreenX + CUBE_SIZE / 2}, ${playerY + CUBE_SIZE / 2})`}
          >
            <Rect
              x={playerScreenX}
              y={playerY}
              width={CUBE_SIZE}
              height={CUBE_SIZE}
              fill="url(#cubeGrad)"
              stroke="#FFFFFF"
              strokeWidth={1.5}
              rx={4}
            />
            {/* Cyber Visor Eye */}
            <Rect
              x={playerScreenX + 4}
              y={playerY + 6}
              width={CUBE_SIZE - 8}
              height={4}
              fill="#00F5FF"
              rx={1}
            />
          </G>
        </Svg>

        {/* Tap to Jump Hint */}
        {!isPlaying && (
          <View style={[styles.tapHintContainer, { top: baseCenterY - 18 }]}>
            <Text style={styles.tapHintText}>TAP ANYWHERE TO JUMP</Text>
          </View>
        )}
      </Pressable>

      <GameResultModal
        visible={modalVisible}
        type={modalType}
        score={progressPct * 10}
        level={attempt}
        onRetry={handleRetry}
        onBackToHub={onBackToHub}
        buttonText={modalType === 'win' ? 'PLAY AGAIN' : 'TRY AGAIN'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#03010B',
  },
  topHud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(10, 6, 26, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 230, 0, 0.2)',
  },
  hudAttempt: {
    fontFamily: monoFont,
    fontSize: 12,
    fontWeight: '900',
    color: '#FFE600',
    letterSpacing: 0.5,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    marginHorizontal: 14,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#39FF14',
    borderRadius: 4,
  },
  hudPct: {
    fontFamily: monoFont,
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    width: 42,
    textAlign: 'right',
  },
  arena: {
    flex: 1,
    position: 'relative',
  },
  tapHintContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  tapHintText: {
    fontFamily: monoFont,
    fontSize: 12,
    fontWeight: '900',
    color: '#FFE600',
    letterSpacing: 1.5,
    backgroundColor: 'rgba(3, 1, 11, 0.88)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 230, 0, 0.4)',
  },
});
