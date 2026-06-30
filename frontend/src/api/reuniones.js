import api from './client.js'

const base = (equipoId) => `/equipos/${equipoId}/reuniones`

export const getReuniones = (equipoId, params) => api.get(base(equipoId), { params })
export const createReunion = (equipoId, data) => api.post(base(equipoId), data)
export const getReunion = (equipoId, id) => api.get(`${base(equipoId)}/${id}`)
export const updateReunion = (equipoId, id, data) => api.put(`${base(equipoId)}/${id}`, data)
export const createAcuerdo = (equipoId, reunionId, data) => api.post(`${base(equipoId)}/${reunionId}/acuerdos`, data)
export const updateAcuerdo = (equipoId, acuerdoId, data) => api.put(`/equipos/${equipoId}/acuerdos/${acuerdoId}`, data)
export const deleteReunion = (equipoId, id) => api.delete(`${base(equipoId)}/${id}`)
export const generarTexto = (equipoId, id) => api.post(`${base(equipoId)}/${id}/generar-texto`)
export const saveComisiones = (equipoId, id, comisiones) => api.put(`${base(equipoId)}/${id}/comisiones`, { comisiones })
