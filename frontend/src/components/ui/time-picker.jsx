import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Clock, X } from 'lucide-react'
import { cn } from '@/utils/cn'

const ANCHO = 256
const ALTO = 380
const TAM = 208          // diámetro de la esfera
const R_NUM = 82         // radio donde se colocan los números

const pad = (n) => String(n).padStart(2, '0')

// Valor 'HH:mm' (24 h) <-> { h12, min, pm }
const parse = (v) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v || '')
  if (!m) return null
  const h = Number(m[1])
  return { h12: h % 12 || 12, min: Number(m[2]), pm: h >= 12 }
}
const build = (h12, min, pm) => `${pad((h12 % 12) + (pm ? 12 : 0))}:${pad(min)}`
const fmt = (v) => {
  const p = parse(v)
  return p ? `${p.h12}:${pad(p.min)} ${p.pm ? 'PM' : 'AM'}` : ''
}

// Texto de horario ("10:00 AM", "8 am") <-> valor 'HH:mm' del reloj
export const horarioATime = (h) => {
  const m = /^\s*(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s*m?\.?\s*$/i.exec(h || '')
  if (m) {
    let hh = Number(m[1]) % 12
    if (m[3].toLowerCase() === 'p') hh += 12
    return `${pad(hh)}:${m[2] || '00'}`
  }
  const m24 = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(h || '')
  return m24 ? `${pad(Number(m24[1]))}:${m24[2]}` : ''
}
export const timeAHorario = (t) => {
  if (!t) return null
  const [hh, mm] = t.split(':').map(Number)
  return `${hh % 12 || 12}:${pad(mm)} ${hh >= 12 ? 'PM' : 'AM'}`
}

const posEnEsfera = (grados) => {
  const rad = (grados - 90) * Math.PI / 180
  return { left: TAM / 2 + R_NUM * Math.cos(rad), top: TAM / 2 + R_NUM * Math.sin(rad) }
}

// Selector de hora con reloj: primero se toca la hora y luego los minutos,
// con AM/PM aparte. Valor 'HH:mm'. El panel va en un portal para no
// recortarse dentro de modales con scroll (igual que DatePicker).
export function TimePicker({ value = '', onChange, id, className, clearable = true, disabled = false, placeholder = 'Seleccionar hora' }) {
  const [open, setOpen] = useState(false)
  const [modo, setModo] = useState('hora') // 'hora' | 'min'
  const [pos, setPos] = useState(null)
  const anchorRef = useRef(null)
  const popRef = useRef(null)
  const faceRef = useRef(null)
  const arrastrando = useRef(false)

  const actual = parse(value) || { h12: 12, min: 0, pm: false }

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

  const abrir = () => { setModo('hora'); setOpen(true) }

  // Convierte la posición del puntero sobre la esfera en hora o minuto
  const valorDesdePuntero = (e) => {
    const r = faceRef.current.getBoundingClientRect()
    const dx = e.clientX - (r.left + r.width / 2)
    const dy = e.clientY - (r.top + r.height / 2)
    const grados = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360
    return modo === 'hora'
      ? Math.round(grados / 30) % 12 || 12
      : Math.round(grados / 6) % 60
  }

  const aplicar = (e, soltar) => {
    const v = valorDesdePuntero(e)
    if (modo === 'hora') {
      onChange(build(v, actual.min, actual.pm))
      if (soltar) setModo('min')
    } else {
      onChange(build(actual.h12, v, actual.pm))
      if (soltar) setOpen(false)
    }
  }

  const alPresionar = (e) => {
    arrastrando.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    aplicar(e, false)
  }
  const alMover = (e) => { if (arrastrando.current) aplicar(e, false) }
  const alSoltar = (e) => {
    if (!arrastrando.current) return
    arrastrando.current = false
    aplicar(e, true)
  }

  const cambiarAmPm = (pm) => onChange(build(actual.h12, actual.min, pm))

  const numeros = modo === 'hora'
    ? Array.from({ length: 12 }, (_, i) => ({ n: i + 1, etiqueta: String(i + 1), grados: (i + 1) * 30 }))
    : Array.from({ length: 12 }, (_, i) => ({ n: i * 5, etiqueta: pad(i * 5), grados: i * 30 }))

  const gradosMano = modo === 'hora' ? actual.h12 * 30 : actual.min * 6
  const seleccionado = modo === 'hora' ? actual.h12 : actual.min

  return (
    <div ref={anchorRef} className={cn('relative', className)}>
      <div className={cn(
        'flex h-10 items-center gap-2 rounded-md border bg-background px-3 text-sm',
        value ? 'border-primary-700' : 'border-input',
      )}>
        <button
          type="button"
          id={id}
          onClick={() => (open ? setOpen(false) : abrir())}
          disabled={disabled}
          className="flex min-w-0 flex-1 items-center gap-2 text-left disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Abrir reloj"
        >
          <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className={cn('truncate', !value && 'text-muted-foreground')}>{fmt(value) || placeholder}</span>
        </button>
        {clearable && value && (
          <button
            type="button"
            aria-label="Limpiar hora"
            onClick={() => onChange('')}
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
          className="rounded-lg border bg-card p-4 shadow-lg"
        >
          <div className="mb-3 flex items-center justify-center gap-3">
            <div className="flex items-baseline text-3xl font-semibold tabular-nums">
              <button
                type="button"
                onClick={() => setModo('hora')}
                className={cn('rounded px-1.5', modo === 'hora' ? 'bg-primary-700 text-white' : 'text-muted-foreground hover:bg-muted')}
              >
                {actual.h12}
              </button>
              <span className="px-0.5">:</span>
              <button
                type="button"
                onClick={() => setModo('min')}
                className={cn('rounded px-1.5', modo === 'min' ? 'bg-primary-700 text-white' : 'text-muted-foreground hover:bg-muted')}
              >
                {pad(actual.min)}
              </button>
            </div>
            <div className="flex flex-col overflow-hidden rounded-md border text-xs font-medium">
              {[['AM', false], ['PM', true]].map(([txt, pm]) => (
                <button
                  key={txt}
                  type="button"
                  onClick={() => cambiarAmPm(pm)}
                  className={cn('px-2 py-1', actual.pm === pm ? 'bg-primary-700 text-white' : 'text-muted-foreground hover:bg-muted')}
                >
                  {txt}
                </button>
              ))}
            </div>
          </div>

          <div
            ref={faceRef}
            onPointerDown={alPresionar}
            onPointerMove={alMover}
            onPointerUp={alSoltar}
            onPointerCancel={() => { arrastrando.current = false }}
            style={{ width: TAM, height: TAM, touchAction: 'none' }}
            className="relative mx-auto cursor-pointer select-none rounded-full bg-muted"
          >
            {/* mano del reloj */}
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 h-0.5 origin-left bg-primary-700"
              style={{ width: R_NUM, transform: `rotate(${gradosMano - 90}deg)` }}
            />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-700" />
            {/* minuto exacto que no cae en un múltiplo de 5 */}
            {modo === 'min' && actual.min % 5 !== 0 && (
              <span
                className="pointer-events-none absolute h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-700"
                style={posEnEsfera(actual.min * 6)}
              />
            )}
            {numeros.map(({ n, etiqueta, grados }) => (
              <span
                key={etiqueta}
                className={cn(
                  'pointer-events-none absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-sm',
                  n === seleccionado ? 'bg-primary-700 font-semibold text-white' : 'text-foreground',
                )}
                style={posEnEsfera(grados)}
              >
                {etiqueta}
              </span>
            ))}
          </div>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            {modo === 'hora' ? 'Elige la hora' : 'Elige los minutos'}
          </p>
        </div>,
        document.body,
      )}
    </div>
  )
}

// Rango "8:00 AM a 3:30 PM" con dos relojes (Desde / Hasta). 'Hasta' es opcional:
// solo con 'Desde' el valor queda como "8:00 AM".
const SEP_RANGO = /\s+(?:a|al|hasta|-|–)\s+/i
const partirRango = (texto) => {
  const [d = '', h = ''] = (texto || '').split(SEP_RANGO)
  return { desde: horarioATime(d), hasta: horarioATime(h) }
}
const unirRango = ({ desde, hasta }) => {
  if (!desde) return ''
  return hasta ? `${timeAHorario(desde)} a ${timeAHorario(hasta)}` : timeAHorario(desde)
}

export function RangoHoraPicker({ value = '', onChange, className }) {
  const [rango, setRango] = useState(() => partirRango(value))

  // Sincroniza cuando el valor cambia desde fuera (p. ej. datos leídos de una carta)
  useEffect(() => {
    if (value !== unirRango(rango)) setRango(partirRango(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const cambiar = (campo) => (t) => {
    const nuevo = { ...rango, [campo]: t }
    if (campo === 'desde' && !t) nuevo.hasta = ''
    setRango(nuevo)
    onChange(unirRango(nuevo))
  }

  return (
    <div className={cn('grid grid-cols-2 gap-2', className)}>
      <TimePicker value={rango.desde} onChange={cambiar('desde')} placeholder="Desde" />
      <TimePicker
        value={rango.hasta}
        onChange={cambiar('hasta')}
        placeholder="Hasta"
        disabled={!rango.desde}
      />
    </div>
  )
}
