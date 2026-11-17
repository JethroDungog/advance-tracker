-- ============================================================
--  Advance Tracker — Supabase Schema
--  Run this in the Supabase SQL Editor (project → SQL Editor)
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Tables ───────────────────────────────────────────────────

-- Users (owners + workers)
CREATE TABLE IF NOT EXISTS users (
  id         uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       text        NOT NULL,
  role       text        NOT NULL CHECK (role IN ('owner', 'worker')),
  pin        text        NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id           uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         text         NOT NULL,
  total_labor  numeric(12,2) NOT NULL DEFAULT 0,
  status       text         NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at   timestamptz  NOT NULL DEFAULT now(),
  completed_at timestamptz  NULL
);

-- Advances
CREATE TABLE IF NOT EXISTS advances (
  id          uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id   uuid         NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  project_id  uuid         NULL        REFERENCES projects(id) ON DELETE SET NULL,
  amount      numeric(12,2) NOT NULL,
  note        text         NOT NULL DEFAULT 'Cash',
  status      text         NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'approved', 'declined', 'settled')),
  created_at  timestamptz  NOT NULL DEFAULT now()
);

-- ── Row-Level Security ────────────────────────────────────────
ALTER TABLE users     ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects  ENABLE ROW LEVEL SECURITY;
ALTER TABLE advances  ENABLE ROW LEVEL SECURITY;

-- Allow anon key full access (app handles auth via PIN)
CREATE POLICY "anon_all_users"
  ON users FOR ALL TO anon
  USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_projects"
  ON projects FOR ALL TO anon
  USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_advances"
  ON advances FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- ── Realtime ─────────────────────────────────────────────────
-- Enable realtime for all three tables
ALTER PUBLICATION supabase_realtime ADD TABLE users, projects, advances;

-- ── Seed Data ────────────────────────────────────────────────

-- Users
INSERT INTO users (id, name, role, pin) VALUES
  (uuid_generate_v4(), 'Owner',  'owner',  '0000'),
  (uuid_generate_v4(), 'Balong', 'worker', '1111'),
  (uuid_generate_v4(), 'Warren', 'worker', '2222'),
  (uuid_generate_v4(), 'Carlo',  'worker', '3333'),
  (uuid_generate_v4(), 'JR',     'worker', '4444')
ON CONFLICT (pin) DO NOTHING;

-- Project
INSERT INTO projects (id, name, total_labor, status) VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001', 'EMCOR Signage', 30000, 'active')
ON CONFLICT DO NOTHING;

-- Advances — reference users by pin lookup
-- Balong: 2000 Cash approved on EMCOR
INSERT INTO advances (worker_id, project_id, amount, note, status)
SELECT
  u.id,
  'a1b2c3d4-0000-0000-0000-000000000001',
  2000,
  'Cash',
  'approved'
FROM users u WHERE u.pin = '1111';

-- JR: 3000 GCash approved on EMCOR
INSERT INTO advances (worker_id, project_id, amount, note, status)
SELECT
  u.id,
  'a1b2c3d4-0000-0000-0000-000000000001',
  3000,
  'GCash',
  'approved'
FROM users u WHERE u.pin = '4444';

-- JR: 1500 GCash pending on EMCOR
INSERT INTO advances (worker_id, project_id, amount, note, status)
SELECT
  u.id,
  'a1b2c3d4-0000-0000-0000-000000000001',
  1500,
  'GCash',
  'pending'
FROM users u WHERE u.pin = '4444';

-- Warren: 1000 Cash approved, no project
INSERT INTO advances (worker_id, project_id, amount, note, status)
SELECT
  u.id,
  NULL,
  1000,
  'Cash',
  'approved'
FROM users u WHERE u.pin = '2222';
