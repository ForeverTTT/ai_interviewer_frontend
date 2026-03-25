import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getBackendBaseUrl } from '../lib/backendBase'
import { buildInterviewPrompt } from '../lib/promptBuilder'
import ChatInterface from '../components/ChatInterface'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { InterviewThemeToggle } from '../components/ThemeToggle'
import {
  Clock, Globe2, Briefcase, ArrowLeft, AlertCircle,
  Play, ChevronDown, ChevronUp, Copy, CheckCheck, MessageSquare,
  Loader2, Video, VideoOff, Mic,
} from 'lucide-react'

function useCountdown(minutes) {
  const [timeLeft, setTimeLeft] = useState(minutes * 60)
  const [started,  setStarted]  = useState(false)
  const [finished, setFinished] = useState(false)
  const ref = useRef(null)

  const start = useCallback(() => setStarted(true), [])

  useEffect(() => {
    if (!started) return
    if (timeLeft <= 0) { setFinished(true); return }
    ref.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(ref.current); setFinished(true); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(ref.current)
  }, [started, timeLeft])

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const ss = String(timeLeft % 60).padStart(2, '0')
  const progress  = started ? ((minutes * 60 - timeLeft) / (minutes * 60)) * 100 : 0
  const isWarning  = timeLeft <= 120 && started
  const isCritical = timeLeft <= 60  && started

  return { display: `${mm}:${ss}`, progress, started, finished, isWarning, isCritical, start }
}

