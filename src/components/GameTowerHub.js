import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Rect,
  Circle,
  Polygon,
  Line,
} from 'react-native-svg';
import { COLORS, GAME_CONFIG } from '../../styles';
import TowerAnimatedBackground from './TowerAnimatedBackground';
import JuiceEngine from './JuiceEngine';

// Floor 01 - 20 Game Screen Imports
import GameScreen from '../../GameScreen';
import Game2048 from '../games/Game2048';
import WordlyGame from '../games/WordlyGame';
import NeonMinesGame from '../games/NeonMinesGame';
import MemoryMatrixGame from '../games/MemoryMatrixGame';
import LightsOutGame from '../games/LightsOutGame';
import SlidingPuzzleGame from '../games/SlidingPuzzleGame';
import ColorFloodGame from '../games/ColorFloodGame';
import SimonPulseGame from '../games/SimonPulseGame';
import BrickBreakerGame from '../games/BrickBreakerGame';
import CyberSnakeGame from '../games/CyberSnakeGame';
import NeonFlappyGame from '../games/NeonFlappyGame';
import TicTacToeGame from '../games/TicTacToeGame';
import BlockBlastGame from '../games/BlockBlastGame';
import WhackABotGame from '../games/WhackABotGame';
import MathBlitzGame from '../games/MathBlitzGame';
import ColorStroopGame from '../games/ColorStroopGame';
import HanoiTowerGame from '../games/HanoiTowerGame';
import NumberHuntGame from '../games/NumberHuntGame';
import SpaceShooterGame from '../games/SpaceShooterGame';

