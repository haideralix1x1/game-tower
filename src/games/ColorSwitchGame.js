import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  Platform,
} from 'react-native';
import Svg, { Circle, Path, G } from 'react-native-svg';
import { COLORS } from '../../styles';
import MiniGameHeader from '../components/MiniGameHeader';
import GameResultModal from '../components/GameResultModal';
import { playTapSound, playSliceSound, playGameOverSound } from '../utils/sound';
import { triggerLightHaptic, triggerMediumHaptic, triggerGameOverHaptic } from '../utils/haptics';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const STORAGE_BEST_KEY = '@game_tower:best_switch_v1';

const BALL_RADIUS = 12;
const GRAVITY = 0.26;
const JUMP_FORCE = -3.4;

const SWITCH_COLORS = [
  '#00F5FF', // Cyan
  '#FF007F', // Magenta
  '#FFD166', // Gold
  '#39FF14', // Lime
];

const COLOR_NAMES = {
  '#00F5FF': 'CYAN',
  '#FF007F': 'MAGENTA',
  '#FFD166': 'GOLD',
  '#39FF14': 'LIME',
};

/**
 * Returns the color of the arc segment at local angle theta (0-360)
 * Quadrant 0: 270° to 360° (Top to Right) -> Cyan
 * Quadrant 1: 0° to 90° (Right to Bottom) -> Magenta
 * Quadrant 2: 90° to 180° (Bottom to Left) -> Gold
 * Quadrant 3: 180° to 270° (Left to Top) -> Lime
 */
function getColorAtAngle(theta) {
  const norm = ((theta % 360) + 360) % 360;
  if (norm >= 270) return SWITCH_COLORS[0];
  if (norm < 90) return SWITCH_COLORS[1];
  if (norm < 180) return SWITCH_COLORS[2];
  return SWITCH_COLORS[3];
}

/**
 * Check if the ball's color matches any segment within the contact span
 */
function isColorMatch(localAngle, ballColor) {
  const span = 11; // Angular half-width of the ball
  const centerColor = getColorAtAngle(localAngle);
  const leftColor = getColorAtAngle(localAngle - span);
  const rightColor = getColorAtAngle(localAngle + span);

  return (
    centerColor === ballColor ||
    leftColor === ballColor ||
    rightColor === ballColor
  );
}

