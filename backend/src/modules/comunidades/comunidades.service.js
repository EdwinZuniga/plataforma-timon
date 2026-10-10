import { conEstadoEfectivo } from '../servicios/servicio-estado.js'
import prisma from '../../config/database.js'

const PAGE_SIZE = 20

export const listarComunidades = async ({ q, departamento, enlaceId, estado, page = 1, limit }) => {
  const where = {
    ...(q && { nombre: { contains: q } }),
    ...(departamento && { departamento }),
    ...(estado && { estado }),
  }

  // enlaceId: 'sin' / 'null' → comunidades que necesitan enlace (sin asignar o con
  // enlace desactivado). Un id numérico → filtra por ese miembro, activo o no,
  // para poder consultar el historial de un enlace inactivo.
  if (enlaceId === 'sin' || enlaceId === 'null') {
    where.OR = [{ enlaceId: null }, { enlace: { is: { activo: false } } }]
  } else if (enlaceId && Number.isFinite(Number(enlaceId))) {
    where.enlaceId = Number(enlaceId)
  }

  const take = Math.min(parseInt(limit) || PAGE_SIZE, 500)

  const [total, data] = await Promise.all([
    prisma.comunidad.count({ where }),
    prisma.comunidad.findMany({
      where,
      include: { enlace: { select: { id: true, activo: true, usuario: { select: { nombre: true } } } } },
      orderBy: { nombre: 'asc' },
      skip: (page - 1) * take,
      take,
    }),
  ])

  return { data, pagination: { page, limit: take, total, pages: Math.ceil(total / take) } }
}

// Normaliza latitud/longitud: vacío → null, fuera de rango o mal formado → 400.
// Ambas deben venir juntas o ninguna.
const normalizarCoordenadas = ({ latitud, longitud }) => {
  if (latitud === undefined && longitud === undefined) return {}
  const vacio = (v) => v === null || v === undefined || v === ''
  if (vacio(latitud) && vacio(longitud)) return { latitud: null, longitud: null }
  const lat = Number(latitud)
  const lng = Number(longitud)
  if (vacio(latitud) || vacio(longitud) || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw { status: 400, message: 'Coordenadas inválidas', code: 'COORDENADAS_INVALIDAS' }
  }
  return { latitud: lat, longitud: lng }
}

export const crearComunidad = async (body) => {
  const { latitud, longitud, ...resto } = body
  return prisma.comunidad.create({ data: { ...resto, ...normalizarCoordenadas({ latitud, longitud }) } })
}

const MAX_FOTO_CHARS = 1_500_000

export const obtenerFoto = async (comunidadId) => {
  const foto = await prisma.comunidadFoto.findUnique({ where: { comunidadId } })
  return foto ? foto.datos : null
}

export const guardarFoto = async (comunidadId, foto) => {
  const existe = await prisma.comunidad.findFirst({ where: { id: comunidadId }, select: { id: true } })
  if (!existe) throw { status: 404, message: 'Comunidad no encontrada', code: 'COMUNIDAD_NO_ENCONTRADA' }
  if (typeof foto !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(foto) || foto.length > MAX_FOTO_CHARS) {
    throw { status: 400, message: 'Imagen inválida o demasiado grande', code: 'FOTO_INVALIDA' }
  }
  await prisma.comunidadFoto.upsert({
    where: { comunidadId },
    create: { comunidadId, datos: foto },
    update: { datos: foto },
  })
}

export const eliminarFoto = async (comunidadId) => {
  await prisma.comunidadFoto.deleteMany({ where: { comunidadId } })
}

export const obtenerComunidad = async (equipoId, id) => {
  const comunidad = await prisma.comunidad.findFirst({
    where: { id },
    include: {
      enlace: { include: { usuario: { select: { nombre: true, email: true } } } },
      miembrosConsejo: { where: { activo: true }, orderBy: { nombre: 'asc' } },
      visitas: {
        where: { equipoId },
        orderBy: { fecha: 'desc' },
        take: 20,
        include: {
          responsable: { include: { usuario: { select: { nombre: true } } } },
        },
      },
      servicios: {
        where: { actividad: { equipoId } },
        orderBy: { actividad: { fecha: 'desc' } },
        take: 30,
        include: {
          actividad: { select: { id: true, nombre: true, fecha: true, lugar: true, tipo: true } },
          catalogoServicio: true,
          asignados: {
            include: {
              miembro: { select: { id: true, rol: true, nombreCorto: true, usuario: { select: { nombre: true } } } },
            },
          },
        },
      },
      hermanos: { where: { activo: true, equipoId }, select: { id: true, nombre: true, apellido: true, telefono: true } },
      foto: { select: { comunidadId: true } },
    },
  })
  if (!comunidad) throw { status: 404, message: 'Comunidad no encontrada', code: 'COMUNIDAD_NO_ENCONTRADA' }
  const { foto, ...resto } = comunidad
  return { ...resto, tieneFoto: !!foto, servicios: conEstadoEfectivo(comunidad.servicios) }
}

