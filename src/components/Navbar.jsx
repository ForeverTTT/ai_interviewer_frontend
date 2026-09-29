import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import LanguageSwitcher from './LanguageSwitcher'
import { AppThemeToggle } from './ThemeToggle'
import { useTheme } from '../context/ThemeContext'
import { useAccountStatus } from '../hooks/useAccountStatus'
import { Menu, X, Zap, ChevronDown, LogOut, LayoutDashboard, UserCircle, Briefcase, BookOpen, FilePenLine, StickyNote, ArrowRight } from 'lucide-react'

/** 品牌标志 + 字标，顶栏和页脚共用 */
export function BrandLockup({ size = 'md' }) {
  const { isDark } = useTheme()
  const box = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9'
  const text = size === 'sm' ? 'text-[17px]' : 'text-[19px]'
  return (
    <span className="group flex items-center gap-2.5">
      <span className={`${box} grid shrink-0 place-items-center overflow-hidden rounded-[10px]`}>
        <img
          src={isDark ? '/landit-icon-dark.svg' : '/landit-icon-light.svg'}
          alt="LandIt Logo"
          className="h-full w-full object-contain transition-transform duration-500 ease-out-soft group-hover:-rotate-6 group-hover:scale-105"
        />
      </span>
      <span className={`font-brand ${text} font-bold leading-none tracking-[-0.02em] text-brand-ink`}>
        Land<span className="italic text-brand-ochre">It</span>
      </span>
    </span>
  )
}

