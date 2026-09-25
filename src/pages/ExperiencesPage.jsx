import { useState, useEffect, useMemo, useRef, forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getBackendBaseUrl } from '../lib/backendBase'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import {
  Search, Building2, GraduationCap, Briefcase, MapPin,
  Clock, ChevronDown, ChevronUp, MessageSquareQuote,
  CheckCircle2, XCircle, Award, Globe2, Loader2, Filter,
  Trash2, Plus, X, Send, BrainCircuit, Zap, AlertTriangle
} from 'lucide-react'

/**
 * 统计卡图标色。必须是完整类名字符串——
 * 之前写的是拼接式类名（text- 加变量 加 -500），这种类名会被生产构建整批 purge 掉，
 * 线上四张卡的图标是没有颜色的。
 */
const STAT_ICON_CLASS = {
  total: 'h-4 w-4 text-brand-muted',
  work: 'h-4 w-4 text-brand-muted',
  school: 'h-4 w-4 text-brand-muted',
  offers: 'h-4 w-4 text-brand-muted',
}

function ResultBadge({ result, t }) {
  if (!result) return null
  const lower = result.toLowerCase()
  if (lower.includes('offer') || lower.includes('admitted') || lower.includes('pass')) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-success/30 bg-brand-success/[0.10] px-3 py-1 text-[12px] font-bold text-brand-success">
        <CheckCircle2 className="w-3.5 h-3.5" />
        {t('exp.resultPass')}
      </span>
    )
  }
  if (lower.includes('reject') || lower.includes('fail')) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-danger/30 bg-brand-danger/[0.08] px-3 py-1 text-[12px] font-bold text-brand-danger">
        <XCircle className="w-3.5 h-3.5" />
        {t('exp.resultFail')}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-line bg-brand-inset px-3 py-1 text-[12px] font-bold text-brand-muted">
      {result}
    </span>
  )
}

function TypeBadge({ type, t }) {
  if (type === 'school') {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg border border-brand-line bg-brand-inset px-2.5 py-1 text-[11px] font-medium text-brand-muted">
        <GraduationCap className="w-3 h-3" />
        {t('exp.tagSchool')}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-brand-line bg-brand-inset px-2.5 py-1 text-[11px] font-bold text-brand-ink">
      <Briefcase className="w-3 h-3" />
      {t('exp.tagWork')}
    </span>
  )
}

