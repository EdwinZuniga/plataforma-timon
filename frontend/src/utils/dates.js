export const calendarDateFormatOptions = {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}

export function formatCalendarDate(date, options = calendarDateFormatOptions) {
  if (!date) return null
  return new Date(date).toLocaleDateString('es-SV', { timeZone: 'UTC', ...options })
}

export function toInputDate(date) {
  return date ? new Date(date).toISOString().slice(0, 10) : ''
}

export function getCalendarMonth(date) {
  const parsed = new Date(date)
  return {
    mes: parsed.getUTCMonth() + 1,
    anio: parsed.getUTCFullYear(),
  }
}
