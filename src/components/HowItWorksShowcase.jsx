import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Briefcase, Globe2, Zap, Mic } from 'lucide-react'
import { SectionHead, WordMark, IndexBadge } from './brand/BrandKit'

// Use the generated image path
import mockupImg from '../assets/interview_interface_mockup.png'

const MAIN_BULLET_KEYS = ['howMainB1', 'howMainB2', 'howMainB3', 'howMainB4']

const VALUE_CARDS = [
  { key: 'howV1', icon: <Briefcase className="h-5 w-5" /> },
  { key: 'howV2', icon: <Zap className="h-5 w-5" /> },
  { key: 'howV3', icon: <Globe2 className="h-5 w-5" /> },
  { key: 'howV4', icon: <Mic className="h-5 w-5" /> },
]

export default function HowItWorksShowcase({ ctaLink }) {
  const { t } = useTranslation()

  return (
    <section id="how-it-works" className="bg-brand-paper py-24 sm:py-28">
      <div className="ui-container">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-3xl"
        >
          <SectionHead
            align="center"
            title={<>{t('landing.howTitlePre')}<WordMark />{t('landing.howTitlePost')}</>}
            sub={t('landing.howSub')}
          />
        </motion.div>

        {/* 主界面演示 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mt-16"
        >
          {/* 这块不再套白色卡片：正文直接落在页面底色上，文字用纯黑 */}
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            {/* 脱掉卡片外框后文字会贴到容器左边界，这里补回内缩 */}
            <div className="py-2 sm:pl-6 lg:pl-10 xl:pl-14">
              <h3 className="font-brand text-[24px] font-black leading-snug tracking-tight text-brand-ink sm:text-[30px]">
                {t('landing.howMainTitle')}
              </h3>

              <ul className="mt-10 space-y-6">
                {MAIN_BULLET_KEYS.map((key, i) => (
                  <li key={key} className="flex items-start gap-4">
                    <IndexBadge n={i + 1} />
                    <p className="pt-1 text-[15px] leading-relaxed text-brand-ink">
                      {t(`landing.${key}`)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex h-full items-center justify-center overflow-hidden rounded-[24px] border border-brand-line bg-brand-inset p-8 lg:min-h-[520px]">
              <img
                src={mockupImg}
                alt="AI Interview Session"
                className="h-full w-full object-contain"
              />
            </div>
          </div>
        </motion.div>

        {/* 四个价值点 */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {VALUE_CARDS.map((item, i) => (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="brand-float group p-7 transition-transform duration-300 hover:-translate-y-1"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-ink text-brand-on-ink transition-colors duration-300 group-hover:bg-brand-violet">
                {item.icon}
              </div>
              <h4 className="mt-6 text-[17px] font-bold leading-tight text-brand-ink">
                {t(`landing.${item.key}Title`)}
              </h4>
              <p className="mt-3 text-[13.5px] leading-relaxed text-brand-muted">
                {t(`landing.${item.key}Desc`)}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
