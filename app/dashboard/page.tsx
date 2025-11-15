'use client'

import { ProtectedLayout } from '@/components/protected-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/auth-context'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { MonthCalendar } from '@/components/month-calendar'

interface Stats {
  totalBalance: number
  monthlyEarned: number
  monthlyUsed: number
  nextAbsences: any[]
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const fetchStats = async () => {
      try {
        console.log('[v0] Fetching stats for user:', user.uid)
        
        const entriesRef = collection(db, 'workEntries')
        const allEntriesSnap = await getDocs(entriesRef)
        console.log('[v0] Total entries in database:', allEntriesSnap.size)
        
        let totalBalance = 0
        let monthlyEarned = 0
        let monthlyUsed = 0
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

        allEntriesSnap.forEach((doc) => {
          const data = doc.data()
          const uid = data.userId || data.userid
          const status = data.status
          
          if (uid !== user.uid) {
            console.log('[v0] Skipping entry not for this user:', uid, 'looking for:', user.uid)
            return
          }
          
          if (status !== 'approved') {
            console.log('[v0] Skipping non-approved entry:', status)
            return
          }

          const hours = data.hours || 0
          let entryDate = new Date()
          if (data.date?.toDate) {
            entryDate = data.date.toDate()
          } else if (data.date instanceof Date) {
            entryDate = data.date
          } else {
            entryDate = new Date(data.date)
          }

          console.log('[v0] Processing entry:', { type: data.type, hours, date: entryDate, status: data.status })

          if (data.type === 'earned') {
            totalBalance += hours
            if (entryDate > monthStart) {
              monthlyEarned += hours
            }
          } else if (data.type === 'used') {
            totalBalance -= hours
            if (entryDate > monthStart) {
              monthlyUsed += hours
            }
          }
        })

        console.log('[v0] Calculated stats:', { totalBalance, monthlyEarned, monthlyUsed })

        // Próximas ausencias
        const absencesRef = collection(db, 'absences')
        const nextAbsencesQuery = query(
          absencesRef,
          where('userId', '==', user.uid),
          where('status', '==', 'approved'),
          orderBy('startDate'),
          limit(3)
        )
        const absencesSnap = await getDocs(nextAbsencesQuery)
        const nextAbsences = absencesSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        setStats({
          totalBalance: Math.max(0, totalBalance),
          monthlyEarned,
          monthlyUsed,
          nextAbsences,
        })
      } catch (error) {
        console.error('[v0] Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [user])

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
        <h1 className="text-4xl font-bold mb-8">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Saldo Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {stats?.totalBalance.toFixed(1)} h
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Horas Ganadas (Este Mes)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                +{stats?.monthlyEarned.toFixed(1)} h
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Horas Usadas (Este Mes)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                -{stats?.monthlyUsed.toFixed(1)} h
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Próximas Ausencias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {stats?.nextAbsences.length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-8">
          <MonthCalendar userId={user?.uid || ''} />
        </div>

        {stats?.nextAbsences && stats.nextAbsences.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Próximas Ausencias Aprobadas</CardTitle>
              <CardDescription>Tus ausencias programadas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.nextAbsences.map((absence) => (
                  <div key={absence.id} className="flex justify-between items-start p-4 border rounded-lg">
                    <div>
                      <p className="font-medium capitalize">{absence.type}</p>
                      <p className="text-sm text-muted-foreground">
                        {absence.startDate?.toDate().toLocaleDateString('es-ES')} 
                        {' '}-{' '}
                        {absence.endDate?.toDate().toLocaleDateString('es-ES')}
                      </p>
                      {absence.description && (
                        <p className="text-sm mt-1">{absence.description}</p>
                      )}
                    </div>
                    <Badge variant="outline">Aprobado</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedLayout>
  )
}
