import prisma from '../../config/database.js'
import { hoyElSalvador } from '../servicios/servicio-estado.js'

const DIA_MS = 24 * 60 * 60 * 1000
const ymd = (d) => new Date(d).toISOString().slice(0, 10)
const sumarDias = (d, n) => new Date(new Date(d).getTime() + n * DIA_MS)

// Fechas (YYYY-MM-DD) en que cae el patrón "semana N, día D de cada mes" dentro de [desde, hasta].
// semana 1-4 = primera…cuarta ocurrencia del día; 5 = la última del mes. dia: 0 domingo … 6 sábado.
const fechasPatronMensual = (semana, dia, desde, hasta) => {
  const fechas = []
  const ini = new Date(`${desde}T00:00:00.000Z`)
  const fin = new Date(`${hasta}T00:00:00.000Z`)
  let cursor = new Date(Date.UTC(ini.getUTCFullYear(), ini.getUTCMonth(), 1))
  while (cursor <= fin) {
    const y = cursor.getUTCFullYear()
    const m = cursor.getUTCMonth()
    let d
    if (semana === 5) {
      const ultimo = new Date(Date.UTC(y, m + 1, 0))
      d = new Date(Date.UTC(y, m, ultimo.getUTCDate() - ((ultimo.getUTCDay() - dia + 7) % 7)))
    } else {
      const hastaPrimero = (dia - cursor.getUTCDay() + 7) % 7
      d = new Date(Date.UTC(y, m, 1 + hastaPrimero + 7 * (semana - 1)))
    }
    // La 5.ª ocurrencia no existe en todos los meses; solo 1-4 llegan aquí, pero se descarta si se desborda
    if (d.getUTCMonth() === m && d >= ini && d <= fin) fechas.push(ymd(d))
    cursor = new Date(Date.UTC(y, m + 1, 1))
  }
  return fechas
}

// Módulos que el miembro tiene bloqueados (permiso ver = false).
// Sin registro explícito, el módulo es visible (igual que en requirePermiso).
const modulosVedados = async (membresia, usuario) => {
  if (usuario?.superAdmin) return new Set()
  const permisos = await prisma.permisoUsuario.findMany({
    where: { miembroId: membresia.id, ver: false },
    select: { modulo: true },
  })
  return new Set(permisos.map((p) => p.modulo))
}

