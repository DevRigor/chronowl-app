'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { db } from '@/lib/firebase'
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { AlertCircle, Loader2 } from 'lucide-react'

interface WorkEntryFormProps {
  userId: string
  onSuccess?: () => void
}

export function WorkEntryForm({ userId, onSuccess }: WorkEntryFormProps) {
  const [hours, setHours] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!hours || parseFloat(hours) <= 0) {
      setError('Las horas deben ser mayor a 0')
      return
    }

    setLoading(true)

    try {
      const dateTimestamp = Timestamp.fromDate(new Date(date))
      
      await addDoc(collection(db, 'workEntries'), {
        userId,
        type: 'earned',
        hours: parseFloat(hours),
        description,
        date: dateTimestamp,
        status: 'pending',
        createdAt: serverTimestamp(),
      })

      setHours('')
      setDescription('')
      setDate(new Date().toISOString().split('T')[0])
      onSuccess?.()
    } catch (err: any) {
      setError(err.message || 'Error al registrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Registra las horas extra que trabajaste
      </p>

      <div>
        <label className="text-sm font-medium">Fecha</label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          disabled={loading}
        />
      </div>

      <div>
        <label className="text-sm font-medium">Horas</label>
        <Input
          type="number"
          step="0.5"
          min="0"
          placeholder="0.0"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          required
          disabled={loading}
        />
      </div>

      <div>
        <label className="text-sm font-medium">Descripción</label>
        <Textarea
          placeholder="Describe por qué registras estas horas..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={loading}
        />
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
          'Registrar Horas'
        )}
      </Button>
    </form>
  )
}
