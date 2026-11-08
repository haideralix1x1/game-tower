import React, { useEffect, Component } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Circle,
  Line,
  Ellipse,
  G,
  Polygon,
  Rect,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  cancelAnimation,
  Easing,
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
 * Sleek Asteroid Projectile Dot with Glowing Trail
 */
function AsteroidProjectile({
  startX,
  startY,
  endX,
  endY,
  duration = 4500,
  delay = 0,
  depthLayer = 2,
  paletteIndex = 0,
}) {
  const palette = ASTEROID_PALETTES[paletteIndex % ASTEROID_PALETTES.length];
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration, easing: Easing.linear }),
        -1,
        false
      )
    );
    return () => {
      cancelAnimation(progress);
    };
  }, [delay, duration, progress]);

  const dx = endX - startX;
  const dy = endY - startY;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

  const headSize = depthLayer === 1 ? 3 : depthLayer === 2 ? 4.5 : 6;
  const tailLength = depthLayer === 1 ? 18 : depthLayer === 2 ? 30 : 44;
  const baseOpacity = depthLayer === 1 ? 0.45 : depthLayer === 2 ? 0.75 : 0.95;

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const curX = startX + dx * progress.value;
    const curY = startY + dy * progress.value;
    return {
      transform: [
        { translateX: curX },
        { translateY: curY },
        { rotate: `${angle}deg` },
      ],
      opacity: baseOpacity,
    };
  });

  return (
    <Animated.View style={[styles.projectileWrapper, animatedStyle]} pointerEvents="none">
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

/**
 * Visible Futuristic Cruising Space Ships (Starfighter, Shuttle, Frigate)
 * Cruising across the cosmic background behind the tower
 */
function BackgroundSpaceShip({
  startYRatio = 0.22,
  dir = 1,
  speed = 32,
  scale = 1.0,
  shipType = 0,
  delay = 0,
}) {
  const { width, height } = useWindowDimensions();
  const safeW = width > 50 ? width : 390;
  const safeH = height > 50 ? height : 844;

  const totalDist = safeW + 200;
  const duration = Math.round((totalDist / speed) * 1000);

  const startX = dir === 1 ? -100 : safeW + 100;
  const endX = dir === 1 ? safeW + 100 : -100;
  const y = safeH * startYRatio;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration, easing: Easing.linear }),
        -1,
        false
      )
    );
    return () => {
      cancelAnimation(progress);
    };
  }, [delay, duration, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const curX = startX + (endX - startX) * progress.value;
    return {
      transform: [
        { translateX: curX },
        { translateY: y },
        { scaleX: dir },
        { scale },
      ],
    };
  });

  return (
    <Animated.View style={[styles.shipContainer, animatedStyle]} pointerEvents="none">
      <Svg width={60} height={30} viewBox="0 0 60 30">
        <Defs>
          <SvgLinearGradient id={`shipGrad_${shipType}_${Math.round(startYRatio * 100)}`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#00F5FF" stopOpacity="0.95" />
            <Stop offset="50%" stopColor="#7928CA" stopOpacity="0.85" />
            <Stop offset="100%" stopColor="#FF007F" stopOpacity="0.95" />
          </SvgLinearGradient>
          <SvgLinearGradient id={`thrusterGrad_${shipType}_${Math.round(startYRatio * 100)}`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#FF9E00" stopOpacity="0.0" />
            <Stop offset="50%" stopColor="#FF0055" stopOpacity="0.75" />
            <Stop offset="100%" stopColor="#FFE600" stopOpacity="1.0" />
          </SvgLinearGradient>
        </Defs>

        {/* Dynamic Glowing Thruster Exhaust */}
        <Polygon points="0,15 16,10 16,20" fill={`url(#thrusterGrad_${shipType}_${Math.round(startYRatio * 100)})`} />
        <Line x1="-16" y1="15" x2="8" y2="15" stroke="#00F5FF" strokeWidth="2" opacity={0.7} />

        {shipType === 0 ? (
          // Sleek Warp Starfighter
          <G>
            <Polygon
              points="14,15 24,5 54,15 24,25"
              fill={`url(#shipGrad_${shipType}_${Math.round(startYRatio * 100)})`}
              stroke="#FFFFFF"
              strokeWidth={1.5}
            />
            <Polygon points="28,15 35,9 49,15 35,21" fill="#0C1328" />
            <Circle cx="40" cy="15" r="3" fill="#00F5FF" />
            <Circle cx="22" cy="6" r="2" fill="#FFE600" />
            <Circle cx="22" cy="24" r="2" fill="#FFE600" />
          </G>
        ) : shipType === 1 ? (
          // Heavy Orbital Interceptor
          <G>
            <Polygon
              points="16,15 28,3 46,11 56,15 46,19 28,27"
              fill="#0E1736"
              stroke="#00F5FF"
              strokeWidth={1.6}
            />
            <Polygon points="24,15 34,8 50,15 34,22" fill="#FF007F" opacity={0.9} />
            <Circle cx="38" cy="15" r="3.2" fill="#FFE600" />
            <Line x1="18" y1="7" x2="34" y2="7" stroke="#00F5FF" strokeWidth="1.8" />
            <Line x1="18" y1="23" x2="34" y2="23" stroke="#00F5FF" strokeWidth="1.8" />
          </G>
        ) : (
          // High-Tech Cyber Shuttle
          <G>
            <Rect x="16" y="9" width="32" height="12" rx="4" fill="#170A34" stroke="#FF70A6" strokeWidth={1.6} />
            <Polygon points="48,10 57,15 48,20" fill="#00F5D4" />
            <Circle cx="26" cy="15" r="2.4" fill="#00F5FF" />
            <Circle cx="35" cy="15" r="2.4" fill="#FFE600" />
            <Circle cx="44" cy="15" r="2.4" fill="#00F5FF" />
            <Polygon points="20,4 32,9 20,9" fill="#7928CA" />
            <Polygon points="20,21 32,21 20,26" fill="#7928CA" />
          </G>
        )}
      </Svg>
    </Animated.View>
  );
}

/**
 * Fallen Stars (Shooting Stars / Meteor Streaks)
 * Blazing luminous diagonal trails across deep space
 */
function FallingStar({
  delay = 0,
  interval = 4000,
  startXRatio = 0.7,
  startYRatio = 0.1,
  travelDist = 320,
  color = '#00F5FF',
}) {
  const { width, height } = useWindowDimensions();
  const safeW = width > 50 ? width : 390;
  const safeH = height > 50 ? height : 844;

  const startX = safeW * startXRatio;
  const startY = safeH * startYRatio;

  const streakLength = 75;
  const angleRad = (40 * Math.PI) / 180;
  const dx = -travelDist * Math.cos(angleRad);
  const dy = travelDist * Math.sin(angleRad);

  const duration = 1100;
  const totalPeriod = duration + interval;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: totalPeriod, easing: Easing.linear }),
        -1,
        false
      )
    );
    return () => {
      cancelAnimation(progress);
    };
  }, [delay, progress, totalPeriod]);

  const activeFrac = duration / totalPeriod;

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const p = progress.value;
    if (p > activeFrac) {
      return {
        opacity: 0,
        transform: [{ translateX: -999 }, { translateY: -999 }],
      };
    }
    const normP = p / activeFrac;
    const curX = startX + dx * normP;
    const curY = startY + dy * normP;
    const op = normP < 0.15 ? normP / 0.15 : (1 - normP) * 0.95;

    return {
      transform: [
        { translateX: curX },
        { translateY: curY },
        { rotate: '140deg' },
      ],
      opacity: op,
    };
  });

  return (
    <Animated.View style={[styles.fallingStarWrapper, animatedStyle]} pointerEvents="none">
      <Svg width={streakLength + 12} height={14} viewBox={`0 0 ${streakLength + 12} 14`}>
        <Defs>
          <SvgLinearGradient id={`fsGrad_${delay}_${Math.round(startXRatio * 100)}`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor={color} stopOpacity="0" />
            <Stop offset="65%" stopColor={color} stopOpacity="0.8" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="1" />
          </SvgLinearGradient>
        </Defs>
        <Line
          x1={0}
          y1={7}
          x2={streakLength}
          y2={7}
          stroke={`url(#fsGrad_${delay}_${Math.round(startXRatio * 100)})`}
          strokeWidth={2.4}
          strokeLinecap="round"
        />
        <Circle cx={streakLength + 3} cy={7} r={3.2} fill="#FFFFFF" />
        <Circle cx={streakLength + 3} cy={7} r={5} fill={color} opacity={0.5} />
      </Svg>
    </Animated.View>
  );
}

