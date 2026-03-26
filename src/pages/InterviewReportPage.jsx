import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { getBackendBaseUrl } from '../lib/backendBase'
import {
  ArrowLeft, Briefcase, Globe2, Clock, FileText, Loader2, RefreshCw,
  Sparkles, ListChecks, Target, MessageSquareQuote, GitCompare,
} from 'lucide-react'


function parseReportJson(raw) {
  if (raw == null) return null
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }
  return typeof raw === 'object' ? raw : null
}

function reportJsonHasContent(raw) {
  const o = parseReportJson(raw)
  if (!o) return false
  const sum = Array.isArray(o.summary) ? o.summary.filter((s) => String(s || '').trim()) : []
  const str = Array.isArray(o.strengths) ? o.strengths.filter((s) => String(s || '').trim()) : []
  const imp = Array.isArray(o.toImprove)
    ? o.toImprove.filter((x) => x && (String(x.title || '').trim() || String(x.why || '').trim() || String(x.how || '').trim()))
    : []
  const qa = Array.isArray(o.qaReview)
    ? o.qaReview.filter(
        (x) =>
          x &&
          (String(x.questionSummary || x.question || '').trim() ||
            String(x.yourAnswerSummary || x.candidateAnswer || '').trim() ||
            String(x.referenceExample || x.referenceAnswer || '').trim()),
      )
    : []
  const lineRv = Array.isArray(o.transcriptLineReview)
    ? o.transcriptLineReview.filter((x) => {
        if (!x || typeof x !== 'object') return false
        const p = String(x.parse || x.analysis || '').trim()
        const ma = String(x.modelAnswer || x.referenceAnswer || '').trim()
        const imp = Array.isArray(x.improvements) ? x.improvements.filter((g) => String(g || '').trim()) : []
        return p || ma || imp.length > 0
      })
    : []
  return sum.length + str.length + imp.length + qa.length + lineRv.length > 0
}

