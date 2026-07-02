import { Router } from 'express'
import { requireAuth, requireEquipo, requireRolMinimo } from '../../middlewares/auth.js'
import { registerIntParams } from '../../middlewares/parseIntParams.js'
import * as ctrl from './equipos.controller.js'
import prisma from '../../config/database.js'

const router = Router()
registerIntParams(router)

router.get('/', requireAuth, ctrl.listar)
router.post('/', requireAuth, ctrl.crear)
router.get('/:equipoId', requireAuth, requireEquipo, ctrl.obtener)
router.put('/:equipoId', requireAuth, requireEquipo, requireRolMinimo(['COORDINADOR']), ctrl.actualizar)

router.get('/:equipoId/miembros', requireAuth, requireEquipo, ctrl.listarMiembros)
router.post('/:equipoId/miembros', requireAuth, requireEquipo, requireRolMinimo(['COORDINADOR']), ctrl.agregarMiembro)
router.get('/:equipoId/miembros/:miembroId/perfil', requireAuth, requireEquipo, ctrl.obtenerPerfilMiembro)
router.put('/:equipoId/miembros/:miembroId', requireAuth, requireEquipo, requireRolMinimo(['COORDINADOR']), ctrl.actualizarMiembro)
router.delete('/:equipoId/miembros/:miembroId', requireAuth, requireEquipo, requireRolMinimo(['COORDINADOR']), ctrl.desactivarMiembro)

// Permisos del usuario actual en este equipo
router.get('/:equipoId/mi-perfil', requireAuth, requireEquipo, ctrl.obtenerMiPerfil)

router.get('/:equipoId/mis-permisos', requireAuth, requireEquipo, async (req, res, next) => {
  try {
    const permisos = await prisma.permisoUsuario.findMany({
      where: { miembroId: req.membresia.id },
      select: { modulo: true, ver: true, crear: true, editar: true, eliminar: true },
    })
    res.json({ success: true, data: permisos })
  } catch (err) { next(err) }
})

export default router
