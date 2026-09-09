import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/useAuthStore'
import { getActividades } from '@/api/actividades'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PageSpinner } from '@/components/ui/spinner'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { ListaAgrupadaPorFecha } from '@/components/shared/ListaAgrupadaPorFecha'
import { agruparPorMesYDia } from '@/utils/agruparPorFecha'
import { useDebounce } from '@/hooks/useDebounce'
import { Plus, Search, ChevronRight, Calendar, Clock } from 'lucide-react'
import { ActividadModal } from './ActividadModal'

const TIPO_BADGE = { RETIRO: 'default', ASAMBLEA: 'secondary', ENCUENTRO: 'success', MISION: 'warning', FORMACION: 'outline', OTRO: 'secondary' }
const TIPO_LABEL = { RETIRO: 'Retiro', ASAMBLEA: 'Asamblea', ENCUENTRO: 'Encuentro', MISION: 'Misión', FORMACION: 'Formación', OTRO: 'Otro' }

const hoyISO = new Date().toISOString().slice(0, 10)
const esProgramada = (fecha) => new Date(fecha).toISOString().slice(0, 10) >= hoyISO

export default function ActividadesPage() {
  const { equipoActual } = useAuthStore()
  const [q, setQ] = useState('')
  const [tipo, setTipo] = useState('')
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
    queryKey: ['actividades', equipoActual?.id, debouncedQ, tipo, desde, hasta],
    queryFn: ({ pageParam = 1 }) =>
      getActividades(equipoActual.id, {
        q: debouncedQ || undefined,
        tipo: tipo || undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
        page: pageParam,
      }).then((r) => r.data),
    enabled: !!equipoActual?.id,
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pagination.page < last.pagination.pages ? last.pagination.page + 1 : undefined,
  })

  const actividades = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data])
  const grupos = useMemo(() => agruparPorMesYDia(actividades), [actividades])
  const total = data?.pages?.[0]?.pagination?.total ?? null
  const hayFiltro = !!(debouncedQ || tipo || desde || hasta)

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Actividades</h1>
          <p className="text-sm text-muted-foreground">
            {total ?? '—'} {total === 1 ? 'actividad' : 'actividades'}{(desde || hasta) && ' en el rango'}
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} size="sm"><Plus className="h-4 w-4" /> Nueva</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre..."
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

      <div className="flex gap-2 flex-wrap">
        <select
          className="h-11 rounded-md border border-input bg-background px-3 text-sm"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
        >
          <option value="">Todos los tipos</option>
          {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {isLoading ? <PageSpinner /> : actividades.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {hayFiltro ? 'No hay actividades que coincidan con el filtro' : 'Aún no hay actividades'}
        </div>
      ) : (
        <>
          <ListaAgrupadaPorFecha
            grupos={grupos}
            renderItem={(a) => (
              <Link key={a.id} to={`/actividades/${a.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="flex items-center gap-3 py-3 px-4">
                    <div className="h-10 w-10 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                      <Calendar className="h-5 w-5 text-primary-700 dark:text-primary-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{a.nombre}</p>
                        <Badge variant={TIPO_BADGE[a.tipo]}>{TIPO_LABEL[a.tipo]}</Badge>
                        {esProgramada(a.fecha) && (
                          <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Programada</Badge>
                        )}
                      </div>
                      {a.lugar && <p className="text-sm text-muted-foreground truncate">{a.lugar}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm text-muted-foreground">{a._count?.asistencias} asistentes</p>
                      <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
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

      {showModal && <ActividadModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); refetch() }} />}
    </div>
  )
}
