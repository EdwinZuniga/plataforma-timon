import { Router } from 'express'
import { requireAuth, requireEquipo, requireRolMinimo } from '../../middlewares/auth.js'
import { registerIntParams } from '../../middlewares/parseIntParams.js'
import * as svc from './reuniones.service.js'

const router = Router({ mergeParams: true })
registerIntParams(router)

router.put('/acuerdos/:acuerdoId', requireAuth, requireEquipo, requireRolMinimo(['COORDINADOR', 'SECRETARIO']), async (req, res, next) => {
  try {
    const data = await svc.actualizarAcuerdo(req.params.acuerdoId, req.body)
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

export default router
