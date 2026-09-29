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

/** 背景里的一排拱门线稿：插画中拱门母题的抽象版，只有描边、极淡 */
function ArchRow() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[220px] w-full text-white/[0.06]"
      viewBox="0 0 1440 220"
      preserveAspectRatio="xMidYMax slice"
      fill="none"
    >
      {Array.from({ length: 9 }).map((_, i) => {
        const x = 20 + i * 172
        return (
          <path
            key={i}
            d={`M${x} 220 V110 a62 62 0 0 1 124 0 V220`}
            stroke="currentColor"
            strokeWidth="1.5"
          />
        )
      })}
    </svg>
  )
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
    <section className="py-6 sm:py-10">
      <div className="mx-auto w-full max-w-[calc(var(--ui-max-w)+2rem)] px-3 sm:px-4">
        {/* 夜色港口：全页唯一的深色段落，给长页面一个节奏上的「换气」 */}
        <div className="relative isolate overflow-hidden rounded-[36px] bg-[#1B2A37] px-5 py-20 text-white sm:px-10 sm:py-24 lg:px-14">
          <div aria-hidden="true" className="absolute -right-32 -top-40 h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,rgb(232_168_50/0.22),transparent_65%)]" />
          <div aria-hidden="true" className="absolute -left-40 bottom-0 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgb(127_166_136/0.2),transparent_65%)]" />
          <ArchRow />

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={containerVariants}
            className="relative"
          >
            <motion.div variants={itemVariants} className="mx-auto max-w-3xl">
              <SectionHead
                align="center"
                tone="dark"
                badge={t('landing.tech.badge')}
                title={t('landing.tech.title')}
              />
            </motion.div>

            {/* 团队介绍 */}
            <motion.p
              variants={itemVariants}
              className="mx-auto mt-8 max-w-4xl text-center text-[15.5px] leading-relaxed text-white/70 sm:text-[16.5px]"
            >
              {t('landing.tech.teamD')}
            </motion.p>

            {/* 五个能力卡 */}
            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {techFeatures.map((feature, idx) => (
                <motion.div
                  key={idx}
                  variants={itemVariants}
                  className="group flex h-full flex-col rounded-[22px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm transition-colors duration-300 hover:border-white/20 hover:bg-white/[0.07]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-[#F2C46B] transition-colors duration-300 group-hover:bg-[#E8A832] group-hover:text-[#1B2A37]">
                    {feature.icon}
                  </div>
                  <h4 className="mt-6 text-[15.5px] font-semibold leading-tight text-white">
                    {feature.title}
                  </h4>
                  <p className="mt-3 text-[13px] leading-relaxed text-white/60">
                    {feature.description}
                  </p>
                  <div className="mt-auto pt-7">
                    <span className="block h-[2px] w-6 rounded-full bg-white/15 transition-all duration-500 group-hover:w-14 group-hover:bg-[#E8A832]" />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
