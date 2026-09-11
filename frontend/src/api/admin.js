import api from './client'

export const getStats = () => api.get('/admin/stats')

// Usuarios
export const getUsuarios = (params) => api.get('/admin/usuarios', { params })
export const getUsuario = (id) => api.get(`/admin/usuarios/${id}`)
export const createUsuario = (data) => api.post('/admin/usuarios', data)
export const updateUsuario = (id, data) => api.put(`/admin/usuarios/${id}`, data)
export const deleteUsuario = (id) => api.delete(`/admin/usuarios/${id}`)

// Equipos
export const getEquipos = (params) => api.get('/admin/equipos', { params })
export const getEquipo = (id) => api.get(`/admin/equipos/${id}`)
export const createEquipo = (data) => api.post('/admin/equipos', data)
export const updateEquipo = (id, data) => api.put(`/admin/equipos/${id}`, data)

// Membresías
export const asignarMiembro = (equipoId, data) => api.post(`/admin/equipos/${equipoId}/miembros`, data)
export const updateMembresia = (equipoId, miembroId, data) =>
  api.put(`/admin/equipos/${equipoId}/miembros/${miembroId}`, data)

// Permisos
export const getPermisosUsuario = (usuarioId) => api.get(`/admin/permisos/usuario/${usuarioId}`)
export const savePermisosMembresia = (miembroId, permisos) =>
  api.put(`/admin/permisos/membresia/${miembroId}`, { permisos })
export const clearPermisosMembresia = (miembroId) =>
  api.delete(`/admin/permisos/membresia/${miembroId}`)

// Sesiones activas
export const getSesiones = (params) => api.get('/admin/sesiones', { params })
export const expulsarSesion = (id) => api.delete(`/admin/sesiones/${id}`)
