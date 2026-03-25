import { useTranslation } from 'react-i18next'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const baseBtn =
  'inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900'

/** 全站（非面试页）浅色 / 深色 */
export function AppThemeToggle({ className = '' }) {
  const { t } = useTranslation()
  const { appTheme, setAppTheme } = useTheme()
  const dark = appTheme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setAppTheme(dark ? 'light' : 'dark')}
      className={`${baseBtn} border-slate-200/90 bg-white/90 text-slate-600 shadow-soft hover:border-primary-200 hover:bg-primary-50/80 hover:text-primary-700 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-700 dark:hover:text-white ${className}`}
      aria-label={t('common.themeToggle')}
      title={t('common.themeToggle')}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
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
      className={`${baseBtn} border-slate-300 bg-white/90 text-slate-600 shadow-sm hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-300 dark:shadow-none dark:hover:border-slate-500 dark:hover:bg-slate-700 dark:hover:text-white ${className}`}
      aria-label={t('common.interviewThemeToggle')}
      title={t('common.interviewThemeToggle')}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}
