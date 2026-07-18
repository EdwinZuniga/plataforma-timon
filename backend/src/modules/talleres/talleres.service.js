import prisma from '../../config/database.js'

export const listarTalleres = async (equipoId) => {
  return prisma.taller.findMany({
    where: { equipoId },
    include: { _count: { select: { ediciones: true } } },
    orderBy: { nombre: 'asc' },
  })
}

export const crearTaller = async (equipoId, body) => {
  return prisma.taller.create({ data: { ...body, equipoId } })
}

export const obtenerTaller = async (equipoId, id) => {
  const taller = await prisma.taller.findFirst({
    where: { id, equipoId },
    include: {
      ediciones: {
        include: {
          coordinador: { include: { usuario: { select: { id: true, nombre: true } } } },
          inscripciones: {
            include: {
              hermano: { select: { id: true, nombre: true, apellido: true, comunidad: { select: { nombre: true } } } },
              asistenciasMes: { orderBy: [{ anio: 'asc' }, { mes: 'asc' }] },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { fecha: 'desc' },
      },
    },
  })
  if (!taller) throw { status: 404, message: 'Taller no encontrado', code: 'TALLER_NO_ENCONTRADO' }
  return taller
}

export const actualizarTaller = async (equipoId, id, body) => {
  const existe = await prisma.taller.findFirst({ where: { id, equipoId } })
  if (!existe) throw { status: 404, message: 'Taller no encontrado', code: 'TALLER_NO_ENCONTRADO' }
  return prisma.taller.update({ where: { id }, data: body })
}

export const listarEdiciones = async (equipoId, tallerId) => {
  return prisma.edicionTaller.findMany({
    where: { tallerId, taller: { equipoId } },
    include: {
      inscripciones: {
        include: { hermano: { select: { id: true, nombre: true, apellido: true, comunidad: { select: { nombre: true } } } } },
      },
    },
    orderBy: { fecha: 'desc' },
  })
}

export const crearEdicion = async (equipoId, tallerId, body) => {
  const taller = await prisma.taller.findFirst({ where: { id: tallerId, equipoId } })
  if (!taller) throw { status: 404, message: 'Taller no encontrado', code: 'TALLER_NO_ENCONTRADO' }
  return prisma.edicionTaller.create({ data: { ...body, tallerId } })
}

export const obtenerEdicion = async (equipoId, tallerId, edicionId) => {
  const edicion = await prisma.edicionTaller.findFirst({
    where: { id: edicionId, tallerId, taller: { equipoId } },
    include: {
      taller: { select: { id: true, nombre: true } },
      coordinador: { include: { usuario: { select: { id: true, nombre: true } } } },
      equipoApoyo: {
        include: {
          miembro: { include: { usuario: { select: { id: true, nombre: true } } } },
        },
        orderBy: { createdAt: 'asc' },
      },
      temasMes: {
        include: {
          expositor: { include: { usuario: { select: { id: true, nombre: true } } } },
        },
        orderBy: [{ anio: 'asc' }, { mes: 'asc' }],
      },
      inscripciones: {
        include: {
          hermano: { select: { id: true, nombre: true, apellido: true, comunidad: { select: { nombre: true } } } },
          asistenciasMes: { orderBy: [{ anio: 'asc' }, { mes: 'asc' }] },
          tareasEntrega: { orderBy: [{ anio: 'asc' }, { mes: 'asc' }] },
          participaciones: { orderBy: [{ anio: 'asc' }, { mes: 'asc' }] },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!edicion) throw { status: 404, message: 'Edición no encontrada', code: 'EDICION_NO_ENCONTRADA' }
  return edicion
}

export const actualizarEdicion = async (equipoId, tallerId, edicionId, body) => {
  const edicion = await prisma.edicionTaller.findFirst({
    where: { id: edicionId, tallerId, taller: { equipoId } },
  })
  if (!edicion) throw { status: 404, message: 'Edición no encontrada', code: 'EDICION_NO_ENCONTRADA' }
  return prisma.edicionTaller.update({ where: { id: edicionId }, data: body })
}

export const eliminarEdicion = async (equipoId, tallerId, edicionId) => {
  const edicion = await prisma.edicionTaller.findFirst({
    where: { id: edicionId, tallerId, taller: { equipoId } },
  })
  if (!edicion) throw { status: 404, message: 'Edición no encontrada', code: 'EDICION_NO_ENCONTRADA' }
  return prisma.edicionTaller.delete({ where: { id: edicionId } })
}

export const listarParaInscripcion = async (equipoId) => {
  return prisma.taller.findMany({
    where: { equipoId, activo: true },
    include: {
      ediciones: {
        include: { _count: { select: { inscripciones: true } } },
        orderBy: { fecha: 'desc' },
      },
    },
    orderBy: { nombre: 'asc' },
  })
}

export const inscribirHermanos = async (equipoId, edicionId, hermanoIds) => {
  const edicion = await prisma.edicionTaller.findFirst({
    where: { id: edicionId, taller: { equipoId } },
  })
  if (!edicion) throw { status: 404, message: 'Edición no encontrada', code: 'EDICION_NO_ENCONTRADA' }

  const hermanosDelEquipo = await prisma.hermano.findMany({
    where: { id: { in: hermanoIds }, equipoId },
    select: { id: true },
  })
  const idsValidos = new Set(hermanosDelEquipo.map((h) => h.id))
  const hermanoIdsFiltrados = hermanoIds.filter((id) => idsValidos.has(id))

  const existentes = await prisma.inscripcion.findMany({
    where: { edicionTallerId: edicionId, hermanoId: { in: hermanoIdsFiltrados } },
    select: { hermanoId: true },
  })
  const yaInscritos = new Set(existentes.map((e) => e.hermanoId))
  const nuevos = hermanoIdsFiltrados.filter((id) => !yaInscritos.has(id))

  if (nuevos.length > 0) {
    await prisma.inscripcion.createMany({
      data: nuevos.map((hermanoId) => ({ hermanoId, edicionTallerId: edicionId })),
    })
  }

  return prisma.edicionTaller.findUnique({ where: { id: edicionId }, include: { inscripciones: true } })
}

export const upsertAsistenciaMes = async (inscripcionId, mes, anio, estado) => {
  return prisma.asistenciaMes.upsert({
    where: { inscripcionId_mes_anio: { inscripcionId, mes: Number(mes), anio: Number(anio) } },
    create: { inscripcionId, mes: Number(mes), anio: Number(anio), estado },
    update: { estado },
  })
}

export const actualizarInscripcion = async (id, body) => {
  return prisma.inscripcion.update({ where: { id }, data: body })
}

export const eliminarInscripcion = async (id) => {
  return prisma.inscripcion.delete({ where: { id } })
}

export const addEquipoApoyo = async (equipoId, edicionId, miembroId, rol) => {
  const edicion = await prisma.edicionTaller.findFirst({ where: { id: edicionId, taller: { equipoId } } })
  if (!edicion) throw { status: 404, message: 'Edición no encontrada', code: 'EDICION_NO_ENCONTRADA' }
  const miembro = await prisma.miembroEquipo.findFirst({ where: { id: miembroId, equipoId } })
  if (!miembro) throw { status: 404, message: 'Miembro no encontrado', code: 'MIEMBRO_NO_ENCONTRADO' }
  return prisma.equipoApoyoEdicion.upsert({
    where: { edicionId_miembroId: { edicionId, miembroId } },
    create: { edicionId, miembroId, rol: rol || null },
    update: { rol: rol || null },
    include: { miembro: { include: { usuario: { select: { id: true, nombre: true } } } } },
  })
}

export const removeEquipoApoyo = async (equipoId, edicionId, miembroId) => {
  const edicion = await prisma.edicionTaller.findFirst({ where: { id: edicionId, taller: { equipoId } } })
  if (!edicion) throw { status: 404, message: 'Edición no encontrada', code: 'EDICION_NO_ENCONTRADA' }
  return prisma.equipoApoyoEdicion.delete({ where: { edicionId_miembroId: { edicionId, miembroId } } })
}

export const upsertTemaMes = async (equipoId, edicionId, mes, anio, data) => {
  const edicion = await prisma.edicionTaller.findFirst({ where: { id: edicionId, taller: { equipoId } } })
  if (!edicion) throw { status: 404, message: 'Edición no encontrada', code: 'EDICION_NO_ENCONTRADA' }
  const { titulo, expositorId, notas, documentoUrl } = data
  if (expositorId) {
    const expositor = await prisma.miembroEquipo.findFirst({ where: { id: expositorId, equipoId, activo: true } })
    if (!expositor) throw { status: 404, message: 'Miembro no encontrado', code: 'MIEMBRO_NO_ENCONTRADO' }
  }
  return prisma.temaMes.upsert({
    where: { edicionId_mes_anio: { edicionId, mes: Number(mes), anio: Number(anio) } },
    create: { edicionId, mes: Number(mes), anio: Number(anio), titulo, expositorId: expositorId || null, notas, documentoUrl },
    update: { titulo, expositorId: expositorId || null, notas, documentoUrl },
    include: { expositor: { include: { usuario: { select: { id: true, nombre: true } } } } },
  })
}

export const upsertTareaEntrega = async (inscripcionId, mes, anio, entrego, notas) => {
  return prisma.tareaEntrega.upsert({
    where: { inscripcionId_mes_anio: { inscripcionId, mes: Number(mes), anio: Number(anio) } },
    create: { inscripcionId, mes: Number(mes), anio: Number(anio), entrego: Boolean(entrego), notas: notas || null },
    update: { entrego: Boolean(entrego), notas: notas || null },
  })
}

export const upsertParticipacionMes = async (inscripcionId, mes, anio, participo, notas) => {
  return prisma.participacionMes.upsert({
    where: { inscripcionId_mes_anio: { inscripcionId, mes: Number(mes), anio: Number(anio) } },
    create: { inscripcionId, mes: Number(mes), anio: Number(anio), participo: Boolean(participo), notas: notas || null },
    update: { participo: Boolean(participo), notas: notas || null },
  })
}

export const resumenInscripcion = async (equipoId, inscripcionId) => {
  const inscripcion = await prisma.inscripcion.findFirst({
    where: { id: inscripcionId, edicionTaller: { taller: { equipoId } } },
    include: {
      asistenciasMes: { orderBy: [{ anio: 'asc' }, { mes: 'asc' }] },
      tareasEntrega: { orderBy: [{ anio: 'asc' }, { mes: 'asc' }] },
      participaciones: { orderBy: [{ anio: 'asc' }, { mes: 'asc' }] },
    },
  })
  if (!inscripcion) throw { status: 404, message: 'Inscripción no encontrada', code: 'INSCRIPCION_NO_ENCONTRADA' }

  return {
    asistencia: {
      total: inscripcion.asistenciasMes.length,
      presentes: inscripcion.asistenciasMes.filter((a) => a.estado === 'PRESENTE').length,
      ausentes: inscripcion.asistenciasMes.filter((a) => a.estado === 'AUSENTE').length,
      permisos: inscripcion.asistenciasMes.filter((a) => a.estado === 'PERMISO').length,
      detalle: inscripcion.asistenciasMes,
    },
    tareas: {
      total: inscripcion.tareasEntrega.length,
      entregadas: inscripcion.tareasEntrega.filter((t) => t.entrego).length,
      noEntregadas: inscripcion.tareasEntrega.filter((t) => !t.entrego).length,
      detalle: inscripcion.tareasEntrega,
    },
    participacion: {
      total: inscripcion.participaciones.length,
      participo: inscripcion.participaciones.filter((p) => p.participo).length,
      noParticipo: inscripcion.participaciones.filter((p) => !p.participo).length,
      detalle: inscripcion.participaciones,
    },
  }
}

export const estadisticas = async (equipoId) => {
  const talleres = await prisma.taller.findMany({
    where: { equipoId },
    include: {
      ediciones: {
        include: { _count: { select: { inscripciones: true } } },
      },
    },
  })
  return talleres.map((t) => ({
    id: t.id,
    nombre: t.nombre,
    totalEdiciones: t.ediciones.length,
    totalInscritos: t.ediciones.reduce((acc, e) => acc + e._count.inscripciones, 0),
  }))
}
