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
  // Las ediciones ya no se traen aquí: la pantalla de detalle las pide paginadas
  // por estado (en curso / finalizadas) vía listarEdiciones.
  const taller = await prisma.taller.findFirst({ where: { id, equipoId } })
  if (!taller) throw { status: 404, message: 'Taller no encontrado', code: 'TALLER_NO_ENCONTRADO' }
  return taller
}

export const actualizarTaller = async (equipoId, id, body) => {
  const existe = await prisma.taller.findFirst({ where: { id, equipoId } })
  if (!existe) throw { status: 404, message: 'Taller no encontrado', code: 'TALLER_NO_ENCONTRADO' }
  return prisma.taller.update({ where: { id }, data: body })
}

const PAGE_SIZE_EDICIONES = 10

// estado: 'actual' (en curso: sin fecha de fin o aún no termina) |
//         'finalizada' (con fecha de fin ya pasada) | undefined (todas)
export const listarEdiciones = async (equipoId, tallerId, { estado, page = 1, limit } = {}) => {
  const hoy = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`)
  const filtroEstado =
    estado === 'actual'
      ? { OR: [{ fechaFin: null }, { fechaFin: { gte: hoy } }] }
      : estado === 'finalizada'
        ? { fechaFin: { not: null, lt: hoy } }
        : {}

  const where = { tallerId, taller: { equipoId }, ...filtroEstado }
  const take = Math.min(parseInt(limit) || PAGE_SIZE_EDICIONES, 100)
  const pageNum = Math.max(parseInt(page) || 1, 1)

  const [total, data] = await Promise.all([
    prisma.edicionTaller.count({ where }),
    prisma.edicionTaller.findMany({
      where,
      include: {
        coordinador: { include: { usuario: { select: { id: true, nombre: true } } } },
        _count: { select: { inscripciones: true } },
      },
      orderBy: { fecha: 'desc' },
      skip: (pageNum - 1) * take,
      take,
    }),
  ])

  return { data, pagination: { page: pageNum, limit: take, total, pages: Math.ceil(total / take) } }
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
    include: { _count: { select: { inscripciones: true } } },
  })
  if (!edicion) throw { status: 404, message: 'Edición no encontrada', code: 'EDICION_NO_ENCONTRADA' }
  if (edicion._count.inscripciones > 0) {
    throw {
      status: 409,
      message: 'No se puede eliminar una edición con hermanos inscritos. Desvincula a los hermanos primero.',
      code: 'EDICION_CON_INSCRIPCIONES',
    }
  }
  // equipoApoyo y temasMes se borran en cascada; sin inscripciones no hay historial que perder.
  return prisma.edicionTaller.delete({ where: { id: edicionId } })
}

export const listarParaInscripcion = async (equipoId) => {
  // Solo ediciones vigentes: sin fecha de fin (en curso) o que aún no terminan.
  // Una edición finalizada no debe ofrecerse para nuevas inscripciones.
  const hoy = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`)
  const talleres = await prisma.taller.findMany({
    where: { equipoId, activo: true },
    include: {
      ediciones: {
        where: { OR: [{ fechaFin: null }, { fechaFin: { gte: hoy } }] },
        include: { _count: { select: { inscripciones: true } } },
        orderBy: { fecha: 'desc' },
      },
    },
    orderBy: { nombre: 'asc' },
  })
  // Oculta talleres sin ninguna edición vigente.
  return talleres.filter((t) => t.ediciones.length > 0)
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
      edicionTaller: { select: { fecha: true, fechaFin: true } },
      asistenciasMes: { orderBy: [{ anio: 'asc' }, { mes: 'asc' }] },
      tareasEntrega: { orderBy: [{ anio: 'asc' }, { mes: 'asc' }] },
      participaciones: { orderBy: [{ anio: 'asc' }, { mes: 'asc' }] },
    },
  })
  if (!inscripcion) throw { status: 404, message: 'Inscripción no encontrada', code: 'INSCRIPCION_NO_ENCONTRADA' }

  // La asistencia se lleva por mes. Las sesiones previstas son los meses que
  // abarca la edición (inicio → fin, o inicio → mes actual si sigue en curso).
  // Los meses sin registro se cuentan como ausencia para reflejar las faltas.
  const ed = inscripcion.edicionTaller
  const inicio = ed?.fecha ? new Date(ed.fecha) : null
  const fin = ed?.fechaFin ? new Date(ed.fechaFin) : new Date()
  const mesesEdicion = inicio
    ? (fin.getUTCFullYear() - inicio.getUTCFullYear()) * 12 + (fin.getUTCMonth() - inicio.getUTCMonth()) + 1
    : 0
  const registradas = inscripcion.asistenciasMes.length
  const esperadas = Math.max(mesesEdicion, registradas)
  const presentes = inscripcion.asistenciasMes.filter((a) => a.estado === 'PRESENTE').length
  const permisos = inscripcion.asistenciasMes.filter((a) => a.estado === 'PERMISO').length
  const ausentesRegistrados = inscripcion.asistenciasMes.filter((a) => a.estado === 'AUSENTE').length
  const sinRegistrar = Math.max(esperadas - registradas, 0)

  return {
    asistencia: {
      total: esperadas,
      esperadas,
      registradas,
      presentes,
      permisos,
      ausentes: ausentesRegistrados + sinRegistrar,
      ausentesRegistrados,
      sinRegistrar,
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
