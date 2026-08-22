import { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import BackgroundAurora from './components/BackgroundAurora'
import CookieBanner from './components/CookieBanner'
import { lazyWithReload } from './lib/lazyWithReload'

const LandingPage = lazyWithReload(() => import('./pages/LandingPage'))
const LoginPage = lazyWithReload(() => import('./pages/LoginPage'))
const SetupPage = lazyWithReload(() => import('./pages/SetupPage'))
const InterviewPage = lazyWithReload(() => import('./pages/InterviewPage'))
const DashboardPage = lazyWithReload(() => import('./pages/DashboardPage'))
const InterviewReportPage = lazyWithReload(() => import('./pages/InterviewReportPage'))
const AuthCallbackPage = lazyWithReload(() => import('./pages/AuthCallbackPage'))
const ProfilePage = lazyWithReload(() => import('./pages/ProfilePage'))
const GallupTestPage = lazyWithReload(() => import('./pages/GallupTestPage'))
const ExperiencesPage = lazyWithReload(() => import('./pages/ExperiencesPage'))

function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-sky-50/50 text-slate-600 dark:bg-[#020617] dark:text-slate-300">
      <span role="status" aria-live="polite">Loading…</span>
    </div>
  )
}

function Layout({ children, hideFooter = false }) {
  return (
    <div className="relative min-h-screen bg-sky-50/50 dark:bg-[#020617] transition-colors duration-500">
      <Navbar />
      <BackgroundAurora />
      <main className="relative z-10 min-h-[calc(100dvh-4.25rem)]">{children}</main>
      {!hideFooter && <Footer />}
    </div>
  )
}

/** ThemeProvider 放在带 Outlet 的布局内，保证与路由上下文一致且切换路由时不丢主题状态 */
function AppThemeShell() {
  return (
    <ThemeProvider>
      <Outlet />
      <CookieBanner />
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
            <Layout>
              <LandingPage />
            </Layout>
          } />

          <Route path="/login" element={<LoginPage />} />

          {/* OAuth callback — must NOT be wrapped in ProtectedRoute */}
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          <Route path="/setup" element={
            <ProtectedRoute>
              <Layout>
                <SetupPage />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/interview" element={
            <ProtectedRoute>
              {/* No navbar/footer in interview mode - full screen */}
              <InterviewPage />
            </ProtectedRoute>
          } />

          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout>
                <DashboardPage />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute>
              <Layout>
                <ProfilePage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/profile/edit" element={
            <ProtectedRoute>
              <Layout>
                <ProfilePage />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/interview/:interviewId/report" element={
            <ProtectedRoute>
              <Layout>
                <InterviewReportPage />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/gallup" element={
            <ProtectedRoute>
              <Layout>
                <GallupTestPage />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/experiences" element={
            <Layout>
              <ExperiencesPage />
            </Layout>
          } />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
