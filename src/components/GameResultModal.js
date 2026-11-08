import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Modal } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { COLORS } from '../../styles';
import { triggerLightHaptic } from '../utils/haptics';
import { playTapSound } from '../utils/sound';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export default function GameResultModal({
  visible,
  type = 'GAME_OVER', // 'GAME_OVER' | 'VICTORY' | 'DRAW' | 'win' | 'gameover'
  title,
  subtitle,
  score,
  bestScore,
  accentColor,
  onRetry,
  onBackToHub,
  retryLabel,
  buttonText,
}) {
  if (!visible) return null;

  const normalizedType = String(type).toUpperCase();
  const isWin = normalizedType === 'VICTORY' || normalizedType === 'WIN';
  const isDraw = normalizedType === 'DRAW';
  const defaultAccent = isWin
    ? COLORS.matrixMint
    : isDraw
      ? COLORS.solarGold
      : COLORS.danger;
  const accent = accentColor || defaultAccent;

  const displayTitle =
    title || (isWin ? 'VICTORY' : isDraw ? 'DRAW' : 'GAME OVER');
  const icon = isWin ? '🏆' : isDraw ? '🤝' : '⚠️';
  const displayRetryText =
    buttonText || retryLabel || (isWin ? 'NEXT LEVEL' : 'PLAY AGAIN');

  const handleRetry = () => {
    try {
      triggerLightHaptic();
      playTapSound();
    } catch {}
    if (onRetry) onRetry();
  };

  const handleBack = () => {
    try {
      triggerLightHaptic();
      playTapSound();
    } catch {}
    if (onBackToHub) onBackToHub();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleBack || handleRetry}
    >
      <Pressable
        style={localStyles.overlay}
        onPress={(e) => {
          e.stopPropagation?.();
        }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
      >
        <Animated.View
          entering={FadeIn.duration(200)}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        >
          <View style={localStyles.backdropTint} />
        </Animated.View>

        <Animated.View
          entering={ZoomIn.duration(240)}
          style={[localStyles.card, { borderColor: accent }]}
        >
          <Pressable
            onPress={(e) => e.stopPropagation?.()}
            style={{ width: '100%', alignItems: 'center' }}
          >
            <Text style={localStyles.icon}>{icon}</Text>
            <Text style={[localStyles.title, { color: accent }]}>
              {displayTitle}
            </Text>

            {subtitle ? (
              <Text style={localStyles.subtitle}>{subtitle}</Text>
            ) : null}

            {typeof score === 'number' ? (
              <View style={localStyles.statsContainer}>
                <View style={localStyles.statBox}>
                  <Text style={localStyles.statLabel}>FINAL SCORE</Text>
                  <Text style={[localStyles.statVal, { color: accent }]}>
                    {score}
                  </Text>
                </View>
                {typeof bestScore === 'number' && bestScore > 0 ? (
                  <View style={localStyles.statBox}>
                    <Text style={localStyles.statLabel}>BEST RECORD</Text>
                    <Text style={[localStyles.statVal, { color: COLORS.solarGold }]}>
                      {bestScore}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={localStyles.btnRow}>
              {onBackToHub ? (
                <Pressable
                  onPress={handleBack}
                  hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                  style={({ pressed }) => [
                    localStyles.backBtn,
                    pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
                  ]}
                >
                  <Text style={localStyles.backBtnText}>HUB</Text>
                </Pressable>
              ) : null}

              <Pressable
                onPress={handleRetry}
                hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                style={({ pressed }) => [
                  localStyles.retryBtn,
                  { backgroundColor: accent },
                  pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
                ]}
              >
                <Text
                  style={[
                    localStyles.retryBtnText,
                    { color: isWin ? '#04040E' : '#FFFFFF' },
                  ]}
                >
                  {displayRetryText}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(3, 3, 10, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 999999,
    elevation: 999999,
  },
  backdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 3, 10, 0.92)',
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: 'rgba(10, 12, 28, 0.98)',
    borderRadius: 20,
    borderWidth: 1.6,
    padding: 22,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 30000,
  },
  icon: {
    fontSize: 34,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: monoFont,
    fontWeight: '900',
    letterSpacing: 1.4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '700',
    color: '#00F5FF',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 14,
    lineHeight: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
    width: '100%',
    justifyContent: 'center',
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 8,
    fontFamily: monoFont,
    fontWeight: '800',
    color: COLORS.textSecondary,
    marginBottom: 2,
    letterSpacing: 0.8,
  },
  statVal: {
    fontSize: 16,
    fontFamily: monoFont,
    fontWeight: '900',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  backBtn: {
    flex: 1,
    backgroundColor: 'rgba(0, 245, 255, 0.12)',
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: 'rgba(0, 245, 255, 0.5)',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#00F5FF',
    letterSpacing: 0.8,
  },
  retryBtn: {
    flex: 1.3,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnText: {
    fontSize: 11.5,
    fontFamily: monoFont,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
