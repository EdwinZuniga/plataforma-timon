import bcrypt from 'bcryptjs'
import prisma from '../../config/database.js'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../config/jwt.js'


const REFRESH_EXPIRES_DAYS = 7

export const loginService = async (email, password, meta = {}) => {
  const usuario = await prisma.usuario.findUnique({ where: { email } })
  if (!usuario || !usuario.activo) {
    throw { status: 401, message: 'Credenciales incorrectas', code: 'CREDENCIALES_INVALIDAS' }
  }
  const valid = await bcrypt.compare(password, usuario.passwordHash)
  if (!valid) {
    throw { status: 401, message: 'Credenciales incorrectas', code: 'CREDENCIALES_INVALIDAS' }
  }

  const payload = { id: usuario.id, nombre: usuario.nombre, email: usuario.email, superAdmin: usuario.superAdmin }
  const accessToken = signAccessToken(payload)
  const refreshToken = signRefreshToken({ id: usuario.id })

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRES_DAYS)
  await prisma.refreshToken.create({
    data: { token: refreshToken, usuarioId: usuario.id, expiresAt, ip: meta.ip, userAgent: meta.userAgent },
  })

  return { usuario: payload, accessToken, refreshToken }
}

export const refreshService = async (token, meta = {}) => {
  if (!token) throw { status: 401, message: 'Refresh token requerido', code: 'REFRESH_REQUERIDO' }

  let payload
  try {
    payload = verifyRefreshToken(token)
  } catch {
    throw { status: 401, message: 'Refresh token inválido o expirado', code: 'REFRESH_INVALIDO' }
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token } })
  if (!stored || stored.expiresAt < new Date()) {
    throw { status: 401, message: 'Refresh token inválido o expirado', code: 'REFRESH_INVALIDO' }
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: payload.id } })
  if (!usuario || !usuario.activo) {
    throw { status: 401, message: 'Usuario no encontrado o inactivo', code: 'USUARIO_INACTIVO' }
  }

  const userPayload = { id: usuario.id, nombre: usuario.nombre, email: usuario.email, superAdmin: usuario.superAdmin }
  const newAccessToken = signAccessToken(userPayload)
  const newRefreshToken = signRefreshToken({ id: usuario.id })

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRES_DAYS)

  try {
    // Se actualiza la misma fila (en vez de borrar+crear) para conservar createdAt
    // como fecha de inicio de sesión y así poder listar "sesiones activas" en el admin.
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: {
        token: newRefreshToken,
        expiresAt,
        lastUsedAt: new Date(),
        ip: meta.ip ?? stored.ip,
        userAgent: meta.userAgent ?? stored.userAgent,
      },
    })
  } catch (err) {
    // P2025 = la sesión fue expulsada/borrada por otra petición concurrente (p. ej. desde el admin)
    // P2002 = nuevo token duplicado (colisión de jti, prácticamente imposible)
    if (err.code === 'P2025' || err.code === 'P2002') {
      throw { status: 401, message: 'Sesión inválida, por favor inicia sesión de nuevo', code: 'REFRESH_INVALIDO' }
    }
    throw err
  }

  return { usuario: userPayload, accessToken: newAccessToken, refreshToken: newRefreshToken }
}

export const logoutService = async (token) => {
  if (!token) return
  try {
    await prisma.refreshToken.delete({ where: { token } })
  } catch {
    // ya expirado o inexistente — no es error
  }
}

export const cambiarContrasenaService = async (usuarioId, contrasenaActual, contrasenaNueva) => {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } })
  if (!usuario) throw { status: 404, message: 'Usuario no encontrado', code: 'USUARIO_NO_ENCONTRADO' }

  const valid = await bcrypt.compare(contrasenaActual, usuario.passwordHash)
  if (!valid) throw { status: 400, message: 'La contraseña actual es incorrecta', code: 'CONTRASENA_INCORRECTA' }

  const passwordHash = await bcrypt.hash(contrasenaNueva, 10)
  await prisma.usuario.update({ where: { id: usuarioId }, data: { passwordHash } })
}

export const meService = async (usuarioId) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    include: {
      equipos: {
        where: { activo: true },
        include: { equipo: { select: { id: true, nombre: true, color: true, activo: true } } },
      },
    },
  })
  if (!usuario) throw { status: 404, message: 'Usuario no encontrado', code: 'USUARIO_NO_ENCONTRADO' }
  const { passwordHash, ...safe } = usuario
  return safe
}

export const misEquiposService = async (usuarioId) => {
  const membresias = await prisma.miembroEquipo.findMany({
    where: { usuarioId, activo: true },
    include: { equipo: true },
    orderBy: { createdAt: 'asc' },
  })
  return membresias.map((m) => ({ ...m.equipo, rol: m.rol, nombreCorto: m.nombreCorto }))
}
