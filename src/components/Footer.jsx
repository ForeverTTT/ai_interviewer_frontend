import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BrainCircuit, Mail } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export default function Footer() {
  const { t } = useTranslation()
  const { isDark } = useTheme()

  return (
    /* 底色与页面同为 brand-paper，只靠 border-t 分隔；不再叠柔光椭圆和紫色渐变细线 */
    <footer className="theme-quiet border-t border-brand-line bg-brand-paper text-brand-muted">
      <div className="ui-container py-12">
        {/* 品牌靠左、链接组靠右；容器收口后中间不会拉出大片空隙 */}
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between md:gap-12">
          <div>
            <Link to="/" className="inline-flex items-center gap-2.5 mb-5 group">
              <div className="w-9 h-9 overflow-hidden flex items-center justify-center">
                <img
                  src={isDark ? '/landit-icon-dark.svg' : '/landit-icon-light.svg'}
                  alt="LandIt Logo"
                  className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <span className="font-brand text-lg font-bold tracking-tight text-brand-ink">
                Land<span className="italic text-brand-violet">It</span>
              </span>
            </Link>
            <p className="max-w-sm text-[13px] leading-relaxed text-brand-muted">
              {t('footer.tagline')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:gap-16 lg:gap-24">
            <div>
              <h4 className="mb-4 text-[12.5px] font-semibold text-brand-ink">{t('footer.quickNav')}</h4>
            <ul className="space-y-2.5 text-[13px]">
              <li><Link to="/" className="inline-block border-b border-transparent pb-0.5 text-brand-muted transition-colors hover:border-brand-ink/40 hover:text-brand-ink">{t('footer.home')}</Link></li>
              <li><Link to="/setup" className="inline-block border-b border-transparent pb-0.5 text-brand-muted transition-colors hover:border-brand-ink/40 hover:text-brand-ink">{t('footer.startPractice')}</Link></li>
              <li><Link to="/dashboard" className="inline-block border-b border-transparent pb-0.5 text-brand-muted transition-colors hover:border-brand-ink/40 hover:text-brand-ink">{t('footer.history')}</Link></li>
              <li><Link to="/profile" className="inline-block border-b border-transparent pb-0.5 text-brand-muted transition-colors hover:border-brand-ink/40 hover:text-brand-ink">{t('nav.profile')}</Link></li>
              <li><Link to="/login" className="inline-block border-b border-transparent pb-0.5 text-brand-muted transition-colors hover:border-brand-ink/40 hover:text-brand-ink">{t('footer.loginRegister')}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-[12.5px] font-semibold text-brand-ink">{t('footer.about')}</h4>
            <ul className="space-y-2.5 text-[13px]">
              <li className="flex items-center gap-2 text-brand-muted">
                <Mail className="w-4 h-4 shrink-0 text-brand-muted" />
                <span>support@landit.app</span>
              </li>
              <li><span className="text-brand-muted">{t('footer.supportLang')}</span></li>
              <li><span className="text-brand-muted">{t('footer.roles')}</span></li>
            </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-brand-line pt-6 sm:flex-row">
          <p className="text-[11px] text-brand-muted">{t('footer.copyright')}</p>
          <p className="text-[11px] text-brand-muted">{t('footer.powered')}</p>
        </div>
      </div>
    </footer>
  )
}
