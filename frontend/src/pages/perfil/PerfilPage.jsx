import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/useAuthStore'
import { cambiarContrasena } from '@/api/auth'
import { getMiPerfil } from '@/api/equipos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageSpinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import {
  KeyRound, Eye, EyeOff, MapPin, BookOpen, Users,
  Mic2, Wrench, ClipboardList, Users2, Wallet, ChevronDown, ChevronUp, ChevronRight,
} from 'lucide-react'

const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const ROL_LABEL = { COORDINADOR: 'Coordinador', MIEMBRO: 'Miembro', SECRETARIO: 'Secretario', CONSULTOR: 'Consultor', ENLACE: 'Enlace' }
const ROL_BADGE = { COORDINADOR: 'default', MIEMBRO: 'success', SECRETARIO: 'warning', CONSULTOR: 'secondary', ENLACE: 'outline' }
const ESTADO_BADGE = { ACTIVA: 'success', PROCESO_INSCRIPCION: 'warning', INACTIVA: 'secondary' }
const ESTADO_LABEL = { ACTIVA: 'Activa', PROCESO_INSCRIPCION: 'En proceso', INACTIVA: 'Inactiva' }

function formatFecha(fecha) {
  if (!fecha) return ''
  return new Date(fecha).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatMonto(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0)
}

