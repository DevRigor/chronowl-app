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
          console.log('[auth] no firebaseUser')
          setUser(null)
          setLoading(false)
          return
        }

        const uid = firebaseUser.uid
        const email = firebaseUser.email?.toLowerCase() || null

        console.log('[auth] uid:', uid, 'email:', email)

        let snap = await getDoc(doc(db, 'users', uid)) // caso admin sembrado

        // 2) Si no existe por UID y tenemos email, buscar por ID = email
        if (!snap.exists() && email) {
          snap = await getDoc(doc(db, 'users', email))
        }

        // 3) Fallback opcional: buscar por campo email si el ID fuera aleatorio
        if (!snap.exists() && email) {
          const usersRef = collection(db, 'users')
          const q = query(usersRef, where('email', '==', email))
          const qSnap = await getDocs(q)
          if (!qSnap.empty) {
            snap = qSnap.docs[0]
          }
        }

        if (!snap.exists()) {
          console.log('[auth] user doc not found')
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
