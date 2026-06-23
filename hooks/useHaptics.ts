import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export const HapticPatterns = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
  soft: Haptics.ImpactFeedbackStyle.Soft,
  rigid: Haptics.ImpactFeedbackStyle.Rigid,
};

export const useHaptics = () => {
  const impact = async (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(style);
    }
  };

  const notification = async (type: Haptics.NotificationFeedbackType) => {
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(type);
    }
  };

  const selection = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.selectionAsync();
    }
  };

  const success = () => notification(Haptics.NotificationFeedbackType.Success);
  const warning = () => notification(Haptics.NotificationFeedbackType.Warning);
  const error = () => notification(Haptics.NotificationFeedbackType.Error);

  return {
    impact,
    notification,
    selection,
    success,
    warning,
    error,
    patterns: HapticPatterns,
  };
};

export const AccessibilityConstants = {
  touchTarget: {
    min: 44,
    recommended: 48,
  },
  contrast: {
    aa: 4.5,
    aaa: 7,
    largeText: 3,
  },
  animations: {
    defaultDuration: 250,
    entrance: 300,
    modal: 200,
  },
  fontScales: {
    small: 0.85,
    normal: 1,
    large: 1.15,
    extraLarge: 1.35,
  },
};
