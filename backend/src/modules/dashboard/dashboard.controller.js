import * as svc from './dashboard.service.js'

export const obtener = async (req, res, next) => {
  try {
    const data = await svc.obtenerDashboard(req.params.equipoId)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const reporteActividad = async (req, res, next) => {
  try {
    const data = await svc.reporteActividad(req.params.equipoId, req.params.actividadId)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}

export const reporteHermano = async (req, res, next) => {
  try {
    const data = await svc.reporteHermano(req.params.equipoId, req.params.hermanoId)
    res.json({ success: true, data })
  } catch (err) { next(err) }
}
