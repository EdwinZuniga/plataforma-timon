import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bell, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { getAvisos } from '@/api/calendario'
import { cn } from '@/utils/cn'

const NIVELES = {
  urgente: { icon: AlertCircle, color: 'text-red-500' },
  atencion: { icon: AlertTriangle, color: 'text-amber-500' },
  info: { icon: Info, color: 'text-primary-700 dark:text-primary-400' },
}

// "Visto" se guarda por usuario y equipo en este dispositivo.
const claveVistos = (usuarioId, equipoId) => `avisosVistos:${usuarioId}:${equipoId}`
const leerVistos = (clave) => {
  try { return new Set(JSON.parse(localStorage.getItem(clave) || '[]')) } catch { return new Set() }
}

export function AvisosBell({ className }) {
  const { usuario, equipoActual } = useAuthStore()
  const [abierto, setAbierto] = useState(false)
  const contenedor = useRef(null)
  const clave = claveVistos(usuario?.id, equipoActual?.id)
  const [vistos, setVistos] = useState(() => leerVistos(clave))

  useEffect(() => { setVistos(leerVistos(clave)) }, [clave])

  const { data: avisos = [] } = useQuery({
    queryKey: ['avisos', equipoActual?.id],
    queryFn: () => getAvisos(equipoActual.id).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  })

  const sinVer = useMemo(() => avisos.filter((a) => !vistos.has(a.id)).length, [avisos, vistos])

  const marcarVistos = () => {
    const todos = new Set(avisos.map((a) => a.id)) // descarta ids de avisos que ya no existen
    try { localStorage.setItem(clave, JSON.stringify([...todos])) } catch { /* sin almacenamiento */ }
    setVistos(todos)
  }

  const alternar = () => {
    if (abierto) marcarVistos()
    setAbierto(!abierto)
  }

  useEffect(() => {
    if (!abierto) return
    const cerrar = (e) => {
      if (contenedor.current && !contenedor.current.contains(e.target)) {
        marcarVistos()
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', cerrar)
    return () => document.removeEventListener('mousedown', cerrar)
  })

  return (
    <div className={cn('relative', className)} ref={contenedor}>
      <button
        type="button"
        onClick={alternar}
        aria-label={sinVer > 0 ? `Avisos, ${sinVer} sin ver` : 'Avisos'}
        aria-expanded={abierto}
        className="relative min-h-0 h-auto p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
        <Bell className="h-5 w-5" />
        {sinVer > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
            {sinVer > 9 ? '9+' : sinVer}
          </span>
        )}
      </button>

      {abierto && (
        <div className="fixed left-3 right-3 top-[calc(4rem+env(safe-area-inset-top,0px))] md:left-[17rem] md:right-auto md:top-4 md:w-96 z-50 rounded-xl border bg-popover text-popover-foreground shadow-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <p className="font-semibold">Avisos</p>
            <Link to="/calendario" onClick={() => { marcarVistos(); setAbierto(false) }} className="text-xs text-primary-700 dark:text-primary-400 underline">
              Ver calendario
            </Link>
          </div>
          {avisos.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No tienes avisos pendientes.</p>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto divide-y">
              {avisos.map((a) => {
                const { icon: Icon, color } = NIVELES[a.nivel] || NIVELES.info
                return (
                  <li key={a.id}>
                    <Link
                      to={a.link}
                      onClick={() => { marcarVistos(); setAbierto(false) }}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-accent transition-colors"
                    >
                      <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', color)} />
                      <div className="min-w-0 flex-1">
                        <p className={cn('text-sm', !vistos.has(a.id) ? 'font-semibold' : 'font-medium')}>{a.titulo}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{a.detalle}</p>
                      </div>
                      {!vistos.has(a.id) && <span className="h-2 w-2 rounded-full bg-primary-700 mt-1.5 shrink-0" aria-label="Nuevo" />}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
