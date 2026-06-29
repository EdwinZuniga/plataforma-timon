import { create } from 'zustand'
import axios from 'axios'
import { setAccessToken, clearAccessToken } from '@/api/client'
import * as authApi from '@/api/auth'

// Cliente limpio sin interceptores para el refresh inicial de arranque
const rawApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
})

let initializingPromise = null

export const useAuthStore = create((set) => ({
  usuario: null,
  accessToken: null,
  equipoActual: null,
  isLoading: true,

  login: async (email, password) => {
    const { data } = await authApi.login(email, password)
    const { usuario, accessToken } = data.data
    setAccessToken(accessToken)
    set({ usuario, accessToken })
  },

  logout: async () => {
    try { await authApi.logout() } catch {}
    clearAccessToken()
    localStorage.removeItem('equipoActual')
    set({ usuario: null, accessToken: null, equipoActual: null })
  },

  seleccionarEquipo: (equipo) => {
    set({ equipoActual: equipo })
    if (equipo) {
      localStorage.setItem('equipoActual', JSON.stringify(equipo))
      if (equipo.color) {
        document.documentElement.style.setProperty('--color-equipo', equipo.color)
      }
    } else {
      localStorage.removeItem('equipoActual')
    }
  },

  // Usa rawApi para no activar el interceptor de renovación automática
  initializeAuth: async () => {
    if (initializingPromise) return initializingPromise
    initializingPromise = (async () => { try {
      const { data } = await rawApi.post('/auth/refresh')
      const { usuario, accessToken } = data.data
      setAccessToken(accessToken)

      const equipoGuardado = (() => {
        try { return JSON.parse(localStorage.getItem('equipoActual')) } catch { return null }
      })()
      if (equipoGuardado?.color) {
        document.documentElement.style.setProperty('--color-equipo', equipoGuardado.color)
      }

      set({ usuario, accessToken, equipoActual: equipoGuardado, isLoading: false })
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
