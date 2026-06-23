/**
 * Create Exam Screen
 *
 * Teachers can create new exams by filling:
 * - Subject name (required)
 * - Description (optional)
 * - Exam date (required)
 * - Total marks (required)
 * - Time limit (optional)
 *
 * After creation, redirects to add questions screen.
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
import { ArrowLeft, Calendar, Clock, Award, FileText } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, FontSizes } from '@/lib/theme';
import { SwarlekhButton } from '@/components/ui/SwarlekhButton';
import { SwarlekhInput } from '@/components/ui/SwarlekhInput';
import { SwarlekhCard } from '@/components/ui/SwarlekhCard';
import { useAuth } from '@/context/AuthContext';
import { apiCreateExam } from '@/lib/api';

/* =============================================================================
 * Component
 * ============================================================================= */

export default function CreateExamScreen() {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [examDate, setExamDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [totalMarks, setTotalMarks] = useState('');
  const [timeLimit, setTimeLimit] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ----------------- Handlers ----------------- */

  const handleCreate = async () => {
    if (!user || !subject || !totalMarks) {
      setError('Please fill in all required fields');
      return;
    }

    setError(null);
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { exam, error: insertError } = await apiCreateExam({
        subject,
        description: description || undefined,
        exam_date: examDate,
        total_marks: parseInt(totalMarks, 10),
        time_limit_minutes: timeLimit ? parseInt(timeLimit, 10) : undefined,
      });

      if (insertError) throw insertError;

      if (exam) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace(`/(teacher)/exam/${exam.id}?tab=questions`);
      }
    } catch {
      setError('Failed to create exam. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  /* ----------------- Render ----------------- */

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={24} color={Colors.text.primary} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create New Exam</Text>
            <Text style={styles.subtitle}>
              Fill in the details. You can add questions after.
            </Text>
          </View>

          {/* Form Sections */}
          <View style={styles.form}>
            {/* Basic Info */}
            <SwarlekhCard variant="primary" style={styles.card}>
              <View style={styles.cardHeader}>
                <FileText size={20} color={Colors.primary[600]} />
                <Text style={styles.cardTitle}>Basic Information</Text>
              </View>

              <SwarlekhInput
                label="Subject *"
                placeholder="e.g., Mathematics"
                value={subject}
                onChangeText={setSubject}
              />

              <SwarlekhInput
                label="Description (Optional)"
                placeholder="Brief description"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </SwarlekhCard>

            {/* Schedule */}
            <SwarlekhCard style={styles.card}>
              <View style={styles.cardHeader}>
                <Calendar size={20} color={Colors.primary[600]} />
                <Text style={styles.cardTitle}>Schedule</Text>
              </View>

              <SwarlekhInput
                label="Exam Date *"
                placeholder="YYYY-MM-DD"
                value={examDate}
                onChangeText={setExamDate}
                helperText="Format: YYYY-MM-DD"
              />
            </SwarlekhCard>

            {/* Scoring */}
            <SwarlekhCard style={styles.card}>
              <View style={styles.cardHeader}>
                <Award size={20} color={Colors.primary[600]} />
                <Text style={styles.cardTitle}>Scoring</Text>
              </View>

              <SwarlekhInput
                label="Total Marks *"
                placeholder="e.g., 100"
                value={totalMarks}
                onChangeText={setTotalMarks}
                keyboardType="numeric"
              />

              <SwarlekhInput
                label="Time Limit (Optional)"
                placeholder="e.g., 60"
                value={timeLimit}
                onChangeText={setTimeLimit}
                keyboardType="numeric"
                leftIcon={<Clock size={20} color={Colors.text.tertiary} />}
                helperText="Minutes. Leave empty for no limit"
              />
            </SwarlekhCard>

            {/* Error Message */}
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>

          {/* Submit Button */}
          <SwarlekhButton
            title="Create Exam"
            onPress={handleCreate}
            loading={loading}
            disabled={!subject || !totalMarks}
            variant="primary"
            size="lg"
            fullWidth
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* =============================================================================
 * Styles
 * ============================================================================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  flex: { flex: 1 },

  scrollContent: {
    flexGrow: 1,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },

  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.neutral[0],
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },

  header: { marginBottom: Spacing.lg },
  title: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.text.primary },
  subtitle: {
    fontSize: FontSizes.md, color: Colors.text.secondary,
    marginTop: Spacing.sm, lineHeight: 22,
  },

  form: { marginBottom: Spacing.lg },
  card: { marginBottom: Spacing.md },

  cardHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: FontSizes.md, fontWeight: '600',
    color: Colors.text.primary, marginLeft: Spacing.sm,
  },

  errorBox: {
    backgroundColor: Colors.error[50],
    padding: Spacing.md, borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  errorText: {
    color: Colors.error[700], fontSize: FontSizes.sm,
    textAlign: 'center',
  },
});
