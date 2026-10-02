import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/useAuthStore'
import { getAcuerdos, updateAcuerdo, deleteAcuerdo } from '@/api/reuniones'
import { getMiembros } from '@/api/equipos'
import { AcuerdoModal } from '@/components/shared/AcuerdoModal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Pencil, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageSpinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { AcuerdoEstadoBoton } from '@/components/shared/AcuerdoEstadoBoton'
import { fmtFechaLimite } from '@/utils/acuerdos'
import { cn } from '@/utils/cn'

const VISTAS = [
  { id: 'mios', label: 'Mis pendientes', params: { estado: 'ABIERTOS', mios: 1 }, vacio: 'No tienes acuerdos pendientes. ¡Buen trabajo!' },
  { id: 'abiertos', label: 'Del equipo', params: { estado: 'ABIERTOS' }, vacio: 'El equipo no tiene acuerdos pendientes.' },
  { id: 'cumplidos', label: 'Cumplidos', params: { estado: 'CUMPLIDO' }, vacio: 'Aún no hay acuerdos cumplidos.' },
]

export default function AcuerdosPage() {
  const { equipoActual } = useAuthStore()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [vistaId, setVistaId] = useState('mios')
  const vista = VISTAS.find((v) => v.id === vistaId)
  const [editando, setEditando] = useState(null)
  const [eliminando, setEliminando] = useState(null)

  const { data: miembros = [] } = useQuery({
    queryKey: ['miembros', equipoActual?.id],
    queryFn: () => getMiembros(equipoActual.id).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })
  const miembrosActivos = miembros
    .filter((m) => m.activo)
    .sort((a, b) => (a.usuario?.nombre || '').localeCompare(b.usuario?.nombre || ''))

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ['acuerdos'] })
    qc.invalidateQueries({ queryKey: ['avisos'] })
    qc.invalidateQueries({ queryKey: ['reunion'] })
  }
  const { mutate: guardar, isPending: guardando } = useMutation({
    mutationFn: (data) => updateAcuerdo(equipoActual.id, editando.id, data),
    onSuccess: () => { refrescar(); setEditando(null) },
    onError: (err) => toast({ title: 'No se pudo guardar el acuerdo', description: err.response?.data?.error, variant: 'destructive' }),
  })
  const { mutate: eliminar } = useMutation({
    mutationFn: (acuerdoId) => deleteAcuerdo(equipoActual.id, acuerdoId),
    onSuccess: () => { refrescar(); setEliminando(null); toast({ title: 'Acuerdo eliminado' }) },
    onError: (err) => toast({ title: 'No se pudo eliminar el acuerdo', description: err.response?.data?.error, variant: 'destructive' }),
  })

  const { data: acuerdos = [], isLoading } = useQuery({
    queryKey: ['acuerdos', equipoActual?.id, vistaId],
    queryFn: () => getAcuerdos(equipoActual.id, vista.params).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

  const { mutate: cambiarEstado, isPending } = useMutation({
    mutationFn: ({ acuerdoId, estado }) => updateAcuerdo(equipoActual.id, acuerdoId, { estado }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['acuerdos'] })
      qc.invalidateQueries({ queryKey: ['avisos'] })
      qc.invalidateQueries({ queryKey: ['reunion'] })
    },
    onError: (err) => toast({ title: 'No se pudo actualizar el acuerdo', description: err.response?.data?.error, variant: 'destructive' }),
  })

  const vencidos = acuerdos.filter((a) => a.vencido)
  const resto = acuerdos.filter((a) => !a.vencido)

  const renderAcuerdo = (a) => (
    <Card key={a.id} className={cn(a.estado === 'CUMPLIDO' && 'opacity-60', a.vencido && 'border-red-300 dark:border-red-800')}>
      <CardContent className="flex items-start gap-3 py-3 px-4">
        <AcuerdoEstadoBoton
          estado={a.estado}
          disabled={isPending}
          onCambiar={(estado) => cambiarEstado({ acuerdoId: a.id, estado })}
        />
        <div className="flex-1 min-w-0">
          <p className={cn('font-medium', a.estado === 'CUMPLIDO' && 'line-through')}>{a.descripcion}</p>
          {a.responsable && <p className="text-xs text-muted-foreground">Responsable: {a.responsable}</p>}
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
            <Link to={`/reuniones/${a.reunion.id}`} className="underline">{a.reunion.titulo}</Link>
            {a.fechaLimite && <>· límite {fmtFechaLimite(a.fechaLimite)}</>}
            {a.estado === 'EN_PROCESO' && <Badge variant="warning">En proceso</Badge>}
            {a.vencido && <Badge variant="destructive">Vencido</Badge>}
          </p>
        </div>
        <div className="flex items-center shrink-0">
          <button onClick={() => setEditando(a)} className="min-h-0 h-auto p-2 text-muted-foreground hover:text-foreground" title="Editar acuerdo"><Pencil className="h-4 w-4" /></button>
          <button onClick={() => setEliminando(a)} className="min-h-0 h-auto p-2 text-muted-foreground hover:text-destructive" title="Eliminar acuerdo"><Trash2 className="h-4 w-4" /></button>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Acuerdos</h1>
        <p className="text-sm text-muted-foreground">Seguimiento de los acuerdos de todas las reuniones</p>
      </div>

      <div className="flex gap-1 border-b overflow-x-auto" role="tablist">
        {VISTAS.map((v) => (
          <button
            key={v.id}
            role="tab"
            aria-selected={vistaId === v.id}
            onClick={() => setVistaId(v.id)}
            className={cn(
              'px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
              vistaId === v.id
                ? 'border-primary-700 text-primary-700 dark:text-primary-400'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {v.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : acuerdos.length === 0 ? (
        <p className="text-center py-10 text-muted-foreground">{vista.vacio}</p>
      ) : (
        <div className="space-y-4">
          {vencidos.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-red-600 dark:text-red-400">Vencidos ({vencidos.length})</h2>
              {vencidos.map(renderAcuerdo)}
            </section>
          )}
          <section className="space-y-2">
            {vencidos.length > 0 && resto.length > 0 && (
              <h2 className="text-sm font-semibold text-muted-foreground">Otros ({resto.length})</h2>
            )}
            {resto.map(renderAcuerdo)}
          </section>
        </div>
      )}

      {editando && (
        <AcuerdoModal acuerdo={editando} miembros={miembrosActivos} pending={guardando} onSubmit={guardar} onClose={() => setEditando(null)} />
      )}
      {eliminando && (
        <ConfirmModal
          title="Eliminar acuerdo"
          description="Se quitará el acuerdo del seguimiento. Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          onConfirm={() => eliminar(eliminando.id)}
          onCancel={() => setEliminando(null)}
        />
      )}
    </div>
  )
}
