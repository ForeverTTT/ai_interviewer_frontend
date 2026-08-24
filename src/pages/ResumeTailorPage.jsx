import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  AlertCircle, Check, Copy, Download, FileText, Loader2,
  Save, Sparkles, Upload, WandSparkles,
} from 'lucide-react'
import { getBackendBaseUrl } from '../lib/backendBase'
import { authenticatedFetch } from '../lib/authenticatedFetch'
import { exportPdf, exportWord } from '../lib/documentExport'
import { parseJobDescription } from '../lib/jobDescriptionParser'

function fileToBase64Data(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const value = String(reader.result || '')
      resolve(value.includes(',') ? value.slice(value.indexOf(',') + 1) : value)
    }
    reader.onerror = () => reject(new Error('read failed'))
    reader.readAsDataURL(file)
  })
}

function ResultActions({ title, text, fileName, t }) {
  const [copied, setCopied] = useState(false)
  if (!text) return null
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={copy} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}{t('resumeTailor.copy')}
      </button>
      <button type="button" onClick={() => exportWord(title, text, fileName)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
        <Download className="h-4 w-4" />Word
      </button>
      <button type="button" onClick={() => exportPdf(title, text, fileName)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
        <Download className="h-4 w-4" />PDF
      </button>
    </div>
  )
}

