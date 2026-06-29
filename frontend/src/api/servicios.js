import api from './client.js'

const base = (equipoId) => `/equipos/${equipoId}/servicios`

export const getCatalogo = (equipoId) => api.get(`${base(equipoId)}/catalogo`)
export const createCatalogo = (equipoId, data) => api.post(`${base(equipoId)}/catalogo`, data)
export const getServicios = (equipoId, actividadId) => api.get(`${base(equipoId)}/actividades/${actividadId}/servicios`)
export const createServicio = (equipoId, actividadId, data) => api.post(`${base(equipoId)}/actividades/${actividadId}/servicios`, data)
export const asignarHermano = (equipoId, servicioId, hermanoId) => api.put(`${base(equipoId)}/${servicioId}/asignar`, { hermanoId })
export const confirmarServicio = (equipoId, servicioId) => api.put(`${base(equipoId)}/${servicioId}/confirmar`)
export const getPendientes = (equipoId) => api.get(`${base(equipoId)}/pendientes`)
