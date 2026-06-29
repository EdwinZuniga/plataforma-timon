import { verifyAccessToken } from '../config/jwt.js'
import prisma from '../config/database.js'

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return next({ status: 401, message: 'Token de acceso requerido', code: 'TOKEN_REQUERIDO' })
  }
  try {
    const token = authHeader.slice(7)
    req.usuario = verifyAccessToken(token)
    next()
  } catch {
    next({ status: 401, message: 'Token inválido o expirado', code: 'TOKEN_INVALIDO' })
  }
}

export const requireEquipo = async (req, res, next) => {
  const equipoId = parseInt(req.params.equipoId) || parseInt(req.body.equipoId) || parseInt(req.query.equipoId)
  if (!equipoId || isNaN(equipoId)) {
    return next({ status: 400, message: 'equipoId requerido', code: 'EQUIPO_REQUERIDO' })
  }
  try {
    const membresia = await prisma.miembroEquipo.findUnique({
      where: { usuarioId_equipoId: { usuarioId: req.usuario.id, equipoId } },
      include: { equipo: true },
    })
    if (!membresia || !membresia.activo) {
      return next({ status: 403, message: 'No tienes acceso a este equipo', code: 'ACCESO_DENEGADO' })
    }
    req.params.equipoId = equipoId
    req.equipo = membresia.equipo
    req.membresia = membresia
    next()
  } catch (err) {
    next(err)
  }
}

export const requireRolMinimo = (rolesPermitidos) => (req, res, next) => {
  if (!rolesPermitidos.includes(req.membresia.rol)) {
    return next({ status: 403, message: 'Rol insuficiente para esta acción', code: 'ROL_INSUFICIENTE' })
  }
  next()
}
