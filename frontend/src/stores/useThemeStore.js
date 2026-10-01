import { create } from 'zustand'
import { syncStatusBar } from '@/utils/statusBar'

const STORAGE_KEY = 'theme'

const getSistemaPrefiereOscuro = () =>
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false

const aplicarTema = (theme) => {
  // 'contrast' reutiliza las variantes dark: y añade la clase hc con su paleta
  document.documentElement.classList.toggle('dark', theme === 'dark' || theme === 'contrast')
  document.documentElement.classList.toggle('hc', theme === 'contrast')
  syncStatusBar(theme) // en la APK: color/íconos de la barra de estado
}

const temaInicial = (() => {
  const guardado = localStorage.getItem(STORAGE_KEY)
  if (guardado === 'light' || guardado === 'dark' || guardado === 'contrast') return guardado
  return getSistemaPrefiereOscuro() ? 'dark' : 'light'
})()

aplicarTema(temaInicial)

export const useThemeStore = create((set, get) => ({
  theme: temaInicial,

  setTheme: (theme) => {
    localStorage.setItem(STORAGE_KEY, theme)
    aplicarTema(theme)
    set({ theme })
  },

  toggleTheme: () => {
    const orden = ['light', 'dark', 'contrast']
    get().setTheme(orden[(orden.indexOf(get().theme) + 1) % orden.length])
  },
}))
