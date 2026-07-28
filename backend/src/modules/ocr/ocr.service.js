import { createWorker } from 'tesseract.js'
import sharp from 'sharp'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'

/*
  Preprocesa la imagen antes de pasarla a Tesseract:
  - Convierte a escala de grises
  - Normaliza el contraste (corrige iluminación desigual de foto)
  - Enfoca los bordes del texto
  - Recorta bordes oscuros (archivador/fondo negro)
  - Redimensiona a ancho máximo para velocidad
*/
const preprocesarImagen = async (rutaArchivo) => {
  const tmpPath = path.join(os.tmpdir(), `ocr-proc-${Date.now()}.png`)

  try {
    const meta = await sharp(rutaArchivo).metadata()

    // Redimensionar si es muy grande (>2500px ancho) para acelerar OCR
    const resizeOpts = meta.width > 2500 ? { width: 2500, withoutEnlargement: true } : null

    let pipeline = sharp(rutaArchivo)

    if (resizeOpts) pipeline = pipeline.resize(resizeOpts)

    await pipeline
      .grayscale()
      .normalize()                    // corrige contraste desigual
      .sharpen({ sigma: 1.5 })        // enfoca texto difuminado
      .linear(1.2, -20)               // aumenta contraste ligeramente
      .threshold(180)                 // binariza: texto negro sobre fondo blanco
      .png()
      .toFile(tmpPath)

    return tmpPath
  } catch {
    // Si el preprocesado falla, usa la imagen original
    return rutaArchivo
  }
}

const extraerDatos = (texto) => {
  const lineas = texto.split('\n').map((l) => l.trim()).filter((l) => l.length > 1)

  const primerMatch = (patrones) => {
    for (const p of patrones) {
      const m = texto.match(p)
      if (m) return (m[1] !== undefined ? m[1] : m[0]).trim()
    }
    return null
  }

  const comunidadSolicitante = primerMatch([
    /COMUNIDAD\s+["'"«]([A-ZÁÉÍÓÚÑ][^"'"»\n]{3,70})/i,
    /COMUNIDAD\s+["']([^"'\n]{3,70})/,
    /COMUNIDAD\s+([A-ZÁÉÍÓÚÑ][^\n,]{4,70})/i,
  ])

  const saludoTexto = lineas.slice(0, 30).join('\n')
  let dirigidoA = null
  const equipoMatch = saludoTexto.match(/Hnos?\.?\s+Equipo\s+Tim[oó]n[^\n]*/i)
  const consejoMatch = saludoTexto.match(/Hnos?\.?\s+Consejo\s+Asesor[^\n]*/i)
  if (equipoMatch && consejoMatch) {
    dirigidoA = `${consejoMatch[0].trim()}, ${equipoMatch[0].trim()}`
  } else {
    dirigidoA = (equipoMatch || consejoMatch)?.[0]?.trim() || null
  }

  const fechaServicio = primerMatch([
    /\b(?:Dom|Lun|Mar|Mi[eé]|Jue|Vie|S[aá]b)\W{0,3}\d{1,2}\W{1,3}[A-Za-z]{3,}\W{1,3}\d{4}/i,
    /\b\d{1,2}\W{1,2}[A-Za-z]{3,}\W{1,2}\d{4}\b/,
    /\b\d{1,2}\/\d{1,2}\/\d{4}\b/,
    /\b\d{1,2}\s+de\s+[a-z\xc0-\xff]{3,}\s+de\s+\d{4}/i,
  ])

  const horaServicio = primerMatch([
    /\d{1,2}:\d{2}\s*[AaPp]\.?[Mm]\.?\s*(?:a|–|-)\s*\d{1,2}:\d{2}\s*[AaPp]\.?[Mm]/,
    /\d{1,2}:\d{2}\s*(?:a|–|-)\s*\d{1,2}:\d{2}/,
  ])

  const lugarServicio = primerMatch([
    /Centro\s+Escolar\s+Cat[oó]lico\s+[^\n]{5,100}/i,
    /Centro\s+Escolar\s+[^\n]{5,80}/i,
    /Centro\s+Cat[oó]lico\s+[^\n]{5,80}/i,
    /Centro\s+[^\n]{5,60}/i,
    /Iglesia\s+[^\n]{5,60}/i,
    /Parroquia\s+[^\n]{5,60}/i,
    /Sal[oó]n\s+[^\n]{5,50}/i,
  ])

  const tipoServicio = primerMatch([
    /Retiro\s+de\s+j[oó]venes[^\n]{0,80}/i,
    /Retiro[^\n]{3,60}/i,
    /Asamblea[^\n]{3,60}/i,
    /Encuentro[^\n]{3,60}/i,
    /Misi[oó]n[^\n]{3,60}/i,
    /Formaci[oó]n[^\n]{3,60}/i,
  ])

  const firmantes = []
  const re = /Hno?a?\.?\s+([A-ZÁÉÍÓÚÑ][^\n]{5,50}?)\s*[Cc]elular[:\s]*(\d[\d\s\-]{6,11})/g
  let m
  while ((m = re.exec(texto)) !== null) {
    firmantes.push({ nombre: m[1].trim(), telefono: m[2].replace(/\s/g, '') })
  }

  return { comunidadSolicitante, fechaServicio, horaServicio, lugarServicio, tipoServicio, dirigidoA, firmantes }
}

export const procesarImagen = async (rutaArchivo) => {
  let tmpPath = null
  const worker = await createWorker('spa')

  try {
    // Preprocesar imagen para mejorar OCR
    tmpPath = await preprocesarImagen(rutaArchivo)

    await worker.setParameters({
      tessedit_pageseg_mode: '1',      // Auto con detección de orientación
      preserve_interword_spaces: '1',
      tessedit_do_invert: '0',         // No invertir colores
    })

    const { data } = await worker.recognize(tmpPath)

    return {
      textoExtraido: data.text,
      datosEstructurados: extraerDatos(data.text),
      rutaArchivo,
      confianza: data.confidence / 100,
    }
  } finally {
    await worker.terminate()
    // Limpiar imagen temporal
    if (tmpPath && tmpPath !== rutaArchivo) {
      fs.unlink(tmpPath).catch(() => {})
    }
  }
}

