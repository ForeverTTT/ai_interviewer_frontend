import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Check,
  ChevronRight,
  FilePenLine,
  Headphones,
  MessageCircleMore,
  Mic2,
  Radar,
  Sparkles,
  Star,
  WandSparkles,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import './LandingPage.css'

const CHARACTER_SHEET = '/brand/flowlab-felt-character-board-v5-role-system.png'
const BASE_CHARACTER = '/brand/flowlab-felt-base-body-v1.png'

const SHELL_TEAM = [
  {
    id: 'coach', crop: 'top-left', number: '01', role: '面试教练', label: '定制追问', color: 'navy', Icon: MessageCircleMore,
    title: '按你的岗位追问，\n练到真正敢开口',
    copy: '读懂职位描述、简历和目标公司，让每一轮练习都像为你单独准备。',
    intro: '小队里最会追根究底的教练。负责把你的目标岗位翻译成真实问题，也会顺着回答继续追问。',
    bubble: '如果面试官继续追问，\n你会怎么把这个项目讲清楚？',
  },
  {
    id: 'practice', crop: 'bottom-left', number: '02', role: '陪练搭子', label: '语音模拟', color: 'aqua', Icon: Headphones,
    title: '开口练，比在脑子里\n想一百遍更有用',
    copy: '中文准备思路，英语或德语真实作答，在可控的压力里练出自己的节奏。',
    intro: '最有耐心的语音陪练搭子。陪你反复开口、调整节奏，把脑海里的答案慢慢练成自然表达。',
    bubble: '别背答案。先说出来，\n我陪你把它越讲越顺。',
  },
  {
    id: 'resume', crop: 'top-right', number: '03', role: '简历裁缝', label: '简历优化', color: 'pink', Icon: FilePenLine,
    title: '让经历更像成果，\n不再像一份流水账',
    copy: '从 JD 里找到真正重要的关键词，在不虚构经历的前提下优化简历和求职信。',
    intro: '懂岗位也懂表达的简历裁缝。专门寻找经历里的亮点，把散落的材料裁成更有说服力的故事。',
    bubble: '这段经历很有料，\n只是还没把影响力写出来。',
  },
  {
    id: 'review', crop: 'bottom-right', number: '04', role: '复盘学长', label: '逐题复盘', color: 'green', Icon: Radar,
    title: '把每次卡壳，\n变成下一次的底气',
    copy: '报告不只给分数。逐题回看、闪卡练习和成长轨迹，告诉你下一次具体怎么答。',
    intro: '会把复杂反馈讲明白的复盘学长。帮你找到真正卡住的地方，再把建议拆成下一轮能练的动作。',
    bubble: '这题不是不会，\n是证据还没有讲到位。',
  },
]

const JOURNEY = [
  { step: '01', kicker: '把目标告诉壳仔', title: '粘贴 JD，带上你的简历', copy: 'AI 先理解岗位，再决定问什么。拒绝所有人都一样的固定题库。', accent: 'yellow', Icon: WandSparkles },
  { step: '02', kicker: '像真的一样开口', title: '和 AI 面试官聊一轮', copy: '真实语音、连续追问、英德双语。短练习可以热身，完整模拟也能扛住压力。', accent: 'aqua', Icon: Mic2 },
  { step: '03', kicker: '把反馈练成能力', title: '用闪卡逐题复盘', copy: '对照自己的回答、参考思路和改进动作，下一轮就能立刻用上。', accent: 'pink', Icon: Star },
]

function MascotCrop({ crop, className = '' }) {
  return (
    <div className={`fl-mascot-crop fl-mascot-${crop} ${className}`} aria-hidden="true">
      <img src={CHARACTER_SHEET} alt="" />
    </div>
  )
}

function Hero({ ctaLink }) {
  return (
    <section className="fl-hero">
      <div className="fl-mesh fl-mesh-a" aria-hidden="true" /><div className="fl-mesh fl-mesh-b" aria-hidden="true" />
      <div className="fl-hero-grid">
        <motion.div className="fl-hero-copy" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
          <h1><span className="fl-hero-brand-cn">不卡壳实验室</span><span className="fl-hero-brand-en">FlowLab</span></h1>
          <p className="fl-hero-lead">不背标准答案，也不把面试变成考试。壳仔陪你从简历、模拟面试到逐题复盘，慢慢练出属于自己的表达。</p>
          <div className="fl-hero-actions">
            <Link to={ctaLink} className="fl-primary-cta">和壳仔练一轮 <ArrowRight size={19} strokeWidth={2.4} /></Link>
            <a href="#meet-shells" className="fl-secondary-cta">先看看怎么练 <ChevronRight size={18} /></a>
          </div>
          <div className="fl-proof-row" aria-label="产品特点">
            {['按 JD 定制', '英德语音对练', '逐题闪卡复盘'].map((text) => <span key={text}><Check size={13} strokeWidth={3} /> {text}</span>)}
          </div>
        </motion.div>

        <div className="fl-hero-visual">
          <div className="fl-stage-glass">
            <span className="fl-stage-label">Meet 壳仔 · Your FlowLab buddy</span>
            <motion.span className="fl-character-halo fl-halo-blue" initial={{ opacity: 0, scale: 0.82 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }} />
            <motion.img
              className="fl-base-hero-mascot"
              src={BASE_CHARACTER}
              alt="壳仔，不卡壳实验室的求职成长伙伴"
              initial={{ opacity: 0, y: 34, rotate: -2, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            />
            <motion.div className="fl-base-character-name" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.45 }}>
              <span>Hi</span><strong>我是壳仔</strong><small>你的求职成长搭子</small>
            </motion.div>
            <div className="fl-base-feature-tags" aria-hidden="true"><span>简历</span><span>模拟</span><span>复盘</span></div>
          </div>
        </div>
      </div>
    </section>
  )
}

