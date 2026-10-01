import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  Check,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import LanguageSwitcher from '../components/LanguageSwitcher'
import './LandingPage.css'

const CHARACTER_SHEET = '/brand/flowlab-felt-character-board-v5-role-system.png'
const BRAND_WORDMARK = '/brand/flowlab-wordmark-icon-o-v1.png'
const HERO_STICKER = '/brand/flowlab-sticker-interview-practice.png'
const LAPTOP_STICKER = '/brand/flowlab-sticker-laptop.png'
const PROGRESS_STICKER = '/brand/flowlab-sticker-good-progress.png'
const ENCOURAGEMENT_STICKER = '/brand/flowlab-sticker-you-got-this.png'
const COMMUNITY_AVATAR = '/brand/flowlab-community-egg-avatar.png'

const SHELL_TEAM = [
  { id: 'coach', crop: 'top-left', color: 'navy' },
  { id: 'practice', crop: 'bottom-left', color: 'aqua' },
  { id: 'resume', crop: 'top-right', color: 'pink' },
  { id: 'review', crop: 'bottom-right', color: 'green' },
]

const JOURNEY = [
  { id: 'resume', accent: 'resume', crop: 'top-right' },
  { id: 'coach', accent: 'coach', crop: 'top-left' },
  { id: 'review', accent: 'review', crop: 'bottom-right' },
]

const COMMUNITY_POSTS = [
  { id: '032' },
  { id: '117' },
  { id: '208' },
  { id: '284' },
  { id: '351' },
  { id: '426' },
]

function MascotCrop({ crop, className = '' }) {
  return (
    <div className={`fl-mascot-crop fl-mascot-${crop} ${className}`} aria-hidden="true">
      <img src={CHARACTER_SHEET} alt="" />
    </div>
  )
}

