# Advance Tracker

A PIN-based advance tracking PWA built with **Next.js 14 App Router**, **Supabase**, and **Tailwind CSS**. Workers and owners log in with a 4-digit PIN to track cash/GCash advances against projects.

---

## 👥 PIN Reference

| Name   | Role   | PIN  |
|--------|--------|------|
| Owner  | Owner  | 0000 |
| Balong | Worker | 1111 |
| Warren | Worker | 2222 |
| Carlo  | Worker | 3333 |
| JR     | Worker | 4444 |

---

## 🗂 Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Framework  | Next.js 14 (App Router)           |
| Styling    | Tailwind CSS 3                    |
| Database   | Supabase (PostgreSQL + Realtime)  |
| Auth       | PIN-based (no password/JWT)       |
| Deployment | Vercel                            |

---

## 🚀 Local Development

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd payment-system
npm install
```

### 2. Configure Environment Variables

Copy the example env file and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

> [!TIP]
> Find these values in your Supabase dashboard under **Project Settings → API**.

### 3. Set Up Supabase Database

1. Go to [supabase.com](https://supabase.com) and open your project.
2. Navigate to **SQL Editor** (left sidebar).
3. Click **New query**.
4. Copy the entire contents of [`supabase/schema.sql`](./supabase/schema.sql) and paste it into the editor.
5. Click **Run** (or press `Ctrl+Enter`).

This will:
- Create the `users`, `projects`, and `advances` tables
- Enable Row Level Security (RLS) with open anon access
- Enable Realtime on all tables
- Seed the database with the 5 users, 1 project, and 4 advances listed above

> [!IMPORTANT]
> Run the SQL only once. If you need to reset, truncate the tables first or use the Supabase dashboard to drop and recreate them.

### 4. Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Build & Production

```bash
npm run build
npm start
```

---

## ☁️ Deploying to Vercel

### Option A — Vercel CLI

```bash
npm i -g vercel
vercel
```

Follow the prompts, then set environment variables:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Option B — Vercel Dashboard

1. Push your code to GitHub (or GitLab / Bitbucket).
2. Go to [vercel.com/new](https://vercel.com/new) and import your repository.
3. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy**.

> [!NOTE]
> Vercel automatically detects Next.js and sets the correct build command (`next build`) and output directory (`.next`).

---

## 📱 PWA / Installable App

The app ships with a [`public/manifest.json`](./public/manifest.json) for PWA support. To make it fully installable:

1. Add icon files to `public/icons/`:
   - `icon-192x192.png`
   - `icon-512x512.png`
2. Deploy to HTTPS (Vercel does this automatically).
3. Users can then tap **"Add to Home Screen"** in their mobile browser.

---

## 🗄 Database Schema

```
users
  id uuid PK | name text | role owner/worker | pin text UNIQUE | created_at

projects
  id uuid PK | name text | total_labor numeric | status active/completed | created_at | completed_at

advances
  id uuid PK | worker_id FK→users | project_id FK→projects (nullable)
  amount numeric | note text | status pending/approved/declined/settled | created_at
```

---

## 🛠 Scripts

| Command       | Description              |
|---------------|--------------------------|
| `npm run dev` | Start dev server         |
| `npm run build` | Production build       |
| `npm start`   | Serve production build   |
| `npm run lint`| Run ESLint               |
