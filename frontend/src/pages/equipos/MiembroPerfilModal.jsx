import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getMiembroPerfil } from '@/api/equipos'
import { useAuthStore } from '@/stores/useAuthStore'
import { Badge } from '@/components/ui/badge'
import { PageSpinner } from '@/components/ui/spinner'
import { formatCalendarDate } from '@/utils/dates'
import { X, Users, BookOpen, Mic2, Wrench, MapPin, ChevronRight, Coins } from 'lucide-react'

const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const ROL_LABEL = { COORDINADOR: 'Coordinador', MIEMBRO: 'Miembro', SECRETARIO: 'Secretario', CONSULTOR: 'Consultor' }
const ROL_BADGE = { COORDINADOR: 'default', MIEMBRO: 'success', SECRETARIO: 'warning', CONSULTOR: 'secondary' }

const ESTADO_LABEL = { ACTIVA: 'Activa', PROCESO_INSCRIPCION: 'En proceso', INACTIVA: 'Inactiva' }
const ESTADO_BADGE = { ACTIVA: 'success', PROCESO_INSCRIPCION: 'warning', INACTIVA: 'secondary' }

const TABS = [
  { key: 'general', label: 'General' },
  { key: 'actividad', label: 'Actividad' },
]

function formatFecha(fecha) {
  if (!fecha) return ''
  return formatCalendarDate(fecha, { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' })
}

function formatMonto(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0)
}

// Años completos entre una fecha (UTC) y hoy — para edad y años en el ETJ.
function aniosDesde(fecha) {
  if (!fecha) return null
  const d = new Date(fecha)
  const hoy = new Date()
  let n = hoy.getUTCFullYear() - d.getUTCFullYear()
  const md = hoy.getUTCMonth() - d.getUTCMonth()
  if (md < 0 || (md === 0 && hoy.getUTCDate() < d.getUTCDate())) n--
  return Math.max(n, 0)
}

function Dato({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-border/60 last:border-0">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right break-words">{children ?? '—'}</span>
    </div>
  )
}

function Section({ icon: Icon, title, count, children }) {
  if (!count) return null
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

// Fila de responsabilidad: si `to` está, es un acceso directo.
function Fila({ to, onNavigate, children }) {
  const base = 'flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2'
  if (!to) return <div className={base}>{children}</div>
  return (
    <button onClick={() => onNavigate(to)} className={`${base} w-full text-left hover:bg-muted transition-colors`}>
      {children}
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  )
}

export default function MiembroPerfilModal({ miembro, onClose }) {
  const { equipoActual } = useAuthStore()
  const navigate = useNavigate()
  const [tab, setTab] = useState('general')

  const { data: perfil, isLoading } = useQuery({
    queryKey: ['miembro-perfil', equipoActual?.id, miembro.id],
    queryFn: () => getMiembroPerfil(equipoActual.id, miembro.id).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

  const ir = (to) => { onClose(); navigate(to) }
  const tallerRuta = (tallerId, edicionId) => `/talleres/${tallerId}/ediciones/${edicionId}`

  const iniciales = miembro.usuario.nombre.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

  const totalResponsabilidades = perfil
    ? (perfil.comunidades?.length ?? 0) +
      (perfil.edicionesCoordinadas?.length ?? 0) +
      (perfil.equipoApoyoEdiciones?.length ?? 0) +
      (perfil.temasMesExpuestos?.length ?? 0) +
      (perfil.serviciosAsignados?.length ?? 0) +
      (perfil.ofrenda?.entregas ?? 0)
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
            <div className="h-12 w-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-base font-bold text-primary-700 dark:text-primary-500 shrink-0">
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

        {/* Tabs */}
        <div className="px-4 pt-3 shrink-0">
          <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === t.key ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-4">
          {isLoading ? (
            <PageSpinner />
          ) : tab === 'general' ? (
            <div className="space-y-0.5">
              <Dato label="Nombre completo">{perfil?.nombreCompleto || miembro.usuario.nombre}</Dato>
              <Dato label="Comunidad">
                {perfil?.comunidadOrigen ? (
                  <Link
                    to={`/comunidades/${perfil.comunidadOrigen.id}`}
                    onClick={onClose}
                    className="text-primary-700 dark:text-primary-500 hover:underline"
                  >
                    {perfil.comunidadOrigen.nombre}
                  </Link>
                ) : null}
              </Dato>
              <Dato label="Dirección">{perfil?.direccion}</Dato>
              <Dato label="Teléfono">{perfil?.telefono}</Dato>
              <Dato label="Correo">{miembro.usuario.email}</Dato>
              <Dato label="Edad">{perfil?.fechaNacimiento ? `${aniosDesde(perfil.fechaNacimiento)} años` : null}</Dato>
              <Dato label="Profesión">{perfil?.profesion}</Dato>
              <Dato label="Años en el ETJ">
                {perfil?.ingresoETJ
                  ? `${aniosDesde(perfil.ingresoETJ)} años · desde ${formatFecha(perfil.ingresoETJ)}`
                  : null}
              </Dato>
              <Dato label="Rol">{ROL_LABEL[miembro.rol]}</Dato>
              <Dato label="Estado">{miembro.activo ? 'Activo' : 'Inactivo'}</Dato>
            </div>
          ) : totalResponsabilidades === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Este miembro no tiene responsabilidades asignadas aún.
            </p>
          ) : (
            <div className="space-y-5">

              <Section icon={MapPin} title="Comunidades como enlace" count={perfil.comunidades?.length ?? 0}>
                {perfil.comunidades.map((c) => (
                  <Fila key={c.id} to={`/comunidades/${c.id}`} onNavigate={ir}>
                    <div className="min-w-0">
                      <span className="text-sm font-medium">{c.nombre}</span>
                      {c.numero && <span className="text-xs text-muted-foreground ml-1">#{c.numero}</span>}
                      <p className="text-xs text-muted-foreground">{c.departamento}</p>
                    </div>
                    <Badge variant={ESTADO_BADGE[c.estado]} className="shrink-0">{ESTADO_LABEL[c.estado]}</Badge>
                  </Fila>
                ))}
              </Section>

              <Section icon={BookOpen} title="Talleres coordinados" count={perfil.edicionesCoordinadas?.length ?? 0}>
                {perfil.edicionesCoordinadas.map((e) => (
                  <Fila key={e.id} to={tallerRuta(e.tallerId ?? e.taller?.id, e.id)} onNavigate={ir}>
                    <span className="text-sm min-w-0 truncate">{e.taller.nombre}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{formatFecha(e.fecha)}</span>
                  </Fila>
                ))}
              </Section>

              <Section icon={Users} title="Apoyo en talleres" count={perfil.equipoApoyoEdiciones?.length ?? 0}>
                {perfil.equipoApoyoEdiciones.map((a) => (
                  <Fila key={a.id} to={tallerRuta(a.edicion.tallerId ?? a.edicion.taller?.id, a.edicion.id)} onNavigate={ir}>
                    <div className="min-w-0">
                      <span className="text-sm">{a.edicion.taller.nombre}</span>
                      {a.rol && <span className="text-xs text-muted-foreground ml-1">· {a.rol}</span>}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{formatFecha(a.edicion.fecha)}</span>
                  </Fila>
                ))}
              </Section>

              <Section icon={Mic2} title="Temas expuestos" count={perfil.temasMesExpuestos?.length ?? 0}>
                {perfil.temasMesExpuestos.map((t) => (
                  <Fila key={t.id} to={tallerRuta(t.edicion.tallerId ?? t.edicion.taller?.id, t.edicion.id)} onNavigate={ir}>
                    <div className="min-w-0">
                      <span className="text-sm">{t.titulo ?? t.edicion.taller.nombre}</span>
                      {t.titulo && <p className="text-xs text-muted-foreground">{t.edicion.taller.nombre}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                      {MESES[t.mes]} {t.anio}
                    </span>
                  </Fila>
                ))}
              </Section>

              <Section icon={Wrench} title="Servicios asignados" count={perfil.serviciosAsignados?.length ?? 0}>
                {perfil.serviciosAsignados.map((s) => {
                  const actId = s.servicioActividad.actividad?.id
                  return (
                    <Fila key={s.id} to={actId ? `/actividades/${actId}` : null} onNavigate={ir}>
                      <div className="min-w-0">
                        <span className="text-sm">{s.servicioActividad.catalogoServicio.nombre}</span>
                        {s.servicioActividad.actividad && (
                          <p className="text-xs text-muted-foreground">{s.servicioActividad.actividad.nombre}</p>
                        )}
                      </div>
                      <Badge variant={s.confirmado ? 'success' : 'secondary'} className="shrink-0">
                        {s.confirmado ? 'Confirmado' : 'Pendiente'}
                      </Badge>
                    </Fila>
                  )
                })}
              </Section>

              {perfil.ofrenda?.entregas > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Coins className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">Ofrenda entregada</span>
                    <Badge variant="success" className="text-xs">{formatMonto(perfil.ofrenda.total)}</Badge>
                  </div>
                  <div className="space-y-1.5 pl-6">
                    {perfil.ofrenda.porAnio.map((o) => (
                      <Fila key={o.anio} to="/tesoreria" onNavigate={ir}>
                        <span className="text-sm">{o.anio}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{formatMonto(o.total)}</span>
                      </Fila>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  )
}
