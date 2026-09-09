import api from './client.js'

const base = (equipoId) => `/equipos/${equipoId}/talleres`

export const getTalleres = (equipoId) => api.get(base(equipoId))
export const createTaller = (equipoId, data) => api.post(base(equipoId), data)
export const getTaller = (equipoId, id) => api.get(`${base(equipoId)}/${id}`)
export const updateTaller = (equipoId, id, data) => api.put(`${base(equipoId)}/${id}`, data)
export const getEdiciones = (equipoId, tallerId, params) =>
  api.get(`${base(equipoId)}/${tallerId}/ediciones`, { params })
export const getEdicion = (equipoId, tallerId, edicionId) => api.get(`${base(equipoId)}/${tallerId}/ediciones/${edicionId}`)
export const createEdicion = (equipoId, tallerId, data) => api.post(`${base(equipoId)}/${tallerId}/ediciones`, data)
export const updateEdicion = (equipoId, tallerId, edicionId, data) => api.put(`${base(equipoId)}/${tallerId}/ediciones/${edicionId}`, data)
export const deleteEdicion = (equipoId, tallerId, edicionId) => api.delete(`${base(equipoId)}/${tallerId}/ediciones/${edicionId}`)
export const getTalleresParaInscripcion = (equipoId) => api.get(`${base(equipoId)}/para-inscripcion`)
export const inscribirHermanos = (equipoId, edicionId, hermanoIds) =>
  api.post(`/equipos/${equipoId}/ediciones/${edicionId}/inscripciones`, { hermanoIds })
export const updateInscripcion = (equipoId, id, data) =>
  api.put(`/equipos/${equipoId}/inscripciones/${id}`, data)
export const upsertAsistenciaMes = (equipoId, inscripcionId, data) =>
  api.put(`/equipos/${equipoId}/inscripciones/${inscripcionId}/asistencia-mes`, data)
export const deleteInscripcion = (equipoId, id) =>
  api.delete(`/equipos/${equipoId}/inscripciones/${id}`)
export const getEstadisticas = (equipoId) => api.get(`${base(equipoId)}/estadisticas`)

// Equipo de apoyo
export const addEquipoApoyo = (equipoId, tallerId, edicionId, data) =>
  api.post(`${base(equipoId)}/${tallerId}/ediciones/${edicionId}/equipo-apoyo`, data)
export const removeEquipoApoyo = (equipoId, tallerId, edicionId, miembroId) =>
  api.delete(`${base(equipoId)}/${tallerId}/ediciones/${edicionId}/equipo-apoyo/${miembroId}`)

// Tema del mes
export const upsertTemaMes = (equipoId, tallerId, edicionId, mes, anio, data) =>
  api.put(`${base(equipoId)}/${tallerId}/ediciones/${edicionId}/temas/${mes}/${anio}`, data)

// Tarea y participación
export const upsertTareaEntrega = (equipoId, inscripcionId, data) =>
  api.put(`/equipos/${equipoId}/inscripciones/${inscripcionId}/tarea-mes`, data)
export const upsertParticipacionMes = (equipoId, inscripcionId, data) =>
  api.put(`/equipos/${equipoId}/inscripciones/${inscripcionId}/participacion-mes`, data)

export const getInscripcionResumen = (equipoId, inscripcionId) =>
  api.get(`/equipos/${equipoId}/inscripciones/${inscripcionId}/resumen`)
