import { useEffect, useState } from 'react'
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

  useEffect(() => {
    document.title = t('meta.title')
  }, [t])

  useEffect(() => {
    const run = async () => {
      const searchParams = new URLSearchParams(window.location.search)
      const hashParams   = new URLSearchParams(window.location.hash.replace(/^#/, ''))

      const code             = searchParams.get('code')
      const error            = searchParams.get('error')            || hashParams.get('error')
      const errorDescription = searchParams.get('error_description') || hashParams.get('error_description')
      const accessToken      = hashParams.get('access_token')

      const debug = `search: ${window.location.search || '(empty)'} | hash: ${window.location.hash || '(empty)'}`
      setDebugInfo(debug)
      console.log('[AuthCallback]', debug)

      if (error) {
        console.error('[AuthCallback] OAuth error:', error, errorDescription)
        setStatus('error')
        setErrorMsg(decodeURIComponent(errorDescription || error))
        setTimeout(() => navigate('/login', { replace: true }), 3000)
        return
      }

      if (code) {
        console.log('[AuthCallback] Exchanging PKCE code...')
        const { data, error: ex } = await supabase.auth.exchangeCodeForSession(code)
        if (ex) {
          console.error('[AuthCallback] Exchange error:', ex)
          setStatus('error')
          setErrorMsg(t('auth.exchangeFail') + ex.message)
          setTimeout(() => navigate('/login', { replace: true }), 3000)
          return
        }
        if (data?.session) {
          console.log('[AuthCallback] Session established via code exchange')
          setStatus('success')
          setTimeout(() => navigate('/setup', { replace: true }), 500)
          return
        }
      }

      if (accessToken) {
        console.log('[AuthCallback] Implicit flow token found in hash')
        const { data } = await supabase.auth.getSession()
        if (data?.session) {
          setStatus('success')
          setTimeout(() => navigate('/setup', { replace: true }), 500)
          return
        }
      }

      const { data: { session: existing } } = await supabase.auth.getSession()
      if (existing) {
        console.log('[AuthCallback] Session already exists')
        setStatus('success')
        setTimeout(() => navigate('/setup', { replace: true }), 500)
        return
      }

      console.log('[AuthCallback] Waiting for SIGNED_IN event...')
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('[AuthCallback] Auth event:', event, !!session)
        if (session) {
          subscription.unsubscribe()
          setStatus('success')
          navigate('/setup', { replace: true })
        }
      })

      const timer = setTimeout(() => {
        subscription.unsubscribe()
        console.warn('[AuthCallback] Timed out – no session received')
        setStatus('error')
        setErrorMsg(t('auth.timeout') + window.location.origin + '/auth/callback')
      }, 12000)

      return () => {
        subscription.unsubscribe()
        clearTimeout(timer)
      }
    }

    run()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid re-running OAuth flow on language change
  }, [navigate])

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brand-paper px-4">
      <div className="relative z-[1] flex flex-col items-center gap-5 max-w-sm w-full text-center">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl ${
          status === 'error'   ? 'bg-brand-danger' :
          status === 'success' ? 'bg-brand-success' :
          'bg-brand-ink'
        }`}>
          {status === 'error'   && <AlertCircle className="w-9 h-9 text-white" />}
          {status === 'success' && <CheckCircle2 className="w-9 h-9 text-white" />}
          {status === 'loading' && <BrainCircuit className="w-9 h-9 text-white" />}
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
              className="mt-2 rounded-xl bg-brand-ink px-6 py-2.5 text-[13px] font-semibold text-brand-on-ink transition-opacity duration-200 hover:opacity-90"
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
