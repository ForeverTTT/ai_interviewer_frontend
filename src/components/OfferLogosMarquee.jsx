import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import Marquee from './brand/Marquee'
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

/* 去掉白卡片外框：B2B 场景里「信任墙」越干净越可信；默认灰阶，悬停还原品牌色 */
function LogoItem({ children, title }) {
  return (
    <div
      className="flex h-16 w-40 shrink-0 items-center justify-center opacity-60 grayscale transition-all duration-500 hover:opacity-100 hover:grayscale-0 sm:h-20 sm:w-48 dark:opacity-75 dark:brightness-[1.6]"
      title={title}
    >
      {children}
    </div>
  )
}

function LogoRow({ broken, setBroken, rowIndex }) {
  return (
    <>
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
    </>
  )
}

export default function OfferLogosMarquee() {
  const { t } = useTranslation()
  const [broken, setBroken] = useState({})

  return (
    <section className="relative overflow-hidden py-16 sm:py-20">
      <div className="ui-container">
        <div className="relative overflow-hidden rounded-[32px] border border-brand-line bg-brand-card/70 py-12 backdrop-blur-sm">
          <div className="mb-8 px-6 text-center">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="lk-eyebrow justify-center"
            >
              {t('offerMarquee.sub')}
            </motion.p>
            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="lk-display mx-auto mt-4 max-w-3xl text-[24px] leading-tight sm:text-[32px]"
            >
              {t('offerMarquee.line1')}
            </motion.h3>
          </div>

          <Marquee duration={45} gap={40} className="py-2">
            <LogoRow rowIndex={0} broken={broken} setBroken={setBroken} />
          </Marquee>
        </div>
      </div>
    </section>
  )
}

