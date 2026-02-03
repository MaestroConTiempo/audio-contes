const AUTH_ERROR_DICTIONARY: Array<[needle: string, translated: string]> = [
  ['invalid login credentials', 'Email o contrasena incorrectos.'],
  ['email not confirmed', 'Debes confirmar tu email antes de iniciar sesion.'],
  ['user already registered', 'Este email ya esta registrado.'],
  ['signup is disabled', 'El registro de nuevos usuarios esta desactivado.'],
  ['signups not allowed for this instance', 'El registro de nuevos usuarios esta desactivado.'],
  ['password should be at least', 'La contrasena no cumple el minimo de seguridad.'],
  ['weak password', 'La contrasena es demasiado debil. Usa una mas segura.'],
  ['new password should be different from the old password', 'La nueva contrasena debe ser diferente a la anterior.'],
  ['same password', 'La nueva contrasena debe ser diferente a la anterior.'],
  ['token has expired', 'El enlace ha expirado. Solicita uno nuevo.'],
  ['expired', 'El enlace ha expirado. Solicita uno nuevo.'],
  ['invalid token', 'El enlace no es valido. Solicita uno nuevo.'],
  ['otp expired', 'El codigo o enlace ha expirado. Solicita uno nuevo.'],
  ['otp code is invalid', 'El codigo no es valido. Vuelve a intentarlo.'],
  ['flow state not found', 'El enlace no es valido o ya fue usado. Solicita uno nuevo.'],
  ['auth session missing', 'Tu sesion de recuperacion no es valida. Solicita un enlace nuevo.'],
  ['session not found', 'No se encontro una sesion valida. Vuelve a iniciar el proceso.'],
  ['too many requests', 'Demasiados intentos. Espera un momento y prueba otra vez.'],
  ['rate limit', 'Demasiados intentos. Espera un momento y prueba otra vez.'],
  ['network request failed', 'No se pudo conectar. Revisa tu conexion e intenta de nuevo.'],
];

export const translateSupabaseAuthError = (message: string) => {
  const normalized = message.toLowerCase();

  for (const [needle, translated] of AUTH_ERROR_DICTIONARY) {
    if (normalized.includes(needle)) {
      return translated;
    }
  }

  return 'No se pudo completar la autenticacion. Intenta nuevamente.';
};
