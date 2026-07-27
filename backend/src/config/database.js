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
