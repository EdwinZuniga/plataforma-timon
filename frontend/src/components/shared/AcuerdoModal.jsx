import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Check, X } from 'lucide-react'
import { useConfirmarSalida } from '@/hooks/useConfirmarSalida'

// Alta y edición de un acuerdo. `acuerdo` (opcional) precarga los valores.
export function AcuerdoModal({ acuerdo, miembros, pending, onSubmit, onClose }) {
  const [descripcion, setDescripcion] = useState(acuerdo?.descripcion ?? '')
  const [fechaLimite, setFechaLimite] = useState(acuerdo?.fechaLimite?.slice(0, 10) ?? '')
  const [responsableIds, setResponsableIds] = useState(acuerdo?.responsables?.map((r) => r.miembroId) ?? [])
  const [error, setError] = useState('')
  const inicial = useRef(JSON.stringify([descripcion, fechaLimite, responsableIds]))

  const toggle = (id) =>
    setResponsableIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const submit = (e) => {
    e.preventDefault()
    if (!descripcion.trim()) return setError('Requerido')
    onSubmit({ descripcion: descripcion.trim(), fechaLimite: fechaLimite || null, responsableIds })
  }

  const { cerrar, dialogo } = useConfirmarSalida(onClose, JSON.stringify([descripcion, fechaLimite, responsableIds]) !== inicial.current)

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
      {dialogo}
      <div className="bg-card rounded-t-2xl md:rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-lg">{acuerdo ? 'Editar acuerdo' : 'Nuevo acuerdo'}</h2>
          <button type="button" onClick={cerrar} className="min-h-0 h-auto p-1 text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="p-4 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Descripción *</label>
            <Input value={descripcion} onChange={(e) => { setDescripcion(e.target.value); setError('') }} placeholder="Descripción del acuerdo" />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Responsables</label>
              {responsableIds.length > 0 && (
                <span className="text-xs text-primary-700 dark:text-primary-400 font-medium">{responsableIds.length} seleccionados</span>
              )}
            </div>
            <div className="border rounded-md divide-y max-h-40 overflow-y-auto">
              {miembros.map((m) => {
                const selected = responsableIds.includes(m.id)
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggle(m.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-muted/50 ${selected ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}
                  >
                    <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${selected ? 'border-primary-700 bg-primary-700' : 'border-input'}`}>
                      {selected && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-sm">{m.usuario?.nombre}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Fecha límite</label>
            <DatePicker clearable value={fechaLimite} onChange={setFechaLimite} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={cerrar}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={pending}>{pending ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
