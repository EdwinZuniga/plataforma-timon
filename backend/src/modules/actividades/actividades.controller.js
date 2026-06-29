import * as svc from './actividades.service.js'

export const listar = async (req, res, next) => {
  try {
    const result = await svc.listarActividades(req.params.equipoId, req.query)
    res.json({ success: true, ...result })
  } catch (err) { next(err) }
}

export const crear = async (req, res, next) => {
  try {
    const { nombre, tipo, fecha, lugar, descripcion } = req.body
    if (!nombre || !tipo || !fecha) {
      return next({ status: 400, message: 'Nombre, tipo y fecha son requeridos', code: 'DATOS_REQUERIDOS' })
    }
    const data = await svc.crearActividad(req.params.equipoId, { nombre, tipo, fecha, lugar, descripcion })
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}

export const obtener = async (req, res, next) => {
  try {
    const data = await svc.obtenerActividad(req.params.equipoId, req.params.id)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const actualizar = async (req, res, next) => {
  try {
    const data = await svc.actualizarActividad(req.params.equipoId, req.params.id, req.body)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const listarAsistencia = async (req, res, next) => {
  try {
    const data = await svc.listarAsistencia(req.params.equipoId, req.params.id, req.query)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const guardarAsistencia = async (req, res, next) => {
  try {
    const { registros } = req.body
    if (!Array.isArray(registros)) {
      return next({ status: 400, message: 'Se espera un array de registros', code: 'DATOS_INVALIDOS' })
    }
    const data = await svc.guardarAsistencia(req.params.equipoId, req.params.id, registros)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}
