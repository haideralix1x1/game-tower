import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  useWindowDimensions,
  Platform,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { styles, COLORS, THEMES, GAME_CONFIG } from './styles';
import CyberBackground from './src/components/CyberBackground';
import MiniGameHeader from './src/components/MiniGameHeader';
import MenuOverlays from './src/components/MenuOverlays';
import {
  getBlockColor,
  getSpeedForBlockCount,
  evaluateBlockDrop,
  createParticleBurst,
  nextEntityId,
} from './src/utils/physics';
import {
  triggerLightHaptic,
  triggerSliceHaptic,
  triggerPerfectHaptic,
  triggerSpeedUpHaptic,
  triggerGameOverHaptic,
} from './src/utils/haptics';
import {
  playTapSound,
  playSliceSound,
  playPerfectSound,
  playSpeedUpSound,
  playGameOverSound,
  setSoundMuted,
} from './src/utils/sound';

const hexToRgba = (hex, alpha = 1) => {
  if (!hex || typeof hex !== 'string') return `rgba(0, 245, 255, ${alpha})`;
  const clean = hex.replace('#', '');
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
};

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export default function GameScreen({ onBackToHub, onScoreUpdate } = {}) {
  const windowDims = useWindowDimensions();
  const [viewport, setViewport] = useState({
    width: Math.max(320, windowDims.width || 390),
    height: Math.max(560, windowDims.height || 844),
  });

  const screenWidth = viewport.width;
  const screenHeight = viewport.height;
  const baseFloorY = Math.round(screenHeight * 0.78);
  const initialBlockWidth = Math.round(
    Math.min(280, Math.max(160, screenWidth * GAME_CONFIG.INITIAL_WIDTH_RATIO))
  );

  // High-level React UI state
  const [gameState, setGameState] = useState('START'); // 'START' | 'PLAYING' | 'PAUSED' | 'GAME_OVER'
  const [themeId, setThemeId] = useState('CYBER_NEON');
  const [isMuted, setIsMuted] = useState(false);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [combo, setCombo] = useState(0);
  const [speedLevel, setSpeedLevel] = useState(1);
  const [speedMultiplier, setSpeedMultiplier] = useState('1.0');
  const [widthPercent, setWidthPercent] = useState(100);
  const [stats, setStats] = useState({
    blocksPlaced: 0,
    maxCombo: 0,
    perfectCount: 0,
    speedLevel: 1,
  });

  // Render snapshots synced from fixed-timestep loop
  const [stack, setStack] = useState([]);
  const [activeBlockMeta, setActiveBlockMeta] = useState(null);
  const [fxSnapshot, setFxSnapshot] = useState({
    debris: [],
    particles: [],
    floatingTexts: [],
    shockwaves: [],
    laserBeams: [],
    cameraY: 0,
  });

  // Reanimated shared values for 60 FPS hardware-accelerated motion & screen shake
  const activeBlockX = useSharedValue(0);
  const activeBlockY = useSharedValue(0);
  const activeBlockW = useSharedValue(initialBlockWidth);
  const activeTrailOffset = useSharedValue(0);
  const cameraOffsetY = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const shakeY = useSharedValue(0);

  // Mutable deterministic physics engine state for the fixed-timestep loop
  const engineRef = useRef({
    status: 'START',
    themeId: 'CYBER_NEON',
    stack: [],
    activeBlock: null,
    debris: [],
    particles: [],
    floatingTexts: [],
    shockwaves: [],
    laserBeams: [],
    cameraY: 0,
    targetCameraY: 0,
    score: 0,
    bestScore: 0,
    combo: 0,
    maxCombo: 0,
    perfectCount: 0,
    lastTimestamp: 0,
    accumulator: 0,
  });

  // Load persisted high score, theme, and mute settings on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [storedBest, storedTheme, storedMuted] = await Promise.all([
          AsyncStorage.getItem(GAME_CONFIG.STORAGE_BEST_SCORE_KEY),
          AsyncStorage.getItem(GAME_CONFIG.STORAGE_THEME_KEY),
          AsyncStorage.getItem(GAME_CONFIG.STORAGE_MUTED_KEY),
        ]);
        if (!mounted) return;

        if (storedBest !== null) {
          const parsed = parseInt(storedBest, 10);
          if (!Number.isNaN(parsed) && parsed > 0) {
            setBestScore(parsed);
            engineRef.current.bestScore = parsed;
          }
        }
        if (storedTheme && THEMES[storedTheme]) {
          setThemeId(storedTheme);
          engineRef.current.themeId = storedTheme;
        }
        if (storedMuted === 'true') {
          setIsMuted(true);
          setSoundMuted(true);
        }
      } catch {
        // Ignore storage errors in restricted environments
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const persistBestScore = useCallback(async (newBest) => {
    try {
      await AsyncStorage.setItem(
        GAME_CONFIG.STORAGE_BEST_SCORE_KEY,
        String(newBest)
      );
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Trigger Reanimated screen shake
  const triggerScreenShake = useCallback(
    (intensityX = 5, intensityY = 4) => {
      shakeX.value = withSequence(
        withTiming(-intensityX, { duration: 30 }),
        withTiming(intensityX * 0.85, { duration: 34 }),
        withTiming(-intensityX * 0.5, { duration: 34 }),
        withSpring(0, { damping: 12, stiffness: 320 })
      );
      shakeY.value = withSequence(
        withTiming(intensityY, { duration: 32 }),
        withTiming(-intensityY * 0.65, { duration: 36 }),
        withSpring(0, { damping: 12, stiffness: 320 })
      );
    },
    [shakeX, shakeY]
  );

  // Create the initial base block and optional preview tower
  const buildInitialTower = useCallback(
    (forPlay = true, customThemeId = engineRef.current.themeId) => {
      const baseBlock = {
        id: 'foundation_0',
        index: 0,
        x: Math.round((screenWidth - initialBlockWidth) / 2),
        y: baseFloorY - GAME_CONFIG.BLOCK_HEIGHT,
        width: initialBlockWidth,
        height: GAME_CONFIG.BLOCK_HEIGHT,
        color: getBlockColor(0, customThemeId),
        isPerfect: true,
        comboStreak: 0,
      };

      const firstMovingY = baseBlock.y - GAME_CONFIG.BLOCK_HEIGHT;
      const { speed, level, multiplierRatio } = getSpeedForBlockCount(0);
      const startFromLeft = Math.random() > 0.5;
      const startX = startFromLeft
        ? 16
        : Math.max(16, screenWidth - initialBlockWidth - 16);

      const firstMovingBlock = {
        id: nextEntityId('active'),
        index: 1,
        x: startX,
        y: firstMovingY,
        width: initialBlockWidth,
        height: GAME_CONFIG.BLOCK_HEIGHT,
        direction: startFromLeft ? 1 : -1,
        speed,
        color: getBlockColor(1, customThemeId),
      };

      engineRef.current = {
        ...engineRef.current,
        status: forPlay ? 'PLAYING' : 'START',
        themeId: customThemeId,
        stack: [baseBlock],
        activeBlock: firstMovingBlock,
        debris: [],
        particles: [],
        floatingTexts: [],
        shockwaves: [],
        laserBeams: [],
        cameraY: 0,
        targetCameraY: 0,
        score: 0,
        combo: 0,
        maxCombo: 0,
        perfectCount: 0,
        lastTimestamp: 0,
        accumulator: 0,
      };

      activeBlockX.value = firstMovingBlock.x;
      activeBlockY.value = firstMovingBlock.y;
      activeBlockW.value = firstMovingBlock.width;
      activeTrailOffset.value = -firstMovingBlock.direction * 14;
      cameraOffsetY.value = 0;

      setStack([baseBlock]);
      setActiveBlockMeta(firstMovingBlock);
      setScore(0);
      setIsNewRecord(false);
      setCombo(0);
      setSpeedLevel(level);
      setSpeedMultiplier(multiplierRatio);
      setWidthPercent(100);
      setStats({
        blocksPlaced: 0,
        maxCombo: 0,
        perfectCount: 0,
        speedLevel: 1,
      });
      setFxSnapshot({
        debris: [],
        particles: [],
        floatingTexts: [],
        shockwaves: [],
        laserBeams: [],
        cameraY: 0,
      });
    },
    [
      screenWidth,
      baseFloorY,
      initialBlockWidth,
      activeBlockX,
      activeBlockY,
      activeBlockW,
      activeTrailOffset,
      cameraOffsetY,
    ]
  );

  // Initialize preview tower on first layout
  useEffect(() => {
    if (engineRef.current.stack.length === 0 && screenWidth > 0) {
      buildInitialTower(false, themeId);
    }
  }, [screenWidth, buildInitialTower, themeId]);

  // Spawn a floating text popup
  const spawnFloatingText = useCallback(
    ({ text, subText = '', x, y, color = COLORS.cyan, scale = 1 }) => {
      const clampedX = Math.max(70, Math.min(screenWidth - 70, x));
      engineRef.current.floatingTexts.push({
        id: nextEntityId('txt'),
        text,
        subText,
        x: clampedX,
        y,
        vy: -82,
        opacity: 1,
        scale,
        age: 0,
        duration: 0.98,
        color,
      });
    },
    [screenWidth]
  );

  // Core block drop & precision slicing handler
  const handleDropBlock = useCallback(() => {
    const eng = engineRef.current;
    if (eng.status === 'START') {
      triggerLightHaptic();
      playTapSound();
      buildInitialTower(true, themeId);
      setGameState('PLAYING');
      return;
    }
    if (eng.status !== 'PLAYING' || !eng.activeBlock) return;

    const currentActive = {
      ...eng.activeBlock,
      x: activeBlockX.value,
    };
    const topOfStack = eng.stack[eng.stack.length - 1];
    if (!topOfStack) return;

    const result = evaluateBlockDrop({
      activeBlock: currentActive,
      targetBlock: topOfStack,
      currentCombo: eng.combo,
      maxInitialWidth: initialBlockWidth,
      screenWidth,
    });

    // Case 1: Block missed the stack completely -> Game Over
    if (result.status === 'MISS') {
      if (result.debris) {
        eng.debris.push(result.debris);
      }
      eng.particles.push(
        ...createParticleBurst({
          x: result.cutX,
          y: currentActive.y + currentActive.height / 2,
          color: currentActive.color,
          count: 22,
          isPerfect: false,
        })
      );
      spawnFloatingText({
        text: 'MISSED!',
        subText: 'TOWER COLLAPSE',
        x: currentActive.x + currentActive.width / 2,
        y: currentActive.y - 12,
        color: COLORS.danger,
        scale: 1.18,
      });

      eng.activeBlock = null;
      eng.status = 'GAME_OVER';
      setActiveBlockMeta(null);
      triggerGameOverHaptic();
      playGameOverSound();
      triggerScreenShake(13, 10);
      setGameState('GAME_OVER');
      return;
    }

    // Case 2: Successful placement (PERFECT or SLICED)
    const { placedBlock, debris, newCombo, pointsEarned, widthRestored, cutX } =
      result;

    const updatedStack = [...eng.stack, placedBlock];
    eng.stack = updatedStack;
    const placedCount = updatedStack.length - 1; // exclude foundation_0

    const newScore = eng.score + pointsEarned;
    eng.score = newScore;
    eng.combo = newCombo;
    if (newCombo > eng.maxCombo) {
      eng.maxCombo = newCombo;
    }

    if (result.status === 'PERFECT') {
      eng.perfectCount += 1;
      triggerPerfectHaptic(newCombo);
      playPerfectSound(newCombo);
      triggerScreenShake(4, 6);

      // Add double concentric shockwave rings on the placed block
      eng.shockwaves.push({
        id: nextEntityId('wave'),
        x: placedBlock.x,
        y: placedBlock.y,
        width: placedBlock.width,
        height: placedBlock.height,
        expandX: 0,
        expandY: 0,
        opacity: 1,
        color:
          newCombo >= 2 ? COLORS.solarGold : placedBlock.color.highlight,
      });

      // Celebratory particle burst across the block
      eng.particles.push(
        ...createParticleBurst({
          x: placedBlock.x + placedBlock.width / 2,
          y: placedBlock.y + placedBlock.height / 2,
          color: placedBlock.color,
          count: 22,
          isPerfect: true,
          blockWidth: placedBlock.width,
        })
      );

      const subLabel =
        widthRestored > 0
          ? `COMBO x${newCombo + 1} // +${widthRestored}PX RESTORED!`
          : newCombo > 1
            ? `COMBO x${newCombo + 1} // +${pointsEarned} PTS`
            : `+${pointsEarned} PTS`;

      spawnFloatingText({
        text: newCombo >= 3 ? `OVERDRIVE x${newCombo + 1}!` : 'PERFECT!',
        subText: subLabel,
        x: placedBlock.x + placedBlock.width / 2,
        y: placedBlock.y - 16,
        color: newCombo >= 2 ? COLORS.solarGold : COLORS.cyan,
        scale: Math.min(1.38, 1.06 + newCombo * 0.06),
      });
    } else {
      // SLICED placement
      triggerSliceHaptic();
      playSliceSound();
      triggerScreenShake(6.5, 4.5);

      if (debris) {
        eng.debris.push(debris);
      }

      // Spawn a vertical plasma laser slice beam at the exact cut coordinate
      eng.laserBeams.push({
        id: nextEntityId('laser'),
        x: cutX - 2.5,
        y: placedBlock.y - 26,
        height: placedBlock.height + 52,
        opacity: 1,
        color: placedBlock.color.highlight,
      });

      eng.particles.push(
        ...createParticleBurst({
          x: cutX,
          y: placedBlock.y + placedBlock.height / 2,
          color: placedBlock.color,
          count: 16,
          isPerfect: false,
        })
      );

      spawnFloatingText({
        text: `+${pointsEarned}`,
        subText: 'LASER CUT',
        x: placedBlock.x + placedBlock.width / 2,
        y: placedBlock.y - 12,
        color: placedBlock.color.highlight,
        scale: 0.94,
      });
    }

    // Check high score
    if (onScoreUpdate) {
      onScoreUpdate(newScore);
    }
    if (newScore > eng.bestScore) {
      eng.bestScore = newScore;
      setBestScore(newScore);
      setIsNewRecord(true);
      persistBestScore(newScore);
    }

    // Calculate next speed level (increases every 5 blocks)
    const prevSpeedInfo = getSpeedForBlockCount(placedCount - 1);
    const nextSpeedInfo = getSpeedForBlockCount(placedCount);

    if (nextSpeedInfo.level > prevSpeedInfo.level) {
      triggerSpeedUpHaptic();
      playSpeedUpSound();
      spawnFloatingText({
        text: `SPEED UP! LVL ${nextSpeedInfo.level}`,
        subText: `${nextSpeedInfo.multiplierRatio}x VELOCITY`,
        x: screenWidth / 2,
        y: placedBlock.y - 56,
        color: COLORS.magenta,
        scale: 1.18,
      });
    }

    // Update target camera pan so the active top of stack stays smoothly centered
    const desiredScreenTopY =
      screenHeight * GAME_CONFIG.STACK_TARGET_SCREEN_RATIO;
    const nextBlockY = placedBlock.y - GAME_CONFIG.BLOCK_HEIGHT;
    if (nextBlockY + eng.targetCameraY < desiredScreenTopY) {
      eng.targetCameraY = desiredScreenTopY - nextBlockY;
    }

    // Spawn next oscillating block from alternating side
    const nextIndex = placedBlock.index + 1;
    const spawnLeft = nextIndex % 2 === 0;
    const nextStartX = spawnLeft
      ? 12
      : Math.max(12, screenWidth - placedBlock.width - 12);

    const nextActiveBlock = {
      id: nextEntityId('active'),
      index: nextIndex,
      x: nextStartX,
      y: nextBlockY,
      width: placedBlock.width,
      height: GAME_CONFIG.BLOCK_HEIGHT,
      direction: spawnLeft ? 1 : -1,
      speed: nextSpeedInfo.speed,
      color: getBlockColor(nextIndex, eng.themeId),
    };

    eng.activeBlock = nextActiveBlock;
    activeBlockX.value = nextActiveBlock.x;
    activeBlockY.value = nextActiveBlock.y;
    activeBlockW.value = nextActiveBlock.width;
    activeTrailOffset.value = -nextActiveBlock.direction * 14;

    // Sync HUD & React state
    const newWidthPct = (placedBlock.width / initialBlockWidth) * 100;
    setStack(updatedStack);
    setActiveBlockMeta(nextActiveBlock);
    setScore(newScore);
    setCombo(newCombo);
    setSpeedLevel(nextSpeedInfo.level);
    setSpeedMultiplier(nextSpeedInfo.multiplierRatio);
    setWidthPercent(newWidthPct);
    setStats({
      blocksPlaced: placedCount,
      maxCombo: eng.maxCombo,
      perfectCount: eng.perfectCount,
      speedLevel: nextSpeedInfo.level,
    });
  }, [
    activeBlockX,
    activeBlockY,
    activeBlockW,
    activeTrailOffset,
    initialBlockWidth,
    screenWidth,
    screenHeight,
    persistBestScore,
    spawnFloatingText,
    triggerScreenShake,
  ]);

  // Fixed-Timestep 60 FPS Game Loop using requestAnimationFrame
  useEffect(() => {
    let rafId = null;
    const dtSeconds = GAME_CONFIG.FIXED_TIMESTEP_MS / 1000;

    const stepPhysics = (dt) => {
      const eng = engineRef.current;

      // 1. Update active block horizontal oscillation (when PLAYING or background attract mode on START)
      if (
        (eng.status === 'PLAYING' || eng.status === 'START') &&
        eng.activeBlock
      ) {
        const block = eng.activeBlock;
        let nextX = block.x + block.direction * block.speed * dt;
        const minX = 10;
        const maxX = Math.max(minX + 10, screenWidth - block.width - 10);

        if (nextX <= minX) {
          nextX = minX;
          block.direction = 1;
        } else if (nextX >= maxX) {
          nextX = maxX;
          block.direction = -1;
        }

        block.x = nextX;
        activeBlockX.value = nextX;
        activeTrailOffset.value =
          -block.direction * Math.min(22, (block.speed / 220) * 12);
      }

      // 2. Smoothly pan camera upward toward targetCameraY
      if (Math.abs(eng.targetCameraY - eng.cameraY) > 0.15) {
        eng.cameraY +=
          (eng.targetCameraY - eng.cameraY) *
          Math.min(1, GAME_CONFIG.CAMERA_LERP_SPEED * dt);
        cameraOffsetY.value = eng.cameraY;
      } else if (eng.cameraY !== eng.targetCameraY) {
        eng.cameraY = eng.targetCameraY;
        cameraOffsetY.value = eng.cameraY;
      }

      // 3. Step falling sliced debris physics (gravity + rotation + fade)
      if (eng.debris.length > 0) {
        const nextDebris = [];
        for (let i = 0; i < eng.debris.length; i += 1) {
          const d = eng.debris[i];
          const updatedY = d.y + d.vy * dt;
          const updatedVy = d.vy + GAME_CONFIG.GRAVITY * dt;
          const updatedX = d.x + d.vx * dt;
          const updatedRotation = d.rotation + d.angularVelocity * dt;
          const updatedOpacity = d.opacity - dt * 1.1;

          if (updatedOpacity > 0.04 && updatedY + eng.cameraY < screenHeight + 130) {
            nextDebris.push({
              ...d,
              x: updatedX,
              y: updatedY,
              vy: updatedVy,
              rotation: updatedRotation,
              opacity: updatedOpacity,
            });
          }
        }
        eng.debris = nextDebris;
      }

      // 4. Step particle burst physics
      if (eng.particles.length > 0) {
        const nextParticles = [];
        for (let i = 0; i < eng.particles.length; i += 1) {
          const p = eng.particles[i];
          const nextOpacity = p.opacity - p.decay * dt;
          if (nextOpacity > 0.04) {
            nextParticles.push({
              ...p,
              x: p.x + p.vx * dt,
              y: p.y + p.vy * dt,
              vy: p.vy + GAME_CONFIG.GRAVITY * 0.65 * dt,
              opacity: nextOpacity,
            });
          }
        }
        eng.particles = nextParticles;
      }

      // 5. Step Perfect alignment shockwave rings
      if (eng.shockwaves.length > 0) {
        const nextWaves = [];
        for (let i = 0; i < eng.shockwaves.length; i += 1) {
          const w = eng.shockwaves[i];
          const nextOpacity = w.opacity - dt * 2.1;
          if (nextOpacity > 0.03) {
            nextWaves.push({
              ...w,
              expandX: w.expandX + 88 * dt,
              expandY: w.expandY + 30 * dt,
              opacity: nextOpacity,
            });
          }
        }
        eng.shockwaves = nextWaves;
      }

      // 6. Step Laser Cut Beams
      if (eng.laserBeams.length > 0) {
        const nextBeams = [];
        for (let i = 0; i < eng.laserBeams.length; i += 1) {
          const b = eng.laserBeams[i];
          const nextOpacity = b.opacity - dt * 4.5;
          if (nextOpacity > 0.04) {
            nextBeams.push({
              ...b,
              opacity: nextOpacity,
            });
          }
        }
        eng.laserBeams = nextBeams;
      }

      // 7. Step floating combo / score popups
      if (eng.floatingTexts.length > 0) {
        const nextTexts = [];
        for (let i = 0; i < eng.floatingTexts.length; i += 1) {
          const t = eng.floatingTexts[i];
          const nextAge = t.age + dt;
          if (nextAge < t.duration) {
            const progress = nextAge / t.duration;
            const pulse =
              progress < 0.22
                ? 1 + (progress / 0.22) * 0.26
                : 1.26 - ((progress - 0.22) / 0.78) * 0.2;
            nextTexts.push({
              ...t,
              age: nextAge,
              y: t.y + t.vy * dt,
              opacity: progress > 0.55 ? 1 - (progress - 0.55) / 0.45 : 1,
              currentScale: t.scale * pulse,
            });
          }
        }
        eng.floatingTexts = nextTexts;
      }
    };

    const loop = (timestamp) => {
      const eng = engineRef.current;
      if (!eng.lastTimestamp) {
        eng.lastTimestamp = timestamp;
      }

      const rawDelta = timestamp - eng.lastTimestamp;
      eng.lastTimestamp = timestamp;
      const clampedDelta = Math.min(rawDelta, GAME_CONFIG.MAX_FRAME_DELTA_MS);

      if (eng.status !== 'PAUSED') {
        eng.accumulator += clampedDelta;
        while (eng.accumulator >= GAME_CONFIG.FIXED_TIMESTEP_MS) {
          stepPhysics(dtSeconds);
          eng.accumulator -= GAME_CONFIG.FIXED_TIMESTEP_MS;
        }

        // Sync transient FX arrays when active
        if (
          eng.debris.length > 0 ||
          eng.particles.length > 0 ||
          eng.floatingTexts.length > 0 ||
          eng.shockwaves.length > 0 ||
          eng.laserBeams.length > 0 ||
          Math.abs(eng.targetCameraY - eng.cameraY) > 0.2
        ) {
          setFxSnapshot({
            debris: [...eng.debris],
            particles: [...eng.particles],
            floatingTexts: [...eng.floatingTexts],
            shockwaves: [...eng.shockwaves],
            laserBeams: [...eng.laserBeams],
            cameraY: eng.cameraY,
          });
        } else if (
          fxSnapshot.debris.length > 0 ||
          fxSnapshot.particles.length > 0 ||
          fxSnapshot.floatingTexts.length > 0 ||
          fxSnapshot.shockwaves.length > 0 ||
          fxSnapshot.laserBeams.length > 0
        ) {
          setFxSnapshot({
            debris: [],
            particles: [],
            floatingTexts: [],
            shockwaves: [],
            laserBeams: [],
            cameraY: eng.cameraY,
          });
        }
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [
    screenWidth,
    screenHeight,
    activeBlockX,
    activeTrailOffset,
    cameraOffsetY,
    fxSnapshot.debris.length,
    fxSnapshot.particles.length,
    fxSnapshot.floatingTexts.length,
    fxSnapshot.shockwaves.length,
    fxSnapshot.laserBeams.length,
  ]);

  // Support Spacebar / Enter key on Web for accessibility & desktop testing
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const onKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (engineRef.current.status === 'PLAYING') {
          handleDropBlock();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleDropBlock]);

  // Theme & Mute Handlers
  const handleSelectTheme = useCallback(
    async (newThemeId) => {
      if (!THEMES[newThemeId]) return;
      triggerLightHaptic();
      playTapSound();
      setThemeId(newThemeId);
      engineRef.current.themeId = newThemeId;
      buildInitialTower(false, newThemeId);
      try {
        await AsyncStorage.setItem(GAME_CONFIG.STORAGE_THEME_KEY, newThemeId);
      } catch {
        // Ignore storage error
      }
    },
    [buildInitialTower]
  );

  const handleToggleMute = useCallback(async () => {
    triggerLightHaptic();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    setSoundMuted(nextMuted);
    if (!nextMuted) {
      playTapSound();
    }
    try {
      await AsyncStorage.setItem(
        GAME_CONFIG.STORAGE_MUTED_KEY,
        String(nextMuted)
      );
    } catch {
      // Ignore storage error
    }
  }, [isMuted]);

  // Menu lifecycle handlers
  const handleStartGame = useCallback(() => {
    triggerLightHaptic();
    playTapSound();
    buildInitialTower(true, themeId);
    setGameState('PLAYING');
  }, [buildInitialTower, themeId]);

  const handlePauseGame = useCallback(() => {
    if (engineRef.current.status !== 'PLAYING') return;
    triggerLightHaptic();
    playTapSound();
    engineRef.current.status = 'PAUSED';
    setGameState('PAUSED');
  }, []);

  const handleResumeGame = useCallback(() => {
    if (engineRef.current.status !== 'PAUSED') return;
    triggerLightHaptic();
    playTapSound();
    engineRef.current.lastTimestamp = 0;
    engineRef.current.status = 'PLAYING';
    setGameState('PLAYING');
  }, []);

  const handleRestartGame = useCallback(() => {
    triggerLightHaptic();
    playTapSound();
    buildInitialTower(true, themeId);
    setGameState('PLAYING');
  }, [buildInitialTower, themeId]);

  const handleReturnHome = useCallback(() => {
    triggerLightHaptic();
    playTapSound();
    buildInitialTower(false, themeId);
    setGameState('START');
    if (onBackToHub) {
      onBackToHub();
    }
  }, [buildInitialTower, themeId, onBackToHub]);

  // Animated styles for screen shake, camera pan, and active block motion
  const shakeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shakeX.value },
      { translateY: shakeY.value },
    ],
  }));

  const worldCameraStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cameraOffsetY.value }],
  }));

  const activeBlockAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: activeBlockX.value },
      { translateY: activeBlockY.value },
    ],
    width: activeBlockW.value,
  }));

  const ghostTrailAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: activeBlockX.value + activeTrailOffset.value },
      { translateY: activeBlockY.value },
    ],
    width: activeBlockW.value,
  }));

  const handleViewportLayout = useCallback((event) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setViewport((prev) => {
        if (
          Math.abs(prev.width - width) < 2 &&
          Math.abs(prev.height - height) < 2
        ) {
          return prev;
        }
        return { width, height };
      });
    }
  }, []);

  // Only render stacked blocks that are within or near the visible viewport for 60 FPS performance
  const visibleStack = stack.filter((b) => {
    const screenY = b.y + fxSnapshot.cameraY;
    return screenY > -80 && screenY < screenHeight + 120;
  });

  const foundationBase = stack[0];
  const activeTheme = THEMES[themeId] || THEMES.CYBER_NEON;

  return (
    <View style={styles.rootContainer} onLayout={handleViewportLayout}>
      {/* Background Synthwave Sun, City Skyline & Dynamic Cyber Altitude Grid */}
      <CyberBackground
        screenWidth={screenWidth}
        screenHeight={screenHeight}
        cameraY={fxSnapshot.cameraY}
        baseFloorY={baseFloorY}
        themeId={themeId}
        combo={combo}
      />

      {/* Universal MiniGameHeader with Safe Area Insets & Guaranteed Back Button */}
      <MiniGameHeader
        title="STACK BLOCK NEO"
        floorLabel="FLOOR 01"
        score={score}
        bestScore={bestScore}
        accentColor={activeTheme.accent}
        onBack={onBackToHub}
        onReset={handleRestartGame}
        rightExtra={
          <View style={localStyles.headerExtra}>
            <View
              style={[
                localStyles.levelBadge,
                { borderColor: hexToRgba(activeTheme.accent, 0.45) },
              ]}
            >
              <Text
                style={[
                  localStyles.levelBadgeText,
                  { color: activeTheme.accent },
                ]}
              >
                {`LVL ${speedLevel}`}
              </Text>
            </View>
            {combo >= 2 && (
              <View
                style={[
                  localStyles.comboBadge,
                  { borderColor: hexToRgba(COLORS.solarGold, 0.6) },
                ]}
              >
                <Text style={localStyles.comboBadgeText}>
                  {`x${combo + 1}`}
                </Text>
              </View>
            )}
          </View>
        }
      />

      {/* Interactive Touch Playfield with Screen Shake */}
      <Animated.View style={[styles.gameViewport, shakeAnimatedStyle]}>
        <Pressable
          style={styles.touchLayer}
          onPress={handleDropBlock}
        >
          {/* Camera-Panned World Space */}
          <Animated.View
            pointerEvents="none"
            style={[styles.worldContainer, worldCameraStyle]}
          >
            {/* Cybernetic Foundation Pedestal below the first block */}
            {foundationBase && (
              <View
                style={[
                  styles.foundationPedestal,
                  {
                    left: foundationBase.x - 8,
                    top: baseFloorY,
                    width: foundationBase.width + 16,
                    height: screenHeight - baseFloorY + 260,
                    borderColor: hexToRgba(activeTheme.accent, 0.6),
                  },
                ]}
              >
                <LinearGradient
                  colors={[
                    hexToRgba(activeTheme.accent, 0.28),
                    'rgba(14, 9, 30, 0.94)',
                    '#030308',
                  ]}
                  style={styles.bgGradient}
                />
                <View
                  style={[
                    styles.foundationGridStripe,
                    { backgroundColor: activeTheme.accent },
                  ]}
                />
                <View
                  style={[
                    styles.foundationCoreLine,
                    { backgroundColor: activeTheme.secondaryAccent },
                  ]}
                />
              </View>
            )}

              {/* Placed 3D Extruded Stack Blocks */}
              {visibleStack.map((block) => (
                <View
                  key={block.id}
                  style={[
                    styles.stackBlockContainer,
                    {
                      left: block.x,
                      top: block.y,
                      width: block.width,
                      height: block.height,
                      shadowColor: block.color.glow,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: block.isPerfect ? 0.85 : 0.6,
                      shadowRadius: block.isPerfect ? 12 : 8,
                    },
                  ]}
                >
                  {/* 2.5D Top Deck Surface */}
                  <View
                    style={[
                      styles.block3DTopDeck,
                      {
                        borderColor: block.color.highlight,
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={[
                        block.color.topFace || block.color.highlight,
                        block.color.primary,
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.bgGradient}
                    />
                  </View>

                  {/* 3D Front Extruded Slab Face */}
                  <View
                    style={[
                      styles.block3DFrontFace,
                      {
                        borderColor: block.isPerfect
                          ? '#FFFFFF'
                          : block.color.highlight,
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={[block.color.primary, block.color.secondary]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.bgGradient}
                    />
                    {/* Diagonal Specular Glass Sheen */}
                    <View style={styles.blockGlassReflection} />
                    {/* Bright Top Bevel */}
                    <View
                      style={[
                        styles.blockTopBevel,
                        { backgroundColor: block.color.highlight },
                      ]}
                    />
                    {/* Internal Plasma Energy Core Line */}
                    <View
                      style={[
                        styles.blockCenterEnergyCore,
                        {
                          backgroundColor:
                            block.color.core || block.color.highlight,
                        },
                      ]}
                    />
                    {/* Bottom Contact Shadow */}
                    <View style={styles.blockBottomShadow} />
                  </View>
                </View>
              ))}

              {/* Perfect Alignment Shockwaves */}
              {fxSnapshot.shockwaves.map((wave) => (
                <View
                  key={wave.id}
                  pointerEvents="none"
                  style={[
                    styles.perfectShockwave,
                    {
                      left: wave.x - wave.expandX / 2,
                      top: wave.y - wave.expandY / 2,
                      width: wave.width + wave.expandX,
                      height: wave.height + wave.expandY,
                      borderColor: wave.color,
                      opacity: wave.opacity,
                    },
                  ]}
                />
              ))}

              {/* Active Block Motion Ghost Trail */}
              {activeBlockMeta && (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.activeGhostTrail,
                    {
                      left: 0,
                      top: 0,
                      height: activeBlockMeta.height,
                      backgroundColor: activeBlockMeta.color.primary,
                      opacity: combo >= 2 ? 0.34 : 0.2,
                    },
                    ghostTrailAnimatedStyle,
                  ]}
                />
              )}

              {/* Active Sliding 3D Block (Driven at 60FPS via Reanimated SharedValues) */}
              {activeBlockMeta && (
                <Animated.View
                  style={[
                    styles.activeBlockWrapper,
                    {
                      left: 0,
                      top: 0,
                      height: activeBlockMeta.height,
                      shadowColor: activeBlockMeta.color.glow,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.95,
                      shadowRadius: 14,
                    },
                    activeBlockAnimatedStyle,
                  ]}
                >
                  {/* 2.5D Top Surface Deck */}
                  <View
                    style={[
                      styles.block3DTopDeck,
                      {
                        borderColor: '#FFFFFF',
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={[
                        activeBlockMeta.color.topFace ||
                          activeBlockMeta.color.highlight,
                        activeBlockMeta.color.primary,
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.bgGradient}
                    />
                  </View>

                  {/* 3D Front Extruded Face */}
                  <View
                    style={[
                      styles.block3DFrontFace,
                      {
                        borderColor:
                          combo >= 2
                            ? COLORS.solarGold
                            : activeBlockMeta.color.highlight,
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={[
                        activeBlockMeta.color.primary,
                        activeBlockMeta.color.secondary,
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.bgGradient}
                    />
                    <View style={styles.blockGlassReflection} />
                    <View
                      style={[
                        styles.blockTopBevel,
                        { backgroundColor: '#FFFFFF' },
                      ]}
                    />
                    <View
                      style={[
                        styles.blockCenterEnergyCore,
                        { backgroundColor: '#FFFFFF', opacity: 0.85 },
                      ]}
                    />
                    <View style={styles.blockBottomShadow} />
                  </View>

                  {/* Left & Right Laser Alignment Guides */}
                  <View
                    style={[
                      styles.activeBlockLaserGuide,
                      {
                        left: 0,
                        backgroundColor: hexToRgba(activeTheme.accent, 0.4),
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.activeBlockLaserGuide,
                      {
                        right: 0,
                        backgroundColor: hexToRgba(activeTheme.accent, 0.4),
                      },
                    ]}
                  />
                </Animated.View>
              )}

              {/* Vertical Laser Slice Beam Flashes */}
              {fxSnapshot.laserBeams.map((beam) => (
                <View
                  key={beam.id}
                  pointerEvents="none"
                  style={[
                    styles.laserCutBeam,
                    {
                      left: beam.x,
                      top: beam.y,
                      height: beam.height,
                      opacity: beam.opacity,
                      shadowColor: beam.color,
                    },
                  ]}
                />
              ))}

              {/* Falling Sliced 3D Debris Pieces */}
              {fxSnapshot.debris.map((d) => (
                <View
                  key={d.id}
                  pointerEvents="none"
                  style={[
                    styles.debrisPiece,
                    {
                      left: d.x,
                      top: d.y,
                      width: d.width,
                      height: d.height,
                      opacity: d.opacity,
                      borderColor: '#FFFFFF',
                      transform: [{ rotate: `${d.rotation.toFixed(1)}deg` }],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={[d.color.highlight, d.color.primary, d.color.secondary]}
                    style={styles.bgGradient}
                  />
                </View>
              ))}

              {/* Neon Particle Bursts */}
              {fxSnapshot.particles.map((pt) => (
                <View
                  key={pt.id}
                  pointerEvents="none"
                  style={[
                    styles.particleDot,
                    {
                      left: pt.x - pt.size / 2,
                      top: pt.y - pt.size / 2,
                      width: pt.size,
                      height: pt.size,
                      borderRadius: pt.isDiamond ? 1.5 : pt.size / 2,
                      backgroundColor: pt.color,
                      opacity: pt.opacity,
                      transform: pt.isDiamond ? [{ rotate: '45deg' }] : [],
                    },
                  ]}
                />
              ))}

              {/* Floating Score & Combo Text Popups */}
              {fxSnapshot.floatingTexts.map((ft) => (
                <View
                  key={ft.id}
                  pointerEvents="none"
                  style={[
                    styles.floatingTextWrapper,
                    {
                      left: ft.x - 130,
                      width: 260,
                      top: ft.y,
                      opacity: ft.opacity,
                      transform: [{ scale: ft.currentScale || ft.scale }],
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.floatingTextMain,
                      {
                        color: ft.color,
                        textShadowColor: ft.color,
                      },
                    ]}
                  >
                    {ft.text}
                  </Text>
                  {Boolean(ft.subText) && (
                    <Text
                      style={[
                        styles.floatingTextSub,
                        { color: COLORS.textPrimary },
                      ]}
                    >
                      {ft.subText}
                    </Text>
                  )}
                </View>
              ))}
            </Animated.View>

            {/* Subtle bottom prompt during first 2 blocks */}
            {gameState === 'PLAYING' && stats.blocksPlaced < 2 && (
              <View style={styles.tapPromptContainer}>
                <View
                  style={[
                    styles.tapPromptPill,
                    { borderColor: hexToRgba(activeTheme.accent, 0.45) },
                  ]}
                >
                  <Text
                    style={[
                      styles.tapPromptText,
                      { color: activeTheme.accent },
                    ]}
                  >
                    TAP ANYWHERE TO DROP SLAB
                  </Text>
                </View>
              </View>
            )}

            {/* Visual Start Banner when on START */}
            {gameState === 'START' && (
              <View style={localStyles.startBannerWrapper} pointerEvents="box-none">
                <View
                  pointerEvents="none"
                  style={[
                    localStyles.startBannerCard,
                    { borderColor: hexToRgba(activeTheme.accent, 0.5) },
                  ]}
                >
                  <Text
                    style={[
                      localStyles.startBannerTag,
                      { color: activeTheme.accent },
                    ]}
                  >
                    FLOOR 01 // OVERDRIVE COMBOS
                  </Text>
                  <Text style={localStyles.startBannerTitle}>
                    TAP TO PLAY
                  </Text>
                  <Text style={localStyles.startBannerDesc}>
                    Tap anywhere to launch tower, then stack moving slabs
                  </Text>
                </View>

                {/* Theme Selector Pills */}
                <View style={localStyles.themeSelectorRow} pointerEvents="auto">
                  {Object.values(THEMES).map((t) => {
                    const isSelected = t.id === themeId;
                    return (
                      <Pressable
                        key={t.id}
                        onPress={() => handleSelectTheme(t.id)}
                        style={[
                          localStyles.themePill,
                          isSelected && {
                            borderColor: t.accent,
                            backgroundColor: hexToRgba(t.accent, 0.22),
                          },
                        ]}
                      >
                        <View
                          style={[
                            localStyles.themeDot,
                            { backgroundColor: t.accent },
                          ]}
                        />
                        <Text
                          style={[
                            localStyles.themePillText,
                            isSelected && { color: '#FFFFFF' },
                          ]}
                        >
                          {t.name.split(' ')[1] || t.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </Pressable>
        </Animated.View>

      {/* Start, Pause, and Game Over Overlays */}
      <MenuOverlays
        gameState={gameState}
        score={score}
        bestScore={bestScore}
        isNewRecord={isNewRecord}
        stats={stats}
        themeId={themeId}
        onSelectTheme={handleSelectTheme}
        onStartGame={handleStartGame}
        onResumeGame={handleResumeGame}
        onRestartGame={handleRestartGame}
        onReturnHome={handleReturnHome}
        onBackToHub={onBackToHub}
      />
    </View>
  );
}

const localStyles = StyleSheet.create({
  headerExtra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  levelBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(8, 12, 28, 0.85)',
  },
  levelBadgeText: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  comboBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 209, 102, 0.16)',
  },
  comboBadgeText: {
    color: COLORS.solarGold,
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  startBannerWrapper: {
    position: 'absolute',
    top: '22%',
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 10,
  },
  startBannerCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: 'rgba(8, 10, 26, 0.94)',
    borderRadius: 18,
    borderWidth: 1.5,
    paddingHorizontal: 20,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#00F5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  startBannerTag: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.8,
    marginBottom: 6,
  },
  startBannerTitle: {
    fontFamily: monoFont,
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 6,
  },
  startBannerDesc: {
    fontFamily: monoFont,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  themeSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
  themePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(10, 12, 30, 0.88)',
    gap: 6,
  },
  themeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  themePillText: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
  },
});
