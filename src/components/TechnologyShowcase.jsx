import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Bot, Settings2, Volume2, ShieldCheck, Video } from 'lucide-react'
import { SectionHead } from './brand/BrandKit'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { y: 18, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
}

export default function TechnologyShowcase() {
  const { t } = useTranslation()

  const techFeatures = [
    { icon: <Bot className="h-5 w-5" />, title: t('landing.tech.agentT'), description: t('landing.tech.agentD') },
    { icon: <Settings2 className="h-5 w-5" />, title: t('landing.tech.fineTuneT'), description: t('landing.tech.fineTuneD') },
    { icon: <Volume2 className="h-5 w-5" />, title: t('landing.tech.voiceT'), description: t('landing.tech.voiceD') },
    { icon: <Video className="h-5 w-5" />, title: t('landing.tech.simT'), description: t('landing.tech.simD') },
    { icon: <ShieldCheck className="h-5 w-5" />, title: t('landing.tech.privacyT'), description: t('landing.tech.privacyD') },
  ]

  return (
    <section className="bg-brand-paper py-24 sm:py-28">
      <div className="ui-container">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
        >
          <motion.div variants={itemVariants} className="mx-auto max-w-3xl">
            <SectionHead
              align="center"
              badge={t('landing.tech.badge')}
              title={t('landing.tech.title')}
            />
          </motion.div>

          {/* 团队介绍。原来是一整块黑底横幅，现在只留这段文字，接在标题下方、能力卡上方 */}
          <motion.p
            variants={itemVariants}
            className="mx-auto mt-8 max-w-4xl text-center text-[16px] leading-relaxed text-brand-ink sm:text-[17px]"
          >
            {t('landing.tech.teamD')}
          </motion.p>

          {/* 五个能力卡 */}
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {techFeatures.map((feature, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="brand-float group flex h-full flex-col p-7 transition-transform duration-300 hover:-translate-y-1"
              >
                {/* 原来是五种高饱和底色轮转，这套色板里统一成中性描边块 + 紫色图标 */}
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand-line bg-brand-inset text-brand-violet">
                  {feature.icon}
                </div>
                <h4 className="mt-6 text-[16px] font-bold leading-tight text-brand-ink">
                  {feature.title}
                </h4>
                <p className="mt-3 text-[13.5px] leading-relaxed text-brand-muted">
                  {feature.description}
                </p>
                <div className="mt-auto pt-8">
                  <span className="block h-[2px] w-6 rounded-full bg-brand-line transition-all duration-500 group-hover:w-14 group-hover:bg-brand-violet" />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
