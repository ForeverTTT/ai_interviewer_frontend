import { useEffect, useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { AppThemeToggle } from '../components/ThemeToggle'
import { BrainCircuit, ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { motion } from 'framer-motion'

export default function LoginPage() {
  const { t } = useTranslation()
  const { user, loading, signInWithGoogle, signInWithLinkedIn, signInLocal } = useAuth()
  const [loginError, setLoginError] = useState('')
  const [localBusy, setLocalBusy] = useState(false)
  const isLocalSupabase = import.meta.env.VITE_LOCAL_SUPABASE === 'true'
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

  const handleLocalLogin = async () => {
    setLoginError('')
    setLocalBusy(true)
    try {
      await signInLocal()
    } catch (error) {
      console.error('Local login error:', error)
      setLoginError(error?.message || 'Local login failed')
    } finally {
      setLocalBusy(false)
    }
  }

  const features = [
    { text: t('login.feat1') },
    { text: t('login.feat2') },
    { text: t('login.feat3') },
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col md:flex-row overflow-hidden">
      {/* Left side - Visual/Branding (Desktop Only) */}
      <div className="hidden md:flex md:w-1/2 bg-slate-50 dark:bg-slate-900 items-center justify-center p-20 relative">
        <div className="absolute inset-0 bg-dot-grid opacity-10" />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-md space-y-12 relative z-10"
        >
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <BrainCircuit className="w-3 h-3 text-primary-600" />
            {t('login.welcome')}
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white font-chinese-modern leading-[1.2] tracking-tight uppercase">
            Elevate your <br />
            <span className="text-primary-600">interview</span> <br />
            performance.
          </h2>
          <div className="space-y-6">
            {features.map((feat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-center gap-4 text-sm font-bold text-slate-500 dark:text-slate-400"
              >
                <div className="w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
                {feat.text}
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="absolute bottom-10 left-10 flex items-center gap-4">
          <LanguageSwitcher />
          <AppThemeToggle />
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 lg:p-24 relative bg-white dark:bg-slate-950">
        <Link
          to="/"
          className="absolute top-8 left-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          {t('login.back')}
        </Link>

        {/* Mobile only controls */}
        <div className="md:hidden absolute top-8 right-8 flex items-center gap-2">
          <LanguageSwitcher />
          <AppThemeToggle />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm space-y-12"
        >
          <div className="space-y-4">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white font-chinese-modern tracking-tight uppercase">
              {t('login.welcome')}<span className="text-primary-600">DE</span>
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              {t('login.subtitle')}
            </p>
          </div>

          <div className="space-y-4">
            {isLocalSupabase && (
              <button
                onClick={handleLocalLogin}
                disabled={localBusy}
                className="w-full group flex items-center justify-between px-6 py-4 bg-primary-600 rounded-full text-white text-sm font-bold hover:bg-primary-700 disabled:opacity-60 transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <BrainCircuit className="w-5 h-5" />
                  {localBusy ? 'Starting local session…' : 'Continue with local account'}
                </div>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            )}

            {loginError && (
              <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-xs font-bold text-red-600 dark:bg-red-950/40 dark:text-red-300">
                {loginError}
              </p>
            )}

            {!isLocalSupabase && <button
              onClick={handleGoogleLogin}
              className="w-full group flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-full text-slate-900 dark:text-white text-sm font-bold hover:border-slate-900 dark:hover:border-white transition-all duration-300"
            >
              <div className="flex items-center gap-4">
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {t('login.google')}
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white group-hover:translate-x-1 transition-all" />
            </button>}

            {!isLocalSupabase && <button
              onClick={handleLinkedInLogin}
              className="w-full group flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white text-sm font-bold hover:border-slate-900 dark:hover:border-white transition-all duration-300"
            >
              <div className="flex items-center gap-4">
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#0077B5" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
                {t('login.linkedin')}
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white group-hover:translate-x-1 transition-all" />
            </button>}
          </div>

          <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 text-center leading-relaxed">
              {t('login.terms')}
            </p>
          </div>
        </motion.div>

        {/* Bottom decorative element */}
        <div className="absolute bottom-12 flex gap-4 opacity-20 hidden lg:flex">
          <div className="w-px h-12 bg-slate-900 dark:bg-white" />
          <div className="w-px h-12 bg-slate-900 dark:bg-white opacity-50" />
          <div className="w-px h-12 bg-slate-900 dark:bg-white opacity-25" />
        </div>
      </div>
    </div>
  )
}
