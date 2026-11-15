import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Ellipse,
  Polygon,
  Text as SvgText,
} from 'react-native-svg';
import MiniGameHeader from '../components/MiniGameHeader';
import JuiceEngine from '../components/JuiceEngine';
import GameResultModal from '../components/GameResultModal';
import LevelWarpModal from '../components/LevelWarpModal';
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
import { getGeneratedRoom } from '../data/chamberLevels';

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
const JUMP_FORCE = -9.2;

const PLAYER_W = 20;
const PLAYER_H = 28;
const CRATE_SIZE = 26;

/**
 * 100 Strictly Unique Hand-Crafted Puzzle Escape Chambers
 * All 100 levels authored with escalating difficulty and zero repeated tricks.
 */
function getRoomConfig(lvl) {
  return getGeneratedRoom(lvl);
}

export default function CyberPathGame({ onBackToHub, onScoreUpdate, isPaused = false }) {
  const isPausedRef = useRef(isPaused);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const { width, height } = useWindowDimensions();
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

  // New Interactive Chamber Puzzle Entities
  const [springs, setSprings] = useState([]);
  const [fans, setFans] = useState([]);
  const [portals, setPortals] = useState([]);
  const [battery, setBattery] = useState(null);
  const [socket, setSocket] = useState(null);
  const [receptors, setReceptors] = useState([]);
  const [gravityInverted, setGravityInverted] = useState(false);

  // Dedicated Novel Puzzle Systems
  const [shovel, setShovel] = useState(null);
  const [dirtBlocks, setDirtBlocks] = useState([]);
  const [earthquake, setEarthquake] = useState(null);
  const [windowObj, setWindowObj] = useState(null);
  const [windActive, setWindActive] = useState(false);
  const [guard, setGuard] = useState(null);
  const [hintHeartActive, setHintHeartActive] = useState(false);
  const [hudKeyDraggableActive, setHudKeyDraggableActive] = useState(false);
  const [gun, setGun] = useState(null);
  const [bullet, setBullet] = useState(null);
  const [rotatableSpikes, setRotatableSpikes] = useState(null);
  const [gravityRotateMode, setGravityRotateMode] = useState(false);
  const [gravityTiltable, setGravityTiltable] = useState(false);
  const [reversedControls, setReversedControls] = useState(false);
  const [showLevelWarp, setShowLevelWarp] = useState(false);
  const [draggingHeartPos, setDraggingHeartPos] = useState(null);
  const draggingHeartPosRef = useRef(null);
  const arenaBoundsRef = useRef(null);
  const arenaViewRef = useRef(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('VICTORY');
  const [failReason, setFailReason] = useState('');

  // Control inputs
  const inputLeftRef = useRef(false);
  const inputRightRef = useRef(false);
  const animFrameRef = useRef(null);
  const isPlayingRef = useRef(true);
  const draggedEntityRef = useRef(null);
  const portalCooldownRef = useRef(0);

  // Sync refs for 60 FPS physics
  const playerRef = useRef(player);
  const cratesRef = useRef(crates);
  const platformsRef = useRef(platforms);
  const switchesRef = useRef(switches);
  const keysRef = useRef(keys);
  const platesRef = useRef(plates);
  const hazardsRef = useRef(hazards);
  const barriersRef = useRef(barriers);
  const exitDoorRef = useRef(exitDoor);
  const plugRef = useRef(plug);
  const padlockRef = useRef(padlock);
  const springsRef = useRef(springs);
  const fansRef = useRef(fans);
  const portalsRef = useRef(portals);
  const batteryRef = useRef(battery);
  const socketRef = useRef(socket);
  const receptorsRef = useRef(receptors);
  const gravityInvertedRef = useRef(gravityInverted);
  const shovelRef = useRef(shovel);
  const dirtBlocksRef = useRef(dirtBlocks);
  const earthquakeRef = useRef(earthquake);
  const windowObjRef = useRef(windowObj);
  const guardRef = useRef(guard);
  const gunRef = useRef(gun);
  const bulletRef = useRef(bullet);
  const rotatableSpikesRef = useRef(rotatableSpikes);
  const gravityTiltableRef = useRef(gravityTiltable);
  const reversedControlsRef = useRef(reversedControls);

  // Sync refs in useEffect to cleanly comply with React rules
  useEffect(() => {
    playerRef.current = player;
    cratesRef.current = crates;
    platformsRef.current = platforms;
    switchesRef.current = switches;
    keysRef.current = keys;
    platesRef.current = plates;
    hazardsRef.current = hazards;
    barriersRef.current = barriers;
    exitDoorRef.current = exitDoor;
    plugRef.current = plug;
    padlockRef.current = padlock;
    springsRef.current = springs;
    fansRef.current = fans;
    portalsRef.current = portals;
    batteryRef.current = battery;
    socketRef.current = socket;
    receptorsRef.current = receptors;
    gravityInvertedRef.current = gravityInverted;
    shovelRef.current = shovel;
    dirtBlocksRef.current = dirtBlocks;
    earthquakeRef.current = earthquake;
    windowObjRef.current = windowObj;
    guardRef.current = guard;
    gunRef.current = gun;
    bulletRef.current = bullet;
    rotatableSpikesRef.current = rotatableSpikes;
    gravityTiltableRef.current = gravityTiltable;
    reversedControlsRef.current = reversedControls;
  }, [
    player,
    crates,
    platforms,
    switches,
    keys,
    plates,
    hazards,
    barriers,
    exitDoor,
    plug,
    padlock,
    springs,
    fans,
    portals,
    battery,
    socket,
    receptors,
    gravityInverted,
    shovel,
    dirtBlocks,
    earthquake,
    windowObj,
    guard,
    gun,
    bullet,
    rotatableSpikes,
    gravityTiltable,
    reversedControls,
  ]);

  // Initialize room level
  const initRoom = useCallback(
    (lvl) => {
      isPlayingRef.current = true;
      setModalVisible(false);
      inputLeftRef.current = false;
      inputRightRef.current = false;
      draggedEntityRef.current = null;
      portalCooldownRef.current = 0;

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

      setPlatforms(cfg.platforms || []);
      platformsRef.current = cfg.platforms || [];

      setCrates(cfg.crates || []);
      cratesRef.current = cfg.crates || [];

      setSwitches(cfg.switches || []);
      switchesRef.current = cfg.switches || [];

      setKeys(cfg.keys || []);
      keysRef.current = cfg.keys || [];

      setPlates(cfg.plates || []);
      platesRef.current = cfg.plates || [];

      setHazards(cfg.hazards || []);
      hazardsRef.current = cfg.hazards || [];

      setBarriers(cfg.barriers || []);
      barriersRef.current = cfg.barriers || [];

      const doorObj = {
        ...cfg.exitDoor,
        permanentlyUnlocked: false,
        isFalling: false,
        vy: 0,
        vx: 0,
      };
      setExitDoor(doorObj);
      exitDoorRef.current = doorObj;

      setPlug(cfg.plug || null);
      plugRef.current = cfg.plug || null;

      setPadlock(cfg.padlock || null);
      padlockRef.current = cfg.padlock || null;

      setSprings(cfg.springs || []);
      springsRef.current = cfg.springs || [];

      setFans(cfg.fans || []);
      fansRef.current = cfg.fans || [];

      setPortals(cfg.portals || []);
      portalsRef.current = cfg.portals || [];

      setBattery(cfg.battery || null);
      batteryRef.current = cfg.battery || null;

      setSocket(cfg.socket || null);
      socketRef.current = cfg.socket || null;

      setReceptors(cfg.receptors || []);
      receptorsRef.current = cfg.receptors || [];

      setGravityInverted(Boolean(cfg.gravityInverted));
      gravityInvertedRef.current = Boolean(cfg.gravityInverted);

      setShovel(cfg.shovel || null);
      shovelRef.current = cfg.shovel || null;

      setDirtBlocks(cfg.dirtBlocks || []);
      dirtBlocksRef.current = cfg.dirtBlocks || [];

      setEarthquake(cfg.earthquake ? { ...cfg.earthquake } : null);
      earthquakeRef.current = cfg.earthquake ? { ...cfg.earthquake } : null;

      setWindowObj(cfg.windowObj ? { ...cfg.windowObj } : null);
      windowObjRef.current = cfg.windowObj ? { ...cfg.windowObj } : null;
      setWindActive(false);

      setGuard(cfg.guard ? { ...cfg.guard } : null);
      guardRef.current = cfg.guard ? { ...cfg.guard } : null;

      setHintHeartActive(Boolean(cfg.hintHeart));
      setDraggingHeartPos(null);
      draggingHeartPosRef.current = null;
      setHudKeyDraggableActive(Boolean(cfg.hudKeyDraggable));

      setGun(cfg.gun ? { ...cfg.gun } : null);
      gunRef.current = cfg.gun ? { ...cfg.gun } : null;
      setBullet(null);
      bulletRef.current = null;

      setRotatableSpikes(cfg.rotatableSpikes ? { ...cfg.rotatableSpikes } : null);
      rotatableSpikesRef.current = cfg.rotatableSpikes ? { ...cfg.rotatableSpikes } : null;

      setGravityRotateMode(Boolean(cfg.gravityRotateMode));
      setGravityTiltable(Boolean(cfg.gravityTiltable));
      gravityTiltableRef.current = Boolean(cfg.gravityTiltable);

      setReversedControls(Boolean(cfg.reversedControls));
      reversedControlsRef.current = Boolean(cfg.reversedControls);
    },
    [
      setRoomTitle,
      setRoomHint,
      setPlayer,
      setPlatforms,
      setCrates,
      setSwitches,
      setKeys,
      setPlates,
      setHazards,
      setBarriers,
      setExitDoor,
      setPlug,
      setPadlock,
      setSprings,
      setFans,
      setPortals,
      setBattery,
      setSocket,
      setReceptors,
      setGravityInverted,
      setModalVisible,
    ]
  );

  // Load level & best score
  useEffect(() => {
    (async () => {
      let initialLvl = 1;
      try {
        const savedLvl = await AsyncStorage.getItem(STORAGE_LEVEL_KEY);
        const savedScore = await AsyncStorage.getItem(STORAGE_BEST_KEY);
        if (savedLvl !== null) {
          const pLvl = parseInt(savedLvl, 10);
          if (!isNaN(pLvl) && pLvl >= 1) {
            initialLvl = pLvl;
            setLevel(pLvl);
          }
        }
        if (savedScore !== null) {
          const pScore = parseInt(savedScore, 10);
          if (!isNaN(pScore)) setBestScore(pScore);
        }
      } catch {}
      initRoom(initialLvl);
    })();
  }, [initRoom]);

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

  // Dedicated Novel Puzzle Interaction Handlers
  const handleRotateGravity = useCallback(() => {
    playSliceSound();
    triggerMediumHaptic();
    if (juiceRef.current) {
      juiceRef.current.shake(12, 10);
    }
    const nextInv = !gravityInvertedRef.current;
    gravityInvertedRef.current = nextInv;
    setGravityInverted(nextInv);

    // If on rail (Level 9), heavy door slides down rail with real physics!
    if (gravityTiltableRef.current) {
      const curDoor = { ...exitDoorRef.current };
      curDoor.isFalling = true;
      curDoor.targetY = 254;
      curDoor.targetX = 290;
      curDoor.vy = 0.8;
      curDoor.vx = -1.0;
      exitDoorRef.current = curDoor;
      setExitDoor(curDoor);
    }
  }, []);

  const handleHealGuardWithHeart = useCallback(() => {
    const curG = guardRef.current;
    if (curG && !curG.healed) {
      curG.healed = true;
      curG.speech = 'KEY REVEALED!';
      guardRef.current = { ...curG };
      setGuard({ ...curG });
      // Reveal the key!
      const newKey = { id: 'guard_k', x: curG.x + 35, y: 275, taken: false, color: '#FFD166' };
      keysRef.current = [newKey];
      setKeys([newKey]);
      playPerfectSound(4);
      triggerPerfectHaptic(2);
      if (juiceRef.current) {
        juiceRef.current.burst(curG.x + 10, curG.y + 10, '#39FF14', 24);
        juiceRef.current.burst(curG.x + 10, curG.y + 10, '#FF0055', 18);
        juiceRef.current.flash('#39FF14');
        juiceRef.current.shake(10, 8);
      }
    }
  }, []);

  // PanResponder to drag the HEART token from the hint banner directly onto the guard!
  const heartPanResponder = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          triggerLightHaptic();
          arenaViewRef.current?.measure((_x, _y, w, h, pageX, pageY) => {
            if (pageX !== undefined && pageY !== undefined) {
              arenaBoundsRef.current = { pageX, pageY, w, h };
            }
          });
          const pos = { x: evt.nativeEvent.pageX, y: evt.nativeEvent.pageY };
          draggingHeartPosRef.current = pos;
          setDraggingHeartPos(pos);
        },
        onPanResponderMove: (evt) => {
          const pos = { x: evt.nativeEvent.pageX, y: evt.nativeEvent.pageY };
          draggingHeartPosRef.current = pos;
          setDraggingHeartPos(pos);
        },
        onPanResponderRelease: (evt) => {
          const pageX = evt.nativeEvent.pageX;
          const pageY = evt.nativeEvent.pageY;
          const bounds = arenaBoundsRef.current;
          const curG = guardRef.current;

          let droppedOnGuard = false;
          if (curG && !curG.healed) {
            if (bounds && bounds.w > 0) {
              const arenaX = (pageX - bounds.pageX) / arenaScale;
              const arenaY = (pageY - bounds.pageY) / arenaScale;
              const dist = Math.hypot(arenaX - (curG.x + 11), arenaY - (curG.y + 11));
              if (dist < 80) {
                droppedOnGuard = true;
              }
            } else {
              // Fallback: if dragged down into the chamber arena towards the guard
              if (pageY > height * 0.28) {
                droppedOnGuard = true;
              }
            }
          }

          if (droppedOnGuard) {
            handleHealGuardWithHeart();
          } else {
            // Direct tap support if finger barely moved
            if (Math.hypot(evt.nativeEvent.dx || 0, evt.nativeEvent.dy || 0) < 18) {
              handleHealGuardWithHeart();
            }
          }

          draggingHeartPosRef.current = null;
          setDraggingHeartPos(null);
        },
        onPanResponderTerminate: () => {
          draggingHeartPosRef.current = null;
          setDraggingHeartPos(null);
        },
      }),
    [arenaScale, handleHealGuardWithHeart, height]
  );

  const handleUnlockWithHudKey = useCallback(() => {
    const curDoor = { ...exitDoorRef.current };
    curDoor.locked = false;
    curDoor.permanentlyUnlocked = true;
    exitDoorRef.current = curDoor;
    setExitDoor(curDoor);
    playPerfectSound(5);
    triggerPerfectHaptic(3);
    if (juiceRef.current) {
      juiceRef.current.burst(curDoor.x + 14, curDoor.y + 20, '#FFD166', 22);
      juiceRef.current.flash('#00F5D4');
    }
  }, []);

  const handleFlipSpikes = useCallback(() => {
    const curSpk = rotatableSpikesRef.current;
    if (curSpk) {
      curSpk.rotated = !curSpk.rotated;
      rotatableSpikesRef.current = { ...curSpk };
      setRotatableSpikes({ ...curSpk });
      playSliceSound();
      triggerPerfectHaptic(2);
      if (juiceRef.current) {
        juiceRef.current.burst(curSpk.x + curSpk.w / 2, curSpk.y + 10, '#38BDF8', 16);
      }
    }
  }, []);

  const handleFireBlaster = useCallback(() => {
    const curG = gunRef.current;
    if (curG && curG.taken) {
      const p = playerRef.current;
      playSliceSound();
      triggerMediumHaptic();
      const newBullet = {
        x: p.x + (p.facing === 1 ? PLAYER_W + 6 : -6),
        y: p.y + 12,
        vx: (p.facing === 1 ? 1 : -1) * 14,
        active: true,
      };
      bulletRef.current = newBullet;
      setBullet(newBullet);
    }
  }, []);

  // Interactive Drag & Touch Puzzle Solver PanResponder
  const arenaPanResponder = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs
      PanResponder.create({
      onStartShouldSetPanResponder: () => isPlayingRef.current && !isPausedRef.current,
      onMoveShouldSetPanResponder: () => isPlayingRef.current && !isPausedRef.current,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const tx = Math.max(0, Math.min(GAME_W, locationX / arenaScale));
        const ty = Math.max(0, Math.min(GAME_H, locationY / arenaScale));

        // Check Shovel
        const curShovel = shovelRef.current;
        if (curShovel && !curShovel.taken) {
          if (Math.hypot(tx - curShovel.x, ty - curShovel.y) < 36) {
            draggedEntityRef.current = { type: 'SHOVEL', offsetX: curShovel.x - tx, offsetY: curShovel.y - ty };
            triggerLightHaptic();
            return;
          }
        }

        // Check Window
        const curWin = windowObjRef.current;
        if (curWin && !curWin.open) {
          if (tx >= curWin.x - 8 && tx <= curWin.x + curWin.w + 8 && ty >= curWin.y - 8 && ty <= curWin.y + curWin.h + 8) {
            curWin.open = true;
            windowObjRef.current = { ...curWin };
            setWindowObj({ ...curWin });
            setWindActive(true);
            const curDoor = { ...exitDoorRef.current };
            curDoor.isFalling = true;
            curDoor.targetY = 254;
            curDoor.targetX = 290;
            curDoor.vy = 0.6;
            curDoor.vx = -1.4;
            exitDoorRef.current = curDoor;
            setExitDoor({ ...curDoor });
            playSliceSound();
            triggerMediumHaptic();
            if (juiceRef.current) {
              juiceRef.current.shake(14, 12);
              juiceRef.current.burst(curWin.x, curWin.y, '#00F5FF', 18);
            }
            return;
          }
        }

        // Check Rotatable Spikes
        const curSpikes = rotatableSpikesRef.current;
        if (curSpikes && curSpikes.isDraggable) {
          if (tx >= curSpikes.x - 10 && tx <= curSpikes.x + curSpikes.w + 10 && ty >= curSpikes.y - 12 && ty <= curSpikes.y + curSpikes.h + 12) {
            draggedEntityRef.current = { type: 'ROTATABLE_SPIKES', offsetX: curSpikes.x - tx, offsetY: curSpikes.y - ty };
            triggerLightHaptic();
            return;
          }
        }

        // 1. Check Padlock
        const curPadlock = padlockRef.current;
        if (curPadlock && curPadlock.onDoor) {
          if (Math.hypot(tx - curPadlock.x, ty - curPadlock.y) < 32) {
            draggedEntityRef.current = { type: 'PADLOCK', startX: curPadlock.x, startY: curPadlock.y };
            triggerLightHaptic();
            return;
          }
        }

        // 2. Check Power Plug
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

        // 5. Check Battery
        const curBat = batteryRef.current;
        if (curBat && !curBat.slotted) {
          if (Math.hypot(tx - (curBat.x + curBat.w / 2), ty - (curBat.y + curBat.h / 2)) < 32) {
            draggedEntityRef.current = { type: 'BATTERY', offsetX: curBat.x - tx, offsetY: curBat.y - ty };
            triggerLightHaptic();
            return;
          }
        }

        // 6. Check Springs
        const curSprings = springsRef.current;
        for (let i = 0; i < curSprings.length; i++) {
          const sp = curSprings[i];
          if (sp.isDraggable && tx >= sp.x - 8 && tx <= sp.x + sp.w + 8 && ty >= sp.y - 8 && ty <= sp.y + sp.h + 8) {
            draggedEntityRef.current = { type: 'SPRING', id: sp.id, offsetX: sp.x - tx, offsetY: sp.y - ty };
            triggerLightHaptic();
            return;
          }
        }

        // 7. Check Draggable Platforms (including Mirror Slabs)
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

        // 8. Check Crates (including Balloon Crates)
        const curCrates = cratesRef.current;
        for (let i = 0; i < curCrates.length; i++) {
          const c = curCrates[i];
          if (tx >= c.x - 8 && tx <= c.x + CRATE_SIZE + 8 && ty >= c.y - 8 && ty <= c.y + CRATE_SIZE + 8) {
            draggedEntityRef.current = { type: 'CRATE', id: c.id, offsetX: c.x - tx, offsetY: c.y - ty };
            triggerLightHaptic();
            return;
          }
        }

        // 9. Check Pressure Plates (Finger-Press & Touch Override)
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

        if (dragged.type === 'SHOVEL') {
          const curShovel = shovelRef.current;
          if (curShovel) {
            curShovel.x = tx + (dragged.offsetX || 0);
            curShovel.y = ty + (dragged.offsetY || 0);
            setShovel({ ...curShovel });

            const curDirt = dirtBlocksRef.current.map((d) => ({ ...d }));
            let dugAny = false;
            for (let d of curDirt) {
              if (!d.dug && Math.hypot(curShovel.x + 10 - (d.x + d.w / 2), curShovel.y + 10 - (d.y + d.h / 2)) < 28) {
                d.dug = true;
                dugAny = true;
                playSliceSound();
                triggerMediumHaptic();
                if (juiceRef.current) {
                  juiceRef.current.burst(d.x + d.w / 2, d.y + d.h / 2, '#8B5A2B', 12);
                }
              }
            }
            if (dugAny) {
              dirtBlocksRef.current = [...curDirt];
              setDirtBlocks([...curDirt]);
            }
          }
        } else if (dragged.type === 'ROTATABLE_SPIKES') {
          const curSpk = rotatableSpikesRef.current;
          if (curSpk) {
            curSpk.x = Math.max(10, Math.min(GAME_W - curSpk.w - 10, tx + (dragged.offsetX || 0)));
            rotatableSpikesRef.current = { ...curSpk };
            setRotatableSpikes({ ...curSpk });
          }
        } else if (dragged.type === 'KEY') {
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
              setKeys([...curKeys]);
              playPerfectSound(4);
              triggerPerfectHaptic(2);
              juiceRef.current?.burst(k.x, k.y, k.color || '#FFD166', 18);
              draggedEntityRef.current = null;
            }
          }
        } else if (dragged.type === 'BATTERY') {
          const curBat = batteryRef.current;
          if (curBat && !curBat.slotted) {
            curBat.x = tx + (dragged.offsetX || 0);
            curBat.y = ty + (dragged.offsetY || 0);
            const curSock = socketRef.current;
            if (curSock && Math.hypot(curBat.x - curSock.x, curBat.y - curSock.y) < 32) {
              curBat.slotted = true;
              curBat.x = curSock.x + 3;
              curBat.y = curSock.y + 3;
              setBattery({ ...curBat });
              playSliceSound();
              triggerPerfectHaptic(2);
              juiceRef.current?.burst(curBat.x + curBat.w / 2, curBat.y + curBat.h / 2, '#39FF14', 16);
              draggedEntityRef.current = null;
              return;
            }
            setBattery({ ...curBat });
          }
        } else if (dragged.type === 'SPRING') {
          const curSprings = springsRef.current;
          const sp = curSprings.find((s) => s.id === dragged.id);
          if (sp) {
            sp.x = Math.max(12, Math.min(GAME_W - sp.w - 12, tx + (dragged.offsetX || 0)));
            sp.y = Math.max(20, Math.min(288, ty + (dragged.offsetY || 0)));
            setSprings([...curSprings]);
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
              curBarriers.forEach((b) => {
                if (b.byPlug || (!b.switchId && !b.plateIds)) b.active = false;
              });
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
    }),
    [arenaScale]
  );

  // Jump handler (adapts to normal or inverted gravity)
  const handleJump = useCallback(() => {
    if (isPausedRef.current || !isPlayingRef.current) return;
    const p = playerRef.current;
    if (p.onGround) {
      playTapSound();
      triggerLightHaptic();
      const gInv = Boolean(gravityInvertedRef.current);
      p.vy = gInv ? -JUMP_FORCE : JUMP_FORCE;
      p.onGround = false;
      playerRef.current = { ...p };
      setPlayer({ ...p });
    }
  }, [setPlayer]);

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
  }, [setFailReason, setModalType, setModalVisible]);

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
  }, [level, score, updateBest, setModalType, setModalVisible]);

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
      const curPlatforms = platformsRef.current.map((pl) => ({ ...pl }));
      const curCrates = cratesRef.current.map((c) => ({ ...c }));
      const curBarriers = barriersRef.current.map((b) => ({ ...b }));
      const curPlates = platesRef.current.map((pl) => ({ ...pl }));
      const curSwitches = switchesRef.current.map((sw) => ({ ...sw }));
      const curKeys = keysRef.current.map((k) => ({ ...k }));
      const curDoor = { ...exitDoorRef.current };
      const curSprings = springsRef.current.map((s) => ({ ...s }));
      const curFans = fansRef.current.map((f) => ({ ...f }));
      const curPortals = portalsRef.current.map((por) => ({ ...por }));
      const curBattery = batteryRef.current ? { ...batteryRef.current } : null;
      const curReceptors = receptorsRef.current.map((r) => ({ ...r }));
      const gInv = Boolean(gravityInvertedRef.current);

      // 0a. Moving Platforms Patrol & Carry Player
      let platformCarrierDx = 0;
      let platformsChanged = false;
      for (let s of curPlatforms) {
        if (s.speed && s.minX !== undefined && s.maxX !== undefined) {
          const dir = s.dir || 1;
          const prevX = s.x;
          let nextX = s.x + dir * s.speed;
          if (nextX >= s.maxX) {
            nextX = s.maxX;
            s.dir = -1;
          } else if (nextX <= s.minX) {
            nextX = s.minX;
            s.dir = 1;
          }
          const dx = nextX - prevX;
          s.x = nextX;
          platformsChanged = true;

          // If player is standing on this moving platform, carry them!
          if (
            p.onGround &&
            p.x + PLAYER_W > s.x - 4 &&
            p.x < s.x + s.w + 4 &&
            Math.abs(p.y + PLAYER_H - s.y) <= 4
          ) {
            platformCarrierDx = dx;
          }
        }
      }

      // 0b. Crumbling Platform Collapse
      for (let s of curPlatforms) {
        if (s.isCrumbling && !s.collapsed) {
          const isPlayerOn =
            p.x + PLAYER_W > s.x &&
            p.x < s.x + s.w &&
            Math.abs(p.y + PLAYER_H - s.y) <= 4;
          if (isPlayerOn) {
            s.stepped = true;
          }
          if (s.stepped) {
            s.crumbleTimer = (s.crumbleTimer || 0) + 1 / 60;
            platformsChanged = true;
            if (s.crumbleTimer > 0.65) {
              s.collapsed = true;
              triggerMediumHaptic();
              playSliceSound();
              if (juiceRef.current) {
                juiceRef.current.burst(s.x + s.w / 2, s.y + s.h / 2, '#FB7185', 12);
              }
            }
          }
        }
      }
      if (platformsChanged) {
        platformsRef.current = curPlatforms;
        setPlatforms([...curPlatforms]);
      }

      // 0c. Timed Switches Countdown & Barrier Reset
      let switchesUpdated = false;
      for (let sw of curSwitches) {
        if (sw.isTimed && sw.active && sw.timer > 0) {
          sw.timer -= 1 / 60;
          switchesUpdated = true;
          if (sw.timer <= 0) {
            sw.active = false;
            sw.timer = 0;
            curBarriers.forEach((b) => {
              if (b.switchId === sw.id) b.active = true;
            });
            barriersRef.current = [...curBarriers];
            setBarriers([...curBarriers]);
            triggerMediumHaptic();
          }
        }
      }
      if (switchesUpdated) {
        switchesRef.current = curSwitches;
        setSwitches([...curSwitches]);
      }

      // 0d. Prism Deflection & Laser Receptors
      let receptorsUpdated = false;
      const mirrorPlatforms = curPlatforms.filter((pl) => pl.isMirror && !pl.collapsed);
      for (let rec of curReceptors) {
        const isMirrorDeflecting = mirrorPlatforms.some(
          (m) =>
            rec.beamX >= m.x - 6 &&
            rec.beamX <= m.x + m.w + 6 &&
            rec.beamY >= m.y - 6 &&
            rec.beamY <= m.y + m.h + 6
        );
        const nextHit = isMirrorDeflecting;
        if (rec.hit !== nextHit) {
          rec.hit = nextHit;
          receptorsUpdated = true;
          if (nextHit) {
            triggerPerfectHaptic(1);
            playTapSound();
            if (juiceRef.current) {
              juiceRef.current.burst(rec.x + rec.w / 2, rec.y + rec.h / 2, '#00F5FF', 14);
            }
          }
        }
      }
      if (receptorsUpdated) {
        receptorsRef.current = curReceptors;
        setReceptors([...curReceptors]);
        curBarriers.forEach((b) => {
          if (b.receptorId) {
            const r = curReceptors.find((rec) => rec.id === b.receptorId);
            b.active = r ? !r.hit : false;
          }
        });
        barriersRef.current = [...curBarriers];
        setBarriers([...curBarriers]);
      }

      // 0e. Battery Socket Barrier Deactivation
      if (curBattery && curBattery.slotted) {
        let batBarriersUpdated = false;
        curBarriers.forEach((b) => {
          if (b.byBattery && b.active) {
            b.active = false;
            batBarriersUpdated = true;
          }
        });
        if (batBarriersUpdated) {
          barriersRef.current = [...curBarriers];
          setBarriers([...curBarriers]);
        }
      }

      // Horizontal player input & platform carrier speed
      let moveVx = platformCarrierDx;
      const isRev = Boolean(reversedControlsRef.current);
      if (inputLeftRef.current) {
        moveVx += isRev ? MOVE_SPEED : -MOVE_SPEED;
        p.facing = isRev ? 1 : -1;
      }
      if (inputRightRef.current) {
        moveVx += isRev ? -MOVE_SPEED : MOVE_SPEED;
        p.facing = isRev ? -1 : 1;
      }
      p.vx = moveVx;

      // Vertical gravity & fan updrafts
      p.vy += gInv ? -GRAVITY : GRAVITY;
      for (let f of curFans) {
        if (f.active !== false) {
          const inFanX = p.x + PLAYER_W > f.x && p.x < f.x + f.w;
          const inFanY = p.y < f.y && p.y > f.y - 130;
          if (inFanX && inFanY) {
            p.vy = Math.max(-5.8, p.vy - 0.85);
          }
        }
      }

      // Solid collision obstacles: non-collapsed platforms + active barriers
      const solids = curPlatforms.filter((s) => !s.collapsed);

      // Non-dug dirt blocks are solid
      dirtBlocksRef.current.forEach((d) => {
        if (!d.dug) solids.push({ x: d.x, y: d.y, w: d.w, h: d.h });
      });

      // Door as solid stepping platform if isPlatform (only once stationary)
      if (curDoor && curDoor.isPlatform && !curDoor.isFalling) {
        solids.push({ x: curDoor.x, y: curDoor.y, w: curDoor.w, h: 8 });
      }

      // Flipped spikes are safe solid platform
      const curSpkSolid = rotatableSpikesRef.current;
      if (curSpkSolid && curSpkSolid.rotated) {
        solids.push({ x: curSpkSolid.x, y: curSpkSolid.y, w: curSpkSolid.w, h: curSpkSolid.h });
      }
      curBarriers.forEach((b) => {
        if (b.isBridge) {
          const swActive = curSwitches.some((s) => s.active);
          if (swActive) solids.push({ x: b.x, y: b.y, w: b.w, h: b.h });
        } else if (b.active) {
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
          const pushDir = p.vx > 0 ? 1 : -1;
          const targetCx = c.x + pushDir * MOVE_SPEED * 0.75;

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

      // 2. Move Player Y & Solid collisions (Normal & Inverted Gravity)
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
          if (gInv) {
            if (p.vy < 0) {
              nextPy = s.y + s.h;
              p.vy = 0;
              onFloor = true;
            } else if (p.vy > 0) {
              nextPy = s.y - PLAYER_H;
              p.vy = 0;
            }
          } else {
            if (p.vy > 0) {
              nextPy = s.y - PLAYER_H;
              p.vy = 0;
              onFloor = true;
            } else if (p.vy < 0) {
              nextPy = s.y + s.h;
              p.vy = 0;
            }
          }
        }
      }

      // Check Crates Y
      for (let c of curCrates) {
        if (
          p.x < c.x + CRATE_SIZE &&
          p.x + PLAYER_W > c.x &&
          nextPy < c.y + CRATE_SIZE &&
          nextPy + PLAYER_H > c.y
        ) {
          if (gInv) {
            if (p.vy < 0) {
              nextPy = c.y + CRATE_SIZE;
              p.vy = 0;
              onFloor = true;
            } else if (p.vy > 0) {
              nextPy = c.y - PLAYER_H;
              p.vy = 0;
            }
          } else {
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
      }
      const prevLandingVy = p.vy;
      p.y = nextPy;
      p.onGround = onFloor;

      // Earthquake Stomp Check on Landing
      const curEq = earthquakeRef.current;
      if (curEq && curEq.remainingStomps > 0 && prevLandingVy > 1.2 && onFloor) {
        curEq.remainingStomps -= 1;
        curEq.offset += 25;
        if (juiceRef.current) {
          juiceRef.current.shake(16, 12);
        }
        triggerMediumHaptic();
        playTapSound();
        if (curEq.remainingStomps === 0) {
          curDoor.isFalling = true;
          curDoor.targetY = 254;
          curDoor.targetX = curDoor.x;
          curDoor.vy = 1.0;
          curDoor.vx = 0;
          curEq.settled = true;
          exitDoorRef.current = curDoor;
          setExitDoor({ ...curDoor });
          triggerPerfectHaptic(2);
          if (juiceRef.current) {
            juiceRef.current.burst(curDoor.x + (curDoor.w || 28) / 2, curDoor.y + 20, '#FFE600', 18);
          }
        } else {
          // Slide door down slightly on each intermediate stomp with dust & clank!
          curDoor.y += 24;
          exitDoorRef.current = curDoor;
          setExitDoor({ ...curDoor });
          if (juiceRef.current) {
            juiceRef.current.burst(curDoor.x + (curDoor.w || 28) / 2, curDoor.y + (curDoor.h || 42), '#FFE600', 10);
          }
        }
        earthquakeRef.current = { ...curEq };
        setEarthquake({ ...curEq });
      }

      // Gun pickup check
      const curGun = gunRef.current;
      if (curGun && !curGun.taken) {
        if (Math.hypot(p.x + PLAYER_W / 2 - curGun.x, p.y + PLAYER_H / 2 - curGun.y) < 28) {
          curGun.taken = true;
          gunRef.current = { ...curGun };
          setGun({ ...curGun });
          playTapSound();
          triggerLightHaptic();
          if (juiceRef.current) {
            juiceRef.current.burst(curGun.x, curGun.y, '#00F5FF', 14);
          }
        }
      }

      // Blaster bullet movement & padlock shattering
      const curBul = bulletRef.current;
      if (curBul && curBul.active) {
        curBul.x += curBul.vx;
        const curPad = padlockRef.current;
        if (curPad && curPad.onDoor && Math.hypot(curBul.x - curPad.x, curBul.y - curPad.y) < 28) {
          curBul.active = false;
          curPad.onDoor = false;
          padlockRef.current = { ...curPad };
          setPadlock({ ...curPad });
          curDoor.locked = false;
          curDoor.permanentlyUnlocked = true;
          exitDoorRef.current = curDoor;
          setExitDoor({ ...curDoor });
          bulletRef.current = null;
          setBullet(null);
          playGameOverSound();
          triggerPerfectHaptic(3);
          if (juiceRef.current) {
            juiceRef.current.burst(curPad.x, curPad.y, '#FF0055', 24);
            juiceRef.current.shake(14, 10);
          }
        } else if (curBul.x < 0 || curBul.x > GAME_W) {
          curBul.active = false;
          bulletRef.current = null;
          setBullet(null);
        } else {
          bulletRef.current = { ...curBul };
          setBullet({ ...curBul });
        }
      }

      // 2b. Spring Pad Bounce on Player
      for (let sp of curSprings) {
        const pCenterX = p.x + PLAYER_W / 2;
        const inSpringX = pCenterX >= sp.x - 4 && pCenterX <= sp.x + sp.w + 4;
        const inSpringY = Math.abs(p.y + PLAYER_H - sp.y) < 10;
        if (inSpringX && inSpringY) {
          p.vy = gInv ? 13.5 : -13.5;
          p.onGround = false;
          triggerMediumHaptic();
          playTapSound();
          if (juiceRef.current) {
            juiceRef.current.burst(sp.x + sp.w / 2, sp.y, '#39FF14', 12);
          }
        }
      }

      // 2c. Portal Teleportation
      if (portalCooldownRef.current > 0) {
        portalCooldownRef.current -= 1;
      } else {
        const pCenterX = p.x + PLAYER_W / 2;
        const pCenterY = p.y + PLAYER_H / 2;
        for (let por of curPortals) {
          const dist = Math.hypot(pCenterX - (por.x + 12), pCenterY - (por.y + 16));
          if (dist < 22) {
            const partner = curPortals.find((other) => other.id === por.partnerId);
            if (partner) {
              p.x = partner.x + (partner.exitOffsetX || 20);
              p.y = partner.y + (partner.exitOffsetY || 0);
              portalCooldownRef.current = 45;
              triggerPerfectHaptic(2);
              playSliceSound();
              if (juiceRef.current) {
                juiceRef.current.burst(partner.x + 12, partner.y + 16, partner.color || '#00F5FF', 18);
              }
              break;
            }
          }
        }
      }

      // 3. Crate Gravity, Balloons & Floor Collisions
      const crateOrder = [...curCrates].sort((a, b) => b.y - a.y);
      for (let c of crateOrder) {
        if (c.isBalloon) {
          c.vy = (c.vy || 0) - GRAVITY * 0.45;
          c.vy = Math.max(-2.5, c.vy);
        } else {
          c.vy = (c.vy || 0) + (gInv ? -GRAVITY : GRAVITY);
        }

        // Fan wind on crates
        for (let f of curFans) {
          if (f.active !== false) {
            if (c.x + CRATE_SIZE > f.x && c.x < f.x + f.w && c.y < f.y && c.y > f.y - 130) {
              c.vy = Math.max(-4.5, (c.vy || 0) - 0.7);
            }
          }
        }

        let nextCy = c.y + c.vy;

        // Spring bounce on crates
        for (let sp of curSprings) {
          if (
            c.x + CRATE_SIZE > sp.x &&
            c.x < sp.x + sp.w &&
            Math.abs(c.y + CRATE_SIZE - sp.y) < 8
          ) {
            c.vy = -10.5;
            triggerLightHaptic();
          }
        }

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
            } else if (c.vy < 0) {
              nextCy = s.y + s.h;
              c.vy = 0;
            }
          }
        }

        for (let o of curCrates) {
          if (o === c) continue;
          if (
            c.x < o.x + CRATE_SIZE - 3 &&
            c.x + CRATE_SIZE > o.x + 3 &&
            c.y + CRATE_SIZE <= o.y + 8 &&
            nextCy + CRATE_SIZE > o.y &&
            c.vy > 0
          ) {
            nextCy = o.y - CRATE_SIZE;
            c.vy = 0;
          }
        }
        c.y = nextCy;
      }

      // 4. Pressure Plates Check
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

      // 4b. Dynamic Pressure Plate Laser Gates
      let barriersUpdated = false;
      curBarriers.forEach((b) => {
        if (b.plateIds && b.plateIds.length > 0) {
          const isPressed = curPlates.some((pl) => b.plateIds.includes(pl.id) && pl.pressed);
          const nextActive = !isPressed;
          if (b.active !== nextActive) {
            b.active = nextActive;
            barriersUpdated = true;
          }
        }
      });
      if (barriersUpdated) {
        barriersRef.current = curBarriers;
        setBarriers([...curBarriers]);
      }

      // 5. Switches Interaction
      for (let sw of curSwitches) {
        if (!sw.active) {
          const dist = Math.hypot(p.x + PLAYER_W / 2 - sw.x, p.y + PLAYER_H / 2 - sw.y);
          if (dist < 28) {
            sw.active = true;
            if (sw.isTimed) {
              sw.timer = sw.maxTimer || 4;
            }
            playTapSound();
            triggerPerfectHaptic(2);
            if (juiceRef.current) {
              juiceRef.current.flash('#39FF14');
              juiceRef.current.burst(sw.x, sw.y, '#39FF14', 12);
            }
            switchesRef.current = curSwitches;
            setSwitches([...curSwitches]);

            curBarriers.forEach((b) => {
              if (b.switchId) {
                if (b.switchId === sw.id) b.active = false;
              } else if (!b.isBridge && !b.plateIds && !b.byPlug && !b.byBattery && !b.receptorId && !b.requiredColor) {
                b.active = false;
              }
            });
            barriersRef.current = [...curBarriers];
            setBarriers([...curBarriers]);
          }
        }
      }

      // 6. Keys Collection & Color Gates
      for (let k of curKeys) {
        if (!k.taken) {
          const dist = Math.hypot(p.x + PLAYER_W / 2 - k.x, p.y + PLAYER_H / 2 - k.y);
          if (dist < 26) {
            k.taken = true;
            playTapSound();
            triggerPerfectHaptic(1);
            if (juiceRef.current) {
              juiceRef.current.burst(k.x, k.y, k.color || '#FFE600', 14);
            }
            keysRef.current = [...curKeys];
            setKeys([...curKeys]);

            if (k.color) {
              curBarriers.forEach((b) => {
                if (b.requiredColor === k.color) {
                  b.active = false;
                }
              });
              barriersRef.current = [...curBarriers];
              setBarriers([...curBarriers]);
            }
          }
        }
      }

      // Dynamic Falling Door Physics with Gravity, Wind Drift & Floor Bounce
      if (curDoor && curDoor.isFalling) {
        curDoor.vy = (curDoor.vy || 0) + 0.52;
        curDoor.vy = Math.min(curDoor.vy, 11);
        curDoor.y += curDoor.vy;

        if (curDoor.vx) {
          curDoor.x += curDoor.vx;
          curDoor.vx *= 0.94;
        }

        // Clamp inside chamber horizontal boundaries
        curDoor.x = Math.max(14, Math.min(GAME_W - (curDoor.w || 28) - 14, curDoor.x));

        // Determine ground/platform landing Y
        let landingY = curDoor.targetY ?? 254;
        for (let pl of curPlatforms) {
          if (!pl.collapsed && pl.id !== 'floor') {
            const midX = curDoor.x + (curDoor.w || 28) / 2;
            if (midX >= pl.x - 2 && midX <= pl.x + pl.w + 2) {
              const topPl = pl.y - (curDoor.h || 42);
              if (topPl >= 40 && topPl < landingY && curDoor.y + (curDoor.h || 42) >= pl.y) {
                landingY = topPl;
                break;
              }
            }
          }
        }

        if (curDoor.y >= landingY) {
          curDoor.y = landingY;
          if (curDoor.vy > 2.0) {
            // Realistic elastic bounce
            curDoor.vy = -curDoor.vy * 0.28;
            playTapSound();
            triggerMediumHaptic();
            if (juiceRef.current) {
              juiceRef.current.shake(10, 8);
              juiceRef.current.burst(curDoor.x + (curDoor.w || 28) / 2, curDoor.y + (curDoor.h || 42), '#00F5FF', 14);
            }
          } else {
            // Settle on ground firmly
            curDoor.vy = 0;
            curDoor.vx = 0;
            curDoor.isFalling = false;
            playPerfectSound(3);
            triggerPerfectHaptic(2);
            if (juiceRef.current) {
              juiceRef.current.shake(8, 6);
              juiceRef.current.burst(curDoor.x + (curDoor.w || 28) / 2, curDoor.y + (curDoor.h || 42) / 2, '#FFE600', 20);
            }
          }
        }

        exitDoorRef.current = curDoor;
        setExitDoor({ ...curDoor });
      }

      // 7. Check Exit Door Unlock Condition
      const allKeysCollected = curKeys.every((k) => k.taken);
      const allPlatesPressed = curPlates.length === 0 || curPlates.every((pl) => pl.pressed);
      const allSwitchesActive = curSwitches.length === 0 || curSwitches.every((sw) => sw.active);
      const curPad = padlockRef.current;
      const padlockCleared = !curPad || !curPad.onDoor;
      const batterySlotted = !curBattery || curBattery.slotted;
      const allReceptorsHit = curReceptors.length === 0 || curReceptors.every((rec) => rec.hit);

      const isUnlocked =
        Boolean(curDoor.permanentlyUnlocked) ||
        (allKeysCollected &&
          allPlatesPressed &&
          allSwitchesActive &&
          padlockCleared &&
          batterySlotted &&
          allReceptorsHit);

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
      if (!curDoor.locked && !curDoor.isFalling) {
        const inDoor =
          p.x + PLAYER_W > curDoor.x + 6 &&
          p.x < curDoor.x + curDoor.w - 6 &&
          p.y + PLAYER_H >= curDoor.y + 10 &&
          p.y <= curDoor.y + curDoor.h;
        if (inDoor) {
          handleWin();
          animFrameRef.current = requestAnimationFrame(tick);
          return;
        }
      }

      // Rotatable Spikes hazard check (deadly only if NOT rotated!)
      const curSpkHaz = rotatableSpikesRef.current;
      if (curSpkHaz && !curSpkHaz.rotated) {
        if (
          p.x + PLAYER_W > curSpkHaz.x &&
          p.x < curSpkHaz.x + curSpkHaz.w &&
          p.y + PLAYER_H > curSpkHaz.y + 2 &&
          p.y < curSpkHaz.y + curSpkHaz.h
        ) {
          handleFail('IMPALED BY SPIKES!');
          animFrameRef.current = requestAnimationFrame(tick);
          return;
        }
      }

      // 9. Hazard Collision
      for (let h of hazardsRef.current) {
        if (
          p.x + PLAYER_W > h.x &&
          p.x < h.x + h.w &&
          p.y + PLAYER_H > h.y + 2 &&
          p.y < h.y + h.h
        ) {
          handleFail('IMPALED BY SECURITY SPIKES!');
          animFrameRef.current = requestAnimationFrame(tick);
          return;
        }
      }

      // Fall off bottom check
      if (p.y > GAME_H + 30) {
        handleFail('FALLEN INTO THE ABYSS!');
        animFrameRef.current = requestAnimationFrame(tick);
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

  // Touch button controls: ONE multi-touch handler reads every active finger,
  // so holding ▶ while tapping ▲ JUMP works (jump forward) and survives restarts.
  const [isLeftActive, setIsLeftActive] = useState(false);
  const [isRightActive, setIsRightActive] = useState(false);
  const [isJumpActive, setIsJumpActive] = useState(false);

  const handleControlsTouch = (evt, phase) => {
    const { touches = [], changedTouches = [] } = evt.nativeEvent;
    const jumpX = width * 0.55;
    let l = false;
    let r = false;
    let j = false;
    touches.forEach((t) => {
      if (t.pageX >= jumpX) j = true;
      else if (t.pageX < 88) l = true;
      else r = true;
    });
    if (phase === 'start') {
      const newJump = changedTouches.some((t) => t.pageX >= jumpX);
      if (newJump) handleJump();
    }
    inputLeftRef.current = l;
    inputRightRef.current = r;
    setIsLeftActive(l);
    setIsRightActive(r);
    setIsJumpActive(j);
  };

  return (
    <JuiceEngine ref={juiceRef}>
      <View style={styles.container}>
        <MiniGameHeader
          floorNum={9}
          floorLabel={level <= 100 ? `ROOM ${level}/100` : `ROOM ${level}`}
          title="CHAMBER ESCAPE"
          category="100 VAULTS"
          accentColor="#00F5FF"
          score={score}
          onBack={onBackToHub}
          onBackToHub={onBackToHub}
        />

        {/* Level & Objective HUD */}
        <View style={styles.topHudWrapper}>
          <View style={styles.topHudRow}>
            <Pressable
              style={({ pressed }) => [styles.stageBox, pressed && { opacity: 0.75 }]}
              onPress={() => {
                triggerLightHaptic();
                playTapSound();
                setShowLevelWarp(true);
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.stageNum}>ROOM {level}</Text>
                <View style={styles.warpPill}>
                  <Text style={styles.warpPillText}>⚡ WARP ▼</Text>
                </View>
              </View>
              <Text style={styles.stageTitle} numberOfLines={1}>{roomTitle}</Text>
            </Pressable>

            <View style={styles.statusRow}>
              {hudKeyDraggableActive && (
                <Pressable
                  style={[styles.hudBadge, { borderColor: '#FFE600', backgroundColor: 'rgba(255, 230, 0, 0.25)' }]}
                  onPress={handleUnlockWithHudKey}
                >
                  <Text style={[styles.hudBadgeText, { color: '#FFE600', fontWeight: 'bold' }]}>
                    🔑 TAKE KEY
                  </Text>
                </Pressable>
              )}
              {(gravityRotateMode || gravityTiltable) && (
                <Pressable
                  style={[styles.hudBadge, { borderColor: '#00F5FF', backgroundColor: 'rgba(0, 245, 255, 0.25)' }]}
                  onPress={handleRotateGravity}
                >
                  <Text style={[styles.hudBadgeText, { color: '#00F5FF', fontWeight: 'bold' }]}>
                    🔄 TILT GRAVITY
                  </Text>
                </Pressable>
              )}
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
              {hintHeartActive && roomHint.toUpperCase().includes('HEART') ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Text style={styles.hintBannerText}>💡 </Text>
                  {(() => {
                    const parts = roomHint.split(/HEART/i);
                    return (
                      <>
                        <Text style={styles.hintBannerText}>{parts[0]}</Text>
                        <View
                          {...(guard && !guard.healed ? heartPanResponder.panHandlers : {})}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: guard && guard.healed ? 'rgba(16, 185, 129, 0.25)' : '#FF0055',
                            paddingHorizontal: 7,
                            paddingVertical: 2,
                            borderRadius: 6,
                            borderWidth: 1.5,
                            borderColor: guard && guard.healed ? '#10B981' : '#FFFFFF',
                            marginHorizontal: 3,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              color: '#FFFFFF',
                              fontWeight: '900',
                              letterSpacing: 0.5,
                            }}
                          >
                            ❤️ {guard && guard.healed ? 'HEALED' : 'HEART'}
                          </Text>
                        </View>
                        <Text style={styles.hintBannerText}>{parts.slice(1).join('HEART')}</Text>
                      </>
                    );
                  })()}
                </View>
              ) : (
                <Text style={styles.hintBannerText}>💡 {roomHint}</Text>
              )}
            </View>
          ) : null}
        </View>

        {/* Room Arena with Interactive Touch/Drag */}
        <View style={styles.arenaWrapper}>
          <View
            ref={arenaViewRef}
            collapsable={false}
            style={[
              styles.arena,
              {
                width: GAME_W * arenaScale,
                height: GAME_H * arenaScale,
                transform: [{ scale: arenaScale }],
              },
            ]}
            onLayout={() => {
              arenaViewRef.current?.measure((_x, _y, w, h, pageX, pageY) => {
                if (pageX !== undefined && pageY !== undefined) {
                  arenaBoundsRef.current = { pageX, pageY, w, h };
                }
              });
            }}
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
              {platforms.map((p, idx) => {
                if (p.collapsed) {
                  return (
                    <G key={`plt_${idx}`} opacity={0.25}>
                      <Line x1={p.x} y1={p.y} x2={p.x + p.w / 2} y2={p.y + 6} stroke="#FB7185" strokeWidth={1} strokeDasharray="3 3" />
                      <Line x1={p.x + p.w / 2} y1={p.y + 6} x2={p.x + p.w} y2={p.y} stroke="#FB7185" strokeWidth={1} strokeDasharray="3 3" />
                    </G>
                  );
                }
                const isMir = Boolean(p.isMirror);
                const isCrum = Boolean(p.isCrumbling);
                const strokeColor = isMir ? '#38BDF8' : isCrum ? '#FB7185' : p.color || 'rgba(0, 245, 255, 0.4)';
                return (
                  <G key={`plt_${idx}`}>
                    <Rect
                      x={p.x}
                      y={p.y}
                      width={p.w}
                      height={p.h}
                      fill={isMir ? '#0F2838' : 'url(#wallGrad)'}
                      stroke={strokeColor}
                      strokeWidth={1.5}
                      strokeDasharray={isCrum ? '4 2' : undefined}
                      rx={3}
                    />
                    {/* Top neon edge highlight */}
                    <Line
                      x1={p.x}
                      y1={p.y}
                      x2={p.x + p.w}
                      y2={p.y}
                      stroke={isMir ? '#A5F3FC' : isCrum ? '#FB7185' : '#00F5FF'}
                      strokeWidth={2}
                    />
                    {/* Mirror prism sheen */}
                    {isMir && (
                      <Line
                        x1={p.x + 4}
                        y1={p.y + p.h - 4}
                        x2={p.x + p.w - 4}
                        y2={p.y + 4}
                        stroke="#A5F3FC"
                        strokeWidth={1}
                        strokeDasharray="4 4"
                      />
                    )}
                    {/* Draggable indicator dot */}
                    {p.isDraggable && (
                      <Circle cx={p.x + p.w / 2} cy={p.y + p.h / 2} r={2.5} fill="#FFE600" />
                    )}
                  </G>
                );
              })}

              {/* Turbine Wind Fans */}
              {fans.map((f) => (
                <G key={f.id} transform={`translate(${f.x}, ${f.y})`}>
                  {/* Upward wind airflow waves */}
                  <Line x1={6} y1={-6} x2={6} y2={-90} stroke="#00F5FF" strokeWidth={1.5} strokeDasharray="6 6" opacity={0.65} />
                  <Line x1={f.w / 2} y1={-10} x2={f.w / 2} y2={-115} stroke="#00F5FF" strokeWidth={1.5} strokeDasharray="8 6" opacity={0.85} />
                  <Line x1={f.w - 6} y1={-6} x2={f.w - 6} y2={-90} stroke="#00F5FF" strokeWidth={1.5} strokeDasharray="6 6" opacity={0.65} />
                  {/* Vent housing */}
                  <Rect x={0} y={0} width={f.w} height={f.h} fill="#141E28" stroke="#00F5FF" strokeWidth={1.5} rx={3} />
                  <Line x1={3} y1={f.h / 2} x2={f.w - 3} y2={f.h / 2} stroke="#00F5FF" strokeWidth={1.5} />
                </G>
              ))}

              {/* Bouncy Spring Pads */}
              {springs.map((sp) => (
                <G key={sp.id} transform={`translate(${sp.x}, ${sp.y})`}>
                  <Rect x={0} y={sp.h - 4} width={sp.w} height={4} fill="#141E28" stroke="#39FF14" strokeWidth={1} rx={2} />
                  <Path
                    d={`M3,${sp.h - 4} L8,2 L14,${sp.h - 4} L20,2 L26,${sp.h - 4} L${sp.w - 3},2`}
                    stroke="#39FF14"
                    strokeWidth={2}
                    fill="none"
                  />
                  <Rect x={0} y={0} width={sp.w} height={3} fill="#39FF14" rx={1.5} />
                  {sp.isDraggable && (
                    <Circle cx={sp.w / 2} cy={sp.h / 2} r={2.5} fill="#FFE600" />
                  )}
                </G>
              ))}

              {/* Portal Vortexes */}
              {portals.map((por) => (
                <G key={por.id} transform={`translate(${por.x}, ${por.y})`}>
                  <Ellipse
                    cx={12}
                    cy={18}
                    rx={12}
                    ry={18}
                    fill={por.color || '#00F5FF'}
                    fillOpacity={0.25}
                    stroke={por.color || '#00F5FF'}
                    strokeWidth={2}
                    strokeDasharray="4 2"
                  />
                  <Circle cx={12} cy={18} r={5} fill="#FFFFFF" opacity={0.8} />
                </G>
              ))}

              {/* Laser Receptors and Prism Beams */}
              {receptors.map((rec) => (
                <G key={rec.id}>
                  {/* Incident emitter beam */}
                  <Line
                    x1={rec.beamX}
                    y1={0}
                    x2={rec.beamX}
                    y2={rec.beamY}
                    stroke="#00F5FF"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    opacity={0.8}
                  />
                  {/* Deflected beam reaching receptor when hit */}
                  {rec.hit && (
                    <Line
                      x1={rec.beamX}
                      y1={rec.beamY}
                      x2={rec.x + rec.w / 2}
                      y2={rec.y + rec.h / 2}
                      stroke="#00F5FF"
                      strokeWidth={3}
                    />
                  )}
                  {/* Receptor box */}
                  <G transform={`translate(${rec.x}, ${rec.y})`}>
                    <Rect
                      x={0}
                      y={0}
                      width={rec.w}
                      height={rec.h}
                      fill="#141E28"
                      stroke={rec.hit ? '#00F5D4' : '#FF0055'}
                      strokeWidth={2}
                      rx={4}
                    />
                    <Circle cx={rec.w / 2} cy={rec.h / 2} r={rec.hit ? 6 : 4} fill={rec.hit ? '#00F5D4' : '#FF0055'} />
                  </G>
                </G>
              ))}

              {/* Battery Socket */}
              {socket && (
                <G transform={`translate(${socket.x}, ${socket.y})`}>
                  <Rect
                    x={0}
                    y={0}
                    width={socket.w}
                    height={socket.h}
                    fill="#0A0E17"
                    stroke="#39FF14"
                    strokeWidth={2}
                    strokeDasharray="4 2"
                    rx={4}
                  />
                  <Line x1={socket.w / 2 - 4} y1={socket.h / 2} x2={socket.w / 2 + 4} y2={socket.h / 2} stroke="#39FF14" strokeWidth={2} />
                  <Line x1={socket.w / 2} y1={socket.h / 2 - 4} x2={socket.w / 2} y2={socket.h / 2 + 4} stroke="#39FF14" strokeWidth={2} />
                </G>
              )}

              {/* Battery Cell */}
              {battery && (
                <G transform={`translate(${battery.x}, ${battery.y})`}>
                  <Rect x={0} y={2} width={battery.w} height={battery.h - 2} fill="#141E28" stroke="#39FF14" strokeWidth={2} rx={3} />
                  <Rect x={battery.w / 2 - 3} y={0} width={6} height={2} fill="#39FF14" rx={1} />
                  <Rect x={3} y={5} width={battery.w - 6} height={battery.h - 8} fill={battery.slotted ? '#39FF14' : '#FFE600'} rx={2} />
                  <Circle cx={battery.w / 2} cy={battery.h / 2 + 1} r={2.5} fill="#000000" />
                </G>
              )}

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
                  {/* Helium Balloon visual if floating crate */}
                  {c.isBalloon && (
                    <G>
                      <Circle cx={c.x + CRATE_SIZE / 2} cy={c.y - 18} r={12} fill="#00F5FF" fillOpacity={0.4} stroke="#00F5FF" strokeWidth={1.5} />
                      <Line x1={c.x + CRATE_SIZE / 2} y1={c.y - 6} x2={c.x + CRATE_SIZE / 2} y2={c.y} stroke="#00F5FF" strokeWidth={1} />
                    </G>
                  )}
                  <Rect
                    x={c.x}
                    y={c.y}
                    width={CRATE_SIZE}
                    height={CRATE_SIZE}
                    fill={c.isBalloon ? '#0D2A3D' : 'url(#crateGrad)'}
                    stroke={c.isBalloon ? '#00F5FF' : '#F59E0B'}
                    strokeWidth={2}
                    rx={4}
                  />
                  {/* Cross braces on crate */}
                  <Line x1={c.x + 3} y1={c.y + 3} x2={c.x + CRATE_SIZE - 3} y2={c.y + CRATE_SIZE - 3} stroke={c.isBalloon ? '#38BDF8' : '#FCD34D'} strokeWidth={1.5} />
                  <Line x1={c.x + CRATE_SIZE - 3} y1={c.y + 3} x2={c.x + 3} y2={c.y + CRATE_SIZE - 3} stroke={c.isBalloon ? '#38BDF8' : '#FCD34D'} strokeWidth={1.5} />
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

              {/* Dirt Blocks (Excavation Room) */}
              {dirtBlocks.map((d) => {
                if (d.dug) return null;
                return (
                  <G key={d.id} transform={`translate(${d.x}, ${d.y})`}>
                    <Rect x={0} y={0} width={d.w} height={d.h} fill="#451A03" stroke="#78350F" strokeWidth={1.5} rx={3} />
                    <Line x1={3} y1={3} x2={d.w - 3} y2={d.h - 3} stroke="#92400E" strokeWidth={1} />
                    <Line x1={d.w - 3} y1={3} x2={3} y2={d.h - 3} stroke="#92400E" strokeWidth={1} />
                  </G>
                );
              })}

              {/* Shovel Item */}
              {shovel && !shovel.taken && (
                <G transform={`translate(${shovel.x}, ${shovel.y})`}>
                  <Line x1={0} y1={0} x2={14} y2={14} stroke="#B45309" strokeWidth={3} strokeLinecap="round" />
                  <Path d="M10,10 L20,12 L12,20 Z" fill="#94A3B8" stroke="#FFFFFF" strokeWidth={1.2} />
                  <Circle cx={12} cy={12} r={14} stroke="#FFE600" strokeWidth={1} strokeDasharray="3 3" opacity={0.7} />
                </G>
              )}

              {/* Window with Wind (Room 8) */}
              {windowObj && (
                <G transform={`translate(${windowObj.x}, ${windowObj.y})`}>
                  <Rect x={0} y={0} width={windowObj.w} height={windowObj.h} fill="#0F172A" stroke="#00F5FF" strokeWidth={2} rx={4} />
                  <Rect x={2} y={2} width={windowObj.open ? 6 : windowObj.w / 2 - 3} height={windowObj.h - 4} fill="#0284C7" rx={2} />
                  <Rect x={windowObj.open ? windowObj.w - 8 : windowObj.w / 2 + 1} y={2} width={windowObj.open ? 6 : windowObj.w / 2 - 3} height={windowObj.h - 4} fill="#0284C7" rx={2} />
                  {(windowObj.open || windActive) && (
                    <G>
                      <Line x1={-60} y1={10} x2={windowObj.w} y2={10} stroke="#00F5FF" strokeWidth={2} strokeDasharray="6 4" opacity={0.8} />
                      <Line x1={-80} y1={22} x2={windowObj.w} y2={22} stroke="#38BDF8" strokeWidth={2.5} strokeDasharray="8 5" opacity={0.9} />
                      <Line x1={-50} y1={34} x2={windowObj.w} y2={34} stroke="#00F5FF" strokeWidth={1.5} strokeDasharray="5 3" opacity={0.7} />
                    </G>
                  )}
                </G>
              )}

              {/* Security Guard (Modeled directly after Player Runner with Distinct Officer Armor & Colors) */}
              {guard && (
                <G transform={`translate(${guard.x}, ${guard.healed ? guard.y : guard.y + 6})`}>
                  {/* Cyber Runner Armor Body */}
                  <Rect
                    x={2}
                    y={guard.healed ? 6 : 10}
                    width={PLAYER_W - 4}
                    height={guard.healed ? PLAYER_H - 12 : PLAYER_H - 16}
                    fill={guard.healed ? '#059669' : '#991B1B'}
                    stroke={guard.healed ? '#34D399' : '#EF4444'}
                    strokeWidth={1.5}
                    rx={4}
                  />

                  {/* Security Officer Gold Crest Badge on Armor */}
                  <Polygon
                    points={
                      guard.healed
                        ? `${PLAYER_W / 2},8 ${PLAYER_W / 2 + 3},11 ${PLAYER_W / 2},15 ${PLAYER_W / 2 - 3},11`
                        : `${PLAYER_W / 2},12 ${PLAYER_W / 2 + 3},14 ${PLAYER_W / 2},18 ${PLAYER_W / 2 - 3},14`
                    }
                    fill="#FBBF24"
                    stroke="#D97706"
                    strokeWidth={0.8}
                  />

                  {/* Cyber Helmet */}
                  <Circle
                    cx={PLAYER_W / 2}
                    cy={guard.healed ? 5 : 8}
                    r={7}
                    fill={guard.healed ? '#064E3B' : '#1E1B4B'}
                    stroke={guard.healed ? '#34D399' : '#F43F5E'}
                    strokeWidth={1.5}
                  />

                  {/* Helmet Visor */}
                  <Rect
                    x={2}
                    y={guard.healed ? 3 : 6}
                    width={7}
                    height={4}
                    fill={guard.healed ? '#00F5D4' : '#FB7185'}
                    rx={2}
                  />

                  {/* Armor Legs */}
                  {guard.healed ? (
                    <>
                      <Line x1={5} y1={PLAYER_H - 6} x2={5} y2={PLAYER_H} stroke="#059669" strokeWidth={3} strokeLinecap="round" />
                      <Line x1={PLAYER_W - 5} y1={PLAYER_H - 6} x2={PLAYER_W - 5} y2={PLAYER_H} stroke="#059669" strokeWidth={3} strokeLinecap="round" />
                    </>
                  ) : (
                    <>
                      <Line x1={3} y1={PLAYER_H - 8} x2={10} y2={PLAYER_H - 2} stroke="#991B1B" strokeWidth={3} strokeLinecap="round" />
                      <Line x1={10} y1={PLAYER_H - 2} x2={16} y2={PLAYER_H - 2} stroke="#991B1B" strokeWidth={3} strokeLinecap="round" />
                    </>
                  )}

                  {/* Floating Guard HUD Speech / Vital Bubble */}
                  <G transform="translate(-30, -28)">
                    <Rect
                      x={0}
                      y={0}
                      width={80}
                      height={18}
                      fill={guard.healed ? '#052E16' : '#1C0B12'}
                      stroke={guard.healed ? '#10B981' : '#F43F5E'}
                      strokeWidth={1.5}
                      rx={5}
                    />
                    <Polygon
                      points="36,18 40,23 44,18"
                      fill={guard.healed ? '#052E16' : '#1C0B12'}
                      stroke={guard.healed ? '#10B981' : '#F43F5E'}
                      strokeWidth={1.2}
                    />
                    <SvgText
                      x={40}
                      y={12.5}
                      fill={guard.healed ? '#A7F3D0' : '#FDA4AF'}
                      fontSize={9}
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {guard.healed ? 'KEY REVEALED!' : 'NEED A HEART...'}
                    </SvgText>
                  </G>
                </G>
              )}

              {/* Laser Blaster Gun Item (Room 12) */}
              {gun && !gun.taken && (
                <G transform={`translate(${gun.x}, ${gun.y})`}>
                  <Rect x={-4} y={-3} width={18} height={9} fill="#0284C7" stroke="#00F5FF" strokeWidth={1.5} rx={2} />
                  <Rect x={-2} y={3} width={5} height={7} fill="#1E293B" rx={1} />
                  <Circle cx={5} cy={2} r={14} stroke="#00F5FF" strokeWidth={1} strokeDasharray="3 2" opacity={0.7} />
                </G>
              )}

              {/* Fired Blaster Laser Bolt */}
              {bullet && bullet.active && (
                <Circle cx={bullet.x} cy={bullet.y} r={5} fill="#00F5FF" stroke="#FFFFFF" strokeWidth={1.5} />
              )}

              {/* Rotatable Big Spikes (Room 13) */}
              {rotatableSpikes && (
                <G transform={`translate(${rotatableSpikes.x}, ${rotatableSpikes.y})`}>
                  {rotatableSpikes.rotated ? (
                    <G>
                      <Rect x={0} y={0} width={rotatableSpikes.w} height={rotatableSpikes.h} fill="#334155" stroke="#38BDF8" strokeWidth={2} rx={3} />
                      <Line x1={2} y1={2} x2={rotatableSpikes.w - 2} y2={2} stroke="#38BDF8" strokeWidth={2.5} />
                      <Circle cx={rotatableSpikes.w / 2} cy={rotatableSpikes.h / 2} r={3} fill="#38BDF8" />
                    </G>
                  ) : (
                    <G>
                      {Array.from({ length: Math.floor(rotatableSpikes.w / 12) }).map((_, i) => (
                        <Path
                          key={`rspk_${i}`}
                          d={`M${i * 12},${rotatableSpikes.h} L${i * 12 + 6},0 L${i * 12 + 12},${rotatableSpikes.h} Z`}
                          fill="#EF4444"
                          stroke="#FFFFFF"
                          strokeWidth={1}
                        />
                      ))}
                    </G>
                  )}
                </G>
              )}

              {/* Exit Door */}
              <G transform={`translate(${exitDoor.x}, ${exitDoor.y})`}>
                {exitDoor.isFalling && (
                  <Line
                    x1={exitDoor.w / 2}
                    y1={-12}
                    x2={exitDoor.w / 2}
                    y2={0}
                    stroke="#00F5FF"
                    strokeWidth={2.5}
                    strokeDasharray="4 2"
                    opacity={0.85}
                  />
                )}
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
              <G
                transform={
                  gravityInverted
                    ? `translate(${player.x}, ${player.y + PLAYER_H}) scale(1, -1)`
                    : `translate(${player.x}, ${player.y})`
                }
              >
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

        {/* Extra Action Buttons (Blaster, Spikes Flip) */}
        {(gun?.taken || rotatableSpikes) && (
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            {gun && gun.taken && (
              <Pressable
                style={{
                  backgroundColor: '#FF0055',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: '#FFFFFF',
                }}
                onPress={handleFireBlaster}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 }}>
                  🔫 FIRE BLASTER
                </Text>
              </Pressable>
            )}
            {rotatableSpikes && (
              <Pressable
                style={{
                  backgroundColor: rotatableSpikes.rotated ? '#10B981' : '#F59E0B',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: '#FFFFFF',
                }}
                onPress={handleFlipSpikes}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 }}>
                  {rotatableSpikes.rotated ? '✓ SPIKES INVERTED' : '🔄 FLIP SPIKES (180°)'}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* On-Screen Touch D-PAD & Jump Controls (Supports simultaneous Multi-Touch Running + Jumping) */}
        <View
          style={styles.controlsBar}
          onTouchStart={(e) => handleControlsTouch(e, 'start')}
          onTouchMove={(e) => handleControlsTouch(e, 'move')}
          onTouchEnd={(e) => handleControlsTouch(e, 'end')}
          onTouchCancel={(e) => handleControlsTouch(e, 'end')}
        >
          <View style={styles.dpadRow} pointerEvents="none">
            <View style={[styles.ctrlBtn, isLeftActive && styles.ctrlBtnPressed]}>
              <Text style={styles.ctrlBtnText}>◀</Text>
            </View>

            <View style={[styles.ctrlBtn, isRightActive && styles.ctrlBtnPressed]}>
              <Text style={styles.ctrlBtnText}>▶</Text>
            </View>
          </View>

          <View
            pointerEvents="none"
            style={[styles.jumpBtn, isJumpActive && styles.jumpBtnPressed]}
          >
            <Text style={styles.jumpBtnText}>▲ JUMP</Text>
          </View>
        </View>

        {/* Floating Dragged Heart from Hint Box */}
        {draggingHeartPos && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: draggingHeartPos.x - 24,
              top: draggingHeartPos.y - 24,
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: 'rgba(255, 0, 85, 0.95)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: '#FFFFFF',
              shadowColor: '#FF0055',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.8,
              shadowRadius: 10,
              elevation: 12,
              zIndex: 99999,
            }}
          >
            <Text style={{ fontSize: 24 }}>❤️</Text>
          </View>
        )}

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
          onNextLevel={handleNextLevel}
          onPlayAgain={handleRetry}
          onRetry={handleRetry}
          nextLabel="NEXT CHAMBER ▶"
          replayLabel="PLAY AGAIN ⟳"
          retryLabel="RETRY VAULT ⟳"
          onBackToHub={onBackToHub}
        />

        {/* Temporary Level Warp Menu Dropdown (1 - 100) */}
        <LevelWarpModal
          visible={showLevelWarp}
          currentLevel={level}
          totalLevels={100}
          accentColor="#00F5FF"
          gameTitle="CHAMBER ESCAPE"
          onSelectLevel={(lvlNum) => {
            setLevel(lvlNum);
            try {
              AsyncStorage.setItem(STORAGE_LEVEL_KEY, String(lvlNum));
            } catch {}
            initRoom(lvlNum);
          }}
          onClose={() => setShowLevelWarp(false)}
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
  warpPill: {
    backgroundColor: '#00F5FF',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  warpPillText: {
    fontFamily: monoFont,
    fontSize: 7.5,
    fontWeight: '900',
    color: '#060914',
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
