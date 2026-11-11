import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  useWindowDimensions,
  Platform,
} from 'react-native';
import Svg, {
  Line,
  Circle,
  Rect,
  G,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Path,
} from 'react-native-svg';
import { COLORS } from '../../styles';
import MiniGameHeader from '../components/MiniGameHeader';
import GameResultModal from '../components/GameResultModal';
import JuiceEngine from '../components/JuiceEngine';
import { playSliceSound, playTapSound, playGameOverSound, playPerfectSound } from '../utils/sound';
import {
  triggerLightHaptic,
  triggerSliceHaptic,
  triggerGameOverHaptic,
  triggerMediumHaptic,
  triggerPerfectHaptic,
} from '../utils/haptics';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const STORAGE_LEVEL_KEY = '@game_tower:level_spider_rope_v1';
const STORAGE_BEST_KEY = '@game_tower:best_spider_rope_v1';

const SPIDER_RADIUS = 16;
const GRAVITY = 0.44;

/**
 * Line segment intersection for cutting rope
 */
function checkLineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (Math.abs(denom) < 0.000001) return null;
  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

  if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
    return {
      x: x3 + ub * (x4 - x3),
      y: y3 + ub * (y4 - y3),
    };
  }
  return null;
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

function doesSwipeCutRope(p1, p2, ax, ay, sx, sy) {
  if (checkLineIntersection(p1.x, p1.y, p2.x, p2.y, ax, ay, sx, sy)) {
    return true;
  }
  if (distToSegment(p2.x, p2.y, ax, ay, sx, sy) < 18) {
    return true;
  }
  if (distToSegment(p1.x, p1.y, ax, ay, sx, sy) < 18) {
    return true;
  }
  const midX = (p1.x + p2.x) * 0.5;
  const midY = (p1.y + p2.y) * 0.5;
  if (distToSegment(midX, midY, ax, ay, sx, sy) < 18) {
    return true;
  }
  return false;
}

/**
 * Generate Spider Rope Levels
 */
