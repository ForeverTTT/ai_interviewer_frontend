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
    <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-slate-50 to-primary-50 px-4 overflow-hidden dark:from-slate-950 dark:to-slate-900">
      <div className="pointer-events-none absolute inset-0 bg-mesh-light opacity-35 dark:opacity-20" aria-hidden />
      <div className="relative z-[1] flex flex-col items-center gap-5 max-w-sm w-full text-center">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl ${
          status === 'error'   ? 'bg-red-500' :
          status === 'success' ? 'bg-emerald-500' :
          'bg-gradient-to-br from-primary-600 to-violet-600'
        }`}>
          {status === 'error'   && <AlertCircle className="w-9 h-9 text-white" />}
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

        {status === 'success' && (
          <p className="text-emerald-600 font-semibold">{t('auth.success')}</p>
        )}

        {status === 'error' && (
          <>
            <p className="text-red-600 font-semibold text-base whitespace-pre-line">{errorMsg}</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm">{t('auth.backSoon')}</p>
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
