import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSesiones, expulsarSesion } from '@/api/admin'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Button } from '@/components/ui/button'
import { Search, ShieldCheck, MonitorSmartphone } from 'lucide-react'

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

export default function AdminSesionesPage() {
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
      toast({ title: 'Sesión cerrada' })
      setExpulsarTarget(null)
    },
    onError: () => toast({ title: 'Error al cerrar la sesión', variant: 'destructive' }),
  })

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 max-w-5xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Sesiones activas</h1>
            <p className="text-muted-foreground text-sm">{data?.total ?? '—'} sesiones</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
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
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 flex items-center justify-center text-xs font-bold shrink-0">
                          {s.usuario?.nombre?.[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium truncate">{s.usuario?.nombre}</span>
                            <span className={
                              s.usuario?.superAdmin
                                ? 'text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 shrink-0'
                                : 'text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-muted text-muted-foreground shrink-0'
                            }>
                              {s.usuario?.superAdmin ? 'Admin' : 'User'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{s.usuario?.email}</p>
                        </div>
                      </div>
                    </td>
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
      </div>
    </div>
  )
}
