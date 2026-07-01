import * as svc from './equipos.service.js'

export const listar = async (req, res, next) => {
  try {
    const data = await svc.listarEquipos(req.usuario.id)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const crear = async (req, res, next) => {
  try {
    const { nombre, descripcion, color } = req.body
    if (!nombre) return next({ status: 400, message: 'El nombre del equipo es requerido', code: 'DATOS_REQUERIDOS' })
    const data = await svc.crearEquipo({ nombre, descripcion, color }, req.usuario.id)
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}

export const obtener = async (req, res, next) => {
  try {
    const data = await svc.obtenerEquipo(req.params.equipoId)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const actualizar = async (req, res, next) => {
  try {
    const { nombre, descripcion, color, activo } = req.body
    const data = await svc.actualizarEquipo(req.params.equipoId, { nombre, descripcion, color, activo })
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const listarMiembros = async (req, res, next) => {
  try {
    const data = await svc.listarMiembros(req.params.equipoId)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const agregarMiembro = async (req, res, next) => {
  try {
    const { email, rol = 'CONSULTOR', nombreCorto, nombre } = req.body
    if (!email) return next({ status: 400, message: 'El email del usuario es requerido', code: 'DATOS_REQUERIDOS' })
    const data = await svc.agregarMiembro(req.params.equipoId, email, rol, nombreCorto, nombre)
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}

export const actualizarMiembro = async (req, res, next) => {
  try {
    const { rol, nombreCorto, activo, nombre, email } = req.body
    const data = await svc.actualizarMiembro(req.params.miembroId, { rol, nombreCorto, activo, nombre, email })
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const desactivarMiembro = async (req, res, next) => {
  try {
    await svc.desactivarMiembro(req.params.miembroId)
    res.json({ success: true })
  } catch (err) { next(err) }
}
