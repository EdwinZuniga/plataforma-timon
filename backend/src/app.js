import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import path from 'path'
import { fileURLToPath } from 'url'

import { errorHandler } from './middlewares/errorHandler.js'
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

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? (process.env.CORS_ORIGIN || '').split(',').map((o) => o.trim())
  : null // En desarrollo, cualquier localhost está permitido

app.use(cors({
  origin: (origin, callback) => {
    // Permitir peticiones sin origin (Postman, curl, apps móviles)
    if (!origin) return callback(null, true)
    // En desarrollo, aceptar cualquier localhost (cualquier puerto)
    if (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost(:\d+)?$/.test(origin)) {
      return callback(null, true)
    }
    // En producción, verificar lista de orígenes permitidos
    if (allowedOrigins && allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    callback(new Error(`CORS: origen no permitido → ${origin}`))
  },
  credentials: true,
}))
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))


app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
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

app.use(errorHandler)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`)
})

export default app
