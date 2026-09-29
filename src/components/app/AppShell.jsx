import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Home, LayoutDashboard, Mic, StickyNote, FilePenLine, UserCircle, Compass,
  BookOpen, BookMarked, Zap, LogOut, Briefcase, PanelLeftClose, PanelLeftOpen,
  Menu, X, ChevronRight, Mail,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useAccountStatus } from '../../hooks/useAccountStatus'
import { useTheme } from '../../context/ThemeContext'
import LanguageSwitcher from '../LanguageSwitcher'
import { AppThemeToggle } from '../ThemeToggle'
import PageAtmosphere from '../brand/PageAtmosphere'
import harborScene from '../../assets/background.jpg'

/**
 * 站内工作台外壳（登录后的页面）。
 *
 * 以前的导航分成两半：顶部一排标签 + 藏在头像下拉里的另外几个页面，用户很难知道站里到底有什么。
 * 现在所有页面都收进左侧一条液态玻璃侧栏，按「面试训练 / 求职材料 / 社区」分组，
 * 当前页一目了然；顶栏只剩面包屑和语言 / 主题开关。
 *
 * 内容放在一张圆角「纸面」上，背后是一层高斯模糊过的港口插画——
 * 玻璃侧栏透出这些颜色，才有真正的玻璃感。
 */

const COLLAPSE_KEY = 'landit_sidebar_collapsed'

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

function useNavGroups() {
  const { t } = useTranslation()
  return useMemo(() => [
    {
      id: 'practice',
      label: t('nav.groupPractice'),
      items: [
        { to: '/', label: t('nav.home'), icon: Home },
        { to: '/dashboard', label: t('nav.history'), icon: LayoutDashboard },
        { to: '/setup', label: t('nav.startInterview'), icon: Mic },
        { to: '/notes', label: t('nav.notes'), icon: StickyNote },
      ],
    },
    {
      id: 'materials',
      label: t('nav.groupMaterials'),
      items: [
        { to: '/resume-tailor', label: t('nav.resumeTailor'), icon: FilePenLine },
        { to: '/profile', label: t('nav.profile'), icon: UserCircle },
        { to: '/gallup', label: t('nav.gallup'), icon: Compass },
      ],
    },
    {
      id: 'community',
      label: t('nav.groupCommunity'),
      items: [
        { to: '/experiences', label: t('nav.experiences'), icon: BookOpen },
        { to: '/experiences?mine=true', label: t('nav.myExperiences'), icon: BookMarked },
      ],
    },
  ], [t])
}

function isItemActive(item, location) {
  const mine = new URLSearchParams(location.search).get('mine') === 'true'
  const path = location.pathname
  if (item.to === '/experiences?mine=true') return path === '/experiences' && mine
  if (item.to === '/experiences') return path === '/experiences' && !mine
  if (item.to === '/profile') return path === '/profile' || path === '/profile/edit'
  // 报告页挂在成长中心下面
  if (item.to === '/dashboard') return path === '/dashboard' || /^\/interview\/[^/]+\/report$/.test(path)
  return path === item.to
}

