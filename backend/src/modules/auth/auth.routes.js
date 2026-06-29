import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.js'
import * as ctrl from './auth.controller.js'

const router = Router()

router.post('/login', ctrl.login)
router.post('/refresh', ctrl.refresh)
router.post('/logout', ctrl.logout)
router.get('/me', requireAuth, ctrl.me)
router.get('/mis-equipos', requireAuth, ctrl.misEquipos)
router.put('/cambiar-contrasena', requireAuth, ctrl.cambiarContrasena)

export default router
