import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/useAuthStore'
import {
  getActividad,
  getAsistencia,
  saveAsistencia,
  getAsistenciaMiembros,
  saveAsistenciaMiembros,
} from '@/api/actividades'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageSpinner } from '@/components/ui/spinner'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { useDebounce } from '@/hooks/useDebounce'
import { formatCalendarDate } from '@/utils/dates'
import { buildGoogleCalendarUrl } from '@/utils/googleCalendar'
import { ArrowLeft, Search, Check, X as XIcon, CalendarPlus, Edit } from 'lucide-react'
import { ActividadModal } from './ActividadModal'

const TIPO_LABEL = { RETIRO: 'Retiro', ASAMBLEA: 'Asamblea', ENCUENTRO: 'Encuentro', MISION: 'Misión', FORMACION: 'Formación', OTRO: 'Otro' }
const ROL_LABEL = { COORDINADOR: 'Coordinador', MIEMBRO: 'Miembro', SECRETARIO: 'Secretario', CONSULTOR: 'Consultor' }

const TABS = [
  { key: 'equipo', label: 'Equipo' },
  { key: 'hermanos', label: 'Hermanos' },
]

function AsistenciaLista({ equipoId, actividadId, idField, secondaryLabel, queryKeyPrefix, getFn, saveFn, buscarPlaceholder }) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [localChanges, setLocalChanges] = useState({})
  const debouncedQ = useDebounce(q, 300)

  const { data: asistencia, isLoading } = useQuery({
    queryKey: [queryKeyPrefix, actividadId, debouncedQ],
    queryFn: () => getFn(equipoId, actividadId, { q: debouncedQ }).then((r) => r.data.data),
    enabled: !!equipoId,
  })

  const { mutate: guardar, isPending } = useMutation({
    mutationFn: () => {
      const registros = Object.entries(localChanges).map(([id, presente]) => ({ [idField]: id, presente }))
      return saveFn(equipoId, actividadId, registros)
    },
    onSuccess: () => {
      toast({ title: 'Asistencia guardada' })
      setLocalChanges({})
      qc.invalidateQueries({ queryKey: [queryKeyPrefix, actividadId] })
    },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, variant: 'destructive' }),
  })

  const toggle = (id, currentValue) => {
    setLocalChanges((prev) => ({ ...prev, [id]: !currentValue }))
  }

  const getPresente = (item) => {
    if (localChanges[item[idField]] !== undefined) return localChanges[item[idField]]
    return item.presente
  }

  const changesCount = Object.keys(localChanges).length
  const presentesCount = asistencia?.filter((item) => getPresente(item)).length ?? 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {presentesCount} presentes de {asistencia?.length ?? 0} registrados
        </div>
        <Button
          size="sm"
          disabled={changesCount === 0 || isPending}
          onClick={() => guardar()}
        >
          {isPending ? 'Guardando...' : `Guardar ${changesCount > 0 ? `(${changesCount})` : ''}`}
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder={buscarPlaceholder} className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {isLoading ? <PageSpinner /> : (
        <div className="space-y-2">
          {asistencia?.map((item) => {
            const presente = getPresente(item)
            const changed = localChanges[item[idField]] !== undefined
            return (
              <Card
                key={item[idField]}
                className={`cursor-pointer transition-colors ${presente ? 'border-green-300 dark:border-green-700' : ''} ${changed ? 'ring-2 ring-primary-500' : ''}`}
                onClick={() => toggle(item[idField], presente)}
              >
                <CardContent className="flex items-center gap-3 py-3 px-4">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${presente ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
                    {presente
                      ? <Check className="h-4 w-4 text-green-600" />
                      : <XIcon className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{item.nombre} {item.apellido || ''}</p>
                    <p className="text-xs text-muted-foreground">{secondaryLabel(item)}</p>
                  </div>
                  {presente && <Badge variant="success">Presente</Badge>}
                </CardContent>
              </Card>
            )
          })}
          {asistencia?.length === 0 && <div className="text-center py-8 text-muted-foreground">Sin resultados</div>}
        </div>
      )}
    </div>
  )
}

export default function ActividadDetailPage() {
  const { id } = useParams()
  const { equipoActual } = useAuthStore()
  const qc = useQueryClient()
  const [tab, setTab] = useState('equipo')
  const [editModal, setEditModal] = useState(false)

  const { data: actividad, isLoading } = useQuery({
    queryKey: ['actividad', id],
    queryFn: () => getActividad(equipoActual.id, id).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

  if (isLoading) return <PageSpinner />
  if (!actividad) return <div className="p-6 text-muted-foreground">Actividad no encontrada</div>

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/actividades"><button className="min-h-0 h-auto p-1 text-muted-foreground"><ArrowLeft className="h-5 w-5" /></button></Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{actividad.nombre}</h1>
          <p className="text-sm text-muted-foreground">
            {formatCalendarDate(actividad.fecha)} · {TIPO_LABEL[actividad.tipo]}
            {actividad.lugar && ` · ${actividad.lugar}`}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" variant="outline" onClick={() => setEditModal(true)} title="Editar">
            <Edit className="h-4 w-4" />
            <span className="hidden md:inline ml-1">Editar</span>
          </Button>
          <a href={buildGoogleCalendarUrl(actividad)} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline"><CalendarPlus className="h-4 w-4" /><span className="hidden md:inline ml-1">Google Calendar</span></Button>
          </a>
        </div>
      </div>

      {actividad.descripcion && (
        <p className="text-sm text-muted-foreground whitespace-pre-line">{actividad.descripcion}</p>
      )}

      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'hermanos' ? (
        <AsistenciaLista
          equipoId={equipoActual.id}
          actividadId={id}
          idField="hermanoId"
          secondaryLabel={(h) => h.comunidad}
          queryKeyPrefix="asistencia"
          getFn={getAsistencia}
          saveFn={saveAsistencia}
          buscarPlaceholder="Buscar hermano..."
        />
      ) : (
        <AsistenciaLista
          equipoId={equipoActual.id}
          actividadId={id}
          idField="miembroId"
          secondaryLabel={(m) => ROL_LABEL[m.rol] || m.rol}
          queryKeyPrefix="asistencia-miembros"
          getFn={getAsistenciaMiembros}
          saveFn={saveAsistenciaMiembros}
          buscarPlaceholder="Buscar miembro..."
        />
      )}

      {editModal && (
        <ActividadModal
          actividad={actividad}
          onClose={() => setEditModal(false)}
          onSaved={() => {
            setEditModal(false)
            qc.invalidateQueries({ queryKey: ['actividad', id] })
            qc.invalidateQueries({ queryKey: ['actividades'] })
          }}
        />
      )}
    </div>
  )
}
