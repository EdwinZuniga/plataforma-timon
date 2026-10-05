import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/useAuthStore'
import { createHermano, updateHermano } from '@/api/hermanos'
import { getComunidades } from '@/api/comunidades'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import { useToast } from '@/components/ui/toast'
import { X, AlertTriangle } from 'lucide-react'
import { useConfirmarSalida } from '@/hooks/useConfirmarSalida'

export function HermanoModal({ onClose, onSaved, hermano, comunidadId }) {
  const { equipoActual } = useAuthStore()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [conflicto, setConflicto] = useState(null)

  const { data: comunidadesData } = useQuery({
    queryKey: ['comunidades-select', equipoActual?.id],
    queryFn: () => getComunidades(equipoActual.id, { limit: 500 }).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

  const { register, handleSubmit, control, formState: { errors, isDirty } } = useForm({
    defaultValues: hermano || (comunidadId ? { comunidadId } : {}),
  })

  const comunidadOptions = useMemo(
    () => (comunidadesData || []).map((c) => ({ value: c.id, label: c.nombre, sublabel: c.departamento })),
    [comunidadesData]
  )

  const guardar = async (data, forzarNuevo = false) => {
    setLoading(true)
    try {
      const body = forzarNuevo ? { ...data, forzarNuevo: true } : data
      if (hermano?.id) {
        await updateHermano(equipoActual.id, hermano.id, body)
      } else {
        await createHermano(equipoActual.id, body)
      }
      toast({ title: hermano ? 'Hermano actualizado' : 'Hermano registrado' })
      onSaved()
    } catch (err) {
      const r = err.response?.data
      if (err.response?.status === 409 && r?.detalle) {
        setConflicto({ tipo: r.code, existente: r.detalle, data })
      } else {
        toast({ title: 'Error', description: r?.error || 'Ocurrió un error', variant: 'destructive' })
      }
    } finally {
      setLoading(false)
    }
  }
  const onSubmit = (data) => guardar(data)

  // Ir a la ficha del hermano que ya existe; si estaba inactivo se reactiva primero.
  const irAFicha = async (reactivar) => {
    const { existente } = conflicto
    try {
      if (reactivar) await updateHermano(equipoActual.id, existente.id, { activo: true })
    } catch (err) {
      return toast({ title: 'Error', description: err.response?.data?.error || 'No se pudo reactivar', variant: 'destructive' })
    }
    onClose()
    navigate(`/hermanos/${existente.id}`)
  }

  const { cerrar, dialogo } = useConfirmarSalida(onClose, isDirty)

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
      {dialogo}
      {conflicto && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/50">
          <div className="bg-card rounded-t-2xl md:rounded-xl w-full max-w-sm shadow-xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5 h-9 w-9 rounded-full bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-base">
                  {conflicto.tipo === 'HERMANO_DUPLICADO' ? 'Este hermano ya está registrado' : 'Se parece a un hermano ya registrado'}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  <span className="font-medium text-foreground">{conflicto.existente.nombre} {conflicto.existente.apellido}</span> ya existe en esta comunidad
                  {!conflicto.existente.activo && ' y está inactivo/a'}.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {conflicto.existente.activo === false
                ? <Button onClick={() => irAFicha(true)}>Reactivar y ver su ficha</Button>
                : <Button onClick={() => irAFicha(false)}>{conflicto.tipo === 'HERMANO_PARECIDO' ? 'Es la misma persona: ver su ficha' : 'Ver su ficha'}</Button>}
              {conflicto.tipo === 'HERMANO_PARECIDO' && (
                <Button variant="outline" disabled={loading} onClick={() => { const d = conflicto.data; setConflicto(null); guardar(d, true) }}>
                  Es otra persona: {hermano ? 'guardar' : 'registrar'} igual
                </Button>
              )}
              <Button variant="ghost" onClick={() => setConflicto(null)}>Volver y corregir</Button>
            </div>
          </div>
        </div>
      )}
      <div className="bg-card rounded-t-2xl md:rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-lg">{hermano ? 'Editar hermano' : 'Nuevo hermano'}</h2>
          <button onClick={cerrar} className="min-h-0 h-auto p-1 text-muted-foreground"><X className="h-5 w-5" /></button>
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
              <Controller
                name="comunidadId"
                control={control}
                rules={{ required: 'Requerido' }}
                render={({ field }) => (
                  <Combobox
                    options={comunidadOptions}
                    value={field.value}
                    onChange={(v) => field.onChange(Number(v))}
                    placeholder="Seleccionar comunidad..."
                    searchPlaceholder="Buscar comunidad o departamento..."
                    emptyLabel="No se encontraron comunidades"
                  />
                )}
              />
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
            <Button type="button" variant="outline" className="flex-1" onClick={cerrar}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
