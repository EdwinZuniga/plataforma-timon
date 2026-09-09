import { useRef, useState } from 'react'
import { Calendar, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { CalendarioMes } from './_calendario'
import { fmtCorto, hoyKey, parseKey, useCerrarPopover } from './_calendario-core'

// Selector de una sola fecha con calendario. Valor 'YYYY-MM-DD'.
export function DatePicker({ value = '', onChange, id, className, clearable = false, placeholder = 'Seleccionar fecha' }) {
  const [open, setOpen] = useState(false)
  const [arriba, setArriba] = useState(false)
  const ref = useRef(null)

  const inicial = parseKey(value || hoyKey())
  const [vy, setVy] = useState(inicial.y)
  const [vm, setVm] = useState(inicial.m)

  useCerrarPopover(ref, open, setOpen)

  const abrir = () => {
    const { y, m } = parseKey(value || hoyKey())
    setVy(y); setVm(m)
    const r = ref.current?.getBoundingClientRect()
    setArriba(r ? window.innerHeight - r.bottom < 340 : false)
    setOpen((o) => !o)
  }

  const irMes = (delta) => {
    const b = new Date(vy, vm + delta, 1)
    setVy(b.getFullYear()); setVm(b.getMonth())
  }

  const elegir = (k) => { onChange(k); setOpen(false) }

  return (
    <div ref={ref} className={cn('relative', className)}>
      <div className={cn(
        'flex h-11 items-center gap-2 rounded-md border bg-background px-3 text-sm',
        value ? 'border-primary-700' : 'border-input',
      )}>
        <button
          id={id}
          type="button"
          onClick={abrir}
          className="flex flex-1 items-center gap-2 min-w-0 text-left"
        >
          <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className={cn('truncate', !value && 'text-muted-foreground')}>
            {value ? fmtCorto(value) : placeholder}
          </span>
        </button>
        {clearable && value && (
          <button
            type="button"
            aria-label="Limpiar fecha"
            onClick={() => onChange('')}
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className={cn(
          'absolute right-0 z-50 w-[19rem] max-w-[calc(100vw-2rem)] rounded-lg border bg-card p-3 shadow-lg',
          arriba ? 'bottom-full mb-2' : 'top-full mt-2',
        )}>
          <CalendarioMes
            vy={vy}
            vm={vm}
            irMes={irMes}
            esBorde={(k) => k === value}
            onDia={elegir}
          />
        </div>
      )}
    </div>
  )
}
