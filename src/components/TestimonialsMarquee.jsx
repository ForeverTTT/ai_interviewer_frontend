import { useTranslation } from 'react-i18next'
import { Star } from 'lucide-react'
import { SectionHead, Reveal } from './brand/BrandKit'
import Marquee from './brand/Marquee'

/* 头像底色轮流取插画的墙面色 */
const AVATAR_TONES = [
  'bg-brand-harbor text-white',
  'bg-brand-ochre text-[#22303D]',
  'bg-brand-sage text-[#1B2A37]',
  'bg-brand-brick text-white',
  'bg-brand-ink text-brand-on-ink',
  'bg-brand-sky text-[#22303D]',
]

function TestimonialCard({ index }) {
  const { t } = useTranslation()

  return (
    <figure className="brand-float relative flex h-full w-[320px] shrink-0 flex-col justify-between overflow-hidden p-7 sm:w-[400px]">
      {/* 衬线大引号作水印 */}
      <span aria-hidden="true" className="pointer-events-none absolute -right-2 -top-6 font-display text-[120px] leading-none text-brand-ochre/20">”</span>

      <div className="relative space-y-4">
        <div className="flex gap-0.5 text-brand-ochre" aria-label={t('landing.testimonialsStarsAria')}>
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="h-3.5 w-3.5 fill-current" />
          ))}
        </div>

        <blockquote className="text-[14.5px] leading-relaxed text-brand-ink">
          “{t(`landing.testimonial${index}Body`)}”
        </blockquote>
      </div>

      <figcaption className="relative mt-7 flex items-center gap-3.5 border-t border-brand-line pt-5">
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-display text-[15px] font-semibold ${AVATAR_TONES[(index - 1) % AVATAR_TONES.length]}`}>
          {t(`landing.testimonial${index}Initial`)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold text-brand-ink">
            {t(`landing.testimonial${index}Author`)}
          </p>
          <p className="truncate text-[12px] text-brand-muted">
            {t(`landing.testimonial${index}Meta`)}
          </p>
        </div>
      </figcaption>
    </figure>
  )
}

export default function TestimonialsMarquee() {
  const { t } = useTranslation()
  const indices = [1, 2, 3, 4, 5, 6]

  return (
    <section className="relative overflow-hidden py-24 sm:py-28">
      <div className="ui-container mb-14">
        <Reveal className="mx-auto max-w-3xl">
          <SectionHead
            align="center"
            badge={t('landing.testimonialsBadge')}
            title={t('landing.testimonialsTitle')}
            sub={t('landing.testimonialsSub')}
          />
        </Reveal>
      </div>

      <Marquee duration={70} gap={20} className="py-4">
        {indices.map(index => (
          <TestimonialCard key={index} index={index} />
        ))}
      </Marquee>
    </section>
  )
}
