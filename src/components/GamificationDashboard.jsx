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
/**
 * 雷达图坐标系尺寸。图形本身通过 viewBox 缩放，RADAR_SIZE 只是坐标空间的边长，
 * 不再作为写死的像素宽度使用（否则窄屏会被父卡片的 overflow-hidden 裁掉）。
 */
const RADAR_SIZE = 400
const CENTER = RADAR_SIZE / 2
const RADIUS = 120
/** 轴标签落点半径：留出 18px 让文字贴着最外圈但不压到多边形上 */
const LABEL_RADIUS = RADIUS + 18

/** 六个轴的标签锚点，按象限把文字推向外侧，避免和图形重叠 */
function labelAnchorClass(i) {
  if (i === 0) return '-translate-x-1/2 -translate-y-full items-center text-center'
  if (i === 3) return '-translate-x-1/2 items-center text-center'
  if (i === 1 || i === 2) return 'translate-y-[-50%] items-start text-left'
  return '-translate-x-full translate-y-[-50%] items-end text-right'
}

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
    <div className={`flex w-full max-w-full flex-col items-center justify-center ${viewMode === 'radarOnly' ? 'py-2' : 'brand-float rounded-[22px] border border-brand-line p-6'}`}>
      {!viewMode && (
        <div className="mb-6 flex w-full items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-inset text-brand-violet">
              <Target className="h-5 w-5" />
            </span>
            <h3 className="font-brand text-[18px] font-semibold tracking-tight text-brand-ink">{t('profile.game.radarTitle')}</h3>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-brand-line bg-brand-inset px-3 py-1">
            <Flame className="h-4 w-4 text-brand-violet" />
            <span className="text-[13px] font-bold tabular-nums text-brand-ink">{stats?.streak || 0}</span>
          </div>
        </div>
      )}

      {/* 左右留白给轴标签，标签溢出 aspect-square 时落在 padding 里而不会被裁切 */}
      <div className="w-full max-w-full px-6 sm:px-10">
        <div className="relative mx-auto aspect-square w-full" style={{ maxWidth: RADAR_SIZE }}>
          {/* viewBox + 100% 宽高：图形随容器等比缩放，不再有 400px 硬宽度 */}
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}
            className="absolute inset-0 overflow-visible"
          >
            {/* Circular Grids for a more 'premium' feel */}
            {[0.2, 0.4, 0.6, 0.8, 1].map((scale, i) => (
              <circle
                key={i}
                cx={CENTER}
                cy={CENTER}
                r={RADIUS * scale}
                fill="none"
                className="stroke-brand-line"
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
                  className="stroke-brand-line"
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
              className="fill-brand-violet/[0.16] stroke-brand-violet transition-all duration-1000 ease-out"
              strokeWidth="2.5"
              strokeLinejoin="round"
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
                  className="fill-brand-card stroke-brand-violet stroke-[2.5px]"
                />
              )
            })}
          </svg>

          {/* Labels with enhanced styling —— 百分比定位，跟着 viewBox 一起缩放 */}
          <div className="pointer-events-none absolute inset-0">
            {DIMENSIONS.map((d, i) => {
              const mockRadar = {
                ...stats?.radar,
                portfolio: stats?.radar?.resume || 5,
                networking: stats?.radar?.softSkills || 4
              }
              const angle = (Math.PI * 2 / DIMENSIONS.length) * i - Math.PI / 2
              const x = CENTER + LABEL_RADIUS * Math.cos(angle)
              const y = CENTER + LABEL_RADIUS * Math.sin(angle)
              const val = (mockRadar[d.key] || 0) * 10

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className={`pointer-events-auto absolute flex flex-col ${labelAnchorClass(i)}`}
                  style={{ left: `${(x / RADAR_SIZE) * 100}%`, top: `${(y / RADAR_SIZE) * 100}%` }}
                >
                  <div className="mb-1 whitespace-nowrap text-[11.5px] font-bold leading-tight text-brand-ink">
                    {t(d.label)}
                  </div>
                  <div className="inline-flex h-6 flex-nowrap items-center rounded-full border border-brand-line bg-brand-inset px-2.5 text-[11px] font-bold text-brand-ink">
                    <span className="tabular-nums">{val}%</span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>

      {!viewMode && (
        <button
          onClick={() => setIsModalOpen(true)}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-ink px-6 py-3.5 text-[14px] font-semibold text-brand-on-ink transition-opacity duration-200 hover:opacity-90"
        >
          <Sparkles className="h-4 w-4" />
          {stats?.alreadyCheckedIn ? t('profile.game.checkInDoneBtn') : t('profile.game.checkInBtn')}
        </button>
      )}
    </div>
  )

  if (viewMode === 'radarOnly') return radarPanel

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Radar Panel */}
      <div className="self-start lg:col-span-4">
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
      <div className="space-y-6 lg:col-span-8">
        <div className="brand-float rounded-[22px] border border-brand-line p-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 font-brand text-[18px] font-semibold tracking-tight text-brand-ink">
              <Zap className="h-4 w-4 text-brand-violet" />
              {t('profile.game.lvlMap')}
            </h3>
            <span className="shrink-0 rounded-full border border-brand-line bg-brand-inset px-2.5 py-1 text-[11px] font-bold text-brand-muted">Lvl {currentLvl}</span>
          </div>

          <div className="flex snap-x gap-6 overflow-x-auto pb-4 scrollbar-hide">
            {LVL_IDS.map((lvl) => {
              const isDone = lvl < currentLvl
              const isActive = lvl === currentLvl
              return (
                <div key={lvl} className="flex min-w-[100px] snap-center flex-col items-center space-y-3">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className={`relative flex h-14 w-14 items-center justify-center rounded-2xl border transition-colors ${
                      isActive ? 'border-brand-ink bg-brand-ink text-brand-on-ink' :
                      isDone ? 'border-brand-line bg-brand-inset text-brand-ink' :
                      'border-brand-line bg-brand-card text-brand-muted'
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="h-6 w-6" /> : <span className="text-[17px] font-semibold">{lvl}</span>}
                  </motion.div>
                  <span className={`max-w-[80px] text-center text-[11px] font-bold leading-tight ${
                    isActive ? 'text-brand-ink' : 'text-brand-muted'
                  }`}>
                    {t(`profile.game.lvls.${lvl}`)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="group flex flex-col items-center justify-between gap-6 rounded-[22px] border border-brand-line bg-brand-inset p-6 transition-colors hover:border-brand-ink md:flex-row">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[12.5px] font-bold text-brand-violet">
              <Sparkles className="h-4 w-4" />
              {t('profile.game.nextQuest')}
            </div>
            <h4 className="font-brand text-[22px] font-semibold leading-tight tracking-tight text-brand-ink">
              {t('profile.game.nextLvChallenge', { lvl: currentLvl + 1 })}
            </h4>
            <p className="text-[13px] leading-relaxed text-brand-muted">
              {stats?.nextLevelQuest ? t(`profile.game.quests.${stats.nextLevelQuest}`) : 'Keep practice!'}
            </p>
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-brand-line bg-brand-card text-brand-muted transition-colors group-hover:text-brand-violet">
            <ChevronRight className="h-6 w-6" />
          </div>
        </div>
      </div>
    </div>
  )
}
