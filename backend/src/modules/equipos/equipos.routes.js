import { Router } from 'express'
import { requireAuth, requireEquipo, requireRolMinimo } from '../../middlewares/auth.js'
import { registerIntParams } from '../../middlewares/parseIntParams.js'
import * as ctrl from './equipos.controller.js'

const router = Router()
registerIntParams(router)

router.get('/', requireAuth, ctrl.listar)
router.post('/', requireAuth, ctrl.crear)
router.get('/:equipoId', requireAuth, requireEquipo, ctrl.obtener)
router.put('/:equipoId', requireAuth, requireEquipo, requireRolMinimo(['COORDINADOR']), ctrl.actualizar)

router.get('/:equipoId/miembros', requireAuth, requireEquipo, ctrl.listarMiembros)
router.post('/:equipoId/miembros', requireAuth, requireEquipo, requireRolMinimo(['COORDINADOR']), ctrl.agregarMiembro)
router.put('/:equipoId/miembros/:miembroId', requireAuth, requireEquipo, requireRolMinimo(['COORDINADOR']), ctrl.actualizarMiembro)
router.delete('/:equipoId/miembros/:miembroId', requireAuth, requireEquipo, requireRolMinimo(['COORDINADOR']), ctrl.desactivarMiembro)

export default router
