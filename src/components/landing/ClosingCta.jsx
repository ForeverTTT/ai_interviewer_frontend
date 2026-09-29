import { lazy, Suspense, useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { Check } from 'lucide-react'
import { BrandButton } from '../brand/BrandKit'
import { useTheme } from '../../context/ThemeContext'
import harborScene from '../../assets/background.jpg'

const ArchCorridor3D = lazy(() => import('./ArchCorridor3D'))

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/**
 * 页面收尾：穿过一道道拱门，走向路尽头的暖光——「你的下一份 Offer，从这里开始」。
 * 3D 场景懒加载；不支持 WebGL 或减少动态效果时，退回到插画远景。
 */
export default function ClosingCta({ ctaLink }) {
  const { t } = useTranslation()
  const { isDark } = useTheme()
  const sectionRef = useRef(null)
  const progressRef = useRef(0)
  const [fallback, setFallback] = useState(() => (typeof window !== 'undefined' && prefersReducedMotion()))

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] })
  useMotionValueEvent(scrollYProgress, 'change', (v) => { progressRef.current = v })

  const onUnsupported = useCallback(() => setFallback(true), [])

  // 文案里用 ✓ 分隔的三个卖点，拆开做成小标签
  const footItems = String(t('landing.ctaEndFoot'))
    .split('✓')
    .map(s => s.trim())
    .filter(Boolean)

  return (
    <section ref={sectionRef} className="pb-20 pt-6 sm:pb-24">
      <div className="mx-auto w-full max-w-[calc(var(--ui-max-w)+2rem)] px-3 sm:px-4">
        <div className="relative isolate min-h-[620px] overflow-hidden rounded-[36px] border border-brand-line bg-gradient-to-b from-[#EDF2EE] via-[#F1F4F0] to-[#E3EAE4] dark:from-[#101820] dark:via-[#121B24] dark:to-[#18232D] sm:min-h-[680px]">
          {fallback ? (
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-cover opacity-80"
              style={{ backgroundImage: `url(${harborScene})`, backgroundPosition: '50% 70%' }}
            />
          ) : (
            <Suspense fallback={null}>
              <ArchCorridor3D
                className="absolute inset-0"
                dark={isDark}
                progressRef={progressRef}
                onUnsupported={onUnsupported}
              />
            </Suspense>
          )}

          {/* 顶部纸色渐隐，承托文案 */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[62%]"
            style={{ background: 'linear-gradient(to bottom, rgb(var(--brand-paper) / 0.92) 0%, rgb(var(--brand-paper) / 0.7) 45%, transparent 100%)' }}
          />

          <div className="pointer-events-none relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 pt-16 text-center sm:pt-20">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="lk-eyebrow"
            >
              LandIt
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="lk-display mt-5 text-[32px] leading-[1.12] sm:text-[44px] lg:text-[50px]"
            >
              {t('landing.ctaEndTitle')}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-brand-muted sm:text-[17px]"
            >
              {t('landing.ctaEndSub')}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto mt-8"
            >
              <BrandButton to={ctaLink} variant="lime" size="lg">
                {t('landing.ctaEndBtn')}
              </BrandButton>
            </motion.div>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {footItems.map(item => (
                <span key={item} className="lk-chip bg-brand-card/70 backdrop-blur">
                  <Check className="h-3 w-3 text-brand-success" strokeWidth={3} />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
