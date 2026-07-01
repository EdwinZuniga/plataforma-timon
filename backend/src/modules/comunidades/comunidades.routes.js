import { Router } from 'express'
import { requireAuth, requireEquipo, requireRolMinimo, requirePermiso } from '../../middlewares/auth.js'
import { registerIntParams } from '../../middlewares/parseIntParams.js'
import * as ctrl from './comunidades.controller.js'

const router = Router({ mergeParams: true })
registerIntParams(router)

router.get('/', requireAuth, requireEquipo, requirePermiso('comunidades', 'ver'), ctrl.listar)
router.post('/', requireAuth, requireEquipo, requirePermiso('comunidades', 'crear'), requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.crear)
router.get('/:id', requireAuth, requireEquipo, requirePermiso('comunidades', 'ver'), ctrl.obtener)
router.put('/:id', requireAuth, requireEquipo, requirePermiso('comunidades', 'editar'), requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.actualizar)
router.delete('/:id', requireAuth, requireEquipo, requirePermiso('comunidades', 'eliminar'), requireRolMinimo(['COORDINADOR']), ctrl.eliminar)

export default router
