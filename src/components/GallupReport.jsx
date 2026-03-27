import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Trophy, 
  Target, 
  Zap, 
  Users, 
  Lightbulb, 
  RefreshCcw,
  Briefcase,
  TrendingUp,
  Award,
  Sparkles,
  ShieldCheck,
  Compass,
  ArrowRight,
  Gem
} from 'lucide-react'

export default function GallupReport({ results, onRetake }) {
  const { t } = useTranslation()

  // Find top domain with safety guard
  const resultsArray = results && Array.isArray(results) ? results : []
  const sortedResults = resultsArray.length > 0 ? [...resultsArray].sort((a, b) => b.score - a.score) : []
  const topDomain = sortedResults.length > 0 ? sortedResults[0] : { key: 'executing', name: 'N/A', score: 0 }

  const domainIcons = {
    executing: Target,
    influencing: Zap,
    relationship: Users,
    strategic: Lightbulb
  }

  const domainColors = {
    executing: 'from-emerald-400 via-emerald-500 to-teal-600',
    influencing: 'from-orange-400 via-amber-500 to-orange-600',
    relationship: 'from-primary-400 via-indigo-500 to-violet-600',
    strategic: 'from-sky-400 via-blue-500 to-indigo-600'
  }

  // Final Guard: If something is critically wrong, return a simple view
  if (!topDomain || !topDomain.key) {
    return <div className="p-20 text-center">Loading Report Error. <button onClick={onRetake}>Retry</button></div>
  }

  const Icon = domainIcons[topDomain.key] || Target
  const colorClass = domainColors[topDomain.key] || 'from-slate-400 to-slate-600'

  // Define direct animations for reliability
  const fadeIn = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6 } }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 relative pb-20">
      {/* Background Decorative */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-white dark:bg-[#020617]">
         <div className="absolute top-1/4 -right-20 w-[600px] h-[600px] bg-primary-200/20 rounded-full blur-[120px]" />
         <div className="absolute bottom-1/4 -left-20 w-[500px] h-[500px] bg-indigo-200/20 rounded-full blur-[100px]" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 md:grid-rows-6 gap-6 min-h-[1200px] lg:h-[1000px]">
        {/* Main Hero Tile - Prime Strength */}
        <motion.div 
          {...fadeIn}
          className="md:col-span-8 md:row-span-3 rounded-[3rem] bg-slate-900 dark:bg-slate-900 border border-slate-800/50 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] overflow-hidden relative group"
        >
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-600/10 rounded-full blur-[120px] translate-x-1/2 -translate-y-1/2 group-hover:bg-primary-600/20 transition-all duration-700" />
          
          <div className="relative z-10 p-12 h-full flex flex-col justify-between">
            <div>
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-[10px] font-black uppercase tracking-[0.3em] mb-8"
              >
                <Gem className="w-3 h-3" />
                Master Competency Profile
              </motion.div>

              <h2 className="text-5xl sm:text-7xl font-black text-white mb-6 tracking-tightest leading-[0.95] drop-shadow-2xl">
                {t('gallup.report.title')}
              </h2>

              <div className="flex flex-wrap items-center gap-4 mb-8">
                <div className={`inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r ${colorClass} text-white font-black shadow-[0_15px_30px_-5px_rgba(37,99,235,0.3)] transform hover:scale-105 transition-transform duration-500`}>
                  <Award className="w-7 h-7" />
                  <span className="text-xl uppercase tracking-tight">{topDomain.name}</span>
                </div>
                <div className="px-6 py-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-xl flex items-center gap-3">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Active Insight</span>
                </div>
              </div>

              <p className="text-slate-400 text-xl leading-relaxed max-w-2xl font-medium">
                {t(`gallup.domains_info.${topDomain.key}.desc`)}
              </p>
            </div>

            <div className="mt-12 flex flex-wrap gap-6 items-end">
               <div className="relative group/score">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary-600 to-violet-600 rounded-[2rem] blur opacity-25 group-hover/score:opacity-50 transition duration-1000"></div>
                  <div className="relative w-28 h-28 rounded-[2rem] bg-slate-900 border border-white/10 flex flex-col items-center justify-center backdrop-blur-3xl shadow-2xl">
                    <span className="text-4xl font-black text-white tracking-tighter">{topDomain.score}%</span>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Intensity</span>
                  </div>
               </div>

               <div className="flex-grow flex items-center justify-between p-6 rounded-[2rem] bg-white/5 border border-white/5 backdrop-blur-xl">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-primary-500/20 flex items-center justify-center text-primary-400 ring-1 ring-primary-500/30 shadow-inner">
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Reliability Index</div>
                      <div className="text-white text-lg font-black tracking-tight flex items-center gap-2">
                        Optimized Profile
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="hidden lg:block w-8 h-8 text-slate-700 group-hover:text-primary-500 group-hover:translate-x-2 transition-all duration-500" />
               </div>
            </div>
          </div>
        </motion.div>

        {/* Career Matrix Tile (Tall) */}
        <motion.div 
          {...fadeIn}
          transition={{ ...fadeIn.transition, delay: 0.2 }}
          className="md:col-span-4 md:row-span-4 rounded-[3rem] bg-gradient-to-b from-[#1a237e] via-[#311b92] to-[#4a148c] text-white p-10 shadow-[0_32px_64px_-16px_rgba(74,20,140,0.4)] relative overflow-hidden group/careers"
        >
          <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_100%_0%,rgba(255,255,255,0.1),transparent)]" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center shadow-2xl ring-1 ring-white/20">
                  <Briefcase className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight">{t('gallup.report.careerPath')}</h3>
                  <p className="text-[10px] font-black text-primary-200 uppercase tracking-widest opacity-60">Strategic Mapping</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4 flex-grow">
              {String(t(`gallup.domains_info.${topDomain.key}.careers`) || '').split(',').map((career, i) => (
                <motion.div 
                  key={career}
                  whileHover={{ x: 8, backgroundColor: 'rgba(255,255,255,0.15)' }}
                  className="flex items-center gap-5 p-5 rounded-[1.5rem] bg-white/5 border border-white/5 transition-all cursor-default group/item shadow-lg"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center font-black text-sm ring-1 ring-white/10 group-hover/item:scale-110 group-hover/item:shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all">
                    {i + 1}
                  </div>
                  <span className="font-black text-base tracking-tight">{career}</span>
                </motion.div>
              ))}
            </div>

            <div className="mt-10 p-6 rounded-[2rem] bg-black/30 border border-white/10 backdrop-blur-lg">
               <div className="flex items-center gap-3 mb-2">
                 <Compass className="w-4 h-4 text-emerald-400" />
                 <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Growth Forecast</span>
               </div>
               <p className="text-[11px] leading-relaxed text-slate-300 font-bold">
                 High compatibility detected in executive leadership and disruptive innovation fields.
               </p>
            </div>
          </div>
        </motion.div>

        {sortedResults.slice(0, 4).map((domain, idx) => {
          const DIcon = domainIcons[domain.key] || Trophy
          const isTop = domain.key === topDomain.key
          const DColor = domainColors[domain.key] || 'from-slate-400 to-slate-600'
          return (
            <motion.div
              key={domain.key}
              {...fadeIn}
              transition={{ ...fadeIn.transition, delay: 0.1 * idx }}
              className={`md:col-span-4 md:row-span-2 rounded-[2.5rem] p-8 border backdrop-blur-2xl shadow-xl dark:shadow-2xl flex flex-col justify-between group transition-all duration-500
                ${isTop 
                  ? 'bg-white/80 dark:bg-white/5 border-primary-500/40 ring-1 ring-primary-500/20' 
                  : 'bg-white/60 dark:bg-white/2 border-slate-200 dark:border-slate-800/50 hover:bg-white/80 dark:hover:bg-white/5 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
            >
              <div className="flex items-center justify-between">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${DColor} flex items-center justify-center text-white shadow-2xl group-hover:rotate-6 transition-transform duration-500`}>
                  <DIcon className="w-8 h-8" />
                </div>
                <div className="flex flex-col items-end">
                  <div className="text-4xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter shadow-sm">
                    {domain.score}%
                  </div>
                  <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500">Domain Weight</div>
                </div>
              </div>
              <div>
                <h4 className="font-black text-slate-900 dark:text-white mb-3 uppercase tracking-tighter text-sm flex items-center gap-2">
                  {domain.name.split(' (')[0]}
                  {isTop && <Sparkles className="w-3 h-3 text-primary-500 dark:text-primary-400" />}
                </h4>
                <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden p-0.5">
                   <motion.div 
                     className={`h-full rounded-full bg-gradient-to-r ${DColor}`}
                     initial={{ width: 0 }}
                     animate={{ width: `${domain.score}%` }}
                     transition={{ duration: 1.5, ease: "circOut" }}
                   />
                </div>
              </div>
            </motion.div>
          )
        })}

        {/* Strategy Advice Banner (Full Width Bottom) */}
        <motion.div 
          {...fadeIn}
          transition={{ ...fadeIn.transition, delay: 0.5 }}
          className="md:col-span-8 md:row-span-1 rounded-[2.5rem] bg-white/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/50 p-8 flex items-center gap-8 shadow-xl dark:shadow-2xl group relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.1),transparent)]" />
          <div className="relative z-10 w-20 h-20 rounded-[1.5rem] bg-primary-100 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20 flex items-center justify-center flex-shrink-0 shadow-inner">
             <TrendingUp className="w-10 h-10 text-primary-600 dark:text-primary-500" />
          </div>
          <div className="relative z-10 flex-grow">
             <div className="flex items-center gap-2 mb-1.5">
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{t('gallup.report.advice')}</h3>
                <div className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] px-2 py-0.5 rounded-md font-black uppercase">Actionable</div>
             </div>
             <p className="text-base text-slate-600 dark:text-slate-400 font-bold leading-relaxed max-w-2xl italic group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">
               "Leverage your {topDomain.name} intensity to anchor high-stakes decision making and complex operational scaling."
             </p>
          </div>
          <button
            onClick={onRetake}
            className="relative z-10 hidden lg:flex items-center gap-3 px-8 py-5 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-black hover:scale-105 active:scale-95 transition-all uppercase text-[10px] tracking-widest whitespace-nowrap"
          >
            <RefreshCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-700" />
            {t('gallup.retakeBtn')}
          </button>
        </motion.div>

      </div>

      <motion.div 
        variants={itemVariants}
        className="mt-12 flex justify-center sm:hidden"
      >
         <button
            onClick={onRetake}
            className="flex items-center gap-4 px-10 py-5 rounded-3xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black shadow-xl"
          >
            <RefreshCcw className="w-5 h-5" />
            {t('gallup.retakeBtn')}
          </button>
      </motion.div>
    </div>
  )
}
