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
    const {
      catalogoServicioId,
      miembroIds,
      descripcion,
      imagenCartaRuta,
      comunidadSolicitante,
      horaServicio,
      dirigidoA,
      fechaServicio,
      lugarServicio,
    } = req.body

    const ids = Array.isArray(miembroIds)
      ? miembroIds
      : miembroIds
        ? JSON.parse(miembroIds)
        : []

    const data = await svc.confirmarServicio(req.params.equipoId, {
      catalogoServicioId,
      miembroIds: ids,
      descripcion,
      imagenCartaRuta,
      comunidadSolicitante,
      horaServicio,
      dirigidoA,
      fechaServicio,
      lugarServicio,
    })
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}
