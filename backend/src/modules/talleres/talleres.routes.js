import { Router } from 'express'
import { requireAuth, requireEquipo, requireRolMinimo, requirePermiso, requireSuperAdmin } from '../../middlewares/auth.js'
import { registerIntParams } from '../../middlewares/parseIntParams.js'
import * as ctrl from './talleres.controller.js'
import * as svc from './talleres.service.js'

const router = Router({ mergeParams: true })
registerIntParams(router)

router.get('/', requireAuth, requireEquipo, requirePermiso('talleres', 'ver'), ctrl.listar)
router.post('/', requireAuth, requireEquipo, requirePermiso('talleres', 'crear'), requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.crear)
router.get('/estadisticas', requireAuth, requireEquipo, requirePermiso('talleres', 'ver'), ctrl.estadisticas)
router.get('/para-inscripcion', requireAuth, requireEquipo, requirePermiso('talleres', 'ver'), ctrl.listarParaInscripcion)
router.get('/:id', requireAuth, requireEquipo, requirePermiso('talleres', 'ver'), ctrl.obtener)
router.put('/:id', requireAuth, requireEquipo, requirePermiso('talleres', 'editar'), requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.actualizar)
router.get('/:id/ediciones', requireAuth, requireEquipo, requirePermiso('talleres', 'ver'), ctrl.listarEdiciones)
router.post('/:id/ediciones', requireAuth, requireEquipo, requirePermiso('talleres', 'crear'), requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.crearEdicion)
router.get('/:id/ediciones/:edicionId', requireAuth, requireEquipo, requirePermiso('talleres', 'ver'), ctrl.obtenerEdicion)
router.put('/:id/ediciones/:edicionId', requireAuth, requireEquipo, requirePermiso('talleres', 'editar'), requireRolMinimo(['COORDINADOR', 'SECRETARIO']), ctrl.actualizarEdicion)
// Eliminar una edición queda restringido a SuperAdmin, y el servicio además
// rechaza ediciones que ya tienen hermanos inscritos (historial de asistencia).
router.delete('/:id/ediciones/:edicionId', requireAuth, requireEquipo, requireSuperAdmin, ctrl.eliminarEdicion)

router.post('/:id/ediciones/:edicionId/equipo-apoyo', requireAuth, requireEquipo, requirePermiso('talleres', 'editar'), requireRolMinimo(['COORDINADOR', 'SECRETARIO']), async (req, res, next) => {
  try {
    const { miembroId, rol } = req.body
    if (!miembroId) return next({ status: 400, message: 'miembroId es requerido', code: 'DATOS_REQUERIDOS' })
    const data = await svc.addEquipoApoyo(req.params.equipoId, req.params.edicionId, miembroId, rol)
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
})

router.delete('/:id/ediciones/:edicionId/equipo-apoyo/:miembroId', requireAuth, requireEquipo, requirePermiso('talleres', 'editar'), requireRolMinimo(['COORDINADOR', 'SECRETARIO']), async (req, res, next) => {
  try {
    await svc.removeEquipoApoyo(req.params.equipoId, req.params.edicionId, req.params.miembroId)
    res.json({ success: true })
  } catch (err) { next(err) }
})

router.put('/:id/ediciones/:edicionId/temas/:mes/:anio', requireAuth, requireEquipo, requirePermiso('talleres', 'editar'), requireRolMinimo(['COORDINADOR', 'SECRETARIO']), async (req, res, next) => {
  try {
    const { titulo, expositorId, notas, documentoUrl } = req.body
    const data = await svc.upsertTemaMes(
      req.params.equipoId, req.params.edicionId, req.params.mes, req.params.anio,
      { titulo, expositorId, notas, documentoUrl }
    )
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

export default router
