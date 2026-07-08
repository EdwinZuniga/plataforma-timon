import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { getEquipos, getEquipo, createEquipo, updateEquipo, asignarMiembro, updateMembresia } from '@/api/admin'
import { getUsuarios } from '@/api/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { Plus, Search, Pencil, X, ChevronRight, Users, UserPlus } from 'lucide-react'
import { cn } from '@/utils/cn'

const ROLES = ['COORDINADOR', 'MIEMBRO', 'SECRETARIO', 'CONSULTOR']
const ROLES_LABEL = { COORDINADOR: 'Coordinador', MIEMBRO: 'Miembro', SECRETARIO: 'Secretario', CONSULTOR: 'Consultor' }

// ─── MODAL EQUIPO ─────────────────────────────────────────────────────────────

function EquipoModal({ equipo, onClose }) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const isEdit = !!equipo

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      nombre: equipo?.nombre ?? '',
      descripcion: equipo?.descripcion ?? '',
      color: equipo?.color ?? '#6D28D9',
      activo: equipo?.activo ?? true,
    },
  })

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? updateEquipo(equipo.id, data) : createEquipo(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-equipos'] })
      toast({ title: isEdit ? 'Equipo actualizado' : 'Equipo creado' })
      onClose()
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.response?.data?.error ?? 'Ocurrió un error', variant: 'destructive' })
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold">{isEdit ? 'Editar equipo' : 'Nuevo equipo'}</h2>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium">Nombre</label>
            <Input {...register('nombre', { required: 'Requerido' })} className="mt-1" />
            {errors.nombre && <p className="text-xs text-destructive mt-1">{errors.nombre.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium">Descripción</label>
            <Input {...register('descripcion')} className="mt-1" />
          </div>

          <div>
            <label className="text-sm font-medium">Color</label>
            <div className="flex items-center gap-3 mt-1">
              <input type="color" {...register('color')} className="h-9 w-14 rounded border cursor-pointer" />
              <Input {...register('color')} className="flex-1 font-mono" placeholder="#6D28D9" />
            </div>
          </div>

          {isEdit && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" {...register('activo')} className="rounded" />
              <span className="text-sm font-medium">Activo</span>
            </label>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── MODAL DETALLE EQUIPO ─────────────────────────────────────────────────────

function EquipoDetailModal({ equipoId, onClose }) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [showAddMember, setShowAddMember] = useState(false)
  const [searchUser, setSearchUser] = useState('')
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [selectedRol, setSelectedRol] = useState('COORDINADOR')

  const { data: equipo, isLoading } = useQuery({
    queryKey: ['admin-equipo', equipoId],
    queryFn: () => getEquipo(equipoId).then((r) => r.data.data),
  })

  const { data: usuarios } = useQuery({
    queryKey: ['admin-usuarios-search', searchUser],
    queryFn: () => getUsuarios({ search: searchUser || undefined, limit: 10 }).then((r) => r.data.data.items),
    enabled: showAddMember,
  })

  const asignarMutation = useMutation({
    mutationFn: () => asignarMiembro(equipoId, { usuarioId: selectedUserId, rol: selectedRol }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-equipo', equipoId] })
      toast({ title: 'Miembro asignado' })
      setShowAddMember(false)
      setSelectedUserId(null)
    },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, variant: 'destructive' }),
  })

  const cambiarRolMutation = useMutation({
    mutationFn: ({ miembroId, activo, rol }) => updateMembresia(equipoId, miembroId, { activo, rol }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-equipo', equipoId] }),
    onError: () => toast({ title: 'Error al actualizar miembro', variant: 'destructive' }),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            {equipo && (
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: equipo.color }} />
            )}
            <h2 className="font-semibold">{equipo?.nombre ?? 'Cargando…'}</h2>
          </div>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: 'Comunidades', val: equipo?._count?.comunidades },
                  { label: 'Talleres', val: equipo?._count?.talleres },
                  { label: 'Actividades', val: equipo?._count?.actividades },
                ].map(({ label, val }) => (
                  <div key={label} className="rounded-lg border p-3">
                    <p className="text-xl font-bold">{val ?? 0}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    Miembros ({equipo?.miembros?.length ?? 0})
                  </p>
                  <button
                    onClick={() => setShowAddMember((p) => !p)}
                    className="text-xs text-primary flex items-center gap-1 hover:underline"
                  >
                    <UserPlus className="h-3 w-3" />
                    Agregar
                  </button>
                </div>

                {showAddMember && (
                  <div className="border rounded-lg p-3 space-y-2 mb-3 bg-muted/30">
                    <Input
                      placeholder="Buscar usuario…"
                      value={searchUser}
                      onChange={(e) => { setSearchUser(e.target.value); setSelectedUserId(null) }}
                      className="text-sm"
                    />
                    {usuarios?.length > 0 && (
                      <div className="border rounded divide-y max-h-32 overflow-y-auto text-sm">
                        {usuarios.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => setSelectedUserId(u.id)}
                            className={cn(
                              'w-full text-left px-3 py-1.5 hover:bg-accent transition-colors',
                              selectedUserId === u.id && 'bg-primary/10'
                            )}
                          >
                            {u.nombre} <span className="text-muted-foreground text-xs">— {u.email}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <select
                        value={selectedRol}
                        onChange={(e) => setSelectedRol(e.target.value)}
                        className="flex-1 rounded-md border bg-background px-2 py-1.5 text-sm"
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{ROLES_LABEL[r]}</option>)}
                      </select>
                      <Button
                        size="sm"
                        disabled={!selectedUserId || asignarMutation.isPending}
                        onClick={() => asignarMutation.mutate()}
                      >
                        Asignar
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  {equipo?.miembros?.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 rounded-lg px-3 py-2 border hover:bg-muted/30 transition-colors">
                      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                        {m.usuario.nombre?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.usuario.nombre}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.usuario.email}</p>
                      </div>
                      <select
                        value={m.rol}
                        onChange={(e) => cambiarRolMutation.mutate({ miembroId: m.id, rol: e.target.value })}
                        className="text-xs rounded border bg-background px-1.5 py-1"
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{ROLES_LABEL[r]}</option>)}
                      </select>
                      <button
                        onClick={() => cambiarRolMutation.mutate({ miembroId: m.id, activo: !m.activo })}
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-medium transition-colors',
                          m.activo
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-red-100 hover:text-red-600'
                            : 'bg-red-100 text-red-600 hover:bg-emerald-100 hover:text-emerald-700'
                        )}
                        title={m.activo ? 'Desactivar' : 'Activar'}
                      >
                        {m.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── PÁGINA ───────────────────────────────────────────────────────────────────

export default function AdminEquiposPage() {
  const [search, setSearch] = useState('')
  const [modalEquipo, setModalEquipo] = useState(null)
  const [detailEquipoId, setDetailEquipoId] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-equipos', search],
    queryFn: () => getEquipos({ search: search || undefined }).then((r) => r.data.data),
    placeholderData: (prev) => prev,
  })

  return (
    <div className="flex-1 overflow-y-auto">
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Equipos</h1>
          <p className="text-muted-foreground text-sm">{data?.total ?? '—'} registrados</p>
        </div>
        <Button onClick={() => setModalEquipo({})}>
          <Plus className="h-4 w-4 mr-2" /> Nuevo equipo
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4 h-28 animate-pulse" />
          ))
        ) : data?.items?.length === 0 ? (
          <div className="col-span-3 py-12 text-center text-muted-foreground">
            No se encontraron equipos
          </div>
        ) : (
          data?.items?.map((eq) => (
            <div
              key={eq.id}
              className="rounded-xl border bg-card p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow"
              style={{ borderLeftColor: eq.color, borderLeftWidth: 4 }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold truncate" style={{ color: eq.color }}>{eq.nombre}</p>
                  <p className="text-xs text-muted-foreground truncate">{eq.descripcion || 'Sin descripción'}</p>
                </div>
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-medium shrink-0',
                  eq.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                )}>
                  {eq.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{eq._count.miembros} miembros</span>
                <span>·</span>
                <span>{eq._count.comunidades} comunidades</span>
                <span>·</span>
                <span>{eq._count.talleres} talleres</span>
              </div>

              <div className="flex items-center gap-1 pt-1">
                <button
                  onClick={() => setModalEquipo(eq)}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded border hover:bg-accent transition-colors"
                >
                  <Pencil className="h-3 w-3" /> Editar
                </button>
                <button
                  onClick={() => setDetailEquipoId(eq.id)}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded border hover:bg-accent transition-colors ml-auto"
                >
                  Miembros <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {modalEquipo !== null && (
        <EquipoModal
          equipo={modalEquipo?.id ? modalEquipo : null}
          onClose={() => setModalEquipo(null)}
        />
      )}

      {detailEquipoId && (
        <EquipoDetailModal
          equipoId={detailEquipoId}
          onClose={() => setDetailEquipoId(null)}
        />
      )}
    </div>
    </div>
  )
}
