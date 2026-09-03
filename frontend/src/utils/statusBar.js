import { isNative } from './native'

// Fondo de la barra de estado según el tema (coincide con el fondo de la app).
const COLORS = { light: '#ffffff', dark: '#0b1220' }

/**
 * En la APK: evita que el contenido web quede debajo de la barra de estado
 * (notificaciones, batería, wifi) y ajusta su color/íconos al tema.
 * En web es un no-op.
 */
export async function syncStatusBar(theme) {
  if (!isNative()) return
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    // La barra NO se superpone: la WebView arranca debajo de ella.
    await StatusBar.setOverlaysWebView({ overlays: false })
    await StatusBar.setBackgroundColor({ color: COLORS[theme] || COLORS.light })
    // Style.Dark = íconos claros (fondo oscuro); Style.Light = íconos oscuros (fondo claro).
    await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light })
  } catch {
    /* plugin no disponible (p. ej. en web) */
  }
}
