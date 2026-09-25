import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { getBackendBaseUrl } from '../lib/backendBase'
import {
  ArrowLeft, Briefcase, Globe2, Clock, FileText, Loader2, RefreshCw,
  Sparkles, ListChecks, Target, MessageSquareQuote,
  User, CheckCircle2, AlertTriangle, Lightbulb, Zap, ArrowRight,
  Bookmark, BookmarkCheck, PlayCircle,
  ChevronLeft, ChevronRight, Eye, EyeOff, LayoutList, Layers,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { authenticatedFetch } from '../lib/authenticatedFetch'
import { createInterviewRequestId } from '../lib/interviewEvents'
import { normalizeCjkSpacing } from '../lib/textNormalization'

function normalizeUiCode(code) {
  const c = String(code || '').toLowerCase()
  if (c.startsWith('zh') || c.startsWith('chinese') || c.includes('中文')) return 'zh'
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
            String(x.questionText || x.exactQuestion || '').trim() ||
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
  /* 重点用薰衣草马克笔底 + 近黑字，而不是变色加粗；跨行时靠 box-decoration-clone 保持圆角 */
  const strongCls = strongClassName
    || 'rounded-[3px] bg-brand-glow/40 px-1 py-[2px] font-semibold text-brand-ink [box-decoration-break:clone] [-webkit-box-decoration-break:clone]'
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
      <p className="text-[15px] leading-relaxed text-brand-muted text-brand-muted whitespace-pre-wrap">
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
              className="text-[15px] leading-[1.7] text-brand-muted text-brand-muted whitespace-pre-wrap"
            >
              {b.text}
            </p>
          )
        }
        if (b.type === 'list') {
          return (
            <ul key={idx} className="space-y-2.5 pl-1">
              {b.items.map((item, j) => (
                <li key={j} className="flex gap-3 text-[15px] leading-relaxed text-brand-muted text-brand-muted">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-inset" aria-hidden />
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
              className="rounded-xl border border-brand-line/80 bg-brand-inset/60 px-4 py-3/50/25"
            >
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-brand-ink mb-1.5">
                <MessageSquareQuote className="w-3.5 h-3.5" aria-hidden />
                {t('report.legacyQuestionLabel')}
              </div>
              <p className="text-[15px] font-medium text-brand-ink text-brand-muted leading-relaxed">{b.text || '—'}</p>
            </div>
          )
        }
        if (b.type === 'callout' && b.variant === 'answer') {
          return (
            <div
              key={idx}
              className="rounded-xl border border-brand-line/90 bg-brand-inset/90 px-4 py-3 bg-brand-card/50"
            >
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-brand-muted mb-2">
                <ListChecks className="w-3.5 h-3.5" aria-hidden />
                {t('report.legacyAnswerLabel')}
              </div>
              {b.lead ? (
                <p className="text-[15px] text-brand-ink text-brand-muted leading-relaxed mb-2">{b.lead}</p>
              ) : null}
              {b.rest?.length ? (
                <ul className="space-y-2">
                  {b.rest.map((r, j) =>
                    r.kind === 'li' ? (
                      <li key={j} className="flex gap-2.5 text-[14px] leading-relaxed text-brand-muted text-brand-muted">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand-inset" aria-hidden />
                        <span>{r.text}</span>
                      </li>
                    ) : (
                      <li key={j} className="text-[14px] leading-relaxed text-brand-muted list-none">
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
  const questionIndex = x.questionIndex === null || x.questionIndex === undefined ? NaN : Number(x.questionIndex)
  const questionSummary = String(x.questionSummary || x.question || '').trim()
  const questionText = String(x.questionText || x.exactQuestion || x.interviewerQuestion || '').trim()
  const yourAnswerSummary = normalizeCjkSpacing(String(x.yourAnswerSummary || x.candidateAnswer || x.yourAnswer || '').trim())
  const referenceExample = String(x.referenceExample || x.referenceAnswer || '').trim()
  const gaps = Array.isArray(x.gaps) ? x.gaps.map((g) => String(g || '').trim()).filter(Boolean) : []
  const howToImprove = String(x.howToImprove || x.improvementTip || '').trim()
  if (!questionSummary && !questionText && !yourAnswerSummary && !referenceExample) return null
  return {
    questionIndex: Number.isInteger(questionIndex) ? questionIndex : -1,
    questionSummary,
    questionText,
    yourAnswerSummary,
    referenceExample,
    gaps,
    howToImprove,
  }
}

function interviewerQuestionsFromTranscript(transcript) {
  if (!Array.isArray(transcript)) return []
  return transcript
    .map((message, index) => ({
      index,
      text: message?.role === 'assistant' ? String(message?.content || '').trim() : '',
    }))
    .filter((message) => message.text)
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

/** 收藏／取消收藏某一题。索引优先用 qaReview 的 questionIndex，退化到题卡序号。 */
function CollectButton({ card, fallbackIndex, t, collections, collectionBusy, onToggleCollection }) {
  if (!onToggleCollection) return null
  const idx = Number.isInteger(card?.questionIndex) && card.questionIndex >= 0 ? card.questionIndex : fallbackIndex
  const saved = Boolean(collections?.[idx])
  const busy = collectionBusy === idx
  return (
    <button
      type="button" disabled={busy} onClick={() => onToggleCollection(idx)}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11.5px] font-medium transition-colors disabled:opacity-40 ${
        saved ? 'border-brand-ink bg-brand-card text-brand-ink' : 'border-brand-line bg-brand-card text-brand-muted hover:border-brand-ink hover:text-brand-ink'}`}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
      {t(saved ? 'report.collection.saved' : 'report.collection.save')}
    </button>
  )
}

/**
 * 把「逐题问答与对比」和「完整对话记录」合并成同一套题卡。
 *
 * 两边本来讲的是同一件事：transcript 里面试官的每句提问 + 你随后的回答，
 * 就是 qaReview 里那一条的原始素材。分成两个区块看会来回对照，所以这里合并：
 * 以 transcript 为骨架切分轮次（一条 assistant 开一张卡，之后的 user 全算这一轮的回答），
 * 再把 qaReview 的参考答案/差距/建议和 transcriptLineReview 的逐条点评挂上去。
 * qaReview 里没能对上 transcript 的条目会补在末尾，保证两边的信息一条都不丢。
 */
function buildQaCards(qaReview, transcript, lineReviewByIndex) {
  const cards = []
  const usedQa = new Set()

  const pushCard = (card) => {
    if (!card) return
    const hasContent = card.question || card.yourAnswer || card.referenceExample
      || card.gaps.length || card.howToImprove || card.reviews.length
    if (hasContent) cards.push(card)
  }

  let current = null
  transcript.forEach((message, index) => {
    const content = normalizeCjkSpacing(String(message?.content || '').trim())
    const review = lineReviewByIndex.get(index)
    if (message?.role === 'assistant') {
      pushCard(current)
      current = {
        question: content,
        questionIndex: index,
        yourAnswer: '',
        questionSummary: '',
        referenceExample: '',
        gaps: [],
        howToImprove: '',
        reviews: [],
      }
      return
    }
    if (!current) {
      current = {
        question: '', questionIndex: -1, yourAnswer: '', questionSummary: '',
        referenceExample: '', gaps: [], howToImprove: '', reviews: [],
      }
    }
    current.yourAnswer = current.yourAnswer ? `${current.yourAnswer}\n${content}` : content
    if (review) current.reviews.push(review)
  })
  pushCard(current)

  // 把 qaReview 挂到对应轮次上：优先按 questionIndex 对齐，否则按出现顺序
  cards.forEach((card, order) => {
    let qa = qaReview.find((x, i) => !usedQa.has(i) && x.questionIndex === card.questionIndex)
    if (!qa) qa = qaReview.find((x, i) => !usedQa.has(i) && x.questionIndex < 0 && i === order)
    if (!qa) return
    usedQa.add(qaReview.indexOf(qa))
    card.questionSummary = qa.questionSummary
    card.question = card.question || qa.questionText
    card.yourAnswer = card.yourAnswer || qa.yourAnswerSummary
    card.referenceExample = qa.referenceExample
    card.gaps = qa.gaps
    card.howToImprove = qa.howToImprove
  })

  // 没能对上 transcript 的 qaReview 条目单独补在后面，避免丢内容
  qaReview.forEach((qa, i) => {
    if (usedQa.has(i)) return
    pushCard({
      question: qa.questionText,
      questionIndex: qa.questionIndex,
      questionSummary: qa.questionSummary,
      yourAnswer: qa.yourAnswerSummary,
      referenceExample: qa.referenceExample,
      gaps: qa.gaps,
      howToImprove: qa.howToImprove,
      reviews: [],
    })
  })

  return cards
}

function getCardStudyContent(card) {
  const fallbackReference = card.reviews.find((review) => review.modelAnswer)?.modelAnswer || ''
  const referenceText = card.referenceExample || fallbackReference
  const adviceItems = [
    card.howToImprove,
    ...card.reviews.flatMap((review) => [review.parse, ...(review.improvements || [])]),
  ]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .filter((item, index, items) => {
      const normalized = item.replace(/\s+/g, '').toLowerCase()
      return items.findIndex((candidate) => candidate.replace(/\s+/g, '').toLowerCase() === normalized) === index
    })
  return { referenceText, adviceItems }
}

/** 一张题卡的背面：回答对比 + 差距 + 合并后的改进建议 */
function StudySectionHeading({ icon: Icon, label, tone = 'ink' }) {
  const toneCls = {
    ink: 'bg-brand-inset text-brand-ink',
    success: 'bg-brand-success/10 text-brand-success',
    danger: 'bg-brand-danger/10 text-brand-danger',
    violet: 'bg-brand-violet/10 text-brand-violet',
  }[tone]

  return (
    <div className="flex items-center gap-3">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneCls}`}>
        <Icon className="h-[17px] w-[17px]" />
      </span>
      <h3 className="min-w-0 text-[16px] font-semibold leading-tight text-brand-ink">{label}</h3>
    </div>
  )
}

/** 差距与行动属于同一个反馈闭环，用双栏关系取代两张孤立卡片。 */
function FeedbackPair({ gaps, adviceItems, t, compact = false }) {
  if (gaps.length === 0 && adviceItems.length === 0) return null
  const hasBoth = gaps.length > 0 && adviceItems.length > 0

  return (
    <section className="overflow-hidden rounded-2xl border border-brand-line">
      <div className={`grid ${hasBoth ? 'md:grid-cols-2' : ''}`}>
        {gaps.length > 0 && (
          <div className={`bg-brand-danger/[0.055] ${compact ? 'px-5 py-5' : 'px-5 py-6 sm:px-7 sm:py-7'}`}>
            <StudySectionHeading icon={AlertTriangle} label={t('report.gapsLabel')} tone="danger" />
            <ul className="mt-5 space-y-3.5">
              {gaps.map((gap, index) => (
                <li key={index} className="flex gap-3 text-[15.5px] leading-[1.8] text-brand-ink sm:text-[16px]">
                  <span className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-danger" />
                  <span><RichText text={gap} /></span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {adviceItems.length > 0 && (
          <div className={`relative border-brand-line bg-brand-success/[0.065] ${hasBoth ? 'border-t md:border-l md:border-t-0' : ''} ${compact ? 'px-5 py-5' : 'px-5 py-6 sm:px-7 sm:py-7'}`}>
            {hasBoth && (
              <span className="absolute -left-[17px] top-7 hidden h-8 w-8 items-center justify-center rounded-full border border-brand-line bg-brand-card text-brand-success shadow-sm md:flex" aria-hidden="true">
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
            <StudySectionHeading icon={Lightbulb} label={t('report.improveTipLabel')} tone="success" />
            <ol className="mt-5 space-y-3.5">
              {adviceItems.map((item, index) => (
                <li key={index} className="flex gap-3 text-[15.5px] leading-[1.8] text-brand-ink sm:text-[16px]">
                  <span className="mt-0.5 flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-brand-success/10 px-1.5 text-[11px] font-semibold tabular-nums text-brand-success">{index + 1}</span>
                  <span><RichText text={item} /></span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  )
}

function CardBack({ card, t }) {
  const { referenceText, adviceItems } = getCardStudyContent(card)

  return (
    <div className="space-y-5">
      <div className={`grid overflow-hidden rounded-2xl border border-brand-line bg-brand-line gap-px ${referenceText ? 'md:grid-cols-2' : ''}`}>
        <section className="bg-brand-card px-5 py-6 sm:px-7 sm:py-7">
          <StudySectionHeading icon={User} label={t('report.yourAnswerLabel')} />
          {card.yourAnswer
            ? <p className="mt-5 whitespace-pre-wrap text-[16px] leading-[1.85] text-brand-ink sm:text-[17px]"><RichText text={card.yourAnswer} /></p>
            : <p className="mt-5 text-[16px] leading-relaxed text-brand-muted sm:text-[17px]">{t('report.yourAnswerEmpty')}</p>}
        </section>

        {referenceText && (
          <section className="bg-brand-card px-5 py-6 sm:px-7 sm:py-7">
            <StudySectionHeading icon={CheckCircle2} label={t('report.referenceExampleLabel')} tone="success" />
            <p className="mt-5 whitespace-pre-wrap text-[16px] leading-[1.85] text-brand-ink sm:text-[17px]"><RichText text={referenceText} /></p>
          </section>
        )}
      </div>

      <FeedbackPair gaps={card.gaps} adviceItems={adviceItems} t={t} />
    </div>
  )
}

/**
 * 总览里的一行：左窄列放标签，右宽列放正文。
 * 总览一次要铺开所有题，如果每块都像单题卡那样套「左轨 + 图标 + 淡底框」，
 * 五个块乘以 N 道题就全是横条，读起来很吵。这里改成定义列表式：
 * 只有标签带语义色，正文一律纯黑，块与块之间用一条细横线分隔。
 */
function OverviewRow({ label, tone = 'ink', children }) {
  const markerCls = {
    ink: 'bg-brand-muted',
    success: 'bg-brand-success',
    danger: 'bg-brand-danger',
    violet: 'bg-brand-violet',
  }[tone]
  return (
    <div className="grid gap-3 py-5 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-7">
      <div className="flex items-start gap-2.5 pt-0.5">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${markerCls}`} />
        <span className="pt-0.5 text-[14px] font-semibold leading-snug text-brand-ink">{label}</span>
      </div>
      <div className="min-w-0 text-[16px] leading-[1.75] text-brand-ink">{children}</div>
    </div>
  )
}

/** 逐题复习：单题卡（一次一题、可翻面）与所有题总览两种视图 */
function QaDeck({ cards, mode = 'card', t, collections, collectionBusy, onToggleCollection }) {
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)

  const total = cards.length
  const current = cards[Math.min(index, Math.max(total - 1, 0))]

  const go = (delta) => {
    setIndex((prev) => {
      const next = Math.min(Math.max(prev + delta, 0), total - 1)
      if (next !== prev) setRevealed(false)
      return next
    })
  }

  useEffect(() => {
    if (mode !== 'card') return undefined
    const onKeyDown = (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLButtonElement) return
      if (event.key === 'ArrowLeft') go(-1)
      if (event.key === 'ArrowRight') go(1)
      if (event.code === 'Space') {
        event.preventDefault()
        setRevealed((value) => !value)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mode, total])

  if (total === 0) {
    return (
      <div className="brand-float rounded-[22px] px-6 py-16 text-center text-[13px] text-brand-muted">
        {t('report.deckEmpty')}
      </div>
    )
  }

  return (
    <section>
      {mode === 'card' ? (
        <div className="overflow-hidden rounded-[26px] border border-brand-line bg-brand-card shadow-[0_18px_70px_rgb(24_24_31/0.08)]">
          <div className="h-1.5 bg-brand-inset">
            <motion.div
              className="h-full rounded-r-full bg-brand-violet"
              animate={{ width: `${((index + 1) / total) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <div className="flex items-center justify-between gap-3 border-b border-brand-line px-5 py-4 sm:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <span className="shrink-0 rounded-full bg-brand-inset px-3 py-1 text-[11px] font-semibold text-brand-ink">
                {t('report.qaRound', { n: index + 1 })}
              </span>
              <span className="truncate text-[12px] text-brand-muted">{index + 1} / {total}</span>
            </div>
            <CollectButton card={current} fallbackIndex={index} t={t} collections={collections} collectionBusy={collectionBusy} onToggleCollection={onToggleCollection} />
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {!revealed ? (
              <motion.div
                key={`front-${index}`}
                initial={{ opacity: 0, rotateY: -8, y: 8 }}
                animate={{ opacity: 1, rotateY: 0, y: 0 }}
                exit={{ opacity: 0, rotateY: 8, y: -8 }}
                transition={{ duration: 0.22 }}
                className="relative flex min-h-[480px] flex-col overflow-hidden px-6 py-8 sm:px-10 sm:py-10"
              >
                <div className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full bg-brand-glow/15 blur-3xl" />
                <div className="relative flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted">
                  <MessageSquareQuote className="h-4 w-4 text-brand-violet" />
                  {t('report.qaExactQuestionLabel')}
                </div>
                <div className="relative flex flex-1 items-center justify-center py-10">
                  <div className="max-w-3xl text-center">
                    {current.questionSummary && current.questionSummary !== current.question && (
                      <p className="mb-5 text-[12px] font-medium text-brand-violet">{current.questionSummary}</p>
                    )}
                    <p className="whitespace-pre-wrap font-brand text-[25px] font-semibold leading-[1.42] tracking-[-0.02em] text-brand-ink sm:text-[30px]">
                      {current.question || current.questionSummary || t('report.qaQuestionFallback')}
                    </p>
                    <p className="mx-auto mt-6 max-w-md text-[13px] leading-relaxed text-brand-muted">{t('report.deckSub')}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRevealed(true)}
                  className="relative mx-auto flex min-w-[220px] items-center justify-center gap-2 rounded-xl bg-brand-ink px-6 py-3.5 text-[13.5px] font-semibold text-brand-on-ink transition-all hover:-translate-y-0.5 hover:opacity-90"
                >
                  <Eye className="h-4 w-4" />
                  {t('report.cardReveal')}
                </button>
              </motion.div>
            ) : (
              <motion.div
                key={`back-${index}`}
                initial={{ opacity: 0, rotateY: 8, y: 8 }}
                animate={{ opacity: 1, rotateY: 0, y: 0 }}
                exit={{ opacity: 0, rotateY: -8, y: -8 }}
                transition={{ duration: 0.22 }}
                className="min-h-[480px] px-5 py-6 sm:px-7 sm:py-7"
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-violet">{t('report.qaRound', { n: index + 1 })}</p>
                    <p className="mt-1.5 line-clamp-2 text-[15px] font-semibold leading-snug text-brand-ink">
                      {current.question || current.questionSummary || t('report.qaQuestionFallback')}
                    </p>
                  </div>
                  <button type="button" onClick={() => setRevealed(false)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-brand-line px-3 py-2 text-[11.5px] font-medium text-brand-muted hover:text-brand-ink">
                    <EyeOff className="h-3.5 w-3.5" />{t('report.cardHide')}
                  </button>
                </div>
                <CardBack card={current} t={t} />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between border-t border-brand-line bg-brand-inset/60 px-5 py-4 sm:px-7">
            <button
              type="button" onClick={() => go(-1)} disabled={index === 0}
              className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px] font-medium text-brand-ink hover:bg-brand-card disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />{t('report.cardPrev')}
            </button>
            <div className="hidden items-center gap-1.5 sm:flex" aria-hidden="true">
              {cards.map((_, cardIndex) => (
                <button
                  key={cardIndex} type="button" tabIndex={-1}
                  onClick={() => { setIndex(cardIndex); setRevealed(false) }}
                  className={`h-1.5 rounded-full transition-all ${cardIndex === index ? 'w-6 bg-brand-violet' : 'w-1.5 bg-brand-line hover:bg-brand-muted'}`}
                />
              ))}
            </div>
            <button
              type="button" onClick={() => go(1)} disabled={index >= total - 1}
              className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px] font-medium text-brand-ink hover:bg-brand-card disabled:cursor-not-allowed disabled:opacity-30"
            >
              {t('report.cardNext')}<ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {cards.map((card, i) => {
            const { referenceText, adviceItems } = getCardStudyContent(card)
            return (
            <div key={i} className="brand-float overflow-hidden rounded-[22px]">
              {/* 题头：轮次 + 小结 + 本轮实际问题，问题本身就是最大的一行黑字 */}
              <div className="border-b border-brand-line bg-brand-inset px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="shrink-0 text-[11px] font-medium tabular-nums text-brand-muted">
                    {t('report.qaRound', { n: i + 1 })}
                  </span>
                  {card.questionSummary && (
                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-brand-muted">{card.questionSummary}</span>
                  )}
                  <CollectButton card={card} fallbackIndex={i} t={t} collections={collections} collectionBusy={collectionBusy} onToggleCollection={onToggleCollection} />
                </div>
                <p className="mt-2 whitespace-pre-wrap text-[15.5px] font-semibold leading-snug text-brand-ink">
                  {card.question || card.questionSummary || t('report.qaQuestionFallback')}
                </p>
              </div>

              <div className="divide-y divide-brand-line px-6 py-1">
                <OverviewRow label={t('report.yourAnswerLabel')}>
                  {card.yourAnswer
                    ? <p className="whitespace-pre-wrap"><RichText text={card.yourAnswer} /></p>
                    : <p className="text-brand-muted">{t('report.yourAnswerEmpty')}</p>}
                </OverviewRow>

                {referenceText && (
                  <OverviewRow label={t('report.referenceExampleLabel')} tone="success">
                    <p className="whitespace-pre-wrap"><RichText text={referenceText} /></p>
                  </OverviewRow>
                )}

                {(card.gaps.length > 0 || adviceItems.length > 0) && (
                  <div className="py-5">
                    <FeedbackPair gaps={card.gaps} adviceItems={adviceItems} t={t} compact />
                  </div>
                )}
              </div>
            </div>
          )})}
        </div>
      )}
    </section>
  )
}

function ReportSummaryView({ summary, strengths, toImprove, readiness, readinessDimensions, readinessScore, hasReadinessScore, nextTask, t, collectionBusy, taskError, onStartTask }) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-brand-line bg-brand-card">
      <div className="grid divide-y divide-brand-line lg:grid-cols-[300px_minmax(0,1fr)] lg:divide-x lg:divide-y-0">
        <section className="px-6 py-7 sm:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted">{t('report.readiness.title')}</p>
          <div className="mt-5 flex items-center gap-4">
            <div
              className="relative grid h-[88px] w-[88px] shrink-0 place-items-center rounded-full"
              style={{ background: hasReadinessScore ? `conic-gradient(rgb(var(--brand-violet)) ${readinessScore}%, rgb(var(--brand-line)) ${readinessScore}% 100%)` : 'rgb(var(--brand-line))' }}
            >
              <span className="absolute inset-[7px] rounded-full bg-brand-card" />
              <span className="relative text-[25px] font-semibold tabular-nums text-brand-ink">{hasReadinessScore ? Math.round(readinessScore) : '—'}</span>
            </div>
            <p className="text-[12.5px] leading-relaxed text-brand-muted">{t(`report.readiness.${readiness?.assessment || 'partial'}`)}</p>
          </div>

          {readinessDimensions.length > 0 && (
            <div className="mt-6 space-y-3.5 border-t border-brand-line pt-5">
              {readinessDimensions.map(dimension => (
                <div key={dimension.key} className="flex items-center gap-3">
                  <span className="w-[76px] shrink-0 text-[11.5px] text-brand-ink">{t(`report.readiness.dimensions.${dimension.key}`)}</span>
                  <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-brand-inset"><span className="block h-full rounded-full bg-brand-violet" style={{ width: `${dimension.score ?? 0}%` }} /></span>
                  <span className="w-7 text-right text-[11.5px] font-semibold tabular-nums text-brand-ink">{dimension.score ?? '—'}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="px-6 py-7 sm:px-8">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-brand-ink"><Sparkles className="h-4 w-4 text-brand-violet" />{t('report.sectionSummary')}</div>
          {summary.length > 0 ? (
            <ol className="mt-5 space-y-4">
              {summary.map((item, index) => (
                <li key={index} className="grid grid-cols-[24px_minmax(0,1fr)] gap-3 text-[14px] leading-relaxed text-brand-ink">
                  <span className="pt-0.5 text-[11px] tabular-nums text-brand-muted">{String(index + 1).padStart(2, '0')}</span>
                  <span><RichText text={item} /></span>
                </li>
              ))}
            </ol>
          ) : <p className="mt-4 text-[13px] text-brand-muted">—</p>}
        </section>
      </div>

      <div className="grid divide-y divide-brand-line border-t border-brand-line lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        <section className="px-6 py-7 sm:px-8">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-brand-success"><ListChecks className="h-4 w-4" />{t('report.sectionStrengths')}</div>
          <ul className="mt-4 space-y-3">
            {strengths.map((item, index) => (
              <li key={index} className="flex gap-2.5 text-[13.5px] leading-relaxed text-brand-ink"><CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-brand-success" /><span><RichText text={item} /></span></li>
            ))}
          </ul>
        </section>

        <section className="px-6 py-7 sm:px-8">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-brand-danger"><Target className="h-4 w-4" />{t('report.sectionImprove')}</div>
          <ol className="mt-4 space-y-4">
            {toImprove.map((item, index) => (
              <li key={index} className="grid grid-cols-[24px_minmax(0,1fr)] gap-2.5">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-danger/10 text-[10px] font-semibold text-brand-danger">{index + 1}</span>
                <div><p className="text-[13.5px] font-semibold leading-snug text-brand-ink">{item.title}</p>{item.how && <p className="mt-1.5 text-[12.5px] leading-relaxed text-brand-muted"><RichText text={item.how} /></p>}</div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {nextTask && (
        <section className="border-t border-brand-line bg-brand-inset/60 px-6 py-6 sm:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted"><PlayCircle className="h-3.5 w-3.5" />{t('report.readiness.nextTask')}</p>
              <p className="mt-2 text-[14px] font-semibold text-brand-ink">{nextTask.title || nextTask.questionText}</p>
              {nextTask.reason && <p className="mt-1 text-[12.5px] leading-relaxed text-brand-muted">{nextTask.reason}</p>}
            </div>
            {nextTask.questionIndex !== null && nextTask.questionIndex !== undefined && Number.isInteger(Number(nextTask.questionIndex)) && Number(nextTask.questionIndex) >= 0 && (
              <button type="button" onClick={() => onStartTask?.(nextTask)} disabled={collectionBusy !== null} className="inline-flex min-w-[150px] shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-ink px-5 py-3 text-[12.5px] font-semibold text-brand-on-ink hover:opacity-90 disabled:cursor-wait disabled:opacity-55">
                {collectionBusy !== null ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
                {t('report.readiness.startTask')}
              </button>
            )}
          </div>
          {taskError && (
            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-brand-danger/25 bg-brand-danger/[0.07] px-4 py-3 text-[12.5px] leading-relaxed text-brand-ink sm:flex-row sm:items-center sm:justify-between" role="alert">
              <span>{taskError.message}</span>
              {taskError.code === 'INSUFFICIENT_TOKENS' && <Link to="/profile" className="shrink-0 font-semibold text-brand-danger underline underline-offset-4">{t('common.rechargeNow')}</Link>}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function StructuredReportBody({ report, transcript, lineReviewByIndex, t, collections, collectionBusy, taskError, onToggleCollection, onStartTask }) {
  const [view, setView] = useState('card')
  const transcriptQuestions = interviewerQuestionsFromTranscript(transcript)
  const qaReview = Array.isArray(report?.qaReview)
    ? report.qaReview.map(normalizeQaItem).filter(Boolean).map((item, index) => {
        const indexedQuestion = transcriptQuestions.find((question) => question.index === item.questionIndex)
        return {
          ...item,
          questionText: item.questionText || indexedQuestion?.text || transcriptQuestions[index]?.text || '',
        }
      })
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

  const readiness = report?.careerReadiness && typeof report.careerReadiness === 'object' ? report.careerReadiness : null
  const readinessDimensions = Array.isArray(readiness?.dimensions) ? readiness.dimensions : []
  const nextTask = report?.nextPracticeTask && typeof report.nextPracticeTask === 'object' ? report.nextPracticeTask : null
  const readinessScore = Number(readiness?.overallScore)
  const hasReadinessScore = Number.isFinite(readinessScore) && readinessScore >= 0 && readinessScore <= 100

  const cards = buildQaCards(qaReview, Array.isArray(transcript) ? transcript : [], lineReviewByIndex)
  const views = [
    { key: 'card', label: t('report.tabCards'), icon: Layers },
    { key: 'list', label: t('report.tabOverview'), icon: LayoutList },
    { key: 'summary', label: t('report.summaryAside'), icon: FileText },
  ]

  return (
    <div className="mx-auto max-w-[1080px] space-y-5">
      <div className="flex flex-col gap-4 border-b border-brand-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-brand text-[19px] font-semibold tracking-[-0.01em] text-brand-ink">{view === 'summary' ? t('report.summaryAside') : t('report.deckTitle')}</h2>
          <p className="mt-1.5 max-w-xl text-[12.5px] leading-relaxed text-brand-muted">{view === 'summary' ? t('report.subtitle') : t('report.deckSub')}</p>
        </div>
        <div className="flex w-full shrink-0 gap-1 rounded-xl border border-brand-line bg-brand-inset p-1 sm:w-auto" role="tablist">
          {views.map(({ key, label, icon: Icon }) => (
            <button key={key} type="button" role="tab" aria-selected={view === key} onClick={() => setView(key)} className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors sm:flex-none ${view === key ? 'bg-brand-card text-brand-ink shadow-sm' : 'text-brand-muted hover:text-brand-ink'}`}>
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
          {view === 'summary' ? (
            <ReportSummaryView summary={summary} strengths={strengths} toImprove={toImprove} readiness={readiness} readinessDimensions={readinessDimensions} readinessScore={readinessScore} hasReadinessScore={hasReadinessScore} nextTask={nextTask} t={t} collectionBusy={collectionBusy} taskError={taskError} onStartTask={onStartTask} />
          ) : (
            <QaDeck cards={cards} mode={view} t={t} collections={collections} collectionBusy={collectionBusy} onToggleCollection={onToggleCollection} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default function InterviewReportPage() {
  const { t, i18n } = useTranslation()
  const { interviewId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [interview, setInterview] = useState(null)
  const [retrying, setRetrying] = useState(false)
  const [reportTranslating, setReportTranslating] = useState(false)
  const [collections, setCollections] = useState({})
  const [collectionBusy, setCollectionBusy] = useState(null)
  const [practiceTaskError, setPracticeTaskError] = useState(null)
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
      const collectionResponse = await fetch(`${backendUrl}/api/growth-center/collections?interviewId=${encodeURIComponent(interviewId)}&source=report`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (collectionResponse.ok) {
        const collectionBody = await collectionResponse.json()
        setCollections(Object.fromEntries((collectionBody.collections || []).map(item => [Number(item.question_index), item])))
      }
    } catch {
      setErr(tRef.current('report.loadError'))
    } finally {
      setLoading(false)
    }
  }, [backendUrl, interviewId])

  useEffect(() => { void fetchInterview() }, [fetchInterview])

  const ensureReportCollection = useCallback(async (questionIndex) => {
    const existing = collections[questionIndex]
    if (existing) return existing
    const response = await authenticatedFetch(`${backendUrl}/api/growth-center/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interviewId, questionIndex, source: 'report' }),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok || !body.collection) throw new Error(body.error || 'collection failed')
    setCollections(current => ({ ...current, [Number(body.collection.question_index)]: body.collection }))
    return body.collection
  }, [backendUrl, collections, interviewId])

  const toggleCollection = useCallback(async (questionIndex) => {
    setCollectionBusy(questionIndex)
    setErr(null)
    try {
      const existing = collections[questionIndex]
      if (existing) {
        const response = await authenticatedFetch(`${backendUrl}/api/growth-center/collections/${existing.id}`, { method: 'DELETE' })
        if (!response.ok) throw new Error('delete failed')
        setCollections(current => {
          const next = { ...current }
          delete next[questionIndex]
          return next
        })
      } else await ensureReportCollection(questionIndex)
    } catch { setErr(t('report.collection.failed')) } finally { setCollectionBusy(null) }
  }, [backendUrl, collections, ensureReportCollection, t])

  const startRecommendedTask = useCallback(async (task) => {
    const questionIndex = task?.questionIndex === null || task?.questionIndex === undefined ? NaN : Number(task.questionIndex)
    if (!Number.isInteger(questionIndex) || questionIndex < 0) return
    setCollectionBusy(questionIndex)
    setErr(null)
    setPracticeTaskError(null)
    try {
      const collection = await ensureReportCollection(questionIndex)
      const requestId = createInterviewRequestId()
      const response = await authenticatedFetch(`${backendUrl}/api/growth-center/collections/${collection.id}/practice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Request-Id': requestId },
        body: JSON.stringify({ idempotencyKey: requestId }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok || !body.interviewId) {
        const cause = new Error(body.error || 'practice failed')
        cause.code = body.code || 'PRACTICE_FAILED'
        throw cause
      }
      navigate(`/interview/${body.interviewId}`)
    } catch (cause) {
      const code = cause?.code || 'PRACTICE_FAILED'
      setPracticeTaskError({
        code,
        message: code === 'INSUFFICIENT_TOKENS'
          ? t('common.insufficientTokensDesc', { cost: 300 })
          : t('report.collection.practiceFailed'),
      })
    } finally { setCollectionBusy(null) }
  }, [backendUrl, ensureReportCollection, navigate, t])

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
      if (!token) {
        setErr(t('report.finalizeNoAuth'))
        return
      }
      const res = await fetch(`${backendUrl}/api/interviews/${interviewId}/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages,
          reportUiLanguage: normalizeUiCode(i18n.resolvedLanguage || i18n.language),
          forceRegenerate: true,
        }),
      })
      if (res.status === 202) {
        for (let attempt = 0; attempt < 30; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000))
          const statusRes = await fetch(`${backendUrl}/api/interviews/${interviewId}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!statusRes.ok) continue
          const statusBody = await statusRes.json()
          const nextInterview = statusBody?.interview
          if (nextInterview?.finalize_status === 'completed' && reportJsonHasContent(nextInterview.report_json)) {
            setInterview(nextInterview)
            window.dispatchEvent(new Event('tokensChanged'))
            return
          }
          if (nextInterview?.finalize_status === 'failed') {
            setErr(nextInterview.finalize_last_error || t('report.retryFailed'))
            return
          }
        }
        setErr(t('report.retryFailed'))
        return
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErr(j.hint || j.details || j.error || t('report.retryFailed'))
        return
      }
      const j = await res.json()
      setInterview(j.interview)
      window.dispatchEvent(new Event('tokensChanged'))
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
        <Loader2 className="w-10 h-10 animate-spin text-brand-ink" />
        <span className="text-sm font-medium text-brand-muted">{t('report.loading')}</span>
        <span className="sr-only">{t('report.loading')}</span>
      </div>
    )
  }

  if (err && !interview) {
    return (
      <div className="max-w-lg mx-auto pt-28 pb-24 px-4 text-center">
        <p className="text-brand-danger">{err}</p>
        <Link to="/dashboard" className="btn-primary inline-flex mt-8 px-6 py-3 rounded-xl font-bold">
          {t('report.backDashboard')}
        </Link>
      </div>
    )
  }

  return (
    <div className="theme-quiet min-h-screen bg-brand-paper pb-20 pt-[calc(var(--ui-nav-h)+2rem)]">
      <div className="ui-container max-w-[1400px] space-y-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Link
            to="/dashboard"
            className="group inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-brand-muted hover:text-brand-ink dark:hover:text-white transition-all"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            {t('report.backDashboard')}
          </Link>
        </motion.div>

        {err && <div className="rounded-2xl border border-brand-danger/30 bg-brand-danger/[0.06] p-4 text-sm font-bold text-brand-danger/30 bg-brand-inset" role="alert">{err}</div>}

        <article className="space-y-8">
          <motion.header
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex flex-col justify-between gap-5 border-b border-brand-line pb-6 md:flex-row md:items-end">
              <div className="max-w-2xl">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-ink text-brand-on-ink">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-muted">
                      {t('report.docLabel')}
                    </div>
                    <h1 className="font-brand text-[29px] font-semibold tracking-[-0.025em] text-brand-ink sm:text-[34px]">
                      {t('report.title')}
                    </h1>
                  </div>
                </div>
                <p className="mt-3 text-[13.5px] leading-relaxed text-brand-muted">
                  {t('report.subtitle')}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11.5px] text-brand-muted">
                <div className="flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" />
                  <span className="max-w-[180px] truncate">{interview?.position}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Globe2 className="h-3.5 w-3.5" />
                  <span>{interview?.language}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{interview?.duration} {t('dashboard.durMin')}</span>
                </div>
              </div>
            </div>
          </motion.header>

          <div className="min-h-[400px]">
            {reportTranslating ? (
              <div className="flex flex-col items-center justify-center gap-6 py-24">
                <Loader2 className="h-8 w-8 animate-spin text-brand-ink" />
                <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">
                  {t('report.translating', { lang: t(`profile.langName.${normalizeUiCode(i18n.resolvedLanguage || i18n.language)}`) })}
                </p>
              </div>
            ) : !hasAnyReport ? (
              <div className="text-center py-20 px-8 rounded-[3rem] border-2 border-dashed border-brand-line space-y-8">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-brand-inset">
                  <FileText className="w-10 h-10 text-brand-muted" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-semibold font-brand text-brand-ink dark:text-white">{t('report.noReport')}</h3>
                  <p className="text-sm text-brand-muted max-w-sm mx-auto">{t('report.retryHint')}</p>
                </div>
                {transcript.length > 0 && (
                  <button
                    type="button"
                    disabled={retrying}
                    onClick={() => void finalizeReport()}
                    className="btn-primary px-10 py-4 text-sm font-semibold uppercase tracking-widest group"
                  >
                    {retrying ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />}
                    {retrying ? t('report.retrying') : t('report.retryGenerate')}
                  </button>
                )}
              </div>
            ) : hasStructuredReport ? (
              <StructuredReportBody report={parsedReport} transcript={transcript} lineReviewByIndex={lineReviewByIndex} t={t} collections={collections} collectionBusy={collectionBusy} taskError={practiceTaskError} onToggleCollection={toggleCollection} onStartTask={startRecommendedTask} />
            ) : (
              <div className="space-y-16">
                <div className="p-4 rounded-xl bg-brand-inset border border-brand-line text-[10px] font-semibold uppercase tracking-widest text-brand-muted">
                  {t('report.legacyFormatHint')}
                </div>
                {sections.map((sec, i) => (
                  <section key={`${sec.title}-${i}`} className="space-y-8">
                    {sec.title ? (
                      <div className="flex items-center gap-4">
                        <div className="h-8 w-1.5 rounded-full bg-brand-card dark:bg-white" />
                        <h2 className="text-2xl font-semibold font-brand tracking-tight text-brand-ink dark:text-white">
                          {stripMdNoise(sec.title)}
                        </h2>
                      </div>
                    ) : null}
                    <LegacySectionBody body={sec.body} t={t} />
                  </section>
                ))}
              </div>
            )}

            {/* 结构化报告下，对话记录已并进右侧题卡；旧版 Markdown / 无报告时仍然需要它 */}
            {!reportTranslating && transcript.length > 0 && !hasStructuredReport && (
              <section className="mt-24 pt-24 border-t border-brand-line space-y-12">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-brand-inset bg-brand-card text-brand-muted">
                      <MessageSquareQuote className="w-6 h-6" />
                    </div>
                    <h2 className="text-3xl font-semibold font-brand tracking-tight text-brand-ink dark:text-white">
                      {t('report.transcriptTitle')}
                    </h2>
                  </div>
                  <p className="text-brand-muted max-w-xl font-medium">
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
                            ? 'bg-white border-brand-line shadow-sm'
                            : 'bg-brand-inset/50 border-brand-line md:ml-20'
                        }`}
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <span className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded ${
                            m.role === 'assistant' ? 'bg-brand-inset bg-brand-card text-brand-muted' : 'bg-brand-inset/40 text-brand-ink'
                          }`}>
                            {m.role === 'assistant' ? t('dashboard.roleAssistant') : t('dashboard.roleUser')}
                          </span>
                        </div>
                        <p className="text-sm font-medium leading-relaxed text-brand-muted">
                          {m.content}
                        </p>

                        {coach && (
                          <div className="mt-8 p-6 rounded-2xl bg-brand-inset/50 bg-brand-inset border border-brand-line/50/20 space-y-6">
                            <div className="flex items-center gap-3">
                              <Sparkles className="w-4 h-4 text-brand-success" />
                              <span className="text-[10px] font-semibold uppercase tracking-widest text-brand-success">AI Feedback</span>
                            </div>
                            
                            <div className="grid md:grid-cols-2 gap-8">
                              {coach.parse && (
                                <div className="space-y-2">
                                  <label className="text-[9px] font-semibold uppercase tracking-widest text-brand-muted">Analysis</label>
                                  <p className="text-xs text-brand-muted leading-relaxed italic">
                                    <RichText text={coach.parse} />
                                  </p>
                                </div>
                              )}
                              {coach.improvements?.length > 0 && (
                                <div className="space-y-3">
                                  <label className="text-[9px] font-semibold uppercase tracking-widest text-brand-muted">Points to Note</label>
                                  <ul className="space-y-1.5">
                                    {coach.improvements.map((g, j) => (
                                      <li key={j} className="flex gap-2 text-xs text-brand-success/70/70 font-bold">
                                        <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                        <RichText text={g} />
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                            
                            {coach.modelAnswer && (
                              <div className="pt-4 border-t border-brand-line/50/20 space-y-2">
                                <label className="text-[9px] font-semibold uppercase tracking-widest text-brand-success">Better Expression</label>
                                <p className="text-xs text-brand-muted text-brand-muted leading-relaxed font-bold">
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

        <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-brand-muted">
          End of Interview Report
        </p>
      </div>
    </div>
  )
}
