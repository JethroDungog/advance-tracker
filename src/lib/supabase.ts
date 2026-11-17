import { createClient } from '@supabase/supabase-js'

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder') &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('placeholder')
)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── TypeScript interfaces ───────────────────────────────────────────────────

export interface DbUser {
  id: string            // uuid
  name: string
  role: 'owner' | 'worker'
  pin: string           // stored as text; unique
  created_at: string    // timestamptz
}

export interface Project {
  id: string            // uuid
  name: string
  total_labor: number   // numeric(12,2)
  status: 'active' | 'completed'
  created_at: string
  completed_at: string | null
}

export interface Advance {
  id: string            // uuid
  worker_id: string     // uuid FK → users
  project_id: string | null  // uuid FK → projects (nullable)
  amount: number        // numeric(12,2)
  note: string          // default 'Cash'
  status: 'pending' | 'approved' | 'declined' | 'settled'
  created_at: string
  // joined fields (optional, populated by queries)
  worker?: DbUser
  project?: Project | null
}

// ─── Supabase DB type helper ─────────────────────────────────────────────────

export type Database = {
  public: {
    Tables: {
      users: {
        Row: DbUser
        Insert: Omit<DbUser, 'created_at'> & { created_at?: string }
        Update: Partial<DbUser>
      }
      projects: {
        Row: Project
        Insert: Omit<Project, 'created_at' | 'completed_at'> & {
          created_at?: string
          completed_at?: string | null
        }
        Update: Partial<Project>
      }
      advances: {
        Row: Advance
        Insert: Omit<Advance, 'created_at'> & { created_at?: string }
        Update: Partial<Advance>
      }
    }
  }
}
