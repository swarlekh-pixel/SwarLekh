/**
 * Student Exam Screen
 *
 * Allows students to:
 * - View exam questions one at a time
 * - Answer via voice (speech-to-text) or typing
 * - Strike through words using voice commands or quick-strike buttons
 * - Navigate between questions
 * - Submit the exam
 *
 * Accessibility features:
 * - Voice commands: "strike last word", "strike last sentence", "undo strike"
 * - Quick-strike buttons with screen reader labels
 * - Announcements for screen readers on every action
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  AccessibilityInfo,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Mic,
  MicOff,
  ChevronLeft,
  ChevronRight,
  Check,
  Trash2,
  Clock,
  Edit3,
  Strikethrough,
  Scissors,
  RotateCcw,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, FontSizes } from '@/lib/theme';
import { SwarlekhButton } from '@/components/ui/SwarlekhButton';
import { SwarlekhCard } from '@/components/ui/SwarlekhCard';
import { useAuth } from '@/context/AuthContext';
import {
  apiGetExam,
  apiListQuestions,
  apiCreateSubmission,
  apiCreateAnswer,
  ApiExam,
  ApiQuestion,
} from '@/lib/api';
import { StrikethroughRange } from '@/types/database';
import { tokenizeWords, isWordStruck, WordToken } from '@/lib/textUtils';
import { useSpeechRecognition, supportedLanguages } from '@/hooks/useSpeechRecognition';

/* =============================================================================
 * Types
 * ============================================================================= */

type Mode = 'edit' | 'strike';


/* =============================================================================
 * Helper Functions
 * ============================================================================= */

  return tokens;
}


/* =============================================================================
 * Voice Command Processing
 * ============================================================================= */

const VOICE_COMMANDS = [
  { pattern: /\s*(strike|cut|delete|scratch)\s+last\s+word\s*$/i, action: 'STRIKE_LAST_WORD' },
  { pattern: /\s*(strike|cut|delete|scratch)\s+last\s+(\d+)\s+words?\s*$/i, action: 'STRIKE_LAST_N_WORDS' },
  { pattern: /\s*(strike|cut|delete|scratch)\s+last\s+sentence\s*$/i, action: 'STRIKE_LAST_SENTENCE' },
  { pattern: /\s*undo\s+(strike|strikethrough|cut)\s*$/i, action: 'UNDO_STRIKE' },
] as const;

type VoiceCommandResult = { text: string; ranges: StrikethroughRange[]; announcement: string } | null;

/** Process voice commands from the transcript */
function applyVoiceCommand(rawText: string, ranges: StrikethroughRange[]): VoiceCommandResult {
  for (const cmd of VOICE_COMMANDS) {
    const match = rawText.match(cmd.pattern);
    if (!match) continue;

    const cleanText = rawText.slice(0, match.index).trimEnd();
    const words = tokenizeWords(cleanText).filter(t => t.word.trim());

    switch (cmd.action) {
      case 'STRIKE_LAST_WORD': {
        if (!words.length) return { text: cleanText, ranges, announcement: 'No word to strike' };
        const last = words[words.length - 1];
        return {
          text: cleanText,
          ranges: [...ranges, { start: last.start, end: last.end }],
          announcement: `Struck: ${last.word}`,
        };
      }

      case 'STRIKE_LAST_N_WORDS': {
        const n = parseInt(match[2], 10) || 1;
        if (!words.length) return { text: cleanText, ranges, announcement: 'No words to strike' };
        const slice = words.slice(-n);
        return {
          text: cleanText,
          ranges: [...ranges, { start: slice[0].start, end: slice[slice.length - 1].end }],
          announcement: `Struck last ${n} words`,
        };
      }

      case 'STRIKE_LAST_SENTENCE': {
        const lastPunct = Math.max(
          cleanText.lastIndexOf('.'),
          cleanText.lastIndexOf(','),
          cleanText.lastIndexOf('?'),
          cleanText.lastIndexOf('!')
        );
        const sentenceStart = lastPunct >= 0 ? lastPunct + 1 : 0;
        const sentence = cleanText.slice(sentenceStart).trim();
        if (!sentence) return { text: cleanText, ranges, announcement: 'No sentence to strike' };
        const actualStart = cleanText.indexOf(sentence, sentenceStart);
        return {
          text: cleanText,
          ranges: [...ranges, { start: actualStart, end: actualStart + sentence.length }],
          announcement: `Struck sentence`,
        };
      }

      case 'UNDO_STRIKE': {
        const newRanges = ranges.length ? ranges.slice(0, -1) : [];
        return {
          text: cleanText,
          ranges: newRanges,
          announcement: ranges.length ? 'Last strike removed' : 'No strike to undo',
        };
      }
    }
  }
  return null;
}

