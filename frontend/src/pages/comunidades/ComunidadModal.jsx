import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '@/stores/useAuthStore'
import { createComunidad, updateComunidad, getFotoComunidad, resolverUbicacion, saveFotoComunidad, deleteFotoComunidad } from '@/api/comunidades'
import { MapaUbicacion } from '@/components/shared/MapaUbicacion'
import { coordenadasValidas, parsearCoordenadas, comprimirImagen } from '@/utils/ubicacion'
import { getMiembros } from '@/api/equipos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { X, LocateFixed, Camera, Trash2 } from 'lucide-react'
import { useConfirmarSalida } from '@/hooks/useConfirmarSalida'

export function ComunidadModal({ onClose, onSaved, comunidad }) {
  const { equipoActual } = useAuthStore()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [miembros, setMiembros] = useState([])

  useEffect(() => {
    getMiembros(equipoActual.id)
      .then(res => setMiembros((res.data.data ?? []).filter(m => m.activo)))
      .catch(() => {})
  }, [equipoActual.id])

  const { register, handleSubmit, setValue, watch, formState: { errors, isDirty } } = useForm({
    defaultValues: comunidad || {},
  })

  // El select de enlace se llena de forma asíncrona: hasta que las opciones existen
  // el navegador descarta el valor por defecto, así que se vuelve a fijar al cargarlas.
  useEffect(() => {
    if (miembros.length && comunidad?.enlaceId) {
      setValue('enlaceId', comunidad.enlaceId)
    }
  }, [miembros, comunidad?.enlaceId, setValue])

  // Foto: undefined = sin cambios, null = quitar, string = nueva (data URL)
  const [foto, setFoto] = useState(undefined)
  const [fotoActual, setFotoActual] = useState(null)
  const [pegado, setPegado] = useState('')
  const [ubicando, setUbicando] = useState(false)
  const lat = watch('latitud')
  const lng = watch('longitud')
  const [precision, setPrecision] = useState(null)
  const [vista, setVista] = useState(null)
  const hayCoords = String(lat ?? '') !== '' || String(lng ?? '') !== ''

  // Vista previa del punto (con pausa para no recargar el mapa en cada tecla)
  useEffect(() => {
    if (!coordenadasValidas(lat, lng)) { setVista(null); return }
    const t = setTimeout(() => setVista({ lat: Number(lat), lng: Number(lng) }), 500)
    return () => clearTimeout(t)
  }, [lat, lng])

  useEffect(() => {
    if (!comunidad?.tieneFoto) return
    getFotoComunidad(equipoActual.id, comunidad.id)
      .then(res => setFotoActual(res.data.data))
      .catch(() => {})
  }, [comunidad?.id, comunidad?.tieneFoto, equipoActual.id])

  const fotoMostrada = foto === undefined ? fotoActual : foto

  const fijarCoordenadas = (latitud, longitud) => {
    setValue('latitud', latitud, { shouldDirty: true })
    setValue('longitud', longitud, { shouldDirty: true })
  }

  const usarMiUbicacion = () => {
    if (!navigator.geolocation) {
      toast({ title: 'Tu navegador no permite obtener la ubicación', variant: 'destructive' })
      return
    }
    setUbicando(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fijarCoordenadas(Number(pos.coords.latitude.toFixed(6)), Number(pos.coords.longitude.toFixed(6)))
        setPrecision(Math.round(pos.coords.accuracy))
        setUbicando(false)
      },
      () => {
        setUbicando(false)
        toast({ title: 'No se pudo obtener la ubicación', description: 'Revisa el permiso de ubicación del navegador.', variant: 'destructive' })
      },
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }

  // Acepta coordenadas o enlaces de Maps; los enlaces cortos (maps.app.goo.gl)
  // no traen coordenadas, así que se resuelven en el servidor.
  const procesarPegado = async (valor) => {
    const texto = valor.trim()
    if (!texto) return
    const c = parsearCoordenadas(texto)
    if (c) {
      fijarCoordenadas(c.latitud, c.longitud)
      setPrecision(null)
      setPegado('')
      return
    }
    if (!/^https?:\/\//i.test(texto)) return
    setUbicando(true)
    try {
      const res = await resolverUbicacion(equipoActual.id, texto)
      fijarCoordenadas(res.data.data.latitud, res.data.data.longitud)
      setPrecision(null)
      setPegado('')
    } catch (err) {
      toast({ title: 'No se pudo leer el enlace', description: err.response?.data?.error || 'Ingresa las coordenadas manualmente.', variant: 'destructive' })
    } finally {
      setUbicando(false)
    }
  }

  const alElegirFoto = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setFoto(await comprimirImagen(file))
    } catch {
      toast({ title: 'No se pudo procesar la imagen', variant: 'destructive' })
    }
  }

  const onSubmit = async (data) => {
    const conCoords = coordenadasValidas(data.latitud, data.longitud)
    if (!conCoords && (String(data.latitud ?? '') !== '' || String(data.longitud ?? '') !== '')) {
      toast({ title: 'Coordenadas inválidas', description: 'Ingresa latitud y longitud válidas, o deja ambas vacías.', variant: 'destructive' })
      return
    }
    setLoading(true)
    const payload = {
      ...data,
      enlaceId: data.enlaceId || null,
      latitud: conCoords ? Number(data.latitud) : null,
      longitud: conCoords ? Number(data.longitud) : null,
    }
    delete payload.tieneFoto
    try {
      let id = comunidad?.id
      if (id) {
        await updateComunidad(equipoActual.id, id, payload)
      } else {
        const res = await createComunidad(equipoActual.id, payload)
        id = res.data.data.id
      }
      if (typeof foto === 'string') await saveFotoComunidad(equipoActual.id, id, foto)
      else if (foto === null && comunidad?.tieneFoto) await deleteFotoComunidad(equipoActual.id, id)
      toast({ title: comunidad ? 'Comunidad actualizada' : 'Comunidad creada' })
      onSaved()
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Ocurrió un error', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const { cerrar, dialogo } = useConfirmarSalida(onClose, isDirty)

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
      {dialogo}
      <div className="bg-card rounded-t-2xl md:rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-lg">{comunidad ? 'Editar comunidad' : 'Nueva comunidad'}</h2>
          <button onClick={cerrar} className="min-h-0 h-auto p-1 text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <label className="text-sm font-medium">Nombre *</label>
              <Input {...register('nombre', { required: 'Requerido' })} placeholder="Nombre de la comunidad" />
              {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Número</label>
              <Input {...register('numero')} placeholder="C-001" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Departamento *</label>
              <select className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register('departamento', { required: 'Requerido' })}>
                <option value="">Seleccionar...</option>
                <option value="San Salvador">San Salvador</option>
                <option value="Cuscatlán">Cuscatlán</option>
                <option value="La Libertad">La Libertad</option>
              </select>
              {errors.departamento && <p className="text-xs text-destructive">{errors.departamento.message}</p>}
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-sm font-medium">Estado</label>
              <select className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register('estado')}>
                <option value="ACTIVA">Activa</option>
                <option value="PROCESO_INSCRIPCION">En proceso de inscripción</option>
                <option value="INACTIVA">Inactiva</option>
              </select>
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-sm font-medium">Enlace del equipo</label>
              <select
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...register('enlaceId', { valueAsNumber: true })}
              >
                <option value="">Sin enlace asignado</option>
                {miembros.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.nombreCorto || m.usuario.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-sm font-medium">Lugar de asamblea</label>
              <Input {...register('lugarAsamblea')} placeholder="Lugar habitual de reunión" />
            </div>
            <div className="col-span-2 rounded-lg border p-3 space-y-3">
              <p className="text-sm font-medium">Ubicación en el mapa</p>
              <div className="grid grid-cols-2 gap-3">
                <Input {...register('latitud')} inputMode="decimal" placeholder="Latitud (13.6929)" />
                <Input {...register('longitud')} inputMode="decimal" placeholder="Longitud (-89.2182)" />
              </div>
              {hayCoords && !coordenadasValidas(lat, lng) && (
                <p className="text-xs text-destructive">Coordenadas inválidas</p>
              )}
              <Button type="button" variant="outline" className="w-full" onClick={usarMiUbicacion} disabled={ubicando}>
                <LocateFixed className="h-4 w-4 mr-2" />
                {ubicando ? 'Obteniendo ubicación...' : 'Usar mi ubicación actual'}
              </Button>
              <Input
                value={pegado}
                onChange={(e) => setPegado(e.target.value)}
                onPaste={(e) => { e.preventDefault(); const t = e.clipboardData.getData('text'); setPegado(t); procesarPegado(t) }}
                onBlur={(e) => procesarPegado(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); procesarPegado(pegado) } }}
                placeholder="O pega un enlace de Google Maps o coordenadas"
              />
              {vista && (
                <div className="space-y-1">
                  <MapaUbicacion latitud={vista.lat} longitud={vista.lng} />
                  <p className="text-xs text-muted-foreground">
                    Arrastra y haz zoom en el mapa para confirmar que el marcador está en el lugar correcto.
                    {precision != null && ` Precisión del GPS: ±${precision} m.`}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Foto de referencia (fachada, portón, entrada...)</p>
                {fotoMostrada && (
                  <img src={fotoMostrada} alt="Foto de la ubicación" className="w-full max-h-56 object-cover rounded-md border" />
                )}
                <div className="flex gap-2">
                  <label className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-md border border-input text-sm cursor-pointer hover:bg-muted">
                    <Camera className="h-4 w-4" />
                    {fotoMostrada ? 'Cambiar foto' : 'Adjuntar foto'}
                    <input type="file" accept="image/*" className="hidden" onChange={alElegirFoto} />
                  </label>
                  {fotoMostrada && (
                    <Button type="button" variant="outline" onClick={() => setFoto(null)} title="Quitar foto">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-sm font-medium">Enlace Consejo Asesor</label>
              <Input {...register('enlaceConsejo')} placeholder="Nombre del enlace del consejo asesor" />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-sm font-medium">Notas</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                {...register('notas')}
                placeholder="Observaciones adicionales"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={cerrar}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
