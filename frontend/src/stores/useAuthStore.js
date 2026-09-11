import { create } from 'zustand'
import axios from 'axios'
import { setAccessToken, clearAccessToken } from '@/api/client'
import * as authApi from '@/api/auth'
import api from '@/api/client'
import { getReadableTeamColors } from '@/utils/color'

// Cliente limpio sin interceptores para el refresh inicial de arranque
const rawApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
})

let initializingPromise = null

// Pista local de "este dispositivo ya tuvo sesión". El refresh token vive en una
// cookie httpOnly que el JS no puede leer, así que sin esta pista el arranque no
// sabe si vale la pena esperar a /auth/refresh (que con el backend/BD dormidos
// tarda). Sin pista → mostramos el login de una vez.
const HINT_KEY = 'auth.hint'
const leerHint = () => { try { return localStorage.getItem(HINT_KEY) === '1' } catch { return false } }
const marcarHint = (v) => {
  try {
    if (v) localStorage.setItem(HINT_KEY, '1')
    else localStorage.removeItem(HINT_KEY)
  } catch { /* storage no disponible */ }
}

// Convierte array [{modulo, ver, crear, editar, eliminar}] en objeto keyed por modulo
const indexarPermisos = (arr) =>
  arr.reduce((acc, p) => { acc[p.modulo] = p; return acc }, {})

// Aplica el color de marca del equipo y sus variantes con contraste legible
// (--color-equipo-onlight/-ondark, ver utils/color.js) como CSS vars globales.
const aplicarColorEquipo = (color) => {
  document.documentElement.style.setProperty('--color-equipo', color)
  const { onLight, onDark } = getReadableTeamColors(color)
  document.documentElement.style.setProperty('--color-equipo-onlight', onLight)
  document.documentElement.style.setProperty('--color-equipo-ondark', onDark)
}

export const useAuthStore = create((set, get) => ({
  usuario: null,
  accessToken: null,
  equipoActual: null,
  permisos: {},   // { comunidades: { ver, crear, editar, eliminar }, ... }
  isLoading: true,
  // ¿este dispositivo ya inició sesión antes? Si no, el arranque no espera.
  sesionProbable: leerHint(),

  login: async (email, password) => {
    const { data } = await authApi.login(email, password)
    const { usuario, accessToken } = data.data
    setAccessToken(accessToken)
    // superAdmin viene en el JWT; lo extraemos del payload decodificado
    const tokenPayload = JSON.parse(atob(accessToken.split('.')[1]))
    marcarHint(true)
    set({ usuario: { ...usuario, superAdmin: tokenPayload.superAdmin ?? false }, accessToken, sesionProbable: true })
  },

  logout: async () => {
    try { await authApi.logout() } catch {}
    clearAccessToken()
    localStorage.removeItem('equipoActual')
    marcarHint(false)
    set({ usuario: null, accessToken: null, equipoActual: null, permisos: {}, sesionProbable: false })
  },

  seleccionarEquipo: async (equipo) => {
    set({ equipoActual: equipo })
    if (equipo) {
      localStorage.setItem('equipoActual', JSON.stringify(equipo))
      if (equipo.color) {
        aplicarColorEquipo(equipo.color)
      }
      // Cargar permisos del usuario para este equipo
      try {
        const { data } = await api.get(`/equipos/${equipo.id}/mis-permisos`)
        set({ permisos: indexarPermisos(data.data) })
      } catch {
        set({ permisos: {} })
      }
    } else {
      localStorage.removeItem('equipoActual')
      set({ permisos: {} })
    }
  },

  // Usa rawApi para no activar el interceptor de renovación automática
  initializeAuth: async () => {
    if (initializingPromise) return initializingPromise
    initializingPromise = (async () => { try {
      const { data } = await rawApi.post('/auth/refresh')
      const { usuario, accessToken } = data.data
      setAccessToken(accessToken)
      const tokenPayload = JSON.parse(atob(accessToken.split('.')[1]))

      const equipoGuardado = (() => {
        try { return JSON.parse(localStorage.getItem('equipoActual')) } catch { return null }
      })()
      if (equipoGuardado?.color) {
        aplicarColorEquipo(equipoGuardado.color)
      }

      // Cargar permisos si ya tenía un equipo seleccionado
      let permisos = {}
      if (equipoGuardado?.id) {
        try {
          const { data: p } = await api.get(`/equipos/${equipoGuardado.id}/mis-permisos`)
          permisos = indexarPermisos(p.data)
        } catch { /* sin permisos explícitos */ }
      }

      marcarHint(true)
      set({
        usuario: { ...usuario, superAdmin: tokenPayload.superAdmin ?? false },
        accessToken,
        equipoActual: equipoGuardado,
        permisos,
        isLoading: false,
        sesionProbable: true,
      })
    } catch {
      // 401 esperado cuando no hay cookie — no es un error
      clearAccessToken()
      localStorage.removeItem('equipoActual')
      marcarHint(false)
      set({ usuario: null, accessToken: null, equipoActual: null, isLoading: false, sesionProbable: false })
    } finally {
      initializingPromise = null
    }
    })()
    return initializingPromise
  },
}))
