'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { db } from '@/lib/firebase'
import { collection, addDoc, serverTimestamp, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface MonthCalendarProps {
  userId: string
}

interface DayEntry {
  userId: string
  displayName: string
  type: 'earned' | 'used' | 'vacation' | 'medical' | 'personal' | 'other'
  hours?: number
  description?: string
}

export function MonthCalendar({ userId }: MonthCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dayEntries, setDayEntries] = useState<DayEntry[]>([])
  
  const [absenceType, setAbsenceType] = useState<'vacation' | 'medical' | 'personal' | 'other'>('vacation')
  const [absenceEndDate, setAbsenceEndDate] = useState('')
  const [absenceFullDay, setAbsenceFullDay] = useState(true)
  const [absenceDescription, setAbsenceDescription] = useState('')
  
  const [saving, setSaving] = useState(false)
  const [loadingEntries, setLoadingEntries] = useState(false)

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()
  const monthName = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

  const days = []
  for (let i = 0; i < firstDay; i++) {
    days.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
    setSelectedDate(null)
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
    setSelectedDate(null)
  }

  const formatDateString = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    return date.toISOString().split('T')[0]
  }

  const loadDayEntries = async (dateStr: string) => {
  setLoadingEntries(true)
  console.log('[v0] Loading entries for date:', dateStr)

  try {
    // 1) Parsear YYYY-MM-DD a fecha local
    const [year, month, day] = dateStr.split('-').map(Number)
    const startOfDay = new Date(year, month - 1, day)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(year, month - 1, day + 1)
    endOfDay.setHours(0, 0, 0, 0) // límite exclusivo

    // 2) Armar query filtrando por rango de fecha + status
    const workEntriesRef = collection(db, 'workEntries')
    const workQuery = query(
      workEntriesRef,
      where('status', '==', 'approved'),
      where('date', '>=', Timestamp.fromDate(startOfDay)),
      where('date', '<', Timestamp.fromDate(endOfDay)),
    )

    const workSnap = await getDocs(workQuery)
    console.log('[v0] Found approved entries for day:', workSnap.size)

    // 3) Map de usuarios
    const usersRef = collection(db, 'users')
    const usersSnap = await getDocs(usersRef)
    const userMap = new Map<string, string>()
    usersSnap.docs.forEach((doc) => {
      const uid = (doc.data().uid as string) || doc.id
      userMap.set(uid, (doc.data().displayName as string) || 'Usuario')
    })

    // 4) Construir entradas para la UI (ya no filtramos por fecha aquí)
    const entries: DayEntry[] = []

    workSnap.docs.forEach((docSnap) => {
      const data = docSnap.data() as any
      const uid = data.userId || data.userid
      const displayName = userMap.get(uid) || 'Usuario'

      entries.push({
        userId: uid,
        displayName,
        type: data.type,
        hours: data.hours,
        description: data.description,
      })
    })

    console.log('[v0] Final entries for date:', entries.length)
    setDayEntries(entries)
  } catch (error) {
    console.error('[v0] Error loading entries:', error)
  } finally {
    setLoadingEntries(false)
  }
}


  const handleSaveAbsence = async () => {
    if (!selectedDate || !absenceEndDate) return

    setSaving(true)
    try {
      await addDoc(collection(db, 'absences'), {
        userId,
        type: absenceType,
        startDate: new Date(selectedDate),
        endDate: new Date(absenceEndDate),
        isFullDay: absenceFullDay,
        description: absenceDescription,
        status: 'pending',
        createdAt: serverTimestamp(),
      })

      setAbsenceEndDate('')
      setAbsenceDescription('')
      setAbsenceType('vacation')
      setAbsenceFullDay(true)
      await loadDayEntries(selectedDate)
    } catch (error) {
      console.error('Error saving absence:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDateClick = (day: number) => {
    const dateStr = formatDateString(day)
    setSelectedDate(dateStr)
    loadDayEntries(dateStr)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar Horas y Ausencias - {monthName.charAt(0).toUpperCase() + monthName.slice(1)}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={previousMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h3 className="font-semibold text-lg capitalize">{monthName}</h3>
            <Button variant="ghost" size="icon" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
              <div key={day} className="text-center text-sm font-semibold text-muted-foreground">
                {day}
              </div>
            ))}
            {days.map((day, index) => (
              <button
                key={index}
                onClick={() => day && handleDateClick(day)}
                className={`p-2 text-sm rounded-lg border-2 transition-all ${
                  day === null
                    ? 'opacity-0 cursor-default'
                    : selectedDate === formatDateString(day)
                    ? 'border-primary bg-primary/10 font-semibold'
                    : 'border-muted hover:border-primary hover:bg-muted/50'
                }`}
                disabled={day === null}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {selectedDate && (
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm font-medium mb-2">Fecha seleccionada</p>
              <p className="text-sm text-muted-foreground">
                {new Date(selectedDate).toLocaleDateString('es-ES', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>

            <div className="space-y-3 border-t pt-4">
              <h4 className="font-semibold text-sm">Registrar Ausencia</h4>
              
              <div>
                <label className="text-sm font-medium">Tipo de ausencia</label>
                <Select value={absenceType} onValueChange={(v) => setAbsenceType(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vacation">Vacaciones</SelectItem>
                    <SelectItem value="medical">Médica</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Fecha de fin</label>
                <Input
                  type="date"
                  value={absenceEndDate}
                  onChange={(e) => setAbsenceEndDate(e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="fullday"
                  checked={absenceFullDay}
                  onChange={(e) => setAbsenceFullDay(e.target.checked)}
                  disabled={saving}
                  className="rounded border border-input"
                />
                <label htmlFor="fullday" className="text-sm cursor-pointer">
                  Día completo
                </label>
              </div>
              <div>
                <label className="text-sm font-medium">Motivo (opcional)</label>
                <Textarea
                  placeholder="Detalles adicionales..."
                  value={absenceDescription}
                  onChange={(e) => setAbsenceDescription(e.target.value)}
                  disabled={saving}
                />
              </div>
              <Button onClick={handleSaveAbsence} disabled={saving || !absenceEndDate} className="w-full">
                {saving ? 'Guardando...' : 'Guardar Ausencia'}
              </Button>
            </div>

            <Button
              variant="outline"
              onClick={() => {
                setSelectedDate(null)
                setAbsenceEndDate('')
                setAbsenceDescription('')
              }}
              disabled={saving}
              className="w-full"
            >
              Cerrar
            </Button>
          </div>
        )}

        {selectedDate && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg space-y-3">
            <h4 className="font-semibold text-sm">Horas ingresadas para esta fecha:</h4>
            {loadingEntries ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : dayEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay registros para esta fecha</p>
            ) : (
              <div className="space-y-2">
                {dayEntries.map((entry, idx) => (
                  <div key={idx} className="text-sm p-2 bg-white dark:bg-slate-900 rounded border">
                    <p className="font-medium">{entry.displayName}</p>
                    <p className="text-muted-foreground">
                      {entry.type === 'earned' ? '✓ Horas ganadas' : '✓ Horas usadas'}: {entry.hours}h
                    </p>
                    {entry.description && <p className="text-xs text-muted-foreground">{entry.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
