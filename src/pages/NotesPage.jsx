import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, Bookmark, BookmarkCheck, CalendarDays, CheckCircle2,
  ChevronLeft, ChevronRight, ExternalLink, Eye, EyeOff, Layers, LayoutList,
  Loader2, MessageSquareText, Pin, PlayCircle,
  RotateCcw, Search, SlidersHorizontal, Tag, Trash2,
} from 'lucide-react'
import { getBackendBaseUrl } from '../lib/backendBase'
import { authenticatedFetch } from '../lib/authenticatedFetch'
import { createInterviewRequestId } from '../lib/interviewEvents'
import './NotesPage.css'

const REVIEW_MENTOR_WRITING = '/brand/flowlab-review-mentor-writing.png'

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
  const studyRef = useRef(null)

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
  const EYEBROW = 'text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-muted'
  const BTN_INK = 'inline-flex items-center justify-center gap-2 rounded-full bg-brand-ink px-4 py-2.5 text-[12.5px] font-semibold text-brand-on-ink transition-all hover:-translate-y-px hover:opacity-95 disabled:opacity-40'
  const BTN_LINE = 'inline-flex items-center justify-center gap-2 rounded-full border border-brand-line bg-brand-card px-4 py-2.5 text-[12.5px] font-semibold text-brand-ink transition-colors hover:border-brand-ink/40 disabled:opacity-40'
  const FIELD = 'w-full rounded-xl border border-brand-line bg-brand-inset px-4 py-2.5 text-[13px] text-brand-ink transition-colors placeholder:text-brand-muted/70 focus:border-brand-ink focus:outline-none focus:ring-4 focus:ring-brand-ink/10'

  const total = filtered.length
  const current = filtered[Math.min(cardIndex, Math.max(total - 1, 0))] || null
  const uiLanguage = i18n.language === 'de' ? 'de' : i18n.language === 'en' ? 'en' : 'zh'
  const localCopy = {
    zh: { openCard: '复习这题', report: '查看本场报告', practice: '返回原练习' },
    en: { openCard: 'Review this card', report: 'View interview report', practice: 'Open original practice' },
    de: { openCard: 'Diese Karte üben', report: 'Interviewbericht öffnen', practice: 'Originalübung öffnen' },
  }[uiLanguage]
  const goCard = (delta) => {
    setCardIndex(prev => {
      const next = Math.min(Math.max(prev + delta, 0), total - 1)
      if (next !== prev) setRevealed(false)
      return next
    })
  }
  const openCard = (index) => {
    setCardIndex(index)
    setRevealed(false)
    setMode('card')
    requestAnimationFrame(() => studyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  /** 一张卡的元信息条：来源 / 岗位 / 待复习 / 置顶 */
  const CardMeta = ({ collection }) => (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-full border border-brand-line bg-brand-inset px-2.5 py-0.5 text-[10.5px] font-medium text-brand-muted">
          {t(`notes.source.${collection.source}`)}
        </span>
        <span className="max-w-[min(55vw,560px)] truncate rounded-full border border-brand-line bg-brand-inset px-2.5 py-0.5 text-[10.5px] font-medium text-brand-muted" title={collection.position || t('notes.unknownPosition')}>
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
            <ExternalLink className="h-3.5 w-3.5" />{collection.source === 'report' ? localCopy.report : localCopy.practice}
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
    <div className="flowlab-notes theme-quiet min-h-screen pb-20 pt-[5.5rem]">
      <main className="ui-container max-w-[1320px] space-y-5">

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="fl-notes-intro"
          aria-label={t('notes.title')}
        >
          <div className="fl-notes-intro-copy">
            <Link to="/dashboard" className="fl-notes-back">
              <ArrowLeft className="h-3.5 w-3.5" />{t('notes.back')}
            </Link>
            <div className="fl-notes-title-row">
              <div>
                <h1>{t('nav.notes')}</h1>
                <p><Bookmark className="h-3.5 w-3.5" />{filtered.length} {t('notes.cards')}</p>
              </div>
              <div className="fl-notes-view-switch" role="group" aria-label={t('notes.title')}>
                {[{ k: 'card', label: t('notes.cardView'), Icon: Layers }, { k: 'list', label: t('notes.listView'), Icon: LayoutList }].map(m => (
                  <button
                    key={m.k} type="button" onClick={() => setMode(m.k)} aria-pressed={mode === m.k}
                    aria-label={m.label} title={m.label}
                  >
                    <m.Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="fl-notes-intro-character">
            <img src={REVIEW_MENTOR_WRITING} alt="复盘学长" />
          </div>
        </motion.section>

        <section className="fl-notes-search" aria-label={t('notes.filters')}>
          <div className="fl-notes-search-row">
            <label className="relative min-w-0 flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
              <input value={query} onChange={event => { setQuery(event.target.value); setCardIndex(0); setRevealed(false) }} placeholder={t('notes.search')} className={`${FIELD} py-3 pl-11`} />
            </label>
            <details className="fl-notes-filter-disclosure">
              <summary>
                <SlidersHorizontal className="h-4 w-4" />
                <span>{t('notes.filters')}</span>
              </summary>
              <div className="fl-notes-filter-popover grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
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
            </details>
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
          <section ref={studyRef} className={`${CARD} fl-notes-study-card scroll-mt-24 overflow-hidden`}>
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

            <div className="fl-notes-study-grid">
              <div className="fl-notes-question-pane">
                {/* 闪卡：正面是题目，揭晓答案时整张卡在 3D 空间里翻到背面 */}
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={current.id}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className="lk-perspective"
                  >
                    <motion.div
                      animate={{ rotateY: revealed ? 180 : 0 }}
                      transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                      style={{ transformStyle: 'preserve-3d' }}
                      className="relative grid"
                    >
                      <div className="fl-notes-question-face flex flex-col justify-center rounded-[20px] border border-brand-line bg-gradient-to-br from-brand-inset to-brand-card px-7 py-8 [backface-visibility:hidden] [grid-area:1/1]">
                        <span className="lk-eyebrow">Q · {cardIndex + 1}</span>
                        <h2 className="mt-4 text-[21px] font-semibold leading-snug tracking-[-0.025em] text-brand-ink sm:text-[24px]">{current.question_text}</h2>
                      </div>
                      <div className="fl-notes-question-face rounded-[20px] border border-brand-ink/15 bg-brand-card px-7 py-7 [backface-visibility:hidden] [grid-area:1/1] [transform:rotateY(180deg)]">
                        <p className="mb-4 line-clamp-2 text-[12.5px] font-medium text-brand-muted">{current.question_text}</p>
                        {revealed && <CardAnswer collection={current} />}
                      </div>
                    </motion.div>
                  </motion.div>
                </AnimatePresence>

                <button type="button" onClick={() => setRevealed(v => !v)} className={`${BTN_INK} w-full py-3`}>
                  {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {t(revealed ? 'notes.hide' : 'notes.reveal')}
                </button>
                <CardActions collection={current} />
              </div>

              <aside className="fl-notes-notebook">
                {CardNote({ collection: current })}
              </aside>
            </div>
          </section>
        ) : (
          /* ───────── 题库目录：只浏览与选择，编辑和练习都进入单卡 ───────── */
          <section ref={studyRef} className="fl-notes-library-list">
            {filtered.map((collection, index) => (
              <article key={collection.id} className="fl-notes-library-row">
                <div className="fl-notes-library-index">{String(index + 1).padStart(2, '0')}</div>
                <button type="button" onClick={() => openCard(index)} className="fl-notes-library-main">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span>{t(`notes.source.${collection.source}`)}</span>
                    <span className="max-w-[420px] truncate" title={collection.position || t('notes.unknownPosition')}>{collection.position || t('notes.unknownPosition')}</span>
                    {collection.review_status === 'to_review' && <span className="is-review">{t('notes.review.to_review')}</span>}
                  </div>
                  <h2>{collection.question_text}</h2>
                  {(collection.tags || []).length > 0 && (
                    <p>{collection.tags.slice(0, 4).map(value => `#${value}`).join('  ')}</p>
                  )}
                </button>
                <div className="fl-notes-library-actions">
                  <button type="button" onClick={() => openCard(index)} className="fl-notes-library-open">
                    <Eye className="h-3.5 w-3.5" />{localCopy.openCard}
                  </button>
                  <button
                    type="button" disabled={busyId === collection.id}
                    onClick={() => void patchCollection(collection.id, { isPinned: !collection.is_pinned })}
                    className={collection.is_pinned ? 'is-pinned' : ''}
                    aria-label={t('notes.pin')}
                  >
                    <Pin className="h-4 w-4" fill={collection.is_pinned ? 'currentColor' : 'none'} />
                  </button>
                  <span>{new Date(collection.updated_at).toLocaleDateString(localeTag)}</span>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  )
}
