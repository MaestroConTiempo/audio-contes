const AUTH_ERROR_DICTIONARY: Array<[needle: string, translated: string]> = [
  ['invalid login credentials', 'Email o contraseña incorrectos.'],
  ['email not confirmed', 'Debes confirmar tu email antes de iniciar sesión.'],
  ['user already registered', 'Este email ya está registrado.'],
  ['signup is disabled', 'El registro de nuevos usuarios está desactivado.'],
  ['signups not allowed for this instance', 'El registro de nuevos usuarios está desactivado.'],
  ['password should be at least', 'La contraseña no cumple el mínimo de seguridad.'],
  ['weak password', 'La contraseña es demasiado débil. Usa una más segura.'],
  ['new password should be different from the old password', 'La nueva contraseña debe ser diferente a la anterior.'],
  ['same password', 'La nueva contraseña debe ser diferente a la anterior.'],
  ['token has expired', 'El enlace ha expirado. Solicita uno nuevo.'],
  ['expired', 'El enlace ha expirado. Solicita uno nuevo.'],
  ['invalid token', 'El enlace no es válido. Solicita uno nuevo.'],
  ['otp expired', 'El código o enlace ha expirado. Solicita uno nuevo.'],
  ['otp code is invalid', 'El código no es válido. Vuelve a intentarlo.'],
  ['flow state not found', 'El enlace no es válido o ya fue usado. Solicita uno nuevo.'],
  ['auth session missing', 'Tu sesión de recuperación no es válida. Solicita un enlace nuevo.'],
  ['session not found', 'No se encontró una sesión válida. Vuelve a iniciar el proceso.'],
  ['too many requests', 'Demasiados intentos. Espera un momento y prueba otra vez.'],
  ['rate limit', 'Demasiados intentos. Espera un momento y prueba otra vez.'],
  ['network request failed', 'No se pudo conectar. Revisa tu conexión e intenta de nuevo.'],
];

export const translateSupabaseAuthError = (message: string) => {
  const normalized = message.toLowerCase();

  for (const [needle, translated] of AUTH_ERROR_DICTIONARY) {
    if (normalized.includes(needle)) {
      return translated;
    }
  }

  return 'No se pudo completar la autenticación. Intenta nuevamente.';
};
