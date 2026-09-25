import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  ShieldCheck,
  Workflow,
  UserPlus,
  FileCheck2,
  MonitorPlay,
} from 'lucide-react'
import { SectionHead, WordMark } from './brand/BrandKit'

export default function AdvantagesShowcase() {
  const { t } = useTranslation()

  const ads = [
    { icon: <ShieldCheck className="h-6 w-6" />, title: t('landing.advantages.v1t'), desc: t('landing.advantages.v1d') },
    { icon: <Workflow className="h-6 w-6" />, title: t('landing.advantages.v2t'), desc: t('landing.advantages.v2d') },
    { icon: <UserPlus className="h-6 w-6" />, title: t('landing.advantages.v3t'), desc: t('landing.advantages.v3d') },
    { icon: <FileCheck2 className="h-6 w-6" />, title: t('landing.advantages.v4t'), desc: t('landing.advantages.v4d') },
    { icon: <MonitorPlay className="h-6 w-6" />, title: t('landing.advantages.v5t'), desc: t('landing.advantages.v5d') },
  ]

  return (
    <section className="bg-brand-paper py-24 sm:py-28">
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
            badge={t('landing.advantages.badge')}
            title={<>{t('landing.advantages.titlePre')}<WordMark />{t('landing.advantages.titlePost')}</>}
            sub={t('landing.advantages.sub')}
          />
        </motion.div>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {ads.map((ad, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="brand-float group flex h-full flex-col p-7 transition-transform duration-300 hover:-translate-y-1"
            >
              {/* 原来是五种高饱和底色轮转，这套色板里统一成中性描边块 + 紫色图标 */}
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-brand-line bg-brand-inset text-brand-violet">
                {ad.icon}
              </div>
              <h3 className="mt-6 text-[17px] font-bold leading-tight text-brand-ink">
                {ad.title}
              </h3>
              <p className="mt-3 text-[13.5px] leading-relaxed text-brand-muted">
                {ad.desc}
              </p>
              {/* 底部细线随 hover 拉长，替代投影做反馈 */}
              <div className="mt-auto pt-8">
                <span className="block h-[2px] w-6 rounded-full bg-brand-line transition-all duration-500 group-hover:w-14 group-hover:bg-brand-violet" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
