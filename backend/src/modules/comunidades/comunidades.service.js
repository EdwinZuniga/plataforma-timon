import prisma from '../../config/database.js'

const PAGE_SIZE = 20

export const listarComunidades = async (equipoId, { q, departamento, enlaceId, estado, page = 1 }) => {
  const where = {
    equipoId,
    ...(q && { nombre: { contains: q } }),
    ...(departamento && { departamento }),
    ...(enlaceId && { enlaceId }),
    ...(estado && { estado }),
  }

  const [total, data] = await Promise.all([
    prisma.comunidad.count({ where }),
    prisma.comunidad.findMany({
      where,
      include: { enlace: { include: { usuario: { select: { nombre: true } } } } },
      orderBy: { nombre: 'asc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ])

  return { data, pagination: { page, limit: PAGE_SIZE, total, pages: Math.ceil(total / PAGE_SIZE) } }
}

export const crearComunidad = async (equipoId, body) => {
  return prisma.comunidad.create({ data: { ...body, equipoId } })
}

export const obtenerComunidad = async (equipoId, id) => {
  const comunidad = await prisma.comunidad.findFirst({
    where: { id, equipoId },
    include: {
      enlace: { include: { usuario: { select: { nombre: true, email: true } } } },
      miembrosConsejo: true,
      visitas: { orderBy: { fecha: 'desc' }, take: 10 },
      hermanos: { where: { activo: true }, select: { id: true, nombre: true, apellido: true, telefono: true } },
    },
  })
  if (!comunidad) throw { status: 404, message: 'Comunidad no encontrada', code: 'COMUNIDAD_NO_ENCONTRADA' }
  return comunidad
}

export const actualizarComunidad = async (equipoId, id, body) => {
  const existe = await prisma.comunidad.findFirst({ where: { id, equipoId } })
  if (!existe) throw { status: 404, message: 'Comunidad no encontrada', code: 'COMUNIDAD_NO_ENCONTRADA' }
  const { nombre, departamento, numero, estado, enlaceId, enlaceConsejo, fechaEleccion, lugarAsamblea, horarioAsamblea, oficial, notas } = body
  return prisma.comunidad.update({ where: { id }, data: { nombre, departamento, numero, estado, enlaceId, enlaceConsejo, fechaEleccion, lugarAsamblea, horarioAsamblea, oficial, notas } })
}

export const eliminarComunidad = async (equipoId, id) => {
  const existe = await prisma.comunidad.findFirst({ where: { id, equipoId } })
  if (!existe) throw { status: 404, message: 'Comunidad no encontrada', code: 'COMUNIDAD_NO_ENCONTRADA' }
  return prisma.comunidad.update({ where: { id }, data: { estado: 'INACTIVA' } })
}
