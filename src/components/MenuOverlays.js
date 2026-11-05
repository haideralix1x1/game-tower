import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { styles, COLORS, THEMES } from '../../styles';
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

function NeonPrimaryButton({
  label,
  onPress,
  colors = [COLORS.cyan, COLORS.electricBlue],
  borderColor = COLORS.cyan,
}) {
  return (
    <Pressable
      onPress={() => {
        triggerLightHaptic();
        playTapSound();
        if (onPress) onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.neonButtonWrapper,
        { borderColor, shadowColor: borderColor },
        pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
      ]}
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.neonButtonGradient}
      >
        <Text style={styles.neonButtonText}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export default function MenuOverlays({
  gameState,
  score,
  bestScore,
  isNewRecord,
  stats,
  themeId = 'CYBER_NEON',
  onSelectTheme,
  onStartGame,
  onResumeGame,
  onRestartGame,
  onReturnHome,
  onBackToHub,
}) {
  // If PLAYING or START, do not show blocking full-screen modal
  // START is handled cleanly with in-game tap-to-start prompt
  if (gameState === 'PLAYING' || gameState === 'START') {
    return null;
  }

  const activeTheme = THEMES[themeId] || THEMES.CYBER_NEON;

  const handleBack = () => {
    triggerLightHaptic();
    playTapSound();
    if (onBackToHub) {
      onBackToHub();
    } else if (onReturnHome) {
      onReturnHome();
    }
  };

  const handleRestart = () => {
    triggerLightHaptic();
    playTapSound();
    if (onRestartGame) onRestartGame();
  };

  const handleResume = () => {
    triggerLightHaptic();
    playTapSound();
    if (onResumeGame) onResumeGame();
  };

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={styles.overlayBackdrop}
    >
      <ScrollView
        contentContainerStyle={overlayStyles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={overlayStyles.scrollWrapper}
      >
        {gameState === 'PAUSED' && (
          <Animated.View
            entering={ZoomIn.duration(220)}
            style={[
              styles.overlayCard,
              {
                borderColor: hexToRgba(activeTheme.accent, 0.45),
                shadowColor: activeTheme.accent,
              },
            ]}
          >
            <View style={styles.cyberTagPill}>
              <Text style={styles.cyberTagText}>SYSTEM PAUSED</Text>
            </View>

            <Text style={styles.titleNeoMain}>PAUSED</Text>
            <Text style={[styles.subtitleText, { marginTop: 6 }]}>
              Tower construction temporarily suspended.
            </Text>

            <View style={styles.telemetryGrid}>
              <View style={styles.telemetryCell}>
                <Text
                  style={[styles.telemetryValue, { color: activeTheme.accent }]}
                >
                  {score}
                </Text>
                <Text style={styles.telemetryLabel}>SCORE</Text>
              </View>
              <View style={styles.telemetryCell}>
                <Text
                  style={[
                    styles.telemetryValue,
                    { color: activeTheme.secondaryAccent },
                  ]}
                >
                  {`${stats.blocksPlaced}F`}
                </Text>
                <Text style={styles.telemetryLabel}>HEIGHT</Text>
              </View>
            </View>

            <NeonPrimaryButton
              label="RESUME"
              onPress={handleResume}
              colors={[activeTheme.accent, activeTheme.secondaryAccent]}
              borderColor={activeTheme.accent}
            />

            <Pressable
              onPress={handleRestart}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Text style={styles.secondaryButtonText}>RESTART RUN</Text>
            </Pressable>

            <Pressable
              onPress={handleBack}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.secondaryButton,
                overlayStyles.hubBackBtn,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Text style={[styles.secondaryButtonText, { color: COLORS.cyan }]}>
                ← BACK TO NEO GAME TOWER
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {gameState === 'GAME_OVER' && (
          <Animated.View
            entering={ZoomIn.duration(260)}
            style={[
              styles.overlayCard,
              {
                borderColor: hexToRgba(activeTheme.accent, 0.45),
                shadowColor: activeTheme.accent,
              },
            ]}
          >
            <View
              style={[
                styles.cyberTagPill,
                {
                  borderColor: COLORS.magenta,
                  backgroundColor: 'rgba(255, 0, 127, 0.16)',
                },
              ]}
            >
              <Text style={[styles.cyberTagText, { color: COLORS.magenta }]}>
                STRUCTURAL COLLAPSE
              </Text>
            </View>

            <Text style={styles.titleNeoMain}>GAME OVER</Text>

            <View
              style={[
                styles.scoreShowcaseBox,
                { borderColor: hexToRgba(activeTheme.accent, 0.35) },
              ]}
            >
              <Text style={styles.scoreShowcaseLabel}>FINAL SCORE</Text>
              <Text
                style={[
                  styles.scoreShowcaseValue,
                  { color: activeTheme.accent },
                ]}
              >
                {String(score).padStart(4, '0')}
              </Text>
              {isNewRecord ? (
                <View style={styles.newRecordBadge}>
                  <Text style={styles.newRecordText}>NEW HIGH SCORE!</Text>
                </View>
              ) : (
                <Text style={[styles.telemetryLabel, { marginTop: 2 }]}>
                  {`BEST: ${String(bestScore).padStart(4, '0')}`}
                </Text>
              )}
            </View>

            <View style={styles.telemetryGrid}>
              <View style={styles.telemetryCell}>
                <Text style={styles.telemetryValue}>{stats.blocksPlaced}</Text>
                <Text style={styles.telemetryLabel}>BLOCKS STACKED</Text>
              </View>
              <View style={styles.telemetryCell}>
                <Text
                  style={[
                    styles.telemetryValue,
                    { color: activeTheme.secondaryAccent },
                  ]}
                >
                  {`x${stats.maxCombo + 1}`}
                </Text>
                <Text style={styles.telemetryLabel}>MAX MULTIPLIER</Text>
              </View>
              <View style={styles.telemetryCell}>
                <Text
                  style={[styles.telemetryValue, { color: COLORS.solarGold }]}
                >
                  {stats.perfectCount}
                </Text>
                <Text style={styles.telemetryLabel}>PERFECT DROPS</Text>
              </View>
              <View style={styles.telemetryCell}>
                <Text
                  style={[styles.telemetryValue, { color: activeTheme.accent }]}
                >
                  {`LVL ${stats.speedLevel}`}
                </Text>
                <Text style={styles.telemetryLabel}>PEAK SPEED</Text>
              </View>
            </View>

            <NeonPrimaryButton
              label="PLAY AGAIN"
              onPress={handleRestart}
              colors={[activeTheme.accent, activeTheme.secondaryAccent]}
              borderColor={activeTheme.accent}
            />

            <Pressable
              onPress={handleBack}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.secondaryButton,
                overlayStyles.hubBackBtn,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Text style={[styles.secondaryButtonText, { color: COLORS.cyan }]}>
                ← BACK TO NEO GAME TOWER
              </Text>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </Animated.View>
  );
}

const overlayStyles = StyleSheet.create({
  scrollWrapper: {
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 8,
  },
  hubBackBtn: {
    borderColor: 'rgba(0, 245, 255, 0.45)',
    backgroundColor: 'rgba(0, 245, 255, 0.08)',
    marginTop: 12,
  },
});
