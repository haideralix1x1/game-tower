import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  useWindowDimensions,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Line, Defs, RadialGradient, Stop } from 'react-native-svg';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const companyLogoAsset = require('../../assets/Company-dark.png');

// Background ambient floating cyber particles
const NUM_PARTICLES = 18;
const createParticles = (w, h) => {
  const pts = [];
  for (let i = 0; i < NUM_PARTICLES; i++) {
    pts.push({
      id: `part_${i}`,
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() > 0.6 ? 2.0 : 1.2,
      color: i % 3 === 0 ? '#00F5FF' : i % 3 === 1 ? '#FF007F' : '#FFE600',
      opacity: 0.25 + Math.random() * 0.5,
    });
  }
  return pts;
};

/**
 * Animated Fast-Boot Full-Screen Company Splash Screen for Nameless Forge (~0.75s Duration or Instant Tap-To-Skip)
 * @param {{ onFinish: () => void }} props
 */
export default function CompanySplashScreen({ onFinish }) {
  const { width, height } = useWindowDimensions();
  const [progressPct, setProgressPct] = useState(0);
  const [statusText, setStatusText] = useState('INITIALIZING QUANTUM CORE...');

  // Lazy Animated Values without ref reads in render
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [logoScale] = useState(() => new Animated.Value(0.85));
  const [logoPulse] = useState(() => new Animated.Value(1));
  const [glowOpacity] = useState(() => new Animated.Value(0.3));
  const [barAnim] = useState(() => new Animated.Value(0));

  const particles = useMemo(() => createParticles(width, height), [width, height]);
  const isFinishedRef = useRef(false);

  const finishEarly = useCallback(() => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 140,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      onFinish?.();
    });
  }, [fadeAnim, onFinish]);

  useEffect(() => {
    // 1. Snappy fade-in and scale-in of the logo
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // 2. Start continuous subtle breathing/pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(logoPulse, {
              toValue: 1.03,
              duration: 450,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(glowOpacity, {
              toValue: 0.85,
              duration: 450,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(logoPulse, {
              toValue: 0.98,
              duration: 450,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(glowOpacity, {
              toValue: 0.35,
              duration: 450,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    });

    // 3. Fast progressive boot sequence (750ms total)
    const startTime = Date.now();
    const duration = 750;

    const interval = setInterval(() => {
      if (isFinishedRef.current) {
        clearInterval(interval);
        return;
      }

      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Non-linear smooth easing for realistic cyber telemetry
      const eased = Math.min(100, Math.floor(Math.pow(progress, 0.85) * 100));

      setProgressPct(eased);
      barAnim.setValue(eased / 100);

      if (eased < 25) {
        setStatusText('INITIALIZING QUANTUM CORE...');
      } else if (eased < 55) {
        setStatusText('CALIBRATING 34 GAME TOWERS...');
      } else if (eased < 85) {
        setStatusText('SYNCHRONIZING AUDIO CHANNELS...');
      } else {
        setStatusText('SYSTEM ONLINE // LAUNCHING');
      }

      if (elapsed >= duration) {
        clearInterval(interval);
        setProgressPct(100);

        // Smooth cinematic fast fade-out transition
        setTimeout(() => {
          finishEarly();
        }, 50);
      }
    }, 16);

    return () => clearInterval(interval);
  }, [barAnim, fadeAnim, finishEarly, glowOpacity, logoPulse, logoScale]);

  const maxBarWidth = Math.min(270, width - 70);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={[StyleSheet.absoluteFill, styles.contentWrap]}>
        <LinearGradient
          colors={['#02010A', '#080518', '#03010C']}
          style={StyleSheet.absoluteFill}
        />

        {/* Ambient Particles & Nebula Glow Backdrop */}
        <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <RadialGradient id="splashGlow" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#00F5FF" stopOpacity="0.25" />
              <Stop offset="55%" stopColor="#7928CA" stopOpacity="0.12" />
              <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </RadialGradient>
          </Defs>

          <Circle cx={width * 0.5} cy={height * 0.5} r={180} fill="url(#splashGlow)" />

          {particles.map((pt) => (
            <Circle
              key={pt.id}
              cx={pt.x}
              cy={pt.y}
              r={pt.r}
              fill={pt.color}
              opacity={pt.opacity}
            />
          ))}

          {/* Framing Guideways */}
          <Line x1={20} y1={height * 0.25} x2={20} y2={height * 0.75} stroke="rgba(0, 245, 255, 0.15)" strokeWidth={1} />
          <Line x1={width - 20} y1={height * 0.25} x2={width - 20} y2={height * 0.75} stroke="rgba(0, 245, 255, 0.15)" strokeWidth={1} />
        </Svg>

        <View style={styles.centerBox} pointerEvents="box-none">
          {/* Pulsing Neon Glow Aura */}
          <Animated.View style={[styles.glowAura, { opacity: glowOpacity }]} />

          {/* Company Logo (Nameless Forge) with Breathing Scale */}
          <Animated.View
            style={[
              styles.logoWrapper,
              {
                transform: [{ scale: Animated.multiply(logoScale, logoPulse) }],
              },
            ]}
          >
            <Image
              source={companyLogoAsset}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Studio Title */}
          <Text style={styles.presentedByText}>A NAMELESS FORGE PRODUCTION</Text>

          {/* Loading Bar Section */}
          <View style={[styles.loadingSection, { width: maxBarWidth }]}>
            <View style={styles.loadingTrack}>
              <View
                style={[
                  styles.loadingFill,
                  { width: `${progressPct}%` },
                ]}
              >
                <LinearGradient
                  colors={['#00F5FF', '#7928CA', '#FF007F']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              </View>
            </View>

            {/* Telemetry Status Line */}
            <View style={styles.telemetryRow}>
              <Text style={styles.statusLabel}>{statusText}</Text>
              <Text style={styles.pctLabel}>{progressPct}%</Text>
            </View>
          </View>
        </View>

        {/* Footer Mark */}
        <View style={styles.footerMark} pointerEvents="none">
          <Text style={styles.footerText}>NEO GAME TOWER // SYSTEM BOOT</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#02010A',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
  },
  contentWrap: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  glowAura: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(0, 245, 255, 0.12)',
    shadowColor: '#00F5FF',
    shadowOpacity: 0.9,
    shadowRadius: 60,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#00F5FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.65,
    shadowRadius: 28,
    elevation: 14,
  },
  logoImage: {
    width: 210,
    height: 184,
  },
  presentedByText: {
    fontFamily: monoFont,
    fontSize: 11.5,
    fontWeight: '800',
    color: '#00F5FF',
    letterSpacing: 3,
    marginBottom: 36,
    opacity: 0.95,
    textShadowColor: 'rgba(0, 245, 255, 0.65)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  loadingSection: {
    alignItems: 'stretch',
  },
  loadingTrack: {
    height: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3.5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.3)',
  },
  loadingFill: {
    height: '100%',
    borderRadius: 3.5,
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  statusLabel: {
    fontFamily: monoFont,
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.65)',
    letterSpacing: 0.8,
  },
  pctLabel: {
    fontFamily: monoFont,
    fontSize: 10.5,
    fontWeight: '900',
    color: '#FFE600',
  },
  footerMark: {
    position: 'absolute',
    bottom: 28,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: monoFont,
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.35)',
    letterSpacing: 1.5,
  },
});