export default function Navbar() {
  const { t } = useTranslation()
  const { user, signOut } = useAuth()
  const { jobStatus, avatarSrc, tokens, toggleJobStatus } = useAccountStatus(user)
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const dropdownRef = useRef(null)

  /* 滚动后顶栏收紧一点、玻璃更实，首页插画上方则保持通透 */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* 路由切换时收起菜单 */
  useEffect(() => {
    setMobileOpen(false)
    setDropdownOpen(false)
  }, [location.pathname])

  /* 点外面 / Esc 关闭账号菜单 */
  useEffect(() => {
    if (!dropdownOpen) return undefined
    const onDoc = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setDropdownOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [dropdownOpen])

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
    { to: '/dashboard', label: t('nav.history'), auth: true },
  ].filter(item => !item.auth || user)

  /** 账号菜单：桌面下拉与移动抽屉共用 */
  const accountLinks = [
    { to: '/dashboard', label: t('nav.history'), icon: LayoutDashboard },
    { to: '/notes', label: t('nav.notes'), icon: StickyNote },
    { to: '/resume-tailor', label: t('nav.resumeTailor'), icon: FilePenLine },
    { to: '/profile', label: t('nav.profile'), icon: UserCircle },
    { to: '/experiences?mine=true', label: t('nav.myExperiences'), icon: BookOpen },
  ]

  const isActive = (path) => {
    if (path === '/profile') {
      return location.pathname === '/profile' || location.pathname === '/profile/edit'
    }
    return location.pathname === path
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || ''
  const initial = user?.user_metadata?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'

  const Avatar = ({ size = 'h-8 w-8' }) => (
    <span className="relative shrink-0">
      <span className={`${size} grid place-items-center overflow-hidden rounded-full bg-brand-ink text-xs font-bold text-brand-on-ink ring-2 ring-brand-card`}>
        {avatarSrc ? <img src={avatarSrc} alt="Avatar" className="h-full w-full object-cover" /> : initial}
      </span>
      <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-brand-card ${jobStatus === 'seeking' ? 'bg-brand-success' : 'bg-brand-line'}`} />
    </span>
  )

  return (
    /* 浮动胶囊顶栏：高度含上下留白共 --ui-nav-h，页面顶部避让读同一个变量 */
    <nav className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5">
      <div
        className={`lk-liquid mx-auto flex h-[60px] max-w-[1320px] items-center justify-between gap-3 rounded-full pl-3 pr-2 transition-[background-color,box-shadow] duration-500 sm:pl-4 ${scrolled ? '!bg-brand-card/85' : ''}`}
      >
        <Link to="/" className="shrink-0 rounded-full pr-2" aria-label="LandIt">
          <BrandLockup />
        </Link>

        <div className="hidden min-w-0 items-center gap-0.5 lg:flex">
          {navItems.map(item => {
            const active = isActive(item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative whitespace-nowrap rounded-full px-3.5 py-2 text-[13.5px] font-medium transition-colors duration-200 xl:px-4 ${active ? 'text-brand-ink' : 'text-brand-muted hover:text-brand-ink'}`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active-pill"
                    className="lk-liquid-pill absolute inset-0 rounded-full"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative">{item.label}</span>
              </Link>
            )
          })}
        </div>

        <div className="hidden items-center gap-1.5 lg:flex">
          <LanguageSwitcher variant="nav" />
          <AppThemeToggle variant="nav" />

          {user ? (
            <div className="relative ml-1" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-expanded={dropdownOpen}
                aria-haspopup="menu"
                className={`group flex items-center gap-2.5 rounded-full border py-1 pl-1 pr-3 transition-colors ${dropdownOpen ? 'border-brand-ink/30 bg-brand-card' : 'border-transparent hover:border-brand-line hover:bg-brand-card/70'}`}
              >
                <Avatar />
                <span className="max-w-[110px] truncate text-[13px] font-semibold text-brand-ink">
                  {displayName}
                </span>
                <span className="flex items-center gap-1 rounded-full bg-brand-ochre/15 px-2 py-0.5 text-[11.5px] font-semibold tabular-nums text-brand-ink">
                  <Zap className="h-3 w-3 fill-brand-ochre text-brand-ochre" />
                  {tokens}
                </span>
                <ChevronDown className={`h-4 w-4 text-brand-muted transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    role="menu"
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="brand-float absolute right-0 z-50 mt-3 w-72 max-w-[calc(100vw-2rem)] origin-top-right overflow-hidden rounded-[22px] p-2 shadow-float"
                  >
                    {/* 账号卡：名字 + 能量值 */}
                    <div className="relative mb-1 overflow-hidden rounded-[16px] bg-brand-inset px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar size="h-10 w-10" />
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium text-brand-muted">{t('nav.profile')}</p>
                          <p className="truncate text-[13.5px] font-semibold text-brand-ink">
                            {user.user_metadata?.full_name || user.email}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between rounded-xl bg-brand-card px-3 py-2">
                        <span className="flex items-center gap-1.5 text-[11.5px] text-brand-muted">
                          <Zap className="h-3.5 w-3.5 fill-brand-ochre text-brand-ochre" />
                          {t('nav.tokens')}
                        </span>
                        <span className="text-[13px] font-semibold tabular-nums text-brand-ink">{tokens}</span>
                      </div>
                    </div>

                    {accountLinks.map(({ to, label, icon: Icon }) => (
                      <Link
                        key={to}
                        to={to}
                        role="menuitem"
                        className="group/item flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-brand-muted transition-colors hover:bg-brand-inset hover:text-brand-ink"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="flex-1">{label}</span>
                        <ArrowRight className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all duration-200 group-hover/item:translate-x-0 group-hover/item:opacity-100" />
                      </Link>
                    ))}

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleJobStatus()
                      }}
                      role="menuitem"
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-medium text-brand-muted transition-colors hover:bg-brand-inset hover:text-brand-ink"
                    >
                      <span className="flex items-center gap-3">
                        <Briefcase className="h-4 w-4" />
                        <span>{t('profile.status')}</span>
                      </span>
                      <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${jobStatus === 'seeking' ? 'bg-brand-success/[0.12] text-brand-success' : 'bg-brand-inset text-brand-muted'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${jobStatus === 'seeking' ? 'bg-brand-success' : 'bg-brand-muted'}`} />
                        {jobStatus === 'seeking' ? t('profile.statusSeeking') : t('profile.statusHired')}
                      </span>
                    </button>

                    <div className="mx-3 my-1.5 h-px bg-brand-line" />

                    <button
                      onClick={handleSignOut}
                      role="menuitem"
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-brand-danger transition-colors hover:bg-brand-danger/[0.07]"
                    >
                      <LogOut className="h-4 w-4" />
                      {t('nav.signOut')}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="ml-1 flex items-center gap-1">
              <Link to="/login" className="rounded-full px-4 py-2 text-[13.5px] font-medium text-brand-muted transition-colors hover:text-brand-ink">
                {t('nav.login')}
              </Link>
              <Link to="/login" className="lk-btn lk-btn-primary !px-5 !py-2.5 !text-[13px]">
                {t('nav.signUpFree')}
              </Link>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          {user && (
            <span className="mr-1 flex items-center gap-1 rounded-full bg-brand-ochre/15 px-2.5 py-1 text-[12px] font-semibold tabular-nums text-brand-ink">
              <Zap className="h-3 w-3 fill-brand-ochre text-brand-ochre" />
              {tokens}
            </span>
          )}
          <button
            className="grid h-10 w-10 place-items-center rounded-full text-brand-ink transition-colors hover:bg-brand-card"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="brand-float mx-auto mt-2 max-h-[calc(100dvh-var(--ui-nav-h)-1rem)] max-w-[1320px] overflow-y-auto rounded-[26px] p-3 shadow-float lg:hidden"
          >
            {/* 与桌面端共用 navItems，顺序一致 */}
            <div className="grid gap-0.5">
              {navItems.map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center justify-between rounded-2xl px-4 py-3 font-display text-[19px] font-semibold tracking-tight ${isActive(item.to) ? 'bg-brand-inset text-brand-ink' : 'text-brand-ink/85'}`}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                  <ArrowRight className="h-4 w-4 text-brand-muted" />
                </Link>
              ))}
            </div>

            {user ? (
              <div className="mt-2 border-t border-brand-line pt-2">
                <div className="flex items-center gap-3 px-4 py-3">
                  <Avatar size="h-9 w-9" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-brand-ink">{displayName}</p>
                    <p className="text-[11.5px] text-brand-muted">{t('nav.tokens')} · <span className="tabular-nums">{tokens}</span></p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleJobStatus}
                    className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${jobStatus === 'seeking' ? 'bg-brand-success/[0.12] text-brand-success' : 'bg-brand-inset text-brand-muted'}`}
                  >
                    <Briefcase className="h-3 w-3" />
                    {jobStatus === 'seeking' ? t('profile.statusSeeking') : t('profile.statusHired')}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5 px-1">
                  {accountLinks.map(({ to, label, icon: Icon }) => (
                    <Link
                      key={to}
                      to={to}
                      className="flex items-center gap-2 rounded-xl bg-brand-inset px-3 py-2.5 text-[12.5px] font-medium text-brand-ink"
                      onClick={() => setMobileOpen(false)}
                    >
                      <Icon className="h-4 w-4 text-brand-muted" />
                      <span className="truncate">{label}</span>
                    </Link>
                  ))}
                  <button onClick={handleSignOut} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[12.5px] font-semibold text-brand-danger">
                    <LogOut className="h-4 w-4" />
                    {t('nav.signOut')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-brand-line px-1 pt-3">
                <Link to="/login" className="lk-btn lk-btn-ghost" onClick={() => setMobileOpen(false)}>{t('nav.login')}</Link>
                <Link to="/login" className="lk-btn lk-btn-primary" onClick={() => setMobileOpen(false)}>{t('nav.signUpFree')}</Link>
              </div>
            )}
            <div className="mt-3 flex items-center justify-between border-t border-brand-line px-2 pt-3">
              <LanguageSwitcher />
              <AppThemeToggle />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
