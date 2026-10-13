import { lazy, Suspense, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/useAuthStore'
import { getComunidades } from '@/api/comunidades'
import { getMiembros } from '@/api/equipos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Combobox } from '@/components/ui/combobox'
import { Card, CardContent } from '@/components/ui/card'
import { PageSpinner } from '@/components/ui/spinner'
import { useDebounce } from '@/hooks/useDebounce'
import { Plus, Search, ChevronRight, UserX, List, Map as MapIcon } from 'lucide-react'
import { ComunidadModal } from './ComunidadModal'
import { coordenadasValidas } from '@/utils/ubicacion'

const MapaComunidades = lazy(() => import('@/components/shared/MapaComunidades').then((m) => ({ default: m.MapaComunidades })))

const ESTADO_BADGE = {
  ACTIVA: 'success',
  PROCESO_INSCRIPCION: 'warning',
  INACTIVA: 'secondary',
}
const ESTADO_LABEL = {
  ACTIVA: 'Activa',
  PROCESO_INSCRIPCION: 'En proceso',
  INACTIVA: 'Inactiva',
}

export default function ComunidadesPage() {
  const { equipoActual } = useAuthStore()
  const [q, setQ] = useState('')
  const [estado, setEstado] = useState('')
  const [enlaceId, setEnlaceId] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [vista, setVista] = useState('lista')
  const navigate = useNavigate()
  const debouncedQ = useDebounce(q, 300)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['comunidades', equipoActual?.id, debouncedQ, estado, enlaceId, page],
    queryFn: () => getComunidades(equipoActual.id, {
      q: debouncedQ, estado, page, enlaceId: enlaceId || undefined,
    }).then((r) => r.data),
    enabled: !!equipoActual?.id,
  })

  // El mapa necesita todas las comunidades del filtro, no solo la página actual
  const { data: dataMapa, isLoading: cargandoMapa } = useQuery({
    queryKey: ['comunidades-mapa', equipoActual?.id, debouncedQ, estado, enlaceId],
    queryFn: () => getComunidades(equipoActual.id, {
      q: debouncedQ, estado, limit: 500, enlaceId: enlaceId || undefined,
    }).then((r) => r.data),
    enabled: !!equipoActual?.id && vista === 'mapa',
  })
  const sinUbicacion = dataMapa?.data?.filter((c) => !coordenadasValidas(c.latitud, c.longitud)).length ?? 0

  const { data: miembros = [] } = useQuery({
    queryKey: ['miembros', equipoActual?.id],
    queryFn: () => getMiembros(equipoActual.id).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

  const enlaceOpts = useMemo(() => [
    { value: '', label: 'Todos los enlaces' },
    { value: 'sin', label: 'Sin enlace asignado' },
    ...miembros
      .filter((m) => m.activo)
      .map((m) => ({ value: m.id, label: m.usuario.nombre })),
  ], [miembros])

  const total = data?.pagination?.total
  const hayFiltro = !!(debouncedQ || estado || enlaceId)

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Comunidades</h1>
          <p className="text-sm text-muted-foreground">
            {total ?? '—'} {total === 1 ? 'comunidad' : 'comunidades'}
            {hayFiltro ? ' coinciden con el filtro' : ' registradas'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-input overflow-hidden">
            {[['lista', List, 'Lista'], ['mapa', MapIcon, 'Mapa']].map(([v, Icon, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setVista(v)}
                className={`inline-flex items-center gap-1.5 px-3 h-9 text-sm ${vista === v ? 'bg-primary-700 text-white' : 'hover:bg-muted'}`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
          <Button onClick={() => setShowModal(true)} size="sm">
            <Plus className="h-4 w-4" /> Nueva
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre..."
            className="pl-9"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1) }}
          />
        </div>
        <select
          className="h-11 rounded-md border border-input bg-background px-3 text-sm"
          value={estado}
          onChange={(e) => { setEstado(e.target.value); setPage(1) }}
        >
          <option value="">Todos los estados</option>
          <option value="ACTIVA">Activa</option>
          <option value="PROCESO_INSCRIPCION">En proceso</option>
          <option value="INACTIVA">Inactiva</option>
        </select>
        <Combobox
          className="w-full sm:w-56"
          options={enlaceOpts}
          value={enlaceId}
          onChange={(v) => { setEnlaceId(v); setPage(1) }}
          placeholder="Filtrar por enlace"
          searchPlaceholder="Buscar miembro..."
          emptyLabel="Sin coincidencias"
        />
      </div>

      {vista === 'mapa' && (
        cargandoMapa ? <PageSpinner /> : (
          <div className="space-y-2">
            <Suspense fallback={<PageSpinner />}>
              <MapaComunidades comunidades={dataMapa?.data ?? []} onAbrir={(id) => navigate(`/comunidades/${id}`)} />
            </Suspense>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-green-600" />Activa</span>
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-600" />En proceso</span>
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-gray-500" />Inactiva</span>
              {sinUbicacion > 0 && <span>· {sinUbicacion} sin ubicación registrada</span>}
            </div>
          </div>
        )
      )}

      {vista === 'lista' && (isLoading ? <PageSpinner /> : (
        <div className="space-y-2">
          {data?.data?.map((c) => (
            <Link key={c.id} to={`/comunidades/${c.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex items-center gap-3 py-3 px-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{c.nombre}</p>
                      {c.numero && <span className="text-xs text-muted-foreground">#{c.numero}</span>}
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 flex-wrap">
                      <span>{c.departamento}</span>
                      <span>·</span>
                      {c.enlace?.activo ? (
                        <span>{c.enlace.usuario?.nombre}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-500">
                          <UserX className="h-3.5 w-3.5" /> Sin enlace
                        </span>
                      )}
                    </p>
                  </div>
                  <Badge variant={ESTADO_BADGE[c.estado]}>{ESTADO_LABEL[c.estado]}</Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))}
          {data?.data?.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No se encontraron comunidades
            </div>
          )}
        </div>
      ))}

      {vista === 'lista' && data?.pagination && data.pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
          <span className="text-sm text-muted-foreground">Página {page} de {data.pagination.pages}</span>
          <Button variant="outline" size="sm" disabled={page === data.pagination.pages} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
        </div>
      )}

      {showModal && (
        <ComunidadModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); refetch() }} />
      )}
    </div>
  )
}
