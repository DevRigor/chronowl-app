'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { db } from '@/lib/firebase'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'

export default function AdminSetupPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/dashboard')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'))
        const usersList = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        setUsers(usersList)
      } catch (err) {
        console.error('Error fetching users:', err)
      } finally {
        setLoading(false)
      }
    }

    if (user?.role === 'admin') {
      fetchUsers()
    }
  }, [user])

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!newAdminEmail.trim()) {
      setError('Ingresa un correo válido')
      return
    }

    try {
      const userToUpdate = users.find(u => u.email?.toLowerCase() === newAdminEmail.toLowerCase())
      
      if (!userToUpdate) {
        setError('Usuario no encontrado. El usuario debe existir primero.')
        return
      }

      if (userToUpdate.role === 'admin') {
        setError('Este usuario ya es administrador')
        return
      }

      await updateDoc(doc(db, 'users', userToUpdate.id), {
        role: 'admin'
      })

      setSuccess(`${newAdminEmail} ahora es administrador`)
      setNewAdminEmail('')
      
      const usersSnapshot = await getDocs(collection(db, 'users'))
      const usersList = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setUsers(usersList)
    } catch (err) {
      setError('Error al actualizar usuario')
    }
  }

  const handleRemoveAdmin = async (userId: string) => {
    if (userId === user?.uid) {
      setError('No puedes quitarte a ti mismo como administrador')
      return
    }

    try {
      await updateDoc(doc(db, 'users', userId), {
        role: 'user'
      })

      setSuccess('Rol actualizado')
      
      const usersSnapshot = await getDocs(collection(db, 'users'))
      const usersList = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setUsers(usersList)
    } catch (err) {
      setError('Error al actualizar usuario')
    }
  }

  if (authLoading || loading) {
    return <div>Cargando...</div>
  }

  const admins = users.filter(u => u.role === 'admin')

  return (
    <div className="space-y-6 max-w-2xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Administradores</CardTitle>
          <CardDescription>
            Asigna y revoca roles de administrador a usuarios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription className="text-green-600">{success}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleAddAdmin} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Agregar nuevo administrador</label>
              <div className="flex gap-2 mt-2">
                <Input
                  type="email"
                  placeholder="correo@example.com"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                />
                <Button type="submit">Agregar</Button>
              </div>
            </div>
          </form>

          <Separator />

          <div>
            <h3 className="font-semibold mb-4">Administradores actuales</h3>
            <div className="space-y-3">
              {admins.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay administradores asignados</p>
              ) : (
                admins.map((admin) => (
                  <div key={admin.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">{admin.displayName}</p>
                      <p className="text-sm text-muted-foreground">{admin.email}</p>
                    </div>
                    {admin.id !== user?.uid && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveAdmin(admin.id)}
                      >
                        Remover admin
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
