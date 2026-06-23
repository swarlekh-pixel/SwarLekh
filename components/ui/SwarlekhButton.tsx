import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, FontSizes } from '@/lib/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface SwarlekhButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const getVariantStyles = (variant: ButtonVariant): ViewStyle => {
  switch (variant) {
    case 'primary':
      return {
        backgroundColor: Colors.primary[600],
        borderColor: Colors.primary[600],
      };
    case 'secondary':
      return {
        backgroundColor: Colors.secondary[500],
        borderColor: Colors.secondary[500],
      };
    case 'outline':
      return {
        backgroundColor: 'transparent',
        borderColor: Colors.primary[600],
        borderWidth: 2,
      };
    case 'ghost':
      return {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
      };
    case 'danger':
      return {
        backgroundColor: Colors.error[500],
        borderColor: Colors.error[500],
      };
  }
};

const getTextColor = (variant: ButtonVariant): string => {
  switch (variant) {
    case 'primary':
    case 'secondary':
    case 'danger':
      return Colors.neutral[0];
    case 'outline':
      return Colors.primary[600];
    case 'ghost':
      return Colors.primary[600];
  }
};

const getSizeStyles = (size: ButtonSize): ViewStyle => {
  switch (size) {
    case 'sm':
      return { paddingVertical: 10, paddingHorizontal: 16 };
    case 'md':
      return { paddingVertical: 14, paddingHorizontal: 24 };
    case 'lg':
      return { paddingVertical: 18, paddingHorizontal: 32 };
  }
};

const getTextSize = (size: ButtonSize): number => {
  switch (size) {
    case 'sm':
      return FontSizes.sm;
    case 'md':
      return FontSizes.md;
    case 'lg':
      return FontSizes.lg;
  }
};

export function SwarlekhButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
}: SwarlekhButtonProps) {
  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const variantStyles = getVariantStyles(variant);
  const textColor = getTextColor(variant);
  const sizeStyles = getSizeStyles(size);
  const fontSize = getTextSize(size);

  const disabledStyles = disabled || loading ? { opacity: 0.6 } : {};

  const combinedStyles: ViewStyle = {
    ...styles.base,
    ...variantStyles,
    ...sizeStyles,
    ...disabledStyles,
    ...(fullWidth && styles.fullWidth),
  };

  const combinedTextStyle: TextStyle = {
    color: textColor,
    fontSize,
    ...(variant === 'outline' && !disabled && { color: Colors.primary[600] }),
    ...textStyle,
  };

  return (
    <TouchableOpacity
      style={[combinedStyles, style]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      accessible={true}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.content}>
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
          <Text style={[styles.text, combinedTextStyle]}>{title}</Text>
          {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  iconLeft: {
    marginRight: Spacing.sm,
  },
  iconRight: {
    marginLeft: Spacing.sm,
  },
});