function PasswordInput({ show, onToggle, ...inputProps }) {
  return (
    <div className="relative">
      <Input type={show ? 'text' : 'password'} className="pr-10" {...inputProps} />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

function Section({ icon: Icon, title, count, badge, badgeVariant = 'secondary', defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  if (count === 0) return null
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-accent/50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-semibold">{title}</span>
          <Badge variant={badgeVariant} className="text-xs">{badge ?? count}</Badge>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pb-3 pt-1 space-y-2 border-t bg-muted/20">{children}</div>}
    </div>
  )
}

function Row({ left, sub, right, rightVariant, to }) {
  const inner = (
    <>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{left}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {right != null && (
          typeof right === 'string'
            ? <Badge variant={rightVariant ?? 'secondary'}>{right}</Badge>
            : <span className="text-xs text-muted-foreground whitespace-nowrap">{right}</span>
        )}
        {to && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
      </div>
    </>
  )
  const cls = 'flex items-start justify-between gap-2 rounded-md bg-card px-3 py-2 shadow-sm'
  return to
    ? <Link to={to} className={`${cls} hover:bg-accent transition-colors`}>{inner}</Link>
    : <div className={cls}>{inner}</div>
}

function ResumenResponsabilidades({ equipoId }) {
  const { data: perfil, isLoading } = useQuery({
    queryKey: ['mi-perfil', equipoId],
    queryFn: () => getMiPerfil(equipoId).then((r) => r.data.data),
    enabled: !!equipoId,
  })

  if (isLoading) return <PageSpinner />

  if (!perfil) return null

  const tieneComunidades = perfil.comunidades?.length > 0
  const tieneCoordinacion = perfil.edicionesCoordinadas?.length > 0
  const tieneApoyo = perfil.equipoApoyoEdiciones?.length > 0
  const tieneTemas = perfil.temasMesExpuestos?.length > 0
  const tieneServicios = perfil.serviciosAsignados?.length > 0
  const tieneAcuerdos = perfil.acuerdosPendientes?.length > 0
  const tieneComisiones = perfil.comisionesDelMiembro?.length > 0
  const tieneOfrenda = perfil.ofrenda?.total > 0

  const tieneAlgo = tieneComunidades || tieneCoordinacion || tieneApoyo || tieneTemas ||
    tieneServicios || tieneAcuerdos || tieneComisiones || tieneOfrenda

  if (!tieneAlgo) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No tienes responsabilidades asignadas en este equipo aún.
      </p>
    )
  }

  return (
    <div className="space-y-2">

      {/* Acuerdos pendientes — primero porque son urgentes */}
      {tieneAcuerdos && (
        <Section
          icon={ClipboardList}
          title="Acuerdos pendientes"
          count={perfil.acuerdosPendientes.length}
          badgeVariant="warning"
          defaultOpen
        >
          {perfil.acuerdosPendientes.map((a) => (
            <Row
              key={a.id}
              left={a.descripcion}
              sub={`${a.reunion.titulo} · ${formatFecha(a.reunion.fecha)}`}
              right={a.fechaLimite ? formatFecha(a.fechaLimite) : undefined}
              to={`/reuniones/${a.reunion.id}`}
            />
          ))}
        </Section>
      )}

      {/* Comunidades como enlace */}
      {tieneComunidades && (
        <Section icon={MapPin} title="Comunidades como enlace" count={perfil.comunidades.length}>
          {perfil.comunidades.map((c) => (
            <Row
              key={c.id}
              left={`${c.nombre}${c.numero ? ` #${c.numero}` : ''}`}
              sub={c.departamento}
              right={ESTADO_LABEL[c.estado]}
              rightVariant={ESTADO_BADGE[c.estado]}
              to={`/comunidades/${c.id}`}
            />
          ))}
        </Section>
      )}

      {/* Talleres coordinados */}
      {tieneCoordinacion && (
        <Section icon={BookOpen} title="Talleres coordinados" count={perfil.edicionesCoordinadas.length}>
          {perfil.edicionesCoordinadas.map((e) => (
            <Row key={e.id} left={e.taller.nombre} right={formatFecha(e.fecha)} to={`/talleres/${e.tallerId}/ediciones/${e.id}`} />
          ))}
        </Section>
      )}

      {/* Apoyo en talleres */}
      {tieneApoyo && (
        <Section icon={Users} title="Apoyo en talleres" count={perfil.equipoApoyoEdiciones.length}>
          {perfil.equipoApoyoEdiciones.map((a) => (
            <Row
              key={a.id}
              left={a.edicion.taller.nombre}
              sub={a.rol || undefined}
              right={formatFecha(a.edicion.fecha)}
              to={`/talleres/${a.edicion.tallerId}/ediciones/${a.edicion.id}`}
            />
          ))}
        </Section>
      )}

      {/* Temas expuestos */}
      {tieneTemas && (
        <Section icon={Mic2} title="Temas expuestos" count={perfil.temasMesExpuestos.length}>
          {perfil.temasMesExpuestos.map((t) => (
            <Row
              key={t.id}
              left={t.titulo ?? t.edicion.taller.nombre}
              sub={t.titulo ? t.edicion.taller.nombre : undefined}
              right={`${MESES[t.mes]} ${t.anio}`}
              to={`/talleres/${t.edicion.tallerId}/ediciones/${t.edicion.id}`}
            />
          ))}
        </Section>
      )}

      {/* Comisiones */}
      {tieneComisiones && (
        <Section icon={Users2} title="Comisiones asignadas" count={perfil.comisionesDelMiembro.length}>
          {perfil.comisionesDelMiembro.map((c, i) => (
            <Row
              key={i}
              left={c.comision}
              sub={`${c.reunionTitulo} · ${formatFecha(c.reunionFecha)}`}
              to={`/reuniones/${c.reunionId}`}
            />
          ))}
        </Section>
      )}

      {/* Servicios asignados */}
      {tieneServicios && (
        <Section icon={Wrench} title="Servicios asignados" count={perfil.serviciosAsignados.length}>
          {perfil.serviciosAsignados.map((s) => (
            <Row
              key={s.id}
              left={s.servicioActividad.catalogoServicio.nombre}
              sub={s.servicioActividad.actividad?.nombre}
              right={s.confirmado ? 'Confirmado' : 'Pendiente'}
              rightVariant={s.confirmado ? 'success' : 'secondary'}
              to={s.servicioActividad.actividadId ? `/actividades/${s.servicioActividad.actividadId}` : undefined}
            />
          ))}
        </Section>
      )}

      {/* Ofrenda */}
      {tieneOfrenda && (
        <Section
          icon={Wallet}
          title="Ofrenda entregada"
          count={perfil.ofrenda.entregas}
          badge={formatMonto(perfil.ofrenda.total)}
          badgeVariant="success"
        >
          {perfil.ofrenda.porAnio.map((o) => (
            <Row key={o.anio} left={String(o.anio)} right={formatMonto(o.total)} />
          ))}
        </Section>
      )}

    </div>
  )
}

export default function PerfilPage() {
  const { usuario, equipoActual } = useAuthStore()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [show, setShow] = useState({ actual: false, nueva: false, confirmar: false })
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm()

  const toggle = (field) => setShow((s) => ({ ...s, [field]: !s[field] }))

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await cambiarContrasena(data.contrasenaActual, data.contrasenaNueva)
      toast({ title: 'Contraseña actualizada correctamente' })
      reset()
    } catch (err) {
      toast({
        title: 'Error',
        description: err.response?.data?.error || 'Ocurrió un error',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const iniciales = usuario?.nombre?.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Mi perfil</h1>
        <p className="text-sm text-muted-foreground">Resumen de tu cuenta y responsabilidades</p>
      </div>

      {/* Tarjeta de identidad */}
      <Card>
        <CardContent className="flex items-center gap-4 py-4 px-4">
          <div className="h-14 w-14 rounded-full bg-primary-700 text-white flex items-center justify-center text-xl font-bold shrink-0">
            {iniciales}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-base truncate">{usuario?.nombre}</p>
            <p className="text-sm text-muted-foreground truncate">{usuario?.email}</p>
            {equipoActual && (
              <p className="text-xs text-muted-foreground mt-0.5">Equipo: {equipoActual.nombre}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Responsabilidades */}
      <div>
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          Mis responsabilidades
        </h2>
        {equipoActual?.id
          ? <ResumenResponsabilidades equipoId={equipoActual.id} />
          : <p className="text-sm text-muted-foreground">Selecciona un equipo para ver tus responsabilidades.</p>
        }
      </div>

      {/* Cambiar contraseña */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold">Cambiar contraseña</h2>
        </div>
        <Card>
          <CardContent className="py-4 px-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Contraseña actual</label>
                <PasswordInput
                  show={show.actual}
                  onToggle={() => toggle('actual')}
                  placeholder="Tu contraseña actual"
                  {...register('contrasenaActual', { required: 'Requerida' })}
                />
                {errors.contrasenaActual && (
                  <p className="text-xs text-destructive">{errors.contrasenaActual.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Nueva contraseña</label>
                <PasswordInput
                  show={show.nueva}
                  onToggle={() => toggle('nueva')}
                  placeholder="Mínimo 6 caracteres"
                  {...register('contrasenaNueva', {
                    required: 'Requerida',
                    minLength: { value: 6, message: 'Mínimo 6 caracteres' },
                  })}
                />
                {errors.contrasenaNueva && (
                  <p className="text-xs text-destructive">{errors.contrasenaNueva.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Confirmar nueva contraseña</label>
                <PasswordInput
                  show={show.confirmar}
                  onToggle={() => toggle('confirmar')}
                  placeholder="Repite la nueva contraseña"
                  {...register('confirmar', {
                    required: 'Requerida',
                    validate: (v) => v === watch('contrasenaNueva') || 'Las contraseñas no coinciden',
                  })}
                />
                {errors.confirmar && (
                  <p className="text-xs text-destructive">{errors.confirmar.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Guardando...' : 'Actualizar contraseña'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
