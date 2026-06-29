import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
})

let accessToken = null
let refreshPromise = null

export const setAccessToken = (token) => { accessToken = token }
export const getAccessToken = () => accessToken
export const clearAccessToken = () => { accessToken = null }

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    // No reintentar rutas de autenticación para evitar bucles infinitos
    const isAuthRoute = original?.url?.includes('/auth/')
    if (isAuthRoute) return Promise.reject(error)

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        if (!refreshPromise) {
          refreshPromise = api.post('/auth/refresh')
            .then((r) => {
              accessToken = r.data.data.accessToken
              refreshPromise = null
              return accessToken
            })
            .catch((e) => {
              refreshPromise = null
              clearAccessToken()
              // Dejar que el componente maneje la redirección vía React Router
              throw e
            })
        }
        await refreshPromise
        original.headers.Authorization = `Bearer ${accessToken}`
        return api(original)
      } catch {
        return Promise.reject(error)
      }
    }
    return Promise.reject(error)
  }
)

export default api
