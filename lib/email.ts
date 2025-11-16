// lib/email.ts
// Normaliza correos para que coincidan siempre entre Firestore y Google
// - Minúsculas
// - Sin espacios
// - Para @gmail.com elimina puntos y "+loquesea"

export function normalizeEmail(raw: string): string {
  const lower = raw.trim().toLowerCase()

  // Si no es Gmail, solo normalizamos a minúsculas y sin espacios
  if (!lower.endsWith('@gmail.com')) return lower

  const [local, domain] = lower.split('@')

  // Quitamos "+loquesea"
  const withoutPlus = local.split('+')[0]

  // Quitamos puntos del local-part (Gmail los ignora)
  const withoutDots = withoutPlus.replace(/\./g, '')

  return `${withoutDots}@${domain}`
}
