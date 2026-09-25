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

export default function OfferSprintPanel({ offerSprint, onOverview, onStartTask }) {
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
    if (['focus_question', 'review_collection'].includes(task.task_type)) {
      setTaskBusy(task.id)
      try { await onStartTask?.(task) } finally { setTaskBusy(null) }
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

  if (!offerSprint) return null

  /* 与 Dashboard 共用同一套外壳与眉标写法 */
  const CARD = 'brand-float rounded-[22px]'
  const EYEBROW = 'text-[11px] font-medium uppercase tracking-[0.16em] text-brand-muted'
  const H2 = 'font-brand text-[17px] font-semibold tracking-[-0.01em] text-brand-ink'
  const BTN_INK = 'inline-flex items-center justify-center gap-2 rounded-xl bg-brand-ink px-5 py-2.5 text-[12.5px] font-semibold text-brand-on-ink transition-opacity hover:opacity-90 disabled:opacity-40'
  const BTN_LINE = 'inline-flex items-center justify-center gap-2 rounded-xl border border-brand-line bg-brand-card px-4 py-2.5 text-[12.5px] font-semibold text-brand-ink transition-colors hover:border-brand-ink disabled:opacity-40'
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
  return (
    <section className="space-y-5" aria-labelledby="offer-sprint-title">

      {inAppReminders.map(reminder => (
        <div key={reminder.id} className={`${CARD} flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between`}>
          <div className="flex min-w-0 gap-3">
            <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-brand-violet" />
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
          <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-brand-violet" />
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold text-brand-ink">{t(`growthSprint.recovery.${offerSprint.recoveryNudge.type}.title`)}</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-brand-ink">{t(`growthSprint.recovery.${offerSprint.recoveryNudge.type}.body`, { count: offerSprint.recoveryNudge.remainingDays })}</p>
          </div>
        </div>
      )}

      <div className={`${CARD} overflow-hidden`}>
        {/* 计划头：岗位 + 阶段 + 两个倒计时 + 本周进度 */}
        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-4">
              <p className={`flex items-center gap-2 ${EYEBROW}`}><Flag className="h-3.5 w-3.5" />{t('growthSprint.eyebrow')}</p>
              <button type="button" onClick={() => setEditing(true)} className="shrink-0 rounded-lg border border-brand-line bg-brand-card p-2 text-brand-muted transition-colors hover:border-brand-ink hover:text-brand-ink" aria-label={t('growthSprint.form.editTitle')}>
                <Edit3 className="h-3.5 w-3.5" />
              </button>
            </div>
            <h2 id="offer-sprint-title" className="mt-3 font-brand text-[22px] font-semibold leading-tight tracking-[-0.02em] text-brand-ink sm:text-[26px]">
              {plan.target_position}
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-brand-muted">{t(`growthSprint.stage.${offerSprint.sprint.stage}`)}</p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              {offerSprint.sprint.interviewDays !== null && (
                <div className="rounded-xl border border-brand-line bg-brand-inset px-4 py-2.5">
                  <p className="text-[10.5px] font-medium uppercase tracking-wider text-brand-muted">{t('growthSprint.countdown.interview')}</p>
                  <p className="mt-1 text-[17px] font-semibold tabular-nums text-brand-ink">
                    {offerSprint.sprint.interviewDays >= 0 ? t('growthSprint.countdown.days', { count: offerSprint.sprint.interviewDays }) : t('growthSprint.countdown.update')}
                  </p>
                </div>
              )}
              {offerSprint.sprint.offerDays !== null && (
                <div className="rounded-xl border border-brand-line bg-brand-inset px-4 py-2.5">
                  <p className="text-[10.5px] font-medium uppercase tracking-wider text-brand-muted">{t('growthSprint.countdown.offer')}</p>
                  <p className="mt-1 text-[17px] font-semibold tabular-nums text-brand-ink">
                    {offerSprint.sprint.offerDays >= 0 ? t('growthSprint.countdown.days', { count: offerSprint.sprint.offerDays }) : t('growthSprint.countdown.update')}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-brand-line bg-brand-inset px-5 py-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className={EYEBROW}>{t('growthSprint.progress.title')}</p>
                <p className="mt-2 text-[24px] font-semibold leading-none tabular-nums text-brand-ink">
                  {offerSprint.progress.completed} / {offerSprint.progress.total}
                </p>
              </div>
              <span className="text-[13px] font-semibold tabular-nums text-brand-ink">{offerSprint.progress.percent}%</span>
            </div>
            <div className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-brand-card">
              <div className="h-full rounded-full bg-brand-violet transition-all duration-500" style={{ width: `${offerSprint.progress.percent}%` }} />
            </div>
            <p className="mt-3.5 text-[12px] leading-relaxed text-brand-muted">
              {t('growthSprint.progress.days', { current: offerSprint.progress.effectiveDays, target: offerSprint.progress.weeklyTargetDays })}
            </p>
          </div>
        </div>

        {/* 本周任务 */}
        <div className="border-t border-brand-line bg-brand-inset px-6 py-6">
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className={EYEBROW}>{t('growthSprint.tasks.eyebrow')}</p>
              <h3 className={`mt-2 ${H2}`}>{t('growthSprint.tasks.title')}</h3>
            </div>
            <span className="shrink-0 text-[11.5px] text-brand-muted">{t('growthSprint.tasks.limit')}</span>
          </div>

          <div className="mt-4 grid gap-2.5">
            {offerSprint.tasks.map(task => {
              const Icon = taskIcon(task.task_type)
              const completed = task.status === 'completed'
              const isToday = task.id === offerSprint.todayTask?.id
              const reviewCards = Array.isArray(task.context?.reviewCards) ? task.context.reviewCards : []
              return (
                <article key={task.id} className={`rounded-xl border bg-brand-card px-5 py-4 transition-colors ${isToday ? 'border-brand-ink ring-1 ring-brand-ink' : 'border-brand-line'}`}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-3.5">
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${completed ? 'border-brand-success/30 bg-brand-success/[0.10] text-brand-success' : 'border-brand-line bg-brand-inset text-brand-muted'}`}>
                        {completed ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className={`text-[14px] font-semibold ${completed ? 'text-brand-muted line-through' : 'text-brand-ink'}`}>
                            {t(`growthSprint.tasks.types.${task.task_type}.title`)}
                          </h4>
                          {isToday && (
                            <span className="rounded-full bg-brand-ink px-2 py-0.5 text-[10px] font-medium text-brand-on-ink">{t('growthSprint.tasks.today')}</span>
                          )}
                        </div>
                        <p className="mt-1.5 text-[12.5px] leading-relaxed text-brand-ink">
                          {task.context?.reason || t(`growthSprint.tasks.types.${task.task_type}.reason`, { position: plan.target_position, dimension: task.dimension ? t(`report.readiness.dimensions.${task.dimension}`) : '' })}
                        </p>
                        {reviewCards.length > 0 && (
                          <div className="mt-2.5 rounded-lg border border-brand-line bg-brand-inset px-3.5 py-2.5">
                            <p className="text-[10.5px] font-medium uppercase tracking-wider text-brand-muted">{t('growthSprint.tasks.checklistReview')}</p>
                            <ul className="mt-1.5 space-y-1">
                              {reviewCards.map(card => (
                                <li key={card.id} className="line-clamp-1 text-[12px] text-brand-ink">{card.isPinned ? '★ ' : '• '}{card.questionText}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-brand-muted">
                          <span><Clock3 className="mr-1 inline h-3 w-3" />{t('growthSprint.tasks.minutes', { count: task.estimated_minutes })}</span>
                          <span><Trophy className="mr-1 inline h-3 w-3" />{t(`growthSprint.tasks.types.${task.task_type}.unlock`)}</span>
                        </div>
                      </div>
                    </div>

                    {!completed && (
                      <div className="flex shrink-0 gap-2">
                        <button type="button" disabled={taskBusy === task.id} onClick={() => void startTask(task)} className={`${BTN_INK} px-4 py-2`}>
                          {taskBusy === task.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : task.task_type === 'pre_interview_checklist' ? <Check className="h-3.5 w-3.5" /> : <PlayCircle className="h-3.5 w-3.5" />}
                          {t(task.task_type === 'pre_interview_checklist' ? 'growthSprint.tasks.completeChecklist' : 'growthSprint.tasks.start')}
                        </button>
                        {task.task_type !== 'pre_interview_checklist' && (
                          <button type="button" aria-label={t('growthSprint.tasks.complete')} disabled={taskBusy === task.id} onClick={() => void updateTask(task, 'completed')} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-brand-line bg-brand-card text-brand-ink transition-colors hover:border-brand-ink disabled:opacity-40">
                            {taskBusy === task.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          </button>
                        )}
                        <button type="button" aria-label={t('growthSprint.tasks.skip')} disabled={taskBusy === task.id} onClick={() => void updateTask(task, 'skipped')} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-brand-line bg-brand-card text-brand-muted transition-colors hover:border-brand-ink hover:text-brand-ink disabled:opacity-40">
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
      </div>

      {/* 周报 + 里程碑 */}
      <div className="grid gap-5 lg:grid-cols-2">
        <details className={`${CARD} group px-6 py-5`}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
            <div className="min-w-0">
              <p className={EYEBROW}>{t('growthSprint.weekly.eyebrow')}</p>
              <h3 className={`mt-2 ${H2}`}>{t('growthSprint.weekly.title')}</h3>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-brand-muted transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-5 grid grid-cols-3 gap-2.5">
            {[
              [report?.effectiveDays || 0, t('growthSprint.weekly.days')],
              [report?.effectiveMinutes || 0, t('growthSprint.weekly.minutes')],
              [report?.completedTasks || 0, t('growthSprint.weekly.completed')],
            ].map(([value, label]) => (
              <div key={label} className="rounded-xl border border-brand-line bg-brand-inset px-3 py-3.5 text-center">
                <p className="text-[20px] font-semibold tabular-nums text-brand-ink">{value}</p>
                <p className="mt-1 text-[11px] text-brand-muted">{label}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {report?.changes?.length ? report.changes.map(change => {
              const tone = change.trend > 0
                ? 'border-brand-success/30 bg-brand-success/[0.06] text-brand-success'
                : change.trend < 0
                  ? 'border-brand-danger/30 bg-brand-danger/[0.06] text-brand-danger'
                  : 'border-brand-line bg-brand-inset text-brand-ink'
              return (
                <p key={change.key} className={`rounded-xl border px-3.5 py-2.5 text-[12.5px] font-medium ${tone}`}>
                  {t(`report.readiness.dimensions.${change.key}`)} {change.trend === 0 ? t('growthSprint.weekly.stable') : `${change.trend > 0 ? '+' : ''}${change.trend}`}
                </p>
              )
            }) : (
              <p className="text-[12.5px] leading-relaxed text-brand-muted">{t(report?.hasTraining ? 'growthSprint.weekly.noTrend' : 'growthSprint.weekly.return')}</p>
            )}
          </div>
        </details>

        <article className={`${CARD} px-6 py-5`}>
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-brand-line bg-brand-inset text-brand-muted">
              <Trophy className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className={EYEBROW}>{t('growthSprint.milestones.eyebrow')}</p>
              <h3 className={`mt-1 ${H2}`}>{t('growthSprint.milestones.title')}</h3>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {offerSprint.milestones?.length ? offerSprint.milestones.slice(0, 3).map(item => (
              <div key={item.id} className="flex items-center gap-3 rounded-xl border border-brand-line bg-brand-inset px-4 py-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-success" />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-brand-ink">{t(`growthSprint.milestones.types.${item.milestone_type}`)}</p>
                  <p className="mt-0.5 text-[11px] tabular-nums text-brand-muted">{new Date(item.earned_at).toLocaleDateString(i18n.language)}</p>
                </div>
              </div>
            )) : (
              <p className="text-[12.5px] leading-relaxed text-brand-muted">{t('growthSprint.milestones.empty')}</p>
            )}
          </div>
        </article>
      </div>

      {/* 会员预告 */}
      {offerSprint.premiumPreview?.visible && (
        <article className={`${CARD} overflow-hidden px-6 py-5`}>
          <button type="button" onClick={() => setPremiumOpen(value => !value)} className="flex w-full items-center justify-between gap-5 text-left">
            <div className="flex min-w-0 gap-3.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-brand-line bg-brand-inset text-brand-violet">
                <Crown className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className={EYEBROW}>{t('growthSprint.premium.eyebrow')}</p>
                <h3 className={`mt-1 ${H2}`}>{t('growthSprint.premium.title')}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-brand-muted">{t('growthSprint.premium.body')}</p>
              </div>
            </div>
            <ChevronDown className={`h-4 w-4 shrink-0 text-brand-muted transition-transform ${premiumOpen ? 'rotate-180' : ''}`} />
          </button>
          {premiumOpen && (
            <div className="mt-5 grid gap-2.5 border-t border-brand-line pt-5 md:grid-cols-3">
              {['drills', 'jdPlan', 'deepReport'].map(feature => (
                <div key={feature} className="rounded-xl border border-brand-line bg-brand-inset px-4 py-4">
                  <LockKeyhole className="h-4 w-4 text-brand-muted" />
                  <h4 className="mt-2.5 text-[13px] font-semibold text-brand-ink">{t(`growthSprint.premium.features.${feature}.title`)}</h4>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-brand-muted">{t(`growthSprint.premium.features.${feature}.body`)}</p>
                </div>
              ))}
              <div className="flex items-start gap-2.5 rounded-xl border border-brand-line bg-brand-inset px-4 py-3.5 text-[12px] leading-relaxed text-brand-ink md:col-span-3">
                <ShieldCheck className="h-4 w-4 shrink-0 text-brand-success" />{t('growthSprint.premium.ownership')}
              </div>
            </div>
          )}
        </article>
      )}

      {error && <p className="rounded-xl border border-brand-danger/30 bg-brand-danger/[0.06] px-4 py-3 text-[12.5px] font-medium text-brand-danger">{error}</p>}
    </section>
  )
}
