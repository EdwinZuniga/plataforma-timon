import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/useAuthStore'
import { createHermano, updateHermano } from '@/api/hermanos'
import { getComunidades } from '@/api/comunidades'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { X } from 'lucide-react'

export function HermanoModal({ onClose, onSaved, hermano }) {
  const { equipoActual } = useAuthStore()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const { data: comunidadesData } = useQuery({
    queryKey: ['comunidades-select', equipoActual?.id],
    queryFn: () => getComunidades(equipoActual.id, { limit: 200 }).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: hermano || {},
  })

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      if (hermano?.id) {
        await updateHermano(equipoActual.id, hermano.id, data)
      } else {
        await createHermano(equipoActual.id, data)
      }
      toast({ title: hermano ? 'Hermano actualizado' : 'Hermano registrado' })
      onSaved()
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Ocurrió un error', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
      <div className="bg-card rounded-t-2xl md:rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-lg">{hermano ? 'Editar hermano' : 'Nuevo hermano'}</h2>
          <button onClick={onClose} className="min-h-0 h-auto p-1 text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Nombre *</label>
              <Input {...register('nombre', { required: 'Requerido' })} placeholder="Nombre" />
              {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Apellido</label>
              <Input {...register('apellido')} placeholder="Apellido" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Teléfono</label>
              <Input {...register('telefono')} placeholder="+503 0000-0000" type="tel" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <Input {...register('email')} placeholder="correo@ejemplo.com" type="email" />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-sm font-medium">Comunidad *</label>
              <select
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...register('comunidadId', { required: 'Requerido', valueAsNumber: true })}
              >
                <option value="">Seleccionar comunidad...</option>
                {comunidadesData?.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre} — {c.departamento}</option>
                ))}
              </select>
              {errors.comunidadId && <p className="text-xs text-destructive">{errors.comunidadId.message}</p>}
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-sm font-medium">Notas</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                {...register('notas')}
                placeholder="Observaciones"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
