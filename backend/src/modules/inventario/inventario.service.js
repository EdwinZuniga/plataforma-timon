import prisma from '../../config/database.js'

// ─── Artículos ───────────────────────────────────────────────────────────────

export const listarArticulos = async (equipoId, { busqueda, categoria } = {}) => {
  const articulos = await prisma.articulo.findMany({
    where: {
      equipoId,
      activo: true,
      ...(categoria && { categoria }),
      ...(busqueda && { nombre: { contains: busqueda } }),
    },
    include: {
      prestamos: {
        where: { estado: 'PRESTADO' },
        select: { cantidadPrestada: true },
      },
    },
    orderBy: { nombre: 'asc' },
  })

  return articulos.map((a) => {
    const cantidadPrestada = a.prestamos.reduce((s, p) => s + p.cantidadPrestada, 0)
    return { ...a, cantidadPrestada, cantidadDisponible: a.cantidad - cantidadPrestada }
  })
}

export const obtenerArticulo = async (id, equipoId) => {
  const a = await prisma.articulo.findFirst({
    where: { id, equipoId },
    include: {
      prestamos: {
        include: {
          responsable: { include: { usuario: { select: { nombre: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
  if (!a) throw { status: 404, message: 'Artículo no encontrado', code: 'NOT_FOUND' }
  const cantidadPrestada = a.prestamos.filter((p) => p.estado === 'PRESTADO').reduce((s, p) => s + p.cantidadPrestada, 0)
  return { ...a, cantidadPrestada, cantidadDisponible: a.cantidad - cantidadPrestada }
}

export const crearArticulo = async (equipoId, data) => {
  return prisma.articulo.create({
    data: {
      equipoId,
      nombre: data.nombre,
      descripcion: data.descripcion || null,
      categoria: data.categoria || null,
      cantidad: parseInt(data.cantidad) || 1,
      condicion: data.condicion || 'BUENO',
      ubicacion: data.ubicacion || null,
      notas: data.notas || null,
    },
  })
}

export const actualizarArticulo = async (id, equipoId, data) => {
  const existe = await prisma.articulo.findFirst({ where: { id, equipoId } })
  if (!existe) throw { status: 404, message: 'Artículo no encontrado', code: 'NOT_FOUND' }
  return prisma.articulo.update({
    where: { id },
    data: {
      ...(data.nombre && { nombre: data.nombre }),
      descripcion: data.descripcion ?? existe.descripcion,
      categoria: data.categoria ?? existe.categoria,
      ...(data.cantidad !== undefined && { cantidad: parseInt(data.cantidad) }),
      ...(data.condicion && { condicion: data.condicion }),
      ubicacion: data.ubicacion ?? existe.ubicacion,
      notas: data.notas ?? existe.notas,
      ...(data.activo !== undefined && { activo: data.activo }),
    },
  })
}

export const eliminarArticulo = async (id, equipoId) => {
  const existe = await prisma.articulo.findFirst({ where: { id, equipoId } })
  if (!existe) throw { status: 404, message: 'Artículo no encontrado', code: 'NOT_FOUND' }
  const prestadoActivo = await prisma.prestamoArticulo.findFirst({ where: { articuloId: id, estado: 'PRESTADO' } })
  if (prestadoActivo) throw { status: 400, message: 'No se puede eliminar un artículo con préstamos activos', code: 'TIENE_PRESTAMOS' }
  return prisma.articulo.update({ where: { id }, data: { activo: false } })
}

export const listarCategorias = async (equipoId) => {
  const result = await prisma.articulo.findMany({
    where: { equipoId, activo: true, categoria: { not: null } },
    select: { categoria: true },
    distinct: ['categoria'],
    orderBy: { categoria: 'asc' },
  })
  return result.map((r) => r.categoria).filter(Boolean)
}

// ─── Préstamos ───────────────────────────────────────────────────────────────

export const listarPrestamos = async (equipoId, { estado } = {}) => {
  return prisma.prestamoArticulo.findMany({
    where: {
      equipoId,
      ...(estado && { estado }),
    },
    include: {
      articulo: { select: { id: true, nombre: true, categoria: true } },
      responsable: { include: { usuario: { select: { nombre: true } } } },
    },
    orderBy: [{ estado: 'asc' }, { fechaEsperada: 'asc' }, { createdAt: 'desc' }],
  })
}

export const crearPrestamo = async (equipoId, miembroId, data) => {
  const articulo = await prisma.articulo.findFirst({
    where: { id: parseInt(data.articuloId), equipoId, activo: true },
    include: { prestamos: { where: { estado: 'PRESTADO' }, select: { cantidadPrestada: true } } },
  })
  if (!articulo) throw { status: 404, message: 'Artículo no encontrado', code: 'NOT_FOUND' }

  const prestada = articulo.prestamos.reduce((s, p) => s + p.cantidadPrestada, 0)
  const disponible = articulo.cantidad - prestada
  const cantidad = parseInt(data.cantidadPrestada) || 1
  if (cantidad > disponible) {
    throw { status: 400, message: `Solo hay ${disponible} unidad(es) disponible(s)`, code: 'SIN_STOCK' }
  }

  return prisma.prestamoArticulo.create({
    data: {
      equipoId,
      articuloId: parseInt(data.articuloId),
      registradoPor: miembroId,
      cantidadPrestada: cantidad,
      prestadoA: data.prestadoA,
      contacto: data.contacto || null,
      fechaPrestamo: new Date(data.fechaPrestamo),
      fechaEsperada: data.fechaEsperada ? new Date(data.fechaEsperada) : null,
      notas: data.notas || null,
    },
    include: { articulo: { select: { nombre: true } } },
  })
}

export const registrarDevolucion = async (id, equipoId, notasDevolucion) => {
  const prestamo = await prisma.prestamoArticulo.findFirst({ where: { id, equipoId } })
  if (!prestamo) throw { status: 404, message: 'Préstamo no encontrado', code: 'NOT_FOUND' }
  if (prestamo.estado === 'DEVUELTO') throw { status: 400, message: 'Este préstamo ya fue devuelto', code: 'YA_DEVUELTO' }
  return prisma.prestamoArticulo.update({
    where: { id },
    data: { estado: 'DEVUELTO', fechaDevolucion: new Date(), notasDevolucion: notasDevolucion || null },
  })
}

export const actualizarPrestamo = async (id, equipoId, data) => {
  const existe = await prisma.prestamoArticulo.findFirst({ where: { id, equipoId } })
  if (!existe) throw { status: 404, message: 'Préstamo no encontrado', code: 'NOT_FOUND' }
  return prisma.prestamoArticulo.update({
    where: { id },
    data: {
      ...(data.prestadoA && { prestadoA: data.prestadoA }),
      contacto: data.contacto ?? existe.contacto,
      ...(data.fechaEsperada !== undefined && { fechaEsperada: data.fechaEsperada ? new Date(data.fechaEsperada) : null }),
      notas: data.notas ?? existe.notas,
    },
  })
}

export const eliminarPrestamo = async (id, equipoId) => {
  const existe = await prisma.prestamoArticulo.findFirst({ where: { id, equipoId } })
  if (!existe) throw { status: 404, message: 'Préstamo no encontrado', code: 'NOT_FOUND' }
  return prisma.prestamoArticulo.delete({ where: { id } })
}

export const resumenInventario = async (equipoId) => {
  const hoy = new Date()
  const [articulos, prestamosActivos, vencidos] = await Promise.all([
    prisma.articulo.count({ where: { equipoId, activo: true } }),
    prisma.prestamoArticulo.count({ where: { equipoId, estado: 'PRESTADO' } }),
    prisma.prestamoArticulo.count({ where: { equipoId, estado: 'PRESTADO', fechaEsperada: { lt: hoy, not: null } } }),
  ])
  return { articulos, prestamosActivos, vencidos }
}