function splitMarkdownH2(md) {
  const raw = String(md || '').replace(/^\uFEFF/, '').trim()
  if (!raw) return []
  const chunks = raw.split(/\n(?=## )/)
  return chunks
    .map((c) => {
      const m = c.match(/^##\s+(.+?)\n([\s\S]*)$/m)
      if (m) return { title: m[1].trim(), body: m[2].trim() }
      return { title: '', body: c.trim() }
    })
    .filter((x) => x.title || x.body)
}

/** 渲染含 **粗体** 标记的文本，其余内容原样输出 */
function RichText({ text, className }) {
  if (!text) return null
  const parts = String(text).split(/(\*\*[^*\n]+\*\*)/g)
  if (parts.length === 1) return <span className={className}>{text}</span>
  return (
    <span className={className}>
      {parts.map((part, i) => {
        const m = part.match(/^\*\*([^*\n]+)\*\*$/)
        if (m) return <strong key={i} className="font-semibold text-slate-900 dark:text-white">{m[1]}</strong>
        return part || null
      })}
    </span>
  )
}

/** 旧版 Markdown：去掉加粗、反引号等 */
function stripMdNoise(text) {
  return String(text || '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1$2')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
}

/**
 * 将遗留正文解析为段落 / 列表 / 问答条，避免满屏 * 号
 */
function parseLegacyBodyBlocks(body) {
  const normalized = stripMdNoise(String(body || ''))
    .replace(/^\s*\*\s+/gm, '• ')
    .replace(/^\s*-\s+/gm, '• ')
  const lines = normalized.split('\n')
  const blocks = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()
    if (!trimmed) {
      i++
      continue
    }

    const bullet = trimmed.match(/^[•\-\*]\s+(.+)$/) || trimmed.match(/^\d+\.\s+(.+)$/)
    if (bullet) {
      const items = []
      while (i < lines.length) {
        const t = lines[i].trim()
        const m = t.match(/^[•\-\*]\s+(.+)$/) || t.match(/^\d+\.\s+(.+)$/)
        if (m) {
          items.push(m[1].trim())
          i++
        } else break
      }
      blocks.push({ type: 'list', items })
      continue
    }

    const qEn = trimmed.match(/^Question\s*:\s*(.*)$/i)
    const qZh = trimmed.match(/^问题\s*[:：]\s*(.*)$/)
    if (qEn || qZh) {
      blocks.push({
        type: 'callout',
        variant: 'question',
        text: (qEn?.[1] ?? qZh?.[1] ?? '').trim(),
      })
      i++
      continue
    }

    const rEn = trimmed.match(/^Reference answer\s*:\s*(.*)$/i)
    const rZh = trimmed.match(/^参考答案\s*[:：]\s*(.*)$/) || trimmed.match(/^参考回答\s*[:：]\s*(.*)$/)
    if (rEn || rZh) {
      const first = (rEn?.[1] ?? rZh?.[1] ?? '').trim()
      i++
      const rest = []
      while (i < lines.length) {
        const L = lines[i]
        const tr = L.trim()
        if (!tr) break
        if (/^Question\s*:/i.test(tr) || /^问题\s*[:：]/.test(tr)) break
        if (/^Reference answer\s*:/i.test(tr) || /^参考答案\s*[:：]/.test(tr) || /^参考回答\s*[:：]/.test(tr)) break
        if (/^##\s/.test(tr)) break
        const subBullet = tr.match(/^[•\-\*]\s+(.+)$/) || tr.match(/^\d+\.\s+(.+)$/)
        if (subBullet) {
          rest.push({ kind: 'li', text: subBullet[1].trim() })
        } else {
          rest.push({ kind: 'text', text: tr })
        }
        i++
      }
      blocks.push({ type: 'callout', variant: 'answer', lead: first, rest })
      continue
    }

    const para = []
    while (i < lines.length) {
      const L = lines[i]
      const tr = L.trim()
      if (!tr) break
      if (/^[•\-\*]\s/.test(tr) || /^\d+\.\s/.test(tr)) break
      if (/^Question\s*:/i.test(tr) || /^问题\s*[:：]/.test(tr)) break
      if (/^Reference answer\s*:/i.test(tr) || /^参考答案\s*[:：]/.test(tr)) break
      if (/^##\s/.test(tr)) break
      para.push(L)
      i++
    }
    if (para.length) blocks.push({ type: 'p', text: para.join('\n').trim() })
  }

  return blocks
}

function LegacySectionBody({ body, t }) {
  const blocks = parseLegacyBodyBlocks(body)
  if (!blocks.length) {
    return (
      <p className="text-[15px] leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
        {stripMdNoise(body)}
      </p>
    )
  }

  return (
    <div className="space-y-5">
      {blocks.map((b, idx) => {
        if (b.type === 'p') {
          return (
            <p
              key={idx}
              className="text-[15px] leading-[1.7] text-slate-700 dark:text-slate-200 whitespace-pre-wrap"
            >
              {b.text}
            </p>
          )
        }
        if (b.type === 'list') {
          return (
            <ul key={idx} className="space-y-2.5 pl-1">
              {b.items.map((item, j) => (
                <li key={j} className="flex gap-3 text-[15px] leading-relaxed text-slate-700 dark:text-slate-200">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" aria-hidden />
                  <span className="min-w-0 flex-1">{item}</span>
                </li>
              ))}
            </ul>
          )
        }
        if (b.type === 'callout' && b.variant === 'question') {
          return (
            <div
              key={idx}
              className="rounded-xl border border-primary-200/80 bg-primary-50/60 px-4 py-3 dark:border-primary-900/50 dark:bg-primary-950/25"
            >
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary-700 dark:text-primary-400 mb-1.5">
                <MessageSquareQuote className="w-3.5 h-3.5" aria-hidden />
                {t('report.legacyQuestionLabel')}
              </div>
              <p className="text-[15px] font-medium text-slate-900 dark:text-slate-100 leading-relaxed">{b.text || '—'}</p>
            </div>
          )
        }
        if (b.type === 'callout' && b.variant === 'answer') {
          return (
            <div
              key={idx}
              className="rounded-xl border border-slate-200/90 bg-slate-50/90 px-4 py-3 dark:border-slate-600 dark:bg-slate-800/50"
            >
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-2">
                <ListChecks className="w-3.5 h-3.5" aria-hidden />
                {t('report.legacyAnswerLabel')}
              </div>
              {b.lead ? (
                <p className="text-[15px] text-slate-800 dark:text-slate-100 leading-relaxed mb-2">{b.lead}</p>
              ) : null}
              {b.rest?.length ? (
                <ul className="space-y-2">
                  {b.rest.map((r, j) =>
                    r.kind === 'li' ? (
                      <li key={j} className="flex gap-2.5 text-[14px] leading-relaxed text-slate-700 dark:text-slate-200">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400 dark:bg-slate-500" aria-hidden />
                        <span>{r.text}</span>
                      </li>
                    ) : (
                      <li key={j} className="text-[14px] leading-relaxed text-slate-600 dark:text-slate-300 list-none">
                        {r.text}
                      </li>
                    ),
                  )}
                </ul>
              ) : null}
            </div>
          )
        }
        return null
      })}
    </div>
  )
}

function normalizeQaItem(x) {
  if (!x || typeof x !== 'object') return null
  const questionSummary = String(x.questionSummary || x.question || '').trim()
  const yourAnswerSummary = String(x.yourAnswerSummary || x.candidateAnswer || x.yourAnswer || '').trim()
  const referenceExample = String(x.referenceExample || x.referenceAnswer || '').trim()
  const gaps = Array.isArray(x.gaps) ? x.gaps.map((g) => String(g || '').trim()).filter(Boolean) : []
  const howToImprove = String(x.howToImprove || x.improvementTip || '').trim()
  if (!questionSummary && !yourAnswerSummary && !referenceExample) return null
  return { questionSummary, yourAnswerSummary, referenceExample, gaps, howToImprove }
}

/** 与 transcript 下标对齐的逐条点评（后端 transcriptLineReview） */
function buildTranscriptLineReviewMap(report) {
  const arr = Array.isArray(report?.transcriptLineReview) ? report.transcriptLineReview : []
  const map = new Map()
  for (const x of arr) {
    if (!x || typeof x !== 'object') continue
    const idx = Number(x.index)
    if (!Number.isInteger(idx) || idx < 0) continue
    const parse = String(x.parse || x.analysis || '').trim()
    const improvements = Array.isArray(x.improvements)
      ? x.improvements.map((g) => String(g || '').trim()).filter(Boolean)
      : []
    const modelAnswer = String(x.modelAnswer || x.referenceAnswer || x.standardAnswer || '').trim()
    if (!parse && !improvements.length && !modelAnswer) continue
    map.set(idx, { parse, improvements, modelAnswer })
  }
  return map
}

function StructuredReportBody({ report, t }) {
  const qaReview = Array.isArray(report?.qaReview)
    ? report.qaReview.map(normalizeQaItem).filter(Boolean)
    : []

  const summary = Array.isArray(report?.summary)
    ? report.summary.map((s) => String(s || '').trim()).filter(Boolean)
    : []
  const strengths = Array.isArray(report?.strengths)
    ? report.strengths.map((s) => String(s || '').trim()).filter(Boolean)
    : []
  const toImprove = Array.isArray(report?.toImprove)
    ? report.toImprove
      .map((x) => ({
        title: String(x?.title || '').trim(),
        why: String(x?.why || '').trim(),
        how: String(x?.how || x?.suggestion || x?.action || '').trim(),
      }))
      .filter((x) => x.title || x.why || x.how)
    : []

  return (
    <div className="space-y-12">
      {qaReview.length > 0 && (
        <section>
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-md">
              <GitCompare className="w-5 h-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                {t('report.sectionQaCompare')}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                {t('report.sectionQaCompareSub')}
              </p>
            </div>
          </div>
          <ol className="space-y-8 list-none m-0 p-0">
            {qaReview.map((qa, i) => (
              <li
                key={i}
                className="overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50/40 shadow-sm dark:border-slate-600 dark:bg-slate-800/30"
              >
                <div className="border-b border-slate-200/80 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                  <span className="text-xs font-black text-primary-600 dark:text-primary-400 tabular-nums">
                    {t('report.qaRound', { n: i + 1 })}
                  </span>
                  <h3 className="mt-1 text-[15px] font-bold text-slate-900 dark:text-white leading-snug">
                    {qa.questionSummary || t('report.qaQuestionFallback')}
                  </h3>
                </div>
                <div className="grid gap-0 lg:grid-cols-2 lg:divide-x lg:divide-slate-200/80 dark:lg:divide-slate-700">
                  <div className="p-4 sm:p-5 border-b border-slate-200/70 lg:border-b-0 dark:border-slate-700">
                    <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-primary-700 dark:text-primary-400">
                      {t('report.yourAnswerLabel')}
                    </div>
                    <p className="text-[15px] leading-relaxed text-slate-800 dark:text-slate-100 whitespace-pre-wrap">
                      <RichText text={qa.yourAnswerSummary || '—'} />
                    </p>
                  </div>
                  <div className="p-4 sm:p-5 bg-white/50 dark:bg-slate-900/40">
                    <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-400">
                      {t('report.referenceExampleLabel')}
                    </div>
                    <p className="text-[15px] leading-relaxed text-slate-800 dark:text-slate-100 whitespace-pre-wrap">
                      <RichText text={qa.referenceExample || '—'} />
                    </p>
                  </div>
                </div>
                {(qa.gaps.length > 0 || qa.howToImprove) && (
                  <div className="border-t border-amber-200/60 bg-amber-50/40 px-4 py-4 dark:border-amber-900/35 dark:bg-amber-950/15 sm:px-5">
                    {qa.gaps.length > 0 ? (
                      <>
                        <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-amber-900 dark:text-amber-400">
                          {t('report.gapsLabel')}
                        </div>
                        <ul className="mb-3 space-y-2">
                          {qa.gaps.map((g, j) => (
                            <li key={j} className="flex gap-2 text-[14px] leading-relaxed text-slate-800 dark:text-slate-200">
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
                              <RichText text={g} />
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                    {qa.howToImprove ? (
                      <p className="text-[14px] leading-relaxed text-slate-800 dark:text-slate-200">
                        <span className="font-bold text-amber-900 dark:text-amber-300">{t('report.improveTipLabel')}</span>
                        <RichText text={qa.howToImprove} />
                      </p>
                    ) : null}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {summary.length > 0 && (
        <section className="relative">
          <div className="flex items-center gap-3 mb-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-violet-600 text-white shadow-md">
              <Sparkles className="w-5 h-5" aria-hidden />
            </span>
            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              {t('report.sectionSummary')}
            </h2>
          </div>
          <div className="space-y-3">
            {summary.map((p, i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-200/90 bg-slate-50/80 px-4 py-3.5 text-[15px] leading-relaxed text-slate-800 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-100"
              >
                <span className="mr-2 inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-md bg-primary-600/10 text-xs font-black text-primary-700 dark:bg-primary-500/20 dark:text-primary-300">
                  {i + 1}
                </span>
                <RichText text={p} />
              </div>
            ))}
          </div>
        </section>
      )}

      {strengths.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
              <ListChecks className="w-5 h-5" aria-hidden />
            </span>
            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              {t('report.sectionStrengths')}
            </h2>
          </div>
          <ul className="space-y-3">
            {strengths.map((s, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-xl border border-emerald-200/60 bg-emerald-50/40 px-4 py-3 text-[15px] leading-relaxed text-slate-800 dark:border-emerald-900/35 dark:bg-emerald-950/20 dark:text-slate-100"
              >
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500 shadow-sm" aria-hidden />
                <RichText text={s} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {toImprove.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md">
              <Target className="w-5 h-5" aria-hidden />
            </span>
            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              {t('report.sectionImprove')}
            </h2>
          </div>
          <ol className="space-y-4 list-none m-0 p-0">
            {toImprove.map((item, i) => (
              <li
                key={i}
                className="relative overflow-hidden rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50/50 to-white p-5 dark:border-amber-900/40 dark:from-amber-950/25 dark:to-slate-900/80"
              >
                <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-amber-500 to-orange-500" aria-hidden />
                <div className="pl-3">
                  <div className="mb-3 flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-sm font-black text-white shadow-sm">
                      {i + 1}
                    </span>
                    {item.title ? (
                      <p className="pt-0.5 text-base font-bold text-slate-900 dark:text-white">{item.title}</p>
                    ) : null}
                  </div>
                  {item.why ? (
                    <p className="mb-2 text-[15px] leading-relaxed text-slate-700 dark:text-slate-200">
                      <span className="font-semibold text-amber-800/90 dark:text-amber-400">{t('report.whyLabel')}</span>
                      <RichText text={item.why} />
                    </p>
                  ) : null}
                  {item.how ? (
                    <p className="text-[15px] leading-relaxed text-slate-700 dark:text-slate-200">
                      <span className="font-semibold text-amber-800/90 dark:text-amber-400">{t('report.howLabel')}</span>
                      <RichText text={item.how} />
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}

export default function InterviewReportPage() {
  const { t, i18n } = useTranslation()
  const { interviewId } = useParams()
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [interview, setInterview] = useState(null)
  const [retrying, setRetrying] = useState(false)
  const finalizeInFlightRef = useRef(false)
  const interviewRef = useRef(null)
  useEffect(() => {
    interviewRef.current = interview
  }, [interview])

  const backendUrl = getBackendBaseUrl()

  const fetchInterview = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        setErr(t('report.finalizeNoAuth'))
        setLoading(false)
        return
      }
      const res = await fetch(`${backendUrl}/api/interviews/${interviewId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        if (res.status === 404) setErr(t('report.loadError'))
        else setErr(t('report.loadError'))
        setLoading(false)
        return
      }
      const j = await res.json()
      setInterview(j.interview)
    } catch {
      setErr(t('report.loadError'))
    } finally {
      setLoading(false)
    }
  }, [backendUrl, interviewId, t])

  useEffect(() => { void fetchInterview() }, [fetchInterview])

  const finalizeReport = useCallback(async () => {
    const messages = interviewRef.current?.transcript_json
    if (!Array.isArray(messages) || !messages.length) return
    if (finalizeInFlightRef.current) return
    finalizeInFlightRef.current = true
    setRetrying(true)
    setErr(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) return
      const res = await fetch(`${backendUrl}/api/interviews/${interviewId}/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages, reportUiLanguage: interviewRef.current?.language }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErr(j.hint || j.details || j.error || t('report.retryFailed'))
        return
      }
      const j = await res.json()
      setInterview(j.interview)
    } catch {
      setErr(t('report.finalizeNetwork'))
    } finally {
      finalizeInFlightRef.current = false
      setRetrying(false)
    }
  }, [interviewId, backendUrl, t])


  const transcript = Array.isArray(interview?.transcript_json) ? interview.transcript_json : []
  const hasStructuredReport = reportJsonHasContent(interview?.report_json)
  const legacyMd = String(interview?.report_markdown || '').trim()
  const hasLegacyReport = Boolean(legacyMd)
  const hasAnyReport = hasStructuredReport || hasLegacyReport
  const sections = splitMarkdownH2(legacyMd)
  const parsedReport = parseReportJson(interview?.report_json)
  const lineReviewByIndex = buildTranscriptLineReviewMap(parsedReport)

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-slate-100 to-slate-50 dark:from-slate-950 dark:to-slate-900">
        <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('report.loading')}</span>
        <span className="sr-only">{t('report.loading')}</span>
      </div>
    )
  }

  if (err && !interview) {
    return (
      <div className="max-w-lg mx-auto pt-28 pb-24 px-4 text-center">
        <p className="text-red-600 dark:text-red-400">{err}</p>
        <Link to="/dashboard" className="btn-primary inline-flex mt-8 px-6 py-3 rounded-xl font-bold">
          {t('report.backDashboard')}
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 pt-24 pb-20 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('report.backDashboard')}
        </Link>

        {err && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900/40 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
            {err}
          </div>
        )}

        <article className="mb-8 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_24px_48px_-12px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/[0.04] dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.45)] dark:ring-white/[0.06]">
          <div className="border-b border-slate-100 bg-gradient-to-br from-primary-50/90 via-white to-violet-50/40 px-6 py-6 sm:px-8 sm:py-8 dark:border-slate-800 dark:from-primary-950/30 dark:via-slate-900 dark:to-violet-950/20">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-violet-600 text-white shadow-lg shadow-primary-600/25">
                <FileText className="w-7 h-7" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                  {t('report.docLabel')}
                </p>
                <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  {t('report.title')}
                </h1>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                  {t('report.subtitle')}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-200">
                    <Briefcase className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                    <span className="truncate max-w-[220px] sm:max-w-xs">{interview?.position}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-200">
                    <Globe2 className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                    {interview?.language}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-200">
                    <Clock className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                    {interview?.duration} {t('dashboard.durMin')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-8 sm:px-8 sm:py-10">
            {!hasAnyReport ? (
              <div className="text-center py-6">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                  <FileText className="w-7 h-7 text-slate-400" />
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-2 max-w-md mx-auto">{t('report.noReport')}</p>
                <p className="text-xs text-slate-500 mb-8 max-w-sm mx-auto">{t('report.retryHint')}</p>
                {transcript.length > 0 && (
                  <button
                    type="button"
                    disabled={retrying}
                    onClick={() => void finalizeReport()}
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary-600 text-white font-bold hover:bg-primary-700 disabled:opacity-50 shadow-md"
                  >
                    {retrying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    {retrying ? t('report.retrying') : t('report.retryGenerate')}
                  </button>
                )}
              </div>
            ) : hasStructuredReport ? (
              <StructuredReportBody report={parsedReport} t={t} />
            ) : (
              <div className="space-y-10">
                <div className="rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                  {t('report.legacyFormatHint')}
                </div>
                {sections.map((sec, i) => (
                  <section key={`${sec.title}-${i}`}>
                    {sec.title ? (
                      <h2 className="mb-5 flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white tracking-tight">
                        <span className="h-8 w-1 rounded-full bg-gradient-to-b from-primary-500 to-violet-600" aria-hidden />
                        {stripMdNoise(sec.title)}
                      </h2>
                    ) : null}
                    <LegacySectionBody body={sec.body} t={t} />
                  </section>
                ))}
              </div>
            )}

            {transcript.length > 0 && (
              <div className="mt-10 border-t border-slate-200/90 pt-10 dark:border-slate-800">
                <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                    <MessageSquareQuote className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">{t('report.transcriptTitle')}</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{t('report.transcriptSub')}</p>
                  </div>
                </div>
                <ol className="space-y-5 list-none m-0 p-0">
                  {transcript.map((m, i) => {
                    const coach = lineReviewByIndex.get(i)
                    return (
                      <li
                        key={i}
                        className={`rounded-xl px-4 py-3.5 text-sm border transition-shadow hover:shadow-sm ${
                          m.role === 'assistant'
                            ? 'bg-slate-50/90 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700'
                            : 'bg-primary-50/70 dark:bg-primary-950/25 border-primary-200/60 dark:border-primary-900/40 sm:ml-10'
                        }`}
                      >
                        <div className="flex flex-wrap items-baseline gap-2 mb-1.5">
                          <span className="text-xs font-black text-primary-600 dark:text-primary-400 tabular-nums">
                            {t('report.transcriptIndex', { n: i + 1 })}
                          </span>
                          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {m.role === 'assistant' ? t('report.roleInterviewer') : t('report.roleCandidate')}
                          </span>
                        </div>
                        <p className="text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed text-[15px]">{m.content}</p>
                        {coach ? (
                          <div className="mt-4 space-y-3 border-t border-slate-200/80 pt-4 dark:border-slate-600/80">
                            {coach.parse ? (
                              <div>
                                <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                                  {t('report.lineParse')}
                                </div>
                                <p className="text-[14px] leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                                  <RichText text={coach.parse} />
                                </p>
                              </div>
                            ) : null}
                            {coach.improvements.length > 0 ? (
                              <div>
                                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-400">
                                  {t('report.lineImprovements')}
                                </div>
                                <ul className="space-y-1.5">
                                  {coach.improvements.map((g, j) => (
                                    <li key={j} className="flex gap-2 text-[14px] leading-relaxed text-slate-700 dark:text-slate-200">
                                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
                                      <RichText text={g} />
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                            {coach.modelAnswer ? (
                              <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/50 px-3 py-2.5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                                <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-400">
                                  {t('report.lineModelAnswer')}
                                </div>
                                <p className="text-[14px] leading-relaxed text-slate-800 dark:text-slate-100 whitespace-pre-wrap">
                                  <RichText text={coach.modelAnswer} />
                                </p>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </li>
                    )
                  })}
                </ol>
              </div>
            )}
          </div>
        </article>
      </div>
    </div>
  )
}
