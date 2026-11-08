import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  useWindowDimensions,
  Animated,
  Easing,
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
} from '../utils/haptics';
import {
  playTapSound,
  playSliceSound,
  playPerfectSound,
} from '../utils/sound';

const STORAGE_KEY = '@game_tower:best_memory_matrix';
const TOTAL_PAIRS = 12; // 24 cards total (4 columns x 6 rows)
const COLS = 4;
const ROWS = 6;
const PTS_PER_MATCH = 60;
const CLEAR_BONUS = 500;

const ALL_SYMBOLS = [
  { glyph: '◈', color: '#00F5FF', name: 'PRISM' },
  { glyph: '⚡', color: '#FFD166', name: 'VOLT' },
  { glyph: '❖', color: '#FF007F', name: 'NEXUS' },
  { glyph: '▲', color: '#00F5D4', name: 'DELTA' },
  { glyph: '✦', color: '#C77DFF', name: 'NOVA' },
  { glyph: '⬢', color: '#FF6D00', name: 'HEX' },
  { glyph: '◉', color: '#4361EE', name: 'CORE' },
  { glyph: '✧', color: '#FF2A55', name: 'PULSE' },
  { glyph: '◆', color: '#06D6A0', name: 'CYBER' },
  { glyph: '⚙', color: '#F72585', name: 'COG' },
  { glyph: '★', color: '#FEE440', name: 'STELLA' },
  { glyph: '◬', color: '#7209B7', name: 'PYRA' },
  { glyph: '⬡', color: '#4CC9F0', name: 'NANO' },
  { glyph: '❂', color: '#FF9E00', name: 'SOL' },
  { glyph: '⊕', color: '#10B981', name: 'ION' },
  { glyph: '⌘', color: '#E0AAFF', name: 'CMD' },
  { glyph: '◖', color: '#3A86FF', name: 'ECHO' },
  { glyph: '✸', color: '#FF0055', name: 'BURST' },
  { glyph: '⬟', color: '#00E5FF', name: 'PENTA' },
  { glyph: '✵', color: '#FFAA00', name: 'FLARE' },
];

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

/**
 * Creates a shuffled 24-card deck (12 pairs)
 */
