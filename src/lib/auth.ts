const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase()
}

export function usernameToEmail(username: string): string {
  return `${normalizeUsername(username)}@figuritas.local`
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
