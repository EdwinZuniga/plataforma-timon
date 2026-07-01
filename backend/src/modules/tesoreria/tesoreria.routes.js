import { Router } from 'express'
import { requireAuth, requireEquipo, requireRolMinimo, requirePermiso } from '../../middlewares/auth.js'
import { registerIntParams } from '../../middlewares/parseIntParams.js'
import * as ctrl from './tesoreria.controller.js'

const router = Router({ mergeParams: true })
registerIntParams(router)

// Resumen y movimientos
router.get('/resumen', requireAuth, requireEquipo, requirePermiso('tesoreria', 'ver'), ctrl.resumen)
router.get('/movimientos', requireAuth, requireEquipo, requirePermiso('tesoreria', 'ver'), ctrl.listarMovimientos)
router.post('/movimientos', requireAuth, requireEquipo, requirePermiso('tesoreria', 'crear'), requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.crearMovimiento)
router.put('/movimientos/:id', requireAuth, requireEquipo, requirePermiso('tesoreria', 'editar'), requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.actualizarMovimiento)
router.delete('/movimientos/:id', requireAuth, requireEquipo, requirePermiso('tesoreria', 'eliminar'), requireRolMinimo(['COORDINADOR']), ctrl.eliminarMovimiento)

// Ofrendas semanales Caja Chica
router.get('/ofrendas', requireAuth, requireEquipo, requirePermiso('tesoreria', 'ver'), ctrl.listarOfrendas)
router.post('/ofrendas', requireAuth, requireEquipo, requirePermiso('tesoreria', 'crear'), ctrl.registrarOfrendas)
router.delete('/ofrendas/:id', requireAuth, requireEquipo, requirePermiso('tesoreria', 'eliminar'), ctrl.eliminarOfrenda)

export default router
