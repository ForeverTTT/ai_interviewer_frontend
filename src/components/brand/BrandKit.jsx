import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

/**
 * 首页视觉语言的公共零件。
 *
 * 风格：编辑式极简 + 几何矢量点缀 + 柔和科技感。
 * 黑白灰承担绝大部分面积，紫色（brand-violet）和荧光黄绿（brand-lime）
 * 只出现在按钮、圆点和装饰图形上。卡片用细描边而不是投影。
 *
 * 颜色一律走 brand-* token，因此深浅色由 index.css 的变量切换，
 * 这里无需写任何深色变体。
 */

/** 小标签，如 `#AI 面试练习 ◆` */
export function Tag({ children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-brand-line bg-brand-card px-4 py-1.5 text-[12px] font-semibold tracking-wide text-brand-ink ${className}`}
    >
      {children}
      <span className="h-1.5 w-1.5 rotate-45 bg-brand-violet" aria-hidden="true" />
    </span>
  )
}

/**
 * 主按钮。三种形态都带一个圆形箭头徽标——这是参考稿里最显著的特征，
 * 按钮被当成「graphic object」而不是普通矩形。
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
}) {
  const shell = {
    ink: 'bg-brand-ink text-brand-on-ink border-brand-ink',
    /* 原来是荧光绿底 + 黑字，现在换成品牌紫底 + 白字（quiet-violet 自带前景色） */
    lime: 'quiet-violet border-transparent',
    outline: 'bg-brand-card text-brand-ink border-brand-ink/25 hover:border-brand-ink',
  }[variant]

  const badge = {
    ink: 'quiet-violet',
    lime: 'bg-brand-ink text-brand-on-ink',
    outline: 'bg-brand-ink text-brand-on-ink',
  }[variant]

  const sizing = size === 'lg'
    ? 'gap-4 py-2 pl-7 pr-2 text-[15px]'
    : 'gap-3 py-1.5 pl-5 pr-1.5 text-[14px]'

  const badgeSize = size === 'lg' ? 'h-11 w-11' : 'h-9 w-9'

  const cls = `group inline-flex items-center rounded-full border font-semibold transition-transform duration-300 hover:-translate-y-0.5 active:translate-y-0 ${shell} ${sizing} ${className}`

  const inner = (
    <>
      <span className="whitespace-nowrap">{children}</span>
      <span className={`grid shrink-0 place-items-center rounded-full transition-transform duration-300 group-hover:translate-x-0.5 ${badge} ${badgeSize}`}>
        <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
      </span>
    </>
  )

  if (as === 'a') return <a href={href} onClick={onClick} className={cls}>{inner}</a>
  if (as === 'button') return <button type="button" onClick={onClick} className={cls}>{inner}</button>
  return <Link to={to} onClick={onClick} className={cls}>{inner}</Link>
}

/** 区块标题：可选徽标 + 大字标题 + 副标题，左对齐或居中 */
export function SectionHead({ badge, title, sub, align = 'center', className = '' }) {
  const alignCls = align === 'left' ? 'items-start text-left' : 'items-center text-center'
  return (
    <header className={`flex flex-col gap-5 ${alignCls} ${className}`}>
      {badge && (
        <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-brand-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-violet" aria-hidden="true" />
          {badge}
        </span>
      )}
      <h2 className="font-brand text-[34px] font-black leading-[1.12] tracking-tight text-brand-ink sm:text-[46px] lg:text-[54px]">
        {title}
      </h2>
      {sub && (
        <p className={`text-[15px] leading-relaxed text-brand-muted sm:text-[17px] ${align === 'center' ? 'max-w-2xl' : 'max-w-xl'}`}>
          {sub}
        </p>
      )}
    </header>
  )
}

/** 品牌字标，供标题内联使用 */
export function WordMark() {
  return (
    <span className="whitespace-nowrap font-brand tracking-tight">
      Land<span className="italic text-brand-violet">It</span>
    </span>
  )
}

/** 细描边卡片。不用投影，靠描边和底色分层。 */
export function BrandCard({ children, className = '', as: Tag_ = 'div' }) {
  return (
    <Tag_ className={`rounded-[22px] border border-brand-line bg-brand-card ${className}`}>
      {children}
    </Tag_>
  )
}

/**
 * 像素散点装饰。参考稿里反复出现的方块碎片，
 * 密度从一角向外递减，用确定性算法生成，避免每次渲染抖动。
 */
export function PixelScatter({ className = '', seed = 7 }) {
  const cells = []
  let n = seed
  const rand = () => {
    n = (n * 1103515245 + 12345) % 2147483648
    return n / 2147483648
  }
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      // 越靠右下越密集
      if (rand() > (row + col) / 16) continue
      const r = rand()
      const fill = r > 0.72 ? 'rgb(var(--brand-lime))' : r > 0.38 ? 'rgb(var(--brand-violet))' : 'rgb(var(--brand-ink))'
      cells.push(
        <rect key={`${row}-${col}`} x={col * 13} y={row * 13} width="10" height="10" fill={fill} />,
      )
    }
  }
  return (
    <svg viewBox="0 0 104 104" className={className} aria-hidden="true" focusable="false">
      {cells}
    </svg>
  )
}

/** 点阵轨道装饰：虚线圆 + 一个实心点，参考稿里用来做「轨迹」意象 */
export function DottedOrbit({ className = '' }) {
  return (
    <svg viewBox="0 0 160 160" className={className} aria-hidden="true" focusable="false">
      <circle
        cx="80" cy="80" r="66"
        fill="none"
        stroke="rgb(var(--brand-ink))"
        strokeWidth="2"
        strokeDasharray="1 9"
        strokeLinecap="round"
        opacity="0.55"
      />
      <circle
        cx="80" cy="80" r="44"
        fill="none"
        stroke="rgb(var(--brand-violet))"
        strokeWidth="1.5"
        strokeDasharray="1 7"
        strokeLinecap="round"
        opacity="0.5"
      />
      <circle cx="80" cy="14" r="5" fill="rgb(var(--brand-ink))" />
      <circle cx="124" cy="80" r="4" fill="rgb(var(--brand-violet))" />
      <circle cx="46" cy="112" r="3.5" fill="rgb(var(--brand-lime))" />
    </svg>
  )
}

/**
 * 霓虹光晕。参考稿在左上、右上、右下各有一团发光色斑，
 * 是这套视觉里唯一大面积用到品牌色的地方——但始终是模糊的、低饱和度呈现。
 *
 * @param {'violet'|'lime'|'mix'} tone
 */
export function NeonGlow({ className = '', tone = 'violet', intensity = 0.5 }) {
  const gradient = {
    violet: `radial-gradient(circle at 50% 50%, rgb(var(--brand-violet) / ${intensity}), transparent 68%)`,
    lime: `radial-gradient(circle at 50% 50%, rgb(var(--brand-lime) / ${intensity}), transparent 68%)`,
    mix: `radial-gradient(circle at 34% 32%, rgb(var(--brand-violet) / ${intensity}), transparent 62%), radial-gradient(circle at 72% 70%, rgb(var(--brand-lime) / ${intensity * 0.7}), transparent 60%)`,
  }[tone]

  /**
   * 注意 z-index：不能用 -z-10。父级带 bg-brand-paper 的元素会把负层级的光晕
   * 整个盖住（上一版就是这样，光晕完全看不见）。这里留在 z-0，由内容层加 relative z-10。
   */
  return (
    <div
      className={`pointer-events-none absolute z-0 rounded-full blur-[100px] ${className}`}
      style={{ backgroundImage: gradient }}
      aria-hidden="true"
    />
  )
}

/** 编号标签，用于流程/清单类内容 */
export function IndexBadge({ n }) {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-brand-ink text-[12px] font-bold tabular-nums text-brand-ink">
      {String(n).padStart(2, '0')}
    </span>
  )
}
