import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronRight, 
  ChevronLeft, 
  Loader2, 
  Target,
  Zap,
  Users,
  Lightbulb,
  ArrowRight,
  AlertTriangle,
  Gem,
  CheckCircle,
  Dna,
  Frown,
  Meh,
  Smile,
  SmilePlus,
  Angry,
  Sparkles,
  X
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import GallupReport from '../components/GallupReport'
import heroBg from '../assets/background.jpg'

import { getBackendBaseUrl } from '../lib/backendBase'
import { authenticatedFetch } from '../lib/authenticatedFetch'

const API_URL = getBackendBaseUrl()

/**
 * 四大领域各配一个色，全部写成完整类名（拼接类名会被生产构建 purge 掉）。
 * 都压成淡底 + 同色图标，只有 influencing 是深色实底，四个仍然能区分但不会跳出来。
 */
const DOMAIN_TONES = {
  executing: { chip: 'bg-brand-violet/[0.10] border-brand-violet/25', icon: 'text-brand-violet' },
  influencing: { chip: 'bg-brand-ink border-brand-ink', icon: 'text-brand-on-ink' },
  relationship: { chip: 'bg-brand-success/[0.10] border-brand-success/25', icon: 'text-brand-success' },
  strategic: { chip: 'bg-brand-sky/40 border-brand-sky', icon: 'text-brand-ink' },
}

