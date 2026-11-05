import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import GameResultModal from '../components/GameResultModal';
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
  playGameOverSound,
} from '../utils/sound';

const STORAGE_KEY = '@game_tower:best_whack_v2';

const WHACK_MODES = {
  GRID_16: {
    id: 'GRID_16',
    label: '16 BOTS (4×4)',
    cols: 4,
    total: 16,
    maxActive: 3,
    spawnMs: 440,
    time: 30,
    accent: COLORS.magenta,
  },
  GRID_25: {
    id: 'GRID_25',
    label: '25 BOTS (5×5)',
    cols: 5,
    total: 25,
    maxActive: 5,
    spawnMs: 360,
    time: 35,
    accent: COLORS.cyan,
  },
};

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export default function WhackABotGame({ onBackToHub, onScoreUpdate }) {
  const { width } = useWindowDimensions();
  const boardSize = Math.min(360, width - 24);

  const [modeKey, setModeKey] = useState('GRID_16');
  const activeMode = WHACK_MODES[modeKey] || WHACK_MODES.GRID_16;
  const cols = activeMode.cols;
  const totalHoles = activeMode.total;

  const gap = cols === 5 ? 6 : 8;
  const holeSize = Math.floor((boardSize - 16 - (cols - 1) * gap) / cols);

  const juiceRef = useRef(null);

  // Active bots: map of holeIndex -> { type: 'BOT'|'GOLD'|'BOMB', expireAt: timestamp, id: string }
  const [activeBots, setActiveBots] = useState({});
  const [timeLeft, setTimeLeft] = useState(activeMode.time);
  const [combo, setCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) setBestScore(parseInt(saved, 10) || 0);
      } catch {}
    })();
  }, []);

  const updateBest = useCallback(
    async (nextScore) => {
      if (onScoreUpdate) onScoreUpdate(nextScore);
      if (nextScore > bestScore) {
        setBestScore(nextScore);
        try {
          await AsyncStorage.setItem(STORAGE_KEY, String(nextScore));
        } catch {}
      }
    },
    [bestScore, onScoreUpdate]
  );

  const startNewGame = useCallback((overrideModeKey) => {
    const m = overrideModeKey ? WHACK_MODES[overrideModeKey] : activeMode;
    setScore(0);
    setCombo(0);
    setTimeLeft(m.time);
    setActiveBots({});
    setRunning(true);
    if (juiceRef.current) juiceRef.current.flash(m.accent);
  }, [activeMode]);

  const switchMode = (newKey) => {
    if (newKey === modeKey) return;
    triggerLightHaptic();
    playTapSound();
    setModeKey(newKey);
    startNewGame(newKey);
  };

  // Bot spawn & expiration loop
  useEffect(() => {
    if (!running) return undefined;

    const spawnTimer = setInterval(() => {
      setActiveBots((prev) => {
        const now = Date.now();
        const next = {};

        // Remove expired bots
        Object.entries(prev).forEach(([idx, bot]) => {
          if (bot.expireAt > now) {
            next[idx] = bot;
          }
        });

        // Spawn new bot if under maxActive threshold
        const activeCount = Object.keys(next).length;
        if (activeCount < activeMode.maxActive) {
          const emptyIndices = [];
          for (let i = 0; i < totalHoles; i += 1) {
            if (!next[i]) emptyIndices.push(i);
          }

          if (emptyIndices.length > 0) {
            const chosenHole =
              emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
            const roll = Math.random();
            const type = roll < 0.16 ? 'BOMB' : roll < 0.38 ? 'GOLD' : 'BOT';
            const duration = type === 'BOMB' ? 1800 : type === 'GOLD' ? 1100 : 1400;

            next[chosenHole] = {
              id: `b_${now}_${chosenHole}`,
              type,
              expireAt: now + duration,
            };
          }
        }

        return next;
      });
    }, activeMode.spawnMs);

    const clockTimer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setRunning(false);
          setActiveBots({});
          triggerGameOverHaptic();
          playGameOverSound();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      clearInterval(spawnTimer);
      clearInterval(clockTimer);
    };
  }, [running, activeMode, totalHoles]);

  const handleHoleTap = useCallback(
    (idx) => {
      if (!running || !activeBots[idx]) return;

      const bot = activeBots[idx];

      // Immediately clear tapped bot
      setActiveBots((prev) => {
        const next = { ...prev };
        delete next[idx];
        return next;
      });

      if (bot.type === 'BOMB') {
        setCombo(0);
        const nextScore = Math.max(0, score - 50);
        setScore(nextScore);
        triggerGameOverHaptic();
        playGameOverSound();
        if (juiceRef.current) {
          juiceRef.current.shake(12, 8);
          juiceRef.current.flash(COLORS.danger);
          juiceRef.current.popup('PLASMA BOMB!', '-50 PTS', COLORS.danger);
        }
        return;
      }

      const nextCombo = combo + 1;
      const base = bot.type === 'GOLD' ? 60 : 25;
      const gained = base + Math.min(50, nextCombo * 5);
      const nextScore = score + gained;

      setCombo(nextCombo);
      setScore(nextScore);
      updateBest(nextScore);

      if (bot.type === 'GOLD') {
        triggerPerfectHaptic(3);
        playPerfectSound(7);
        if (juiceRef.current) {
          juiceRef.current.celebrate(
            `GOLDEN BOT! +${gained}`,
            `STREAK x${nextCombo}`,
            COLORS.solarGold
          );
        }
      } else {
        triggerLightHaptic();
        playTapSound();
        if (juiceRef.current) {
          juiceRef.current.shake(4, 3);
          juiceRef.current.burst(undefined, undefined, COLORS.cyan, 10);
          if (nextCombo >= 3) {
            juiceRef.current.popup(`+${gained}`, `x${nextCombo} STREAK`, COLORS.cyan);
          }
        }
      }
    },
    [running, activeBots, combo, score, updateBest]
  );

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={localStyles.container}>
        <LinearGradient
          colors={['#03030A', '#120822', '#240B36']}
          style={StyleSheet.absoluteFillObject}
        />

        <MiniGameHeader
          title={`WHACK-A-BOT // ${totalHoles} HOLES`}
          floorLabel="FLOOR 15 // MULTI-REFLEX"
          score={score}
          bestScore={bestScore}
          accentColor={activeMode.accent}
          onBack={onBackToHub}
          onReset={() => startNewGame()}
        />

        <View style={localStyles.body}>
          {/* Mode Selector Bar (16 vs 25 Holes) */}
          <View style={localStyles.modeSelectorBar}>
            {Object.keys(WHACK_MODES).map((k) => {
              const m = WHACK_MODES[k];
              const isSelected = k === modeKey;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => switchMode(k)}
                  style={[
                    localStyles.modePill,
                    isSelected && {
                      backgroundColor: `${m.accent}25`,
                      borderColor: m.accent,
                    },
                  ]}
                >
                  <Text
                    style={[
                      localStyles.modePillText,
                      { color: isSelected ? m.accent : COLORS.textMuted },
                    ]}
                  >
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Time & Streak Status Bar */}
          <View style={[localStyles.statusRow, { width: boardSize }]}>
            <Text
              style={[
                localStyles.timerText,
                { color: timeLeft <= 5 ? COLORS.danger : activeMode.accent },
              ]}
            >
              {`CLOCK: ${timeLeft}S`}
            </Text>
            <Text style={[localStyles.comboText, { color: activeMode.accent }]}>
              {`STREAK x${combo + 1}`}
            </Text>
          </View>

          {/* 16 or 25 Cyber Bot Holes Matrix */}
          <View
            style={[
              localStyles.grid,
              {
                width: boardSize,
                height: boardSize,
                borderColor: activeMode.accent,
              },
            ]}
          >
            {Array.from({ length: totalHoles }).map((_, idx) => {
              const bot = activeBots[idx];
              const active = !!bot;
              const isGold = active && bot.type === 'GOLD';
              const isBomb = active && bot.type === 'BOMB';
              const color = isBomb
                ? COLORS.danger
                : isGold
                  ? COLORS.solarGold
                  : COLORS.cyan;

              return (
                <Pressable
                  key={`hole_${idx}`}
                  onPressIn={() => handleHoleTap(idx)}
                  style={[
                    localStyles.hole,
                    {
                      width: holeSize,
                      height: holeSize,
                      borderColor: active ? color : 'rgba(255, 255, 255, 0.14)',
                      backgroundColor: active
                        ? `${color}2E`
                        : 'rgba(255, 255, 255, 0.04)',
                    },
                  ]}
                >
                  {active && (
                    <View style={localStyles.botContent}>
                      <Text
                        style={[
                          localStyles.botGlyph,
                          { fontSize: cols === 5 ? 22 : 28 },
                        ]}
                      >
                        {isBomb ? '💣' : isGold ? '👑' : '🤖'}
                      </Text>
                      <Text
                        style={[
                          localStyles.botTag,
                          {
                            color,
                            fontSize: cols === 5 ? 7 : 8.5,
                          },
                        ]}
                      >
                        {isBomb ? 'AVOID!' : isGold ? '+60 GOLD' : 'SMASH!'}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Game Over / Purge Complete Modal */}
          <GameResultModal
            visible={!running}
            type={score > 120 ? 'VICTORY' : 'GAME_OVER'}
            title={score > 120 ? 'CYBER BOTS PURGED!' : 'TIME DEPLETED'}
            subtitle={`PURGED ${totalHoles}-BOT GRID // MAXIMUM STREAK: x${combo + 1}`}
            score={score}
            bestScore={bestScore}
            accentColor={activeMode.accent}
            onRetry={() => startNewGame()}
            retryLabel="PLAY AGAIN"
            onBackToHub={onBackToHub}
          />
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
    paddingBottom: 16,
  },
  modeSelectorBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  modePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backgroundColor: 'rgba(8, 8, 24, 0.65)',
  },
  modePillText: {
    fontFamily: monoFont,
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  timerText: {
    fontSize: 13,
    fontFamily: monoFont,
    fontWeight: '900',
  },
  comboText: {
    fontSize: 13,
    fontFamily: monoFont,
    fontWeight: '900',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
    backgroundColor: 'rgba(8, 8, 22, 0.94)',
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 8,
  },
  hole: {
    borderRadius: 14,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  botGlyph: {
    textAlign: 'center',
  },
  botTag: {
    fontFamily: monoFont,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: 0.5,
  },
});
