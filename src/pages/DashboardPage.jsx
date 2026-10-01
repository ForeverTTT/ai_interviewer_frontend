import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  AlertTriangle, ArrowRight, BarChart3, BriefcaseBusiness,
  Check, CheckCircle2, Clock3, FileClock, FileText, Flame, Loader2, PauseCircle,
  PlayCircle, PlusCircle, Target, Trash2, BookmarkCheck,
  Layers, History, RotateCcw, Eye, SkipForward,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { getBackendBaseUrl } from '../lib/backendBase'
import { authenticatedFetch } from '../lib/authenticatedFetch'
import { createInterviewRequestId } from '../lib/interviewEvents'
import OfferSprintPanel from '../components/OfferSprintPanel'
import './DashboardPage.css'

const REVIEW_MENTOR_WRITING = '/brand/flowlab-review-mentor-writing.png'

const RESUMABLE_STATUSES = new Set(['draft', 'active', 'paused'])

function isResumable(interview) {
  return interview?.mode === 'practice' && RESUMABLE_STATUSES.has(interview?.status)
}

function parseReport(raw) {
  if (!raw) return null
  if (typeof raw === 'object') return raw
  try { return JSON.parse(raw) } catch { return null }
}

function InlineRichText({ text }) {
  const parts = String(text || '').split(/(\*\*[^*\n]+\*\*)/g)
  return parts.map((part, index) => {
    const match = part.match(/^\*\*([^*\n]+)\*\*$/)
    return match
      ? <strong key={index} className="rounded-[3px] bg-brand-glow/25 px-0.5 font-semibold text-brand-ink">{match[1]}</strong>
      : part || null
  })
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

/**
 * 复习闪卡：最近收藏的题目，正面是题目，点一下在 3D 空间里翻到背面看答案要点。
 * 完整的筛选、笔记和再次练习都在题目收藏库里，这里只做「随手翻一翻」。
 */
function ReviewFlashcards({ collections, t }) {
  const [flipped, setFlipped] = useState({})
  if (!collections.length) {
    return (
      <div className="brand-float flex min-h-52 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
        <Layers className="h-8 w-8 text-brand-muted" />
        <p className="max-w-md text-[13px] leading-relaxed text-brand-muted">{t('dashboard.growth.collections.empty')}</p>
        <Link to="/notes" className="lk-btn lk-btn-ghost">{t('dashboard.growth.collections.viewAll')}<ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>
    )
  }
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-muted">{t('dashboard.growth.collections.eyebrow')}</p>
          <h2 className="mt-1.5 font-brand text-[17px] font-semibold text-brand-ink">{t('dashboard.growth.collections.title')}</h2>
        </div>
        <Link to="/notes" className="lk-btn lk-btn-ghost !py-2 !text-[12.5px]">{t('dashboard.growth.collections.viewAll')}<ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {collections.map((collection, index) => {
          const isFlipped = Boolean(flipped[collection.id])
          const answer = String(collection.answer_text || collection.answer || '').trim()
          return (
            <div key={collection.id} className="lk-perspective h-[220px]">
              <motion.button
                type="button"
                onClick={() => setFlipped(cur => ({ ...cur, [collection.id]: !cur[collection.id] }))}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                style={{ transformStyle: 'preserve-3d' }}
                className="relative h-full w-full text-left"
                aria-pressed={isFlipped}
              >
                <span className="absolute inset-0 flex flex-col rounded-[22px] border border-brand-sage/25 bg-gradient-to-br from-brand-sage/[0.18] via-brand-card to-brand-card p-5 shadow-sm [backface-visibility:hidden]">
                  <span className="flex items-center justify-between">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-card font-display text-[13px] font-semibold tabular-nums text-brand-ink shadow-sm">Q{index + 1}</span>
                    <BookmarkCheck className="h-4 w-4 text-brand-muted" />
                  </span>
                  <span className="mt-4 line-clamp-4 font-sans text-[16px] font-medium leading-[1.65] tracking-[-0.01em] text-brand-ink">{collection.question_text}</span>
                  <span className="mt-auto flex items-center justify-between gap-2 pt-3 text-[11.5px] text-brand-muted">
                    <span className="truncate">{collection.position}</span>
                    <span className="flex shrink-0 items-center gap-1 font-medium text-brand-ink"><RotateCcw className="h-3 w-3" />{t('notes.reveal')}</span>
                  </span>
                </span>
                <span className="absolute inset-0 flex flex-col rounded-[22px] border border-brand-ink/15 bg-brand-card p-5 shadow-sm [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted">{t('notes.answer')}</span>
                  <span className="mt-2 line-clamp-5 text-[13px] leading-relaxed text-brand-ink">{answer || '—'}</span>
                  <span className="mt-auto flex items-center justify-between gap-2 pt-3 text-[11.5px] text-brand-muted">
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{t('notes.hide')}</span>
                  </span>
                </span>
              </motion.button>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default function DashboardPage() {
  const { t, i18n } = useTranslation()
  const shouldReduceMotion = useReducedMotion()
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
  const [coachTaskBusy, setCoachTaskBusy] = useState(null)
  const [coachTaskError, setCoachTaskError] = useState(false)
  const [section, setSection] = useState('review')
  const [planEditRequest, setPlanEditRequest] = useState(0)
  const formalFinalizeRequestedRef = useRef(new Set())
  const sprintPanelRef = useRef(null)
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
  const offerSprint = growthOverview?.offerSprint || null
  const offerPlan = offerSprint?.plan || null
  const coachReminder = (offerSprint?.reminders || []).find(reminder => reminder.channel === 'in_app') || null
  const coachRecovery = offerSprint?.recoveryNudge || null
  const coachTasks = offerSprint?.tasks || []
  const coachTodayTask = offerSprint?.todayTask || coachTasks.find(task => task.status === 'pending') || null
  const coachSprint = offerSprint?.sprint || {}
  const coachProgress = offerSprint?.progress || {}
  const coachCountdown = coachSprint.interviewDays ?? coachSprint.offerDays ?? null
  const coachCountdownDigits = coachCountdown !== null && coachCountdown >= 0
    ? String(coachCountdown).padStart(2, '0').split('')
    : []
  const coachWeeklyCurrent = coachProgress.effectiveDays || 0
  const coachWeeklyTarget = coachProgress.weeklyTargetDays || offerPlan?.weekly_target_days || 5
  const coachWeeklyPercent = Math.min(100, Math.round((coachWeeklyCurrent / Math.max(1, coachWeeklyTarget)) * 100))
  const coachMessage = coachReminder
    ? t('growthSprint.coach.notice', {
      title: t(`growthSprint.reminders.${coachReminder.reminder_type}.title`),
      body: t(`growthSprint.reminders.${coachReminder.reminder_type}.body`, { position: offerPlan?.target_position || '' }),
    })
    : coachRecovery
      ? t('growthSprint.coach.notice', {
        title: t(`growthSprint.recovery.${coachRecovery.type}.title`),
        body: t(`growthSprint.recovery.${coachRecovery.type}.body`, { count: coachRecovery.remainingDays }),
      })
      : coachTodayTask
        ? t('growthSprint.coach.today', {
          task: t(`growthSprint.tasks.types.${coachTodayTask.task_type}.title`),
          minutes: coachTodayTask.estimated_minutes || 10,
        })
        : offerPlan
        ? t('growthSprint.coach.active', {
          position: offerPlan.target_position,
          focus: t(`growthSprint.stage.${offerSprint?.sprint?.stage || 'foundation'}`),
        })
        : t('growthSprint.coach.empty')
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

  const openPlanEditor = () => {
    setPlanEditRequest(request => request + 1)
    window.requestAnimationFrame(() => sprintPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const refreshGrowthOverview = async () => {
    const response = await authenticatedFetch(`${getBackendBaseUrl()}/api/growth-center/overview`)
    if (!response.ok) throw new Error('overview failed')
    setGrowthOverview(await response.json())
  }

  const updateCoachTask = async status => {
    if (!coachTodayTask) return
    setCoachTaskBusy(status)
    setCoachTaskError(false)
    try {
      const response = await authenticatedFetch(`${getBackendBaseUrl()}/api/growth-center/offer-plan/tasks/${coachTodayTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) throw new Error('task update failed')
      await refreshGrowthOverview()
    } catch {
      setCoachTaskError(true)
    } finally {
      setCoachTaskBusy(null)
    }
  }

  const dismissCoachReminder = async () => {
    if (!coachReminder) return
    setCoachTaskBusy('reminder')
    setCoachTaskError(false)
    try {
      const response = await authenticatedFetch(`${getBackendBaseUrl()}/api/growth-center/offer-plan/reminders/${coachReminder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'dismissed' }),
      })
      if (!response.ok) throw new Error('reminder update failed')
      await refreshGrowthOverview()
    } catch {
      setCoachTaskError(true)
    } finally {
      setCoachTaskBusy(null)
    }
  }

  const startCoachTask = async () => {
    if (!coachTodayTask) {
      openPlanEditor()
      return
    }
    if (['focus_question', 'review_collection'].includes(coachTodayTask.task_type)) {
      await startRecommendedTask(coachTodayTask)
      return
    }
    if (coachTodayTask.task_type === 'weekly_review') {
      navigate('/notes')
      return
    }
    if (coachTodayTask.task_type === 'pre_interview_checklist') {
      await updateCoachTask('completed')
      return
    }
    navigate('/setup', {
      state: {
        offerSprintDefaults: {
          position: offerPlan?.target_position,
          jobDescription: offerPlan?.target_job_description,
          interviewerType: offerPlan?.interviewer_type,
          duration: coachTodayTask.estimated_minutes,
          mode: coachTodayTask.task_type === 'self_intro' ? 'practice' : 'formal',
        },
      },
    })
  }

  const startRecommendedTask = async (taskOverride = null) => {
    const task = taskOverride || readiness?.nextPracticeTask
    const existingCollectionId = task?.collection_id || task?.collectionId || null
    const sourceInterviewId = task?.source_interview_id || task?.interviewId || readiness?.latestInterviewId
    const rawQuestionIndex = task?.question_index ?? task?.questionIndex
    const questionIndex = rawQuestionIndex === null || rawQuestionIndex === undefined ? NaN : Number(rawQuestionIndex)
    if (!existingCollectionId && (!sourceInterviewId || !Number.isInteger(questionIndex) || questionIndex < 0)) return
    setTaskBusy(true)
    setCoachTaskError(false)
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
      setCoachTaskError(true)
      if (taskOverride) throw new Error('practice creation failed')
    } finally { setTaskBusy(false) }
  }

  /* 卡片外壳：全站统一的 1px 描边 + 纯白底，不再用 card-premium 的投影 */
  const CARD = 'brand-float rounded-[22px]'
  /* 区块眉标：小字、中性灰、字距拉开 */
  const EYEBROW = 'text-[11px] font-medium uppercase tracking-[0.16em] text-brand-muted'
  const H2 = 'font-brand text-[17px] font-semibold tracking-[-0.01em] text-brand-ink'

  return (
    <div className="flowlab-dashboard theme-quiet min-h-screen pb-20 pt-[5.5rem]">
      <main className="ui-container max-w-[1400px] space-y-5">

        {/* ───────── 复盘学长：目标、提醒与日常进度 ───────── */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="fl-dashboard-coach"
        >
          <div className="fl-dashboard-coach-dialogue">
            <div className="fl-dashboard-coach-message">
              <div className={`fl-dashboard-coach-message-main ${coachCountdownDigits.length ? 'has-countdown' : ''}`}>
                <div className="fl-dashboard-coach-message-copy">
                  <p className="fl-dashboard-coach-speech">{coachMessage}</p>
                  <div className="fl-dashboard-coach-actions">
                    <button
                      type="button"
                      disabled={taskBusy || Boolean(coachTaskBusy)}
                      onClick={offerPlan && coachTodayTask ? startCoachTask : openPlanEditor}
                      className="fl-dashboard-soft-button"
                    >
                      {taskBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : offerPlan && coachTodayTask ? <PlayCircle className="h-4 w-4" /> : null}
                      {t(!offerPlan ? 'growthSprint.coach.setGoal' : coachTodayTask ? 'growthSprint.coach.startToday' : 'growthSprint.coach.adjust')}
                    </button>
                    {coachTodayTask && (
                      <>
                        <button type="button" disabled={Boolean(coachTaskBusy)} onClick={() => void updateCoachTask('completed')} className="fl-dashboard-coach-link">
                          {coachTaskBusy === 'completed' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          {t('growthSprint.tasks.complete')}
                        </button>
                        <button type="button" disabled={Boolean(coachTaskBusy)} onClick={() => void updateCoachTask('skipped')} className="fl-dashboard-coach-link">
                          {coachTaskBusy === 'skipped' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SkipForward className="h-3.5 w-3.5" />}
                          {t('growthSprint.tasks.skip')}
                        </button>
                      </>
                    )}
                    {coachReminder && (
                      <button type="button" disabled={Boolean(coachTaskBusy)} onClick={() => void dismissCoachReminder()} className="fl-dashboard-coach-link">
                        {coachTaskBusy === 'reminder' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {t('growthSprint.reminders.dismiss')}
                      </button>
                    )}
                    {offerPlan ? (
                      coachTodayTask ? (
                        <button type="button" onClick={openPlanEditor} className="fl-dashboard-coach-link">
                          {t('growthSprint.coach.adjust')}
                        </button>
                      ) : null
                    ) : (
                      <Link to="/setup" className="fl-dashboard-coach-link">
                        <PlusCircle className="h-4 w-4" />{t('growthSprint.coach.practiceFirst')}
                      </Link>
                    )}
                  </div>
                </div>
                {coachCountdownDigits.length > 0 && (
                  <div className="fl-dashboard-countdown" aria-label={t('growthSprint.coach.daysLeft', { count: coachCountdown })}>
                    <span className="fl-dashboard-countdown-label">{t('growthSprint.coach.countdownLabel')}</span>
                    <span className="fl-dashboard-countdown-digits" aria-hidden="true">
                      {coachCountdownDigits.map((digit, index) => (
                        <span className="fl-dashboard-countdown-tile" key={`${index}-${digit}`}>
                          <motion.span
                            initial={shouldReduceMotion ? false : { rotateX: -78, opacity: 0 }}
                            animate={{ rotateX: 0, opacity: 1 }}
                            transition={{ duration: shouldReduceMotion ? 0 : 0.48, delay: shouldReduceMotion ? 0 : index * 0.07, ease: [0.16, 1, 0.3, 1] }}
                          >
                            {digit}
                          </motion.span>
                        </span>
                      ))}
                    </span>
                    <span className="fl-dashboard-countdown-unit">{t('growthSprint.coach.dayUnit')}</span>
                  </div>
                )}
              </div>
              {offerPlan && (
                <div className="fl-dashboard-coach-goal">
                  <Target className="h-4 w-4" />
                  <span>{t('growthSprint.coach.goal', { position: offerPlan.target_position })}</span>
                  <span>{t('growthSprint.coach.weekly', { current: coachWeeklyCurrent, target: coachWeeklyTarget })}</span>
                  {coachProgress.total > 0 && <span>{t('growthSprint.progress.title')} {coachProgress.completed || 0} / {coachProgress.total}</span>}
                  <i aria-hidden="true"><b style={{ width: `${coachWeeklyPercent}%` }} /></i>
                </div>
              )}
              {coachTaskError && <p className="fl-dashboard-coach-error">{t('growthSprint.errors.task')}</p>}
            </div>
            <div className="fl-dashboard-coach-history" aria-label={t('dashboard.growth.overview')}>
              <span><BarChart3 />{t('growthSprint.coach.historyCount', { count: metrics.effectiveCount })}</span>
              <span><Clock3 />{formatEffectiveDuration(metrics.totalSeconds, t)}</span>
              <span><Flame />{t('dashboard.growth.rhythm.streak', { count: metrics.streak })}</span>
            </div>
          </div>
          <div className="fl-dashboard-coach-character">
            <img src={REVIEW_MENTOR_WRITING} alt={t('dashboard.growth.mentor.name')} />
          </div>
        </motion.section>

        <div ref={sprintPanelRef} className="scroll-mt-24">
          <OfferSprintPanel
            offerSprint={offerSprint}
            practiceStats={{
              count: metrics.effectiveCount,
              duration: formatEffectiveDuration(metrics.totalSeconds, t),
            }}
            onOverview={setGrowthOverview}
            onStartTask={startRecommendedTask}
            editingRequest={planEditRequest}
            coachOwnsPrompts
          />
        </div>

        {/* ───────── 主概览：开放式的两栏内容，不再套一层大边框 ───────── */}
        <motion.section
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          aria-label={t('dashboard.growth.overview')}
          className="fl-dashboard-overview"
        >
          <div className="grid gap-4 lg:grid-cols-12">
            <article className="fl-dashboard-panel px-6 py-6 sm:px-8 sm:py-7 lg:col-span-7">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className={`flex items-center gap-2 ${EYEBROW}`}><Target className="h-3.5 w-3.5" />{t('dashboard.growth.readiness.title')}</p>
                  <p className="mt-2 max-w-lg text-[12.5px] leading-relaxed text-brand-muted">{t('dashboard.growth.readiness.description')}</p>
                </div>
                <BriefcaseBusiness className="h-5 w-5 shrink-0 text-brand-muted" />
              </div>

              {readinessScore !== null ? (
                <div className="mt-6 grid gap-6 sm:grid-cols-[112px_minmax(0,1fr)] sm:items-start">
                  <div>
                    <div className="relative grid h-[104px] w-[104px] place-items-center">
                      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                        <circle cx="60" cy="60" r="50" fill="none" stroke="rgb(var(--brand-line))" strokeWidth="9" />
                        <circle cx="60" cy="60" r="50" fill="none" stroke="rgb(var(--brand-violet))" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(2 * Math.PI * 50 * readinessScore) / 100} ${2 * Math.PI * 50}`} />
                      </svg>
                      <div className="absolute flex items-baseline gap-0.5">
                        <span className="text-[29px] font-semibold leading-none tabular-nums text-brand-ink">{readinessScore}</span>
                        <span className="text-[10px] text-brand-muted">/100</span>
                      </div>
                    </div>
                    <p className="mt-2 text-center text-[11.5px] text-brand-muted">{t(`dashboard.growth.readiness.${readiness?.assessment || 'initial'}`)}</p>
                  </div>

                  {readiness?.dimensions?.length > 0 && (
                    <div className="space-y-3 pt-1">
                      {readiness.dimensions.map(dimension => (
                        <details key={dimension.key} className="group">
                          <summary className="flex cursor-pointer list-none items-center gap-3">
                            <span className="w-[76px] shrink-0 text-[12px] text-brand-ink">{t(`dashboard.growth.readiness.dimensions.${dimension.key}`)}</span>
                            <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-brand-inset">
                              <span className="block h-full rounded-full bg-brand-violet" style={{ width: `${dimension.score ?? 0}%` }} />
                            </span>
                            <span className="w-7 shrink-0 text-right text-[12px] font-semibold tabular-nums text-brand-ink">{dimension.score ?? '—'}</span>
                            {dimension.trend !== null && dimension.trend !== undefined && (
                              <span className={`w-7 shrink-0 text-right text-[11px] font-medium tabular-nums ${dimension.trend > 0 ? 'text-brand-success' : dimension.trend < 0 ? 'text-brand-danger' : 'text-brand-muted'}`}>{dimension.trend > 0 ? '+' : ''}{dimension.trend}</span>
                            )}
                          </summary>
                          <p className="mt-2 pl-[88px] text-[11.5px] leading-relaxed text-brand-muted">{dimension.evidence?.excerpt || t('dashboard.growth.readiness.insufficient')}</p>
                        </details>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-6 border-t border-brand-line pt-5">
                  <p className="text-[15px] font-semibold text-brand-ink">{t('dashboard.growth.readiness.pendingTitle')}</p>
                  <p className="mt-1.5 max-w-lg text-[12.5px] leading-relaxed text-brand-muted">{t('dashboard.growth.readiness.pendingBody')}</p>
                </div>
              )}
            </article>

            {/* 最近结果是全页唯一的顶部报告入口，避免与“查看报告依据”重复。 */}
            <article className="fl-dashboard-panel fl-dashboard-latest px-6 py-6 sm:px-8 sm:py-7 lg:col-span-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className={EYEBROW}>{t('dashboard.growth.latest.eyebrow')}</p>
                  <h2 className="mt-2 font-brand text-[19px] font-semibold text-brand-ink">{t('dashboard.growth.latest.title')}</h2>
                </div>
                {latestReviewCandidate && !isGenerating(latestReviewCandidate) && (
                  <span className="text-[11px] tabular-nums text-brand-muted">{new Date(sessionDate(latestReviewCandidate)).toLocaleDateString(localeTag, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                )}
              </div>

              {loading ? (
                <div className="flex min-h-52 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-muted" /></div>
              ) : loadError ? (
                <p className="mt-6 text-[13px] font-medium text-brand-danger">{t('dashboard.growth.loadFailed')}</p>
              ) : !latestReviewCandidate ? (
                <div className="mt-6 flex min-h-44 flex-col justify-between gap-5">
                  <div>
                    <h3 className="text-[15px] font-semibold text-brand-ink">{t('dashboard.growth.latest.emptyTitle')}</h3>
                    <p className="mt-2 text-[12.5px] leading-relaxed text-brand-muted">{t('dashboard.growth.latest.emptyBody')}</p>
                  </div>
                  <Link to="/setup" className="fl-dashboard-action inline-flex w-fit items-center gap-2 rounded-xl px-5 py-2.5 text-[12.5px] font-semibold">{t('dashboard.growth.startBaseline')}<ArrowRight className="h-3.5 w-3.5" /></Link>
                </div>
              ) : isGenerating(latestReviewCandidate) ? (
                <div className="mt-6 flex gap-3" role="status">
                  <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-brand-violet" />
                  <div><h3 className="text-[14px] font-semibold text-brand-ink">{t('dashboard.growth.latest.generatingTitle')}</h3><p className="mt-1 text-[12.5px] leading-relaxed text-brand-muted">{t('dashboard.growth.latest.generatingBody')}</p></div>
                </div>
              ) : hasReport(latestReviewCandidate) ? (
                <div className="mt-6 flex min-h-44 flex-col justify-between gap-5">
                  <div>
                    <div className="flex flex-wrap gap-x-2.5 gap-y-1 text-[11.5px] text-brand-muted"><span>{latestReviewCandidate.position}</span><span>·</span><span>{latestReviewCandidate.language}</span><span>·</span><span>{latestReviewCandidate.duration} {t('dashboard.durMin')}</span></div>
                    <p className="mt-4 text-[15px] font-medium leading-relaxed text-brand-ink"><InlineRichText text={reportSummary(latestReviewCandidate) || t('dashboard.growth.latest.reportReadyBody')} /></p>
                    {reportStrength(latestReviewCandidate) && <p className="mt-3 flex items-start gap-2 text-[12.5px] leading-relaxed text-brand-muted"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-success" /><span><InlineRichText text={reportStrength(latestReviewCandidate)} /></span></p>}
                  </div>
                  <Link to={`/interview/${latestReviewCandidate.id}/report`} className="fl-dashboard-action inline-flex w-fit items-center gap-2 rounded-xl px-5 py-2.5 text-[12.5px] font-semibold">{t('dashboard.growth.viewReport')}<ArrowRight className="h-3.5 w-3.5" /></Link>
                </div>
              ) : isResumable(latestReviewCandidate) ? (
                <div className="mt-6 flex min-h-44 flex-col justify-between gap-5"><div><h3 className="text-[14px] font-semibold text-brand-ink">{t('dashboard.growth.latest.unfinishedTitle')}</h3><p className="mt-2 text-[12.5px] leading-relaxed text-brand-muted">{t('dashboard.growth.latest.unfinishedBody', { position: latestReviewCandidate.position })}</p></div><Link to={`/interview/${latestReviewCandidate.id}`} className="fl-dashboard-action inline-flex w-fit items-center gap-2 rounded-xl px-5 py-2.5 text-[12.5px] font-semibold">{t('dashboard.growth.continuePractice')}<ArrowRight className="h-3.5 w-3.5" /></Link></div>
              ) : (
                <div className="mt-6 flex min-h-44 flex-col justify-between gap-5"><div><h3 className="text-[14px] font-semibold text-brand-ink">{t('dashboard.growth.latest.noReportTitle')}</h3><p className="mt-2 text-[12.5px] leading-relaxed text-brand-muted">{t('dashboard.growth.latest.noReportBody')}</p></div><Link to={`/interview/${latestReviewCandidate.id}/report`} className="inline-flex w-fit items-center gap-2 rounded-xl border border-brand-line bg-brand-card px-5 py-2.5 text-[12.5px] font-semibold text-brand-ink hover:border-brand-ink">{t('dashboard.growth.checkReportStatus')}<ArrowRight className="h-3.5 w-3.5" /></Link></div>
              )}
            </article>
          </div>

        </motion.section>

        {/* ───────── 下半区：只保留复习闪卡与面试记录；冲刺计划由顶部复盘学长统一管理 ───────── */}
        <div className="flex justify-center pt-2">
          <div className="fl-dashboard-section-nav inline-flex max-w-full gap-1 overflow-x-auto rounded-full p-1.5 scrollbar-hide" role="tablist" aria-label={t('dashboard.growth.title')}>
            {[
              { key: 'review', label: t('dashboard.growth.collections.title'), icon: Layers, count: growthOverview?.recentCollections?.length || 0 },
              { key: 'history', label: t('dashboard.growth.history.title'), icon: History, count: interviews.length },
            ].map(tab => {
              const active = section === tab.key
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSection(tab.key)}
                  className={`relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${active ? 'text-brand-ink' : 'text-brand-muted hover:text-brand-ink'}`}
                >
                  {active && <motion.span layoutId="dashboard-section-pill" className="fl-dashboard-tab-active absolute inset-0 rounded-full" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <Icon className="relative h-4 w-4" />
                  <span className="relative">{tab.label}</span>
                  {tab.count > 0 && <span className={`relative rounded-full px-1.5 text-[11px] tabular-nums ${active ? 'bg-white/15 dark:bg-black/15' : 'bg-brand-inset'}`}>{tab.count}</span>}
                </button>
              )
            })}
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={section}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-5"
          >
            {section === 'review' && (
              <ReviewFlashcards collections={growthOverview?.recentCollections || []} t={t} />
            )}

            {section === 'history' && (
              <>
        {/* ───────── 复盘历史 ───────── */}
                <section className="space-y-4" aria-labelledby="review-history-title">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                      <p className={EYEBROW}>{t('dashboard.growth.history.eyebrow')}</p>
                      <h2 id="review-history-title" className={`mt-2 ${H2}`}>{t('dashboard.growth.history.title')}</h2>
                      <p className="mt-1.5 text-[12.5px] text-brand-muted">{t('dashboard.growth.history.subtitle')}</p>
                    </div>
                    <div className="flex shrink-0 gap-1 rounded-xl border border-brand-line bg-brand-inset p-1" role="group" aria-label={t('dashboard.growth.history.filterLabel')}>
                      {['all', 'reports', 'continue'].map(option => (
                        <button
                          key={option} type="button" onClick={() => setFilter(option)} aria-pressed={filter === option}
                          className={`rounded-lg px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${filter === option ? 'bg-brand-card text-brand-ink shadow-sm' : 'text-brand-muted hover:text-brand-ink'}`}
                        >
                          {t(`dashboard.growth.history.filters.${option}`)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex min-h-44 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-brand-muted" /></div>
                  ) : filteredInterviews.length === 0 ? (
                    <div className={`${CARD} flex min-h-52 flex-col items-center justify-center gap-4 px-6 py-8 text-center`}>
                      <FileText className="h-8 w-8 text-brand-muted" />
                      <div>
                        <h3 className="text-[14px] font-semibold text-brand-ink">
                          {filter === 'all' ? t('dashboard.growth.history.emptyTitle') : t('dashboard.growth.history.noMatchTitle')}
                        </h3>
                        <p className="mt-1 text-[12.5px] text-brand-muted">
                          {filter === 'all' ? t('dashboard.growth.history.emptyBody') : t('dashboard.growth.history.noMatchBody')}
                        </p>
                      </div>
                      {filter === 'all' && (
                        <Link to="/setup" className="fl-dashboard-action inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[12.5px] font-semibold transition-opacity hover:opacity-90">
                          {t('dashboard.growth.startBaseline')} <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y divide-brand-line border-y border-brand-line">
                      {filteredInterviews.map((interview, index) => {
                        const action = getAction(interview, t)
                        const ActionIcon = action.icon
                        const date = new Date(sessionDate(interview))
                        const summary = reportSummary(interview)
                        const badgeTone = hasReport(interview)
                          ? 'border-brand-success/30 bg-brand-success/[0.08] text-brand-success'
                          : isGenerating(interview)
                            ? 'border-brand-violet/30 bg-brand-violet/[0.08] text-brand-violet'
                            : 'border-brand-line bg-brand-inset text-brand-muted'
                        return (
                          <motion.article
                            key={interview.id}
                            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(index * 0.04, 0.25) }}
                            role={action.route ? 'link' : undefined}
                            tabIndex={action.route ? 0 : undefined}
                            onClick={() => openInterview(interview)}
                            onKeyDown={event => { if (action.route && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openInterview(interview) } }}
                            className={`group relative grid gap-4 py-5 transition-colors sm:grid-cols-[150px_minmax(0,1fr)_auto] sm:items-center ${action.route ? 'cursor-pointer hover:bg-brand-inset/50' : ''}`}
                          >
                            <div className="space-y-2">
                              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10.5px] font-medium ${badgeTone}`}>
                                {isGenerating(interview) && <Loader2 className="h-3 w-3 animate-spin" />}
                                {statusLabel(interview, t)}
                              </span>
                              <p className="text-[11.5px] tabular-nums text-brand-muted">{date.toLocaleDateString(localeTag, { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                            </div>

                            <div className="min-w-0">
                              <h3 className="truncate text-[15px] font-semibold text-brand-ink">{interview.position || t('dashboard.growth.history.untitled')}</h3>
                              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-brand-muted">
                                <span>{interview.language}</span>
                                <span>{interview.mode === 'practice' ? t('dashboard.growth.history.practiceMode') : t('dashboard.growth.history.formalMode')}</span>
                                <span>{interview.duration} {t('dashboard.durMin')}</span>
                              </div>
                              <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-brand-muted">
                                <InlineRichText text={summary || (isResumable(interview)
                                  ? t('dashboard.growth.history.resumeHint')
                                  : isGenerating(interview)
                                    ? t('dashboard.growth.latest.generatingBody')
                                    : t('dashboard.growth.history.noSummary'))} />
                              </p>
                            </div>

                            <div className="flex items-center justify-between gap-3 sm:justify-end">
                              <span className={`inline-flex items-center gap-2 text-[12.5px] font-semibold ${action.route ? 'text-brand-ink' : 'text-brand-muted'}`}>
                                <ActionIcon className={`h-3.5 w-3.5 ${isGenerating(interview) ? 'animate-spin' : ''}`} />
                                {action.label}
                                {action.route && <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />}
                              </span>
                              <button
                                type="button"
                                onClick={event => { event.stopPropagation(); setPendingDelete({ id: interview.id, position: interview.position || '' }) }}
                                className="relative z-10 shrink-0 rounded-lg p-1.5 text-brand-muted transition-colors hover:bg-brand-danger/10 hover:text-brand-danger"
                                aria-label={t('dashboard.delete')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </motion.article>
                        )
                      })}
                    </div>
                  )}
                </section>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {pendingDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.button
              type="button" aria-label={t('dashboard.deleteModalCancel')}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeDeleteModal}
              className="absolute inset-0 bg-brand-ink/40 backdrop-blur-sm"
            />
            <motion.div
              role="dialog" aria-modal="true"
              initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className="brand-float relative w-full max-w-md rounded-[22px] p-6"
            >
              <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-brand-danger/10 text-brand-danger">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h2 className="font-brand text-[19px] font-semibold tracking-[-0.01em] text-brand-ink">{t('dashboard.deleteModalTitle')}</h2>
              <p className="mt-2 text-[13.5px] leading-relaxed text-brand-ink">{t('dashboard.deleteConfirm')}</p>
              {pendingDelete.position && <p className="mt-2 text-[13.5px] font-semibold text-brand-ink">“{pendingDelete.position}”</p>}
              {deleteModalError && (
                <p className="mt-4 rounded-xl border border-brand-danger/30 bg-brand-danger/[0.06] px-3.5 py-2.5 text-[12.5px] font-medium text-brand-danger">
                  {deleteModalError}
                </p>
              )}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button type="button" onClick={closeDeleteModal} className="rounded-xl border border-brand-line bg-brand-card py-3 text-[13.5px] font-semibold text-brand-ink transition-colors hover:border-brand-ink">
                  {t('dashboard.deleteModalCancel')}
                </button>
                <button type="button" onClick={() => void confirmDeleteInterview()} disabled={deletingId === pendingDelete.id} className="rounded-xl bg-brand-danger py-3 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
                  {deletingId === pendingDelete.id ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : t('dashboard.deleteModalConfirm')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
