export function buildGoogleCalendarUrl({ nombre, fecha, lugar, descripcion }) {
  const start = new Date(fecha)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  const fmt = (d) => d.toISOString().slice(0, 10).replace(/-/g, '')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: nombre,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: descripcion || '',
    location: lugar || '',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
