import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '@/stores/useAuthStore'
import {
  getEdicion,
  upsertAsistenciaMes,
  addEquipoApoyo,
  removeEquipoApoyo,
  upsertTemaMes,
  upsertTareaEntrega,
  upsertParticipacionMes,
} from '@/api/talleres'
import { getMiembros } from '@/api/equipos'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageSpinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import {
  ArrowLeft, Users, User, MapPin, Check, Plus, X,
  BookOpen, FileText, ExternalLink, Pencil, ClipboardList,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { formatCalendarDate, getCalendarMonth } from '@/utils/dates'

// ─── helpers ─────────────────────────────────────────────────────────────────

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]
const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function getMonths(fechaInicio, fechaFin) {
  const start = getCalendarMonth(fechaInicio)
  const end = fechaFin ? getCalendarMonth(fechaFin) : start
  const months = []
  let cur = new Date(Date.UTC(start.anio, start.mes - 1, 1))
  const last = new Date(Date.UTC(end.anio, end.mes - 1, 1))
  while (cur <= last) {
    months.push({ mes: cur.getUTCMonth() + 1, anio: cur.getUTCFullYear() })
    cur.setUTCMonth(cur.getUTCMonth() + 1)
  }
  return months.length ? months : [start]
}

function mesTabLabel(m, multiAnio) {
  return multiAnio
    ? `${MESES_CORTO[m.mes - 1]} ${String(m.anio).slice(2)}`
    : MESES[m.mes - 1]
}

function getEstado(ins, mes, anio) {
  return ins.asistenciasMes?.find((a) => a.mes === mes && a.anio === anio)?.estado ?? 'AUSENTE'
}

function getTarea(ins, mes, anio) {
  return ins.tareasEntrega?.find((t) => t.mes === mes && t.anio === anio)?.entrego ?? false
}

function getParticipacion(ins, mes, anio) {
  return ins.participaciones?.find((p) => p.mes === mes && p.anio === anio)?.participo ?? false
}

