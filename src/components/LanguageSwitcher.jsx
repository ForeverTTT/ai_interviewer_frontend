import { useState, useRef, useEffect, useId } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Check, Globe2 } from 'lucide-react'

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

  /* brand token 自带主题切换，不再需要深浅两套字符串 */
  const panel = 'brand-float absolute right-0 top-[calc(100%+0.5rem)] z-[100] flex min-w-[148px] flex-col gap-0.5 rounded-2xl p-1.5 text-brand-ink shadow-float'

  const regionOf = (code) => OPTIONS.find(o => o.code === code)?.regionCode

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
        className={`flex items-center gap-1.5 rounded-full border text-left text-[12.5px] font-semibold transition-colors duration-300 focus:outline-none ${
          variant === 'nav' ? 'h-9 px-3' : 'h-10 px-4'
        } ${
          open
            ? 'border-brand-ink/30 bg-brand-card text-brand-ink'
            : variant === 'nav'
              ? 'border-transparent text-brand-muted hover:bg-brand-card hover:text-brand-ink'
              : 'border-brand-line bg-brand-card text-brand-muted hover:border-brand-ink/40 hover:text-brand-ink'
        }`}
      >
        <Globe2 className="h-4 w-4 shrink-0" aria-hidden />
        <span className="flex-1 truncate">{t(cur.labelKey)}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 opacity-70 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
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
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] transition-colors ${
                    selected
                      ? 'bg-brand-inset font-semibold text-brand-ink'
                      : 'text-brand-muted hover:bg-brand-inset hover:text-brand-ink'
                  }`}
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                    {selected ? (
                      <Check
                        className="h-4 w-4 text-brand-ink"
                        strokeWidth={2.5}
                      />
                    ) : null}
                  </span>
                  <span className="flex-1">{t(labelKey)}</span>
                  <span className="text-[10px] font-medium tracking-wider text-brand-muted/80">{regionOf(code)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
