/**
 * Teacher Submission Detail Screen
 *
 * Teachers view a student's submitted answer sheet:
 * - All questions with the student's answers
 * - Strikethrough rendering (crossed-out words)
 * - ✅ Grading UI — enter marks per question and save total
 * - PDF download for printing/archiving
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, BookOpen, Calendar, Download, FileText, CheckCircle, Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, FontSizes } from '@/lib/theme';
import { SwarlekhCard } from '@/components/ui/SwarlekhCard';
import { SwarlekhButton } from '@/components/ui/SwarlekhButton';
import {
  apiGetSubmission,
  apiListAnswers,
  apiListQuestions,
  apiGetExam,
  apiGeneratePDF,
  apiGradeSubmission,
  ApiSubmission,
  ApiAnswer,
  ApiQuestion,
  ApiExam,
} from '@/lib/api';
import { tokenizeWords, isWordStruck } from '@/lib/textUtils';
import { StrikethroughRange } from '@/types/database';

/* =============================================================================
 * Types
 * ============================================================================= */

interface QuestionWithAnswer extends ApiQuestion {
  answer: ApiAnswer | null;
}

/* =============================================================================
 * Helper — render struck text inline
 * ============================================================================= */

function renderStruckText(text: string, ranges: StrikethroughRange[]) {
  const tokens = tokenizeWords(text);
  return (
    <Text style={styles.answerText}>
      {tokens.map((token, i) => {
        if (!token.word.trim()) return <Text key={i}>{token.word}</Text>;
        const struck = isWordStruck(token, ranges);
        return (
          <Text key={i} style={struck ? styles.wordStruck : undefined}>
            {token.word}
          </Text>
        );
      })}
    </Text>
  );
}

/* =============================================================================
 * Component
 * ============================================================================= */

