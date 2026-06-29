import bcrypt from 'bcryptjs'
import prisma from '../../config/database.js'

const generarContrasenaTemp = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return 'Timon-' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export const listarEquipos = async (usuarioId) => {
  const membresias = await prisma.miembroEquipo.findMany({
    where: { usuarioId, activo: true },
    include: { equipo: true },
  })
  return membresias.map((m) => m.equipo)
}

export const crearEquipo = async (data, usuarioId) => {
  const equipo = await prisma.equipoTimon.create({ data })
  await prisma.miembroEquipo.create({
    data: { usuarioId, equipoId: equipo.id, rol: 'COORDINADOR' },
  })
  return equipo
}

export const obtenerEquipo = async (equipoId) => {
  const equipo = await prisma.equipoTimon.findUnique({ where: { id: equipoId } })
  if (!equipo) throw { status: 404, message: 'Equipo no encontrado', code: 'EQUIPO_NO_ENCONTRADO' }
  return equipo
}

export const actualizarEquipo = async (equipoId, data) => {
  return prisma.equipoTimon.update({ where: { id: equipoId }, data })
}

export const listarMiembros = async (equipoId) => {
  return prisma.miembroEquipo.findMany({
    where: { equipoId },
    include: { usuario: { select: { id: true, nombre: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  })
}

export const agregarMiembro = async (equipoId, email, rol, nombreCorto, nombre) => {
  let usuario = await prisma.usuario.findUnique({ where: { email } })
  let usuarioCreado = false
  let contrasenaTemp = null

  if (!usuario) {
    if (!nombre) throw { status: 400, message: 'El usuario no tiene cuenta. Proporciona su nombre completo para crearle acceso.', code: 'NOMBRE_REQUERIDO' }
    contrasenaTemp = generarContrasenaTemp()
    const passwordHash = await bcrypt.hash(contrasenaTemp, 10)
    usuario = await prisma.usuario.create({ data: { nombre, email, passwordHash } })
    usuarioCreado = true
  }

  const existente = await prisma.miembroEquipo.findUnique({
    where: { usuarioId_equipoId: { usuarioId: usuario.id, equipoId } },
  })
  if (existente) {
    await prisma.miembroEquipo.update({
      where: { id: existente.id },
      data: { rol, nombreCorto, activo: true },
    })
  } else {
    await prisma.miembroEquipo.create({ data: { usuarioId: usuario.id, equipoId, rol, nombreCorto } })
  }

  return { usuarioCreado, contrasenaTemp, email }
}

export const actualizarMiembro = async (miembroId, data) => {
  return prisma.miembroEquipo.update({ where: { id: miembroId }, data })
}

export const desactivarMiembro = async (miembroId) => {
  return prisma.miembroEquipo.update({ where: { id: miembroId }, data: { activo: false } })
}
