import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Bell, BellRing, BriefcaseBusiness, CalendarClock, Check, CheckCircle2,
  ChevronDown, Clock3, Edit3, Flag, Loader2, Mail, PlayCircle,
  RotateCcw, SkipForward, Sparkles, Target, Trash2,
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

export default function OfferSprintPanel({ offerSprint, practiceStats, onOverview, onStartTask }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const plan = offerSprint?.plan || null
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(() => formFromPlan(plan))
  const [busy, setBusy] = useState(false)
  const [taskBusy, setTaskBusy] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => { if (!editing) setDraft(formFromPlan(plan)) }, [editing, plan])

  const refreshOverview = async () => {
    const response = await authenticatedFetch(`${getBackendBaseUrl()}/api/growth-center/overview`)
    if (!response.ok) throw new Error('overview failed')
    const body = await response.json()
    onOverview?.(body)
  }

  const savePlan = async () => {
    setBusy(true)
    setError('')
    try {
      const response = await authenticatedFetch(`${getBackendBaseUrl()}/api/growth-center/offer-plan`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin',
        }),
      })
      if (!response.ok) throw new Error('save failed')
      await refreshOverview()
      setEditing(false)
    } catch {
      setError(t('growthSprint.errors.save'))
    } finally {
      setBusy(false)
    }
  }

  const deletePlan = async () => {
    if (!window.confirm(t('growthSprint.form.removeConfirm'))) return
    setBusy(true)
    setError('')
    try {
      const response = await authenticatedFetch(`${getBackendBaseUrl()}/api/growth-center/offer-plan`, { method: 'DELETE' })
      if (!response.ok) throw new Error('delete failed')
      await refreshOverview()
      setEditing(false)
    } catch {
      setError(t('growthSprint.errors.delete'))
    } finally {
      setBusy(false)
    }
  }

  const setReminder = async (key, enabled) => {
    let nextEnabled = enabled
    if (key === 'browser' && enabled) {
      if (!('Notification' in window)) nextEnabled = false
      else nextEnabled = await window.Notification.requestPermission() === 'granted'
    }
    setDraft(current => ({
      ...current,
      reminderPreferences: { ...current.reminderPreferences, [key]: nextEnabled },
    }))
  }

  const updateTask = async (task, status) => {
    setTaskBusy(task.id)
    setError('')
    try {
      const response = await authenticatedFetch(`${getBackendBaseUrl()}/api/growth-center/offer-plan/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) throw new Error('task update failed')
      await refreshOverview()
    } catch {
      setError(t('growthSprint.errors.task'))
    } finally {
      setTaskBusy(null)
    }
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
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'dismissed' }),
      })
      await refreshOverview()
    } catch {
      setError(t('growthSprint.errors.reminder'))
    }
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

  const inAppReminder = useMemo(
    () => (offerSprint?.reminders || []).find(item => item.channel === 'in_app'),
    [offerSprint?.reminders],
  )
  const tasks = offerSprint?.tasks || []
  const todayTask = offerSprint?.todayTask || tasks.find(task => task.status === 'pending') || null
  const otherTasks = tasks.filter(task => task.status === 'pending' && task.id !== todayTask?.id)
  const sprint = offerSprint?.sprint || { stage: 'foundation', interviewDays: null, offerDays: null }
  const progress = offerSprint?.progress || {
    completed: 0,
    total: tasks.length,
    percent: 0,
    effectiveDays: 0,
    weeklyTargetDays: plan?.weekly_target_days || 5,
  }

  if (!offerSprint) return null

  if (!plan && !editing) {
    return (
      <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-7 text-white shadow-2xl shadow-slate-900/15 sm:p-9">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-amber-300"><Flag className="h-4 w-4" />{t('growthSprint.eyebrow')}</div>
            <h2 className="mt-3 font-serif text-3xl font-black">{t('growthSprint.empty.title')}</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">{t('growthSprint.empty.body')}</p>
          </div>
          <button type="button" onClick={() => { setDraft(EMPTY_FORM); setEditing(true) }} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-black text-slate-950">
            <Sparkles className="h-4 w-4" />{t('growthSprint.empty.create')}
          </button>
        </div>
      </section>
    )
  }

  if (editing) {
    return (
      <section className="card-premium p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div><p className="text-xs font-black uppercase tracking-[0.18em] text-primary-600">{t('growthSprint.eyebrow')}</p><h2 className="mt-2 font-serif text-3xl font-black text-slate-950 dark:text-white">{t(plan ? 'growthSprint.form.editTitle' : 'growthSprint.form.createTitle')}</h2></div>
          <button type="button" onClick={() => setEditing(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black dark:border-slate-700">{t('growthSprint.form.cancel')}</button>
        </div>

        <div className="mt-7 grid gap-5 md:grid-cols-2">
          <label className="space-y-2"><span className="text-xs font-black text-slate-500">{t('growthSprint.form.position')}</span><input value={draft.targetPosition} onChange={event => setDraft(current => ({ ...current, targetPosition: event.target.value }))} className="input-field" placeholder={t('growthSprint.form.positionPlaceholder')} /></label>
          <label className="space-y-2"><span className="text-xs font-black text-slate-500">{t('growthSprint.form.interviewer')}</span><select value={draft.interviewerType} onChange={event => setDraft(current => ({ ...current, interviewerType: event.target.value }))} className="input-field"><option value="mixed">{t('notes.interviewer.mixed')}</option><option value="technical">{t('notes.interviewer.technical')}</option><option value="hr">{t('notes.interviewer.hr')}</option></select></label>
          <label className="space-y-2"><span className="text-xs font-black text-slate-500">{t('growthSprint.form.nextInterview')}</span><input type="date" value={draft.nextInterviewDate} onChange={event => setDraft(current => ({ ...current, nextInterviewDate: event.target.value }))} className="input-field" /></label>
          <label className="space-y-2"><span className="text-xs font-black text-slate-500">{t('growthSprint.form.offerDate')}</span><input type="date" value={draft.targetOfferDate} onChange={event => setDraft(current => ({ ...current, targetOfferDate: event.target.value }))} className="input-field" /></label>
        </div>

        <div className="mt-6"><p className="text-xs font-black text-slate-500">{t('growthSprint.form.weeklyTarget')}</p><div className="mt-3 flex gap-2">{[3, 5, 7].map(days => <button key={days} type="button" onClick={() => setDraft(current => ({ ...current, weeklyTargetDays: days }))} className={`rounded-xl px-5 py-3 text-xs font-black ${draft.weeklyTargetDays === days ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>{t('growthSprint.form.days', { count: days })}</button>)}</div></div>

        <details className="group mt-6 rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-black text-slate-700 dark:text-slate-200">{t('growthSprint.form.moreSettings')}<ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" /></summary>
          <label className="mt-5 block space-y-2"><span className="text-xs font-black text-slate-500">{t('growthSprint.form.jd')}</span><textarea rows={4} value={draft.targetJobDescription} onChange={event => setDraft(current => ({ ...current, targetJobDescription: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white p-4 text-sm outline-none focus:border-primary-400 dark:border-slate-700 dark:bg-slate-900" placeholder={t('growthSprint.form.jdPlaceholder')} /></label>
          <div className="mt-5 grid gap-3 md:grid-cols-2">{[
            ['inApp', Bell, false], ['browser', BellRing, false], ['email', Mail, !offerSprint.reminderCapabilities?.emailConfigured], ['weeklyReport', CalendarClock, false],
          ].map(([key, Icon, disabled]) => <label key={key} className={`flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-900 ${disabled ? 'opacity-50' : ''}`}><span className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-200"><Icon className="h-4 w-4 text-primary-500" />{t(`growthSprint.form.reminders.${key}`)}</span><input type="checkbox" disabled={disabled || busy} checked={Boolean(draft.reminderPreferences[key])} onChange={event => void setReminder(key, event.target.checked)} className="h-5 w-5 accent-primary-600" /></label>)}</div>
        </details>

        {error && <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
        <div className="mt-7 flex flex-wrap gap-3"><button type="button" disabled={busy || !draft.targetPosition.trim()} onClick={() => void savePlan()} className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-black text-white disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{t('growthSprint.form.save')}</button>{plan && <button type="button" disabled={busy} onClick={() => void deletePlan()} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-5 py-3 text-sm font-black text-red-600 dark:border-red-900"><Trash2 className="h-4 w-4" />{t('growthSprint.form.remove')}</button>}</div>
      </section>
    )
  }

  const TodayIcon = todayTask ? taskIcon(todayTask.task_type) : CheckCircle2

  return (
    <section className="space-y-4" aria-labelledby="offer-sprint-title">
      {inAppReminder && <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-900/60 dark:bg-amber-950/20"><div className="flex items-center gap-3"><BellRing className="h-5 w-5 shrink-0 text-amber-600" /><p className="text-sm font-bold text-amber-950 dark:text-amber-100">{t(`growthSprint.reminders.${inAppReminder.reminder_type}.title`)}</p></div><button type="button" onClick={() => void dismissReminder(inAppReminder)} className="text-xs font-black text-amber-800 dark:text-amber-200">{t('growthSprint.reminders.dismiss')}</button></div>}

      <div className="overflow-hidden rounded-[2.25rem] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-2xl shadow-slate-900/15">
        <div className="grid gap-8 p-7 sm:p-9 lg:grid-cols-[1fr_22rem] lg:items-start">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-amber-300"><Flag className="h-4 w-4" />{t('growthSprint.eyebrow')}</div>
            <div className="mt-4 flex items-start justify-between gap-4"><div><h2 id="offer-sprint-title" className="font-serif text-3xl font-black sm:text-4xl">{plan.target_position}</h2><p className="mt-2 text-sm text-slate-300">{t(`growthSprint.stage.${sprint.stage}`)}</p></div><button type="button" onClick={() => setEditing(true)} className="rounded-xl bg-white/10 p-2.5 text-slate-300 transition hover:bg-white/15 hover:text-white" aria-label={t('growthSprint.form.editTitle')}><Edit3 className="h-4 w-4" /></button></div>

            <div className="mt-6 flex flex-wrap gap-3">
              {sprint.interviewDays !== null && <div className="rounded-xl bg-white/10 px-4 py-3"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('growthSprint.countdown.interview')}</p><p className="mt-1 text-lg font-black">{sprint.interviewDays >= 0 ? t('growthSprint.countdown.days', { count: sprint.interviewDays }) : t('growthSprint.countdown.update')}</p></div>}
              {sprint.offerDays !== null && <div className="rounded-xl bg-white/10 px-4 py-3"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('growthSprint.countdown.offer')}</p><p className="mt-1 text-lg font-black">{sprint.offerDays >= 0 ? t('growthSprint.countdown.days', { count: sprint.offerDays }) : t('growthSprint.countdown.update')}</p></div>}
            </div>
            <p className="mt-5 text-xs font-bold text-slate-400">{t('growthSprint.summary.practice', { count: practiceStats?.count || 0, duration: practiceStats?.duration || '0' })}</p>
          </div>

          <div className="rounded-[1.5rem] bg-white/[0.08] p-5">
            <div className="flex items-end justify-between"><div><p className="text-xs font-bold text-slate-400">{t('growthSprint.progress.title')}</p><p className="mt-2 text-3xl font-black">{progress.completed} / {progress.total}</p></div><span className="text-sm font-black text-amber-300">{progress.percent}%</span></div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-amber-400" style={{ width: `${progress.percent}%` }} /></div>
            <p className="mt-3 text-xs text-slate-300">{t('growthSprint.progress.days', { current: progress.effectiveDays, target: progress.weeklyTargetDays })}</p>
          </div>
        </div>

        <div className="border-t border-white/10 bg-white/[0.04] p-7 sm:p-9">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">{t('growthSprint.tasks.today')}</p>
          {todayTask ? <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-300/15 text-amber-300"><TodayIcon className="h-5 w-5" /></div><div><h3 className="text-lg font-black">{t(`growthSprint.tasks.types.${todayTask.task_type}.title`)}</h3><p className="mt-1 max-w-2xl text-sm text-slate-300">{t(`growthSprint.tasks.types.${todayTask.task_type}.reason`, { position: plan.target_position, dimension: todayTask.dimension ? t(`report.readiness.dimensions.${todayTask.dimension}`) : '' })}</p><p className="mt-2 flex items-center gap-1 text-xs font-bold text-slate-400"><Clock3 className="h-3.5 w-3.5" />{t('growthSprint.tasks.minutes', { count: todayTask.estimated_minutes })}</p></div></div>
            <div className="flex shrink-0 gap-2"><button type="button" disabled={taskBusy === todayTask.id} onClick={() => void startTask(todayTask)} className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-60">{taskBusy === todayTask.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}{t(todayTask.task_type === 'pre_interview_checklist' ? 'growthSprint.tasks.completeChecklist' : 'growthSprint.tasks.start')}</button>{todayTask.task_type !== 'pre_interview_checklist' && <button type="button" aria-label={t('growthSprint.tasks.complete')} disabled={taskBusy === todayTask.id} onClick={() => void updateTask(todayTask, 'completed')} className="rounded-xl border border-white/20 px-3 text-white"><Check className="h-4 w-4" /></button>}<button type="button" aria-label={t('growthSprint.tasks.skip')} disabled={taskBusy === todayTask.id} onClick={() => void updateTask(todayTask, 'skipped')} className="rounded-xl border border-white/10 px-3 text-slate-400 hover:text-white"><SkipForward className="h-4 w-4" /></button></div>
          </div> : <div className="mt-3 flex items-center gap-3 text-sm font-bold text-emerald-300"><CheckCircle2 className="h-5 w-5" />{t('growthSprint.summary.allDone')}</div>}

          {otherTasks.length > 0 && <details className="group mt-6 border-t border-white/10 pt-5"><summary className="flex cursor-pointer list-none items-center justify-between text-sm font-black text-slate-300">{t('growthSprint.summary.otherTasks', { count: otherTasks.length })}<ChevronDown className="h-4 w-4 transition group-open:rotate-180" /></summary><div className="mt-4 divide-y divide-white/10 rounded-2xl bg-black/15 px-5">{otherTasks.map(task => { const Icon = taskIcon(task.task_type); return <div key={task.id} className="flex items-center justify-between gap-4 py-4"><div className="flex min-w-0 items-center gap-3"><Icon className="h-4 w-4 shrink-0 text-slate-400" /><div className="min-w-0"><p className="truncate text-sm font-bold">{t(`growthSprint.tasks.types.${task.task_type}.title`)}</p><p className="mt-0.5 text-xs text-slate-500">{t('growthSprint.tasks.minutes', { count: task.estimated_minutes })}</p></div></div><button type="button" disabled={taskBusy === task.id} onClick={() => void startTask(task)} className="shrink-0 rounded-lg border border-white/15 px-3 py-2 text-xs font-black text-white">{taskBusy === task.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t('growthSprint.tasks.start')}</button></div>})}</div></details>}
        </div>
      </div>

      {offerSprint.recoveryNudge && <p className="flex items-center gap-2 px-1 text-sm font-bold text-indigo-700 dark:text-indigo-300"><RotateCcw className="h-4 w-4" />{t(`growthSprint.recovery.${offerSprint.recoveryNudge.type}.title`)}</p>}
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
    </section>
  )
}
