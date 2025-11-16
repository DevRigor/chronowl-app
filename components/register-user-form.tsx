// components/register-user-form.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { db } from '@/lib/firebase'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { AlertCircle, Loader2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { normalizeEmail } from '@/lib/email'

interface RegisterUserFormProps {
  onSuccess?: () => void
}

export function RegisterUserForm({ onSuccess }: RegisterUserFormProps) {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'user' | 'admin'>('user')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!displayName.trim() || !email.trim()) {
      setError('Nombre y email son requeridos')
      return
    }

    if (!email.includes('@')) {
      setError('Email inválido')
      return
    }

    setLoading(true)

    try {
      const normalizedEmail = normalizeEmail(email)

      console.log('[register-user] normalizedEmail:', normalizedEmail)

      // Documento en /users/{email-normalizado}
      await setDoc(doc(db, 'users', normalizedEmail), {
        displayName: displayName.trim(),
        email: normalizedEmail,
        role,
        isActive: true,
        createdAt: serverTimestamp(),
      })

      setDisplayName('')
      setEmail('')
      setRole('user')
      onSuccess?.()
    } catch (err: any) {
      console.error('[register-user] Error:', err)
      setError(err.message || 'Error al registrar usuario')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Nombre Completo</label>
        <Input
          placeholder="Juan Pérez"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          disabled={loading}
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium">Email</label>
        <Input
          type="email"
          placeholder="juan@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium">Rol</label>
        <Select value={role} onValueChange={(value) => setRole(value as 'user' | 'admin')}>
          <SelectTrigger disabled={loading}>
            <SelectValue placeholder="Selecciona un rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">Usuario</SelectItem>
            <SelectItem value="admin">Administrador</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Registrando...
          </>
        ) : (
          'Registrar Usuario'
        )}
      </Button>
    </form>
  )
}
