import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import { SectionHead } from './brand/BrandKit'

function TestimonialCard({ index }) {
  const { t } = useTranslation()

  return (
    <div className="brand-float flex h-full w-[330px] shrink-0 flex-col justify-between p-7 sm:w-[420px]">
      <div className="space-y-5">
        <div className="flex gap-1 text-brand-violet">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="h-3.5 w-3.5 fill-current" />
          ))}
        </div>

        <p className="text-[15px] leading-relaxed text-brand-ink">
          “{t(`landing.testimonial${index}Body`)}”
        </p>
      </div>

      <div className="mt-8 flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-ink text-[14px] font-bold text-brand-on-ink">
          {t(`landing.testimonial${index}Initial`)}
        </div>
        <div className="overflow-hidden">
          <h4 className="truncate text-[14px] font-bold text-brand-ink">
            {t(`landing.testimonial${index}Author`)}
          </h4>
          <p className="truncate text-[12px] text-brand-muted">
            {t(`landing.testimonial${index}Meta`)}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function TestimonialsMarquee() {
  const { t } = useTranslation()
  const indices = [1, 2, 3, 4, 5, 6]

  return (
    <section className="relative overflow-hidden bg-brand-paper py-24 sm:py-28">
      <div className="ui-container mb-14">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-3xl"
        >
          <SectionHead
            align="center"
            badge={t('landing.testimonialsBadge')}
            title={t('landing.testimonialsTitle')}
            sub={t('landing.testimonialsSub')}
          />
        </motion.div>
      </div>

      <div className="offer-marquee-mask relative flex overflow-hidden">
        {/* Single Row: Left */}
        <div className="flex gap-6 py-4 animate-marquee hover:[animation-play-state:paused]">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-6 shrink-0">
              {indices.map(index => (
                <TestimonialCard key={`${i}-${index}`} index={index} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
