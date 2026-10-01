import api from './client.js'

export const getCalendario = (equipoId, params) => api.get(`/equipos/${equipoId}/calendario`, { params })
export const getAvisos = (equipoId) => api.get(`/equipos/${equipoId}/avisos`)
// El .ics requiere el token, por eso se descarga como blob y no con un enlace directo
export const descargarIcs = (equipoId, params) =>
  api.get(`/equipos/${equipoId}/calendario.ics`, { params, responseType: 'blob' })
