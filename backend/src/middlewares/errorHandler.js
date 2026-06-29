export const errorHandler = (err, req, res, next) => {
  const status = err.status || 500
  const message = err.message || 'Error interno del servidor'
  const code = err.code || 'ERROR_INTERNO'

  if (process.env.NODE_ENV === 'development' && status === 500) {
    console.error(err)
  }

  res.status(status).json({ success: false, error: message, code })
}
