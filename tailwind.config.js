/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /**
         * 主题感知色板，取值来自 index.css 的 --brand-* 变量（light / .dark 各定义一次），
         * 组件里不需要写 `dark:` 变体。
         *
         * 「Harbor」色板取自首页插画与 LandIt 标志：
         *   harbor 港湾蓝（主强调） · sage 鼠尾草绿 · ochre 赭黄（标志箭头） · brick 红砖（易北爱乐厅底座）
         * violet / glow / lime / coral 是历史命名，保留为同一组变量的别名，老代码无需改名。
         */
        brand: {
          paper: 'rgb(var(--brand-paper) / <alpha-value>)',
          card: 'rgb(var(--brand-card) / <alpha-value>)',
          inset: 'rgb(var(--brand-inset) / <alpha-value>)',
          deep: 'rgb(var(--brand-deep) / <alpha-value>)',
          ink: 'rgb(var(--brand-ink) / <alpha-value>)',
          'on-ink': 'rgb(var(--brand-on-ink) / <alpha-value>)',
          muted: 'rgb(var(--brand-muted) / <alpha-value>)',
          line: 'rgb(var(--brand-line) / <alpha-value>)',
          mist: 'rgb(var(--brand-mist) / <alpha-value>)',
          harbor: 'rgb(var(--brand-violet) / <alpha-value>)',
          sage: 'rgb(var(--brand-glow) / <alpha-value>)',
          ochre: 'rgb(var(--brand-lime) / <alpha-value>)',
          brick: 'rgb(var(--brand-coral) / <alpha-value>)',
          violet: 'rgb(var(--brand-violet) / <alpha-value>)',
          glow: 'rgb(var(--brand-glow) / <alpha-value>)',
          lime: 'rgb(var(--brand-lime) / <alpha-value>)',
          sky: 'rgb(var(--brand-sky) / <alpha-value>)',
          coral: 'rgb(var(--brand-coral) / <alpha-value>)',
          success: 'rgb(var(--brand-success) / <alpha-value>)',
          danger: 'rgb(var(--brand-danger) / <alpha-value>)',
        },
        primary: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
      },
      fontFamily: {
        /* 正文 / 界面：DM Sans 与 LandIt 字标同源；中文走系统黑体，避免首屏下载大字库 */
        sans: ['"DM Sans"', 'Inter', '"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
        /* 界面内的小标题 */
        brand: ['"DM Sans"', '"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
        /* 页面大标题：Fraunces 衬线，中文回退到思源宋体——编辑感、有温度，而不是又一个 SaaS 黑体 */
        display: ['Fraunces', '"Noto Serif SC"', '"Songti SC"', 'Georgia', 'serif'],
        serif: ['Fraunces', '"Noto Serif SC"', '"Songti SC"', 'Georgia', 'serif'],
      },
      boxShadow: {
        lift: '0 1px 2px rgb(var(--brand-shadow) / 0.05), 0 12px 32px -14px rgb(var(--brand-shadow) / 0.22)',
        float: '0 1px 2px rgb(var(--brand-shadow) / 0.04), 0 24px 60px -24px rgb(var(--brand-shadow) / 0.30)',
      },
      transitionTimingFunction: {
        'out-soft': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.8s ease-out forwards',
        'slide-up': 'slideUp 0.8s ease-out forwards',
        'reveal': 'reveal 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'drift': 'drift 9s ease-in-out infinite',
        'drift-slow': 'drift 14s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(30px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        reveal: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        drift: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '50%': { transform: 'translate3d(0, -8px, 0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.55', transform: 'scale(0.86)' },
        },
      },
    },
  },
  plugins: [],
}
