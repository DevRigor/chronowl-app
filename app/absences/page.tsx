'use client'

import { ProtectedLayout } from '@/components/protected-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Loader2 } from 'lucide-react'
import { AbsenceForm } from '@/components/absence-form'

interface Absence {
  id: string
  type: 'vacation' | 'medical' | 'personal' | 'other'
  startDate: Timestamp
  endDate: Timestamp
  isFullDay: boolean
  description: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: Timestamp
}

const absenceTypeLabels = {
  vacation: 'Vacaciones',
  medical: 'Licencia Médica',
  personal: 'Permiso Personal',
  other: 'Otro',
}

export default function AbsencesPage() {
  const { user, loading: authLoading } = useAuth()
  const [absences, setAbsences] = useState<Absence[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  const fetchAbsences = async () => {
    if (!user) return
    try {
      const absencesRef = collection(db, 'absences')
      const q = query(
        absencesRef,
        where('userId', '==', user.uid),
        orderBy('startDate', 'desc')
      )
      const querySnapshot = await getDocs(q)
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Absence[]
      setAbsences(data)
    } catch (error) {
      console.error('Error fetching absences:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAbsences()
  }, [user])

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default'
      case 'rejected':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const calculateDays = (start: Timestamp, end: Timestamp) => {
    const startDate = start.toDate()
    const endDate = end.toDate()
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }

  if (authLoading || loading) {
    return (
      <ProtectedLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </ProtectedLayout>
    )
  }

  return (
    <ProtectedLayout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Ausencias</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Registrar Ausencia
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Registrar Ausencia</DialogTitle>
                <DialogDescription>
                  Solicita vacaciones, licencias o permisos
                </DialogDescription>
              </DialogHeader>
              <AbsenceForm
                userId={user?.uid || ''}
                onSuccess={() => {
                  setOpen(false)
                  fetchAbsences()
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Mis Ausencias</CardTitle>
            <CardDescription>
              Registro de tus ausencias solicitadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {absences.length === 0 ? (
              <p className="text-muted-foreground">No hay ausencias registradas</p>
            ) : (
              <div className="space-y-4">
                {absences.map((absence) => (
                  <div
                    key={absence.id}
                    className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold">
                          {absenceTypeLabels[absence.type]}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {absence.startDate?.toDate().toLocaleDateString('es-ES')} -{' '}
                          {absence.endDate?.toDate().toLocaleDateString('es-ES')}
                          {' '}
                          ({calculateDays(absence.startDate, absence.endDate)} días)
                        </p>
                        {absence.description && (
                          <p className="text-sm mt-2">{absence.description}</p>
                        )}
                      </div>
                      <Badge variant={getStatusBadgeVariant(absence.status)}>
                        {absence.status === 'pending' && 'Pendiente'}
                        {absence.status === 'approved' && 'Aprobado'}
                        {absence.status === 'rejected' && 'Rechazado'}
                      </Badge>
                    </div>
                    {!absence.isFullDay && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Medio día
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedLayout>
  )
}
