import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Dimensions,
  Modal,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, {
  Rect,
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  RadialGradient as SvgRadialGradient,
  Stop,
  G,
  Line,
  Polygon,
  Text as SvgText,
} from 'react-native-svg';
import { COLORS } from '../../styles';
import MiniGameHeader from '../components/MiniGameHeader';
import JuiceEngine from '../components/JuiceEngine';
import GameResultModal from '../components/GameResultModal';
import {
  triggerLightHaptic,
  triggerMediumHaptic,
  triggerPerfectHaptic,
  triggerGameOverHaptic,
  triggerSelectionHaptic,
  triggerSliceHaptic,
} from '../utils/haptics';
import {
  playTapSound,
  playPerfectSound,
  playSliceSound,
  playGameOverSound,
  playSnapTickSound,
  playSpeedUpSound,
} from '../utils/sound';

const STORAGE_KEY = '@game_tower:best_thief_v1';
const STORAGE_LEVEL_KEY = '@game_tower:thief_current_level_v1';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

// Standard Arena Base Dimensions
const ARENA_BASE_W = 340;
const ARENA_H = 430;
const FLASHLIGHT_LEN = 65;
const SNIPER_VISION_LEN = 145;

/**
 * Generate window X positions for any arena width
 */
const getWindowListForWidth = (arenaW) => {
  const margin = 50;
  const usable = arenaW - margin * 2;
  const count = Math.max(5, Math.floor(usable / 55));
  const step = usable / (count - 1);
  const list = [];
  for (let i = 0; i < count; i++) {
    list.push(Math.round(margin + i * step));
  }
  return list;
};

const getNearestWindowX = (playerX, winList) => {
  let nearest = null;
  let minDist = Infinity;
  for (const wx of winList) {
    const d = Math.abs(playerX - wx);
    if (d < minDist) {
      minDist = d;
      nearest = wx;
    }
  }
  return minDist <= 22 ? nearest : null;
};

/**
 * Architectural District Themes changing every 10 levels across 100 levels:
 * - Levels 1-10: Cyber Neon District (deep navy, cyan glow)
 * - Levels 11-20: Industrial Rust Depot (copper, scorched amber)
 * - Levels 21-30: Emerald Vault Citadel (forest obsidian, jade mint)
 * - Levels 31-40: Crimson Barracks (blood night, ruby glow)
 * - Levels 41-50: Golden Apex Tower (regal onyx, gold brass)
 * - Levels 51-60: Synthwave Skyscraper (deep violet, ultraviolet magenta)
 * - Levels 61-70: Glacial Archive (frosted midnight, arctic cyan)
 * - Levels 71-80: Bio-Toxin Refinery (hazard olive, radioactive lime)
 * - Levels 81-90: Volcanic Foundry (charred basalt, molten magma)
 * - Levels 91-100: Imperial Apex Vault (royal void, imperial gold)
 */
const BUILDING_THEMES = [
  {
    name: 'CYBER NEON DISTRICT',
    bgGradTop: '#1B1E38',
    bgGradMid: '#0D1022',
    bgGradBottom: '#050610',
    borderColor: 'rgba(0, 245, 255, 0.4)',
    borderWidth: 2,
    catwalkRail: '#00F5FF',
    catwalkRung: '#1E293B',
    ladderRail: '#00F5FF',
    ladderRung: '#38BDF8',
    windowOuter: '#070914',
    windowInner: '#0B0E1B',
    windowFrame: 'rgba(0, 245, 255, 0.25)',
    accent: '#00F5FF',
  },
  {
    name: 'INDUSTRIAL RUST DEPOT',
    bgGradTop: '#2C1D18',
    bgGradMid: '#1A110E',
    bgGradBottom: '#0D0807',
    borderColor: 'rgba(249, 115, 22, 0.45)',
    borderWidth: 2.2,
    catwalkRail: '#EA580C',
    catwalkRung: '#431407',
    ladderRail: '#F97316',
    ladderRung: '#FDBA74',
    windowOuter: '#140A07',
    windowInner: '#1C0F0A',
    windowFrame: 'rgba(249, 115, 22, 0.3)',
    accent: '#F97316',
  },
  {
    name: 'EMERALD VAULT CITADEL',
    bgGradTop: '#0D261E',
    bgGradMid: '#071712',
    bgGradBottom: '#030A08',
    borderColor: 'rgba(16, 185, 129, 0.45)',
    borderWidth: 2,
    catwalkRail: '#10B981',
    catwalkRung: '#064E3B',
    ladderRail: '#10B981',
    ladderRung: '#6EE7B7',
    windowOuter: '#03100B',
    windowInner: '#071E15',
    windowFrame: 'rgba(16, 185, 129, 0.3)',
    accent: '#10B981',
  },
  {
    name: 'CRIMSON BARRACKS',
    bgGradTop: '#2C0D16',
    bgGradMid: '#1A060C',
    bgGradBottom: '#0D0206',
    borderColor: 'rgba(244, 63, 94, 0.45)',
    borderWidth: 2.2,
    catwalkRail: '#E11D48',
    catwalkRung: '#4C0519',
    ladderRail: '#F43F5E',
    ladderRung: '#FDA4AF',
    windowOuter: '#100206',
    windowInner: '#1C060D',
    windowFrame: 'rgba(244, 63, 94, 0.3)',
    accent: '#F43F5E',
  },
  {
    name: 'GOLDEN APEX TOWER',
    bgGradTop: '#2A240E',
    bgGradMid: '#181406',
    bgGradBottom: '#0A0802',
    borderColor: 'rgba(234, 179, 8, 0.5)',
    borderWidth: 2.2,
    catwalkRail: '#CA8A04',
    catwalkRung: '#422006',
    ladderRail: '#EAB308',
    ladderRung: '#FDE047',
    windowOuter: '#100D03',
    windowInner: '#1C1607',
    windowFrame: 'rgba(234, 179, 8, 0.35)',
    accent: '#EAB308',
  },
  {
    name: 'SYNTHWAVE SKYSCRAPER',
    bgGradTop: '#240F33',
    bgGradMid: '#14071E',
    bgGradBottom: '#09020F',
    borderColor: 'rgba(168, 85, 247, 0.5)',
    borderWidth: 2,
    catwalkRail: '#A855F7',
    catwalkRung: '#3B0764',
    ladderRail: '#C084FC',
    ladderRung: '#E9D5FF',
    windowOuter: '#0C0314',
    windowInner: '#180727',
    windowFrame: 'rgba(168, 85, 247, 0.3)',
    accent: '#A855F7',
  },
  {
    name: 'GLACIAL ARCHIVE',
    bgGradTop: '#102538',
    bgGradMid: '#0A1826',
    bgGradBottom: '#040B12',
    borderColor: 'rgba(56, 189, 248, 0.5)',
    borderWidth: 2,
    catwalkRail: '#0284C7',
    catwalkRung: '#082F49',
    ladderRail: '#38BDF8',
    ladderRung: '#BAE6FD',
    windowOuter: '#040E17',
    windowInner: '#0B1C2E',
    windowFrame: 'rgba(56, 189, 248, 0.35)',
    accent: '#38BDF8',
  },
  {
    name: 'BIO-TOXIN REFINERY',
    bgGradTop: '#19260E',
    bgGradMid: '#0F1808',
    bgGradBottom: '#060B03',
    borderColor: 'rgba(132, 204, 22, 0.5)',
    borderWidth: 2,
    catwalkRail: '#65A30D',
    catwalkRung: '#1A2E05',
    ladderRail: '#84CC16',
    ladderRung: '#BEF264',
    windowOuter: '#080E04',
    windowInner: '#121E09',
    windowFrame: 'rgba(132, 204, 22, 0.3)',
    accent: '#84CC16',
  },
  {
    name: 'VOLCANIC FOUNDRY',
    bgGradTop: '#291410',
    bgGradMid: '#180B08',
    bgGradBottom: '#0A0403',
    borderColor: 'rgba(239, 68, 68, 0.5)',
    borderWidth: 2.2,
    catwalkRail: '#DC2626',
    catwalkRung: '#450A0A',
    ladderRail: '#EF4444',
    ladderRung: '#FCA5A5',
    windowOuter: '#0E0504',
    windowInner: '#1B0C09',
    windowFrame: 'rgba(239, 68, 68, 0.35)',
    accent: '#EF4444',
  },
  {
    name: 'IMPERIAL APEX VAULT',
    bgGradTop: '#20163B',
    bgGradMid: '#120B24',
    bgGradBottom: '#070410',
    borderColor: 'rgba(234, 179, 8, 0.65)',
    borderWidth: 2.5,
    catwalkRail: '#F59E0B',
    catwalkRung: '#3B0764',
    ladderRail: '#FBBF24',
    ladderRung: '#FDE68A',
    windowOuter: '#0A0518',
    windowInner: '#180E34',
    windowFrame: 'rgba(245, 158, 11, 0.4)',
    accent: '#F59E0B',
  },
];

const getBuildingTheme = (lvl) => {
  const themeIndex = Math.floor(Math.max(0, lvl - 1) / 10) % BUILDING_THEMES.length;
  return BUILDING_THEMES[themeIndex];
};

/**
 * Building silhouette per 10-level tier (changes shape of the whole building):
 * 1-10 flat, 11-20 triangle roof, 21-30 wide low, 31-40 destroyed floors, 41-50 lights off,
 * 51-60 tall spire, 61-70 twin towers, 71-80 dome, 81-90 ruined, 91-100 triple crown.
 */
const BUILDING_SHAPES = [
  'FLAT',
  'TRIANGLE',
  'WIDE',
  'BROKEN',
  'BLACKOUT',
  'SPIRE',
  'TWIN',
  'DOME',
  'RUINED',
  'CROWN',
];
const ROOF_PAD = 52; // extra SVG space above the facade for roofs & spires

const getBuildingShape = (lvl) =>
  BUILDING_SHAPES[Math.floor(Math.max(0, lvl - 1) / 10) % BUILDING_SHAPES.length];

/** Roof silhouette points (facade top is y=15) -> polygon point list for the whole building. */
const buildFacadePoints = (shape, W, H) => {
  const x0 = 10;
  const x1 = W - 10;
  const y0 = 15;
  const yb = H - 30;
  const mid = W / 2;
  let roof;
  switch (shape) {
    case 'TRIANGLE':
      roof = [[x0, y0], [mid, y0 - 46], [x1, y0]];
      break;
    case 'WIDE':
      roof = [[x0, y0], [x0 + 24, y0 - 14], [x1 - 24, y0 - 14], [x1, y0]];
      break;
    case 'SPIRE':
      roof = [
        [x0, y0], [x0 + 40, y0], [x0 + 40, y0 - 14], [mid - 30, y0 - 14], [mid - 30, y0 - 28],
        [mid - 8, y0 - 28], [mid, y0 - 50], [mid + 8, y0 - 28], [mid + 30, y0 - 28],
        [mid + 30, y0 - 14], [x1 - 40, y0 - 14], [x1 - 40, y0], [x1, y0],
      ];
      break;
    case 'TWIN':
      roof = [
        [x0, y0 - 34], [W * 0.36, y0 - 34], [W * 0.36, y0 - 4], [W * 0.64, y0 - 4],
        [W * 0.64, y0 - 34], [x1, y0 - 34],
      ];
      break;
    case 'DOME': {
      roof = [];
      for (let i = 0; i <= 16; i++) {
        const t = i / 16;
        roof.push([x0 + (x1 - x0) * t, y0 - 38 * Math.sin(Math.PI * t)]);
      }
      break;
    }
    case 'BROKEN':
    case 'RUINED': {
      const hs = [-2, -14, -6, -18, -4, -12, -8, -16];
      roof = [];
      const steps = Math.max(6, Math.floor((x1 - x0) / 34));
      for (let i = 0; i <= steps; i++) {
        const x = x0 + ((x1 - x0) * i) / steps;
        roof.push([x, y0 + (shape === 'RUINED' ? hs[i % hs.length] * 1.5 : hs[i % hs.length] * 0.5)]);
      }
      break;
    }
    case 'CROWN':
      roof = [
        [x0, y0], [W * 0.2, y0 - 30], [W * 0.3, y0 - 4], [mid, y0 - 52], [W * 0.7, y0 - 4],
        [W * 0.8, y0 - 30], [x1, y0],
      ];
      break;
    default:
      roof = [[x0, y0], [x1, y0]];
  }
  return [[x0, yb], ...roof, [x1, yb]].map((p) => `${p[0]},${p[1]}`).join(' ');
};

/**
 * Generates 100 fully predefined, graduated heist levels according to exact user tier specification:
 * - Levels 1-10: No thief, only guards (up to 3 guards), up to 3 floors.
 * - Levels 11-20: No thief, only guards (up to 5 guards), floors up to 3, fuel required, building width increased & zooms out.
 * - Levels 21-35: 1 rival thief, 5 guards min, 5 to 6 floors, big building width.
 * - Levels 36-50: 8 guards, at least 3 ladder paths, 3 rival thieves (one from each path), big building, CCTV cameras that alert floor guards. Weapons introduced (guns & bombs); firing summons police in 5s!
 * - Levels 51-70: 2 guards with guns and high vision shooting projectiles, big building, rival thieves, CCTV, weapons.
 * - Levels 71-80: 2 diamonds to collect, multiple armed guards with guns, CCTV, big building, multiple thieves.
 * - Levels 81-98: Diamond locked in case! Key carried by a guard. Must distract with stone, stand near for 2s to steal key. 2 thieves, multiple guards, CCTV.
 * - Levels 99-100: Final Boss / Treasure Hunt! Big Boss Guards with health bars. Must kill with guns & bombs to seize royal treasure, then escape within 5s before police car arrives!
 */
/**
 * Generates organically staggered ladders across floors so consecutive floors
 * never share aligned vertical ladder positions. This prevents climbing directly
 * up through an uninterrupted vertical shaft, requiring players and rivals to
 * cross catwalk floors and evade guards.
 */
function generateStaggeredLadders(floorsCount, arenaW, ladderPathsCount) {
  const stairs = [];
  for (let f = 0; f < floorsCount - 1; f++) {
    if (ladderPathsCount === 1) {
      // 1 ladder per floor: alternate between right side and left side
      const xPos = f % 2 === 0 ? arenaW - 80 : 80;
      stairs.push({ fromFloor: f, toFloor: f + 1, x: xPos });
    } else if (ladderPathsCount === 2) {
      // 2 ladders per floor: alternate between outer sides and inner offset positions
      if (f % 2 === 0) {
        stairs.push({ fromFloor: f, toFloor: f + 1, x: 80 });
        stairs.push({ fromFloor: f, toFloor: f + 1, x: arenaW - 80 });
      } else {
        const x1 = Math.round(arenaW * 0.32);
        const x2 = Math.round(arenaW * 0.68);
        stairs.push({ fromFloor: f, toFloor: f + 1, x: x1 });
        stairs.push({ fromFloor: f, toFloor: f + 1, x: x2 });
      }
    } else {
      // 3 ladders per floor: 3-way rotation offset so no consecutive floors share any X
      if (f % 3 === 0) {
        stairs.push({ fromFloor: f, toFloor: f + 1, x: 75 });
        stairs.push({ fromFloor: f, toFloor: f + 1, x: Math.round(arenaW * 0.44) });
        stairs.push({ fromFloor: f, toFloor: f + 1, x: arenaW - 110 });
      } else if (f % 3 === 1) {
        stairs.push({ fromFloor: f, toFloor: f + 1, x: 135 });
        stairs.push({ fromFloor: f, toFloor: f + 1, x: Math.round(arenaW * 0.56) });
        stairs.push({ fromFloor: f, toFloor: f + 1, x: arenaW - 65 });
      } else {
        stairs.push({ fromFloor: f, toFloor: f + 1, x: 95 });
        stairs.push({ fromFloor: f, toFloor: f + 1, x: Math.round(arenaW * 0.50) });
        stairs.push({ fromFloor: f, toFloor: f + 1, x: arenaW - 145 });
      }
    }
  }
  return stairs;
}

/**
 * Distributes guards across patrol floors with strictly non-overlapping
 * starting positions: if 2 guards are on 1 floor, 1 starts on the LEFT
 * and the other starts on the RIGHT facing each other.
 */
function generateLevelGuards({
  floorsCount,
  guardCount,
  arenaW,
  armedGuardIndices = [],
  keyGuardIndex = null,
  lvl = 1,
}) {
  const guards = [];
  const patrolFloorsCount = Math.max(1, floorsCount - 1);
  const floorAssignments = {};
  for (let f = 1; f < floorsCount; f++) {
    floorAssignments[f] = [];
  }

  // Distribute guards evenly across patrol floors
  for (let g = 0; g < guardCount; g++) {
    const f = 1 + (g % patrolFloorsCount);
    floorAssignments[f].push(g);
  }

  // Assign non-overlapping starting positions on each floor
  for (let f = 1; f < floorsCount; f++) {
    const floorGuards = floorAssignments[f];
    const countOnFloor = floorGuards.length;

    floorGuards.forEach((gIdx, posIdx) => {
      let x = 65;
      let dir = 1;

      if (countOnFloor === 1) {
        // Single guard on floor: alternate left/right by floor
        x = f % 2 === 1 ? 70 : arenaW - 70;
        dir = f % 2 === 1 ? 1 : -1;
      } else if (countOnFloor === 2) {
        // 2 guards on 1 floor: 1 starts on LEFT, other on RIGHT!
        if (posIdx === 0) {
          x = 65;
          dir = 1;
        } else {
          x = arenaW - 65;
          dir = -1;
        }
      } else {
        // 3 or more guards on 1 floor: spread evenly across catwalk width
        const step = (arenaW - 130) / (countOnFloor - 1);
        x = Math.round(65 + posIdx * step);
        dir = posIdx % 2 === 0 ? 1 : -1;
      }

      const hasGun = armedGuardIndices.includes(gIdx);
      const hasKey = keyGuardIndex === gIdx;
      const baseSpeed = 1.05 + Math.min(0.35, lvl * 0.005);
      const speed = hasKey ? 1.0 : hasGun ? 1.1 : Math.round((baseSpeed + (gIdx % 3) * 0.06) * 100) / 100;

      guards.push({
        id: `g_${gIdx}`,
        floor: f,
        x,
        dir,
        speed,
        minX: 45,
        maxX: arenaW - 45,
        hasGun,
        shootCooldown: 0,
        hasKey,
        isBoss: false,
        pauseTimer: posIdx * 12,
      });
    });
  }

  return guards;
}

