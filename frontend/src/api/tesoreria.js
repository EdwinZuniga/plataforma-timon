import api from './client.js'

const base = (equipoId) => `/equipos/${equipoId}/tesoreria`

export const getResumen = (equipoId, anio) =>
  api.get(`${base(equipoId)}/resumen`, { params: { anio } })

export const getMovimientos = (equipoId, params) =>
  api.get(`${base(equipoId)}/movimientos`, { params })

export const createMovimiento = (equipoId, data) =>
  api.post(`${base(equipoId)}/movimientos`, data)

export const updateMovimiento = (equipoId, id, data) =>
  api.put(`${base(equipoId)}/movimientos/${id}`, data)

export const deleteMovimiento = (equipoId, id) =>
  api.delete(`${base(equipoId)}/movimientos/${id}`)

export const getOfrendas = (equipoId, anio) =>
  api.get(`${base(equipoId)}/ofrendas`, { params: { anio } })

export const registrarOfrendas = (equipoId, data) =>
  api.post(`${base(equipoId)}/ofrendas`, data)

export const deleteOfrenda = (equipoId, id) =>
  api.delete(`${base(equipoId)}/ofrendas/${id}`)
