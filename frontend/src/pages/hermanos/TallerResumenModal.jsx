import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/useAuthStore'
import { getInscripcionResumen } from '@/api/talleres'
import { X, BookOpen, CalendarCheck, MessageCircle, ClipboardList } from 'lucide-react'

const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// Lista completa de meses de la edición, marcando los que no tienen registro.
function mesesDeLaEdicion(edicion, detalle) {
  const inicio = edicion?.fecha ? new Date(edicion.fecha) : null
  if (!inicio) return detalle
  const fin = edicion?.fechaFin ? new Date(edicion.fechaFin) : new Date()
  const registros = new Map(detalle.map((d) => [`${d.anio}-${d.mes}`, d]))
  const out = []
  const cur = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), 1))
  const tope = new Date(Date.UTC(fin.getUTCFullYear(), fin.getUTCMonth(), 1))
  while (cur <= tope) {
    const mes = cur.getUTCMonth() + 1
    const anio = cur.getUTCFullYear()
    out.push(registros.get(`${anio}-${mes}`) ?? { mes, anio, estado: 'SIN_REGISTRO' })
    cur.setUTCMonth(cur.getUTCMonth() + 1)
  }
  return out
}

function StatRow({ label, value, total, colorClass }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className={`text-sm ${colorClass}`}>{label}</span>
      <span className="text-sm font-medium">
        {value}
        {total > 0 && <span className="text-muted-foreground font-normal"> / {total}</span>}
      </span>
    </div>
  )
}

function MonthlyBadges({ items, getColor }) {
  if (items.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {items.map((item) => (
        <span
          key={`${item.mes}-${item.anio}`}
          className={`text-xs px-1.5 py-0.5 rounded font-medium ${getColor(item)}`}
          title={`${MESES[item.mes]} ${item.anio}`}
        >
          {MESES[item.mes]}
        </span>
      ))}
    </div>
  )
}

export function TallerResumenModal({ ins, onClose }) {
  const { equipoActual } = useAuthStore()

  const { data: resumen, isLoading } = useQuery({
    queryKey: ['inscripcion-resumen', ins.id],
    queryFn: () => getInscripcionResumen(equipoActual.id, ins.id).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

  const taller = ins.edicionTaller.taller

  const mesesAsistencia = useMemo(
    () => (resumen ? mesesDeLaEdicion(ins.edicionTaller, resumen.asistencia.detalle) : []),
    [resumen, ins.edicionTaller],
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-card rounded-t-2xl md:rounded-xl w-full max-w-md shadow-xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="h-5 w-5 text-primary-700 dark:text-primary-400 shrink-0" />
            <h2 className="font-semibold text-lg truncate">{taller.nombre}</h2>
          </div>
          <button onClick={onClose} className="min-h-0 h-auto p-1 text-muted-foreground ml-2 shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-5">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Cargando resumen...</p>
          ) : !resumen ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sin datos registrados.</p>
          ) : (
            <>
              <section>
                <div className="flex items-center gap-2 mb-1">
                  <CalendarCheck className="h-4 w-4 text-primary-700 dark:text-primary-400" />
                  <h3 className="text-sm font-semibold">Asistencia</h3>
                  {resumen.asistencia.esperadas > 0 && (
                    <span className="ml-auto text-xs text-muted-foreground">{resumen.asistencia.esperadas} sesiones</span>
                  )}
                </div>
                {resumen.asistencia.esperadas === 0 ? (
                  <p className="text-xs text-muted-foreground pl-1">Sin registros de asistencia</p>
                ) : (
                  <>
                    <div className="divide-y">
                      <StatRow label="Presente" value={resumen.asistencia.presentes} total={resumen.asistencia.esperadas} colorClass="text-green-700 dark:text-green-400" />
                      <StatRow label="Permiso" value={resumen.asistencia.permisos} total={resumen.asistencia.esperadas} colorClass="text-yellow-600 dark:text-yellow-400" />
                      <StatRow label="Ausente" value={resumen.asistencia.ausentes} total={resumen.asistencia.esperadas} colorClass="text-red-600 dark:text-red-400" />
                    </div>
                    {resumen.asistencia.sinRegistrar > 0 && (
                      <p className="text-xs text-muted-foreground mt-1.5 pl-1">
                        {resumen.asistencia.sinRegistrar} {resumen.asistencia.sinRegistrar === 1 ? 'mes' : 'meses'} sin registrar,
                        contado{resumen.asistencia.sinRegistrar === 1 ? '' : 's'} como ausencia
                      </p>
                    )}
                    <MonthlyBadges
                      items={mesesAsistencia}
                      getColor={(item) =>
                        item.estado === 'PRESENTE'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : item.estado === 'PERMISO'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : item.estado === 'AUSENTE'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-muted text-muted-foreground'
                      }
                    />
                  </>
                )}
              </section>

              <section>
                <div className="flex items-center gap-2 mb-1">
                  <MessageCircle className="h-4 w-4 text-primary-700 dark:text-primary-400" />
                  <h3 className="text-sm font-semibold">Participaciones</h3>
                  {resumen.participacion.total > 0 && (
                    <span className="ml-auto text-xs text-muted-foreground">{resumen.participacion.total} sesiones</span>
                  )}
                </div>
                {resumen.participacion.total === 0 ? (
                  <p className="text-xs text-muted-foreground pl-1">Sin registros de participación</p>
                ) : (
                  <>
                    <div className="divide-y">
                      <StatRow label="Participó" value={resumen.participacion.participo} total={resumen.participacion.total} colorClass="text-green-700 dark:text-green-400" />
                      <StatRow label="No participó" value={resumen.participacion.noParticipo} total={resumen.participacion.total} colorClass="text-muted-foreground" />
                    </div>
                    <MonthlyBadges
                      items={resumen.participacion.detalle}
                      getColor={(item) => item.participo ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-muted text-muted-foreground'}
                    />
                  </>
                )}
              </section>

              <section>
                <div className="flex items-center gap-2 mb-1">
                  <ClipboardList className="h-4 w-4 text-primary-700 dark:text-primary-400" />
                  <h3 className="text-sm font-semibold">Tareas</h3>
                  {resumen.tareas.total > 0 && (
                    <span className="ml-auto text-xs text-muted-foreground">{resumen.tareas.total} tareas</span>
                  )}
                </div>
                {resumen.tareas.total === 0 ? (
                  <p className="text-xs text-muted-foreground pl-1">Sin registros de tareas</p>
                ) : (
                  <>
                    <div className="divide-y">
                      <StatRow label="Entregadas" value={resumen.tareas.entregadas} total={resumen.tareas.total} colorClass="text-green-700 dark:text-green-400" />
                      <StatRow label="No entregadas" value={resumen.tareas.noEntregadas} total={resumen.tareas.total} colorClass="text-red-600 dark:text-red-400" />
                    </div>
                    <MonthlyBadges
                      items={resumen.tareas.detalle}
                      getColor={(item) => item.entrego ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}
                    />
                  </>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
