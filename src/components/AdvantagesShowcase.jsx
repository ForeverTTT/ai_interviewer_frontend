import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { 
  ShieldCheck, 
  Workflow, 
  UserPlus, 
  FileCheck2,
  Trophy,
  Activity,
  MonitorPlay
} from 'lucide-react'

export default function AdvantagesShowcase() {
  const { t } = useTranslation()

  const ads = [
    {
      icon: <ShieldCheck className="w-8 h-8 text-indigo-500" />,
      title: t('landing.advantages.v1t'),
      desc: t('landing.advantages.v1d'),
      color: 'from-indigo-500/10 to-transparent'
    },
    {
      icon: <Workflow className="w-8 h-8 text-violet-500" />,
      title: t('landing.advantages.v2t'),
      desc: t('landing.advantages.v2d'),
      color: 'from-violet-500/10 to-transparent'
    },
    {
      icon: <UserPlus className="w-8 h-8 text-emerald-500" />,
      title: t('landing.advantages.v3t'),
      desc: t('landing.advantages.v3d'),
      color: 'from-emerald-500/10 to-transparent'
    },
    {
      icon: <FileCheck2 className="w-8 h-8 text-blue-500" />,
      title: t('landing.advantages.v4t'),
      desc: t('landing.advantages.v4d'),
      color: 'from-blue-500/10 to-transparent'
    },
    {
      icon: <MonitorPlay className="w-8 h-8 text-orange-500" />,
      title: t('landing.advantages.v5t'),
      desc: t('landing.advantages.v5d'),
      color: 'from-orange-500/10 to-transparent'
    }
  ]

  return (
    <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-950 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center text-center mb-20 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="section-badge"
          >
            <Activity className="w-3.5 h-3.5" />
            {t('landing.advantages.badge')}
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white font-serif tracking-tight"
          >
            {t('landing.advantages.titlePre')}
            <img src="/landit-logo-light.png" alt="LandIt" className="inline-block align-middle mix-blend-multiply dark:hidden" style={{ height: '0.85em', verticalAlign: 'middle' }} />
            <img src="/landit-logo-dark.png" alt="LandIt" className="hidden dark:inline-block align-middle mix-blend-screen" style={{ height: '0.85em', verticalAlign: 'middle' }} />
            {t('landing.advantages.titlePost')}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-500 dark:text-slate-400 max-w-3xl"
          >
            {t('landing.advantages.sub')}
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
          {ads.map((ad, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative group p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-200 dark:border-white/5 overflow-hidden transition-all hover:bg-white dark:hover:bg-slate-900 shadow-sm hover:shadow-2xl hover:-translate-y-2 h-full"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${ad.color} opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
              
              <div className="relative z-10 space-y-6">
                <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                  {ad.icon}
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                    {ad.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    {ad.desc}
                  </p>
                </div>
              </div>
              
              {/* Subtle tech patterns */}
              <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-10 transition-opacity duration-700">
                <Trophy className="w-24 h-24 text-slate-900 dark:text-white" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
