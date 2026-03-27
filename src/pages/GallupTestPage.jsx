import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  Loader2, 
  Trophy,
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
  RefreshCcw,
  Sparkles,
  Heart,
  Compass,
  PieChart,
  Rocket,
  ArrowLeft,
  LayoutGrid,
  Award
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

// --- Premium Report Component ---
function GallupReportInternal({ results, onRetake }) {
  const { t } = useTranslation();
  
  if (!results) return null;

  const domainColors = {
    'executing': 'from-blue-500/10 to-indigo-600/10 dark:to-indigo-600/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
    'influencing': 'from-orange-500/10 to-red-600/10 dark:to-red-600/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/30',
    'relationship': 'from-teal-500/10 to-emerald-600/10 dark:to-emerald-600/20 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-500/30',
    'strategic': 'from-purple-500/10 to-fuchsia-600/10 dark:to-fuchsia-600/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/30',
    'default': 'from-gray-500/10 to-slate-600/10 dark:to-slate-600/20 text-slate-600 dark:text-gray-400 border-slate-200 dark:border-gray-500/30'
  };

  const domainIcons = {
    'executing': <Target className="w-5 h-5" />,
    'influencing': <Zap className="w-5 h-5" />,
    'relationship': <Users className="w-5 h-5" />,
    'strategic': <Lightbulb className="w-5 h-5" />,
    'default': <Trophy className="w-5 h-5" />
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-white selection:bg-primary-500/30 font-sans pb-20 transition-colors duration-500">
      {/* Immersive background orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary-500/5 dark:bg-primary-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-violet-500/5 dark:bg-violet-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 pt-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
          
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-slate-200 dark:border-white/5 pb-12">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/5 dark:bg-primary-500/10 border border-primary-500/10 dark:border-primary-500/20 text-primary-600 dark:text-primary-400 text-xs font-black uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t('gallup.report_ready', 'Analysis Complete')}</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tightest leading-[0.9] text-slate-900 dark:text-white">
                {t('gallup.report.title')}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl font-medium">
                {t('gallup.subtitle')}
              </p>
            </div>
            
            <button onClick={onRetake} className="h-14 px-8 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 transition-all flex items-center gap-3 text-sm font-black uppercase tracking-widest active:scale-95 shadow-sm">
              <RefreshCcw className="w-5 h-5" />
              {t('gallup.restartBtn')}
            </button>
          </header>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            
            {/* Top Talents / Domains */}
            <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {results.map((domain, idx) => (
                <motion.div
                  key={domain.key}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className={`relative overflow-hidden p-8 rounded-[2.5rem] border ${domainColors[domain.key] || domainColors.default} bg-white/70 dark:bg-white/[0.02] backdrop-blur-3xl transition-all group shadow-sm hover:shadow-xl dark:shadow-none`}
                >
                  <div className="relative z-10 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 flex items-center justify-center group-hover:rotate-6 transition-transform shadow-inner">
                        {domainIcons[domain.key] || domainIcons.default}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-50 dark:opacity-40 text-slate-400 dark:text-slate-500">
                        {Math.round(domain.score)}% Mastery
                      </span>
                    </div>
                    <div>
                      <h3 className="text-2xl font-black mb-3 text-slate-900 dark:text-white">{domain.name}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                        {t(`gallup.domains_info.${domain.key}.desc`)}
                      </p>
                    </div>
                  </div>
                  <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/20 dark:bg-white/5 rounded-full blur-3xl group-hover:bg-white/30 dark:group-hover:bg-white/10 transition-colors" />
                </motion.div>
              ))}
            </div>

            {/* Side Stats */}
            <div className="md:col-span-4 space-y-8">
              <div className="p-8 rounded-[2.5rem] bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 backdrop-blur-3xl shadow-sm">
                <h4 className="text-sm font-black uppercase tracking-widest mb-8 flex items-center gap-3 text-primary-600 dark:text-primary-400">
                  <PieChart className="w-5 h-5" />
                  Performance Metrics
                </h4>
                <div className="space-y-8">
                  {results.slice(0, 4).map((d) => (
                    <div key={d.key} className="space-y-3">
                      <div className="flex justify-between text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        <span>{d.name.split(' (')[0]}</span>
                        <span className="text-slate-900 dark:text-white">{Math.round(d.score)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${d.score}%` }} className="h-full bg-primary-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.3)]" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Career Paths */}
              <div className="p-8 rounded-[2.5rem] bg-primary-50 dark:bg-primary-600/5 border border-primary-100 dark:border-primary-500/10 backdrop-blur-3xl group relative overflow-hidden shadow-sm">
                <h4 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-3 text-primary-600 dark:text-primary-400">
                  <Compass className="w-5 h-5" />
                  {t('gallup.report.careerPath')}
                </h4>
                <div className="flex flex-wrap gap-2 relative z-10">
                  {results[0] && t(`gallup.domains_info.${results[0].key}.careers`).split(', ').map(path => (
                    <span key={path} className="px-3 py-1.5 rounded-xl bg-white dark:bg-primary-500/10 border border-slate-200 dark:border-primary-500/20 text-primary-700 dark:text-primary-300 text-[10px] font-black uppercase tracking-widest shadow-sm">
                      {path}
                    </span>
                  ))}
                </div>
                <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-primary-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
              </div>
            </div>

            {/* Insight Card */}
            <div className="md:col-span-12 p-10 md:p-14 rounded-[3.5rem] bg-gradient-to-br from-white to-slate-50 dark:from-white/[0.03] dark:to-white/[0.01] border border-slate-200 dark:border-white/10 backdrop-blur-3xl shadow-sm">
              <div className="max-w-4xl space-y-8">
                <div className="inline-flex items-center gap-3 text-teal-600 dark:text-teal-400">
                  <LayoutGrid className="w-8 h-8" />
                  <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">{t('gallup.report.analysis')}</h3>
                </div>
                <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                  {t('gallup.report.advice', 'Leverage your unique profile to dominate your career. Focus on your strengths rather than fixing weaknesses.')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 pt-8">
                  <div className="space-y-4">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/5 dark:bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400">
                      <Rocket className="w-6 h-6" />
                    </div>
                    <h5 className="font-black text-lg uppercase tracking-tight text-slate-900 dark:text-white">Daily Action Plan</h5>
                    <p className="text-sm text-slate-500 dark:text-slate-500 leading-relaxed font-medium">Identify one area today where your {results[0]?.name} can make the biggest impact and commit to it fully.</p>
                  </div>
                  <div className="space-y-4">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/5 dark:bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400">
                      <Award className="w-6 h-6" />
                    </div>
                    <h5 className="font-black text-lg uppercase tracking-tight text-slate-900 dark:text-white">Strategic Growth</h5>
                    <p className="text-sm text-slate-500 dark:text-slate-500 leading-relaxed font-medium">Seek environments that value results over process. Your dominant domain thrives when goals are clearly defined.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// --- Main Page Component ---
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
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#020617]">
        <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
      </div>
    )
  }

  if (step === 'report' && results) {
    return (
      <>
        <Navbar />
        <GallupReportInternal results={results} onRetake={() => {
          setAnswers({}); setResults(null); setCurrentIndex(0); setStep('intro');
          saveToBackend({}, null, false);
        }} />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#020617] pt-24 pb-12 transition-all duration-700">
      <Navbar />
      
      {/* Background orbs for intro/quiz */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-primary-500/[0.03] dark:bg-primary-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-violet-500/[0.03] dark:bg-violet-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-4xl mx-auto px-6 relative z-10">
        <AnimatePresence mode="wait">
          {step === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="text-center py-12">
               <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-primary-500/5 dark:bg-primary-500/10 border border-primary-500/10 dark:border-primary-500/20 text-primary-600 dark:text-primary-400 text-[10px] font-black uppercase tracking-[0.3em] mb-10 shadow-sm">
                <Gem className="w-3 h-3" /> Strategic Talent Discovery
              </div>
              <h1 className="text-6xl sm:text-8xl font-black text-slate-900 dark:text-white mb-8 tracking-tightest leading-[0.85] drop-shadow-sm">{t('gallup.title')}</h1>
              <p className="text-xl text-slate-500 dark:text-slate-400 mb-16 max-w-2xl mx-auto leading-relaxed font-semibold">{t('gallup.subtitle')}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
                {['executing', 'influencing', 'relationship', 'strategic'].map((key, i) => (
                  <motion.div key={key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="p-8 rounded-[2.5rem] bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-white/5 group transition-all hover:shadow-lg dark:hover:shadow-none">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/5 flex items-center justify-center mb-4 shadow-sm group-hover:rotate-6 transition-transform">
                      {key === 'executing' ? <Target className="w-6 h-6 text-emerald-500" /> : 
                       key === 'influencing' ? <Zap className="w-6 h-6 text-orange-500" /> :
                       key === 'relationship' ? <Users className="w-6 h-6 text-primary-500" /> :
                       <Lightbulb className="w-6 h-6 text-sky-500" />}
                    </div>
                    <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t(`gallup.domains_info.${key}.name`).split(' (')[0]}</div>
                  </motion.div>
                ))}
              </div>
              <button onClick={() => setStep('quiz')} className="group relative h-20 px-14 rounded-3xl bg-primary-600 text-white font-black text-xl shadow-2xl shadow-primary-600/20 hover:scale-105 active:scale-95 transition-all">
                <div className="flex items-center gap-3">
                  <span>{progress > 0 ? t('gallup.resumeBtn') : t('gallup.startBtn')}</span>
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </motion.div>
          )}

          {step === 'quiz' && (
            <motion.div key="quiz" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
              <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-3xl rounded-[3rem] border border-slate-200 dark:border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] dark:shadow-2xl overflow-hidden">
                <div className="px-8 pt-8 pb-4">
                  <div className="flex items-center justify-between px-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center text-white shadow-lg shadow-primary-600/20 shadow-inner"><Dna className="w-5 h-5" /></div>
                      <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">Question {currentIndex + 1} / {questions.length}</span>
                    </div>
                    <span className="text-xs font-black text-primary-600 dark:text-primary-400">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden shadow-inner"><motion.div className="h-full bg-primary-600 rounded-full" animate={{ width: `${progress}%` }} /></div>
                </div>

                <div className="px-10 py-16 sm:px-20 text-center space-y-16">
                  <motion.h2 key={currentIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white leading-[1.1] tracking-tight">{questions[currentIndex]?.text}</motion.h2>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                    {[
                      { score: 1, icon: Angry, color: 'hover:text-rose-500' },
                      { score: 2, icon: Frown, color: 'hover:text-orange-500' },
                      { score: 3, icon: Meh, color: 'hover:text-slate-400' },
                      { score: 4, icon: Smile, color: 'hover:text-emerald-500' },
                      { score: 5, icon: SmilePlus, color: 'hover:text-primary-500' }
                    ].map((opt) => (
                      <motion.button key={opt.score} whileHover={{ y: -5 }} onClick={() => handleAnswer(questions[currentIndex].id, opt.score)} className={`group flex flex-col items-center justify-center p-8 rounded-[2rem] border-2 transition-all ${answers[questions[currentIndex]?.id] === opt.score ? 'bg-primary-600 text-white border-primary-600 shadow-xl shadow-primary-600/20' : 'bg-white dark:bg-transparent border-slate-200 dark:border-white/5 text-slate-400 dark:text-slate-500 '+opt.color} hover:shadow-md dark:hover:shadow-none`}>
                        <opt.icon className="w-10 h-10 mb-4 transition-transform group-hover:scale-110" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{t(`gallup.options.${['stronglyDisagree','disagree','neutral','agree','stronglyAgree'][opt.score-1]}`)}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="px-10 py-10 bg-slate-50 dark:bg-black/20 flex items-center justify-between border-t border-slate-200 dark:border-white/5">
                  <button disabled={currentIndex === 0} onClick={() => setCurrentIndex(currentIndex - 1)} className="flex items-center gap-3 h-14 px-8 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white font-black text-xs uppercase tracking-widest disabled:opacity-0 transition-all shadow-sm active:scale-95 hover:bg-slate-50 dark:hover:bg-slate-700"><ChevronLeft className="w-5 h-5" /> {t('gallup.prevBtn')}</button>
                  {currentIndex === questions.length - 1 || Object.keys(answers).length === questions.length ? (
                    <button onClick={handleSubmit} className="flex items-center gap-4 h-14 px-10 rounded-2xl bg-primary-600 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-primary-600/20 active:scale-95"><CheckCircle className="w-5 h-5" /> {t('gallup.submitBtn')}</button>
                  ) : (
                    <button onClick={() => setCurrentIndex(currentIndex + 1)} className="flex items-center gap-4 h-14 px-8 rounded-2xl bg-primary-600 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-primary-600/20 active:scale-95">{t('gallup.nextBtn')} <ChevronRight className="w-5 h-5" /></button>
                  )}
                </div>
              </div>

              {isSaving && (
                <div className="flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 animate-pulse">
                  <div className="w-1 h-1 bg-current rounded-full" />
                  Cloud Synced
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
