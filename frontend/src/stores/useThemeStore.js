import { create } from 'zustand'

const STORAGE_KEY = 'theme'

const getSistemaPrefiereOscuro = () =>
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false

const aplicarTema = (theme) => {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

const temaInicial = (() => {
  const guardado = localStorage.getItem(STORAGE_KEY)
  if (guardado === 'light' || guardado === 'dark') return guardado
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
    get().setTheme(get().theme === 'dark' ? 'light' : 'dark')
  },
}))
