import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useMotionValue, useScroll, useSpring, useTransform } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import HarborStage, { mapImagePoint } from '../brand/HarborStage'
import { BrandButton, Tag } from '../brand/BrandKit'
import { useMediaQuery } from '../../hooks/useMediaQuery'

/**
 * 首页主视觉。
 *
 * 插画里右侧两个人正坐着交谈——这本身就是一场面试。于是对话气泡直接「长」在他们头顶：
 * 面试官提问 → 你作答 → 实时评分，循环播放。气泡按图片坐标定位，视口怎么裁切都跟着人走。
 *
 * 桌面端：整幅插画铺满首屏，左侧用纸色渐隐承托文案。
 * 移动端：文案在上，插画作为一张圆角大卡片放在下面，焦点偏向右侧那两个人。
 */

/* 插画里两个人头顶的位置（图片坐标 0..1），用来钉住对话气泡 */
const INTERVIEWER_HEAD = [0.835, 0.535]
const CANDIDATE_HEAD = [0.765, 0.53]

const positions = [
  'Werkstudent Software Engineer', 'Praktikum Data Science',
  'Working Student UX Design', 'Praktikum Marketing',
  'Werkstudent Maschinenbau', 'Praktikum Consulting',
]

const ease = [0.16, 1, 0.3, 1]

function useTypewriter(text, active, cps = 26) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!active) { setCount(0); return undefined }
    setCount(0)
    const chars = Array.from(text)
    let i = 0
    const id = window.setInterval(() => {
      i += 1
      setCount(i)
      if (i >= chars.length) window.clearInterval(id)
    }, 1000 / cps)
    return () => window.clearInterval(id)
  }, [text, active, cps])
  return Array.from(text).slice(0, count).join('')
}

