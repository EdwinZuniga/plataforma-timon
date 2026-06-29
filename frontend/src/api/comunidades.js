import api from './client.js'

const base = (equipoId) => `/equipos/${equipoId}/comunidades`

export const getComunidades = (equipoId, params) => api.get(base(equipoId), { params })
export const createComunidad = (equipoId, data) => api.post(base(equipoId), data)
export const getComunidad = (equipoId, id) => api.get(`${base(equipoId)}/${id}`)
export const updateComunidad = (equipoId, id, data) => api.put(`${base(equipoId)}/${id}`, data)
export const deleteComunidad = (equipoId, id) => api.delete(`${base(equipoId)}/${id}`)
