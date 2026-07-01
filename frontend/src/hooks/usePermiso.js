import { useAuthStore } from '@/stores/useAuthStore'

const DEFAULTS = { ver: true, crear: true, editar: true, eliminar: true }

/**
 * Devuelve los permisos del usuario actual para un módulo.
 * Si es superAdmin o no hay config explícita → todos los permisos activos.
 */
export function usePermiso(modulo) {
  const { usuario, permisos } = useAuthStore()
  if (usuario?.superAdmin) return DEFAULTS
  return permisos[modulo] ?? DEFAULTS
}
