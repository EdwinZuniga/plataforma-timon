import { Router } from 'express'
import { requireAuth, requireEquipo, requireRolMinimo } from '../../middlewares/auth.js'
import { registerIntParams } from '../../middlewares/parseIntParams.js'
import * as ctrl from './servicios.controller.js'

const router = Router({ mergeParams: true })
registerIntParams(router)

router.get('/catalogo', requireAuth, requireEquipo, ctrl.listarCatalogo)
router.post('/catalogo', requireAuth, requireEquipo, requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.crearCatalogo)

router.get('/pendientes', requireAuth, requireEquipo, ctrl.pendientes)
router.get('/', requireAuth, requireEquipo, ctrl.listarTodos)

router.post('/actividades/:actividadId/servicios', requireAuth, requireEquipo, requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.crearServicio)
router.get('/actividades/:actividadId/servicios', requireAuth, requireEquipo, ctrl.listarServicios)

router.put('/:servicioId/asignar', requireAuth, requireEquipo, requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.asignar)
router.put('/:servicioId/desasignar', requireAuth, requireEquipo, requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.desasignar)
router.put('/:servicioId/confirmar', requireAuth, requireEquipo, ctrl.confirmar)
router.put('/:servicioId/finalizar', requireAuth, requireEquipo, requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.finalizar)
router.put('/:servicioId/reabrir', requireAuth, requireEquipo, requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.reabrir)
router.put('/:servicioId', requireAuth, requireEquipo, requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.editar)
router.delete('/:servicioId', requireAuth, requireEquipo, requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.eliminar)

export default router