export default function SubmissionDetailScreen() {
  const { id: examId, submissionId } = useLocalSearchParams<{ id: string; submissionId: string }>();
  const [exam, setExam] = useState<ApiExam | null>(null);
  const [submission, setSubmission] = useState<ApiSubmission | null>(null);
  const [qaList, setQaList] = useState<QuestionWithAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfSuccess, setPdfSuccess] = useState(false);

  // ✅ Grading state
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [remarks, setRemarks] = useState('');
  const [grading, setGrading] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);
  const [gradeSuccess, setGradeSuccess] = useState(false);

  /* ----------------- Data Fetching ----------------- */

  useEffect(() => { fetchData(); }, [submissionId, examId]);

  const fetchData = async () => {
    if (!submissionId || !examId) return;

    const [{ exam: examData }, { submission: subData }, { questions }, { answers }] = await Promise.all([
      apiGetExam(examId),
      apiGetSubmission(submissionId),
      apiListQuestions(examId),
      apiListAnswers(submissionId),
    ]);

    setExam(examData);
    setSubmission(subData);

    if (questions) {
      const merged: QuestionWithAnswer[] = questions.map(q => ({
        ...q,
        answer: answers?.find(a => a.question_id === q.id) || null,
      }));
      setQaList(merged);

      // Pre-fill grades if already graded
      if (subData?.status === 'graded' && answers) {
        const existingGrades: Record<string, string> = {};
        answers.forEach(a => {
          if (a.marks_obtained != null) {
            existingGrades[a.question_id] = String(a.marks_obtained);
          }
        });
        setGrades(existingGrades);
        setRemarks(subData.remarks || '');
      }
    }
    setLoading(false);
  };

  /* ----------------- Grading Handler ----------------- */

  const handleSaveGrades = async () => {
    if (!submissionId || !exam) return;
    setGradeError(null);

    // Validate all questions have grades
    for (const qa of qaList) {
      const val = grades[qa.id];
      if (val === undefined || val === '') {
        setGradeError(`Please enter marks for Q${qa.question_number}`);
        return;
      }
      const num = parseFloat(val);
      if (isNaN(num) || num < 0 || num > qa.marks) {
        setGradeError(`Q${qa.question_number}: marks must be between 0 and ${qa.marks}`);
        return;
      }
    }

    const numericGrades: Record<string, number> = {};
    let total = 0;
    qaList.forEach(qa => {
      const m = parseFloat(grades[qa.id] || '0');
      numericGrades[qa.id] = m;
      total += m;
    });

    setGrading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { error } = await apiGradeSubmission(submissionId, numericGrades, total, remarks);
    setGrading(false);

    if (error) {
      setGradeError(error.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      setGradeSuccess(true);
      setSubmission(prev => prev ? { ...prev, status: 'graded', total_obtained: total } : prev);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setGradeSuccess(false), 3000);
    }
  };

  /* ----------------- PDF Handler ----------------- */

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });

  const handleDownloadPDF = async () => {
    if (!submissionId) return;
    setPdfLoading(true);
    setPdfError(null);
    setPdfSuccess(false);

    const { html, error } = await apiGeneratePDF(submissionId);
    setPdfLoading(false);

    if (error || !html) {
      setPdfError('Failed to generate PDF');
      return;
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 3000);
    }
  };

  /* ----------------- Computed Values ----------------- */

  const totalGraded = qaList.reduce((sum, qa) => {
    const v = parseFloat(grades[qa.id] || '0');
    return sum + (isNaN(v) ? 0 : v);
  }, 0);

  const isAlreadyGraded = submission?.status === 'graded';

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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityLabel="Go back">
          <ArrowLeft size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.pageTitle}>Answer Sheet</Text>
          <Text style={styles.pageSub}>{exam?.subject}</Text>
        </View>
        <TouchableOpacity
          style={[styles.pdfBtn, pdfLoading && styles.pdfBtnDisabled]}
          onPress={handleDownloadPDF}
          disabled={pdfLoading}
          accessibilityLabel="Download PDF"
        >
          {pdfLoading ? (
            <ActivityIndicator size="small" color={Colors.neutral[0]} />
          ) : (
            <Download size={18} color={Colors.neutral[0]} />
          )}
          <Text style={styles.pdfBtnText}>{pdfLoading ? '...' : 'PDF'}</Text>
        </TouchableOpacity>
      </View>

      {/* PDF Error Bar */}
      {pdfError && (
        <View style={styles.errorBar}>
          <Text style={styles.errorBarText}>{pdfError}</Text>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Summary Card */}
          <SwarlekhCard style={styles.card}>
            <View style={styles.summaryRow}>
              <BookOpen size={18} color={Colors.primary[600]} />
              <View style={styles.summaryInfo}>
                <Text style={styles.summaryLabel}>Subject</Text>
                <Text style={styles.summaryValue}>{exam?.subject || '-'}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Calendar size={18} color={Colors.primary[600]} />
              <View style={styles.summaryInfo}>
                <Text style={styles.summaryLabel}>Submitted</Text>
                <Text style={styles.summaryValue}>{submission ? formatDate(submission.submitted_at) : '-'}</Text>
              </View>
            </View>
            {isAlreadyGraded && submission?.total_obtained != null && (
              <>
                <View style={styles.divider} />
                <View style={styles.summaryRow}>
                  <Star size={18} color={Colors.success[600]} />
                  <View style={styles.summaryInfo}>
                    <Text style={styles.summaryLabel}>Total Score</Text>
                    <Text style={[styles.summaryValue, { color: Colors.success[700] }]}>
                      {submission.total_obtained} / {exam?.total_marks}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </SwarlekhCard>

          {/* PDF Download Section */}
          <SwarlekhCard style={[styles.card, styles.downloadCard]}>
            <View style={styles.downloadHeader}>
              <View style={styles.downloadIconContainer}>
                <FileText size={24} color={Colors.primary[600]} />
              </View>
              <View style={styles.downloadInfo}>
                <Text style={styles.downloadTitle}>Export Answer Sheet</Text>
                <Text style={styles.downloadDesc}>Download as PDF for printing or archiving</Text>
              </View>
            </View>
            {pdfSuccess && (
              <View style={styles.downloadStatus}>
                <CheckCircle size={16} color={Colors.success[600]} />
                <Text style={styles.successStatusText}>PDF opened in new tab</Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.downloadButton, pdfLoading && styles.downloadButtonDisabled]}
              onPress={handleDownloadPDF}
              disabled={pdfLoading}
              accessibilityLabel="Download answer sheet as PDF"
            >
              {pdfLoading ? (
                <>
                  <ActivityIndicator size="small" color={Colors.neutral[0]} />
                  <Text style={styles.downloadButtonText}>Generating...</Text>
                </>
              ) : (
                <>
                  <Download size={18} color={Colors.neutral[0]} />
                  <Text style={styles.downloadButtonText}>Download PDF</Text>
                </>
              )}
            </TouchableOpacity>
          </SwarlekhCard>

          {/* ✅ Questions & Answers with Grading */}
          {qaList.map((qa, idx) => (
            <SwarlekhCard key={qa.id} style={styles.card}>
              <View style={styles.questionHeader}>
                <View style={styles.questionBadge}>
                  <Text style={styles.questionNum}>Q{qa.question_number || idx + 1}</Text>
                </View>
                <Text style={styles.marksLabel}>Max: {qa.marks} marks</Text>
              </View>
              <Text style={styles.questionText}>{qa.question_text}</Text>

              <View style={styles.answerBox}>
                <Text style={styles.answerLabel}>Answer:</Text>
                {qa.answer?.answer_text ? (
                  renderStruckText(qa.answer.answer_text, qa.answer.strikethrough_ranges || [])
                ) : (
                  <Text style={styles.noAnswer}>No answer provided</Text>
                )}
              </View>

              {/* ✅ Per-question marks input */}
              <View style={styles.gradeRow}>
                <Text style={styles.gradeLabel}>Marks awarded:</Text>
                <View style={styles.gradeInputWrapper}>
                  <TextInput
                    style={styles.gradeInput}
                    value={grades[qa.id] || ''}
                    onChangeText={text => {
                      setGrades(prev => ({ ...prev, [qa.id]: text }));
                      setGradeError(null);
                    }}
                    placeholder="0"
                    keyboardType="decimal-pad"
                    maxLength={5}
                    accessibilityLabel={`Marks for question ${qa.question_number}`}
                  />
                  <Text style={styles.gradeMax}>/ {qa.marks}</Text>
                </View>
              </View>
            </SwarlekhCard>
          ))}

          {/* ✅ Grading Summary + Submit */}
          {qaList.length > 0 && (
            <SwarlekhCard style={[styles.card, styles.gradeCard]}>
              <View style={styles.gradeSummaryHeader}>
                <Star size={20} color={Colors.primary[600]} />
                <Text style={styles.gradeSummaryTitle}>
                  {isAlreadyGraded ? 'Update Grade' : 'Submit Grade'}
                </Text>
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Score</Text>
                <Text style={styles.totalValue}>
                  {totalGraded.toFixed(1)} / {exam?.total_marks || 0}
                </Text>
              </View>

              <View style={styles.remarksSection}>
                <Text style={styles.gradeLabel}>Remarks (optional)</Text>
                <TextInput
                  style={styles.remarksInput}
                  value={remarks}
                  onChangeText={setRemarks}
                  placeholder="Add feedback for the student..."
                  multiline
                  numberOfLines={3}
                  accessibilityLabel="Remarks for student"
                />
              </View>

              {gradeError && (
                <View style={styles.gradeErrorBox}>
                  <Text style={styles.gradeErrorText}>{gradeError}</Text>
                </View>
              )}

              {gradeSuccess && (
                <View style={styles.gradeSuccessBox}>
                  <CheckCircle size={16} color={Colors.success[600]} />
                  <Text style={styles.gradeSuccessText}>Grade saved successfully!</Text>
                </View>
              )}

              <SwarlekhButton
                title={grading ? 'Saving...' : isAlreadyGraded ? 'Update Grade' : 'Save Grade'}
                onPress={handleSaveGrades}
                loading={grading}
                variant="primary"
                size="lg"
                fullWidth
                leftIcon={<Star size={20} color={Colors.neutral[0]} />}
              />
            </SwarlekhCard>
          )}
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background.primary },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.neutral[200],
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.neutral[100], alignItems: 'center', justifyContent: 'center',
    marginRight: Spacing.md,
  },
  headerTitle: { flex: 1 },
  pageTitle: { fontSize: FontSizes.xl, fontWeight: '600', color: Colors.text.primary },
  pageSub: { fontSize: FontSizes.sm, color: Colors.text.secondary, marginTop: 2 },
  pdfBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary[600], paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm, borderRadius: BorderRadius.md,
  },
  pdfBtnDisabled: { backgroundColor: Colors.primary[300] },
  pdfBtnText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.neutral[0] },

  // Error Bar
  errorBar: {
    backgroundColor: Colors.error[50], paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.error[200],
  },
  errorBarText: { fontSize: FontSizes.sm, color: Colors.error[700] },

  // Content
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  card: { marginBottom: Spacing.md },

  // Summary
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryInfo: { marginLeft: Spacing.md, flex: 1 },
  summaryLabel: { fontSize: FontSizes.xs, color: Colors.text.tertiary },
  summaryValue: { fontSize: FontSizes.md, fontWeight: '500', color: Colors.text.primary, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.neutral[200], marginVertical: Spacing.md },

  // Question
  questionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  questionBadge: {
    backgroundColor: Colors.primary[100], paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm,
  },
  questionNum: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.primary[700] },
  marksLabel: { fontSize: FontSizes.sm, color: Colors.text.secondary },
  questionText: { fontSize: FontSizes.md, color: Colors.text.primary, lineHeight: 22 },

  // Answer
  answerBox: {
    backgroundColor: Colors.neutral[50], padding: Spacing.md,
    borderRadius: BorderRadius.md, marginTop: Spacing.md,
    borderLeftWidth: 3, borderLeftColor: Colors.primary[400],
  },
  answerLabel: { fontSize: FontSizes.xs, color: Colors.text.tertiary, marginBottom: Spacing.xs },
  answerText: { fontSize: FontSizes.md, color: Colors.text.primary, lineHeight: 24 },
  wordStruck: {
    textDecorationLine: 'line-through',
    textDecorationColor: Colors.error[500],
    color: Colors.neutral[500],
  },
  noAnswer: { fontSize: FontSizes.md, color: Colors.text.tertiary, fontStyle: 'italic' },

  // ✅ Grading per-question
  gradeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: Spacing.md, paddingTop: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.neutral[200],
  },
  gradeLabel: { fontSize: FontSizes.sm, fontWeight: '500', color: Colors.text.secondary },
  gradeInputWrapper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gradeInput: {
    width: 64, height: 40,
    borderWidth: 1, borderColor: Colors.primary[300],
    borderRadius: BorderRadius.md,
    textAlign: 'center', fontSize: FontSizes.md,
    fontWeight: '600', color: Colors.text.primary,
    backgroundColor: Colors.primary[50],
    paddingHorizontal: Spacing.sm,
  },
  gradeMax: { fontSize: FontSizes.sm, color: Colors.text.secondary },

  // ✅ Grade summary card
  gradeCard: {
    backgroundColor: Colors.primary[50],
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  gradeSummaryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  gradeSummaryTitle: { fontSize: FontSizes.lg, fontWeight: '600', color: Colors.text.primary, marginLeft: Spacing.sm },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.primary[100], padding: Spacing.md,
    borderRadius: BorderRadius.md, marginBottom: Spacing.md,
  },
  totalLabel: { fontSize: FontSizes.md, fontWeight: '500', color: Colors.text.primary },
  totalValue: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.primary[700] },
  remarksSection: { marginBottom: Spacing.md },
  remarksInput: {
    borderWidth: 1, borderColor: Colors.neutral[300],
    borderRadius: BorderRadius.md, padding: Spacing.md,
    fontSize: FontSizes.md, color: Colors.text.primary,
    backgroundColor: Colors.neutral[0],
    minHeight: 80, textAlignVertical: 'top',
    marginTop: Spacing.sm,
  },
  gradeErrorBox: {
    backgroundColor: Colors.error[50], padding: Spacing.md,
    borderRadius: BorderRadius.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.error[200],
  },
  gradeErrorText: { fontSize: FontSizes.sm, color: Colors.error[700] },
  gradeSuccessBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.success[50], padding: Spacing.md,
    borderRadius: BorderRadius.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.success[200],
  },
  gradeSuccessText: { fontSize: FontSizes.sm, color: Colors.success[700], fontWeight: '500' },

  // Download Section
  downloadCard: {
    backgroundColor: Colors.primary[50],
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary[500],
  },
  downloadHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  downloadIconContainer: {
    width: 48, height: 48, borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary[100], alignItems: 'center', justifyContent: 'center',
    marginRight: Spacing.md,
  },
  downloadInfo: { flex: 1 },
  downloadTitle: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text.primary },
  downloadDesc: { fontSize: FontSizes.sm, color: Colors.text.secondary, marginTop: 2 },
  downloadButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary[600],
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md, marginVertical: Spacing.md,
  },
  downloadButtonDisabled: { backgroundColor: Colors.primary[300] },
  downloadButtonText: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.neutral[0] },
  downloadStatus: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    marginBottom: Spacing.md, backgroundColor: Colors.neutral[0], borderRadius: BorderRadius.sm,
  },
  successStatusText: { fontSize: FontSizes.sm, color: Colors.success[600], fontWeight: '500' },
});
