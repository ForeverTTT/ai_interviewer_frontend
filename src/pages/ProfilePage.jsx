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
  ChevronDown, ChevronUp, Plus, Trash2, User,
  Briefcase, GraduationCap, FolderKanban, BookOpen, Tags, Languages, Award, Wand2,
  Pencil, Eye, ArrowUpRight, Zap, ArrowRight,
} from 'lucide-react'

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
  // Replace weird dots with standard dash or nothing. 
  // Covers wide range: ●•⚫🌑⦿★■◾▪
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

function SectionTitle({ icon: Icon, iconClass, children }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md ${iconClass}`}>
        <Icon className="w-5 h-5" aria-hidden />
      </span>
      <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white sm:text-xl">{children}</h2>
    </div>
  )
}

function CoachReport({ coach, t }) {
  if (!coach) return null
  const s = coach.scores || {}
  const scoreCells = [
    { key: 'overall', label: t('profile.coachScoreOverall'), val: s.overall, grad: 'from-primary-500 to-violet-600' },
    { key: 'clarity', label: t('profile.coachScoreClarity'), val: s.clarity, grad: 'from-emerald-500 to-teal-600' },
    { key: 'impact', label: t('profile.coachScoreImpact'), val: s.impact, grad: 'from-amber-500 to-orange-600' },
    { key: 'structure', label: t('profile.coachScoreStructure'), val: s.structure, grad: 'from-sky-500 to-cyan-600' },
    { key: 'ats', label: t('profile.coachScoreAts'), val: s.ats, grad: 'from-slate-500 to-slate-700' },
  ]

  return (
    <div className="space-y-12">
      <section>
        <SectionTitle icon={Sparkles} iconClass="bg-gradient-to-br from-primary-500 to-violet-600">
          {t('profile.coachSummary')}
        </SectionTitle>
        <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 px-5 py-4 dark:border-slate-700 dark:bg-slate-800/40">
          <div className="text-[15px] leading-[1.75] text-slate-800 dark:text-slate-100 whitespace-pre-wrap sm:text-base">
            <RichText text={coach.overallEvaluation} />
          </div>
        </div>
      </section>

      <section>
        <SectionTitle icon={BarChart3} iconClass="bg-gradient-to-br from-violet-500 to-indigo-600">
          {t('profile.coachScores')}
        </SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-3">
          {scoreCells.map((c) => (
            <div
              key={c.key}
              className="rounded-xl border border-slate-200/90 bg-white py-3.5 px-2 text-center shadow-sm dark:border-slate-600 dark:bg-slate-900/80"
            >
              <div className={`inline-block text-2xl font-black tabular-nums bg-gradient-to-br ${c.grad} bg-clip-text text-transparent sm:text-[1.65rem]`}>
                {c.val != null ? `${c.val}` : '—'}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mt-1 sm:text-xs sm:normal-case sm:tracking-normal">
                {c.label}
              </div>
              {c.val != null ? (
                <div className="mt-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">/10</div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {coach.macroInsights?.length > 0 && (
        <section>
          <SectionTitle icon={Telescope} iconClass="bg-gradient-to-br from-indigo-500 to-sky-600">
            {t('profile.coachMacro')}
          </SectionTitle>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{t('profile.coachMacroSub')}</p>
          <ul className="space-y-3">
            {coach.macroInsights.map((line, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-xl border border-indigo-200/70 bg-indigo-50/40 px-4 py-3 text-[15px] leading-relaxed text-slate-800 dark:border-indigo-900/40 dark:bg-indigo-950/20 dark:text-slate-100"
              >
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-indigo-500" aria-hidden />
                <RichText text={line} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {coach.highlights?.length > 0 && (
        <section>
          <SectionTitle icon={ListChecks} iconClass="bg-gradient-to-br from-emerald-500 to-teal-600">
            {t('profile.coachStrengths')}
          </SectionTitle>
          <ul className="space-y-3">
            {coach.highlights.map((h, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-xl border border-emerald-200/70 bg-emerald-50/50 px-4 py-3 text-[15px] leading-relaxed text-slate-800 dark:border-emerald-900/35 dark:bg-emerald-950/20 dark:text-slate-100"
              >
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                <RichText text={h} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {coach.priorityImprovements?.length > 0 && (
        <section>
          <SectionTitle icon={AlertTriangle} iconClass="bg-gradient-to-br from-amber-500 to-orange-600">
            {t('profile.coachCritical')}
          </SectionTitle>
          <div className="space-y-4">
            {coach.priorityImprovements.map((p, i) => (
              <div
                key={i}
                className="relative overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/60 to-white p-5 dark:border-amber-900/45 dark:from-amber-950/25 dark:to-slate-900/90"
              >
                <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-amber-500 to-orange-500" aria-hidden />
                <div className="pl-3">
                  <h3 className="mb-3 text-base font-bold text-slate-900 dark:text-white">{p.title}</h3>
                  <div className="mb-2 text-[15px] leading-relaxed text-slate-700 dark:text-slate-200">
                    <span className="font-semibold text-amber-800 dark:text-amber-400">{t('profile.coachIssue')}</span>{' '}
                    <RichText text={p.problem} />
                  </div>
                  <div className="mb-2 text-[15px] leading-relaxed text-slate-700 dark:text-slate-200">
                    <span className="font-semibold text-amber-800 dark:text-amber-400">{t('profile.coachAction')}</span>{' '}
                    <RichText text={p.suggestedAction} />
                  </div>
                  {p.rewriteExample ? (
                    <div className="mt-4 rounded-lg border border-primary-200/60 bg-primary-50/40 px-3 py-2.5 dark:border-primary-900/40 dark:bg-primary-950/25">
                      <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                        <span className="font-semibold text-primary-700 dark:text-primary-400">{t('profile.coachExample')}</span>{' '}
                        <SanitizedListText text={p.rewriteExample} />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {coach.moduleDeepDives?.length > 0 && (
        <section>
          <SectionTitle icon={Layers} iconClass="bg-gradient-to-br from-sky-500 to-cyan-600">
            {t('profile.coachSections')}
          </SectionTitle>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{t('profile.coachSectionsStar')}</p>
          <div className="space-y-5">
            {coach.moduleDeepDives.map((m, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-600 dark:bg-slate-900/90"
              >
                <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100/80 px-4 py-3 text-sm font-bold text-slate-800 dark:border-slate-700 dark:from-slate-800 dark:to-slate-800/80 dark:text-slate-100">
                  {m.moduleTitle}
                </div>
                <div className="space-y-3 p-5 text-[15px] leading-relaxed text-slate-700 dark:text-slate-200">
                  <div>
                    <span className="font-semibold text-primary-600 dark:text-primary-400">{t('profile.coachFinding')}</span>{' '}
                    <RichText text={m.finding} />
                  </div>
                  <div>
                    <span className="font-semibold text-primary-600 dark:text-primary-400">{t('profile.coachWhy')}</span>{' '}
                    <RichText text={m.whyImportant} />
                  </div>
                  <div>
                    <span className="font-semibold text-primary-600 dark:text-primary-400">{t('profile.coachSuggest')}</span>{' '}
                    <RichText text={m.modificationSuggestion} />
                  </div>
                  <div className="grid gap-3 pt-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-3.5 dark:border-slate-600 dark:bg-slate-800/50">
                      <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('profile.coachBefore')}</div>
                      <div className="text-sm text-slate-800 dark:text-slate-100"><SanitizedListText text={m.before} /></div>
                    </div>
                    <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/60 p-3.5 dark:border-emerald-900/45 dark:bg-emerald-950/25">
                      <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">{t('profile.coachAfter')}</div>
                      <div className="text-sm text-slate-800 dark:text-slate-100"><SanitizedListText text={m.after} /></div>
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
          <SectionTitle icon={MapPin} iconClass="bg-gradient-to-br from-indigo-500 to-violet-600">
            {t('profile.coachMarket')}
          </SectionTitle>
          <div className="grid gap-4 md:grid-cols-2">
            {coach.positioning.map((p, i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-600 dark:bg-slate-900/80"
              >
                <h3 className="mb-2 font-bold text-slate-900 dark:text-white">{p.title}</h3>
                <p className="text-[15px] leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-wrap"><RichText text={p.content} /></p>
              </div>
            ))}
          </div>
        </section>
      )}

      {coach.actionChecklist?.length > 0 && (
        <section>
          <SectionTitle icon={ClipboardList} iconClass="bg-gradient-to-br from-primary-600 to-primary-700">
            {t('profile.coachChecklist')}
          </SectionTitle>
          <ul className="space-y-3">
            {coach.actionChecklist.map((a, i) => (
              <li
                key={i}
                className="flex gap-4 rounded-xl border border-slate-200/90 bg-white p-4 dark:border-slate-600 dark:bg-slate-900/80"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-violet-600 text-sm font-black text-white shadow-sm">
                  {a.priority ?? i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 dark:text-white">{a.title}</p>
                  <div className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{t('profile.coachOutcome')}</span>{' '}
                    <RichText text={a.expectedOutcome} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
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
  'rounded-xl border border-slate-200/90 bg-slate-50/50 px-4 py-3 dark:border-slate-600 dark:bg-slate-800/40'
const displayLabelClass = 'text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400'
const displayValueClass = 'mt-1 text-sm font-medium text-slate-900 break-words dark:text-slate-100'

function DisplayCell({ label, value, t, asLink, mailto }) {
  const v = String(value || '').trim()
  const empty = !v
  const webHref = !empty && asLink ? safeExternalHref(v) : null
  return (
    <div className={displayCellClass}>
      <div className={displayLabelClass}>{label}</div>
      <div className={displayValueClass}>
        {empty ? (
          <span className="font-normal text-slate-400 dark:text-slate-500">{t('profile.viewSectionEmpty')}</span>
        ) : mailto ? (
          <a href={`mailto:${v}`} className="text-primary-600 hover:underline dark:text-primary-400">
            {v}
          </a>
        ) : webHref ? (
          <a href={webHref} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline dark:text-primary-400">
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
    <div className="group relative overflow-hidden rounded-2xl border border-primary-200 bg-white p-5 shadow-sm transition-all hover:shadow-card dark:border-slate-700 dark:bg-slate-900">
      <div className="absolute top-0 right-0 -mr-4 -mt-4 h-24 w-24 rounded-full bg-primary-500/10 blur-2xl transition-all group-hover:bg-primary-500/20" />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
            <Zap className="h-3 w-3" />
            {t('profile.gallupAdBadge')}
          </span>
          <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-primary-600 transition-colors" />
        </div>
        <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white leading-tight">
          {t('profile.gallupAdTitle')}
        </h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed text-balance">
          {t('profile.gallupAdDesc')}
        </p>
        <Link
          to="/gallup-test"
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-primary-600 dark:hover:bg-primary-700"
        >
          {t('profile.gallupAdBtn')}
        </Link>
      </div>
    </div>
  )
}

function ProfileSectionsView({ cvProfile, t }) {
  return (
    <div className="space-y-8">
      {/* Education */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-card dark:border-slate-700/90 dark:bg-slate-900">
        <div className="border-b border-slate-200/80 px-5 py-4 dark:border-slate-700/80 sm:px-8">
          <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
            <GraduationCap className="h-4 w-4 text-primary-600" aria-hidden />
            {t('profile.cv.education')}
          </div>
        </div>
        <div className="space-y-4 p-5 sm:p-8">
          {cvProfile.education.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('profile.cv.emptySection')}</p>
          ) : (
            cvProfile.education.map((ed, i) => (
              <div key={i} className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 dark:border-slate-600 dark:bg-slate-800/40">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{ed.institution || t('profile.viewSectionEmpty')}</h3>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {[ed.startDate, ed.endDate].filter(Boolean).join(' – ') || null}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                  {[ed.degree, ed.field].filter(Boolean).join(' · ') || null}
                  {ed.gpa ? ` · ${ed.gpa}` : ''}
                </p>
                {(() => {
                  const bullets = parseBullets(ed.details)
                  return bullets.length > 0 ? (
                    <ul className="mt-3 list-disc pl-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      {bullets.map((b, idx) => (
                        <li key={idx} className="whitespace-pre-wrap">{b}</li>
                      ))}
                    </ul>
                  ) : null
                })()}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Work Experience */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-card dark:border-slate-700/90 dark:bg-slate-900">
        <div className="border-b border-slate-200/80 px-5 py-4 dark:border-slate-700/80 sm:px-8">
          <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
            <Briefcase className="h-4 w-4 text-primary-600" aria-hidden />
            {t('profile.cv.work')}
          </div>
        </div>
        <div className="space-y-4 p-5 sm:p-8">
          {cvProfile.workExperience.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('profile.cv.emptySection')}</p>
          ) : (
            cvProfile.workExperience.map((w, i) => (
              <div key={i} className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 dark:border-slate-600 dark:bg-slate-800/40">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{w.title || t('profile.viewSectionEmpty')}</h3>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {[w.startDate, w.endDate].filter(Boolean).join(' – ') || null}
                  </span>
                </div>
                {w.company ? <p className="mt-1 text-sm font-medium text-primary-700 dark:text-primary-300">{w.company}</p> : null}
                {w.location ? <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{w.location}</p> : null}
                {(() => {
                  const bullets = parseBullets(w.highlights)
                  return bullets.length > 0 ? (
                    <ul className="mt-3 list-disc pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                      {bullets.map((b, idx) => (
                        <li key={idx} className="whitespace-pre-wrap">{b}</li>
                      ))}
                    </ul>
                  ) : null
                })()}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Projects */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-card dark:border-slate-700/90 dark:bg-slate-900">
        <div className="border-b border-slate-200/80 px-5 py-4 dark:border-slate-700/80 sm:px-8">
          <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
            <FolderKanban className="h-4 w-4 text-primary-600" aria-hidden />
            {t('profile.cv.projects')}
          </div>
        </div>
        <div className="space-y-4 p-5 sm:p-8">
          {cvProfile.projects.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('profile.cv.emptySection')}</p>
          ) : (
            cvProfile.projects.map((pr, i) => (
              <div key={i} className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 dark:border-slate-600 dark:bg-slate-800/40">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{pr.name || t('profile.viewSectionEmpty')}</h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {[pr.startDate, pr.endDate].filter(Boolean).join(' – ') || null}
                  </span>
                </div>
                {pr.role ? <p className="mt-1 text-sm font-medium text-primary-700 dark:text-primary-300">{pr.role}</p> : null}
                {(() => {
                  const bullets = parseBullets(pr.description)
                  return bullets.length > 0 ? (
                    <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                      {bullets.map((b, idx) => (
                        <li key={idx} className="whitespace-pre-wrap">{b}</li>
                      ))}
                    </ul>
                  ) : null
                })()}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Publications */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-card dark:border-slate-700/90 dark:bg-slate-900">
        <div className="border-b border-slate-200/80 px-5 py-4 dark:border-slate-700/80 sm:px-8">
          <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
            <BookOpen className="h-4 w-4 text-primary-600" aria-hidden />
            {t('profile.cv.publications')}
          </div>
        </div>
        <div className="space-y-4 p-5 sm:p-8">
          {cvProfile.publications.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('profile.cv.emptySection')}</p>
          ) : (
            cvProfile.publications.map((pub, i) => (
              <div key={i} className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 dark:border-slate-600 dark:bg-slate-800/40">
                <p className="font-bold text-slate-900 dark:text-white">{pub.title || t('profile.viewSectionEmpty')}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {[pub.venue, pub.year].filter(Boolean).join(' · ')}
                  {pub.authors ? ` · ${pub.authors}` : ''}
                </p>
                {pub.url ? (
                  <a href={safeExternalHref(pub.url)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-primary-600 hover:underline dark:text-primary-400">
                    {pub.url}
                  </a>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Skills */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-card dark:border-slate-700/90 dark:bg-slate-900">
          <div className="border-b border-slate-200/80 px-5 py-4 dark:border-slate-700/80 sm:px-8">
            <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
              <Tags className="h-4 w-4 text-primary-600" aria-hidden />
              {t('profile.cv.skills')}
            </div>
          </div>
          <div className="p-5 sm:p-8">
            {cvProfile.skills.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('profile.cv.emptySection')}</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {cvProfile.skills.map((s, i) => (
                  <li key={i} className="rounded-lg border border-slate-200/90 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-800 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100">
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Languages */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-card dark:border-slate-700/90 dark:bg-slate-900">
          <div className="border-b border-slate-200/80 px-5 py-4 dark:border-slate-700/80 sm:px-8">
            <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
              <Languages className="h-4 w-4 text-primary-600" aria-hidden />
              {t('profile.cv.languages')}
            </div>
          </div>
          <div className="space-y-3 p-5 sm:p-8">
            {cvProfile.languages.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('profile.cv.emptySection')}</p>
            ) : (
              cvProfile.languages.map((lang, i) => (
                <div key={i} className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-2.5 dark:border-slate-600 dark:bg-slate-800/40">
                  <span className="font-semibold text-slate-900 dark:text-white">{lang.name || t('profile.viewSectionEmpty')}</span>
                  <span className="text-sm text-slate-600 dark:text-slate-400">{lang.proficiency || ''}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Awards */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-card dark:border-slate-700/90 dark:bg-slate-900">
        <div className="border-b border-slate-200/80 px-5 py-4 dark:border-slate-700/80 sm:px-8">
          <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
            <Award className="h-4 w-4 text-primary-600" aria-hidden />
            {t('profile.cv.awards')}
          </div>
        </div>
        <div className="space-y-3 p-5 sm:p-8">
          {cvProfile.awards.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('profile.cv.emptySection')}</p>
          ) : (
            cvProfile.awards.map((aw, i) => (
              <div key={i} className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-slate-600 dark:bg-slate-800/40">
                <p className="font-semibold text-slate-900 dark:text-white">{aw.title || t('profile.viewSectionEmpty')}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {[aw.year, aw.issuer].filter(Boolean).join(' · ')}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function ProfileDisplayView({ cvProfile, resumeText, resumeNotes, targetRole, coach, t, i18n, timeStr, showFloatingEditButton, coachTranslating, jobSearchStatus, avatarId }) {
  const displayCellClass = "flex flex-col gap-1 px-4 py-3 rounded-xl border border-slate-100 bg-white shadow-sm dark:bg-slate-800/50 dark:border-slate-700/50"
  const displayLabelClass = "text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500"
  const displayValueClass = "text-sm font-semibold text-slate-700 dark:text-slate-200"
  const hasData = profileHasVisibleData(cvProfile, resumeText, resumeNotes)
  const tr = String(targetRole || '').trim()
  const coachLangName = t(`profile.langName.${normalizeUiLang(i18n.language)}`)

  return (
    <>
      {showFloatingEditButton ? (
        <Link
          to="/profile/edit"
          aria-label={t('profile.editProfile')}
          className="fixed bottom-5 right-5 z-40 inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-primary-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_12px_28px_-10px_rgba(79,70,229,0.65)] transition hover:from-violet-700 hover:to-primary-700"
        >
          <Pencil className="h-4 w-4" aria-hidden />
          {t('profile.editProfile')}
        </Link>
      ) : null}

      <header className="mb-8 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-card ring-1 ring-slate-900/[0.04] dark:border-slate-700/80 dark:bg-slate-900/60 dark:ring-white/[0.06] sm:mb-10">
        <div className="relative border-b border-slate-100 bg-gradient-to-br from-primary-600/[0.08] via-white to-violet-600/[0.07] px-5 py-6 dark:border-slate-800 dark:from-primary-500/10 dark:via-slate-900 dark:to-violet-600/10 sm:px-8 sm:py-7">
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary-400/25 to-transparent dark:via-primary-500/15" aria-hidden />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start min-w-0 flex-1">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-violet-600 text-white shadow-lg shadow-primary-600/25 ring-2 ring-white dark:ring-slate-900 overflow-hidden mt-1">
                {avatarId ? (
                  <img src={`/avatars/${avatarId}.png`} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-8 w-8 text-white/90" aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-balance text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl lg:text-4xl">
                  {cvProfile.fullName || t('profile.displayTitle')}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
                  {cvProfile.summary || t('profile.displaySub')}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center lg:gap-6">
              {/* Integrated Gallup Entry in Header */}
              <div className="relative hidden md:block w-full max-w-sm overflow-hidden rounded-2xl border border-emerald-100/80 bg-white/60 p-4 shadow-sm hover:shadow-md transition-shadow dark:border-emerald-900/40 dark:bg-slate-900/40">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-primary-600 text-white shadow-md ring-1 ring-white/20">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-slate-900 dark:text-white truncate">
                      {t('profile.gallupAdBadge')}
                    </p>
                    <p className="line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                      {t('profile.gallupAdText').split('，')[0]}
                    </p>
                  </div>
                  <Link
                    to="/gallup"
                    className="group/btn relative flex h-9 items-center justify-center overflow-hidden rounded-xl bg-slate-900 px-5 text-xs font-black text-white transition-all hover:bg-slate-800 hover:shadow-lg dark:bg-primary-600 dark:hover:bg-primary-700 whitespace-nowrap"
                  >
                    <span className="relative z-10 flex items-center gap-1.5">
                      {t('profile.gallupAdBtn')}
                      <ArrowRight className="h-3 w-3 transition-transform group-hover/btn:translate-x-0.5" />
                    </span>
                    <div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity group-hover/btn:opacity-100" />
                  </Link>
                </div>
              </div>

              <Link
                to="/profile/edit"
                className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-primary-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:from-violet-700 hover:to-primary-700 whitespace-nowrap"
              >
                <Pencil className="h-4 w-4" aria-hidden />
                {t('profile.editProfile')}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="relative">
        <div className="mb-8 space-y-8 sm:mb-10">
          {!hasData ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 px-6 py-14 text-center dark:border-slate-600 dark:bg-slate-900/50">
              <p className="text-lg font-bold text-slate-900 dark:text-white">{t('profile.viewEmptyTitle')}</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">{t('profile.viewEmptySub')}</p>
              <Link
                to="/profile/edit"
                className="mt-6 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-primary-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:from-violet-700 hover:to-primary-700"
              >
                <Pencil className="h-4 w-4" aria-hidden />
                {t('profile.editProfile')}
              </Link>
            </div>
          ) : (
            <>
              {tr ? (
                <div className="rounded-2xl border border-slate-200/90 bg-white px-5 py-4 shadow-card dark:border-slate-700 dark:bg-slate-900 sm:px-8">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('profile.coachTargetRole')}</p>
                  <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{tr}</p>
                </div>
              ) : null}

              <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-card ring-1 ring-slate-900/[0.04] dark:border-slate-700/90 dark:bg-slate-900 dark:ring-white/[0.06]">
                <div className="border-b border-slate-200/80 bg-gradient-to-br from-primary-600/[0.06] via-white to-violet-600/[0.05] px-5 py-4 dark:border-slate-700/80 dark:from-primary-500/10 dark:via-slate-900 dark:to-violet-600/10 sm:px-8">
                  <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                    <User className="h-4 w-4 text-primary-600" aria-hidden />
                    {t('profile.cv.basic')}
                  </div>
                </div>
                <div className="space-y-6 p-5 sm:p-8">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <DisplayCell label={t('profile.cv.fullName')} value={cvProfile.fullName} t={t} />
                    <div className={displayCellClass}>
                      <div className={displayLabelClass}>{t('profile.cv.gender')}</div>
                      <div className={displayValueClass}>{genderDisplay(cvProfile.gender, t)}</div>
                    </div>
                    <DisplayCell label={t('profile.cv.email')} value={cvProfile.email} t={t} mailto />
                    <DisplayCell label={t('profile.cv.phone')} value={cvProfile.phone} t={t} />
                    <DisplayCell label={t('profile.cv.location')} value={cvProfile.location} t={t} />
                    <div className={displayCellClass}>
                      <div className={displayLabelClass}>{t('profile.status')}</div>
                      <div className={displayValueClass}>
                        {jobStatusDisplay(jobSearchStatus, t)}
                      </div>
                    </div>
                    <DisplayCell label={t('profile.cv.linkedIn')} value={cvProfile.linkedIn} t={t} asLink />
                    <DisplayCell label={t('profile.cv.website')} value={cvProfile.website} t={t} asLink />
                  </div>
                  <div>
                    <div className={displayLabelClass}>{t('profile.cv.summary')}</div>
                    <div className="mt-2 rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm leading-relaxed text-slate-800 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100">
                      {String(cvProfile.summary || '').trim() ? (
                        <span className="whitespace-pre-wrap">{cvProfile.summary}</span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">{t('profile.viewSectionEmpty')}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ... Rest of sections in Main Column ... */}
              <ProfileSectionsView cvProfile={cvProfile} t={t} />

              {resumeText.trim() ? (
                <details className="group overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-card dark:border-slate-700/90 dark:bg-slate-900">
                  <summary className="cursor-pointer list-none px-5 py-4 text-sm font-bold text-slate-800 dark:text-slate-100 sm:px-8 [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary-600" aria-hidden />
                        {t('profile.cv.rawResumeTitle')}
                      </span>
                      <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden />
                    </span>
                  </summary>
                  <div className="border-t border-slate-200/80 px-5 pb-5 dark:border-slate-700 sm:px-8">
                    <p className="py-3 text-xs text-slate-500 dark:text-slate-400">{t('profile.cv.rawResumeHint')}</p>
                    <pre className="max-h-[min(60vh,28rem)] overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200/80 bg-slate-50 p-4 text-xs leading-relaxed text-slate-800 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-100">
                      {resumeText}
                    </pre>
                  </div>
                </details>
              ) : null}

              {resumeNotes.trim() ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-card dark:border-slate-700/90 dark:bg-slate-900">
                  <div className="border-b border-slate-200/80 px-5 py-4 dark:border-slate-700/80 sm:px-8">
                    <p className="text-sm font-black text-slate-900 dark:text-white">{t('profile.sectionNotes')}</p>
                  </div>
                  <div className="p-5 sm:p-8">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">{resumeNotes}</p>
                  </div>
                </div>
              ) : null}

              <p className="text-center text-xs text-slate-500 dark:text-slate-500">{t('profile.viewImportHint')}</p>
            </>
          )}

          {coach ? (
            <div className="mb-10 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-card ring-1 ring-slate-900/[0.04] dark:border-slate-700/90 dark:bg-slate-900 dark:ring-white/[0.06]">
              {timeStr ? (
                <div className="relative border-b border-slate-100 bg-gradient-to-r from-primary-600/[0.06] via-violet-600/[0.05] to-transparent px-5 py-3.5 dark:border-slate-800 dark:from-primary-500/12 dark:via-violet-500/10 sm:px-8">
                  <p className="relative flex items-start gap-2.5 text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-400 sm:text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden />
                    {t('profile.coachPersistNote', { time: timeStr })}
                  </p>
                </div>
              ) : null}
              <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-8">
                <div className="rounded-xl border border-amber-200/90 bg-amber-50/70 p-3.5 dark:border-amber-800/50 dark:bg-amber-950/20">
                  <p className="flex items-start gap-2 text-sm font-medium leading-relaxed text-slate-800 dark:text-100">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" aria-hidden />
                    {t('profile.coachEditHint')}
                  </p>
                  <Link
                    to="/profile/edit"
                    state={{ scrollTo: 'coach' }}
                    className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:underline dark:text-primary-300"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    {t('profile.editProfile')}
                  </Link>
                </div>
              </div>
              <div className="p-6 sm:p-8 lg:p-10">
                {coachTranslating ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-12">
                    <Loader2 className="h-7 w-7 animate-spin text-primary-600 dark:text-primary-400" aria-hidden />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('profile.coachTranslating', { lang: coachLangName })}</p>
                  </div>
                ) : (
                  <CoachReport coach={coach} t={t} />
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  )
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-100'

function MultiLineInput({ lines, label, placeholder, onChange, t, inputClass }) {
  const safeLines = Array.isArray(lines) ? lines : []
  return (
    <div className="mt-4 space-y-2.5">
      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">{label}</label>
      <div className="space-y-2">
        {safeLines.map((line, idx) => (
          <div key={idx} className="flex gap-2 group">
            <input
              className={inputClass}
              placeholder={placeholder}
              value={line}
              onChange={(e) => {
                const newLines = [...safeLines]
                newLines[idx] = e.target.value
                onChange(newLines)
              }}
            />
            <button
              type="button"
              onClick={() => onChange(safeLines.filter((_, i) => i !== idx))}
              className="p-2.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
              title={t('profile.cv.remove')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...safeLines, ''])}
        className="inline-flex items-center gap-1.5 rounded-lg border border-primary-100 bg-primary-50/50 px-3 py-1.5 text-xs font-bold text-primary-600 hover:bg-primary-100 dark:border-primary-900/30 dark:bg-primary-950/20 dark:text-primary-400 dark:hover:bg-primary-900/40 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        {t('profile.cv.add')}
      </button>
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
  const [updatedAt, setUpdatedAt] = useState(null)
  const [pendingRaw, setPendingRaw] = useState('')
  const [rawResumeOpen, setRawResumeOpen] = useState(false)
  const [pendingPreviewOpen, setPendingPreviewOpen] = useState(false)
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
      setUpdatedAt(j.resumeUpdatedAt || null)
      const tr = j.profileJson?.coachTargetRole
      if (typeof tr === 'string') setTargetRole(tr)
      else if (j.resumeCoach?.targetRole) setTargetRole(j.resumeCoach.targetRole)
    } catch {
      setNote({ type: 'err', text: tRef.current('profile.loadErr') })
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
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) return
      const res = await fetch(`${backendUrl}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          resumeText,
          resumeNotes,
          jobSearchStatus,
          avatarId,
          profileJson: { coachTargetRole: targetRole, cvProfile },
        }),
      })
      if (!res.ok) throw new Error('save')
      const j = await res.json()
      setUpdatedAt(j.resumeUpdatedAt)
      setNote({ type: 'ok', text: t('profile.saveSuccess') })
    } catch {
      setNote({ type: 'err', text: t('profile.saveErr') })
    } finally {
      setSaving(false)
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
        return
      }
      if (!res.ok) {
        setNote({ type: 'err', text: j.details || j.error || t('profile.cv.extractErr') })
        return
      }
      setCvProfile(mergeCvProfileFromApi(j.cvProfile))
      setNote({ type: 'ok', text: t('profile.cv.extractOk') })
    } catch {
      setNote({ type: 'err', text: t('profile.cv.extractErr') })
    } finally {
      setExtractBusy(false)
    }
  }

  const onPdf = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || file.type !== 'application/pdf') {
      setNote({ type: 'err', text: t('profile.pdfOnly') })
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
        // Broadly remove special bullet symbols
        const clean = j.text.replace(/[●•⚫🌑⦿★■◾▪]/g, '').trim()
        setResumeText(clean)
      }
      setPendingPreviewOpen(false)
      setNote({ type: 'ok', text: t('profile.cv.pdfExtractOk', { n: j.charCount ?? 0 }) })
    } catch {
      setNote({ type: 'err', text: t('profile.parseErr') })
    } finally {
      setParseBusy(false)
    }
  }

  const applyPendingToResume = () => {
    if (!pendingRaw.trim()) return
    // Remove special "black dot" characters broadly
    const clean = pendingRaw.replace(/[●•⚫🌑⦿★■◾▪]/g, '').trim()
    setResumeText(clean)
    setPendingRaw('')
    setPendingPreviewOpen(false)
    setNote({ type: 'ok', text: t('profile.cv.appliedResumeOk') })
  }

  const skillsText = cvProfile.skills.join('\n')
  const setSkillsFromText = (txt) => {
    const skills = txt.split('\n').map((s) => s.trim()).filter(Boolean)
    setCvProfile((p) => ({ ...p, skills }))
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
          // ignore translation failure; keep existing coach text
        } finally {
          if (!cancelled) setCoachTranslating(false)
        }
      })()
    return () => { cancelled = true }
  }, [i18n.language, coach, coachGenerating, backendUrl])

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-b from-slate-50 via-white to-slate-100/90 px-4 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        <Loader2 className="h-9 w-9 animate-spin text-primary-600 dark:text-primary-400" aria-hidden />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('profile.title')}</p>
      </div>
    )
  }

  if (!isEdit) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50/80 to-white pt-24 pb-12 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 sm:pb-16 px-3 sm:px-6 lg:px-10">
        <div className="mx-auto w-full max-w-7xl">
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
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50/80 to-white pt-24 pb-12 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 sm:pb-16 px-3 sm:px-6 lg:px-10">
      {showFloatingQuickSwitch ? (
        <Link
          to="/profile"
          aria-label={t('profile.backToView')}
          className="fixed bottom-5 right-5 z-40 inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 shadow-[0_10px_24px_-12px_rgba(15,23,42,0.35)] transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700/80"
        >
          <Eye className="h-4 w-4" aria-hidden />
          {t('profile.backToView')}
        </Link>
      ) : null}

      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-8 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-card ring-1 ring-slate-900/[0.04] dark:border-slate-700/80 dark:bg-slate-900/60 dark:ring-white/[0.06] sm:mb-10">
          <div className="relative border-b border-slate-100 bg-gradient-to-br from-primary-600/[0.08] via-white to-violet-600/[0.07] px-5 py-6 dark:border-slate-800 dark:from-primary-500/10 dark:via-slate-900 dark:to-violet-600/10 sm:px-8 sm:py-7">
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary-400/25 to-transparent dark:via-primary-500/15" aria-hidden />
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start min-w-0 flex-1">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-violet-600 text-white shadow-lg shadow-primary-600/25 ring-2 ring-white dark:ring-slate-900">
                  <User className="h-7 w-7" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-balance text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl lg:text-4xl">
                    {t('profile.title')}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
                    {t('profile.cv.pageSub')}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center lg:gap-6">
                {/* Integrated Gallup Entry in Header (Edit Mode) */}
                <div className="relative hidden md:block w-full max-w-sm overflow-hidden rounded-2xl border border-emerald-100/80 bg-white/60 p-4 shadow-sm hover:shadow-md transition-shadow dark:border-emerald-900/40 dark:bg-slate-900/40">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-primary-600 text-white shadow-md ring-1 ring-white/20">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-slate-900 dark:text-white truncate">
                        {t('profile.gallupAdBadge')}
                      </p>
                      <p className="line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                        {t('profile.gallupAdText').split('，')[0]}
                      </p>
                    </div>
                    <Link
                      to="/gallup"
                      className="group/btn relative flex h-9 items-center justify-center overflow-hidden rounded-xl bg-slate-900 px-5 text-xs font-black text-white transition-all hover:bg-slate-800 hover:shadow-lg dark:bg-primary-600 dark:hover:bg-primary-700 whitespace-nowrap"
                    >
                      <span className="relative z-10 flex items-center gap-1.5">
                        {t('profile.gallupAdBtn')}
                        <ArrowRight className="h-3 w-3 transition-transform group-hover/btn:translate-x-0.5" />
                      </span>
                      <div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity group-hover/btn:opacity-100" />
                    </Link>
                  </div>
                </div>

                <Link
                  to="/profile"
                  className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700/80 whitespace-nowrap"
                >
                  <Eye className="h-4 w-4" aria-hidden />
                  {t('profile.backToView')}
                </Link>
              </div>
            </div>
          </div>
        </header>

        <div className="relative">
          <div className="mb-8 space-y-8 sm:mb-10">
            {/* 结构化资料 */}
            <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-card ring-1 ring-slate-900/[0.04] dark:border-slate-700/90 dark:bg-slate-900 dark:ring-white/[0.06]">
              <div className="relative border-b border-slate-200/80 bg-gradient-to-br from-primary-600/[0.07] via-white to-violet-600/[0.06] px-5 py-5 dark:border-slate-700/80 dark:from-primary-500/10 dark:via-slate-900 dark:to-violet-600/10 sm:px-8 sm:py-6">
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary-400/30 to-transparent dark:via-primary-500/20" aria-hidden />
                <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                      {t('profile.cv.structuredTitle')}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('profile.cv.structuredHint')}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => void onPdf(e)} />
                    <button
                      type="button"
                      disabled={parseBusy}
                      onClick={() => fileRef.current?.click()}
                      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 py-2.5 text-sm font-bold text-primary-800 transition-colors hover:bg-primary-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-primary-300 dark:hover:bg-slate-700/80"
                    >
                      {parseBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {t('profile.uploadPdf')}
                    </button>
                    {pendingRaw.trim() ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setPendingPreviewOpen((o) => !o)}
                          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700/80"
                        >
                          {pendingPreviewOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          {t('profile.cv.viewExtracted')}
                        </button>
                        <button
                          type="button"
                          onClick={applyPendingToResume}
                          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                          {t('profile.cv.applyToInterviewResume')}
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      disabled={extractBusy || ((pendingRaw || resumeText).trim().length < 80)}
                      onClick={() => void runExtractCv()}
                      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:from-violet-700 hover:to-primary-700 disabled:opacity-50"
                    >
                      {extractBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                      {extractBusy ? t('profile.cv.extracting') : t('profile.cv.extractBtn')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-8 p-4 sm:p-6 lg:p-8">
                {pendingRaw.trim() && pendingPreviewOpen ? (
                  <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300">{t('profile.cv.extractedPreviewLabel')}</p>
                    <pre className="max-h-[min(50vh,24rem)] overflow-auto whitespace-pre-wrap rounded-lg border border-amber-200/60 bg-white p-4 text-xs leading-relaxed text-slate-800 dark:border-amber-900/30 dark:bg-slate-900 dark:text-slate-200">
                      {pendingRaw}
                    </pre>
                  </div>
                ) : null}

                {/* 基本信息 */}
                <section>
                  <div className="mb-4 flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                    <User className="h-4 w-4 text-primary-600" />
                    {t('profile.cv.basic')}
                  </div>

                  <div className="mb-8 p-4 rounded-xl border border-slate-100 bg-slate-50/30 dark:border-slate-800 dark:bg-slate-900/30">
                    <label className="mb-3 block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('profile.chooseAvatar')}
                    </label>
                    <div className="flex flex-wrap gap-4">
                      <button
                        type="button"
                        onClick={() => setAvatarId(null)}
                        className={`flex h-16 w-16 items-center justify-center rounded-2xl border-2 transition-all hover:scale-105 shadow-sm overflow-hidden ${!avatarId
                          ? 'border-primary-600 bg-white dark:bg-slate-800 ring-4 ring-primary-500/10'
                          : 'border-white dark:border-slate-800 bg-white dark:bg-slate-800'
                          }`}
                      >
                        <div className={`flex items-center justify-center w-full h-full ${!avatarId ? 'bg-primary-50 dark:bg-primary-950/20' : ''}`}>
                          <User className={`h-8 w-8 ${!avatarId ? 'text-primary-600' : 'text-slate-300 dark:text-slate-600'}`} />
                        </div>
                      </button>
                      {avatars.map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setAvatarId(id)}
                          className={`relative h-16 w-16 overflow-hidden rounded-2xl border-2 transition-all hover:scale-105 shadow-sm ${avatarId === id
                            ? 'border-primary-600 ring-4 ring-primary-500/10'
                            : 'border-white dark:border-slate-800'
                            }`}
                        >
                          <img src={`/avatars/${id}.png`} alt={id} className="h-full w-full object-cover" />
                          {avatarId === id && (
                            <div className="absolute inset-0 flex items-center justify-center bg-primary-600/5">
                              <div className="absolute bottom-1 right-1 rounded-full bg-primary-600 p-0.5 text-white shadow-lg">
                                <CheckCircle2 className="h-3 w-3" />
                              </div>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">{t('profile.cv.fullName')}</label>
                      <input className={inputClass} value={cvProfile.fullName} onChange={(e) => setCvProfile((p) => ({ ...p, fullName: e.target.value }))} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">{t('profile.cv.gender')}</label>
                      <select className={inputClass} value={cvProfile.gender} onChange={(e) => setCvProfile((p) => ({ ...p, gender: e.target.value }))}>
                        <option value="">{t('profile.cv.genderEmpty')}</option>
                        <option value="female">{t('profile.cv.genderFemale')}</option>
                        <option value="male">{t('profile.cv.genderMale')}</option>
                        <option value="non_binary">{t('profile.cv.genderNb')}</option>
                        <option value="other">{t('profile.cv.genderOther')}</option>
                        <option value="prefer_not_to_say">{t('profile.cv.genderSkip')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">{t('profile.cv.email')}</label>
                      <input type="email" className={inputClass} value={cvProfile.email} onChange={(e) => setCvProfile((p) => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">{t('profile.cv.phone')}</label>
                      <input className={inputClass} value={cvProfile.phone} onChange={(e) => setCvProfile((p) => ({ ...p, phone: e.target.value }))} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">{t('profile.cv.location')}</label>
                      <input className={inputClass} value={cvProfile.location} onChange={(e) => setCvProfile((p) => ({ ...p, location: e.target.value }))} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">{t('profile.cv.linkedIn')}</label>
                      <input className={inputClass} value={cvProfile.linkedIn} onChange={(e) => setCvProfile((p) => ({ ...p, linkedIn: e.target.value }))} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">{t('profile.status')}</label>
                      <select className={inputClass} value={jobSearchStatus} onChange={(e) => setJobSearchStatus(e.target.value)}>
                        <option value="seeking">{t('profile.statusSeeking')}</option>
                        <option value="hired">{t('profile.statusHired')}</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">{t('profile.cv.website')}</label>
                      <input className={inputClass} value={cvProfile.website} onChange={(e) => setCvProfile((p) => ({ ...p, website: e.target.value }))} />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">{t('profile.cv.summary')}</label>
                    <textarea
                      rows={4}
                      className={`${inputClass} resize-y min-h-[100px]`}
                      value={cvProfile.summary}
                      onChange={(e) => setCvProfile((p) => ({ ...p, summary: e.target.value }))}
                    />
                  </div>
                </section>
            <section>
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                  <Briefcase className="h-4 w-4 text-primary-600" />
                  {t('profile.cv.work')}
                </div>
                <button
                  type="button"
                  onClick={() => setCvProfile((p) => ({ ...p, workExperience: [...p.workExperience, emptyWork()] }))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('profile.cv.add')}
                </button>
              </div>
              <div className="space-y-4">
                {cvProfile.workExperience.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t('profile.cv.emptySection')}</p>
                ) : null}
                {cvProfile.workExperience.map((w, i) => (
                  <div key={i} className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 dark:border-slate-600 dark:bg-slate-800/40">
                    <div className="mb-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setCvProfile((p) => ({ ...p, workExperience: p.workExperience.filter((_, j) => j !== i) }))}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t('profile.cv.remove')}
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input className={inputClass} placeholder={t('profile.cv.phCompany')} value={w.company} onChange={(e) => {
                        const v = [...cvProfile.workExperience]; v[i] = { ...v[i], company: e.target.value }; setCvProfile((p) => ({ ...p, workExperience: v }))
                      }} />
                      <input className={inputClass} placeholder={t('profile.cv.phTitle')} value={w.title} onChange={(e) => {
                        const v = [...cvProfile.workExperience]; v[i] = { ...v[i], title: e.target.value }; setCvProfile((p) => ({ ...p, workExperience: v }))
                      }} />
                      <input className={inputClass} placeholder={t('profile.cv.phLocation')} value={w.location} onChange={(e) => {
                        const v = [...cvProfile.workExperience]; v[i] = { ...v[i], location: e.target.value }; setCvProfile((p) => ({ ...p, workExperience: v }))
                      }} />
                      <div className="grid grid-cols-2 gap-2">
                        <input className={inputClass} placeholder={t('profile.cv.phStart')} value={w.startDate} onChange={(e) => {
                          const v = [...cvProfile.workExperience]; v[i] = { ...v[i], startDate: e.target.value }; setCvProfile((p) => ({ ...p, workExperience: v }))
                        }} />
                        <input className={inputClass} placeholder={t('profile.cv.phEnd')} value={w.endDate} onChange={(e) => {
                          const v = [...cvProfile.workExperience]; v[i] = { ...v[i], endDate: e.target.value }; setCvProfile((p) => ({ ...p, workExperience: v }))
                        }} />
                      </div>
                    </div>
                    <MultiLineInput
                      lines={w.highlights}
                      label={t('profile.cv.phHighlights')}
                      placeholder={t('profile.cv.phHighlights')}
                      t={t}
                      inputClass={inputClass}
                      onChange={(newLines) => {
                        const v = [...cvProfile.workExperience]
                        v[i] = { ...v[i], highlights: newLines }
                        setCvProfile((p) => ({ ...p, workExperience: v }))
                      }}
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* 教育 */}
            <section>
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                  <GraduationCap className="h-4 w-4 text-primary-600" />
                  {t('profile.cv.education')}
                </div>
                <button
                  type="button"
                  onClick={() => setCvProfile((p) => ({ ...p, education: [...p.education, emptyEducation()] }))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('profile.cv.add')}
                </button>
              </div>
              <div className="space-y-4">
                {cvProfile.education.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t('profile.cv.emptySection')}</p>
                ) : null}
                {cvProfile.education.map((ed, i) => (
                  <div key={i} className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 dark:border-slate-600 dark:bg-slate-800/40">
                    <div className="mb-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setCvProfile((p) => ({ ...p, education: p.education.filter((_, j) => j !== i) }))}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t('profile.cv.remove')}
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input className={inputClass} placeholder={t('profile.cv.phSchool')} value={ed.institution} onChange={(e) => {
                        const v = [...cvProfile.education]; v[i] = { ...v[i], institution: e.target.value }; setCvProfile((p) => ({ ...p, education: v }))
                      }} />
                      <input className={inputClass} placeholder={t('profile.cv.phDegree')} value={ed.degree} onChange={(e) => {
                        const v = [...cvProfile.education]; v[i] = { ...v[i], degree: e.target.value }; setCvProfile((p) => ({ ...p, education: v }))
                      }} />
                      <input className={inputClass} placeholder={t('profile.cv.phField')} value={ed.field} onChange={(e) => {
                        const v = [...cvProfile.education]; v[i] = { ...v[i], field: e.target.value }; setCvProfile((p) => ({ ...p, education: v }))
                      }} />
                      <input className={inputClass} placeholder={t('profile.cv.phGpa')} value={ed.gpa} onChange={(e) => {
                        const v = [...cvProfile.education]; v[i] = { ...v[i], gpa: e.target.value }; setCvProfile((p) => ({ ...p, education: v }))
                      }} />
                      <input className={inputClass} placeholder={t('profile.cv.phStart')} value={ed.startDate} onChange={(e) => {
                        const v = [...cvProfile.education]; v[i] = { ...v[i], startDate: e.target.value }; setCvProfile((p) => ({ ...p, education: v }))
                      }} />
                      <input className={inputClass} placeholder={t('profile.cv.phEnd')} value={ed.endDate} onChange={(e) => {
                        const v = [...cvProfile.education]; v[i] = { ...v[i], endDate: e.target.value }; setCvProfile((p) => ({ ...p, education: v }))
                      }} />
                    </div>
                    <MultiLineInput
                      lines={ed.details}
                      label={t('profile.cv.phEduDetails')}
                      placeholder={t('profile.cv.phEduDetails')}
                      t={t}
                      inputClass={inputClass}
                      onChange={(newLines) => {
                        const v = [...cvProfile.education]
                        v[i] = { ...v[i], details: newLines }
                        setCvProfile((p) => ({ ...p, education: v }))
                      }}
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* 项目 */}
            <section>
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                  <FolderKanban className="h-4 w-4 text-primary-600" />
                  {t('profile.cv.projects')}
                </div>
                <button
                  type="button"
                  onClick={() => setCvProfile((p) => ({ ...p, projects: [...p.projects, emptyProject()] }))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('profile.cv.add')}
                </button>
              </div>
              <div className="space-y-4">
                {cvProfile.projects.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t('profile.cv.emptySection')}</p>
                ) : null}
                {cvProfile.projects.map((pr, i) => (
                  <div key={i} className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 dark:border-slate-600 dark:bg-slate-800/40">
                    <div className="mb-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setCvProfile((p) => ({ ...p, projects: p.projects.filter((_, j) => j !== i) }))}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t('profile.cv.remove')}
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input className={inputClass} placeholder={t('profile.cv.phProjName')} value={pr.name} onChange={(e) => {
                        const v = [...cvProfile.projects]; v[i] = { ...v[i], name: e.target.value }; setCvProfile((p) => ({ ...p, projects: v }))
                      }} />
                      <input className={inputClass} placeholder={t('profile.cv.phProjRole')} value={pr.role} onChange={(e) => {
                        const v = [...cvProfile.projects]; v[i] = { ...v[i], role: e.target.value }; setCvProfile((p) => ({ ...p, projects: v }))
                      }} />
                      <input className={inputClass} placeholder={t('profile.cv.phStart')} value={pr.startDate} onChange={(e) => {
                        const v = [...cvProfile.projects]; v[i] = { ...v[i], startDate: e.target.value }; setCvProfile((p) => ({ ...p, projects: v }))
                      }} />
                      <input className={inputClass} placeholder={t('profile.cv.phEnd')} value={pr.endDate} onChange={(e) => {
                        const v = [...cvProfile.projects]; v[i] = { ...v[i], endDate: e.target.value }; setCvProfile((p) => ({ ...p, projects: v }))
                      }} />
                    </div>
                    <MultiLineInput
                      lines={pr.description}
                      label={t('profile.cv.phProjDesc')}
                      placeholder={t('profile.cv.phProjDesc')}
                      t={t}
                      inputClass={inputClass}
                      onChange={(newLines) => {
                        const v = [...cvProfile.projects]
                        v[i] = { ...v[i], description: newLines }
                        setCvProfile((p) => ({ ...p, projects: v }))
                      }}
                    />
                    <div className="mt-4">
                      <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">{t('profile.cv.phTech')}</label>
                      <input
                        className={inputClass}
                        placeholder={t('profile.cv.phTech')}
                        value={pr.technologies}
                        onChange={(e) => {
                          const v = [...cvProfile.projects]; v[i] = { ...v[i], technologies: e.target.value }; setCvProfile((p) => ({ ...p, projects: v }))
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 发表 */}
            <section>
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                  <BookOpen className="h-4 w-4 text-primary-600" />
                  {t('profile.cv.publications')}
                </div>
                <button
                  type="button"
                  onClick={() => setCvProfile((p) => ({ ...p, publications: [...p.publications, emptyPublication()] }))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('profile.cv.add')}
                </button>
              </div>
              <div className="space-y-4">
                {cvProfile.publications.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t('profile.cv.emptySection')}</p>
                ) : null}
                {cvProfile.publications.map((pub, i) => (
                  <div key={i} className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 dark:border-slate-600 dark:bg-slate-800/40">
                    <div className="mb-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setCvProfile((p) => ({ ...p, publications: p.publications.filter((_, j) => j !== i) }))}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t('profile.cv.remove')}
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input className={`${inputClass} sm:col-span-2`} placeholder={t('profile.cv.phPubTitle')} value={pub.title} onChange={(e) => {
                        const v = [...cvProfile.publications]; v[i] = { ...v[i], title: e.target.value }; setCvProfile((p) => ({ ...p, publications: v }))
                      }} />
                      <input className={inputClass} placeholder={t('profile.cv.phVenue')} value={pub.venue} onChange={(e) => {
                        const v = [...cvProfile.publications]; v[i] = { ...v[i], venue: e.target.value }; setCvProfile((p) => ({ ...p, publications: v }))
                      }} />
                      <input className={inputClass} placeholder={t('profile.cv.phYear')} value={pub.year} onChange={(e) => {
                        const v = [...cvProfile.publications]; v[i] = { ...v[i], year: e.target.value }; setCvProfile((p) => ({ ...p, publications: v }))
                      }} />
                      <input className={`${inputClass} sm:col-span-2`} placeholder={t('profile.cv.phAuthors')} value={pub.authors} onChange={(e) => {
                        const v = [...cvProfile.publications]; v[i] = { ...v[i], authors: e.target.value }; setCvProfile((p) => ({ ...p, publications: v }))
                      }} />
                      <input className={`${inputClass} sm:col-span-2`} placeholder={t('profile.cv.phUrl')} value={pub.url} onChange={(e) => {
                        const v = [...cvProfile.publications]; v[i] = { ...v[i], url: e.target.value }; setCvProfile((p) => ({ ...p, publications: v }))
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 技能 + 语言 */}
            <div className="grid gap-8 lg:grid-cols-2">
              <section>
                <div className="mb-4 flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                  <Tags className="h-4 w-4 text-primary-600" />
                  {t('profile.cv.skills')}
                </div>
                <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{t('profile.cv.skillsHint')}</p>
                <textarea
                  rows={8}
                  className={`${inputClass} resize-y font-mono text-xs leading-relaxed`}
                  value={skillsText}
                  onChange={(e) => setSkillsFromText(e.target.value)}
                  placeholder={t('profile.cv.skillsPlaceholder')}
                />
              </section>
              <section>
                <div className="mb-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                    <Languages className="h-4 w-4 text-primary-600" />
                    {t('profile.cv.languages')}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCvProfile((p) => ({ ...p, languages: [...p.languages, emptyLanguage()] }))}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t('profile.cv.add')}
                  </button>
                </div>
                <div className="space-y-3">
                  {cvProfile.languages.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('profile.cv.emptySection')}</p>
                  ) : null}
                  {cvProfile.languages.map((lang, i) => (
                    <div key={i} className="flex flex-wrap items-end gap-2">
                      <input className={`${inputClass} flex-1 min-w-[8rem]`} placeholder={t('profile.cv.phLangName')} value={lang.name} onChange={(e) => {
                        const v = [...cvProfile.languages]; v[i] = { ...v[i], name: e.target.value }; setCvProfile((p) => ({ ...p, languages: v }))
                      }} />
                      <input className={`${inputClass} flex-1 min-w-[8rem]`} placeholder={t('profile.cv.phLangLevel')} value={lang.proficiency} onChange={(e) => {
                        const v = [...cvProfile.languages]; v[i] = { ...v[i], proficiency: e.target.value }; setCvProfile((p) => ({ ...p, languages: v }))
                      }} />
                      <button type="button" onClick={() => setCvProfile((p) => ({ ...p, languages: p.languages.filter((_, j) => j !== i) }))} className="p-2 text-red-600 dark:text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* 奖项 */}
            <section>
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                  <Award className="h-4 w-4 text-primary-600" />
                  {t('profile.cv.awards')}
                </div>
                <button
                  type="button"
                  onClick={() => setCvProfile((p) => ({ ...p, awards: [...p.awards, emptyAward()] }))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('profile.cv.add')}
                </button>
              </div>
              <div className="space-y-3">
                {cvProfile.awards.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t('profile.cv.emptySection')}</p>
                ) : null}
                {cvProfile.awards.map((aw, i) => (
                  <div key={i} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200/90 bg-slate-50/50 p-3 dark:border-slate-600 dark:bg-slate-800/40">
                    <input className={`${inputClass} flex-1 min-w-[10rem]`} placeholder={t('profile.cv.phAwardTitle')} value={aw.title} onChange={(e) => {
                      const v = [...cvProfile.awards]; v[i] = { ...v[i], title: e.target.value }; setCvProfile((p) => ({ ...p, awards: v }))
                    }} />
                    <input className={`${inputClass} w-24`} placeholder={t('profile.cv.phYear')} value={aw.year} onChange={(e) => {
                      const v = [...cvProfile.awards]; v[i] = { ...v[i], year: e.target.value }; setCvProfile((p) => ({ ...p, awards: v }))
                    }} />
                    <input className={`${inputClass} flex-1 min-w-[8rem]`} placeholder={t('profile.cv.phIssuer')} value={aw.issuer} onChange={(e) => {
                      const v = [...cvProfile.awards]; v[i] = { ...v[i], issuer: e.target.value }; setCvProfile((p) => ({ ...p, awards: v }))
                    }} />
                    <button type="button" onClick={() => setCvProfile((p) => ({ ...p, awards: p.awards.filter((_, j) => j !== i) }))} className="p-2 text-red-600 dark:text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* 折叠：面试用简历原文 */}
            <div className="rounded-xl border border-slate-200/90 dark:border-slate-600">
              <button
                type="button"
                onClick={() => setRawResumeOpen((o) => !o)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-bold text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800/60"
              >
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary-600" />
                  {t('profile.cv.rawResumeTitle')}
                </span>
                {rawResumeOpen ? <ChevronUp className="h-5 w-5 shrink-0" /> : <ChevronDown className="h-5 w-5 shrink-0" />}
              </button>
              {rawResumeOpen ? (
                <div className="space-y-3 border-t border-slate-200/80 p-4 dark:border-slate-600">
                  <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t('profile.cv.rawResumeHint')}</p>
                  {pendingRaw.trim() ? (
                    <button
                      type="button"
                      onClick={applyPendingToResume}
                      className="inline-flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-bold text-primary-800 hover:bg-primary-100 dark:border-slate-600 dark:bg-slate-800 dark:text-primary-300 dark:hover:bg-slate-700"
                    >
                      <FileText className="h-4 w-4" />
                      {t('profile.cv.applyToInterviewResume')}
                    </button>
                  ) : null}
                  <textarea
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    spellCheck={false}
                    placeholder={t('profile.placeholder')}
                    className="w-full min-h-[min(40vh,20rem)] resize-y rounded-xl border-2 border-slate-200 bg-slate-50/90 px-4 py-3 text-sm leading-relaxed text-slate-900 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-100"
                  />
                </div>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">{t('profile.sectionNotes')}</label>
              <textarea
                value={resumeNotes}
                onChange={(e) => setResumeNotes(e.target.value)}
                rows={3}
                placeholder={t('profile.notesPh')}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-800"
              />
            </div>

            {note && (
              <div
                role="status"
                className={`rounded-xl border px-4 py-3 text-sm sm:text-[15px] ${note.type === 'err'
                    ? 'border-red-200 bg-red-50/90 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200'
                    : 'border-emerald-200 bg-emerald-50/90 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-100'
                  }`}
              >
                {note.text}
              </div>
            )}

            <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center">
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="btn-primary inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-10 py-3.5 text-base font-bold sm:min-w-[200px]"
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                {t('profile.save')}
              </button>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 sm:flex-1 sm:text-sm">{t('profile.cv.saveFooter')}</p>
            </div>
          </div>
        </div>

        {/* AI 简历诊断 */}
        <div ref={coachSectionRef} className="mb-8 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-card ring-1 ring-slate-900/[0.04] dark:border-slate-700/90 dark:bg-slate-900 dark:ring-white/[0.06] sm:mb-10">
          <div className="relative border-b border-slate-200/80 bg-gradient-to-br from-amber-500/[0.12] via-white to-orange-500/[0.08] px-5 py-5 dark:border-slate-700/80 dark:from-amber-500/15 dark:via-slate-900 dark:to-orange-600/10 sm:px-8 sm:py-6">
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent dark:via-amber-500/20" aria-hidden />
            <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md">
                  <Lightbulb className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                    {t('profile.coachTitle')}
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">{t('profile.coachSub')}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-4 p-5 sm:p-8">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200" htmlFor="profile-coach-target">
                {t('profile.coachTargetRole')}
              </label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                <input
                  id="profile-coach-target"
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder={t('profile.coachTargetPh')}
                  className="min-h-[48px] flex-1 rounded-xl border-2 border-slate-200 bg-slate-50/90 px-4 py-3 text-sm outline-none transition-shadow focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15 dark:border-slate-600 dark:bg-slate-800/80 dark:focus:border-primary-400"
                />
                <button
                  type="button"
                  disabled={coachGenerating}
                  onClick={() => void runCoach()}
                  className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 sm:px-8"
                >
                  {coachGenerating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Lightbulb className="h-4 w-4" aria-hidden />}
                  {coachGenerating ? t('profile.coachRunning') : t('profile.coachRun')}
                </button>
                {coach && !coachGenerating ? (
                  <Link
                    to="/profile"
                    className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700/80 sm:px-7"
                  >
                    <Eye className="h-4 w-4" aria-hidden />
                    {t('profile.backToView')}
                  </Link>
                ) : null}
              </div>
            </div>
            {coachErr && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
              >
                {coachErr}
              </div>
            )}
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-500">{t('profile.coachFallbackHint')}</p>
          </div>
        </div>

        {coach && (
          <div className="mb-10 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-card ring-1 ring-slate-900/[0.04] dark:border-slate-700/90 dark:bg-slate-900 dark:ring-white/[0.06]">
            {timeStr ? (
              <div className="relative border-b border-slate-100 bg-gradient-to-r from-primary-600/[0.06] via-violet-600/[0.05] to-transparent px-5 py-3.5 dark:border-slate-800 dark:from-primary-500/12 dark:via-violet-500/10 sm:px-8">
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary-400/20 to-transparent dark:via-primary-500/15" aria-hidden />
                <p className="relative flex items-start gap-2.5 text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-400 sm:text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden />
                  {t('profile.coachPersistNote', { time: timeStr })}
                </p>
              </div>
            ) : null}
            <div className="p-6 sm:p-8 lg:p-10">
              {coachTranslating ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12">
                  <Loader2 className="h-7 w-7 animate-spin text-primary-600 dark:text-primary-400" aria-hidden />
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('profile.coachTranslating', { lang: coachLangName })}</p>
                </div>
              ) : (
                <CoachReport coach={coach} t={t} />
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  </div>
</div>
)
}
