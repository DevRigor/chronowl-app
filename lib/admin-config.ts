export const ADMIN_EMAILS = [
  // Add admin emails here - these users will automatically have 'admin' role
  'admin@example.com',
  'manager@example.com',
]

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase())
}
