import { create } from 'zustand'
import axios from 'axios'
import { setAccessToken, clearAccessToken } from '@/api/client'
import * as authApi from '@/api/auth'
import api from '@/api/client'

// Cliente limpio sin interceptores para el refresh inicial de arranque
const rawApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
})

let initializingPromise = null

// Convierte array [{modulo, ver, crear, editar, eliminar}] en objeto keyed por modulo
const indexarPermisos = (arr) =>
  arr.reduce((acc, p) => { acc[p.modulo] = p; return acc }, {})

export const useAuthStore = create((set, get) => ({
  usuario: null,
  accessToken: null,
  equipoActual: null,
  permisos: {},   // { comunidades: { ver, crear, editar, eliminar }, ... }
  isLoading: true,

  login: async (email, password) => {
    const { data } = await authApi.login(email, password)
    const { usuario, accessToken } = data.data
    setAccessToken(accessToken)
    // superAdmin viene en el JWT; lo extraemos del payload decodificado
    const tokenPayload = JSON.parse(atob(accessToken.split('.')[1]))
    set({ usuario: { ...usuario, superAdmin: tokenPayload.superAdmin ?? false }, accessToken })
  },

  logout: async () => {
    try { await authApi.logout() } catch {}
    clearAccessToken()
    localStorage.removeItem('equipoActual')
    set({ usuario: null, accessToken: null, equipoActual: null, permisos: {} })
  },

  seleccionarEquipo: async (equipo) => {
    set({ equipoActual: equipo })
    if (equipo) {
      localStorage.setItem('equipoActual', JSON.stringify(equipo))
      if (equipo.color) {
        document.documentElement.style.setProperty('--color-equipo', equipo.color)
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
        document.documentElement.style.setProperty('--color-equipo', equipoGuardado.color)
      }

      // Cargar permisos si ya tenía un equipo seleccionado
      let permisos = {}
      if (equipoGuardado?.id) {
        try {
          const { data: p } = await api.get(`/equipos/${equipoGuardado.id}/mis-permisos`)
          permisos = indexarPermisos(p.data)
        } catch { /* sin permisos explícitos */ }
      }

      set({
        usuario: { ...usuario, superAdmin: tokenPayload.superAdmin ?? false },
        accessToken,
        equipoActual: equipoGuardado,
        permisos,
        isLoading: false,
      })
    } catch {
      // 401 esperado cuando no hay cookie — no es un error
      clearAccessToken()
      localStorage.removeItem('equipoActual')
      set({ usuario: null, accessToken: null, equipoActual: null, isLoading: false })
    } finally {
      initializingPromise = null
    }
    })()
    return initializingPromise
  },
}))
