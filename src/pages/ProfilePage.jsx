import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { getBackendBaseUrl } from '../lib/backendBase'
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
  Pencil, Eye, ArrowUpRight, Zap, ArrowRight, BrainCircuit, Share2, MessageCircle, ExternalLink,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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
        if (m) return <strong key={i} className="font-semibold text-slate-900 dark:text-white">{m[1]}</strong>
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
    <div className="mb-6 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
        <Icon className="w-5 h-5" aria-hidden />
      </div>
      <h2 className="text-xl font-bold font-serif tracking-tight text-slate-900 dark:text-white">{children}</h2>
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
          className="text-slate-100 dark:text-slate-800"
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
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>
      </svg>
      {/* Central Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="flex items-baseline justify-center">
          <span className="text-5xl font-black font-serif text-slate-900 dark:text-white leading-none">
            {Math.round(percentage)}
          </span>
          <span className="text-xl font-bold text-slate-400 dark:text-slate-600 ml-1">/100</span>
        </div>
        <div className={`mt-2 text-xs font-black uppercase tracking-widest ${percentage > 80 ? 'text-emerald-500' :
          percentage > 60 ? 'text-primary-500' :
            'text-orange-500'
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
    <div className="space-y-12">
      {/* New Compact Professional Resume Score Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-premium p-8 bg-white dark:bg-slate-950 overflow-hidden relative group"
      >
        <div className="flex flex-col lg:flex-row items-center gap-8 relative z-10">
          {/* Left: Compact Gauge */}
          <div className="shrink-0">
            <ResumeScoreGauge score={overallScore} size={160} />
          </div>

          {/* Right: Info & CTA */}
          <div className="flex-1 space-y-6 text-center lg:text-left">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-center gap-4 justify-center lg:justify-start">
                <div className="p-3 bg-primary-50 dark:bg-primary-950/30 rounded-2xl border border-primary-100 dark:border-primary-900/50 shadow-sm">
                  <FileText className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-black font-serif tracking-tight text-slate-900 dark:text-white leading-tight">OfferClaw Resume Score</h3>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">AI Diagnostic Engine</p>
                </div>
              </div>
              <button
                onClick={scrollToSummary}
                className="px-6 py-2.5 rounded-full border border-slate-900 dark:border-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-all shadow-lg active:scale-95"
              >
                {t('profile.scoreDetails', '查看诊断详情')}
              </button>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-bold max-w-2xl bg-slate-50 dark:bg-slate-900/50 p-5 rounded-3xl border border-slate-100 dark:border-slate-800">
              {t('profile.scoreInsight', "您的简历在内容深度和逻辑性上表现出色。通过进一步细化量化指标，可以显著提升针对 Top 级雇主的竞争力。")}
            </p>

            {/* Other scores with upgraded contrast */}
            <div className="flex flex-wrap lg:flex-nowrap gap-3 pt-2">
              {otherScores.map(c => (
                <div key={c.key} className="flex-1 min-w-[120px] flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary-500 transition-colors group/pill">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-slate-400 opacity-70 group-hover/pill:opacity-100 whitespace-nowrap">{c.label}</span>
                  <div className="flex items-baseline">
                    <span className="text-lg font-black font-serif text-slate-900 dark:text-white">{c.val || 0}</span>
                    <span className="text-[10px] font-bold text-slate-400 ml-0.5">/10</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Decorative corner accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary-600/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
      </motion.div>

      <motion.section
        ref={summaryRef}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-premium p-8 sm:p-12 bg-slate-900 text-white border-0 overflow-visible relative scroll-mt-24"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
        <SectionTitle icon={Sparkles}>
          <span className="text-white">{t('profile.coachSummary')}</span>
        </SectionTitle>
        <div className="relative z-10">
          <div className="text-lg leading-relaxed text-slate-300 whitespace-pre-wrap font-medium">
            <RichText text={coach.overallEvaluation} />
          </div>
        </div>
      </motion.section>

      {coach.macroInsights?.length > 0 && (
        <section>
          <SectionTitle icon={Telescope}>
            {t('profile.coachMacro')}
          </SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            {coach.macroInsights.map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-4 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 items-start"
              >
                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary-600 shrink-0" />
                <RichText text={line} className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed" />
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
          <div className="space-y-4">
            {coach.highlights.map((h, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-4 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 items-start shadow-sm shadow-emerald-500/5"
              >
                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 ring-4 ring-emerald-500/10" />
                <RichText text={h} className="text-sm font-bold text-slate-800 dark:text-emerald-50 leading-relaxed" />
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
          <div className="space-y-6">
            {coach.priorityImprovements.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 transition-all hover:border-slate-900 dark:hover:border-white"
              >
                <div className="flex flex-col gap-4">
                  <h3 className="text-lg font-black font-serif text-slate-900 dark:text-white">{p.title}</h3>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4 p-5 rounded-2xl bg-orange-50/40 dark:bg-orange-950/10 border border-orange-200 dark:border-orange-900/30 relative overflow-hidden">
                      <div className="relative z-10 space-y-2">
                        <span className="text-[10px] uppercase font-black tracking-widest text-orange-600">{t('profile.coachIssue')}</span>
                        <div className="flex gap-3 items-start">
                          <div className="mt-2 w-1 h-1 rounded-full bg-orange-400 shrink-0" />
                          <p className="text-sm font-bold text-slate-800 dark:text-orange-50 leading-relaxed"><RichText text={p.problem} /></p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4 p-5 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                      <div className="space-y-2">
                        <span className="text-[10px] uppercase font-black tracking-widest text-primary-600">{t('profile.coachAction')}</span>
                        <div className="flex gap-3 items-start">
                          <div className="mt-2 w-1 h-1 rounded-full bg-primary-400 shrink-0" />
                          <p className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed"><RichText text={p.suggestedAction} /></p>
                        </div>
                      </div>
                    </div>
                  </div>
                  {p.rewriteExample && (
                    <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-black tracking-widest text-emerald-600 mb-2 block">{t('profile.coachExample')}</span>
                      <div className="text-sm italic text-slate-700 dark:text-slate-300"><SanitizedListText text={p.rewriteExample} /></div>
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
          <div className="space-y-8">
            {coach.moduleDeepDives.map((m, i) => (
              <div key={i} className="p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-8 transition-all hover:border-slate-300">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-600">
                  <Zap className="w-3 h-3 text-primary-600" />
                  {m.moduleTitle}
                </div>

                <div className="grid gap-8 md:grid-cols-3">
                  <div className="space-y-3">
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 border-b border-slate-100 pb-1 block w-fit">{t('profile.coachFinding')}</span>
                    <p className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed"><RichText text={m.finding} /></p>
                  </div>
                  <div className="space-y-3">
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 border-b border-slate-100 pb-1 block w-fit">{t('profile.coachWhy')}</span>
                    <p className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed"><RichText text={m.whyImportant} /></p>
                  </div>
                  <div className="space-y-3">
                    <span className="text-[10px] uppercase font-black tracking-widest text-primary-600 border-b border-primary-100 pb-1 block w-fit">{t('profile.coachSuggest')}</span>
                    <p className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed italic"><RichText text={m.modificationSuggestion} /></p>
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="p-6 rounded-2xl border border-orange-200 dark:border-orange-900/30 bg-orange-50/30">
                    <span className="text-[10px] uppercase font-black tracking-widest text-orange-600 mb-3 block">{t('profile.coachBefore')}</span>
                    <div className="text-sm font-medium text-slate-600 dark:text-orange-200 leading-relaxed font-mono">
                      <SanitizedListText text={m.before} />
                    </div>
                  </div>
                  <div className="p-6 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40">
                    <span className="text-[10px] uppercase font-black tracking-widest text-emerald-600 mb-3 block">{t('profile.coachAfter')}</span>
                    <div className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
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
          <div className="grid gap-6 md:grid-cols-2">
            {coach.positioning.map((p, i) => (
              <div key={i} className="space-y-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{p.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed"><RichText text={p.content} /></p>
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
          <div className="grid gap-4 md:grid-cols-2">
            {coach.actionChecklist.map((a, i) => (
              <div key={i} className="flex gap-4 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 items-start">
                <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center text-xs font-black shrink-0">
                  {a.priority ?? i + 1}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="font-bold text-slate-900 dark:text-white leading-tight">{a.title}</p>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">{t('profile.coachOutcome')}</span>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed"><RichText text={a.expectedOutcome} /></p>
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
  'p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 transition-all hover:border-slate-900 dark:hover:border-white'
const displayLabelClass = 'text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1'
const displayValueClass = 'text-sm font-bold text-slate-800 dark:text-slate-100 break-words'

function DisplayCell({ label, value, t, asLink, mailto }) {
  const v = String(value || '').trim()
  const empty = !v
  const webHref = !empty && asLink ? safeExternalHref(v) : null
  return (
    <div className={displayCellClass}>
      <div className={displayLabelClass}>{label}</div>
      <div className={displayValueClass}>
        {empty ? (
          <span className="font-normal text-slate-300 dark:text-slate-600">{t('profile.viewSectionEmpty')}</span>
        ) : mailto ? (
          <a href={`mailto:${v}`} className="hover:text-primary-600 transition-colors">
            {v}
          </a>
        ) : webHref ? (
          <a href={webHref} target="_blank" rel="noopener noreferrer" className="hover:text-primary-600 transition-colors">
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
      className="group relative overflow-hidden rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 p-8 transition-all hover:border-slate-900 dark:hover:border-white"
    >
      <div className="relative z-10 space-y-6">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-[10px] font-black uppercase tracking-widest text-primary-700 dark:text-primary-400">
            <Zap className="h-3 w-3" />
            {t('profile.gallupAdBadge')}
          </div>
          <ArrowUpRight className="h-5 w-5 text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-black font-serif tracking-tight text-slate-900 dark:text-white leading-tight">
            {t('profile.gallupAdTitle')}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">
            {t('profile.gallupAdDesc')}
          </p>
        </div>
        <Link
          to="/gallup-test"
          className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white border-b-2 border-slate-900 dark:border-white pb-1 hover:gap-4 transition-all"
        >
          {t('profile.gallupAdBtn')}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary-600/5 rounded-full -translate-y-16 translate-x-16 blur-3xl group-hover:bg-primary-600/10 transition-colors" />
    </motion.div>
  )
}

function SectionHeader({ icon: Icon, title, t }) {
  return (
    <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
      <Icon className="h-4 w-4 text-primary-600" aria-hidden />
      <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">
        {title}
      </h3>
    </div>
  )
}

function ProfileSectionsView({ cvProfile, t }) {
  return (
    <div className="space-y-12">
      {/* Education */}
      <section>
        <SectionHeader icon={GraduationCap} title={t('profile.cv.education')} t={t} />
        <div className="grid gap-6">
          {cvProfile.education.length === 0 ? (
            <p className="text-sm text-slate-400 italic">{t('profile.cv.emptySection')}</p>
          ) : (
            cvProfile.education.map((ed, i) => (
              <div key={i} className="group p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 transition-all hover:border-slate-300 space-y-4">
                <div className="flex flex-wrap items-baseline justify-between gap-4">
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-primary-600 transition-colors">{ed.institution || t('profile.viewSectionEmpty')}</h4>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {[ed.duration, ed.startDate, ed.endDate].filter(Boolean).slice(0, 1).join(' – ') || null}
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-500 dark:text-slate-400">
                  {[ed.degree, ed.field].filter(Boolean).join(' · ') || null}
                  {ed.gpa ? ` · GPA ${ed.gpa}` : ''}
                </div>
                {(() => {
                  const bullets = parseBullets(ed.details || ed.description)
                  return bullets.length > 0 ? (
                    <ul className="mt-4 space-y-3">
                      {bullets.map((b, idx) => (
                        <li key={idx} className="flex gap-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed items-start">
                          <div className="mt-2 w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-600 shrink-0" />
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
        <div className="grid gap-8">
          {cvProfile.workExperience.length === 0 ? (
            <p className="text-sm text-slate-400 italic">{t('profile.cv.emptySection')}</p>
          ) : (
            cvProfile.workExperience.map((w, i) => (
              <div key={i} className="group p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 transition-all hover:border-slate-300 space-y-4">
                <div className="flex flex-wrap items-baseline justify-between gap-4">
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-primary-600 transition-colors">{w.title || t('profile.viewSectionEmpty')}</h4>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {[w.duration, w.startDate, w.endDate].filter(Boolean).slice(0, 1).join(' – ') || null}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {w.company && <span className="text-sm font-black uppercase tracking-widest text-primary-600">{w.company}</span>}
                  {w.location && <span className="text-xs font-bold text-slate-400">· {w.location}</span>}
                </div>
                {(() => {
                  const bullets = parseBullets(w.highlights)
                  return bullets.length > 0 ? (
                    <ul className="mt-4 space-y-3">
                      {bullets.map((b, idx) => (
                        <li key={idx} className="flex gap-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed items-start">
                          <div className="mt-2 w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-600 shrink-0" />
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
        <div className="grid gap-6">
          {cvProfile.projects.length === 0 ? (
            <p className="text-sm text-slate-400 italic">{t('profile.cv.emptySection')}</p>
          ) : (
            cvProfile.projects.map((pr, i) => (
              <div key={i} className="group p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 transition-all hover:border-slate-300 space-y-4">
                <div className="flex flex-wrap items-baseline justify-between gap-4">
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-primary-600 transition-colors">{pr.name || t('profile.viewSectionEmpty')}</h4>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {[pr.duration, pr.startDate, pr.endDate].filter(Boolean).slice(0, 1).join(' – ') || null}
                  </span>
                </div>
                {pr.role && <div className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{pr.role}</div>}
                {(() => {
                  const bullets = parseBullets(pr.description)
                  return bullets.length > 0 ? (
                    <ul className="mt-4 space-y-3">
                      {bullets.map((b, idx) => (
                        <li key={idx} className="flex gap-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed items-start">
                          <div className="mt-2 w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-600 shrink-0" />
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
        <div className="grid gap-6 sm:grid-cols-2">
          {cvProfile.publications.length === 0 ? (
            <p className="text-sm text-slate-400 italic">{t('profile.cv.emptySection')}</p>
          ) : (
            cvProfile.publications.map((pub, i) => (
              <div key={i} className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{pub.title || t('profile.viewSectionEmpty')}</h4>
                <div className="text-xs text-slate-500">
                  {[pub.venue, pub.year].filter(Boolean).join(' · ')}
                  {pub.authors ? ` · ${pub.authors}` : ''}
                </div>
                {pub.url && (
                  <a href={safeExternalHref(pub.url)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:gap-2 transition-all">
                    Link <ArrowUpRight className="h-3 w-3" />
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      <div className="grid gap-12 lg:grid-cols-2">
        {/* Skills */}
        <section>
          <SectionHeader icon={Tags} title={t('profile.cv.skills')} t={t} />
          <div className="flex flex-wrap gap-2">
            {cvProfile.skills.length === 0 ? (
              <p className="text-sm text-slate-400 italic">{t('profile.cv.emptySection')}</p>
            ) : (
              cvProfile.skills.map((s, i) => (
                <span key={i} className="px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  {s}
                </span>
              ))
            )}
          </div>
        </section>

        {/* Languages */}
        <section>
          <SectionHeader icon={Languages} title={t('profile.cv.languages')} t={t} />
          <div className="space-y-3">
            {cvProfile.languages.length === 0 ? (
              <p className="text-sm text-slate-400 italic">{t('profile.cv.emptySection')}</p>
            ) : (
              cvProfile.languages.map((lang, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{lang.name || t('profile.viewSectionEmpty')}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary-600">{lang.proficiency || ''}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Awards */}
      <section>
        <SectionHeader icon={Award} title={t('profile.cv.awards')} t={t} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cvProfile.awards.length === 0 ? (
            <p className="text-sm text-slate-400 italic">{t('profile.cv.emptySection')}</p>
          ) : (
            cvProfile.awards.map((aw, i) => (
              <div key={i} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{aw.title || t('profile.viewSectionEmpty')}</h4>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
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

  return (
    <div className="space-y-12">
      {showFloatingEditButton ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bottom-8 right-8 z-40"
        >
          <Link
            to="/profile/edit"
            className="btn-setup-action-pill px-8 py-4 shadow-2xl"
          >
            <Pencil className="h-4 w-4" />
            <span className="font-bold">{t('profile.editProfile')}</span>
          </Link>
        </motion.div>
      ) : null}

      {/* Energy Status Card */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-premium p-8 bg-white dark:bg-slate-950 border-orange-100 dark:border-orange-500/20 shadow-xl shadow-orange-500/5 overflow-hidden relative"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <BrainCircuit className="w-32 h-32 text-orange-500" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="shrink-0 flex flex-col items-center gap-2">
            <div className="w-20 h-20 rounded-3xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Zap className="w-10 h-10 text-white fill-current" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">{t('profile.tokens')}</span>
          </div>
          
          <div className="flex-1 space-y-4 text-center md:text-left">
            <div>
              <div className="flex items-baseline justify-center md:justify-start gap-2">
                <span className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">{tokens}</span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Energy Points</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mt-1">
                {t('profile.initialTokensHint', 'Full access to AI-powered career tools.')}
              </p>
            </div>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('profile.tokenUsageInterview')}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('profile.tokenUsageCoach')}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('profile.tokenUsageExtract')}</span>
              </div>
            </div>
          </div>

          <div className="shrink-0 flex flex-col gap-3 w-full md:w-auto">
            <button
              onClick={recharge}
              className="px-8 py-4 bg-orange-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-95 flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              {t('profile.recharge')}
            </button>
            <div className="px-4 py-2 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 text-center">
              <p className="text-[10px] font-bold text-orange-600 dark:text-orange-400">{t('profile.tokenRewardContribution')}</p>
            </div>
          </div>
        </div>
      </motion.div>

      <header className="space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-10 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-6 max-w-2xl">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-3xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-100 dark:border-slate-800">
                {avatarId ? (
                  <img src={`/avatars/${avatarId}.png`} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <User className="w-10 h-10" />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {jobStatusDisplay(jobSearchStatus, t)}
                </div>
                <h1 className="text-5xl font-black font-serif tracking-tight text-slate-900 dark:text-white">
                  {cvProfile.fullName || t('profile.displayTitle')}
                </h1>
              </div>
            </div>
            <p className="text-lg text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              {cvProfile.summary || t('profile.displaySub')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              to="/profile/edit"
              className="btn-setup-action-pill px-8 py-4"
            >
              <Pencil className="h-4 w-4" />
              <span className="font-bold">{t('profile.editProfile')}</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="space-y-16">
        {!hasData ? (
          <div className="p-12 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800 text-center space-y-6">
            <div className="space-y-2">
              <h3 className="text-2xl font-black font-serif text-slate-900 dark:text-white">{t('profile.viewEmptyTitle')}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">{t('profile.viewEmptySub')}</p>
            </div>
            <Link
              to="/profile/edit"
              className="btn-setup-action-pill px-8 py-4"
            >
              <Pencil className="w-4 h-4" />
              <span className="font-bold">{t('profile.editProfile')}</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-16">
            <section>
              <SectionHeader icon={User} title={t('profile.cv.basic')} t={t} />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <DisplayCell label={t('profile.cv.fullName')} value={cvProfile.fullName} t={t} />
                <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
                  <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">{t('profile.cv.gender')}</div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{genderDisplay(cvProfile.gender, t)}</div>
                </div>
                <DisplayCell label={t('profile.cv.email')} value={cvProfile.email} t={t} mailto />
                <DisplayCell label={t('profile.cv.phone')} value={cvProfile.phone} t={t} />
                <DisplayCell label={t('profile.cv.location')} value={cvProfile.location} t={t} />
                <DisplayCell label={t('profile.cv.linkedIn')} value={cvProfile.linkedIn} t={t} asLink />
                <DisplayCell label={t('profile.cv.website')} value={cvProfile.website} t={t} asLink />
              </div>
            </section>

            <ProfileSectionsView cvProfile={cvProfile} t={t} />

            {/* Moved to top: AI Diagnostic & Resume Score */}
            {coach ? (
              <div className="space-y-12">
                <CoachReport coach={coach} t={t} />
                {timeStr && (
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 pt-6 border-t border-slate-100 dark:border-slate-800">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    {t('profile.coachPersistNote', { time: timeStr })}
                  </div>
                )}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card-premium p-12 bg-slate-900 text-white border-0 text-center space-y-8 overflow-visible relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10 max-w-lg mx-auto space-y-6">
                  <div className="w-16 h-16 rounded-2xl bg-primary-600 flex items-center justify-center mx-auto shadow-2xl shadow-primary-500/20 mb-8">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-3xl font-black font-serif">{t('profile.coachPreviewTitle', '您的 AI 简历报告已就绪')}</h3>
                  <p className="text-slate-400 leading-relaxed">
                    {t('landing.coachBannerSub', '点击生成深度简历诊断。我们将基于德国人才市场标准和 ATS 算法为您提供全方位复盘。')}
                  </p>
                  <button
                    onClick={runCoach}
                    disabled={coachGenerating || !hasData}
                    className="btn-primary-dark w-full py-5 text-base rounded-2xl group hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {coachGenerating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Zap className="w-5 h-5 mr-2 text-primary-500" />}
                    {coachGenerating ? t('profile.cv.extracting') : t('profile.coachCta')}
                  </button>
                </div>
              </motion.div>
            )}

            {tr && (
              <div className="p-8 rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">{t('profile.coachTargetRole')}</span>
                <p className="text-2xl font-black font-serif text-slate-900 dark:text-white">{tr}</p>
              </div>
            )}




            <div className="grid gap-8">
              {resumeText.trim() && (
                <details className="group space-y-4">
                  <summary className="flex items-center justify-between p-6 rounded-2xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors list-none uppercase font-black tracking-widest text-[10px] text-slate-400">
                    <span className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-slate-400" />
                      {t('profile.cv.rawResumeTitle')}
                    </span>
                    <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <pre className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap font-sans leading-relaxed">
                      {resumeText}
                    </pre>
                  </div>
                </details>
              )}

              {resumeNotes.trim() && (
                <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('profile.sectionNotes')}</span>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{resumeNotes}</p>
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
  'w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-slate-900 dark:focus:border-white outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700'

function MultiLineInput({ lines, label, placeholder, onChange, t, inputClass }) {
  const safeLines = Array.isArray(lines) ? lines : []
  const textValue = safeLines.join('\n')

  return (
    <div className="space-y-4">
      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-600">{label}</label>
      <textarea
        className={`${inputClass} min-h-[160px] leading-relaxed resize-none`}
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
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
      >
        <div className="p-8 sm:p-10 space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-3xl font-black font-serif text-slate-900 dark:text-white leading-tight">
                {t('profile.rechargeModal.title')}
              </h2>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                {t('profile.rechargeModal.subtitle')}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all hover:rotate-90"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid gap-6">
            <div className="group p-6 rounded-3xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:border-primary-500 transition-all space-y-4 text-left">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600">
                  <Share2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-sm">
                    {t('profile.rechargeModal.method1Title')}
                  </h3>
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                {t('profile.rechargeModal.method1Desc')}
              </p>
              <Link
                to="/experiences"
                onClick={onClose}
                className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary-600 hover:gap-4 transition-all"
              >
                {t('profile.rechargeModal.method1Btn')}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="group p-6 rounded-3xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:border-orange-500 transition-all space-y-6 text-left">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-sm">
                    {t('profile.rechargeModal.method2Title')}
                  </h3>
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  {t('profile.rechargeModal.method2Desc')}
                </p>
                <div className="aspect-square w-48 mx-auto rounded-3xl bg-white border-4 border-slate-100 dark:border-slate-800 flex items-center justify-center relative overflow-hidden group/qr">
                  <div className="text-center p-6 space-y-2">
                    <Zap className="w-8 h-8 text-orange-200 mx-auto" />
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{t('profile.rechargeModal.qrHint')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black uppercase tracking-[0.2em] hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-xl active:scale-[0.98]"
          >
            {t('profile.rechargeModal.cancel')}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

const avatars = [
  'professional_male_1',
  'professional_female_1',
  'tech_engineer_1',
  'creative_innovator_1'
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
  const [coachTranslating, setCoachTranslating] = useState(false)
  const [coachErr, setCoachErr] = useState(null)
  const [parseBusy, setParseBusy] = useState(false)
  const [extractBusy, setExtractBusy] = useState(false)
  const [note, setNote] = useState(null)
  const [jobSearchStatus, setJobSearchStatus] = useState('seeking')
  const [avatarId, setAvatarId] = useState(null)
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
      const res = await fetch(`${backendUrl}/api/profile`, {
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

      const res = await fetch(`${backendUrl}/api/profile`, {
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
        throw new Error(errBody.error || 'save');
      }

      const data = await res.json()
      setResumeUpdatedAt(data.resumeUpdatedAt || null)
      setUpdatedAt(data.resumeUpdatedAt || null)
      setNote({ type: 'ok', text: t('profile.saveSuccess') })
      setTimeout(() => setNote(null), 3000)
    } catch (err) {
      console.error('[Profile save]', err);
      setNote({ type: 'err', text: t('profile.saveErr') })
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

      const res = await fetch(`${backendUrl}/api/profile/recharge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount })
      })
      if (res.ok) {
        setTokens(prev => prev + amount)
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
      const res = await fetch(`${backendUrl}/api/profile/resume-coach`, {
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
      coachLangRef.current = i18n.language
      if (j.coach?.generatedAt) {
        setUpdatedAt(j.coach.generatedAt)
      }
    } catch {
      setCoachErr(t('profile.coachErr'))
    } finally {
      setCoachGenerating(false)
    }
  }

  const runExtractCv = async () => {
    const src = (pendingRaw || resumeText).trim()
    if (src.length < 80) {
      setNote({ type: 'err', text: t('profile.cv.extractNeedText') })
      return
    }
    setExtractBusy(true)
    setNote(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('auth')
      const res = await fetch(`${backendUrl}/api/profile/extract-cv`, {
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
      const res = await fetch(`${backendUrl}/api/profile/resume/parse-pdf`, {
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
    } catch {
      setNote({ type: 'err', text: t('profile.parseErr') })
      setTimeout(() => setNote(null), 3000)
    } finally {
      setParseBusy(false)
    }
  }

  const applyPendingToResume = () => {
    if (!pendingRaw.trim()) return
    const clean = pendingRaw.replace(/[●•⚫🌑⦿★■◾▪]/g, '').trim()
    setResumeText(clean)
    setPendingRaw('')
    setPendingPreviewOpen(false)
    setNote({ type: 'ok', text: t('profile.cv.appliedResumeOk') })
    setTimeout(() => setNote(null), 2000)
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
          const res = await fetch(`${backendUrl}/api/profile/resume-coach/translate`, {
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[#FAF9F6] dark:bg-slate-950">
        <div className="relative">
          <Loader2 className="h-10 w-10 animate-spin text-slate-900 dark:text-white" />
          <div className="absolute inset-0 bg-primary-500/10 blur-xl animate-pulse rounded-full" />
        </div>
        <div className="space-y-1 text-center">
          <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 animate-pulse">{t('profile.title')}</p>
          <div className="h-0.5 w-12 bg-slate-200 dark:bg-slate-800 mx-auto rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary-600"
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
        className="min-h-screen bg-[#FAF9F6] dark:bg-slate-950 pt-32 pb-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
      className="min-h-screen bg-[#FAF9F6] dark:bg-slate-950 pt-32 pb-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ProfileEditView
          cvProfile={cvProfile} setCvProfile={setCvProfile} resumeText={resumeText} setResumeText={setResumeText}
          resumeNotes={resumeNotes} setResumeNotes={setResumeNotes} targetRole={targetRole} setTargetRole={setTargetRole}
          coach={coach} coachGenerating={coachGenerating} coachErr={coachErr} runCoach={runCoach}
          save={save} saving={saving} note={note} parseBusy={parseBusy} extractBusy={extractBusy} onPdf={onPdf} fileRef={fileRef}
          pendingRaw={pendingRaw} setPendingRaw={setPendingRaw} pendingPreviewOpen={pendingPreviewOpen} setPendingPreviewOpen={setPendingPreviewOpen}
          applyPendingToResume={applyPendingToResume} jobSearchStatus={jobSearchStatus} setJobSearchStatus={setJobSearchStatus}
          avatarId={avatarId} setAvatarId={setAvatarId} t={t}
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
  targetRole, setTargetRole, coach, coachGenerating, coachErr, runCoach,
  save, saving, note, parseBusy, extractBusy, onPdf, fileRef,
  pendingRaw, setPendingRaw, pendingPreviewOpen, setPendingPreviewOpen, applyPendingToResume,
  jobSearchStatus, setJobSearchStatus, avatarId, setAvatarId, t
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
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-10 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-4">
          <Link
            to="/profile"
            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowRight className="w-3 h-3 rotate-180" />
            {t('common.back')}
          </Link>
          <h1 className="text-5xl font-black font-serif tracking-tight text-slate-900 dark:text-white uppercase leading-none">
            {t('profile.editProfile')}
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 font-medium tracking-tight">
            {t('profile.editHint')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {coachErr && (
            <div className="text-[10px] font-bold text-red-500 uppercase tracking-widest px-3 py-1 bg-red-50 dark:bg-red-950/20 rounded-lg">
              {coachErr}
            </div>
          )}
          <button
            onClick={runCoach}
            disabled={coachGenerating || (resumeText.trim().length < 80)}
            className="btn-setup-action-pill px-6 py-3"
          >
            {coachGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-emerald-500" />}
            <span className="font-bold">{coachGenerating ? t('profile.running') : t('profile.coachRun')}</span>
          </button>
          <div className="flex items-center gap-4 relative">
            <button
              onClick={save}
              disabled={saving}
              className="btn-setup-action-pill px-8 py-3 shrink-0"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              <span className="font-bold">{saving ? t('common.saving') : t('common.save')}</span>
            </button>
            <AnimatePresence>
              {note && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className={`absolute left-full ml-4 whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${note.type === 'ok' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-red-50 text-red-600 dark:bg-red-950/20'}`}
                >
                  {note.text}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <div className="grid lg:grid-cols-4 gap-12">
        <aside className="lg:col-span-1">
          <nav className="flex flex-col gap-1 sticky top-32">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                  ? 'bg-slate-50 text-slate-900 border border-slate-300 dark:bg-slate-800 dark:text-white dark:border-slate-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-900/50'
                  }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="lg:col-span-3 space-y-12">
          {activeTab === 'basic' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-12"
            >
              <section className="space-y-10">
                <SectionTitle icon={User}>{t('profile.cv.basic')}</SectionTitle>

                {/* Structured Extraction UI */}
                <div className="p-8 rounded-3xl border border-primary-100 bg-primary-50/30 dark:border-primary-900/40 dark:bg-primary-950/20 space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                      <h3 className="text-lg font-black font-serif text-slate-900 dark:text-white">{t('profile.cv.structuredTitle')}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{t('profile.cv.structuredHint')}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => void onPdf(e)} />
                      <button
                        onClick={() => fileRef.current?.click()}
                        disabled={parseBusy}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-50 shadow-sm"
                      >
                        {parseBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {t('profile.uploadPdf')}
                      </button>
                      <button
                        onClick={() => void runExtractCv()}
                        disabled={extractBusy || ((pendingRaw || resumeText).trim().length < 80)}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 dark:bg-primary-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-primary-700 transition-all disabled:opacity-50 shadow-lg shadow-slate-900/10 dark:shadow-primary-600/20"
                      >
                        {extractBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                        {extractBusy ? t('profile.cv.extracting') : t('profile.cv.extractBtn')}
                      </button>
                    </div>
                  </div>

                  {pendingRaw.trim() && (
                    <div className="pt-6 border-t border-primary-100 dark:border-primary-900/30 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary-600 dark:text-primary-400">{t('profile.cv.extractedPreviewLabel')}</p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPendingPreviewOpen(!pendingPreviewOpen)}
                            className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                          >
                            {pendingPreviewOpen ? t('common.hide') : t('common.show')}
                          </button>
                          <button
                            onClick={applyPendingToResume}
                            className="text-[10px] font-black uppercase tracking-widest text-primary-600 dark:text-primary-400 hover:underline"
                          >
                            {t('profile.cv.applyToInterviewResume')}
                          </button>
                        </div>
                      </div>
                      {pendingPreviewOpen && (
                        <motion.pre
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-primary-100 dark:border-primary-900/30 text-xs font-mono text-slate-600 dark:text-slate-400 overflow-auto max-h-60 leading-relaxed"
                        >
                          {pendingRaw}
                        </motion.pre>
                      )}
                    </div>
                  )}
                </div>

                {/* Avatar Selection */}
                <div className="space-y-6">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">{t('profile.chooseAvatar')}</label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-4">
                    <button
                      onClick={() => setAvatarId(null)}
                      className={`relative flex items-center justify-center h-20 rounded-2xl border-2 transition-all ${!avatarId ? 'border-slate-900 dark:border-white rotate-3' : 'border-slate-100 dark:border-slate-800 grayscale hover:grayscale-0'}`}
                    >
                      <User className="w-6 h-6 text-slate-300" />
                    </button>
                    {avatars.map((id) => (
                      <button
                        key={id}
                        onClick={() => setAvatarId(id)}
                        className={`relative group h-20 rounded-2xl overflow-hidden border-2 transition-all ${avatarId === id ? 'border-slate-900 dark:border-white scale-[1.1] z-10' : 'border-slate-100 dark:border-slate-800 grayscale hover:grayscale-0 hover:scale-[1.05]'}`}
                      >
                        <img src={`/avatars/${id}.png`} alt={id} className="w-full h-full object-cover" />
                        {avatarId === id && (
                          <div className="absolute top-1 right-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-0.5 rounded-full shadow-lg">
                            <CheckCircle2 className="w-3 h-3" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">{t('profile.cv.fullName')}</label>
                    <input className={inputClass} value={cvProfile.fullName} onChange={(e) => setCvProfile({ ...cvProfile, fullName: e.target.value })} />
                  </div>
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">{t('profile.cv.gender')}</label>
                    <select className={inputClass} value={cvProfile.gender} onChange={(e) => setCvProfile({ ...cvProfile, gender: e.target.value })}>
                      <option value="">{t('profile.cv.genderEmpty')}</option>
                      <option value="male">{t('profile.cv.genderMale')}</option>
                      <option value="female">{t('profile.cv.genderFemale')}</option>
                      <option value="other">{t('profile.cv.genderOther')}</option>
                    </select>
                  </div>
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">{t('profile.cv.email')}</label>
                    <input className={inputClass} value={cvProfile.email} onChange={(e) => setCvProfile({ ...cvProfile, email: e.target.value })} />
                  </div>
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">{t('profile.cv.phone')}</label>
                    <input className={inputClass} value={cvProfile.phone} onChange={(e) => setCvProfile({ ...cvProfile, phone: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">{t('profile.cv.summary')}</label>
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
                    <div key={idx} className="group relative p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-6">
                      <button
                        type="button"
                        onClick={() => {
                          const newExp = (cvProfile.workExperience || []).filter((_, i) => i !== idx)
                          setCvProfile({ ...cvProfile, workExperience: newExp })
                        }}
                        className="absolute top-6 right-6 p-2 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">{t('profile.cv.phCompany')}</label>
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
                        <div className="space-y-4">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">{t('profile.cv.phExpTitle')}</label>
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
                        <div className="space-y-4">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">{t('profile.cv.phDuration')}</label>
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
                        <div className="space-y-4">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">{t('profile.cv.phLocation')}</label>
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
                    className="w-full py-8 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-600 font-bold hover:border-slate-400 hover:text-slate-900 transition-all flex items-center justify-center gap-2 bg-slate-50/20"
                  >
                    <Plus className="w-5 h-5 text-emerald-500" />
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
                    <div key={idx} className="group relative p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-6">
                      <button
                        type="button"
                        onClick={() => {
                          const newEdu = cvProfile.education.filter((_, i) => i !== idx)
                          setCvProfile({ ...cvProfile, education: newEdu })
                        }}
                        className="absolute top-6 right-6 p-2 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">{t('profile.cv.phSchool')}</label>
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
                        <div className="space-y-4">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">{t('profile.cv.phField')}</label>
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
                        <div className="space-y-4">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">{t('profile.cv.phDegree')}</label>
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
                        <div className="space-y-4">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">{t('profile.cv.phDuration')}</label>
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
                    className="w-full py-8 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-600 font-bold hover:border-slate-400 hover:text-slate-900 transition-all flex items-center justify-center gap-2 bg-slate-50/20"
                  >
                    <Plus className="w-5 h-5 text-emerald-500" />
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
                    <div key={idx} className="group relative p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-6">
                      <button
                        type="button"
                        onClick={() => {
                          const newPr = cvProfile.projects.filter((_, i) => i !== idx)
                          setCvProfile({ ...cvProfile, projects: newPr })
                        }}
                        className="absolute top-6 right-6 p-2 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">{t('profile.cv.phProjName')}</label>
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
                        <div className="space-y-4">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">{t('profile.cv.phProjRole')}</label>
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
                    className="w-full py-8 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-600 font-bold hover:border-slate-400 hover:text-slate-900 transition-all flex items-center justify-center gap-2 bg-slate-50/20"
                  >
                    <Plus className="w-5 h-5 text-emerald-500" />
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
                    <p className="text-xs text-slate-400 font-medium">{t('profile.cv.skillsHint')}</p>
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
                          className="p-3 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCvProfile({ ...cvProfile, languages: [...cvProfile.languages, emptyLanguage()] })}
                      className="w-full py-8 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-600 font-bold hover:border-slate-400 hover:text-slate-900 transition-all flex items-center justify-center gap-2 bg-slate-50/20"
                    >
                      <Plus className="w-5 h-5 text-emerald-500" />
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
                    <div key={idx} className="group relative bg-white dark:bg-slate-950 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6">
                      <button
                        type="button"
                        onClick={() => {
                          const newAw = cvProfile.awards.filter((_, i) => i !== idx)
                          setCvProfile({ ...cvProfile, awards: newAw })
                        }}
                        className="absolute top-6 right-6 p-2 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">{t('profile.cv.phAwardTitle')}</label>
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
                        <div className="space-y-4">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">{t('profile.cv.phYear')}</label>
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
                      <div className="space-y-4">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">{t('profile.cv.phIssuer')}</label>
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
                    className="w-full py-8 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-600 font-bold hover:border-slate-400 hover:text-slate-900 transition-all flex items-center justify-center gap-2 bg-slate-50/20"
                  >
                    <Plus className="w-5 h-5 text-emerald-500" />
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
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
                    {t('profile.cv.rawResumeHint')}
                  </p>
                  <textarea
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    className={`${inputClass} min-h-[500px] font-mono text-sm leading-relaxed`}
                    placeholder={t('profile.placeholder')}
                  />
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">{t('profile.sectionNotes')}</label>
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
