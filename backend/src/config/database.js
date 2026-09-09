import { PrismaClient } from '@prisma/client'

// P1001/P1002: no se pudo alcanzar el servidor (típico en el primer intento
// tras inactividad, cuando Azure SQL serverless aún está reanudando desde
// auto-pause). Reintentamos con backoff en vez de fallar la petición.
export const RETRYABLE_CODES = ['P1001', 'P1002', 'P1017']
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1500

const basePrisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
})

// Sonda rápida para el endpoint de readiness (/api/health/db). Usa el cliente
// base (sin los reintentos largos del $extends) y un timeout corto, para que el
// frontend pueda sondear cada pocos segundos mientras anima la espera. La propia
// consulta despierta a Azure SQL si está en auto-pause.
export const pingDb = async ({ timeoutMs = 4000 } = {}) => {
  // Evita que un rechazo tardío de la consulta quede sin manejar tras el timeout.
  const consulta = basePrisma.$queryRaw`SELECT 1`.then(() => true, () => false)
  const timeout = new Promise((resolve) => setTimeout(() => resolve(false), timeoutMs))
  return Promise.race([consulta, timeout])
}

const prisma = basePrisma.$extends({
  query: {
    async $allOperations({ args, query }) {
      let attempt = 0
      for (;;) {
        try {
          return await query(args)
        } catch (err) {
          if (!RETRYABLE_CODES.includes(err.code) || attempt >= MAX_RETRIES) throw err
          attempt++
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt))
        }
      }
    },
  },
})

export default prisma
