import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../../styles';
import MiniGameHeader from '../components/MiniGameHeader';
import JuiceEngine from '../components/JuiceEngine';
import {
  triggerLightHaptic,
  triggerSliceHaptic,
  triggerPerfectHaptic,
  triggerGameOverHaptic,
} from '../utils/haptics';
import {
  playTapSound,
  playSliceSound,
  playPerfectSound,
  playSpeedUpSound,
  playGameOverSound,
} from '../utils/sound';

const STORAGE_KEY = '@game_tower:best_breaker_v1';
const BRICK_ROWS = 6;
const BRICK_COLS = 6;
const ROW_THEMES = [
  { primary: '#FF007F', secondary: '#B5179E', hp: 2 },
  { primary: '#FF5E00', secondary: '#D00000', hp: 2 },
  { primary: '#FFD166', secondary: '#F77F00', hp: 1 },
  { primary: '#00F5D4', secondary: '#06D6A0', hp: 1 },
  { primary: '#00F5FF', secondary: '#0088FF', hp: 1 },
  { primary: '#C77DFF', secondary: '#7209B7', hp: 1 },
];

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const buildBricks = (arenaWidth, wave = 1) => {
  const padX = 10;
  const gap = 5;
  const brickW = Math.floor(
    (arenaWidth - padX * 2 - gap * (BRICK_COLS - 1)) / BRICK_COLS
  );
  const brickH = 22;
  const list = [];

  for (let r = 0; r < BRICK_ROWS; r += 1) {
    const theme = ROW_THEMES[r % ROW_THEMES.length];
    const maxHp = r < 2 ? theme.hp + Math.floor((wave - 1) / 2) : 1;
    for (let c = 0; c < BRICK_COLS; c += 1) {
      list.push({
        id: `b_${wave}_${r}_${c}`,
        x: padX + c * (brickW + gap),
        y: 38 + r * (brickH + gap),
        width: brickW,
        height: brickH,
        color: theme.primary,
        secondary: theme.secondary,
        hp: maxHp,
        maxHp,
        alive: true,
      });
    }
  }
  return list;
};

