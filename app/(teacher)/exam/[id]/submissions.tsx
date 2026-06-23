import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, FileText, Calendar, Hash, Download, Eye, Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, FontSizes } from '@/lib/theme';
import { SwarlekhButton } from '@/components/ui/SwarlekhButton';
import { SwarlekhCard } from '@/components/ui/SwarlekhCard';
import { useAuth } from '@/context/AuthContext';
import {
  apiGetExam,
  apiListSubmissions,
  apiGeneratePDF,
  ApiExam,
  ApiSubmission,
} from '@/lib/api';

// ✅ Extended submission with student info (now comes from backend)
interface SubmissionWithStudent extends ApiSubmission {
  student_name: string;
  student_roll_number: string;
}

export default function SubmissionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<SubmissionWithStudent[]>([]);
  const [exam, setExam] = useState<ApiExam | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    if (!id || !user) return;

    const { exam: examData } = await apiGetExam(id);
    if (examData) setExam(examData);

    const { submissions: submissionsData } = await apiListSubmissions(id);
    if (submissionsData) {
      setSubmissions(
        submissionsData.map((s) => ({
          ...s,
          // ✅ FIX: Use real student name from backend join, fallback gracefully
          student_name: s.student?.name || 'Unknown Student',
          student_roll_number: s.student?.roll_number || '-',
        }))
      );
    }
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  };

  // ✅ FIXED: PDF download now actually works via edge function
  const handleDownloadPDF = async (submissionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDownloadingId(submissionId);
    const { html, error } = await apiGeneratePDF(submissionId);
    setDownloadingId(null);
    if (error || !html) {
      alert('Failed to generate PDF. Please try again.');
      return;
    }
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleViewDetails = (submissionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(teacher)/exam/${id}/submission/${submissionId}`);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'submitted': return { backgroundColor: Colors.success[100] };
      case 'graded': return { backgroundColor: Colors.primary[100] };
      case 'in_progress': return { backgroundColor: Colors.warning[100] };
      default: return { backgroundColor: Colors.neutral[100] };
    }
  };

  const getStatusTextStyle = (status: string) => {
    switch (status) {
      case 'submitted': return { color: Colors.success[700] };
      case 'graded': return { color: Colors.primary[700] };
      case 'in_progress': return { color: Colors.warning[700] };
      default: return { color: Colors.text.secondary };
    }
  };

  const renderSubmission = ({ item }: { item: SubmissionWithStudent }) => (
    <SwarlekhCard style={styles.submissionCard}>
      <View style={styles.submissionHeader}>
        <View style={styles.studentInfo}>
          {/* ✅ Now shows real student name */}
          <Text style={styles.studentName}>{item.student_name}</Text>
          <View style={styles.rollContainer}>
            <Hash size={14} color={Colors.text.secondary} />
            <Text style={styles.rollNumber}>{item.student_roll_number}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
          <Text style={[styles.statusText, getStatusTextStyle(item.status)]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>

      {/* ✅ Show score if graded */}
      {item.status === 'graded' && item.total_obtained != null && (
        <View style={styles.scoreRow}>
          <Star size={14} color={Colors.primary[600]} />
          <Text style={styles.scoreText}>
            Score: {item.total_obtained} / {exam?.total_marks}
          </Text>
        </View>
      )}

      <View style={styles.submissionMeta}>
        <Calendar size={14} color={Colors.text.secondary} />
        <Text style={styles.metaText}>{formatDate(item.submitted_at)}</Text>
      </View>

      <View style={styles.submissionActions}>
        <SwarlekhButton
          title="View & Grade"
          onPress={() => handleViewDetails(item.id)}
          variant="outline"
          size="sm"
          leftIcon={<Eye size={16} color={Colors.primary[600]} />}
        />
        <View style={styles.actionSpacing} />
        <SwarlekhButton
          title={downloadingId === item.id ? '...' : 'PDF'}
          onPress={() => handleDownloadPDF(item.id)}
          variant="primary"
          size="sm"
          loading={downloadingId === item.id}
          leftIcon={<Download size={16} color={Colors.neutral[0]} />}
        />
      </View>
    </SwarlekhCard>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary[600]} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.pageTitle}>Submissions</Text>
          <Text style={styles.pageSubtitle}>
            {exam?.subject} — {submissions.length} student{submissions.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      <FlatList
        data={submissions}
        keyExtractor={(item) => item.id}
        renderItem={renderSubmission}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <FileText size={64} color={Colors.neutral[300]} />
            <Text style={styles.emptyTitle}>No submissions yet</Text>
            <Text style={styles.emptySubtitle}>
              When students submit their answers, they will appear here
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background.primary },
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.neutral[200],
  },
  backButton: {
    width: 48, height: 48, borderRadius: BorderRadius.full,
    backgroundColor: Colors.neutral[100], alignItems: 'center', justifyContent: 'center',
    marginRight: Spacing.md,
  },
  pageTitle: { fontSize: FontSizes.xl, fontWeight: '600', color: Colors.text.primary },
  pageSubtitle: { fontSize: FontSizes.sm, color: Colors.text.secondary, marginTop: Spacing.xs },
  listContent: { padding: Spacing.lg },
  submissionCard: { marginBottom: Spacing.md },
  submissionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  studentInfo: { flex: 1 },
  studentName: { fontSize: FontSizes.lg, fontWeight: '600', color: Colors.text.primary },
  rollContainer: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xs },
  rollNumber: { fontSize: FontSizes.sm, color: Colors.text.secondary, marginLeft: Spacing.xs },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm },
  statusText: { fontSize: FontSizes.xs, fontWeight: '600' },
  scoreRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  scoreText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.primary[700] },
  submissionMeta: {
    flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md,
    paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.neutral[200],
  },
  metaText: { fontSize: FontSizes.sm, color: Colors.text.secondary, marginLeft: Spacing.xs },
  submissionActions: { flexDirection: 'row', marginTop: Spacing.md },
  actionSpacing: { width: Spacing.sm },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyTitle: { fontSize: FontSizes.xl, fontWeight: '500', color: Colors.text.primary, marginTop: Spacing.lg },
  emptySubtitle: { fontSize: FontSizes.md, color: Colors.text.secondary, textAlign: 'center', marginTop: Spacing.sm },
});
