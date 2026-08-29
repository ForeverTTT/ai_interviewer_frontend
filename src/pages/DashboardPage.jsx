import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { getBackendBaseUrl } from '../lib/backendBase'
import { authenticatedFetch } from '../lib/authenticatedFetch'
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
    return 'border-brand-line bg-brand-inset text-brand-ink'
  }
  return 'border-brand-line bg-brand-inset text-brand-muted'
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
        const res = await authenticatedFetch(`${backendUrl}/api/interviews`, {
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
        const res = await authenticatedFetch(`${backendUrl}/api/profile/game-stats`, {
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

  const [checkInReward, setCheckInReward] = useState(false)

  const handleCheckIn = async () => {
    if (checkingIn || !user) return
    setCheckingIn(true)
    try {
      const backendUrl = getBackendBaseUrl()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await authenticatedFetch(`${backendUrl}/api/profile/check-in`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setGameStats(prev => ({ ...prev, streak: data.streak, alreadyCheckedIn: true }))
        if (data.tokensAwarded > 0) {
          setCheckInReward(true)
          window.dispatchEvent(new Event('tokensChanged'))
          setTimeout(() => setCheckInReward(false), 3000)
        }
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
      const res = await authenticatedFetch(`${backendUrl}/api/interviews/${id}`, {
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

  /* color 存的是完整类名字符串，不做任何拼接，避免生产构建把类 purge 掉 */
  /* 与原表达式完全一致，只是提出来避免在 JSX 里重复三遍 */
  const readinessScore = Math.round(Object.values(gameStats?.radar || { r: 6 }).reduce((a, b) => a + b, 0) / 6 * 10) || 45

  /* 这四个值和职场胜算的分数同属「数值」，现在一起放在右侧那张卡里 */
  const statCards = [
    { icon: Target, value: interviews.length, label: t('dashboard.statTotal') },
    { icon: Clock, value: `${totalTime}${t('dashboard.minUnit')}`, label: t('dashboard.statTime') },
    { icon: Globe2, value: langCounts.Deutsch || 0, label: t('dashboard.statDe') },
    { icon: TrendingUp, value: langCounts.English || 0, label: t('dashboard.statEn') },
  ]

  return (
    <div className="theme-quiet relative min-h-screen bg-brand-paper pb-14 pt-[calc(var(--ui-nav-h)+2rem)]">
      <div className="ui-container">

        {/* ───────────── 页头 ───────────── */}
        <header className="mb-6 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="min-w-0"
          >
            <h1 className="font-brand text-[30px] font-semibold leading-tight tracking-[-0.02em] text-brand-ink sm:text-[34px]">
              {t('dashboard.hello')}{firstName || t('dashboard.guest')}
            </h1>
            <p className="mt-2.5 max-w-xl text-[14px] leading-relaxed text-brand-muted">
              {t('dashboard.sub')}
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex shrink-0 flex-row flex-nowrap items-center gap-3"
          >
            {/* 次级按钮 */}
            <Link
              to="/profile"
              className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-brand-line bg-brand-card px-4 py-2.5 text-[13px] font-medium text-brand-muted transition-colors hover:border-brand-ink hover:text-brand-ink"
            >
              <UserCircle className="h-4 w-4" />
              <span className="shrink-0">{t('profile.title')}</span>
            </Link>
            {/* 每日打卡：整张卡片压缩成一颗按钮，状态与奖励都写在按钮文案里 */}
            <button
              type="button"
              onClick={handleCheckIn}
              disabled={checkingIn || gameStats?.alreadyCheckedIn}
              aria-label={t('dashboard.checkIn.title')}
              title={t('dashboard.checkIn.title')}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2.5 text-[13px] font-medium transition-colors ${gameStats?.alreadyCheckedIn
                ? 'cursor-default border-brand-line bg-brand-inset text-brand-muted'
                : 'border-brand-line bg-brand-card text-brand-ink hover:border-brand-ink'
                }`}
            >
              {checkingIn
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : gameStats?.alreadyCheckedIn
                  ? <CheckCircle2 className="h-4 w-4 text-brand-success" />
                  : <Flame className="h-4 w-4" />}
              <span className="shrink-0">
                {gameStats?.alreadyCheckedIn
                  ? `${t('dashboard.checkIn.done')} · ${gameStats?.streak || 0} ${t('profile.game.streak')}`
                  : `${t('dashboard.checkIn.btn')} +200 ${t('common.energyShort')}`}
              </span>
            </button>

            {/* 主 CTA：整页唯一的色块，走薰衣草渐变 */}
            <Link
              to="/setup"
              className="quiet-cta flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-opacity duration-200"
            >
              <PlusCircle className="h-4 w-4" />
              <span className="shrink-0">{t('dashboard.newInterview')}</span>
            </Link>
          </motion.div>

          {/* 打卡成功的即时反馈，跟随头部按钮 */}
          <AnimatePresence>
            {checkInReward && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-brand-line bg-brand-inset px-3 py-2"
              >
                <Zap className="h-4 w-4 shrink-0 text-brand-success" />
                <span className="text-[12.5px] font-semibold text-brand-success">{t('dashboard.checkIn.reward')}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* ───────────── 通关之路：全宽，放在最上面 ───────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="brand-float mb-5 rounded-[22px] px-6 py-6"
        >
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">

            <div className="min-w-0">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-brand text-[17px] font-semibold tracking-[-0.01em] text-brand-ink">{t('profile.game.lvlMap')}</h2>
                  <p className="mt-1 text-[12px] text-brand-muted">{t('dashboard.lvlMapSub')}</p>
                </div>
                <div className="shrink-0 rounded-full border border-brand-line bg-brand-inset px-2.5 py-1 text-[11px] font-semibold text-brand-ink">
                  Level {gameStats?.level || 1}
                </div>
              </div>

              <div className="scrollbar-hide relative flex snap-x justify-between gap-4 overflow-x-auto pb-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((lvl) => {
                  const currentLvl = gameStats?.level || 1
                  const isPassed = lvl < currentLvl
                  const isActive = lvl === currentLvl

                  return (
                    <div key={lvl} className="relative flex w-20 shrink-0 snap-center flex-col items-center">
                      {/* 连线：节点是 h-12，中心在距列顶 24px（top-6）。
                          宽度 = 列宽 w-20 + 间距 gap-4 = 100% + 1rem。 */}
                      {lvl !== 10 && (
                        <div
                          aria-hidden="true"
                          className={`pointer-events-none absolute left-1/2 top-6 z-0 h-[2px] w-[calc(100%+1rem)] -translate-y-1/2 ${isPassed ? 'bg-brand-ink' : 'bg-brand-line'}`}
                        />
                      )}

                      <motion.div
                        whileHover={{ scale: 1.06 }}
                        className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl border transition-colors duration-300 ${isActive ? 'border-brand-ink bg-brand-ink text-brand-on-ink' :
                          isPassed ? 'border-brand-ink bg-brand-card text-brand-ink' :
                            'border-brand-line bg-brand-card text-brand-muted'
                          }`}
                      >
                        {isPassed ? <CheckCircle2 className="h-5 w-5" /> :
                          lvl > currentLvl ? <Lock className="h-4 w-4" /> :
                            <span className="text-[16px] font-semibold">{lvl}</span>}
                      </motion.div>

                      <div className={`mt-3 text-center text-[11px] font-medium leading-tight ${isActive ? 'text-brand-ink' : 'text-brand-muted'}`}>
                        {t(`profile.game.lvls.${lvl}`)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 下一步建议 */}
            <div className="flex flex-col justify-between gap-4 rounded-[20px] border border-brand-line bg-brand-inset p-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[12px] font-semibold text-brand-muted">
                  <Sparkles className="h-4 w-4" />
                  {t('profile.game.nextQuest')}
                </div>
                <p className="text-[15px] font-semibold leading-snug text-brand-ink">
                  {gameStats?.nextLevelQuest ? t(`profile.game.quests.${gameStats.nextLevelQuest}`) : 'Complete 1 more mock'}
                </p>
              </div>
              {/* 原来这里是个带 cursor-pointer 但没有 onClick 的 div，点了没反应；改成真实链接 */}
              <Link
                to="/setup"
                className="flex items-center justify-center gap-2 rounded-xl border border-brand-line bg-brand-card px-5 py-3 text-[13.5px] font-semibold text-brand-ink transition-colors duration-200 hover:border-brand-ink"
              >
                {t('dashboard.newInterview')}
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </Link>
            </div>
          </div>
        </motion.div>

        {/* ───────────── 主行：面试历史（主列）+ 数据总览（辅列） ───────────── */}
        <div className="grid gap-5 lg:grid-cols-12">

          {/* ── 面试历史：时间轴列表 ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="brand-float flex min-h-[520px] flex-col rounded-[22px] px-6 py-5 lg:col-span-12 xl:col-span-7"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="font-brand text-[17px] font-semibold tracking-[-0.01em] text-brand-ink">{t('dashboard.history')}</h2>
              <span className="shrink-0 rounded-full border border-brand-line bg-brand-inset px-2.5 py-1 text-[11px] font-medium tabular-nums text-brand-muted">
                {interviews.length} {t('dashboard.records')}
              </span>
            </div>

            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
              {loading ? (
                <div className="flex items-center justify-center py-24 text-brand-muted">
                  <Loader2 className="h-7 w-7 animate-spin" />
                </div>
              ) : interviews.length === 0 ? (
                <div className="space-y-3 py-20 text-center">
                  <p className="text-[13px] text-brand-muted">{t('dashboard.emptySub')}</p>
                  <Link to="/setup" className="inline-flex items-center justify-center gap-2 text-[13px] font-semibold text-brand-ink hover:underline">
                    {t('dashboard.newInterview')} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                interviews.map((interview, i) => {
                  const d = new Date(interview.created_at)
                  const month = d.toLocaleDateString(localeTag, { month: 'short' })
                  const day = d.toLocaleDateString(localeTag, { day: '2-digit' })
                  const weekday = d.toLocaleDateString(localeTag, { weekday: 'short' })
                  const isLast = i === interviews.length - 1

                  return (
                    <motion.div
                      key={interview.id}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + i * 0.04 }}
                      className="group flex gap-4"
                    >
                      {/* 日期列 */}
                      <div className="w-12 shrink-0 pt-3 text-center">
                        <div className="text-[11px] leading-none text-brand-muted">{month}</div>
                        <div className="mt-1 text-[19px] font-semibold leading-none tracking-tight tabular-nums text-brand-ink">{day}</div>
                        <div className="mt-1 text-[11px] leading-none text-brand-muted">{weekday}</div>
                      </div>

                      {/* 时间轴：圆点 + 连接线，最后一条不画线 */}
                      <div className="flex w-4 shrink-0 flex-col items-center pt-4" aria-hidden="true">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-brand-ink bg-brand-card" />
                        {!isLast && <span className="mt-1 w-px flex-1 bg-brand-line" />}
                      </div>

                      {/* 内容 */}
                      <div className={`min-w-0 flex-1 ${isLast ? 'pb-1' : 'pb-4'}`}>
                        <div className="flex items-start justify-between gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors group-hover:border-brand-line group-hover:bg-brand-inset">
                          <div className="min-w-0 flex-1">
                            <Link
                              to={`/interview/${interview.id}/report`}
                              className="flex items-center gap-1.5 text-[14px] font-semibold leading-tight text-brand-ink transition-colors hover:opacity-70"
                            >
                              <span className="truncate">{interview.position}</span>
                              <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                            </Link>
                            <p className="mt-1.5 truncate text-[12px] text-brand-muted">
                              {d.toLocaleTimeString(localeTag, { hour: '2-digit', minute: '2-digit' })} · {interview.language} · {interview.duration} {t('dashboard.durMin')}
                            </p>
                          </div>
                          <button
                            onClick={() => requestDeleteInterview(interview.id, interview.position)}
                            className="shrink-0 rounded-lg p-1.5 text-brand-muted transition-colors hover:bg-brand-danger/10 hover:text-brand-danger"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })
              )}
            </div>
          </motion.div>

          {/* ── 数据总览：四项统计 + 职场胜算环形分 + 雷达 + AI 建议 + 勋章 ──
              四个统计值原来单独占一条横幅，但它们和胜算分数是同一类东西，现在收进同一张卡。 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="brand-float rounded-[22px] px-6 py-6 lg:col-span-12 xl:col-span-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[12px] font-medium text-brand-muted">
                  <span className="h-1 w-1 rounded-full bg-brand-ink" aria-hidden="true" />
                  {t('dashboard.heroBadge')}
                </div>
                <h2 className="mt-2 font-brand text-[17px] font-semibold leading-tight tracking-[-0.01em] text-brand-ink">
                  {t('profile.game.radarTitle')}
                </h2>
              </div>
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-brand-line bg-brand-inset text-brand-ink">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>

            {/* 四项统计 */}
            <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-y border-brand-line py-4">
              {statCards.map((stat) => (
                <div key={stat.label} className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-brand-line bg-brand-inset text-brand-muted">
                    <stat.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[18px] font-semibold leading-none tracking-tight tabular-nums text-brand-ink">{stat.value}</div>
                    <div className="mt-1.5 truncate text-[11.5px] text-brand-muted">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* 环形总分 */}
            <div className="mt-5 flex items-center gap-5">
              <div className="relative grid h-[116px] w-[116px] shrink-0 place-items-center">
                <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgb(var(--brand-line))" strokeWidth="10" />
                  <circle
                    cx="60" cy="60" r="50"
                    fill="none"
                    stroke="rgb(var(--brand-violet))"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${(2 * Math.PI * 50 * readinessScore) / 100} ${2 * Math.PI * 50}`}
                  />
                </svg>
                <div className="absolute flex items-baseline gap-0.5">
                  <span className="text-[30px] font-semibold leading-none tracking-tight tabular-nums text-brand-ink">{readinessScore}</span>
                  <span className="text-[12px] font-medium text-brand-muted">/100</span>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-brand-ink">{t('dashboard.scoreLabel')}</p>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-brand-inset">
                  <div className="h-full rounded-full bg-brand-violet transition-all duration-1000" style={{ width: `${readinessScore}%` }} />
                </div>
              </div>
            </div>

            {/* 雷达 */}
            <div className="mt-4 flex min-h-[300px] items-center justify-center">
              <GamificationDashboard
                stats={gameStats}
                onCheckIn={handleCheckIn}
                interviews={interviews}
                viewMode="radarOnly"
              />
            </div>

            {/* AI 建议 */}
            <div className="mt-2 space-y-2 rounded-[18px] border border-brand-line bg-brand-inset p-4">
              <div className="flex items-center gap-2 text-[12.5px] font-semibold text-brand-ink">
                <Sparkles className="h-4 w-4 text-brand-muted" />
                {t('dashboard.aiInsight')}
              </div>
              <p className="text-[12.5px] leading-relaxed text-brand-muted">
                {(() => {
                  const radar = gameStats?.radar || { language: 1, softSkills: 8, resume: 5 }
                  const minKey = Object.entries(radar).reduce((p, c) => (c[1] < p[1] ? c : p))[0]
                  return t(`dashboard.insights.${minKey}`, "您的面试表现稳步提升，建议针对性挑战中高级模拟面试。")
                })()}
              </p>
            </div>

            {/* 勋章墙 */}
            <div className="mt-4 space-y-3 border-t border-brand-line pt-4">
              <h4 className="text-[12.5px] font-semibold text-brand-ink">{t('dashboard.achievements')}</h4>
              <div className="flex gap-3">
                {[
                  { id: 'pioneer', icon: Target, label: '面试先锋', active: interviews.length > 0 },
                  { id: 'linguist', icon: Globe2, label: '德语达人', active: (gameStats?.radar?.language || 0) > 7 },
                  { id: 'allrounder', icon: Zap, label: '全能王', active: (gameStats?.level || 1) > 4 },
                  { id: 'streak', icon: Flame, label: '勤奋蜂', active: (gameStats?.streak || 0) > 2 },
                ].map(badge => (
                  <div key={badge.id} className="group relative">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-colors duration-300 ${badge.active
                      ? 'border-brand-ink bg-brand-card text-brand-ink ring-1 ring-brand-ink'
                      : 'border-brand-line bg-brand-inset text-brand-muted opacity-50'
                      }`}>
                      <badge.icon className="h-5 w-5" />
                    </div>
                    <div className="pointer-events-none absolute -top-9 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-lg bg-brand-ink px-2.5 py-1.5 text-[11px] font-medium text-brand-on-ink opacity-0 transition-all duration-300 group-hover:-top-11 group-hover:opacity-100">
                      {badge.label}
                      <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-brand-ink" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

      </div>

      <AnimatePresence>
        {pendingDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDeleteModal}
              className="absolute inset-0 bg-brand-ink/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="brand-float relative w-full max-w-md overflow-hidden rounded-[22px] border border-brand-line p-6"
            >
              <div className="space-y-5">
                <div className="mt-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-danger/10 text-brand-danger">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="mb-2 font-brand text-[19px] font-semibold tracking-[-0.01em] text-brand-ink">{t('dashboard.deleteModalTitle')}</h2>
                  <p className="text-[13.5px] leading-relaxed text-brand-muted">
                    {t('dashboard.deleteConfirm')}
                    {pendingDelete.position && <span className="mt-2 block font-semibold text-brand-ink">"{pendingDelete.position}"</span>}
                  </p>
                </div>
                {deleteModalError && (
                  <div className="rounded-xl border border-brand-danger/30 bg-brand-danger/[0.06] p-3.5 text-[12.5px] font-semibold text-brand-danger">
                    {deleteModalError}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={closeDeleteModal}
                    className="rounded-xl border border-brand-line bg-brand-card py-3 text-[13.5px] font-semibold text-brand-ink transition-colors hover:border-brand-ink"
                  >
                    {t('dashboard.deleteModalCancel')}
                  </button>
                  <button
                    onClick={() => void confirmDeleteInterview()}
                    disabled={deletingId === pendingDelete.id}
                    className="rounded-xl bg-brand-danger py-3 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {deletingId === pendingDelete.id ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : t('dashboard.deleteModalConfirm')}
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
