import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/useAuthStore'
import { createReunion } from '@/api/reuniones'
import { getMiembros } from '@/api/equipos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { X, Check } from 'lucide-react'

export function ReunionModal({ onClose, onSaved }) {
  const { equipoActual } = useAuthStore()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [selectedMiembros, setSelectedMiembros] = useState([])

  const { register, handleSubmit, formState: { errors } } = useForm()

  const { data: miembros = [] } = useQuery({
    queryKey: ['miembros', equipoActual?.id],
    queryFn: () => getMiembros(equipoActual.id).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

  const activosSorted = miembros
    .filter((m) => m.activo)
    .sort((a, b) => (a.usuario?.nombre || '').localeCompare(b.usuario?.nombre || ''))

  const toggleMiembro = (miembroId) => {
    setSelectedMiembros((prev) =>
      prev.includes(miembroId) ? prev.filter((id) => id !== miembroId) : [...prev, miembroId]
    )
  }

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const res = await createReunion(equipoActual.id, { ...data, asistenteIds: selectedMiembros })
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
      <div className="bg-card rounded-t-2xl md:rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h2 className="font-semibold text-lg">Nueva reunión</h2>
          <button onClick={onClose} className="min-h-0 h-auto p-1 text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>

        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Título *</label>
              <Input {...register('titulo', { required: 'Requerido' })} placeholder="Ej: Reunión semanal de equipo" />
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Asistentes</label>
                {selectedMiembros.length > 0 && (
                  <span className="text-xs text-primary-700 dark:text-primary-500 font-medium">{selectedMiembros.length} seleccionados</span>
                )}
              </div>
              {activosSorted.length === 0 ? (
                <p className="text-xs text-muted-foreground">No hay miembros en el equipo.</p>
              ) : (
                <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                  {(() => {
                    const todosSeleccionados = activosSorted.length > 0 && activosSorted.every((m) => selectedMiembros.includes(m.id))
                    return (
                      <button
                        type="button"
                        onClick={() => setSelectedMiembros(todosSeleccionados ? [] : activosSorted.map((m) => m.id))}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 ${todosSeleccionados ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}
                      >
                        <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${todosSeleccionados ? 'border-primary-700 bg-primary-700' : 'border-input'}`}>
                          {todosSeleccionados && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">Seleccionar todos</p>
                      </button>
                    )
                  })()}
                  {activosSorted.map((m) => {
                    const selected = selectedMiembros.includes(m.id)
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleMiembro(m.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 ${selected ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}
                      >
                        <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${selected ? 'border-primary-700 bg-primary-700' : 'border-input'}`}>
                          {selected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{m.usuario?.nombre}</p>
                          {m.nombreCorto && <p className="text-xs text-muted-foreground">{m.nombreCorto}</p>}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{m.rol}</span>
                      </button>
                    )
                  })}
                </div>
              )}

            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
              <Button type="submit" className="flex-1" disabled={loading}>{loading ? 'Creando...' : 'Crear y editar'}</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
