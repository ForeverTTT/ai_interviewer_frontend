import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Briefcase, Globe2, Zap, Mic } from 'lucide-react'
import { SectionHead, WordMark, IndexBadge, Reveal, TiltCard } from './brand/BrandKit'
import InterviewPreview from './brand/InterviewPreview'

const MAIN_BULLET_KEYS = ['howMainB1', 'howMainB2', 'howMainB3', 'howMainB4']

const VALUE_CARDS = [
  { key: 'howV1', icon: Briefcase },
  { key: 'howV2', icon: Zap },
  { key: 'howV3', icon: Globe2 },
  { key: 'howV4', icon: Mic },
]

export default function HowItWorksShowcase() {
  const { t } = useTranslation()
  const stageRef = useRef(null)

  /*
   * 3D 登场：面试界面像一块屏幕从桌面上「立起来」——
   * 进入视口时带 16° 仰角，滚到中部时回正。只用 transform，不触发重排。
   */
  const { scrollYProgress } = useScroll({ target: stageRef, offset: ['start end', 'center center'] })
  const rotateX = useTransform(scrollYProgress, [0, 1], [16, 0])
  const scale = useTransform(scrollYProgress, [0, 1], [0.92, 1])
  const y = useTransform(scrollYProgress, [0, 1], [40, 0])

  return (
    <section id="how-it-works" className="relative scroll-mt-24 py-24 sm:py-28">
      <div className="ui-container">
        <Reveal className="mx-auto max-w-3xl">
          <SectionHead
            align="center"
            badge={t('landing.howBadge')}
            title={<>{t('landing.howTitlePre')}<WordMark />{t('landing.howTitlePost')}</>}
            sub={t('landing.howSub')}
          />
        </Reveal>

        <div className="mt-16 grid items-center gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
          {/* 左：一条「路」把四个步骤串起来，呼应插画里那条通向远方的路 */}
          <Reveal>
            <h3 className="lk-display text-[26px] leading-snug sm:text-[32px]">
              {t('landing.howMainTitle')}
            </h3>

            <ol className="relative mt-10 space-y-7">
              <span aria-hidden="true" className="absolute bottom-4 left-[17px] top-4 w-px bg-gradient-to-b from-brand-ochre via-brand-line to-brand-line" />
              {MAIN_BULLET_KEYS.map((key, i) => (
                <motion.li
                  key={key}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className="relative flex items-start gap-5"
                >
                  <IndexBadge n={i + 1} className={i === 0 ? '!border-brand-ochre !bg-brand-ochre !text-[#22303D]' : ''} />
                  <p className="pt-1.5 text-[15px] leading-relaxed text-brand-ink">
                    {t(`landing.${key}`)}
                  </p>
                </motion.li>
              ))}
            </ol>
          </Reveal>

          {/* 右：真实 DOM 搭建的面试界面，跟随主题 token 变色 */}
          <div ref={stageRef} className="lk-perspective relative">
            <div aria-hidden="true" className="absolute -inset-6 -z-10 rounded-[40px] bg-[radial-gradient(60%_60%_at_60%_40%,rgb(var(--brand-sky)/0.55),transparent_70%)] blur-2xl" />
            <motion.div style={{ rotateX, scale, y, transformOrigin: '50% 100%' }} className="will-change-transform">
              <InterviewPreview />
            </motion.div>
          </div>
        </div>

        {/* 四个价值点 */}
        <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VALUE_CARDS.map((item, i) => {
            const Icon = item.icon
            return (
              <Reveal key={item.key} delay={i * 0.07} className="h-full">
                <TiltCard className="brand-float group flex h-full flex-col p-7 transition-shadow duration-300 hover:shadow-lift">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-ink text-brand-on-ink transition-colors duration-300 group-hover:bg-brand-ochre group-hover:text-[#22303D]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h4 className="mt-6 text-[16.5px] font-semibold leading-tight text-brand-ink">
                    {t(`landing.${item.key}Title`)}
                  </h4>
                  <p className="mt-3 text-[13.5px] leading-relaxed text-brand-muted">
                    {t(`landing.${item.key}Desc`)}
                  </p>
                </TiltCard>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
