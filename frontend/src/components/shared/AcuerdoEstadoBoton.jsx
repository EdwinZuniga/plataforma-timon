import { ESTADOS_ACUERDO, siguienteEstado } from '@/utils/acuerdos'

// Botón con el ícono del estado del acuerdo; cada clic pasa al siguiente estado.
export function AcuerdoEstadoBoton({ estado, onCambiar, disabled }) {
  const meta = ESTADOS_ACUERDO[estado] || ESTADOS_ACUERDO.PENDIENTE
  const Icon = meta.icon
  return (
    <button
      type="button"
      className="min-h-0 h-auto p-0 mt-0.5 shrink-0 disabled:opacity-50"
      disabled={disabled}
      title={`${meta.label} — clic para cambiar`}
      aria-label={`Estado: ${meta.label}. Cambiar a ${ESTADOS_ACUERDO[siguienteEstado(estado)].label}`}
      onClick={() => onCambiar(siguienteEstado(estado))}
    >
      <Icon className={`h-5 w-5 ${meta.color}`} />
    </button>
  )
}
