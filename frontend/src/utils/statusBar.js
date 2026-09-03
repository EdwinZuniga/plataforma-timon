import { isNative } from './native'

/**
 * En la APK: ajusta el color de los íconos de la barra de estado (batería,
 * hora, señal) según el tema, para que se vean sobre el fondo de la app.
 * El espacio de la barra lo respeta el CSS con env(safe-area-inset-top).
 * En web es un no-op.
 */
export async function syncStatusBar(theme) {
  if (!isNative()) return
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    // Style.Dark = íconos claros (para fondo oscuro); Style.Light = íconos oscuros (fondo claro).
    await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light })
  } catch {
    /* plugin no disponible (p. ej. en web) */
  }
}
