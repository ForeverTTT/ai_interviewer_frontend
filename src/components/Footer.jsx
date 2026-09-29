import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Mail, Globe2, Briefcase } from 'lucide-react'
import { BrandLockup } from './Navbar'

export default function Footer() {
  const { t } = useTranslation()

  const quickLinks = [
    { to: '/', label: t('footer.home') },
    { to: '/setup', label: t('footer.startPractice') },
    { to: '/dashboard', label: t('footer.history') },
    { to: '/profile', label: t('nav.profile') },
    { to: '/login', label: t('footer.loginRegister') },
  ]

  return (
    <footer className="relative overflow-hidden border-t border-brand-line bg-brand-paper text-brand-muted">
      <div className="ui-container relative z-10 pb-10 pt-16">
        <div className="grid gap-12 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:gap-16">
          <div className="max-w-md">
            <Link to="/" className="inline-flex" aria-label="LandIt">
              <BrandLockup />
            </Link>
            <p className="mt-5 text-[13.5px] leading-relaxed text-brand-muted">
              {t('footer.tagline')}
            </p>
            <a
              href="mailto:support@landit.app"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-brand-line bg-brand-card px-4 py-2 text-[12.5px] font-medium text-brand-ink transition-colors hover:border-brand-ink/40"
            >
              <Mail className="h-3.5 w-3.5 text-brand-muted" />
              support@landit.app
            </a>
          </div>

          <div className="grid grid-cols-2 gap-10">
            <div>
              <h4 className="mb-4 text-[12px] font-semibold uppercase tracking-[0.16em] text-brand-ink">{t('footer.quickNav')}</h4>
              <ul className="space-y-3 text-[13.5px]">
                {quickLinks.map(link => (
                  <li key={link.to + link.label}>
                    <Link to={link.to} className="lk-link text-brand-muted hover:text-brand-ink">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-[12px] font-semibold uppercase tracking-[0.16em] text-brand-ink">{t('footer.about')}</h4>
              <ul className="space-y-3 text-[13.5px]">
                <li className="flex items-start gap-2 text-brand-muted">
                  <Globe2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{t('footer.supportLang')}</span>
                </li>
                <li className="flex items-start gap-2 text-brand-muted">
                  <Briefcase className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{t('footer.roles')}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-brand-line pt-6 sm:flex-row">
          <p className="text-[11.5px] text-brand-muted">{t('footer.copyright')}</p>
          <p className="flex items-center gap-2 text-[11.5px] text-brand-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-ochre" aria-hidden="true" />
            {t('footer.powered')}
          </p>
        </div>
      </div>

      {/* 超大字标水印：页脚的收尾，极淡，只做质感 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[0.28em] left-1/2 -translate-x-1/2 select-none whitespace-nowrap font-display text-[22vw] font-semibold italic leading-none tracking-[-0.04em] text-brand-ink/[0.035] md:text-[16vw]"
      >
        LandIt
      </div>
    </footer>
  )
}