function getTemaMes(temasMes, mes, anio) {
  return temasMes?.find((t) => t.mes === mes && t.anio === anio) ?? null
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function TallerEdicionPage() {
  const { id: tallerId, edicionId } = useParams()
  const { equipoActual } = useAuthStore()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('general')
  const [showApoyoModal, setShowApoyoModal] = useState(false)
  const [showTemaModal, setShowTemaModal] = useState(null) // { mes, anio }

  const { data: edicion, isLoading } = useQuery({
    queryKey: ['edicion', edicionId],
    queryFn: () => getEdicion(equipoActual.id, tallerId, edicionId).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

  const { mutate: registrarAsistencia, variables: pendingAsistencia } = useMutation({
    mutationFn: ({ inscripcionId, mes, anio, estado }) =>
      upsertAsistenciaMes(equipoActual.id, inscripcionId, { mes, anio, estado }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['edicion', edicionId] }),
    onError: () => toast({ title: 'Error al guardar asistencia', variant: 'destructive' }),
  })

  const { mutate: registrarTarea, variables: pendingTarea } = useMutation({
    mutationFn: ({ inscripcionId, mes, anio, entrego }) =>
      upsertTareaEntrega(equipoActual.id, inscripcionId, { mes, anio, entrego }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['edicion', edicionId] }),
    onError: () => toast({ title: 'Error al guardar tarea', variant: 'destructive' }),
  })

  const { mutate: registrarParticipacion, variables: pendingParticipacion } = useMutation({
    mutationFn: ({ inscripcionId, mes, anio, participo }) =>
      upsertParticipacionMes(equipoActual.id, inscripcionId, { mes, anio, participo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['edicion', edicionId] }),
    onError: () => toast({ title: 'Error al guardar participación', variant: 'destructive' }),
  })

  if (isLoading) return <PageSpinner />
  if (!edicion) return <div className="p-6 text-muted-foreground">Edición no encontrada</div>

  const months = getMonths(edicion.fecha, edicion.fechaFin)
  const multiAnio = new Set(months.map((m) => m.anio)).size > 1
  const inscripciones = edicion.inscripciones ?? []
  const total = inscripciones.length
  const coordinadorNombre = edicion.coordinador?.nombreCorto || edicion.coordinador?.usuario?.nombre

  const activeMes = activeTab !== 'general' ? months[Number(activeTab)] : null

  const stats = activeMes
    ? inscripciones.reduce(
        (acc, ins) => {
          const e = getEstado(ins, activeMes.mes, activeMes.anio)
          if (e === 'PRESENTE') acc.presentes++
          if (e === 'PERMISO') acc.permisos++
          if (getTarea(ins, activeMes.mes, activeMes.anio)) acc.tareas++
          if (getParticipacion(ins, activeMes.mes, activeMes.anio)) acc.participaciones++
          return acc
        },
        { presentes: 0, permisos: 0, tareas: 0, participaciones: 0 }
      )
    : null

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">

      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <Link to={`/talleres/${tallerId}`}>
          <button className="min-h-0 h-auto p-1 text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-medium truncate">
            {edicion.taller?.nombre}
          </p>
          <h1 className="text-lg font-bold leading-tight">
            {formatCalendarDate(edicion.fecha)}
            {edicion.fechaFin && (
              <span className="font-normal text-muted-foreground"> → {formatCalendarDate(edicion.fechaFin)}</span>
            )}
          </h1>
        </div>
        <Badge variant="secondary" className="shrink-0">
          <Users className="h-3 w-3 mr-1" />{total}
        </Badge>
      </div>

      {/* Meta info: coordinador + equipo de apoyo */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {edicion.lugar && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />{edicion.lugar}
            </span>
          )}
          {coordinadorNombre && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <User className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium text-foreground">{coordinadorNombre}</span>
              <span className="text-xs">(coordinador)</span>
            </span>
          )}
        </div>

        {/* Equipo de apoyo */}
        <EquipoApoyoSection
          edicion={edicion}
          tallerId={tallerId}
          equipoActual={equipoActual}
          onOpenModal={() => setShowApoyoModal(true)}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          onClick={() => setActiveTab('general')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0',
            activeTab === 'general'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted text-muted-foreground hover:bg-muted/70'
          )}
        >
          General
        </button>
        {months.map((m, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(String(i))}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0',
              activeTab === String(i)
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/70'
            )}
          >
            {mesTabLabel(m, multiAnio)}
          </button>
        ))}
      </div>

      {/* Contenido: tab General */}
      {activeTab === 'general' && (
        <GeneralTab inscripciones={inscripciones} months={months} multiAnio={multiAnio} />
      )}

      {/* Contenido: tab de mes */}
      {activeTab !== 'general' && activeMes && (
        <div className="space-y-4">
          {/* Tema del mes */}
          <TemaDelMes
            tema={getTemaMes(edicion.temasMes, activeMes.mes, activeMes.anio)}
            mes={activeMes.mes}
            anio={activeMes.anio}
            inscripciones={inscripciones}
            onEdit={() => setShowTemaModal(activeMes)}
          />

          {/* Stats de asistencia */}
          <div className="flex items-center justify-between py-2 px-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {MESES[activeMes.mes - 1]}
            </p>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-green-600 font-medium" title="Presentes">
                <Check className="h-3 w-3" /> {stats.presentes}
              </span>
              <span className="text-yellow-600 font-bold" title="Permisos">P {stats.permisos}</span>
              <span className="flex items-center gap-1 text-blue-600 font-medium" title="Tareas entregadas">
                <ClipboardList className="h-3 w-3" /> {stats.tareas}
              </span>
              <span className="flex items-center gap-1 text-purple-600 font-medium" title="Participaciones">
                <BookOpen className="h-3 w-3" /> {stats.participaciones}
              </span>
              <span className="text-muted-foreground">/ {total}</span>
            </div>
          </div>

          {total === 0 && (
            <p className="text-sm text-center text-muted-foreground py-8">
              Sin hermanos inscritos en esta edición.
            </p>
          )}

          <div className="divide-y rounded-lg border overflow-hidden">
            {inscripciones.map((ins) => {
              const estado = getEstado(ins, activeMes.mes, activeMes.anio)
              const tarea = getTarea(ins, activeMes.mes, activeMes.anio)
              const participo = getParticipacion(ins, activeMes.mes, activeMes.anio)
              const isPendingAsist =
                pendingAsistencia?.inscripcionId === ins.id &&
                pendingAsistencia?.mes === activeMes.mes &&
                pendingAsistencia?.anio === activeMes.anio
              const isPendingTarea =
                pendingTarea?.inscripcionId === ins.id &&
                pendingTarea?.mes === activeMes.mes &&
                pendingTarea?.anio === activeMes.anio
              const isPendingPartic =
                pendingParticipacion?.inscripcionId === ins.id &&
                pendingParticipacion?.mes === activeMes.mes &&
                pendingParticipacion?.anio === activeMes.anio

              return (
                <div key={ins.id} className="flex items-center gap-2 px-3 py-3 bg-card">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-sm font-medium truncate">
                      {ins.hermano.nombre} {ins.hermano.apellido}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {ins.hermano.comunidad?.nombre}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Tarea */}
                    <button
                      onClick={() =>
                        registrarTarea({ inscripcionId: ins.id, mes: activeMes.mes, anio: activeMes.anio, entrego: !tarea })
                      }
                      disabled={isPendingTarea}
                      title={tarea ? 'Tarea entregada — clic para quitar' : 'No entregó tarea — clic para marcar'}
                      className={cn(
                        'h-8 w-8 flex items-center justify-center rounded-lg border transition-colors text-xs font-bold',
                        tarea
                          ? 'bg-blue-100 border-blue-300 text-blue-700'
                          : 'border-input text-muted-foreground/40 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-500'
                      )}
                    >
                      T
                    </button>

                    {/* Participación */}
                    <button
                      onClick={() =>
                        registrarParticipacion({ inscripcionId: ins.id, mes: activeMes.mes, anio: activeMes.anio, participo: !participo })
                      }
                      disabled={isPendingPartic}
                      title={participo ? 'Participó — clic para quitar' : 'No participó — clic para marcar'}
                      className={cn(
                        'h-8 w-8 flex items-center justify-center rounded-lg border transition-colors',
                        participo
                          ? 'bg-purple-100 border-purple-300 text-purple-700'
                          : 'border-input text-muted-foreground/40 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-500'
                      )}
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                    </button>

                    {/* Asistencia */}
                    <EstadoControl
                      estado={estado}
                      disabled={isPendingAsist}
                      onChange={(nuevoEstado) =>
                        registrarAsistencia({ inscripcionId: ins.id, mes: activeMes.mes, anio: activeMes.anio, estado: nuevoEstado })
                      }
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal equipo de apoyo */}
      {showApoyoModal && (
        <ApoyoModal
          edicion={edicion}
          tallerId={tallerId}
          equipoActual={equipoActual}
          onClose={() => setShowApoyoModal(false)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['edicion', edicionId] })}
          toast={toast}
        />
      )}

      {/* Modal tema del mes */}
      {showTemaModal && (
        <TemaModal
          edicion={edicion}
          tallerId={tallerId}
          mes={showTemaModal.mes}
          anio={showTemaModal.anio}
          inscripciones={inscripciones}
          equipoActual={equipoActual}
          initialData={getTemaMes(edicion.temasMes, showTemaModal.mes, showTemaModal.anio)}
          onClose={() => setShowTemaModal(null)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['edicion', edicionId] })}
          toast={toast}
        />
      )}
    </div>
  )
}

