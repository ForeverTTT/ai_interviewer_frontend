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
  Lock, CheckCircle2, Flame,
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

        {/* Bento Grid layout matching the new premium design */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Success Radar card with Achievements & AI Insights below */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-12 xl:col-span-7"
          >
            <div className="card-premium p-10 h-full flex flex-col gap-10 min-h-[600px] overflow-hidden relative">
              {/* Background Accent orbs */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-primary-500/5 blur-[120px] translate-x-1/2 -translate-y-1/2 pointer-events-none" />
              
              {/* Header */}
              <div className="flex items-center justify-between relative z-10">
                <div className="space-y-1">
                  <div className="text-[10px] font-black text-primary-500 uppercase tracking-widest">{t('dashboard.heroBadge')}</div>
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white font-serif tracking-tight">{t('profile.game.radarTitle')}</h2>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <TrendingUp className="w-6 h-6 text-primary-500" />
                </div>
              </div>

              {/* Radar Chart Panel - Centered at the top half */}
              <div className="flex-1 flex items-center justify-center relative min-h-[350px] py-4">
                <GamificationDashboard 
                  stats={gameStats} 
                  onCheckIn={handleCheckIn} 
                  interviews={interviews} 
                  viewMode="radarOnly" 
                />
              </div>

              {/* Bottom Section: Achievements & Insights Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-100 dark:border-slate-800 relative z-10">
                
                {/* AI Insight Highlight */}
                <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-4">
                  <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 text-[10px] font-black uppercase tracking-widest">
                    <Sparkles className="w-4 h-4" />
                    {t('dashboard.aiInsight')}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-bold">
                    {(() => {
                      const radar = gameStats?.radar || { language: 1, softSkills: 8, resume: 5 }
                      const minKey = Object.entries(radar).reduce((p, c) => (c[1] < p[1] ? c : p))[0]
                      return t(`dashboard.insights.${minKey}`, "您的面试表现稳步提升，建议针对性挑战中高级模拟面试。")
                    })()}
                  </p>
                </div>

                {/* Achievements & Score Side-by-Side */}
                <div className="flex flex-col justify-between gap-6">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('dashboard.achievements')}</h4>
                    <div className="flex gap-4">
                      {[
                        { id: 'pioneer', icon: Target, label: '面试先锋', active: interviews.length > 0 },
                        { id: 'linguist', icon: Globe2, label: '德语达人', active: (gameStats?.radar?.language || 0) > 7 },
                        { id: 'allrounder', icon: Zap, label: '全能王', active: (gameStats?.level || 1) > 4 },
                        { id: 'streak', icon: Flame, label: '勤奋蜂', active: (gameStats?.streak || 0) > 2 },
                      ].map(badge => (
                        <div key={badge.id} className="relative group">
                          <div className={`
                            w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border
                            ${badge.active ? 'bg-white dark:bg-slate-800 border-primary-500 shadow-lg shadow-primary-500/20 text-primary-500' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-700 opacity-50'}
                          `}>
                            <badge.icon className="w-6 h-6" />
                          </div>
                          {/* Tooltip on hover */}
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-slate-900 dark:bg-slate-800 text-white text-[10px] font-black rounded-lg opacity-0 group-hover:opacity-100 group-hover:-top-12 transition-all duration-300 pointer-events-none z-20 whitespace-nowrap shadow-xl">
                            {badge.label}
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 dark:bg-slate-800 rotate-45" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-end gap-3 pb-1">
                      <div className="shrink-0 flex items-end gap-1">
                        <span className="text-5xl font-black text-slate-900 dark:text-white leading-none">
                          {Math.round(Object.values(gameStats?.radar || { r: 6 }).reduce((a, b) => a + b, 0) / 6 * 10) || 45}
                        </span>
                        <span className="text-sm font-bold text-slate-400 mb-1">/ 100 PTS</span>
                      </div>
                      <div className="h-2 flex-1 bg-slate-100 dark:bg-slate-800 rounded-full mb-1.5 overflow-hidden">
                        <div 
                          className="h-full bg-primary-500 rounded-full transition-all duration-1000" 
                          style={{ width: `${Math.round(Object.values(gameStats?.radar || { r: 6 }).reduce((a, b) => a + b, 0) / 6 * 10) || 45}%` }}
                        />
                      </div>
                  </div>
                </div>

              </div>
            </div>
          </motion.div>

          {/* Right Column: History & Milestones */}
          <div className="lg:col-span-12 xl:col-span-5 space-y-8">
            
            {/* Interview History List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card-premium p-8 space-y-8 min-h-[400px]"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-900 dark:text-white font-serif tracking-tight">{t('dashboard.history')}</h3>
                <span className="px-3 py-1 bg-slate-50 dark:bg-slate-900 rounded-full text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border border-slate-100 dark:border-slate-800">
                  {interviews.length} {t('dashboard.records')}
                </span>
              </div>

              <div className="space-y-6 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
                {loading ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                ) : interviews.length === 0 ? (
                  <div className="py-12 text-center space-y-4">
                    <p className="text-slate-500 text-sm italic font-medium">{t('dashboard.emptySub')}</p>
                    <Link to="/setup" className="text-indigo-500 text-sm font-bold flex items-center justify-center gap-2 hover:underline">
                      {t('dashboard.newInterview')} <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                ) : (
                  interviews.map((interview, i) => {
                    const d = new Date(interview.created_at)
                    const month = d.toLocaleDateString(localeTag, { month: 'short' })
                    const day = d.toLocaleDateString(localeTag, { day: '2-digit' })
                    
                    return (
                      <motion.div
                        key={interview.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + i * 0.05 }}
                        className="group flex gap-6 items-start p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 rounded-2xl transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-700/50"
                      >
                        <div className="flex flex-col items-center justify-center shrink-0 w-12 h-14 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                          <span className="text-[10px] font-black uppercase text-slate-400 leading-none mb-1">{month}</span>
                          <span className="text-lg font-black text-slate-900 dark:text-white leading-none">{day}</span>
                        </div>
                        <div className="flex-1 space-y-1">
                          <Link to={`/interview/${interview.id}/report`} className="text-sm font-black text-slate-900 dark:text-white group-hover:text-indigo-500 transition-colors block leading-tight">
                            {interview.position}
                          </Link>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500">
                              {d.toLocaleTimeString(localeTag, { hour: '2-digit', minute: '2-digit' })} · {interview.language} · {interview.duration} {t('dashboard.durMin')}
                            </span>
                            <button
                              onClick={() => requestDeleteInterview(interview.id, interview.position)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 transition-all hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })
                )}
              </div>
            </motion.div>

            {/* Gamification Level Map */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="card-premium p-8 space-y-10"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-900 dark:text-white font-serif tracking-tight">{t('profile.game.lvlMap')}</h3>
                <div className="px-3 py-1 bg-primary-50 dark:bg-primary-950/30 rounded-full text-[10px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest border border-primary-100 dark:border-primary-900/50">
                  Level {gameStats?.level || 1}
                </div>
              </div>

              {/* Connected Level Path */}
              <div className="relative py-6">
                {/* Connection Line */}
                <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-slate-100 dark:bg-slate-800 -translate-y-1/2" />
                
                <div className="relative flex justify-between gap-4 overflow-x-auto pb-8 scrollbar-hide snap-x">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((lvl) => {
                    const currentLvl = gameStats?.level || 1
                    const isPassed = lvl < currentLvl
                    const isActive = lvl === currentLvl
                    const isLocked = lvl > currentLvl
                    
                    return (
                      <div key={lvl} className="flex flex-col items-center shrink-0 w-20 snap-center relative">
                        {/* Connecting Line (Success state) */}
                        {isPassed && (
                          <div className="absolute top-1/2 left-[50%] w-full h-[2px] bg-primary-500 -translate-y-1/2 z-0" />
                        )}

                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          className={`
                            relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500
                            ${isActive ? 'bg-primary-500 text-white shadow-xl shadow-primary-500/40 ring-4 ring-primary-100 dark:ring-primary-950/50' : 
                              isPassed ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border-2 border-primary-500' : 
                              'bg-white dark:bg-slate-900 text-slate-300 dark:text-slate-700 border-2 border-slate-100 dark:border-slate-800'}
                          `}
                        >
                          {isPassed ? <CheckCircle2 className="w-6 h-6" /> : 
                           isLocked ? <Lock className="w-5 h-5" /> :
                           <span className="text-lg font-black">{lvl}</span>}
                          
                          {isActive && (
                            <motion.div 
                              layoutId="activeGlow"
                              className="absolute -inset-2 rounded-[1.5rem] bg-primary-500/20 animate-pulse -z-10" 
                            />
                          )}
                        </motion.div>
                        
                        <div className={`mt-4 text-[10px] font-black uppercase tracking-tighter text-center leading-tight transition-colors duration-500 ${
                          isActive ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400'
                        }`}>
                          {t(`profile.game.lvls.${lvl}`)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Next Highlight Challenge */}
              <div className="p-6 bg-slate-900 dark:bg-white rounded-[2rem] flex items-center justify-between group cursor-pointer hover:shadow-2xl hover:shadow-primary-500/10 transition-all">
                <div className="flex gap-5 items-center">
                   <div className="w-12 h-12 rounded-2xl bg-white/10 dark:bg-slate-100 flex items-center justify-center text-primary-500">
                     <Zap className="w-6 h-6 animate-pulse" />
                   </div>
                   <div className="space-y-1">
                      <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">{t('profile.game.nextQuest')}</div>
                      <div className="text-white dark:text-slate-900 font-bold text-lg leading-none">
                        {gameStats?.nextLevelQuest ? t(`profile.game.quests.${gameStats.nextLevelQuest}`) : 'Complete 1 more mock'}
                      </div>
                   </div>
                </div>
                <div className="w-10 h-10 rounded-full border border-white/20 dark:border-slate-200 flex items-center justify-center text-white dark:text-slate-900 group-hover:bg-primary-500 group-hover:border-primary-500 transition-all">
                   <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </motion.div>

          </div>
        </div>


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
