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

// Reduce la imagen a un JPEG de máx. `maxLado` px y lo devuelve como data URL.
// createImageBitmap respeta la orientación EXIF (fotos del celular); si el navegador
// no puede decodificar el formato (p. ej. HEIC), se intenta con <img> y si no, se lanza error.
export async function comprimirImagen(file, maxLado = 1024, calidad = 0.75) {
  let fuente, ancho, alto, liberar = () => {}
  try {
    fuente = await createImageBitmap(file, { imageOrientation: 'from-image' })
    ancho = fuente.width
    alto = fuente.height
    liberar = () => fuente.close?.()
  } catch {
    const url = URL.createObjectURL(file)
    try {
      fuente = await new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('Formato de imagen no compatible'))
        img.src = url
      })
    } finally {
      URL.revokeObjectURL(url)
    }
    ancho = fuente.naturalWidth
    alto = fuente.naturalHeight
  }
  const escala = Math.min(1, maxLado / Math.max(ancho, alto))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(ancho * escala)
  canvas.height = Math.round(alto * escala)
  canvas.getContext('2d').drawImage(fuente, 0, 0, canvas.width, canvas.height)
  liberar()
  return canvas.toDataURL('image/jpeg', calidad)
}
