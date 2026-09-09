import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/useAuthStore'
import { getHermano, getHistorial } from '@/api/hermanos'
import { deleteInscripcion } from '@/api/talleres'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageSpinner } from '@/components/ui/spinner'
import { Card, CardContent } from '@/components/ui/card'
import { HermanoModal } from './HermanoModal'
import { VincularTallerModal } from './VincularTallerModal'
import { TallerResumenModal } from './TallerResumenModal'
import { PhoneActions } from '@/components/shared/PhoneActions'
import { useToast } from '@/components/ui/toast'
import { ArrowLeft, Edit, CheckCircle, XCircle, PlusCircle, Trash2, BookOpen, BookCheck } from 'lucide-react'
import { formatCalendarDate } from '@/utils/dates'

const fmt = (d) => formatCalendarDate(d, { year: 'numeric', month: 'numeric', day: 'numeric' })

const hoyISO = new Date().toISOString().slice(0, 10)
const edicionFinalizada = (ins) => {
  const fin = ins.edicionTaller?.fechaFin
  return !!fin && new Date(fin).toISOString().slice(0, 10) < hoyISO
}

function RangoFecha({ inicio, fin }) {
  if (!inicio) return null
  if (fin) return <span>{fmt(inicio)} → {fmt(fin)}</span>
  return <span>Desde {fmt(inicio)} · en curso</span>
}

function TallerCard({ ins, onDesvincular, onVerResumen }) {
  const edicion = ins.edicionTaller
  const taller = edicion.taller
  return (
    <Card>
      <CardContent className="py-3 px-4">
        <div className="flex items-start justify-between gap-2">
          <button
            onClick={() => onVerResumen(ins)}
            className="flex-1 min-w-0 text-left hover:opacity-70 transition-opacity"
          >
            <p className="font-medium truncate">{taller.nombre}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              <RangoFecha inicio={edicion.fecha} fin={edicion.fechaFin} />
              {edicion.lugar && ` · ${edicion.lugar}`}
            </p>
          </button>
          <div className="flex items-center gap-1 shrink-0">
            {ins.aprobado === true && <Badge variant="success">Aprobado</Badge>}
            {ins.aprobado === false && <Badge variant="destructive">No aprobado</Badge>}
            {ins.aprobado === null && (
              edicionFinalizada(ins)
                ? <Badge variant="secondary">Finalizado</Badge>
                : ins.asistio
                  ? <Badge variant="secondary">Asistiendo</Badge>
                  : <Badge variant="outline">Inscrito</Badge>
            )}
            {ins.certificado && <Badge variant="default">Certificado</Badge>}
            <button
              onClick={() => onDesvincular(ins.id)}
              className="ml-1 p-1 text-muted-foreground hover:text-destructive transition-colors"
              title="Desvincular"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function TalleresTab({ talleres, onVincular, onDesvincular, onVerResumen }) {
  const actuales = talleres.filter((ins) => ins.aprobado === null && !edicionFinalizada(ins))
  const cursados = talleres.filter((ins) => ins.aprobado !== null || edicionFinalizada(ins))

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={onVincular}>
          <PlusCircle className="h-4 w-4" /> Vincular a taller
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary-700 dark:text-primary-500" />
          <h3 className="text-sm font-semibold text-primary-700 dark:text-primary-500">Taller actual</h3>
        </div>
        {actuales.length === 0 ? (
          <p className="text-sm text-muted-foreground pl-6">Sin taller activo registrado</p>
        ) : (
          actuales.map((ins) => <TallerCard key={ins.id} ins={ins} onDesvincular={onDesvincular} onVerResumen={onVerResumen} />)
        )}
      </div>

      {cursados.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <BookCheck className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-muted-foreground">Talleres cursados</h3>
          </div>
          {cursados.map((ins) => <TallerCard key={ins.id} ins={ins} onDesvincular={onDesvincular} onVerResumen={onVerResumen} />)}
        </div>
      )}

      {talleres.length === 0 && (
        <p className="text-center py-6 text-muted-foreground">Sin talleres registrados</p>
      )}
    </div>
  )
}

const TABS = ['Datos', 'Talleres', 'Actividades']

