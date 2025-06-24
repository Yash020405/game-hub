'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: AuthError }>
  signUp: (email: string, password: string, username?: string) => Promise<{ error?: AuthError }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Handle OAuth callback and clean URL
    const handleAuthCallback = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (data?.session) {
        // Clean the URL of OAuth tokens for security
        const url = new URL(window.location.href)
        if (url.hash.includes('access_token') || url.searchParams.has('code')) {
          window.history.replaceState({}, document.title, url.pathname)
        }
      }
      return { data, error }
    }

    // Get initial session
    handleAuthCallback().then(({ data }) => {
      setUser(data?.session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
      
      // Clean URL on auth state change
      if (event === 'SIGNED_IN' && session) {
        const url = new URL(window.location.href)
        if (url.hash.includes('access_token') || url.searchParams.has('code')) {
          window.history.replaceState({}, document.title, url.pathname)
        }
      }
      
      // Create user profile on sign up
      if (event === 'SIGNED_IN' && session?.user) {
        await supabase.from('user_profiles').upsert({
          id: session.user.id,
          email: session.user.email!,
          username: session.user.user_metadata?.username,
          total_score: 0,
          games_completed: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error: error || undefined }
  }

  const signUp = async (email: string, password: string, username?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    })
    return { error: error || undefined }
  }

  const signOut = async () => {
    try {
      console.log('Starting sign out process...')
      
      // Call Supabase sign out first
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Supabase sign out error:', error)
        // Force clear local state if Supabase fails
        setUser(null)
      }
      
      console.log('Sign out successful')
      
    } catch (error) {
      console.error('Sign out failed:', error)
      // Force clear local state on error
      setUser(null)
    }
  }

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 