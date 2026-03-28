import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { getBackendBaseUrl } from '../lib/backendBase'
import {
  Briefcase, FileText, Globe2, Clock, ArrowRight,
  Info, Sparkles, Upload, Loader2, X, Check, LayoutTemplate,
  ChevronDown, Copy, RotateCcw, History, Trash2,
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

const JD_HISTORY_KEY = 'interviewde_jd_history'
const JD_HISTORY_MAX = 10

function loadJdHistory() {
  try {
    const raw = localStorage.getItem(JD_HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveJdHistory(entries) {
  try { localStorage.setItem(JD_HISTORY_KEY, JSON.stringify(entries.slice(0, JD_HISTORY_MAX))) } catch { /* ignore */ }
}

function addJdHistoryEntry(position, jobDescription) {
  if (!position?.trim() || !jobDescription?.trim()) return
  const entries = loadJdHistory()
  const deduped = entries.filter(e =>
    !(e.position === position.trim() && e.jobDescription === jobDescription.trim())
  )
  deduped.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    position: position.trim(),
    jobDescription: jobDescription.trim(),
    createdAt: Date.now(),
  })
  saveJdHistory(deduped)
}

function formatTimeAgo(ts, uiLang) {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return uiLang === 'zh' ? '刚刚' : uiLang === 'de' ? 'gerade eben' : 'just now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
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
        className={`flex w-full items-center justify-between gap-4 rounded-2xl border px-5 py-4 text-sm font-bold transition-all duration-300 ${
          isOpen
            ? 'border-slate-900 bg-white dark:border-white dark:bg-slate-900'
            : 'border-slate-100 bg-slate-50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-slate-600'
        }`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <LayoutTemplate className={`h-4 w-4 shrink-0 ${value ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`} />
          <span className={`truncate ${value ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} />
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
  const [mlForm, setMlForm] = useState({
    length: 200,
    language: 'English',
  })
  const [mlResult, setMlResult] = useState('')
  const [mlLoading, setMlLoading] = useState(false)
  const [mlCopied, setMlCopied] = useState(false)
  const [jdHistory, setJdHistory] = useState(() => loadJdHistory())
  const [historyOpen, setHistoryOpen] = useState(false)
  const historyRef = useRef(null)

  const resumeFileRef = useRef(null)

  const effectiveResume = (sessionResumeText.trim() || profileResumeText.trim())

  useEffect(() => {
    document.title = t('meta.title')
  }, [t])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (historyRef.current && !historyRef.current.contains(e.target)) setHistoryOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
      
      // Auto-scroll to first error
      const firstErrorKey = newErrors.position ? 'setup-position' : 'setup-job-desc'
      const el = document.getElementById(firstErrorKey)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.focus()
      }
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

    addJdHistoryEntry(form.position, form.jobDescription)
    setJdHistory(loadJdHistory())

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

  const handleGenerateML = async () => {
    if (!form.position.trim() || !form.jobDescription.trim()) {
      const e = {
        position: !form.position.trim() ? t('setup.errPos') : '',
        jobDescription: !form.jobDescription.trim() ? t('setup.errDesc') : '',
      }
      setErrors(e)
      
      const el = document.getElementById(e.position ? 'setup-position' : 'setup-job-desc')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.focus()
      }
      return
    }
    setMlLoading(true)
    setMlResult('')
    try {
      const backendUrl = getBackendBaseUrl()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch(`${backendUrl}/api/ai-assistant/generate-motivation-letter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          position: form.position,
          jobDescription: form.jobDescription,
          resumeText: effectiveResume,
          targetLength: mlForm.length,
          language: mlForm.language,
        }),
      })
      const j = await res.json()
      if (res.ok) setMlResult(j.text)
      else throw new Error(j.error)
    } catch (err) {
      setMlResult('Error: ' + err.message)
    } finally {
      setMlLoading(false)
    }
  }

  const handleCopyML = () => {
    if (!mlResult) return
    navigator.clipboard.writeText(mlResult)
    setMlCopied(true)
    setTimeout(() => setMlCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-slate-950 pt-32 pb-20">
      <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
        <header className="mb-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl space-y-6"
          >
            <div className="section-badge">{t('setup.badge')}</div>
            <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight font-serif">
              {t('setup.title')}
            </h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
              {t('setup.sub')}
            </p>
          </motion.div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <main className="lg:col-span-12">
            <div className="bg-white dark:bg-slate-950 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 sm:p-12 shadow-sm">
              <form onSubmit={handleSubmit} className="space-y-16">
                <div className="space-y-12">
                  {/* Role Section */}
                  <div className="space-y-8">
                    <div className="space-y-2">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest font-chinese-modern">{t('setup.sectionRole')}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{t('setup.panelSub')}</p>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-4">
                        <label className="text-xs font-bold uppercase tracking-widest text-slate-600">{t('setup.trackLabel')}</label>
                        <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                          {trackTabs.map((tab) => (
                            <button
                              key={tab.value}
                              type="button"
                              onClick={() => {
                                setRoleTrack(tab.value)
                                setSelectedCategory('')
                              }}
                              className={`rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                                roleTrack === tab.value
                                  ? 'border border-slate-300 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white shadow-sm'
                                : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 text-slate-600'
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <label className="text-xs font-bold uppercase tracking-widest text-slate-600">{t('setup.categoryLabel')}</label>
                          <CategorySelector
                            value={selectedCategory}
                            options={categoryEntries.map(([k, item]) => ({ value: k, label: item.label }))}
                            onChange={setSelectedCategory}
                            placeholder={t('setup.categoryPlaceholder')}
                            t={t}
                          />
                        </div>

                        <div className="space-y-4">
                          <label className="text-xs font-bold uppercase tracking-widest text-slate-600" htmlFor="setup-position">
                            {t('setup.position')} <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={form.position}
                            onChange={(e) => {
                              setForm({ ...form, position: e.target.value })
                              setErrors({ ...errors, position: '' })
                            }}
                            id="setup-position"
                            placeholder="e.g. Frontend Developer"
                            className={`input-field-premium px-5 py-4 ${errors.position ? 'border-red-500' : ''}`}
                          />
                          {errors.position && (
                            <p className="text-red-500 text-xs mt-2 flex items-center gap-1 font-bold italic">
                              {errors.position}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">
                          {selectedRoles.length > 0 ? t('setup.subRoleHint') : t('setup.subRoleHintEmpty')}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedRoles.map((pos) => (
                            <button
                              key={pos}
                              type="button"
                              onClick={() => {
                                setForm({ ...form, position: pos })
                                setErrors({ ...errors, position: '' })
                              }}
                              className="px-5 py-2.5 text-xs font-black border border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-all text-slate-700 dark:text-slate-300 shadow-sm"
                            >
                              {pos}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Job Description Section */}
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest font-chinese-modern">{t('setup.jobDesc')} <span className="text-red-500">*</span></h3>
                      <div className="flex items-center gap-4">
                        {jdHistory.length > 0 && (
                          <div className="relative" ref={historyRef}>
                            <button
                              type="button"
                              onClick={() => setHistoryOpen(!historyOpen)}
                              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                                historyOpen
                                  ? 'border-slate-900 bg-white text-slate-900 dark:border-white dark:bg-slate-900 dark:text-white shadow-sm'
                                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-white'
                              }`}
                            >
                              <History className="h-3.5 w-3.5" />
                              {t('setup.historyTitle')}
                              <span className="ml-0.5 px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-[10px] font-black">{jdHistory.length}</span>
                            </button>

                            <AnimatePresence>
                              {historyOpen && (
                                <motion.div
                                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                                  className="absolute right-0 z-50 mt-2 w-[420px] max-h-[480px] overflow-auto rounded-2xl border border-slate-200 bg-white/98 p-2 shadow-[0_20px_48px_-12px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/98 dark:shadow-[0_20px_48px_-12px_rgba(0,0,0,0.5)]"
                                >
                                  <div className="flex items-center justify-between px-3 py-2 mb-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                      {t('setup.historyCount', { n: jdHistory.length })}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (window.confirm(t('setup.historyClearConfirm'))) {
                                          saveJdHistory([])
                                          setJdHistory([])
                                          setHistoryOpen(false)
                                        }
                                      }}
                                      className="text-[10px] font-bold text-red-400 hover:text-red-600 transition-colors uppercase tracking-wider"
                                    >
                                      {t('setup.historyClear')}
                                    </button>
                                  </div>

                                  {jdHistory.map((entry) => (
                                    <div
                                      key={entry.id}
                                      className="group rounded-xl px-3.5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setForm(prev => ({
                                              ...prev,
                                              position: entry.position,
                                              jobDescription: entry.jobDescription,
                                            }))
                                            setErrors({})
                                            setHistoryOpen(false)
                                          }}
                                          className="flex-1 text-left min-w-0"
                                        >
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{entry.position}</span>
                                            <span className="shrink-0 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                              {t('setup.historyAgo', { t: formatTimeAgo(entry.createdAt, uiLang) })}
                                            </span>
                                          </div>
                                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                            {entry.jobDescription.slice(0, 150)}{entry.jobDescription.length > 150 ? '...' : ''}
                                          </p>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updated = jdHistory.filter(e => e.id !== entry.id)
                                            saveJdHistory(updated)
                                            setJdHistory(updated)
                                            if (updated.length === 0) setHistoryOpen(false)
                                          }}
                                          className="shrink-0 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                                          title={t('setup.historyDelete')}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{t('setup.pasteHint')}</span>
                      </div>
                    </div>
                    <div className="space-y-4">
                        <textarea
                          id="setup-job-desc"
                          value={form.jobDescription}
                          onChange={(e) => {
                            setForm({ ...form, jobDescription: e.target.value })
                            setErrors({ ...errors, jobDescription: '' })
                          }}
                          placeholder={t('setup.placeholder')}
                          rows={10}
                          className={`textarea-field-premium ${errors.jobDescription ? 'border-red-500 ring-4 ring-red-500/10' : ''}`}
                        />
                      <div className="flex items-center justify-between">
                        {errors.jobDescription ? (
                          <p className="text-red-500 text-xs font-bold italic">{errors.jobDescription}</p>
                        ) : (
                          <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">{t('setup.hintDetail')}</p>
                        )}
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{form.jobDescription.length} {t('setup.chars')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Resume Section */}
                  <div className="card-premium p-8 space-y-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Upload className="h-4 w-4 text-slate-400" />
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest">{t('setup.resumeTitle')}</h3>
                      </div>
                      <Link
                        to="/profile"
                        className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        {t('setup.resumeProfileLink')}
                      </Link>
                    </div>

                    <div className="space-y-6">
                      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{t('setup.resumeEncourage')}</p>
                      <input
                        ref={resumeFileRef}
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => void handleResumePdf(e)}
                      />
                      <div className="flex flex-wrap items-center gap-4">
                        <button
                          type="button"
                          disabled={resumeParsing}
                          onClick={() => resumeFileRef.current?.click()}
                          className="btn-setup-action px-10"
                        >
                          {resumeParsing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
                          {t('setup.resumeChoosePdf')}
                        </button>
                        {sessionResumeText.trim() && (
                          <button
                            type="button"
                            onClick={() => { setSessionResumeText(''); setResumeNote(null) }}
                            className="btn-secondary"
                          >
                            <X className="h-4 w-4 mr-2" />
                            {t('setup.resumeClearSession')}
                          </button>
                        )}
                      </div>

                      {resumeNote && (
                        <div className={`p-4 rounded-2xl border text-sm font-bold ${
                          resumeNote.type === 'ok' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          resumeNote.type === 'warn' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                          'bg-red-50 text-red-700 border-red-100'
                        }`}>
                          {resumeNote.text}
                        </div>
                      )}

                      <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                          {effectiveResume ? (
                            <>
                              {sessionResumeText.trim() ? t('setup.resumeUsingSession') : t('setup.resumeUsingProfile')}
                              <span className="ml-2 text-slate-900 dark:text-white">{effectiveResume.length} {t('setup.chars')}</span>
                            </>
                          ) : t('setup.resumeNone')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* AI Assistant Section */}
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 p-8 space-y-8">
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-4 w-4 text-slate-400" />
                      <Sparkles className="h-4 w-4 text-slate-500" />
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest">{t('setup.aiAssistantTitle')}</h3>
                    </div>

                    <div className="space-y-10">
                      <div className="space-y-6">
                        <div className="flex flex-col gap-2">
                          <h4 className="text-xl font-bold text-slate-900 dark:text-white">{t('setup.mlTitle')}</h4>
                          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{t('setup.mlDesc')}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                              {t('setup.mlLength')}
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {[100, 200, 300].map(len => (
                                <button
                                  key={len}
                                  type="button"
                                  onClick={() => setMlForm({ ...mlForm, length: len })}
                                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                                    mlForm.length === len
                                      ? 'bg-slate-50 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-white dark:border-slate-700 shadow-sm'
                                      : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-500 font-medium'
                                  }`}
                                >
                                  {t(`setup.mlLength${len}`)}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-4">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                              {t('setup.mlLang')}
                            </label>
                            <div className="flex gap-2">
                              {['English', 'Deutsch'].map(lang => (
                                <button
                                  key={lang}
                                  type="button"
                                  onClick={() => setMlForm({ ...mlForm, language: lang })}
                                  className={`flex-1 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                                    mlForm.language === lang
                                      ? 'bg-slate-50 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-white dark:border-slate-700 shadow-sm'
                                      : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-500 font-medium'
                                  }`}
                                >
                                  {lang === 'English' ? '🇬🇧 EN' : '🇩🇪 DE'}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <button
                            type="button"
                            disabled={mlLoading}
                            onClick={handleGenerateML}
                            className="btn-setup-action px-8 py-3"
                          >
                            {mlLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              mlResult ? <RotateCcw className="h-4 w-4 mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />
                            )}
                            {mlLoading ? t('setup.mlGenerating') : (mlResult ? t('setup.mlBtnNew') : t('setup.mlBtn'))}
                          </button>

                          <div className="relative group">
                            <textarea
                              readOnly
                              value={mlResult}
                              placeholder={t('setup.mlPlaceholder')}
                              className={`textarea-field-premium transition-all ${
                                mlResult ? 'h-[500px] shadow-sm' : 'h-[160px] border-dashed'
                              } scrollbar-hide`}
                            />
                            {mlResult && (
                              <button
                                type="button"
                                onClick={handleCopyML}
                                className="absolute top-4 right-4 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-500"
                              >
                                {mlCopied ? <Check className="h-5 w-5 text-emerald-600" /> : <Copy className="h-5 w-5" />}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Interview Config */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                    <div className="space-y-8">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">{t('setup.interviewLang')}</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {languages.map((lang) => (
                          <button
                            key={lang.value}
                            type="button"
                            onClick={() => setForm({ ...form, language: lang.value })}
                            className={`flex flex-col items-start gap-4 p-6 rounded-2xl border transition-all duration-300 ${
                              form.language === lang.value
                                ? 'border-slate-300 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white shadow-sm'
                                : 'border-slate-100 bg-white hover:border-slate-200 dark:border-slate-800 dark:bg-slate-950'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className={`text-3xl ${form.language === lang.value ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-500'}`}>{lang.flag}</span>
                              {form.language === lang.value && <Check className="w-4 h-4" />}
                            </div>
                            <div>
                              <div className={`font-bold text-sm tracking-tight ${form.language === lang.value ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-500'}`}>{lang.label}</div>
                              <div className={`text-[10px] uppercase font-bold mt-1 ${form.language === lang.value ? 'opacity-60' : 'text-slate-500'}`}>{lang.desc}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-8">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">{t('setup.duration')}</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {durations.map((dur) => (
                          <button
                            key={dur.value}
                            type="button"
                            onClick={() => setForm({ ...form, duration: dur.value })}
                            className={`flex flex-col items-center justify-center px-2 py-6 rounded-2xl border transition-all duration-300 ${
                              form.duration === dur.value
                                ? 'border-slate-300 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white shadow-sm'
                                : 'border-slate-100 bg-white hover:border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-slate-400'
                            }`}
                          >
                            <span className={`text-xl font-black whitespace-nowrap ${form.duration === dur.value ? 'text-slate-900' : 'text-slate-700'}`}>{dur.label}</span>
                            <span className={`text-[10px] uppercase font-bold mt-1 tracking-widest ${form.duration === dur.value ? 'opacity-60' : 'text-slate-500'}`}>{dur.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Section */}
                <div className="p-12 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                  <p className="mb-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('setup.summary')}</p>
                  <div className="flex flex-wrap gap-4 mb-12">
                    {form.position ? (
                      <span className="px-5 py-2.5 rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white shadow-sm flex items-center gap-2">
                        {form.position}
                      </span>
                    ) : (
                      <span className="px-5 py-2.5 rounded-full border border-dashed border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-400">
                        {t('setup.emptyPos')}
                      </span>
                    )}
                    <span className="px-5 py-2.5 rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white shadow-sm">
                      {form.language}
                    </span>
                    <span className="px-5 py-2.5 rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white shadow-sm">
                      {form.duration} {t('setup.minSuffix')}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-setup-action w-full py-6 text-xl"
                  >
                    {loading ? (
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-white dark:text-slate-900" />
                    ) : (
                      <>
                        {t('setup.submit')}
                        <ArrowRight className="h-6 w-6 ml-4 group-hover:translate-x-2 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </main>
        </div>

        <p className="mx-auto mt-12 max-w-2xl text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-relaxed">
          {t('setup.footerTip')}
        </p>
      </div>
    </div>
  )
}
