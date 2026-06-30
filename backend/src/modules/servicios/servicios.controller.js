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

export const listarTodos = async (req, res, next) => {
  try {
    const { estado, page, origenOCR, anio, mes, catalogoServicioId } = req.query
    const data = await svc.listarTodos(req.params.equipoId, { estado, page, origenOCR, anio, mes, catalogoServicioId })
    res.json({ success: true, ...data })
  } catch (err) { next(err) }
}

export const asignar = async (req, res, next) => {
  try {
    const { miembroId } = req.body
    if (!miembroId) return next({ status: 400, message: 'miembroId requerido', code: 'DATOS_REQUERIDOS' })
    const data = await svc.asignarMiembro(req.params.equipoId, req.params.servicioId, parseInt(miembroId))
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const desasignar = async (req, res, next) => {
  try {
    const { miembroId } = req.body
    if (!miembroId) return next({ status: 400, message: 'miembroId requerido', code: 'DATOS_REQUERIDOS' })
    const data = await svc.desasignarMiembro(req.params.equipoId, req.params.servicioId, parseInt(miembroId))
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const confirmar = async (req, res, next) => {
  try {
    const data = await svc.confirmarServicio(req.params.equipoId, req.params.servicioId)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const finalizar = async (req, res, next) => {
  try {
    const data = await svc.finalizarServicio(req.params.equipoId, req.params.servicioId)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const reabrir = async (req, res, next) => {
  try {
    const data = await svc.reabrirServicio(req.params.equipoId, req.params.servicioId)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const editar = async (req, res, next) => {
  try {
    const { catalogoServicioId, descripcion, horaServicio, comunidadSolicitante, actividadFecha, actividadLugar, actividadNombre } = req.body
    const data = await svc.editarServicio(req.params.equipoId, req.params.servicioId, {
      catalogoServicioId: catalogoServicioId !== undefined ? parseInt(catalogoServicioId) : undefined,
      descripcion, horaServicio, comunidadSolicitante, actividadFecha, actividadLugar, actividadNombre,
    })
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const eliminar = async (req, res, next) => {
  try {
    await svc.eliminarServicio(req.params.equipoId, req.params.servicioId)
    res.json({ success: true })
  } catch (err) { next(err) }
}

export const pendientes = async (req, res, next) => {
  try {
    const data = await svc.pendientes(req.params.equipoId)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}
