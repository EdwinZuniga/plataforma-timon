import { Router } from 'express'
import { requireAuth, requireEquipo, requireRolMinimo, requirePermiso } from '../../middlewares/auth.js'
import { registerIntParams } from '../../middlewares/parseIntParams.js'
import * as ctrl from './actividades.controller.js'

const router = Router({ mergeParams: true })
registerIntParams(router)

router.get('/', requireAuth, requireEquipo, requirePermiso('actividades', 'ver'), ctrl.listar)
router.post('/', requireAuth, requireEquipo, requirePermiso('actividades', 'crear'), requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.crear)
router.get('/:id', requireAuth, requireEquipo, requirePermiso('actividades', 'ver'), ctrl.obtener)
router.put('/:id', requireAuth, requireEquipo, requirePermiso('actividades', 'editar'), requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.actualizar)
router.get('/:id/asistencia', requireAuth, requireEquipo, requirePermiso('actividades', 'ver'), ctrl.listarAsistencia)
router.post('/:id/asistencia', requireAuth, requireEquipo, requirePermiso('actividades', 'editar'), ctrl.guardarAsistencia)

export default router
