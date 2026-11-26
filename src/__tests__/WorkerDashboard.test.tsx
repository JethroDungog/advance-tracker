import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import WorkerDashboard from '@/components/WorkerDashboard'
import { SEED_USERS } from '@/lib/mockStore'

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

const balongUser = SEED_USERS[1] // Balong

describe('WorkerDashboard integration tests', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
  })

  it('renders greeting, summary boxes, and worker advances list', async () => {
    render(<WorkerDashboard user={balongUser} onLogout={jest.fn()} />)

    expect(await screen.findByText('Hello, Balong')).toBeInTheDocument()
    expect(screen.getByText('Active Project Advances')).toBeInTheDocument()
    expect(screen.getByText('No-Project Advances (Unpaid)')).toBeInTheDocument()
    expect(screen.getAllByText('₱2,000.00').length).toBeGreaterThanOrEqual(1)
  })

  it('completes the 3-step Ask for Advance flow and adds a pending advance', async () => {
    render(<WorkerDashboard user={balongUser} onLogout={jest.fn()} />)

    const askBtn = await screen.findByRole('button', { name: /Ask for Advance/i })
    fireEvent.click(askBtn)

    // Step 1: Choose Project
    expect(screen.getByText('Which project is this for?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /EMCOR Signage/i }))
    fireEvent.click(screen.getByRole('button', { name: /Next/i }))

    // Step 2: Enter Amount
    expect(screen.getByText('How much do you need?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '₱1,500' }))
    fireEvent.click(screen.getByRole('button', { name: /Next/i }))

    // Step 3: Payment Method & Submit
    expect(screen.getByText('How will you receive it?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'GCash' }))
    fireEvent.change(screen.getByPlaceholderText('Any note? (optional)'), {
      target: { value: 'For materials' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send Request to Owner' }))

    await waitFor(() => {
      expect(screen.getByText('₱1,500.00')).toBeInTheDocument()
      expect(screen.getByText('WAITING FOR OWNER')).toBeInTheDocument()
    })
  })
})
