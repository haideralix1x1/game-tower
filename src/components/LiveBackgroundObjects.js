import React, { useEffect, Component } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { COLORS } from '../../styles';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

// Robust hex to rgba converter to prevent Android Color.parseColor crashes on 8-digit hex
const hexToRgba = (hex, alpha = 1) => {
  if (!hex || typeof hex !== 'string') return `rgba(0, 245, 255, ${alpha})`;
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (clean.length === 6) {
    const num = parseInt(clean, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
};

// Error Boundary to ensure animated background never brings down the menu
class LiveBackgroundErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    // Gracefully handle any worklet or animation error without crashing the app
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

// Single High-Velocity Laser Bullet with Motion Streak Tail
function LiveBullet({
  startX,
  startY,
  endX,
  endY,
  color = COLORS.cyan,
  length = 36,
  thickness = 3.5,
  duration = 1400,
  delay = 0,
}) {
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
  // Calculate flight angle in degrees (0 deg is pointing straight UP)
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const p = progress.value;
    const curX = startX + dx * p;
    const curY = startY + dy * p;

    // Smooth entry and exit fading
    let opacity = 0;
    if (p < 0.08) {
      opacity = p / 0.08;
    } else if (p > 0.88) {
      opacity = Math.max(0, (1 - p) / 0.12);
    } else {
      opacity = 1;
    }

    return {
      transform: [
        { translateX: curX },
        { translateY: curY },
        { rotate: `${angleDeg}deg` },
      ],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.bulletContainer,
        { width: thickness, height: length },
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      {/* Laser Tracer Trail (fades from tail to glowing head) */}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0)', color, '#FFFFFF']}
        locations={[0, 0.68, 1]}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0 }}
        style={[
          styles.bulletStreak,
          {
            width: thickness,
            height: length,
            borderRadius: thickness / 2,
          },
        ]}
      />

      {/* Plasma Bullet Core Head */}
      <View
        style={[
          styles.bulletHead,
          {
            top: -thickness * 0.6,
            left: -thickness * 0.6,
            width: thickness * 2.2,
            height: thickness * 2.2,
            borderRadius: thickness * 1.1,
            backgroundColor: '#FFFFFF',
            shadowColor: color,
          },
        ]}
      />

      {/* Radiant Glow Halo */}
      <View
        style={[
          styles.bulletHalo,
          {
            top: -thickness * 1.2,
            left: -thickness * 1.2,
            width: thickness * 3.4,
            height: thickness * 3.4,
            borderRadius: thickness * 1.7,
            backgroundColor: color,
          },
        ]}
      />
    </Animated.View>
  );
}

// Floating Arcade Score & XP Point Badge with Ping-Pong Sway
function LiveScorePoint({
  startX,
  startY,
  text,
  color = COLORS.cyan,
  travelDistance = 360,
  swayAmplitude = 18,
  duration = 4800,
  delay = 0,
}) {
  const progress = useSharedValue(0);
  const sway = useSharedValue(-swayAmplitude);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration, easing: Easing.linear }),
        -1,
        false
      )
    );
    sway.value = withDelay(
      delay,
      withRepeat(
        withTiming(swayAmplitude, {
          duration: duration * 0.5,
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        true
      )
    );
    return () => {
      cancelAnimation(progress);
      cancelAnimation(sway);
    };
  }, [delay, duration, progress, sway, swayAmplitude]);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const p = progress.value;
    const curY = startY - p * travelDistance;
    const curX = startX + sway.value;

    let opacity = 0;
    if (p < 0.12) {
      opacity = p / 0.12;
    } else if (p > 0.78) {
      opacity = Math.max(0, (1 - p) / 0.22);
    } else {
      opacity = 0.95;
    }

    const scale = 0.88 + (p < 0.45 ? p * 0.35 : (1 - p) * 0.35);

    return {
      transform: [
        { translateX: curX },
        { translateY: curY },
        { scale },
      ],
      opacity,
    };
  });

  const borderColor = hexToRgba(color, 0.65);

  return (
    <Animated.View
      style={[styles.scorePointWrapper, animatedStyle]}
      pointerEvents="none"
    >
      <View
        style={[
          styles.scorePointPill,
          {
            borderColor,
            backgroundColor: 'rgba(8, 7, 24, 0.82)',
            shadowColor: color,
          },
        ]}
      >
        <View style={[styles.scorePointDot, { backgroundColor: color }]} />
        <Text style={[styles.scorePointText, { color }]}>{text}</Text>
      </View>
    </Animated.View>
  );
}

