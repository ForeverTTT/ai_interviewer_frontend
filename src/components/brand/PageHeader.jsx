import { motion } from 'framer-motion'

/**
 * 内页统一页头：眉标 + 衬线大标题 + 副标题，右侧放页面级操作。
 * 所有内页都用它，保证标题层级、间距和入场动效一致。
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.eyebrow] 标题上方的小字
 * @param {import('react').ReactNode} props.title
 * @param {import('react').ReactNode} [props.subtitle]
 * @param {import('react').ReactNode} [props.actions] 右侧按钮组
 * @param {import('react').ReactNode} [props.before] 眉标之前的内容（如返回链接）
 * @param {'left'|'center'} [props.align]
 */
export default function PageHeader({ eyebrow, title, subtitle, actions, before, align = 'left', className = '' }) {
  const centered = align === 'center'
  return (
    <motion.header
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`mb-8 flex flex-col gap-6 ${centered ? 'items-center text-center' : 'md:flex-row md:items-end md:justify-between'} ${className}`}
    >
      <div className={`min-w-0 ${centered ? 'max-w-3xl' : 'max-w-3xl'}`}>
        {before && <div className={`flex ${centered ? 'justify-center' : ''}`}>{before}</div>}
        {eyebrow &&<p className={`lk-eyebrow ${centered ? 'justify-center' : ''}`}>{eyebrow}</p>}
        <h1 className={`lk-display text-[32px] leading-[1.12] sm:text-[40px] ${eyebrow ? 'mt-3' : ''}`}>
          {title}
        </h1>
        {subtitle && (
          <p className={`mt-3 text-[14.5px] leading-relaxed text-brand-muted ${centered ? 'mx-auto max-w-2xl' : 'max-w-2xl'}`}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div>}
    </motion.header>
  )
}
