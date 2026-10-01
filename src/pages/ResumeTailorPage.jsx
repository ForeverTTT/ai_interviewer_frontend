import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle, Check, Copy, Download, FileText, Loader2,
  Sparkles, Upload, WandSparkles,
} from 'lucide-react'
import { getBackendBaseUrl } from '../lib/backendBase'
import { authenticatedFetch } from '../lib/authenticatedFetch'
import { exportPdf, exportWord } from '../lib/documentExport'
import { parseJobDescription } from '../lib/jobDescriptionParser'
import './ResumeTailorPage.css'

const RESUME_TAILOR_WORKING = '/brand/flowlab-resume-tailor-working.png'

/** 输入控件共用的一套品牌样式；写成常量避免每处手抄一遍长串类名 */
const FIELD_BASE = 'w-full rounded-xl border border-brand-line bg-brand-inset text-brand-ink transition-colors placeholder:text-brand-muted/70 focus:border-brand-violet focus:outline-none focus:ring-4 focus:ring-brand-violet/10'
const INPUT_CLASS = `${FIELD_BASE} px-4 py-3 text-[13.5px] font-medium`
const TEXTAREA_CLASS = `${FIELD_BASE} resize-none px-4 py-3.5 text-[13.5px] leading-relaxed`
/** 次级按钮：白底 + 描边，hover 转黑框 */
const SECONDARY_BUTTON = 'resume-tailor-secondary-button inline-flex items-center justify-center gap-2 rounded-full border px-3.5 py-2 text-[12.5px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60'
/** 主 CTA：墨色实心。徽标压在按钮里，用半透明的 on-ink 而不是实心块，避免黑上叠黑 */
const PRIMARY_CTA = 'resume-tailor-primary-button inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[13.5px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50'
const CTA_BADGE = 'rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium'

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
      <button type="button" onClick={copy} className={SECONDARY_BUTTON}>
        {copied ? <Check className="h-4 w-4 text-brand-success" /> : <Copy className="h-4 w-4" />}{t('resumeTailor.copy')}
      </button>
      <button type="button" onClick={() => exportWord(title, text, fileName)} className={SECONDARY_BUTTON}>
        <Download className="h-4 w-4" />Word
      </button>
      <button type="button" onClick={() => exportPdf(title, text, fileName)} className={SECONDARY_BUTTON}>
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
  const [activeOutput, setActiveOutput] = useState('resume')
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

  const saveResume = async (value, successText, cvProfile = null) => {
    const res = await authenticatedFetch(`${backendUrl}/api/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resumeText: value,
        ...(cvProfile ? { profileJson: { cvProfile } } : {}),
      }),
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
      const clean = body.text.replace(/[●•⚫🌑⦿★■◾▪]/g, '').trim()
      let cvProfile = null
      try {
        const extractRes = await authenticatedFetch(`${backendUrl}/api/profile/extract-cv`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resumeText: clean }),
        })
        const extracted = await extractRes.json().catch(() => ({}))
        if (extractRes.ok && extracted.cvProfile) cvProfile = extracted.cvProfile
      } catch {
        // The base resume is still useful if structured recognition is temporarily unavailable.
      }
      await saveResume(clean, t(cvProfile ? 'resumeTailor.uploadSavedFilled' : 'resumeTailor.uploadSaved'), cvProfile)
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

  const chip = 'rounded-full border px-3 py-1.5 text-[12px] font-medium'

  return (
    <div className="resume-tailor-page theme-quiet min-h-screen pb-24 pt-[calc(var(--ui-nav-h)+2.25rem)]">
      <div className="ui-container">
        <header className="resume-tailor-hero">
          <div className="resume-tailor-hero-copy resume-tailor-coach-panel">
            <h1 className="resume-tailor-coach-prompt">{t('resumeTailor.coachPrompt')}</h1>

            <div className="resume-tailor-base-resume rounded-xl border px-4 py-3">
              <div className="flex items-center gap-3.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-brand-line bg-brand-card text-brand-muted">
                  {resumeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-[14px] font-semibold text-brand-ink">{t('resumeTailor.baseResume')}</h2>
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-[12px] text-brand-muted">
                    {resumeText && <Check className="h-3.5 w-3.5 shrink-0 text-brand-success" />}
                    <span className="truncate">
                      {resumeLoading
                        ? t('resumeTailor.loadingResume')
                        : resumeText
                          ? `${t('resumeTailor.profileMatched')} · ${t('resumeTailor.resumeChars', { n: resumeText.length })}`
                          : t('resumeTailor.noResume')}
                    </span>
                  </p>
                </div>
                <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={uploadResume} />
                {resumeText && (
                  <Link to="/profile/edit" state={{ returnTo: '/resume-tailor' }} className={`${SECONDARY_BUTTON} shrink-0`}>{t('resumeTailor.editProfile')}</Link>
                )}
              </div>
              {!resumeLoading && !resumeText && (
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-brand-violet/10 pt-3">
                  <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className={SECONDARY_BUTTON}>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{t('resumeTailor.uploadExisting')}
                  </button>
                  <Link to="/profile/edit" state={{ returnTo: '/resume-tailor' }} className={PRIMARY_CTA}>{t('resumeTailor.buildResume')}</Link>
                </div>
              )}
            </div>

            <div className="resume-tailor-coach-grid">
              <label className="block min-w-0 space-y-2">
                <span className="block text-[13px] font-semibold text-brand-ink">{t('resumeTailor.jobDescription')}</span>
                <textarea value={jobDescription} onChange={(event) => { setJobDescription(event.target.value); setAnalysisStatus('idle') }} rows={7} className={TEXTAREA_CLASS} placeholder={t('resumeTailor.jdPlaceholder')} />
                <span className={`flex items-center justify-between gap-3 text-[11.5px] ${analysisStatus === 'error' ? 'text-brand-danger' : analysisStatus === 'success' ? 'text-brand-success' : 'text-brand-muted'}`}>
                  <span>{analysisStatus === 'loading' ? t('resumeTailor.detecting') : analysisStatus === 'success' ? t('resumeTailor.detected') : analysisStatus === 'error' ? t('resumeTailor.detectError') : t('resumeTailor.autoDetect')}</span>
                  <button type="button" onClick={() => void analyzeJd(true)} disabled={analysisStatus === 'loading' || jobDescription.trim().length < 50} className="shrink-0 font-semibold text-brand-violet hover:underline disabled:cursor-not-allowed disabled:opacity-40">{t('resumeTailor.detectAgain')}</button>
                </span>
              </label>
              <div className="space-y-4">
                <label className="block space-y-2"><span className="block text-[12.5px] font-semibold text-brand-ink">{t('resumeTailor.position')}</span><input value={position} onChange={event => setPosition(event.target.value)} className={INPUT_CLASS} placeholder={t('resumeTailor.positionPlaceholder')} /></label>
                <div className="grid gap-2">
                  {['Same as resume', 'English', 'Deutsch'].map(value => <button key={value} type="button" onClick={() => setLanguage(value)} className={`rounded-lg border px-3 py-2.5 text-[12.5px] font-medium transition-colors ${language === value ? 'border-brand-violet bg-brand-violet/[0.08] font-semibold text-brand-violet ring-1 ring-brand-violet/30' : 'border-brand-line bg-brand-card text-brand-muted hover:border-brand-violet/40'}`}>{t(`resumeTailor.lang${value === 'Same as resume' ? 'Auto' : value}`)}</button>)}
                </div>
              </div>
            </div>
          </div>
          <div className="resume-tailor-hero-visual" aria-hidden="true">
            <div className="resume-tailor-hero-glow" />
            <img src={RESUME_TAILOR_WORKING} alt="" />
          </div>
        </header>

        {notice && (
          <div className={`mb-6 flex items-center gap-3 rounded-xl border px-4 py-3 text-[13px] font-medium ${notice.type === 'success' ? 'border-brand-success/30 bg-brand-success/[0.06] text-brand-success' : 'border-brand-danger/30 bg-brand-danger/[0.06] text-brand-danger'}`}>
            {notice.type === 'success' ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}{notice.text}
          </div>
        )}

        <div className="resume-tailor-output-tabs" role="tablist" aria-label={t('resumeTailor.outputTabsLabel')}>
          <button type="button" role="tab" aria-selected={activeOutput === 'resume'} className={activeOutput === 'resume' ? 'is-active' : ''} onClick={() => setActiveOutput('resume')}>{t('resumeTailor.tailoredResume')}</button>
          <button type="button" role="tab" aria-selected={activeOutput === 'letter'} className={activeOutput === 'letter' ? 'is-active' : ''} onClick={() => setActiveOutput('letter')}>{t('resumeTailor.letterTitle')}</button>
        </div>

        <section className="resume-tailor-panel resume-tailor-output-panel space-y-5 rounded-[24px] px-7 py-7">
          {activeOutput === 'resume' ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><h2 className="text-[18px] font-semibold text-brand-ink">{t('resumeTailor.tailoredResume')}</h2><p className="mt-1 text-[12.5px] text-brand-muted">{t('resumeTailor.tailoredHint')}</p></div>
                <button type="button" disabled={tailoring || !resumeText || jobDescription.trim().length < 50} onClick={tailorResume} className={PRIMARY_CTA}>
                  {tailoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}{tailoring ? t('resumeTailor.tailoring') : t('resumeTailor.tailorButton')} <span className={CTA_BADGE}>−100</span>
                </button>
              </div>
              {tailoredResume ? (
                <>
                  <textarea value={tailoredResume} onChange={event => setTailoredResume(event.target.value)} rows={28} className={`${TEXTAREA_CLASS} text-[13px]`} />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <ResultActions title={`${position} - Tailored Resume`} text={tailoredResume} fileName={`${position || 'tailored'}-resume`} t={t} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-brand-success/30 bg-brand-success/[0.06] p-5"><h3 className="text-[13px] font-semibold text-brand-success">{t('resumeTailor.matched')}</h3><div className="mt-3 flex flex-wrap gap-2">{matchedKeywords.map(item => <span key={item} className={`${chip} border-brand-success/40 text-brand-success`}>{item}</span>)}</div></div>
                    {/* 「缺失关键词」原本用琥珀色、后来用荧光绿圆点；这套色板里都不合适，改成中性描边 + 墨色圆点 */}
                    <div className="rounded-xl border border-brand-line bg-brand-inset p-5"><h3 className="flex items-center gap-2 text-[13px] font-semibold text-brand-ink"><span className="h-2 w-2 shrink-0 rounded-full bg-brand-ink" aria-hidden="true" />{t('resumeTailor.missing')}</h3><p className="mt-1 text-[11px] text-brand-muted">{t('resumeTailor.missingHint')}</p><div className="mt-3 flex flex-wrap gap-2">{missingKeywords.map(item => <span key={item} className={`${chip} border-brand-line bg-brand-card text-brand-ink`}>{item}</span>)}</div></div>
                  </div>
                  {improvements.length > 0 && <div className="rounded-xl border border-brand-line bg-brand-inset p-5"><h3 className="text-[13px] font-semibold text-brand-ink">{t('resumeTailor.changes')}</h3><ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-brand-muted">{improvements.map(item => <li key={item} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-success" />{item}</li>)}</ul></div>}
                </>
              ) : <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed border-brand-line bg-brand-inset text-center"><Sparkles className="h-7 w-7 text-brand-muted" /><p className="mt-3 max-w-sm text-[13px] text-brand-muted">{t('resumeTailor.emptyTailored')}</p></div>}
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><h2 className="text-[18px] font-semibold text-brand-ink">{t('resumeTailor.letterTitle')}</h2><p className="mt-1 text-[12.5px] text-brand-muted">{t('resumeTailor.letterHint')}</p></div>
                <button type="button" disabled={letterLoading || !resumeText || !position || jobDescription.trim().length < 50} onClick={generateLetter} className={PRIMARY_CTA}>
                  {letterLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{letterLoading ? t('resumeTailor.generatingLetter') : t('resumeTailor.generateLetter')} <span className={CTA_BADGE}>−100</span>
                </button>
              </div>
              {letter ? <><textarea value={letter} onChange={event => setLetter(event.target.value)} rows={24} className={TEXTAREA_CLASS} /><ResultActions title={`${position} - Motivation Letter`} text={letter} fileName={`${position || 'motivation'}-letter`} t={t} /></> : <div className="flex min-h-80 items-center justify-center rounded-xl border border-dashed border-brand-line bg-brand-inset px-6 text-center text-[13px] text-brand-muted">{t('resumeTailor.emptyLetter')}</div>}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
