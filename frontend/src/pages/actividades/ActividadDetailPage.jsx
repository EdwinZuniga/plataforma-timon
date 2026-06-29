import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/useAuthStore'
import { getActividad, getAsistencia, saveAsistencia } from '@/api/actividades'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageSpinner } from '@/components/ui/spinner'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { useDebounce } from '@/hooks/useDebounce'
import { ArrowLeft, Search, Check, X as XIcon } from 'lucide-react'

const TIPO_LABEL = { RETIRO: 'Retiro', ASAMBLEA: 'Asamblea', ENCUENTRO: 'Encuentro', MISION: 'Misión', FORMACION: 'Formación', OTRO: 'Otro' }

export default function ActividadDetailPage() {
  const { id } = useParams()
  const { equipoActual } = useAuthStore()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [localChanges, setLocalChanges] = useState({})
  const debouncedQ = useDebounce(q, 300)

  const { data: actividad, isLoading } = useQuery({
    queryKey: ['actividad', id],
    queryFn: () => getActividad(equipoActual.id, id).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

  const { data: asistencia, isLoading: loadingAsistencia } = useQuery({
    queryKey: ['asistencia', id, debouncedQ],
    queryFn: () => getAsistencia(equipoActual.id, id, { q: debouncedQ }).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

  const { mutate: guardar, isPending } = useMutation({
    mutationFn: () => {
      const registros = Object.entries(localChanges).map(([hermanoId, presente]) => ({ hermanoId, presente }))
      return saveAsistencia(equipoActual.id, id, registros)
    },
    onSuccess: () => {
      toast({ title: 'Asistencia guardada' })
      setLocalChanges({})
      qc.invalidateQueries({ queryKey: ['asistencia', id] })
    },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, variant: 'destructive' }),
  })

  const toggle = (hermanoId, currentValue) => {
    setLocalChanges((prev) => ({ ...prev, [hermanoId]: !currentValue }))
  }

  const getPresente = (h) => {
    if (localChanges[h.hermanoId] !== undefined) return localChanges[h.hermanoId]
    return h.presente
  }

  if (isLoading) return <PageSpinner />
  if (!actividad) return <div className="p-6 text-muted-foreground">Actividad no encontrada</div>

  const changesCount = Object.keys(localChanges).length
  const presentesCount = asistencia?.filter((h) => getPresente(h)).length ?? 0

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/actividades"><button className="min-h-0 h-auto p-1 text-muted-foreground"><ArrowLeft className="h-5 w-5" /></button></Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{actividad.nombre}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(actividad.fecha).toLocaleDateString('es-SV')} · {TIPO_LABEL[actividad.tipo]}
            {actividad.lugar && ` · ${actividad.lugar}`}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {presentesCount} presentes de {asistencia?.length ?? 0} registrados
        </div>
        <Button
          size="sm"
          disabled={changesCount === 0 || isPending}
          onClick={() => guardar()}
        >
          {isPending ? 'Guardando...' : `Guardar ${changesCount > 0 ? `(${changesCount})` : ''}`}
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar hermano..." className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loadingAsistencia ? <PageSpinner /> : (
        <div className="space-y-2">
          {asistencia?.map((h) => {
            const presente = getPresente(h)
            const changed = localChanges[h.hermanoId] !== undefined
            return (
              <Card
                key={h.hermanoId}
                className={`cursor-pointer transition-colors ${presente ? 'border-green-300 dark:border-green-700' : ''} ${changed ? 'ring-2 ring-primary-500' : ''}`}
                onClick={() => toggle(h.hermanoId, presente)}
              >
                <CardContent className="flex items-center gap-3 py-3 px-4">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${presente ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
                    {presente
                      ? <Check className="h-4 w-4 text-green-600" />
                      : <XIcon className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{h.nombre} {h.apellido}</p>
                    <p className="text-xs text-muted-foreground">{h.comunidad}</p>
                  </div>
                  {presente && <Badge variant="success">Presente</Badge>}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
