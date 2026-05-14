const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase()
}

export function usernameToEmail(username: string): string {
  return `${normalizeUsername(username)}@figuritas.local`
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function isEmailIdentifier(value: string): boolean {
  return EMAIL_PATTERN.test(normalizeEmail(value))
}

export function validateRecoveryEmail(value: string): string | null {
  const email = normalizeEmail(value)
  if (!email) return null
  if (!EMAIL_PATTERN.test(email)) return 'El mail no parece valido.'
  if (email.endsWith('@figuritas.local')) return 'Usa un mail real para recuperar la contrasena.'
  return null
}

export function validateUsername(value: string): string | null {
  const username = normalizeUsername(value)

  if (!USERNAME_PATTERN.test(username)) {
    return 'Usa 3 a 32 caracteres: letras, numeros, punto, guion o guion bajo.'
  }

  return null
}

export function validatePassword(value: string): string | null {
  if (value.length < 6) return 'La contraseña necesita al menos 6 caracteres.'
  return null
}
