import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export function ConfirmModal({ title, description, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', variant = 'destructive', onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50" onClick={onCancel}>
      <div
        className="bg-card rounded-t-2xl md:rounded-xl w-full max-w-sm shadow-xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5 h-9 w-9 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            {title && <p className="font-semibold text-base">{title}</p>}
            {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={variant} className="flex-1" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}
