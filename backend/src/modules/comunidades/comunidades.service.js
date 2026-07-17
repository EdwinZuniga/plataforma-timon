import prisma from '../../config/database.js'

const PAGE_SIZE = 20

export const listarComunidades = async (equipoId, { q, departamento, enlaceId, estado, page = 1, limit }) => {
  const where = {
    equipoId,
    ...(q && { nombre: { contains: q } }),
    ...(departamento && { departamento }),
    ...(enlaceId && { enlaceId }),
    ...(estado && { estado }),
  }

  const take = Math.min(parseInt(limit) || PAGE_SIZE, 500)

  const [total, data] = await Promise.all([
    prisma.comunidad.count({ where }),
    prisma.comunidad.findMany({
      where,
      include: { enlace: { include: { usuario: { select: { nombre: true } } } } },
      orderBy: { nombre: 'asc' },
      skip: (page - 1) * take,
      take,
    }),
  ])

  return { data, pagination: { page, limit: take, total, pages: Math.ceil(total / take) } }
}

export const crearComunidad = async (equipoId, body) => {
  return prisma.comunidad.create({ data: { ...body, equipoId } })
}

export const obtenerComunidad = async (equipoId, id) => {
  const comunidad = await prisma.comunidad.findFirst({
    where: { id, equipoId },
    include: {
      enlace: { include: { usuario: { select: { nombre: true, email: true } } } },
      miembrosConsejo: { where: { activo: true }, orderBy: { nombre: 'asc' } },
      visitas: {
        orderBy: { fecha: 'desc' },
        take: 20,
        include: {
          responsable: { include: { usuario: { select: { nombre: true } } } },
        },
      },
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

// ─── MIEMBROS CONSEJO ─────────────────────────────────────────────────────────

export const crearMiembroConsejo = async (equipoId, comunidadId, { nombre, telefono, periodo, nota }) => {
  const comunidad = await prisma.comunidad.findFirst({ where: { id: comunidadId, equipoId } })
  if (!comunidad) throw { status: 404, message: 'Comunidad no encontrada', code: 'COMUNIDAD_NO_ENCONTRADA' }
  if (!nombre) throw { status: 400, message: 'El nombre es requerido', code: 'DATOS_REQUERIDOS' }
  return prisma.miembroConsejo.create({ data: { comunidadId, nombre, telefono, periodo, nota } })
}

export const actualizarMiembroConsejo = async (equipoId, comunidadId, miembroId, { nombre, telefono, periodo, nota, activo }) => {
  const miembro = await prisma.miembroConsejo.findFirst({ where: { id: miembroId, comunidadId, comunidad: { equipoId } } })
  if (!miembro) throw { status: 404, message: 'Miembro no encontrado', code: 'NO_ENCONTRADO' }
  return prisma.miembroConsejo.update({ where: { id: miembroId }, data: { nombre, telefono, periodo, nota, activo } })
}

export const eliminarMiembroConsejo = async (equipoId, comunidadId, miembroId) => {
  const miembro = await prisma.miembroConsejo.findFirst({ where: { id: miembroId, comunidadId, comunidad: { equipoId } } })
  if (!miembro) throw { status: 404, message: 'Miembro no encontrado', code: 'NO_ENCONTRADO' }
  return prisma.miembroConsejo.delete({ where: { id: miembroId } })
}

// ─── VISITAS ─────────────────────────────────────────────────────────────────

export const crearVisita = async (equipoId, comunidadId, { fecha, responsableId, apoyo, horario, notas }) => {
  const comunidad = await prisma.comunidad.findFirst({ where: { id: comunidadId, equipoId } })
  if (!comunidad) throw { status: 404, message: 'Comunidad no encontrada', code: 'COMUNIDAD_NO_ENCONTRADA' }
  if (!fecha) throw { status: 400, message: 'La fecha es requerida', code: 'DATOS_REQUERIDOS' }
  return prisma.visita.create({
    data: { comunidadId, fecha: new Date(fecha), responsableId: responsableId || null, apoyo, horario, notas },
    include: { responsable: { include: { usuario: { select: { nombre: true } } } } },
  })
}

export const actualizarVisita = async (equipoId, comunidadId, visitaId, { fecha, responsableId, apoyo, horario, notas }) => {
  const visita = await prisma.visita.findFirst({ where: { id: visitaId, comunidadId, comunidad: { equipoId } } })
  if (!visita) throw { status: 404, message: 'Visita no encontrada', code: 'NO_ENCONTRADA' }
  return prisma.visita.update({
    where: { id: visitaId },
    data: { ...(fecha && { fecha: new Date(fecha) }), responsableId: responsableId || null, apoyo, horario, notas },
    include: { responsable: { include: { usuario: { select: { nombre: true } } } } },
  })
}

export const eliminarVisita = async (equipoId, comunidadId, visitaId) => {
  const visita = await prisma.visita.findFirst({ where: { id: visitaId, comunidadId, comunidad: { equipoId } } })
  if (!visita) throw { status: 404, message: 'Visita no encontrada', code: 'NO_ENCONTRADA' }
  return prisma.visita.delete({ where: { id: visitaId } })
}
