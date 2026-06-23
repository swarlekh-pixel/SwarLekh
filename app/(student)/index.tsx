/**
 * Student Dashboard Screen
 *
 * Students can:
 * - Enter exam code to join an exam
 * - View their recent submissions
 * - See how the voice exam system works
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import {
  User,
  Hash,
  Mic,
  Calendar,
  BookOpen,
  Info,
  LogOut,
  ArrowRight,
  Check,
  Edit3,
  FileText,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, FontSizes } from '@/lib/theme';
import { SwarlekhButton } from '@/components/ui/SwarlekhButton';
import { SwarlekhInput } from '@/components/ui/SwarlekhInput';
import { SwarlekhCard } from '@/components/ui/SwarlekhCard';
import { useAuth } from '@/context/AuthContext';
import {
  apiGetExamByCode,
  apiGetExam,
  apiMySubmissions,
  ApiExam,
  ApiSubmission,
} from '@/lib/api';

/* =============================================================================
 * Types
 * ============================================================================= */

interface SubmissionWithExam extends ApiSubmission {
  exam: ApiExam;
}

/* =============================================================================
 * Component
 * ============================================================================= */

export default function StudentDashboard() {
  const { user, signOut } = useAuth();
  const [examCode, setExamCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionWithExam[]>([]);
  const [loading, setLoading] = useState(true);

  /* ----------------- Data Fetching ----------------- */

  useEffect(() => { fetchSubmissions(); }, [user]);

  const fetchSubmissions = async () => {
    if (!user) return;
    const { submissions: data } = await apiMySubmissions();
    if (data) {
      const mapped = await Promise.all(
        data.map(async (sub) => {
          const { exam } = await apiGetExam(sub.exam_id);
          return { ...sub, exam: exam || ({ subject: 'Unknown' } as ApiExam) };
        })
      );
      setSubmissions(mapped);
    }
    setLoading(false);
  };

  /* ----------------- Handlers ----------------- */

  const handleJoinExam = async () => {
    if (!examCode.trim()) {
      setError('Please enter an exam code');
      return;
    }

    setError(null);
    setJoining(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Find exam by code
    const { exam, error: examError } = await apiGetExamByCode(examCode.toUpperCase().trim());
    if (examError || !exam) {
      setError('Invalid exam code or exam is not active');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setJoining(false);
      return;
    }

    // Check if already submitted
    const { submissions: data } = await apiMySubmissions();
    const existing = data?.find(s => s.exam_id === exam.id);
    if (existing) {
      setError('You have already submitted this exam');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setJoining(false);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push(`/(student)/exam/${exam.id}`);
    setJoining(false);
  };

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await signOut();
    router.replace('/(auth)/role-selection');
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const getStatusColor = (status: string) => {
    if (status === 'submitted') return Colors.success;
    if (status === 'graded') return Colors.primary;
    return Colors.neutral;
  };

  /* ----------------- Render ----------------- */

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary[600]} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.userInfo}>
              <User size={32} color={Colors.primary[600]} />
              <View style={styles.userText}>
                <Text style={styles.greeting}>Welcome,</Text>
                <Text style={styles.userName}>{user?.name}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={handleSignOut}
              accessibilityLabel="Sign out"
            >
              <LogOut size={22} color={Colors.text.secondary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.rollText}>Roll No: {user?.roll_number}</Text>
        </View>

        {/* Join Exam Card */}
        <SwarlekhCard variant="primary" style={styles.joinCard}>
          <View style={styles.joinHeader}>
            <Mic size={24} color={Colors.primary[600]} />
            <Text style={styles.joinTitle}>Join an Exam</Text>
          </View>
          <Text style={styles.joinText}>
            Enter the exam code from your teacher to start your voice exam.
          </Text>

          <SwarlekhInput
            placeholder="Exam code (e.g., A1B2C3)"
            value={examCode}
            onChangeText={text => { setExamCode(text.toUpperCase()); setError(null); }}
            autoCapitalize="characters"
            leftIcon={<Hash size={20} color={Colors.text.tertiary} />}
            error={error || undefined}
          />

          <SwarlekhButton
            title="Join Exam"
            onPress={handleJoinExam}
            loading={joining}
            disabled={!examCode.trim()}
            variant="primary"
            size="lg"
            fullWidth
            rightIcon={<ArrowRight size={20} color={Colors.neutral[0]} />}
          />
        </SwarlekhCard>

        {/* How It Works */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Info size={20} color={Colors.primary[600]} />
            <Text style={styles.sectionTitle}>How It Works</Text>
          </View>

          <View style={styles.stepsBox}>
            <View style={styles.step}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
              <Text style={styles.stepDesc}>Enter exam code from teacher</Text>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
              <Text style={styles.stepDesc}>Tap mic to speak your answer</Text>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
              <Text style={styles.stepDesc}>Edit or strike-through words</Text>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>4</Text></View>
              <Text style={styles.stepDesc}>Submit for answer sheet PDF</Text>
            </View>
          </View>
        </View>

        {/* Recent Submissions */}
        {submissions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <FileText size={20} color={Colors.primary[600]} />
              <Text style={styles.sectionTitle}>Recent Submissions</Text>
            </View>

            {submissions.map(sub => (
              <SwarlekhCard key={sub.id} style={styles.subCard}>
                <View style={styles.subRow}>
                  <View style={styles.subInfo}>
                    <Text style={styles.subSubject}>{sub.exam.subject}</Text>
                    <View style={styles.subMeta}>
                      <Calendar size={14} color={Colors.text.secondary} />
                      <Text style={styles.subDate}>{formatDate(sub.submitted_at)}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(sub.status)[100] }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(sub.status)[700] }]}>
                      {sub.status}
                    </Text>
                  </View>
                </View>
              </SwarlekhCard>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* =============================================================================
 * Styles
 * ============================================================================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.background.primary,
  },
  scrollContent: { paddingBottom: Spacing.xxl },

  // Header
  header: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg, paddingBottom: Spacing.lg,
    borderBottomWidth: 1, borderBottomColor: Colors.neutral[200],
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  userText: { marginLeft: Spacing.md },
  greeting: { fontSize: FontSizes.sm, color: Colors.text.secondary },
  userName: { fontSize: FontSizes.xl, fontWeight: '600', color: Colors.text.primary },
  rollText: { fontSize: FontSizes.sm, color: Colors.text.tertiary, marginTop: Spacing.sm },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.neutral[100], alignItems: 'center', justifyContent: 'center',
  },

  // Join Card
  joinCard: { margin: Spacing.lg },
  joinHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  joinTitle: {
    fontSize: FontSizes.xl, fontWeight: '600',
    color: Colors.primary[700], marginLeft: Spacing.sm,
  },
  joinText: {
    fontSize: FontSizes.md, color: Colors.text.secondary,
    marginBottom: Spacing.lg, lineHeight: 22,
  },

  // Section
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: {
    fontSize: FontSizes.lg, fontWeight: '600',
    color: Colors.text.primary, marginLeft: Spacing.sm,
  },

  // Steps
  stepsBox: {
    backgroundColor: Colors.neutral[0],
    borderRadius: BorderRadius.lg, padding: Spacing.lg,
  },
  step: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  stepNum: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.primary[100], alignItems: 'center', justifyContent: 'center',
    marginRight: Spacing.md,
  },
  stepNumText: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.primary[700] },
  stepDesc: { flex: 1, fontSize: FontSizes.md, color: Colors.text.primary, lineHeight: 22 },

  // Submissions
  subCard: { marginBottom: Spacing.sm },
  subRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subInfo: { flex: 1 },
  subSubject: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text.primary },
  subMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  subDate: { fontSize: FontSizes.sm, color: Colors.text.secondary, marginLeft: 4 },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  statusText: { fontSize: FontSizes.xs, fontWeight: '600', textTransform: 'capitalize' },
});
