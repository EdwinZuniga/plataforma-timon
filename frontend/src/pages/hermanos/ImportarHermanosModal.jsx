import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import { useAuthStore } from '@/stores/useAuthStore'
import { createHermanosMasivo } from '@/api/hermanos'
import { getComunidades } from '@/api/comunidades'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useConfirmarSalida } from '@/hooks/useConfirmarSalida'
import { X, Download, FileSpreadsheet } from 'lucide-react'

const COLUMNAS = ['Nombre', 'Apellido', 'Teléfono', 'Email', 'Comunidad', 'Notas']
const CAMPOS = { nombre: 'nombre', apellido: 'apellido', telefono: 'telefono', email: 'email', comunidad: 'comunidad', notas: 'notas' }
const MAX_FILAS = 500

const clave = (t) => String(t).trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export function ImportarHermanosModal({ onSaved }) {
  const { equipoActual } = useAuthStore()
  const { toast } = useToast()
  const inputRef = useRef(null)
  const [archivo, setArchivo] = useState('')
  const [filas, setFilas] = useState([])
  const [resultado, setResultado] = useState(null)
  const [revision, setRevision] = useState(null)
  const [decisiones, setDecisiones] = useState({})
  const [loading, setLoading] = useState(false)

  const { data: comunidades } = useQuery({
    queryKey: ['comunidades-select', equipoActual?.id],
    queryFn: () => getComunidades(equipoActual.id, { limit: 500 }).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

  const descargarPlantilla = async () => {
    const { default: ExcelJS } = await import('exceljs')
    const wb = new ExcelJS.Workbook()
    const hoja = wb.addWorksheet('Hermanos')
    const refs = wb.addWorksheet('Comunidades')

    const lista = comunidades || []
    refs.addRow(['Comunidad', 'Departamento'])
    lista.forEach((c) => refs.addRow([c.nombre, c.departamento]))
    refs.columns = [{ width: 36 }, { width: 22 }]
    refs.getRow(1).font = { bold: true }

    hoja.addRow(COLUMNAS)
    hoja.columns = COLUMNAS.map((c) => ({ width: c === 'Comunidad' ? 36 : Math.max(c.length + 4, 18) }))
    hoja.getRow(1).font = { bold: true }
    hoja.views = [{ state: 'frozen', ySplit: 1 }]

    // Lista desplegable en Comunidad (col. E): en Excel se puede escribir para filtrar y se rechaza lo que no esté en la lista.
    const fin = Math.max(lista.length, 1) + 1
    for (let r = 2; r <= MAX_FILAS + 1; r++) {
      hoja.getCell(`E${r}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`Comunidades!$A$2:$A$${fin}`],
        showErrorMessage: true,
        errorStyle: 'stop',
        errorTitle: 'Comunidad no válida',
        error: 'Elige una comunidad de la lista.',
      }
    }

    const buf = await wb.xlsx.writeBuffer()
    const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'plantilla-hermanos.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Lee el Excel y pide al servidor que lo clasifique sin guardar nada, para que el usuario lo revise.
  const leerArchivo = async (file) => {
    if (!file) return
    setResultado(null)
    setRevision(null)
    setDecisiones({})
    setFilas([])
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
      const hoja = wb.Sheets[wb.SheetNames[0]]
      const crudas = XLSX.utils.sheet_to_json(hoja, { defval: '', raw: false })
      const parsed = crudas
        .map((r, i) => {
          const fila = { fila: i + 2 }
          for (const [k, v] of Object.entries(r)) {
            const campo = CAMPOS[clave(k)]
            if (campo) fila[campo] = String(v).trim()
          }
          return fila
        })
        .filter((f) => Object.keys(CAMPOS).some((c) => f[c]))
      if (!parsed.length) {
        return toast({ title: 'El archivo no tiene filas', description: 'Usa la plantilla y llena al menos una fila.', variant: 'destructive' })
      }
      if (parsed.length > MAX_FILAS) {
        return toast({ title: `Máximo ${MAX_FILAS} filas por carga`, description: `El archivo tiene ${parsed.length}.`, variant: 'destructive' })
      }
      setArchivo(file.name)
      setLoading(true)
      const { data } = await createHermanosMasivo(equipoActual.id, parsed, true)
      setFilas(parsed)
      setRevision(data.data)
    } catch (err) {
      toast({
        title: err.response ? 'No se pudo revisar el archivo' : 'No se pudo leer el archivo',
        description: err.response?.data?.error || 'Verifica que sea un Excel (.xlsx) o CSV.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const sinResolver = revision ? revision.posibles.filter((p) => !decisiones[p.fila]).length : 0
  const aGuardar = revision ? revision.nuevos.length + revision.existentes.length + revision.posibles.length : 0

  // Se envía lo revisado: sin las filas con error y con la decisión del usuario en los posibles duplicados.
  const importar = async () => {
    const conError = new Set(revision.errores.map((e) => e.fila))
    const posiblePorFila = Object.fromEntries(revision.posibles.map((p) => [p.fila, p]))
    const lote = filas
      .filter((f) => !conError.has(f.fila))
      .map((f) => {
        const p = posiblePorFila[f.fila]
        if (!p) return f
        return decisiones[f.fila] === 'misma' ? { ...f, hermanoId: p.candidato.id } : { ...f, forzarNuevo: true }
      })
    setLoading(true)
    try {
      const { data } = await createHermanosMasivo(equipoActual.id, lote)
      setResultado(data.data)
      setRevision(null)
      setFilas([])
      setDecisiones({})
      if (data.data.creados || data.data.actualizados) {
        toast({ title: `${data.data.creados} registrado(s), ${data.data.actualizados} actualizado(s)` })
        onSaved(false)
      }
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || 'No se pudo importar', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const { cerrar, dialogo } = useConfirmarSalida(() => onSaved(true), revision !== null)

  const nombreCompleto = (x) => [x.nombre, x.apellido].filter(Boolean).join(' ')
  const ETIQUETA_CAMPO = { telefono: 'teléfono', email: 'email', notas: 'notas', reactivar: 'se reactivará' }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
      {dialogo}
      <div className="bg-card rounded-t-2xl md:rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-lg">Registro masivo desde Excel</h2>
          <button onClick={cerrar} className="min-h-0 h-auto p-1 text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-4 space-y-4">
          <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-1">
            <li>Descarga la plantilla y llena una fila por hermano.</li>
            <li>Nombre y Comunidad son obligatorios; la comunidad se elige de la lista desplegable (puedes escribir para filtrar).</li>
            <li>Sube el archivo y revisa lo que se va a importar antes de confirmar.</li>
          </ol>

          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={descargarPlantilla}>
              <Download className="h-4 w-4" /> Descargar plantilla
            </Button>
            <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { leerArchivo(e.target.files?.[0]); e.target.value = '' }} />
            <Button type="button" variant="outline" disabled={loading} onClick={() => inputRef.current?.click()}>
              <FileSpreadsheet className="h-4 w-4" /> {revision ? 'Cambiar archivo' : 'Seleccionar archivo'}
            </Button>
          </div>

          {loading && !revision && <p className="text-sm text-muted-foreground">Revisando el archivo...</p>}

          {revision && (
            <div className="space-y-4">
              <p className="text-sm rounded-md bg-muted p-3">
                <span className="font-medium">{archivo}</span>: {filas.length} fila(s) leídas.{' '}
                <span className="font-medium">{revision.nuevos.length}</span> nuevo(s),{' '}
                <span className="font-medium">{revision.existentes.length}</span> ya registrado(s),{' '}
                <span className="font-medium">{revision.posibles.length}</span> por confirmar,{' '}
                <span className="font-medium">{revision.errores.length}</span> con error.
              </p>

              {revision.nuevos.length > 0 && (
                <Seccion titulo="Se registrarán como nuevos" cantidad={revision.nuevos.length}>
                  {revision.nuevos.map((n) => (
                    <li key={n.fila} className="px-3 py-2">
                      <p><span className="text-muted-foreground">Fila {n.fila} · </span><span className="font-medium">{nombreCompleto(n)}</span></p>
                      <p className="text-muted-foreground">{[n.comunidad, n.telefono, n.email].filter(Boolean).join(' · ')}</p>
                    </li>
                  ))}
                </Seccion>
              )}

              {revision.existentes.length > 0 && (
                <Seccion titulo="Ya estaban registrados (no se duplican)" cantidad={revision.existentes.length}>
                  {revision.existentes.map((e) => (
                    <li key={e.fila} className="px-3 py-2">
                      <p>
                        <span className="text-muted-foreground">Fila {e.fila} · </span><span className="font-medium">{nombreCompleto(e.datos)}</span>
                        {nombreCompleto(e.existente) !== nombreCompleto(e.datos) && <span className="text-muted-foreground"> (en el sistema: {nombreCompleto(e.existente)})</span>}
                        {!e.existente.activo && <span className="text-muted-foreground"> · inactivo/a</span>}
                      </p>
                      <p className="text-muted-foreground">
                        {e.cambios.length ? `Se completará: ${e.cambios.map((c) => ETIQUETA_CAMPO[c]).join(', ')}` : 'Sin cambios'}
                      </p>
                    </li>
                  ))}
                </Seccion>
              )}

              {revision.posibles.length > 0 && (
                <Seccion titulo="Posibles duplicados: elige qué hacer" cantidad={revision.posibles.length} tono="text-amber-700 dark:text-amber-500">
                  {revision.posibles.map((p) => (
                    <li key={p.fila} className="px-3 py-2 space-y-1">
                      <p>Fila {p.fila}: <span className="font-medium">{nombreCompleto(p.datos)}</span> se parece a <span className="font-medium">{nombreCompleto(p.candidato)}</span> (ya registrado/a)</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {[['misma', 'Es la misma persona'], ['otra', 'Es otra persona']].map(([v, l]) => (
                          <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                            <input type="radio" name={`dec-${p.fila}`} checked={decisiones[p.fila] === v} onChange={() => setDecisiones((d) => ({ ...d, [p.fila]: v }))} />
                            {l}
                          </label>
                        ))}
                      </div>
                    </li>
                  ))}
                </Seccion>
              )}

              {revision.errores.length > 0 && (
                <Seccion titulo="Con error (no se importarán)" cantidad={revision.errores.length} tono="text-destructive">
                  {revision.errores.map((e, i) => <li key={i} className="px-3 py-2 text-destructive">Fila {e.fila}: {e.error}</li>)}
                </Seccion>
              )}
            </div>
          )}

          {resultado && (
            <div className="text-sm rounded-md border p-3 space-y-2">
              <p className="font-medium">Importación terminada</p>
              <p><span className="font-medium">{resultado.creados}</span> registrado(s)
                {resultado.actualizados > 0 && <>, <span className="font-medium">{resultado.actualizados}</span> ya existían y se completaron sus datos</>}
                {resultado.sinCambios > 0 && <>, <span className="font-medium">{resultado.sinCambios}</span> ya existían sin cambios</>}
                {resultado.errores.length > 0 && <>, <span className="font-medium text-destructive">{resultado.errores.length}</span> con error</>}.</p>
              {resultado.errores.length > 0 && (
                <ul className="max-h-40 overflow-y-auto space-y-1 text-destructive">
                  {resultado.errores.map((e, i) => <li key={i}>Fila {e.fila}: {e.error}</li>)}
                </ul>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={cerrar}>{resultado ? 'Cerrar' : 'Cancelar'}</Button>
            <Button type="button" className="flex-1" disabled={loading || !revision || aGuardar === 0 || sinResolver > 0} onClick={importar}>
              {loading && revision ? 'Importando...' : sinResolver > 0 ? `Resuelve ${sinResolver} duplicado(s)` : `Importar${aGuardar ? ` ${aGuardar}` : ''}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Bloque con título y lista desplazable usado en la revisión previa a importar.
function Seccion({ titulo, cantidad, tono = '', children }) {
  return (
    <div className="space-y-1.5">
      <p className={`text-sm font-medium ${tono}`}>{titulo} ({cantidad})</p>
      <ul className="max-h-48 overflow-y-auto rounded-md border divide-y text-sm">{children}</ul>
    </div>
  )
}
