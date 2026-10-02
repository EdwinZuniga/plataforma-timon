import prisma from '../config/database.js'

const ACCION = { POST: 'CREACION', PUT: 'EDICION', PATCH: 'EDICION', DELETE: 'ELIMINACION' }
const VERBO = { CREACION: 'Creó', EDICION: 'Actualizó', ELIMINACION: 'Eliminó' }

// Nombre legible (singular) de cada recurso de la API; lo que no esté aquí se muestra tal cual.
const ETIQUETA = {
  usuarios: 'usuario', equipos: 'equipo', miembros: 'miembro', permisos: 'permisos', comunidades: 'comunidad',
  hermanos: 'hermano', talleres: 'taller', ediciones: 'edición de taller', inscripciones: 'inscripción',
  actividades: 'actividad', asistencia: 'asistencia', servicios: 'servicio', reuniones: 'reunión',
  acuerdos: 'acuerdo', comisiones: 'comisiones', visitas: 'visita', tesoreria: 'tesorería',
  inventario: 'inventario', movimientos: 'movimiento', prestamos: 'préstamo', ocr: 'OCR', tipos: 'tipo',
}

// Rutas que no aportan a la auditoría: la sesión ya tiene su propio historial.
const IGNORAR = [/^\/api\/auth(\/|$)/, /^\/api\/admin\/sesiones(\/|$)/, /^\/api\/health/]

const NOMBRE_EN_BODY = ['nombre', 'titulo', 'descripcion']

function interpretar(ruta) {
  const segs = ruta.replace(/^\/api\//, '').split('/').filter(Boolean)
  let equipoId = null
  if (segs[0] === 'equipos' && /^\d+$/.test(segs[1] || '') && segs.length > 2) {
    equipoId = Number(segs[1])
    segs.splice(0, 2)
  } else if (segs[0] === 'admin') {
    segs.shift()
  }
  // Cadena de recursos: [{ nombre, id }]
  const cadena = []
  for (const s of segs) {
    if (/^\d+$/.test(s)) { if (cadena.length) cadena[cadena.length - 1].id = Number(s) }
    else cadena.push({ nombre: s, id: null })
  }
  return { equipoId, cadena }
}

const etiqueta = (n) => ETIQUETA[n] || n

function describir(accion, cadena, body) {
  const ultimo = cadena[cadena.length - 1]
  let texto = `${VERBO[accion]} ${etiqueta(ultimo.nombre)}${ultimo.id ? ` #${ultimo.id}` : ''}`
  const campo = NOMBRE_EN_BODY.find((k) => typeof body?.[k] === 'string' && body[k].trim())
  if (campo) texto += ` «${body[campo].trim().slice(0, 80)}»`
  const padre = cadena[cadena.length - 2]
  if (padre) texto += ` (${etiqueta(padre.nombre)}${padre.id ? ` #${padre.id}` : ''})`
  return texto.slice(0, 1000)
}

// Registra las operaciones de escritura exitosas. Corre al terminar la respuesta,
// cuando requireAuth ya dejó al usuario en req.usuario; nunca bloquea ni rompe la petición.
export const bitacora = (req, res, next) => {
  const accion = ACCION[req.method]
  if (!accion) return next()
  const body = req.body
  res.on('finish', () => {
    try {
      const ruta = req.originalUrl.split('?')[0]
      if (res.statusCode >= 400 || !req.usuario || IGNORAR.some((r) => r.test(ruta))) return
      const { equipoId, cadena } = interpretar(ruta)
      if (!cadena.length) return
      const ultimo = cadena[cadena.length - 1]
      prisma.bitacora.create({
        data: {
          usuarioId: req.usuario.id,
          usuarioNombre: req.usuario.nombre ?? null,
          equipoId,
          accion,
          entidad: ultimo.nombre.slice(0, 100),
          entidadId: ultimo.id,
          descripcion: describir(accion, cadena, body),
          ip: req.ip ?? null,
        },
      }).catch((err) => console.error('Bitácora:', err.message))
    } catch (err) {
      console.error('Bitácora:', err.message)
    }
  })
  next()
}
