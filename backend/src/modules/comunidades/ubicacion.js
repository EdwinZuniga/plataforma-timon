// Resuelve enlaces de Google Maps (incluidos los cortos maps.app.goo.gl) a coordenadas.
// Solo se siguen redirecciones hacia dominios de Google para evitar SSRF.

const HOSTS_PERMITIDOS = /(^|\.)(google\.com|goo\.gl|g\.co|google\.com\.sv)$/i
const MAX_SALTOS = 6

const PATRONES = [
  /!3d(-?\d{1,2}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/,
  /@(-?\d{1,2}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)/,
  /[?&](?:q|ll|query|destination|center)=(-?\d{1,2}(?:\.\d+)?)(?:,|%2C)\s*(-?\d{1,3}(?:\.\d+)?)/i,
]

const enRango = (lat, lng) => Math.abs(lat) <= 90 && Math.abs(lng) <= 180

export const extraerCoordenadas = (texto) => {
  let t = String(texto || '')
  try { t = decodeURIComponent(t) } catch { /* se usa tal cual */ }
  for (const p of PATRONES) {
    const m = t.match(p)
    if (m && enRango(Number(m[1]), Number(m[2]))) return { latitud: Number(m[1]), longitud: Number(m[2]) }
  }
  return null
}

const hostPermitido = (u) => u.protocol === 'https:' && HOSTS_PERMITIDOS.test(u.hostname)

export const resolverEnlaceMapa = async (enlace) => {
  let url
  try { url = new URL(String(enlace).trim()) } catch { throw { status: 400, message: 'Enlace inválido', code: 'ENLACE_INVALIDO' } }
  if (!hostPermitido(url)) throw { status: 400, message: 'Solo se aceptan enlaces de Google Maps', code: 'ENLACE_INVALIDO' }

  for (let i = 0; i <= MAX_SALTOS; i++) {
    const directo = extraerCoordenadas(url.href)
    if (directo) return directo

    const res = await fetch(url, {
      redirect: 'manual',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TimonBot/1.0)', 'Accept-Language': 'es' },
      signal: AbortSignal.timeout(8000),
    })
    const destino = res.headers.get('location')
    if (res.status >= 300 && res.status < 400 && destino) {
      const siguiente = new URL(destino, url)
      if (!hostPermitido(siguiente)) break
      url = siguiente
      continue
    }
    const cuerpo = (await res.text()).slice(0, 500_000)
    return extraerCoordenadas(cuerpo.replace(/\u003d/g, '=').replace(/\u0026/g, '&')) ||
      (() => { throw { status: 422, message: 'No se encontraron coordenadas en el enlace', code: 'SIN_COORDENADAS' } })()
  }
  throw { status: 422, message: 'No se encontraron coordenadas en el enlace', code: 'SIN_COORDENADAS' }
}
