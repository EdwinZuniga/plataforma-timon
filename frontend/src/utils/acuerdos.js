import { Circle, Clock, CheckCircle } from 'lucide-react'

export const ESTADOS_ACUERDO = {
  PENDIENTE: { label: 'Pendiente', icon: Circle, color: 'text-muted-foreground' },
  EN_PROCESO: { label: 'En proceso', icon: Clock, color: 'text-amber-500' },
  CUMPLIDO: { label: 'Cumplido', icon: CheckCircle, color: 'text-green-500' },
}

// Un clic en el ícono avanza: pendiente → en proceso → cumplido → pendiente
export const siguienteEstado = (estado) =>
  ({ PENDIENTE: 'EN_PROCESO', EN_PROCESO: 'CUMPLIDO', CUMPLIDO: 'PENDIENTE' })[estado] || 'PENDIENTE'

// Las fechas límite son fecha pura guardada en UTC
export const fmtFechaLimite = (d) =>
  new Date(d).toLocaleDateString('es-SV', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' })

// Medianoche UTC de hoy en El Salvador, en formato YYYY-MM-DD
export const hoyISO = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/El_Salvador' })

export const estaVencido = (a) =>
  a.estado !== 'CUMPLIDO' && !!a.fechaLimite && a.fechaLimite.slice(0, 10) < hoyISO()
