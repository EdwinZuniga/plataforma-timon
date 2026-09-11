// Convierte un color hex arbitrario en HSL para poder ajustar su luminosidad.
function hexToHsl(hex) {
  const clean = hex.replace('#', '').trim()
  let r, g, b
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16)
    g = parseInt(clean[1] + clean[1], 16)
    b = parseInt(clean[2] + clean[2], 16)
  } else if (clean.length === 6) {
    r = parseInt(clean.slice(0, 2), 16)
    g = parseInt(clean.slice(2, 4), 16)
    b = parseInt(clean.slice(4, 6), 16)
  } else {
    return null
  }
  if ([r, g, b].some(Number.isNaN)) return null

  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0
  const d = max - min
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1))
    switch (max) {
      case r: h = ((g - b) / d) % 6; break
      case g: h = (b - r) / d + 2; break
      default: h = (r - g) / d + 4
    }
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s: s * 100, l: l * 100 }
}

const hsl = ({ h, s, l }) => `hsl(${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}%)`

/**
 * A partir del color de marca (arbitrario, elegido libremente por un admin)
 * genera dos variantes que conservan el matiz pero ajustan la luminosidad
 * para que el texto/acento sea legible tanto en tema claro como oscuro,
 * sin depender de qué tan claro u oscuro haya salido el color original.
 */
export function getReadableTeamColors(hex) {
  const parsed = hexToHsl(hex)
  if (!parsed) return { onLight: hex, onDark: hex }
  return {
    onLight: hsl({ ...parsed, l: Math.min(parsed.l, 45) }),
    onDark: hsl({ ...parsed, l: Math.max(parsed.l, 62) }),
  }
}
