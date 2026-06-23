import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Plus, Trash2, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, FontSizes } from '@/lib/theme';
import { SwarlekhButton } from '@/components/ui/SwarlekhButton';
import { SwarlekhInput } from '@/components/ui/SwarlekhInput';
import { SwarlekhCard } from '@/components/ui/SwarlekhCard';
import { useAuth } from '@/context/AuthContext';
import { apiListQuestions, apiCreateQuestions, apiDeleteExam, ApiQuestion } from '@/lib/api';

export default function AddQuestionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [questions, setQuestions] = useState<ApiQuestion[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [newMarks, setNewMarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, [id]);

  const fetchQuestions = async () => {
    if (!id) return;
    setLoading(true);

    const { questions: data } = await apiListQuestions(id);

    if (data) {
      setQuestions(data);
    }
    setLoading(false);
  };

  const handleAddQuestion = async () => {
    if (!id || !newQuestion.trim() || !newMarks.trim()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAdding(true);

    const questionNumber = questions.length + 1;

    const { error } = await apiCreateQuestions(id, [
      {
        question_text: newQuestion.trim(),
        question_number: questionNumber,
        marks: parseInt(newMarks, 10),
      },
    ]);

    if (!error) {
      const { questions: data } = await apiListQuestions(id);
      if (data) {
        setQuestions(data);
      }
      setNewQuestion('');
      setNewMarks('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setAdding(false);
  };

  const handleDeleteQuestion = async (questionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // No API delete endpoint available — just filter locally
    const remainingQuestions = questions.filter((q) => q.id !== questionId);
    setQuestions(remainingQuestions);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const handleDeleteExam = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { error } = await apiDeleteExam(id);
    if (!error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      router.replace('/(teacher)');
    }
  };

  const handleDone = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const renderQuestion = ({ item, index }: { item: ApiQuestion; index: number }) => (
    <SwarlekhCard style={styles.questionCard}>
      <View style={styles.questionHeader}>
        <View style={styles.questionBadge}>
          <Text style={styles.questionNumber}>Q{index + 1}</Text>
        </View>
        <Text style={styles.questionMarks}>{item.marks} marks</Text>
        <TouchableOpacity
          onPress={() => handleDeleteQuestion(item.id)}
          style={styles.deleteButton}
          accessibilityRole="button"
          accessibilityLabel="Delete question"
        >
          <Trash2 size={18} color={Colors.error[500]} />
        </TouchableOpacity>
      </View>
      <Text style={styles.questionText}>{item.question_text}</Text>
    </SwarlekhCard>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleDone}
            accessibilityRole="button"
            accessibilityLabel="Done"
          >
            <Check size={24} color={Colors.neutral[0]} />
          </TouchableOpacity>
          <Text style={styles.title}>Add Questions</Text>
          <Text style={styles.subtitle}>
            {questions.length} question{questions.length !== 1 ? 's' : ''} added
          </Text>
        </View>

        <View style={styles.addForm}>
          <SwarlekhCard variant="primary" style={styles.formCard}>
            <Text style={styles.formLabel}>New Question</Text>
            <SwarlekhInput
              placeholder="Enter the question text..."
              value={newQuestion}
              onChangeText={setNewQuestion}
              multiline
              numberOfLines={3}
              returnKeyType="done"
            />
            <View style={styles.marksRow}>
              <View style={styles.marksInput}>
                <SwarlekhInput
                  placeholder="Marks"
                  value={newMarks}
                  onChangeText={setNewMarks}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.addButton}>
                <SwarlekhButton
                  title="Add"
                  onPress={handleAddQuestion}
                  disabled={!newQuestion.trim() || !newMarks.trim()}
                  loading={adding}
                  variant="primary"
                />
              </View>
            </View>
          </SwarlekhCard>
        </View>

        <FlatList
          data={questions}
          keyExtractor={(item) => item.id}
          renderItem={renderQuestion}
          contentContainerStyle={styles.questionsList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyState}>
                <Plus size={48} color={Colors.neutral[300]} />
                <Text style={styles.emptyTitle}>No questions yet</Text>
                <Text style={styles.emptySubtitle}>
                  Add your first question above
                </Text>
              </View>
            ) : null
          }
        />

        {questions.length > 0 && (
          <View style={styles.doneButton}>
            <SwarlekhButton
              title={`Done - ${questions.length} Questions`}
              onPress={handleDone}
              variant="primary"
              size="lg"
              fullWidth
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  subtitle: {
    fontSize: FontSizes.sm,
    color: Colors.text.secondary,
    marginLeft: Spacing.sm,
  },
  addForm: {
    padding: Spacing.lg,
  },
  formCard: {
    marginTop: Spacing.sm,
  },
  formLabel: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.primary[700],
    marginBottom: Spacing.sm,
  },
  marksRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  marksInput: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  addButton: {
    width: 100,
  },
  questionsList: {
    padding: Spacing.lg,
    paddingTop: 0,
    paddingBottom: 100,
  },
  questionCard: {
    marginBottom: Spacing.md,
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
  deleteButton: {
    padding: Spacing.xs,
  },
  questionText: {
    fontSize: FontSizes.md,
    color: Colors.text.primary,
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '500',
    color: Colors.text.primary,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontSize: FontSizes.md,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
  doneButton: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: Spacing.lg,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
  },
});
