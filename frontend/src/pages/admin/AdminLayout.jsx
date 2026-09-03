import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { LayoutDashboard, Users, Building2, ShieldCheck, LogOut, ChevronLeft, KeyRound, Menu, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/button'

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Panel general', exact: true },
  { to: '/admin/usuarios', icon: Users, label: 'Usuarios' },
  { to: '/admin/equipos', icon: Building2, label: 'Equipos' },
  { to: '/admin/permisos', icon: KeyRound, label: 'Permisos' },
]

function NavItem({ to, icon: Icon, label, exact, onClick }) {
  const { pathname } = useLocation()
  const active = exact ? pathname === to : pathname.startsWith(to)
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors min-h-[44px]',
        active
          ? 'bg-violet-700/10 text-violet-700 dark:text-violet-400'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  )
}

function SidebarContent({ usuario, logout, navigate, onNavigate }) {
  return (
    <>
      <div className="flex items-center gap-2 px-4 py-4 border-b">
        <ShieldCheck className="h-5 w-5 text-violet-600 dark:text-violet-400 shrink-0" />
        <div className="min-w-0">
          <p className="font-semibold text-sm text-violet-700 dark:text-violet-400">SuperAdmin</p>
          <p className="text-xs text-muted-foreground truncate">{usuario?.email}</p>
        </div>
      </div>

      <div className="px-3 pt-3 pb-1">
        <button
          onClick={() => { navigate('/dashboard'); onNavigate?.() }}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1"
        >
          <ChevronLeft className="h-3 w-3" />
          Volver a la plataforma
        </button>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => <NavItem key={item.to} {...item} onClick={onNavigate} />)}
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
    </>
  )
}

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { usuario, logout } = useAuthStore()
  const navigate = useNavigate()

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar escritorio */}
      <aside className="hidden md:flex flex-col w-64 border-r bg-card shrink-0">
        <SidebarContent usuario={usuario} logout={logout} navigate={navigate} />
      </aside>

      {/* Sidebar móvil overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="pt-safe absolute left-0 top-0 bottom-0 w-72 bg-card shadow-xl flex flex-col">
            <div className="flex items-center justify-end px-3 pt-3">
              <button onClick={() => setSidebarOpen(false)} className="min-h-0 h-auto p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarContent
              usuario={usuario}
              logout={logout}
              navigate={navigate}
              onNavigate={() => setSidebarOpen(false)}
            />
          </aside>
        </div>
      )}

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header móvil */}
        <header className="header-safe flex md:hidden items-center gap-3 px-4 py-3 border-b bg-card shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="min-h-0 h-auto p-1 -ml-1">
            <Menu className="h-5 w-5" />
          </button>
          <ShieldCheck className="h-4 w-4 text-violet-600 dark:text-violet-400 shrink-0" />
          <span className="font-semibold text-violet-700 dark:text-violet-400">SuperAdmin</span>
        </header>

        <main className="flex-1 overflow-hidden flex flex-col min-h-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
