import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { getBackendBaseUrl } from '../lib/backendBase'
import {
  Briefcase, FileText, Globe2, Clock, ArrowRight,
  Info, Sparkles, Upload, Loader2, X, Check, LayoutTemplate,
  ChevronDown,
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

function buildRoleCatalog(lang) {
  if (lang === 'zh') {
    return {
      school: {
        cs_ai: { label: '计算机 / AI', roles: ['计算机硕士面试', '计算机本科面试', '数据科学硕士面试', '人工智能/机器学习项目面试'] },
        engineering: { label: '工程类', roles: ['机械工程项目面试', '电气工程项目面试', '工业工程项目面试', '汽车工程项目面试'] },
        business: { label: '商科 / 管理', roles: ['工商管理项目面试', '金融项目面试', '市场项目面试', '国际管理项目面试'] },
        design_media: { label: '设计 / 媒体', roles: ['交互设计项目面试', '视觉传达项目面试', '媒体信息学项目面试', '人机交互项目面试'] },
        science_math: { label: '理学 / 数学', roles: ['数学项目面试', '统计学项目面试', '物理项目面试', '化学项目面试'] },
        social_law: { label: '社科 / 法学', roles: ['经济学项目面试', '心理学项目面试', '法学项目面试', '公共政策项目面试'] },
      },
      work: {
        software_data: { label: '软件 / 数据', roles: ['Werkstudent 前端开发', 'Werkstudent 后端开发', '数据科学实习', '产品分析学生工'] },
        ai_research: { label: 'AI / 算法', roles: ['机器学习实习', 'LLM 应用实习', '计算机视觉实习', '算法工程学生工'] },
        product_design: { label: '产品 / 设计', roles: ['UX 设计学生工', '产品经理实习', 'UI 设计实习', '用户研究学生工'] },
        marketing_sales: { label: '市场 / 销售', roles: ['市场实习', '增长营销学生工', 'CRM 学生工', '销售运营实习'] },
        consulting_ops: { label: '咨询 / 运营', roles: ['咨询实习', '运营实习', '商业发展学生工', '战略 / PMO 学生工'] },
        finance_hr: { label: '财务 / 人力', roles: ['财务实习', '审计实习', '人力资源实习', '招聘运营学生工'] },
        engineering_industry: { label: '工程 / 制造', roles: ['机械工程学生工', '电气工程实习', '汽车工程实习', '生产与供应链实习'] },
      },
    }
  }

  if (lang === 'de') {
    return {
      school: {
        cs_ai: { label: 'Informatik / KI', roles: ['Master-Interview Informatik', 'Bachelor-Interview Informatik', 'Master-Interview Data Science', 'Interview KI/ML-Studiengang'] },
        engineering: { label: 'Ingenieurwesen', roles: ['Interview Maschinenbau-Studiengang', 'Interview Elektrotechnik-Studiengang', 'Interview Wirtschaftsingenieurwesen', 'Interview Fahrzeugtechnik-Studiengang'] },
        business: { label: 'Wirtschaft / Management', roles: ['Interview BWL-Studiengang', 'Interview Finance-Studiengang', 'Interview Marketing-Studiengang', 'Interview International Management'] },
        design_media: { label: 'Design / Medien', roles: ['Interview UX/Interaction Design', 'Interview Kommunikationsdesign', 'Interview Medieninformatik', 'Interview Human-Computer Interaction'] },
        science_math: { label: 'Naturwissenschaften / Mathematik', roles: ['Interview Mathematik-Studiengang', 'Interview Statistik-Studiengang', 'Interview Physik-Studiengang', 'Interview Chemie-Studiengang'] },
        social_law: { label: 'Sozialwissenschaften / Recht', roles: ['Interview VWL-Studiengang', 'Interview Psychologie-Studiengang', 'Interview Jura-Studiengang', 'Interview Public Policy'] },
      },
      work: {
        software_data: { label: 'Software / Data', roles: ['Werkstudent Frontend Developer', 'Werkstudent Backend Developer', 'Praktikum Data Scientist', 'Working Student Product Analyst'] },
        ai_research: { label: 'KI / Forschung', roles: ['Praktikum Machine Learning', 'Praktikum LLM Applications', 'Praktikum Computer Vision', 'Werkstudent Algorithm Engineer'] },
        product_design: { label: 'Produkt / Design', roles: ['Working Student UX Design', 'Praktikum Product Management', 'Praktikum UI Design', 'Working Student User Research'] },
        marketing_sales: { label: 'Marketing / Sales', roles: ['Praktikum Marketing', 'Working Student Performance Marketing', 'Working Student CRM', 'Praktikum Sales Operations'] },
        consulting_ops: { label: 'Consulting / Operations', roles: ['Praktikant Unternehmensberatung', 'Praktikum Operations', 'Working Student Business Development', 'Working Student Strategy & PMO'] },
        finance_hr: { label: 'Finance / HR', roles: ['Praktikum Finance', 'Praktikum Audit', 'Praktikum Human Resources', 'Working Student Recruiting Operations'] },
        engineering_industry: { label: 'Engineering / Industrie', roles: ['Werkstudent Maschinenbau', 'Praktikum Elektrotechnik', 'Praktikum Automotive Engineering', 'Praktikum Produktion & Supply Chain'] },
      },
    }
  }

  return {
    school: {
      cs_ai: { label: 'Computer Science / AI', roles: ['Computer Science Master Interview', 'Computer Science Bachelor Interview', 'Data Science Master Interview', 'AI / Machine Learning Program Interview'] },
      engineering: { label: 'Engineering', roles: ['Mechanical Engineering Program Interview', 'Electrical Engineering Program Interview', 'Industrial Engineering Program Interview', 'Automotive Engineering Program Interview'] },
      business: { label: 'Business / Management', roles: ['Business Administration Program Interview', 'Finance Program Interview', 'Marketing Program Interview', 'International Management Program Interview'] },
      design_media: { label: 'Design / Media', roles: ['UX / Interaction Design Program Interview', 'Communication Design Program Interview', 'Media Informatics Program Interview', 'Human-Computer Interaction Program Interview'] },
      science_math: { label: 'Science / Mathematics', roles: ['Mathematics Program Interview', 'Statistics Program Interview', 'Physics Program Interview', 'Chemistry Program Interview'] },
      social_law: { label: 'Social Science / Law', roles: ['Economics Program Interview', 'Psychology Program Interview', 'Law Program Interview', 'Public Policy Program Interview'] },
    },
    work: {
      software_data: { label: 'Software / Data', roles: ['Werkstudent Frontend Developer', 'Werkstudent Backend Developer', 'Praktikum Data Scientist', 'Working Student Product Analyst'] },
      ai_research: { label: 'AI / Research', roles: ['Machine Learning Internship', 'LLM Applications Internship', 'Computer Vision Internship', 'Working Student Algorithm Engineer'] },
      product_design: { label: 'Product / Design', roles: ['Working Student UX Design', 'Praktikum Product Management', 'Praktikum UI Design', 'Working Student User Research'] },
      marketing_sales: { label: 'Marketing / Sales', roles: ['Praktikum Marketing', 'Working Student Performance Marketing', 'Working Student CRM', 'Praktikum Sales Operations'] },
      consulting_ops: { label: 'Consulting / Operations', roles: ['Praktikant Unternehmensberatung', 'Praktikum Operations', 'Working Student Business Development', 'Working Student Strategy & PMO'] },
      finance_hr: { label: 'Finance / HR', roles: ['Finance Internship', 'Audit Internship', 'Human Resources Internship', 'Working Student Recruiting Operations'] },
      engineering_industry: { label: 'Engineering / Industry', roles: ['Werkstudent Mechanical Engineering', 'Electrical Engineering Internship', 'Automotive Engineering Internship', 'Production & Supply Chain Internship'] },
    },
  }
}

function CategorySelector({ value, options, onChange, placeholder, t }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find((o) => o.value === value)

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all duration-300 ${
          isOpen
            ? 'border-primary-500 bg-white ring-4 ring-primary-500/10 dark:border-primary-400 dark:bg-slate-900/90 dark:ring-primary-400/15'
            : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/80 dark:border-slate-600 dark:bg-slate-800/80 dark:hover:border-slate-500 dark:hover:bg-slate-700/60'
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <LayoutTemplate className={`h-4 w-4 shrink-0 ${value ? 'text-primary-600' : 'text-slate-400'}`} />
          <span className={`truncate ${value ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.ul
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            className="absolute left-0 right-0 z-50 mt-2 max-h-[320px] overflow-auto rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-[0_20px_48px_-12px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/95 dark:shadow-[0_20px_48px_-12px_rgba(0,0,0,0.5)]"
          >
            {options.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt.value)
                    setIsOpen(false)
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-sm font-medium transition-colors ${
                    value === opt.value
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300'
                      : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/80'
                  }`}
                >
                  {opt.label}
                  {value === opt.value && <Check className="h-4 w-4" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function SetupPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [roleTrack, setRoleTrack] = useState('work')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [form, setForm] = useState({
    position: '',
    jobDescription: '',
    language: 'English',
    duration: 10,
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [profileResumeText, setProfileResumeText] = useState('')
  const [sessionResumeText, setSessionResumeText] = useState('')
  const [resumeParsing, setResumeParsing] = useState(false)
  const [resumeNote, setResumeNote] = useState(null)
  const resumeFileRef = useRef(null)

  const effectiveResume = (sessionResumeText.trim() || profileResumeText.trim())

  useEffect(() => {
    document.title = t('meta.title')
  }, [t])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const backendUrl = getBackendBaseUrl()
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        if (!token) return
        const res = await fetch(`${backendUrl}/api/profile/resume`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok || cancelled) return
        const j = await res.json()
        if (!cancelled) setProfileResumeText(j.resumeText || '')
      } catch { /* ignore */ }
    })()
    return () => { cancelled = true }
  }, [])

  const languages = useMemo(() => [
    { value: 'English', label: 'English', flag: '🇬🇧', desc: t('setup.langEnDesc') },
    { value: 'Deutsch', label: 'Deutsch', flag: '🇩🇪', desc: t('setup.langDeDesc') },
  ], [t])

  const durations = useMemo(() => [
    { value: 5, label: t('setup.dur5'), desc: t('setup.dur5d') },
    { value: 10, label: t('setup.dur10'), desc: t('setup.dur10d') },
    { value: 15, label: t('setup.dur15'), desc: t('setup.dur15d') },
    { value: 20, label: t('setup.dur20'), desc: t('setup.dur20d') },
  ], [t])

  const trackTabs = useMemo(
    () => [
      { value: 'school', label: t('setup.trackSchool') },
      { value: 'work', label: t('setup.trackWork') },
    ],
    [t],
  )

  const uiLang = useMemo(() => {
    const c = String(i18n.resolvedLanguage || i18n.language || 'en').toLowerCase()
    if (c.startsWith('zh')) return 'zh'
    if (c.startsWith('de')) return 'de'
    return 'en'
  }, [i18n.language, i18n.resolvedLanguage])

  const roleCatalog = useMemo(() => buildRoleCatalog(uiLang), [uiLang])
  const categories = roleCatalog[roleTrack] || {}
  const categoryEntries = Object.entries(categories)
  const selectedRoles = selectedCategory && categories[selectedCategory]
    ? categories[selectedCategory].roles
    : []

  const validate = () => {
    const newErrors = {}
    if (!form.position.trim()) newErrors.position = t('setup.errPos')
    if (!form.jobDescription.trim()) newErrors.jobDescription = t('setup.errDesc')
    if (form.jobDescription.trim().length < 50) newErrors.jobDescription = t('setup.errDescShort')
    return newErrors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = validate()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    let interviewId = null
    try {
      const backendUrl = getBackendBaseUrl()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (token) {
        const body = {
          position: form.position,
          job_description: form.jobDescription,
          language: form.language,
          duration: form.duration,
        }
        if (effectiveResume) body.resume_snapshot = effectiveResume.slice(0, 50_000)

        const res = await fetch(`${backendUrl}/api/interviews`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }).catch(() => null)
        if (res?.ok) {
          const j = await res.json().catch(() => ({}))
          interviewId = j.interview?.id ?? null
        }
      }
    } catch {
      // non-blocking
    }

    setLoading(false)
    navigate('/interview', {
      state: {
        ...form,
        interviewId,
        resumeContext: effectiveResume,
      },
    })
  }

  const handleResumePdf = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.type !== 'application/pdf') {
      setResumeNote({ type: 'err', text: t('setup.resumePdfOnly') })
      return
    }
    setResumeParsing(true)
    setResumeNote(null)
    try {
      const backendUrl = getBackendBaseUrl()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('no auth')
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
      setSessionResumeText(j.text || '')
      if (j.warning) setResumeNote({ type: 'warn', text: j.warning })
      else setResumeNote({ type: 'ok', text: t('setup.resumeParsed', { n: j.charCount ?? 0 }) })
    } catch {
      setResumeNote({ type: 'err', text: t('setup.resumeParseErr') })
    } finally {
      setResumeParsing(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-100 via-slate-50/90 to-white pt-24 pb-12 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 sm:pb-16">
      <div className="pointer-events-none absolute inset-0 bg-mesh-subtle opacity-60 dark:opacity-40" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-dot-grid opacity-[0.12] dark:opacity-[0.08]" aria-hidden />
      <div
        className="pointer-events-none absolute -top-16 right-0 h-[min(420px,85vw)] w-[min(420px,85vw)] rounded-full bg-primary-200/30 blur-3xl dark:bg-primary-900/25"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 h-[min(320px,75vw)] w-[min(320px,75vw)] rounded-full bg-violet-200/25 blur-3xl dark:bg-violet-950/30"
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-10">
        <header className="mb-8 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-card ring-1 ring-slate-900/[0.04] dark:border-slate-700/80 dark:bg-slate-900/60 dark:ring-white/[0.06] sm:mb-10">
          <div className="relative border-b border-slate-100 bg-gradient-to-br from-primary-600/[0.08] via-white to-violet-600/[0.07] px-5 py-6 dark:border-slate-800 dark:from-primary-500/10 dark:via-slate-900 dark:to-violet-600/10 sm:px-8 sm:py-7">
            <div
              className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary-400/25 to-transparent dark:via-primary-500/15"
              aria-hidden
            />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-violet-600 text-white shadow-lg shadow-primary-600/25 ring-2 ring-white dark:ring-slate-900">
                <LayoutTemplate className="h-7 w-7" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary-200/80 bg-primary-50/90 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary-800 shadow-soft backdrop-blur-sm dark:border-primary-700/50 dark:bg-primary-900/40 dark:text-primary-100">
                  <Sparkles className="h-3.5 w-3.5 text-primary-600 dark:text-primary-300" aria-hidden />
                  {t('setup.badge')}
                </span>
                <h1 className="text-balance text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl lg:text-4xl">
                  {t('setup.title')}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
                  {t('setup.sub')}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-4xl">
          <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-card ring-1 ring-slate-900/[0.04] dark:border-slate-700/90 dark:bg-slate-900 dark:ring-white/[0.06]">
            <div className="relative border-b border-slate-200/80 bg-gradient-to-br from-primary-600/[0.07] via-white to-violet-600/[0.06] px-5 py-5 dark:border-slate-700/80 dark:from-primary-500/10 dark:via-slate-900 dark:to-violet-600/10 sm:px-8 sm:py-6">
              <div
                className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary-400/30 to-transparent dark:via-primary-500/20"
                aria-hidden
              />
              <div className="relative flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-violet-600 text-white shadow-md">
                  <Briefcase className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white sm:text-xl">
                    {t('setup.panelTitle')}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('setup.panelSub')}</p>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 lg:p-10">
              <form onSubmit={handleSubmit} className="space-y-10">
                <div className="space-y-6">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('setup.sectionRole')}
                  </p>
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200 mb-2.5 tracking-tight" htmlFor="setup-position">
                <Briefcase className="w-4 h-4 text-primary-600 dark:text-primary-400 shrink-0" aria-hidden />
                {t('setup.position')} <span className="text-red-500">*</span>
              </label>
              <div className="mb-3 space-y-3">
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {t('setup.trackLabel')}
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {trackTabs.map((tab) => (
                      <button
                        key={tab.value}
                        type="button"
                        onClick={() => {
                          setRoleTrack(tab.value)
                          setSelectedCategory('')
                        }}
                        className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                          roleTrack === tab.value
                            ? 'border-primary-500 bg-primary-50 text-primary-800 dark:border-primary-400 dark:bg-primary-900/40 dark:text-primary-200'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/80'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {t('setup.categoryLabel')}
                  </p>
                  <CategorySelector
                    value={selectedCategory}
                    options={categoryEntries.map(([k, item]) => ({ value: k, label: item.label }))}
                    onChange={setSelectedCategory}
                    placeholder={t('setup.categoryPlaceholder')}
                    t={t}
                  />
                </div>
              </div>
              <input
                type="text"
                value={form.position}
                onChange={(e) => {
                  setForm({ ...form, position: e.target.value })
                  setErrors({ ...errors, position: '' })
                }}
                id="setup-position"
                placeholder="e.g. Werkstudent Frontend Developer"
                className={`input-field ${errors.position ? 'border-red-300 focus:ring-red-400' : ''}`}
              />
              {errors.position && (
                <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                  <Info className="w-3 h-3" /> {errors.position}
                </p>
              )}
              <div className="mt-2">
                <p className="mb-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {selectedRoles.length > 0 ? t('setup.subRoleHint') : t('setup.subRoleHintEmpty')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedRoles.map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => {
                        setForm({ ...form, position: pos })
                        setErrors({ ...errors, position: '' })
                      }}
                      className="rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-soft transition-all duration-200 hover:border-primary-200/80 hover:bg-primary-50 hover:text-primary-800 hover:shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-primary-800/50 dark:hover:bg-primary-950/50 dark:hover:text-primary-300"
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2.5 flex flex-wrap items-center gap-2 text-sm font-bold tracking-tight text-slate-800 dark:text-slate-200" htmlFor="setup-job-desc">
                <FileText className="h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden />
                {t('setup.jobDesc')} <span className="text-red-500">*</span>
                <span className="w-full text-xs font-semibold text-slate-400 dark:text-slate-500 sm:ml-auto sm:w-auto">{t('setup.pasteHint')}</span>
              </label>
              <textarea
                id="setup-job-desc"
                value={form.jobDescription}
                onChange={(e) => {
                  setForm({ ...form, jobDescription: e.target.value })
                  setErrors({ ...errors, jobDescription: '' })
                }}
                placeholder={t('setup.placeholder')}
                rows={8}
                className={`textarea-field !min-h-[12rem] !resize-y ${errors.jobDescription ? 'border-red-300 focus:ring-red-400' : ''}`}
              />
              <div className="flex items-center justify-between mt-1.5">
                {errors.jobDescription ? (
                  <p className="text-red-500 text-xs flex items-center gap-1">
                    <Info className="w-3 h-3" /> {errors.jobDescription}
                  </p>
                ) : (
                  <p className="text-slate-400 dark:text-slate-500 text-xs">{t('setup.hintDetail')}</p>
                )}
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500">{form.jobDescription.length} {t('setup.chars')}</span>
              </div>
            </div>
                </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50/40 ring-1 ring-slate-900/[0.03] dark:border-slate-600 dark:bg-slate-800/25 dark:ring-white/[0.05]">
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 bg-gradient-to-r from-primary-600/[0.07] to-violet-600/[0.06] px-4 py-3.5 dark:border-slate-600 dark:from-primary-500/12 dark:to-violet-600/10 sm:px-5">
                <Upload className="h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden />
                <span className="text-sm font-black text-slate-900 dark:text-white">{t('setup.resumeTitle')}</span>
                <Link
                  to="/profile"
                  className="ml-auto text-xs font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  {t('setup.resumeProfileLink')}
                </Link>
              </div>
              <div className="space-y-4 p-5 sm:p-6">
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 sm:text-sm">{t('setup.resumeEncourage')}</p>
                <input
                  ref={resumeFileRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => void handleResumePdf(e)}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={resumeParsing}
                    onClick={() => resumeFileRef.current?.click()}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 py-2.5 text-sm font-bold text-primary-800 transition-colors hover:bg-primary-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-primary-300 dark:hover:bg-slate-700/80"
                  >
                    {resumeParsing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <FileText className="h-4 w-4" aria-hidden />}
                    {t('setup.resumeChoosePdf')}
                  </button>
                  {sessionResumeText.trim() ? (
                    <button
                      type="button"
                      onClick={() => { setSessionResumeText(''); setResumeNote(null) }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:border-red-200 hover:text-red-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-red-900/50 dark:hover:text-red-400"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                      {t('setup.resumeClearSession')}
                    </button>
                  ) : null}
                </div>
                {resumeNote ? (
                  <p
                    className={`rounded-xl border px-3 py-2.5 text-xs sm:text-sm ${
                      resumeNote.type === 'ok'
                        ? 'border-emerald-200 bg-emerald-50/90 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200'
                        : resumeNote.type === 'warn'
                          ? 'border-amber-200 bg-amber-50/90 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200'
                          : 'border-red-200 bg-red-50/90 text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200'
                    }`}
                  >
                    {resumeNote.text}
                  </p>
                ) : null}
                <div className="rounded-xl border border-slate-200/90 bg-white/90 px-4 py-3 dark:border-slate-600 dark:bg-slate-900/60">
                  {effectiveResume ? (
                    <p className="text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-200">
                      {sessionResumeText.trim()
                        ? t('setup.resumeUsingSession')
                        : t('setup.resumeUsingProfile')}
                      {' '}
                      <span className="font-mono text-[0.8125rem] font-semibold text-primary-700 tabular-nums dark:text-primary-300">
                        ({effectiveResume.length} {t('setup.chars')})
                      </span>
                    </p>
                  ) : (
                    <p className="text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-200">{t('setup.resumeNone')}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('setup.sectionMeta')}
              </p>
            <div>
              <label className="mb-3 flex items-center gap-2 text-sm font-bold tracking-tight text-slate-800 dark:text-slate-200">
                <Globe2 className="h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden />
                {t('setup.interviewLang')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {languages.map((lang) => (
                  <button
                    key={lang.value}
                    type="button"
                    onClick={() => setForm({ ...form, language: lang.value })}
                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-300 text-left shadow-soft ${
                      form.language === lang.value
                        ? 'border-primary-500 bg-primary-50/90 ring-2 ring-primary-500/20 dark:border-primary-400 dark:bg-primary-900/40 dark:ring-primary-500/30'
                        : 'border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/80 ring-1 ring-transparent hover:ring-slate-100 dark:border-slate-600 dark:hover:border-slate-500 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <span className="text-2xl">{lang.flag}</span>
                    <div>
                      <div className={`font-semibold text-sm ${form.language === lang.value ? 'text-primary-700 dark:text-primary-300' : 'text-slate-700 dark:text-slate-300'}`}>
                        {lang.label}
                      </div>
                      <div className="text-xs text-slate-400 dark:text-slate-500">{lang.desc}</div>
                    </div>
                    {form.language === lang.value ? (
                      <div className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-violet-600 text-white shadow-md">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                      </div>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-3 flex items-center gap-2 text-sm font-bold tracking-tight text-slate-800 dark:text-slate-200">
                <Clock className="h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden />
                {t('setup.duration')}
              </label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {durations.map((dur) => (
                  <button
                    key={dur.value}
                    type="button"
                    onClick={() => setForm({ ...form, duration: dur.value })}
                    className={`flex flex-col items-center rounded-2xl border-2 p-3.5 shadow-soft transition-all duration-300 sm:p-4 ${
                      form.duration === dur.value
                        ? 'border-primary-500 bg-primary-50/90 text-primary-700 ring-2 ring-primary-500/15 dark:border-primary-400 dark:bg-primary-900/40 dark:text-primary-100'
                        : 'border-slate-200/90 text-slate-600 hover:border-slate-300 hover:bg-slate-50/80 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <span className="text-sm font-black">{dur.label}</span>
                    <span className="mt-1 text-xs text-slate-400 dark:text-slate-500">{dur.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 to-white p-5 shadow-inner ring-1 ring-slate-900/[0.03] dark:border-slate-600 dark:from-slate-800/80 dark:to-slate-900/60 dark:ring-white/[0.05] sm:p-6">
              <p className="mb-3 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('setup.summary')}</p>
              <div className="flex flex-wrap gap-2">
                {form.position ? (
                  <span className="rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                    🏢 {form.position}
                  </span>
                ) : (
                  <span className="rounded-xl border border-dashed border-slate-200/90 bg-white/60 px-3 py-2 text-xs font-medium text-slate-400 dark:border-slate-600 dark:bg-slate-800/40 dark:text-slate-500">
                    🏢 {t('setup.emptyPos')}
                  </span>
                )}
                <span className="rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                  🌐 {form.language}
                </span>
                <span className="rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                  ⏱️ {form.duration} {t('setup.minSuffix')}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-primary-600 px-6 py-4 text-base font-bold text-white shadow-lg transition hover:from-violet-700 hover:to-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-white" aria-hidden />
                  {t('setup.submitting')}
                </>
              ) : (
                <>
                  {t('setup.submit')}
                  <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
                </>
              )}
            </button>
          </form>
            </div>
          </div>

          <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-relaxed text-slate-500 dark:text-slate-500 sm:text-sm">
            {t('setup.footerTip')}
          </p>
        </div>
      </div>
    </div>
  )
}
