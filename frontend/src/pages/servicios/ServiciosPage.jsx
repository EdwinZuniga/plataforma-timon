import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/useAuthStore'
import { getTodos, confirmarServicio, asignarMiembro, desasignarMiembro, getCatalogo, createCatalogo, updateServicio, deleteServicio, finalizarServicio, reabrirServicio } from '@/api/servicios'
import { getMiembros } from '@/api/equipos'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageSpinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { SubirCartaModal } from './SubirCartaModal'
import { RegistrarManualModal } from './RegistrarManualModal'
import {
  Wrench, Calendar, MapPin, Clock, Building2, Users,
  CheckCircle, Upload, X, UserPlus, ChevronDown, ChevronUp,
  Settings, Plus, Tag, Pencil, Trash2, Archive, Filter, RotateCcw,
} from 'lucide-react'

const ESTADO_BADGE = {
  PENDIENTE: 'destructive',
  ASIGNADO: 'warning',
  CONFIRMADO: 'success',
  FINALIZADO: 'secondary',
  CANCELADO: 'outline',
}

const TABS = [
  { key: '', label: 'Todos', short: 'Todos' },
  { key: 'PENDIENTE', label: 'Pendientes', short: 'Pend.' },
  { key: 'ASIGNADO', label: 'Asignados', short: 'Asign.' },
  { key: 'CONFIRMADO', label: 'Confirmados', short: 'Conf.' },
  { key: 'FINALIZADO', label: 'Finalizados', short: 'Final.' },
]

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const ANIO_ACTUAL = new Date().getFullYear()
const ANOS = Array.from({ length: 5 }, (_, i) => ANIO_ACTUAL - i)

const nombreMiembro = (m) => m.nombreCorto || m.usuario?.nombre || `Miembro ${m.id}`

