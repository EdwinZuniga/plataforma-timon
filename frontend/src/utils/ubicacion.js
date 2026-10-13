// Utilidades de ubicación de comunidades: parseo de coordenadas, enlaces a mapas
// y compresión de la foto de referencia.

export function coordenadasValidas(lat, lng) {
  if (lat === '' || lat === null || lat === undefined || lng === '' || lng === null || lng === undefined) return false
  const a = Number(lat), b = Number(lng)
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a) <= 90 && Math.abs(b) <= 180
}

// Acepta "13.69, -89.19", o un enlace de Google Maps (@lat,lng | !3dlat!4dlng | ?q=lat,lng).
export function parsearCoordenadas(texto) {
  if (!texto) return null
  const patrones = [
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|ll|query)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /^\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*$/,
  ]
  for (const p of patrones) {
    const m = String(texto).match(p)
    if (m && coordenadasValidas(m[1], m[2])) return { latitud: Number(m[1]), longitud: Number(m[2]) }
  }
  return null
}

export const enlaceGoogleMaps = (lat, lng) =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`

export const enlaceWaze = (lat, lng) =>
  `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`

async function decodificar(file) {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
    return { fuente: bmp, ancho: bmp.width, alto: bmp.height, liberar: () => bmp.close?.() }
  } catch {
    const url = URL.createObjectURL(file)
    try {
      const img = await new Promise((resolve, reject) => {
        const el = new Image()
        el.onload = () => resolve(el)
        el.onerror = () => reject(new Error('Formato de imagen no compatible'))
        el.src = url
      })
      return { fuente: img, ancho: img.naturalWidth, alto: img.naturalHeight, liberar: () => {} }
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

// Reduce la imagen a un JPEG de máx. `maxLado` px y lo devuelve como data URL.
// Si el navegador no decodifica el formato (HEIC/HEIF de iPhone o algunos Android),
// se convierte primero a JPEG con heic2any, que se carga solo cuando hace falta.
export async function comprimirImagen(file, maxLado = 1024, calidad = 0.75) {
  let img
  try {
    img = await decodificar(file)
  } catch (err) {
    // El tipo MIME a veces viene vacío o con otra extensión, así que se intenta
    // la conversión ante cualquier fallo y, si tampoco sirve, se informa el error original.
    try {
      const { default: heic2any } = await import('heic2any')
      const convertido = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.8 })
      img = await decodificar(Array.isArray(convertido) ? convertido[0] : convertido)
    } catch {
      throw err
    }
  }
  const { fuente, ancho, alto, liberar } = img
  const escala = Math.min(1, maxLado / Math.max(ancho, alto))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(ancho * escala)
  canvas.height = Math.round(alto * escala)
  canvas.getContext('2d').drawImage(fuente, 0, 0, canvas.width, canvas.height)
  liberar()
  return canvas.toDataURL('image/jpeg', calidad)
}
