import { useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { motion } from 'framer-motion'
import OfferLogosMarquee from '../components/OfferLogosMarquee'
import HowItWorksShowcase from '../components/HowItWorksShowcase'
import AdvantagesShowcase from '../components/AdvantagesShowcase'
import TechnologyShowcase from '../components/TechnologyShowcase'
import TestimonialsMarquee from '../components/TestimonialsMarquee'
import {
  ArrowRight, Mic, Globe2, Clock,
  Sparkles, Target, Zap, FileText, Star, Lightbulb,
} from 'lucide-react'

import darkInterviewMockup from '../assets/dark_interview_mockup.png'
import darkResumeMockup from '../assets/dark_resume_mockup.png'

const positions = [
  'Werkstudent Software Engineer', 'Praktikum Data Science',
  'Working Student UX Design', 'Praktikum Marketing',
  'Werkstudent Maschinenbau', 'Praktikum Consulting',
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
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

export default function LandingPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const ctaLink = user ? '/setup' : '/login'
  const profileLink = user ? '/profile' : '/login'

  useEffect(() => {
    document.title = t('meta.title')
  }, [t])

  const stats = useMemo(() => [
    { value: t('landing.stats.v1'), label: t('landing.stats.s1') },
    { value: t('offerMarquee.offerCount'), label: t('landing.stats.s2') },
    { value: '50+', label: t('landing.stats.s3') },
    { value: '4.9/5', label: t('landing.stats.s4') },
  ], [t])

  const features = useMemo(() => [
    {
      icon: <Target className="w-5 h-5" />,
      title: t('landing.features.f1t'),
      description: t('landing.features.f1d'),
    },
    {
      icon: <Globe2 className="w-5 h-5" />,
      title: t('landing.features.f2t'),
      description: t('landing.features.f2d'),
    },
    {
      icon: <Mic className="w-5 h-5" />,
      title: t('landing.features.f3t'),
      description: t('landing.features.f3d'),
    },
    {
      icon: <Clock className="w-5 h-5" />,
      title: t('landing.features.f4t'),
      description: t('landing.features.f4d'),
    },
  ], [t])

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-dot-grid opacity-[0.4] dark:opacity-[0.1]" />

        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            {/* Left Content */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={containerVariants}
              className="flex flex-col space-y-12 lg:pr-12 relative z-10"
            >
              <div className="space-y-8">
                <motion.div variants={itemVariants} className="section-badge w-fit bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 backdrop-blur-md">
                  <Sparkles className="w-3.5 h-3.5" />
                  {t('landing.badgePremium')}
                </motion.div>

                <motion.h1
                  variants={itemVariants}
                  className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white leading-[1.2] tracking-tight font-chinese-modern"
                >
                  {t('landing.headline1')}
                  <span className="gradient-text font-black tracking-normal">
                    {t('landing.headline2')}
                  </span>
                </motion.h1>

                <div className="relative">
                  <div className="absolute -left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-transparent opacity-30 hidden sm:block" />
                  <motion.p variants={itemVariants} className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl font-medium font-display pl-0 sm:pl-8">
                    {t('landing.subNextGen')}
                  </motion.p>
                </div>
              </div>

              <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-4">
                <Link
                  to={ctaLink}
                  className="btn-primary text-xl px-12 py-5 w-full sm:w-auto rounded-3xl"
                >
                  {t('landing.ctaPrimary')}
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <a
                  href="#how-it-works"
                  className="btn-secondary text-xl px-12 py-5 w-full sm:w-auto rounded-3xl"
                >
                  {t('landing.ctaSecondary')}
                </a>
              </motion.div>

              <motion.div variants={itemVariants} className="flex flex-wrap gap-3">
                {positions.map((pos) => (
                  <span
                    key={pos}
                    className="px-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-slate-100 dark:border-slate-800"
                  >
                    {pos}
                  </span>
                ))}
              </motion.div>
            </motion.div>

            {/* Right Preview Card (Premium Image) */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
              className="relative hidden lg:flex items-center justify-center group"
            >
              <div className="absolute inset-0 bg-primary-500/20 blur-[160px] rounded-full group-hover:bg-primary-500/30 transition-colors duration-1000" />
              <div className="relative p-2 rounded-[3.5rem] bg-gradient-to-br from-white/10 to-transparent backdrop-blur-3xl border border-white/20 shadow-2xl overflow-hidden scale-100 group-hover:scale-[1.02] transition-transform duration-1000 image-glow-primary">
                <div className="hero-image-overlay" />
                <img
                  src={darkInterviewMockup}
                  alt="AI Interview Premium Interface"
                  className="relative z-10 w-[640px] rounded-[3rem] shadow-2xl border border-slate-800/50"
                />
              </div>

              {/* Floating Performance Indicator */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-6 -right-6 z-20 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl space-y-2 hidden xl:block"
              >
                <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs">
                  <Zap className="w-4 h-4 fill-current" />
                  {t('landing.previewSuccess')}
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">98%</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('landing.previewMatchRate')}</div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      <OfferLogosMarquee />

      <section className="pt-12 pb-24 bg-white dark:bg-slate-950 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="text-center"
              >
                <div className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white mb-2 font-display">{stat.value}</div>
                <div className="text-slate-500 dark:text-slate-500 text-sm font-semibold uppercase tracking-wider">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-32 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <div className="section-badge w-fit">
                <Zap className="w-3.5 h-3.5" />
                {t('landing.featuresBadge')}
              </div>
              <h2 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white leading-tight font-serif">
                {t('landing.featuresTitle')}
              </h2>
              <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed">
                {t('landing.featuresSub')}
              </p>

              <div className="grid sm:grid-cols-2 gap-6">
                {features.map((feature, i) => (
                  <div key={i} className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-white flex items-center justify-center text-white dark:text-slate-900">
                      {feature.icon}
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{feature.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{feature.description}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative group lg:pl-16"
            >
              <div className="absolute inset-0 bg-primary-500/15 rounded-[3rem] blur-[120px] group-hover:bg-primary-500/25 transition-colors duration-1000" />
              <div className="relative p-4 rounded-[4rem] bg-gradient-to-tr from-white/5 to-white/10 backdrop-blur-2xl border border-white/10 shadow-2xl overflow-hidden hover:scale-[1.02] transition-transform duration-1000 image-glow-primary">
                <div className="hero-image-overlay" />
                <img
                  src={darkResumeMockup}
                  alt="Premium Resume Analytics"
                  className="w-full rounded-[3rem] border border-slate-800/50 shadow-2xl"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <HowItWorksShowcase ctaLink={ctaLink} />

      <AdvantagesShowcase />

      <TechnologyShowcase />

      <TestimonialsMarquee />

      <section className="py-32 px-4 bg-slate-900 dark:bg-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-12">
          <h2 className="text-3xl sm:text-5xl font-black text-white dark:text-slate-900 leading-[1.2] font-chinese-modern uppercase">
            {t('landing.ctaEndTitle')}
          </h2>
          <p className="text-xl text-slate-400 dark:text-slate-600 max-w-2xl mx-auto">
            {t('landing.ctaEndSub')}
          </p>
          <Link
            to={ctaLink}
            className="btn-primary bg-white text-slate-900 dark:bg-slate-900 dark:text-white border-0 hover:bg-slate-100 dark:hover:bg-slate-800 text-xl px-12 py-5 rounded-2xl inline-flex items-center gap-3 shadow-2xl"
          >
            {t('landing.ctaEndBtn')}
            <ArrowRight className="w-6 h-6" />
          </Link>
          <div className="text-slate-500 text-sm italic opacity-60">
            {t('landing.ctaEndFoot')}
          </div>
        </div>
      </section>
    </div>
  )
}
