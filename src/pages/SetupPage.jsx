import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { getBackendBaseUrl } from '../lib/backendBase'
import { authenticatedFetch } from '../lib/authenticatedFetch'
import { parseJobDescription } from '../lib/jobDescriptionParser'
import {
  Briefcase, FileText, Globe2, Clock, ArrowRight,
  Info, Sparkles, Upload, Loader2, X, Check, LayoutTemplate,
  ChevronDown, Copy, RotateCcw, History, Trash2,
  AlertCircle, Coins, Zap, Download,
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

const EMPLOYMENT_TYPE_VALUES = ['internship', 'full_time', 'working_student', 'part_time', 'contract']

function safeFileName(value) {
  return String(value || 'motivation-letter')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'motivation-letter'
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function encodePdfText(value) {
  return Array.from(String(value || '')).map((char) => {
    const code = char.charCodeAt(0)
    if (char === '\\' || char === '(' || char === ')') return `\\${char}`
    if (code >= 0x20 && code <= 0x7e) return char
    if (code >= 0xa0 && code <= 0xff) return `\\${code.toString(8).padStart(3, '0')}`
    return '?'
  }).join('')
}

function buildSimplePdf(title, body) {
  const maxChars = 88
  const paragraphs = String(body || '').replace(/\r/g, '').split('\n')
  const lines = []
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push('')
      continue
    }
    const words = paragraph.split(/\s+/)
    let line = ''
    for (const word of words) {
      if (!line) line = word
      else if (`${line} ${word}`.length <= maxChars) line += ` ${word}`
      else {
        lines.push(line)
        line = word
      }
    }
    if (line) lines.push(line)
  }

  const pages = []
  const pageCapacity = 48
  for (let i = 0; i < lines.length || i === 0; i += pageCapacity) pages.push(lines.slice(i, i + pageCapacity))
  const objects = []
  const addObject = (content) => { objects.push(content); return objects.length }
  const catalogId = addObject('')
  const pagesId = addObject('')
  const fontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  const pageIds = []

  pages.forEach((pageLines, pageIndex) => {
    const commands = [
      'BT', '/F1 15 Tf', '50 792 Td', `(${encodePdfText(title)}) Tj`,
      '/F1 10 Tf', '0 -28 Td',
    ]
    pageLines.forEach((line, index) => {
      if (index > 0) commands.push('0 -15 Td')
      commands.push(`(${encodePdfText(line)}) Tj`)
    })
    commands.push('ET', `BT /F1 8 Tf 520 28 Td (${pageIndex + 1}/${pages.length}) Tj ET`)
    const stream = commands.join('\n')
    const contentId = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
    pageIds.push(addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`))
  })
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  offsets.slice(1).forEach(offset => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n` })
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  return new Blob([pdf], { type: 'application/pdf' })
}

function loadJdHistory() {
  try {
    const raw = localStorage.getItem(JD_HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveJdHistory(entries) {
  try { localStorage.setItem(JD_HISTORY_KEY, JSON.stringify(entries.slice(0, JD_HISTORY_MAX))) } catch { /* ignore */ }
}

function addJdHistoryEntry(position, jobDescription, employmentType, category) {
  if (!position?.trim() || !jobDescription?.trim()) return
  const entries = loadJdHistory()
  const deduped = entries.filter(e =>
    !(e.position === position.trim() && e.jobDescription === jobDescription.trim())
  )
  deduped.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    position: position.trim(),
    jobDescription: jobDescription.trim(),
    employmentType: employmentType || 'full_time',
    category: category || '',
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
        className={`flex w-full items-center justify-between gap-4 rounded-2xl border px-5 py-4 text-sm font-bold transition-all duration-300 ${isOpen
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
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-sm font-medium transition-colors ${value === opt.value
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

function EnergyBadge({ amount, label, t }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-500/50 text-emerald-600 dark:text-emerald-400 text-[10px] font-black leading-none shadow-sm ring-4 ring-emerald-500/5 transition-transform group-hover:scale-105">
      <Zap className="h-2.5 w-2.5 fill-emerald-600 dark:fill-emerald-400" />
      <span className="whitespace-nowrap uppercase tracking-tighter">{amount} {label || t('nav.tokens')}</span>
    </span>
  )
}

export default function SetupPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const offerSprintDefaults = location.state?.offerSprintDefaults || {}
  const [selectedCategory, setSelectedCategory] = useState('')
  const [form, setForm] = useState({
    position: String(offerSprintDefaults.position || ''),
    jobDescription: String(offerSprintDefaults.jobDescription || ''),
    language: 'English',
    duration: Math.max(5, Math.min(60, Number(offerSprintDefaults.duration) || 10)),
    interviewerStyle: 'balanced',
    interviewerType: ['hr', 'technical', 'mixed'].includes(offerSprintDefaults.interviewerType)
      ? offerSprintDefaults.interviewerType
      : 'mixed',
    mode: offerSprintDefaults.mode === 'practice' ? 'practice' : 'formal',
    difficulty: 'medium',
    employmentType: 'full_time',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const interviewCreateRequestRef = useRef(null)
  const [profileResumeText, setProfileResumeText] = useState('')
  const [profileResumeLoading, setProfileResumeLoading] = useState(true)
  const [sessionResumeText, setSessionResumeText] = useState('')
  const [resumeParsing, setResumeParsing] = useState(false)
  const [resumeNote, setResumeNote] = useState(null)
  const [mlForm, setMlForm] = useState({
    length: 200,
    language: 'English',
  })
  const [mlResult, setMlResult] = useState('')
  const [mlError, setMlError] = useState(null)
  const [mlLoading, setMlLoading] = useState(false)
  const [mlCopied, setMlCopied] = useState(false)
  const [jdHistory, setJdHistory] = useState(() => loadJdHistory())
  const [historyOpen, setHistoryOpen] = useState(false)
  const [jdAnalysis, setJdAnalysis] = useState({ status: 'idle', message: '' })
  const [tokens, setTokens] = useState(0)
  const [formNotice, setFormNotice] = useState(null)
  const historyRef = useRef(null)
  const lastAnalyzedJdRef = useRef('')

  const resumeFileRef = useRef(null)

  const effectiveResume = (profileResumeText.trim() || sessionResumeText.trim())
  const practiceEquivalentMinutes = form.difficulty === 'easy' ? 10 : form.difficulty === 'hard' ? 45 : 20
  const practiceCoreQuestions = form.difficulty === 'easy' ? 5 : form.difficulty === 'hard' ? 18 : 9
  const practiceTotalQuestions = practiceCoreQuestions + 1

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
      ; (async () => {
        try {
          const backendUrl = getBackendBaseUrl()
          const res = await authenticatedFetch(`${backendUrl}/api/profile/resume`)
          if (!res.ok || cancelled) return
          const j = await res.json()
          if (!cancelled) setProfileResumeText(j.resumeText || '')
        } catch { /* ignore */ }
        finally { if (!cancelled) setProfileResumeLoading(false) }
      })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const fetchTokens = async () => {
      let session = null
      const fetchOwnTokensDirectly = async () => {
        const userId = session?.user?.id
        if (!userId) return
        const { data, error } = await supabase
          .from('profiles')
          .select('tokens')
          .eq('id', userId)
          .maybeSingle()
        if (!error && data?.tokens !== undefined) setTokens(data.tokens)
      }
      try {
        const backendUrl = getBackendBaseUrl()
        const sessionResult = await supabase.auth.getSession()
        session = sessionResult.data.session
        if (!session) return
        const res = await authenticatedFetch(`${backendUrl}/api/profile`)
        if (res.ok) {
          const j = await res.json()
          if (j.tokens !== undefined) setTokens(j.tokens)
          return
        }
        await fetchOwnTokensDirectly()
      } catch {
        await fetchOwnTokensDirectly()
      }
    }
    fetchTokens()
  }, [])

  const languages = useMemo(() => [
    { value: 'English', label: 'English', flag: '🇬🇧', desc: t('setup.langEnDesc') },
    { value: 'Deutsch', label: 'Deutsch', flag: '🇩🇪', desc: t('setup.langDeDesc') },
    { value: 'Chinese', label: '中文', flag: '🇨🇳', desc: t('setup.langZhDesc') },
  ], [t])

  const interviewerStyles = useMemo(() => [
    { value: 'balanced', icon: '⚖️', label: t('setup.styleBalanced'), desc: t('setup.styleBalancedDesc') },
    { value: 'supportive', icon: '🌿', label: t('setup.styleSupportive'), desc: t('setup.styleSupportiveDesc') },
    { value: 'demanding', icon: '🎯', label: t('setup.styleDemanding'), desc: t('setup.styleDemandingDesc') },
    { value: 'analytical', icon: '🔍', label: t('setup.styleAnalytical'), desc: t('setup.styleAnalyticalDesc') },
  ], [t])

  const employmentTypes = useMemo(() => EMPLOYMENT_TYPE_VALUES.map(value => ({
    value,
    label: t(`setup.employment${value.split('_').map(part => part[0].toUpperCase() + part.slice(1)).join('')}`),
  })), [t])

  const uiLang = useMemo(() => {
    const c = String(i18n.resolvedLanguage || i18n.language || 'en').toLowerCase()
    if (c.startsWith('zh')) return 'zh'
    if (c.startsWith('de')) return 'de'
    return 'en'
  }, [i18n.language, i18n.resolvedLanguage])

  const roleCatalog = useMemo(() => buildRoleCatalog(uiLang), [uiLang])
  const categories = roleCatalog.work || {}
  const categoryEntries = Object.entries(categories)
  const selectedRoles = selectedCategory && categories[selectedCategory]
    ? categories[selectedCategory].roles
    : []

  const analyzeJobDescription = async (jobDescription, force = false) => {
    const normalized = String(jobDescription || '').trim()
    if (normalized.length < 50 || (!force && normalized === lastAnalyzedJdRef.current)) return
    lastAnalyzedJdRef.current = normalized
    setJdAnalysis({ status: 'loading', message: '' })
    try {
      await Promise.resolve()
      const result = parseJobDescription(normalized)
      setForm(prev => ({
        ...prev,
        position: result.position || prev.position,
        employmentType: EMPLOYMENT_TYPE_VALUES.includes(result.employmentType) ? result.employmentType : prev.employmentType,
      }))
      if (result.category && categories[result.category]) setSelectedCategory(result.category)
      setErrors(prev => ({ ...prev, position: '', jobDescription: '' }))
      setJdAnalysis({ status: 'success', message: t('setup.jdAnalysisSuccess') })
    } catch {
      lastAnalyzedJdRef.current = ''
      setJdAnalysis({ status: 'error', message: t('setup.jdAnalysisError') })
    }
  }

  useEffect(() => {
    const normalized = form.jobDescription.trim()
    if (normalized.length < 80 || normalized === lastAnalyzedJdRef.current) return undefined
    const timer = window.setTimeout(() => void analyzeJobDescription(normalized), 900)
    return () => window.clearTimeout(timer)
  }, [form.jobDescription])

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

    if (tokens < 300) {
      setFormNotice({ type: 'tokens', text: t('common.insufficientTokens', 'Insufficient Energy') })
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setFormNotice(null)
    setLoading(true)
    let interviewId = null
    let createdInterview = null
    try {
      const backendUrl = getBackendBaseUrl()
      const creationId = interviewCreateRequestRef.current
        || globalThis.crypto?.randomUUID?.()
        || `create-${Date.now()}`
      interviewCreateRequestRef.current = creationId
      const body = {
        position: form.position,
        job_description: form.jobDescription,
        language: form.language,
        duration: form.duration,
        interviewer_style: form.interviewerStyle,
        interviewerType: form.interviewerType,
        role_track: 'work',
        employment_type: form.employmentType,
        mode: form.mode,
        difficulty: form.difficulty,
        idempotencyKey: creationId,
      }
      if (effectiveResume) body.resume_snapshot = effectiveResume.slice(0, 50_000)

      let res = null
      for (let attempt = 0; attempt < 2 && !res; attempt += 1) {
        res = await authenticatedFetch(`${backendUrl}/api/interviews`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': creationId,
          },
          body: JSON.stringify(body),
        }).catch((error) => {
          if (error?.code === 'AUTH_EXPIRED' || error?.code === 'AUTH_REJECTED') throw error
          return null
        })
        if (!res && attempt === 0) await new Promise(resolve => window.setTimeout(resolve, 500))
      }
      const responseBody = res ? await res.json().catch(() => ({})) : {}
      if (res?.ok) {
        createdInterview = responseBody.interview || null
        interviewId = createdInterview?.id ?? null
      }
      if (!res) throw new Error('Interview service is unreachable')
      if (!res.ok) {
        const requestError = new Error(responseBody.error || `Interview creation failed (${res.status})`)
        requestError.status = res.status
        requestError.code = responseBody.code
        throw requestError
      }
      if (!interviewId) throw new Error('Interview record was not created')
      interviewCreateRequestRef.current = null
    } catch (error) {
      console.error('[SetupPage] Failed to create persistent interview', error)
      setLoading(false)
      if (error?.code === 'AUTH_EXPIRED' || error?.code === 'AUTH_REJECTED' || error?.status === 401) {
        setFormNotice({ type: 'auth', text: t('setup.sessionExpired') })
      } else if (error?.code === 'INSUFFICIENT_TOKENS' || error?.status === 403) {
        setFormNotice({ type: 'tokens', text: t('common.insufficientTokens', 'Insufficient Energy') })
      } else {
        setFormNotice({ type: 'error', text: t('setup.createInterviewError') })
      }
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    addJdHistoryEntry(form.position, form.jobDescription, form.employmentType, selectedCategory)
    setJdHistory(loadJdHistory())

    setLoading(false)
    navigate(`/interview/${interviewId}`, {
      state: {
        ...form,
        sessionLaunch: true,
        roleTrack: 'work',
        interviewId,
        deadlineAt: createdInterview?.deadline_at || null,
        interviewStatus: createdInterview?.status || 'active',
        resumeContext: effectiveResume,
      },
    })
  }

  const handleResumePdf = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setResumeNote({ type: 'err', text: t('setup.resumePdfOnly') })
      return
    }
    if (file.size > 12 * 1024 * 1024) {
      setResumeNote({ type: 'err', text: t('setup.resumeTooLarge') })
      return
    }
    setResumeParsing(true)
    setResumeNote(null)
    try {
      const backendUrl = getBackendBaseUrl()
      const pdfBase64 = await fileToBase64Data(file)
      const res = await authenticatedFetch(`${backendUrl}/api/profile/resume/parse-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pdfBase64 }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw Object.assign(new Error(j.error || 'parse'), { code: j.code || (res.status === 413 ? 'PDF_TOO_LARGE' : 'PDF_UNREADABLE') })
      const parsedText = String(j.text || '')
      const saveRes = await authenticatedFetch(`${backendUrl}/api/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText: parsedText }),
      })
      if (!saveRes.ok) throw Object.assign(new Error('save'), { code: 'RESUME_SAVE_FAILED' })
      setProfileResumeText(parsedText)
      setSessionResumeText('')
      if (j.warning) setResumeNote({ type: 'warn', text: j.warning })
      else setResumeNote({ type: 'ok', text: t('setup.resumeParsedSaved', { n: j.charCount ?? parsedText.length }) })
    } catch (error) {
      const messageKey = {
        PDF_TOO_LARGE: 'resumeTooLarge',
        REQUEST_TOO_LARGE: 'resumeTooLarge',
        PDF_NO_TEXT: 'resumeNoText',
        PDF_PASSWORD_PROTECTED: 'resumePasswordProtected',
        PDF_INVALID: 'resumeInvalid',
        PDF_UNREADABLE: 'resumeInvalid',
        RESUME_SAVE_FAILED: 'resumeSaveErr',
        AUTH_EXPIRED: 'sessionExpired',
        AUTH_REJECTED: 'sessionExpired',
      }[error?.code] || 'resumeParseErr'
      setResumeNote({ type: 'err', text: t(`setup.${messageKey}`) })
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
      setMlError(null)
      if (res.status === 403) {
        setMlError({ type: 'insufficient_tokens', cost: 100 })
        return
      }
      const j = await res.json()
      if (res.ok) {
        setMlResult(j.text)
        setMlError(null)
        window.dispatchEvent(new Event('tokensChanged'))
      } else {
        setMlError({ type: 'error', message: j.error })
      }
    } catch (err) {
      setMlError({ type: 'error', message: err.message })
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

  const handleExportWord = () => {
    if (!mlResult) return
    const title = `${t('setup.mlTitle')} — ${form.position}`
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif;max-width:720px;margin:56px auto;color:#172033;line-height:1.65}h1{font-size:22px;margin-bottom:32px}p{white-space:pre-wrap;font-size:12pt}</style></head><body><h1>${escapeHtml(title)}</h1><p>${escapeHtml(mlResult)}</p></body></html>`
    downloadBlob(new Blob(['\ufeff', html], { type: 'application/msword' }), `${safeFileName(form.position)}-motivation-letter.doc`)
  }

  const handleExportPdf = () => {
    if (!mlResult) return
    downloadBlob(buildSimplePdf(`${form.position} - Motivation Letter`, mlResult), `${safeFileName(form.position)}-motivation-letter.pdf`)
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-slate-950 pt-32 pb-20">
      <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
        {formNotice && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Info className="h-5 w-5 text-red-500" />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-red-700 dark:text-red-400">{formNotice.text}</span>
                {formNotice.type === 'tokens' && (
                  <span className="text-[10px] font-bold text-red-500/80 uppercase tracking-widest">{t('profile.tokenUsageInterview')}: 300 ({t('profile.tokens')}: {tokens})</span>
                )}
              </div>
            </div>
            {formNotice.type === 'tokens' && (
              <Link to="/profile" className="px-4 py-2 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-[10px] font-black uppercase tracking-widest hover:bg-red-200 transition-colors">
                {t('profile.recharge')}
              </Link>
            )}
            {formNotice.type === 'auth' && (
              <Link to="/login" className="px-4 py-2 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-[10px] font-black uppercase tracking-widest hover:bg-red-200 transition-colors">
                {t('setup.signInAgain')}
              </Link>
            )}
          </motion.div>
        )}
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
                <div className="flex flex-col gap-12">
                  {/* Role Section */}
                  <div className="space-y-8">
                    <div className="space-y-2">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest font-chinese-modern">{t('setup.sectionRole')}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{t('setup.panelSub')}</p>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-4">
                        <label className="text-xs font-bold uppercase tracking-widest text-slate-600">{t('setup.trackLabel')}</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 bg-slate-50 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                          {employmentTypes.map((tab) => (
                            <button
                              key={tab.value}
                              type="button"
                              onClick={() => {
                                setForm(prev => ({ ...prev, employmentType: tab.value }))
                              }}
                              className={`rounded-xl px-4 py-3 text-sm font-bold transition-all ${form.employmentType === tab.value
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
                  <div className="order-first space-y-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest font-chinese-modern">{t('setup.jobDesc')} <span className="text-red-500">*</span></h3>
                      <div className="flex flex-wrap items-center gap-3">
                        {jdHistory.length > 0 && (
                          <div className="relative" ref={historyRef}>
                            <button
                              type="button"
                              onClick={() => setHistoryOpen(!historyOpen)}
                              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${historyOpen
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
                                            if (entry.employmentType) {
                                              setForm(prev => ({ ...prev, employmentType: entry.employmentType }))
                                            }
                                            if (entry.category && categories[entry.category]) setSelectedCategory(entry.category)
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
                        <button
                          type="button"
                          disabled={jdAnalysis.status === 'loading' || form.jobDescription.trim().length < 50}
                          onClick={() => void analyzeJobDescription(form.jobDescription, true)}
                          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                        >
                          {jdAnalysis.status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                          {jdAnalysis.status === 'loading' ? t('setup.jdAnalyzingButton') : t('setup.jdAnalyzeButton')}
                        </button>
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
                          setJdAnalysis({ status: 'idle', message: '' })
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
                      {form.jobDescription.trim().length >= 50 && (
                        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60">
                          <div className="flex items-center gap-2 text-xs font-bold">
                            {jdAnalysis.status === 'loading' && <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />}
                            {jdAnalysis.status === 'success' && <Check className="h-4 w-4 text-emerald-600" />}
                            {jdAnalysis.status === 'error' && <AlertCircle className="h-4 w-4 text-amber-600" />}
                            <span className="text-slate-600 dark:text-slate-300">
                              {jdAnalysis.status === 'loading' ? t('setup.jdAnalyzing') : jdAnalysis.message || t('setup.jdAnalysisReady')}
                            </span>
                          </div>
                        </div>
                      )}
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
                      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{t('setup.resumeAutoMatch')}</p>
                      <input
                        ref={resumeFileRef}
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => void handleResumePdf(e)}
                      />
                      {profileResumeLoading ? (
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />{t('setup.resumeChecking')}</div>
                      ) : !profileResumeText.trim() ? <div className="flex flex-wrap items-center gap-4">
                        <button
                          type="button"
                          disabled={resumeParsing}
                          onClick={() => resumeFileRef.current?.click()}
                          className="btn-setup-action px-10"
                        >
                          {resumeParsing ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>{t('setup.resumeChoosePdf')}</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              <span>{t('setup.resumeChoosePdf')}</span>
                            </span>
                          )}
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
                      </div> : null}

                      {resumeNote && (
                        <div className={`p-4 rounded-2xl border text-sm font-bold ${resumeNote.type === 'ok' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
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
                              {profileResumeText.trim() ? t('setup.resumeUsingProfile') : t('setup.resumeUsingSession')}
                              <span className="ml-2 text-slate-900 dark:text-white">{effectiveResume.length} {t('setup.chars')}</span>
                            </>
                          ) : t('setup.resumeNone')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* AI Assistant Section */}
                  <div className="hidden">
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
                                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${mlForm.length === len
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
                                  className={`flex-1 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${mlForm.language === lang
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
                              <span className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>{t('setup.mlGenerating')}</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-3">
                                {mlResult ? <RotateCcw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                                <span>{mlResult ? t('setup.mlBtnNew') : t('setup.mlBtn')}</span>
                                <EnergyBadge amount="-100" label={t('common.energyShort')} t={t} />
                              </span>
                            )}
                          </button>

                          <div className="relative group">
                            {mlError ? (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="h-[500px] flex flex-col items-center justify-center p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800"
                              >
                                {mlError.type === 'insufficient_tokens' ? (
                                  <>
                                    <div className="p-4 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 mb-6">
                                      <Coins className="h-10 w-10" />
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                      {t('common.insufficientTokens')}
                                    </h4>
                                    <p className="text-sm text-slate-500 max-w-[280px] mb-8 leading-relaxed">
                                      {t('common.insufficientTokensDesc', { cost: mlError.cost })}
                                    </p>
                                    <Link
                                      to={{ pathname: "/profile", state: { openRecharge: true } }}
                                      className="btn-setup-secondary px-8 py-3 bg-emerald-600 text-white border-none hover:bg-emerald-700 font-bold"
                                    >
                                      {t('common.rechargeNow')}
                                    </Link>
                                  </>
                                ) : (
                                  <>
                                    <div className="p-4 rounded-full bg-rose-50 dark:bg-rose-900/20 text-rose-600 mb-6">
                                      <AlertCircle className="h-10 w-10" />
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                      {t('common.errorTitle')}
                                    </h4>
                                    <p className="text-sm text-slate-500 max-w-[280px] mb-8 leading-relaxed">
                                      {t('common.errorDesc')}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={handleGenerateML}
                                      className="btn-setup-secondary px-8 py-3 font-bold"
                                    >
                                      {t('common.tryAgain')}
                                    </button>
                                  </>
                                )}
                              </motion.div>
                            ) : (
                              <>
                                <textarea
                                  readOnly
                                  value={mlResult}
                                  placeholder={t('setup.mlPlaceholder')}
                                  className={`textarea-field-premium transition-all ${mlResult ? 'h-[500px] pt-20 shadow-sm' : 'h-[160px] border-dashed'
                                    } scrollbar-hide`}
                                />
                                {mlResult && (
                                  <div className="absolute right-4 top-4 flex flex-wrap justify-end gap-2">
                                    <button type="button" onClick={handleCopyML} title={t('setup.mlCopy')} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                      {mlCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                                    </button>
                                    <button type="button" onClick={handleExportWord} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                                      <Download className="h-4 w-4" />{t('setup.mlExportWord')}
                                    </button>
                                    <button type="button" onClick={handleExportPdf} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                                      <Download className="h-4 w-4" />{t('setup.mlExportPdf')}
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Interview Config */}
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">
                        {t('setup.interviewerType')}
                      </h3>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {t('setup.interviewerTypeDesc')}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { value: 'hr', label: t('setup.typeHr'), desc: t('setup.typeHrDesc') },
                        { value: 'technical', label: t('setup.typeTechnical'), desc: t('setup.typeTechnicalDesc') },
                        { value: 'mixed', label: t('setup.typeMixed'), desc: t('setup.typeMixedDesc') },
                      ].map(option => (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={form.interviewerType === option.value}
                          onClick={() => setForm({ ...form, interviewerType: option.value })}
                          className={`rounded-2xl border p-6 text-left transition-all ${form.interviewerType === option.value
                              ? 'border-indigo-300 bg-indigo-50 text-slate-900 shadow-sm dark:border-indigo-700 dark:bg-indigo-950/30 dark:text-white'
                              : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400'
                            }`}
                        >
                          <div className="flex items-center justify-end">
                            {form.interviewerType === option.value && <Check className="h-4 w-4" />}
                          </div>
                          <div className="mt-2 text-sm font-bold">{option.label}</div>
                          <div className="mt-2 text-xs leading-relaxed opacity-75">{option.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                    <div className="space-y-8">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">
                          {t('setup.interviewMode', 'Interview mode')}
                        </h3>
                        <p className="mt-2 text-xs text-slate-500">
                          {t('setup.interviewModeDesc', 'Practice gives immediate coaching; formal simulation withholds feedback until the end.')}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { value: 'practice', label: t('setup.modePractice', 'Practice'), desc: t('setup.modePracticeDesc', 'Hints, retries, notes and pause') },
                          { value: 'formal', label: t('setup.modeFormal', 'Formal'), desc: t('setup.modeFormalDesc', 'Continuous timer and final feedback') },
                        ].map(option => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setForm({ ...form, mode: option.value })}
                            className={`rounded-2xl border p-5 text-left transition-all ${form.mode === option.value
                                ? 'border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'
                                : 'border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-950'
                              }`}
                          >
                            <div className="text-sm font-bold text-slate-900 dark:text-white">{option.label}</div>
                            <div className="mt-2 text-xs text-slate-500">{option.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-8">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">
                          {t('setup.difficulty', 'Difficulty')}
                        </h3>
                        <p className="mt-2 text-xs text-slate-500">
                          {t('setup.difficultyDesc', 'Adaptive changes level using your previous scored answer.')}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { value: 'easy', label: t('setup.difficultyEasy'), desc: t('setup.difficultyEasyDesc') },
                          { value: 'medium', label: t('setup.difficultyMedium'), desc: t('setup.difficultyMediumDesc') },
                          { value: 'hard', label: t('setup.difficultyHard'), desc: t('setup.difficultyHardDesc') },
                          { value: 'adaptive', label: t('setup.difficultyAdaptive'), desc: t('setup.difficultyAdaptiveDesc') },
                        ].map(level => (
                          <button
                            key={level.value}
                            type="button"
                            onClick={() => setForm({ ...form, difficulty: level.value })}
                            className={`rounded-2xl border px-3 py-4 text-left transition-all ${form.difficulty === level.value
                                ? 'border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white'
                                : 'border-slate-100 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-950'
                              }`}
                          >
                            <span className="block text-xs font-black uppercase tracking-wider">{level.label}</span>
                            <span className="mt-2 block text-[10px] font-medium normal-case leading-relaxed tracking-normal opacity-75">{level.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                    <div className="space-y-8">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">{t('setup.interviewLang')}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {languages.map((lang) => (
                          <button
                            key={lang.value}
                            type="button"
                            onClick={() => setForm({ ...form, language: lang.value })}
                            className={`flex flex-col items-start gap-4 p-6 rounded-2xl border transition-all duration-300 ${form.language === lang.value
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
                      <div className="flex items-center justify-between gap-4">
                        <h3 className={`text-sm font-bold uppercase tracking-widest ${form.mode === 'practice' ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>{t('setup.duration')}</h3>
                        {form.mode === 'practice' && <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">{t('setup.practiceUnlimitedCount', { n: practiceTotalQuestions })}</span>}
                      </div>
                      <div className={`rounded-2xl border p-6 transition-all ${form.mode === 'practice' ? 'border-slate-100 bg-slate-50/60 opacity-40 dark:border-slate-800 dark:bg-slate-900/40' : 'border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-950'}`}>
                        <div className="mb-5 flex items-end justify-between">
                          <span className="text-xs font-bold text-slate-400">5 {t('dashboard.durMin')}</span>
                          <span className="text-3xl font-black tabular-nums text-slate-900 dark:text-white">{form.duration} <span className="text-sm text-slate-400">{t('dashboard.durMin')}</span></span>
                          <span className="text-xs font-bold text-slate-400">60 {t('dashboard.durMin')}</span>
                        </div>
                        <input type="range" min="5" max="60" step="1" value={form.duration}
                          disabled={form.mode === 'practice'}
                          onChange={(event) => setForm({ ...form, duration: Number(event.target.value) })}
                          aria-label={t('setup.duration')}
                          className="h-2 w-full cursor-pointer accent-slate-900 disabled:cursor-not-allowed dark:accent-white" />
                      </div>
                      {form.mode === 'practice' && <p className="text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">{t('setup.practiceFlowDesc', { minutes: practiceEquivalentMinutes, core: practiceCoreQuestions, total: practiceTotalQuestions })}</p>}
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">{t('setup.interviewerStyle')}</h3>
                      <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">{t('setup.interviewerStyleDesc')}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                      {interviewerStyles.map((style) => (
                        <button
                          key={style.value}
                          type="button"
                          onClick={() => setForm({ ...form, interviewerStyle: style.value })}
                          aria-pressed={form.interviewerStyle === style.value}
                          className={`flex min-h-44 flex-col items-start gap-4 rounded-2xl border p-6 text-left transition-all duration-300 ${form.interviewerStyle === style.value
                              ? 'border-slate-300 bg-slate-50 text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white'
                              : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400'
                            }`}
                        >
                          <div className="flex w-full items-center justify-between">
                            <span className="text-3xl" aria-hidden="true">{style.icon}</span>
                            {form.interviewerStyle === style.value && <Check className="h-4 w-4" />}
                          </div>
                          <div>
                            <div className="text-sm font-bold tracking-tight">{style.label}</div>
                            <div className="mt-2 text-xs font-medium leading-relaxed opacity-70">{style.desc}</div>
                          </div>
                        </button>
                      ))}
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
                    <span className="px-5 py-2.5 rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white shadow-sm">
                      {interviewerStyles.find((style) => style.value === form.interviewerStyle)?.label}
                    </span>
                    <span className="px-5 py-2.5 rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white shadow-sm">
                      {t(`setup.type${form.interviewerType === 'hr' ? 'Hr' : form.interviewerType === 'technical' ? 'Technical' : 'Mixed'}`)}
                    </span>
                    <span className="px-5 py-2.5 rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white shadow-sm">
                      {employmentTypes.find(item => item.value === form.employmentType)?.label}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-setup-action w-full py-6 text-xl"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center w-full">
                        <Loader2 className="h-6 w-6 animate-spin text-white dark:text-slate-900" />
                      </span>
                    ) : (
                      <span className="flex items-center justify-center w-full gap-4">
                        <div className="flex items-center gap-4">
                          <span>{t('setup.submit')}</span>
                          <EnergyBadge amount="-300" t={t} />
                        </div>
                        <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-transform" />
                      </span>
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