// Eventos del equipo entre dos fechas (YYYY-MM-DD, inclusive). Cada evento:
// { id, tipo, titulo, detalle, fecha, fechaFin, hora, link, mio }
export const eventosEquipo = async (equipoId, membresia, usuario, desde, hasta) => {
  const vedados = await modulosVedados(membresia, usuario)
  const ini = new Date(`${desde}T00:00:00.000Z`)
  const fin = new Date(`${hasta}T23:59:59.999Z`)
  const enRango = { gte: ini, lte: fin }
  // Eventos con duración: se solapan con el rango si empiezan antes de su fin y terminan después de su inicio
  const solapa = {
    fecha: { lte: fin },
    OR: [{ fechaFin: { gte: ini } }, { fechaFin: null, fecha: { gte: ini } }],
  }
  const ver = (m) => !vedados.has(m)

  const [reuniones, actividades, servicios, visitas, ediciones, acuerdos, prestamos] = await Promise.all([
    ver('reuniones')
      ? prisma.reunion.findMany({ where: { equipoId, fecha: enRango }, select: { id: true, titulo: true, fecha: true, lugar: true } })
      : [],
    ver('actividades')
      // Las actividades generadas por un servicio se muestran como servicio, no como actividad
      ? prisma.actividad.findMany({ where: { equipoId, generadaPorServicio: false, fecha: enRango }, select: { id: true, nombre: true, tipo: true, fecha: true, lugar: true } })
      : [],
    ver('servicios')
      ? prisma.servicioActividad.findMany({
          where: { actividad: { equipoId, fecha: enRango }, estado: { in: ['ASIGNADO', 'CONFIRMADO'] } },
          select: {
            id: true,
            horaServicio: true,
            catalogoServicio: { select: { nombre: true } },
            comunidad: { select: { nombre: true } },
            comunidadSolicitante: true,
            actividad: { select: { fecha: true, lugar: true } },
            asignados: { select: { miembroId: true } },
          },
        })
      : [],
    ver('comunidades')
      ? prisma.visita.findMany({
          where: { equipoId, ...solapa },
          select: { id: true, comunidadId: true, fecha: true, fechaFin: true, horario: true, responsableId: true, comunidad: { select: { nombre: true } } },
        })
      : [],
    ver('talleres')
      ? prisma.edicionTaller.findMany({
          // Sin fecha de fin = edición en curso: sigue vigente hacia adelante
          where: { taller: { equipoId }, fecha: { lte: fin }, OR: [{ fechaFin: { gte: ini } }, { fechaFin: null }] },
          select: { id: true, tallerId: true, fecha: true, fechaFin: true, lugar: true, coordinadorId: true, semanaSesion: true, diaSesion: true, taller: { select: { nombre: true } } },
        })
      : [],
    ver('reuniones')
      ? prisma.acuerdo.findMany({
          where: { reunion: { equipoId }, estado: { not: 'CUMPLIDO' }, fechaLimite: enRango },
          select: { id: true, descripcion: true, fechaLimite: true, reunionId: true, responsables: { select: { miembroId: true } } },
        })
      : [],
    ver('inventario')
      ? prisma.prestamoArticulo.findMany({
          where: { equipoId, estado: 'PRESTADO', fechaEsperada: enRango },
          select: { id: true, prestadoA: true, fechaEsperada: true, articulo: { select: { nombre: true } } },
        })
      : [],
  ])

  const eventos = []
  for (const r of reuniones) {
    eventos.push({ id: `reunion-${r.id}`, tipo: 'REUNION', titulo: r.titulo, detalle: r.lugar, fecha: ymd(r.fecha), link: `/reuniones/${r.id}` })
  }
  for (const a of actividades) {
    eventos.push({ id: `actividad-${a.id}`, tipo: 'ACTIVIDAD', titulo: a.nombre, detalle: [a.tipo, a.lugar].filter(Boolean).join(' · '), fecha: ymd(a.fecha), link: `/actividades/${a.id}` })
  }
  for (const s of servicios) {
    eventos.push({
      id: `servicio-${s.id}`,
      tipo: 'SERVICIO',
      titulo: s.catalogoServicio.nombre,
      detalle: [s.comunidad?.nombre || s.comunidadSolicitante, s.actividad.lugar].filter(Boolean).join(' · '),
      fecha: ymd(s.actividad.fecha),
      hora: s.horaServicio || null,
      link: '/servicios',
      mio: s.asignados.some((x) => x.miembroId === membresia.id),
    })
  }
  for (const v of visitas) {
    eventos.push({
      id: `visita-${v.id}`,
      tipo: 'VISITA',
      titulo: `Visita a ${v.comunidad.nombre}`,
      detalle: v.horario,
      fecha: ymd(v.fecha),
      fechaFin: v.fechaFin ? ymd(v.fechaFin) : null,
      link: `/comunidades/${v.comunidadId}`,
      mio: v.responsableId === membresia.id,
    })
  }
  for (const e of ediciones) {
    // Con patrón mensual, un evento por cada sesión dentro de la vigencia de la edición;
    // sin patrón, solo se marca el día de inicio.
    const inicioEdicion = ymd(e.fecha)
    const vigenteDesde = inicioEdicion > desde ? inicioEdicion : desde
    const vigenteHasta = e.fechaFin && ymd(e.fechaFin) < hasta ? ymd(e.fechaFin) : hasta
    const tienePatron = e.semanaSesion && e.diaSesion !== null
    const dias = tienePatron
      ? (vigenteDesde <= vigenteHasta ? fechasPatronMensual(e.semanaSesion, e.diaSesion, vigenteDesde, vigenteHasta) : [])
      : (inicioEdicion >= desde && inicioEdicion <= hasta ? [inicioEdicion] : [])
    for (const dia of dias) {
      eventos.push({
        id: `taller-${e.id}-${dia}`,
        tipo: 'TALLER',
        titulo: e.taller.nombre,
        detalle: e.lugar,
        fecha: dia,
        link: `/talleres/${e.tallerId}/ediciones/${e.id}`,
        mio: e.coordinadorId === membresia.id,
      })
    }
  }
  for (const a of acuerdos) {
    eventos.push({
      id: `acuerdo-${a.id}`,
      tipo: 'ACUERDO',
      titulo: `Vence acuerdo: ${a.descripcion}`,
      fecha: ymd(a.fechaLimite),
      link: `/reuniones/${a.reunionId}`,
      mio: a.responsables.some((x) => x.miembroId === membresia.id),
    })
  }
  for (const p of prestamos) {
    eventos.push({ id: `prestamo-${p.id}`, tipo: 'PRESTAMO', titulo: `Devolución: ${p.articulo.nombre}`, detalle: p.prestadoA, fecha: ymd(p.fechaEsperada), link: '/inventario' })
  }

  return eventos.sort((a, b) => a.fecha.localeCompare(b.fecha))
}

// ─── Avisos ──────────────────────────────────────────────────────────────────
// Se calculan al consultar (no hay tareas programadas): así no se mantiene
// despierta a Azure SQL serverless. El "visto" lo guarda el cliente.

const DIAS_ANTICIPACION_ACUERDO = 3
const DIAS_ANTICIPACION_EVENTO = 7

const cuando = (fecha, hoy) => {
  const dias = Math.round((new Date(`${fecha}T00:00:00.000Z`) - hoy) / DIA_MS)
  if (dias === 0) return 'hoy'
  if (dias === 1) return 'mañana'
  if (dias < 0) return `hace ${-dias} día${dias === -1 ? '' : 's'}`
  return `en ${dias} días`
}

