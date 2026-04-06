import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BrainCircuit, Mail } from 'lucide-react'

export default function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="relative overflow-hidden border-t border-slate-200/90 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-500/40 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(37,99,235,0.08),transparent)] pointer-events-none dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(37,99,235,0.12),transparent)]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 relative">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
          <div>
            <Link to="/" className="inline-flex items-center gap-2.5 mb-5 group">
              <div className="w-9 h-9 overflow-hidden flex items-center justify-center">
                <picture>
                  <source srcSet="/landit-icon-dark.svg" media="(prefers-color-scheme: dark)" />
                  <img
                    src="/landit-icon-light.svg"
                    alt="LandIt Logo"
                    className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                  />
                </picture>
              </div>
              <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
                Land<span className="text-[#E8A832] italic">It</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 max-w-sm">
              {t('footer.tagline')}
            </p>
          </div>

          <div>
            <h4 className="text-slate-900 dark:text-white font-semibold mb-4 text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">{t('footer.quickNav')}</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/" className="text-slate-600 hover:text-primary-700 dark:text-slate-400 dark:hover:text-white transition-colors inline-block border-b border-transparent hover:border-primary-300/50 dark:hover:border-white/20 pb-0.5">{t('footer.home')}</Link></li>
              <li><Link to="/setup" className="text-slate-600 hover:text-primary-700 dark:text-slate-400 dark:hover:text-white transition-colors inline-block border-b border-transparent hover:border-primary-300/50 dark:hover:border-white/20 pb-0.5">{t('footer.startPractice')}</Link></li>
              <li><Link to="/dashboard" className="text-slate-600 hover:text-primary-700 dark:text-slate-400 dark:hover:text-white transition-colors inline-block border-b border-transparent hover:border-primary-300/50 dark:hover:border-white/20 pb-0.5">{t('footer.history')}</Link></li>
              <li><Link to="/profile" className="text-slate-600 hover:text-primary-700 dark:text-slate-400 dark:hover:text-white transition-colors inline-block border-b border-transparent hover:border-primary-300/50 dark:hover:border-white/20 pb-0.5">{t('nav.profile')}</Link></li>
              <li><Link to="/login" className="text-slate-600 hover:text-primary-700 dark:text-slate-400 dark:hover:text-white transition-colors inline-block border-b border-transparent hover:border-primary-300/50 dark:hover:border-white/20 pb-0.5">{t('footer.loginRegister')}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-slate-900 dark:text-white font-semibold mb-4 text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">{t('footer.about')}</h4>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <Mail className="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-500" />
                <span>support@landit.app</span>
              </li>
              <li><span className="text-slate-500 dark:text-slate-500">{t('footer.supportLang')}</span></li>
              <li><span className="text-slate-500 dark:text-slate-500">{t('footer.roles')}</span></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200/90 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500 dark:text-slate-500">{t('footer.copyright')}</p>
          <p className="text-xs text-slate-500 dark:text-slate-600">{t('footer.powered')}</p>
        </div>
      </div>
    </footer>
  )
}
