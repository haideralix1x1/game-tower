import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  useWindowDimensions,
  Platform,
} from 'react-native';
import Svg, { Line, Circle, Rect, G, Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import { COLORS } from '../../styles';
import MiniGameHeader from '../components/MiniGameHeader';
import GameResultModal from '../components/GameResultModal';
import JuiceEngine from '../components/JuiceEngine';
import { playSliceSound, playTapSound, playGameOverSound } from '../utils/sound';
import { triggerSliceHaptic, triggerGameOverHaptic } from '../utils/haptics';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const BALL_RADIUS = 15;
const BUCKET_WIDTH = 76;
const BUCKET_HEIGHT = 44;
const GRAVITY = 0.42;

// Check line segment intersection
// (x1, y1)-(x2, y2) is the swipe segment
// (x3, y3)-(x4, y4) is the rope segment (from left anchor to right anchor)
function checkLineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
  const det = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
  if (Math.abs(det) < 0.00001) return null;
  const lambda = ((y4 - y3) * (x4 - x1) + (x3 - x4) * (y4 - y1)) / det;
  const gamma = ((y1 - y2) * (x4 - x1) + (x2 - x1) * (y4 - y1)) / det;
  if (lambda >= 0 && lambda <= 1 && gamma >= 0 && gamma <= 1) {
    return {
      x: x3 + gamma * (x4 - x3),
      y: y3 + gamma * (y4 - y3),
      ropeT: gamma, // 0.0 is left anchor (x3, y3), 1.0 is right anchor (x4, y4)
    };
  }
  return null;
}

