/* eslint-disable react-hooks/immutability, react-hooks/set-state-in-effect */
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
import { COLORS } from '../../styles';
import TowerAnimatedBackground from './TowerAnimatedBackground';
import JuiceEngine from './JuiceEngine';

// Floor 01 - 20 Game Screen Imports
import Game2048 from '../games/Game2048';
import WordlyGame from '../games/WordlyGame';
import NeonMinesGame from '../games/NeonMinesGame';
import MemoryMatrixGame from '../games/MemoryMatrixGame';
import SlidingPuzzleGame from '../games/SlidingPuzzleGame';
import BrickBreakerGame from '../games/BrickBreakerGame';
import CyberSnakeGame from '../games/CyberSnakeGame';
import NeonFlappyGame from '../games/NeonFlappyGame';
import BoxEscapeGame from '../games/BoxEscapeGame';
import BlockBlastGame from '../games/BlockBlastGame';
import MathBlitzGame from '../games/MathBlitzGame';
import ColorStroopGame from '../games/ColorStroopGame';
import HanoiTowerGame from '../games/HanoiTowerGame';
import NumberHuntGame from '../games/NumberHuntGame';
import SpaceShooterGame from '../games/SpaceShooterGame';
import CyberSudokuGame from '../games/CyberSudokuGame';
import RopeCutGame from '../games/RopeCutGame';
import ColorSwitchGame from '../games/ColorSwitchGame';
import HardcoreRunnerGame from '../games/HardcoreRunnerGame';
import CyberTetrisGame from '../games/CyberTetrisGame';
import TapAwayArrowsGame from '../games/TapAwayArrowsGame';
import IcyTowerClimberGame from '../games/IcyTowerClimberGame';
import WordScrambleGame from '../games/WordScrambleGame';
import CyberPathGame from '../games/CyberPathGame';
import ThiefEscapeGame from '../games/ThiefEscapeGame';

import {
  triggerLightHaptic,
  triggerMediumHaptic,
  triggerSliceHaptic,
  triggerSelectionHaptic,
} from '../utils/haptics';
import { playTapSound, playSnapTickSound } from '../utils/sound';
import { useAudioPlayer } from 'expo-audio';
import {
  CATEGORIES,
  STARTER_GAMES,
  UNLOCK_REQUIREMENTS,
  GAME_CATEGORY_MAP,
  isGameUnlocked,
  getUnlockProgress,
  UNLOCK_ALL_GAMES_FOR_TESTING,
} from '../utils/gameUnlocks';

