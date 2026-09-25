import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import sapLogo from '../assets/logos/sap.png'
import boschLogo from '../assets/logos/bosch.png'
import schaefflerLogo from '../assets/logos/schaeffler.png'

const BRAND_META = {
  bmw: { name: 'BMW', slug: 'bmw', color: '0066B1' },
  siemens: { name: 'Siemens', slug: 'siemens', color: '009999' },
  sap: { name: 'SAP', image: sapLogo },
  bosch: { name: 'Bosch', image: boschLogo },
  schaeffler: { name: 'Schaeffler', image: schaefflerLogo },
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
  { kind: 'brand', id: 'schaeffler' },
  { kind: 'uni', id: 'tum' },
  { kind: 'uni', id: 'rwth' },
  { kind: 'uni', id: 'eth' },
]

function LogoItem({ children, title }) {
  return (
    <div
      className="brand-float flex h-16 w-44 shrink-0 items-center justify-center transition-transform duration-300 hover:-translate-y-0.5 sm:h-20 sm:w-52"
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
          const src = b.image || `https://cdn.simpleicons.org/${b.slug}/${b.color}`
          return (
            <LogoItem key={uniqueKey} title={b.name}>
              {broken[uniqueKey] ? (
                <span className="text-sm font-semibold text-brand-muted">{b.name}</span>
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
              <span className="px-2 text-center text-xs font-semibold text-brand-muted">{u.name}</span>
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
    <section className="relative overflow-hidden bg-brand-paper py-16">
      <div className="ui-container mb-12 text-center">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-5 text-[11px] font-bold uppercase tracking-[0.22em] text-brand-muted"
        >
          {t('offerMarquee.sub')}
        </motion.p>
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="font-brand text-[26px] font-black leading-tight tracking-tight text-brand-ink sm:text-[36px]"
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