function generate100CuratedLevels() {
  const LEVEL_NAMES = [
    // 1-10: Ground Infiltrations (No Thieves, Up to 3 Guards, Up to 3 Floors)
    'TRAINING GROUND', 'FIRST SHADOW', 'LOW ROOFTOP', 'PATROL ALLEY', 'SOLO INTRUSION',
    'GUARDED MEZZANINE', 'NIGHT RUNNER', 'OFFICE HEIST', 'TRI-FLOOR SEC', 'ROOFTOP OUTPOST',
    // 11-20: Fuel Runs (Wider Building Zoomed Out, Up to 5 Guards, Petrol Required)
    'FUEL SHORTAGE', 'WIDE SPRAWL', 'DIESEL DEPOSIT', 'EXPANDED DEPOT', 'FUEL CATWALK',
    'HEAVY PATROL FUEL', 'MIDNIGHT CANISTER', 'WIDE CORRIDORS', 'OCTANE EXTRACTION', 'FIVE-GUARD RUN',
    // 21-35: The Rival Arrives (1 Thief, 5+ Guards, 5-6 Floors, Wide)
    'RIVAL INTERCEPT', 'FIVE-TIER TOWER', 'SHADOW COMPETITOR', 'PENTHOUSE ASCENT', 'CATWALK DUEL',
    'SIXTH FLOOR CHASE', 'CROSSFIRE SPIRE', 'RIVAL SHADOW', 'VAULT RACE', 'APEX PURSUIT',
    'TITAN INFILTRATION', 'DOUBLE CATWALK', 'SKYLINE DUEL', 'RIVAL PURSUIT II', 'SIX-TIER SKYSCRAPER',
    // 36-50: Tri-Path & CCTVs & Weapons (8 Guards, 3 Paths, 3 Thieves, CCTVs, Guns/Bombs)
    'TRIPLE THREAT', 'CCTV SURVEILLANCE', 'GUNS AND ALARMS', 'CAMERA SWEEP', 'TRI-SHAFT SIEGE',
    'SECURITY NETWORK', 'BOMB DISPATCH', 'ALARM INTRUSION', 'TRIPLE PURSUIT', 'CCTV LABYRINTH',
    'FIREPOWER PROTOCOL', 'THREE SHADOWS', 'SIREN WARNING', 'MEGA TOWER LOCKDOWN', 'FIFTY-LEVEL MILESTONE',
    // 51-70: Armed Guards & Sniper Vision (2+ Guards with Guns Shooting Projectiles)
    'SNIPER SIGHT', 'ARMED SURVEILLANCE', 'PROJECTILE CORRIDOR', 'BULLETPROOF WINDOW', 'HIGH-CALIBER FLOOR',
    'DEADLY FLASH', 'SNIPER CATWALK', 'HEAVY CROSSFIRE', 'LASER SCOPES', 'ARMED RIVAL RACE',
    'BULLET DODGER', 'RIFLE OUTPOST', 'DEADLINE PROTOCOL', 'SHARPSHOOTER COMPLEX', 'EXTREME DANGER',
    'GUNSLINGER CATWALK', 'BALLISTIC SEC', 'HIGH-VELOCITY ESCAPE', 'SNIPER AMBUSH', 'SEVENTY MARK',
    // 71-80: Twin Diamonds (2 Diamonds to Secure, Multiple Armed Guards, CCTVs, Multi Thieves)
    'TWIN DIAMONDS', 'DOUBLE VAULT', 'DUAL HAUL', 'GEMINI INFILTRATION', 'TWO-JEWEL TOWER',
    'DOUBLE OR NOTHING', 'TWIN APEX', 'DUAL HEIST RUN', 'HIGH-SECURITY TWINS', 'EIGHTIETH SUMMIT',
    // 81-98: Locked Case & Guard Key Pickpocket (Distract with Stone for 2s to Steal Key)
    'KEYCARD ENIGMA', 'LOCKED VAULT', 'STONE PICKPOCKET', 'DISTRACTION THEFT', 'VAULT KEY PROTOCOL',
    'KEYMASTER GUARD', 'TWO-SECOND STEAL', 'SAFE CRACKER', 'SHADOW KEY', 'GLASS CASE LOCKDOWN',
    'DISTRACT AND STEAL', 'MASTER KEY HEIST', 'PEBBLE TRICK', 'HIGH-SEC SAFE', 'KEY STEAL LABYRINTH',
    'STEALTH PICKPOCKET', 'LOCKBOX APEX', 'PENULTIMATE HEIST',
    // 99-100: Final Boss / Treasure Hunt (Big Boss Guards, Kill with Guns/Bombs, 5s Escape Run)
    'THE TREASURE HUNT BOSS', 'THE APEX MASTER HEIST'
  ];

  const levels = [];

  for (let lvl = 1; lvl <= 100; lvl++) {
    const name = LEVEL_NAMES[lvl - 1] || `SECTOR ${lvl}`;

    // --- Tier 1: Levels 1 - 10 ---
    if (lvl <= 10) {
      const floorsCount = lvl <= 3 ? 2 : 3;
      const arenaW = ARENA_BASE_W;
      const ladderPathsCount = 1;
      const guardCount = lvl === 1 ? 1 : lvl <= 4 ? 2 : 3;
      const stairs = generateStaggeredLadders(floorsCount, arenaW, ladderPathsCount);
      const guards = generateLevelGuards({
        floorsCount,
        guardCount,
        arenaW,
        lvl,
      });

      levels.push({
        name,
        floorsCount,
        arenaW,
        ladderPathsCount: 1,
        stairs,
        guards,
        rivalCount: 0,
        requiresPetrol: false,
        diamondsCount: 1,
        diamondLockedInCase: false,
        hasWeapons: false,
        isBossLevel: false,
        cctvs: [],
        car: { floor: 0, x: 70 },
        stonePickup: guardCount >= 2 ? { floor: 1, x: arenaW - 50 } : null,
      });
    }
    // --- Tier 2: Levels 11 - 20 ---
    else if (lvl <= 20) {
      const floorsCount = 3;
      const arenaW = 430; // Increased width, SVG scales nicely (zooming out)
      const ladderPathsCount = 2;
      const guardCount = 3 + Math.floor((lvl - 11) / 3); // 3 to 5 guards
      const stairs = generateStaggeredLadders(floorsCount, arenaW, ladderPathsCount);
      const guards = generateLevelGuards({
        floorsCount,
        guardCount,
        arenaW,
        lvl,
      });

      levels.push({
        name,
        floorsCount,
        arenaW,
        ladderPathsCount: 2,
        stairs,
        guards,
        rivalCount: 0,
        requiresPetrol: true, // Have to take fuel
        petrol: { floor: 1, x: arenaW - 70 },
        diamondsCount: 1,
        diamondLockedInCase: false,
        hasWeapons: false,
        isBossLevel: false,
        cctvs: [],
        car: { floor: 0, x: 80 },
        stonePickup: { floor: 2, x: 60 },
      });
    }
    // --- Tier 3: Levels 21 - 35 ---
    else if (lvl <= 35) {
      const floorsCount = lvl <= 28 ? 5 : 6;
      const arenaW = 490; // Big horizontal width
      const ladderPathsCount = 2;
      const guardCount = Math.max(5, Math.min(7, 5 + Math.floor((lvl - 21) / 5))); // 5 min
      const stairs = generateStaggeredLadders(floorsCount, arenaW, ladderPathsCount);
      const guards = generateLevelGuards({
        floorsCount,
        guardCount,
        arenaW,
        lvl,
      });

      levels.push({
        name,
        floorsCount,
        arenaW,
        ladderPathsCount: 2,
        stairs,
        guards,
        rivalCount: 1, // 1 rival thief
        requiresPetrol: lvl % 3 === 0,
        petrol: lvl % 3 === 0 ? { floor: 2, x: arenaW / 2 } : null,
        diamondsCount: 1,
        diamondLockedInCase: false,
        hasWeapons: false,
        isBossLevel: false,
        cctvs: [],
        car: { floor: 0, x: 90 },
        stonePickup: { floor: 3, x: arenaW / 2 },
      });
    }
    // --- Tier 4: Levels 36 - 50 ---
    else if (lvl <= 50) {
      const floorsCount = 5;
      const arenaW = 540; // Big size building
      const ladderPathsCount = 3;
      const guardCount = 8; // 8 guards!
      const stairs = generateStaggeredLadders(floorsCount, arenaW, ladderPathsCount);
      const guards = generateLevelGuards({
        floorsCount,
        guardCount,
        arenaW,
        lvl,
      });

      // CCTV cameras on floors 2 & 3
      const cctvs = [
        { floor: 2, x: 190, sweepDir: 1, angle: -25, maxAngle: 30, speed: 0.8 },
        { floor: 3, x: arenaW - 190, sweepDir: -1, angle: 25, maxAngle: 30, speed: 0.8 },
      ];

      levels.push({
        name,
        floorsCount,
        arenaW,
        ladderPathsCount: 3,
        stairs,
        guards,
        rivalCount: 3, // 3 rival thieves (one from each path!)
        rivalStartShafts: [90, arenaW / 2, arenaW - 90],
        requiresPetrol: false,
        diamondsCount: 1,
        diamondLockedInCase: false,
        hasWeapons: true, // Gun & Bomb pickups active!
        gunPickup: { floor: 1, x: arenaW / 2, ammo: 4 },
        bombPickup: { floor: 3, x: 90, count: 2 },
        isBossLevel: false,
        cctvs,
        car: { floor: 0, x: 90 },
        stonePickup: { floor: 2, x: arenaW - 90 },
      });
    }
    // --- Tier 5: Levels 51 - 70 ---
    else if (lvl <= 70) {
      const floorsCount = 6;
      const arenaW = 550;
      const ladderPathsCount = 3;
      const guardCount = 8;
      const stairs = generateStaggeredLadders(floorsCount, arenaW, ladderPathsCount);
      // 2 guards with guns and high vision
      const guards = generateLevelGuards({
        floorsCount,
        guardCount,
        arenaW,
        armedGuardIndices: [0, 4],
        lvl,
      });

      const cctvs = [
        { floor: 2, x: 180, sweepDir: 1, angle: -25, maxAngle: 30, speed: 0.9 },
        { floor: 4, x: arenaW - 180, sweepDir: -1, angle: 25, maxAngle: 30, speed: 0.9 },
      ];

      levels.push({
        name,
        floorsCount,
        arenaW,
        ladderPathsCount: 3,
        stairs,
        guards,
        rivalCount: 2,
        rivalStartShafts: [90, arenaW - 90],
        requiresPetrol: false,
        diamondsCount: 1,
        diamondLockedInCase: false,
        hasWeapons: true,
        gunPickup: { floor: 1, x: arenaW - 110, ammo: 4 },
        bombPickup: { floor: 3, x: 120, count: 2 },
        isBossLevel: false,
        cctvs,
        car: { floor: 0, x: 90 },
        stonePickup: { floor: 2, x: arenaW / 2 },
      });
    }
    // --- Tier 6: Levels 71 - 80 ---
    else if (lvl <= 80) {
      const floorsCount = 6;
      const arenaW = 560;
      const ladderPathsCount = 3;
      const guardCount = 8;
      const stairs = generateStaggeredLadders(floorsCount, arenaW, ladderPathsCount);
      // Multiple armed guards with guns
      const guards = generateLevelGuards({
        floorsCount,
        guardCount,
        arenaW,
        armedGuardIndices: [0, 3, 6],
        lvl,
      });

      const cctvs = [
        { floor: 2, x: 170, sweepDir: 1, angle: -28, maxAngle: 32, speed: 0.9 },
        { floor: 3, x: arenaW / 2, sweepDir: -1, angle: 20, maxAngle: 30, speed: 0.9 },
        { floor: 4, x: arenaW - 170, sweepDir: 1, angle: -28, maxAngle: 32, speed: 0.9 },
      ];

      levels.push({
        name,
        floorsCount,
        arenaW,
        ladderPathsCount: 3,
        stairs,
        guards,
        rivalCount: 2,
        rivalStartShafts: [90, arenaW - 90],
        requiresPetrol: false,
        diamondsCount: 2, // 2 Diamonds!
        extraDiamond: { floor: 3, x: arenaW / 2 },
        diamondLockedInCase: false,
        hasWeapons: true,
        gunPickup: { floor: 1, x: arenaW / 2, ammo: 5 },
        bombPickup: { floor: 4, x: 100, count: 2 },
        isBossLevel: false,
        cctvs,
        car: { floor: 0, x: 90 },
        stonePickup: { floor: 2, x: 80 },
      });
    }
    // --- Tier 7: Levels 81 - 98 ---
    else if (lvl <= 98) {
      const floorsCount = 6;
      const arenaW = 560;
      const ladderPathsCount = 3;
      const guardCount = 8;
      const stairs = generateStaggeredLadders(floorsCount, arenaW, ladderPathsCount);
      // Armed guards and designated key guard
      const guards = generateLevelGuards({
        floorsCount,
        guardCount,
        arenaW,
        armedGuardIndices: [1, 5],
        keyGuardIndex: 2,
        lvl,
      });

      const cctvs = [
        { floor: 2, x: 180, sweepDir: 1, angle: -25, maxAngle: 30, speed: 0.95 },
        { floor: 4, x: arenaW - 180, sweepDir: -1, angle: 25, maxAngle: 30, speed: 0.95 },
      ];

      levels.push({
        name,
        floorsCount,
        arenaW,
        ladderPathsCount: 3,
        stairs,
        guards,
        rivalCount: 2,
        rivalStartShafts: [90, arenaW - 90],
        requiresPetrol: false,
        diamondsCount: 1,
        diamondLockedInCase: true, // Locked in glass case!
        hasWeapons: true,
        gunPickup: { floor: 1, x: 110, ammo: 4 },
        bombPickup: { floor: 3, x: arenaW - 110, count: 2 },
        isBossLevel: false,
        cctvs,
        car: { floor: 0, x: 90 },
        stonePickup: { floor: 2, x: 80 },
      });
    }
    // --- Tier 8: Levels 99 - 100 (Final Boss / Treasure Hunt) ---
    else {
      const floorsCount = 6;
      const arenaW = 580;
      const stairs = generateStaggeredLadders(floorsCount, arenaW, 3);

      // 2 Giant Boss Guards on the Vault floor + 4 elite armed guards
      const guards = [
        // Boss 1 on top vault floor guarding the royal treasure (starts LEFT facing right)
        {
          id: 'boss_1',
          floor: 5,
          x: 100,
          dir: 1,
          speed: 0.9,
          minX: 80,
          maxX: arenaW - 80,
          hasGun: true,
          shootCooldown: 40,
          hasKey: false,
          isBoss: true,
          maxHp: 3,
          hp: 3,
        },
        // Boss 2 on top vault floor (starts RIGHT facing left - no overlap!)
        {
          id: 'boss_2',
          floor: 5,
          x: arenaW - 100,
          dir: -1,
          speed: 0.9,
          minX: 80,
          maxX: arenaW - 80,
          hasGun: true,
          shootCooldown: 60,
          hasKey: false,
          isBoss: true,
          maxHp: 3,
          hp: 3,
        },
        // Elite armed patrolling lower floors
        {
          id: 'g_elite_1',
          floor: 1,
          x: 100,
          dir: 1,
          speed: 1.25,
          minX: 45,
          maxX: arenaW - 45,
          hasGun: true,
          shootCooldown: 0,
          hasKey: false,
          isBoss: false,
        },
        {
          id: 'g_elite_2',
          floor: 2,
          x: arenaW - 100,
          dir: -1,
          speed: 1.35,
          minX: 45,
          maxX: arenaW - 45,
          hasGun: false,
          hasKey: false,
          isBoss: false,
        },
        {
          id: 'g_elite_3',
          floor: 3,
          x: 140,
          dir: 1,
          speed: 1.25,
          minX: 45,
          maxX: arenaW - 45,
          hasGun: true,
          shootCooldown: 0,
          hasKey: false,
          isBoss: false,
        },
        {
          id: 'g_elite_4',
          floor: 4,
          x: arenaW - 140,
          dir: -1,
          speed: 1.4,
          minX: 45,
          maxX: arenaW - 45,
          hasGun: false,
          hasKey: false,
          isBoss: false,
        },
      ];

      const cctvs = [
        { floor: 2, x: 190, sweepDir: 1, angle: -25, maxAngle: 30, speed: 1.0 },
        { floor: 4, x: arenaW - 190, sweepDir: -1, angle: 25, maxAngle: 30, speed: 1.0 },
      ];

      levels.push({
        name,
        floorsCount,
        arenaW,
        ladderPathsCount: 3,
        stairs,
        guards,
        rivalCount: 0, // In boss level, spotlight is on defeating the Big Guards & fleeing police
        requiresPetrol: false,
        diamondsCount: 1,
        isMasterCrown: true,
        diamondLockedInCase: false,
        hasWeapons: true,
        gunPickup: { floor: 1, x: arenaW / 2, ammo: 6 },
        bombPickup: { floor: 3, x: arenaW / 2, count: 4 },
        isBossLevel: true,
        cctvs,
        car: { floor: 0, x: 95 },
        stonePickup: { floor: 2, x: arenaW - 110 },
      });
    }

    // Default Diamond location (Top Floor)
    const curLevel = levels[levels.length - 1];
    curLevel.diamond = {
      floor: curLevel.floorsCount - 1,
      x: curLevel.arenaW / 2,
    };
  }

  return levels;
}

const CURATED_LEVELS = generate100CuratedLevels();

