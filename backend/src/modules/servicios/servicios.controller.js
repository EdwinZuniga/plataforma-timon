import * as svc from './servicios.service.js'

export const listarCatalogo = async (req, res, next) => {
  try {
    const data = await svc.listarCatalogo(req.params.equipoId)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const crearCatalogo = async (req, res, next) => {
  try {
    const { nombre, descripcion } = req.body
    if (!nombre) return next({ status: 400, message: 'El nombre del servicio es requerido', code: 'DATOS_REQUERIDOS' })
    const data = await svc.crearCatalogo(req.params.equipoId, { nombre, descripcion })
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}

export const crearServicio = async (req, res, next) => {
  try {
    const { catalogoServicioId, descripcion } = req.body
    if (!catalogoServicioId) return next({ status: 400, message: 'catalogoServicioId requerido', code: 'DATOS_REQUERIDOS' })
    const data = await svc.crearServicio(req.params.equipoId, req.params.actividadId, { catalogoServicioId: parseInt(catalogoServicioId), descripcion })
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}

export const listarServicios = async (req, res, next) => {
  try {
    const data = await svc.listarServicios(req.params.equipoId, req.params.actividadId)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const asignar = async (req, res, next) => {
  try {
    const { hermanoId } = req.body
    if (!hermanoId) return next({ status: 400, message: 'hermanoId requerido', code: 'DATOS_REQUERIDOS' })
    const data = await svc.asignarHermano(req.params.equipoId, req.params.servicioId, parseInt(hermanoId))
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const confirmar = async (req, res, next) => {
  try {
    const data = await svc.confirmarServicio(req.params.equipoId, req.params.servicioId)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const pendientes = async (req, res, next) => {
  try {
    const data = await svc.pendientes(req.params.equipoId)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}
