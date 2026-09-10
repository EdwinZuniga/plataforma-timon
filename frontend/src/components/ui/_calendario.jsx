import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'
import { ANIOS, DIAS, MESES, cap, hoyKey, parseKey, toKey } from './_calendario-core'

// Cabecera con selectores de mes/año + flechas, y cuadrícula de días de un mes.
// `esBorde(k)` → día resaltado (extremo del rango o fecha elegida);
// `enRango(k)` → día dentro del rango (opcional).
// `setMesAnio(y, m)` → salto directo a un mes/año.
export function CalendarioMes({ vy, vm, irMes, setMesAnio, esBorde, enRango, onDia, onHover }) {
  const celdas = useMemo(() => {
    const offset = (new Date(vy, vm, 1).getDay() + 6) % 7   // lunes = 0
    const total = new Date(vy, vm + 1, 0).getDate()
    const arr = Array(offset).fill(null)
    for (let d = 1; d <= total; d++) arr.push(toKey(vy, vm, d))
    return arr
  }, [vy, vm])

  const selCls = 'h-8 rounded-md border border-input bg-background px-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring'

  return (
    <>
      <div className="mb-2 flex items-center gap-1">
        <button type="button" onClick={() => irMes(-1)} className="shrink-0 rounded p-1 hover:bg-muted" aria-label="Mes anterior">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <select
          value={vm}
          onChange={(e) => setMesAnio(vy, Number(e.target.value))}
          className={cn(selCls, 'flex-1 min-w-0')}
          aria-label="Mes"
        >
          {MESES.map((m, i) => <option key={i} value={i}>{cap(m)}</option>)}
        </select>
        <select
          value={vy}
          onChange={(e) => setMesAnio(Number(e.target.value), vm)}
          className={cn(selCls, 'shrink-0')}
          aria-label="Año"
        >
          {ANIOS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <button type="button" onClick={() => irMes(1)} className="shrink-0 rounded p-1 hover:bg-muted" aria-label="Mes siguiente">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[0.7rem] text-muted-foreground">
        {DIAS.map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {celdas.map((k, i) => {
          if (!k) return <div key={i} />
          const borde = esBorde(k)
          const rango = enRango?.(k)
          return (
            <button
              key={i}
              type="button"
              onMouseEnter={onHover ? () => onHover(k) : undefined}
              onClick={() => onDia(k)}
              className={cn(
                'h-8 rounded text-sm transition-colors',
                rango && !borde && 'bg-primary-700/10',
                borde ? 'bg-primary-700 font-medium text-white' : 'hover:bg-muted',
                k === hoyKey() && !borde && 'ring-1 ring-inset ring-primary-700/40',
              )}
            >
              {parseKey(k).d}
            </button>
          )
        })}
      </div>
    </>
  )
}
