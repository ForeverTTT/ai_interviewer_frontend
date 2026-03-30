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
            <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/80 backdrop-blur-3xl rounded-[2.5rem] border border-white dark:border-slate-800 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)]" />
            
            {/* Subtle Gradient Accent */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-400/10 dark:bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-primary-400/10 dark:bg-primary-500/5 blur-[80px] rounded-full pointer-events-none" />

            <div className="relative px-6 py-5 md:px-10 md:py-8 flex flex-col md:flex-row items-center gap-6 md:gap-10">
              {/* Icon Section */}
              <div className="hidden md:flex relative">
                <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full" />
                <div className="relative p-4 rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                  <Cookie className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>

              {/* Content Section */}
              <div className="flex-1 space-y-2 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap md:flex-nowrap">
                  <h3 className="text-lg font-black font-serif tracking-tight text-slate-900 dark:text-white uppercase whitespace-nowrap">
                    {t('common.cookie.title')}
                  </h3>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50/50 dark:bg-emerald-400/10 border border-emerald-100/50 dark:border-emerald-400/20">
                    <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Secure</span>
                  </div>
                </div>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-lg">
                  {t('common.cookie.desc')}
                </p>
              </div>

              {/* Actions Section */}
              <div className="flex flex-row items-center gap-3 w-full md:w-auto shrink-0">
                <button
                  onClick={handleDecline}
                  className="flex-1 md:flex-none px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all underline underline-offset-4 decoration-slate-200"
                >
                  {t('common.cookie.decline')}
                </button>
                <button
                  onClick={handleAccept}
                  className="flex-1 md:flex-none px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 dark:shadow-none hover:scale-105 active:scale-95 transition-all"
                >
                  {t('common.cookie.accept')}
                </button>
              </div>

              {/* Close Button (Optional) */}
              <button 
                onClick={() => setIsVisible(false)}
                className="absolute top-4 right-4 md:top-6 md:right-6 p-2 rounded-xl text-slate-300 hover:text-slate-600 dark:hover:text-slate-400 transition-colors"
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
