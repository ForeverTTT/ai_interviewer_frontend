import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Bell, BellRing, BriefcaseBusiness, CalendarClock, Check, CheckCircle2,
  ChevronDown, Clock3, Crown, Edit3, Flag, Loader2, LockKeyhole,
  Mail, PlayCircle, RotateCcw, ShieldCheck, SkipForward, Sparkles, Target, Trash2, Trophy,
} from 'lucide-react'
import { getBackendBaseUrl } from '../lib/backendBase'
import { authenticatedFetch } from '../lib/authenticatedFetch'

const EMPTY_FORM = {
  targetPosition: '', targetJobDescription: '', nextInterviewDate: '', targetOfferDate: '',
  interviewerType: 'mixed', weeklyTargetDays: 5,
  reminderPreferences: { inApp: true, browser: false, email: false, weeklyReport: true },
}

function formFromPlan(plan) {
  if (!plan) return EMPTY_FORM
  return {
    targetPosition: plan.target_position || '',
    targetJobDescription: plan.target_job_description || '',
    nextInterviewDate: plan.next_interview_date || '',
    targetOfferDate: plan.target_offer_date || '',
    interviewerType: plan.interviewer_type || 'mixed',
    weeklyTargetDays: Number(plan.weekly_target_days) || 5,
    reminderPreferences: { ...EMPTY_FORM.reminderPreferences, ...(plan.reminder_preferences || {}) },
  }
}

function taskIcon(type) {
  if (type === 'formal_mock' || type === 'baseline') return BriefcaseBusiness
  if (type === 'focus_question' || type === 'self_intro') return Target
  if (type === 'review_collection' || type === 'weekly_review') return RotateCcw
  return CheckCircle2
}

/**
 * 任务小卡的配色：按任务类型取插画里的四种墙面色。
 * 全部写成完整类名，避免生产构建把拼接出来的类 purge 掉。
 */
const TASK_TONES = {
  harbor: { card: 'border-brand-harbor/20 bg-brand-harbor/[0.13]', icon: 'bg-brand-harbor/[0.14] text-brand-harbor', foot: 'bg-brand-harbor/[0.1]' },
  ochre: { card: 'border-brand-ochre/30 bg-brand-ochre/[0.18]', icon: 'bg-brand-ochre/[0.22] text-[#8A5F10] dark:text-brand-ochre', foot: 'bg-brand-ochre/[0.12]' },
  sage: { card: 'border-brand-sage/30 bg-brand-sage/[0.2]', icon: 'bg-brand-sage/[0.24] text-brand-success', foot: 'bg-brand-sage/[0.14]' },
  brick: { card: 'border-brand-brick/20 bg-brand-brick/[0.12]', icon: 'bg-brand-brick/[0.14] text-brand-brick', foot: 'bg-brand-brick/[0.09]' },
}

function taskTone(type) {
  if (type === 'formal_mock' || type === 'baseline') return 'harbor'
  if (type === 'focus_question' || type === 'self_intro') return 'ochre'
  if (type === 'review_collection' || type === 'weekly_review') return 'sage'
  return 'brick'
}

