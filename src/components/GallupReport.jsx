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

/**
 * 四大领域各自的配色。必须是完整类名字符串：
 * 之前写成 bg-<color>-50 这种拼接，会被生产构建的 purge 扫掉，线上图标是没有颜色的。
 * 与 GallupTestPage 里的那份保持一致。
 */
const DOMAIN_TONES = {
  executing: { chip: 'bg-brand-violet/[0.10] border-brand-violet/25', icon: 'text-brand-violet' },
  influencing: { chip: 'bg-brand-ink border-brand-ink', icon: 'text-brand-on-ink' },
  relationship: { chip: 'bg-brand-success/[0.10] border-brand-success/25', icon: 'text-brand-success' },
  strategic: { chip: 'bg-brand-sky/40 border-brand-sky', icon: 'text-brand-ink' },
}

const FALLBACK_TONE = DOMAIN_TONES.executing

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
        return <strong key={index} className="font-semibold text-brand-ink">{part.slice(2, -2)}</strong>;
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
    { key: 'executing', icon: ShieldCheck },
    { key: 'influencing', icon: Zap },
    { key: 'relationship', icon: Users },
    { key: 'strategic', icon: Lightbulb }
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
    <div className="ui-container max-w-5xl pb-14 pt-[calc(var(--ui-nav-h)+2rem)] space-y-10 font-chinese-modern">
      {/* New Clean Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-brand-line pb-8">
        <div className="space-y-2">
          <h1 className="font-brand text-[30px] sm:text-[36px] font-semibold tracking-tight leading-tight text-brand-ink">
            {isZh ? '你的优势报告' : t('gallup.report.title')}
          </h1>
          <p className="text-[14px] text-brand-muted">
            {isZh ? '基于盖洛普 34 项核心才干模型的职业竞争力诊断' : t('gallup.report.subtitle')}
          </p>
        </div>
        
        <button 
          onClick={onRetake}
          className="inline-flex h-11 shrink-0 items-center gap-2 self-start rounded-xl border border-brand-line bg-brand-card px-5 text-[13px] font-bold text-brand-ink transition-colors hover:border-brand-ink"
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
        className="grid grid-cols-1 lg:grid-cols-12 gap-6"
      >
        <motion.div variants={itemVariants} className="brand-float lg:col-span-6 xl:col-span-7 p-6 rounded-[22px] flex flex-col items-center justify-center relative overflow-hidden">
          {/* 只做氛围的柔光圆，透明度压在 0.12 */}
          <div
            className="hidden"
            aria-hidden="true"
          />
          <div className="w-full text-[12.5px] font-bold text-brand-ink mb-4 z-10 flex items-center justify-between relative">
            <span>{isZh ? '潜能雷达分析 (Potential Radar)' : 'Potential Radar'}</span>
            <TrendingUp className="w-4 h-4 text-brand-violet" />
          </div>
          <div className="relative z-10 w-full flex-1 flex items-center justify-center">
             <GallupRadar domainMap={domainMap} />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="lg:col-span-6 xl:col-span-5">
           <div className="grid grid-cols-2 gap-4 h-full">
             {domains.map((dom) => {
               const ConfIcon = dom.icon;
               const tone = DOMAIN_TONES[dom.key] || FALLBACK_TONE;
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
                    className="brand-float p-5 xl:p-6 rounded-[22px] border border-brand-line flex flex-col items-center justify-center hover:border-brand-ink transition-colors group w-full relative z-10 space-y-2.5"
                 >
                    <div className="absolute top-4 right-4 text-[11px] font-bold text-brand-muted bg-brand-inset px-2 py-0.5 rounded-full">
                       {isZh ? '天赋指数' : 'Index'}
                    </div>

                    <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-transform group-hover:scale-105 mb-1 ${tone.chip}`}>
                      <ConfIcon className={`w-5 h-5 ${tone.icon}`} />
                    </div>

                    <div className="text-[34px] font-semibold text-brand-ink tabular-nums leading-none tracking-tight">
                      {domainMap[dom.key] || 0}%
                    </div>

                    <div className="flex flex-col items-center text-center mt-1">
                      <h4 className="text-[13px] font-bold text-brand-ink tracking-tight">
                        {mainLabel}
                      </h4>
                      {subLabel && <span className="text-[11px] text-brand-muted mt-0.5">{subLabel}</span>}
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
        className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2"
      >
        {hasMultiDomains ? (
          <motion.div variants={itemVariants} className="md:col-span-12 space-y-6">
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
                const tone = DOMAIN_TONES[dom.key] || FALLBACK_TONE
                
                return (
                  <div id={`domain-section-${dom.key}`} key={dom.key} className="brand-float rounded-[22px] border border-brand-line p-6 sm:p-8 scroll-mt-32">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-7 pb-7 border-b border-brand-line">
                       <div className="flex items-center gap-4">
                         <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center ${tone.chip}`}>
                            <Icon className={`w-6 h-6 ${tone.icon}`} />
                         </div>
                         <div>
                           <span className="text-[11px] text-brand-muted block mb-1">
                             {index === 0 ? (isZh ? '首要才干领域' : isDe ? 'Haupttalentbereich' : 'Top Talent Domain') : (isZh ? '核心能力' : isDe ? 'Kernkompetenz' : 'Core Domain')}
                           </span>
                           <h2 className="font-brand text-[22px] font-semibold tracking-tight text-brand-ink">
                             {t(`gallup.domains.${dom.key}`)}
                           </h2>
                         </div>
                       </div>
                       <div className="text-left md:text-right">
                         <span className="text-[34px] font-semibold text-brand-ink tabular-nums tracking-tight">{dom.score}%</span>
                         <div className="text-[11px] text-brand-muted">{t('gallup.report.efficiency')} ({domAnalysis.tier})</div>
                       </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-5">
                       {dims.map((dim, idx) => (
                         <div key={idx} className={`space-y-2.5 ${idx === 0 || idx === 4 ? 'md:col-span-2' : ''} p-5 rounded-[18px] ${idx === 0 ? 'bg-brand-inset' : 'bg-brand-card border border-brand-line'}`}>
                            <h4 className={`${idx === 3 ? 'text-brand-danger' : 'text-brand-violet'} text-[12.5px] font-bold flex items-center gap-2`}>
                               {idx === 3 ? <ShieldCheck className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                               {dim.title}
                            </h4>
                            <p className={`${idx === 0 ? 'font-bold text-[14px]' : 'text-[13.5px]'} text-brand-ink leading-relaxed`}>
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
              className="brand-float md:col-span-12 lg:col-span-8 rounded-[22px] border border-brand-line p-6 sm:p-8 space-y-7"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center ${(DOMAIN_TONES[topDomainKey] || FALLBACK_TONE).chip}`}>
                    <Target className={`w-6 h-6 ${(DOMAIN_TONES[topDomainKey] || FALLBACK_TONE).icon}`} />
                  </div>
                  <div>
                    <span className="text-[11px] text-brand-muted block mb-1">{t('gallup.report.topTalentDomain')}</span>
                    <h2 className="font-brand text-[22px] font-semibold tracking-tight text-brand-ink">
                      {t(`gallup.domains.${topDomainKey}`)}
                    </h2>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[34px] font-semibold text-brand-ink tabular-nums tracking-tight">{topDomain.score}%</span>
                  <div className="text-[11px] text-brand-muted">{t('gallup.report.efficiency')}</div>
                </div>
              </div>

              <div className="p-5 rounded-[18px] bg-brand-inset border border-brand-line">
                <p className="text-[13.5px] font-bold text-brand-ink leading-relaxed">
                  {renderTextWithBold(analysisData?.overview || t(`gallup.domains_info.${topDomainKey}.desc`))}
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-[12.5px] font-bold text-brand-ink flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-brand-violet" />
                    {t('gallup.report.analysis')} {analysisData && <span className="font-medium text-brand-violet">(ai synergy insight)</span>}
                </h3>
                <p className="text-[13.5px] text-brand-ink leading-relaxed">
                    {renderTextWithBold(analysisData?.strengths_synergy || t(`gallup.domains_info.${topDomainKey}.detail`))}
                </p>
              </div>

              {analysisData?.blind_spots && (
                <div className="space-y-3">
                  <h3 className="text-[12.5px] font-bold text-brand-danger flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {isZh ? '潜在盲区 (Blind Spots)' : isDe ? 'Mögliche blinde Flecken' : 'Potential Blind Spots'}
                  </h3>
                  <p className="text-[13.5px] text-brand-ink leading-relaxed">
                      {renderTextWithBold(analysisData.blind_spots)}
                  </p>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-brand-line">
                <div className="space-y-3">
                  <h3 className="text-[12.5px] font-bold text-brand-ink flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-brand-violet" />
                    {t('gallup.report.advice')}
                  </h3>
                  <p className="text-[13px] font-bold text-brand-violet leading-relaxed">
                    {t(`gallup.domains_info.${topDomainKey}.advice`)}
                  </p>
                </div>
                <div className="space-y-3">
                  <h3 className="text-[12.5px] font-bold text-brand-ink flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-brand-violet" />
                    {t('gallup.report.growthTrajectory')}
                  </h3>
                  <div className="h-2 w-full bg-brand-inset rounded-full overflow-hidden mb-2">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${topDomain.score}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className="h-full bg-brand-violet rounded-full"
                    />
                  </div>
                  {analysisData && (
                    <p className="text-[12px] text-brand-muted leading-relaxed">
                      {isZh ? '您的能力组合显示出独特的发展轨迹，重点在长板的协同与放大。' : 'Your unique talent mapping suggests a customized growth trajectory leveraging your top synergies.'}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Career Matches Sidebar */}
            <motion.div 
              variants={itemVariants}
              className="md:col-span-12 lg:col-span-4 bg-brand-ink text-brand-on-ink rounded-[22px] p-6 sm:p-8 flex flex-col"
            >
              <div className="space-y-7 flex-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-on-ink/10 rounded-xl flex items-center justify-center">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <h3 className="text-[13px] font-semibold tracking-tight">{t('gallup.report.careerTitle')}</h3>
                </div>
                
                {analysisData?.career_advice ? (
                  <div className="pt-2">
                    <p className="text-[13.5px] text-brand-on-ink/80 leading-relaxed mb-5">
                      {analysisData.career_advice}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {careers.map((c, i) => (
                        <div key={i} className="px-3 py-1.5 rounded-lg bg-brand-on-ink/10 text-[12px] font-bold text-brand-on-ink/80 border border-brand-on-ink/10">
                          {c.trim()}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {careers.map((career, i) => (
                      <div key={i} className="group flex items-center justify-between p-4 rounded-[18px] bg-brand-on-ink/[0.06] border border-brand-on-ink/10 hover:bg-brand-on-ink/10 transition-colors">
                        <div className="flex items-center gap-4">
                          <span className="text-[22px] font-semibold text-brand-on-ink/25 tabular-nums">{i + 1}</span>
                          <span className="text-[13.5px] font-bold">{career.trim()}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-brand-on-ink/30 group-hover:text-brand-on-ink transition-colors" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="mt-7 pt-7 border-t border-brand-on-ink/10">
                <p className="text-[11px] text-brand-on-ink/60 leading-relaxed">
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
            className="fixed bottom-10 right-10 w-14 h-14 bg-brand-ink text-brand-on-ink rounded-2xl flex items-center justify-center hover:scale-105 transition-transform z-50 group border border-brand-ink"
          >
             <ArrowUp className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
