import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { PageSpinner } from '@/components/ui/spinner'

export function ProtectedRoute({ children }) {
  const { usuario, isLoading } = useAuthStore()
  if (isLoading) return <PageSpinner />
  if (!usuario) return <Navigate to="/login" replace />
  return children ?? <Outlet />
}

export function EquipoRoute({ children }) {
  const { usuario, equipoActual, isLoading } = useAuthStore()
  if (isLoading) return <PageSpinner />
  if (!usuario) return <Navigate to="/login" replace />
  if (!equipoActual) return <Navigate to="/seleccionar-equipo" replace />
  return children ?? <Outlet />
}
