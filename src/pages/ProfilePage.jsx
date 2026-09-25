import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { getBackendBaseUrl } from '../lib/backendBase'
import { authenticatedFetch } from '../lib/authenticatedFetch'
import {
  mergeCvProfileFromApi,
  emptyCvProfile,
  emptyWork,
  emptyEducation,
  emptyProject,
  emptyPublication,
  emptyLanguage,
  emptyAward,
} from '../lib/cvProfileDefaults'
import {
  Upload, Loader2, Lightbulb, FileText,
  Sparkles, BarChart3, ListChecks, AlertTriangle, Layers,
  MapPin, ClipboardList, CheckCircle2, Telescope,
  ChevronDown, ChevronUp, Plus, Trash2, User, X,
  Briefcase, GraduationCap, FolderKanban, BookOpen, Tags, Languages, Award, Wand2,
  Pencil, Eye, ArrowUpRight, Zap, ArrowRight, Share2, MessageCircle, ExternalLink,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import xiaohongshuQr from '../assets/xiaohongshu_qr.png'

function fileToBase64Data(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => {
      const s = String(r.result || '')
      const i = s.indexOf(',')
      resolve(i >= 0 ? s.slice(i + 1) : s)
    }
    r.onerror = () => reject(new Error('read failed'))
    r.readAsDataURL(file)
  })
}

function normalizeUiLang(lang) {
  const s = String(lang || '').toLowerCase()
  if (s.startsWith('zh')) return 'zh'
  if (s.startsWith('de')) return 'de'
  return 'en'
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
        if (m) return <strong key={i} className="font-semibold text-brand-ink">{m[1]}</strong>
        return part || null
      })}
    </span>
  )
}

function SanitizedListText({ text, className }) {
  if (!text) return null
  const clean = String(text).replace(/[●•⚫🌑⦿★■◾▪]/g, '').trim()
  const lines = clean.split('\n').map(l => l.trim().replace(/^- /, '')).filter(Boolean)

  if (lines.length > 1) {
    return (
      <ul className={`mt-2 space-y-2 list-disc pl-5 ${className}`}>
        {lines.map((line, i) => (
          <li key={i} className="leading-relaxed"><RichText text={line} /></li>
        ))}
      </ul>
    )
  }
  return <RichText text={clean} className={className} />
}

function SectionTitle({ icon: Icon, children }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-brand-line bg-brand-inset text-brand-violet">
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <h2 className="font-brand text-[18px] font-semibold tracking-tight text-brand-ink">{children}</h2>
    </div>
  )
}

function ResumeScoreGauge({ score, size = 200 }) {
  const percentage = Math.min(Math.max((score || 0) * 10, 0), 100)
  const strokeWidth = 14
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI // Full circle
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative flex items-center justify-center overflow-visible" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeLinecap="round"
          className="text-brand-line"
        />
        {/* Progress Fill */}
        <motion.circle
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#gauge-gradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(var(--brand-violet))" />
            <stop offset="100%" stopColor="rgb(var(--brand-glow))" />
          </linearGradient>
        </defs>
      </svg>
      {/* Central Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="flex items-baseline justify-center">
          <span className="font-brand text-[44px] font-semibold leading-none tracking-tight text-brand-ink">
            {Math.round(percentage)}
          </span>
          <span className="ml-1 text-[16px] font-bold text-brand-muted">/100</span>
        </div>
        {/* 完整类名字符串，不做拼接，避免生产构建 purge */}
        <div className={`mt-2 text-[11px] font-bold ${percentage > 80 ? 'text-brand-success' :
          percentage > 60 ? 'text-brand-violet' :
            'text-brand-muted'
          }`}>
          {percentage > 90 ? 'Exceptional' :
            percentage > 80 ? 'Excellent' :
              percentage > 70 ? 'Professional' :
                percentage > 50 ? 'Developing' : 'Needs Review'}
        </div>
      </div>
    </div>
  )
}

