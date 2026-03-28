import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { 
  Dna, Target, Sparkles, TrendingUp, 
  RefreshCw, ChevronRight, Briefcase, 
  Lightbulb, ShieldCheck, Zap, Globe, Users
} from 'lucide-react'

export default function GallupReport({ results, onRetake }) {
  const { t } = useTranslation()

  if (!results || !Array.isArray(results)) return null

  // results is an array of { key, name, score } from GallupTestPage
  const topDomain = results[0] || { key: 'executing', score: 0 }
  const topDomainKey = topDomain.key

  const domainMap = results.reduce((acc, curr) => {
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
    <div className="max-w-5xl mx-auto px-6 py-12 space-y-12 font-chinese-modern">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 dark:border-slate-800 pb-10">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 text-[10px] font-black uppercase tracking-widest rounded-full">
            <Dna className="w-3 h-3" />
            {t('gallup.report.badge')}
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            {t('gallup.report.title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
            {t('gallup.report.subtitle')}
          </p>
        </div>
        
        <button 
          onClick={onRetake}
          className="btn-secondary h-12 px-8 flex items-center gap-2 text-xs font-black uppercase tracking-widest hover:border-primary-500 transition-all font-chinese-modern"
        >
          <RefreshCw className="w-4 h-4" />
          {t('gallup.report.retake')}
        </button>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-12 gap-8"
      >
        {/* Main Insight Card */}
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
              {t(`gallup.domains_info.${topDomainKey}.desc`)}
            </p>
          </div>

          <div className="space-y-4">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-3 h-3" />
                {t('gallup.report.analysis')}
             </h3>
             <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                {t(`gallup.domains_info.${topDomainKey}.detail`)}
             </p>
          </div>

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
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${topDomain.score}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="h-full bg-primary-600 rounded-full"
                />
              </div>
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
          </div>
          
          <div className="mt-8 pt-8 border-t border-white/5">
             <p className="text-[10px] text-slate-400 leading-relaxed italic">
               {t('gallup.report.disclaimer')}
             </p>
          </div>
        </motion.div>

        {/* Domain Breakdown Grid */}
        <motion.div variants={itemVariants} className="md:col-span-12 py-8">
           <div className="flex items-center gap-4 mb-8 text-slate-900 dark:text-white">
             <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
             <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">{t('gallup.report.potentialMapping')}</h3>
             <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
             {domains.map((dom) => (
               <div key={dom.key} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center space-y-4 group hover:border-primary-500/30 transition-all shadow-sm">
                  <div className={`w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-primary-500 group-hover:scale-110 transition-all`}>
                    <dom.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-1">
                      {t(`gallup.domains.${dom.key}`)}
                    </h4>
                    <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                      {domainMap[dom.key] || 0}%
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {t('gallup.report.presenceIndex')}
                  </div>
               </div>
             ))}
           </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
