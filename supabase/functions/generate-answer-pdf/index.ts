import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const submissionId = url.searchParams.get("submission_id");

    if (!submissionId) {
      return new Response(
        JSON.stringify({ error: "submission_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: submission, error: subError } = await supabase
      .from("submissions")
      .select("*")
      .eq("id", submissionId)
      .maybeSingle();

    if (subError || !submission) {
      return new Response(
        JSON.stringify({ error: "Submission not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const [studentResult, examResult, answersResult] = await Promise.all([
      supabase.from("users").select("name, roll_number").eq("id", submission.student_id).maybeSingle(),
      supabase.from("exams").select("subject, exam_date, total_marks").eq("id", submission.exam_id).maybeSingle(),
      supabase.from("answers").select("*").eq("submission_id", submissionId),
    ]);

    const student = studentResult.data || { name: "Unknown", roll_number: null };
    const exam = examResult.data || { subject: "Unknown", exam_date: "", total_marks: 0 };
    const answers = answersResult.data || [];

    const questionIds = answers.map((a: any) => a.question_id);
    let questionMap = new Map<string, any>();
    if (questionIds.length > 0) {
      const { data: questions } = await supabase
        .from("questions")
        .select("*")
        .in("id", questionIds)
        .order("question_number", { ascending: true });
      questionMap = new Map((questions || []).map((q: any) => [q.id, q]));
    }

    const html = generateHTMLPDF(student, exam, answers, questionMap, submission.submitted_at);

    return new Response(JSON.stringify({
      html,
      filename: `answer_sheet_${student.roll_number || "student"}_${submissionId.slice(0, 8)}.html`,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function withStrikethrough(text: string, ranges: { start: number; end: number }[]): string {
  if (!text || !ranges || ranges.length === 0) return escapeHtml(text);
  let result = "";
  let lastIndex = 0;
  const sortedRanges = [...ranges].sort((a, b) => a.start - b.start);
  for (const range of sortedRanges) {
    result += escapeHtml(text.slice(lastIndex, range.start));
    result += `<span style="text-decoration: line-through; color: #666;">${escapeHtml(text.slice(range.start, range.end))}</span>`;
    lastIndex = range.end;
  }
  result += escapeHtml(text.slice(lastIndex));
  return result;
}

function generateHTMLPDF(
  student: { name: string; roll_number: string | null },
  exam: { subject: string; exam_date: string; total_marks: number },
  answers: any[],
  questionMap: Map<string, any>,
  submittedAt: string,
): string {
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const answersHtml = answers.map((answer) => {
    const question = questionMap.get(answer.question_id);
    if (!question) return "";
    return `
      <div class="question-block" style="margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #e0e0e0;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
          <span style="background: #e3f2fd; padding: 4px 12px; border-radius: 4px; font-weight: 600; color: #1565c0;">
            Q${question.question_number}
          </span>
          <span style="color: #666; font-size: 14px;">[${question.marks} marks]</span>
        </div>
        <p style="font-weight: 500; margin-bottom: 15px; line-height: 1.6;">
          ${escapeHtml(question.question_text)}
        </p>
        <div style="background: #fafafa; padding: 15px; border-radius: 8px; border-left: 3px solid #1565c0;">
          <p style="font-size: 12px; color: #666; margin-bottom: 8px;">Answer:</p>
          <p style="line-height: 1.8; white-space: pre-wrap;">
            ${answer.answer_text ? withStrikethrough(answer.answer_text, answer.strikethrough_ranges || []) : '<em style="color: #999;">No answer provided</em>'}
          </p>
        </div>
      </div>
    `;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Answer Sheet - ${escapeHtml(student.name)}</title>
  <style>
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } .no-print { display: none; } }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 40px 20px; background: #fff; }
    .header { text-align: center; padding-bottom: 30px; border-bottom: 3px solid #1565c0; margin-bottom: 30px; }
    .logo { font-size: 28px; font-weight: 700; color: #1565c0; margin-bottom: 5px; }
    .student-info { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; padding: 25px; background: #f8f9fa; border-radius: 12px; margin-bottom: 30px; }
    .question-block { page-break-inside: avoid; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e0e0e0; text-align: center; color: #666; font-size: 12px; }
    button { position: fixed; top: 20px; right: 20px; background: #1565c0; color: white; padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; box-shadow: 0 4px 12px rgba(21, 101, 192, 0.3); }
  </style>
</head>
<body>
  <button class="no-print" onclick="window.print()">Print / Save as PDF</button>
  <div class="header">
    <div class="logo">SwarLekh</div>
    <div style="margin-top: 8px; font-size: 13px; color: #888;">Accessible Exam Answer Sheet</div>
  </div>
  <div class="student-info">
    <div><div style="font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 4px;">Student Name</div><div style="font-weight: 600;">${escapeHtml(student.name)}</div></div>
    <div><div style="font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 4px;">Roll Number</div><div style="font-weight: 600;">${escapeHtml(student.roll_number || "N/A")}</div></div>
    <div><div style="font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 4px;">Subject</div><div style="font-weight: 600;">${escapeHtml(exam.subject)}</div></div>
    <div><div style="font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 4px;">Exam Date</div><div style="font-weight: 600;">${formatDate(exam.exam_date)}</div></div>
    <div><div style="font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 4px;">Submitted On</div><div style="font-weight: 600;">${formatDate(submittedAt)}</div></div>
    <div><div style="font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 4px;">Total Marks</div><div style="font-weight: 600;">${exam.total_marks}</div></div>
  </div>
  <div style="margin-bottom: 20px;"><div style="font-size: 22px; font-weight: 600; color: #1565c0;">Answer Sheet</div></div>
  <div class="questions">${answersHtml}</div>
  <div class="footer">Generated by SwarLekh Accessible Exam Platform</div>
</body>
</html>`;
}
