/**
 * Format a numeric value as Philippine Peso currency.
 * e.g. 1500 → "₱1,500.00"
 */
export function formatPeso(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format an ISO date string into a readable Philippine locale date.
 * e.g. "2024-05-01T00:00:00Z" → "May 1, 2024"
 */
export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Manila',
  }).format(new Date(dateStr))
}

/**
 * Format an ISO date string into a short date + time string.
 * e.g. "May 1, 2024, 8:30 AM"
 */
export function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Manila',
  }).format(new Date(dateStr))
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Capitalize the first letter of a string.
 */
export function capitalize(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}
