import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { COLORS } from '../../styles';
import { triggerLightHaptic } from '../utils/haptics';
import { playTapSound } from '../utils/sound';

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

export default function MiniGameHeader({
  title,
  gameTitle,
  floorLabel,
  floorNum,
  category,
  score = 0,
  bestScore = 0,
  accentColor = COLORS.cyan,
  onBack,
  onBackToHub,
  onReset,
  rightExtra = null,
  disabled = false,
}) {
  const insets = useSafeAreaInsets();
  const scoreScale = useSharedValue(1);

  const displayTitle = title || gameTitle || 'MINI GAME';
  const displayFloor =
    floorLabel ||
    (floorNum
      ? `FLOOR ${String(floorNum).padStart(2, '0')}${category ? ` // ${category}` : ''}`
      : 'FLOOR');
  const actualBack = onBack || onBackToHub;

  useEffect(() => {
    if (score > 0) {
      scoreScale.value = withSequence(
        withTiming(1.32, { duration: 65 }),
        withSpring(1, { damping: 8, stiffness: 250 })
      );
    }
  }, [score, scoreScale]);

  const animatedScoreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scoreScale.value }],
  }));

  const handleBack = () => {
    if (disabled) return;
    try {
      triggerLightHaptic();
      playTapSound();
    } catch {}
    if (actualBack && typeof actualBack === 'function') {
      actualBack();
    }
  };

  const handleReset = () => {
    if (disabled) return;
    try {
      triggerLightHaptic();
      playTapSound();
    } catch {}
    if (onReset && typeof onReset === 'function') {
      onReset();
    }
  };

  return (
    <View
      style={[
        localStyles.wrapper,
        { paddingTop: Math.max(insets.top + 6, Platform.OS === 'android' ? 36 : 12) },
        disabled && { opacity: 0.4 },
      ]}
      pointerEvents={disabled ? 'none' : 'box-none'}
    >
      <LinearGradient
        colors={['rgba(8, 8, 22, 0.98)', 'rgba(16, 10, 34, 0.96)']}
        style={[
          localStyles.bar,
          {
            borderColor: hexToRgba(accentColor, 0.4),
            shadowColor: accentColor,
          },
        ]}
      >
        <View style={localStyles.leftRow}>
          <Pressable
            onPress={handleBack}
            disabled={disabled}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 30 }}
            style={({ pressed }) => [
              localStyles.backBtn,
              { borderColor: hexToRgba(accentColor, 0.65) },
              pressed && !disabled && { opacity: 0.65, transform: [{ scale: 0.92 }] },
            ]}
          >
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path
                d="M15 18L9 12L15 6"
                stroke={accentColor}
                strokeWidth={3.0}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={[localStyles.backText, { color: accentColor }]}>
              HUB
            </Text>
          </Pressable>

          <View style={localStyles.titleGroup}>
            <Text style={[localStyles.floorTag, { color: accentColor }]}>
              {displayFloor}
            </Text>
            <Text numberOfLines={1} style={localStyles.titleText}>
              {displayTitle}
            </Text>
          </View>
        </View>

        <View style={localStyles.rightRow}>
          <View style={localStyles.statBox}>
            <Text style={localStyles.statLabel}>SCORE</Text>
            <Animated.Text
              style={[
                localStyles.statValue,
                { color: accentColor },
                animatedScoreStyle,
              ]}
            >
              {score}
            </Animated.Text>
          </View>

          <View style={localStyles.statBox}>
            <Text style={localStyles.statLabel}>BEST</Text>
            <Text style={[localStyles.statValue, { color: COLORS.solarGold }]}>
              {Math.max(score, bestScore)}
            </Text>
          </View>

          {rightExtra}

          {onReset && (
            <Pressable
              onPress={handleReset}
              disabled={disabled}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              style={({ pressed }) => [
                localStyles.resetBtn,
                { borderColor: hexToRgba(accentColor, 0.4) },
                pressed && !disabled && { opacity: 0.7, transform: [{ scale: 0.94 }] },
              ]}
            >
              <Text style={[localStyles.resetText, { color: accentColor }]}>
                NEW
              </Text>
            </Pressable>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

const localStyles = StyleSheet.create({
  wrapper: {
    width: '100%',
    paddingHorizontal: 12,
    paddingBottom: 6,
    zIndex: 999,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1.3,
    paddingHorizontal: 10,
    paddingVertical: 9,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.2,
    backgroundColor: 'rgba(0, 245, 255, 0.16)',
    gap: 3,
    minHeight: 38,
    minWidth: 54,
  },
  backText: {
    fontSize: 10.5,
    fontFamily: monoFont,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  titleGroup: {
    flexShrink: 1,
  },
  floorTag: {
    fontSize: 8.5,
    fontFamily: monoFont,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  titleText: {
    fontSize: 13.5,
    fontFamily: monoFont,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 0.6,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  statBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9,
    minWidth: 50,
  },
  statLabel: {
    fontSize: 8,
    fontFamily: monoFont,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
  },
  statValue: {
    fontSize: 13.5,
    fontFamily: monoFont,
    fontWeight: '900',
  },
  resetBtn: {
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  resetText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
