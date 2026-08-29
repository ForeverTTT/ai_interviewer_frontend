import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle, ArrowRight, BarChart3, BriefcaseBusiness, CalendarDays,
  CheckCircle2, Clock3, FileClock, FileText, Flame, Loader2, PauseCircle,
  PlayCircle, PlusCircle, Sparkles, Target, Trash2, BookmarkCheck,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { getBackendBaseUrl } from '../lib/backendBase'
import { authenticatedFetch } from '../lib/authenticatedFetch'
import { createInterviewRequestId } from '../lib/interviewEvents'
import OfferSprintPanel from '../components/OfferSprintPanel'

const RESUMABLE_STATUSES = new Set(['draft', 'active', 'paused'])

function isResumable(interview) {
  return interview?.mode === 'practice' && RESUMABLE_STATUSES.has(interview?.status)
}

function parseReport(raw) {
  if (!raw) return null
  if (typeof raw === 'object') return raw
  try { return JSON.parse(raw) } catch { return null }
}

function hasReport(interview) {
  const report = parseReport(interview?.report_json)
  const hasStructuredContent = Boolean(
    report && [report.summary, report.strengths, report.toImprove, report.qaReview]
      .some(value => Array.isArray(value) && value.length > 0),
  )
  return hasStructuredContent || Boolean(String(interview?.report_markdown || '').trim())
}

