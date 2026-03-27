import React from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { 
  Users, Bot, Settings2, Volume2, ShieldCheck, Zap 
} from 'lucide-react'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1],
    },
  },
}

export default function TechnologyShowcase() {
  const { t } = useTranslation()

  const techFeatures = [
    {
      icon: <Bot className="w-6 h-6" />,
      title: t('landing.tech.agentT'),
      description: t('landing.tech.agentD'),
      className: "md:col-span-1 md:row-span-1",
      gradient: "from-blue-500/10 to-transparent"
    },
    {
      icon: <Settings2 className="w-6 h-6" />,
      title: t('landing.tech.fineTuneT'),
      description: t('landing.tech.fineTuneD'),
      className: "md:col-span-1 md:row-span-1",
      gradient: "from-purple-500/10 to-transparent"
    },
    {
      icon: <Volume2 className="w-6 h-6" />,
      title: t('landing.tech.voiceT'),
      description: t('landing.tech.voiceD'),
      className: "md:col-span-1 md:row-span-1",
      gradient: "from-amber-500/10 to-transparent"
    },
    {
      icon: <ShieldCheck className="w-6 h-6" />,
      title: t('landing.tech.privacyT'),
      description: t('landing.tech.privacyD'),
      className: "md:col-span-1 md:row-span-1",
      gradient: "from-emerald-500/10 to-transparent"
    }
  ]

  return (
    <section className="relative py-32 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-950 overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 -left-24 w-96 h-96 bg-indigo-500/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-1/4 -right-24 w-96 h-96 bg-primary-500/5 blur-[120px] rounded-full" />

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
          className="space-y-20"
        >
          {/* Header */}
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <motion.div variants={itemVariants} className="section-badge mx-auto">
              <Zap className="w-3.5 h-3.5" />
              {t('landing.tech.badge')}
            </motion.div>
            <motion.h2 
              variants={itemVariants}
              className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white leading-tight font-serif tracking-tight"
            >
              {t('landing.tech.title')}
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Team Block - Large Highlight with Premium Border */}
            <motion.div
              variants={itemVariants}
              className="lg:col-span-12 p-8 sm:p-12 rounded-[2.5rem] bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 relative overflow-hidden group shadow-2xl transition-all duration-500 backdrop-blur-xl"
            >
              {/* Premium Gradient Border Effect */}
              <div className="absolute inset-0 p-[1px] rounded-[2.5rem] bg-gradient-to-br from-indigo-500/20 via-slate-200/30 to-primary-500/20 dark:from-indigo-400/20 dark:via-slate-800/30 dark:to-primary-400/20 -z-10" />
              <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-white/90 to-slate-50/90 dark:from-slate-900/90 dark:to-slate-950/90 -z-10" />
              
              {/* Inner Glow/Shadow for Depth */}
              <div className="absolute inset-0 rounded-[2.5rem] shadow-[inset_0_0_80px_rgba(79,70,229,0.05)] pointer-events-none" />

              <div className="relative flex flex-col lg:flex-row gap-10 items-center z-10">
                <div className="relative">
                  <div className="absolute inset-0 bg-indigo-600 blur-xl opacity-20 animate-pulse" />
                  <div className="relative w-16 h-16 shrink-0 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-2xl shadow-indigo-500/40">
                    <Users className="w-8 h-8" />
                  </div>
                </div>
                <div className="space-y-6 flex-1 text-center lg:text-left">
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                    {t('landing.tech.teamT')}
                  </h3>
                  <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed font-medium italic sm:not-italic">
                    {t('landing.tech.teamD')}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Other Tech Bento Cards */}
            {techFeatures.map((feature, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="lg:col-span-6 p-8 rounded-[2rem] bg-white/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden backdrop-blur-md group relative"
              >
                {/* Accent Gradient Glow */}
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${feature.gradient} blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
                <div className={`absolute -inset-[1px] rounded-[2rem] bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-700 -z-10`} />

                <div className="relative space-y-6 z-10">
                  <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center text-slate-900 dark:text-white group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                    {feature.icon}
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-xl font-black text-slate-900 dark:text-white">
                      {feature.title}
                    </h4>
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