export default function ColorSwitchGame({ onBackToHub, onScoreUpdate, isPaused = false }) {
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const { width, height } = useWindowDimensions();
  const arenaWidth = width;
  const arenaHeight = height - 130;

  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_BEST_KEY);
        if (saved !== null) {
          const p = parseInt(saved, 10);
          if (!isNaN(p)) setBestScore(p);
        }
      } catch {}
    })();
  }, []);
  const [ballColor, setBallColor] = useState(SWITCH_COLORS[0]);
  const [colorNotification, setColorNotification] = useState(null);

  // Consolidated 60 FPS Visual Frame State (Only 1 state update per frame to eliminate lag)
  const [frame, setFrame] = useState({
    ballY: arenaHeight * 0.72,
    cameraY: 0,
    tick: 0,
  });

  // Game state
  const [isPlaying, setIsPlaying] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Synchronous physics refs
  const ballYRef = useRef(arenaHeight * 0.72);
  const ballVyRef = useRef(0);
  const cameraYRef = useRef(0);
  const ballColorRef = useRef(ballColor);
  ballColorRef.current = ballColor;
  const scoreRef = useRef(0);

  const pickupsRef = useRef([]);
  const obstaclesRef = useRef([]);
  const animFrameRef = useRef(null);
  const tickRef = useRef(0);

  // Generate obstacle course with clearly colored swapper orbs
  const initGame = useCallback(() => {
    scoreRef.current = 0;
    setScore(0);
    ballYRef.current = arenaHeight * 0.72;
    ballVyRef.current = 0;
    cameraYRef.current = 0;
    tickRef.current = 0;

    const initialColor = SWITCH_COLORS[Math.floor(Math.random() * SWITCH_COLORS.length)];
    setBallColor(initialColor);
    ballColorRef.current = initialColor;
    setColorNotification(null);
    setIsPlaying(false);
    setModalVisible(false);

    setFrame({
      ballY: arenaHeight * 0.72,
      cameraY: 0,
      tick: 0,
    });

    const initialObs = [];
    const initialPickups = [];

    // Create 20 vertical obstacles spaced 290px apart
    let lastColor = initialColor;
    for (let i = 0; i < 20; i++) {
      const obsY = arenaHeight * 0.42 - i * 290;
      initialObs.push({
        id: `obs_${i}`,
        y: obsY,
        radius: 65,
        rotation: 0,
        rotSpeed: (i % 2 === 0 ? 1 : -1) * (1.5 + (i % 3) * 0.35),
      });

      // Star in center of ring
      initialPickups.push({
        id: `star_${i}`,
        type: 'STAR',
        y: obsY,
        color: '#FFD166',
        taken: false,
      });

      // Color swapper orb between obstacles with explicit, distinct target color!
      if (i < 19) {
        const otherColors = SWITCH_COLORS.filter((c) => c !== lastColor);
        const targetColor = otherColors[Math.floor(Math.random() * otherColors.length)];
        lastColor = targetColor;

        initialPickups.push({
          id: `swapper_${i}`,
          type: 'SWAPPER',
          y: obsY - 145,
          color: targetColor,
          colorName: COLOR_NAMES[targetColor] || 'NEW COLOR',
          taken: false,
        });
      }
    }

    obstaclesRef.current = initialObs;
    pickupsRef.current = initialPickups;
  }, [arenaHeight]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  // Tap to jump
  const handleJump = () => {
    if (isPausedRef.current) return;
    if (!isPlaying) {
      setIsPlaying(true);
    }
    ballVyRef.current = JUMP_FORCE;
    playTapSound();
    triggerLightHaptic();
  };

  const handleGameOver = useCallback(() => {
    setIsPlaying(false);
    playGameOverSound();
    triggerGameOverHaptic();
    setBestScore((prev) => Math.max(prev, scoreRef.current));
    setModalVisible(true);
  }, []);

  // Main 60 FPS Physics & Collision Loop
  useEffect(() => {
    if (!isPlaying) return;

    let active = true;

    const tick = () => {
      if (!active) return;
      if (isPausedRef.current) {
        animFrameRef.current = requestAnimationFrame(tick);
        return;
      }
      tickRef.current += 1;

      // Update ball position
      const nextVy = ballVyRef.current + GRAVITY;
      const nextY = ballYRef.current + nextVy;

      ballVyRef.current = nextVy;
      ballYRef.current = nextY;

      // Camera follow
      const targetCamY = Math.max(0, arenaHeight * 0.5 - nextY);
      if (targetCamY > cameraYRef.current) {
        cameraYRef.current = targetCamY;
      }

      // Fall off bottom check
      if (nextY + cameraYRef.current > arenaHeight + 40) {
        handleGameOver();
        return;
      }

      // Rotate obstacles & check ring collisions
      const currentObs = obstaclesRef.current;
      for (let i = 0; i < currentObs.length; i++) {
        const obs = currentObs[i];
        obs.rotation = (obs.rotation + obs.rotSpeed) % 360;

        const distToCenter = Math.abs(nextY - obs.y);
        if (
          distToCenter >= obs.radius - BALL_RADIUS - 2 &&
          distToCenter <= obs.radius + BALL_RADIUS + 2
        ) {
          const worldAngle = nextY > obs.y ? 90 : 270;
          const localAngle = ((worldAngle - obs.rotation) % 360 + 360) % 360;

          if (!isColorMatch(localAngle, ballColorRef.current)) {
            handleGameOver();
            return;
          }
        }
      }

      // Check Pickups synchronously using pickupsRef
      const currentPickups = pickupsRef.current;
      for (let i = 0; i < currentPickups.length; i++) {
        const p = currentPickups[i];
        if (p.taken) continue;

        if (Math.abs(nextY - p.y) < BALL_RADIUS + 14) {
          p.taken = true;

          if (p.type === 'STAR') {
            playSliceSound();
            triggerMediumHaptic();
            scoreRef.current += 1;
            setScore(scoreRef.current);
            onScoreUpdate?.(scoreRef.current);
            AsyncStorage.setItem(STORAGE_BEST_KEY, String(scoreRef.current)).catch(() => {});
          } else if (p.type === 'SWAPPER') {
            playSliceSound();
            triggerMediumHaptic();
            const newC = p.color || SWITCH_COLORS[0];
            setBallColor(newC);
            ballColorRef.current = newC;
            setColorNotification(`COLOR SWAPPED: ${p.colorName}!`);
            setTimeout(() => setColorNotification(null), 1500);
          }
        }
      }

      // Single consolidated frame update (Zero lag)
      setFrame({
        ballY: nextY,
        cameraY: cameraYRef.current,
        tick: tickRef.current,
      });

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [arenaHeight, handleGameOver, isPlaying, onScoreUpdate]);

  const handleRetry = () => {
    initGame();
  };

  const { ballY, cameraY } = frame;
  const centerX = arenaWidth * 0.5;

  // Viewport Culling: Only render obstacles and pickups that are actually inside or near the viewport!
  const visibleObstacles = obstaclesRef.current.filter((obs) => {
    const screenY = obs.y + cameraY;
    return screenY > -140 && screenY < arenaHeight + 140;
  });

  const visiblePickups = pickupsRef.current.filter((p) => {
    if (p.taken) return false;
    const screenY = p.y + cameraY;
    return screenY > -50 && screenY < arenaHeight + 50;
  });

  return (
    <View style={styles.container}>
      <MiniGameHeader
        floorNum={12}
        gameTitle="COLOR SWITCH"
        category="COLOR ARCADE"
        accentColor="#00F5FF"
        score={score}
        onBack={onBackToHub}
        onBackToHub={onBackToHub}
      />

      {/* Top HUD */}
      <View style={styles.topHud}>
        <View style={styles.hudBadge}>
          <Text style={styles.hudLabel}>CURRENT COLOR</Text>
          <View style={styles.colorPill}>
            <View style={[styles.colorDot, { backgroundColor: ballColor }]} />
            <Text style={[styles.colorText, { color: ballColor }]}>
              {COLOR_NAMES[ballColor] || 'COLOR'}
            </Text>
          </View>
        </View>

        <View style={styles.hudBadge}>
          <Text style={styles.hudLabel}>STARS</Text>
          <Text style={styles.scoreVal}>⭐ {score}</Text>
        </View>
      </View>

      {/* Game Canvas */}
      <Pressable style={styles.arena} onPress={handleJump}>
        <Svg width={arenaWidth} height={arenaHeight} style={StyleSheet.absoluteFill}>
          <G transform={`translate(0, ${cameraY})`}>
            {/* Viewport-Culled Rotating Multi-Color Ring Obstacles */}
            {visibleObstacles.map((obs) => {
              const r = obs.radius;
              return (
                <G
                  key={obs.id}
                  transform={`rotate(${obs.rotation}, ${centerX}, ${obs.y})`}
                >
                  {/* Quadrant 0: Top (270°) to Right (360°) -> Cyan */}
                  <Path
                    d={`M ${centerX} ${obs.y - r} A ${r} ${r} 0 0 1 ${centerX + r} ${obs.y}`}
                    stroke={SWITCH_COLORS[0]}
                    strokeWidth={14}
                    fill="none"
                    strokeLinecap="round"
                  />
                  {/* Quadrant 1: Right (0°) to Bottom (90°) -> Magenta */}
                  <Path
                    d={`M ${centerX + r} ${obs.y} A ${r} ${r} 0 0 1 ${centerX} ${obs.y + r}`}
                    stroke={SWITCH_COLORS[1]}
                    strokeWidth={14}
                    fill="none"
                    strokeLinecap="round"
                  />
                  {/* Quadrant 2: Bottom (90°) to Left (180°) -> Gold */}
                  <Path
                    d={`M ${centerX} ${obs.y + r} A ${r} ${r} 0 0 1 ${centerX - r} ${obs.y}`}
                    stroke={SWITCH_COLORS[2]}
                    strokeWidth={14}
                    fill="none"
                    strokeLinecap="round"
                  />
                  {/* Quadrant 3: Left (180°) to Top (270°) -> Lime */}
                  <Path
                    d={`M ${centerX - r} ${obs.y} A ${r} ${r} 0 0 1 ${centerX} ${obs.y - r}`}
                    stroke={SWITCH_COLORS[3]}
                    strokeWidth={14}
                    fill="none"
                    strokeLinecap="round"
                  />
                </G>
              );
            })}

            {/* Viewport-Culled Stars & Color Swapper Orbs */}
            {visiblePickups.map((p) => {
              if (p.type === 'STAR') {
                return (
                  <G key={p.id}>
                    <Circle cx={centerX} cy={p.y} r={14} fill="rgba(255, 209, 102, 0.25)" />
                    <Circle cx={centerX} cy={p.y} r={8} fill="#FFD166" />
                  </G>
                );
              }

              // Color Swapper Orb visibly showing exact target color
              const orbColor = p.color || SWITCH_COLORS[0];
              return (
                <G key={p.id}>
                  {/* Outer Pulsing Glow Ring */}
                  <Circle
                    cx={centerX}
                    cy={p.y}
                    r={18}
                    fill="none"
                    stroke={orbColor}
                    strokeWidth={2}
                    opacity={0.5}
                    strokeDasharray="4 4"
                  />
                  {/* Inner Glowing Orb */}
                  <Circle
                    cx={centerX}
                    cy={p.y}
                    r={13}
                    fill={orbColor}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  />
                  {/* Shiny Highlight */}
                  <Circle
                    cx={centerX - 4}
                    cy={p.y - 4}
                    r={3.5}
                    fill="#FFFFFF"
                    opacity={0.85}
                  />
                </G>
              );
            })}

            {/* Player Color Ball */}
            <Circle
              cx={centerX}
              cy={ballY}
              r={BALL_RADIUS}
              fill={ballColor}
              stroke="#FFFFFF"
              strokeWidth={2.5}
            />
          </G>
        </Svg>

        {/* Color Swapped Notification Popup */}
        {colorNotification && (
          <View style={styles.colorNotifBadge}>
            <Text style={[styles.colorNotifText, { color: ballColor }]}>
              {colorNotification}
            </Text>
          </View>
        )}

        {/* Tap to Bounce Hint */}
        {!isPlaying && (
          <View style={[styles.tapHintContainer, { top: arenaHeight * 0.78 }]}>
            <Text style={styles.tapHintText}>
              TAP TO BOUNCE THROUGH {COLOR_NAMES[ballColor] || 'MATCHING COLOR'}
            </Text>
          </View>
        )}
      </Pressable>

      <GameResultModal
        visible={modalVisible}
        type="gameover"
        score={score}
        level={bestScore}
        onRetry={handleRetry}
        onBackToHub={onBackToHub}
        buttonText="PLAY AGAIN"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#03030A',
  },
  topHud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(8, 8, 22, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 245, 255, 0.15)',
  },
  hudBadge: {
    alignItems: 'center',
  },
  hudLabel: {
    fontFamily: monoFont,
    fontSize: 9,
    color: '#8A8F9E',
    fontWeight: '800',
    marginBottom: 2,
    letterSpacing: 0.8,
  },
  colorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  colorText: {
    fontFamily: monoFont,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  scoreVal: {
    fontFamily: monoFont,
    fontSize: 14,
    color: '#FFD166',
    fontWeight: '900',
  },
  arena: {
    flex: 1,
    backgroundColor: '#050212',
  },
  colorNotifBadge: {
    position: 'absolute',
    top: 24,
    alignSelf: 'center',
    backgroundColor: 'rgba(5, 2, 18, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#00F5FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  colorNotifText: {
    fontFamily: monoFont,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  tapHintContainer: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 245, 255, 0.14)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.4)',
  },
  tapHintText: {
    fontFamily: monoFont,
    fontSize: 10.5,
    color: '#00F5FF',
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
