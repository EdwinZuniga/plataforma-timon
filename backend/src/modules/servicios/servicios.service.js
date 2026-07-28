import prisma from '../../config/database.js'

const PAGE_SIZE = 20

const MESES_ES = {
  ene: 0, enero: 0, feb: 1, febrero: 1, mar: 2, marzo: 2,
  abr: 3, abril: 3, may: 4, mayo: 4, jun: 5, junio: 5,
  jul: 6, julio: 6, ago: 7, agosto: 7, sep: 8, septiembre: 8, sept: 8,
  oct: 9, octubre: 9, nov: 10, noviembre: 10, dic: 11, diciembre: 11,
}

const TIPO_MAP = [
  [/retiro/i, 'RETIRO'],
  [/asamblea/i, 'ASAMBLEA'],
  [/encuentro/i, 'ENCUENTRO'],
  [/misi[oó]n/i, 'MISION'],
  [/formaci[oó]n/i, 'FORMACION'],
]

const parseFechaServicio = (fechaStr) => {
  if (!fechaStr) return new Date()
  const m1 = fechaStr.match(/(\d{1,2})\W+(\w+)\W+(\d{4})/)
  if (m1) {
    const mes = MESES_ES[m1[2].toLowerCase().substring(0, 3)]
    if (mes !== undefined) return new Date(parseInt(m1[3]), mes, parseInt(m1[1]))
  }
  const m2 = fechaStr.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i)
  if (m2) {
    const mes = MESES_ES[m2[2].toLowerCase().substring(0, 3)]
    if (mes !== undefined) return new Date(parseInt(m2[3]), mes, parseInt(m2[1]))
  }
  const d = new Date(fechaStr)
  return isNaN(d) ? new Date() : d
}

const detectarTipoActividad = (texto) => {
  for (const [patron, tipo] of TIPO_MAP) {
    if (patron.test(texto || '')) return tipo
  }
  return 'OTRO'
}

const SERVICIO_INCLUDE = {
  actividad: { select: { id: true, nombre: true, fecha: true, lugar: true, tipo: true } },
  catalogoServicio: true,
  comunidad: { select: { id: true, nombre: true } },
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

export const crearServicioCompleto = async (equipoId, datos) => {
  const {
    catalogoServicioId, comunidadId, miembroIds = [], descripcion, imagenCartaRuta,
    comunidadSolicitante, horaServicio, dirigidoA, fechaServicio, lugarServicio,
    origenOCR = false,
  } = datos

  if (!catalogoServicioId) {
    throw { status: 400, message: 'catalogoServicioId es requerido', code: 'DATOS_REQUERIDOS' }
  }
  if (!comunidadId) {
    throw { status: 400, message: 'La comunidad solicitante es requerida', code: 'DATOS_REQUERIDOS' }
  }

  const comunidad = await prisma.comunidad.findFirst({ where: { id: Number(comunidadId) } })
  if (!comunidad) throw { status: 404, message: 'Comunidad no encontrada', code: 'COMUNIDAD_NO_ENCONTRADA' }

  if (miembroIds.length > 0) {
    const ids = miembroIds.map(Number)
    const validos = await prisma.miembroEquipo.count({
      where: { id: { in: ids }, equipoId: Number(equipoId), activo: true },
    })
    if (validos !== ids.length) {
      throw { status: 403, message: 'Solo miembros del Equipo Timón pueden ser asignados', code: 'MIEMBRO_NO_DEL_EQUIPO' }
    }
  }

  const fecha = parseFechaServicio(fechaServicio)
  const nombreActividad = descripcion?.substring(0, 100) || `Servicio para ${comunidad.nombre}`

  const actividad = await prisma.actividad.create({
    data: {
      equipoId: Number(equipoId),
      nombre: nombreActividad,
      tipo: detectarTipoActividad(descripcion || ''),
      fecha,
      lugar: lugarServicio || null,
      descripcion: `Solicitado por: ${comunidad.nombre}`,
      anio: fecha.getFullYear(),
    },
  })

  const servicio = await prisma.servicioActividad.create({
    data: {
      actividadId: actividad.id,
      catalogoServicioId: Number(catalogoServicioId),
      descripcion: descripcion || null,
      origenOCR,
      imagenCartaRuta: imagenCartaRuta || null,
      estado: miembroIds.length > 0 ? 'ASIGNADO' : 'PENDIENTE',
      comunidadId: comunidad.id,
      comunidadSolicitante: comunidadSolicitante || comunidad.nombre,
      horaServicio: horaServicio || null,
      dirigidoA: dirigidoA || null,
    },
  })

  for (const mId of miembroIds.map(Number)) {
    await prisma.servicioAsignado.create({
      data: { servicioActividadId: servicio.id, miembroId: mId },
    })
  }

  return { actividad, servicio }
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
