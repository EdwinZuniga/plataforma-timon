import prisma from '../../config/database.js'

const PAGE_SIZE = 20

export const listarReuniones = async (equipoId, { q, page = 1 }) => {
  const where = {
    equipoId,
    ...(q && {
      OR: [{ titulo: { contains: q } }, { lugar: { contains: q } }],
    }),
  }
  const [total, data] = await Promise.all([
    prisma.reunion.count({ where }),
    prisma.reunion.findMany({
      where,
      include: {
        redactor: { select: { nombre: true } },
        _count: { select: { acuerdos: true } },
      },
      orderBy: { fecha: 'desc' },
      skip: (parseInt(page) - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ])
  return { data, pagination: { page: parseInt(page), limit: PAGE_SIZE, total, pages: Math.ceil(total / PAGE_SIZE) } }
}

export const crearReunion = async (equipoId, redactorId, body) => {
  return prisma.reunion.create({
    data: { ...body, equipoId, redactorId, fecha: new Date(body.fecha) },
  })
}

export const obtenerReunion = async (equipoId, id) => {
  const reunion = await prisma.reunion.findFirst({
    where: { id, equipoId },
    include: {
      redactor: { select: { nombre: true } },
      acuerdos: { orderBy: { orden: 'asc' } },
    },
  })
  if (!reunion) throw { status: 404, message: 'Reunión no encontrada', code: 'REUNION_NO_ENCONTRADA' }
  return reunion
}

export const actualizarReunion = async (equipoId, id, body) => {
  const existe = await prisma.reunion.findFirst({ where: { id, equipoId } })
  if (!existe) throw { status: 404, message: 'Reunión no encontrada', code: 'REUNION_NO_ENCONTRADA' }
  const data = { ...body }
  if (body.fecha) data.fecha = new Date(body.fecha)
  return prisma.reunion.update({ where: { id }, data })
}

export const crearAcuerdo = async (equipoId, reunionId, body) => {
  const reunion = await prisma.reunion.findFirst({ where: { id: reunionId, equipoId } })
  if (!reunion) throw { status: 404, message: 'Reunión no encontrada', code: 'REUNION_NO_ENCONTRADA' }
  const count = await prisma.acuerdo.count({ where: { reunionId } })
  return prisma.acuerdo.create({
    data: {
      ...body,
      reunionId,
      orden: count + 1,
      ...(body.fechaLimite && { fechaLimite: new Date(body.fechaLimite) }),
    },
  })
}

export const actualizarAcuerdo = async (id, body) => {
  return prisma.acuerdo.update({ where: { id }, data: body })
}

export const generarTexto = async (equipoId, reunionId) => {
  const reunion = await prisma.reunion.findFirst({
    where: { id: reunionId, equipoId },
    include: {
      equipo: true,
      redactor: { select: { nombre: true } },
      acuerdos: { orderBy: { orden: 'asc' } },
    },
  })
  if (!reunion) throw { status: 404, message: 'Reunión no encontrada', code: 'REUNION_NO_ENCONTRADA' }

  const fecha = new Date(reunion.fecha).toLocaleDateString('es-SV', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const ahora = new Date().toLocaleString('es-SV')

  const acuerdosTexto = reunion.acuerdos.map((a, i) => {
    let linea = `${i + 1}. ${a.descripcion}`
    if (a.responsable) linea += `\n   Responsable: ${a.responsable}`
    if (a.fechaLimite) {
      const fl = new Date(a.fechaLimite).toLocaleDateString('es-SV')
      linea += ` | Fecha límite: ${fl}`
    }
    return linea
  }).join('\n')

  const texto = `📋 ACTA DE REUNIÓN — ${reunion.equipo.nombre.toUpperCase()}
📅 Fecha: ${fecha}
📍 Lugar: ${reunion.lugar || 'Sin especificar'}
👥 Participantes: ${reunion.participantes || 'Sin especificar'}

ACUERDOS:
${acuerdosTexto || 'Sin acuerdos registrados.'}

Generada el ${ahora}`

  await prisma.reunion.update({ where: { id: reunionId }, data: { textoGenerado: texto } })
  return { texto }
}
