import { Router } from 'express'
import { requireAuth, requireEquipo, requireRolMinimo, requirePermiso } from '../../middlewares/auth.js'
import { registerIntParams } from '../../middlewares/parseIntParams.js'
import * as ctrl from './hermanos.controller.js'

const router = Router({ mergeParams: true })
registerIntParams(router)

router.get('/', requireAuth, requireEquipo, requirePermiso('hermanos', 'ver'), ctrl.listar)
router.post('/', requireAuth, requireEquipo, requirePermiso('hermanos', 'crear'), requireRolMinimo(['COORDINADOR', 'SECRETARIO', 'ENLACE']), ctrl.crear)
router.get('/:id', requireAuth, requireEquipo, requirePermiso('hermanos', 'ver'), ctrl.obtener)
router.get('/:id/historial', requireAuth, requireEquipo, requirePermiso('hermanos', 'ver'), ctrl.historial)
router.put('/:id', requireAuth, requireEquipo, requirePermiso('hermanos', 'editar'), requireRolMinimo(['COORDINADOR', 'SECRETARIO', 'ENLACE']), ctrl.actualizar)
router.delete('/:id', requireAuth, requireEquipo, requirePermiso('hermanos', 'eliminar'), requireRolMinimo(['COORDINADOR']), ctrl.eliminar)

export default router
