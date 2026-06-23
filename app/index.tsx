import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Colors, Spacing, FontSizes } from '@/lib/theme';

export default function Index() {
  const { user, loading, userRole } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/(auth)/role-selection');
    } else if (userRole === 'teacher') {
      router.replace('/(teacher)');
    } else {
      router.replace('/(student)');
    }
  }, [loading, user, userRole]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary[600]} />
      <Text style={styles.loadingText}>Loading SwarLekh...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    padding: Spacing.lg,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text.secondary,
  },
});
