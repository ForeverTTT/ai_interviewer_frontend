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
  Clock, Globe2, Briefcase, ArrowLeft, AlertCircle,
  Play, ChevronDown, ChevronUp,
  Loader2, Video, VideoOff, Mic, FileText,
} from 'lucide-react'
import BackgroundAurora from '../components/BackgroundAurora'


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
    if (location.state?.sessionLaunch) {
      setRestoredState(location.state)
      setRestoreLoading(false)
      navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
      return undefined
    }
    if (restoredState || !routeInterviewId) {
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
        if ((iv.mode || 'formal') === 'formal') {
          const requestId = createInterviewRequestId()
          void fetch(`${getBackendBaseUrl()}/api/interviews/${iv.id}/finalize`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
              'X-Request-Id': requestId,
            },
            body: JSON.stringify({ messages: [], reportUiLanguage: i18n.language }),
            keepalive: true,
          }).catch(() => {})
          navigate('/dashboard', {
            replace: true,
            state: { reportGenerating: true, interviewId: iv.id },
          })
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
  }, [i18n.language, location.pathname, location.search, location.state, navigate, restoredState, routeInterviewId, t])

  const [chatPhase, setChatPhase] = useState('idle')
  const [showEndModal,   setShowEndModal]   = useState(false)
  const [finalizing,     setFinalizing]     = useState(false)
  const [finalizeError,  setFinalizeError]  = useState(null)
  const [endNotice,      setEndNotice]      = useState(null)
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
    const background = trigger === 'manual'
    finalizeInFlightRef.current = true
    chatRef.current?.stopInterview?.()
    setShowEndModal(false); setFinalizeError(null)
    if (background) setEndNotice({ status: 'generating' })
    if (!interviewId) {
      finalizeInFlightRef.current = false
      navigate('/dashboard')
      return
    }
    setFinalizing(!background)
    const requestId = createInterviewRequestId()
    const transcript = chatRef.current?.getTranscript?.() ?? []
    let token = authTokenRef.current
    try {
      if (!token) {
        const { data: { session } } = await supabase.auth.getSession()
        token = session?.access_token
        authTokenRef.current = token || null
      }
      if (!token) {
        setFinalizeError(t('report.finalizeNoAuth'))
        if (background) setEndNotice({ status: 'failed' })
        return
      }

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
        setFinalizeError(detail)
        if (background) setEndNotice({ status: 'failed' })
        return
      }
      finalizeCompletedRef.current = true
      if (background) setEndNotice({ status: 'ready' })
      else navigate(`/interview/${interviewId}/report`)
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
      if (background) setEndNotice({ status: 'failed' })
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
      const requestId = createInterviewRequestId()
      void recordInterviewClientEvent({
        interviewId,
        token: authTokenRef.current,
        requestId,
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
      if (mode === 'formal' && authTokenRef.current) {
        void fetch(`${getBackendBaseUrl()}/api/interviews/${interviewId}/finalize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authTokenRef.current}`,
            'X-Request-Id': requestId,
          },
          body: JSON.stringify({ messages: [], reportUiLanguage: language }),
          keepalive: true,
        }).catch(() => {})
      } else if (mode === 'practice' && authTokenRef.current) {
        void fetch(`${getBackendBaseUrl()}/api/interview-sessions/${interviewId}/pause`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authTokenRef.current}`,
            'X-Request-Id': requestId,
          },
          body: JSON.stringify({ idempotencyKey: requestId }),
          keepalive: true,
        }).catch(() => {})
      }
    }
    window.addEventListener('pagehide', handlePageHide)
    return () => window.removeEventListener('pagehide', handlePageHide)
  }, [interviewId, language, mode])

  if (restoreLoading || !position) {
    return <div className="flex min-h-screen items-center justify-center bg-white text-sm font-bold text-slate-500 dark:bg-slate-950">{restoreError || t('interview.restoring')}</div>
  }

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
    <div style={{ height: '100dvh' }} className="flex flex-col overflow-hidden bg-white/50 dark:bg-slate-950/50 text-slate-900 dark:text-white relative">
      <BackgroundAurora />

      {finalizeError && (
        <div className="flex-shrink-0 px-4 py-2.5 text-sm bg-red-100 text-red-900 border-b border-red-200 dark:bg-red-950/50 dark:text-red-200 dark:border-red-900/50 z-[60]">
          <span className="font-medium">{finalizeError}</span>
          <button type="button" onClick={() => setFinalizeError(null)} className="ml-3 underline font-semibold">
            {t('report.dismissError')}
          </button>
        </div>
      )}

      {/* ── Top Bar ── */}
      {chatPhase === 'idle' && (
        <nav className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between flex-shrink-0 z-10 transition-all">
        <div className="flex items-center gap-6">
          <Link to="/setup" className="flex items-center justify-center w-10 h-10 rounded-xl text-slate-400 hover:text-slate-900 border border-slate-100 hover:border-slate-200 dark:border-slate-900 dark:hover:border-slate-800 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          
          <div className="hidden md:flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">{t('interview.role')}</span>
            <h1 className="text-xl font-black font-serif text-slate-900 dark:text-white leading-none truncate max-w-[240px]">
              {position}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {chatPhase === 'live' && (
            <div className="flex items-center gap-4 px-4 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">{t('interview.live')}</span>
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
                className="ml-2 px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-all border border-slate-900 dark:border-white shadow-lg shadow-slate-900/10"
              >
                {t('interview.end')}
              </button>
            )}
          </div>
        </div>
      </nav>
      )}

      {chatPhase === 'live' && mode === 'formal' && (
        <div className="h-1 bg-slate-100 dark:bg-slate-900 flex-shrink-0">
          <div 
            className={`h-full ${progressColor} transition-all duration-1000`} 
            style={{ width: `${timer.progress}%` }}
          />
        </div>
      )}

      {/* ── Body ── */}
      <div className="flex min-h-0 flex-1 overflow-hidden bg-transparent">
        
        {/* Left panel - Editorial Metadata */}
        {chatPhase === 'idle' && (
          <aside className="w-80 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 p-8 overflow-y-auto hidden lg:block transition-all">
          <div className="space-y-12">
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-slate-400">
                <Briefcase className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">{t('interview.role')}</span>
              </div>
              <h2 className="text-3xl font-black font-serif text-slate-900 dark:text-white leading-tight">
                {position}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('interview.lang')}</span>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{language}</p>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('interview.dur')}</span>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{mode === 'practice' ? t('setup.practiceUnlimited') : t('interview.minShort', { n: duration })}</p>
              </div>
              <div className="col-span-2 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('setup.interviewerStyle')}</span>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{interviewerStyleLabel}</p>
              </div>
              <div className="col-span-2 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('setup.interviewerType')}</span>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {t(`setup.type${interviewerType === 'hr' ? 'Hr' : interviewerType === 'technical' ? 'Technical' : 'Mixed'}`)} · {t(mode === 'practice' ? 'setup.modePractice' : 'setup.modeFormal')} · {difficulty}
                </p>
              </div>
            </div>

            <div className="p-8 rounded-[2.5rem] bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200 dark:border-white/5 space-y-8 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <div className="w-1.5 h-6 bg-primary-500 rounded-full" />
                   <span className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">{t('interview.tipsTitle')}</span>
                </div>
                <div className="p-2 bg-primary-50 dark:bg-primary-950/20 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                </div>
              </div>

              <ul className="space-y-6 text-[0.85rem] font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                <li className="flex gap-4 items-start group">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-[10px] flex items-center justify-center border border-primary-200/50">01</span>
                  <span>{t('interview.tip1')}</span>
                </li>
                <li className="flex gap-4 items-start group">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-[10px] flex items-center justify-center border border-primary-200/50">02</span>
                  <span>{t('interview.tip2')}</span>
                </li>
                <li className="flex gap-4 items-start group">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-[10px] flex items-center justify-center border border-primary-200/50">03</span>
                  <span>{t('interview.tip3')}</span>
                </li>
              </ul>
            </div>
        </div>
      </aside>
      )}

        {/* Right panel - Main Interaction View */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          {chatPhase === 'idle' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-16 overflow-y-auto">
              <div className="w-full max-w-4xl space-y-12">
                <header className="text-center space-y-4 max-w-2xl mx-auto">
                  <h2 className="text-5xl font-black font-serif tracking-tight text-slate-900 dark:text-white uppercase leading-none">
                    {t('interview.lobbyTitle')}
                  </h2>
                  <p className="text-lg text-slate-500 dark:text-slate-400 font-medium tracking-tight">
                    {t('interview.lobbySub')}
                  </p>
                </header>

                <div className="grid md:grid-cols-2 gap-12 items-center">
                  <div className="space-y-8">
                    {/* Camera preview */}
                    <div className="relative aspect-[4/3] rounded-[2.5rem] overflow-hidden bg-slate-100 dark:bg-slate-900 border-4 border-white dark:border-slate-800 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700">
                      <video
                        ref={lobbyPreviewRef}
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${lobbyCameraOn && cameraStream ? 'opacity-100' : 'opacity-0'}`}
                        playsInline muted autoPlay
                      />
                      
                      {!lobbyCameraOn && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 space-y-4">
                          <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                            <VideoOff className="w-8 h-8" />
                          </div>
                          <p className="text-sm font-black uppercase tracking-widest text-slate-400">{t('interview.lobbyPreviewOff')}</p>
                        </div>
                      )}

                      {cameraError && (
                        <div className="absolute bottom-6 inset-x-6 p-4 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-xl flex items-center gap-3">
                          <AlertCircle className="w-4 h-4" />
                          {cameraError}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 items-center justify-center">
                      <button
                        onClick={() => { setCameraError(null); setLobbyCameraOn(v => !v) }}
                        className={`flex items-center gap-3 px-6 py-3 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest border-2 ${
                          lobbyCameraOn 
                            ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900' 
                            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200 dark:bg-slate-950 dark:border-slate-800'
                        }`}
                      >
                        {lobbyCameraOn ? (
                          <span className="flex items-center gap-2">
                            <Video className="w-4 h-4" />
                            <span>{t('interview.lobbyDisableCamera')}</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <VideoOff className="w-4 h-4" />
                            <span>{t('interview.lobbyEnableCamera')}</span>
                          </span>
                        )}
                      </button>

                      <div className="flex items-center gap-4">
                        <button
                          disabled={micBusy || micGranted}
                          onClick={() => void requestMicPermission()}
                          className={`flex items-center gap-3 px-6 py-3 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest border-2 ${
                            micGranted
                              ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400'
                              : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200 dark:bg-slate-950 dark:border-slate-800'
                          }`}
                        >
                          {micBusy ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>{t('interview.lobbyTestMic')}</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <Mic className="w-4 h-4" />
                              <span>{micGranted ? t('interview.lobbyMicReady') : t('interview.lobbyTestMic')}</span>
                            </span>
                          )}
                        </button>
                        {micGranted && <MicLevelBar />}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-12">
                    <div className="space-y-6">
                      <div className="p-10 rounded-[2.5rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-slate-200 dark:border-white/5 space-y-6 shadow-xl">
                        <div className="space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-primary-500">{t('meta.title')}</p>
                          <h3 className="text-2xl font-black font-serif text-slate-900 dark:text-white leading-tight">
                            {t('interview.instructionTitle', { position })}
                          </h3>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                          {t('interview.instructionSub')}
                        </p>
                        
                        <button
                          onClick={handleStart}
                          className="w-full flex items-center justify-between p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 dark:from-white dark:via-slate-50 dark:to-indigo-50 text-white dark:text-slate-900 rounded-[2.5rem] hover:scale-[1.03] active:scale-[0.97] transition-all shadow-[0_20px_50px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_50px_rgba(79,70,229,0.1)] group relative overflow-hidden border border-white/10 dark:border-slate-200"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                          <div className="text-left space-y-1 relative z-10">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-60 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              {t('interview.readyToStart')}
                            </span>
                            <p className="text-2xl font-black font-serif leading-none tracking-tight">{t('interview.joinInterviewBtn')}</p>
                          </div>
                          <div className="w-16 h-16 rounded-2xl bg-white/10 dark:bg-slate-900/5 flex items-center justify-center transition-all group-hover:bg-white/20 dark:group-hover:bg-slate-900/10 group-hover:scale-110 relative z-10">
                            <Play className="w-6 h-6 fill-current translate-x-0.5" />
                          </div>
                        </button>

                        <p className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400 pt-2">
                          {t('interview.readyFoot')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-white dark:bg-slate-950">
              {chatPhase === 'preparing' && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-8 text-center bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl" role="status" aria-live="polite">
                  <div className="w-20 h-20 rounded-3xl bg-slate-900 dark:bg-white flex items-center justify-center mb-8 shadow-2xl">
                    <Loader2 className="w-8 h-8 text-white dark:text-slate-900 animate-spin" />
                  </div>
                  <h2 className="text-3xl font-black font-serif text-slate-900 dark:text-white mb-3 uppercase tracking-tight">{t('interview.loadingTitle')}</h2>
                  <p className="text-lg text-slate-500 dark:text-slate-400 max-w-sm font-medium tracking-tight">{t('interview.loadingSub')}</p>
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
                <div className="absolute inset-x-4 top-4 z-40 rounded-2xl border border-amber-200 bg-amber-50/95 px-5 py-3 text-center text-sm font-bold text-amber-900 shadow-lg backdrop-blur dark:border-amber-800 dark:bg-amber-950/90 dark:text-amber-100" role="status" aria-live="polite">
                  {t('interview.timeUpAnswering')}
                </div>
              )}

              {mode === 'formal' && timer.finished && !deadlineGraceActive && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center px-8 text-center bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-700">
                  <div className="w-24 h-24 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-5xl mb-8 shadow-inner border border-slate-100 dark:border-slate-800">
                    ⏰
                  </div>
                  <h2 className="text-5xl font-black font-serif text-slate-900 dark:text-white mb-4 uppercase tracking-tight">{t('interview.timeUp')}</h2>
                  <p className="text-xl text-slate-500 dark:text-slate-400 mb-12 max-w-md font-medium tracking-tight leading-relaxed">{t('interview.timeUpSub')}</p>
                  
                  <div className="flex flex-col sm:flex-row gap-6 w-full max-w-md justify-center">
                    <button
                      type="button"
                      disabled={finalizing}
                      onClick={() => void finalizeAndGoReport()}
                      className="flex-1 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-all border border-slate-900 dark:border-white shadow-xl shadow-slate-900/10 disabled:opacity-50 inline-flex items-center justify-center gap-3"
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
                      className="flex-1 px-8 py-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-800 text-center"
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
        <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center px-8 text-center bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl" role="status" aria-live="polite" aria-busy="true">
          <div className="w-24 h-24 rounded-[2rem] bg-slate-900 dark:bg-white flex items-center justify-center mb-10 shadow-2xl animate-pulse">
            <Loader2 className="w-10 h-10 text-white dark:text-slate-900 animate-spin" aria-hidden />
          </div>
          <h2 className="text-4xl font-black font-serif text-slate-900 dark:text-white mb-4 uppercase tracking-tight">{t('report.generatingTitle')}</h2>
          <p className="text-xl text-slate-500 dark:text-slate-400 max-w-sm font-medium tracking-tight leading-relaxed">{t('report.generatingSub')}</p>
        </div>
      )}

      {/* End modal */}
      {showEndModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-8 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div 
            className="w-full max-w-md bg-white dark:bg-slate-950 rounded-[2.5rem] p-10 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-10"
          >
            <div className="space-y-4">
              <h3 className="text-3xl font-black font-serif text-slate-900 dark:text-white uppercase tracking-tight leading-none">{t('interview.modalTitle')}</h3>
              <p className="text-lg text-slate-500 dark:text-slate-400 font-medium tracking-tight leading-relaxed">{t('interview.modalSub')}</p>
            </div>
            
            <div className="flex flex-col gap-4">
              <button
                type="button"
                disabled={finalizing}
                onClick={() => void finalizeAndGoReport()}
                className="w-full px-8 py-4 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 disabled:opacity-50 inline-flex items-center justify-center gap-3"
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
                className="w-full px-8 py-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-800"
              >
                {t('interview.continue')}
              </button>
            </div>
          </div>
        </div>
      )}

      {endNotice && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/45 p-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-live="polite">
          <div className="w-full max-w-md rounded-[2.5rem] border border-slate-200 bg-white p-9 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-7 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
              {endNotice.status === 'generating' ? <Loader2 className="h-8 w-8 animate-spin" /> : endNotice.status === 'ready' ? <FileText className="h-8 w-8" /> : <AlertCircle className="h-8 w-8 text-red-500" />}
            </div>
            <h3 className="font-serif text-3xl font-black text-slate-950 dark:text-white">{t(`interview.endNotice.${endNotice.status}Title`)}</h3>
            <p className="mt-4 text-base leading-relaxed text-slate-500 dark:text-slate-300">{t(`interview.endNotice.${endNotice.status}Body`)}</p>
            {endNotice.status === 'failed' && finalizeError && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700 dark:bg-red-950/30 dark:text-red-300">{finalizeError}</p>}
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => navigate('/dashboard')} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">{t('interview.endNotice.openGrowth')}</button>
              {endNotice.status === 'failed'
                ? <button type="button" onClick={() => void finalizeAndGoReport('manual')} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-800 dark:border-slate-700 dark:text-white">{t('interview.endNotice.retry')}</button>
                : <button type="button" onClick={() => setEndNotice(null)} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-800 dark:border-slate-700 dark:text-white">{t('interview.endNotice.stay')}</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
