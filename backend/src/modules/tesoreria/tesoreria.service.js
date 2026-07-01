import prisma from '../../config/database.js'

export const listarMovimientos = async (equipoId, { caja, tipo, fechaDesde, fechaHasta, anio } = {}) => {
  const where = {
    equipoId,
    ...(caja && { caja }),
    ...(tipo && { tipo }),
  }

  if (anio) {
    where.fecha = {
      gte: new Date(`${anio}-01-01`),
      lte: new Date(`${anio}-12-31T23:59:59`),
    }
  } else if (fechaDesde || fechaHasta) {
    where.fecha = {
      ...(fechaDesde && { gte: new Date(fechaDesde) }),
      ...(fechaHasta && { lte: new Date(fechaHasta) }),
    }
  }

  return prisma.movimientoTesoreria.findMany({
    where,
    include: {
      responsable: { include: { usuario: { select: { nombre: true } } } },
      actividad: { select: { id: true, nombre: true } },
    },
    orderBy: { fecha: 'desc' },
  })
}

export const resumenTesoreria = async (equipoId, anio) => {
  const anioInt = parseInt(anio)
  const [movimientos, ofrendas] = await Promise.all([
    prisma.movimientoTesoreria.findMany({
      where: {
        equipoId,
        fecha: {
          gte: new Date(`${anioInt}-01-01`),
          lte: new Date(`${anioInt}-12-31T23:59:59`),
        },
      },
    }),
    prisma.ofrendaSemanal.findMany({ where: { equipoId, anio: anioInt } }),
  ])

  const totalOfrendas = ofrendas.reduce((s, o) => s + o.monto, 0)

  const calcular = (caja) => {
    const del = movimientos.filter((m) => m.caja === caja)
    const ingresosMovs = del.filter((m) => m.tipo === 'INGRESO').reduce((s, m) => s + m.monto, 0)
    const egresos = del.filter((m) => m.tipo === 'EGRESO').reduce((s, m) => s + m.monto, 0)
    // Las ofrendas semanales cuentan como ingreso de Caja Chica
    const ingresos = caja === 'CHICA' ? ingresosMovs + totalOfrendas : ingresosMovs
    return { ingresos, egresos, saldo: ingresos - egresos }
  }

  return { general: calcular('GENERAL'), chica: calcular('CHICA') }
}

export const crearMovimiento = async (equipoId, miembroId, data) => {
  return prisma.movimientoTesoreria.create({
    data: {
      equipoId,
      registradoPor: miembroId,
      tipo: data.tipo,
      caja: data.caja,
      concepto: data.concepto,
      categoria: data.categoria || null,
      monto: parseFloat(data.monto),
      fecha: new Date(data.fecha),
      descripcion: data.descripcion || null,
      actividadId: data.actividadId ? parseInt(data.actividadId) : null,
    },
    include: {
      responsable: { include: { usuario: { select: { nombre: true } } } },
    },
  })
}

export const actualizarMovimiento = async (id, equipoId, data) => {
  const existe = await prisma.movimientoTesoreria.findFirst({ where: { id, equipoId } })
  if (!existe) throw { status: 404, message: 'Movimiento no encontrado', code: 'NOT_FOUND' }

  return prisma.movimientoTesoreria.update({
    where: { id },
    data: {
      ...(data.tipo && { tipo: data.tipo }),
      ...(data.caja && { caja: data.caja }),
      ...(data.concepto && { concepto: data.concepto }),
      categoria: data.categoria ?? existe.categoria,
      ...(data.monto !== undefined && { monto: parseFloat(data.monto) }),
      ...(data.fecha && { fecha: new Date(data.fecha) }),
      descripcion: data.descripcion ?? existe.descripcion,
      actividadId: data.actividadId !== undefined ? (data.actividadId ? parseInt(data.actividadId) : null) : existe.actividadId,
    },
  })
}

export const eliminarMovimiento = async (id, equipoId) => {
  const existe = await prisma.movimientoTesoreria.findFirst({ where: { id, equipoId } })
  if (!existe) throw { status: 404, message: 'Movimiento no encontrado', code: 'NOT_FOUND' }
  return prisma.movimientoTesoreria.delete({ where: { id } })
}

// ─── Ofrendas semanales ─────────────────────────────────────────────────────

export const listarOfrendas = async (equipoId, anio) => {
  return prisma.ofrendaSemanal.findMany({
    where: { equipoId, anio: parseInt(anio) },
    include: {
      miembro: { include: { usuario: { select: { id: true, nombre: true } } } },
    },
    orderBy: [{ miembroId: 'asc' }, { fecha: 'asc' }],
  })
}

export const registrarOfrendas = async (equipoId, miembroId, fechas, monto = 1) => {
  const results = []
  for (const f of fechas) {
    // new Date("2026-01-03") → UTC medianoche → fechaKey() en el frontend usa getters UTC → sin desfase
    const fecha = new Date(f)
    const anio = fecha.getUTCFullYear()
    const r = await prisma.ofrendaSemanal.upsert({
      where: { miembroId_fecha: { miembroId, fecha } },
      create: { equipoId, miembroId, fecha, monto: parseFloat(monto), anio },
      update: { monto: parseFloat(monto) },
    })
    results.push(r)
  }
  return results
}

export const eliminarOfrenda = async (id, equipoId) => {
  const existe = await prisma.ofrendaSemanal.findFirst({ where: { id, equipoId } })
  if (!existe) throw { status: 404, message: 'Ofrenda no encontrada', code: 'NOT_FOUND' }
  return prisma.ofrendaSemanal.delete({ where: { id } })
}
