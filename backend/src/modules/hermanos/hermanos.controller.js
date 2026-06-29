import * as svc from './hermanos.service.js'

export const listar = async (req, res, next) => {
  try {
    const result = await svc.listarHermanos(req.params.equipoId, req.query)
    res.json({ success: true, ...result })
  } catch (err) { next(err) }
}

export const crear = async (req, res, next) => {
  try {
    const { nombre, apellido, telefono, email, comunidadId, notas } = req.body
    if (!nombre || !comunidadId) {
      return next({ status: 400, message: 'Nombre y comunidad son requeridos', code: 'DATOS_REQUERIDOS' })
    }
    const data = await svc.crearHermano({ nombre, apellido, telefono, email, comunidadId: parseInt(comunidadId), notas })
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}

export const obtener = async (req, res, next) => {
  try {
    const data = await svc.obtenerHermano(req.params.equipoId, req.params.id)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const historial = async (req, res, next) => {
  try {
    const data = await svc.historialHermano(req.params.equipoId, req.params.id)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const actualizar = async (req, res, next) => {
  try {
    const data = await svc.actualizarHermano(req.params.equipoId, req.params.id, req.body)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const eliminar = async (req, res, next) => {
  try {
    await svc.eliminarHermano(req.params.equipoId, req.params.id)
    res.json({ success: true })
  } catch (err) { next(err) }
}
