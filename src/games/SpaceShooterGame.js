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
  triggerSliceHaptic,
  triggerGameOverHaptic,
} from '../utils/haptics';
import {
  playTapSound,
  playPerfectSound,
  playGameOverSound,
} from '../utils/sound';

const STORAGE_KEY = '@game_tower:best_shooter_v1';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export default function SpaceShooterGame({ onBackToHub, onScoreUpdate }) {
  const { width, height } = useWindowDimensions();
  const arenaWidth = Math.min(390, width - 24);
  const arenaHeight = Math.min(490, Math.max(350, height - 210));
  const shipW = 46;
  const shipH = 26;
  const shipY = arenaHeight - 44;

  const juiceRef = useRef(null);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [status, setStatus] = useState('PLAYING');
  const [frame, setFrame] = useState({
    shipX: (arenaWidth - shipW) / 2,
    bullets: [],
    enemies: [],
  });

  const engRef = useRef({
    running: true,
    shipX: (arenaWidth - shipW) / 2,
    bullets: [],
    enemies: [],
    fireTimer: 0,
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
      running: true,
      shipX: (arenaWidth - shipW) / 2,
      bullets: [],
      enemies: [],
      fireTimer: 0,
      spawnTimer: 0,
      score: 0,
    };
    setScore(0);
    setStatus('PLAYING');
    setFrame({
      shipX: (arenaWidth - shipW) / 2,
      bullets: [],
      enemies: [],
    });
  }, [arenaWidth]);

  useEffect(() => {
    let rafId = null;
    let lastTs = 0;

    const tick = (ts) => {
      if (!lastTs) lastTs = ts;
      const dt = Math.min(0.032, (ts - lastTs) / 1000);
      lastTs = ts;

      const eng = engRef.current;
      if (eng.running) {
        eng.fireTimer += dt;
        if (eng.fireTimer >= 0.28) {
          eng.fireTimer = 0;
          eng.bullets.push(
            { id: `bl_${ts}`, x: eng.shipX + 6, y: shipY - 6 },
            { id: `br_${ts}`, x: eng.shipX + shipW - 10, y: shipY - 6 }
          );
          playTapSound();
        }

        eng.spawnTimer += dt;
        if (eng.spawnTimer >= 0.82) {
          eng.spawnTimer = 0;
          const ex = 16 + Math.random() * (arenaWidth - 64);
          const colors = [COLORS.magenta, COLORS.solarGold, COLORS.cyan, '#C77DFF'];
          eng.enemies.push({
            id: `en_${ts}_${Math.random()}`,
            x: ex,
            y: -26,
            w: 32,
            h: 24,
            speed: 95 + Math.min(140, eng.score * 0.15),
            color: colors[Math.floor(Math.random() * colors.length)],
            alive: true,
          });
        }

        // Update bullets
        const nextBullets = [];
        for (let i = 0; i < eng.bullets.length; i += 1) {
          const b = eng.bullets[i];
          const ny = b.y - 420 * dt;
          let hit = false;

          for (let j = 0; j < eng.enemies.length; j += 1) {
            const en = eng.enemies[j];
            if (!en.alive) continue;
            if (
              b.x >= en.x - 4 &&
              b.x <= en.x + en.w + 4 &&
              ny <= en.y + en.h &&
              ny >= en.y
            ) {
              en.alive = false;
              hit = true;
              eng.score += 25;
              setScore(eng.score);
              persistBest(eng.score);
              triggerSliceHaptic();
              playPerfectSound((eng.score / 25) % 8 + 1);
              if (juiceRef.current) {
                juiceRef.current.shake(4, 3);
                juiceRef.current.burst(en.x + 16, en.y + 80, en.color, 10);
              }
              break;
            }
          }

          if (!hit && ny > -10) {
            nextBullets.push({ ...b, y: ny });
          }
        }
        eng.bullets = nextBullets;

        // Update enemies
        const nextEnemies = [];
        for (let i = 0; i < eng.enemies.length; i += 1) {
          const en = eng.enemies[i];
          if (!en.alive) continue;
          const ny = en.y + en.speed * dt;
          if (ny + en.h >= shipY + 6) {
            eng.running = false;
            setStatus('GAME_OVER');
            triggerGameOverHaptic();
            playGameOverSound();
            if (juiceRef.current) {
              juiceRef.current.shake(12, 9);
              juiceRef.current.flash(COLORS.danger);
            }
            break;
          }
          nextEnemies.push({ ...en, y: ny });
        }
        eng.enemies = nextEnemies;

        setFrame({
          shipX: eng.shipX,
          bullets: [...eng.bullets],
          enemies: [...eng.enemies],
        });
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [arenaWidth, shipY, persistBest]);

  const moveShipTo = useCallback(
    (touchX) => {
      engRef.current.shipX = Math.max(
        8,
        Math.min(arenaWidth - shipW - 8, touchX - shipW / 2)
      );
    },
    [arenaWidth]
  );

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={localStyles.container}>
        <LinearGradient
          colors={['#020208', '#090720', '#180934']}
          style={StyleSheet.absoluteFillObject}
        />

        <MiniGameHeader
          title="SPACE SHOOTER NEO"
          floorLabel="FLOOR 20 // APEX STARFIGHTER"
          score={score}
          bestScore={bestScore}
          accentColor={COLORS.cyan}
          onBack={onBackToHub}
          onReset={resetGame}
        />

        <View style={localStyles.body}>
          <View
            onTouchStart={(e) => moveShipTo(e.nativeEvent.locationX)}
            onTouchMove={(e) => moveShipTo(e.nativeEvent.locationX)}
            style={[
              localStyles.arena,
              { width: arenaWidth, height: arenaHeight },
            ]}
          >
            {/* Dual Plasma Bullets */}
            {frame.bullets.map((b) => (
              <View
                key={b.id}
                style={[localStyles.bullet, { left: b.x, top: b.y }]}
              />
            ))}

            {/* Alien Neon Drones */}
            {frame.enemies.map((en) => (
              <View
                key={en.id}
                style={[
                  localStyles.enemy,
                  {
                    left: en.x,
                    top: en.y,
                    width: en.w,
                    height: en.h,
                    backgroundColor: en.color,
                  },
                ]}
              />
            ))}

            {/* Player Starfighter */}
            <View
              style={[
                localStyles.ship,
                {
                  left: frame.shipX,
                  top: shipY,
                  width: shipW,
                  height: shipH,
                },
              ]}
            />

            {status === 'GAME_OVER' && (
              <View style={localStyles.overlay}>
                <Text style={localStyles.overTitle}>SECTOR BREACHED</Text>
                <Pressable onPress={resetGame} style={localStyles.retryBtn}>
                  <Text style={localStyles.retryText}>SCRAMBLE FIGHTER</Text>
                </Pressable>
              </View>
            )}
          </View>

          <Text style={localStyles.hint}>
            SLIDE FINGER ACROSS ARENA TO STEER STARFIGHTER
          </Text>
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
    backgroundColor: 'rgba(5, 6, 18, 0.94)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 245, 255, 0.42)',
    position: 'relative',
    overflow: 'hidden',
  },
  bullet: {
    position: 'absolute',
    width: 4,
    height: 12,
    borderRadius: 2,
    backgroundColor: COLORS.cyan,
  },
  enemy: {
    position: 'absolute',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  ship: {
    position: 'absolute',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: COLORS.cyan,
    borderWidth: 2,
    borderColor: '#FFFFFF',
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
  hint: {
    fontSize: 9.5,
    fontFamily: monoFont,
    fontWeight: '800',
    color: COLORS.textSecondary,
    marginTop: 10,
  },
});
