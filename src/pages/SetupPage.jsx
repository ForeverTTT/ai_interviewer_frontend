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
  Target, Users, Languages, BarChart3, ShieldCheck, Star, UserCog,
  MonitorPlay, BadgeCheck, Code2, Scale, Leaf, Search, ChevronRight, Lightbulb,
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

/** 创建一场面试的能量消耗。校验、按钮徽章和提示文案共用这一个来源。 */
const INTERVIEW_COST = 300
/** 简历 PDF 体积上限；同时用于前端校验和界面提示，避免两处数字漂移。 */
const RESUME_MAX_MB = 12
const JD_MAX_CHARS = 5000
const DURATION_MIN = 5
const DURATION_MAX = 60

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
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`flex w-full items-center justify-between gap-3 rounded-xl border bg-brand-inset px-4 py-3 text-[13.5px] font-medium transition-colors ${isOpen ? 'border-brand-ink ring-1 ring-brand-ink' : 'border-brand-line hover:border-brand-muted/50'
          }`}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <LayoutTemplate className={`h-4 w-4 shrink-0 ${value ? 'text-brand-ink' : 'text-brand-muted'}`} />
          <span className={`truncate ${value ? 'font-semibold text-brand-ink' : 'text-brand-muted'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-brand-muted transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 z-50 mt-2 max-h-72 overflow-auto rounded-xl border border-brand-line bg-brand-card p-1.5 "
          >
            {options.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === opt.value}
                  onClick={() => {
                    onChange(opt.value)
                    setIsOpen(false)
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-[13px] transition-colors ${value === opt.value
                    ? 'bg-brand-inset font-semibold text-brand-ink'
                    : 'text-brand-muted hover:bg-brand-inset'
                    }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {value === opt.value && <Check className="h-3.5 w-3.5 shrink-0 text-brand-ink" strokeWidth={2.5} />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

/** 表单字段标题；required 时补一个品牌色星号 */
function FieldLabel({ children, required = false, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 flex items-center gap-1 text-[13.5px] font-semibold text-brand-ink">
      {children}
      {required && <span className="text-brand-danger" aria-hidden="true">*</span>}
    </label>
  )
}

/** 带标题栏的卡片外壳。标题比选项标题高一档，用显示字体加重。 */
function SectionCard({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`brand-float rounded-[22px] px-6 py-5 ${className}`}>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h2 className="font-brand text-[16.5px] font-semibold tracking-[-0.01em] text-brand-ink">{title}</h2>
          {subtitle && <p className="mt-1 text-[12.5px] text-brand-muted">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}

/**
 * 紧凑设置行：标签左置、控件右排。
 * 这是这一版的核心布局——标签独占一列后，整页高度比"标签压在控件上方"省掉约三分之一。
 */
function SettingRow({ label, htmlFor, children, className = '' }) {
  return (
    <div className={`grid gap-x-6 gap-y-2 py-3.5 sm:grid-cols-[104px_minmax(0,1fr)] ${className}`}>
      <label htmlFor={htmlFor} className="pt-2 text-[13px] font-semibold leading-snug text-brand-ink">
        {label}
      </label>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

/** 单行选项（职位类型、难度、语言）。选中用黑框，不用紫框。 */
function OptionPill({ selected, disabled, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      /* ring 而不是加粗 border：切换时零布局位移 */
      className={`rounded-lg border px-4 py-2 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${selected
        ? 'border-brand-ink bg-brand-card font-semibold text-brand-ink ring-1 ring-brand-ink'
        : 'border-brand-line bg-brand-card text-brand-muted hover:border-brand-muted/50 hover:text-brand-ink'
        }`}
    >
      {children}
    </button>
  )
}

/** 多行选项卡：图标 + 标题 + 一行说明。选中用黑框 + 黑色实心勾。 */
function OptionCard({ selected, onClick, icon: Icon, title, desc, hint }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`relative flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 pr-9 text-left transition-colors ${selected
        ? 'border-brand-ink bg-brand-card ring-1 ring-brand-ink'
        : 'border-brand-line bg-brand-card hover:border-brand-muted/50'
        }`}
    >
      {Icon && (
        <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg transition-colors ${selected ? 'bg-brand-inset text-brand-ink' : 'bg-brand-inset text-brand-muted'}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      )}
      <span className="min-w-0">
        <span className="block text-[13.5px] font-semibold leading-tight text-brand-ink">{title}</span>
        {desc && <span className="mt-1 block text-[12px] leading-relaxed text-brand-muted">{desc}</span>}
        {hint && <span className="mt-1 block text-[11.5px] text-brand-muted">{hint}</span>}
      </span>
      {selected && (
        <span className="absolute right-3 top-1/2 grid h-[18px] w-[18px] -translate-y-1/2 place-items-center rounded-full bg-brand-ink text-brand-on-ink">
          <Check className="h-2.5 w-2.5" strokeWidth={3} />
        </span>
      )}
    </button>
  )
}

/** 概览行：左侧图标 + 名称，右侧取值做成药丸 */
function SummaryRow({ icon: Icon, label, value, muted = false }) {
  return (
    <div className="flex items-center justify-between gap-3 py-[7px]">
      <span className="flex min-w-0 items-center gap-2.5 text-[12.5px] text-brand-muted">
        <Icon className="h-[15px] w-[15px] shrink-0 text-brand-muted" />
        <span className="truncate">{label}</span>
      </span>
      <span
        className={`max-w-[58%] shrink-0 truncate rounded-md px-2 py-1 text-[12px] font-medium ${muted ? 'bg-brand-inset text-brand-muted' : 'bg-brand-inset text-brand-ink'
          }`}
      >
        {value}
      </span>
    </div>
  )
}

function EnergyBadge({ amount, label, t }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-brand-line bg-brand-inset px-2 py-0.5 text-[10px] font-semibold leading-none text-brand-muted">
      <Zap className="h-2.5 w-2.5" />
      <span className="whitespace-nowrap">{amount} {label || t('nav.tokens')}</span>
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

    if (tokens < INTERVIEW_COST) {
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
    if (file.size > RESUME_MAX_MB * 1024 * 1024) {
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

  const interviewerTypeOptions = [
    { value: 'hr', icon: Users, label: t('setup.typeHr'), desc: t('setup.typeHrDesc'), hint: t('setup.typeHrHint') },
    { value: 'technical', icon: Code2, label: t('setup.typeTechnical'), desc: t('setup.typeTechnicalDesc'), hint: t('setup.typeTechnicalHint') },
    { value: 'mixed', icon: Star, label: t('setup.typeMixed'), desc: t('setup.typeMixedDesc'), hint: t('setup.typeMixedHint') },
  ]

  const modeOptions = [
    { value: 'practice', icon: Lightbulb, label: t('setup.modePractice'), desc: t('setup.modePracticeDesc') },
    { value: 'formal', icon: MonitorPlay, label: t('setup.modeFormal'), desc: t('setup.modeFormalDesc') },
  ]

  const difficultyOptions = [
    { value: 'easy', label: t('setup.difficultyEasy'), desc: t('setup.difficultyEasyDesc') },
    { value: 'medium', label: t('setup.difficultyMedium'), desc: t('setup.difficultyMediumDesc') },
    { value: 'hard', label: t('setup.difficultyHard'), desc: t('setup.difficultyHardDesc') },
    { value: 'adaptive', label: t('setup.difficultyAdaptive'), desc: t('setup.difficultyAdaptiveDesc') },
  ]

  const STYLE_ICONS = { balanced: Scale, supportive: Leaf, demanding: Zap, analytical: Search }

  const isPractice = form.mode === 'practice'
  const durationFillPct = ((form.duration - DURATION_MIN) / (DURATION_MAX - DURATION_MIN)) * 100
  const jdAnalyzing = jdAnalysis.status === 'loading'
  const canAnalyzeJd = form.jobDescription.trim().length >= 50

  // 右侧概览用到的展示值，全部从 form 派生，不额外存状态
  const categoryLabel = categories[selectedCategory]?.label || ''
  const employmentLabel = employmentTypes.find(e => e.value === form.employmentType)?.label || ''
  const languageLabel = languages.find(l => l.value === form.language)?.label || ''
  const styleLabel = interviewerStyles.find(s => s.value === form.interviewerStyle)?.label || ''
  const interviewerTypeLabel = interviewerTypeOptions.find(o => o.value === form.interviewerType)?.label || ''
  const modeLabel = modeOptions.find(o => o.value === form.mode)?.label || ''
  const selectedDifficulty = difficultyOptions.find(o => o.value === form.difficulty)
  const difficultyLabel = selectedDifficulty?.label || ''
  const durationLabel = isPractice
    ? t('setup.practiceUnlimited')
    : t('setup.durationMinutes', { n: form.duration })

  const resumeStatusText = profileResumeLoading
    ? t('setup.resumeChecking')
    : sessionResumeText.trim()
      ? t('setup.resumeUsingSession')
      : profileResumeText.trim()
        ? t('setup.resumeUsingProfile')
        : t('setup.resumeNone')

  const updateForm = (patch) => setForm(prev => ({ ...prev, ...patch }))

  return (
    <div className="theme-quiet relative min-h-screen bg-brand-paper pb-14 pt-[calc(var(--ui-nav-h)+2rem)]">
      <div className="ui-container relative z-10">

        <header className="mb-7">
          <h1 className="font-brand text-[30px] font-semibold leading-tight tracking-[-0.02em] text-brand-ink sm:text-[34px]">
            {t('setup.pageTitle')}
          </h1>
          <p className="mt-2.5 text-[14px] leading-relaxed text-brand-muted">{t('setup.pageSub')}</p>
        </header>

        {formNotice && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-brand-danger/25 bg-brand-danger/[0.04] px-4 py-3"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-brand-danger" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-brand-ink">{formNotice.text}</p>
              {formNotice.type === 'tokens' && (
                <p className="mt-0.5 text-[12px] text-brand-muted">
                  {t('profile.tokenUsageInterview')}: {INTERVIEW_COST} · {t('profile.tokens')}: {tokens}
                </p>
              )}
            </div>
            {formNotice.type === 'tokens' && (
              <Link to="/profile" className="rounded-lg border border-brand-danger/30 px-3 py-1.5 text-[12px] font-semibold text-brand-danger transition-colors hover:bg-brand-danger/10">
                {t('profile.recharge')}
              </Link>
            )}
            {formNotice.type === 'auth' && (
              <Link to="/login" className="rounded-lg border border-brand-danger/30 px-3 py-1.5 text-[12px] font-semibold text-brand-danger transition-colors hover:bg-brand-danger/10">
                {t('setup.signInAgain')}
              </Link>
            )}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_372px]">

          {/* ───────────── 左栏 ───────────── */}
          <div className="min-w-0 space-y-5">

            <SectionCard
              title={t('setup.jobDesc')}
              subtitle={t('setup.jobDescSub')}
              action={(
                <div className="flex shrink-0 items-center gap-2">
                  <div className="relative" ref={historyRef}>
                    <button
                      type="button"
                      onClick={() => setHistoryOpen(!historyOpen)}
                      aria-expanded={historyOpen}
                      className="flex items-center gap-1.5 rounded-lg border border-brand-line bg-brand-card px-3 py-1.5 text-[12.5px] font-medium text-brand-muted transition-colors hover:border-brand-ink hover:text-brand-ink"
                    >
                      <History className="h-3.5 w-3.5" />
                      {t('setup.historyTitle')}
                      {jdHistory.length > 0 && (
                        <span className="rounded-full bg-brand-inset px-1.5 text-[11px] tabular-nums">
                          {jdHistory.length}
                        </span>
                      )}
                    </button>

                    <AnimatePresence>
                      {historyOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                          transition={{ duration: 0.15 }}
                          /* 宽度跟随视口收敛，小屏不会被裁切 */
                          className="brand-float absolute right-0 z-50 mt-2 max-h-[420px] w-[min(420px,calc(100vw-3rem))] overflow-auto rounded-xl border border-brand-line p-1.5"
                        >
                          {jdHistory.length === 0 ? (
                            <p className="px-3 py-6 text-center text-[12.5px] text-brand-muted">{t('setup.historyEmpty')}</p>
                          ) : (
                            <>
                              <div className="flex items-center justify-between px-2 py-1.5">
                                <span className="text-[12px] text-brand-muted">{t('setup.historyCount', { n: jdHistory.length })}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(t('setup.historyClearConfirm'))) {
                                      saveJdHistory([])
                                      setJdHistory([])
                                      setHistoryOpen(false)
                                    }
                                  }}
                                  className="text-[12px] font-medium text-brand-muted transition-colors hover:text-brand-danger"
                                >
                                  {t('setup.historyClear')}
                                </button>
                              </div>
                              <ul className="space-y-0.5">
                                {jdHistory.map((entry) => (
                                  <li key={entry.id} className="group relative">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        updateForm({
                                          position: entry.position,
                                          jobDescription: entry.jobDescription,
                                          ...(entry.employmentType ? { employmentType: entry.employmentType } : {}),
                                        })
                                        if (entry.category && categories[entry.category]) setSelectedCategory(entry.category)
                                        setErrors({})
                                        setHistoryOpen(false)
                                      }}
                                      className="w-full rounded-lg px-3 py-2.5 pr-10 text-left transition-colors hover:bg-brand-inset"
                                    >
                                      <span className="flex items-baseline justify-between gap-2">
                                        <span className="truncate text-[13px] font-semibold text-brand-ink">{entry.position}</span>
                                        <span className="shrink-0 text-[11px] text-brand-muted">
                                          {t('setup.historyAgo', { t: formatTimeAgo(entry.createdAt, uiLang) })}
                                        </span>
                                      </span>
                                      <span className="mt-0.5 line-clamp-2 block text-[12px] leading-relaxed text-brand-muted">
                                        {entry.jobDescription.slice(0, 150)}{entry.jobDescription.length > 150 ? '…' : ''}
                                      </span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = jdHistory.filter(e => e.id !== entry.id)
                                        saveJdHistory(updated)
                                        setJdHistory(updated)
                                      }}
                                      title={t('setup.historyDelete')}
                                      aria-label={t('setup.historyDelete')}
                                      /* 触屏没有 hover，所以常驻显示 */
                                      className="absolute right-2 top-2.5 rounded-md p-1.5 text-brand-muted transition-colors hover:bg-brand-danger/10 hover:text-brand-danger"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* 一键识别职位信息：force=true，可对同一段 JD 重复触发 */}
                  <button
                    type="button"
                    onClick={() => void analyzeJobDescription(form.jobDescription, true)}
                    disabled={!canAnalyzeJd || jdAnalyzing}
                    className="flex items-center gap-1.5 rounded-lg border border-brand-line bg-brand-card px-3 py-1.5 text-[12.5px] font-semibold text-brand-ink transition-colors hover:border-brand-ink disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {jdAnalyzing
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />{t('setup.jdAnalyzingButton')}</>
                      : <><Sparkles className="h-3.5 w-3.5" />{t('setup.jdAnalyzeButton')}</>}
                  </button>
                </div>
              )}
            >
              <div className="relative">
                <textarea
                  id="setup-job-desc"
                  rows={5}
                  maxLength={JD_MAX_CHARS}
                  value={form.jobDescription}
                  onChange={(e) => {
                    updateForm({ jobDescription: e.target.value })
                    if (errors.jobDescription) setErrors(prev => ({ ...prev, jobDescription: '' }))
                  }}
                  placeholder={t('setup.placeholder')}
                  className={`w-full resize-none rounded-xl border bg-brand-inset px-4 py-3.5 pb-9 text-[13.5px] leading-relaxed text-brand-ink transition-colors placeholder:text-brand-muted/70 focus:outline-none focus:ring-4 focus:ring-brand-ink/10 ${errors.jobDescription ? 'border-brand-danger' : 'border-brand-line focus:border-brand-ink'
                    }`}
                />
                <span className="pointer-events-none absolute bottom-3 right-4 text-[11.5px] tabular-nums text-brand-muted">
                  {form.jobDescription.length} / {JD_MAX_CHARS}
                </span>
              </div>

              {errors.jobDescription && (
                <p className="mt-1.5 text-[12px] text-brand-danger">{errors.jobDescription}</p>
              )}
              {jdAnalysis.status === 'idle' && (
                <p className="mt-1.5 text-[12px] text-brand-muted">
                  {t('setup.jdAnalysisReady')} · {t('setup.hintDetail')}
                </p>
              )}
              {jdAnalysis.status !== 'idle' && (
                <p className={`mt-1.5 flex items-center gap-1.5 text-[12px] ${jdAnalysis.status === 'error' ? 'text-brand-danger' : jdAnalysis.status === 'success' ? 'text-brand-success' : 'text-brand-muted'
                  }`}>
                  {jdAnalyzing
                    ? <><Loader2 className="h-3 w-3 animate-spin" />{t('setup.jdAnalyzing')}</>
                    : <><Sparkles className="h-3 w-3" />{jdAnalysis.message}</>}
                </p>
              )}
            </SectionCard>

            <SectionCard title={t('setup.sectionInterviewSetup')}>
              <div className="divide-y divide-brand-line">

                <SettingRow label={t('setup.trackLabel')}>
                  <div className="flex flex-wrap gap-2">
                    {employmentTypes.map(item => (
                      <OptionPill
                        key={item.value}
                        selected={form.employmentType === item.value}
                        onClick={() => updateForm({ employmentType: item.value })}
                      >
                        {item.label}
                      </OptionPill>
                    ))}
                  </div>
                </SettingRow>

                <SettingRow label={t('setup.categoryLabel')}>
                  <div className="grid gap-3 lg:grid-cols-2">
                    <CategorySelector
                      value={selectedCategory}
                      options={categoryEntries.map(([key, cat]) => ({ value: key, label: cat.label }))}
                      onChange={setSelectedCategory}
                      placeholder={t('setup.categoryPlaceholder')}
                      t={t}
                    />
                    <div>
                      <div className="flex items-center gap-2.5">
                        <label htmlFor="setup-position" className="shrink-0 text-[12.5px] font-semibold text-brand-ink">
                          {t('setup.position')}<span className="text-brand-danger" aria-hidden="true">*</span>
                        </label>
                        <input
                          id="setup-position"
                          type="text"
                          value={form.position}
                          onChange={(e) => {
                            updateForm({ position: e.target.value })
                            if (errors.position) setErrors(prev => ({ ...prev, position: '' }))
                          }}
                          placeholder={t('setup.positionPlaceholder')}
                          className={`min-w-0 flex-1 rounded-xl border bg-brand-inset px-3.5 py-3 text-[13.5px] text-brand-ink transition-colors placeholder:text-brand-muted/70 focus:outline-none focus:ring-4 focus:ring-brand-ink/10 ${errors.position ? 'border-brand-danger' : 'border-brand-line focus:border-brand-ink'
                            }`}
                        />
                      </div>
                      {errors.position && <p className="mt-1.5 text-[12px] text-brand-danger">{errors.position}</p>}
                    </div>
                  </div>

                  <p className="mt-2 text-[11.5px] text-brand-muted">
                    {selectedRoles.length > 0 ? t('setup.subRoleHint') : t('setup.subRoleHintEmpty')}
                  </p>
                  {selectedRoles.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {selectedRoles.map(role => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => {
                            updateForm({ position: role })
                            setErrors(prev => ({ ...prev, position: '' }))
                          }}
                          className="rounded-full border border-brand-line bg-brand-card px-2.5 py-1 text-[11.5px] text-brand-muted transition-colors hover:border-brand-ink hover:text-brand-ink"
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  )}
                </SettingRow>

                <SettingRow label={t('setup.resumeUploadLabel')}>
                  <input
                    ref={resumeFileRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={handleResumePdf}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => resumeFileRef.current?.click()}
                    disabled={resumeParsing}
                    className="flex w-full items-center gap-3 rounded-xl border border-dashed border-brand-line bg-brand-inset px-4 py-2.5 text-left transition-colors hover:border-brand-ink disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-brand-line bg-brand-card text-brand-muted">
                      {resumeParsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold text-brand-ink">{t('setup.resumeChoosePdf')}</span>
                      <span className="block truncate text-[11.5px] text-brand-muted">{t('setup.resumeHintLimit', { mb: RESUME_MAX_MB })}</span>
                    </span>
                  </button>

                  <div className="mt-2 space-y-1">
                    {resumeNote && (
                      <p className={`text-[12px] ${resumeNote.type === 'err' ? 'text-brand-danger' : resumeNote.type === 'warn' ? 'text-brand-ink' : 'text-brand-success'}`}>
                        {resumeNote.text}
                      </p>
                    )}
                    <p className="text-[11.5px] leading-relaxed text-brand-muted">{t('setup.resumeAutoMatch')}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-brand-muted">
                      <span className="min-w-0">{resumeStatusText}</span>
                      {sessionResumeText.trim() && (
                        <button type="button" onClick={() => setSessionResumeText('')} className="font-semibold text-brand-ink hover:underline">
                          {t('setup.resumeClearSession')}
                        </button>
                      )}
                      <Link to="/profile" className="font-semibold text-brand-muted transition-colors hover:text-brand-ink">
                        {t('setup.resumeProfileLink')}
                      </Link>
                    </div>
                  </div>
                </SettingRow>

                <SettingRow label={t('setup.interviewerType')}>
                  <div className="grid gap-2.5 md:grid-cols-3">
                    {interviewerTypeOptions.map(option => (
                      <OptionCard
                        key={option.value}
                        selected={form.interviewerType === option.value}
                        onClick={() => updateForm({ interviewerType: option.value })}
                        icon={option.icon}
                        title={option.label}
                        desc={option.desc}
                        hint={option.hint}
                      />
                    ))}
                  </div>
                  <p className="mt-2 text-[11.5px] text-brand-muted">{t('setup.interviewerTypeDesc')}</p>
                </SettingRow>

                <SettingRow label={t('setup.interviewMode')}>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {modeOptions.map(option => (
                      <OptionCard
                        key={option.value}
                        selected={form.mode === option.value}
                        onClick={() => updateForm({ mode: option.value })}
                        icon={option.icon}
                        title={option.label}
                        desc={option.desc}
                      />
                    ))}
                  </div>
                  <p className="mt-2 text-[11.5px] text-brand-muted">{t('setup.interviewModeDesc')}</p>
                </SettingRow>

                <SettingRow label={t('setup.difficulty')}>
                  <div className="flex flex-wrap gap-2">
                    {difficultyOptions.map(option => (
                      <OptionPill
                        key={option.value}
                        selected={form.difficulty === option.value}
                        onClick={() => updateForm({ difficulty: option.value })}
                      >
                        {option.label}
                      </OptionPill>
                    ))}
                  </div>
                  {/* 只显示当前选中难度的说明，信息不丢又不撑高页面 */}
                  <p className="mt-2 text-[11.5px] leading-relaxed text-brand-muted">{selectedDifficulty?.desc}</p>
                </SettingRow>

                <SettingRow label={t('setup.interviewLang')}>
                  <div className="flex flex-wrap gap-2">
                    {languages.map(item => (
                      <OptionPill
                        key={item.value}
                        selected={form.language === item.value}
                        onClick={() => updateForm({ language: item.value })}
                      >
                        {item.label}
                      </OptionPill>
                    ))}
                  </div>
                </SettingRow>

                <SettingRow label={t('setup.duration')} htmlFor="setup-duration">
                  {isPractice ? (
                    <p className="rounded-lg border border-brand-line bg-brand-inset px-3.5 py-2.5 text-[12px] leading-relaxed text-brand-muted">
                      <span className="mr-2 inline-block rounded-md border border-brand-line bg-brand-card px-2 py-0.5 text-[11px] font-semibold text-brand-ink">
                        {t('setup.practiceUnlimitedCount', { n: practiceTotalQuestions })}
                      </span>
                      {t('setup.practiceFlowDesc', {
                        minutes: practiceEquivalentMinutes,
                        core: practiceCoreQuestions,
                        total: practiceTotalQuestions,
                      })}
                    </p>
                  ) : (
                    <div className="flex items-center gap-3.5 pt-1.5">
                      <span className="shrink-0 text-[11.5px] text-brand-muted">{t('setup.durationMinutes', { n: DURATION_MIN })}</span>
                      <input
                        id="setup-duration"
                        type="range"
                        min={DURATION_MIN}
                        max={DURATION_MAX}
                        step={5}
                        value={form.duration}
                        onChange={(e) => updateForm({ duration: Number(e.target.value) })}
                        className="brand-range"
                        style={{ '--brand-range-fill': `${durationFillPct}%` }}
                      />
                      <span className="shrink-0 text-[11.5px] text-brand-muted">{t('setup.durationMinutes', { n: DURATION_MAX })}</span>
                      <span className="shrink-0 rounded-lg border border-brand-ink px-2.5 py-1 text-[12.5px] font-semibold tabular-nums text-brand-ink">
                        {t('setup.durationMinutes', { n: form.duration })}
                      </span>
                    </div>
                  )}
                </SettingRow>

                <SettingRow label={t('setup.interviewerStyle')}>
                  <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                    {interviewerStyles.map(item => (
                      <OptionCard
                        key={item.value}
                        selected={form.interviewerStyle === item.value}
                        onClick={() => updateForm({ interviewerStyle: item.value })}
                        icon={STYLE_ICONS[item.value]}
                        title={item.label}
                        desc={item.desc}
                      />
                    ))}
                  </div>
                  <p className="mt-2 text-[11.5px] text-brand-muted">{t('setup.interviewerStyleDesc')}</p>
                </SettingRow>
              </div>
            </SectionCard>
          </div>

          {/* ───────────── 右栏：预览 + 概览 ───────────── */}
          <aside className="xl:sticky xl:top-[calc(var(--ui-nav-h)+1.5rem)] xl:max-h-[calc(100dvh-var(--ui-nav-h)-3rem)] xl:overflow-y-auto">
            <div className="brand-float rounded-[22px] px-5 py-5">
              <h2 className="mb-1 font-brand text-[16.5px] font-semibold tracking-[-0.01em] text-brand-ink">{t('setup.summaryOverview')}</h2>
              <div className="divide-y divide-brand-line">
                <div className="pb-1.5">
                  <SummaryRow
                    icon={Briefcase}
                    label={t('setup.summaryPosition')}
                    value={form.position.trim() || t('setup.summaryUnset')}
                    muted={!form.position.trim()}
                  />
                  <SummaryRow icon={BadgeCheck} label={t('setup.summaryEmployment')} value={employmentLabel} />
                  <SummaryRow
                    icon={LayoutTemplate}
                    label={t('setup.summaryCategory')}
                    value={categoryLabel || t('setup.summaryCategoryUnset')}
                    muted={!categoryLabel}
                  />
                  <SummaryRow
                    icon={FileText}
                    label={t('setup.summaryResume')}
                    value={effectiveResume ? t('setup.summaryResumeReady') : t('setup.summaryResumeNone')}
                    muted={!effectiveResume}
                  />
                </div>
                <div className="pt-1.5">
                  <SummaryRow icon={Users} label={t('setup.summaryType')} value={interviewerTypeLabel} />
                  <SummaryRow icon={MonitorPlay} label={t('setup.summaryMode')} value={modeLabel} />
                  <SummaryRow icon={Languages} label={t('setup.summaryLanguage')} value={languageLabel} />
                  <SummaryRow icon={BarChart3} label={t('setup.summaryDifficulty')} value={difficultyLabel} />
                  <SummaryRow icon={Clock} label={t('setup.summaryDuration')} value={durationLabel} />
                  <SummaryRow icon={UserCog} label={t('setup.summaryStyle')} value={styleLabel} />
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-brand-line bg-brand-inset p-3.5">
                <h3 className="mb-2 text-[13px] font-semibold text-brand-ink">{t('setup.benefitsTitle')}</h3>
                <ul className="space-y-1.5">
                  {[1, 2, 3].map(n => (
                    <li key={n} className="flex items-start gap-2 text-[12px] leading-relaxed text-brand-muted">
                      <Check className="mt-[3px] h-3 w-3 shrink-0 text-brand-success" strokeWidth={2.5} />
                      <span>{t(`setup.benefit${n}`)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 主 CTA：整页唯一的色块，走薰衣草渐变 */}
              <button
                type="submit"
                disabled={loading}
                className="quiet-cta mt-4 flex w-full items-center justify-center gap-2.5 rounded-xl px-5 py-3.5 text-[14.5px] font-semibold transition-opacity duration-200 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('setup.submitting')}
                  </>
                ) : (
                  <>
                    {t('setup.submit')}
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-on-ink/15 px-2 py-0.5 text-[11px] font-medium">
                      <Star className="h-2.5 w-2.5 fill-current" />
                      {t('setup.creditCost', { n: INTERVIEW_COST })}
                    </span>
                    <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                  </>
                )}
              </button>

              <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-[11.5px] text-brand-muted">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                {t('setup.previewReady')}
              </p>
            </div>
          </aside>
        </form>

        {/* 底部隐私说明条 */}
        <div className="brand-float mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[18px] px-5 py-4">
          <ShieldCheck className="h-4 w-4 shrink-0 text-brand-ink" />
          <span className="text-[13px] font-semibold text-brand-ink">{t('setup.privacyTitle')}</span>
          <span className="hidden h-4 w-px bg-brand-line sm:block" />
          <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-brand-muted">{t('setup.privacyBody')}</p>
          <Link
            to="/profile"
            className="flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-brand-muted transition-colors hover:text-brand-ink"
          >
            {t('setup.privacyMore')}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
