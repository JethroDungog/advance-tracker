'use client'

import { useEffect, useState } from 'react'

interface PinPadProps {
  onSubmit: (pin: string) => Promise<void>
  error: string
  loading: boolean
}

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['Clear', '0', '⌫'],
]

export default function PinPad({ onSubmit, error, loading }: PinPadProps) {
  const [pin, setPin] = useState('')

  // Auto-submit when 4 digits are entered
  useEffect(() => {
    if (pin.length === 4 && !loading) {
      onSubmit(pin)
    }
  }, [pin, loading, onSubmit])

  function handleKey(key: string) {
    if (loading) return
    if (key === 'Clear') {
      setPin('')
    } else if (key === '⌫') {
      setPin((p) => p.slice(0, -1))
    } else if (pin.length < 4) {
      setPin((p) => p + key)
    }
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6 py-10"
      style={{ background: '#F8FAFC' }}
    >
      {/* App title */}
      <h1
        className="mb-1 text-4xl font-extrabold tracking-tight"
        style={{ color: '#0F172A' }}
      >
        Advance Tracker
      </h1>
      <p className="mb-10 text-base" style={{ color: '#64748B' }}>
        Enter your PIN to continue
      </p>

      {/* PIN dot indicators */}
      <div className="mb-8 flex gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-150"
            style={{
              width: 24,
              height: 24,
              background: i < pin.length ? '#0F172A' : 'transparent',
              border: '2.5px solid',
              borderColor: i < pin.length ? '#0F172A' : '#94A3B8',
            }}
          />
        ))}
      </div>

      {/* Error message */}
      <div className="mb-4 h-6">
        {error && (
          <p className="text-center text-sm font-medium" style={{ color: '#E11D48' }}>
            {error}
          </p>
        )}
      </div>

      {/* Loading spinner overlay inside keypad area */}
      {loading && (
        <div className="mb-6 flex items-center gap-2" style={{ color: '#64748B' }}>
          <svg
            className="animate-spin"
            width={22}
            height={22}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
          </svg>
          <span className="text-sm">Verifying…</span>
        </div>
      )}

      {/* Keypad */}
      <div className="flex flex-col gap-3">
        {KEYS.map((row, ri) => (
          <div key={ri} className="flex gap-3">
            {row.map((key) => {
              const isAction = key === 'Clear' || key === '⌫'
              return (
                <button
                  key={key}
                  onClick={() => handleKey(key)}
                  disabled={loading}
                  style={{
                    minWidth: 72,
                    minHeight: 72,
                    fontSize: isAction ? 18 : 28,
                    fontWeight: isAction ? 600 : 700,
                    background: '#FFFFFF',
                    color: '#0F172A',
                    borderRadius: '1.25rem', // rounded-2xl
                    boxShadow: '0 4px 16px 0 rgba(15,23,42,0.10), 0 1.5px 4px 0 rgba(15,23,42,0.08)',
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1,
                    transition: 'transform 0.08s, box-shadow 0.08s, opacity 0.15s',
                    WebkitTapHighlightColor: 'transparent',
                    userSelect: 'none',
                  }}
                  onMouseDown={(e) => {
                    if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)'
                  }}
                  onMouseUp={(e) => {
                    ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
                  }}
                  onTouchStart={(e) => {
                    if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)'
                  }}
                  onTouchEnd={(e) => {
                    ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
                  }}
                >
                  {key}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
