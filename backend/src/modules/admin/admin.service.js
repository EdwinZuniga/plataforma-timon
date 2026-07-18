import bcrypt from 'bcryptjs'
import prisma from '../../config/database.js'

// ─── ESTADÍSTICAS GLOBALES ────────────────────────────────────────────────────

export const obtenerStats = async () => {
  const [usuarios, equipos, hermanos, comunidades, talleres, actividades] = await Promise.all([
    prisma.usuario.count(),
    prisma.equipoTimon.count(),
    prisma.hermano.count(),
    prisma.comunidad.count(),
    prisma.taller.count(),
    prisma.actividad.count(),
  ])
  const [usuariosActivos, equiposActivos] = await Promise.all([
    prisma.usuario.count({ where: { activo: true } }),
    prisma.equipoTimon.count({ where: { activo: true } }),
  ])
  return { usuarios, usuariosActivos, equipos, equiposActivos, hermanos, comunidades, talleres, actividades }
}

// ─── USUARIOS ─────────────────────────────────────────────────────────────────

export const listarUsuarios = async ({ search, page = 1, limit = 20 } = {}) => {
  const skip = (page - 1) * limit
  const where = search
    ? { OR: [{ nombre: { contains: search } }, { email: { contains: search } }] }
    : {}

  const [total, items] = await Promise.all([
    prisma.usuario.count({ where }),
    prisma.usuario.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, nombre: true, email: true, activo: true, superAdmin: true, createdAt: true,
        equipos: {
          where: { activo: true },
          include: { equipo: { select: { id: true, nombre: true, color: true } } },
        },
      },
    }),
  ])
  return { total, page, limit, items }
}

export const obtenerUsuario = async (id) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id },
    select: {
      id: true, nombre: true, email: true, activo: true, superAdmin: true, createdAt: true, updatedAt: true,
      equipos: {
        include: { equipo: { select: { id: true, nombre: true, color: true, activo: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!usuario) throw { status: 404, message: 'Usuario no encontrado', code: 'USUARIO_NO_ENCONTRADO' }
  return usuario
}

export const crearUsuario = async ({ nombre, email, password, superAdmin = false }) => {
  if (!nombre || !email || !password) {
    throw { status: 400, message: 'nombre, email y password son requeridos', code: 'DATOS_REQUERIDOS' }
  }
  const existe = await prisma.usuario.findUnique({ where: { email } })
  if (existe) throw { status: 409, message: 'El email ya está registrado', code: 'EMAIL_DUPLICADO' }

  const passwordHash = await bcrypt.hash(password, 10)
  return prisma.usuario.create({
    data: { nombre, email, passwordHash, superAdmin },
    select: { id: true, nombre: true, email: true, activo: true, superAdmin: true, createdAt: true },
  })
}

export const actualizarUsuario = async (id, { nombre, email, activo, superAdmin, password }) => {
  const data = {}
  if (nombre !== undefined) data.nombre = nombre
  if (email !== undefined) {
    const existe = await prisma.usuario.findFirst({ where: { email, NOT: { id } } })
    if (existe) throw { status: 409, message: 'El email ya está en uso', code: 'EMAIL_DUPLICADO' }
    data.email = email
  }
  if (activo !== undefined) data.activo = activo
  if (superAdmin !== undefined) data.superAdmin = superAdmin
  if (password) data.passwordHash = await bcrypt.hash(password, 10)

  return prisma.usuario.update({
    where: { id },
    data,
    select: { id: true, nombre: true, email: true, activo: true, superAdmin: true, updatedAt: true },
  })
}

export const eliminarUsuario = async (id) => {
  await prisma.usuario.update({ where: { id }, data: { activo: false } })
}

// ─── EQUIPOS ──────────────────────────────────────────────────────────────────

export const listarEquipos = async ({ search, page = 1, limit = 20 } = {}) => {
  const skip = (page - 1) * limit
  const where = search ? { nombre: { contains: search } } : {}

  const [total, items] = await Promise.all([
    prisma.equipoTimon.count({ where }),
    prisma.equipoTimon.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { miembros: true, talleres: true, actividades: true } },
      },
    }),
  ])
  return { total, page, limit, items }
}