const ETIQUETA_EVENTO = {
  REUNION: 'Reunión',
  ACTIVIDAD: 'Actividad',
  SERVICIO: 'Servicio asignado',
  VISITA: 'Visita a cargo',
  TALLER: 'Taller a cargo',
}

export const avisosMiembro = async (equipoId, membresia, usuario) => {
  const hoy = hoyElSalvador()
  const vedados = await modulosVedados(membresia, usuario)
  const avisos = []

  if (!vedados.has('reuniones')) {
    const acuerdos = await prisma.acuerdo.findMany({
      where: {
        reunion: { equipoId },
        estado: { not: 'CUMPLIDO' },
        fechaLimite: { lte: sumarDias(hoy, DIAS_ANTICIPACION_ACUERDO) },
        responsables: { some: { miembroId: membresia.id } },
      },
      select: { id: true, descripcion: true, fechaLimite: true, reunionId: true },
      orderBy: { fechaLimite: 'asc' },
    })
    for (const a of acuerdos) {
      const vencido = a.fechaLimite < hoy
      avisos.push({
        id: `acuerdo-${a.id}-${vencido ? 'vencido' : 'proximo'}`,
        tipo: 'ACUERDO',
        nivel: vencido ? 'urgente' : 'atencion',
        titulo: vencido ? 'Acuerdo vencido' : 'Acuerdo por vencer',
        detalle: `${a.descripcion} — vence ${cuando(ymd(a.fechaLimite), hoy)}`,
        fecha: ymd(a.fechaLimite),
        link: `/reuniones/${a.reunionId}`,
      })
    }
  }

  if (!vedados.has('inventario')) {
    const prestamos = await prisma.prestamoArticulo.findMany({
      where: { equipoId, estado: 'PRESTADO', fechaEsperada: { lt: hoy } },
      select: { id: true, prestadoA: true, fechaEsperada: true, articulo: { select: { nombre: true } } },
      orderBy: { fechaEsperada: 'asc' },
    })
    for (const p of prestamos) {
      avisos.push({
        id: `prestamo-${p.id}-vencido`,
        tipo: 'PRESTAMO',
        nivel: 'atencion',
        titulo: 'Préstamo sin devolver',
        detalle: `${p.articulo.nombre} prestado a ${p.prestadoA} — debía volver ${cuando(ymd(p.fechaEsperada), hoy)}`,
        fecha: ymd(p.fechaEsperada),
        link: '/inventario',
      })
    }
  }

  const proximos = await eventosEquipo(equipoId, membresia, usuario, ymd(hoy), ymd(sumarDias(hoy, DIAS_ANTICIPACION_EVENTO)))
  for (const e of proximos) {
    if (e.tipo === 'ACUERDO' || e.tipo === 'PRESTAMO') continue // ya cubiertos arriba
    // Reuniones y actividades interesan a todo el equipo; el resto, a quien le toca
    const general = e.tipo === 'REUNION' || e.tipo === 'ACTIVIDAD'
    if (!general && !e.mio) continue
    avisos.push({
      id: e.id,
      tipo: e.tipo,
      nivel: e.mio ? 'atencion' : 'info',
      titulo: `${ETIQUETA_EVENTO[e.tipo]} ${cuando(e.fecha, hoy)}`,
      detalle: [e.titulo, e.hora].filter(Boolean).join(' · '),
      fecha: e.fecha,
      link: e.link,
    })
  }

  const peso = { urgente: 0, atencion: 1, info: 2 }
  return avisos.sort((a, b) => peso[a.nivel] - peso[b.nivel] || a.fecha.localeCompare(b.fecha))
}

// ─── Exportación .ics ────────────────────────────────────────────────────────

const escapeIcs = (t) => String(t ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
const compacta = (f) => f.replace(/-/g, '')

export const generarIcs = (eventos, nombreEquipo) => {
  const sello = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Plataforma Timon//Calendario//ES',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeIcs(`Timón · ${nombreEquipo}`)}`,
  ]
  for (const e of eventos) {
    const ultimo = e.fechaFin || e.fecha
    const descripcion = [e.detalle, e.hora && `Hora: ${e.hora}`].filter(Boolean).join('\n')
    lineas.push(
      'BEGIN:VEVENT',
      `UID:${e.id}@plataforma-timon`,
      `DTSTAMP:${sello}`,
      `DTSTART;VALUE=DATE:${compacta(e.fecha)}`,
      `DTEND;VALUE=DATE:${compacta(ymd(sumarDias(`${ultimo}T00:00:00.000Z`, 1)))}`,
      `SUMMARY:${escapeIcs(e.titulo)}`,
      ...(descripcion ? [`DESCRIPTION:${escapeIcs(descripcion)}`] : []),
      'END:VEVENT',
    )
  }
  lineas.push('END:VCALENDAR')
  return lineas.join('\r\n')
}
