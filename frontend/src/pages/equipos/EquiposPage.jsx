import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { useAuthStore } from '@/stores/useAuthStore'
import { getMiembros, addMiembro, updateMiembro, removeMiembro } from '@/api/equipos'
import { getComunidades } from '@/api/comunidades'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Combobox } from '@/components/ui/combobox'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageSpinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { toInputDate } from '@/utils/dates'
import { Plus, Trash2, X, Pencil } from 'lucide-react'
import MiembroPerfilModal from './MiembroPerfilModal'

const ROLES = ['COORDINADOR', 'MIEMBRO', 'SECRETARIO', 'CONSULTOR']
const ROL_LABEL = { COORDINADOR: 'Coordinador', MIEMBRO: 'Miembro', SECRETARIO: 'Secretario', CONSULTOR: 'Consultor' }
const ROL_BADGE = { COORDINADOR: 'default', MIEMBRO: 'success', SECRETARIO: 'warning', CONSULTOR: 'secondary' }

const selectCls = 'flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'

function EditMiembroModal({ miembro, comunidades, onClose, onSave, loading }) {
  const comunidadOpts = useMemo(() => [
    { value: '', label: '— Sin asignar —' },
    ...comunidades.map((c) => ({ value: c.id, label: c.nombre, sublabel: c.numero ? `#${c.numero}` : undefined })),
  ], [comunidades])

  const { register, control, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      nombre: miembro.usuario.nombre,
      email: miembro.usuario.email,
      rol: miembro.rol,
      activo: String(miembro.activo),
      nombreCompleto: miembro.nombreCompleto ?? '',
      telefono: miembro.telefono ?? '',
      direccion: miembro.direccion ?? '',
      profesion: miembro.profesion ?? '',
      comunidadOrigenId: miembro.comunidadOrigenId ?? '',
      fechaNacimiento: toInputDate(miembro.fechaNacimiento),
      ingresoETJ: toInputDate(miembro.ingresoETJ),
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
      <div className="bg-card rounded-t-2xl md:rounded-xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h2 className="font-semibold text-lg">Editar miembro</h2>
          <button onClick={onClose} className="min-h-0 h-auto p-1 text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit(onSave)} className="p-4 space-y-4 overflow-y-auto">
          <div className="space-y-1">
            <label className="text-sm font-medium">Nombre (mostrado)</label>
            <Input {...register('nombre', { required: 'Requerido' })} />
            {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Nombre completo</label>
            <Input {...register('nombreCompleto')} placeholder="Nombre y apellidos" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Correo electrónico</label>
            <Input type="email" {...register('email', { required: 'Requerido' })} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Teléfono</label>
              <Input {...register('telefono')} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Profesión</label>
              <Input {...register('profesion')} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Dirección</label>
            <Input {...register('direccion')} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Comunidad de origen</label>
            <Controller
              control={control}
              name="comunidadOrigenId"
              render={({ field }) => (
                <Combobox
                  options={comunidadOpts}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder="— Sin asignar —"
                  searchPlaceholder="Buscar comunidad..."
                  emptyLabel="Sin coincidencias"
                />
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Fecha de nacimiento</label>
              <Controller
                control={control}
                name="fechaNacimiento"
                render={({ field }) => (
                  <DatePicker value={field.value || ''} onChange={field.onChange} clearable />
                )}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Ingreso al ETJ</label>
              <Controller
                control={control}
                name="ingresoETJ"
                render={({ field }) => (
                  <DatePicker value={field.value || ''} onChange={field.onChange} clearable />
                )}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Rol</label>
              <select className={selectCls} {...register('rol')}>
                {ROLES.map((r) => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Estado</label>
              <select className={selectCls} {...register('activo', { setValueAs: (v) => v === 'true' })}>
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={loading}>{loading ? 'Guardando...' : 'Guardar cambios'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function EquiposPage() {
  const { equipoActual, usuario } = useAuthStore()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [perfilTarget, setPerfilTarget] = useState(null)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('activos') // activos | inactivos | todos
  const { register, handleSubmit, reset } = useForm()

  const { data: miembros, isLoading } = useQuery({
    queryKey: ['miembros', equipoActual?.id],
    queryFn: () => getMiembros(equipoActual.id).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

  const { data: comunidades = [] } = useQuery({
    queryKey: ['comunidades-todas', equipoActual?.id],
    queryFn: () => getComunidades(equipoActual.id, { limit: 500 }).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

  const activos = miembros?.filter((m) => m.activo).length ?? 0
  const inactivos = (miembros?.length ?? 0) - activos
  const miembrosVisibles = useMemo(() => {
    if (!miembros) return []
    if (filtroEstado === 'activos') return miembros.filter((m) => m.activo)
    if (filtroEstado === 'inactivos') return miembros.filter((m) => !m.activo)
    return miembros
  }, [miembros, filtroEstado])

  // Determina si el usuario actual puede editar: coordinador del equipo o superAdmin
  const miActual = miembros?.find((m) => m.usuario.email === usuario?.email)
  const canEdit = usuario?.superAdmin || miActual?.rol === 'COORDINADOR'

  const { mutate: remove } = useMutation({
    mutationFn: (miembroId) => removeMiembro(equipoActual.id, miembroId),
    onSuccess: () => { toast({ title: 'Miembro desactivado' }); qc.invalidateQueries({ queryKey: ['miembros'] }) },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, variant: 'destructive' }),
  })

  const { mutate: saveEdit, isPending: editLoading } = useMutation({
    mutationFn: ({ miembroId, data }) => updateMiembro(equipoActual.id, miembroId, data),
    onSuccess: () => {
      toast({ title: 'Miembro actualizado' })
      qc.invalidateQueries({ queryKey: ['miembros'] })
      setEditTarget(null)
    },
    onError: (err) => toast({ title: 'Error al actualizar', description: err.response?.data?.error, variant: 'destructive' }),
  })

  const onSubmitInvite = async (data) => {
    setInviteLoading(true)
    try {
      const res = await addMiembro(equipoActual.id, data)
      const { usuarioCreado, contrasenaTemp, email } = res.data.data
      if (usuarioCreado) {
        toast({
          title: 'Miembro agregado y cuenta creada',
          description: `Se creó una cuenta para ${email}. Contraseña temporal: ${contrasenaTemp}`,
          duration: 15000,
        })
      } else {
        toast({ title: 'Miembro agregado' })
      }
      reset()
      setShowInviteModal(false)
      qc.invalidateQueries({ queryKey: ['miembros'] })
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Ocurrió un error', variant: 'destructive' })
    } finally {
      setInviteLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Equipo · {equipoActual?.nombre}</h1>
          <p className="text-sm text-muted-foreground">Gestión de miembros</p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => setShowInviteModal(true)}><Plus className="h-4 w-4" /> Invitar</Button>
        )}
      </div>

      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit text-sm">
        {[
          { key: 'activos', label: `Activos (${activos})` },
          { key: 'inactivos', label: `Inactivos (${inactivos})` },
          { key: 'todos', label: 'Todos' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setFiltroEstado(t.key)}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              filtroEstado === t.key ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? <PageSpinner /> : miembrosVisibles.length === 0 ? (
        <p className="text-center py-10 text-muted-foreground">
          {filtroEstado === 'inactivos' ? 'No hay miembros inactivos' : 'Sin miembros'}
        </p>
      ) : (
        <div className="space-y-2">
          {miembrosVisibles.map((m) => (
            <Card key={m.id} className={m.activo ? undefined : 'opacity-70'}>
              <CardContent className="flex items-center gap-3 py-3 px-4">
                <button
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  onClick={() => setPerfilTarget(m)}
                  title="Ver perfil y responsabilidades"
                >
                  <div className="h-9 w-9 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-sm font-bold text-primary-700 dark:text-primary-500 shrink-0">
                    {m.usuario.nombre[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate hover:text-primary-700 dark:hover:text-primary-500 transition-colors">{m.usuario.nombre}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.usuario.email}</p>
                  </div>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={ROL_BADGE[m.rol]}>{ROL_LABEL[m.rol]}</Badge>
                  {!m.activo && <Badge variant="secondary">Inactivo</Badge>}
                  {canEdit && (
                    <button
                      onClick={() => setEditTarget(m)}
                      className="min-h-0 h-auto p-1 text-muted-foreground hover:text-foreground"
                      title="Editar miembro"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                  {canEdit && m.activo && (
                    <button
                      onClick={() => remove(m.id)}
                      className="min-h-0 h-auto p-1 text-muted-foreground hover:text-destructive"
                      title="Desactivar miembro"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {perfilTarget && (
        <MiembroPerfilModal
          miembro={perfilTarget}
          onClose={() => setPerfilTarget(null)}
        />
      )}

      {editTarget && (
        <EditMiembroModal
          miembro={editTarget}
          comunidades={comunidades}
          loading={editLoading}
          onClose={() => setEditTarget(null)}
          onSave={(data) => saveEdit({ miembroId: editTarget.id, data })}
        />
      )}

      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
          <div className="bg-card rounded-t-2xl md:rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold text-lg">Invitar miembro</h2>
              <button onClick={() => setShowInviteModal(false)} className="min-h-0 h-auto p-1 text-muted-foreground"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmitInvite)} className="p-4 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Email del usuario *</label>
                <Input type="email" {...register('email', { required: true })} placeholder="correo@renovacion.org" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Nombre completo <span className="text-muted-foreground text-xs">(requerido si es usuario nuevo)</span></label>
                <Input {...register('nombre')} placeholder="Ej: Juan Pérez" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Rol</label>
                <select className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register('rol')}>
                  {ROLES.map((r) => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Nombre corto (enlace)</label>
                <Input {...register('nombreCorto')} placeholder="Ej: ZUNIGA" />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowInviteModal(false)}>Cancelar</Button>
                <Button type="submit" className="flex-1" disabled={inviteLoading}>{inviteLoading ? 'Agregando...' : 'Agregar'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
