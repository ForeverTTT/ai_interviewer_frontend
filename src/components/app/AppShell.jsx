import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard, Mic, StickyNote, FilePenLine, UserCircle, Compass,
  BookOpen, BookMarked, Zap, LogOut, Briefcase, PanelLeftClose, PanelLeftOpen,
  Menu, X, ChevronRight, Mail,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useAccountStatus } from '../../hooks/useAccountStatus'
import LanguageSwitcher from '../LanguageSwitcher'
import { AppThemeToggle } from '../ThemeToggle'

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
const DEFAULT_USER_AVATAR = '/brand/flowlab-community-egg-avatar.png'
const BRAND_WORDMARK = '/brand/flowlab-wordmark-icon-o-v1.png'
const BRAND_ICON = '/brand/flowlab-shell-base-icon-v1.png'

function workspaceRole(pathname) {
  if (pathname === '/dashboard' || pathname === '/notes' || /^\/interview\/[^/]+\/report$/.test(pathname)) return 'review'
  if (pathname === '/gallup' || pathname === '/experiences') return 'community'
  if (pathname === '/resume-tailor' || pathname === '/profile' || pathname === '/profile/edit') return 'resume'
  if (pathname === '/setup') return 'coach'
  return 'practice'
}

function workspaceSurface(pathname, search) {
  if (pathname === '/dashboard') return 'dashboard'
  if (pathname === '/notes') return 'notes'
  if (/^\/interview\/[^/]+\/report$/.test(pathname)) return 'report'
  if (pathname === '/gallup') return 'gallup'
  if (pathname === '/experiences') {
    return new URLSearchParams(search).get('mine') === 'true' ? 'my-experiences' : 'experiences'
  }
  return 'default'
}

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
        { to: '/setup', label: t('nav.startInterview'), icon: Mic, dot: 'bg-[#33466D]' },
        { to: '/dashboard', label: t('nav.history'), icon: LayoutDashboard, dot: 'bg-[#638F56]' },
        { to: '/notes', label: t('nav.notes'), icon: StickyNote, dot: 'bg-[#638F56]' },
      ],
    },
    {
      id: 'materials',
      label: t('nav.groupMaterials'),
      items: [
        { to: '/profile', label: t('nav.profile'), icon: UserCircle, dot: 'bg-[#D95788]' },
        { to: '/resume-tailor', label: t('nav.resumeTailor'), icon: FilePenLine, dot: 'bg-[#D95788]' },
      ],
    },
    {
      id: 'community',
      label: t('nav.groupCommunity'),
      items: [
        { to: '/gallup', label: t('nav.gallup'), icon: Compass, dot: 'bg-[#DDAA46]' },
        { to: '/experiences', label: t('nav.experiences'), icon: BookOpen, dot: 'bg-[#DDAA46]' },
        { to: '/experiences?mine=true', label: t('nav.myExperiences'), icon: BookMarked, dot: 'bg-[#DDAA46]' },
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

function Avatar({ src, seeking, size = 'h-9 w-9' }) {
  return (
    <span className="relative shrink-0">
      <span className={`${size} grid place-items-center overflow-hidden rounded-full bg-[#fff7e7] ring-2 ring-white/70 dark:ring-white/10`}>
        <img src={src || DEFAULT_USER_AVATAR} alt="Avatar" className={`h-full w-full ${src ? 'object-cover' : 'object-contain p-0.5'}`} />
      </span>
      <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-brand-card ${seeking ? 'bg-brand-success' : 'bg-brand-line'}`} />
    </span>
  )
}

/** 侧栏内容：桌面端固定侧栏与移动端抽屉共用 */
function SidebarContent({ collapsed, onToggleCollapse, onNavigate, account, variant = 'desktop' }) {
  const { t } = useTranslation()
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const groups = useNavGroups()
  const { jobStatus, avatarSrc, tokens, toggleJobStatus } = account

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || ''
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
        <Link to="/dashboard" onClick={onNavigate} className="group flex items-center gap-2.5" aria-label="FlowLab 不卡壳实验室">
          <img
            src={collapsed ? BRAND_ICON : BRAND_WORDMARK}
            alt=""
            aria-hidden="true"
            className={collapsed ? 'flowlab-sidebar-brand-icon' : 'flowlab-sidebar-brand-wordmark'}
          />
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
                          className="flowlab-sidebar-active absolute inset-0 rounded-2xl"
                          transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                        />
                      )}
                      {!active && <span className="absolute inset-0 rounded-2xl bg-white/0 transition-colors group-hover/nav:bg-white/35 dark:group-hover/nav:bg-white/[0.06]" />}
                      <Icon className={`relative h-[18px] w-[18px] shrink-0 ${active ? 'text-brand-ink' : ''}`} strokeWidth={active ? 2.2 : 1.9} />
                      {!collapsed && <span className="relative truncate">{item.label}</span>}
                      {!collapsed && active && <span className={`relative ml-auto h-1.5 w-1.5 rounded-full ${item.dot}`} aria-hidden="true" />}
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
          <Link
            to="/profile"
            onClick={onNavigate}
            title={t('nav.energyCta')}
            className="flowlab-energy-card flex h-11 items-center gap-2.5 rounded-2xl px-3.5 text-brand-ink transition-colors hover:border-brand-ink/15"
          >
            <Zap className="h-3.5 w-3.5 shrink-0 fill-brand-lime text-brand-lime" />
            <span className="text-[11.5px] text-brand-muted">{t('nav.tokens')}</span>
            <span className="ml-auto text-[14px] font-semibold tabular-nums">{tokens}</span>
            <ChevronRight className="h-3.5 w-3.5 text-brand-muted" />
          </Link>
        )}
      </div>

      {/* 账号 */}
      <div className={`border-t border-white/50 dark:border-white/10 ${collapsed ? 'space-y-2 px-2.5 py-3' : 'px-3 py-3'}`}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <button type="button" onClick={toggleJobStatus} title={seeking ? t('profile.statusSeeking') : t('profile.statusHired')}>
              <Avatar src={avatarSrc} seeking={seeking} />
            </button>
            <button type="button" onClick={handleSignOut} title={t('nav.signOut')} className="grid h-9 w-9 place-items-center rounded-xl text-brand-danger transition-colors hover:bg-brand-danger/10">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 px-2">
              <Avatar src={avatarSrc} seeking={seeking} />
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
  const role = workspaceRole(location.pathname)
  const surface = workspaceSurface(location.pathname, location.search)

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
      className={`flowlab-app-shell flowlab-shell-${role} flowlab-surface-${surface} relative min-h-screen bg-brand-paper`}
      style={{ '--ui-nav-h': '4.25rem', '--app-sidebar-w': `${sidebarW}px` }}
    >
      {/* 每页的弥散光铺满整个视口，侧栏作为玻璃层浮在同一张背景上。 */}
      <div aria-hidden="true" className="flowlab-shell-atmosphere pointer-events-none fixed inset-0 z-0" />

      {/* 桌面端侧栏 */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarW }}
        transition={{ type: 'spring', stiffness: 300, damping: 34 }}
        className="flowlab-sidebar fixed bottom-3 left-3 top-3 z-40 hidden overflow-hidden rounded-[28px] lg:block"
      >
        <SidebarContent collapsed={collapsed} onToggleCollapse={() => setCollapsed(v => !v)} account={account} />
      </motion.aside>

      {/* 顶栏：面包屑 + 语言 / 主题；移动端带菜单按钮 */}
      <header
        className="fixed right-5 top-3 z-30 flex h-14 items-center justify-between gap-3 pl-3 pr-2 transition-[left] duration-300 left-3 lg:left-[calc(var(--app-sidebar-w)+2rem)]"
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
          <nav className="flex min-w-0 items-center gap-1.5 text-[13px] lg:hidden" aria-label="Breadcrumb">
            <Link to="/dashboard" className="hidden shrink-0 font-semibold text-brand-muted transition-colors hover:text-brand-ink sm:inline">FlowLab</Link>
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
              className="flowlab-sidebar fixed bottom-3 left-3 top-3 z-50 w-[min(300px,calc(100vw-1.5rem))] overflow-hidden rounded-[28px] lg:hidden"
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
        <div className="relative min-h-[100dvh] lg:min-h-[calc(100dvh-1.5rem)]">
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
          <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />FlowLab · 不卡壳实验室</span>
        </span>
      </div>
    </footer>
  )
}
