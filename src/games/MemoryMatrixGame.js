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
  triggerSliceHaptic,
  triggerPerfectHaptic,
} from '../utils/haptics';
import {
  playTapSound,
  playSliceSound,
  playPerfectSound,
} from '../utils/sound';

const STORAGE_KEY = '@game_tower:best_memory_v1';

const SYMBOLS = [
  { glyph: '◈', color: '#00F5FF', name: 'PRISM' },
  { glyph: '⚡', color: '#FFD166', name: 'VOLT' },
  { glyph: '❖', color: '#FF007F', name: 'NEXUS' },
  { glyph: '▲', color: '#00F5D4', name: 'DELTA' },
  { glyph: '✦', color: '#C77DFF', name: 'NOVA' },
  { glyph: '⬢', color: '#FF6D00', name: 'HEX' },
  { glyph: '◉', color: '#4361EE', name: 'CORE' },
  { glyph: '✧', color: '#FF2A55', name: 'PULSE' },
];

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const createDeck = () => {
  const pairs = [...SYMBOLS, ...SYMBOLS].map((item, idx) => ({
    id: `card_${idx}_${Math.random()}`,
    ...item,
    flipped: false,
    matched: false,
  }));
  for (let i = pairs.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return pairs;
};

export default function MemoryMatrixGame({ onBackToHub, onScoreUpdate }) {
  const { width } = useWindowDimensions();
  const boardSize = Math.min(360, width - 32);
  const cardSize = Math.floor((boardSize - 38) / 4);
  const juiceRef = useRef(null);

  const [cards, setCards] = useState(() => createDeck());
  const [selectedIds, setSelectedIds] = useState([]);
  const [moves, setMoves] = useState(0);
  const [combo, setCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const lockRef = useRef(false);

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

  const resetDeck = useCallback(() => {
    lockRef.current = false;
    setCards(createDeck());
    setSelectedIds([]);
    setMoves(0);
    setCombo(0);
    if (juiceRef.current) juiceRef.current.flash('#C77DFF');
  }, []);

  const handleCardTap = useCallback(
    (card) => {
      if (lockRef.current || card.flipped || card.matched) return;

      triggerLightHaptic();
      playTapSound();

      const updated = cards.map((c) =>
        c.id === card.id ? { ...c, flipped: true } : c
      );
      const nextSelected = [...selectedIds, card.id];
      setCards(updated);
      setSelectedIds(nextSelected);

      if (nextSelected.length === 2) {
        lockRef.current = true;
        setMoves((m) => m + 1);
        const [firstId, secondId] = nextSelected;
        const firstCard = updated.find((c) => c.id === firstId);
        const secondCard = updated.find((c) => c.id === secondId);

        if (firstCard && secondCard && firstCard.name === secondCard.name) {
          const nextCombo = combo + 1;
          const gained = 40 * nextCombo;
          const matchedDeck = updated.map((c) =>
            c.id === firstId || c.id === secondId ? { ...c, matched: true } : c
          );
          const allCleared = matchedDeck.every((c) => c.matched);
          const clearBonus = allCleared ? 200 : 0;
          const nextScore = score + gained + clearBonus;

          setCards(matchedDeck);
          setSelectedIds([]);
          setCombo(nextCombo);
          setScore(nextScore);
          updateBest(nextScore);
          triggerPerfectHaptic(nextCombo);
          playPerfectSound(nextCombo + 1);
          if (juiceRef.current) {
            juiceRef.current.celebrate(
              allCleared ? 'MATRIX CLEARED!' : `${firstCard.name} MATCH!`,
              `+${gained + clearBonus} PTS // x${nextCombo}`,
              firstCard.color
            );
          }
          lockRef.current = false;
        } else {
          setCombo(0);
          setTimeout(() => {
            setCards((prev) =>
              prev.map((c) =>
                c.id === firstId || c.id === secondId
                  ? { ...c, flipped: false }
                  : c
              )
            );
            setSelectedIds([]);
            playSliceSound();
            triggerSliceHaptic();
            if (juiceRef.current) juiceRef.current.shake(4, 2);
            lockRef.current = false;
          }, 520);
        }
      }
    },
    [cards, selectedIds, combo, score, updateBest]
  );

  const matchedCount = cards.filter((c) => c.matched).length / 2;

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={localStyles.container}>
        <LinearGradient
          colors={['#03030A', '#0D0822', '#1C0B38']}
          style={StyleSheet.absoluteFillObject}
        />

        <MiniGameHeader
          title="MEMORY MATRIX"
          floorLabel="FLOOR 05 // NEURAL MATCH"
          score={score}
          bestScore={bestScore}
          accentColor="#C77DFF"
          onBack={onBackToHub}
          onReset={resetDeck}
        />

        <View style={localStyles.body}>
          <View style={[localStyles.statusRow, { width: boardSize }]}>
            <Text style={localStyles.statPill}>
              {`PAIRS: ${matchedCount}/8 // MOVES: ${moves}`}
            </Text>
            <Text style={[localStyles.statPill, { color: COLORS.solarGold }]}>
              {`STREAK x${combo + 1}`}
            </Text>
          </View>

          <View
            style={[
              localStyles.grid,
              { width: boardSize, height: boardSize },
            ]}
          >
            {cards.map((card) => {
              const active = card.flipped || card.matched;
              return (
                <Pressable
                  key={card.id}
                  onPress={() => handleCardTap(card)}
                  style={[
                    localStyles.card,
                    {
                      width: cardSize,
                      height: cardSize,
                      borderColor: active
                        ? card.color
                        : 'rgba(199, 125, 255, 0.32)',
                      backgroundColor: card.matched
                        ? `${card.color}28`
                        : active
                          ? 'rgba(20, 14, 42, 0.95)'
                          : 'rgba(255, 255, 255, 0.05)',
                    },
                  ]}
                >
                  {active ? (
                    <>
                      <Text style={[localStyles.glyph, { color: card.color }]}>
                        {card.glyph}
                      </Text>
                      <Text
                        style={[localStyles.cardLabel, { color: card.color }]}
                      >
                        {card.name}
                      </Text>
                    </>
                  ) : (
                    <Text style={localStyles.cardBackIcon}>◈</Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          {matchedCount === 8 && (
            <Pressable onPress={resetDeck} style={localStyles.nextRoundBtn}>
              <Text style={localStyles.nextRoundText}>
                MATRIX SYNCHRONIZED // NEXT DECK (+200)
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
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  statPill: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#E0AAFF',
    letterSpacing: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
    backgroundColor: 'rgba(8, 8, 22, 0.9)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(199, 125, 255, 0.38)',
    padding: 8,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontSize: 28,
    fontWeight: '900',
  },
  cardLabel: {
    fontSize: 8.5,
    fontFamily: monoFont,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.8,
  },
  cardBackIcon: {
    fontSize: 20,
    color: 'rgba(199, 125, 255, 0.35)',
  },
  nextRoundBtn: {
    marginTop: 18,
    backgroundColor: '#C77DFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  nextRoundText: {
    fontSize: 11.5,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#030308',
    letterSpacing: 1.2,
  },
});
