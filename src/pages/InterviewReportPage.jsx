import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { getBackendBaseUrl } from '../lib/backendBase'
import {
  ArrowLeft, Briefcase, Globe2, Clock, FileText, Loader2, RefreshCw,
  Sparkles, ListChecks, Target, MessageSquareQuote,
  User, CheckCircle2, AlertTriangle, Lightbulb, Zap, ArrowRight,
  ChevronLeft, ChevronRight, Eye, EyeOff, LayoutList, Layers,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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
  /* 重点不再靠「变紫 + 加粗」，改成薰衣草马克笔底 + 近黑字：在冷灰页面里更像划重点，
     box-decoration-clone 保证跨行高亮两端都有圆角和内边距 */
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
      <p className="text-[14px] leading-relaxed text-brand-ink whitespace-pre-wrap">
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
              className="text-[14px] leading-[1.7] text-brand-ink whitespace-pre-wrap"
            >
              {b.text}
            </p>
          )
        }
        if (b.type === 'list') {
          return (
            <ul key={idx} className="space-y-2.5 pl-1">
              {b.items.map((item, j) => (
                <li key={j} className="flex gap-3 text-[14px] leading-relaxed text-brand-ink">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-violet" aria-hidden />
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
              className="rounded-xl border border-brand-violet/25 bg-brand-violet/[0.06] px-4 py-3"
            >
              <div className="mb-1.5 flex items-center gap-2 text-[12.5px] font-bold text-brand-violet">
                <MessageSquareQuote className="w-3.5 h-3.5" aria-hidden />
                {t('report.legacyQuestionLabel')}
              </div>
              <p className="text-[14px] font-medium leading-relaxed text-brand-ink">{b.text || '—'}</p>
            </div>
          )
        }
        if (b.type === 'callout' && b.variant === 'answer') {
          return (
            <div
              key={idx}
              className="rounded-xl border border-brand-line bg-brand-inset px-4 py-3"
            >
              <div className="mb-2 flex items-center gap-2 text-[12.5px] font-bold text-brand-muted">
                <ListChecks className="w-3.5 h-3.5" aria-hidden />
                {t('report.legacyAnswerLabel')}
              </div>
              {b.lead ? (
                <p className="mb-2 text-[14px] leading-relaxed text-brand-ink">{b.lead}</p>
              ) : null}
              {b.rest?.length ? (
                <ul className="space-y-2">
                  {b.rest.map((r, j) =>
                    r.kind === 'li' ? (
                      <li key={j} className="flex gap-2.5 text-[13px] leading-relaxed text-brand-ink">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand-muted" aria-hidden />
                        <span>{r.text}</span>
                      </li>
                    ) : (
                      <li key={j} className="list-none text-[13.5px] leading-relaxed text-brand-ink">
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
  const questionIndex = Number(x.questionIndex)
  const questionSummary = String(x.questionSummary || x.question || '').trim()
  const questionText = String(x.questionText || x.exactQuestion || x.interviewerQuestion || '').trim()
  const yourAnswerSummary = String(x.yourAnswerSummary || x.candidateAnswer || x.yourAnswer || '').trim()
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
    const content = String(message?.content || '').trim()
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
      if (review) current.reviews.push(review)
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

/** 小节外壳：左侧总结栏的三张卡共用 */
function AsideSection({ icon: Icon, tone = 'ink', title, children }) {
  const toneCls = {
    ink: 'text-brand-ink',
    success: 'text-brand-success',
    danger: 'text-brand-danger',
  }[tone]
  return (
    <section className="brand-float rounded-[20px] px-5 py-5">
      <div className="mb-4 flex items-center gap-2.5">
        <Icon className={`h-4 w-4 shrink-0 ${toneCls}`} />
        <h2 className="font-brand text-[15px] font-semibold tracking-[-0.01em] text-brand-ink">{title}</h2>
      </div>
      {children}
    </section>
  )
}

/** 题卡正面/背面共用的一块标注内容 */
function CardBlock({ icon: Icon, tone, label, children }) {
  const tones = {
    ink: { rail: 'bg-brand-ink', text: 'text-brand-ink', box: 'border-brand-line bg-brand-inset' },
    violet: { rail: 'bg-brand-violet', text: 'text-brand-violet', box: 'border-brand-violet/25 bg-brand-violet/[0.05]' },
    success: { rail: 'bg-brand-success', text: 'text-brand-success', box: 'border-brand-success/25 bg-brand-success/[0.05]' },
    danger: { rail: 'bg-brand-danger', text: 'text-brand-danger', box: 'border-brand-danger/25 bg-brand-danger/[0.05]' },
  }[tone]
  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-2 text-[11.5px] font-semibold ${tones.text}`}>
        <span className={`h-3 w-[2px] rounded-full ${tones.rail}`} aria-hidden="true" />
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </div>
      <div className={`rounded-xl border px-4 py-3.5 text-[14px] leading-relaxed text-brand-ink ${tones.box}`}>
        {children}
      </div>
    </div>
  )
}

/** 一张题卡的「背面」：参考答案 / 差距 / 建议 / AI 点评 */
function CardBack({ card, t }) {
  return (
    <div className="space-y-4">
      {card.referenceExample && (
        <CardBlock icon={CheckCircle2} tone="success" label={t('report.referenceExampleLabel')}>
          <p className="whitespace-pre-wrap"><RichText text={card.referenceExample} /></p>
        </CardBlock>
      )}

      {card.gaps.length > 0 && (
        <CardBlock icon={AlertTriangle} tone="danger" label={t('report.gapsLabel')}>
          <ul className="space-y-2">
            {card.gaps.map((g, j) => (
              <li key={j} className="flex gap-2.5">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-brand-danger" aria-hidden="true" />
                <span><RichText text={g} /></span>
              </li>
            ))}
          </ul>
        </CardBlock>
      )}

      {card.howToImprove && (
        <CardBlock icon={Lightbulb} tone="violet" label={t('report.improveTipLabel')}>
          <p><RichText text={card.howToImprove} /></p>
        </CardBlock>
      )}

      {/*
        AI 点评只保留「解析」。原来还带「改进点」和「参考标答」，但上面的
        主要差距 / 改进建议 / 标准回答样例已经把这两块讲过一遍了，重复读很累。
        兜底：只有当上面确实没有对应内容时（例如这一轮没有 qaReview，只有逐条点评），
        才把它们补出来，避免信息真的丢掉。
      */}
      {card.reviews.map((review, ri) => {
        const showImprovements = review.improvements?.length > 0
          && card.gaps.length === 0 && !card.howToImprove
        const showModelAnswer = review.modelAnswer && !card.referenceExample
        if (!review.parse && !showImprovements && !showModelAnswer) return null
        return (
          <CardBlock key={ri} icon={Sparkles} tone="violet" label={t('report.aiFeedback')}>
            <div className="space-y-3.5">
              {review.parse && (
                <p className="text-[13.5px] leading-relaxed text-brand-ink">
                  <RichText text={review.parse} />
                </p>
              )}
              {showImprovements && (
                <div className="space-y-1.5">
                  <p className="text-[11.5px] font-semibold text-brand-muted">{t('report.lineImprovements')}</p>
                  <ul className="space-y-1.5">
                    {review.improvements.map((g, j) => (
                      <li key={j} className="flex gap-2 text-[13.5px] text-brand-ink">
                        <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-brand-violet" />
                        <span><RichText text={g} /></span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {showModelAnswer && (
                <div className="space-y-1 border-t border-brand-violet/20 pt-3">
                  <p className="text-[11.5px] font-semibold text-brand-success">{t('report.lineModelAnswer')}</p>
                  <p className="text-[13.5px] text-brand-ink"><RichText text={review.modelAnswer} /></p>
                </div>
              )}
            </div>
          </CardBlock>
        )
      })}
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
  const labelCls = {
    ink: 'text-brand-muted',
    success: 'text-brand-success',
    danger: 'text-brand-danger',
    violet: 'text-brand-violet',
  }[tone]
  return (
    <div className="grid gap-1.5 py-4 sm:grid-cols-[128px_minmax(0,1fr)] sm:gap-6">
      <div className={`pt-[3px] text-[12px] font-medium leading-snug ${labelCls}`}>{label}</div>
      <div className="min-w-0 text-[14px] leading-relaxed text-brand-ink">{children}</div>
    </div>
  )
}

/** 逐题复习：单题卡（一次一题、可翻面）与所有题总览两种视图 */
function QaDeck({ cards, t }) {
  const [mode, setMode] = useState('card')
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

  if (total === 0) {
    return (
      <div className="brand-float rounded-[22px] px-6 py-16 text-center text-[13px] text-brand-muted">
        {t('report.deckEmpty')}
      </div>
    )
  }

  const modes = [
    { key: 'card', label: t('report.tabCards'), icon: Layers },
    { key: 'list', label: t('report.tabOverview'), icon: LayoutList },
  ]

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-brand text-[18px] font-semibold tracking-[-0.01em] text-brand-ink">
            {t('report.deckTitle')}
          </h2>
          <p className="mt-1.5 max-w-xl text-[12.5px] leading-relaxed text-brand-muted">
            {t('report.deckSub')}
          </p>
        </div>
        <div className="flex shrink-0 gap-1 rounded-xl border border-brand-line bg-brand-inset p-1">
          {modes.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              aria-pressed={mode === m.key}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                mode === m.key ? 'bg-brand-card text-brand-ink shadow-sm' : 'text-brand-muted hover:text-brand-ink'
              }`}
            >
              <m.icon className="h-3.5 w-3.5" />
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'card' ? (
        <div className="brand-float overflow-hidden rounded-[22px]">
          {/* 卡头：轮次 + 进度 + 前后翻页 */}
          <div className="flex items-center justify-between gap-3 border-b border-brand-line bg-brand-inset px-5 py-3.5">
            <span className="shrink-0 rounded-full border border-brand-line bg-brand-card px-2.5 py-1 text-[11px] font-medium text-brand-ink">
              {t('report.qaRound', { n: index + 1 })}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[12px] tabular-nums text-brand-muted">{index + 1} / {total}</span>
              <button
                type="button"
                onClick={() => go(-1)}
                disabled={index === 0}
                aria-label={t('report.cardPrev')}
                className="grid h-7 w-7 place-items-center rounded-lg border border-brand-line bg-brand-card text-brand-ink transition-colors hover:border-brand-ink disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                disabled={index >= total - 1}
                aria-label={t('report.cardNext')}
                className="grid h-7 w-7 place-items-center rounded-lg border border-brand-line bg-brand-card text-brand-ink transition-colors hover:border-brand-ink disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="space-y-5 px-5 py-5">
            {/* 正面：问题 + 你的回答 */}
            <CardBlock icon={MessageSquareQuote} tone="ink" label={t('report.qaExactQuestionLabel')}>
              <p className="whitespace-pre-wrap font-semibold">
                {current.question || current.questionSummary || t('report.qaQuestionFallback')}
              </p>
            </CardBlock>

            <CardBlock icon={User} tone="ink" label={t('report.yourAnswerLabel')}>
              {current.yourAnswer
                ? <p className="whitespace-pre-wrap"><RichText text={current.yourAnswer} /></p>
                : <p className="text-brand-muted">{t('report.yourAnswerEmpty')}</p>}
            </CardBlock>

            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-ink px-5 py-3 text-[13.5px] font-semibold text-brand-on-ink transition-opacity hover:opacity-90"
            >
              {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {revealed ? t('report.cardHide') : t('report.cardReveal')}
            </button>

            <AnimatePresence initial={false}>
              {revealed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="pt-1"><CardBack card={current} t={t} /></div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {cards.map((card, i) => (
            <div key={i} className="brand-float overflow-hidden rounded-[22px]">
              {/* 题头：轮次 + 小结 + 本轮实际问题，问题本身就是最大的一行黑字 */}
              <div className="border-b border-brand-line bg-brand-inset px-6 py-4">
                <div className="flex items-baseline gap-3">
                  <span className="shrink-0 text-[11px] font-medium tabular-nums text-brand-muted">
                    {t('report.qaRound', { n: i + 1 })}
                  </span>
                  {card.questionSummary && (
                    <span className="truncate text-[12.5px] text-brand-muted">{card.questionSummary}</span>
                  )}
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

                {card.referenceExample && (
                  <OverviewRow label={t('report.referenceExampleLabel')} tone="success">
                    <p className="whitespace-pre-wrap"><RichText text={card.referenceExample} /></p>
                  </OverviewRow>
                )}

                {card.gaps.length > 0 && (
                  <OverviewRow label={t('report.gapsLabel')} tone="danger">
                    <ul className="space-y-1.5">
                      {card.gaps.map((g, j) => (
                        <li key={j} className="flex gap-2.5">
                          <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-brand-danger" aria-hidden="true" />
                          <span><RichText text={g} /></span>
                        </li>
                      ))}
                    </ul>
                  </OverviewRow>
                )}

                {card.howToImprove && (
                  <OverviewRow label={t('report.improveTipLabel')} tone="violet">
                    <p><RichText text={card.howToImprove} /></p>
                  </OverviewRow>
                )}

                {card.reviews.map((review, ri) => {
                  const showImprovements = review.improvements?.length > 0
                    && card.gaps.length === 0 && !card.howToImprove
                  const showModelAnswer = review.modelAnswer && !card.referenceExample
                  if (!review.parse && !showImprovements && !showModelAnswer) return null
                  return (
                    <OverviewRow key={ri} label={t('report.aiFeedback')} tone="violet">
                      <div className="space-y-2.5">
                        {review.parse && <p><RichText text={review.parse} /></p>}
                        {showImprovements && (
                          <ul className="space-y-1.5">
                            {review.improvements.map((g, j) => (
                              <li key={j} className="flex gap-2">
                                <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-brand-violet" />
                                <span><RichText text={g} /></span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {showModelAnswer && <p><RichText text={review.modelAnswer} /></p>}
                      </div>
                    </OverviewRow>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function StructuredReportBody({ report, transcript, lineReviewByIndex, t }) {
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

  const cards = buildQaCards(qaReview, Array.isArray(transcript) ? transcript : [], lineReviewByIndex)

  return (
    <div className="grid gap-5 lg:grid-cols-12">

      {/* ── 左栏：整份报告的总结，长页面滚动时吸顶 ── */}
      <aside className="space-y-4 lg:col-span-4 lg:sticky lg:top-[calc(var(--ui-nav-h)+1.5rem)] lg:self-start lg:max-h-[calc(100dvh-var(--ui-nav-h)-3rem)] lg:overflow-y-auto lg:pr-1 custom-scrollbar">
        {summary.length > 0 && (
          <AsideSection icon={Sparkles} tone="ink" title={t('report.sectionSummary')}>
            <ul className="space-y-2.5">
              {summary.map((item, i) => (
                <li key={i} className="flex gap-3 text-[14px] leading-relaxed text-brand-ink">
                  <span className="shrink-0 text-[11px] font-medium tabular-nums text-brand-muted">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span><RichText text={item} /></span>
                </li>
              ))}
            </ul>
          </AsideSection>
        )}

        {strengths.length > 0 && (
          <AsideSection icon={ListChecks} tone="success" title={t('report.sectionStrengths')}>
            <ul className="space-y-2.5">
              {strengths.map((item, i) => (
                <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed text-brand-ink">
                  <CheckCircle2 className="mt-[3px] h-3.5 w-3.5 shrink-0 text-brand-success" />
                  <span><RichText text={item} /></span>
                </li>
              ))}
            </ul>
          </AsideSection>
        )}

        {toImprove.length > 0 && (
          <AsideSection icon={Target} tone="danger" title={t('report.sectionImprove')}>
            <ol className="space-y-3.5">
              {toImprove.map((item, i) => (
                <li key={i} className="border-l-2 border-brand-danger/40 pl-3.5">
                  <p className="text-[13.5px] font-semibold leading-snug text-brand-ink">{item.title}</p>
                  {item.why && (
                    <p className="mt-1.5 text-[13px] leading-relaxed text-brand-ink">
                      <span className="text-brand-muted">{t('report.whyLabel')}</span>
                      <RichText text={item.why} />
                    </p>
                  )}
                  {item.how && (
                    <p className="mt-1 text-[13px] leading-relaxed text-brand-ink">
                      <span className="text-brand-muted">{t('report.howLabel')}</span>
                      <RichText text={item.how} />
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </AsideSection>
        )}
      </aside>

      {/* ── 右栏：逐题复习（单题卡 / 所有题总览）── */}
      <div className="min-w-0 lg:col-span-8">
        <QaDeck cards={cards} t={t} />
      </div>
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
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-brand-paper">
        <Loader2 className="w-8 h-8 animate-spin text-brand-violet" />
        <span className="text-[13px] font-medium text-brand-muted">{t('report.loading')}</span>
        <span className="sr-only">{t('report.loading')}</span>
      </div>
    )
  }

  if (err && !interview) {
    return (
      <div className="ui-container min-h-screen max-w-lg bg-brand-paper pb-24 pt-[calc(var(--ui-nav-h)+2rem)] text-center">
        <p className="text-[14px] text-brand-danger">{err}</p>
        <Link to="/dashboard" className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-ink px-6 py-3 text-[14px] font-semibold text-brand-on-ink transition-opacity duration-200 hover:opacity-90">
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
            className="group inline-flex items-center gap-2 text-[12.5px] font-bold text-brand-muted transition-colors hover:text-brand-ink"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            {t('report.backDashboard')}
          </Link>
        </motion.div>

        <article className="space-y-10">
          <motion.header
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-brand-line">
              <div className="space-y-3 max-w-2xl">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-brand-ink text-brand-on-ink">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 rounded-md border border-brand-line bg-brand-inset px-2 py-0.5 text-[11px] font-medium text-brand-muted">
                      {t('report.docLabel')}
                    </div>
                    <h1 className="font-brand text-[28px] font-semibold leading-tight tracking-[-0.02em] text-brand-ink sm:text-[32px]">
                      {t('report.title')}
                    </h1>
                  </div>
                </div>
                <p className="text-[14px] leading-relaxed text-brand-ink">
                  {t('report.subtitle')}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2.5 rounded-xl border border-brand-line bg-brand-card px-3.5 py-2">
                  <Briefcase className="w-4 h-4 text-brand-muted" />
                  <span className="max-w-[140px] truncate text-[12.5px] font-bold text-brand-ink">{interview?.position}</span>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl border border-brand-line bg-brand-card px-3.5 py-2">
                  <Globe2 className="w-4 h-4 text-brand-muted" />
                  <span className="text-[12.5px] font-bold text-brand-ink">{interview?.language}</span>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl border border-brand-line bg-brand-card px-3.5 py-2">
                  <Clock className="w-4 h-4 text-brand-muted" />
                  <span className="text-[12.5px] font-bold text-brand-ink">{interview?.duration} {t('dashboard.durMin')}</span>
                </div>
              </div>
            </div>
          </motion.header>

          <div className="min-h-[400px]">
            {reportTranslating ? (
              <div className="flex flex-col items-center justify-center gap-6 py-24">
                <Loader2 className="h-7 w-7 animate-spin text-brand-violet" />
                <p className="text-[12.5px] font-bold text-brand-muted">
                  {t('report.translating', { lang: t(`profile.langName.${normalizeUiCode(i18n.resolvedLanguage || i18n.language)}`) })}
                </p>
              </div>
            ) : !hasAnyReport ? (
              <div className="space-y-6 rounded-[22px] border border-dashed border-brand-line bg-brand-card px-8 py-16 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] bg-brand-inset">
                  <FileText className="w-7 h-7 text-brand-muted" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-brand text-[20px] font-semibold tracking-tight text-brand-ink">{t('report.noReport')}</h3>
                  <p className="mx-auto max-w-sm text-[13px] text-brand-ink">{t('report.retryHint')}</p>
                </div>
                {transcript.length > 0 && (
                  <button
                    type="button"
                    disabled={retrying}
                    onClick={() => void finalizeReport()}
                    className="group inline-flex items-center justify-center gap-2 rounded-xl bg-brand-ink px-8 py-3.5 text-[14px] font-semibold text-brand-on-ink transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {retrying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />}
                    {retrying ? t('report.retrying') : t('report.retryGenerate')}
                  </button>
                )}
              </div>
            ) : hasStructuredReport ? (
              <StructuredReportBody report={parsedReport} transcript={transcript} lineReviewByIndex={lineReviewByIndex} t={t} />
            ) : (
              <div className="space-y-10">
                <div className="rounded-xl border border-brand-line bg-brand-inset px-4 py-3 text-[12.5px] font-bold text-brand-muted">
                  {t('report.legacyFormatHint')}
                </div>
                {sections.map((sec, i) => (
                  <section key={`${sec.title}-${i}`} className="space-y-4">
                    {sec.title ? (
                      <div className="flex items-center gap-3">
                        <div className="h-7 w-1.5 rounded-full bg-brand-ink" />
                        <h2 className="font-brand text-[18px] font-semibold tracking-tight text-brand-ink">
                          {stripMdNoise(sec.title)}
                        </h2>
                      </div>
                    ) : null}
                    <LegacySectionBody body={sec.body} t={t} />
                  </section>
                ))}
              </div>
            )}

            {/* 结构化报告下，对话记录已经并进右侧题卡，不再重复渲染一遍；
                旧版 Markdown 报告和「没有报告」的情况仍然需要它 */}
            {!reportTranslating && transcript.length > 0 && !hasStructuredReport && (
              <section className="mt-14 space-y-6 border-t border-brand-line pt-12">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-inset text-brand-ink">
                      <MessageSquareQuote className="w-5 h-5" />
                    </div>
                    <h2 className="font-brand text-[22px] font-semibold tracking-tight text-brand-ink">
                      {t('report.transcriptTitle')}
                    </h2>
                  </div>
                  <p className="max-w-xl text-[13px] text-brand-muted">
                    {t('report.transcriptSub')}
                  </p>
                </div>

                <div className="space-y-4">
                  {transcript.map((m, i) => {
                    const coach = lineReviewByIndex.get(i)
                    return (
                      <div
                        key={i}
                        className={`group relative rounded-[20px] border border-brand-line px-5 py-5 transition-colors ${
                          m.role === 'assistant'
                            ? 'bg-brand-card'
                            : 'bg-brand-inset md:ml-16'
                        }`}
                      >
                        <div className="mb-3 flex items-center gap-3">
                          <span className="text-[11px] font-bold tabular-nums text-brand-muted">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                            m.role === 'assistant' ? 'bg-brand-inset text-brand-muted' : 'bg-brand-violet/10 text-brand-violet'
                          }`}>
                            {m.role === 'assistant' ? t('dashboard.roleAssistant') : t('dashboard.roleUser')}
                          </span>
                        </div>
                        <p className="text-[13.5px] font-medium leading-relaxed text-brand-ink">
                          {m.content}
                        </p>

                        {coach && (
                          <div className="mt-5 space-y-4 rounded-xl border border-brand-violet/25 bg-brand-violet/[0.06] px-4 py-4">
                            <div className="flex items-center gap-2.5">
                              <Sparkles className="w-3.5 h-3.5 text-brand-violet" />
                              <span className="text-[12px] font-bold text-brand-violet">AI Feedback</span>
                            </div>
                            
                            <div className="grid md:grid-cols-2 gap-5">
                              {coach.parse && (
                                <div className="space-y-2">
                                  <label className="text-[11.5px] font-bold text-brand-muted">Analysis</label>
                                  <p className="text-[13px] leading-relaxed text-brand-ink">
                                    <RichText text={coach.parse} />
                                  </p>
                                </div>
                              )}
                              {coach.improvements?.length > 0 && (
                                <div className="space-y-3">
                                  <label className="text-[11.5px] font-bold text-brand-muted">Points to Note</label>
                                  <ul className="space-y-1.5">
                                    {coach.improvements.map((g, j) => (
                                      <li key={j} className="flex gap-2 text-[12.5px] font-bold text-brand-ink">
                                        <ArrowRight className="mt-0.5 w-3.5 h-3.5 shrink-0 text-brand-violet" />
                                        <RichText text={g} />
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                            
                            {coach.modelAnswer && (
                              <div className="space-y-2 border-t border-brand-violet/20 pt-3.5">
                                <label className="text-[11.5px] font-bold text-brand-success">Better Expression</label>
                                <p className="text-[12.5px] font-bold leading-relaxed text-brand-ink">
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

        <p className="text-center text-[11px] text-brand-muted">
          End of Interview Report
        </p>
      </div>
    </div>
  )
}
