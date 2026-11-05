import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { View, Text, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  FadeIn,
} from 'react-native-reanimated';
import { COLORS } from '../../styles';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

let fxIdCounter = 1;
const nextFxId = () => {
  fxIdCounter += 1;
  return `fx_${fxIdCounter}`;
};

/**
 * Universal Juice Wrapper for any mini-game.
 * Provides imperative methods via ref:
 *  - ref.current.shake(intensityX, intensityY)
 *  - ref.current.burst(x, y, color, count)
 *  - ref.current.popup(text, subText, color, x, y)
 *  - ref.current.flash(color)
 *  - ref.current.celebrate(text, subText, color)
 */
const JuiceEngine = forwardRef(({ children }, ref) => {
  const { width, height } = useWindowDimensions();
  const shakeX = useSharedValue(0);
  const shakeY = useSharedValue(0);
  const flashOpacity = useSharedValue(0);
  const [flashColor, setFlashColor] = useState(COLORS.cyan);

  const [fxState, setFxState] = useState({
    particles: [],
    popups: [],
    rings: [],
  });

  const engineRef = useRef({
    particles: [],
    popups: [],
    rings: [],
  });

  const triggerShake = useCallback(
    (ix = 7, iy = 5) => {
      shakeX.value = withSequence(
        withTiming(-ix, { duration: 28 }),
        withTiming(ix * 0.85, { duration: 32 }),
        withTiming(-ix * 0.55, { duration: 32 }),
        withTiming(ix * 0.3, { duration: 28 }),
        withSpring(0, { damping: 11, stiffness: 340 })
      );
      shakeY.value = withSequence(
        withTiming(iy, { duration: 30 }),
        withTiming(-iy * 0.7, { duration: 34 }),
        withSpring(0, { damping: 11, stiffness: 340 })
      );
    },
    [shakeX, shakeY]
  );

  const triggerFlash = useCallback(
    (color = COLORS.cyan) => {
      setFlashColor(color);
      flashOpacity.value = withSequence(
        withTiming(0.28, { duration: 45 }),
        withTiming(0, { duration: 260 })
      );
    },
    [flashOpacity]
  );

  const spawnBurst = useCallback(
    (x, y, color = COLORS.cyan, count = 20) => {
      const cx = typeof x === 'number' ? x : width / 2;
      const cy = typeof y === 'number' ? y : height * 0.45;

      const list = [];
      for (let i = 0; i < count; i += 1) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
        const speed = 90 + Math.random() * 230;
        const size = 4 + Math.random() * 6;
        list.push({
          id: nextFxId(),
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 65,
          size,
          isDiamond: i % 2 === 0,
          opacity: 1,
          decay: 1.3 + Math.random() * 0.7,
          color:
            i % 3 === 0
              ? '#FFFFFF'
              : i % 2 === 0
                ? color
                : COLORS.solarGold,
        });
      }

      engineRef.current.particles.push(...list);
      engineRef.current.rings.push({
        id: nextFxId(),
        x: cx,
        y: cy,
        radius: 12,
        opacity: 0.95,
        color,
      });
    },
    [width, height]
  );

  const spawnPopup = useCallback(
    (text, subText = '', color = COLORS.cyan, x, y) => {
      const cx =
        typeof x === 'number'
          ? Math.max(80, Math.min(width - 80, x))
          : width / 2;
      const cy = typeof y === 'number' ? y : height * 0.36;

      engineRef.current.popups.push({
        id: nextFxId(),
        text,
        subText,
        x: cx,
        y: cy,
        vy: -76,
        scale: 1.1,
        opacity: 1,
        age: 0,
        duration: 0.95,
        color,
      });
    },
    [width, height]
  );

  const celebrate = useCallback(
    (text = 'AWESOME!', subText = '+BONUS', color = COLORS.cyan, x, y) => {
      triggerShake(8, 6);
      triggerFlash(color);
      const cx = typeof x === 'number' ? x : width / 2;
      const cy = typeof y === 'number' ? y : height * 0.42;

      // Triple celebratory particle fountain with shockwaves
      spawnBurst(cx, cy, color, 36);
      spawnBurst(Math.max(40, cx - 60), cy - 25, COLORS.solarGold, 24);
      spawnBurst(Math.min(width - 40, cx + 60), cy - 25, COLORS.matrixMint, 24);
      spawnPopup(text, subText, color, cx, cy);
    },
    [triggerShake, triggerFlash, spawnBurst, spawnPopup, width, height]
  );

  useImperativeHandle(
    ref,
    () => ({
      shake: triggerShake,
      flash: triggerFlash,
      burst: spawnBurst,
      popup: spawnPopup,
      celebrate,
    }),
    [triggerShake, triggerFlash, spawnBurst, spawnPopup, celebrate]
  );

  useEffect(() => {
    let rafId = null;
    let lastTs = 0;

    const step = (ts) => {
      if (!lastTs) lastTs = ts;
      const dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;

      const eng = engineRef.current;
      let dirty = false;

      if (eng.particles.length > 0) {
        dirty = true;
        const nextP = [];
        for (let i = 0; i < eng.particles.length; i += 1) {
          const p = eng.particles[i];
          const op = p.opacity - p.decay * dt;
          if (op > 0.04) {
            nextP.push({
              ...p,
              x: p.x + p.vx * dt,
              y: p.y + p.vy * dt,
              vy: p.vy + 980 * dt,
              opacity: op,
            });
          }
        }
        eng.particles = nextP;
      }

      if (eng.rings.length > 0) {
        dirty = true;
        const nextR = [];
        for (let i = 0; i < eng.rings.length; i += 1) {
          const r = eng.rings[i];
          const op = r.opacity - dt * 2.2;
          if (op > 0.04) {
            nextR.push({
              ...r,
              radius: r.radius + 210 * dt,
              opacity: op,
            });
          }
        }
        eng.rings = nextR;
      }

      if (eng.popups.length > 0) {
        dirty = true;
        const nextPop = [];
        for (let i = 0; i < eng.popups.length; i += 1) {
          const pop = eng.popups[i];
          const age = pop.age + dt;
          if (age < pop.duration) {
            const prog = age / pop.duration;
            const pulse =
              prog < 0.22
                ? 1 + (prog / 0.22) * 0.28
                : 1.28 - ((prog - 0.22) / 0.78) * 0.22;
            nextPop.push({
              ...pop,
              age,
              y: pop.y + pop.vy * dt,
              opacity: prog > 0.55 ? 1 - (prog - 0.55) / 0.45 : 1,
              currentScale: pulse,
            });
          }
        }
        eng.popups = nextPop;
      }

      if (dirty) {
        setFxState({
          particles: [...eng.particles],
          rings: [...eng.rings],
          popups: [...eng.popups],
        });
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shakeX.value },
      { translateY: shakeY.value },
    ],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(240)}
      style={[localStyles.root, shakeStyle]}
    >
      {children}

      {/* Screen Flash Vignette */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: flashColor },
          flashStyle,
        ]}
      />

      {/* Expanding Shockwave Rings */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {fxState.rings.map((r) => (
          <View
            key={r.id}
            style={[
              localStyles.ring,
              {
                left: r.x - r.radius,
                top: r.y - r.radius,
                width: r.radius * 2,
                height: r.radius * 2,
                borderRadius: r.radius,
                borderColor: r.color,
                opacity: r.opacity,
              },
            ]}
          />
        ))}

        {/* Glowing Particle Sparks */}
        {fxState.particles.map((pt) => (
          <View
            key={pt.id}
            style={[
              localStyles.particle,
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

        {/* Floating Combo & Score Popups */}
        {fxState.popups.map((pop) => (
          <View
            key={pop.id}
            style={[
              localStyles.popupWrap,
              {
                left: pop.x - 130,
                top: pop.y,
                opacity: pop.opacity,
                transform: [{ scale: pop.currentScale || 1 }],
              },
            ]}
          >
            <Text
              style={[
                localStyles.popupMain,
                { color: pop.color, textShadowColor: pop.color },
              ]}
            >
              {pop.text}
            </Text>
            {Boolean(pop.subText) && (
              <Text style={localStyles.popupSub}>{pop.subText}</Text>
            )}
          </View>
        ))}
      </View>
    </Animated.View>
  );
});

const localStyles = StyleSheet.create({
  root: {
    flex: 1,
  },
  ring: {
    position: 'absolute',
    borderWidth: 2.5,
  },
  particle: {
    position: 'absolute',
  },
  popupWrap: {
    position: 'absolute',
    width: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupMain: {
    fontSize: 22,
    fontFamily: monoFont,
    fontWeight: '900',
    letterSpacing: 1.6,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  popupSub: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#FFFFFF',
    backgroundColor: 'rgba(4, 4, 14, 0.78)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
    overflow: 'hidden',
  },
});

// Global static fallback so JuiceEngine.celebrate(x, y) is always callable from any mini-game
JuiceEngine.celebrate = (x, y) => {
  try {
    triggerLightHaptic();
    playTapSound();
  } catch {}
};

export default JuiceEngine;
