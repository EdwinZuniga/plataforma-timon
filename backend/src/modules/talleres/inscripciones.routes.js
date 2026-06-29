import { Router } from 'express'
import { requireAuth, requireEquipo, requireRolMinimo } from '../../middlewares/auth.js'
import { registerIntParams } from '../../middlewares/parseIntParams.js'
import * as svc from './talleres.service.js'

const router = Router({ mergeParams: true })
registerIntParams(router)

router.post('/ediciones/:edicionId/inscripciones', requireAuth, requireEquipo, requireRolMinimo(['COORDINADOR', 'SECRETARIO']), async (req, res, next) => {
  try {
    const { hermanoIds } = req.body
    if (!Array.isArray(hermanoIds) || hermanoIds.length === 0) {
      return next({ status: 400, message: 'Se requiere un array de hermanoIds', code: 'DATOS_INVALIDOS' })
    }
    const data = await svc.inscribirHermanos(req.params.equipoId, req.params.edicionId, hermanoIds.map(Number))
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
})

router.put('/inscripciones/:inscripcionId', requireAuth, requireEquipo, requireRolMinimo(['COORDINADOR', 'SECRETARIO']), async (req, res, next) => {
  try {
    const { asistio, aprobado, certificado } = req.body
    const data = await svc.actualizarInscripcion(req.params.inscripcionId, { asistio, aprobado, certificado })
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

router.delete('/inscripciones/:inscripcionId', requireAuth, requireEquipo, requireRolMinimo(['COORDINADOR', 'SECRETARIO']), async (req, res, next) => {
  try {
    await svc.eliminarInscripcion(req.params.inscripcionId)
    res.json({ success: true })
  } catch (err) { next(err) }
})

router.put('/inscripciones/:inscripcionId/asistencia-mes', requireAuth, requireEquipo, requireRolMinimo(['COORDINADOR', 'SECRETARIO']), async (req, res, next) => {
  try {
    const { mes, anio, estado } = req.body
    if (!mes || !anio || !estado) {
      return next({ status: 400, message: 'mes, anio y estado son requeridos', code: 'DATOS_REQUERIDOS' })
    }
    if (!['PRESENTE', 'AUSENTE', 'PERMISO'].includes(estado)) {
      return next({ status: 400, message: 'estado debe ser PRESENTE, AUSENTE o PERMISO', code: 'ESTADO_INVALIDO' })
    }
    const data = await svc.upsertAsistenciaMes(req.params.inscripcionId, mes, anio, estado)
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

router.put('/inscripciones/:inscripcionId/tarea-mes', requireAuth, requireEquipo, requireRolMinimo(['COORDINADOR', 'SECRETARIO']), async (req, res, next) => {
  try {
    const { mes, anio, entrego, notas } = req.body
    if (mes === undefined || anio === undefined || entrego === undefined) {
      return next({ status: 400, message: 'mes, anio y entrego son requeridos', code: 'DATOS_REQUERIDOS' })
    }
    const data = await svc.upsertTareaEntrega(req.params.inscripcionId, mes, anio, entrego, notas)
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

router.get('/inscripciones/:inscripcionId/resumen', requireAuth, requireEquipo, async (req, res, next) => {
  try {
    const data = await svc.resumenInscripcion(req.params.equipoId, req.params.inscripcionId)
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

router.put('/inscripciones/:inscripcionId/participacion-mes', requireAuth, requireEquipo, requireRolMinimo(['COORDINADOR', 'SECRETARIO']), async (req, res, next) => {
  try {
    const { mes, anio, participo, notas } = req.body
    if (mes === undefined || anio === undefined || participo === undefined) {
      return next({ status: 400, message: 'mes, anio y participo son requeridos', code: 'DATOS_REQUERIDOS' })
    }
    const data = await svc.upsertParticipacionMes(req.params.inscripcionId, mes, anio, participo, notas)
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

export default router
