import { Capacitor } from '@capacitor/core'

// True solo cuando corremos dentro de la APK (WebView de Capacitor), no en el navegador.
export const isNative = () => Capacitor.isNativePlatform()

export const getPlatform = () => Capacitor.getPlatform() // 'android' | 'ios' | 'web'
