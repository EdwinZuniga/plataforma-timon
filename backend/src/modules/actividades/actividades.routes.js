import { Router } from 'express'
import { requireAuth, requireEquipo, requireRolMinimo } from '../../middlewares/auth.js'
import { registerIntParams } from '../../middlewares/parseIntParams.js'
import * as ctrl from './actividades.controller.js'

const router = Router({ mergeParams: true })
registerIntParams(router)

router.get('/', requireAuth, requireEquipo, ctrl.listar)
router.post('/', requireAuth, requireEquipo, requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.crear)
router.get('/:id', requireAuth, requireEquipo, ctrl.obtener)
router.put('/:id', requireAuth, requireEquipo, requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.actualizar)
router.get('/:id/asistencia', requireAuth, requireEquipo, ctrl.listarAsistencia)
router.post('/:id/asistencia', requireAuth, requireEquipo, ctrl.guardarAsistencia)

export default router
