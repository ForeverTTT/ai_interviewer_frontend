import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { ArrowRight, ArrowUpRight } from 'lucide-react'

/**
 * LandIt · Harbor 视觉语言的公共零件。
 *
 * 大面积是薄雾纸色和白卡片；深港蓝承担交互；赭黄只给最重要的那个按钮和少量高光；
 * 标题用 Fraunces / 思源宋体做编辑感。颜色一律走 brand-* token，深浅色由 index.css 切换。
 */

/** 小标签，如 `AI 面试官 · 实时追问` */
export function Tag({ children, className = '', tone = 'glass' }) {
  const toneCls = tone === 'glass'
    ? 'lk-glass text-brand-ink'
    : 'border border-brand-line bg-brand-card text-brand-ink'
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-semibold tracking-wide ${toneCls} ${className}`}>
      <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-ochre opacity-60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-ochre" />
      </span>
      {children}
    </span>
  )
}

/**
 * 主按钮。
 *   ink     深港蓝实心（默认主操作）
 *   lime    赭黄强调（每屏最多一个；历史命名保留）
 *   outline 半透明描边
 */
export function BrandButton({
  as = 'link',
  to,
  href,
  onClick,
  variant = 'ink',
  size = 'md',
  children,
  className = '',
  icon = 'arrow',
}) {
  const shell = {
    ink: 'lk-btn-primary',
    lime: 'lk-btn-accent',
    accent: 'lk-btn-accent',
    outline: 'lk-btn-ghost',
  }[variant] || 'lk-btn-primary'

  const sizing = size === 'lg' ? 'lk-btn-lg' : ''
  const Icon = icon === 'external' ? ArrowUpRight : ArrowRight
  const iconBg = variant === 'ink' ? 'bg-white/15 dark:bg-black/10' : 'bg-black/[0.07] dark:bg-white/10'

  const cls = `lk-btn group ${shell} ${sizing} ${className}`

  const inner = (
    <>
      <span>{children}</span>
      {icon && (
        <span className={`relative -mr-1 grid h-6 w-6 place-items-center overflow-hidden rounded-full ${iconBg}`}>
          <Icon className="h-4 w-4 transition-transform duration-300 ease-out-soft group-hover:translate-x-[3px]" strokeWidth={2.25} />
        </span>
      )}
    </>
  )

  if (as === 'a') return <a href={href} onClick={onClick} className={cls}>{inner}</a>
  if (as === 'button') return <button type="button" onClick={onClick} className={cls}>{inner}</button>
  return <Link to={to} onClick={onClick} className={cls}>{inner}</Link>
}

/** 区块标题：眉标 + 衬线大标题 + 副标题，左对齐或居中 */
export function SectionHead({ badge, title, sub, align = 'center', className = '', tone = 'default' }) {
  const alignCls = align === 'left' ? 'items-start text-left' : 'items-center text-center'
  const onDark = tone === 'dark'
  return (
    <header className={`flex flex-col gap-5 ${alignCls} ${className}`}>
      {badge && (
        <span className={`lk-eyebrow ${onDark ? '!text-white/60' : ''}`}>
          {badge}
        </span>
      )}
      <h2 className={`lk-display text-[34px] leading-[1.12] sm:text-[44px] lg:text-[52px] ${onDark ? '!text-white' : ''}`}>
        {title}
      </h2>
      {sub && (
        <p className={`text-[15px] leading-relaxed sm:text-[16.5px] ${onDark ? 'text-white/65' : 'text-brand-muted'} ${align === 'center' ? 'max-w-2xl' : 'max-w-xl'}`}>
          {sub}
        </p>
      )}
    </header>
  )
}

/** 品牌字标，供标题内联使用：标题里用斜体衬线的 It 呼应标志 */
export function WordMark({ className = '' }) {
  return (
    <span className={`whitespace-nowrap ${className}`}>
      Land<span className="italic text-brand-harbor">It</span>
    </span>
  )
}

/** 细描边卡片 */
export function BrandCard({ children, className = '', as: Tag_ = 'div' }) {
  return (
    <Tag_ className={`brand-float ${className}`}>
      {children}
    </Tag_>
  )
}

/** 编号标签，用于流程 / 清单类内容 */
export function IndexBadge({ n, className = '' }) {
  return (
    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border border-brand-line bg-brand-card font-display text-[14px] font-semibold tabular-nums text-brand-ink ${className}`}>
      {String(n).padStart(2, '0')}
    </span>
  )
}

/**
 * 3D 倾斜卡片：鼠标悬停时按指针位置做极小角度的透视旋转，并带一块跟随的柔光。
 * 角度上限 5°，只让卡片「有厚度」，不做夸张的翻转。触屏设备不触发。
 */
export function TiltCard({ children, className = '', max = 5, glare = true, as = 'div', ...rest }) {
  const ref = useRef(null)
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const rx = useSpring(useTransform(py, [0, 1], [max, -max]), { stiffness: 180, damping: 18 })
  const ry = useSpring(useTransform(px, [0, 1], [-max, max]), { stiffness: 180, damping: 18 })
  const glareBg = useTransform(
    [px, py],
    ([x, y]) => `radial-gradient(420px circle at ${x * 100}% ${y * 100}%, rgb(255 255 255 / 0.22), transparent 45%)`,
  )
  const MotionTag = motion[as] || motion.div

  const onMove = (e) => {
    if (e.pointerType === 'touch') return
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    px.set((e.clientX - rect.left) / rect.width)
    py.set((e.clientY - rect.top) / rect.height)
  }
  const onLeave = () => {
    px.set(0.5)
    py.set(0.5)
  }

  return (
    <div className="lk-perspective h-full">
      <MotionTag
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d' }}
        className={`group/tilt relative h-full ${className}`}
        {...rest}
      >
        {children}
        {glare && (
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/tilt:opacity-100"
            style={{ background: glareBg }}
          />
        )}
      </MotionTag>
    </div>
  )
}

/** 进入视口时上浮淡入；once 保证只播一次 */
export function Reveal({ children, delay = 0, y = 18, className = '', as = 'div' }) {
  const MotionTag = motion[as] || motion.div
  return (
    <MotionTag
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.75, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </MotionTag>
  )
}
