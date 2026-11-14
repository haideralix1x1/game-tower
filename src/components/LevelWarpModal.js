import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { triggerLightHaptic } from '../utils/haptics';
import { playTapSound } from '../utils/sound';

const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export default function LevelWarpModal({
  visible,
  currentLevel = 1,
  totalLevels = 100,
  levelNames = [],
  levelHints = [],
  accentColor = '#00F5FF',
  gameTitle = 'SELECT LEVEL',
  onSelectLevel,
  onClose,
}) {
  if (!visible) return null;

  const levelsList = Array.from({ length: totalLevels }, (_, i) => i + 1);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { borderColor: accentColor }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: `${accentColor}33` }]}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.title, { color: accentColor }]}>
                ⚡ {gameTitle.toUpperCase()} (1 - {totalLevels})
              </Text>
              <Text style={styles.subtitle}>Tap any level to warp immediately</Text>
            </View>
            <Pressable
              style={styles.closeBtn}
              onPress={() => {
                triggerLightHaptic();
                playTapSound();
                onClose();
              }}
            >
              <Text style={styles.closeText}>✕ CLOSE</Text>
            </Pressable>
          </View>

          {/* Level List */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator
          >
            {levelsList.map((lvlNum) => {
              const isCurrent = lvlNum === currentLevel;
              const name =
                levelNames[lvlNum] ||
                levelNames[lvlNum - 1] ||
                `CHAMBER ${String(lvlNum).padStart(2, '0')}`;
              const hint = levelHints[lvlNum] || levelHints[lvlNum - 1] || '';

              const tierColor =
                lvlNum <= 10
                  ? '#00F5FF'
                  : lvlNum <= 25
                  ? '#FFE600'
                  : lvlNum <= 50
                  ? '#39FF14'
                  : lvlNum <= 75
                  ? '#FF007F'
                  : '#FF9900';

              return (
                <Pressable
                  key={`warp_lvl_${lvlNum}`}
                  style={({ pressed }) => [
                    styles.row,
                    isCurrent && {
                      borderColor: accentColor,
                      backgroundColor: `${accentColor}18`,
                    },
                    pressed && styles.rowPressed,
                  ]}
                  onPress={() => {
                    triggerLightHaptic();
                    playTapSound();
                    onSelectLevel(lvlNum);
                    onClose();
                  }}
                >
                  <View style={[styles.badge, { borderColor: tierColor }]}>
                    <Text style={[styles.badgeText, { color: tierColor }]}>
                      L{lvlNum}
                    </Text>
                  </View>

                  <View style={styles.info}>
                    <Text
                      style={[
                        styles.name,
                        isCurrent && { color: accentColor, fontWeight: '900' },
                      ]}
                      numberOfLines={1}
                    >
                      {name}
                    </Text>
                    {hint ? (
                      <Text style={styles.hintText} numberOfLines={1}>
                        {hint}
                      </Text>
                    ) : null}
                  </View>

                  {isCurrent ? (
                    <View style={[styles.activeBadge, { backgroundColor: accentColor }]}>
                      <Text style={styles.activeText}>ACTIVE</Text>
                    </View>
                  ) : (
                    <Text style={[styles.arrow, { color: accentColor }]}>▶</Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 6, 14, 0.90)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 32,
  },
  card: {
    width: '100%',
    maxHeight: '88%',
    backgroundColor: '#0A0D1E',
    borderRadius: 16,
    borderWidth: 2,
    padding: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingBottom: 10,
    marginBottom: 8,
  },
  title: {
    fontFamily: monoFont,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  subtitle: {
    fontFamily: monoFont,
    fontSize: 8.5,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  closeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 0, 85, 0.2)',
    borderWidth: 1,
    borderColor: '#FF0055',
  },
  closeText: {
    fontFamily: monoFont,
    fontSize: 9,
    fontWeight: '900',
    color: '#FF0055',
  },
  scroll: {
    maxHeight: 500,
  },
  scrollContent: {
    paddingBottom: 16,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#0F142A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  rowPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.99 }],
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    marginRight: 10,
    minWidth: 38,
    alignItems: 'center',
  },
  badgeText: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '900',
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: monoFont,
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  hintText: {
    fontFamily: monoFont,
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 1,
  },
  activeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeText: {
    fontFamily: monoFont,
    fontSize: 8,
    fontWeight: '900',
    color: '#060914',
  },
  arrow: {
    fontFamily: monoFont,
    fontSize: 10,
    marginLeft: 6,
  },
});
