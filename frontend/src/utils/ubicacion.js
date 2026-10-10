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
export function comprimirImagen(file, maxLado = 1024, calidad = 0.75) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const escala = Math.min(1, maxLado / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * escala)
      canvas.height = Math.round(img.height * escala)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', calidad))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen'))
    }
    img.src = url
  })
}
