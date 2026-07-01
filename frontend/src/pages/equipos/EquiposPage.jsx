import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '@/stores/useAuthStore'
import { getMiembros, addMiembro, updateMiembro, removeMiembro } from '@/api/equipos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageSpinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { Plus, Trash2, X, Pencil } from 'lucide-react'

const ROLES = ['COORDINADOR', 'MIEMBRO', 'SECRETARIO', 'CONSULTOR']
const ROL_LABEL = { COORDINADOR: 'Coordinador', MIEMBRO: 'Miembro', SECRETARIO: 'Secretario', CONSULTOR: 'Consultor' }
const ROL_BADGE = { COORDINADOR: 'default', MIEMBRO: 'success', SECRETARIO: 'warning', CONSULTOR: 'secondary' }

function EditMiembroModal({ miembro, onClose, onSave, loading }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      nombre: miembro.usuario.nombre,
      email: miembro.usuario.email,
      rol: miembro.rol,
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
      <div className="bg-card rounded-t-2xl md:rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-lg">Editar miembro</h2>
          <button onClick={onClose} className="min-h-0 h-auto p-1 text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit(onSave)} className="p-4 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Nombre completo</label>
            <Input {...register('nombre', { required: 'Requerido' })} />
            {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Correo electrónico</label>
            <Input type="email" {...register('email', { required: 'Requerido' })} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Rol</label>
            <select
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...register('rol')}
            >
              {ROLES.map((r) => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
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
  const [inviteLoading, setInviteLoading] = useState(false)
  const { register, handleSubmit, reset } = useForm()

  const { data: miembros, isLoading } = useQuery({
    queryKey: ['miembros', equipoActual?.id],
    queryFn: () => getMiembros(equipoActual.id).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

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

      {isLoading ? <PageSpinner /> : (
        <div className="space-y-2">
          {miembros?.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex items-center gap-3 py-3 px-4">
                <div className="h-9 w-9 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-sm font-bold text-primary-700 shrink-0">
                  {m.usuario.nombre[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{m.usuario.nombre}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.usuario.email}</p>
                </div>
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
                  {canEdit && (
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

      {editTarget && (
        <EditMiembroModal
          miembro={editTarget}
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