function createSpiderLevel(lvl, arenaW, arenaH) {
  const archetype = (lvl - 1) % 8;
  let title = 'FIRST WEAVE';
  let spiderX = arenaW * 0.5;
  let spiderY = 160;
  let ropes = [];
  let nest = { x: arenaW * 0.5, y: arenaH - 70, radius: 42, isMoving: false, baseX: arenaW * 0.5 };
  let stars = [];
  let bouncers = [];
  let portals = null;
  let lasers = [];

  if (archetype === 0) {
    // Level 1: First Weave - 2 ropes holding spider
    title = 'TWIN STRANDS';
    spiderX = arenaW * 0.5;
    spiderY = 170;
    ropes = [
      { id: 'r1', ax: arenaW * 0.22, ay: 60, len: 155, color: '#00F5FF', intact: true },
      { id: 'r2', ax: arenaW * 0.78, ay: 60, len: 155, color: '#00F5FF', intact: true },
    ];
    stars = [
      { id: 's1', x: arenaW * 0.28, y: 270, taken: false },
      { id: 's2', x: arenaW * 0.72, y: 270, taken: false },
      { id: 's3', x: arenaW * 0.5, y: 390, taken: false },
    ];
    nest = { x: arenaW * 0.5, y: arenaH - 75, radius: 44, isMoving: false, baseX: arenaW * 0.5 };
  } else if (archetype === 1) {
    // Level 2: Triple Web Cradle
    title = 'TRIPLE CRADLE';
    spiderX = arenaW * 0.5;
    spiderY = 180;
    ropes = [
      { id: 'r1', ax: arenaW * 0.15, ay: 70, len: 170, color: '#39FF14', intact: true },
      { id: 'r2', ax: arenaW * 0.5, ay: 45, len: 135, color: '#00F5FF', intact: true },
      { id: 'r3', ax: arenaW * 0.85, ay: 70, len: 170, color: '#FF007F', intact: true },
    ];
    stars = [
      { id: 's1', x: arenaW * 0.2, y: 260, taken: false },
      { id: 's2', x: arenaW * 0.8, y: 260, taken: false },
      { id: 's3', x: arenaW * 0.35, y: 440, taken: false },
    ];
    nest = { x: arenaW * 0.32, y: arenaH - 75, radius: 42, isMoving: false, baseX: arenaW * 0.32 };
  } else if (archetype === 2) {
    // Level 3: Kinetic Trampoline Bouncer
    title = 'BOUNCING SPIDER';
    spiderX = arenaW * 0.35;
    spiderY = 160;
    ropes = [
      { id: 'r1', ax: arenaW * 0.2, ay: 60, len: 140, color: '#FFD166', intact: true },
      { id: 'r2', ax: arenaW * 0.65, ay: 70, len: 170, color: '#00F5FF', intact: true },
    ];
    bouncers = [
      { id: 'b1', x: arenaW * 0.32, y: 370, r: 28, color: '#FF007F' },
    ];
    stars = [
      { id: 's1', x: arenaW * 0.48, y: 240, taken: false },
      { id: 's2', x: arenaW * 0.72, y: 290, taken: false },
      { id: 's3', x: arenaW * 0.75, y: 450, taken: false },
    ];
    nest = { x: arenaW * 0.76, y: arenaH - 75, radius: 44, isMoving: false, baseX: arenaW * 0.76 };
  } else if (archetype === 3) {
    // Level 4: Slalom Pendulum
    title = 'PENDULUM ARC';
    spiderX = arenaW * 0.4;
    spiderY = 175;
    ropes = [
      { id: 'r1', ax: arenaW * 0.1, ay: 50, len: 180, color: '#9D4EDD', intact: true },
      { id: 'r2', ax: arenaW * 0.9, ay: 80, len: 210, color: '#00F5FF', intact: true },
    ];
    stars = [
      { id: 's1', x: arenaW * 0.3, y: 300, taken: false },
      { id: 's2', x: arenaW * 0.6, y: 320, taken: false },
      { id: 's3', x: arenaW * 0.82, y: 410, taken: false },
    ];
    nest = { x: arenaW * 0.5, y: arenaH - 75, radius: 44, isMoving: true, baseX: arenaW * 0.5 };
  } else if (archetype === 4) {
    // Level 5: Quantum Web Wormhole
    title = 'QUANTUM WEAVE';
    spiderX = arenaW * 0.28;
    spiderY = 150;
    ropes = [
      { id: 'r1', ax: arenaW * 0.15, ay: 50, len: 130, color: '#00F5FF', intact: true },
      { id: 'r2', ax: arenaW * 0.55, ay: 60, len: 170, color: '#9D4EDD', intact: true },
    ];
    portals = {
      in: { x: arenaW * 0.72, y: 280, r: 24, color: '#00F5FF' },
      out: { x: arenaW * 0.25, y: 380, r: 24, color: '#9D4EDD' },
    };
    stars = [
      { id: 's1', x: arenaW * 0.45, y: 220, taken: false },
      { id: 's2', x: arenaW * 0.82, y: 340, taken: false },
      { id: 's3', x: arenaW * 0.55, y: 470, taken: false },
    ];
    nest = { x: arenaW * 0.68, y: arenaH - 75, radius: 42, isMoving: false, baseX: arenaW * 0.68 };
  } else if (archetype === 5) {
    // Level 6: Laser Hazard Weave
    title = 'LASER HAZARD WEAVE';
    spiderX = arenaW * 0.5;
    spiderY = 160;
    ropes = [
      { id: 'r1', ax: arenaW * 0.2, ay: 60, len: 160, color: '#00F5FF', intact: true },
      { id: 'r2', ax: arenaW * 0.5, ay: 40, len: 120, color: '#39FF14', intact: true },
      { id: 'r3', ax: arenaW * 0.8, ay: 60, len: 160, color: '#FF007F', intact: true },
    ];
    lasers = [
      { id: 'lz1', x1: arenaW * 0.35, y1: 320, x2: arenaW * 0.65, y2: 320, color: '#FF0055' },
    ];
    stars = [
      { id: 's1', x: arenaW * 0.22, y: 280, taken: false },
      { id: 's2', x: arenaW * 0.78, y: 280, taken: false },
      { id: 's3', x: arenaW * 0.5, y: 450, taken: false },
    ];
    nest = { x: arenaW * 0.5, y: arenaH - 75, radius: 44, isMoving: false, baseX: arenaW * 0.5 };
  } else if (archetype === 6) {
    // Level 7: High Orbit Swing
    title = 'ORBITAL STRANDS';
    spiderX = arenaW * 0.45;
    spiderY = 170;
    ropes = [
      { id: 'r1', ax: arenaW * 0.12, ay: 60, len: 160, color: '#00F5FF', intact: true },
      { id: 'r2', ax: arenaW * 0.88, ay: 70, len: 180, color: '#FFD166', intact: true },
    ];
    bouncers = [
      { id: 'b1', x: arenaW * 0.82, y: 350, r: 26, color: '#FF007F' },
      { id: 'b2', x: arenaW * 0.18, y: 460, r: 26, color: '#00F5FF' },
    ];
    stars = [
      { id: 's1', x: arenaW * 0.55, y: 250, taken: false },
      { id: 's2', x: arenaW * 0.8, y: 250, taken: false },
      { id: 's3', x: arenaW * 0.45, y: 460, taken: false },
    ];
    nest = { x: arenaW * 0.7, y: arenaH - 75, radius: 44, isMoving: true, baseX: arenaW * 0.7 };
  } else {
    // Level 8+: Grand Cyber Web
    title = 'CYBER WEAVER APEX';
    spiderX = arenaW * 0.5;
    spiderY = 165;
    ropes = [
      { id: 'r1', ax: arenaW * 0.15, ay: 50, len: 170, color: '#00F5FF', intact: true },
      { id: 'r2', ax: arenaW * 0.5, ay: 40, len: 125, color: '#39FF14', intact: true },
      { id: 'r3', ax: arenaW * 0.85, ay: 50, len: 170, color: '#FF007F', intact: true },
    ];
    bouncers = [
      { id: 'b1', x: arenaW * 0.2, y: 380, r: 26, color: '#FFE600' },
    ];
    portals = {
      in: { x: arenaW * 0.82, y: 340, r: 22, color: '#00F5FF' },
      out: { x: arenaW * 0.45, y: 460, r: 22, color: '#9D4EDD' },
    };
    stars = [
      { id: 's1', x: arenaW * 0.28, y: 260, taken: false },
      { id: 's2', x: arenaW * 0.72, y: 260, taken: false },
      { id: 's3', x: arenaW * 0.5, y: 370, taken: false },
    ];
    nest = { x: arenaW * 0.5, y: arenaH - 75, radius: 44, isMoving: true, baseX: arenaW * 0.5 };
  }

  // Extract ceiling anchor hooks and guarantee versatile swing anchors across arena
  const hooks = ropes.map((r) => ({ id: `hook_${r.id}`, x: r.ax, y: r.ay, color: r.color }));
  const hasLeft = hooks.some((h) => h.x < arenaW * 0.32);
  const hasRight = hooks.some((h) => h.x > arenaW * 0.68);
  const hasMid = hooks.some((h) => h.x >= arenaW * 0.32 && h.x <= arenaW * 0.68);
  if (!hasLeft) hooks.push({ id: 'hook_extra_left', x: arenaW * 0.18, y: 60, color: '#00F5FF' });
  if (!hasMid) hooks.push({ id: 'hook_extra_mid', x: arenaW * 0.50, y: 45, color: '#39FF14' });
  if (!hasRight) hooks.push({ id: 'hook_extra_right', x: arenaW * 0.82, y: 60, color: '#FF007F' });

  return {
    title,
    spiderX,
    spiderY,
    ropes,
    hooks,
    nest,
    stars,
    bouncers,
    portals,
    lasers,
  };
}

