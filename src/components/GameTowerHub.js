import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  useWindowDimensions,
  BackHandler,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
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
import CyberSudokuGame from '../games/CyberSudokuGame';
import SaveTheDogGame from '../games/SaveTheDogGame';
import RopeCutGame from '../games/RopeCutGame';
import ColorTubeSortGame from '../games/ColorTubeSortGame';
import ColorSwitchGame from '../games/ColorSwitchGame';
import HardcoreRunnerGame from '../games/HardcoreRunnerGame';
import CyberTetrisGame from '../games/CyberTetrisGame';
import Match3SagaGame from '../games/Match3SagaGame';
import TapAwayArrowsGame from '../games/TapAwayArrowsGame';
import IcyTowerClimberGame from '../games/IcyTowerClimberGame';
import WordScrambleGame from '../games/WordScrambleGame';

import {
  triggerLightHaptic,
  triggerMediumHaptic,
  triggerSliceHaptic,
  triggerSelectionHaptic,
} from '../utils/haptics';
import { playTapSound, playSnapTickSound } from '../utils/sound';
import { useAudioPlayer } from 'expo-audio';

const menuMusicAsset = require('../../assets/menu-music.ogg');
const STORAGE_MUSIC_MUTED_KEY = '@game_tower:music_muted';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export const TOWER_GAMES = [
  {
    id: 'knife_hit',
    floorNum: 30,
    floor: 'FLOOR 30',
    tier: 'APEX',
    title: 'WORD SCRAMBLE',
    category: 'ANAGRAM MATRIX',
    badge: 'LETTER DIAL',
    desc: 'Unscramble cyber letter dials to forge 2 to 7+ letter words. Find more and more words to crack levels.',
    accent: '#00F5FF',
    secondary: '#7928CA',
    icon: '🔤',
    storageKey: '@game_tower:best_scramble_v1',
  },
  {
    id: 'icy_climber',
    floorNum: 29,
    floor: 'FLOOR 29',
    tier: 'ORBIT',
    title: 'SPIRE ASCENT',
    category: 'ARCADE',
    badge: 'FIRE & TURRETS',
    desc: 'Ascend the infinite cyber spire. Dodge incinerating fire platforms, outrun homing sentry bombs, and evade defense turrets.',
    accent: '#00F5FF',
    secondary: '#FF0055',
    icon: '⚡',
    storageKey: '@game_tower:best_climber_v1',
  },
  {
    id: 'tap_away',
    floorNum: 28,
    floor: 'FLOOR 28',
    tier: 'ORBIT',
    title: 'TAP AWAY ARROWS',
    category: 'BRAIN',
    badge: 'LOGIC UNRAVEL',
    desc: 'Unravel directional arrow blocks by tapping only those with clear trajectories off the board.',
    accent: '#39FF14',
    secondary: '#00F5FF',
    icon: '🧭',
    storageKey: '@game_tower:best_arrows_v1',
  },
  {
    id: 'match3_saga',
    floorNum: 27,
    floor: 'FLOOR 27',
    tier: 'ORBIT',
    title: 'MATCH 3 SAGA',
    category: 'PUZZLE',
    badge: 'BRICKS & STARS',
    desc: 'Match glowing gems, shatter armored cyber bricks, and collect caged stars before the countdown ends.',
    accent: '#FF007F',
    secondary: '#FFD166',
    icon: '💎',
    storageKey: '@game_tower:best_match3_v1',
  },
  {
    id: 'cyber_tetris',
    floorNum: 26,
    floor: 'FLOOR 26',
    tier: 'ORBIT',
    title: 'TETRIS NEO',
    category: 'ARCADE',
    badge: 'HARD DROP JUICY',
    desc: 'Classic falling tetrominoes with hold slot, ghost projection, hard drop slams, and juicy multi-clears.',
    accent: '#00F5FF',
    secondary: '#9D4EDD',
    icon: '🧱',
    storageKey: '@game_tower:best_tetris_v1',
  },
  {
    id: 'hardcore_runner',
    floorNum: 25,
    floor: 'FLOOR 25',
    tier: 'ORBIT',
    title: 'CUBE DASH',
    category: 'HARDCORE',
    badge: 'GRAVITY FLIP',
    desc: 'High-speed hardcore rhythm runner with spike hurdles, gravity-flip portals, and attempt counters.',
    accent: '#FFE600',
    secondary: '#FF0055',
    icon: '⚡',
    storageKey: '@game_tower:best_dash_v1',
  },
  {
    id: 'color_switch',
    floorNum: 24,
    floor: 'FLOOR 24',
    tier: 'APEX',
    title: 'COLOR SWITCH NEO',
    category: 'REFLEX',
    badge: 'COLOR GATES',
    desc: 'Bounce your color orb through rotating multi-colored rings matching only your current wavelength.',
    accent: '#FF007F',
    secondary: '#00F5FF',
    icon: '🔘',
    storageKey: '@game_tower:best_switch_v1',
  },
  {
    id: 'color_tube',
    floorNum: 23,
    floor: 'FLOOR 23',
    tier: 'APEX',
    title: 'COLOR TUBE SORT',
    category: 'LOGIC',
    badge: 'WATER SORT NEO',
    desc: 'Transfer neon fluids between lab flasks until each tube holds a single pure wavelength.',
    accent: '#00F5FF',
    secondary: '#FFD166',
    icon: '🧪',
    storageKey: '@game_tower:best_tubes_v1',
  },
  {
    id: 'rope_cut',
    floorNum: 22,
    floor: 'FLOOR 22',
    tier: 'APEX',
    title: 'ROPE DROP',
    category: 'PHYSICS',
    badge: 'SLICING DROP',
    desc: 'Slice suspended ropes with precise timing to swing the quantum ball safely into the floor receptor bucket.',
    accent: '#00F5D4',
    secondary: '#FFD166',
    icon: '🪢',
    storageKey: '@game_tower:best_rope_v1',
  },
  {
    id: 'save_the_dog',
    floorNum: 21,
    floor: 'FLOOR 21',
    tier: 'APEX',
    title: 'SAVE THE DOG',
    category: 'PHYSICS',
    badge: 'DRAW SHIELD',
    desc: 'Draw energy barrier lines to shelter the dog from attacking drone wasp swarms.',
    accent: '#FFD166',
    secondary: '#FF6D00',
    icon: '🐕',
    storageKey: '@game_tower:best_doge_v1',
  },
  {
    id: 'cyber_sudoku',
    floorNum: 20,
    floor: 'FLOOR 20',
    tier: 'APEX',
    title: 'SUDOKU',
    category: 'BRAIN',
    badge: 'QUANTUM 9x9',
    desc: 'Solve the 9x9 quantum grid with pencil notes, conflict scan, and difficulty modes.',
    accent: '#00F5FF',
    secondary: '#9D4EDD',
    icon: '🔢',
    storageKey: '@game_tower:best_sudoku_v1',
  },
  {
    id: 'space_shooter',
    floorNum: 19,
    floor: 'FLOOR 19',
    tier: 'SKY',
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
    floorNum: 18,
    floor: 'FLOOR 18',
    tier: 'SKY',
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
    floorNum: 17,
    floor: 'FLOOR 17',
    tier: 'SKY',
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
    floorNum: 16,
    floor: 'FLOOR 16',
    tier: 'SKY',
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
    floorNum: 15,
    floor: 'FLOOR 15',
    tier: 'SKY',
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
    floorNum: 14,
    floor: 'FLOOR 14',
    tier: 'CORE',
    title: 'WHACK-A-BOT',
    category: 'ARCADE',
    badge: '16 & 25 HOLES',
    desc: 'Smash rogue drones across 16 (4x4) or 25 (5x5) cyber holes with multi-target reflex speed.',
    accent: '#FF2A85',
    secondary: '#FF9E00',
    icon: '🤖',
    storageKey: '@game_tower:best_whackabot_v1',
  },
  {
    id: 'block_blast',
    floorNum: 13,
    floor: 'FLOOR 13',
    tier: 'CORE',
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
    floorNum: 12,
    floor: 'FLOOR 12',
    tier: 'CORE',
    title: 'TIC-TAC-TOE',
    category: 'STRATEGY',
    badge: 'AI BATTLE & 2P',
    desc: 'Claim lines of three against the adaptive AI or battle local 2-Player.',
    accent: '#06D6A0',
    secondary: '#118AB2',
    icon: '⚔️',
    storageKey: '@game_tower:best_ttt_v1',
  },
  {
    id: 'neon_flappy',
    floorNum: 11,
    floor: 'FLOOR 11',
    tier: 'CORE',
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
    floorNum: 10,
    floor: 'FLOOR 10',
    tier: 'CORE',
    title: 'SNAKE',
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
    floorNum: 9,
    floor: 'FLOOR 09',
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
    floorNum: 8,
    floor: 'FLOOR 08',
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
    floorNum: 7,
    floor: 'FLOOR 07',
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
    floorNum: 6,
    floor: 'FLOOR 06',
    tier: 'CORE',
    title: 'SLIDE 15',
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
    floorNum: 5,
    floor: 'FLOOR 05',
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
    floorNum: 4,
    floor: 'FLOOR 04',
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
    floorNum: 3,
    floor: 'FLOOR 03',
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
    floorNum: 2,
    floor: 'FLOOR 02',
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
    floorNum: 1,
    floor: 'FLOOR 01',
    tier: 'BASE',
    title: 'DROP 2048 NEO',
    category: 'PUZZLE',
    badge: 'DROP & MERGE',
    desc: 'Drop numbered boxes from top into 5 columns. Match adjacent boxes to merge into 16, 32, 64+ in multi-directional chain reactions!',
    accent: '#00F5D4',
    secondary: '#0A9396',
    icon: '⊞',
    storageKey: '@game_tower:best_2048_drop_v1',
  },
];

