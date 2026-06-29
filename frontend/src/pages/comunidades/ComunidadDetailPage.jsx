import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/useAuthStore'
import { getComunidad } from '@/api/comunidades'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageSpinner } from '@/components/ui/spinner'
import { Card, CardContent } from '@/components/ui/card'
import { ComunidadModal } from './ComunidadModal'
import { ArrowLeft, Edit, MapPin, Clock, Users } from 'lucide-react'

const TABS = ['Info general', 'Consejo', 'Hermanos', 'Visitas']

const ESTADO_BADGE = { ACTIVA: 'success', PROCESO_INSCRIPCION: 'warning', INACTIVA: 'secondary' }
const ESTADO_LABEL = { ACTIVA: 'Activa', PROCESO_INSCRIPCION: 'En proceso', INACTIVA: 'Inactiva' }

export default function ComunidadDetailPage() {
  const { id } = useParams()
  const { equipoActual } = useAuthStore()
  const [tab, setTab] = useState(0)
  const [editModal, setEditModal] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['comunidad', id],
    queryFn: () => getComunidad(equipoActual.id, id).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

  if (isLoading) return <PageSpinner />
  if (!data) return <div className="p-6 text-muted-foreground">Comunidad no encontrada</div>

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/comunidades">
          <button className="min-h-0 h-auto p-1 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold">{data.nombre}</h1>
            <Badge variant={ESTADO_BADGE[data.estado]}>{ESTADO_LABEL[data.estado]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {data.departamento}
            {data.numero && <span className="ml-2">#{data.numero}</span>}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditModal(true)}>
          <Edit className="h-4 w-4" /> Editar
        </Button>
      </div>

      <div className="flex border-b overflow-x-auto">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap min-h-[44px] transition-colors border-b-2 ${
              tab === i ? 'border-primary-700 text-primary-700' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {data.lugarAsamblea && (
            <Card><CardContent className="py-3 px-4 flex gap-2 items-start">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div><p className="text-xs text-muted-foreground">Lugar de asamblea</p><p className="font-medium">{data.lugarAsamblea}</p></div>
            </CardContent></Card>
          )}
          {data.horarioAsamblea && (
            <Card><CardContent className="py-3 px-4 flex gap-2 items-start">
              <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div><p className="text-xs text-muted-foreground">Horario</p><p className="font-medium">{data.horarioAsamblea}</p></div>
            </CardContent></Card>
          )}
          {data.enlace && (
            <Card><CardContent className="py-3 px-4">
              <p className="text-xs text-muted-foreground">Enlace asignado</p>
              <p className="font-medium">{data.enlace.usuario?.nombre}</p>
            </CardContent></Card>
          )}
          {data.notas && (
            <Card className="md:col-span-2"><CardContent className="py-3 px-4">
              <p className="text-xs text-muted-foreground mb-1">Notas</p>
              <p className="text-sm">{data.notas}</p>
            </CardContent></Card>
          )}
        </div>
      )}

      {tab === 1 && (
        <div className="space-y-2">
          {data.miembrosConsejo?.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Sin miembros de consejo registrados</p>
          ) : (
            data.miembrosConsejo?.map((m) => (
              <Card key={m.id}><CardContent className="py-3 px-4 flex justify-between">
                <div><p className="font-medium">{m.nombre}</p>{m.telefono && <p className="text-sm text-muted-foreground">{m.telefono}</p>}</div>
                {m.nota && <Badge variant="secondary">{m.nota}</Badge>}
              </CardContent></Card>
            ))
          )}
        </div>
      )}

      {tab === 2 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" /> {data.hermanos?.length} hermanos
          </div>
          {data.hermanos?.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Sin hermanos registrados</p>
          ) : (
            data.hermanos?.map((h) => (
              <Link key={h.id} to={`/hermanos/${h.id}`}>
                <Card className="hover:shadow-sm cursor-pointer"><CardContent className="py-3 px-4">
                  <p className="font-medium">{h.nombre} {h.apellido}</p>
                  {h.telefono && <p className="text-sm text-muted-foreground">{h.telefono}</p>}
                </CardContent></Card>
              </Link>
            ))
          )}
        </div>
      )}

      {tab === 3 && (
        <div className="space-y-2">
          {data.visitas?.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Sin visitas registradas</p>
          ) : (
            data.visitas?.map((v) => (
              <Card key={v.id}><CardContent className="py-3 px-4">
                <p className="font-medium">{new Date(v.fecha).toLocaleDateString('es-SV')}</p>
                {v.encargados && <p className="text-sm text-muted-foreground">Encargados: {v.encargados}</p>}
                {v.notas && <p className="text-sm mt-1">{v.notas}</p>}
              </CardContent></Card>
            ))
          )}
        </div>
      )}

      {editModal && (
        <ComunidadModal comunidad={data} onClose={() => setEditModal(false)} onSaved={() => { setEditModal(false); refetch() }} />
      )}
    </div>
  )
}
