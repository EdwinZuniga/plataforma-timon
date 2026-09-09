import api from './client.js'

// Readiness de la base de datos. 200 { warm:true } cuando responde;
// 503 { warm:false, code:'DB_INICIANDO' } mientras Azure SQL reanuda.
export const pingDb = () => api.get('/health/db')
