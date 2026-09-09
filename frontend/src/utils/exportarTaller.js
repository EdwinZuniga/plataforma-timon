// Exporta una edición de taller a Excel: asistencia, participaciones, tareas y
// un resumen por hermano. Uso previsto: respaldo mensual para subir a Drive.
// `xlsx` se carga bajo demanda para no engordar el bundle principal.

const MESES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const ESTADO_LABEL = { PRESENTE: 'Presente', AUSENTE: 'Ausente', PERMISO: 'Permiso' }

const registro = (col, mes, anio) => (col ?? []).find((r) => r.mes === mes && r.anio === anio)
const etiquetaMes = (m, multiAnio) => (multiAnio ? `${MESES_CORTO[m.mes - 1]} ${m.anio}` : MESES_CORTO[m.mes - 1])

const fmtFecha = (d) => {
  if (!d) return ''
  const [a, m, dd] = new Date(d).toISOString().slice(0, 10).split('-')
  return `${dd}/${m}/${a}`
}

const slug = (s) => (s || '').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim()

function descargar(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function exportarEdicionExcel({ edicion, months, multiAnio }) {
  const XLSX = await import('xlsx')

  const inscripciones = edicion.inscripciones ?? []
  const coordinador = edicion.coordinador?.nombreCorto || edicion.coordinador?.usuario?.nombre || '—'
  const hoy = new Date().toISOString().slice(0, 10)
  const nombreHermano = (ins) => `${ins.hermano.nombre} ${ins.hermano.apellido || ''}`.trim()
  const comunidad = (ins) => ins.hermano.comunidad?.nombre || ''
  const colsMes = months.map((m) => etiquetaMes(m, multiAnio))

  // ── Info ──────────────────────────────────────────────────────────────
  const info = [
    ['Taller', edicion.taller?.nombre || ''],
    ['Período', `${fmtFecha(edicion.fecha)}${edicion.fechaFin ? ` a ${fmtFecha(edicion.fechaFin)}` : ' (en curso)'}`],
    ['Lugar', edicion.lugar || ''],
    ['Coordinador', coordinador],
    ['Hermanos inscritos', inscripciones.length],
    ['Meses', months.length],
    ['Exportado', hoy],
  ]

  // ── Matriz genérica (asistencia / participaciones / tareas) ───────────
  const matriz = (tituloTotal, valor) => {
    const filas = [['Hermano', 'Comunidad', ...colsMes, tituloTotal]]
    for (const ins of inscripciones) {
      const fila = [nombreHermano(ins), comunidad(ins)]
      let total = 0
      for (const m of months) {
        const { texto, suma } = valor(ins, m)
        fila.push(texto)
        total += suma
      }
      fila.push(total)
      filas.push(fila)
    }
    return filas
  }

  const asistencia = matriz('Total presente', (ins, m) => {
    const r = registro(ins.asistenciasMes, m.mes, m.anio)
    return { texto: r ? (ESTADO_LABEL[r.estado] || r.estado) : '', suma: r?.estado === 'PRESENTE' ? 1 : 0 }
  })
  const participaciones = matriz('Total sí', (ins, m) => {
    const r = registro(ins.participaciones, m.mes, m.anio)
    return { texto: r ? (r.participo ? 'Sí' : 'No') : '', suma: r?.participo ? 1 : 0 }
  })
  const tareas = matriz('Total entregadas', (ins, m) => {
    const r = registro(ins.tareasEntrega, m.mes, m.anio)
    return { texto: r ? (r.entrego ? 'Sí' : 'No') : '', suma: r?.entrego ? 1 : 0 }
  })

  // ── Resumen por hermano ──────────────────────────────────────────────
  const resumen = [[
    'Hermano', 'Comunidad', 'Meses previstos', 'Registrados',
    'Presentes', 'Ausentes', 'Permisos', 'Sin registrar',
    'Participaciones', 'Tareas entregadas',
  ]]
  for (const ins of inscripciones) {
    const asist = ins.asistenciasMes ?? []
    const registrados = asist.length
    const presentes = asist.filter((a) => a.estado === 'PRESENTE').length
    const ausentesReg = asist.filter((a) => a.estado === 'AUSENTE').length
    const permisos = asist.filter((a) => a.estado === 'PERMISO').length
    const sinRegistrar = Math.max(months.length - registrados, 0)
    resumen.push([
      nombreHermano(ins), comunidad(ins), months.length, registrados,
      presentes, ausentesReg + sinRegistrar, permisos, sinRegistrar,
      (ins.participaciones ?? []).filter((p) => p.participo).length,
      (ins.tareasEntrega ?? []).filter((t) => t.entrego).length,
    ])
  }

  // ── Libro ────────────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new()
  const anchoMatriz = [26, 20, ...months.map(() => 10), 15]
  const addSheet = (nombre, aoa, widths) => {
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    ws['!cols'] = widths.map((w) => ({ wch: w }))
    XLSX.utils.book_append_sheet(wb, ws, nombre)
  }
  addSheet('Info', info, [20, 42])
  addSheet('Asistencia', asistencia, anchoMatriz)
  addSheet('Participaciones', participaciones, anchoMatriz)
  addSheet('Tareas', tareas, anchoMatriz)
  addSheet('Resumen', resumen, [26, 20, 14, 12, 11, 11, 10, 13, 15, 17])

  const nombreArchivo = `${slug(`${edicion.taller?.nombre || 'Taller'} ${fmtFecha(edicion.fecha).replace(/\//g, '-')} ${hoy}`)}.xlsx`
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  descargar(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    nombreArchivo,
  )
}
