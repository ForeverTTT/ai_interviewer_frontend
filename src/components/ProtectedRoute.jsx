import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { BrainCircuit } from 'lucide-react'

export default function ProtectedRoute({ children }) {
  const { t } = useTranslation()
  const location = useLocation()
  const [state, setState] = useState({ user: null, loading: true })

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setState({ user: session?.user ?? null, loading: false })
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setState({ user: session?.user ?? null, loading: false })
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (state.loading) {
    return (
      <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-b from-slate-50 to-white overflow-hidden dark:from-slate-950 dark:to-slate-950">
        <div className="pointer-events-none absolute inset-0 bg-mesh-subtle opacity-60 dark:opacity-40" aria-hidden />
        <div className="relative z-[1] flex flex-col items-center gap-5">
          <div className="w-14 h-14 bg-gradient-to-br from-primary-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-glow-primary ring-1 ring-white/20">
            <BrainCircuit className="w-7 h-7 text-white" />
          </div>
          <div className="w-9 h-9 border-[3px] border-primary-100 border-t-primary-600 dark:border-primary-900 dark:border-t-primary-400 rounded-full animate-spin" />
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t('protected.loading')}</p>
        </div>
      </div>
    )
  }

  if (!state.user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
