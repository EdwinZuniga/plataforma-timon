import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { getCalendario, descargarIcs } from '@/api/calendario'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/utils/cn'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

const TIPOS = {
  REUNION: { label: 'Reuniones', punto: 'bg-violet-500' },
  ACTIVIDAD: { label: 'Actividades', punto: 'bg-blue-500' },
  SERVICIO: { label: 'Servicios', punto: 'bg-emerald-500' },
  VISITA: { label: 'Visitas', punto: 'bg-orange-500' },
  TALLER: { label: 'Talleres', punto: 'bg-pink-500' },
  ACUERDO: { label: 'Acuerdos', punto: 'bg-red-500' },
  PRESTAMO: { label: 'Préstamos', punto: 'bg-slate-500' },
}

const pad = (n) => String(n).padStart(2, '0')
const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}` // m: 0-11
const hoyISO = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/El_Salvador' })

// Días (YYYY-MM-DD) que cubre un evento dentro del rango visible
const diasDelEvento = (e, desde, hasta) => {
  const dias = []
  const fin = e.fechaFin && e.fechaFin > e.fecha ? e.fechaFin : e.fecha
  const cursor = new Date(`${e.fecha < desde ? desde : e.fecha}T00:00:00.000Z`)
  const tope = new Date(`${fin > hasta ? hasta : fin}T00:00:00.000Z`)
  while (cursor <= tope) {
    dias.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dias
}

export default function CalendarioPage() {
  const { equipoActual } = useAuthStore()
  const { toast } = useToast()
  const hoy = hoyISO()
  const [anio, setAnio] = useState(Number(hoy.slice(0, 4)))
  const [mes, setMes] = useState(Number(hoy.slice(5, 7)) - 1)
  const [seleccionado, setSeleccionado] = useState(hoy)
  const [ocultos, setOcultos] = useState(new Set())
  const [soloMio, setSoloMio] = useState(false)
  const [exportando, setExportando] = useState(false)

  // Cuadrícula de 6 semanas desde el lunes anterior (o igual) al día 1
  const { celdas, desde, hasta } = useMemo(() => {
    const primero = new Date(Date.UTC(anio, mes, 1))
    const offset = (primero.getUTCDay() + 6) % 7
    const inicio = new Date(Date.UTC(anio, mes, 1 - offset))
    const celdas = Array.from({ length: 42 }, (_, i) => {
      const d = new Date(inicio.getTime() + i * 86400000)
      return { fecha: d.toISOString().slice(0, 10), dia: d.getUTCDate(), delMes: d.getUTCMonth() === mes }
    })
    return { celdas, desde: celdas[0].fecha, hasta: celdas[41].fecha }
  }, [anio, mes])

  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ['calendario', equipoActual?.id, desde, hasta],
    queryFn: () => getCalendario(equipoActual.id, { desde, hasta }).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

  const porDia = useMemo(() => {
    const mapa = {}
    for (const e of eventos) {
      if (ocultos.has(e.tipo) || (soloMio && !e.mio)) continue
      for (const dia of diasDelEvento(e, desde, hasta)) (mapa[dia] ||= []).push(e)
    }
    return mapa
  }, [eventos, ocultos, soloMio, desde, hasta])

  const irMes = (delta) => {
    const d = new Date(Date.UTC(anio, mes + delta, 1))
    setAnio(d.getUTCFullYear())
    setMes(d.getUTCMonth())
  }

  const alternarTipo = (tipo) =>
    setOcultos((prev) => {
      const sig = new Set(prev)
      sig.has(tipo) ? sig.delete(tipo) : sig.add(tipo)
      return sig
    })

  const exportar = async () => {
    setExportando(true)
    try {
      // Del primer día del mes visible hasta 12 meses después
      const ini = iso(anio, mes, 1)
      const fin = new Date(Date.UTC(anio, mes + 12, 0)).toISOString().slice(0, 10)
      const res = await descargarIcs(equipoActual.id, { desde: ini, hasta: fin })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'calendario-timon.ics'
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: 'Calendario exportado', description: 'Ábrelo para importarlo a Google Calendar, Outlook o Apple Calendar.' })
    } catch {
      toast({ title: 'No se pudo exportar el calendario', variant: 'destructive' })
    } finally {
      setExportando(false)
    }
  }

  const delDia = porDia[seleccionado] || []
  const fechaLarga = new Date(`${seleccionado}T00:00:00.000Z`).toLocaleDateString('es-SV', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Calendario</h1>
          <p className="text-sm text-muted-foreground">Reuniones, actividades, servicios, visitas, talleres y vencimientos</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportar} disabled={exportando} title="Exportar a .ics (12 meses)">
          <Download className="h-4 w-4" /> <span className="hidden sm:inline">Exportar</span>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(TIPOS).map(([tipo, { label, punto }]) => (
          <button
            key={tipo}
            onClick={() => alternarTipo(tipo)}
            aria-pressed={!ocultos.has(tipo)}
            className={cn(
              'min-h-0 h-auto flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              ocultos.has(tipo) ? 'text-muted-foreground opacity-60' : 'bg-accent'
            )}
          >
            <span className={cn('h-2 w-2 rounded-full', punto)} /> {label}
          </button>
        ))}
        <button
          onClick={() => setSoloMio(!soloMio)}
          aria-pressed={soloMio}
          className={cn(
            'min-h-0 h-auto rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            soloMio ? 'bg-primary-700 text-white border-primary-700' : 'text-muted-foreground'
          )}
        >
          Solo lo mío
        </button>
      </div>

      <Card>
        <CardContent className="p-3 md:p-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => irMes(-1)} aria-label="Mes anterior" className="min-h-0 h-auto p-2 rounded-lg hover:bg-accent"><ChevronLeft className="h-5 w-5" /></button>
            <div className="text-center">
              <p className="font-semibold">{MESES[mes]} {anio}</p>
              {(anio !== Number(hoy.slice(0, 4)) || mes !== Number(hoy.slice(5, 7)) - 1) && (
                <button
                  onClick={() => { setAnio(Number(hoy.slice(0, 4))); setMes(Number(hoy.slice(5, 7)) - 1); setSeleccionado(hoy) }}
                  className="min-h-0 h-auto text-xs text-primary-700 dark:text-primary-400 underline"
                >
                  Ir a hoy
                </button>
              )}
            </div>
            <button onClick={() => irMes(1)} aria-label="Mes siguiente" className="min-h-0 h-auto p-2 rounded-lg hover:bg-accent"><ChevronRight className="h-5 w-5" /></button>
          </div>

          <div className="grid grid-cols-7 text-center text-xs text-muted-foreground mb-1">
            {DIAS.map((d, i) => <div key={i} className="py-1">{d}</div>)}
          </div>
          <div className={cn('grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border', isLoading && 'opacity-60')}>
            {celdas.map((c) => {
              const evs = porDia[c.fecha] || []
              const tipos = [...new Set(evs.map((e) => e.tipo))]
              return (
                <button
                  key={c.fecha}
                  onClick={() => setSeleccionado(c.fecha)}
                  aria-label={`${c.dia}, ${evs.length} eventos`}
                  className={cn(
                    'min-h-[52px] md:min-h-[84px] bg-card p-1 flex flex-col items-center md:items-start gap-1 text-sm transition-colors hover:bg-accent',
                    !c.delMes && 'text-muted-foreground/50',
                    c.fecha === seleccionado && 'ring-2 ring-inset ring-primary-700'
                  )}
                >
                  <span className={cn('h-6 w-6 flex items-center justify-center rounded-full text-xs', c.fecha === hoy && 'bg-primary-700 text-white font-bold')}>
                    {c.dia}
                  </span>
                  <span className="flex flex-wrap gap-0.5 justify-center md:justify-start">
                    {tipos.slice(0, 6).map((t) => <span key={t} className={cn('h-1.5 w-1.5 rounded-full', TIPOS[t].punto)} />)}
                  </span>
                  {evs.length > 0 && <span className="hidden md:block text-[10px] text-muted-foreground">{evs.length} evento{evs.length > 1 ? 's' : ''}</span>}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <section className="space-y-2">
        <h2 className="font-semibold capitalize">{fechaLarga}</h2>
        {delDia.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Sin eventos este día.</p>
        ) : (
          delDia.map((e) => (
            <Link key={e.id} to={e.link}>
              <Card className="hover:bg-accent transition-colors mb-2">
                <CardContent className="flex items-start gap-3 py-3 px-4">
                  <span className={cn('h-2.5 w-2.5 rounded-full mt-1.5 shrink-0', TIPOS[e.tipo].punto)} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{e.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {[TIPOS[e.tipo].label.replace(/s$/, ''), e.hora, e.detalle].filter(Boolean).join(' · ')}
                      {e.mio && ' · A tu cargo'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </section>
    </div>
  )
}
