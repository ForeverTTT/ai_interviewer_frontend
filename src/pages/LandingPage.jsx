import { useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import HarborHero from '../components/landing/HarborHero'
import OfferLogosMarquee from '../components/OfferLogosMarquee'
import HowItWorksShowcase from '../components/HowItWorksShowcase'
import AdvantagesShowcase from '../components/AdvantagesShowcase'
import TechnologyShowcase from '../components/TechnologyShowcase'
import TestimonialsMarquee from '../components/TestimonialsMarquee'
import ClosingCta from '../components/landing/ClosingCta'
import { Reveal, TiltCard } from '../components/brand/BrandKit'
import { Mic, Globe2, Clock, Target } from 'lucide-react'

/* 四个能力点轮流使用插画里的四种墙面颜色 */
const TONES = [
  'bg-brand-harbor/[0.12] text-brand-harbor',
  'bg-brand-sage/[0.18] text-brand-success',
  'bg-brand-ochre/[0.2] text-[#8A5F10] dark:text-brand-ochre',
  'bg-brand-brick/[0.13] text-brand-brick',
]

export default function LandingPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const ctaLink = user ? '/setup' : '/login'

  useEffect(() => {
    document.title = t('meta.title')
  }, [t])

  const features = useMemo(() => [
    { icon: Target, title: t('landing.features.f1t'), description: t('landing.features.f1d') },
    { icon: Globe2, title: t('landing.features.f2t'), description: t('landing.features.f2d') },
    { icon: Mic, title: t('landing.features.f3t'), description: t('landing.features.f3d') },
    { icon: Clock, title: t('landing.features.f4t'), description: t('landing.features.f4d') },
  ], [t])

  return (
    <div className="theme-quiet">

      <HarborHero ctaLink={ctaLink} />

      {/* ───────────────── 能力条 ───────────────── */}
      <section className="relative pb-10 pt-16 lg:pt-6">
        <div className="ui-container">
          <Reveal className="mb-12 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-end lg:gap-16">
            <div>
              <span className="lk-eyebrow">{t('landing.featuresBadge')}</span>
              <h2 className="lk-display mt-4 text-[32px] leading-[1.12] sm:text-[42px]">
                {t('landing.featuresTitle')}
              </h2>
            </div>
            <p className="text-[15px] leading-relaxed text-brand-muted sm:text-[16px]">
              {t('landing.featuresSub')}
            </p>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, i) => {
              const Icon = feature.icon
              return (
                <Reveal key={feature.title} delay={i * 0.07} className="h-full">
                  <TiltCard className="brand-float flex h-full flex-col p-6 transition-shadow duration-300 hover:shadow-lift">
                    <div className="flex items-center justify-between">
                      <span className={`grid h-11 w-11 place-items-center rounded-2xl ${TONES[i % TONES.length]}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="font-display text-[13px] font-semibold tabular-nums text-brand-muted/70">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <h3 className="mt-6 text-[16px] font-semibold text-brand-ink">{feature.title}</h3>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-brand-muted">{feature.description}</p>
                  </TiltCard>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      <OfferLogosMarquee />

      <HowItWorksShowcase ctaLink={ctaLink} />

      <AdvantagesShowcase />

      <TechnologyShowcase />

      <TestimonialsMarquee />

      <ClosingCta ctaLink={ctaLink} />
    </div>
  )
}
