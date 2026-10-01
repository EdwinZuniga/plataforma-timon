import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/useAuthStore'
import { getDashboard } from '@/api/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageSpinner } from '@/components/ui/spinner'
import { Link } from 'react-router-dom'
import { Users, UserCheck, Calendar, BookOpen, Wrench, MapPin } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const fmtFechaVisita = (d, opts = { day: '2-digit', month: 'short', year: 'numeric' }) =>
  new Date(d).toLocaleDateString('es-SV', { timeZone: 'UTC', ...opts })
const rangoVisita = (v) => {
  const ini = v.fecha.slice(0, 10)
  const fin = (v.fechaFin || v.fecha).slice(0, 10)
  return ini === fin ? fmtFechaVisita(v.fecha) : `${fmtFechaVisita(v.fecha)} al ${fmtFechaVisita(v.fechaFin)}`
}

const COLORS = ['#6D28D9', '#7C3AED', '#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE', '#4C1D95', '#5B21B6']

// Estilos de los gráficos (Recharts) enlazados a las CSS vars del tema para
// que ejes, tooltip y etiquetas se vean bien tanto en claro como en oscuro
// en vez de usar los grises/blancos por defecto de la librería.
const axisTick = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' }
const axisLine = { stroke: 'hsl(var(--border))' }
const tooltipStyle = {
  contentStyle: {
    backgroundColor: 'hsl(var(--popover))',
    borderColor: 'hsl(var(--border))',
    borderRadius: '0.5rem',
    color: 'hsl(var(--popover-foreground))',
    fontSize: '0.75rem',
  },
  labelStyle: { color: 'hsl(var(--popover-foreground))' },
  itemStyle: { color: 'hsl(var(--popover-foreground))' },
}

function PieSliceLabel({ x, y, textAnchor, name, percent }) {
  return (
    <text x={x} y={y} textAnchor={textAnchor} dominantBaseline="middle" fontSize={11} fill="hsl(var(--foreground))">
      {`${name} ${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

function MetricCard({ icon: Icon, label, value, color = 'text-primary-700 dark:text-primary-400' }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-5">
        <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/30">
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value ?? '—'}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { equipoActual } = useAuthStore()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', equipoActual?.id],
    queryFn: () => getDashboard(equipoActual.id).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

  if (isLoading) return <PageSpinner />

  const metricas = data?.metricas || {}
  const asistenciaTalleresMes = (data?.graficas?.asistenciaTalleresMes || []).map((d) => ({
    mes: MESES[d.mes - 1],
    total: d.total,
  }))
  const herPorDep = data?.graficas?.hermanosPorDepartamento || []
  const visitas = data?.visitasProgramadas || []

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Equipo {equipoActual?.nombre} · Resumen general</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <MetricCard icon={Users} label="Comunidades activas" value={metricas.totalComunidades} />
        <MetricCard icon={UserCheck} label="Hermanos activos" value={metricas.totalHermanos} />
        <MetricCard icon={Calendar} label="Actividades este año" value={metricas.actividadesAnio} />
        <MetricCard icon={BookOpen} label="Talleres" value={metricas.talleres} />
        <MetricCard icon={Wrench} label="Servicios pendientes" value={metricas.serviciosPendientes} color="text-orange-500" />
      </div>

      {visitas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary-700 dark:text-primary-400" /> Visitas programadas
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {visitas.map((v) => (
              <Link
                key={v.id}
                to={`/comunidades/${v.comunidad.id}`}
                className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0 hover:text-primary-700 dark:hover:text-primary-400"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{v.comunidad.nombre}</p>
                  {v.responsable && (
                    <p className="text-xs text-muted-foreground truncate">
                      Responsable: {v.responsable.nombreCorto || v.responsable.usuario?.nombre}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium">{rangoVisita(v)}</p>
                  {v.horario && <p className="text-xs text-muted-foreground">{v.horario}</p>}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Asistencia en talleres por mes ({new Date().getFullYear()})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-equipo">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={asistenciaTalleresMes}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="mes" tick={axisTick} axisLine={axisLine} tickLine={axisLine} />
                  <YAxis tick={axisTick} axisLine={axisLine} tickLine={axisLine} allowDecimals={false} />
                  <Tooltip formatter={(val) => [val, 'Asistentes']} {...tooltipStyle} />
                  <Bar dataKey="total" fill="currentColor" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comunidades por departamento</CardTitle>
          </CardHeader>
          <CardContent>
            {herPorDep.length === 0 ? (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                Sin datos aún
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={herPorDep} dataKey="total" nameKey="departamento" cx="50%" cy="50%" outerRadius={80} label={PieSliceLabel} labelLine={false}>
                    {herPorDep.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