function Avatar({ src, initial, seeking, size = 'h-9 w-9' }) {
  return (
    <span className="relative shrink-0">
      <span className={`${size} grid place-items-center overflow-hidden rounded-full bg-brand-ink text-[12px] font-bold text-brand-on-ink ring-2 ring-white/70 dark:ring-white/10`}>
        {src ? <img src={src} alt="Avatar" className="h-full w-full object-cover" /> : initial}
      </span>
      <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-brand-card ${seeking ? 'bg-brand-success' : 'bg-brand-line'}`} />
    </span>
  )
}

/** 侧栏内容：桌面端固定侧栏与移动端抽屉共用 */
function SidebarContent({ collapsed, onToggleCollapse, onNavigate, account, variant = 'desktop' }) {
  const { t } = useTranslation()
  const { user, signOut } = useAuth()
  const { isDark } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const groups = useNavGroups()
  const { jobStatus, avatarSrc, tokens, toggleJobStatus } = account

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || ''
  const initial = user?.user_metadata?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'
  const seeking = jobStatus === 'seeking'

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
    onNavigate?.()
  }

  return (
    <div className="flex h-full flex-col">
      {/* 品牌 + 折叠 */}
      <div className={`flex items-center ${collapsed ? 'flex-col gap-3 px-2 pt-5' : 'justify-between px-5 pt-5'}`}>
        <Link to="/" onClick={onNavigate} className="group flex items-center gap-2.5" aria-label="LandIt">
          <img
            src={isDark ? '/landit-icon-dark.svg' : '/landit-icon-light.svg'}
            alt="LandIt Logo"
            className="h-9 w-9 shrink-0 rounded-[10px] transition-transform duration-500 ease-out-soft group-hover:-rotate-6"
          />
          {!collapsed && (
            <span className="font-brand text-[19px] font-bold leading-none tracking-[-0.02em] text-brand-ink">
              Land<span className="italic text-brand-ochre">It</span>
            </span>
          )}
        </Link>
        {variant === 'desktop' && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="grid h-8 w-8 place-items-center rounded-lg text-brand-muted transition-colors hover:bg-white/50 hover:text-brand-ink dark:hover:bg-white/10"
            aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
            title={collapsed ? t('nav.expand') : t('nav.collapse')}
          >
            {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
          </button>
        )}
      </div>

      {/* 导航分组 */}
      <nav className={`mt-6 flex-1 space-y-6 overflow-y-auto scrollbar-hide ${collapsed ? 'px-2.5' : 'px-3'}`} aria-label={t('nav.menu')}>
        {groups.map(group => (
          <div key={group.id}>
            {collapsed
              ? <div className="mx-auto mb-2 h-px w-6 bg-brand-ink/10" aria-hidden="true" />
              : <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted/80">{group.label}</p>}
            <ul className="space-y-0.5">
              {group.items.map(item => {
                const active = isItemActive(item, location)
                const Icon = item.icon
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={onNavigate}
                      title={collapsed ? item.label : undefined}
                      aria-current={active ? 'page' : undefined}
                      className={`group/nav relative flex items-center gap-3 rounded-2xl text-[13.5px] font-medium transition-colors ${collapsed ? 'h-11 justify-center' : 'px-3 py-2.5'} ${active ? 'text-brand-ink' : 'text-brand-ink/70 hover:text-brand-ink'}`}
                    >
                      {active && (
                        <motion.span
                          layoutId={`sidebar-active-${variant}`}
                          className="lk-liquid-pill absolute inset-0 rounded-2xl"
                          transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                        />
                      )}
                      {!active && <span className="absolute inset-0 rounded-2xl bg-white/0 transition-colors group-hover/nav:bg-white/35 dark:group-hover/nav:bg-white/[0.06]" />}
                      <Icon className={`relative h-[18px] w-[18px] shrink-0 ${active ? 'text-brand-ink' : ''}`} strokeWidth={active ? 2.2 : 1.9} />
                      {!collapsed && <span className="relative truncate">{item.label}</span>}
                      {!collapsed && active && <span className="relative ml-auto h-1.5 w-1.5 rounded-full bg-brand-ochre" aria-hidden="true" />}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* 能量值 */}
      <div className={`${collapsed ? 'px-2.5' : 'px-3'} pb-3 pt-4`}>
        {collapsed ? (
          <Link to="/profile" onClick={onNavigate} title={`${t('nav.tokens')} · ${tokens}`} className="flex flex-col items-center gap-0.5 rounded-2xl bg-white/40 py-2.5 text-[11px] font-semibold tabular-nums text-brand-ink dark:bg-white/[0.06]">
            <Zap className="h-4 w-4 fill-brand-ochre text-brand-ochre" />
            {tokens}
          </Link>
        ) : (
          <div className="relative overflow-hidden rounded-[20px] bg-brand-ink px-4 py-3.5 text-brand-on-ink">
            <div aria-hidden="true" className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgb(232_168_50/0.55),transparent_70%)]" />
            <div className="relative flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11.5px] opacity-75">
                <Zap className="h-3.5 w-3.5 fill-brand-ochre text-brand-ochre" />
                {t('nav.tokens')}
              </span>
              <span className="font-display text-[20px] font-semibold tabular-nums">{tokens}</span>
            </div>
            <Link to="/profile" onClick={onNavigate} className="relative mt-2.5 flex items-center justify-between rounded-xl bg-white/10 px-3 py-2 text-[12px] font-medium transition-colors hover:bg-white/15 dark:bg-black/10">
              {t('nav.energyCta')}
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* 账号 */}
      <div className={`border-t border-white/50 dark:border-white/10 ${collapsed ? 'space-y-2 px-2.5 py-3' : 'px-3 py-3'}`}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <button type="button" onClick={toggleJobStatus} title={seeking ? t('profile.statusSeeking') : t('profile.statusHired')}>
              <Avatar src={avatarSrc} initial={initial} seeking={seeking} />
            </button>
            <button type="button" onClick={handleSignOut} title={t('nav.signOut')} className="grid h-9 w-9 place-items-center rounded-xl text-brand-danger transition-colors hover:bg-brand-danger/10">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 px-2">
              <Avatar src={avatarSrc} initial={initial} seeking={seeking} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-brand-ink">{displayName}</p>
                <p className="truncate text-[11px] text-brand-muted">{user?.email}</p>
              </div>
              <button type="button" onClick={handleSignOut} title={t('nav.signOut')} aria-label={t('nav.signOut')} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-brand-muted transition-colors hover:bg-brand-danger/10 hover:text-brand-danger">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={toggleJobStatus}
              className="mt-2.5 flex w-full items-center justify-between rounded-xl px-3 py-2 text-[12px] text-brand-muted transition-colors hover:bg-white/40 hover:text-brand-ink dark:hover:bg-white/[0.06]"
            >
              <span className="flex items-center gap-2"><Briefcase className="h-3.5 w-3.5" />{t('profile.status')}</span>
              <span className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${seeking ? 'bg-brand-success/[0.14] text-brand-success' : 'bg-brand-inset text-brand-muted'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${seeking ? 'bg-brand-success' : 'bg-brand-muted'}`} />
                {seeking ? t('profile.statusSeeking') : t('profile.statusHired')}
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/** 当前页面的名字，用于顶栏面包屑 */
function useCurrentLabel() {
  const { t } = useTranslation()
  const location = useLocation()
  const groups = useNavGroups()
  const path = location.pathname
  if (/^\/interview\/[^/]+\/report$/.test(path)) return { parent: t('nav.history'), parentTo: '/dashboard', label: t('report.title') }
  if (path === '/profile/edit') return { parent: t('nav.profile'), parentTo: '/profile', label: t('profile.editProfile') }
  for (const g of groups) {
    const hit = g.items.find(item => isItemActive(item, location))
    if (hit) return { parent: g.label, label: hit.label }
  }
  return { label: '' }
}

export default function AppShell({ children }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const account = useAccountStatus(user)
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const crumb = useCurrentLabel()

  useEffect(() => {
    try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0') } catch { /* ignore */ }
  }, [collapsed])

  useEffect(() => { setDrawerOpen(false) }, [location.pathname, location.search])

  useEffect(() => {
    if (!drawerOpen) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setDrawerOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  const sidebarW = collapsed ? 84 : 264

  return (
    <div
      className="relative min-h-screen bg-brand-paper"
      style={{ '--ui-nav-h': '4.25rem', '--app-sidebar-w': `${sidebarW}px` }}
    >
      {/* 背景：高斯模糊的港口插画，只在侧栏和纸面四周露出来，让玻璃有东西可以「透」 */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute -inset-20 bg-cover opacity-[0.55] blur-[70px] saturate-[1.35] dark:opacity-[0.28]"
          style={{ backgroundImage: `url(${harborScene})`, backgroundPosition: 'center' }}
        />
        <div className="absolute inset-0 bg-brand-paper/40 dark:bg-brand-paper/55" />
      </div>

      {/* 桌面端侧栏 */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarW }}
        transition={{ type: 'spring', stiffness: 300, damping: 34 }}
        className="lk-liquid fixed bottom-3 left-3 top-3 z-40 hidden overflow-hidden rounded-[28px] lg:block"
      >
        <SidebarContent collapsed={collapsed} onToggleCollapse={() => setCollapsed(v => !v)} account={account} />
      </motion.aside>

      {/* 顶栏：面包屑 + 语言 / 主题；移动端带菜单按钮 */}
      <header
        className="fixed right-3 top-3 z-30 flex h-14 items-center justify-between gap-3 rounded-[20px] pl-3 pr-2 transition-[left] duration-300 lk-liquid left-3 lg:left-[calc(var(--app-sidebar-w)+1.5rem)]"
      >
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-brand-ink transition-colors hover:bg-white/50 lg:hidden"
            aria-label={t('nav.menu')}
          >
            <Menu className="h-5 w-5" />
          </button>
          <nav className="flex min-w-0 items-center gap-1.5 text-[13px]" aria-label="Breadcrumb">
            <Link to="/" className="hidden shrink-0 font-semibold text-brand-muted transition-colors hover:text-brand-ink sm:inline">LandIt</Link>
            {crumb.parent && (
              <>
                <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-brand-muted/60 sm:block" />
                {crumb.parentTo
                  ? <Link to={crumb.parentTo} className="hidden shrink-0 text-brand-muted transition-colors hover:text-brand-ink sm:inline">{crumb.parent}</Link>
                  : <span className="hidden shrink-0 text-brand-muted sm:inline">{crumb.parent}</span>}
              </>
            )}
            {crumb.label && (
              <>
                <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-brand-muted/60 sm:block" />
                <span className="truncate font-semibold text-brand-ink">{crumb.label}</span>
              </>
            )}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="mr-1 flex items-center gap-1 rounded-full bg-brand-ochre/15 px-2.5 py-1 text-[12px] font-semibold tabular-nums text-brand-ink lg:hidden">
            <Zap className="h-3 w-3 fill-brand-ochre text-brand-ochre" />
            {account.tokens}
          </span>
          <LanguageSwitcher variant="nav" />
          <AppThemeToggle variant="nav" />
        </div>
      </header>

      {/* 移动端抽屉 */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.button
              type="button"
              aria-label={t('nav.collapse')}
              className="fixed inset-0 z-50 bg-brand-ink/25 backdrop-blur-[2px] lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              className="lk-liquid fixed bottom-3 left-3 top-3 z-50 w-[min(300px,calc(100vw-1.5rem))] overflow-hidden rounded-[28px] lg:hidden"
              initial={{ x: '-110%' }}
              animate={{ x: 0 }}
              exit={{ x: '-110%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            >
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="absolute right-3 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg text-brand-muted hover:text-brand-ink"
                aria-label={t('nav.collapse')}
              >
                <X className="h-4 w-4" />
              </button>
              <SidebarContent collapsed={false} account={account} onNavigate={() => setDrawerOpen(false)} variant="mobile" />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* 内容纸面 */}
      <div className="relative z-10 transition-[padding] duration-300 lg:py-3 lg:pl-[calc(var(--app-sidebar-w)+1.5rem)] lg:pr-3">
        <div className="relative min-h-[100dvh] overflow-clip bg-brand-paper shadow-[0_0_0_1px_rgb(255_255_255/0.6)] lg:min-h-[calc(100dvh-1.5rem)] lg:rounded-[28px] dark:shadow-[0_0_0_1px_rgb(255_255_255/0.06)]">
          <PageAtmosphere />
          <main className="relative z-10">{children}</main>
          <AppFooter />
        </div>
      </div>
    </div>
  )
}

/** 站内精简页脚：版权 + 联系方式（完整页脚在首页） */
function AppFooter() {
  const { t } = useTranslation()
  return (
    <footer className="relative z-10 border-t border-brand-line px-6 py-5">
      <div className="flex flex-col items-center justify-between gap-2 text-[11.5px] text-brand-muted sm:flex-row">
        <span>{t('footer.copyright')}</span>
        <span className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <span>{t('footer.supportLang')}</span>
          <a href="mailto:support@landit.app" className="flex items-center gap-1.5 transition-colors hover:text-brand-ink">
            <Mail className="h-3.5 w-3.5" />support@landit.app
          </a>
        </span>
      </div>
    </footer>
  )
}
