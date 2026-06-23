# Supabase Database Migration for Grading Feature

Run these SQL commands in your Supabase SQL Editor (Dashboard > SQL Editor):

```sql
-- Add grading columns to submissions table
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS total_obtained NUMERIC,
  ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Add marks_obtained column to answers table
ALTER TABLE answers
  ADD COLUMN IF NOT EXISTS marks_obtained NUMERIC;
```

Also add the JWT secret to your Supabase Edge Function secrets:
  Dashboard > Edge Functions > Manage secrets
  Key: SWARLEKH_JWT_SECRET
  Value: (use a long random string, e.g. openssl rand -hex 32)

