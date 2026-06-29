import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/useAuthStore'
import { getPendientes, confirmarServicio } from '@/api/servicios'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageSpinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { Wrench, Calendar, CheckCircle } from 'lucide-react'

const ESTADO_BADGE = { PENDIENTE: 'destructive', ASIGNADO: 'warning', CONFIRMADO: 'success', CANCELADO: 'secondary' }

export default function ServiciosPage() {
  const { equipoActual } = useAuthStore()
  const { toast } = useToast()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['servicios-pendientes', equipoActual?.id],
    queryFn: () => getPendientes(equipoActual.id).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

  const { mutate: confirmar } = useMutation({
    mutationFn: (servicioId) => confirmarServicio(equipoActual.id, servicioId),
    onSuccess: () => { toast({ title: 'Servicio confirmado' }); qc.invalidateQueries({ queryKey: ['servicios-pendientes'] }) },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, variant: 'destructive' }),
  })

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Servicios Pendientes</h1>
        <p className="text-sm text-muted-foreground">Bandeja de servicios sin asignar</p>
      </div>

      {isLoading ? <PageSpinner /> : (
        <div className="space-y-3">
          {data?.map((s) => (
            <Card key={s.id}>
              <CardContent className="py-4 px-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
                      <p className="font-medium">{s.catalogoServicio.nombre}</p>
                      <Badge variant={ESTADO_BADGE[s.estado]}>{s.estado}</Badge>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <Calendar className="h-3 w-3" />
                      <span>{s.actividad?.nombre} · {new Date(s.actividad?.fecha).toLocaleDateString('es-SV')}</span>
                    </div>
                    {s.descripcion && <p className="text-sm mt-1">{s.descripcion}</p>}
                  </div>
                  {s.estado === 'ASIGNADO' && (
                    <Button size="sm" variant="outline" onClick={() => confirmar(s.id)}>
                      <CheckCircle className="h-4 w-4" /> Confirmar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {data?.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              ¡Todo al día! No hay servicios pendientes.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
