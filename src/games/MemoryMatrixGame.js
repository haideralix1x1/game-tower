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
  ScrollView,
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

const STORAGE_KEY_PREFIX = '@game_tower:best_memory_mode_';

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

const MODES = {
  EASY: {
    key: 'EASY',
    label: 'EASY (16)',
    cols: 4,
    rows: 4,
    pairs: 8,
    isSmall: false,
    clearBonus: 200,
    ptsPerMatch: 40,
  },
  MEDIUM: {
    key: 'MEDIUM',
    label: 'MED (24)',
    cols: 4,
    rows: 6,
    pairs: 12,
    isSmall: false,
    clearBonus: 400,
    ptsPerMatch: 60,
  },
  HARD: {
    key: 'HARD',
    label: 'HARD (40)',
    cols: 5,
    rows: 8,
    pairs: 20,
    isSmall: true,
    clearBonus: 800,
    ptsPerMatch: 80,
  },
};

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const createDeck = (modeKey) => {
  const mode = MODES[modeKey] || MODES.EASY;
  const pool = ALL_SYMBOLS.slice(0, mode.pairs);
  const pairs = [...pool, ...pool].map((item, idx) => ({
    id: `card_${modeKey}_${idx}_${Math.random()}`,
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

/**
 * 3D Flip Card Component with realistic perspective and bounce
 */
function FlipCard({ card, cardW, cardH, isSmall, onPress }) {
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

  // Front side of the card (Unrevealed, with cyber diamond symbol)
  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });
  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 89, 91, 180],
    outputRange: [1, 1, 0, 0],
  });

  // Back side of the card (Revealed, with glyph, label, and neon border)
  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });
  const backOpacity = flipAnim.interpolate({
    inputRange: [0, 89, 91, 180],
    outputRange: [0, 0, 1, 1],
  });

  return (
    <Pressable
      onPress={onPress}
      style={{
        width: cardW,
        height: cardH,
        margin: 2.5,
      }}
    >
      {/* Front Face (Hidden / Face Down) */}
      <Animated.View
        pointerEvents={isRevealed ? 'none' : 'auto'}
        style={[
          localStyles.cardCommon,
          {
            width: cardW,
            height: cardH,
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
        <Text style={[localStyles.cardBackIcon, isSmall && { fontSize: 13 }]}>◈</Text>
      </Animated.View>

      {/* Back Face (Revealed / Face Up) */}
      <Animated.View
        pointerEvents={!isRevealed ? 'none' : 'auto'}
        style={[
          localStyles.cardCommon,
          {
            width: cardW,
            height: cardH,
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
            { color: card.color },
            isSmall && { fontSize: 16 },
          ]}
        >
          {card.glyph}
        </Text>
        {!isSmall && (
          <Text
            numberOfLines={1}
            style={[localStyles.cardLabel, { color: card.color }]}
          >
            {card.name}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

export default function MemoryMatrixGame({ onBackToHub, onScoreUpdate }) {
  const { width, height } = useWindowDimensions();
  const [modeKey, setModeKey] = useState('EASY');
  const activeMode = MODES[modeKey] || MODES.EASY;

  const juiceRef = useRef(null);

  const [cards, setCards] = useState(() => createDeck('EASY'));
  const [selectedIds, setSelectedIds] = useState([]);
  const [moves, setMoves] = useState(0);
  const [combo, setCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const lockRef = useRef(false);

  // Load saved difficulty mode
  useEffect(() => {
    (async () => {
      try {
        const savedMode = await AsyncStorage.getItem('@game_tower:saved_memory_mode');
        if (savedMode && MODES[savedMode]) {
          setModeKey(savedMode);
          setCards(createDeck(savedMode));
        }
      } catch {}
    })();
  }, []);

  // Load best score for current difficulty mode
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(`${STORAGE_KEY_PREFIX}${modeKey}`);
        if (saved) setBestScore(parseInt(saved, 10) || 0);
        else setBestScore(0);
      } catch {}
    })();
  }, [modeKey]);

  const updateBest = useCallback(
    async (nextScore) => {
      if (onScoreUpdate) onScoreUpdate(nextScore);
      if (nextScore > bestScore) {
        setBestScore(nextScore);
        try {
          await AsyncStorage.setItem(`${STORAGE_KEY_PREFIX}${modeKey}`, String(nextScore));
        } catch {}
      }
    },
    [bestScore, modeKey, onScoreUpdate]
  );

  const resetDeck = useCallback(
    (newModeKey = modeKey) => {
      lockRef.current = false;
      setCards(createDeck(newModeKey));
      setSelectedIds([]);
      setMoves(0);
      setCombo(0);
      if (juiceRef.current) juiceRef.current.flash('#C77DFF');
    },
    [modeKey]
  );

  const handleSelectMode = (newKey) => {
    if (newKey === modeKey) return;
    try {
      triggerLightHaptic();
      playTapSound();
    } catch {}
    setModeKey(newKey);
    resetDeck(newKey);
    AsyncStorage.setItem('@game_tower:saved_memory_mode', newKey).catch(() => {});
  };

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
          const gained = activeMode.ptsPerMatch * nextCombo;
          const matchedDeck = updated.map((c) =>
            c.id === firstId || c.id === secondId ? { ...c, matched: true } : c
          );
          const allCleared = matchedDeck.every((c) => c.matched);
          const clearBonus = allCleared ? activeMode.clearBonus : 0;
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
              allCleared ? `${activeMode.key} MATRIX CLEARED!` : `${firstCard.name} MATCH!`,
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
    [activeMode.clearBonus, activeMode.key, activeMode.ptsPerMatch, cards, combo, score, selectedIds, updateBest]
  );

  const matchedCount = cards.filter((c) => c.matched).length / 2;

  // Non-Scrollable Responsive Grid Geometry (Proportional Small Boxes)
  const colCount = activeMode.cols;
  const rowCount = activeMode.rows;
  const maxBoardW = Math.min(360, width - 20);
  const maxBoardH = Math.max(220, height - 175);
  const gap = rowCount >= 8 ? 3.5 : 5;

  const cellW = Math.floor((maxBoardW - (colCount + 1) * gap) / colCount);
  const cellH = Math.floor((maxBoardH - (rowCount + 1) * gap) / rowCount);
  // Exact fit: no minimum floor so 40 cards scale down seamlessly to fit on screen
  const cardSize = Math.min(cellW, cellH);

  const gridWidth = colCount * (cardSize + gap) + gap;
  const gridHeight = rowCount * (cardSize + gap) + gap;

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
          onReset={() => resetDeck(modeKey)}
        />

        <View style={localStyles.body}>
          {/* Difficulty Mode Selector */}
          <View style={[localStyles.modeSelector, { width: maxBoardW }]}>
            {Object.values(MODES).map((m) => {
              const isSelected = m.key === modeKey;
              return (
                <Pressable
                  key={m.key}
                  onPress={() => handleSelectMode(m.key)}
                  style={[
                    localStyles.modeBtn,
                    isSelected && localStyles.modeBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      localStyles.modeBtnText,
                      isSelected && localStyles.modeBtnTextActive,
                    ]}
                  >
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Status Metrics Row */}
          <View style={[localStyles.statusRow, { width: maxBoardW }]}>
            <Text style={localStyles.statPill}>
              {`PAIRS: ${matchedCount}/${activeMode.pairs} // MOVES: ${moves}`}
            </Text>
            <Text style={[localStyles.statPill, { color: COLORS.solarGold }]}>
              {`STREAK x${combo + 1}`}
            </Text>
          </View>

          {/* Non-Scrollable Matrix Card Arena */}
          <View style={localStyles.gridWrapper}>
            <View
              style={[
                localStyles.grid,
                {
                  width: gridWidth,
                  height: gridHeight,
                },
              ]}
            >
              {cards.map((card) => (
                <FlipCard
                  key={card.id}
                  card={card}
                  cardW={cardSize}
                  cardH={cardSize}
                  isSmall={activeMode.isSmall}
                  onPress={() => handleCardTap(card)}
                />
              ))}
            </View>
          </View>

          {/* Victory Modal */}
          <GameResultModal
            visible={matchedCount === activeMode.pairs}
            type="VICTORY"
            title="NEURAL MATRIX SYNCED!"
            subtitle={`ALL ${activeMode.pairs} PAIRS MATCHED IN ${moves} MOVES [${activeMode.key} MODE]`}
            score={score}
            bestScore={bestScore}
            accentColor="#C77DFF"
            onRetry={() => resetDeck(modeKey)}
            retryLabel={`PLAY AGAIN (+${activeMode.clearBonus})`}
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
    paddingBottom: 16,
  },
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(10, 8, 25, 0.85)',
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: 'rgba(199, 125, 255, 0.28)',
    padding: 4,
    marginTop: 6,
    marginBottom: 8,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginHorizontal: 2,
  },
  modeBtnActive: {
    backgroundColor: 'rgba(199, 125, 255, 0.22)',
    borderWidth: 1,
    borderColor: '#C77DFF',
    shadowColor: '#C77DFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 3,
  },
  modeBtnText: {
    fontFamily: monoFont,
    fontSize: 10.5,
    fontWeight: '800',
    color: '#A09FB1',
    letterSpacing: 0.8,
  },
  modeBtnTextActive: {
    color: '#00F5FF',
    fontWeight: '900',
    textShadowColor: 'rgba(0, 245, 255, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
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
  gridWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignContent: 'center',
    backgroundColor: 'rgba(8, 8, 22, 0.92)',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(199, 125, 255, 0.35)',
    padding: 3,
  },
  cardCommon: {
    borderRadius: 10,
    borderWidth: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontSize: 24,
    fontWeight: '900',
  },
  cardLabel: {
    fontSize: 7.5,
    fontFamily: monoFont,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.6,
  },
  cardBackIcon: {
    fontSize: 18,
    color: 'rgba(199, 125, 255, 0.45)',
  },
});
