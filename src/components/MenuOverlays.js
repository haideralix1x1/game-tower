import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { styles, COLORS, THEMES } from '../../styles';

const THEME_LIST = Object.values(THEMES);

function NeonPrimaryButton({
  label,
  onPress,
  colors = [COLORS.cyan, COLORS.electricBlue],
  borderColor = COLORS.cyan,
}) {
  return (
    <Pressable
      onPress={onPress}
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
  if (gameState === 'PLAYING') {
    return null;
  }

  const activeTheme = THEMES[themeId] || THEMES.CYBER_NEON;

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(160)}
      style={styles.overlayBackdrop}
    >
      {gameState === 'START' && (
        <Animated.View
          entering={ZoomIn.duration(260)}
          style={[
            styles.overlayCard,
            {
              borderColor: `${activeTheme.accent}66`,
              shadowColor: activeTheme.accent,
            },
          ]}
        >
          <View
            style={[
              styles.cyberTagPill,
              {
                borderColor: `${activeTheme.accent}88`,
                backgroundColor: `${activeTheme.accent}22`,
              },
            ]}
          >
            <Text style={[styles.cyberTagText, { color: activeTheme.accent }]}>
              FLOOR 01 // HYPER-ARCADE
            </Text>
          </View>

          <Text
            style={[
              styles.titleNeoMain,
              { textShadowColor: activeTheme.accent },
            ]}
          >
            STACK BLOCK
          </Text>
          <Text
            style={[
              styles.titleNeoAccent,
              {
                color: activeTheme.secondaryAccent,
                textShadowColor: activeTheme.secondaryAccent,
              },
            ]}
          >
            N E O
          </Text>

          <Text style={styles.subtitleText}>
            Drop 3D neon slabs with razor-sharp precision. Chain Perfect hits to
            trigger Overdrive & expand your tower.
          </Text>

          {bestScore > 0 && (
            <View style={styles.bestScoreBanner}>
              <Text style={styles.bestScoreBannerLabel}>RECORD SCORE //</Text>
              <Text style={styles.bestScoreBannerValue}>
                {String(bestScore).padStart(4, '0')}
              </Text>
            </View>
          )}

          {/* Visual Theme Selector */}
          <View style={styles.themeSelectorSection}>
            <Text style={styles.themeSelectorLabel}>SELECT VISUAL THEME</Text>
            <View style={styles.themeSelectorRow}>
              {THEME_LIST.map((t) => {
                const selected = t.id === themeId;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => onSelectTheme && onSelectTheme(t.id)}
                    style={[
                      styles.themeChip,
                      selected && {
                        borderColor: t.accent,
                        backgroundColor: `${t.accent}22`,
                      },
                    ]}
                  >
                    <View style={styles.themeChipSwatches}>
                      <View
                        style={[
                          styles.themeSwatchDot,
                          { backgroundColor: t.accent },
                        ]}
                      />
                      <View
                        style={[
                          styles.themeSwatchDot,
                          { backgroundColor: t.secondaryAccent },
                        ]}
                      />
                    </View>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.themeChipText,
                        selected && { color: '#FFFFFF' },
                      ]}
                    >
                      {t.name.split(' ')[1] || t.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.featureList}>
            <View
              style={[
                styles.featureRow,
                { borderLeftColor: activeTheme.accent },
              ]}
            >
              <Text
                style={[styles.featureBadge, { color: activeTheme.accent }]}
              >
                TAP
              </Text>
              <Text style={styles.featureDesc}>
                Tap anywhere on screen to lock & drop the active slab
              </Text>
            </View>
            <View
              style={[
                styles.featureRow,
                { borderLeftColor: activeTheme.secondaryAccent },
              ]}
            >
              <Text
                style={[
                  styles.featureBadge,
                  { color: activeTheme.secondaryAccent },
                ]}
              >
                SLICE
              </Text>
              <Text style={styles.featureDesc}>
                Laser shears overhanging edges into tumbling 3D debris
              </Text>
            </View>
            <View
              style={[
                styles.featureRow,
                { borderLeftColor: COLORS.solarGold },
              ]}
            >
              <Text style={[styles.featureBadge, { color: COLORS.solarGold }]}>
                PERFECT
              </Text>
              <Text style={styles.featureDesc}>
                Align within 5% for Overdrive multipliers & width boost
              </Text>
            </View>
          </View>

          <NeonPrimaryButton
            label="LAUNCH TOWER"
            onPress={onStartGame}
            colors={[activeTheme.accent, activeTheme.secondaryAccent]}
            borderColor={activeTheme.accent}
          />

          {onBackToHub && (
            <Pressable
              onPress={onBackToHub}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Text style={styles.secondaryButtonText}>
                BACK TO GAME TOWER
              </Text>
            </Pressable>
          )}
        </Animated.View>
      )}

      {gameState === 'PAUSED' && (
        <Animated.View
          entering={ZoomIn.duration(220)}
          style={[
            styles.overlayCard,
            {
              borderColor: `${activeTheme.accent}66`,
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
            onPress={onResumeGame}
            colors={[activeTheme.accent, activeTheme.secondaryAccent]}
            borderColor={activeTheme.accent}
          />

          <Pressable
            onPress={onRestartGame}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && { opacity: 0.75 },
            ]}
          >
            <Text style={styles.secondaryButtonText}>RESTART RUN</Text>
          </Pressable>

          <Pressable
            onPress={onBackToHub || onReturnHome}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && { opacity: 0.75 },
            ]}
          >
            <Text style={styles.secondaryButtonText}>
              {onBackToHub ? 'BACK TO GAME TOWER' : 'MAIN MENU'}
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
              borderColor: `${activeTheme.accent}66`,
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
              { borderColor: `${activeTheme.accent}55` },
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
              <Text style={[styles.telemetryValue, { color: COLORS.solarGold }]}>
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
            onPress={onRestartGame}
            colors={[activeTheme.accent, activeTheme.secondaryAccent]}
            borderColor={activeTheme.accent}
          />

          <Pressable
            onPress={onBackToHub || onReturnHome}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && { opacity: 0.75 },
            ]}
          >
            <Text style={styles.secondaryButtonText}>
              {onBackToHub ? 'BACK TO GAME TOWER' : 'MAIN MENU'}
            </Text>
          </Pressable>
        </Animated.View>
      )}
    </Animated.View>
  );
}
