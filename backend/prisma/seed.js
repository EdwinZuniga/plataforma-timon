import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Ejecutando seed...')

  // Equipo
  let equipo = await prisma.equipoTimon.findFirst({ where: { nombre: 'Jóvenes' } })
  if (!equipo) {
    equipo = await prisma.equipoTimon.create({
      data: { nombre: 'Jóvenes', descripcion: 'Equipo Timón de Jóvenes', color: '#6D28D9' },
    })
  }
  console.log(`✅ Equipo: ${equipo.nombre} (id=${equipo.id})`)

  // Usuario admin
  const passwordHash = await bcrypt.hash('Admin2026!', 10)
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@renovacion.org' },
    update: {},
    create: { nombre: 'Administrador', email: 'admin@renovacion.org', passwordHash },
  })
  console.log(`✅ Usuario: ${admin.email} (id=${admin.id})`)

  // Membresía coordinador
  await prisma.miembroEquipo.upsert({
    where: { usuarioId_equipoId: { usuarioId: admin.id, equipoId: equipo.id } },
    update: {},
    create: { usuarioId: admin.id, equipoId: equipo.id, rol: 'COORDINADOR', nombreCorto: 'Admin' },
  })
  console.log('✅ Membresía de coordinador creada')

  // Comunidades de ejemplo
  const comunidades = [
    { nombre: 'Comunidad Espíritu Santo', departamento: 'San Salvador', numero: 'C-001' },
    { nombre: 'Comunidad Santa María', departamento: 'San Salvador', numero: 'C-002' },
    { nombre: 'Comunidad Cristo Vive', departamento: 'La Libertad', numero: 'C-003' },
  ]
  for (const c of comunidades) {
    const existe = await prisma.comunidad.findFirst({ where: { nombre: c.nombre, equipoId: equipo.id } })
    if (!existe) {
      await prisma.comunidad.create({ data: { ...c, equipoId: equipo.id, estado: 'ACTIVA' } })
    }
  }
  console.log('✅ Comunidades de ejemplo creadas')

  // Talleres
  const talleres = ['Formación Inicial', 'Discipulado Avanzado', 'Liderazgo Juvenil']
  for (const nombre of talleres) {
    const existe = await prisma.taller.findFirst({ where: { nombre, equipoId: equipo.id } })
    if (!existe) await prisma.taller.create({ data: { nombre, equipoId: equipo.id } })
  }
  console.log('✅ Talleres de ejemplo creados')

  // Catálogo de servicios
  const servicios = ['Alabanza', 'Ujieres', 'Logística', 'Cocina', 'Registro']
  for (const nombre of servicios) {
    const existe = await prisma.catalogoServicio.findFirst({ where: { nombre, equipoId: equipo.id } })
    if (!existe) await prisma.catalogoServicio.create({ data: { nombre, equipoId: equipo.id } })
  }
  console.log('✅ Catálogo de servicios creado')

  console.log('\n🎉 Seed completado exitosamente!')
  console.log('─'.repeat(50))
  console.log('📧 Email:    admin@renovacion.org')
  console.log('🔑 Password: Admin2026!')
  console.log('─'.repeat(50))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
