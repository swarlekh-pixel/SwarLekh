import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://tyofxhsxivlosnsgzqsk.supabase.co/functions/v1/api";

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  role: "teacher" | "student";
  roll_number: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ApiExam {
  id: string;
  teacher_id: string;
  subject: string;
  description: string;
  exam_code: string;
  total_marks: number;
  time_limit_minutes: number;
  exam_date: string;
  status: "draft" | "active" | "completed";
  created_at: string;
  updated_at: string;
}

export interface ApiQuestion {
  id: string;
  exam_id: string;
  question_text: string;
  question_number: number;
  marks: number;
  created_at: string;
}

export interface ApiSubmission {
  id: string;
  exam_id: string;
  student_id: string;
  status: "in_progress" | "submitted" | "graded";
  submitted_at: string;
  // ✅ NEW: grading fields
  total_obtained?: number | null;
  remarks?: string | null;
  // ✅ NEW: student info joined from backend
  student?: { name: string; roll_number: string | null } | null;
}

export interface ApiAnswer {
  id: string;
  submission_id: string;
  question_id: string;
  answer_text: string;
  strikethrough_ranges: { start: number; end: number }[];
  // ✅ NEW: per-answer marks from grading
  marks_obtained?: number | null;
  created_at: string;
  updated_at: string;
}

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem("swarlekh_token");
}

async function setToken(token: string) {
  await AsyncStorage.setItem("swarlekh_token", token);
}

async function clearToken() {
  await AsyncStorage.removeItem("swarlekh_token");
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data;
}

/* ─── Auth ─── */

export async function apiSignUp(
  email: string,
  password: string,
  name: string,
  role: "teacher" | "student",
  rollNumber?: string
): Promise<{ user: ApiUser | null; token: string | null; error: Error | null }> {
  try {
    const data = await apiFetch("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, name, role, roll_number: rollNumber }),
    });
    if (data.token) await setToken(data.token);
    return { user: data.user, token: data.token, error: null };
  } catch (e) {
    return { user: null, token: null, error: e as Error };
  }
}

