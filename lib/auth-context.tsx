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
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          if (userDoc.exists()) {
            const data = userDoc.data()
            
            if (!data.isActive) {
              setError('Tu cuenta ha sido desactivada')
              setUser(null)
            } else {
              setUser({
                ...firebaseUser,
                role: data.role || 'user',
                displayName: data.displayName || firebaseUser.displayName,
                isActive: data.isActive !== false,
              } as AppUser)
            }
          } else {
            setError('Usuario no existe en la base de datos')
            setUser(null)
          }
        } catch (err) {
          setError('Error al cargar el usuario')
          console.error(err)
        }
      } else {
        setUser(null)
      }
      setLoading(false)
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