export default function GallupTestPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [step, setStep] = useState('intro') // intro | quiz | loading | report
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [results, setResults] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingProgress, setIsLoadingProgress] = useState(true)
  const [tokens, setTokens] = useState(0)
  const [errorMessage, setErrorMessage] = useState(null)

  const [dbQuestions, setDbQuestions] = useState([])
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true)

  const refreshTokens = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await authenticatedFetch(`${API_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })

      if (res.ok) {
        const data = await res.json()
        setTokens(data.tokens || 0)
      }
    } catch (err) {
      console.error('Failed to refresh tokens', err)
    }
  }

  const questions = useMemo(() => {
    if (dbQuestions.length === 0) return []
    const langKey = (i18n.language || 'zh').split('-')[0] // 'zh-CN' -> 'zh'
    
    return dbQuestions.map(q => ({
      id: q.index_number,
      text: q[`question_${langKey}`] || q.question_en, // Fallback to EN if lang not found
      domain: q.category
    }))
  }, [dbQuestions, i18n.language])

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const res = await fetch(`${API_URL}/api/gallup/questions`)
        if (res.ok) {
          const data = await res.json()
          setDbQuestions(data)
        }
      } catch (err) {
        console.error('Failed to fetch questions from DB:', err)
      } finally {
        setIsLoadingQuestions(false)
      }
    }
    fetchQuestions()
  }, [])

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { setIsLoadingProgress(false); return; }

        const res = await fetch(`${API_URL}/api/gallup/results`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
        
        if (res.ok) {
          const data = await res.json()
          if (data.status === 'completed') {
            if (Array.isArray(data.results)) {
              setResults({ scores: data.results, analysis: null })
            } else {
              setResults(data.results)
            }
            setStep('report')
          } else if (data.status === 'in_progress') {
            setAnswers(data.answers || {})
            const qList = Array.isArray(questions) ? questions : []
            const firstUnanswered = qList.findIndex(q => !data.answers[q.id])
            setCurrentIndex(firstUnanswered !== -1 ? firstUnanswered : 0)
          }
        }
      } catch (err) {
        console.error('Progress load failed:', err)
      } finally {
        setIsLoadingProgress(false)
      }
    }
    if (!isLoadingQuestions) {
      if (questions.length > 0) {
        fetchProgress()
      } else {
        setIsLoadingProgress(false)
        setErrorMessage(t('common.networkError') || 'Network Error')
      }
    }
  }, [questions, isLoadingQuestions])

  useEffect(() => {
    void refreshTokens()
  }, [])

  const saveToBackend = async (newAnswers, finalResults = null, isCompleted = false) => {
    setIsSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      await fetch(`${API_URL}/api/gallup/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ answers: newAnswers, results: finalResults, status: isCompleted ? 'completed' : 'in_progress' })
      })
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAnswer = (questionId, score) => {
    // Guard: avoid double-click advancing / auto state thrash.
    const existing = answers[questionId]
    const existingNum = typeof existing === 'string' ? Number(existing) : existing
    if (typeof existingNum === 'number' && !Number.isNaN(existingNum)) return
    const newAnswers = { ...answers, [questionId]: score }
    setAnswers(newAnswers)
    saveToBackend(newAnswers)
    if (currentIndex < questions.length - 1) {
      setTimeout(() => setCurrentIndex(currentIndex + 1), 250)
    }
  }

  const handleSubmit = async () => {
    setStep('loading')
    const domainScores = { executing: 0, influencing: 0, relationship: 0, strategic: 0 }
    const domainCounts = { executing: 0, influencing: 0, relationship: 0, strategic: 0 }
    
    questions.forEach(q => {
      const score = answers[q.id] || 3
      if (domainScores[q.domain] !== undefined) {
        domainScores[q.domain] += score
        domainCounts[q.domain] += 1
      }
    })

    const finalResults = Object.keys(domainScores).map(key => ({
      key,
      name: t(`gallup.domains_info.${key}.name`),
      score: Math.min(100, Math.round((domainScores[key] / (domainCounts[key] * 5)) * 100))
    })).sort((a, b) => b.score - a.score)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      
      const langKey = (i18n.language || 'zh').split('-')[0]
      const res = await fetch(`${API_URL}/api/gallup/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ answers, results: finalResults, language: langKey, status: 'completed' })
      })
      if (res.ok) {
        const data = await res.json()
        setResults(data.results)
        // Ensure token UI (Navbar/Profile/Gallup page) stays in sync right after deduction.
        await refreshTokens()
        window.dispatchEvent(new Event('tokensChanged'))
      } else {
        const err = await res.json().catch(() => ({}))
        if (res.status === 403) {
          setErrorMessage(t('common.insufficientTokens', 'Insufficient Energy'))
          setStep('quiz') // Go back to quiz to show error
          return
        }
        setResults({ scores: finalResults, analysis: null })
      }
    } catch(e) {
      console.error('Analyze error:', e)
      setResults({ scores: finalResults, analysis: null })
    }
    setStep('report')
  }

  const answeredCount = questions.length
    ? questions.reduce((acc, q) => {
      const v = answers[q.id]
      const n = typeof v === 'string' ? Number(v) : v
      return acc + (typeof n === 'number' && !Number.isNaN(n) ? 1 : 0)
    }, 0)
    : 0

  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0

  if (isLoadingQuestions || isLoadingProgress) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-paper">
        <Loader2 className="w-10 h-10 text-brand-violet animate-spin" />
      </div>
    )
  }

  if (errorMessage && questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-brand-paper p-6 text-center">
        <div>
          <AlertTriangle className="w-12 h-12 text-brand-danger mb-4 mx-auto" />
          <h2 className="font-brand text-[22px] font-semibold tracking-tight text-brand-ink mb-2">Failed to Load</h2>
          <p className="text-[13px] text-brand-muted max-w-sm">{errorMessage}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl border border-brand-line bg-brand-card px-6 py-2.5 text-[13px] font-bold text-brand-ink transition-colors hover:border-brand-ink"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (step === 'report' && results) {
    return (
      <div className="min-h-screen bg-brand-paper">
        <GallupReport results={results} onRetake={() => {
          setAnswers({}); setResults(null); setCurrentIndex(0); setStep('intro');
          saveToBackend({}, null, false);
        }} />
      </div>
    )
  }

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-5 bg-brand-paper px-6 text-center">
        <Sparkles className="w-12 h-12 text-brand-violet animate-pulse" />
        <h2 className="font-brand text-[22px] font-semibold tracking-tight text-brand-ink">{t('gallup.loading')}</h2>
        <p className="text-[12.5px] text-brand-muted">Fetching and assembling your structured dimension analysis...</p>
      </div>
    )
  }

  return (
    <div className="theme-quiet min-h-screen bg-brand-paper pb-14 pt-[calc(var(--ui-nav-h)+2rem)]">
      {/* 与首页同一套克制的柔光圆，只做氛围 */}
      <div
        className="hidden"
        aria-hidden="true"
      />

      <div className="ui-container relative z-10 max-w-4xl font-chinese-modern">
        <AnimatePresence mode="wait">
          {step === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.8 }} className="text-center py-8 md:py-12">
               <motion.div 
                 initial={{ opacity: 0, scale: 0.8 }}
                 animate={{ opacity: 1, scale: 1 }}
                 className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-brand-card px-4 py-1.5 text-[12.5px] font-bold text-brand-ink mb-8"
               >
                <Gem className="w-3.5 h-3.5 text-brand-violet" /> Strategic Discovery
              </motion.div>
              
              <h1 className="font-brand text-[34px] sm:text-[40px] font-semibold text-brand-ink mb-5 tracking-tight leading-tight">
                {t('gallup.title')}
              </h1>
              
              <p className="mx-auto mb-12 max-w-3xl border-l-2 border-brand-violet pl-5 text-left text-[14px] leading-relaxed text-brand-muted">
                {t('gallup.subtitle')}
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                {['executing', 'influencing', 'relationship', 'strategic'].map((key, i) => (
                  <motion.div 
                    key={key} 
                    initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                    className="brand-float rounded-[20px] border border-brand-line p-6 group transition-transform hover:-translate-y-1"
                  >
                    <div className={`w-12 h-12 mx-auto rounded-xl border flex items-center justify-center mb-3 transition-transform group-hover:rotate-6 ${DOMAIN_TONES[key].chip}`}>
                      {key === 'executing' ? <Target className={`w-5 h-5 ${DOMAIN_TONES.executing.icon}`} /> : 
                       key === 'influencing' ? <Zap className={`w-5 h-5 ${DOMAIN_TONES.influencing.icon}`} /> :
                       key === 'relationship' ? <Users className={`w-5 h-5 ${DOMAIN_TONES.relationship.icon}`} /> :
                       <Lightbulb className={`w-5 h-5 ${DOMAIN_TONES.strategic.icon}`} />}
                    </div>
                    <div className="text-[12.5px] font-bold text-brand-ink leading-tight">{t(`gallup.domains_info.${key}.name`).split(' (')[0]}</div>
                  </motion.div>
                ))}
              </div>

              <div className="mb-10 flex flex-col items-center gap-2.5">
                {/* 主 CTA：荧光黄绿底 + 黑字黑框 */}
                <button 
                  onClick={() => setStep('quiz')} 
                  disabled={tokens < 100}
                  className="group inline-flex h-14 items-center justify-center gap-2.5 rounded-xl bg-brand-ink px-10 text-[15px] font-semibold text-brand-on-ink transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span>{progress > 0 ? t('gallup.resumeBtn') : t('gallup.startBtn')}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <p className={`${tokens < 100 ? 'text-brand-danger' : 'text-brand-muted'} text-[12px]`}>
                   {t('profile.tokenUsage')} 100 Energy（{t('profile.tokens')}: {tokens}）
                </p>
                {tokens < 100 && (
                  <Link to="/profile" className="text-[12px] font-bold text-brand-violet underline">
                    {t('profile.recharge')}
                  </Link>
                )}
              </div>
            </motion.div>
          )}

          {step === 'quiz' && (
            <motion.div key="quiz" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.6, ease: "anticipate" }} className="py-6">
                <div className="brand-float rounded-[22px] border border-brand-line overflow-hidden relative">
                {/* Visual Progress Header */}
                <div className="px-6 pt-6 pb-5 sm:px-8 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-brand-ink flex items-center justify-center text-brand-on-ink"><Dna className="w-6 h-6" /></div>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-semibold tracking-tight text-brand-ink">{t('gallup.phase', { current: currentIndex + 1, total: questions.length })}</span>
                      <span className="text-[11px] text-brand-muted">{t('gallup.quitHint')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-5">
                     <div className="text-right hidden sm:block">
                        <div className="text-[20px] font-semibold text-brand-ink tabular-nums leading-none">{Math.round(progress)}%</div>
                        <div className="mt-1 text-[11px] text-brand-muted">{t('gallup.completion')}</div>
                     </div>
                     <button onClick={() => setStep('intro')} className="w-11 h-11 rounded-xl border border-brand-line bg-brand-card flex items-center justify-center text-brand-muted transition-colors hover:border-brand-ink hover:text-brand-danger group">
                        <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                     </button>
                  </div>
                </div>

                <div className="px-6 py-12 sm:px-12 text-center flex flex-col space-y-12 items-center">
                  <AnimatePresence mode="wait">
                    <motion.h2 
                      key={currentIndex} 
                      initial={{ opacity: 0, y: 20 }} 
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.5 }}
                      className="font-brand text-[22px] sm:text-[26px] font-semibold text-brand-ink leading-[1.35] tracking-tight"
                    >
                      {questions[currentIndex]?.text}
                    </motion.h2>
                  </AnimatePresence>

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 w-full">
                    {[
                      { score: 1, icon: Angry, label: 'gallup.options.stronglyDisagree' },
                      { score: 2, icon: Frown, label: 'gallup.options.disagree' },
                      { score: 3, icon: Meh, label: 'gallup.options.neutral' },
                      { score: 4, icon: Smile, label: 'gallup.options.agree' },
                      { score: 5, icon: SmilePlus, label: 'gallup.options.stronglyAgree' }
                    ].map((opt) => (
                      <button 
                        key={opt.score} 
                        onClick={() => handleAnswer(questions[currentIndex].id, opt.score)} 
                        /* 选中态：黑框 + 黑底白字；ring 而不是加粗 border，切换时零布局位移 */
                        className={`flex-1 flex flex-col items-center justify-center gap-2.5 py-5 px-3 rounded-2xl border transition-colors duration-200 relative group overflow-hidden ${answers[questions[currentIndex]?.id] === opt.score ? 'border-brand-ink bg-brand-ink text-brand-on-ink ring-1 ring-brand-ink' : 'border-brand-line bg-brand-card text-brand-muted hover:border-brand-ink hover:text-brand-ink'}`}
                      >
                        <opt.icon className="w-8 h-8 transition-transform group-hover:scale-110" />
                        <span className="text-[11px] font-bold leading-none">{t(opt.label)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="px-6 py-6 sm:px-8 bg-brand-inset border-t border-brand-line flex items-center justify-between gap-4">
                  <button
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex(currentIndex - 1)}
                    className="inline-flex h-11 shrink-0 items-center rounded-xl border border-brand-line bg-brand-card px-4 text-[13px] font-bold text-brand-ink transition-colors hover:border-brand-ink disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1.5" /> {t('gallup.prevBtn')}
                  </button>
                  <div className="h-1.5 flex-grow mx-4 sm:mx-8 bg-brand-line rounded-full overflow-hidden relative">
                    <motion.div className="h-full bg-brand-ink" animate={{ width: `${progress}%` }} transition={{ duration: 1 }} />
                  </div>
                  {answeredCount === questions.length ? (
                    <button onClick={handleSubmit} className="inline-flex h-11 shrink-0 items-center rounded-xl bg-brand-ink px-5 text-[13px] font-semibold text-brand-on-ink transition-opacity duration-200 hover:opacity-90">
                      {t('gallup.viewResults')} <CheckCircle className="w-4 h-4 ml-1.5" />
                    </button>
                  ) : (
                    <button onClick={() => setCurrentIndex(currentIndex + 1)} className="inline-flex h-11 shrink-0 items-center rounded-xl bg-brand-ink px-5 text-[13px] font-semibold text-brand-on-ink transition-opacity duration-200 hover:opacity-90">
                      {t('gallup.nextBtn')} <ChevronRight className="w-4 h-4 ml-1.5" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
