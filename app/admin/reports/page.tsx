'use client'

import { ProtectedLayout } from '@/components/protected-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { Loader2, Download } from 'lucide-react'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface ReportData {
  userId: string
  userName: string
  email: string
  totalEarned: number
  totalUsed: number
  balance: number
  vacationDays: number
  medicalDays: number
  personalDays: number
}

export default function AdminReportsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [reportData, setReportData] = useState<ReportData[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7))
  const [year, setYear] = useState(new Date().getFullYear().toString())

  useEffect(() => {
    if (!authLoading && user?.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [user, authLoading, router])

  const generateReport = async (filterMonth?: string) => {
    try {
      setLoading(true)
      const usersRef = collection(db, 'users')
      const usersSnap = await getDocs(usersRef)

      const reportPromises = usersSnap.docs.map(async (userDoc) => {
        const userData = userDoc.data()
        const userId = userDoc.id

        // Fetch work entries
        const entriesRef = collection(db, 'workEntries')
        const entriesQuery = query(
          entriesRef,
          where('userId', '==', userId),
          where('status', '==', 'approved')
        )
        const entriesSnap = await getDocs(entriesQuery)

        // Fetch absences
        const absencesRef = collection(db, 'absences')
        const absencesQuery = query(
          absencesRef,
          where('userId', '==', userId),
          where('status', '==', 'approved')
        )
        const absencesSnap = await getDocs(absencesQuery)

        let totalEarned = 0
        let totalUsed = 0
        let vacationDays = 0
        let medicalDays = 0
        let personalDays = 0

        entriesSnap.forEach((doc) => {
          const data = doc.data()
          if (data.type === 'earned') {
            totalEarned += data.hours
          } else if (data.type === 'used') {
            totalUsed += data.hours
          }
        })

        absencesSnap.forEach((doc) => {
          const data = doc.data()
          const startDate = data.startDate?.toDate()
          const endDate = data.endDate?.toDate()
          const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

          if (data.type === 'vacation') {
            vacationDays += diffDays
          } else if (data.type === 'medical') {
            medicalDays += diffDays
          } else if (data.type === 'personal') {
            personalDays += diffDays
          }
        })

        return {
          userId,
          userName: userData.displayName,
          email: userData.email,
          totalEarned,
          totalUsed,
          balance: totalEarned - totalUsed,
          vacationDays,
          medicalDays,
          personalDays,
        }
      })

      const data = await Promise.all(reportPromises)
      setReportData(data)
    } catch (error) {
      console.error('Error generating report:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') {
      generateReport()
    }
  }, [user])

  const exportCSV = () => {
    const headers = [
      'Nombre',
      'Email',
      'Horas Ganadas',
      'Horas Usadas',
      'Saldo',
      'Días Vacaciones',
      'Días Licencia Médica',
      'Días Permiso Personal',
    ]

    const rows = reportData.map((r) => [
      r.userName,
      r.email,
      r.totalEarned.toFixed(1),
      r.totalUsed.toFixed(1),
      r.balance.toFixed(1),
      r.vacationDays,
      r.medicalDays,
      r.personalDays,
    ])

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-horas-${new Date().toISOString().substring(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Reportes</h1>
          <Button onClick={exportCSV} disabled={reportData.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Descargar CSV
          </Button>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium">Mes</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md text-sm"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={() => generateReport(month)} disabled={loading}>
                {loading ? 'Cargando...' : 'Generar Reporte'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumen de Equipo</CardTitle>
            <CardDescription>
              Total de {reportData.length} usuarios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Nombre</th>
                    <th className="text-left py-3 px-4 font-semibold">Email</th>
                    <th className="text-right py-3 px-4 font-semibold">Ganadas</th>
                    <th className="text-right py-3 px-4 font-semibold">Usadas</th>
                    <th className="text-right py-3 px-4 font-semibold">Saldo</th>
                    <th className="text-right py-3 px-4 font-semibold">Vacaciones</th>
                    <th className="text-right py-3 px-4 font-semibold">Médica</th>
                    <th className="text-right py-3 px-4 font-semibold">Personal</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((r, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">{r.userName}</td>
                      <td className="py-3 px-4">{r.email}</td>
                      <td className="text-right py-3 px-4 font-semibold text-green-600">
                        +{r.totalEarned.toFixed(1)}h
                      </td>
                      <td className="text-right py-3 px-4 font-semibold text-red-600">
                        -{r.totalUsed.toFixed(1)}h
                      </td>
                      <td className="text-right py-3 px-4 font-semibold text-primary">
                        {r.balance.toFixed(1)}h
                      </td>
                      <td className="text-right py-3 px-4">{r.vacationDays}</td>
                      <td className="text-right py-3 px-4">{r.medicalDays}</td>
                      <td className="text-right py-3 px-4">{r.personalDays}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedLayout>
  )
}
