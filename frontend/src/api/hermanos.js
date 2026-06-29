import api from './client.js'

const base = (equipoId) => `/equipos/${equipoId}/hermanos`

export const getHermanos = (equipoId, params) => api.get(base(equipoId), { params })
export const createHermano = (equipoId, data) => api.post(base(equipoId), data)
export const getHermano = (equipoId, id) => api.get(`${base(equipoId)}/${id}`)
export const getHistorial = (equipoId, id) => api.get(`${base(equipoId)}/${id}/historial`)
export const updateHermano = (equipoId, id, data) => api.put(`${base(equipoId)}/${id}`, data)
export const deleteHermano = (equipoId, id) => api.delete(`${base(equipoId)}/${id}`)
