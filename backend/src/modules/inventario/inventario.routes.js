import { Router } from 'express'
import { requireAuth, requireEquipo, requirePermiso } from '../../middlewares/auth.js'
import { registerIntParams } from '../../middlewares/parseIntParams.js'
import * as ctrl from './inventario.controller.js'

const router = Router({ mergeParams: true })
registerIntParams(router)

router.get('/resumen', requireAuth, requireEquipo, requirePermiso('inventario', 'ver'), ctrl.resumen)

// Artículos — acceso controlado solo por permisos del módulo
router.get('/articulos', requireAuth, requireEquipo, requirePermiso('inventario', 'ver'), ctrl.listarArticulos)
router.get('/articulos/categorias', requireAuth, requireEquipo, requirePermiso('inventario', 'ver'), ctrl.listarCategorias)
router.get('/articulos/:id', requireAuth, requireEquipo, requirePermiso('inventario', 'ver'), ctrl.obtenerArticulo)
router.post('/articulos', requireAuth, requireEquipo, requirePermiso('inventario', 'crear'), ctrl.crearArticulo)
router.put('/articulos/:id', requireAuth, requireEquipo, requirePermiso('inventario', 'editar'), ctrl.actualizarArticulo)
router.delete('/articulos/:id', requireAuth, requireEquipo, requirePermiso('inventario', 'eliminar'), ctrl.eliminarArticulo)

// Préstamos — cualquier miembro puede registrar y devolver
router.get('/prestamos', requireAuth, requireEquipo, requirePermiso('inventario', 'ver'), ctrl.listarPrestamos)
router.post('/prestamos', requireAuth, requireEquipo, ctrl.crearPrestamo)
router.put('/prestamos/:id/devolver', requireAuth, requireEquipo, ctrl.registrarDevolucion)
router.put('/prestamos/:id', requireAuth, requireEquipo, requirePermiso('inventario', 'editar'), ctrl.actualizarPrestamo)
router.delete('/prestamos/:id', requireAuth, requireEquipo, requirePermiso('inventario', 'eliminar'), ctrl.eliminarPrestamo)

export default router
