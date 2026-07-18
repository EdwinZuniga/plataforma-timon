import * as svc from './comunidades.service.js'

export const listar = async (req, res, next) => {
  try {
    const result = await svc.listarComunidades(req.query)
    res.json({ success: true, ...result })
  } catch (err) { next(err) }
}

export const crear = async (req, res, next) => {
  try {
    const { nombre, departamento, numero, estado, enlaceId, enlaceConsejo, fechaEleccion, lugarAsamblea, horarioAsamblea, oficial, notas } = req.body
    if (!nombre || !departamento) {
      return next({ status: 400, message: 'Nombre y departamento son requeridos', code: 'DATOS_REQUERIDOS' })
    }
    const data = await svc.crearComunidad({ nombre, departamento, numero, estado, enlaceId, enlaceConsejo, fechaEleccion, lugarAsamblea, horarioAsamblea, oficial, notas })
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
    const data = await svc.actualizarComunidad(req.params.id, req.body)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const eliminar = async (req, res, next) => {
  try {
    await svc.eliminarComunidad(req.params.id)
    res.json({ success: true })
  } catch (err) { next(err) }
}

// ─── MIEMBROS CONSEJO ─────────────────────────────────────────────────────────

export const crearMiembroConsejo = async (req, res, next) => {
  try {
    const data = await svc.crearMiembroConsejo(req.params.id, req.body)
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}

export const actualizarMiembroConsejo = async (req, res, next) => {
  try {
    const data = await svc.actualizarMiembroConsejo(req.params.id, req.params.miembroId, req.body)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const eliminarMiembroConsejo = async (req, res, next) => {
  try {
    await svc.eliminarMiembroConsejo(req.params.id, req.params.miembroId)
    res.json({ success: true })
  } catch (err) { next(err) }
}

// ─── VISITAS ─────────────────────────────────────────────────────────────────

export const crearVisita = async (req, res, next) => {
  try {
    const data = await svc.crearVisita(req.params.equipoId, req.params.id, req.body)
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}

export const actualizarVisita = async (req, res, next) => {
  try {
    const data = await svc.actualizarVisita(req.params.equipoId, req.params.id, req.params.visitaId, req.body)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const eliminarVisita = async (req, res, next) => {
  try {
    await svc.eliminarVisita(req.params.equipoId, req.params.id, req.params.visitaId)
    res.json({ success: true })
  } catch (err) { next(err) }
}
