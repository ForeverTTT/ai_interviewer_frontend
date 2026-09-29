import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'

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
          <img src="/landit-icon-light.svg" alt="" className="h-12 w-12 animate-pulse-soft rounded-2xl dark:hidden" />
          <img src="/landit-icon-dark.svg" alt="" className="hidden h-12 w-12 animate-pulse-soft rounded-2xl dark:block" />
          <div className="h-1 w-24 overflow-hidden rounded-full bg-brand-line">
            <div className="h-full w-1/2 animate-[lk-marquee_1.1s_linear_infinite] rounded-full bg-brand-ochre" />
          </div>
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
