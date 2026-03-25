import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { getBackendBaseUrl } from '../lib/backendBase'
import {
  PlusCircle, Clock, Globe2, Briefcase,
  TrendingUp, Target, Zap, ArrowRight, FileText, UserCircle,
  Trash2, Loader2, AlertTriangle, Sparkles, LayoutDashboard, History,
} from 'lucide-react'

function useLocaleTag(i18nLang) {
  return useMemo(() => {
    if (i18nLang === 'de') return 'de-DE'
    if (i18nLang === 'en') return 'en-US'
    return 'zh-CN'
  }, [i18nLang])
}

function langPillClass(lang) {
  if (lang === 'Deutsch') {
    return 'border-violet-200/90 bg-violet-50 text-violet-800 dark:border-violet-800/60 dark:bg-violet-950/50 dark:text-violet-200'
  }
  return 'border-sky-200/90 bg-sky-50 text-sky-900 dark:border-sky-800/60 dark:bg-sky-950/50 dark:text-sky-200'
}

export default function DashboardPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)
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
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
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
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const totalTime = interviews.reduce((sum, iv) => sum + (iv.duration || 0), 0)
  const langCounts = interviews.reduce((acc, iv) => {
    acc[iv.language] = (acc[iv.language] || 0) + 1
    return acc
  }, {})

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]

  const statCards = [
    {
      icon: Target,
      value: interviews.length,
      label: t('dashboard.statTotal'),
      grad: 'from-primary-500 to-violet-600',
      ring: 'ring-primary-100 dark:ring-primary-900/50',
      topBar: 'from-transparent via-primary-400/55 to-transparent dark:via-primary-500/35',
    },
    {
      icon: Clock,
      value: `${totalTime}${t('dashboard.minUnit')}`,
      label: t('dashboard.statTime'),
      grad: 'from-emerald-500 to-teal-600',
      ring: 'ring-emerald-100 dark:ring-emerald-900/50',
      topBar: 'from-transparent via-emerald-400/55 to-transparent dark:via-emerald-500/35',
    },
    {
      icon: Globe2,
      value: langCounts.Deutsch || 0,
      label: t('dashboard.statDe'),
      grad: 'from-violet-500 to-indigo-600',
      ring: 'ring-violet-100 dark:ring-violet-900/50',
      topBar: 'from-transparent via-violet-400/55 to-transparent dark:via-violet-500/35',
    },
    {
      icon: TrendingUp,
      value: langCounts.English || 0,
      label: t('dashboard.statEn'),
      grad: 'from-amber-500 to-orange-600',
      ring: 'ring-amber-100 dark:ring-amber-900/50',
      topBar: 'from-transparent via-amber-400/55 to-transparent dark:via-amber-500/35',
    },
  ]

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-100 via-slate-50/90 to-white pt-24 pb-12 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 sm:pb-16">
      <div className="pointer-events-none absolute inset-0 bg-mesh-subtle opacity-60 dark:opacity-40" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-dot-grid opacity-[0.12] dark:opacity-[0.08]" aria-hidden />
      <div
        className="pointer-events-none absolute -top-20 right-0 h-[min(420px,80vw)] w-[min(420px,80vw)] rounded-full bg-primary-200/25 blur-3xl dark:bg-primary-900/20"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 h-[min(320px,70vw)] w-[min(320px,70vw)] rounded-full bg-violet-200/20 blur-3xl dark:bg-violet-950/30"
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-10">
        <header className="mb-8 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-card ring-1 ring-slate-900/[0.04] dark:border-slate-700/80 dark:bg-slate-900/60 dark:ring-white/[0.06] sm:mb-10">
          <div className="relative border-b border-slate-100 bg-gradient-to-br from-primary-600/[0.08] via-white to-violet-600/[0.07] px-5 py-6 dark:border-slate-800 dark:from-primary-500/10 dark:via-slate-900 dark:to-violet-600/10 sm:px-8 sm:py-7">
            <div
              className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary-400/25 to-transparent dark:via-primary-500/15"
              aria-hidden
            />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-violet-600 text-white shadow-lg shadow-primary-600/25 ring-2 ring-white dark:ring-slate-900">
                  <LayoutDashboard className="h-7 w-7" aria-hidden />
                </div>
                <div className="min-w-0">
                  <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary-200/80 bg-primary-50/90 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary-800 shadow-soft backdrop-blur-sm dark:border-primary-700/50 dark:bg-primary-900/40 dark:text-primary-100">
                    <Sparkles className="h-3.5 w-3.5 text-primary-600 dark:text-primary-300" aria-hidden />
                    {t('dashboard.heroBadge')}
                  </span>
                  <h1 className="text-balance text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl lg:text-4xl">
                    {t('dashboard.hello')}
                    {firstName || t('dashboard.guest')}
                    <span className="ml-1" aria-hidden>
                      👋
                    </span>
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
                    {t('dashboard.sub')}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <Link
                  to="/profile"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-5 py-2.5 text-sm font-bold text-primary-800 transition-colors hover:bg-primary-100 dark:border-slate-700 dark:bg-slate-800 dark:text-primary-300 dark:hover:bg-slate-700/80"
                >
                  <UserCircle className="h-5 w-5 shrink-0" aria-hidden />
                  {t('profile.title')}
                </Link>
                <Link
                  to="/setup"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-primary-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:from-violet-700 hover:to-primary-700"
                >
                  <PlusCircle className="h-5 w-5 shrink-0" aria-hidden />
                  {t('dashboard.newInterview')}
                </Link>
              </div>
            </div>
          </div>
        </header>

        <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 sm:mb-10">
          {statCards.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-card ring-1 ring-slate-900/[0.03] transition-shadow duration-300 hover:shadow-lg dark:border-slate-700/90 dark:bg-slate-900 dark:ring-white/[0.05] sm:p-5"
              >
                <div
                  className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${stat.topBar}`}
                  aria-hidden
                />
                <div
                  className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${stat.grad} text-white shadow-md ${stat.ring} ring-2 ring-white dark:ring-slate-900`}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <div className="text-2xl font-black tabular-nums tracking-tight text-slate-900 dark:text-white sm:text-[1.65rem]">
                  {stat.value}
                </div>
                <div className="mt-1 text-xs font-semibold leading-snug text-slate-600 dark:text-slate-400 sm:text-sm">
                  {stat.label}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-card ring-1 ring-slate-900/[0.04] dark:border-slate-700/90 dark:bg-slate-900 dark:ring-white/[0.06] sm:mb-10">
          <div className="relative border-b border-slate-200/80 bg-gradient-to-br from-primary-600/[0.07] via-white to-violet-600/[0.06] px-5 py-5 dark:border-slate-700/80 dark:from-primary-500/10 dark:via-slate-900 dark:to-violet-600/10 sm:px-8 sm:py-6">
            <div
              className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary-400/30 to-transparent dark:via-primary-500/20"
              aria-hidden
            />
            <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-violet-600 text-white shadow-md">
                  <History className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                    {t('dashboard.history')}
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">{t('dashboard.historySub')}</p>
                </div>
              </div>
              {interviews.length > 0 ? (
                <span className="inline-flex w-fit items-center rounded-full border border-slate-200/90 bg-white/80 px-3 py-1 text-xs font-bold text-slate-600 backdrop-blur-sm dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
                  {interviews.length} {t('dashboard.records')}
                </span>
              ) : null}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-4 py-24">
              <Loader2 className="h-10 w-10 animate-spin text-primary-600 dark:text-primary-400" aria-hidden />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('dashboard.loading')}</p>
            </div>
          ) : interviews.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-20 text-center sm:py-24">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/15 to-violet-600/15 ring-1 ring-primary-200/50 dark:from-primary-500/10 dark:to-violet-600/10 dark:ring-primary-900/40">
                <Target className="h-10 w-10 text-primary-600 dark:text-primary-400" aria-hidden />
              </div>
              <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">{t('dashboard.emptyTitle')}</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {t('dashboard.emptySub')}
              </p>
              <Link
                to="/setup"
                className="mt-8 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-primary-600 px-8 py-3 text-sm font-bold text-white shadow-md transition hover:from-violet-700 hover:to-primary-700"
              >
                <Zap className="h-4 w-4 shrink-0" aria-hidden />
                {t('dashboard.emptyCta')}
              </Link>
            </div>
          ) : (
            <div className="space-y-3 p-4 sm:space-y-4 sm:p-6 lg:p-8">
              {interviews.map((interview) => (
                <article
                  key={interview.id}
                  className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 transition-all duration-200 hover:border-primary-200/70 hover:bg-white hover:shadow-md dark:border-slate-600/90 dark:bg-slate-800/30 dark:hover:border-primary-900/50 dark:hover:bg-slate-800/60 sm:p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 flex-1 gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-violet-600 text-white shadow-md ring-2 ring-white dark:ring-slate-900">
                        <Briefcase className="h-5 w-5" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <h3 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">{interview.position}</h3>
                          <time
                            className="text-xs font-medium text-slate-400 dark:text-slate-500"
                            dateTime={interview.created_at}
                          >
                            {formatDate(interview.created_at)}
                          </time>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold ${langPillClass(interview.language)}`}
                          >
                            <Globe2 className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                            {interview.language}
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-2.5 py-1 text-xs font-bold text-slate-600 dark:border-slate-600 dark:bg-slate-900/80 dark:text-slate-300">
                            <Clock className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                            {interview.duration} {t('dashboard.durMin')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 border-t border-slate-200/80 pt-4 dark:border-slate-600/80 lg:border-t-0 lg:pt-0">
                      <Link
                        to={`/interview/${interview.id}/report`}
                        className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-emerald-200/90 bg-emerald-50/90 px-4 py-2 text-xs font-bold text-emerald-800 transition-colors hover:bg-emerald-100 dark:border-emerald-400 dark:bg-emerald-900/40 dark:text-emerald-100 dark:hover:bg-emerald-900/60 sm:flex-none sm:min-w-[7.5rem]"
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {t('report.viewReport')}
                      </Link>
                      <Link
                        to="/setup"
                        className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-primary-200/90 bg-primary-50/90 px-4 py-2 text-xs font-bold text-primary-800 transition-colors hover:bg-primary-100 dark:border-slate-700 dark:bg-slate-800 dark:text-primary-300 dark:hover:bg-slate-700 sm:flex-none sm:min-w-[6.5rem]"
                      >
                        {t('dashboard.again')}
                        <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      </Link>
                      <button
                        type="button"
                        disabled={deletingId === interview.id}
                        onClick={() => requestDeleteInterview(interview.id, interview.position)}
                        className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border-2 border-red-200/90 bg-red-50/80 px-4 py-2 text-xs font-bold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
                      >
                        {deletingId === interview.id ? (
                          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        )}
                        {t('dashboard.delete')}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {interviews.length > 0 ? (
          <div className="relative overflow-hidden rounded-2xl p-[1px] bg-gradient-to-br from-primary-400/50 via-violet-500/40 to-violet-700/50 shadow-glow-primary">
            <div className="relative rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-violet-800 p-6 text-white ring-1 ring-white/10 sm:p-7">
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:40px_40px]" />
              <div className="relative z-[1] flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-lg font-black tracking-tight">{t('dashboard.bannerTitle')}</h3>
                  <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-primary-100/95">{t('dashboard.bannerSub')}</p>
                </div>
                <Link
                  to="/setup"
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-primary-700 shadow-lg ring-1 ring-white/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-50 hover:shadow-xl dark:bg-slate-100 dark:hover:bg-white"
                >
                  {t('dashboard.bannerBtn')}
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {pendingDelete ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center sm:p-6"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity dark:bg-black/70"
            aria-label={t('dashboard.deleteModalCancel')}
            onClick={closeDeleteModal}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-delete-modal-title"
            className="relative z-[1] w-full max-w-[min(100%,26rem)] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_25px_50px_-12px_rgba(15,23,42,0.35)] ring-1 ring-slate-900/[0.06] dark:border-slate-600 dark:bg-slate-900 dark:ring-white/[0.08]"
          >
            <div className="border-b border-red-100 bg-gradient-to-br from-red-50/90 via-white to-orange-50/40 px-5 py-4 dark:border-red-900/30 dark:from-red-950/40 dark:via-slate-900 dark:to-orange-950/20 sm:px-6">
              <div className="flex gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-orange-600 text-white shadow-md shadow-red-500/25">
                  <AlertTriangle className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 pt-0.5">
                  <h2 id="dashboard-delete-modal-title" className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                    {t('dashboard.deleteModalTitle')}
                  </h2>
                  {pendingDelete.position ? (
                    <p
                      className="mt-1 truncate text-sm font-semibold text-slate-600 dark:text-slate-300"
                      title={pendingDelete.position}
                    >
                      {pendingDelete.position}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="px-5 py-4 sm:px-6 sm:py-5">
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{t('dashboard.deleteConfirm')}</p>
              {deleteModalError ? (
                <p
                  className="mt-3 rounded-xl border border-red-200 bg-red-50/90 px-3 py-2.5 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
                  role="alert"
                >
                  {deleteModalError}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-4 dark:border-slate-700 dark:bg-slate-800/50 sm:flex-row sm:justify-end sm:gap-3 sm:px-6">
              <button
                type="button"
                disabled={deletingId === pendingDelete.id}
                onClick={closeDeleteModal}
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 sm:w-auto"
              >
                {t('dashboard.deleteModalCancel')}
              </button>
              <button
                type="button"
                disabled={deletingId === pendingDelete.id}
                onClick={() => void confirmDeleteInterview()}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:from-red-700 hover:to-orange-700 disabled:opacity-50 sm:w-auto"
              >
                {deletingId === pendingDelete.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {t('dashboard.deleteModalConfirm')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
