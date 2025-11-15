'use client'

import { ProtectedLayout } from '@/components/protected-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'
import { db } from '@/lib/firebase'
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Loader2, Edit2, Plus } from 'lucide-react'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useRouter } from 'next/navigation'
import { RegisterUserForm } from '@/components/register-user-form'

interface User {
  id: string
  email: string
  displayName: string
  role: 'admin' | 'user'
  isActive: boolean
  createdAt: any
}

export default function AdminUsersPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)

  useEffect(() => {
    if (!authLoading && user?.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [user, authLoading, router])

  const fetchUsers = async () => {
    try {
      const usersRef = collection(db, 'users')
      const querySnapshot = await getDocs(usersRef)
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[]
      setUsers(data)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers()
    }
  }, [user])

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole })
      fetchUsers()
      setEditOpen(false)
    } catch (error) {
      console.error('Error updating role:', error)
    }
  }

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isActive: !currentActive })
      fetchUsers()
    } catch (error) {
      console.error('Error updating user status:', error)
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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Gestión de Usuarios</h1>
          <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Registrar Usuario
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Nuevo Usuario</DialogTitle>
                <DialogDescription>
                  Crea un nuevo usuario en el sistema
                </DialogDescription>
              </DialogHeader>
              <RegisterUserForm
                onSuccess={() => {
                  setRegisterOpen(false)
                  fetchUsers()
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Usuarios del Sistema</CardTitle>
            <CardDescription>
              Total: {users.length} usuarios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Nombre</th>
                    <th className="text-left py-3 px-4 font-semibold">Email</th>
                    <th className="text-left py-3 px-4 font-semibold">Rol</th>
                    <th className="text-left py-3 px-4 font-semibold">Estado</th>
                    <th className="text-left py-3 px-4 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">{u.displayName}</td>
                      <td className="py-3 px-4">{u.email}</td>
                      <td className="py-3 px-4">
                        <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                          {u.role === 'admin' ? 'Administrador' : 'Usuario'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={u.isActive ? 'default' : 'destructive'}>
                          {u.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 space-x-2">
                        <Dialog open={editOpen && selectedUser?.id === u.id} onOpenChange={(newOpen) => {
                          setEditOpen(newOpen)
                          if (!newOpen) setSelectedUser(null)
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setSelectedUser(u)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Editar Usuario</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <p className="text-sm font-medium mb-2">Cambiar Rol</p>
                                <div className="space-y-2">
                                  <Button
                                    variant={u.role === 'admin' ? 'default' : 'outline'}
                                    className="w-full"
                                    onClick={() => handleRoleChange(u.id, 'admin')}
                                  >
                                    Hacer Administrador
                                  </Button>
                                  <Button
                                    variant={u.role === 'user' ? 'default' : 'outline'}
                                    className="w-full"
                                    onClick={() => handleRoleChange(u.id, 'user')}
                                  >
                                    Hacer Usuario
                                  </Button>
                                </div>
                              </div>
                              <div>
                                <p className="text-sm font-medium mb-2">Estado</p>
                                <Button
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => handleToggleActive(u.id, u.isActive)}
                                >
                                  {u.isActive ? 'Desactivar' : 'Activar'}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </td>
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
