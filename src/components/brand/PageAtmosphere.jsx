import harborScene from '../../assets/background.jpg'

/**
 * 内页的「大气层」：把首页插画的天际线以极低不透明度铺在页面顶部，再向下渐隐进纸色。
 * 每个内页因此都和首页处在同一片港口里，而不是一张张孤立的白底表单。
 *
 * 整层用一个遮罩统一淡出（插画、薄雾、颗粒一起），底部不会出现硬边。
 * 只做背景，不接收指针事件；深色模式下更暗，保证正文对比度。
 */
const FADE = 'linear-gradient(to bottom, black 0%, rgb(0 0 0 / 0.85) 30%, rgb(0 0 0 / 0.35) 62%, transparent 100%)'

export default function PageAtmosphere({ variant = 'harbor' }) {
  if (variant === 'flowlab') {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[520px] overflow-hidden"
        style={{ maskImage: FADE, WebkitMaskImage: FADE }}
      >
        <div className="absolute -left-20 -top-28 h-[360px] w-[360px] rounded-full bg-brand-glow/20 blur-[70px]" />
        <div className="absolute -right-16 -top-24 h-[360px] w-[360px] rounded-full bg-[#FEB7C9]/20 blur-[72px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-brand-paper/55 to-brand-paper/95" />
      </div>
    )
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[560px] overflow-hidden"
      style={{ maskImage: FADE, WebkitMaskImage: FADE }}
    >
      <div
        className="absolute inset-0 scale-105 bg-cover opacity-[0.26] blur-[1.5px] saturate-[1.15] dark:opacity-[0.10]"
        style={{ backgroundImage: `url(${harborScene})`, backgroundPosition: 'center 22%' }}
      />
      {/* 一层纸色薄雾，把插画压成水彩般的底纹，保证标题可读 */}
      <div className="absolute inset-0 bg-gradient-to-b from-brand-paper/25 via-brand-paper/60 to-brand-paper/90" />
      <div className="lk-grain absolute inset-0 opacity-[0.22] mix-blend-multiply dark:opacity-[0.1] dark:mix-blend-screen" />
    </div>
  )
}
