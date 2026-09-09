import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'
import { DIAS, MESES, hoyKey, parseKey, toKey } from './_calendario-core'

// Cabecera con navegación + cuadrícula de días de un mes.
// `esBorde(k)` → día resaltado (extremo del rango o fecha elegida);
// `enRango(k)` → día dentro del rango (opcional).
export function CalendarioMes({ vy, vm, irMes, esBorde, enRango, onDia, onHover }) {
  const celdas = useMemo(() => {
    const offset = (new Date(vy, vm, 1).getDay() + 6) % 7   // lunes = 0
    const total = new Date(vy, vm + 1, 0).getDate()
    const arr = Array(offset).fill(null)
    for (let d = 1; d <= total; d++) arr.push(toKey(vy, vm, d))
    return arr
  }, [vy, vm])

  return (
    <>
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => irMes(-1)} className="rounded p-1 hover:bg-muted">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium capitalize">{MESES[vm]} {vy}</span>
        <button type="button" onClick={() => irMes(1)} className="rounded p-1 hover:bg-muted">
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
