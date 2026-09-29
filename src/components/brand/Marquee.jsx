/**
 * 无缝跑马灯：内容渲染两份，整体平移 -50% 后回到起点，首尾正好对齐。
 * 每份内容自带尾部间距（pr = gap），所以接缝处的间距和中间一致。
 * 悬停暂停；系统开启「减少动态效果」时停止滚动（见 index.css）。
 */
export default function Marquee({ children, duration = 60, gap = 24, reverse = false, className = '' }) {
  const copy = (key) => (
    <div key={key} className="flex shrink-0 items-stretch" style={{ gap, paddingRight: gap }} aria-hidden={key === 'b' ? 'true' : undefined}>
      {children}
    </div>
  )
  return (
    <div className={`offer-marquee-mask relative flex overflow-hidden ${className}`}>
      <div
        className="lk-marquee flex w-max hover:[animation-play-state:paused]"
        style={{ animationDuration: `${duration}s`, animationDirection: reverse ? 'reverse' : 'normal' }}
      >
        {copy('a')}
        {copy('b')}
      </div>
    </div>
  )
}
