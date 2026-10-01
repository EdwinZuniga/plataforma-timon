import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSesiones, getHistorialSesiones, expulsarSesion } from '@/api/admin'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Button } from '@/components/ui/button'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZE = 20

const ESTADOS = {
  ACTIVA: { label: 'Activa', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  LOGOUT: { label: 'Cerró sesión', className: 'bg-muted text-muted-foreground' },
  EXPULSADA: { label: 'Expulsada', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  EXPIRADA: { label: 'Expirada', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
}

function formatFecha(date) {
  if (!date) return '—'
  return new Date(date).toLocaleString('es-SV', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function tiempoRelativo(date) {
  if (!date) return ''
  const diffMs = Date.now() - new Date(date).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'justo ahora'
  if (min < 60) return `hace ${min}min`
  const horas = Math.floor(min / 60)
  if (horas < 24) return `hace ${horas}h`
  const dias = Math.floor(horas / 24)
  return `hace ${dias}d`
}

function duracion(inicio, fin) {
  if (!inicio || !fin) return '—'
  const min = Math.max(0, Math.round((new Date(fin) - new Date(inicio)) / 60000))
  if (min < 1) return '<1min'
  if (min < 60) return `${min}min`
  const horas = Math.floor(min / 60)
  if (horas < 24) return `${horas}h ${min % 60}min`
  return `${Math.floor(horas / 24)}d ${horas % 24}h`
}

function dispositivo(ua) {
  if (!ua) return '—'
  const navegador = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome'
    : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Otro'
  const so = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad|iOS/.test(ua) ? 'iOS'
    : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : ''
  return so ? `${navegador} · ${so}` : navegador
}

function Paginacion({ page, total, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const desde = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const hasta = Math.min(page * PAGE_SIZE, total)
  return (
    <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>{desde}–{hasta} de {total}</span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="tabular-nums">Página {page} de {totalPages}</span>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function UsuarioCelda({ usuario }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-7 w-7 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 flex items-center justify-center text-xs font-bold shrink-0">
        {usuario?.nombre?.[0]?.toUpperCase()}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium truncate">{usuario?.nombre}</span>
          <span className={
            usuario?.superAdmin
              ? 'text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 shrink-0'
              : 'text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-muted text-muted-foreground shrink-0'
          }>
            {usuario?.superAdmin ? 'Admin' : 'User'}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">{usuario?.email}</p>
      </div>
    </div>
  )
}

function BuscadorUsuario({ value, onChange }) {
  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Buscar por nombre o email…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9"
      />
    </div>
  )
}

function SesionesActivas() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [expulsarTarget, setExpulsarTarget] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-sesiones', search],
    queryFn: () => getSesiones({ search: search || undefined }).then((r) => r.data.data),
    placeholderData: (prev) => prev,
  })

  const expulsarMutation = useMutation({
    mutationFn: (id) => expulsarSesion(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-sesiones'] })
      qc.invalidateQueries({ queryKey: ['admin-sesiones-historial'] })
      toast({ title: 'Sesión cerrada' })
      setExpulsarTarget(null)
    },
    onError: () => toast({ title: 'Error al cerrar la sesión', variant: 'destructive' }),
  })

  return (
    <>
      <p className="text-muted-foreground text-sm -mt-2">{data?.total ?? '—'} sesiones activas</p>

      <div className="flex">
        <BuscadorUsuario value={search} onChange={setSearch} />
      </div>

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Usuario</th>
              <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">IP</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Conectado desde</th>
              <th className="text-left px-4 py-3 font-medium">Última actividad</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td colSpan={5} className="px-4 py-3">
                    <div className="h-4 bg-muted rounded animate-pulse w-48" />
                  </td>
                </tr>
              ))
            ) : data?.items?.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No hay sesiones activas
                </td>
              </tr>
            ) : (
              data?.items?.map((s) => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3"><UsuarioCelda usuario={s.usuario} /></td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{s.ip ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{formatFecha(s.createdAt)}</td>
                  <td className="px-4 py-3">
                    <p className="text-foreground">{formatFecha(s.lastUsedAt)}</p>
                    <p className="text-xs text-muted-foreground">{tiempoRelativo(s.lastUsedAt)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setExpulsarTarget(s)}
                      >
                        Expulsar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {expulsarTarget && (
        <ConfirmModal
          title="Cerrar sesión"
          description={`¿Cerrar la sesión de "${expulsarTarget.usuario?.nombre}"${expulsarTarget.ip ? ` en ${expulsarTarget.ip}` : ''}?`}
          confirmLabel="Expulsar"
          onConfirm={() => expulsarMutation.mutate(expulsarTarget.id)}
          onCancel={() => setExpulsarTarget(null)}
          loading={expulsarMutation.isPending}
        />
      )}
    </>
  )
}

function HistorialSesiones() {
  const [search, setSearch] = useState('')
  const [estado, setEstado] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [search, estado])

  const { data, isLoading } = useQuery({
    queryKey: ['admin-sesiones-historial', search, estado, page],
    queryFn: () =>
      getHistorialSesiones({ search: search || undefined, estado: estado || undefined, page, limit: PAGE_SIZE }).then((r) => r.data.data),
    placeholderData: (prev) => prev,
  })

  return (
    <>
      <p className="text-muted-foreground text-sm -mt-2">Inicios de sesión de los últimos 90 días</p>

      <div className="flex flex-col sm:flex-row gap-3">
        <BuscadorUsuario value={search} onChange={setSearch} />
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Usuario</th>
              <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">IP</th>
              <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Dispositivo</th>
              <th className="text-left px-4 py-3 font-medium">Inicio</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Fin</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Duración</th>
              <th className="text-left px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td colSpan={7} className="px-4 py-3">
                    <div className="h-4 bg-muted rounded animate-pulse w-48" />
                  </td>
                </tr>
              ))
            ) : data?.items?.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No hay sesiones en el historial
                </td>
              </tr>
            ) : (
              data?.items?.map((s) => {
                const est = ESTADOS[s.estado] ?? ESTADOS.LOGOUT
                return (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3"><UsuarioCelda usuario={s.usuario} /></td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{s.ip ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{dispositivo(s.userAgent)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatFecha(s.createdAt)}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {s.finalizadaAt ? formatFecha(s.finalizadaAt) : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {duracion(s.createdAt, s.finalizadaAt ?? s.lastUsedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${est.className}`}>
                        {est.label}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <Paginacion page={page} total={data?.total ?? 0} onChange={setPage} />
    </>
  )
}

export default function AdminSesionesPage() {
  const [tab, setTab] = useState('activas')

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 max-w-5xl mx-auto space-y-5">
        <h1 className="text-2xl font-bold">Sesiones</h1>

        <div className="flex gap-1 border-b">
          {[['activas', 'Activas'], ['historial', 'Historial']].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === k ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'activas' ? <SesionesActivas /> : <HistorialSesiones />}
      </div>
    </div>
  )
}