const menuMusicAsset = require('../../assets/menu-music.ogg');
const STORAGE_MUSIC_MUTED_KEY = '@game_tower:music_muted';
const STORAGE_UNLOCKED_GAMES_KEY = '@game_tower:unlocked_games_v3';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export const TOWER_GAMES = [
  {
    id: 'thief_escape',
    floorNum: 25,
    floor: 'FLOOR 25',
    tier: 'APEX',
    title: 'THIEF ESCAPE',
    category: 'STRATEGY',
    badge: 'STEALTH HEIST',
    desc: 'Scale high-rise buildings, evade flashlight patrol guards, secure emergency fuel, steal the Quantum Diamond, and outrun rival thieves to reach your getaway car!',
    accent: '#00F5FF',
    secondary: '#FFE600',
    icon: '💎',
    storageKey: '@game_tower:best_thief_v1',
  },
  {
    id: 'wordly_neo',
    floorNum: 24,
    floor: 'FLOOR 24',
    tier: 'APEX',
    title: 'WORDLY NEO',
    category: 'WORD',
    badge: '5-LETTER CIPHER',
    desc: 'Crack the 5-letter secret word in 6 tries with live keyboard feedback.',
    accent: '#06D6A0',
    secondary: '#047857',
    icon: '🟩',
    storageKey: '@game_tower:best_wordly_v1',
  },
  {
    id: 'brick_breaker',
    floorNum: 23,
    floor: 'FLOOR 23',
    tier: 'APEX',
    title: 'BRICK BREAKER NEO',
    category: 'ARCADE',
    badge: 'ARKANOID 60FPS',
    desc: 'Deflect the plasma ball with your neon paddle to shatter armored brick barriers.',
    accent: '#00F5FF',
    secondary: '#00BBF9',
    icon: '🏓',
    storageKey: '@game_tower:best_breaker_v1',
  },
  {
    id: 'hardcore_runner',
    floorNum: 22,
    floor: 'FLOOR 22',
    tier: 'APEX',
    title: 'CUBE DASH',
    category: 'HARDCORE',
    badge: 'GRAVITY FLIP',
    desc: 'High-speed hardcore rhythm runner with spike hurdles, gravity-flip portals, and attempt counters.',
    accent: '#FFE600',
    secondary: '#FF0055',
    icon: '🏃',
    storageKey: '@game_tower:best_dash_v1',
  },
  {
    id: 'cyber_sudoku',
    floorNum: 21,
    floor: 'FLOOR 21',
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
    id: 'cyber_2048',
    floorNum: 20,
    floor: 'FLOOR 20',
    tier: 'APEX',
    title: 'DROP 2048 NEO',
    category: 'PUZZLE',
    badge: 'DROP & MERGE',
    desc: 'Drop numbered boxes from top into 5 columns. Match adjacent boxes to merge into 16, 32, 64+ in multi-directional chain reactions!',
    accent: '#00F5D4',
    secondary: '#0A9396',
    icon: '🎲',
    storageKey: '@game_tower:best_2048_drop_v1',
  },
  {
    id: 'tic_tac_toe',
    floorNum: 19,
    floor: 'FLOOR 19',
    tier: 'APEX',
    title: 'BOX ESCAPE',
    category: 'STRATEGY',
    badge: 'PHYSICS CRATE',
    desc: 'Push heavy quantum crates with physical force to clear a pathway to the escape portal. Each level escalates in complexity!',
    accent: '#06D6A0',
    secondary: '#118AB2',
    icon: '📦',
    storageKey: '@game_tower:best_boxescape_v1',
  },
  {
    id: 'cyber_pathfinder',
    floorNum: 18,
    floor: 'FLOOR 18',
    tier: 'SKY',
    title: 'PATHFINDER',
    category: 'PUZZLE',
    badge: 'CONDUIT ROUTE',
    desc: 'Place path tiles to connect the route and guide the explorer from the start flag to the exit trophy!',
    accent: '#00F5D4',
    secondary: '#39FF14',
    icon: '⚡',
    storageKey: '@game_tower:best_pathfinder_v1',
  },
  {
    id: 'knife_hit',
    floorNum: 17,
    floor: 'FLOOR 17',
    tier: 'SKY',
    title: 'WORD SCRAMBLE',
    category: 'ANAGRAM MATRIX',
    badge: 'LETTER DIAL',
    desc: 'Unscramble glowing letter dials to forge 2 to 7+ letter words. Find more and more words to crack levels.',
    accent: '#00F5FF',
    secondary: '#7928CA',
    icon: '🔠',
    storageKey: '@game_tower:best_scramble_v1',
  },
  {
    id: 'icy_climber',
    floorNum: 16,
    floor: 'FLOOR 16',
    tier: 'SKY',
    title: 'SPIRE ASCENT',
    category: 'ARCADE',
    badge: 'FIRE & TURRETS',
    desc: 'Ascend the infinite neo spire. Dodge incinerating fire platforms, outrun homing sentry bombs, and evade defense turrets.',
    accent: '#00F5FF',
    secondary: '#FF0055',
    icon: '🧗',
    storageKey: '@game_tower:best_climber_v1',
  },
  {
    id: 'tap_away',
    floorNum: 15,
    floor: 'FLOOR 15',
    tier: 'SKY',
    title: 'TAP AWAY ARROWS',
    category: 'BRAIN',
    badge: 'LOGIC UNRAVEL',
    desc: 'Unravel directional arrow blocks by tapping only those with clear trajectories off the board.',
    accent: '#39FF14',
    secondary: '#00F5FF',
    icon: '🎯',
    storageKey: '@game_tower:best_arrows_v1',
  },
  {
    id: 'cyber_tetris',
    floorNum: 14,
    floor: 'FLOOR 14',
    tier: 'SKY',
    title: 'TETRIS NEO',
    category: 'ARCADE',
    badge: 'HARD DROP JUICY',
    desc: 'Classic falling tetrominoes with hold slot, ghost projection, hard drop slams, and juicy multi-clears.',
    accent: '#00F5FF',
    secondary: '#9D4EDD',
    icon: '🕹️',
    storageKey: '@game_tower:best_tetris_v1',
  },
  {
    id: 'color_switch',
    floorNum: 13,
    floor: 'FLOOR 13',
    tier: 'SKY',
    title: 'COLOR SWITCH NEO',
    category: 'REFLEX',
    badge: 'COLOR GATES',
    desc: 'Bounce your color orb through rotating multi-colored rings matching only your current wavelength.',
    accent: '#FF007F',
    secondary: '#00F5FF',
    icon: '🌈',
    storageKey: '@game_tower:best_switch_v1',
  },
  {
    id: 'rope_cut',
    floorNum: 12,
    floor: 'FLOOR 12',
    tier: 'CORE',
    title: 'ROPE DROP',
    category: 'PHYSICS',
    badge: 'SLICING DROP',
    desc: 'Slice suspended ropes with precise timing to swing the quantum ball safely into the floor receptor bucket.',
    accent: '#00F5D4',
    secondary: '#FFD166',
    icon: '✂️',
    storageKey: '@game_tower:best_rope_v1',
  },
  {
    id: 'space_shooter',
    floorNum: 11,
    floor: 'FLOOR 11',
    tier: 'CORE',
    title: 'SPACE SHOOTER NEO',
    category: 'ARCADE',
    badge: '60FPS AUTO-LASER',
    desc: 'Pilot the quantum starfighter through plasma asteroid belts & enemy cruiser wings.',
    accent: '#00F5FF',
    secondary: '#7928CA',
    icon: '🚀',
    storageKey: '@game_tower:best_shooter_v1',
  },
  {
    id: 'number_hunt',
    floorNum: 10,
    floor: 'FLOOR 10',
    tier: 'CORE',
    title: 'NUMBER HUNT',
    category: 'BRAIN',
    badge: 'SCHULTE SPEED',
    desc: 'Tap scrambled quantum digits in ascending order (5×5, 6×6, 8×8).',
    accent: '#00F5D4',
    secondary: '#0088FF',
    icon: '⏱️',
    storageKey: '@game_tower:best_schulte_v1',
  },
  {
    id: 'hanoi_tower',
    floorNum: 9,
    floor: 'FLOOR 09',
    tier: 'CORE',
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
    floorNum: 8,
    floor: 'FLOOR 08',
    tier: 'CORE',
    title: 'COLOR STROOP',
    category: 'BRAIN',
    badge: 'REFLEX CLASH',
    desc: 'Identify the ink color before your neural cortex reads the word itself.',
    accent: '#FF007F',
    secondary: '#B5179E',
    icon: '🎨',
    storageKey: '@game_tower:best_stroop_v1',
  },
  {
    id: 'math_blitz',
    floorNum: 7,
    floor: 'FLOOR 07',
    tier: 'CORE',
    title: 'MATH BLITZ',
    category: 'BRAIN',
    badge: 'SPEED ARITHMETIC',
    desc: 'Solve escalating arithmetic equations against the hyper-depleting turbo clock.',
    accent: '#80FF72',
    secondary: '#00F5D4',
    icon: '💡',
    storageKey: '@game_tower:best_mathblitz_v1',
  },
  {
    id: 'block_blast',
    floorNum: 6,
    floor: 'FLOOR 06',
    tier: 'CORE',
    title: 'BLOCK BLAST 8x8',
    category: 'PUZZLE',
    badge: 'GRID BLASTER',
    desc: 'Slot polyomino neon shapes to detonate full rows and columns in multi-combos.',
    accent: '#48BFE3',
    secondary: '#7209B7',
    icon: '🔷',
    storageKey: '@game_tower:best_blockblast_v1',
  },
  {
    id: 'neon_flappy',
    floorNum: 5,
    floor: 'FLOOR 05',
    tier: 'BASE',
    title: 'NEON FLAPPY',
    category: 'ARCADE',
    badge: 'PULSE JET',
    desc: 'Navigate the quantum drone through lethal laser gates with rhythmic tap pulses.',
    accent: '#FFD166',
    secondary: '#EF476F',
    icon: '🛸',
    storageKey: '@game_tower:best_flappy_v1',
  },
  {
    id: 'cyber_snake',
    floorNum: 4,
    floor: 'FLOOR 04',
    tier: 'BASE',
    title: 'SNAKE',
    category: 'ARCADE',
    badge: 'RETRO 15x15',
    desc: 'Slither through the grid arena, devour golden energy orbs, and grow your light trail.',
    accent: '#80FF72',
    secondary: '#00F5FF',
    icon: '🐍',
    storageKey: '@game_tower:best_snake_v1',
  },
  {
    id: 'cyber_slide',
    floorNum: 3,
    floor: 'FLOOR 03',
    tier: 'BASE',
    title: 'SLIDE 15 / 30 / 45',
    category: 'PUZZLE',
    badge: 'SLIDING MATRIX',
    desc: 'Order numbered blocks in ascending sequence across Easy (Slide 15), Medium (Slide 30), and Hard (Slide 45) challenge modes.',
    accent: '#FFD166',
    secondary: '#F77F00',
    icon: '🧩',
    storageKey: '@game_tower:best_slide15_v1',
  },
  {
    id: 'memory_matrix',
    floorNum: 2,
    floor: 'FLOOR 02',
    tier: 'BASE',
    title: 'MEMORY MATRIX',
    category: 'BRAIN',
    badge: 'PAIR MATCH',
    desc: 'Flip neural data cards and chain consecutive pair matches for streak points.',
    accent: '#C77DFF',
    secondary: '#7209B7',
    icon: '🧠',
    storageKey: '@game_tower:best_memory_v1',
  },
  {
    id: 'neon_mines',
    floorNum: 1,
    floor: 'FLOOR 01',
    tier: 'BASE',
    title: 'NEON MINES',
    category: 'STRATEGY',
    badge: 'MINESWEEPER',
    desc: 'Scan the 7x7 grid, flag hidden plasma mines, and sweep safe sectors.',
    accent: '#FF007F',
    secondary: '#B5179E',
    icon: '🚩',
    storageKey: '@game_tower:best_mines_v1',
  },
];

