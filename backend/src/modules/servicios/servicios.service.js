import prisma from '../../config/database.js'

export const listarCatalogo = async (equipoId) => {
  return prisma.catalogoServicio.findMany({ where: { equipoId, activo: true }, orderBy: { nombre: 'asc' } })
}

export const crearCatalogo = async (equipoId, body) => {
  return prisma.catalogoServicio.create({ data: { ...body, equipoId } })
}

export const crearServicio = async (equipoId, actividadId, body) => {
  const actividad = await prisma.actividad.findFirst({ where: { id: actividadId, equipoId } })
  if (!actividad) throw { status: 404, message: 'Actividad no encontrada', code: 'ACTIVIDAD_NO_ENCONTRADA' }
  return prisma.servicioActividad.create({ data: { ...body, actividadId } })
}

export const listarServicios = async (equipoId, actividadId) => {
  return prisma.servicioActividad.findMany({
    where: { actividadId, actividad: { equipoId } },
    include: {
      catalogoServicio: true,
      asignados: {
        include: { hermano: { select: { id: true, nombre: true, apellido: true, comunidad: { select: { nombre: true } } } } },
      },
    },
  })
}

export const asignarHermano = async (equipoId, servicioId, hermanoId) => {
  const servicio = await prisma.servicioActividad.findFirst({
    where: { id: servicioId, actividad: { equipoId } },
  })
  if (!servicio) throw { status: 404, message: 'Servicio no encontrado', code: 'SERVICIO_NO_ENCONTRADO' }

  await prisma.servicioAsignado.upsert({
    where: { servicioActividadId_hermanoId: { servicioActividadId: servicioId, hermanoId } },
    update: {},
    create: { servicioActividadId: servicioId, hermanoId },
  })

  return prisma.servicioActividad.update({
    where: { id: servicioId },
    data: { estado: 'ASIGNADO' },
    include: { asignados: true },
  })
}

export const confirmarServicio = async (equipoId, servicioId) => {
  const servicio = await prisma.servicioActividad.findFirst({
    where: { id: servicioId, actividad: { equipoId } },
  })
  if (!servicio) throw { status: 404, message: 'Servicio no encontrado', code: 'SERVICIO_NO_ENCONTRADO' }
  return prisma.servicioActividad.update({ where: { id: servicioId }, data: { estado: 'CONFIRMADO' } })
}

export const pendientes = async (equipoId) => {
  return prisma.servicioActividad.findMany({
    where: { estado: 'PENDIENTE', actividad: { equipoId } },
    include: {
      actividad: { select: { id: true, nombre: true, fecha: true } },
      catalogoServicio: true,
    },
    orderBy: { actividad: { fecha: 'asc' } },
  })
}
