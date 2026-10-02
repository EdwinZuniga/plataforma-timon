import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getBitacora } from '@/api/admin'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZE = 20

const ACCIONES = {
  CREACION: { label: 'Creación', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  EDICION: { label: 'Edición', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  ELIMINACION: { label: 'Eliminación', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
}

const formatFecha = (date) =>
  new Date(date).toLocaleString('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })

export default function AdminBitacoraPage() {
  const [search, setSearch] = useState('')
  const [accion, setAccion] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [search, accion, desde, hasta])

  const { data, isLoading } = useQuery({
    queryKey: ['admin-bitacora', search, accion, desde, hasta, page],
    queryFn: () =>
      getBitacora({
        search: search || undefined,
        accion: accion || undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
        page,
        limit: PAGE_SIZE,
      }).then((r) => r.data.data),
    placeholderData: (prev) => prev,
  })

  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 max-w-5xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Bitácora</h1>
          <p className="text-muted-foreground text-sm">Historial de operaciones realizadas por los usuarios en la plataforma</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por descripción o usuario…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <DateRangePicker
            className="lg:w-[17rem]"
            desde={desde}
            hasta={hasta}
            onChange={(r) => { setDesde(r.desde); setHasta(r.hasta) }}
          />
          <select value={accion} onChange={(e) => setAccion(e.target.value)} className="h-11 rounded-md border bg-background px-3 text-sm">
            <option value="">Todas las acciones</option>
            {Object.entries(ACCIONES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        <div className="rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Fecha / Hora</th>
                <th className="text-left px-4 py-3 font-medium">Acción</th>
                <th className="text-left px-4 py-3 font-medium">Descripción</th>
                <th className="text-left px-4 py-3 font-medium">Usuario</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Equipo</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td colSpan={5} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse w-64" /></td>
                  </tr>
                ))
              ) : data?.items?.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No hay registros en la bitácora</td></tr>
              ) : (
                data?.items?.map((r) => {
                  const a = ACCIONES[r.accion]
                  return (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors align-top">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap tabular-nums">{formatFecha(r.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${a?.className ?? 'bg-muted text-muted-foreground'}`}>
                          {a?.label ?? r.accion}
                        </span>
                      </td>
                      <td className="px-4 py-3">{r.descripcion}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{r.usuarioNombre ?? 'Sistema'}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{r.equipo ?? '—'}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>{total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="tabular-nums">Página {page} de {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>
    </div>
  )
}
