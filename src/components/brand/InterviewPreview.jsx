import { useTranslation } from 'react-i18next'
import { Mic, Video, Square, Sparkles } from 'lucide-react'

import interviewerPortrait from '../../assets/interviewers/avatar_01/neutral.png'

/**
 * 首页主视觉：面试进行中的产品界面。
 *
 * 这里刻意用真实 DOM 搭建而不是贴一张图——图片会随品牌迭代过期（上一版就留着
 * 旧 OfferClaw 配色的截图），而 DOM 版本自动跟随 brand-* token，深浅色也一起走。
 * 所有文案走 i18n，不硬编码中文。
 */

const DIMENSIONS = [
  { key: 'dim1', score: 90 },
  { key: 'dim2', score: 85 },
  { key: 'dim3', score: 88 },
  { key: 'dim4', score: 80 },
  { key: 'dim5', score: 87 },
]

const TOTAL_SCORE = 86

function ScoreRing({ value }) {
  const r = 46
  const c = 2 * Math.PI * r
  return (
    <div className="relative grid h-[124px] w-[124px] shrink-0 place-items-center">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgb(var(--brand-line))" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={r}
          fill="none"
          stroke="rgb(var(--brand-violet))"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(c * value) / 100} ${c}`}
        />
      </svg>
      <div className="absolute flex items-baseline gap-0.5">
        <span className="text-[30px] font-black leading-none tracking-tight text-brand-ink">{value}</span>
        <span className="text-[12px] font-medium text-brand-muted">/100</span>
      </div>
    </div>
  )
}

function ControlButton({ children, tone = 'plain' }) {
  const cls = tone === 'stop'
    ? 'bg-brand-card text-brand-danger'
    : 'bg-brand-card text-brand-ink'
  return (
    <span className={`grid h-11 w-11 place-items-center rounded-full shadow-[0_2px_10px_rgb(17_17_17_/_0.10)] ${cls}`}>
      {children}
    </span>
  )
}

export default function InterviewPreview() {
  const { t } = useTranslation()

  return (
    /* 纯装饰：读屏软件跳过，避免把演示文案念成真实内容 */
    <div className="relative select-none" aria-hidden="true">

      {/* 主窗口 */}
      <div className="brand-float overflow-hidden p-3 sm:p-4">
        <div className="flex items-center justify-between px-2 pb-3 pt-1">
          <span className="flex items-center gap-1.5 text-[13px] font-bold text-brand-ink">
            {t('landing.demo.role')}
            <Sparkles className="h-3.5 w-3.5 text-brand-violet" />
          </span>
          <span className="flex items-center gap-2 text-[12px] font-medium text-brand-muted">
            <span className="h-2 w-2 rounded-full bg-brand-danger" />
            {t('landing.demo.recording')}
            <span className="tabular-nums">12:48</span>
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_1.05fr]">
          {/* 面试官画面 */}
          <div className="relative aspect-[4/3] overflow-hidden rounded-[14px] bg-brand-inset">
            <img
              src={interviewerPortrait}
              alt=""
              className="h-full w-full object-cover object-[center_22%]"
            />
          </div>

          {/* 当前问题 */}
          <div className="rounded-[14px] bg-brand-inset p-4">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-brand-muted">
                {t('landing.demo.currentQuestion')} <span className="font-semibold text-brand-ink">3/6</span>
              </span>
              <span className="rounded-full bg-brand-card px-2.5 py-1 text-[11px] font-medium text-brand-muted">
                {t('landing.demo.tagSituational')}
              </span>
            </div>

            <p className="mt-4 text-[15px] font-bold leading-snug text-brand-ink">
              {t('landing.demo.question')}
            </p>

            <div className="mt-6 flex items-center gap-2">
              <span className="text-[12px] text-brand-muted">{t('landing.demo.hintLevel')}</span>
              <span className="ml-auto flex gap-1.5">
                {[1, 2, 3].map(n => (
                  <span
                    key={n}
                    className={`grid h-7 w-9 place-items-center rounded-md text-[12px] font-semibold ${n === 2
                      /* 首页挂了 .theme-quiet，--brand-lime 在那里被兜底成薰衣草 #BAB0DB，
                         所以这里实际渲染成淡紫底。文字写死 #111111 而不是 brand-ink：
                         底色在深浅色下都是浅的，用 brand-ink 深色模式会翻白、对比度归零。 */
                      ? 'bg-brand-lime text-[#111111]'
                      : 'bg-brand-card text-brand-muted'
                      }`}
                  >
                    {n}
                  </span>
                ))}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 px-2 pb-1 pt-4">
          <ControlButton><Mic className="h-[18px] w-[18px]" /></ControlButton>
          <ControlButton><Video className="h-[18px] w-[18px]" /></ControlButton>
          <ControlButton tone="stop"><Square className="h-[15px] w-[15px] fill-current" /></ControlButton>
        </div>
      </div>

      {/* 下方两个子窗口 */}
      <div className="mt-4 grid gap-4 sm:grid-cols-[1.1fr_1fr]">
        {/* 实时转写 */}
        <div className="brand-float p-5">
          <p className="text-[12px] font-bold text-brand-ink">{t('landing.demo.transcript')}</p>

          <div className="mt-4 space-y-4">
            {[
              { who: t('landing.demo.interviewer'), time: '12:45', text: t('landing.demo.line1') },
              { who: t('landing.demo.you'), time: '12:47', text: t('landing.demo.line2') },
            ].map((row, i) => (
              <div key={i} className="flex gap-2.5">
                <span className="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-brand-inset" />
                <div className="min-w-0">
                  <p className="text-[11px] text-brand-muted">
                    <span className="font-semibold text-brand-ink">{row.who}</span>
                    <span className="ml-1.5 tabular-nums">{row.time}</span>
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed text-brand-muted">{row.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 还在继续转写的示意 */}
          <div className="mt-4 flex gap-1">
            {[...Array(22)].map((_, i) => (
              <span key={i} className="h-1 w-1 rounded-full bg-brand-line" />
            ))}
          </div>
        </div>

        {/* 综合评分 */}
        <div className="brand-float p-5">
          <p className="text-[12px] font-bold text-brand-ink">{t('landing.demo.score')}</p>

          <div className="mt-3 flex items-center gap-4">
            <ScoreRing value={TOTAL_SCORE} />

            <ul className="min-w-0 flex-1 space-y-2">
              {DIMENSIONS.map(d => (
                <li key={d.key} className="flex items-center gap-2 text-[11.5px]">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-violet" />
                  <span className="min-w-0 flex-1 truncate text-brand-muted">{t(`landing.demo.${d.key}`)}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-brand-ink">{d.score}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
