import { useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { AppThemeToggle } from '../components/ThemeToggle'
import { BrainCircuit, ArrowLeft } from 'lucide-react'

export default function LoginPage() {
  const { t } = useTranslation()
  const { user, loading, signInWithGoogle, signInWithLinkedIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/setup'

  useEffect(() => {
    document.title = t('meta.title')
  }, [t])

  useEffect(() => {
    if (!loading && user) {
      navigate(from, { replace: true })
    }
  }, [user, loading, navigate, from])

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error('Google login error:', error)
    }
  }

  const handleLinkedInLogin = async () => {
    try {
      await signInWithLinkedIn()
    } catch (error) {
      console.error('LinkedIn login error:', error)
    }
  }

  const features = [
    { icon: '🎯', text: t('login.feat1') },
    { icon: '🗣️', text: t('login.feat2') },
    { icon: '📊', text: t('login.feat3') },
  ]

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-slate-50 via-primary-50/25 to-violet-50/25 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center px-4 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-mesh-light opacity-40 dark:opacity-25" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-dot-grid opacity-[0.2] dark:opacity-[0.12]" aria-hidden />
      <div className="pointer-events-none absolute top-[-20%] right-[-10%] w-[min(480px,70vw)] h-[min(480px,70vw)] rounded-full bg-primary-200/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-15%] left-[-10%] w-[min(400px,60vw)] h-[min(400px,60vw)] rounded-full bg-violet-200/25 blur-3xl" />
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 flex items-center gap-2">
        <LanguageSwitcher />
        <AppThemeToggle />
      </div>

      <Link
        to="/"
        className="absolute top-6 left-6 z-10 flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors text-sm font-semibold rounded-xl px-2 py-1 hover:bg-white/60 dark:hover:bg-slate-800/80 backdrop-blur-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('login.back')}
      </Link>

      <div className="w-full max-w-md relative z-[1]">
        <div className="relative rounded-[1.75rem] p-[1px] bg-gradient-to-br from-slate-200/90 via-white to-primary-200/50 shadow-card dark:from-slate-700 dark:via-slate-800 dark:to-primary-900/40">
          <div className="bg-white/95 backdrop-blur-sm rounded-[1.7rem] p-8 sm:p-10 ring-1 ring-slate-900/[0.04] dark:bg-slate-900/95 dark:ring-slate-700">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-glow-primary ring-1 ring-white/20 mb-5">
              <BrainCircuit className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {t('login.welcome')}<span className="text-primary-600 dark:text-primary-400">DE</span>
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-2 text-center leading-relaxed max-w-xs">
              {t('login.subtitle')}
            </p>
          </div>

          <div className="space-y-3.5">
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white border border-slate-200/90 rounded-2xl text-slate-800 font-semibold hover:border-slate-300 hover:bg-slate-50/80 transition-all duration-300 shadow-soft hover:shadow-card ring-1 ring-slate-900/[0.03] group dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700 dark:hover:border-slate-500"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {t('login.google')}
            </button>

            <button
              onClick={handleLinkedInLogin}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white border border-slate-200/90 rounded-2xl text-slate-800 font-semibold hover:border-slate-300 hover:bg-slate-50/80 transition-all duration-300 shadow-soft hover:shadow-card ring-1 ring-slate-900/[0.03] group dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700 dark:hover:border-slate-500"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#0077B5" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
              {t('login.linkedin')}
            </button>
          </div>

          <div className="flex items-center gap-3 my-7">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-600" />
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap px-1">{t('login.divider')}</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-600" />
          </div>

          <div className="space-y-3">
            {features.map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400 py-2.5 px-3 rounded-xl bg-slate-50/80 ring-1 ring-slate-100/80 dark:bg-slate-800/60 dark:ring-slate-700">
                <span className="text-base shrink-0">{item.icon}</span>
                <span className="leading-snug">{item.text}</span>
              </div>
            ))}
          </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 dark:text-slate-500 mt-6 leading-relaxed px-2">
          {t('login.terms')}
        </p>
      </div>
    </div>
  )
}
