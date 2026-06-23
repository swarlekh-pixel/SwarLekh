-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (handles both teachers and students)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
  roll_number TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exams table
CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  description TEXT,
  exam_code TEXT UNIQUE NOT NULL DEFAULT UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 6)),
  total_marks INTEGER NOT NULL,
  time_limit_minutes INTEGER,
  exam_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Questions table
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_number INTEGER NOT NULL,
  marks INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Submissions table
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('in_progress', 'submitted', 'graded')),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exam_id, student_id)
);

-- Answers table
CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  strikethrough_ranges JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(submission_id, question_id)
);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- Policies for users table
CREATE POLICY "users_select_own" ON users FOR SELECT
  TO authenticated USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON users FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own" ON users FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- For registration, allow anonymous insert
CREATE POLICY "users_insert_anon" ON users FOR INSERT
  TO anon WITH CHECK (true);

-- Policies for exams (teachers can CRUD their own, students can read active)
CREATE POLICY "exams_teacher_select" ON exams FOR SELECT
  TO authenticated USING (
    teacher_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'student')
  );

CREATE POLICY "exams_teacher_insert" ON exams FOR INSERT
  TO authenticated WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "exams_teacher_update" ON exams FOR UPDATE
  TO authenticated USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "exams_teacher_delete" ON exams FOR DELETE
  TO authenticated USING (teacher_id = auth.uid());

-- Policies for questions (follow exam permissions)
CREATE POLICY "questions_select" ON questions FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM exams 
      WHERE exams.id = questions.exam_id 
      AND (exams.teacher_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'student'))
    )
  );

CREATE POLICY "questions_insert" ON questions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM exams WHERE exams.id = questions.exam_id AND exams.teacher_id = auth.uid())
  );

CREATE POLICY "questions_delete" ON questions FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM exams WHERE exams.id = questions.exam_id AND exams.teacher_id = auth.uid())
  );

-- Policies for submissions
CREATE POLICY "submissions_student_select" ON submissions FOR SELECT
  TO authenticated USING (student_id = auth.uid());

CREATE POLICY "submissions_teacher_select" ON submissions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM exams WHERE exams.id = submissions.exam_id AND exams.teacher_id = auth.uid())
  );

CREATE POLICY "submissions_student_insert" ON submissions FOR INSERT
  TO authenticated WITH CHECK (student_id = auth.uid());

CREATE POLICY "submissions_student_update" ON submissions FOR UPDATE
  TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- Policies for answers
CREATE POLICY "answers_select" ON answers FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM submissions 
      WHERE submissions.id = answers.submission_id 
      AND (submissions.student_id = auth.uid() OR EXISTS (SELECT 1 FROM exams WHERE exams.id = submissions.exam_id AND exams.teacher_id = auth.uid()))
    )
  );

CREATE POLICY "answers_insert" ON answers FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM submissions WHERE submissions.id = answers.submission_id AND submissions.student_id = auth.uid())
  );

CREATE POLICY "answers_update" ON answers FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM submissions WHERE submissions.id = answers.submission_id AND submissions.student_id = auth.uid())
  );

-- Create indexes for better query performance
CREATE INDEX idx_exams_teacher ON exams(teacher_id);
CREATE INDEX idx_exams_code ON exams(exam_code);
CREATE INDEX idx_questions_exam ON questions(exam_id);
CREATE INDEX idx_submissions_exam ON submissions(exam_id);
CREATE INDEX idx_submissions_student ON submissions(student_id);
CREATE INDEX idx_answers_submission ON answers(submission_id);

-- Function to handle user creation via auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, password_hash)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    'auth_managed'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;