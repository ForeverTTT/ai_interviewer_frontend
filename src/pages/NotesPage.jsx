import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft, Bookmark, BookmarkCheck, CalendarDays, CheckCircle2,
  ExternalLink, Loader2, MessageSquareText, Pin, PlayCircle,
  RotateCcw, Search, Tag, Trash2,
} from 'lucide-react'
import { getBackendBaseUrl } from '../lib/backendBase'
import { authenticatedFetch } from '../lib/authenticatedFetch'
import { createInterviewRequestId } from '../lib/interviewEvents'

const SOURCE_OPTIONS = ['', 'practice', 'report']
const INTERVIEWER_OPTIONS = ['', 'mixed', 'technical', 'hr']
const REVIEW_OPTIONS = ['', 'to_review', 'reviewed']

function feedbackSummary(collection) {
  const feedback = collection?.feedback_snapshot || {}
  if (typeof feedback === 'string') return feedback
  return feedback.howToImprove
    || feedback.summary
    || feedback.overall
    || (Array.isArray(feedback.gaps) ? feedback.gaps.join(' · ') : '')
    || ''
}

function dayKey(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

export default function NotesPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [query, setQuery] = useState('')
  const [source, setSource] = useState('')
  const [interviewerType, setInterviewerType] = useState('')
  const [reviewStatus, setReviewStatus] = useState('')
  const [position, setPosition] = useState('')
  const [tag, setTag] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [drafts, setDrafts] = useState({})

  useEffect(() => { document.title = `${t('notes.title')} · ${t('meta.title')}` }, [t])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    void authenticatedFetch(`${getBackendBaseUrl()}/api/growth-center/collections?limit=500`)
      .then(async response => {
        if (!response.ok) throw new Error('load failed')
        const body = await response.json()
        if (!cancelled) setCollections(body.collections || [])
      })
      .catch(() => { if (!cancelled) setError(t('notes.loadFailed')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [t])

  const positions = useMemo(() => [...new Set(collections.map(item => item.position).filter(Boolean))].sort(), [collections])
  const tags = useMemo(() => [...new Set(collections.flatMap(item => item.tags || []).filter(Boolean))].sort(), [collections])
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return collections.filter(item => {
      if (source && item.source !== source) return false
      if (interviewerType && item.interviewer_type !== interviewerType) return false
      if (reviewStatus && item.review_status !== reviewStatus) return false
      if (position && item.position !== position) return false
      if (tag && !(item.tags || []).includes(tag)) return false
      const updatedDay = dayKey(item.updated_at)
      if (dateFrom && updatedDay < dateFrom) return false
      if (dateTo && updatedDay > dateTo) return false
      if (!needle) return true
      return [item.question_text, item.answer_text, item.personal_note, item.position, feedbackSummary(item), ...(item.tags || [])]
        .some(value => String(value || '').toLowerCase().includes(needle))
    })
  }, [collections, dateFrom, dateTo, interviewerType, position, query, reviewStatus, source, tag])

  const patchCollection = async (id, patch) => {
    setBusyId(id)
    setError('')
    try {
      const response = await authenticatedFetch(`${getBackendBaseUrl()}/api/growth-center/collections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!response.ok) throw new Error('update failed')
      const body = await response.json()
      setCollections(current => current.map(item => item.id === id ? body.collection : item))
    } catch { setError(t('notes.saveFailed')) } finally { setBusyId(null) }
  }

  const removeCollection = async (id) => {
    setBusyId(id)
    setError('')
    try {
      const response = await authenticatedFetch(`${getBackendBaseUrl()}/api/growth-center/collections/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('delete failed')
      setCollections(current => current.filter(item => item.id !== id))
    } catch { setError(t('notes.deleteFailed')) } finally { setBusyId(null) }
  }

  const practiceAgain = async (id) => {
    setBusyId(id)
    setError('')
    try {
      const response = await authenticatedFetch(`${getBackendBaseUrl()}/api/growth-center/collections/${id}/practice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Request-Id': createInterviewRequestId() },
        body: JSON.stringify({ idempotencyKey: createInterviewRequestId() }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok || !body.interviewId) throw new Error(body.error || 'practice failed')
      navigate(`/interview/${body.interviewId}`)
    } catch { setError(t('notes.practiceFailed')) } finally { setBusyId(null) }
  }

  const resetFilters = () => {
    setQuery(''); setSource(''); setInterviewerType(''); setReviewStatus('')
    setPosition(''); setTag(''); setDateFrom(''); setDateTo('')
  }

  const localeTag = i18n.language === 'de' ? 'de-DE' : i18n.language === 'en' ? 'en-US' : 'zh-CN'

  return (
    <div className="min-h-screen bg-[#f7f6f2] pb-24 pt-28 dark:bg-slate-950">
      <main className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link to="/dashboard" className="mb-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-primary-600"><ArrowLeft className="h-4 w-4" />{t('notes.back')}</Link>
            <div className="section-badge"><Bookmark className="h-4 w-4" />{t('notes.eyebrow')}</div>
            <h1 className="mt-4 font-serif text-4xl font-black text-slate-950 dark:text-white sm:text-5xl">{t('notes.title')}</h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-500 dark:text-slate-300">{t('notes.subtitle')}</p>
          </div>
          <div className="rounded-2xl bg-slate-950 px-6 py-4 text-white dark:bg-white dark:text-slate-950"><span className="text-3xl font-black tabular-nums">{filtered.length}</span><span className="ml-2 text-xs font-bold opacity-60">{t('notes.cards')}</span></div>
        </header>

        <section className="card-premium space-y-4 p-5 sm:p-6" aria-label={t('notes.filters')}>
          <label className="relative block"><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={t('notes.search')} className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm outline-none focus:border-primary-400 dark:border-slate-700 dark:bg-slate-900" /></label>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <select value={position} onChange={event => setPosition(event.target.value)} className="input-field"><option value="">{t('notes.allPositions')}</option>{positions.map(value => <option key={value} value={value}>{value}</option>)}</select>
            <select value={interviewerType} onChange={event => setInterviewerType(event.target.value)} className="input-field">{INTERVIEWER_OPTIONS.map(value => <option key={value || 'all'} value={value}>{t(`notes.interviewer.${value || 'all'}`)}</option>)}</select>
            <select value={source} onChange={event => setSource(event.target.value)} className="input-field">{SOURCE_OPTIONS.map(value => <option key={value || 'all'} value={value}>{t(`notes.source.${value || 'all'}`)}</option>)}</select>
            <select value={reviewStatus} onChange={event => setReviewStatus(event.target.value)} className="input-field">{REVIEW_OPTIONS.map(value => <option key={value || 'all'} value={value}>{t(`notes.review.${value || 'all'}`)}</option>)}</select>
            <select value={tag} onChange={event => setTag(event.target.value)} className="input-field"><option value="">{t('notes.allTags')}</option>{tags.map(value => <option key={value} value={value}>#{value}</option>)}</select>
            <label className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="date" value={dateFrom} onChange={event => setDateFrom(event.target.value)} className="input-field pl-9" aria-label={t('notes.dateFrom')} /></label>
            <label className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="date" value={dateTo} onChange={event => setDateTo(event.target.value)} className="input-field pl-9" aria-label={t('notes.dateTo')} /></label>
            <button type="button" onClick={resetFilters} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-xs font-black text-slate-600 dark:border-slate-700 dark:text-slate-200"><RotateCcw className="h-4 w-4" />{t('notes.reset')}</button>
          </div>
        </section>

        {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
        {loading ? <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div>
          : filtered.length === 0 ? <section className="card-premium flex min-h-64 flex-col items-center justify-center gap-4 p-8 text-center"><Bookmark className="h-10 w-10 text-slate-300" /><h2 className="font-serif text-2xl font-black text-slate-950 dark:text-white">{t('notes.emptyTitle')}</h2><p className="max-w-md text-sm text-slate-500">{t('notes.emptyBody')}</p></section>
            : <section className="grid gap-5 lg:grid-cols-2">{filtered.map(collection => {
              const draft = drafts[collection.id] || { note: collection.personal_note || '', tags: (collection.tags || []).join(', ') }
              const busy = busyId === collection.id
              return <article key={collection.id} className="card-premium flex flex-col gap-6 p-6 sm:p-7">
                <div className="flex items-start justify-between gap-4"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-primary-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary-700 dark:bg-primary-950/30 dark:text-primary-300">{t(`notes.source.${collection.source}`)}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-500 dark:bg-slate-800">{collection.position || t('notes.unknownPosition')}</span>{collection.review_status === 'to_review' && <span className="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-black text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">{t('notes.review.to_review')}</span>}</div><button type="button" disabled={busy} onClick={() => void patchCollection(collection.id, { isPinned: !collection.is_pinned })} className={`rounded-xl p-2 transition ${collection.is_pinned ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/30' : 'text-slate-300 hover:text-amber-500'}`} aria-label={t('notes.pin')}><Pin className="h-5 w-5" fill={collection.is_pinned ? 'currentColor' : 'none'} /></button></div>
                <div><h2 className="text-lg font-black leading-relaxed text-slate-950 dark:text-white">{collection.question_text}</h2><p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-300"><span className="mr-2 font-black text-slate-400">{t('notes.answer')}</span>{collection.answer_text}</p>{feedbackSummary(collection) && <p className="mt-3 rounded-xl bg-indigo-50/60 p-4 text-sm leading-relaxed text-indigo-900 dark:bg-indigo-950/20 dark:text-indigo-200"><span className="mr-2 font-black">{t('notes.feedback')}</span>{feedbackSummary(collection)}</p>}</div>
                <div className="space-y-3"><label className="flex items-center gap-2 text-xs font-black text-slate-500"><MessageSquareText className="h-4 w-4" />{t('notes.personalNote')}</label><textarea rows={3} value={draft.note} onChange={event => setDrafts(current => ({ ...current, [collection.id]: { ...draft, note: event.target.value } }))} placeholder={t('notes.notePlaceholder')} className="w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-primary-400 dark:border-slate-700 dark:bg-slate-900" /><label className="relative block"><Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={draft.tags} onChange={event => setDrafts(current => ({ ...current, [collection.id]: { ...draft, tags: event.target.value } }))} placeholder={t('notes.tagsPlaceholder')} className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-3 text-sm outline-none focus:border-primary-400 dark:border-slate-700 dark:bg-slate-900" /></label><button type="button" disabled={busy} onClick={() => void patchCollection(collection.id, { personalNote: draft.note, tags: draft.tags.split(',').map(value => value.trim()).filter(Boolean) })} className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">{busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : t('notes.save')}</button></div>
                <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-100 pt-5 dark:border-slate-800"><button type="button" disabled={busy} onClick={() => void practiceAgain(collection.id)} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white dark:bg-white dark:text-slate-950"><PlayCircle className="h-4 w-4" />{t('notes.practiceAgain')}</button><button type="button" disabled={busy} onClick={() => void patchCollection(collection.id, { reviewStatus: collection.review_status === 'reviewed' ? 'to_review' : 'reviewed' })} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-600 dark:border-slate-700 dark:text-slate-200">{collection.review_status === 'reviewed' ? <BookmarkCheck className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}{t(collection.review_status === 'reviewed' ? 'notes.markToReview' : 'notes.markReviewed')}</button>{collection.interview_id && <Link to={`/interview/${collection.interview_id}/${collection.source === 'report' ? 'report' : ''}`.replace(/\/$/, '')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-600 dark:border-slate-700 dark:text-slate-200"><ExternalLink className="h-4 w-4" />{t('notes.openOrigin')}</Link>}<button type="button" disabled={busy} onClick={() => void removeCollection(collection.id)} className="ml-auto rounded-xl p-2.5 text-slate-300 hover:bg-red-50 hover:text-red-500" aria-label={t('notes.remove')}><Trash2 className="h-4 w-4" /></button></div>
                <p className="text-[10px] font-bold text-slate-400">{new Date(collection.updated_at).toLocaleDateString(localeTag)}</p>
              </article>
            })}</section>}
      </main>
    </div>
  )
}
