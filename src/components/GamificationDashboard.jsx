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

const RADAR_SIZE = 240
const CENTER = RADAR_SIZE / 2
const RADIUS = 80

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
    <div className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left Panel: Radar & Stats */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-xl ring-1 ring-slate-900/[0.05] dark:border-slate-700/80 dark:bg-slate-900/60 dark:ring-white/[0.05] lg:col-span-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400">
              <Target className="w-5 h-5" />
            </div>
            <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-wider text-sm">{t('profile.game.radarTitle')}</h3>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 font-bold text-xs ring-1 ring-orange-200 dark:ring-orange-800">
            <Flame className="w-3.5 h-3.5" />
            {streak} {t('profile.game.streak')}
          </div>
        </div>

        {/* Radar Chart Display */}
        <div className="flex flex-col items-center justify-center py-4">
          <div className="relative">
            <svg width={RADAR_SIZE} height={RADAR_SIZE} className="drop-shadow-sm">
              {/* Radial Grids */}
              {grids.map((g, i) => (
                <polygon key={i} points={g} fill="none" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />
              ))}
              {/* Axis lines */}
              {DIMENSIONS.map((_, i) => {
                const angle = (Math.PI * 2 / DIMENSIONS.length) * i - Math.PI / 2
                const x2 = CENTER + RADIUS * Math.cos(angle)
                const y2 = CENTER + RADIUS * Math.sin(angle)
                return <line key={i} x1={CENTER} y1={CENTER} x2={x2} y2={y2} stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="1" strokeDasharray="2,2" />
              })}
              {/* Data Polygon */}
              <motion.polygon 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                points={points} 
                fill="rgba(99, 102, 241, 0.25)" 
                stroke="#6366f1" 
                strokeWidth="3" 
                className="transition-all duration-700 ease-out"
              />
              {/* dimension points */}
              {points.split(" ").map((p, i) => {
                if (!p) return null
                const parts = p.split(",")
                if (parts.length < 2) return null
                const [x, y] = parts
                return <circle key={i} cx={x} cy={y} r="4" fill="white" stroke="#6366f1" strokeWidth="2" />
              })}
            </svg>

            {/* Labels */}
            {DIMENSIONS.map((d, i) => {
              const angle = (Math.PI * 2 / DIMENSIONS.length) * i - Math.PI / 2
              const r = RADIUS + 25
              const x = CENTER + r * Math.cos(angle)
              const y = CENTER + r * Math.sin(angle)
              return (
                <div key={i} className="absolute text-[10px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap transform -translate-x-1/2 -translate-y-1/2" style={{ left: x, top: y }}>
                  {t(`profile.${d.label}`)}
                  <div className="text-primary-600 dark:text-primary-400 text-center">{stats?.radar?.[d.key] || 0}</div>
                </div>
              )
            })}
          </div>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="mt-4 w-full group relative overflow-hidden rounded-xl bg-gradient-to-r from-primary-600 to-violet-600 p-[1px] shadow-lg transition-all hover:shadow-primary-500/25"
        >
          <div className="relative flex items-center justify-center gap-2 rounded-xl bg-white/95 px-4 py-3 text-sm font-bold text-primary-700 transition-all group-hover:bg-transparent group-hover:text-white dark:bg-slate-900/90 dark:text-primary-300 dark:group-hover:bg-transparent">
            <Sparkles className="w-4 h-4" />
            {stats?.alreadyCheckedIn ? t('profile.game.checkInDoneBtn') : t('profile.game.checkInBtn')}
          </div>
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

      {/* Right Panel: Level Track & Quest */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        {/* Level Track Area */}
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-xl ring-1 ring-slate-900/[0.05] dark:border-slate-700/80 dark:bg-slate-900/70 dark:ring-white/[0.05]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-wider text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              {t('profile.game.lvlMap')}
            </h3>
            <span className="text-xs font-bold text-slate-400">{t('profile.game.curLvl')}: Lvl {currentLvl}</span>
          </div>

          <div className="relative flex gap-4 overflow-x-auto pb-6 scrollbar-hide snap-x">
            {LVL_IDS.map((lvl) => {
              const isDone = lvl < currentLvl
              const isActive = lvl === currentLvl
              const isLocked = lvl > currentLvl

              return (
                <div key={lvl} className="relative flex flex-col items-center min-w-[100px] snap-center">
                  {/* Connector Line */}
                  {lvl < 10 && (
                    <div className={`absolute top-6 left-[60%] w-[80%] h-0.5 ${isDone ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-800'}`} />
                  )}
                  
                  {/* Level Node */}
                  <motion.div 
                    whileHover={{ scale: 1.1 }}
                    className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl shadow-md ring-2 ring-white dark:ring-slate-900 ${
                      isActive ? 'bg-gradient-to-br from-primary-500 to-violet-600 text-white shadow-primary-500/30' : 
                      isDone ? 'bg-emerald-500 text-white' : 
                      'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600'
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="w-5 h-5 text-white" /> : 
                     isLocked ? <Lock className="w-4 h-4" /> : 
                     <span className="font-black text-lg">{lvl}</span>}
                  </motion.div>
                  
                  <span className={`mt-3 text-[10px] font-black uppercase text-center leading-tight ${
                    isActive ? 'text-primary-600 dark:text-primary-400' : 
                    isDone ? 'text-emerald-600 dark:text-emerald-400' : 
                    'text-slate-400 dark:text-slate-600'
                  }`}>
                    {t(`profile.game.lvls.${lvl}`)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Current Quest Card */}
        <div className="group relative overflow-hidden rounded-3xl border border-primary-200/50 bg-gradient-to-r from-primary-50 to-indigo-50 p-6 shadow-md dark:border-primary-900/30 dark:from-primary-900/20 dark:to-indigo-950/20">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Target className="w-24 h-24 text-primary-500" />
          </div>
          <div className="relative flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-100 px-2.5 py-1 text-xs font-bold text-primary-700 dark:bg-primary-900/60 dark:text-primary-300">
                <Sparkles className="w-3.5 h-3.5" />
                {t('profile.game.nextQuest')}
              </span>
              <h4 className="mt-3 text-xl font-black text-slate-800 dark:text-white">
                {t('profile.game.nextLvChallenge', { lvl: currentLvl + 1 })}
              </h4>
              <p className="mt-2 text-slate-600 dark:text-slate-400 font-medium">
                {stats?.nextLevelQuest ? t(`profile.game.quests.${stats.nextLevelQuest}`) : 'Keep practice!'}
              </p>
            </div>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-lg dark:bg-slate-800">
               <ChevronRight className="w-6 h-6 text-primary-600 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
