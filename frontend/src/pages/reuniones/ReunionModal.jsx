import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { createReunion } from '@/api/reuniones'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { X } from 'lucide-react'

export function ReunionModal({ onClose, onSaved }) {
  const { equipoActual } = useAuthStore()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const res = await createReunion(equipoActual.id, data)
      toast({ title: 'Reunión creada' })
      navigate(`/reuniones/${res.data.data.id}`)
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Ocurrió un error', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
      <div className="bg-card rounded-t-2xl md:rounded-xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-lg">Nueva reunión</h2>
          <button onClick={onClose} className="min-h-0 h-auto p-1 text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Título *</label>
            <Input {...register('titulo', { required: 'Requerido' })} placeholder="Ej: Reunión mensual de coordinación" />
            {errors.titulo && <p className="text-xs text-destructive">{errors.titulo.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Fecha *</label>
              <Input type="date" {...register('fecha', { required: 'Requerido' })} />
              {errors.fecha && <p className="text-xs text-destructive">{errors.fecha.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Lugar</label>
              <Input {...register('lugar')} placeholder="Lugar de la reunión" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Participantes</label>
            <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" {...register('participantes')} placeholder="Lista de participantes separados por coma" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={loading}>{loading ? 'Creando...' : 'Crear y editar'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
