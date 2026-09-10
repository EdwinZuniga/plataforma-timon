import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { CalendarioMes } from './_calendario'
import { fmtTexto, hoyKey, parseKey, parseTexto } from './_calendario-core'

const ANCHO = 304   // 19rem
const ALTO = 330

// Selector de una sola fecha: se puede escribir (dd/mm/aaaa) o elegir en el
// calendario, con selectores de mes y año. Valor 'YYYY-MM-DD'. El panel se
// renderiza en un portal para no recortarse dentro de modales con scroll.
export function DatePicker({ value = '', onChange, id, className, clearable = false, placeholder = 'dd/mm/aaaa' }) {
  const [open, setOpen] = useState(false)
  const [texto, setTexto] = useState(fmtTexto(value))
  const [pos, setPos] = useState(null)
  const anchorRef = useRef(null)
  const popRef = useRef(null)

  const inicial = parseKey(value || hoyKey())
  const [vy, setVy] = useState(inicial.y)
  const [vm, setVm] = useState(inicial.m)

  useEffect(() => { setTexto(fmtTexto(value)) }, [value])

  const calcularPos = () => {
    const r = anchorRef.current?.getBoundingClientRect()
    if (!r) return
    const arriba = window.innerHeight - r.bottom < ALTO && r.top > ALTO
    const left = Math.max(8, Math.min(r.left, window.innerWidth - ANCHO - 8))
    setPos({
      left,
      top: arriba ? undefined : Math.round(r.bottom + 4),
      bottom: arriba ? Math.round(window.innerHeight - r.top + 4) : undefined,
    })
  }

  useLayoutEffect(() => { if (open) calcularPos() }, [open])

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (anchorRef.current?.contains(e.target) || popRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    const onReflow = () => calcularPos()
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onReflow)
    window.addEventListener('scroll', onReflow, true)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onReflow)
      window.removeEventListener('scroll', onReflow, true)
    }
  }, [open])

  const irMes = (delta) => {
    const b = new Date(vy, vm + delta, 1)
    setVy(b.getFullYear()); setVm(b.getMonth())
  }
  const setMesAnio = (y, m) => { setVy(y); setVm(m) }
  const elegir = (k) => { onChange(k); setOpen(false) }

  const abrir = () => {
    const { y, m } = parseKey(value || hoyKey())
    setVy(y); setVm(m)
    setOpen(true)
  }

  const alEscribir = (e) => {
    const v = e.target.value
    setTexto(v)
    const k = parseTexto(v)
    if (k) {
      const p = parseKey(k)
      setVy(p.y); setVm(p.m)
      onChange(k)
    } else if (v.trim() === '') {
      onChange('')
    }
  }
  const alSalir = () => {
    const k = parseTexto(texto)
    setTexto(k ? fmtTexto(k) : fmtTexto(value))
  }

  return (
    <div ref={anchorRef} className={cn('relative', className)}>
      <div className={cn(
        'flex h-11 items-center gap-2 rounded-md border bg-background px-3 text-sm',
        value ? 'border-primary-700' : 'border-input',
      )}>
        <button
          type="button"
          onClick={() => (open ? setOpen(false) : abrir())}
          className="shrink-0 text-muted-foreground"
          aria-label="Abrir calendario"
        >
          <Calendar className="h-4 w-4" />
        </button>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={texto}
          placeholder={placeholder}
          onChange={alEscribir}
          onFocus={abrir}
          onBlur={alSalir}
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        />
        {clearable && value && (
          <button
            type="button"
            aria-label="Limpiar fecha"
            onClick={() => { onChange(''); setTexto('') }}
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && pos && createPortal(
        <div
          ref={popRef}
          style={{
            position: 'fixed',
            left: pos.left,
            top: pos.top,
            bottom: pos.bottom,
            width: ANCHO,
            maxWidth: 'calc(100vw - 1rem)',
            zIndex: 60,
          }}
          className="rounded-lg border bg-card p-3 shadow-lg"
        >
          <CalendarioMes
            vy={vy}
            vm={vm}
            irMes={irMes}
            setMesAnio={setMesAnio}
            esBorde={(k) => k === value}
            onDia={elegir}
          />
        </div>,
        document.body,
      )}
    </div>
  )
}
