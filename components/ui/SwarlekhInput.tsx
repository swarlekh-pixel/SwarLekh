import React, { useState } from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps as RNTextInputProps,
  TouchableOpacity,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, FontSizes } from '@/lib/theme';

interface SwarlekhInputProps extends Omit<RNTextInputProps, 'style'> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'default' | 'filled';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
}

export function SwarlekhInput({
  label,
  error,
  helperText,
  variant = 'default',
  leftIcon,
  rightIcon,
  containerStyle,
  inputStyle,
  secureTextEntry,
  ...props
}: SwarlekhInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const getBorderColor = () => {
    if (error) return Colors.error[500];
    if (isFocused) return Colors.primary[500];
    return Colors.neutral[300];
  };

  const getBackgroundColor = () => {
    return variant === 'filled' ? Colors.neutral[100] : Colors.neutral[0];
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label} accessibilityRole="text">
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputContainer,
          {
            borderColor: getBorderColor(),
            backgroundColor: getBackgroundColor(),
          },
        ]}
      >
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
        <RNTextInput
          style={[styles.input, inputStyle]}
          placeholderTextColor={Colors.text.tertiary}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={secureTextEntry && !showPassword}
          accessible={true}
          accessibilityLabel={props.placeholder || label}
          {...props}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.passwordToggle}
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            accessibilityRole="button"
          >
            {showPassword ? (
              <EyeOff size={20} color={Colors.text.secondary} />
            ) : (
              <Eye size={20} color={Colors.text.secondary} />
            )}
          </TouchableOpacity>
        )}
        {rightIcon && !secureTextEntry && (
          <View style={styles.iconRight}>{rightIcon}</View>
        )}
      </View>
      {error && (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      )}
      {helperText && !error && (
        <Text style={styles.helperText}>{helperText}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    minHeight: 48,
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text.primary,
    paddingVertical: Spacing.sm,
  },
  iconLeft: {
    paddingLeft: Spacing.md,
  },
  iconRight: {
    paddingRight: Spacing.md,
  },
  passwordToggle: {
    paddingHorizontal: Spacing.md,
  },
  error: {
    fontSize: FontSizes.sm,
    color: Colors.error[500],
    marginTop: Spacing.xs,
  },
  helperText: {
    fontSize: FontSizes.sm,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
});
