import prisma from '../../config/database.js'

const PAGE_SIZE = 20

export const listarHermanos = async (equipoId, { q, comunidadId, activo, page = 1 }) => {
  const where = {
    equipoId,
    ...(q && {
      OR: [
        { nombre: { contains: q } },
        { apellido: { contains: q } },
      ],
    }),
    ...(comunidadId && { comunidadId }),
    ...(activo !== undefined && { activo: activo === 'true' }),
  }

  const [total, data] = await Promise.all([
    prisma.hermano.count({ where }),
    prisma.hermano.findMany({
      where,
      include: { comunidad: { select: { id: true, nombre: true, departamento: true } } },
      orderBy: [{ nombre: 'asc' }, { apellido: 'asc' }],
      skip: (parseInt(page) - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ])

  return { data, pagination: { page: parseInt(page), limit: PAGE_SIZE, total, pages: Math.ceil(total / PAGE_SIZE) } }
}

export const crearHermano = async (body) => {
  return prisma.hermano.create({ data: body })
}

export const obtenerHermano = async (equipoId, id) => {
  const hermano = await prisma.hermano.findFirst({
    where: { id, equipoId },
    include: { comunidad: true },
  })
  if (!hermano) throw { status: 404, message: 'Hermano no encontrado', code: 'HERMANO_NO_ENCONTRADO' }
  return hermano
}

export const historialHermano = async (equipoId, id) => {
  const hermano = await prisma.hermano.findFirst({
    where: { id, equipoId },
    include: {
      inscripciones: {
        include: {
          edicionTaller: {
            include: { taller: { select: { id: true, nombre: true, descripcion: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      asistencias: {
        include: { actividad: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
  if (!hermano) throw { status: 404, message: 'Hermano no encontrado', code: 'HERMANO_NO_ENCONTRADO' }
  return {
    talleres: hermano.inscripciones,
    actividades: hermano.asistencias,
  }
}

export const actualizarHermano = async (equipoId, id, body) => {
  const existe = await prisma.hermano.findFirst({ where: { id, equipoId } })
  if (!existe) throw { status: 404, message: 'Hermano no encontrado', code: 'HERMANO_NO_ENCONTRADO' }
  const { nombre, apellido, telefono, email, comunidadId, activo, notas } = body
  return prisma.hermano.update({
    where: { id },
    data: { nombre, apellido, telefono, email, comunidadId: comunidadId ? parseInt(comunidadId) : undefined, activo, notas }
  })
}

export const eliminarHermano = async (equipoId, id) => {
  const existe = await prisma.hermano.findFirst({ where: { id, equipoId } })
  if (!existe) throw { status: 404, message: 'Hermano no encontrado', code: 'HERMANO_NO_ENCONTRADO' }
  return prisma.hermano.update({ where: { id }, data: { activo: false } })
}

const MAX_MASIVO = 500
const normalizar = (t) => String(t ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ')

// Distancia de edición: cuántas letras hay que cambiar para pasar de un texto a otro.
const distancia = (a, b) => {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[b.length]
}
const umbralParecido = (len) => (len <= 10 ? 1 : 2)
const texto = (v) => { const t = String(v ?? '').trim(); return t || null }

// Registra varios hermanos de una vez. Cada fila se valida por separado: las inválidas
// o repetidas se reportan y no impiden que el resto se guarde.
// Una fila casi igual a un hermano de su comunidad (p. ej. «Martinez»/«Martines») no se
// guarda: vuelve en `posibles` para que el usuario decida y reenvíe la fila con
// `hermanoId` (es la misma persona: se completa su ficha) o `forzarNuevo` (es otra persona).
export const crearHermanosMasivo = async (equipoId, filas) => {
  if (!Array.isArray(filas) || filas.length === 0) {
    throw { status: 400, message: 'No hay filas para registrar', code: 'DATOS_REQUERIDOS' }
  }
  if (filas.length > MAX_MASIVO) {
    throw { status: 400, message: `Máximo ${MAX_MASIVO} filas por carga`, code: 'LIMITE_EXCEDIDO' }
  }

  const [comunidades, existentes] = await Promise.all([
    prisma.comunidad.findMany({ select: { id: true, nombre: true, departamento: true } }),
    prisma.hermano.findMany({ where: { equipoId }, select: { id: true, nombre: true, apellido: true, telefono: true, email: true, notas: true, activo: true, comunidadId: true } }),
  ])
  const porNombre = new Map()
  for (const c of comunidades) {
    const k = normalizar(c.nombre)
    porNombre.set(k, [...(porNombre.get(k) || []), c])
  }
  // El nombre completo se compara junto, para detectar «Ana Cristina»/«Martínez» frente a «Ana»/«Cristina Martínez».
  const clave = (n, a, cid) => `${normalizar(`${n ?? ''} ${a ?? ''}`)}|${cid}`
  const existentesPorClave = new Map(existentes.map((h) => [clave(h.nombre, h.apellido, h.comunidadId), h]))
  const vistos = new Set()

  const validos = []
  const actualizaciones = []
  const posibles = []
  const porId = new Map(existentes.map((h) => [h.id, h]))
  let sinCambios = 0
  const errores = []

  // Completa lo que falte en la ficha existente (sin pisar datos) y la reactiva si estaba inactiva.
  const fusionar = (previo, f, email) => {
    const nuevo = { telefono: texto(f.telefono), email, notas: texto(f.notas) }
    const cambios = {}
    for (const [campo, valor] of Object.entries(nuevo)) if (valor && !previo[campo]) cambios[campo] = valor
    if (!previo.activo) cambios.activo = true
    if (Object.keys(cambios).length) actualizaciones.push({ id: previo.id, cambios })
    else sinCambios++
  }
  filas.forEach((f, i) => {
    const fila = f.fila ?? i + 1
    const nombre = texto(f.nombre)
    const comunidadTxt = texto(f.comunidad)
    if (!nombre) return errores.push({ fila, error: 'Falta el nombre' })
    if (!comunidadTxt) return errores.push({ fila, error: 'Falta la comunidad' })

    const candidatas = porNombre.get(normalizar(comunidadTxt)) || []
    if (candidatas.length === 0) return errores.push({ fila, error: `Comunidad «${comunidadTxt}» no encontrada` })
    if (candidatas.length > 1) return errores.push({ fila, error: `Hay varias comunidades llamadas «${comunidadTxt}»; avisa al administrador` })

    const email = texto(f.email)
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return errores.push({ fila, error: `Email inválido «${email}»` })

    const apellido = texto(f.apellido)
    const k = clave(nombre, apellido, candidatas[0].id)
    if (vistos.has(k)) return errores.push({ fila, error: 'Repetido dentro del mismo archivo' })
    vistos.add(k)

    // Ya registrado con el mismo nombre completo: no se duplica, se fusiona.
    const previo = existentesPorClave.get(k)
    if (previo) return fusionar(previo, f, email)

    // El usuario ya dijo que es la misma persona que un hermano existente.
    if (f.hermanoId != null) {
      const elegido = porId.get(Number(f.hermanoId))
      if (!elegido) return errores.push({ fila, error: 'El hermano elegido ya no existe' })
      return fusionar(elegido, f, email)
    }

    // Nombre muy parecido en la misma comunidad: se pregunta en vez de decidir.
    if (!f.forzarNuevo) {
      const completo = normalizar(`${nombre} ${apellido ?? ''}`)
      const parecido = existentes
        .filter((h) => h.comunidadId === candidatas[0].id)
        .map((h) => ({ h, d: distancia(completo, normalizar(`${h.nombre} ${h.apellido ?? ''}`)) }))
        .filter(({ d }) => d <= umbralParecido(completo.length))
        .sort((x, y) => x.d - y.d)[0]
      if (parecido) {
        return posibles.push({
          fila,
          datos: { nombre, apellido, telefono: texto(f.telefono), email, comunidad: comunidadTxt, notas: texto(f.notas) },
          candidato: { id: parecido.h.id, nombre: parecido.h.nombre, apellido: parecido.h.apellido },
        })
      }
    }

    validos.push({
      nombre: nombre.slice(0, 191),
      apellido: apellido?.slice(0, 191) ?? null,
      telefono: texto(f.telefono)?.slice(0, 191) ?? null,
      email: email?.slice(0, 191) ?? null,
      notas: texto(f.notas),
      comunidadId: candidatas[0].id,
      equipoId,
    })
  })

  if (validos.length) await prisma.hermano.createMany({ data: validos })
  await Promise.all(actualizaciones.map((a) => prisma.hermano.update({ where: { id: a.id }, data: a.cambios })))
  return { creados: validos.length, actualizados: actualizaciones.length, sinCambios, posibles, errores }
}
