import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/useAuthStore'
import { useThemeStore } from '@/stores/useThemeStore'
import { syncStatusBar } from '@/utils/statusBar'
import { ToastProvider } from '@/components/ui/toast'
import { Layout } from '@/components/shared/Layout'
import { InactivityLogout } from '@/components/shared/InactivityLogout'
import { ProtectedRoute, EquipoRoute, SuperAdminRoute } from '@/components/shared/ProtectedRoute'

import AdminLayout from '@/pages/admin/AdminLayout'
import AdminPage from '@/pages/admin/AdminPage'
import AdminUsuariosPage from '@/pages/admin/AdminUsuariosPage'
import AdminEquiposPage from '@/pages/admin/AdminEquiposPage'
import AdminPermisosPage from '@/pages/admin/AdminPermisosPage'
import AdminSesionesPage from '@/pages/admin/AdminSesionesPage'
import LoginPage from '@/pages/auth/LoginPage'
import SeleccionarEquipoPage from '@/pages/auth/SeleccionarEquipoPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import ComunidadesPage from '@/pages/comunidades/ComunidadesPage'
import ComunidadDetailPage from '@/pages/comunidades/ComunidadDetailPage'
import HermanosPage from '@/pages/hermanos/HermanosPage'
import HermanoDetailPage from '@/pages/hermanos/HermanoDetailPage'
import ActividadesPage from '@/pages/actividades/ActividadesPage'
import ActividadDetailPage from '@/pages/actividades/ActividadDetailPage'
import ReunionesPage from '@/pages/reuniones/ReunionesPage'
import ReunionDetailPage from '@/pages/reuniones/ReunionDetailPage'
import TalleresPage from '@/pages/talleres/TalleresPage'
import TallerDetailPage from '@/pages/talleres/TallerDetailPage'
import TallerEdicionPage from '@/pages/talleres/TallerEdicionPage'
import ServiciosPage from '@/pages/servicios/ServiciosPage'
import EquiposPage from '@/pages/equipos/EquiposPage'
import PerfilPage from '@/pages/perfil/PerfilPage'
import TesoreriaPage from '@/pages/tesoreria/TesoreriaPage'
import InventarioPage from '@/pages/inventario/InventarioPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
    },
  },
})

function AppRoutes() {
  const { initializeAuth } = useAuthStore()

  useEffect(() => {
    initializeAuth()
    // Re-aplica el ajuste de barra de estado cuando el bridge nativo ya está listo.
    syncStatusBar(useThemeStore.getState().theme)
  }, [])

  return (
    <>
      <InactivityLogout />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/seleccionar-equipo" element={<ProtectedRoute><SeleccionarEquipoPage /></ProtectedRoute>} />

        <Route element={<SuperAdminRoute><AdminLayout /></SuperAdminRoute>}>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/usuarios" element={<AdminUsuariosPage />} />
          <Route path="/admin/equipos" element={<AdminEquiposPage />} />
          <Route path="/admin/permisos" element={<AdminPermisosPage />} />
          <Route path="/admin/sesiones" element={<AdminSesionesPage />} />
        </Route>

        <Route element={<EquipoRoute><Layout><Outlet /></Layout></EquipoRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/comunidades" element={<ComunidadesPage />} />
          <Route path="/comunidades/:id" element={<ComunidadDetailPage />} />
          <Route path="/hermanos" element={<HermanosPage />} />
          <Route path="/hermanos/:id" element={<HermanoDetailPage />} />
          <Route path="/actividades" element={<ActividadesPage />} />
          <Route path="/actividades/:id" element={<ActividadDetailPage />} />
          <Route path="/reuniones" element={<ReunionesPage />} />
          <Route path="/reuniones/:id" element={<ReunionDetailPage />} />
          <Route path="/talleres" element={<TalleresPage />} />
          <Route path="/talleres/:id" element={<TallerDetailPage />} />
          <Route path="/talleres/:id/ediciones/:edicionId" element={<TallerEdicionPage />} />
          <Route path="/servicios" element={<ServiciosPage />} />
          <Route path="/equipos" element={<EquiposPage />} />
          <Route path="/tesoreria" element={<TesoreriaPage />} />
          <Route path="/inventario" element={<InventarioPage />} />
          <Route path="/perfil" element={<PerfilPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}
