import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function GallupTestPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [step, setStep] = useState('intro') // intro | quiz | loading | report
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [results, setResults] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingProgress, setIsLoadingProgress] = useState(true)

  const questions = useMemo(() => {
    const raw = t('gallup.questions', { returnObjects: true })
    return Array.isArray(raw) ? raw : []
  }, [t])

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
            setResults(data.results)
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
    if (questions.length > 0) fetchProgress()
  }, [questions])

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
    const newAnswers = { ...answers, [questionId]: score }
    setAnswers(newAnswers)
    saveToBackend(newAnswers)
    if (currentIndex < questions.length - 1) {
      setTimeout(() => setCurrentIndex(currentIndex + 1), 250)
    }
  }

  const handleSubmit = async () => {
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

    setResults(finalResults)
    setStep('report')
    await saveToBackend(answers, finalResults, true)
  }

  const progress = questions.length > 0 ? (Object.keys(answers).length / questions.length) * 100 : 0

  if (isLoadingProgress) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
      </div>
    )
  }

  if (step === 'report' && results) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-all duration-700">
        <GallupReport results={results} onRetake={() => {
          setAnswers({}); setResults(null); setCurrentIndex(0); setStep('intro');
          saveToBackend({}, null, false);
        }} />
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 font-chinese-modern">
        <AnimatePresence mode="wait">
          {step === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.8 }} className="text-center py-12 md:py-20">
               <motion.div 
                 initial={{ opacity: 0, scale: 0.8 }}
                 animate={{ opacity: 1, scale: 1 }}
                 className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-[0.4em] mb-10 shadow-2xl"
               >
                <Gem className="w-4 h-4" /> Strategic Discovery
              </motion.div>
              
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-6 tracking-tighter leading-[1.1] font-chinese-modern uppercase">
                {t('gallup.title')}
              </h1>
              
              <p className="text-xl sm:text-2xl text-slate-500 dark:text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed font-bold italic opacity-80 pl-8 border-l-4 border-indigo-500">
                {t('gallup.subtitle')}
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
                {['executing', 'influencing', 'relationship', 'strategic'].map((key, i) => (
                  <motion.div 
                    key={key} 
                    initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                    className="p-8 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 group transition-all hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.05)] hover:-translate-y-1"
                  >
                    <div className="w-12 h-12 mx-auto rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/5 flex items-center justify-center mb-4 shadow-inner group-hover:rotate-12 transition-transform">
                      {key === 'executing' ? <Target className="w-6 h-6 text-emerald-500" /> : 
                       key === 'influencing' ? <Zap className="w-6 h-6 text-orange-500" /> :
                       key === 'relationship' ? <Users className="w-6 h-6 text-indigo-500" /> :
                       <Lightbulb className="w-6 h-6 text-sky-500" />}
                    </div>
                    <div className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest leading-tight">{t(`gallup.domains_info.${key}.name`).split(' (')[0]}</div>
                  </motion.div>
                ))}
              </div>

              <button 
                onClick={() => setStep('quiz')} 
                className="btn-primary group h-14 px-10 text-sm"
              >
                <span>{progress > 0 ? t('gallup.resumeBtn') : t('gallup.startBtn')}</span>
                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </button>
            </motion.div>
          )}

          {step === 'quiz' && (
            <motion.div key="quiz" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.6, ease: "anticipate" }} className="py-8">
              <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] dark:shadow-2xl overflow-hidden relative">
                {/* Visual Progress Header */}
                <div className="px-10 pt-10 pb-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-900 dark:bg-white flex items-center justify-center text-white dark:text-slate-900 shadow-2xl"><Dna className="w-7 h-7" /></div>
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">{t('gallup.phase', { current: currentIndex + 1, total: questions.length })}</span>
                      <span className="text-[9px] font-bold text-slate-400 tracking-widest">{t('gallup.quitHint')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                     <div className="text-right hidden sm:block">
                        <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{Math.round(progress)}%</div>
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('gallup.completion')}</div>
                     </div>
                     <button onClick={() => navigate('/profile')} className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all group">
                        <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                     </button>
                  </div>
                </div>

                <div className="px-10 py-16 sm:px-20 text-center flex flex-col space-y-16 items-center">
                  <AnimatePresence mode="wait">
                    <motion.h2 
                      key={currentIndex} 
                      initial={{ opacity: 0, y: 20 }} 
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.5 }}
                      className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-[1.3] tracking-tight font-chinese-modern"
                    >
                      {questions[currentIndex]?.text}
                    </motion.h2>
                  </AnimatePresence>

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 w-full">
                    {[
                      { score: 1, icon: Angry, label: 'gallup.options.stronglyDisagree', color: 'hover:border-rose-500 hover:text-rose-600' },
                      { score: 2, icon: Frown, label: 'gallup.options.disagree', color: 'hover:border-orange-500 hover:text-orange-600' },
                      { score: 3, icon: Meh, label: 'gallup.options.neutral', color: 'hover:border-slate-400 hover:text-slate-600' },
                      { score: 4, icon: Smile, label: 'gallup.options.agree', color: 'hover:border-emerald-500 hover:text-emerald-600' },
                      { score: 5, icon: SmilePlus, label: 'gallup.options.stronglyAgree', color: 'hover:border-indigo-500 hover:text-indigo-600' }
                    ].map((opt) => (
                      <button 
                        key={opt.score} 
                        onClick={() => handleAnswer(questions[currentIndex].id, opt.score)} 
                        className={`flex-1 flex flex-col items-center justify-center gap-3 py-5 px-3 rounded-2xl border-2 transition-all duration-300 relative group overflow-hidden ${answers[questions[currentIndex]?.id] === opt.score ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-2xl scale-105' : 'bg-transparent border-slate-100 dark:border-white/5 text-slate-400 '+opt.color} hover:-translate-y-1`}
                      >
                        <opt.icon className="w-10 h-10 transition-transform group-hover:scale-110" />
                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">{t(opt.label)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="px-10 py-8 bg-slate-50 dark:bg-black/20 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                  <button disabled={currentIndex === 0} onClick={() => setCurrentIndex(currentIndex - 1)} className="btn-secondary h-12 px-6 text-xs uppercase font-black tracking-widest">
                    <ChevronLeft className="w-4 h-4 mr-2" /> {t('gallup.prevBtn')}
                  </button>
                  <div className="h-1.5 flex-grow mx-12 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden relative">
                    <motion.div className="h-full bg-slate-900 dark:bg-white" animate={{ width: `${progress}%` }} transition={{ duration: 1 }} />
                  </div>
                  {currentIndex === questions.length - 1 || Object.keys(answers).length === questions.length ? (
                    <button onClick={handleSubmit} className="btn-primary h-12 px-8 text-xs uppercase font-black tracking-widest">
                      {t('gallup.submitBtn')} <CheckCircle className="w-4 h-4 ml-2" />
                    </button>
                  ) : (
                    <button onClick={() => setCurrentIndex(currentIndex + 1)} className="btn-primary h-12 px-8 text-xs uppercase font-black tracking-widest">
                      {t('gallup.nextBtn')} <ChevronRight className="w-4 h-4 ml-2" />
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
