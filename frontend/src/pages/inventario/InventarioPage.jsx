import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '@/stores/useAuthStore'
import {
  getResumen, getArticulos, getCategorias, createArticulo, updateArticulo, deleteArticulo,
  getPrestamos, createPrestamo, devolverPrestamo, deletePrestamo,
} from '@/api/inventario'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageSpinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import {
  Plus, X, Pencil, Trash2, Package, AlertTriangle,
  ArrowLeftRight, CheckCircle, Clock, Phone, MapPin, Search,
} from 'lucide-react'
import { cn } from '@/utils/cn'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CONDICION_META = {
  BUENO:   { label: 'Bueno',   cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  REGULAR: { label: 'Regular', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  MALO:    { label: 'Malo',    cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
}

const CATEGORIA_COLORS = [
  'bg-purple-100 text-purple-700','bg-blue-100 text-blue-700','bg-pink-100 text-pink-700',
  'bg-orange-100 text-orange-700','bg-teal-100 text-teal-700','bg-indigo-100 text-indigo-700',
  'bg-rose-100 text-rose-700','bg-cyan-100 text-cyan-700',
]

const CATEGORIAS_SUGERIDAS = ['Altar','Decoración','Papelería','Utencilios','Cocina','Mobiliario','Otro']

function catColor(cat) {
  if (!cat) return 'bg-muted text-muted-foreground'
  let hash = 0
  for (const c of cat) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff
  return CATEGORIA_COLORS[hash % CATEGORIA_COLORS.length]
}

function hoyInput() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatFecha(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' })
}

function diasVencido(fechaEsperada) {
  if (!fechaEsperada) return 0
  const diff = new Date() - new Date(fechaEsperada)
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

// ─── Modal de confirmación ───────────────────────────────────────────────────

function ConfirmModal({ title, message, confirmLabel = 'Confirmar', danger = false, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
      <div className="bg-card rounded-xl w-full max-w-sm shadow-xl">
        <div className="p-5 space-y-2">
          <h3 className="font-semibold text-base">{title}</h3>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <Button variant="outline" className="flex-1" onClick={onCancel}>Cancelar</Button>
          <Button variant={danger ? 'destructive' : 'default'} className="flex-1" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal artículo ──────────────────────────────────────────────────────────

function ArticuloModal({ articulo, categorias, onClose, onSave, loading }) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: articulo
      ? { nombre: articulo.nombre, descripcion: articulo.descripcion || '', categoria: articulo.categoria || '',
          cantidad: articulo.cantidad, condicion: articulo.condicion, ubicacion: articulo.ubicacion || '', notas: articulo.notas || '' }
      : { nombre: '', descripcion: '', categoria: '', cantidad: 1, condicion: 'BUENO', ubicacion: '', notas: '' },
  })
  const cat = watch('categoria')

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
      <div className="bg-card rounded-t-2xl md:rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-card z-10">
          <h2 className="font-semibold text-lg">{articulo ? 'Editar artículo' : 'Nuevo artículo'}</h2>
          <button onClick={onClose} className="min-h-0 h-auto p-1 text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit(onSave)} className="p-4 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Nombre *</label>
            <Input {...register('nombre', { required: 'Requerido' })} placeholder="Ej: Cortinas blancas" />
            {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Descripción</label>
            <Input {...register('descripcion')} placeholder="Ej: Cortinas con bordado" />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Categoría</label>
            <Input {...register('categoria')} placeholder="Ej: Altar" list="categorias-list" />
            <datalist id="categorias-list">
              {[...new Set([...CATEGORIAS_SUGERIDAS, ...(categorias || [])])].map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <div className="flex flex-wrap gap-1 pt-0.5">
              {CATEGORIAS_SUGERIDAS.map((s) => (
                <button key={s} type="button" onClick={() => setValue('categoria', s)}
                  className={cn('text-xs px-2 py-0.5 rounded-full border transition-colors',
                    cat === s ? catColor(s) + ' border-transparent' : 'border-input hover:bg-accent')}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Cantidad *</label>
              <Input type="number" min="1" {...register('cantidad', { required: 'Requerido', min: 1 })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Condición</label>
              <select className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register('condicion')}>
                <option value="BUENO">Bueno</option>
                <option value="REGULAR">Regular</option>
                <option value="MALO">Malo</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Ubicación <span className="text-muted-foreground text-xs">(dónde se guarda)</span></label>
            <Input {...register('ubicacion')} placeholder="Ej: Bodega principal, cajón 3" />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Notas</label>
            <textarea className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              {...register('notas')} placeholder="Observaciones adicionales..." />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modal préstamo ──────────────────────────────────────────────────────────

function PrestamoModal({ articulos, articuloPreseleccionado, onClose, onSave, loading }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      articuloId: articuloPreseleccionado?.id || '',
      cantidadPrestada: 1,
      prestadoA: '',
      contacto: '',
      fechaPrestamo: hoyInput(),
      fechaEsperada: '',
      notas: '',
    },
  })
  const articuloId = watch('articuloId')
  const articuloSel = articulos?.find((a) => String(a.id) === String(articuloId))

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
      <div className="bg-card rounded-t-2xl md:rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-card z-10">
          <h2 className="font-semibold text-lg">Registrar préstamo</h2>
          <button onClick={onClose} className="min-h-0 h-auto p-1 text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit(onSave)} className="p-4 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Artículo *</label>
            <select className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...register('articuloId', { required: 'Requerido' })}>
              <option value="">Seleccionar...</option>
              {articulos?.filter((a) => a.cantidadDisponible > 0).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre} ({a.cantidadDisponible} disp.)
                </option>
              ))}
            </select>
            {errors.articuloId && <p className="text-xs text-destructive">{errors.articuloId.message}</p>}
          </div>

          {articuloSel && (
            <div className="space-y-1">
              <label className="text-sm font-medium">Cantidad a prestar *</label>
              <Input type="number" min="1" max={articuloSel.cantidadDisponible}
                {...register('cantidadPrestada', { required: true, min: 1, max: articuloSel.cantidadDisponible })} />
              <p className="text-xs text-muted-foreground">Disponibles: {articuloSel.cantidadDisponible}</p>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium">Prestado a *</label>
            <Input {...register('prestadoA', { required: 'Requerido' })} placeholder="Nombre de persona o equipo" />
            {errors.prestadoA && <p className="text-xs text-destructive">{errors.prestadoA.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Contacto <span className="text-muted-foreground text-xs">(tel. o email)</span></label>
            <Input {...register('contacto')} placeholder="5555-1234 o correo@ejemplo.com" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Fecha préstamo *</label>
              <Input type="date" {...register('fechaPrestamo', { required: 'Requerido' })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Fecha esperada de devolución</label>
              <Input type="date" {...register('fechaEsperada')} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Notas</label>
            <textarea className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              {...register('notas')} placeholder="Estado del artículo al salir, condiciones acordadas..." />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={loading}>{loading ? 'Guardando...' : 'Registrar'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modal devolución ────────────────────────────────────────────────────────

function DevolverModal({ prestamo, onClose, onSave, loading }) {
  const { register, handleSubmit } = useForm({ defaultValues: { notasDevolucion: '' } })
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
      <div className="bg-card rounded-t-2xl md:rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-lg">Registrar devolución</h2>
          <button onClick={onClose} className="min-h-0 h-auto p-1 text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit(onSave)} className="p-4 space-y-4">
          <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
            <p className="font-medium">{prestamo.articulo?.nombre}</p>
            <p className="text-muted-foreground">
              {prestamo.cantidadPrestada} unidad(es) prestada(s) a <strong>{prestamo.prestadoA}</strong>
            </p>
            <p className="text-muted-foreground">Préstamo: {formatFecha(prestamo.fechaPrestamo)}</p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Notas de devolución <span className="text-muted-foreground text-xs">(opcional)</span></label>
            <textarea className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              {...register('notasDevolucion')} placeholder="Estado del artículo al regresar, observaciones..." />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              <CheckCircle className="h-4 w-4" />{loading ? 'Guardando...' : 'Confirmar devolución'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Tarjeta de artículo ─────────────────────────────────────────────────────

function ArticuloCard({ articulo, canEdit, onEdit, onPrestar, onDelete }) {
  const { nombre, descripcion, categoria, cantidad, cantidadDisponible, cantidadPrestada, condicion, ubicacion } = articulo
  const cond = CONDICION_META[condicion] || CONDICION_META.BUENO
  const agotado = cantidadDisponible === 0
  const parcial = cantidadPrestada > 0 && cantidadDisponible > 0

  return (
    <Card className={cn('transition-shadow hover:shadow-md', agotado && 'border-orange-200 dark:border-orange-800')}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{nombre}</p>
            {descripcion && <p className="text-xs text-muted-foreground truncate">{descripcion}</p>}
          </div>
          <Badge className={cn('shrink-0 text-xs font-normal', cond.cls)}>{cond.label}</Badge>
        </div>

        {/* Categoría + ubicación */}
        <div className="flex flex-wrap gap-1.5">
          {categoria && (
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', catColor(categoria))}>{categoria}</span>
          )}
          {ubicacion && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />{ubicacion}
            </span>
          )}
        </div>

        {/* Disponibilidad */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className={cn('font-medium', agotado ? 'text-orange-600' : 'text-foreground')}>
              {agotado ? 'Sin disponibilidad' : `${cantidadDisponible} de ${cantidad} disponible${cantidadDisponible !== 1 ? 's' : ''}`}
            </span>
            {cantidadPrestada > 0 && (
              <span className="text-xs text-muted-foreground">{cantidadPrestada} prestado{cantidadPrestada !== 1 ? 's' : ''}</span>
            )}
          </div>
          {/* Barra visual */}
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', agotado ? 'bg-orange-400' : parcial ? 'bg-amber-400' : 'bg-green-500')}
              style={{ width: cantidad > 0 ? `${(cantidadDisponible / cantidad) * 100}%` : '0%' }}
            />
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" className="flex-1" onClick={() => onPrestar(articulo)}
            disabled={agotado}>
            <ArrowLeftRight className="h-3.5 w-3.5" />
            {agotado ? 'Sin stock' : 'Prestar'}
          </Button>
          {canEdit && (
            <>
              <button onClick={() => onEdit(articulo)}
                className="min-h-0 h-auto p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => onDelete(articulo)}
                className="min-h-0 h-auto p-2 text-muted-foreground hover:text-destructive rounded-md hover:bg-accent transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Fila de préstamo ────────────────────────────────────────────────────────

function PrestamoRow({ prestamo, canEdit, onDevolver, onDelete }) {
  const vencido = prestamo.estado === 'PRESTADO' && prestamo.fechaEsperada && diasVencido(prestamo.fechaEsperada) > 0
  const dias = prestamo.estado === 'PRESTADO' && prestamo.fechaEsperada ? diasVencido(prestamo.fechaEsperada) : 0

  return (
    <Card className={cn('transition-shadow', vencido && 'border-red-300 dark:border-red-800 bg-red-50/30 dark:bg-red-950/20')}>
      <CardContent className="flex items-start gap-3 py-3 px-4">
        <div className={cn('mt-0.5 h-8 w-8 rounded-full flex items-center justify-center shrink-0',
          prestamo.estado === 'DEVUELTO' ? 'bg-green-100 text-green-600 dark:bg-green-900/30' :
          vencido ? 'bg-red-100 text-red-600 dark:bg-red-900/30' :
          'bg-amber-100 text-amber-600 dark:bg-amber-900/30')}>
          {prestamo.estado === 'DEVUELTO' ? <CheckCircle className="h-4 w-4" /> :
           vencido ? <AlertTriangle className="h-4 w-4" /> :
           <Clock className="h-4 w-4" />}
        </div>

        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm">{prestamo.articulo?.nombre}</p>
            {prestamo.cantidadPrestada > 1 && (
              <span className="text-xs text-muted-foreground">×{prestamo.cantidadPrestada}</span>
            )}
            {prestamo.articulo?.categoria && (
              <span className={cn('text-xs px-1.5 py-0 rounded-full', catColor(prestamo.articulo.categoria))}>
                {prestamo.articulo.categoria}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Prestado a: <strong className="text-foreground">{prestamo.prestadoA}</strong>
          </p>
          {prestamo.contacto && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />{prestamo.contacto}
            </p>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span>Salida: {formatFecha(prestamo.fechaPrestamo)}</span>
            {prestamo.estado === 'PRESTADO' && prestamo.fechaEsperada && (
              <span className={cn(vencido ? 'text-red-600 font-medium' : '')}>
                Esperado: {formatFecha(prestamo.fechaEsperada)}
                {vencido && ` · ${dias} día${dias !== 1 ? 's' : ''} vencido`}
              </span>
            )}
            {prestamo.estado === 'DEVUELTO' && (
              <span className="text-green-600">Devuelto: {formatFecha(prestamo.fechaDevolucion)}</span>
            )}
          </div>
          {prestamo.notas && <p className="text-xs text-muted-foreground italic truncate">"{prestamo.notas}"</p>}
          {prestamo.notasDevolucion && (
            <p className="text-xs text-green-700 dark:text-green-400 italic truncate">Devolución: "{prestamo.notasDevolucion}"</p>
          )}
        </div>

        <div className="flex flex-col gap-1 items-end shrink-0">
          <Badge className={cn('text-xs',
            prestamo.estado === 'DEVUELTO' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' :
            vencido ? 'bg-red-100 text-red-700 dark:bg-red-900/30' :
            'bg-amber-100 text-amber-700 dark:bg-amber-900/30')}>
            {prestamo.estado === 'DEVUELTO' ? 'Devuelto' : vencido ? 'Vencido' : 'Prestado'}
          </Badge>
          {prestamo.estado === 'PRESTADO' && (
            <button onClick={() => onDevolver(prestamo)}
              className="text-xs text-primary-700 dark:text-primary-500 hover:underline font-medium mt-1 whitespace-nowrap">
              Registrar devolución
            </button>
          )}
          {canEdit && (
            <button onClick={() => onDelete(prestamo)}
              className="min-h-0 h-auto p-1 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function InventarioPage() {
  const { equipoActual, usuario, permisos } = useAuthStore()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [tab, setTab] = useState('articulos')

  // Artículos
  const [busqueda, setBusqueda] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [showArticuloModal, setShowArticuloModal] = useState(false)
  const [editArticulo, setEditArticulo] = useState(null)
  const [prestamoArticulo, setPrestamoArticulo] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  // Préstamos
  const [filtroPrestamo, setFiltroPrestamo] = useState('PRESTADO')
  const [showPrestamoModal, setShowPrestamoModal] = useState(false)
  const [devolverTarget, setDevolverTarget] = useState(null)
  const [confirmDeletePrestamo, setConfirmDeletePrestamo] = useState(null)

  const equipoId = equipoActual?.id

  // Sin config explícita en el módulo → abierto por defecto (el admin cierra con permisos)
  const p = permisos?.inventario
  const canEdit = usuario?.superAdmin || !p || p.crear !== false

  // Queries
  const { data: resumen } = useQuery({
    queryKey: ['inventario-resumen', equipoId],
    queryFn: () => getResumen(equipoId).then((r) => r.data.data),
    enabled: !!equipoId,
  })

  const { data: articulos, isLoading: cargandoArticulos } = useQuery({
    queryKey: ['inventario-articulos', equipoId, busqueda, filtroCategoria],
    queryFn: () => getArticulos(equipoId, {
      ...(busqueda && { busqueda }),
      ...(filtroCategoria && { categoria: filtroCategoria }),
    }).then((r) => r.data.data),
    enabled: !!equipoId,
  })

  const { data: categorias } = useQuery({
    queryKey: ['inventario-categorias', equipoId],
    queryFn: () => getCategorias(equipoId).then((r) => r.data.data),
    enabled: !!equipoId,
  })

  const { data: prestamos, isLoading: cargandoPrestamos } = useQuery({
    queryKey: ['inventario-prestamos', equipoId, filtroPrestamo],
    queryFn: () => getPrestamos(equipoId, filtroPrestamo !== 'TODOS' ? { estado: filtroPrestamo } : {}).then((r) => r.data.data),
    enabled: !!equipoId,
  })

  // Mutations - Artículos
  const { mutate: guardarArticulo, isPending: guardandoArticulo } = useMutation({
    mutationFn: (data) => editArticulo
      ? updateArticulo(equipoId, editArticulo.id, data)
      : createArticulo(equipoId, data),
    onSuccess: () => {
      toast({ title: editArticulo ? 'Artículo actualizado' : 'Artículo agregado' })
      qc.invalidateQueries({ queryKey: ['inventario-articulos', equipoId] })
      qc.invalidateQueries({ queryKey: ['inventario-resumen', equipoId] })
      qc.invalidateQueries({ queryKey: ['inventario-categorias', equipoId] })
      setShowArticuloModal(false); setEditArticulo(null)
    },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, variant: 'destructive' }),
  })

  const { mutate: borrarArticulo } = useMutation({
    mutationFn: (id) => deleteArticulo(equipoId, id),
    onSuccess: () => {
      toast({ title: 'Artículo eliminado' })
      qc.invalidateQueries({ queryKey: ['inventario-articulos', equipoId] })
      qc.invalidateQueries({ queryKey: ['inventario-resumen', equipoId] })
      setConfirmDelete(null)
    },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, variant: 'destructive' }),
  })

  // Mutations - Préstamos
  const { mutate: registrarPrestamo, isPending: registrandoPrestamo } = useMutation({
    mutationFn: (data) => createPrestamo(equipoId, data),
    onSuccess: () => {
      toast({ title: 'Préstamo registrado' })
      qc.invalidateQueries({ queryKey: ['inventario-articulos', equipoId] })
      qc.invalidateQueries({ queryKey: ['inventario-prestamos', equipoId] })
      qc.invalidateQueries({ queryKey: ['inventario-resumen', equipoId] })
      setShowPrestamoModal(false); setPrestamoArticulo(null)
    },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, variant: 'destructive' }),
  })

  const { mutate: devolver, isPending: devolviendo } = useMutation({
    mutationFn: ({ id, data }) => devolverPrestamo(equipoId, id, data),
    onSuccess: () => {
      toast({ title: 'Devolución registrada' })
      qc.invalidateQueries({ queryKey: ['inventario-articulos', equipoId] })
      qc.invalidateQueries({ queryKey: ['inventario-prestamos', equipoId] })
      qc.invalidateQueries({ queryKey: ['inventario-resumen', equipoId] })
      setDevolverTarget(null)
    },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, variant: 'destructive' }),
  })

  const { mutate: borrarPrestamo } = useMutation({
    mutationFn: (id) => deletePrestamo(equipoId, id),
    onSuccess: () => {
      toast({ title: 'Préstamo eliminado' })
      qc.invalidateQueries({ queryKey: ['inventario-prestamos', equipoId] })
      qc.invalidateQueries({ queryKey: ['inventario-resumen', equipoId] })
      setConfirmDeletePrestamo(null)
    },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, variant: 'destructive' }),
  })

  // Préstamos vencidos (para el filtro VENCIDOS)
  const prestamosFiltrados = useMemo(() => {
    if (filtroPrestamo !== 'VENCIDOS') return prestamos || []
    const hoy = new Date()
    return (prestamos || []).filter(
      (p) => p.estado === 'PRESTADO' && p.fechaEsperada && new Date(p.fechaEsperada) < hoy,
    )
  }, [prestamos, filtroPrestamo])

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Inventario</h1>
          <p className="text-sm text-muted-foreground">{equipoActual?.nombre}</p>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-3 px-4">
            <Package className="h-8 w-8 text-primary-700 dark:text-primary-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Artículos</p>
              <p className="text-xl font-bold">{resumen?.articulos ?? '—'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-3 px-4">
            <ArrowLeftRight className="h-8 w-8 text-amber-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">En préstamo</p>
              <p className="text-xl font-bold">{resumen?.prestamosActivos ?? '—'}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={resumen?.vencidos > 0 ? 'border-red-300 dark:border-red-800' : ''}>
          <CardContent className="flex items-center gap-3 py-3 px-4">
            <AlertTriangle className={cn('h-8 w-8 shrink-0', resumen?.vencidos > 0 ? 'text-red-500' : 'text-muted-foreground')} />
            <div>
              <p className="text-xs text-muted-foreground">Vencidos</p>
              <p className={cn('text-xl font-bold', resumen?.vencidos > 0 ? 'text-red-600' : '')}>{resumen?.vencidos ?? '—'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        {[
          { key: 'articulos', label: 'Artículos' },
          { key: 'prestamos', label: 'Préstamos' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              tab === key ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground')}>
            {label}
          </button>
        ))}
      </div>

      {/* ─── Tab Artículos ────────────────────────────────────────────────── */}
      {tab === 'articulos' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar artículo..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Todas las categorías</option>
              {(categorias || []).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {canEdit && (
              <Button onClick={() => { setEditArticulo(null); setShowArticuloModal(true) }}>
                <Plus className="h-4 w-4" /> Nuevo artículo
              </Button>
            )}
          </div>

          {cargandoArticulos ? <PageSpinner /> : (
            <>
              {articulos?.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Sin artículos registrados</p>
                  <p className="text-sm">Agrega los materiales del equipo para llevar el control</p>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {articulos?.map((a) => (
                  <ArticuloCard
                    key={a.id}
                    articulo={a}
                    canEdit={canEdit}
                    onEdit={(art) => { setEditArticulo(art); setShowArticuloModal(true) }}
                    onPrestar={(art) => { setPrestamoArticulo(art); setShowPrestamoModal(true) }}
                    onDelete={(art) => setConfirmDelete(art)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── Tab Préstamos ────────────────────────────────────────────────── */}
      {tab === 'prestamos' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtros */}
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              {[
                { key: 'PRESTADO', label: 'Activos' },
                { key: 'VENCIDOS', label: 'Vencidos' },
                { key: 'DEVUELTO', label: 'Devueltos' },
                { key: 'TODOS', label: 'Todos' },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => setFiltroPrestamo(key)}
                  className={cn('px-3 py-1 rounded-md text-xs font-medium transition-colors',
                    filtroPrestamo === key ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                  {label}
                  {key === 'VENCIDOS' && resumen?.vencidos > 0 && (
                    <span className="ml-1 bg-red-500 text-white rounded-full px-1 text-[10px]">{resumen.vencidos}</span>
                  )}
                </button>
              ))}
            </div>
            <div className="flex-1" />
            <Button size="sm" onClick={() => setShowPrestamoModal(true)}>
              <Plus className="h-4 w-4" /> Registrar préstamo
            </Button>
          </div>

          {cargandoPrestamos ? <PageSpinner /> : (
            <div className="space-y-2">
              {prestamosFiltrados.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  <ArrowLeftRight className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No hay préstamos en esta categoría</p>
                </div>
              )}
              {prestamosFiltrados.map((p) => (
                <PrestamoRow
                  key={p.id}
                  prestamo={p}
                  canEdit={canEdit}
                  onDevolver={(pr) => setDevolverTarget(pr)}
                  onDelete={(pr) => setConfirmDeletePrestamo(pr)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Modales ──────────────────────────────────────────────────────── */}

      {showArticuloModal && (
        <ArticuloModal
          articulo={editArticulo}
          categorias={categorias}
          loading={guardandoArticulo}
          onClose={() => { setShowArticuloModal(false); setEditArticulo(null) }}
          onSave={guardarArticulo}
        />
      )}

      {showPrestamoModal && (
        <PrestamoModal
          articulos={articulos}
          articuloPreseleccionado={prestamoArticulo}
          loading={registrandoPrestamo}
          onClose={() => { setShowPrestamoModal(false); setPrestamoArticulo(null) }}
          onSave={registrarPrestamo}
        />
      )}

      {devolverTarget && (
        <DevolverModal
          prestamo={devolverTarget}
          loading={devolviendo}
          onClose={() => setDevolverTarget(null)}
          onSave={({ notasDevolucion }) => devolver({ id: devolverTarget.id, data: { notasDevolucion } })}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="¿Eliminar artículo?"
          message={`"${confirmDelete.nombre}" se marcará como inactivo y no aparecerá más en el inventario.`}
          confirmLabel="Eliminar"
          danger
          onConfirm={() => borrarArticulo(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {confirmDeletePrestamo && (
        <ConfirmModal
          title="¿Eliminar registro de préstamo?"
          message={`Se eliminará el registro del préstamo de "${confirmDeletePrestamo.articulo?.nombre}" a ${confirmDeletePrestamo.prestadoA}.`}
          confirmLabel="Eliminar"
          danger
          onConfirm={() => borrarPrestamo(confirmDeletePrestamo.id)}
          onCancel={() => setConfirmDeletePrestamo(null)}
        />
      )}
    </div>
  )
}
