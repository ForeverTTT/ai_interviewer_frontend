import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import harborScene from '../assets/background.jpg'
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brand-paper px-4">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-cover opacity-[0.35] blur-[60px] saturate-[1.3]" style={{ backgroundImage: `url(${harborScene})` }} />
      <div className="lk-liquid relative z-[1] flex w-full max-w-sm flex-col items-center gap-5 rounded-[28px] px-8 py-10 text-center">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lift ${
          status === 'error'   ? 'bg-brand-danger' :
          status === 'success' ? 'bg-brand-success' :
          'bg-brand-ink'
        }`}>
          {status === 'error' && <AlertCircle className="w-9 h-9 text-white" />}
          {status === 'success' && <CheckCircle2 className="w-9 h-9 text-white" />}
          {status === 'loading' && <BrainCircuit className="w-9 h-9 text-brand-on-ink" />}
        </div>

        {status === 'loading' && (
          <>
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-line border-t-brand-ink" />
            <p className="font-bold text-brand-ink">{t('auth.loading')}</p>
            <p className="text-[13px] text-brand-muted">{t('auth.wait')}</p>
          </>
        )}

        {status === 'success' && (
          <p className="font-bold text-brand-success">{t('auth.success')}</p>
        )}

        {status === 'error' && (
          <>
            <p className="whitespace-pre-line text-[15px] font-bold text-brand-danger">{errorMsg}</p>
            <p className="text-[13px] text-brand-muted">{t('auth.backSoon')}</p>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="lk-btn lk-btn-primary mt-2"
            >
              {t('auth.backNow')}
            </button>

            {debugInfo && (
              <details className="mt-4 text-left w-full">
                <summary className="cursor-pointer text-[12px] text-brand-muted transition-colors hover:text-brand-ink">{t('auth.debug')}</summary>
                <pre className="mt-2 whitespace-pre-wrap break-all rounded-lg bg-brand-inset p-3 text-[12px] text-brand-muted">{debugInfo}</pre>
              </details>
            )}
          </>
        )}
      </div>
    </div>
  )
}