// ─── Modal de catálogo ────────────────────────────────────────────────────────
function CatalogoModal({ onClose }) {
  const { equipoActual } = useAuthStore()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [guardando, setGuardando] = useState(false)

  const { data: catalogo, isLoading } = useQuery({
    queryKey: ['catalogo', equipoActual?.id],
    queryFn: () => getCatalogo(equipoActual.id).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

  const guardar = async () => {
    if (!nombre.trim()) { toast({ title: 'Escribe el nombre del tipo', variant: 'destructive' }); return }
    setGuardando(true)
    try {
      await createCatalogo(equipoActual.id, { nombre: nombre.trim(), descripcion: descripcion.trim() || undefined })
      toast({ title: 'Tipo de servicio agregado' })
      qc.invalidateQueries({ queryKey: ['catalogo', equipoActual?.id] })
      setNombre('')
      setDescripcion('')
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error, variant: 'destructive' })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
      <div className="bg-card rounded-t-2xl md:rounded-xl w-full max-w-md max-h-[80vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-card">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">Tipos de servicio</h2>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {/* Lista actual */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Tipos actuales</p>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : catalogo?.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay tipos registrados aún</p>
            ) : (
              <div className="space-y-1.5">
                {catalogo?.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40">
                    <Wrench className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{c.nombre}</p>
                      {c.descripcion && <p className="text-xs text-muted-foreground">{c.descripcion}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Agregar nuevo */}
          <div className="border-t pt-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Agregar nuevo tipo</p>
            <div className="space-y-2">
              <Input
                placeholder="Nombre del tipo (ej: Retiro, Animación, Logística…)"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && guardar()}
              />
              <Input
                placeholder="Descripción (opcional)"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={guardar} disabled={guardando || !nombre.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              {guardando ? 'Guardando...' : 'Agregar tipo'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Modal de edición ─────────────────────────────────────────────────────────
function EditarServicioModal({ servicio, equipoId, onClose, onSaved }) {
  const { toast } = useToast()
  const [form, setForm] = useState({
    catalogoServicioId: servicio.catalogoServicioId,
    actividadNombre: servicio.actividad?.nombre || '',
    actividadFecha: servicio.actividad?.fecha ? servicio.actividad.fecha.slice(0, 10) : '',
    actividadLugar: servicio.actividad?.lugar || '',
    horaServicio: servicio.horaServicio || '',
    comunidadSolicitante: servicio.comunidadSolicitante || '',
    descripcion: servicio.descripcion || '',
  })
  const [guardando, setGuardando] = useState(false)

  const { data: catalogo } = useQuery({
    queryKey: ['catalogo', equipoId],
    queryFn: () => getCatalogo(equipoId).then((r) => r.data.data),
  })

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const guardar = async () => {
    setGuardando(true)
    try {
      await updateServicio(equipoId, servicio.id, {
        ...form,
        catalogoServicioId: parseInt(form.catalogoServicioId),
      })
      toast({ title: 'Servicio actualizado' })
      onSaved()
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error, variant: 'destructive' })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
      <div className="bg-card rounded-t-2xl md:rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-card">
          <div className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">Editar servicio</h2>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipo de servicio</p>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={form.catalogoServicioId}
              onChange={set('catalogoServicioId')}
            >
              {catalogo?.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nombre de la actividad</p>
            <Input placeholder="Nombre de la actividad" value={form.actividadNombre} onChange={set('actividadNombre')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fecha</p>
              <Input type="date" value={form.actividadFecha} onChange={set('actividadFecha')} />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hora</p>
              <Input placeholder="ej: 7:30 am" value={form.horaServicio} onChange={set('horaServicio')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lugar</p>
            <Input placeholder="Lugar del servicio" value={form.actividadLugar} onChange={set('actividadLugar')} />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Comunidad solicitante</p>
            <Input placeholder="Nombre de la comunidad" value={form.comunidadSolicitante} onChange={set('comunidadSolicitante')} />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Descripción</p>
            <textarea
              className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-none"
              placeholder="Descripción del servicio..."
              value={form.descripcion}
              onChange={set('descripcion')}
            />
          </div>

          <Button className="w-full" onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Asignación inline ────────────────────────────────────────────────────────
function AsignarMiembroInline({ equipoId, servicioId, asignadosActuales, onUpdate }) {
  const { toast } = useToast()
  const [abierto, setAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  const { data: miembros } = useQuery({
    queryKey: ['miembros-equipo', equipoId],
    queryFn: () => getMiembros(equipoId).then((r) => r.data.data),
    enabled: abierto,
  })

  const asignadosIds = new Set(asignadosActuales.map((a) => a.miembro.id))

  const miembrosFiltrados = (miembros || []).filter((m) => {
    if (!m.activo || asignadosIds.has(m.id)) return false
    if (!busqueda) return true
    return nombreMiembro(m).toLowerCase().includes(busqueda.toLowerCase())
  })

  const { mutate: asignar, isPending: asignando } = useMutation({
    mutationFn: (mId) => asignarMiembro(equipoId, servicioId, mId),
    onSuccess: () => { toast({ title: 'Miembro asignado' }); onUpdate() },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, variant: 'destructive' }),
  })

  const { mutate: quitar } = useMutation({
    mutationFn: (mId) => desasignarMiembro(equipoId, servicioId, mId),
    onSuccess: () => { toast({ title: 'Miembro removido' }); onUpdate() },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, variant: 'destructive' }),
  })

  return (
    <div className="mt-2 space-y-1.5">
      {asignadosActuales.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {asignadosActuales.map((a) => (
            <span key={a.miembro.id}
              className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {nombreMiembro(a.miembro)}
              <button onClick={() => quitar(a.miembro.id)} className="hover:text-destructive ml-0.5" title="Remover">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <button onClick={() => setAbierto((v) => !v)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
        <UserPlus className="h-3.5 w-3.5" />
        Asignar miembro del Equipo
        {abierto ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {abierto && (
        <div className="border rounded-lg overflow-hidden shadow-sm">
          <div className="p-2 border-b bg-muted/30">
            <Input placeholder="Buscar miembro del Equipo..." value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="divide-y max-h-40 overflow-y-auto">
            {miembrosFiltrados.map((m) => (
              <button key={m.id}
                className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-sm"
                onClick={() => { asignar(m.id); setAbierto(false) }}
                disabled={asignando}>
                <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="flex-1">{nombreMiembro(m)}</span>
                <span className="text-xs text-muted-foreground">{m.rol}</span>
              </button>
            ))}
            {miembrosFiltrados.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                {asignadosIds.size > 0 ? 'Todos los miembros ya están asignados' : 'No se encontraron miembros'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function ServiciosPage() {
  const { equipoActual } = useAuthStore()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [tabEstado, setTabEstado] = useState('')
  const [modalCarta, setModalCarta] = useState(false)
  const [modalManual, setModalManual] = useState(false)
  const [modalCatalogo, setModalCatalogo] = useState(false)
  const [servicioEditar, setServicioEditar] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [confirmFinalizar, setConfirmFinalizar] = useState(null)
  const [reasignandoId, setReasignandoId] = useState(null)
  const [filtros, setFiltros] = useState({ anio: String(ANIO_ACTUAL), mes: '', catalogoServicioId: '' })

  const esHistorial = tabEstado === 'FINALIZADO'

  const QK = ['servicios-todos', equipoActual?.id, tabEstado, ...(esHistorial ? [filtros.anio, filtros.mes, filtros.catalogoServicioId] : [])]

  const { data, isLoading } = useQuery({
    queryKey: QK,
    queryFn: () => getTodos(equipoActual.id, {
      estado: tabEstado || undefined,
      ...(esHistorial && {
        anio: filtros.anio || undefined,
        mes: filtros.mes || undefined,
        catalogoServicioId: filtros.catalogoServicioId || undefined,
      }),
    }).then((r) => r.data),
    enabled: !!equipoActual?.id,
  })

  const { data: catalogoFiltro } = useQuery({
    queryKey: ['catalogo', equipoActual?.id],
    queryFn: () => getCatalogo(equipoActual.id).then((r) => r.data.data),
    enabled: !!equipoActual?.id && esHistorial,
  })

  const { mutate: confirmar } = useMutation({
    mutationFn: (servicioId) => confirmarServicio(equipoActual.id, servicioId),
    onSuccess: () => { toast({ title: 'Servicio confirmado' }); qc.invalidateQueries({ queryKey: QK }) },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, variant: 'destructive' }),
  })

  const { mutate: eliminar, isPending: eliminando } = useMutation({
    mutationFn: (servicioId) => deleteServicio(equipoActual.id, servicioId),
    onSuccess: () => { toast({ title: 'Servicio eliminado' }); setConfirmDelete(null); invalidar() },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, variant: 'destructive' }),
  })

  const { mutate: finalizar } = useMutation({
    mutationFn: (servicioId) => finalizarServicio(equipoActual.id, servicioId),
    onSuccess: () => { toast({ title: 'Servicio finalizado' }); setConfirmFinalizar(null); qc.invalidateQueries({ queryKey: QK }) },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, variant: 'destructive' }),
  })

  const { mutate: reabrir } = useMutation({
    mutationFn: (servicioId) => reabrirServicio(equipoActual.id, servicioId),
    onSuccess: () => { toast({ title: 'Servicio reabierto' }); qc.invalidateQueries({ queryKey: QK }) },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, variant: 'destructive' }),
  })

  const invalidar = () => qc.invalidateQueries({ queryKey: ['servicios-todos', equipoActual?.id] })

  const servicios = data?.data || []
  const total = data?.pagination?.total || 0

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Servicios</h1>
          <p className="text-sm text-muted-foreground">
            {total > 0 ? `${total} servicio${total !== 1 ? 's' : ''}` : 'Gestión de servicios del Equipo'}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setModalCatalogo(true)} title="Gestionar tipos de servicio">
            <Settings className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Catálogo</span>
          </Button>
          <Button variant="outline" onClick={() => setModalManual(true)} title="Registrar manualmente">
            <Plus className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Registrar manualmente</span>
          </Button>
          <Button onClick={() => setModalCarta(true)} title="Subir carta">
            <Upload className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Subir carta</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 sm:gap-1 p-1 bg-muted rounded-lg w-fit">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTabEstado(t.key)}
            className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
              tabEstado === t.key ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}>
            <span className="sm:hidden">{t.short}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Filtros historial */}
      {esHistorial && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/40 rounded-lg border">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <select
            value={filtros.anio}
            onChange={(e) => setFiltros((f) => ({ ...f, anio: e.target.value }))}
            className="border rounded-md px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">Todos los años</option>
            {ANOS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select
            value={filtros.mes}
            onChange={(e) => setFiltros((f) => ({ ...f, mes: e.target.value }))}
            className="border rounded-md px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">Todos los meses</option>
            {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          <select
            value={filtros.catalogoServicioId}
            onChange={(e) => setFiltros((f) => ({ ...f, catalogoServicioId: e.target.value }))}
            className="border rounded-md px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">Todos los tipos</option>
            {catalogoFiltro?.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          {(filtros.mes || filtros.catalogoServicioId) && (
            <button
              onClick={() => setFiltros({ anio: String(ANIO_ACTUAL), mes: '', catalogoServicioId: '' })}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <X className="h-3.5 w-3.5" /> Limpiar
            </button>
          )}
        </div>
      )}

      {isLoading ? <PageSpinner /> : (
        <div className="space-y-3">
          {servicios.map((s) => (
            <Card key={s.id} className={s.origenOCR ? 'border-primary/20' : ''}>
              <CardContent className="py-4 px-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-[180px] space-y-2">

                    <div className="flex items-center gap-2 flex-wrap">
                      <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
                      <p className="font-medium">{s.catalogoServicio?.nombre}</p>
                      <Badge variant={ESTADO_BADGE[s.estado]}>{s.estado}</Badge>
                      {s.origenOCR && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Upload className="h-3 w-3" /> Carta
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {s.actividad?.fecha
                          ? new Date(s.actividad.fecha).toLocaleDateString('es-SV', { timeZone: 'UTC' })
                          : 'Sin fecha'}
                      </span>
                    </div>

                    {(s.actividad?.lugar || s.horaServicio) && (
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {s.actividad?.lugar && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {s.actividad.lugar}
                          </span>
                        )}
                        {s.horaServicio && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {s.horaServicio}
                          </span>
                        )}
                      </div>
                    )}

                    {s.comunidadSolicitante && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span>Solicitado por: <span className="font-medium text-foreground">{s.comunidadSolicitante}</span></span>
                      </div>
                    )}

                    {s.descripcion && <p className="text-sm text-muted-foreground">{s.descripcion}</p>}

                    {s.estado === 'PENDIENTE' && (
                      <AsignarMiembroInline
                        equipoId={equipoActual.id}
                        servicioId={s.id}
                        asignadosActuales={s.asignados || []}
                        onUpdate={invalidar}
                      />
                    )}

                    {(s.estado === 'ASIGNADO' || s.estado === 'CONFIRMADO') && (
                      reasignandoId === s.id ? (
                        <div className="space-y-1">
                          <AsignarMiembroInline
                            equipoId={equipoActual.id}
                            servicioId={s.id}
                            asignadosActuales={s.asignados || []}
                            onUpdate={invalidar}
                          />
                          <button
                            onClick={() => setReasignandoId(null)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                            <X className="h-3 w-3" /> Cancelar reasignación
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {s.asignados?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {s.asignados.map((a) => (
                                <span key={a.miembro.id}
                                  className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full">
                                  <Users className="h-3 w-3" />{nombreMiembro(a.miembro)}
                                </span>
                              ))}
                            </div>
                          )}
                          <button
                            onClick={() => setReasignandoId(s.id)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                            <UserPlus className="h-3.5 w-3.5" /> Reasignar miembros
                          </button>
                        </div>
                      )
                    )}

                    {s.estado === 'CANCELADO' && s.asignados?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {s.asignados.map((a) => (
                          <span key={a.miembro.id}
                            className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full">
                            <Users className="h-3 w-3" />{nombreMiembro(a.miembro)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center flex-wrap gap-1 basis-full justify-end mt-1 sm:basis-auto sm:justify-normal sm:shrink-0">
                    {confirmFinalizar === s.id ? (
                      <>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">¿Finalizar?</span>
                        <Button size="sm" variant="outline" onClick={() => finalizar(s.id)}>Sí</Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmFinalizar(null)}>No</Button>
                      </>
                    ) : confirmDelete === s.id ? (
                      <>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">¿Eliminar?</span>
                        <Button size="sm" variant="destructive" onClick={() => eliminar(s.id)} disabled={eliminando}>Sí</Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>No</Button>
                      </>
                    ) : (
                      <>
                        {s.estado === 'ASIGNADO' && (
                          <Button size="sm" variant="outline" onClick={() => confirmar(s.id)}>
                            <CheckCircle className="h-4 w-4 mr-1" /> Confirmar
                          </Button>
                        )}
                        {s.estado === 'CONFIRMADO' && (
                          <Button size="sm" variant="outline" onClick={() => setConfirmFinalizar(s.id)}
                            className="text-muted-foreground">
                            <Archive className="h-4 w-4 mr-1" /> Finalizar
                          </Button>
                        )}
                        {s.estado === 'FINALIZADO' && (
                          <Button size="sm" variant="outline" onClick={() => reabrir(s.id)}>
                            <RotateCcw className="h-4 w-4 mr-1" /> Reabrir
                          </Button>
                        )}
                        <button
                          onClick={() => setServicioEditar(s)}
                          className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
                          title="Editar">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(s.id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-muted transition-colors"
                          title="Eliminar">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {servicios.length === 0 && !isLoading && (
            <div className="text-center py-16 text-muted-foreground">
              {esHistorial
                ? <Archive className="h-10 w-10 mx-auto mb-3 opacity-30" />
                : <Wrench className="h-10 w-10 mx-auto mb-3 opacity-30" />}
              <p className="font-medium">
                {esHistorial
                  ? 'No hay servicios finalizados con estos filtros'
                  : tabEstado ? `No hay servicios ${tabEstado.toLowerCase()}s` : 'No hay servicios registrados'}
              </p>
              {!esHistorial && <p className="text-sm mt-1">Sube una carta para crear el primero</p>}
            </div>
          )}
        </div>
      )}

      {modalCarta && (
        <SubirCartaModal
          onClose={() => setModalCarta(false)}
          onSaved={() => { setModalCarta(false); invalidar() }}
        />
      )}

      {modalManual && (
        <RegistrarManualModal
          onClose={() => setModalManual(false)}
          onSaved={() => { setModalManual(false); invalidar() }}
        />
      )}

      {modalCatalogo && <CatalogoModal onClose={() => setModalCatalogo(false)} />}

      {servicioEditar && (
        <EditarServicioModal
          servicio={servicioEditar}
          equipoId={equipoActual.id}
          onClose={() => setServicioEditar(null)}
          onSaved={() => { setServicioEditar(null); invalidar() }}
        />
      )}
    </div>
  )
}
