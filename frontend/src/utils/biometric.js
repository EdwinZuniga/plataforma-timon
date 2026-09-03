import { NativeBiometric, BiometryType } from '@capgo/capacitor-native-biometric'
import { isNative } from './native'

// Identificador del "servicio" bajo el que se guardan las credenciales en el
// Keystore/Keychain del dispositivo.
const BIO_SERVER = 'plataforma-timon'
const FLAG_KEY = 'bioEnabled'
const EMAIL_KEY = 'bioEmail'

/**
 * ¿El dispositivo tiene huella/rostro configurado y utilizable?
 * En web siempre devuelve { disponible: false }.
 */
export async function biometricDisponible() {
  if (!isNative()) return { disponible: false, tipo: null }
  try {
    const res = await NativeBiometric.isAvailable({ useFallback: false })
    return { disponible: !!res.isAvailable, tipo: res.biometryType ?? null }
  } catch {
    return { disponible: false, tipo: null }
  }
}

export function etiquetaBiometria(tipo) {
  switch (tipo) {
    case BiometryType.FACE_ID:
    case BiometryType.FACE_AUTHENTICATION:
      return 'rostro'
    case BiometryType.IRIS_AUTHENTICATION:
      return 'iris'
    default:
      return 'huella'
  }
}

/** ¿El usuario ya activó el ingreso biométrico en este dispositivo? */
export function huellaActivada() {
  if (!isNative()) return false
  try {
    return localStorage.getItem(FLAG_KEY) === '1'
  } catch {
    return false
  }
}

/** Correo asociado a las credenciales guardadas (para mostrar en el botón). */
export function emailGuardado() {
  try {
    return localStorage.getItem(EMAIL_KEY) || null
  } catch {
    return null
  }
}

/**
 * Guarda correo + contraseña cifrados en el almacenamiento seguro del dispositivo
 * y marca el ingreso biométrico como activo.
 */
export async function activarHuella(email, password) {
  if (!isNative()) return
  await NativeBiometric.setCredentials({ username: email, password, server: BIO_SERVER })
  try {
    localStorage.setItem(FLAG_KEY, '1')
    localStorage.setItem(EMAIL_KEY, email)
  } catch { /* almacenamiento no disponible */ }
}

/** Borra las credenciales guardadas y desactiva el ingreso biométrico. */
export async function desactivarHuella() {
  try {
    await NativeBiometric.deleteCredentials({ server: BIO_SERVER })
  } catch { /* puede que no hubiera nada guardado */ }
  try {
    localStorage.removeItem(FLAG_KEY)
    localStorage.removeItem(EMAIL_KEY)
  } catch { /* noop */ }
}

/**
 * Pide la huella al usuario y, si la valida, devuelve las credenciales guardadas.
 * Lanza error si el usuario cancela o si no hay credenciales.
 * @returns {Promise<{ email: string, password: string }>}
 */
export async function obtenerCredencialesConHuella() {
  if (!isNative()) throw new Error('Biometría no disponible en este entorno')

  await NativeBiometric.verifyIdentity({
    reason: 'Ingresar a Plataforma Timón',
    title: 'Plataforma Timón',
    subtitle: 'Confirma tu identidad',
    description: 'Usa tu huella para iniciar sesión',
    useFallback: true, // permite PIN/patrón del dispositivo como respaldo
    negativeButtonText: 'Cancelar',
  })

  const { username, password } = await NativeBiometric.getCredentials({ server: BIO_SERVER })
  if (!username || !password) throw new Error('No hay credenciales guardadas')
  return { email: username, password }
}
