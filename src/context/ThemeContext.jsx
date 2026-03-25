import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react'
import { matchPath, useLocation } from 'react-router-dom'

const STORAGE_THEME = 'interviewde_theme'

const ThemeContext = createContext(null)

function readStored(fallback) {
  try {
    const v = localStorage.getItem(STORAGE_THEME)
    if (v === 'light' || v === 'dark') return v
  } catch {
    /* ignore */
  }
  return fallback
}

export function ThemeProvider({ children }) {
  const location = useLocation()
  const isInterview = Boolean(
    matchPath({ path: '/interview', end: true }, location.pathname),
  )

  const [theme, setThemeState] = useState(() => readStored('light'))

  const setTheme = useCallback((mode) => {
    setThemeState(mode === 'dark' ? 'dark' : 'light')
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_THEME, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  const isDark = theme === 'dark'

  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', isDark)
    root.style.colorScheme = isDark ? 'dark' : 'light'
  }, [isDark])

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      // Keep legacy keys as aliases to avoid breaking consumers immediately
      appTheme: theme,
      setAppTheme: setTheme,
      interviewTheme: theme,
      setInterviewTheme: setTheme,
      isInterview,
      isDark,
    }),
    [theme, setTheme, isInterview, isDark],
  )

  return (
    <ThemeContext.Provider value={value}>
      {isInterview ? (
        children
      ) : (
        <div className="min-h-dvh bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
          {children}
        </div>
      )}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return ctx
}
