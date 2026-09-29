import { useEffect, useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { AppThemeToggle } from '../components/ThemeToggle'
import { BrainCircuit, ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import harborScene from '../assets/background.jpg'

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

  const btnBase = 'group flex w-full items-center justify-between rounded-full px-5 py-3.5 text-[14px] font-semibold transition-all duration-300 hover:-translate-y-0.5'

  return (
    <div className="relative flex min-h-screen flex-col bg-brand-paper lg:flex-row">
      {/* 左：港口插画 + 玻璃信息卡（桌面端） */}
      <div className="relative hidden p-3 lg:block lg:w-[54%]">
        <div className="relative h-full min-h-[calc(100vh-1.5rem)] overflow-hidden rounded-[32px]">
          <motion.img
            src={harborScene}
            alt=""
            aria-hidden="true"
            initial={{ scale: 1.08 }}
            animate={{ scale: 1 }}
            transition={{ duration: 2.4, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 h-full w-full object-cover object-[80%_50%]"
          />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#1B2A37]/55 via-transparent to-transparent dark:from-[#0E141A]/80" />

          <Link to="/" className="lk-liquid absolute left-6 top-6 inline-flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-4">
            <img src="/landit-icon-light.svg" alt="LandIt Logo" className="h-8 w-8 rounded-full" />
            <span className="font-brand text-[16px] font-bold tracking-[-0.02em] text-brand-ink">Land<span className="italic text-brand-ochre">It</span></span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="lk-liquid absolute bottom-6 left-6 right-6 max-w-lg rounded-[28px] p-7"
          >
            <p className="lk-eyebrow">{t('login.divider')}</p>
            <h2 className="lk-display mt-3 text-[30px] leading-[1.15]">
              Elevate your <span className="italic text-brand-harbor">interview</span> performance.
            </h2>
            <ul className="mt-5 space-y-3">
              {features.map((feat, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  className="flex items-center gap-3 text-[13.5px] text-brand-ink"
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-ochre text-[#22303D]">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  {feat.text}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>

      {/* 右：登录表单 */}
      <div className="relative flex flex-1 flex-col px-6 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-brand-line bg-brand-card px-3.5 py-2 text-[12.5px] font-medium text-brand-muted transition-colors hover:border-brand-ink/30 hover:text-brand-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('login.back')}
          </Link>
          <div className="flex items-center gap-1.5">
            <LanguageSwitcher />
            <AppThemeToggle />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-sm"
          >
            {/* 移动端没有左侧插画，用一张窄横幅代替 */}
            <div className="relative mb-8 h-36 overflow-hidden rounded-[24px] lg:hidden">
              <img src={harborScene} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-[75%_55%]" />
            </div>

            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-line bg-brand-card px-3 py-1 text-[11.5px] font-semibold text-brand-muted">
              <BrainCircuit className="h-3.5 w-3.5 text-brand-ochre" />
              LandIt
            </div>
            <h1 className="lk-display text-[34px] leading-tight">
              {t('login.welcome')}
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-brand-muted">
              {t('login.subtitle')}
            </p>

            <div className="mt-9 space-y-3">
              {isLocalSupabase && (
                <button
                  onClick={handleLocalLogin}
                  disabled={localBusy}
                  className={`${btnBase} bg-brand-ink text-brand-on-ink shadow-lift disabled:opacity-50`}
                >
                  <span className="flex items-center gap-3.5">
                    <BrainCircuit className="h-5 w-5" />
                    {localBusy ? 'Starting local session…' : 'Continue with local account'}
                  </span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
              )}

              {loginError && (
                <p role="alert" className="rounded-xl border border-brand-danger/30 bg-brand-danger/[0.07] px-4 py-3 text-[12.5px] font-bold text-brand-danger">
                  {loginError}
                </p>
              )}

              {!isLocalSupabase && <button
                onClick={handleGoogleLogin}
                className={`${btnBase} border border-brand-line bg-brand-card text-brand-ink shadow-sm hover:border-brand-ink/30 hover:shadow-lift`}
              >
                <span className="flex items-center gap-3.5">
                  <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {t('login.google')}
                </span>
                <ArrowRight className="h-4 w-4 text-brand-muted transition-all group-hover:translate-x-1 group-hover:text-brand-ink" />
              </button>}

              {!isLocalSupabase && <button
                onClick={handleLinkedInLogin}
                className={`${btnBase} border border-brand-line bg-brand-card text-brand-ink shadow-sm hover:border-brand-ink/30 hover:shadow-lift`}
              >
                <span className="flex items-center gap-3.5">
                  <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#0077B5" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                  {t('login.linkedin')}
                </span>
                <ArrowRight className="h-4 w-4 text-brand-muted transition-all group-hover:translate-x-1 group-hover:text-brand-ink" />
              </button>}
            </div>

            {/* 移动端也要能看到三条卖点 */}
            <ul className="mt-8 space-y-2.5 lg:hidden">
              {features.map((feat, i) => (
                <li key={i} className="flex items-center gap-3 text-[13px] text-brand-muted">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-ochre text-[#22303D]"><Check className="h-3 w-3" strokeWidth={3} /></span>
                  {feat.text}
                </li>
              ))}
            </ul>

            <div className="mt-10 border-t border-brand-line pt-6">
              <p className="text-center text-[11.5px] leading-relaxed text-brand-muted">
                {t('login.terms')}
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
