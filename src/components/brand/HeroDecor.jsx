/**
 * Hero 背景装饰。
 *
 * 拆成两种实现，而不是切一张背景图：
 *   - 半透明柔光紫圆 → CSS（改尺寸/位置最方便）
 *   - 点状圆弧 / 椭圆轨道 / 像素方块 → 内联 SVG（矢量清晰、坐标好控）
 *
 * 每个几何元素都是**独立定位的小 SVG**，而不是一个铺满全屏的大 viewBox。
 * 大 viewBox 配 slice 会随视口缩放漂移，元素很容易正好落到浮窗底下看不见。
 * 独立定位则能稳稳落在留白区里。
 *
 * 三条纪律（这套风格很容易做过头）：
 *   1. 元素少、位置讲究——只有柔光圆、点状弧、椭圆轨道、像素块四组。
 *   2. 透明度压低：柔光圆 ≤0.16、椭圆线 0.7、点状弧 0.8，只有像素块是实色。
 *   3. 不加重阴影，层次靠留白和描边。
 *
 * 颜色全部走 brand-* 变量，深色模式自动跟随，不写死 hex。
 */

/** 像素方块坐标表。抽成数据是为了以后调位置不用动 JSX。 */
const PIXELS = [
  { x: 54, y: 0, c: 'lime' },
  { x: 72, y: 0, c: 'ink' },

  { x: 36, y: 18, c: 'violet' },
  { x: 54, y: 18, c: 'ink' },
  { x: 72, y: 18, c: 'violet' },
  { x: 90, y: 18, c: 'lime' },

  { x: 18, y: 36, c: 'ink' },
  { x: 36, y: 36, c: 'violet' },
  { x: 54, y: 36, c: 'lime' },
  { x: 72, y: 36, c: 'ink' },

  { x: 0, y: 54, c: 'violet' },
  { x: 18, y: 54, c: 'ink' },
  { x: 36, y: 54, c: 'violet' },
]

const FILL = {
  ink: 'rgb(var(--brand-ink))',
  violet: 'rgb(var(--brand-violet))',
  lime: 'rgb(var(--brand-lime))',
}

export default function HeroDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">

      {/* 柔光紫圆：纯 CSS 径向渐变。用渐变而不是实心圆 + 透明度，
          否则在深色底上会露出一圈硬边。峰值透明度压在 0.16 以内。 */}
      <div className="absolute right-[8%] -top-[70px] h-[260px] w-[260px] rounded-full bg-[radial-gradient(circle,rgb(var(--brand-glow)/0.16),transparent_70%)]" />
      <div className="absolute right-[22%] -top-[30px] h-[190px] w-[190px] rounded-full bg-[radial-gradient(circle,rgb(var(--brand-glow)/0.11),transparent_70%)]" />
      <div className="absolute -left-[8%] top-[42%] h-[300px] w-[300px] rounded-full bg-[radial-gradient(circle,rgb(var(--brand-glow)/0.09),transparent_70%)]" />

      {/* 点状圆弧：落在左侧文案与右侧浮窗之间的竖向留白里 */}
      <svg
        className="absolute left-[40%] -top-[128px] hidden h-[150px] w-[150px] xl:block"
        viewBox="0 0 150 150"
        fill="none"
      >
        <path
          d="M20 78 a55 55 0 1 1 78 52"
          stroke="rgb(var(--brand-ink))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="2 14"
          opacity="0.8"
        />
        <circle cx="98" cy="130" r="4.5" fill="rgb(var(--brand-ink))" />
      </svg>

      {/* 细线椭圆轨道 + 两个节点：贴右上角，允许溢出一点 */}
      <svg
        className="absolute -right-[2%] -top-[132px] hidden h-[150px] w-[210px] lg:block"
        viewBox="0 0 210 150"
        fill="none"
      >
        <ellipse
          cx="105" cy="75" rx="78" ry="28"
          transform="rotate(-28 105 75)"
          stroke="rgb(var(--brand-ink))"
          strokeWidth="1.8"
          opacity="0.7"
        />
        <circle cx="53" cy="105" r="6" fill="rgb(var(--brand-ink))" />
        <circle cx="154" cy="48" r="6" fill="rgb(var(--brand-ink))" />
      </svg>

      {/* 像素方块：右下角浮窗下方的留白，唯一使用实色的地方 */}
      <svg
        className="absolute -bottom-[96px] right-[3%] hidden h-[110px] w-[110px] lg:block"
        viewBox="0 0 110 86"
        fill="none"
      >
        {PIXELS.map((p, i) => (
          <rect key={i} x={p.x} y={p.y} width="16" height="16" fill={FILL[p.c]} />
        ))}
      </svg>
    </div>
  )
}
