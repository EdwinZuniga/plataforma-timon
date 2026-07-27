import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '@/stores/useAuthStore'
import { misEquipos } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, seleccionarEquipo } = useAuthStore()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [loadingLabel, setLoadingLabel] = useState('Ingresando...')

  const { register, handleSubmit, formState: { errors } } = useForm()

  const DB_RETRY_ATTEMPTS = 2
  const DB_RETRY_DELAY_MS = 3000
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  const onSubmit = async ({ email, password }) => {
    setLoading(true)
    setLoadingLabel('Ingresando...')
    try {
      let intento = 0
      for (;;) {
        try {
          await login(email, password)
          break
        } catch (err) {
          const isDbIniciando = err.response?.data?.code === 'DB_INICIANDO'
          if (isDbIniciando && intento < DB_RETRY_ATTEMPTS) {
            intento++
            setLoadingLabel('El sistema se está iniciando...')
            await sleep(DB_RETRY_DELAY_MS)
            continue
          }
          throw err
        }
      }

      // Obtener equipos y auto-seleccionar si solo hay uno
      const res = await misEquipos()
      const equipos = res.data.data
      if (equipos.length === 1) {
        seleccionarEquipo(equipos[0])
        navigate('/dashboard')
      } else {
        navigate('/seleccionar-equipo')
      }
    } catch (err) {
      toast({
        title: 'Error de acceso',
        description: err.response?.data?.error || 'Credenciales incorrectas',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
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

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? loadingLabel : 'Ingresar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
