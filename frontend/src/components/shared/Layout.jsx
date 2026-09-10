import { useState } from 'react'
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { useThemeStore } from '@/stores/useThemeStore'
import {
  Home, Users, UserCheck, Calendar, FileText,
  ShipWheel, LogOut, Menu, X, ChevronRight,
  Wrench, BookOpen, MoreHorizontal, UserCircle, ShieldCheck, Landmark, Package,
  Sun, Moon,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/button'

// modulo: null = siempre visible (dashboard, equipos no tienen restricción de módulo)
const navItems = [
  { to: '/dashboard', icon: Home, label: 'Inicio', modulo: null },
  { to: '/comunidades', icon: Users, label: 'Comunidades', modulo: 'comunidades' },
  { to: '/hermanos', icon: UserCheck, label: 'Hermanos', modulo: 'hermanos' },
  { to: '/actividades', icon: Calendar, label: 'Actividades', modulo: 'actividades' },
  { to: '/reuniones', icon: FileText, label: 'Reuniones', modulo: 'reuniones' },
]

const moreItems = [
  { to: '/talleres', icon: BookOpen, label: 'Talleres', modulo: 'talleres' },
  { to: '/servicios', icon: Wrench, label: 'Servicios', modulo: 'servicios' },
  { to: '/tesoreria', icon: Landmark, label: 'Tesorería', modulo: 'tesoreria' },
  { to: '/inventario', icon: Package, label: 'Inventario', modulo: 'inventario' },
  { to: '/equipos', icon: ShipWheel, label: 'Miembros', modulo: null },
]

const bottomNavItems = [
  { to: '/dashboard', icon: Home, label: 'Inicio', modulo: null },
  { to: '/reuniones', icon: FileText, label: 'Reuniones', modulo: 'reuniones' },
  { to: '/talleres', icon: BookOpen, label: 'Talleres', modulo: 'talleres' },
  { to: '/servicios', icon: Wrench, label: 'Servicios', modulo: 'servicios' },
]

// Devuelve true si el usuario puede ver el módulo según sus permisos
function puedeVer(permisos, modulo) {
  if (!modulo) return true
  const p = permisos[modulo]
  return !p || p.ver // sin config explícita → visible
}

function NavLink({ to, icon: Icon, label, mobile }) {
  const { pathname } = useLocation()
  const active = pathname.startsWith(to)
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors min-h-[44px]',
        mobile ? 'flex-col gap-0.5 text-xs px-1 py-2 flex-1 justify-center' : '',
        active
          ? 'bg-primary-700/10 text-primary-700 dark:text-primary-500'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
    >
      <Icon className={cn('shrink-0', mobile ? 'h-5 w-5' : 'h-4 w-4')} />
      <span>{label}</span>
    </Link>
  )
}

function ThemeToggle({ className }) {
  const { theme, toggleTheme } = useThemeStore()
  const isDark = theme === 'dark'
  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors',
        className
      )}
    >
      {isDark ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
      {isDark ? 'Modo claro' : 'Modo oscuro'}
    </button>
  )
}

export function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { usuario, equipoActual, permisos, logout } = useAuthStore()
  const navigate = useNavigate()

  const visibleNavItems = navItems.filter((i) => puedeVer(permisos, i.modulo))
  const visibleMoreItems = moreItems.filter((i) => puedeVer(permisos, i.modulo))
  const visibleBottomItems = bottomNavItems.filter((i) => puedeVer(permisos, i.modulo))

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r bg-card shrink-0">
        <div
          className="flex items-center gap-2 px-4 py-4 border-b"
          style={{ borderLeftColor: 'var(--color-equipo)', borderLeftWidth: 4 }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Equipo activo</p>
            <p className="font-semibold truncate" style={{ color: 'var(--color-equipo)' }}>
              {equipoActual?.nombre || 'Sin equipo'}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => <NavLink key={item.to} {...item} />)}
          {visibleMoreItems.length > 0 && (
            <>
              <div className="pt-4 pb-1 px-3">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Más</p>
              </div>
              {visibleMoreItems.map((item) => <NavLink key={item.to} {...item} />)}
            </>
          )}
        </nav>

        <div className="border-t p-3">
          {usuario?.superAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-violet-700 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950/40 transition-colors mb-1"
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              Administración
            </button>
          )}
          <Link to="/perfil" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent transition-colors group">
            <div className="h-8 w-8 rounded-full bg-primary-700 text-white flex items-center justify-center text-xs font-bold shrink-0">
              {usuario?.nombre?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{usuario?.nombre}</p>
              <p className="text-xs text-muted-foreground truncate">{usuario?.email}</p>
            </div>
            <UserCircle className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
          <ThemeToggle className="w-full mt-1" />
          <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive mt-1" onClick={logout}>
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Sidebar móvil overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="pt-safe absolute left-0 top-0 bottom-0 w-72 bg-card shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-4 border-b">
              <span className="font-semibold" style={{ color: 'var(--color-equipo)' }}>
                {equipoActual?.nombre || 'Plataforma Timón'}
              </span>
              <button onClick={() => setSidebarOpen(false)} className="min-h-0 h-auto p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {[...visibleNavItems, ...visibleMoreItems].map((item) => (
                <NavLink key={item.to} {...item} />
              ))}
            </nav>
            <div className="border-t p-3 space-y-1">
              {usuario?.superAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-violet-700 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950/40 transition-colors"
                >
                  <ShieldCheck className="h-4 w-4" /> Administración
                </Link>
              )}
              <Link
                to="/perfil"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <UserCircle className="h-4 w-4" /> Mi perfil
              </Link>
              <ThemeToggle />
              <Button variant="ghost" className="w-full justify-start gap-2 text-destructive" onClick={logout}>
                <LogOut className="h-4 w-4" /> Cerrar sesión
              </Button>
            </div>
          </aside>
        </div>
      )}

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header móvil */}
        <header className="header-safe flex md:hidden items-center gap-3 px-4 py-3 border-b bg-card shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="min-h-0 h-auto p-1 -ml-1">
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold" style={{ color: 'var(--color-equipo)' }}>
            {equipoActual?.nombre || 'Plataforma Timón'}
          </span>
        </header>

        {/* Contenido principal */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children ?? <Outlet />}
        </main>

        {/* Bottom navigation móvil */}
        <nav className="bottomnav-safe flex md:hidden items-center border-t bg-card fixed bottom-0 left-0 right-0 z-30">
          {visibleBottomItems.map((item) => (
            <NavLink key={item.to} {...item} mobile />
          ))}
          <div className="flex-1">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex flex-col items-center gap-0.5 w-full py-1 text-xs text-muted-foreground"
            >
              <MoreHorizontal className="h-5 w-5" />
              <span>Más</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  )
}
