import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '@/stores/useAuthStore'
import { cambiarContrasena } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { KeyRound, Eye, EyeOff } from 'lucide-react'

function PasswordInput({ show, onToggle, ...inputProps }) {
  return (
    <div className="relative">
      <Input type={show ? 'text' : 'password'} className="pr-10" {...inputProps} />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

export default function PerfilPage() {
  const { usuario } = useAuthStore()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [show, setShow] = useState({ actual: false, nueva: false, confirmar: false })
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm()

  const toggle = (field) => setShow((s) => ({ ...s, [field]: !s[field] }))

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await cambiarContrasena(data.contrasenaActual, data.contrasenaNueva)
      toast({ title: 'Contraseña actualizada correctamente' })
      reset()
    } catch (err) {
      toast({
        title: 'Error',
        description: err.response?.data?.error || 'Ocurrió un error',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-lg mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Mi perfil</h1>
        <p className="text-sm text-muted-foreground">Información de tu cuenta</p>
      </div>

      <Card>
        <CardContent className="flex items-center gap-4 py-4 px-4">
          <div className="h-14 w-14 rounded-full bg-primary-700 text-white flex items-center justify-center text-xl font-bold shrink-0">
            {usuario?.nombre?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-base truncate">{usuario?.nombre}</p>
            <p className="text-sm text-muted-foreground truncate">{usuario?.email}</p>
          </div>
        </CardContent>
      </Card>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold">Cambiar contraseña</h2>
        </div>
        <Card>
          <CardContent className="py-4 px-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Contraseña actual</label>
                <PasswordInput
                  show={show.actual}
                  onToggle={() => toggle('actual')}
                  placeholder="Tu contraseña actual"
                  {...register('contrasenaActual', { required: 'Requerida' })}
                />
                {errors.contrasenaActual && (
                  <p className="text-xs text-destructive">{errors.contrasenaActual.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Nueva contraseña</label>
                <PasswordInput
                  show={show.nueva}
                  onToggle={() => toggle('nueva')}
                  placeholder="Mínimo 6 caracteres"
                  {...register('contrasenaNueva', {
                    required: 'Requerida',
                    minLength: { value: 6, message: 'Mínimo 6 caracteres' },
                  })}
                />
                {errors.contrasenaNueva && (
                  <p className="text-xs text-destructive">{errors.contrasenaNueva.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Confirmar nueva contraseña</label>
                <PasswordInput
                  show={show.confirmar}
                  onToggle={() => toggle('confirmar')}
                  placeholder="Repite la nueva contraseña"
                  {...register('confirmar', {
                    required: 'Requerida',
                    validate: (v) => v === watch('contrasenaNueva') || 'Las contraseñas no coinciden',
                  })}
                />
                {errors.confirmar && (
                  <p className="text-xs text-destructive">{errors.confirmar.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Guardando...' : 'Actualizar contraseña'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
