import * as svc from './admin.service.js'

// ─── STATS ────────────────────────────────────────────────────────────────────

export const stats = async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.obtenerStats() })
  } catch (err) { next(err) }
}

// ─── USUARIOS ─────────────────────────────────────────────────────────────────

export const listarUsuarios = async (req, res, next) => {
  try {
    const { search, page, limit } = req.query
    res.json({ success: true, data: await svc.listarUsuarios({ search, page: +page || 1, limit: +limit || 20 }) })
  } catch (err) { next(err) }
}

export const obtenerUsuario = async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.obtenerUsuario(req.params.id) })
  } catch (err) { next(err) }
}

export const crearUsuario = async (req, res, next) => {
  try {
    const data = await svc.crearUsuario(req.body)
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}

export const actualizarUsuario = async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.actualizarUsuario(req.params.id, req.body) })
  } catch (err) { next(err) }
}

export const eliminarUsuario = async (req, res, next) => {
  try {
    await svc.eliminarUsuario(req.params.id)
    res.json({ success: true })
  } catch (err) { next(err) }
}

// ─── EQUIPOS ──────────────────────────────────────────────────────────────────

export const listarEquipos = async (req, res, next) => {
  try {
    const { search, page, limit } = req.query
    res.json({ success: true, data: await svc.listarEquipos({ search, page: +page || 1, limit: +limit || 20 }) })
  } catch (err) { next(err) }
}

export const obtenerEquipo = async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.obtenerEquipo(req.params.id) })
  } catch (err) { next(err) }
}

export const crearEquipo = async (req, res, next) => {
  try {
    const data = await svc.crearEquipo(req.body)
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}

export const actualizarEquipo = async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.actualizarEquipo(req.params.id, req.body) })
  } catch (err) { next(err) }
}

// ─── MEMBRESÍAS ───────────────────────────────────────────────────────────────

export const asignarMiembro = async (req, res, next) => {
  try {
    const { usuarioId, rol } = req.body
    const data = await svc.asignarMiembro(req.params.id, usuarioId, rol)
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}

export const actualizarMembresia = async (req, res, next) => {
  try {
    const data = await svc.actualizarMembresia(req.params.miembroId, req.body)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

// ─── PERMISOS ─────────────────────────────────────────────────────────────────

export const obtenerPermisosUsuario = async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.obtenerPermisosUsuario(req.params.id) })
  } catch (err) { next(err) }
}

export const guardarPermisosMembresia = async (req, res, next) => {
  try {
    const { permisos } = req.body
    if (!Array.isArray(permisos)) {
      return next({ status: 400, message: 'permisos debe ser un array', code: 'DATOS_REQUERIDOS' })
    }
    const data = await svc.guardarPermisosMembresia(req.params.miembroId, permisos)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const limpiarPermisosMembresia = async (req, res, next) => {
  try {
    await svc.limpiarPermisosMembresia(req.params.miembroId)
    res.json({ success: true })
  } catch (err) { next(err) }
}

// ─── SESIONES ACTIVAS ─────────────────────────────────────────────────────────

export const listarSesiones = async (req, res, next) => {
  try {
    const { search, page, limit } = req.query
    res.json({ success: true, data: await svc.listarSesiones({ search, page: +page || 1, limit: +limit || 20 }) })
  } catch (err) { next(err) }
}

export const expulsarSesion = async (req, res, next) => {
  try {
    await svc.expulsarSesion(req.params.id)
    res.json({ success: true })
  } catch (err) { next(err) }
}