export const actualizarComunidad = async (id, body) => {
  const existe = await prisma.comunidad.findFirst({ where: { id } })
  if (!existe) throw { status: 404, message: 'Comunidad no encontrada', code: 'COMUNIDAD_NO_ENCONTRADA' }
  const { nombre, departamento, numero, estado, enlaceId, enlaceConsejo, fechaEleccion, lugarAsamblea, horarioAsamblea, oficial, notas } = body
  const coords = normalizarCoordenadas(body)
  return prisma.comunidad.update({ where: { id }, data: { nombre, departamento, numero, estado, enlaceId, enlaceConsejo, fechaEleccion, lugarAsamblea, horarioAsamblea, oficial, notas, ...coords } })
}

export const eliminarComunidad = async (id) => {
  const existe = await prisma.comunidad.findFirst({ where: { id } })
  if (!existe) throw { status: 404, message: 'Comunidad no encontrada', code: 'COMUNIDAD_NO_ENCONTRADA' }
  return prisma.comunidad.update({ where: { id }, data: { estado: 'INACTIVA' } })
}

// ─── MIEMBROS CONSEJO ─────────────────────────────────────────────────────────

export const crearMiembroConsejo = async (comunidadId, { nombre, telefono, periodo, nota }) => {
  const comunidad = await prisma.comunidad.findFirst({ where: { id: comunidadId } })
  if (!comunidad) throw { status: 404, message: 'Comunidad no encontrada', code: 'COMUNIDAD_NO_ENCONTRADA' }
  if (!nombre) throw { status: 400, message: 'El nombre es requerido', code: 'DATOS_REQUERIDOS' }
  return prisma.miembroConsejo.create({ data: { comunidadId, nombre, telefono, periodo, nota } })
}

export const actualizarMiembroConsejo = async (comunidadId, miembroId, { nombre, telefono, periodo, nota, activo }) => {
  const miembro = await prisma.miembroConsejo.findFirst({ where: { id: miembroId, comunidadId } })
  if (!miembro) throw { status: 404, message: 'Miembro no encontrado', code: 'NO_ENCONTRADO' }
  return prisma.miembroConsejo.update({ where: { id: miembroId }, data: { nombre, telefono, periodo, nota, activo } })
}

export const eliminarMiembroConsejo = async (comunidadId, miembroId) => {
  const miembro = await prisma.miembroConsejo.findFirst({ where: { id: miembroId, comunidadId } })
  if (!miembro) throw { status: 404, message: 'Miembro no encontrado', code: 'NO_ENCONTRADO' }
  return prisma.miembroConsejo.delete({ where: { id: miembroId } })
}

// ─── VISITAS ─────────────────────────────────────────────────────────────────

export const crearVisita = async (equipoId, comunidadId, { fecha, fechaFin, responsableId, apoyo, horario, notas }) => {
  const comunidad = await prisma.comunidad.findFirst({ where: { id: comunidadId } })
  if (!comunidad) throw { status: 404, message: 'Comunidad no encontrada', code: 'COMUNIDAD_NO_ENCONTRADA' }
  if (!fecha) throw { status: 400, message: 'La fecha es requerida', code: 'DATOS_REQUERIDOS' }
  const fin = fechaFin ? new Date(fechaFin) : new Date(fecha)
  if (fin < new Date(fecha)) throw { status: 400, message: 'La fecha fin no puede ser anterior al inicio', code: 'FECHAS_INVALIDAS' }
  return prisma.visita.create({
    data: { comunidadId, equipoId, fecha: new Date(fecha), fechaFin: fin, responsableId: responsableId || null, apoyo, horario, notas },
    include: { responsable: { include: { usuario: { select: { nombre: true } } } } },
  })
}

export const actualizarVisita = async (equipoId, comunidadId, visitaId, { fecha, fechaFin, responsableId, apoyo, horario, notas }) => {
  const visita = await prisma.visita.findFirst({ where: { id: visitaId, comunidadId, equipoId } })
  if (!visita) throw { status: 404, message: 'Visita no encontrada', code: 'NO_ENCONTRADA' }
  const inicio = fecha ? new Date(fecha) : visita.fecha
  const fin = fechaFin ? new Date(fechaFin) : inicio
  if (fin < inicio) throw { status: 400, message: 'La fecha fin no puede ser anterior al inicio', code: 'FECHAS_INVALIDAS' }
  return prisma.visita.update({
    where: { id: visitaId },
    data: { fecha: inicio, fechaFin: fin, responsableId: responsableId || null, apoyo, horario, notas },
    include: { responsable: { include: { usuario: { select: { nombre: true } } } } },
  })
}

export const eliminarVisita = async (equipoId, comunidadId, visitaId) => {
  const visita = await prisma.visita.findFirst({ where: { id: visitaId, comunidadId, equipoId } })
  if (!visita) throw { status: 404, message: 'Visita no encontrada', code: 'NO_ENCONTRADA' }
  return prisma.visita.delete({ where: { id: visitaId } })
}
