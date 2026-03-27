import { useTranslation } from 'react-i18next'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const baseBtn =
  'inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-300 focus:outline-none'

/** 全站（非面试页）浅色 / 深色 */
export function AppThemeToggle({ className = '' }) {
  const { t } = useTranslation()
  const { appTheme, setAppTheme } = useTheme()
  const dark = appTheme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setAppTheme(dark ? 'light' : 'dark')}
      className={`${baseBtn} bg-white text-slate-400 border-slate-100 hover:border-slate-200 hover:text-slate-900 dark:bg-slate-950 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:text-white ${className}`}
      aria-label={t('common.themeToggle')}
      title={t('common.themeToggle')}
    >
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  )
}

/** 面试全屏页专用浅色 / 深色（随面试顶栏亮/暗变化） */
export function InterviewThemeToggle({ className = '' }) {
  const { t } = useTranslation()
  const { interviewTheme, setInterviewTheme } = useTheme()
  const dark = interviewTheme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setInterviewTheme(dark ? 'light' : 'dark')}
      className={`${baseBtn} bg-white/10 text-white/40 hover:text-white border-white/10 hover:border-white/20 transition-all ${className}`}
      aria-label={t('common.interviewThemeToggle')}
      title={t('common.interviewThemeToggle')}
    >
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  )
}
