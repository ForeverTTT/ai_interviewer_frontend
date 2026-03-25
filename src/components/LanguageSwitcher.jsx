import { useState, useRef, useEffect, useId } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Check, Languages } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const OPTIONS = [
  { code: 'zh', labelKey: 'lang.zh', regionCode: 'CN' },
  { code: 'en', labelKey: 'lang.en', regionCode: 'GB' },
  { code: 'de', labelKey: 'lang.de', regionCode: 'DE' },
]

/**
 * UI language (中文 / English / Deutsch) — custom menu so styling matches the app (no native OS dropdown).
 */
export default function LanguageSwitcher({ className = '', variant = 'light' }) {
  const { t, i18n } = useTranslation()
  const { isDark } = useTheme()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const listId = useId()

  const current = ['zh', 'en', 'de'].includes(i18n.language) ? i18n.language : 'zh'
  const cur = OPTIONS.find((o) => o.code === current) ?? OPTIONS[0]

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const shell =
    variant === 'dark'
      ? 'border-slate-600/90 bg-slate-800/95 shadow-inner shadow-black/20'
      : 'border-slate-200/90 bg-white/95 shadow-soft ring-1 ring-slate-900/[0.04] dark:border-slate-600 dark:bg-slate-800/95 dark:ring-slate-700'

  const textMain =
    variant === 'dark' ? 'text-slate-200' : 'text-slate-700 dark:text-slate-200'
  const textCode =
    variant === 'dark' ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'
  const iconClass =
    variant === 'dark' ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'

  /** 用 isDark 显式配色，避免面试页根节点 dark:text-white 继承到浅底面板上 */
  const panel = isDark
    ? 'absolute left-0 right-0 top-[calc(100%+0.375rem)] z-[100] flex flex-col gap-0.5 rounded-2xl border border-slate-600/90 bg-slate-900 p-1.5 text-slate-100 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.5)] ring-1 ring-slate-700/80 backdrop-blur-md animate-fade-in'
    : 'absolute left-0 right-0 top-[calc(100%+0.375rem)] z-[100] flex flex-col gap-0.5 rounded-2xl border border-slate-200/90 bg-white p-1.5 text-slate-900 shadow-[0_16px_48px_-12px_rgba(15,23,42,0.22)] ring-1 ring-slate-900/[0.05] backdrop-blur-md animate-fade-in'

  const pickLanguage = (code) => {
    void i18n.changeLanguage(code)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        id={`${listId}-trigger`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className={`flex min-h-[2.25rem] w-full min-w-[7.25rem] cursor-pointer items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-left text-sm font-medium backdrop-blur-sm transition-all duration-200 hover:shadow-card focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 ${shell} ${textMain} ${open ? 'shadow-card ring-primary-400/25 dark:ring-primary-500/30' : ''}`}
      >
        <Languages
          className={`h-3.5 w-3.5 shrink-0 opacity-80 ${textCode}`}
          aria-hidden
        />
        <span
          className={`font-mono text-[11px] font-bold tracking-wide tabular-nums ${textCode}`}
          aria-hidden
        >
          {cur.regionCode}
        </span>
        <span className="flex-1 truncate">{t(cur.labelKey)}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${iconClass} ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-labelledby={`${listId}-trigger`}
          className={panel}
        >
          {OPTIONS.map(({ code, labelKey }) => {
            const selected = code === current
            return (
              <li key={code} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => pickLanguage(code)}
                  className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    selected
                      ? isDark
                        ? 'bg-primary-500/20 text-primary-200'
                        : 'bg-primary-50 text-primary-900'
                      : isDark
                        ? 'text-slate-100 hover:bg-slate-800'
                        : 'text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                    {selected ? (
                      <Check
                        className={`h-4 w-4 ${isDark ? 'text-primary-300' : 'text-primary-600'}`}
                        strokeWidth={2.5}
                      />
                    ) : null}
                  </span>
                  <span className="flex-1">{t(labelKey)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
