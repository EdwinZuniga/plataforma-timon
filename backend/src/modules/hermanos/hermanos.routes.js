import { Router } from 'express'
import { requireAuth, requireEquipo, requireRolMinimo } from '../../middlewares/auth.js'
import { registerIntParams } from '../../middlewares/parseIntParams.js'
import * as ctrl from './hermanos.controller.js'

const router = Router({ mergeParams: true })
registerIntParams(router)

router.get('/', requireAuth, requireEquipo, ctrl.listar)
router.post('/', requireAuth, requireEquipo, requireRolMinimo(['COORDINADOR', 'SECRETARIO', 'ENLACE']), ctrl.crear)
router.get('/:id', requireAuth, requireEquipo, ctrl.obtener)
router.get('/:id/historial', requireAuth, requireEquipo, ctrl.historial)
router.put('/:id', requireAuth, requireEquipo, requireRolMinimo(['COORDINADOR', 'SECRETARIO', 'ENLACE']), ctrl.actualizar)
router.delete('/:id', requireAuth, requireEquipo, requireRolMinimo(['COORDINADOR']), ctrl.eliminar)

export default router
