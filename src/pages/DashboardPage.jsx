import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { getBackendBaseUrl } from '../lib/backendBase'
import {
  PlusCircle, Clock, Globe2, Briefcase,
  TrendingUp, Target, Zap, ArrowRight, FileText, UserCircle,
  Trash2, Loader2, AlertTriangle, Sparkles, LayoutDashboard, History,
} from 'lucide-react'
import GamificationDashboard from '../components/GamificationDashboard'

function useLocaleTag(i18nLang) {
  return useMemo(() => {
    if (i18nLang === 'de') return 'de-DE'
    if (i18nLang === 'en') return 'en-US'
    return 'zh-CN'
  }, [i18nLang])
}

function langPillClass(lang) {
  if (lang === 'Deutsch') {
    return 'border-violet-200/90 bg-violet-100 text-violet-800 dark:border-violet-700 dark:bg-violet-950/50 dark:text-violet-200 shadow-sm shadow-violet-500/10'
  }
  return 'border-indigo-200/90 bg-indigo-100 text-indigo-900 dark:border-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-200 shadow-sm shadow-indigo-500/10'
}

export default function DashboardPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [gameStats, setGameStats] = useState(null)
  const [checkingIn, setCheckingIn] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleteModalError, setDeleteModalError] = useState(null)
  const localeTag = useLocaleTag(i18n.language)

  const closeDeleteModal = useCallback(() => {
    setPendingDelete(null)
    setDeleteModalError(null)
  }, [])

  useEffect(() => {
    if (!pendingDelete) return
    const onKey = (e) => {
      if (e.key === 'Escape') closeDeleteModal()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pendingDelete, closeDeleteModal])

  useEffect(() => {
    if (!pendingDelete) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [pendingDelete])

  useEffect(() => {
    document.title = t('meta.title')
  }, [t])

  useEffect(() => {
    async function fetchInterviews() {
      if (!user) return
      try {
        const backendUrl = getBackendBaseUrl()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          setLoading(false)
          return
        }
        const res = await fetch(`${backendUrl}/api/interviews`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setInterviews(data.interviews || [])
        }
      } catch {
        // Backend may not be running
      } finally {
        setLoading(false)
      }
    }
    fetchInterviews()
  }, [user])

  useEffect(() => {
    async function fetchGameStats() {
      if (!user) return
      try {
        const backendUrl = getBackendBaseUrl()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) return
        const res = await fetch(`${backendUrl}/api/profile/game-stats`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setGameStats(data)
        }
      } catch (err) {
        console.error('Failed to fetch game stats', err)
      }
    }
    fetchGameStats()
  }, [user])

  const handleCheckIn = async () => {
    if (checkingIn || !user) return
    setCheckingIn(true)
    try {
      const backendUrl = getBackendBaseUrl()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${backendUrl}/api/profile/check-in`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setGameStats(prev => ({ ...prev, streak: data.streak, alreadyCheckedIn: true }))
        return true
      }
      return false
    } catch (err) {
      console.error('Check-in failed', err)
      return false
    } finally {
      setCheckingIn(false)
    }
  }

  const requestDeleteInterview = (id, position) => {
    setDeleteModalError(null)
    setPendingDelete({ id, position: position || '' })
  }

  const confirmDeleteInterview = async () => {
    if (!pendingDelete) return
    const { id } = pendingDelete
    setDeleteModalError(null)
    setDeletingId(id)
    try {
      const backendUrl = getBackendBaseUrl()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setDeleteModalError(t('dashboard.deleteFailed'))
        return
      }
      const res = await fetch(`${backendUrl}/api/interviews/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) {
        setDeleteModalError(t('dashboard.deleteFailed'))
        return
      }
      setInterviews((prev) => prev.filter((x) => x.id !== id))
      closeDeleteModal()
    } catch {
      setDeleteModalError(t('dashboard.deleteFailed'))
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString(localeTag, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const totalTime = interviews.reduce((sum, iv) => sum + (iv.duration || 0), 0)
  const langCounts = interviews.reduce((acc, iv) => {
    acc[iv.language] = (acc[iv.language] || 0) + 1
    return acc
  }, {})

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]

  const statCards = [
    { icon: Target, value: interviews.length, label: t('dashboard.statTotal'), color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20' },
    { icon: Clock, value: `${totalTime}${t('dashboard.minUnit')}`, label: t('dashboard.statTime'), color: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/20' },
    { icon: Globe2, value: langCounts.Deutsch || 0, label: t('dashboard.statDe'), color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20' },
    { icon: TrendingUp, value: langCounts.English || 0, label: t('dashboard.statEn'), color: 'text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-50 dark:bg-fuchsia-950/20' },
  ]

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-slate-950 pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="section-badge">{t('dashboard.heroBadge')}</div>
            <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white font-serif tracking-tight">
              {t('dashboard.hello')}{firstName || t('dashboard.guest')}
            </h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xl">
              {t('dashboard.sub')}
            </p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-row flex-nowrap items-center gap-3 shrink-0"
          >
            <Link to="/profile" className="btn-setup-action-pill px-6 py-3 text-xs whitespace-nowrap">
              <UserCircle className="w-4 h-4" />
              <span className="shrink-0">{t('profile.title')}</span>
            </Link>
            <Link to="/setup" className="btn-setup-action-pill px-6 py-3 text-xs whitespace-nowrap">
              <PlusCircle className="w-4 h-4" />
              <span className="shrink-0">{t('dashboard.newInterview')}</span>
            </Link>
          </motion.div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="card-premium p-8"
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white mb-1 tracking-tighter">{stat.value}</div>
              <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Gamification Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-16"
        >
          <GamificationDashboard stats={gameStats} onCheckIn={handleCheckIn} interviews={interviews} />
        </motion.div>

        {/* History Section */}
        <section className="space-y-8">
          <div className="flex items-end justify-between">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white font-serif tracking-tight">
              {t('dashboard.history')}
            </h2>
            {interviews.length > 0 && (
              <span className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                {interviews.length} {t('dashboard.records')}
              </span>
            )}
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm font-medium">{t('dashboard.loading')}</p>
            </div>
          ) : interviews.length === 0 ? (
            <div className="py-32 card-premium border-2 border-dashed flex flex-col items-center text-center space-y-8">
              <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner">
                <Target className="w-10 h-10 text-indigo-500" />
              </div>
              <div className="space-y-2 px-8">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white font-serif">{t('dashboard.emptyTitle')}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">{t('dashboard.emptySub')}</p>
              </div>
              <Link to="/setup" className="btn-primary">
                <Zap className="w-4 h-4" />
                {t('dashboard.emptyCta')}
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {interviews.map((interview, i) => (
                <motion.article
                  key={interview.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="card-premium group p-8 flex flex-col md:flex-row md:items-center justify-between gap-8"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
                      <Briefcase className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{interview.position}</h3>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1.5"><History className="w-3.5 h-3.5" />{formatDate(interview.created_at)}</span>
                        <span className="flex items-center gap-1.5"><Globe2 className="w-3.5 h-3.5" />{interview.language}</span>
                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{interview.duration} {t('dashboard.durMin')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link to={`/interview/${interview.id}/report`} className="btn-secondary px-6 py-2.5 text-xs">
                      <FileText className="w-4 h-4 mr-2" />
                      {t('report.viewReport')}
                    </Link>
                    <button
                      onClick={() => requestDeleteInterview(interview.id, interview.position)}
                      className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </section>

        {/* Promotional Banner */}
        {interviews.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-20 p-10 bg-slate-900 dark:bg-slate-900 rounded-[2.5rem] relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500 opacity-10 blur-[100px] pointer-events-none" />
            <div className="relative z-[1] flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="space-y-4">
                <h3 className="text-3xl font-black text-white font-serif">{t('dashboard.bannerTitle')}</h3>
                <p className="text-lg text-slate-400 max-w-xl">{t('dashboard.bannerSub')}</p>
              </div>
              <Link to="/setup" className="btn-primary-white px-10 py-5 text-lg">
                {t('dashboard.bannerBtn')}
                <ArrowRight className="w-6 h-6 ml-2" />
              </Link>
            </div>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {pendingDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDeleteModal}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-red-500" />
              <div className="space-y-6">
                <div className="w-14 h-14 bg-red-50 dark:bg-red-950/30 rounded-2xl flex items-center justify-center text-red-500">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white font-serif mb-2">{t('dashboard.deleteModalTitle')}</h2>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                    {t('dashboard.deleteConfirm')}
                    {pendingDelete.position && <span className="block mt-2 font-bold text-slate-900 dark:text-white">"{pendingDelete.position}"</span>}
                  </p>
                </div>
                {deleteModalError && (
                  <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-xl text-sm text-red-600 dark:text-red-400 font-bold">
                    {deleteModalError}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <button onClick={closeDeleteModal} className="btn-secondary py-4 font-bold">{t('dashboard.deleteModalCancel')}</button>
                  <button 
                    onClick={() => void confirmDeleteInterview()} 
                    disabled={deletingId === pendingDelete.id}
                    className="btn-primary bg-red-600 hover:bg-red-700 py-4 font-bold disabled:opacity-50"
                  >
                    {deletingId === pendingDelete.id ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : t('dashboard.deleteModalConfirm')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
