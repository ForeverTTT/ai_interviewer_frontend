import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, Calendar as CalendarIcon, Flame, 
  CheckCircle2, Star, Sparkles, ChevronLeft, ChevronRight 
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

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
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm dark:bg-black/70"
          />

          {/* Modal Container */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white/95 p-6 shadow-2xl dark:border-slate-800/80 dark:bg-slate-900/95"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400">
                  <CalendarIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">{t('profile.game.checkInModalTitle')}</h3>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{monthNames[currentMonth]} {currentYear}</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Streak Hero */}
            <div className="mb-6 flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600/10 to-violet-600/10 p-6 text-center ring-1 ring-primary-500/20 dark:from-primary-500/5 dark:to-violet-600/5">
              <motion.div 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg shadow-emerald-500/30"
              >
                <Flame className="h-10 w-10" />
              </motion.div>
              <div className="text-3xl font-black text-slate-900 dark:text-white">{stats?.streak || 0} {t('profile.game.streak')}</div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">{t('profile.game.streakQuote')}</p>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-center mb-8">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, idx) => (
                <div key={`${d}-${idx}`} className="text-[10px] font-black text-slate-300 dark:text-slate-600 p-1">{d}</div>
              ))}
              {calendarDays.map((d, i) => {
                const isToday = d.day === today.getDate()
                return (
                  <div key={i} className="relative aspect-square flex items-center justify-center">
                    {d.day && (
                      <motion.div 
                        whileHover={{ scale: 1.1 }}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                          isToday ? 'bg-primary-600 text-white shadow-md shadow-primary-500/40 ring-2 ring-primary-100 dark:ring-primary-900' : 
                          d.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 line-through decoration-2' : 
                          'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                         {d.day}
                         {d.active && <div className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-sm" />}
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
                className={`w-full group relative overflow-hidden rounded-2xl p-[1px] shadow-xl transition-all h-14 ${
                  alreadyCheckedInToday ? 'opacity-50 grayscale' : 'hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                <div className={`absolute inset-0 bg-gradient-to-r from-primary-600 via-violet-600 to-indigo-600 ${checkingIn ? 'animate-shimmer bg-[length:200%_100%]' : ''}`} />
                <div className="relative flex h-full items-center justify-center gap-2 rounded-2xl bg-white/90 px-6 font-black text-primary-700 transition-all dark:bg-slate-900/90 dark:text-primary-300 group-hover:bg-transparent group-hover:text-white">
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
                </div>
              </button>
              {error && <p className="text-center text-xs font-bold text-red-500">{error}</p>}
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
                         <Star className={`w-4 h-4 ${['text-amber-400', 'text-primary-400', 'text-violet-400', 'text-emerald-400'][i % 4]}`} fill="currentColor" />
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
