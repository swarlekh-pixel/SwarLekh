import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  CheckCircle,
  Calendar,
  Hash,
  User,
  BookOpen,
  FileText,
  Home,
  Star,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, FontSizes } from '@/lib/theme';
import { SwarlekhButton } from '@/components/ui/SwarlekhButton';
import { SwarlekhCard } from '@/components/ui/SwarlekhCard';
import { useAuth } from '@/context/AuthContext';
import {
  apiGetSubmission,
  apiListAnswers,
  apiGetExam,
  apiGeneratePDF,
  ApiSubmission,
  ApiExam,
  ApiAnswer,
} from '@/lib/api';

interface SubmissionDetails extends ApiSubmission {
  exam: ApiExam;
}

export default function SubmissionConfirmationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [submission, setSubmission] = useState<SubmissionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [answerCount, setAnswerCount] = useState(0);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => { fetchSubmission(); }, [id]);
  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const fetchSubmission = async () => {
    if (!id || !user) return;

    const { submission: submissionData } = await apiGetSubmission(id);

    if (submissionData) {
      const { exam: examData } = await apiGetExam(submissionData.exam_id);
      const { answers: answersData } = await apiListAnswers(id);

      if (examData) {
        setSubmission({ ...submissionData, exam: examData });
      }
      if (answersData) {
        setAnswerCount(answersData.length);
      }
    }
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  };

  const handleGoHome = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace('/(student)');
  };

  // ✅ PDF download now actually calls the edge function
  const handleViewAnswerSheet = async () => {
    if (!id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPdfLoading(true);
    const { html, error } = await apiGeneratePDF(id);
    setPdfLoading(false);
    if (error || !html) {
      alert('Could not generate answer sheet. Please try again later.');
      return;
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary[600]} />
      </SafeAreaView>
    );
  }

  if (!submission) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Submission not found</Text>
        <SwarlekhButton title="Go Home" onPress={handleGoHome} variant="primary" />
      </SafeAreaView>
    );
  }

  const isGraded = submission.status === 'graded';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Success Icon */}
        <View style={styles.successIcon}>
          <CheckCircle size={80} color={Colors.success[500]} />
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Submitted Successfully!</Text>
          <Text style={styles.subtitle}>
            Your answer sheet has been recorded and will be sent to your teacher for evaluation.
          </Text>
        </View>

        {/* Submission Details Card */}
        <SwarlekhCard style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <User size={20} color={Colors.primary[600]} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Student</Text>
              <Text style={styles.detailValue}>{user?.name}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Hash size={20} color={Colors.primary[600]} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Roll Number</Text>
              <Text style={styles.detailValue}>{user?.roll_number || '-'}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <BookOpen size={20} color={Colors.primary[600]} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Subject</Text>
              <Text style={styles.detailValue}>{submission.exam.subject}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Calendar size={20} color={Colors.primary[600]} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Submitted On</Text>
              <Text style={styles.detailValue}>{formatDate(submission.submitted_at)}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <FileText size={20} color={Colors.primary[600]} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Answers</Text>
              <Text style={styles.detailValue}>{answerCount} questions answered</Text>
            </View>
          </View>

          {/* ✅ Show score if graded */}
          {isGraded && submission.total_obtained != null && (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Star size={20} color={Colors.success[600]} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Score</Text>
                  <Text style={[styles.detailValue, { color: Colors.success[700] }]}>
                    {submission.total_obtained} / {submission.exam.total_marks}
                  </Text>
                </View>
              </View>
              {submission.remarks ? (
                <>
                  <View style={styles.divider} />
                  <View style={styles.remarksBox}>
                    <Text style={styles.remarksLabel}>Teacher's Remarks</Text>
                    <Text style={styles.remarksText}>{submission.remarks}</Text>
                  </View>
                </>
              ) : null}
            </>
          )}
        </SwarlekhCard>

        {/* Status Banner */}
        <View style={[styles.statusBanner, isGraded && styles.statusBannerGraded]}>
          <Text style={[styles.statusLabel, isGraded && styles.statusLabelGraded]}>Status</Text>
          <View style={[styles.statusBadge, isGraded && styles.statusBadgeGraded]}>
            <Text style={styles.statusText}>
              {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
            </Text>
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>What happens next?</Text>
          <Text style={styles.infoText}>
            {isGraded
              ? 'Your exam has been graded. Review your score above.'
              : 'Your answers have been saved. Your teacher will review and evaluate your answers. You can view your submission status anytime from your dashboard.'}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttons}>
          <SwarlekhButton
            title="Go to Dashboard"
            onPress={handleGoHome}
            variant="primary"
            size="lg"
            fullWidth
            leftIcon={<Home size={20} color={Colors.neutral[0]} />}
          />
          <View style={styles.buttonSpacing} />
          <SwarlekhButton
            title={pdfLoading ? 'Generating...' : 'View Answer Sheet'}
            onPress={handleViewAnswerSheet}
            loading={pdfLoading}
            variant="outline"
            size="lg"
            fullWidth
            leftIcon={<FileText size={20} color={Colors.primary[600]} />}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background.primary },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  errorText: { fontSize: FontSizes.lg, color: Colors.text.primary, marginBottom: Spacing.lg },
  scrollContent: { flexGrow: 1, padding: Spacing.lg, alignItems: 'center' },
  successIcon: { marginTop: Spacing.xxl, marginBottom: Spacing.lg },
  titleContainer: { alignItems: 'center', marginBottom: Spacing.xl },
  title: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.text.primary, textAlign: 'center' },
  subtitle: {
    fontSize: FontSizes.md, color: Colors.text.secondary, textAlign: 'center',
    marginTop: Spacing.sm, paddingHorizontal: Spacing.xl, lineHeight: 22,
  },
  detailsCard: { width: '100%', marginBottom: Spacing.lg },
  detailRow: { flexDirection: 'row', alignItems: 'center' },
  detailContent: { marginLeft: Spacing.md, flex: 1 },
  detailLabel: { fontSize: FontSizes.sm, color: Colors.text.secondary, marginBottom: 2 },
  detailValue: { fontSize: FontSizes.md, fontWeight: '500', color: Colors.text.primary },
  divider: { height: 1, backgroundColor: Colors.neutral[200], marginVertical: Spacing.md },
  remarksBox: { backgroundColor: Colors.primary[50], padding: Spacing.md, borderRadius: BorderRadius.md },
  remarksLabel: { fontSize: FontSizes.xs, color: Colors.primary[700], fontWeight: '600', marginBottom: 4 },
  remarksText: { fontSize: FontSizes.md, color: Colors.text.primary, lineHeight: 22 },
  statusBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.success[50], paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md, width: '100%', marginBottom: Spacing.lg,
  },
  statusBannerGraded: { backgroundColor: Colors.primary[50] },
  statusLabel: { fontSize: FontSizes.md, color: Colors.success[700], flex: 1 },
  statusLabelGraded: { color: Colors.primary[700] },
  statusBadge: {
    backgroundColor: Colors.success[500], paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm,
  },
  statusBadgeGraded: { backgroundColor: Colors.primary[600] },
  statusText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[0] },
  infoBox: {
    backgroundColor: Colors.primary[50], padding: Spacing.lg,
    borderRadius: BorderRadius.md, width: '100%', marginBottom: Spacing.lg,
  },
  infoTitle: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.primary[700], marginBottom: Spacing.sm },
  infoText: { fontSize: FontSizes.sm, color: Colors.text.secondary, lineHeight: 20 },
  buttons: { width: '100%', paddingBottom: Spacing.xxl },
  buttonSpacing: { height: Spacing.md },
});
