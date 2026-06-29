import { Router } from 'express'
import { requireAuth, requireEquipo } from '../../middlewares/auth.js'
import { registerIntParams } from '../../middlewares/parseIntParams.js'
import * as ctrl from './dashboard.controller.js'

const router = Router({ mergeParams: true })
registerIntParams(router)

router.get('/', requireAuth, requireEquipo, ctrl.obtener)
router.get('/reportes/actividad/:actividadId', requireAuth, requireEquipo, ctrl.reporteActividad)
router.get('/reportes/hermano/:hermanoId', requireAuth, requireEquipo, ctrl.reporteHermano)

export default router
