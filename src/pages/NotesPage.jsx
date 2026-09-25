import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft, Bookmark, BookmarkCheck, CalendarDays, CheckCircle2,
  ChevronLeft, ChevronRight, ExternalLink, Eye, EyeOff, Layers, LayoutList,
  Loader2, MessageSquareText, Pin, PlayCircle,
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
  /* 闪卡视图：一次一题、翻面看答案；列表视图保留，否则上面那套筛选没有落点 */
  const [mode, setMode] = useState('card')
  const [cardIndex, setCardIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)

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

  const CARD = 'brand-float rounded-[22px]'
  const EYEBROW = 'text-[11px] font-medium uppercase tracking-[0.16em] text-brand-muted'
  const BTN_INK = 'inline-flex items-center justify-center gap-2 rounded-xl bg-brand-ink px-4 py-2.5 text-[12.5px] font-semibold text-brand-on-ink transition-opacity hover:opacity-90 disabled:opacity-40'
  const BTN_LINE = 'inline-flex items-center justify-center gap-2 rounded-xl border border-brand-line bg-brand-card px-4 py-2.5 text-[12.5px] font-semibold text-brand-ink transition-colors hover:border-brand-ink disabled:opacity-40'
  const FIELD = 'w-full rounded-xl border border-brand-line bg-brand-inset px-4 py-2.5 text-[13px] text-brand-ink transition-colors placeholder:text-brand-muted/70 focus:border-brand-ink focus:outline-none focus:ring-4 focus:ring-brand-ink/10'

  const total = filtered.length
  const current = filtered[Math.min(cardIndex, Math.max(total - 1, 0))] || null
  const goCard = (delta) => {
    setCardIndex(prev => {
      const next = Math.min(Math.max(prev + delta, 0), total - 1)
      if (next !== prev) setRevealed(false)
      return next
    })
  }

  /** 一张卡的元信息条：来源 / 岗位 / 待复习 / 置顶 */
  const CardMeta = ({ collection }) => (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-full border border-brand-line bg-brand-inset px-2.5 py-0.5 text-[10.5px] font-medium text-brand-muted">
          {t(`notes.source.${collection.source}`)}
        </span>
        <span className="rounded-full border border-brand-line bg-brand-inset px-2.5 py-0.5 text-[10.5px] font-medium text-brand-muted">
          {collection.position || t('notes.unknownPosition')}
        </span>
        {collection.review_status === 'to_review' && (
          <span className="rounded-full border border-brand-violet/35 bg-brand-glow/20 px-2.5 py-0.5 text-[10.5px] font-medium text-brand-ink">
            {t('notes.review.to_review')}
          </span>
        )}
      </div>
      <button
        type="button" disabled={busyId === collection.id}
        onClick={() => void patchCollection(collection.id, { isPinned: !collection.is_pinned })}
        className={`shrink-0 rounded-lg border p-2 transition-colors ${collection.is_pinned ? 'border-brand-ink bg-brand-card text-brand-ink' : 'border-brand-line bg-brand-card text-brand-muted hover:border-brand-ink hover:text-brand-ink'}`}
        aria-label={t('notes.pin')} aria-pressed={Boolean(collection.is_pinned)}
      >
        <Pin className="h-3.5 w-3.5" fill={collection.is_pinned ? 'currentColor' : 'none'} />
      </button>
    </div>
  )

  /** 答案 + 反馈：闪卡的「背面」 */
  const CardAnswer = ({ collection }) => (
    <div className="space-y-3">
      <div>
        <p className={EYEBROW}>{t('notes.answer')}</p>
        <p className="mt-1.5 whitespace-pre-wrap text-[13.5px] leading-relaxed text-brand-ink">
          {collection.answer_text || '—'}
        </p>
      </div>
      {feedbackSummary(collection) && (
        <div className="rounded-xl border border-brand-violet/25 bg-brand-violet/[0.05] px-4 py-3">
          <p className="text-[11px] font-medium text-brand-violet">{t('notes.feedback')}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-brand-ink">{feedbackSummary(collection)}</p>
        </div>
      )}
    </div>
  )

  /** 笔记 + 标签 + 保存 */
  const CardNote = ({ collection }) => {
    const draft = drafts[collection.id] || { note: collection.personal_note || '', tags: (collection.tags || []).join(', ') }
    const busy = busyId === collection.id
    return (
      <div className="space-y-2.5">
        <label className={`flex items-center gap-2 ${EYEBROW}`}>
          <MessageSquareText className="h-3.5 w-3.5" />{t('notes.personalNote')}
        </label>
        <textarea
          rows={3} value={draft.note}
          onChange={event => setDrafts(cur => ({ ...cur, [collection.id]: { ...draft, note: event.target.value } }))}
          placeholder={t('notes.notePlaceholder')} className={`${FIELD} resize-y leading-relaxed`}
        />
        <label className="relative block">
          <Tag className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-muted" />
          <input
            value={draft.tags}
            onChange={event => setDrafts(cur => ({ ...cur, [collection.id]: { ...draft, tags: event.target.value } }))}
            placeholder={t('notes.tagsPlaceholder')} className={`${FIELD} pl-9`}
          />
        </label>
        <button
          type="button" disabled={busy}
          onClick={() => void patchCollection(collection.id, { personalNote: draft.note, tags: draft.tags.split(',').map(v => v.trim()).filter(Boolean) })}
          className={BTN_LINE}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t('notes.save')}
        </button>
      </div>
    )
  }

  /** 底部操作条 */
  const CardActions = ({ collection }) => {
    const busy = busyId === collection.id
    return (
      <div className="flex flex-wrap items-center gap-2 border-t border-brand-line pt-4">
        <button type="button" disabled={busy} onClick={() => void practiceAgain(collection.id)} className={BTN_INK}>
          <PlayCircle className="h-3.5 w-3.5" />{t('notes.practiceAgain')}
        </button>
        <button
          type="button" disabled={busy}
          onClick={() => void patchCollection(collection.id, { reviewStatus: collection.review_status === 'reviewed' ? 'to_review' : 'reviewed' })}
          className={BTN_LINE}
        >
          {collection.review_status === 'reviewed' ? <BookmarkCheck className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          {t(collection.review_status === 'reviewed' ? 'notes.markToReview' : 'notes.markReviewed')}
        </button>
        {collection.interview_id && (
          <Link to={`/interview/${collection.interview_id}/${collection.source === 'report' ? 'report' : ''}`.replace(/\/$/, '')} className={BTN_LINE}>
            <ExternalLink className="h-3.5 w-3.5" />{t('notes.openOrigin')}
          </Link>
        )}
        <span className="ml-auto flex items-center gap-2">
          <span className="text-[11px] tabular-nums text-brand-muted">{new Date(collection.updated_at).toLocaleDateString(localeTag)}</span>
          <button
            type="button" disabled={busy} onClick={() => void removeCollection(collection.id)}
            className="rounded-lg p-2 text-brand-muted transition-colors hover:bg-brand-danger/10 hover:text-brand-danger"
            aria-label={t('notes.remove')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>
    )
  }

  return (
    <div className="theme-quiet min-h-screen bg-brand-paper pb-20 pt-[calc(var(--ui-nav-h)+2rem)]">
      <main className="ui-container max-w-[1400px] space-y-5">

        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <Link to="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-brand-muted transition-colors hover:text-brand-ink">
              <ArrowLeft className="h-3.5 w-3.5" />{t('notes.back')}
            </Link>
            <p className={`flex items-center gap-2 ${EYEBROW}`}><Bookmark className="h-3.5 w-3.5" />{t('notes.eyebrow')}</p>
            <h1 className="mt-2 font-brand text-[30px] font-semibold leading-tight tracking-[-0.02em] text-brand-ink sm:text-[34px]">{t('notes.title')}</h1>
            <p className="mt-2.5 max-w-2xl text-[14px] leading-relaxed text-brand-ink">{t('notes.subtitle')}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div className="rounded-xl border border-brand-line bg-brand-card px-4 py-2.5">
              <span className="text-[20px] font-semibold tabular-nums text-brand-ink">{filtered.length}</span>
              <span className="ml-1.5 text-[11.5px] text-brand-muted">{t('notes.cards')}</span>
            </div>
            <div className="flex gap-1 rounded-xl border border-brand-line bg-brand-inset p-1">
              {[{ k: 'card', label: t('notes.cardView'), Icon: Layers }, { k: 'list', label: t('notes.listView'), Icon: LayoutList }].map(m => (
                <button
                  key={m.k} type="button" onClick={() => setMode(m.k)} aria-pressed={mode === m.k}
                  aria-label={m.label}
                  className={`grid h-8 w-9 place-items-center rounded-lg transition-colors ${mode === m.k ? 'bg-brand-card text-brand-ink shadow-sm' : 'text-brand-muted hover:text-brand-ink'}`}
                >
                  <m.Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
        </header>

        <section className={`${CARD} space-y-3 px-5 py-4`} aria-label={t('notes.filters')}>
          <label className="relative block">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
            <input value={query} onChange={event => { setQuery(event.target.value); setCardIndex(0); setRevealed(false) }} placeholder={t('notes.search')} className={`${FIELD} py-3 pl-11`} />
          </label>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            <select value={position} onChange={e => { setPosition(e.target.value); setCardIndex(0) }} className={FIELD}>
              <option value="">{t('notes.allPositions')}</option>
              {positions.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
            <select value={interviewerType} onChange={e => { setInterviewerType(e.target.value); setCardIndex(0) }} className={FIELD}>
              {INTERVIEWER_OPTIONS.map(value => <option key={value || 'all'} value={value}>{t(`notes.interviewer.${value || 'all'}`)}</option>)}
            </select>
            <select value={source} onChange={e => { setSource(e.target.value); setCardIndex(0) }} className={FIELD}>
              {SOURCE_OPTIONS.map(value => <option key={value || 'all'} value={value}>{t(`notes.source.${value || 'all'}`)}</option>)}
            </select>
            <select value={reviewStatus} onChange={e => { setReviewStatus(e.target.value); setCardIndex(0) }} className={FIELD}>
              {REVIEW_OPTIONS.map(value => <option key={value || 'all'} value={value}>{t(`notes.review.${value || 'all'}`)}</option>)}
            </select>
            <select value={tag} onChange={e => { setTag(e.target.value); setCardIndex(0) }} className={FIELD}>
              <option value="">{t('notes.allTags')}</option>
              {tags.map(value => <option key={value} value={value}>#{value}</option>)}
            </select>
            <label className="relative">
              <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-muted" />
              <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setCardIndex(0) }} className={`${FIELD} pl-9`} aria-label={t('notes.dateFrom')} />
            </label>
            <label className="relative">
              <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-muted" />
              <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setCardIndex(0) }} className={`${FIELD} pl-9`} aria-label={t('notes.dateTo')} />
            </label>
            <button type="button" onClick={() => { resetFilters(); setCardIndex(0); setRevealed(false) }} className={BTN_LINE}>
              <RotateCcw className="h-3.5 w-3.5" />{t('notes.reset')}
            </button>
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-brand-danger/30 bg-brand-danger/[0.06] px-4 py-3 text-[13px] font-medium text-brand-danger">{error}</div>
        )}

        {loading ? (
          <div className="flex min-h-60 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-brand-muted" /></div>
        ) : total === 0 ? (
          <section className={`${CARD} flex min-h-60 flex-col items-center justify-center gap-3 px-8 py-10 text-center`}>
            <Bookmark className="h-8 w-8 text-brand-muted" />
            <h2 className="font-brand text-[18px] font-semibold text-brand-ink">{t('notes.emptyTitle')}</h2>
            <p className="max-w-md text-[13px] leading-relaxed text-brand-muted">{t('notes.emptyBody')}</p>
          </section>
        ) : mode === 'card' ? (
          /* ───────── 闪卡：一次一题，翻面看答案 ───────── */
          <section className={`${CARD} overflow-hidden`}>
            <div className="flex items-center justify-between gap-3 border-b border-brand-line bg-brand-inset px-5 py-3.5">
              <CardMeta collection={current} />
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-[12px] tabular-nums text-brand-muted">{cardIndex + 1} / {total}</span>
                <button type="button" onClick={() => goCard(-1)} disabled={cardIndex === 0} aria-label={t('notes.prevCard')}
                  className="grid h-7 w-7 place-items-center rounded-lg border border-brand-line bg-brand-card text-brand-ink transition-colors hover:border-brand-ink disabled:cursor-not-allowed disabled:opacity-35">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => goCard(1)} disabled={cardIndex >= total - 1} aria-label={t('notes.nextCard')}
                  className="grid h-7 w-7 place-items-center rounded-lg border border-brand-line bg-brand-card text-brand-ink transition-colors hover:border-brand-ink disabled:cursor-not-allowed disabled:opacity-35">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-5 px-6 py-6">
              <h2 className="text-[18px] font-semibold leading-relaxed text-brand-ink">{current.question_text}</h2>

              <button type="button" onClick={() => setRevealed(v => !v)} className={`${BTN_INK} w-full py-3`}>
                {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {t(revealed ? 'notes.hide' : 'notes.reveal')}
              </button>

              {revealed && <CardAnswer collection={current} />}
              <CardNote collection={current} />
              <CardActions collection={current} />
            </div>
          </section>
        ) : (
          /* ───────── 列表：全部展开，配合上面的筛选器 ───────── */
          <section className="grid gap-5 lg:grid-cols-2">
            {filtered.map(collection => (
              <article key={collection.id} className={`${CARD} flex flex-col gap-5 px-6 py-5`}>
                <CardMeta collection={collection} />
                <h2 className="text-[16px] font-semibold leading-relaxed text-brand-ink">{collection.question_text}</h2>
                <CardAnswer collection={collection} />
                <CardNote collection={collection} />
                <div className="mt-auto"><CardActions collection={collection} /></div>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  )
}
