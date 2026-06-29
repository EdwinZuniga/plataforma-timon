import * as svc from './ocr.service.js'

export const procesar = async (req, res, next) => {
  try {
    if (!req.file) return next({ status: 400, message: 'Se requiere una imagen', code: 'IMAGEN_REQUERIDA' })
    const resultado = await svc.procesarImagen(req.file.path)
    res.json({ success: true, data: resultado })
  } catch (err) { next(err) }
}

export const confirmar = async (req, res, next) => {
  try {
    const { actividadId, catalogoServicioId, hermanoId, descripcion, imagenCartaRuta } = req.body
    if (!actividadId || !catalogoServicioId) {
      return next({ status: 400, message: 'actividadId y catalogoServicioId son requeridos', code: 'DATOS_REQUERIDOS' })
    }
    const data = await svc.confirmarServicio(req.params.equipoId, { actividadId, catalogoServicioId, hermanoId, descripcion, imagenCartaRuta })
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}
