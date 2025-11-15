'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { db } from '@/lib/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'

interface AbsenceFormProps {
  userId: string
  onSuccess?: () => void
}

export function AbsenceForm({ userId, onSuccess }: AbsenceFormProps) {
  const [type, setType] = useState<'vacation' | 'medical' | 'personal' | 'other'>('vacation')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [isFullDay, setIsFullDay] = useState(true)
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (new Date(startDate) > new Date(endDate)) {
      setError('La fecha de inicio debe ser menor a la fecha de fin')
      return
    }

    setLoading(true)

    try {
      await addDoc(collection(db, 'absences'), {
        userId,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isFullDay,
        description,
        status: 'pending',
        createdBy: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      setStartDate(new Date().toISOString().split('T')[0])
      setEndDate(new Date().toISOString().split('T')[0])
      setIsFullDay(true)
      setDescription('')
      setType('vacation')
      onSuccess?.()
    } catch (err: any) {
      setError(err.message || 'Error al registrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs value={type} onValueChange={(v) => setType(v as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="vacation">Vacaciones</TabsTrigger>
          <TabsTrigger value="medical">Médica</TabsTrigger>
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="other">Otro</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Fecha de inicio</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            disabled={loading}
            className="w-full px-3 py-2 border border-border rounded-md text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Fecha de fin</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
            disabled={loading}
            className="w-full px-3 py-2 border border-border rounded-md text-sm"
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="fullday"
          checked={isFullDay}
          onCheckedChange={(checked) => setIsFullDay(checked as boolean)}
          disabled={loading}
        />
        <label htmlFor="fullday" className="text-sm cursor-pointer">
          Día completo
        </label>
      </div>

      <div>
        <label className="text-sm font-medium">Descripción (opcional)</label>
        <Textarea
          placeholder="Detalles adicionales..."
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
          'Registrar Ausencia'
        )}
      </Button>
    </form>
  )
}
