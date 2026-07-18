import prisma from '../../config/database.js'

export const obtenerDashboard = async (equipoId) => {
  const anioActual = new Date().getFullYear()

  const [
    totalComunidades,
    totalHermanos,
    actividadesAnio,
    talleres,
    serviciosPendientes,
    asistenciaTalleresMes,
    hermanosPorDepartamento,
  ] = await Promise.all([
    prisma.comunidad.count({ where: { estado: 'ACTIVA' } }),
    prisma.hermano.count({ where: { equipoId, activo: true } }),
    prisma.actividad.count({ where: { equipoId, anio: anioActual } }),
    prisma.taller.count({ where: { equipoId, activo: true } }),
    prisma.servicioActividad.count({ where: { actividad: { equipoId }, estado: 'PENDIENTE' } }),
    prisma.asistenciaMes.groupBy({
      by: ['mes'],
      where: {
        anio: anioActual,
        estado: 'PRESENTE',
        inscripcion: { edicionTaller: { taller: { equipoId } } },
      },
      _count: { id: true },
      orderBy: { mes: 'asc' },
    }),
    prisma.comunidad.groupBy({
      by: ['departamento'],
      where: { estado: 'ACTIVA' },
      _count: { id: true },
    }),
  ])

  const asistenciaPorMesData = Array.from({ length: 12 }, (_, i) => {
    const found = asistenciaTalleresMes.find((d) => d.mes === i + 1)
    return { mes: i + 1, total: found ? found._count.id : 0 }
  })

  return {
    metricas: {
      totalComunidades,
      totalHermanos,
      actividadesAnio,
      talleres,
      serviciosPendientes,
    },
    graficas: {
      asistenciaTalleresMes: asistenciaPorMesData,
      hermanosPorDepartamento: hermanosPorDepartamento.map((d) => ({
        departamento: d.departamento,
        total: d._count.id,
      })),
    },
  }
}

export const reporteActividad = async (equipoId, actividadId) => {
  const actividad = await prisma.actividad.findFirst({
    where: { id: actividadId, equipoId },
    include: {
      asistencias: {
        include: {
          hermano: {
            select: { nombre: true, apellido: true, telefono: true, comunidad: { select: { nombre: true, departamento: true } } },
          },
        },
      },
    },
  })
  if (!actividad) throw { status: 404, message: 'Actividad no encontrada', code: 'ACTIVIDAD_NO_ENCONTRADA' }

  const presentes = actividad.asistencias.filter((a) => a.presente)
  return {
    actividad: { id: actividad.id, nombre: actividad.nombre, fecha: actividad.fecha, tipo: actividad.tipo, lugar: actividad.lugar },
    totalInscritos: actividad.asistencias.length,
    totalPresentes: presentes.length,
    asistencias: actividad.asistencias.map((a) => ({
      nombre: a.hermano.nombre,
      apellido: a.hermano.apellido,
      comunidad: a.hermano.comunidad.nombre,
      departamento: a.hermano.comunidad.departamento,
      presente: a.presente,
    })),
  }
}

export const reporteHermano = async (equipoId, hermanoId) => {
  const hermano = await prisma.hermano.findFirst({
    where: { id: hermanoId, equipoId },
    include: {
      comunidad: true,
      inscripciones: { include: { edicionTaller: { include: { taller: true } } } },
      asistencias: { include: { actividad: true } },
    },
  })
  if (!hermano) throw { status: 404, message: 'Hermano no encontrado', code: 'HERMANO_NO_ENCONTRADO' }
  return hermano
}