/**
 * @param {{ initialGameId?: string | null, isSplashActive?: boolean }} [props]
 */
export default function GameTowerHub({ initialGameId = null, isSplashActive = false } = {}) {
  const insets = useSafeAreaInsets();
  const safeTop = insets.top > 0 ? insets.top : Platform.OS === 'android' ? 8 : 0;
  const safeBottom = Math.max(insets.bottom, 12);
  const { width } = useWindowDimensions();
  const juiceRef = useRef(null);
  const scrollRef = useRef(null);

  const musicPlayer = useAudioPlayer(menuMusicAsset);
  const [isMusicMuted, setIsMusicMuted] = useState(false);

  const [activeGameId, setActiveGameId] = useState(initialGameId);
  const lastPlayedGameId = useRef(null);
  const [highScores, setHighScores] = useState({});
  const [ascendingSort, setAscendingSort] = useState(false); // false = Apex top, true = Base (01) top

  // 2 Screen Tabs: 'TOWER' (only unlocked games in 3D skyscraper) vs 'ALL_GAMES' (grid view with all locked/unlocked)
  const [activeTab, setActiveTab] = useState('TOWER');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [unlockedGames, setUnlockedGames] = useState(() =>
    UNLOCK_ALL_GAMES_FOR_TESTING
      ? TOWER_GAMES.map((g) => g.id)
      : [...STARTER_GAMES]
  );
  const [unlockModalGame, setUnlockModalGame] = useState(null);

  // Load saved music mute preference & unlocked games
  useEffect(() => {
    (async () => {
      try {
        const savedMute = await AsyncStorage.getItem(STORAGE_MUSIC_MUTED_KEY);
        if (savedMute !== null) {
          setIsMusicMuted(savedMute === 'true');
        }
        if (!UNLOCK_ALL_GAMES_FOR_TESTING) {
          const savedUnlocked = await AsyncStorage.getItem(STORAGE_UNLOCKED_GAMES_KEY);
          if (savedUnlocked) {
            const list = JSON.parse(savedUnlocked);
            if (Array.isArray(list)) {
              setUnlockedGames(Array.from(new Set([...STARTER_GAMES, ...list])));
            }
          }
        }
      } catch {}
    })();
  }, []);

  const isGameCurrentUnlocked = useCallback(
    (gameId) => isGameUnlocked(gameId, highScores, unlockedGames),
    [highScores, unlockedGames]
  );

  // Manage background menu music playback (loop in hub, pause inside mini-games)
  useEffect(() => {
    if (!musicPlayer) return;
    try {
      musicPlayer.loop = true;
      musicPlayer.volume = 0.55;
      if (!isMusicMuted && activeGameId === null && !isSplashActive) {
        musicPlayer.play();
      } else {
        musicPlayer.pause();
      }
    } catch {}
  }, [musicPlayer, isMusicMuted, activeGameId, isSplashActive]);

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

  // Confirmed exit (actually exits to hub)
  const performExitToHub = useCallback(() => {
    setShowExitConfirm(false);
    setActiveGameId(null);
    try {
      triggerMediumHaptic();
      loadAllHighScores();
    } catch {}
  }, [loadAllHighScores]);

  // Request to exit (instantly returns to Hub)
  const requestExitToHub = useCallback(() => {
    performExitToHub();
  }, [performExitToHub]);

  // Handle Android mobile hardware / gesture back button
  useEffect(() => {
    const onHardwareBack = () => {
      if (activeGameId !== null) {
        if (showExitConfirm) {
          setShowExitConfirm(false);
          triggerLightHaptic();
        } else {
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

  // Check and unlock new games when scores update
  const checkAndUnlockGames = useCallback(
    (gameId, score) => {
      setUnlockedGames((prevUnlocked) => {
        const newlyUnlocked = [];
        Object.entries(UNLOCK_REQUIREMENTS).forEach(([lockedId, req]) => {
          if (
            req.reqGame === gameId &&
            score >= req.targetScore &&
            !prevUnlocked.includes(lockedId)
          ) {
            newlyUnlocked.push(lockedId);
          }
        });

        if (newlyUnlocked.length > 0) {
          const nextList = Array.from(new Set([...prevUnlocked, ...newlyUnlocked]));
          AsyncStorage.setItem(
            STORAGE_UNLOCKED_GAMES_KEY,
            JSON.stringify(nextList)
          ).catch(() => {});

          const unlockedObj = TOWER_GAMES.find((g) => g.id === newlyUnlocked[0]);
          if (unlockedObj && juiceRef.current) {
            juiceRef.current.flash(unlockedObj.accent);
            juiceRef.current.burst(width / 2, 280, unlockedObj.accent, 24);
            juiceRef.current.popup(
              '🎉 NEW GAME UNLOCKED!',
              `${unlockedObj.title} is now available in your Tower!`,
              unlockedObj.accent
            );
            triggerMediumHaptic();
          }
          return nextList;
        }
        return prevUnlocked;
      });
    },
    [width]
  );

  // Sync unlocked games with any existing high scores
  useEffect(() => {
    if (Object.keys(highScores).length > 0) {
      setUnlockedGames((prev) => {
        const newlyUnlocked = [];
        Object.entries(UNLOCK_REQUIREMENTS).forEach(([lockedId, req]) => {
          const s = highScores[req.reqGame] || 0;
          if (s >= req.targetScore && !prev.includes(lockedId)) {
            newlyUnlocked.push(lockedId);
          }
        });
        if (newlyUnlocked.length > 0) {
          const combined = Array.from(new Set([...prev, ...newlyUnlocked]));
          AsyncStorage.setItem(
            STORAGE_UNLOCKED_GAMES_KEY,
            JSON.stringify(combined)
          ).catch(() => {});
          return combined;
        }
        return prev;
      });
    }
  }, [highScores]);

  const handleScoreUpdate = useCallback(
    (gameId, newScore) => {
      setHighScores((prev) => {
        const current = prev[gameId] || 0;
        if (newScore > current) {
          setTimeout(() => checkAndUnlockGames(gameId, newScore), 120);
          return { ...prev, [gameId]: newScore };
        }
        return prev;
      });
    },
    [checkAndUnlockGames]
  );

  // Compute Tower Telemetry
  const totalTowerScore = Object.values(highScores).reduce(
    (sum, val) => sum + (val || 0),
    0
  );
  const towerRank =
    totalTowerScore >= 10000
      ? 'TOWER LEGEND'
      : totalTowerScore >= 5000
        ? 'APEX OVERLORD'
        : totalTowerScore >= 2000
          ? 'TOWER MASTER'
          : totalTowerScore >= 600
            ? 'SECTOR RUNNER'
            : totalTowerScore > 0
              ? 'GRID INITIATE'
              : 'ROOKIE';

  const displayedGames = [...TOWER_GAMES].sort((a, b) =>
    ascendingSort ? a.floorNum - b.floorNum : b.floorNum - a.floorNum
  );

  // ONLY UNLOCKED GAMES ARE PART OF THE TOWER!
  const unlockedTowerGames = displayedGames.filter((g) =>
    isGameCurrentUnlocked(g.id)
  );

  // ALL GAMES GRID: sorted by floor, filtered by selected category
  const allGamesGridList = [...TOWER_GAMES]
    .sort((a, b) => b.floorNum - a.floorNum)
    .filter((g) => {
      if (selectedCategory === 'ALL') return true;
      return GAME_CATEGORY_MAP[g.id] === selectedCategory;
    });

  const unlockedCount = TOWER_GAMES.filter((g) =>
    isGameCurrentUnlocked(g.id)
  ).length;

  const handleRandomLaunch = () => {
    const pool = unlockedTowerGames.length > 0 ? unlockedTowerGames : TOWER_GAMES;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    handleSelectGame(pick.id, pick.accent);
  };

  // Smoothly scroll back to the last played game card upon returning to the Hub!
  useEffect(() => {
    if (activeGameId === null && lastPlayedGameId.current) {
      const targetId = lastPlayedGameId.current;
      const timer = setTimeout(() => {
        const idx = unlockedTowerGames.findIndex((g) => g.id === targetId);
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
  }, [activeGameId, unlockedTowerGames]);

  // Calculate dynamic snapping offsets for unlocked tower floor decks
  const computeInitialOffsets = useCallback(() => {
    const offsets = [0];
    const count = unlockedTowerGames.length;
    for (let i = 0; i < count; i++) {
      offsets.push(i * 84);
    }
    return offsets;
  }, [unlockedTowerGames.length]);

  const [snapOffsets, setSnapOffsets] = useState(computeInitialOffsets);
  const layoutPositions = useRef({});
  const layoutTimer = useRef(null);
  const lastActiveIndexRef = useRef(-1);

  useEffect(() => {
    layoutPositions.current = {};
    setSnapOffsets(computeInitialOffsets());
  }, [computeInitialOffsets, ascendingSort, unlockedTowerGames.length]);

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
          // Prepend 0 as the origin anchor so the ScrollView always starts flush at the top
          setSnapOffsets([0, ...sorted]);
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
      case 'cyber_slide':
        return (
          <SlidingPuzzleGame
            isPaused={isPaused}
            onBackToHub={requestExitToHub}
            onScoreUpdate={(s) => handleScoreUpdate('cyber_slide', s)}
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
      case 'box_escape':
        return (
          <BoxEscapeGame
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
      case 'rope_cut':
        return (
          <RopeCutGame
            isPaused={isPaused}
            onBackToHub={requestExitToHub}
            onScoreUpdate={(s) => handleScoreUpdate('rope_cut', s)}
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
      case 'cyber_pathfinder':
        return (
          <CyberPathGame
            isPaused={isPaused}
            onBackToHub={requestExitToHub}
            onScoreUpdate={(s) => handleScoreUpdate('cyber_pathfinder', s)}
          />
        );
      case 'thief_escape':
        return (
          <ThiefEscapeGame
            isPaused={isPaused}
            onBackToHub={requestExitToHub}
            onScoreUpdate={(s) => handleScoreUpdate('thief_escape', s)}
          />
        );
      default:
        return null;
    }
  };

  if (activeGameId) {
    return (
      <View style={{ flex: 1, backgroundColor: '#03030A' }}>
        <View
          style={{ flex: 1 }}
          pointerEvents={showExitConfirm ? 'none' : 'auto'}
        >
          {renderActiveGame()}
        </View>

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
            <View style={hubStyles.exitOverlay}>
              {/* Tap backdrop to resume */}
              <Pressable
                style={StyleSheet.absoluteFillObject}
                onPress={() => {
                  setShowExitConfirm(false);
                  triggerLightHaptic();
                }}
              >
                <Animated.View
                  entering={FadeIn.duration(180)}
                  style={StyleSheet.absoluteFillObject}
                >
                  <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(3, 3, 10, 0.92)' }} />
                </Animated.View>
              </Pressable>

              <Animated.View
                entering={ZoomIn.duration(200)}
                style={hubStyles.exitCard}
              >
                <View style={{ width: '100%', alignItems: 'center' }}>
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
                      hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                      style={({ pressed }) => [
                        hubStyles.exitResumeBtn,
                        pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] },
                      ]}
                    >
                      <Text style={hubStyles.exitResumeText}>RESUME</Text>
                    </Pressable>

                    <Pressable
                      onPress={performExitToHub}
                      hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                      style={({ pressed }) => [
                        hubStyles.exitConfirmBtn,
                        pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] },
                      ]}
                    >
                      <Text style={hubStyles.exitConfirmText}>EXIT TO MENU</Text>
                    </Pressable>
                  </View>
                </View>
              </Animated.View>
            </View>
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

  return (
    <View style={hubStyles.root}>
      {/* Dynamic Cosmic Galaxy Background with Floating Project Tiles */}
      <TowerAnimatedBackground />

      {/* Screen juice engine overlay for particle bursts, popups & screen flashes */}
      <JuiceEngine ref={juiceRef} pointerEvents="none" />

      {/* Top Sticky Sci-Fi HUD Header */}
      <View style={[hubStyles.hudHeader, { paddingTop: safeTop }]}>
          {/* Top Title & Utilities Row */}
          <View style={hubStyles.hudTitleRow}>
            <View style={hubStyles.titleGroup}>
              <Text
                style={hubStyles.hubTitle}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                NEO GAME TOWER
              </Text>
              <View style={hubStyles.arcadeOnlinePill}>
                <View style={hubStyles.greenDot} />
                <Text style={hubStyles.arcadeOnlineText}>
                  {`${TOWER_GAMES.length}-FLOOR MEGASTRUCTURE`}
                </Text>
              </View>
            </View>

            <View style={hubStyles.hudUtilGroup}>
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

              {/* Direction Toggle (Active only in Tower Tab) */}
              {activeTab === 'TOWER' && (
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
              )}
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
              <Text style={hubStyles.telemetrySub}>TOWER FLOORS</Text>
              <Text
                style={[hubStyles.telemetryVal, { color: COLORS.solarGold }]}
              >
                {`${unlockedCount} / ${TOWER_GAMES.length}`}
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

          {/* Screen Tab Switcher: 🗼 TOWER (Unlocked Only) vs 🎮 ALL GAMES (Grid Boxes) */}
          <View style={hubStyles.tabSwitcherRow}>
            <Pressable
              onPress={() => {
                triggerLightHaptic();
                playTapSound();
                setActiveTab('TOWER');
              }}
              style={[
                hubStyles.tabSwitcherBtn,
                activeTab === 'TOWER' && hubStyles.tabSwitcherBtnActiveTower,
              ]}
            >
              <LinearGradient
                colors={
                  activeTab === 'TOWER'
                    ? ['rgba(0, 245, 255, 0.28)', 'rgba(0, 245, 255, 0.08)']
                    : ['rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.02)']
                }
                style={hubStyles.tabSwitcherGrad}
              >
                <Text
                  style={[
                    hubStyles.tabSwitcherText,
                    activeTab === 'TOWER' && hubStyles.tabSwitcherTextActiveTower,
                  ]}
                >
                  🗼 TOWER ({unlockedCount})
                </Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => {
                triggerLightHaptic();
                playTapSound();
                setActiveTab('ALL_GAMES');
              }}
              style={[
                hubStyles.tabSwitcherBtn,
                activeTab === 'ALL_GAMES' && hubStyles.tabSwitcherBtnActiveGrid,
              ]}
            >
              <LinearGradient
                colors={
                  activeTab === 'ALL_GAMES'
                    ? ['rgba(255, 0, 127, 0.28)', 'rgba(121, 40, 202, 0.16)']
                    : ['rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.02)']
                }
                style={hubStyles.tabSwitcherGrad}
              >
                <Text
                  style={[
                    hubStyles.tabSwitcherText,
                    activeTab === 'ALL_GAMES' && hubStyles.tabSwitcherTextActiveGrid,
                  ]}
                >
                  🎮 ALL GAMES ({TOWER_GAMES.length})
                </Text>
              </LinearGradient>
            </Pressable>
          </View>

          {/* Sub-Filters: Category Filter for All Games Grid Only */}
          {activeTab === 'ALL_GAMES' && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={hubStyles.sectorScroll}
            >
              {CATEGORIES.map((cat) => {
                const active = selectedCategory === cat.id;
                const count =
                  cat.id === 'ALL'
                    ? TOWER_GAMES.length
                    : TOWER_GAMES.filter((g) => GAME_CATEGORY_MAP[g.id] === cat.id).length;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => {
                      triggerLightHaptic();
                      playTapSound();
                      setSelectedCategory(cat.id);
                    }}
                    style={[
                      hubStyles.sectorTab,
                      active && hubStyles.categoryTabActive,
                    ]}
                  >
                    <Text
                      style={[
                        hubStyles.sectorTabText,
                        active && hubStyles.categoryTabTextActive,
                      ]}
                    >
                      {cat.icon} {cat.label} ({count})
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

          {/* MAIN VIEWPORT: TAB 1 TOWER vs TAB 2 ALL GAMES GRID */}
          {activeTab === 'TOWER' ? (
            <ScrollView
              ref={scrollRef}
              style={hubStyles.towerScroll}
              contentContainerStyle={[
                hubStyles.towerScrollContent,
                { paddingBottom: safeBottom + 32 },
              ]}
              contentOffset={{ x: 0, y: 0 }}
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
                  <Svg width={140} height={24}>
                    <Defs>
                      <SvgLinearGradient id="spireGrad" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor="#00F5FF" stopOpacity="1" />
                        <Stop offset="100%" stopColor="#FF007F" stopOpacity="0.4" />
                      </SvgLinearGradient>
                    </Defs>
                    {/* Central Lightning Mast */}
                    <Line
                      x1={70}
                      y1={2}
                      x2={70}
                      y2={22}
                      stroke="#00F5FF"
                      strokeWidth={2.5}
                    />
                    {/* Warning Red Beacon Dot */}
                    <Circle cx={70} cy={3.5} r={3} fill="#FF0055" />
                    <Circle
                      cx={70}
                      cy={3.5}
                      r={6}
                      stroke="#FF0055"
                      strokeWidth={1}
                      opacity={0.6}
                    />
                    {/* Diagonal Guy-wire Cables */}
                    <Line
                      x1={70}
                      y1={10}
                      x2={35}
                      y2={22}
                      stroke="rgba(0,245,255,0.4)"
                      strokeWidth={1.2}
                    />
                    <Line
                      x1={70}
                      y1={10}
                      x2={105}
                      y2={22}
                      stroke="rgba(0,245,255,0.4)"
                      strokeWidth={1.2}
                    />
                    {/* Spire Base */}
                    <Polygon
                      points="55,21 85,21 95,24 45,24"
                      fill="#00F5FF"
                      opacity={0.7}
                    />
                  </Svg>
                  <View style={hubStyles.spireLabelPill}>
                    <Text style={hubStyles.spireLabelText}>
                      ▲ APEX SPIRE // ALTITUDE: 2,400M ▲
                    </Text>
                  </View>
                </View>
              )}

              {/* Stepped Skyscraper Floor Decks (ONLY UNLOCKED GAMES ARE IN THE TOWER) */}
              {unlockedTowerGames.map((game, index) => {
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

                      {/* Holographic Icon Core Chamber */}
                      <View
                        style={[
                          hubStyles.iconCoreChamber,
                          {
                            borderColor: game.accent,
                            backgroundColor: `${game.accent}22`,
                          },
                        ]}
                      >
                        <Text style={hubStyles.iconEmoji}>{game.icon}</Text>
                        <View
                          style={[
                            hubStyles.tierTag,
                            { backgroundColor: `${game.accent}33` },
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

              {/* Expand Tower Card (Prompts to unlock more in All Games tab) */}
              {unlockedCount < TOWER_GAMES.length && (
                <Pressable
                  onPress={() => {
                    triggerLightHaptic();
                    playTapSound();
                    setActiveTab('ALL_GAMES');
                  }}
                  style={hubStyles.towerExpandCard}
                >
                  <LinearGradient
                    colors={['rgba(255, 0, 127, 0.24)', 'rgba(121, 40, 202, 0.36)']}
                    style={hubStyles.towerExpandGrad}
                  >
                    <Text style={hubStyles.towerExpandIcon}>🔒</Text>
                    <View style={{ flex: 1, paddingRight: 6 }}>
                      <Text style={hubStyles.towerExpandTitle}>
                        {TOWER_GAMES.length - unlockedCount} MORE FLOORS ENCRYPTED
                      </Text>
                      <Text style={hubStyles.towerExpandSub}>
                        Play games in each category to unlock new floors for your Tower. Tap to open missions ➔
                      </Text>
                    </View>
                    <Text style={hubStyles.towerExpandArrow}>➔</Text>
                  </LinearGradient>
                </Pressable>
              )}

              {/* CITADEL GROUND BASE FOUNDATION */}
              <View style={hubStyles.citadelFoundation}>
                <View style={hubStyles.foundationHazardRow}>
                  <Text style={hubStyles.foundationHazardText}>
                    ⚠️ HAZARD LEVEL 0 // ARCADE FOUNDATION PEDESTAL ⚠️
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
          ) : (
            /* TAB 2: ALL GAMES CYBERPUNK 2-COLUMN GRID VIEW */
            <ScrollView
              style={hubStyles.gridScroll}
              contentContainerStyle={[
                hubStyles.gridScrollContent,
                { paddingBottom: safeBottom + 36 },
              ]}
              showsVerticalScrollIndicator={false}
            >
              <View style={hubStyles.gridRowWrap}>
                {allGamesGridList.map((game) => {
                  const unlocked = isGameCurrentUnlocked(game.id);
                  const best = highScores[game.id] || 0;
                  const req = UNLOCK_REQUIREMENTS[game.id];
                  const progress = getUnlockProgress(game.id, highScores);
                  const cardWidth = Math.floor((width - 34) / 2);

                  if (unlocked) {
                    return (
                      <Pressable
                        key={game.id}
                        onPress={() => handleSelectGame(game.id, game.accent)}
                        style={({ pressed }) => [
                          hubStyles.gridCard,
                          {
                            width: cardWidth,
                            borderColor: `${game.accent}77`,
                            shadowColor: game.accent,
                          },
                          pressed && {
                            transform: [{ scale: 0.96 }],
                            borderColor: game.accent,
                          },
                        ]}
                      >
                        <LinearGradient
                          colors={[
                            'rgba(22, 16, 46, 0.96)',
                            'rgba(9, 6, 24, 0.98)',
                          ]}
                          style={StyleSheet.absoluteFillObject}
                        />
                        {/* Top glowing strip */}
                        <View
                          style={[
                            hubStyles.gridTopBar,
                            { backgroundColor: game.accent },
                          ]}
                        />

                        {/* Floor and category header */}
                        <View style={hubStyles.gridCardHeader}>
                          <View
                            style={[
                              hubStyles.gridFloorBadge,
                              { borderColor: `${game.accent}66` },
                            ]}
                          >
                            <Text
                              style={[
                                hubStyles.gridFloorText,
                                { color: game.accent },
                              ]}
                            >
                              FL {String(game.floorNum).padStart(2, '0')}
                            </Text>
                          </View>
                          <Text style={hubStyles.gridCategoryTag}>
                            {game.category}
                          </Text>
                        </View>

                        {/* Icon Chamber */}
                        <View
                          style={[
                            hubStyles.gridIconWrapper,
                            {
                              borderColor: `${game.accent}66`,
                              backgroundColor: `${game.accent}18`,
                            },
                          ]}
                        >
                          <Text style={hubStyles.gridIconEmoji}>{game.icon}</Text>
                        </View>

                        {/* Title */}
                        <Text style={hubStyles.gridGameTitle} numberOfLines={1}>
                          {game.title}
                        </Text>

                        {/* Score row */}
                        <View style={hubStyles.gridScoreRow}>
                          <Text style={hubStyles.gridScoreLabel}>BEST:</Text>
                          <Text
                            style={[
                              hubStyles.gridScoreVal,
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

                        {/* Play CTA */}
                        <LinearGradient
                          colors={[game.accent, game.secondary]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={hubStyles.gridPlayBtn}
                        >
                          <Text style={hubStyles.gridPlayBtnText}>PLAY ▶</Text>
                        </LinearGradient>
                      </Pressable>
                    );
                  }

                  // Locked Game Grid Card
                  return (
                    <Pressable
                      key={game.id}
                      onPress={() => {
                        triggerLightHaptic();
                        playTapSound();
                        setUnlockModalGame(game);
                      }}
                      style={({ pressed }) => [
                        hubStyles.gridCard,
                        hubStyles.gridCardLocked,
                        { width: cardWidth },
                        pressed && {
                          transform: [{ scale: 0.97 }],
                          borderColor: '#FF0055',
                        },
                      ]}
                    >
                      <LinearGradient
                        colors={[
                          'rgba(16, 12, 28, 0.94)',
                          'rgba(8, 6, 18, 0.98)',
                        ]}
                        style={StyleSheet.absoluteFillObject}
                      />
                      {/* Top locked strip */}
                      <View
                        style={[
                          hubStyles.gridTopBar,
                          { backgroundColor: '#FF0055' },
                        ]}
                      />

                      {/* Header */}
                      <View style={hubStyles.gridCardHeader}>
                        <View
                          style={[
                            hubStyles.gridFloorBadge,
                            { borderColor: 'rgba(255,255,255,0.18)' },
                          ]}
                        >
                          <Text
                            style={[hubStyles.gridFloorText, { color: '#94A3B8' }]}
                          >
                            FL {String(game.floorNum).padStart(2, '0')}
                          </Text>
                        </View>
                        <View style={hubStyles.gridLockBadge}>
                          <Text style={hubStyles.gridLockBadgeText}>
                            🔒 LOCKED
                          </Text>
                        </View>
                      </View>

                      {/* Icon with lock overlay */}
                      <View style={hubStyles.gridIconWrapperLocked}>
                        <Text style={hubStyles.gridIconEmojiLocked}>
                          {game.icon}
                        </Text>
                        <View style={hubStyles.lockOverlayCenter}>
                          <Text style={{ fontSize: 16 }}>🔒</Text>
                        </View>
                      </View>

                      {/* Title */}
                      <Text
                        style={hubStyles.gridGameTitleLocked}
                        numberOfLines={1}
                      >
                        {game.title}
                      </Text>

                      {/* Requirement & Progress */}
                      <View style={hubStyles.gridReqSnippet}>
                        <Text
                          style={hubStyles.gridReqSnippetText}
                          numberOfLines={1}
                        >
                          {req?.desc || 'Locked Floor'}
                        </Text>
                        <View style={hubStyles.gridProgressBarBg}>
                          <View
                            style={[
                              hubStyles.gridProgressBarFill,
                              { width: `${Math.round(progress * 100)}%` },
                            ]}
                          />
                        </View>
                        <Text style={hubStyles.gridProgressPct}>
                          {Math.round(progress * 100)}% UNLOCKED
                        </Text>
                      </View>

                      {/* Mission Button */}
                      <View style={hubStyles.gridUnlockBtn}>
                        <Text style={hubStyles.gridUnlockBtnText}>
                          MISSION ➔
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          )}

      {/* UNLOCK MISSION MODAL (Direct Prerequisite Game Launcher) */}
      {unlockModalGame && (
        <Modal
          transparent
          visible={!!unlockModalGame}
          animationType="none"
          statusBarTranslucent
          onRequestClose={() => {
            setUnlockModalGame(null);
            triggerLightHaptic();
          }}
        >
          <Pressable
            style={hubStyles.unlockModalOverlay}
            onPress={() => {
              setUnlockModalGame(null);
              triggerLightHaptic();
            }}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderTerminationRequest={() => false}
          >
            <Animated.View
              entering={FadeIn.duration(180)}
              style={StyleSheet.absoluteFillObject}
              pointerEvents="none"
            >
              <View
                style={{
                  ...StyleSheet.absoluteFillObject,
                  backgroundColor: 'rgba(3, 3, 10, 0.94)',
                }}
              />
            </Animated.View>

            <Animated.View
              entering={ZoomIn.duration(200)}
              style={hubStyles.unlockModalCard}
            >
              <Pressable
                onPress={(e) => e.stopPropagation?.()}
                style={{ width: '100%', alignItems: 'center' }}
              >
                {/* Target Game Header */}
                <View style={hubStyles.unlockModalIconRing}>
                  <Text style={{ fontSize: 34 }}>{unlockModalGame.icon}</Text>
                </View>
                <Text style={hubStyles.unlockModalTitle}>
                  {unlockModalGame.title}
                </Text>
                <Text style={hubStyles.unlockModalSubtitle}>
                  {`FLOOR ${String(unlockModalGame.floorNum).padStart(2, '0')} • ${unlockModalGame.tier} SECTOR`}
                </Text>

                {/* Status Badge */}
                <View style={hubStyles.unlockStatusBadge}>
                  <Text style={hubStyles.unlockStatusBadgeText}>
                    🔒 SYSTEM ENCRYPTED
                  </Text>
                </View>

                {/* Mission Details */}
                {(() => {
                  const req = UNLOCK_REQUIREMENTS[unlockModalGame.id];
                  const prereqGame = req
                    ? TOWER_GAMES.find((g) => g.id === req.reqGame)
                    : null;
                  const currentScore = prereqGame
                    ? highScores[prereqGame.id] || 0
                    : 0;
                  const targetScore = req ? req.targetScore : 0;
                  const progress = req
                    ? getUnlockProgress(unlockModalGame.id, highScores)
                    : 0;

                  return (
                    <View style={hubStyles.unlockMissionCard}>
                      <Text style={hubStyles.unlockMissionHeader}>
                        ⚡ UNLOCK MISSION
                      </Text>
                      <Text style={hubStyles.unlockMissionDesc}>
                        Play {prereqGame ? prereqGame.title : 'the prerequisite game'} to reach the required target score:
                      </Text>

                      {prereqGame && (
                        <View style={hubStyles.prereqInfoRow}>
                          <Text style={{ fontSize: 24 }}>{prereqGame.icon}</Text>
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={hubStyles.prereqName}>
                              {prereqGame.title}
                            </Text>
                            <Text style={hubStyles.prereqCategory}>
                              {prereqGame.category} CATEGORY
                            </Text>
                          </View>
                        </View>
                      )}

                      <View style={hubStyles.scoreCompareRow}>
                        <View style={hubStyles.scoreCompareCol}>
                          <Text style={hubStyles.scoreCompareLabel}>
                            YOUR BEST
                          </Text>
                          <Text
                            style={[
                              hubStyles.scoreCompareVal,
                              { color: COLORS.cyan },
                            ]}
                          >
                            {currentScore}
                          </Text>
                        </View>
                        <Text style={hubStyles.scoreCompareSlash}>/</Text>
                        <View style={hubStyles.scoreCompareCol}>
                          <Text style={hubStyles.scoreCompareLabel}>
                            TARGET GOAL
                          </Text>
                          <Text
                            style={[
                              hubStyles.scoreCompareVal,
                              { color: COLORS.solarGold },
                            ]}
                          >
                            {targetScore}
                          </Text>
                        </View>
                      </View>

                      {/* Big Progress Bar */}
                      <View style={hubStyles.unlockBigBarBg}>
                        <View
                          style={[
                            hubStyles.unlockBigBarFill,
                            { width: `${Math.round(progress * 100)}%` },
                          ]}
                        />
                      </View>
                      <Text style={hubStyles.unlockBarPctText}>
                        {Math.round(progress * 100)}% COMPLETED
                      </Text>

                      {/* Direct Launch CTA */}
                      {prereqGame && (
                        <Pressable
                          onPress={() => {
                            setUnlockModalGame(null);
                            handleSelectGame(
                              prereqGame.id,
                              prereqGame.accent
                            );
                          }}
                          style={({ pressed }) => [
                            hubStyles.unlockLaunchBtn,
                            pressed && {
                              transform: [{ scale: 0.96 }],
                              opacity: 0.9,
                            },
                          ]}
                        >
                          <LinearGradient
                            colors={[prereqGame.accent, prereqGame.secondary]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={hubStyles.unlockLaunchGrad}
                          >
                            <Text style={hubStyles.unlockLaunchText}>
                              🚀 PLAY {prereqGame.title} NOW
                            </Text>
                          </LinearGradient>
                        </Pressable>
                      )}
                    </View>
                  );
                })()}

                {/* Dismiss button */}
                <Pressable
                  onPress={() => {
                    setUnlockModalGame(null);
                    triggerLightHaptic();
                  }}
                  style={hubStyles.unlockCloseBtn}
                >
                  <Text style={hubStyles.unlockCloseText}>CLOSE</Text>
                </Pressable>
              </Pressable>
            </Animated.View>
          </Pressable>
        </Modal>
      )}
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
    paddingHorizontal: 12,
    paddingBottom: 6,
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(0, 245, 255, 0.35)',
    backgroundColor: 'rgba(6, 4, 20, 0.92)',
    zIndex: 100,
    elevation: 10,
  },
  hudTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 6,
  },
  titleGroup: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    marginRight: 6,
  },
  arcadeOnlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 245, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.4)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00F5D4',
  },
  arcadeOnlineText: {
    fontSize: 8,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.cyan,
    letterSpacing: 1.1,
  },
  hudUtilGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hubTitle: {
    fontSize: 19,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.4,
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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.35)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  telemetryCell: {
    flex: 1,
    alignItems: 'center',
  },
  telemetryDivider: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  telemetrySub: {
    fontSize: 7.5,
    fontFamily: monoFont,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 1,
  },
  telemetryVal: {
    fontSize: 13,
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
    paddingTop: 4,
    alignItems: 'center',
  },
  apexSpireWrapper: {
    alignItems: 'center',
    marginBottom: 4,
    marginTop: 2,
  },
  spireLabelPill: {
    marginTop: 2,
    backgroundColor: 'rgba(0, 245, 255, 0.16)',
    borderWidth: 1,
    borderColor: COLORS.cyan,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
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
  iconCoreChamber: {
    width: 50,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconEmoji: {
    fontSize: 24,
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
    backgroundColor: 'rgba(3, 3, 10, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 999999,
    elevation: 999999,
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

  /* TAB SWITCHER */
  tabSwitcherRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    width: '100%',
  },
  tabSwitcherBtn: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabSwitcherBtnActiveTower: {
    borderColor: COLORS.cyan,
    shadowColor: COLORS.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  tabSwitcherBtnActiveGrid: {
    borderColor: '#FF007F',
    shadowColor: '#FF007F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  tabSwitcherGrad: {
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabSwitcherText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  tabSwitcherTextActiveTower: {
    color: COLORS.cyan,
  },
  tabSwitcherTextActiveGrid: {
    color: '#FF007F',
  },

  categoryTabActive: {
    backgroundColor: 'rgba(255, 0, 127, 0.2)',
    borderColor: '#FF007F',
  },
  categoryTabTextActive: {
    color: '#FF007F',
  },

  /* TOWER EXPAND CARD */
  towerExpandCard: {
    width: '92%',
    marginTop: 18,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 0, 127, 0.55)',
    overflow: 'hidden',
  },
  towerExpandGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  towerExpandIcon: {
    fontSize: 26,
    marginRight: 12,
  },
  towerExpandTitle: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#FF007F',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  towerExpandSub: {
    fontSize: 9.5,
    fontFamily: monoFont,
    color: '#CBD5E1',
    lineHeight: 14,
  },
  towerExpandArrow: {
    fontSize: 18,
    color: '#FF007F',
    fontWeight: '900',
  },

  /* ALL GAMES GRID */
  gridScroll: {
    flex: 1,
    zIndex: 10,
    elevation: 10,
  },
  gridScrollContent: {
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  gridRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 12,
    padding: 10,
    overflow: 'hidden',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  gridCardLocked: {
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowOpacity: 0,
    elevation: 0,
  },
  gridTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  gridCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  gridFloorBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  gridFloorText: {
    fontSize: 8.5,
    fontFamily: monoFont,
    fontWeight: '900',
  },
  gridCategoryTag: {
    fontSize: 8,
    fontFamily: monoFont,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  gridIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  gridIconEmoji: {
    fontSize: 24,
  },
  gridIconWrapperLocked: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  gridIconEmojiLocked: {
    fontSize: 24,
    opacity: 0.25,
  },
  lockOverlayCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridGameTitle: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  gridGameTitleLocked: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  gridScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 8,
  },
  gridScoreLabel: {
    fontSize: 8,
    fontFamily: monoFont,
    color: COLORS.textSecondary,
  },
  gridScoreVal: {
    fontSize: 9,
    fontFamily: monoFont,
    fontWeight: '900',
  },
  gridPlayBtn: {
    width: '100%',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  gridPlayBtnText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#030208',
    letterSpacing: 1,
  },
  gridLockBadge: {
    backgroundColor: 'rgba(255, 0, 85, 0.18)',
    borderWidth: 1,
    borderColor: '#FF0055',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
  },
  gridLockBadgeText: {
    fontSize: 8,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#FF0055',
    letterSpacing: 0.5,
  },
  gridReqSnippet: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 6,
    padding: 6,
    marginBottom: 8,
    alignItems: 'center',
  },
  gridReqSnippetText: {
    fontSize: 8.5,
    fontFamily: monoFont,
    color: '#E2E8F0',
    textAlign: 'center',
    marginBottom: 4,
  },
  gridProgressBarBg: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  gridProgressBarFill: {
    height: '100%',
    backgroundColor: COLORS.cyan,
    borderRadius: 2,
  },
  gridProgressPct: {
    fontSize: 7.5,
    fontFamily: monoFont,
    fontWeight: '800',
    color: COLORS.cyan,
    marginTop: 3,
  },
  gridUnlockBtn: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  gridUnlockBtnText: {
    fontSize: 9,
    fontFamily: monoFont,
    fontWeight: '800',
    color: '#CBD5E1',
    letterSpacing: 0.8,
  },

  /* UNLOCK MISSION MODAL */
  unlockModalOverlay: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(3, 3, 10, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 999999,
    elevation: 999999,
  },
  unlockModalCard: {
    width: '100%',
    maxWidth: 350,
    backgroundColor: 'rgba(14, 12, 32, 0.98)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#00F5FF',
    padding: 20,
    alignItems: 'center',
    shadowColor: '#00F5FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 35000,
  },
  unlockModalIconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#00F5FF',
    backgroundColor: 'rgba(0, 245, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  unlockModalTitle: {
    fontSize: 17,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  unlockModalSubtitle: {
    fontSize: 10,
    fontFamily: monoFont,
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    marginTop: 2,
    marginBottom: 8,
  },
  unlockStatusBadge: {
    backgroundColor: 'rgba(255, 0, 85, 0.18)',
    borderWidth: 1,
    borderColor: '#FF0055',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 14,
  },
  unlockStatusBadgeText: {
    fontSize: 9,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#FF0055',
    letterSpacing: 1,
  },
  unlockMissionCard: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.25)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    alignItems: 'center',
  },
  unlockMissionHeader: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.solarGold,
    letterSpacing: 1,
    marginBottom: 6,
  },
  unlockMissionDesc: {
    fontSize: 10,
    fontFamily: monoFont,
    color: '#CBD5E1',
    textAlign: 'center',
    lineHeight: 15,
    marginBottom: 10,
  },
  prereqInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: '100%',
    marginBottom: 12,
  },
  prereqName: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  prereqCategory: {
    fontSize: 8.5,
    fontFamily: monoFont,
    color: COLORS.cyan,
  },
  scoreCompareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    width: '100%',
    marginBottom: 10,
  },
  scoreCompareCol: {
    alignItems: 'center',
  },
  scoreCompareLabel: {
    fontSize: 8,
    fontFamily: monoFont,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  scoreCompareVal: {
    fontSize: 16,
    fontFamily: monoFont,
    fontWeight: '900',
  },
  scoreCompareSlash: {
    fontSize: 16,
    fontFamily: monoFont,
    color: COLORS.textSecondary,
  },
  unlockBigBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  unlockBigBarFill: {
    height: '100%',
    backgroundColor: '#00F5FF',
    borderRadius: 4,
  },
  unlockBarPctText: {
    fontSize: 9,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.cyan,
    marginTop: 5,
    marginBottom: 12,
  },
  unlockLaunchBtn: {
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
  },
  unlockLaunchGrad: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockLaunchText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#030208',
    letterSpacing: 1,
  },
  unlockCloseBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  unlockCloseText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1,
  },
});
