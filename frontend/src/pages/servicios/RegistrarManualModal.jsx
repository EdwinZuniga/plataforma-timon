import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/useAuthStore'
import { createServicioManual, getCatalogo } from '@/api/servicios'
import { getComunidades } from '@/api/comunidades'
import { getMiembros } from '@/api/equipos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import { useToast } from '@/components/ui/toast'
import { X, Wrench, Users, Loader2 } from 'lucide-react'

const nombreMiembro = (m) => m.nombreCorto || m.usuario?.nombre || `Miembro ${m.id}`

export function RegistrarManualModal({ onClose, onSaved }) {
  const { equipoActual } = useAuthStore()
  const { toast } = useToast()
  const [guardando, setGuardando] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [miembroIdsSeleccionados, setMiembroIdsSeleccionados] = useState([])

  const [form, setForm] = useState({
    comunidadId: '',
    catalogoServicioId: '',
    descripcion: '',
    horaServicio: '',
    lugarServicio: '',
    fechaServicio: '',
    dirigidoA: '',
  })

  const { data: comunidades } = useQuery({
    queryKey: ['comunidades-select', equipoActual?.id],
    queryFn: () => getComunidades(equipoActual.id, { limit: 500 }).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

  const { data: catalogo } = useQuery({
    queryKey: ['catalogo', equipoActual?.id],
    queryFn: () => getCatalogo(equipoActual.id).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

  const { data: miembros } = useQuery({
    queryKey: ['miembros-equipo', equipoActual?.id],
    queryFn: () => getMiembros(equipoActual.id).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

  const comunidadOptions = useMemo(
    () => (comunidades || []).map((c) => ({ value: c.id, label: c.nombre, sublabel: c.departamento })),
    [comunidades]
  )

  const miembrosFiltrados = (miembros || []).filter((m) => {
    if (!m.activo) return false
    if (!busqueda) return true
    return nombreMiembro(m).toLowerCase().includes(busqueda.toLowerCase())
  })

  const toggleMiembro = (id) => {
    setMiembroIdsSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const guardar = async () => {
    if (!form.comunidadId) { toast({ title: 'Selecciona la comunidad solicitante', variant: 'destructive' }); return }
    if (!form.catalogoServicioId) { toast({ title: 'Selecciona el tipo de servicio', variant: 'destructive' }); return }
    setGuardando(true)
    try {
      await createServicioManual(equipoActual.id, {
        comunidadId: form.comunidadId,
        catalogoServicioId: form.catalogoServicioId,
        miembroIds: miembroIdsSeleccionados,
        descripcion: form.descripcion,
        horaServicio: form.horaServicio,
        dirigidoA: form.dirigidoA,
        fechaServicio: form.fechaServicio,
        lugarServicio: form.lugarServicio,
      })
      toast({ title: 'Servicio registrado' })
      onSaved()
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Ocurrió un error', variant: 'destructive' })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
      <div className="bg-card rounded-t-2xl md:rounded-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-xl">

        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">Registrar servicio manualmente</h2>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          <div className="bg-muted/40 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Comunidad solicitante *</label>
                <Combobox
                  options={comunidadOptions}
                  value={form.comunidadId}
                  onChange={(v) => setForm((f) => ({ ...f, comunidadId: v }))}
                  placeholder="Seleccionar comunidad..."
                  searchPlaceholder="Buscar comunidad o departamento..."
                  emptyLabel="No se encontraron comunidades"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Dirigido a</label>
                <Input
                  value={form.dirigidoA}
                  onChange={(e) => setForm((f) => ({ ...f, dirigidoA: e.target.value }))}
                  placeholder="Ej: Equipo Timón de Jóvenes"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Fecha del servicio</label>
                <Input
                  type="date"
                  value={form.fechaServicio}
                  onChange={(e) => setForm((f) => ({ ...f, fechaServicio: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Hora</label>
                <Input
                  value={form.horaServicio}
                  onChange={(e) => setForm((f) => ({ ...f, horaServicio: e.target.value }))}
                  placeholder="Ej: 8:00 AM a 3:30 PM"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Lugar</label>
                <Input
                  value={form.lugarServicio}
                  onChange={(e) => setForm((f) => ({ ...f, lugarServicio: e.target.value }))}
                  placeholder="Dirección o nombre del lugar"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Descripción del servicio</label>
                <textarea
                  className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                  value={form.descripcion}
                  onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Ej: Retiro de jóvenes para creación del ministerio"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Tipo de servicio (catálogo) *</label>
            <select
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.catalogoServicioId}
              onChange={(e) => setForm((f) => ({ ...f, catalogoServicioId: e.target.value }))}
            >
              <option value="">Seleccionar tipo de servicio...</option>
              {catalogo?.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
            {(!catalogo || catalogo.length === 0) && (
              <p className="text-xs text-amber-600">
                No hay tipos en el catálogo. Agrega uno desde la pantalla de Servicios → Catálogo.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <label className="text-sm font-medium">Asignar miembros del Equipo Timón</label>
              {miembroIdsSeleccionados.length > 0 && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  {miembroIdsSeleccionados.length} seleccionado{miembroIdsSeleccionados.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <Input placeholder="Buscar miembro..." value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)} />
            <div className="border rounded-lg divide-y max-h-52 overflow-y-auto">
              {miembrosFiltrados.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No se encontraron miembros</p>
              )}
              {miembrosFiltrados.map((m) => {
                const sel = miembroIdsSeleccionados.includes(m.id)
                return (
                  <label key={m.id}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors ${sel ? 'bg-primary/5' : ''}`}>
                    <input type="checkbox" checked={sel} onChange={() => toggleMiembro(m.id)}
                      className="h-4 w-4 rounded border-input accent-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-none">{nombreMiembro(m)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{m.rol}</p>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1" onClick={guardar} disabled={guardando || !form.comunidadId || !form.catalogoServicioId}>
              {guardando
                ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Guardando...</>
                : 'Guardar servicio'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
