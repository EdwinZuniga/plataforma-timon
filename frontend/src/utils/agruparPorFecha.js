import { formatCalendarDate } from './dates'

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

export const etiquetaMes = (fecha) =>
  cap(formatCalendarDate(fecha, { timeZone: 'UTC', month: 'long', year: 'numeric' }))

export const etiquetaDia = (fecha) =>
  cap(formatCalendarDate(fecha, { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }))

// Agrupa una lista YA ordenada por fecha descendente en meses y, dentro,
// en días — al estilo Google Photos.
// Devuelve: [{ key, label, dias: [{ key, label, items: [...] }] }]
export function agruparPorMesYDia(items, getFecha = (x) => x.fecha) {
  const meses = []
  for (const it of items) {
    const iso = new Date(getFecha(it)).toISOString()
    const mesKey = iso.slice(0, 7)   // YYYY-MM
    const diaKey = iso.slice(0, 10)  // YYYY-MM-DD

    let mes = meses[meses.length - 1]
    if (!mes || mes.key !== mesKey) {
      mes = { key: mesKey, label: etiquetaMes(getFecha(it)), dias: [] }
      meses.push(mes)
    }
    let dia = mes.dias[mes.dias.length - 1]
    if (!dia || dia.key !== diaKey) {
      dia = { key: diaKey, label: etiquetaDia(getFecha(it)), items: [] }
      mes.dias.push(dia)
    }
    dia.items.push(it)
  }
  return meses
}
