import { DbUser, Project, Advance } from './supabase'

export const SEED_USERS: DbUser[] = [
  { id: 'user-owner', name: 'Owner', role: 'owner', pin: '0000', created_at: new Date().toISOString() },
  { id: 'user-balong', name: 'Balong', role: 'worker', pin: '1111', created_at: new Date().toISOString() },
  { id: 'user-warren', name: 'Warren', role: 'worker', pin: '2222', created_at: new Date().toISOString() },
  { id: 'user-carlo', name: 'Carlo', role: 'worker', pin: '3333', created_at: new Date().toISOString() },
  { id: 'user-jr', name: 'JR', role: 'worker', pin: '4444', created_at: new Date().toISOString() },
]

export const SEED_PROJECTS: Project[] = [
  {
    id: 'proj-emcor',
    name: 'EMCOR Signage',
    total_labor: 30000,
    status: 'active',
    created_at: new Date().toISOString(),
    completed_at: null,
  },
]

export const SEED_ADVANCES: Advance[] = [
  {
    id: 'adv-1',
    worker_id: 'user-balong',
    project_id: 'proj-emcor',
    amount: 2000,
    note: 'Cash',
    status: 'approved',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'adv-2',
    worker_id: 'user-jr',
    project_id: 'proj-emcor',
    amount: 3000,
    note: 'GCash',
    status: 'approved',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'adv-3',
    worker_id: 'user-jr',
    project_id: 'proj-emcor',
    amount: 1500,
    note: 'GCash',
    status: 'pending',
    created_at: new Date().toISOString(),
  },
  {
    id: 'adv-4',
    worker_id: 'user-warren',
    project_id: null,
    amount: 1000,
    note: 'Cash',
    status: 'approved',
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
]

const KEY_USERS = 'advance_tracker_mock_users'
const KEY_PROJECTS = 'advance_tracker_mock_projects'
const KEY_ADVANCES = 'advance_tracker_mock_advances'

function getFromStorage<T>(key: string, seed: T): T {
  if (typeof window === 'undefined') return seed
  const raw = localStorage.getItem(key)
  if (!raw) {
    localStorage.setItem(key, JSON.stringify(seed))
    return seed
  }
  try {
    return JSON.parse(raw) as T
  } catch {
    return seed
  }
}

function saveToStorage<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(data))
}

export const mockStore = {
  getUsers: (): DbUser[] => getFromStorage(KEY_USERS, SEED_USERS),
  getProjects: (): Project[] => getFromStorage(KEY_PROJECTS, SEED_PROJECTS),
  getAdvances: (): Advance[] => getFromStorage(KEY_ADVANCES, SEED_ADVANCES),

  findUserByPin: (pin: string): DbUser | undefined => {
    const users = mockStore.getUsers()
    return users.find((u) => u.pin === pin)
  },

  updateUserPin: (userId: string, newPin: string): boolean => {
    const users = mockStore.getUsers()
    const idx = users.findIndex((u) => u.id === userId)
    if (idx === -1) return false
    users[idx].pin = newPin
    saveToStorage(KEY_USERS, users)
    return true
  },

  addProject: (name: string, total_labor: number): Project => {
    const projects = mockStore.getProjects()
    const newProj: Project = {
      id: 'proj-' + Date.now(),
      name,
      total_labor,
      status: 'active',
      created_at: new Date().toISOString(),
      completed_at: null,
    }
    projects.unshift(newProj)
    saveToStorage(KEY_PROJECTS, projects)
    return newProj
  },

  finishProject: (projectId: string): void => {
    const projects = mockStore.getProjects()
    const p = projects.find((x) => x.id === projectId)
    if (p) {
      p.status = 'completed'
      p.completed_at = new Date().toISOString()
      saveToStorage(KEY_PROJECTS, projects)
    }
  },

  addAdvance: (
    worker_id: string,
    project_id: string | null,
    amount: number,
    note: string,
    status: Advance['status'] = 'pending'
  ): Advance => {
    const advances = mockStore.getAdvances()
    const newAdv: Advance = {
      id: 'adv-' + Date.now(),
      worker_id,
      project_id,
      amount,
      note,
      status,
      created_at: new Date().toISOString(),
    }
    advances.unshift(newAdv)
    saveToStorage(KEY_ADVANCES, advances)
    return newAdv
  },

  updateAdvanceStatus: (advanceId: string, status: Advance['status']): void => {
    const advances = mockStore.getAdvances()
    const a = advances.find((x) => x.id === advanceId)
    if (a) {
      a.status = status
      saveToStorage(KEY_ADVANCES, advances)
    }
  },

  settleWorkerNoProjectAdvances: (workerId: string): void => {
    const advances = mockStore.getAdvances()
    for (const a of advances) {
      if (a.worker_id === workerId && a.project_id === null && a.status === 'approved') {
        a.status = 'settled'
      }
    }
    saveToStorage(KEY_ADVANCES, advances)
  },
}
