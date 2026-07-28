import { useMemo, useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/useAuthStore'
import { procesarCarta, confirmarCarta } from '@/api/ocr'
import { getCatalogo } from '@/api/servicios'
import { getComunidades } from '@/api/comunidades'
import { getMiembros } from '@/api/equipos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import { useToast } from '@/components/ui/toast'
import { X, Upload, Loader2, FileText, Users, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'

function normalizar(str) {
  return (str || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

const PASO_UPLOAD = 1
const PASO_PROCESANDO = 2
const PASO_REVISAR = 3

const nombreMiembro = (m) => m.nombreCorto || m.usuario?.nombre || `Miembro ${m.id}`

function TextoCrudoOCR({ texto, confianza }) {
  const [abierto, setAbierto] = useState(false)
  if (!texto) return null
  const pct = Math.round((confianza || 0) * 100)
  return (
    <div className="border rounded-lg overflow-hidden text-xs">
      <button
        onClick={() => setAbierto(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
      >
        <span className="font-medium text-muted-foreground">
          Texto leído por OCR
          <span className={`ml-2 px-1.5 py-0.5 rounded ${pct >= 70 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
            {pct}% confianza
          </span>
        </span>
        {abierto ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {abierto && (
        <pre className="p-3 max-h-40 overflow-y-auto whitespace-pre-wrap text-muted-foreground bg-muted/10 font-mono leading-relaxed">
          {texto}
        </pre>
      )}
    </div>
  )
}

export function SubirCartaModal({ onClose, onSaved }) {
  const { equipoActual } = useAuthStore()
  const { toast } = useToast()
  const fileRef = useRef()

  const [paso, setPaso] = useState(PASO_UPLOAD)
  const [archivo, setArchivo] = useState(null)
  const [preview, setPreview] = useState(null)
  const [ocrRaw, setOcrRaw] = useState({ texto: '', confianza: 0 })
  const [ocrData, setOcrData] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const [form, setForm] = useState({
    catalogoServicioId: '',
    comunidadId: '',
    descripcion: '',
    comunidadSolicitante: '',
    horaServicio: '',
    lugarServicio: '',
    fechaServicio: '',
    dirigidoA: '',
  })
  const [miembroIdsSeleccionados, setMiembroIdsSeleccionados] = useState([])
  const [busqueda, setBusqueda] = useState('')

  const { data: catalogo } = useQuery({
    queryKey: ['catalogo', equipoActual?.id],
    queryFn: () => getCatalogo(equipoActual.id).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

  const { data: comunidades } = useQuery({
    queryKey: ['comunidades-select', equipoActual?.id],
    queryFn: () => getComunidades(equipoActual.id, { limit: 500 }).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

  const comunidadOptions = useMemo(
    () => (comunidades || []).map((c) => ({ value: c.id, label: c.nombre, sublabel: c.departamento })),
    [comunidades]
  )

  const { data: miembros } = useQuery({
    queryKey: ['miembros-equipo', equipoActual?.id],
    queryFn: () => getMiembros(equipoActual.id).then((r) => r.data.data),
    enabled: !!equipoActual?.id && paso === PASO_REVISAR,
  })

  const miembrosFiltrados = (miembros || []).filter((m) => {
    if (!m.activo) return false
    if (!busqueda) return true
    return nombreMiembro(m).toLowerCase().includes(busqueda.toLowerCase())
  })

  const seleccionarArchivo = (file) => {
    if (!file) return
    setArchivo(file)
    setPreview(URL.createObjectURL(file))
  }

  const onDrop = (e) => {
    e.preventDefault()
    seleccionarArchivo(e.dataTransfer.files[0])
  }

  const procesarImagen = async () => {
    if (!archivo) return
    setPaso(PASO_PROCESANDO)
    try {
      const fd = new FormData()
      fd.append('imagen', archivo)
      const res = await procesarCarta(equipoActual.id, fd)
      const { datosEstructurados, rutaArchivo, textoExtraido, confianza } = res.data.data

      setOcrRaw({ texto: textoExtraido || '', confianza: confianza || 0 })
      setOcrData({ ...datosEstructurados, rutaArchivo })

      const detectada = datosEstructurados.comunidadSolicitante || ''
      const coincidencia = detectada
        ? (comunidades || []).find((c) => normalizar(c.nombre).includes(normalizar(detectada)) || normalizar(detectada).includes(normalizar(c.nombre)))
        : null

      setForm({
        catalogoServicioId: '',
        comunidadId: coincidencia?.id || '',
        descripcion: datosEstructurados.tipoServicio || '',
        comunidadSolicitante: detectada,
        horaServicio: datosEstructurados.horaServicio || '',
        lugarServicio: datosEstructurados.lugarServicio || '',
        fechaServicio: datosEstructurados.fechaServicio || '',
        dirigidoA: datosEstructurados.dirigidoA || '',
      })
      setPaso(PASO_REVISAR)
    } catch (err) {
      toast({
        title: 'Error al procesar la imagen',
        description: err.response?.data?.error || 'Ocurrió un error',
        variant: 'destructive',
      })
      setPaso(PASO_UPLOAD)
    }
  }

  const toggleMiembro = (id) => {
    setMiembroIdsSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const guardar = async () => {
    if (!form.comunidadId) {
      toast({ title: 'Selecciona la comunidad solicitante', variant: 'destructive' })
      return
    }
    if (!form.catalogoServicioId) {
      toast({ title: 'Selecciona el tipo de servicio', variant: 'destructive' })
      return
    }
    setGuardando(true)
    try {
      await confirmarCarta(equipoActual.id, {
        catalogoServicioId: form.catalogoServicioId,
        comunidadId: form.comunidadId,
        miembroIds: miembroIdsSeleccionados,
        descripcion: form.descripcion,
        imagenCartaRuta: ocrData?.rutaArchivo,
        comunidadSolicitante: form.comunidadSolicitante,
        horaServicio: form.horaServicio,
        dirigidoA: form.dirigidoA,
        fechaServicio: form.fechaServicio,
        lugarServicio: form.lugarServicio,
      })
      toast({ title: 'Servicio creado desde carta' })
      onSaved()
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Ocurrió un error', variant: 'destructive' })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
      <div className="bg-card rounded-t-2xl md:rounded-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">Subir carta de servicio</h2>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Pasos */}
        <div className="flex items-center gap-0 px-6 pt-4 pb-2">
          {[['1', 'Subir'], ['2', 'Leyendo'], ['3', 'Revisar']].map(([n, label], i) => (
            <div key={n} className="flex items-center flex-1">
              <div className={`flex items-center gap-1.5 ${parseInt(n) <= paso ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2
                  ${paso === parseInt(n) ? 'bg-primary text-primary-foreground border-primary' :
                    parseInt(n) < paso ? 'bg-primary/20 border-primary text-primary' :
                    'border-muted-foreground/30 text-muted-foreground'}`}>
                  {parseInt(n) < paso ? <CheckCircle className="h-3.5 w-3.5" /> : n}
                </div>
                <span className="text-xs font-medium hidden sm:block">{label}</span>
              </div>
              {i < 2 && <div className={`flex-1 h-px mx-2 ${parseInt(n) < paso ? 'bg-primary' : 'bg-muted-foreground/20'}`} />}
            </div>
          ))}
        </div>

        <div className="p-4 space-y-4">

          {/* PASO 1 */}
          {paso === PASO_UPLOAD && (
            <div className="space-y-4">
              <div
                className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                onClick={() => fileRef.current?.click()}
                onDrop={onDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                {preview ? (
                  <img src={preview} alt="Vista previa" className="mx-auto max-h-64 rounded-lg object-contain" />
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                    <p className="text-sm font-medium">Arrastra la foto de la carta aquí</p>
                    <p className="text-xs text-muted-foreground">o haz clic para seleccionar · JPG, PNG, HEIC (máx. 10 MB)</p>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => seleccionarArchivo(e.target.files[0])} />
              </div>
              {archivo && <p className="text-xs text-muted-foreground text-center">{archivo.name}</p>}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
                <Button className="flex-1" onClick={procesarImagen} disabled={!archivo}>
                  <FileText className="h-4 w-4 mr-1" /> Leer carta
                </Button>
              </div>
            </div>
          )}

          {/* PASO 2 */}
          {paso === PASO_PROCESANDO && (
            <div className="py-16 flex flex-col items-center gap-4 text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="font-medium">Analizando la carta...</p>
              <p className="text-xs">Esto puede tardar unos segundos</p>
            </div>
          )}

          {/* PASO 3 */}
          {paso === PASO_REVISAR && (
            <div className="space-y-5">

              {/* Texto crudo del OCR */}
              <TextoCrudoOCR texto={ocrRaw.texto} confianza={ocrRaw.confianza} />

              {/* Datos extraídos */}
              <div className="bg-muted/40 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Datos extraídos — completa los campos vacíos si es necesario
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Comunidad solicitante *</label>
                    <Combobox
                      options={comunidadOptions}
                      value={form.comunidadId}
                      onChange={(v) => setForm((f) => ({ ...f, comunidadId: v }))}
                      placeholder="Seleccionar comunidad..."
                      searchPlaceholder="Buscar comunidad o departamento..."
                      emptyLabel="No se encontraron comunidades"
                    />
                    {form.comunidadSolicitante && (
                      <p className="text-xs text-muted-foreground">Detectado en la carta: "{form.comunidadSolicitante}"</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Dirigido a</label>
                    <Input
                      value={form.dirigidoA}
                      onChange={(e) => setForm((f) => ({ ...f, dirigidoA: e.target.value }))}
                      placeholder="Ej: Equipo Timón de Jóvenes"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Fecha del servicio</label>
                    <Input
                      value={form.fechaServicio}
                      onChange={(e) => setForm((f) => ({ ...f, fechaServicio: e.target.value }))}
                      placeholder="Ej: Dom-26-Jul-2026"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Hora</label>
                    <Input
                      value={form.horaServicio}
                      onChange={(e) => setForm((f) => ({ ...f, horaServicio: e.target.value }))}
                      placeholder="Ej: 8:00 AM a 3:30 PM"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">Lugar</label>
                    <Input
                      value={form.lugarServicio}
                      onChange={(e) => setForm((f) => ({ ...f, lugarServicio: e.target.value }))}
                      placeholder="Dirección o nombre del lugar"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">Descripción del servicio</label>
                    <textarea
                      className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                      value={form.descripcion}
                      onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                      placeholder="Ej: Retiro de jóvenes para creación del ministerio"
                    />
                  </div>
                </div>
              </div>

              {/* Tipo de servicio */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Tipo de servicio (catálogo) *</label>
                <select
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.catalogoServicioId}
                  onChange={(e) => setForm((f) => ({ ...f, catalogoServicioId: e.target.value }))}
                >
                  <option value="">Seleccionar tipo de servicio...</option>
                  {catalogo?.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
                {(!catalogo || catalogo.length === 0) && (
                  <p className="text-xs text-amber-600">
                    No hay tipos en el catálogo. Agrega uno desde la pantalla de Servicios → Catálogo.
                  </p>
                )}
              </div>

              {/* Asignar miembros */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <label className="text-sm font-medium">Asignar miembros del Equipo Timón</label>
                  {miembroIdsSeleccionados.length > 0 && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                      {miembroIdsSeleccionados.length} seleccionado{miembroIdsSeleccionados.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <Input placeholder="Buscar miembro..." value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)} />
                <div className="border rounded-lg divide-y max-h-52 overflow-y-auto">
                  {miembrosFiltrados.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">No se encontraron miembros</p>
                  )}
                  {miembrosFiltrados.map((m) => {
                    const sel = miembroIdsSeleccionados.includes(m.id)
                    return (
                      <label key={m.id}
                        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors ${sel ? 'bg-primary/5' : ''}`}>
                        <input type="checkbox" checked={sel} onChange={() => toggleMiembro(m.id)}
                          className="h-4 w-4 rounded border-input accent-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-none">{nombreMiembro(m)}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{m.rol}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Puedes asignar más miembros después desde la pantalla de servicios
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setPaso(PASO_UPLOAD)}>Volver</Button>
                <Button className="flex-1" onClick={guardar} disabled={guardando || !form.comunidadId || !form.catalogoServicioId}>
                  {guardando
                    ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Guardando...</>
                    : 'Guardar servicio'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
