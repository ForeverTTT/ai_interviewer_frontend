import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SetupPage from './pages/SetupPage'
import InterviewPage from './pages/InterviewPage'
import DashboardPage from './pages/DashboardPage'
import InterviewReportPage from './pages/InterviewReportPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import ProfilePage from './pages/ProfilePage'
import GallupTestPage from './pages/GallupTestPage'

import BackgroundAurora from './components/BackgroundAurora'

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
    </ThemeProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
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
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
