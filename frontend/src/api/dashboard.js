import api from './client.js'

export const getDashboard = (equipoId) => api.get(`/equipos/${equipoId}/dashboard`)
export const getReporteActividad = (equipoId, actividadId) => api.get(`/equipos/${equipoId}/dashboard/reportes/actividad/${actividadId}`)
export const getReporteHermano = (equipoId, hermanoId) => api.get(`/equipos/${equipoId}/dashboard/reportes/hermano/${hermanoId}`)