function CapabilityCards({ ctaLink }) {
  return (
    <section className="fl-section fl-team-section" id="meet-shells">
      <div className="fl-section-head">
        <span>Meet the FlowLab crew</span>
        <h2>壳仔小队</h2>
        <h3>不同的卡壳时刻，交给不同的壳仔。</h3>
        <p>把复杂的 AI 能力变成四个有性格的伙伴。你不用研究工具，只要选择此刻最需要的帮助。</p>
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
            <Link to={ctaLink} className="fl-crew-member" aria-label={`和${role.role}试一轮：${role.label}`}>
              <div className="fl-crew-character">
                <MascotCrop crop={role.crop} className="fl-crew-portrait" />
              </div>
              <span className="fl-crew-accent-line" aria-hidden="true" />
              <h3>{role.role}</h3>
              <p>{role.label}</p>
            </Link>
          </motion.article>
        ))}
      </div>
    </section>
  )
}

function JourneySection() {
  return (
    <section className="fl-section fl-journey-section">
      <div className="fl-journey-intro"><span>三步完成一次有效练习</span><h2>少一点准备焦虑，多一点真的开口。</h2></div>
      <div className="fl-journey-list">
        {JOURNEY.map((item, index) => {
          const Icon = item.Icon
          return (
            <motion.article key={item.step} className={`fl-journey-item fl-journey-${item.accent}`} initial={{ opacity: 0, x: index % 2 ? 24 : -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}>
              <div className="fl-journey-marker">
                <span className="fl-journey-number">{item.step}</span>
                <div className="fl-journey-icon"><Icon size={25} /></div>
              </div>
              <div className="fl-journey-copy"><small>{item.kicker}</small><h3>{item.title}</h3><p>{item.copy}</p></div>
            </motion.article>
          )
        })}
      </div>
    </section>
  )
}

function ReviewPreview() {
  return (
    <section className="fl-section fl-review-section">
      <div className="fl-review-copy">
        <span className="fl-review-eyebrow"><Sparkles size={15} /> 复盘与闪卡</span>
        <h2>哪里卡住，<br />下一次就从哪里练。</h2>
        <p>把冗长的 AI 点评拆成正反对照：左边看哪里卡住，右边看下一次具体怎么说。收藏难题，随时回到闪卡复习。</p>
        <div className="fl-review-tags"><span>逐题复盘</span><span>参考答案</span><span>成长轨迹</span></div>
      </div>
      <motion.div className="fl-flashcard" initial={{ opacity: 0, rotate: 2, y: 30 }} whileInView={{ opacity: 1, rotate: -1, y: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}>
        <div className="fl-flashcard-top"><span>第 03 题 · 行为面试</span><span>已收藏 ☆</span></div>
        <h3>讲一个你推动团队解决分歧的例子。</h3>
        <div className="fl-answer-wave" aria-hidden="true"><span /><span /><span /></div>
        <div className="fl-compare-grid">
          <div className="fl-compare-miss"><small>这次卡住的地方</small><strong>行动过程太抽象</strong><p>说了“积极沟通”，但还缺少你实际做了什么。</p></div>
          <div className="fl-compare-next"><small>下一次这样试试</small><strong>补一个可验证动作</strong><p>说明你如何组织讨论、对齐目标，以及最后的结果。</p></div>
        </div>
        <div className="fl-flashcard-foot"><span>2 / 6</span><button type="button">下一张 <ArrowRight size={16} /></button></div>
      </motion.div>
    </section>
  )
}

function Closing({ ctaLink }) {
  return (
    <section className="fl-closing-wrap" aria-label="开始使用 FlowLab">
      <div className="fl-closing">
        <motion.img className="fl-closing-mascot" src={BASE_CHARACTER} alt="" aria-hidden="true" initial={{ opacity: 0, y: 18, rotate: -3 }} whileInView={{ opacity: 1, y: 0, rotate: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }} />
        <Link to={ctaLink} className="fl-primary-cta fl-primary-dark">免费开始第一轮 <ArrowRight size={19} /></Link>
      </div>
    </section>
  )
}

function LandingFooter({ ctaLink }) {
  return (
    <footer className="fl-footer">
      <div className="fl-footer-main">
        <div className="fl-footer-about">
          <Link to="/" className="fl-footer-brand"><img src={BASE_CHARACTER} alt="" /><div><strong>不卡壳实验室</strong><span>FlowLab</span></div></Link>
        </div>
        <div className="fl-footer-column"><strong>快速导航</strong><Link to="/">首页</Link><Link to={ctaLink}>开始练习</Link><Link to="/dashboard">成长记录</Link><Link to="/profile">个人资料</Link></div>
        <div className="fl-footer-column"><strong>关于 FlowLab</strong><span>支持英语与德语面试</span><span>覆盖实习 / Werkstudent / 校招</span><span>壳仔陪练 · 破壳同学成长</span></div>
      </div>
      <div className="fl-footer-bottom"><span>© 2026 不卡壳实验室 FlowLab</span><span>从校园到职场，开口不再卡壳。</span></div>
    </footer>
  )
}

export default function LandingPage() {
  const { user } = useAuth()
  const ctaLink = user ? '/setup' : '/login'

  useEffect(() => {
    document.title = '不卡壳实验室 FlowLab — 面试不再卡壳'
  }, [])

  return (
    <div className="flowlab-landing">
      <main>
        <Hero ctaLink={ctaLink} />
        <CapabilityCards ctaLink={ctaLink} />
        <JourneySection />
        <ReviewPreview />
        <Closing ctaLink={ctaLink} />
      </main>
      <LandingFooter ctaLink={ctaLink} />
    </div>
  )
}