import {
  triggerLightHaptic,
  triggerMediumHaptic,
  triggerSliceHaptic,
} from '../utils/haptics';
import { playTapSound } from '../utils/sound';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export const TOWER_GAMES = [
  {
    id: 'space_shooter',
    floorNum: 20,
    floor: 'FLOOR 20',
    tier: 'APEX',
    title: 'SPACE SHOOTER NEO',
    category: 'ARCADE',
    badge: '60FPS AUTO-LASER',
    desc: 'Pilot the cyber starfighter through plasma asteroid belts & enemy cruiser wings.',
    accent: '#00F5FF',
    secondary: '#7928CA',
    icon: '🚀',
    storageKey: '@game_tower:best_shooter_v1',
  },
  {
    id: 'number_hunt',
    floorNum: 19,
    floor: 'FLOOR 19',
    tier: 'APEX',
    title: 'NUMBER HUNT 25',
    category: 'BRAIN',
    badge: 'SCHULTE SPEED',
    desc: 'Tap scrambled quantum digits 1–25 in high-velocity ascending order.',
    accent: '#00F5D4',
    secondary: '#0088FF',
    icon: '🔢',
    storageKey: '@game_tower:best_schulte_v1',
  },
  {
    id: 'hanoi_tower',
    floorNum: 18,
    floor: 'FLOOR 18',
    tier: 'APEX',
    title: 'TOWER OF HANOI',
    category: 'PUZZLE',
    badge: 'QUANTUM RINGS',
    desc: 'Transfer the energy spire rings to Node Gamma using minimal optimal moves.',
    accent: '#FFD166',
    secondary: '#FF6D00',
    icon: '🗼',
    storageKey: '@game_tower:best_hanoi_v1',
  },
  {
    id: 'color_stroop',
    floorNum: 17,
    floor: 'FLOOR 17',
    tier: 'APEX',
    title: 'COLOR STROOP',
    category: 'BRAIN',
    badge: 'REFLEX CLASH',
    desc: 'Identify the ink color before your neural cortex reads the word itself.',
    accent: '#FF007F',
    secondary: '#B5179E',
    icon: '🎯',
    storageKey: '@game_tower:best_stroop_v1',
  },
  {
    id: 'math_blitz',
    floorNum: 16,
    floor: 'FLOOR 16',
    tier: 'APEX',
    title: 'MATH BLITZ',
    category: 'BRAIN',
    badge: 'SPEED ARITHMETIC',
    desc: 'Solve escalating arithmetic equations against the hyper-depleting turbo clock.',
    accent: '#80FF72',
    secondary: '#00F5D4',
    icon: '⚡',
    storageKey: '@game_tower:best_mathblitz_v1',
  },
  {
    id: 'whack_a_bot',
    floorNum: 15,
    floor: 'FLOOR 15',
    tier: 'SKY',
    title: 'WHACK-A-BOT',
    category: 'ARCADE',
    badge: 'SPEED REFLEX',
    desc: 'Smash rogue drones across the 3x3 security grid while avoiding EMP plasma bombs.',
    accent: '#FF2A85',
    secondary: '#FF9E00',
    icon: '🤖',
    storageKey: '@game_tower:best_whackabot_v1',
  },
  {
    id: 'block_blast',
    floorNum: 14,
    floor: 'FLOOR 14',
    tier: 'SKY',
    title: 'BLOCK BLAST 8x8',
    category: 'PUZZLE',
    badge: 'GRID BLASTER',
    desc: 'Slot polyomino neon shapes to detonate full rows and columns in multi-combos.',
    accent: '#48BFE3',
    secondary: '#7209B7',
    icon: '🧱',
    storageKey: '@game_tower:best_blockblast_v1',
  },
  {
    id: 'tic_tac_toe',
    floorNum: 13,
    floor: 'FLOOR 13',
    tier: 'SKY',
    title: 'CYBER TIC-TAC-TOE',
    category: 'STRATEGY',
    badge: 'AI BATTLE & 2P',
    desc: 'Claim lines of three against the adaptive Cyber AI or battle local 2-Player.',
    accent: '#06D6A0',
    secondary: '#118AB2',
    icon: '⚔️',
    storageKey: '@game_tower:best_ttt_v1',
  },
  {
    id: 'neon_flappy',
    floorNum: 12,
    floor: 'FLOOR 12',
    tier: 'SKY',
    title: 'NEON FLAPPY',
    category: 'ARCADE',
    badge: 'PULSE JET',
    desc: 'Navigate the cyber drone through lethal laser gates with rhythmic tap pulses.',
    accent: '#FFD166',
    secondary: '#EF476F',
    icon: '🛸',
    storageKey: '@game_tower:best_flappy_v1',
  },
  {
    id: 'cyber_snake',
    floorNum: 11,
    floor: 'FLOOR 11',
    tier: 'SKY',
    title: 'CYBER SNAKE',
    category: 'ARCADE',
    badge: 'RETRO 15x15',
    desc: 'Slither through cyberspace, devour golden energy orbs, and grow your light trail.',
    accent: '#80FF72',
    secondary: '#00F5FF',
    icon: '🐍',
    storageKey: '@game_tower:best_snake_v1',
  },
  {
    id: 'brick_breaker',
    floorNum: 10,
    floor: 'FLOOR 10',
    tier: 'CORE',
    title: 'BRICK BREAKER NEO',
    category: 'ARCADE',
    badge: 'ARKANOID 60FPS',
    desc: 'Deflect the plasma ball with your cyber paddle to shatter armored brick barriers.',
    accent: '#00F5FF',
    secondary: '#00BBF9',
    icon: '▬',
    storageKey: '@game_tower:best_breaker_v1',
  },
  {
    id: 'simon_pulse',
    floorNum: 9,
    floor: 'FLOOR 09',
    tier: 'CORE',
    title: 'SIMON PULSE',
    category: 'BRAIN',
    badge: 'SYNTH MEMORY',
    desc: 'Memorize and mimic accelerating 9-pad musical neon pulse sequences.',
    accent: '#FF2A85',
    secondary: '#9D4EDD',
    icon: '◉',
    storageKey: '@game_tower:best_simon_v1',
  },
  {
    id: 'chroma_flood',
    floorNum: 8,
    floor: 'FLOOR 08',
    tier: 'CORE',
    title: 'CHROMA FLOOD',
    category: 'STRATEGY',
    badge: 'COLOR INFECTION',
    desc: 'Infect the entire 8x8 matrix with a single neon wavelength within 18 moves.',
    accent: '#FF6D00',
    secondary: '#D00000',
    icon: '⬢',
    storageKey: '@game_tower:best_flood_v1',
  },
  {
    id: 'cyber_slide',
    floorNum: 7,
    floor: 'FLOOR 07',
    tier: 'CORE',
    title: 'CYBER SLIDE 15',
    category: 'PUZZLE',
    badge: '15-PUZZLE',
    desc: 'Slide numbered neon blocks 1–15 into ascending order with minimum moves.',
    accent: '#FFD166',
    secondary: '#F77F00',
    icon: '◫',
    storageKey: '@game_tower:best_slide15_v1',
  },
  {
    id: 'lights_out',
    floorNum: 6,
    floor: 'FLOOR 06',
    tier: 'CORE',
    title: 'GRID HACKER',
    category: 'PUZZLE',
    badge: 'LIGHTS OUT',
    desc: 'Toggle linked quantum nodes to extinguish all cyan firewall circuits.',
    accent: '#48BFE3',
    secondary: '#4361EE',
    icon: '⚡',
    storageKey: '@game_tower:best_lightsout_v1',
  },
  {
    id: 'memory_matrix',
    floorNum: 5,
    floor: 'FLOOR 05',
    tier: 'BASE',
    title: 'MEMORY MATRIX',
    category: 'BRAIN',
    badge: 'PAIR MATCH',
    desc: 'Flip neural data cards and chain consecutive pair matches for streak points.',
    accent: '#C77DFF',
    secondary: '#7209B7',
    icon: '◈',
    storageKey: '@game_tower:best_memory_v1',
  },
  {
    id: 'neon_mines',
    floorNum: 4,
    floor: 'FLOOR 04',
    tier: 'BASE',
    title: 'NEON MINES',
    category: 'STRATEGY',
    badge: 'MINESWEEPER',
    desc: 'Scan the 7x7 grid, flag hidden plasma mines, and sweep safe sectors.',
    accent: '#FF007F',
    secondary: '#B5179E',
    icon: '✸',
    storageKey: '@game_tower:best_mines_v1',
  },
  {
    id: 'wordly_neo',
    floorNum: 3,
    floor: 'FLOOR 03',
    tier: 'BASE',
    title: 'WORDLY NEO',
    category: 'WORD',
    badge: '5-LETTER CIPHER',
    desc: 'Crack the 5-letter cyber password in 6 tries with live keyboard feedback.',
    accent: '#06D6A0',
    secondary: '#047857',
    icon: '🔤',
    storageKey: '@game_tower:best_wordly_v1',
  },
  {
    id: 'cyber_2048',
    floorNum: 2,
    floor: 'FLOOR 02',
    tier: 'BASE',
    title: 'CYBER 2048',
    category: 'PUZZLE',
    badge: 'TILE MERGE',
    desc: 'Slide and fuse glowing power cores on a 4x4 grid to reach the 2048 core.',
    accent: '#00F5D4',
    secondary: '#0A9396',
    icon: '⊞',
    storageKey: '@game_tower:best_2048_v1',
  },
  {
    id: 'stack_block',
    floorNum: 1,
    floor: 'FLOOR 01',
    tier: 'BASE',
    title: 'STACK BLOCK NEO',
    category: 'ARCADE',
    badge: '3D PRECISION',
    desc: 'Drop oscillating 3D neon slabs with laser-slicing physics & Overdrive combos.',
    accent: '#00F5FF',
    secondary: '#0088FF',
    icon: '❖',
    storageKey: GAME_CONFIG.STORAGE_BEST_SCORE_KEY,
  },
];

