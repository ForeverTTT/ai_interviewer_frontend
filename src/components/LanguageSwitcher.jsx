import { useState, useRef, useEffect, useId } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Check, Globe2 } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const OPTIONS = [
  { code: 'zh', labelKey: 'lang.zh', regionCode: 'CN' },
  { code: 'en', labelKey: 'lang.en', regionCode: 'GB' },
  { code: 'de', labelKey: 'lang.de', regionCode: 'DE' },
]

/**
 * UI language (中文 / English / Deutsch) — custom menu so styling matches the app.
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

  /** Dark/Light panel styling */
  const panel = isDark
    ? 'absolute right-0 top-[calc(100%+0.5rem)] z-[100] flex flex-col gap-1 rounded-2xl border border-slate-800 bg-slate-950 p-2 text-slate-100 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300 min-w-[120px]'
    : 'absolute right-0 top-[calc(100%+0.5rem)] z-[100] flex flex-col gap-1 rounded-2xl border border-slate-100 bg-white p-2 text-slate-900 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300 min-w-[120px]'

  const pickLanguage = async (code) => {
    await i18n.changeLanguage(code)
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
        className={`flex h-10 items-center gap-2 rounded-full border px-4 py-2 text-left text-xs font-bold transition-all duration-300 focus:outline-none ${
          open 
            ? 'bg-slate-50 dark:bg-slate-800 text-primary-600 dark:text-primary-400 border-primary-500/50' 
            : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:hover:border-slate-700 dark:text-slate-400'
        }`}
      >
        <Globe2 className="h-4 w-4 shrink-0" aria-hidden />
        <span className="hidden sm:inline-block opacity-60 text-[10px] font-mono tracking-tighter mr-1">{cur.regionCode}</span>
        <span className="flex-1 truncate">{t(cur.labelKey)}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
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
