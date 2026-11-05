import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  Platform,
} from 'react-native';
import Svg, { Circle, Path, G, Rect } from 'react-native-svg';
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

const BALL_RADIUS = 12;
const GRAVITY = 0.22;
const JUMP_FORCE = -4.6;

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

export default function ColorSwitchGame({ onBackToHub, onScoreUpdate }) {
  const { width, height } = useWindowDimensions();
  const arenaWidth = width;
  const arenaHeight = height - 130;

  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [ballColor, setBallColor] = useState(SWITCH_COLORS[0]);
  const [colorNotification, setColorNotification] = useState(null);

  // Ball physics
  const [ballY, setBallY] = useState(arenaHeight * 0.72);
  const [ballVy, setBallVy] = useState(0);
  const [cameraY, setCameraY] = useState(0);

  // Obstacles & pickups
  const [obstacles, setObstacles] = useState([]);
  const [pickups, setPickups] = useState([]);

  // Game state
  const [isPlaying, setIsPlaying] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const ballYRef = useRef(ballY);
  ballYRef.current = ballY;
  const ballVyRef = useRef(ballVy);
  ballVyRef.current = ballVy;
  const cameraYRef = useRef(cameraY);
  cameraYRef.current = cameraY;
  const ballColorRef = useRef(ballColor);
  ballColorRef.current = ballColor;

  const pickupsRef = useRef([]);
  const obstaclesRef = useRef([]);

  const animFrameRef = useRef(null);

  // Generate obstacle course with clearly colored swapper orbs
  const initGame = useCallback(() => {
    setScore(0);
    setBallY(arenaHeight * 0.72);
    setBallVy(0);
    setCameraY(0);
    const initialColor = SWITCH_COLORS[Math.floor(Math.random() * SWITCH_COLORS.length)];
    setBallColor(initialColor);
    ballColorRef.current = initialColor;
    setColorNotification(null);
    setIsPlaying(false);
    setModalVisible(false);

    const initialObs = [];
    const initialPickups = [];

    // Create 18 vertical obstacles spaced 280px apart
    let lastColor = initialColor;
    for (let i = 0; i < 18; i++) {
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
      if (i < 17) {
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
    setObstacles(initialObs);
    setPickups(initialPickups);
  }, [arenaHeight]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  // Tap to jump
  const handleJump = () => {
    if (!isPlaying) {
      setIsPlaying(true);
    }
    setBallVy(JUMP_FORCE);
    playTapSound();
    triggerLightHaptic();
  };

  // Main 60 FPS Physics & Collision Loop
  useEffect(() => {
    if (!isPlaying) return;

    let active = true;

    const tick = () => {
      if (!active) return;

      // Update ball position
      const nextVy = ballVyRef.current + GRAVITY;
      const nextY = ballYRef.current + nextVy;

      ballVyRef.current = nextVy;
      ballYRef.current = nextY;
      setBallY(nextY);
      setBallVy(nextVy);

      // Camera follow
      const targetCamY = Math.max(0, arenaHeight * 0.5 - nextY);
      if (targetCamY > cameraYRef.current) {
        cameraYRef.current = targetCamY;
        setCameraY(targetCamY);
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
      setObstacles([...currentObs]);

      // Check Pickups synchronously using pickupsRef
      const currentPickups = pickupsRef.current;
      let pickupStateChanged = false;

      for (let i = 0; i < currentPickups.length; i++) {
        const p = currentPickups[i];
        if (p.taken) continue;

        if (Math.abs(nextY - p.y) < BALL_RADIUS + 14) {
          p.taken = true;
          pickupStateChanged = true;

          if (p.type === 'STAR') {
            playSliceSound();
            triggerMediumHaptic();
            setScore((s) => {
              const ns = s + 1;
              onScoreUpdate?.(ns);
              return ns;
            });
          } else if (p.type === 'SWAPPER') {
            // Instantly change ball color to the exact color of the picked orb!
            playSliceSound();
            triggerMediumHaptic();

            const pickedColor = p.color;
            ballColorRef.current = pickedColor;
            setBallColor(pickedColor);

            // Visual feedback popup
            setColorNotification(`✦ ${p.colorName} ✦`);
            setTimeout(() => {
              setColorNotification(null);
            }, 900);
          }
        }
      }

      if (pickupStateChanged) {
        setPickups([...currentPickups]);
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, arenaHeight]);

  const handleGameOver = () => {
    setIsPlaying(false);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    playGameOverSound();
    triggerGameOverHaptic();
    setBestScore((b) => Math.max(b, score));
    setModalVisible(true);
  };

  const handleRetry = () => {
    initGame();
  };

  const centerX = arenaWidth * 0.5;

  return (
    <View style={styles.container}>
      <MiniGameHeader
        floorNum={25}
        gameTitle="COLOR SWITCH NEO"
        category="ARCADE REFLEX"
        accentColor="#FF007F"
        score={score}
        onBack={onBackToHub}
        onBackToHub={onBackToHub}
      />

      <Pressable style={styles.arena} onPress={handleJump}>
        <Svg width={arenaWidth} height={arenaHeight} style={StyleSheet.absoluteFill}>
          {/* Obstacles & Pickups translated by cameraY */}
          <G y={cameraY}>
            {obstacles.map((obs) => {
              const r = obs.radius;
              return (
                <G
                  key={obs.id}
                  transform={`rotate(${obs.rotation}, ${centerX}, ${obs.y})`}
                >
                  {/* Quadrant 0: Top (270°) to Right (360°/0°) -> Cyan */}
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

            {/* Stars & Color Swapper Orbs */}
            {pickups.map((p) => {
              if (p.taken) return null;
              if (p.type === 'STAR') {
                return (
                  <G key={p.id}>
                    <Circle cx={centerX} cy={p.y} r={14} fill="rgba(255, 209, 102, 0.25)" />
                    <Circle cx={centerX} cy={p.y} r={8} fill="#FFD166" />
                  </G>
                );
              }

              // Color Swapper Orb visibly showing the exact color you will pick up!
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
    backgroundColor: '#040114',
  },
  arena: {
    flex: 1,
    position: 'relative',
  },
  colorNotifBadge: {
    position: 'absolute',
    top: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  colorNotifText: {
    fontFamily: monoFont,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    backgroundColor: 'rgba(5, 2, 20, 0.92)',
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    textShadowColor: 'rgba(255, 255, 255, 0.6)',
    textShadowRadius: 6,
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
    color: '#00F5FF',
    letterSpacing: 1,
    backgroundColor: 'rgba(4, 1, 20, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.4)',
  },
});
