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

// Miembros del consejo
router.post('/:id/consejo', requireAuth, requireEquipo, requirePermiso('comunidades', 'editar'), requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.crearMiembroConsejo)
router.put('/:id/consejo/:miembroId', requireAuth, requireEquipo, requirePermiso('comunidades', 'editar'), requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.actualizarMiembroConsejo)
router.delete('/:id/consejo/:miembroId', requireAuth, requireEquipo, requirePermiso('comunidades', 'editar'), requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.eliminarMiembroConsejo)

// Visitas
router.post('/:id/visitas', requireAuth, requireEquipo, requirePermiso('comunidades', 'editar'), requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.crearVisita)
router.put('/:id/visitas/:visitaId', requireAuth, requireEquipo, requirePermiso('comunidades', 'editar'), requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.actualizarVisita)
router.delete('/:id/visitas/:visitaId', requireAuth, requireEquipo, requirePermiso('comunidades', 'editar'), requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.eliminarVisita)

export default router
