import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import './CookieBanner.css'

const BRAND_MARK = '/brand/flowlab-shell-app-icon-192.png'

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
          className="fl-cookie-banner"
        >
          <div className="fl-cookie-card">
            <span className="fl-cookie-glow fl-cookie-glow-yellow" aria-hidden="true" />
            <span className="fl-cookie-glow fl-cookie-glow-mint" aria-hidden="true" />

            <div className="fl-cookie-layout">
              <div className="fl-cookie-brand" aria-hidden="true">
                <img src={BRAND_MARK} alt="" />
              </div>

              <div className="fl-cookie-content">
                <div className="fl-cookie-title-row">
                  <h3>{t('common.cookie.title')}</h3>
                </div>
                <p>{t('common.cookie.desc')}</p>
              </div>

              <div className="fl-cookie-actions">
                <button
                  onClick={handleDecline}
                  className="fl-cookie-button fl-cookie-button-secondary"
                >
                  {t('common.cookie.decline')}
                </button>
                <button
                  onClick={handleAccept}
                  className="fl-cookie-button fl-cookie-button-primary"
                >
                  {t('common.cookie.accept')}
                </button>
              </div>

              <button 
                onClick={() => setIsVisible(false)}
                className="fl-cookie-close"
                aria-label={t('common.cookie.close')}
              >
                <X />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
