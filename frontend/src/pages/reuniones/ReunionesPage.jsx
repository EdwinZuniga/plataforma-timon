import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/useAuthStore'
import { getReuniones } from '@/api/reuniones'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PageSpinner } from '@/components/ui/spinner'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { ListaAgrupadaPorFecha } from '@/components/shared/ListaAgrupadaPorFecha'
import { agruparPorMesYDia } from '@/utils/agruparPorFecha'
import { useDebounce } from '@/hooks/useDebounce'
import { Plus, Search, ChevronRight, FileText } from 'lucide-react'
import { ReunionModal } from './ReunionModal'

export default function ReunionesPage() {
  const { equipoActual } = useAuthStore()
  const [q, setQ] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [showModal, setShowModal] = useState(false)
  const debouncedQ = useDebounce(q, 300)

  const {
    data,
    isLoading,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['reuniones', equipoActual?.id, debouncedQ, desde, hasta],
    queryFn: ({ pageParam = 1 }) =>
      getReuniones(equipoActual.id, {
        q: debouncedQ || undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
        page: pageParam,
      }).then((r) => r.data),
    enabled: !!equipoActual?.id,
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pagination.page < last.pagination.pages ? last.pagination.page + 1 : undefined,
  })

  const reuniones = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data])
  const grupos = useMemo(() => agruparPorMesYDia(reuniones), [reuniones])
  const total = data?.pages?.[0]?.pagination?.total ?? null
  const hayFiltro = !!(desde || hasta || debouncedQ)

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Actas de Reunión</h1>
          <p className="text-sm text-muted-foreground">
            {total ?? '—'} {total === 1 ? 'reunión' : 'reuniones'}{(desde || hasta) && ' en el rango'}
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} size="sm"><Plus className="h-4 w-4" /> Nueva</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título..."
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <DateRangePicker
          className="sm:w-[17rem]"
          desde={desde}
          hasta={hasta}
          onChange={(r) => { setDesde(r.desde); setHasta(r.hasta) }}
        />
      </div>

      {isLoading ? <PageSpinner /> : reuniones.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {hayFiltro ? 'No hay reuniones que coincidan con el filtro' : 'Aún no hay reuniones'}
        </div>
      ) : (
        <>
          <ListaAgrupadaPorFecha
            grupos={grupos}
            renderItem={(r) => (
              <Link key={r.id} to={`/reuniones/${r.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="flex items-center gap-3 py-3 px-4">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{r.titulo}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {[r.lugar, r.redactor?.nombre].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary">{r._count?.acuerdos} acuerdos</Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}
          />
          {hasNextPage && (
            <div className="pt-2 text-center">
              <Button variant="outline" size="sm" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                {isFetchingNextPage ? 'Cargando...' : 'Cargar más'}
              </Button>
            </div>
          )}
        </>
      )}

      {showModal && <ReunionModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); refetch() }} />}
    </div>
  )
}
