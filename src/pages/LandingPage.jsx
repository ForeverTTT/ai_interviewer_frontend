import { useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import OfferLogosMarquee from '../components/OfferLogosMarquee'
import HowItWorksShowcase from '../components/HowItWorksShowcase'
import {
  ArrowRight, Mic, Globe2, Clock,
  Sparkles, Target, Zap, FileText, Star, Lightbulb,
} from 'lucide-react'

const positions = [
  'Werkstudent Software Engineer', 'Praktikum Data Science',
  'Working Student UX Design', 'Praktikum Marketing',
  'Werkstudent Maschinenbau', 'Praktikum Consulting',
]

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
      icon: <Target className="w-6 h-6" />,
      title: t('landing.features.f1t'),
      description: t('landing.features.f1d'),
      color: 'from-blue-500 to-primary-600',
      bg: 'bg-blue-50 dark:bg-blue-950/35',
    },
    {
      icon: <Globe2 className="w-6 h-6" />,
      title: t('landing.features.f2t'),
      description: t('landing.features.f2d'),
      color: 'from-emerald-500 to-teal-600',
      bg: 'bg-emerald-50 dark:bg-emerald-950/35',
    },
    {
      icon: <Mic className="w-6 h-6" />,
      title: t('landing.features.f3t'),
      description: t('landing.features.f3d'),
      color: 'from-violet-500 to-purple-600',
      bg: 'bg-violet-50 dark:bg-violet-950/35',
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: t('landing.features.f4t'),
      description: t('landing.features.f4d'),
      color: 'from-orange-500 to-amber-600',
      bg: 'bg-orange-50 dark:bg-orange-950/30',
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: t('landing.features.f5t'),
      description: t('landing.features.f5d'),
      color: 'from-sky-500 to-cyan-600',
      bg: 'bg-sky-50 dark:bg-sky-950/35',
      profileLink: true,
    },
  ], [t])

  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-slate-950">
      <section className="relative pt-20 sm:pt-24 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-mesh-light dark:opacity-[0.12]" />
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-[-10%] right-[-5%] w-[min(720px,90vw)] h-[min(720px,90vw)] bg-gradient-to-bl from-primary-100/70 via-violet-100/45 to-transparent rounded-full blur-3xl dark:from-primary-900/25 dark:via-violet-900/15 dark:to-transparent" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[min(520px,85vw)] h-[min(520px,85vw)] bg-gradient-to-tr from-emerald-100/55 via-transparent to-transparent rounded-full blur-3xl dark:from-emerald-900/15 dark:via-transparent dark:to-transparent" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(241,245,249,0.5)_1px,transparent_1px),linear-gradient(to_bottom,rgba(241,245,249,0.5)_1px,transparent_1px)] bg-[size:56px_56px] dark:bg-[linear-gradient(to_right,rgba(148,163,184,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.07)_1px,transparent_1px)]" />
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-12 xl:gap-16 items-center lg:items-start">
            <div className="text-center lg:text-left max-w-4xl mx-auto lg:mx-0 lg:max-w-none">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50/90 text-primary-700 rounded-full text-sm font-semibold border border-primary-200/80 mb-7 animate-fade-in shadow-soft backdrop-blur-sm dark:bg-primary-900/40 dark:text-primary-100 dark:border-primary-700/50">
                <Sparkles className="w-4 h-4 text-primary-500 dark:text-primary-300" />
                {t('landing.badge')}
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-6xl xl:text-7xl font-black text-slate-900 dark:text-slate-100 leading-[1.08] tracking-tight mb-7 animate-slide-up text-balance max-w-4xl mx-auto lg:mx-0">
                {t('landing.headline1')}
                <br />
                <span className="gradient-text">{t('landing.headline2')}</span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto lg:mx-0 mb-10 font-medium">
                {t('landing.sub')}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4 mb-12">
                <Link
                  to={ctaLink}
                  className="btn-primary text-base px-8 py-4 rounded-2xl w-full sm:w-auto justify-center"
                >
                  {t('landing.ctaPrimary')}
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <a
                  href="#how-it-works"
                  className="btn-secondary text-base px-8 py-4 rounded-2xl w-full sm:w-auto justify-center"
                >
                  {t('landing.ctaSecondary')}
                </a>
              </div>

              <div className="flex flex-wrap justify-center lg:justify-start gap-2 max-w-3xl mx-auto lg:mx-0">
                {positions.map((pos) => (
                  <span
                    key={pos}
                    className="px-3.5 py-1.5 bg-white/90 text-slate-600 text-xs font-medium rounded-full border border-slate-200/90 shadow-soft ring-1 ring-slate-900/[0.02] backdrop-blur-sm dark:bg-slate-800/90 dark:text-slate-300 dark:border-slate-600 dark:ring-white/[0.04]"
                  >
                    {pos}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-14 lg:mt-0 w-full max-w-md mx-auto lg:max-w-none lg:mx-0 flex flex-col gap-5 sm:gap-6">
              <div className="relative rounded-[1.35rem] p-[1px] bg-gradient-to-br from-slate-200 via-primary-100/40 to-amber-200/55 shadow-card dark:from-slate-700 dark:via-slate-800 dark:to-amber-900/25">
                <div
                  className="relative bg-white dark:bg-slate-900 rounded-[1.3rem] overflow-hidden ring-1 ring-slate-900/[0.04] dark:ring-slate-700"
                  role="img"
                  aria-label={`${t('landing.previewTitle')} · ${t('landing.coachPreviewAria')}`}
                >
                  <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100/90 bg-gradient-to-b from-slate-50 to-slate-50/80 dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-[#FF5F57] shadow-inner ring-1 ring-black/5" />
                      <div className="w-3 h-3 rounded-full bg-[#FEBC2E] shadow-inner ring-1 ring-black/5" />
                      <div className="w-3 h-3 rounded-full bg-[#28C840] shadow-inner ring-1 ring-black/5" />
                    </div>
                    <div className="flex-1 text-center">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold tracking-wide">{t('landing.previewTitle')}</span>
                    </div>
                  </div>

                  <div className="p-6 sm:p-7 space-y-4 bg-gradient-to-b from-slate-50/90 via-white to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-violet-600 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-soft ring-2 ring-white">
                        AI
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-soft border border-slate-100/90 dark:border-slate-600 max-w-sm ring-1 ring-slate-900/[0.02] dark:ring-white/[0.04]">
                        <p className="text-sm text-slate-700 dark:text-slate-200">
                          Guten Tag! Ich bin Frau Müller aus der Personalabteilung. Können Sie sich kurz vorstellen und uns erklären, warum Sie sich für diese Werkstudentenstelle beworben haben?
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3 justify-end">
                      <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl rounded-tr-sm px-4 py-3 max-w-sm shadow-soft border border-primary-700/20">
                        <p className="text-sm text-white">
                          Guten Tag, Frau Müller! Mein Name ist… Ich studiere im 4. Semester Informatik an der TU München und interessiere mich sehr für…
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center text-slate-600 dark:text-slate-200 text-xs font-bold ring-1 ring-slate-200/80 dark:ring-slate-600">
                        {t('landing.you')}
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-violet-600 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-soft ring-2 ring-white">
                        AI
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-soft border border-slate-100/90 dark:border-slate-600 max-w-sm ring-1 ring-slate-900/[0.02] dark:ring-white/[0.04]">
                        <p className="text-sm text-slate-700 dark:text-slate-200">
                          Sehr gut! Können Sie mir ein Beispiel nennen, wo Sie in einem Team eine technische Herausforderung gelöst haben?
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 ring-1 ring-slate-200/80 dark:ring-slate-600 flex-shrink-0" />
                      <div className="bg-white dark:bg-slate-800 rounded-2xl px-4 py-3 shadow-soft border border-slate-100/90 dark:border-slate-600 flex items-center gap-1 ring-1 ring-slate-900/[0.02] dark:ring-white/[0.04]">
                        <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200/90 dark:border-slate-700/90">
                    <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100/90 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/80">
                      <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" strokeWidth={2.25} aria-hidden />
                      <span className="text-xs text-slate-600 dark:text-slate-300 font-bold tracking-wide">{t('landing.heroStackCoachTitle')}</span>
                    </div>
                    <div className="p-5 sm:p-6 space-y-4 bg-gradient-to-b from-slate-50/80 to-white dark:from-slate-900 dark:to-slate-950">
                      <div className="grid grid-cols-5 gap-2">
                        {[
                          { k: 'landing.heroStackScore1t', v: '7', c: 'from-primary-500 to-violet-600' },
                          { k: 'landing.heroStackScore2t', v: '8', c: 'from-emerald-500 to-teal-600' },
                          { k: 'landing.heroStackScore3t', v: '6', c: 'from-amber-500 to-orange-600' },
                          { k: 'landing.heroStackScore4t', v: '7', c: 'from-sky-500 to-cyan-600' },
                          { k: 'landing.heroStackScore5t', v: '6', c: 'from-slate-500 to-slate-700' },
                        ].map((cell) => (
                          <div
                            key={cell.k}
                            className="rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-600 py-2 px-1 text-center shadow-soft"
                          >
                            <div className={`text-base sm:text-lg font-black tabular-nums bg-gradient-to-br ${cell.c} bg-clip-text text-transparent`}>
                              {cell.v}
                            </div>
                            <div className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                              {t(cell.k)}
                            </div>
                          </div>
                        ))}
                      </div>
                      <ul className="space-y-2.5 text-sm text-slate-700 dark:text-slate-200">
                        <li className="flex gap-2">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" aria-hidden />
                          <span>{t('landing.heroStackBullet1')}</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" aria-hidden />
                          <span>{t('landing.heroStackBullet2')}</span>
                        </li>
                      </ul>
                      <Link
                        to={profileLink}
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 transition-colors"
                      >
                        {t('landing.coachCtaShort')}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            className="relative mt-12 lg:mt-14 overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/50 shadow-card ring-1 ring-slate-900/[0.04] dark:border-slate-700 dark:from-amber-950/30 dark:via-slate-900 dark:to-orange-950/20 dark:ring-white/[0.06]"
            aria-label={t('landing.coachBannerTitle')}
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent dark:via-amber-500/25"
              aria-hidden
            />
            <div className="relative flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
              <div className="flex min-w-0 flex-1 gap-4 sm:gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25 ring-2 ring-white dark:ring-slate-900 sm:h-16 sm:w-16">
                  <Lightbulb className="h-7 w-7 text-white sm:h-8 sm:w-8" strokeWidth={2.25} aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 sm:text-xs">
                    {t('landing.coachBannerKicker')}
                  </span>
                  <h2 className="mt-1 text-balance text-xl font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl lg:text-[1.65rem] lg:leading-snug">
                    {t('landing.coachBannerTitle')}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base lg:max-w-4xl">
                    {t('landing.coachBannerSub')}
                  </p>
                </div>
              </div>
              <Link
                to={profileLink}
                className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-8 py-3.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 lg:min-w-[12rem]"
              >
                {t('landing.coachCta')}
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <OfferLogosMarquee />

      <section className="relative py-20 bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_80%_at_50%_100%,rgba(37,99,235,0.15),transparent)] pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.35] bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" aria-hidden />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center py-4 px-3 rounded-2xl bg-white/[0.05] ring-1 ring-white/[0.08] backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.07] hover:ring-primary-400/25 hover:shadow-[0_0_24px_-4px_rgba(59,130,246,0.25)]">
                <div className="text-3xl sm:text-4xl font-black text-white mb-1.5 tracking-tight tabular-nums">{stat.value}</div>
                <div className="text-slate-300 text-xs sm:text-sm font-medium leading-snug">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-b from-white via-slate-50/40 to-white dark:bg-none dark:bg-slate-950">
        <div className="pointer-events-none absolute right-0 top-1/3 h-[min(420px,50vw)] w-[min(420px,50vw)] rounded-full bg-gradient-to-bl from-primary-100/25 to-transparent blur-3xl dark:from-primary-600/10 dark:to-transparent" aria-hidden />
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <div className="section-badge mb-5">
              <Zap className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
              {t('landing.featuresBadge')}
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-slate-100 mb-3 tracking-tight">
              {t('landing.featuresTitle')}
            </h2>
            <div className="title-accent-bar mb-5" aria-hidden />
            <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
              {t('landing.featuresSub')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {features.map((feature, i) => (
              <div
                key={i}
                className="group card-feature p-8 lg:p-9"
              >
                <div className={`relative w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center mb-6 ring-1 ring-slate-900/[0.05] dark:ring-white/10 shadow-soft transition-all duration-300 group-hover:shadow-md group-hover:ring-primary-200/50 dark:group-hover:ring-primary-500/30 group-hover:scale-[1.02]`}>
                  <span className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-[0.12] transition-opacity duration-300`} aria-hidden />
                  <span className={`relative inline-flex text-slate-700 dark:text-slate-200 [&>svg]:stroke-[1.75] group-hover:scale-105 transition-transform duration-300`}>
                    {feature.icon}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-3 tracking-tight">{feature.title}</h3>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[15px]">{feature.description}</p>
                {feature.profileLink ? (
                  <Link
                    to={profileLink}
                    className="inline-flex items-center gap-1.5 mt-5 text-sm font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                  >
                    {t('landing.coachCtaShort')}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <HowItWorksShowcase ctaLink={ctaLink} />

      <section className="relative py-24 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-900/50 border-y border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14 max-w-3xl mx-auto">
            <div className="section-badge mb-5 justify-center">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400/90" />
              {t('landing.testimonialsBadge')}
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-slate-100 mb-3 tracking-tight">
              {t('landing.testimonialsTitle')}
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
              {t('landing.testimonialsSub')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {[
              {
                body: 'landing.testimonial1Body',
                author: 'landing.testimonial1Author',
                meta: 'landing.testimonial1Meta',
                initial: 'landing.testimonial1Initial',
              },
              {
                body: 'landing.testimonial2Body',
                author: 'landing.testimonial2Author',
                meta: 'landing.testimonial2Meta',
                initial: 'landing.testimonial2Initial',
              },
              {
                body: 'landing.testimonial3Body',
                author: 'landing.testimonial3Author',
                meta: 'landing.testimonial3Meta',
                initial: 'landing.testimonial3Initial',
              },
            ].map((item, idx) => (
              <article
                key={idx}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 p-6 lg:p-7 shadow-soft ring-1 ring-slate-900/[0.02] dark:ring-white/[0.04] flex flex-col"
              >
                <div className="flex gap-0.5 mb-4" aria-label={t('landing.testimonialsStarsAria')}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400/90 shrink-0" aria-hidden />
                  ))}
                </div>
                <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-[15px] flex-1">
                  {t(item.body)}
                </p>
                <div className="flex items-center gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center text-white text-sm font-black shrink-0">
                    {t(item.initial)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">{t(item.author)}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{t(item.meta)}</div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary-600 via-primary-700 to-violet-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:56px_56px]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[min(900px,100%)] h-48 bg-white/[0.07] blur-3xl rounded-full pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center relative">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-6 tracking-tight leading-tight">
            {t('landing.ctaEndTitle')}
          </h2>
          <p className="text-primary-100/90 text-base sm:text-lg mb-10 leading-relaxed font-medium">
            {t('landing.ctaEndSub')}
          </p>
          <Link
            to={ctaLink}
            className="inline-flex items-center gap-2 px-10 py-5 bg-white text-primary-700 font-bold text-lg rounded-2xl hover:bg-primary-50 transition-all duration-300 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.25)] hover:shadow-[0_12px_40px_-6px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 ring-1 ring-white/20 dark:bg-slate-100 dark:hover:bg-white"
          >
            {t('landing.ctaEndBtn')}
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-primary-200/90 text-sm mt-8 whitespace-pre-line leading-relaxed">
            {t('landing.ctaEndFoot')}
          </p>
        </div>
      </section>
    </div>
  )
}
