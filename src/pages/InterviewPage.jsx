import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getBackendBaseUrl } from '../lib/backendBase'
import {
  createInterviewRequestId,
  recordInterviewClientEvent,
} from '../lib/interviewEvents'
import ChatInterface from '../components/ChatInterface'
import PracticeInterviewPanel from '../components/PracticeInterviewPanel'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { InterviewThemeToggle } from '../components/ThemeToggle'
import {
  Clock, Globe2, ArrowLeft, AlertCircle,
  Play, ChevronDown, ChevronUp,
  Loader2, Video, VideoOff, Mic,
} from 'lucide-react'


function useCountdown(minutes) {
  const totalSeconds = Math.max(60, Number(minutes || 10) * 60)
  const [timeLeft, setTimeLeft] = useState(totalSeconds)
  const [started, setStarted] = useState(false)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    setTimeLeft(totalSeconds)
    setStarted(false)
    setRunning(false)
    setFinished(false)
  }, [totalSeconds])

  const start = useCallback(() => {
    setStarted(true)
    setRunning(true)
    setFinished(false)
  }, [])
  const pause = useCallback(() => setRunning(false), [])
  const syncRemaining = useCallback((seconds, shouldRun) => {
    const next = Math.max(0, Math.min(totalSeconds, Number(seconds) || 0))
    setTimeLeft(next)
    setStarted(true)
    setFinished(next <= 0)
    setRunning(Boolean(shouldRun) && next > 0)
  }, [totalSeconds])

  useEffect(() => {
    if (!running) return undefined
    const interval = window.setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          window.clearInterval(interval)
          setRunning(false)
          setFinished(true)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [running])

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const ss = String(timeLeft % 60).padStart(2, '0')
  const progress  = started ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 0
  const isWarning  = timeLeft <= 120 && started
  const isCritical = timeLeft <= 60  && started

  return { display: `${mm}:${ss}`, progress, started, running, finished, isWarning, isCritical, start, pause, syncRemaining }
}

