import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  BrainCircuit, Mic, Briefcase, Globe2,
  ArrowRight, Sparkles, Target, Zap
} from 'lucide-react'

// Use the generated image path
import mockupImg from '../assets/dark_interview_mockup.png'

const MAIN_BULLET_KEYS = ['howMainB1', 'howMainB2', 'howMainB3', 'howMainB4']

export default function HowItWorksShowcase({ ctaLink }) {
  const { t } = useTranslation()

  return (
    <section id="how-it-works" className="py-32 bg-slate-50 dark:bg-slate-900 px-4 sm:px-6 lg:px-8 border-y border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-24 max-w-4xl mx-auto space-y-8">
          <motion.h2
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="text-5xl sm:text-7xl font-black text-slate-900 dark:text-white font-serif tracking-tight"
          >
            {t('landing.howTitle')}
            <span className="block h-1 w-20 bg-primary-600 dark:bg-primary-400 mx-auto mt-6 rounded-full" />
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl sm:text-2xl text-slate-500 dark:text-slate-400 leading-relaxed font-medium"
          >
            {t('landing.howSub')}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Link to={ctaLink} className="btn-primary-dark inline-flex px-12 py-4 text-xl rounded-2xl shadow-xl">
              {t('landing.howCta')}
            </Link>
          </motion.div>
        </header>

        {/* Main Interface Demo Card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative bg-white dark:bg-slate-950 rounded-[4rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden mb-24"
        >
          <div className="grid lg:grid-cols-2 items-center">
            {/* Left side bullets */}
            <div className="p-12 sm:p-24 lg:p-28 space-y-16">
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white font-chinese-modern leading-[1.1] tracking-tight">
                {t('landing.howMainTitle')}
              </h3>
              <div className="space-y-10">
                {MAIN_BULLET_KEYS.map((key) => (
                  <div key={key} className="flex gap-6 items-start group">
                    <div className="mt-2.5 w-2.5 h-2.5 rounded-full bg-primary-600 shadow-[0_0_15px_rgba(79,70,229,0.6)] flex-shrink-0 group-hover:scale-125 transition-transform duration-500" />
                    <p className="text-xl text-slate-600 dark:text-slate-300 leading-relaxed font-medium transition-colors group-hover:text-slate-900 dark:group-hover:text-white">
                      {t(`landing.${key}`)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative h-full lg:min-h-[600px] bg-slate-900 overflow-hidden flex items-center justify-center p-8 sm:p-12">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-violet-500/20 blur-3xl opacity-50" />
              <img
                src={mockupImg}
                alt="AI Interview Session"
                className="relative z-10 w-full max-w-[640px] rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 hover:scale-[1.02] transition-transform duration-700"
              />
            </div>
          </div>
        </motion.div>

        {/* 4 Feature Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { key: 'howV1', icon: <Briefcase /> },
            { key: 'howV2', icon: <Zap /> },
            { key: 'howV3', icon: <Globe2 /> },
            { key: 'howV4', icon: <Mic /> }
          ].map((item, i) => (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group p-8 bg-white dark:bg-slate-950 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 transition-all hover:-translate-y-2 hover:shadow-xl space-y-8"
            >
              <div className="w-16 h-16 rounded-[1.25rem] bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 group-hover:scale-110 transition-all">
                {item.icon}
              </div>
              <div className="space-y-4">
                <h4 className="text-xl font-black text-slate-900 dark:text-white leading-tight">{t(`landing.${item.key}Title`)}</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-bold italic">{t(`landing.${item.key}Desc`)}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

