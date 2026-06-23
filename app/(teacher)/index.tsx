/**
 * Teacher Dashboard Screen
 *
 * Displays all exams created by the teacher with:
 * - Exam details (subject, date, status, marks, submissions)
 * - Copyable exam codes to share with students
 * - Quick access to create new exams
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import {
  Plus,
  BookOpen,
  Calendar,
  Users,
  Hash,
  LogOut,
  Copy,
  CheckCircle,
  Clock,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, FontSizes } from '@/lib/theme';
import { SwarlekhButton } from '@/components/ui/SwarlekhButton';
import { SwarlekhCard } from '@/components/ui/SwarlekhCard';
import { useAuth } from '@/context/AuthContext';
import { apiListExams, ApiExam } from '@/lib/api';

/* =============================================================================
 * Types
 * ============================================================================= */

interface ExamWithStats extends ApiExam {
  submission_count: number;
}

/* =============================================================================
 * Component
 * ============================================================================= */

export default function TeacherDashboard() {
  const { user, signOut } = useAuth();
  const [exams, setExams] = useState<ExamWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  /* ----------------- Data Fetching ----------------- */

  const fetchExams = useCallback(async () => {
    if (!user) return;
    const { exams: data, error } = await apiListExams();
    if (!error && data) {
      setExams(data.map((e: any) => ({ ...e, submission_count: e.submission_count || 0 })));
    }
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => { fetchExams(); }, [fetchExams]);

  const onRefresh = () => { setRefreshing(true); fetchExams(); };

  /* ----------------- Handlers ----------------- */

  const handleCopyCode = (code: string) => {
    setCopiedCode(code);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreateExam = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(teacher)/create-exam');
  };

  const handleViewExam = (examId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(teacher)/exam/${examId}`);
  };

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await signOut();
    router.replace('/(auth)/role-selection');
  };

  /* ----------------- Helpers ----------------- */

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return Colors.warning;
      case 'active': return Colors.success;
      default: return Colors.neutral;
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  /* ----------------- Render Item ----------------- */

  const renderExam = ({ item }: { item: ExamWithStats }) => {
    const color = getStatusColor(item.status);
    return (
      <TouchableOpacity
        onPress={() => handleViewExam(item.id)}
        accessibilityLabel={`${item.subject} exam, ${item.status}`}
      >
        <SwarlekhCard style={styles.card}>
          {/* Header Row */}
          <View style={styles.cardHeader}>
            <View style={styles.iconBox}>
              <BookOpen size={24} color={Colors.primary[600]} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.subject}>{item.subject}</Text>
              <View style={styles.metaRow}>
                <Calendar size={14} color={Colors.text.secondary} />
                <Text style={styles.metaText}>{formatDate(item.exam_date)}</Text>
              </View>
            </View>
            <View style={[styles.badge, { backgroundColor: color[100] }]}>
              <Text style={[styles.badgeText, { color: color[700] }]}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
          </View>

          {/* Description */}
          {item.description && (
            <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
          )}

          {/* Footer: Stats + Code */}
          <View style={styles.cardFooter}>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Hash size={16} color={Colors.text.secondary} />
                <Text style={styles.statText}>{item.total_marks} marks</Text>
              </View>
              <View style={styles.stat}>
                <Users size={16} color={Colors.text.secondary} />
                <Text style={styles.statText}>{item.submission_count}</Text>
              </View>
              {item.time_limit_minutes && (
                <View style={styles.stat}>
                  <Clock size={16} color={Colors.text.secondary} />
                  <Text style={styles.statText}>{item.time_limit_minutes}m</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.codeBox}
              onPress={() => handleCopyCode(item.exam_code)}
              accessibilityLabel={`Code: ${item.exam_code}. Tap to copy.`}
            >
              {copiedCode === item.exam_code
                ? <CheckCircle size={18} color={Colors.success[500]} />
                : <Copy size={18} color={Colors.text.tertiary} />}
              <Text style={styles.codeText}>{item.exam_code}</Text>
            </TouchableOpacity>
          </View>
        </SwarlekhCard>
      </TouchableOpacity>
    );
  };

  /* ----------------- Render ----------------- */

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary[600]} />
        <Text style={styles.loadingText}>Loading exams...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Welcome,</Text>
            <Text style={styles.userName}>{user?.name || 'Teacher'}</Text>
          </View>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={handleSignOut}
            accessibilityLabel="Sign out"
          >
            <LogOut size={22} color={Colors.text.secondary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSub}>{exams.length} exam{exams.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Exam List */}
      <FlatList
        data={exams}
        keyExtractor={(item) => item.id}
        renderItem={renderExam}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <BookOpen size={64} color={Colors.neutral[300]} />
            <Text style={styles.emptyTitle}>No exams yet</Text>
            <Text style={styles.emptyText}>
              Create your first exam. Students can join using the unique exam code.
            </Text>
            <SwarlekhButton
              title="Create First Exam"
              onPress={handleCreateExam}
              variant="primary"
              size="lg"
            />
          </View>
        }
      />

      {/* FAB */}
      {exams.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleCreateExam}
          accessibilityLabel="Create exam"
        >
          <Plus size={28} color={Colors.neutral[0]} />
        </TouchableOpacity>
      )}
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
  loadingText: { marginTop: Spacing.md, fontSize: FontSizes.md, color: Colors.text.secondary },

  header: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontSize: FontSizes.md, color: Colors.text.secondary },
  userName: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.text.primary, marginTop: 2 },
  headerSub: { fontSize: FontSizes.sm, color: Colors.text.tertiary, marginTop: Spacing.xs },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.neutral[100], alignItems: 'center', justifyContent: 'center',
  },

  listContent: { padding: Spacing.lg, paddingBottom: 100 },

  card: { marginBottom: Spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconBox: {
    width: 48, height: 48, borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary[50], alignItems: 'center', justifyContent: 'center',
    marginRight: Spacing.md,
  },
  cardInfo: { flex: 1 },
  subject: { fontSize: FontSizes.lg, fontWeight: '600', color: Colors.text.primary },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  metaText: { fontSize: FontSizes.sm, color: Colors.text.secondary, marginLeft: 4 },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  badgeText: { fontSize: FontSizes.xs, fontWeight: '600' },

  description: {
    fontSize: FontSizes.sm, color: Colors.text.secondary,
    marginTop: Spacing.md, lineHeight: 20,
  },

  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: Spacing.md, paddingTop: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.neutral[200],
  },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  stat: { flexDirection: 'row', alignItems: 'center' },
  statText: { fontSize: FontSizes.sm, color: Colors.text.secondary, marginLeft: 4 },

  codeBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.neutral[100],
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  codeText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.primary[600] },

  fab: {
    position: 'absolute', right: Spacing.lg, bottom: Spacing.lg,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary[600], alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 8,
  },

  emptyState: { alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xxl },
  emptyTitle: { fontSize: FontSizes.xl, fontWeight: '600', color: Colors.text.primary, marginTop: Spacing.lg },
  emptyText: { fontSize: FontSizes.md, color: Colors.text.secondary, textAlign: 'center', marginTop: Spacing.sm, marginBottom: Spacing.lg, lineHeight: 22 },
});
