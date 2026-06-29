import { createWorker } from 'tesseract.js'
import prisma from '../../config/database.js'

/*
  Formato esperado de las cartas de servicio:
  - NOMBRE: [nombre del hermano]
  - SERVICIO: [tipo de servicio]
  - FECHA: [fecha de la actividad]
  - COMUNIDAD: [nombre de comunidad]
  - NOTAS: [observaciones]
*/
const extraerDatos = (texto) => {
  const lineas = texto.split('\n').map((l) => l.trim())

  const buscar = (patron) => {
    const linea = lineas.find((l) => patron.test(l))
    if (!linea) return null
    return linea.replace(patron, '').trim() || null
  }

  return {
    nombreHermano: buscar(/^NOMBRE\s*[:：]/i),
    tipoServicio: buscar(/^SERVICIO\s*[:：]/i),
    fechaActividad: buscar(/^FECHA\s*[:：]/i),
    comunidad: buscar(/^COMUNIDAD\s*[:：]/i),
    notas: buscar(/^NOTAS\s*[:：]/i),
  }
}

export const procesarImagen = async (rutaArchivo) => {
  const worker = await createWorker('spa')

  let resultado
  try {
    const { data } = await worker.recognize(rutaArchivo)
    const textoExtraido = data.text
    const confianza = data.confidence / 100

    resultado = {
      textoExtraido,
      datosEstructurados: extraerDatos(textoExtraido),
      rutaArchivo,
      confianza,
    }
  } finally {
    await worker.terminate()
  }

  return resultado
}

export const confirmarServicio = async (equipoId, datos) => {
  const { actividadId, catalogoServicioId, hermanoId, descripcion, imagenCartaRuta } = datos

  const actividad = await prisma.actividad.findFirst({ where: { id: actividadId, equipoId } })
  if (!actividad) throw { status: 404, message: 'Actividad no encontrada', code: 'ACTIVIDAD_NO_ENCONTRADA' }

  const servicio = await prisma.servicioActividad.create({
    data: {
      actividadId,
      catalogoServicioId,
      descripcion,
      origenOCR: true,
      imagenCartaRuta,
      estado: 'PENDIENTE',
    },
  })

  if (hermanoId) {
    await prisma.servicioAsignado.create({
      data: { servicioActividadId: servicio.id, hermanoId },
    })
    await prisma.servicioActividad.update({
      where: { id: servicio.id },
      data: { estado: 'ASIGNADO' },
    })
  }

  return servicio
}
