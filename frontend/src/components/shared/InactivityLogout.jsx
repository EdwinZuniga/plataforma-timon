import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Clock } from 'lucide-react'

const IDLE_TIMEOUT_MS = 15 * 60 * 1000 // igual al tiempo de vida del access token
const WARNING_MS = 60 * 1000 // aviso 1 minuto antes de cerrar sesión
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']

export function InactivityLogout() {
  const usuario = useAuthStore((s) => s.usuario)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const { toast } = useToast()
  const [secondsLeft, setSecondsLeft] = useState(null)
  const lastActivityRef = useRef(Date.now())

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
    setSecondsLeft(null)
  }, [])

  useEffect(() => {
    if (!usuario) return

    resetActivity()
    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, resetActivity, { passive: true }))

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current

      if (elapsed >= IDLE_TIMEOUT_MS) {
        clearInterval(interval)
        logout()
        navigate('/login', { replace: true })
        toast({ title: 'Sesión cerrada', description: 'Se cerró tu sesión por inactividad.', variant: 'destructive' })
        return
      }

      if (elapsed >= IDLE_TIMEOUT_MS - WARNING_MS) {
        setSecondsLeft(Math.ceil((IDLE_TIMEOUT_MS - elapsed) / 1000))
      }
    }, 1000)

    return () => {
      clearInterval(interval)
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, resetActivity))
    }
  }, [usuario, logout, navigate, toast, resetActivity])

  if (!usuario || secondsLeft === null) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/50">
      <div className="bg-card rounded-t-2xl md:rounded-xl w-full max-w-sm shadow-xl p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5 h-9 w-9 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="font-semibold text-base">¿Sigues ahí?</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Tu sesión se cerrará por inactividad en {secondsLeft}s.
            </p>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button className="flex-1" onClick={resetActivity}>Seguir conectado</Button>
        </div>
      </div>
    </div>
  )
}
