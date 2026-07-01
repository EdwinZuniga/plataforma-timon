import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '@/stores/useAuthStore'
import { getMiembros } from '@/api/equipos'
import {
  getResumen, getMovimientos, createMovimiento, updateMovimiento,
  deleteMovimiento, getOfrendas, registrarOfrendas, deleteOfrenda,
} from '@/api/tesoreria'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageSpinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { Plus, X, Pencil, Trash2, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { cn } from '@/utils/cn'

const MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const CONCEPTOS_GENERAL_INGRESO = ['Ofrendas de enseñanzas','Rifas','Donaciones externas','Inscripciones a retiros','Aportes por actividades','Ventas y recaudaciones']
const CONCEPTOS_GENERAL_EGRESO  = ['Gastos de enseñanzas','Servicios contratados','Materiales para actividades','Gastos de retiros','Transporte','Alquileres','Impresiones','Sonido y decoración','Logística']
const CONCEPTOS_CHICA_INGRESO   = ['Ofrendas de miembros','Aportes internos','Reintegros','Fondo asignado desde Caja General']
const CONCEPTOS_CHICA_EGRESO    = ['Refrigerios','Agua','Café','Desechables','Compras pequeñas','Materiales básicos','Gastos urgentes']

function getSugerencias(tipo, caja) {
  if (tipo === 'INGRESO') return caja === 'GENERAL' ? CONCEPTOS_GENERAL_INGRESO : CONCEPTOS_CHICA_INGRESO
  return caja === 'GENERAL' ? CONCEPTOS_GENERAL_EGRESO : CONCEPTOS_CHICA_EGRESO
}

// Todos los sábados del año en UTC para coincidir con lo que guarda el backend
function getSabadosDelAnio(anio) {
  const sabados = []
  const d = new Date(Date.UTC(anio, 0, 1))
  const dia = d.getUTCDay()
  const diff = (6 - dia + 7) % 7
  d.setUTCDate(d.getUTCDate() + diff)
  while (d.getUTCFullYear() === anio) {
    sabados.push(new Date(d))
    d.setUTCDate(d.getUTCDate() + 7)
  }
  return sabados
}

// Clave canónica de fecha usando UTC (el backend almacena a mediodía UTC)
function fechaKey(date) {
  const d = new Date(date)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

// Para campos <input type="date"> usamos la fecha local de hoy
function hoyInput() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatFechaUTC(date) {
  const d = new Date(date)
  return `${d.getUTCDate()} ${MESES_CORTOS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

function formatFechaLocal(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' })
}

function nombreDisplay(miembro) {
  return miembro.nombreCorto
    ? miembro.nombreCorto
    : miembro.usuario.nombre
}

// ─── Tarjetas de resumen ────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4 px-4">
        <div className={cn('h-10 w-10 rounded-full flex items-center justify-center shrink-0', color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">${value.toFixed(2)}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Modal de movimiento ─────────────────────────────────────────────────────

function MovimientoModal({ cajaDefault, movimiento, onClose, onSave, loading }) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: movimiento
      ? { ...movimiento, fecha: fechaKey(movimiento.fecha), actividadId: movimiento.actividadId || '' }
      : { tipo: 'INGRESO', caja: cajaDefault, fecha: hoyInput(), monto: '', concepto: '', categoria: '', descripcion: '' },
  })

  const tipo = watch('tipo')
  const caja = watch('caja')
  const sugerencias = getSugerencias(tipo, caja)

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
      <div className="bg-card rounded-t-2xl md:rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-card z-10">
          <h2 className="font-semibold text-lg">{movimiento ? 'Editar movimiento' : 'Nuevo movimiento'}</h2>
          <button onClick={onClose} className="min-h-0 h-auto p-1 text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit(onSave)} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Tipo *</label>
              <select className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register('tipo', { required: true })}>
                <option value="INGRESO">Ingreso</option>
                <option value="EGRESO">Egreso</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Caja *</label>
              <select className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register('caja', { required: true })}>
                <option value="GENERAL">Caja General</option>
                <option value="CHICA">Caja Chica</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Concepto *</label>
            <Input {...register('concepto', { required: 'Requerido' })} placeholder="Ej: Ofrendas de enseñanza" />
            {errors.concepto && <p className="text-xs text-destructive">{errors.concepto.message}</p>}
            <div className="flex flex-wrap gap-1 pt-1">
              {sugerencias.map((s) => (
                <button key={s} type="button" onClick={() => setValue('concepto', s)}
                  className="text-xs px-2 py-0.5 rounded-full border border-input hover:bg-accent transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Monto (USD) *</label>
              <Input type="number" step="0.01" min="0.01"
                {...register('monto', { required: 'Requerido', min: { value: 0.01, message: 'Debe ser mayor a 0' } })}
                placeholder="0.00" />
              {errors.monto && <p className="text-xs text-destructive">{errors.monto.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Fecha *</label>
              <Input type="date" {...register('fecha', { required: 'Requerido' })} />
              {errors.fecha && <p className="text-xs text-destructive">{errors.fecha.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Categoría <span className="text-muted-foreground text-xs">(opcional)</span></label>
            <Input {...register('categoria')} placeholder="Ej: Retiro anual" />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Descripción <span className="text-muted-foreground text-xs">(opcional)</span></label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              placeholder="Detalles adicionales..."
              {...register('descripcion')}
            />
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

// ─── Lista de movimientos ────────────────────────────────────────────────────

function ListaMovimientos({ equipoId, caja, canEdit, anio }) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [filtroTipo, setFiltroTipo] = useState('')

  const { data: movimientos, isLoading } = useQuery({
    queryKey: ['tesoreria-movimientos', equipoId, caja, anio],
    queryFn: () => getMovimientos(equipoId, { caja, anio }).then((r) => r.data.data),
    enabled: !!equipoId,
  })

  const { data: resumen } = useQuery({
    queryKey: ['tesoreria-resumen', equipoId, anio],
    queryFn: () => getResumen(equipoId, anio).then((r) => r.data.data),
    enabled: !!equipoId,
  })

  const { mutate: create, isPending: creating } = useMutation({
    mutationFn: (data) => createMovimiento(equipoId, data),
    onSuccess: () => {
      toast({ title: 'Movimiento registrado' })
      qc.invalidateQueries({ queryKey: ['tesoreria-movimientos', equipoId] })
      qc.invalidateQueries({ queryKey: ['tesoreria-resumen', equipoId] })
      setShowModal(false)
    },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, variant: 'destructive' }),
  })

  const { mutate: update, isPending: updating } = useMutation({
    mutationFn: ({ id, data }) => updateMovimiento(equipoId, id, data),
    onSuccess: () => {
      toast({ title: 'Movimiento actualizado' })
      qc.invalidateQueries({ queryKey: ['tesoreria-movimientos', equipoId] })
      qc.invalidateQueries({ queryKey: ['tesoreria-resumen', equipoId] })
      setEditTarget(null)
    },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, variant: 'destructive' }),
  })

  const { mutate: remove } = useMutation({
    mutationFn: (id) => deleteMovimiento(equipoId, id),
    onSuccess: () => {
      toast({ title: 'Movimiento eliminado' })
      qc.invalidateQueries({ queryKey: ['tesoreria-movimientos', equipoId] })
      qc.invalidateQueries({ queryKey: ['tesoreria-resumen', equipoId] })
    },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, variant: 'destructive' }),
  })

  const stats = resumen?.[caja.toLowerCase()]
  const lista = (movimientos || []).filter((m) => !filtroTipo || m.tipo === filtroTipo)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Ingresos" value={stats?.ingresos || 0} icon={TrendingUp} color="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" />
        <StatCard label="Egresos" value={stats?.egresos || 0} icon={TrendingDown} color="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" />
        <StatCard label="Saldo" value={stats?.saldo || 0} icon={Wallet} color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Todos</option>
          <option value="INGRESO">Ingresos</option>
          <option value="EGRESO">Egresos</option>
        </select>
        <div className="flex-1" />
        {canEdit && (
          <Button size="sm" onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4" /> Registrar
          </Button>
        )}
      </div>

      {isLoading ? <PageSpinner /> : (
        <div className="space-y-2">
          {lista.length === 0 && (
            <p className="text-center text-muted-foreground py-8 text-sm">No hay movimientos registrados</p>
          )}
          {lista.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex items-center gap-3 py-3 px-4">
                <div className={cn(
                  'h-9 w-9 rounded-full flex items-center justify-center shrink-0',
                  m.tipo === 'INGRESO'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                )}>
                  {m.tipo === 'INGRESO' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{m.concepto}</p>
                    {m.categoria && <Badge variant="secondary" className="shrink-0 text-xs">{m.categoria}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatFechaLocal(m.fecha)} · {m.responsable?.usuario?.nombre}
                    {m.actividad && ` · ${m.actividad.nombre}`}
                  </p>
                  {m.descripcion && <p className="text-xs text-muted-foreground mt-0.5 truncate">{m.descripcion}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn('font-semibold', m.tipo === 'INGRESO' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                    {m.tipo === 'INGRESO' ? '+' : '-'}${m.monto.toFixed(2)}
                  </span>
                  {canEdit && (
                    <>
                      <button onClick={() => setEditTarget(m)} className="min-h-0 h-auto p-1 text-muted-foreground hover:text-foreground">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => { if (confirm('¿Eliminar este movimiento?')) remove(m.id) }}
                        className="min-h-0 h-auto p-1 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <MovimientoModal cajaDefault={caja} loading={creating} onClose={() => setShowModal(false)} onSave={(data) => create({ ...data, caja })} />
      )}
      {editTarget && (
        <MovimientoModal cajaDefault={caja} movimiento={editTarget} loading={updating} onClose={() => setEditTarget(null)} onSave={(data) => update({ id: editTarget.id, data })} />
      )}
    </div>
  )
}

// ─── Modal de ofrenda (registro en bloque) ───────────────────────────────────

function ModalOfrenda({ miembros, montoPorSemana, onClose, onSave, loading }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { miembroId: '', montoTotal: String(montoPorSemana), fechaInicio: hoyInput() },
  })
  const montoTotal = parseFloat(watch('montoTotal') || 0)
  const semanas = montoTotal > 0 ? Math.round(montoTotal / montoPorSemana) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
      <div className="bg-card rounded-t-2xl md:rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-lg">Registrar ofrenda</h2>
          <button onClick={onClose} className="min-h-0 h-auto p-1 text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit(onSave)} className="p-4 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Miembro *</label>
            <select className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...register('miembroId', { required: 'Requerido' })}>
              <option value="">Seleccionar...</option>
              {miembros.map((m) => (
                <option key={m.id} value={m.id}>{m.usuario.nombre}</option>
              ))}
            </select>
            {errors.miembroId && <p className="text-xs text-destructive">{errors.miembroId.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Monto total a registrar (USD) *</label>
            <Input type="number" step={montoPorSemana} min={montoPorSemana}
              {...register('montoTotal', { required: 'Requerido', min: { value: montoPorSemana, message: `Mínimo $${montoPorSemana}` } })} />
            {semanas > 0 && (
              <p className="text-xs text-muted-foreground">
                Se registrarán <strong>{semanas}</strong> sábado{semanas !== 1 ? 's' : ''} (${montoPorSemana.toFixed(2)} c/u)
              </p>
            )}
            {errors.montoTotal && <p className="text-xs text-destructive">{errors.montoTotal.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Sábado de inicio *</label>
            <Input type="date" {...register('fechaInicio', { required: 'Requerido' })} />
            <p className="text-xs text-muted-foreground">
              Si el monto es mayor a ${montoPorSemana.toFixed(2)}, se distribuye en sábados consecutivos desde esta fecha.
            </p>
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

// ─── Tabla de ofrendas semanales ─────────────────────────────────────────────

function TablaOfrendas({ equipoId, anio, miembros, canEdit, montoPorSemana }) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)

  const { data: ofrendas, isLoading } = useQuery({
    queryKey: ['tesoreria-ofrendas', equipoId, anio],
    queryFn: () => getOfrendas(equipoId, anio).then((r) => r.data.data),
    enabled: !!equipoId,
  })

  const { mutate: registrar, isPending: registrando } = useMutation({
    mutationFn: (data) => registrarOfrendas(equipoId, data),
    onSuccess: () => {
      toast({ title: 'Ofrenda registrada' })
      qc.invalidateQueries({ queryKey: ['tesoreria-ofrendas', equipoId, anio] })
    },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, variant: 'destructive' }),
  })

  const { mutate: eliminar } = useMutation({
    mutationFn: (id) => deleteOfrenda(equipoId, id),
    onSuccess: () => {
      toast({ title: 'Ofrenda eliminada' })
      qc.invalidateQueries({ queryKey: ['tesoreria-ofrendas', equipoId, anio] })
    },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, variant: 'destructive' }),
  })

  const sabados = useMemo(() => getSabadosDelAnio(anio), [anio])

  const sabadosPorMes = useMemo(() => {
    const grupos = {}
    sabados.forEach((s) => {
      const mes = s.getUTCMonth()
      if (!grupos[mes]) grupos[mes] = []
      grupos[mes].push(s)
    })
    return grupos
  }, [sabados])

  // Índice: miembroId → { "2026-01-03": ofrendaObj }
  const ofrendasIndex = useMemo(() => {
    const idx = {}
    if (!ofrendas) return idx
    ofrendas.forEach((o) => {
      if (!idx[o.miembroId]) idx[o.miembroId] = {}
      idx[o.miembroId][fechaKey(o.fecha)] = o
    })
    return idx
  }, [ofrendas])

  const subtotales = useMemo(() => {
    const totales = {}
    if (!ofrendas) return totales
    ofrendas.forEach((o) => { totales[o.miembroId] = (totales[o.miembroId] || 0) + o.monto })
    return totales
  }, [ofrendas])

  const miembrosActivos = useMemo(() => (miembros || []).filter((m) => m.activo), [miembros])

  const handleCeldaClick = (miembro, sabado) => {
    if (!canEdit) return
    const key = fechaKey(sabado)
    const ofrenda = ofrendasIndex[miembro.id]?.[key]
    if (ofrenda) {
      if (confirm(`¿Quitar ofrenda de ${miembro.usuario.nombre} del ${formatFechaUTC(sabado)}?`)) {
        eliminar(ofrenda.id)
      }
    } else {
      if (confirm(`¿Registrar ofrenda de $${montoPorSemana.toFixed(2)} para ${miembro.usuario.nombre} el ${formatFechaUTC(sabado)}?`)) {
        registrar({ miembroId: miembro.id, fechas: [key], monto: montoPorSemana })
      }
    }
  }

  const handleModalSave = ({ miembroId, montoTotal, fechaInicio }) => {
    const semanas = Math.max(1, Math.round(parseFloat(montoTotal) / montoPorSemana))
    // Partir de la fecha elegida en UTC
    const inicio = new Date(fechaInicio + 'T12:00:00Z')
    // Avanzar al sábado si no lo es
    while (inicio.getUTCDay() !== 6) inicio.setUTCDate(inicio.getUTCDate() + 1)
    const fechas = []
    for (let i = 0; i < semanas; i++) {
      const d = new Date(inicio)
      d.setUTCDate(d.getUTCDate() + i * 7)
      fechas.push(fechaKey(d))
    }
    registrar({ miembroId: parseInt(miembroId), fechas, monto: montoPorSemana })
  }

  const totalGeneral = Object.values(subtotales).reduce((s, v) => s + v, 0)

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-muted-foreground">
          Total recaudado {anio}: <strong className="text-foreground">${totalGeneral.toFixed(2)}</strong>
        </p>
        {canEdit && (
          <Button size="sm" onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4" /> Registrar ofrenda
          </Button>
        )}
      </div>

      <div className="border rounded-lg overflow-auto">
        <table className="text-xs border-collapse min-w-max">
          <thead>
            <tr className="bg-muted/50">
              <th className="sticky left-0 z-10 bg-muted/50 px-3 py-2 text-left font-semibold min-w-[130px] border-r">
                Hermano
              </th>
              {Object.entries(sabadosPorMes).map(([mes, sabs]) => (
                <th key={mes} colSpan={sabs.length} className="px-2 py-2 text-center font-semibold border-r border-b">
                  {MESES_CORTOS[parseInt(mes)]}
                </th>
              ))}
              <th className="px-3 py-2 text-right font-semibold">Total</th>
            </tr>
            <tr className="bg-muted/30">
              <th className="sticky left-0 z-10 bg-muted/30 px-3 py-1 border-r" />
              {sabados.map((s) => (
                <th key={fechaKey(s)} className="px-1.5 py-1 text-center font-normal text-muted-foreground border-r w-8">
                  {s.getUTCDate()}
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {miembrosActivos.map((miembro, idx) => {
              const subtotal = subtotales[miembro.id] || 0
              return (
                <tr key={miembro.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                  <td className="sticky left-0 z-10 bg-inherit px-3 py-1.5 border-r font-medium truncate max-w-[130px]"
                    title={miembro.usuario.nombre}>
                    {nombreDisplay(miembro)}
                  </td>
                  {sabados.map((s) => {
                    const key = fechaKey(s)
                    const ofrenda = ofrendasIndex[miembro.id]?.[key]
                    return (
                      <td key={key} className="px-0.5 py-1 text-center border-r">
                        <button
                          onClick={() => handleCeldaClick(miembro, s)}
                          title={
                            ofrenda
                              ? `$${ofrenda.monto.toFixed(2)} — click para quitar`
                              : canEdit ? 'Click para registrar' : ''
                          }
                          className={cn(
                            'w-7 h-6 rounded text-xs font-medium transition-colors',
                            ofrenda
                              ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700 dark:bg-green-900/40 dark:text-green-400'
                              : canEdit
                                ? 'text-transparent hover:bg-muted hover:text-muted-foreground/60'
                                : 'cursor-default',
                          )}
                        >
                          {ofrenda
                            ? `$${ofrenda.monto % 1 === 0 ? ofrenda.monto.toFixed(0) : ofrenda.monto.toFixed(2)}`
                            : canEdit ? '+' : ''}
                        </button>
                      </td>
                    )
                  })}
                  <td className="px-3 py-1 text-right font-semibold text-green-700 dark:text-green-400">
                    {subtotal > 0 ? `$${subtotal.toFixed(2)}` : ''}
                  </td>
                </tr>
              )
            })}
            <tr className="bg-muted/40 font-semibold border-t">
              <td className="sticky left-0 z-10 bg-muted/40 px-3 py-1.5 border-r text-muted-foreground">Semana</td>
              {sabados.map((s) => {
                const key = fechaKey(s)
                const suma = (ofrendas || []).filter((o) => fechaKey(o.fecha) === key).reduce((acc, o) => acc + o.monto, 0)
                return (
                  <td key={key} className="px-0.5 py-1 text-center border-r text-muted-foreground">
                    {suma > 0 ? `$${suma.toFixed(0)}` : ''}
                  </td>
                )
              })}
              <td className="px-3 py-1 text-right text-green-700 dark:text-green-400">${totalGeneral.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {showModal && (
        <ModalOfrenda
          miembros={miembrosActivos}
          montoPorSemana={montoPorSemana}
          loading={registrando}
          onClose={() => setShowModal(false)}
          onSave={handleModalSave}
        />
      )}
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function TesoreriaPage() {
  const { equipoActual, usuario, permisos } = useAuthStore()
  const [tab, setTab] = useState('general')
  const [subTabChica, setSubTabChica] = useState('ofrendas')
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [montoPorSemana, setMontoPorSemana] = useState(1)
  const [editandoMonto, setEditandoMonto] = useState(false)
  const [montoTmp, setMontoTmp] = useState('1')

  const { data: miembros } = useQuery({
    queryKey: ['miembros', equipoActual?.id],
    queryFn: () => getMiembros(equipoActual.id).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

  const miActual = miembros?.find((m) => m.usuario.email === usuario?.email)
  const esCoordinador = usuario?.superAdmin || ['COORDINADOR', 'SECRETARIO'].includes(miActual?.rol)
  const puedeEscribir = esCoordinador || permisos?.tesoreria?.crear

  const anios = useMemo(() => {
    const base = new Date().getFullYear()
    return [base - 1, base, base + 1]
  }, [])

  const confirmarMonto = () => {
    const v = parseFloat(montoTmp)
    if (v > 0) setMontoPorSemana(v)
    setEditandoMonto(false)
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Tesorería</h1>
          <p className="text-sm text-muted-foreground">{equipoActual?.nombre}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Monto semanal configurable */}
          {tab === 'chica' && subTabChica === 'ofrendas' && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Ofrenda/semana:</span>
              {editandoMonto && esCoordinador ? (
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">$</span>
                  <input
                    type="number" step="0.01" min="0.01"
                    value={montoTmp}
                    onChange={(e) => setMontoTmp(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') confirmarMonto(); if (e.key === 'Escape') setEditandoMonto(false) }}
                    className="w-16 h-7 rounded border border-input bg-background px-2 text-sm"
                    autoFocus
                  />
                  <Button size="sm" className="h-7 px-2 text-xs" onClick={confirmarMonto}>OK</Button>
                </div>
              ) : (
                <button
                  onClick={() => { if (esCoordinador) { setMontoTmp(String(montoPorSemana)); setEditandoMonto(true) } }}
                  className={cn('font-semibold', esCoordinador ? 'underline decoration-dashed cursor-pointer hover:text-primary-700' : 'cursor-default')}
                  title={esCoordinador ? 'Click para cambiar' : undefined}
                >
                  ${montoPorSemana.toFixed(2)}
                </button>
              )}
            </div>
          )}
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Año:</label>
            <select
              value={anio}
              onChange={(e) => setAnio(parseInt(e.target.value))}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {anios.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs principales */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        {[
          { key: 'general', label: 'Caja General' },
          { key: 'chica', label: 'Caja Chica' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              tab === key ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <ListaMovimientos equipoId={equipoActual?.id} caja="GENERAL" canEdit={puedeEscribir} anio={anio} />
      )}

      {tab === 'chica' && (
        <div className="space-y-4">
          <div className="flex gap-1 border-b">
            {[
              { key: 'ofrendas', label: 'Ofrendas semanales' },
              { key: 'movimientos', label: 'Movimientos' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSubTabChica(key)}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                  subTabChica === key
                    ? 'border-primary-700 text-primary-700'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {subTabChica === 'ofrendas' && (
            <TablaOfrendas
              equipoId={equipoActual?.id}
              anio={anio}
              miembros={miembros}
              canEdit={puedeEscribir}
              montoPorSemana={montoPorSemana}
            />
          )}
          {subTabChica === 'movimientos' && (
            <ListaMovimientos equipoId={equipoActual?.id} caja="CHICA" canEdit={puedeEscribir} anio={anio} />
          )}
        </div>
      )}
    </div>
  )
}
