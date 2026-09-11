import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/useAuthStore'
import { getTalleresParaInscripcion, inscribirHermanos } from '@/api/talleres'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { X, BookOpen } from 'lucide-react'
import { formatCalendarDate } from '@/utils/dates'

const fmt = (d) => formatCalendarDate(d, { year: 'numeric', month: 'numeric', day: 'numeric' })

const labelEdicion = (edicion) => {
  const inicio = fmt(edicion.fecha)
  const fin = edicion.fechaFin ? ` → ${fmt(edicion.fechaFin)}` : ' (en curso)'
  const lugar = edicion.lugar ? ` · ${edicion.lugar}` : ''
  return `${inicio}${fin}${lugar}`
}

const hoyISO = new Date().toISOString().slice(0, 10)
const edicionFinalizada = (e) => !!e.fechaFin && new Date(e.fechaFin).toISOString().slice(0, 10) < hoyISO

export function VincularTallerModal({ hermanoId, inscripcionesActuales = [], onClose, onSaved }) {
  const { equipoActual } = useAuthStore()
  const { toast } = useToast()
  const [tallerId, setTallerId] = useState('')
  const [edicionId, setEdicionId] = useState('')
  const [loading, setLoading] = useState(false)

  const { data: talleres = [], isLoading } = useQuery({
    queryKey: ['talleres-inscripcion', equipoActual?.id],
    queryFn: () => getTalleresParaInscripcion(equipoActual.id).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

  const tallerSeleccionado = talleres.find((t) => t.id === tallerId)

  const edicionesDisponibles = (tallerSeleccionado?.ediciones ?? []).filter(
    (e) => !edicionFinalizada(e) && !inscripcionesActuales.some((ins) => ins.edicionTallerId === e.id)
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!edicionId) return
    setLoading(true)
    try {
      await inscribirHermanos(equipoActual.id, edicionId, [hermanoId])
      toast({ title: 'Hermano vinculado al taller' })
      onSaved()
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Ocurrió un error', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
      <div className="bg-card rounded-t-2xl md:rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary-700 dark:text-primary-400" />
            <h2 className="font-semibold text-lg">Vincular a taller</h2>
          </div>
          <button onClick={onClose} className="min-h-0 h-auto p-1 text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Taller *</label>
            <select
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={tallerId}
              onChange={(e) => { setTallerId(parseInt(e.target.value) || ''); setEdicionId('') }}
              disabled={isLoading}
            >
              <option value="">Seleccionar taller...</option>
              {talleres.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>
            {talleres.length === 0 && !isLoading && (
              <p className="text-xs text-muted-foreground">No hay talleres activos disponibles.</p>
            )}
          </div>

          {tallerId && (
            <div className="space-y-1">
              <label className="text-sm font-medium">Edición *</label>
              {edicionesDisponibles.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No hay ediciones vigentes disponibles: ya está inscrito en ellas o han finalizado.
                </p>
              ) : (
                <select
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={edicionId}
                  onChange={(e) => setEdicionId(parseInt(e.target.value) || '')}
                >
                  <option value="">Seleccionar edición...</option>
                  {edicionesDisponibles.map((e) => (
                    <option key={e.id} value={e.id}>{labelEdicion(e)}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={!edicionId || loading}>
              {loading ? 'Vinculando...' : 'Vincular'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
