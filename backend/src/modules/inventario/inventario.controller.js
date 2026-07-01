import * as svc from './inventario.service.js'

export const resumen = async (req, res, next) => {
  try {
    const data = await svc.resumenInventario(req.params.equipoId)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

// ─── Artículos ───────────────────────────────────────────────────────────────

export const listarArticulos = async (req, res, next) => {
  try {
    const { busqueda, categoria } = req.query
    const data = await svc.listarArticulos(req.params.equipoId, { busqueda, categoria })
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const obtenerArticulo = async (req, res, next) => {
  try {
    const data = await svc.obtenerArticulo(req.params.id, req.params.equipoId)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const crearArticulo = async (req, res, next) => {
  try {
    const { nombre, descripcion, categoria, cantidad, condicion, ubicacion, notas } = req.body
    if (!nombre) return next({ status: 400, message: 'El nombre del artículo es requerido', code: 'DATOS_REQUERIDOS' })
    const data = await svc.crearArticulo(req.params.equipoId, { nombre, descripcion, categoria, cantidad, condicion, ubicacion, notas })
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}

export const actualizarArticulo = async (req, res, next) => {
  try {
    const { nombre, descripcion, categoria, cantidad, condicion, ubicacion, notas, activo } = req.body
    const data = await svc.actualizarArticulo(req.params.id, req.params.equipoId, { nombre, descripcion, categoria, cantidad, condicion, ubicacion, notas, activo })
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const eliminarArticulo = async (req, res, next) => {
  try {
    await svc.eliminarArticulo(req.params.id, req.params.equipoId)
    res.json({ success: true })
  } catch (err) { next(err) }
}

export const listarCategorias = async (req, res, next) => {
  try {
    const data = await svc.listarCategorias(req.params.equipoId)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

// ─── Préstamos ───────────────────────────────────────────────────────────────

export const listarPrestamos = async (req, res, next) => {
  try {
    const { estado } = req.query
    const data = await svc.listarPrestamos(req.params.equipoId, { estado })
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const crearPrestamo = async (req, res, next) => {
  try {
    const { articuloId, cantidadPrestada, prestadoA, contacto, fechaPrestamo, fechaEsperada, notas } = req.body
    if (!articuloId || !prestadoA || !fechaPrestamo) {
      return next({ status: 400, message: 'articuloId, prestadoA y fechaPrestamo son requeridos', code: 'DATOS_REQUERIDOS' })
    }
    const data = await svc.crearPrestamo(req.params.equipoId, req.membresia.id, { articuloId, cantidadPrestada, prestadoA, contacto, fechaPrestamo, fechaEsperada, notas })
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}

export const registrarDevolucion = async (req, res, next) => {
  try {
    const { notasDevolucion } = req.body
    const data = await svc.registrarDevolucion(req.params.id, req.params.equipoId, notasDevolucion)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const actualizarPrestamo = async (req, res, next) => {
  try {
    const { prestadoA, contacto, fechaEsperada, notas } = req.body
    const data = await svc.actualizarPrestamo(req.params.id, req.params.equipoId, { prestadoA, contacto, fechaEsperada, notas })
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const eliminarPrestamo = async (req, res, next) => {
  try {
    await svc.eliminarPrestamo(req.params.id, req.params.equipoId)
    res.json({ success: true })
  } catch (err) { next(err) }
}
