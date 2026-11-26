import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import OwnerDashboard from '@/components/OwnerDashboard'
import { SEED_USERS, mockStore } from '@/lib/mockStore'

jest.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: {},
}))

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

const ownerUser = SEED_USERS[0]

describe('OwnerDashboard integration tests', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
  })

  it('renders Owner Dashboard with pending advances, active projects, and workers', async () => {
    render(<OwnerDashboard user={ownerUser} onLogout={jest.fn()} />)

    expect(await screen.findByText('Owner Dashboard')).toBeInTheDocument()
    expect(screen.getByText(/1 Pending Advance — Action Required/i)).toBeInTheDocument()
    expect(screen.getByText('Active Projects')).toBeInTheDocument()
    expect(screen.getByText('EMCOR Signage')).toBeInTheDocument()
    expect(screen.getByText('Workers & Advances')).toBeInTheDocument()
    expect(screen.getAllByText('Balong').length).toBeGreaterThanOrEqual(1)
  })

  it('approves a pending advance and removes it from the pending banner', async () => {
    render(<OwnerDashboard user={ownerUser} onLogout={jest.fn()} />)

    const approveBtn = await screen.findByRole('button', { name: /✓ APPROVE/i })
    fireEvent.click(approveBtn)

    await waitFor(() => {
      expect(screen.queryByText(/Pending Advance — Action Required/i)).not.toBeInTheDocument()
    })
  })

  it('filters Active Projects by project name and amount', async () => {
    mockStore.addProject('Jollibee Neon Sign', 50000)
    render(<OwnerDashboard user={ownerUser} onLogout={jest.fn()} />)

    expect(await screen.findByText('EMCOR Signage')).toBeInTheDocument()
    expect(screen.getByText('Jollibee Neon Sign')).toBeInTheDocument()

    const searchInput = screen.getByPlaceholderText(/Search project name or amount/i)
    fireEvent.change(searchInput, { target: { value: 'Jollibee' } })

    expect(screen.getByText('Jollibee Neon Sign')).toBeInTheDocument()
    expect(screen.queryByText('EMCOR Signage')).not.toBeInTheDocument()

    fireEvent.change(searchInput, { target: { value: '999999' } })
    expect(screen.getByText(/No projects match/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Clear Search' }))
    expect(screen.getByText('EMCOR Signage')).toBeInTheDocument()
  })

  it('opens Add New Worker modal, validates PIN, and adds a worker', async () => {
    render(<OwnerDashboard user={ownerUser} onLogout={jest.fn()} />)

    const addWorkerBtn = await screen.findByRole('button', { name: /Add Worker/i })
    fireEvent.click(addWorkerBtn)

    expect(screen.getByRole('heading', { name: /Add New Worker/i })).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('e.g. Pedro'), { target: { value: 'Pedro' } })
    const pinInputs = screen.getAllByPlaceholderText('••••')
    fireEvent.change(pinInputs[0], { target: { value: '7777' } })
    fireEvent.change(pinInputs[1], { target: { value: '7777' } })

    fireEvent.click(screen.getByRole('button', { name: 'Add Worker' }))

    await waitFor(() => {
      expect(screen.getByText('Pedro')).toBeInTheDocument()
    })
  })

  it('expands History & Completed Projects and filters advances by worker, amount, and project', async () => {
    render(<OwnerDashboard user={ownerUser} onLogout={jest.fn()} />)

    const historyToggle = await screen.findByRole('button', { name: /Completed Projects & History/i })
    fireEvent.click(historyToggle)

    const historySearch = screen.getByPlaceholderText(/Search project, worker, date, or ₱/i)
    fireEvent.change(historySearch, { target: { value: 'Warren' } })

    expect(screen.getByText(/Found/i)).toBeInTheDocument()
    expect(screen.getAllByText('₱1,000.00').length).toBeGreaterThanOrEqual(1)

    fireEvent.change(historySearch, { target: { value: '3000' } })
    expect(screen.getAllByText('₱3,000.00').length).toBeGreaterThanOrEqual(1)
  })

  it('creates a new project via + New Project modal', async () => {
    render(<OwnerDashboard user={ownerUser} onLogout={jest.fn()} />)

    fireEvent.click(await screen.findByRole('button', { name: /\+ New Project/i }))
    fireEvent.change(screen.getByPlaceholderText('e.g. EMCOR Signage'), { target: { value: 'BDO Banner' } })
    fireEvent.click(screen.getByRole('button', { name: '+₱10,000' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save Project' }))

    await waitFor(() => {
      expect(screen.getByText('BDO Banner')).toBeInTheDocument()
    })
  })
})
