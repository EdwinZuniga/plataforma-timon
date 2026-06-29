import * as svc from './reuniones.service.js'

export const listar = async (req, res, next) => {
  try {
    const result = await svc.listarReuniones(req.params.equipoId, req.query)
    res.json({ success: true, ...result })
  } catch (err) { next(err) }
}

export const crear = async (req, res, next) => {
  try {
    const { titulo, fecha, lugar, participantes } = req.body
    if (!titulo || !fecha) {
      return next({ status: 400, message: 'Título y fecha son requeridos', code: 'DATOS_REQUERIDOS' })
    }
    const data = await svc.crearReunion(req.params.equipoId, req.usuario.id, { titulo, fecha, lugar, participantes })
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}

export const obtener = async (req, res, next) => {
  try {
    const data = await svc.obtenerReunion(req.params.equipoId, req.params.id)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const actualizar = async (req, res, next) => {
  try {
    const data = await svc.actualizarReunion(req.params.equipoId, req.params.id, req.body)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const crearAcuerdo = async (req, res, next) => {
  try {
    const { descripcion, responsable, fechaLimite } = req.body
    if (!descripcion) return next({ status: 400, message: 'La descripción del acuerdo es requerida', code: 'DATOS_REQUERIDOS' })
    const data = await svc.crearAcuerdo(req.params.equipoId, req.params.id, { descripcion, responsable, fechaLimite })
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}

export const generarTexto = async (req, res, next) => {
  try {
    const data = await svc.generarTexto(req.params.equipoId, req.params.id)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}
