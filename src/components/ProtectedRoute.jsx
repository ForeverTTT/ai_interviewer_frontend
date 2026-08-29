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
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brand-paper">
        {/* bg-mesh-subtle / shadow-glow-primary 在项目里都没有定义，是失效类，一并移除 */}
        <div className="relative z-[1] flex flex-col items-center gap-5">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-ink text-brand-on-ink">
            <BrainCircuit className="h-7 w-7" />
          </div>
          <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-brand-line border-t-brand-ink" />
          <p className="text-[13px] text-brand-muted">{t('protected.loading')}</p>
        </div>
      </div>
    )
  }

  if (!state.user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
