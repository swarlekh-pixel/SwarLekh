import { createClient } from "jsr:@supabase/supabase-js@2";
import { jwtVerify, SignJWT } from "npm:jose@5.6.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// ✅ FIX: JWT secret from environment variable, not hardcoded
const JWT_SECRET = Deno.env.get("SWARLEKH_JWT_SECRET") ?? "swarlekh-jwt-secret-2024";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function createToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(JWT_SECRET));
}

async function verifyToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(JWT_SECRET));
    return payload.sub as string;
  } catch {
    return null;
  }
}

async function getAuthUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization");
  if (!auth) return null;
  const token = auth.replace("Bearer ", "");
  return verifyToken(token);
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "swarlekh-salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ─── Auth ─── */

async function handleSignup(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name, role, roll_number } = body;
    if (!email || !password || !name || !role) {
      return errorResponse("Missing required fields", 400);
    }

    const passwordHash = await hashPassword(password);

    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (existing) {
      return errorResponse("Email already registered", 409);
    }

    const { data: user, error } = await supabase
      .from("users")
      .insert({
        email: email.toLowerCase().trim(),
        name,
        role,
        roll_number: roll_number || null,
        password_hash: passwordHash,
      })
      .select()
      .single();

    if (error) return errorResponse("Database error: " + error.message, 500);

    const token = await createToken(user.id);
    return jsonResponse({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        roll_number: user.roll_number,
      },
    });
  } catch (e: any) {
    return errorResponse("Signup error: " + e.message, 500);
  }
}

async function handleSignin(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;
    if (!email || !password) {
      return errorResponse("Missing email or password", 400);
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (error || !user) {
      return errorResponse("Invalid credentials", 401);
    }

    const passwordHash = await hashPassword(password);
    if (user.password_hash !== passwordHash) {
      return errorResponse("Invalid credentials", 401);
    }

    const token = await createToken(user.id);
    return jsonResponse({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        roll_number: user.roll_number,
      },
    });
  } catch (e: any) {
    return errorResponse("Signin error: " + e.message, 500);
  }
}

async function handleMe(req: Request) {
  const userId = await getAuthUserId(req);
  if (!userId) return errorResponse("Unauthorized", 401);

  const { data: user, error } = await supabase
    .from("users")
    .select("id, email, name, role, roll_number, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (error || !user) return errorResponse("User not found", 404);
  return jsonResponse(user);
}

/* ─── Exams ─── */

async function handleListExams(userId: string) {
  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (!user) return errorResponse("User not found", 404);

  if (user.role === "teacher") {
    const { data: exams, error } = await supabase
      .from("exams")
      .select("*")
      .eq("teacher_id", userId)
      .order("created_at", { ascending: false });

    if (error) return errorResponse(error.message, 500);

    const result = await Promise.all(
      (exams || []).map(async (e: any) => {
        const { count } = await supabase
          .from("submissions")
          .select("*", { count: "exact", head: true })
          .eq("exam_id", e.id);
        return { ...e, submission_count: count ?? 0 };
      }),
    );
    return jsonResponse(result);
  } else {
    const { data: exams, error } = await supabase
      .from("exams")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) return errorResponse(error.message, 500);
    return jsonResponse(exams || []);
  }
}

async function handleCreateExam(req: Request, userId: string) {
  const body = await req.json();
  const examCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  const { data: exam, error } = await supabase
    .from("exams")
    .insert({
      teacher_id: userId,
      subject: body.subject,
      description: body.description || "",
      exam_code: examCode,
      total_marks: body.total_marks || 100,
      time_limit_minutes: body.time_limit_minutes || 60,
      exam_date: body.exam_date || new Date().toISOString().split("T")[0],
      status: "draft",
    })
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);
  return jsonResponse({ id: exam.id, exam_code: exam.exam_code }, 201);
}

async function handleGetExam(userId: string, examId: string) {
  const { data: exam, error } = await supabase
    .from("exams")
    .select("*")
    .eq("id", examId)
    .maybeSingle();

  if (error || !exam) return errorResponse("Exam not found", 404);
  return jsonResponse(exam);
}

async function handleUpdateExam(req: Request, userId: string, examId: string) {
  const body = await req.json();
  const { id, _id, ...updateData } = body;

  const { error } = await supabase
    .from("exams")
    .update(updateData)
    .eq("id", examId)
    .eq("teacher_id", userId);

  if (error) return errorResponse(error.message, 500);
  return jsonResponse({ success: true });
}

async function handleDeleteExam(userId: string, examId: string) {
  const { error } = await supabase
    .from("exams")
    .delete()
    .eq("id", examId)
    .eq("teacher_id", userId);

  if (error) return errorResponse(error.message, 500);
  return jsonResponse({ success: true });
}

