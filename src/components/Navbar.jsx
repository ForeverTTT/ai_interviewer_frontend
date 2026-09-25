import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import LanguageSwitcher from './LanguageSwitcher'
import { AppThemeToggle } from './ThemeToggle'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import { getBackendBaseUrl } from '../lib/backendBase'
import { authenticatedFetch } from '../lib/authenticatedFetch'
import { Menu, X, BrainCircuit, ChevronDown, LogOut, LayoutDashboard, UserCircle, Briefcase, BookOpen, FilePenLine, StickyNote } from 'lucide-react'

export default function Navbar() {
  const { t } = useTranslation()
  const { user, signOut } = useAuth()
  const { isDark } = useTheme()
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
      let session = null
      const fetchOwnTokensDirectly = async () => {
        const userId = session?.user?.id || user.id
        const { data, error } = await supabase
          .from('profiles')
          .select('tokens')
          .eq('id', userId)
          .maybeSingle()
        if (!error && data?.tokens !== undefined) setTokens(data.tokens)
      }
      try {
        const sessionResult = await supabase.auth.getSession()
        session = sessionResult.data.session
        if (!session?.access_token) return

        const backendUrl = getBackendBaseUrl()
        const res = await authenticatedFetch(`${backendUrl}/api/profile`)
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
          return
        }
        await fetchOwnTokensDirectly()
      } catch (err) {
        console.error('Failed to fetch job status', err)
        await fetchOwnTokensDirectly()
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
      await authenticatedFetch(`${backendUrl}/api/profile`, {
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

  /**
   * 顶部菜单。顺序由这张表决定，桌面端和移动端抽屉共用同一份，
   * 改顺序只动这里。auth: true 的项仅登录后出现。
   */
  const navItems = [
    { to: '/', label: t('nav.home') },
    { to: '/setup', label: t('nav.startInterview'), auth: true },
    { to: '/resume-tailor', label: t('nav.resumeTailor'), auth: true },
    { to: '/experiences', label: t('nav.experiences') },
    { to: '/gallup', label: t('nav.gallup'), auth: true },
    { to: '/dashboard', label: t('nav.personalCenter'), auth: true },
  ].filter(item => !item.auth || user)

  const isActive = (path) => {
    if (path === '/profile') {
      return location.pathname === '/profile' || location.pathname === '/profile/edit'
    }
    return location.pathname === path
  }

  return (
    /* 通栏固定条：高度取自 --ui-nav-h，页面顶部避让读同一个变量 */
    <nav className="theme-quiet fixed inset-x-0 top-0 z-50 bg-brand-paper/85 backdrop-blur-xl">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-[var(--ui-nav-h)] items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 overflow-hidden flex items-center justify-center">
              <img
                src={isDark ? '/landit-icon-dark.svg' : '/landit-icon-light.svg'}
                alt="LandIt Logo"
                className="w-full h-full object-contain transition-transform group-hover:scale-[1.1] group-hover:rotate-3 duration-500"
              />
            </div>
            <span className="font-brand text-xl font-black leading-none tracking-tight text-brand-ink">
              Land<span className="italic text-brand-violet">It</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-2">
            {navItems.map(item => (
              <Link
                key={item.to}
                to={item.to}
                className="relative whitespace-nowrap px-4 py-2 text-[14px] font-semibold text-brand-ink transition-opacity duration-200 hover:opacity-70"
              >
                {item.label}
                {isActive(item.to) && (
                  <span className="absolute -bottom-1 left-4 right-4 h-[2px] rounded-full bg-brand-ink" />
                )}
              </Link>
            ))}
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
                  className="group flex items-center gap-3 rounded-full border border-brand-line bg-brand-card py-1.5 pl-2 pr-4 transition-colors hover:border-brand-ink/40"
                >
                  <div className="relative">
                    <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-brand-ink text-xs font-bold text-brand-on-ink">
                      {avatarId ? (
                        <img src={avatarId.startsWith('data:') || avatarId.startsWith('http') ? avatarId : `/avatars/${avatarId}.png`} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        user.user_metadata?.full_name?.[0] || user.email?.[0]?.toUpperCase() || 'U'
                      )}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-brand-card ${jobStatus === 'seeking' ? 'bg-brand-success' : 'bg-brand-line'}`} />
                  </div>
                  <span className="max-w-[100px] truncate text-[13px] font-semibold text-brand-ink">
                    {user.user_metadata?.full_name || user.email.split('@')[0]}
                  </span>
                  <div className="flex items-center gap-1.5 rounded-md border border-brand-line bg-brand-inset px-2 py-0.5">
                    <BrainCircuit className="h-3 w-3 text-brand-muted" />
                    <span className="text-[11px] font-semibold tabular-nums text-brand-ink">{tokens}</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-brand-muted transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="brand-float absolute right-0 z-50 mt-3 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-brand-line py-3">
                    <div className="mb-2 border-b border-brand-line px-5 pb-3">
                      <p className="mb-1 text-[11px] font-medium text-brand-muted">{t('nav.profile')}</p>
                      <p className="truncate text-[13px] font-semibold text-brand-ink">
                        {user.user_metadata?.full_name || user.email}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[11px] text-brand-muted">{t('nav.tokens')}</span>
                        <span className="text-[12px] font-semibold tabular-nums text-brand-ink">{tokens}</span>
                      </div>
                    </div>
                    <Link
                      to="/dashboard"
                      className="flex items-center gap-3 px-5 py-2.5 text-[13px] font-medium text-brand-muted transition-colors hover:bg-brand-inset hover:text-brand-ink"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      {t('nav.personalCenter')}
                    </Link>
                    <Link
                      to="/notes"
                      className="flex items-center gap-3 px-5 py-2.5 text-[13px] font-medium text-brand-muted transition-colors hover:bg-brand-inset hover:text-brand-ink"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <StickyNote className="w-4 h-4" />
                      {t('nav.notes')}
                    </Link>
                    <Link
                      to="/resume-tailor"
                      className="flex items-center gap-3 px-5 py-2.5 text-[13px] font-medium text-brand-muted transition-colors hover:bg-brand-inset hover:text-brand-ink"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <FilePenLine className="w-4 h-4" />
                      {t('nav.resumeTailor')}
                    </Link>
                    <Link
                      to="/profile"
                      className="flex items-center gap-3 px-5 py-2.5 text-[13px] font-medium text-brand-muted transition-colors hover:bg-brand-inset hover:text-brand-ink"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <UserCircle className="w-4 h-4" />
                      {t('nav.profile')}
                    </Link>
                    <Link
                      to="/experiences?mine=true"
                      className="flex items-center gap-3 px-5 py-2.5 text-[13px] font-medium text-brand-muted transition-colors hover:bg-brand-inset hover:text-brand-ink"
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
                      className="flex w-full items-center justify-between px-5 py-2.5 text-[13px] font-medium text-brand-muted transition-colors hover:bg-brand-inset hover:text-brand-ink"
                    >
                      <div className="flex items-center gap-3">
                        <Briefcase className="w-4 h-4" />
                        <span>{t('profile.status')}</span>
                      </div>
                      <span className={`rounded-md px-2 py-1 text-[12px] ${jobStatus === 'seeking' ? 'border border-brand-line bg-brand-inset font-medium text-brand-ink' : 'border border-transparent bg-brand-inset text-brand-muted'}`}>
                        {jobStatus === 'seeking' ? t('profile.statusSeeking') : t('profile.statusHired')}
                      </span>
                    </button>
                    <div className="my-2 px-5">
                      <div className="h-px bg-brand-line" />
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-3 px-5 py-2.5 text-[13px] font-medium text-brand-danger transition-colors hover:bg-brand-inset"
                    >
                      <LogOut className="w-4 h-4" />
                      {t('nav.signOut')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/login" className="text-[13px] font-semibold text-brand-muted transition-colors hover:text-brand-ink">
                  {t('nav.login')}
                </Link>
                <Link to="/login" className="rounded-full bg-brand-ink px-5 py-2.5 text-[13px] font-semibold text-brand-on-ink transition-transform duration-200 hover:-translate-y-0.5">
                  {t('nav.signUpFree')}
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 md:hidden">
            <button
              className="rounded-lg p-2 text-brand-ink transition-colors hover:bg-brand-inset"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="max-h-[calc(100dvh-var(--ui-nav-h))] space-y-5 overflow-y-auto border-t border-brand-line bg-brand-paper p-7 md:hidden">
          {/* 与桌面端共用 navItems，顺序一致；个人资料和退出登录是移动端专有的收尾项 */}
          {navItems.map(item => (
            <Link key={item.to} to={item.to} className="block font-brand text-xl font-semibold tracking-tight text-brand-ink" onClick={() => setMobileOpen(false)}>{item.label}</Link>
          ))}
          {user ? (
            <>
              <Link to="/notes" className="block font-brand text-xl font-semibold tracking-tight text-brand-ink" onClick={() => setMobileOpen(false)}>{t('nav.notes')}</Link>
              <Link to="/profile" className="block font-brand text-xl font-semibold tracking-tight text-brand-ink" onClick={() => setMobileOpen(false)}>{t('nav.profile')}</Link>
              <button onClick={handleSignOut} className="w-full py-3 text-left font-brand text-xl font-semibold tracking-tight text-brand-danger">{t('nav.signOut')}</button>
            </>
          ) : (
            <>
              <Link to="/login" className="block font-brand text-xl font-semibold tracking-tight text-brand-ink" onClick={() => setMobileOpen(false)}>{t('nav.login')}</Link>
              <Link to="/login" className="block w-full rounded-full bg-brand-ink px-8 py-3.5 text-center text-[14px] font-semibold text-brand-on-ink" onClick={() => setMobileOpen(false)}>{t('nav.signUpFree')}</Link>
            </>
          )}
          <div className="flex items-center justify-between border-t border-brand-line pt-6">
            <LanguageSwitcher />
            <AppThemeToggle />
          </div>
        </div>
      )}
    </nav>
  )
}
