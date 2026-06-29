import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '@/stores/useAuthStore'
import { getReunion, createAcuerdo, updateAcuerdo, generarTexto } from '@/api/reuniones'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { PageSpinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { ArrowLeft, Plus, Copy, CheckCircle, Circle } from 'lucide-react'

export default function ReunionDetailPage() {
  const { id } = useParams()
  const { equipoActual } = useAuthStore()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [textoModal, setTextoModal] = useState(null)
  const [addingAcuerdo, setAddingAcuerdo] = useState(false)

  const { data: reunion, isLoading } = useQuery({
    queryKey: ['reunion', id],
    queryFn: () => getReunion(equipoActual.id, id).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const { mutate: addAcuerdo, isPending: addingPending } = useMutation({
    mutationFn: (data) => createAcuerdo(equipoActual.id, id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reunion', id] }); reset(); setAddingAcuerdo(false) },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, variant: 'destructive' }),
  })

  const { mutate: toggleCumplido } = useMutation({
    mutationFn: ({ acuerdoId, cumplido }) => updateAcuerdo(equipoActual.id, acuerdoId, { cumplido }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reunion', id] }),
  })

  const { mutate: generar, isPending: generando } = useMutation({
    mutationFn: () => generarTexto(equipoActual.id, id),
    onSuccess: (res) => setTextoModal(res.data.data.texto),
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, variant: 'destructive' }),
  })

  const copiarTexto = () => {
    navigator.clipboard.writeText(textoModal).then(() => toast({ title: 'Texto copiado al portapapeles' }))
  }

  if (isLoading) return <PageSpinner />
  if (!reunion) return <div className="p-6 text-muted-foreground">Reunión no encontrada</div>

  const acuerdosPendientes = reunion.acuerdos?.filter((a) => !a.cumplido).length
  const acuerdosCumplidos = reunion.acuerdos?.filter((a) => a.cumplido).length

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/reuniones"><button className="min-h-0 h-auto p-1 text-muted-foreground"><ArrowLeft className="h-5 w-5" /></button></Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{reunion.titulo}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(reunion.fecha).toLocaleDateString('es-SV')} · {reunion.redactor?.nombre}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => generar()} disabled={generando}>
          {generando ? '...' : 'Generar texto'}
        </Button>
      </div>

      {reunion.lugar && <p className="text-sm text-muted-foreground">📍 {reunion.lugar}</p>}
      {reunion.participantes && <p className="text-sm">👥 {reunion.participantes}</p>}

      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-sm">
          <span className="text-orange-500">{acuerdosPendientes} pendientes</span>
          <span className="text-green-500">{acuerdosCumplidos} cumplidos</span>
        </div>
        <Button size="sm" onClick={() => setAddingAcuerdo(true)} variant="outline">
          <Plus className="h-4 w-4" /> Acuerdo
        </Button>
      </div>

      {addingAcuerdo && (
        <Card className="border-primary-200">
          <CardContent className="py-4 space-y-3">
            <Input {...register('descripcion', { required: 'Requerido' })} placeholder="Descripción del acuerdo" />
            {errors.descripcion && <p className="text-xs text-destructive">{errors.descripcion.message}</p>}
            <div className="grid grid-cols-2 gap-3">
              <Input {...register('responsable')} placeholder="Responsable" />
              <Input type="date" {...register('fechaLimite')} />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => { setAddingAcuerdo(false); reset() }}>Cancelar</Button>
              <Button size="sm" disabled={addingPending} onClick={handleSubmit(addAcuerdo)}>Agregar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {reunion.acuerdos?.map((a) => (
          <Card key={a.id} className={a.cumplido ? 'opacity-60' : ''}>
            <CardContent className="flex items-start gap-3 py-3 px-4">
              <button
                className="min-h-0 h-auto p-0 mt-0.5 shrink-0"
                onClick={() => toggleCumplido({ acuerdoId: a.id, cumplido: !a.cumplido })}
              >
                {a.cumplido
                  ? <CheckCircle className="h-5 w-5 text-green-500" />
                  : <Circle className="h-5 w-5 text-muted-foreground" />}
              </button>
              <div className="flex-1">
                <p className={`font-medium ${a.cumplido ? 'line-through' : ''}`}>{a.descripcion}</p>
                {a.responsable && <p className="text-xs text-muted-foreground">Responsable: {a.responsable}</p>}
                {a.fechaLimite && <p className="text-xs text-muted-foreground">Fecha límite: {new Date(a.fechaLimite).toLocaleDateString('es-SV')}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
        {reunion.acuerdos?.length === 0 && (
          <p className="text-center py-8 text-muted-foreground">Sin acuerdos registrados. Usa el botón + para agregar.</p>
        )}
      </div>

      {textoModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
          <div className="bg-card rounded-t-2xl md:rounded-xl w-full max-w-lg max-h-[90vh] shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold">Texto del acta</h2>
              <button onClick={() => setTextoModal(null)} className="min-h-0 h-auto p-1 text-muted-foreground">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <pre className="text-sm whitespace-pre-wrap font-mono bg-muted rounded-lg p-4">{textoModal}</pre>
            </div>
            <div className="p-4 border-t space-y-2">
              <Button className="w-full" onClick={copiarTexto}>
                <Copy className="h-4 w-4" /> Copiar texto
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Copia este texto y pégalo en tu grupo de WhatsApp
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
