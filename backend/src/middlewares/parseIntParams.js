const INT_PARAMS = ['id', 'edicionId', 'miembroId', 'actividadId', 'servicioId', 'comunidadId', 'hermanoId', 'inscripcionId', 'acuerdoId', 'equipoId']

export const registerIntParams = (router) => {
  INT_PARAMS.forEach(param => {
    router.param(param, (req, res, next, val) => {
      req.params[param] = parseInt(val)
      next()
    })
  })
}
