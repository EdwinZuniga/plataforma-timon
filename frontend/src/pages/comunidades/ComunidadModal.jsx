import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '@/stores/useAuthStore'
import { createComunidad, updateComunidad } from '@/api/comunidades'
import { getMiembros } from '@/api/equipos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { X } from 'lucide-react'

export function ComunidadModal({ onClose, onSaved, comunidad }) {
  const { equipoActual } = useAuthStore()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [miembros, setMiembros] = useState([])

  useEffect(() => {
    getMiembros(equipoActual.id)
      .then(res => setMiembros((res.data.data ?? []).filter(m => m.activo)))
      .catch(() => {})
  }, [equipoActual.id])

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: comunidad || {},
  })

  const onSubmit = async (data) => {
    setLoading(true)
    const payload = { ...data, enlaceId: data.enlaceId || null }
    try {
      if (comunidad?.id) {
        await updateComunidad(equipoActual.id, comunidad.id, payload)
      } else {
        await createComunidad(equipoActual.id, payload)
      }
      toast({ title: comunidad ? 'Comunidad actualizada' : 'Comunidad creada' })
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
          <h2 className="font-semibold text-lg">{comunidad ? 'Editar comunidad' : 'Nueva comunidad'}</h2>
          <button onClick={onClose} className="min-h-0 h-auto p-1 text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <label className="text-sm font-medium">Nombre *</label>
              <Input {...register('nombre', { required: 'Requerido' })} placeholder="Nombre de la comunidad" />
              {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Número</label>
              <Input {...register('numero')} placeholder="C-001" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Departamento *</label>
              <select className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register('departamento', { required: 'Requerido' })}>
                <option value="">Seleccionar...</option>
                <option value="San Salvador">San Salvador</option>
                <option value="Cuscatlán">Cuscatlán</option>
                <option value="La Libertad">La Libertad</option>
              </select>
              {errors.departamento && <p className="text-xs text-destructive">{errors.departamento.message}</p>}
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-sm font-medium">Estado</label>
              <select className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register('estado')}>
                <option value="ACTIVA">Activa</option>
                <option value="PROCESO_INSCRIPCION">En proceso de inscripción</option>
                <option value="INACTIVA">Inactiva</option>
              </select>
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-sm font-medium">Enlace del equipo</label>
              <select
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...register('enlaceId', { valueAsNumber: true })}
              >
                <option value="">Sin enlace asignado</option>
                {miembros.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.nombreCorto || m.usuario.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-sm font-medium">Lugar de asamblea</label>
              <Input {...register('lugarAsamblea')} placeholder="Lugar habitual de reunión" />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-sm font-medium">Enlace Consejo Asesor</label>
              <Input {...register('enlaceConsejo')} placeholder="Nombre del enlace del consejo asesor" />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-sm font-medium">Notas</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                {...register('notas')}
                placeholder="Observaciones adicionales"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
