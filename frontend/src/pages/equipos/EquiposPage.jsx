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
import { Plus, Settings, Trash2, X } from 'lucide-react'

const ROLES = ['COORDINADOR', 'MIEMBRO', 'SECRETARIO', 'CONSULTOR']
const ROL_LABEL = { COORDINADOR: 'Coordinador', MIEMBRO: 'Miembro', SECRETARIO: 'Secretario', CONSULTOR: 'Consultor' }
const ROL_BADGE = { COORDINADOR: 'default', MIEMBRO: 'success', SECRETARIO: 'warning', CONSULTOR: 'secondary' }

export default function EquiposPage() {
  const { equipoActual, membresia } = useAuthStore()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, reset } = useForm()

  const { data: miembros, isLoading } = useQuery({
    queryKey: ['miembros', equipoActual?.id],
    queryFn: () => getMiembros(equipoActual.id).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

  const { mutate: remove } = useMutation({
    mutationFn: (miembroId) => removeMiembro(equipoActual.id, miembroId),
    onSuccess: () => { toast({ title: 'Miembro desactivado' }); qc.invalidateQueries({ queryKey: ['miembros'] }) },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, variant: 'destructive' }),
  })

  const onSubmit = async (data) => {
    setLoading(true)
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
      setShowModal(false)
      qc.invalidateQueries({ queryKey: ['miembros'] })
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Ocurrió un error', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Equipo · {equipoActual?.nombre}</h1>
          <p className="text-sm text-muted-foreground">Gestión de miembros</p>
        </div>
        <Button size="sm" onClick={() => setShowModal(true)}><Plus className="h-4 w-4" /> Invitar</Button>
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
                  <button onClick={() => remove(m.id)} className="min-h-0 h-auto p-1 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
          <div className="bg-card rounded-t-2xl md:rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold text-lg">Invitar miembro</h2>
              <button onClick={() => setShowModal(false)} className="min-h-0 h-auto p-1 text-muted-foreground"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
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
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Cancelar</Button>
                <Button type="submit" className="flex-1" disabled={loading}>{loading ? 'Agregando...' : 'Agregar'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
