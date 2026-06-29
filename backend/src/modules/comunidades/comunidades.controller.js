import * as svc from './comunidades.service.js'

export const listar = async (req, res, next) => {
  try {
    const result = await svc.listarComunidades(req.params.equipoId, req.query)
    res.json({ success: true, ...result })
  } catch (err) { next(err) }
}

export const crear = async (req, res, next) => {
  try {
    const { nombre, departamento, numero, estado, enlaceId, enlaceConsejo, fechaEleccion, lugarAsamblea, horarioAsamblea, oficial, notas } = req.body
    if (!nombre || !departamento) {
      return next({ status: 400, message: 'Nombre y departamento son requeridos', code: 'DATOS_REQUERIDOS' })
    }
    const data = await svc.crearComunidad(req.params.equipoId, { nombre, departamento, numero, estado, enlaceId, enlaceConsejo, fechaEleccion, lugarAsamblea, horarioAsamblea, oficial, notas })
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}

export const obtener = async (req, res, next) => {
  try {
    const data = await svc.obtenerComunidad(req.params.equipoId, req.params.id)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const actualizar = async (req, res, next) => {
  try {
    const data = await svc.actualizarComunidad(req.params.equipoId, req.params.id, req.body)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const eliminar = async (req, res, next) => {
  try {
    await svc.eliminarComunidad(req.params.equipoId, req.params.id)
    res.json({ success: true })
  } catch (err) { next(err) }
}
