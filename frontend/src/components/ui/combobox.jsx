import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/utils/cn'
import { ChevronsUpDown, Search, X } from 'lucide-react'

function normalize(str) {
  return (str || '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export function Combobox({ options, value, onChange, placeholder = 'Seleccionar...', searchPlaceholder = 'Buscar...', emptyLabel = 'Sin resultados', className }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [pos, setPos] = useState(null)
  const anchorRef = useRef(null)
  const popRef = useRef(null)
  const inputRef = useRef(null)

  const selected = options.find((o) => String(o.value) === String(value))

  const filtered = useMemo(() => {
    const q = normalize(query)
    if (!q) return options
    return options.filter((o) => normalize(o.label).includes(q) || normalize(o.sublabel).includes(q))
  }, [options, query])

  const calcularPos = () => {
    const r = anchorRef.current?.getBoundingClientRect()
    if (!r) return
    const alto = 300
    const arriba = window.innerHeight - r.bottom < alto && r.top > alto
    setPos({
      left: r.left,
      width: r.width,
      top: arriba ? undefined : Math.round(r.bottom + 4),
      bottom: arriba ? Math.round(window.innerHeight - r.top + 4) : undefined,
    })
  }

  useLayoutEffect(() => { if (open) calcularPos() }, [open])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setTimeout(() => inputRef.current?.focus(), 0)
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

  return (
    <div ref={anchorRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <span className={cn('truncate text-left', !selected && 'text-muted-foreground')}>
          {selected ? (selected.sublabel ? `${selected.label} — ${selected.sublabel}` : selected.label) : placeholder}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>

      {open && pos && createPortal(
        <div
          ref={popRef}
          style={{
            position: 'fixed',
            left: pos.left,
            width: pos.width,
            top: pos.top,
            bottom: pos.bottom,
            maxWidth: 'calc(100vw - 1rem)',
            zIndex: 60,
          }}
          className="rounded-md border border-input bg-popover text-popover-foreground shadow-lg overflow-hidden"
        >
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-4 w-4 shrink-0 opacity-50" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="min-h-0 h-auto p-0 text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <ul className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">{emptyLabel}</li>
            )}
            {filtered.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(o.value)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground',
                    String(o.value) === String(value) && 'bg-accent/60'
                  )}
                >
                  <span>{o.label}{o.sublabel ? <span className="text-muted-foreground"> — {o.sublabel}</span> : null}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>,
        document.body,
      )}
    </div>
  )
}