// ─── EquipoApoyoSection ───────────────────────────────────────────────────────

function EquipoApoyoSection({ edicion, tallerId, equipoActual, onOpenModal }) {
  const apoyo = edicion.equipoApoyo ?? []

  return (
    <div className="flex flex-wrap items-center gap-2">
      {apoyo.length === 0 && (
        <span className="text-xs text-muted-foreground italic">Sin equipo de apoyo asignado</span>
      )}
      {apoyo.map((a) => {
        const nombre = a.miembro.nombreCorto || a.miembro.usuario?.nombre
        return (
          <span
            key={a.miembro.id}
            className="inline-flex items-center gap-1 text-xs bg-muted rounded-full px-2.5 py-1"
          >
            <Users className="h-3 w-3 text-muted-foreground" />
            {nombre}
            {a.rol && <span className="text-muted-foreground">· {a.rol}</span>}
          </span>
        )
      })}
      <button
        onClick={onOpenModal}
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        title="Gestionar equipo de apoyo"
      >
        <Pencil className="h-3 w-3" />
        Gestionar apoyo
      </button>
    </div>
  )
}

// ─── TemaDelMes ───────────────────────────────────────────────────────────────

function TemaDelMes({ tema, mes, anio, onEdit }) {
  if (!tema || (!tema.titulo && !tema.notas && !tema.documentoUrl && !tema.expositorId)) {
    return (
      <button
        onClick={onEdit}
        className="w-full flex items-center gap-2 px-4 py-3 rounded-lg border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors text-sm"
      >
        <FileText className="h-4 w-4 shrink-0" />
        <span>Agregar tema de {MESES[mes - 1]}</span>
        <Plus className="h-3.5 w-3.5 ml-auto" />
      </button>
    )
  }

  const expositorNombre = tema.expositor
    ? `${tema.expositor.nombre}${tema.expositor.apellido ? ' ' + tema.expositor.apellido : ''}`
    : null

  return (
    <div className="rounded-lg border bg-card px-4 py-3 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-sm font-semibold">{tema.titulo || 'Sin título'}</p>
        </div>
        <button
          onClick={onEdit}
          className="shrink-0 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Editar tema"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
      {expositorNombre && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 ml-6">
          <User className="h-3 w-3" /> {expositorNombre}
        </p>
      )}
      {tema.notas && (
        <p className="text-xs text-muted-foreground ml-6 line-clamp-2">{tema.notas}</p>
      )}
      {tema.documentoUrl && (
        <a
          href={tema.documentoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline ml-6"
        >
          <ExternalLink className="h-3 w-3" /> Ver documento
        </a>
      )}
    </div>
  )
}

