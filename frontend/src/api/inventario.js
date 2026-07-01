import api from './client.js'

const base = (equipoId) => `/equipos/${equipoId}/inventario`

export const getResumen = (equipoId) =>
  api.get(`${base(equipoId)}/resumen`)

export const getArticulos = (equipoId, params) =>
  api.get(`${base(equipoId)}/articulos`, { params })

export const getArticulo = (equipoId, id) =>
  api.get(`${base(equipoId)}/articulos/${id}`)

export const getCategorias = (equipoId) =>
  api.get(`${base(equipoId)}/articulos/categorias`)

export const createArticulo = (equipoId, data) =>
  api.post(`${base(equipoId)}/articulos`, data)

export const updateArticulo = (equipoId, id, data) =>
  api.put(`${base(equipoId)}/articulos/${id}`, data)

export const deleteArticulo = (equipoId, id) =>
  api.delete(`${base(equipoId)}/articulos/${id}`)

export const getPrestamos = (equipoId, params) =>
  api.get(`${base(equipoId)}/prestamos`, { params })

export const createPrestamo = (equipoId, data) =>
  api.post(`${base(equipoId)}/prestamos`, data)

export const devolverPrestamo = (equipoId, id, data) =>
  api.put(`${base(equipoId)}/prestamos/${id}/devolver`, data)

export const updatePrestamo = (equipoId, id, data) =>
  api.put(`${base(equipoId)}/prestamos/${id}`, data)

export const deletePrestamo = (equipoId, id) =>
  api.delete(`${base(equipoId)}/prestamos/${id}`)
