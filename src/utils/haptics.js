import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const isHapticsAvailable = Platform.OS === 'ios' || Platform.OS === 'android';

export const triggerLightHaptic = async () => {
  if (!isHapticsAvailable) return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Ignore on unsupported hardware/simulators
  }
};

export const triggerSliceHaptic = async () => {
  if (!isHapticsAvailable) return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    // Ignore on unsupported hardware/simulators
  }
};

export const triggerPerfectHaptic = async (comboCount = 1) => {
  if (!isHapticsAvailable) return;
  try {
    if (comboCount >= 3) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  } catch {
    // Ignore on unsupported hardware/simulators
  }
};

export const triggerSpeedUpHaptic = async () => {
  if (!isHapticsAvailable) return;
  try {
    await Haptics.selectionAsync();
  } catch {
    // Ignore on unsupported hardware/simulators
  }
};

export const triggerGameOverHaptic = async () => {
  if (!isHapticsAvailable) return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {
    // Ignore on unsupported hardware/simulators
  }
};
