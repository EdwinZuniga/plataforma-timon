import { Router } from 'express'
import { requireAuth, requireEquipo } from '../../middlewares/auth.js'
import { registerIntParams } from '../../middlewares/parseIntParams.js'
import * as svc from './calendario.service.js'

const router = Router({ mergeParams: true })
registerIntParams(router)

const FECHA = /^\d{4}-\d{2}-\d{2}$/
const MAX_DIAS = 400

// Valida ?desde=&hasta=; si es inválido responde el error y devuelve null.
const rango = (req, next) => {
  const { desde, hasta } = req.query
  if (!FECHA.test(desde || '') || !FECHA.test(hasta || '') || desde > hasta) {
    next({ status: 400, message: 'Rango de fechas inválido (desde/hasta en formato YYYY-MM-DD)', code: 'RANGO_INVALIDO' })
    return null
  }
  if ((new Date(hasta) - new Date(desde)) / 86400000 > MAX_DIAS) {
    next({ status: 400, message: 'El rango no puede superar 400 días', code: 'RANGO_EXCESIVO' })
    return null
  }
  return { desde, hasta }
}

router.get('/calendario', requireAuth, requireEquipo, async (req, res, next) => {
  try {
    const r = rango(req, next)
    if (!r) return
    const data = await svc.eventosEquipo(req.params.equipoId, req.membresia, req.usuario, r.desde, r.hasta)
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

router.get('/calendario.ics', requireAuth, requireEquipo, async (req, res, next) => {
  try {
    const r = rango(req, next)
    if (!r) return
    const eventos = await svc.eventosEquipo(req.params.equipoId, req.membresia, req.usuario, r.desde, r.hasta)
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="calendario-timon.ics"')
    res.send(svc.generarIcs(eventos, req.equipo.nombre))
  } catch (err) { next(err) }
})

router.get('/avisos', requireAuth, requireEquipo, async (req, res, next) => {
  try {
    const data = await svc.avisosMiembro(req.params.equipoId, req.membresia, req.usuario)
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

export default router
