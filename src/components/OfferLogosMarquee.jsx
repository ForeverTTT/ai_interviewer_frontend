import { useState } from 'react'
import { useTranslation } from 'react-i18next'

/** Vite: `/` or e.g. `/myapp/` */
function publicUrl(path) {
  const base = import.meta.env.BASE_URL || '/'
  return base.endsWith('/') ? `${base}${path}` : `${base}/${path}`
}

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

/** Order matches marketing hero: Heidelberg → German brands → key universities */
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

function BrandLogo({ slug, name, color }) {
  const [broken, setBroken] = useState(false)
  const src = `https://cdn.simpleicons.org/${slug}/${color}`
  return (
    <div
      className="flex h-[5rem] w-[11rem] shrink-0 items-center justify-center rounded-2xl border border-slate-200/90 bg-white px-5 py-3 shadow-md dark:border-slate-600 dark:bg-slate-800 sm:h-[5.75rem] sm:w-[13rem] sm:px-6"
      title={name}
    >
      {broken ? (
        <span className="text-base font-bold text-slate-700 dark:text-slate-200">{name}</span>
      ) : (
        <img
          src={src}
          alt={name}
          className="max-h-14 w-auto max-w-[10.5rem] object-contain opacity-[0.92] sm:max-h-16 sm:max-w-[11.5rem]"
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
        />
      )}
    </div>
  )
}

function UniLogo({ file, name, sub }) {
  const [broken, setBroken] = useState(false)
  const src = publicUrl(`logos/${file}`)

  return (
    <div
      className="flex h-[5rem] min-w-[11rem] shrink-0 items-center justify-center rounded-2xl border border-slate-200/90 bg-white px-4 py-2 shadow-md dark:border-slate-600 dark:bg-slate-800 sm:h-[5.75rem] sm:min-w-[13rem] sm:px-5"
      title={sub}
    >
      {broken ? (
        <span className="px-2 text-center text-sm font-bold text-slate-800 dark:text-slate-200">{name}</span>
      ) : (
        <img
          src={src}
          alt={name}
          className="max-h-[3.25rem] w-auto max-w-[11.5rem] object-contain object-center sm:max-h-[4rem] sm:max-w-[12.5rem]"
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
        />
      )}
    </div>
  )
}

function LogoRow() {
  return (
    <div className="flex shrink-0 items-center gap-6 pr-6 sm:gap-10 sm:pr-10">
      {MARQUEE_SEQUENCE.map((item) => {
        if (item.kind === 'brand') {
          const b = BRAND_META[item.id]
          return <BrandLogo key={item.id} slug={b.slug} name={b.name} color={b.color} />
        }
        const u = UNI_META[item.id]
        return <UniLogo key={item.id} file={u.file} name={u.name} sub={u.sub} />
      })}
    </div>
  )
}

export default function OfferLogosMarquee() {
  const { t } = useTranslation()

  return (
    <section
      className="offer-marquee-section relative border-y border-slate-200/70 bg-gradient-to-b from-slate-50 via-white to-slate-50/50 py-12 sm:py-14 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:border-slate-700 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
      aria-label={t('offerMarquee.sub')}
    >
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <p className="text-base font-semibold text-slate-800 dark:text-slate-100 sm:text-lg tracking-tight max-w-3xl mx-auto leading-snug">
          {t('offerMarquee.line1')}{' '}
          <span className="bg-gradient-to-r from-primary-600 to-violet-600 bg-clip-text text-2xl font-black text-transparent sm:text-3xl tabular-nums">
            {t('offerMarquee.offerCount')}
          </span>{' '}
          {t('offerMarquee.line1b')}
        </p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          {t('offerMarquee.sub')}
        </p>
      </div>

      <div className="relative mt-12 overflow-hidden py-1">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-900 sm:w-28"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white to-transparent dark:from-slate-900 sm:w-28"
          aria-hidden
        />

        <div className="offer-marquee-track">
          <LogoRow />
          <div className="offer-marquee-duplicate shrink-0">
            <LogoRow />
          </div>
        </div>
      </div>
    </section>
  )
}
