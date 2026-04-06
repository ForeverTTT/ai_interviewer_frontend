import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import LanguageSwitcher from './LanguageSwitcher'
import { AppThemeToggle } from './ThemeToggle'
import { supabase } from '../lib/supabase'
import { getBackendBaseUrl } from '../lib/backendBase'
import { Menu, X, BrainCircuit, ChevronDown, LogOut, LayoutDashboard, UserCircle, Briefcase, BookOpen } from 'lucide-react'

export default function Navbar() {
  const { t } = useTranslation()
  const { user, signOut } = useAuth()
  const [jobStatus, setJobStatus] = useState('seeking')
  const [avatarId, setAvatarId] = useState(null)
  const [tokens, setTokens] = useState(0)
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    if (!user) return

    const fetchStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        if (!token) return

        const backendUrl = getBackendBaseUrl()
        const res = await fetch(`${backendUrl}/api/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const j = await res.json()
          if (j.jobSearchStatus !== undefined && j.jobSearchStatus !== null) {
            setJobStatus(j.jobSearchStatus)
          }
          if (j.avatarId) {
            setAvatarId(j.avatarId)
          }
          if (j.tokens !== undefined) {
            setTokens(j.tokens)
          }
        }
      } catch (err) {
        console.error('Failed to fetch job status', err)
      }
    }

    const onTokensChanged = () => { void fetchStatus() }

    fetchStatus()
    window.addEventListener('tokensChanged', onTokensChanged)

    // Supabase Realtime: instantly reflect token changes from DB (cross-tab, cross-device)
    const channel = supabase
      .channel(`navbar-tokens-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new?.tokens !== undefined) {
            setTokens(payload.new.tokens)
          }
        }
      )
      .subscribe()

    return () => {
      window.removeEventListener('tokensChanged', onTokensChanged)
      supabase.removeChannel(channel)
    }
  }, [user])

  const toggleJobStatus = async () => {
    const newStatus = jobStatus === 'seeking' ? 'hired' : 'seeking'
    setJobStatus(newStatus)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) return

      const backendUrl = getBackendBaseUrl()
      await fetch(`${backendUrl}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ jobSearchStatus: newStatus }),
      })
    } catch (err) {
      console.error('Failed to update job status', err)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
    setDropdownOpen(false)
  }

  const isActive = (path) => {
    if (path === '/profile') {
      return location.pathname === '/profile' || location.pathname === '/profile/edit'
    }
    return location.pathname === path
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none transition-all duration-500">
      <div className="pointer-events-auto w-full max-w-[80rem] bg-white/70 dark:bg-slate-950/70 backdrop-blur-2xl rounded-b-2xl border-x border-b border-slate-200/50 dark:border-slate-800/50 shadow-lg shadow-slate-900/[0.04] px-6 lg:px-8 overflow-visible">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 overflow-hidden flex items-center justify-center">
              <img 
                src="/crab_logo.png" 
                alt="OfferClaw Logo" 
                className="w-full h-full object-contain mix-blend-multiply transition-transform group-hover:scale-[1.1] group-hover:rotate-3 duration-500" 
              />
            </div>
            <span className="font-black text-xl tracking-tighter text-slate-900 dark:text-white uppercase leading-none">
              Offer<span className="text-orange-500">Claw</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-2">
            <Link
              to="/"
              className={`relative px-4 py-2 text-sm font-bold whitespace-nowrap transition-all duration-300 ${isActive('/')
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              {t('nav.home')}
              {isActive('/') && (
                <span className="absolute -bottom-1 left-4 right-4 h-[3px] bg-primary-600 dark:bg-primary-400 rounded-full" />
              )}
            </Link>
            {user && (
              <>
                <Link
                  to="/setup"
                  className={`relative px-4 py-2 text-sm font-bold whitespace-nowrap transition-all duration-300 ${isActive('/setup')
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                  {t('nav.startInterview')}
                  {isActive('/setup') && (
                    <span className="absolute -bottom-1 left-4 right-4 h-[3px] bg-primary-600 dark:bg-primary-400 rounded-full" />
                  )}
                </Link>
                <Link
                  to="/dashboard"
                  className={`relative px-4 py-2 text-sm font-bold whitespace-nowrap transition-all duration-300 ${isActive('/dashboard')
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                  {t('nav.history')}
                  {isActive('/dashboard') && (
                    <span className="absolute -bottom-1 left-4 right-4 h-[3px] bg-primary-600 dark:bg-primary-400 rounded-full" />
                  )}
                </Link>
                <Link
                  to="/profile"
                  className={`relative px-4 py-2 text-sm font-bold whitespace-nowrap transition-all duration-300 ${isActive('/profile')
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                  {t('nav.profile')}
                  {isActive('/profile') && (
                    <span className="absolute -bottom-1 left-4 right-4 h-[3px] bg-primary-600 dark:bg-primary-400 rounded-full" />
                  )}
                </Link>
              </>
            )}
            <Link
              to="/experiences"
              className={`relative px-4 py-2 text-sm font-bold whitespace-nowrap transition-all duration-300 ${isActive('/experiences')
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              {t('nav.experiences')}
              {isActive('/experiences') && (
                <span className="absolute -bottom-1 left-4 right-4 h-[3px] bg-primary-600 dark:bg-primary-400 rounded-full" />
              )}
            </Link>
            {user && (
              <>
                <Link
                  to="/gallup"
                  className={`relative px-4 py-2 text-sm font-bold whitespace-nowrap transition-all duration-300 ${isActive('/gallup')
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                  {t('nav.gallup')}
                  {isActive('/gallup') && (
                    <span className="absolute -bottom-1 left-4 right-4 h-[3px] bg-primary-600 dark:bg-primary-400 rounded-full" />
                  )}
                </Link>
              </>
            )}
          </div>

          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-1">
              <LanguageSwitcher />
              <AppThemeToggle />
            </div>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-3 pl-2 pr-4 py-1.5 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all group"
                >
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-black overflow-hidden">
                      {avatarId ? (
                        <img src={avatarId.startsWith('data:') || avatarId.startsWith('http') ? avatarId : `/avatars/${avatarId}.png`} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        user.user_metadata?.full_name?.[0] || user.email?.[0]?.toUpperCase() || 'U'
                      )}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-950 ${jobStatus === 'seeking' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  </div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200 max-w-[100px] truncate">
                    {user.user_metadata?.full_name || user.email.split('@')[0]}
                  </span>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
                    <BrainCircuit className="w-3 h-3 text-emerald-500" />
                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">{tokens}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-4 w-64 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-950 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-900 py-4 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="px-6 py-4 border-b border-slate-50 dark:border-slate-900 mb-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{t('nav.profile')}</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {user.user_metadata?.full_name || user.email}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('nav.tokens')}</span>
                        <span className="text-xs font-black text-emerald-500">{tokens}</span>
                      </div>
                    </div>
                    <Link
                      to="/dashboard"
                      className="flex items-center gap-3 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      {t('nav.history')}
                    </Link>
                    <Link
                      to="/profile"
                      className="flex items-center gap-3 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <UserCircle className="w-4 h-4" />
                      {t('nav.profile')}
                    </Link>
                    <Link
                      to="/experiences?mine=true"
                      className="flex items-center gap-3 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <BookOpen className="w-4 h-4" />
                      {t('nav.myExperiences')}
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleJobStatus()
                      }}
                      className="flex items-center justify-between w-full px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Briefcase className="w-4 h-4" />
                        <span>{t('profile.status')}</span>
                      </div>
                      <span className={`px-2 py-1 rounded-lg ${jobStatus === 'seeking' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                        }`}>
                        {jobStatus === 'seeking' ? t('profile.statusSeeking') : t('profile.statusHired')}
                      </span>
                    </button>
                    <div className="my-2 px-6">
                      <div className="h-px bg-slate-50 dark:bg-slate-900" />
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-3 w-full px-6 py-3 text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                    >
                      <LogOut className="w-4 h-4" />
                      {t('nav.signOut')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/login" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:hover:text-white">
                  {t('nav.login')}
                </Link>
                <Link to="/login" className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-lg shadow-slate-900/10">
                  {t('nav.signUpFree')}
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 md:hidden">
            <button
              className="p-2 rounded-xl text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-900 transition-all"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="pointer-events-auto md:hidden bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-900 p-8 space-y-6 animate-in slide-in-from-top-4 duration-500 font-chinese-modern uppercase">
          <Link to="/" className="block text-2xl font-black text-slate-900 dark:text-white tracking-tighter" onClick={() => setMobileOpen(false)}>{t('nav.home')}</Link>
          <Link to="/experiences" className="block text-2xl font-black text-slate-900 dark:text-white tracking-tighter" onClick={() => setMobileOpen(false)}>{t('nav.experiences')}</Link>
          {user ? (
            <>
              <Link to="/setup" className="block text-2xl font-black text-slate-900 dark:text-white tracking-tighter" onClick={() => setMobileOpen(false)}>{t('nav.startInterview')}</Link>
              <Link to="/dashboard" className="block text-2xl font-black text-slate-900 dark:text-white tracking-tighter" onClick={() => setMobileOpen(false)}>{t('nav.history')}</Link>
              <Link to="/profile" className="block text-2xl font-black text-slate-900 dark:text-white tracking-tighter" onClick={() => setMobileOpen(false)}>{t('nav.profile')}</Link>
              <button onClick={handleSignOut} className="w-full text-left text-2xl font-black text-red-600 py-4 tracking-tighter">{t('nav.signOut')}</button>
            </>
          ) : (
            <>
              <Link to="/login" className="block text-2xl font-black text-slate-900 dark:text-white tracking-tighter" onClick={() => setMobileOpen(false)}>{t('nav.login')}</Link>
              <Link to="/login" className="block w-full text-center px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black uppercase tracking-widest rounded-full shadow-xl" onClick={() => setMobileOpen(false)}>{t('nav.signUpFree')}</Link>
            </>
          )}
          <div className="pt-8 flex items-center justify-between border-t border-slate-100 dark:border-slate-900">
            <LanguageSwitcher />
            <AppThemeToggle />
          </div>
        </div>
      )}
    </nav>
  )
}
