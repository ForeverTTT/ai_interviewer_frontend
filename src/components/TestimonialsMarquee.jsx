import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Star, Quote } from 'lucide-react'

function TestimonialCard({ index }) {
  const { t } = useTranslation()
  
  return (
    <div className="flex h-full w-[350px] sm:w-[450px] shrink-0 flex-col justify-between rounded-[2.5rem] border border-slate-100 bg-white p-8 dark:border-slate-800 dark:bg-slate-900 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
      <div className="space-y-6">
        <div className="flex gap-1 text-yellow-400">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-4 h-4 fill-current" />
          ))}
        </div>
        
        <p className="text-slate-600 dark:text-slate-300 italic leading-relaxed text-lg">
          "{t(`landing.testimonial${index}Body`)}"
        </p>
      </div>

      <div className="mt-8 flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 dark:bg-slate-800 font-bold text-white shadow-lg">
          {t(`landing.testimonial${index}Initial`)}
        </div>
        <div className="overflow-hidden">
          <h4 className="font-black text-slate-900 dark:text-white truncate">
            {t(`landing.testimonial${index}Author`)}
          </h4>
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 truncate">
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
    <section className="relative pt-16 pb-24 bg-white dark:bg-slate-950 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 text-center mb-16 space-y-4">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="section-badge mx-auto"
        >
          <Quote className="w-3.5 h-3.5" />
          {t('landing.testimonialsBadge')}
        </motion.div>
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white font-serif tracking-tight"
        >
          {t('landing.testimonialsTitle')}
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto"
        >
          {t('landing.testimonialsSub')}
        </motion.p>
      </div>

      <div className="relative flex overflow-hidden offer-marquee-mask">
        {/* Single Row: Left */}
        <div className="flex gap-8 py-8 animate-marquee hover:[animation-play-state:paused]">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-8 shrink-0">
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
