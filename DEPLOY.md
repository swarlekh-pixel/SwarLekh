# Deployment Guide for SwarLekh

## Architecture Overview

| Layer | Service | Status |
|-------|---------|--------|
| Database | Supabase PostgreSQL | ALREADY DEPLOYED |
| Backend (API) | Supabase Edge Functions | ALREADY DEPLOYED |
| Frontend | Expo Web (React) | Deploy to Netlify or Vercel |

---

## IMPORTANT: Database & Backend are ALREADY live

Your Supabase project at https://tyofxhsxivlosnsgzqsk.supabase.co is fully deployed:
- 5 Edge Functions active (api, generate-answer-pdf, transcribe, reset-password, test-simple)
- 5 tables with data (users, exams, questions, submissions, answers)
- Row Level Security enabled on all tables

You only need to deploy the FRONTEND.

---

## Option A: Deploy to Netlify (Easiest)

### Step 1: Create account
Go to https://app.netlify.com and sign up with GitHub/Google/email

### Step 2: Upload via drag & drop (No code required)
1. Run `npm run build:web` to generate the `dist` folder
2. Go to https://app.netlify.com/drop
3. Drag the entire `dist` folder onto the page
4. Your site is live instantly!

### Step 3: Add Environment Variables
1. Go to Site Settings > Environment Variables
2. Click "Add a variable"
3. Add these 3 variables:
   - Key: EXPO_PUBLIC_API_URL
     Value: https://tyofxhsxivlosnsgzqsk.supabase.co/functions/v1/api
   - Key: EXPO_PUBLIC_SUPABASE_ANON_KEY
     Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnY3duZ2N6cXh2dXl5bXNycnhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMDIwMjQsImV4cCI6MjA5NzY3ODAyNH0.hm7JhqslzJLDHJB12RgLSamTC3sTReDCU6dRwzFwZJA
   - Key: EXPO_PUBLIC_SUPABASE_URL
     Value: https://tyofxhsxivlosnsgzqsk.supabase.co

### Step 4: Trigger Redeploy
After adding env vars, go to Deploys > Trigger Deploy > Deploy site

### Step 5 (Optional): Connect Git for auto-deploys
If you want automatic deployments on every code push:
1. Push project to GitHub
2. Netlify > Add new site > Import from Git
3. Build command: npm run build:web
4. Publish directory: dist
5. Add environment variables as above

---

## Option B: Deploy to Vercel

### Via CLI
1. npm install -g vercel
2. vercel login
3. vercel --prod
4. Add env vars in Vercel Dashboard > Project > Settings > Environment Variables

### Via Dashboard
1. Push to GitHub
2. Go to https://vercel.com/new
3. Import repository
4. Build command: npm run build:web
5. Output directory: dist
6. Add environment variables
7. Deploy

---

## Option C: Deploy to Render

1. Push code to GitHub
2. Go to https://dashboard.render.com
3. New > Static Site
4. Connect your repo
5. Build command: npm run build:web
6. Publish directory: dist
7. Add environment variables under Environment section
8. Save and Deploy

---

## Environment Variables (same for all platforms)

EXPO_PUBLIC_API_URL=https://tyofxhsxivlosnsgzqsk.supabase.co/functions/v1/api
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnY3duZ2N6cXh2dXl5bXNycnhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMDIwMjQsImV4cCI6MjA5NzY3ODAyNH0.hm7JhqslzJLDHJB12RgLSamTC3sTReDCU6dRwzFwZJA
EXPO_PUBLIC_SUPABASE_URL=https://tyofxhsxivlosnsgzqsk.supabase.co