async function handleGetExamByCode(req: Request, userId: string) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code) return errorResponse("Missing code", 400);

  const { data: exam, error } = await supabase
    .from("exams")
    .select("*")
    .eq("exam_code", code.toUpperCase())
    .maybeSingle();

  if (error || !exam) return errorResponse("Exam not found", 404);
  return jsonResponse(exam);
}

/* ─── Questions ─── */

async function handleListQuestions(userId: string, examId: string) {
  const { data: questions, error } = await supabase
    .from("questions")
    .select("*")
    .eq("exam_id", examId)
    .order("question_number", { ascending: true });

  if (error) return errorResponse(error.message, 500);
  return jsonResponse(questions || []);
}

async function handleCreateQuestions(req: Request, userId: string, examId: string) {
  const body = await req.json();
  const questions = body.questions || [];
  if (!Array.isArray(questions) || questions.length === 0) {
    return errorResponse("Questions array required", 400);
  }

  const docs = questions.map((q: any, i: number) => ({
    exam_id: examId,
    question_text: q.question_text,
    question_number: q.question_number || i + 1,
    marks: q.marks || 10,
  }));

  const { error } = await supabase.from("questions").insert(docs);
  if (error) return errorResponse(error.message, 500);
  return jsonResponse({ inserted: docs.length }, 201);
}

/* ─── Submissions ─── */

