import prisma from '../../config/database.js'
import { hoyElSalvador } from '../servicios/servicio-estado.js'

const PAGE_SIZE = 20

export const listarReuniones = async (equipoId, { q, page = 1, desde, hasta }) => {
  // desde/hasta llegan como 'YYYY-MM-DD'. La fecha se guarda como medianoche UTC,
  // así que comparamos contra límites UTC para no correr un día por la zona horaria.
  const fecha = {}
  if (desde) fecha.gte = new Date(`${desde}T00:00:00.000Z`)
  if (hasta) fecha.lte = new Date(`${hasta}T23:59:59.999Z`)

  const where = {
    equipoId,
    ...(Object.keys(fecha).length && { fecha }),
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
      acuerdos: { orderBy: { orden: 'asc' }, include: incluirAcuerdo },
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

const ESTADOS_ACUERDO = ['PENDIENTE', 'EN_PROCESO', 'CUMPLIDO']

// Responsables por id de miembro; `responsable` (texto) se mantiene como nombres
// separados por coma para el acta y para acuerdos anteriores al seguimiento.
const resolverResponsables = async (equipoId, responsableIds) => {
  const ids = [...new Set((responsableIds || []).map(Number).filter(Boolean))]
  if (ids.length === 0) return { ids: [], texto: null }
  const miembros = await prisma.miembroEquipo.findMany({
    where: { id: { in: ids }, equipoId },
    include: { usuario: { select: { nombre: true } } },
  })
  return { ids: miembros.map((m) => m.id), texto: miembros.map((m) => m.usuario.nombre).join(', ') || null }
}

export const incluirAcuerdo = {
  responsables: { include: { miembro: { include: { usuario: { select: { id: true, nombre: true } } } } } },
}

export const crearAcuerdo = async (equipoId, reunionId, body) => {
  const reunion = await prisma.reunion.findFirst({ where: { id: reunionId, equipoId } })
  if (!reunion) throw { status: 404, message: 'Reunión no encontrada', code: 'REUNION_NO_ENCONTRADA' }
  const count = await prisma.acuerdo.count({ where: { reunionId } })
  const { descripcion, responsable, fechaLimite, responsableIds } = body
  const resp = await resolverResponsables(equipoId, responsableIds)
  return prisma.acuerdo.create({
    data: {
      descripcion,
      reunionId,
      orden: count + 1,
      responsable: resp.texto ?? responsable ?? null,
      ...(fechaLimite && { fechaLimite: new Date(fechaLimite) }),
      responsables: { create: resp.ids.map((miembroId) => ({ miembroId })) },
    },
    include: incluirAcuerdo,
  })
}

export const actualizarAcuerdo = async (equipoId, id, body) => {
  const existe = await prisma.acuerdo.findFirst({ where: { id, reunion: { equipoId } } })
  if (!existe) throw { status: 404, message: 'Acuerdo no encontrado', code: 'ACUERDO_NO_ENCONTRADO' }

  const { descripcion, fechaLimite, responsableIds, estado, cumplido } = body
  const data = {}
  if (descripcion !== undefined) data.descripcion = descripcion
  if (fechaLimite !== undefined) data.fechaLimite = fechaLimite ? new Date(fechaLimite) : null

  // `cumplido` (booleano, clientes anteriores) equivale a CUMPLIDO / PENDIENTE
  const nuevoEstado = estado ?? (cumplido === undefined ? undefined : cumplido ? 'CUMPLIDO' : 'PENDIENTE')
  if (nuevoEstado !== undefined) {
    if (!ESTADOS_ACUERDO.includes(nuevoEstado)) {
      throw { status: 400, message: 'Estado de acuerdo inválido', code: 'ESTADO_INVALIDO' }
    }
    data.estado = nuevoEstado
    data.cumplido = nuevoEstado === 'CUMPLIDO'
    data.fechaCumplido = nuevoEstado === 'CUMPLIDO' ? (existe.fechaCumplido ?? new Date()) : null
  }

  if (Array.isArray(responsableIds)) {
    const resp = await resolverResponsables(equipoId, responsableIds)
    data.responsable = resp.texto
    data.responsables = { deleteMany: {}, create: resp.ids.map((miembroId) => ({ miembroId })) }
  }

  return prisma.acuerdo.update({ where: { id }, data, include: incluirAcuerdo })
}

export const eliminarAcuerdo = async (equipoId, id) => {
  const existe = await prisma.acuerdo.findFirst({ where: { id, reunion: { equipoId } } })
  if (!existe) throw { status: 404, message: 'Acuerdo no encontrado', code: 'ACUERDO_NO_ENCONTRADO' }
  await prisma.acuerdo.delete({ where: { id } })
}

// Seguimiento: acuerdos del equipo con sus responsables y reunión de origen.
// `vencido` = no cumplido con fecha límite anterior a hoy.
export const listarAcuerdos = async (equipoId, { estado, miembroId, reunionId } = {}) => {
  const where = {
    reunion: { equipoId },
    ...(estado === 'ABIERTOS' && { estado: { not: 'CUMPLIDO' } }),
    ...(ESTADOS_ACUERDO.includes(estado) && { estado }),
    ...(miembroId && { responsables: { some: { miembroId } } }),
    ...(reunionId && { reunionId }),
  }
  const acuerdos = await prisma.acuerdo.findMany({
    where,
    include: { ...incluirAcuerdo, reunion: { select: { id: true, titulo: true, fecha: true } } },
    orderBy: [{ fechaLimite: 'asc' }, { id: 'desc' }],
  })
  const hoy = hoyElSalvador()
  return acuerdos.map((a) => ({ ...a, vencido: a.estado !== 'CUMPLIDO' && !!a.fechaLimite && new Date(a.fechaLimite) < hoy }))
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

export const guardarComisiones = async (equipoId, reunionId, comisiones) => {
  const existe = await prisma.reunion.findFirst({ where: { id: reunionId, equipoId } })
  if (!existe) throw { status: 404, message: 'Reunión no encontrada', code: 'REUNION_NO_ENCONTRADA' }
  return prisma.reunion.update({
    where: { id: reunionId },
    data: { comisiones: JSON.stringify(comisiones) },
  })
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

  let comisionesTexto = ''
  if (reunion.comisiones) {
    const cs = JSON.parse(reunion.comisiones).filter((c) => c.miembros.length > 0)
    if (cs.length > 0) {
      comisionesTexto = '\nCOMISIONES:\n' + cs.map((c) => `• ${c.nombre}: ${c.miembros.join(', ')}`).join('\n')
    }
  }

  const texto = `📋 ACTA DE REUNIÓN — ${reunion.equipo.nombre.toUpperCase()}
📅 Fecha: ${fecha}
📍 Lugar: ${reunion.lugar || 'Sin especificar'}
👥 Participantes: ${nombresAsistentes}
${notasPlano ? `\n📝 Notas:\n${notasPlano}\n` : ''}${comisionesTexto ? `${comisionesTexto}\n` : ''}
ACUERDOS:
${acuerdosTexto || 'Sin acuerdos registrados.'}

Generada el ${ahora}`

  await prisma.reunion.update({ where: { id: reunionId }, data: { textoGenerado: texto } })
  return { texto }
}
