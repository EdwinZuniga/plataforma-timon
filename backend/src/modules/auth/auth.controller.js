import * as svc from './auth.service.js'

const isProd = process.env.NODE_ENV === 'production'

// En producción el frontend (Vercel) y el backend (Azure) son dominios distintos,
// por lo que la cookie debe viajar cross-site: sameSite 'none' exige secure true.
const COOKIE_OPTS = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
}

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return next({ status: 400, message: 'Email y contraseña requeridos', code: 'DATOS_REQUERIDOS' })
    }
    const { usuario, accessToken, refreshToken } = await svc.loginService(email, password)
    res.cookie('refreshToken', refreshToken, COOKIE_OPTS)
    res.json({ success: true, data: { usuario, accessToken } })
  } catch (err) {
    next(err)
  }
}

export const refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken
    const { usuario, accessToken, refreshToken } = await svc.refreshService(token)
    res.cookie('refreshToken', refreshToken, COOKIE_OPTS)
    res.json({ success: true, data: { usuario, accessToken } })
  } catch (err) {
    next(err)
  }
}

export const logout = async (req, res, next) => {
  try {
    await svc.logoutService(req.cookies?.refreshToken)
    res.clearCookie('refreshToken')
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

export const me = async (req, res, next) => {
  try {
    const data = await svc.meService(req.usuario.id)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export const cambiarContrasena = async (req, res, next) => {
  try {
    const { contrasenaActual, contrasenaNueva } = req.body
    if (!contrasenaActual || !contrasenaNueva) {
      return next({ status: 400, message: 'Contraseña actual y nueva son requeridas', code: 'DATOS_REQUERIDOS' })
    }
    if (contrasenaNueva.length < 6) {
      return next({ status: 400, message: 'La nueva contraseña debe tener al menos 6 caracteres', code: 'CONTRASENA_CORTA' })
    }
    await svc.cambiarContrasenaService(req.usuario.id, contrasenaActual, contrasenaNueva)
    res.json({ success: true, message: 'Contraseña actualizada correctamente' })
  } catch (err) {
    next(err)
  }
}

export const misEquipos = async (req, res, next) => {
  try {
    const data = await svc.misEquiposService(req.usuario.id)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}
