import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { 
  Dna, Target, Sparkles, TrendingUp, 
  RefreshCw, ChevronRight, Briefcase, 
  Lightbulb, ShieldCheck, Zap, Globe, Users,
  ArrowUp
} from 'lucide-react'
import GallupRadar from './GallupRadar'

export default function GallupReport({ results, onRetake }) {
  const { t, i18n } = useTranslation()
  const [showTopBtn, setShowTopBtn] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) setShowTopBtn(true)
      else setShowTopBtn(false)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!results) return null

  // Support both legacy array format and new DB multi-domain format
  const scoresData = Array.isArray(results) ? results : (results.scores || [])
  const analysisData = !Array.isArray(results) ? results.analysis : null
  const hasMultiDomains = analysisData && analysisData.executing && analysisData.executing.dimensions

  if (!scoresData.length) return null
  const renderTextWithBold = (text) => {
    if (!text || typeof text !== 'string') return text;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="text-slate-900 dark:text-white font-black">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const topDomain = scoresData[0] || { key: 'executing', score: 0 }
  const topDomainKey = topDomain.key

  const domainMap = scoresData.reduce((acc, curr) => {
    acc[curr.key] = curr.score
    return acc
  }, {})
  
  const domains = [
    { key: 'executing', icon: ShieldCheck, color: 'emerald' },
    { key: 'influencing', icon: Zap, color: 'orange' },
    { key: 'relationship', icon: Users, color: 'blue' },
    { key: 'strategic', icon: Lightbulb, color: 'indigo' }
  ]

  const careers = t(`gallup.domains_info.${topDomainKey}.careers`)?.split(',') || []
  const isZh = i18n.language.startsWith('zh')
  const isDe = i18n.language.startsWith('de')

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 pt-32 pb-12 space-y-12 font-chinese-modern">
      {/* New Clean Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 dark:border-slate-800 pb-10">
        <div className="space-y-4">
          <h1 className="text-[2.5rem] font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight font-serif">
            {isZh ? '你的优势报告' : t('gallup.report.title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-base font-medium">
            {isZh ? '基于盖洛普 34 项核心才干模型的职业竞争力诊断' : t('gallup.report.subtitle')}
          </p>
        </div>
        
        <button 
          onClick={onRetake}
          className="btn-secondary h-12 px-6 flex items-center gap-2 text-sm font-bold bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all rounded-2xl"
        >
          <RefreshCw className="w-4 h-4" />
          {isZh ? '重测一次' : t('gallup.report.retake')}
        </button>
      </div>

      {/* Overview Dashboard: Radar + Domain Cards */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-12 gap-8"
      >
        <motion.div variants={itemVariants} className="lg:col-span-6 xl:col-span-7 bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center shadow-sm relative group">
          <div className="absolute inset-0 overflow-hidden rounded-[2rem] pointer-events-none">
            <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-100 dark:bg-fuchsia-900/10 blur-[100px] group-hover:scale-110 transition-transform duration-700" />
          </div>
          <div className="w-full text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-500 mb-4 z-10 flex items-center justify-between relative">
            <span>{isZh ? '潜能雷达分析 (Potential Radar)' : 'Potential Radar'}</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="relative z-10 w-full flex-1 flex items-center justify-center">
             <GallupRadar domainMap={domainMap} />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="lg:col-span-6 xl:col-span-5">
           <div className="grid grid-cols-2 gap-6 h-full">
             {domains.map((dom) => {
               const ConfIcon = dom.icon;
               const titleStr = t(`gallup.domains.${dom.key}`);
               let mainLabel = titleStr;
               let subLabel = null;
               if (titleStr.includes(' (')) {
                 const parts = titleStr.split(' (');
                 mainLabel = parts[0];
                 subLabel = parts[1].replace(')', '');
               }

               return (
                 <button 
                    key={dom.key} 
                    onClick={() => document.getElementById(`domain-section-${dom.key}`)?.scrollIntoView({ behavior: 'smooth' })}
                    className="bg-white dark:bg-slate-900 p-6 xl:p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center hover:border-slate-200 dark:hover:border-slate-700 transition-all shadow-sm hover:shadow-md hover:-translate-y-1 group w-full relative z-10 space-y-3"
                 >
                    <div className="absolute top-4 right-4 text-[9px] font-black text-slate-300 uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-full">
                       {isZh ? '天赋指数' : 'Index'}
                    </div>

                    <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-primary-500 group-hover:scale-110 transition-all mb-1">
                      <ConfIcon className="w-6 h-6" />
                    </div>

                    <div className="text-[2.5rem] font-black text-slate-900 dark:text-white tabular-nums leading-none tracking-tighter">
                      {domainMap[dom.key] || 0}%
                    </div>

                    <div className="flex flex-col items-center text-center mt-1">
                      <h4 className="text-[13px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tight">
                        {mainLabel}
                      </h4>
                      {subLabel && <span className="text-[10px] text-slate-400 mt-0.5 tracking-widest font-bold uppercase">{subLabel}</span>}
                    </div>
                 </button>
               );
             })}
           </div>
        </motion.div>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-8"
      >
        {hasMultiDomains ? (
          <motion.div variants={itemVariants} className="md:col-span-12 space-y-8">
             {scoresData.map((dom, index) => {
                const domAnalysis = analysisData[dom.key]
                if (!domAnalysis) return null
                const currentLang = i18n.language.split('-')[0]
                let dims = []
                if (domAnalysis.translations) {
                  dims = domAnalysis.translations[currentLang] || domAnalysis.translations['zh'] || []
                } else if (domAnalysis.dimensions) {
                  dims = domAnalysis.dimensions
                }
                if (!dims || dims.length === 0) return null
                const domainConfig = domains.find(d => d.key === dom.key)
                const Icon = domainConfig.icon
                
                return (
                  <div id={`domain-section-${dom.key}`} key={dom.key} className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-8 shadow-sm scroll-mt-32">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-8 border-b border-slate-100 dark:border-slate-800">
                       <div className="flex items-center gap-4">
                         <div className={`w-14 h-14 rounded-2xl bg-${domainConfig.color}-50 dark:bg-slate-800 flex items-center justify-center text-${domainConfig.color}-600 dark:text-primary-400 shadow-sm border border-slate-50 dark:border-slate-800`}>
                            <Icon className="w-7 h-7" />
                         </div>
                         <div>
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                             {index === 0 ? (isZh ? '首要才干领域' : isDe ? 'Haupttalentbereich' : 'Top Talent Domain') : (isZh ? '核心能力' : isDe ? 'Kernkompetenz' : 'Core Domain')}
                           </span>
                           <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                             {t(`gallup.domains.${dom.key}`)}
                           </h2>
                         </div>
                       </div>
                       <div className="text-left md:text-right">
                         <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{dom.score}%</span>
                         <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('gallup.report.efficiency')} ({domAnalysis.tier})</div>
                       </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                       {dims.map((dim, idx) => (
                         <div key={idx} className={`space-y-3 ${idx === 0 || idx === 4 ? 'md:col-span-2' : ''} p-6 rounded-2xl ${idx === 0 ? 'bg-slate-50 dark:bg-slate-950/50' : 'bg-transparent border border-slate-100 dark:border-slate-800'}`}>
                            <h4 className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${idx === 3 ? 'text-rose-400' : 'text-primary-500'}`}>
                               {idx === 3 ? <ShieldCheck className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                               {dim.title}
                            </h4>
                            <p className={`text-slate-700 dark:text-slate-200 leading-relaxed ${idx === 0 ? 'font-bold text-base' : 'text-sm'}`}>
                               {renderTextWithBold(dim.text)}
                            </p>
                         </div>
                       ))}
                    </div>
                  </div>
                )
             })}
          </motion.div>
        ) : (
          <>
            {/* Fallback Main Insight Card */}
            <motion.div 
              variants={itemVariants}
              className="md:col-span-12 lg:col-span-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-8 shadow-sm space-y-8"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl bg-${domains.find(d => d.key === topDomainKey)?.color}-50 dark:bg-slate-800 flex items-center justify-center text-${domains.find(d => d.key === topDomainKey)?.color}-600 dark:text-primary-400 shadow-sm border border-slate-50 dark:border-slate-800`}>
                    <Target className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">{t('gallup.report.topTalentDomain')}</span>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      {t(`gallup.domains.${topDomainKey}`)}
                    </h2>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{topDomain.score}%</span>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('gallup.report.efficiency')}</div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-bold">
                  {renderTextWithBold(analysisData?.overview || t(`gallup.domains_info.${topDomainKey}.desc`))}
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="w-3 h-3" />
                    {t('gallup.report.analysis')} {analysisData && <span className="text-primary-500 lowercase opacity-80">(ai synergy insight)</span>}
                </h3>
                <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                    {renderTextWithBold(analysisData?.strengths_synergy || t(`gallup.domains_info.${topDomainKey}.detail`))}
                </p>
              </div>

              {analysisData?.blind_spots && (
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-2">
                      <ShieldCheck className="w-3 h-3" />
                      {isZh ? '潜在盲区 (Blind Spots)' : isDe ? 'Mögliche blinde Flecken' : 'Potential Blind Spots'}
                  </h3>
                  <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                      {renderTextWithBold(analysisData.blind_spots)}
                  </p>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-slate-50 dark:border-slate-800">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Globe className="w-3 h-3" />
                    {t('gallup.report.advice')}
                  </h3>
                  <p className="text-sm font-bold text-primary-600 dark:text-primary-400 leading-relaxed italic">
                    {t(`gallup.domains_info.${topDomainKey}.advice`)}
                  </p>
                </div>
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp className="w-3 h-3" />
                    {t('gallup.report.growthTrajectory')}
                  </h3>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${topDomain.score}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className="h-full bg-primary-600 rounded-full"
                    />
                  </div>
                  {analysisData && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {isZh ? '您的能力组合显示出独特的发展轨迹，重点在长板的协同与放大。' : 'Your unique talent mapping suggests a customized growth trajectory leveraging your top synergies.'}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Career Matches Sidebar */}
            <motion.div 
              variants={itemVariants}
              className="md:col-span-12 lg:col-span-4 bg-slate-900 text-white rounded-[2.5rem] p-8 shadow-xl flex flex-col"
            >
              <div className="space-y-8 flex-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">{t('gallup.report.careerTitle')}</h3>
                </div>
                
                {analysisData?.career_advice ? (
                  <div className="pt-2">
                    <p className="text-sm text-slate-300 leading-relaxed font-medium mb-6">
                      {analysisData.career_advice}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {careers.map((c, i) => (
                        <div key={i} className="px-3 py-1.5 rounded-lg bg-white/10 text-xs font-bold text-white/80 border border-white/5">
                          {c.trim()}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {careers.map((career, i) => (
                      <div key={i} className="group flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-4">
                          <span className="text-2xl font-black text-white/20 tabular-nums">{i + 1}</span>
                          <span className="text-sm font-bold">{career.trim()}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white transition-colors" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="mt-8 pt-8 border-t border-white/5">
                <p className="text-[10px] text-slate-400 leading-relaxed italic">
                  {t('gallup.report.disclaimer')}
                </p>
              </div>
            </motion.div>
          </>
        )}


      </motion.div>

      {/* Back to Top Button */}
      <AnimatePresence>
        {showTopBtn && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-10 right-10 w-14 h-14 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl shadow-2xl flex items-center justify-center hover:scale-105 transition-transform z-50 group border border-slate-700/50 dark:border-white/20"
          >
             <ArrowUp className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
