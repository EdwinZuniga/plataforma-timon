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
export const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
export const fmtCorto = (k, conAnio = true) => {
  const { y, m, d } = parseKey(k)
  return `${d} ${MESES[m].slice(0, 3)}${conAnio ? ` ${y}` : ''}`
}

// 'YYYY-MM-DD' ↔ 'dd/mm/aaaa' (para escribir la fecha a mano).
export const fmtTexto = (k) => {
  if (!k) return ''
  const { y, m, d } = parseKey(k)
  return `${pad(d)}/${pad(m + 1)}/${y}`
}
export const parseTexto = (str) => {
  const mm = String(str || '').trim().match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/)
  if (!mm) return null
  let [, d, m, y] = mm.map(Number)
  if (y < 100) y += 2000
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2200) return null
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null
  return toKey(y, m - 1, d)
}

// Rango de años para el selector: 100 atrás, 5 adelante.
export const ANIOS = (() => {
  const n = new Date().getFullYear()
  const arr = []
  for (let y = n + 5; y >= n - 100; y--) arr.push(y)
  return arr
})()

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
