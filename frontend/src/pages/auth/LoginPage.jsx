import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Fingerprint } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { misEquipos } from '@/api/auth'
import { pingDb } from '@/api/health'
import DespertandoServidor from '@/components/shared/DespertandoServidor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { isNative } from '@/utils/native'
import {
  biometricDisponible,
  etiquetaBiometria,
  huellaActivada,
  activarHuella,
  desactivarHuella,
  obtenerCredencialesConHuella,
} from '@/utils/biometric'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, seleccionarEquipo } = useAuthStore()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [loadingLabel, setLoadingLabel] = useState('Ingresando...')
  const [esperandoServidor, setEsperandoServidor] = useState(false)
  const [waitSecs, setWaitSecs] = useState(0)
  const dbWarmRef = useRef(false)

  // ── Biometría (solo dentro de la APK) ─────────────────────────────
  const [bio, setBio] = useState({ disponible: false, tipo: null })
  const [bioOn, setBioOn] = useState(huellaActivada())
  const [bioBusy, setBioBusy] = useState(false)
  const [pendingBio, setPendingBio] = useState(null) // { email, password, dest }
  const autoTried = useRef(false)
  const bioLabel = etiquetaBiometria(bio.tipo)

  const { register, handleSubmit, formState: { errors } } = useForm()

  const DB_RETRY_ATTEMPTS = 2
  const DB_RETRY_DELAY_MS = 3000
  const MAX_WAIT_MS = 90_000      // tope de espera mientras el servidor despierta
  const POLL_INTERVAL_MS = 3000   // cada cuánto sondeamos /health/db
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  // Sondea /health/db hasta que la base de datos responda o se agote el tope.
  // Devuelve true si quedó lista. Muestra la animación de espera solo si el
  // primer intento no la encuentra ya despierta (evita parpadeo).
  const esperarServidor = useCallback(async () => {
    if (dbWarmRef.current) return true
    const inicio = Date.now()

    try {
      const { data } = await pingDb()
      if (data?.warm) { dbWarmRef.current = true; return true }
    } catch { /* 503 / red: sigue despertando */ }

    setWaitSecs(0)
    setEsperandoServidor(true)
    try {
      for (;;) {
        if (Date.now() - inicio > MAX_WAIT_MS) return false
        await sleep(POLL_INTERVAL_MS)
        try {
          const { data } = await pingDb()
          if (data?.warm) { dbWarmRef.current = true; return true }
        } catch { /* sigue despertando */ }
      }
    } finally {
      setEsperandoServidor(false)
    }
  }, [])

  // Corre el login + selección de equipo. Devuelve la ruta destino.
  const iniciarSesion = useCallback(async (email, password) => {
    // 1. No enviamos credenciales hasta que el servidor pueda atenderlas.
    if (!(await esperarServidor())) {
      const e = new Error('SERVER_TIMEOUT')
      e.code = 'SERVER_TIMEOUT'
      throw e
    }

    // 2. Login real. Reintento corto por si volvió a dormirse entre el sondeo y aquí.
    let intento = 0
    for (;;) {
      try {
        await login(email, password)
        break
      } catch (err) {
        const isDbIniciando =
          err.response?.data?.code === 'DB_INICIANDO' || err.response?.status === 503
        if (isDbIniciando && intento < DB_RETRY_ATTEMPTS) {
          intento++
          dbWarmRef.current = false
          await esperarServidor()
          await sleep(DB_RETRY_DELAY_MS)
          continue
        }
        throw err
      }
    }

    const res = await misEquipos()
    const equipos = res.data.data
    if (equipos.length === 1) {
      seleccionarEquipo(equipos[0])
      return '/dashboard'
    }
    return '/seleccionar-equipo'
  }, [esperarServidor, login, seleccionarEquipo])

  const onSubmit = async ({ email, password }) => {
    setLoading(true)
    setLoadingLabel('Ingresando...')
    try {
      const dest = await iniciarSesion(email, password)
      // En la APK, si hay huella disponible y aún no está activada, ofrecer activarla.
      if (isNative() && bio.disponible && !bioOn) {
        setPendingBio({ email, password, dest })
      } else {
        navigate(dest)
      }
    } catch (err) {
      setEsperandoServidor(false)
      if (err.code === 'SERVER_TIMEOUT') {
        toast({
          title: 'El servidor está tardando en responder',
          description: 'La base de datos aún se está reactivando. Espera unos segundos y vuelve a intentar.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Error de acceso',
          description: err.response?.data?.error || 'Credenciales incorrectas',
          variant: 'destructive',
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const ingresarConHuella = useCallback(async () => {
    if (bioBusy) return
    setBioBusy(true)
    setLoadingLabel('Ingresando...')
    try {
      const { email, password } = await obtenerCredencialesConHuella()
      const dest = await iniciarSesion(email, password)
      navigate(dest)
    } catch (err) {
      setEsperandoServidor(false)
      const cancelado = /cancel|user|authentication failed|13/i.test(err?.message || '') && !err?.response
      if (err?.code === 'SERVER_TIMEOUT') {
        toast({
          title: 'El servidor está tardando en responder',
          description: 'La base de datos aún se está reactivando. Espera unos segundos y vuelve a intentar.',
          variant: 'destructive',
        })
      } else if (err?.response?.status === 401 || err?.response?.data?.code === 'CREDENCIALES_INVALIDAS') {
        await desactivarHuella()
        setBioOn(false)
        toast({
          title: 'Ingresa con tu contraseña',
          description: 'Tus datos cambiaron. Inicia sesión y vuelve a activar el ingreso con huella.',
          variant: 'destructive',
        })
      } else if (!cancelado) {
        toast({
          title: `No se pudo validar la ${bioLabel}`,
          description: err?.message || 'Intenta de nuevo o usa tu contraseña.',
          variant: 'destructive',
        })
      }
    } finally {
      setBioBusy(false)
    }
  }, [bioBusy, bioLabel, iniciarSesion, navigate, toast])

  // Al abrir el login empezamos a despertar el servidor en segundo plano,
  // mientras la persona escribe sus credenciales.
  useEffect(() => {
    pingDb()
      .then(({ data }) => { if (data?.warm) dbWarmRef.current = true })
      .catch(() => {})
  }, [])

  // Contador de segundos para la animación de espera.
  useEffect(() => {
    if (!esperandoServidor) return
    const t = setInterval(() => setWaitSecs((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [esperandoServidor])

  // Detectar biometría disponible al montar.
  useEffect(() => {
    if (!isNative()) return
    biometricDisponible().then(setBio)
  }, [])

  // Auto-disparar el ingreso con huella una sola vez si ya está activada.
  useEffect(() => {
    if (!isNative() || autoTried.current) return
    if (huellaActivada() && bio.disponible) {
      autoTried.current = true
      ingresarConHuella()
    }
  }, [ingresarConHuella, bio.disponible])

  const confirmarActivarHuella = async () => {
    const { email, password, dest } = pendingBio
    try {
      await activarHuella(email, password)
      setBioOn(true)
      toast({ title: `Ingreso con ${bioLabel} activado`, description: 'La próxima vez podrás entrar sin escribir tu contraseña.' })
    } catch {
      toast({ title: 'No se pudo activar', description: 'Inténtalo más tarde desde tu perfil.', variant: 'destructive' })
    } finally {
      setPendingBio(null)
      navigate(dest)
    }
  }

  const omitirActivarHuella = () => {
    const dest = pendingBio.dest
    setPendingBio(null)
    navigate(dest)
  }

  const mostrarBotonHuella = isNative() && bioOn && bio.disponible

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 pt-safe pb-safe">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-700 mb-4">
            <span className="text-3xl">⚓</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Plataforma Timón</h1>
          <p className="text-muted-foreground text-sm mt-1">Renovación Carismática · Arquidiócesis de San Salvador</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Iniciar sesión</CardTitle>
            <CardDescription>Ingresa tus credenciales para acceder</CardDescription>
          </CardHeader>
          <CardContent>
            {esperandoServidor && <DespertandoServidor segundos={waitSecs} />}
            {/* El form sigue montado (oculto) para no perder lo ya escrito si hay timeout. */}
            <div className={esperandoServidor ? 'hidden' : undefined}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="email">Correo electrónico</label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@correo.com"
                  autoComplete="email"
                  {...register('email', { required: 'El correo es requerido' })}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="password">Contraseña</label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register('password', { required: 'La contraseña es requerida' })}
                />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={loading || bioBusy}>
                {loading ? loadingLabel : 'Ingresar'}
              </Button>
            </form>

            {mostrarBotonHuella && (
              <>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">o usa tu {bioLabel}</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={ingresarConHuella}
                  disabled={loading || bioBusy}
                >
                  <Fingerprint className="h-5 w-5 mr-2" />
                  {bioBusy ? 'Validando...' : `Entrar con ${bioLabel}`}
                </Button>
              </>
            )}
            </div>
          </CardContent>
        </Card>
      </div>

      {pendingBio && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
          <div className="bg-card rounded-t-2xl md:rounded-xl w-full max-w-sm shadow-xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5 h-9 w-9 rounded-full bg-primary-700/10 flex items-center justify-center">
                <Fingerprint className="h-5 w-5 text-primary-700" />
              </div>
              <div>
                <p className="font-semibold text-base">¿Activar ingreso con {bioLabel}?</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  La próxima vez podrás entrar con tu {bioLabel} sin escribir tu contraseña.
                </p>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={omitirActivarHuella}>Ahora no</Button>
              <Button className="flex-1" onClick={confirmarActivarHuella}>Activar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
