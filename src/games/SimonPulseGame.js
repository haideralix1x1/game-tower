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
import {
  triggerLightHaptic,
  triggerPerfectHaptic,
  triggerGameOverHaptic,
} from '../utils/haptics';
import {
  playPerfectSound,
  playGameOverSound,
} from '../utils/sound';

const STORAGE_KEY = '@game_tower:best_simon_v1';

const PADS = [
  { id: 0, color: '#00F5FF', label: 'A1' },
  { id: 1, color: '#FF007F', label: 'A2' },
  { id: 2, color: '#00F5D4', label: 'A3' },
  { id: 3, color: '#FFD166', label: 'B1' },
  { id: 4, color: '#C77DFF', label: 'B2' },
  { id: 5, color: '#FF5E00', label: 'B3' },
  { id: 6, color: '#4361EE', label: 'C1' },
  { id: 7, color: '#FF2A55', label: 'C2' },
  { id: 8, color: '#80FF72', label: 'C3' },
];

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export default function SimonPulseGame({ onBackToHub, onScoreUpdate }) {
  const { width } = useWindowDimensions();
  const boardSize = Math.min(348, width - 32);
  const padSize = Math.floor((boardSize - 34) / 3);
  const juiceRef = useRef(null);

  const [sequence, setSequence] = useState([]);
  const [userStep, setUserStep] = useState(0);
  const [activePad, setActivePad] = useState(null);
  const [phase, setPhase] = useState('IDLE');
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const timersRef = useRef([]);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) setBestScore(parseInt(saved, 10) || 0);
      } catch {}
    })();
    return () => clearAllTimers();
  }, [clearAllTimers]);

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

  const playSequence = useCallback(
    (seq) => {
      clearAllTimers();
      setPhase('WATCH');
      setUserStep(0);

      const intervalMs = Math.max(290, 540 - seq.length * 18);

      seq.forEach((padId, idx) => {
        const t1 = setTimeout(() => {
          setActivePad(padId);
          triggerLightHaptic();
          playPerfectSound(padId + 1);
        }, (idx + 1) * intervalMs);

        const t2 = setTimeout(() => {
          setActivePad(null);
        }, (idx + 1) * intervalMs + intervalMs * 0.6);

        timersRef.current.push(t1, t2);
      });

      const endTimer = setTimeout(() => {
        setActivePad(null);
        setPhase('INPUT');
      }, (seq.length + 1) * intervalMs);
      timersRef.current.push(endTimer);
    },
    [clearAllTimers]
  );

  const startNewRun = useCallback(() => {
    const firstPad = Math.floor(Math.random() * 9);
    const nextSeq = [firstPad];
    setSequence(nextSeq);
    setScore(0);
    playSequence(nextSeq);
  }, [playSequence]);

  const handlePadPress = useCallback(
    (padId) => {
      if (phase !== 'INPUT') return;

      setActivePad(padId);
      setTimeout(() => setActivePad(null), 160);

      if (padId !== sequence[userStep]) {
        setPhase('GAME_OVER');
        triggerGameOverHaptic();
        playGameOverSound();
        if (juiceRef.current) {
          juiceRef.current.shake(12, 8);
          juiceRef.current.flash(COLORS.danger);
        }
        return;
      }

      triggerLightHaptic();
      playPerfectSound(padId + 1);
      if (juiceRef.current) {
        juiceRef.current.burst(undefined, undefined, PADS[padId].color, 10);
      }

      const nextStep = userStep + 1;
      if (nextStep >= sequence.length) {
        const gained = sequence.length * 25;
        const nextScore = score + gained;
        setScore(nextScore);
        updateBest(nextScore);
        triggerPerfectHaptic(2);
        if (juiceRef.current) {
          juiceRef.current.celebrate(
            `LEVEL ${sequence.length} CLEAR!`,
            `+${gained} PTS`,
            PADS[padId].color
          );
        }

        const nextSeq = [...sequence, Math.floor(Math.random() * 9)];
        setSequence(nextSeq);
        playSequence(nextSeq);
      } else {
        setUserStep(nextStep);
      }
    },
    [phase, sequence, userStep, score, updateBest, playSequence]
  );

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={localStyles.container}>
        <LinearGradient
          colors={['#03030A', '#0E0720', '#1C0B34']}
          style={StyleSheet.absoluteFillObject}
        />

        <MiniGameHeader
          title="SIMON PULSE"
          floorLabel="FLOOR 09 // SYNTH MEMORY"
          score={score}
          bestScore={bestScore}
          accentColor="#FF007F"
          onBack={onBackToHub}
          onReset={startNewRun}
        />

        <View style={localStyles.body}>
          <View style={[localStyles.statusBox, { width: boardSize }]}>
            <Text style={localStyles.statusText}>
              {phase === 'IDLE'
                ? 'PRESS START TO INITIALIZE SYNTH SEQUENCE'
                : phase === 'WATCH'
                  ? `WATCH SEQUENCE // LENGTH ${sequence.length}`
                  : phase === 'INPUT'
                    ? `REPEAT PATTERN // ${userStep}/${sequence.length}`
                    : 'SEQUENCE MISMATCH // SYSTEM HALTED'}
            </Text>
          </View>

          <View
            style={[
              localStyles.grid,
              { width: boardSize, height: boardSize },
            ]}
          >
            {PADS.map((pad) => {
              const lit = activePad === pad.id;
              return (
                <Pressable
                  key={pad.id}
                  onPress={() => handlePadPress(pad.id)}
                  style={[
                    localStyles.pad,
                    {
                      width: padSize,
                      height: padSize,
                      borderColor: lit ? '#FFFFFF' : pad.color,
                      backgroundColor: lit ? pad.color : `${pad.color}1E`,
                      transform: [{ scale: lit ? 0.95 : 1 }],
                    },
                  ]}
                >
                  <Text
                    style={[
                      localStyles.padLabel,
                      { color: lit ? '#030308' : pad.color },
                    ]}
                  >
                    {pad.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {(phase === 'IDLE' || phase === 'GAME_OVER') && (
            <Pressable onPress={startNewRun} style={localStyles.startBtn}>
              <Text style={localStyles.startBtnText}>
                {phase === 'IDLE' ? 'START SEQUENCE' : 'PLAY AGAIN'}
              </Text>
            </Pressable>
          )}
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
    paddingBottom: 20,
  },
  statusBox: {
    backgroundColor: 'rgba(255, 0, 127, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 127, 0.35)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#FF75B5',
    letterSpacing: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
    backgroundColor: 'rgba(8, 8, 22, 0.92)',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 0, 127, 0.38)',
    padding: 8,
  },
  pad: {
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  padLabel: {
    fontSize: 16,
    fontFamily: monoFont,
    fontWeight: '900',
    letterSpacing: 1,
  },
  startBtn: {
    marginTop: 20,
    backgroundColor: COLORS.cyan,
    paddingHorizontal: 26,
    paddingVertical: 13,
    borderRadius: 14,
  },
  startBtnText: {
    fontSize: 13,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#030308',
    letterSpacing: 1.6,
  },
});
