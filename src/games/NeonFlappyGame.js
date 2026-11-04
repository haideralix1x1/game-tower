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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../../styles';
import MiniGameHeader from '../components/MiniGameHeader';
import JuiceEngine from '../components/JuiceEngine';
import {
  triggerLightHaptic,
  triggerPerfectHaptic,
  triggerGameOverHaptic,
} from '../utils/haptics';
import {
  playTapSound,
  playPerfectSound,
  playGameOverSound,
} from '../utils/sound';

const STORAGE_KEY = '@game_tower:best_flappy_v1';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export default function NeonFlappyGame({ onBackToHub, onScoreUpdate }) {
  const { width, height } = useWindowDimensions();
  const arenaWidth = Math.min(380, width - 24);
  const arenaHeight = Math.min(490, Math.max(350, height - 190));
  const gapHeight = 132;
  const pipeWidth = 48;
  const droneSize = 26;
  const droneX = 72;

  const juiceRef = useRef(null);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [status, setStatus] = useState('READY');
  const [frame, setFrame] = useState({
    droneY: arenaHeight * 0.45,
    pipes: [],
  });

  const engRef = useRef({
    status: 'READY',
    droneY: arenaHeight * 0.45,
    vy: 0,
    pipes: [],
    spawnTimer: 0,
    score: 0,
    best: 0,
  });

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = parseInt(saved, 10) || 0;
          setBestScore(parsed);
          engRef.current.best = parsed;
        }
      } catch {}
    })();
  }, []);

  const persistBest = useCallback(
    async (nextScore) => {
      if (onScoreUpdate) onScoreUpdate(nextScore);
      if (nextScore > engRef.current.best) {
        engRef.current.best = nextScore;
        setBestScore(nextScore);
        try {
          await AsyncStorage.setItem(STORAGE_KEY, String(nextScore));
        } catch {}
      }
    },
    [onScoreUpdate]
  );

  const resetGame = useCallback(() => {
    engRef.current = {
      ...engRef.current,
      status: 'READY',
      droneY: arenaHeight * 0.45,
      vy: 0,
      pipes: [],
      spawnTimer: 0,
      score: 0,
    };
    setScore(0);
    setStatus('READY');
    setFrame({ droneY: arenaHeight * 0.45, pipes: [] });
  }, [arenaHeight]);

  const handleThrust = useCallback(() => {
    const eng = engRef.current;
    if (eng.status === 'GAME_OVER') return;
    if (eng.status === 'READY') {
      eng.status = 'PLAYING';
      setStatus('PLAYING');
    }
    eng.vy = -335;
    triggerLightHaptic();
    playTapSound();
    if (juiceRef.current) {
      juiceRef.current.burst(droneX, eng.droneY + 80, COLORS.cyan, 6);
    }
  }, []);

  useEffect(() => {
    let rafId = null;
    let lastTs = 0;

    const loop = (ts) => {
      if (!lastTs) lastTs = ts;
      const dt = Math.min(0.032, (ts - lastTs) / 1000);
      lastTs = ts;

      const eng = engRef.current;
      if (eng.status === 'PLAYING') {
        eng.vy += 920 * dt;
        eng.droneY += eng.vy * dt;

        eng.spawnTimer += dt;
        if (eng.spawnTimer >= 1.55) {
          eng.spawnTimer = 0;
          const minTop = 44;
          const maxTop = arenaHeight - gapHeight - 54;
          const topH = minTop + Math.random() * Math.max(40, maxTop - minTop);
          eng.pipes.push({
            id: `p_${ts}`,
            x: arenaWidth,
            topH,
            passed: false,
          });
        }

        const nextPipes = [];
        for (let i = 0; i < eng.pipes.length; i += 1) {
          const p = eng.pipes[i];
          const nx = p.x - 165 * dt;

          // Check collision
          const inX =
            droneX + droneSize > nx && droneX < nx + pipeWidth;
          const hitTop = eng.droneY < p.topH;
          const hitBottom = eng.droneY + droneSize > p.topH + gapHeight;

          if (inX && (hitTop || hitBottom)) {
            eng.status = 'GAME_OVER';
            setStatus('GAME_OVER');
            triggerGameOverHaptic();
            playGameOverSound();
            if (juiceRef.current) {
              juiceRef.current.shake(12, 9);
              juiceRef.current.flash(COLORS.danger);
            }
          }

          if (!p.passed && nx + pipeWidth < droneX) {
            p.passed = true;
            eng.score += 25;
            setScore(eng.score);
            persistBest(eng.score);
            triggerPerfectHaptic(2);
            playPerfectSound(Math.min(8, Math.floor(eng.score / 25)));
            if (juiceRef.current) {
              juiceRef.current.popup('+25 GATE!', 'CLEAR', COLORS.solarGold);
            }
          }

          if (nx > -pipeWidth - 10) {
            nextPipes.push({ ...p, x: nx });
          }
        }
        eng.pipes = nextPipes;

        if (eng.droneY <= 0 || eng.droneY + droneSize >= arenaHeight) {
          eng.status = 'GAME_OVER';
          setStatus('GAME_OVER');
          triggerGameOverHaptic();
          playGameOverSound();
          if (juiceRef.current) {
            juiceRef.current.shake(12, 9);
            juiceRef.current.flash(COLORS.danger);
          }
        }

        setFrame({
          droneY: eng.droneY,
          pipes: [...eng.pipes],
        });
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [arenaWidth, arenaHeight, persistBest]);

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={localStyles.container}>
        <LinearGradient
          colors={['#03030A', '#0A0B24', '#180D36']}
          style={StyleSheet.absoluteFillObject}
        />

        <MiniGameHeader
          title="NEON FLAPPY"
          floorLabel="FLOOR 12 // CYBER DRONE"
          score={score}
          bestScore={bestScore}
          accentColor={COLORS.cyan}
          onBack={onBackToHub}
          onReset={resetGame}
        />

        <View style={localStyles.body}>
          <Pressable
            onPressIn={handleThrust}
            style={[
              localStyles.arena,
              { width: arenaWidth, height: arenaHeight },
            ]}
          >
            {/* Laser Gate Pillars */}
            {frame.pipes.map((p) => (
              <React.Fragment key={p.id}>
                <View
                  style={[
                    localStyles.pipe,
                    {
                      left: p.x,
                      top: 0,
                      width: pipeWidth,
                      height: p.topH,
                    },
                  ]}
                />
                <View
                  style={[
                    localStyles.pipe,
                    {
                      left: p.x,
                      top: p.topH + gapHeight,
                      width: pipeWidth,
                      height: Math.max(0, arenaHeight - (p.topH + gapHeight)),
                    },
                  ]}
                />
              </React.Fragment>
            ))}

            {/* Cyber Drone */}
            <View
              style={[
                localStyles.drone,
                {
                  left: droneX,
                  top: frame.droneY,
                  width: droneSize,
                  height: droneSize,
                },
              ]}
            />

            {status === 'READY' && (
              <View style={localStyles.centerPrompt} pointerEvents="none">
                <Text style={localStyles.promptText}>
                  TAP ANYWHERE TO THRUST DRONE
                </Text>
              </View>
            )}

            {status === 'GAME_OVER' && (
              <View style={localStyles.overlay}>
                <Text style={localStyles.overTitle}>DRONE DOWN</Text>
                <Pressable onPress={resetGame} style={localStyles.retryBtn}>
                  <Text style={localStyles.retryText}>RELAUNCH DRONE</Text>
                </Pressable>
              </View>
            )}
          </Pressable>
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
  arena: {
    backgroundColor: 'rgba(6, 8, 22, 0.94)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 245, 255, 0.42)',
    position: 'relative',
    overflow: 'hidden',
  },
  pipe: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 0, 127, 0.35)',
    borderWidth: 1.5,
    borderColor: COLORS.magenta,
  },
  drone: {
    position: 'absolute',
    borderRadius: 8,
    backgroundColor: COLORS.cyan,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  centerPrompt: {
    position: 'absolute',
    bottom: 60,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  promptText: {
    fontSize: 11.5,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.cyan,
    backgroundColor: 'rgba(4, 4, 14, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cyan,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 4, 14, 0.86)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  overTitle: {
    fontSize: 26,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.magenta,
  },
  retryBtn: {
    backgroundColor: COLORS.cyan,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
  },
  retryText: {
    fontSize: 12.5,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#030308',
  },
});