export default function OfferSprintPanel({ offerSprint, practiceStats, onOverview, onStartTask }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const plan = offerSprint?.plan || null
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(() => formFromPlan(plan))
  const [busy, setBusy] = useState(false)
  const [taskBusy, setTaskBusy] = useState(null)
  const [error, setError] = useState('')
  const [premiumOpen, setPremiumOpen] = useState(false)

  useEffect(() => { if (!editing) setDraft(formFromPlan(plan)) }, [editing, plan])

  const refreshOverview = async () => {
    const response = await authenticatedFetch(`${getBackendBaseUrl()}/api/growth-center/overview`)
    if (!response.ok) throw new Error('overview failed')
    const body = await response.json()
    onOverview?.(body)
  }

  const savePlan = async (nextDraft = draft) => {
    setBusy(true); setError('')
    try {
      const response = await authenticatedFetch(`${getBackendBaseUrl()}/api/growth-center/offer-plan`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...nextDraft,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin',
        }),
      })
      if (!response.ok) throw new Error('save failed')
      await refreshOverview()
      setEditing(false)
    } catch { setError(t('growthSprint.errors.save')) } finally { setBusy(false) }
  }

  const deletePlan = async () => {
    if (!window.confirm(t('growthSprint.form.removeConfirm'))) return
    setBusy(true); setError('')
    try {
      const response = await authenticatedFetch(`${getBackendBaseUrl()}/api/growth-center/offer-plan`, { method: 'DELETE' })
      if (!response.ok) throw new Error('delete failed')
      await refreshOverview()
      setEditing(false)
    } catch { setError(t('growthSprint.errors.delete')) } finally { setBusy(false) }
  }

  const setReminder = async (key, enabled) => {
    let nextEnabled = enabled
    if (key === 'browser' && enabled) {
      if (!('Notification' in window)) nextEnabled = false
      else {
        const permission = await window.Notification.requestPermission()
        nextEnabled = permission === 'granted'
      }
    }
    const next = { ...draft, reminderPreferences: { ...draft.reminderPreferences, [key]: nextEnabled } }
    setDraft(next)
  }

  const updateTask = async (task, status) => {
    setTaskBusy(task.id); setError('')
    try {
      const response = await authenticatedFetch(`${getBackendBaseUrl()}/api/growth-center/offer-plan/tasks/${task.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      })
      if (!response.ok) throw new Error('task update failed')
      await refreshOverview()
    } catch { setError(t('growthSprint.errors.task')) } finally { setTaskBusy(null) }
  }

  const startTask = async (task) => {
    setError('')
    if (['focus_question', 'review_collection'].includes(task.task_type)) {
      setTaskBusy(task.id)
      try {
        await onStartTask?.(task)
      } catch {
        setError(t('dashboard.growth.task.failed'))
      } finally {
        setTaskBusy(null)
      }
      return
    }
    if (task.task_type === 'weekly_review') navigate('/notes')
    else if (task.task_type === 'pre_interview_checklist') await updateTask(task, 'completed')
    else navigate('/setup', {
      state: {
        offerSprintDefaults: {
          position: plan.target_position,
          jobDescription: plan.target_job_description,
          interviewerType: plan.interviewer_type,
          duration: task.estimated_minutes,
          mode: task.task_type === 'self_intro' ? 'practice' : 'formal',
        },
      },
    })
  }

  const dismissReminder = async (reminder) => {
    try {
      await authenticatedFetch(`${getBackendBaseUrl()}/api/growth-center/offer-plan/reminders/${reminder.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'dismissed' }),
      })
      await refreshOverview()
    } catch { setError(t('growthSprint.errors.reminder')) }
  }

  useEffect(() => {
    if (!plan || !('Notification' in window) || window.Notification.permission !== 'granted') return
    ;(offerSprint?.reminders || []).filter(item => item.channel === 'browser').forEach(reminder => {
      const storageKey = `growth-reminder-shown:${reminder.id}`
      if (window.localStorage.getItem(storageKey)) return
      window.localStorage.setItem(storageKey, '1')
      const notification = new window.Notification(t(`growthSprint.reminders.${reminder.reminder_type}.title`), {
        body: t(`growthSprint.reminders.${reminder.reminder_type}.body`, { position: plan.target_position }),
        icon: '/landit-icon-light.svg',
      })
      notification.onclick = () => { window.focus(); notification.close() }
    })
  }, [offerSprint?.reminders, plan, t])

  const inAppReminders = useMemo(() => (offerSprint?.reminders || []).filter(item => item.channel === 'in_app'), [offerSprint?.reminders])
  const report = offerSprint?.weeklyReport
  const tasks = offerSprint?.tasks || []
  const todayTask = offerSprint?.todayTask || tasks.find(task => task.status === 'pending') || null
  const sprint = offerSprint?.sprint || { stage: 'foundation', interviewDays: null, offerDays: null }
  const progress = offerSprint?.progress || {
    completed: 0,
    total: tasks.length,
    percent: 0,
    effectiveDays: 0,
    weeklyTargetDays: plan?.weekly_target_days || 5,
  }

  if (!offerSprint) return null

  /* 与 Dashboard 共用同一套外壳与眉标写法 */
  const CARD = 'brand-float rounded-[22px]'
  const EYEBROW = 'text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-muted'
  const H2 = 'font-brand text-[17px] font-semibold tracking-[-0.01em] text-brand-ink'
  const BTN_INK = 'inline-flex items-center justify-center gap-2 rounded-full bg-brand-ink px-5 py-2.5 text-[12.5px] font-semibold text-brand-on-ink transition-all hover:-translate-y-px disabled:opacity-40'
  const BTN_LINE = 'inline-flex items-center justify-center gap-2 rounded-full border border-brand-line bg-brand-card px-4 py-2.5 text-[12.5px] font-semibold text-brand-ink transition-colors hover:border-brand-ink/40 disabled:opacity-40'
  const FIELD = 'w-full rounded-xl border border-brand-line bg-brand-inset px-4 py-2.5 text-[13.5px] text-brand-ink transition-colors placeholder:text-brand-muted/70 focus:border-brand-ink focus:outline-none focus:ring-4 focus:ring-brand-ink/10'
  const LABEL = 'block text-[12.5px] font-semibold text-brand-ink'

  /* ───────── 还没有冲刺计划 ───────── */
  if (!plan && !editing) {
    return (
      <section className={`${CARD} px-6 py-6`}>
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center">
          <div className="min-w-0">
            <p className={`flex items-center gap-2 ${EYEBROW}`}><Flag className="h-3.5 w-3.5" />{t('growthSprint.eyebrow')}</p>
            <h2 className="mt-3 font-brand text-[22px] font-semibold leading-tight tracking-[-0.02em] text-brand-ink sm:text-[26px]">
              {t('growthSprint.empty.title')}
            </h2>
            <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-brand-ink">{t('growthSprint.empty.body')}</p>
            <button type="button" onClick={() => { setDraft(EMPTY_FORM); setEditing(true) }} className={`${BTN_INK} mt-5`}>
              <Sparkles className="h-4 w-4" />{t('growthSprint.empty.create')}
            </button>
          </div>
          <ol className="divide-y divide-brand-line rounded-xl border border-brand-line bg-brand-inset">
            {['position', 'interview', 'rhythm'].map((step, index) => (
              <li key={step} className="flex items-center gap-3.5 px-4 py-3.5">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-brand-line bg-brand-card text-[11.5px] font-semibold tabular-nums text-brand-ink">{index + 1}</span>
                <span className="text-[13px] text-brand-ink">{t(`growthSprint.empty.steps.${step}`)}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    )
  }

  /* ───────── 编辑计划表单 ───────── */
  if (editing) {
    return (
      <section className={`${CARD} px-6 py-6`}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className={EYEBROW}>{t('growthSprint.eyebrow')}</p>
            <h2 className={`mt-2 ${H2}`}>{t(plan ? 'growthSprint.form.editTitle' : 'growthSprint.form.createTitle')}</h2>
          </div>
          <button type="button" onClick={() => setEditing(false)} className={`${BTN_LINE} shrink-0 py-2`}>{t('growthSprint.form.cancel')}</button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={LABEL}>{t('growthSprint.form.position')}</span>
            <input value={draft.targetPosition} onChange={event => setDraft(current => ({ ...current, targetPosition: event.target.value }))} className={FIELD} placeholder={t('growthSprint.form.positionPlaceholder')} />
          </label>
          <label className="space-y-2">
            <span className={LABEL}>{t('growthSprint.form.interviewer')}</span>
            <select value={draft.interviewerType} onChange={event => setDraft(current => ({ ...current, interviewerType: event.target.value }))} className={FIELD}>
              <option value="mixed">{t('notes.interviewer.mixed')}</option>
              <option value="technical">{t('notes.interviewer.technical')}</option>
              <option value="hr">{t('notes.interviewer.hr')}</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className={LABEL}>{t('growthSprint.form.nextInterview')}</span>
            <input type="date" value={draft.nextInterviewDate} onChange={event => setDraft(current => ({ ...current, nextInterviewDate: event.target.value }))} className={FIELD} />
          </label>
          <label className="space-y-2">
            <span className={LABEL}>{t('growthSprint.form.offerDate')}</span>
            <input type="date" value={draft.targetOfferDate} onChange={event => setDraft(current => ({ ...current, targetOfferDate: event.target.value }))} className={FIELD} />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className={LABEL}>{t('growthSprint.form.jd')}</span>
            <textarea rows={4} value={draft.targetJobDescription} onChange={event => setDraft(current => ({ ...current, targetJobDescription: event.target.value }))} className={`${FIELD} resize-none leading-relaxed`} placeholder={t('growthSprint.form.jdPlaceholder')} />
          </label>
        </div>

        <div className="mt-5">
          <p className={LABEL}>{t('growthSprint.form.weeklyTarget')}</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {[3, 5, 7].map(days => (
              <button
                key={days} type="button" aria-pressed={draft.weeklyTargetDays === days}
                onClick={() => setDraft(current => ({ ...current, weeklyTargetDays: days }))}
                className={`rounded-lg border px-4 py-2 text-[12.5px] transition-colors ${draft.weeklyTargetDays === days ? 'border-brand-ink bg-brand-card font-semibold text-brand-ink ring-1 ring-brand-ink' : 'border-brand-line bg-brand-card text-brand-muted hover:border-brand-muted/50'}`}
              >
                {t('growthSprint.form.days', { count: days })}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-2.5 md:grid-cols-2">
          {[
            ['inApp', Bell, false], ['browser', BellRing, false],
            ['email', Mail, !offerSprint.reminderCapabilities?.emailConfigured], ['weeklyReport', CalendarClock, false],
          ].map(([key, Icon, disabled]) => (
            <label key={key} className={`flex items-center justify-between gap-4 rounded-xl border border-brand-line bg-brand-inset px-4 py-3 ${disabled ? 'opacity-50' : ''}`}>
              <span className="flex min-w-0 items-center gap-2.5 text-[13px] text-brand-ink">
                <Icon className="h-4 w-4 shrink-0 text-brand-muted" />
                {t(`growthSprint.form.reminders.${key}`)}
                {disabled && <span className="text-[11px] text-brand-muted">{t('growthSprint.form.notConfigured')}</span>}
              </span>
              <input type="checkbox" disabled={disabled || busy} checked={Boolean(draft.reminderPreferences[key])} onChange={event => void setReminder(key, event.target.checked)} className="h-4 w-4 shrink-0 accent-[rgb(var(--brand-ink))]" />
            </label>
          ))}
        </div>

        {error && <p className="mt-4 rounded-xl border border-brand-danger/30 bg-brand-danger/[0.06] px-4 py-3 text-[12.5px] font-medium text-brand-danger">{error}</p>}

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" disabled={busy || !draft.targetPosition.trim()} onClick={() => void savePlan()} className={BTN_INK}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{t('growthSprint.form.save')}
          </button>
          {plan && (
            <button type="button" disabled={busy} onClick={() => void deletePlan()} className="inline-flex items-center gap-2 rounded-xl border border-brand-danger/40 px-4 py-2.5 text-[12.5px] font-semibold text-brand-danger transition-colors hover:bg-brand-danger/10 disabled:opacity-40">
              <Trash2 className="h-4 w-4" />{t('growthSprint.form.remove')}
            </button>
          )}
        </div>
      </section>
    )
  }

  /* ───────── 冲刺计划主视图 ───────── */
  const ringR = 26
  const ringC = 2 * Math.PI * ringR
  return (
    <section className="space-y-4" aria-labelledby="offer-sprint-title">

      {inAppReminders.map(reminder => (
        <div key={reminder.id} className={`${CARD} flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between`}>
          <div className="flex min-w-0 gap-3">
            <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-brand-ochre" />
            <div className="min-w-0">
              <p className="text-[13.5px] font-semibold text-brand-ink">{t(`growthSprint.reminders.${reminder.reminder_type}.title`)}</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-brand-ink">{t(`growthSprint.reminders.${reminder.reminder_type}.body`, { position: plan.target_position })}</p>
            </div>
          </div>
          <button type="button" onClick={() => void dismissReminder(reminder)} className={`${BTN_LINE} shrink-0 py-2`}>{t('growthSprint.reminders.dismiss')}</button>
        </div>
      ))}

      {offerSprint.recoveryNudge && (
        <div className={`${CARD} flex items-start gap-3 px-5 py-4`}>
          <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-brand-harbor" />
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold text-brand-ink">{t(`growthSprint.recovery.${offerSprint.recoveryNudge.type}.title`)}</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-brand-ink">{t(`growthSprint.recovery.${offerSprint.recoveryNudge.type}.body`, { count: offerSprint.recoveryNudge.remainingDays })}</p>
          </div>
        </div>
      )}

      {/* 计划头：目标岗位 + 阶段 + 倒计时 + 本周进度环，压成一条 */}
      <div className={`${CARD} flex flex-col gap-5 px-6 py-5 lg:flex-row lg:items-center`}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={`flex items-center gap-2 ${EYEBROW}`}><Flag className="h-3.5 w-3.5" />{t('growthSprint.eyebrow')}</p>
            <button type="button" onClick={() => setEditing(true)} className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-full border border-brand-line bg-brand-card text-brand-muted transition-colors hover:border-brand-ink/40 hover:text-brand-ink lg:hidden" aria-label={t('growthSprint.form.editTitle')}>
              <Edit3 className="h-3.5 w-3.5" />
            </button>
          </div>
          <h2 id="offer-sprint-title" className="lk-display mt-2 truncate text-[24px] leading-tight sm:text-[28px]">
            {plan.target_position}
          </h2>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-brand-muted">{t(`growthSprint.stage.${sprint.stage}`)}</p>
          <p className="mt-1 text-[12px] text-brand-muted">
            {t('growthSprint.summary.practice', { count: practiceStats?.count || 0, duration: practiceStats?.duration || '0' })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {sprint.interviewDays !== null && (
            <div className="rounded-2xl bg-brand-harbor/[0.12] px-4 py-2.5">
              <p className="text-[10.5px] font-medium uppercase tracking-wider text-brand-muted">{t('growthSprint.countdown.interview')}</p>
              <p className="mt-0.5 font-display text-[18px] font-semibold tabular-nums text-brand-ink">
                {sprint.interviewDays >= 0 ? t('growthSprint.countdown.days', { count: sprint.interviewDays }) : t('growthSprint.countdown.update')}
              </p>
            </div>
          )}
          {sprint.offerDays !== null && (
            <div className="rounded-2xl bg-brand-ochre/[0.18] px-4 py-2.5">
              <p className="text-[10.5px] font-medium uppercase tracking-wider text-brand-muted">{t('growthSprint.countdown.offer')}</p>
              <p className="mt-0.5 font-display text-[18px] font-semibold tabular-nums text-brand-ink">
                {sprint.offerDays >= 0 ? t('growthSprint.countdown.days', { count: sprint.offerDays }) : t('growthSprint.countdown.update')}
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 rounded-2xl bg-brand-inset px-4 py-2">
            <div className="relative grid h-[60px] w-[60px] place-items-center">
              <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
                <circle cx="32" cy="32" r={ringR} fill="none" stroke="rgb(var(--brand-line))" strokeWidth="6" />
                <circle cx="32" cy="32" r={ringR} fill="none" stroke="rgb(var(--brand-lime))" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={`${(ringC * (progress.percent || 0)) / 100} ${ringC}`} className="transition-all duration-700" />
              </svg>
              <span className="absolute text-[12px] font-semibold tabular-nums text-brand-ink">{progress.percent}%</span>
            </div>
            <div>
              <p className="text-[11px] text-brand-muted">{t('growthSprint.progress.title')}</p>
              <p className="font-display text-[20px] font-semibold leading-tight tabular-nums text-brand-ink">{progress.completed} / {progress.total}</p>
              <p className="text-[11px] text-brand-muted">{t('growthSprint.progress.days', { current: progress.effectiveDays, target: progress.weeklyTargetDays })}</p>
            </div>
          </div>

          <button type="button" onClick={() => setEditing(true)} className="hidden h-9 w-9 shrink-0 place-items-center rounded-full border border-brand-line bg-brand-card text-brand-muted transition-colors hover:border-brand-ink/40 hover:text-brand-ink lg:grid" aria-label={t('growthSprint.form.editTitle')} title={t('growthSprint.form.editTitle')}>
            <Edit3 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 本周任务：小卡片墙，按任务类型着色 */}
      <div>
        <div className="mb-3 flex items-end justify-between gap-4 px-1">
          <div className="min-w-0">
            <p className={EYEBROW}>{t('growthSprint.tasks.eyebrow')}</p>
            <h3 className={`mt-1.5 ${H2}`}>{t('growthSprint.tasks.title')}</h3>
          </div>
          <span className="shrink-0 text-[11.5px] text-brand-muted">{t('growthSprint.tasks.limit')}</span>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {tasks.map((task, index) => {
            const Icon = taskIcon(task.task_type)
            const completed = task.status === 'completed'
            const skipped = task.status === 'skipped'
            const isToday = task.id === todayTask?.id
            const tone = TASK_TONES[taskTone(task.task_type)]
            const reviewCards = Array.isArray(task.context?.reviewCards) ? task.context.reviewCards : []
            return (
              <article
                key={task.id}
                className={`group flex flex-col overflow-hidden rounded-[22px] border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift ${tone.card} ${isToday ? 'ring-2 ring-brand-ink/80 ring-offset-2 ring-offset-brand-paper' : ''} ${completed || skipped ? 'opacity-70' : ''}`}
              >
                {/* 卡头：序号方块 + 标题 + 时长 */}
                <div className="flex items-start gap-3 px-4 pt-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-card font-display text-[15px] font-semibold tabular-nums text-brand-ink shadow-sm">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <h4 className={`line-clamp-2 text-[14px] font-semibold leading-snug ${completed ? 'text-brand-muted line-through' : 'text-brand-ink'}`}>
                      {t(`growthSprint.tasks.types.${task.task_type}.title`)}
                    </h4>
                    <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-brand-muted">
                      <Clock3 className="h-3 w-3" />{t('growthSprint.tasks.minutes', { count: task.estimated_minutes })}
                    </p>
                  </div>
                </div>

                {/* 内层白卡：原因 + 解锁 + 复习题 */}
                <div className="mx-3 mt-3 flex-1 rounded-[16px] bg-brand-card/90 px-3.5 py-3">
                  <div className="flex items-start gap-2.5">
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${tone.icon}`}>
                      {completed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                    </span>
                    <p className="line-clamp-3 text-[12px] leading-relaxed text-brand-ink">
                      {task.context?.reason || t(`growthSprint.tasks.types.${task.task_type}.reason`, { position: plan.target_position, dimension: task.dimension ? t(`report.readiness.dimensions.${task.dimension}`) : '' })}
                    </p>
                  </div>
                  {reviewCards.length > 0 && (
                    <div className="mt-2.5 border-t border-brand-line pt-2">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-brand-muted">{t('growthSprint.tasks.checklistReview')}</p>
                      <ul className="mt-1 space-y-0.5">
                        {reviewCards.map(card => (
                          <li key={card.id} className="line-clamp-1 text-[11.5px] text-brand-ink">{card.isPinned ? '★ ' : '• '}{card.questionText}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="mt-2 flex items-center gap-1 text-[11px] text-brand-muted">
                    <Trophy className="h-3 w-3 shrink-0" /><span className="line-clamp-1">{t(`growthSprint.tasks.types.${task.task_type}.unlock`)}</span>
                  </p>
                </div>

                {/* 卡脚：状态 + 操作 */}
                <div className={`mt-3 flex items-center gap-1.5 px-3 py-2.5 ${tone.foot}`}>
                  {isToday && !completed && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-ink px-2.5 py-1 text-[10.5px] font-semibold text-brand-on-ink">{t('growthSprint.tasks.today')}</span>
                  )}
                  {completed && (
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-card text-brand-success shadow-sm" title={t('growthSprint.tasks.complete')}><CheckCircle2 className="h-4 w-4" /><span className="sr-only">{t('growthSprint.tasks.complete')}</span></span>
                  )}
                  {skipped && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-card px-2.5 py-1 text-[10.5px] font-semibold text-brand-muted"><SkipForward className="h-3 w-3" />{t('growthSprint.tasks.skip')}</span>
                  )}

                  {!completed && (
                    <div className="ml-auto flex items-center gap-1.5">
                      <button type="button" disabled={taskBusy === task.id} onClick={() => void startTask(task)} className="inline-flex items-center gap-1.5 rounded-full bg-brand-ink px-3.5 py-1.5 text-[11.5px] font-semibold text-brand-on-ink transition-all hover:-translate-y-px disabled:opacity-40">
                        {taskBusy === task.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : task.task_type === 'pre_interview_checklist' ? <Check className="h-3.5 w-3.5" /> : <PlayCircle className="h-3.5 w-3.5" />}
                        {t(task.task_type === 'pre_interview_checklist' ? 'growthSprint.tasks.completeChecklist' : 'growthSprint.tasks.start')}
                      </button>
                      {task.task_type !== 'pre_interview_checklist' && (
                        <button type="button" aria-label={t('growthSprint.tasks.complete')} title={t('growthSprint.tasks.complete')} disabled={taskBusy === task.id} onClick={() => void updateTask(task, 'completed')} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-card text-brand-ink shadow-sm transition-colors hover:text-brand-success disabled:opacity-40">
                          {taskBusy === task.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      <button type="button" aria-label={t('growthSprint.tasks.skip')} title={t('growthSprint.tasks.skip')} disabled={taskBusy === task.id} onClick={() => void updateTask(task, 'skipped')} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-card text-brand-muted shadow-sm transition-colors hover:text-brand-ink disabled:opacity-40">
                        <SkipForward className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </div>

      {/* 周报 / 里程碑 / 会员预告：次要信息，默认折叠成三张小卡 */}
      <div className="grid gap-3.5 lg:grid-cols-3">
        <details className={`${CARD} group px-5 py-4`}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
            <div className="min-w-0">
              <p className={EYEBROW}>{t('growthSprint.weekly.eyebrow')}</p>
              <h3 className="mt-1 text-[14.5px] font-semibold text-brand-ink">{t('growthSprint.weekly.title')}</h3>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-brand-muted transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              [report?.effectiveDays || 0, t('growthSprint.weekly.days')],
              [report?.effectiveMinutes || 0, t('growthSprint.weekly.minutes')],
              [report?.completedTasks || 0, t('growthSprint.weekly.completed')],
            ].map(([value, label]) => (
              <div key={label} className="rounded-xl bg-brand-inset px-2 py-3 text-center">
                <p className="font-display text-[20px] font-semibold tabular-nums text-brand-ink">{value}</p>
                <p className="mt-0.5 text-[10.5px] text-brand-muted">{label}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1.5">
            {report?.changes?.length ? report.changes.map(change => {
              const toneCls = change.trend > 0
                ? 'border-brand-success/30 bg-brand-success/[0.06] text-brand-success'
                : change.trend < 0
                  ? 'border-brand-danger/30 bg-brand-danger/[0.06] text-brand-danger'
                  : 'border-brand-line bg-brand-inset text-brand-ink'
              return (
                <p key={change.key} className={`rounded-xl border px-3 py-2 text-[12px] font-medium ${toneCls}`}>
                  {t(`report.readiness.dimensions.${change.key}`)} {change.trend === 0 ? t('growthSprint.weekly.stable') : `${change.trend > 0 ? '+' : ''}${change.trend}`}
                </p>
              )
            }) : (
              <p className="text-[12px] leading-relaxed text-brand-muted">{t(report?.hasTraining ? 'growthSprint.weekly.noTrend' : 'growthSprint.weekly.return')}</p>
            )}
          </div>
        </details>

        <details className={`${CARD} group px-5 py-4`}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-ochre/20 text-[#8A5F10] dark:text-brand-ochre">
                <Trophy className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className={EYEBROW}>{t('growthSprint.milestones.eyebrow')}</p>
                <h3 className="mt-1 text-[14.5px] font-semibold text-brand-ink">{t('growthSprint.milestones.title')}</h3>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-brand-muted transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-4 space-y-2">
            {offerSprint.milestones?.length ? offerSprint.milestones.slice(0, 3).map(item => (
              <div key={item.id} className="flex items-center gap-3 rounded-xl bg-brand-inset px-3.5 py-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-success" />
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold text-brand-ink">{t(`growthSprint.milestones.types.${item.milestone_type}`)}</p>
                  <p className="mt-0.5 text-[11px] tabular-nums text-brand-muted">{new Date(item.earned_at).toLocaleDateString(i18n.language)}</p>
                </div>
              </div>
            )) : (
              <p className="text-[12px] leading-relaxed text-brand-muted">{t('growthSprint.milestones.empty')}</p>
            )}
          </div>
        </details>

        {offerSprint.premiumPreview?.visible && (
          <details className={`${CARD} group px-5 py-4`} open={premiumOpen} onToggle={event => setPremiumOpen(event.currentTarget.open)}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-harbor/[0.12] text-brand-harbor">
                  <Crown className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className={EYEBROW}>{t('growthSprint.premium.eyebrow')}</p>
                  <h3 className="mt-1 text-[14.5px] font-semibold text-brand-ink">{t('growthSprint.premium.title')}</h3>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-brand-muted transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-3 text-[12px] leading-relaxed text-brand-muted">{t('growthSprint.premium.body')}</p>
            <div className="mt-3 grid gap-2">
              {['drills', 'jdPlan', 'deepReport'].map(feature => (
                <div key={feature} className="rounded-xl bg-brand-inset px-3.5 py-3">
                  <p className="flex items-center gap-2 text-[12.5px] font-semibold text-brand-ink"><LockKeyhole className="h-3.5 w-3.5 text-brand-muted" />{t(`growthSprint.premium.features.${feature}.title`)}</p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-brand-muted">{t(`growthSprint.premium.features.${feature}.body`)}</p>
                </div>
              ))}
              <div className="flex items-start gap-2 rounded-xl bg-brand-inset px-3.5 py-3 text-[11.5px] leading-relaxed text-brand-ink">
                <ShieldCheck className="h-4 w-4 shrink-0 text-brand-success" />{t('growthSprint.premium.ownership')}
              </div>
            </div>
          </details>
        )}
      </div>

      {error && <p className="rounded-xl border border-brand-danger/30 bg-brand-danger/[0.06] px-4 py-3 text-[12.5px] font-medium text-brand-danger">{error}</p>}
    </section>
  )
}