export default function InterviewPage() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const navigate  = useNavigate()
  const { interviewId: routeInterviewId } = useParams()
  const [restoredState, setRestoredState] = useState(null)
  const [restoreLoading, setRestoreLoading] = useState(Boolean(routeInterviewId && !location.state))
  const [restoreError, setRestoreError] = useState(null)
  const interviewState = location.state || restoredState || {}
  const {
    position,
    jobDescription,
    language,
    duration,
    interviewId: stateInterviewId,
    resumeContext,
    roleTrack,
    interviewerStyle = 'balanced',
    interviewerType = 'mixed',
    mode = 'formal',
    difficulty = 'medium',
    deadlineAt,
    interviewStatus = 'active',
  } = interviewState
  const interviewId = stateInterviewId || routeInterviewId
  const interviewerStyleLabel = t({
    balanced: 'setup.styleBalanced',
    supportive: 'setup.styleSupportive',
    demanding: 'setup.styleDemanding',
    analytical: 'setup.styleAnalytical',
  }[interviewerStyle] || 'setup.styleBalanced')

  useEffect(() => {
    document.title = t('meta.title')
  }, [t, i18n.language])

  useEffect(() => {
    if (location.state || !routeInterviewId) {
      setRestoreLoading(false)
      return undefined
    }
    let cancelled = false
    ;(async () => {
      setRestoreLoading(true)
      setRestoreError(null)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) throw new Error(t('interview.restoreAuth'))
        const response = await fetch(`${getBackendBaseUrl()}/api/interviews/${routeInterviewId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const body = await response.json().catch(() => ({}))
        if (!response.ok || !body.interview) throw new Error(body.error || t('interview.restoreFailed'))
        const iv = body.interview
        if (iv.status === 'completed' && iv.report_json) {
          navigate(`/interview/${iv.id}/report`, { replace: true })
          return
        }
        if (!cancelled) setRestoredState({
          interviewId: iv.id,
          position: iv.position,
          jobDescription: iv.job_description_snapshot || iv.job_description || '',
          language: iv.language,
          duration: iv.duration,
          resumeContext: iv.resume_snapshot || '',
          roleTrack: iv.role_track || 'work',
          interviewerStyle: iv.interviewer_style || 'balanced',
          interviewerType: iv.interviewer_type || 'mixed',
          mode: iv.mode || 'formal',
          difficulty: iv.difficulty || 'medium',
          deadlineAt: iv.status === 'finalizing' ? new Date(0).toISOString() : (iv.deadline_at || null),
          interviewStatus: iv.status || 'active',
        })
      } catch (error) {
        if (!cancelled) setRestoreError(error.message || t('interview.restoreFailed'))
      } finally {
        if (!cancelled) setRestoreLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [location.state, navigate, routeInterviewId, t])

  const [chatPhase, setChatPhase] = useState('idle')
  const [showEndModal,   setShowEndModal]   = useState(false)
  const [finalizing,     setFinalizing]     = useState(false)
  const [finalizeError,  setFinalizeError]  = useState(null)
  const chatRef = useRef(null)
  const finalizeInFlightRef = useRef(false)
  const finalizeCompletedRef = useRef(false)
  const autoFinalizeRequestedRef = useRef(false)
  const authTokenRef = useRef(null)

  useEffect(() => {
    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (active) authTokenRef.current = data.session?.access_token || null
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      authTokenRef.current = session?.access_token || null
    })
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

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
  const deadlineGraceRef = useRef(false)
  const [deadlineGraceActive, setDeadlineGraceActive] = useState(false)

  /* ── Sync stream ref ── */
  useEffect(() => { cameraStreamRef.current = cameraStream }, [cameraStream])

  // In lobby, keep interview camera state aligned with lobby camera choice,
  // so "enabled in lobby" carries into the interview screen.
  useEffect(() => {
    if (chatPhase !== 'idle') return
    setInterviewCamOn(Boolean(lobbyCameraOn))
  }, [chatPhase, lobbyCameraOn])

  /* ── Cleanup on unmount ── */
  useEffect(() => () => {
    cameraStreamRef.current?.getTracks().forEach(tr => tr.stop())
    stopMicMeter()
  }, [])

  function stopMicMeter() {
    cancelAnimationFrame(micRafRef.current)
    micAnalyserRef.current?._stream?.getTracks().forEach(tr => tr.stop())
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

  useEffect(() => {
    if (!restoreLoading && !position && (!routeInterviewId || restoreError)) navigate('/setup')
  }, [position, navigate, restoreLoading, restoreError, routeInterviewId])
  useEffect(() => () => { try { window.speechSynthesis?.cancel() } catch { /* ignore */ } }, [])

  const handleStart = () => {
    stopMicMeter()
    // Keep the interview camera consistent with lobby selection.
    setInterviewCamOn(Boolean(lobbyCameraOn))
    setChatPhase('preparing')
  }

  /* ── In-interview camera toggle ── */
  const toggleInterviewCam = useCallback(() => {
    setCameraError(null)
    setInterviewCamOn((prev) => {
      const next = !prev
      // If user turns camera on during interview but lobby camera is off,
      // reopen the same camera stream pipeline used in lobby.
      if (next && !lobbyCameraOn) setLobbyCameraOn(true)
      return next
    })
  }, [lobbyCameraOn])

  const handleInterviewUiReady = useCallback(() => {
    setChatPhase('live')
    if (mode === 'formal') {
      const remaining = deadlineAt
        ? Math.max(0, Math.ceil((new Date(deadlineAt).getTime() - Date.now()) / 1000))
        : null
      if (remaining === null) timer.start()
      else timer.syncRemaining(remaining, interviewStatus === 'active')
    }
  }, [deadlineAt, interviewStatus, mode, timer.start, timer.syncRemaining])

  const handlePracticeState = useCallback(({ paused, limits }) => {
    if (!limits) return
    if (Number.isFinite(limits.remainingSeconds)) timer.syncRemaining(limits.remainingSeconds, !paused)
  }, [timer.syncRemaining])

  useEffect(() => {
    const handler = () => setShowEndModal(true)
    window.addEventListener('interview-end-request', handler)
    return () => window.removeEventListener('interview-end-request', handler)
  }, [])

  const finalizeAndGoReport = useCallback(async (trigger = 'manual') => {
    if (finalizeInFlightRef.current) return
    finalizeInFlightRef.current = true
    chatRef.current?.stopInterview?.()
    setShowEndModal(false); setFinalizeError(null)
    if (!interviewId) {
      finalizeInFlightRef.current = false
      navigate('/dashboard')
      return
    }
    setFinalizing(true)
    const requestId = createInterviewRequestId()
    const transcript = chatRef.current?.getTranscript?.() ?? []
    let token = authTokenRef.current
    try {
      if (!token) {
        const { data: { session } } = await supabase.auth.getSession()
        token = session?.access_token
        authTokenRef.current = token || null
      }
      if (!token) { setFinalizeError(t('report.finalizeNoAuth')); return }

      await recordInterviewClientEvent({
        interviewId,
        token,
        requestId,
        eventType: 'finalize_clicked',
        stage: 'client',
        messageCount: transcript.length,
        metadata: { trigger },
      })
      await recordInterviewClientEvent({
        interviewId,
        token,
        requestId,
        eventType: 'finalize_request_sent',
        stage: 'client',
        messageCount: transcript.length,
        metadata: { trigger, attempt: 1 },
      })
      let res = null
      let requestError = null
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        if (attempt > 1) {
          await recordInterviewClientEvent({
            interviewId,
            token,
            requestId,
            eventType: 'finalize_request_sent',
            stage: 'client',
            messageCount: transcript.length,
            metadata: { trigger, attempt },
          })
        }
        try {
          res = await fetch(`${getBackendBaseUrl()}/api/interviews/${interviewId}/finalize`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
              'X-Request-Id': requestId,
            },
            body: JSON.stringify({ messages: transcript, reportUiLanguage: language }),
          })
          requestError = null
        } catch (error) {
          requestError = error
        }
        const retryableStatus = res && [429, 502, 503, 504].includes(res.status)
        if (attempt < 2 && (requestError || retryableStatus)) {
          await new Promise((resolve) => window.setTimeout(resolve, 1000))
          continue
        }
        break
      }
      if (requestError || !res) throw requestError || new Error('Finalize request failed')
      const responseRequestId = res.headers.get('X-Request-Id') || requestId
      await recordInterviewClientEvent({
        interviewId,
        token,
        requestId,
        eventType: 'finalize_response_received',
        stage: 'client',
        httpStatus: res.status,
        messageCount: transcript.length,
        metadata: { trigger, responseRequestId },
      })
      if (res.status === 202) {
        let completed = false
        for (let poll = 0; poll < 20; poll += 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 2000))
          const statusResponse = await fetch(`${getBackendBaseUrl()}/api/interviews/${interviewId}`, {
            headers: { Authorization: `Bearer ${token}`, 'X-Request-Id': requestId },
          })
          if (!statusResponse.ok) continue
          const statusBody = await statusResponse.json()
          if (statusBody?.interview?.status === 'completed' && statusBody.interview.report_json) {
            completed = true
            break
          }
          if (statusBody?.interview?.finalize_status === 'failed') {
            throw new Error(`Finalize failed at ${statusBody.interview.finalize_last_error_stage || 'unknown stage'}`)
          }
        }
        if (!completed) throw new Error('Finalize is still processing')
      }
      if (!res.ok) {
        let detail = t('report.finalizeFailed')
        try {
          const j = await res.json()
          if (j.error)   detail = `${detail}: ${j.error}`
          if (j.details) detail += ` — ${j.details}`
          if (j.hint)    detail += ` (${j.hint})`
        } catch { /* ignore */ }
        await recordInterviewClientEvent({
          interviewId,
          token,
          requestId,
          eventType: 'finalize_client_error',
          stage: 'response',
          httpStatus: res.status,
          errorMessage: detail,
          messageCount: transcript.length,
          metadata: { trigger, responseRequestId },
        })
        setFinalizeError(detail); return
      }
      finalizeCompletedRef.current = true
      navigate(`/interview/${interviewId}/report`)
    } catch (e) {
      console.error('[finalize]', e)
      await recordInterviewClientEvent({
        interviewId,
        token,
        requestId,
        eventType: 'finalize_client_error',
        stage: 'client',
        errorMessage: e?.message,
        messageCount: transcript.length,
        metadata: { trigger },
      })
      setFinalizeError(t('report.finalizeNetwork'))
    } finally {
      finalizeInFlightRef.current = false
      setFinalizing(false)
    }
  }, [interviewId, navigate, t, language])

  const handlePracticeLimitReached = useCallback(() => {
    void finalizeAndGoReport('practice_limit')
  }, [finalizeAndGoReport])

  const handleCandidateAnswerSubmitted = useCallback(() => {
    if (!deadlineGraceRef.current) return false
    deadlineGraceRef.current = false
    setDeadlineGraceActive(false)
    void finalizeAndGoReport('timer_answer_completed')
    return true
  }, [finalizeAndGoReport])

  useEffect(() => {
    if (mode !== 'formal' || !timer.finished || autoFinalizeRequestedRef.current) return
    autoFinalizeRequestedRef.current = true
    if (chatRef.current?.isCandidateAnswering?.()) {
      deadlineGraceRef.current = true
      setDeadlineGraceActive(true)
      return
    }
    void finalizeAndGoReport('timer')
  }, [mode, timer.finished, finalizeAndGoReport])

  useEffect(() => {
    if (!interviewId) return undefined
    const handlePageHide = () => {
      if (finalizeCompletedRef.current || finalizeInFlightRef.current) return
      const transcript = chatRef.current?.getTranscript?.() ?? []
      void recordInterviewClientEvent({
        interviewId,
        token: authTokenRef.current,
        requestId: createInterviewRequestId(),
        eventType: 'interview_exit',
        stage: 'client',
        messageCount: transcript.length,
        metadata: {
          reason: 'pagehide',
          online: navigator.onLine,
          visibilityState: document.visibilityState,
        },
        keepalive: true,
      })
    }
    window.addEventListener('pagehide', handlePageHide)
    return () => window.removeEventListener('pagehide', handlePageHide)
  }, [interviewId])

  if (restoreLoading || !position) {
    return <div className="flex min-h-screen items-center justify-center bg-brand-paper text-[13px] font-bold text-brand-muted">{restoreError || t('interview.restoring')}</div>
  }

  const progressColor = timer.isCritical ? 'bg-brand-danger' : timer.isWarning ? 'bg-brand-violet' : 'bg-brand-ink'
  const interviewStream = interviewCamOn ? cameraStream : null

  /* ── Mic level bar ── */
  const MicLevelBar = () => {
    const bars = 5
    const filled = Math.round(micLevel * bars)
    return (
      <div className="flex items-center gap-1.5 ml-2">
        <span className="text-[12px] text-brand-muted">{t('interview.lobbyMicLevel')}</span>
        <div className="flex items-end gap-0.5 h-5">
          {Array.from({ length: bars }, (_, i) => (
            <div
              key={i}
              className={`w-1.5 rounded-sm transition-all duration-75 ${
                i < filled ? 'bg-brand-ink' : 'bg-brand-line'
              }`}
              style={{ height: `${40 + i * 12}%` }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '100dvh' }} className="theme-quiet relative flex flex-col overflow-hidden bg-brand-paper text-brand-ink">

      {finalizeError && (
        <div className="z-[60] flex-shrink-0 border-b border-brand-danger/30 bg-brand-danger/[0.08] px-5 py-2.5 text-[13px] text-brand-ink">
          <span className="font-medium">{finalizeError}</span>
          <button type="button" onClick={() => setFinalizeError(null)} className="ml-3 font-bold text-brand-danger underline">
            {t('report.dismissError')}
          </button>
        </div>
      )}

      {/* ── Top Bar ── */}
      {chatPhase === 'idle' && (
        <nav className="z-10 flex flex-shrink-0 items-center justify-between border-b border-brand-line bg-brand-paper/85 px-6 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-6">
          <Link to="/setup" className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-line text-brand-muted transition-colors hover:border-brand-ink hover:text-brand-ink">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          
          <div className="hidden md:flex flex-col">
            <span className="mb-1 text-[11px] leading-none text-brand-muted">{t('interview.role')}</span>
            <h1 className="max-w-[240px] truncate font-brand text-xl font-semibold leading-none tracking-tight text-brand-ink">
              {position}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {chatPhase === 'live' && (
            <div className="flex items-center gap-4 px-4 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">{t('interview.live')}</span>
              </div>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
              <div className="flex items-center gap-2 font-mono text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className={timer.isCritical ? 'text-red-500' : timer.isWarning ? 'text-amber-500' : ''}>
                  {timer.display}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <InterviewThemeToggle className="scale-90" />
            <LanguageSwitcher className="scale-90" />
            
            {chatPhase === 'live' && (
              <button
                onClick={() => setShowEndModal(true)}
                className="ml-2 px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-semibold uppercase tracking-widest rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-all border border-slate-900 dark:border-white shadow-lg shadow-slate-900/10"
              >
                {t('interview.end')}
              </button>
            )}
          </div>
        </div>
      </nav>
      )}

      {chatPhase === 'live' && mode === 'formal' && (
        <div className="h-1 flex-shrink-0 bg-brand-line">
          <div 
            className={`h-full ${progressColor} transition-all duration-1000`} 
            style={{ width: `${timer.progress}%` }}
          />
        </div>
      )}

      {/* ── Body ── */}
      <div className="flex min-h-0 flex-1 overflow-hidden bg-transparent">
        

        {/* Right panel - Main Interaction View */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          {chatPhase === 'idle' ? (
            <div className="flex-1 overflow-y-auto p-6 lg:p-10">
              <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col justify-center">

                <header className="mb-8 text-center">
                  <h2 className="font-brand text-[34px] font-semibold leading-tight tracking-tight text-brand-ink sm:text-[42px]">
                    {t('interview.lobbyTitle')}
                  </h2>
                  <p className="mx-auto mt-3 max-w-2xl text-[14.5px] leading-relaxed text-brand-muted">
                    {t('interview.lobbySub')}
                  </p>
                </header>

                {/* 两栏等高：预览与信息卡对齐，不会一高一低 */}
                <div className="grid items-stretch gap-5 lg:grid-cols-[1.1fr_0.9fr]">

                  {/* ── 摄像头预览（仿 Google Meet：控制键浮在画面底部）── */}
                  <div className="relative min-h-[360px] overflow-hidden rounded-[20px] border border-brand-line bg-brand-inset">
                    <video
                      ref={lobbyPreviewRef}
                      className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${lobbyCameraOn && cameraStream ? 'opacity-100' : 'opacity-0'}`}
                      playsInline muted autoPlay
                    />

                    {!lobbyCameraOn && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center">
                        <div className="grid h-14 w-14 place-items-center rounded-full bg-brand-card text-brand-muted">
                          <VideoOff className="h-6 w-6" />
                        </div>
                        <p className="text-[13px] text-brand-muted">{t('interview.lobbyPreviewOff')}</p>
                      </div>
                    )}

                    {cameraError && (
                      <div className="absolute inset-x-5 top-5 flex items-center gap-2.5 rounded-xl bg-brand-danger px-4 py-3 text-[12px] font-bold text-white">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {cameraError}
                      </div>
                    )}

                    {/* 控制条常驻在画面底部；药丸自带底色，开/关摄像头两种情况下都清晰 */}
                    <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-center gap-2.5 p-4">
                      <button
                        onClick={() => { setCameraError(null); setLobbyCameraOn(v => !v) }}
                        className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[12.5px] font-bold backdrop-blur transition-colors ${lobbyCameraOn
                          ? 'border-brand-ink bg-brand-ink text-brand-on-ink'
                          : 'border-brand-line bg-brand-card/95 text-brand-ink hover:border-brand-ink'
                          }`}
                      >
                        {lobbyCameraOn ? (
                          <><Video className="h-4 w-4" /><span>{t('interview.lobbyDisableCamera')}</span></>
                        ) : (
                          <><VideoOff className="h-4 w-4" /><span>{t('interview.lobbyEnableCamera')}</span></>
                        )}
                      </button>

                      <button
                        disabled={micBusy || micGranted}
                        onClick={() => void requestMicPermission()}
                        className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[12.5px] font-bold backdrop-blur transition-colors disabled:cursor-not-allowed ${micGranted
                          ? 'border-brand-success/40 bg-brand-success/[0.10] text-brand-success'
                          : 'border-brand-line bg-brand-card/95 text-brand-ink hover:border-brand-ink'
                          }`}
                      >
                        {micBusy ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /><span>{t('interview.lobbyTestMic')}</span></>
                        ) : (
                          <><Mic className="h-4 w-4" /><span>{micGranted ? t('interview.lobbyMicReady') : t('interview.lobbyTestMic')}</span></>
                        )}
                      </button>

                      {micGranted && (
                        <span className="flex items-center rounded-full border border-brand-line bg-brand-card/95 px-3 py-2 backdrop-blur">
                          <MicLevelBar />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ── 信息卡：原左栏元信息 + 提示 + 进入按钮合并为一张 ── */}
                  <div className="brand-float flex flex-col rounded-[20px] p-6">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-violet">{t('meta.title')}</p>
                    <h3 className="mt-2 font-brand text-[21px] font-semibold leading-tight tracking-tight text-brand-ink">
                      {t('interview.instructionTitle', { position })}
                    </h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-brand-muted">
                      {t('interview.instructionSub')}
                    </p>

                    {/* 面试参数（原左侧栏的内容，不再重复展示职位名） */}
                    <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-brand-line pt-5">
                      <div>
                        <span className="text-[11px] text-brand-muted">{t('interview.lang')}</span>
                        <p className="mt-0.5 text-[13px] font-bold text-brand-ink">{language}</p>
                      </div>
                      <div>
                        <span className="text-[11px] text-brand-muted">{t('interview.dur')}</span>
                        <p className="mt-0.5 text-[13px] font-bold text-brand-ink">
                          {mode === 'practice' ? t('setup.practiceUnlimited') : t('interview.minShort', { n: duration })}
                        </p>
                      </div>
                      <div>
                        <span className="text-[11px] text-brand-muted">{t('setup.interviewerStyle')}</span>
                        <p className="mt-0.5 text-[13px] font-bold text-brand-ink">{interviewerStyleLabel}</p>
                      </div>
                      <div>
                        <span className="text-[11px] text-brand-muted">{t('setup.interviewerType')}</span>
                        <p className="mt-0.5 text-[13px] font-bold text-brand-ink">
                          {t(`setup.type${interviewerType === 'hr' ? 'Hr' : interviewerType === 'technical' ? 'Technical' : 'Mixed'}`)}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[11px] text-brand-muted">{t('setup.interviewMode')}</span>
                        <p className="mt-0.5 text-[13px] font-bold text-brand-ink">
                          {t(mode === 'practice' ? 'setup.modePractice' : 'setup.modeFormal')} · {difficulty}
                        </p>
                      </div>
                    </div>

                    {/* 提示（原左侧栏的独立卡片，合并进来后移动端也能看到） */}
                    <div className="mt-5 border-t border-brand-line pt-5">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="h-4 w-1 rounded-full bg-brand-violet" />
                        <span className="text-[12.5px] font-semibold text-brand-ink">{t('interview.tipsTitle')}</span>
                        <AlertCircle className="ml-auto h-4 w-4 text-brand-muted" />
                      </div>
                      <ul className="space-y-2.5 text-[12.5px] leading-relaxed text-brand-muted">
                        {['tip1', 'tip2', 'tip3'].map((key, i) => (
                          <li key={key} className="flex items-start gap-3">
                            <span className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-full border border-brand-ink text-[10px] font-bold text-brand-ink">
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            <span>{t(`interview.${key}`)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* mt-auto 把按钮压到卡片底部，两栏等高时也不会悬空 */}
                    <div className="mt-auto pt-6">
                      <button
                        onClick={handleStart}
                        className="group flex w-full items-center justify-between rounded-[16px] bg-brand-ink p-5 text-brand-on-ink transition-opacity duration-200 hover:opacity-90"
                      >
                        <span className="space-y-1 text-left">
                          <span className="flex items-center gap-2 text-[11px] font-medium opacity-70">
                            <span className="h-1.5 w-1.5 rounded-full bg-brand-on-ink" />
                            {t('interview.readyToStart')}
                          </span>
                          <span className="block font-brand text-[20px] font-semibold leading-none tracking-tight">
                            {t('interview.joinInterviewBtn')}
                          </span>
                        </span>
                        <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-on-ink/15 text-brand-on-ink transition-transform duration-200 group-hover:scale-105">
                          <Play className="h-5 w-5 translate-x-0.5 fill-current" />
                        </span>
                      </button>
                      <p className="mt-2.5 text-center text-[11.5px] text-brand-muted">
                        {t('interview.readyFoot')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-brand-paper">
              {chatPhase === 'preparing' && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-brand-paper/95 px-8 text-center backdrop-blur-xl" role="status" aria-live="polite">
                  <div className="relative mb-7">
                    <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-ink text-brand-on-ink">
                      <Loader2 className="h-7 w-7 animate-spin" />
                    </div>
                    <span className="absolute -right-1.5 -top-1.5 h-4 w-4 animate-pulse rounded-full border-2 border-brand-paper bg-brand-violet" />
                  </div>
                  <h2 className="mb-2.5 font-brand text-[28px] font-semibold tracking-tight text-brand-ink">{t('interview.loadingTitle')}</h2>
                  <p className="max-w-sm text-[14.5px] leading-relaxed text-brand-ink">{t('interview.loadingSub')}</p>
                </div>
              )}

              {mode === 'practice' ? <PracticeInterviewPanel
                ref={chatRef}
                interviewId={interviewId}
                position={position}
                jobDescription={jobDescription}
                language={language}
                interviewerType={interviewerType}
                resumeContext={typeof resumeContext === 'string' ? resumeContext : ''}
                roleTrack={roleTrack || 'work'}
                interviewerStyle={interviewerStyle}
                interviewUiVisible={chatPhase === 'live'}
                userCameraStream={interviewStream}
                isCameraOn={interviewCamOn}
                onToggleCamera={toggleInterviewCam}
                onInterviewUiReady={handleInterviewUiReady}
                onPracticeState={handlePracticeState}
                onLimitReached={handlePracticeLimitReached}
              /> : <ChatInterface
                ref={chatRef}
                position={position}
                jobDescription={jobDescription}
                language={language}
                duration={duration}
                resumeContext={typeof resumeContext === 'string' ? resumeContext : ''}
                roleTrack={roleTrack || 'work'}
                interviewerStyle={interviewerStyle}
                interviewerType={interviewerType}
                persistInterviewId={interviewId || undefined}
                deferFirstAudioGate
                interviewUiVisible={chatPhase === 'live' && (!timer.finished || deadlineGraceActive)}
                onInterviewUiReady={handleInterviewUiReady}
                onCandidateAnswerSubmitted={handleCandidateAnswerSubmitted}
                digitalHuman
                userCameraStream={interviewStream}
                isCameraOn={interviewCamOn}
                onToggleCamera={toggleInterviewCam}
                timerDisplay={timer.display}
                timerStatus={timer.isCritical ? 'critical' : timer.isWarning ? 'warning' : 'normal'}
              />}

              {mode === 'formal' && deadlineGraceActive && (
                <div className="brand-float absolute inset-x-4 top-4 z-40 flex items-center justify-center gap-2.5 rounded-2xl px-5 py-3 text-center text-[13px] font-bold text-brand-ink backdrop-blur" role="status" aria-live="polite">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-brand-violet" />
                  {t('interview.timeUpAnswering')}
                </div>
              )}

              {mode === 'formal' && timer.finished && !deadlineGraceActive && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-brand-paper/95 px-8 text-center backdrop-blur-xl">
                  <div className="mb-7 grid h-20 w-20 place-items-center rounded-full border border-brand-line bg-brand-card text-4xl">
                    ⏰
                  </div>
                  <h2 className="mb-3 font-brand text-[34px] font-semibold tracking-tight text-brand-ink">{t('interview.timeUp')}</h2>
                  <p className="mb-9 max-w-md text-[15px] leading-relaxed text-brand-ink">{t('interview.timeUpSub')}</p>

                  <div className="flex w-full max-w-md flex-col justify-center gap-3 sm:flex-row">
                    <button
                      type="button"
                      disabled={finalizing}
                      onClick={() => void finalizeAndGoReport()}
                      className="inline-flex flex-1 items-center justify-center gap-2.5 rounded-xl bg-brand-ink px-6 py-3.5 text-[13.5px] font-semibold text-brand-on-ink transition-opacity duration-200 hover:opacity-90 disabled:opacity-40"
                    >
                      {finalizing ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{t('report.generatingTitle')}</span>
                        </span>
                      ) : (
                        <span>{interviewId ? t('report.viewReport') : t('interview.viewRecords')}</span>
                      )}
                    </button>
                    <Link 
                      to="/setup" 
                      className="flex-1 rounded-xl border border-brand-line bg-brand-card px-6 py-3.5 text-center text-[13.5px] font-bold text-brand-ink transition-colors hover:border-brand-ink"
                    >
                      {t('interview.again')}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Finalizing overlay */}
      {finalizing && (
        <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-brand-paper/95 px-8 text-center backdrop-blur-2xl" role="status" aria-live="polite" aria-busy="true">
          <div className="relative mb-8">
            <div className="grid h-[72px] w-[72px] place-items-center rounded-2xl bg-brand-ink text-brand-on-ink">
              <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
            </div>
            <span className="absolute -right-1.5 -top-1.5 h-4 w-4 animate-pulse rounded-full border-2 border-brand-paper bg-brand-violet" />
          </div>
          <h2 className="mb-3 font-brand text-[30px] font-semibold tracking-tight text-brand-ink">{t('report.generatingTitle')}</h2>
          <p className="max-w-sm text-[15px] leading-relaxed text-brand-ink">{t('report.generatingSub')}</p>
        </div>
      )}

      {/* End modal */}
      {showEndModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-ink/40 p-6 backdrop-blur-sm sm:p-8">
          <div 
            className="brand-float w-full max-w-md space-y-7 rounded-[22px] p-8"
          >
            <div className="space-y-3">
              <h3 className="font-brand text-[24px] font-semibold leading-tight tracking-tight text-brand-ink">{t('interview.modalTitle')}</h3>
              <p className="text-[14px] leading-relaxed text-brand-muted">{t('interview.modalSub')}</p>
            </div>
            
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                disabled={finalizing}
                onClick={() => void finalizeAndGoReport()}
                className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-brand-danger px-6 py-3.5 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {finalizing ? (
                   <span className="flex items-center gap-2">
                     <Loader2 className="w-4 h-4 animate-spin" />
                     <span>{t('interview.confirmEnd')}</span>
                   </span>
                ) : (
                  <span>{t('interview.confirmEnd')}</span>
                )}
              </button>
              <button 
                type="button" 
                onClick={() => setShowEndModal(false)} 
                className="w-full rounded-xl border border-brand-line bg-brand-card px-6 py-3.5 text-[13.5px] font-bold text-brand-ink transition-colors hover:border-brand-ink"
              >
                {t('interview.continue')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
