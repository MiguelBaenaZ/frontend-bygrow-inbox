import { ApiError } from '@/lib/api'

export function getErrorCode(error: unknown): string | null {
  return error instanceof ApiError ? error.code : null
}

export function getErrorMessage(
  error: unknown,
  fallback = 'No se pudo completar la acción. Inténtalo de nuevo.',
): string {
  if (!(error instanceof ApiError)) return fallback

  if (error.status === 403) return 'No tienes permiso para esta acción'
  if (error.status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.'
  if (error.status === 429) return 'Demasiadas solicitudes. Espera un momento.'

  switch (error.code) {
    case 'window_closed':
      return 'La ventana de 24 h está cerrada'
    case 'opt_out':
      return 'El contacto pidió no recibir mensajes'
    case 'opt_in_required':
      return 'Necesitas registrar el opt-in del contacto antes de enviar esta plantilla'
    case 'marketing_opt_in_required':
      return 'Este contacto no tiene opt-in para mensajes de marketing'
    default:
      break
  }

  if (error.status >= 500 || error.status === 0) {
    return fallback
  }

  return error.message || fallback
}

export function getLoginErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'No se pudo iniciar sesión. Inténtalo de nuevo.'
  }
  if (error.status === 401) return 'Correo o contraseña incorrectos'
  if (error.status === 429) return 'Demasiados intentos. Espera 15 minutos'
  if (error.status === 400) return 'Revisa el correo y la contraseña'
  if (error.status === 0) {
    return 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.'
  }
  return 'No se pudo iniciar sesión. Inténtalo de nuevo.'
}

export function getFormError(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return error.message || fallback
  }
  return fallback
}
