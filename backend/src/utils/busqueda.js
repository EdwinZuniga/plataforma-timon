// La base (SQL_Latin1_General_CP1_CI_AS) ignora mayúsculas pero no tildes, así
// que "jose" no encontraría "José". Prisma pasa el valor de `contains` tal cual
// al LIKE, por lo que expandimos cada letra con variantes a una clase de
// caracteres ("[oóòöô]"): funciona en ambos sentidos (con o sin tilde al buscar).
const VARIANTES = {
  a: 'aáàäâã',
  e: 'eéèëê',
  i: 'iíìïî',
  o: 'oóòöôõ',
  u: 'uúùüû',
  n: 'nñ',
}

// Patrón para `{ contains: patronBusqueda(q) }`.
export const patronBusqueda = (texto) => {
  const base = String(texto ?? '').trim().normalize('NFD').replace(/[̀-ͯ]/g, '')
  let out = ''
  for (const ch of base) {
    const minus = ch.toLowerCase()
    if (VARIANTES[minus]) out += `[${VARIANTES[minus]}]`
    else if (ch === '%' || ch === '_' || ch === '[') out += `[${ch}]` // literales, no comodines
    else out += ch
  }
  return out
}

// Atajo: `{ nombre: contiene(q) }`
export const contiene = (texto) => ({ contains: patronBusqueda(texto) })
