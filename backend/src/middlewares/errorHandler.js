import { RETRYABLE_CODES } from '../config/database.js'

// La base de datos (Azure SQL serverless) se autopausa por inactividad; al
// reanudar puede tardar más que los reintentos de database.js, y el primer
// intento del usuario recibe el error crudo de Prisma. Lo traducimos a un
// mensaje entendible en vez de exponer el detalle técnico.
const isDbWakingUp = (err) => RETRYABLE_CODES.includes(err.code) || err.name === 'PrismaClientInitializationError'

export const errorHandler = (err, req, res, next) => {
  if (isDbWakingUp(err)) {
    return res.status(503).json({
      success: false,
      error: 'El sistema se está iniciando, esto puede tardar unos segundos. Por favor intenta de nuevo.',
      code: 'DB_INICIANDO',
    })
  }

  const status = err.status || 500
  const message = err.message || 'Error interno del servidor'
  const code = err.code || 'ERROR_INTERNO'

  if (process.env.NODE_ENV === 'development' && status === 500) {
    console.error(err)
  }

  res.status(status).json({ success: false, error: message, code })
}
