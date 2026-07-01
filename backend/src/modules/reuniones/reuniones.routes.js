import { Router } from 'express'
import { requireAuth, requireEquipo, requireRolMinimo, requirePermiso } from '../../middlewares/auth.js'
import { registerIntParams } from '../../middlewares/parseIntParams.js'
import * as ctrl from './reuniones.controller.js'

const router = Router({ mergeParams: true })
registerIntParams(router)

router.get('/', requireAuth, requireEquipo, requirePermiso('reuniones', 'ver'), ctrl.listar)
router.post('/', requireAuth, requireEquipo, requirePermiso('reuniones', 'crear'), requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.crear)
router.get('/:id', requireAuth, requireEquipo, requirePermiso('reuniones', 'ver'), ctrl.obtener)
router.put('/:id', requireAuth, requireEquipo, requirePermiso('reuniones', 'editar'), requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.actualizar)
router.delete('/:id', requireAuth, requireEquipo, requirePermiso('reuniones', 'eliminar'), requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.eliminar)
router.post('/:id/acuerdos', requireAuth, requireEquipo, requirePermiso('reuniones', 'editar'), requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.crearAcuerdo)
router.put('/:id/comisiones', requireAuth, requireEquipo, requirePermiso('reuniones', 'editar'), requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.guardarComisiones)
router.post('/:id/generar-texto', requireAuth, requireEquipo, requirePermiso('reuniones', 'ver'), ctrl.generarTexto)

export default router
