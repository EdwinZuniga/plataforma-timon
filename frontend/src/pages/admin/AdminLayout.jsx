import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { LayoutDashboard, Users, Building2, ShieldCheck, LogOut, ChevronLeft, KeyRound } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/button'

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Panel general', exact: true },
  { to: '/admin/usuarios', icon: Users, label: 'Usuarios' },
  { to: '/admin/equipos', icon: Building2, label: 'Equipos' },
  { to: '/admin/permisos', icon: KeyRound, label: 'Permisos' },
]

function NavItem({ to, icon: Icon, label, exact }) {
  const { pathname } = useLocation()
  const active = exact ? pathname === to : pathname.startsWith(to)
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-violet-700/10 text-violet-700'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  )
}

export default function AdminLayout() {
  const { usuario, logout } = useAuthStore()
  const navigate = useNavigate()

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="flex flex-col w-64 border-r bg-card shrink-0">
        <div className="flex items-center gap-2 px-4 py-4 border-b">
          <ShieldCheck className="h-5 w-5 text-violet-600 shrink-0" />
          <div>
            <p className="font-semibold text-sm text-violet-700">SuperAdmin</p>
            <p className="text-xs text-muted-foreground truncate">{usuario?.email}</p>
          </div>
        </div>

        <div className="px-3 pt-3 pb-1">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1"
          >
            <ChevronLeft className="h-3 w-3" />
            Volver a la plataforma
          </button>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => <NavItem key={item.to} {...item} />)}
        </nav>

        <div className="border-t p-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden flex flex-col min-h-0">
        <Outlet />
      </main>
    </div>
  )
}
