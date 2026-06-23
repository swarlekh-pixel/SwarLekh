import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Spacing, BorderRadius, FontSizes } from '@/lib/theme';

interface SwarlekhCardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  style?: ViewStyle;
  onPress?: () => void;
  accessibilityLabel?: string;
}

const getVariantStyles = (variant: string): ViewStyle => {
  switch (variant) {
    case 'primary':
      return {
        backgroundColor: Colors.primary[50],
        borderColor: Colors.primary[200],
      };
    case 'success':
      return {
        backgroundColor: Colors.success[50],
        borderColor: Colors.success[200],
      };
    case 'warning':
      return {
        backgroundColor: Colors.warning[50],
        borderColor: Colors.warning[200],
      };
    case 'error':
      return {
        backgroundColor: Colors.error[50],
        borderColor: Colors.error[200],
      };
    default:
      return {
        backgroundColor: Colors.neutral[0],
        borderColor: Colors.neutral[200],
      };
  }
};

const getTitleColor = (variant: string): string => {
  switch (variant) {
    case 'primary':
      return Colors.primary[700];
    case 'success':
      return Colors.success[700];
    case 'warning':
      return Colors.warning[700];
    case 'error':
      return Colors.error[700];
    default:
      return Colors.text.primary;
  }
};

export function SwarlekhCard({
  title,
  subtitle,
  children,
  variant = 'default',
  style,
  accessibilityLabel,
}: SwarlekhCardProps) {
  const variantStyles = getVariantStyles(variant);
  const titleColor = getTitleColor(variant);

  return (
    <View
      style={[styles.card, variantStyles, style]}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
    >
      {title && <Text style={[styles.title, { color: titleColor }]}>{title}</Text>}
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSizes.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
});
