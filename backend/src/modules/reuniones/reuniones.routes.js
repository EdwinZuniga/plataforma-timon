import { Router } from 'express'
import { requireAuth, requireEquipo, requireRolMinimo } from '../../middlewares/auth.js'
import { registerIntParams } from '../../middlewares/parseIntParams.js'
import * as ctrl from './reuniones.controller.js'

const router = Router({ mergeParams: true })
registerIntParams(router)

router.get('/', requireAuth, requireEquipo, ctrl.listar)
router.post('/', requireAuth, requireEquipo, requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.crear)
router.get('/:id', requireAuth, requireEquipo, ctrl.obtener)
router.put('/:id', requireAuth, requireEquipo, requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.actualizar)
router.delete('/:id', requireAuth, requireEquipo, requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.eliminar)
router.post('/:id/acuerdos', requireAuth, requireEquipo, requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.crearAcuerdo)
router.post('/:id/generar-texto', requireAuth, requireEquipo, ctrl.generarTexto)

export default router