function reportSummary(interview) {
  const report = parseReport(interview?.report_json)
  const summary = Array.isArray(report?.summary)
    ? report.summary.find(item => String(item || '').trim())
    : null
  if (summary) return String(summary).trim()
  return String(interview?.report_markdown || '').split('\n')
    .map(line => line.replace(/^#+\s*/, '').replace(/[*_`]/g, '').trim())
    .find(Boolean) || ''
}

function reportStrength(interview) {
  const report = parseReport(interview?.report_json)
  return Array.isArray(report?.strengths)
    ? String(report.strengths.find(item => String(item || '').trim()) || '').trim()
    : ''
}

function explicitReportScore(interview) {
  const report = parseReport(interview?.report_json)
  const value = Number(report?.overallScore ?? report?.overall_score)
  return Number.isFinite(value) && value >= 0 && value <= 100 ? Math.round(value) : null
}

function isGenerating(interview) {
  if (hasReport(interview)) return false
  return interview?.status === 'finalizing' || interview?.finalize_status === 'processing'
}

function effectiveSeconds(interview) {
  const value = Number(interview?.accumulated_seconds)
  return Number.isFinite(value) && value > 0 ? value : 0
}

function sessionDate(interview) {
  return interview?.completed_at || interview?.updated_at || interview?.created_at || null
}

function localDayKey(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function startOfWeek() {
  const result = new Date()
  result.setHours(0, 0, 0, 0)
  result.setDate(result.getDate() - (result.getDay() || 7) + 1)
  return result
}

function calculateStreak(dayKeys) {
  const unique = new Set(dayKeys.filter(Boolean))
  if (!unique.size) return 0
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  if (!unique.has(localDayKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (unique.has(localDayKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

function formatEffectiveDuration(seconds, t) {
  const totalMinutes = Math.floor(seconds / 60)
  if (totalMinutes < 60) return t('dashboard.growth.minutes', { count: totalMinutes })
  return t('dashboard.growth.hoursMinutes', {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  })
}

function getAction(interview, t) {
  if (hasReport(interview)) return { label: t('dashboard.growth.viewReport'), route: `/interview/${interview.id}/report`, icon: FileText, tone: 'primary' }
  if (isResumable(interview)) return { label: t('dashboard.growth.continuePractice'), route: `/interview/${interview.id}`, icon: PlayCircle, tone: 'dark' }
  if (isGenerating(interview)) return { label: t('dashboard.growth.generating'), route: null, icon: Loader2, tone: 'muted' }
  if (interview?.status === 'completed') return { label: t('dashboard.growth.checkReportStatus'), route: `/interview/${interview.id}/report`, icon: FileClock, tone: 'muted' }
  return { label: t('dashboard.growth.unavailable'), route: null, icon: PauseCircle, tone: 'muted' }
}

function statusLabel(interview, t) {
  if (hasReport(interview)) return t('dashboard.growth.status.reportReady')
  if (isGenerating(interview)) return t('dashboard.growth.status.generating')
  if (interview?.status === 'paused') return t('dashboard.growth.status.paused')
  if (isResumable(interview)) return t('dashboard.growth.status.inProgress')
  if (interview?.status === 'completed') return t('dashboard.growth.status.noReport')
  return t('dashboard.growth.status.closed')
}

export default function DashboardPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [interviews, setInterviews] = useState([])
  const [growthOverview, setGrowthOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [filter, setFilter] = useState('all')
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [deleteModalError, setDeleteModalError] = useState(null)
  const [taskBusy, setTaskBusy] = useState(false)
  const [taskError, setTaskError] = useState(false)
  const formalFinalizeRequestedRef = useRef(new Set())
  const localeTag = i18n.language === 'de' ? 'de-DE' : i18n.language === 'en' ? 'en-US' : 'zh-CN'

  const closeDeleteModal = useCallback(() => {
    setPendingDelete(null)
    setDeleteModalError(null)
  }, [])

  useEffect(() => { document.title = `${t('dashboard.growth.title')} · ${t('meta.title')}` }, [t])

  useEffect(() => {
    if (!pendingDelete) return undefined
    const onKeyDown = event => { if (event.key === 'Escape') closeDeleteModal() }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [closeDeleteModal, pendingDelete])

  useEffect(() => {
    let cancelled = false
    async function fetchInterviews() {
      if (!user) return
      setLoading(true)
      setLoadError(false)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) throw new Error('missing auth session')
        const [response, overviewResponse] = await Promise.all([
          authenticatedFetch(`${getBackendBaseUrl()}/api/interviews`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
          authenticatedFetch(`${getBackendBaseUrl()}/api/growth-center/overview`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }).catch(() => null),
        ])
        if (!response.ok) throw new Error('failed to load interviews')
        const data = await response.json()
        if (overviewResponse?.ok && !cancelled) {
          const overviewData = await overviewResponse.json()
          setGrowthOverview(overviewData)
        }
        const loadedInterviews = data.interviews || []
        if (!cancelled) setInterviews(loadedInterviews)
        loadedInterviews.forEach((interview) => {
          if (
            interview.mode !== 'formal'
            || hasReport(interview)
            || isGenerating(interview)
            || !RESUMABLE_STATUSES.has(interview.status)
            || formalFinalizeRequestedRef.current.has(interview.id)
          ) return
          formalFinalizeRequestedRef.current.add(interview.id)
          setInterviews(current => current.map(item => item.id === interview.id
            ? { ...item, status: 'finalizing', finalize_status: 'processing' }
            : item))
          void authenticatedFetch(`${getBackendBaseUrl()}/api/interviews/${interview.id}/finalize`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Request-Id': createInterviewRequestId(),
            },
            body: JSON.stringify({ messages: [], reportUiLanguage: i18n.language }),
          }).then(async (finalizeResponse) => {
            if (!finalizeResponse.ok || cancelled) return
            const finalizeBody = await finalizeResponse.json().catch(() => ({}))
            if (finalizeBody.interview) {
              setInterviews(current => current.map(item => item.id === interview.id ? finalizeBody.interview : item))
            }
          }).catch(() => {})
        })
      } catch {
        if (!cancelled) setLoadError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void fetchInterviews()
    return () => { cancelled = true }
  }, [i18n.language, user])

  const metrics = useMemo(() => {
    const effectiveInterviews = interviews.filter(interview => interview.status === 'completed' || effectiveSeconds(interview) >= 480)
    const totalSeconds = interviews.reduce((sum, interview) => sum + effectiveSeconds(interview), 0)
    const completedDayKeys = effectiveInterviews.map(interview => localDayKey(sessionDate(interview))).filter(Boolean)
    const weekStart = startOfWeek()
    const weeklyDays = new Set(effectiveInterviews
      .filter(interview => {
        const date = new Date(sessionDate(interview))
        return !Number.isNaN(date.getTime()) && date >= weekStart
      })
      .map(interview => localDayKey(sessionDate(interview)))).size
    return {
      effectiveCount: effectiveInterviews.length,
      totalSeconds,
      weeklyDays: growthOverview?.rhythm?.weeklyDays ?? weeklyDays,
      streak: growthOverview?.rhythm?.streak ?? calculateStreak(completedDayKeys),
    }
  }, [growthOverview, interviews])

  const latestReviewCandidate = useMemo(() => (
    interviews.find(interview => isGenerating(interview))
      || interviews.find(interview => hasReport(interview))
      || interviews.find(interview => interview.status === 'completed')
      || interviews[0]
      || null
  ), [interviews])
  const latestReport = useMemo(() => interviews.find(interview => hasReport(interview)) || null, [interviews])
  const readiness = growthOverview?.readiness || null
  const readinessScore = readiness?.overallScore ?? (latestReport ? explicitReportScore(latestReport) : null)
  const filteredInterviews = useMemo(() => interviews.filter(interview => {
    if (filter === 'reports') return hasReport(interview) || isGenerating(interview) || interview.status === 'completed'
    if (filter === 'continue') return isResumable(interview)
    return true
  }), [filter, interviews])

  const confirmDeleteInterview = async () => {
    if (!pendingDelete) return
    setDeletingId(pendingDelete.id)
    setDeleteModalError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('missing auth session')
      const response = await authenticatedFetch(`${getBackendBaseUrl()}/api/interviews/${pendingDelete.id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!response.ok) throw new Error('delete failed')
      setInterviews(current => current.filter(interview => interview.id !== pendingDelete.id))
      closeDeleteModal()
    } catch {
      setDeleteModalError(t('dashboard.deleteFailed'))
    } finally { setDeletingId(null) }
  }

  const openInterview = interview => {
    const action = getAction(interview, t)
    if (action.route) navigate(action.route)
  }

  const startRecommendedTask = async (taskOverride = null) => {
    const task = taskOverride || readiness?.nextPracticeTask
    const existingCollectionId = task?.collection_id || task?.collectionId || null
    const sourceInterviewId = task?.source_interview_id || task?.interviewId || readiness?.latestInterviewId
    const rawQuestionIndex = task?.question_index ?? task?.questionIndex
    const questionIndex = rawQuestionIndex === null || rawQuestionIndex === undefined ? NaN : Number(rawQuestionIndex)
    if (!existingCollectionId && (!sourceInterviewId || !Number.isInteger(questionIndex) || questionIndex < 0)) return
    setTaskBusy(true)
    setTaskError(false)
    try {
      let collectionId = existingCollectionId
      if (!collectionId) {
        const collectResponse = await authenticatedFetch(`${getBackendBaseUrl()}/api/growth-center/collections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interviewId: sourceInterviewId, questionIndex, source: 'report' }),
        })
        const collectBody = await collectResponse.json().catch(() => ({}))
        if (!collectResponse.ok || !collectBody.collection) throw new Error('collect failed')
        collectionId = collectBody.collection.id
      }
      const practiceResponse = await authenticatedFetch(`${getBackendBaseUrl()}/api/growth-center/collections/${collectionId}/practice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Request-Id': createInterviewRequestId() },
        body: JSON.stringify({ idempotencyKey: createInterviewRequestId() }),
      })
      const practiceBody = await practiceResponse.json().catch(() => ({}))
      if (!practiceResponse.ok || !practiceBody.interviewId) throw new Error('practice failed')
      navigate(`/interview/${practiceBody.interviewId}`)
    } catch {
      setTaskError(true)
    } finally { setTaskBusy(false) }
  }

  return (
    <div className="min-h-screen bg-[#f7f6f2] pb-24 pt-28 dark:bg-slate-950">
      <main className="mx-auto max-w-7xl space-y-10 px-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl space-y-4">
            <div className="section-badge">{t('dashboard.growth.eyebrow')}</div>
            <div className="space-y-3">
              <h1 className="font-serif text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">{t('dashboard.growth.title')}</h1>
              <p className="max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">{t('dashboard.growth.subtitle')}</p>
            </div>
          </motion.div>
          <Link to="/setup" className="btn-primary inline-flex w-full items-center justify-center gap-2 px-7 py-4 sm:w-auto"><PlusCircle className="h-5 w-5" />{t('dashboard.newInterview')}</Link>
        </header>

        <section aria-label={t('dashboard.growth.overview')} className="grid gap-5 lg:grid-cols-12">
          <motion.article initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-7 text-white shadow-2xl shadow-slate-900/15 lg:col-span-6 sm:p-9">
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary-500/25 blur-3xl" />
            <div className="relative flex min-h-[230px] flex-col justify-between gap-8">
              <div className="flex items-start justify-between gap-5">
                <div className="space-y-2"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-primary-300"><Target className="h-4 w-4" />{t('dashboard.growth.readiness.title')}</div><p className="max-w-md text-sm leading-relaxed text-slate-300">{t('dashboard.growth.readiness.description')}</p></div>
                <BriefcaseBusiness className="h-8 w-8 text-white/30" />
              </div>
              {readinessScore !== null ? (
                <div className="space-y-5"><div className="flex flex-wrap items-end justify-between gap-5"><div><span className="text-6xl font-black tabular-nums">{readinessScore}</span><span className="ml-2 text-sm font-bold text-slate-400">/ 100</span><p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-500">{t(`dashboard.growth.readiness.${readiness?.assessment || 'initial'}`)}</p></div><Link to={`/interview/${readiness?.latestInterviewId || latestReport.id}/report`} className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-primary-50">{t('dashboard.growth.viewEvidence')} <ArrowRight className="h-4 w-4" /></Link></div>{readiness?.dimensions?.length > 0 && <div className="grid gap-2 sm:grid-cols-5">{readiness.dimensions.map(dimension => <details key={dimension.key} className="rounded-xl bg-white/[0.07] p-3"><summary className="cursor-pointer list-none"><div className="flex justify-between gap-2 text-[10px] font-black"><span>{t(`dashboard.growth.readiness.dimensions.${dimension.key}`)}</span><span className="text-primary-300">{dimension.score ?? '—'}</span></div><div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-primary-400" style={{ width: `${dimension.score ?? 0}%` }} /></div></summary><p className="mt-3 text-[10px] leading-relaxed text-slate-300">{dimension.evidence?.excerpt || t('dashboard.growth.readiness.insufficient')}</p>{dimension.trend !== null && dimension.trend !== undefined && <p className="mt-2 text-[10px] font-black text-primary-300">{dimension.trend > 0 ? '+' : ''}{dimension.trend}</p>}</details>)}</div>}</div>
              ) : (
                <div className="flex flex-wrap items-end justify-between gap-5"><div className="space-y-2"><p className="text-2xl font-black">{t('dashboard.growth.readiness.pendingTitle')}</p><p className="max-w-md text-sm text-slate-400">{t('dashboard.growth.readiness.pendingBody')}</p></div><Link to={latestReport ? `/interview/${latestReport.id}/report` : '/setup'} className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-primary-50">{latestReport ? t('dashboard.growth.viewLatestReport') : t('dashboard.growth.startBaseline')}<ArrowRight className="h-4 w-4" /></Link></div>
              )}
            </div>
          </motion.article>

          <motion.article initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card-premium p-7 lg:col-span-3 sm:p-8">
            <div className="flex h-full min-h-[230px] flex-col justify-between gap-7"><div className="flex items-center justify-between"><div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300"><BarChart3 className="h-6 w-6" /></div><span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{t('dashboard.growth.practice.title')}</span></div><div className="space-y-5"><div><div className="text-4xl font-black tracking-tight text-slate-950 dark:text-white">{metrics.effectiveCount}</div><div className="mt-1 text-sm font-bold text-slate-500">{t('dashboard.growth.practice.count')}</div></div><div className="flex items-center gap-2 border-t border-slate-100 pt-4 text-sm font-bold text-slate-700 dark:border-slate-800 dark:text-slate-200"><Clock3 className="h-4 w-4 text-indigo-500" />{formatEffectiveDuration(metrics.totalSeconds, t)}</div></div></div>
          </motion.article>

          <motion.article initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-premium p-7 lg:col-span-3 sm:p-8">
            <div className="flex h-full min-h-[230px] flex-col justify-between gap-7"><div className="flex items-center justify-between"><div className="rounded-2xl bg-amber-50 p-3 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300"><CalendarDays className="h-6 w-6" /></div><span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{t('dashboard.growth.rhythm.title')}</span></div><div className="space-y-5"><div><div className="text-4xl font-black tracking-tight text-slate-950 dark:text-white">{metrics.weeklyDays}<span className="ml-1 text-lg text-slate-400">/ 5</span></div><div className="mt-1 text-sm font-bold text-slate-500">{t('dashboard.growth.rhythm.weeklyDays')}</div></div><div className="flex items-center gap-2 border-t border-slate-100 pt-4 text-sm font-bold text-slate-700 dark:border-slate-800 dark:text-slate-200"><Flame className="h-4 w-4 text-amber-500" />{t('dashboard.growth.rhythm.streak', { count: metrics.streak })}</div></div></div>
          </motion.article>
        </section>

        <OfferSprintPanel
          offerSprint={growthOverview?.offerSprint}
          onOverview={setGrowthOverview}
          onStartTask={startRecommendedTask}
        />

        {!growthOverview?.offerSprint?.plan && readiness?.nextPracticeTask && (
          <section className="grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
            <article className="rounded-[2rem] bg-gradient-to-br from-primary-600 to-indigo-700 p-7 text-white shadow-xl shadow-primary-900/10 sm:p-8"><div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"><div className="max-w-3xl"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary-100">{t('dashboard.growth.task.eyebrow')}</p><h2 className="mt-3 font-serif text-2xl font-black">{readiness.nextPracticeTask.title || readiness.nextPracticeTask.questionText}</h2><p className="mt-3 text-sm leading-relaxed text-primary-50/80">{readiness.nextPracticeTask.reason}</p><p className="mt-3 text-xs font-bold text-primary-100">{t('dashboard.growth.task.minutes', { count: readiness.nextPracticeTask.estimatedMinutes || 8 })}</p>{taskError && <p className="mt-3 rounded-lg bg-red-950/30 px-3 py-2 text-xs font-bold text-red-100">{t('dashboard.growth.task.failed')}</p>}</div><button type="button" disabled={taskBusy || readiness.nextPracticeTask.questionIndex === null || readiness.nextPracticeTask.questionIndex === undefined || !Number.isInteger(Number(readiness.nextPracticeTask.questionIndex))} onClick={() => void startRecommendedTask()} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-50">{taskBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}{t('dashboard.growth.task.start')}</button></div></article>
            <article className="card-premium flex flex-col justify-center p-7"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{t('dashboard.growth.task.weekly')}</p><p className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{t('dashboard.growth.task.weeklyCount', { count: readiness.weeklyTasks?.length || 1 })}</p><div className="mt-3 space-y-2">{(readiness.weeklyTasks || [readiness.nextPracticeTask]).slice(0, 5).map((task, index) => <p key={task.id || index} className="line-clamp-1 text-xs font-bold text-slate-500"><span className="mr-2 text-primary-500">{index + 1}.</span>{task.title || task.questionText}</p>)}</div><p className="mt-3 text-xs leading-relaxed text-slate-400">{t('dashboard.growth.task.weeklyBody')}</p></article>
          </section>
        )}

        <section className="card-premium p-6 sm:p-8">
          <div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{t('dashboard.growth.collections.eyebrow')}</p><h2 className="mt-2 font-serif text-2xl font-black text-slate-950 dark:text-white">{t('dashboard.growth.collections.title')}</h2></div><Link to="/notes" className="inline-flex items-center gap-2 text-sm font-black text-primary-600 dark:text-primary-400">{t('dashboard.growth.collections.viewAll')}<ArrowRight className="h-4 w-4" /></Link></div>
          {growthOverview?.recentCollections?.length > 0 ? <div className="grid gap-4 md:grid-cols-3">{growthOverview.recentCollections.map(collection => <Link key={collection.id} to="/notes" className="group rounded-2xl border border-slate-200 p-5 transition hover:-translate-y-1 hover:border-primary-300 dark:border-slate-800 dark:hover:border-primary-800"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">{t('dashboard.growth.collections.toReview')}</span>{collection.is_pinned && <BookmarkCheck className="h-4 w-4 text-primary-500" />}</div><h3 className="mt-4 line-clamp-3 text-sm font-black leading-relaxed text-slate-950 dark:text-white">{collection.question_text}</h3><p className="mt-3 text-xs font-bold text-slate-400">{collection.position}</p></Link>)}</div> : <div className="rounded-2xl border-2 border-dashed border-slate-200 p-6 text-sm text-slate-500 dark:border-slate-800">{t('dashboard.growth.collections.empty')}</div>}
        </section>

        <section className="card-premium overflow-hidden p-6 sm:p-8">
          <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-primary-600 dark:text-primary-400">{t('dashboard.growth.latest.eyebrow')}</p><h2 className="mt-2 font-serif text-2xl font-black text-slate-950 dark:text-white">{t('dashboard.growth.latest.title')}</h2></div>{latestReviewCandidate && !isGenerating(latestReviewCandidate) && <span className="text-xs font-bold text-slate-400">{new Date(sessionDate(latestReviewCandidate)).toLocaleDateString(localeTag, { year: 'numeric', month: 'short', day: 'numeric' })}</span>}</div>
          {loading ? <div className="flex min-h-40 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary-500" /></div>
            : loadError ? <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-bold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{t('dashboard.growth.loadFailed')}</div>
              : !latestReviewCandidate ? <div className="flex flex-col items-start justify-between gap-6 rounded-[1.75rem] border-2 border-dashed border-slate-200 p-7 dark:border-slate-800 sm:flex-row sm:items-center"><div className="flex gap-4"><div className="rounded-2xl bg-slate-100 p-3 text-slate-400 dark:bg-slate-900"><Sparkles className="h-6 w-6" /></div><div><h3 className="font-black text-slate-950 dark:text-white">{t('dashboard.growth.latest.emptyTitle')}</h3><p className="mt-1 text-sm text-slate-500">{t('dashboard.growth.latest.emptyBody')}</p></div></div><Link to="/setup" className="btn-primary inline-flex w-full items-center justify-center gap-2 px-6 py-3 sm:w-auto">{t('dashboard.growth.startBaseline')} <ArrowRight className="h-4 w-4" /></Link></div>
                : isGenerating(latestReviewCandidate) ? <div className="flex items-center gap-5 rounded-[1.75rem] border border-indigo-100 bg-indigo-50/70 p-7 dark:border-indigo-900/50 dark:bg-indigo-950/20" role="status"><div className="rounded-2xl bg-white p-3 text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-300"><Loader2 className="h-6 w-6 animate-spin" /></div><div><h3 className="font-black text-slate-950 dark:text-white">{t('dashboard.growth.latest.generatingTitle')}</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t('dashboard.growth.latest.generatingBody')}</p></div></div>
                  : hasReport(latestReviewCandidate) ? <div className="grid gap-6 rounded-[1.75rem] bg-slate-950 p-7 text-white md:grid-cols-[1fr_auto] md:items-end"><div className="space-y-4"><div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-400"><span>{latestReviewCandidate.position}</span><span>·</span><span>{latestReviewCandidate.language}</span><span>·</span><span>{latestReviewCandidate.duration} {t('dashboard.durMin')}</span></div><p className="max-w-3xl text-lg font-bold leading-relaxed">{reportSummary(latestReviewCandidate) || t('dashboard.growth.latest.reportReadyBody')}</p>{reportStrength(latestReviewCandidate) && <p className="flex items-start gap-2 text-sm text-emerald-300"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{reportStrength(latestReviewCandidate)}</p>}</div><Link to={`/interview/${latestReviewCandidate.id}/report`} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-4 text-sm font-black text-slate-950 transition hover:bg-primary-50 md:w-auto">{t('dashboard.growth.viewReport')} <ArrowRight className="h-4 w-4" /></Link></div>
                    : isResumable(latestReviewCandidate) ? <div className="flex flex-col items-start justify-between gap-6 rounded-[1.75rem] border border-amber-200 bg-amber-50/70 p-7 dark:border-amber-900/50 dark:bg-amber-950/20 sm:flex-row sm:items-center"><div className="flex gap-4"><PauseCircle className="h-7 w-7 shrink-0 text-amber-600" /><div><h3 className="font-black text-slate-950 dark:text-white">{t('dashboard.growth.latest.unfinishedTitle')}</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t('dashboard.growth.latest.unfinishedBody', { position: latestReviewCandidate.position })}</p></div></div><Link to={`/interview/${latestReviewCandidate.id}`} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-4 text-sm font-black text-white dark:bg-white dark:text-slate-950 sm:w-auto">{t('dashboard.growth.continuePractice')} <ArrowRight className="h-4 w-4" /></Link></div>
                      : <div className="flex flex-col items-start justify-between gap-6 rounded-[1.75rem] border border-slate-200 p-7 dark:border-slate-800 sm:flex-row sm:items-center"><div><h3 className="font-black text-slate-950 dark:text-white">{t('dashboard.growth.latest.noReportTitle')}</h3><p className="mt-1 text-sm text-slate-500">{t('dashboard.growth.latest.noReportBody')}</p></div><Link to={`/interview/${latestReviewCandidate.id}/report`} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-6 py-3 text-sm font-black text-slate-800 dark:border-slate-700 dark:text-white sm:w-auto">{t('dashboard.growth.checkReportStatus')} <ArrowRight className="h-4 w-4" /></Link></div>}
        </section>

        <section className="space-y-6" aria-labelledby="review-history-title">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{t('dashboard.growth.history.eyebrow')}</p><h2 id="review-history-title" className="mt-2 font-serif text-3xl font-black text-slate-950 dark:text-white">{t('dashboard.growth.history.title')}</h2><p className="mt-2 text-sm text-slate-500">{t('dashboard.growth.history.subtitle')}</p></div><div className="flex rounded-xl bg-white p-1 shadow-sm dark:bg-slate-900" role="group" aria-label={t('dashboard.growth.history.filterLabel')}>{['all', 'reports', 'continue'].map(option => <button key={option} type="button" onClick={() => setFilter(option)} className={`rounded-lg px-4 py-2 text-xs font-black transition ${filter === option ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950' : 'text-slate-500 hover:text-slate-950 dark:hover:text-white'}`}>{t(`dashboard.growth.history.filters.${option}`)}</button>)}</div></div>
          {loading ? <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div>
            : filteredInterviews.length === 0 ? <div className="card-premium flex min-h-56 flex-col items-center justify-center gap-5 p-8 text-center"><FileText className="h-10 w-10 text-slate-300" /><div><h3 className="font-black text-slate-950 dark:text-white">{filter === 'all' ? t('dashboard.growth.history.emptyTitle') : t('dashboard.growth.history.noMatchTitle')}</h3><p className="mt-1 text-sm text-slate-500">{filter === 'all' ? t('dashboard.growth.history.emptyBody') : t('dashboard.growth.history.noMatchBody')}</p></div>{filter === 'all' && <Link to="/setup" className="btn-primary inline-flex items-center gap-2 px-6 py-3">{t('dashboard.growth.startBaseline')} <ArrowRight className="h-4 w-4" /></Link>}</div>
              : <div className="grid gap-5 lg:grid-cols-2">{filteredInterviews.map((interview, index) => {
                const action = getAction(interview, t)
                const ActionIcon = action.icon
                const date = new Date(sessionDate(interview))
                const summary = reportSummary(interview)
                return <motion.article key={interview.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.04, 0.25) }} role={action.route ? 'link' : undefined} tabIndex={action.route ? 0 : undefined} onClick={() => openInterview(interview)} onKeyDown={event => { if (action.route && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openInterview(interview) } }} className={`card-premium group relative flex flex-col gap-6 p-6 transition sm:p-7 ${action.route ? 'cursor-pointer hover:-translate-y-1 hover:border-primary-200 hover:shadow-xl dark:hover:border-primary-900' : ''}`}>
                  <div className="flex items-start justify-between gap-4"><div className="min-w-0 space-y-2"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${hasReport(interview) ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : isGenerating(interview) ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300' : isResumable(interview) ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>{isGenerating(interview) && <Loader2 className="h-3 w-3 animate-spin" />}{statusLabel(interview, t)}</span><h3 className="truncate text-xl font-black text-slate-950 dark:text-white">{interview.position || t('dashboard.growth.history.untitled')}</h3></div><button type="button" onClick={event => { event.stopPropagation(); setPendingDelete({ id: interview.id, position: interview.position || '' }) }} className="relative z-10 rounded-xl p-2 text-slate-300 transition hover:bg-red-50 hover:text-red-500 focus:text-red-500 dark:hover:bg-red-950/30" aria-label={t('dashboard.delete')}><Trash2 className="h-4 w-4" /></button></div>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold text-slate-500"><span>{date.toLocaleDateString(localeTag, { year: 'numeric', month: 'short', day: 'numeric' })}</span><span>{interview.language}</span><span>{interview.mode === 'practice' ? t('dashboard.growth.history.practiceMode') : t('dashboard.growth.history.formalMode')}</span><span>{interview.duration} {t('dashboard.durMin')}</span></div>
                  <p className="min-h-10 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{summary || (isResumable(interview) ? t('dashboard.growth.history.resumeHint') : isGenerating(interview) ? t('dashboard.growth.latest.generatingBody') : t('dashboard.growth.history.noSummary'))}</p>
                  <div className="mt-auto border-t border-slate-100 pt-5 dark:border-slate-800"><span className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black sm:w-auto ${action.tone === 'primary' ? 'bg-primary-600 text-white' : action.tone === 'dark' ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}><ActionIcon className={`h-4 w-4 ${isGenerating(interview) ? 'animate-spin' : ''}`} />{action.label}{action.route && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}</span></div>
                </motion.article>
              })}</div>}
        </section>
      </main>

      <AnimatePresence>{pendingDelete && <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"><motion.button type="button" aria-label={t('dashboard.deleteModalCancel')} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeDeleteModal} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" /><motion.div role="dialog" aria-modal="true" initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }} className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl dark:bg-slate-900"><div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500 dark:bg-red-950/30"><AlertTriangle className="h-7 w-7" /></div><h2 className="font-serif text-2xl font-black text-slate-950 dark:text-white">{t('dashboard.deleteModalTitle')}</h2><p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-300">{t('dashboard.deleteConfirm')}</p>{pendingDelete.position && <p className="mt-2 font-bold text-slate-950 dark:text-white">“{pendingDelete.position}”</p>}{deleteModalError && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600 dark:bg-red-950/30 dark:text-red-300">{deleteModalError}</p>}<div className="mt-8 grid grid-cols-2 gap-3"><button type="button" onClick={closeDeleteModal} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 dark:border-slate-700 dark:text-slate-200">{t('dashboard.deleteModalCancel')}</button><button type="button" onClick={() => void confirmDeleteInterview()} disabled={deletingId === pendingDelete.id} className="rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white disabled:opacity-60">{deletingId === pendingDelete.id ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : t('dashboard.deleteModalConfirm')}</button></div></motion.div></div>}</AnimatePresence>
    </div>
  )
}
