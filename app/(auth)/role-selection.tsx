/**
 * Role Selection Screen
 *
 * Landing page where users choose:
 * - Teacher: create exams, review submissions
 * - Student: join exams via code, answer by voice
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { User, BookOpen, Mic, CheckCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, FontSizes } from '@/lib/theme';
import { SwarlekhButton } from '@/components/ui/SwarlekhButton';
import { LinearGradient } from 'expo-linear-gradient';

/* =============================================================================
 * Component
 * ============================================================================= */

export default function RoleSelectionScreen() {
  const [selectedRole, setSelectedRole] = useState<'teacher' | 'student' | null>(null);

  const handleContinue = () => {
    if (!selectedRole) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push(selectedRole === 'teacher' ? '/(auth)/teacher-auth' : '/(auth)/student-auth');
  };

  /* ----------------- Render ----------------- */

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <LinearGradient
          colors={[Colors.primary[600], Colors.primary[700]]}
          style={styles.hero}
        >
          <Mic size={48} color={Colors.neutral[0]} />
          <Text style={styles.appName}>SwarLekh</Text>
          <Text style={styles.appTagline}>Voice. Script. Accessibility.</Text>
        </LinearGradient>

        {/* Welcome */}
        <View style={styles.welcome}>
          <Text style={styles.welcomeTitle}>Welcome!</Text>
          <Text style={styles.welcomeText}>
            SwarLekh is an accessible exam platform. Students answer by voice.
            Choose your role to continue.
          </Text>
        </View>

        {/* Role Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>I am a...</Text>

          {/* Teacher Card */}
          <TouchableOpacity
            style={[styles.roleCard, selectedRole === 'teacher' && styles.roleCardActive]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setSelectedRole('teacher'); }}
            accessibilityRole="radio"
            accessibilityState={{ selected: selectedRole === 'teacher' }}
          >
            <View style={[styles.roleIcon, selectedRole === 'teacher' && styles.roleIconActive]}>
              <BookOpen size={28} color={selectedRole === 'teacher' ? Colors.neutral[0] : Colors.primary[600]} />
            </View>
            <View style={styles.roleInfo}>
              <Text style={[styles.roleTitle, selectedRole === 'teacher' && styles.roleTitleActive]}>
                Teacher
              </Text>
              <Text style={styles.roleDesc}>Create exams and review submissions</Text>
              {selectedRole === 'teacher' && (
                <View style={styles.checkBadge}>
                  <CheckCircle size={16} color={Colors.success[600]} />
                  <Text style={styles.checkText}>Selected</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Student Card */}
          <TouchableOpacity
            style={[styles.roleCard, selectedRole === 'student' && styles.roleCardActiveStudent]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setSelectedRole('student'); }}
            accessibilityRole="radio"
            accessibilityState={{ selected: selectedRole === 'student' }}
          >
            <View style={[styles.roleIconStudent, selectedRole === 'student' && styles.roleIconActiveStudent]}>
              <User size={28} color={selectedRole === 'student' ? Colors.neutral[0] : Colors.secondary[600]} />
            </View>
            <View style={styles.roleInfo}>
              <Text style={[styles.roleTitle, selectedRole === 'student' && styles.roleTitleActiveStudent]}>
                Student
              </Text>
              <Text style={styles.roleDesc}>Join exams and answer by voice</Text>
              {selectedRole === 'student' && (
                <View style={styles.checkBadge}>
                  <CheckCircle size={16} color={Colors.success[600]} />
                  <Text style={styles.checkText}>Selected</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Continue Button */}
        <View style={styles.buttonArea}>
          <SwarlekhButton
            title="Continue"
            onPress={handleContinue}
            disabled={!selectedRole}
            variant="primary"
            size="lg"
            fullWidth
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* =============================================================================
 * Styles
 * ============================================================================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  scrollContent: { paddingBottom: Spacing.xxl },

  // Hero
  hero: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  appName: {
    fontSize: FontSizes.display, fontWeight: '700',
    color: Colors.neutral[0], marginTop: Spacing.md,
  },
  appTagline: {
    fontSize: FontSizes.md, color: Colors.neutral[0],
    marginTop: Spacing.xs, opacity: 0.9,
  },

  // Welcome
  welcome: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl },
  welcomeTitle: { fontSize: FontSizes.xxl, fontWeight: '600', color: Colors.text.primary },
  welcomeText: {
    fontSize: FontSizes.md, color: Colors.text.secondary,
    marginTop: Spacing.sm, lineHeight: 24,
  },

  // Section
  section: { paddingHorizontal: Spacing.lg, marginTop: Spacing.xl },
  sectionTitle: {
    fontSize: FontSizes.lg, fontWeight: '600',
    color: Colors.text.primary, marginBottom: Spacing.md,
  },

  // Role Card
  roleCard: {
    backgroundColor: Colors.neutral[0],
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.neutral[200],
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleCardActive: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  roleCardActiveStudent: {
    borderColor: Colors.secondary[500],
    backgroundColor: Colors.secondary[50],
  },
  roleIcon: {
    width: 56, height: 56, borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary[100],
    alignItems: 'center', justifyContent: 'center',
    marginRight: Spacing.md,
  },
  roleIconActive: { backgroundColor: Colors.primary[600] },
  roleIconStudent: {
    width: 56, height: 56, borderRadius: BorderRadius.md,
    backgroundColor: Colors.secondary[100],
    alignItems: 'center', justifyContent: 'center',
    marginRight: Spacing.md,
  },
  roleIconActiveStudent: { backgroundColor: Colors.secondary[600] },
  roleInfo: { flex: 1 },
  roleTitle: { fontSize: FontSizes.xl, fontWeight: '600', color: Colors.text.primary },
  roleTitleActive: { color: Colors.primary[700] },
  roleTitleActiveStudent: { color: Colors.secondary[700] },
  roleDesc: {
    fontSize: FontSizes.sm, color: Colors.text.secondary,
    marginTop: 2, lineHeight: 20,
  },
  checkBadge: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: Spacing.sm, gap: 4,
  },
  checkText: { fontSize: FontSizes.sm, fontWeight: '500', color: Colors.success[600] },

  buttonArea: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
});