function CoachReport({ coach, t }) {
  const summaryRef = useRef(null)
  if (!coach) return null
  const s = coach.scores || {}
  const overallScore = s.overall || 0

  const scrollToSummary = () => {
    summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const otherScores = [
    { key: 'clarity', label: t('profile.coachScoreClarity', '清晰度'), val: s.clarity },
    { key: 'impact', label: t('profile.coachScoreImpact', '成果影响力'), val: s.impact },
    { key: 'structure', label: t('profile.coachScoreStructure', '结构逻辑'), val: s.structure },
    { key: 'ats', label: t('profile.coachScoreAts', '关键词 / ATS'), val: s.ats },
    {
      key: 'professionalism',
      label: t('profile.coachScoreProfessionalism', '专业度'),
      val: s.professionalism || Math.round(((s.structure || 0) + (s.clarity || 0)) / 2)
    },
  ]

  return (
    <div className="space-y-10">
      {/* Resume Score Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="brand-float relative overflow-hidden rounded-[22px] px-6 py-6 sm:px-8"
      >
        <div className="relative z-10 flex flex-col items-center gap-8 lg:flex-row">
          {/* Left: Compact Gauge */}
          <div className="shrink-0">
            <ResumeScoreGauge score={overallScore} size={160} />
          </div>

          {/* Right: Info & CTA */}
          <div className="min-w-0 flex-1 space-y-5 text-center lg:text-left">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div className="flex items-center justify-center gap-3.5 lg:justify-start">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-brand-line bg-brand-inset text-brand-violet">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-brand text-[22px] font-semibold leading-tight tracking-tight text-brand-ink">
                    <span className="whitespace-nowrap">Land<span className="italic text-brand-violet">It</span></span> Resume Score
                  </h3>
                  <p className="mt-1 text-[11px] text-brand-muted">AI Diagnostic Engine</p>
                </div>
              </div>
              <button
                onClick={scrollToSummary}
                className="shrink-0 rounded-xl border border-brand-line bg-brand-card px-4 py-2.5 text-[12.5px] font-bold text-brand-ink transition-colors hover:border-brand-ink"
              >
                {t('profile.scoreDetails', '查看诊断详情')}
              </button>
            </div>

            <p className="max-w-2xl rounded-[18px] border border-brand-line bg-brand-inset p-4 text-[13px] font-medium leading-relaxed text-brand-muted">
              {t('profile.scoreInsight', "您的简历在内容深度和逻辑性上表现出色。通过进一步细化量化指标，可以显著提升针对 Top 级雇主的竞争力。")}
            </p>

            {/* Other scores */}
            <div className="flex flex-wrap gap-2.5 pt-1 lg:flex-nowrap">
              {otherScores.map(c => (
                <div key={c.key} className="flex min-w-[120px] flex-1 items-center justify-between gap-3 rounded-xl border border-brand-line bg-brand-card px-3.5 py-2.5 transition-colors hover:border-brand-ink">
                  <span className="min-w-0 truncate text-[12px] font-bold text-brand-muted">{c.label}</span>
                  <div className="flex shrink-0 items-baseline">
                    <span className="text-[17px] font-semibold tabular-nums text-brand-ink">{c.val || 0}</span>
                    <span className="ml-0.5 text-[11px] font-bold text-brand-muted">/10</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <motion.section
        ref={summaryRef}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="brand-float relative scroll-mt-28 overflow-hidden rounded-[22px] px-6 py-6 sm:px-8"
      >
        <div className="relative z-10">
          <SectionTitle icon={Sparkles}>
            {t('profile.coachSummary')}
          </SectionTitle>
          <div className="whitespace-pre-wrap text-[14px] font-medium leading-relaxed text-brand-muted">
            <RichText text={coach.overallEvaluation} />
          </div>
        </div>
      </motion.section>

      {coach.macroInsights?.length > 0 && (
        <section>
          <SectionTitle icon={Telescope}>
            {t('profile.coachMacro')}
          </SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            {coach.macroInsights.map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="brand-float flex items-start gap-3 rounded-[18px] px-5 py-4"
              >
                <div className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-violet" aria-hidden="true" />
                <RichText text={line} className="text-[13px] font-medium leading-relaxed text-brand-muted" />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {coach.highlights?.length > 0 && (
        <section>
          <SectionTitle icon={ListChecks}>
            {t('profile.coachStrengths')}
          </SectionTitle>
          <div className="space-y-3">
            {coach.highlights.map((h, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-3 rounded-[18px] border border-brand-line bg-brand-inset px-5 py-4"
              >
                <div className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-ink" aria-hidden="true" />
                <RichText text={h} className="text-[13px] font-bold leading-relaxed text-brand-ink" />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {coach.priorityImprovements?.length > 0 && (
        <section>
          <SectionTitle icon={AlertTriangle}>
            {t('profile.coachCritical')}
          </SectionTitle>
          <div className="space-y-5">
            {coach.priorityImprovements.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="brand-float overflow-hidden rounded-[22px] px-6 py-5"
              >
                <div className="flex flex-col gap-4">
                  <h3 className="font-brand text-[17px] font-semibold tracking-tight text-brand-ink">{p.title}</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 rounded-[18px] border border-brand-danger/30 bg-brand-danger/[0.06] p-4">
                      <span className="text-[11px] font-bold text-brand-danger">{t('profile.coachIssue')}</span>
                      <div className="flex items-start gap-3">
                        <div className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-brand-danger" aria-hidden="true" />
                        <p className="text-[13px] font-bold leading-relaxed text-brand-ink"><RichText text={p.problem} /></p>
                      </div>
                    </div>
                    <div className="space-y-2 rounded-[18px] border border-brand-line bg-brand-inset p-4">
                      <span className="text-[11px] font-bold text-brand-violet">{t('profile.coachAction')}</span>
                      <div className="flex items-start gap-3">
                        <div className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-brand-violet" aria-hidden="true" />
                        <p className="text-[13px] font-bold leading-relaxed text-brand-ink"><RichText text={p.suggestedAction} /></p>
                      </div>
                    </div>
                  </div>
                  {p.rewriteExample && (
                    <div className="mt-1 rounded-xl border border-brand-line bg-brand-inset p-4">
                      <span className="mb-2 block text-[11px] font-bold text-brand-ink">{t('profile.coachExample')}</span>
                      <div className="text-[13px] italic text-brand-muted"><SanitizedListText text={p.rewriteExample} /></div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {coach.moduleDeepDives?.length > 0 && (
        <section>
          <SectionTitle icon={Layers}>
            {t('profile.coachSections')}
          </SectionTitle>
          <div className="space-y-6">
            {coach.moduleDeepDives.map((m, i) => (
              <div key={i} className="brand-float space-y-6 rounded-[22px] px-6 py-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-brand-inset px-3 py-1 text-[12px] font-bold text-brand-ink">
                  <Zap className="h-3 w-3 text-brand-violet" />
                  {m.moduleTitle}
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <span className="block w-fit border-b border-brand-line pb-1 text-[11px] text-brand-muted">{t('profile.coachFinding')}</span>
                    <p className="text-[13px] font-bold leading-relaxed text-brand-ink"><RichText text={m.finding} /></p>
                  </div>
                  <div className="space-y-2">
                    <span className="block w-fit border-b border-brand-line pb-1 text-[11px] text-brand-muted">{t('profile.coachWhy')}</span>
                    <p className="text-[13px] font-bold leading-relaxed text-brand-ink"><RichText text={m.whyImportant} /></p>
                  </div>
                  <div className="space-y-2">
                    <span className="block w-fit border-b border-brand-violet/40 pb-1 text-[11px] font-bold text-brand-violet">{t('profile.coachSuggest')}</span>
                    <p className="text-[13px] font-bold italic leading-relaxed text-brand-ink"><RichText text={m.modificationSuggestion} /></p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[18px] border border-brand-line bg-brand-inset p-5">
                    <span className="mb-2.5 block text-[11px] text-brand-muted">{t('profile.coachBefore')}</span>
                    <div className="font-mono text-[13px] font-medium leading-relaxed text-brand-muted">
                      <SanitizedListText text={m.before} />
                    </div>
                  </div>
                  <div className="rounded-[18px] border border-brand-ink bg-brand-card p-5 ring-1 ring-brand-ink">
                    <span className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold text-brand-ink">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-ink" aria-hidden="true" />
                      {t('profile.coachAfter')}
                    </span>
                    <div className="text-[13px] font-bold leading-relaxed text-brand-ink">
                      <SanitizedListText text={m.after} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {coach.positioning?.length > 0 && (
        <section>
          <SectionTitle icon={MapPin}>
            {t('profile.coachMarket')}
          </SectionTitle>
          <div className="grid gap-5 md:grid-cols-2">
            {coach.positioning.map((p, i) => (
              <div key={i} className="space-y-2">
                <h3 className="text-[15px] font-bold text-brand-ink">{p.title}</h3>
                <p className="text-[13px] leading-relaxed text-brand-muted"><RichText text={p.content} /></p>
              </div>
            ))}
          </div>
        </section>
      )}

      {coach.actionChecklist?.length > 0 && (
        <section>
          <SectionTitle icon={ClipboardList}>
            {t('profile.coachChecklist')}
          </SectionTitle>
          <div className="grid gap-3 md:grid-cols-2">
            {coach.actionChecklist.map((a, i) => (
              <div key={i} className="flex items-start gap-4 rounded-[18px] border border-brand-line bg-brand-card p-5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-ink text-[12.5px] font-semibold text-brand-on-ink">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-[13.5px] font-bold leading-tight text-brand-ink">{a.title}</p>
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] text-brand-muted">{t('profile.coachOutcome')}</span>
                    <p className="text-[12.5px] font-medium leading-relaxed text-brand-muted"><RichText text={a.expectedOutcome} /></p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function safeExternalHref(raw) {
  const s = String(raw || '').trim()
  if (!s) return null
  if (/^https?:\/\//i.test(s)) return s
  return `https://${s}`
}

function genderDisplay(key, t) {
  const map = {
    female: 'genderFemale',
    male: 'genderMale',
    non_binary: 'genderNb',
    other: 'genderOther',
    prefer_not_to_say: 'genderSkip',
  }
  const k = map[key]
  return k ? t(`profile.cv.${k}`) : t('profile.cv.genderEmpty')
}

function parseBullets(raw) {
  if (Array.isArray(raw)) return raw.map(s => String(s || '').trim()).filter(Boolean)
  const s = String(raw || '').trim()
  if (!s) return []

  // Normalize line breaks first
  const normalized = s.replace(/\r\n/g, '\n').replace(/\n{2,}/g, '\n').trim()
  const lines = normalized.split('\n').map(l => l.trim()).filter(Boolean)
  const isLikelyBullet = (line) =>
    /^([-*•]|\d+[\).])\s+/.test(line)

  // Only convert to list form when lines look like bullets
  if (lines.length >= 2 && lines.filter(isLikelyBullet).length >= 2) {
    return lines.map((l) => l.replace(/^([-*•]|\d+[\).])\s+/, '').trim()).filter(Boolean)
  }

  // Single-line fallback: split by common bullet separators
  if (s.includes('•')) {
    return s.split('•').map(x => x.trim()).filter(Boolean)
  }

  // Keep as one item if we can't confidently split
  return [s]
}

function parseTechnologyTokens(raw) {
  const s = String(raw || '').trim()
  if (!s) return []

  const normalized = s.replace(/\r\n/g, '\n').trim()
  const parts = normalized
    .split(/[\n,;·•|/]+/g)
    .map(x => x.trim())
    .filter(Boolean)

  // De-dup while preserving order
  const seen = new Set()
  const out = []
  for (const p of parts) {
    if (seen.has(p)) continue
    seen.add(p)
    out.push(p)
  }
  return out
}

function profileHasVisibleData(cvProfile, resumeText, resumeNotes) {
  const p = cvProfile
  if ([p.fullName, p.gender, p.email, p.phone, p.location, p.linkedIn, p.website, p.summary].some((x) => String(x || '').trim())) {
    return true
  }
  if ((resumeText || '').trim() || (resumeNotes || '').trim()) return true
  if (p.workExperience?.length || p.education?.length || p.projects?.length || p.publications?.length) return true
  if (p.skills?.length || p.languages?.length || p.awards?.length) return true
  return false
}

const displayCellClass =
  'min-h-[78px] bg-brand-card p-4 transition-colors hover:bg-brand-inset/45 sm:p-5'
const displayLabelClass = 'mb-1 text-[11px] text-brand-muted'
const displayValueClass = 'break-words text-[13.5px] font-bold text-brand-ink'

function DisplayCell({ label, value, t, asLink, mailto, className = '' }) {
  const v = String(value || '').trim()
  const empty = !v
  const webHref = !empty && asLink ? safeExternalHref(v) : null
  return (
    <div className={`${displayCellClass} ${className}`}>
      <div className={displayLabelClass}>{label}</div>
      <div className={displayValueClass}>
        {empty ? (
          <span className="font-normal text-brand-muted">{t('profile.viewSectionEmpty')}</span>
        ) : mailto ? (
          <a href={`mailto:${v}`} className="transition-colors hover:text-brand-violet">
            {v}
          </a>
        ) : webHref ? (
          <a href={webHref} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-brand-violet">
            {v}
          </a>
        ) : (
          v
        )}
      </div>
    </div>
  )
}

function jobStatusDisplay(status, t) {
  return status === 'hired' ? t('profile.statusHired') : t('profile.statusSeeking')
}

function GallupAdCard({ t }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="brand-float group relative overflow-hidden rounded-[22px] px-6 py-6"
    >
      <div className="relative z-10 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-brand-inset px-3 py-1 text-[12px] font-bold text-brand-violet">
            <Zap className="h-3 w-3" />
            {t('profile.gallupAdBadge')}
          </div>
          <ArrowUpRight className="h-5 w-5 shrink-0 text-brand-muted transition-colors group-hover:text-brand-ink" />
        </div>
        <div className="space-y-2">
          <h3 className="font-brand text-[22px] font-semibold leading-tight tracking-tight text-brand-ink">
            {t('profile.gallupAdTitle')}
          </h3>
          <p className="max-w-xs text-[13px] leading-relaxed text-brand-muted">
            {t('profile.gallupAdDesc')}
          </p>
        </div>
        <Link
          to="/gallup-test"
          className="inline-flex items-center gap-2 border-b-2 border-brand-ink pb-1 text-[13px] font-bold text-brand-ink transition-all hover:gap-4"
        >
          {t('profile.gallupAdBtn')}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </motion.div>
  )
}

function SectionHeader({ icon: Icon, title, t }) {
  return (
    <div className="mb-5 flex items-center gap-3 border-b border-brand-line pb-3.5">
      <Icon className="h-4 w-4 shrink-0 text-brand-violet" aria-hidden />
      <h3 className="font-brand text-[18px] font-semibold tracking-tight text-brand-ink">
        {title}
      </h3>
    </div>
  )
}

function ProfileSectionsView({ cvProfile, t }) {
  const hasStructuredDetails = Boolean(
    cvProfile.education.length
    || cvProfile.workExperience.length
    || cvProfile.projects.length
    || cvProfile.publications.length
    || cvProfile.skills.length
    || cvProfile.languages.length
    || cvProfile.awards.length,
  )

  if (!hasStructuredDetails) {
    return (
      <div className="flex flex-col gap-5 rounded-[22px] border border-dashed border-brand-line bg-brand-card/45 px-6 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div className="min-w-0">
          <p className="font-brand text-[17px] font-semibold text-brand-ink">{t('profile.viewEmptyTitle')}</p>
          <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-brand-muted">{t('profile.cv.emptySection')}</p>
        </div>
        <Link to="/profile/edit" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-brand-line bg-brand-card px-4 py-2.5 text-[12.5px] font-semibold text-brand-ink transition-colors hover:border-brand-ink">
          <Pencil className="h-3.5 w-3.5" />
          {t('profile.editProfile')}
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Education */}
      <section>
        <SectionHeader icon={GraduationCap} title={t('profile.cv.education')} t={t} />
        <div className="grid gap-4">
          {cvProfile.education.length === 0 ? (
            <p className="text-[13px] italic text-brand-muted">{t('profile.cv.emptySection')}</p>
          ) : (
            cvProfile.education.map((ed, i) => (
              <div key={i} className="brand-float group space-y-3 rounded-[22px] px-6 py-5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                  <h4 className="font-brand text-[18px] font-semibold tracking-tight text-brand-ink transition-colors group-hover:text-brand-violet">{ed.institution || t('profile.viewSectionEmpty')}</h4>
                  <span className="text-[11px] text-brand-muted">
                    {[ed.duration, ed.startDate, ed.endDate].filter(Boolean).slice(0, 1).join(' – ') || null}
                  </span>
                </div>
                <div className="text-[13px] font-bold text-brand-muted">
                  {[ed.degree, ed.field].filter(Boolean).join(' · ') || null}
                  {ed.gpa ? ` · GPA ${ed.gpa}` : ''}
                </div>
                {(() => {
                  const bullets = parseBullets(ed.details || ed.description)
                  return bullets.length > 0 ? (
                    <ul className="mt-3 space-y-2">
                      {bullets.map((b, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-[13px] leading-relaxed text-brand-muted">
                          <div className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-brand-violet" aria-hidden="true" />
                          <RichText text={b} />
                        </li>
                      ))}
                    </ul>
                  ) : null
                })()}
              </div>
            ))
          )}
        </div>
      </section>

      {/* Work Experience */}
      <section>
        <SectionHeader icon={Briefcase} title={t('profile.cv.work')} t={t} />
        <div className="grid gap-4">
          {cvProfile.workExperience.length === 0 ? (
            <p className="text-[13px] italic text-brand-muted">{t('profile.cv.emptySection')}</p>
          ) : (
            cvProfile.workExperience.map((w, i) => (
              <div key={i} className="brand-float group space-y-3 rounded-[22px] px-6 py-5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                  <h4 className="font-brand text-[18px] font-semibold tracking-tight text-brand-ink transition-colors group-hover:text-brand-violet">{w.title || t('profile.viewSectionEmpty')}</h4>
                  <span className="text-[11px] text-brand-muted">
                    {[w.duration, w.startDate, w.endDate].filter(Boolean).slice(0, 1).join(' – ') || null}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {w.company && <span className="text-[12.5px] font-bold text-brand-violet">{w.company}</span>}
                  {w.location && <span className="text-[12px] text-brand-muted">· {w.location}</span>}
                </div>
                {(() => {
                  const bullets = parseBullets(w.highlights)
                  return bullets.length > 0 ? (
                    <ul className="mt-3 space-y-2">
                      {bullets.map((b, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-[13px] leading-relaxed text-brand-muted">
                          <div className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-brand-violet" aria-hidden="true" />
                          <RichText text={b} />
                        </li>
                      ))}
                    </ul>
                  ) : null
                })()}
              </div>
            ))
          )}
        </div>
      </section>

      {/* Projects */}
      <section>
        <SectionHeader icon={FolderKanban} title={t('profile.cv.projects')} t={t} />
        <div className="grid gap-4">
          {cvProfile.projects.length === 0 ? (
            <p className="text-[13px] italic text-brand-muted">{t('profile.cv.emptySection')}</p>
          ) : (
            cvProfile.projects.map((pr, i) => (
              <div key={i} className="brand-float group space-y-3 rounded-[22px] px-6 py-5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                  <h4 className="font-brand text-[18px] font-semibold tracking-tight text-brand-ink transition-colors group-hover:text-brand-violet">{pr.name || t('profile.viewSectionEmpty')}</h4>
                  <span className="text-[11px] text-brand-muted">
                    {[pr.duration, pr.startDate, pr.endDate].filter(Boolean).slice(0, 1).join(' – ') || null}
                  </span>
                </div>
                {pr.role && <div className="text-[13px] font-bold text-brand-muted">{pr.role}</div>}
                {(() => {
                  const bullets = parseBullets(pr.description)
                  return bullets.length > 0 ? (
                    <ul className="mt-3 space-y-2">
                      {bullets.map((b, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-[13px] leading-relaxed text-brand-muted">
                          <div className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-brand-violet" aria-hidden="true" />
                          <RichText text={b} />
                        </li>
                      ))}
                    </ul>
                  ) : null
                })()}
              </div>
            ))
          )}
        </div>
      </section>

      {/* Publications */}
      <section>
        <SectionHeader icon={BookOpen} title={t('profile.cv.publications')} t={t} />
        <div className="grid gap-4 sm:grid-cols-2">
          {cvProfile.publications.length === 0 ? (
            <p className="text-[13px] italic text-brand-muted">{t('profile.cv.emptySection')}</p>
          ) : (
            cvProfile.publications.map((pub, i) => (
              <div key={i} className="space-y-2.5 rounded-[18px] border border-brand-line bg-brand-card p-4">
                <h4 className="text-[13.5px] font-bold leading-tight text-brand-ink">{pub.title || t('profile.viewSectionEmpty')}</h4>
                <div className="text-[12px] text-brand-muted">
                  {[pub.venue, pub.year].filter(Boolean).join(' · ')}
                  {pub.authors ? ` · ${pub.authors}` : ''}
                </div>
                {pub.url && (
                  <a href={safeExternalHref(pub.url)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[12px] font-bold text-brand-violet transition-all hover:gap-2">
                    Link <ArrowUpRight className="h-3 w-3" />
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Skills */}
        <section>
          <SectionHeader icon={Tags} title={t('profile.cv.skills')} t={t} />
          <div className="flex flex-wrap gap-2">
            {cvProfile.skills.length === 0 ? (
              <p className="text-[13px] italic text-brand-muted">{t('profile.cv.emptySection')}</p>
            ) : (
              cvProfile.skills.map((s, i) => (
                <span key={i} className="rounded-lg border border-brand-line bg-brand-inset px-2.5 py-1 text-[12px] font-bold text-brand-ink">
                  {s}
                </span>
              ))
            )}
          </div>
        </section>

        {/* Languages */}
        <section>
          <SectionHeader icon={Languages} title={t('profile.cv.languages')} t={t} />
          <div className="space-y-2.5">
            {cvProfile.languages.length === 0 ? (
              <p className="text-[13px] italic text-brand-muted">{t('profile.cv.emptySection')}</p>
            ) : (
              cvProfile.languages.map((lang, i) => (
                <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-brand-line bg-brand-card p-3.5">
                  <span className="min-w-0 truncate text-[13.5px] font-bold text-brand-ink">{lang.name || t('profile.viewSectionEmpty')}</span>
                  <span className="shrink-0 text-[12px] font-bold text-brand-violet">{lang.proficiency || ''}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Awards */}
      <section>
        <SectionHeader icon={Award} title={t('profile.cv.awards')} t={t} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cvProfile.awards.length === 0 ? (
            <p className="text-[13px] italic text-brand-muted">{t('profile.cv.emptySection')}</p>
          ) : (
            cvProfile.awards.map((aw, i) => (
              <div key={i} className="rounded-xl border border-brand-line bg-brand-inset p-3.5">
                <h4 className="mb-1 text-[13.5px] font-bold text-brand-ink">{aw.title || t('profile.viewSectionEmpty')}</h4>
                <div className="text-[11px] text-brand-muted">
                  {[aw.year, aw.issuer].filter(Boolean).join(' · ')}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

function ProfileDisplayView({ cvProfile, resumeText, resumeNotes, targetRole, coach, t, i18n, timeStr, showFloatingEditButton, coachTranslating, coachGenerating, runCoach, jobSearchStatus, avatarId, tokens, recharge }) {
  const hasData = profileHasVisibleData(cvProfile, resumeText, resumeNotes)
  const tr = String(targetRole || '').trim()
  const coachRef = useRef(null)
  const scrollToCoach = () => coachRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="mx-auto max-w-[1120px] space-y-8 sm:space-y-10">
      {/* 悬浮快捷入口：小屏隐藏（头部已有同样的两个入口，且会遮住正文），
          大屏时底部留出安全区，避免压在 iOS 手势条上 */}
      {showFloatingEditButton ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-[calc(1.5rem+env(safe-area-inset-right))] z-40 hidden flex-col items-end gap-3 sm:flex"
        >
          {coach && (
            <button
              onClick={scrollToCoach}
              className="brand-float flex items-center gap-2 rounded-full border border-brand-line px-5 py-3 text-[13px] font-bold text-brand-ink transition-colors hover:border-brand-ink"
            >
              <BarChart3 className="h-4 w-4 text-brand-violet" />
              <span>{t('profile.coachViewReport')}</span>
            </button>
          )}
          <Link
            to="/profile/edit"
            className="flex items-center gap-2 rounded-full bg-brand-ink px-5 py-3 text-[13px] font-semibold text-brand-on-ink transition-opacity duration-200 hover:opacity-90"
          >
            <Pencil className="h-4 w-4" />
            <span>{t('profile.editProfile')}</span>
          </Link>
        </motion.div>
      ) : null}

      {/*
        能量值条。原来是一整张卡：16×16 图标、44px 数字、三个用途胶囊分两行、
        右侧一竖排按钮，外加一枚 28×28 的水印图标和一颗柔光圆，高度约 220px。
        它承载的其实只有「余额 + 用途 + 充值」三件事，收成一条横排就够了。
      */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="brand-float flex flex-wrap items-center gap-x-5 gap-y-3 rounded-[18px] px-5 py-3.5"
      >
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-brand-line bg-brand-inset text-brand-ink">
            <Zap className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="font-brand text-[22px] font-semibold leading-none tracking-tight tabular-nums text-brand-ink">{tokens}</span>
              <span className="text-[12px] text-brand-muted">{t('profile.tokens')}</span>
            </div>
            <p className="mt-1 truncate text-[11.5px] text-brand-muted">
              {t('profile.initialTokensHint', 'Full access to AI-powered career tools.')}
            </p>
          </div>
        </div>

        <span className="hidden h-9 w-px bg-brand-line sm:block" aria-hidden="true" />

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: 'interview', label: t('profile.tokenUsageInterview'), dot: 'bg-brand-ink' },
            { key: 'coach', label: t('profile.tokenUsageCoach'), dot: 'bg-brand-violet' },
            { key: 'extract', label: t('profile.tokenUsageExtract'), dot: 'bg-brand-muted' },
          ].map((item) => (
            <span key={item.key} className="flex items-center gap-1.5 rounded-full border border-brand-line bg-brand-inset px-2.5 py-1">
              <span className={`h-1.5 w-1.5 rounded-full ${item.dot}`} aria-hidden="true" />
              <span className="text-[11px] text-brand-muted">{item.label}</span>
            </span>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <p className="hidden text-[11px] text-brand-muted lg:block">{t('profile.tokenRewardContribution')}</p>
          <button
            onClick={recharge}
            className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-ink px-4 py-2.5 text-[12.5px] font-semibold text-brand-on-ink transition-opacity duration-200 hover:opacity-90"
          >
            <Zap className="h-3.5 w-3.5" />
            {t('profile.recharge')}
          </button>
        </div>
      </motion.div>

      <header className="rounded-[24px] border border-brand-line bg-brand-card px-5 py-6 sm:px-7 sm:py-7">
        <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
          <div className="min-w-0 max-w-2xl space-y-5">
            <div className="flex items-center gap-4">
              <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl border border-brand-line bg-brand-inset">
                {avatarId ? (
                  <img src={avatarId} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-brand-muted">
                    <User className="h-9 w-9" />
                  </div>
                )}
              </div>
              <div className="min-w-0 space-y-1.5">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-line bg-brand-inset px-2.5 py-0.5 text-[11px] text-brand-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-violet" aria-hidden="true" />
                  {jobStatusDisplay(jobSearchStatus, t)}
                </div>
                <h1 className="font-brand text-[34px] font-semibold leading-tight tracking-tight text-brand-ink sm:text-[40px]">
                  {cvProfile.fullName || t('profile.displayTitle')}
                </h1>
              </div>
            </div>
            <p className="text-[14px] leading-relaxed text-brand-ink">
              {cvProfile.summary || t('profile.displaySub')}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3">
            {coach && (
              <button
                onClick={scrollToCoach}
                className="flex items-center gap-2 rounded-xl border border-brand-line bg-brand-card px-4 py-2.5 text-[13px] font-bold text-brand-ink transition-colors hover:border-brand-ink"
              >
                <BarChart3 className="h-4 w-4 text-brand-violet" />
                <span>{t('profile.coachViewReport')}</span>
              </button>
            )}
            <Link
              to="/profile/edit"
              className="flex items-center gap-2 rounded-xl bg-brand-ink px-4 py-2.5 text-[13px] font-semibold text-brand-on-ink transition-opacity duration-200 hover:opacity-90"
            >
              <Pencil className="h-4 w-4" />
              <span>{t('profile.editProfile')}</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="space-y-12">
        {!hasData ? (
          <div className="space-y-5 rounded-[22px] border-2 border-dashed border-brand-line p-10 text-center">
            <div className="space-y-2">
              <h3 className="font-brand text-[22px] font-semibold tracking-tight text-brand-ink">{t('profile.viewEmptyTitle')}</h3>
              <p className="mx-auto max-w-sm text-[13px] text-brand-muted">{t('profile.viewEmptySub')}</p>
            </div>
            <Link
              to="/profile/edit"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-ink px-5 py-3 text-[13px] font-semibold text-brand-on-ink transition-opacity duration-200 hover:opacity-90"
            >
              <Pencil className="h-4 w-4" />
              <span>{t('profile.editProfile')}</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-12">
            <section>
              <SectionHeader icon={User} title={t('profile.cv.basic')} t={t} />
              <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[20px] border border-brand-line bg-brand-line md:grid-cols-2">
                <DisplayCell label={t('profile.cv.fullName')} value={cvProfile.fullName} t={t} />
                <div className={displayCellClass}>
                  <div className={displayLabelClass}>{t('profile.cv.gender')}</div>
                  <div className={displayValueClass}>{genderDisplay(cvProfile.gender, t)}</div>
                </div>
                <DisplayCell label={t('profile.cv.email')} value={cvProfile.email} t={t} mailto />
                <DisplayCell label={t('profile.cv.phone')} value={cvProfile.phone} t={t} />
                <DisplayCell label={t('profile.cv.location')} value={cvProfile.location} t={t} />
                <DisplayCell label={t('profile.cv.linkedIn')} value={cvProfile.linkedIn} t={t} asLink />
                <DisplayCell label={t('profile.cv.website')} value={cvProfile.website} t={t} asLink className="md:col-span-2" />
              </div>
            </section>

            <ProfileSectionsView cvProfile={cvProfile} t={t} />

            {/* Moved to top: AI Diagnostic & Resume Score */}
            {coach ? (
              <div ref={coachRef} className="space-y-10">
                <CoachReport coach={coach} t={t} />
                {timeStr && (
                  <div className="flex items-center gap-2 border-t border-brand-line pt-5 text-[11px] text-brand-muted">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-brand-success" />
                    {t('profile.coachPersistNote', { time: timeStr })}
                  </div>
                )}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="brand-float relative overflow-hidden rounded-[22px] px-6 py-10 text-center sm:px-10"
              >
                <div className="relative z-10 mx-auto max-w-lg space-y-5">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-brand-line bg-brand-inset text-brand-violet">
                    <Sparkles className="h-7 w-7" />
                  </div>
                  <h3 className="font-brand text-[26px] font-semibold tracking-tight text-brand-ink">{t('profile.coachPreviewTitle', '您的 AI 简历报告已就绪')}</h3>
                  <p className="text-[13.5px] leading-relaxed text-brand-muted">
                    {t('landing.coachBannerSub', '点击生成深度简历诊断。我们将基于德国人才市场标准和 ATS 算法为您提供全方位复盘。')}
                  </p>
                  <button
                    onClick={runCoach}
                    disabled={coachGenerating || !hasData}
                    className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-brand-ink px-5 py-3.5 text-[15px] font-semibold text-brand-on-ink transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {coachGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
                    {coachGenerating ? t('profile.cv.extracting') : t('profile.coachCta')}
                  </button>
                </div>
              </motion.div>
            )}

            {tr && (
              <div className="brand-float rounded-[22px] px-6 py-5">
                <span className="mb-2 block text-[11px] text-brand-muted">{t('profile.coachTargetRole')}</span>
                <p className="font-brand text-[22px] font-semibold tracking-tight text-brand-ink">{tr}</p>
              </div>
            )}

            <div className="grid gap-5">
              {resumeText.trim() && (
                <details className="group space-y-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-[18px] border border-brand-line bg-brand-card p-5 text-[12.5px] font-bold text-brand-ink transition-colors hover:border-brand-ink">
                    <span className="flex min-w-0 items-center gap-3">
                      <FileText className="h-4 w-4 shrink-0 text-brand-violet" />
                      {t('profile.cv.rawResumeTitle')}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-brand-muted transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="rounded-[18px] border border-brand-line bg-brand-inset p-5">
                    <pre className="whitespace-pre-wrap font-sans text-[12.5px] leading-relaxed text-brand-muted">
                      {resumeText}
                    </pre>
                  </div>
                </details>
              )}

              {resumeNotes.trim() && (
                <div className="space-y-3 rounded-[18px] border border-brand-line bg-brand-card p-5">
                  <span className="text-[11px] text-brand-muted">{t('profile.sectionNotes')}</span>
                  <p className="whitespace-pre-wrap text-[13px] font-medium leading-relaxed text-brand-muted">{resumeNotes}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const inputClass =
  'w-full rounded-xl border border-brand-line bg-brand-inset px-3.5 py-3 text-[13.5px] text-brand-ink outline-none transition-colors placeholder:text-brand-muted/70 focus:border-brand-ink focus:ring-4 focus:ring-brand-ink/10'

function MultiLineInput({ lines, label, placeholder, onChange, t, inputClass }) {
  const safeLines = Array.isArray(lines) ? lines : []
  const textValue = safeLines.join('\n')

  return (
    <div className="space-y-2">
      <label className="block text-[12.5px] font-bold text-brand-ink">{label}</label>
      <textarea
        className={`${inputClass} min-h-[160px] resize-none leading-relaxed`}
        placeholder={placeholder || t('profile.cv.phHighlightsHint')}
        value={textValue}
        onChange={(e) => {
          const val = e.target.value
          const newLines = val.split('\n')
          onChange(newLines)
        }}
      />
    </div>
  )
}

function RechargeModal({ isOpen, onClose, t }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-brand-ink/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="brand-float relative max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-[22px] border border-brand-line"
      >
        <div className="space-y-7 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <h2 className="font-brand text-[26px] font-semibold leading-tight tracking-tight text-brand-ink">
                {t('profile.rechargeModal.title')}
              </h2>
              <p className="text-[12.5px] text-brand-muted">
                {t('profile.rechargeModal.subtitle')}
              </p>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 rounded-xl border border-brand-line bg-brand-inset p-2.5 text-brand-muted transition-colors hover:border-brand-ink hover:text-brand-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4">
            <div className="space-y-3.5 rounded-[20px] border border-brand-line bg-brand-inset p-5 text-left transition-colors hover:border-brand-ink">
              <div className="flex items-center gap-3.5">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-brand-line bg-brand-card text-brand-violet">
                  <Share2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[14px] font-semibold text-brand-ink">
                    {t('profile.rechargeModal.method1Title')}
                  </h3>
                </div>
              </div>
              <p className="text-[13px] font-medium leading-relaxed text-brand-muted">
                {t('profile.rechargeModal.method1Desc')}
              </p>
              <Link
                to="/experiences"
                onClick={onClose}
                className="inline-flex items-center gap-2 text-[12.5px] font-bold text-brand-violet transition-all hover:gap-4"
              >
                {t('profile.rechargeModal.method1Btn')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="space-y-4 rounded-[20px] border border-brand-line bg-brand-inset p-5 text-left transition-colors hover:border-brand-ink">
              <div className="flex items-center gap-3.5">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-brand-line bg-brand-card text-brand-danger">
                  <ExternalLink className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[14px] font-semibold text-brand-ink">
                    {t('profile.rechargeModal.method2Title')}
                  </h3>
                </div>
              </div>
              <div className="space-y-3.5">
                <p className="text-[13px] font-medium leading-relaxed text-brand-muted">
                  {t('profile.rechargeModal.method2Desc')}
                </p>
                <div className="mx-auto w-44 overflow-hidden rounded-[20px] border border-brand-line bg-brand-card">
                  <img src={xiaohongshuQr} alt="Xiaohongshu QR Code" className="h-full w-full object-cover" />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full rounded-xl border border-brand-line bg-brand-card py-3.5 text-[13.5px] font-bold text-brand-ink transition-colors hover:border-brand-ink"
          >
            {t('profile.rechargeModal.cancel')}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

const avatars = [
  'https://api.dicebear.com/7.x/identicon/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/identicon/svg?seed=Milo',
  'https://api.dicebear.com/7.x/identicon/svg?seed=Toby',
  'https://api.dicebear.com/7.x/identicon/svg?seed=Luna',
  'https://api.dicebear.com/7.x/identicon/svg?seed=Jack'
]

export default function ProfilePage() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const isEdit = location.pathname === '/profile/edit'
  const coachSectionRef = useRef(null)
  const tRef = useRef(t)
  const coachLangRef = useRef('')
  const [showFloatingQuickSwitch, setShowFloatingQuickSwitch] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resumeText, setResumeText] = useState('')
  const [resumeNotes, setResumeNotes] = useState('')
  const [cvProfile, setCvProfile] = useState(() => emptyCvProfile())
  const [targetRole, setTargetRole] = useState('')
  const [coach, setCoach] = useState(null)
  const [coachGenerating, setCoachGenerating] = useState(false)
  const [coachJustGenerated, setCoachJustGenerated] = useState(false)
  const [coachTranslating, setCoachTranslating] = useState(false)
  const [coachErr, setCoachErr] = useState(null)
  const [parseBusy, setParseBusy] = useState(false)
  const [extractBusy, setExtractBusy] = useState(false)
  const [note, setNote] = useState(null)
  const [jobSearchStatus, setJobSearchStatus] = useState('seeking')
  const [avatarId, setAvatarId] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [tokens, setTokens] = useState(0)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [pendingRaw, setPendingRaw] = useState('')
  const [rawResumeOpen, setRawResumeOpen] = useState(false)
  const [pendingPreviewOpen, setPendingPreviewOpen] = useState(false)
  const [showRechargeModal, setShowRechargeModal] = useState(false)
  const fileRef = useRef(null)

  const backendUrl = getBackendBaseUrl()

  useEffect(() => {
    tRef.current = t
  }, [t])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        setLoading(false)
        return
      }
      const res = await authenticatedFetch(`${backendUrl}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('load')
      const j = await res.json()
      setResumeText(j.resumeText || '')
      setResumeNotes(j.resumeNotes || '')
      let pJson = j.profileJson || {}
      if (typeof pJson === 'string' && pJson.trim()) {
        try { pJson = JSON.parse(pJson) } catch { pJson = {} }
      }
      setTargetRole(pJson.coachTargetRole || '')
      setCvProfile(mergeCvProfileFromApi(pJson.cvProfile || pJson))
      setCoach(j.resumeCoach || null)
      setJobSearchStatus(j.jobSearchStatus || 'seeking')
      setAvatarId(j.avatarId || null)
      setTokens(j.tokens || 0)
      setUpdatedAt(j.resumeUpdatedAt || null)
      const tr = j.profileJson?.coachTargetRole
      if (typeof tr === 'string') setTargetRole(tr)
      else if (j.resumeCoach?.targetRole) setTargetRole(j.resumeCoach.targetRole)
    } catch {
      setNote({ type: 'err', text: tRef.current('profile.loadErr') })
      setTimeout(() => setNote(null), 2000)
    } finally {
      setLoading(false)
    }
  }, [backendUrl])

  useEffect(() => { void load() }, [load])

  const refreshTokens = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) return

      const res = await authenticatedFetch(`${backendUrl}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return

      const j = await res.json()
      setTokens(j.tokens || 0)
    } catch (err) {
      // Non-fatal: tokens may temporarily be stale.
      console.error('[Profile] Failed to refresh tokens', err)
    }
  }, [backendUrl])

  // Keep token UI in sync across pages (Gallup / Experiences delete / Recharge).
  useEffect(() => {
    const onTokensChanged = () => {
      void refreshTokens()
    }
    window.addEventListener('tokensChanged', onTokensChanged)
    return () => window.removeEventListener('tokensChanged', onTokensChanged)
  }, [refreshTokens])

  useEffect(() => {
    const onScroll = () => {
      setShowFloatingQuickSwitch(window.scrollY > 280)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (location.state?.openRecharge) {
      setShowRechargeModal(true)
    }
  }, [location.state])

  useEffect(() => {
    if (!isEdit) return
    if (location.state?.scrollTo !== 'coach') return
    const el = coachSectionRef.current
    if (!el) return
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [isEdit, location.state])

  const save = async () => {
    setSaving(true)
    setNote(null)

    // SECURITY: Sanitize all string inputs in cvProfile and other fields before saving (prevent injection/XSS)
    const sanitize = (val) => {
      if (typeof val === 'string') return val.replace(/<[^>]*>?/gm, '').trim();
      if (Array.isArray(val)) return val.map(sanitize);
      if (val !== null && typeof val === 'object') {
        const out = {};
        for (const k in val) { out[k] = sanitize(val[k]); }
        return out;
      }
      return val;
    };

    const sanitizedCvProfile = sanitize(cvProfile);
    const sanitizedResumeText = sanitize(resumeText);
    const sanitizedResumeNotes = sanitize(resumeNotes);
    const sanitizedTargetRole = sanitize(targetRole);

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        setSaving(false);
        return;
      }

      const res = await authenticatedFetch(`${backendUrl}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          resumeText: sanitizedResumeText,
          resumeNotes: sanitizedResumeNotes,
          jobSearchStatus,
          avatarId,
          profileJson: { coachTargetRole: sanitizedTargetRole, cvProfile: sanitizedCvProfile },
        }),
      })

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        console.error('[Profile save] Backend error response:', res.status, errBody)
        const details = Array.isArray(errBody.details) ? errBody.details : []
        const detailsText = details.length
          ? details.map((d) => `${d?.path ? d.path + ': ' : ''}${d?.message || ''}`.trim()).join('; ')
          : ''
        throw new Error(`${errBody.error || 'save'}${detailsText ? `: ${detailsText}` : ''}`)
      }

      const data = await res.json()
      setUpdatedAt(data.resumeUpdatedAt || null)
      setNote({ type: 'ok', text: t('profile.saveSuccess') })
      setTimeout(() => setNote(null), 3000)
    } catch (err) {
      console.error('[Profile save]', err);
      setNote({ type: 'err', text: err?.message || t('profile.saveErr') })
      setTimeout(() => setNote(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  const recharge = async (amount) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) return

      const res = await authenticatedFetch(`${backendUrl}/api/profile/recharge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount })
      })
      if (res.ok) {
        setTokens(prev => prev + amount)
        window.dispatchEvent(new Event('tokensChanged'))
        setNote({ type: 'ok', text: t('profile.rechargeModal.success') })
        setTimeout(() => setNote(null), 2000)
      }
    } catch {
      setNote({ type: 'err', text: t('common.error') })
      setTimeout(() => setNote(null), 3000)
    }
  }

  const runCoach = async () => {
    setCoachErr(null)
    setCoachGenerating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        setCoachErr(t('profile.parseNeedAuth'))
        return
      }
      const res = await authenticatedFetch(`${backendUrl}/api/profile/resume-coach`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetRole,
          resumeText: resumeText.trim(),
          coachUiLanguage: i18n.language,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (res.status === 503) {
        setCoachErr(t('profile.coach503'))
        return
      }
      if (!res.ok) {
        setCoachErr(j.details || j.error || t('profile.coachErr'))
        return
      }
      setCoach(j.coach)
      setCoachJustGenerated(true)
      coachLangRef.current = i18n.language
      if (j.coach?.generatedAt) {
        setUpdatedAt(j.coach.generatedAt)
      }
      window.dispatchEvent(new Event('tokensChanged'))
      setNote({ type: 'ok', text: t('profile.coachGenOk') })
      setTimeout(() => setNote(null), 3000)
    } catch {
      setCoachErr(t('profile.coachErr'))
    } finally {
      setCoachGenerating(false)
    }
  }

  const runExtractCv = async () => {
    const src = (pendingRaw || resumeText || '').trim()
    if (src.length < 50) {
      setNote({ type: 'err', text: t('profile.cv.extractNeedText') })
      setTimeout(() => setNote(null), 5000)
      return
    }
    setExtractBusy(true)
    setNote(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('auth')
      const res = await authenticatedFetch(`${backendUrl}/api/profile/extract-cv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ resumeText: src }),
      })
      const j = await res.json().catch(() => ({}))
      if (res.status === 503) {
        setNote({ type: 'err', text: t('profile.coach503') })
        setTimeout(() => setNote(null), 3000)
        return
      }
      if (!res.ok) {
        setNote({ type: 'err', text: j.details || j.error || t('profile.cv.extractErr') })
        setTimeout(() => setNote(null), 3000)
        return
      }
      setCvProfile(mergeCvProfileFromApi(j.cvProfile))
      window.dispatchEvent(new Event('tokensChanged'))
      setNote({ type: 'ok', text: t('profile.cv.extractOk') })
      setTimeout(() => setNote(null), 2000)
    } catch {
      setNote({ type: 'err', text: t('profile.cv.extractErr') })
      setTimeout(() => setNote(null), 3000)
    } finally {
      setExtractBusy(false)
    }
  }

  const onPdf = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || file.type !== 'application/pdf') {
      setNote({ type: 'err', text: t('profile.pdfOnly') })
      setTimeout(() => setNote(null), 3000)
      return
    }
    setParseBusy(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('auth')
      const pdfBase64 = await fileToBase64Data(file)
      const res = await authenticatedFetch(`${backendUrl}/api/profile/resume/parse-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pdfBase64 }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'parse')
      setPendingRaw(j.text || '')
      if (j.text) {
        const clean = j.text.replace(/[●•⚫🌑⦿★■◾▪]/g, '').trim()
        setResumeText(clean)
      }
      setPendingPreviewOpen(false)
      setNote({ type: 'ok', text: t('profile.cv.pdfExtractOk', { n: j.charCount ?? 0 }) })
      setTimeout(() => setNote(null), 2000)
    } catch (err) {
      console.error('[onPdf] error:', err)
      setNote({ type: 'err', text: err?.message || t('profile.parseErr') })
      setTimeout(() => setNote(null), 3000)
    } finally {
      setParseBusy(false)
    }
  }

  const [pendingApplied, setPendingApplied] = useState(false)

  const applyPendingToResume = () => {
    if (!pendingRaw.trim()) return
    const clean = pendingRaw.replace(/[●•⚫🌑⦿★■◾▪]/g, '').trim()
    setResumeText(clean)
    setPendingApplied(true)
    setTimeout(() => setPendingApplied(false), 3000)
  }



  const persistTime = coach?.generatedAt || updatedAt
  const timeStr = persistTime
    ? new Date(persistTime).toLocaleString(i18n.language === 'zh' ? 'zh-CN' : i18n.language === 'de' ? 'de-DE' : 'en-US')
    : null
  const coachLangName = t(`profile.langName.${normalizeUiLang(i18n.language)}`)

  useEffect(() => {
    if (!coach) return
    if (coachGenerating) return
    if (coachLangRef.current === i18n.language) return

    let cancelled = false
    setCoachTranslating(true)
      ; (async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          const token = session?.access_token
          if (!token) return
          const res = await authenticatedFetch(`${backendUrl}/api/profile/resume-coach/translate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              coach,
              coachUiLanguage: i18n.language,
            }),
          })
          const j = await res.json().catch(() => ({}))
          if (!res.ok || cancelled) return
          if (j.coach) {
            setCoach(j.coach)
            coachLangRef.current = i18n.language
          }
        } catch {
        } finally {
          if (!cancelled) setCoachTranslating(false)
        }
      })()
    return () => { cancelled = true }
  }, [i18n.language, coach, coachGenerating, backendUrl])

  if (loading) {
    return (
      <div className="theme-quiet flex min-h-screen flex-col items-center justify-center gap-7 bg-brand-paper">
        <div className="relative">
          <Loader2 className="h-9 w-9 animate-spin text-brand-ink" />
        </div>
        <div className="space-y-2 text-center">
          <p className="animate-pulse text-[11px] text-brand-muted">{t('profile.title')}</p>
          <div className="mx-auto h-0.5 w-12 overflow-hidden rounded-full bg-brand-line">
            <motion.div
              className="h-full bg-brand-violet"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            />
          </div>
        </div>
      </div>
    )
  }

  const pageExitVariants = {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1],
        staggerChildren: 0.1
      }
    }
  }

  if (!isEdit) {
    return (
      <motion.div
        key="profile-display"
        variants={pageExitVariants}
        initial="initial"
        animate="animate"
        className="theme-quiet min-h-screen bg-brand-paper pb-14 pt-[calc(var(--ui-nav-h)+2rem)]"
      >
        <div className="ui-container relative z-10">
          <ProfileDisplayView
            cvProfile={cvProfile}
            resumeText={resumeText}
            resumeNotes={resumeNotes}
            targetRole={targetRole}
            coach={coach}
            t={t}
            i18n={i18n}
            timeStr={timeStr}
            jobSearchStatus={jobSearchStatus}
            avatarId={avatarId}
            showFloatingEditButton={showFloatingQuickSwitch}
            coachTranslating={coachTranslating}
            coachGenerating={coachGenerating}
            runCoach={runCoach}
            tokens={tokens}
            recharge={() => setShowRechargeModal(true)}
          />
        </div>
        <AnimatePresence>
          {showRechargeModal && (
            <RechargeModal
              isOpen={showRechargeModal}
              onClose={() => setShowRechargeModal(false)}
              t={t}
            />
          )}
        </AnimatePresence>
      </motion.div>
    )
  }

  return (
    <motion.div
      key="profile-edit"
      variants={pageExitVariants}
      initial="initial"
      animate="animate"
      className="theme-quiet min-h-screen bg-brand-paper pb-14 pt-[calc(var(--ui-nav-h)+2rem)]"
    >
      <div className="ui-container relative z-10">
          <ProfileEditView
            cvProfile={cvProfile} setCvProfile={setCvProfile} resumeText={resumeText} setResumeText={setResumeText}
            resumeNotes={resumeNotes} setResumeNotes={setResumeNotes} targetRole={targetRole} setTargetRole={setTargetRole}
            coach={coach} coachGenerating={coachGenerating} coachJustGenerated={coachJustGenerated} coachErr={coachErr} runCoach={runCoach}
            save={save} saving={saving} note={note} setNote={setNote} parseBusy={parseBusy} extractBusy={extractBusy} onPdf={onPdf} fileRef={fileRef} runExtractCv={runExtractCv}
            pendingRaw={pendingRaw} setPendingRaw={setPendingRaw} pendingPreviewOpen={pendingPreviewOpen} setPendingPreviewOpen={setPendingPreviewOpen}
            applyPendingToResume={applyPendingToResume} pendingApplied={pendingApplied} jobSearchStatus={jobSearchStatus} setJobSearchStatus={setJobSearchStatus}
            avatarId={avatarId} setAvatarId={setAvatarId} uploadingAvatar={uploadingAvatar} setUploadingAvatar={setUploadingAvatar} t={t}
          />
      </div>
      <AnimatePresence>
        {showRechargeModal && (
          <RechargeModal
            isOpen={showRechargeModal}
            onClose={() => setShowRechargeModal(false)}
            t={t}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function ProfileEditView({
  cvProfile, setCvProfile, resumeText, setResumeText, resumeNotes, setResumeNotes,
  targetRole, setTargetRole, coach, coachGenerating, coachJustGenerated, coachErr, runCoach,
  save, saving, note, setNote, parseBusy, extractBusy, onPdf, fileRef, runExtractCv,
  pendingRaw, setPendingRaw, pendingPreviewOpen, setPendingPreviewOpen, applyPendingToResume, pendingApplied,
  jobSearchStatus, setJobSearchStatus, avatarId, setAvatarId, uploadingAvatar, setUploadingAvatar, t
}) {
  const [activeTab, setActiveTab] = useState('basic')

  const skillsText = cvProfile.skills.join('\n')
  const setSkillsFromText = (txt) => {
    const skills = txt.split('\n').map((s) => s.trim()).filter(Boolean)
    setCvProfile((p) => ({ ...p, skills }))
  }

  const tabs = [
    { id: 'basic', label: t('profile.cv.basic'), icon: User },
    { id: 'experience', label: t('profile.cv.work'), icon: Briefcase },
    { id: 'education', label: t('profile.cv.education'), icon: GraduationCap },
    { id: 'projects', label: t('profile.cv.projects'), icon: FolderKanban },
    { id: 'skills', label: t('profile.cv.skills'), icon: Tags },
    { id: 'awards', label: t('profile.cv.awards'), icon: Award },
    { id: 'resume', label: t('profile.cv.rawResumeTitle'), icon: FileText },
  ]

  return (
    <div className="space-y-10">
      <header className="flex flex-col justify-between gap-7 border-b border-brand-line pb-8 md:flex-row md:items-end">
        <div className="min-w-0 space-y-2">
          {/* 中文标题不加 uppercase */}
          <h1 className="font-brand text-[34px] font-semibold leading-tight tracking-tight text-brand-ink sm:text-[40px]">
            {t('profile.editProfile')}
          </h1>
          <p className="text-[14px] leading-relaxed text-brand-muted">
            {t('profile.editHint')}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-3 md:items-end">
          {coachGenerating && (
            <div className="flex animate-pulse items-center gap-2 self-start rounded-xl border border-brand-line bg-brand-inset px-3 py-1.5 text-[11px] font-bold text-brand-ink md:self-end">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-ink" aria-hidden="true" />
              {t('profile.coachGeneratingHint')}
            </div>
          )}
          {/* 移动端换行显示，不再横向滚动——否则「保存」会被推出可视区 */}
          <div className="flex flex-wrap items-center gap-2.5 md:justify-end">
            {coachErr && (
              <div className="rounded-lg border border-brand-danger/30 bg-brand-danger/[0.06] px-3 py-1.5 text-[11px] font-bold text-brand-danger">
                {coachErr}
              </div>
            )}
            <button
              onClick={runCoach}
              disabled={coachGenerating || (resumeText.trim().length < 80)}
              className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-brand-line bg-brand-card px-4 py-2.5 text-[13px] font-bold text-brand-ink transition-colors hover:border-brand-ink disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-brand-line"
            >
              {coachGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-brand-violet" />}
              <span>{coachGenerating ? t('profile.coachRunning') : t('profile.coachRun')}</span>
            </button>
            {!coachGenerating && coachJustGenerated && coach && (
              <Link
                to="/profile"
                className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-brand-line bg-brand-card px-4 py-2.5 text-[13px] font-bold text-brand-ink transition-colors hover:border-brand-ink"
              >
                <BarChart3 className="h-4 w-4 text-brand-violet" />
                <span>{t('profile.coachViewReport')}</span>
              </Link>
            )}
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 whitespace-nowrap rounded-xl bg-brand-ink px-4 py-2.5 text-[13px] font-semibold text-brand-on-ink transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              <span>{saving ? t('common.saving') : t('common.save')}</span>
            </button>
            <Link
              to="/profile"
              className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-brand-line bg-brand-card px-4 py-2.5 text-[13px] font-bold text-brand-ink transition-colors hover:border-brand-ink"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
              <span>{t('common.back')}</span>
            </Link>
          </div>
          <AnimatePresence>
            {note && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className={`self-start rounded-xl border px-3.5 py-2 text-[12px] font-bold leading-snug md:self-end ${note.type === 'ok'
                    ? 'border-brand-success/30 bg-brand-success/[0.08] text-brand-success'
                    : 'border-brand-danger/30 bg-brand-danger/[0.06] text-brand-danger'
                  }`}
              >
                {note.text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-4 lg:gap-10">
        <aside className="min-w-0 lg:col-span-1">
          {/* <lg：横向可滚动的 tab 条（scrollbar-hide 已在 index.css 有真实实现）
              lg+：左侧 sticky 纵向侧栏 */}
          <nav className="scrollbar-hide flex snap-x gap-2 overflow-x-auto pb-1 lg:sticky lg:top-[calc(var(--ui-nav-h)+1.5rem)] lg:flex-col lg:gap-1 lg:overflow-x-visible lg:pb-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 snap-start items-center gap-2.5 whitespace-nowrap rounded-xl border px-4 py-2.5 text-[13px] font-bold transition-colors lg:w-full lg:px-5 lg:py-3.5 ${activeTab === tab.id
                  ? 'border-brand-ink bg-brand-card text-brand-ink ring-1 ring-brand-ink'
                  : 'border-brand-line bg-brand-card text-brand-muted hover:border-brand-ink hover:text-brand-ink'
                  }`}
              >
                <tab.icon className="h-4 w-4 shrink-0" />
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 space-y-10 lg:col-span-3">
          {activeTab === 'basic' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-12"
            >
              <section className="space-y-10">
                <SectionTitle icon={User}>{t('profile.cv.basic')}</SectionTitle>

                {/* Structured Extraction UI */}
                <div className="space-y-5 rounded-[22px] border border-brand-line bg-brand-inset p-5 sm:p-6">
                  <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                    <div className="min-w-0 space-y-1">
                      <h3 className="font-brand text-[18px] font-semibold tracking-tight text-brand-ink">{t('profile.cv.structuredTitle')}</h3>
                      <p className="text-[12.5px] text-brand-muted">{t('profile.cv.structuredHint')}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => void onPdf(e)} />
                      <button
                        onClick={() => fileRef.current?.click()}
                        disabled={parseBusy}
                        className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-brand-line bg-brand-card px-4 py-2.5 text-[13px] font-bold text-brand-ink transition-colors hover:border-brand-ink disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {parseBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {t('profile.uploadPdf')}
                      </button>
                      <button
                        onClick={() => void runExtractCv()}
                        disabled={extractBusy || parseBusy || !(pendingRaw || resumeText || '').trim()}
                        className="flex items-center gap-2 whitespace-nowrap rounded-xl bg-brand-ink px-4 py-2.5 text-[13px] font-semibold text-brand-on-ink transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {extractBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                        {extractBusy ? t('profile.cv.extracting') : t('profile.cv.extractBtn')}
                      </button>
                    </div>
                  </div>

                  {pendingRaw.trim() && (
                    <div className="space-y-3.5 border-t border-brand-line pt-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-[11px] text-brand-muted">{t('profile.cv.extractedPreviewLabel')}</p>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <button
                            onClick={() => setPendingPreviewOpen(!pendingPreviewOpen)}
                            className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-brand-line bg-brand-card px-4 py-2.5 text-[13px] font-bold text-brand-ink transition-colors hover:border-brand-ink"
                          >
                            <Eye className="h-4 w-4" />
                            {pendingPreviewOpen ? t('common.hide') : t('common.show')}
                          </button>
                          <div className="group/tip relative">
                            <button
                              onClick={applyPendingToResume}
                              className="flex items-center gap-2 whitespace-nowrap rounded-xl bg-brand-ink px-4 py-2.5 text-[13px] font-semibold text-brand-on-ink transition-opacity duration-200 hover:opacity-90"
                            >
                              <ArrowRight className="h-4 w-4" />
                              {t('profile.cv.applyToInterviewResume')}
                            </button>
                            <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-xl bg-brand-ink px-3.5 py-2.5 text-center text-[12px] font-medium leading-relaxed text-brand-on-ink opacity-0 transition-opacity duration-200 group-hover/tip:opacity-100">
                              {t('profile.cv.applyToInterviewResumeHint')}
                              <div className="absolute left-1/2 top-full -mt-1 h-2 w-2 -translate-x-1/2 rotate-45 bg-brand-ink" />
                            </div>
                          </div>
                          <AnimatePresence>
                            {pendingApplied && (
                              <motion.div
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -8 }}
                                className="flex items-center gap-1.5 rounded-lg border border-brand-success/30 bg-brand-success/[0.08] px-2.5 py-1.5 text-[11px] font-bold text-brand-success"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {t('profile.cv.applySuccess')}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                      {pendingPreviewOpen && (
                        <motion.textarea
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          value={pendingRaw}
                          onChange={(e) => setPendingRaw(e.target.value)}
                          spellCheck={false}
                          className="max-h-60 min-h-[120px] w-full resize-y overflow-auto rounded-[18px] border border-brand-line bg-brand-card p-5 font-mono text-[12.5px] leading-relaxed text-brand-muted"
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Avatar Selection */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <label className="block text-[12.5px] font-bold text-brand-ink">{t('profile.chooseAvatar')}</label>
                  </div>
                  <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
                    {/* Default User Icon */}
                    <button
                      onClick={() => setAvatarId(null)}
                      className={`relative flex h-20 items-center justify-center rounded-2xl border transition-colors ${!avatarId
                          ? 'border-brand-ink bg-brand-card text-brand-ink ring-1 ring-brand-ink'
                          : 'border-brand-line bg-brand-card opacity-50 hover:border-brand-ink hover:opacity-100'
                        }`}
                    >
                      <User className="h-6 w-6 text-brand-muted" />
                    </button>

                    {/* Presets */}
                    {avatars.map((url) => (
                      <button
                        key={url}
                        onClick={() => setAvatarId(url)}
                        className={`group relative h-20 overflow-hidden rounded-2xl border transition-transform ${avatarId === url
                            ? 'z-10 scale-[1.05] border-brand-ink ring-1 ring-brand-ink'
                            : 'border-brand-line opacity-70 grayscale hover:scale-[1.05] hover:opacity-100 hover:grayscale-0'
                          }`}
                      >
                        <img src={url} alt="Avatar" className="w-full h-full object-cover" />
                        {avatarId === url && (
                          <div className="absolute right-1 top-1 grid h-[18px] w-[18px] place-items-center rounded-full bg-brand-ink text-brand-on-ink">
                            <CheckCircle2 className="h-3 w-3" />
                          </div>
                        )}
                      </button>
                    ))}

                    {/* Custom Upload Button */}
                    <input
                      type="file"
                      id="avatar-upload"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        if (file.size > 2 * 1024 * 1024) {
                          setNote({ type: 'err', text: t('profile.cv.fileTooLarge') })
                          setTimeout(() => setNote(null), 5000)
                          return
                        }

                        setUploadingAvatar(true)
                        try {
                          const { data: { user } } = await supabase.auth.getUser()
                          if (!user) throw new Error('No user')

                          const fileExt = file.name.split('.').pop()
                          const fileName = `${user.id}-${Date.now()}.${fileExt}`
                          const filePath = `user_avatars/${fileName}`

                          const { error: uploadError } = await supabase.storage
                            .from('avatars')
                            .upload(filePath, file, { upsert: true })

                          if (uploadError) throw uploadError

                          const { data: { publicUrl } } = supabase.storage
                            .from('avatars')
                            .getPublicUrl(filePath)

                          setAvatarId(publicUrl)
                          setNote({ type: 'ok', text: 'Avatar uploaded' })
                          setTimeout(() => setNote(null), 3000)
                        } catch (err) {
                          console.error('Error uploading avatar:', err)
                          setNote({ type: 'err', text: err?.message || 'Upload failed' })
                          setTimeout(() => setNote(null), 5000)
                        } finally {
                          setUploadingAvatar(false)
                        }
                      }}
                    />
                    <label
                      htmlFor="avatar-upload"
                      className={`relative flex h-20 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed transition-colors ${uploadingAvatar ? 'pointer-events-none opacity-50' : ''} ${(avatarId && !avatars.includes(avatarId))
                          ? 'border-brand-ink bg-brand-inset'
                          : 'border-brand-line bg-brand-card hover:border-brand-ink hover:bg-brand-inset'
                        }`}
                    >
                      {uploadingAvatar ? (
                        <Loader2 className="h-5 w-5 animate-spin text-brand-muted" />
                      ) : (avatarId && !avatars.includes(avatarId)) ? (
                        <div className="relative h-full w-full overflow-hidden rounded-2xl">
                          <img src={avatarId} alt="Custom" className="h-full w-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center bg-brand-ink/40 opacity-0 transition-opacity hover:opacity-100">
                            <Upload className="h-5 w-5 text-brand-on-ink" />
                          </div>
                        </div>
                      ) : (
                        <>
                          <Plus className="h-5 w-5 text-brand-muted" />
                          {/* i18next 找不到 key 时会返回 key 字符串（真值），所以 `|| 'Upload'` 永远不生效 */}
                          <span className="mt-1 text-[11px] text-brand-muted">{t('common.upload')}</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="block text-[12.5px] font-bold text-brand-ink">{t('profile.cv.fullName')}</label>
                    <input className={inputClass} value={cvProfile.fullName} onChange={(e) => setCvProfile({ ...cvProfile, fullName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[12.5px] font-bold text-brand-ink">{t('profile.cv.gender')}</label>
                    <select className={inputClass} value={cvProfile.gender} onChange={(e) => setCvProfile({ ...cvProfile, gender: e.target.value })}>
                      <option value="">{t('profile.cv.genderEmpty')}</option>
                      <option value="male">{t('profile.cv.genderMale')}</option>
                      <option value="female">{t('profile.cv.genderFemale')}</option>
                      <option value="other">{t('profile.cv.genderOther')}</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[12.5px] font-bold text-brand-ink">{t('profile.cv.email')}</label>
                    <input className={inputClass} value={cvProfile.email} onChange={(e) => setCvProfile({ ...cvProfile, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[12.5px] font-bold text-brand-ink">{t('profile.cv.phone')}</label>
                    <input className={inputClass} value={cvProfile.phone} onChange={(e) => setCvProfile({ ...cvProfile, phone: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[12.5px] font-bold text-brand-ink">{t('profile.cv.summary')}</label>
                  <textarea className={`${inputClass} min-h-[160px] resize-none leading-relaxed`} value={cvProfile.summary} onChange={(e) => setCvProfile({ ...cvProfile, summary: e.target.value })} />
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'experience' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-12"
            >
              <section className="space-y-8">
                <SectionTitle icon={Briefcase}>{t('profile.cv.work')}</SectionTitle>
                <div className="space-y-8">
                  {(cvProfile.workExperience || []).map((exp, idx) => (
                    <div key={idx} className="brand-float group relative space-y-5 rounded-[22px] px-6 py-6">
                      <button
                        type="button"
                        onClick={() => {
                          const newExp = (cvProfile.workExperience || []).filter((_, i) => i !== idx)
                          setCvProfile({ ...cvProfile, workExperience: newExp })
                        }}
                        className="absolute right-4 top-4 rounded-lg p-2 text-brand-muted opacity-0 transition-all hover:bg-brand-danger/10 hover:text-brand-danger group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-[12.5px] font-bold text-brand-ink">{t('profile.cv.phCompany')}</label>
                          <input
                            className={inputClass}
                            value={exp.company}
                            onChange={(e) => {
                              const newExp = [...(cvProfile.workExperience || [])]
                              newExp[idx] = { ...exp, company: e.target.value }
                              setCvProfile({ ...cvProfile, workExperience: newExp })
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[12.5px] font-bold text-brand-ink">{t('profile.cv.phExpTitle')}</label>
                          <input
                            className={inputClass}
                            value={exp.title}
                            onChange={(e) => {
                              const newExp = [...(cvProfile.workExperience || [])]
                              newExp[idx] = { ...exp, title: e.target.value }
                              setCvProfile({ ...cvProfile, workExperience: newExp })
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[12.5px] font-bold text-brand-ink">{t('profile.cv.phDuration')}</label>
                          <input
                            className={inputClass}
                            placeholder="e.g. 2020 - 2023"
                            value={exp.duration || (exp.startDate && exp.endDate ? `${exp.startDate} - ${exp.endDate}` : exp.startDate || exp.endDate || '')}
                            onChange={(e) => {
                              const newExp = [...(cvProfile.workExperience || [])]
                              newExp[idx] = { ...exp, duration: e.target.value }
                              setCvProfile({ ...cvProfile, workExperience: newExp })
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[12.5px] font-bold text-brand-ink">{t('profile.cv.phLocation')}</label>
                          <input
                            className={inputClass}
                            value={exp.location}
                            onChange={(e) => {
                              const newExp = [...(cvProfile.workExperience || [])]
                              newExp[idx] = { ...exp, location: e.target.value }
                              setCvProfile({ ...cvProfile, workExperience: newExp })
                            }}
                          />
                        </div>
                      </div>
                      <MultiLineInput
                        label={t('profile.cv.phHighlights') || t('profile.cv.phExpRole')}
                        lines={parseBullets(exp.highlights)}
                        t={t}
                        inputClass={inputClass}
                        onChange={(lines) => {
                          const newExp = [...(cvProfile.workExperience || [])]
                          newExp[idx] = { ...exp, highlights: lines.join('\n') }
                          setCvProfile({ ...cvProfile, workExperience: newExp })
                        }}
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCvProfile({ ...cvProfile, workExperience: [...(cvProfile.workExperience || []), emptyWork()] })}
                    className="flex w-full items-center justify-center gap-2 rounded-[22px] border border-dashed border-brand-line bg-brand-card py-6 text-[13.5px] font-bold text-brand-muted transition-colors hover:border-brand-ink hover:text-brand-ink"
                  >
                    <Plus className="h-5 w-5 text-brand-violet" />
                    {t('profile.cv.add')}
                  </button>
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'education' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-12"
            >
              <section className="space-y-8">
                <SectionTitle icon={GraduationCap}>{t('profile.cv.education')}</SectionTitle>
                <div className="space-y-8">
                  {cvProfile.education.map((edu, idx) => (
                    <div key={idx} className="brand-float group relative space-y-5 rounded-[22px] px-6 py-6">
                      <button
                        type="button"
                        onClick={() => {
                          const newEdu = cvProfile.education.filter((_, i) => i !== idx)
                          setCvProfile({ ...cvProfile, education: newEdu })
                        }}
                        className="absolute right-4 top-4 rounded-lg p-2 text-brand-muted opacity-0 transition-all hover:bg-brand-danger/10 hover:text-brand-danger group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-[12.5px] font-bold text-brand-ink">{t('profile.cv.phSchool')}</label>
                          <input
                            className={inputClass}
                            value={edu.institution || edu.school || ''}
                            onChange={(e) => {
                              const newEdu = [...cvProfile.education]
                              newEdu[idx] = { ...edu, institution: e.target.value }
                              setCvProfile({ ...cvProfile, education: newEdu })
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[12.5px] font-bold text-brand-ink">{t('profile.cv.phField')}</label>
                          <input
                            className={inputClass}
                            value={edu.field || edu.major || ''}
                            onChange={(e) => {
                              const newEdu = [...cvProfile.education]
                              newEdu[idx] = { ...edu, field: e.target.value }
                              setCvProfile({ ...cvProfile, education: newEdu })
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[12.5px] font-bold text-brand-ink">{t('profile.cv.phDegree')}</label>
                          <input
                            className={inputClass}
                            value={edu.degree}
                            onChange={(e) => {
                              const newEdu = [...cvProfile.education]
                              newEdu[idx] = { ...edu, degree: e.target.value }
                              setCvProfile({ ...cvProfile, education: newEdu })
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[12.5px] font-bold text-brand-ink">{t('profile.cv.phDuration')}</label>
                          <input
                            className={inputClass}
                            placeholder="e.g. 2020 - 2024"
                            value={edu.duration || (edu.startDate && edu.endDate ? `${edu.startDate} - ${edu.endDate}` : edu.startDate || edu.endDate || '')}
                            onChange={(e) => {
                              const newEdu = [...cvProfile.education]
                              newEdu[idx] = { ...edu, duration: e.target.value }
                              setCvProfile({ ...cvProfile, education: newEdu })
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCvProfile({ ...cvProfile, education: [...cvProfile.education, emptyEducation()] })}
                    className="flex w-full items-center justify-center gap-2 rounded-[22px] border border-dashed border-brand-line bg-brand-card py-6 text-[13.5px] font-bold text-brand-muted transition-colors hover:border-brand-ink hover:text-brand-ink"
                  >
                    <Plus className="h-5 w-5 text-brand-violet" />
                    {t('profile.cv.add')}
                  </button>
                </div>
              </section>
            </motion.div>
          )}
          {activeTab === 'projects' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-12"
            >
              <section className="space-y-8">
                <SectionTitle icon={FolderKanban}>{t('profile.cv.projects')}</SectionTitle>
                <div className="space-y-8">
                  {cvProfile.projects.map((pr, idx) => (
                    <div key={idx} className="brand-float group relative space-y-5 rounded-[22px] px-6 py-6">
                      <button
                        type="button"
                        onClick={() => {
                          const newPr = cvProfile.projects.filter((_, i) => i !== idx)
                          setCvProfile({ ...cvProfile, projects: newPr })
                        }}
                        className="absolute right-4 top-4 rounded-lg p-2 text-brand-muted opacity-0 transition-all hover:bg-brand-danger/10 hover:text-brand-danger group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-[12.5px] font-bold text-brand-ink">{t('profile.cv.phProjName')}</label>
                          <input
                            className={inputClass}
                            value={pr.name}
                            onChange={(e) => {
                              const newPr = [...cvProfile.projects]
                              newPr[idx] = { ...pr, name: e.target.value }
                              setCvProfile({ ...cvProfile, projects: newPr })
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[12.5px] font-bold text-brand-ink">{t('profile.cv.phProjRole')}</label>
                          <input
                            className={inputClass}
                            value={pr.role}
                            onChange={(e) => {
                              const newPr = [...cvProfile.projects]
                              newPr[idx] = { ...pr, role: e.target.value }
                              setCvProfile({ ...cvProfile, projects: newPr })
                            }}
                          />
                        </div>
                      </div>
                      <MultiLineInput
                        label={t('profile.cv.phProjDesc')}
                        lines={parseBullets(pr.description)}
                        t={t}
                        inputClass={inputClass}
                        onChange={(lines) => {
                          const newPr = [...cvProfile.projects]
                          newPr[idx] = { ...pr, description: lines.join('\n') }
                          setCvProfile({ ...cvProfile, projects: newPr })
                        }}
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCvProfile({ ...cvProfile, projects: [...cvProfile.projects, emptyProject()] })}
                    className="flex w-full items-center justify-center gap-2 rounded-[22px] border border-dashed border-brand-line bg-brand-card py-6 text-[13.5px] font-bold text-brand-muted transition-colors hover:border-brand-ink hover:text-brand-ink"
                  >
                    <Plus className="h-5 w-5 text-brand-violet" />
                    {t('profile.cv.add')}
                  </button>
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'skills' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-12"
            >
              <div className="grid lg:grid-cols-2 gap-12">
                <section className="space-y-8">
                  <SectionTitle icon={Tags}>{t('profile.cv.skills')}</SectionTitle>
                  <div className="space-y-4">
                    <p className="text-[12px] text-brand-muted">{t('profile.cv.skillsHint')}</p>
                    <textarea
                      rows={12}
                      className={`${inputClass} font-mono text-xs leading-relaxed min-h-[400px]`}
                      value={skillsText}
                      onChange={(e) => setSkillsFromText(e.target.value)}
                      placeholder={t('profile.cv.skillsPlaceholder')}
                    />
                  </div>
                </section>

                <section className="space-y-8">
                  <SectionTitle icon={Languages}>{t('profile.cv.languages')}</SectionTitle>
                  <div className="space-y-4">
                    {cvProfile.languages.map((lang, idx) => (
                      <div key={idx} className="flex gap-4 items-center">
                        <input
                          className={inputClass}
                          placeholder={t('profile.cv.phLangName')}
                          value={lang.name}
                          onChange={(e) => {
                            const newLang = [...cvProfile.languages]
                            newLang[idx] = { ...lang, name: e.target.value }
                            setCvProfile({ ...cvProfile, languages: newLang })
                          }}
                        />
                        <input
                          className={inputClass}
                          placeholder={t('profile.cv.phLangLevel')}
                          value={lang.proficiency}
                          onChange={(e) => {
                            const newLang = [...cvProfile.languages]
                            newLang[idx] = { ...lang, proficiency: e.target.value }
                            setCvProfile({ ...cvProfile, languages: newLang })
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newLang = cvProfile.languages.filter((_, i) => i !== idx)
                            setCvProfile({ ...cvProfile, languages: newLang })
                          }}
                          className="shrink-0 rounded-lg p-2.5 text-brand-muted transition-colors hover:bg-brand-danger/10 hover:text-brand-danger"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCvProfile({ ...cvProfile, languages: [...cvProfile.languages, emptyLanguage()] })}
                      className="flex w-full items-center justify-center gap-2 rounded-[22px] border border-dashed border-brand-line bg-brand-card py-6 text-[13.5px] font-bold text-brand-muted transition-colors hover:border-brand-ink hover:text-brand-ink"
                    >
                      <Plus className="h-5 w-5 text-brand-violet" />
                      {t('profile.cv.add')}
                    </button>
                  </div>
                </section>
              </div>
            </motion.div>
          )}

          {activeTab === 'awards' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-12"
            >
              <section className="space-y-8">
                <SectionTitle icon={Award}>{t('profile.cv.awards')}</SectionTitle>
                <div className="space-y-4">
                  {cvProfile.awards.map((aw, idx) => (
                    <div key={idx} className="brand-float group relative space-y-5 rounded-[22px] px-6 py-6">
                      <button
                        type="button"
                        onClick={() => {
                          const newAw = cvProfile.awards.filter((_, i) => i !== idx)
                          setCvProfile({ ...cvProfile, awards: newAw })
                        }}
                        className="absolute right-4 top-4 rounded-lg p-2 text-brand-muted opacity-0 transition-all hover:bg-brand-danger/10 hover:text-brand-danger group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-[12.5px] font-bold text-brand-ink">{t('profile.cv.phAwardTitle')}</label>
                          <input
                            className={inputClass}
                            value={aw.title}
                            onChange={(e) => {
                              const newAw = [...cvProfile.awards]
                              newAw[idx] = { ...aw, title: e.target.value }
                              setCvProfile({ ...cvProfile, awards: newAw })
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[12.5px] font-bold text-brand-ink">{t('profile.cv.phYear')}</label>
                          <input
                            className={inputClass}
                            value={aw.year}
                            onChange={(e) => {
                              const newAw = [...cvProfile.awards]
                              newAw[idx] = { ...aw, year: e.target.value }
                              setCvProfile({ ...cvProfile, awards: newAw })
                            }}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[12.5px] font-bold text-brand-ink">{t('profile.cv.phIssuer')}</label>
                        <input
                          className={inputClass}
                          value={aw.issuer}
                          onChange={(e) => {
                            const newAw = [...cvProfile.awards]
                            newAw[idx] = { ...aw, issuer: e.target.value }
                            setCvProfile({ ...cvProfile, awards: newAw })
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCvProfile({ ...cvProfile, awards: [...cvProfile.awards, emptyAward()] })}
                    className="flex w-full items-center justify-center gap-2 rounded-[22px] border border-dashed border-brand-line bg-brand-card py-6 text-[13.5px] font-bold text-brand-muted transition-colors hover:border-brand-ink hover:text-brand-ink"
                  >
                    <Plus className="h-5 w-5 text-brand-violet" />
                    {t('profile.cv.add')}
                  </button>
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'resume' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-12"
            >
              <section className="space-y-8">
                <SectionTitle icon={FileText}>{t('profile.cv.rawResumeTitle')}</SectionTitle>
                <div className="space-y-6">
                  <p className="max-w-2xl text-[13px] leading-relaxed text-brand-muted">
                    {t('profile.cv.rawResumeHint')}
                  </p>
                  <textarea
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    className={`${inputClass} min-h-[500px] font-mono text-sm leading-relaxed`}
                    placeholder={t('profile.placeholder')}
                  />
                  <div className="space-y-2">
                    <label className="block text-[12.5px] font-bold text-brand-ink">{t('profile.sectionNotes')}</label>
                    <textarea
                      value={resumeNotes}
                      onChange={(e) => setResumeNotes(e.target.value)}
                      className={`${inputClass} min-h-[120px]`}
                      placeholder={t('profile.notesPh')}
                    />
                  </div>
                </div>
              </section>
            </motion.div>
          )}
        </main>
      </div>
    </div>
  )
}
