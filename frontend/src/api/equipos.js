import api from './client.js'

const base = (equipoId) => `/equipos/${equipoId}`

export const getEquipos = () => api.get('/equipos')
export const createEquipo = (data) => api.post('/equipos', data)
export const getEquipo = (id) => api.get(`/equipos/${id}`)
export const updateEquipo = (id, data) => api.put(`/equipos/${id}`, data)
export const getMiembros = (equipoId) => api.get(`${base(equipoId)}/miembros`)
export const getMiembroPerfil = (equipoId, miembroId) => api.get(`${base(equipoId)}/miembros/${miembroId}/perfil`)
export const getMiPerfil = (equipoId) => api.get(`${base(equipoId)}/mi-perfil`)
export const addMiembro = (equipoId, data) => api.post(`${base(equipoId)}/miembros`, data)
export const updateMiembro = (equipoId, miembroId, data) => api.put(`${base(equipoId)}/miembros/${miembroId}`, data)
export const removeMiembro = (equipoId, miembroId) => api.delete(`${base(equipoId)}/miembros/${miembroId}`)
