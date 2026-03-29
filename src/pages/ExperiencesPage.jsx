import { useState, useEffect, useMemo, useRef } from 'react'
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
  Trash2, Plus, X, Send, BrainCircuit, Zap
} from 'lucide-react'

function ResultBadge({ result, t }) {
  if (!result) return null
  const lower = result.toLowerCase()
  if (lower.includes('offer') || lower.includes('admitted') || lower.includes('pass')) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
        <CheckCircle2 className="w-3.5 h-3.5" />
        {t('exp.resultPass')}
      </span>
    )
  }
  if (lower.includes('reject') || lower.includes('fail')) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800">
        <XCircle className="w-3.5 h-3.5" />
        {t('exp.resultFail')}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
      {result}
    </span>
  )
}

function TypeBadge({ type, t }) {
  if (type === 'school') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800">
        <GraduationCap className="w-3 h-3" />
        {t('exp.tagSchool')}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
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
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-2 block">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-[54px] flex items-center justify-between px-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-sm font-bold focus:outline-none focus:border-slate-300 transition-all hover:bg-white dark:hover:bg-slate-800 shadow-sm"
      >
        <div className="flex items-center gap-3">
          {selectedOption?.icon && <selectedOption.icon className="w-4 h-4 text-slate-400" />}
          <span className="text-slate-900 dark:text-white">{selectedOption?.label || t('exp.selectPlaceholder')}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-[100] w-full mt-2 p-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-100 dark:border-slate-800 rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden"
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
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all relative group ${
                    value === opt.value
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg transition-colors ${
                    value === opt.value 
                      ? (value === 'work' || value === 'Passed' ? 'bg-primary-500/20' : 'bg-slate-500/20')
                      : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-700'
                  }`}>
                    {Icon && <Icon className={`w-3.5 h-3.5 ${value === opt.value ? 'text-current' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />}
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

function ExperienceCard({ exp, t, user, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const isOwner = user && exp.user_id === user.id

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden group relative"
    >
      {isOwner && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (window.confirm(t('exp.confirmDelete'))) onDelete(exp.id)
          }}
          className="absolute top-6 right-16 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all opacity-0 group-hover:opacity-100 z-10"
        >
          <Trash2 className="w-4 h-4" />
        </button>
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
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                  {exp.salary}
                </span>
              )}
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                {exp.company}
              </h3>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mt-1">
                {exp.position}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-500">
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
                <span className="flex items-center gap-1 text-slate-400">
                  <Award className="w-3.5 h-3.5" />
                  {exp.publisher}
                </span>
              )}
            </div>
          </div>

          <div className="shrink-0 mt-1">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 ${
              expanded
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
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
              <div className="h-px bg-slate-100 dark:bg-slate-800" />

              {exp.rounds?.map((round, ri) => (
                <div key={ri} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black">
                      {round.round}
                    </span>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">
                        {round.format}
                      </h4>
                      {round.duration_min && (
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {round.duration_min} min
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 pl-10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                      {t('exp.questionsTitle')}
                    </p>
                    {round.questions.map((q, qi) => (
                      <div
                        key={qi}
                        className="flex gap-3 py-2.5 px-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50"
                      >
                        <span className="shrink-0 w-5 h-5 rounded-md bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-black text-slate-600 dark:text-slate-300 mt-0.5">
                          {qi + 1}
                        </span>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
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
                    <MessageSquareQuote className="w-4 h-4 text-slate-400" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {t('exp.reflectionTitle')}
                    </p>
                  </div>
                  <div className="p-5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30">
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-[1.8] whitespace-pre-line">
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
}

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
    try {
      await onPost(formData)
      onClose()
    } catch (err) {
      alert(err.message)
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
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-950 rounded-[2.5rem] shadow-2xl overflow-y-auto experience-modal"
      >
        <style dangerouslySetInnerHTML={{ __html: `
          .experience-modal::-webkit-scrollbar {
            width: 6px;
          }
          .experience-modal::-webkit-scrollbar-track {
            background: rgba(0,0,0,0.02);
            border-radius: 10px;
          }
          .experience-modal::-webkit-scrollbar-thumb {
            background: rgba(0,0,0,0.1);
            border-radius: 10px;
            border: 2px solid transparent;
            background-clip: content-box;
          }
          .experience-modal::-webkit-scrollbar-thumb:hover {
            background: rgba(0,0,0,0.2);
            background-clip: content-box;
          }
          .dark .experience-modal::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.05);
          }
        `}} />
        <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{t('exp.postTitle')}</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('exp.postSubtitle')}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="mx-8 mt-6 p-4 rounded-2xl bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-2 rounded-xl text-white shadow-lg shadow-orange-500/20">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black text-orange-900 dark:text-orange-400">{t('profile.tokenRewardContribution')}</span>
              <p className="text-[10px] font-bold text-orange-600/70 dark:text-orange-500/70 uppercase tracking-widest">Community Reward: +200 Energy</p>
            </div>
          </div>
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
                className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-sm font-bold focus:outline-none focus:border-slate-300 transition-all"
              />
              <input 
                required
                value={formData.position} 
                onChange={e => setFormData({...formData, position: e.target.value})}
                placeholder={t('exp.postPosition')}
                className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-sm font-bold focus:outline-none focus:border-slate-300 transition-all"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input 
                value={formData.location} 
                onChange={e => setFormData({...formData, location: e.target.value})}
                placeholder={t('exp.postLocation')}
                className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-sm font-bold focus:outline-none focus:border-slate-300 transition-all"
              />
              <input 
                value={formData.department} 
                onChange={e => setFormData({...formData, department: e.target.value})}
                placeholder={t('exp.postDepartment')}
                className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-sm font-bold focus:outline-none focus:border-slate-300 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <input 
              type="month"
              value={formData.date} 
              onChange={e => setFormData({...formData, date: e.target.value})}
              className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs font-bold focus:outline-none focus:border-slate-300 transition-all"
            />
            <input 
              value={formData.language} 
              onChange={e => setFormData({...formData, language: e.target.value})}
              placeholder="English / German / Chinese"
              className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-sm font-bold focus:outline-none focus:border-slate-300 transition-all"
            />
            <input 
              value={formData.salary} 
              onChange={e => setFormData({...formData, salary: e.target.value})}
              placeholder="e.g. 16€/h"
              className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-sm font-bold focus:outline-none focus:border-slate-300 transition-all"
            />
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">{t('exp.labelRounds')}</h4>
              <button 
                type="button" 
                onClick={addRound}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform"
              >
                <Plus className="w-3 h-3" /> {t('exp.btnPulseRound')}
              </button>
            </div>
            
            {formData.rounds.map((r, ri) => (
              <div key={ri} className="p-6 rounded-3xl border border-slate-100 dark:border-slate-900/50 space-y-4">
                <div className="flex items-center justify-between font-black text-xs uppercase tracking-widest text-slate-400">
                  <span>{t('exp.roundLabel', { n: r.round })}</span>
                  {ri > 0 && <button onClick={() => removeRound(ri)} type="button" className="text-red-500 hover:text-red-600">{t('exp.labelRemove')}</button>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input 
                    value={r.format} 
                    onChange={e => updateRound(ri, 'format', e.target.value)}
                    placeholder={t('exp.phRoundsFormat')}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs font-bold"
                  />
                  <input 
                    type="number"
                    value={r.duration_min} 
                    onChange={e => updateRound(ri, 'duration_min', parseInt(e.target.value))}
                    placeholder={t('exp.phRoundsDuration')}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs font-bold"
                  />
                </div>
                <div className="space-y-3">
                   {r.questions.map((q, qi) => (
                     <div key={qi} className="flex gap-2">
                        <input 
                          value={q} 
                          onChange={e => updateQuestion(ri, qi, e.target.value)}
                          placeholder={`${t('exp.phRoundsQuestion')} ${qi + 1}`}
                          className="flex-1 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs font-bold"
                        />
                     </div>
                   ))}
                   <button type="button" onClick={() => addQuestion(ri)} className="text-[10px] font-black text-primary-600 uppercase tracking-widest">+ {t('exp.btnPulseQuestion')}</button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
             <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">{t('exp.labelReflection')}</label>
             <textarea 
               value={formData.reflection}
               onChange={e => setFormData({...formData, reflection: e.target.value})}
               className="w-full px-5 py-4 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-sm font-bold min-h-[150px] focus:outline-none focus:border-slate-300 transition-all"
               placeholder="Share your thoughts, tips, and experience..."
             />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-3xl text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-200 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
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
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-slate-950 pt-32 pb-20">
      <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
        <header className="mb-16 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl space-y-6"
          >
            <div className="section-badge">{t('exp.badge')}</div>
            <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight font-serif">
              {t('exp.title')}
            </h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
              {t('exp.subtitle')}
            </p>
          </motion.div>

          {user && (
             <div className="flex flex-col items-center gap-2">
               <motion.button
                 initial={{ opacity: 0, scale: 0.9 }}
                 animate={{ opacity: 1, scale: 1 }}
                 onClick={() => setPostModalOpen(true)}
                 className="flex items-center gap-3 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] text-sm font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-900/10"
               >
                 <Plus className="w-5 h-5" />
                 {t('exp.postBtn')}
               </motion.button>
               <motion.div 
                 initial={{ opacity: 0, y: -5 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.2 }}
                 className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full text-[10px] font-black tracking-widest uppercase border border-amber-200 dark:border-amber-800/50 shadow-sm"
               >
                 <Zap className="w-3 h-3" />
                 {t('exp.rewardBadge')}
               </motion.div>
             </div>
          )}
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            <span className="ml-3 text-sm font-bold text-slate-500">{t('exp.loading')}</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-32">
            <p className="text-sm font-bold text-red-500">{t('exp.error')}</p>
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
                  { n: stats.total, label: t('exp.filterAll'), icon: Filter, color: 'slate' },
                  { n: stats.work, label: t('exp.filterWork'), icon: Briefcase, color: 'blue' },
                  { n: stats.school, label: t('exp.filterSchool'), icon: GraduationCap, color: 'violet' },
                  { n: stats.offers, label: 'Passed / Offers', icon: Award, color: 'emerald' },
                ].map(({ n, label, icon: Icon, color }) => (
                  <div
                    key={label}
                    className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <Icon className={`w-4 h-4 text-${color}-500`} />
                      <span className="text-2xl font-black text-slate-900 dark:text-white">{n}</span>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                  </div>
                ))}
              </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-10"
            >
                <div className="flex flex-wrap gap-2 bg-slate-50 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800">
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
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        filter === tab.key
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-sm'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {tab.label}
                      <span className={`ml-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                        filter === tab.key
                          ? 'bg-slate-100 dark:bg-slate-700'
                          : 'bg-slate-200/50 dark:bg-slate-800'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('exp.searchPlaceholder')}
                  className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-300 dark:focus:border-slate-600 transition-colors"
                />
              </div>
            </motion.div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-10 text-center space-y-4">
                <p className="text-sm font-bold text-slate-400">{filter === 'mine' ? t('exp.noMyResults') : t('exp.noResults')}</p>
                {search && (
                   <button 
                     onClick={() => setSearch('')}
                     className="text-xs font-black text-slate-900 dark:text-white underline underline-offset-4 decoration-slate-200 hover:decoration-slate-900 transition-all uppercase tracking-widest"
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
