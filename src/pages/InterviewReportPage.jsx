import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { getBackendBaseUrl } from '../lib/backendBase'
import {
  ArrowLeft, Briefcase, Globe2, Clock, FileText, Loader2, RefreshCw,
  Sparkles, ListChecks, Target, MessageSquareQuote, GitCompare,
  User, CheckCircle2, AlertTriangle, Lightbulb, Zap, ArrowRight,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

function normalizeUiCode(code) {
  const c = String(code || '').toLowerCase()
  if (c.startsWith('zh')) return 'zh'
  if (c.startsWith('de')) return 'de'
  return 'en'
}


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
function RichText({ text, className, strongClassName }) {
  if (!text) return null
  const parts = String(text).split(/(\*\*[^*\n]+\*\*)/g)
  if (parts.length === 1) return <span className={className}>{text}</span>
  const strongCls = strongClassName || 'font-black text-primary-600 dark:text-primary-400'
  return (
    <span className={className}>
      {parts.map((part, i) => {
        const m = part.match(/^\*\*([^*\n]+)\*\*$/)
        if (m) return <strong key={i} className={strongCls}>{m[1]}</strong>
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
    <div className="space-y-16">
      {/* Bento Grid for Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Core Summary */}
        {summary.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-12 p-8 rounded-[2rem] border border-primary-100/50 dark:border-primary-900/20 bg-gradient-to-br from-white to-primary-50/50 dark:from-slate-900 dark:to-primary-950/20 shadow-sm space-y-8"
          >
            <div className="flex items-center gap-4 text-primary-600 dark:text-primary-400">
              <div className="p-3 rounded-2xl bg-primary-100 dark:bg-primary-900/30">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">
                {t('report.sectionSummary')}
              </h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {summary.map((s, i) => (
                <div key={i} className="group relative p-8 rounded-[2rem] bg-indigo-50/30 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/20 transition-all hover:border-indigo-300 dark:hover:border-indigo-700">
                  <div className="absolute top-6 right-8 text-[40px] font-black text-indigo-500/10 group-hover:text-indigo-500/20 transition-colors leading-none tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed relative z-10">
                    <RichText text={s} />
                  </p>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Strengths & Improvements */}
        <div className="lg:col-span-12 grid md:grid-cols-2 gap-6">
          {strengths.length > 0 && (
            <motion.section
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="p-8 rounded-[2rem] border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/20 dark:bg-emerald-950/10 space-y-8"
            >
              <div className="flex items-center gap-4 text-emerald-600 dark:text-emerald-400">
                <div className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
                  <ListChecks className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-black font-serif tracking-tight uppercase tracking-widest text-xs">
                  {t('report.sectionStrengths')}
                </h2>
              </div>
              <ul className="space-y-4">
                {strengths.map((s, i) => (
                  <li key={i} className="flex gap-4 p-4 rounded-xl bg-white/60 dark:bg-slate-900/40 border border-emerald-50 dark:border-emerald-900/20 text-sm font-medium text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <RichText text={s} />
                  </li>
                ))}
              </ul>
            </motion.section>
          )}

          {toImprove.length > 0 && (
            <motion.section
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="p-8 rounded-[2rem] border border-amber-100 dark:border-amber-900/30 bg-amber-50/20 dark:bg-amber-950/10 space-y-8"
            >
              <div className="flex items-center gap-4 text-amber-600 dark:text-amber-400">
                <div className="p-3 rounded-2xl bg-amber-100 dark:bg-amber-900/30">
                  <Target className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-black font-serif tracking-tight uppercase tracking-widest text-xs">
                  {t('report.sectionImprove')}
                </h2>
              </div>
              <div className="space-y-4">
                {toImprove.map((item, i) => (
                  <div key={i} className="p-5 rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-amber-50 dark:border-amber-900/20 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40 text-[10px] font-black text-amber-600">
                        {i + 1}
                      </span>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.title}</p>
                    </div>
                    {item.how && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pl-9 italic">
                        <RichText text={item.how} />
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </motion.section>
          )}
        </div>
      </div>

      {/* Comparison View */}
      {qaReview.length > 0 && (
        <section className="space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600">
                  <GitCompare className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-black font-serif tracking-tight text-slate-900 dark:text-white">
                  {t('report.sectionQaCompare')}
                </h2>
              </div>
              <p className="text-slate-500 dark:text-slate-400 max-w-2xl font-medium leading-relaxed">
                {t('report.sectionQaCompareSub')}
              </p>
            </div>
          </div>

          <div className="space-y-8">
            {qaReview.map((qa, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="group relative bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden"
              >
                <div className="bg-slate-50 dark:bg-slate-800/50 px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                      {t('report.qaRound', { n: i + 1 })}
                    </span>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white font-serif">
                      {qa.questionSummary || t('report.qaQuestionFallback')}
                    </h3>
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-slate-800">
                  {/* User Answer */}
                  <div className="p-8 space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <User className="w-3 h-3" />
                      {t('report.yourAnswerLabel')}
                    </div>
                    <div className="p-6 rounded-2xl bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-50/50 dark:border-indigo-900/20">
                      <p className="text-[15px] leading-relaxed text-slate-700 dark:text-slate-300 font-medium whitespace-pre-wrap">
                        <RichText text={qa.yourAnswerSummary || '—'} />
                      </p>
                    </div>
                  </div>

                  {/* Reference Answer */}
                  <div className="p-8 space-y-4 bg-emerald-50/[0.02] dark:bg-emerald-950/[0.02]">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600/60">
                      <CheckCircle2 className="w-3 h-3" />
                      {t('report.referenceExampleLabel')}
                    </div>
                    <div className="p-6 rounded-2xl bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-50/50 dark:border-emerald-900/20">
                      <p className="text-[15px] leading-relaxed text-slate-700 dark:text-slate-300 font-medium whitespace-pre-wrap italic">
                        <RichText text={qa.referenceExample || '—'} />
                      </p>
                    </div>
                  </div>
                </div>

                {(qa.gaps.length > 0 || qa.howToImprove) && (
                  <div className="p-8 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
                    <div className="grid md:grid-cols-2 gap-8">
                      {qa.gaps.length > 0 && (
                        <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {t('report.gapsLabel')}
                          </label>
                          <ul className="space-y-2">
                            {qa.gaps.map((g, j) => (
                              <li key={j} className="flex gap-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                <RichText text={g} />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {qa.howToImprove && (
                        <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {t('report.improveTipLabel')}
                          </label>
                          <div className="flex gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
                            <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-bold">
                              <RichText text={qa.howToImprove} />
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
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
  const [reportTranslating, setReportTranslating] = useState(false)
  const finalizeInFlightRef = useRef(false)
  const interviewRef = useRef(null)
  const reportLangRef = useRef('')
  const tRef = useRef(t)
  useEffect(() => {
    tRef.current = t
  }, [t])
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
        setErr(tRef.current('report.finalizeNoAuth'))
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
      reportLangRef.current = normalizeUiCode(j?.interview?.report_ui_locale || j?.interview?.language)
      setInterview(j.interview)
    } catch {
      setErr(tRef.current('report.loadError'))
    } finally {
      setLoading(false)
    }
  }, [backendUrl, interviewId])

  useEffect(() => { void fetchInterview() }, [fetchInterview])

  useEffect(() => {
    const iv = interview
    const baseReport = parseReportJson(iv?.report_json)
    if (!iv || !baseReport || !reportJsonHasContent(baseReport)) return

    const targetUiCode = normalizeUiCode(i18n.resolvedLanguage || i18n.language)
    const currentUiCode = normalizeUiCode(reportLangRef.current || iv?.report_ui_locale || iv?.language)
    if (targetUiCode === currentUiCode) return

    let cancelled = false
    const run = async () => {
      setReportTranslating(true)
      setErr(null)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        if (!token) {
          if (!cancelled) setErr(tRef.current('report.finalizeNoAuth'))
          return
        }
        const res = await fetch(`${backendUrl}/api/interviews/${interviewId}/report/translate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            reportUiLanguage: targetUiCode,
            report: baseReport,
          }),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          if (!cancelled) setErr(j.error || j.details || tRef.current('report.loadError'))
          return
        }
        const j = await res.json()
        if (cancelled) return
        const nextInterview = j?.interview || { ...iv, report_json: j?.report, report_ui_locale: targetUiCode }
        reportLangRef.current = targetUiCode
        setInterview(nextInterview)
      } catch {
        if (!cancelled) setErr(tRef.current('report.loadError'))
      } finally {
        if (!cancelled) setReportTranslating(false)
      }
    }
    void run()
    return () => { cancelled = true }
  }, [backendUrl, i18n.language, i18n.resolvedLanguage, interview, interviewId])

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
        body: JSON.stringify({ messages, reportUiLanguage: normalizeUiCode(i18n.resolvedLanguage || i18n.language) }),
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
  }, [interviewId, backendUrl, i18n.language, i18n.resolvedLanguage, t])


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
    <div className="min-h-screen bg-white dark:bg-slate-950 bg-dot-grid pt-32 pb-24 px-6 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-5xl space-y-12">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Link
            to="/dashboard"
            className="group inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            {t('report.backDashboard')}
          </Link>
        </motion.div>

        <article className="space-y-16">
          <motion.header
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-10"
          >
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-10 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-6 max-w-2xl">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.5rem] bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl shadow-slate-900/10 transition-transform hover:rotate-3">
                    <Zap className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-md bg-primary-100 dark:bg-primary-950 text-[10px] font-black uppercase tracking-widest text-primary-600 dark:text-primary-400">
                      {t('report.docLabel')}
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-black font-serif tracking-tight text-slate-900 dark:text-white">
                      {t('report.title')}
                    </h1>
                  </div>
                </div>
                <p className="text-lg text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  {t('report.subtitle')}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                  <Briefcase className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-[140px]">{interview?.position}</span>
                </div>
                <div className="px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                  <Globe2 className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{interview?.language}</span>
                </div>
                <div className="px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{interview?.duration} {t('dashboard.durMin')}</span>
                </div>
              </div>
            </div>
          </motion.header>

          <div className="min-h-[400px]">
            {reportTranslating ? (
              <div className="flex flex-col items-center justify-center gap-6 py-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {t('report.translating', { lang: t(`profile.langName.${normalizeUiCode(i18n.resolvedLanguage || i18n.language)}`) })}
                </p>
              </div>
            ) : !hasAnyReport ? (
              <div className="text-center py-20 px-8 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800 space-y-8">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-slate-50 dark:bg-slate-900">
                  <FileText className="w-10 h-10 text-slate-300" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black font-serif text-slate-900 dark:text-white">{t('report.noReport')}</h3>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto">{t('report.retryHint')}</p>
                </div>
                {transcript.length > 0 && (
                  <button
                    type="button"
                    disabled={retrying}
                    onClick={() => void finalizeReport()}
                    className="btn-primary px-10 py-4 text-sm font-black uppercase tracking-widest group"
                  >
                    {retrying ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />}
                    {retrying ? t('report.retrying') : t('report.retryGenerate')}
                  </button>
                )}
              </div>
            ) : hasStructuredReport ? (
              <StructuredReportBody report={parsedReport} t={t} />
            ) : (
              <div className="space-y-16">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {t('report.legacyFormatHint')}
                </div>
                {sections.map((sec, i) => (
                  <section key={`${sec.title}-${i}`} className="space-y-8">
                    {sec.title ? (
                      <div className="flex items-center gap-4">
                        <div className="h-8 w-1.5 rounded-full bg-slate-900 dark:bg-white" />
                        <h2 className="text-2xl font-black font-serif tracking-tight text-slate-900 dark:text-white">
                          {stripMdNoise(sec.title)}
                        </h2>
                      </div>
                    ) : null}
                    <LegacySectionBody body={sec.body} t={t} />
                  </section>
                ))}
              </div>
            )}

            {!reportTranslating && transcript.length > 0 && (
              <section className="mt-24 pt-24 border-t border-slate-100 dark:border-slate-800 space-y-12">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      <MessageSquareQuote className="w-6 h-6" />
                    </div>
                    <h2 className="text-3xl font-black font-serif tracking-tight text-slate-900 dark:text-white">
                      {t('report.transcriptTitle')}
                    </h2>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 max-w-xl font-medium">
                    {t('report.transcriptSub')}
                  </p>
                </div>

                <div className="space-y-6">
                  {transcript.map((m, i) => {
                    const coach = lineReviewByIndex.get(i)
                    return (
                      <div
                        key={i}
                        className={`group relative p-8 rounded-[2rem] border transition-all ${
                          m.role === 'assistant'
                            ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 md:ml-20'
                        }`}
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                            m.role === 'assistant' ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' : 'bg-primary-100 dark:bg-primary-900/40 text-primary-600'
                          }`}>
                            {m.role === 'assistant' ? t('dashboard.roleAssistant') : t('dashboard.roleUser')}
                          </span>
                        </div>
                        <p className="text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-300">
                          {m.content}
                        </p>

                        {coach && (
                          <div className="mt-8 p-6 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/20 space-y-6">
                            <div className="flex items-center gap-3">
                              <Sparkles className="w-4 h-4 text-indigo-500" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">AI Feedback</span>
                            </div>
                            
                            <div className="grid md:grid-cols-2 gap-8">
                              {coach.parse && (
                                <div className="space-y-2">
                                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Analysis</label>
                                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
                                    <RichText text={coach.parse} />
                                  </p>
                                </div>
                              )}
                              {coach.improvements?.length > 0 && (
                                <div className="space-y-3">
                                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Points to Note</label>
                                  <ul className="space-y-1.5">
                                    {coach.improvements.map((g, j) => (
                                      <li key={j} className="flex gap-2 text-xs text-indigo-900/70 dark:text-indigo-300/70 font-bold">
                                        <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                        <RichText text={g} />
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                            
                            {coach.modelAnswer && (
                              <div className="pt-4 border-t border-indigo-100/50 dark:border-indigo-900/20 space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Better Expression</label>
                                <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-bold">
                                  <RichText text={coach.modelAnswer} />
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </div>
        </article>

        <p className="text-center text-[10px] font-black uppercase tracking-widest text-slate-300">
          End of Interview Report
        </p>
      </div>
    </div>
  )
}
