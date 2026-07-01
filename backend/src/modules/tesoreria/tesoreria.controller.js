import * as svc from './tesoreria.service.js'

export const listarMovimientos = async (req, res, next) => {
  try {
    const { caja, tipo, fechaDesde, fechaHasta, anio } = req.query
    const data = await svc.listarMovimientos(req.params.equipoId, { caja, tipo, fechaDesde, fechaHasta, anio })
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const resumen = async (req, res, next) => {
  try {
    const anio = req.query.anio || new Date().getFullYear()
    const data = await svc.resumenTesoreria(req.params.equipoId, anio)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const crearMovimiento = async (req, res, next) => {
  try {
    const { tipo, caja, concepto, categoria, monto, fecha, descripcion, actividadId } = req.body
    if (!tipo || !caja || !concepto || monto === undefined || !fecha) {
      return next({ status: 400, message: 'tipo, caja, concepto, monto y fecha son requeridos', code: 'DATOS_REQUERIDOS' })
    }
    if (!['INGRESO', 'EGRESO'].includes(tipo)) {
      return next({ status: 400, message: 'tipo debe ser INGRESO o EGRESO', code: 'TIPO_INVALIDO' })
    }
    if (!['GENERAL', 'CHICA'].includes(caja)) {
      return next({ status: 400, message: 'caja debe ser GENERAL o CHICA', code: 'CAJA_INVALIDA' })
    }
    const data = await svc.crearMovimiento(req.params.equipoId, req.membresia.id, {
      tipo, caja, concepto, categoria, monto, fecha, descripcion, actividadId,
    })
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}

export const actualizarMovimiento = async (req, res, next) => {
  try {
    const { tipo, caja, concepto, categoria, monto, fecha, descripcion, actividadId } = req.body
    const data = await svc.actualizarMovimiento(
      req.params.id, req.params.equipoId,
      { tipo, caja, concepto, categoria, monto, fecha, descripcion, actividadId },
    )
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const eliminarMovimiento = async (req, res, next) => {
  try {
    await svc.eliminarMovimiento(req.params.id, req.params.equipoId)
    res.json({ success: true })
  } catch (err) { next(err) }
}

export const listarOfrendas = async (req, res, next) => {
  try {
    const anio = req.query.anio || new Date().getFullYear()
    const data = await svc.listarOfrendas(req.params.equipoId, anio)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const registrarOfrendas = async (req, res, next) => {
  try {
    const { miembroId, fechas, monto } = req.body
    if (!miembroId || !Array.isArray(fechas) || fechas.length === 0) {
      return next({ status: 400, message: 'miembroId y fechas son requeridos', code: 'DATOS_REQUERIDOS' })
    }
    const data = await svc.registrarOfrendas(req.params.equipoId, parseInt(miembroId), fechas, monto)
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}

export const eliminarOfrenda = async (req, res, next) => {
  try {
    await svc.eliminarOfrenda(req.params.id, req.params.equipoId)
    res.json({ success: true })
  } catch (err) { next(err) }
}