function Hero({ ctaLink }) {
  const { t } = useTranslation()
  const proofPoints = ['jd', 'voice', 'review']
  return (
    <section className="fl-hero">
      <div className="fl-mesh fl-mesh-a" aria-hidden="true" /><div className="fl-mesh fl-mesh-b" aria-hidden="true" />
      <div className="fl-hero-grid">
        <motion.div className="fl-hero-copy" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
          <h1 className="fl-hero-logo-heading">
            <img className="fl-hero-logo" src={BRAND_WORDMARK} alt="FlowLab" />
          </h1>
          <p className="fl-hero-lead">{t('landingV2.hero.lead')}</p>
          <div className="fl-hero-actions">
            <Link to={ctaLink} className="fl-primary-cta">{t('landingV2.hero.primary')} <ArrowRight size={19} strokeWidth={2.4} /></Link>
            <a href="#meet-shells" className="fl-secondary-cta">{t('landingV2.hero.secondary')} <ChevronRight size={18} /></a>
          </div>
          <div className="fl-proof-row" aria-label={t('landingV2.hero.proofLabel')}>
            {proofPoints.map((key) => <span key={key}><Check size={13} strokeWidth={3} /> {t(`landingV2.hero.proof.${key}`)}</span>)}
          </div>
        </motion.div>

        <div className="fl-hero-visual">
          <div className="fl-stage-glass">
            <motion.span className="fl-character-halo fl-halo-blue" initial={{ opacity: 0, scale: 0.82 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }} />
            <motion.img
              className="fl-base-hero-mascot"
              src={HERO_STICKER}
              alt={t('landingV2.hero.stickerAlt')}
              initial={{ opacity: 0, y: 34, rotate: -2, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function CapabilityCards({ ctaLink }) {
  const { t } = useTranslation()
  return (
    <section className="fl-section fl-team-section" id="meet-shells">
      <div className="fl-section-head">
        <span>{t('landingV2.crew.eyebrow')}</span>
        <h2>{t('landingV2.crew.title')}</h2>
        <h3>{t('landingV2.crew.subtitle')}</h3>
        <p>{t('landingV2.crew.copy')}</p>
      </div>
      <div className="fl-crew-grid">
        {SHELL_TEAM.map((role, index) => (
          <motion.article
            key={role.id}
            className={`fl-crew-member-shell fl-crew-member-${role.color}`}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            whileHover={{ y: -10, scale: 1.025 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.55, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link to={ctaLink} className="fl-crew-member" aria-label={t('landingV2.crew.cardAria', { role: t(`landingV2.crew.roles.${role.id}.role`), label: t(`landingV2.crew.roles.${role.id}.label`) })}>
              <div className="fl-crew-character">
                <MascotCrop crop={role.crop} className="fl-crew-portrait" />
              </div>
              <span className="fl-crew-accent-line" aria-hidden="true" />
              <h3>{t(`landingV2.crew.roles.${role.id}.role`)}</h3>
              <p>{t(`landingV2.crew.roles.${role.id}.label`)}</p>
            </Link>
          </motion.article>
        ))}
      </div>
    </section>
  )
}

function JourneySection() {
  const { t } = useTranslation()
  return (
    <section className="fl-section fl-journey-section">
      <div className="fl-journey-head">
        <div className="fl-journey-intro"><h2>{t('landingV2.journey.titleLine1')}<br />{t('landingV2.journey.titleLine2')}</h2></div>
        <motion.img
          className="fl-journey-sticker"
          src={LAPTOP_STICKER}
          alt={t('landingV2.journey.stickerAlt')}
          initial={{ opacity: 0, y: 20, rotate: 5 }}
          whileInView={{ opacity: 1, y: 0, rotate: -3 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <div className="fl-journey-list">
        {JOURNEY.map((item, index) => (
            <motion.article key={item.id} className={`fl-journey-item fl-journey-${item.accent}`} initial={{ opacity: 0, x: index % 2 ? 24 : -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}>
              <div className="fl-journey-mentor">
                <div className="fl-journey-portrait-wrap">
                  <MascotCrop crop={item.crop} className="fl-journey-portrait" />
                </div>
                <div className="fl-journey-mentor-copy"><strong>{t(`landingV2.journey.steps.${item.id}.mentor`)}</strong><span>{t(`landingV2.journey.steps.${item.id}.kicker`)}</span></div>
              </div>
              <div className="fl-journey-copy"><h3>{t(`landingV2.journey.steps.${item.id}.title`)}</h3><p>{t(`landingV2.journey.steps.${item.id}.copy`)}</p></div>
            </motion.article>
        ))}
      </div>
    </section>
  )
}

function CommunityPreview() {
  const { t } = useTranslation()

  const renderPost = (post, duplicate = false) => (
    <article
      key={`${post.id}-${duplicate ? 'duplicate' : 'original'}`}
      className={`fl-community-post fl-community-post-${post.id}`}
      aria-hidden={duplicate ? 'true' : undefined}
    >
      <div className="fl-community-post-head">
        <img src={COMMUNITY_AVATAR} alt={duplicate ? '' : t('landingV2.community.avatarAlt')} />
        <div><strong>{t('landingV2.community.member', { id: post.id })}</strong><span>{t(`landingV2.community.posts.${post.id}.meta`)}</span></div>
        <em>{t(`landingV2.community.posts.${post.id}.tag`)}</em>
      </div>
      <h3>{t(`landingV2.community.posts.${post.id}.title`)}</h3>
      <p>{t(`landingV2.community.posts.${post.id}.copy`)}</p>
      <div className="fl-community-post-foot"><span>{t(`landingV2.community.posts.${post.id}.saves`)}</span><span>{t(`landingV2.community.posts.${post.id}.replies`)}</span></div>
    </article>
  )

  return (
    <section className="fl-section fl-community-preview">
      <div className="fl-community-heading">
        <motion.img
          className="fl-community-sticker"
          src={PROGRESS_STICKER}
          alt={t('landingV2.community.stickerAlt')}
          initial={{ opacity: 0, y: 18, rotate: -5 }}
          whileInView={{ opacity: 1, y: 0, rotate: 3 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        />
        <h2>{t('landingV2.community.title')}</h2>
        <p>{t('landingV2.community.copy')}</p>
      </div>
      <div className="fl-community-carousel" aria-label={t('landingV2.community.carouselLabel')}>
        <div className="fl-community-feed">
          <div className="fl-community-track">
            {COMMUNITY_POSTS.map((post) => renderPost(post))}
            {COMMUNITY_POSTS.map((post) => renderPost(post, true))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Closing({ ctaLink }) {
  const { t } = useTranslation()
  return (
    <section className="fl-closing-wrap" aria-label={t('landingV2.closing.aria')}>
      <div className="fl-closing">
        <motion.img className="fl-closing-mascot" src={ENCOURAGEMENT_STICKER} alt={t('landingV2.closing.stickerAlt')} initial={{ opacity: 0, y: 18, rotate: -3 }} whileInView={{ opacity: 1, y: 0, rotate: 2 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }} />
        <Link to={ctaLink} className="fl-primary-cta fl-primary-dark">{t('landingV2.closing.cta')} <ArrowRight size={19} /></Link>
      </div>
    </section>
  )
}

function LandingFooter({ ctaLink }) {
  const { t } = useTranslation()
  return (
    <footer className="fl-footer">
      <div className="fl-footer-main">
        <div className="fl-footer-about">
          <Link to="/" className="fl-footer-brand"><img className="fl-footer-wordmark" src={BRAND_WORDMARK} alt="FlowLab" /></Link>
        </div>
        <div className="fl-footer-column"><strong>{t('landingV2.footer.quickNav')}</strong><Link to="/">{t('landingV2.footer.home')}</Link><Link to={ctaLink}>{t('landingV2.footer.start')}</Link><Link to="/dashboard">{t('landingV2.footer.growth')}</Link><Link to="/profile">{t('landingV2.footer.profile')}</Link></div>
        <div className="fl-footer-column"><strong>{t('landingV2.footer.about')}</strong><span>{t('landingV2.footer.languages')}</span><span>{t('landingV2.footer.roles')}</span><span>{t('landingV2.footer.companion')}</span></div>
      </div>
      <div className="fl-footer-bottom"><span>{t('landingV2.footer.copyright')}</span><span>{t('landingV2.footer.tagline')}</span></div>
    </footer>
  )
}

export default function LandingPage() {
  const { user } = useAuth()
  const { t, i18n } = useTranslation()
  const ctaLink = user ? '/setup' : '/login'

  useEffect(() => {
    document.title = t('landingV2.metaTitle')
  }, [i18n.resolvedLanguage, t])

  return (
    <div className="flowlab-landing">
      <div className="fl-landing-language">
        <LanguageSwitcher />
      </div>
      <main>
        <Hero ctaLink={ctaLink} />
        <CapabilityCards ctaLink={ctaLink} />
        <JourneySection />
        <CommunityPreview />
        <Closing ctaLink={ctaLink} />
      </main>
      <LandingFooter ctaLink={ctaLink} />
    </div>
  )
}
