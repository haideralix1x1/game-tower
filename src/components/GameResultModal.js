import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
} from 'react-native';
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
  type = 'GAME_OVER', // 'GAME_OVER' | 'VICTORY' | 'DRAW' | 'win' | 'gameover' | 'retry'
  title,
  subtitle,
  message,
  desc,
  description,
  score,
  level,
  bestScore,
  highScore,
  accentColor,
  onRetry,
  onRestart,
  onNext,
  onNextLevel,
  onPlayAgain,
  onReset,
  onBackToHub,
  onReturnHome,
  onBack,
  onExit,
  retryLabel,
  buttonText,
  nextLabel,
  replayLabel,
  actionLabel,
}) {
  if (!visible) return null;

  const normalizedType = String(type).toUpperCase();
  const isWin =
    normalizedType === 'VICTORY' ||
    normalizedType === 'WIN' ||
    normalizedType === 'CLEARED';
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

  const displaySubtitle = subtitle || message || desc || description || '';

  const finalScore =
    typeof score === 'number'
      ? score
      : typeof level === 'number'
        ? level
        : undefined;

  const finalBest =
    typeof bestScore === 'number'
      ? bestScore
      : typeof highScore === 'number'
        ? highScore
        : undefined;

  const replayFn =
    onPlayAgain ||
    onRestart ||
    (isWin && (onNext || onNextLevel) ? onRetry || onReset : null);

  const displayActionText =
    buttonText ||
    nextLabel ||
    actionLabel ||
    (isWin
      ? retryLabel && !replayFn
        ? retryLabel
        : 'NEXT LEVEL ▶'
      : retryLabel || 'PLAY AGAIN ⟳');

  const handleAction = () => {
    try {
      triggerLightHaptic();
      playTapSound();
    } catch {}

    const primaryFn = isWin
      ? onNextLevel || onNext || onRetry || onRestart || onPlayAgain || onReset
      : onRetry || onRestart || onPlayAgain || onReset || onNextLevel || onNext;

    if (primaryFn) {
      primaryFn();
    }
  };

  const handleReplay = () => {
    try {
      triggerLightHaptic();
      playTapSound();
    } catch {}

    if (replayFn) {
      replayFn();
    }
  };

  const backFn = onBackToHub || onReturnHome || onBack || onExit;

  const handleBack = () => {
    try {
      triggerLightHaptic();
      playTapSound();
    } catch {}

    if (backFn) {
      backFn();
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleBack || handleAction}
    >
      <View style={localStyles.overlay}>
        {/* Modal Card */}
        <View style={[localStyles.card, { borderColor: accent }]}>
          <Text style={localStyles.icon}>{icon}</Text>
          <Text style={[localStyles.title, { color: accent }]}>
            {displayTitle}
          </Text>

          {displaySubtitle ? (
            <Text style={localStyles.subtitle}>{displaySubtitle}</Text>
          ) : null}

          {typeof finalScore === 'number' ? (
            <View style={localStyles.statsContainer}>
              <View style={localStyles.statBox}>
                <Text style={localStyles.statLabel}>FINAL SCORE</Text>
                <Text style={[localStyles.statVal, { color: accent }]}>
                  {finalScore}
                </Text>
              </View>
              {typeof finalBest === 'number' && finalBest > 0 ? (
                <View style={localStyles.statBox}>
                  <Text style={localStyles.statLabel}>BEST RECORD</Text>
                  <Text style={[localStyles.statVal, { color: COLORS.solarGold }]}>
                    {finalBest}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Action Buttons Row */}
          <View style={localStyles.btnRow}>
            {Boolean(backFn) && (
              <TouchableOpacity
                onPress={handleBack}
                activeOpacity={0.72}
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                style={[
                  localStyles.backBtn,
                  isWin && Boolean(replayFn) && { flex: 0.85 },
                ]}
              >
                <Text style={localStyles.backBtnText}>HUB</Text>
              </TouchableOpacity>
            )}

            {isWin && Boolean(replayFn) && (
              <TouchableOpacity
                onPress={handleReplay}
                activeOpacity={0.75}
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                style={[localStyles.replayBtn, { borderColor: accent }]}
              >
                <Text style={[localStyles.replayBtnText, { color: accent }]}>
                  {replayLabel || 'PLAY AGAIN ⟳'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleAction}
              activeOpacity={0.8}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              style={[
                localStyles.retryBtn,
                { backgroundColor: accent },
                isWin && Boolean(replayFn) && { flex: 1.25 },
              ]}
            >
              <Text
                style={[
                  localStyles.retryBtnText,
                  { color: isWin ? '#04040E' : '#FFFFFF' },
                ]}
              >
                {displayActionText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(3, 3, 10, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 999999,
    elevation: 20,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#0A0D20',
    borderRadius: 20,
    borderWidth: 2,
    padding: 22,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    zIndex: 1000000,
    elevation: 25,
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
    marginTop: 6,
  },
  backBtn: {
    flex: 1,
    backgroundColor: 'rgba(0, 245, 255, 0.12)',
    borderRadius: 12,
    borderWidth: 1.4,
    borderColor: 'rgba(0, 245, 255, 0.6)',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  backBtnText: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '900',
    color: '#00F5FF',
    letterSpacing: 1,
  },
  replayBtn: {
    flex: 1.25,
    borderRadius: 12,
    borderWidth: 1.4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  replayBtnText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  retryBtn: {
    flex: 1.4,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  retryBtnText: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
