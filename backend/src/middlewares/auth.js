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
  // Si requirePermiso ya concedió acceso explícito, omitir verificación de rol
  if (req.permisoExplicito) return next()
  if (!rolesPermitidos.includes(req.membresia.rol)) {
    return next({ status: 403, message: 'Rol insuficiente para esta acción', code: 'ROL_INSUFICIENTE' })
  }
  next()
}

export const requireSuperAdmin = (req, res, next) => {
  if (!req.usuario?.superAdmin) {
    return next({ status: 403, message: 'Acceso restringido a SuperAdministradores', code: 'SUPERADMIN_REQUERIDO' })
  }
  next()
}

// Verifica permiso granular sobre un módulo.
// Si el miembro no tiene ningún registro explícito → permite (hereda comportamiento de rol).
// Si tiene registro para ese módulo → aplica la bandera específica.
// Verifica permiso granular sobre un módulo.
// - Sin registro explícito → deja pasar (requireRolMinimo manejará el control por rol).
// - Con registro que concede permiso → establece req.permisoExplicito=true para saltar requireRolMinimo.
// - Con registro que deniega → 403 inmediato.
export const requirePermiso = (modulo, accion) => async (req, res, next) => {
  if (req.usuario?.superAdmin) return next()
  try {
    const miembroId = req.membresia.id
    const permiso = await prisma.permisoUsuario.findUnique({
      where: { miembroId_modulo: { miembroId, modulo } },
    })
    if (!permiso) return next() // Sin config explícita → el rol decide
    if (!permiso[accion]) {
      return next({ status: 403, message: 'No tienes permiso para esta acción', code: 'PERMISO_DENEGADO' })
    }
    req.permisoExplicito = true // Permiso explícito concedido → omitir requireRolMinimo
    next()
  } catch (err) { next(err) }
}
