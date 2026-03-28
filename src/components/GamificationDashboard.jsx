import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { 
  Trophy, Target, Flame, Sparkles, Shield, 
  ChevronRight, Lock, CheckCircle2, Zap,
  Briefcase, Globe2
} from 'lucide-react'
import CheckInModal from './CheckInModal'

// Radar Dimensions definitions
const DIMENSIONS = [
  { key: 'resume', label: 'profile.game.radarResume', icon: Target },
  { key: 'experience', label: 'profile.game.radarExperience', icon: Trophy },
  { key: 'language', label: 'profile.game.radarLanguage', icon: Zap },
  { key: 'softSkills', label: 'profile.game.radarSoftSkills', icon: Shield },
  { key: 'portfolio', label: 'profile.game.radarPortfolio', icon: Briefcase },
  { key: 'networking', label: 'profile.game.radarNetworking', icon: Globe2 },
]

const LVL_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const RADAR_SIZE = 400
const CENTER = RADAR_SIZE / 2
const RADIUS = 140

/**
 * Premium Gamification Dashboard
 * Visualizes level progress and a multi-dimension radar chart.
 */
export default function GamificationDashboard({ stats, onCheckIn, interviews, viewMode }) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('radar')
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Calculate Radar polygon points
  const points = useMemo(() => {
    // Merge real stats with some placeholders for the 2 new dimensions
    const mockRadar = { 
      ...stats?.radar, 
      portfolio: stats?.radar?.resume || 5, 
      networking: stats?.radar?.softSkills || 4 
    }
    
    return DIMENSIONS.map((d, i) => {
      const angle = (Math.PI * 2 / DIMENSIONS.length) * i - Math.PI / 2
      const value = mockRadar[d.key] || 0
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
  
  const radarPanel = (
    <div className={`p-8 flex flex-col items-center justify-center ${viewMode === 'radarOnly' ? '' : 'bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800'}`}>
      {!viewMode && (
        <div className="flex items-center justify-between w-full mb-8">
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
      )}

      <div className="relative">
        <svg width={RADAR_SIZE} height={RADAR_SIZE} className="overflow-visible">
          <defs>
            <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.3" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          
          {/* Circular Grids for a more 'premium' feel */}
          {[0.2, 0.4, 0.6, 0.8, 1].map((scale, i) => (
            <circle 
              key={i} 
              cx={CENTER} 
              cy={CENTER} 
              r={RADIUS * scale} 
              fill="none" 
              stroke="currentColor" 
              className="text-slate-100 dark:text-slate-800" 
              strokeWidth="1" 
            />
          ))}
          
          {/* Axis lines (Guides) */}
          {DIMENSIONS.map((_, i) => {
            const angle = (Math.PI * 2 / DIMENSIONS.length) * i - Math.PI / 2
            const x2 = CENTER + RADIUS * Math.cos(angle)
            const y2 = CENTER + RADIUS * Math.sin(angle)
            return (
              <line 
                key={i} 
                x1={CENTER} 
                y1={CENTER} 
                x2={x2} 
                y2={y2} 
                stroke="currentColor" 
                className="text-slate-100 dark:text-slate-800" 
                strokeWidth="1" 
                strokeDasharray="4,4" 
              />
            )
          })}

          {/* Value Polygon */}
          <motion.polygon 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            points={points} 
            fill="url(#radarGradient)"
            stroke="currentColor" 
            className="text-primary-500 transition-all duration-1000 ease-out"
            strokeWidth="2.5" 
            strokeLinejoin="round"
            filter="url(#glow)"
          />

          {/* Intersection Points */}
          {DIMENSIONS.map((d, i) => {
            const mockRadar = { 
              ...stats?.radar, 
              portfolio: stats?.radar?.resume || 5, 
              networking: stats?.radar?.softSkills || 4 
            }
            const angle = (Math.PI * 2 / DIMENSIONS.length) * i - Math.PI / 2
            const value = mockRadar[d.key] || 0
            const length = (value / 10) * RADIUS
            const x = CENTER + length * Math.cos(angle)
            const y = CENTER + length * Math.sin(angle)
            return (
              <circle 
                key={i} 
                cx={x} 
                cy={y} 
                r="4.5" 
                className="fill-white dark:fill-slate-900 stroke-primary-500 stroke-[2.5px]" 
              />
            )
          })}
        </svg>

        {/* Labels with enhanced styling */}
        {DIMENSIONS.map((d, i) => {
          const mockRadar = { 
            ...stats?.radar, 
            portfolio: stats?.radar?.resume || 5, 
            networking: stats?.radar?.softSkills || 4 
          }
          const angle = (Math.PI * 2 / DIMENSIONS.length) * i - Math.PI / 2
          const r = RADIUS + 55
          const x = CENTER + r * Math.cos(angle)
          const y = CENTER + r * Math.sin(angle)
          const val = (mockRadar[d.key] || 0) * 10
          
          return (
            <motion.div 
              key={i} 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 text-center" 
              style={{ left: x, top: y }}
            >
              <div className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-1.5 whitespace-nowrap drop-shadow-sm">
                {t(d.label)}
              </div>
              <div className="inline-flex h-6 flex-nowrap items-center px-2.5 rounded-full bg-slate-900/5 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 text-[11px] font-black text-primary-600 dark:text-primary-400 backdrop-blur-sm">
                <span className="tabular-nums">{val}%</span>
              </div>
            </motion.div>
          )
        })}
      </div>

      {!viewMode && (
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full mt-12 btn-setup-action-pill px-6 py-4"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {stats?.alreadyCheckedIn ? t('profile.game.checkInDoneBtn') : t('profile.game.checkInBtn')}
        </button>
      )}
    </div>
  )

  if (viewMode === 'radarOnly') return radarPanel

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Radar Panel */}
      <div className="lg:col-span-4 self-start">
        {radarPanel}
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
