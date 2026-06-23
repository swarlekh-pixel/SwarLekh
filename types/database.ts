export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string | null;
          name: string;
          role: 'teacher' | 'student';
          roll_number: string | null;
          password_hash: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email?: string | null;
          name: string;
          role: 'teacher' | 'student';
          roll_number?: string | null;
          password_hash: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          name?: string;
          role?: 'teacher' | 'student';
          roll_number?: string | null;
          password_hash?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      exams: {
        Row: {
          id: string;
          teacher_id: string;
          subject: string;
          description: string | null;
          exam_code: string;
          total_marks: number;
          time_limit_minutes: number | null;
          exam_date: string;
          status: 'draft' | 'active' | 'completed';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          subject: string;
          description?: string | null;
          exam_code?: string;
          total_marks: number;
          time_limit_minutes?: number | null;
          exam_date: string;
          status?: 'draft' | 'active' | 'completed';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          teacher_id?: string;
          subject?: string;
          description?: string | null;
          exam_code?: string;
          total_marks?: number;
          time_limit_minutes?: number | null;
          exam_date?: string;
          status?: 'draft' | 'active' | 'completed';
          created_at?: string;
          updated_at?: string;
        };
      };
      questions: {
        Row: {
          id: string;
          exam_id: string;
          question_text: string;
          question_number: number;
          marks: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          exam_id: string;
          question_text: string;
          question_number: number;
          marks: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          exam_id?: string;
          question_text?: string;
          question_number?: number;
          marks?: number;
          created_at?: string;
        };
      };
      submissions: {
        Row: {
          id: string;
          exam_id: string;
          student_id: string;
          status: 'in_progress' | 'submitted' | 'graded';
          submitted_at: string;
        };
        Insert: {
          id?: string;
          exam_id: string;
          student_id: string;
          status?: 'in_progress' | 'submitted' | 'graded';
          submitted_at?: string;
        };
        Update: {
          id?: string;
          exam_id?: string;
          student_id?: string;
          status?: 'in_progress' | 'submitted' | 'graded';
          submitted_at?: string;
        };
      };
      answers: {
        Row: {
          id: string;
          submission_id: string;
          question_id: string;
          answer_text: string;
          strikethrough_ranges: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          submission_id: string;
          question_id: string;
          answer_text: string;
          strikethrough_ranges?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          submission_id?: string;
          question_id?: string;
          answer_text?: string;
          strikethrough_ranges?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

export type User = Database['public']['Tables']['users']['Row'];
export type Exam = Database['public']['Tables']['exams']['Row'];
export type Question = Database['public']['Tables']['questions']['Row'];
export type Submission = Database['public']['Tables']['submissions']['Row'];
export type Answer = Database['public']['Tables']['answers']['Row'];

export interface StrikethroughRange {
  start: number;
  end: number;
}

export interface ExamWithQuestions extends Exam {
  questions: Question[];
}

export interface SubmissionWithAnswers extends Submission {
  answers: (Answer & { question: Question })[];
  student: User;
  exam: Exam;
}