const SECTORS = [
  { id: 'ALL', label: 'ALL (30)' },
  { id: 'ORBIT', label: '🛰️ ORBIT (30-25)' },
  { id: 'APEX', label: '⚡ APEX (24-20)' },
  { id: 'SKY', label: '🏙️ SKY (19-15)' },
  { id: 'CORE', label: '⚙️ CORE (14-05)' },
  { id: 'BASE', label: '🛡️ BASE (04-01)' },
];

/**
 * @param {{ initialGameId?: string | null }} [props]
 */
export default function GameTowerHub({ initialGameId = null } = {}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const juiceRef = useRef(null);
  const scrollRef = useRef(null);

  const musicPlayer = useAudioPlayer(menuMusicAsset);
  const [isMusicMuted, setIsMusicMuted] = useState(false);

  const [activeGameId, setActiveGameId] = useState(initialGameId);
  const lastPlayedGameId = useRef(null);
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [highScores, setHighScores] = useState({});
  const [ascendingSort, setAscendingSort] = useState(false); // false = Apex (20) top, true = Base (01) top

  // Load saved music mute preference
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_MUSIC_MUTED_KEY);
        if (saved !== null) {
          setIsMusicMuted(saved === 'true');
        }
      } catch {}
    })();
  }, []);

  // Manage background menu music playback (loop in hub, pause inside mini-games)
  useEffect(() => {
    if (!musicPlayer) return;
    try {
      musicPlayer.loop = true;
      musicPlayer.volume = 0.55;
      if (!isMusicMuted && activeGameId === null) {
        musicPlayer.play();
      } else {
        musicPlayer.pause();
      }
    } catch {}
  }, [musicPlayer, isMusicMuted, activeGameId]);

  const toggleMusicMute = useCallback(async () => {
    triggerLightHaptic();
    playTapSound();
    const next = !isMusicMuted;
    setIsMusicMuted(next);
    try {
      await AsyncStorage.setItem(STORAGE_MUSIC_MUTED_KEY, String(next));
    } catch {}
  }, [isMusicMuted]);

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

    lastPlayedGameId.current = gameId;
    setTimeout(() => {
      setActiveGameId(gameId);
    }, 120);
  }, [width]);

  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Request to exit (shows confirmation dialog)
  const requestExitToHub = useCallback(() => {
    setShowExitConfirm(true);
    triggerLightHaptic();
    playTapSound();
  }, []);

  // Confirmed exit (actually exits to hub)
  const performExitToHub = useCallback(() => {
    setShowExitConfirm(false);
    setActiveGameId(null);
    try {
      triggerMediumHaptic();
      loadAllHighScores();
    } catch {}
  }, [loadAllHighScores]);

  // Smoothly scroll back to the last played game card upon returning to the Hub!
  useEffect(() => {
    if (activeGameId === null && lastPlayedGameId.current) {
      const targetId = lastPlayedGameId.current;
      const timer = setTimeout(() => {
        const idx = displayedGames.findIndex((g) => g.id === targetId);
        if (idx !== -1) {
          const targetY = layoutPositions.current[idx];
          if (targetY !== undefined && scrollRef.current) {
            scrollRef.current.scrollTo({
              y: Math.max(0, targetY - 60),
              animated: true,
            });
          }
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [activeGameId, displayedGames]);

  // Handle Android mobile hardware / gesture back button
  useEffect(() => {
    const onHardwareBack = () => {
      if (activeGameId !== null) {
        if (showExitConfirm) {
          // If confirmation is already showing, hardware back closes the dialog
          setShowExitConfirm(false);
          triggerLightHaptic();
        } else {
          // Hardware back in game opens confirmation dialog instead of exiting to phone home!
          setShowExitConfirm(true);
          triggerLightHaptic();
          playTapSound();
        }
        return true; // Intercept: do NOT let Android close app to home screen
      }
      return false; // On hub: let Android handle back normally
    };

    const backSub = BackHandler.addEventListener(
      'hardwareBackPress',
      onHardwareBack
    );
    return () => backSub.remove();
  }, [activeGameId, showExitConfirm]);

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
      ? 'CYBER LEGEND'
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

  // Calculate dynamic snapping offsets for each game deck
  const computeInitialOffsets = useCallback(() => {
    const spireOffset = !ascendingSort ? 150 : 0;
    const offsets = [];
    if (!ascendingSort) {
      offsets.push(0);
    }
    const count = displayedGames.length;
    for (let i = 0; i < count; i++) {
      offsets.push(spireOffset + i * 90);
    }
    return offsets;
  }, [ascendingSort, displayedGames.length]);

  const [snapOffsets, setSnapOffsets] = useState(computeInitialOffsets);
  const layoutPositions = useRef({});
  const layoutTimer = useRef(null);
  const lastActiveIndexRef = useRef(-1);

  useEffect(() => {
    layoutPositions.current = {};
    setSnapOffsets(computeInitialOffsets());
  }, [computeInitialOffsets, ascendingSort, selectedSector]);

  const handleDeckLayout = useCallback((index, event) => {
    const { y } = event.nativeEvent.layout;
    layoutPositions.current[index] = y;

    if (!layoutTimer.current) {
      layoutTimer.current = setTimeout(() => {
        layoutTimer.current = null;
        const sorted = Object.keys(layoutPositions.current)
          .map(Number)
          .sort((a, b) => a - b)
          .map((idx) => layoutPositions.current[idx]);
        if (sorted.length > 0) {
          setSnapOffsets(sorted);
        }
      }, 70);
    }
  }, []);

  // Handle magnetic snap detection and cyber ratchet sound/haptics on scroll
  const handleTowerScroll = useCallback(
    (e) => {
      const scrollY = e.nativeEvent.contentOffset.y;
      if (!snapOffsets || snapOffsets.length === 0) return;

      let closestIdx = 0;
      let minDiff = Infinity;
      for (let i = 0; i < snapOffsets.length; i++) {
        const diff = Math.abs(scrollY - snapOffsets[i]);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      }

      if (closestIdx !== lastActiveIndexRef.current) {
        lastActiveIndexRef.current = closestIdx;
        playSnapTickSound();
        triggerSelectionHaptic();
      }
    },
    [snapOffsets]
  );

  const handleMomentumScrollEnd = useCallback(() => {
    playSnapTickSound();
    triggerSelectionHaptic();
  }, []);

  // Render Active Selected Mini-Game with Exit Confirmation Modal
  const renderActiveGame = () => {
    if (!activeGameId) return null;
    const isPaused = showExitConfirm;
    switch (activeGameId) {
      case 'cyber_2048':
        return (
          <Game2048
            isPaused={isPaused}
            onBackToHub={requestExitToHub}
            onScoreUpdate={(s) => handleScoreUpdate('cyber_2048', s)}
          />
        );
      case 'wordly_neo':
        return (
          <WordlyGame
            isPaused={isPaused}
            onBackToHub={requestExitToHub}
            onScoreUpdate={(s) => handleScoreUpdate('wordly_neo', s)}
          />
        );
      case 'neon_mines':
        return (
          <NeonMinesGame
            isPaused={isPaused}
            onBackToHub={requestExitToHub}
            onScoreUpdate={(s) => handleScoreUpdate('neon_mines', s)}
          />
        );
      case 'memory_matrix':
        return (
          <MemoryMatrixGame
            isPaused={isPaused}
            onBackToHub={requestExitToHub}
            onScoreUpdate={(s) => handleScoreUpdate('memory_matrix', s)}
          />
        );
      case 'lights_out':
        return (
          <LightsOutGame
            isPaused={isPaused}
            onBackToHub={requestExitToHub}
            onScoreUpdate={(s) => handleScoreUpdate('lights_out', s)}
          />
        );
      case 'cyber_slide':
        return (
          <SlidingPuzzleGame
            isPaused={isPaused}
            onBackToHub={requestExitToHub}
            onScoreUpdate={(s) => handleScoreUpdate('cyber_slide', s)}
          />
        );
      case 'chroma_flood':
        return (
          <ColorFloodGame
            isPaused={isPaused}
            onBackToHub={requestExitToHub}
            onScoreUpdate={(s) => handleScoreUpdate('chroma_flood', s)}
          />
        );
      case 'simon_pulse':
        return (
          <SimonPulseGame
            isPaused={isPaused}
            onBackToHub={requestExitToHub}
            onScoreUpdate={(s) => handleScoreUpdate('simon_pulse', s)}
          />
        );
      case 'brick_breaker':
        return (
          <BrickBreakerGame
            isPaused={isPaused}
            onBackToHub={requestExitToHub}
            onScoreUpdate={(s) => handleScoreUpdate('brick_breaker', s)}
          />
        );
      case 'cyber_snake':
        return (
          <CyberSnakeGame
            isPaused={isPaused}
            onBackToHub={requestExitToHub}
            onScoreUpdate={(s) => handleScoreUpdate('cyber_snake', s)}
          />
        );
      case 'neon_flappy':
        return (
          <NeonFlappyGame
            isPaused={isPaused}
            onBackToHub={requestExitToHub}
            onScoreUpdate={(s) => handleScoreUpdate('neon_flappy', s)}
          />
        );
      case 'tic_tac_toe':
        return (
          <TicTacToeGame
            isPaused={isPaused}
            onBackToHub={requestExitToHub}
            onScoreUpdate={(s) => handleScoreUpdate('tic_tac_toe', s)}
          />
        );
      case 'block_blast':
        return (
          <BlockBlastGame
            isPaused={isPaused}
            onBackToHub={requestExitToHub}
            onScoreUpdate={(s) => handleScoreUpdate('block_blast', s)}
          />
        );
      case 'whack_a_bot':
        return (
          <WhackABotGame
            isPaused={isPaused}
            onBackToHub={requestExitToHub}
            onScoreUpdate={(s) => handleScoreUpdate('whack_a_bot', s)}
          />
        );
      case 'math_blitz':
        return (
          <MathBlitzGame
            isPaused={isPaused}
            onBackToHub={requestExitToHub}
            onScoreUpdate={(s) => handleScoreUpdate('math_blitz', s)}
          />
        );
      case 'color_stroop':
        return (
          <ColorStroopGame
            isPaused={isPaused}
            onBackToHub={requestExitToHub}
            onScoreUpdate={(s) => handleScoreUpdate('color_stroop', s)}
          />
        );
      case 'hanoi_tower':
        return (
          <HanoiTowerGame
            isPaused={isPaused}
            onBackToHub={requestExitToHub}
            onScoreUpdate={(s) => handleScoreUpdate('hanoi_tower', s)}
          />
        );
      case 'number_hunt':
        return (
          <NumberHuntGame
            isPaused={isPaused}
            onBackToHub={requestExitToHub}
            onScoreUpdate={(s) => handleScoreUpdate('number_hunt', s)}
          />
        );
      case 'space_shooter':
        return (
          <SpaceShooterGame
            isPaused={isPaused}
            onBackToHub={requestExitToHub}
            onScoreUpdate={(s) => handleScoreUpdate('space_shooter', s)}
          />
        );
      case 'cyber_sudoku':
        return (
          <CyberSudokuGame
            isPaused={isPaused}
            onBackToHub={requestExitToHub}
            onScoreUpdate={(s) => handleScoreUpdate('cyber_sudoku', s)}
          />
        );
      case 'save_the_dog':
        return (
          <SaveTheDogGame
            isPaused={isPaused}
            onBackToHub={requestExitToHub}
            onScoreUpdate={(s) => handleScoreUpdate('save_the_dog', s)}
          />
        );
      case 'rope_cut':
        return (
          <RopeCutGame
            isPaused={isPaused}
            onBackToHub={requestExitToHub}
            onScoreUpdate={(s) => handleScoreUpdate('rope_cut', s)}
          />
        );
      case 'color_tube':
        return (
          <ColorTubeSortGame
            isPaused={isPaused}
            onBackToHub={requestExitToHub}
            onScoreUpdate={(s) => handleScoreUpdate('color_tube', s)}
          />
        );
      case 'color_switch':
        return (
          <ColorSwitchGame
            isPaused={isPaused}
            onBackToHub={requestExitToHub}
            onScoreUpdate={(s) => handleScoreUpdate('color_switch', s)}
          />
        );
      case 'hardcore_runner':
        return (
          <HardcoreRunnerGame
            isPaused={isPaused}
            onBackToHub={requestExitToHub}
            onScoreUpdate={(s) => handleScoreUpdate('hardcore_runner', s)}
          />
        );
      case 'cyber_tetris':
        return (
          <CyberTetrisGame
            isPaused={isPaused}
            onBackToHub={requestExitToHub}
            onScoreUpdate={(s) => handleScoreUpdate('cyber_tetris', s)}
          />
        );
      case 'match3_saga':
        return (
          <Match3SagaGame
            isPaused={isPaused}
            onBackToHub={requestExitToHub}
            onScoreUpdate={(s) => handleScoreUpdate('match3_saga', s)}
          />
        );
      case 'tap_away':
        return (
          <TapAwayArrowsGame
            isPaused={isPaused}
            onBackToHub={requestExitToHub}
            onScoreUpdate={(s) => handleScoreUpdate('tap_away', s)}
          />
        );
      case 'icy_climber':
        return (
          <IcyTowerClimberGame
            isPaused={isPaused}
            onBackToHub={requestExitToHub}
            onScoreUpdate={(s) => handleScoreUpdate('icy_climber', s)}
          />
        );
      case 'knife_hit':
        return (
          <WordScrambleGame
            isPaused={isPaused}
            onBackToHub={requestExitToHub}
            onScoreUpdate={(s) => handleScoreUpdate('knife_hit', s)}
          />
        );
      default:
        return null;
    }
  };

  if (activeGameId) {
    return (
      <View style={{ flex: 1, backgroundColor: '#03030A' }}>
        {renderActiveGame()}

        {showExitConfirm && (
          <Modal
            transparent
            visible={showExitConfirm}
            animationType="none"
            statusBarTranslucent
            onRequestClose={() => {
              setShowExitConfirm(false);
              triggerLightHaptic();
            }}
          >
          <Animated.View
            entering={FadeIn.duration(180)}
            style={hubStyles.exitOverlay}
          >
            <Animated.View
              entering={ZoomIn.duration(200)}
              style={hubStyles.exitCard}
            >
              <Text style={hubStyles.exitWarnIcon}>⏸️</Text>
              <Text style={hubStyles.exitTitle}>GAME PAUSED</Text>
              <Text style={hubStyles.exitSubtitle}>
                The game is paused. Tap RESUME to continue or EXIT to return to the tower hub.
              </Text>

              <View style={hubStyles.exitBtnRow}>
                <Pressable
                  onPress={() => {
                    setShowExitConfirm(false);
                    triggerLightHaptic();
                  }}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={hubStyles.exitResumeBtn}
                >
                  <Text style={hubStyles.exitResumeText}>RESUME</Text>
                </Pressable>

                <Pressable
                  onPress={performExitToHub}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={hubStyles.exitConfirmBtn}
                >
                  <Text style={hubStyles.exitConfirmText}>EXIT TO MENU</Text>
                </Pressable>
              </View>
            </Animated.View>
          </Animated.View>
          </Modal>
        )}
      </View>
    );
  }

  // Taper width ratio based on floor number (Floor 21 is ~78% width, Floor 1 is ~98% width)
  const getDeckWidth = (floorNum) => {
    const ratio = 0.76 + (TOWER_GAMES.length - floorNum) * 0.011;
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
      {/* Dynamic Cosmic Galaxy Background with Floating Project Tiles */}
      <TowerAnimatedBackground />

      {/* Top Sticky Sci-Fi HUD Header */}
      <View style={[hubStyles.hudHeader, { paddingTop: safeTop }]}>
          {/* Top Title & Quick Actions */}
          <View style={hubStyles.hudMetaRow}>
            <View style={hubStyles.arcadeOnlinePill}>
              <View style={hubStyles.greenDot} />
              <Text style={hubStyles.arcadeOnlineText}>
                30-FLOOR CYBER MEGASTRUCTURE
              </Text>
            </View>

            <View style={hubStyles.hudUtilGroup}>
              {/* Background Music Mute Toggle */}
              <Pressable
                onPress={toggleMusicMute}
                style={hubStyles.musicBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={hubStyles.musicBtnText}>
                  {isMusicMuted ? '🔇' : '🎵'}
                </Text>
              </Pressable>

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
            </View>
          </View>

          {/* Row 2: Title and Random Button (Fits 100% within screen bounds) */}
          <View style={hubStyles.hudTitleRow}>
            <Text
              style={hubStyles.hubTitle}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              NEO GAME TOWER
            </Text>

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
                  {`${floorsPlayed} / ${TOWER_GAMES.length}`}
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

          {/* Main 3D Skyscraper Tower Scroll Area with Magnetic Game Deck Snapping */}
          <ScrollView
            ref={scrollRef}
            style={hubStyles.towerScroll}
            contentContainerStyle={[
              hubStyles.towerScrollContent,
              { paddingBottom: safeBottom + 32 },
            ]}
            showsVerticalScrollIndicator={false}
            snapToOffsets={snapOffsets.length > 0 ? snapOffsets : undefined}
            snapToAlignment="start"
            decelerationRate="fast"
            onScroll={handleTowerScroll}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            scrollEventThrottle={16}
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
                onLayout={(e) => handleDeckLayout(index, e)}
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
                      <Text style={hubStyles.hazardStripeText}>{'///'}</Text>
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
    backgroundColor: 'rgba(6, 4, 20, 0.90)',
    zIndex: 20,
    elevation: 20,
  },
  hudMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  hudUtilGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hudTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
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
    flex: 1,
    fontSize: 21,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.6,
    textShadowColor: COLORS.cyanGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  musicBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.35)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  musicBtnText: {
    fontSize: 12,
  },
  directionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.35)',
    borderRadius: 10,
  },
  directionBtnText: {
    fontSize: 9.5,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.cyan,
  },
  randomBtn: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: COLORS.magenta,
    flexShrink: 0,
  },
  randomBtnGrad: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  randomBtnText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
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
  exitOverlay: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(3, 3, 10, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  exitCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: 'rgba(12, 14, 30, 0.98)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#FF5E00',
    padding: 22,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    shadowColor: '#FF5E00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 30000,
  },
  exitWarnIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  exitTitle: {
    fontSize: 18,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#FF5E00',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  exitSubtitle: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '600',
    color: '#E2E8F0',
    textAlign: 'center',
    marginVertical: 14,
    lineHeight: 18,
  },
  exitBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
    width: '100%',
  },
  exitResumeBtn: {
    flex: 1,
    backgroundColor: 'rgba(0, 245, 255, 0.15)',
    borderWidth: 1.2,
    borderColor: COLORS.cyan,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  exitResumeText: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.cyan,
    letterSpacing: 1,
  },
  exitConfirmBtn: {
    flex: 1,
    backgroundColor: '#FF0055',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  exitConfirmText: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});