const createDeck = () => {
  // Shuffle symbols pool to ensure variety every game
  const shuffledSymbols = [...ALL_SYMBOLS].sort(() => Math.random() - 0.5);
  const selectedPool = shuffledSymbols.slice(0, TOTAL_PAIRS);

  const pairs = [...selectedPool, ...selectedPool].map((item, idx) => ({
    id: `card_${idx}_${Math.random().toString(36).substring(2, 8)}`,
    ...item,
    flipped: false,
    matched: false,
  }));

  // Fisher-Yates shuffle
  for (let i = pairs.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return pairs;
};

/**
 * 3D Flip Card Component with realistic perspective and bounce
 */
function FlipCard({ card, cardSize, onPress }) {
  const isRevealed = card.flipped || card.matched;
  const flipAnim = useRef(new Animated.Value(isRevealed ? 180 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(flipAnim, {
      toValue: isRevealed ? 180 : 0,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();

    if (card.matched) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.15,
          duration: 150,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.0,
          duration: 150,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isRevealed, card.matched, flipAnim, scaleAnim]);

  // Front side of card (Hidden / Face Down)
  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });
  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 89, 91, 180],
    outputRange: [1, 1, 0, 0],
  });

  // Back side of card (Revealed / Face Up)
  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });
  const backOpacity = flipAnim.interpolate({
    inputRange: [0, 89, 91, 180],
    outputRange: [0, 0, 1, 1],
  });

  const glyphFontSize = Math.max(18, Math.round(cardSize * 0.40));
  const labelFontSize = Math.max(7, Math.round(cardSize * 0.13));
  const backIconSize = Math.max(16, Math.round(cardSize * 0.32));

  return (
    <Pressable
      onPress={onPress}
      style={{
        width: cardSize,
        height: cardSize,
      }}
    >
      {/* Front Face (Hidden / Face Down) */}
      <Animated.View
        pointerEvents={isRevealed ? 'none' : 'auto'}
        style={[
          localStyles.cardCommon,
          {
            width: cardSize,
            height: cardSize,
            transform: [
              { perspective: 1000 },
              { scale: scaleAnim },
              { rotateY: frontInterpolate },
            ],
            opacity: frontOpacity,
            position: 'absolute',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderColor: 'rgba(199, 125, 255, 0.35)',
          },
        ]}
      >
        <Text style={[localStyles.cardBackIcon, { fontSize: backIconSize }]}>◈</Text>
      </Animated.View>

      {/* Back Face (Revealed / Face Up) */}
      <Animated.View
        pointerEvents={!isRevealed ? 'none' : 'auto'}
        style={[
          localStyles.cardCommon,
          {
            width: cardSize,
            height: cardSize,
            transform: [
              { perspective: 1000 },
              { scale: scaleAnim },
              { rotateY: backInterpolate },
            ],
            opacity: backOpacity,
            backgroundColor: card.matched ? `${card.color}28` : 'rgba(20, 14, 42, 0.95)',
            borderColor: card.matched ? card.color : card.color,
            shadowColor: card.color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: card.matched ? 0.9 : 0.45,
            shadowRadius: card.matched ? 12 : 5,
            elevation: card.matched ? 8 : 4,
          },
        ]}
      >
        <Text
          style={[
            localStyles.glyph,
            { color: card.color, fontSize: glyphFontSize },
          ]}
        >
          {card.glyph}
        </Text>
        <Text
          numberOfLines={1}
          style={[
            localStyles.cardLabel,
            { color: card.color, fontSize: labelFontSize },
          ]}
        >
          {card.name}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export default function MemoryMatrixGame({ onBackToHub, onScoreUpdate }) {
  const { width, height } = useWindowDimensions();

  const juiceRef = useRef(null);

  const [cards, setCards] = useState(() => createDeck());
  const [selectedIds, setSelectedIds] = useState([]);
  const [moves, setMoves] = useState(0);
  const [combo, setCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const lockRef = useRef(false);

  // Load best score on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          setBestScore(parseInt(saved, 10) || 0);
        } else {
          // Fallback to legacy medium key if exists
          const legacy = await AsyncStorage.getItem('@game_tower:best_memory_mode_MEDIUM');
          if (legacy) setBestScore(parseInt(legacy, 10) || 0);
        }
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
    setScore(0);
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
          const gained = PTS_PER_MATCH * nextCombo;
          const matchedDeck = updated.map((c) =>
            c.id === firstId || c.id === secondId ? { ...c, matched: true } : c
          );
          const allCleared = matchedDeck.every((c) => c.matched);
          const clearBonus = allCleared ? CLEAR_BONUS : 0;
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
    [cards, combo, score, selectedIds, updateBest]
  );

  const matchedCount = cards.filter((c) => c.matched).length / 2;

  // Responsive Grid Geometry: 4 cols x 6 rows = 24 cards
  const boxPadding = 8;
  const gap = 5;

  const usableWidth = Math.min(width - 24, 380);
  const usableHeight = Math.max(340, height - 170);

  const maxCardW = Math.floor((usableWidth - 2 * boxPadding - (COLS - 1) * gap) / COLS);
  const maxCardH = Math.floor((usableHeight - 2 * boxPadding - (ROWS - 1) * gap) / ROWS);

  // Exact square card size fitting fully within both width and height
  const cardSize = Math.max(36, Math.min(maxCardW, maxCardH, 68));

  const boxWidth = COLS * cardSize + (COLS - 1) * gap + 2 * boxPadding;
  const boxHeight = ROWS * cardSize + (ROWS - 1) * gap + 2 * boxPadding;

  // Chunk cards into 6 rows of 4 cards
  const rows = [];
  for (let r = 0; r < ROWS; r += 1) {
    rows.push(cards.slice(r * COLS, (r + 1) * COLS));
  }

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={localStyles.container}>
        <LinearGradient
          colors={['#03030A', '#0D0822', '#1C0B38']}
          style={StyleSheet.absoluteFillObject}
        />

        <MiniGameHeader
          title="MEMORY MATRIX"
          floorLabel="FLOOR 05 // 24 TILES MATCH"
          score={score}
          bestScore={bestScore}
          accentColor="#C77DFF"
          onBack={onBackToHub}
          onReset={resetDeck}
        />

        <View style={localStyles.body}>
          {/* Status Metrics Row */}
          <View style={[localStyles.statusRow, { width: boxWidth }]}>
            <Text style={localStyles.statPill}>
              {`PAIRS: ${matchedCount}/${TOTAL_PAIRS} // MOVES: ${moves}`}
            </Text>
            <Text style={[localStyles.statPill, { color: COLORS.solarGold }]}>
              {`STREAK x${combo + 1}`}
            </Text>
          </View>

          {/* Matrix Arena Box: Exact structured row layout (cannot overflow or wrap) */}
          <View
            style={[
              localStyles.matrixBox,
              {
                width: boxWidth,
                height: boxHeight,
                padding: boxPadding,
              },
            ]}
          >
            {rows.map((rowCards, rowIndex) => (
              <View
                key={`row_${rowIndex}`}
                style={[
                  localStyles.row,
                  {
                    marginBottom: rowIndex < ROWS - 1 ? gap : 0,
                  },
                ]}
              >
                {rowCards.map((card, colIndex) => (
                  <View
                    key={card.id}
                    style={{
                      marginRight: colIndex < COLS - 1 ? gap : 0,
                    }}
                  >
                    <FlipCard
                      card={card}
                      cardSize={cardSize}
                      onPress={() => handleCardTap(card)}
                    />
                  </View>
                ))}
              </View>
            ))}
          </View>

          {/* Victory Modal */}
          <GameResultModal
            visible={matchedCount === TOTAL_PAIRS}
            type="VICTORY"
            title="NEURAL MATRIX SYNCED!"
            subtitle={`ALL 12 PAIRS MATCHED IN ${moves} MOVES!`}
            score={score}
            bestScore={bestScore}
            accentColor="#C77DFF"
            onRetry={resetDeck}
            retryLabel={`PLAY AGAIN (+${CLEAR_BONUS})`}
            onBackToHub={onBackToHub}
          />
        </View>
      </View>
    </JuiceEngine>
  );
}

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  statPill: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#E0AAFF',
    letterSpacing: 0.8,
  },
  matrixBox: {
    backgroundColor: 'rgba(8, 8, 22, 0.94)',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(199, 125, 255, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#C77DFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCommon: {
    borderRadius: 10,
    borderWidth: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontWeight: '900',
  },
  cardLabel: {
    fontFamily: monoFont,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.4,
  },
  cardBackIcon: {
    color: 'rgba(199, 125, 255, 0.45)',
  },
});
