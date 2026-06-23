import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SwarlekhButton } from '@/components/ui/SwarlekhButton';
import { Colors, Spacing, FontSizes } from '@/lib/theme';

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>404</Text>
      <Text style={styles.subtitle}>Page Not Found</Text>
      <Text style={styles.description}>
        The page you're looking for doesn't exist or has been moved.
      </Text>
      <SwarlekhButton
        title="Go Home"
        onPress={() => router.replace('/')}
        variant="primary"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.background.primary,
  },
  title: {
    fontSize: 80,
    fontWeight: '700',
    color: Colors.primary[600],
  },
  subtitle: {
    fontSize: FontSizes.xxl,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: Spacing.md,
  },
  description: {
    fontSize: FontSizes.md,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
});
