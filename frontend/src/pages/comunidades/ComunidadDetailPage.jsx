import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/useAuthStore'
import {
  getComunidad,
  createMiembroConsejo, updateMiembroConsejo, deleteMiembroConsejo,
  createVisita, updateVisita, deleteVisita,
} from '@/api/comunidades'
import { getMiembros } from '@/api/equipos'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageSpinner } from '@/components/ui/spinner'
import { Card, CardContent } from '@/components/ui/card'
import { ComunidadModal } from './ComunidadModal'
import { ArrowLeft, Edit, MapPin, Clock, Users, Plus, Trash2, Pencil, X, ShieldCheck, Wrench, Calendar } from 'lucide-react'

const TABS = ['Info general', 'Consejo', 'Hermanos', 'Visitas', 'Servicios']
const ESTADO_BADGE = { ACTIVA: 'success', PROCESO_INSCRIPCION: 'warning', INACTIVA: 'secondary' }
const ESTADO_LABEL = { ACTIVA: 'Activa', PROCESO_INSCRIPCION: 'En proceso', INACTIVA: 'Inactiva' }
const SERVICIO_ESTADO_BADGE = { PENDIENTE: 'destructive', ASIGNADO: 'warning', CONFIRMADO: 'success', FINALIZADO: 'secondary', CANCELADO: 'outline' }
const nombreMiembro = (m) => m.nombreCorto || m.usuario?.nombre || `Miembro ${m.id}`

const CONSEJO_EMPTY = { nombre: '', telefono: '', periodo: '', nota: '' }
const VISITA_EMPTY = { fecha: '', responsableId: '', apoyo: '', horario: '', notas: '' }

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-base">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'