/** Announce to screen reader */
function announce(message: string) {
  AccessibilityInfo.announceForAccessibility(message);
}

/* =============================================================================
 * Exam Screen Component
 * ============================================================================= */

export default function ExamSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  /* ----------------- State ----------------- */
  const [exam, setExam] = useState<ApiExam | null>(null);
  const [questions, setQuestions] = useState<ApiQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, { text: string; strikethrough: StrikethroughRange[] }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingText, setEditingText] = useState('');
  const [mode, setMode] = useState<Mode>('edit');
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [selectedLang, setSelectedLang] = useState('en-IN');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const baseTextRef = useRef('');

  /* ----------------- Speech Recognition ----------------- */
  const {
    transcript,
    interimTranscript,
    isListening,
    isSupported,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition(selectedLang);

  /* ----------------- Computed Values ----------------- */
  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers.get(currentQuestion.id) : null;
  const currentRanges = currentAnswer?.strikethrough || [];

  /* ----------------- Effects ----------------- */

  // Load exam data on mount
  useEffect(() => {
    fetchExam();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [id]);

  // Reset editing state when question changes
  useEffect(() => {
    if (currentQuestion) {
      const answer = answers.get(currentQuestion.id);
      baseTextRef.current = '';
      resetTranscript();
      setEditingText(answer?.text || '');
      setMode('edit');
    }
  }, [currentQuestion?.id]);

  // Initialize timer
  useEffect(() => {
    if (exam?.time_limit_minutes && timeRemaining === null) {
      setTimeRemaining(exam.time_limit_minutes * 60);
    }
  }, [exam]);

  // Countdown timer
  useEffect(() => {
    if (timeRemaining !== null && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            handleSubmit(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [timeRemaining]);

  // Process incoming transcript - check for voice commands
  useEffect(() => {
    if (!transcript) return;

    const base = baseTextRef.current;
    const sep = base && !base.endsWith(' ') ? ' ' : '';
    const combined = base + sep + transcript;

    const cmd = applyVoiceCommand(combined, currentRanges);
    if (cmd) {
      setEditingText(cmd.text);
      if (currentQuestion) {
        setAnswers(prev => new Map(prev).set(currentQuestion.id, {
          text: cmd.text,
          strikethrough: cmd.ranges,
        }));
      }
      baseTextRef.current = cmd.text;
      resetTranscript();
      announce(cmd.announcement);
    } else {
      setEditingText(combined);
    }
  }, [transcript]);

  /* ----------------- API Functions ----------------- */

  const fetchExam = async () => {
    if (!id) return;
    const { exam: examData } = await apiGetExam(id);
    const { questions: questionsData } = await apiListQuestions(id);
    if (examData) setExam(examData);
    if (questionsData) setQuestions(questionsData);
    setLoading(false);
  };

  /* ----------------- Handlers ----------------- */

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleRecording = () => {
    if (isListening) {
      stopListening();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      baseTextRef.current = editingText;
      resetTranscript();
      startListening();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleClearAnswer = () => {
    if (!currentQuestion) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    baseTextRef.current = '';
    setEditingText('');
    resetTranscript();
    setAnswers(prev => {
      const newMap = new Map(prev);
      newMap.delete(currentQuestion.id);
      return newMap;
    });
    announce('Answer cleared');
  };

  const handleToggleWordStrike = (token: WordToken) => {
    if (!currentQuestion || token.word.trim() === '') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const existing = answers.get(currentQuestion.id) || { text: editingText, strikethrough: [] };
    const alreadyStruck = isWordStruck(token, existing.strikethrough);

    const newRanges = alreadyStruck
      ? existing.strikethrough.filter(r => !(r.start === token.start && r.end === token.end))
      : [...existing.strikethrough, { start: token.start, end: token.end }].sort((a, b) => a.start - b.start);

    setAnswers(prev => new Map(prev).set(currentQuestion.id, {
      text: existing.text,
      strikethrough: newRanges,
    }));
    announce(alreadyStruck ? `Restored: ${token.word}` : `Struck: ${token.word}`);
  };

  const handleStrikeLastWord = useCallback(() => {
    if (!currentQuestion) return;
    const words = tokenizeWords(editingText).filter(t => t.word.trim());
    if (!words.length) { announce('No words to strike'); return; }

    const candidate = [...words].reverse().find(w => !isWordStruck(w, currentRanges));
    if (!candidate) { announce('All words already struck'); return; }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newRanges = [...currentRanges, { start: candidate.start, end: candidate.end }].sort((a, b) => a.start - b.start);
    setAnswers(prev => new Map(prev).set(currentQuestion.id, { text: editingText, strikethrough: newRanges }));
    announce(`Struck: ${candidate.word}`);
  }, [editingText, currentQuestion, currentRanges]);

  const handleStrikeLastSentence = useCallback(() => {
    if (!currentQuestion) return;
    const text = editingText;
    const lastPunct = Math.max(text.lastIndexOf('.'), text.lastIndexOf(','), text.lastIndexOf('?'), text.lastIndexOf('!'));
    const sentenceStart = lastPunct >= 0 ? lastPunct + 1 : 0;
    const sentence = text.slice(sentenceStart).trim();
    if (!sentence) { announce('No sentence to strike'); return; }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const actualStart = text.indexOf(sentence, sentenceStart);
    const newRanges = [...currentRanges, { start: actualStart, end: actualStart + sentence.length }].sort((a, b) => a.start - b.start);
    setAnswers(prev => new Map(prev).set(currentQuestion.id, { text, strikethrough: newRanges }));
    announce('Struck sentence');
  }, [editingText, currentQuestion, currentRanges]);

  const handleUndoStrike = useCallback(() => {
    if (!currentQuestion || !currentRanges.length) { announce('No strike to undo'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newRanges = currentRanges.slice(0, -1);
    setAnswers(prev => new Map(prev).set(currentQuestion.id, { text: editingText, strikethrough: newRanges }));
    announce('Last strike removed');
  }, [currentQuestion, currentRanges, editingText]);

  const handleSaveAnswer = () => {
    if (!currentQuestion) return;
    const existing = answers.get(currentQuestion.id);
    setAnswers(prev => new Map(prev).set(currentQuestion.id, {
      text: editingText,
      strikethrough: existing?.strikethrough || [],
    }));
  };

  const handlePrevQuestion = () => {
    handleSaveAnswer();
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleNextQuestion = () => {
    handleSaveAnswer();
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSubmit = async (auto = false) => {
    if (!exam || !user || !questions.length) return;
    handleSaveAnswer();
    if (!auto) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmitting(true);

    try {
      const { submission, error } = await apiCreateSubmission(exam.id);
      if (error || !submission) throw error;

      for (const question of questions) {
        const answer = answers.get(question.id);
        await apiCreateAnswer({
          submission_id: submission.id,
          question_id: question.id,
          answer_text: answer?.text || '',
          strikethrough_ranges: answer?.strikethrough || [],
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/(student)/submission/${submission.id}`);
    } catch {
      setSubmitting(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  /* ----------------- Render ----------------- */

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary[600]} />
        <Text style={styles.loadingText}>Loading exam...</Text>
      </SafeAreaView>
    );
  }

  if (!exam || !currentQuestion) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Exam not found</Text>
        <SwarlekhButton title="Go Back" onPress={() => router.back()} variant="primary" />
      </SafeAreaView>
    );
  }

  // Derived render values
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const answeredCount = Array.from(answers.values()).filter(a => a.text.trim()).length;
  const displayText = mode === 'strike' ? (currentAnswer?.text || editingText) : editingText;
  const displayRanges = currentRanges;
  const tokens = tokenizeWords(displayText);
  const hasText = displayText.trim().length > 0;
  const struckCount = tokens.filter(t => t.word.trim() && isWordStruck(t, displayRanges)).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => { handleSaveAnswer(); router.back(); }}
          accessibilityLabel="Save and exit"
        >
          <ArrowLeft size={24} color={Colors.text.primary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.subjectTitle}>{exam.subject}</Text>
          {timeRemaining !== null && (
            <View style={styles.timerRow}>
              <Clock size={16} color={timeRemaining < 300 ? Colors.error[500] : Colors.text.secondary} />
              <Text style={[styles.timerText, timeRemaining < 300 && styles.timerWarning]}>
                {formatTime(timeRemaining)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.progressBadge}>
          <Text style={styles.progressBadgeText}>{answeredCount}/{questions.length}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
      </View>

      {/* Main Content */}
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Question Card */}
        <SwarlekhCard style={styles.card}>
          <View style={styles.questionHeader}>
            <View style={styles.questionBadge}>
              <Text style={styles.questionNumber}>Q{currentQuestion.question_number || currentIndex + 1}</Text>
            </View>
            <Text style={styles.marksLabel}>{currentQuestion.marks} marks</Text>
          </View>
          <Text style={styles.questionText}>{currentQuestion.question_text}</Text>
        </SwarlekhCard>

        {/* Answer Card */}
        <SwarlekhCard style={styles.card}>
          {/* Toolbar */}
          <View style={styles.toolbar}>
            <Text style={styles.toolbarTitle}>Your Answer</Text>
            <View style={styles.toolbarButtons}>
              {hasText && (
                <>
                  <TouchableOpacity
                    style={[styles.toolBtn, mode === 'edit' && styles.toolBtnActive]}
                    onPress={() => { handleSaveAnswer(); setMode('edit'); }}
                    accessibilityLabel="Edit mode"
                  >
                    <Edit3 size={16} color={mode === 'edit' ? Colors.neutral[0] : Colors.text.secondary} />
                    <Text style={[styles.toolBtnText, mode === 'edit' && styles.toolBtnTextActive]}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toolBtn, mode === 'strike' && styles.toolBtnStrike]}
                    onPress={() => { handleSaveAnswer(); setMode('strike'); }}
                    accessibilityLabel="Strike mode"
                  >
                    <Strikethrough size={16} color={mode === 'strike' ? Colors.neutral[0] : Colors.text.secondary} />
                    <Text style={[styles.toolBtnText, mode === 'strike' && styles.toolBtnTextActive]}>Strike</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={handleClearAnswer}
                accessibilityLabel="Clear answer"
              >
                <Trash2 size={18} color={Colors.error[500]} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Strike Bar */}
          {hasText && (
            <View style={styles.quickStrikeBar}>
              <Text style={styles.quickStrikeTitle}>Quick Strike {struckCount > 0 ? `(${struckCount})` : ''}</Text>
              <View style={styles.quickStrikeButtons}>
                <TouchableOpacity
                  style={styles.qsBtn}
                  onPress={handleStrikeLastWord}
                  accessibilityLabel="Strike last word"
                >
                  <Scissors size={14} color={Colors.error[600]} />
                  <Text style={styles.qsBtnText}>Word</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.qsBtn}
                  onPress={handleStrikeLastSentence}
                  accessibilityLabel="Strike last sentence"
                >
                  <Scissors size={14} color={Colors.error[600]} />
                  <Text style={styles.qsBtnText}>Sentence</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.qsBtn, !currentRanges.length && styles.qsBtnDisabled]}
                  onPress={handleUndoStrike}
                  disabled={!currentRanges.length}
                  accessibilityLabel="Undo strike"
                >
                  <RotateCcw size={14} color={currentRanges.length ? Colors.primary[600] : Colors.neutral[400]} />
                  <Text style={[styles.qsBtnText, !currentRanges.length && styles.qsBtnTextDisabled]}>Undo</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Voice Command Hint */}
          {isSupported && (
            <View style={styles.voiceHint}>
              <Text style={styles.voiceHintText}>
                Voice: "strike last word", "strike last sentence", "undo strike"
              </Text>
            </View>
          )}

          {/* Answer Input Area */}
          <View style={styles.answerArea}>
            {mode === 'edit' ? (
              <TextInput
                style={styles.textInput}
                value={editingText}
                onChangeText={setEditingText}
                multiline
                placeholder={isSupported ? 'Speak or type your answer...' : 'Type your answer...'}
                placeholderTextColor={Colors.text.tertiary}
                textAlignVertical="top"
                accessibilityLabel="Answer field"
              />
            ) : hasText ? (
              <View style={styles.strikeView}>
                <Text style={styles.strikeText}>
                  {tokens.map((token, i) => {
                    if (!token.word.trim()) return <Text key={i}>{token.word}</Text>;
                    const struck = isWordStruck(token, displayRanges);
                    return (
                      <Text
                        key={i}
                        onPress={() => handleToggleWordStrike(token)}
                        style={struck ? styles.wordStruck : styles.wordNormal}
                        accessibilityLabel={`${token.word}. ${struck ? 'Struck. Tap restore.' : 'Tap to strike.'}`}
                      >
                        {token.word}
                      </Text>
                    );
                  })}
                </Text>
              </View>
            ) : (
              <Text style={styles.emptyHint}>No answer yet. Switch to Edit mode.</Text>
            )}
          </View>

          {hasText && (
            <Text style={styles.charCount}>{displayText.length} characters</Text>
          )}
        </SwarlekhCard>

        {/* Microphone Section */}
        <View style={styles.micSection}>
          {/* Language Picker */}
          {isSupported && !isListening && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.langPicker}
            >
              {supportedLanguages.map(lang => (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.langChip, selectedLang === lang.code && styles.langChipActive]}
                  onPress={() => setSelectedLang(lang.code)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: selectedLang === lang.code }}
                >
                  <Text style={[styles.langChipText, selectedLang === lang.code && styles.langChipTextActive]}>
                    {lang.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Mic Button */}
          <TouchableOpacity
            style={[styles.micBtn, isListening && styles.micBtnActive]}
            onPress={handleToggleRecording}
            accessibilityLabel={isListening ? 'Stop recording' : 'Start recording'}
          >
            {isListening ? <MicOff size={36} color={Colors.neutral[0]} /> : <Mic size={36} color={Colors.neutral[0]} />}
          </TouchableOpacity>

          <Text style={styles.micLabel}>
            {isListening ? 'Tap to stop' : isSupported ? 'Tap to speak' : 'Speech unavailable'}
          </Text>

          {/* Interim Transcript */}
          {isListening && interimTranscript && (
            <View style={styles.interimBox}>
              <Text style={styles.interimText}>{interimTranscript}</Text>
            </View>
          )}

          {speechError && (
            <Text style={styles.errorLabel}>Microphone error. Please type instead.</Text>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Navigation Footer */}
      <View style={styles.footer}>
        <SwarlekhButton
          title="Prev"
          onPress={handlePrevQuestion}
          disabled={currentIndex === 0}
          variant="outline"
          leftIcon={<ChevronLeft size={20} color={Colors.primary[600]} />}
        />

        <View style={styles.dotNav}>
          {questions.map((q, idx) => (
            <TouchableOpacity
              key={q.id}
              onPress={() => { handleSaveAnswer(); setCurrentIndex(idx); }}
              accessibilityLabel={`Question ${idx + 1}`}
            >
              <View style={[
                styles.navDot,
                idx === currentIndex && styles.navDotActive,
                answers.get(q.id)?.text && styles.navDotAnswered,
              ]} />
            </TouchableOpacity>
          ))}
        </View>

        {currentIndex === questions.length - 1 ? (
          <SwarlekhButton
            title="Submit"
            onPress={() => handleSubmit()}
            loading={submitting}
            variant="primary"
            rightIcon={<Check size={20} color={Colors.neutral[0]} />}
          />
        ) : (
          <SwarlekhButton
            title="Next"
            onPress={handleNextQuestion}
            variant="primary"
            rightIcon={<ChevronRight size={20} color={Colors.neutral[0]} />}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

/* =============================================================================
 * Styles
 * ============================================================================= */

const styles = StyleSheet.create({
  // Container
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background.primary },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  loadingText: { marginTop: Spacing.md, fontSize: FontSizes.md, color: Colors.text.secondary },
  errorText: { fontSize: FontSizes.lg, color: Colors.text.primary, marginBottom: Spacing.lg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
  },
  backButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.neutral[100], alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, marginLeft: Spacing.md },
  subjectTitle: { fontSize: FontSizes.lg, fontWeight: '600', color: Colors.text.primary },
  timerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  timerText: { fontSize: FontSizes.sm, color: Colors.text.secondary, marginLeft: 4 },
  timerWarning: { color: Colors.error[500], fontWeight: '600' },
  progressBadge: {
    backgroundColor: Colors.success[100],
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  progressBadgeText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.success[700] },

  // Progress Bar
  progressBarBg: { height: 4, backgroundColor: Colors.neutral[200] },
  progressBarFill: { height: '100%', backgroundColor: Colors.primary[500] },

  // Content
  scrollContent: { flex: 1 },
  card: { margin: Spacing.lg, marginBottom: Spacing.md },
  bottomSpacer: { height: 100 },

  // Question
  questionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  questionBadge: {
    backgroundColor: Colors.primary[100],
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm, marginRight: Spacing.sm,
  },
  questionNumber: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.primary[700] },
  marksLabel: { fontSize: FontSizes.sm, color: Colors.text.secondary },
  questionText: { fontSize: FontSizes.md, color: Colors.text.primary, lineHeight: 22 },

  // Toolbar
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  toolbarTitle: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text.primary },
  toolbarButtons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toolBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
    borderRadius: BorderRadius.sm, borderWidth: 1,
    borderColor: Colors.neutral[300], backgroundColor: Colors.neutral[0],
  },
  toolBtnActive: { backgroundColor: Colors.primary[600], borderColor: Colors.primary[600] },
  toolBtnStrike: { backgroundColor: Colors.error[600], borderColor: Colors.error[600] },
  toolBtnText: { fontSize: FontSizes.xs, fontWeight: '600', color: Colors.text.secondary },
  toolBtnTextActive: { color: Colors.neutral[0] },
  clearBtn: { padding: 4 },

  // Quick Strike Bar
  quickStrikeBar: {
    backgroundColor: Colors.error[50],
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.error[300],
  },
  quickStrikeTitle: {
    fontSize: FontSizes.xs, fontWeight: '700', color: Colors.error[700],
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
  },
  quickStrikeButtons: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  qsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.neutral[0],
    paddingHorizontal: Spacing.sm, paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    borderWidth: 1, borderColor: Colors.error[200],
    minHeight: 44,
  },
  qsBtnDisabled: { borderColor: Colors.neutral[200], backgroundColor: Colors.neutral[50] },
  qsBtnText: { fontSize: FontSizes.sm, fontWeight: '500', color: Colors.error[700] },
  qsBtnTextDisabled: { color: Colors.neutral[400] },

  // Voice Hint
  voiceHint: {
    backgroundColor: Colors.primary[50], borderRadius: BorderRadius.sm,
    padding: Spacing.sm, marginBottom: Spacing.sm,
  },
  voiceHintText: { fontSize: FontSizes.xs, color: Colors.primary[700] },

  // Answer Area
  answerArea: { minHeight: 120 },
  textInput: {
    fontSize: FontSizes.md, color: Colors.text.primary, lineHeight: 24,
    minHeight: 120, textAlignVertical: 'top',
  },
  strikeView: { minHeight: 120 },
  strikeText: { lineHeight: 30, flexWrap: 'wrap' },
  wordNormal: {
    fontSize: FontSizes.md, color: Colors.text.primary,
    backgroundColor: Colors.primary[50], borderRadius: 3,
  },
  wordStruck: {
    fontSize: FontSizes.md, color: Colors.neutral[400],
    textDecorationLine: 'line-through',
    textDecorationColor: Colors.error[600],
    backgroundColor: Colors.error[50], borderRadius: 3,
  },
  emptyHint: { fontSize: FontSizes.md, color: Colors.text.tertiary, fontStyle: 'italic' },
  charCount: { textAlign: 'right', fontSize: FontSizes.xs, color: Colors.text.tertiary, marginTop: Spacing.sm },

  // Mic Section
  micSection: { alignItems: 'center', paddingVertical: Spacing.lg },
  langPicker: { paddingHorizontal: Spacing.lg, gap: 8 },
  langChip: {
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderRadius: BorderRadius.full, borderWidth: 1,
    borderColor: Colors.neutral[300], backgroundColor: Colors.neutral[0],
  },
  langChipActive: { backgroundColor: Colors.primary[600], borderColor: Colors.primary[600] },
  langChipText: { fontSize: FontSizes.xs, fontWeight: '500', color: Colors.text.secondary },
  langChipTextActive: { color: Colors.neutral[0] },
  micBtn: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary[600], alignItems: 'center', justifyContent: 'center',
  },
  micBtnActive: { backgroundColor: Colors.error[500] },
  micLabel: { marginTop: Spacing.sm, fontSize: FontSizes.sm, color: Colors.text.secondary },
  interimBox: {
    marginTop: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary[50], borderRadius: BorderRadius.sm,
  },
  interimText: { fontSize: FontSizes.sm, color: Colors.primary[700], fontStyle: 'italic' },
  errorLabel: { marginTop: Spacing.xs, fontSize: FontSizes.sm, color: Colors.warning[600] },

  // Footer Navigation
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.lg, backgroundColor: Colors.background.primary,
    borderTopWidth: 1, borderTopColor: Colors.neutral[200],
  },
  dotNav: { flexDirection: 'row', gap: 6 },
  navDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.neutral[300] },
  navDotActive: { backgroundColor: Colors.primary[600], width: 24 },
  navDotAnswered: { backgroundColor: Colors.success[500] },
});