// ─── EstadoControl ────────────────────────────────────────────────────────────

function EstadoControl({ estado, onChange, disabled }) {
  return (
    <div className="flex items-center rounded-full border border-input overflow-hidden shrink-0">
      <button
        onClick={() => onChange('AUSENTE')}
        disabled={disabled}
        title="Ausente"
        className={cn(
          'h-8 w-8 flex items-center justify-center transition-colors',
          estado === 'AUSENTE'
            ? 'bg-muted text-foreground'
            : 'text-muted-foreground/40 hover:bg-muted/60 hover:text-muted-foreground'
        )}
      >
        <div className={cn('h-3.5 w-3.5 rounded-full border-2', estado === 'AUSENTE' ? 'border-foreground' : 'border-current')} />
      </button>
      <button
        onClick={() => onChange('PRESENTE')}
        disabled={disabled}
        title="Presente"
        className={cn(
          'h-8 w-8 flex items-center justify-center transition-colors border-x border-input',
          estado === 'PRESENTE'
            ? 'bg-green-100 text-green-600'
            : 'text-muted-foreground/40 hover:bg-green-50 hover:text-green-500'
        )}
      >
        <Check className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => onChange('PERMISO')}
        disabled={disabled}
        title="Permiso"
        className={cn(
          'h-8 w-8 flex items-center justify-center transition-colors',
          estado === 'PERMISO'
            ? 'bg-yellow-100 text-yellow-700'
            : 'text-muted-foreground/40 hover:bg-yellow-50 hover:text-yellow-600'
        )}
      >
        <span className="text-xs font-bold leading-none">P</span>
      </button>
    </div>
  )
}

// ─── GeneralTab ───────────────────────────────────────────────────────────────

