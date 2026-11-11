import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  useWindowDimensions,
  PanResponder,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, {
  Rect,
  Circle,
  Path,
  G,
  Line,
  Defs,
  LinearGradient,
  Stop,
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
} from '../utils/haptics';
import {
  playTapSound,
  playPerfectSound,
  playSliceSound,
  playGameOverSound,
} from '../utils/sound';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const STORAGE_LEVEL_KEY = '@game_tower:level_chamber_v1';
const STORAGE_BEST_KEY = '@game_tower:best_chamber_v1';

// Arena Dimensions
const GAME_W = 360;
const GAME_H = 340;

const GRAVITY = 0.52;
const MOVE_SPEED = 2.4;
const JUMP_FORCE = -8.6;

const PLAYER_W = 20;
const PLAYER_H = 28;
const CRATE_SIZE = 26;

/**
 * 8 Interactive Unexpected Puzzle Escape Chambers
 */
function getRoomConfig(lvl) {
  const roomIndex = (lvl - 1) % 8;

  // Defaults
  let title = 'TUTORIAL VAULT';
  let hint = 'FIND THE ESCAPE SOLUTION';
  let playerStart = { x: 30, y: 260 };
  let exitDoor = { x: 310, y: 254, w: 28, h: 42, locked: true, isDraggable: false };
  let platforms = [
    // Floor
    { id: 'floor', x: 0, y: 300, w: 360, h: 40 },
    // Outer walls
    { id: 'w_left', x: 0, y: 0, w: 12, h: 300 },
    { id: 'w_right', x: 348, y: 0, w: 12, h: 300 },
    // Ceiling
    { id: 'ceiling', x: 0, y: 0, w: 360, h: 12 },
  ];
  let crates = [];
  let switches = [];
  let keys = [];
  let plates = [];
  let hazards = [];
  let barriers = [];
  let plug = null;
  let padlock = null;

  if (roomIndex === 0) {
    // Room 1: Unreachable Floating Key -> Drag it down!
    title = 'CHAMBER 01: UNREACHABLE KEY';
    hint = 'CANNOT JUMP TO KEY? DRAG IT DOWN WITH YOUR FINGER!';
    // No platforms under the key! High floating key
    keys.push({ id: 'k1', x: 190, y: 110, taken: false, color: '#FFD166', isDraggable: true });
  } else if (roomIndex === 1) {
    // Room 2: Movable Metal Slab blocks Laser
    title = 'CHAMBER 02: LASER INTERCEPT';
    hint = 'DRAG THE FLOATING METAL SLAB TO BLOCK THE LASER!';
    platforms.push(
      { id: 'mov_p1', x: 140, y: 120, w: 55, h: 16, isDraggable: true, color: '#FFE600' }
    );
    barriers.push({ id: 'b1', x: 230, y: 190, w: 8, h: 110, active: true, color: '#FF0055' });
    switches.push({ id: 'sw1', x: 280, y: 270, active: false });
  } else if (roomIndex === 2) {
    // Room 3: Draggable Crates to climb high wall
    title = 'CHAMBER 03: CRATE ELEVATION';
    hint = 'DRAG & DROP THE CRATES TO BUILD ESCAPE STAIRS!';
    platforms.push(
      { id: 'plateau', x: 200, y: 190, w: 160, h: 110 }
    );
    exitDoor = { x: 310, y: 148, w: 28, h: 42, locked: true, isDraggable: false };
    crates.push(
      { id: 'c1', x: 50, y: 270, vx: 0, vy: 0, isDraggable: true },
      { id: 'c2', x: 100, y: 270, vx: 0, vy: 0, isDraggable: true }
    );
    keys.push({ id: 'k1', x: 250, y: 155, taken: false, color: '#00F5FF', isDraggable: true });
  } else if (roomIndex === 3) {
    // Room 4: The Movable Exit Door!
    title = 'CHAMBER 04: THE MOVABLE EXIT';
    hint = 'DOOR IS TOO HIGH? GRAB AND DRAG THE DOOR DOWN!';
    // Door is stranded near ceiling
    exitDoor = { x: 310, y: 55, w: 28, h: 42, locked: true, isDraggable: true };
    keys.push({ id: 'k1', x: 160, y: 275, taken: false, color: '#FFD166', isDraggable: true });
  } else if (roomIndex === 4) {
    // Room 5: Two-Finger Pressure Plate Override
    title = 'CHAMBER 05: TWO-FINGER OVERRIDE';
    hint = 'WALK ONTO PLATE A — HOLD YOUR FINGER ON PLATE B!';
    plates.push(
      { id: 'p1', x: 70, y: 295, w: 38, h: 6, pressed: false, pressedByFinger: false },
      { id: 'p2', x: 220, y: 295, w: 38, h: 6, pressed: false, pressedByFinger: false }
    );
    exitDoor = { x: 310, y: 254, w: 28, h: 42, locked: true, requiresDualPlates: true };
  } else if (roomIndex === 5) {
    // Room 6: Spike Bridge Builder
    title = 'CHAMBER 06: SPIKE BRIDGE BUILDER';
    hint = 'DRAG THE MAGNETIC SLABS OVER THE SPIKE CHASM!';
    hazards.push({ x: 90, y: 286, w: 160, h: 14, type: 'SPIKES' });
    platforms.push(
      { id: 'bridge_a', x: 70, y: 140, w: 65, h: 14, isDraggable: true, color: '#00F5D4' },
      { id: 'bridge_b', x: 180, y: 140, w: 65, h: 14, isDraggable: true, color: '#00F5D4' }
    );
    keys.push({ id: 'k1', x: 290, y: 275, taken: false, color: '#39FF14', isDraggable: true });
  } else if (roomIndex === 6) {
    // Room 7: Pull the Power Plug!
    title = 'CHAMBER 07: PULL THE PLUG';
    hint = 'GATE LOCKED? DRAG & YANK THE POWER PLUG FROM WALL!';
    barriers.push({ id: 'b1', x: 240, y: 200, w: 10, h: 100, active: true, color: '#FF0055' });
    plug = { id: 'plug1', x: 65, y: 180, plugged: true };
    exitDoor = { x: 310, y: 254, w: 28, h: 42, locked: false };
  } else {
    // Room 8: Rip the Padlock Off!
    title = 'CHAMBER 08: RIP THE PADLOCK';
    hint = 'NO KEYCARD FOUND? TOUCH & RIP PADLOCK OFF THE DOOR!';
    exitDoor = { x: 310, y: 254, w: 28, h: 42, locked: true };
    padlock = { id: 'pad1', x: 316, y: 268, onDoor: true };
  }

  return {
    title,
    hint,
    playerStart,
    exitDoor,
    platforms,
    crates,
    switches,
    keys,
    plates,
    hazards,
    barriers,
    plug,
    padlock,
  };
}

