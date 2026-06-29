import api from './client.js'

export const login = (email, password) => api.post('/auth/login', { email, password })
export const logout = () => api.post('/auth/logout')
export const refresh = () => api.post('/auth/refresh')
export const me = () => api.get('/auth/me')
export const misEquipos = () => api.get('/auth/mis-equipos')
export const cambiarContrasena = (contrasenaActual, contrasenaNueva) =>
  api.put('/auth/cambiar-contrasena', { contrasenaActual, contrasenaNueva })
