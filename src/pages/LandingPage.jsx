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
import darkResumeMockup from '../assets/resume_mockup_sage.png'
import heroBg from '../assets/background.jpg'

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
      <section className="relative min-h-[100vh] flex flex-col justify-end overflow-hidden">
        {/* Full-bleed background illustration */}
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover object-center" />
          {/* Gradient overlays for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#e8e4dd]/95 via-[#e8e4dd]/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-transparent to-transparent h-32" />
        </div>


        {/* Center content overlay */}
        <div className="relative z-10 max-w-5xl mx-auto text-center px-6 pb-16 pt-48">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="space-y-8"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-[11px] font-semibold tracking-wider bg-white/60 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 backdrop-blur-xl border border-white/40 shadow-sm">
              {t('landing.badgePremium')}
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.1] tracking-tight font-serif"
            >
              {t('landing.headline1')}
              {t('landing.headline2')}
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-base sm:text-lg text-slate-500 leading-relaxed max-w-2xl mx-auto font-medium"
            >
              {t('landing.subNextGen')}
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                to={ctaLink}
                className="inline-flex items-center justify-center gap-3 text-base px-10 py-4 w-full sm:w-auto rounded-full font-bold text-white bg-slate-800 hover:bg-slate-900 transition-all shadow-xl hover:-translate-y-0.5 active:scale-[0.97]"
              >
                {t('landing.ctaPrimary')}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 text-base px-10 py-4 w-full sm:w-auto rounded-full font-bold text-slate-600 bg-white/50 backdrop-blur-xl border border-slate-200/80 hover:bg-white/80 transition-all shadow-sm"
              >
                {t('landing.ctaSecondary')}
              </a>
            </motion.div>

            <motion.div variants={itemVariants} className="flex flex-nowrap justify-center gap-2 pt-4 overflow-x-auto">
              {positions.map((pos) => (
                <span
                  key={pos}
                  className="px-3 py-1 bg-white/40 text-slate-500 text-[9px] font-medium tracking-wider rounded-full border border-slate-200/40 backdrop-blur-md whitespace-nowrap shrink-0"
                >
                  {pos}
                </span>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      <OfferLogosMarquee />

      <section className="relative py-32 px-4 sm:px-6 lg:px-8 bg-[#e3ebe5] dark:bg-slate-900 border-y border-[#cdd8cf] dark:border-slate-800">
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
                  <div key={i} className="p-6 bg-[#f2f7f3] dark:bg-slate-800 rounded-2xl border border-[#cdd8cf] dark:border-slate-700 shadow-sm space-y-3">
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
            >
              <img
                src={darkResumeMockup}
                alt="Premium Resume Analytics"
                className="w-full max-w-[640px] mx-auto rounded-2xl shadow-lg"
              />
            </motion.div>
          </div>
        </div>
      </section>

      <HowItWorksShowcase ctaLink={ctaLink} />

      <AdvantagesShowcase />

      <TechnologyShowcase />

      <TestimonialsMarquee />

      <section className="py-32 px-4 bg-[#f3eef9] dark:bg-slate-950 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-12">
          <h2 className="text-3xl sm:text-5xl font-black text-slate-800 dark:text-white leading-[1.2] font-serif">
            {t('landing.ctaEndTitle')}
          </h2>
          <p className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            {t('landing.ctaEndSub')}
          </p>
          <Link
            to={ctaLink}
            className="btn-primary text-xl px-12 py-5 rounded-2xl inline-flex items-center gap-3"
          >
            {t('landing.ctaEndBtn')}
            <ArrowRight className="w-6 h-6" />
          </Link>
          <div className="text-slate-400 text-sm italic opacity-60">
            {t('landing.ctaEndFoot')}
          </div>
        </div>
      </section>
    </div>
  )
}
