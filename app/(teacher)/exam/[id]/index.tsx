import React, { useState, useEffect, use } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Hash,
  Copy,
  CheckCircle,
  Calendar,
  Clock,
  Award,
  Users,
  Play,
  Edit3,
  Trash2,
  FileQuestion,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, FontSizes } from '@/lib/theme';
import { SwarlekhButton } from '@/components/ui/SwarlekhButton';
import { SwarlekhCard } from '@/components/ui/SwarlekhCard';
import { useAuth } from '@/context/AuthContext';
import {
  apiGetExam,
  apiListQuestions,
  apiListSubmissions,
  apiUpdateExam,
  apiDeleteExam,
  ApiExam,
  ApiQuestion,
} from '@/lib/api';

export default function ExamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [exam, setExam] = useState<ApiExam | null>(null);
  const [questions, setQuestions] = useState<ApiQuestion[]>([]);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    fetchExam();
  }, [id]);

  const fetchExam = async () => {
    if (!id || !user) return;

    const { exam: examData, error: examError } = await apiGetExam(id);

    if (!examError && examData) {
      setExam(examData);

      // Fetch questions
      const { questions: questionsData } = await apiListQuestions(id);

      if (questionsData) {
        setQuestions(questionsData);
      }

      // Fetch submission count
      const { submissions: submissionsData } = await apiListSubmissions(id);

      if (submissionsData) {
        setSubmissionCount(submissionsData.length);
      }
    }

    setLoading(false);
  };

  const handleCopyCode = async () => {
    if (!exam) return;
    setCopiedCode(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleAddQuestions = () => {
    router.push(`/(teacher)/exam/${id}/add-questions`);
  };

  const handleViewSubmissions = () => {
    router.push(`/(teacher)/exam/${id}/submissions`);
  };

  const handleActivateExam = async () => {
    if (!exam || questions.length === 0) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { error } = await apiUpdateExam(exam.id, { status: 'active' });

    if (!error) {
      setExam({ ...exam, status: 'active' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleCompleteExam = async () => {
    if (!exam) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { error } = await apiUpdateExam(exam.id, { status: 'completed' });

    if (!error) {
      setExam({ ...exam, status: 'completed' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // No API delete endpoint available — just filter locally
    setQuestions(questions.filter((q) => q.id !== questionId));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getStatusColor = () => {
    switch (exam?.status) {
      case 'draft':
        return Colors.warning;
      case 'active':
        return Colors.success;
      case 'completed':
        return Colors.neutral;
      default:
        return Colors.neutral;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary[600]} />
      </SafeAreaView>
    );
  }

  if (!exam) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Exam not found</Text>
        <SwarlekhButton
          title="Go Back"
          onPress={() => router.back()}
          variant="primary"
        />
      </SafeAreaView>
    );
  }

  const statusColor = getStatusColor();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={24} color={Colors.text.primary} />
        </TouchableOpacity>

        {/* Exam Title Card */}
        <SwarlekhCard style={styles.titleCard}>
          <View style={styles.titleHeader}>
            <Text style={styles.examSubject}>{exam.subject}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor[100] }]}>
              <Text style={[styles.statusText, { color: statusColor[700] }]}>
                {exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
              </Text>
            </View>
          </View>
          {exam.description && (
            <Text style={styles.examDescription}>{exam.description}</Text>
          )}
        </SwarlekhCard>

        {/* Exam Code */}
        <TouchableOpacity
          style={styles.codeCard}
          onPress={handleCopyCode}
          accessibilityRole="button"
          accessibilityLabel={`Exam code: ${exam.exam_code}. Double tap to copy.`}
        >
          <View style={styles.codeContent}>
            <View>
              <Text style={styles.codeLabel}>Exam Code</Text>
              <Text style={styles.codeValue}>{exam.exam_code}</Text>
            </View>
            {copiedCode ? (
              <CheckCircle size={24} color={Colors.success[500]} />
            ) : (
              <Copy size={24} color={Colors.text.secondary} />
            )}
          </View>
          <Text style={styles.codeHint}>Tap to copy and share with students</Text>
        </TouchableOpacity>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Calendar size={20} color={Colors.primary[600]} />
            <Text style={styles.statValue}>{formatDate(exam.exam_date)}</Text>
            <Text style={styles.statLabel}>Exam Date</Text>
          </View>
          <View style={styles.statCard}>
            <Award size={20} color={Colors.primary[600]} />
            <Text style={styles.statValue}>{exam.total_marks}</Text>
            <Text style={styles.statLabel}>Total Marks</Text>
          </View>
          <View style={styles.statCard}>
            <Hash size={20} color={Colors.primary[600]} />
            <Text style={styles.statValue}>{questions.length}</Text>
            <Text style={styles.statLabel}>Questions</Text>
          </View>
          <View style={styles.statCard}>
            <Users size={20} color={Colors.primary[600]} />
            <Text style={styles.statValue}>{submissionCount}</Text>
            <Text style={styles.statLabel}>Submissions</Text>
          </View>
        </View>

        {exam.time_limit_minutes && (
          <View style={styles.infoRow}>
            <Clock size={20} color={Colors.warning[600]} />
            <Text style={styles.infoText}>
              Time Limit: {exam.time_limit_minutes} minutes
            </Text>
          </View>
        )}

        {/* Questions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FileQuestion size={24} color={Colors.primary[600]} />
            <Text style={styles.sectionTitle}>Questions</Text>
          </View>

          {questions.length === 0 ? (
            <View style={styles.emptyQuestions}>
              <Text style={styles.emptyText}>No questions added yet</Text>
              <Text style={styles.emptyHint}>
                Add questions to activate your exam
              </Text>
              <SwarlekhButton
                title="Add Questions"
                onPress={handleAddQuestions}
                variant="primary"
              />
            </View>
          ) : (
            <>
              {questions.map((question, index) => (
                <SwarlekhCard key={question.id} style={styles.questionCard}>
                  <View style={styles.questionHeader}>
                    <View style={styles.questionBadge}>
                      <Text style={styles.questionNumber}>Q{index + 1}</Text>
                    </View>
                    <Text style={styles.questionMarks}>{question.marks} marks</Text>
                    {exam.status === 'draft' && (
                      <TouchableOpacity
                        onPress={() => handleDeleteQuestion(question.id)}
                        accessibilityRole="button"
                        accessibilityLabel="Delete question"
                      >
                        <Trash2 size={18} color={Colors.error[500]} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.questionText}>{question.question_text}</Text>
                </SwarlekhCard>
              ))}

              {exam.status === 'draft' && (
                <SwarlekhButton
                  title="Add More Questions"
                  onPress={handleAddQuestions}
                  variant="outline"
                  leftIcon={<Edit3 size={20} color={Colors.primary[600]} />}
                />
              )}
            </>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {exam.status === 'draft' && questions.length > 0 && (
            <SwarlekhButton
              title="Activate Exam"
              onPress={handleActivateExam}
              variant="primary"
              size="lg"
              fullWidth
              leftIcon={<Play size={20} color={Colors.neutral[0]} />}
              accessibilityHint="Activates the exam so students can join"
            />
          )}

          {exam.status === 'active' && (
            <>
              <SwarlekhButton
                title="View Submissions"
                onPress={handleViewSubmissions}
                variant="primary"
                size="lg"
                fullWidth
                leftIcon={<Users size={20} color={Colors.neutral[0]} />}
              />
              <View style={styles.buttonSpacing} />
              <SwarlekhButton
                title="Complete Exam"
                onPress={handleCompleteExam}
                variant="outline"
                size="lg"
                fullWidth
              />
            </>
          )}

          {exam.status === 'completed' && (
            <SwarlekhButton
              title="View Submissions"
              onPress={handleViewSubmissions}
              variant="primary"
              size="lg"
              fullWidth
              leftIcon={<Users size={20} color={Colors.neutral[0]} />}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  errorText: {
    fontSize: FontSizes.lg,
    color: Colors.text.primary,
    marginBottom: Spacing.lg,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.neutral[0],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  titleCard: {
    marginBottom: Spacing.md,
  },
  titleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  examSubject: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.text.primary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  examDescription: {
    fontSize: FontSizes.md,
    color: Colors.text.secondary,
    marginTop: Spacing.md,
    lineHeight: 22,
  },
  codeCard: {
    backgroundColor: Colors.primary[50],
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  codeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: FontSizes.sm,
    color: Colors.text.secondary,
  },
  codeValue: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.primary[700],
    marginTop: Spacing.xs,
    letterSpacing: 3,
  },
  codeHint: {
    fontSize: FontSizes.sm,
    color: Colors.text.secondary,
    marginTop: Spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.neutral[0],
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: Spacing.xs,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning[50],
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  infoText: {
    fontSize: FontSizes.md,
    color: Colors.warning[700],
    marginLeft: Spacing.sm,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text.primary,
    marginLeft: Spacing.sm,
  },
  emptyQuestions: {
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.neutral[0],
    borderRadius: BorderRadius.lg,
  },
  emptyText: {
    fontSize: FontSizes.md,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  emptyHint: {
    fontSize: FontSizes.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.lg,
  },
  questionCard: {
    marginBottom: Spacing.sm,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  questionBadge: {
    backgroundColor: Colors.primary[100],
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.sm,
  },
  questionNumber: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.primary[700],
  },
  questionMarks: {
    fontSize: FontSizes.sm,
    color: Colors.text.secondary,
    flex: 1,
  },
  questionText: {
    fontSize: FontSizes.md,
    color: Colors.text.primary,
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
  actions: {
    marginTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  buttonSpacing: {
    height: Spacing.sm,
  },
});
