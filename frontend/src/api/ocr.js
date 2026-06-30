import api from './client.js'

const base = (equipoId) => `/equipos/${equipoId}/ocr`

export const procesarCarta = (equipoId, formData) =>
  api.post(`${base(equipoId)}/procesar`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const confirmarCarta = (equipoId, data) =>
  api.post(`${base(equipoId)}/confirmar`, data)
