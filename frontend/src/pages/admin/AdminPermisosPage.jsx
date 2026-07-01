import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUsuarios, getPermisosUsuario, savePermisosMembresia, clearPermisosMembresia } from '@/api/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { Search, ShieldCheck, RotateCcw, Save, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/utils/cn'

// ─── CATÁLOGO DE MÓDULOS ──────────────────────────────────────────────────────

const MODULOS = [
  { key: 'comunidades', label: 'Comunidades' },
  { key: 'hermanos', label: 'Hermanos' },
  { key: 'actividades', label: 'Actividades' },
  { key: 'reuniones', label: 'Reuniones' },
  { key: 'talleres', label: 'Talleres' },
  { key: 'servicios', label: 'Servicios' },
  { key: 'equipos', label: 'Equipos' },
]

const ACCIONES = [
  { key: 'ver', label: 'Ver' },
  { key: 'crear', label: 'Crear' },
  { key: 'editar', label: 'Editar' },
  { key: 'eliminar', label: 'Eliminar' },
]

// ─── MATRIZ DE PERMISOS POR MEMBRESÍA ─────────────────────────────────────────

function buildDefaultPermisos() {
  return MODULOS.map(({ key }) => ({
    modulo: key,
    ver: true,
    crear: false,
    editar: false,
    eliminar: false,
  }))
}

function mergePermisos(existentes) {
  const map = Object.fromEntries(existentes.map((p) => [p.modulo, p]))
  return MODULOS.map(({ key }) =>
    map[key] ?? { modulo: key, ver: true, crear: false, editar: false, eliminar: false }
  )
}

