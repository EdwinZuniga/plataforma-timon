import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/useAuthStore'
import { getMiembros } from '@/api/equipos'
import { Button } from '@/components/ui/button'
import { X, Users2 } from 'lucide-react'

const COMISIONES_FIJAS = [
  'LOGÍSTICA',
  'ASAMBLEÍSTAS',
  'PROTOCOLO',
  'INSCRIPCIÓN',
  'ORNATO',
  'COMUNICACIÓN',
  'COCINA',
  'VARIOS',
]

const nombreMiembro = (m) => m.nombreCorto || m.usuario?.nombre || `Miembro ${m.id}`

export function ComisionesModal({ reunion, onClose, onSaved }) {
  const { equipoActual } = useAuthStore()

  const existentes = reunion.comisiones ? JSON.parse(reunion.comisiones) : []
  const inicial = Object.fromEntries(
    COMISIONES_FIJAS.map((n) => [n, existentes.find((c) => c.nombre === n)?.miembros || []])
  )

  const [form, setForm] = useState(inicial)
  const [guardando, setGuardando] = useState(false)

  const { data: miembros = [] } = useQuery({
    queryKey: ['miembros', equipoActual?.id],
    queryFn: () => getMiembros(equipoActual.id).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

  const miembrosActivos = miembros
    .filter((m) => m.activo)
    .sort((a, b) => nombreMiembro(a).localeCompare(nombreMiembro(b)))

  const agregar = (comision, nombre) => {
    if (!nombre || form[comision].includes(nombre)) return
    setForm((f) => ({ ...f, [comision]: [...f[comision], nombre] }))
  }

  const quitar = (comision, nombre) => {
    setForm((f) => ({ ...f, [comision]: f[comision].filter((m) => m !== nombre) }))
  }

  const guardar = async () => {
    setGuardando(true)
    try {
      const data = COMISIONES_FIJAS.map((nombre) => ({ nombre, miembros: form[nombre] }))
      await onSaved(data)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
      <div className="bg-card rounded-t-2xl md:rounded-xl w-full max-w-md max-h-[90vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-card">
          <div className="flex items-center gap-2">
            <Users2 className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">Comisiones</h2>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {COMISIONES_FIJAS.map((nombre) => {
            const asignados = form[nombre] || []
            const disponibles = miembrosActivos.filter((m) => !asignados.includes(nombreMiembro(m)))

            return (
              <div key={nombre}>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
                  {nombre}
                </p>
                <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                  {asignados.map((m) => (
                    <span
                      key={m}
                      className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                    >
                      {m}
                      <button
                        onClick={() => quitar(nombre, m)}
                        className="hover:text-destructive ml-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {disponibles.length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          agregar(nombre, e.target.value)
                          e.target.value = ''
                        }
                      }}
                      className="text-xs border rounded-full px-2.5 py-0.5 bg-background text-muted-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">+ Agregar</option>
                      {disponibles.map((m) => (
                        <option key={m.id} value={nombreMiembro(m)}>
                          {nombreMiembro(m)}
                        </option>
                      ))}
                    </select>
                  )}
                  {asignados.length === 0 && disponibles.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">Sin miembros disponibles</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="p-4 border-t">
          <Button className="w-full" onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar comisiones'}
          </Button>
        </div>
      </div>
    </div>
  )
}