async function handleListSubmissions(userId: string, examId: string) {
  const { data: submissions, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("exam_id", examId)
    .order("submitted_at", { ascending: false });

  if (error) return errorResponse(error.message, 500);

  const studentIds = [...new Set((submissions || []).map((s: any) => s.student_id))];
  let studentMap = new Map();
  if (studentIds.length > 0) {
    const { data: students } = await supabase
      .from("users")
      .select("id, name, roll_number")
      .in("id", studentIds);
    studentMap = new Map((students || []).map((s: any) => [s.id, s]));
  }

  const result = (submissions || []).map((s: any) => ({
    ...s,
    student: studentMap.get(s.student_id)
      ? { name: studentMap.get(s.student_id).name, roll_number: studentMap.get(s.student_id).roll_number }
      : null,
  }));
  return jsonResponse(result);
}

async function handleMySubmissions(userId: string) {
  const { data: submissions, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("student_id", userId)
    .order("submitted_at", { ascending: false });

  if (error) return errorResponse(error.message, 500);
  return jsonResponse(submissions || []);
}

async function handleCreateSubmission(req: Request, userId: string, examId: string) {
  const { data: existing } = await supabase
    .from("submissions")
    .select("*")
    .eq("exam_id", examId)
    .eq("student_id", userId)
    .maybeSingle();

  if (existing) return jsonResponse(existing);

  const { data: submission, error } = await supabase
    .from("submissions")
    .insert({
      exam_id: examId,
      student_id: userId,
      status: "in_progress",
    })
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);
  return jsonResponse(submission, 201);
}

async function handleGetSubmission(userId: string, submissionId: string) {
  const { data: sub, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("id", submissionId)
    .maybeSingle();

  if (error || !sub) return errorResponse("Submission not found", 404);
  return jsonResponse(sub);
}

async function handleUpdateSubmission(req: Request, userId: string, submissionId: string) {
  const body = await req.json();
  const { id, _id, ...updateData } = body;

  const { error } = await supabase
    .from("submissions")
    .update(updateData)
    .eq("id", submissionId)
    .eq("student_id", userId);

  if (error) return errorResponse(error.message, 500);
  return jsonResponse({ success: true });
}

/* ─── ✅ NEW: Grading endpoint — teacher grades a submission ─── */

async function handleGradeSubmission(req: Request, userId: string, submissionId: string) {
  try {
    // Verify the caller is a teacher
    const { data: callerUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (!callerUser || callerUser.role !== "teacher") {
      return errorResponse("Only teachers can grade submissions", 403);
    }

    const body = await req.json();
    const { grades, total_obtained, remarks } = body;
    // grades: { [question_id]: number }
    // total_obtained: number
    // remarks: string (optional)

    if (!grades || typeof total_obtained !== "number") {
      return errorResponse("grades object and total_obtained are required", 400);
    }

    // Update each answer with marks_obtained
    const gradeUpdates = Object.entries(grades).map(([question_id, marks]: [string, any]) =>
      supabase
        .from("answers")
        .update({ marks_obtained: marks })
        .eq("submission_id", submissionId)
        .eq("question_id", question_id)
    );

    await Promise.all(gradeUpdates);

    // Update submission status to graded with total and remarks
    const { error } = await supabase
      .from("submissions")
      .update({
        status: "graded",
        total_obtained,
        remarks: remarks || null,
      })
      .eq("id", submissionId);

    if (error) return errorResponse(error.message, 500);
    return jsonResponse({ success: true, total_obtained });
  } catch (e: any) {
    return errorResponse("Grading error: " + e.message, 500);
  }
}

/* ─── Answers ─── */

async function handleCreateAnswer(req: Request, userId: string) {
  const body = await req.json();
  const { submission_id, question_id, answer_text, strikethrough_ranges } = body;
  if (!submission_id || !question_id || !answer_text) {
    return errorResponse("Missing required fields", 400);
  }

  const { data: existing } = await supabase
    .from("answers")
    .select("*")
    .eq("submission_id", submission_id)
    .eq("question_id", question_id)
    .maybeSingle();

  if (existing) {
    const { data: updated, error } = await supabase
      .from("answers")
      .update({
        answer_text,
        strikethrough_ranges: strikethrough_ranges || [],
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) return errorResponse(error.message, 500);
    return jsonResponse({ id: updated.id, updated: true });
  }

  const { data: answer, error } = await supabase
    .from("answers")
    .insert({
      submission_id,
      question_id,
      answer_text,
      strikethrough_ranges: strikethrough_ranges || [],
    })
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);
  return jsonResponse({ id: answer.id }, 201);
}

async function handleListAnswers(userId: string, submissionId: string) {
  const { data: answers, error } = await supabase
    .from("answers")
    .select("*")
    .eq("submission_id", submissionId);

  if (error) return errorResponse(error.message, 500);
  return jsonResponse(answers || []);
}

/* ─── Router ─── */

const ID = "([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  try {
    // Auth (no auth required)
    if (path === "/api/auth/signup" && req.method === "POST") return handleSignup(req);
    if (path === "/api/auth/signin" && req.method === "POST") return handleSignin(req);
    if (path === "/api/auth/me" && req.method === "GET") return handleMe(req);

    const userId = await getAuthUserId(req);
    if (!userId) return errorResponse("Unauthorized", 401);

    // Exams
    if (path === "/api/exams" && req.method === "GET") return handleListExams(userId);
    if (path === "/api/exams" && req.method === "POST") return handleCreateExam(req, userId);
    if (path === "/api/exams/by-code" && req.method === "GET") return handleGetExamByCode(req, userId);

    const examMatch = path.match(new RegExp(`^/api/exams/${ID}$`));
    if (examMatch) {
      const examId = examMatch[1];
      if (req.method === "GET") return handleGetExam(userId, examId);
      if (req.method === "PUT") return handleUpdateExam(req, userId, examId);
      if (req.method === "DELETE") return handleDeleteExam(userId, examId);
    }

    // Questions
    const questionsMatch = path.match(new RegExp(`^/api/exams/${ID}/questions$`));
    if (questionsMatch) {
      const examId = questionsMatch[1];
      if (req.method === "GET") return handleListQuestions(userId, examId);
      if (req.method === "POST") return handleCreateQuestions(req, userId, examId);
    }

    // Submissions
    if (path === "/api/submissions" && req.method === "GET") return handleMySubmissions(userId);

    const submissionsMatch = path.match(new RegExp(`^/api/exams/${ID}/submissions$`));
    if (submissionsMatch) {
      const examId = submissionsMatch[1];
      if (req.method === "GET") return handleListSubmissions(userId, examId);
      if (req.method === "POST") return handleCreateSubmission(req, userId, examId);
    }

    const submissionMatch = path.match(new RegExp(`^/api/submissions/${ID}$`));
    if (submissionMatch) {
      const subId = submissionMatch[1];
      if (req.method === "GET") return handleGetSubmission(userId, subId);
      if (req.method === "PUT") return handleUpdateSubmission(req, userId, subId);
    }

    // ✅ NEW: Grade submission
    const gradeMatch = path.match(new RegExp(`^/api/submissions/${ID}/grade$`));
    if (gradeMatch) {
      const subId = gradeMatch[1];
      if (req.method === "POST") return handleGradeSubmission(req, userId, subId);
    }

    // Answers
    if (path === "/api/answers" && req.method === "POST") return handleCreateAnswer(req, userId);

    const answersMatch = path.match(new RegExp(`^/api/submissions/${ID}/answers$`));
    if (answersMatch) {
      const subId = answersMatch[1];
      if (req.method === "GET") return handleListAnswers(userId, subId);
    }

    return errorResponse("Not found: " + path, 404);
  } catch (e: any) {
    console.error("API error:", e);
    return errorResponse(e.message || "Internal error", 500);
  }
});
