import prisma from '../../config/database.js'

const PAGE_SIZE = 20

const SERVICIO_INCLUDE = {
  actividad: { select: { id: true, nombre: true, fecha: true, lugar: true, tipo: true } },
  catalogoServicio: true,
  asignados: {
    include: {
      miembro: {
        select: {
          id: true,
          rol: true,
          nombreCorto: true,
          usuario: { select: { id: true, nombre: true } },
        },
      },
    },
  },
}

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
    include: SERVICIO_INCLUDE,
  })
}

export const listarTodos = async (equipoId, { estado, page = 1, origenOCR, anio, mes, catalogoServicioId }) => {
  const fechaWhere = {}
  if (anio) {
    const anioNum = parseInt(anio)
    if (mes) {
      const mesNum = parseInt(mes)
      const nextMes = mesNum === 12 ? 1 : mesNum + 1
      const nextAnio = mesNum === 12 ? anioNum + 1 : anioNum
      fechaWhere.fecha = {
        gte: new Date(`${anioNum}-${String(mesNum).padStart(2, '0')}-01T00:00:00Z`),
        lt: new Date(`${nextAnio}-${String(nextMes).padStart(2, '0')}-01T00:00:00Z`),
      }
    } else {
      fechaWhere.fecha = {
        gte: new Date(`${anioNum}-01-01T00:00:00Z`),
        lt: new Date(`${anioNum + 1}-01-01T00:00:00Z`),
      }
    }
  }

  const where = {
    actividad: { equipoId, ...fechaWhere },
    ...(estado && { estado }),
    ...(origenOCR !== undefined && { origenOCR: origenOCR === 'true' || origenOCR === true }),
    ...(catalogoServicioId && { catalogoServicioId: parseInt(catalogoServicioId) }),
  }

  const [total, data] = await Promise.all([
    prisma.servicioActividad.count({ where }),
    prisma.servicioActividad.findMany({
      where,
      include: SERVICIO_INCLUDE,
      orderBy: [{ actividad: { fecha: 'desc' } }, { createdAt: 'desc' }],
      skip: (parseInt(page) - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ])

  return { data, pagination: { page: parseInt(page), limit: PAGE_SIZE, total, pages: Math.ceil(total / PAGE_SIZE) } }
}

export const asignarMiembro = async (equipoId, servicioId, miembroId) => {
  const servicio = await prisma.servicioActividad.findFirst({
    where: { id: servicioId, actividad: { equipoId } },
  })
  if (!servicio) throw { status: 404, message: 'Servicio no encontrado', code: 'SERVICIO_NO_ENCONTRADO' }

  const miembro = await prisma.miembroEquipo.findFirst({
    where: { id: miembroId, equipoId, activo: true },
  })
  if (!miembro) throw { status: 403, message: 'Solo miembros del Equipo Timón pueden ser asignados', code: 'MIEMBRO_NO_DEL_EQUIPO' }

  await prisma.servicioAsignado.upsert({
    where: { servicioActividadId_miembroId: { servicioActividadId: servicioId, miembroId } },
    update: {},
    create: { servicioActividadId: servicioId, miembroId },
  })

  return prisma.servicioActividad.update({
    where: { id: servicioId },
    data: { estado: 'ASIGNADO' },
    include: SERVICIO_INCLUDE,
  })
}

export const desasignarMiembro = async (equipoId, servicioId, miembroId) => {
  const servicio = await prisma.servicioActividad.findFirst({
    where: { id: servicioId, actividad: { equipoId } },
  })
  if (!servicio) throw { status: 404, message: 'Servicio no encontrado', code: 'SERVICIO_NO_ENCONTRADO' }

  await prisma.servicioAsignado.deleteMany({
    where: { servicioActividadId: servicioId, miembroId },
  })

  const restantes = await prisma.servicioAsignado.count({ where: { servicioActividadId: servicioId } })

  return prisma.servicioActividad.update({
    where: { id: servicioId },
    data: { estado: restantes > 0 ? 'ASIGNADO' : 'PENDIENTE' },
    include: SERVICIO_INCLUDE,
  })
}

export const confirmarServicio = async (equipoId, servicioId) => {
  const servicio = await prisma.servicioActividad.findFirst({
    where: { id: servicioId, actividad: { equipoId } },
  })
  if (!servicio) throw { status: 404, message: 'Servicio no encontrado', code: 'SERVICIO_NO_ENCONTRADO' }
  return prisma.servicioActividad.update({ where: { id: servicioId }, data: { estado: 'CONFIRMADO' } })
}

export const finalizarServicio = async (equipoId, servicioId) => {
  const servicio = await prisma.servicioActividad.findFirst({
    where: { id: servicioId, actividad: { equipoId } },
  })
  if (!servicio) throw { status: 404, message: 'Servicio no encontrado', code: 'SERVICIO_NO_ENCONTRADO' }
  if (servicio.estado !== 'CONFIRMADO') throw { status: 400, message: 'Solo servicios confirmados pueden finalizarse', code: 'ESTADO_INVALIDO' }
  return prisma.servicioActividad.update({ where: { id: servicioId }, data: { estado: 'FINALIZADO' } })
}

export const reabrirServicio = async (equipoId, servicioId) => {
  const servicio = await prisma.servicioActividad.findFirst({
    where: { id: servicioId, actividad: { equipoId } },
  })
  if (!servicio) throw { status: 404, message: 'Servicio no encontrado', code: 'SERVICIO_NO_ENCONTRADO' }
  if (servicio.estado !== 'FINALIZADO') throw { status: 400, message: 'Solo servicios finalizados pueden reabrirse', code: 'ESTADO_INVALIDO' }
  return prisma.servicioActividad.update({ where: { id: servicioId }, data: { estado: 'CONFIRMADO' } })
}

export const editarServicio = async (equipoId, servicioId, body) => {
  const servicio = await prisma.servicioActividad.findFirst({
    where: { id: servicioId, actividad: { equipoId } },
  })
  if (!servicio) throw { status: 404, message: 'Servicio no encontrado', code: 'SERVICIO_NO_ENCONTRADO' }

  const { catalogoServicioId, descripcion, horaServicio, comunidadSolicitante, actividadFecha, actividadLugar, actividadNombre } = body

  if (actividadNombre !== undefined || actividadFecha !== undefined || actividadLugar !== undefined) {
    const fechaObj = actividadFecha ? new Date(actividadFecha) : undefined
    await prisma.actividad.update({
      where: { id: servicio.actividadId },
      data: {
        ...(actividadNombre !== undefined && { nombre: actividadNombre }),
        ...(fechaObj && { fecha: fechaObj, anio: fechaObj.getUTCFullYear() }),
        ...(actividadLugar !== undefined && { lugar: actividadLugar }),
      },
    })
  }

  return prisma.servicioActividad.update({
    where: { id: servicioId },
    data: {
      ...(catalogoServicioId !== undefined && { catalogoServicioId }),
      ...(descripcion !== undefined && { descripcion }),
      ...(horaServicio !== undefined && { horaServicio }),
      ...(comunidadSolicitante !== undefined && { comunidadSolicitante }),
    },
    include: SERVICIO_INCLUDE,
  })
}

export const eliminarServicio = async (equipoId, servicioId) => {
  const servicio = await prisma.servicioActividad.findFirst({
    where: { id: servicioId, actividad: { equipoId } },
  })
  if (!servicio) throw { status: 404, message: 'Servicio no encontrado', code: 'SERVICIO_NO_ENCONTRADO' }

  await prisma.servicioAsignado.deleteMany({ where: { servicioActividadId: servicioId } })
  return prisma.servicioActividad.delete({ where: { id: servicioId } })
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
