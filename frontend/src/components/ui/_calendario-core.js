import { useEffect } from 'react'

// Utilidades compartidas por DatePicker y DateRangePicker. Valores 'YYYY-MM-DD'.

export const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]
export const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export const pad = (n) => String(n).padStart(2, '0')
export const toKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`
export const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return { y, m: m - 1, d } }
export const hoyKey = () => { const n = new Date(); return toKey(n.getFullYear(), n.getMonth(), n.getDate()) }
export const fmtCorto = (k, conAnio = true) => {
  const { y, m, d } = parseKey(k)
  return `${d} ${MESES[m].slice(0, 3)}${conAnio ? ` ${y}` : ''}`
}

// Cierra el popover al hacer clic afuera o con Escape.
export function useCerrarPopover(ref, open, setOpen) {
  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [ref, open, setOpen])
}