export default function ComunidadDetailPage() {
  const { id } = useParams()
  const { equipoActual } = useAuthStore()
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [editModal, setEditModal] = useState(false)

  // Consejo modal state
  const [consejoModal, setConsejoModal] = useState(false)
  const [consejoForm, setConsejoForm] = useState(CONSEJO_EMPTY)
  const [editingConsejo, setEditingConsejo] = useState(null)

  // Visita modal state
  const [visitaModal, setVisitaModal] = useState(false)
  const [visitaForm, setVisitaForm] = useState(VISITA_EMPTY)
  const [editingVisita, setEditingVisita] = useState(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['comunidad', id],
    queryFn: () => getComunidad(equipoActual.id, id).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

  const { data: miembros = [] } = useQuery({
    queryKey: ['miembros', equipoActual?.id],
    queryFn: () => getMiembros(equipoActual.id).then((r) => r.data.data.filter((m) => m.activo)),
    enabled: !!equipoActual?.id,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['comunidad', id] })

  // Consejo mutations
  const saveConsejo = useMutation({
    mutationFn: (body) =>
      editingConsejo
        ? updateMiembroConsejo(equipoActual.id, id, editingConsejo.id, body)
        : createMiembroConsejo(equipoActual.id, id, body),
    onSuccess: () => { invalidate(); setConsejoModal(false) },
  })

  const removeConsejo = useMutation({
    mutationFn: (miembroId) => deleteMiembroConsejo(equipoActual.id, id, miembroId),
    onSuccess: invalidate,
  })

  // Visita mutations
  const saveVisita = useMutation({
    mutationFn: (body) =>
      editingVisita
        ? updateVisita(equipoActual.id, id, editingVisita.id, body)
        : createVisita(equipoActual.id, id, body),
    onSuccess: () => { invalidate(); setVisitaModal(false) },
  })

  const removeVisita = useMutation({
    mutationFn: (visitaId) => deleteVisita(equipoActual.id, id, visitaId),
    onSuccess: invalidate,
  })

  const openNewConsejo = () => {
    setEditingConsejo(null)
    setConsejoForm(CONSEJO_EMPTY)
    setConsejoModal(true)
  }

  const openEditConsejo = (m) => {
    setEditingConsejo(m)
    setConsejoForm({ nombre: m.nombre, telefono: m.telefono || '', periodo: m.periodo || '', nota: m.nota || '' })
    setConsejoModal(true)
  }

  const openNewVisita = () => {
    setEditingVisita(null)
    setVisitaForm(VISITA_EMPTY)
    setVisitaModal(true)
  }

  const openEditVisita = (v) => {
    setEditingVisita(v)
    setVisitaForm({
      fecha: v.fecha ? v.fecha.split('T')[0] : '',
      responsableId: v.responsableId || '',
      apoyo: v.apoyo || '',
      horario: v.horario || '',
      notas: v.notas || '',
    })
    setVisitaModal(true)
  }

  const submitConsejo = (e) => {
    e.preventDefault()
    saveConsejo.mutate({
      nombre: consejoForm.nombre,
      telefono: consejoForm.telefono || null,
      periodo: consejoForm.periodo || null,
      nota: consejoForm.nota || null,
    })
  }

  const submitVisita = (e) => {
    e.preventDefault()
    saveVisita.mutate({
      fecha: visitaForm.fecha,
      responsableId: visitaForm.responsableId ? Number(visitaForm.responsableId) : null,
      apoyo: visitaForm.apoyo || null,
      horario: visitaForm.horario || null,
      notas: visitaForm.notas || null,
    })
  }

  if (isLoading) return <PageSpinner />
  if (!data) return <div className="p-6 text-muted-foreground">Comunidad no encontrada</div>

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/comunidades">
          <button className="min-h-0 h-auto p-1 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold">{data.nombre}</h1>
            <Badge variant={ESTADO_BADGE[data.estado]}>{ESTADO_LABEL[data.estado]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {data.departamento}
            {data.numero && <span className="ml-2">#{data.numero}</span>}
          </p>
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
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap min-h-[44px] transition-colors border-b-2 ${
              tab === i ? 'border-primary-700 text-primary-700 dark:border-primary-500 dark:text-primary-500' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Info general ── */}
      {tab === 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {data.lugarAsamblea && (
            <Card><CardContent className="py-3 px-4 flex gap-2 items-start">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div><p className="text-xs text-muted-foreground">Lugar de asamblea</p><p className="font-medium">{data.lugarAsamblea}</p></div>
            </CardContent></Card>
          )}
          {data.horarioAsamblea && (
            <Card><CardContent className="py-3 px-4 flex gap-2 items-start">
              <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div><p className="text-xs text-muted-foreground">Horario</p><p className="font-medium">{data.horarioAsamblea}</p></div>
            </CardContent></Card>
          )}
          {data.enlace && (
            <Card><CardContent className="py-3 px-4">
              <p className="text-xs text-muted-foreground">Enlace asignado</p>
              <p className="font-medium">{data.enlace.usuario?.nombre}</p>
            </CardContent></Card>
          )}
          {data.notas && (
            <Card className="md:col-span-2"><CardContent className="py-3 px-4">
              <p className="text-xs text-muted-foreground mb-1">Notas</p>
              <p className="text-sm">{data.notas}</p>
            </CardContent></Card>
          )}
        </div>
      )}

      {/* ── Consejo ── */}
      {tab === 1 && (
        <div className="space-y-3">
          {data.enlaceConsejo && (
            <Card className="border-primary-200 bg-primary-50/50 dark:border-primary-800/50 dark:bg-primary-900/20">
              <CardContent className="py-3 px-4 flex gap-2 items-start">
                <ShieldCheck className="h-4 w-4 text-primary-700 dark:text-primary-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-primary-700 dark:text-primary-500 font-medium">Enlace Consejo Asesor</p>
                  <p className="font-medium">{data.enlaceConsejo}</p>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="flex justify-end">
            <Button size="sm" onClick={openNewConsejo}>
              <Plus className="h-4 w-4 mr-1" /> Agregar miembro
            </Button>
          </div>
          {data.miembrosConsejo?.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Sin miembros de consejo registrados</p>
          ) : (
            data.miembrosConsejo?.map((m) => (
              <Card key={m.id}>
                <CardContent className="py-3 px-4 flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{m.nombre}</p>
                    {m.telefono && <p className="text-sm text-muted-foreground">{m.telefono}</p>}
                    {m.periodo && <p className="text-xs text-muted-foreground mt-0.5">Periodo: {m.periodo}</p>}
                    {m.nota && <Badge variant="secondary" className="mt-1">{m.nota}</Badge>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEditConsejo(m)} className="p-1.5 text-muted-foreground hover:text-foreground rounded">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => { if (confirm('¿Eliminar este miembro?')) removeConsejo.mutate(m.id) }}
                      className="p-1.5 text-muted-foreground hover:text-destructive rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ── Hermanos ── */}
      {tab === 2 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" /> {data.hermanos?.length} hermanos
          </div>
          {data.hermanos?.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Sin hermanos registrados</p>
          ) : (
            data.hermanos?.map((h) => (
              <Link key={h.id} to={`/hermanos/${h.id}`}>
                <Card className="hover:shadow-sm cursor-pointer"><CardContent className="py-3 px-4">
                  <p className="font-medium">{h.nombre} {h.apellido}</p>
                  {h.telefono && <p className="text-sm text-muted-foreground">{h.telefono}</p>}
                </CardContent></Card>
              </Link>
            ))
          )}
        </div>
      )}

      {/* ── Visitas ── */}
      {tab === 3 && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={openNewVisita}>
              <Plus className="h-4 w-4 mr-1" /> Programar visita
            </Button>
          </div>
          {data.visitas?.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Sin visitas registradas</p>
          ) : (
            data.visitas?.map((v) => (
              <Card key={v.id}>
                <CardContent className="py-3 px-4 flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{new Date(v.fecha).toLocaleDateString('es-SV', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    {v.horario && <p className="text-sm text-muted-foreground">{v.horario}</p>}
                    {v.responsable && (
                      <p className="text-sm mt-1">
                        <span className="text-muted-foreground">Responsable: </span>
                        {v.responsable.nombreCorto || v.responsable.usuario?.nombre}
                      </p>
                    )}
                    {v.apoyo && (() => {
                      const nombres = v.apoyo.split(',').filter(Boolean).map((sid) => {
                        const m = miembros.find((x) => String(x.id) === sid)
                        return m ? (m.nombreCorto || m.usuario?.nombre) : sid
                      })
                      return (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Apoyo: </span>{nombres.join(', ')}
                        </p>
                      )
                    })()}
                    {v.notas && <p className="text-sm text-muted-foreground mt-1">{v.notas}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEditVisita(v)} className="p-1.5 text-muted-foreground hover:text-foreground rounded">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => { if (confirm('¿Eliminar esta visita?')) removeVisita.mutate(v.id) }}
                      className="p-1.5 text-muted-foreground hover:text-destructive rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ── Servicios ── */}
      {tab === 4 && (
        <div className="space-y-3">
          {data.servicios?.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Sin servicios registrados para esta comunidad</p>
          ) : (
            data.servicios?.map((s) => (
              <Card key={s.id}>
                <CardContent className="py-3 px-4 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
                    <p className="font-medium">{s.catalogoServicio?.nombre}</p>
                    <Badge variant={SERVICIO_ESTADO_BADGE[s.estado]}>{s.estado}</Badge>
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
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {s.actividad.lugar}</span>
                      )}
                      {s.horaServicio && (
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {s.horaServicio}</span>
                      )}
                    </div>
                  )}
                  {s.descripcion && <p className="text-sm text-muted-foreground">{s.descripcion}</p>}
                  {s.asignados?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {s.asignados.map((a) => (
                        <span key={a.miembro.id} className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full">
                          <Users className="h-3 w-3" />{nombreMiembro(a.miembro)}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ── Edit comunidad modal ── */}
      {editModal && (
        <ComunidadModal comunidad={data} onClose={() => setEditModal(false)} onSaved={() => { setEditModal(false); refetch() }} />
      )}

      {/* ── Consejo modal ── */}
      {consejoModal && (
        <Modal title={editingConsejo ? 'Editar miembro' : 'Agregar miembro al consejo'} onClose={() => setConsejoModal(false)}>
          <form onSubmit={submitConsejo} className="space-y-3">
            <Field label="Nombre *">
              <input
                className={inputCls}
                value={consejoForm.nombre}
                onChange={(e) => setConsejoForm((f) => ({ ...f, nombre: e.target.value }))}
                required
                placeholder="Nombre completo"
              />
            </Field>
            <Field label="Teléfono">
              <input
                className={inputCls}
                value={consejoForm.telefono}
                onChange={(e) => setConsejoForm((f) => ({ ...f, telefono: e.target.value }))}
                placeholder="Ej. 7000-0000"
              />
            </Field>
            <Field label="Periodo">
              <input
                className={inputCls}
                value={consejoForm.periodo}
                onChange={(e) => setConsejoForm((f) => ({ ...f, periodo: e.target.value }))}
                placeholder="Ej. 2024-2026"
              />
            </Field>
            <Field label="Nota / Cargo">
              <input
                className={inputCls}
                value={consejoForm.nota}
                onChange={(e) => setConsejoForm((f) => ({ ...f, nota: e.target.value }))}
                placeholder="Ej. Anciano"
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setConsejoModal(false)}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={saveConsejo.isPending}>
                {saveConsejo.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Visita modal ── */}
      {visitaModal && (
        <Modal title={editingVisita ? 'Editar visita' : 'Programar visita'} onClose={() => setVisitaModal(false)}>
          <form onSubmit={submitVisita} className="space-y-3">
            <Field label="Fecha *">
              <input
                type="date"
                className={inputCls}
                value={visitaForm.fecha}
                onChange={(e) => setVisitaForm((f) => ({ ...f, fecha: e.target.value }))}
                required
              />
            </Field>
            <Field label="Horario">
              <input
                className={inputCls}
                value={visitaForm.horario}
                onChange={(e) => setVisitaForm((f) => ({ ...f, horario: e.target.value }))}
                placeholder="Ej. 10:00 AM"
              />
            </Field>
            <Field label="Responsable">
              <select
                className={inputCls}
                value={visitaForm.responsableId}
                onChange={(e) => setVisitaForm((f) => ({ ...f, responsableId: e.target.value }))}
              >
                <option value="">-- Sin asignar --</option>
                {miembros.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombreCorto || m.usuario?.nombre}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Apoyo">
              <div className="border rounded-md p-2 space-y-1 max-h-40 overflow-y-auto">
                {miembros.length === 0 && <p className="text-xs text-muted-foreground px-1">Sin miembros disponibles</p>}
                {miembros.map((m) => {
                  const selected = visitaForm.apoyo.split(',').filter(Boolean).includes(String(m.id))
                  return (
                    <label key={m.id} className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-muted cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => {
                          const ids = visitaForm.apoyo.split(',').filter(Boolean)
                          const next = selected ? ids.filter((x) => x !== String(m.id)) : [...ids, String(m.id)]
                          setVisitaForm((f) => ({ ...f, apoyo: next.join(',') }))
                        }}
                        className="accent-primary-700"
                      />
                      {m.nombreCorto || m.usuario?.nombre}
                    </label>
                  )
                })}
              </div>
            </Field>
            <Field label="Notas">
              <textarea
                className={`${inputCls} resize-none`}
                rows={3}
                value={visitaForm.notas}
                onChange={(e) => setVisitaForm((f) => ({ ...f, notas: e.target.value }))}
                placeholder="Notas o agenda de la visita..."
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setVisitaModal(false)}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={saveVisita.isPending}>
                {saveVisita.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
