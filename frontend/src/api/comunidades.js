import api from './client.js'

const base = (equipoId) => `/equipos/${equipoId}/comunidades`

export const getComunidades = (equipoId, params) => api.get(base(equipoId), { params })
export const createComunidad = (equipoId, data) => api.post(base(equipoId), data)
export const getComunidad = (equipoId, id) => api.get(`${base(equipoId)}/${id}`)
export const updateComunidad = (equipoId, id, data) => api.put(`${base(equipoId)}/${id}`, data)
export const deleteComunidad = (equipoId, id) => api.delete(`${base(equipoId)}/${id}`)

// Miembros del consejo
export const createMiembroConsejo = (equipoId, comunidadId, data) => api.post(`${base(equipoId)}/${comunidadId}/consejo`, data)
export const updateMiembroConsejo = (equipoId, comunidadId, miembroId, data) => api.put(`${base(equipoId)}/${comunidadId}/consejo/${miembroId}`, data)
export const deleteMiembroConsejo = (equipoId, comunidadId, miembroId) => api.delete(`${base(equipoId)}/${comunidadId}/consejo/${miembroId}`)

// Visitas
export const createVisita = (equipoId, comunidadId, data) => api.post(`${base(equipoId)}/${comunidadId}/visitas`, data)
export const updateVisita = (equipoId, comunidadId, visitaId, data) => api.put(`${base(equipoId)}/${comunidadId}/visitas/${visitaId}`, data)
export const deleteVisita = (equipoId, comunidadId, visitaId) => api.delete(`${base(equipoId)}/${comunidadId}/visitas/${visitaId}`)
