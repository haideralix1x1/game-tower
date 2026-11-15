import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';
import Svg, {
  Rect,
  Circle,
  Path,
  Line,
  G,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import MiniGameHeader from '../components/MiniGameHeader';
import GameResultModal from '../components/GameResultModal';
import JuiceEngine from '../components/JuiceEngine';
import {
  playTapSound,
  playSoccerKickSound,
  playSoccerGoalSound,
  playGameOverSound,
  playSnapTickSound,
  playVictorySound,
  startBGM,
  stopBGM,
} from '../utils/sound';
import {
  triggerLightHaptic,
  triggerMediumHaptic,
  triggerHeavyHaptic,
  triggerPerfectHaptic,
} from '../utils/haptics';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const STORAGE_BEST_KEY = '@game_tower:best_soccer_v1';
const PITCH_W = 340;
const PITCH_H = 540;

const GOAL_W = 100;
const GOAL_DEPTH = 18;
const GOAL_LEFT = (PITCH_W - GOAL_W) / 2;
const GOAL_RIGHT = GOAL_LEFT + GOAL_W;

const DISC_RADIUS = 18;
const BALL_RADIUS = 10.5;
const FRICTION = 0.981;
const BALL_FRICTION = 0.985;
const MAX_PULL = 90;
const POWER_SCALE = 0.22;
const WINNING_GOALS = 3;

/**
 * Standard Formation for 4v4 Table Soccer
 * Player Discs: Blue (Bottom half)
 * Bot Discs: Red (Top half)
 */
function getInitialPositions() {
  return {
    ball: {
      x: PITCH_W / 2,
      y: PITCH_H / 2,
      vx: 0,
      vy: 0,
      radius: BALL_RADIUS,
    },
    // Player Discs (Bottom)
    playerDiscs: [
      { id: 'p_gk', x: PITCH_W / 2, y: PITCH_H - 45, vx: 0, vy: 0, radius: DISC_RADIUS, role: 'GK' },
      { id: 'p_def1', x: PITCH_W / 2 - 65, y: PITCH_H - 120, vx: 0, vy: 0, radius: DISC_RADIUS, role: 'DEF' },
      { id: 'p_def2', x: PITCH_W / 2 + 65, y: PITCH_H - 120, vx: 0, vy: 0, radius: DISC_RADIUS, role: 'DEF' },
      { id: 'p_fwd', x: PITCH_W / 2, y: PITCH_H / 2 + 55, vx: 0, vy: 0, radius: DISC_RADIUS, role: 'FWD' },
    ],
    // Bot Discs (Top)
    botDiscs: [
      { id: 'b_gk', x: PITCH_W / 2, y: 45, vx: 0, vy: 0, radius: DISC_RADIUS, role: 'GK' },
      { id: 'b_def1', x: PITCH_W / 2 - 65, y: 120, vx: 0, vy: 0, radius: DISC_RADIUS, role: 'DEF' },
      { id: 'b_def2', x: PITCH_W / 2 + 65, y: 120, vx: 0, vy: 0, radius: DISC_RADIUS, role: 'DEF' },
      { id: 'b_fwd', x: PITCH_W / 2, y: PITCH_H / 2 - 55, vx: 0, vy: 0, radius: DISC_RADIUS, role: 'FWD' },
    ],
  };
}

export default function TableSoccerGame({
  onBackToHub,
  onScoreUpdate,
  isPaused = false,
}) {
  const isPausedRef = useRef(isPaused);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const { width, height } = useWindowDimensions();
  const pitchScale = Math.min(
    (width - 24) / PITCH_W,
    (height - 180) / PITCH_H,
    1.15
  );

  const juiceRef = useRef(null);

  // Match Scores
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const playerScoreRef = useRef(0);
  const botScoreRef = useRef(0);
  const [matchesWon, setMatchesWon] = useState(0);
  const [turn, setTurn] = useState('PLAYER'); // 'PLAYER' | 'MOVING' | 'BOT_THINKING' | 'GOAL'
  const [goalAnnouncement, setGoalAnnouncement] = useState(null);

  // Result Modal
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const resultModalVisibleRef = useRef(false);
  const [modalType, setModalType] = useState('VICTORY');

  // Load Saved High Score
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_BEST_KEY);
        if (saved !== null) {
          const val = parseInt(saved, 10);
          if (!isNaN(val)) setMatchesWon(val);
        }
      } catch {}
    })();
  }, []);

  // Slingshot Aim Drag State (Visualized in real time)
  const [dragAim, setDragAim] = useState(null);

  // Physics simulation refs (all physics live in refs for 60fps performance)
  const animFrameRef = useRef(null);
  const physicsRef = useRef(getInitialPositions());
  const turnRef = useRef('PLAYER');
  const lastShooterRef = useRef('BOT'); // Track who shot last so turns alternate strictly
  const isMovingRef = useRef(false);

  // Reactive state synced each frame for rendering
  const [renderState, setRenderState] = useState(() => getInitialPositions());

  // Execute Bot AI Turn - fires immediately without hanging
  const executeBotTurn = useCallback(() => {
    if (resultModalVisibleRef.current || isPausedRef.current) return;

    const { ball, botDiscs, playerDiscs } = physicsRef.current;

    // Evaluate best disc to shoot
    let bestDisc = null;
    let bestVx = 0;
    let bestVy = 0;
    let bestScoreEval = -Infinity;

    // Target Player Goal Center (Bottom)
    const targetGoalX = PITCH_W / 2;
    const targetGoalY = PITCH_H;

    for (const disc of botDiscs) {
      // Vector from disc to ball
      const dxBall = ball.x - disc.x;
      const dyBall = ball.y - disc.y;
      const distBall = Math.hypot(dxBall, dyBall);

      // Vector from ball to player's goal
      const dxGoal = targetGoalX - ball.x;
      const dyGoal = targetGoalY - ball.y;
      const distGoal = Math.hypot(dxGoal, dyGoal);

      // Angle alignment between disc->ball and ball->goal
      const dot = distBall > 0 && distGoal > 0
        ? (dxBall * dxGoal + dyBall * dyGoal) / (distBall * distGoal)
        : 0;

      let evalScore = dot * 70 - distBall * 0.15;

      // DEFENSIVE LOGIC: If ball is threatening Bot's Goal (Top half)
      if (ball.y < 160) {
        // Goalkeeper or closest defender clears ball downfield
        if (disc.role === 'GK' || distBall < 90) {
          evalScore += 120 - distBall * 0.5;
        }
      }

      // Check if player has defenders blocking the goal path
      const hasBlocker = playerDiscs.some((pd) => {
        return pd.y > ball.y && Math.abs(pd.x - ball.x) < 30;
      });
      if (hasBlocker) {
        evalScore -= 20;
      }

      if (evalScore > bestScoreEval) {
        bestScoreEval = evalScore;
        bestDisc = disc;

        // Desired impact point on ball: slightly behind ball on the line towards goal
        const impactAngle = Math.atan2(dyGoal, dxGoal);
        const aimSpotX = ball.x - Math.cos(impactAngle) * (DISC_RADIUS + BALL_RADIUS * 0.85);
        const aimSpotY = ball.y - Math.sin(impactAngle) * (DISC_RADIUS + BALL_RADIUS * 0.85);

        // Vector from chosen bot disc to aimSpot
        const strikeDx = aimSpotX - disc.x;
        const strikeDy = aimSpotY - disc.y;
        const strikeDist = Math.hypot(strikeDx, strikeDy);

        // Power calculation (crisp, confident shot)
        const power = Math.min(18.5, Math.max(9.5, strikeDist * 0.088 + 7.5 + (Math.random() - 0.5) * 1.2));
        const normDx = strikeDist > 0 ? strikeDx / strikeDist : 0;
        const normDy = strikeDist > 0 ? strikeDy / strikeDist : 1;

        bestVx = normDx * power;
        bestVy = normDy * power;
      }
    }

    // Fallback: If no disc selected, pick closest bot disc and blast toward ball
    if (!bestDisc && botDiscs.length > 0) {
      let minDist = Infinity;
      for (const d of botDiscs) {
        const dDist = Math.hypot(ball.x - d.x, ball.y - d.y);
        if (dDist < minDist) {
          minDist = dDist;
          bestDisc = d;
        }
      }
      if (bestDisc) {
        const dxBall = ball.x - bestDisc.x;
        const dyBall = ball.y - bestDisc.y;
        const dist = Math.hypot(dxBall, dyBall) || 1;
        bestVx = (dxBall / dist) * 12;
        bestVy = (dyBall / dist) * 12;
      }
    }

    if (bestDisc) {
      playSnapTickSound();
      triggerMediumHaptic();

      bestDisc.vx = bestVx;
      bestDisc.vy = bestVy;

      lastShooterRef.current = 'BOT';
      turnRef.current = 'MOVING';
      setTurn('MOVING');
      isMovingRef.current = true;
    }
  }, []);

  // Goal Scored Handler
  const handleGoal = useCallback((scoringTeam) => {
    turnRef.current = 'GOAL';
    setTurn('GOAL');
    isMovingRef.current = false;

    // Immediately stop ball momentum so it stays in goal during celebration
    physicsRef.current.ball.vx = 0;
    physicsRef.current.ball.vy = 0;

    if (scoringTeam === 'PLAYER') {
      playSoccerGoalSound();
      triggerPerfectHaptic(3);
      if (juiceRef.current) {
        juiceRef.current.celebrate('GOAL!', 'YOU SCORED!', '#00F5FF');
      }
      setGoalAnnouncement('⚽ GOAL FOR YOU!');

      const nextP = playerScoreRef.current + 1;
      playerScoreRef.current = nextP;
      setPlayerScore(nextP);

      if (nextP >= WINNING_GOALS) {
        resultModalVisibleRef.current = true;
        setTimeout(() => {
          playVictorySound();
          setModalType('VICTORY');
          setResultModalVisible(true);
          setMatchesWon((w) => {
            const nw = w + 1;
            AsyncStorage.setItem(STORAGE_BEST_KEY, String(nw)).catch(() => {});
            onScoreUpdate?.(nw * 100);
            return nw;
          });
        }, 1200);
      }
    } else {
      playGameOverSound();
      triggerHeavyHaptic();
      if (juiceRef.current) {
        juiceRef.current.shake(12, 8);
        juiceRef.current.popup('GOAL!', 'BOT SCORED', '#FF0055');
      }
      setGoalAnnouncement('⚠️ GOAL FOR BOT');

      const nextB = botScoreRef.current + 1;
      botScoreRef.current = nextB;
      setBotScore(nextB);

      if (nextB >= WINNING_GOALS) {
        resultModalVisibleRef.current = true;
        setTimeout(() => {
          playGameOverSound();
          setModalType('GAME_OVER');
          setResultModalVisible(true);
        }, 1200);
      }
    }

    // Reset pitch formation after 1.6s
    setTimeout(() => {
      if (resultModalVisibleRef.current) return;

      physicsRef.current = getInitialPositions();
      setRenderState(getInitialPositions());
      setGoalAnnouncement(null);
      isMovingRef.current = false;

      // Conceding team gets kick-off
      if (scoringTeam === 'PLAYER') {
        lastShooterRef.current = 'PLAYER';
        turnRef.current = 'BOT_THINKING';
        setTurn('BOT_THINKING');
        setTimeout(() => {
          executeBotTurn();
        }, 150);
      } else {
        lastShooterRef.current = 'BOT';
        turnRef.current = 'PLAYER';
        setTurn('PLAYER');
      }
    }, 1600);
  }, [executeBotTurn, onScoreUpdate]);

  // Main 60 FPS Physics Loop
  useEffect(() => {
    let active = true;

    const updatePhysics = () => {
      if (!active) return;

      // Keep animation frame loop alive unconditionally at the top of every tick
      animFrameRef.current = requestAnimationFrame(updatePhysics);

      if (!isPausedRef.current && turnRef.current === 'MOVING') {
        const { ball, playerDiscs, botDiscs } = physicsRef.current;
        const allDiscs = [...playerDiscs, ...botDiscs];

        // 1. Check Goal Lines First
        // Bot Goal (Top): y <= 0 between GOAL_LEFT and GOAL_RIGHT
        if (ball.y - ball.radius <= 0 && ball.x >= GOAL_LEFT && ball.x <= GOAL_RIGHT) {
          handleGoal('PLAYER');
          return;
        }
        // Player Goal (Bottom): y + ball.radius >= PITCH_H between GOAL_LEFT and GOAL_RIGHT
        if (ball.y + ball.radius >= PITCH_H && ball.x >= GOAL_LEFT && ball.x <= GOAL_RIGHT) {
          handleGoal('BOT');
          return;
        }

        // 2. Move & Apply Friction to Ball
        ball.x += ball.vx;
        ball.y += ball.vy;
        ball.vx *= BALL_FRICTION;
        ball.vy *= BALL_FRICTION;
        if (Math.hypot(ball.vx, ball.vy) < 0.08) {
          ball.vx = 0;
          ball.vy = 0;
        }

        // Ball Pitch Wall Bounces
        // Left & Right walls
        if (ball.x - ball.radius < 0) {
          ball.x = ball.radius;
          ball.vx = -ball.vx * 0.82;
          playTapSound();
        } else if (ball.x + ball.radius > PITCH_W) {
          ball.x = PITCH_W - ball.radius;
          ball.vx = -ball.vx * 0.82;
          playTapSound();
        }

        // Top Wall (outside goal mouth)
        if (ball.y - ball.radius < 0) {
          if (ball.x < GOAL_LEFT || ball.x > GOAL_RIGHT) {
            ball.y = ball.radius;
            ball.vy = -ball.vy * 0.82;
            playTapSound();
          }
        }
        // Bottom Wall (outside goal mouth)
        if (ball.y + ball.radius > PITCH_H) {
          if (ball.x < GOAL_LEFT || ball.x > GOAL_RIGHT) {
            ball.y = PITCH_H - ball.radius;
            ball.vy = -ball.vy * 0.82;
            playTapSound();
          }
        }

        // 3. Move & Apply Friction to Discs
        for (const disc of allDiscs) {
          disc.x += disc.vx;
          disc.y += disc.vy;
          disc.vx *= FRICTION;
          disc.vy *= FRICTION;
          if (Math.hypot(disc.vx, disc.vy) < 0.08) {
            disc.vx = 0;
            disc.vy = 0;
          }

          // Disc Wall Bounces (cannot enter goal mouth)
          if (disc.x - disc.radius < 0) {
            disc.x = disc.radius;
            disc.vx = -disc.vx * 0.75;
          } else if (disc.x + disc.radius > PITCH_W) {
            disc.x = PITCH_W - disc.radius;
            disc.vx = -disc.vx * 0.75;
          }

          if (disc.y - disc.radius < 0) {
            disc.y = disc.radius;
            disc.vy = -disc.vy * 0.75;
          } else if (disc.y + disc.radius > PITCH_H) {
            disc.y = PITCH_H - disc.radius;
            disc.vy = -disc.vy * 0.75;
          }
        }

        // 4. Disc-to-Ball Elastic Collisions
        for (const disc of allDiscs) {
          const dx = ball.x - disc.x;
          const dy = ball.y - disc.y;
          const dist = Math.hypot(dx, dy);
          const minDist = disc.radius + ball.radius;

          if (dist < minDist && dist > 0) {
            // Collision normal
            const nx = dx / dist;
            const ny = dy / dist;

            // Separate bodies to prevent overlap
            const overlap = minDist - dist;
            ball.x += nx * overlap * 0.65;
            ball.y += ny * overlap * 0.65;
            disc.x -= nx * overlap * 0.35;
            disc.y -= ny * overlap * 0.35;

            // Relative velocity
            const kx = disc.vx - ball.vx;
            const ky = disc.vy - ball.vy;
            const p = 2 * (nx * kx + ny * ky) / (1 + 0.45); // Ball is ~0.45 weight of disc

            disc.vx -= p * 0.45 * nx * 0.92;
            disc.vy -= p * 0.45 * ny * 0.92;
            ball.vx += p * 1.0 * nx * 1.15;
            ball.vy += p * 1.0 * ny * 1.15;

            playSoccerKickSound();
            triggerLightHaptic();
          }
        }

        // 5. Disc-to-Disc Elastic Collisions
        for (let i = 0; i < allDiscs.length; i++) {
          for (let j = i + 1; j < allDiscs.length; j++) {
            const d1 = allDiscs[i];
            const d2 = allDiscs[j];
            const dx = d2.x - d1.x;
            const dy = d2.y - d1.y;
            const dist = Math.hypot(dx, dy);
            const minDist = d1.radius + d2.radius;

            if (dist < minDist && dist > 0) {
              const nx = dx / dist;
              const ny = dy / dist;
              const overlap = (minDist - dist) * 0.5;

              d1.x -= nx * overlap;
              d1.y -= ny * overlap;
              d2.x += nx * overlap;
              d2.y += ny * overlap;

              const kx = d1.vx - d2.vx;
              const ky = d1.vy - d2.vy;
              const impulse = nx * kx + ny * ky;

              if (impulse > 0) {
                d1.vx -= nx * impulse * 0.88;
                d1.vy -= ny * impulse * 0.88;
                d2.vx += nx * impulse * 0.88;
                d2.vy += ny * impulse * 0.88;
                playTapSound();
              }
            }
          }
        }

        // 6. Check if all pieces have stopped moving
        let totalSpeed = Math.hypot(ball.vx, ball.vy);
        for (const disc of allDiscs) {
          totalSpeed += Math.hypot(disc.vx, disc.vy);
        }

        if (totalSpeed < 0.15) {
          // Stop everything cleanly
          ball.vx = 0;
          ball.vy = 0;
          for (const d of allDiscs) {
            d.vx = 0;
            d.vy = 0;
          }

          isMovingRef.current = false;

          // Switch turn strictly alternating
          if (turnRef.current === 'MOVING') {
            if (lastShooterRef.current === 'PLAYER') {
              // Player just moved -> Bot shoots immediately!
              turnRef.current = 'BOT_THINKING';
              setTurn('BOT_THINKING');
              setTimeout(() => {
                executeBotTurn();
              }, 120);
            } else {
              // Bot just moved -> Player's turn!
              turnRef.current = 'PLAYER';
              setTurn('PLAYER');
            }
          }
        }

        // Sync visual state
        setRenderState({
          ball: { ...ball },
          playerDiscs: playerDiscs.map((d) => ({ ...d })),
          botDiscs: botDiscs.map((d) => ({ ...d })),
        });
      }
    };

    animFrameRef.current = requestAnimationFrame(updatePhysics);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [executeBotTurn, handleGoal]);

  // Restart / Rematch
  const handleRestart = () => {
    playerScoreRef.current = 0;
    botScoreRef.current = 0;
    setPlayerScore(0);
    setBotScore(0);
    setResultModalVisible(false);
    resultModalVisibleRef.current = false;
    setGoalAnnouncement(null);
    physicsRef.current = getInitialPositions();
    setRenderState(getInitialPositions());
    lastShooterRef.current = 'BOT';
    turnRef.current = 'PLAYER';
    setTurn('PLAYER');
  };

  // Touch & Drag Controls for Player's Turn
  const handleTouchStart = (e) => {
    if (turnRef.current !== 'PLAYER' || isMovingRef.current) return;
    const { locationX, locationY } = e.nativeEvent;

    // Find if touching any player disc
    const { playerDiscs } = physicsRef.current;
    let selected = null;
    let minDist = DISC_RADIUS * 1.8;

    for (const disc of playerDiscs) {
      const d = Math.hypot(disc.x - locationX, disc.y - locationY);
      if (d < minDist) {
        minDist = d;
        selected = disc;
      }
    }

    if (selected) {
      playTapSound();
      triggerLightHaptic();
      setDragAim({
        discId: selected.id,
        discX: selected.x,
        discY: selected.y,
        touchX: locationX,
        touchY: locationY,
        dx: 0,
        dy: 0,
        power: 0,
      });
    }
  };

  const handleTouchMove = (e) => {
    if (!dragAim) return;
    const { locationX, locationY } = e.nativeEvent;
    const rawDx = dragAim.discX - locationX;
    const rawDy = dragAim.discY - locationY;
    const rawDist = Math.hypot(rawDx, rawDy);

    const clampedDist = Math.min(rawDist, MAX_PULL);
    const angle = Math.atan2(rawDy, rawDx);

    setDragAim((prev) => ({
      ...prev,
      touchX: locationX,
      touchY: locationY,
      dx: Math.cos(angle) * clampedDist,
      dy: Math.sin(angle) * clampedDist,
      power: clampedDist / MAX_PULL,
    }));
  };

  const handleTouchEnd = () => {
    if (!dragAim) return;

    if (turnRef.current !== 'PLAYER') {
      setDragAim(null);
      return;
    }

    if (dragAim.power > 0.12) {
      // Find the disc and apply velocity
      const disc = physicsRef.current.playerDiscs.find((d) => d.id === dragAim.discId);
      if (disc) {
        playSnapTickSound();
        triggerMediumHaptic();

        disc.vx = dragAim.dx * POWER_SCALE;
        disc.vy = dragAim.dy * POWER_SCALE;

        lastShooterRef.current = 'PLAYER';
        turnRef.current = 'MOVING';
        setTurn('MOVING');
        isMovingRef.current = true;
      }
    }

    setDragAim(null);
  };

  const { ball, playerDiscs, botDiscs } = renderState;

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={styles.container}>
        {/* MiniGameHeader */}
        <MiniGameHeader
          floorNum={4}
          gameTitle="TABLE SOCCER"
          category="TURN-BASED 1v1"
          accentColor="#00F5FF"
          score={playerScore}
          highScore={matchesWon}
          onBack={onBackToHub}
          onBackToHub={onBackToHub}
        />

        {/* Live Scoreboard Bar */}
        <View style={styles.scoreboard}>
          {/* Player Team (Cyan) */}
          <View style={styles.teamBadge}>
            <View style={[styles.teamDot, { backgroundColor: '#00F5FF' }]} />
            <Text style={styles.teamName}>YOU</Text>
            <Text style={styles.teamScoreCyan}>{playerScore}</Text>
          </View>

          {/* VS Divider & Turn Indicator */}
          <View style={styles.matchStatusBadge}>
            <Text
              style={[
                styles.turnText,
                { color: turn === 'PLAYER' ? '#00F5FF' : turn === 'BOT_THINKING' ? '#FF0055' : '#FFE600' },
              ]}
            >
              {turn === 'PLAYER'
                ? '🟢 YOUR TURN'
                : turn === 'BOT_THINKING'
                ? '🔴 BOT SHOOTING'
                : turn === 'GOAL'
                ? '⚽ GOAL!'
                : '⚡ IN MOTION'}
            </Text>
            <Text style={styles.targetGoalsText}>FIRST TO {WINNING_GOALS}</Text>
          </View>

          {/* Bot Team (Red) */}
          <View style={styles.teamBadge}>
            <Text style={styles.teamScoreRed}>{botScore}</Text>
            <Text style={styles.teamName}>BOT</Text>
            <View style={[styles.teamDot, { backgroundColor: '#FF0055' }]} />
          </View>
        </View>

        {/* Goal Announcement Banner */}
        {goalAnnouncement ? (
          <View style={styles.goalBanner}>
            <Text style={styles.goalBannerText}>{goalAnnouncement}</Text>
          </View>
        ) : null}

        {/* Scaled Table Soccer Pitch */}
        <View style={styles.pitchWrapper}>
          <View
            style={[
              styles.pitch,
              {
                width: PITCH_W,
                height: PITCH_H,
                transform: [{ scale: pitchScale }],
              },
            ]}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <Svg width={PITCH_W} height={PITCH_H} style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id="pitchGrass" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#081A16" />
                  <Stop offset="50%" stopColor="#04120E" />
                  <Stop offset="100%" stopColor="#081A16" />
                </LinearGradient>
                <LinearGradient id="playerDiscGlow" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor="#00F5FF" />
                  <Stop offset="100%" stopColor="#0066FF" />
                </LinearGradient>
                <LinearGradient id="botDiscGlow" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor="#FF0055" />
                  <Stop offset="100%" stopColor="#990022" />
                </LinearGradient>
              </Defs>

              {/* Pitch Field */}
              <Rect width={PITCH_W} height={PITCH_H} fill="url(#pitchGrass)" rx={14} />

              {/* Pitch Outer Line */}
              <Rect
                x={8}
                y={8}
                width={PITCH_W - 16}
                height={PITCH_H - 16}
                fill="none"
                stroke="rgba(0, 245, 212, 0.28)"
                strokeWidth={2}
                rx={10}
              />

              {/* Half-Way Line */}
              <Line
                x1={8}
                y1={PITCH_H / 2}
                x2={PITCH_W - 8}
                y2={PITCH_H / 2}
                stroke="rgba(0, 245, 212, 0.28)"
                strokeWidth={2}
              />

              {/* Center Circle & Spot */}
              <Circle
                cx={PITCH_W / 2}
                cy={PITCH_H / 2}
                r={46}
                fill="none"
                stroke="rgba(0, 245, 212, 0.25)"
                strokeWidth={2}
              />
              <Circle cx={PITCH_W / 2} cy={PITCH_H / 2} r={3.5} fill="#00F5D4" />

              {/* Top Goal Box (Bot) */}
              <Rect
                x={(PITCH_W - 160) / 2}
                y={8}
                width={160}
                height={68}
                fill="none"
                stroke="rgba(255, 0, 85, 0.22)"
                strokeWidth={1.5}
              />
              {/* Bot Goal Mouth (Opening) */}
              <Rect
                x={GOAL_LEFT}
                y={0}
                width={GOAL_W}
                height={GOAL_DEPTH}
                fill="rgba(255, 0, 85, 0.15)"
                stroke="#FF0055"
                strokeWidth={2}
              />

              {/* Bottom Goal Box (Player) */}
              <Rect
                x={(PITCH_W - 160) / 2}
                y={PITCH_H - 76}
                width={160}
                height={68}
                fill="none"
                stroke="rgba(0, 245, 255, 0.22)"
                strokeWidth={1.5}
              />
              {/* Player Goal Mouth (Opening) */}
              <Rect
                x={GOAL_LEFT}
                y={PITCH_H - GOAL_DEPTH}
                width={GOAL_W}
                height={GOAL_DEPTH}
                fill="rgba(0, 245, 255, 0.15)"
                stroke="#00F5FF"
                strokeWidth={2}
              />

              {/* Slingshot Aim Trajectory Line */}
              {dragAim ? (
                <G>
                  {/* Aim Line with Arrow Direction */}
                  <Line
                    x1={dragAim.discX}
                    y1={dragAim.discY}
                    x2={dragAim.discX + dragAim.dx * 1.8}
                    y2={dragAim.discY + dragAim.dy * 1.8}
                    stroke="#00F5FF"
                    strokeWidth={3}
                    strokeDasharray="5 4"
                  />
                  {/* Pull Indicator dot */}
                  <Circle
                    cx={dragAim.discX - dragAim.dx}
                    cy={dragAim.discY - dragAim.dy}
                    r={6}
                    fill="rgba(0, 245, 255, 0.65)"
                  />
                </G>
              ) : null}

              {/* Bot Discs (Red) */}
              {botDiscs.map((disc) => (
                <G key={disc.id}>
                  {/* Outer Glow */}
                  <Circle
                    cx={disc.x}
                    cy={disc.y}
                    r={disc.radius + 2}
                    stroke="rgba(255, 0, 85, 0.45)"
                    strokeWidth={1.5}
                    fill="none"
                  />
                  {/* Core Disc Body */}
                  <Circle
                    cx={disc.x}
                    cy={disc.y}
                    r={disc.radius}
                    fill="url(#botDiscGlow)"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  />
                  {/* Inner Ring */}
                  <Circle cx={disc.x} cy={disc.y} r={7} fill="#18040A" />
                  <Circle cx={disc.x} cy={disc.y} r={3} fill="#FF0055" />
                </G>
              ))}

              {/* Player Discs (Cyan/Blue) */}
              {playerDiscs.map((disc) => {
                const isSelected = dragAim && dragAim.discId === disc.id;
                return (
                  <G key={disc.id}>
                    {/* Selected Pulsing Ring */}
                    {isSelected ? (
                      <Circle
                        cx={disc.x}
                        cy={disc.y}
                        r={disc.radius + 6}
                        stroke="#00F5FF"
                        strokeWidth={2}
                        fill="none"
                      />
                    ) : null}
                    {/* Outer Glow */}
                    <Circle
                      cx={disc.x}
                      cy={disc.y}
                      r={disc.radius + 2}
                      stroke="rgba(0, 245, 255, 0.45)"
                      strokeWidth={1.5}
                      fill="none"
                    />
                    {/* Core Disc Body */}
                    <Circle
                      cx={disc.x}
                      cy={disc.y}
                      r={disc.radius}
                      fill="url(#playerDiscGlow)"
                      stroke="#FFFFFF"
                      strokeWidth={2}
                    />
                    {/* Inner Ring */}
                    <Circle cx={disc.x} cy={disc.y} r={7} fill="#041218" />
                    <Circle cx={disc.x} cy={disc.y} r={3} fill="#00F5FF" />
                  </G>
                );
              })}

              {/* Soccer Ball */}
              <G>
                {/* Glow Aura */}
                <Circle
                  cx={ball.x}
                  cy={ball.y}
                  r={ball.radius + 3}
                  stroke="rgba(255, 230, 0, 0.4)"
                  strokeWidth={1.5}
                  fill="none"
                />
                {/* Ball Body */}
                <Circle cx={ball.x} cy={ball.y} r={ball.radius} fill="#FFFFFF" stroke="#000000" strokeWidth={1.5} />
                {/* Football Pentagons */}
                <Circle cx={ball.x} cy={ball.y} r={3.5} fill="#111827" />
                <Path
                  d={`M ${ball.x - 5} ${ball.y - 4} L ${ball.x + 5} ${ball.y + 4} M ${ball.x + 5} ${ball.y - 4} L ${ball.x - 5} ${ball.y + 4}`}
                  stroke="#111827"
                  strokeWidth={1}
                />
              </G>
            </Svg>
          </View>
        </View>

        {/* Match Result Modal */}
        <GameResultModal
          visible={resultModalVisible}
          type={modalType}
          title={modalType === 'VICTORY' ? 'MATCH VICTORY!' : 'MATCH DEFEAT!'}
          subtitle={`Final Score: YOU ${playerScore} - ${botScore} BOT`}
          score={playerScore * 100}
          highScore={matchesWon * 100}
          onRestart={handleRestart}
          onBackToHub={onBackToHub}
        />
      </View>
    </JuiceEngine>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#03080D',
  },
  scoreboard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(8, 18, 28, 0.95)',
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(0, 245, 212, 0.18)',
  },
  teamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teamDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  teamName: {
    fontFamily: monoFont,
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  teamScoreCyan: {
    fontFamily: monoFont,
    color: '#00F5FF',
    fontSize: 20,
    fontWeight: '900',
  },
  teamScoreRed: {
    fontFamily: monoFont,
    color: '#FF0055',
    fontSize: 20,
    fontWeight: '900',
  },
  matchStatusBadge: {
    alignItems: 'center',
  },
  turnText: {
    fontFamily: monoFont,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  targetGoalsText: {
    fontFamily: monoFont,
    color: '#64748B',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
  },
  goalBanner: {
    position: 'absolute',
    top: 130,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 245, 255, 0.25)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#00F5FF',
    zIndex: 100,
  },
  goalBannerText: {
    fontFamily: monoFont,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  pitchWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pitch: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(0, 245, 212, 0.45)',
    backgroundColor: '#05120E',
  },
});
