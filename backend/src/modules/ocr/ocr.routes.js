import { Router } from 'express'
import { requireAuth, requireEquipo, requireRolMinimo } from '../../middlewares/auth.js'
import { uploadCarta } from '../../middlewares/upload.js'
import * as ctrl from './ocr.controller.js'

const router = Router({ mergeParams: true })

router.post('/procesar', requireAuth, requireEquipo, uploadCarta.single('imagen'), ctrl.procesar)
router.post('/confirmar', requireAuth, requireEquipo, requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.confirmar)

export default router
