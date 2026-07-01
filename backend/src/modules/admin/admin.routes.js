import { Router } from 'express'
import { requireAuth, requireSuperAdmin } from '../../middlewares/auth.js'
import { registerIntParams } from '../../middlewares/parseIntParams.js'
import * as ctrl from './admin.controller.js'

const router = Router()
registerIntParams(router)

router.use(requireAuth, requireSuperAdmin)

router.get('/stats', ctrl.stats)

// Usuarios
router.get('/usuarios', ctrl.listarUsuarios)
router.post('/usuarios', ctrl.crearUsuario)
router.get('/usuarios/:id', ctrl.obtenerUsuario)
router.put('/usuarios/:id', ctrl.actualizarUsuario)
router.delete('/usuarios/:id', ctrl.eliminarUsuario)

// Equipos
router.get('/equipos', ctrl.listarEquipos)
router.post('/equipos', ctrl.crearEquipo)
router.get('/equipos/:id', ctrl.obtenerEquipo)
router.put('/equipos/:id', ctrl.actualizarEquipo)

// Membresías de un equipo
router.post('/equipos/:id/miembros', ctrl.asignarMiembro)
router.put('/equipos/:id/miembros/:miembroId', ctrl.actualizarMembresia)

// Permisos por usuario/membresía
router.get('/permisos/usuario/:id', ctrl.obtenerPermisosUsuario)
router.put('/permisos/membresia/:miembroId', ctrl.guardarPermisosMembresia)
router.delete('/permisos/membresia/:miembroId', ctrl.limpiarPermisosMembresia)

export default router