export const obtenerEquipo = async (id) => {
  const equipo = await prisma.equipoTimon.findUnique({
    where: { id },
    include: {
      miembros: {
        where: { activo: true },
        include: { usuario: { select: { id: true, nombre: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      },
      _count: { select: { talleres: true, actividades: true, reuniones: true } },
    },
  })
  if (!equipo) throw { status: 404, message: 'Equipo no encontrado', code: 'EQUIPO_NO_ENCONTRADO' }
  return equipo
}

export const crearEquipo = async ({ nombre, descripcion, color }) => {
  if (!nombre) throw { status: 400, message: 'El nombre del equipo es requerido', code: 'DATOS_REQUERIDOS' }
  return prisma.equipoTimon.create({
    data: { nombre, descripcion, color: color || '#6D28D9' },
  })
}

export const actualizarEquipo = async (id, { nombre, descripcion, color, activo }) => {
  const data = {}
  if (nombre !== undefined) data.nombre = nombre
  if (descripcion !== undefined) data.descripcion = descripcion
  if (color !== undefined) data.color = color
  if (activo !== undefined) data.activo = activo

  return prisma.equipoTimon.update({ where: { id }, data })
}

// ─── MEMBRESÍAS ───────────────────────────────────────────────────────────────

export const asignarMiembro = async (equipoId, usuarioId, rol = 'COORDINADOR') => {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } })
  if (!usuario) throw { status: 404, message: 'Usuario no encontrado', code: 'USUARIO_NO_ENCONTRADO' }

  const existente = await prisma.miembroEquipo.findUnique({
    where: { usuarioId_equipoId: { usuarioId, equipoId } },
  })
  if (existente) {
    return prisma.miembroEquipo.update({
      where: { id: existente.id },
      data: { activo: true, rol },
    })
  }
  return prisma.miembroEquipo.create({ data: { usuarioId, equipoId, rol } })
}

export const actualizarMembresia = async (miembroId, { rol, activo }) => {
  const data = {}
  if (rol !== undefined) data.rol = rol
  if (activo !== undefined) data.activo = activo
  return prisma.miembroEquipo.update({ where: { id: miembroId }, data })
}

// ─── PERMISOS ─────────────────────────────────────────────────────────────────

// Retorna todas las membresías de un usuario con sus permisos por módulo
export const obtenerPermisosUsuario = async (usuarioId) => {
  const membresias = await prisma.miembroEquipo.findMany({
    where: { usuarioId },
    include: {
      usuario: { select: { id: true, nombre: true, email: true } },
      equipo: { select: { id: true, nombre: true, color: true } },
      permisos: { select: { modulo: true, ver: true, crear: true, editar: true, eliminar: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
  return membresias
}

// Guarda (upsert) los permisos de una membresía completa.
// permisos = [{ modulo, ver, crear, editar, eliminar }, ...]
export const guardarPermisosMembresia = async (miembroId, permisos) => {
  const miembro = await prisma.miembroEquipo.findUnique({ where: { id: miembroId } })
  if (!miembro) throw { status: 404, message: 'Membresía no encontrada', code: 'MIEMBRO_NO_ENCONTRADO' }

  await prisma.$transaction(
    permisos.map(({ modulo, ver, crear, editar, eliminar }) =>
      prisma.permisoUsuario.upsert({
        where: { miembroId_modulo: { miembroId, modulo } },
        create: { miembroId, modulo, ver, crear, editar, eliminar },
        update: { ver, crear, editar, eliminar },
      })
    )
  )

  return prisma.permisoUsuario.findMany({
    where: { miembroId },
    select: { modulo: true, ver: true, crear: true, editar: true, eliminar: true },
  })
}

// Elimina todos los permisos explícitos de una membresía (vuelve a control por rol)
export const limpiarPermisosMembresia = async (miembroId) => {
  await prisma.permisoUsuario.deleteMany({ where: { miembroId } })
}
