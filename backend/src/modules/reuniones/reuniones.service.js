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

export const crearReunion = async (equipoId, redactorId, body, asistenteIds = []) => {
  const { titulo, fecha, lugar, participantes, notas } = body
  const reunion = await prisma.reunion.create({
    data: { titulo, lugar, participantes, notas, equipoId, redactorId, fecha: new Date(fecha) },
  })
  if (asistenteIds.length > 0) {
    await prisma.reunionAsistente.createMany({
      data: asistenteIds.map((miembroId) => ({ reunionId: reunion.id, miembroId })),
    })
  }
  return reunion
}

export const obtenerReunion = async (equipoId, id) => {
  const reunion = await prisma.reunion.findFirst({
    where: { id, equipoId },
    include: {
      redactor: { select: { nombre: true } },
      acuerdos: { orderBy: { orden: 'asc' } },
      asistentes: {
        include: { miembro: { include: { usuario: { select: { id: true, nombre: true } } } } },
        orderBy: { miembro: { usuario: { nombre: 'asc' } } },
      },
    },
  })
  if (!reunion) throw { status: 404, message: 'Reunión no encontrada', code: 'REUNION_NO_ENCONTRADA' }
  return reunion
}

export const actualizarReunion = async (equipoId, id, body) => {
  const existe = await prisma.reunion.findFirst({ where: { id, equipoId } })
  if (!existe) throw { status: 404, message: 'Reunión no encontrada', code: 'REUNION_NO_ENCONTRADA' }
  const { asistenteIds, ...rest } = body
  const data = { ...rest }
  if (rest.fecha) data.fecha = new Date(rest.fecha)
  const reunion = await prisma.reunion.update({ where: { id }, data })
  if (Array.isArray(asistenteIds)) {
    await prisma.reunionAsistente.deleteMany({ where: { reunionId: id } })
    if (asistenteIds.length > 0) {
      await prisma.reunionAsistente.createMany({
        data: asistenteIds.map((miembroId) => ({ reunionId: id, miembroId: Number(miembroId) })),
      })
    }
  }
  return reunion
}

export const eliminarReunion = async (equipoId, id) => {
  const existe = await prisma.reunion.findFirst({ where: { id, equipoId } })
  if (!existe) throw { status: 404, message: 'Reunión no encontrada', code: 'REUNION_NO_ENCONTRADA' }
  return prisma.reunion.delete({ where: { id } })
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

const htmlToText = (html) => {
  if (!html) return null
  return html
    .replace(/<h[1-3][^>]*>/gi, '')
    .replace(/<\/h[1-3]>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/p><\/li>/gi, '\n')   // lista: un solo salto por ítem
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/ul>|<\/ol>/gi, '')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export const generarTexto = async (equipoId, reunionId) => {
  const reunion = await prisma.reunion.findFirst({
    where: { id: reunionId, equipoId },
    include: {
      equipo: true,
      redactor: { select: { nombre: true } },
      acuerdos: { orderBy: { orden: 'asc' } },
      asistentes: {
        include: { miembro: { include: { usuario: { select: { nombre: true } } } } },
        orderBy: { miembro: { usuario: { nombre: 'asc' } } },
      },
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

  const nombresAsistentes = reunion.asistentes.length > 0
    ? reunion.asistentes.map((a) => a.miembro.usuario.nombre).join(', ')
    : (reunion.participantes || 'Sin especificar')

  const notasPlano = htmlToText(reunion.notas)

  const texto = `📋 ACTA DE REUNIÓN — ${reunion.equipo.nombre.toUpperCase()}
📅 Fecha: ${fecha}
📍 Lugar: ${reunion.lugar || 'Sin especificar'}
👥 Participantes: ${nombresAsistentes}
${notasPlano ? `\n📝 Notas:\n${notasPlano}\n` : ''}
ACUERDOS:
${acuerdosTexto || 'Sin acuerdos registrados.'}

Generada el ${ahora}`

  await prisma.reunion.update({ where: { id: reunionId }, data: { textoGenerado: texto } })
  return { texto }
}
