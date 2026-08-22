import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
  }

  const signInWithLinkedIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
  }

  const signInLocal = async () => {
    if (import.meta.env.VITE_LOCAL_SUPABASE !== 'true') {
      throw new Error('Local authentication is disabled')
    }

    const email = import.meta.env.VITE_LOCAL_EMAIL || 'local@example.com'
    const password = import.meta.env.VITE_LOCAL_PASSWORD || 'localdev123'
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (!signInError) return
    if (!/invalid login credentials/i.test(signInError.message || '')) throw signInError

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: 'Local Developer' } },
    })
    if (signUpError) throw signUpError

    // Local Supabase normally disables email confirmation. If a customized
    // config enables it, surface a useful error instead of silently looping.
    if (!data.session) {
      throw new Error('Local account created; disable email confirmation or confirm it in Mailpit')
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return { user, loading, signInWithGoogle, signInWithLinkedIn, signInLocal, signOut }
}
