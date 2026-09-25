import { useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { motion } from 'framer-motion'
import OfferLogosMarquee from '../components/OfferLogosMarquee'
import HowItWorksShowcase from '../components/HowItWorksShowcase'
import AdvantagesShowcase from '../components/AdvantagesShowcase'
import TechnologyShowcase from '../components/TechnologyShowcase'
import TestimonialsMarquee from '../components/TestimonialsMarquee'
import InterviewPreview from '../components/brand/InterviewPreview'
import { BrandButton } from '../components/brand/BrandKit'
import { Mic, Globe2, Clock, Target } from 'lucide-react'

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
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { y: 18, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.7,
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
      icon: <Target className="h-[18px] w-[18px]" />,
      title: t('landing.features.f1t'),
      description: t('landing.features.f1d'),
    },
    {
      icon: <Globe2 className="h-[18px] w-[18px]" />,
      title: t('landing.features.f2t'),
      description: t('landing.features.f2d'),
    },
    {
      icon: <Mic className="h-[18px] w-[18px]" />,
      title: t('landing.features.f3t'),
      description: t('landing.features.f3d'),
    },
    {
      icon: <Clock className="h-[18px] w-[18px]" />,
      title: t('landing.features.f4t'),
      description: t('landing.features.f4d'),
    },
  ], [t])

  return (
    <div className="theme-quiet bg-brand-paper">

      {/* ───────────────── Hero ───────────────── */}
      <section className="relative overflow-hidden pt-[calc(var(--ui-nav-h)+5.5rem)] pb-20">
        <div className="ui-container relative z-10">
          <div className="relative grid items-center gap-14 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-16">
            <motion.div initial="hidden" animate="visible" variants={containerVariants}>
              <motion.h1
                variants={itemVariants}
                className="font-brand text-[42px] font-black leading-[1.08] tracking-tight text-brand-ink sm:text-[56px] lg:text-[64px]"
              >
                {t('landing.headline1')}
                {t('landing.headline2')}
              </motion.h1>

              <motion.p
                variants={itemVariants}
                className="mt-6 max-w-xl text-[16px] leading-relaxed text-brand-muted sm:text-[17px]"
              >
                {t('landing.subNextGen')}
              </motion.p>

              <motion.div variants={itemVariants} className="mt-9 flex flex-wrap items-center gap-4">
                <BrandButton to={ctaLink} variant="ink" size="lg">
                  {t('landing.ctaPrimary')}
                </BrandButton>
                <BrandButton as="a" href="#how-it-works" variant="outline" size="lg">
                  {t('landing.ctaSecondary')}
                </BrandButton>
              </motion.div>

              <motion.div variants={itemVariants} className="mt-9 flex flex-wrap gap-2">
                {positions.map((pos) => (
                  <span
                    key={pos}
                    className="rounded-full border border-brand-line bg-brand-card/70 px-3 py-1.5 text-[11px] font-medium text-brand-muted"
                  >
                    {pos}
                  </span>
                ))}
              </motion.div>
            </motion.div>

            {/* 主视觉：原生搭建的面试界面浮窗 */}
            <motion.div
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <InterviewPreview />
            </motion.div>
          </div>

          {/* 底部能力条：图标 + 标题 + 描述，用竖线分隔 */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-20 border-t border-brand-line pt-10"
          >
            <div className="mb-12 flex flex-col items-center gap-4 text-center">
              <h2 className="font-brand text-[26px] font-black leading-tight tracking-tight text-brand-ink sm:text-[32px]">
                {t('landing.featuresTitle')}
              </h2>
              <p className="max-w-2xl text-[15px] leading-relaxed text-brand-ink">
                {t('landing.featuresSub')}
              </p>
            </div>

            <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-brand-line">
              {features.map((feature, i) => (
                <div key={i} className={i > 0 ? 'lg:pl-10' : ''}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-ink text-brand-on-ink">
                    {feature.icon}
                  </div>
                  <h3 className="mt-4 text-[15px] font-bold text-brand-ink">{feature.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-brand-muted">{feature.description}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <OfferLogosMarquee />

      <HowItWorksShowcase ctaLink={ctaLink} />

      <AdvantagesShowcase />

      <TechnologyShowcase />

      <TestimonialsMarquee />

      {/* ───────────────── 收尾 CTA ───────────────── */}
      <section className="bg-brand-paper pb-24 pt-8">
        <div className="ui-container">
          <div className="px-6 py-20 text-center sm:px-16">
            <div className="mx-auto max-w-3xl space-y-8">
              <h2 className="font-brand text-[32px] font-black leading-[1.14] tracking-tight text-brand-ink sm:text-[46px]">
                {t('landing.ctaEndTitle')}
              </h2>
              <p className="mx-auto max-w-2xl text-[16px] leading-relaxed text-brand-ink sm:text-[17px]">
                {t('landing.ctaEndSub')}
              </p>
              <div className="flex justify-center pt-2">
                <BrandButton to={ctaLink} variant="lime" size="lg">
                  {t('landing.ctaEndBtn')}
                </BrandButton>
              </div>
              <p className="text-[13px] italic text-brand-muted">
                {t('landing.ctaEndFoot')}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
