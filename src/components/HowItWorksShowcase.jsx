import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BrainCircuit, Mic, Briefcase, MessageSquare,
  FlaskConical, Users,
} from 'lucide-react'

const MAIN_BULLET_KEYS = ['howMainB1', 'howMainB2', 'howMainB3', 'howMainB4']

/** Large preview: interview layout (sidebar + chat) — matches product dark UI */
function MainInterviewMockup() {
  return (
    <div
      className="rounded-xl sm:rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-950 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.35)] ring-1 ring-white/[0.06]"
      aria-hidden
    >
      <div className="flex h-[200px] sm:h-[260px] lg:h-[280px]">
        <div className="w-[30%] max-w-[7.5rem] border-r border-slate-800/90 bg-slate-900 p-2 sm:p-2.5 flex flex-col gap-2">
          <div className="h-1.5 w-8 bg-slate-700 rounded-full" />
          <div className="rounded-lg bg-slate-800/90 ring-1 ring-slate-700/50 p-2 space-y-1.5">
            <div className="h-1 w-10 bg-slate-600 rounded" />
            <div className="font-mono text-[11px] sm:text-xs font-bold text-white tabular-nums">09:42</div>
            <div className="h-1 w-full bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full w-[62%] rounded-full bg-primary-500" />
            </div>
          </div>
          <div className="rounded-lg bg-slate-800/60 p-2 space-y-1 flex-1 min-h-0">
            <div className="h-1 w-12 bg-slate-600 rounded mb-1" />
            <div className="h-2 w-full bg-slate-700/80 rounded" />
            <div className="h-2 w-4/5 bg-slate-700/60 rounded" />
          </div>
        </div>
        <div className="flex-1 flex flex-col bg-slate-950 p-2 sm:p-3 min-w-0">
          <div className="flex-1 space-y-2 overflow-hidden">
            <div className="flex gap-1.5">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-primary-500 to-violet-600 shrink-0 flex items-center justify-center text-[7px] text-white font-bold shadow-md">
                AI
              </div>
              <div className="rounded-xl rounded-tl-sm bg-slate-800/95 border border-slate-600/40 px-2 py-1.5 max-w-[92%] shadow-lg">
                <p className="text-[8px] sm:text-[9px] text-slate-300 leading-snug line-clamp-3">
                  Guten Tag! Kurz zu Ihrer Motivation für diese Werkstudentenstelle…
                </p>
              </div>
            </div>
            <div className="flex gap-1.5 justify-end">
              <div className="rounded-xl rounded-tr-sm bg-gradient-to-br from-primary-600 to-primary-700 px-2 py-1.5 max-w-[88%] border border-primary-500/30">
                <p className="text-[8px] sm:text-[9px] text-white/95 leading-snug line-clamp-2">
                  Guten Tag! Ich studiere Informatik und…
                </p>
              </div>
              <div className="w-6 h-6 rounded-full bg-slate-700 shrink-0 ring-1 ring-slate-600" />
            </div>
            <div className="flex gap-1.5 opacity-90">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-primary-500 to-violet-600 shrink-0" />
              <div className="rounded-xl rounded-tl-sm bg-slate-800/80 border border-slate-600/30 px-2 py-1.5">
                <div className="flex gap-0.5 pt-0.5">
                  <span className="w-1 h-1 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-1 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '120ms' }} />
                  <span className="w-1 h-1 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '240ms' }} />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-slate-900/90 border border-slate-800 px-2 py-1.5">
            <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">
              <Mic className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="flex-1 h-6 rounded-md bg-slate-800/80 border border-slate-700/50" />
            <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center shrink-0">
              <MessageSquare className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MiniJobFormVisual() {
  return (
    <div className="w-full max-w-[200px] rounded-lg bg-white p-2.5 shadow-md ring-1 ring-slate-200/90 dark:bg-slate-800 dark:ring-slate-700" aria-hidden>
      <div className="flex items-center gap-1 mb-2 text-slate-400">
        <Briefcase className="w-3 h-3" />
        <div className="h-2 flex-1 bg-slate-100 rounded dark:bg-slate-700" />
      </div>
      <div className="h-2 w-3/4 bg-slate-200/80 rounded mb-1.5" />
      <div className="space-y-1 rounded-md bg-slate-50 p-2 border border-slate-100 dark:bg-slate-900/50 dark:border-slate-700">
        <div className="h-1.5 w-full bg-slate-200/70 rounded" />
        <div className="h-1.5 w-full bg-slate-200/70 rounded" />
        <div className="h-1.5 w-5/6 bg-slate-200/50 rounded" />
      </div>
    </div>
  )
}

function MiniAgentsVisual() {
  return (
    <div className="flex flex-col gap-2 w-full max-w-[200px]" aria-hidden>
      <div className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 shadow-md ring-1 ring-slate-200/80 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
          <FlaskConical className="w-2.5 h-2.5" />
        </span>
        Tech
      </div>
      <div className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 shadow-md ring-1 ring-slate-200/80 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
          <Users className="w-2.5 h-2.5" />
        </span>
        STAR
      </div>
      <div className="flex items-center gap-1.5 rounded-full bg-slate-100/90 px-2.5 py-1 ring-1 ring-slate-200/60 text-[10px] font-medium text-slate-500 dark:bg-slate-900/50 dark:ring-slate-800 dark:text-slate-400">
        <BrainCircuit className="w-3 h-3 text-primary-600 dark:text-primary-400" />
        …
      </div>
    </div>
  )
}

function MiniLangDurationVisual() {
  return (
    <div className="w-full max-w-[200px] space-y-2" aria-hidden>
      <div className="flex gap-1.5">
        <div className="flex-1 rounded-xl border-2 border-primary-500 bg-primary-50 py-2 text-center text-[10px] font-bold text-primary-700 shadow-sm dark:bg-primary-900/40 dark:text-primary-300 dark:border-primary-400">
          English
        </div>
        <div className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-center text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400">
          Deutsch
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1">
        {['5', '10', '15', '20'].map((m, i) => (
          <div
            key={m}
            className={`rounded-lg py-1.5 text-center text-[9px] font-bold ${
              i === 1 ? 'bg-primary-50 border-2 border-primary-500 text-primary-700 dark:bg-primary-900/40 dark:border-primary-400 dark:text-primary-300' : 'bg-white border border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
            }`}
          >
            {m}m
          </div>
        ))}
      </div>
    </div>
  )
}

function MiniVoiceVisual() {
  return (
    <div className="w-full max-w-[200px] rounded-xl bg-slate-900 p-2.5 shadow-lg ring-1 ring-slate-700/50" aria-hidden>
      <div className="flex gap-1 mb-2">
        <div className="h-6 flex-1 rounded-lg bg-slate-800 border border-slate-700/50" />
        <div className="h-6 w-6 rounded-lg bg-primary-600 flex items-center justify-center">
          <Mic className="w-3 h-3 text-white" />
        </div>
      </div>
      <div className="flex items-end justify-center gap-0.5 h-8">
        {[3, 5, 4, 6, 3, 5, 4].map((h, i) => (
          <div
            key={i}
            className="w-1 rounded-full bg-emerald-400/80"
            style={{ height: `${h * 3}px` }}
          />
        ))}
      </div>
      <div className="mt-1.5 text-center text-[8px] text-slate-500 font-medium">Gemini TTS</div>
    </div>
  )
}

const VISUALS = [MiniJobFormVisual, MiniAgentsVisual, MiniLangDurationVisual, MiniVoiceVisual]

/**
 * “How it works” — large explainer card + 4-column visual grid (reference layout).
 */
export default function HowItWorksShowcase({ ctaLink }) {
  const { t } = useTranslation()

  return (
    <section
      id="how-it-works"
      className="relative py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-y border-slate-200/60 overflow-hidden bg-[#f8f9fb] dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="pointer-events-none absolute inset-0 bg-mesh-subtle opacity-80" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-dot-grid opacity-[0.35]" aria-hidden />
      <div className="max-w-6xl mx-auto relative">
        <header className="text-center mb-14 sm:mb-16 lg:mb-20">
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-4">
            {t('landing.howBadge')}
          </p>
          <h2 className="font-serif text-[2rem] sm:text-4xl lg:text-[2.75rem] font-semibold text-slate-900 dark:text-slate-100 tracking-tight leading-tight mb-4 text-balance max-w-2xl mx-auto">
            {t('landing.howTitle')}
          </h2>
          <div className="title-accent-bar mb-5" aria-hidden />
          <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed mb-8 sm:mb-10 text-balance">
            {t('landing.howSub')}
          </p>
          <Link
            to={ctaLink}
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-b from-slate-900 to-slate-800 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/25 ring-1 ring-white/10 transition-all duration-300 hover:from-slate-800 hover:to-slate-900 hover:shadow-xl hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          >
            {t('landing.howCta')}
          </Link>
        </header>

        <div className="mb-12 sm:mb-16 lg:mb-20 rounded-[1.25rem] sm:rounded-3xl bg-gradient-to-br from-slate-200/50 via-slate-100/60 to-primary-100/30 p-1.5 sm:p-2 ring-1 ring-slate-200/90 shadow-card dark:from-slate-700/50 dark:via-slate-800/60 dark:to-primary-900/25 dark:ring-slate-700">
          <div className="rounded-[1rem] sm:rounded-[1.35rem] bg-white dark:bg-slate-900 px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12 shadow-inner shadow-slate-900/[0.02] ring-1 ring-slate-900/[0.03] dark:ring-slate-700">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 xl:gap-16 items-center">
              <div className="order-2 lg:order-1">
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-6 sm:mb-8">
                  {t('landing.howMainTitle')}
                </h3>
                <ul className="space-y-4 sm:space-y-5">
                  {MAIN_BULLET_KEYS.map((key) => (
                    <li key={key} className="flex gap-3 sm:gap-4 text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                      <span
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500 ring-4 ring-primary-500/15"
                        aria-hidden
                      />
                      <span>{t(`landing.${key}`)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="order-1 lg:order-2">
                <MainInterviewMockup />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
          {[0, 1, 2, 3].map((i) => {
            const V = VISUALS[i]
            return (
              <article
                key={i}
                className="card-how-mini group flex flex-col rounded-2xl border border-slate-200/90 bg-white shadow-soft overflow-hidden transition-all duration-300 hover:shadow-card-hover hover:border-primary-200/60 hover:-translate-y-1 ring-1 ring-slate-900/[0.02]"
              >
                <div className="flex min-h-[160px] sm:min-h-[168px] items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-100/80 border-b border-slate-100/90 px-4 py-6 relative dark:from-slate-800 dark:via-slate-900 dark:to-slate-900 dark:border-slate-700">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(37,99,235,0.06),transparent)]" aria-hidden />
                  <div className="relative z-[1]">
                    <V />
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-2">
                    {t(`landing.howV${i + 1}Title`)}
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed flex-1">
                    {t(`landing.howV${i + 1}Desc`)}
                  </p>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