function PermisoMatrix({ miembro, onClose }) {
  const qc = useQueryClient()
  const { toast } = useToast()

  // Local state for editable permissions
  const [permisos, setPermisos] = useState(buildDefaultPermisos())
  const [hasExplicit, setHasExplicit] = useState(false)

  const { data: userData, isLoading } = useQuery({
    queryKey: ['admin-permisos-usuario', miembro.usuario.id],
    queryFn: () => getPermisosUsuario(miembro.usuario.id).then((r) => r.data.data),
  })

  useEffect(() => {
    if (!userData) return
    const memberData = userData.find((m) => m.id === miembro.id)
    if (memberData?.permisos?.length > 0) {
      setPermisos(mergePermisos(memberData.permisos))
      setHasExplicit(true)
    } else {
      setPermisos(buildDefaultPermisos())
      setHasExplicit(false)
    }
  }, [userData, miembro.id])

  const saveMutation = useMutation({
    mutationFn: () => savePermisosMembresia(miembro.id, permisos),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-permisos-usuario', miembro.usuario.id] })
      toast({ title: 'Permisos guardados' })
      setHasExplicit(true)
    },
    onError: () => toast({ title: 'Error al guardar permisos', variant: 'destructive' }),
  })

  const clearMutation = useMutation({
    mutationFn: () => clearPermisosMembresia(miembro.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-permisos-usuario', miembro.usuario.id] })
      toast({ title: 'Permisos restablecidos — el rol controla el acceso' })
      setPermisos(buildDefaultPermisos())
      setHasExplicit(false)
    },
    onError: () => toast({ title: 'Error al restablecer permisos', variant: 'destructive' }),
  })

  const toggle = (modulo, accion) => {
    setPermisos((prev) =>
      prev.map((p) => p.modulo === modulo ? { ...p, [accion]: !p[accion] } : p)
    )
  }

  const toggleRow = (modulo, checked) => {
    setPermisos((prev) =>
      prev.map((p) =>
        p.modulo === modulo
          ? { ...p, ver: checked, crear: checked, editar: checked, eliminar: checked }
          : p
      )
    )
  }

  const toggleCol = (accion, checked) => {
    setPermisos((prev) => prev.map((p) => ({ ...p, [accion]: checked })))
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-10">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header usuario seleccionado */}
      <div className="px-6 py-4 border-b flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-sm font-bold shrink-0">
            {miembro.usuario.nombre?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-semibold">{miembro.usuario.nombre}</p>
            <p className="text-xs text-muted-foreground">
              {miembro.equipo.nombre} · <span className="capitalize">{miembro.rol.toLowerCase()}</span>
              {hasExplicit && (
                <span className="ml-2 text-violet-600 font-medium">· Permisos configurados</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasExplicit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearMutation.mutate()}
              disabled={clearMutation.isPending}
              className="text-muted-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Restablecer
            </Button>
          )}
          <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {saveMutation.isPending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </div>

      {/* Nota informativa */}
      {!hasExplicit && (
        <div className="mx-6 mt-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-800">
          Sin configuración explícita — el acceso se rige por el rol <strong>{miembro.rol}</strong>. Guarda los permisos para aplicar restricciones o ampliar acceso.
        </div>
      )}

      {/* Tabla de permisos */}
      <div className="flex-1 overflow-auto p-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4 font-medium text-muted-foreground w-40">Módulo</th>
              {ACCIONES.map(({ key, label }) => (
                <th key={key} className="py-3 px-4 text-center font-medium">
                  <div className="flex flex-col items-center gap-1">
                    {label}
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={permisos.every((p) => p[key])}
                      onChange={(e) => toggleCol(key, e.target.checked)}
                      title={`Toggle todos: ${label}`}
                    />
                  </div>
                </th>
              ))}
              <th className="py-3 px-4 text-center font-medium text-muted-foreground text-xs">Todo</th>
            </tr>
          </thead>
          <tbody>
            {permisos.map(({ modulo, ver, crear, editar, eliminar }) => {
              const allChecked = ver && crear && editar && eliminar
              const rowVals = { ver, crear, editar, eliminar }
              return (
                <tr key={modulo} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-3.5 px-4 font-medium">
                    {MODULOS.find((m) => m.key === modulo)?.label ?? modulo}
                  </td>
                  {ACCIONES.map(({ key }) => (
                    <td key={key} className="py-3.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={rowVals[key]}
                        onChange={() => toggle(modulo, key)}
                        className={cn(
                          'rounded cursor-pointer h-4 w-4',
                          key === 'eliminar' ? 'accent-red-500' : 'accent-violet-600'
                        )}
                      />
                    </td>
                  ))}
                  <td className="py-3.5 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={(e) => toggleRow(modulo, e.target.checked)}
                      className="rounded cursor-pointer h-4 w-4 accent-violet-600"
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── PANEL USUARIO EN EQUIPO ──────────────────────────────────────────────────

function UserMembershipItem({ membership, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-2',
        selected ? 'bg-violet-100 text-violet-800' : 'hover:bg-accent'
      )}
    >
      <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: membership.equipo.color }} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{membership.equipo.nombre}</p>
        <p className="text-xs text-muted-foreground capitalize">{membership.rol.toLowerCase()}</p>
      </div>
      {membership.permisos?.length > 0 && (
        <ShieldCheck className="h-3.5 w-3.5 text-violet-500 shrink-0" title="Permisos configurados" />
      )}
    </button>
  )
}

function UserItem({ user, selected, onClick, expanded, onToggleExpand, selectedMembership, onSelectMembership }) {
  const { data: membresias, isLoading } = useQuery({
    queryKey: ['admin-permisos-usuario', user.id],
    queryFn: () => getPermisosUsuario(user.id).then((r) => r.data.data),
    enabled: expanded,
  })

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors',
          selected ? 'bg-violet-50' : 'hover:bg-accent'
        )}
        onClick={onClick}
      >
        <div className="h-7 w-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0">
          {user.nombre?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{user.nombre}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleExpand() }}
          className="p-0.5 text-muted-foreground hover:text-foreground"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {expanded && (
        <div className="ml-4 mt-1 space-y-0.5 border-l pl-3 pb-1">
          {isLoading ? (
            <div className="py-2 text-xs text-muted-foreground">Cargando equipos…</div>
          ) : membresias?.length === 0 ? (
            <div className="py-2 text-xs text-muted-foreground">Sin membresías activas</div>
          ) : (
            membresias?.map((m) => (
              <UserMembershipItem
                key={m.id}
                membership={m}
                selected={selectedMembership?.id === m.id}
                onClick={() => onSelectMembership({ ...m, usuario: user })}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────

export default function AdminPermisosPage() {
  const [search, setSearch] = useState('')
  const [expandedUserId, setExpandedUserId] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedMembership, setSelectedMembership] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-usuarios-permisos', search],
    queryFn: () => getUsuarios({ search: search || undefined, limit: 50 }).then((r) => r.data.data),
    placeholderData: (prev) => prev,
  })

  const handleSelectUser = (user) => {
    setSelectedUser(user)
    setSelectedMembership(null)
    setExpandedUserId(expandedUserId === user.id ? null : user.id)
  }

  const handleSelectMembership = (membership) => {
    setSelectedMembership(membership)
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Panel izquierdo — lista de usuarios */}
      <div className="w-72 border-r flex flex-col shrink-0">
        <div className="px-4 pt-5 pb-3 border-b">
          <h2 className="font-semibold mb-3">Permisos por usuario</h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar usuario…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-11 rounded-lg bg-muted animate-pulse mx-1" />
            ))
          ) : data?.items?.length === 0 ? (
            <p className="text-xs text-muted-foreground px-3 py-4">Sin resultados</p>
          ) : (
            data?.items?.map((user) => (
              <UserItem
                key={user.id}
                user={user}
                selected={selectedUser?.id === user.id}
                expanded={expandedUserId === user.id}
                onClick={() => handleSelectUser(user)}
                onToggleExpand={() =>
                  setExpandedUserId(expandedUserId === user.id ? null : user.id)
                }
                selectedMembership={selectedMembership}
                onSelectMembership={handleSelectMembership}
              />
            ))
          )}
        </div>
      </div>

      {/* Panel derecho — matriz de permisos */}
      {!selectedMembership ? (
        <div className="flex-1 flex items-center justify-center text-center p-10">
          <div>
            <ShieldCheck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-medium text-muted-foreground">Selecciona un usuario y su equipo</p>
            <p className="text-sm text-muted-foreground mt-1">
              Expande un usuario en el panel izquierdo y selecciona un equipo para configurar sus permisos
            </p>
          </div>
        </div>
      ) : (
        <PermisoMatrix
          key={`${selectedMembership.id}`}
          miembro={selectedMembership}
          onClose={() => setSelectedMembership(null)}
        />
      )}
    </div>
  )
}
