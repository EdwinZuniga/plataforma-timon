import { useState } from 'react'
import { ConfirmModal } from '@/components/ui/confirm-modal'

// Intercepta el cierre de un modal: si hay cambios sin guardar pide confirmación antes de salir.
// Uso: const { cerrar, dialogo } = useConfirmarSalida(onClose, hayCambios); y renderizar {dialogo} dentro del modal.
export function useConfirmarSalida(onClose, hayCambios) {
  const [pidiendo, setPidiendo] = useState(false)

  const cerrar = () => (hayCambios ? setPidiendo(true) : onClose())

  const dialogo = pidiendo && (
    <ConfirmModal
      title="¿Seguro que quieres salir?"
      description="Perderás lo que ya hiciste y no se guardará."
      confirmLabel="Salir sin guardar"
      cancelLabel="Seguir editando"
      onConfirm={onClose}
      onCancel={() => setPidiendo(false)}
    />
  )

  return { cerrar, dialogo }
}
