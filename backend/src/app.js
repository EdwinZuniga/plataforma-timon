import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import path from 'path'
import { fileURLToPath } from 'url'

import { errorHandler } from './middlewares/errorHandler.js'
import { pingDb } from './config/database.js'
import adminRoutes from './modules/admin/admin.routes.js'
import authRoutes from './modules/auth/auth.routes.js'
import equiposRoutes from './modules/equipos/equipos.routes.js'
import comunidadesRoutes from './modules/comunidades/comunidades.routes.js'
import hermanosRoutes from './modules/hermanos/hermanos.routes.js'
import talleresRoutes from './modules/talleres/talleres.routes.js'
import inscripcionesRoutes from './modules/talleres/inscripciones.routes.js'
import actividadesRoutes from './modules/actividades/actividades.routes.js'
import serviciosRoutes from './modules/servicios/servicios.routes.js'
import reunionesRoutes from './modules/reuniones/reuniones.routes.js'
import acuerdosRoutes from './modules/reuniones/acuerdos.routes.js'
import ocrRoutes from './modules/ocr/ocr.routes.js'
import dashboardRoutes from './modules/dashboard/dashboard.routes.js'
import tesoreriaRoutes from './modules/tesoreria/tesoreria.routes.js'
import inventarioRoutes from './modules/inventario/inventario.routes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true)
    const allowed = (process.env.CORS_ORIGIN || '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean)
    if (allowed.includes(origin)) return callback(null, true)
    callback(new Error(`CORS: origen no permitido → ${origin}`))
  },
  credentials: true,
}))
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

// Sirve el frontend compilado (solo en producción o cuando existe la carpeta)
const FRONTEND_DIST = path.join(__dirname, '../public')
app.use(express.static(FRONTEND_DIST))

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Readiness de la base de datos. El frontend lo sondea antes de enviar
// credenciales; la primera petición despierta a Azure SQL desde auto-pause.
app.get('/api/health/db', async (req, res) => {
  const warm = await pingDb()
  if (warm) return res.json({ warm: true })
  res.status(503).json({ warm: false, code: 'DB_INICIANDO' })
})

app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/equipos', equiposRoutes)

app.use('/api/equipos/:equipoId/comunidades', comunidadesRoutes)
app.use('/api/equipos/:equipoId/hermanos', hermanosRoutes)
app.use('/api/equipos/:equipoId/talleres', talleresRoutes)
app.use('/api/equipos/:equipoId', inscripcionesRoutes)
app.use('/api/equipos/:equipoId/actividades', actividadesRoutes)
app.use('/api/equipos/:equipoId/servicios', serviciosRoutes)
app.use('/api/equipos/:equipoId/reuniones', reunionesRoutes)
app.use('/api/equipos/:equipoId', acuerdosRoutes)
app.use('/api/equipos/:equipoId/ocr', ocrRoutes)
app.use('/api/equipos/:equipoId/dashboard', dashboardRoutes)
app.use('/api/equipos/:equipoId/tesoreria', tesoreriaRoutes)
app.use('/api/equipos/:equipoId/inventario', inventarioRoutes)

// SPA catch-all: cualquier ruta que no sea /api la atiende el frontend
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next()
  res.sendFile(path.join(FRONTEND_DIST, 'index.html'), (err) => {
    if (err) next() // si no existe el dist (dev local), deja pasar
  })
})

app.use(errorHandler)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`)
})

export default app