const SECTORS = [
  { id: 'ALL', label: 'ALL (20)' },
  { id: 'APEX', label: '🛰️ APEX (20-16)' },
  { id: 'SKY', label: '🏙️ SKY (15-11)' },
  { id: 'CORE', label: '⚡ CORE (10-06)' },
  { id: 'BASE', label: '🛡️ BASE (05-01)' },
];

/**
 * @param {{ initialGameId?: string | null }} [props]
 */
export default function GameTowerHub({ initialGameId = null } = {}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const juiceRef = useRef(null);
  const scrollRef = useRef(null);

  const [activeGameId, setActiveGameId] = useState(initialGameId);
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [highScores, setHighScores] = useState({});
  const [ascendingSort, setAscendingSort] = useState(false); // false = Apex (20) top, true = Base (01) top

  const loadAllHighScores = useCallback(async () => {
    try {
      const keys = TOWER_GAMES.map((g) => g.storageKey);
      const pairs = await AsyncStorage.multiGet(keys);
      const map = {};
      pairs.forEach(([key, val]) => {
        const game = TOWER_GAMES.find((g) => g.storageKey === key);
        if (game && val) {
          map[game.id] = parseInt(val, 10) || 0;
        }
      });
      setHighScores(map);
    } catch {}
  }, []);

  useEffect(() => {
    loadAllHighScores();
  }, [loadAllHighScores, activeGameId]);

  const handleSelectGame = useCallback((gameId, accent = COLORS.cyan) => {
    triggerSliceHaptic();
    playTapSound();

    if (juiceRef.current) {
      juiceRef.current.shake(10, 6);
      juiceRef.current.flash(accent);
      juiceRef.current.burst(width / 2, 280, accent, 18);
    }

    setTimeout(() => {
      setActiveGameId(gameId);
    }, 120);
  }, [width]);

  const handleBackToHub = useCallback(() => {
    triggerMediumHaptic();
    playTapSound();
    setActiveGameId(null);
    loadAllHighScores();
  }, [loadAllHighScores]);

  const handleScoreUpdate = useCallback((gameId, newScore) => {
    setHighScores((prev) => {
      const current = prev[gameId] || 0;
      if (newScore > current) {
        return { ...prev, [gameId]: newScore };
      }
      return prev;
    });
  }, []);

  // Compute Tower Telemetry
  const totalTowerScore = Object.values(highScores).reduce(
    (sum, val) => sum + (val || 0),
    0
  );
  const floorsPlayed = Object.values(highScores).filter((v) => v > 0).length;
  const towerRank =
    totalTowerScore >= 10000
      ? 'NEON GOD'
      : totalTowerScore >= 5000
        ? 'APEX OVERLORD'
        : totalTowerScore >= 2000
          ? 'TOWER MASTER'
          : totalTowerScore >= 600
            ? 'SECTOR RUNNER'
            : totalTowerScore > 0
              ? 'GRID INITIATE'
              : 'ROOKIE';

  const handleRandomLaunch = () => {
    const pick = TOWER_GAMES[Math.floor(Math.random() * TOWER_GAMES.length)];
    handleSelectGame(pick.id, pick.accent);
  };

  const displayedGames = [...TOWER_GAMES]
    .sort((a, b) => (ascendingSort ? a.floorNum - b.floorNum : b.floorNum - a.floorNum))
    .filter((g) => {
      if (selectedSector === 'ALL') return true;
      return g.tier === selectedSector;
    });

  // Render Active Selected Mini-Game
  if (activeGameId === 'stack_block') {
    return (
      <GameScreen
        onBackToHub={handleBackToHub}
        onScoreUpdate={(s) => handleScoreUpdate('stack_block', s)}
      />
    );
  }
  if (activeGameId === 'cyber_2048') {
    return (
      <Game2048
        onBackToHub={handleBackToHub}
        onScoreUpdate={(s) => handleScoreUpdate('cyber_2048', s)}
      />
    );
  }
  if (activeGameId === 'wordly_neo') {
    return (
      <WordlyGame
        onBackToHub={handleBackToHub}
        onScoreUpdate={(s) => handleScoreUpdate('wordly_neo', s)}
      />
    );
  }
  if (activeGameId === 'neon_mines') {
    return (
      <NeonMinesGame
        onBackToHub={handleBackToHub}
        onScoreUpdate={(s) => handleScoreUpdate('neon_mines', s)}
      />
    );
  }
  if (activeGameId === 'memory_matrix') {
    return (
      <MemoryMatrixGame
        onBackToHub={handleBackToHub}
        onScoreUpdate={(s) => handleScoreUpdate('memory_matrix', s)}
      />
    );
  }
  if (activeGameId === 'lights_out') {
    return (
      <LightsOutGame
        onBackToHub={handleBackToHub}
        onScoreUpdate={(s) => handleScoreUpdate('lights_out', s)}
      />
    );
  }
  if (activeGameId === 'cyber_slide') {
    return (
      <SlidingPuzzleGame
        onBackToHub={handleBackToHub}
        onScoreUpdate={(s) => handleScoreUpdate('cyber_slide', s)}
      />
    );
  }
  if (activeGameId === 'chroma_flood') {
    return (
      <ColorFloodGame
        onBackToHub={handleBackToHub}
        onScoreUpdate={(s) => handleScoreUpdate('chroma_flood', s)}
      />
    );
  }
  if (activeGameId === 'simon_pulse') {
    return (
      <SimonPulseGame
        onBackToHub={handleBackToHub}
        onScoreUpdate={(s) => handleScoreUpdate('simon_pulse', s)}
      />
    );
  }
  if (activeGameId === 'brick_breaker') {
    return (
      <BrickBreakerGame
        onBackToHub={handleBackToHub}
        onScoreUpdate={(s) => handleScoreUpdate('brick_breaker', s)}
      />
    );
  }
  if (activeGameId === 'cyber_snake') {
    return (
      <CyberSnakeGame
        onBackToHub={handleBackToHub}
        onScoreUpdate={(s) => handleScoreUpdate('cyber_snake', s)}
      />
    );
  }
  if (activeGameId === 'neon_flappy') {
    return (
      <NeonFlappyGame
        onBackToHub={handleBackToHub}
        onScoreUpdate={(s) => handleScoreUpdate('neon_flappy', s)}
      />
    );
  }
  if (activeGameId === 'tic_tac_toe') {
    return (
      <TicTacToeGame
        onBackToHub={handleBackToHub}
        onScoreUpdate={(s) => handleScoreUpdate('tic_tac_toe', s)}
      />
    );
  }
  if (activeGameId === 'block_blast') {
    return (
      <BlockBlastGame
        onBackToHub={handleBackToHub}
        onScoreUpdate={(s) => handleScoreUpdate('block_blast', s)}
      />
    );
  }
  if (activeGameId === 'whack_a_bot') {
    return (
      <WhackABotGame
        onBackToHub={handleBackToHub}
        onScoreUpdate={(s) => handleScoreUpdate('whack_a_bot', s)}
      />
    );
  }
  if (activeGameId === 'math_blitz') {
    return (
      <MathBlitzGame
        onBackToHub={handleBackToHub}
        onScoreUpdate={(s) => handleScoreUpdate('math_blitz', s)}
      />
    );
  }
  if (activeGameId === 'color_stroop') {
    return (
      <ColorStroopGame
        onBackToHub={handleBackToHub}
        onScoreUpdate={(s) => handleScoreUpdate('color_stroop', s)}
      />
    );
  }
  if (activeGameId === 'hanoi_tower') {
    return (
      <HanoiTowerGame
        onBackToHub={handleBackToHub}
        onScoreUpdate={(s) => handleScoreUpdate('hanoi_tower', s)}
      />
    );
  }
  if (activeGameId === 'number_hunt') {
    return (
      <NumberHuntGame
        onBackToHub={handleBackToHub}
        onScoreUpdate={(s) => handleScoreUpdate('number_hunt', s)}
      />
    );
  }
  if (activeGameId === 'space_shooter') {
    return (
      <SpaceShooterGame
        onBackToHub={handleBackToHub}
        onScoreUpdate={(s) => handleScoreUpdate('space_shooter', s)}
      />
    );
  }

  // Taper width ratio based on floor number (Floor 20 is ~78% width, Floor 1 is ~98% width)
  const getDeckWidth = (floorNum) => {
    const ratio = 0.76 + (20 - floorNum) * 0.0115;
    return Math.min(width - 12, width * ratio);
  };

  const safeTop =
    insets && typeof insets.top === 'number' && !isNaN(insets.top)
      ? Math.max(insets.top, Platform.OS === 'android' ? 36 : 14)
      : Platform.OS === 'android'
        ? 36
        : 14;

  const safeBottom =
    insets && typeof insets.bottom === 'number' && !isNaN(insets.bottom)
      ? Math.max(insets.bottom, 24)
      : 24;

  return (
    <View style={hubStyles.root}>
      {/* Dynamic Animated Cyberpunk City Background */}
      <TowerAnimatedBackground />

      {/* Top Sticky Sci-Fi HUD Header */}
      <View style={[hubStyles.hudHeader, { paddingTop: safeTop }]}>
          {/* Top Title & Quick Actions */}
          <View style={hubStyles.hudTopRow}>
              <View>
                <View style={hubStyles.arcadeOnlinePill}>
                  <View style={hubStyles.greenDot} />
                  <Text style={hubStyles.arcadeOnlineText}>
                    20-FLOOR CYBER MEGASTRUCTURE
                  </Text>
                </View>
                <Text style={hubStyles.hubTitle}>GAME TOWER</Text>
              </View>

              <View style={hubStyles.topBtnGroup}>
                {/* Direction Toggle */}
                <Pressable
                  onPress={() => {
                    triggerLightHaptic();
                    playTapSound();
                    setAscendingSort((prev) => !prev);
                  }}
                  style={hubStyles.directionBtn}
                >
                  <Text style={hubStyles.directionBtnText}>
                    {ascendingSort ? '⬆ BASE' : '⬇ APEX'}
                  </Text>
                </Pressable>

                {/* Random Game Launch */}
                <Pressable
                  onPress={handleRandomLaunch}
                  style={({ pressed }) => [
                    hubStyles.randomBtn,
                    pressed && { transform: [{ scale: 0.94 }], opacity: 0.88 },
                  ]}
                >
                  <LinearGradient
                    colors={[COLORS.magenta, COLORS.purple]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={hubStyles.randomBtnGrad}
                  >
                    <Text style={hubStyles.randomBtnText}>⚡ RANDOM</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>

            {/* Arcade Telemetry HUD */}
            <View style={hubStyles.telemetryBar}>
              <View style={hubStyles.telemetryCell}>
                <Text style={hubStyles.telemetrySub}>TOWER POWER</Text>
                <Text style={[hubStyles.telemetryVal, { color: COLORS.cyan }]}>
                  {totalTowerScore.toLocaleString()}
                </Text>
              </View>
              <View style={hubStyles.telemetryDivider} />
              <View style={hubStyles.telemetryCell}>
                <Text style={hubStyles.telemetrySub}>FLOORS SECURED</Text>
                <Text
                  style={[hubStyles.telemetryVal, { color: COLORS.solarGold }]}
                >
                  {`${floorsPlayed} / 20`}
                </Text>
              </View>
              <View style={hubStyles.telemetryDivider} />
              <View style={hubStyles.telemetryCell}>
                <Text style={hubStyles.telemetrySub}>RANK</Text>
                <Text
                  style={[
                    hubStyles.telemetryVal,
                    { color: COLORS.matrixMint, fontSize: 11 },
                  ]}
                >
                  {towerRank}
                </Text>
              </View>
            </View>

            {/* Sector Quick Filter Navigation */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={hubStyles.sectorScroll}
            >
              {SECTORS.map((sec) => {
                const active = selectedSector === sec.id;
                return (
                  <Pressable
                    key={sec.id}
                    onPress={() => {
                      triggerLightHaptic();
                      playTapSound();
                      setSelectedSector(sec.id);
                    }}
                    style={[
                      hubStyles.sectorTab,
                      active && hubStyles.sectorTabActive,
                    ]}
                  >
                    <Text
                      style={[
                        hubStyles.sectorTabText,
                        active && hubStyles.sectorTabTextActive,
                      ]}
                    >
                      {sec.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Main 3D Skyscraper Tower Scroll Area */}
          <ScrollView
            ref={scrollRef}
            style={hubStyles.towerScroll}
            contentContainerStyle={[
              hubStyles.towerScrollContent,
              { paddingBottom: safeBottom + 32 },
            ]}
            showsVerticalScrollIndicator={false}
          >
          {/* APEX ROOFTOP SPIRE (Visible when sorted Apex at top or ALL) */}
          {!ascendingSort && (
            <View style={hubStyles.apexSpireWrapper}>
              <Svg width={180} height={120}>
                <Defs>
                  <SvgLinearGradient id="spireGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#00F5FF" stopOpacity="1" />
                    <Stop offset="50%" stopColor="#7928CA" stopOpacity="0.8" />
                    <Stop offset="100%" stopColor="#FF007F" stopOpacity="0.3" />
                  </SvgLinearGradient>
                </Defs>
                {/* Central Lightning Mast */}
                <Line
                  x1={90}
                  y1={10}
                  x2={90}
                  y2={110}
                  stroke="#00F5FF"
                  strokeWidth={3}
                />
                {/* Warning Red Beacon Dot */}
                <Circle cx={90} cy={10} r={5} fill="#FF0055" />
                <Circle
                  cx={90}
                  cy={10}
                  r={10}
                  stroke="#FF0055"
                  strokeWidth={1}
                  opacity={0.6}
                />
                {/* Diagonal Guy-wire Cables */}
                <Line
                  x1={90}
                  y1={30}
                  x2={40}
                  y2={115}
                  stroke="rgba(0,245,255,0.4)"
                  strokeWidth={1.2}
                />
                <Line
                  x1={90}
                  y1={30}
                  x2={140}
                  y2={115}
                  stroke="rgba(0,245,255,0.4)"
                  strokeWidth={1.2}
                />
                <Line
                  x1={90}
                  y1={65}
                  x2={25}
                  y2={115}
                  stroke="rgba(255,0,127,0.4)"
                  strokeWidth={1.2}
                />
                <Line
                  x1={90}
                  y1={65}
                  x2={155}
                  y2={115}
                  stroke="rgba(255,0,127,0.4)"
                  strokeWidth={1.2}
                />
                {/* Radar Spire Rings */}
                <Circle
                  cx={90}
                  cy={50}
                  r={18}
                  stroke="url(#spireGrad)"
                  strokeWidth={1.5}
                  fill="none"
                />
                <Circle
                  cx={90}
                  cy={75}
                  r={28}
                  stroke="url(#spireGrad)"
                  strokeWidth={1.5}
                  fill="none"
                />
                {/* Spire Cap Base */}
                <Polygon
                  points="70,115 110,115 125,120 55,120"
                  fill="#00F5FF"
                  opacity={0.8}
                />
              </Svg>
              <View style={hubStyles.spireLabelPill}>
                <Text style={hubStyles.spireLabelText}>
                  ▲ APEX SPIRE // ALTITUDE: 2,400M ▲
                </Text>
              </View>
            </View>
          )}

          {/* Stepped Skyscraper Floor Decks (1 to 20) */}
          {displayedGames.map((game, index) => {
            const best = highScores[game.id] || 0;
            const deckWidth = getDeckWidth(game.floorNum);
            const isBaseTier = game.floorNum <= 5;

            return (
              <View
                key={game.id}
                style={[
                  hubStyles.deckRowContainer,
                  { width: '100%', alignItems: 'center' },
                ]}
              >
                {/* Vertical Cable Connectors between floors */}
                {index > 0 && (
                  <View style={hubStyles.deckConduitBridge}>
                    <View
                      style={[
                        hubStyles.conduitWire,
                        { backgroundColor: `${game.accent}77` },
                      ]}
                    />
                    <View style={hubStyles.conduitCenterBeam}>
                      <Text style={hubStyles.conduitText}>❖</Text>
                    </View>
                    <View
                      style={[
                        hubStyles.conduitWire,
                        { backgroundColor: `${game.accent}77` },
                      ]}
                    />
                  </View>
                )}

                {/* 3D Physical Skyscraper Floor Platform */}
                <Pressable
                  onPress={() => handleSelectGame(game.id, game.accent)}
                  style={({ pressed }) => [
                    hubStyles.towerDeck,
                    {
                      width: deckWidth,
                      borderColor: `${game.accent}66`,
                      shadowColor: game.accent,
                    },
                    pressed && {
                      transform: [{ scale: 0.97 }],
                      borderColor: game.accent,
                    },
                  ]}
                >
                  <LinearGradient
                    colors={[
                      'rgba(18, 14, 38, 0.95)',
                      'rgba(8, 6, 22, 0.98)',
                    ]}
                    style={StyleSheet.absoluteFillObject}
                  />

                  {/* 3D Top Bevel Ledge with Glowing Neon Edge */}
                  <View
                    style={[
                      hubStyles.deckRoofBevel,
                      { backgroundColor: game.accent },
                    ]}
                  />

                  {/* Left Elevator / Structural Pylon Column */}
                  <View
                    style={[
                      hubStyles.deckElevatorShaft,
                      { borderColor: `${game.accent}44` },
                    ]}
                  >
                    <View
                      style={[
                        hubStyles.elevatorNode,
                        { backgroundColor: game.accent },
                      ]}
                    />
                    <Text
                      style={[hubStyles.floorNumText, { color: game.accent }]}
                    >
                      {String(game.floorNum).padStart(2, '0')}
                    </Text>
                    <View
                      style={[
                        hubStyles.elevatorNode,
                        { backgroundColor: game.accent },
                      ]}
                    />
                  </View>

                  {/* Holographic Icon Core Chamber */}
                  <View
                    style={[
                      hubStyles.iconCoreChamber,
                      {
                        borderColor: game.accent,
                        backgroundColor: `${game.accent}14`,
                      },
                    ]}
                  >
                    <Text style={hubStyles.iconEmoji}>{game.icon}</Text>
                    <View
                      style={[
                        hubStyles.tierTag,
                        { backgroundColor: `${game.accent}26` },
                      ]}
                    >
                      <Text
                        style={[hubStyles.tierTagText, { color: game.accent }]}
                      >
                        {game.tier}
                      </Text>
                    </View>
                  </View>

                  {/* Center Architectural Info & Badge */}
                  <View style={hubStyles.deckCenterInfo}>
                    <View style={hubStyles.deckHeaderLine}>
                      <Text
                        style={[hubStyles.floorTagLabel, { color: game.accent }]}
                      >
                        {game.floor}
                      </Text>
                      <View
                        style={[
                          hubStyles.badgeChip,
                          { borderColor: `${game.accent}55` },
                        ]}
                      >
                        <Text
                          style={[
                            hubStyles.badgeChipText,
                            { color: game.accent },
                          ]}
                        >
                          {game.badge}
                        </Text>
                      </View>
                    </View>

                    <Text style={hubStyles.deckGameTitle} numberOfLines={1}>
                      {game.title}
                    </Text>
                    <Text numberOfLines={2} style={hubStyles.deckDesc}>
                      {game.desc}
                    </Text>
                  </View>

                  {/* Right Launch Terminal & Score Status */}
                  <View style={hubStyles.deckRightAction}>
                    <View
                      style={[
                        hubStyles.scorePill,
                        {
                          borderColor:
                            best > 0 ? COLORS.solarGold : 'rgba(255,255,255,0.15)',
                        },
                      ]}
                    >
                      <Text style={hubStyles.scorePillLabel}>HI-SCORE</Text>
                      <Text
                        style={[
                          hubStyles.scorePillVal,
                          {
                            color:
                              best > 0
                                ? COLORS.solarGold
                                : COLORS.textSecondary,
                          },
                        ]}
                      >
                        {best > 0 ? best.toLocaleString() : '---'}
                      </Text>
                    </View>

                    <LinearGradient
                      colors={[game.accent, game.secondary]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={hubStyles.engageBtn}
                    >
                      <Text style={hubStyles.engageBtnText}>ENTER ▶</Text>
                    </LinearGradient>
                  </View>

                  {/* Right Edge Hazard Striping for Citadel Base */}
                  {isBaseTier && (
                    <View style={hubStyles.hazardBaseStripes}>
                      <Text style={hubStyles.hazardStripeText}>///</Text>
                    </View>
                  )}
                </Pressable>
              </View>
            );
          })}

          {/* CITADEL GROUND BASE FOUNDATION */}
          <View style={hubStyles.citadelFoundation}>
            <View style={hubStyles.foundationHazardRow}>
              <Text style={hubStyles.foundationHazardText}>
                ⚠️ HAZARD LEVEL 0 // CYBER ARCADE FOUNDATION PEDESTAL ⚠️
              </Text>
            </View>

            <Svg width={width - 24} height={60}>
              <Defs>
                <SvgLinearGradient id="baseGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#1E0D3E" stopOpacity="0.9" />
                  <Stop offset="100%" stopColor="#080315" stopOpacity="1" />
                </SvgLinearGradient>
              </Defs>
              {/* Massive Hydraulic Foundation Bastion */}
              <Polygon
                points={`20,0 ${width - 44},0 ${width - 24},50 0,50`}
                fill="url(#baseGrad)"
                stroke="#00F5FF"
                strokeWidth={1.5}
              />
              {/* Ground Anchor Shock Absorbers */}
              <Rect
                x={40}
                y={20}
                width={30}
                height={30}
                fill="#FF007F"
                opacity={0.3}
              />
              <Rect
                x={width - 94}
                y={20}
                width={30}
                height={30}
                fill="#00F5FF"
                opacity={0.3}
              />
              <Line
                x1={20}
                y1={35}
                x2={width - 44}
                y2={35}
                stroke="#FFD166"
                strokeWidth={1}
                strokeDasharray="4,4"
              />
            </Svg>

            <Text style={hubStyles.foundationFooterNote}>
              MEGASTRUCTURE ARCHITECTURE // VER 2.0 // ZERO LATENCY 60FPS
            </Text>
          </View>
        </ScrollView>
    </View>
  );
}

const hubStyles = StyleSheet.create({
  root: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#030208',
    overflow: 'hidden',
  },
  hudHeader: {
    paddingHorizontal: 14,
    paddingBottom: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(0, 245, 255, 0.35)',
    backgroundColor: '#060414',
    zIndex: 20,
    elevation: 20,
  },
  hudTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  arcadeOnlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 245, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.4)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    marginBottom: 4,
    gap: 6,
    alignSelf: 'flex-start',
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00F5D4',
  },
  arcadeOnlineText: {
    fontSize: 8.5,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.cyan,
    letterSpacing: 1.2,
  },
  hubTitle: {
    fontSize: 26,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2.2,
    textShadowColor: COLORS.cyanGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  topBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  directionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.35)',
    borderRadius: 12,
  },
  directionBtnText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.cyan,
  },
  randomBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: COLORS.magenta,
  },
  randomBtnGrad: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  randomBtnText: {
    fontSize: 10.5,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  telemetryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(18, 12, 38, 0.95)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.35)',
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  telemetryCell: {
    flex: 1,
    alignItems: 'center',
  },
  telemetryDivider: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  telemetrySub: {
    fontSize: 8,
    fontFamily: monoFont,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  telemetryVal: {
    fontSize: 14,
    fontFamily: monoFont,
    fontWeight: '900',
  },
  sectorScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  sectorTab: {
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  sectorTabActive: {
    backgroundColor: 'rgba(0, 245, 255, 0.2)',
    borderColor: COLORS.cyan,
  },
  sectorTabText: {
    fontSize: 9.5,
    fontFamily: monoFont,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.6,
  },
  sectorTabTextActive: {
    color: COLORS.cyan,
  },
  towerScroll: {
    flex: 1,
    zIndex: 10,
    elevation: 10,
  },
  towerScrollContent: {
    paddingTop: 10,
    alignItems: 'center',
  },
  apexSpireWrapper: {
    alignItems: 'center',
    marginBottom: 6,
  },
  spireLabelPill: {
    marginTop: -8,
    backgroundColor: 'rgba(0, 245, 255, 0.16)',
    borderWidth: 1,
    borderColor: COLORS.cyan,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  spireLabelText: {
    fontSize: 9,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.cyan,
    letterSpacing: 1.5,
  },
  deckRowContainer: {
    alignItems: 'center',
  },
  deckConduitBridge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 14,
    width: '100%',
    gap: 8,
  },
  conduitWire: {
    width: 38,
    height: 2,
  },
  conduitCenterBeam: {
    paddingHorizontal: 4,
  },
  conduitText: {
    fontSize: 8,
    color: 'rgba(0, 245, 255, 0.5)',
  },
  towerDeck: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.4,
    paddingVertical: 10,
    paddingHorizontal: 10,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#120E28',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  deckRoofBevel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },
  deckElevatorShaft: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    paddingRight: 6,
    marginRight: 6,
    gap: 3,
  },
  elevatorNode: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  floorNumText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  iconCoreChamber: {
    width: 46,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconEmoji: {
    fontSize: 20,
  },
  tierTag: {
    borderRadius: 4,
    paddingHorizontal: 4,
    marginTop: 2,
  },
  tierTagText: {
    fontSize: 7,
    fontFamily: monoFont,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  deckCenterInfo: {
    flex: 1,
    marginRight: 8,
  },
  deckHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  floorTagLabel: {
    fontSize: 9,
    fontFamily: monoFont,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  badgeChip: {
    borderWidth: 0.8,
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 0.8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  badgeChipText: {
    fontSize: 7.5,
    fontFamily: monoFont,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  deckGameTitle: {
    fontSize: 14,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  deckDesc: {
    fontSize: 10,
    color: COLORS.textSecondary,
    lineHeight: 13,
  },
  deckRightAction: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 6,
  },
  scorePill: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 54,
  },
  scorePillLabel: {
    fontSize: 6.5,
    fontFamily: monoFont,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  scorePillVal: {
    fontSize: 10.5,
    fontFamily: monoFont,
    fontWeight: '900',
  },
  engageBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    minWidth: 62,
    alignItems: 'center',
  },
  engageBtnText: {
    fontSize: 9.5,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#040208',
    letterSpacing: 1,
  },
  hazardBaseStripes: {
    position: 'absolute',
    right: 3,
    top: 6,
    bottom: 6,
    justifyContent: 'center',
    opacity: 0.25,
  },
  hazardStripeText: {
    fontSize: 8,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#FFD166',
  },
  citadelFoundation: {
    alignItems: 'center',
    marginTop: 18,
    width: '100%',
  },
  foundationHazardRow: {
    backgroundColor: 'rgba(255, 209, 102, 0.12)',
    borderWidth: 1,
    borderColor: '#FFD166',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 8,
  },
  foundationHazardText: {
    fontSize: 8.5,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#FFD166',
    letterSpacing: 1.2,
  },
  foundationFooterNote: {
    marginTop: 10,
    fontSize: 8,
    fontFamily: monoFont,
    color: COLORS.textSecondary,
    letterSpacing: 1.4,
  },
});
