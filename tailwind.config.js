/** @type {import('tailwindcss').Config} */
// Force config reload
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
         * 主题感知色板。取值来自 index.css 的 CSS 变量，light/dark 各定义一次，
         * 因此使用这些颜色的组件不需要写任何 `dark:` 变体。
         */
        /** 品牌视觉色板（首页在用），取值见 index.css 的 --brand-* */
        brand: {
          paper: 'rgb(var(--brand-paper) / <alpha-value>)',
          card: 'rgb(var(--brand-card) / <alpha-value>)',
          inset: 'rgb(var(--brand-inset) / <alpha-value>)',
          deep: 'rgb(var(--brand-deep) / <alpha-value>)',
          ink: 'rgb(var(--brand-ink) / <alpha-value>)',
          'on-ink': 'rgb(var(--brand-on-ink) / <alpha-value>)',
          muted: 'rgb(var(--brand-muted) / <alpha-value>)',
          line: 'rgb(var(--brand-line) / <alpha-value>)',
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
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
        display: ['"Outfit"', 'Inter', 'sans-serif'],
        /* 品牌标题：拉丁走 Outfit，中文回退到 Noto Sans SC 的 900 字重 */
        brand: ['"Outfit"', '"Noto Sans SC"', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.8s ease-out forwards',
        'slide-up': 'slideUp 0.8s ease-out forwards',
        'reveal': 'reveal 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
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
      },
    },
  },
  plugins: [],
}