function CustomDropdown({ label, value, options, onChange, t }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find(o => o.value === value)

  return (
    <div className="relative" ref={containerRef}>
      <label className="mb-2 ml-1 block text-[12.5px] font-bold text-brand-ink">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`flex h-[54px] w-full items-center justify-between rounded-xl border bg-brand-inset px-5 text-[13.5px] font-bold transition-colors ${isOpen ? 'border-brand-ink ring-1 ring-brand-ink' : 'border-brand-line hover:border-brand-muted/40'
          }`}
      >
        <div className="flex items-center gap-3">
          {selectedOption?.icon && <selectedOption.icon className="h-4 w-4 text-brand-muted" />}
          <span className="text-brand-ink">{selectedOption?.label || t('exp.selectPlaceholder')}</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-brand-muted transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="brand-float absolute z-[100] mt-2 w-full overflow-hidden rounded-[20px] border border-brand-line p-2"
          >
            {options.map((opt) => {
              const Icon = opt.icon
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value)
                    setIsOpen(false)
                  }}
                  className={`group relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[13px] font-bold transition-colors ${
                    value === opt.value
                      ? 'bg-brand-ink text-brand-on-ink'
                      : 'text-brand-muted hover:bg-brand-inset hover:text-brand-ink'
                  }`}
                >
                  <div className={`rounded-lg p-1.5 transition-colors ${
                    value === opt.value
                      ? 'bg-brand-on-ink/15'
                      : 'bg-brand-inset group-hover:bg-brand-card'
                  }`}>
                    {Icon && <Icon className={`h-3.5 w-3.5 ${value === opt.value ? 'text-current' : 'text-brand-muted group-hover:text-brand-ink'}`} />}
                  </div>
                  <span className="flex-1 text-left">{opt.label}</span>
                  {value === opt.value && (
                    <motion.div layoutId="activeOption" className="absolute right-4 w-1.5 h-1.5 rounded-full bg-current" />
                  )}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DeleteConfirmModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-brand-ink/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        transition={{ type: 'spring', duration: 0.35, bounce: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="brand-float relative w-full max-w-sm overflow-hidden rounded-[22px] border border-brand-line"
      >
        <div className="flex flex-col items-center px-8 pt-8 pb-6 text-center">
          <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-brand-danger/25 bg-brand-danger/[0.08]">
            <AlertTriangle className="h-7 w-7 text-brand-danger" />
          </div>
          <h3 className="font-brand text-[17px] font-semibold tracking-[-0.01em] text-brand-ink">
            确定要删除这条面经吗？
          </h3>
          <p className="mt-2.5 flex items-center gap-1.5 text-[13px] text-brand-muted">
            删除后能量值
            <span className="inline-flex items-center gap-0.5 font-semibold text-brand-danger">
              <Zap className="w-3.5 h-3.5" />-200
            </span>
          </p>
        </div>
        <div className="flex border-t border-brand-line">
          <button
            onClick={onClose}
            className="flex-1 py-4 text-[13px] font-bold text-brand-muted transition-colors hover:bg-brand-inset"
          >
            取消
          </button>
          <div className="w-px bg-brand-line" />
          <button
            onClick={onConfirm}
            className="flex-1 py-4 text-[13px] font-semibold text-brand-danger transition-colors hover:bg-brand-danger/[0.08]"
          >
            删除
          </button>
        </div>
      </motion.div>
    </div>
  )
}

const ExperienceCard = forwardRef(function ExperienceCard({ exp, t, user, onDelete }, ref) {
  const [expanded, setExpanded] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const isOwner = user && exp.user_id === user.id

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="brand-float group relative overflow-hidden rounded-[22px] border border-brand-line"
    >
      {isOwner && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowDeleteConfirm(true)
            }}
            className="absolute right-16 top-6 z-10 rounded-xl p-2 text-brand-muted opacity-0 transition-colors hover:bg-brand-danger/[0.08] hover:text-brand-danger group-hover:opacity-100"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {showDeleteConfirm && (
              <DeleteConfirmModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={() => {
                  setShowDeleteConfirm(false)
                  onDelete(exp.id)
                }}
              />
            )}
          </AnimatePresence>
        </>
      )}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-6 sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <TypeBadge type={exp.type} t={t} />
              <ResultBadge result={exp.result} t={t} />
              {exp.salary && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-brand-line bg-brand-card px-2.5 py-1 text-[11px] font-bold text-brand-ink">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-ink" aria-hidden="true" />
                  {exp.salary}
                </span>
              )}
            </div>

            <div>
              <h3 className="font-brand text-[17px] font-semibold leading-tight tracking-[-0.01em] text-brand-ink sm:text-[19px]">
                {exp.company}
              </h3>
              <p className="mt-1 text-[13.5px] font-bold text-brand-muted">
                {exp.position}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-brand-muted">
              {exp.department && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {exp.department}
                </span>
              )}
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {exp.location}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {exp.date}
              </span>
              <span className="flex items-center gap-1">
                <Globe2 className="w-3.5 h-3.5" />
                {exp.language}
              </span>
              {exp.publisher && (
                <span className="flex items-center gap-1 text-brand-muted">
                  <Award className="w-3.5 h-3.5" />
                  {exp.publisher}
                </span>
              )}
            </div>
          </div>

          <div className="shrink-0 mt-1">
            <div className={`grid h-8 w-8 place-items-center rounded-xl transition-colors duration-300 ${
              expanded
                ? 'bg-brand-ink text-brand-on-ink'
                : 'bg-brand-inset text-brand-muted'
            }`}>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-6 sm:px-8 pb-8 space-y-8">
              <div className="h-px bg-brand-line" />

              {exp.rounds?.map((round, ri) => (
                <div key={ri} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-ink text-[12px] font-semibold text-brand-on-ink">
                      {round.round}
                    </span>
                    <div>
                      <h4 className="text-[13.5px] font-semibold text-brand-ink">
                        {round.format}
                      </h4>
                      {round.duration_min && (
                        <span className="text-[11px] text-brand-muted">
                          {round.duration_min} min
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 pl-10">
                    <p className="mb-2 text-[12.5px] font-bold text-brand-ink">
                      {t('exp.questionsTitle')}
                    </p>
                    {round.questions.map((q, qi) => (
                      <div
                        key={qi}
                        className="flex gap-3 rounded-xl border border-brand-line bg-brand-inset px-4 py-2.5"
                      >
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border border-brand-line bg-brand-card text-[11px] font-semibold text-brand-ink">
                          {qi + 1}
                        </span>
                        <p className="text-[13.5px] leading-relaxed text-brand-ink">
                          {q}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {exp.reflection && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MessageSquareQuote className="h-4 w-4 text-brand-muted" />
                    <p className="text-[12.5px] font-bold text-brand-ink">
                      {t('exp.reflectionTitle')}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-brand-line bg-brand-inset p-5">
                    <p className="whitespace-pre-line text-[13.5px] leading-[1.8] text-brand-ink">
                      {exp.reflection}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
})

function PostModal({ isOpen, onClose, t, onPost, user }) {
  const [formData, setFormData] = useState({
    type: 'work',
    company: '',
    position: '',
    location: '',
    department: '',
    date: new Date().toISOString().slice(0, 7),
    language: 'English',
    result: 'Passed',
    salary: '',
    reflection: '',
    rounds: [{ round: 1, format: '', duration_min: 30, questions: [''] }]
  })
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')

  if (!isOpen) return null

  const addRound = () => {
    setFormData({ ...formData, rounds: [...formData.rounds, { round: formData.rounds.length + 1, format: '', duration_min: 30, questions: [''] }] })
  }

  const removeRound = (i) => {
    const nr = formData.rounds.filter((_, idx) => idx !== i).map((r, idx) => ({ ...r, round: idx + 1 }))
    setFormData({ ...formData, rounds: nr })
  }

  const updateRound = (i, field, value) => {
    const nr = [...formData.rounds]
    nr[i] = { ...nr[i], [field]: value }
    setFormData({ ...formData, rounds: nr })
  }

  const addQuestion = (ri) => {
    const nr = [...formData.rounds]
    nr[ri].questions.push('')
    setFormData({ ...formData, rounds: nr })
  }

  const updateQuestion = (ri, qi, val) => {
    const nr = [...formData.rounds]
    nr[ri].questions[qi] = val
    setFormData({ ...formData, rounds: nr })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setSubmitError('')
    try {
      await onPost(formData)
      onClose()
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:pt-24">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-brand-ink/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="custom-scrollbar brand-float relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[22px] border border-brand-line"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-brand-line bg-brand-card/85 px-8 py-6 backdrop-blur-md">
          <div>
            <h2 className="font-brand text-[21px] font-semibold tracking-[-0.01em] text-brand-ink">{t('exp.postTitle')}</h2>
            <p className="mt-1 text-[12.5px] text-brand-muted">{t('exp.postSubtitle')}</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 transition-colors hover:bg-brand-inset">
            <X className="h-5 w-5 text-brand-muted" />
          </button>
        </div>

        <div className="mx-8 mt-6 flex items-center justify-between rounded-2xl border border-brand-line bg-brand-inset p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-brand-line bg-brand-inset p-2 text-brand-ink">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[13.5px] font-semibold text-brand-ink">{t('profile.tokenRewardContribution')}</span>
              <p className="text-[11px] text-brand-muted">Community Reward: +200 Energy</p>
            </div>
          </div>
        </div>

        <div className="mx-8 mt-3 flex items-center gap-2.5 rounded-xl border border-brand-line bg-brand-card px-4 py-2.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-brand-ink" />
          <span className="text-[12.5px] font-bold text-brand-ink">{t('exp.dailyLimitHint')}</span>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <CustomDropdown
              label={t('exp.labelType')}
              value={formData.type}
              onChange={val => setFormData({...formData, type: val})}
              t={t}
              options={[
                { value: 'work', label: t('exp.filterWork'), icon: Briefcase },
                { value: 'school', label: t('exp.filterSchool'), icon: GraduationCap }
              ]}
            />
            <CustomDropdown
              label={t('exp.labelResult')}
              value={formData.result}
              onChange={val => setFormData({...formData, result: val})}
              t={t}
              options={[
                { value: 'Passed', label: t('exp.resultPass'), icon: CheckCircle2 },
                { value: 'Failed', label: t('exp.resultFail'), icon: XCircle }
              ]}
            />
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                required
                value={formData.company}
                onChange={e => setFormData({...formData, company: e.target.value})}
                placeholder={t('exp.postCompany')}
                className="w-full rounded-xl border border-brand-line bg-brand-inset px-5 py-3.5 text-[13.5px] font-bold text-brand-ink transition-colors placeholder:text-brand-muted/70 focus:border-brand-ink focus:outline-none"
              />
              <input
                required
                value={formData.position}
                onChange={e => setFormData({...formData, position: e.target.value})}
                placeholder={t('exp.postPosition')}
                className="w-full rounded-xl border border-brand-line bg-brand-inset px-5 py-3.5 text-[13.5px] font-bold text-brand-ink transition-colors placeholder:text-brand-muted/70 focus:border-brand-ink focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input
                value={formData.location}
                onChange={e => setFormData({...formData, location: e.target.value})}
                placeholder={t('exp.postLocation')}
                className="w-full rounded-xl border border-brand-line bg-brand-inset px-5 py-3.5 text-[13.5px] font-bold text-brand-ink transition-colors placeholder:text-brand-muted/70 focus:border-brand-ink focus:outline-none"
              />
              <input
                value={formData.department}
                onChange={e => setFormData({...formData, department: e.target.value})}
                placeholder={t('exp.postDepartment')}
                className="w-full rounded-xl border border-brand-line bg-brand-inset px-5 py-3.5 text-[13.5px] font-bold text-brand-ink transition-colors placeholder:text-brand-muted/70 focus:border-brand-ink focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <input
              type="month"
              value={formData.date}
              onChange={e => setFormData({...formData, date: e.target.value})}
              className="w-full rounded-xl border border-brand-line bg-brand-inset px-5 py-3.5 text-[12.5px] font-bold text-brand-ink transition-colors focus:border-brand-ink focus:outline-none"
            />
            <input
              value={formData.language}
              onChange={e => setFormData({...formData, language: e.target.value})}
              placeholder="English / German / Chinese"
              className="w-full rounded-xl border border-brand-line bg-brand-inset px-5 py-3.5 text-[13.5px] font-bold text-brand-ink transition-colors placeholder:text-brand-muted/70 focus:border-brand-ink focus:outline-none"
            />
            <input
              value={formData.salary}
              onChange={e => setFormData({...formData, salary: e.target.value})}
              placeholder="e.g. 16€/h"
              className="w-full rounded-xl border border-brand-line bg-brand-inset px-5 py-3.5 text-[13.5px] font-bold text-brand-ink transition-colors placeholder:text-brand-muted/70 focus:border-brand-ink focus:outline-none"
            />
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="ml-1 text-[12.5px] font-bold text-brand-ink">{t('exp.labelRounds')}</h4>
              <button
                type="button"
                onClick={addRound}
                className="flex items-center gap-1.5 rounded-lg bg-brand-ink px-3 py-1.5 text-[11px] font-bold text-brand-on-ink transition-transform duration-200 hover:-translate-y-0.5"
              >
                <Plus className="w-3 h-3" /> {t('exp.btnPulseRound')}
              </button>
            </div>

            {formData.rounds.map((r, ri) => (
              <div key={ri} className="space-y-4 rounded-[20px] border border-brand-line p-6">
                <div className="flex items-center justify-between text-[12.5px] font-bold text-brand-ink">
                  <span>{t('exp.roundLabel', { n: r.round })}</span>
                  {ri > 0 && <button onClick={() => removeRound(ri)} type="button" className="text-brand-danger transition-colors hover:underline">{t('exp.labelRemove')}</button>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    value={r.format}
                    onChange={e => updateRound(ri, 'format', e.target.value)}
                    placeholder={t('exp.phRoundsFormat')}
                    className="w-full rounded-xl border border-brand-line bg-brand-inset px-4 py-3 text-[12.5px] font-bold text-brand-ink placeholder:text-brand-muted/70"
                  />
                  <input
                    type="number"
                    value={r.duration_min}
                    onChange={e => updateRound(ri, 'duration_min', parseInt(e.target.value))}
                    placeholder={t('exp.phRoundsDuration')}
                    className="w-full rounded-xl border border-brand-line bg-brand-inset px-4 py-3 text-[12.5px] font-bold text-brand-ink placeholder:text-brand-muted/70"
                  />
                </div>
                <div className="space-y-3">
                   {r.questions.map((q, qi) => (
                     <div key={qi} className="flex gap-2">
                        <input
                          value={q}
                          onChange={e => updateQuestion(ri, qi, e.target.value)}
                          placeholder={`${t('exp.phRoundsQuestion')} ${qi + 1}`}
                          className="flex-1 rounded-xl border border-brand-line bg-brand-inset px-4 py-3 text-[12.5px] font-bold text-brand-ink placeholder:text-brand-muted/70"
                        />
                     </div>
                   ))}
                   <button type="button" onClick={() => addQuestion(ri)} className="text-[12px] font-semibold text-brand-ink hover:underline">+ {t('exp.btnPulseQuestion')}</button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
             <label className="ml-1 text-[12.5px] font-bold text-brand-ink">{t('exp.labelReflection')}</label>
             <textarea
               value={formData.reflection}
               onChange={e => setFormData({...formData, reflection: e.target.value})}
               className="min-h-[150px] w-full rounded-[20px] border border-brand-line bg-brand-inset px-5 py-4 text-[13.5px] font-medium text-brand-ink transition-colors placeholder:text-brand-muted/70 focus:border-brand-ink focus:outline-none"
               placeholder="Share your thoughts, tips, and experience..."
             />
          </div>

          <AnimatePresence>
            {submitError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-start gap-3 rounded-2xl border border-brand-danger/30 bg-brand-danger/[0.06] p-4"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-danger" />
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-brand-danger">{submitError}</p>
                </div>
                <button type="button" onClick={() => setSubmitError('')} className="rounded-lg p-0.5 transition-colors hover:bg-brand-danger/10">
                  <X className="h-3.5 w-3.5 text-brand-danger" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-[20px] bg-brand-ink py-4 text-[15px] font-semibold text-brand-on-ink transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {t('exp.submit')}
          </button>
        </form>
      </motion.div>
    </div>
  )
}

export default function ExperiencesPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [experiences, setExperiences] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState(searchParams.get('mine') === 'true' ? 'mine' : 'all')
  const [search, setSearch] = useState('')
  const [postModalOpen, setPostModalOpen] = useState(false)

  // Sync filter with URL parameter if it changes from Navbar
  useEffect(() => {
    if (searchParams.get('mine') === 'true') {
      setFilter('mine')
    } else {
      setFilter(prev => prev === 'mine' ? 'all' : prev)
    }
  }, [searchParams])

  useEffect(() => {
    document.title = filter === 'mine' ? t('nav.myExperiences') : t('meta.title')
  }, [t, filter])

  const fetchExperiences = async () => {
    setLoading(true)
    try {
      const backendUrl = getBackendBaseUrl()
      const url = `${backendUrl}/api/experiences`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setExperiences(data.experiences || [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExperiences()
  }, [])

  const handlePost = async (formData) => {
    const backendUrl = getBackendBaseUrl()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error('No valid session found. Please log in again.')

    // SECURITY: Sanitize all string inputs on the frontend before sending to the backend (prevent injection/XSS)
    const sanitize = (str) => typeof str === 'string' ? str.replace(/<[^>]*>?/gm, '').trim() : str;

    const sanitizedData = {
      ...formData,
      company: sanitize(formData.company),
      location: sanitize(formData.location),
      position: sanitize(formData.position),
      department: sanitize(formData.department),
      reflection: sanitize(formData.reflection),
      salary: sanitize(formData.salary),
      rounds: (formData.rounds || []).map(r => ({
        ...r,
        format: sanitize(r.format),
        questions: (r.questions || []).map(sanitize)
      }))
    }

    const res = await fetch(`${backendUrl}/api/experiences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify(sanitizedData)
    })

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      if (errBody.error === 'DAILY_LIMIT') {
        throw new Error(t('exp.dailyLimitReached'))
      }
      throw new Error(errBody.error || `Server returned ${res.status}: ${res.statusText}`)
    }

    // Refresh
    await fetchExperiences()
  }

  const handleDelete = async (id) => {
    try {
      const backendUrl = getBackendBaseUrl()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const res = await fetch(`${backendUrl}/api/experiences/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` }
      })

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error || `Delete failed with status ${res.status}`)
      }

      setExperiences(prev => prev.filter(e => e.id !== id))
      // Let Navbar / other token UI re-sync immediately after server-side -200.
      window.dispatchEvent(new Event('tokensChanged'))
    } catch (err) {
      alert(`Delete Error: ${err.message}`)
    }
  }

  const filtered = useMemo(() => {
    let list = experiences
    if (filter === 'work') list = list.filter(e => e.type === 'work')
    else if (filter === 'school') list = list.filter(e => e.type === 'school')
    else if (filter === 'mine') list = list.filter(e => user && e.user_id === user.id)

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(e => {
        const company = (e.company || '').toLowerCase()
        const position = (e.position || '').toLowerCase()
        const dept = (e.department || '').toLowerCase()
        const loc = (e.location || '').toLowerCase()
        const refl = (e.reflection || '').toLowerCase()

        const inRounds = e.rounds?.some(r => {
          const format = (r.format || '').toLowerCase()
          const questions = r.questions?.some(qu => (qu || '').toLowerCase().includes(q))
          return format.includes(q) || questions
        })

        return company.includes(q) ||
               position.includes(q) ||
               dept.includes(q) ||
               loc.includes(q) ||
               refl.includes(q) ||
               inRounds
      })
    }
    return list
  }, [experiences, filter, search])

  const stats = useMemo(() => {
    const total = experiences.length
    const work = experiences.filter(e => e.type === 'work').length
    const school = experiences.filter(e => e.type === 'school').length
    const mine = experiences.filter(e => user && e.user_id === user.id).length
    const offers = experiences.filter(e => {
      const r = (e.result || '').toLowerCase()
      return r.includes('offer') || r.includes('admitted') || r.includes('pass')
    }).length
    return { total, work, school, mine, offers }
  }, [experiences, user])

  const filterTabs = [
    { key: 'all', label: t('exp.filterAll'), count: stats.total },
    { key: 'work', label: t('exp.filterWork'), count: stats.work },
    { key: 'school', label: t('exp.filterSchool'), count: stats.school },
  ]

  if (user) {
    filterTabs.push({ key: 'mine', label: t('exp.filterMine'), count: stats.mine })
  }

  return (
    <div className="theme-quiet min-h-screen bg-brand-paper pb-16 pt-[calc(var(--ui-nav-h)+2rem)]">
      <div className="ui-container">
        <header className="mb-10 flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-end">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl space-y-3"
          >
            <h1 className="font-brand text-[30px] font-semibold leading-tight tracking-[-0.02em] text-brand-ink sm:text-[34px]">
              {t('exp.title')}
            </h1>
            <p className="text-[15px] leading-relaxed text-brand-muted">
              {t('exp.subtitle')}
            </p>
          </motion.div>

          {user && (
             <div className="flex flex-col items-center gap-2">
               <motion.button
                 initial={{ opacity: 0, scale: 0.9 }}
                 animate={{ opacity: 1, scale: 1 }}
                 onClick={() => setPostModalOpen(true)}
                 className="flex items-center gap-2.5 rounded-full bg-brand-ink px-7 py-3.5 text-[14px] font-semibold text-brand-on-ink transition-opacity duration-200 hover:opacity-90"
               >
                 <Plus className="w-5 h-5" />
                 {t('exp.postBtn')}
               </motion.button>
               <motion.div
                 initial={{ opacity: 0, y: -5 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.2 }}
                 className="flex items-center gap-1.5 rounded-full border border-brand-line bg-brand-inset px-3 py-1 text-[11px] font-medium text-brand-muted"
               >
                 <Zap className="w-3 h-3" />
                 {t('exp.rewardBadge')}
               </motion.div>
             </div>
          )}
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="h-8 w-8 animate-spin text-brand-muted" />
            <span className="ml-3 text-[13px] font-bold text-brand-muted">{t('exp.loading')}</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-32">
            <p className="text-[13px] font-bold text-brand-danger">{t('exp.error')}</p>
          </div>
        ) : (
          <>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10"
              >
                {[
                  { n: stats.total, label: t('exp.filterAll'), icon: Filter, tone: 'total' },
                  { n: stats.work, label: t('exp.filterWork'), icon: Briefcase, tone: 'work' },
                  { n: stats.school, label: t('exp.filterSchool'), icon: GraduationCap, tone: 'school' },
                  { n: stats.offers, label: 'Passed / Offers', icon: Award, tone: 'offers' },
                ].map(({ n, label, icon: Icon, tone }) => (
                  <div
                    key={label}
                    className="brand-float space-y-2 rounded-[20px] border border-brand-line p-5"
                  >
                    <div className="flex items-center justify-between">
                      {/* 完整类名走映射表：拼接出来的 text-xxx-500 会被生产构建 purge 掉 */}
                      <Icon className={STAT_ICON_CLASS[tone]} />
                      <span className="font-brand text-[22px] font-semibold tabular-nums text-brand-ink">{n}</span>
                    </div>
                    <p className="text-[12px] text-brand-muted">{label}</p>
                  </div>
                ))}
              </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-10"
            >
                <div className="flex flex-wrap gap-2 rounded-2xl border border-brand-line bg-brand-inset p-1.5">
                  {filterTabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => {
                        setFilter(tab.key)
                        // Optionally clear URL param
                        if (searchParams.get('mine')) {
                          setSearchParams({})
                        }
                      }}
                      aria-pressed={filter === tab.key}
                      /* 选中态用黑框 + ring，不加粗 border，避免 0.5px 布局位移 */
                      className={`rounded-xl border px-4 py-2.5 text-[12.5px] font-bold transition-colors ${
                        filter === tab.key
                          ? 'border-brand-ink bg-brand-card text-brand-ink ring-1 ring-brand-ink'
                          : 'border-transparent text-brand-muted hover:text-brand-ink'
                      }`}
                    >
                      {tab.label}
                      <span className={`ml-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
                        filter === tab.key
                          ? 'bg-brand-inset text-brand-ink'
                          : 'bg-brand-card text-brand-muted'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('exp.searchPlaceholder')}
                  className="w-full rounded-2xl border border-brand-line bg-brand-card py-3 pl-11 pr-4 text-[13.5px] font-medium text-brand-ink transition-colors placeholder:text-brand-muted/70 focus:border-brand-ink focus:outline-none"
                />
              </div>
            </motion.div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-10 text-center space-y-4">
                <p className="text-[13.5px] font-bold text-brand-muted">{filter === 'mine' ? t('exp.noMyResults') : t('exp.noResults')}</p>
                {search && (
                   <button
                     onClick={() => setSearch('')}
                     className="text-[12.5px] font-bold text-brand-ink underline decoration-brand-line underline-offset-4 transition-colors hover:decoration-brand-ink"
                   >
                     Clear Search
                   </button>
                )}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="space-y-5"
              >
                <AnimatePresence mode="popLayout">
                  {filtered.map((exp) => (
                    <ExperienceCard
                      key={exp.id}
                      exp={exp}
                      t={t}
                      user={user}
                      onDelete={handleDelete}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
            <AnimatePresence>
              {postModalOpen && (
                <PostModal
                  isOpen={postModalOpen}
                  onClose={() => setPostModalOpen(false)}
                  t={t}
                  onPost={handlePost}
                  user={user}
                />
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  )
}
