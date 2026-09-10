import bcrypt from 'bcryptjs'
import prisma from '../../config/database.js'

const generarContrasenaTemp = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return 'Timon-' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// Usuarios administrativos globales que no deben pertenecer a ningún equipo.
export const NOMBRE_USUARIO_GLOBAL = 'Administrador'

// Datos que necesita la ficha del miembro (Equipos) y "Mi perfil". Incluye los
// ids necesarios para que cada elemento sea un acceso directo a su pantalla.
const PERFIL_INCLUDE = {
  usuario: { select: { id: true, nombre: true, email: true } },
  comunidadOrigen: { select: { id: true, numero: true, nombre: true, departamento: true, estado: true } },
  comunidades: {
    select: { id: true, numero: true, nombre: true, departamento: true, estado: true },
    orderBy: { nombre: 'asc' },
  },
  edicionesCoordinadas: {
    include: { taller: { select: { id: true, nombre: true } } },
    orderBy: { fecha: 'desc' },
  },
  equipoApoyoEdiciones: {
    include: {
      edicion: { include: { taller: { select: { id: true, nombre: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  },
  temasMesExpuestos: {
    include: {
      edicion: { include: { taller: { select: { id: true, nombre: true } } } },
    },
    orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
  },
  serviciosAsignados: {
    include: {
      servicioActividad: {
        include: {
          actividad: { select: { id: true, nombre: true, fecha: true, tipo: true } },
          catalogoServicio: { select: { nombre: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  },
}

// Resumen de ofrendas de un miembro: total, nº de entregas y desglose por año.
const resumenOfrenda = async (miembroId) => {
  const [agg, porAnio] = await Promise.all([
    prisma.ofrendaSemanal.aggregate({ where: { miembroId }, _sum: { monto: true }, _count: true }),
    prisma.ofrendaSemanal.groupBy({
      by: ['anio'],
      where: { miembroId },
      _sum: { monto: true },
      orderBy: { anio: 'desc' },
    }),
  ])
  return {
    total: agg._sum.monto ?? 0,
    entregas: agg._count,
    porAnio: porAnio.map((o) => ({ anio: o.anio, total: o._sum.monto ?? 0 })),
  }
}

export const listarEquipos = async (usuarioId) => {
  const membresias = await prisma.miembroEquipo.findMany({
    where: { usuarioId, activo: true },
    include: { equipo: true },
  })
  return membresias.map((m) => m.equipo)
}

export const crearEquipo = async (data, usuarioId) => {
  const equipo = await prisma.equipoTimon.create({ data })
  await prisma.miembroEquipo.create({
    data: { usuarioId, equipoId: equipo.id, rol: 'COORDINADOR' },
  })
  return equipo
}

export const obtenerEquipo = async (equipoId) => {
  const equipo = await prisma.equipoTimon.findUnique({ where: { id: equipoId } })
  if (!equipo) throw { status: 404, message: 'Equipo no encontrado', code: 'EQUIPO_NO_ENCONTRADO' }
  return equipo
}

export const actualizarEquipo = async (equipoId, data) => {
  return prisma.equipoTimon.update({ where: { id: equipoId }, data })
}

export const listarMiembros = async (equipoId) => {
  return prisma.miembroEquipo.findMany({
    where: { equipoId, usuario: { nombre: { not: NOMBRE_USUARIO_GLOBAL } } },
    include: {
      usuario: { select: { id: true, nombre: true, email: true } },
      comunidadOrigen: { select: { id: true, nombre: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
}

export const agregarMiembro = async (equipoId, email, rol, nombreCorto, nombre) => {
  let usuario = await prisma.usuario.findUnique({ where: { email } })
  let usuarioCreado = false
  let contrasenaTemp = null

  if ((usuario?.nombre ?? nombre) === NOMBRE_USUARIO_GLOBAL) {
    throw { status: 400, message: 'Los usuarios administrativos globales no pueden pertenecer a un equipo', code: 'USUARIO_GLOBAL' }
  }

  if (!usuario) {
    if (!nombre) throw { status: 400, message: 'El usuario no tiene cuenta. Proporciona su nombre completo para crearle acceso.', code: 'NOMBRE_REQUERIDO' }
    contrasenaTemp = generarContrasenaTemp()
    const passwordHash = await bcrypt.hash(contrasenaTemp, 10)
    usuario = await prisma.usuario.create({ data: { nombre, email, passwordHash } })
    usuarioCreado = true
  }

  const existente = await prisma.miembroEquipo.findUnique({
    where: { usuarioId_equipoId: { usuarioId: usuario.id, equipoId } },
  })
  if (existente) {
    await prisma.miembroEquipo.update({
      where: { id: existente.id },
      data: { rol, nombreCorto, activo: true },
    })
  } else {
    await prisma.miembroEquipo.create({ data: { usuarioId: usuario.id, equipoId, rol, nombreCorto } })
  }

  return { usuarioCreado, contrasenaTemp, email }
}

export const actualizarMiembro = async (miembroId, {
  rol, nombreCorto, activo, nombre, email,
  nombreCompleto, telefono, direccion, profesion, fechaNacimiento, ingresoETJ, comunidadOrigenId,
}) => {
  const fecha = (v) => (v ? new Date(v) : null)
  return prisma.$transaction(async (tx) => {
    const miembro = await tx.miembroEquipo.update({
      where: { id: miembroId },
      data: {
        ...(rol !== undefined && { rol }),
        ...(nombreCorto !== undefined && { nombreCorto }),
        ...(activo !== undefined && { activo }),
        ...(nombreCompleto !== undefined && { nombreCompleto: nombreCompleto || null }),
        ...(telefono !== undefined && { telefono: telefono || null }),
        ...(direccion !== undefined && { direccion: direccion || null }),
        ...(profesion !== undefined && { profesion: profesion || null }),
        ...(fechaNacimiento !== undefined && { fechaNacimiento: fecha(fechaNacimiento) }),
        ...(ingresoETJ !== undefined && { ingresoETJ: fecha(ingresoETJ) }),
        ...(comunidadOrigenId !== undefined && { comunidadOrigenId: comunidadOrigenId ? Number(comunidadOrigenId) : null }),
      },
      include: { usuario: { select: { id: true } } },
    })
    if (nombre !== undefined || email !== undefined) {
      await tx.usuario.update({
        where: { id: miembro.usuario.id },
        data: {
          ...(nombre !== undefined && { nombre }),
          ...(email !== undefined && { email }),
        },
      })
    }
    return miembro
  })
}

export const desactivarMiembro = async (miembroId) => {
  return prisma.miembroEquipo.update({ where: { id: miembroId }, data: { activo: false } })
}

export const obtenerMiPerfil = async (miembroId, equipoId) => {
  const miembro = await prisma.miembroEquipo.findUnique({
    where: { id: miembroId },
    include: PERFIL_INCLUDE,
  })

  if (!miembro) throw { status: 404, message: 'Miembro no encontrado', code: 'MIEMBRO_NO_ENCONTRADO' }

  // Acuerdos pendientes: texto libre, busca por nombre y nombreCorto
  const nombresParaBuscar = [miembro.usuario.nombre]
  if (miembro.nombreCorto) nombresParaBuscar.push(miembro.nombreCorto)

  const acuerdosPendientes = await prisma.acuerdo.findMany({
    where: {
      cumplido: false,
      reunion: { equipoId },
      OR: nombresParaBuscar.map((n) => ({ responsable: { contains: n } })),
    },
    include: {
      reunion: { select: { id: true, titulo: true, fecha: true } },
    },
    orderBy: { reunion: { fecha: 'desc' } },
  })

  // Comisiones: JSON guardado en Reunion.comisiones
  const reunionesConComisiones = await prisma.reunion.findMany({
    where: { equipoId, comisiones: { not: null } },
    select: { id: true, titulo: true, fecha: true, comisiones: true },
    orderBy: { fecha: 'desc' },
  })

  const comisionesDelMiembro = []
  for (const reunion of reunionesConComisiones) {
    try {
      const parsed = JSON.parse(reunion.comisiones)
      for (const comision of parsed) {
        if (nombresParaBuscar.some((n) => comision.miembros?.includes(n))) {
          comisionesDelMiembro.push({
            reunionId: reunion.id,
            reunionTitulo: reunion.titulo,
            reunionFecha: reunion.fecha,
            comision: comision.nombre,
          })
        }
      }
    } catch {}
  }

  return {
    ...miembro,
    acuerdosPendientes,
    comisionesDelMiembro,
    ofrenda: await resumenOfrenda(miembroId),
  }
}

export const obtenerPerfilMiembro = async (miembroId) => {
  const miembro = await prisma.miembroEquipo.findUnique({
    where: { id: miembroId },
    include: PERFIL_INCLUDE,
  })

  if (!miembro) throw { status: 404, message: 'Miembro no encontrado', code: 'MIEMBRO_NO_ENCONTRADO' }
  return { ...miembro, ofrenda: await resumenOfrenda(miembroId) }
}
