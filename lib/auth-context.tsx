// lib/auth-context.tsx
'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { auth, db } from './firebase'
import { onAuthStateChanged, User } from 'firebase/auth'
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore'
import { normalizeEmail } from './email'

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
          console.log('[auth] No firebaseUser')
          setUser(null)
          setLoading(false)
          return
        }

        const uid = firebaseUser.uid
        const rawEmail = firebaseUser.email
        const normalizedEmail = rawEmail ? normalizeEmail(rawEmail) : null

        console.log('[auth] uid:', uid)
        console.log('[auth] rawEmail:', rawEmail)
        console.log('[auth] normalizedEmail:', normalizedEmail)

        // 1) Intentar por UID (admin "sembrado")
        let snap = await getDoc(doc(db, 'users', uid))

        // 2) Si no existe y hay email normalizado, buscar por ID = email
        if (!snap.exists() && normalizedEmail) {
          snap = await getDoc(doc(db, 'users', normalizedEmail))
        }

        // 3) Fallback: buscar por campo "email" == email normalizado
        if (!snap.exists() && normalizedEmail) {
          const usersRef = collection(db, 'users')
          const q = query(usersRef, where('email', '==', normalizedEmail))
          const qSnap = await getDocs(q)

          if (!qSnap.empty) {
            snap = qSnap.docs[0]
          }
        }

        if (!snap.exists()) {
          console.log('[auth] user doc NOT found for this account')
          setError('Tu correo no está registrado en el sistema. Contacta a un administrador.')
          setUser(null)
          setLoading(false)
          return
        }

        const userDoc = snap.data() as any
        console.log('[auth] userDoc:', userDoc)

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
        console.error('[auth] Error loading user:', err)
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
