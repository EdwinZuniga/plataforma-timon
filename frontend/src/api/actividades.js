import api from './client.js'

const base = (equipoId) => `/equipos/${equipoId}/actividades`

export const getActividades = (equipoId, params) => api.get(base(equipoId), { params })
export const createActividad = (equipoId, data) => api.post(base(equipoId), data)
export const getActividad = (equipoId, id) => api.get(`${base(equipoId)}/${id}`)
export const updateActividad = (equipoId, id, data) => api.put(`${base(equipoId)}/${id}`, data)
export const getAsistencia = (equipoId, id, params) => api.get(`${base(equipoId)}/${id}/asistencia`, { params })
export const saveAsistencia = (equipoId, id, registros) => api.post(`${base(equipoId)}/${id}/asistencia`, { registros })
