import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { getBackendBaseUrl } from '../lib/backendBase'
import {
  Search, Building2, GraduationCap, Briefcase, MapPin,
  Clock, ChevronDown, ChevronUp, MessageSquareQuote,
  CheckCircle2, XCircle, Award, Globe2, Loader2, Filter,
} from 'lucide-react'

function ResultBadge({ result, t }) {
  if (!result) return null
  const lower = result.toLowerCase()
  if (lower.includes('offer') || lower.includes('admitted')) {
    const label = lower.includes('admitted') ? t('exp.resultAdmitted') : t('exp.resultOffer')
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
        <CheckCircle2 className="w-3.5 h-3.5" />
        {label}
      </span>
    )
  }
  if (lower.includes('reject')) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800">
        <XCircle className="w-3.5 h-3.5" />
        {t('exp.resultRejected')}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
      {result}
    </span>
  )
}

function TypeBadge({ type, t }) {
  if (type === 'school') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800">
        <GraduationCap className="w-3 h-3" />
        {t('exp.tagSchool')}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
      <Briefcase className="w-3 h-3" />
      {t('exp.tagWork')}
    </span>
  )
}

function ExperienceCard({ exp, t }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-6 sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <TypeBadge type={exp.type} t={t} />
              <ResultBadge result={exp.result} t={t} />
              {exp.salary && (
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                  {exp.salary}
                </span>
              )}
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                {exp.company}
              </h3>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mt-1">
                {exp.position}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-500">
              {exp.department && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {exp.department}
                </span>
              )}
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {exp.location}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {exp.date}
              </span>
              <span className="flex items-center gap-1">
                <Globe2 className="w-3.5 h-3.5" />
                {exp.language}
              </span>
            </div>
          </div>

          <div className="shrink-0 mt-1">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 ${
              expanded
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            }`}>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-6 sm:px-8 pb-8 space-y-8">
              <div className="h-px bg-slate-100 dark:bg-slate-800" />

              {exp.rounds?.map((round, ri) => (
                <div key={ri} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black">
                      {round.round}
                    </span>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">
                        {round.format}
                      </h4>
                      {round.duration_min && (
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {round.duration_min} min
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 pl-10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                      {t('exp.questionsTitle')}
                    </p>
                    {round.questions.map((q, qi) => (
                      <div
                        key={qi}
                        className="flex gap-3 py-2.5 px-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50"
                      >
                        <span className="shrink-0 w-5 h-5 rounded-md bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-black text-slate-600 dark:text-slate-300 mt-0.5">
                          {qi + 1}
                        </span>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          {q}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {exp.reflection && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MessageSquareQuote className="w-4 h-4 text-slate-400" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {t('exp.reflectionTitle')}
                    </p>
                  </div>
                  <div className="p-5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30">
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-[1.8] whitespace-pre-line">
                      {exp.reflection}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function ExperiencesPage() {
  const { t } = useTranslation()
  const [experiences, setExperiences] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    document.title = t('meta.title')
  }, [t])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const backendUrl = getBackendBaseUrl()
        const res = await fetch(`${backendUrl}/api/experiences`)
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        if (!cancelled) setExperiences(data.experiences || [])
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    let list = experiences
    if (filter === 'work') list = list.filter(e => e.type === 'work')
    if (filter === 'school') list = list.filter(e => e.type === 'school')

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(e =>
        e.company.toLowerCase().includes(q) ||
        e.position.toLowerCase().includes(q) ||
        (e.department || '').toLowerCase().includes(q) ||
        (e.location || '').toLowerCase().includes(q) ||
        e.rounds?.some(r =>
          r.questions?.some(qu => qu.toLowerCase().includes(q)) ||
          (r.format || '').toLowerCase().includes(q)
        ) ||
        (e.reflection || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [experiences, filter, search])

  const stats = useMemo(() => {
    const total = experiences.length
    const work = experiences.filter(e => e.type === 'work').length
    const school = experiences.filter(e => e.type === 'school').length
    const offers = experiences.filter(e => {
      const r = (e.result || '').toLowerCase()
      return r.includes('offer') || r.includes('admitted')
    }).length
    return { total, work, school, offers }
  }, [experiences])

  const filterTabs = [
    { key: 'all', label: t('exp.filterAll'), count: stats.total },
    { key: 'work', label: t('exp.filterWork'), count: stats.work },
    { key: 'school', label: t('exp.filterSchool'), count: stats.school },
  ]

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-slate-950 pt-32 pb-20">
      <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
        <header className="mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl space-y-6"
          >
            <div className="section-badge">{t('exp.badge')}</div>
            <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight font-serif">
              {t('exp.title')}
            </h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
              {t('exp.subtitle')}
            </p>
          </motion.div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            <span className="ml-3 text-sm font-bold text-slate-500">{t('exp.loading')}</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-32">
            <p className="text-sm font-bold text-red-500">{t('exp.error')}</p>
          </div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10"
            >
              {[
                { n: stats.total, label: t('exp.filterAll'), icon: Filter, color: 'slate' },
                { n: stats.work, label: t('exp.filterWork'), icon: Briefcase, color: 'blue' },
                { n: stats.school, label: t('exp.filterSchool'), icon: GraduationCap, color: 'violet' },
                { n: stats.offers, label: 'Offers / Admitted', icon: Award, color: 'emerald' },
              ].map(({ n, label, icon: Icon, color }) => (
                <div
                  key={label}
                  className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <Icon className={`w-4 h-4 text-${color}-500`} />
                    <span className="text-2xl font-black text-slate-900 dark:text-white">{n}</span>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                </div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-10"
            >
              <div className="flex gap-2 bg-slate-50 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                {filterTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      filter === tab.key
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                    <span className={`ml-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                      filter === tab.key
                        ? 'bg-slate-100 dark:bg-slate-700'
                        : 'bg-slate-200/50 dark:bg-slate-800'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('exp.searchPlaceholder')}
                  className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-300 dark:focus:border-slate-600 transition-colors"
                />
              </div>
            </motion.div>

            {filtered.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <p className="text-sm font-bold text-slate-400">{t('exp.noResults')}</p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="space-y-5"
              >
                <AnimatePresence mode="popLayout">
                  {filtered.map((exp) => (
                    <ExperienceCard key={exp.id} exp={exp} t={t} />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
