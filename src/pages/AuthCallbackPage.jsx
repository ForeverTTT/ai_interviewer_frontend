import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { BrainCircuit, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function AuthCallbackPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [debugInfo, setDebugInfo] = useState('')
  // An OAuth authorization code is single-use. Reuse the in-flight exchange
  // when React StrictMode replays this effect in development.
  const exchangePromiseRef = useRef(null)

  useEffect(() => {
    document.title = t('meta.title')
  }, [t])

  useEffect(() => {
    let mounted = true
    let redirectTimer = null
    let cleanupAuthListener = null

    const showError = (message) => {
      if (!mounted) return
      setStatus('error')
      setErrorMsg(message)
    }

    const finish = () => {
      if (!mounted) return
      setStatus('success')
      redirectTimer = window.setTimeout(() => {
        if (mounted) navigate('/setup', { replace: true })
      }, 500)
    }

    const run = async () => {
      const searchParams = new URLSearchParams(window.location.search)
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const code = searchParams.get('code')
      const error = searchParams.get('error') || hashParams.get('error')
      const errorDescription = searchParams.get('error_description') || hashParams.get('error_description')
      const accessToken = hashParams.get('access_token')

      const debug = `search: ${window.location.search || '(empty)'} | hash: ${window.location.hash || '(empty)'}`
      if (mounted) setDebugInfo(debug)
      console.log('[AuthCallback]', debug)

      if (error) {
        console.error('[AuthCallback] OAuth error:', error, errorDescription)
        showError(decodeURIComponent(errorDescription || error))
        return
      }

      if (code) {
        console.log('[AuthCallback] Exchanging PKCE code...')
        exchangePromiseRef.current ??= supabase.auth.exchangeCodeForSession(code)
        const { data, error: exchangeError } = await exchangePromiseRef.current
        if (exchangeError) {
          console.error('[AuthCallback] Exchange error:', exchangeError)
          showError(t('auth.exchangeFail') + exchangeError.message)
          return
        }
        if (data?.session) {
          console.log('[AuthCallback] Session established via code exchange')
          finish()
          return
        }
      }

      if (accessToken) {
        console.log('[AuthCallback] Implicit flow token found in hash')
        const { data } = await supabase.auth.getSession()
        if (data?.session) {
          finish()
          return
        }
      }

      const { data: { session: existing } } = await supabase.auth.getSession()
      if (existing) {
        console.log('[AuthCallback] Session already exists')
        finish()
        return
      }

      console.log('[AuthCallback] Waiting for SIGNED_IN event...')
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('[AuthCallback] Auth event:', event, !!session)
        if (session) {
          subscription.unsubscribe()
          finish()
        }
      })

      const timer = window.setTimeout(() => {
        subscription.unsubscribe()
        console.warn('[AuthCallback] Timed out - no session received')
        showError(t('auth.timeout') + window.location.origin + '/auth/callback')
      }, 12000)

      const cleanup = () => {
        subscription.unsubscribe()
        window.clearTimeout(timer)
      }
      if (mounted) cleanupAuthListener = cleanup
      else cleanup()
    }

    void run()

    return () => {
      mounted = false
      if (redirectTimer) window.clearTimeout(redirectTimer)
      cleanupAuthListener?.()
    }
  }, [navigate, t])

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-slate-50 to-primary-50 px-4 overflow-hidden dark:from-slate-950 dark:to-slate-900">
      <div className="pointer-events-none absolute inset-0 bg-mesh-light opacity-35 dark:opacity-20" aria-hidden />
      <div className="relative z-[1] flex flex-col items-center gap-5 max-w-sm w-full text-center">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl ${
          status === 'error' ? 'bg-red-500' :
          status === 'success' ? 'bg-emerald-500' :
          'bg-gradient-to-br from-primary-600 to-violet-600'
        }`}>
          {status === 'error' && <AlertCircle className="w-9 h-9 text-white" />}
          {status === 'success' && <CheckCircle2 className="w-9 h-9 text-white" />}
          {status === 'loading' && <BrainCircuit className="w-9 h-9 text-white" />}
        </div>

        {status === 'loading' && (
          <>
            <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 dark:border-primary-900 dark:border-t-primary-400 rounded-full animate-spin" />
            <p className="text-slate-700 dark:text-slate-200 font-semibold">{t('auth.loading')}</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm">{t('auth.wait')}</p>
          </>
        )}

        {status === 'success' && <p className="text-emerald-600 font-semibold">{t('auth.success')}</p>}

        {status === 'error' && (
          <>
            <p className="text-red-600 font-semibold text-base whitespace-pre-line">{errorMsg}</p>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="mt-2 px-6 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              {t('auth.backNow')}
            </button>

            {debugInfo && (
              <details className="mt-4 text-left w-full">
                <summary className="text-xs text-slate-400 dark:text-slate-500 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300">{t('auth.debug')}</summary>
                <pre className="mt-2 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-300 break-all whitespace-pre-wrap">{debugInfo}</pre>
              </details>
            )}
          </>
        )}
      </div>
    </div>
  )
}
