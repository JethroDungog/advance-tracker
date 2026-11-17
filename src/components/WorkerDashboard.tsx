'use client'

import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { supabase, DbUser, Project, Advance, isSupabaseConfigured } from '@/lib/supabase'
import { mockStore } from '@/lib/mockStore'
import { formatPeso, formatDate } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface WorkerDashboardProps {
  user: DbUser
  onLogout: () => void
}

type PaymentMethod = 'Cash' | 'GCash'
type ModalStep = 1 | 2 | 3

interface AdvanceWithProject extends Advance {
  project: Project | null
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Advance['status'] }) {
  const configs: Record<
    Advance['status'],
    { label: string; className: string }
  > = {
    pending: {
      label: 'WAITING FOR OWNER',
      className: 'bg-amber-100 text-amber-800 border border-amber-300',
    },
    approved: {
      label: 'APPROVED',
      className: 'bg-emerald-500 text-white',
    },
    declined: {
      label: 'DECLINED',
      className: 'bg-rose-500 text-white',
    },
    settled: {
      label: 'SETTLED',
      className: 'bg-slate-400 text-white',
    },
  }

  const { label, className } = configs[status]

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-3 font-bold text-xs tracking-wide ${className}`}
      style={{ minHeight: 44, minWidth: 80 }}
    >
      {label}
    </span>
  )
}

// ─── Advance Card ─────────────────────────────────────────────────────────────

function AdvanceCard({ advance }: { advance: AdvanceWithProject }) {
  const projectLabel = advance.project
    ? `Advance — ${advance.project.name}`
    : 'Advance (No Project)'

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-3 flex items-center justify-between gap-3">
      {/* Left: amount + meta */}
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <span className="font-bold text-[#0F172A]" style={{ fontSize: 28 }}>
          {formatPeso(advance.amount)}
        </span>
        <span className="text-slate-500 truncate" style={{ fontSize: 16 }}>
          {projectLabel}
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 text-xs">
            {formatDate(advance.created_at)}
          </span>
          {advance.note && (
            <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2 py-0.5 rounded-full">
              {advance.note}
            </span>
          )}
        </div>
      </div>

      {/* Right: status badge */}
      <div className="flex-shrink-0">
        <StatusBadge status={advance.status} />
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WorkerDashboard({ user, onLogout }: WorkerDashboardProps) {
  const [advances, setAdvances] = useState<AdvanceWithProject[]>([])
  const [activeProjects, setActiveProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [step, setStep] = useState<ModalStep>(1)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null | 'NO_PROJECT'>('NO_PROJECT')
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      if (!isSupabaseConfigured) {
        const activeProjs = mockStore.getProjects().filter((p) => p.status === 'active')
        const allProjs = mockStore.getProjects()
        const workerAdvances = mockStore.getAdvances().filter((a) => a.worker_id === user.id)

        const enriched: AdvanceWithProject[] = workerAdvances.map((a) => ({
          ...a,
          project: allProjs.find((p) => p.id === a.project_id) ?? null,
        }))

        setAdvances(enriched)
        setActiveProjects(activeProjs)
        return
      }

      const [advancesRes, projectsRes] = await Promise.all([
        supabase
          .from('advances')
          .select('*, project:projects(*)')
          .eq('worker_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('projects')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false }),
      ])

      if (advancesRes.error) throw advancesRes.error
      if (projectsRes.error) throw projectsRes.error

      setAdvances((advancesRes.data as AdvanceWithProject[]) ?? [])
      setActiveProjects((projectsRes.data as Project[]) ?? [])
    } catch (err) {
      console.error('Failed to fetch data:', err)
      toast.error('Failed to load your advances.')
    } finally {
      setLoading(false)
    }
  }, [user.id])

  // ─── Realtime Subscription ──────────────────────────────────────────────────

  useEffect(() => {
    fetchData()

    if (!isSupabaseConfigured) return

    const channel = supabase
      .channel(`worker-advances-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'advances',
          filter: `worker_id=eq.${user.id}`,
        },
        () => {
          fetchData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user.id, fetchData])

  // ─── Summary Calculations ───────────────────────────────────────────────────

  // Active project advances: approved, project_id IS NOT NULL, project.status='active'
  const activeProjectAdvances = advances.filter(
    (a) =>
      a.status === 'approved' &&
      a.project_id !== null &&
      a.project?.status === 'active'
  )

  // Group by project
  const activeProjectBreakdown: Record<string, { name: string; total: number }> = {}
  for (const adv of activeProjectAdvances) {
    const pid = adv.project_id!
    if (!activeProjectBreakdown[pid]) {
      activeProjectBreakdown[pid] = { name: adv.project?.name ?? 'Unknown', total: 0 }
    }
    activeProjectBreakdown[pid].total += adv.amount
  }
  const totalActiveProject = activeProjectAdvances.reduce((s, a) => s + a.amount, 0)

  // No-project advances: approved, project_id IS NULL
  const noProjectAdvances = advances.filter(
    (a) => a.status === 'approved' && a.project_id === null
  )
  const totalNoProject = noProjectAdvances.reduce((s, a) => s + a.amount, 0)

  // ─── Modal Helpers ──────────────────────────────────────────────────────────

  const openModal = () => {
    setStep(1)
    setSelectedProjectId('NO_PROJECT')
    setAmount('')
    setPaymentMethod('Cash')
    setNote('')
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
  }

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount)
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error('Please enter a valid amount.')
      return
    }

    setSubmitting(true)
    try {
      const projectId =
        selectedProjectId === 'NO_PROJECT' ? null : selectedProjectId

      if (!isSupabaseConfigured) {
        mockStore.addAdvance(
          user.id,
          projectId,
          parsedAmount,
          `${paymentMethod}${note.trim() ? ` — ${note.trim()}` : ''}`,
          'pending'
        )
        toast.success('Your advance request has been sent!')
        fetchData()
        closeModal()
        return
      }

      const { error } = await supabase.from('advances').insert({
        worker_id: user.id,
        project_id: projectId,
        amount: parsedAmount,
        note: `${paymentMethod}${note.trim() ? ` — ${note.trim()}` : ''}`,
        status: 'pending',
      })

      if (error) throw error

      toast.success('Your advance request has been sent!')
      closeModal()
    } catch (err) {
      console.error('Submit error:', err)
      toast.error('Failed to send request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Preset amounts ─────────────────────────────────────────────────────────

  const PRESETS = [500, 1000, 1500, 2000, 3000, 5000]

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen"
      style={{ background: '#F8FAFC', color: '#0F172A' }}
    >
      <div className="max-w-lg mx-auto px-4 pb-16">

        {/* ── SECTION 1: Header ── */}
        <div className="flex items-start justify-between pt-8 pb-2">
          <div>
            <h1 className="font-bold leading-tight" style={{ fontSize: 28 }}>
              Hello, {user.name}
            </h1>
            <p className="text-slate-500 mt-1" style={{ fontSize: 18 }}>
              Your Advances
            </p>
          </div>
          <button
            onClick={onLogout}
            className="bg-white border border-slate-200 text-slate-600 font-semibold rounded-xl px-4 shadow-sm active:scale-95 transition-transform"
            style={{ minHeight: 56, fontSize: 15 }}
          >
            Switch User
          </button>
        </div>

        {/* ── SECTION 2: Summary Boxes ── */}
        <div className="grid grid-cols-1 gap-4 mt-6 sm:grid-cols-2">

          {/* Box 1 — Active Project Advances */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <p className="text-slate-500 font-medium mb-2" style={{ fontSize: 14 }}>
              Active Project Advances
            </p>
            <p
              className="font-bold text-emerald-600"
              style={{ fontSize: 36 }}
            >
              {formatPeso(totalActiveProject)}
            </p>
            {Object.keys(activeProjectBreakdown).length > 0 ? (
              <ul className="mt-3 space-y-1">
                {Object.values(activeProjectBreakdown).map((entry) => (
                  <li key={entry.name} className="text-slate-500 text-sm flex justify-between">
                    <span>{entry.name}</span>
                    <span className="font-semibold text-slate-700">
                      {formatPeso(entry.total)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-400 text-sm mt-2">No active project advances.</p>
            )}
          </div>

          {/* Box 2 — No-Project Advances */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <p className="text-slate-500 font-medium mb-2" style={{ fontSize: 14 }}>
              No-Project Advances (Unpaid)
            </p>
            <p
              className="font-bold"
              style={{
                fontSize: 36,
                color: totalNoProject > 0 ? '#f43f5e' : '#94a3b8',
              }}
            >
              {formatPeso(totalNoProject)}
            </p>
            {totalNoProject > 0 && (
              <p className="text-rose-500 text-sm mt-2 font-medium">
                Contact owner to settle
              </p>
            )}
          </div>
        </div>

        {/* ── SECTION 3: CTA Button ── */}
        <button
          onClick={openModal}
          className="w-full mt-6 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] transition-all text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2"
          style={{ minHeight: 72, fontSize: 22 }}
        >
          <span style={{ fontSize: 26 }}>+</span>
          Ask for Advance
        </button>

        {/* ── SECTION 4: My Advances List ── */}
        <div className="mt-8">
          <h2 className="font-bold mb-4" style={{ fontSize: 20 }}>
            My Advances
          </h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : advances.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
              <p className="text-slate-400 text-lg">
                You have no advance requests yet.
              </p>
              <p className="text-slate-400 text-base mt-1">
                Tap <strong>+ Ask for Advance</strong> to get started.
              </p>
            </div>
          ) : (
            <div>
              {advances.map((adv) => (
                <AdvanceCard key={adv.id} advance={adv} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL ── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          style={{ background: 'rgba(15,23,42,0.5)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal()
          }}
        >
          <div
            className="bg-white rounded-t-3xl shadow-2xl w-full max-w-lg mx-auto"
            style={{ maxHeight: '92vh', overflowY: 'auto' }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              {step > 1 ? (
                <button
                  onClick={() => setStep((s) => (s - 1) as ModalStep)}
                  className="text-slate-500 font-semibold text-base px-3 py-2 rounded-xl hover:bg-slate-100"
                >
                  ← Back
                </button>
              ) : (
                <div />
              )}
              <span className="text-slate-400 text-sm font-medium">
                Step {step} of 3
              </span>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-700 text-2xl font-light w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100"
              >
                ×
              </button>
            </div>

            {/* Progress bar */}
            <div className="px-6 mb-4">
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${(step / 3) * 100}%` }}
                />
              </div>
            </div>

            <div className="px-6 pb-8">

              {/* ── Step 1: Choose Project ── */}
              {step === 1 && (
                <div>
                  <h3 className="font-bold mb-6" style={{ fontSize: 22 }}>
                    Which project is this for?
                  </h3>

                  <div className="space-y-3">
                    {activeProjects.map((project) => {
                      // Calculate approved advances sum for this project across ALL workers
                      // We show project total_labor as context
                      const isSelected = selectedProjectId === project.id
                      return (
                        <button
                          key={project.id}
                          onClick={() => setSelectedProjectId(project.id)}
                          className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                          style={{ minHeight: 72 }}
                        >
                          <p className="font-bold text-[#0F172A]" style={{ fontSize: 18 }}>
                            {project.name}
                          </p>
                          <p className="text-slate-500 text-sm mt-0.5">
                            Total labor: {formatPeso(project.total_labor)}
                          </p>
                        </button>
                      )
                    })}

                    {/* No Project option */}
                    <button
                      onClick={() => setSelectedProjectId('NO_PROJECT')}
                      className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
                        selectedProjectId === 'NO_PROJECT'
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                      style={{ minHeight: 72 }}
                    >
                      <p className="font-bold text-[#0F172A]" style={{ fontSize: 18 }}>
                        No Project (General Advance)
                      </p>
                      <p className="text-slate-500 text-sm mt-0.5">
                        Advance not tied to any project
                      </p>
                    </button>
                  </div>

                  <button
                    onClick={() => setStep(2)}
                    className="w-full mt-6 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] transition-all text-white font-bold rounded-2xl"
                    style={{ minHeight: 72, fontSize: 18 }}
                  >
                    Next →
                  </button>
                </div>
              )}

              {/* ── Step 2: Enter Amount ── */}
              {step === 2 && (
                <div>
                  <h3 className="font-bold mb-6" style={{ fontSize: 22 }}>
                    How much do you need?
                  </h3>

                  {/* Amount input */}
                  <div className="flex items-center bg-white border-2 border-slate-200 focus-within:border-emerald-500 rounded-2xl px-5 mb-5 transition-colors">
                    <span className="font-bold text-slate-500 mr-2" style={{ fontSize: 32 }}>
                      ₱
                    </span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      className="flex-1 outline-none bg-transparent font-bold text-[#0F172A] py-4"
                      style={{ fontSize: 32 }}
                      inputMode="numeric"
                      min="1"
                    />
                  </div>

                  {/* Presets */}
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {PRESETS.map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setAmount(String(preset))}
                        className={`rounded-xl border-2 font-bold transition-all active:scale-95 ${
                          amount === String(preset)
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-white text-[#0F172A] hover:border-slate-300'
                        }`}
                        style={{ minHeight: 56, fontSize: 16 }}
                      >
                        ₱{preset.toLocaleString()}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      const parsed = parseFloat(amount)
                      if (!parsed || parsed <= 0) {
                        toast.error('Please enter a valid amount.')
                        return
                      }
                      setStep(3)
                    }}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] transition-all text-white font-bold rounded-2xl"
                    style={{ minHeight: 72, fontSize: 18 }}
                  >
                    Next →
                  </button>
                </div>
              )}

              {/* ── Step 3: Payment Method & Submit ── */}
              {step === 3 && (
                <div>
                  <h3 className="font-bold mb-6" style={{ fontSize: 22 }}>
                    How will you receive it?
                  </h3>

                  {/* Payment method toggle */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {(['Cash', 'GCash'] as PaymentMethod[]).map((method) => (
                      <button
                        key={method}
                        onClick={() => setPaymentMethod(method)}
                        className={`rounded-2xl border-2 font-bold text-lg transition-all active:scale-95 ${
                          paymentMethod === method
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'bg-white border-slate-200 text-[#0F172A] hover:border-slate-300'
                        }`}
                        style={{ minHeight: 72 }}
                      >
                        {method}
                      </button>
                    ))}
                  </div>

                  {/* Optional note */}
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Any note? (optional)"
                    className="w-full border-2 border-slate-200 focus:border-emerald-500 rounded-2xl px-5 py-4 outline-none text-[#0F172A] transition-colors mb-6"
                    style={{ fontSize: 18 }}
                  />

                  {/* Summary */}
                  <div className="bg-slate-50 rounded-2xl p-4 mb-6 space-y-2">
                    <div className="flex justify-between text-slate-600">
                      <span>Project</span>
                      <span className="font-semibold text-[#0F172A]">
                        {selectedProjectId === 'NO_PROJECT'
                          ? 'No Project'
                          : activeProjects.find((p) => p.id === selectedProjectId)?.name ?? '—'}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Amount</span>
                      <span className="font-bold text-[#0F172A]">{formatPeso(parseFloat(amount) || 0)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Via</span>
                      <span className="font-semibold text-[#0F172A]">{paymentMethod}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full bg-slate-800 hover:bg-slate-900 active:scale-[0.98] transition-all text-white font-bold rounded-2xl disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ minHeight: 72, fontSize: 18 }}
                  >
                    {submitting ? 'Sending…' : 'Send Request to Owner'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
