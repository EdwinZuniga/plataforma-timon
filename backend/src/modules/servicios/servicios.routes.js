import { Router } from 'express'
import { requireAuth, requireEquipo, requireRolMinimo, requirePermiso } from '../../middlewares/auth.js'
import { registerIntParams } from '../../middlewares/parseIntParams.js'
import * as ctrl from './servicios.controller.js'

const router = Router({ mergeParams: true })
registerIntParams(router)

router.get('/catalogo', requireAuth, requireEquipo, requirePermiso('servicios', 'ver'), ctrl.listarCatalogo)
router.post('/catalogo', requireAuth, requireEquipo, requirePermiso('servicios', 'crear'), requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.crearCatalogo)

router.get('/pendientes', requireAuth, requireEquipo, requirePermiso('servicios', 'ver'), ctrl.pendientes)
router.get('/', requireAuth, requireEquipo, requirePermiso('servicios', 'ver'), ctrl.listarTodos)

router.post('/manual', requireAuth, requireEquipo, requirePermiso('servicios', 'crear'), requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.crearManual)

router.post('/actividades/:actividadId/servicios', requireAuth, requireEquipo, requirePermiso('servicios', 'crear'), requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.crearServicio)
router.get('/actividades/:actividadId/servicios', requireAuth, requireEquipo, requirePermiso('servicios', 'ver'), ctrl.listarServicios)

router.put('/:servicioId/asignar', requireAuth, requireEquipo, requirePermiso('servicios', 'editar'), requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.asignar)
router.put('/:servicioId/desasignar', requireAuth, requireEquipo, requirePermiso('servicios', 'editar'), requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.desasignar)
router.put('/:servicioId/confirmar', requireAuth, requireEquipo, requirePermiso('servicios', 'editar'), ctrl.confirmar)
router.put('/:servicioId/finalizar', requireAuth, requireEquipo, requirePermiso('servicios', 'editar'), requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.finalizar)
router.put('/:servicioId/reabrir', requireAuth, requireEquipo, requirePermiso('servicios', 'editar'), requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.reabrir)
router.put('/:servicioId', requireAuth, requireEquipo, requirePermiso('servicios', 'editar'), requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.editar)
router.delete('/:servicioId', requireAuth, requireEquipo, requirePermiso('servicios', 'eliminar'), requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.eliminar)

export default router
