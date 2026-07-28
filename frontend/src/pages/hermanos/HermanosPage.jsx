import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/useAuthStore'
import { getHermanos } from '@/api/hermanos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { PageSpinner } from '@/components/ui/spinner'
import { useDebounce } from '@/hooks/useDebounce'
import { Plus, Search, ChevronRight, User } from 'lucide-react'
import { HermanoModal } from './HermanoModal'

export default function HermanosPage() {
  const { equipoActual } = useAuthStore()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const debouncedQ = useDebounce(q, 300)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['hermanos', equipoActual?.id, debouncedQ, page],
    queryFn: () => getHermanos(equipoActual.id, { q: debouncedQ, page, activo: 'true' }).then((r) => r.data),
    enabled: !!equipoActual?.id,
  })

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Hermanos</h1>
          <p className="text-sm text-muted-foreground">{data?.pagination?.total ?? '—'} registrados</p>
        </div>
        <Button onClick={() => setShowModal(true)} size="sm">
          <Plus className="h-4 w-4" /> Nuevo
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre..."
          className="pl-9"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1) }}
        />
      </div>

      {isLoading ? <PageSpinner /> : (
        <div className="space-y-2">
          {data?.data?.map((h) => (
            <Link key={h.id} to={`/hermanos/${h.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex items-center gap-3 py-3 px-4">
                  <div className="h-9 w-9 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-primary-700 dark:text-primary-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{h.nombre} {h.apellido}</p>
                    <p className="text-sm text-muted-foreground truncate">{h.comunidad?.nombre} · {h.comunidad?.departamento}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))}
          {data?.data?.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">No se encontraron hermanos</div>
          )}
        </div>
      )}

      {data?.pagination && data.pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
          <span className="text-sm text-muted-foreground">Página {page} de {data.pagination.pages}</span>
          <Button variant="outline" size="sm" disabled={page === data.pagination.pages} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
        </div>
      )}

      {showModal && <HermanoModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); refetch() }} />}
    </div>
  )
}
