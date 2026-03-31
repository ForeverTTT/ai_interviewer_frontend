import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  Briefcase, Globe2,
  ArrowRight, Sparkles, Zap, Mic
} from 'lucide-react'

// Use the generated image path
import mockupImg from '../assets/interview_interface_mockup.png'

const MAIN_BULLET_KEYS = ['howMainB1', 'howMainB2', 'howMainB3', 'howMainB4']

export default function HowItWorksShowcase({ ctaLink }) {
  const { t } = useTranslation()

  return (
    <section id="how-it-works" className="pt-32 pb-16 bg-slate-50 dark:bg-slate-950 px-4 sm:px-6 lg:px-8 border-y border-slate-200 dark:border-slate-900">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-20 max-w-4xl mx-auto space-y-6">
          <motion.h2
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white font-serif tracking-tight"
          >
            {t('landing.howTitle')}
            <span className="block h-1 w-16 bg-primary-600 dark:bg-primary-400 mx-auto mt-6 rounded-full" />
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 leading-relaxed font-medium"
          >
            {t('landing.howSub')}
          </motion.p>
        </header>

        {/* Main Interface Demo Card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden mb-24 max-w-5xl mx-auto"
        >
          <div className="grid lg:grid-cols-2 items-center">
            {/* Left side bullets */}
            <div className="p-10 sm:p-16 lg:p-20 space-y-12">
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight tracking-tight">
                {t('landing.howMainTitle')}
              </h3>
              <div className="space-y-8">
                {MAIN_BULLET_KEYS.map((key) => (
                  <div key={key} className="flex gap-4 items-start group">
                    <div className="mt-1.5 w-2 h-2 rounded-full bg-primary-600 shadow-[0_0_10px_rgba(79,70,229,0.4)] flex-shrink-0 group-hover:scale-125 transition-transform duration-500" />
                    <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-medium transition-colors group-hover:text-slate-900 dark:group-hover:text-white">
                      {t(`landing.${key}`)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative h-full lg:min-h-[700px] bg-sky-50/50 dark:bg-sky-950/20 overflow-hidden flex items-center justify-start p-0 pl-1">
              <img
                src={mockupImg}
                alt="AI Interview Session"
                className="relative z-10 w-full h-full object-contain hover:scale-[1.05] transition-transform duration-1000"
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
