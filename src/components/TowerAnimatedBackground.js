import React, { useState, useEffect, useRef, useCallback, Component } from 'react';
import { View, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Circle,
  Line,
  Ellipse,
  G,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  cancelAnimation,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

// Galaxy Starfield coordinates across deep cosmic space
const GALAXY_STARS = Array.from({ length: 54 }, (_, i) => ({
  id: `gstar_${i}`,
  x: ((i * 59 + 17) % 97) / 100,
  y: ((i * 83 + 29) % 95) / 100,
  size: 0.9 + (i % 4) * 0.55,
  color:
    i % 5 === 0
      ? '#FFFFFF'
      : i % 5 === 1
        ? '#00F5FF'
        : i % 5 === 2
          ? '#FF70A6'
          : i % 5 === 3
            ? '#FFD166'
            : '#90E0EF',
  opacity: 0.35 + (i % 6) * 0.11,
}));

// JWST / Hubble 4-point cross diffraction stars
const DIFFRACTION_STARS = [
  { cx: 0.18, cy: 0.12, r: 2.8, color: '#00F5FF', spikeLen: 14 },
  { cx: 0.82, cy: 0.22, r: 2.4, color: '#FFD166', spikeLen: 12 },
  { cx: 0.32, cy: 0.58, r: 3.0, color: '#FFFFFF', spikeLen: 16 },
  { cx: 0.88, cy: 0.74, r: 2.2, color: '#FF70A6', spikeLen: 11 },
  { cx: 0.12, cy: 0.86, r: 2.5, color: '#00F5D4', spikeLen: 13 },
];

const ASTEROID_PALETTES = [
  { color: '#00F5FF', glow: 'rgba(0, 245, 255, 0.9)' },
  { color: '#FFFFFF', glow: 'rgba(255, 255, 255, 0.95)' },
  { color: '#FFD166', glow: 'rgba(255, 209, 102, 0.85)' },
  { color: '#FF007F', glow: 'rgba(255, 0, 127, 0.85)' },
  { color: '#39FF14', glow: 'rgba(57, 255, 20, 0.85)' },
  { color: '#9D4EDD', glow: 'rgba(157, 78, 221, 0.85)' },
];

/**
 * Generate a random edge point on screen
 * Edges: 0 = TOP, 1 = RIGHT, 2 = BOTTOM, 3 = LEFT
 */
function getEdgePoint(edge, w, h, margin = 40) {
  switch (edge) {
    case 0: // TOP
      return { x: Math.random() * (w + 40) - 20, y: -margin };
    case 1: // RIGHT
      return { x: w + margin, y: Math.random() * (h + 40) - 20 };
    case 2: // BOTTOM
      return { x: Math.random() * (w + 40) - 20, y: h + margin };
    case 3: // LEFT
    default:
      return { x: -margin, y: Math.random() * (h + 40) - 20 };
  }
}

/**
 * Generate random projectile trajectory from one screen edge to another
 */
function getRandomTrajectory(w, h, depthLayer = 2) {
  const safeW = w > 50 ? w : 390;
  const safeH = h > 50 ? h : 844;

  const startEdge = Math.floor(Math.random() * 4);
  const otherEdges = [0, 1, 2, 3].filter((e) => e !== startEdge);
  const endEdge = otherEdges[Math.floor(Math.random() * otherEdges.length)];

  const start = getEdgePoint(startEdge, safeW, safeH, 50);
  const end = getEdgePoint(endEdge, safeW, safeH, 50);

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

  // Faster, dynamic asteroid speeds
  const speed =
    depthLayer === 1
      ? 80 + Math.random() * 40
      : depthLayer === 2
        ? 120 + Math.random() * 60
        : 180 + Math.random() * 90;

  const duration = Math.max(3500, Math.round((dist / speed) * 1000));

  return {
    startX: start.x,
    startY: start.y,
    endX: end.x,
    endY: end.y,
    angle,
    duration,
  };
}

/**
 * Sleek Asteroid Projectile Dot with Glowing Trail
 */
function AsteroidProjectile({
  width,
  height,
  depthLayer = 2,
  initialProgress = 0,
  initialDelay = 0,
  paletteIndex = 0,
}) {
  const dimRef = useRef({ width, height });
  dimRef.current = { width, height };

  const trajRef = useRef(getRandomTrajectory(width, height, depthLayer));
  const palette = ASTEROID_PALETTES[paletteIndex % ASTEROID_PALETTES.length];

  const startX = useSharedValue(trajRef.current.startX);
  const startY = useSharedValue(trajRef.current.startY);
  const endX = useSharedValue(trajRef.current.endX);
  const endY = useSharedValue(trajRef.current.endY);
  const rotAngle = useSharedValue(trajRef.current.angle);
  const progress = useSharedValue(initialProgress);

  const headSize = depthLayer === 1 ? 3 : depthLayer === 2 ? 4.5 : 6;
  const tailLength = depthLayer === 1 ? 16 : depthLayer === 2 ? 28 : 42;
  const baseOpacity = depthLayer === 1 ? 0.45 : depthLayer === 2 ? 0.75 : 0.95;

  const runNextLeg = useCallback(() => {
    const { width: curW, height: curH } = dimRef.current;
    const next = getRandomTrajectory(curW, curH, depthLayer);
    trajRef.current = next;

    startX.value = next.startX;
    startY.value = next.startY;
    endX.value = next.endX;
    endY.value = next.endY;
    rotAngle.value = next.angle;
    progress.value = 0;

    progress.value = withTiming(
      1,
      { duration: next.duration, easing: Easing.linear },
      (finished) => {
        if (finished) {
          runOnJS(runNextLeg)();
        }
      }
    );
  }, [depthLayer, endX, endY, progress, rotAngle, startX, startY]);

  useEffect(() => {
    let active = true;
    const initialTraj = trajRef.current;
    const remainingTime = Math.max(1000, initialTraj.duration * (1 - initialProgress));

    const timer = setTimeout(() => {
      if (!active) return;
      progress.value = withTiming(
        1,
        { duration: remainingTime, easing: Easing.linear },
        (finished) => {
          if (finished && active) {
            runOnJS(runNextLeg)();
          }
        }
      );
    }, initialDelay);

    return () => {
      active = false;
      clearTimeout(timer);
      cancelAnimation(progress);
    };
  }, [initialDelay, initialProgress, progress, runNextLeg]);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const p = progress.value;
    const curX = startX.value + (endX.value - startX.value) * p;
    const curY = startY.value + (endY.value - startY.value) * p;

    return {
      transform: [
        { translateX: curX },
        { translateY: curY },
        { rotate: `${rotAngle.value}deg` },
      ],
      opacity: baseOpacity,
    };
  });

  return (
    <Animated.View style={[styles.projectileWrapper, animatedStyle]} pointerEvents="none">
      {/* Trailing streak line behind projectile */}
      <View
        style={[
          styles.asteroidTail,
          {
            width: tailLength,
            backgroundColor: palette.color,
            shadowColor: palette.color,
          },
        ]}
      />
      {/* Asteroid Core Head Dot */}
      <View
        style={[
          styles.asteroidHead,
          {
            width: headSize,
            height: headSize,
            borderRadius: headSize / 2,
            backgroundColor: palette.color,
            shadowColor: palette.glow,
          },
        ]}
      />
    </Animated.View>
  );
}

