import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

/**
 * nav 变体：透明底圆形按钮，放在玻璃顶栏里；默认变体：带描边的圆角按钮。
 * 图标切换时做一次小角度旋转淡入，而不是生硬替换。
 */
function ToggleButton({ dark, onClick, label, variant, className }) {
  const shell = variant === 'nav'
    ? 'h-9 w-9 rounded-full border border-transparent text-brand-muted hover:bg-brand-card hover:text-brand-ink'
    : 'h-10 w-10 rounded-full border border-brand-line bg-brand-card text-brand-muted hover:border-brand-ink/40 hover:text-brand-ink'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex items-center justify-center overflow-hidden transition-colors duration-300 focus:outline-none ${shell} ${className}`}
      aria-label={label}
      title={label}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={dark ? 'sun' : 'moon'}
          initial={{ opacity: 0, rotate: -60, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 60, scale: 0.6 }}
          transition={{ duration: 0.22 }}
          className="grid place-items-center"
        >
          {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}

/** 全站（非面试页）浅色 / 深色 */
export function AppThemeToggle({ className = '', variant = 'default' }) {
  const { t } = useTranslation()
  const { appTheme, setAppTheme } = useTheme()
  const dark = appTheme === 'dark'

  return (
    <ToggleButton
      dark={dark}
      onClick={() => setAppTheme(dark ? 'light' : 'dark')}
      label={t('common.themeToggle')}
      variant={variant}
      className={className}
    />
  )
}

/** 面试全屏页专用浅色 / 深色 */
export function InterviewThemeToggle({ className = '', variant = 'default' }) {
  const { t } = useTranslation()
  const { interviewTheme, setInterviewTheme } = useTheme()
  const dark = interviewTheme === 'dark'

  return (
    <ToggleButton
      dark={dark}
      onClick={() => setInterviewTheme(dark ? 'light' : 'dark')}
      label={t('common.interviewThemeToggle')}
      variant={variant}
      className={className}
    />
  )
}
