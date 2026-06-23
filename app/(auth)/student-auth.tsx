/**
 * Student Authentication Screen
 *
 * Handles sign in and sign up for students:
 * - Email/password authentication
 * - Roll number (required for signup, identifies student in exams)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Lock, User, Hash, Mail } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, FontSizes } from '@/lib/theme';
import { SwarlekhButton } from '@/components/ui/SwarlekhButton';
import { SwarlekhInput } from '@/components/ui/SwarlekhInput';
import { useAuth } from '@/context/AuthContext';

/* =============================================================================
 * Component
 * ============================================================================= */

export default function StudentAuthScreen() {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ----------------- Handlers ----------------- */

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (isLogin) {
        // Sign in existing student
        const { error: err } = await signIn(email, password);
        if (err) {
          setError(err.message || 'Failed to sign in');
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace('/(student)');
        }
      } else {
        // Sign up new student
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        if (!rollNumber.trim()) {
          setError('Roll number is required');
          setLoading(false);
          return;
        }

        const { error: err } = await signUp(email, password, name, 'student', rollNumber);
        if (err) {
          setError(err.message || 'Failed to create account');
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace('/(student)');
        }
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  /* ----------------- Render ----------------- */

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Back Button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityLabel="Go back">
            <ArrowLeft size={24} color={Colors.text.primary} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconBox}>
              <User size={32} color={Colors.neutral[0]} />
            </View>
            <Text style={styles.title}>
              {isLogin ? 'Welcome Back' : 'Student Registration'}
            </Text>
            <Text style={styles.subtitle}>
              {isLogin ? 'Sign in to join exams' : 'Create account to access exams'}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Signup-only fields */}
            {!isLogin && (
              <>
                <SwarlekhInput
                  label="Full Name"
                  placeholder="Your name"
                  value={name}
                  onChangeText={setName}
                  leftIcon={<User size={20} color={Colors.text.tertiary} />}
                  autoCapitalize="words"
                />
                <SwarlekhInput
                  label="Roll Number"
                  placeholder="e.g., 2024001"
                  value={rollNumber}
                  onChangeText={setRollNumber}
                  leftIcon={<Hash size={20} color={Colors.text.tertiary} />}
                  helperText="Identifies you in exams"
                />
              </>
            )}

            {/* Common fields */}
            <SwarlekhInput
              label="Email"
              placeholder="student@school.edu"
              value={email}
              onChangeText={text => setEmail(text.trim())}
              leftIcon={<Mail size={20} color={Colors.text.tertiary} />}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <SwarlekhInput
              label="Password"
              placeholder="Enter password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              leftIcon={<Lock size={20} color={Colors.text.tertiary} />}
            />

            {!isLogin && (
              <SwarlekhInput
                label="Confirm Password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                leftIcon={<Lock size={20} color={Colors.text.tertiary} />}
              />
            )}

            {/* Error */}
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>

          {/* Submit Button */}
          <SwarlekhButton
            title={isLogin ? 'Sign In' : 'Create Account'}
            onPress={handleSubmit}
            loading={loading}
            disabled={!email || !password || (!isLogin && (!name || !confirmPassword || !rollNumber))}
            variant="primary"
            size="lg"
            fullWidth
          />

          {/* Toggle Mode */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleText}>
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
            </Text>
            <TouchableOpacity onPress={toggleMode}>
              <Text style={styles.toggleLink}>{isLogin ? 'Sign Up' : 'Sign In'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* =============================================================================
 * Styles
 * ============================================================================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  flex: { flex: 1 },

  scrollContent: { flexGrow: 1, padding: Spacing.lg },

  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.neutral[100],
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.lg,
  },

  header: { marginBottom: Spacing.xl },
  iconBox: {
    width: 64, height: 64, borderRadius: BorderRadius.lg,
    backgroundColor: Colors.secondary[600],
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: { fontSize: FontSizes.xxxl, fontWeight: '700', color: Colors.text.primary },
  subtitle: {
    fontSize: FontSizes.md, color: Colors.text.secondary,
    marginTop: Spacing.sm, lineHeight: 22,
  },

  form: { marginBottom: Spacing.lg },
  errorBox: {
    backgroundColor: Colors.error[50],
    padding: Spacing.md, borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  errorText: { color: Colors.error[700], fontSize: FontSizes.sm, textAlign: 'center' },

  toggleRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: Spacing.lg },
  toggleText: { fontSize: FontSizes.md, color: Colors.text.secondary },
  toggleLink: {
    fontSize: FontSizes.md, fontWeight: '600',
    color: Colors.primary[600], marginLeft: Spacing.xs,
  },
});
