import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

const DIMENSIONS = [
  { key: 'executing', label: 'gallup.domains.executing' },
  { key: 'influencing', label: 'gallup.domains.influencing' },
  { key: 'relationship', label: 'gallup.domains.relationship' },
  { key: 'strategic', label: 'gallup.domains.strategic' }
]

const RADAR_SIZE = 440
const CENTER = RADAR_SIZE / 2
const RADIUS = 120

export default function GallupRadar({ domainMap }) {
  const { t } = useTranslation()

  const points = useMemo(() => {
    return DIMENSIONS.map((d, i) => {
      const angle = (Math.PI * 2 / DIMENSIONS.length) * i - Math.PI / 2
      const value = domainMap[d.key] || 0
      const length = (value / 100) * RADIUS
      const x = CENTER + length * Math.cos(angle)
      const y = CENTER + length * Math.sin(angle)
      return `${x},${y}`
    }).join(" ")
  }, [domainMap])

  return (
    <div className="flex flex-col items-center justify-center py-6 w-full max-w-full">
      <div className="relative w-full aspect-square" style={{ maxWidth: RADAR_SIZE }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`} className="overflow-visible absolute inset-0">
          <defs>
            <linearGradient id="gallupRadarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.5" />
            </linearGradient>
            <filter id="gallupGlow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Circular Grids - Using circles for the background looks smoother */}
          {[0.25, 0.5, 0.75, 1].map((scale, i) => (
            <circle
              key={i}
              cx={CENTER}
              cy={CENTER}
              r={RADIUS * scale}
              fill="none"
              stroke="currentColor"
              className="text-slate-200 dark:text-slate-700 opacity-80"
              strokeWidth="1.5"
              strokeDasharray={scale === 1 ? "none" : "4,4"}
            />
          ))}

          {/* Axis lines */}
          {DIMENSIONS.map((_, i) => {
            const angle = (Math.PI * 2 / DIMENSIONS.length) * i - Math.PI / 2
            const x2 = CENTER + RADIUS * Math.cos(angle)
            const y2 = CENTER + RADIUS * Math.sin(angle)
            return (
              <line
                key={`axis-${i}`}
                x1={CENTER}
                y1={CENTER}
                x2={x2}
                y2={y2}
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-700 opacity-80"
                strokeWidth="1.5"
              />
            )
          })}

          {/* Value Polygon */}
          <motion.polygon
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            points={points}
            fill="url(#gallupRadarGradient)"
            stroke="#d946ef"
            className="transition-all duration-1000 ease-out"
            strokeWidth="3.5"
            strokeLinejoin="round"
            filter="url(#gallupGlow)"
          />

          {/* Intersection Points */}
          {DIMENSIONS.map((d, i) => {
            const angle = (Math.PI * 2 / DIMENSIONS.length) * i - Math.PI / 2
            const value = domainMap[d.key] || 0
            const length = (value / 100) * RADIUS
            const x = CENTER + length * Math.cos(angle)
            const y = CENTER + length * Math.sin(angle)
            return (
              <circle
                key={`point-${i}`}
                cx={x}
                cy={y}
                r="6"
                className="fill-white dark:fill-slate-900 stroke-fuchsia-500 stroke-[3.5px]"
              />
            )
          })}
        </svg>

        {/* Labels Layer (overlay on the precise aspect-square container boundaries) */}
        <div className="absolute inset-0 pointer-events-none">
          {DIMENSIONS.map((d, i) => {
            const titleStr = t(d.label)
            let mainLabel = titleStr
            let subLabel = null
            if (titleStr.includes(' (')) {
              const parts = titleStr.split(' (')
              mainLabel = parts[0]
              subLabel = parts[1].replace(')', '')
            }
            const val = domainMap[d.key] || 0

            let xOffset = 0
            let yOffset = 0
            let containerClass = ""
            
            // Distance from outer grid (RADIUS). Must be enough for wide German strings!
            const gapHorizontal = 35 
            const gapVertical = 30

            // Anchor points mapping to quadrants so text pushes OUT of the center radially
            if (i === 0) { // Top
              xOffset = CENTER
              yOffset = CENTER - RADIUS - gapVertical
              containerClass = "-translate-x-1/2 -translate-y-full items-center text-center"
            } else if (i === 1) { // Right
              xOffset = CENTER + RADIUS + gapHorizontal
              yOffset = CENTER
              containerClass = "translate-y-[-50%] items-start text-left"
            } else if (i === 2) { // Bottom
              xOffset = CENTER
              yOffset = CENTER + RADIUS + gapVertical
              containerClass = "-translate-x-1/2 items-center text-center"
            } else if (i === 3) { // Left
              xOffset = CENTER - RADIUS - gapHorizontal
              yOffset = CENTER
              containerClass = "-translate-x-full translate-y-[-50%] items-end text-right"
            }

            return (
              <motion.div
                key={`label-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className={`absolute flex flex-col pointer-events-auto ${containerClass}`}
                style={{ left: `${(xOffset / RADAR_SIZE) * 100}%`, top: `${(yOffset / RADAR_SIZE) * 100}%` }}
              >
                <div className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest whitespace-nowrap drop-shadow-sm flex flex-col leading-tight mb-2">
                  <span className="text-[14px] sm:text-[15px]">{mainLabel}</span>
                  {subLabel && <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{subLabel}</span>}
                </div>
                <div className="inline-flex h-7 flex-nowrap items-center px-3 rounded-full bg-fuchsia-50 dark:bg-fuchsia-950/40 border border-fuchsia-100 dark:border-fuchsia-900/60 text-xs font-black text-fuchsia-600 dark:text-fuchsia-400 backdrop-blur-sm shadow-sm opacity-90">
                  <span className="tabular-nums">{val}%</span>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

