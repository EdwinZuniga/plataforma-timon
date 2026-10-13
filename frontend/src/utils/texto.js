// Minúsculas y sin tildes, para comparar búsquedas ("jose" encuentra "José").
export const sinTildes = (s) =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

export const coincide = (texto, busqueda) => sinTildes(texto).includes(sinTildes(busqueda))

// Nombre con el que se muestra a un miembro del equipo en toda la app.
export const nombreMiembro = (m) => m?.nombreCorto || m?.usuario?.nombre || ''
