import { useRef, useState } from 'react'
import { Calendar, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from './button'
import { CalendarioMes } from './_calendario'
import { fmtCorto, hoyKey, parseKey, toKey, useCerrarPopover } from './_calendario-core'

// Calendario de rango autocontenido (sin dependencias). Valores 'YYYY-MM-DD'.
export function DateRangePicker({ desde = '', hasta = '', onChange, className }) {
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState(null)   // primer día elegido, aún sin cerrar el rango
  const [hover, setHover] = useState(null)
  const ref = useRef(null)

  const inicial = parseKey(desde || hasta || hoyKey())
  const [vy, setVy] = useState(inicial.y)
  const [vm, setVm] = useState(inicial.m)

  useCerrarPopover(ref, open, setOpen)

  const abrir = () => {
    const { y, m } = parseKey(desde || hasta || hoyKey())
    setVy(y); setVm(m); setAnchor(null); setHover(null)
    setOpen((o) => !o)
  }

  const irMes = (delta) => {
    const base = new Date(vy, vm + delta, 1)
    setVy(base.getFullYear()); setVm(base.getMonth())
  }

  const emitir = (d, h) => { onChange({ desde: d, hasta: h }); setOpen(false) }
  const limpiar = () => { setAnchor(null); onChange({ desde: '', hasta: '' }) }

  const clicDia = (k) => {
    if (!anchor) {
      setAnchor(k)
      onChange({ desde: k, hasta: '' })
      return
    }
    const [a, b] = anchor <= k ? [anchor, k] : [k, anchor]
    setAnchor(null)
    emitir(a, b)
  }

  const enRango = (k) => {
    const lo = anchor || desde
    const hi = anchor ? (hover || anchor) : hasta
    if (!lo || !hi) return false
    const [a, b] = lo <= hi ? [lo, hi] : [hi, lo]
    return k >= a && k <= b
  }

  const presetMesActual = () => {
    const n = new Date(); const y = n.getFullYear(); const m = n.getMonth()
    emitir(toKey(y, m, 1), toKey(y, m, new Date(y, m + 1, 0).getDate()))
  }
  const presetUltimos3 = () => {
    const n = new Date(); const ini = new Date(n.getFullYear(), n.getMonth() - 2, 1)
    emitir(toKey(ini.getFullYear(), ini.getMonth(), 1), hoyKey())
  }
  const presetAnio = () => { const y = new Date().getFullYear(); emitir(toKey(y, 0, 1), toKey(y, 11, 31)) }

  const activo = !!(desde || hasta)
  const label = desde && hasta
    ? `${fmtCorto(desde, desde.slice(0, 4) !== hasta.slice(0, 4))} – ${fmtCorto(hasta)}`
    : desde ? `Desde ${fmtCorto(desde)}`
      : hasta ? `Hasta ${fmtCorto(hasta)}`
        : 'Filtrar por fecha'

  return (
    <div ref={ref} className={cn('relative', className)}>
      <div className={cn(
        'flex h-11 items-center gap-2 rounded-md border bg-background px-3 text-sm',
        activo ? 'border-primary-700' : 'border-input',
      )}>
        <button
          type="button"
          onClick={abrir}
          className="flex flex-1 items-center gap-2 min-w-0 text-left"
        >
          <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className={cn('truncate', !activo && 'text-muted-foreground')}>{label}</span>
        </button>
        {activo && (
          <button
            type="button"
            aria-label="Limpiar fechas"
            onClick={limpiar}
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[19rem] max-w-[calc(100vw-2rem)] rounded-lg border bg-card p-3 shadow-lg">
          <CalendarioMes
            vy={vy}
            vm={vm}
            irMes={irMes}
            esBorde={(k) => k === desde || k === hasta || k === anchor}
            enRango={enRango}
            onDia={clicDia}
            onHover={setHover}
          />

          <div className="mt-3 flex flex-wrap gap-1.5">
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={presetMesActual}>Este mes</Button>
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={presetUltimos3}>Últimos 3 meses</Button>
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={presetAnio}>Este año</Button>
            {activo && (
              <Button type="button" variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={() => { limpiar(); setOpen(false) }}>
                Limpiar
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
