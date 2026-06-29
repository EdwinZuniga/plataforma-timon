import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '@/stores/useAuthStore'
import { createActividad, updateActividad } from '@/api/actividades'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { X } from 'lucide-react'

const TIPOS = ['RETIRO', 'ASAMBLEA', 'ENCUENTRO', 'MISION', 'FORMACION', 'OTRO']
const TIPO_LABEL = { RETIRO: 'Retiro', ASAMBLEA: 'Asamblea', ENCUENTRO: 'Encuentro', MISION: 'Misión', FORMACION: 'Formación', OTRO: 'Otro' }

export function ActividadModal({ onClose, onSaved, actividad }) {
  const { equipoActual } = useAuthStore()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: actividad ? { ...actividad, fecha: actividad.fecha?.slice(0, 10) } : {},
  })

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      if (actividad?.id) {
        await updateActividad(equipoActual.id, actividad.id, data)
      } else {
        await createActividad(equipoActual.id, data)
      }
      toast({ title: actividad ? 'Actividad actualizada' : 'Actividad creada' })
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
          <h2 className="font-semibold text-lg">{actividad ? 'Editar actividad' : 'Nueva actividad'}</h2>
          <button onClick={onClose} className="min-h-0 h-auto p-1 text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Nombre *</label>
            <Input {...register('nombre', { required: 'Requerido' })} placeholder="Nombre de la actividad" />
            {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Tipo *</label>
              <select className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register('tipo', { required: 'Requerido' })}>
                <option value="">Seleccionar...</option>
                {TIPOS.map((t) => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
              </select>
              {errors.tipo && <p className="text-xs text-destructive">{errors.tipo.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Fecha *</label>
              <Input type="date" {...register('fecha', { required: 'Requerido' })} />
              {errors.fecha && <p className="text-xs text-destructive">{errors.fecha.message}</p>}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Lugar</label>
            <Input {...register('lugar')} placeholder="Lugar del evento" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Descripción</label>
            <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" {...register('descripcion')} placeholder="Descripción breve" />
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