// Error Boundary for bulletproof stability
class GalaxyErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {}

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

/**
 * TowerAnimatedBackground
 * Pure Cosmic Galaxy Environment with Streaming Asteroids / Projectiles
 * No cards, no text blocks, no buildings.
 */
export default function TowerAnimatedBackground() {
  const { width, height } = useWindowDimensions();

  // 14 simultaneous projectile asteroids flying across space
  const PROJECTILES_CONFIG = [
    { depth: 3, initProg: 0.12, delay: 0, pal: 0 },
    { depth: 2, initProg: 0.45, delay: 0, pal: 1 },
    { depth: 1, initProg: 0.78, delay: 0, pal: 2 },
    { depth: 3, initProg: 0.32, delay: 100, pal: 3 },
    { depth: 2, initProg: 0.65, delay: 0, pal: 4 },
    { depth: 1, initProg: 0.18, delay: 0, pal: 5 },
    { depth: 3, initProg: 0.88, delay: 0, pal: 0 },
    { depth: 2, initProg: 0.22, delay: 150, pal: 1 },
    { depth: 1, initProg: 0.54, delay: 0, pal: 2 },
    { depth: 2, initProg: 0.92, delay: 0, pal: 3 },
    { depth: 3, initProg: 0.05, delay: 250, pal: 4 },
    { depth: 2, initProg: 0.37, delay: 0, pal: 5 },
    { depth: 1, initProg: 0.71, delay: 0, pal: 0 },
    { depth: 3, initProg: 0.58, delay: 300, pal: 1 },
  ];

  return (
    <GalaxyErrorBoundary>
      <View style={styles.container} pointerEvents="none">
        {/* Deep Cosmic Space Base Gradient */}
        <LinearGradient
          colors={['#010008', '#050216', '#0C0528', '#140738', '#07021C']}
          locations={[0, 0.22, 0.55, 0.82, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Ambient Cosmic Nebula Dust Clouds */}
        <View
          style={[
            styles.nebulaOrb,
            {
              top: '12%',
              left: -50,
              width: 320,
              height: 320,
              borderRadius: 160,
              backgroundColor: 'rgba(128, 0, 255, 0.12)',
            },
          ]}
        />
        <View
          style={[
            styles.nebulaOrb,
            {
              bottom: '18%',
              right: -60,
              width: 360,
              height: 360,
              borderRadius: 180,
              backgroundColor: 'rgba(0, 245, 255, 0.10)',
            },
          ]}
        />
        <View
          style={[
            styles.nebulaOrb,
            {
              top: '42%',
              right: -30,
              width: 290,
              height: 290,
              borderRadius: 145,
              backgroundColor: 'rgba(255, 0, 128, 0.09)',
            },
          ]}
        />
        <View
          style={[
            styles.nebulaOrb,
            {
              bottom: '32%',
              left: -30,
              width: 240,
              height: 240,
              borderRadius: 120,
              backgroundColor: 'rgba(255, 209, 102, 0.07)',
            },
          ]}
        />

        {/* SVG Starfield, Celestial Rings & JWST Diffraction Stars */}
        <Svg width={width} height={height} style={StyleSheet.absoluteFillObject}>
          <Defs>
            <SvgLinearGradient id="galaxyRingGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#00F5FF" stopOpacity="0.22" />
              <Stop offset="50%" stopColor="#7928CA" stopOpacity="0.10" />
              <Stop offset="100%" stopColor="#FF007F" stopOpacity="0.22" />
            </SvgLinearGradient>
          </Defs>

          {/* Majestic Celestial Orbital Rings in Deep Space */}
          <G transform={`translate(${width * 0.5}, ${height * 0.38}) rotate(-22)`}>
            <Ellipse
              cx={0}
              cy={0}
              rx={width * 0.65}
              ry={height * 0.16}
              stroke="url(#galaxyRingGrad)"
              strokeWidth={1.5}
              fill="none"
              strokeDasharray="4 8"
              opacity={0.65}
            />
            <Ellipse
              cx={0}
              cy={0}
              rx={width * 0.85}
              ry={height * 0.22}
              stroke="url(#galaxyRingGrad)"
              strokeWidth={1}
              fill="none"
              strokeDasharray="6 12"
              opacity={0.4}
            />
          </G>

          {/* Deep Cosmic Starfield */}
          {GALAXY_STARS.map((star) => (
            <Circle
              key={star.id}
              cx={star.x * width}
              cy={star.y * height}
              r={star.size}
              fill={star.color}
              opacity={star.opacity}
            />
          ))}

          {/* JWST 4-Point Diffraction Cross Stars */}
          {DIFFRACTION_STARS.map((dStar, idx) => {
            const sx = dStar.cx * width;
            const sy = dStar.cy * height;
            return (
              <G key={`diff_${idx}`}>
                <Line
                  x1={sx - dStar.spikeLen}
                  y1={sy}
                  x2={sx + dStar.spikeLen}
                  y2={sy}
                  stroke={dStar.color}
                  strokeWidth={1.2}
                  opacity={0.8}
                />
                <Line
                  x1={sx}
                  y1={sy - dStar.spikeLen}
                  x2={sx}
                  y2={sy + dStar.spikeLen}
                  stroke={dStar.color}
                  strokeWidth={1.2}
                  opacity={0.8}
                />
                <Circle cx={sx} cy={sy} r={dStar.r} fill="#FFFFFF" opacity={0.95} />
              </G>
            );
          })}
        </Svg>

        {/* Dynamic Flying Asteroid Projectiles */}
        {PROJECTILES_CONFIG.map((cfg, i) => (
          <AsteroidProjectile
            key={`projectile_${i}`}
            width={width}
            height={height}
            depthLayer={cfg.depth}
            initialProgress={cfg.initProg}
            initialDelay={cfg.delay}
            paletteIndex={cfg.pal}
          />
        ))}
      </View>
    </GalaxyErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    elevation: 0,
    overflow: 'hidden',
  },
  nebulaOrb: {
    position: 'absolute',
    opacity: 0.75,
  },
  projectileWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    height: 12,
  },
  asteroidTail: {
    height: 1.5,
    borderRadius: 1,
    opacity: 0.7,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 6,
    shadowOpacity: 0.9,
    elevation: 2,
  },
  asteroidHead: {
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    shadowOpacity: 1,
    elevation: 4,
  },
});
