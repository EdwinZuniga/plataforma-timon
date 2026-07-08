import { useQuery } from '@tanstack/react-query'
import { getMiembroPerfil } from '@/api/equipos'
import { useAuthStore } from '@/stores/useAuthStore'
import { Badge } from '@/components/ui/badge'
import { PageSpinner } from '@/components/ui/spinner'
import { X, Users, BookOpen, Mic2, Wrench, MapPin } from 'lucide-react'

const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const ROL_LABEL = { COORDINADOR: 'Coordinador', MIEMBRO: 'Miembro', SECRETARIO: 'Secretario', CONSULTOR: 'Consultor' }
const ROL_BADGE = { COORDINADOR: 'default', MIEMBRO: 'success', SECRETARIO: 'warning', CONSULTOR: 'secondary' }

const ESTADO_LABEL = { ACTIVA: 'Activa', PROCESO_INSCRIPCION: 'En proceso', INACTIVA: 'Inactiva' }
const ESTADO_BADGE = { ACTIVA: 'success', PROCESO_INSCRIPCION: 'warning', INACTIVA: 'secondary' }

function formatFecha(fecha) {
  if (!fecha) return ''
  const d = new Date(fecha)
  return d.toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' })
}

function Section({ icon: Icon, title, count, children }) {
  if (count === 0) return null
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <Badge variant="secondary" className="text-xs">{count}</Badge>
      </div>
      <div className="space-y-1.5 pl-6">{children}</div>
    </div>
  )
}

export default function MiembroPerfilModal({ miembro, onClose }) {
  const { equipoActual } = useAuthStore()

  const { data: perfil, isLoading } = useQuery({
    queryKey: ['miembro-perfil', equipoActual?.id, miembro.id],
    queryFn: () => getMiembroPerfil(equipoActual.id, miembro.id).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

  const iniciales = miembro.usuario.nombre.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

  const totalResponsabilidades = perfil
    ? (perfil.comunidades?.length ?? 0) +
      (perfil.edicionesCoordinadas?.length ?? 0) +
      (perfil.equipoApoyoEdiciones?.length ?? 0) +
      (perfil.temasMesExpuestos?.length ?? 0) +
      (perfil.serviciosAsignados?.length ?? 0)
    : 0

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-card rounded-t-2xl md:rounded-xl w-full max-w-lg shadow-xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-base font-bold text-primary-700 shrink-0">
              {iniciales}
            </div>
            <div>
              <p className="font-semibold text-base leading-tight">{miembro.usuario.nombre}</p>
              <p className="text-xs text-muted-foreground">{miembro.usuario.email}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <Badge variant={ROL_BADGE[miembro.rol]}>{ROL_LABEL[miembro.rol]}</Badge>
                {miembro.nombreCorto && (
                  <span className="text-xs text-muted-foreground font-mono">{miembro.nombreCorto}</span>
                )}
                {!miembro.activo && <Badge variant="secondary">Inactivo</Badge>}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-4">
          {isLoading ? (
            <PageSpinner />
          ) : totalResponsabilidades === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Este miembro no tiene responsabilidades asignadas aún.</p>
          ) : (
            <div className="space-y-5">

              {/* Comunidades como enlace */}
              <Section icon={MapPin} title="Comunidades como enlace" count={perfil.comunidades?.length ?? 0}>
                {perfil.comunidades.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2">
                    <div>
                      <span className="text-sm font-medium">{c.nombre}</span>
                      {c.numero && <span className="text-xs text-muted-foreground ml-1">#{c.numero}</span>}
                      <p className="text-xs text-muted-foreground">{c.departamento}</p>
                    </div>
                    <Badge variant={ESTADO_BADGE[c.estado]}>{ESTADO_LABEL[c.estado]}</Badge>
                  </div>
                ))}
              </Section>

              {/* Talleres coordinados */}
              <Section icon={BookOpen} title="Talleres coordinados" count={perfil.edicionesCoordinadas?.length ?? 0}>
                {perfil.edicionesCoordinadas.map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2">
                    <span className="text-sm">{e.taller.nombre}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{formatFecha(e.fecha)}</span>
                  </div>
                ))}
              </Section>

              {/* Equipo de apoyo */}
              <Section icon={Users} title="Apoyo en talleres" count={perfil.equipoApoyoEdiciones?.length ?? 0}>
                {perfil.equipoApoyoEdiciones.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2">
                    <div>
                      <span className="text-sm">{a.edicion.taller.nombre}</span>
                      {a.rol && <span className="text-xs text-muted-foreground ml-1">· {a.rol}</span>}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{formatFecha(a.edicion.fecha)}</span>
                  </div>
                ))}
              </Section>

              {/* Temas expuestos */}
              <Section icon={Mic2} title="Temas expuestos" count={perfil.temasMesExpuestos?.length ?? 0}>
                {perfil.temasMesExpuestos.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2">
                    <div>
                      <span className="text-sm">{t.titulo ?? t.edicion.taller.nombre}</span>
                      {t.titulo && <p className="text-xs text-muted-foreground">{t.edicion.taller.nombre}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                      {MESES[t.mes]} {t.anio}
                    </span>
                  </div>
                ))}
              </Section>

              {/* Servicios asignados */}
              <Section icon={Wrench} title="Servicios asignados" count={perfil.serviciosAsignados?.length ?? 0}>
                {perfil.serviciosAsignados.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2">
                    <div>
                      <span className="text-sm">{s.servicioActividad.catalogoServicio.nombre}</span>
                      {s.servicioActividad.actividad && (
                        <p className="text-xs text-muted-foreground">{s.servicioActividad.actividad.nombre}</p>
                      )}
                    </div>
                    <Badge variant={s.confirmado ? 'success' : 'secondary'}>
                      {s.confirmado ? 'Confirmado' : 'Pendiente'}
                    </Badge>
                  </div>
                ))}
              </Section>

            </div>
          )}
        </div>
      </div>
    </div>
  )
}
