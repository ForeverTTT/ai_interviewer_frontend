import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'

const BRAND_META = {
  bmw: { name: 'BMW', slug: 'bmw', color: '0066B1' },
  siemens: { name: 'Siemens', slug: 'siemens', color: '009999' },
  sap: { name: 'SAP', slug: 'sap', color: '0FAA08' },
  bosch: { name: 'Bosch', slug: 'bosch', color: 'EA0016' },
}

const UNI_META = {
  heidelberg: { name: 'Universität Heidelberg', file: 'uni-heidelberg.svg', sub: 'Ruprecht-Karls-Universität Heidelberg' },
  tum: { name: 'TUM', file: 'uni-tum.svg', sub: 'Technische Universität München' },
  rwth: { name: 'RWTH Aachen', file: 'uni-rwth.svg', sub: 'RWTH Aachen University' },
  eth: { name: 'ETH Zürich', file: 'uni-eth.svg', sub: 'ETH Zürich' },
}

const MARQUEE_SEQUENCE = [
  { kind: 'uni', id: 'heidelberg' },
  { kind: 'brand', id: 'bmw' },
  { kind: 'brand', id: 'siemens' },
  { kind: 'brand', id: 'sap' },
  { kind: 'brand', id: 'bosch' },
  { kind: 'uni', id: 'tum' },
  { kind: 'uni', id: 'rwth' },
  { kind: 'uni', id: 'eth' },
]

function LogoItem({ children, title }) {
  return (
    <div
      className="flex h-16 sm:h-24 w-44 sm:w-56 shrink-0 items-center justify-center rounded-[2rem] border border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm transition-all hover:scale-105"
      title={title}
    >
      {children}
    </div>
  )
}

function LogoRow({ broken, setBroken, rowIndex }) {
  return (
    <div className="flex shrink-0 items-center gap-8">
      {MARQUEE_SEQUENCE.map((item, idx) => {
        const uniqueKey = `marquee-${rowIndex}-${item.kind}-${item.id}-${idx}`
        if (item.kind === 'brand') {
          const b = BRAND_META[item.id]
          const src = `https://cdn.simpleicons.org/${b.slug}/${b.color}`
          return (
            <LogoItem key={uniqueKey} title={b.name}>
              {broken[uniqueKey] ? (
                <span className="text-sm font-bold text-slate-400">{b.name}</span>
              ) : (
                <img
                  src={src}
                  alt={b.name}
                  className="max-h-10 w-auto object-contain transition-all duration-300"
                  onError={() => setBroken(p => ({ ...p, [uniqueKey]: true }))}
                />
              )}
            </LogoItem>
          )
        }
        const u = UNI_META[item.id]
        const src = `/logos/${u.file}`
        return (
          <LogoItem key={uniqueKey} title={u.sub}>
            {broken[uniqueKey] ? (
              <span className="text-xs font-bold text-slate-400 text-center px-2">{u.name}</span>
            ) : (
              <img
                src={src}
                alt={u.name}
                className="max-h-10 w-auto object-contain transition-all duration-300"
                onError={() => setBroken(p => ({ ...p, [uniqueKey]: true }))}
              />
            )}
          </LogoItem>
        )
      })}
    </div>
  )
}

export default function OfferLogosMarquee() {
  const { t } = useTranslation()
  const [broken, setBroken] = useState({})

  return (
    <section className="relative pt-12 pb-12 bg-white dark:bg-slate-950 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 text-center mb-16">
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-600 mb-6"
        >
          {t('offerMarquee.sub')}
        </motion.p>
        <motion.h3 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white font-serif leading-tight"
        >
          {t('offerMarquee.line1')}
        </motion.h3>
      </div>

      <div className="relative flex overflow-hidden group offer-marquee-mask">
        <div className="flex gap-8 py-4 animate-marquee hover:[animation-play-state:paused]">
          {[0, 1, 2, 3].map((i) => (
            <LogoRow key={i} rowIndex={i} broken={broken} setBroken={setBroken} />
          ))}
        </div>
      </div>
    </section>
  )
}