export default function RopeCutGame({ onBackToHub, onScoreUpdate, isPaused = false }) {
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  const { width, height } = useWindowDimensions();
  const arenaWidth = width;
  const arenaHeight = height - 130;

  const juiceRef = useRef(null);
  const [level, setLevel] = useState(1);
  const [levelTitle, setLevelTitle] = useState('TWIN STRANDS');
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [starsCollected, setStarsCollected] = useState(0);

  // Spider Physics State
  const [spider, setSpider] = useState({
    x: arenaWidth * 0.5,
    y: 160,
    vx: 0,
    vy: 0,
    legPhase: 0,
  });

  const [ropes, setRopes] = useState([]);
  const [hooks, setHooks] = useState([]);
  const [webAim, setWebAim] = useState(null);
  const [nest, setNest] = useState({
    x: arenaWidth * 0.5,
    y: arenaHeight - 75,
    radius: 44,
    isMoving: false,
    baseX: arenaWidth * 0.5,
  });
  const [stars, setStars] = useState([]);
  const [bouncers, setBouncers] = useState([]);
  const [portals, setPortals] = useState(null);
  const [lasers, setLasers] = useState([]);

  const [cutTrail, setCutTrail] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('VICTORY');

  const spiderRef = useRef(spider);
  spiderRef.current = spider;
  const ropesRef = useRef(ropes);
  ropesRef.current = ropes;
  const hooksRef = useRef(hooks);
  hooksRef.current = hooks;
  const webAimRef = useRef(webAim);
  webAimRef.current = webAim;
  const nestRef = useRef(nest);
  nestRef.current = nest;
  const starsRef = useRef(stars);
  starsRef.current = stars;
  const bouncersRef = useRef(bouncers);
  bouncersRef.current = bouncers;
  const portalsRef = useRef(portals);
  portalsRef.current = portals;
  const lasersRef = useRef(lasers);
  lasersRef.current = lasers;

  const dragModeRef = useRef('NONE');
  const touchLastPosRef = useRef(null);

  const tickCountRef = useRef(0);
  const portalCooldownRef = useRef(0);
  const animFrameRef = useRef(null);
  const isPlayingRef = useRef(true);

  // Load saved progress
  useEffect(() => {
    (async () => {
      try {
        const savedLvl = await AsyncStorage.getItem(STORAGE_LEVEL_KEY);
        const savedScore = await AsyncStorage.getItem(STORAGE_BEST_KEY);
        if (savedLvl !== null) {
          const pLvl = parseInt(savedLvl, 10);
          if (!isNaN(pLvl) && pLvl >= 1) setLevel(pLvl);
        }
        if (savedScore !== null) {
          const pScore = parseInt(savedScore, 10);
          if (!isNaN(pScore)) setBestScore(pScore);
        }
      } catch {}
    })();
  }, []);

  // Update best score
  const updateBest = useCallback(
    async (nextScore) => {
      if (onScoreUpdate) onScoreUpdate(nextScore);
      if (nextScore > bestScore) {
        setBestScore(nextScore);
        try {
          await AsyncStorage.setItem(STORAGE_BEST_KEY, String(nextScore));
        } catch {}
      }
    },
    [bestScore, onScoreUpdate]
  );

  // Web-Shooting and Synchronous Rope Slicing
  const shootWebToHook = useCallback((hook) => {
    if (!hook || typeof hook.x !== 'number' || typeof hook.y !== 'number') return;
    const curSpider = spiderRef.current;
    if (!curSpider) return;
    const dist = Math.hypot(curSpider.x - hook.x, curSpider.y - hook.y);
    const newRope = {
      id: `rope_shoot_${Date.now()}_${Math.random()}`,
      ax: hook.x,
      ay: hook.y,
      len: Math.max(70, dist * 0.96),
      color: hook.color || '#39FF14',
      intact: true,
    };
    ropesRef.current.push(newRope);
    setRopes([...ropesRef.current]);
    playTapSound();
    triggerPerfectHaptic(2);
    if (juiceRef.current) {
      juiceRef.current.burst(hook.x, hook.y, '#39FF14', 16);
    }
  }, []);

  const cutRopesAtPoint = useCallback((p1, p2) => {
    const curSpider = spiderRef.current;
    let cutOccurred = false;
    const currentRopes = ropesRef.current;

    for (let i = 0; i < currentRopes.length; i++) {
      const r = currentRopes[i];
      if (!r.intact) continue;

      if (doesSwipeCutRope(p1, p2, r.ax, r.ay, curSpider.x, curSpider.y)) {
        r.intact = false;
        cutOccurred = true;
        playSliceSound();
        triggerSliceHaptic();
        if (juiceRef.current) {
          juiceRef.current.burst(p2.x, p2.y, r.color, 14);
        }
      }
    }

    if (cutOccurred) {
      setRopes([...currentRopes]);
    }
  }, []);

  // Initialize level
  const initLevel = useCallback(
    (lvl) => {
      isPlayingRef.current = true;
      setStarsCollected(0);
      setModalVisible(false);
      setCutTrail(null);
      setWebAim(null);
      webAimRef.current = null;
      dragModeRef.current = 'NONE';
      touchLastPosRef.current = null;
      tickCountRef.current = 0;
      portalCooldownRef.current = 0;

      const cfg = createSpiderLevel(lvl, arenaWidth, arenaHeight);
      setLevelTitle(cfg.title);

      const initSpider = {
        x: cfg.spiderX,
        y: cfg.spiderY,
        vx: 0,
        vy: 0,
        legPhase: 0,
      };
      setSpider(initSpider);
      spiderRef.current = initSpider;

      setRopes(cfg.ropes);
      ropesRef.current = cfg.ropes;

      setHooks(cfg.hooks || []);
      hooksRef.current = cfg.hooks || [];

      setNest(cfg.nest);
      nestRef.current = cfg.nest;

      setStars(cfg.stars);
      starsRef.current = cfg.stars;

      setBouncers(cfg.bouncers);
      bouncersRef.current = cfg.bouncers;

      setPortals(cfg.portals);
      portalsRef.current = cfg.portals;

      setLasers(cfg.lasers);
      lasersRef.current = cfg.lasers;
    },
    [arenaWidth, arenaHeight]
  );

  useEffect(() => {
    initLevel(level);
  }, [level, initLevel]);

  // PanResponder to slice ropes or shoot webs
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isPausedRef.current && isPlayingRef.current,
      onMoveShouldSetPanResponder: () => !isPausedRef.current && isPlayingRef.current,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        touchLastPosRef.current = { x: locationX, y: locationY };

        // 1. Direct Tap on Hook: Shoot web immediately!
        const currentHooks = hooksRef.current;
        const tappedHook = currentHooks.find((h) => Math.hypot(locationX - h.x, locationY - h.y) < 32);
        if (tappedHook) {
          shootWebToHook(tappedHook);
          dragModeRef.current = 'NONE';
          return;
        }

        // 2. Spider Drag: Aim web towards any hook!
        const curSpider = spiderRef.current;
        const distToSpider = Math.hypot(locationX - curSpider.x, locationY - curSpider.y);
        if (distToSpider < 44) {
          dragModeRef.current = 'WEB';
          const aimObj = {
            fromX: curSpider.x,
            fromY: curSpider.y,
            toX: locationX,
            toY: locationY,
            targetHook: null,
          };
          webAimRef.current = aimObj;
          setWebAim(aimObj);
          triggerLightHaptic();
          return;
        }

        // 3. Otherwise: Swipe to slice/cut ropes
        dragModeRef.current = 'CUT';
        setCutTrail({ x1: locationX, y1: locationY, x2: locationX, y2: locationY });
        cutRopesAtPoint({ x: locationX, y: locationY }, { x: locationX, y: locationY });
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const p1 = touchLastPosRef.current || { x: locationX, y: locationY };
        const p2 = { x: locationX, y: locationY };
        touchLastPosRef.current = p2;

        if (dragModeRef.current === 'WEB') {
          const curSpider = spiderRef.current;
          const currentHooks = hooksRef.current;
          let bestHook = null;
          let minDist = 75;
          for (let i = 0; i < currentHooks.length; i++) {
            const h = currentHooks[i];
            const d = Math.hypot(p2.x - h.x, p2.y - h.y);
            if (d < minDist) {
              minDist = d;
              bestHook = h;
            }
          }
          const aimObj = {
            fromX: curSpider.x,
            fromY: curSpider.y,
            toX: p2.x,
            toY: p2.y,
            targetHook: bestHook,
          };
          webAimRef.current = aimObj;
          setWebAim(aimObj);
        } else if (dragModeRef.current === 'CUT') {
          setCutTrail({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
          cutRopesAtPoint(p1, p2);
        }
      },
      onPanResponderRelease: () => {
        if (dragModeRef.current === 'WEB') {
          const aim = webAimRef.current;
          if (aim && aim.targetHook) {
            shootWebToHook(aim.targetHook);
          }
        }
        dragModeRef.current = 'NONE';
        touchLastPosRef.current = null;
        setCutTrail(null);
        setWebAim(null);
        webAimRef.current = null;
      },
    })
  ).current;

  // Level Win & Level Fail
  const handleWin = useCallback(() => {
    isPlayingRef.current = false;
    triggerPerfectHaptic(3);
    playPerfectSound(8);

    const bonus = 100 + starsCollected * 50;
    const nextScore = score + bonus;
    setScore(nextScore);
    updateBest(nextScore);

    if (juiceRef.current) {
      juiceRef.current.celebrate(
        `STAGE ${level} CLEARED!`,
        `+${bonus} SPIDER POINTS // ${starsCollected} STARS`,
        '#00F5D4'
      );
    }

    setModalType('VICTORY');
    setModalVisible(true);
  }, [starsCollected, score, level, updateBest]);

  const handleFail = useCallback((reason) => {
    isPlayingRef.current = false;
    triggerGameOverHaptic();
    playGameOverSound();
    if (juiceRef.current) {
      juiceRef.current.shake(12, 10);
      juiceRef.current.flash('#FF3366');
    }
    setModalType('GAMEOVER');
    setModalVisible(true);
  }, []);

  const handleNextLevel = () => {
    const nextLvl = level + 1;
    setLevel(nextLvl);
    try {
      AsyncStorage.setItem(STORAGE_LEVEL_KEY, String(nextLvl));
    } catch {}
    initLevel(nextLvl);
  };

  const handleRetry = () => {
    initLevel(level);
  };

  // 60 FPS Spider Physics Loop
  useEffect(() => {
    let active = true;

    const tick = () => {
      if (!active) return;
      if (isPausedRef.current || !isPlayingRef.current) {
        animFrameRef.current = requestAnimationFrame(tick);
        return;
      }
      tickCountRef.current += 1;

      if (portalCooldownRef.current > 0) {
        portalCooldownRef.current -= 1;
      }

      // 1. Moving Web Nest
      const curNest = { ...nestRef.current };
      if (curNest.isMoving) {
        const range = 80;
        const speed = 0.038;
        curNest.x = curNest.baseX + Math.sin(tickCountRef.current * speed) * range;
        nestRef.current = curNest;
        setNest(curNest);
      }

      // 2. Spider Physics (Gravity + Rope Tensions)
      const curSpider = { ...spiderRef.current };
      curSpider.vy += GRAVITY;
      curSpider.vx *= 0.992;
      curSpider.vy *= 0.992;

      const activeRopes = ropesRef.current.filter((r) => r.intact);

      // Apply spring & pendulum constraints for all attached intact ropes
      for (let i = 0; i < activeRopes.length; i++) {
        const r = activeRopes[i];
        const dx = curSpider.x - r.ax;
        const dy = curSpider.y - r.ay;
        const dist = Math.hypot(dx, dy);

        if (dist > r.len) {
          const stretch = dist - r.len;
          const nx = dx / (dist || 1);
          const ny = dy / (dist || 1);

          // Elastic restoring tension
          const tension = stretch * 0.22;
          curSpider.vx -= nx * tension;
          curSpider.vy -= ny * tension;

          // Remove outward radial velocity
          const radialVel = curSpider.vx * nx + curSpider.vy * ny;
          if (radialVel > 0) {
            curSpider.vx -= nx * radialVel * 0.92;
            curSpider.vy -= ny * radialVel * 0.92;
          }
        }
      }

      curSpider.x += curSpider.vx;
      curSpider.y += curSpider.vy;
      curSpider.legPhase = (curSpider.legPhase + Math.hypot(curSpider.vx, curSpider.vy) * 0.15) % (Math.PI * 2);

      // Arena boundary dampening
      if (curSpider.x < SPIDER_RADIUS + 4) {
        curSpider.x = SPIDER_RADIUS + 4;
        curSpider.vx = -curSpider.vx * 0.6;
      } else if (curSpider.x > arenaWidth - SPIDER_RADIUS - 4) {
        curSpider.x = arenaWidth - SPIDER_RADIUS - 4;
        curSpider.vx = -curSpider.vx * 0.6;
      }

      // 3. Pinball Bouncers collision
      const curBouncers = bouncersRef.current;
      for (let i = 0; i < curBouncers.length; i++) {
        const b = curBouncers[i];
        const dist = Math.hypot(curSpider.x - b.x, curSpider.y - b.y);
        if (dist < b.r + SPIDER_RADIUS) {
          playSliceSound();
          triggerMediumHaptic();
          const nx = (curSpider.x - b.x) / (dist || 1);
          const ny = (curSpider.y - b.y) / (dist || 1);
          const bounceForce = 13;
          curSpider.vx = nx * bounceForce;
          curSpider.vy = ny * bounceForce;
          if (juiceRef.current) {
            juiceRef.current.burst(b.x, b.y, b.color, 14);
          }
        }
      }

      // 4. Quantum Wormhole Portals
      const curPortals = portalsRef.current;
      if (curPortals && portalCooldownRef.current === 0) {
        const distToIn = Math.hypot(curSpider.x - curPortals.in.x, curSpider.y - curPortals.in.y);
        if (distToIn < curPortals.in.r + SPIDER_RADIUS) {
          playTapSound();
          triggerMediumHaptic();
          curSpider.x = curPortals.out.x;
          curSpider.y = curPortals.out.y;
          portalCooldownRef.current = 45;
          if (juiceRef.current) {
            juiceRef.current.flash(curPortals.out.color);
            juiceRef.current.burst(curPortals.out.x, curPortals.out.y, curPortals.out.color, 16);
          }
        }
      }

      // 5. Laser Hazard Collision
      const curLasers = lasersRef.current;
      for (let i = 0; i < curLasers.length; i++) {
        const lz = curLasers[i];
        // Line-point distance
        const lLen = Math.hypot(lz.x2 - lz.x1, lz.y2 - lz.y1);
        const t = Math.max(
          0,
          Math.min(
            1,
            ((curSpider.x - lz.x1) * (lz.x2 - lz.x1) + (curSpider.y - lz.y1) * (lz.y2 - lz.y1)) /
              (lLen * lLen || 1)
          )
        );
        const nearX = lz.x1 + t * (lz.x2 - lz.x1);
        const nearY = lz.y1 + t * (lz.y2 - lz.y1);
        const dist = Math.hypot(curSpider.x - nearX, curSpider.y - nearY);

        if (dist < SPIDER_RADIUS + 4) {
          handleFail('ZAPPED BY QUANTUM LASER GRID!');
          animFrameRef.current = requestAnimationFrame(tick);
          return;
        }
      }

      // 6. Collectible Stars
      const curStars = starsRef.current;
      let starsChanged = false;
      const updatedStars = curStars.map((st) => {
        if (st.taken) return st;
        const dist = Math.hypot(curSpider.x - st.x, curSpider.y - st.y);
        if (dist < SPIDER_RADIUS + 16) {
          starsChanged = true;
          playTapSound();
          triggerPerfectHaptic(1);
          setStarsCollected((prev) => prev + 1);
          if (juiceRef.current) {
            juiceRef.current.burst(st.x, st.y, '#FFD166', 15);
          }
          return { ...st, taken: true };
        }
        return st;
      });

      if (starsChanged) {
        starsRef.current = updatedStars;
        setStars(updatedStars);
      }

      // 7. Check Web Nest Victory
      const distToNest = Math.hypot(curSpider.x - curNest.x, curSpider.y - curNest.y);
      if (distToNest < curNest.radius + 6) {
        handleWin();
        animFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      // 8. Fallen into the void below
      if (curSpider.y > arenaHeight + 40) {
        handleFail('SPIDER FELL INTO THE CYBER VOID!');
        animFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      spiderRef.current = curSpider;
      setSpider(curSpider);

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [arenaWidth, arenaHeight, handleWin, handleFail]);

  // Leg wiggle offset calculation
  const legWiggle = Math.sin(spider.legPhase) * 4;

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={styles.container}>
        <MiniGameHeader
          title="SPIDER ROPE SWING"
          category="PHYSICS SWING"
          accentColor="#00F5D4"
          score={score}
          onBack={onBackToHub}
          onBackToHub={onBackToHub}
        />

        {/* Top HUD: Stage Title & Stars */}
        <View style={styles.topHud}>
          <View style={styles.stageBox}>
            <Text style={styles.stageNum}>STAGE {level}</Text>
            <Text style={styles.stageTitle}>{levelTitle}</Text>
          </View>

          <View style={styles.starsRow}>
            {[0, 1, 2].map((i) => (
              <Text
                key={i}
                style={[
                  styles.starIcon,
                  { opacity: i < starsCollected ? 1 : 0.22 },
                ]}
              >
                ⭐
              </Text>
            ))}
          </View>

          <View style={styles.hudBadge}>
            <Text style={styles.hudHint}>SWIPE TO CUT • DRAG SPIDER TO SHOOT WEB</Text>
          </View>
        </View>

        {/* Touch Arena for Physics & Slicing */}
        <View style={styles.arena} {...panResponder.panHandlers}>
          <Svg width={arenaWidth} height={arenaHeight} style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="spiderBodyGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#00F5D4" stopOpacity="1" />
                <Stop offset="60%" stopColor="#0F1B2B" stopOpacity="1" />
                <Stop offset="100%" stopColor="#7928CA" stopOpacity="1" />
              </LinearGradient>

              <RadialGradient id="webGlow" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0%" stopColor="#00F5D4" stopOpacity="0.35" />
                <Stop offset="70%" stopColor="#00F5D4" stopOpacity="0.08" />
                <Stop offset="100%" stopColor="#00F5D4" stopOpacity="0" />
              </RadialGradient>
            </Defs>

            {/* Target Web Nest */}
            <G transform={`translate(${nest.x}, ${nest.y})`}>
              <Circle cx={0} cy={0} r={nest.radius + 15} fill="url(#webGlow)" />
              <Circle
                cx={0}
                cy={0}
                r={nest.radius}
                fill="rgba(0, 245, 212, 0.12)"
                stroke="#00F5D4"
                strokeWidth={2}
                strokeDasharray="6 3"
              />
              <Circle
                cx={0}
                cy={0}
                r={nest.radius * 0.65}
                fill="rgba(157, 78, 221, 0.15)"
                stroke="#9D4EDD"
                strokeWidth={1.5}
              />
              <Circle
                cx={0}
                cy={0}
                r={nest.radius * 0.3}
                fill="rgba(0, 245, 255, 0.25)"
                stroke="#00F5FF"
                strokeWidth={2}
              />
              {/* Web Spokes */}
              <Line x1={-nest.radius} y1={0} x2={nest.radius} y2={0} stroke="#00F5D4" strokeWidth={1.5} opacity={0.65} />
              <Line x1={0} y1={-nest.radius} x2={0} y2={nest.radius} stroke="#00F5D4" strokeWidth={1.5} opacity={0.65} />
              <Line x1={-nest.radius * 0.7} y1={-nest.radius * 0.7} x2={nest.radius * 0.7} y2={nest.radius * 0.7} stroke="#00F5D4" strokeWidth={1.5} opacity={0.65} />
              <Line x1={-nest.radius * 0.7} y1={nest.radius * 0.7} x2={nest.radius * 0.7} y2={-nest.radius * 0.7} stroke="#00F5D4" strokeWidth={1.5} opacity={0.65} />
            </G>

            {/* Ceiling Anchor Hooks (Always visible, even after rope is cut) */}
            {hooks.map((h) => {
              const isTargeted = webAim?.targetHook?.id === h.id;
              return (
                <G key={h.id}>
                  {isTargeted && (
                    <Circle
                      cx={h.x}
                      cy={h.y}
                      r={18}
                      stroke="#39FF14"
                      strokeWidth={2.5}
                      strokeDasharray="4 3"
                    />
                  )}
                  <Circle cx={h.x} cy={h.y} r={9} fill="#050B14" stroke={h.color || '#00F5FF'} strokeWidth={2.5} />
                  <Circle cx={h.x} cy={h.y} r={4} fill={isTargeted ? '#39FF14' : h.color || '#00F5FF'} />
                  {/* Anchor Crosshair */}
                  <Line x1={h.x - 12} y1={h.y} x2={h.x + 12} y2={h.y} stroke={h.color || '#00F5FF'} strokeWidth={1} opacity={0.6} />
                  <Line x1={h.x} y1={h.y - 12} x2={h.x} y2={h.y + 12} stroke={h.color || '#00F5FF'} strokeWidth={1} opacity={0.6} />
                </G>
              );
            })}

            {/* Web Aiming Beam when dragging from Spider */}
            {webAim && (
              <G>
                {/* Aiming strand */}
                <Line
                  x1={webAim.fromX}
                  y1={webAim.fromY}
                  x2={webAim.toX}
                  y2={webAim.toY}
                  stroke="#39FF14"
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  opacity={0.8}
                />
                <Circle cx={webAim.toX} cy={webAim.toY} r={10} stroke="#39FF14" strokeWidth={2} fill="rgba(57, 255, 20, 0.25)" />
                {webAim.targetHook && (
                  <Line
                    x1={spider.x}
                    y1={spider.y}
                    x2={webAim.targetHook.x}
                    y2={webAim.targetHook.y}
                    stroke="#39FF14"
                    strokeWidth={3}
                  />
                )}
              </G>
            )}

            {/* Active Web Strands Attached to Spider */}
            {ropes.map((r) => {
              if (!r.intact) return null;

              return (
                <G key={r.id}>
                  {/* Glowing Silk Web Strand */}
                  <Line
                    x1={r.ax}
                    y1={r.ay}
                    x2={spider.x}
                    y2={spider.y}
                    stroke={r.color}
                    strokeWidth={4}
                    strokeLinecap="round"
                  />
                  {/* Silk Core Highlight */}
                  <Line
                    x1={r.ax}
                    y1={r.ay}
                    x2={spider.x}
                    y2={spider.y}
                    stroke="#FFFFFF"
                    strokeWidth={1.2}
                    opacity={0.8}
                  />
                </G>
              );
            })}

            {/* Neon Pinball Bouncers */}
            {bouncers.map((b) => (
              <G key={b.id}>
                <Circle cx={b.x} cy={b.y} r={b.r + 6} stroke={b.color} strokeWidth={2} strokeDasharray="4 3" opacity={0.7} />
                <Circle cx={b.x} cy={b.y} r={b.r} fill="#140A28" stroke={b.color} strokeWidth={3} />
                <Circle cx={b.x} cy={b.y} r={b.r * 0.45} fill={b.color} opacity={0.9} />
              </G>
            ))}

            {/* Quantum Wormhole Portals */}
            {portals && (
              <G>
                {/* Portal IN */}
                <Circle
                  cx={portals.in.x}
                  cy={portals.in.y}
                  r={portals.in.r}
                  fill="#001828"
                  stroke={portals.in.color}
                  strokeWidth={3}
                  strokeDasharray="5 3"
                />
                <Circle cx={portals.in.x} cy={portals.in.y} r={8} fill={portals.in.color} />

                {/* Portal OUT */}
                <Circle
                  cx={portals.out.x}
                  cy={portals.out.y}
                  r={portals.out.r}
                  fill="#1C0632"
                  stroke={portals.out.color}
                  strokeWidth={3}
                  strokeDasharray="5 3"
                />
                <Circle cx={portals.out.x} cy={portals.out.y} r={8} fill={portals.out.color} />
              </G>
            )}

            {/* Laser Hazard Barriers */}
            {lasers.map((lz) => (
              <G key={lz.id}>
                <Circle cx={lz.x1} cy={lz.y1} r={5} fill="#FF0055" />
                <Circle cx={lz.x2} cy={lz.y2} r={5} fill="#FF0055" />
                <Line x1={lz.x1} y1={lz.y1} x2={lz.x2} y2={lz.y2} stroke="#FF0055" strokeWidth={3.5} />
                <Line x1={lz.x1} y1={lz.y1} x2={lz.x2} y2={lz.y2} stroke="#FFFFFF" strokeWidth={1} strokeDasharray="4 2" />
              </G>
            ))}

            {/* Collectible Stars */}
            {stars.map((st) => {
              if (st.taken) return null;
              return (
                <G key={st.id}>
                  <Circle cx={st.x} cy={st.y} r={16} fill="rgba(255, 209, 102, 0.25)" />
                  <Circle cx={st.x} cy={st.y} r={9} fill="#FFD166" />
                  <Circle cx={st.x} cy={st.y} r={4} fill="#FFFFFF" />
                </G>
              );
            })}

            {/* Spider Character */}
            <G transform={`translate(${spider.x}, ${spider.y})`}>
              {/* Spider Legs - Left */}
              <Path
                d={`M-5,-2 Q-16,${-10 + legWiggle} -22,-3`}
                stroke="#00F5FF"
                strokeWidth="2.4"
                fill="none"
                strokeLinecap="round"
              />
              <Path
                d={`M-7,2 Q-19,${1 - legWiggle} -23,9`}
                stroke="#00F5FF"
                strokeWidth="2.4"
                fill="none"
                strokeLinecap="round"
              />
              <Path
                d={`M-6,6 Q-17,${13 + legWiggle} -19,19`}
                stroke="#00F5FF"
                strokeWidth="2.4"
                fill="none"
                strokeLinecap="round"
              />
              <Path
                d={`M-4,10 Q-12,${19 - legWiggle} -15,25`}
                stroke="#00F5FF"
                strokeWidth="2.4"
                fill="none"
                strokeLinecap="round"
              />

              {/* Spider Legs - Right */}
              <Path
                d={`M5,-2 Q16,${-10 - legWiggle} 22,-3`}
                stroke="#00F5FF"
                strokeWidth="2.4"
                fill="none"
                strokeLinecap="round"
              />
              <Path
                d={`M7,2 Q19,${1 + legWiggle} 23,9`}
                stroke="#00F5FF"
                strokeWidth="2.4"
                fill="none"
                strokeLinecap="round"
              />
              <Path
                d={`M6,6 Q17,${13 - legWiggle} 19,19`}
                stroke="#00F5FF"
                strokeWidth="2.4"
                fill="none"
                strokeLinecap="round"
              />
              <Path
                d={`M4,10 Q12,${19 + legWiggle} 15,25`}
                stroke="#00F5FF"
                strokeWidth="2.4"
                fill="none"
                strokeLinecap="round"
              />

              {/* Spider Abdomen (Round rear) */}
              <Circle cx={0} cy={6} r={13} fill="url(#spiderBodyGrad)" stroke="#00F5D4" strokeWidth={2} />
              <Circle cx={0} cy={6} r={6} fill="#090A1A" stroke="#9D4EDD" strokeWidth={1.5} />
              <Circle cx={0} cy={6} r={2.5} fill="#00F5FF" />

              {/* Spider Head */}
              <Circle cx={0} cy={-6} r={9} fill="#060918" stroke="#00F5FF" strokeWidth={2} />

              {/* Glowing Spider Eyes */}
              <Circle cx={-3.5} cy={-8} r={2.2} fill="#39FF14" />
              <Circle cx={3.5} cy={-8} r={2.2} fill="#39FF14" />
              <Circle cx={-6} cy={-5} r={1.5} fill="#00F5FF" />
              <Circle cx={6} cy={-5} r={1.5} fill="#00F5FF" />
            </G>

            {/* Slicing Finger Trail */}
            {cutTrail && (
              <Line
                x1={cutTrail.x1}
                y1={cutTrail.y1}
                x2={cutTrail.x2}
                y2={cutTrail.y2}
                stroke="#FFFFFF"
                strokeWidth={3}
                strokeLinecap="round"
              />
            )}
          </Svg>
        </View>

        <GameResultModal
          visible={modalVisible}
          type={modalType}
          title={modalType === 'VICTORY' ? `STAGE ${level} CLEARED!` : 'SPIDER DETACHED!'}
          subtitle={
            modalType === 'VICTORY'
              ? `CAUGHT ${starsCollected}/3 STARS // WEB NEST REACHED`
              : 'MISSED THE NEST // RETRY SWING'
          }
          score={score}
          bestScore={bestScore}
          accentColor={modalType === 'VICTORY' ? '#00F5D4' : '#FF3366'}
          onRetry={modalType === 'VICTORY' ? handleNextLevel : handleRetry}
          retryLabel={modalType === 'VICTORY' ? 'NEXT STAGE' : 'TRY AGAIN'}
          onBackToHub={onBackToHub}
        />
      </View>
    </JuiceEngine>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050512',
  },
  topHud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(8, 8, 22, 0.75)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 245, 212, 0.15)',
  },
  stageBox: {
    flexDirection: 'column',
  },
  stageNum: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '900',
    color: '#00F5D4',
    letterSpacing: 1,
  },
  stageTitle: {
    fontFamily: monoFont,
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  starIcon: {
    fontSize: 18,
  },
  hudBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 245, 212, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 212, 0.3)',
  },
  hudHint: {
    fontFamily: monoFont,
    fontSize: 9.5,
    fontWeight: '900',
    color: '#00F5D4',
    letterSpacing: 0.6,
  },
  arena: {
    flex: 1,
    overflow: 'hidden',
  },
});
