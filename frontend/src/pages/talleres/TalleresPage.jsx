import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/useAuthStore'
import { getTalleres, createTaller } from '@/api/talleres'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageSpinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { Plus, BookOpen, ChevronRight, X } from 'lucide-react'
import { useForm } from 'react-hook-form'

export default function TalleresPage() {
  const { equipoActual } = useAuthStore()
  const { toast } = useToast()
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, reset } = useForm()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['talleres', equipoActual?.id],
    queryFn: () => getTalleres(equipoActual.id).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

  const onSubmit = async (formData) => {
    setLoading(true)
    try {
      await createTaller(equipoActual.id, formData)
      toast({ title: 'Taller creado' })
      reset()
      setShowModal(false)
      refetch()
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Talleres</h1>
          <p className="text-sm text-muted-foreground">Catálogo de talleres de formación</p>
        </div>
        <Button onClick={() => setShowModal(true)} size="sm"><Plus className="h-4 w-4" /> Nuevo</Button>
      </div>

      {isLoading ? <PageSpinner /> : (
        <div className="space-y-2">
          {data?.map((t) => (
            <Link key={t.id} to={`/talleres/${t.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex items-center gap-3 py-3 px-4">
                  <BookOpen className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium">{t.nombre}</p>
                    {t.descripcion && <p className="text-sm text-muted-foreground">{t.descripcion}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary">{t._count?.ediciones} ediciones</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {data?.length === 0 && <div className="text-center py-12 text-muted-foreground">Sin talleres creados aún</div>}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
          <div className="bg-card rounded-t-2xl md:rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold text-lg">Nuevo taller</h2>
              <button onClick={() => setShowModal(false)} className="min-h-0 h-auto p-1 text-muted-foreground"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Nombre *</label>
                <Input {...register('nombre', { required: true })} placeholder="Nombre del taller" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Descripción</label>
                <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" {...register('descripcion')} />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Cancelar</Button>
                <Button type="submit" className="flex-1" disabled={loading}>{loading ? 'Creando...' : 'Crear'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
