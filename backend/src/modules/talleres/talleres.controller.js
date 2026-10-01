import * as svc from './talleres.service.js'

export const listar = async (req, res, next) => {
  try {
    const data = await svc.listarTalleres(req.params.equipoId)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const crear = async (req, res, next) => {
  try {
    const { nombre, descripcion } = req.body
    if (!nombre) return next({ status: 400, message: 'El nombre del taller es requerido', code: 'DATOS_REQUERIDOS' })
    const data = await svc.crearTaller(req.params.equipoId, { nombre, descripcion })
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}

export const obtener = async (req, res, next) => {
  try {
    const data = await svc.obtenerTaller(req.params.equipoId, req.params.id)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const actualizar = async (req, res, next) => {
  try {
    const data = await svc.actualizarTaller(req.params.equipoId, req.params.id, req.body)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const listarEdiciones = async (req, res, next) => {
  try {
    const result = await svc.listarEdiciones(req.params.equipoId, req.params.id, req.query)
    res.json({ success: true, ...result })
  } catch (err) { next(err) }
}

// Patrón mensual de las sesiones. Valor vacío o inválido = sin patrón.
// Si no viene ninguno de los dos campos, no se toca lo que ya hay guardado.
const patronSesion = (semana, dia) => {
  if (semana === undefined && dia === undefined) return {}
  const s = parseInt(semana)
  const d = parseInt(dia)
  const valido = s >= 1 && s <= 5 && d >= 0 && d <= 6
  return { semanaSesion: valido ? s : null, diaSesion: valido ? d : null }
}

export const crearEdicion = async (req, res, next) => {
  try {
    const { fecha, fechaFin, lugar, notas, coordinadorId, semanaSesion, diaSesion } = req.body
    if (!fecha) return next({ status: 400, message: 'La fecha de la edición es requerida', code: 'DATOS_REQUERIDOS' })
    const parsedCoordinadorId = coordinadorId && coordinadorId !== '' ? parseInt(coordinadorId) : null
    const data = await svc.crearEdicion(req.params.equipoId, req.params.id, {
      fecha: new Date(fecha),
      ...(fechaFin && { fechaFin: new Date(fechaFin) }),
      lugar,
      notas,
      ...patronSesion(semanaSesion, diaSesion),
      ...(parsedCoordinadorId && { coordinadorId: parsedCoordinadorId }),
    })
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}

export const obtenerEdicion = async (req, res, next) => {
  try {
    const data = await svc.obtenerEdicion(req.params.equipoId, req.params.id, req.params.edicionId)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const actualizarEdicion = async (req, res, next) => {
  try {
    const { fecha, fechaFin, lugar, notas, coordinadorId, semanaSesion, diaSesion } = req.body
    const data = await svc.actualizarEdicion(req.params.equipoId, req.params.id, req.params.edicionId, {
      ...(fecha && { fecha: new Date(fecha) }),
      fechaFin: fechaFin ? new Date(fechaFin) : null,
      lugar,
      notas,
      ...patronSesion(semanaSesion, diaSesion),
      coordinadorId: coordinadorId && coordinadorId !== '' ? parseInt(coordinadorId) : null,
    })
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const eliminarEdicion = async (req, res, next) => {
  try {
    await svc.eliminarEdicion(req.params.equipoId, req.params.id, req.params.edicionId)
    res.json({ success: true })
  } catch (err) { next(err) }
}

export const listarParaInscripcion = async (req, res, next) => {
  try {
    const data = await svc.listarParaInscripcion(req.params.equipoId)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const estadisticas = async (req, res, next) => {
  try {
    const data = await svc.estadisticas(req.params.equipoId)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}