// Error boundary to protect the menu background
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
      return <View style={[styles.container, { backgroundColor: '#02010A' }]} />;
    }
    return this.props.children;
  }
}

/**
 * TowerAnimatedBackground
 * Premium Cyberpunk Galaxy Atmosphere with Cruising Spaceships,
 * Fallen Stars, and Cosmic Asteroids.
 */
export default function TowerAnimatedBackground() {
  const { width, height } = useWindowDimensions();
  const safeW = width > 50 ? width : 390;
  const safeH = height > 50 ? height : 844;

  const projectiles = [
    { startX: -30, startY: safeH * 0.2, endX: safeW + 30, endY: safeH * 0.45, duration: 4200, delay: 0, depth: 1, pal: 5 },
    { startX: safeW + 30, startY: safeH * 0.15, endX: -30, endY: safeH * 0.65, duration: 3800, delay: 800, depth: 3, pal: 0 },
    { startX: safeW * 0.1, startY: -30, endX: safeW * 0.85, endY: safeH + 30, duration: 4800, delay: 1500, depth: 2, pal: 1 },
    { startX: safeW + 30, startY: safeH * 0.75, endX: -30, endY: safeH * 0.25, duration: 4400, delay: 600, depth: 1, pal: 2 },
    { startX: -30, startY: safeH * 0.8, endX: safeW + 30, endY: safeH * 0.5, duration: 4000, delay: 2000, depth: 2, pal: 3 },
    { startX: safeW * 0.9, startY: -30, endX: safeW * 0.2, endY: safeH + 30, duration: 3600, delay: 1200, depth: 3, pal: 4 },
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

        {/* Visible Background Space Ships Cruising Through Deep Space */}
        <BackgroundSpaceShip startYRatio={0.16} dir={1} speed={36} scale={1.05} shipType={0} delay={0} />
        <BackgroundSpaceShip startYRatio={0.34} dir={-1} speed={28} scale={0.95} shipType={1} delay={1800} />
        <BackgroundSpaceShip startYRatio={0.64} dir={1} speed={32} scale={1.1} shipType={2} delay={3600} />
        <BackgroundSpaceShip startYRatio={0.82} dir={-1} speed={38} scale={1.0} shipType={0} delay={2400} />

        {/* Fallen Stars (Shooting Stars) Streaking Across the Sky */}
        <FallingStar delay={200} interval={3800} startXRatio={0.7} startYRatio={0.08} color="#00F5FF" />
        <FallingStar delay={1400} interval={4400} startXRatio={0.4} startYRatio={0.18} color="#FFE600" />
        <FallingStar delay={2600} interval={3900} startXRatio={0.85} startYRatio={0.28} color="#FF007F" />
        <FallingStar delay={3600} interval={4200} startXRatio={0.55} startYRatio={0.4} color="#00F5D4" />
        <FallingStar delay={4600} interval={4800} startXRatio={0.9} startYRatio={0.52} color="#FFFFFF" />

        {/* Dynamic Flying Asteroid Projectiles */}
        {projectiles.map((p, i) => (
          <AsteroidProjectile
            key={`proj_${i}`}
            startX={p.startX}
            startY={p.startY}
            endX={p.endX}
            endY={p.endY}
            duration={p.duration}
            delay={p.delay}
            depthLayer={p.depth}
            paletteIndex={p.pal}
          />
        ))}
      </View>
    </GalaxyErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  nebulaOrb: {
    position: 'absolute',
    filter: 'blur(45px)',
  },
  shipContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  fallingStarWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  projectileWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  asteroidTail: {
    height: 1.8,
    opacity: 0.8,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
  },
  asteroidHead: {
    marginLeft: -1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
});
