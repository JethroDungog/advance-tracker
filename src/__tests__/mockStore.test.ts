import { mockStore, SEED_USERS, SEED_PROJECTS, SEED_ADVANCES } from '@/lib/mockStore'

describe('mockStore unit tests', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('seeds users, projects, and advances on first read', () => {
    expect(mockStore.getUsers()).toHaveLength(SEED_USERS.length)
    expect(mockStore.getProjects()).toHaveLength(SEED_PROJECTS.length)
    expect(mockStore.getAdvances()).toHaveLength(SEED_ADVANCES.length)
  })

  it('finds user by PIN and returns undefined for unknown PIN', () => {
    expect(mockStore.findUserByPin('0000')?.name).toBe('Owner')
    expect(mockStore.findUserByPin('1111')?.name).toBe('Balong')
    expect(mockStore.findUserByPin('9999')).toBeUndefined()
  })

  it('adds a new worker and rejects duplicate PINs', () => {
    const res1 = mockStore.addWorker('Pedro', '5555')
    expect(res1.error).toBeUndefined()
    expect(res1.user?.name).toBe('Pedro')
    expect(res1.user?.role).toBe('worker')
    expect(mockStore.findUserByPin('5555')?.name).toBe('Pedro')

    const res2 = mockStore.addWorker('Duplicate', '5555')
    expect(res2.error).toMatch(/already in use/i)
  })

  it('updates a user PIN', () => {
    expect(mockStore.updateUserPin('user-balong', '9876')).toBe(true)
    expect(mockStore.findUserByPin('9876')?.id).toBe('user-balong')
    expect(mockStore.updateUserPin('non-existent', '1234')).toBe(false)
  })

  it('adds and finishes a project', () => {
    const proj = mockStore.addProject('SM Mall Signage', 45000)
    expect(proj.status).toBe('active')
    expect(proj.total_labor).toBe(45000)

    mockStore.finishProject(proj.id)
    const updated = mockStore.getProjects().find((p) => p.id === proj.id)
    expect(updated?.status).toBe('completed')
    expect(updated?.completed_at).not.toBeNull()
  })

  it('adds, updates, and settles no-project advances', () => {
    const adv = mockStore.addAdvance('user-carlo', null, 500, 'Cash', 'pending')
    expect(adv.status).toBe('pending')

    mockStore.updateAdvanceStatus(adv.id, 'approved')
    expect(mockStore.getAdvances().find((a) => a.id === adv.id)?.status).toBe('approved')

    mockStore.settleWorkerNoProjectAdvances('user-carlo')
    expect(mockStore.getAdvances().find((a) => a.id === adv.id)?.status).toBe('settled')
  })
})
