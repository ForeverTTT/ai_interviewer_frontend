import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react'
import './AuthCallbackPage.css'

const CALLBACK_MASCOT = '/brand/flowlab-logo-imagegen-felt-v1.png'

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
    <div className={`fl-auth-callback fl-auth-callback-${status}`}>
      <div className="fl-auth-orb fl-auth-orb-pink" aria-hidden="true" />
      <div className="fl-auth-orb fl-auth-orb-aqua" aria-hidden="true" />

      <Link to="/" className="fl-auth-brand" aria-label="FlowLab 不卡壳实验室">
        <img
          className="fl-auth-brand-wordmark"
          src="/brand/flowlab-wordmark-icon-o-v1.png"
          alt="FlowLab"
        />
      </Link>

      <main className="fl-auth-stage" aria-live="polite">
        <div className="fl-auth-mascot-wrap" aria-hidden="true">
          <span className="fl-auth-mascot-glow" />
          <img src={CALLBACK_MASCOT} alt="" />
          {status === 'success' && (
            <span className="fl-auth-state-icon fl-auth-state-success"><CheckCircle2 /></span>
          )}
          {status === 'error' && (
            <span className="fl-auth-state-icon fl-auth-state-error"><AlertCircle /></span>
          )}
        </div>

        {status === 'loading' && (
          <div className="fl-auth-copy">
            <p>{t('auth.loading')}</p>
            <span>{t('auth.wait')}</span>
            <div className="fl-auth-dots" aria-hidden="true"><i /><i /><i /></div>
          </div>
        )}

        {status === 'success' && (
          <div className="fl-auth-copy fl-auth-copy-success">
            <p>{t('auth.success')}</p>
            <div className="fl-auth-progress" aria-hidden="true"><span /></div>
          </div>
        )}

        {status === 'error' && (
          <div className="fl-auth-error-panel">
            <p>{errorMsg}</p>
            <span>{t('auth.backSoon')}</span>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="fl-auth-back-button"
            >
              <ArrowLeft />
              {t('auth.backNow')}
            </button>

            {debugInfo && (
              <details className="fl-auth-debug">
                <summary>{t('auth.debug')}</summary>
                <pre>{debugInfo}</pre>
              </details>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
