import React, { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { styles, COLORS, THEMES } from '../../styles';

export default function HudBar({
  score,
  bestScore,
  combo,
  speedLevel,
  speedMultiplier,
  widthPercent,
  gameState,
  isMuted,
  themeId = 'CYBER_NEON',
  onToggleMute,
  onPausePress,
  onBackToHub,
}) {
  const theme = THEMES[themeId] || THEMES.CYBER_NEON;
  const scoreScale = useSharedValue(1);
  const comboScale = useSharedValue(1);

  useEffect(() => {
    if (score > 0) {
      scoreScale.value = withSequence(
        withTiming(1.26, { duration: 70 }),
        withSpring(1, { damping: 9, stiffness: 240 })
      );
    }
  }, [score, scoreScale]);

  useEffect(() => {
    if (combo > 0) {
      comboScale.value = withSequence(
        withTiming(1.22, { duration: 80 }),
        withSpring(1, { damping: 8, stiffness: 250 })
      );
    }
  }, [combo, comboScale]);

  const animatedScoreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scoreScale.value }],
  }));

  const animatedComboStyle = useAnimatedStyle(() => ({
    transform: [{ scale: comboScale.value }],
  }));

  const clampedWidthPct = Math.max(5, Math.min(100, Math.round(widthPercent)));
  const meterColor =
    clampedWidthPct > 55
      ? theme.accent
      : clampedWidthPct > 28
        ? COLORS.solarGold
        : COLORS.danger;

  const isOverdrive = combo >= 2;

  return (
    <View style={styles.hudWrapper} pointerEvents="box-none">
      {/* Main Top HUD Card */}
      <View
        style={[
          styles.hudTopRow,
          { borderColor: `${theme.accent}4D`, shadowColor: theme.accent },
        ]}
      >
        <View style={styles.hudStatGroup}>
          {onBackToHub && (
            <Pressable
              onPress={onBackToHub}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Back to Game Tower Hub"
              style={({ pressed }) => [
                styles.iconButton,
                {
                  borderColor: `${theme.accent}77`,
                  paddingHorizontal: 8,
                  width: 'auto',
                  flexDirection: 'row',
                  gap: 2,
                },
                pressed && { opacity: 0.7, transform: [{ scale: 0.94 }] },
              ]}
            >
              <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M15 18L9 12L15 6"
                  stroke={theme.accent}
                  strokeWidth={2.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text
                style={[
                  styles.levelBadgeText,
                  { color: theme.accent, fontSize: 10 },
                ]}
              >
                HUB
              </Text>
            </Pressable>
          )}

          <View style={styles.hudStatBlock}>
            <Text style={styles.hudStatLabel}>SCORE</Text>
            <Animated.Text
              style={[
                styles.hudScoreValue,
                { color: theme.accent, textShadowColor: `${theme.accent}88` },
                animatedScoreStyle,
              ]}
            >
              {String(score).padStart(4, '0')}
            </Animated.Text>
          </View>

          <View style={styles.hudDivider} />

          <View style={styles.hudStatBlock}>
            <Text style={styles.hudStatLabel}>BEST</Text>
            <Text style={styles.hudBestValue}>
              {String(Math.max(score, bestScore)).padStart(4, '0')}
            </Text>
          </View>
        </View>

        <View style={styles.hudRightGroup}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>{`LVL ${speedLevel}`}</Text>
            <Text style={[styles.speedSubText, { color: theme.accent }]}>
              {`${speedMultiplier}x SPD`}
            </Text>
          </View>

          {/* Audio Mute / Unmute Toggle Button */}
          <Pressable
            onPress={onToggleMute}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            style={({ pressed }) => [
              styles.iconButton,
              { borderColor: `${theme.accent}66` },
              pressed && { opacity: 0.7, transform: [{ scale: 0.94 }] },
            ]}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M11 5L6 9H2V15H6L11 19V5Z"
                stroke={isMuted ? COLORS.textMuted : theme.accent}
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {isMuted ? (
                <>
                  <Line
                    x1="22"
                    y1="9"
                    x2="16"
                    y2="15"
                    stroke={COLORS.danger}
                    strokeWidth={2.2}
                    strokeLinecap="round"
                  />
                  <Line
                    x1="16"
                    y1="9"
                    x2="22"
                    y2="15"
                    stroke={COLORS.danger}
                    strokeWidth={2.2}
                    strokeLinecap="round"
                  />
                </>
              ) : (
                <Path
                  d="M15.54 8.46C16.47 9.4 17 10.67 17 12C17 13.33 16.47 14.6 15.54 15.54M19.07 4.93C20.94 6.8 22 9.35 22 12C22 14.65 20.94 17.2 19.07 19.07"
                  stroke={theme.accent}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              )}
            </Svg>
          </Pressable>

          {gameState === 'PLAYING' && (
            <Pressable
              onPress={onPausePress}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Pause Game"
              style={({ pressed }) => [
                styles.iconButton,
                { borderColor: `${theme.accent}66` },
                pressed && { opacity: 0.7, transform: [{ scale: 0.94 }] },
              ]}
            >
              <View style={styles.pauseIconRow}>
                <View
                  style={[styles.pauseBar, { backgroundColor: theme.accent }]}
                />
                <View
                  style={[styles.pauseBar, { backgroundColor: theme.accent }]}
                />
              </View>
            </Pressable>
          )}
        </View>
      </View>

      {/* Secondary Sub-HUD: Block Stability Meter + Combo Streak Pill */}
      <View style={styles.hudSubRow} pointerEvents="none">
        <View style={styles.widthMeterContainer}>
          <View style={styles.widthMeterHeader}>
            <Text style={styles.widthMeterLabel}>SLAB INTEGRITY</Text>
            <Text style={[styles.widthMeterValue, { color: meterColor }]}>
              {`${clampedWidthPct}%`}
            </Text>
          </View>
          <View style={styles.widthMeterTrack}>
            <View
              style={[
                styles.widthMeterFill,
                {
                  width: `${clampedWidthPct}%`,
                  backgroundColor: meterColor,
                },
              ]}
            />
          </View>
        </View>

        <Animated.View
          style={[
            styles.comboPill,
            isOverdrive && styles.comboPillOverdrive,
            combo === 0 && styles.comboPillIdle,
            animatedComboStyle,
          ]}
        >
          <Text
            style={[
              styles.comboPillText,
              isOverdrive && styles.comboPillTextOverdrive,
              combo === 0 && styles.comboPillTextIdle,
            ]}
          >
            {isOverdrive
              ? `OVERDRIVE x${combo + 1}`
              : combo > 0
                ? `STREAK x${combo + 1}`
                : 'STREAK x1'}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}
