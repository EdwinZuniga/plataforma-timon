import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '@/stores/useAuthStore'
import { getTaller, getEdiciones, createEdicion, updateEdicion, deleteEdicion } from '@/api/talleres'
import { getMiembros } from '@/api/equipos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageSpinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { ArrowLeft, Plus, Users, X, User, MapPin, Calendar, Pencil, Trash2, ChevronRight, BookOpen, BookCheck } from 'lucide-react'
import { formatCalendarDate, toInputDate } from '@/utils/dates'

export default function TallerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { equipoActual, usuario } = useAuthStore()
  const puedeEliminarEdicion = !!usuario?.superAdmin
  const { toast } = useToast()
  const qc = useQueryClient()

  const [showCrearModal, setShowCrearModal] = useState(false)
  const [editingEdicion, setEditingEdicion] = useState(null)
  const [deletingEdicion, setDeletingEdicion] = useState(null)
  const [loadingSave, setLoadingSave] = useState(false)
  const [loadingDelete, setLoadingDelete] = useState(false)
  const [pageFin, setPageFin] = useState(1)

  const crearForm = useForm()
  const editForm = useForm()

  const { data: taller, isLoading } = useQuery({
    queryKey: ['taller', id],
    queryFn: () => getTaller(equipoActual.id, id).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

  const { data: actuales = [], isLoading: loadingActuales } = useQuery({
    queryKey: ['ediciones', id, 'actual'],
    queryFn: () => getEdiciones(equipoActual.id, id, { estado: 'actual', limit: 100 }).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

  const { data: finalizadas, isLoading: loadingFin } = useQuery({
    queryKey: ['ediciones', id, 'finalizada', pageFin],
    queryFn: () => getEdiciones(equipoActual.id, id, { estado: 'finalizada', page: pageFin }).then((r) => r.data),
    enabled: !!equipoActual?.id,
    placeholderData: keepPreviousData,
  })

  const finItems = finalizadas?.data ?? []
  const finPag = finalizadas?.pagination

  const { data: miembros = [] } = useQuery({
    queryKey: ['miembros', equipoActual?.id],
    queryFn: () => getMiembros(equipoActual.id).then((r) => r.data.data),
    enabled: !!equipoActual?.id && (showCrearModal || !!editingEdicion),
  })

  const refrescarEdiciones = () => {
    qc.invalidateQueries({ queryKey: ['ediciones', id] })
    qc.invalidateQueries({ queryKey: ['talleres', equipoActual?.id] })
  }

  const onCrear = async (data) => {
    setLoadingSave(true)
    try {
      await createEdicion(equipoActual.id, id, data)
      toast({ title: 'Edición creada' })
      crearForm.reset()
      setShowCrearModal(false)
      refrescarEdiciones()
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
      refrescarEdiciones()
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
      if (finItems.length === 1 && pageFin > 1) setPageFin((p) => p - 1)
      refrescarEdiciones()
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error, variant: 'destructive' })
    } finally { setLoadingDelete(false) }
  }

  if (isLoading) return <PageSpinner />
  if (!taller) return <div className="p-6 text-muted-foreground">Taller no encontrado</div>

  const sinEdiciones = !loadingActuales && !loadingFin && actuales.length === 0 && (finPag?.total ?? 0) === 0

  const cardProps = {
    tallerId: id,
    puedeEliminar: puedeEliminarEdicion,
    onNavigate: (e) => navigate(`/talleres/${id}/ediciones/${e.id}`),
    onEdit: openEdit,
    onDelete: (e) => setDeletingEdicion(e),
  }

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

      {sinEdiciones && (
        <p className="text-center py-10 text-muted-foreground">
          Sin ediciones. Crea la primera con el botón +.
        </p>
      )}

      {/* En curso */}
      {!sinEdiciones && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary-700 dark:text-primary-500" />
            <h2 className="text-sm font-semibold text-primary-700 dark:text-primary-500">En curso</h2>
          </div>
          {loadingActuales ? (
            <p className="text-sm text-muted-foreground pl-6">Cargando...</p>
          ) : actuales.length === 0 ? (
            <p className="text-sm text-muted-foreground pl-6">Sin ediciones en curso</p>
          ) : (
            <div className="space-y-3">
              {actuales.map((e) => <EdicionCard key={e.id} e={e} {...cardProps} />)}
            </div>
          )}
        </section>
      )}

      {/* Finalizadas */}
      {(finPag?.total ?? 0) > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <BookCheck className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground">
              Finalizadas <span className="font-normal">({finPag.total})</span>
            </h2>
          </div>
          <div className="space-y-3">
            {finItems.map((e) => <EdicionCard key={e.id} e={e} finalizada {...cardProps} />)}
          </div>

          {finPag.pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-1">
              <Button variant="outline" size="sm" disabled={pageFin === 1} onClick={() => setPageFin((p) => p - 1)}>
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">Página {pageFin} de {finPag.pages}</span>
              <Button variant="outline" size="sm" disabled={pageFin >= finPag.pages} onClick={() => setPageFin((p) => p + 1)}>
                Siguiente
              </Button>
            </div>
          )}
        </section>
      )}

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
              <span className="font-medium text-foreground">{formatCalendarDate(deletingEdicion.fecha)}</span>.
              Esta acción no se puede deshacer. (Solo es posible si no tiene hermanos inscritos.)
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

// ─── EdicionCard ─────────────────────────────────────────────────────────────

function EdicionCard({ e, finalizada, puedeEliminar, onNavigate, onEdit, onDelete }) {
  const coordinadorNombre = e.coordinador?.nombreCorto || e.coordinador?.usuario?.nombre
  const total = e._count?.inscripciones ?? e.inscripciones?.length ?? 0
  const bloqueadoPorInscritos = total > 0

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onNavigate(e)}
    >
      <CardContent className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${finalizada ? 'bg-muted' : 'bg-primary/10'}`}>
            <Calendar className={`h-5 w-5 ${finalizada ? 'text-muted-foreground' : 'text-primary'}`} />
          </div>

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

          <div className="flex items-center gap-1 shrink-0">
            {finalizada && <Badge variant="secondary" className="text-xs">Finalizada</Badge>}
            <Badge variant="secondary" className="text-xs">
              <Users className="h-3 w-3 mr-1" />{total}
            </Badge>
            <button
              onClick={(ev) => onEdit(e, ev)}
              title="Editar"
              className="min-h-0 h-auto p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            {puedeEliminar && (
              <button
                onClick={(ev) => { ev.stopPropagation(); if (!bloqueadoPorInscritos) onDelete(e) }}
                disabled={bloqueadoPorInscritos}
                title={bloqueadoPorInscritos ? `No se puede eliminar: ${total} inscrito${total === 1 ? '' : 's'}` : 'Eliminar edición'}
                className={`min-h-0 h-auto p-1.5 rounded transition-colors ${
                  bloqueadoPorInscritos
                    ? 'text-muted-foreground/30 cursor-not-allowed'
                    : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
                }`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground ml-1" />
          </div>
        </div>
      </CardContent>
    </Card>
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
