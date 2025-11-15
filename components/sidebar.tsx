'use client'

import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { auth } from '@/lib/firebase'
import { signOut } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, Clock, Calendar, LogOut, Users, BarChart3 } from 'lucide-react'

export function Sidebar() {
  const { user } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await signOut(auth)
    router.push('/login')
  }

  const isAdmin = user?.role === 'admin'

  return (
    <aside className="w-64 bg-card border-r border-border min-h-screen p-4 flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">Horas</h1>
        <p className="text-sm text-muted-foreground">{user?.displayName}</p>
      </div>

      <nav className="flex-1 space-y-2">
        <Link href="/dashboard">
          <Button variant="ghost" className="w-full justify-start">
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
        </Link>

        <Link href="/work-entries">
          <Button variant="ghost" className="w-full justify-start">
            <Clock className="w-4 h-4 mr-2" />
            Mis Horas
          </Button>
        </Link>


        {isAdmin && (
          <>
            <Link href="/admin/users">
              <Button variant="ghost" className="w-full justify-start">
                <Users className="w-4 h-4 mr-2" />
                Usuarios
              </Button>
            </Link>

            <Link href="/admin/approvals">
              <Button variant="ghost" className="w-full justify-start">
                <Clock className="w-4 h-4 mr-2" />
                Aprobaciones
              </Button>
            </Link>

            <Link href="/admin/reports">
              <Button variant="ghost" className="w-full justify-start">
                <BarChart3 className="w-4 h-4 mr-2" />
                Reportes
              </Button>
            </Link>
          </>
        )}
      </nav>

      <Button onClick={handleLogout} variant="outline" className="w-full justify-start">
        <LogOut className="w-4 h-4 mr-2" />
        Cerrar Sesión
      </Button>
    </aside>
  )
}
