import prisma from '../../config/database.js'

const PAGE_SIZE = 20

export const listarHermanos = async (equipoId, { q, comunidadId, activo, page = 1 }) => {
  const where = {
    comunidad: { equipoId },
    ...(q && {
      OR: [
        { nombre: { contains: q } },
        { apellido: { contains: q } },
      ],
    }),
    ...(comunidadId && { comunidadId }),
    ...(activo !== undefined && { activo: activo === 'true' }),
  }

  const [total, data] = await Promise.all([
    prisma.hermano.count({ where }),
    prisma.hermano.findMany({
      where,
      include: { comunidad: { select: { id: true, nombre: true, departamento: true } } },
      orderBy: [{ nombre: 'asc' }, { apellido: 'asc' }],
      skip: (parseInt(page) - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ])

  return { data, pagination: { page: parseInt(page), limit: PAGE_SIZE, total, pages: Math.ceil(total / PAGE_SIZE) } }
}

export const crearHermano = async (body) => {
  return prisma.hermano.create({ data: body })
}

export const obtenerHermano = async (equipoId, id) => {
  const hermano = await prisma.hermano.findFirst({
    where: { id, comunidad: { equipoId } },
    include: { comunidad: true },
  })
  if (!hermano) throw { status: 404, message: 'Hermano no encontrado', code: 'HERMANO_NO_ENCONTRADO' }
  return hermano
}

export const historialHermano = async (equipoId, id) => {
  const hermano = await prisma.hermano.findFirst({
    where: { id, comunidad: { equipoId } },
    include: {
      inscripciones: {
        include: {
          edicionTaller: {
            include: { taller: { select: { id: true, nombre: true, descripcion: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      asistencias: {
        include: { actividad: true },
        orderBy: { createdAt: 'desc' },
      },
      serviciosAsignados: {
        include: { servicioActividad: { include: { actividad: true, catalogoServicio: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
  if (!hermano) throw { status: 404, message: 'Hermano no encontrado', code: 'HERMANO_NO_ENCONTRADO' }
  return {
    talleres: hermano.inscripciones,
    actividades: hermano.asistencias,
    servicios: hermano.serviciosAsignados,
  }
}

export const actualizarHermano = async (equipoId, id, body) => {
  const existe = await prisma.hermano.findFirst({ where: { id, comunidad: { equipoId } } })
  if (!existe) throw { status: 404, message: 'Hermano no encontrado', code: 'HERMANO_NO_ENCONTRADO' }
  const { nombre, apellido, telefono, email, comunidadId, activo, notas } = body
  return prisma.hermano.update({
    where: { id },
    data: { nombre, apellido, telefono, email, comunidadId: comunidadId ? parseInt(comunidadId) : undefined, activo, notas }
  })
}

export const eliminarHermano = async (equipoId, id) => {
  const existe = await prisma.hermano.findFirst({ where: { id, comunidad: { equipoId } } })
  if (!existe) throw { status: 404, message: 'Hermano no encontrado', code: 'HERMANO_NO_ENCONTRADO' }
  return prisma.hermano.update({ where: { id }, data: { activo: false } })
}
