import { formatPeso, formatDate, formatDateTime, clamp, capitalize } from '@/lib/utils'

describe('utils unit tests', () => {
  describe('formatPeso', () => {
    it('formats whole numbers with peso sign, commas, and two decimals', () => {
      expect(formatPeso(1500)).toBe('₱1,500.00')
      expect(formatPeso(30000)).toBe('₱30,000.00')
    })

    it('formats zero and decimals properly', () => {
      expect(formatPeso(0)).toBe('₱0.00')
      expect(formatPeso(250.5)).toBe('₱250.50')
    })
  })

  describe('formatDate & formatDateTime', () => {
    it('formats ISO date string in Asia/Manila timezone', () => {
      const result = formatDate('2026-11-17T05:00:00Z')
      expect(result).toContain('November')
      expect(result).toContain('17')
      expect(result).toContain('2026')
    })

    it('formats ISO datetime string with short month and AM/PM', () => {
      const result = formatDateTime('2026-11-17T05:42:00Z') // 1:42 PM Manila
      expect(result).toContain('Nov')
      expect(result).toContain('17')
      expect(result).toContain('2026')
      expect(result).toMatch(/PM|AM/i)
    })
  })

  describe('clamp', () => {
    it('clamps numbers within range', () => {
      expect(clamp(5, 0, 10)).toBe(5)
      expect(clamp(-3, 0, 10)).toBe(0)
      expect(clamp(20, 0, 10)).toBe(10)
    })
  })

  describe('capitalize', () => {
    it('capitalizes first letter and handles empty string', () => {
      expect(capitalize('approved')).toBe('Approved')
      expect(capitalize('')).toBe('')
    })
  })
})