function useElementSize(ref) {
  const [size, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return size
}

/** 对话气泡：尾巴指向说话人的头顶；tailAt 是尾巴在气泡宽度上的位置 */
function SpeechBubble({ who, time, text, fullText, tone = 'interviewer', tailAt = 0.78 }) {
  const isInterviewer = tone === 'interviewer'
  return (
    <div className="relative w-[min(300px,72vw)]" style={{ transform: `translateX(${-tailAt * 100}%)` }}>
      <div className="lk-liquid rounded-[20px] px-4 py-3">
        <div className="mb-1.5 flex items-center gap-2">
          <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${isInterviewer ? 'bg-brand-ink text-brand-on-ink' : 'bg-brand-ochre text-[#22303D]'}`}>
            {who.slice(0, 1)}
          </span>
          <span className="text-[11.5px] font-semibold text-brand-ink">{who}</span>
          <span className="ml-auto text-[10.5px] tabular-nums text-brand-muted">{time}</span>
        </div>
        {/* 用完整文本撑出最终高度，打字时气泡不会忽高忽低 */}
        <p className="relative text-[12.5px] leading-relaxed text-brand-ink">
          <span className="invisible">{fullText}</span>
          <span className="absolute inset-0">
            {text}
            <span className="ml-0.5 inline-block h-3 w-[2px] translate-y-0.5 animate-pulse bg-brand-ink/60 align-baseline" />
          </span>
        </p>
      </div>
      <span
        className="absolute -bottom-[7px] h-3.5 w-3.5 rotate-45 rounded-[3px] border-b border-r border-white/60 bg-brand-card/80 backdrop-blur"
        style={{ left: `calc(${tailAt * 100}% - 7px)` }}
        aria-hidden="true"
      />
    </div>
  )
}

function ScoreBubble({ label, value, dims }) {
  const r = 17
  const c = 2 * Math.PI * r
  return (
    <div className="lk-liquid flex w-[min(260px,70vw)] -translate-x-[70%] items-center gap-3 rounded-[20px] px-4 py-3">
      <div className="relative grid h-12 w-12 shrink-0 place-items-center">
        <svg viewBox="0 0 44 44" className="h-full w-full -rotate-90">
          <circle cx="22" cy="22" r={r} fill="none" stroke="rgb(var(--brand-line))" strokeWidth="4" />
          <motion.circle
            cx="22" cy="22" r={r} fill="none" stroke="rgb(var(--brand-lime))" strokeWidth="4" strokeLinecap="round"
            initial={{ strokeDasharray: `0 ${c}` }}
            animate={{ strokeDasharray: `${(c * value) / 100} ${c}` }}
            transition={{ duration: 1.2, ease }}
          />
        </svg>
        <span className="absolute text-[13px] font-bold tabular-nums text-brand-ink">{value}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] font-semibold text-brand-ink">{label}</p>
        <div className="mt-1.5 space-y-1">
          {dims.map(d => (
            <div key={d.label} className="flex items-center gap-2 text-[10.5px] text-brand-muted">
              <span className="w-[68px] truncate">{d.label}</span>
              <span className="h-1 flex-1 overflow-hidden rounded-full bg-brand-line">
                <motion.span
                  className="block h-full rounded-full bg-brand-harbor"
                  initial={{ width: 0 }}
                  animate={{ width: `${d.score}%` }}
                  transition={{ duration: 1, delay: 0.2, ease }}
                />
              </span>
              <span className="w-5 text-right font-semibold tabular-nums text-brand-ink">{d.score}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** 钉在插画人物头顶的对话层；随指针做一点点反向位移，和 WebGL 景深同向 */
function ConversationLayer({ stageRef, focus, px, py }) {
  const { t } = useTranslation()
  const size = useElementSize(stageRef)
  const [step, setStep] = useState(0)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    try { setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches) } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (reduced) { setStep(1); return undefined }
    const durations = [5200, 5200, 4200]
    const id = window.setTimeout(() => setStep(s => (s + 1) % 3), durations[step])
    return () => window.clearTimeout(id)
  }, [step, reduced])

  const line1 = t('landing.demo.line1')
  const line2 = t('landing.demo.line2')
  const typed1 = useTypewriter(line1, step === 0 && !reduced)
  const typed2 = useTypewriter(line2, step === 1 && !reduced)

  const lx = useTransform(px, v => v * -10)
  const ly = useTransform(py, v => v * -6)

  if (!size.w) return null
  const interviewer = mapImagePoint(size.w, size.h, INTERVIEWER_HEAD[0], INTERVIEWER_HEAD[1], focus)
  const candidate = mapImagePoint(size.w, size.h, CANDIDATE_HEAD[0], CANDIDATE_HEAD[1], focus)

  // 窄舞台（手机）上气泡整体往左挪，避免超出插画卡片
  const narrow = size.w < 640
  // 人物被裁出画面（极窄屏）时不显示气泡
  const visible = interviewer.x < size.w - 24 && candidate.x > 24

  const dims = [
    { label: t('landing.demo.dim2'), score: 85 },
    { label: t('landing.demo.dim1'), score: 90 },
    { label: t('landing.demo.dim4'), score: 80 },
  ]

  return (
    <motion.div className="pointer-events-none absolute inset-0 z-[2]" style={{ x: lx, y: ly }} aria-hidden="true">
      {visible && (
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="q"
              className="absolute"
              style={{ left: interviewer.x, top: interviewer.y }}
              initial={{ opacity: 0, y: -4, scale: 0.94 }}
              animate={{ opacity: 1, y: -22, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.97 }}
              transition={{ duration: 0.5, ease }}
            >
              <div className="-translate-y-full">
                <SpeechBubble who={t('landing.demo.interviewer')} time="12:45" text={typed1} fullText={line1} tone="interviewer" tailAt={narrow ? 0.9 : 0.8} />
              </div>
            </motion.div>
          )}
          {step === 1 && (
            <motion.div
              key="a"
              className="absolute"
              style={{ left: candidate.x, top: candidate.y }}
              initial={{ opacity: 0, y: -4, scale: 0.94 }}
              animate={{ opacity: 1, y: -22, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.97 }}
              transition={{ duration: 0.5, ease }}
            >
              <div className="-translate-y-full">
                <SpeechBubble who={t('landing.demo.you')} time="12:47" text={reduced ? line2 : typed2} fullText={line2} tone="candidate" tailAt={narrow ? 0.86 : 0.72} />
              </div>
            </motion.div>
          )}
          {step === 2 && (
            <motion.div
              key="s"
              className="absolute"
              style={{ left: (interviewer.x + candidate.x) / 2, top: candidate.y }}
              initial={{ opacity: 0, y: -4, scale: 0.94 }}
              animate={{ opacity: 1, y: -26, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.97 }}
              transition={{ duration: 0.5, ease }}
            >
              <div className="-translate-y-full">
                <ScoreBubble label={t('landing.demo.score')} value={86} dims={dims} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  )
}

export default function HarborHero({ ctaLink }) {
  const { t } = useTranslation()
  const sectionRef = useRef(null)
  const desktopStageWrap = useRef(null)
  const mobileStageWrap = useRef(null)
  const desktopStage = useRef(null)
  const mobileStage = useRef(null)

  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const spx = useSpring(px, { stiffness: 60, damping: 18 })
  const spy = useSpring(py, { stiffness: 60, damping: 18 })

  // 向下滚动时镜头沿着那条路往音乐厅方向推进一点，同时插画慢慢淡出
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] })
  const zoom = useTransform(scrollYProgress, [0, 1], [1, 1.14])
  const stageOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.35])
  const copyY = useTransform(scrollYProgress, [0, 1], [0, 90])

  const onPointerMove = (e) => {
    if (e.pointerType === 'touch') return
    const rect = sectionRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1
    px.set(x)
    py.set(y)
    desktopStage.current?.setPointer(x, y)
    mobileStage.current?.setPointer(x, y)
  }
  const onPointerLeave = () => {
    px.set(0)
    py.set(0)
    desktopStage.current?.setPointer(0, 0)
    mobileStage.current?.setPointer(0, 0)
  }

  const desktopFocus = DESKTOP_FOCUS
  const mobileFocus = MOBILE_FOCUS
  // 只挂载当前断点需要的那一块舞台，避免同时创建两个 WebGL 上下文
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  return (
    <section
      ref={sectionRef}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="relative isolate overflow-hidden lg:min-h-[max(700px,100svh)]"
    >
      {/* ───── 桌面端：整幅插画 ───── */}
      {isDesktop && (
        <motion.div
          ref={desktopStageWrap}
          className="absolute inset-0"
          style={{ scale: zoom, opacity: stageOpacity, transformOrigin: '58% 48%' }}
        >
          <HarborStage ref={desktopStage} className="absolute inset-0" focus={desktopFocus} />
          <div className="absolute inset-0 dark:bg-[#0E141A]/45" aria-hidden="true" />
          <ConversationLayer stageRef={desktopStageWrap} focus={desktopFocus} px={spx} py={spy} />
        </motion.div>
      )}

      {/* 左侧纸色渐隐：文案的底；底部渐隐：与下一屏自然衔接 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] hidden lg:block"
        style={{ background: 'linear-gradient(90deg, rgb(var(--brand-paper)) 0%, rgb(var(--brand-paper) / 0.94) 26%, rgb(var(--brand-paper) / 0.62) 42%, rgb(var(--brand-paper) / 0) 60%)' }}
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] hidden h-44 bg-gradient-to-t from-brand-paper via-brand-paper/60 to-transparent lg:block" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-[1] hidden h-32 bg-gradient-to-b from-brand-paper/50 to-transparent lg:block" />

      {/* ───── 文案 ───── */}
      <motion.div style={{ y: copyY }} className="ui-container relative z-10 flex items-center pb-10 pt-[calc(var(--ui-nav-h)+3rem)] lg:min-h-[max(700px,100svh)] lg:pb-28 lg:pt-[calc(var(--ui-nav-h)+1rem)]">
        <div className="max-w-[680px]">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }}>
            <Tag>{t('landing.badgePremium')}</Tag>
          </motion.div>

          <h1 className="lk-display mt-7 text-[40px] leading-[1.1] sm:text-[52px] lg:text-[58px] xl:text-[64px]">
            <motion.span
              className="block"
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.08, ease }}
            >
              {t('landing.headline1')}
            </motion.span>
            <motion.span
              className="relative inline-block"
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.18, ease }}
            >
              <span className="relative z-10">{t('landing.headline2')}</span>
              {/* 手绘感的赭黄下划线，像把目标圈出来 */}
              <svg className="absolute -bottom-2 left-0 z-0 h-[0.42em] w-full overflow-visible" viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden="true">
                <motion.path
                  d="M4 14 C 60 6, 120 4, 180 9 S 270 16, 296 7"
                  fill="none"
                  stroke="rgb(var(--brand-lime))"
                  strokeWidth="7"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.85 }}
                  transition={{ duration: 1.1, delay: 0.75, ease }}
                />
              </svg>
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease }}
            className="mt-7 max-w-[520px] text-[16px] leading-relaxed text-brand-muted sm:text-[17.5px]"
          >
            {t('landing.subNextGen')}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <BrandButton to={ctaLink} variant="lime" size="lg">
              {t('landing.ctaPrimary')}
            </BrandButton>
            <BrandButton as="a" href="#how-it-works" variant="outline" size="lg">
              {t('landing.ctaSecondary')}
            </BrandButton>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6, ease }}
            className="mt-10 flex max-w-[560px] flex-wrap gap-2"
          >
            {positions.map((pos, i) => (
              <motion.span
                key={pos}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.65 + i * 0.05, ease }}
                className="lk-chip bg-brand-card/60 backdrop-blur"
              >
                <Sparkles className="h-3 w-3 text-brand-ochre" />
                {pos}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* ───── 移动端 / 平板：插画作为卡片 ───── */}
      {!isDesktop && (
        <div className="ui-container relative z-10 pb-6">
          <div
            ref={mobileStageWrap}
            className="relative aspect-[4/3] overflow-hidden rounded-[28px] border border-brand-line shadow-float sm:aspect-[16/10]"
          >
            <HarborStage ref={mobileStage} className="absolute inset-0" focus={mobileFocus} />
            <div className="absolute inset-0 dark:bg-[#0E141A]/35" aria-hidden="true" />
            <ConversationLayer stageRef={mobileStageWrap} focus={mobileFocus} px={spx} py={spy} />
          </div>
        </div>
      )}
    </section>
  )
}

/* 常量放在组件外，保证引用稳定（HarborStage 以焦点作为 effect 依赖） */
const DESKTOP_FOCUS = [0.6, 0.5]
const MOBILE_FOCUS = [0.72, 0.56]
