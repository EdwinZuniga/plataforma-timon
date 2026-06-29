import { createContext, useContext, useState, useCallback } from 'react'
import { cn } from '@/utils/cn'
import { X } from 'lucide-react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback(({ title, description, variant = 'default', duration = 4000 }) => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, title, description, variant }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="fixed bottom-20 md:bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'rounded-lg border p-4 shadow-lg flex items-start gap-3 animate-in slide-in-from-right',
              t.variant === 'destructive' ? 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800' : 'bg-card border-border'
            )}
          >
            <div className="flex-1">
              {t.title && <p className="font-semibold text-sm">{t.title}</p>}
              {t.description && <p className="text-sm text-muted-foreground mt-0.5">{t.description}</p>}
            </div>
            <button onClick={() => removeToast(t.id)} className="min-h-0 h-auto p-0 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider')
  return { toast: ctx }
}
