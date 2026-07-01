import { useQuery } from '@tanstack/react-query'
import { getStats } from '@/api/admin'
import { Users, Building2, BookOpen, Calendar, UserCheck, MapPin } from 'lucide-react'

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="rounded-xl border bg-card p-5 flex items-start gap-4">
      <div className={`rounded-lg p-2.5 ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value ?? '—'}</p>
        <p className="text-sm font-medium">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function AdminPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => getStats().then((r) => r.data.data),
  })

  return (
    <div className="flex-1 overflow-y-auto">
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Panel de administración</h1>
        <p className="text-muted-foreground text-sm">Resumen global de la plataforma</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-5 h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard
            icon={Users}
            label="Usuarios"
            value={data?.usuarios}
            sub={`${data?.usuariosActivos} activos`}
            color="bg-violet-600"
          />
          <StatCard
            icon={Building2}
            label="Equipos"
            value={data?.equipos}
            sub={`${data?.equiposActivos} activos`}
            color="bg-blue-600"
          />
          <StatCard
            icon={MapPin}
            label="Comunidades"
            value={data?.comunidades}
            color="bg-emerald-600"
          />
          <StatCard
            icon={UserCheck}
            label="Hermanos registrados"
            value={data?.hermanos}
            color="bg-amber-600"
          />
          <StatCard
            icon={BookOpen}
            label="Talleres"
            value={data?.talleres}
            color="bg-pink-600"
          />
          <StatCard
            icon={Calendar}
            label="Actividades"
            value={data?.actividades}
            color="bg-cyan-600"
          />
        </div>
      )}
    </div>
    </div>
  )
}