export default function InterviewPage() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const navigate  = useNavigate()
  const { position, jobDescription, language, duration, interviewId, resumeContext } = location.state || {}

  useEffect(() => {
    document.title = t('meta.title')
  }, [t, i18n.language])

  const [chatPhase, setChatPhase] = useState('idle')
  const [showEndModal,   setShowEndModal]   = useState(false)
  const [showPrompt,     setShowPrompt]     = useState(false)
  const [copied,         setCopied]         = useState(false)
  const [finalizing,     setFinalizing]     = useState(false)
  const [finalizeError,  setFinalizeError]  = useState(null)
  const chatRef = useRef(null)

  /* ── Lobby camera ── */
  const lobbyPreviewRef = useRef(null)
  const cameraStreamRef = useRef(null)
  const [lobbyCameraOn, setLobbyCameraOn] = useState(false)
  const [cameraStream,  setCameraStream]  = useState(null)
  const [cameraError,   setCameraError]   = useState(null)

  /* ── In-interview camera toggle ── */
  const [interviewCamOn, setInterviewCamOn] = useState(false)

  /* ── Mic ── */
  const [micGranted, setMicGranted] = useState(false)
  const [micBusy,    setMicBusy]    = useState(false)
  const micAnalyserRef  = useRef(null)
  const micAudioCtxRef  = useRef(null)
  const micRafRef       = useRef(null)
  const [micLevel, setMicLevel] = useState(0)

  const timer = useCountdown(duration || 10)

  /* ── Sync stream ref ── */
  useEffect(() => { cameraStreamRef.current = cameraStream }, [cameraStream])

  /* ── Cleanup on unmount ── */
  useEffect(() => () => {
    cameraStreamRef.current?.getTracks().forEach(tr => tr.stop())
    stopMicMeter()
  }, [])

  function stopMicMeter() {
    cancelAnimationFrame(micRafRef.current)
    try { micAudioCtxRef.current?.close() } catch { /* ignore */ }
    micAudioCtxRef.current = null
    micAnalyserRef.current = null
    setMicLevel(0)
  }

  /* ── Camera on/off ── */
  useEffect(() => {
    if (!lobbyCameraOn) {
      setCameraStream(prev => { prev?.getTracks().forEach(tr => tr.stop()); return null })
      setCameraError(null)
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setLobbyCameraOn(false)
      setCameraError(t('interview.lobbyMediaUnsupported'))
      return
    }
    let cancelled = false
    setCameraError(null)
    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
        if (cancelled) { stream.getTracks().forEach(tr => tr.stop()); return }
        setCameraStream(prev => { prev?.getTracks().forEach(tr => tr.stop()); return stream })
      } catch {
        if (!cancelled) { setLobbyCameraOn(false); setCameraError(t('interview.lobbyCameraDenied')) }
      }
    })()
    return () => { cancelled = true }
  }, [lobbyCameraOn, t])

  /* ── Sync lobby preview ── */
  useEffect(() => {
    const v = lobbyPreviewRef.current
    if (chatPhase !== 'idle' || !v) return
    if (cameraStream) { v.srcObject = cameraStream; v.play().catch(() => {}) }
    else { v.srcObject = null }
  }, [chatPhase, cameraStream])

  /* ── Mic permission + level meter ── */
  const requestMicPermission = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) { setCameraError(t('interview.lobbyMediaUnsupported')); return }
    setMicBusy(true); setCameraError(null)
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      setMicGranted(true)
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const source   = audioCtx.createMediaStreamSource(s)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      micAudioCtxRef.current = audioCtx
      micAnalyserRef.current = analyser
      micAnalyserRef.current._stream = s
      const data = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        if (!micAnalyserRef.current) return
        analyser.getByteFrequencyData(data)
        const rms = Math.sqrt(data.reduce((acc, v) => acc + v * v, 0) / data.length)
        setMicLevel(Math.min(1, rms / 80))
        micRafRef.current = requestAnimationFrame(tick)
      }
      micRafRef.current = requestAnimationFrame(tick)
    } catch {
      setMicGranted(false); setCameraError(t('interview.lobbyMicDenied'))
    } finally { setMicBusy(false) }
  }, [t])

  useEffect(() => { if (!position) navigate('/setup') }, [position, navigate])
  useEffect(() => () => { try { window.speechSynthesis?.cancel() } catch { /* ignore */ } }, [])

  const systemPrompt = position ? buildInterviewPrompt({ position, jobDescription, language, duration }) : ''

  const handleCopy = async () => {
    await navigator.clipboard.writeText(systemPrompt).catch(() => {})
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const handleStart = () => {
    stopMicMeter()
    micAnalyserRef.current?._stream?.getTracks().forEach(tr => tr.stop())
    setInterviewCamOn(true) // Always enable interview camera
    setChatPhase('preparing')
  }

  /* ── In-interview camera toggle REMOVED per user request ── */

  const handleInterviewUiReady = useCallback(() => {
    setChatPhase('live'); timer.start()
  }, [timer.start])

  const finalizeAndGoReport = useCallback(async () => {
    setShowEndModal(false); setFinalizeError(null)
    if (!interviewId) { navigate('/dashboard'); return }
    setFinalizing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) { setFinalizeError(t('report.finalizeNoAuth')); return }
      const transcript = chatRef.current?.getTranscript?.() ?? []
      const res = await fetch(`${getBackendBaseUrl()}/api/interviews/${interviewId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: transcript, reportUiLanguage: i18n.language }),
      })
      if (!res.ok) {
        let detail = t('report.finalizeFailed')
        try {
          const j = await res.json()
          if (j.error)   detail = `${detail}: ${j.error}`
          if (j.details) detail += ` — ${j.details}`
          if (j.hint)    detail += ` (${j.hint})`
        } catch { /* ignore */ }
        setFinalizeError(detail); return
      }
      navigate(`/interview/${interviewId}/report`)
    } catch (e) {
      console.error('[finalize]', e); setFinalizeError(t('report.finalizeNetwork'))
    } finally { setFinalizing(false) }
  }, [interviewId, navigate, t, i18n.language])

  if (!position) return null

  const progressColor = timer.isCritical ? 'bg-red-500' : timer.isWarning ? 'bg-amber-500' : 'bg-primary-500'
  const interviewStream = interviewCamOn ? cameraStream : null

  /* ── Mic level bar ── */
  const MicLevelBar = () => {
    const bars = 5
    const filled = Math.round(micLevel * bars)
    return (
      <div className="flex items-center gap-1.5 ml-2">
        <span className="text-xs text-slate-500 dark:text-slate-400">{t('interview.lobbyMicLevel')}</span>
        <div className="flex items-end gap-0.5 h-5">
          {Array.from({ length: bars }, (_, i) => (
            <div
              key={i}
              className={`w-1.5 rounded-sm transition-all duration-75 ${
                i < filled ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'
              }`}
              style={{ height: `${40 + i * 12}%` }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '100dvh' }} className="flex flex-col overflow-hidden bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-white">

      {finalizeError && (
        <div className="flex-shrink-0 px-4 py-2.5 text-sm bg-red-100 text-red-900 border-b border-red-200 dark:bg-red-950/50 dark:text-red-200 dark:border-red-900/50 z-[60]">
          <span className="font-medium">{finalizeError}</span>
          <button type="button" onClick={() => setFinalizeError(null)} className="ml-3 underline font-semibold">
            {t('report.dismissError')}
          </button>
        </div>
      )}

      {/* ── Top Bar ── */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800/80 px-4 py-3 flex items-center gap-3 flex-shrink-0 z-10 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.08)] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.35)]">
        <Link to="/setup" className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/80 transition-all duration-200 -ml-1">
          <ArrowLeft className="w-4 h-4" />
        </Link>

        {chatPhase === 'live' && (
          <div className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30 dark:bg-emerald-500/10 dark:ring-emerald-500/20">
            <div className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.45)]" />
            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold tracking-wide">{t('interview.live')}</span>
          </div>
        )}

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500 pl-1">
          <Briefcase className="w-3.5 h-3.5 shrink-0" />
          <span className="text-slate-800 dark:text-slate-200 font-medium max-w-[160px] truncate">{position}</span>
          <span className="text-slate-400 dark:text-slate-600">·</span>
          <Globe2 className="w-3.5 h-3.5 shrink-0" /><span className="text-slate-700 dark:text-slate-300">{language}</span>
          <span className="text-slate-400 dark:text-slate-600">·</span>
          <Clock className="w-3.5 h-3.5 shrink-0" /><span className="text-slate-700 dark:text-slate-300">{t('interview.minShort', { n: duration })}</span>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <InterviewThemeToggle className="scale-90" />
          <LanguageSwitcher className="scale-90" />
          {chatPhase === 'live' && (
            <>
              <button
                type="button"
                onClick={() => void toggleInterviewCam()}
                title={interviewCamOn ? t('interview.lobbyCameraOff') : t('interview.lobbyCameraOn')}
                className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-all duration-200 ${
                  interviewCamOn
                    ? 'border-primary-400/60 bg-primary-500/10 text-primary-700 dark:text-primary-300 hover:bg-primary-500/20'
                    : 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {interviewCamOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              </button>
              <span className={`font-mono text-lg font-bold tabular-nums tracking-tight px-2 py-0.5 rounded-lg bg-slate-200/80 ring-1 ring-slate-300/80 dark:bg-slate-800/50 dark:ring-slate-700/50 ${
                timer.isCritical ? 'text-red-600 dark:text-red-400' : timer.isWarning ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'
              }`}>
                {timer.display}
              </span>
            </>
          )}
          <button
            onClick={() => setShowEndModal(true)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 border border-slate-300/90 rounded-xl hover:border-red-500/80 hover:text-red-600 hover:bg-red-500/5 dark:text-slate-400 dark:border-slate-600/80 dark:hover:text-red-400 transition-all duration-200"
          >
            {t('interview.end')}
          </button>
        </div>
      </div>

      {chatPhase === 'live' && (
        <div className="h-0.5 bg-slate-200 dark:bg-slate-800 flex-shrink-0">
          <div className={`h-full ${progressColor} transition-all duration-1000`} style={{ width: `${timer.progress}%` }} />
        </div>
      )}

      {/* ── Body ── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* Left panel */}
        <div className="w-56 lg:w-64 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200/90 dark:border-slate-800/90 overflow-y-auto flex flex-col">
          <div className="p-3 space-y-3 flex-1">

            {chatPhase === 'live' && (
              <div className="bg-slate-100 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-3 ring-1 ring-slate-200/80 dark:ring-slate-700/60 shadow-inner">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-slate-500 dark:text-slate-500">{t('interview.timeLeft')}</span>
                  <span className={`font-mono text-xl font-black ${
                    timer.isCritical ? 'text-red-600 dark:text-red-400' : timer.isWarning ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'
                  }`}>{timer.display}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full ${progressColor} rounded-full transition-all duration-1000`} style={{ width: `${timer.progress}%` }} />
                </div>
                {timer.isCritical && <p className="text-red-600 dark:text-red-400 text-xs mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{t('interview.lastMin')}</p>}
                {timer.isWarning && !timer.isCritical && <p className="text-amber-600 dark:text-amber-400 text-xs mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{t('interview.endingSoon')}</p>}
              </div>
            )}

            <div className="space-y-2">
              <div className="bg-slate-100 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-3 ring-1 ring-slate-200/80 dark:ring-slate-700/60 shadow-inner">
                <p className="text-xs text-slate-500 dark:text-slate-500 mb-0.5">{t('interview.role')}</p>
                <p className="text-sm text-slate-900 dark:text-white font-semibold leading-snug">{position}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-100 dark:bg-slate-800/80 rounded-xl p-2.5 ring-1 ring-slate-200/80 dark:ring-slate-700/60 shadow-inner">
                  <p className="text-xs text-slate-500 dark:text-slate-500">{t('interview.lang')}</p>
                  <p className="text-sm text-slate-900 dark:text-white font-semibold">{language}</p>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800/80 rounded-xl p-2.5 ring-1 ring-slate-200/80 dark:ring-slate-700/60 shadow-inner">
                  <p className="text-xs text-slate-500 dark:text-slate-500">{t('interview.dur')}</p>
                  <p className="text-sm text-slate-900 dark:text-white font-semibold">{t('interview.minShort', { n: duration })}</p>
                </div>
              </div>
            </div>

            {/* Prompt accordion */}
            <div className="bg-slate-100 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl overflow-hidden ring-1 ring-slate-200/80 dark:ring-slate-700/60 shadow-inner flex items-stretch">
              <button
                type="button"
                onClick={() => setShowPrompt(!showPrompt)}
                className="flex-1 min-w-0 flex items-center justify-between gap-2 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200/50 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700/30 transition-colors text-left"
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 text-primary-600 dark:text-primary-400" />
                  <span className="truncate">{t('interview.promptTitle')}</span>
                </span>
                {showPrompt ? <ChevronUp className="w-3.5 h-3.5 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0" />}
              </button>
              <button
                type="button"
                onClick={handleCopy}
                title={t('interview.copyPrompt')}
                aria-label={t('interview.copyPrompt')}
                className={`shrink-0 flex items-center justify-center px-2.5 border-l border-slate-200/80 dark:border-slate-700/60 transition-colors ${
                  copied ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              {showPrompt && (
                <div className="px-3 pb-3">
                  <pre className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap font-sans leading-relaxed max-h-48 overflow-y-auto">
                    {systemPrompt}
                  </pre>
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 ring-1 ring-amber-500/15 shadow-inner dark:bg-amber-500/[0.08] dark:border-amber-500/25">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-400 mb-1.5">{t('interview.tipsTitle')}</p>
              <ul className="text-xs text-amber-900/70 dark:text-amber-200/60 space-y-1 leading-relaxed">
                <li>{t('interview.tip1')}</li>
                <li>{t('interview.tip2')}</li>
                <li>{t('interview.tip3')}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {chatPhase === 'idle' ? (
            <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-6 sm:px-8 overflow-y-auto min-h-0">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_30%,rgba(37,99,235,0.12),transparent)] pointer-events-none" />
              <div className="relative w-full max-w-3xl grid gap-6 lg:grid-cols-[1.05fr_1fr] lg:items-start">

                {/* Camera preview */}
                <div className="relative rounded-2xl border border-slate-200/90 bg-slate-950 shadow-lg overflow-hidden aspect-video ring-1 ring-slate-900/5 dark:border-slate-700 dark:ring-white/5">
                  <video
                    ref={lobbyPreviewRef}
                    className={`absolute inset-0 h-full w-full object-cover ${lobbyCameraOn && cameraStream ? 'opacity-100' : 'opacity-0'}`}
                    playsInline muted autoPlay
                  />
                  {(!lobbyCameraOn || !cameraStream) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-800 to-slate-950 text-center px-4">
                      <VideoOff className="w-10 h-10 text-slate-500" aria-hidden />
                      <p className="text-sm font-semibold text-slate-300">{t('interview.lobbyPreviewOff')}</p>
                      <p className="text-xs text-slate-500 max-w-[240px] leading-relaxed">{t('interview.lobbyPreviewHint')}</p>
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="relative text-center lg:text-left space-y-5">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
                      {t('interview.lobbyTitle')}
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{t('interview.lobbySub')}</p>
                    <p className="text-slate-500 dark:text-slate-500 text-xs mt-2">{t('interview.readyMeta', { lang: language, n: duration })}</p>
                  </div>

                  <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center lg:justify-start">
                    {/* Camera toggle */}
                    <button
                      type="button"
                      onClick={() => { setCameraError(null); setLobbyCameraOn(v => !v) }}
                      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                        lobbyCameraOn
                          ? 'border-primary-500/60 bg-primary-500/10 text-primary-700 dark:text-primary-300'
                          : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {lobbyCameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                      {lobbyCameraOn ? t('interview.lobbyDisableCamera') : t('interview.lobbyEnableCamera')}
                    </button>

                    {/* Mic + level meter */}
                    <div className="flex items-center gap-2 justify-center lg:justify-start">
                      <button
                        type="button"
                        disabled={micBusy || micGranted}
                        onClick={() => void requestMicPermission()}
                        className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-60 ${
                          micGranted
                            ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                            : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {micBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                        {micGranted ? t('interview.lobbyMicReady') : t('interview.lobbyTestMic')}
                      </button>
                      {micGranted && <MicLevelBar />}
                    </div>
                  </div>

                  {cameraError && (
                    <p className="text-xs text-red-600 dark:text-red-400 text-left rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/80 dark:bg-red-950/30 px-3 py-2">
                      {cameraError}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleStart}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-10 py-4 bg-gradient-to-r from-primary-600 to-violet-600 text-white text-lg font-bold rounded-2xl shadow-[0_12px_40px_-8px_rgba(124,58,237,0.5)] hover:shadow-[0_16px_48px_-8px_rgba(124,58,237,0.55)] hover:-translate-y-0.5 transition-all duration-300 ring-1 ring-white/10 border border-white/5"
                  >
                    <Play className="w-5 h-5 fill-white" />
                    {t('interview.joinInterviewBtn')}
                  </button>
                  <p className="text-slate-500 dark:text-slate-600 text-xs max-w-md mx-auto lg:mx-0 leading-relaxed">{t('interview.readyFoot')}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
              {chatPhase === 'preparing' && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-8 text-center bg-slate-100/92 dark:bg-slate-950/92 backdrop-blur-md" role="status" aria-live="polite">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-violet-600 flex items-center justify-center mb-6 shadow-lg ring-1 ring-white/10">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">{t('interview.loadingTitle')}</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm leading-relaxed">{t('interview.loadingSub')}</p>
                </div>
              )}
              <ChatInterface
                ref={chatRef}
                position={position}
                jobDescription={jobDescription}
                language={language}
                duration={duration}
                resumeContext={typeof resumeContext === 'string' ? resumeContext : ''}
                persistInterviewId={interviewId || undefined}
                deferFirstAudioGate
                interviewUiVisible={chatPhase === 'live' && !timer.finished}
                onInterviewUiReady={handleInterviewUiReady}
                digitalHuman
                userCameraStream={interviewStream}
              />
              {timer.finished && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center px-8 text-center bg-slate-100/95 dark:bg-slate-950/95 backdrop-blur-md">
                  <div className="text-6xl mb-5 drop-shadow-lg opacity-95">⏰</div>
                  <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">{t('interview.timeUp')}</h2>
                  <p className="text-slate-600 dark:text-slate-400 mb-10 max-w-sm leading-relaxed">{t('interview.timeUpSub')}</p>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full max-w-sm sm:max-w-none sm:w-auto">
                    <button
                      type="button"
                      disabled={finalizing}
                      onClick={() => void finalizeAndGoReport()}
                      className="btn-primary px-8 py-3.5 rounded-xl justify-center inline-flex items-center gap-2 disabled:opacity-60"
                    >
                      {finalizing && <Loader2 className="w-4 h-4 animate-spin" />}
                      {interviewId ? t('report.viewReport') : t('interview.viewRecords')}
                    </button>
                    <Link to="/setup" className="btn-secondary px-8 py-3.5 rounded-xl justify-center text-center">{t('interview.again')}</Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Finalizing overlay */}
      {finalizing && (
        <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center px-8 text-center bg-slate-950/80 dark:bg-slate-950/92 backdrop-blur-md" role="status" aria-live="polite" aria-busy="true">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_50%_35%,rgba(99,102,241,0.2),transparent)] pointer-events-none" aria-hidden />
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-600 to-violet-600 flex items-center justify-center mb-8 shadow-[0_20px_50px_-12px_rgba(124,58,237,0.55)] ring-1 ring-white/15">
            <Loader2 className="w-10 h-10 text-white animate-spin" aria-hidden />
          </div>
          <h2 className="relative text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight">{t('report.generatingTitle')}</h2>
          <p className="relative text-sm text-slate-300 max-w-sm leading-relaxed">{t('report.generatingSub')}</p>
        </div>
      )}

      {/* End modal */}
      {showEndModal && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center px-4">
          <div className="relative w-full max-w-sm rounded-[1.35rem] p-[1px] bg-gradient-to-br from-slate-200 via-white to-primary-200/40 dark:from-slate-600 dark:via-slate-800 dark:to-primary-900/40 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.2)] dark:shadow-[0_24px_64px_-12px_rgba(0,0,0,0.45)] animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-[1.3rem] p-8 ring-1 ring-slate-900/[0.04] dark:ring-slate-700">
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-2 tracking-tight">{t('interview.modalTitle')}</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-7 leading-relaxed">{t('interview.modalSub')}</p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowEndModal(false)} className="flex-1 btn-secondary py-3 rounded-xl">{t('interview.continue')}</button>
                <button
                  type="button"
                  disabled={finalizing}
                  onClick={() => void finalizeAndGoReport()}
                  className="flex-1 px-4 py-3 bg-gradient-to-b from-red-600 to-red-700 text-white font-semibold rounded-xl border border-red-700/30 shadow-soft hover:from-red-500 hover:to-red-600 transition-all duration-200 disabled:opacity-60 inline-flex items-center justify-center gap-2"
                >
                  {finalizing && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('interview.confirmEnd')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}