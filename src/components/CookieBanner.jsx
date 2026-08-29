import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ShieldCheck, X, Cookie } from 'lucide-react'

export default function CookieBanner() {
  const { t } = useTranslation()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent')
    // Show if not accepted (includes null or declined)
    if (consent !== 'accepted') {
      const timer = setTimeout(() => setIsVisible(true), 500)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted')
    setIsVisible(false)
  }

  const handleDecline = () => {
    // Save as declined, but since it's not 'accepted', 
    // it will reappear on next page refresh as requested.
    localStorage.setItem('cookie-consent', 'declined')
    setIsVisible(false)
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-[calc(100%-2rem)] md:max-w-2xl"
        >
          <div className="relative overflow-hidden group">
            {/* Premium Background with Blur & Gradient */}
            <div className="brand-float absolute inset-0 rounded-[22px] border border-brand-line" />
            
            {/* Subtle Gradient Accent */}
            <div className="pointer-events-none absolute -left-24 -top-24 h-48 w-48 rounded-full bg-brand-glow/[0.10] blur-[80px]" />

            <div className="relative px-6 py-5 md:px-10 md:py-8 flex flex-col md:flex-row items-center gap-6 md:gap-10">
              {/* Icon Section */}
              <div className="hidden md:flex relative">
                <div className="relative grid h-14 w-14 place-items-center rounded-2xl bg-brand-inset">
                  <Cookie className="h-7 w-7 text-brand-ink" />
                </div>
              </div>

              {/* Content Section */}
              <div className="flex-1 space-y-2 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap md:flex-nowrap">
                  <h3 className="whitespace-nowrap font-brand text-[17px] font-black tracking-tight text-brand-ink">
                    {t('common.cookie.title')}
                  </h3>
                  <div className="flex items-center gap-1.5 rounded-full border border-brand-line bg-brand-inset px-2 py-0.5">
                    <ShieldCheck className="h-3 w-3 text-brand-success" />
                    <span className="text-[11px] font-bold text-brand-ink">Secure</span>
                  </div>
                </div>
                <p className="max-w-lg text-[13px] leading-relaxed text-brand-muted">
                  {t('common.cookie.desc')}
                </p>
              </div>

              {/* Actions Section */}
              <div className="flex flex-row items-center gap-3 w-full md:w-auto shrink-0">
                <button
                  onClick={handleDecline}
                  className="flex-1 rounded-xl border border-brand-line px-5 py-2.5 text-[13px] font-bold text-brand-muted transition-colors hover:border-brand-ink hover:text-brand-ink md:flex-none"
                >
                  {t('common.cookie.decline')}
                </button>
                <button
                  onClick={handleAccept}
                  className="flex-1 rounded-xl bg-brand-ink px-6 py-2.5 text-[13px] font-bold text-brand-on-ink transition-opacity duration-200 hover:opacity-90 md:flex-none"
                >
                  {t('common.cookie.accept')}
                </button>
              </div>

              {/* Close Button (Optional) */}
              <button 
                onClick={() => setIsVisible(false)}
                className="absolute right-4 top-4 rounded-lg p-2 text-brand-muted transition-colors hover:text-brand-ink md:right-6 md:top-6"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