export default function HermanoDetailPage() {
  const { id } = useParams()
  const { equipoActual } = useAuthStore()
  const [tab, setTab] = useState(0)
  const [editModal, setEditModal] = useState(false)
  const [vincularModal, setVincularModal] = useState(false)
  const [selectedInscripcion, setSelectedInscripcion] = useState(null)

  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: hermano, isLoading, refetch } = useQuery({
    queryKey: ['hermano', id],
    queryFn: () => getHermano(equipoActual.id, id).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

  const { data: historial, refetch: refetchHistorial } = useQuery({
    queryKey: ['historial', id],
    queryFn: () => getHistorial(equipoActual.id, id).then((r) => r.data.data),
    enabled: !!equipoActual?.id && tab > 0,
  })

  const handleDesvincularTaller = async (inscripcionId) => {
    if (!window.confirm('¿Desvincular este hermano del taller?')) return
    try {
      await deleteInscripcion(equipoActual.id, inscripcionId)
      toast({ title: 'Taller desvinculado' })
      refetchHistorial()
    } catch {
      toast({ title: 'Error al desvincular', variant: 'destructive' })
    }
  }

  if (isLoading) return <PageSpinner />
  if (!hermano) return <div className="p-6 text-muted-foreground">Hermano no encontrado</div>

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/hermanos">
          <button className="min-h-0 h-auto p-1 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{hermano.nombre} {hermano.apellido}</h1>
          <p className="text-sm text-muted-foreground">{hermano.comunidad?.nombre}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditModal(true)}>
          <Edit className="h-4 w-4" /> Editar
        </Button>
      </div>

      <div className="flex border-b overflow-x-auto">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap min-h-[44px] border-b-2 transition-colors ${
              tab === i ? 'border-primary-700 text-primary-700 dark:border-primary-500 dark:text-primary-500' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {hermano.telefono && (
            <Card><CardContent className="py-3 px-4 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Teléfono</p>
                <p className="font-medium">{hermano.telefono}</p>
              </div>
              <PhoneActions telefono={hermano.telefono} />
            </CardContent></Card>
          )}
          {hermano.email && <Card><CardContent className="py-3 px-4"><p className="text-xs text-muted-foreground">Email</p><p className="font-medium">{hermano.email}</p></CardContent></Card>}
          <Card><CardContent className="py-3 px-4"><p className="text-xs text-muted-foreground">Comunidad</p><p className="font-medium">{hermano.comunidad?.nombre}</p></CardContent></Card>
          {hermano.notas && <Card className="md:col-span-2"><CardContent className="py-3 px-4"><p className="text-xs text-muted-foreground mb-1">Notas</p><p className="text-sm">{hermano.notas}</p></CardContent></Card>}
        </div>
      )}

      {tab === 1 && (
        <TalleresTab
          talleres={historial?.talleres ?? []}
          hermanoId={id}
          onVincular={() => setVincularModal(true)}
          onDesvincular={handleDesvincularTaller}
          onVerResumen={(ins) => setSelectedInscripcion(ins)}
        />
      )}

      {tab === 2 && (
        <div className="space-y-2">
          {!historial?.actividades?.length ? (
            <p className="text-center py-8 text-muted-foreground">Sin actividades registradas</p>
          ) : (
            historial.actividades.map((a) => (
              <Card key={a.id}><CardContent className="py-3 px-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{a.actividad.nombre}</p>
                  <p className="text-xs text-muted-foreground">{new Date(a.actividad.fecha).toLocaleDateString('es-SV')}</p>
                </div>
                {a.presente
                  ? <CheckCircle className="h-5 w-5 text-green-500" />
                  : <XCircle className="h-5 w-5 text-muted-foreground" />}
              </CardContent></Card>
            ))
          )}
        </div>
      )}

      {editModal && <HermanoModal hermano={hermano} onClose={() => setEditModal(false)} onSaved={() => { setEditModal(false); refetch() }} />}
      {vincularModal && (
        <VincularTallerModal
          hermanoId={id}
          inscripcionesActuales={historial?.talleres ?? []}
          onClose={() => setVincularModal(false)}
          onSaved={() => { setVincularModal(false); refetchHistorial() }}
        />
      )}
      {selectedInscripcion && (
        <TallerResumenModal
          ins={selectedInscripcion}
          onClose={() => setSelectedInscripcion(null)}
        />
      )}
    </div>
  )
}