export default function CyberPathGame({ onBackToHub, onScoreUpdate, isPaused = false }) {
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const { width } = useWindowDimensions();
  const arenaScale = Math.min(1, (width - 24) / GAME_W);

  const juiceRef = useRef(null);
  const [level, setLevel] = useState(1);
  const [roomTitle, setRoomTitle] = useState('TUTORIAL VAULT');
  const [roomHint, setRoomHint] = useState('FIND THE ESCAPE SOLUTION');
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  // Entities state
  const [player, setPlayer] = useState({
    x: 30,
    y: 260,
    vx: 0,
    vy: 0,
    facing: 1, // 1: right, -1: left
    onGround: true,
  });
  const [platforms, setPlatforms] = useState([]);
  const [crates, setCrates] = useState([]);
  const [switches, setSwitches] = useState([]);
  const [keys, setKeys] = useState([]);
  const [plates, setPlates] = useState([]);
  const [hazards, setHazards] = useState([]);
  const [barriers, setBarriers] = useState([]);
  const [exitDoor, setExitDoor] = useState({ x: 310, y: 254, w: 28, h: 42, locked: true });
  const [plug, setPlug] = useState(null);
  const [padlock, setPadlock] = useState(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('VICTORY');
  const [failReason, setFailReason] = useState('');

  // Control inputs
  const inputLeftRef = useRef(false);
  const inputRightRef = useRef(false);
  const animFrameRef = useRef(null);
  const isPlayingRef = useRef(true);
  const draggedEntityRef = useRef(null);

  // Sync refs for 60 FPS physics
  const playerRef = useRef(player);
  playerRef.current = player;
  const cratesRef = useRef(crates);
  cratesRef.current = crates;
  const platformsRef = useRef(platforms);
  platformsRef.current = platforms;
  const switchesRef = useRef(switches);
  switchesRef.current = switches;
  const keysRef = useRef(keys);
  keysRef.current = keys;
  const platesRef = useRef(plates);
  platesRef.current = plates;
  const hazardsRef = useRef(hazards);
  hazardsRef.current = hazards;
  const barriersRef = useRef(barriers);
  barriersRef.current = barriers;
  const exitDoorRef = useRef(exitDoor);
  exitDoorRef.current = exitDoor;
  const plugRef = useRef(plug);
  plugRef.current = plug;
  const padlockRef = useRef(padlock);
  padlockRef.current = padlock;

  // Load level & best score
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

  // Initialize room level
  const initRoom = useCallback((lvl) => {
    isPlayingRef.current = true;
    setModalVisible(false);
    inputLeftRef.current = false;
    inputRightRef.current = false;
    draggedEntityRef.current = null;

    const cfg = getRoomConfig(lvl);
    setRoomTitle(cfg.title);
    setRoomHint(cfg.hint || '');

    const initP = {
      x: cfg.playerStart.x,
      y: cfg.playerStart.y,
      vx: 0,
      vy: 0,
      facing: 1,
      onGround: true,
    };
    setPlayer(initP);
    playerRef.current = initP;

    setPlatforms(cfg.platforms);
    platformsRef.current = cfg.platforms;

    setCrates(cfg.crates);
    cratesRef.current = cfg.crates;

    setSwitches(cfg.switches);
    switchesRef.current = cfg.switches;

    setKeys(cfg.keys);
    keysRef.current = cfg.keys;

    setPlates(cfg.plates);
    platesRef.current = cfg.plates;

    setHazards(cfg.hazards);
    hazardsRef.current = cfg.hazards;

    setBarriers(cfg.barriers);
    barriersRef.current = cfg.barriers;

    setExitDoor(cfg.exitDoor);
    exitDoorRef.current = cfg.exitDoor;

    setPlug(cfg.plug || null);
    plugRef.current = cfg.plug || null;

    setPadlock(cfg.padlock || null);
    padlockRef.current = cfg.padlock || null;
  }, []);

  useEffect(() => {
    initRoom(level);
  }, [level, initRoom]);

  // Interactive Drag & Touch Puzzle Solver PanResponder
  const arenaPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isPlayingRef.current && !isPausedRef.current,
      onMoveShouldSetPanResponder: () => isPlayingRef.current && !isPausedRef.current,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const tx = Math.max(0, Math.min(GAME_W, locationX / arenaScale));
        const ty = Math.max(0, Math.min(GAME_H, locationY / arenaScale));

        // 1. Check Padlock (Room 8)
        const curPadlock = padlockRef.current;
        if (curPadlock && curPadlock.onDoor) {
          if (Math.hypot(tx - curPadlock.x, ty - curPadlock.y) < 32) {
            draggedEntityRef.current = { type: 'PADLOCK', startX: curPadlock.x, startY: curPadlock.y };
            triggerLightHaptic();
            return;
          }
        }

        // 2. Check Power Plug (Room 7)
        const curPlug = plugRef.current;
        if (curPlug && curPlug.plugged) {
          if (Math.hypot(tx - curPlug.x, ty - curPlug.y) < 34) {
            draggedEntityRef.current = { type: 'PLUG', startX: curPlug.x, startY: curPlug.y };
            triggerLightHaptic();
            return;
          }
        }

        // 3. Check Keys
        const curKeys = keysRef.current;
        for (let i = 0; i < curKeys.length; i++) {
          const k = curKeys[i];
          if (!k.taken && Math.hypot(tx - k.x, ty - k.y) < 36) {
            draggedEntityRef.current = { type: 'KEY', id: k.id, offsetX: k.x - tx, offsetY: k.y - ty };
            triggerLightHaptic();
            return;
          }
        }

        // 4. Check Exit Door (if draggable)
        const curDoor = exitDoorRef.current;
        if (curDoor && curDoor.isDraggable) {
          if (
            tx >= curDoor.x - 10 &&
            tx <= curDoor.x + curDoor.w + 10 &&
            ty >= curDoor.y - 10 &&
            ty <= curDoor.y + curDoor.h + 10
          ) {
            draggedEntityRef.current = { type: 'DOOR', offsetX: curDoor.x - tx, offsetY: curDoor.y - ty };
            triggerLightHaptic();
            return;
          }
        }

        // 5. Check Draggable Platforms
        const curPlatforms = platformsRef.current;
        for (let i = 0; i < curPlatforms.length; i++) {
          const p = curPlatforms[i];
          if (p.isDraggable) {
            if (tx >= p.x - 8 && tx <= p.x + p.w + 8 && ty >= p.y - 8 && ty <= p.y + p.h + 8) {
              draggedEntityRef.current = { type: 'PLATFORM', id: p.id, offsetX: p.x - tx, offsetY: p.y - ty };
              triggerLightHaptic();
              return;
            }
          }
        }

        // 6. Check Crates
        const curCrates = cratesRef.current;
        for (let i = 0; i < curCrates.length; i++) {
          const c = curCrates[i];
          if (tx >= c.x - 8 && tx <= c.x + CRATE_SIZE + 8 && ty >= c.y - 8 && ty <= c.y + CRATE_SIZE + 8) {
            draggedEntityRef.current = { type: 'CRATE', id: c.id, offsetX: c.x - tx, offsetY: c.y - ty };
            triggerLightHaptic();
            return;
          }
        }

        // 7. Check Pressure Plates (Finger-Press & Touch Override)
        const curPlates = platesRef.current;
        let platePressed = false;
        for (let i = 0; i < curPlates.length; i++) {
          const pl = curPlates[i];
          if (tx >= pl.x - 18 && tx <= pl.x + pl.w + 18 && ty >= pl.y - 18 && ty <= pl.y + pl.h + 18) {
            pl.pressedByFinger = true;
            pl.overridden = true;
            platePressed = true;
          }
        }
        if (platePressed) {
          setPlates([...curPlates]);
          playTapSound();
          triggerLightHaptic();
        }
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const tx = Math.max(0, Math.min(GAME_W, locationX / arenaScale));
        const ty = Math.max(0, Math.min(GAME_H, locationY / arenaScale));
        const dragged = draggedEntityRef.current;
        if (!dragged) return;

        if (dragged.type === 'KEY') {
          const curKeys = keysRef.current;
          const k = curKeys.find((item) => item.id === dragged.id);
          if (k && !k.taken) {
            k.x = tx + (dragged.offsetX || 0);
            k.y = ty + (dragged.offsetY || 0);
            setKeys([...curKeys]);

            // Dropped onto player check!
            const curPlayer = playerRef.current;
            const distToPlayer = Math.hypot(k.x - (curPlayer.x + PLAYER_W / 2), k.y - (curPlayer.y + PLAYER_H / 2));
            const curDoor = exitDoorRef.current;
            const distToDoor = Math.hypot(k.x - (curDoor.x + curDoor.w / 2), k.y - (curDoor.y + curDoor.h / 2));

            if (distToPlayer < 30 || distToDoor < 34) {
              k.taken = true;
              exitDoorRef.current.locked = false;
              setExitDoor({ ...exitDoorRef.current });
              setKeys([...curKeys]);
              playPerfectSound(4);
              triggerPerfectHaptic(2);
              juiceRef.current?.burst(k.x, k.y, k.color || '#FFD166', 18);
              draggedEntityRef.current = null;
            }
          }
        } else if (dragged.type === 'CRATE') {
          const curCrates = cratesRef.current;
          const c = curCrates.find((item) => item.id === dragged.id);
          if (c) {
            c.x = Math.max(14, Math.min(GAME_W - CRATE_SIZE - 14, tx + (dragged.offsetX || 0)));
            c.y = Math.max(14, Math.min(GAME_H - CRATE_SIZE - 42, ty + (dragged.offsetY || 0)));
            c.vx = 0;
            c.vy = 0;
            setCrates([...curCrates]);
          }
        } else if (dragged.type === 'PLATFORM') {
          const curPlatforms = platformsRef.current;
          const p = curPlatforms.find((item) => item.id === dragged.id);
          if (p) {
            p.x = Math.max(12, Math.min(GAME_W - p.w - 12, tx + (dragged.offsetX || 0)));
            p.y = Math.max(12, Math.min(286, ty + (dragged.offsetY || 0)));
            setPlatforms([...curPlatforms]);
          }
        } else if (dragged.type === 'DOOR') {
          const curDoor = exitDoorRef.current;
          curDoor.x = Math.max(14, Math.min(GAME_W - curDoor.w - 14, tx + (dragged.offsetX || 0)));
          curDoor.y = Math.max(40, Math.min(258, ty + (dragged.offsetY || 0)));
          setExitDoor({ ...curDoor });
        } else if (dragged.type === 'PLUG') {
          const curPlug = plugRef.current;
          if (curPlug && curPlug.plugged) {
            curPlug.x = tx;
            curPlug.y = ty;
            setPlug({ ...curPlug });
            if (Math.abs(tx - dragged.startX) > 35 || Math.abs(ty - dragged.startY) > 25) {
              curPlug.plugged = false;
              setPlug({ ...curPlug });
              const curBarriers = barriersRef.current;
              curBarriers.forEach((b) => (b.active = false));
              setBarriers([...curBarriers]);
              playSliceSound();
              triggerMediumHaptic();
              juiceRef.current?.burst(tx, ty, '#00F5D4', 16);
              draggedEntityRef.current = null;
            }
          }
        } else if (dragged.type === 'PADLOCK') {
          const curPad = padlockRef.current;
          if (curPad && curPad.onDoor) {
            curPad.x = tx;
            curPad.y = ty;
            setPadlock({ ...curPad });
            if (Math.hypot(tx - dragged.startX, ty - dragged.startY) > 40) {
              curPad.onDoor = false;
              setPadlock({ ...curPad });
              exitDoorRef.current.locked = false;
              setExitDoor({ ...exitDoorRef.current });
              playPerfectSound(5);
              triggerPerfectHaptic(3);
              juiceRef.current?.burst(tx, ty, '#FFD166', 22);
              draggedEntityRef.current = null;
            }
          }
        }
      },
      onPanResponderRelease: () => {
        draggedEntityRef.current = null;
        const curPlates = platesRef.current;
        let changed = false;
        for (let i = 0; i < curPlates.length; i++) {
          if (curPlates[i].pressedByFinger && !curPlates[i].overridden) {
            curPlates[i].pressedByFinger = false;
            changed = true;
          }
        }
        if (changed) {
          setPlates([...curPlates]);
        }
      },
    })
  ).current;

  // Jump handler
  const handleJump = useCallback(() => {
    if (isPausedRef.current || !isPlayingRef.current) return;
    const p = playerRef.current;
    if (p.onGround) {
      playTapSound();
      triggerLightHaptic();
      p.vy = JUMP_FORCE;
      p.onGround = false;
      playerRef.current = { ...p };
      setPlayer({ ...p });
    }
  }, []);

  // Fail & Win handlers
  const handleFail = useCallback((reason) => {
    isPlayingRef.current = false;
    triggerGameOverHaptic();
    playGameOverSound();
    if (juiceRef.current) {
      juiceRef.current.shake(14, 10);
      juiceRef.current.flash('#FF3366');
    }
    setFailReason(reason);
    setModalType('GAMEOVER');
    setModalVisible(true);
  }, []);

  const handleWin = useCallback(() => {
    isPlayingRef.current = false;
    triggerPerfectHaptic(3);
    playPerfectSound(8);

    const bonus = 150 + level * 25;
    const nextScore = score + bonus;
    setScore(nextScore);
    updateBest(nextScore);

    if (juiceRef.current) {
      juiceRef.current.celebrate(
        `CHAMBER ${level} ESCAPED!`,
        `+${bonus} PUZZLE BONUS // DOOR OPENED`,
        '#00F5D4'
      );
    }
    setModalType('VICTORY');
    setModalVisible(true);
  }, [level, score, updateBest]);

  const handleNextLevel = () => {
    const nextLvl = level + 1;
    setLevel(nextLvl);
    try {
      AsyncStorage.setItem(STORAGE_LEVEL_KEY, String(nextLvl));
    } catch {}
    initRoom(nextLvl);
  };

  const handleRetry = () => {
    initRoom(level);
  };

  // 60 FPS Room Physics Loop
  useEffect(() => {
    let active = true;

    const tick = () => {
      if (!active) return;
      if (isPausedRef.current || !isPlayingRef.current) {
        animFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      const p = { ...playerRef.current };
      const curPlatforms = platformsRef.current;
      const curCrates = cratesRef.current.map((c) => ({ ...c }));
      const curBarriers = barriersRef.current;
      const curPlates = platesRef.current.map((pl) => ({ ...pl }));
      const curSwitches = switchesRef.current.map((sw) => ({ ...sw }));
      const curKeys = keysRef.current.map((k) => ({ ...k }));
      const curDoor = { ...exitDoorRef.current };

      // Horizontal player input
      let moveVx = 0;
      if (inputLeftRef.current) {
        moveVx -= MOVE_SPEED;
        p.facing = -1;
      }
      if (inputRightRef.current) {
        moveVx += MOVE_SPEED;
        p.facing = 1;
      }
      p.vx = moveVx;

      // Vertical gravity
      p.vy += GRAVITY;

      // Solid collision obstacles: platforms + solid active barriers (if not a bridge or if bridge active)
      const solids = [...curPlatforms];
      curBarriers.forEach((b) => {
        if (b.isBridge) {
          // If bridge is activated by switch, it acts as a platform
          const swActive = curSwitches.some((s) => s.active);
          if (swActive) solids.push({ x: b.x, y: b.y, w: b.w, h: b.h });
        } else if (b.active) {
          // Solid barrier
          solids.push({ x: b.x, y: b.y, w: b.w, h: b.h });
        }
      });

      // 1. Move Player X & Check Crate Pushing / Wall collisions
      let nextPx = p.x + p.vx;
      let playerRectX = { x: nextPx, y: p.y, w: PLAYER_W, h: PLAYER_H };

      // Check solids X
      for (let s of solids) {
        if (
          playerRectX.x < s.x + s.w &&
          playerRectX.x + playerRectX.w > s.x &&
          playerRectX.y < s.y + s.h &&
          playerRectX.y + playerRectX.h > s.y
        ) {
          // Solid block
          if (p.vx > 0) nextPx = s.x - PLAYER_W;
          else if (p.vx < 0) nextPx = s.x + s.w;
        }
      }

      // Check Pushable Crates X
      for (let c of curCrates) {
        if (
          nextPx < c.x + CRATE_SIZE &&
          nextPx + PLAYER_W > c.x &&
          p.y < c.y + CRATE_SIZE &&
          p.y + PLAYER_H > c.y
        ) {
          // Push crate horizontally
          const pushDir = p.vx > 0 ? 1 : -1;
          const targetCx = c.x + pushDir * MOVE_SPEED * 0.75;

          // Check if crate hits solids
          let canPush = true;
          for (let s of solids) {
            if (
              targetCx < s.x + s.w &&
              targetCx + CRATE_SIZE > s.x &&
              c.y < s.y + s.h &&
              c.y + CRATE_SIZE > s.y
            ) {
              canPush = false;
              break;
            }
          }

          if (canPush) {
            c.x = targetCx;
            triggerLightHaptic();
            if (pushDir > 0) nextPx = c.x - PLAYER_W;
            else nextPx = c.x + CRATE_SIZE;
          } else {
            if (pushDir > 0) nextPx = c.x - PLAYER_W;
            else nextPx = c.x + CRATE_SIZE;
          }
        }
      }
      p.x = nextPx;

      // 2. Move Player Y & Solid collisions
      let nextPy = p.y + p.vy;
      let onFloor = false;

      // Check solids Y
      for (let s of solids) {
        if (
          p.x < s.x + s.w &&
          p.x + PLAYER_W > s.x &&
          nextPy < s.y + s.h &&
          nextPy + PLAYER_H > s.y
        ) {
          if (p.vy > 0) {
            // Landing on solid floor
            nextPy = s.y - PLAYER_H;
            p.vy = 0;
            onFloor = true;
          } else if (p.vy < 0) {
            // Hitting ceiling
            nextPy = s.y + s.h;
            p.vy = 0;
          }
        }
      }

      // Check Crates Y (Can stand on top of crates!)
      for (let c of curCrates) {
        if (
          p.x < c.x + CRATE_SIZE &&
          p.x + PLAYER_W > c.x &&
          nextPy < c.y + CRATE_SIZE &&
          nextPy + PLAYER_H > c.y
        ) {
          if (p.vy > 0) {
            nextPy = c.y - PLAYER_H;
            p.vy = 0;
            onFloor = true;
          } else if (p.vy < 0) {
            nextPy = c.y + CRATE_SIZE;
            p.vy = 0;
          }
        }
      }
      p.y = nextPy;
      p.onGround = onFloor;

      // 3. Crate Gravity & Floor Collisions
      for (let c of curCrates) {
        c.vy = (c.vy || 0) + GRAVITY;
        let nextCy = c.y + c.vy;

        for (let s of solids) {
          if (
            c.x < s.x + s.w &&
            c.x + CRATE_SIZE > s.x &&
            nextCy < s.y + s.h &&
            nextCy + CRATE_SIZE > s.y
          ) {
            if (c.vy > 0) {
              nextCy = s.y - CRATE_SIZE;
              c.vy = 0;
            }
          }
        }
        c.y = nextCy;
      }

      // 4. Pressure Plates Check (Triggered by player OR crates)
      let platesUpdated = false;
      for (let pl of curPlates) {
        const isPlayerOn =
          p.x + PLAYER_W > pl.x &&
          p.x < pl.x + pl.w &&
          p.y + PLAYER_H >= pl.y - 2 &&
          p.y + PLAYER_H <= pl.y + 12;

        const isCrateOn = curCrates.some(
          (c) =>
            c.x + CRATE_SIZE > pl.x &&
            c.x < pl.x + pl.w &&
            c.y + CRATE_SIZE >= pl.y - 2 &&
            c.y + CRATE_SIZE <= pl.y + 12
        );

        const pressed = isPlayerOn || isCrateOn || Boolean(pl.pressedByFinger) || Boolean(pl.overridden);
        if (pressed !== pl.pressed) {
          pl.pressed = pressed;
          platesUpdated = true;
          triggerMediumHaptic();
          playTapSound();
          if (juiceRef.current && pressed) {
            juiceRef.current.burst(pl.x + pl.w / 2, pl.y, '#00F5FF', 8);
          }
        }
      }
      if (platesUpdated) {
        platesRef.current = curPlates;
        setPlates([...curPlates]);
      }

      // 5. Switches Interaction (Touched by player)
      for (let sw of curSwitches) {
        if (!sw.active) {
          const dist = Math.hypot(p.x + PLAYER_W / 2 - sw.x, p.y + PLAYER_H / 2 - sw.y);
          if (dist < 28) {
            sw.active = true;
            playTapSound();
            triggerPerfectHaptic(2);
            if (juiceRef.current) {
              juiceRef.current.flash('#39FF14');
              juiceRef.current.burst(sw.x, sw.y, '#39FF14', 12);
            }
            switchesRef.current = curSwitches;
            setSwitches([...curSwitches]);

            // Deactivate laser barriers associated with switch
            curBarriers.forEach((b) => {
              if (!b.isBridge) b.active = false;
            });
            barriersRef.current = [...curBarriers];
            setBarriers([...curBarriers]);
          }
        }
      }

      // 6. Keys Collection
      for (let k of curKeys) {
        if (!k.taken) {
          const dist = Math.hypot(p.x + PLAYER_W / 2 - k.x, p.y + PLAYER_H / 2 - k.y);
          if (dist < 26) {
            k.taken = true;
            playTapSound();
            triggerPerfectHaptic(1);
            if (juiceRef.current) {
              juiceRef.current.burst(k.x, k.y, k.color, 14);
            }
            keysRef.current = [...curKeys];
            setKeys([...curKeys]);
          }
        }
      }

      // 7. Check Exit Door Unlock Condition
      const allKeysCollected = curKeys.every((k) => k.taken);
      const allPlatesPressed = curPlates.length === 0 || curPlates.every((pl) => pl.pressed);
      const allSwitchesActive = curSwitches.length === 0 || curSwitches.every((sw) => sw.active);
      const curPad = padlockRef.current;
      const padlockCleared = !curPad || !curPad.onDoor;

      const isUnlocked =
        Boolean(curDoor.permanentlyUnlocked) ||
        (allKeysCollected && allPlatesPressed && allSwitchesActive && padlockCleared);

      if (isUnlocked && curDoor.locked) {
        curDoor.locked = false;
        curDoor.permanentlyUnlocked = true;
        exitDoorRef.current = curDoor;
        setExitDoor({ ...curDoor });
        playSliceSound();
        triggerPerfectHaptic(2);
        if (juiceRef.current) {
          juiceRef.current.burst(curDoor.x + 14, curDoor.y + 20, '#00F5D4', 22);
          juiceRef.current.flash('#00F5D4');
        }
      }

      // 8. Player Enters Exit Door
      if (!curDoor.locked) {
        const inDoor =
          p.x + PLAYER_W > curDoor.x + 6 &&
          p.x < curDoor.x + curDoor.w - 6 &&
          p.y + PLAYER_H >= curDoor.y + 10 &&
          p.y <= curDoor.y + curDoor.h;
        if (inDoor) {
          handleWin();
          return;
        }
      }

      // 9. Hazard Collision (Spikes, Laser beams)
      for (let h of hazardsRef.current) {
        if (
          p.x + PLAYER_W > h.x &&
          p.x < h.x + h.w &&
          p.y + PLAYER_H > h.y + 2 &&
          p.y < h.y + h.h
        ) {
          handleFail('IMPALED BY SECURITY SPIKES!');
          return;
        }
      }

      // Fall off bottom check
      if (p.y > GAME_H + 30) {
        handleFail('FALLEN INTO THE ABYSS!');
        return;
      }

      playerRef.current = p;
      setPlayer(p);
      cratesRef.current = curCrates;
      setCrates(curCrates);

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [handleWin, handleFail]);

  // Touch button controls (Supports concurrent multi-touch run + jump)
  const [isLeftActive, setIsLeftActive] = useState(false);
  const [isRightActive, setIsRightActive] = useState(false);
  const [isJumpActive, setIsJumpActive] = useState(false);

  const handleLeftDown = () => {
    inputLeftRef.current = true;
    setIsLeftActive(true);
  };
  const handleLeftUp = () => {
    inputLeftRef.current = false;
    setIsLeftActive(false);
  };
  const handleRightDown = () => {
    inputRightRef.current = true;
    setIsRightActive(true);
  };
  const handleRightUp = () => {
    inputRightRef.current = false;
    setIsRightActive(false);
  };
  const handleJumpDown = () => {
    setIsJumpActive(true);
    handleJump();
  };
  const handleJumpUp = () => {
    setIsJumpActive(false);
  };

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={styles.container}>
        <MiniGameHeader
          title="CHAMBER ESCAPE"
          category="PUZZLE PLATFORMER"
          accentColor="#00F5FF"
          score={score}
          onBack={onBackToHub}
          onBackToHub={onBackToHub}
        />

        {/* Level & Objective HUD */}
        <View style={styles.topHudWrapper}>
          <View style={styles.topHudRow}>
            <View style={styles.stageBox}>
              <Text style={styles.stageNum}>ROOM {level}</Text>
              <Text style={styles.stageTitle}>{roomTitle}</Text>
            </View>

            <View style={styles.statusRow}>
              {keys.length > 0 && (
                <View style={styles.hudBadge}>
                  <Text style={styles.hudBadgeText}>
                    🔑 {keys.filter((k) => k.taken).length}/{keys.length}
                  </Text>
                </View>
              )}
              <View
                style={[
                  styles.hudBadge,
                  { borderColor: exitDoor.locked ? '#FF3366' : '#00F5D4' },
                ]}
              >
                <Text
                  style={[
                    styles.hudBadgeText,
                    { color: exitDoor.locked ? '#FF3366' : '#00F5D4' },
                  ]}
                >
                  {exitDoor.locked ? '🔒 LOCKED' : '🔓 ESCAPE!'}
                </Text>
              </View>
            </View>
          </View>

          {/* Puzzle Hint Banner */}
          {roomHint ? (
            <View style={styles.hintBanner}>
              <Text style={styles.hintBannerText}>💡 {roomHint}</Text>
            </View>
          ) : null}
        </View>

        {/* Room Arena with Interactive Touch/Drag */}
        <View style={styles.arenaWrapper}>
          <View
            style={[
              styles.arena,
              {
                width: GAME_W * arenaScale,
                height: GAME_H * arenaScale,
                transform: [{ scale: arenaScale }],
              },
            ]}
            {...arenaPanResponder.panHandlers}
          >
            <Svg width={GAME_W} height={GAME_H} style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id="wallGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#121828" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#080C14" stopOpacity="1" />
                </LinearGradient>
                <LinearGradient id="crateGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor="#D97706" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#78350F" stopOpacity="1" />
                </LinearGradient>
              </Defs>

              {/* Background Chamber Grid */}
              <Rect x={0} y={0} width={GAME_W} height={GAME_H} fill="#060810" />

              {/* Solid Platforms & Walls */}
              {platforms.map((p, idx) => (
                <G key={`plt_${idx}`}>
                  <Rect
                    x={p.x}
                    y={p.y}
                    width={p.w}
                    height={p.h}
                    fill="url(#wallGrad)"
                    stroke="rgba(0, 245, 255, 0.4)"
                    strokeWidth={1.5}
                    rx={3}
                  />
                  {/* Top neon edge highlight */}
                  <Line
                    x1={p.x}
                    y1={p.y}
                    x2={p.x + p.w}
                    y2={p.y}
                    stroke="#00F5FF"
                    strokeWidth={2}
                  />
                </G>
              ))}

              {/* Spikes / Hazards */}
              {hazards.map((hz, idx) => {
                const count = Math.floor(hz.w / 12);
                const spikePath = [];
                for (let i = 0; i < count; i++) {
                  const sx = hz.x + i * 12;
                  spikePath.push(`M${sx},${hz.y + hz.h} L${sx + 6},${hz.y} L${sx + 12},${hz.y + hz.h} Z`);
                }
                return (
                  <Path
                    key={`hz_${idx}`}
                    d={spikePath.join(' ')}
                    fill="#FF0055"
                    stroke="#FFFFFF"
                    strokeWidth={1}
                  />
                );
              })}

              {/* Laser Barriers / Energy Bridges */}
              {barriers.map((b) => {
                const isSwActive = switches.some((s) => s.active);
                if (b.isBridge) {
                  return (
                    <Rect
                      key={b.id}
                      x={b.x}
                      y={b.y}
                      width={b.w}
                      height={b.h}
                      fill={isSwActive ? '#00F5D4' : 'transparent'}
                      stroke={isSwActive ? '#00F5D4' : 'rgba(0, 245, 212, 0.25)'}
                      strokeWidth={1.5}
                      strokeDasharray={isSwActive ? undefined : '4 3'}
                      rx={3}
                    />
                  );
                }
                if (!b.active) return null;
                return (
                  <G key={b.id}>
                    <Rect
                      x={b.x}
                      y={b.y}
                      width={b.w}
                      height={b.h}
                      fill="#FF0055"
                      stroke="#FFFFFF"
                      strokeWidth={1}
                      rx={2}
                    />
                    <Line
                      x1={b.x + b.w / 2}
                      y1={b.y}
                      x2={b.x + b.w / 2}
                      y2={b.y + b.h}
                      stroke="#FFFFFF"
                      strokeWidth={2}
                      strokeDasharray="4 2"
                    />
                  </G>
                );
              })}

              {/* Pressure Plates */}
              {plates.map((pl) => (
                <G key={pl.id}>
                  <Rect
                    x={pl.x}
                    y={pl.y + (pl.pressed ? 3 : 0)}
                    width={pl.w}
                    height={pl.h - (pl.pressed ? 3 : 0)}
                    fill={pl.pressed ? '#00F5D4' : '#FF0055'}
                    rx={2}
                  />
                  <Line
                    x1={pl.x + 4}
                    y1={pl.y + (pl.pressed ? 3 : 0)}
                    x2={pl.x + pl.w - 4}
                    y2={pl.y + (pl.pressed ? 3 : 0)}
                    stroke="#FFFFFF"
                    strokeWidth={1.5}
                  />
                </G>
              ))}

              {/* Switches / Levers */}
              {switches.map((sw) => (
                <G key={sw.id} transform={`translate(${sw.x}, ${sw.y})`}>
                  <Rect x={-10} y={-12} width={20} height={24} fill="#141E2E" stroke="#00F5FF" strokeWidth={1.5} rx={4} />
                  <Circle cx={0} cy={sw.active ? -3 : 3} r={6} fill={sw.active ? '#39FF14' : '#FF0055'} />
                </G>
              ))}

              {/* Golden Keys (Draggable by finger!) */}
              {keys.map((k) => {
                if (k.taken) return null;
                return (
                  <G key={k.id} transform={`translate(${k.x}, ${k.y})`}>
                    {k.isDraggable && (
                      <Circle cx={0} cy={2} r={16} stroke={k.color} strokeWidth={1.5} strokeDasharray="3 2" opacity={0.75} />
                    )}
                    <Circle cx={0} cy={-5} r={5} stroke={k.color} strokeWidth={2} fill="none" />
                    <Line x1={0} y1={0} x2={0} y2={10} stroke={k.color} strokeWidth={2.5} />
                    <Line x1={0} y1={4} x2={4} y2={4} stroke={k.color} strokeWidth={2} />
                    <Line x1={0} y1={8} x2={3} y2={8} stroke={k.color} strokeWidth={2} />
                  </G>
                );
              })}

              {/* Pushable / Draggable Crates */}
              {crates.map((c) => (
                <G key={c.id}>
                  <Rect
                    x={c.x}
                    y={c.y}
                    width={CRATE_SIZE}
                    height={CRATE_SIZE}
                    fill="url(#crateGrad)"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    rx={4}
                  />
                  {/* Cross braces on crate */}
                  <Line x1={c.x + 3} y1={c.y + 3} x2={c.x + CRATE_SIZE - 3} y2={c.y + CRATE_SIZE - 3} stroke="#FCD34D" strokeWidth={1.5} />
                  <Line x1={c.x + CRATE_SIZE - 3} y1={c.y + 3} x2={c.x + 3} y2={c.y + CRATE_SIZE - 3} stroke="#FCD34D" strokeWidth={1.5} />
                  {/* Draggable center handle dot */}
                  <Circle cx={c.x + CRATE_SIZE / 2} cy={c.y + CRATE_SIZE / 2} r={3.5} fill="#FFFFFF" opacity={0.8} />
                </G>
              ))}

              {/* Interactive Power Plug (Room 7) */}
              {plug && (
                <G>
                  <Rect x={48} y={168} width={14} height={20} fill="#141E28" stroke="#00F5FF" strokeWidth={1.5} rx={3} />
                  <Path
                    d={`M${plug.x},${plug.y} Q${(plug.x + 240) / 2},${plug.y + 35} 240,240`}
                    stroke={plug.plugged ? '#00F5FF' : '#556677'}
                    strokeWidth={2.5}
                    fill="none"
                    strokeDasharray={plug.plugged ? undefined : '4 3'}
                  />
                  <Rect x={plug.x - 9} y={plug.y - 9} width={18} height={18} fill="#FFE600" stroke="#FFFFFF" strokeWidth={1.5} rx={4} />
                  <Circle cx={plug.x} cy={plug.y} r={3.5} fill="#000000" />
                </G>
              )}

              {/* Exit Door */}
              <G transform={`translate(${exitDoor.x}, ${exitDoor.y})`}>
                <Rect
                  x={0}
                  y={0}
                  width={exitDoor.w}
                  height={exitDoor.h}
                  fill={exitDoor.locked ? '#1A0C16' : '#082522'}
                  stroke={exitDoor.locked ? '#FF0055' : '#00F5D4'}
                  strokeWidth={2.5}
                  rx={6}
                />
                {/* Door arch and center light */}
                <Circle
                  cx={exitDoor.w / 2}
                  cy={exitDoor.h / 2}
                  r={exitDoor.locked ? 4 : 7}
                  fill={exitDoor.locked ? '#FF0055' : '#00F5D4'}
                />
                {exitDoor.isDraggable && (
                  <Circle cx={exitDoor.w / 2} cy={8} r={3} fill="#FFE600" />
                )}
              </G>

              {/* Giant Padlock on Door (Room 8) */}
              {padlock && (
                <G transform={`translate(${padlock.x}, ${padlock.y})`}>
                  <Path
                    d="M-5,-4 C-5,-14 5,-14 5,-4"
                    stroke={padlock.onDoor ? '#FFE600' : '#8899AA'}
                    strokeWidth={3}
                    fill="none"
                  />
                  <Rect x={-8} y={-4} width={16} height={14} fill="#F59E0B" stroke="#FFFFFF" strokeWidth={1.5} rx={3} />
                  <Circle cx={0} cy={3} r={2} fill="#000000" />
                </G>
              )}

              {/* Player Character */}
              <G transform={`translate(${player.x}, ${player.y})`}>
                {/* Cyber Runner Body */}
                <Rect
                  x={2}
                  y={6}
                  width={PLAYER_W - 4}
                  height={PLAYER_H - 12}
                  fill="#00F5FF"
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                  rx={4}
                />
                {/* Cyber Helmet */}
                <Circle cx={PLAYER_W / 2} cy={5} r={7} fill="#141E30" stroke="#00F5FF" strokeWidth={1.5} />
                {/* Visor glowing in facing direction */}
                <Rect
                  x={player.facing === 1 ? PLAYER_W / 2 : 2}
                  y={3}
                  width={7}
                  height={4}
                  fill="#39FF14"
                  rx={2}
                />
                {/* Legs */}
                <Line x1={5} y1={PLAYER_H - 6} x2={5} y2={PLAYER_H} stroke="#00F5FF" strokeWidth={3} strokeLinecap="round" />
                <Line x1={PLAYER_W - 5} y1={PLAYER_H - 6} x2={PLAYER_W - 5} y2={PLAYER_H} stroke="#00F5FF" strokeWidth={3} strokeLinecap="round" />
              </G>
            </Svg>
          </View>
        </View>

        {/* On-Screen Touch D-PAD & Jump Controls (Supports simultaneous Multi-Touch Running + Jumping) */}
        <View style={styles.controlsBar}>
          <View style={styles.dpadRow}>
            <View
              onTouchStart={handleLeftDown}
              onTouchEnd={handleLeftUp}
              onTouchCancel={handleLeftUp}
              style={[
                styles.ctrlBtn,
                isLeftActive && styles.ctrlBtnPressed,
              ]}
            >
              <Text style={styles.ctrlBtnText}>◀</Text>
            </View>

            <View
              onTouchStart={handleRightDown}
              onTouchEnd={handleRightUp}
              onTouchCancel={handleRightUp}
              style={[
                styles.ctrlBtn,
                isRightActive && styles.ctrlBtnPressed,
              ]}
            >
              <Text style={styles.ctrlBtnText}>▶</Text>
            </View>
          </View>

          <View
            onTouchStart={handleJumpDown}
            onTouchEnd={handleJumpUp}
            onTouchCancel={handleJumpUp}
            style={[
              styles.jumpBtn,
              isJumpActive && styles.jumpBtnPressed,
            ]}
          >
            <Text style={styles.jumpBtnText}>▲ JUMP</Text>
          </View>
        </View>

        <GameResultModal
          visible={modalVisible}
          type={modalType}
          title={modalType === 'VICTORY' ? `ROOM ${level} CLEARED!` : 'CHAMBER CONTAINED!'}
          subtitle={
            modalType === 'VICTORY'
              ? 'SECURITY OVERRIDDEN // NEXT VAULT UNLOCKED'
              : failReason || 'VAULT PROTOCOL BREACH'
          }
          score={score}
          bestScore={bestScore}
          accentColor={modalType === 'VICTORY' ? '#00F5D4' : '#FF3366'}
          onRetry={modalType === 'VICTORY' ? handleNextLevel : handleRetry}
          retryLabel={modalType === 'VICTORY' ? 'NEXT CHAMBER' : 'RETRY VAULT'}
          onBackToHub={onBackToHub}
        />
      </View>
    </JuiceEngine>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#04060C',
  },
  topHudWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: 'rgba(8, 12, 22, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 245, 255, 0.2)',
  },
  topHudRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hintBanner: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 230, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 230, 0, 0.35)',
    alignSelf: 'flex-start',
  },
  hintBannerText: {
    fontFamily: monoFont,
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFE600',
    letterSpacing: 0.5,
  },
  stageBox: {
    flexDirection: 'column',
  },
  stageNum: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '900',
    color: '#00F5FF',
    letterSpacing: 1,
  },
  stageTitle: {
    fontFamily: monoFont,
    fontSize: 12.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hudBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  hudBadgeText: {
    fontFamily: monoFont,
    fontSize: 10.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  arenaWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arena: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 245, 255, 0.35)',
  },
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 14,
    backgroundColor: 'rgba(6, 10, 20, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 245, 255, 0.15)',
  },
  dpadRow: {
    flexDirection: 'row',
    gap: 12,
  },
  ctrlBtn: {
    width: 60,
    height: 54,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 26, 44, 0.9)',
    borderWidth: 1.5,
    borderColor: '#00F5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctrlBtnPressed: {
    backgroundColor: 'rgba(0, 245, 255, 0.3)',
  },
  ctrlBtnText: {
    fontSize: 22,
    color: '#00F5FF',
    fontWeight: '900',
  },
  jumpBtn: {
    paddingHorizontal: 28,
    height: 54,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 245, 212, 0.18)',
    borderWidth: 1.5,
    borderColor: '#00F5D4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jumpBtnPressed: {
    backgroundColor: 'rgba(0, 245, 212, 0.4)',
  },
  jumpBtnText: {
    fontFamily: monoFont,
    fontSize: 14,
    fontWeight: '900',
    color: '#00F5D4',
    letterSpacing: 1,
  },
});
