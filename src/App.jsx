import { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { ThemeProvider } from './context/ThemeContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import CookieBanner from './components/CookieBanner'
import PageAtmosphere from './components/brand/PageAtmosphere'
import AppShell from './components/app/AppShell'
import { useAuth } from './hooks/useAuth'
import { lazyWithReload } from './lib/lazyWithReload'

const LandingPage = lazyWithReload(() => import('./pages/LandingPage'))
const LoginPage = lazyWithReload(() => import('./pages/LoginPage'))
const SetupPage = lazyWithReload(() => import('./pages/SetupPage'))
const InterviewPage = lazyWithReload(() => import('./pages/InterviewPage'))
const DashboardPage = lazyWithReload(() => import('./pages/DashboardPage'))
const NotesPage = lazyWithReload(() => import('./pages/NotesPage'))
const InterviewReportPage = lazyWithReload(() => import('./pages/InterviewReportPage'))
const AuthCallbackPage = lazyWithReload(() => import('./pages/AuthCallbackPage'))
const ProfilePage = lazyWithReload(() => import('./pages/ProfilePage'))
const GallupTestPage = lazyWithReload(() => import('./pages/GallupTestPage'))
const ExperiencesPage = lazyWithReload(() => import('./pages/ExperiencesPage'))
const ResumeTailorPage = lazyWithReload(() => import('./pages/ResumeTailorPage'))

function PageFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-brand-paper text-brand-muted">
      <img src="/landit-icon-light.svg" alt="" className="h-11 w-11 animate-pulse-soft rounded-xl dark:hidden" />
      <img src="/landit-icon-dark.svg" alt="" className="hidden h-11 w-11 animate-pulse-soft rounded-xl dark:block" />
      <span role="status" aria-live="polite" className="text-[12.5px] tracking-wide">Loading…</span>
    </div>
  )
}

/**
 * 站内通用外壳：浮动顶栏 + 页面内容 + 页脚。
 * atmosphere：内页顶部铺一层淡淡的港口插画；首页自己有整幅主视觉，所以关掉。
 */
function Layout({ children, hideFooter = false, atmosphere = true }) {
  return (
    <div className="relative min-h-screen bg-brand-paper">
      {atmosphere && <PageAtmosphere />}
      <Navbar />
      <main className="relative z-10 min-h-[calc(100dvh-var(--ui-nav-h))]">{children}</main>
      {!hideFooter && <Footer />}
    </div>
  )
}

/**
 * 公开页（面经库）：登录后进入带侧栏的工作台外壳，未登录时仍是官网式顶栏布局。
 */
function AdaptiveLayout({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <PageFallback />
  return user ? <AppShell>{children}</AppShell> : <Layout>{children}</Layout>
}

/** ThemeProvider 放在带 Outlet 的布局内，保证与路由上下文一致且切换路由时不丢主题状态 */
function AppThemeShell() {
  return (
    <ThemeProvider>
      {/* 尊重系统「减少动态效果」设置：framer-motion 的位移动画自动降级为淡入 */}
      <MotionConfig reducedMotion="user">
        <Outlet />
        <CookieBanner />
      </MotionConfig>
    </ThemeProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route element={<AppThemeShell />}>
          <Route path="/" element={
            <Layout atmosphere={false}>
              <LandingPage />
            </Layout>
          } />

          <Route path="/login" element={<LoginPage />} />

          {/* OAuth callback — must NOT be wrapped in ProtectedRoute */}
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          <Route path="/setup" element={
            <ProtectedRoute>
              <AppShell>
                <SetupPage />
              </AppShell>
            </ProtectedRoute>
          } />

          <Route path="/interview" element={
            <ProtectedRoute>
              {/* No navbar/footer in interview mode - full screen */}
              <InterviewPage />
            </ProtectedRoute>
          } />
          <Route path="/interview/:interviewId" element={
            <ProtectedRoute>
              <InterviewPage />
            </ProtectedRoute>
          } />

          <Route path="/dashboard" element={
            <ProtectedRoute>
              <AppShell>
                <DashboardPage />
              </AppShell>
            </ProtectedRoute>
          } />

          <Route path="/notes" element={
            <ProtectedRoute>
              <AppShell>
                <NotesPage />
              </AppShell>
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute>
              <AppShell>
                <ProfilePage />
              </AppShell>
            </ProtectedRoute>
          } />
          <Route path="/profile/edit" element={
            <ProtectedRoute>
              <AppShell>
                <ProfilePage />
              </AppShell>
            </ProtectedRoute>
          } />

          <Route path="/resume-tailor" element={
            <ProtectedRoute>
              <AppShell>
                <ResumeTailorPage />
              </AppShell>
            </ProtectedRoute>
          } />

          <Route path="/interview/:interviewId/report" element={
            <ProtectedRoute>
              <AppShell>
                <InterviewReportPage />
              </AppShell>
            </ProtectedRoute>
          } />

          <Route path="/gallup" element={
            <ProtectedRoute>
              <AppShell>
                <GallupTestPage />
              </AppShell>
            </ProtectedRoute>
          } />

          <Route path="/experiences" element={
            <AdaptiveLayout>
              <ExperiencesPage />
            </AdaptiveLayout>
          } />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
