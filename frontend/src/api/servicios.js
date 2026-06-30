import api from './client.js'

const base = (equipoId) => `/equipos/${equipoId}/servicios`

export const getCatalogo = (equipoId) => api.get(`${base(equipoId)}/catalogo`)
export const createCatalogo = (equipoId, data) => api.post(`${base(equipoId)}/catalogo`, data)

export const getTodos = (equipoId, params) => api.get(`${base(equipoId)}`, { params })
export const getPendientes = (equipoId) => api.get(`${base(equipoId)}/pendientes`)

export const getServicios = (equipoId, actividadId) => api.get(`${base(equipoId)}/actividades/${actividadId}/servicios`)
export const createServicio = (equipoId, actividadId, data) => api.post(`${base(equipoId)}/actividades/${actividadId}/servicios`, data)

export const asignarMiembro = (equipoId, servicioId, miembroId) =>
  api.put(`${base(equipoId)}/${servicioId}/asignar`, { miembroId })

export const desasignarMiembro = (equipoId, servicioId, miembroId) =>
  api.put(`${base(equipoId)}/${servicioId}/desasignar`, { miembroId })

export const confirmarServicio = (equipoId, servicioId) =>
  api.put(`${base(equipoId)}/${servicioId}/confirmar`)

export const updateServicio = (equipoId, servicioId, data) =>
  api.put(`${base(equipoId)}/${servicioId}`, data)

export const deleteServicio = (equipoId, servicioId) =>
  api.delete(`${base(equipoId)}/${servicioId}`)

export const finalizarServicio = (equipoId, servicioId) =>
  api.put(`${base(equipoId)}/${servicioId}/finalizar`)

export const reabrirServicio = (equipoId, servicioId) =>
  api.put(`${base(equipoId)}/${servicioId}/reabrir`)
