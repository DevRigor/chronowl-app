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
import { WorkEntryForm } from '@/components/work-entry-form'
import { DataTable } from '@/components/data-table'

interface WorkEntry {
  id: string
  type: 'earned' | 'used'
  hours: number
  date: Timestamp
  description: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: Timestamp
  approvedBy?: string
}

export default function WorkEntriesPage() {
  const { user, loading: authLoading } = useAuth()
  const [entries, setEntries] = useState<WorkEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  const fetchEntries = async () => {
    if (!user) return
    try {
      const entriesRef = collection(db, 'workEntries')
      const q = query(
        entriesRef,
        where('userId', '==', user.uid),
        orderBy('date', 'desc')
      )
      const querySnapshot = await getDocs(q)
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as WorkEntry[]
      setEntries(data)
    } catch (error) {
      console.error('Error fetching entries:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEntries()
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

  const getTypeBadgeVariant = (type: string) => {
    return type === 'earned' ? 'default' : 'secondary'
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
          <h1 className="text-4xl font-bold">Mis Horas</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Registrar Horas
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Horas</DialogTitle>
                <DialogDescription>
                  Registra tus horas ganadas o usadas
                </DialogDescription>
              </DialogHeader>
              <WorkEntryForm
                userId={user?.uid || ''}
                onSuccess={() => {
                  setOpen(false)
                  fetchEntries()
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Historial de Registros</CardTitle>
            <CardDescription>
              Tus horas ganadas y usadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <p className="text-muted-foreground">No hay registros aún</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">Tipo</th>
                      <th className="text-left py-3 px-4 font-semibold">Horas</th>
                      <th className="text-left py-3 px-4 font-semibold">Fecha</th>
                      <th className="text-left py-3 px-4 font-semibold">Descripción</th>
                      <th className="text-left py-3 px-4 font-semibold">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <Badge variant={getTypeBadgeVariant(entry.type)}>
                            {entry.type === 'earned' ? 'Ganadas' : 'Usadas'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold">{entry.hours}h</span>
                        </td>
                        <td className="py-3 px-4">
                          {entry.date?.toDate().toLocaleDateString('es-ES')}
                        </td>
                        <td className="py-3 px-4">
                          {entry.description}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={getStatusBadgeVariant(entry.status)}>
                            {entry.status === 'pending' && 'Pendiente'}
                            {entry.status === 'approved' && 'Aprobado'}
                            {entry.status === 'rejected' && 'Rechazado'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedLayout>
  )
}
