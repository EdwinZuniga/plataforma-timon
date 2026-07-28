import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/useAuthStore'
import { getActividades } from '@/api/actividades'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PageSpinner } from '@/components/ui/spinner'
import { formatCalendarDate, getCalendarMonth } from '@/utils/dates'
import { Plus, ChevronRight, Calendar, Clock } from 'lucide-react'
import { ActividadModal } from './ActividadModal'

const TIPO_BADGE = { RETIRO: 'default', ASAMBLEA: 'secondary', ENCUENTRO: 'success', MISION: 'warning', FORMACION: 'outline', OTRO: 'secondary' }
const TIPO_LABEL = { RETIRO: 'Retiro', ASAMBLEA: 'Asamblea', ENCUENTRO: 'Encuentro', MISION: 'Misión', FORMACION: 'Formación', OTRO: 'Otro' }

const AÑOS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

function agruparPorMes(actividades) {
  const grupos = []
  let grupoActual = null
  for (const a of actividades) {
    const { mes, anio } = getCalendarMonth(a.fecha)
    const key = `${anio}-${mes}`
    if (!grupoActual || grupoActual.key !== key) {
      grupoActual = { key, label: formatCalendarDate(a.fecha, { year: 'numeric', month: 'long', timeZone: 'UTC' }), items: [] }
      grupos.push(grupoActual)
    }
    grupoActual.items.push(a)
  }
  return grupos
}

const hoyISO = new Date().toISOString().slice(0, 10)
const esProgramada = (fecha) => new Date(fecha).toISOString().slice(0, 10) >= hoyISO

export default function ActividadesPage() {
  const { equipoActual } = useAuthStore()
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [tipo, setTipo] = useState('')
  const [showModal, setShowModal] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['actividades', equipoActual?.id, anio, tipo],
    queryFn: () => getActividades(equipoActual.id, { anio, tipo }).then((r) => r.data),
    enabled: !!equipoActual?.id,
  })

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Actividades</h1>
          <p className="text-sm text-muted-foreground">{data?.pagination?.total ?? '—'} actividades</p>
        </div>
        <Button onClick={() => setShowModal(true)} size="sm"><Plus className="h-4 w-4" /> Nueva</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <select className="h-11 rounded-md border border-input bg-background px-3 text-sm" value={anio} onChange={(e) => setAnio(e.target.value)}>
          {AÑOS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className="h-11 rounded-md border border-input bg-background px-3 text-sm" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {isLoading ? <PageSpinner /> : (
        <div className="space-y-4">
          {agruparPorMes(data?.data ?? []).map((grupo) => (
            <div key={grupo.key} className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide pt-2">{grupo.label}</h2>
              {grupo.items.map((a) => (
                <Link key={a.id} to={`/actividades/${a.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="flex items-center gap-3 py-3 px-4">
                      <div className="h-10 w-10 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                        <Calendar className="h-5 w-5 text-primary-700 dark:text-primary-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{a.nombre}</p>
                          <Badge variant={TIPO_BADGE[a.tipo]}>{TIPO_LABEL[a.tipo]}</Badge>
                          {esProgramada(a.fecha) && (
                            <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Programada</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(a.fecha).toLocaleDateString('es-SV')} {a.lugar && `· ${a.lugar}`}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm text-muted-foreground">{a._count?.asistencias} asistentes</p>
                        <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ))}
          {data?.data?.length === 0 && <div className="text-center py-12 text-muted-foreground">No hay actividades para este período</div>}
        </div>
      )}

      {showModal && <ActividadModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); refetch() }} />}
    </div>
  )
}
