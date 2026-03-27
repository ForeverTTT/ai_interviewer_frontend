import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { 
  Trophy, Target, Flame, Sparkles, Shield, 
  ChevronRight, Lock, CheckCircle2, Zap 
} from 'lucide-react'
import CheckInModal from './CheckInModal'

// Radar Dimensions definitions
const DIMENSIONS = [
  { key: 'resume', label: 'game.radarResume', icon: Target },
  { key: 'experience', label: 'game.radarExperience', icon: Trophy },
  { key: 'language', label: 'game.radarLanguage', icon: Zap },
  { key: 'softSkills', label: 'game.radarSoftSkills', icon: Shield },
]

const LVL_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const RADAR_SIZE = 220
const CENTER = RADAR_SIZE / 2
const RADIUS = 75

/**
 * Premium Gamification Dashboard
 * Visualizes level progress and a 4-dimension radar chart.
 */
export default function GamificationDashboard({ stats, onCheckIn, interviews }) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('radar')
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Calculate Radar polygon points
  const points = useMemo(() => {
    if (!stats?.radar) return ""
    return DIMENSIONS.map((d, i) => {
      const angle = (Math.PI * 2 / DIMENSIONS.length) * i - Math.PI / 2
      const value = stats.radar[d.key] || 0
      const length = (value / 10) * RADIUS
      const x = CENTER + length * Math.cos(angle)
      const y = CENTER + length * Math.sin(angle)
      return `${x},${y}`
    }).join(" ")
  }, [stats?.radar])

  // Background grid for radar
  const grids = [0.2, 0.4, 0.6, 0.8, 1].map(scale => {
    return DIMENSIONS.map((_, i) => {
      const angle = (Math.PI * 2 / DIMENSIONS.length) * i - Math.PI / 2
      const x = CENTER + RADIUS * scale * Math.cos(angle)
      const y = CENTER + RADIUS * scale * Math.sin(angle)
      return `${x},${y}`
    }).join(" ")
  })

  const currentLvl = stats?.level || 1
  const streak = stats?.streak || 0
  const nextQuest = stats?.nextLevelQuest || "Keep practice!"

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Radar Panel */}
      <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">
              <Target className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">{t('profile.game.radarTitle')}</h3>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-full border border-slate-100 dark:border-slate-700">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{stats?.streak || 0}</span>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="relative">
            <svg width={RADAR_SIZE} height={RADAR_SIZE}>
              {grids.map((g, i) => (
                <polygon key={i} points={g} fill="none" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="1" />
              ))}
              {DIMENSIONS.map((_, i) => {
                const angle = (Math.PI * 2 / DIMENSIONS.length) * i - Math.PI / 2
                const x2 = CENTER + RADIUS * Math.cos(angle)
                const y2 = CENTER + RADIUS * Math.sin(angle)
                return <line key={i} x1={CENTER} y1={CENTER} x2={x2} y2={y2} stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="1" strokeDasharray="2,2" />
              })}
              <motion.polygon 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                points={points} 
                fill="rgba(0, 0, 0, 0.05)"
                stroke="currentColor" 
                className="text-slate-900 dark:text-white transition-all duration-700 ease-out"
                strokeWidth="2" 
              />
            </svg>
            {DIMENSIONS.map((d, i) => {
              const angle = (Math.PI * 2 / DIMENSIONS.length) * i - Math.PI / 2
              const r = RADIUS + 30
              const x = CENTER + r * Math.cos(angle)
              const y = CENTER + r * Math.sin(angle)
              return (
                <div key={i} className="absolute text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter whitespace-nowrap transform -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: x, top: y }}>
                  <div>{t(`profile.${d.label}`)}</div>
                  <div className="text-slate-900 dark:text-white font-black">{stats?.radar?.[d.key] || 0}</div>
                </div>
              )
            })}
          </div>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full btn-setup-action-pill px-6 py-4"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {stats?.alreadyCheckedIn ? t('profile.game.checkInDoneBtn') : t('profile.game.checkInBtn')}
        </button>
      </div>

      {/* Check-in Modal */}
      <CheckInModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        stats={stats}
        interviews={interviews}
        onCheckIn={onCheckIn}
      />

      {/* Progress & Quests Panel */}
      <div className="lg:col-span-8 space-y-8">
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-8">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-4 h-4 text-slate-400" />
              {t('profile.game.lvlMap')}
            </h3>
            <span className="text-xs font-bold text-slate-400 uppercase">Lvl {currentLvl}</span>
          </div>

          <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x">
            {LVL_IDS.map((lvl) => {
              const isDone = lvl < currentLvl
              const isActive = lvl === currentLvl
              return (
                <div key={lvl} className="flex flex-col items-center min-w-[100px] snap-center space-y-4">
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                      isActive ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl' : 
                      isDone ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 
                      'bg-slate-50 dark:bg-slate-900/50 text-slate-200 dark:text-slate-700 border border-slate-100 dark:border-slate-800'
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="w-6 h-6" /> : <span className="text-lg font-black">{lvl}</span>}
                  </motion.div>
                  <span className={`text-[10px] font-bold uppercase tracking-tighter text-center max-w-[80px] leading-tight ${
                    isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400'
                  }`}>
                    {t(`profile.game.lvls.${lvl}`)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="group bg-slate-50 dark:bg-slate-900 p-8 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-8 border border-slate-100 dark:border-slate-800 transition-colors hover:border-blue-500/30">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-black text-blue-500 uppercase tracking-widest">
              <Sparkles className="w-4 h-4" />
              {t('profile.game.nextQuest')}
            </div>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white font-serif tracking-tight">
              {t('profile.game.nextLvChallenge', { lvl: currentLvl + 1 })}
            </h4>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              {stats?.nextLevelQuest ? t(`profile.game.quests.${stats.nextLevelQuest}`) : 'Keep practice!'}
            </p>
          </div>
          <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-brand-500 group-hover:-translate-y-1 transition-all">
            <ChevronRight className="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>
  )
}
