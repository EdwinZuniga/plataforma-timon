import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { misEquipos } from '@/api/auth'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageSpinner } from '@/components/ui/spinner'
import { ChevronRight } from 'lucide-react'

const ROLES_LABELS = {
  COORDINADOR: 'Coordinador',
  MIEMBRO: 'Miembro',
  SECRETARIO: 'Secretario',
  CONSULTOR: 'Consultor',
}

export default function SeleccionarEquipoPage() {
  const navigate = useNavigate()
  const { seleccionarEquipo, usuario, logout } = useAuthStore()
  const [equipos, setEquipos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    misEquipos().then((r) => {
      const lista = r.data.data
      if (lista.length === 1) {
        handleSelect(lista[0])
        return
      }
      setEquipos(lista)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleSelect = (equipo) => {
    seleccionarEquipo(equipo)
    navigate('/dashboard')
  }

  if (loading) return <PageSpinner />

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 pt-safe pb-safe">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">Selecciona un equipo</h1>
          <p className="text-muted-foreground text-sm mt-1">Hola, {usuario?.nombre}</p>
        </div>

        <div className="space-y-3">
          {equipos.map((equipo) => (
            <Card
              key={equipo.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleSelect(equipo)}
            >
              <CardContent className="flex items-center gap-4 py-4">
                <div
                  className="h-10 w-10 rounded-lg shrink-0 flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: equipo.color || '#2b07fc' }}
                >
                  {equipo.nombre[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{equipo.nombre}</p>
                  <Badge variant="secondary" className="text-xs mt-0.5">
                    {ROLES_LABELS[equipo.rol]}
                  </Badge>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>

        <button
          onClick={logout}
          className="w-full text-center text-sm text-muted-foreground mt-6 hover:text-foreground transition-colors min-h-[44px] flex items-center justify-center"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
