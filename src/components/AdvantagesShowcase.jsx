import { useTranslation } from 'react-i18next'
import {
  ShieldCheck,
  Workflow,
  UserPlus,
  FileCheck2,
  MonitorPlay,
  FileText,
  Mic,
  BarChart3,
  TrendingUp,
} from 'lucide-react'
import { SectionHead, WordMark, Reveal, TiltCard } from './brand/BrandKit'
import harborScene from '../assets/background.jpg'

/**
 * 「为什么选择 LandIt」——便当格布局：
 * 第一格最大，右半边露出插画里那几扇拱门（机会之门）；第二格用一条小流程图讲「闭环」；
 * 其余三格等宽。颜色轮流取插画墙面的港湾蓝 / 鼠尾草 / 赭黄 / 红砖。
 */
const TONES = {
  harbor: 'bg-brand-harbor/[0.12] text-brand-harbor',
  sage: 'bg-brand-sage/[0.18] text-brand-success',
  ochre: 'bg-brand-ochre/[0.2] text-[#8A5F10] dark:text-brand-ochre',
  brick: 'bg-brand-brick/[0.13] text-brand-brick',
}

function IconChip({ icon: Icon, tone }) {
  return (
    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${TONES[tone]}`}>
      <Icon className="h-[22px] w-[22px]" />
    </span>
  )
}

/** 简历 → 面试 → 报告 → 提升 的小流程示意（纯图标，不引入新文案） */
function LoopGraphic() {
  const nodes = [FileText, Mic, BarChart3, TrendingUp]
  return (
    <div className="mt-7 flex items-center gap-2" aria-hidden="true">
      {nodes.map((Icon, i) => (
        <div key={i} className="flex flex-1 items-center gap-2 last:flex-none">
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border ${i === nodes.length - 1 ? 'border-brand-ochre bg-brand-ochre text-[#22303D]' : 'border-brand-line bg-brand-card text-brand-muted'}`}>
            <Icon className="h-4 w-4" />
          </span>
          {i < nodes.length - 1 && <span className="h-px flex-1 border-t border-dashed border-brand-muted/40" />}
        </div>
      ))}
    </div>
  )
}

export default function AdvantagesShowcase() {
  const { t } = useTranslation()

  const ads = [
    { icon: ShieldCheck, tone: 'harbor', title: t('landing.advantages.v1t'), desc: t('landing.advantages.v1d') },
    { icon: Workflow, tone: 'ochre', title: t('landing.advantages.v2t'), desc: t('landing.advantages.v2d') },
    { icon: UserPlus, tone: 'sage', title: t('landing.advantages.v3t'), desc: t('landing.advantages.v3d') },
    { icon: FileCheck2, tone: 'brick', title: t('landing.advantages.v4t'), desc: t('landing.advantages.v4d') },
    { icon: MonitorPlay, tone: 'harbor', title: t('landing.advantages.v5t'), desc: t('landing.advantages.v5d') },
  ]

  const [hero, loop, ...rest] = ads

  return (
    <section className="relative py-24 sm:py-28">
      <div className="ui-container">
        <Reveal className="mx-auto max-w-3xl">
          <SectionHead
            align="center"
            badge={t('landing.advantages.badge')}
            title={<>{t('landing.advantages.titlePre')}<WordMark />{t('landing.advantages.titlePost')}</>}
            sub={t('landing.advantages.sub')}
          />
        </Reveal>

        <div className="mt-16 grid gap-4 lg:grid-cols-6">
          {/* 大格：文案 + 插画里的拱门 */}
          <Reveal className="lg:col-span-4">
            <TiltCard max={3} className="brand-float group relative flex h-full min-h-[320px] overflow-hidden transition-shadow duration-300 hover:shadow-lift">
              <div className="relative z-10 flex w-full flex-col p-7 sm:w-[58%] sm:p-9">
                <IconChip icon={hero.icon} tone={hero.tone} />
                <h3 className="lk-display mt-8 text-[24px] leading-tight sm:text-[28px]">{hero.title}</h3>
                <p className="mt-4 text-[14px] leading-relaxed text-brand-muted">{hero.desc}</p>
              </div>
              <div
                aria-hidden="true"
                className="absolute inset-y-0 right-0 hidden w-[52%] bg-cover transition-transform duration-[1.2s] ease-out-soft group-hover:scale-[1.04] sm:block"
                style={{
                  backgroundImage: `url(${harborScene})`,
                  backgroundPosition: '4% 60%',
                  backgroundSize: '260% auto',
                  maskImage: 'linear-gradient(to right, transparent 0%, black 38%)',
                  WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 38%)',
                }}
              />
            </TiltCard>
          </Reveal>

          {/* 闭环：流程示意 */}
          <Reveal delay={0.06} className="lg:col-span-2">
            <TiltCard className="brand-float flex h-full flex-col p-7 transition-shadow duration-300 hover:shadow-lift">
              <IconChip icon={loop.icon} tone={loop.tone} />
              <h3 className="mt-7 text-[17px] font-semibold leading-tight text-brand-ink">{loop.title}</h3>
              <p className="mt-3 text-[13.5px] leading-relaxed text-brand-muted">{loop.desc}</p>
              <div className="mt-auto">
                <LoopGraphic />
              </div>
            </TiltCard>
          </Reveal>

          {rest.map((ad, i) => (
            <Reveal key={ad.title} delay={0.1 + i * 0.06} className="lg:col-span-2">
              <TiltCard className="brand-float group flex h-full flex-col p-7 transition-shadow duration-300 hover:shadow-lift">
                <IconChip icon={ad.icon} tone={ad.tone} />
                <h3 className="mt-7 text-[17px] font-semibold leading-tight text-brand-ink">{ad.title}</h3>
                <p className="mt-3 text-[13.5px] leading-relaxed text-brand-muted">{ad.desc}</p>
                <div className="mt-auto pt-8">
                  <span className="block h-[2px] w-8 rounded-full bg-brand-line transition-all duration-500 group-hover:w-16 group-hover:bg-brand-ochre" />
                </div>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
