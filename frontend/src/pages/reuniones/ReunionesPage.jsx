import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/useAuthStore'
import { getReuniones } from '@/api/reuniones'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PageSpinner } from '@/components/ui/spinner'
import { useDebounce } from '@/hooks/useDebounce'
import { Plus, Search, ChevronRight, FileText } from 'lucide-react'
import { ReunionModal } from './ReunionModal'

export default function ReunionesPage() {
  const { equipoActual } = useAuthStore()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const debouncedQ = useDebounce(q, 300)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reuniones', equipoActual?.id, debouncedQ, page],
    queryFn: () => getReuniones(equipoActual.id, { q: debouncedQ, page }).then((r) => r.data),
    enabled: !!equipoActual?.id,
  })

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Actas de Reunión</h1>
          <p className="text-sm text-muted-foreground">{data?.pagination?.total ?? '—'} reuniones</p>
        </div>
        <Button onClick={() => setShowModal(true)} size="sm"><Plus className="h-4 w-4" /> Nueva</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por título..." className="pl-9" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
      </div>

      {isLoading ? <PageSpinner /> : (
        <div className="space-y-2">
          {data?.data?.map((r) => (
            <Link key={r.id} to={`/reuniones/${r.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex items-center gap-3 py-3 px-4">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{r.titulo}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(r.fecha).toLocaleDateString('es-SV')} · {r.redactor?.nombre}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary">{r._count?.acuerdos} acuerdos</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {data?.data?.length === 0 && <div className="text-center py-12 text-muted-foreground">No se encontraron reuniones</div>}
        </div>
      )}

      {showModal && <ReunionModal onClose={() => setShowModal(false)} onSaved={(id) => { setShowModal(false); refetch() }} />}
    </div>
  )
}
