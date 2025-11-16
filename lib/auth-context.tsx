'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { auth, db } from './firebase'
import { onAuthStateChanged, User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

export type UserRole = 'admin' | 'user'

export interface AppUser extends User {
  role: UserRole
  displayName: string | null
  isActive: boolean
}

interface AuthContextType {
  user: AppUser | null
  loading: boolean
  error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true)
      setError(null)

      try {
        if (!firebaseUser) {
          setUser(null)
          setLoading(false)
          return
        }

        const uid = firebaseUser.uid
        const email = firebaseUser.email?.toLowerCase() || null

        let userDoc = null

        // 1) Intentar buscar por UID (caso admin: docId = uid)
        const uidRef = doc(db, 'users', uid)
        let snap = await getDoc(uidRef)

        // 2) Si no existe y tenemos email, buscar por email (docId = email)
        if (!snap.exists() && email) {
          const emailRef = doc(db, 'users', email)
          snap = await getDoc(emailRef)
        }

        if (!snap.exists()) {
          setError('Tu correo no está registrado en el sistema. Contacta a un administrador.')
          setUser(null)
          setLoading(false)
          return
        }

        userDoc = snap.data() as any

        if (userDoc.isActive === false) {
          setError('Tu cuenta ha sido desactivada. Contacta a un administrador.')
          setUser(null)
          setLoading(false)
          return
        }

        setUser({
          ...firebaseUser,
          role: (userDoc.role as UserRole) || 'user',
          displayName: (userDoc.displayName as string) || firebaseUser.displayName,
          isActive: userDoc.isActive !== false,
        } as AppUser)
      } catch (err) {
        console.error(err)
        setError('Error al cargar el usuario')
        setUser(null)
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, error }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}