export default function RopeCutGame({ onBackToHub, onScoreUpdate }) {
  const { width, height } = useWindowDimensions();
  const arenaWidth = width;
  const arenaHeight = height - 130;

  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [starsCollected, setStarsCollected] = useState(0);

  // Ball physics
  const [ball, setBall] = useState({
    x: arenaWidth * 0.5,
    y: 90,
    vx: 0,
    vy: 0,
  });

  // Multiple rope platforms across sides and middle
  const [ropes, setRopes] = useState([]);
  const [stars, setStars] = useState([]);
  const [bucket, setBucket] = useState({ x: arenaWidth * 0.5 - BUCKET_WIDTH / 2, y: arenaHeight - 65 });

  // Swipe slice trail
  const [cutTrail, setCutTrail] = useState(null);

  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('win');

  const ballRef = useRef(ball);
  ballRef.current = ball;
  const ropesRef = useRef(ropes);
  ropesRef.current = ropes;

  const animFrameRef = useRef(null);

  // Initialize level with multi-tiered rope platforms
  const initLevel = useCallback(
    (lvl) => {
      setStarsCollected(0);
      setModalVisible(false);

      // Top ball spawn
      const spawnX = arenaWidth * 0.5 + ((lvl % 2 === 0 ? 1 : -1) * 30);
      const newBall = { x: spawnX, y: 75, vx: (lvl % 2 === 0 ? 0.5 : -0.5), vy: 0 };
      setBall(newBall);
      ballRef.current = newBall;

      // Create multi-platform ropes (Tiered: Upper, Middle-Left, Middle-Right, Lower)
      const newRopes = [
        // Rope 1: Top platform
        {
          id: 'rope_top',
          x1: arenaWidth * 0.22,
          y1: 150,
          x2: arenaWidth * 0.78,
          y2: 150,
          status: 'INTACT', // 'INTACT', 'CUT_LEFT', 'CUT_RIGHT', 'SEVERED'
          swingAngle: 0,
          swingSpeed: 0,
          color: '#00F5FF',
        },
        // Rope 2: Mid-Left platform
        {
          id: 'rope_mid_l',
          x1: arenaWidth * 0.08,
          y1: 270,
          x2: arenaWidth * 0.56,
          y2: 290,
          status: 'INTACT',
          swingAngle: 0,
          swingSpeed: 0,
          color: '#39FF14',
        },
        // Rope 3: Mid-Right platform
        {
          id: 'rope_mid_r',
          x1: arenaWidth * 0.44,
          y1: 390,
          x2: arenaWidth * 0.92,
          y2: 410,
          status: 'INTACT',
          swingAngle: 0,
          swingSpeed: 0,
          color: '#FF007F',
        },
        // Rope 4: Lower Funnel platform
        {
          id: 'rope_bot',
          x1: arenaWidth * 0.24,
          y1: 510,
          x2: arenaWidth * 0.76,
          y2: 520,
          status: 'INTACT',
          swingAngle: 0,
          swingSpeed: 0,
          color: '#FFD166',
        },
      ];
      setRopes(newRopes);
      ropesRef.current = newRopes;

      // Stars placed strategically along drops
      const newStars = [
        { id: 's1', x: arenaWidth * 0.35, y: 220, taken: false },
        { id: 's2', x: arenaWidth * 0.72, y: 350, taken: false },
        { id: 's3', x: arenaWidth * 0.5, y: 470, taken: false },
      ];
      setStars(newStars);

      // Target Bucket on floor
      const bucketX = Math.max(
        30,
        Math.min(
          arenaWidth - BUCKET_WIDTH - 30,
          arenaWidth * 0.5 + ((lvl % 3) - 1) * 80 - BUCKET_WIDTH / 2
        )
      );
      setBucket({ x: bucketX, y: arenaHeight - 65 });
    },
    [arenaWidth, arenaHeight]
  );

  useEffect(() => {
    initLevel(level);
  }, [level, initLevel]);

  // PanResponder to slice ropes
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCutTrail({ x1: locationX, y1: locationY, x2: locationX, y2: locationY });
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCutTrail((prev) => {
          if (!prev) return { x1: locationX, y1: locationY, x2: locationX, y2: locationY };
          const p1 = { x: prev.x2, y: prev.y2 };
          const p2 = { x: locationX, y: locationY };

          // Check intersection with all active rope platforms
          setRopes((currentRopes) => {
            const updated = currentRopes.map((r) => {
              if (r.status !== 'INTACT') return r;

              const hit = checkLineIntersection(p1.x, p1.y, p2.x, p2.y, r.x1, r.y1, r.x2, r.y2);
              if (hit) {
                playSliceSound();
                triggerSliceHaptic();

                // Exactly cut the side where the player swiped:
                // Swipe on the left half of the rope (ropeT < 0.5) -> CUT_LEFT
                //   Left anchor detaches and drops down, swinging from the right anchor.
                // Swipe on the right half of the rope (ropeT >= 0.5) -> CUT_RIGHT
                //   Right anchor detaches and drops down, swinging from the left anchor.
                // NEVER cut both sides (SEVERED is disabled).
                const isLeftCut = hit.ropeT < 0.5;
                const nextStatus = isLeftCut ? 'CUT_LEFT' : 'CUT_RIGHT';
                const initSwingSpeed = isLeftCut ? 5 : -5;

                return {
                  ...r,
                  status: nextStatus,
                  swingSpeed: initSwingSpeed,
                };
              }
              return r;
            });
            ropesRef.current = updated;
            return updated;
          });

          return { x1: prev.x1, y1: prev.y1, x2: locationX, y2: locationY };
        });
      },
      onPanResponderRelease: () => {
        setCutTrail(null);
      },
    })
  ).current;

  // 60 FPS Physics Loop
  useEffect(() => {
    let active = true;

    const tick = () => {
      if (!active) return;

      const currentBall = { ...ballRef.current };
      const currentRopes = ropesRef.current;

      // Apply Gravity
      currentBall.vy += GRAVITY;
      currentBall.vx *= 0.99; // Air drag

      let nextX = currentBall.x + currentBall.vx;
      let nextY = currentBall.y + currentBall.vy;

      // Check collision & resting on Rope Platforms
      for (let i = 0; i < currentRopes.length; i++) {
        const r = currentRopes[i];

        if (r.status === 'INTACT') {
          // Check if ball is landing on top of this rope segment
          const minX = Math.min(r.x1, r.x2) - 5;
          const maxX = Math.max(r.x1, r.x2) + 5;

          if (nextX >= minX && nextX <= maxX) {
            // Rope Y at ball X
            const ratio = (nextX - r.x1) / (r.x2 - r.x1 || 1);
            const ropeY = r.y1 + ratio * (r.y2 - r.y1);

            // Ball touching rope surface
            if (
              currentBall.y <= ropeY - BALL_RADIUS + 8 &&
              nextY >= ropeY - BALL_RADIUS - 4
            ) {
              nextY = ropeY - BALL_RADIUS;

              // Tilt acceleration: ball rolls down slope of rope
              const slope = (r.y2 - r.y1) / (r.x2 - r.x1 || 1);
              currentBall.vx += slope * 0.45;
              currentBall.vy = currentBall.vx * slope;

              // Friction along rope
              currentBall.vx *= 0.94;
            }
          }
        } else if (r.status === 'CUT_LEFT') {
          // Left anchor cut: rope tilts down to the left pivoting around (x2, y2)
          // Any ball on it slides off quickly to the left
          const ropeLen = Math.hypot(r.x2 - r.x1, r.y2 - r.y1);
          const rad = (r.swingAngle * Math.PI) / 180;
          const curX1 = r.x2 - ropeLen * Math.cos(rad);
          const curY1 = r.y2 + ropeLen * Math.sin(rad);

          if (nextX >= curX1 && nextX <= r.x2) {
            const ratio = (nextX - curX1) / (r.x2 - curX1 || 1);
            const ropeY = curY1 + ratio * (r.y2 - curY1);
            if (nextY >= ropeY - BALL_RADIUS && currentBall.y <= ropeY + BALL_RADIUS) {
              nextY = ropeY - BALL_RADIUS;
              currentBall.vx -= 1.2; // Slide leftward
            }
          }
        } else if (r.status === 'CUT_RIGHT') {
          // Right anchor cut: rope tilts down to the right pivoting around (x1, y1)
          // Any ball on it slides off quickly to the right
          const ropeLen = Math.hypot(r.x2 - r.x1, r.y2 - r.y1);
          const rad = (r.swingAngle * Math.PI) / 180;
          const curX2 = r.x1 + ropeLen * Math.cos(rad);
          const curY2 = r.y1 + ropeLen * Math.sin(rad);

          if (nextX >= r.x1 && nextX <= curX2) {
            const ratio = (nextX - r.x1) / (curX2 - r.x1 || 1);
            const ropeY = r.y1 + ratio * (curY2 - r.y1);
            if (nextY >= ropeY - BALL_RADIUS && currentBall.y <= ropeY + BALL_RADIUS) {
              nextY = ropeY - BALL_RADIUS;
              currentBall.vx += 1.2; // Slide rightward
            }
          }
        }
      }

      // Walls bounce
      if (nextX < BALL_RADIUS) {
        nextX = BALL_RADIUS;
        currentBall.vx = -currentBall.vx * 0.6;
      } else if (nextX > arenaWidth - BALL_RADIUS) {
        nextX = arenaWidth - BALL_RADIUS;
        currentBall.vx = -currentBall.vx * 0.6;
      }

      currentBall.x = nextX;
      currentBall.y = nextY;
      ballRef.current = currentBall;
      setBall(currentBall);

      // Animate swinging ropes
      setRopes((prev) =>
        prev.map((r) => {
          if (r.status === 'CUT_LEFT') {
            const nextAngle = Math.min(75, r.swingAngle + r.swingSpeed);
            return { ...r, swingAngle: nextAngle, swingSpeed: r.swingSpeed * 0.96 };
          }
          if (r.status === 'CUT_RIGHT') {
            const nextAngle = Math.min(75, r.swingAngle + Math.abs(r.swingSpeed));
            return { ...r, swingAngle: nextAngle, swingSpeed: r.swingSpeed * 0.96 };
          }
          return r;
        })
      );

      // Collect Stars
      setStars((prevStars) =>
        prevStars.map((st) => {
          if (st.taken) return st;
          if (Math.hypot(nextX - st.x, nextY - st.y) < BALL_RADIUS + 16) {
            playSliceSound();
            setStarsCollected((c) => c + 1);
            return { ...st, taken: true };
          }
          return st;
        })
      );

      // Check Bucket Catch (Victory)
      if (
        nextX >= bucket.x + 8 &&
        nextX <= bucket.x + BUCKET_WIDTH - 8 &&
        nextY >= bucket.y - 10 &&
        nextY <= bucket.y + BUCKET_HEIGHT
      ) {
        handleWin();
        return;
      }

      // Check Fall past floor (Defeat)
      if (nextY > arenaHeight + 30) {
        handleLose();
        return;
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [arenaWidth, arenaHeight, bucket]);

  const handleWin = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    JuiceEngine.celebrate(bucket.x + BUCKET_WIDTH / 2, bucket.y);
    const winPoints = 200 + starsCollected * 100;
    const nextScore = score + winPoints;
    setScore(nextScore);
    onScoreUpdate?.(nextScore);
    setModalType('win');
    setModalVisible(true);
  };

  const handleLose = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    playGameOverSound();
    triggerGameOverHaptic();
    setModalType('gameover');
    setModalVisible(true);
  };

  const handleNextLevel = () => {
    setLevel((l) => l + 1);
  };

  const handleRetry = () => {
    initLevel(level);
  };

  return (
    <View style={styles.container}>
      <MiniGameHeader
        floorNum={23}
        gameTitle="CYBER ROPE DROP"
        category="PHYSICS PUZZLE"
        accentColor="#00F5D4"
        score={score}
        onBack={onBackToHub}
        onBackToHub={onBackToHub}
      />

      {/* Top HUD: Level & Stars */}
      <View style={styles.topHud}>
        <Text style={styles.hudText}>LEVEL {level}</Text>
        <View style={styles.starsRow}>
          {[0, 1, 2].map((i) => (
            <Text
              key={i}
              style={[
                styles.starIcon,
                { opacity: i < starsCollected ? 1 : 0.25 },
              ]}
            >
              ⭐
            </Text>
          ))}
        </View>
        <Text style={styles.hudHint}>SWIPE TO CUT ROPES</Text>
      </View>

      {/* Touch Arena for Physics & Slicing */}
      <View style={styles.arena} {...panResponder.panHandlers}>
        <Svg width={arenaWidth} height={arenaHeight} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="ballGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#00F5FF" stopOpacity="1" />
              <Stop offset="100%" stopColor="#7928CA" stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id="bucketGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#00F5D4" stopOpacity="0.8" />
              <Stop offset="100%" stopColor="#0A2E2A" stopOpacity="0.9" />
            </LinearGradient>
          </Defs>

          {/* Ropes as Platforms */}
          {ropes.map((r) => {
            if (r.status === 'SEVERED') return null;

            let x1 = r.x1;
            let y1 = r.y1;
            let x2 = r.x2;
            let y2 = r.y2;

            if (r.status === 'CUT_LEFT') {
              const len = Math.hypot(r.x2 - r.x1, r.y2 - r.y1);
              const rad = (r.swingAngle * Math.PI) / 180;
              x1 = r.x2 - len * Math.cos(rad);
              y1 = r.y2 + len * Math.sin(rad);
            } else if (r.status === 'CUT_RIGHT') {
              const len = Math.hypot(r.x2 - r.x1, r.y2 - r.y1);
              const rad = (r.swingAngle * Math.PI) / 180;
              x2 = r.x1 + len * Math.cos(rad);
              y2 = r.y1 + len * Math.sin(rad);
            }

            return (
              <G key={r.id}>
                {/* Anchor Points */}
                <Circle cx={r.x1} cy={r.y1} r={6} fill="#FFFFFF" opacity={r.status === 'CUT_LEFT' ? 0.3 : 0.9} />
                <Circle cx={r.x2} cy={r.y2} r={6} fill="#FFFFFF" opacity={r.status === 'CUT_RIGHT' ? 0.3 : 0.9} />
                {/* Thick Rope Platform */}
                <Line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={r.color}
                  strokeWidth={4.5}
                  strokeLinecap="round"
                />
                {/* Rope Texture Core */}
                <Line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  opacity={0.8}
                />
              </G>
            );
          })}

          {/* Stars */}
          {stars.map((st) => {
            if (st.taken) return null;
            return (
              <G key={st.id}>
                <Circle cx={st.x} cy={st.y} r={14} fill="rgba(255, 209, 102, 0.25)" />
                <Circle cx={st.x} cy={st.y} r={8} fill="#FFD166" />
              </G>
            );
          })}

          {/* Target Bucket on Floor */}
          <G>
            <Rect
              x={bucket.x}
              y={bucket.y}
              width={BUCKET_WIDTH}
              height={BUCKET_HEIGHT}
              fill="url(#bucketGrad)"
              stroke="#00F5D4"
              strokeWidth={2.5}
              rx={8}
            />
            {/* Bucket Rim */}
            <Rect
              x={bucket.x - 3}
              y={bucket.y}
              width={BUCKET_WIDTH + 6}
              height={6}
              fill="#FFFFFF"
              rx={3}
            />
          </G>

          {/* Falling Physics Ball */}
          <Circle
            cx={ball.x}
            cy={ball.y}
            r={BALL_RADIUS}
            fill="url(#ballGrad)"
            stroke="#FFFFFF"
            strokeWidth={2}
          />

          {/* Slicing Trail Line */}
          {cutTrail && (
            <Line
              x1={cutTrail.x1}
              y1={cutTrail.y1}
              x2={cutTrail.x2}
              y2={cutTrail.y2}
              stroke="#FFFFFF"
              strokeWidth={3}
              strokeLinecap="round"
            />
          )}
        </Svg>
      </View>

      <GameResultModal
        visible={modalVisible}
        type={modalType}
        score={score}
        level={level}
        onRetry={modalType === 'win' ? handleNextLevel : handleRetry}
        onBackToHub={onBackToHub}
        buttonText={modalType === 'win' ? 'NEXT LEVEL' : 'TRY AGAIN'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#040212',
  },
  topHud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(8, 4, 24, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 245, 212, 0.25)',
  },
  hudText: {
    fontFamily: monoFont,
    fontSize: 12,
    fontWeight: '900',
    color: '#00F5D4',
  },
  starsRow: {
    flexDirection: 'row',
  },
  starIcon: {
    fontSize: 16,
    marginHorizontal: 3,
  },
  hudHint: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  arena: {
    flex: 1,
    position: 'relative',
  },
});