function GeneralTab({ inscripciones, months, multiAnio }) {
  if (inscripciones.length === 0) {
    return (
      <p className="text-sm text-center text-muted-foreground py-8">
        Sin hermanos inscritos en esta edición.
      </p>
    )
  }

  const totalesMes = months.map((m) => ({
    presentes: inscripciones.filter((ins) => getEstado(ins, m.mes, m.anio) === 'PRESENTE').length,
    permisos: inscripciones.filter((ins) => getEstado(ins, m.mes, m.anio) === 'PERMISO').length,
    tareas: inscripciones.filter((ins) => getTarea(ins, m.mes, m.anio)).length,
    participaciones: inscripciones.filter((ins) => getParticipacion(ins, m.mes, m.anio)).length,
  }))

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <table className="min-w-full text-sm border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 pr-4 font-semibold text-xs uppercase tracking-wide text-muted-foreground min-w-[140px]">
              Hermano
            </th>
            {months.map((m, i) => (
              <th
                key={i}
                className="py-2 px-3 text-center font-medium text-xs uppercase tracking-wide text-muted-foreground whitespace-nowrap"
              >
                {mesTabLabel(m, multiAnio)}
              </th>
            ))}
            <th className="py-2 pl-4 text-center font-medium text-xs uppercase tracking-wide text-muted-foreground whitespace-nowrap">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {inscripciones.map((ins) => {
            const totalPresente = months.filter((m) => getEstado(ins, m.mes, m.anio) === 'PRESENTE').length
            return (
              <tr key={ins.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="py-2.5 pr-4">
                  <p className="font-medium text-sm">{ins.hermano.nombre} {ins.hermano.apellido}</p>
                  <p className="text-xs text-muted-foreground">{ins.hermano.comunidad?.nombre}</p>
                </td>
                {months.map((m, i) => {
                  const estado = getEstado(ins, m.mes, m.anio)
                  const tarea = getTarea(ins, m.mes, m.anio)
                  const participo = getParticipacion(ins, m.mes, m.anio)
                  return (
                    <td key={i} className="py-2.5 px-3 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        {estado === 'PRESENTE' && <Check className="h-4 w-4 text-green-600" />}
                        {estado === 'PERMISO' && <span className="text-sm font-bold text-yellow-600">P</span>}
                        {estado === 'AUSENTE' && <span className="text-muted-foreground/40">—</span>}
                        <div className="flex gap-0.5">
                          {tarea && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Tarea entregada" />}
                          {participo && <span className="w-1.5 h-1.5 rounded-full bg-purple-500" title="Participó" />}
                        </div>
                      </div>
                    </td>
                  )
                })}
                <td className="py-2.5 pl-4 text-center">
                  <span className="text-xs font-semibold">{totalPresente}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t bg-muted/30">
            <td className="py-2 pr-4 text-xs font-semibold text-muted-foreground uppercase">Totales</td>
            {totalesMes.map((t, i) => (
              <td key={i} className="py-2 px-3 text-center">
                <div className="flex flex-col items-center gap-0.5 text-xs">
                  <span className="text-green-600 font-medium">{t.presentes}✓</span>
                  {t.permisos > 0 && <span className="text-yellow-600">{t.permisos}P</span>}
                  <div className="flex gap-1">
                    {t.tareas > 0 && <span className="text-blue-600">{t.tareas}T</span>}
                    {t.participaciones > 0 && <span className="text-purple-600">{t.participaciones}★</span>}
                  </div>
                </div>
              </td>
            ))}
            <td />
          </tr>
        </tfoot>
      </table>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Tarea entregada</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500 inline-block" /> Participó</span>
      </div>
    </div>
  )
}

// ─── ApoyoModal ───────────────────────────────────────────────────────────────

function ApoyoModal({ edicion, tallerId, equipoActual, onClose, onSuccess, toast }) {
  const { data: miembros = [] } = useQuery({
    queryKey: ['miembros', equipoActual?.id],
    queryFn: () => getMiembros(equipoActual.id).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

  const [selectedMiembro, setSelectedMiembro] = useState('')
  const [rolInput, setRolInput] = useState('')
  const [loading, setLoading] = useState(false)

  const apoyo = edicion.equipoApoyo ?? []
  const apoyoIds = new Set(apoyo.map((a) => a.miembro.id))
  const coordinadorId = edicion.coordinador?.id

  const disponibles = miembros.filter(
    (m) => !apoyoIds.has(m.id) && m.id !== coordinadorId
  )

  const onAdd = async () => {
    if (!selectedMiembro) return
    setLoading(true)
    try {
      await addEquipoApoyo(equipoActual.id, tallerId, edicion.id, {
        miembroId: parseInt(selectedMiembro),
        rol: rolInput.trim() || undefined,
      })
      setSelectedMiembro('')
      setRolInput('')
      onSuccess()
    } catch {
      toast({ title: 'Error al agregar', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const onRemove = async (miembroId) => {
    try {
      await removeEquipoApoyo(equipoActual.id, tallerId, edicion.id, miembroId)
      onSuccess()
    } catch {
      toast({ title: 'Error al quitar', variant: 'destructive' })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-background rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-base">Equipo de apoyo</h2>
          <button onClick={onClose} className="p-1 rounded text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Agregar miembro */}
        <div className="space-y-2">
          <select
            value={selectedMiembro}
            onChange={(e) => setSelectedMiembro(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Seleccionar miembro del equipo...</option>
            {disponibles.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombreCorto || m.usuario?.nombre}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <Input
              placeholder="Rol (opcional, ej: Apoyo logístico)"
              value={rolInput}
              onChange={(e) => setRolInput(e.target.value)}
              className="flex-1 h-9 text-sm"
            />
            <Button size="sm" onClick={onAdd} disabled={!selectedMiembro || loading}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Lista actual */}
        {apoyo.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Asignados</p>
            <div className="divide-y rounded-lg border overflow-hidden">
              {apoyo.map((a) => {
                const nombre = a.miembro.nombreCorto || a.miembro.usuario?.nombre
                return (
                  <div key={a.miembro.id} className="flex items-center justify-between px-3 py-2.5 bg-card">
                    <div>
                      <p className="text-sm font-medium">{nombre}</p>
                      {a.rol && <p className="text-xs text-muted-foreground">{a.rol}</p>}
                    </div>
                    <button
                      onClick={() => onRemove(a.miembro.id)}
                      className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {apoyo.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            Sin miembros de apoyo asignados aún.
          </p>
        )}
      </div>
    </div>
  )
}

// ─── TemaModal ────────────────────────────────────────────────────────────────

function TemaModal({ edicion, tallerId, mes, anio, inscripciones, equipoActual, initialData, onClose, onSuccess, toast }) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      titulo: initialData?.titulo ?? '',
      expositorId: initialData?.expositorId ?? '',
      notas: initialData?.notas ?? '',
      documentoUrl: initialData?.documentoUrl ?? '',
    },
  })
  const [loading, setLoading] = useState(false)

  const onSave = async (data) => {
    setLoading(true)
    const payload = { ...data, expositorId: data.expositorId || null }
    try {
      await upsertTemaMes(equipoActual.id, tallerId, edicion.id, mes, anio, payload)
      toast({ title: 'Tema guardado' })
      onSuccess()
      onClose()
    } catch {
      toast({ title: 'Error al guardar tema', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-background rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-base">Tema de {MESES[mes - 1]}</h2>
          <button onClick={onClose} className="p-1 rounded text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSave)} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Título del tema</label>
            <Input {...register('titulo')} placeholder="Ej: El Espíritu Santo en la comunidad" className="h-9" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Expuso</label>
            <select
              {...register('expositorId', { valueAsNumber: true })}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Sin asignar</option>
              {inscripciones.map((ins) => (
                <option key={ins.hermano.id} value={ins.hermano.id}>
                  {ins.hermano.nombre} {ins.hermano.apellido}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notas</label>
            <textarea
              {...register('notas')}
              rows={3}
              placeholder="Notas sobre el tema impartido..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Enlace del documento</label>
            <Input {...register('documentoUrl')} placeholder="https://docs.google.com/..." className="h-9" />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              Guardar tema
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
