import React from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { 
  Users, Bot, Settings2, Volume2, ShieldCheck, Zap, Video 
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
      icon: <Bot className="w-6 h-6 text-primary-500" />,
      title: t('landing.tech.agentT'),
      description: t('landing.tech.agentD'),
      accent: "bg-primary-500/10"
    },
    {
      icon: <Settings2 className="w-6 h-6 text-purple-500" />,
      title: t('landing.tech.fineTuneT'),
      description: t('landing.tech.fineTuneD'),
      accent: "bg-purple-500/10"
    },
    {
      icon: <Volume2 className="w-6 h-6 text-amber-500" />,
      title: t('landing.tech.voiceT'),
      description: t('landing.tech.voiceD'),
      accent: "bg-amber-500/10"
    },
    {
      icon: <Video className="w-6 h-6 text-orange-500" />,
      title: t('landing.tech.simT'),
      description: t('landing.tech.simD'),
      accent: "bg-orange-500/10"
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-emerald-500" />,
      title: t('landing.tech.privacyT'),
      description: t('landing.tech.privacyD'),
      accent: "bg-emerald-500/10"
    }
  ]

  return (
    <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-12 bg-white dark:bg-slate-950 overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary-500/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-sky-500/5 blur-[120px] rounded-full animate-pulse-slow" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
          className="space-y-16"
        >
          {/* Section Header */}
          <div className="space-y-6 max-w-3xl mx-auto text-center">
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-[0.2em] text-primary-500">
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

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Team Block - Premium Horizontal Banner (Top/Full-Width across 5 columns) */}
            <motion.div
              variants={itemVariants}
              className="lg:col-span-5 p-1 px-1 rounded-[3rem] bg-gradient-to-r from-primary-500/10 via-slate-200/50 to-sky-500/10 dark:from-primary-500/20 dark:via-slate-800/50 dark:to-sky-500/20"
            >
              <div className="h-full w-full bg-white/90 dark:bg-slate-950/90 backdrop-blur-3xl rounded-[2.9rem] p-10 sm:p-14 flex flex-col lg:flex-row items-center gap-12 border border-white dark:border-slate-800 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 blur-[80px] group-hover:bg-primary-500/10 transition-colors" />
                
                <div className="relative shrink-0">
                  <div className="w-20 h-20 rounded-3xl bg-slate-900 dark:bg-white flex items-center justify-center text-white dark:text-slate-900 shadow-2xl rotate-3 group-hover:rotate-0 transition-transform duration-500">
                    <Users className="w-10 h-10" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary-500 border-4 border-white dark:border-slate-950 flex items-center justify-center">
                    <Zap className="w-3 h-3 text-white" />
                  </div>
                </div>

                <div className="space-y-6 flex-1 text-center lg:text-left">
                  <h3 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-serif tracking-tight">
                    {t('landing.tech.teamT')}
                  </h3>
                  <div className="w-24 h-1 bg-primary-500/20 rounded-full mx-auto lg:mx-0" />
                  <p className="text-xl text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    {t('landing.tech.teamD')}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* 5 Feature Cards - Fixed 1-Line Grid on LG */}
            {techFeatures.map((feature, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="group relative p-8 rounded-[2.5rem] bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 hover:border-primary-500/30 hover:shadow-2xl hover:shadow-primary-500/5 transition-all duration-700 flex flex-col h-full"
              >
                <div className={`w-14 h-14 rounded-2xl ${feature.accent} flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500`}>
                  {feature.icon}
                </div>
                
                <div className="space-y-4 flex-1">
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                    {feature.title}
                  </h4>
                  <p className="text-sm text-slate-400 dark:text-slate-500 leading-relaxed font-medium">
                    {feature.description}
                  </p>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-50 dark:border-slate-800/50 flex justify-end">
                   <div className="w-6 h-1 rounded-full bg-slate-200 dark:bg-slate-800 group-hover:w-12 group-hover:bg-primary-500 transition-all duration-500" />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

