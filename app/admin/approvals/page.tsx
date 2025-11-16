'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/auth-context'

import { ProtectedLayout } from '@/components/protected-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { Loader2, Check, X, AlertCircle } from 'lucide-react'

interface PendingEntry {
  id: string
  userId: string
  userName: string
  type: 'earned' | 'used'
  hours: number
  date: Timestamp
  description: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: Timestamp
}

interface PendingAbsence {
  id: string
  userId: string
  userName: string
  type: string
  startDate: Timestamp
  endDate: Timestamp
  description: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: Timestamp
}

export default function AdminApprovalsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [pendingEntries, setPendingEntries] = useState<PendingEntry[]>([])
  const [pendingAbsences, setPendingAbsences] = useState<PendingAbsence[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && user?.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [user, authLoading, router])

  const fetchPending = async () => {
    try {
      setLoading(true)

      // ---- Horas pendientes ----
      const entriesRef = collection(db, 'workEntries')
      const entriesQuery = query(entriesRef, where('status', '==', 'pending'))
      const entriesSnap = await getDocs(entriesQuery)

      const entriesWithNames: PendingEntry[] = entriesSnap.docs.map((docSnap) => {
        const data = docSnap.data() as any
        return {
          id: docSnap.id,
          userId: data.userId,
          userName: data.userName || data.userEmail || data.userId, // 👈 usamos lo que venga
          type: data.type,
          hours: data.hours,
          date: data.date,
          description: data.description || '',
          status: data.status,
          createdAt: data.createdAt,
        }
      })

      // ---- Ausencias pendientes ----
      const absencesRef = collection(db, 'absences')
      const absencesQuery = query(absencesRef, where('status', '==', 'pending'))
      const absencesSnap = await getDocs(absencesQuery)

      const absencesWithNames: PendingAbsence[] = absencesSnap.docs.map((docSnap) => {
        const data = docSnap.data() as any
        return {
          id: docSnap.id,
          userId: data.userId,
          userName: data.userName || data.userEmail || data.userId, // 👈 idem
          type: data.type,
          startDate: data.startDate,
          endDate: data.endDate,
          description: data.description || '',
          status: data.status,
          createdAt: data.createdAt,
        }
      })

      setPendingEntries(entriesWithNames)
      setPendingAbsences(absencesWithNames)
    } catch (error) {
      console.error('Error fetching pending:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchPending()
    }
  }, [user])

  const handleApproveEntry = async (id: string) => {
    try {
      await updateDoc(doc(db, 'workEntries', id), {
        status: 'approved',
        approvedBy: user?.uid,
        updatedAt: serverTimestamp(),
      })
      fetchPending()
    } catch (error) {
      console.error('Error approving entry:', error)
    }
  }

  const handleRejectEntry = async (id: string) => {
    try {
      await updateDoc(doc(db, 'workEntries', id), {
        status: 'rejected',
        approvedBy: user?.uid,
        updatedAt: serverTimestamp(),
      })
      fetchPending()
    } catch (error) {
      console.error('Error rejecting entry:', error)
    }
  }

  const handleApproveAbsence = async (id: string) => {
    try {
      await updateDoc(doc(db, 'absences', id), {
        status: 'approved',
        approvedBy: user?.uid,
        updatedAt: serverTimestamp(),
      })
      fetchPending()
    } catch (error) {
      console.error('Error approving absence:', error)
    }
  }

  const handleRejectAbsence = async (id: string) => {
    try {
      await updateDoc(doc(db, 'absences', id), {
        status: 'rejected',
        approvedBy: user?.uid,
        updatedAt: serverTimestamp(),
      })
      fetchPending()
    } catch (error) {
      console.error('Error rejecting absence:', error)
    }
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

  if (user?.role !== 'admin') {
    return (
      <ProtectedLayout>
        <div className="p-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No tienes permisos para acceder a esta página
            </AlertDescription>
          </Alert>
        </div>
      </ProtectedLayout>
    )
  }

  return (
    <ProtectedLayout>
      <div className="p-8">
        <h1 className="text-4xl font-bold mb-8">Aprobaciones Pendientes</h1>

        <Tabs defaultValue="entries" className="space-y-6">
          <TabsList>
            <TabsTrigger value="entries">
              Horas ({pendingEntries.length})
            </TabsTrigger>
            <TabsTrigger value="absences">
              Ausencias ({pendingAbsences.length})
            </TabsTrigger>
          </TabsList>

          {/* HORAS */}
          <TabsContent value="entries">
            <Card>
              <CardHeader>
                <CardTitle>Solicitudes de Horas Pendientes</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingEntries.length === 0 ? (
                  <p className="text-muted-foreground">No hay solicitudes pendientes</p>
                ) : (
                  <div className="space-y-4">
                    {pendingEntries.map((entry) => (
                      <div key={entry.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold">{entry.userName}</p>
                            <p className="text-sm text-muted-foreground">
                              {entry.type === 'earned' ? 'Horas Ganadas' : 'Horas Usadas'} - {entry.hours}h
                            </p>
                            {entry.description && (
                              <p className="text-sm mt-1">{entry.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {entry.date?.toDate().toLocaleDateString('es-ES')}
                            </p>
                          </div>
                          <div className="space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApproveEntry(entry.id)}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectEntry(entry.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* AUSENCIAS */}
          <TabsContent value="absences">
            <Card>
              <CardHeader>
                <CardTitle>Solicitudes de Ausencias Pendientes</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingAbsences.length === 0 ? (
                  <p className="text-muted-foreground">No hay solicitudes pendientes</p>
                ) : (
                  <div className="space-y-4">
                    {pendingAbsences.map((absence) => (
                      <div key={absence.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold">{absence.userName}</p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {absence.type}
                            </p>
                            <p className="text-sm mt-1">
                              {absence.startDate?.toDate().toLocaleDateString('es-ES')} -{' '}
                              {absence.endDate?.toDate().toLocaleDateString('es-ES')}
                            </p>
                            {absence.description && (
                              <p className="text-sm mt-1">{absence.description}</p>
                            )}
                          </div>
                          <div className="space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApproveAbsence(absence.id)}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectAbsence(absence.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedLayout>
  )
}