export default function BrickBreakerGame({ onBackToHub, onScoreUpdate }) {
  const { width, height } = useWindowDimensions();
  const arenaWidth = Math.min(390, width - 24);
  const arenaHeight = Math.min(490, Math.max(350, height - 230));
  const basePaddleW = 96;
  const paddleHeight = 14;
  const paddleY = arenaHeight - 40;
  const ballRadius = 8;

  const juiceRef = useRef(null);

  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);
  const [status, setStatus] = useState('READY'); // 'READY' | 'PLAYING' | 'GAME_OVER'
  const [renderState, setRenderState] = useState(() => ({
    paddleX: (arenaWidth - basePaddleW) / 2,
    paddleW: basePaddleW,
    ballX: arenaWidth / 2,
    ballY: paddleY - ballRadius - 2,
    trail: [],
    powerUps: [],
    bricks: buildBricks(arenaWidth, 1),
  }));

  const engineRef = useRef({
    status: 'READY',
    paddleX: (arenaWidth - basePaddleW) / 2,
    paddleW: basePaddleW,
    wideTimer: 0,
    ballX: arenaWidth / 2,
    ballY: paddleY - ballRadius - 2,
    vx: 215,
    vy: -285,
    trail: [],
    powerUps: [],
    bricks: buildBricks(arenaWidth, 1),
    score: 0,
    best: 0,
    lives: 3,
    wave: 1,
    combo: 0,
  });

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = parseInt(saved, 10) || 0;
          setBestScore(parsed);
          engineRef.current.best = parsed;
        }
      } catch {}
    })();
  }, []);

  const persistBest = useCallback(
    async (nextScore) => {
      if (onScoreUpdate) onScoreUpdate(nextScore);
      if (nextScore > engineRef.current.best) {
        engineRef.current.best = nextScore;
        setBestScore(nextScore);
        try {
          await AsyncStorage.setItem(STORAGE_KEY, String(nextScore));
        } catch {}
      }
    },
    [onScoreUpdate]
  );

  const launchBall = useCallback(() => {
    const eng = engineRef.current;
    if (eng.status === 'READY') {
      eng.status = 'PLAYING';
      eng.vx = (Math.random() > 0.5 ? 1 : -1) * (190 + eng.wave * 15);
      eng.vy = -(285 + eng.wave * 15);
      setStatus('PLAYING');
      triggerLightHaptic();
      playTapSound();
    }
  }, []);

  const resetFullGame = useCallback(() => {
    const freshBricks = buildBricks(arenaWidth, 1);
    const startPadX = (arenaWidth - basePaddleW) / 2;
    engineRef.current = {
      ...engineRef.current,
      status: 'READY',
      paddleX: startPadX,
      paddleW: basePaddleW,
      wideTimer: 0,
      ballX: startPadX + basePaddleW / 2,
      ballY: paddleY - ballRadius - 2,
      vx: 215,
      vy: -285,
      trail: [],
      powerUps: [],
      bricks: freshBricks,
      score: 0,
      lives: 3,
      wave: 1,
      combo: 0,
    };
    setScore(0);
    setLives(3);
    setWave(1);
    setStatus('READY');
    setRenderState({
      paddleX: startPadX,
      paddleW: basePaddleW,
      ballX: startPadX + basePaddleW / 2,
      ballY: paddleY - ballRadius - 2,
      trail: [],
      powerUps: [],
      bricks: freshBricks,
    });
  }, [arenaWidth, paddleY]);

  useEffect(() => {
    let rafId = null;
    let lastTime = 0;

    const tick = (ts) => {
      if (!lastTime) lastTime = ts;
      const dt = Math.min(0.032, (ts - lastTime) / 1000);
      lastTime = ts;

      const eng = engineRef.current;

      if (eng.wideTimer > 0) {
        eng.wideTimer -= dt;
        if (eng.wideTimer <= 0) {
          eng.paddleW = basePaddleW;
        }
      }

      if (eng.status === 'READY') {
        eng.ballX = eng.paddleX + eng.paddleW / 2;
        eng.ballY = paddleY - ballRadius - 2;
        setRenderState((prev) => ({
          ...prev,
          paddleX: eng.paddleX,
          paddleW: eng.paddleW,
          ballX: eng.ballX,
          ballY: eng.ballY,
        }));
      } else if (eng.status === 'PLAYING') {
        let nx = eng.ballX + eng.vx * dt;
        let ny = eng.ballY + eng.vy * dt;

        // Update comet trail
        eng.trail = [
          { x: eng.ballX, y: eng.ballY },
          ...eng.trail.slice(0, 5),
        ];

        // Wall collisions
        if (nx - ballRadius <= 4) {
          nx = 4 + ballRadius;
          eng.vx = Math.abs(eng.vx);
          playTapSound();
        } else if (nx + ballRadius >= arenaWidth - 4) {
          nx = arenaWidth - 4 - ballRadius;
          eng.vx = -Math.abs(eng.vx);
          playTapSound();
        }

        if (ny - ballRadius <= 6) {
          ny = 6 + ballRadius;
          eng.vy = Math.abs(eng.vy);
          playTapSound();
        }

        // Paddle collision
        if (
          eng.vy > 0 &&
          ny + ballRadius >= paddleY &&
          ny - ballRadius <= paddleY + paddleHeight + 6 &&
          nx >= eng.paddleX - 8 &&
          nx <= eng.paddleX + eng.paddleW + 8
        ) {
          ny = paddleY - ballRadius;
          const hitOffset =
            (nx - (eng.paddleX + eng.paddleW / 2)) / (eng.paddleW / 2);
          eng.vx = hitOffset * 285;
          eng.vy = -Math.min(460, Math.abs(eng.vy) * 1.02);
          eng.combo = 0;
          triggerLightHaptic();
          playSliceSound();
          if (juiceRef.current) {
            juiceRef.current.burst(nx, paddleY + 50, COLORS.cyan, 8);
          }
        }

        // Brick collisions
        for (let i = 0; i < eng.bricks.length; i += 1) {
          const b = eng.bricks[i];
          if (!b.alive) continue;
          if (
            nx + ballRadius >= b.x &&
            nx - ballRadius <= b.x + b.width &&
            ny + ballRadius >= b.y &&
            ny - ballRadius <= b.y + b.height
          ) {
            eng.vy = -eng.vy;
            b.hp -= 1;
            eng.combo += 1;

            if (b.hp <= 0) {
              b.alive = false;
              const gained = 20 * Math.min(6, eng.combo);
              eng.score += gained;
              setScore(eng.score);
              persistBest(eng.score);
              triggerSliceHaptic();
              playPerfectSound(Math.min(9, eng.combo));

              if (juiceRef.current) {
                juiceRef.current.shake(5, 4);
                juiceRef.current.burst(
                  b.x + b.width / 2,
                  b.y + 85,
                  b.color,
                  14
                );
                if (eng.combo >= 2) {
                  juiceRef.current.popup(
                    `COMBO x${eng.combo}!`,
                    `+${gained} PTS`,
                    b.color,
                    b.x + b.width / 2,
                    b.y + 70
                  );
                }
              }

              // 22% chance to drop a glowing Power-Up capsule
              if (Math.random() < 0.22) {
                const types = ['WIDE', 'BONUS', 'LIFE'];
                const pick = types[Math.floor(Math.random() * types.length)];
                eng.powerUps.push({
                  id: `pu_${ts}_${i}`,
                  x: b.x + b.width / 2 - 18,
                  y: b.y,
                  type: pick,
                  color:
                    pick === 'WIDE'
                      ? COLORS.cyan
                      : pick === 'LIFE'
                        ? COLORS.magenta
                        : COLORS.solarGold,
                });
              }
            } else {
              // Armored brick cracked
              eng.score += 10;
              setScore(eng.score);
              triggerLightHaptic();
              playTapSound();
              if (juiceRef.current) {
                juiceRef.current.shake(3, 2);
              }
            }
            break;
          }
        }

        // Update falling Power-Ups
        if (eng.powerUps.length > 0) {
          const nextPu = [];
          for (let i = 0; i < eng.powerUps.length; i += 1) {
            const p = eng.powerUps[i];
            const py = p.y + 155 * dt;
            const caught =
              py + 18 >= paddleY &&
              py <= paddleY + paddleHeight + 8 &&
              p.x + 36 >= eng.paddleX &&
              p.x <= eng.paddleX + eng.paddleW;

            if (caught) {
              triggerPerfectHaptic(2);
              playSpeedUpSound();
              if (p.type === 'WIDE') {
                eng.paddleW = Math.min(150, basePaddleW + 44);
                eng.wideTimer = 10;
                if (juiceRef.current) {
                  juiceRef.current.celebrate(
                    'WIDE PADDLE!',
                    '10S EXPANSION',
                    COLORS.cyan
                  );
                }
              } else if (p.type === 'LIFE') {
                eng.lives = Math.min(5, eng.lives + 1);
                setLives(eng.lives);
                if (juiceRef.current) {
                  juiceRef.current.celebrate(
                    '+1 SHIELD!',
                    'EXTRA SPHERE',
                    COLORS.magenta
                  );
                }
              } else {
                eng.score += 100;
                setScore(eng.score);
                persistBest(eng.score);
                if (juiceRef.current) {
                  juiceRef.current.celebrate(
                    '+100 BONUS!',
                    'POWER CORE',
                    COLORS.solarGold
                  );
                }
              }
            } else if (py < arenaHeight) {
              nextPu.push({ ...p, y: py });
            }
          }
          eng.powerUps = nextPu;
        }

        // Respawn wave if all bricks cleared
        if (eng.bricks.every((b) => !b.alive)) {
          eng.wave += 1;
          eng.bricks = buildBricks(arenaWidth, eng.wave);
          eng.score += 250;
          eng.status = 'READY';
          setWave(eng.wave);
          setScore(eng.score);
          setStatus('READY');
          persistBest(eng.score);
          triggerPerfectHaptic(3);
          playSpeedUpSound();
          if (juiceRef.current) {
            juiceRef.current.celebrate(
              `WAVE ${eng.wave}!`,
              '+250 CLEAR BONUS',
              COLORS.matrixMint
            );
          }
        }

        // Bottom miss -> Lose a shield or Game Over
        if (ny - ballRadius > arenaHeight) {
          eng.lives -= 1;
          setLives(eng.lives);
          triggerGameOverHaptic();
          playGameOverSound();
          if (juiceRef.current) {
            juiceRef.current.shake(11, 8);
            juiceRef.current.flash(COLORS.danger);
          }

          if (eng.lives <= 0) {
            eng.status = 'GAME_OVER';
            setStatus('GAME_OVER');
          } else {
            eng.status = 'READY';
            eng.trail = [];
            setStatus('READY');
          }
        } else {
          eng.ballX = nx;
          eng.ballY = ny;
        }

        setRenderState({
          paddleX: eng.paddleX,
          paddleW: eng.paddleW,
          ballX: eng.ballX,
          ballY: eng.ballY,
          trail: [...eng.trail],
          powerUps: [...eng.powerUps],
          bricks: [...eng.bricks],
        });
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [arenaWidth, arenaHeight, paddleY, persistBest]);

  const movePaddleToX = useCallback(
    (touchX) => {
      const eng = engineRef.current;
      const clamped = Math.max(
        6,
        Math.min(arenaWidth - eng.paddleW - 6, touchX - eng.paddleW / 2)
      );
      eng.paddleX = clamped;
    },
    [arenaWidth]
  );

  const handleTouchStart = useCallback(
    (e) => {
      const touchX = e.nativeEvent.locationX;
      if (typeof touchX === 'number') {
        movePaddleToX(touchX);
      }
      if (engineRef.current.status === 'READY') {
        launchBall();
      }
    },
    [movePaddleToX, launchBall]
  );

  const handleTouchMove = useCallback(
    (e) => {
      const touchX = e.nativeEvent.locationX;
      if (typeof touchX === 'number') {
        movePaddleToX(touchX);
      }
    },
    [movePaddleToX]
  );

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={localStyles.container}>
        <LinearGradient
          colors={['#03030A', '#090B22', '#170B32']}
          style={StyleSheet.absoluteFillObject}
        />

        <MiniGameHeader
          title="BRICK BREAKER NEO"
          floorLabel="FLOOR 10 // PLASMA ARKANOID"
          score={score}
          bestScore={bestScore}
          accentColor={COLORS.cyan}
          onBack={onBackToHub}
          onReset={resetFullGame}
        />

        <View style={localStyles.body}>
          {/* Wave & Shield Hearts Bar */}
          <View style={[localStyles.statusBar, { width: arenaWidth }]}>
            <Text style={localStyles.waveBadge}>{`WAVE 0${wave}`}</Text>
            <Text style={localStyles.heartsText}>
              {Array.from({ length: Math.max(0, lives) })
                .map(() => '♥')
                .join(' ')}
            </Text>
          </View>

          {/* Interactive Touch Arena */}
          <View
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            style={[
              localStyles.arena,
              { width: arenaWidth, height: arenaHeight },
            ]}
          >
            {/* Neon Bricks */}
            {renderState.bricks.map(
              (b) =>
                b.alive && (
                  <View
                    key={b.id}
                    style={[
                      localStyles.brick,
                      {
                        left: b.x,
                        top: b.y,
                        width: b.width,
                        height: b.height,
                        borderColor: b.hp > 1 ? '#FFFFFF' : b.color,
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={[b.color, b.secondary]}
                      style={StyleSheet.absoluteFillObject}
                    />
                    {b.hp > 1 && <View style={localStyles.armorStripe} />}
                  </View>
                )
            )}

            {/* Falling Power-Up Capsules */}
            {renderState.powerUps.map((p) => (
              <View
                key={p.id}
                style={[
                  localStyles.powerUpPill,
                  {
                    left: p.x,
                    top: p.y,
                    borderColor: p.color,
                    backgroundColor: `${p.color}33`,
                  },
                ]}
              >
                <Text style={[localStyles.powerUpText, { color: p.color }]}>
                  {p.type}
                </Text>
              </View>
            ))}

            {/* Ball Comet Trail */}
            {renderState.trail.map((pt, idx) => {
              const size = Math.max(3, (ballRadius * 2) * (1 - idx * 0.16));
              return (
                <View
                  key={`trail_${idx}`}
                  style={[
                    localStyles.ballTrail,
                    {
                      left: pt.x - size / 2,
                      top: pt.y - size / 2,
                      width: size,
                      height: size,
                      borderRadius: size / 2,
                      opacity: 0.45 - idx * 0.07,
                    },
                  ]}
                />
              );
            })}

            {/* Plasma Ball */}
            <View
              style={[
                localStyles.ball,
                {
                  left: renderState.ballX - ballRadius,
                  top: renderState.ballY - ballRadius,
                  width: ballRadius * 2,
                  height: ballRadius * 2,
                  borderRadius: ballRadius,
                },
              ]}
            />

            {/* Cyber Paddle */}
            <View
              style={[
                localStyles.paddle,
                {
                  left: renderState.paddleX,
                  top: paddleY,
                  width: renderState.paddleW,
                  height: paddleHeight,
                },
              ]}
            >
              <LinearGradient
                colors={[COLORS.cyan, COLORS.electricBlue]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
            </View>

            {/* Tap to Launch Prompt */}
            {status === 'READY' && (
              <View style={localStyles.readyBanner} pointerEvents="none">
                <Text style={localStyles.readyText}>
                  TAP OR SLIDE ARENA TO LAUNCH SPHERE
                </Text>
              </View>
            )}

            {/* Game Over Modal */}
            {status === 'GAME_OVER' && (
              <Animated.View
                entering={FadeIn.duration(200)}
                style={localStyles.overlay}
              >
                <Animated.View
                  entering={ZoomIn.duration(240)}
                  style={localStyles.overlayCard}
                >
                  <Text style={localStyles.overlayTitle}>SHIELDS DEPLETED</Text>
                  <Text style={localStyles.overlaySub}>
                    {`FINAL SCORE: ${score} // WAVE ${wave}`}
                  </Text>
                  <Pressable onPress={resetFullGame} style={localStyles.retryBtn}>
                    <Text style={localStyles.retryText}>PLAY AGAIN</Text>
                  </Pressable>
                </Animated.View>
              </Animated.View>
            )}
          </View>

          {/* Dedicated Touch Slider Track & Left/Right Buttons */}
          <View style={[localStyles.controlsRow, { width: arenaWidth }]}>
            <Pressable
              onPress={() => {
                if (engineRef.current.status === 'READY') launchBall();
                movePaddleToX(
                  engineRef.current.paddleX + engineRef.current.paddleW / 2 - 48
                );
              }}
              style={localStyles.moveBtn}
            >
              <Text style={localStyles.moveBtnText}>◀ LEFT</Text>
            </Pressable>

            <Text style={localStyles.dragHint}>SLIDE FINGER ON ARENA</Text>

            <Pressable
              onPress={() => {
                if (engineRef.current.status === 'READY') launchBall();
                movePaddleToX(
                  engineRef.current.paddleX + engineRef.current.paddleW / 2 + 48
                );
              }}
              style={localStyles.moveBtn}
            >
              <Text style={localStyles.moveBtnText}>RIGHT ▶</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </JuiceEngine>
  );
}

const localStyles = StyleSheet.create({
  container: { flex: 1 },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 14,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  waveBadge: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.cyan,
    letterSpacing: 1.2,
  },
  heartsText: {
    fontSize: 16,
    color: COLORS.magenta,
    letterSpacing: 4,
  },
  arena: {
    backgroundColor: 'rgba(6, 8, 22, 0.94)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 245, 255, 0.42)',
    position: 'relative',
    overflow: 'hidden',
  },
  brick: {
    position: 'absolute',
    borderRadius: 6,
    borderWidth: 1.2,
    overflow: 'hidden',
     justifyContent: 'center',
  },
  armorStripe: {
    height: 3,
    marginHorizontal: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 1.5,
  },
  powerUpPill: {
    position: 'absolute',
    width: 44,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  powerUpText: {
    fontSize: 8.5,
    fontFamily: monoFont,
    fontWeight: '900',
  },
  ballTrail: {
    position: 'absolute',
    backgroundColor: COLORS.cyan,
  },
  ball: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: COLORS.cyan,
  },
  paddle: {
    position: 'absolute',
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
  },
  readyBanner: {
    position: 'absolute',
    bottom: 78,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  readyText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.solarGold,
    backgroundColor: 'rgba(4, 4, 14, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.solarGold,
    letterSpacing: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 4, 14, 0.86)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  overlayCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(12, 12, 28, 0.96)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.magenta,
    padding: 24,
    width: '90%',
  },
  overlayTitle: {
    fontSize: 22,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.magenta,
    letterSpacing: 1.5,
  },
  overlaySub: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '800',
    color: '#FFFFFF',
    marginVertical: 12,
  },
  retryBtn: {
    backgroundColor: COLORS.cyan,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 4,
  },
  retryText: {
    fontSize: 12.5,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#030308',
    letterSpacing: 1.4,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  moveBtn: {
    backgroundColor: 'rgba(0, 245, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.45)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  moveBtnText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.cyan,
  },
  dragHint: {
    fontSize: 9.5,
    fontFamily: monoFont,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
});
