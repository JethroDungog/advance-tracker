'use client'

import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { supabase, DbUser, Project, Advance, isSupabaseConfigured } from '@/lib/supabase'
import { mockStore } from '@/lib/mockStore'
import { formatPeso, formatDateTime, formatDate } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface AdvanceWithRelations extends Advance {
  worker_name: string
  project_name: string | null
}

interface OwnerDashboardProps {
  user: DbUser
  onLogout: () => void
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Advance['status'] }) {
  const styles: Record<Advance['status'], string> = {
    pending: 'bg-amber-100 text-amber-800 border border-amber-300',
    approved: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
    declined: 'bg-rose-100 text-rose-800 border border-rose-300',
    settled: 'bg-slate-100 text-slate-700 border border-slate-300',
  }
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${styles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// ─── Modal Wrapper ────────────────────────────────────────────────────────────

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
        {children}
      </div>
    </div>
  )
}

// ─── NewProjectModal ──────────────────────────────────────────────────────────

function NewProjectModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)

  const quickAmounts = [5000, 10000, 20000]

  async function handleSave() {
    if (!name.trim()) { toast.error('Project name is required'); return }
    const labor = parseFloat(amount)
    if (isNaN(labor) || labor <= 0) { toast.error('Enter a valid labor budget'); return }
    setSaving(true)

    if (!isSupabaseConfigured) {
      mockStore.addProject(name.trim(), labor)
      setSaving(false)
      toast.success('Project created!')
      onSaved()
      onClose()
      return
    }

    const { error } = await supabase.from('projects').insert({
      name: name.trim(),
      total_labor: labor,
      status: 'active',
    })
    setSaving(false)
    if (error) { toast.error('Failed to create project: ' + error.message); return }
    toast.success('Project created!')
    onSaved()
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">New Signage Project</h2>

      <label className="block mb-2 text-sm font-semibold text-slate-700">Project Name</label>
      <input
        className="w-full border border-slate-300 rounded-xl px-4 py-3 text-lg text-slate-900 mb-5 focus:outline-none focus:ring-2 focus:ring-slate-500"
        placeholder="e.g. EMCOR Signage"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <label className="block mb-2 text-sm font-semibold text-slate-700">Total Labor Budget (₱)</label>
      <input
        type="number"
        className="w-full border border-slate-300 rounded-xl px-4 py-3 text-lg text-slate-900 mb-3 focus:outline-none focus:ring-2 focus:ring-slate-500"
        placeholder="0"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <div className="flex gap-2 mb-6">
        {quickAmounts.map((q) => (
          <button
            key={q}
            onClick={() => setAmount((prev) => String((parseFloat(prev) || 0) + q))}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl py-2 text-sm transition-colors"
          >
            +{formatPeso(q).replace('.00', '')}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl py-4 text-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl py-4 text-lg transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Project'}
        </button>
      </div>
    </Modal>
  )
}

// ─── GiveAdvanceModal ─────────────────────────────────────────────────────────

function GiveAdvanceModal({
  onClose,
  onSaved,
  workers,
  projects,
}: {
  onClose: () => void
  onSaved: () => void
  workers: DbUser[]
  projects: Project[]
}) {
  const [workerId, setWorkerId] = useState(workers[0]?.id ?? '')
  const [projectId, setProjectId] = useState<string>('none')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<'Cash' | 'GCash'>('Cash')
  const [saving, setSaving] = useState(false)

  const quickAmounts = [500, 1000, 2000, 5000]
  const activeProjects = projects.filter((p) => p.status === 'active')

  async function handleSave() {
    const amt = parseFloat(amount)
    if (!workerId) { toast.error('Select a worker'); return }
    if (isNaN(amt) || amt <= 0) { toast.error('Enter a valid amount'); return }
    setSaving(true)

    if (!isSupabaseConfigured) {
      mockStore.addAdvance(workerId, projectId === 'none' ? null : projectId, amt, method, 'approved')
      setSaving(false)
      toast.success('Advance recorded!')
      onSaved()
      onClose()
      return
    }

    const { error } = await supabase.from('advances').insert({
      worker_id: workerId,
      project_id: projectId === 'none' ? null : projectId,
      amount: amt,
      note: method,
      status: 'approved',
    })
    setSaving(false)
    if (error) { toast.error('Failed to give advance: ' + error.message); return }
    toast.success('Advance recorded!')
    onSaved()
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Give Advance (In Person)</h2>

      <label className="block mb-2 text-sm font-semibold text-slate-700">Worker</label>
      <select
        className="w-full border border-slate-300 rounded-xl px-4 py-3 text-lg text-slate-900 mb-5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        value={workerId}
        onChange={(e) => setWorkerId(e.target.value)}
      >
        {workers.map((w) => (
          <option key={w.id} value={w.id}>{w.name}</option>
        ))}
      </select>

      <label className="block mb-2 text-sm font-semibold text-slate-700">Project</label>
      <select
        className="w-full border border-slate-300 rounded-xl px-4 py-3 text-lg text-slate-900 mb-5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        value={projectId}
        onChange={(e) => setProjectId(e.target.value)}
      >
        <option value="none">No Project</option>
        {activeProjects.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      <label className="block mb-2 text-sm font-semibold text-slate-700">Amount (₱)</label>
      <input
        type="number"
        className="w-full border border-slate-300 rounded-xl px-4 py-3 text-lg text-slate-900 mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        placeholder="0"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <div className="flex gap-2 mb-5">
        {quickAmounts.map((q) => (
          <button
            key={q}
            onClick={() => setAmount((prev) => String((parseFloat(prev) || 0) + q))}
            className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold rounded-xl py-2 text-sm transition-colors border border-emerald-200"
          >
            +₱{q.toLocaleString()}
          </button>
        ))}
      </div>

      <label className="block mb-2 text-sm font-semibold text-slate-700">Payment Method</label>
      <div className="flex gap-3 mb-6">
        {(['Cash', 'GCash'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMethod(m)}
            className={`flex-1 py-4 rounded-xl text-lg font-bold transition-colors ${
              method === m
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl py-4 text-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl py-4 text-lg transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Give Advance'}
        </button>
      </div>
    </Modal>
  )
}

// ─── ManagePINsModal ──────────────────────────────────────────────────────────

function ManagePINsModal({
  onClose,
  ownerUser,
  workers,
}: {
  onClose: () => void
  ownerUser: DbUser
  workers: DbUser[]
}) {
  const allUsers = [ownerUser, ...workers]
  const [editing, setEditing] = useState<string | null>(null)
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSavePin(userId: string) {
    if (!/^\d{4}$/.test(newPin)) { toast.error('PIN must be exactly 4 digits'); return }
    if (newPin !== confirmPin) { toast.error('PINs do not match'); return }
    setSaving(true)

    if (!isSupabaseConfigured) {
      mockStore.updateUserPin(userId, newPin)
      setSaving(false)
      toast.success('PIN updated!')
      setEditing(null)
      setNewPin('')
      setConfirmPin('')
      return
    }

    const { error } = await supabase.from('users').update({ pin: newPin }).eq('id', userId)
    setSaving(false)
    if (error) { toast.error('Failed to update PIN: ' + error.message); return }
    toast.success('PIN updated!')
    setEditing(null)
    setNewPin('')
    setConfirmPin('')
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Manage PINs</h2>
      <div className="space-y-4">
        {allUsers.map((u) => (
          <div key={u.id} className="border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-bold text-slate-900 text-lg">{u.name}</p>
                <p className="text-slate-500 text-sm capitalize">{u.role}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-slate-400 text-lg tracking-widest">••••</span>
                <button
                  onClick={() => {
                    setEditing(editing === u.id ? null : u.id)
                    setNewPin('')
                    setConfirmPin('')
                  }}
                  className="bg-slate-800 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  {editing === u.id ? 'Cancel' : 'Change PIN'}
                </button>
              </div>
            </div>
            {editing === u.id && (
              <div className="mt-3 space-y-3">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="New PIN (4 digits)"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                />
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="Confirm PIN"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                />
                <button
                  onClick={() => handleSavePin(u.id)}
                  disabled={saving}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl py-3 text-lg transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save PIN'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={onClose}
        className="mt-6 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl py-4 text-lg transition-colors"
      >
        Close
      </button>
    </Modal>
  )
}

// ─── FinishProjectModal ───────────────────────────────────────────────────────

function FinishProjectModal({
  project,
  remaining,
  onClose,
  onConfirmed,
}: {
  project: Project
  remaining: number
  onClose: () => void
  onConfirmed: () => void
}) {
  const [saving, setSaving] = useState(false)

  async function handleConfirm() {
    setSaving(true)

    if (!isSupabaseConfigured) {
      mockStore.finishProject(project.id)
      setSaving(false)
      toast.success('Project completed!')
      onConfirmed()
      onClose()
      return
    }

    const { error } = await supabase
      .from('projects')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', project.id)
    setSaving(false)
    if (error) { toast.error('Failed to finish project: ' + error.message); return }
    toast.success('Project completed!')
    onConfirmed()
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Finish Project?</h2>
      <p className="text-slate-600 mb-6 text-lg">{project.name}</p>
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6 text-center">
        <p className="text-slate-600 mb-1 text-lg">Release to crew</p>
        <p className="text-amber-700 font-black" style={{ fontSize: '2.5rem', lineHeight: 1.1 }}>
          {formatPeso(remaining)}
        </p>
        <p className="text-slate-500 text-sm mt-2">Remaining labor balance</p>
      </div>
      <p className="text-slate-600 mb-6 text-center">
        This will mark the project as <strong>Completed</strong>. This action cannot be undone.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl py-4 text-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={saving}
          className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl py-4 text-lg transition-colors disabled:opacity-50"
        >
          {saving ? 'Processing…' : 'Confirm & Finish'}
        </button>
      </div>
    </Modal>
  )
}

// ─── Main OwnerDashboard ──────────────────────────────────────────────────────

export default function OwnerDashboard({ user, onLogout }: OwnerDashboardProps) {
  const [workers, setWorkers] = useState<DbUser[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [advances, setAdvances] = useState<AdvanceWithRelations[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [showNewProject, setShowNewProject] = useState(false)
  const [showGiveAdvance, setShowGiveAdvance] = useState(false)
  const [showManagePins, setShowManagePins] = useState(false)
  const [finishingProject, setFinishingProject] = useState<Project | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [historySearch, setHistorySearch] = useState('')
  const [historyWorkerFilter, setHistoryWorkerFilter] = useState<string>('ALL')

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    try {
      if (!isSupabaseConfigured) {
        const fetchedWorkers = mockStore.getUsers().filter((u) => u.role === 'worker')
        const fetchedProjects = mockStore.getProjects()
        const rawAdvances = mockStore.getAdvances()

        const workerMap = new Map(fetchedWorkers.map((w) => [w.id, w]))
        const projectMap = new Map(fetchedProjects.map((p) => [p.id, p]))

        const enriched: AdvanceWithRelations[] = rawAdvances.map((a) => ({
          ...a,
          worker_name: workerMap.get(a.worker_id)?.name ?? 'Unknown',
          project_name: a.project_id ? (projectMap.get(a.project_id)?.name ?? null) : null,
        }))

        setWorkers(fetchedWorkers)
        setProjects(fetchedProjects)
        setAdvances(enriched)
        return
      }

      const [usersRes, projectsRes, advancesRes] = await Promise.all([
        supabase.from('users').select('*').eq('role', 'worker').order('name'),
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('advances').select('*').order('created_at', { ascending: false }),
      ])

      if (usersRes.error) throw usersRes.error
      if (projectsRes.error) throw projectsRes.error
      if (advancesRes.error) throw advancesRes.error

      const fetchedWorkers: DbUser[] = usersRes.data ?? []
      const fetchedProjects: Project[] = projectsRes.data ?? []
      const rawAdvances: Advance[] = advancesRes.data ?? []

      // Build lookup maps
      const workerMap = new Map(fetchedWorkers.map((w) => [w.id, w]))
      const projectMap = new Map(fetchedProjects.map((p) => [p.id, p]))

      // Enrich advances with names
      const enriched: AdvanceWithRelations[] = rawAdvances.map((a) => ({
        ...a,
        worker_name: workerMap.get(a.worker_id)?.name ?? 'Unknown',
        project_name: a.project_id ? (projectMap.get(a.project_id)?.name ?? null) : null,
      }))

      setWorkers(fetchedWorkers)
      setProjects(fetchedProjects)
      setAdvances(enriched)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      toast.error('Data fetch error: ' + msg)
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Realtime subscription ──────────────────────────────────────────────────

  useEffect(() => {
    fetchAll()

    if (!isSupabaseConfigured) return

    const channel = supabase
      .channel('owner-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'advances' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetchAll)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchAll])

  // ── Actions ────────────────────────────────────────────────────────────────

  async function handleAdvanceAction(advanceId: string, newStatus: 'approved' | 'declined') {
    if (!isSupabaseConfigured) {
      mockStore.updateAdvanceStatus(advanceId, newStatus)
      toast.success(newStatus === 'approved' ? '✅ Advance approved!' : '❌ Advance declined')
      fetchAll()
      return
    }

    const { error } = await supabase
      .from('advances')
      .update({ status: newStatus })
      .eq('id', advanceId)
    if (error) {
      toast.error(`Failed to ${newStatus === 'approved' ? 'approve' : 'decline'}: ${error.message}`)
    } else {
      toast.success(newStatus === 'approved' ? '✅ Advance approved!' : '❌ Advance declined')
      fetchAll()
    }
  }

  async function handleSettleNoProject(workerId: string) {
    if (!isSupabaseConfigured) {
      mockStore.settleWorkerNoProjectAdvances(workerId)
      toast.success('No-project advances settled!')
      fetchAll()
      return
    }

    const { error } = await supabase
      .from('advances')
      .update({ status: 'settled' })
      .eq('worker_id', workerId)
      .is('project_id', null)
      .eq('status', 'approved')
    if (error) {
      toast.error('Failed to settle advances: ' + error.message)
    } else {
      toast.success('No-project advances settled!')
      fetchAll()
    }
  }

  // ── Derived data ───────────────────────────────────────────────────────────

  const pendingAdvances = advances.filter((a) => a.status === 'pending')
  const activeProjects = projects.filter((p) => p.status === 'active')
  const completedProjects = projects.filter((p) => p.status === 'completed')

  const cleanedSearch = historySearch.trim().toLowerCase().replace(/[₱,]/g, '')

  const filteredCompletedProjects = completedProjects.filter((p) => {
    if (!cleanedSearch) return true
    const nameMatch = p.name.toLowerCase().includes(cleanedSearch)
    const laborClean = String(p.total_labor).replace(/[₱,]/g, '').toLowerCase()
    const amountMatch = laborClean.includes(cleanedSearch)
    return nameMatch || amountMatch
  })

  const filteredAdvances = advances.filter((a) => {
    if (historyWorkerFilter !== 'ALL' && a.worker_id !== historyWorkerFilter) {
      return false
    }

    if (!cleanedSearch) return true

    // Worker name match
    const workerMatch = a.worker_name.toLowerCase().includes(cleanedSearch)

    // Project name match
    const projectMatch = a.project_name
      ? a.project_name.toLowerCase().includes(cleanedSearch)
      : 'no project'.includes(cleanedSearch)

    // Amount match (e.g. 3000, 1500, ₱3,000)
    const amountClean = String(a.amount).replace(/[₱,]/g, '').toLowerCase()
    const amountFormatted = formatPeso(a.amount).replace(/[₱,]/g, '').toLowerCase()
    const amountMatch =
      amountClean.includes(cleanedSearch) ||
      amountFormatted.includes(cleanedSearch)

    // Note match (Cash / GCash / etc.)
    const noteMatch = a.note ? a.note.toLowerCase().includes(cleanedSearch) : false

    return workerMatch || projectMatch || amountMatch || noteMatch
  })

  function getProjectApprovedAdvances(projectId: string) {
    return advances.filter((a) => a.project_id === projectId && a.status === 'approved')
  }

  function getProjectApprovedTotal(projectId: string) {
    return getProjectApprovedAdvances(projectId).reduce((s, a) => s + a.amount, 0)
  }

  function getWorkerProjectTotal(workerId: string) {
    // Sum approved advances for active projects
    const activeProjectIds = new Set(activeProjects.map((p) => p.id))
    return advances
      .filter((a) => a.worker_id === workerId && a.project_id && activeProjectIds.has(a.project_id!) && a.status === 'approved')
      .reduce((s, a) => s + a.amount, 0)
  }

  function getWorkerNoProjectTotal(workerId: string) {
    return advances
      .filter((a) => a.worker_id === workerId && a.project_id === null && a.status === 'approved')
      .reduce((s, a) => s + a.amount, 0)
  }

  function getProjectWorkerBreakdown(projectId: string) {
    const rows: { worker: DbUser; total: number }[] = []
    for (const w of workers) {
      const total = advances
        .filter((a) => a.worker_id === w.id && a.project_id === projectId && a.status === 'approved')
        .reduce((s, a) => s + a.amount, 0)
      if (total > 0) rows.push({ worker: w, total })
    }
    return rows
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-slate-500 text-xl animate-pulse">Loading dashboard…</div>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">

        {/* ── SECTION 1: Header ─────────────────────────────────────────────── */}
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Owner Dashboard</h1>
            <button
              onClick={() => setShowManagePins(true)}
              className="mt-1 text-slate-500 text-sm underline hover:text-slate-700 transition-colors"
            >
              Manage PINs
            </button>
          </div>
          <button
            onClick={onLogout}
            className="bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl px-5 py-3 text-base transition-colors whitespace-nowrap"
            style={{ minHeight: '56px' }}
          >
            Switch User / Log Out
          </button>
        </header>

        {/* ── SECTION 2: Pending Advances Banner ────────────────────────────── */}
        {pendingAdvances.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-amber-700 mb-3 flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
              {pendingAdvances.length} Pending Advance{pendingAdvances.length > 1 ? 's' : ''} — Action Required
            </h2>
            <div className="space-y-4">
              {pendingAdvances.map((adv) => (
                <div
                  key={adv.id}
                  className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-5 shadow-sm"
                >
                  <div className="mb-3">
                    <p className="font-black text-slate-900 text-2xl">{adv.worker_name}</p>
                    <p
                      className="font-black text-slate-900"
                      style={{ fontSize: '2rem', lineHeight: 1.1 }}
                    >
                      {formatPeso(adv.amount)}
                    </p>
                    <p className="text-slate-600 mt-1 text-lg">
                      Advance {adv.project_name ? `— ${adv.project_name}` : '(No Project)'}
                    </p>
                    <div className="flex gap-3 mt-1 text-slate-500 text-sm">
                      <span>{adv.note}</span>
                      <span>·</span>
                      <span>{formatDateTime(adv.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleAdvanceAction(adv.id, 'approved')}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl transition-colors text-lg tracking-wide"
                      style={{ minHeight: '56px' }}
                    >
                      ✓ APPROVE
                    </button>
                    <button
                      onClick={() => handleAdvanceAction(adv.id, 'declined')}
                      className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl transition-colors text-lg tracking-wide"
                      style={{ minHeight: '56px' }}
                    >
                      ✕ DECLINE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── SECTION 3: Primary Action Buttons ─────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <button
            onClick={() => setShowNewProject(true)}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-black rounded-2xl text-xl transition-colors shadow-md"
            style={{ minHeight: '72px' }}
          >
            + New Project
          </button>
          <button
            onClick={() => setShowGiveAdvance(true)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xl transition-colors shadow-md"
            style={{ minHeight: '72px' }}
          >
            + Give Advance
          </button>
        </section>

        {/* ── SECTION 4: Active Projects ─────────────────────────────────────── */}
        {activeProjects.length > 0 && (
          <section>
            <h2 className="text-2xl font-black text-slate-900 mb-4">Active Projects</h2>
            <div className="space-y-5">
              {activeProjects.map((proj) => {
                const approvedTotal = getProjectApprovedTotal(proj.id)
                const remaining = proj.total_labor - approvedTotal
                const breakdown = getProjectWorkerBreakdown(proj.id)
                return (
                  <div key={proj.id} className="bg-white rounded-2xl shadow-md p-6">
                    <h3 className="font-black text-slate-900" style={{ fontSize: '1.5rem' }}>
                      {proj.name}
                    </h3>
                    <div className="mt-3 space-y-1 text-lg text-slate-700">
                      <div className="flex justify-between">
                        <span>Total Labor</span>
                        <span className="font-bold">{formatPeso(proj.total_labor)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Advances</span>
                        <span className="font-bold text-rose-700">− {formatPeso(approvedTotal)}</span>
                      </div>
                    </div>

                    {/* Per-worker breakdown */}
                    {breakdown.length > 0 && (
                      <div className="mt-3 bg-slate-50 rounded-xl p-3 space-y-1">
                        {breakdown.map(({ worker, total }) => (
                          <div key={worker.id} className="flex justify-between text-slate-600 text-base">
                            <span>{worker.name}</span>
                            <span className="font-semibold">{formatPeso(total)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Remaining balance */}
                    <div className="mt-5 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                      <p className="text-emerald-700 text-sm font-semibold uppercase tracking-widest mb-1">
                        Remaining Labor Balance
                      </p>
                      <p
                        className="text-emerald-700 font-black"
                        style={{ fontSize: '2.25rem', lineHeight: 1.1 }}
                      >
                        {formatPeso(remaining)}
                      </p>
                    </div>

                    <button
                      onClick={() => setFinishingProject(proj)}
                      className="mt-4 w-full bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl py-4 text-lg transition-colors"
                    >
                      Finish Project &amp; Release Balance
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── SECTION 5: Workers & No-Project Advances ──────────────────────── */}
        {workers.length > 0 && (
          <section>
            <h2 className="text-2xl font-black text-slate-900 mb-4">Workers &amp; Advances</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {workers.map((w) => {
                const projectTotal = getWorkerProjectTotal(w.id)
                const noProjectTotal = getWorkerNoProjectTotal(w.id)
                return (
                  <div key={w.id} className="bg-white rounded-2xl shadow-md p-5">
                    <p className="font-black text-slate-900 text-xl mb-3">{w.name}</p>
                    <div className="space-y-2 text-base">
                      <div className="flex justify-between text-slate-700">
                        <span>Project Advances</span>
                        <span className="font-bold">{formatPeso(projectTotal)}</span>
                      </div>
                      <div className="flex justify-between text-slate-700">
                        <span>No-Project Advances</span>
                        <span className={`font-bold ${noProjectTotal > 0 ? 'text-amber-700' : ''}`}>
                          {formatPeso(noProjectTotal)}
                        </span>
                      </div>
                    </div>
                    {noProjectTotal > 0 && (
                      <button
                        onClick={() => handleSettleNoProject(w.id)}
                        className="mt-4 w-full bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl py-3 text-base transition-colors"
                      >
                        Settle No-Project Advances
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── SECTION 6: History & Completed Projects ───────────────────────── */}
        <section>
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="w-full flex items-center justify-between bg-slate-200 hover:bg-slate-300 rounded-2xl px-6 py-4 font-bold text-slate-800 text-lg transition-colors"
          >
            <span>Completed Projects &amp; History</span>
            <span className="text-2xl">{showHistory ? '▲' : '▼'}</span>
          </button>

          {showHistory && (
            <div className="mt-4 space-y-6">
              {/* Search & Filter Bar */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-3">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 text-xl">
                    🔍
                  </div>
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Search by project name, worker name, or amount (₱)..."
                    className="w-full pl-12 pr-12 py-3.5 border border-slate-300 rounded-xl text-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-600 focus:border-slate-600 font-medium"
                  />
                  {historySearch && (
                    <button
                      onClick={() => setHistorySearch('')}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 font-bold text-lg"
                      title="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Worker Filter Chips */}
                {workers.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
                    <span className="text-sm font-semibold text-slate-500 whitespace-nowrap mr-1">
                      Filter Worker:
                    </span>
                    <button
                      onClick={() => setHistoryWorkerFilter('ALL')}
                      className={`px-3.5 py-1.5 rounded-full text-sm font-bold transition-colors whitespace-nowrap ${
                        historyWorkerFilter === 'ALL'
                          ? 'bg-slate-800 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      All
                    </button>
                    {workers.map((w) => (
                      <button
                        key={w.id}
                        onClick={() =>
                          setHistoryWorkerFilter(
                            historyWorkerFilter === w.id ? 'ALL' : w.id
                          )
                        }
                        className={`px-3.5 py-1.5 rounded-full text-sm font-bold transition-colors whitespace-nowrap ${
                          historyWorkerFilter === w.id
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {w.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Filter Summary Pill */}
                {(historySearch || historyWorkerFilter !== 'ALL') && (
                  <div className="flex items-center justify-between text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">
                    <span>
                      Found{' '}
                      <strong className="text-slate-900">
                        {filteredAdvances.length}
                      </strong>{' '}
                      advance{filteredAdvances.length === 1 ? '' : 's'}
                      {filteredCompletedProjects.length > 0 &&
                        ` and ${filteredCompletedProjects.length} completed project(s)`}
                      {historySearch && (
                        <>
                          {' '}
                          matching &ldquo;
                          <span className="font-semibold text-slate-900">
                            {historySearch}
                          </span>
                          &rdquo;
                        </>
                      )}
                    </span>
                    <button
                      onClick={() => {
                        setHistorySearch('')
                        setHistoryWorkerFilter('ALL')
                      }}
                      className="text-xs text-rose-600 hover:text-rose-700 font-bold ml-2 underline whitespace-nowrap"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}
              </div>

              {/* Completed projects */}
              {filteredCompletedProjects.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-slate-700">Completed Projects</h3>
                  {filteredCompletedProjects.map((proj) => {
                    const approvedTotal = getProjectApprovedTotal(proj.id)
                    return (
                      <div key={proj.id} className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-slate-900 text-lg">{proj.name}</p>
                            {proj.completed_at && (
                              <p className="text-slate-500 text-sm">
                                Completed {formatDate(proj.completed_at)}
                              </p>
                            )}
                          </div>
                          <span className="bg-slate-100 text-slate-600 text-sm font-semibold px-3 py-1 rounded-full">
                            Done
                          </span>
                        </div>
                        <div className="mt-3 space-y-1 text-base text-slate-700">
                          <div className="flex justify-between">
                            <span>Total Labor</span>
                            <span className="font-semibold">{formatPeso(proj.total_labor)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Advances</span>
                            <span className="font-semibold">{formatPeso(approvedTotal)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Full advances history */}
              <div>
                <h3 className="text-xl font-bold text-slate-700 mb-3">
                  All Advances {historySearch || historyWorkerFilter !== 'ALL' ? '(Filtered)' : '(Most Recent First)'}
                </h3>
                {filteredAdvances.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-slate-100">
                    <p className="text-slate-500 font-medium text-lg mb-2">No advances found</p>
                    <p className="text-slate-400 text-sm mb-4">
                      Try searching by another worker name, project name, or amount.
                    </p>
                    <button
                      onClick={() => {
                        setHistorySearch('')
                        setHistoryWorkerFilter('ALL')
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-sm transition-colors"
                    >
                      Clear Search Filters
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredAdvances.map((adv) => (
                      <div
                        key={adv.id}
                        className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between gap-3 border border-slate-100"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900">{adv.worker_name}</span>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-600 text-sm">
                              {adv.project_name ? `Advance — ${adv.project_name}` : 'Advance (No Project)'}
                            </span>
                          </div>
                          <div className="text-slate-500 text-sm mt-0.5">
                            {adv.note} · {formatDateTime(adv.created_at)}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-black text-slate-900 text-lg">{formatPeso(adv.amount)}</p>
                          <StatusBadge status={adv.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}

      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onSaved={fetchAll}
        />
      )}

      {showGiveAdvance && (
        <GiveAdvanceModal
          onClose={() => setShowGiveAdvance(false)}
          onSaved={fetchAll}
          workers={workers}
          projects={projects}
        />
      )}

      {showManagePins && (
        <ManagePINsModal
          onClose={() => setShowManagePins(false)}
          ownerUser={user}
          workers={workers}
        />
      )}

      {finishingProject && (
        <FinishProjectModal
          project={finishingProject}
          remaining={finishingProject.total_labor - getProjectApprovedTotal(finishingProject.id)}
          onClose={() => setFinishingProject(null)}
          onConfirmed={fetchAll}
        />
      )}
    </div>
  )
}
