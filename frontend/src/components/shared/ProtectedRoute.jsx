import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { PageSpinner } from '@/components/ui/spinner'

// Solo esperamos (spinner) el /auth/refresh de arranque si este dispositivo ya
// tuvo sesión. En un primer uso vamos directo al login sin bloquear.
function esperandoArranque({ isLoading, sesionProbable }) {
  return isLoading && sesionProbable
}

export function ProtectedRoute({ children }) {
  const estado = useAuthStore()
  if (esperandoArranque(estado)) return <PageSpinner />
  if (!estado.usuario) return <Navigate to="/login" replace />
  return children ?? <Outlet />
}

export function EquipoRoute({ children }) {
  const estado = useAuthStore()
  if (esperandoArranque(estado)) return <PageSpinner />
  if (!estado.usuario) return <Navigate to="/login" replace />
  if (!estado.equipoActual) return <Navigate to="/seleccionar-equipo" replace />
  return children ?? <Outlet />
}

export function SuperAdminRoute({ children }) {
  const estado = useAuthStore()
  if (esperandoArranque(estado)) return <PageSpinner />
  if (!estado.usuario) return <Navigate to="/login" replace />
  if (!estado.usuario.superAdmin) return <Navigate to="/dashboard" replace />
  return children ?? <Outlet />
}