export default function ResumeTailorPage() {
  const { t } = useTranslation()
  const backendUrl = getBackendBaseUrl()
  const fileRef = useRef(null)
  const lastAnalyzedRef = useRef('')
  const [resumeText, setResumeText] = useState('')
  const [resumeLoading, setResumeLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [jobDescription, setJobDescription] = useState('')
  const [position, setPosition] = useState('')
  const [analysisStatus, setAnalysisStatus] = useState('idle')
  const [language, setLanguage] = useState('Same as resume')
  const [tailoring, setTailoring] = useState(false)
  const [tailoredResume, setTailoredResume] = useState('')
  const [matchedKeywords, setMatchedKeywords] = useState([])
  const [missingKeywords, setMissingKeywords] = useState([])
  const [improvements, setImprovements] = useState([])
  const [letter, setLetter] = useState('')
  const [letterLoading, setLetterLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await authenticatedFetch(`${backendUrl}/api/profile/resume`)
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.error || 'load')
        if (!cancelled) setResumeText(body.resumeText || '')
      } catch {
        if (!cancelled) setNotice({ type: 'error', text: t('resumeTailor.loadError') })
      } finally {
        if (!cancelled) setResumeLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [backendUrl, t])

  const analyzeJd = async (force = false) => {
    const value = jobDescription.trim()
    if (value.length < 50 || (!force && value === lastAnalyzedRef.current)) return
    lastAnalyzedRef.current = value
    setAnalysisStatus('loading')
    try {
      await Promise.resolve()
      const result = parseJobDescription(value)
      if (result.position) setPosition(result.position)
      setAnalysisStatus('success')
    } catch {
      lastAnalyzedRef.current = ''
      setAnalysisStatus('error')
    }
  }

  useEffect(() => {
    const value = jobDescription.trim()
    if (value.length < 80 || value === lastAnalyzedRef.current) return undefined
    const timer = window.setTimeout(() => void analyzeJd(), 900)
    return () => window.clearTimeout(timer)
  }, [jobDescription])

  const saveResume = async (value, successText) => {
    const res = await authenticatedFetch(`${backendUrl}/api/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeText: value }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || 'save')
    setResumeText(body.resumeText || value)
    setNotice({ type: 'success', text: successText })
  }

  const uploadResume = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setNotice({ type: 'error', text: t('resumeTailor.pdfOnly') })
      return
    }
    if (file.size > 12 * 1024 * 1024) {
      setNotice({ type: 'error', text: t('resumeTailor.pdfTooLarge') })
      return
    }
    setUploading(true)
    setNotice(null)
    try {
      const pdfBase64 = await fileToBase64Data(file)
      const res = await authenticatedFetch(`${backendUrl}/api/profile/resume/parse-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfBase64 }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.text) throw Object.assign(new Error(body.error || 'parse'), { code: body.code || (res.status === 413 ? 'PDF_TOO_LARGE' : 'PDF_UNREADABLE') })
      await saveResume(body.text, t('resumeTailor.uploadSaved'))
    } catch (error) {
      const messageKey = {
        PDF_TOO_LARGE: 'pdfTooLarge',
        REQUEST_TOO_LARGE: 'pdfTooLarge',
        PDF_NO_TEXT: 'pdfNoText',
        PDF_PASSWORD_PROTECTED: 'pdfPasswordProtected',
        PDF_INVALID: 'pdfInvalid',
        PDF_UNREADABLE: 'pdfInvalid',
      }[error?.code] || 'uploadError'
      setNotice({ type: 'error', text: t(`resumeTailor.${messageKey}`) })
    } finally {
      setUploading(false)
    }
  }

  const tailorResume = async () => {
    if (!resumeText.trim() || jobDescription.trim().length < 50) {
      setNotice({ type: 'error', text: t('resumeTailor.missingInput') })
      return
    }
    setTailoring(true)
    setNotice(null)
    try {
      const res = await authenticatedFetch(`${backendUrl}/api/ai-assistant/tailor-resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position, jobDescription, resumeText, language }),
      })
      const body = await res.json().catch(() => ({}))
      if (res.status === 403) throw Object.assign(new Error('tokens'), { code: 'TOKENS' })
      if (!res.ok) throw new Error(body.error || 'tailor')
      setTailoredResume(body.tailoredResume || '')
      setMatchedKeywords(body.matchedKeywords || [])
      setMissingKeywords(body.missingKeywords || [])
      setImprovements(body.improvements || [])
      window.dispatchEvent(new Event('tokensChanged'))
    } catch (error) {
      setNotice({ type: 'error', text: error?.code === 'TOKENS' ? t('resumeTailor.tokensError') : t('resumeTailor.tailorError') })
    } finally {
      setTailoring(false)
    }
  }

  const persistTailoredResume = async () => {
    if (!tailoredResume.trim()) return
    setSaving(true)
    try {
      await saveResume(tailoredResume, t('resumeTailor.saveSuccess'))
    } catch {
      setNotice({ type: 'error', text: t('resumeTailor.saveError') })
    } finally {
      setSaving(false)
    }
  }

  const generateLetter = async () => {
    if (!resumeText.trim() || jobDescription.trim().length < 50 || !position.trim()) {
      setNotice({ type: 'error', text: t('resumeTailor.missingInput') })
      return
    }
    setLetterLoading(true)
    setNotice(null)
    try {
      const res = await authenticatedFetch(`${backendUrl}/api/ai-assistant/generate-motivation-letter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          position,
          jobDescription,
          resumeText: tailoredResume || resumeText,
          targetLength: 300,
          language: language === 'Same as resume' ? 'English' : language,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (res.status === 403) throw Object.assign(new Error('tokens'), { code: 'TOKENS' })
      if (!res.ok) throw new Error(body.error || 'letter')
      setLetter(body.text || '')
      window.dispatchEvent(new Event('tokensChanged'))
    } catch (error) {
      setNotice({ type: 'error', text: error?.code === 'TOKENS' ? t('resumeTailor.tokensError') : t('resumeTailor.letterError') })
    } finally {
      setLetterLoading(false)
    }
  }

  const chip = 'rounded-full border px-3 py-1.5 text-xs font-bold'

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-24 pt-32 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
        <motion.header initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-12 max-w-3xl space-y-5">
          <div className="section-badge">{t('resumeTailor.badge')}</div>
          <h1 className="font-serif text-4xl font-black tracking-tight text-slate-900 sm:text-5xl dark:text-white">{t('resumeTailor.title')}</h1>
          <p className="text-lg leading-relaxed text-slate-500 dark:text-slate-400">{t('resumeTailor.subtitle')}</p>
        </motion.header>

        {notice && (
          <div className={`mb-8 flex items-center gap-3 rounded-2xl border p-4 text-sm font-bold ${notice.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300' : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300'}`}>
            {notice.type === 'success' ? <Check className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}{notice.text}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-12">
          <section className="space-y-8 lg:col-span-5">
            <div className="card-premium space-y-6 p-7">
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">01</p><h2 className="mt-2 text-xl font-black text-slate-900 dark:text-white">{t('resumeTailor.baseResume')}</h2></div>
                {resumeText && <Link to="/profile/edit" className="text-xs font-bold text-indigo-600 dark:text-indigo-300">{t('resumeTailor.editProfile')}</Link>}
              </div>
              {resumeLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />{t('resumeTailor.loadingResume')}</div>
              ) : resumeText ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
                  <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-300"><Check className="h-4 w-4" />{t('resumeTailor.profileMatched')}</div>
                  <p className="mt-2 text-xs text-emerald-700/70 dark:text-emerald-300/70">{t('resumeTailor.resumeChars', { n: resumeText.length })}</p>
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center dark:border-slate-700">
                  <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={uploadResume} />
                  <FileText className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">{t('resumeTailor.noResume')}</p>
                  <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className="btn-setup-action mt-4 px-5 py-3">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{t('resumeTailor.uploadPdf')}
                  </button>
                </div>
              )}
            </div>

            <div className="card-premium space-y-6 p-7">
              <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">02</p><h2 className="mt-2 text-xl font-black text-slate-900 dark:text-white">{t('resumeTailor.jobDescription')}</h2></div>
              <textarea value={jobDescription} onChange={(event) => { setJobDescription(event.target.value); setAnalysisStatus('idle') }} rows={14} className="textarea-field-premium" placeholder={t('resumeTailor.jdPlaceholder')} />
              <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                <span>{analysisStatus === 'loading' ? t('resumeTailor.detecting') : analysisStatus === 'success' ? t('resumeTailor.detected') : analysisStatus === 'error' ? t('resumeTailor.detectError') : t('resumeTailor.autoDetect')}</span>
                <button type="button" onClick={() => void analyzeJd(true)} disabled={analysisStatus === 'loading' || jobDescription.trim().length < 50} className="font-bold text-indigo-600 disabled:opacity-40 dark:text-indigo-300">{t('resumeTailor.detectAgain')}</button>
              </div>
              <label className="block space-y-2"><span className="text-xs font-black uppercase tracking-widest text-slate-500">{t('resumeTailor.position')}</span><input value={position} onChange={event => setPosition(event.target.value)} className="input-field-premium px-4 py-3" placeholder={t('resumeTailor.positionPlaceholder')} /></label>
              <div className="grid grid-cols-3 gap-2">
                {['Same as resume', 'English', 'Deutsch'].map(value => <button key={value} type="button" onClick={() => setLanguage(value)} className={`rounded-xl border px-3 py-3 text-xs font-bold ${language === value ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-200' : 'border-slate-200 text-slate-500 dark:border-slate-700'}`}>{t(`resumeTailor.lang${value === 'Same as resume' ? 'Auto' : value}`)}</button>)}
              </div>
            </div>
          </section>

          <section className="space-y-8 lg:col-span-7">
            <div className="card-premium space-y-6 p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">03</p><h2 className="mt-2 text-xl font-black text-slate-900 dark:text-white">{t('resumeTailor.tailoredResume')}</h2><p className="mt-2 text-sm text-slate-500">{t('resumeTailor.tailoredHint')}</p></div>
                <button type="button" disabled={tailoring || !resumeText || jobDescription.trim().length < 50} onClick={tailorResume} className="btn-setup-action px-5 py-3">
                  {tailoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}{tailoring ? t('resumeTailor.tailoring') : t('resumeTailor.tailorButton')} <span className="text-[10px] opacity-70">−100</span>
                </button>
              </div>
              {tailoredResume ? (
                <>
                  <textarea value={tailoredResume} onChange={event => setTailoredResume(event.target.value)} rows={24} className="textarea-field-premium font-mono text-xs leading-relaxed" />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <ResultActions title={`${position} - Tailored Resume`} text={tailoredResume} fileName={`${position || 'tailored'}-resume`} t={t} />
                    <button type="button" disabled={saving} onClick={persistTailoredResume} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white dark:bg-white dark:text-slate-900">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{t('resumeTailor.saveAsProfile')}
                    </button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5 dark:border-emerald-900 dark:bg-emerald-950/20"><h3 className="text-sm font-black text-emerald-700 dark:text-emerald-300">{t('resumeTailor.matched')}</h3><div className="mt-3 flex flex-wrap gap-2">{matchedKeywords.map(item => <span key={item} className={`${chip} border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300`}>{item}</span>)}</div></div>
                    <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-5 dark:border-amber-900 dark:bg-amber-950/20"><h3 className="text-sm font-black text-amber-700 dark:text-amber-300">{t('resumeTailor.missing')}</h3><p className="mt-1 text-[10px] text-amber-700/70 dark:text-amber-300/70">{t('resumeTailor.missingHint')}</p><div className="mt-3 flex flex-wrap gap-2">{missingKeywords.map(item => <span key={item} className={`${chip} border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-300`}>{item}</span>)}</div></div>
                  </div>
                  {improvements.length > 0 && <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-900"><h3 className="text-sm font-black text-slate-900 dark:text-white">{t('resumeTailor.changes')}</h3><ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">{improvements.map(item => <li key={item} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{item}</li>)}</ul></div>}
                </>
              ) : <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 text-center dark:border-slate-700"><Sparkles className="h-8 w-8 text-slate-300" /><p className="mt-3 max-w-sm text-sm text-slate-500">{t('resumeTailor.emptyTailored')}</p></div>}
            </div>

            <div className="card-premium space-y-6 p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">04</p><h2 className="mt-2 text-xl font-black text-slate-900 dark:text-white">{t('resumeTailor.letterTitle')}</h2><p className="mt-2 text-sm text-slate-500">{t('resumeTailor.letterHint')}</p></div>
                <button type="button" disabled={letterLoading || !resumeText || !position || jobDescription.trim().length < 50} onClick={generateLetter} className="btn-setup-action px-5 py-3">
                  {letterLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{letterLoading ? t('resumeTailor.generatingLetter') : t('resumeTailor.generateLetter')} <span className="text-[10px] opacity-70">−100</span>
                </button>
              </div>
              {letter ? <><textarea value={letter} onChange={event => setLetter(event.target.value)} rows={18} className="textarea-field-premium leading-relaxed" /><ResultActions title={`${position} - Motivation Letter`} text={letter} fileName={`${position || 'motivation'}-letter`} t={t} /></> : <div className="flex min-h-44 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 px-6 text-center text-sm text-slate-500 dark:border-slate-700">{t('resumeTailor.emptyLetter')}</div>}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
