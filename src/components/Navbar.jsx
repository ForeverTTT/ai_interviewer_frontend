import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import LanguageSwitcher from './LanguageSwitcher'
import { AppThemeToggle } from './ThemeToggle'
import { Menu, X, BrainCircuit, ChevronDown, LogOut, LayoutDashboard, UserCircle } from 'lucide-react'

export default function Navbar() {
  const { t } = useTranslation()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    document.title = t('meta.title')
  }, [t])

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
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div
        className="pointer-events-none absolute bottom-0 left-4 right-4 h-px max-w-7xl mx-auto bg-gradient-to-r from-transparent via-primary-400/25 to-transparent sm:left-6 sm:right-6 lg:left-8 lg:right-8"
        aria-hidden
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[4.25rem]">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-600 to-violet-600 rounded-xl flex items-center justify-center shadow-soft ring-1 ring-white/20 group-hover:shadow-glow-primary group-hover:scale-[1.03] transition-all duration-300">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-slate-100">
              Interview<span className="text-primary-600 dark:text-primary-400">DE</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-0.5 p-1 rounded-2xl bg-slate-900/[0.03] ring-1 ring-slate-900/[0.04] dark:bg-white/[0.05] dark:ring-white/[0.08]">
            <Link
              to="/"
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                isActive('/')
                  ? 'bg-white text-primary-700 shadow-soft ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-primary-300 dark:ring-slate-600'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/80'
              }`}
            >
              {t('nav.home')}
            </Link>
            {user && (
              <>
                <Link
                  to="/setup"
                  className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive('/setup')
                      ? 'bg-white text-primary-700 shadow-soft ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-primary-300 dark:ring-slate-600'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/80'
                  }`}
                >
                  {t('nav.startInterview')}
                </Link>
                <Link
                  to="/dashboard"
                  className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive('/dashboard')
                      ? 'bg-white text-primary-700 shadow-soft ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-primary-300 dark:ring-slate-600'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/80'
                  }`}
                >
                  {t('nav.history')}
                </Link>
                <Link
                  to="/profile"
                  className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive('/profile')
                      ? 'bg-white text-primary-700 shadow-soft ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-primary-300 dark:ring-slate-600'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/80'
                  }`}
                >
                  {t('nav.profile')}
                </Link>
                <Link
                  to="/gallup"
                  className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive('/gallup')
                      ? 'bg-white text-primary-700 shadow-soft ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-primary-300 dark:ring-slate-600'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/80'
                  }`}
                >
                  {t('nav.gallup')}
                </Link>
              </>
            )}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher />
            <AppThemeToggle />
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-2xl hover:bg-slate-100/80 transition-all duration-200 ring-1 ring-transparent hover:ring-slate-200/80 dark:hover:bg-slate-800/80 dark:hover:ring-slate-600"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold shadow-soft ring-2 ring-white dark:ring-slate-700">
                    {user.user_metadata?.full_name?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 max-w-[120px] truncate">
                    {user.user_metadata?.full_name || user.email}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white/95 backdrop-blur-md rounded-2xl shadow-card border border-slate-200/90 py-1.5 z-50 ring-1 ring-slate-900/[0.04] overflow-hidden dark:bg-slate-900/95 dark:border-slate-700 dark:ring-slate-800">
                    <Link
                      to="/dashboard"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors dark:text-slate-200 dark:hover:bg-slate-800"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <LayoutDashboard className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      {t('nav.history')}
                    </Link>
                    <Link
                      to="/profile"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors dark:text-slate-200 dark:hover:bg-slate-800"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <UserCircle className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      {t('nav.profile')}
                    </Link>
                    <hr className="my-1 border-slate-100 dark:border-slate-800" />
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors dark:hover:bg-red-950/40"
                    >
                      <LogOut className="w-4 h-4" />
                      {t('nav.signOut')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="btn-ghost text-sm">
                  {t('nav.login')}
                </Link>
                <Link to="/login" className="btn-primary text-sm py-2">
                  {t('nav.signUpFree')}
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <LanguageSwitcher className="scale-90" />
            <AppThemeToggle className="scale-90" />
            <button
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-white/98 backdrop-blur-md border-t border-slate-200/90 px-4 py-4 space-y-1 shadow-[0_-8px_32px_-8px_rgba(15,23,42,0.08)] dark:bg-slate-900/98 dark:border-slate-700">
          <Link to="/" className="block px-4 py-3 text-slate-700 hover:bg-slate-50 rounded-xl font-medium transition-colors dark:text-slate-200 dark:hover:bg-slate-800" onClick={() => setMobileOpen(false)}>{t('nav.home')}</Link>
          {user ? (
            <>
              <Link to="/setup" className="block px-4 py-3 text-slate-700 hover:bg-slate-50 rounded-xl font-medium transition-colors dark:text-slate-200 dark:hover:bg-slate-800" onClick={() => setMobileOpen(false)}>{t('nav.startInterview')}</Link>
              <Link to="/dashboard" className="block px-4 py-3 text-slate-700 hover:bg-slate-50 rounded-xl font-medium transition-colors dark:text-slate-200 dark:hover:bg-slate-800" onClick={() => setMobileOpen(false)}>{t('nav.history')}</Link>
              <Link to="/profile" className="block px-4 py-3 text-slate-700 hover:bg-slate-50 rounded-xl font-medium transition-colors dark:text-slate-200 dark:hover:bg-slate-800" onClick={() => setMobileOpen(false)}>{t('nav.profile')}</Link>
              <Link to="/gallup" className="block px-4 py-3 text-slate-700 hover:bg-slate-50 rounded-xl font-medium transition-colors dark:text-slate-200 dark:hover:bg-slate-800" onClick={() => setMobileOpen(false)}>{t('nav.gallup')}</Link>
              <button onClick={handleSignOut} className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-colors dark:hover:bg-red-950/40">{t('nav.signOut')}</button>
            </>
          ) : (
            <>
              <Link to="/login" className="block px-4 py-3 text-slate-700 hover:bg-slate-50 rounded-xl font-medium transition-colors dark:text-slate-200 dark:hover:bg-slate-800" onClick={() => setMobileOpen(false)}>{t('nav.login')}</Link>
              <Link to="/login" className="btn-primary w-full justify-center mt-2" onClick={() => setMobileOpen(false)}>{t('nav.signUpFree')}</Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