// Quantum Particle / Cyber Dust Point
function LiveQuantumPoint({
  x,
  startY,
  travelDistance = 380,
  size = 3,
  color = COLORS.cyan,
  duration = 5200,
  delay = 0,
  driftX = 14,
}) {
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
    const p = progress.value;
    const curY = startY - p * travelDistance;
    const curX = x + Math.sin(p * Math.PI * 2) * driftX;

    let opacity = 0;
    if (p < 0.18) {
      opacity = (p / 0.18) * 0.85;
    } else if (p > 0.82) {
      opacity = Math.max(0, ((1 - p) / 0.18) * 0.85);
    } else {
      opacity = 0.85;
    }

    return {
      transform: [{ translateX: curX }, { translateY: curY }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.quantumDot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          shadowColor: color,
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    />
  );
}

// Pulsing Antenna Spire Beacon with expanding radar echo ring
function LiveBeaconPulse({
  x,
  y,
  color = '#FF0055',
  delay = 0,
  size = 5,
}) {
  const scale = useSharedValue(0.6);
  const ringOpacity = useSharedValue(0.9);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withTiming(3.4, { duration: 2000, easing: Easing.out(Easing.cubic) }),
        -1,
        false
      )
    );
    ringOpacity.value = withDelay(
      delay,
      withRepeat(
        withTiming(0, { duration: 2000, easing: Easing.out(Easing.quad) }),
        -1,
        false
      )
    );
    return () => {
      cancelAnimation(scale);
      cancelAnimation(ringOpacity);
    };
  }, [delay, scale, ringOpacity]);

  const ringStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: scale.value }],
      opacity: ringOpacity.value,
    };
  });

  return (
    <View style={[styles.beaconContainer, { left: x, top: y }]} pointerEvents="none">
      <View
        style={[
          styles.beaconCore,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            shadowColor: color,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.beaconRing,
          {
            width: size * 2.4,
            height: size * 2.4,
            borderRadius: size * 1.2,
            borderColor: color,
          },
          ringStyle,
        ]}
      />
    </View>
  );
}

// 3D Grid Highway Velocity Pulse Packet
function LiveGridEnergyPacket({
  startRatio,
  endRatio,
  horizonY,
  height,
  width,
  color = COLORS.cyan,
  duration = 2200,
  delay = 0,
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration, easing: Easing.in(Easing.quad) }),
        -1,
        false
      )
    );
    return () => {
      cancelAnimation(progress);
    };
  }, [delay, duration, progress]);

  const startX = width * 0.5;
  const endX = width * endRatio;
  const deltaX = endX - startX;
  const deltaY = height - horizonY;

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const p = progress.value;
    const curX = startX + deltaX * p;
    const curY = horizonY + deltaY * p;

    const scale = 0.5 + p * 1.8;
    const opacity = p < 0.1 ? p / 0.1 : p > 0.9 ? (1 - p) / 0.1 : 0.85;

    return {
      transform: [
        { translateX: curX },
        { translateY: curY },
        { scale },
      ],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.gridPacket,
        {
          backgroundColor: color,
          shadowColor: color,
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    />
  );
}

// Sweeping Spotlight Laser Beam with Smooth Ping-Pong
function LiveSearchlightBeam({
  originX,
  originY,
  beamWidth = 85,
  beamHeight = 560,
  minAngle = -12,
  maxAngle = 8,
  duration = 5800,
  color = COLORS.cyan,
  delay = 0,
}) {
  const angle = useSharedValue(minAngle);

  useEffect(() => {
    angle.value = withDelay(
      delay,
      withRepeat(
        withTiming(maxAngle, {
          duration,
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        true
      )
    );
    return () => {
      cancelAnimation(angle);
    };
  }, [angle, delay, duration, maxAngle]);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { translateX: originX },
        { translateY: originY },
        { rotate: `${angle.value}deg` },
        { translateY: -beamHeight },
        { translateX: -beamWidth / 2 },
      ],
    };
  });

  const colorTransparent = 'rgba(255, 255, 255, 0)';
  const colorMid = hexToRgba(color, 0.08);
  const colorCore = hexToRgba(color, 0.28);

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          width: beamWidth,
          height: beamHeight,
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={[colorTransparent, colorMid, colorCore]}
        locations={[0, 0.45, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
    </Animated.View>
  );
}

