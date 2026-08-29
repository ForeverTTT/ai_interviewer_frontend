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

  if (!plan && !editing) {
    return (
      <section className="relative overflow-hidden rounded-[2.25rem] bg-gradient-to-br from-amber-50 via-white to-indigo-50 p-7 shadow-xl shadow-slate-900/5 dark:from-amber-950/20 dark:via-slate-900 dark:to-indigo-950/20 sm:p-9">
        <div className="absolute -right-12 -top-12 h-52 w-52 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div><div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300"><Flag className="h-4 w-4" />{t('growthSprint.eyebrow')}</div><h2 className="mt-4 font-serif text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">{t('growthSprint.empty.title')}</h2><p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-300">{t('growthSprint.empty.body')}</p><button type="button" onClick={() => { setDraft(EMPTY_FORM); setEditing(true) }} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-6 py-3.5 text-sm font-black text-white dark:bg-white dark:text-slate-950"><Sparkles className="h-4 w-4" />{t('growthSprint.empty.create')}</button></div>
          <ol className="grid gap-3">{['position', 'interview', 'rhythm'].map((step, index) => <li key={step} className="flex items-center gap-4 rounded-2xl border border-white/80 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-950/50"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-sm font-black text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">{index + 1}</span><span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t(`growthSprint.empty.steps.${step}`)}</span></li>)}</ol>
        </div>
      </section>
    )
  }

  if (editing) {
    return (
      <section className="card-premium p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-primary-600">{t('growthSprint.eyebrow')}</p><h2 className="mt-2 font-serif text-3xl font-black text-slate-950 dark:text-white">{t(plan ? 'growthSprint.form.editTitle' : 'growthSprint.form.createTitle')}</h2></div><button type="button" onClick={() => setEditing(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black dark:border-slate-700">{t('growthSprint.form.cancel')}</button></div>
        <div className="mt-7 grid gap-5 md:grid-cols-2">
          <label className="space-y-2"><span className="text-xs font-black text-slate-500">{t('growthSprint.form.position')}</span><input value={draft.targetPosition} onChange={event => setDraft(current => ({ ...current, targetPosition: event.target.value }))} className="input-field" placeholder={t('growthSprint.form.positionPlaceholder')} /></label>
          <label className="space-y-2"><span className="text-xs font-black text-slate-500">{t('growthSprint.form.interviewer')}</span><select value={draft.interviewerType} onChange={event => setDraft(current => ({ ...current, interviewerType: event.target.value }))} className="input-field"><option value="mixed">{t('notes.interviewer.mixed')}</option><option value="technical">{t('notes.interviewer.technical')}</option><option value="hr">{t('notes.interviewer.hr')}</option></select></label>
          <label className="space-y-2"><span className="text-xs font-black text-slate-500">{t('growthSprint.form.nextInterview')}</span><input type="date" value={draft.nextInterviewDate} onChange={event => setDraft(current => ({ ...current, nextInterviewDate: event.target.value }))} className="input-field" /></label>
          <label className="space-y-2"><span className="text-xs font-black text-slate-500">{t('growthSprint.form.offerDate')}</span><input type="date" value={draft.targetOfferDate} onChange={event => setDraft(current => ({ ...current, targetOfferDate: event.target.value }))} className="input-field" /></label>
          <label className="space-y-2 md:col-span-2"><span className="text-xs font-black text-slate-500">{t('growthSprint.form.jd')}</span><textarea rows={4} value={draft.targetJobDescription} onChange={event => setDraft(current => ({ ...current, targetJobDescription: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white p-4 text-sm outline-none focus:border-primary-400 dark:border-slate-700 dark:bg-slate-900" placeholder={t('growthSprint.form.jdPlaceholder')} /></label>
        </div>
        <div className="mt-6"><p className="text-xs font-black text-slate-500">{t('growthSprint.form.weeklyTarget')}</p><div className="mt-3 flex flex-wrap gap-2">{[3, 5, 7].map(days => <button key={days} type="button" onClick={() => setDraft(current => ({ ...current, weeklyTargetDays: days }))} className={`rounded-xl px-5 py-3 text-xs font-black ${draft.weeklyTargetDays === days ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>{t('growthSprint.form.days', { count: days })}</button>)}</div></div>
        <div className="mt-7 grid gap-3 md:grid-cols-2">{[
          ['inApp', Bell, false], ['browser', BellRing, false], ['email', Mail, !offerSprint.reminderCapabilities?.emailConfigured], ['weeklyReport', CalendarClock, false],
        ].map(([key, Icon, disabled]) => <label key={key} className={`flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800 ${disabled ? 'opacity-50' : ''}`}><span className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-200"><Icon className="h-4 w-4 text-primary-500" />{t(`growthSprint.form.reminders.${key}`)}{disabled && <span className="text-[10px] text-slate-400">{t('growthSprint.form.notConfigured')}</span>}</span><input type="checkbox" disabled={disabled || busy} checked={Boolean(draft.reminderPreferences[key])} onChange={event => void setReminder(key, event.target.checked)} className="h-5 w-5 accent-primary-600" /></label>)}</div>
        {error && <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
        <div className="mt-8 flex flex-wrap gap-3"><button type="button" disabled={busy || !draft.targetPosition.trim()} onClick={() => void savePlan()} className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-black text-white disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{t('growthSprint.form.save')}</button>{plan && <button type="button" disabled={busy} onClick={() => void deletePlan()} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-5 py-3 text-sm font-black text-red-600 dark:border-red-900"><Trash2 className="h-4 w-4" />{t('growthSprint.form.remove')}</button>}</div>
      </section>
    )
  }

  return (
    <section className="space-y-5" aria-labelledby="offer-sprint-title">
      {inAppReminders.map(reminder => <div key={reminder.id} className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/60 dark:bg-amber-950/20 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><BellRing className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" /><div><p className="font-black text-amber-950 dark:text-amber-100">{t(`growthSprint.reminders.${reminder.reminder_type}.title`)}</p><p className="mt-1 text-sm text-amber-800 dark:text-amber-200">{t(`growthSprint.reminders.${reminder.reminder_type}.body`, { position: plan.target_position })}</p></div></div><button type="button" onClick={() => void dismissReminder(reminder)} className="rounded-xl border border-amber-300 px-4 py-2 text-xs font-black text-amber-800 dark:border-amber-800 dark:text-amber-200">{t('growthSprint.reminders.dismiss')}</button></div>)}
      {offerSprint.recoveryNudge && <div className="flex items-start gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-5 text-indigo-950 dark:border-indigo-900/60 dark:bg-indigo-950/20 dark:text-indigo-100"><RotateCcw className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-300" /><div><p className="font-black">{t(`growthSprint.recovery.${offerSprint.recoveryNudge.type}.title`)}</p><p className="mt-1 text-sm leading-relaxed text-indigo-800 dark:text-indigo-200">{t(`growthSprint.recovery.${offerSprint.recoveryNudge.type}.body`, { count: offerSprint.recoveryNudge.remainingDays })}</p></div></div>}

      <div className="overflow-hidden rounded-[2.25rem] bg-slate-950 text-white shadow-2xl shadow-slate-900/15">
        <div className="grid gap-8 p-7 sm:p-9 lg:grid-cols-[1fr_0.9fr]">
          <div><div className="flex items-center justify-between gap-4"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-amber-300"><Flag className="h-4 w-4" />{t('growthSprint.eyebrow')}</div><button type="button" onClick={() => setEditing(true)} className="rounded-xl bg-white/10 p-2 text-slate-300 hover:text-white" aria-label={t('growthSprint.form.editTitle')}><Edit3 className="h-4 w-4" /></button></div><h2 id="offer-sprint-title" className="mt-4 font-serif text-3xl font-black sm:text-4xl">{plan.target_position}</h2><p className="mt-3 text-sm text-slate-300">{t(`growthSprint.stage.${offerSprint.sprint.stage}`)}</p><div className="mt-6 flex flex-wrap gap-3">{offerSprint.sprint.interviewDays !== null && <div className="rounded-2xl bg-white/10 px-5 py-3"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('growthSprint.countdown.interview')}</p><p className="mt-1 text-xl font-black">{offerSprint.sprint.interviewDays >= 0 ? t('growthSprint.countdown.days', { count: offerSprint.sprint.interviewDays }) : t('growthSprint.countdown.update')}</p></div>}{offerSprint.sprint.offerDays !== null && <div className="rounded-2xl bg-white/10 px-5 py-3"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('growthSprint.countdown.offer')}</p><p className="mt-1 text-xl font-black">{offerSprint.sprint.offerDays >= 0 ? t('growthSprint.countdown.days', { count: offerSprint.sprint.offerDays }) : t('growthSprint.countdown.update')}</p></div>}</div></div>
          <div className="rounded-[1.75rem] bg-white/[0.07] p-6"><div className="flex items-end justify-between"><div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('growthSprint.progress.title')}</p><p className="mt-2 text-3xl font-black">{offerSprint.progress.completed} / {offerSprint.progress.total}</p></div><span className="text-sm font-black text-amber-300">{offerSprint.progress.percent}%</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-amber-400" style={{ width: `${offerSprint.progress.percent}%` }} /></div><p className="mt-4 text-xs leading-relaxed text-slate-300">{t('growthSprint.progress.days', { current: offerSprint.progress.effectiveDays, target: offerSprint.progress.weeklyTargetDays })}</p></div>
        </div>

        <div className="border-t border-white/10 bg-white/[0.04] p-7 sm:p-9">
          <div className="flex items-end justify-between gap-4">
            <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">{t('growthSprint.tasks.eyebrow')}</p><h3 className="mt-2 font-serif text-2xl font-black">{t('growthSprint.tasks.title')}</h3></div>
            <span className="text-xs font-bold text-slate-400">{t('growthSprint.tasks.limit')}</span>
          </div>
          <div className="mt-6 grid gap-3">
            {offerSprint.tasks.map(task => {
              const Icon = taskIcon(task.task_type)
              const completed = task.status === 'completed'
              const isToday = task.id === offerSprint.todayTask?.id
              const reviewCards = Array.isArray(task.context?.reviewCards) ? task.context.reviewCards : []
              return (
                <article key={task.id} className={`rounded-2xl border p-5 ${isToday ? 'border-amber-300/50 bg-amber-300/10' : 'border-white/10 bg-white/[0.04]'}`}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-4">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${completed ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/10 text-amber-300'}`}>
                        {completed ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2"><h4 className="font-black">{t(`growthSprint.tasks.types.${task.task_type}.title`)}</h4>{isToday && <span className="rounded-full bg-amber-300 px-2 py-0.5 text-[9px] font-black uppercase text-slate-950">{t('growthSprint.tasks.today')}</span>}</div>
                        <p className="mt-2 text-sm leading-relaxed text-slate-300">{task.context?.reason || t(`growthSprint.tasks.types.${task.task_type}.reason`, { position: plan.target_position, dimension: task.dimension ? t(`report.readiness.dimensions.${task.dimension}`) : '' })}</p>
                        {reviewCards.length > 0 && <div className="mt-3 rounded-xl bg-black/20 p-3"><p className="text-[10px] font-black uppercase tracking-widest text-amber-200">{t('growthSprint.tasks.checklistReview')}</p><ul className="mt-2 space-y-1.5">{reviewCards.map(card => <li key={card.id} className="line-clamp-1 text-xs text-slate-300">{card.isPinned ? '★ ' : '• '}{card.questionText}</li>)}</ul></div>}
                        <div className="mt-3 flex flex-wrap gap-3 text-[10px] font-bold text-slate-400"><span><Clock3 className="mr-1 inline h-3 w-3" />{t('growthSprint.tasks.minutes', { count: task.estimated_minutes })}</span><span><Trophy className="mr-1 inline h-3 w-3" />{t(`growthSprint.tasks.types.${task.task_type}.unlock`)}</span></div>
                      </div>
                    </div>
                    {!completed && <div className="flex shrink-0 gap-2">
                      <button type="button" disabled={taskBusy === task.id} onClick={() => void startTask(task)} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-slate-950 disabled:opacity-60">
                        {taskBusy === task.id ? <Loader2 className="h-4 w-4 animate-spin" /> : task.task_type === 'pre_interview_checklist' ? <Check className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                        {t(task.task_type === 'pre_interview_checklist' ? 'growthSprint.tasks.completeChecklist' : 'growthSprint.tasks.start')}
                      </button>
                      {task.task_type !== 'pre_interview_checklist' && <button type="button" aria-label={t('growthSprint.tasks.complete')} disabled={taskBusy === task.id} onClick={() => void updateTask(task, 'completed')} className="rounded-xl border border-white/20 px-3 py-2.5 text-xs font-black text-white">{taskBusy === task.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}</button>}
                      <button type="button" aria-label={t('growthSprint.tasks.skip')} disabled={taskBusy === task.id} onClick={() => void updateTask(task, 'skipped')} className="rounded-xl border border-white/10 px-3 py-2.5 text-slate-400 transition hover:text-white"><SkipForward className="h-4 w-4" /></button>
                    </div>}
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <details className="card-premium group p-6 sm:p-7">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary-600">{t('growthSprint.weekly.eyebrow')}</p><h3 className="mt-2 font-serif text-2xl font-black text-slate-950 dark:text-white">{t('growthSprint.weekly.title')}</h3></div><ChevronDown className="h-5 w-5 text-slate-400 transition group-open:rotate-180" /></summary>
          <div className="mt-6 grid grid-cols-3 gap-3"><div className="rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-900"><p className="text-2xl font-black">{report?.effectiveDays || 0}</p><p className="mt-1 text-[10px] font-bold text-slate-400">{t('growthSprint.weekly.days')}</p></div><div className="rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-900"><p className="text-2xl font-black">{report?.effectiveMinutes || 0}</p><p className="mt-1 text-[10px] font-bold text-slate-400">{t('growthSprint.weekly.minutes')}</p></div><div className="rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-900"><p className="text-2xl font-black">{report?.completedTasks || 0}</p><p className="mt-1 text-[10px] font-bold text-slate-400">{t('growthSprint.weekly.completed')}</p></div></div>
          <div className="mt-5 space-y-2">{report?.changes?.length ? report.changes.map(change => {
            const tone = change.trend > 0 ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-200' : change.trend < 0 ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-200' : 'bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-200'
            return <p key={change.key} className={`rounded-xl p-3 text-sm font-bold ${tone}`}>{t(`report.readiness.dimensions.${change.key}`)} {change.trend === 0 ? t('growthSprint.weekly.stable') : `${change.trend > 0 ? '+' : ''}${change.trend}`}</p>
          }) : <p className="text-sm leading-relaxed text-slate-500">{t(report?.hasTraining ? 'growthSprint.weekly.noTrend' : 'growthSprint.weekly.return')}</p>}</div>
        </details>
        <article className="card-premium p-6 sm:p-7"><div className="flex items-center gap-3"><div className="rounded-2xl bg-amber-50 p-3 text-amber-600 dark:bg-amber-950/30 dark:text-amber-300"><Trophy className="h-5 w-5" /></div><div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('growthSprint.milestones.eyebrow')}</p><h3 className="font-serif text-xl font-black text-slate-950 dark:text-white">{t('growthSprint.milestones.title')}</h3></div></div><div className="mt-5 space-y-3">{offerSprint.milestones?.length ? offerSprint.milestones.slice(0, 3).map(item => <div key={item.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-900"><CheckCircle2 className="h-5 w-5 text-emerald-500" /><div><p className="text-sm font-black text-slate-900 dark:text-white">{t(`growthSprint.milestones.types.${item.milestone_type}`)}</p><p className="mt-1 text-[10px] text-slate-400">{new Date(item.earned_at).toLocaleDateString(i18n.language)}</p></div></div>) : <p className="text-sm leading-relaxed text-slate-500">{t('growthSprint.milestones.empty')}</p>}</div></article>
      </div>

      {offerSprint.premiumPreview?.visible && <article className="card-premium overflow-hidden p-6 sm:p-7"><button type="button" onClick={() => setPremiumOpen(value => !value)} className="flex w-full items-center justify-between gap-5 text-left"><div className="flex gap-4"><div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-300"><Crown className="h-5 w-5" /></div><div><p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{t('growthSprint.premium.eyebrow')}</p><h3 className="mt-1 font-serif text-xl font-black text-slate-950 dark:text-white">{t('growthSprint.premium.title')}</h3><p className="mt-2 text-sm text-slate-500">{t('growthSprint.premium.body')}</p></div></div><ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition ${premiumOpen ? 'rotate-180' : ''}`} /></button>{premiumOpen && <div className="mt-6 grid gap-3 border-t border-slate-100 pt-6 dark:border-slate-800 md:grid-cols-3">{['drills', 'jdPlan', 'deepReport'].map(feature => <div key={feature} className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800"><LockKeyhole className="h-5 w-5 text-indigo-500" /><h4 className="mt-3 text-sm font-black text-slate-950 dark:text-white">{t(`growthSprint.premium.features.${feature}.title`)}</h4><p className="mt-2 text-xs leading-relaxed text-slate-500">{t(`growthSprint.premium.features.${feature}.body`)}</p></div>)}<div className="md:col-span-3 flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-xs leading-relaxed text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-200"><ShieldCheck className="h-5 w-5 shrink-0" />{t('growthSprint.premium.ownership')}</div></div>}</article>}
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
    </section>
  )
}
