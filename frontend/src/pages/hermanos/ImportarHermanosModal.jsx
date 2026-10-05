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
  const [posibles, setPosibles] = useState([])
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

  const leerArchivo = async (file) => {
    if (!file) return
    setResultado(null)
    setPosibles([])
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
        toast({ title: 'El archivo no tiene filas', description: 'Usa la plantilla y llena al menos una fila.', variant: 'destructive' })
        return setFilas([])
      }
      if (parsed.length > MAX_FILAS) {
        toast({ title: `Máximo ${MAX_FILAS} filas por carga`, description: `El archivo tiene ${parsed.length}.`, variant: 'destructive' })
        return setFilas([])
      }
      setArchivo(file.name)
      setFilas(parsed)
    } catch {
      toast({ title: 'No se pudo leer el archivo', description: 'Verifica que sea un Excel (.xlsx) o CSV.', variant: 'destructive' })
      setFilas([])
    }
  }

  const sumar = (prev, r) => ({
    creados: (prev?.creados || 0) + r.creados,
    actualizados: (prev?.actualizados || 0) + r.actualizados,
    sinCambios: (prev?.sinCambios || 0) + r.sinCambios,
    errores: [...(prev?.errores || []), ...r.errores],
  })

  const enviar = async (lote) => {
    setLoading(true)
    try {
      const { data } = await createHermanosMasivo(equipoActual.id, lote)
      const r = data.data
      setResultado((prev) => sumar(prev, r))
      setPosibles(r.posibles)
      setDecisiones({})
      setFilas([])
      if (r.creados || r.actualizados) {
        toast({ title: `${r.creados} registrado(s), ${r.actualizados} actualizado(s)` })
        onSaved(false)
      }
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || 'No se pudo importar', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const importar = () => { setResultado(null); enviar(filas) }

  // Cada posible duplicado se reenvía según lo que el usuario eligió.
  const confirmarDecisiones = () => enviar(posibles.map((p) => (
    decisiones[p.fila] === 'misma'
      ? { ...p.datos, fila: p.fila, hermanoId: p.candidato.id }
      : { ...p.datos, fila: p.fila, forzarNuevo: true }
  )))

  const { cerrar, dialogo } = useConfirmarSalida(() => onSaved(true), filas.length > 0 || posibles.length > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
      {dialogo}
      <div className="bg-card rounded-t-2xl md:rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-lg">Registro masivo desde Excel</h2>
          <button onClick={cerrar} className="min-h-0 h-auto p-1 text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-4 space-y-4">
          <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-1">
            <li>Descarga la plantilla y llena una fila por hermano.</li>
            <li>Nombre y Comunidad son obligatorios; la comunidad se elige de la lista desplegable (puedes escribir para filtrar).</li>
            <li>Sube el archivo y revisa el resumen antes de importar.</li>
          </ol>

          <Button type="button" variant="outline" className="w-full" onClick={descargarPlantilla}>
            <Download className="h-4 w-4" /> Descargar plantilla
          </Button>

          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { leerArchivo(e.target.files?.[0]); e.target.value = '' }} />
          <Button type="button" variant="outline" className="w-full" onClick={() => inputRef.current?.click()}>
            <FileSpreadsheet className="h-4 w-4" /> {archivo && filas.length ? 'Cambiar archivo' : 'Seleccionar archivo'}
          </Button>

          {filas.length > 0 && (
            <p className="text-sm rounded-md bg-muted p-3">
              <span className="font-medium">{archivo}</span>: {filas.length} fila(s) listas para importar.
            </p>
          )}

          {resultado && (
            <div className="text-sm rounded-md border p-3 space-y-2">
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

          {posibles.length > 0 && (
            <div className="rounded-md border border-amber-500/50 p-3 space-y-3">
              <p className="text-sm font-medium">Posibles duplicados: revisa cada caso</p>
              {posibles.map((p) => (
                <div key={p.fila} className="text-sm space-y-1">
                  <p>Fila {p.fila}: <span className="font-medium">{p.datos.nombre} {p.datos.apellido}</span> se parece a <span className="font-medium">{p.candidato.nombre} {p.candidato.apellido}</span> (ya registrado/a)</p>
                  <div className="flex gap-4">
                    {[['misma', 'Es la misma persona'], ['otra', 'Es otra persona']].map(([v, l]) => (
                      <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" name={`dec-${p.fila}`} checked={decisiones[p.fila] === v} onChange={() => setDecisiones((d) => ({ ...d, [p.fila]: v }))} />
                        {l}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <Button type="button" className="w-full" disabled={loading || posibles.some((p) => !decisiones[p.fila])} onClick={confirmarDecisiones}>
                {loading ? 'Guardando...' : 'Confirmar decisiones'}
              </Button>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={cerrar}>{resultado ? 'Cerrar' : 'Cancelar'}</Button>
            <Button type="button" className="flex-1" disabled={loading || !filas.length} onClick={importar}>
              {loading ? 'Importando...' : `Importar${filas.length ? ` ${filas.length}` : ''}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