export async function apiSignIn(
  email: string,
  password: string
): Promise<{ user: ApiUser | null; token: string | null; error: Error | null }> {
  try {
    const data = await apiFetch("/auth/signin", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (data.token) await setToken(data.token);
    return { user: data.user, token: data.token, error: null };
  } catch (e) {
    return { user: null, token: null, error: e as Error };
  }
}

export async function apiSignOut() {
  await clearToken();
}

/* ─── Exams ─── */

export async function apiListExams(): Promise<{ exams: ApiExam[] | null; error: Error | null }> {
  try {
    const exams = await apiFetch("/exams");
    return { exams, error: null };
  } catch (e) {
    return { exams: null, error: e as Error };
  }
}

export async function apiCreateExam(body: {
  subject: string;
  description?: string;
  total_marks?: number;
  time_limit_minutes?: number;
  exam_date?: string;
}): Promise<{ exam: ApiExam | null; error: Error | null }> {
  try {
    const data = await apiFetch("/exams", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return { exam: data, error: null };
  } catch (e) {
    return { exam: null, error: e as Error };
  }
}

export async function apiGetExam(id: string): Promise<{ exam: ApiExam | null; error: Error | null }> {
  try {
    const exam = await apiFetch(`/exams/${id}`);
    return { exam, error: null };
  } catch (e) {
    return { exam: null, error: e as Error };
  }
}

export async function apiGetExamByCode(code: string): Promise<{ exam: ApiExam | null; error: Error | null }> {
  try {
    const exam = await apiFetch(`/exams/by-code?code=${encodeURIComponent(code)}`);
    return { exam, error: null };
  } catch (e) {
    return { exam: null, error: e as Error };
  }
}

export async function apiUpdateExam(id: string, body: Partial<ApiExam>): Promise<{ error: Error | null }> {
  try {
    await apiFetch(`/exams/${id}`, { method: "PUT", body: JSON.stringify(body) });
    return { error: null };
  } catch (e) {
    return { error: e as Error };
  }
}

export async function apiDeleteExam(id: string): Promise<{ error: Error | null }> {
  try {
    await apiFetch(`/exams/${id}`, { method: "DELETE" });
    return { error: null };
  } catch (e) {
    return { error: e as Error };
  }
}

/* ─── Questions ─── */

export async function apiListQuestions(examId: string): Promise<{ questions: ApiQuestion[] | null; error: Error | null }> {
  try {
    const questions = await apiFetch(`/exams/${examId}/questions`);
    return { questions, error: null };
  } catch (e) {
    return { questions: null, error: e as Error };
  }
}

export async function apiCreateQuestions(
  examId: string,
  questions: Array<{ question_text: string; question_number?: number; marks?: number }>
): Promise<{ error: Error | null }> {
  try {
    await apiFetch(`/exams/${examId}/questions`, {
      method: "POST",
      body: JSON.stringify({ questions }),
    });
    return { error: null };
  } catch (e) {
    return { error: e as Error };
  }
}

/* ─── Submissions ─── */

export async function apiListSubmissions(examId: string): Promise<{ submissions: ApiSubmission[] | null; error: Error | null }> {
  try {
    const submissions = await apiFetch(`/exams/${examId}/submissions`);
    return { submissions, error: null };
  } catch (e) {
    return { submissions: null, error: e as Error };
  }
}

export async function apiMySubmissions(): Promise<{ submissions: ApiSubmission[] | null; error: Error | null }> {
  try {
    const submissions = await apiFetch("/submissions");
    return { submissions, error: null };
  } catch (e) {
    return { submissions: null, error: e as Error };
  }
}

export async function apiCreateSubmission(examId: string): Promise<{ submission: ApiSubmission | null; error: Error | null }> {
  try {
    const submission = await apiFetch(`/exams/${examId}/submissions`, { method: "POST" });
    return { submission, error: null };
  } catch (e) {
    return { submission: null, error: e as Error };
  }
}

export async function apiGetSubmission(id: string): Promise<{ submission: ApiSubmission | null; error: Error | null }> {
  try {
    const submission = await apiFetch(`/submissions/${id}`);
    return { submission, error: null };
  } catch (e) {
    return { submission: null, error: e as Error };
  }
}

export async function apiUpdateSubmission(id: string, body: Partial<ApiSubmission>): Promise<{ error: Error | null }> {
  try {
    await apiFetch(`/submissions/${id}`, { method: "PUT", body: JSON.stringify(body) });
    return { error: null };
  } catch (e) {
    return { error: e as Error };
  }
}

/* ─── ✅ NEW: Grade submission (teacher only) ─── */

export async function apiGradeSubmission(
  submissionId: string,
  grades: Record<string, number>,
  total_obtained: number,
  remarks?: string
): Promise<{ error: Error | null }> {
  try {
    await apiFetch(`/submissions/${submissionId}/grade`, {
      method: "POST",
      body: JSON.stringify({ grades, total_obtained, remarks }),
    });
    return { error: null };
  } catch (e) {
    return { error: e as Error };
  }
}

/* ─── Answers ─── */

export async function apiCreateAnswer(body: {
  submission_id: string;
  question_id: string;
  answer_text: string;
  strikethrough_ranges?: { start: number; end: number }[];
}): Promise<{ id: string | null; error: Error | null }> {
  try {
    const data = await apiFetch("/answers", { method: "POST", body: JSON.stringify(body) });
    return { id: data.id, error: null };
  } catch (e) {
    return { id: null, error: e as Error };
  }
}

export async function apiListAnswers(submissionId: string): Promise<{ answers: ApiAnswer[] | null; error: Error | null }> {
  try {
    const answers = await apiFetch(`/submissions/${submissionId}/answers`);
    return { answers, error: null };
  } catch (e) {
    return { answers: null, error: e as Error };
  }
}

/* ─── PDF ─── */

export async function apiGeneratePDF(submissionId: string): Promise<{ html: string | null; filename: string | null; error: Error | null }> {
  try {
    const pdfUrl = `${API_URL.replace("/api", "/generate-answer-pdf")}?submission_id=${submissionId}`;
    const token = await getToken();
    const res = await fetch(pdfUrl, {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "PDF generation failed");
    return { html: data.html, filename: data.filename, error: null };
  } catch (e) {
    return { html: null, filename: null, error: e as Error };
  }
}
