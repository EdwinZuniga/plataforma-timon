import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '@/stores/useAuthStore'
import { getTaller, createEdicion, updateEdicion, deleteEdicion } from '@/api/talleres'
import { getMiembros } from '@/api/equipos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageSpinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { ArrowLeft, Plus, Users, X, User, MapPin, Calendar, Pencil, Trash2, ChevronRight } from 'lucide-react'
import { formatCalendarDate, toInputDate } from '@/utils/dates'

export default function TallerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { equipoActual } = useAuthStore()
  const { toast } = useToast()
  const qc = useQueryClient()

  const [showCrearModal, setShowCrearModal] = useState(false)
  const [editingEdicion, setEditingEdicion] = useState(null)
  const [deletingEdicion, setDeletingEdicion] = useState(null)
  const [loadingSave, setLoadingSave] = useState(false)
  const [loadingDelete, setLoadingDelete] = useState(false)

  const crearForm = useForm()
  const editForm = useForm()

  const { data: taller, isLoading } = useQuery({
    queryKey: ['taller', id],
    queryFn: () => getTaller(equipoActual.id, id).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

  const { data: miembros = [] } = useQuery({
    queryKey: ['miembros', equipoActual?.id],
    queryFn: () => getMiembros(equipoActual.id).then((r) => r.data.data),
    enabled: !!equipoActual?.id && (showCrearModal || !!editingEdicion),
  })

  const onCrear = async (data) => {
    setLoadingSave(true)
    try {
      await createEdicion(equipoActual.id, id, data)
      toast({ title: 'Edición creada' })
      crearForm.reset()
      setShowCrearModal(false)
      qc.invalidateQueries({ queryKey: ['taller', id] })
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error, variant: 'destructive' })
    } finally { setLoadingSave(false) }
  }

  const openEdit = (e, ev) => {
    ev.stopPropagation()
    setEditingEdicion(e)
    editForm.reset({
      fecha: toInputDate(e.fecha),
      fechaFin: toInputDate(e.fechaFin),
      lugar: e.lugar ?? '',
      coordinadorId: e.coordinadorId ?? '',
    })
  }

  const onEditar = async (data) => {
    setLoadingSave(true)
    try {
      await updateEdicion(equipoActual.id, id, editingEdicion.id, data)
      toast({ title: 'Edición actualizada' })
      setEditingEdicion(null)
      qc.invalidateQueries({ queryKey: ['taller', id] })
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error, variant: 'destructive' })
    } finally { setLoadingSave(false) }
  }

  const onEliminar = async () => {
    setLoadingDelete(true)
    try {
      await deleteEdicion(equipoActual.id, id, deletingEdicion.id)
      toast({ title: 'Edición eliminada' })
      setDeletingEdicion(null)
      qc.invalidateQueries({ queryKey: ['taller', id] })
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error, variant: 'destructive' })
    } finally { setLoadingDelete(false) }
  }

  if (isLoading) return <PageSpinner />
  if (!taller) return <div className="p-6 text-muted-foreground">Taller no encontrado</div>

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <Link to="/talleres">
          <button className="min-h-0 h-auto p-1 text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{taller.nombre}</h1>
          {taller.descripcion && <p className="text-sm text-muted-foreground">{taller.descripcion}</p>}
        </div>
        <Button size="sm" onClick={() => setShowCrearModal(true)}>
          <Plus className="h-4 w-4" /> Edición
        </Button>
      </div>

      {/* Lista de ediciones */}
      <div className="space-y-3">
        {taller.ediciones?.length === 0 && (
          <p className="text-center py-10 text-muted-foreground">
            Sin ediciones. Crea la primera con el botón +.
          </p>
        )}
        {taller.ediciones?.map((e) => {
          const coordinadorNombre = e.coordinador?.nombreCorto || e.coordinador?.usuario?.nombre
          const total = e.inscripciones?.length ?? 0

          return (
            <Card
              key={e.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/talleres/${id}/ediciones/${e.id}`)}
            >
              <CardContent className="py-4 px-4">
                <div className="flex items-center gap-3">
                  {/* Icono */}
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm leading-tight">
                      {formatCalendarDate(e.fecha)}
                      {e.fechaFin && (
                        <span className="font-normal text-muted-foreground"> → {formatCalendarDate(e.fechaFin)}</span>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-x-3 mt-0.5">
                      {e.lugar && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />{e.lugar}
                        </span>
                      )}
                      {coordinadorNombre && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />{coordinadorNombre}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="secondary" className="text-xs">
                      <Users className="h-3 w-3 mr-1" />{total}
                    </Badge>
                    <button
                      onClick={(ev) => openEdit(e, ev)}
                      title="Editar"
                      className="min-h-0 h-auto p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(ev) => { ev.stopPropagation(); setDeletingEdicion(e) }}
                      title="Eliminar"
                      className="min-h-0 h-auto p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground ml-1" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Modal: crear */}
      {showCrearModal && (
        <EdicionModal
          title="Nueva edición"
          form={crearForm}
          miembros={miembros}
          loading={loadingSave}
          onSubmit={crearForm.handleSubmit(onCrear)}
          onClose={() => { setShowCrearModal(false); crearForm.reset() }}
        />
      )}

      {/* Modal: editar */}
      {editingEdicion && (
        <EdicionModal
          title="Editar edición"
          form={editForm}
          miembros={miembros}
          loading={loadingSave}
          onSubmit={editForm.handleSubmit(onEditar)}
          onClose={() => setEditingEdicion(null)}
        />
      )}

      {/* Modal: confirmar eliminación */}
      {deletingEdicion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-card rounded-xl w-full max-w-sm shadow-xl p-6 space-y-4">
            <h2 className="font-semibold text-lg">¿Eliminar edición?</h2>
            <p className="text-sm text-muted-foreground">
              Se eliminará la edición del{' '}
              <span className="font-medium text-foreground">{formatCalendarDate(deletingEdicion.fecha)}</span>{' '}
              junto a todas sus inscripciones y registros de asistencia.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDeletingEdicion(null)} disabled={loadingDelete}>
                Cancelar
              </Button>
              <Button variant="destructive" className="flex-1" onClick={onEliminar} disabled={loadingDelete}>
                {loadingDelete ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── EdicionModal ─────────────────────────────────────────────────────────────

function EdicionModal({ title, form, miembros, loading, onSubmit, onClose }) {
  const { register } = form
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
      <div className="bg-card rounded-t-2xl md:rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-lg">{title}</h2>
          <button onClick={onClose} className="min-h-0 h-auto p-1 text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Fecha de inicio *</label>
              <Input type="date" {...register('fecha', { required: true })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Fecha de fin</label>
              <Input type="date" {...register('fechaFin')} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Lugar</label>
            <Input {...register('lugar')} placeholder="Lugar del taller" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Coordinador</label>
            <select
              {...register('coordinadorId')}
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Sin coordinador asignado</option>
              {miembros.filter((m) => m.activo).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombreCorto || m.usuario?.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