export default function ThiefEscapeGame({
  isPaused = false,
  onBackToHub,
  onScoreUpdate,
}) {
  const juiceRef = useRef(null);

  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [isGameOver, setIsGameOver] = useState(false);
  const [victoryModal, setVictoryModal] = useState(false);
  /* --- [TEST_BUTTON_START] --- */
  const [showLevelPicker, setShowLevelPicker] = useState(false);
  /* --- [TEST_BUTTON_END] --- */

  // Distractor stones
  const [stones, setStones] = useState(3);
  const [thrownStones, setThrownStones] = useState([]);
  const [stonePickupTaken, setStonePickupTaken] = useState(false);

  // Weapon Pickups & Arsenal
  const [ammo, setAmmo] = useState(0);
  const [bombs, setBombs] = useState(0);
  const [gunTaken, setGunTaken] = useState(false);
  const [bombTaken, setBombTaken] = useState(false);
  const [bullets, setBullets] = useState([]);
  const [thrownBombs, setThrownBombs] = useState([]);

  // Police Emergency Alert (10s countdown after gun shot / bomb / final treasure)
  const [policeTimer, setPoliceTimer] = useState(0); // in frames (500 frames = 10.0s)
  const [policeActive, setPoliceActive] = useState(false);

  // Police Car & Pursuing Officer Squad
  const [policeSquad, setPoliceSquad] = useState(() => ({
    active: false,
    carX: -120,
    carTargetX: 0,
    carArrived: false,
    officer: {
      active: false,
      x: 0,
      floor: 0,
      y: null,
      isClimbing: false,
      stairIdx: null,
      climbDir: 0,
      facing: -1,
      speed: 2.7,
    },
    sirenBlink: false,
  }));
  const policeSquadRef = useRef(policeSquad);
  useEffect(() => {
    policeSquadRef.current = policeSquad;
  }, [policeSquad]);

  // Key Stealing & Locked Case State
  const [hasKey, setHasKey] = useState(false);
  const [keyStealProgress, setKeyStealProgress] = useState(0); // 0 to 100 (2 seconds)
  const [droppedKeys, setDroppedKeys] = useState([]);

  // Active Level Config
  const levelConfig = CURATED_LEVELS[Math.min(level - 1, CURATED_LEVELS.length - 1)];
  const arenaW = levelConfig.arenaW;
  const windowList = getWindowListForWidth(arenaW);

  // Dynamic Floor Height
  const floorHeight = ARENA_H / (levelConfig.floorsCount + 0.35);
  const getFloorY = useCallback(
    (floorIdx) => ARENA_H - 35 - floorIdx * floorHeight,
    [floorHeight]
  );

  // Player State
  const [player, setPlayer] = useState({
    floor: 0,
    x: levelConfig.car.x + 50,
    y: null,
    isClimbing: false,
    stairIdx: null,
    isHiding: false,
    hiddenWindowX: null,
    hasDiamond: false,
    diamondsHeld: 0,
    hasPetrol: !levelConfig.requiresPetrol,
    facing: 1,
  });

  // Multiple Rival Thieves
  const [rivals, setRivals] = useState([]);

  // Guards State
  const [guards, setGuards] = useState([]);

  // CCTV State
  const [cctvs, setCctvs] = useState([]);

  // Loot Items State
  const [diamondTaken, setDiamondTaken] = useState(false);
  const [extraDiamondTaken, setExtraDiamondTaken] = useState(false);
  const [petrolTaken, setPetrolTaken] = useState(!levelConfig.requiresPetrol);

  // Getaway Car State
  const [carState, setCarState] = useState(() => ({
    x: levelConfig.car.x,
    isEscaping: false,
    thiefInside: false,
    jumpPhase: 0,
    vx: 3.5,
    escapeDir: levelConfig.car.x < arenaW / 2 ? -1 : 1,
  }));
  const carStateRef = useRef(carState);
  useEffect(() => {
    carStateRef.current = carState;
  }, [carState]);

  // Movement & Action Input Refs
  const inputDirRef = useRef(0);
  const climbDirRef = useRef(0);
  const isSneakRef = useRef(false);

  const playerRef = useRef(player);
  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  const guardsRef = useRef(guards);
  useEffect(() => {
    guardsRef.current = guards;
  }, [guards]);

  const rivalsRef = useRef(rivals);
  useEffect(() => {
    rivalsRef.current = rivals;
  }, [rivals]);

  const cctvsRef = useRef(cctvs);
  useEffect(() => {
    cctvsRef.current = cctvs;
  }, [cctvs]);

  const bulletsRef = useRef(bullets);
  useEffect(() => {
    bulletsRef.current = bullets;
  }, [bullets]);

  const thrownBombsRef = useRef(thrownBombs);
  useEffect(() => {
    thrownBombsRef.current = thrownBombs;
  }, [thrownBombs]);

  const policeTimerRef = useRef(0);
  const policeActiveRef = useRef(false);
  const keyStealProgressRef = useRef(0);
  const hasKeyRef = useRef(false);
  const droppedKeysRef = useRef([]);
  useEffect(() => {
    droppedKeysRef.current = droppedKeys;
  }, [droppedKeys]);

  const diamondTakenRef = useRef(false);
  const extraDiamondTakenRef = useRef(false);
  const petrolTakenRef = useRef(false);
  const stonesRef = useRef(stones);
  useEffect(() => {
    stonesRef.current = stones;
  }, [stones]);
  const thrownStonesRef = useRef(thrownStones);
  useEffect(() => {
    thrownStonesRef.current = thrownStones;
  }, [thrownStones]);

  const ammoRef = useRef(ammo);
  useEffect(() => {
    ammoRef.current = ammo;
  }, [ammo]);
  const bombsRef = useRef(bombs);
  useEffect(() => {
    bombsRef.current = bombs;
  }, [bombs]);

  const fuelWarningCooldownRef = useRef(false);

  // Save current level to persistent storage
  const saveCurrentLevel = useCallback(async (lvl) => {
    try {
      await AsyncStorage.setItem(STORAGE_LEVEL_KEY, String(lvl));
    } catch {}
  }, []);

  // Initialize / Reset Level
  const initLevel = useCallback(
    (lvl) => {
      const cfg = CURATED_LEVELS[Math.min(lvl - 1, CURATED_LEVELS.length - 1)];
      const w = cfg.arenaW;

      const initialPlayer = {
        floor: 0,
        x: cfg.car.x + (cfg.car.x < w / 2 ? 50 : -50),
        y: null,
        isClimbing: false,
        stairIdx: null,
        isHiding: false,
        hiddenWindowX: null,
        hasDiamond: false,
        diamondsHeld: 0,
        hasPetrol: !cfg.requiresPetrol,
        facing: cfg.car.x < w / 2 ? 1 : -1,
      };
      setPlayer(initialPlayer);
      playerRef.current = initialPlayer;

      const initialGuards = cfg.guards.map((g) => ({
        ...g,
        isDefeated: false,
        alertTimer: 0,
        pauseTimer: 0,
        isInvestigating: false,
        investigateTargetX: g.x,
        investigateTimer: 0,
        investigateSpeed: g.speed,
        isChasing: false,
        chaseTimer: 0,
        shootCooldown: 0,
        hp: g.hp || 1,
      }));
      setGuards(initialGuards);
      guardsRef.current = initialGuards;

      // Rivals
      const initialRivals = [];
      for (let r = 0; r < cfg.rivalCount; r++) {
        const startX = cfg.rivalStartShafts ? cfg.rivalStartShafts[r % cfg.rivalStartShafts.length] : (cfg.car.x + 130 + r * 60);
        initialRivals.push({
          id: `rival_${r}`,
          floor: 0,
          x: Math.max(50, Math.min(w - 50, startX)),
          y: null,
          isClimbing: false,
          stairIdx: null,
          climbDir: 0,
          facing: 1,
          hasDiamond: false,
          isAlive: true,
          isHiding: false,
          hiddenWindowX: null,
          hideTimer: 0,
          snatchCooldown: 0,
          isSearching: false,
          searchFloor: 0,
          searchTargetX: null,
          searchTimer: 0,
          smokeBombs: 2,
          smokeInvisTimer: 0,
          pebbleCooldown: 0,
          hasKey: false,
          keyStealTimer: 0,
        });
      }
      setRivals(initialRivals);
      rivalsRef.current = initialRivals;

      // CCTVs
      const initialCctvs = (cfg.cctvs || []).map((c) => ({
        ...c,
        angle: c.angle || 0,
        alertCooldown: 0,
      }));
      setCctvs(initialCctvs);
      cctvsRef.current = initialCctvs;

      // Weapons & Police Alert
      setAmmo(0);
      ammoRef.current = 0;
      setBombs(0);
      bombsRef.current = 0;
      setGunTaken(false);
      setBombTaken(false);
      setBullets([]);
      bulletsRef.current = [];
      setThrownBombs([]);
      thrownBombsRef.current = [];

      setPoliceTimer(0);
      policeTimerRef.current = 0;
      setPoliceActive(false);
      policeActiveRef.current = false;
      setPoliceSquad({
        active: false,
        carX: -120,
        carTargetX: 0,
        carArrived: false,
        officer: {
          active: false,
          x: 0,
          floor: 0,
          y: null,
          isClimbing: false,
          stairIdx: null,
          climbDir: 0,
          facing: -1,
          speed: 2.7,
        },
        sirenBlink: false,
      });
      policeSquadRef.current = {
        active: false,
        carX: -120,
        carTargetX: 0,
        carArrived: false,
        officer: {
          active: false,
          x: 0,
          floor: 0,
          y: null,
          isClimbing: false,
          stairIdx: null,
          climbDir: 0,
          facing: -1,
          speed: 2.7,
        },
        sirenBlink: false,
      };

      // Key & Locked Case
      setHasKey(false);
      hasKeyRef.current = false;
      setDroppedKeys([]);
      droppedKeysRef.current = [];
      setKeyStealProgress(0);
      keyStealProgressRef.current = 0;

      // Diamonds & Fuel
      setDiamondTaken(false);
      diamondTakenRef.current = false;
      setExtraDiamondTaken(false);
      extraDiamondTakenRef.current = false;
      setPetrolTaken(!cfg.requiresPetrol);
      petrolTakenRef.current = !cfg.requiresPetrol;

      setStones(3);
      stonesRef.current = 3;
      setThrownStones([]);
      thrownStonesRef.current = [];
      setStonePickupTaken(false);

      const initialCar = {
        x: cfg.car.x,
        isEscaping: false,
        thiefInside: false,
        jumpPhase: 0,
        vx: 3.5,
        escapeDir: cfg.car.x < w / 2 ? -1 : 1,
      };
      setCarState(initialCar);
      carStateRef.current = initialCar;

      inputDirRef.current = 0;
      climbDirRef.current = 0;
      isSneakRef.current = false;
      setIsGameOver(false);
      setVictoryModal(false);
    },
    []
  );

  // Load High Score and Continue Saved Level on startup
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((val) => {
        if (val) setHighScore(parseInt(val, 10) || 0);
      })
      .catch(() => {});

    AsyncStorage.getItem(STORAGE_LEVEL_KEY)
      .then((savedLvl) => {
        if (savedLvl) {
          const l = Math.max(1, parseInt(savedLvl, 10) || 1);
          setLevel(l);
          initLevel(l);
        } else {
          initLevel(1);
        }
      })
      .catch(() => {
        initLevel(1);
      });
  }, [initLevel]);

  // Player Caught / Damaged: Only reset player position to start; guards and rivals continue seamlessly!
  const handlePlayerBusted = useCallback(
    (reason = 'BUSTED!') => {
      triggerGameOverHaptic();
      playGameOverSound();
      juiceRef.current?.shake(12, 12);
      juiceRef.current?.flash(COLORS.danger);

      setLives((l) => {
        const nextLives = l - 1;
        if (nextLives <= 0) {
          setIsGameOver(true);
          juiceRef.current?.popup(`🚨 ${reason}`, 'Caught by security or police backup', COLORS.danger);
          return 0;
        } else {
          // Return diamond to starting vault position on top floor when player is caught
          const curP = playerRef.current;
          if (curP.hasDiamond) {
            levelConfig.diamond.floor = levelConfig.floorsCount - 1;
            levelConfig.diamond.x = Math.round(arenaW / 2);
            diamondTakenRef.current = false;
            setDiamondTaken(false);
          }
          if (levelConfig.extraDiamond && extraDiamondTakenRef.current) {
            levelConfig.extraDiamond.floor = 3;
            levelConfig.extraDiamond.x = Math.round(arenaW / 2);
            extraDiamondTakenRef.current = false;
            setExtraDiamondTaken(false);
          }

          const resetPlayer = {
            floor: 0,
            x: levelConfig.car.x + (levelConfig.car.x < arenaW / 2 ? 50 : -50),
            y: null,
            isClimbing: false,
            stairIdx: null,
            isHiding: false,
            hiddenWindowX: null,
            hasDiamond: false,
            diamondsHeld: 0,
            hasPetrol: !levelConfig.requiresPetrol || curP.hasPetrol,
            facing: levelConfig.car.x < arenaW / 2 ? 1 : -1,
          };
          setPlayer(resetPlayer);
          playerRef.current = resetPlayer;

          inputDirRef.current = 0;
          climbDirRef.current = 0;
          isSneakRef.current = false;

          juiceRef.current?.popup(`⚠️ ${reason}`, `${nextLives} Lives left (Respawned at Ground)`, COLORS.solarGold);
          return nextLives;
        }
      });
    },
    [arenaW, levelConfig]
  );

  // Trigger Police 10-Second Emergency Dispatch
  const triggerPoliceEmergency = useCallback((reason = 'LOUD GUNFIRE DETECTED!') => {
    if (policeActiveRef.current || policeSquadRef.current.active) return;
    policeActiveRef.current = true;
    setPoliceActive(true);
    // 500 frames = exactly 10.0 seconds at 50 ticks/s (20ms interval)
    policeTimerRef.current = 500;
    setPoliceTimer(500);

    triggerGameOverHaptic();
    playSpeedUpSound();
    juiceRef.current?.shake(10, 8);
    juiceRef.current?.popup(`🚨 ${reason}`, 'POLICE CAR ARRIVES IN 10.0s! GET TO YOUR CAR!', '#FF0055');
  }, []);

  // Throw Distractor Stone
  const handleThrowStone = useCallback(() => {
    if (isGameOver || isPaused || victoryModal) return;
    if (stonesRef.current <= 0) {
      triggerLightHaptic();
      juiceRef.current?.popup('NO STONES!', 'Search floors for pebbles', '#FF0055');
      return;
    }

    const curP = playerRef.current;
    const curY = curP.isClimbing && curP.y != null ? curP.y : getFloorY(curP.floor);
    const dir = curP.facing || 1;

    const newStone = {
      id: Date.now() + Math.random(),
      x: curP.x + dir * 8,
      y: curY - 14,
      vx: dir * 3.2,
      vy: -2.5,
      active: true,
      life: 60,
    };

    setStones((s) => {
      const next = s - 1;
      stonesRef.current = next;
      return next;
    });

    thrownStonesRef.current = [...thrownStonesRef.current, newStone];
    setThrownStones(thrownStonesRef.current);

    playSliceSound();
    triggerMediumHaptic();
    juiceRef.current?.popup('🪨 STONE THROWN!', dir > 0 ? 'Right ➔' : 'Left ⬅', '#FFE600');
  }, [isGameOver, isPaused, victoryModal, getFloorY]);

  // Shoot Gun: Fires fast bullet, knocks out guards, alerts police in 5 seconds!
  const handleShootGun = useCallback(() => {
    if (isGameOver || isPaused || victoryModal) return;
    if (ammoRef.current <= 0) {
      triggerLightHaptic();
      juiceRef.current?.popup('OUT OF AMMO!', 'Collect gun pickup', '#FF0055');
      return;
    }

    const curP = playerRef.current;
    if (curP.isHiding) {
      triggerLightHaptic();
      juiceRef.current?.popup('CANNOT SHOOT FROM WINDOW', 'Step out to aim', '#FF0055');
      return;
    }

    const curY = curP.isClimbing && curP.y != null ? curP.y : getFloorY(curP.floor);
    const dir = curP.facing || 1;

    setAmmo((a) => {
      const next = a - 1;
      ammoRef.current = next;
      return next;
    });

    const newBullet = {
      id: Date.now() + Math.random(),
      isPlayerBullet: true,
      x: curP.x + dir * 10,
      y: curY - 18,
      vx: dir * 8.5,
      floor: curP.floor,
      life: 50,
    };

    bulletsRef.current = [...bulletsRef.current, newBullet];
    setBullets(bulletsRef.current);

    playSliceSound();
    triggerPerfectHaptic();
    juiceRef.current?.burst(curP.x + dir * 14, curY - 18, '#FFE600', 16);

    // Gunshot triggers 5-second police arrival!
    triggerPoliceEmergency('LOUD GUNFIRE DETECTED!');
  }, [isGameOver, isPaused, victoryModal, getFloorY, triggerPoliceEmergency]);

  // Throw Bomb: Throws explosive, blast area knocks out guards & bosses, alerts police in 5s!
  const handleThrowBomb = useCallback(() => {
    if (isGameOver || isPaused || victoryModal) return;
    if (bombsRef.current <= 0) {
      triggerLightHaptic();
      juiceRef.current?.popup('NO BOMBS!', 'Collect bomb pickup', '#FF0055');
      return;
    }

    const curP = playerRef.current;
    if (curP.isHiding) {
      triggerLightHaptic();
      juiceRef.current?.popup('CANNOT THROW FROM WINDOW', 'Step out first', '#FF0055');
      return;
    }

    const curY = curP.isClimbing && curP.y != null ? curP.y : getFloorY(curP.floor);
    const dir = curP.facing || 1;

    setBombs((b) => {
      const next = b - 1;
      bombsRef.current = next;
      return next;
    });

    const newBomb = {
      id: Date.now() + Math.random(),
      x: curP.x + dir * 10,
      y: curY - 16,
      vx: dir * 3.8,
      vy: -3.5,
      floor: curP.floor,
      life: 55,
      active: true,
    };

    thrownBombsRef.current = [...thrownBombsRef.current, newBomb];
    setThrownBombs(thrownBombsRef.current);

    playSliceSound();
    triggerMediumHaptic();
    juiceRef.current?.popup('💣 BOMB THROWN!', 'Detonating in 1.5s', '#FF0055');
  }, [isGameOver, isPaused, victoryModal, getFloorY]);

  // Main 60 FPS Game Loop
  useEffect(() => {
    if (isPaused || isGameOver || victoryModal) return;

    const interval = setInterval(() => {
      const curPlayer = { ...playerRef.current };
      const curGuards = guardsRef.current.map((g) => ({ ...g }));
      const curRivals = rivalsRef.current.map((r) => ({ ...r }));
      const curCctvs = cctvsRef.current.map((c) => ({ ...c }));

      // --- 1. Police 10-Second Emergency Countdown ---
      if (policeActiveRef.current) {
        policeTimerRef.current -= 1;
        setPoliceTimer(policeTimerRef.current);
        if (policeTimerRef.current <= 0) {
          policeActiveRef.current = false;
          setPoliceActive(false);

          // If player hasn't escaped, Police car speeds in from the opposite side!
          if (!carStateRef.current.isEscaping && !carStateRef.current.thiefInside) {
            const getawayOnLeft = levelConfig.car.x < arenaW / 2;
            const startX = getawayOnLeft ? arenaW + 80 : -80;
            const targetX = getawayOnLeft ? arenaW - 65 : 65;

            policeSquadRef.current = {
              active: true,
              carX: startX,
              carTargetX: targetX,
              carArrived: false,
              officer: {
                active: false,
                x: targetX,
                floor: 0,
                y: null,
                isClimbing: false,
                stairIdx: null,
                climbDir: 0,
                facing: getawayOnLeft ? -1 : 1,
                speed: 2.7,
              },
              sirenBlink: false,
            };
            setPoliceSquad({ ...policeSquadRef.current });
            triggerGameOverHaptic();
            playSpeedUpSound();
            juiceRef.current?.shake(12, 10);
            juiceRef.current?.popup('🚨 POLICE CAR ARRIVED!', 'COP IS PURSUING YOU! RUN TO GETAWAY CAR!', '#FF0055');
          }
        }
      }

      // --- 1.1 Update Police Car & Officer Pursuit ---
      if (policeSquadRef.current.active && !carStateRef.current.isEscaping && !carStateRef.current.thiefInside) {
        const sq = { ...policeSquadRef.current };
        sq.sirenBlink = !sq.sirenBlink;

        // A. Police car driving in
        if (!sq.carArrived) {
          const dir = sq.carTargetX > sq.carX ? 1 : -1;
          sq.carX += dir * 4.8;
          if ((dir === 1 && sq.carX >= sq.carTargetX) || (dir === -1 && sq.carX <= sq.carTargetX)) {
            sq.carX = sq.carTargetX;
            sq.carArrived = true;
            sq.officer = {
              ...sq.officer,
              active: true,
              x: sq.carTargetX,
              floor: 0,
              y: null,
            };
            playTapSound();
            triggerMediumHaptic();
            juiceRef.current?.popup('👮 POLICE OFFICER DEPLOYED!', 'He is pursuing you! Reach your car!', '#FF0055');
          }
        }
        // B. Police officer actively pursuing player
        else if (sq.officer.active) {
          const cop = { ...sq.officer };
          const curCopY = cop.isClimbing && cop.y != null ? cop.y : getFloorY(cop.floor);
          const curPlyY = curPlayer.isClimbing && curPlayer.y != null ? curPlayer.y : getFloorY(curPlayer.floor);

          // Caught by police officer!
          const distX = Math.abs(cop.x - curPlayer.x);
          const distY = Math.abs(curCopY - curPlyY);
          if (distX < 20 && distY < 22) {
            handlePlayerBusted(curPlayer.isClimbing ? 'POLICE OFFICER CAUGHT YOU ON THE LADDER!' : 'CAUGHT AND ARRESTED BY POLICE OFFICER!');
            return;
          }

          // Ladder Climbing
          if (cop.isClimbing && cop.stairIdx != null) {
            const stair = levelConfig.stairs[cop.stairIdx];
            const yBottom = getFloorY(stair.fromFloor);
            const yTop = getFloorY(stair.toFloor);

            cop.x = stair.x;
            if (cop.y == null) cop.y = cop.climbDir === -1 ? yBottom - 4 : yTop + 4;

            // If pursuing player on the very same ladder: climb directly towards player's Y!
            if (curPlayer.isClimbing && curPlayer.stairIdx === cop.stairIdx && curPlayer.y != null) {
              const climbSpeed = cop.speed * 0.95;
              cop.y += curPlayer.y > cop.y ? climbSpeed : -climbSpeed;
              if (Math.abs(cop.y - curPlayer.y) < 22) {
                handlePlayerBusted('POLICE OFFICER CLIMBED THE LADDER AND ARRESTED YOU!');
                return;
              }
            } else {
              cop.y += cop.climbDir * (cop.speed * 0.9);

              if (cop.climbDir === -1 && cop.y <= yTop) {
                cop.y = null;
                cop.floor = stair.toFloor;
                cop.isClimbing = false;
                cop.stairIdx = null;
                cop.climbDir = 0;
              } else if (cop.climbDir === 1 && cop.y >= yBottom) {
                cop.y = null;
                cop.floor = stair.fromFloor;
                cop.isClimbing = false;
                cop.stairIdx = null;
                cop.climbDir = 0;
              }
            }
          }
          // Catwalk Navigation towards Player
          else {
            // If player is on a ladder, intercept player's ladder
            if (curPlayer.isClimbing && curPlayer.stairIdx != null) {
              const plyStair = levelConfig.stairs[curPlayer.stairIdx];
              if (plyStair && (cop.floor === plyStair.fromFloor || cop.floor === plyStair.toFloor)) {
                if (Math.abs(cop.x - plyStair.x) < 8) {
                  cop.isClimbing = true;
                  cop.stairIdx = curPlayer.stairIdx;
                  cop.climbDir = cop.floor === plyStair.fromFloor ? -1 : 1;
                  cop.x = plyStair.x;
                  cop.y = getFloorY(cop.floor) + (cop.climbDir === -1 ? -4 : 4);
                  triggerMediumHaptic();
                  juiceRef.current?.popup('POLICE ON LADDER!', 'Officer climbing to intercept you!', '#FF0055');
                } else {
                  cop.facing = cop.x < plyStair.x ? 1 : -1;
                  cop.x += cop.facing * cop.speed;
                }
              } else if (plyStair) {
                // Navigate floors towards plyStair.fromFloor
                const targetF = plyStair.fromFloor;
                if (cop.floor < targetF) {
                  const upStairs = levelConfig.stairs.map((s, idx) => ({ ...s, idx })).filter((s) => s.fromFloor === cop.floor);
                  if (upStairs.length > 0) {
                    const chosen = upStairs[0];
                    if (Math.abs(cop.x - chosen.x) < 8) {
                      cop.isClimbing = true;
                      cop.stairIdx = chosen.idx;
                      cop.climbDir = -1;
                      cop.x = chosen.x;
                      cop.y = getFloorY(chosen.fromFloor) - 4;
                    } else {
                      cop.facing = cop.x < chosen.x ? 1 : -1;
                      cop.x += cop.facing * cop.speed;
                    }
                  }
                } else {
                  const downStairs = levelConfig.stairs.map((s, idx) => ({ ...s, idx })).filter((s) => s.toFloor === cop.floor);
                  if (downStairs.length > 0) {
                    const chosen = downStairs[0];
                    if (Math.abs(cop.x - chosen.x) < 8) {
                      cop.isClimbing = true;
                      cop.stairIdx = chosen.idx;
                      cop.climbDir = 1;
                      cop.x = chosen.x;
                      cop.y = getFloorY(chosen.toFloor) + 4;
                    } else {
                      cop.facing = cop.x < chosen.x ? 1 : -1;
                      cop.x += cop.facing * cop.speed;
                    }
                  }
                }
              }
            } else if (cop.floor < curPlayer.floor) {
              const upStairs = levelConfig.stairs
                .map((s, idx) => ({ ...s, idx }))
                .filter((s) => s.fromFloor === cop.floor);
              if (upStairs.length > 0) {
                let chosen = upStairs[0];
                let bestDist = Infinity;
                for (const s of upStairs) {
                  const d = Math.abs(cop.x - s.x) + Math.abs(s.x - curPlayer.x);
                  if (d < bestDist) {
                    bestDist = d;
                    chosen = s;
                  }
                }
                if (Math.abs(cop.x - chosen.x) < 8) {
                  cop.isClimbing = true;
                  cop.stairIdx = chosen.idx;
                  cop.climbDir = -1;
                  cop.x = chosen.x;
                  cop.y = getFloorY(chosen.fromFloor) - 4;
                } else {
                  cop.facing = cop.x < chosen.x ? 1 : -1;
                  cop.x += cop.facing * cop.speed;
                }
              }
            } else if (cop.floor > curPlayer.floor) {
              const downStairs = levelConfig.stairs
                .map((s, idx) => ({ ...s, idx }))
                .filter((s) => s.toFloor === cop.floor);
              if (downStairs.length > 0) {
                let chosen = downStairs[0];
                let bestDist = Infinity;
                for (const s of downStairs) {
                  const d = Math.abs(cop.x - s.x) + Math.abs(s.x - curPlayer.x);
                  if (d < bestDist) {
                    bestDist = d;
                    chosen = s;
                  }
                }
                if (Math.abs(cop.x - chosen.x) < 8) {
                  cop.isClimbing = true;
                  cop.stairIdx = chosen.idx;
                  cop.climbDir = 1;
                  cop.x = chosen.x;
                  cop.y = getFloorY(chosen.toFloor) + 4;
                } else {
                  cop.facing = cop.x < chosen.x ? 1 : -1;
                  cop.x += cop.facing * cop.speed;
                }
              }
            } else {
              // Same floor as player: run at player!
              cop.facing = curPlayer.x > cop.x ? 1 : -1;
              cop.x += cop.facing * cop.speed;
            }
          }

          sq.officer = cop;
        }

        policeSquadRef.current = sq;
        setPoliceSquad(sq);
      }

      // --- 2. Update Player Movement (Catwalks, Ladders, Hiding) ---
      if (curPlayer.isClimbing && curPlayer.stairIdx != null) {
        const stair = levelConfig.stairs[curPlayer.stairIdx];
        const yBottom = getFloorY(stair.fromFloor);
        const yTop = getFloorY(stair.toFloor);

        curPlayer.isHiding = false;
        curPlayer.hiddenWindowX = null;

        if (climbDirRef.current !== 0) {
          curPlayer.y += climbDirRef.current * 2.5;
        }

        // Reached Top Floor
        if (curPlayer.y <= yTop) {
          curPlayer.y = null;
          curPlayer.floor = stair.toFloor;
          curPlayer.isClimbing = false;
          curPlayer.stairIdx = null;
          triggerLightHaptic();
          playSnapTickSound();
        }
        // Reached Bottom Floor
        else if (curPlayer.y >= yBottom) {
          curPlayer.y = null;
          curPlayer.floor = stair.fromFloor;
          curPlayer.isClimbing = false;
          curPlayer.stairIdx = null;
          triggerLightHaptic();
          playSnapTickSound();
        }
        // Horizontal step-off near platform
        else if (inputDirRef.current !== 0) {
          if (Math.abs(curPlayer.y - yTop) < 14) {
            curPlayer.y = null;
            curPlayer.floor = stair.toFloor;
            curPlayer.isClimbing = false;
            curPlayer.stairIdx = null;
            curPlayer.x += inputDirRef.current * 2.2;
          } else if (Math.abs(curPlayer.y - yBottom) < 14) {
            curPlayer.y = null;
            curPlayer.floor = stair.fromFloor;
            curPlayer.isClimbing = false;
            curPlayer.stairIdx = null;
            curPlayer.x += inputDirRef.current * 2.2;
          }
        }
      } else {
        // Player is on catwalk floor
        if (curPlayer.isHiding) {
          if (inputDirRef.current !== 0) {
            curPlayer.isHiding = false;
            curPlayer.hiddenWindowX = null;
            isSneakRef.current = false;
            curPlayer.x += inputDirRef.current * 2.6;
            curPlayer.facing = inputDirRef.current;
          }
        } else {
          if (inputDirRef.current !== 0) {
            curPlayer.x += inputDirRef.current * 2.7;
            curPlayer.facing = inputDirRef.current;
          }
          curPlayer.x = Math.max(30, Math.min(arenaW - 30, curPlayer.x));

          // Ladder Climb Up Check
          if (climbDirRef.current === -1) {
            const upIdx = levelConfig.stairs.findIndex(
              (s) => s.fromFloor === curPlayer.floor && Math.abs(curPlayer.x - s.x) < 25
            );
            if (upIdx !== -1) {
              const stair = levelConfig.stairs[upIdx];
              curPlayer.isClimbing = true;
              curPlayer.stairIdx = upIdx;
              curPlayer.x = stair.x;
              curPlayer.y = getFloorY(stair.fromFloor) - 4;
              playSliceSound();
              triggerLightHaptic();
            }
          }
          // Ladder Climb Down Check
          else if (climbDirRef.current === 1) {
            const downIdx = levelConfig.stairs.findIndex(
              (s) => s.toFloor === curPlayer.floor && Math.abs(curPlayer.x - s.x) < 25
            );
            if (downIdx !== -1) {
              const stair = levelConfig.stairs[downIdx];
              curPlayer.isClimbing = true;
              curPlayer.stairIdx = downIdx;
              curPlayer.x = stair.x;
              curPlayer.y = getFloorY(stair.toFloor) + 4;
              playSliceSound();
              triggerLightHaptic();
            }
          }
        }
      }

      // --- 3. Key Steal Mechanic (Standing 2 Seconds Near Distracted Key Guard) ---
      if (levelConfig.diamondLockedInCase && !hasKeyRef.current) {
        const keyGuard = curGuards.find((g) => g.hasKey && !g.isDefeated);
        if (keyGuard && keyGuard.floor === curPlayer.floor && !curPlayer.isClimbing) {
          const distToKeyGuard = Math.abs(curPlayer.x - keyGuard.x);
          const isDistracted = keyGuard.isInvestigating;

          if (distToKeyGuard < 26) {
            if (isDistracted) {
              // Valid sneak: increment steal progress
              keyStealProgressRef.current += 1;
              setKeyStealProgress(keyStealProgressRef.current);

              if (keyStealProgressRef.current >= 100) {
                // Steal complete!
                hasKeyRef.current = true;
                setHasKey(true);
                keyGuard.hasKey = false;
                triggerPerfectHaptic();
                playPerfectSound();
                juiceRef.current?.burst(curPlayer.x, getFloorY(curPlayer.floor) - 15, '#FFE600', 22);
                juiceRef.current?.popup('🗝️ VAULT KEY STOLEN!', 'Sneak to diamond case to unlock!', COLORS.matrixMint);
              }
            } else if (!curPlayer.isHiding) {
              // Guard is NOT distracted by stone trick -> Caught!
              handlePlayerBusted('GUARD NOTICED YOU REACHING FOR HIS KEY!');
              return;
            }
          } else {
            // Moved away: slowly decay progress
            if (keyStealProgressRef.current > 0) {
              keyStealProgressRef.current = Math.max(0, keyStealProgressRef.current - 1);
              setKeyStealProgress(keyStealProgressRef.current);
            }
          }
        }
      }

      // Dropped Vault Key Pickup Check
      if (!hasKeyRef.current && droppedKeysRef.current.length > 0 && !curPlayer.isClimbing) {
        const remainingKeys = [];
        droppedKeysRef.current.forEach((k) => {
          if (k.floor === curPlayer.floor && Math.abs(curPlayer.x - k.x) < 26) {
            hasKeyRef.current = true;
            setHasKey(true);
            playPerfectSound();
            triggerPerfectHaptic();
            juiceRef.current?.burst(curPlayer.x, getFloorY(curPlayer.floor) - 15, '#FFE600', 22);
            juiceRef.current?.popup('KEY RECOVERED!', 'Vault key picked up from floor!', '#FFE600');
          } else {
            remainingKeys.push(k);
          }
        });
        if (remainingKeys.length !== droppedKeysRef.current.length) {
          droppedKeysRef.current = remainingKeys;
          setDroppedKeys(remainingKeys);
        }
      }

      // --- 4. CCTV Camera Sweeps & Floor Guard Alerts ---
      curCctvs.forEach((cam) => {
        cam.angle += cam.sweepDir * cam.speed;
        if (cam.angle >= cam.maxAngle) {
          cam.angle = cam.maxAngle;
          cam.sweepDir = -1;
        } else if (cam.angle <= -cam.maxAngle) {
          cam.angle = -cam.maxAngle;
          cam.sweepDir = 1;
        }

        // Detection cone check against Player
        if (!curPlayer.isHiding && curPlayer.floor === cam.floor && !curPlayer.isClimbing) {
          // Projected cone center on floor
          const projectedX = cam.x + Math.tan((cam.angle * Math.PI) / 180) * 45;
          if (Math.abs(curPlayer.x - projectedX) < 32) {
            // Player detected by CCTV!
            cam.alertCooldown = 60;
            // Alert all guards on this floor to sprint/chase towards player!
            curGuards.forEach((g) => {
              if (g.floor === cam.floor && !g.isDefeated) {
                g.isChasing = true;
                g.chaseTimer = 120;
                g.alertTimer = 120;
                g.dir = curPlayer.x > g.x ? 1 : -1;
              }
            });
            triggerGameOverHaptic();
            juiceRef.current?.shake(6, 6);
            juiceRef.current?.popup('🚨 CCTV DETECTED YOU!', 'Floor guards alerted!', '#FF0055');
          }
        }

        // Check if CCTV spots unhidden rival thief
        curRivals.forEach((riv) => {
          if (!riv.isAlive || riv.isHiding || riv.isClimbing || (riv.smokeInvisTimer && riv.smokeInvisTimer > 0)) return;
          if (riv.floor === cam.floor) {
            const projectedX = cam.x + Math.tan((cam.angle * Math.PI) / 180) * 45;
            if (Math.abs(riv.x - projectedX) < 32) {
              cam.alertCooldown = 60;
              curGuards.forEach((g) => {
                if (g.floor === cam.floor && !g.isDefeated) {
                  g.isChasing = true;
                  g.chaseTimer = 100;
                  g.alertTimer = 100;
                  g.dir = riv.x > g.x ? 1 : -1;
                }
              });
              juiceRef.current?.popup('🚨 CCTV SPOTTED RIVAL THIEF!', 'Guards alerted on floor!', '#FF0055');
            }
          }
        });
      });

      // --- 5. Update Guards: Patrol, Stone Distraction, CCTV Chase, Gun Shooting ---
      const nextBullets = [...bulletsRef.current];

      curGuards.forEach((g) => {
        if (g.isDefeated) return;

        if (g.alertTimer > 0) g.alertTimer -= 1;
        if (g.shootCooldown > 0) g.shootCooldown -= 1;

        // A. Guard Chasing Player due to CCTV or Sound Alert
        if (g.isChasing && g.chaseTimer > 0) {
          g.chaseTimer -= 1;
          const distToPlayer = curPlayer.x - g.x;
          if (Math.abs(distToPlayer) > 8) {
            g.dir = distToPlayer > 0 ? 1 : -1;
            g.x += g.dir * (g.speed * 1.35);
            g.x = Math.max(g.minX, Math.min(g.maxX, g.x));
          }
          if (g.chaseTimer <= 0) g.isChasing = false;
        }
        // B. Guard Investigating Thrown Stone Sound
        else if (g.isInvestigating) {
          const distToNoise = g.investigateTargetX - g.x;
          if (Math.abs(distToNoise) > 6) {
            g.dir = distToNoise > 0 ? 1 : -1;
            g.x += g.dir * (g.investigateSpeed || g.speed * 0.95);
            g.x = Math.max(g.minX, Math.min(g.maxX, g.x));
          } else {
            g.x = g.investigateTargetX;
            g.investigateTimer = (g.investigateTimer || 0) - 1;
            if (g.investigateTimer <= 0) {
              g.isInvestigating = false;
              g.pauseTimer = 30;
            }
          }
        }
        // C. Normal Catwalk Patrol
        else if (g.pauseTimer > 0) {
          g.pauseTimer -= 1;
        } else {
          g.x += g.dir * g.speed;
          if (g.x >= g.maxX) {
            g.x = g.maxX;
            g.dir = -1;
            g.pauseTimer = 35;
          } else if (g.x <= g.minX) {
            g.x = g.minX;
            g.dir = 1;
            g.pauseTimer = 35;
          }
        }

        // D. Armed Guard / Sniper Vision & Projectile Shooting
        if (g.hasGun && g.shootCooldown <= 0 && !curPlayer.isHiding && !carStateRef.current.isEscaping) {
          const playerY = curPlayer.isClimbing && curPlayer.y != null ? curPlayer.y : getFloorY(curPlayer.floor);
          const gy = getFloorY(g.floor);
          const dx = (curPlayer.x - g.x) * g.dir;
          const dy = playerY - gy;

          // Wide angle sniper sight cone: range up to SNIPER_VISION_LEN, vertical angular spread up to 48px
          const inSniperSight = dx > 0 && dx < SNIPER_VISION_LEN && Math.abs(dy) <= (dx / SNIPER_VISION_LEN) * 48 + 18;

          if (inSniperSight) {
            // Fire bullet with angle towards player!
            g.shootCooldown = g.isBoss ? 55 : 85;
            const bDir = g.dir;
            const angle = Math.atan2(playerY - 18 - (gy - 18), curPlayer.x - g.x);
            const bSpeed = 6.0;
            nextBullets.push({
              id: Date.now() + Math.random(),
              isPlayerBullet: false,
              x: g.x + bDir * 12,
              y: gy - 18,
              vx: Math.cos(angle) * bSpeed,
              vy: Math.sin(angle) * bSpeed,
              floor: g.floor,
              life: 60,
            });
            playSliceSound();
            triggerMediumHaptic();
            juiceRef.current?.popup('💥 GUARD FIRED!', 'Dodge or hide!', '#FF0055');
          }
        }

        // E. Flashlight & Vision Detection against Player
        if (!curPlayer.isHiding && !carStateRef.current.isEscaping && !carStateRef.current.thiefInside) {
          const playerY = curPlayer.isClimbing && curPlayer.y != null ? curPlayer.y : getFloorY(curPlayer.floor);
          const gy = getFloorY(g.floor);
          const dx = (curPlayer.x - g.x) * g.dir;
          const dy = playerY - gy;

          let spotted = false;
          if (g.hasGun) {
            // Armed sniper wide angle vision cone
            spotted = dx > 0 && dx < SNIPER_VISION_LEN && Math.abs(dy) <= (dx / SNIPER_VISION_LEN) * 48 + 18;
          } else {
            // Standard patrol flashlight
            spotted = dx > 0 && dx < FLASHLIGHT_LEN && Math.abs(dy) < 18;
          }

          if (spotted) {
            handlePlayerBusted('SPOTTED BY PATROL GUARD!');
            return;
          }

          // Guard catches player on ladder if guard is at ladder opening and player is within reach
          if (curPlayer.isClimbing && curPlayer.stairIdx != null) {
            const stair = levelConfig.stairs[curPlayer.stairIdx];
            if (stair && (g.floor === stair.fromFloor || g.floor === stair.toFloor)) {
              if (Math.abs(g.x - stair.x) < 22 && Math.abs(playerY - gy) < 36) {
                handlePlayerBusted('GUARD CAUGHT YOU ON THE LADDER!');
                return;
              }
            }
          }
        }

        // F. Guard Detection / Catch against Unhidden Rival Thieves
        curRivals.forEach((riv) => {
          if (!riv.isAlive || riv.isHiding) return;
          const rivY = riv.isClimbing && riv.y != null ? riv.y : getFloorY(riv.floor);
          const gy = getFloorY(g.floor);

          if (Math.abs(rivY - gy) < 20) {
            const dist = riv.x - g.x;
            const physicalTouch = Math.abs(dist) < 20;

            if (physicalTouch) {
              // 1. Smoke Cloak Active: Guard swipes through smoke and misses completely!
              if (riv.smokeInvisTimer > 0) return;

              // 2. Ninja Smoke Bomb Escape: Drop smoke bomb, stun guard, vault away!
              if ((riv.smokeBombs || 0) > 0) {
                riv.smokeBombs -= 1;
                riv.smokeInvisTimer = 90; // 1.5 seconds smoke cloak
                g.isChasing = false;
                g.isInvestigating = false;
                g.pauseTimer = 90; // Stun guard
                // Vault to safe distance away from guard
                const vaultDir = riv.x < g.x ? -1 : 1;
                riv.x = Math.max(35, Math.min(arenaW - 35, riv.x + vaultDir * 55));
                playSnapTickSound();
                triggerMediumHaptic();
                juiceRef.current?.burst(riv.x, gy - 12, '#9D4EDD', 26);
                juiceRef.current?.popup('💨 RIVAL NINJA SMOKE BOMB!', 'Rival stunned guard and vanished in smoke!', '#C77DFF');
                return;
              }

              // 3. Out of smoke bombs: Guard catches rival!
              riv.isAlive = false;
              juiceRef.current?.burst(riv.x, gy - 12, '#FF0055', 20);
              if (riv.hasDiamond) {
                riv.hasDiamond = false;
                levelConfig.diamond.floor = riv.floor;
                levelConfig.diamond.x = Math.max(40, Math.min(arenaW - 40, riv.x));
                diamondTakenRef.current = false;
                setDiamondTaken(false);
                juiceRef.current?.popup('🚨 GUARD BUSTED RIVAL THIEF!', 'Diamond dropped on catwalk!', '#FF0055');
              } else {
                juiceRef.current?.popup('🚨 GUARD BUSTED RIVAL THIEF!', '1 Rival thief eliminated!', '#FF9900');
              }
            }
          }
        });
      });

      // --- 6. Update Bullets & Projectiles Physics ---
      const activeBullets = [];
      nextBullets.forEach((b) => {
        b.x += b.vx;
        b.y = (b.y || getFloorY(b.floor) - 18) + (b.vy || 0);
        b.life -= 1;

        if (b.life <= 0 || b.x < 15 || b.x > arenaW - 15) return;

        // Player Bullet Hit Guard / Boss
        if (b.isPlayerBullet) {
          let hit = false;
          curGuards.forEach((g) => {
            if (g.isDefeated || g.floor !== b.floor) return;
            if (Math.abs(b.x - g.x) < 16) {
              hit = true;
              g.hp -= 1;
              triggerPerfectHaptic();
              playSliceSound();
              juiceRef.current?.burst(g.x, getFloorY(g.floor) - 15, '#FFE600', 16);

              if (g.hp <= 0) {
                g.isDefeated = true;
                if (g.hasKey) {
                  g.hasKey = false;
                  const newDropped = [...droppedKeysRef.current, { id: Date.now() + Math.random(), floor: g.floor, x: g.x }];
                  droppedKeysRef.current = newDropped;
                  setDroppedKeys(newDropped);
                  triggerPerfectHaptic();
                  playSnapTickSound();
                  juiceRef.current?.popup('KEY DROPPED!', 'Guard dropped the vault key!', '#FFE600');
                }
                juiceRef.current?.popup(g.isBoss ? '👑 BOSS KNOCKED OUT!' : '💥 GUARD NEUTRALIZED!', '+300 PTS', COLORS.matrixMint);
                setScore((s) => s + (g.isBoss ? 1500 : 300));
              } else {
                juiceRef.current?.popup('💥 BOSS HIT!', `HP: ${g.hp}/${g.maxHp}`, '#FFE600');
              }
            }
          });
          if (!hit) activeBullets.push(b);
        }
        // Guard Bullet Hit Player or Unhidden Rival
        else {
          const pY = curPlayer.isClimbing && curPlayer.y != null ? curPlayer.y : getFloorY(curPlayer.floor);

          if (!curPlayer.isHiding && Math.abs(pY - 18 - b.y) < 20 && Math.abs(b.x - curPlayer.x) < 16) {
            handlePlayerBusted('HIT BY GUARD BULLET!');
            return;
          } else {
            // Check if bullet hit unhidden rival thief
            let hitRival = false;
            curRivals.forEach((riv) => {
              if (!riv.isAlive || riv.isHiding) return;
              const rivY = riv.isClimbing && riv.y != null ? riv.y : getFloorY(riv.floor);
              if (Math.abs(rivY - 18 - b.y) < 20 && Math.abs(b.x - riv.x) < 16) {
                if ((riv.smokeInvisTimer || 0) > 0) return; // Cloaked in smoke, bullet misses!

                hitRival = true;
                if ((riv.smokeBombs || 0) > 0) {
                  riv.smokeBombs -= 1;
                  riv.smokeInvisTimer = 80;
                  const dodgeDir = b.vx > 0 ? -1 : 1;
                  riv.x = Math.max(35, Math.min(arenaW - 35, riv.x + dodgeDir * 45));
                  playSnapTickSound();
                  triggerMediumHaptic();
                  juiceRef.current?.burst(riv.x, rivY - 12, '#9D4EDD', 22);
                  juiceRef.current?.popup('💨 RIVAL SMOKE DODGE!', 'Rival dodged gunfire with smoke!', '#C77DFF');
                  return;
                }

                riv.isAlive = false;
                juiceRef.current?.burst(riv.x, rivY - 12, '#FF0055', 20);
                if (riv.hasDiamond) {
                  riv.hasDiamond = false;
                  levelConfig.diamond.floor = riv.floor;
                  levelConfig.diamond.x = Math.max(40, Math.min(arenaW - 40, riv.x));
                  diamondTakenRef.current = false;
                  setDiamondTaken(false);
                  juiceRef.current?.popup('💥 GUARD SHOT RIVAL THIEF!', 'Diamond dropped on catwalk!', '#FF0055');
                }
              }
            });

            if (!hitRival) activeBullets.push(b);
          }
        }
      });
      bulletsRef.current = activeBullets;
      setBullets(activeBullets);

      // --- 7. Update Thrown Bombs ---
      const nextBombs = [];
      thrownBombsRef.current.forEach((bm) => {
        if (!bm.active) return;
        bm.x += bm.vx;
        bm.y += bm.vy;
        bm.vy += 0.25; // gravity
        bm.life -= 1;

        // Bomb detonates on timeout or ground contact
        const groundY = getFloorY(bm.floor);
        if (bm.life <= 0 || bm.y >= groundY - 4) {
          bm.active = false;
          playSliceSound();
          triggerPerfectHaptic();
          juiceRef.current?.shake(14, 14);
          juiceRef.current?.burst(bm.x, groundY - 14, '#FF0055', 28);

          // Detonation blasts all guards in 70px radius
          curGuards.forEach((g) => {
            if (g.isDefeated || g.floor !== bm.floor) return;
            if (Math.abs(g.x - bm.x) < 70) {
              g.hp -= 2; // Bombs deal 2 damage!
              if (g.hp <= 0) {
                g.isDefeated = true;
                if (g.hasKey) {
                  g.hasKey = false;
                  const newDropped = [...droppedKeysRef.current, { id: Date.now() + Math.random(), floor: g.floor, x: g.x }];
                  droppedKeysRef.current = newDropped;
                  setDroppedKeys(newDropped);
                  triggerPerfectHaptic();
                  playSnapTickSound();
                  juiceRef.current?.popup('KEY DROPPED!', 'Guard dropped the vault key!', '#FFE600');
                }
                juiceRef.current?.popup(g.isBoss ? '👑 BOSS DESTROYED BY BOMB!' : '💣 GUARD KNOCKED OUT!', '+500 PTS', COLORS.matrixMint);
                setScore((s) => s + (g.isBoss ? 2000 : 500));
              } else {
                juiceRef.current?.popup('💣 BOSS BLASTED!', `HP: ${g.hp}/${g.maxHp}`, '#FFE600');
              }
            }
          });

          // Bomb sound triggers 5s police emergency!
          triggerPoliceEmergency('EXPLOSION REPORTED!');
        } else {
          nextBombs.push(bm);
        }
      });
      thrownBombsRef.current = nextBombs;
      setThrownBombs(nextBombs);

      // --- 8. Update Thrown Distractor Stones ---
      const nextStones = [];
      thrownStonesRef.current.forEach((st) => {
        if (!st.active) return;
        st.x += st.vx;
        st.y += st.vy;
        st.vy += 0.24;
        st.life -= 1;

        let hitFloor = null;
        for (let f = 0; f < levelConfig.floorsCount; f++) {
          const fy = getFloorY(f);
          if (st.vy > 0 && st.y >= fy - 6 && st.y <= fy + 14 && st.x >= 20 && st.x <= arenaW - 20) {
            hitFloor = f;
            st.y = fy - 2;
            break;
          }
        }
        if (st.y >= getFloorY(0)) {
          hitFloor = 0;
          st.y = getFloorY(0);
        }

        if (hitFloor !== null && st.life > 0) {
          playSnapTickSound();
          triggerLightHaptic();
          juiceRef.current?.burst(st.x, st.y, '#FFE600', 14);

          curGuards.forEach((g) => {
            if (g.floor === hitFloor && !g.isDefeated) {
              const dist = Math.abs(g.x - st.x);
              if (dist < 190) {
                g.isInvestigating = true;
                g.investigateTargetX = Math.max(g.minX, Math.min(g.maxX, st.x));
                g.investigateTimer = 115;
                g.alertTimer = 115;
                g.pauseTimer = 0;
                g.dir = g.investigateTargetX > g.x ? 1 : -1;
                g.investigateSpeed = Math.max(0.85, g.speed * 0.95);
              }
            }
          });
          st.active = false;
        } else if (st.life > 0 && st.x > 10 && st.x < arenaW - 10) {
          nextStones.push(st);
        }
      });
      thrownStonesRef.current = nextStones;
      setThrownStones(nextStones);

      // --- 9. Update Multiple Rival Thieves (Bot Player-like AI) ---
      curRivals.forEach((riv, rIdx) => {
        if (!riv.isAlive) return;
        if (riv.snatchCooldown > 0) riv.snatchCooldown -= 1;
        if (riv.hideTimer > 0) riv.hideTimer -= 1;
        if (riv.searchTimer > 0) riv.searchTimer -= 1;
        if (riv.smokeInvisTimer > 0) riv.smokeInvisTimer -= 1;
        if (riv.pebbleCooldown > 0) riv.pebbleCooldown -= 1;

        const curRivY = riv.isClimbing && riv.y != null ? riv.y : getFloorY(riv.floor);
        const curPlyY = curPlayer.isClimbing && curPlayer.y != null ? curPlayer.y : getFloorY(curPlayer.floor);

        // Universal Physical Touch Check between Rival and Player (only when neither is hiding)
        const touchDistX = Math.abs(riv.x - curPlayer.x);
        const touchDistY = Math.abs(curRivY - curPlyY);
        const isTouching = touchDistX < 24 && touchDistY < 22;

        if (isTouching && !curPlayer.isHiding && !riv.isHiding && !carStateRef.current.isEscaping && !carStateRef.current.thiefInside) {
          // 1. Rival touches player holding diamond -> STEAL & SNATCH!
          if (curPlayer.hasDiamond && !riv.hasDiamond && riv.snatchCooldown <= 0) {
            riv.hasDiamond = true;
            curPlayer.hasDiamond = false;
            curPlayer.diamondsHeld = Math.max(0, (curPlayer.diamondsHeld || 1) - 1);
            riv.snatchCooldown = 95;
            riv.isSearching = false;
            riv.searchTimer = 0;
            triggerMediumHaptic();
            playSliceSound();
            juiceRef.current?.burst(curPlayer.x, curPlyY, '#FF0055', 24);
            juiceRef.current?.popup('⚠️ RIVAL TOUCHED & SNATCHED DIAMOND!', 'Intercept him before he escapes!', '#FF0055');
          }
          // 2. Player touches rival holding diamond -> TACKLE & RECLAIM!
          else if (riv.hasDiamond && !curPlayer.hasDiamond && riv.snatchCooldown <= 0) {
            riv.hasDiamond = false;
            curPlayer.hasDiamond = true;
            curPlayer.diamondsHeld = (curPlayer.diamondsHeld || 0) + 1;
            riv.snatchCooldown = 95;
            triggerPerfectHaptic();
            playPerfectSound();
            juiceRef.current?.burst(riv.x, curRivY, '#00F5FF', 24);
            juiceRef.current?.popup('🥷 TACKLED RIVAL!', 'Diamond reclaimed from rival thief!', COLORS.matrixMint);
          }
          // 3. Rival touches player when neither has diamond -> steals item (pebble / bullet)
          else if (!riv.hasDiamond && !curPlayer.hasDiamond && riv.snatchCooldown <= 0) {
            if (stonesRef.current > 0 && Math.random() < 0.6) {
              setStones((s) => Math.max(0, s - 1));
              stonesRef.current = Math.max(0, stonesRef.current - 1);
              riv.snatchCooldown = 90;
              triggerMediumHaptic();
              playSliceSound();
              juiceRef.current?.popup('⚠️ RIVAL PICKPOCKETED YOU!', 'Stole 1 distractor pebble!', '#FF9900');
            } else if (ammoRef.current > 0) {
              setAmmo((a) => Math.max(0, a - 1));
              ammoRef.current = Math.max(0, ammoRef.current - 1);
              riv.snatchCooldown = 90;
              triggerMediumHaptic();
              playSliceSound();
              juiceRef.current?.popup('⚠️ RIVAL PICKPOCKETED YOU!', 'Stole 1 bullet from your bag!', '#FF9900');
            }
          }
        }

        // A. Ladder Climbing
        if (riv.isClimbing && riv.stairIdx != null) {
          const stair = levelConfig.stairs[riv.stairIdx];
          const yBottom = getFloorY(stair.fromFloor);
          const yTop = getFloorY(stair.toFloor);
          const climbSpeed = riv.hasDiamond ? 2.8 : 2.5;

          riv.x = stair.x;
          if (riv.y == null) riv.y = riv.climbDir === -1 ? yBottom - 4 : yTop + 4;
          riv.y += riv.climbDir * climbSpeed;

          if (riv.climbDir === -1 && riv.y <= yTop) {
            riv.y = null;
            riv.floor = stair.toFloor;
            riv.isClimbing = false;
            riv.stairIdx = null;
            riv.climbDir = 0;
          } else if (riv.climbDir === 1 && riv.y >= yBottom) {
            riv.y = null;
            riv.floor = stair.fromFloor;
            riv.isClimbing = false;
            riv.stairIdx = null;
            riv.climbDir = 0;
          }
        }
        // B. Bot Stealth: Hiding in Windows from Guards and CCTVs
        else {
          const windowList = getWindowListForWidth(arenaW);
          const validWindows = windowList.filter((wx) => !(riv.floor === 0 && Math.abs(wx - levelConfig.car.x) < 36));

          // If Bot Rival is already hidden inside a window
          if (riv.isHiding) {
            const winX = riv.hiddenWindowX != null ? riv.hiddenWindowX : riv.x;
            let dangerStillPresent = false;

            // Check if any guard on this floor is still near or facing the window
            for (const g of curGuards) {
              if (g.floor === riv.floor && !g.isDefeated) {
                const distToGuard = Math.abs(g.x - winX);
                const guardFacingWin = (g.dir === 1 && g.x < winX) || (g.dir === -1 && g.x > winX);
                const visionLen = g.hasGun ? SNIPER_VISION_LEN : FLASHLIGHT_LEN;
                if (distToGuard < 60 || (guardFacingWin && distToGuard < visionLen + 35)) {
                  dangerStillPresent = true;
                  break;
                }
              }
            }

            // Check if any CCTV on this floor is still sweeping across window
            if (!dangerStillPresent) {
              for (const cam of curCctvs) {
                if (cam.floor === riv.floor) {
                  const projectedX = cam.x + Math.tan((cam.angle * Math.PI) / 180) * 45;
                  if (Math.abs(winX - projectedX) < 42) {
                    dangerStillPresent = true;
                    break;
                  }
                }
              }
            }

            if (dangerStillPresent) {
              // Threat still active: stay safely tucked in window
              return;
            } else if (riv.hideTimer <= 0) {
              // Coast is clear! Step out of the window like a smart player
              riv.isHiding = false;
              riv.hiddenWindowX = null;
            } else {
              return;
            }
          }

          // If Bot Rival is walking on Catwalk Floor: Detect threats and evade into nearest window or ladder!
          if (!riv.isClimbing && !riv.isHiding) {
            let threatSpotted = false;

            for (const g of curGuards) {
              if (g.floor === riv.floor && !g.isDefeated) {
                const dist = Math.abs(g.x - riv.x);
                const facingRival = (g.dir === 1 && g.x < riv.x) || (g.dir === -1 && g.x > riv.x);
                const visionLen = g.hasGun ? SNIPER_VISION_LEN : FLASHLIGHT_LEN;
                if (dist < 60 || (facingRival && dist < visionLen + 40) || (g.isChasing && dist < 140)) {
                  threatSpotted = true;
                  break;
                }
              }
            }

            if (!threatSpotted) {
              for (const cam of curCctvs) {
                if (cam.floor === riv.floor) {
                  const projectedX = cam.x + Math.tan((cam.angle * Math.PI) / 180) * 45;
                  if (Math.abs(riv.x - projectedX) < 46) {
                    threatSpotted = true;
                    break;
                  }
                }
              }
            }

            // If threat spotted, evade to safe ladder or dive into nearest window!
            if (threatSpotted) {
              // 1. If ladder is reachable right here, climb to escape floor!
              const escapeLadders = levelConfig.stairs.filter(
                (s) => (s.fromFloor === riv.floor || s.toFloor === riv.floor) && Math.abs(riv.x - s.x) < 22
              );
              if (escapeLadders.length > 0) {
                const s = escapeLadders[0];
                const sIdx = levelConfig.stairs.indexOf(s);
                riv.isClimbing = true;
                riv.stairIdx = sIdx;
                riv.x = s.x;
                riv.climbDir = s.fromFloor === riv.floor ? -1 : 1;
                riv.y = getFloorY(riv.floor) + (riv.climbDir === -1 ? -4 : 4);
                return;
              }

              // 2. Dash to nearest window and hide
              if (validWindows.length > 0) {
                let closestWin = validWindows[0];
                let closestDist = Infinity;
                for (const wx of validWindows) {
                  const d = Math.abs(riv.x - wx);
                  if (d < closestDist) {
                    closestDist = d;
                    closestWin = wx;
                  }
                }

                if (closestDist <= 18) {
                  // Arrived at window: hide!
                  riv.isHiding = true;
                  riv.hiddenWindowX = closestWin;
                  riv.x = closestWin;
                  riv.hideTimer = 60;
                  return;
                } else {
                  // Sprint towards window at high speed (3.2) to evade!
                  riv.facing = riv.x < closestWin ? 1 : -1;
                  riv.x += riv.facing * 3.2;
                  return;
                }
              }
            }

            // Proactive Rival Distractor Pebble: If guard is approaching on same floor, toss distractor stone!
            if ((riv.pebbleCooldown || 0) <= 0) {
              const guardOnFloor = curGuards.find((g) => g.floor === riv.floor && !g.isDefeated && !g.isInvestigating);
              if (guardOnFloor) {
                const dist = Math.abs(guardOnFloor.x - riv.x);
                const guardFacingRiv = (guardOnFloor.dir === 1 && guardOnFloor.x < riv.x) || (guardOnFloor.dir === -1 && guardOnFloor.x > riv.x);
                if (dist < 130 && (guardFacingRiv || guardOnFloor.isChasing)) {
                  const noiseX = guardOnFloor.dir === 1 ? Math.max(25, guardOnFloor.x - 70) : Math.min(arenaW - 25, guardOnFloor.x + 70);
                  thrownStonesRef.current.push({
                    id: Math.random(),
                    x: riv.x,
                    y: curRivY - 14,
                    vx: (noiseX - riv.x) * 0.08,
                    vy: -2.8,
                    life: 50,
                    active: true,
                  });
                  riv.pebbleCooldown = 180;
                  juiceRef.current?.popup('🎯 RIVAL THREW DISTRACTOR!', 'Guard diverted by clever trick!', '#C77DFF');
                }
              }
            }
          }

          // C. Catwalk Navigation & Target Evaluation
          let targetFloor = 0;
          let targetX = 0;
          let isEscaping = false;

          const keyNeeded = levelConfig.diamondLockedInCase && !hasKeyRef.current && !riv.hasKey;
          const keyGuard = keyNeeded ? curGuards.find((g) => g.hasKey && !g.isDefeated) : null;

          if (riv.hasDiamond) {
            // Escapes down to ground floor exit
            targetFloor = 0;
            targetX = curPlayer.x > arenaW / 2 ? 15 : arenaW - 15;
            isEscaping = true;
          } else if (curPlayer.hasDiamond) {
            if (curPlayer.isHiding) {
              // PLAYER IS HIDDEN IN WINDOW: Rival loses sight and goes somewhere else to find player!
              if (!riv.isSearching || riv.searchTimer <= 0) {
                riv.isSearching = true;
                riv.searchTimer = 160;
                // Pick a different floor or opposite end of building to search
                const altFloors = [];
                for (let f = 0; f < levelConfig.floorsCount; f++) {
                  if (f !== curPlayer.floor) altFloors.push(f);
                }
                riv.searchFloor = altFloors.length > 0 ? altFloors[(rIdx + 1) % altFloors.length] : riv.floor;
                riv.searchTargetX = curPlayer.x < arenaW / 2 ? arenaW - 65 : 65;
              }
              targetFloor = riv.searchFloor != null ? riv.searchFloor : 0;
              targetX = riv.searchTargetX != null ? riv.searchTargetX : 80;
            } else {
              // Player in plain sight: rival spots player and chases!
              riv.isSearching = false;
              riv.searchTimer = 0;
              targetFloor = curPlayer.floor;
              targetX = curPlayer.x;
            }
          } else if (keyGuard) {
            // Vault locked: Target key guard to steal key!
            targetFloor = keyGuard.floor;
            targetX = keyGuard.x;
          } else {
            // Diamond uncollected
            targetFloor = levelConfig.diamond.floor;
            targetX = levelConfig.diamond.x;
          }

          if (riv.floor < targetFloor) {
            const upStairs = levelConfig.stairs
              .map((s, idx) => ({ ...s, idx }))
              .filter((s) => s.fromFloor === riv.floor);
            if (upStairs.length > 0) {
              let chosen = upStairs[0];
              let best = -Infinity;
              for (const s of upStairs) {
                const score = -(Math.abs(riv.x - s.x) * 0.7 + Math.abs(s.x - targetX) * 0.3);
                if (score > best) {
                  best = score;
                  chosen = s;
                }
              }

              if (Math.abs(riv.x - chosen.x) < 8) {
                riv.isClimbing = true;
                riv.stairIdx = chosen.idx;
                riv.climbDir = -1;
                riv.x = chosen.x;
                riv.y = getFloorY(chosen.fromFloor) - 4;
              } else {
                riv.facing = riv.x < chosen.x ? 1 : -1;
                riv.x += riv.facing * 2.4;
              }
            }
          } else if (riv.floor > targetFloor) {
            const downStairs = levelConfig.stairs
              .map((s, idx) => ({ ...s, idx }))
              .filter((s) => s.toFloor === riv.floor);
            if (downStairs.length > 0) {
              let chosen = downStairs[0];
              let best = -Infinity;
              for (const s of downStairs) {
                const score = Math.abs(curPlayer.x - s.x) * 0.8 - Math.abs(riv.x - s.x) * 0.4;
                if (score > best) {
                  best = score;
                  chosen = s;
                }
              }

              if (Math.abs(riv.x - chosen.x) < 8) {
                riv.isClimbing = true;
                riv.stairIdx = chosen.idx;
                riv.climbDir = 1;
                riv.x = chosen.x;
                riv.y = getFloorY(chosen.toFloor) + 4;
              } else {
                riv.facing = riv.x < chosen.x ? 1 : -1;
                riv.x += riv.facing * 2.4;
              }
            }
          } else {
            // Same floor
            if (isEscaping && riv.floor === 0) {
              riv.facing = riv.x < targetX ? 1 : -1;
              riv.x += riv.facing * 2.8;

              const reached = (targetX > arenaW / 2 && riv.x >= targetX - 5) || (targetX < arenaW / 2 && riv.x <= targetX + 5);
              if (reached) {
                // RIVAL ESCAPED WITH LOOT: Instant Game Over!
                riv.isAlive = false;
                triggerGameOverHaptic();
                playGameOverSound();
                juiceRef.current?.shake(14, 14);
                juiceRef.current?.flash(COLORS.danger);
                setIsGameOver(true);
                setLives(0);
                juiceRef.current?.popup('🚨 HEIST FAILED!', 'Rival thief looted diamond and escaped!', COLORS.danger);
                return;
              }
            } else if (curPlayer.hasDiamond && !curPlayer.isHiding) {
              // Run toward player to snatch!
              riv.facing = riv.x < curPlayer.x ? 1 : -1;
              riv.x += riv.facing * 2.5;
            } else if (riv.isSearching) {
              // Walking to search point away from player's window
              riv.facing = riv.x < targetX ? 1 : -1;
              riv.x += riv.facing * 1.8;
              if (Math.abs(riv.x - targetX) < 8) {
                // Reached search point, look around or change search target
                riv.searchTargetX = riv.x < arenaW / 2 ? arenaW - 65 : 65;
              }
            } else if (keyGuard && riv.floor === keyGuard.floor) {
              // Sneaking towards key guard to pickpocket keycard!
              const distToKeyG = Math.abs(riv.x - keyGuard.x);
              if (distToKeyG < 28) {
                if (keyGuard.isInvestigating || keyGuard.pauseTimer > 0) {
                  riv.keyStealTimer = (riv.keyStealTimer || 0) + 1;
                  if (riv.keyStealTimer >= 35) {
                    riv.hasKey = true;
                    keyGuard.hasKey = false;
                    playSliceSound();
                    triggerMediumHaptic();
                    juiceRef.current?.burst(riv.x, curRivY - 14, '#FFE600', 25);
                    juiceRef.current?.popup('🗝️ RIVAL STOLE VAULT KEY!', 'Rival pickpocketed key from guard!', '#FFE600');
                  }
                } else if ((riv.pebbleCooldown || 0) <= 0) {
                  // Distract key guard with stone trick
                  const tossDir = keyGuard.dir;
                  const tossX = Math.max(30, Math.min(arenaW - 30, keyGuard.x + tossDir * 60));
                  thrownStonesRef.current.push({
                    id: Math.random(),
                    x: riv.x,
                    y: curRivY - 14,
                    vx: (tossX - riv.x) * 0.08,
                    vy: -2.8,
                    life: 45,
                    active: true,
                  });
                  riv.pebbleCooldown = 150;
                  juiceRef.current?.popup('🎯 RIVAL DISTRACTED KEY GUARD!', 'Rival moving in for keycard!', '#C77DFF');
                } else {
                  riv.facing = riv.x < keyGuard.x ? 1 : -1;
                }
              } else {
                riv.facing = riv.x < keyGuard.x ? 1 : -1;
                riv.x += riv.facing * 2.3;
              }
            } else if (!riv.hasDiamond && !diamondTakenRef.current && riv.floor === levelConfig.diamond.floor) {
              const canLoot = !levelConfig.diamondLockedInCase || riv.hasKey || hasKeyRef.current;
              if (Math.abs(riv.x - levelConfig.diamond.x) < 14) {
                if (canLoot) {
                  if (levelConfig.diamondLockedInCase) {
                    levelConfig.diamondLockedInCase = false;
                  }
                  riv.hasDiamond = true;
                  diamondTakenRef.current = true;
                  setDiamondTaken(true);
                  playSliceSound();
                  triggerMediumHaptic();
                  juiceRef.current?.burst(riv.x, curRivY - 14, '#00F5FF', 25);
                  juiceRef.current?.popup('⚠️ RIVAL STOLE DIAMOND!', 'Intercept him before he escapes!', '#FF0055');
                }
              } else {
                riv.facing = riv.x < levelConfig.diamond.x ? 1 : -1;
                riv.x += riv.facing * 2.4;
              }
            }
          }
        }
      });

      // --- 10. Diamond & Item Pickups ---
      // A. Primary Diamond
      if (!curPlayer.hasDiamond && !diamondTakenRef.current && curPlayer.floor === levelConfig.diamond.floor && !curPlayer.isClimbing) {
        if (Math.abs(curPlayer.x - levelConfig.diamond.x) < 26) {
          // If locked in case, must have unlocked case first
          if (levelConfig.diamondLockedInCase && !hasKeyRef.current) {
            triggerLightHaptic();
            juiceRef.current?.popup('🔒 DIAMOND LOCKED IN CASE!', 'Steal key from guard with stone trick!', '#FF0055');
          } else {
            curPlayer.hasDiamond = true;
            curPlayer.diamondsHeld += 1;
            setDiamondTaken(true);
            diamondTakenRef.current = true;
            triggerPerfectHaptic();
            playPerfectSound();
            juiceRef.current?.burst(levelConfig.diamond.x, getFloorY(curPlayer.floor), '#00F5FF', 24);

            if (levelConfig.isMasterCrown) {
              // Master Crown triggers the 5-second escape countdown!
              triggerPoliceEmergency('ROYAL CROWN STOLEN!');
              juiceRef.current?.popup('👑 ROYAL CROWN SECURED!', 'RUN TO CAR BEFORE 5.0s POLICE LOCKDOWN!', '#FFE600');
            } else if (!levelConfig.requiresPetrol || curPlayer.hasPetrol) {
              juiceRef.current?.popup('💎 DIAMOND SECURED!', 'Escape to getaway car on Floor 0!', '#00F5FF');
            } else {
              juiceRef.current?.popup('💎 DIAMOND SECURED!', 'Need fuel before escaping!', '#FFE600');
            }
          }
        }
      }

      // B. Extra Diamond (Levels 71-80)
      if (levelConfig.extraDiamond && !extraDiamondTakenRef.current && curPlayer.floor === levelConfig.extraDiamond.floor && !curPlayer.isClimbing) {
        if (Math.abs(curPlayer.x - levelConfig.extraDiamond.x) < 26) {
          curPlayer.diamondsHeld += 1;
          setExtraDiamondTaken(true);
          extraDiamondTakenRef.current = true;
          triggerPerfectHaptic();
          playPerfectSound();
          juiceRef.current?.burst(levelConfig.extraDiamond.x, getFloorY(curPlayer.floor), '#00F5FF', 22);
          juiceRef.current?.popup('💎 SECOND DIAMOND SECURED!', 'Both diamonds acquired!', COLORS.matrixMint);
        }
      }

      // C. Fuel Canister (Levels 11-20)
      if (levelConfig.requiresPetrol && !curPlayer.hasPetrol && levelConfig.petrol && curPlayer.floor === levelConfig.petrol.floor && !curPlayer.isClimbing) {
        if (Math.abs(curPlayer.x - levelConfig.petrol.x) < 26) {
          curPlayer.hasPetrol = true;
          setPetrolTaken(true);
          petrolTakenRef.current = true;
          triggerSelectionHaptic();
          playTapSound();
          juiceRef.current?.burst(levelConfig.petrol.x, getFloorY(curPlayer.floor), '#FFE600', 18);
          juiceRef.current?.popup('⛽ FUEL TANK SECURED!', 'Car fueled! Head to Floor 0 to escape!', '#FFE600');
        }
      }

      // D. Gun Pickup
      if (levelConfig.gunPickup && !gunTaken && curPlayer.floor === levelConfig.gunPickup.floor && !curPlayer.isClimbing) {
        if (Math.abs(curPlayer.x - levelConfig.gunPickup.x) < 26) {
          setGunTaken(true);
          setAmmo((a) => a + levelConfig.gunPickup.ammo);
          ammoRef.current += levelConfig.gunPickup.ammo;
          triggerSelectionHaptic();
          playTapSound();
          juiceRef.current?.popup(`🔫 FOUND HANDGUN (+${levelConfig.gunPickup.ammo})!`, 'Tap SHOOT to eliminate guards', '#00F5FF');
        }
      }

      // E. Bomb Pickup
      if (levelConfig.bombPickup && !bombTaken && curPlayer.floor === levelConfig.bombPickup.floor && !curPlayer.isClimbing) {
        if (Math.abs(curPlayer.x - levelConfig.bombPickup.x) < 26) {
          setBombTaken(true);
          setBombs((b) => b + levelConfig.bombPickup.count);
          bombsRef.current += levelConfig.bombPickup.count;
          triggerSelectionHaptic();
          playTapSound();
          juiceRef.current?.popup(`💣 FOUND BOMBS (+${levelConfig.bombPickup.count})!`, 'Tap BOMB for area explosion', '#FF0055');
        }
      }

      // F. Distractor Stone Pickup
      if (levelConfig.stonePickup && !stonePickupTaken && curPlayer.floor === levelConfig.stonePickup.floor && !curPlayer.isClimbing) {
        if (Math.abs(curPlayer.x - levelConfig.stonePickup.x) < 24) {
          setStonePickupTaken(true);
          setStones((s) => {
            const next = s + 3;
            stonesRef.current = next;
            return next;
          });
          triggerSelectionHaptic();
          playTapSound();
          juiceRef.current?.popup('🪨 FOUND PEBBLES (+3)!', 'Restocked distractor stones', '#FFE600');
        }
      }

      // --- 11. Escape to Car on Ground Floor ---
      const isGround = curPlayer.floor === 0 || (curPlayer.y != null && curPlayer.y >= getFloorY(0) - 16);
      const isAtCar = Math.abs(curPlayer.x - carStateRef.current.x) <= 55;
      const hasReqDiamond = curPlayer.hasDiamond && (!levelConfig.extraDiamond || (curPlayer.diamondsHeld || 0) >= 2);
      const hasReqPetrol = !levelConfig.requiresPetrol || curPlayer.hasPetrol;

      if (isGround && isAtCar && !carStateRef.current.isEscaping) {
        if (hasReqDiamond && hasReqPetrol) {
          inputDirRef.current = 0;
          climbDirRef.current = 0;
          curPlayer.floor = 0;
          curPlayer.y = null;
          curPlayer.isClimbing = false;
          curPlayer.isHiding = false;

          carStateRef.current = {
            ...carStateRef.current,
            isEscaping: true,
            thiefInside: false,
            jumpPhase: 0.05,
            vx: 4.0,
            escapeDir: carStateRef.current.x < arenaW / 2 ? -1 : 1,
          };
          setCarState({ ...carStateRef.current });
          triggerPerfectHaptic();
          playPerfectSound();
          juiceRef.current?.popup('🚗 GETAWAY VEHICLE!', 'Speeding away with the loot!', COLORS.matrixMint);
        } else if (!hasReqDiamond) {
          if (!fuelWarningCooldownRef.current) {
            fuelWarningCooldownRef.current = true;
            setTimeout(() => {
              fuelWarningCooldownRef.current = false;
            }, 1800);
            triggerMediumHaptic();
            if (curRivals.some((r) => r.hasDiamond)) {
              juiceRef.current?.popup('⚠️ RIVAL HAS THE DIAMOND!', 'Tackle rival thief to reclaim loot!', '#FF0055');
            } else {
              juiceRef.current?.popup('💎 DIAMOND REQUIRED!', 'Retrieve diamond before escaping!', '#FF0055');
            }
          }
        } else if (!hasReqPetrol) {
          if (!fuelWarningCooldownRef.current) {
            fuelWarningCooldownRef.current = true;
            setTimeout(() => {
              fuelWarningCooldownRef.current = false;
            }, 1800);
            triggerMediumHaptic();
            juiceRef.current?.popup('⛽ CANNOT START CAR!', 'Must collect fuel canister first!', '#FF0055');
          }
        }
      }

      // --- 12. Car Escape Animation ---
      if (carStateRef.current.isEscaping) {
        const cState = { ...carStateRef.current };
        if (!cState.thiefInside) {
          cState.jumpPhase = Math.min(1, cState.jumpPhase + 0.08);
          if (cState.jumpPhase >= 1) {
            cState.jumpPhase = 1;
            cState.thiefInside = true;
            playTapSound();
            triggerMediumHaptic();
          }
        } else {
          cState.vx = Math.min(20, cState.vx + 0.9);
          cState.x += cState.escapeDir * cState.vx;

          if (cState.x < -100 || cState.x > arenaW + 100) {
            cState.isEscaping = false;
            setVictoryModal(true);

            const earned = 600 + level * 300;
            setScore((s) => {
              const nextScore = s + earned;
              if (nextScore > highScore) {
                setHighScore(nextScore);
                AsyncStorage.setItem(STORAGE_KEY, String(nextScore)).catch(() => {});
              }
              onScoreUpdate?.(nextScore);
              return nextScore;
            });

            juiceRef.current?.celebrate('🚗 GETAWAY SUCCESSFUL!', `Level ${level} Cleared! +${earned} PTS`, COLORS.matrixMint);
          }
        }
        carStateRef.current = cState;
        setCarState(cState);
      }

      // Commit State Updates
      playerRef.current = curPlayer;
      guardsRef.current = curGuards;
      rivalsRef.current = curRivals;
      cctvsRef.current = curCctvs;
      setPlayer(curPlayer);
      setGuards(curGuards);
      setRivals(curRivals);
      setCctvs(curCctvs);
    }, 20);

    return () => clearInterval(interval);
  }, [
    isPaused,
    isGameOver,
    victoryModal,
    levelConfig,
    arenaW,
    getFloorY,
    handlePlayerBusted,
    level,
    highScore,
    onScoreUpdate,
    triggerPoliceEmergency,
    gunTaken,
    bombTaken,
    stonePickupTaken,
  ]);

  // Window Hide Toggle
  const handleSneakPressIn = () => {
    if (playerRef.current.isClimbing) {
      triggerLightHaptic();
      juiceRef.current?.popup('CANNOT HIDE ON LADDER', 'Step onto a floor first', '#FF0055');
      return;
    }

    const nearWinX = getNearestWindowX(playerRef.current.x, windowList);
    if (nearWinX != null) {
      isSneakRef.current = true;
      setPlayer((p) => ({
        ...p,
        x: nearWinX,
        isHiding: true,
        hiddenWindowX: nearWinX,
      }));
      triggerSelectionHaptic();
      playSnapTickSound();
      juiceRef.current?.popup('🪟 HIDDEN IN WINDOW', 'Safe from flashlight & CCTV detection', '#94A3B8');
    } else {
      triggerLightHaptic();
      juiceRef.current?.popup('NO WINDOW NEARBY!', 'Move close to a window to hide', '#FF0055');
    }
  };

  const handleSneakPressOut = () => {
    isSneakRef.current = false;
    setPlayer((p) => ({
      ...p,
      isHiding: false,
      hiddenWindowX: null,
    }));
  };

  // Next Level Handler
  const handleNextLevel = useCallback(() => {
    const nextLvl = level + 1;
    if (nextLvl > CURATED_LEVELS.length) {
      juiceRef.current?.popup('🏆 MASTER OPERATIVE', 'All 100 Heists Completed!', COLORS.matrixMint);
      setLevel(100);
      saveCurrentLevel(100);
      initLevel(100);
    } else {
      setLevel(nextLvl);
      saveCurrentLevel(nextLvl);
      initLevel(nextLvl);
    }
  }, [level, initLevel, saveCurrentLevel]);

  // Retry Current Level Handler
  const handleRetryCurrentLevel = useCallback(() => {
    setLives(3);
    setIsGameOver(false);
    initLevel(level);
  }, [level, initLevel]);

  // New Game Handler
  const handleNewGame = useCallback(() => {
    setLives(3);
    setScore(0);
    setLevel(1);
    setIsGameOver(false);
    saveCurrentLevel(1);
    initLevel(1);
    juiceRef.current?.popup('NEW HEIST STARTED', 'Reset to Level 1', '#00F5FF');
  }, [initLevel, saveCurrentLevel]);

  const activePlayerY = player.isClimbing && player.y != null ? player.y : getFloorY(player.floor);
  const isNearWindow = !player.isClimbing && getNearestWindowX(player.x, windowList) != null;
  const theme = getBuildingTheme(level);
  const shape = getBuildingShape(level);

  return (
    <View style={styles.container}>
      <MiniGameHeader
        title="THIEF ESCAPE"
        floorLabel={`LVL ${level}`}
        category={theme.name}
        score={score}
        bestScore={highScore}
        accentColor={theme.accent}
        onBackToHub={onBackToHub}
        onReset={handleNewGame}
        disabled={isPaused}
      />

      <JuiceEngine ref={juiceRef}>
        {/* Police 10-Second Warning Banner */}
        {policeActive && (
          <View style={styles.policeBanner}>
            <Text style={styles.policeText}>
              {`🚨 POLICE CAR ARRIVING IN ${(policeTimer / 50).toFixed(1)}s! ESCAPE NOW!`}
            </Text>
          </View>
        )}

        {/* Police Squad On Scene Banner */}
        {policeSquad.active && !carState.isEscaping && (
          <View style={[styles.policeBanner, { backgroundColor: 'rgba(255, 0, 85, 0.92)' }]}>
            <Text style={styles.policeText}>
              🚨 POLICE ON SCENE! COP IS PURSUING YOU! RUN TO GETAWAY CAR!
            </Text>
          </View>
        )}

        {/* Subheader Status Strip */}
        <View style={styles.statusStrip}>
          <View style={styles.statusBox}>
            <Text style={styles.statusDim}>LIVES</Text>
            <Text style={[styles.statusVal, { color: '#FF0055' }]}>
              {Array.from({ length: lives }).map(() => '♥').join(' ') || '💀'}
            </Text>
          </View>

          <View style={styles.statusBox}>
            <Text style={styles.statusDim}>STAGE</Text>
            {/* --- [TEST_BUTTON_START] --- */}
            <Pressable
              style={styles.testStageBtn}
              onPress={() => setShowLevelPicker(true)}
            >
              <Text style={styles.testStageText}>{`L${level}: ${levelConfig.name}`}</Text>
              <View style={styles.testPill}>
                <Text style={styles.testPillText}>⚡ WARP</Text>
              </View>
            </Pressable>
            {/* --- [TEST_BUTTON_END] --- */}
          </View>

          {levelConfig.hasWeapons && (
            <View style={styles.statusBox}>
              <Text style={styles.statusDim}>ARSENAL</Text>
              <Text style={[styles.statusVal, { color: '#00F5FF' }]}>
                {`🔫${ammo} 💣${bombs}`}
              </Text>
            </View>
          )}

          {levelConfig.diamondLockedInCase && (
            <View style={styles.statusBox}>
              <Text style={styles.statusDim}>KEY</Text>
              <Text style={[styles.statusVal, { color: hasKey ? COLORS.matrixMint : keyStealProgress > 0 ? '#FFE600' : '#FF0055' }]}>
                {hasKey ? 'STOLEN 🗝️' : keyStealProgress > 0 ? `${Math.round(keyStealProgress)}%` : 'GUARD 🗝️'}
              </Text>
            </View>
          )}

          <View style={styles.statusBox}>
            <Text style={styles.statusDim}>STONES</Text>
            <Text style={[styles.statusVal, { color: stones > 0 ? '#FFE600' : 'rgba(255,255,255,0.4)' }]}>
              {`🪨 x${stones}`}
            </Text>
          </View>

          <View style={styles.statusBox}>
            <Text style={styles.statusDim}>FUEL</Text>
            <Text style={[styles.statusVal, { color: (!levelConfig.requiresPetrol || player.hasPetrol) ? COLORS.matrixMint : '#FF0055' }]}>
              {!levelConfig.requiresPetrol ? 'FULL ⛽' : player.hasPetrol ? 'READY ⛽' : 'EMPTY ⚠️'}
            </Text>
          </View>

          <View style={styles.statusBox}>
            <Text style={styles.statusDim}>DIAMOND</Text>
            <Text style={[styles.statusVal, { color: player.hasDiamond ? '#00F5FF' : 'rgba(255,255,255,0.4)' }]}>
              {player.hasDiamond ? 'CARRIED 💎' : 'IN VAULT'}
            </Text>
          </View>
        </View>

        {/* Building Heist Arena with dynamic viewBox so wide buildings fit cleanly (zooming out) */}
        <View style={styles.arenaWrapper}>
          <View style={styles.arenaCard}>
            <Svg
              width="100%"
              height="100%"
              viewBox={`0 ${-ROOF_PAD} ${arenaW} ${ARENA_H + ROOF_PAD}`}
              preserveAspectRatio="xMidYMid meet"
              style={StyleSheet.absoluteFill}
            >
              <Defs>
                <SvgLinearGradient id="buildingGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor={theme.bgGradTop} />
                  <Stop offset="55%" stopColor={theme.bgGradMid} />
                  <Stop offset="100%" stopColor={theme.bgGradBottom} />
                </SvgLinearGradient>

                <SvgLinearGradient id="beamGradRight" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0%" stopColor="#FFE600" stopOpacity="0.45" />
                  <Stop offset="100%" stopColor="#FFE600" stopOpacity="0.0" />
                </SvgLinearGradient>

                <SvgLinearGradient id="beamGradLeft" x1="1" y1="0" x2="0" y2="0">
                  <Stop offset="0%" stopColor="#FFE600" stopOpacity="0.45" />
                  <Stop offset="100%" stopColor="#FFE600" stopOpacity="0.0" />
                </SvgLinearGradient>

                <SvgLinearGradient id="sniperBeamRight" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0%" stopColor="#FF0055" stopOpacity="0.65" />
                  <Stop offset="100%" stopColor="#FF0055" stopOpacity="0.0" />
                </SvgLinearGradient>

                <SvgLinearGradient id="sniperBeamLeft" x1="1" y1="0" x2="0" y2="0">
                  <Stop offset="0%" stopColor="#FF0055" stopOpacity="0.65" />
                  <Stop offset="100%" stopColor="#FF0055" stopOpacity="0.0" />
                </SvgLinearGradient>

                <SvgRadialGradient id="vaultGlow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor={theme.accent} stopOpacity="0.8" />
                  <Stop offset="100%" stopColor={theme.accent} stopOpacity="0.0" />
                </SvgRadialGradient>
              </Defs>

              {/* Building Facade Background (silhouette changes every 10 levels) */}
              {shape === 'FLAT' ? (
                <Rect
                  x={10}
                  y={15}
                  width={arenaW - 20}
                  height={ARENA_H - 45}
                  rx={12}
                  fill="url(#buildingGrad)"
                  stroke={theme.borderColor}
                  strokeWidth={theme.borderWidth}
                />
              ) : (
                <Polygon
                  points={buildFacadePoints(shape, arenaW, ARENA_H)}
                  fill="url(#buildingGrad)"
                  stroke={theme.borderColor}
                  strokeWidth={theme.borderWidth}
                  strokeLinejoin="round"
                />
              )}

              {/* Roof decorations */}
              {shape === 'SPIRE' && (
                <G>
                  <Line x1={arenaW / 2} y1={-35} x2={arenaW / 2} y2={-ROOF_PAD + 6} stroke={theme.accent} strokeWidth={2} />
                  <Circle cx={arenaW / 2} cy={-ROOF_PAD + 6} r={3.5} fill={theme.accent} />
                </G>
              )}
              {shape === 'TWIN' && (
                <G>
                  <Line x1={arenaW * 0.18} y1={-19} x2={arenaW * 0.18} y2={-ROOF_PAD + 8} stroke={theme.accent} strokeWidth={2} />
                  <Line x1={arenaW * 0.82} y1={-19} x2={arenaW * 0.82} y2={-ROOF_PAD + 8} stroke={theme.accent} strokeWidth={2} />
                  <Line x1={arenaW * 0.36} y1={11} x2={arenaW * 0.64} y2={11} stroke={theme.accent} strokeWidth={2.5} strokeDasharray="5 4" />
                </G>
              )}
              {shape === 'TRIANGLE' && (
                <Line x1={arenaW / 2} y1={-31} x2={arenaW / 2} y2={15} stroke={theme.windowFrame} strokeWidth={1.5} />
              )}
              {shape === 'WIDE' && (
                <G>
                  <Rect x={arenaW * 0.2} y={-22} width={34} height={16} fill={theme.windowOuter} stroke={theme.windowFrame} strokeWidth={1.2} />
                  <Rect x={arenaW * 0.62} y={-18} width={44} height={12} fill={theme.windowOuter} stroke={theme.windowFrame} strokeWidth={1.2} />
                </G>
              )}

              {/* Architectural Windows across the building */}
              {Array.from({ length: levelConfig.floorsCount }).map((_, f) => {
                const fy = getFloorY(f);
                const winY = fy - 48;

                return (
                  <G key={`windows_${f}`}>
                    {windowList.map((wx) => {
                      if (f === 0 && Math.abs(wx - levelConfig.car.x) < 36) return null;

                      const isPlayerHiddenHere = player.isHiding && player.floor === f && player.hiddenWindowX === wx;
                      const isRivalHiddenHere = rivals.some((riv) => riv.isHiding && riv.floor === f && riv.hiddenWindowX === wx);
                      const isPlayerNearHere = !player.isHiding && !player.isClimbing && player.floor === f && Math.abs(player.x - wx) <= 22;

                      return (
                        <G key={`win_${f}_${wx}`}>
                          <Rect
                            x={wx - 13}
                            y={winY}
                            width={26}
                            height={38}
                            rx={4}
                            fill={isPlayerHiddenHere ? '#0F1322' : isRivalHiddenHere ? '#1A0A26' : theme.windowOuter}
                            stroke={isPlayerHiddenHere ? '#94A3B8' : isRivalHiddenHere ? '#9D4EDD' : isPlayerNearHere ? theme.accent : theme.windowFrame}
                            strokeWidth={isPlayerHiddenHere ? 2 : isRivalHiddenHere ? 2 : isPlayerNearHere ? 1.6 : 1.2}
                          />

                          {isPlayerNearHere && (
                            <Polygon
                              points={`${wx},${winY - 2} ${wx - 5},${winY - 8} ${wx + 5},${winY - 8}`}
                              fill={theme.accent}
                            />
                          )}

                          <Rect
                            x={wx - 10}
                            y={winY + 3}
                            width={20}
                            height={32}
                            rx={2}
                            fill={isPlayerHiddenHere ? '#1E2333' : theme.windowInner}
                          />

                          {isPlayerHiddenHere && (
                            <G>
                              <Rect x={wx - 6} y={fy - 25} width={12} height={22} rx={3} fill="#334155" stroke="#94A3B8" strokeWidth={1.5} />
                              <Circle cx={wx} cy={fy - 27} r={5} fill="#475569" stroke="#94A3B8" strokeWidth={1} />
                              <Line x1={wx - 3} y1={fy - 27} x2={wx + player.facing * 4} y2={fy - 27} stroke="#CBD5E1" strokeWidth={1.5} />
                              {player.hasDiamond && (
                                <Polygon points={`${wx},${fy - 34} ${wx + 4},${fy - 30} ${wx},${fy - 26} ${wx - 4},${fy - 30}`} fill="#475569" stroke="#94A3B8" strokeWidth={1} />
                              )}
                            </G>
                          )}

                          {isRivalHiddenHere && (
                            <G>
                              <Rect x={wx - 6} y={fy - 25} width={12} height={22} rx={3} fill="#2A0845" stroke="#9D4EDD" strokeWidth={1.5} />
                              <Circle cx={wx} cy={fy - 27} r={5} fill="#4A1270" stroke="#9D4EDD" strokeWidth={1} />
                            </G>
                          )}

                          <Line x1={wx} y1={winY + 3} x2={wx} y2={winY + 35} stroke={theme.windowFrame} strokeWidth={1} />
                          <Line x1={wx - 10} y1={winY + 19} x2={wx + 10} y2={winY + 19} stroke={theme.windowFrame} strokeWidth={1} />
                        </G>
                      );
                    })}
                  </G>
                );
              })}

              {/* Lights-off tier: building goes dark, only guard lights/beams stay visible */}
              {shape === 'BLACKOUT' && (
                <Polygon
                  points={buildFacadePoints('FLAT', arenaW, ARENA_H)}
                  fill="#000000"
                  fillOpacity={0.72}
                />
              )}

              {/* Destroyed tiers: blasted wall holes, cracks, collapsed floor sections & rubble */}
              {(shape === 'BROKEN' || shape === 'RUINED') &&
                Array.from({ length: levelConfig.floorsCount }).map((_, f) => {
                  const fy = getFloorY(f);
                  const span = Math.max(80, arenaW - 140);
                  const gaps = [0, 1, 2].map((k) => 70 + ((f * 97 + k * 181 + level * 13) % span));
                  return (
                    <G key={`damage_${f}`}>
                      {gaps.map((gx, k) => (
                        <G key={`dmg_${f}_${k}`}>
                          <Polygon
                            points={`${gx - 16},${fy + 2} ${gx - 6},${fy + 14} ${gx + 4},${fy + 6} ${gx + 16},${fy + 15} ${gx + 18},${fy + 2}`}
                            fill="#020308"
                            stroke={theme.windowFrame}
                            strokeWidth={1}
                          />
                          <Polygon
                            points={`${gx - 4},${fy + 15} ${gx},${fy + 24} ${gx + 5},${fy + 15}`}
                            fill={theme.catwalkRung}
                          />
                          {k === 0 && (
                            <Polygon
                              points={`${gx + 30},${fy - 52} ${gx + 44},${fy - 40} ${gx + 38},${fy - 26} ${gx + 50},${fy - 14} ${gx + 28},${fy - 18} ${gx + 22},${fy - 34}`}
                              fill="#020308"
                              stroke={theme.accent}
                              strokeOpacity={0.5}
                              strokeWidth={1}
                            />
                          )}
                        </G>
                      ))}
                      <Line x1={gaps[0] + 60} y1={fy - 46} x2={gaps[0] + 72} y2={fy - 20} stroke={theme.windowFrame} strokeWidth={1.2} />
                      <Line x1={gaps[0] + 72} y1={fy - 20} x2={gaps[0] + 64} y2={fy - 4} stroke={theme.windowFrame} strokeWidth={1.2} />
                    </G>
                  );
                })}

              {/* Fire Escape Metal Catwalks */}
              {Array.from({ length: levelConfig.floorsCount }).map((_, f) => {
                const fy = getFloorY(f);
                return (
                  <G key={`floor_${f}`}>
                    <Line x1={20} y1={fy} x2={arenaW - 20} y2={fy} stroke={theme.catwalkRail} strokeWidth={3} />
                    <Line x1={20} y1={fy - 12} x2={arenaW - 20} y2={fy - 12} stroke={theme.catwalkRung} strokeWidth={1.4} strokeDasharray="6 4" />
                  </G>
                );
              })}

              {/* Vertical Ladders */}
              {levelConfig.stairs.map((stair, idx) => {
                const y1 = getFloorY(stair.fromFloor);
                const y2 = getFloorY(stair.toFloor);
                const rungCount = Math.max(6, Math.floor(Math.abs(y1 - y2) / 12));
                return (
                  <G key={`stair_${idx}`}>
                    <Line x1={stair.x - 11} y1={y1} x2={stair.x - 11} y2={y2} stroke={theme.ladderRail} strokeWidth={2.2} />
                    <Line x1={stair.x + 11} y1={y1} x2={stair.x + 11} y2={y2} stroke={theme.ladderRail} strokeWidth={2.2} />
                    {Array.from({ length: rungCount }).map((__, stepIdx) => {
                      const stepY = y1 + ((y2 - y1) / rungCount) * stepIdx;
                      return (
                        <Line
                          key={`step_${stepIdx}`}
                          x1={stair.x - 11}
                          y1={stepY}
                          x2={stair.x + 11}
                          y2={stepY}
                          stroke={theme.ladderRung}
                          strokeWidth={1.8}
                          strokeOpacity={0.85}
                        />
                      );
                    })}
                  </G>
                );
              })}

              {/* CCTV Cameras & Cones */}
              {cctvs.map((cam, idx) => {
                const fy = getFloorY(cam.floor);
                const camY = fy - 46;
                const rad = (cam.angle * Math.PI) / 180;
                const endX1 = cam.x + Math.sin(rad - 0.35) * 55;
                const endY1 = camY + Math.cos(rad - 0.35) * 55;
                const endX2 = cam.x + Math.sin(rad + 0.35) * 55;
                const endY2 = camY + Math.cos(rad + 0.35) * 55;
                const isAlert = cam.alertCooldown > 0;

                return (
                  <G key={`cctv_${idx}`}>
                    <Polygon
                      points={`${cam.x},${camY} ${endX1},${endY1} ${endX2},${endY2}`}
                      fill={isAlert ? 'rgba(255, 0, 85, 0.45)' : 'rgba(255, 230, 0, 0.25)'}
                    />
                    <Rect x={cam.x - 6} y={camY - 4} width={12} height={8} rx={2} fill="#0F172A" stroke={isAlert ? '#FF0055' : '#FFE600'} strokeWidth={1.5} />
                    <Circle cx={cam.x} cy={camY + 2} r={3} fill={isAlert ? '#FF0055' : '#00F5FF'} />
                  </G>
                );
              })}

              {/* Ground Floor Getaway Car */}
              <G>
                {player.hasDiamond && (!levelConfig.requiresPetrol || player.hasPetrol) && !carState.isEscaping && (
                  <G>
                    <Rect
                      x={carState.x - 44}
                      y={getFloorY(0) - 44}
                      width={88}
                      height={18}
                      rx={6}
                      fill="rgba(0, 245, 212, 0.25)"
                      stroke={COLORS.matrixMint}
                      strokeWidth={1.5}
                    />
                    <SvgText
                      x={carState.x}
                      y={getFloorY(0) - 31}
                      fontSize={8}
                      fontWeight="bold"
                      fill={COLORS.matrixMint}
                      textAnchor="middle"
                    >
                      ESCAPE HERE
                    </SvgText>
                  </G>
                )}

                {/* Car Chassis */}
                <Rect x={carState.x - 28} y={getFloorY(0) - 18} width={56} height={16} rx={5} fill="#141829" stroke={player.hasDiamond && (!levelConfig.requiresPetrol || player.hasPetrol) ? COLORS.matrixMint : '#FF0055'} strokeWidth={1.8} />
                <Circle cx={carState.x - 18} cy={getFloorY(0) - 2} r={5} fill="#05060C" stroke={COLORS.matrixMint} strokeWidth={1} />
                <Circle cx={carState.x + 18} cy={getFloorY(0) - 2} r={5} fill="#05060C" stroke={COLORS.matrixMint} strokeWidth={1} />
                <Polygon
                  points={
                    carState.escapeDir === -1
                      ? `${carState.x + 12},${getFloorY(0) - 18} ${carState.x - 8},${getFloorY(0) - 18} ${carState.x - 16},${getFloorY(0) - 8} ${carState.x + 18},${getFloorY(0) - 8}`
                      : `${carState.x - 12},${getFloorY(0) - 18} ${carState.x + 8},${getFloorY(0) - 18} ${carState.x + 16},${getFloorY(0) - 8} ${carState.x - 18},${getFloorY(0) - 8}`
                  }
                  fill={carState.thiefInside ? '#00F5FF88' : '#00F5FF44'}
                />
              </G>

              {/* Police Cruiser Car on Floor 0 */}
              {policeSquad.active && (
                <G>
                  <Rect
                    x={policeSquad.carX - 28}
                    y={getFloorY(0) - 18}
                    width={56}
                    height={16}
                    rx={4}
                    fill="#0B132B"
                    stroke="#3A86FF"
                    strokeWidth={1.8}
                  />
                  <Rect
                    x={policeSquad.carX - 12}
                    y={getFloorY(0) - 16}
                    width={24}
                    height={12}
                    fill="#FFFFFF"
                    rx={2}
                  />
                  <SvgText
                    x={policeSquad.carX}
                    y={getFloorY(0) - 7}
                    fontSize={6}
                    fontWeight="900"
                    fill="#0B132B"
                    textAnchor="middle"
                  >
                    POLICE
                  </SvgText>
                  <Circle cx={policeSquad.carX - 18} cy={getFloorY(0) - 2} r={5} fill="#05060C" stroke="#718096" strokeWidth={1} />
                  <Circle cx={policeSquad.carX + 18} cy={getFloorY(0) - 2} r={5} fill="#05060C" stroke="#718096" strokeWidth={1} />
                  {/* Flashing Police Siren Lightbar on Roof */}
                  <Rect
                    x={policeSquad.carX - 8}
                    y={getFloorY(0) - 23}
                    width={16}
                    height={5}
                    rx={2}
                    fill="#1A202C"
                  />
                  <Circle
                    cx={policeSquad.carX - 4}
                    cy={getFloorY(0) - 20.5}
                    r={3}
                    fill={policeSquad.sirenBlink ? '#FF0055' : '#880022'}
                  />
                  <Circle
                    cx={policeSquad.carX + 4}
                    cy={getFloorY(0) - 20.5}
                    r={3}
                    fill={!policeSquad.sirenBlink ? '#00F5FF' : '#004488'}
                  />
                </G>
              )}

              {/* Fuel Canister (Levels 11-20) */}
              {levelConfig.requiresPetrol && !petrolTaken && levelConfig.petrol && (
                <G>
                  <Rect
                    x={levelConfig.petrol.x - 8}
                    y={getFloorY(levelConfig.petrol.floor) - 18}
                    width={16}
                    height={16}
                    rx={3}
                    fill="#FFE600"
                    stroke="#FFFFFF"
                    strokeWidth={1.2}
                  />
                  <Circle cx={levelConfig.petrol.x} cy={getFloorY(levelConfig.petrol.floor) - 10} r={3} fill="#060914" />
                </G>
              )}

              {/* Gun Pickup Item */}
              {levelConfig.gunPickup && !gunTaken && (
                <G>
                  <Rect x={levelConfig.gunPickup.x - 9} y={getFloorY(levelConfig.gunPickup.floor) - 16} width={18} height={12} rx={3} fill="#0F172A" stroke="#00F5FF" strokeWidth={1.4} />
                  <SvgText x={levelConfig.gunPickup.x} y={getFloorY(levelConfig.gunPickup.floor) - 6} fontSize={8} fill="#00F5FF" fontWeight="bold" textAnchor="middle">
                    GUN
                  </SvgText>
                </G>
              )}

              {/* Bomb Pickup Item */}
              {levelConfig.bombPickup && !bombTaken && (
                <G>
                  <Circle cx={levelConfig.bombPickup.x} cy={getFloorY(levelConfig.bombPickup.floor) - 10} r={7} fill="#1E1220" stroke="#FF0055" strokeWidth={1.4} />
                  <Circle cx={levelConfig.bombPickup.x + 3} cy={getFloorY(levelConfig.bombPickup.floor) - 13} r={2} fill="#FFE600" />
                </G>
              )}

              {/* Distractor Stone Refill */}
              {levelConfig.stonePickup && !stonePickupTaken && (
                <G>
                  <Circle cx={levelConfig.stonePickup.x - 3} cy={getFloorY(levelConfig.stonePickup.floor) - 5} r={3} fill="#8892B0" stroke="#FFFFFF" strokeWidth={0.8} />
                  <Circle cx={levelConfig.stonePickup.x + 3} cy={getFloorY(levelConfig.stonePickup.floor) - 5} r={3.2} fill="#8892B0" stroke="#FFFFFF" strokeWidth={0.8} />
                </G>
              )}

              {/* Diamond (Locked in glass case on 81-98, Master Crown on 99-100, Vault Diamond otherwise) */}
              {!diamondTaken && (
                <G>
                  {levelConfig.diamondLockedInCase && (
                    <Rect
                      x={levelConfig.diamond.x - 14}
                      y={getFloorY(levelConfig.diamond.floor) - 28}
                      width={28}
                      height={26}
                      rx={3}
                      fill="rgba(0, 245, 255, 0.15)"
                      stroke={hasKey ? COLORS.matrixMint : '#FF0055'}
                      strokeWidth={1.5}
                    />
                  )}
                  <Circle cx={levelConfig.diamond.x} cy={getFloorY(levelConfig.diamond.floor) - 14} r={18} fill="url(#vaultGlow)" />
                  <Polygon
                    points={`${levelConfig.diamond.x},${getFloorY(levelConfig.diamond.floor) - 24} ${levelConfig.diamond.x + 10},${getFloorY(levelConfig.diamond.floor) - 14} ${levelConfig.diamond.x},${getFloorY(levelConfig.diamond.floor) - 4} ${levelConfig.diamond.x - 10},${getFloorY(levelConfig.diamond.floor) - 14}`}
                    fill={levelConfig.isMasterCrown ? '#FFE600' : '#00F5FF'}
                    stroke="#FFFFFF"
                    strokeWidth={1.5}
                  />
                  {levelConfig.isMasterCrown && (
                    <SvgText x={levelConfig.diamond.x} y={getFloorY(levelConfig.diamond.floor) - 30} fontSize={9} fill="#FFE600" fontWeight="bold" textAnchor="middle">
                      👑 CROWN
                    </SvgText>
                  )}
                </G>
              )}

              {/* Extra Diamond (Levels 71-80) */}
              {levelConfig.extraDiamond && !extraDiamondTaken && (
                <G>
                  <Circle cx={levelConfig.extraDiamond.x} cy={getFloorY(levelConfig.extraDiamond.floor) - 14} r={18} fill="url(#vaultGlow)" />
                  <Polygon
                    points={`${levelConfig.extraDiamond.x},${getFloorY(levelConfig.extraDiamond.floor) - 24} ${levelConfig.extraDiamond.x + 10},${getFloorY(levelConfig.extraDiamond.floor) - 14} ${levelConfig.extraDiamond.x},${getFloorY(levelConfig.extraDiamond.floor) - 4} ${levelConfig.extraDiamond.x - 10},${getFloorY(levelConfig.extraDiamond.floor) - 14}`}
                    fill="#00F5FF"
                    stroke="#FFFFFF"
                    strokeWidth={1.5}
                  />
                </G>
              )}

              {/* Dropped Vault Keys on Floor */}
              {droppedKeys.map((dk) => {
                const ky = getFloorY(dk.floor) - 10;
                return (
                  <G key={dk.id}>
                    <Circle cx={dk.x} cy={ky} r={9} fill="#FFE600" opacity={0.35} />
                    <Circle cx={dk.x} cy={ky} r={5} fill="#FFE600" stroke="#FFFFFF" strokeWidth={1.2} />
                    <Line x1={dk.x - 2} y1={ky} x2={dk.x + 8} y2={ky} stroke="#FFE600" strokeWidth={2.4} />
                    <Line x1={dk.x + 4} y1={ky} x2={dk.x + 4} y2={ky + 4} stroke="#FFE600" strokeWidth={1.8} />
                    <Line x1={dk.x + 7} y1={ky} x2={dk.x + 7} y2={ky + 3} stroke="#FFE600" strokeWidth={1.8} />
                    <SvgText x={dk.x} y={ky - 10} fontSize={8} fill="#FFE600" fontWeight="bold" textAnchor="middle">
                      KEY 🗝️
                    </SvgText>
                  </G>
                );
              })}

              {/* Patrolling Security Guards, Armed Snipers & Bosses */}
              {guards.map((g) => {
                if (g.isDefeated) return null;
                const gy = getFloorY(g.floor);
                const isAlerted = g.alertTimer > 0;
                const visLen = g.hasGun ? SNIPER_VISION_LEN : FLASHLIGHT_LEN;
                const beamRight = g.hasGun ? 'url(#sniperBeamRight)' : 'url(#beamGradRight)';
                const beamLeft = g.hasGun ? 'url(#sniperBeamLeft)' : 'url(#beamGradLeft)';

                return (
                  <G key={g.id}>
                    {/* Flashlight / Wide Laser Beam */}
                    {g.hasGun ? (
                      g.dir === 1 ? (
                        <Polygon
                          points={`${g.x + 8},${gy - 18} ${g.x + visLen},${gy - 18 - 48} ${g.x + visLen},${gy - 18 + 48}`}
                          fill={beamRight}
                        />
                      ) : (
                        <Polygon
                          points={`${g.x - 8},${gy - 18} ${g.x - visLen},${gy - 18 - 48} ${g.x - visLen},${gy - 18 + 48}`}
                          fill={beamLeft}
                        />
                      )
                    ) : (
                      g.dir === 1 ? (
                        <Polygon
                          points={`${g.x + 8},${gy - 18} ${g.x + visLen},${gy - 32} ${g.x + visLen},${gy - 2}`}
                          fill={beamRight}
                        />
                      ) : (
                        <Polygon
                          points={`${g.x - 8},${gy - 18} ${g.x - visLen},${gy - 32} ${g.x - visLen},${gy - 2}`}
                          fill={beamLeft}
                        />
                      )
                    )}

                    {/* Question Mark Bubble when investigating stone */}
                    {g.isInvestigating && (
                      <G>
                        <Circle cx={g.x} cy={gy - 38} r={8} fill="#FF9900" stroke="#FFFFFF" strokeWidth={1.5} />
                        <Line x1={g.x} y1={gy - 42} x2={g.x} y2={gy - 38} stroke="#05060E" strokeWidth={2.2} />
                        <Circle cx={g.x} cy={gy - 34} r={1.2} fill="#05060E" />
                      </G>
                    )}

                    {/* Key Icon above Key-holding Guard */}
                    {g.hasKey && (
                      <G>
                        <Circle cx={g.x} cy={gy - 36} r={7} fill="#FFE600" />
                        <SvgText x={g.x} y={gy - 33} fontSize={7} fill="#05060E" fontWeight="bold" textAnchor="middle">
                          🗝️
                        </SvgText>
                      </G>
                    )}

                    {/* Key Stealing Progress Bar over Key Guard */}
                    {g.hasKey && keyStealProgress > 0 && (
                      <G>
                        <Rect x={g.x - 16} y={gy - 48} width={32} height={5} rx={2} fill="#1E293B" stroke="#FFE600" strokeWidth={1} />
                        <Rect x={g.x - 15} y={gy - 47} width={(keyStealProgress / 100) * 30} height={3} rx={1} fill="#FFE600" />
                      </G>
                    )}

                    {/* Boss Health Bar */}
                    {g.isBoss && (
                      <G>
                        <Rect x={g.x - 18} y={gy - 46} width={36} height={6} rx={2} fill="#0A0E24" stroke="#FF0055" strokeWidth={1} />
                        <Rect x={g.x - 17} y={gy - 45} width={(g.hp / g.maxHp) * 34} height={4} rx={1} fill="#FF0055" />
                      </G>
                    )}

                    {/* Guard Body: Big for Bosses, Armed Rifle for Snipers */}
                    {g.isBoss ? (
                      <G>
                        <Rect x={g.x - 10} y={gy - 34} width={20} height={32} rx={4} fill="#1A0D2E" stroke="#FF0055" strokeWidth={2} />
                        <Circle cx={g.x} cy={gy - 36} r={7} fill="#FF0055" />
                        <Line x1={g.x - 6} y1={gy - 20} x2={g.x + g.dir * 16} y2={gy - 20} stroke="#FFE600" strokeWidth={3} />
                      </G>
                    ) : (
                      <G>
                        <Rect x={g.x - 6} y={gy - 26} width={12} height={24} rx={3} fill="#0A0E24" stroke={g.hasGun ? '#FF0055' : isAlerted ? '#FF9900' : '#FFE600'} strokeWidth={1.4} />
                        <Circle cx={g.x} cy={gy - 28} r={5} fill="#0A0E24" />
                        <Line x1={g.x - 4} y1={gy - 28} x2={g.x + g.dir * 6} y2={gy - 28} stroke={g.hasGun ? '#FF0055' : isAlerted ? '#FF9900' : '#FFE600'} strokeWidth={2} />
                        {g.hasGun && (
                          <Line x1={g.x} y1={gy - 18} x2={g.x + g.dir * 12} y2={gy - 18} stroke="#FF0055" strokeWidth={2.2} />
                        )}
                      </G>
                    )}
                  </G>
                );
              })}

              {/* Bullets in Flight */}
              {bullets.map((b) => (
                <Line
                  key={b.id}
                  x1={b.x - b.vx * 1.5}
                  y1={b.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={b.isPlayerBullet ? '#00F5FF' : '#FF0055'}
                  strokeWidth={2.5}
                />
              ))}

              {/* Thrown Bombs */}
              {thrownBombs.map((bm) => (
                <Circle key={bm.id} cx={bm.x} cy={bm.y} r={4.5} fill="#FF0055" stroke="#FFFFFF" strokeWidth={1} />
              ))}

              {/* Thrown Stones */}
              {thrownStones.map((st) => (
                <Circle key={st.id} cx={st.x} cy={st.y} r={3.5} fill="#FFE600" stroke="#FFFFFF" strokeWidth={1} />
              ))}

              {/* Multiple Rival Thieves */}
              {rivals.map((riv) => {
                if (!riv.isAlive || riv.isHiding) return null;
                const rY = riv.isClimbing && riv.y != null ? riv.y : getFloorY(riv.floor);
                const isSmoked = (riv.smokeInvisTimer || 0) > 0;
                return (
                  <G key={riv.id}>
                    {/* Smoke Cloak Aura */}
                    {isSmoked && (
                      <G opacity={0.85}>
                        <Circle cx={riv.x} cy={rY - 14} r={17} fill="rgba(157, 78, 221, 0.45)" stroke="#C77DFF" strokeWidth={1.5} strokeDasharray="3 3" />
                        <SvgText x={riv.x} y={rY - 32} fontSize={10} textAnchor="middle">
                          💨
                        </SvgText>
                      </G>
                    )}
                    {riv.isSearching && (
                      <G>
                        <Circle cx={riv.x} cy={rY - 36} r={7} fill="#9D4EDD" stroke="#FFFFFF" strokeWidth={1} />
                        <SvgText x={riv.x} y={rY - 33} fontSize={8.5} fill="#FFFFFF" fontWeight="bold" textAnchor="middle">
                          ?
                        </SvgText>
                      </G>
                    )}
                    {/* Rival Body */}
                    <Rect
                      x={riv.x - 6}
                      y={rY - 24}
                      width={12}
                      height={22}
                      rx={3}
                      fill={isSmoked ? 'rgba(42, 8, 69, 0.45)' : '#2A0845'}
                      stroke="#9D4EDD"
                      strokeWidth={1.4}
                    />
                    <Circle cx={riv.x} cy={rY - 26} r={5} fill={isSmoked ? 'rgba(157, 78, 221, 0.5)' : '#9D4EDD'} />
                    {/* Smoke Bombs on Belt */}
                    {(riv.smokeBombs || 0) > 0 && (
                      <G>
                        {[...Array(riv.smokeBombs)].map((_, sIdx) => (
                          <Circle
                            key={sIdx}
                            cx={riv.x - 3 + sIdx * 6}
                            cy={rY - 12}
                            r={2}
                            fill="#C77DFF"
                            stroke="#2A0845"
                            strokeWidth={0.5}
                          />
                        ))}
                      </G>
                    )}
                    {/* Stolen Key Badge */}
                    {riv.hasKey && (
                      <SvgText x={riv.x + 8} y={rY - 20} fontSize={10} textAnchor="middle">
                        🗝️
                      </SvgText>
                    )}
                    {riv.hasDiamond && <Circle cx={riv.x} cy={rY - 34} r={4} fill="#00F5FF" stroke="#FFFFFF" strokeWidth={1} />}
                  </G>
                );
              })}

              {/* Pursuing Police Officer */}
              {policeSquad.officer.active && (
                <G
                  transform={`translate(${policeSquad.officer.x}, ${
                    policeSquad.officer.isClimbing && policeSquad.officer.y != null
                      ? policeSquad.officer.y
                      : getFloorY(policeSquad.officer.floor)
                  })`}
                >
                  <SvgText
                    x={0}
                    y={-34}
                    fontSize={8}
                    fontWeight="bold"
                    fill="#FF0055"
                    textAnchor="middle"
                  >
                    🚨 COP
                  </SvgText>
                  {/* Police Cap */}
                  <Polygon points="-7,-28 7,-28 5,-33 -5,-33" fill="#0A1128" stroke="#FFE600" strokeWidth={0.8} />
                  {/* Head */}
                  <Circle cx={0} cy={-24} r={5} fill="#FFD166" />
                  {/* Body */}
                  <Rect x={-6} y={-19} width={12} height={18} rx={2} fill="#1D3557" stroke="#3A86FF" strokeWidth={1} />
                  {/* Gold Badge */}
                  <Circle cx={-2} cy={-14} r={1.5} fill="#FFE600" />
                  {/* Legs */}
                  <Line x1={-3} y1={-1} x2={-3 + (policeSquad.officer.facing * 3)} y2={6} stroke="#0B132B" strokeWidth={2.4} strokeLinecap="round" />
                  <Line x1={3} y1={-1} x2={3 - (policeSquad.officer.facing * 3)} y2={6} stroke="#0B132B" strokeWidth={2.4} strokeLinecap="round" />
                </G>
              )}
              {!player.isHiding && !carState.thiefInside && (() => {
                const curThiefX = carState.isEscaping ? player.x + (carState.x - player.x) * carState.jumpPhase : player.x;
                const curThiefY = carState.isEscaping ? activePlayerY - Math.sin(carState.jumpPhase * Math.PI) * 22 : activePlayerY;

                return player.isClimbing ? (
                  <G>
                    <Line x1={curThiefX - 11} y1={curThiefY - 18} x2={curThiefX - 5} y2={curThiefY - 14} stroke="#00F5FF" strokeWidth={2.2} />
                    <Line x1={curThiefX + 5} y1={curThiefY - 14} x2={curThiefX + 11} y2={curThiefY - 18} stroke="#00F5FF" strokeWidth={2.2} />
                    <Rect x={curThiefX - 6} y={curThiefY - 24} width={12} height={20} rx={3} fill="#080C1E" stroke="#00F5FF" strokeWidth={1.8} />
                    <Circle cx={curThiefX} cy={curThiefY - 26} r={5} fill="#00F5FF" />
                    {player.hasDiamond && (
                      <Polygon points={`${curThiefX},${curThiefY - 33} ${curThiefX + 5},${curThiefY - 28} ${curThiefX},${curThiefY - 23} ${curThiefX - 5},${curThiefY - 28}`} fill="#00F5FF" stroke="#FFFFFF" strokeWidth={1.2} />
                    )}
                  </G>
                ) : (
                  <G>
                    <Rect x={curThiefX - 7} y={curThiefY - 26} width={14} height={24} rx={3} fill="#080C1E" stroke="#00F5FF" strokeWidth={1.8} />
                    <Circle cx={curThiefX} cy={curThiefY - 28} r={5} fill="#00F5FF" />
                    <Line x1={curThiefX - 4} y1={curThiefY - 28} x2={curThiefX + player.facing * 5} y2={curThiefY - 28} stroke="#FFFFFF" strokeWidth={2} />
                    {player.hasDiamond && <Circle cx={curThiefX} cy={curThiefY - 36} r={5} fill="#00F5FF" stroke="#FFFFFF" strokeWidth={1.5} />}
                  </G>
                );
              })()}
            </Svg>
          </View>
        </View>

        {/* Tactical Control Console: Big, Ergonomic Dual-Thumb Layout */}
        <View style={styles.controlsRow}>
          {/* Movement Cluster (Left Thumb) */}
          <View style={styles.dirCluster}>
            {/* Top Row: Ladder Climbing (UP / DOWN) */}
            <View style={styles.dirRow}>
              <Pressable
                style={({ pressed }) => [styles.climbBtn, pressed && styles.climbBtnPressed]}
                onPressIn={() => (climbDirRef.current = -1)}
                onPressOut={() => (climbDirRef.current = 0)}
              >
                <Text style={styles.climbIcon}>▲</Text>
                <Text style={styles.climbSub}>UP</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.climbBtn, pressed && styles.climbBtnPressed]}
                onPressIn={() => (climbDirRef.current = 1)}
                onPressOut={() => (climbDirRef.current = 0)}
              >
                <Text style={styles.climbIcon}>▼</Text>
                <Text style={styles.climbSub}>DN</Text>
              </Pressable>
            </View>

            {/* Bottom Row: Catwalk Walking (LEFT / RIGHT) */}
            <View style={styles.dirRow}>
              <Pressable
                style={({ pressed }) => [styles.ctrlBtn, pressed && styles.ctrlBtnPressed]}
                onPressIn={() => (inputDirRef.current = -1)}
                onPressOut={() => (inputDirRef.current = 0)}
              >
                <Text style={styles.ctrlIcon}>◀</Text>
                <Text style={styles.ctrlSub}>LEFT</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.ctrlBtn, pressed && styles.ctrlBtnPressed]}
                onPressIn={() => (inputDirRef.current = 1)}
                onPressOut={() => (inputDirRef.current = 0)}
              >
                <Text style={styles.ctrlSub}>RIGHT</Text>
                <Text style={styles.ctrlIcon}>▶</Text>
              </Pressable>
            </View>
          </View>

          {/* Action Cluster (Right Thumb) */}
          <View style={styles.actionCluster}>
            {/* Top Row: Window Hide Button (Large, prominent & high contrast) */}
            <Pressable
              style={({ pressed }) => [
                styles.sneakBtn,
                isNearWindow && styles.sneakBtnAvailable,
                player.isHiding && styles.sneakBtnActive,
                !isNearWindow && !player.isHiding && styles.sneakBtnDimmed,
                pressed && styles.sneakBtnPressed,
              ]}
              onPressIn={handleSneakPressIn}
              onPressOut={handleSneakPressOut}
            >
              <Text style={styles.sneakIcon}>🪟</Text>
              <Text style={[styles.sneakText, player.isHiding && { color: '#94A3B8' }]}>
                {player.isHiding ? 'INSIDE WINDOW' : isNearWindow ? 'HIDE IN WINDOW' : 'FIND WINDOW'}
              </Text>
            </Pressable>

            {/* Bottom Row: Tactical Weapons & Distractor Stones */}
            <View style={styles.actionSubRow}>
              {levelConfig.hasWeapons ? (
                <>
                  {/* Shoot Gun */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.smallActionBtn,
                      styles.gunBtn,
                      pressed && styles.gunBtnPressed,
                      ammo <= 0 && styles.btnDisabled,
                    ]}
                    onPress={handleShootGun}
                  >
                    <Text style={styles.actionIcon}>🔫</Text>
                    <Text style={styles.actionBadge}>{ammo}</Text>
                  </Pressable>

                  {/* Throw Bomb */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.smallActionBtn,
                      styles.bombBtn,
                      pressed && styles.bombBtnPressed,
                      bombs <= 0 && styles.btnDisabled,
                    ]}
                    onPress={handleThrowBomb}
                  >
                    <Text style={styles.actionIcon}>💣</Text>
                    <Text style={styles.actionBadge}>{bombs}</Text>
                  </Pressable>

                  {/* Distractor Stone */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.smallActionBtn,
                      styles.stoneBtn,
                      pressed && styles.stoneBtnPressed,
                      stones <= 0 && styles.btnDisabled,
                    ]}
                    onPress={handleThrowStone}
                  >
                    <Text style={styles.actionIcon}>🪨</Text>
                    <Text style={styles.stoneCount}>{stones}</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  style={({ pressed }) => [
                    styles.wideStoneBtn,
                    pressed && styles.stoneBtnPressed,
                    stones <= 0 && styles.btnDisabled,
                  ]}
                  onPress={handleThrowStone}
                >
                  <Text style={styles.wideStoneIcon}>🪨</Text>
                  <Text style={styles.wideStoneText}>
                    {stones > 0 ? `DISTRACT STONE (x${stones})` : 'NO STONES'}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </JuiceEngine>

      {/* Victory Modal */}
      <GameResultModal
        visible={victoryModal}
        type="VICTORY"
        title="HEIST COMPLETE!"
        subtitle={`Escaped successfully in the getaway vehicle! Level ${level} cleared.`}
        score={score}
        bestScore={highScore}
        accentColor="#00F5FF"
        buttonText="NEXT HEIST ▶"
        onNextLevel={handleNextLevel}
        onNext={handleNextLevel}
        onRetry={handleNextLevel}
        onBackToHub={onBackToHub}
      />

      {/* Game Over Modal */}
      <GameResultModal
        visible={isGameOver}
        type="GAME_OVER"
        title="HEIST COMPROMISED"
        subtitle={`Operative apprehended on Level ${level}.`}
        score={score}
        bestScore={highScore}
        accentColor="#FF0055"
        buttonText="RETRY LEVEL ▶"
        onRetry={handleRetryCurrentLevel}
        onRestart={handleRetryCurrentLevel}
        onNextLevel={handleRetryCurrentLevel}
        onNext={handleRetryCurrentLevel}
        onBackToHub={onBackToHub}
      />

      {/* --- [TEST_BUTTON_START] --- */}
      {/* Test Level Selector Modal: Scrollable list of 100 levels to test any level immediately */}
      <Modal
        visible={showLevelPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLevelPicker(false)}
      >
        <View style={styles.testModalOverlay}>
          <View style={styles.testModalCard}>
            <View style={styles.testModalHeader}>
              <View>
                <Text style={styles.testModalTitle}>⚡ WARP TO ANY LEVEL (1 - 100)</Text>
                <Text style={styles.testModalSub}>Tap any heist to test immediately</Text>
              </View>
              <Pressable
                style={styles.testCloseBtn}
                onPress={() => setShowLevelPicker(false)}
              >
                <Text style={styles.testCloseText}>✕ CLOSE</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.testScroll}
              contentContainerStyle={styles.testScrollContent}
              showsVerticalScrollIndicator
            >
              {CURATED_LEVELS.map((cfg, idx) => {
                const lvlNum = idx + 1;
                const isCurrent = lvlNum === level;
                const tierColor =
                  lvlNum <= 10
                    ? '#00F5FF'
                    : lvlNum <= 20
                    ? '#FFE600'
                    : lvlNum <= 35
                    ? '#9D4EDD'
                    : lvlNum <= 50
                    ? '#FF0055'
                    : lvlNum <= 70
                    ? '#FF9900'
                    : lvlNum <= 80
                    ? '#00F5D4'
                    : lvlNum <= 98
                    ? '#E0AAFF'
                    : '#FFE600';

                const tierTag =
                  cfg.isBossLevel
                    ? '👑 FINAL BOSS'
                    : cfg.diamondLockedInCase
                    ? '🗝️ PICKPOCKET KEY'
                    : cfg.diamondsCount === 2
                    ? '💎 2 DIAMONDS'
                    : cfg.hasWeapons
                    ? '🔫 WEAPONS & CCTV'
                    : cfg.rivalCount > 0
                    ? `🥷 ${cfg.rivalCount} RIVAL`
                    : cfg.requiresPetrol
                    ? '⛽ PETROL RUN'
                    : `👮 ${cfg.guards.length} GUARDS`;

                return (
                  <Pressable
                    key={`test_lvl_${lvlNum}`}
                    style={({ pressed }) => [
                      styles.testLvlRow,
                      isCurrent && styles.testLvlRowCurrent,
                      pressed && styles.testLvlRowPressed,
                    ]}
                    onPress={() => {
                      setLevel(lvlNum);
                      saveCurrentLevel(lvlNum);
                      initLevel(lvlNum);
                      setShowLevelPicker(false);
                      juiceRef.current?.popup(`WARPED TO LVL ${lvlNum}`, cfg.name, '#00F5FF');
                    }}
                  >
                    <View style={[styles.testBadge, { borderColor: tierColor }]}>
                      <Text style={[styles.testBadgeText, { color: tierColor }]}>
                        {`L${lvlNum}`}
                      </Text>
                    </View>

                    <View style={styles.testInfo}>
                      <Text style={[styles.testName, isCurrent && { color: '#00F5FF' }]}>
                        {cfg.name}
                      </Text>
                      <Text style={styles.testTierTag}>
                        {`${cfg.floorsCount} FLOORS • ${tierTag}`}
                      </Text>
                    </View>

                    {isCurrent ? (
                      <View style={styles.testActiveBadge}>
                        <Text style={styles.testActiveText}>ACTIVE</Text>
                      </View>
                    ) : (
                      <Text style={styles.testArrow}>▶</Text>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
      {/* --- [TEST_BUTTON_END] --- */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05060E',
  },
  policeBanner: {
    backgroundColor: '#FF0055',
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  policeText: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  statusStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(8, 10, 24, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 245, 255, 0.15)',
  },
  statusBox: {
    alignItems: 'center',
  },
  statusDim: {
    fontFamily: monoFont,
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 0.8,
  },
  statusVal: {
    fontFamily: monoFont,
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  arenaWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  arenaCard: {
    width: '100%',
    height: ARENA_H,
    position: 'relative',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(0, 245, 255, 0.35)',
    backgroundColor: '#070914',
    overflow: 'hidden',
    shadowColor: '#00F5FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(8, 10, 24, 0.96)',
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(0, 245, 255, 0.25)',
  },
  dirCluster: {
    gap: 8,
  },
  dirRow: {
    flexDirection: 'row',
    gap: 8,
  },
  ctrlBtn: {
    width: 72,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0D1426',
    borderWidth: 2,
    borderColor: '#00F5FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    elevation: 3,
  },
  ctrlBtnPressed: {
    backgroundColor: 'rgba(0, 245, 255, 0.35)',
    transform: [{ scale: 0.94 }],
  },
  ctrlIcon: {
    fontSize: 18,
    color: '#00F5FF',
    fontWeight: '900',
  },
  ctrlSub: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '800',
    color: '#00F5FF',
    letterSpacing: 0.5,
  },
  climbBtn: {
    width: 72,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1C180E',
    borderWidth: 2,
    borderColor: '#FFE600',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    elevation: 3,
  },
  climbBtnPressed: {
    backgroundColor: 'rgba(255, 230, 0, 0.35)',
    transform: [{ scale: 0.94 }],
  },
  climbIcon: {
    fontSize: 16,
    color: '#FFE600',
    fontWeight: '900',
  },
  climbSub: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '800',
    color: '#FFE600',
    letterSpacing: 0.5,
  },
  actionCluster: {
    gap: 8,
    alignItems: 'flex-end',
  },
  sneakBtn: {
    width: 154,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#151926',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    elevation: 3,
  },
  sneakBtnAvailable: {
    borderColor: '#00F5FF',
    backgroundColor: '#142840',
    shadowColor: '#00F5FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  sneakBtnActive: {
    backgroundColor: '#334155',
    borderColor: '#94A3B8',
    transform: [{ scale: 0.94 }],
  },
  sneakBtnDimmed: {
    opacity: 0.45,
  },
  sneakBtnPressed: {
    transform: [{ scale: 0.94 }],
  },
  sneakIcon: {
    fontSize: 18,
  },
  sneakText: {
    fontFamily: monoFont,
    fontSize: 10.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  actionSubRow: {
    flexDirection: 'row',
    gap: 6,
    width: 154,
  },
  smallActionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  gunBtn: {
    backgroundColor: '#0F1E2E',
    borderWidth: 2,
    borderColor: '#00F5FF',
  },
  gunBtnPressed: {
    backgroundColor: 'rgba(0, 245, 255, 0.4)',
    transform: [{ scale: 0.94 }],
  },
  bombBtn: {
    backgroundColor: '#260D1E',
    borderWidth: 2,
    borderColor: '#FF0055',
  },
  bombBtnPressed: {
    backgroundColor: 'rgba(255, 0, 85, 0.4)',
    transform: [{ scale: 0.94 }],
  },
  stoneBtn: {
    backgroundColor: '#1E1912',
    borderWidth: 2,
    borderColor: '#FFE600',
  },
  stoneBtnPressed: {
    backgroundColor: 'rgba(255, 230, 0, 0.3)',
    transform: [{ scale: 0.94 }],
  },
  wideStoneBtn: {
    width: 154,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1E1912',
    borderWidth: 2,
    borderColor: '#FFE600',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    elevation: 3,
  },
  wideStoneIcon: {
    fontSize: 18,
  },
  wideStoneText: {
    fontFamily: monoFont,
    fontSize: 9.5,
    fontWeight: '900',
    color: '#FFE600',
    letterSpacing: 0.5,
  },
  actionIcon: {
    fontSize: 17,
  },
  actionBadge: {
    fontFamily: monoFont,
    fontSize: 9,
    fontWeight: '900',
    color: '#00F5FF',
  },
  stoneCount: {
    fontFamily: monoFont,
    fontSize: 9,
    fontWeight: '900',
    color: '#FFE600',
  },
  btnDisabled: {
    opacity: 0.3,
  },
  /* --- [TEST_BUTTON_START] --- */
  testStageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 230, 0, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1.2,
    borderColor: '#FFE600',
  },
  testStageText: {
    fontFamily: monoFont,
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFE600',
  },
  testPill: {
    backgroundColor: '#FFE600',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  testPillText: {
    fontFamily: monoFont,
    fontSize: 7.5,
    fontWeight: '900',
    color: '#060914',
  },
  testModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 6, 14, 0.90)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 32,
  },
  testModalCard: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#0A0D1E',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#00F5FF',
    padding: 14,
    shadowColor: '#00F5FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  testModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 245, 255, 0.2)',
    paddingBottom: 10,
    marginBottom: 8,
  },
  testModalTitle: {
    fontFamily: monoFont,
    fontSize: 12,
    fontWeight: '900',
    color: '#00F5FF',
    letterSpacing: 0.8,
  },
  testModalSub: {
    fontFamily: monoFont,
    fontSize: 8.5,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  testCloseBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 0, 85, 0.2)',
    borderWidth: 1,
    borderColor: '#FF0055',
  },
  testCloseText: {
    fontFamily: monoFont,
    fontSize: 9,
    fontWeight: '900',
    color: '#FF0055',
  },
  testScroll: {
    maxHeight: 480,
  },
  testScrollContent: {
    paddingBottom: 16,
    gap: 6,
  },
  testLvlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#0F142A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  testLvlRowCurrent: {
    borderColor: '#00F5FF',
    backgroundColor: 'rgba(0, 245, 255, 0.12)',
  },
  testLvlRowPressed: {
    backgroundColor: 'rgba(0, 245, 255, 0.25)',
    transform: [{ scale: 0.98 }],
  },
  testBadge: {
    width: 38,
    height: 28,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  testBadgeText: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '900',
  },
  testInfo: {
    flex: 1,
  },
  testName: {
    fontFamily: monoFont,
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  testTierTag: {
    fontFamily: monoFont,
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.55)',
    marginTop: 2,
  },
  testActiveBadge: {
    backgroundColor: '#00F5FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  testActiveText: {
    fontFamily: monoFont,
    fontSize: 8,
    fontWeight: '900',
    color: '#05060E',
  },
  testArrow: {
    fontFamily: monoFont,
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.3)',
  },
  /* --- [TEST_BUTTON_END] --- */
});
