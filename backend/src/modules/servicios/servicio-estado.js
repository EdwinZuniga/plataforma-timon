// Los servicios asignados pasan a FINALIZADO solos al día siguiente de su fecha;
// el estado no se guarda, se calcula. CONFIRMADO (heredado) se trata como ASIGNADO.

// Medianoche UTC del día actual en El Salvador (las fechas de actividad se guardan como fecha pura en UTC)
export const hoyElSalvador = () =>
  new Date(`${new Date().toLocaleDateString('en-CA', { timeZone: 'America/El_Salvador' })}T00:00:00.000Z`)

const ASIGNADOS = ['ASIGNADO', 'CONFIRMADO']

export const estadoEfectivo = (servicio, hoy = hoyElSalvador()) => {
  if (!ASIGNADOS.includes(servicio.estado)) return servicio.estado
  const fecha = servicio.actividad?.fecha
  return fecha && new Date(fecha) < hoy ? 'FINALIZADO' : 'ASIGNADO'
}

export const conEstadoEfectivo = (servicios) => {
  const hoy = hoyElSalvador()
  return servicios.map((s) => ({ ...s, estado: estadoEfectivo(s, hoy) }))
}

// Filtro Prisma para un estado efectivo
export const filtroEstado = (estado, hoy = hoyElSalvador()) => {
  switch (estado) {
    case 'ASIGNADO': return { estado: { in: ASIGNADOS }, actividad: { fecha: { gte: hoy } } }
    case 'FINALIZADO': return { estado: { in: ASIGNADOS }, actividad: { fecha: { lt: hoy } } }
    case undefined:
    case '': return {}
    default: return { estado }
  }
}
