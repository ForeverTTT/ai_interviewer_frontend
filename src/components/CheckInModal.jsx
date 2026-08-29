import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, Calendar as CalendarIcon, Flame, 
  CheckCircle2, Star, Sparkles, ChevronLeft, ChevronRight 
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

/** 彩带星星的配色：写成完整类名，避免生产构建 purge 掉动态拼接的类。 */
const CONFETTI_COLOR_CLASSES = [
  'text-brand-violet',
  'text-brand-violet',
  'text-brand-success',
  'text-brand-ink',
]

/**
 * Premium CheckInModal with interactive calendar and success animations.
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Object} props.stats
 * @param {Array} props.interviews
 * @param {Function} props.onCheckIn
 */
export default function CheckInModal({ isOpen, onClose, stats, interviews, onCheckIn }) {
  const { t } = useTranslation()
  const [checkingIn, setCheckingIn] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [error, setError] = useState(null)

  const today = new Date()
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()

  // Generate Calendar Days
  const calendarDays = useMemo(() => {
    const startOfMonth = new Date(currentYear, currentMonth, 1)
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0)
    const firstDayIdx = startOfMonth.getDay() // 0-6 (Sun-Sat)
    const daysInMonth = endOfMonth.getDate()

    const days = []
    // Padding for first week
    for (let i = 0; i < firstDayIdx; i++) {
       days.push({ day: null, active: false })
    }
    // Days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = new Date(currentYear, currentMonth, i).toISOString().split('T')[0]
      const hasActivity = interviews?.some(iv => iv.created_at?.startsWith(dateStr))
      days.push({ day: i, active: hasActivity, dateStr })
    }
    return days
  }, [currentMonth, currentYear, interviews])

  const handleAction = async () => {
    setCheckingIn(true)
    setError(null)
    try {
      const success = await onCheckIn()
      if (success) {
        setShowConfetti(true)
        setTimeout(() => {
          setShowConfetti(false)
          onClose()
        }, 3000)
      }
    } catch (err) {
      setError("Check-in failed. Please try again.")
    } finally {
      setCheckingIn(false)
    }
  }

  // Pre-calculate today's checkin status
  const alreadyCheckedInToday = stats?.alreadyCheckedIn

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-brand-ink/40 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="brand-float relative w-full max-w-md overflow-hidden rounded-[22px] border border-brand-line p-6"
          >
            {/* Header */}
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-inset text-brand-violet">
                  <CalendarIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-brand text-[18px] font-semibold tracking-tight text-brand-ink">{t('profile.game.checkInModalTitle')}</h3>
                  <p className="mt-0.5 text-[12px] text-brand-muted">{monthNames[currentMonth]} {currentYear}</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="shrink-0 rounded-full p-2 text-brand-muted transition-colors hover:bg-brand-inset hover:text-brand-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Streak Hero */}
            <div className="mb-5 flex flex-col items-center justify-center rounded-[18px] border border-brand-line bg-brand-inset p-6 text-center">
              <motion.div 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="mb-2 grid h-14 w-14 place-items-center rounded-2xl bg-brand-ink text-brand-on-ink"
              >
                <Flame className="h-8 w-8" />
              </motion.div>
              <div className="text-[28px] font-semibold leading-none tracking-tight text-brand-ink">{stats?.streak || 0} {t('profile.game.streak')}</div>
              <p className="mt-2 text-[12.5px] leading-relaxed text-brand-muted">{t('profile.game.streakQuote')}</p>
            </div>

            {/* Calendar Grid */}
            <div className="mb-6 grid grid-cols-7 gap-1 text-center">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, idx) => (
                <div key={`${d}-${idx}`} className="p-1 text-[11px] font-bold text-brand-muted">{d}</div>
              ))}
              {calendarDays.map((d, i) => {
                const isToday = d.day === today.getDate()
                return (
                  <div key={i} className="relative flex aspect-square items-center justify-center">
                    {d.day && (
                      <motion.div 
                        whileHover={{ scale: 1.1 }}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-[12.5px] font-bold transition-colors ${
                          isToday ? 'bg-brand-ink text-brand-on-ink' : 
                          d.active ? 'bg-brand-inset text-brand-success line-through decoration-2' : 
                          'text-brand-muted'
                        }`}
                      >
                         {d.day}
                         {d.active && <div className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-brand-success" />}
                      </motion.div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Footer Action */}
            <div className="space-y-3">

              <button 
                disabled={alreadyCheckedInToday || checkingIn}
                onClick={handleAction}
                className={`flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-brand-ink px-6 text-[14px] font-semibold text-brand-on-ink transition-opacity duration-200 ${
                  alreadyCheckedInToday ? 'cursor-default opacity-50' : 'hover:-translate-y-0.5 active:translate-y-0'
                } disabled:hover:translate-y-0`}
              >
                {alreadyCheckedInToday ? (
                   <>
                     <CheckCircle2 className="h-5 w-5" />
                     {t('profile.game.checkInModalDone')}
                   </>
                ) : (
                  <>
                    {checkingIn ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><Star className="h-5 w-5" /></motion.div> : <Sparkles className="h-5 w-5" />}
                    {t('profile.game.checkInModalLvlUp')}
                  </>
                )}
              </button>
              {error && <p className="text-center text-[12px] font-bold text-brand-danger">{error}</p>}
            </div>

            {/* Confetti Animation overlay */}
            <AnimatePresence>
              {showConfetti && (
                <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center overflow-hidden">
                   {[...Array(20)].map((_, i) => (
                      <motion.div 
                        key={`star-${i}`}
                        initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                        animate={{ 
                          opacity: 0, 
                          scale: [0, 1.5, 0],
                          x: (Math.random() - 0.5) * 400, 
                          y: (Math.random() - 0.5) * 400,
                          rotate: Math.random() * 360 
                        }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        style={{ position: 'absolute' }}
                      >
                         <Star className={`h-4 w-4 ${CONFETTI_COLOR_CLASSES[i % CONFETTI_COLOR_CLASSES.length]}`} fill="currentColor" />
                      </motion.div>
                   ))}
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
