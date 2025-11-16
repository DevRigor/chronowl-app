'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '@/lib/firebase'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from 'firebase/auth'
import {
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // (si más adelante quieres usar login/registro por password, ya están listos)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Error en el login')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(result.user, { displayName })

      const emailLower = email.trim().toLowerCase()

      // crear doc del usuario con id = UID (para este flujo)
      await setDoc(doc(db, 'users', result.user.uid), {
        email: emailLower,
        displayName: displayName.trim(),
        role: 'user',
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Error en el registro')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)

    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      const user = result.user

      if (!user.email) {
        throw new Error('Tu cuenta de Google no tiene un email asociado.')
      }

      const uid = user.uid
      const emailLower = user.email.toLowerCase()

      console.log('[login] uid:', uid, 'email:', emailLower)

      // 1) Intentar por UID (caso admin con docId = uid)
      let snap = await getDoc(doc(db, 'users', uid))

      // 2) Si no existe, intentar por ID = email
      if (!snap.exists()) {
        snap = await getDoc(doc(db, 'users', emailLower))
      }

      // 3) Fallback extra: por campo email (por si quedara algún doc con ID random)
      if (!snap.exists()) {
        const usersRef = collection(db, 'users')
        const q = query(usersRef, where('email', '==', emailLower))
        const qSnap = await getDocs(q)
        if (!qSnap.empty) {
          snap = qSnap.docs[0]
        }
      }

      if (!snap.exists()) {
        console.log('[login] No user doc found for this account')
        await signOut(auth)
        setError('Tu correo no está registrado en el sistema. Contacta a un administrador.')
        return
      }

      const userData = snap.data() as any
      console.log('[login] userDoc:', userData)

      if (userData.isActive === false) {
        await signOut(auth)
        setError('Tu cuenta ha sido desactivada. Contacta a un administrador.')
        return
      }

      // Todo OK: dejamos que AuthContext termine de cargar y vamos al dashboard
      router.push('/dashboard')
    } catch (err: any) {
      console.error('[login] Error al iniciar sesión con Google:', err)
      setError(err.message || 'Error al iniciar sesión con Google')
      await signOut(auth)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Gestión de Horas</CardTitle>
          <CardDescription>
            Sistema de gestión de horas extra y ausencias
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="button"
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={loading}
            size="lg"
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión con Google'}
          </Button>

          <p className="text-sm text-muted-foreground text-center">
            Si tu correo no está registrado, contacta a un administrador.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
