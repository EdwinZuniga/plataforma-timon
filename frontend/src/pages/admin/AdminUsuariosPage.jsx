import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { getUsuarios, createUsuario, updateUsuario, deleteUsuario } from '@/api/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Plus, Search, Pencil, Trash2, ShieldCheck, X, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/utils/cn'

const ROLES_LABEL = { COORDINADOR: 'Coordinador', ENLACE: 'Enlace', SECRETARIO: 'Secretario', CONSULTOR: 'Consultor' }
const ROLES = Object.keys(ROLES_LABEL)

// ─── MODAL USUARIO ────────────────────────────────────────────────────────────

function UsuarioModal({ usuario, onClose }) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const isEdit = !!usuario
  const [showPass, setShowPass] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      nombre: usuario?.nombre ?? '',
      email: usuario?.email ?? '',
      password: '',
      superAdmin: usuario?.superAdmin ?? false,
      activo: usuario?.activo ?? true,
    },
  })

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? updateUsuario(usuario.id, data) : createUsuario(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-usuarios'] })
      toast({ title: isEdit ? 'Usuario actualizado' : 'Usuario creado' })
      onClose()
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.response?.data?.error ?? 'Ocurrió un error', variant: 'destructive' })
    },
  })

  const onSubmit = (data) => {
    const payload = { ...data, superAdmin: data.superAdmin === true || data.superAdmin === 'true' }
    if (!payload.password) delete payload.password
    mutation.mutate(payload)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold">{isEdit ? 'Editar usuario' : 'Nuevo usuario'}</h2>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium">Nombre</label>
            <Input {...register('nombre', { required: 'Requerido' })} className="mt-1" />
            {errors.nombre && <p className="text-xs text-destructive mt-1">{errors.nombre.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium">Email</label>
            <Input type="email" {...register('email', { required: 'Requerido' })} className="mt-1" />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium">{isEdit ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}</label>
            <div className="relative mt-1">
              <Input
                type={showPass ? 'text' : 'password'}
                {...register('password', { required: !isEdit ? 'Requerido' : false })}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPass((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" {...register('superAdmin')} className="rounded" />
              <span className="text-sm font-medium flex items-center gap-1">
                <ShieldCheck className="h-4 w-4 text-violet-600" /> SuperAdmin
              </span>
            </label>
            {isEdit && (
              <label className="flex items-center gap-2 cursor-pointer select-none ml-auto">
                <input type="checkbox" {...register('activo')} className="rounded" />
                <span className="text-sm font-medium">Activo</span>
              </label>
            )}
          </div>

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

// ─── PÁGINA ───────────────────────────────────────────────────────────────────

export default function AdminUsuariosPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [modalUsuario, setModalUsuario] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-usuarios', search],
    queryFn: () => getUsuarios({ search: search || undefined }).then((r) => r.data.data),
    placeholderData: (prev) => prev,
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteUsuario(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-usuarios'] })
      toast({ title: 'Usuario desactivado' })
      setDeleteTarget(null)
    },
    onError: () => toast({ title: 'Error al desactivar', variant: 'destructive' }),
  })

  return (
    <div className="flex-1 overflow-y-auto">
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-muted-foreground text-sm">{data?.total ?? '—'} registrados</p>
        </div>
        <Button onClick={() => setModalUsuario({})}>
          <Plus className="h-4 w-4 mr-2" /> Nuevo usuario
        </Button>
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
              <th className="text-left px-4 py-3 font-medium">Nombre</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Email</th>
              <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Equipos</th>
              <th className="text-left px-4 py-3 font-medium">Estado</th>
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
                  No se encontraron usuarios
                </td>
              </tr>
            ) : (
              data?.items?.map((u) => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {u.nombre?.[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium">{u.nombre}</span>
                      {u.superAdmin && (
                        <ShieldCheck className="h-3.5 w-3.5 text-violet-600 shrink-0" title="SuperAdmin" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{u.email}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {u.equipos?.slice(0, 3).map((m) => (
                        <span
                          key={m.id}
                          className="text-xs px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: m.equipo.color + '20', color: m.equipo.color }}
                        >
                          {m.equipo.nombre}
                        </span>
                      ))}
                      {u.equipos?.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{u.equipos.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      u.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                    )}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setModalUsuario(u)}
                        className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(u)}
                        className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-destructive transition-colors"
                        disabled={!u.activo}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalUsuario !== null && (
        <UsuarioModal
          usuario={modalUsuario?.id ? modalUsuario : null}
          onClose={() => setModalUsuario(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Desactivar usuario"
          description={`¿Desactivar a "${deleteTarget.nombre}"? No podrá iniciar sesión.`}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteMutation.isPending}
        />
      )}
    </div>
    </div>
  )
}
