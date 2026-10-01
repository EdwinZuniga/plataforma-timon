import { Router } from 'express'
import { requireAuth, requireEquipo, requireRolMinimo, requirePermiso } from '../../middlewares/auth.js'
import { registerIntParams } from '../../middlewares/parseIntParams.js'
import * as svc from './reuniones.service.js'

const router = Router({ mergeParams: true })
registerIntParams(router)

router.get('/acuerdos', requireAuth, requireEquipo, requirePermiso('reuniones', 'ver'), async (req, res, next) => {
  try {
    const { estado, mios, reunionId } = req.query
    const data = await svc.listarAcuerdos(req.params.equipoId, {
      estado,
      miembroId: mios === '1' ? req.membresia.id : undefined,
      reunionId: reunionId ? Number(reunionId) : undefined,
    })
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

router.put('/acuerdos/:acuerdoId', requireAuth, requireEquipo, requirePermiso('reuniones', 'editar'), requireRolMinimo(['COORDINADOR', 'SECRETARIO']), async (req, res, next) => {
  try {
    const data = await svc.actualizarAcuerdo(req.params.equipoId, req.params.acuerdoId, req.body)
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

export default router
