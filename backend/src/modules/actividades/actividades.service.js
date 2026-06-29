import prisma from '../../config/database.js'

const PAGE_SIZE = 20

export const listarActividades = async (equipoId, { anio, tipo, page = 1 }) => {
  const where = {
    equipoId,
    ...(anio && { anio: parseInt(anio) }),
    ...(tipo && { tipo }),
  }

  const [total, data] = await Promise.all([
    prisma.actividad.count({ where }),
    prisma.actividad.findMany({
      where,
      include: { _count: { select: { asistencias: true, servicios: true } } },
      orderBy: { fecha: 'desc' },
      skip: (parseInt(page) - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ])

  return { data, pagination: { page: parseInt(page), limit: PAGE_SIZE, total, pages: Math.ceil(total / PAGE_SIZE) } }
}

export const crearActividad = async (equipoId, body) => {
  const fecha = new Date(body.fecha)
  return prisma.actividad.create({
    data: { ...body, equipoId, fecha, anio: fecha.getFullYear() },
  })
}

export const obtenerActividad = async (equipoId, id) => {
  const actividad = await prisma.actividad.findFirst({
    where: { id, equipoId },
    include: {
      _count: { select: { asistencias: true } },
      servicios: {
        include: {
          catalogoServicio: true,
          asignados: { include: { hermano: { select: { id: true, nombre: true, apellido: true } } } },
        },
      },
    },
  })
  if (!actividad) throw { status: 404, message: 'Actividad no encontrada', code: 'ACTIVIDAD_NO_ENCONTRADA' }
  return actividad
}

export const actualizarActividad = async (equipoId, id, body) => {
  const existe = await prisma.actividad.findFirst({ where: { id, equipoId } })
  if (!existe) throw { status: 404, message: 'Actividad no encontrada', code: 'ACTIVIDAD_NO_ENCONTRADA' }
  const data = { ...body }
  if (body.fecha) {
    data.fecha = new Date(body.fecha)
    data.anio = data.fecha.getFullYear()
  }
  return prisma.actividad.update({ where: { id }, data })
}

export const listarAsistencia = async (equipoId, actividadId, { q }) => {
  const actividad = await prisma.actividad.findFirst({ where: { id: actividadId, equipoId } })
  if (!actividad) throw { status: 404, message: 'Actividad no encontrada', code: 'ACTIVIDAD_NO_ENCONTRADA' }

  const hermanos = await prisma.hermano.findMany({
    where: {
      comunidad: { equipoId },
      activo: true,
      ...(q && { OR: [{ nombre: { contains: q } }, { apellido: { contains: q } }] }),
    },
    include: {
      asistencias: { where: { actividadId } },
      comunidad: { select: { nombre: true } },
    },
    orderBy: [{ nombre: 'asc' }],
  })

  return hermanos.map((h) => ({
    hermanoId: h.id,
    nombre: h.nombre,
    apellido: h.apellido,
    comunidad: h.comunidad.nombre,
    presente: h.asistencias[0]?.presente ?? false,
    asistenciaId: h.asistencias[0]?.id ?? null,
  }))
}

export const guardarAsistencia = async (equipoId, actividadId, registros) => {
  const actividad = await prisma.actividad.findFirst({ where: { id: actividadId, equipoId } })
  if (!actividad) throw { status: 404, message: 'Actividad no encontrada', code: 'ACTIVIDAD_NO_ENCONTRADA' }

  const ops = registros.map(({ hermanoId, presente }) =>
    prisma.asistencia.upsert({
      where: { hermanoId_actividadId: { hermanoId, actividadId } },
      update: { presente },
      create: { hermanoId, actividadId, presente },
    })
  )

  await prisma.$transaction(ops)
  return { guardados: registros.length }
}