// Radiant Pulsing Synthwave Sun Corona with Smooth Ping-Pong
function LiveSunPulse({
  centerX,
  centerY,
  radius,
}) {
  const scale = useSharedValue(0.98);
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.08, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    opacity.value = withRepeat(
      withTiming(0.65, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, [scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const haloSize = radius * 2.3;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: centerX - haloSize / 2,
          top: centerY - haloSize / 2,
          width: haloSize,
          height: haloSize,
          borderRadius: haloSize / 2,
          backgroundColor: 'rgba(255, 0, 127, 0.16)',
          shadowColor: '#FF007F',
          shadowRadius: 28,
          shadowOpacity: 0.85,
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    />
  );
}

function LiveBackgroundContent({
  width,
  height,
  horizonY = height * 0.72,
}) {
  if (!width || !height) return null;

  const sunRadius = Math.min(width * 0.26, 105);
  const sunCenterX = width * 0.5;
  const sunCenterY = horizonY - 45;

  const bullets = [
    {
      id: 'v_bullet_1',
      startX: width * 0.16,
      startY: horizonY,
      endX: width * 0.16,
      endY: -40,
      color: COLORS.cyan,
      length: 34,
      thickness: 3.5,
      duration: 1300,
      delay: 0,
    },
    {
      id: 'v_bullet_2',
      startX: width * 0.38,
      startY: horizonY + 25,
      endX: width * 0.36,
      endY: -40,
      color: COLORS.magenta,
      length: 42,
      thickness: 4.0,
      duration: 1650,
      delay: 600,
    },
    {
      id: 'v_bullet_3',
      startX: width * 0.62,
      startY: horizonY,
      endX: width * 0.64,
      endY: -40,
      color: '#00FF88',
      length: 28,
      thickness: 3.0,
      duration: 1200,
      delay: 1100,
    },
    {
      id: 'v_bullet_4',
      startX: width * 0.82,
      startY: horizonY + 15,
      endX: width * 0.80,
      endY: -40,
      color: COLORS.solarGold,
      length: 38,
      thickness: 3.5,
      duration: 1500,
      delay: 350,
    },
    {
      id: 'v_bullet_5',
      startX: width * 0.50,
      startY: horizonY + 30,
      endX: width * 0.52,
      endY: -40,
      color: COLORS.purple,
      length: 32,
      thickness: 3.2,
      duration: 1400,
      delay: 850,
    },
    {
      id: 'd_bullet_1',
      startX: -40,
      startY: horizonY - 140,
      endX: width + 40,
      endY: height * 0.08,
      color: COLORS.cyan,
      length: 50,
      thickness: 4.0,
      duration: 1750,
      delay: 450,
    },
    {
      id: 'd_bullet_2',
      startX: width + 40,
      startY: horizonY - 100,
      endX: -40,
      endY: height * 0.12,
      color: COLORS.laserPink,
      length: 44,
      thickness: 3.5,
      duration: 1900,
      delay: 1300,
    },
    {
      id: 'd_bullet_3',
      startX: -30,
      startY: height * 0.28,
      endX: width + 30,
      endY: height * 0.04,
      color: COLORS.solarGold,
      length: 52,
      thickness: 4.2,
      duration: 1550,
      delay: 900,
    },
    {
      id: 'd_bullet_4',
      startX: width * 0.35,
      startY: horizonY + 40,
      endX: width * 0.95,
      endY: -20,
      color: '#00F5D4',
      length: 36,
      thickness: 3.2,
      duration: 1450,
      delay: 1600,
    },
    {
      id: 'h_bullet_1',
      startX: -50,
      startY: horizonY - 22,
      endX: width + 50,
      endY: horizonY - 22,
      color: COLORS.cyan,
      length: 48,
      thickness: 3.5,
      duration: 1300,
      delay: 750,
    },
    {
      id: 'h_bullet_2',
      startX: width + 50,
      startY: horizonY - 8,
      endX: -50,
      endY: horizonY - 8,
      color: '#FF0055',
      length: 44,
      thickness: 3.2,
      duration: 1400,
      delay: 1700,
    },
  ];

  const scorePoints = [
    {
      id: 'pt_1',
      text: '+500 PTS',
      color: COLORS.cyan,
      startX: width * 0.20,
      startY: horizonY + 30,
      travelDistance: height * 0.52,
      duration: 4700,
      delay: 0,
      swayAmplitude: 16,
    },
    {
      id: 'pt_2',
      text: '★ 1,000',
      color: COLORS.solarGold,
      startX: width * 0.70,
      startY: horizonY + 20,
      travelDistance: height * 0.56,
      duration: 5200,
      delay: 1100,
      swayAmplitude: -20,
    },
    {
      id: 'pt_3',
      text: 'XP +250',
      color: '#00FF88',
      startX: width * 0.44,
      startY: horizonY + 45,
      travelDistance: height * 0.50,
      duration: 4500,
      delay: 2300,
      swayAmplitude: 14,
    },
    {
      id: 'pt_4',
      text: '+100 PTS',
      color: COLORS.magenta,
      startX: width * 0.84,
      startY: horizonY + 25,
      travelDistance: height * 0.54,
      duration: 5000,
      delay: 600,
      swayAmplitude: -16,
    },
    {
      id: 'pt_5',
      text: '2X COMBO',
      color: '#C77DFF',
      startX: width * 0.10,
      startY: horizonY + 15,
      travelDistance: height * 0.48,
      duration: 4900,
      delay: 3200,
      swayAmplitude: 18,
    },
    {
      id: 'pt_6',
      text: '+2,500',
      color: '#00F5D4',
      startX: width * 0.58,
      startY: horizonY + 40,
      travelDistance: height * 0.58,
      duration: 5400,
      delay: 1700,
      swayAmplitude: -15,
    },
  ];

  const quantumPoints = [
    { id: 'qp_1', x: width * 0.12, startY: horizonY + 20, color: COLORS.cyan, size: 2.8, duration: 4900, delay: 200, driftX: 12 },
    { id: 'qp_2', x: width * 0.26, startY: horizonY + 35, color: COLORS.magenta, size: 3.5, duration: 5400, delay: 900, driftX: -15 },
    { id: 'qp_3', x: width * 0.35, startY: horizonY + 15, color: COLORS.solarGold, size: 2.5, duration: 4600, delay: 1500, driftX: 10 },
    { id: 'qp_4', x: width * 0.48, startY: horizonY + 40, color: '#00FF88', size: 3.2, duration: 5100, delay: 400, driftX: -14 },
    { id: 'qp_5', x: width * 0.60, startY: horizonY + 25, color: COLORS.cyan, size: 3.8, duration: 5600, delay: 1200, driftX: 16 },
    { id: 'qp_6', x: width * 0.72, startY: horizonY + 45, color: COLORS.purple, size: 2.6, duration: 4800, delay: 2100, driftX: -11 },
    { id: 'qp_7', x: width * 0.82, startY: horizonY + 20, color: COLORS.solarGold, size: 3.4, duration: 5300, delay: 800, driftX: 13 },
    { id: 'qp_8', x: width * 0.92, startY: horizonY + 30, color: COLORS.laserPink, size: 2.9, duration: 5000, delay: 1800, driftX: -12 },
  ];

  const beaconPoints = [
    { id: 'bc_1', x: width * 0.12, y: horizonY - 145, color: '#FF0055', delay: 0 },
    { id: 'bc_2', x: width * 0.295, y: horizonY - 175, color: '#00F5FF', delay: 600 },
    { id: 'bc_3', x: width * 0.625, y: horizonY - 185, color: '#FF0055', delay: 1200 },
    { id: 'bc_4', x: width * 0.79, y: horizonY - 150, color: '#FFD166', delay: 1800 },
  ];

  const gridPackets = [
    { id: 'gp_1', startRatio: 0.5, endRatio: 0.15, duration: 2100, delay: 0, color: COLORS.cyan },
    { id: 'gp_2', startRatio: 0.5, endRatio: 0.85, duration: 2300, delay: 700, color: COLORS.magenta },
    { id: 'gp_3', startRatio: 0.5, endRatio: 0.35, duration: 2000, delay: 1400, color: '#00FF88' },
    { id: 'gp_4', startRatio: 0.5, endRatio: 0.6, duration: 2200, delay: 900, color: COLORS.solarGold },
  ];

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {/* 0. Dynamic Sweeping Searchlights (Deep Atmosphere) */}
      <LiveSearchlightBeam
        originX={width * 0.22}
        originY={horizonY + 30}
        beamWidth={Math.min(100, width * 0.26)}
        beamHeight={Math.max(520, height * 0.76)}
        minAngle={-14}
        maxAngle={8}
        duration={5800}
        color={COLORS.cyan}
        delay={0}
      />
      <LiveSearchlightBeam
        originX={width * 0.78}
        originY={horizonY + 30}
        beamWidth={Math.min(100, width * 0.26)}
        beamHeight={Math.max(520, height * 0.76)}
        minAngle={-8}
        maxAngle={14}
        duration={5200}
        color={COLORS.magenta}
        delay={800}
      />

      {/* 1. Radiant Breathing Sun Corona */}
      <LiveSunPulse
        centerX={sunCenterX}
        centerY={sunCenterY}
        radius={sunRadius}
      />

      {/* 2. Grid Velocity Packets (Perspective Floor) */}
      {gridPackets.map((gp) => (
        <LiveGridEnergyPacket
          key={gp.id}
          startRatio={gp.startRatio}
          endRatio={gp.endRatio}
          horizonY={horizonY}
          height={height}
          width={width}
          color={gp.color}
          duration={gp.duration}
          delay={gp.delay}
        />
      ))}

      {/* 3. Antenna Spire Beacon Radar Pulses */}
      {beaconPoints.map((bc) => (
        <LiveBeaconPulse
          key={bc.id}
          x={bc.x}
          y={bc.y}
          color={bc.color}
          delay={bc.delay}
        />
      ))}

      {/* 4. High-Velocity Laser Bullets & Tracers */}
      {bullets.map((b) => (
        <LiveBullet
          key={b.id}
          startX={b.startX}
          startY={b.startY}
          endX={b.endX}
          endY={b.endY}
          color={b.color}
          length={b.length}
          thickness={b.thickness}
          duration={b.duration}
          delay={b.delay}
        />
      ))}

      {/* 5. Quantum Embers & Floating Cyber Sparks */}
      {quantumPoints.map((qp) => (
        <LiveQuantumPoint
          key={qp.id}
          x={qp.x}
          startY={qp.startY}
          color={qp.color}
          size={qp.size}
          duration={qp.duration}
          delay={qp.delay}
          driftX={qp.driftX}
        />
      ))}

      {/* 6. Floating Arcade Score & XP Points */}
      {scorePoints.map((pt) => (
        <LiveScorePoint
          key={pt.id}
          startX={pt.startX}
          startY={pt.startY}
          text={pt.text}
          color={pt.color}
          travelDistance={pt.travelDistance}
          duration={pt.duration}
          delay={pt.delay}
          swayAmplitude={pt.swayAmplitude}
        />
      ))}
    </View>
  );
}

/**
 * LiveBackgroundObjects
 * Wrapped in an ErrorBoundary to ensure rock-solid resilience.
 */
export default function LiveBackgroundObjects(props) {
  return (
    <LiveBackgroundErrorBoundary>
      <LiveBackgroundContent {...props} />
    </LiveBackgroundErrorBoundary>
  );
}

const styles = StyleSheet.create({
  bulletContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  bulletStreak: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  bulletHead: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  bulletHalo: {
    position: 'absolute',
    opacity: 0.35,
  },
  scorePointWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  scorePointPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 3,
  },
  scorePointDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 5,
  },
  scorePointText: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  quantumDot: {
    position: 'absolute',
    top: 0,
    left: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 5,
    elevation: 2,
  },
  beaconContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    height: 20,
    marginLeft: -10,
    marginTop: -10,
  },
  beaconCore: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  beaconRing: {
    position: 'absolute',
    borderWidth: 1.2,
  },
  gridPacket: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: -3,
    marginTop: -3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 3,
  },
});
