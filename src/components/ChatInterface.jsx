import {
  useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect,
  forwardRef, useImperativeHandle,
} from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { getBackendBaseUrl } from '../lib/backendBase'
import { useGeminiLiveInterview } from '../hooks/useGeminiLiveInterview'
import { normalizeCjkSpacing } from '../lib/textNormalization'
import {
  Send, Volume2, VolumeX, Loader2, Video, VideoOff,
  Mic, MicOff, RefreshCw, BrainCircuit, Clock,
  FlaskConical, Users, ClipboardList, Search, FolderOpen,
} from 'lucide-react'

const BACKEND_URL = getBackendBaseUrl()
const CHAT_REQUEST_TIMEOUT_MS = 45_000

function newRequestId() {
  return globalThis.crypto?.randomUUID?.()
    || `req-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/* ── Agent display config ─────────────────────────────────────── */

const AGENT_STYLE = {
  opening: { emoji: '👔', color: 'bg-brand-ink text-brand-on-ink', Icon: BrainCircuit },
  explore: { emoji: '📎', color: 'bg-brand-violet text-white', Icon: FolderOpen },
  technical: { emoji: '💡', color: 'bg-brand-ink text-brand-on-ink', Icon: FlaskConical },
  behavioral: { emoji: '🤝', color: 'bg-brand-inset text-brand-ink', Icon: Users },
  feedback: { emoji: '📋', color: 'bg-brand-violet text-white', Icon: ClipboardList },
  analyzer: { emoji: '🔍', color: 'bg-brand-muted text-white', Icon: Search },
}

/* ── Tiny helpers ─────────────────────────────────────────────── */

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 py-2">
      {[0, 150, 300].map(d => (
        <div
          key={d}
          className="h-1.5 w-1.5 rounded-full bg-brand-ink animate-bounce"
          style={{ animationDelay: `${d}ms`, animationDuration: '0.6s' }}
        />
      ))}
    </div>
  )
}

// 模型输出有时会带占位符方括号，如 "[Company Name]"。
// 用户要求：聊天/语音里不能出现这种 "[]"，所以这里做兜底清理。
function sanitizeSquareBrackets(text) {
  const s = String(text || '')
  return s
    // common placeholder from the model
    .replace(/\[\s*Company\s*N\s*me\s*\]/gi, 'the company')
    // remove any remaining square brackets but keep inner text
    .replace(/\[([^\]]*)\]/g, '$1')
}

function AgentBadge({ name, streaming, agentMap }) {
  const c = agentMap[name] || agentMap.opening
  const { Icon } = c
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-semibold uppercase tracking-widest ${c.color} shadow-sm mb-3`}>
      <Icon className="w-3 h-3" />
      <span>{c.label}</span>
      {streaming && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse ml-1" />}
    </div>
  )
}

function WaveIcon({ active }) {
  return (
    <div className={`flex items-end gap-[3px] h-4 transition-opacity ${active ? 'opacity-100' : 'opacity-25'}`}>
      {[3, 6, 4, 7, 5, 3, 6].map((h, i) => (
        <div key={i} className={`w-[2.5px] rounded-full ${active ? 'bg-brand-ink' : 'bg-brand-line'}`}
          style={{
            height: `${h * 2}px`,
            animation: active ? `wavebar 0.5s ${i * 0.07}s infinite alternate ease-in-out` : 'none'
          }} />
      ))}
      <style>{`@keyframes wavebar{from{height:4px}to{height:14px}}`}</style>
    </div>
  )
}

/* ── Streaming TTS hook (Web Audio API + chunked PCM) ──────────── */

const TTS_SAMPLE_RATE = 24000
const TTS_MIN_CHUNK_BYTES = 4800 // ~100ms of 16-bit mono @ 24kHz

/**
 * Anti-pop V2: full-buffer playback for Vertex TTS + fade-out on chunks.
 * Set to false to revert to the original chunked-only behavior.
 */
const TTS_ANTI_POP_V2 = false

function useStreamingTTS(language, interviewerStyle, enabled) {
  const ctxRef = useRef(null)
  const enabledRef = useRef(enabled)
  const playGenRef = useRef(0)
  const [speaking, setSpeaking] = useState(false)
  const activeSourcesRef = useRef(new Set())
  const pendingRef = useRef(0)
  const nextTimeRef = useRef(0)
  const legacyAudioRef = useRef(null)
  const quotaExhaustedRef = useRef(false)
  /** Ordering chain: fetches run in parallel, but audio scheduling is serialized */
  const scheduleChainRef = useRef(Promise.resolve())
  /** AbortControllers for in-flight TTS HTTP requests */
  const abortControllersRef = useRef(new Set())

  useLayoutEffect(() => { enabledRef.current = enabled }, [enabled])

  const hasWebAudio = typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext)
  const hasSpeechSynth = typeof window !== 'undefined' && !!window.speechSynthesis

  const getCtx = useCallback(() => {
    if (!hasWebAudio) return null
    const AC = window.AudioContext || window.webkitAudioContext
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AC({ sampleRate: TTS_SAMPLE_RATE })
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume()
    return ctxRef.current
  }, [hasWebAudio])

  const checkIdle = useCallback(() => {
    if (activeSourcesRef.current.size === 0 && pendingRef.current === 0) {
      setSpeaking(false)
    }
  }, [])

  const scheduleChunk = useCallback((ctx, int16, gen) => {
    if (gen !== playGenRef.current || int16.length === 0) return

    const floats = new Float32Array(int16.length)
    for (let i = 0; i < int16.length; i++) floats[i] = int16[i] / 32768

    const audioBuf = ctx.createBuffer(1, floats.length, TTS_SAMPLE_RATE)
    audioBuf.getChannelData(0).set(floats)

    const src = ctx.createBufferSource()
    const gainNode = ctx.createGain()
    src.buffer = audioBuf

    src.connect(gainNode)
    gainNode.connect(ctx.destination)

    const now = ctx.currentTime
    const startAt = Math.max(nextTimeRef.current, now + 0.005)
    
    const fadeTime = 0.020
    gainNode.gain.setValueAtTime(0, startAt)
    gainNode.gain.linearRampToValueAtTime(1, startAt + fadeTime)

    if (TTS_ANTI_POP_V2 && audioBuf.duration > fadeTime * 2) {
      const fadeOutStart = startAt + audioBuf.duration - fadeTime
      gainNode.gain.setValueAtTime(1, fadeOutStart)
      gainNode.gain.linearRampToValueAtTime(0, fadeOutStart + fadeTime)
    }

    src.start(startAt)
    nextTimeRef.current = startAt + audioBuf.duration

    activeSourcesRef.current.add(src)
    src.onended = () => {
      activeSourcesRef.current.delete(src)
      checkIdle()
    }
  }, [checkIdle])

  /** Browser SpeechSynthesis — last resort when Gemini quota is exhausted */
  const speakWithBrowserTTS = useCallback((text, gen) => {
    if (!hasSpeechSynth || gen !== playGenRef.current) return
    const synth = window.speechSynthesis
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = language === 'Deutsch' ? 'de-DE' : language === 'Chinese' ? 'zh-CN' : 'en-US'
    utter.rate = 1.05
    utter.onend = () => { if (gen === playGenRef.current) checkIdle() }
    utter.onerror = () => { if (gen === playGenRef.current) checkIdle() }
    synth.speak(utter)
  }, [language, hasSpeechSynth, checkIdle])

  const stop = useCallback(() => {
    playGenRef.current++
    for (const src of activeSourcesRef.current) {
      try { src.stop(); src.disconnect() } catch { /* ignore */ }
    }
    activeSourcesRef.current.clear()
    for (const ac of abortControllersRef.current) {
      try { ac.abort() } catch { /* ignore */ }
    }
    abortControllersRef.current.clear()
    nextTimeRef.current = 0
    pendingRef.current = 0
    scheduleChainRef.current = Promise.resolve()
    if (legacyAudioRef.current) {
      try { legacyAudioRef.current.pause(); legacyAudioRef.current.src = '' } catch { /* ignore */ }
      legacyAudioRef.current = null
    }
    try { window.speechSynthesis?.cancel() } catch { /* ignore */ }
    setSpeaking(false)
  }, [])

  const enqueue = useCallback(async (text, authToken) => {
    if (!enabledRef.current || !text?.trim()) return
    const gen = playGenRef.current
    pendingRef.current++
    setSpeaking(true)

    const ac = new AbortController()
    abortControllersRef.current.add(ac)
    const signal = ac.signal

    let resolveSlot
    const waitPrev = scheduleChainRef.current
    scheduleChainRef.current = new Promise(r => { resolveSlot = r })

    try {
      if (quotaExhaustedRef.current) {
        await waitPrev
        if (gen !== playGenRef.current) return
        speakWithBrowserTTS(text, gen)
        return
      }

      const ctx = getCtx()

      if (!ctx) {
        try {
          const res = await fetch(`${BACKEND_URL}/api/chat/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
            body: JSON.stringify({ text, language, interviewerStyle }),
            signal,
          })
          if (gen !== playGenRef.current) return
          if (res.status === 429) { quotaExhaustedRef.current = true; await waitPrev; speakWithBrowserTTS(text, gen); return }
          if (!res.ok) { await waitPrev; speakWithBrowserTTS(text, gen); return }
          const blob = await res.blob()
          if (gen !== playGenRef.current) return
          await waitPrev
          if (gen !== playGenRef.current) return
          const url = URL.createObjectURL(blob)
          const audio = new Audio(url)
          legacyAudioRef.current = audio
          audio.onended = () => { URL.revokeObjectURL(url); checkIdle() }
          audio.onerror = () => { URL.revokeObjectURL(url); checkIdle() }
          await audio.play()
        } catch (e) {
          if (e.name === 'AbortError') return
          console.warn('[TTS] Legacy fallback failed, using browser TTS', e)
          speakWithBrowserTTS(text, gen)
        }
        return
      }

      let handled = false

      try {
        const res = await fetch(`${BACKEND_URL}/api/chat/tts-stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ text, language, interviewerStyle }),
          signal,
        })
        if (gen !== playGenRef.current) return

        if (res.status === 429) {
          quotaExhaustedRef.current = true
        } else if (res.ok && res.body) {
          handled = true
          const isFullBuffer = TTS_ANTI_POP_V2 && (
            res.headers.get('X-TTS-Source') === 'VertexAI' ||
            !!res.headers.get('Content-Length')
          )

          if (isFullBuffer) {
            const arrayBuf = await res.arrayBuffer()
            if (gen !== playGenRef.current) return
            await waitPrev
            if (gen !== playGenRef.current) return
            const usable = arrayBuf.byteLength & ~1
            if (usable >= 2) {
              const int16 = new Int16Array(arrayBuf.slice(0, usable))
              scheduleChunk(ctx, int16, gen)
            }
          } else {
            const reader = res.body.getReader()
            let accum = new Uint8Array(0)
            let orderedIn = false

            while (true) {
              const { done, value } = await reader.read()
              if (gen !== playGenRef.current) { reader.cancel(); return }
              if (done) break

              const merged = new Uint8Array(accum.length + value.length)
              merged.set(accum)
              merged.set(value, accum.length)
              accum = merged

              if (accum.length >= TTS_MIN_CHUNK_BYTES) {
                if (!orderedIn) {
                  await waitPrev
                  if (gen !== playGenRef.current) return
                  orderedIn = true
                }
                const usable = accum.length & ~1
                const int16 = new Int16Array(accum.buffer.slice(0, usable))
                scheduleChunk(ctx, int16, gen)
                accum = accum.slice(usable)
              }
            }

            if (accum.length >= 2 && gen === playGenRef.current) {
              if (!orderedIn) {
                await waitPrev
                if (gen !== playGenRef.current) return
              }
              const usable = accum.length & ~1
              const int16 = new Int16Array(accum.buffer.slice(0, usable))
              scheduleChunk(ctx, int16, gen)
            }
          }
        }
      } catch (streamErr) {
        if (streamErr.name === 'AbortError') { return }
        console.warn('[TTS-stream] Streaming failed, falling back', streamErr)
      }

      if (!handled && !quotaExhaustedRef.current && gen === playGenRef.current) {
        try {
          const res = await fetch(`${BACKEND_URL}/api/chat/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
            body: JSON.stringify({ text, language, interviewerStyle }),
            signal,
          })
          if (gen !== playGenRef.current) return
          if (res.status === 429) { quotaExhaustedRef.current = true }
          else if (res.ok) {
            const arrayBuf = await res.arrayBuffer()
            if (gen !== playGenRef.current) return

            const decoded = await ctx.decodeAudioData(arrayBuf)
            if (gen !== playGenRef.current) return

            await waitPrev
            if (gen !== playGenRef.current) return

            const src = ctx.createBufferSource()
            src.buffer = decoded
            src.connect(ctx.destination)

            const now = ctx.currentTime
            const startAt = Math.max(nextTimeRef.current, now + 0.002)
            src.start(startAt)
            nextTimeRef.current = startAt + decoded.duration

            activeSourcesRef.current.add(src)
            src.onended = () => {
              activeSourcesRef.current.delete(src)
              checkIdle()
            }
            handled = true
          }
        } catch (fallbackErr) {
          if (fallbackErr.name === 'AbortError') return
          console.warn('[TTS] WAV fallback failed', fallbackErr)
        }
      }

      // ── Fallback B: browser SpeechSynthesis (quota exhausted or all else failed) ──
      if (!handled && gen === playGenRef.current) {
        await waitPrev
        if (gen !== playGenRef.current) return
        speakWithBrowserTTS(text, gen)
      }
    } catch (err) {
      if (err.name === 'AbortError') return
      console.warn('[TTS] Enqueue error, using browser TTS', err)
      speakWithBrowserTTS(text, playGenRef.current)
    } finally {
      abortControllersRef.current.delete(ac)
      resolveSlot()
      pendingRef.current = Math.max(0, pendingRef.current - 1)
      checkIdle()
    }
  }, [language, interviewerStyle, hasWebAudio, getCtx, scheduleChunk, checkIdle, speakWithBrowserTTS])

  return { enqueue, stop, speaking }
}

/* ── Web Speech API (STT) ────────────────────────────────────── */

function useSpeechRecognition(language, onFinal, onInterim) {
  const recRef = useRef(null)
  const accRef = useRef('')
  const interimRef = useRef('')
  /** Sync ref — false immediately on stop, before React re-renders.
   *  Fixes: onChange still sees stt.active===true for one frame and ignores typing. */
  const listeningRef = useRef(false)
  /** true while the user intends to keep recording (set false only by explicit stop()) */
  const wantActiveRef = useRef(false)
  const restartTimerRef = useRef(null)
  /** Consecutive auto-restarts without receiving any result — caps infinite loops */
  const consecutiveRestartsRef = useRef(0)
  const [active, setActive] = useState(false)
  const supported = !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  const onFinalRef = useRef(onFinal)
  const onInterimRef = useRef(onInterim)
  const langRef = useRef(language)
  onFinalRef.current = onFinal
  onInterimRef.current = onInterim
  langRef.current = language

  const flushInterimToFinal = useCallback(() => {
    const tail = interimRef.current?.trim()
    interimRef.current = ''
    if (tail) {
      accRef.current = `${accRef.current}${accRef.current && !accRef.current.endsWith(' ') ? ' ' : ''}${tail}`
      onFinalRef.current(accRef.current)
    }
  }, [])

  const startEngineRef = useRef(null)

  const startEngine = useCallback(() => {
    if (!supported) return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const r = new SR()
    r.continuous = true; r.interimResults = true
    const recognitionLanguage = String(langRef.current || '').toLowerCase()
    r.lang = recognitionLanguage === 'deutsch' || recognitionLanguage.startsWith('de')
      ? 'de-DE'
      : recognitionLanguage === 'chinese' || recognitionLanguage.startsWith('zh') || recognitionLanguage.includes('中文')
        ? 'zh-CN'
        : 'en-US'
    listeningRef.current = true

    r.onresult = e => {
      if (!listeningRef.current) return
      consecutiveRestartsRef.current = 0
      let fin = '', int = ''
      for (let i = e.resultIndex; i < e.results.length; i++)
        e.results[i].isFinal ? (fin += e.results[i][0].transcript + ' ') : (int += e.results[i][0].transcript)
      if (fin) { accRef.current += fin; onFinalRef.current(accRef.current) }
      interimRef.current = int
      onInterimRef.current(int)
    }

    r.onerror = (evt) => {
      console.warn('[STT] error:', evt.error, evt.message)
      if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(evt.error)) {
        wantActiveRef.current = false
      }
    }

    r.onend = () => {
      flushInterimToFinal()
      onInterimRef.current('')
      interimRef.current = ''

      // Browser often stops continuous recognition on its own (silence timeout,
      // internal session limits, network hiccups). Auto-restart transparently so
      // the user's long answer isn't truncated mid-sentence.
      if (wantActiveRef.current && consecutiveRestartsRef.current < 5) {
        consecutiveRestartsRef.current++
        clearTimeout(restartTimerRef.current)
        restartTimerRef.current = setTimeout(() => {
          if (wantActiveRef.current) startEngineRef.current?.()
        }, 300)
        return
      }

      listeningRef.current = false
      wantActiveRef.current = false
      setActive(false)
    }

    recRef.current = r
    try {
      r.start()
    } catch (e) {
      console.warn('[STT] start() failed:', e)
      listeningRef.current = false
      wantActiveRef.current = false
      setActive(false)
    }
  }, [supported, flushInterimToFinal])

  startEngineRef.current = startEngine

  const start = useCallback((existing = '') => {
    accRef.current = existing
    interimRef.current = ''
    wantActiveRef.current = true
    consecutiveRestartsRef.current = 0
    startEngineRef.current?.()
    setActive(true)
  }, [])

  const stop = useCallback(() => {
    /** 必须先置 false，避免 stop() 之后浏览器仍投递 onresult，把已发送的文本写回输入框 */
    wantActiveRef.current = false
    listeningRef.current = false
    clearTimeout(restartTimerRef.current)
    flushInterimToFinal()
    recRef.current?.stop()
    onInterimRef.current('')
    interimRef.current = ''
    setActive(false)
  }, [flushInterimToFinal])

  /** 录音中用户手动改字时，与引擎累计文本对齐，避免下一轮识别叠在旧 acc 上 */
  const syncAccumulatedFromUser = useCallback((text) => {
    accRef.current = text
    interimRef.current = ''
  }, [])

  return { active, start, stop, supported, listeningRef, syncAccumulatedFromUser }
}

/* ── Main component ───────────────────────────────────────────── */

const ChatInterface = forwardRef(function ChatInterface({
  position,
  jobDescription,
  language,
  duration,
  /** 简历正文快照，供「经历/项目」阶段追问 */
  resumeContext = '',
  /** 'school' | 'work' — 用于让面试官身份匹配场景 */
  roleTrack = 'work',
  /** balanced | supportive | demanding | analytical */
  interviewerStyle = 'balanced',
  /** hr | technical | mixed; server still treats persisted interview config as authoritative */
  interviewerType = 'mixed',
  /** 有值时：防抖将当前对话 POST 到 /api/interviews/:id/transcript */
  persistInterviewId,
  /** 为 true 时：首条 SSE 完成后先预加载 TTS，再调用 onInterviewUiReady */
  deferFirstAudioGate = false,
  /** 为 false 时隐藏聊天 UI（加载阶段仍挂载以跑 SSE） */
  interviewUiVisible = true,
  onInterviewUiReady,
  /** Zoom 式：左侧大屏专业面试官画面 + 右侧会议聊天 */
  digitalHuman = false,
  /** 会前开启的本地摄像头 MediaStream，显示在画中画 */
  userCameraStream = null,
  /** 用户摄像头开启状态 with toggle callback */
  isCameraOn = false,
  onToggleCamera,
  /** 倒计时显示文本与状态（由父级提供，更精确同步） */
  timerDisplay = '00:00',
  timerStatus = 'normal',
  onCandidateAnswerSubmitted,
  mode = 'formal',
  practiceController = null,
}, ref) {
  const { t, i18n } = useTranslation()
  const agentMap = useMemo(
    () => ({
      opening: { ...AGENT_STYLE.opening, label: t('chat.agent.opening') },
      explore: { ...AGENT_STYLE.explore, label: t('chat.agent.explore') },
      technical: { ...AGENT_STYLE.technical, label: t('chat.agent.technical') },
      behavioral: { ...AGENT_STYLE.behavioral, label: t('chat.agent.behavioral') },
      feedback: { ...AGENT_STYLE.feedback, label: t('chat.agent.feedback') },
      analyzer: { ...AGENT_STYLE.analyzer, label: t('chat.agent.analyzer') },
    }),
    [t, i18n.language],
  )

  const resumeSnapshot = useMemo(
    () => (typeof resumeContext === 'string' ? resumeContext.trim().slice(0, 50_000) : ''),
    [resumeContext],
  )

  const [messages, setMessages] = useState([])
  const messagesRef = useRef(messages)
  const stopInterviewRef = useRef(() => {})
  useEffect(() => { messagesRef.current = messages }, [messages])

  const persistInterviewIdRef = useRef(persistInterviewId)
  useLayoutEffect(() => { persistInterviewIdRef.current = persistInterviewId }, [persistInterviewId])

  const persistSig = useMemo(
    () =>
      messages
        .filter((m) => !m.streaming && String(m.content || '').trim())
        .map((m) => `${m.role}:${m.id}:${String(m.content).length}`)
        .join('\u0001'),
    [messages],
  )

  const saveTranscriptToBackend = useCallback(async () => {
    const id = persistInterviewIdRef.current
    if (!id) return
    const rows = messagesRef.current
      .filter((m) => !m.streaming && String(m.content || '').trim())
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content).trim(),
      }))
    if (!rows.length) return
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) return
      await fetch(`${BACKEND_URL}/api/interviews/${id}/transcript`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: rows, idempotencyKey: newRequestId() }),
        keepalive: true,
      })
    } catch { /* ignore */ }
  }, [])

  const candidateAnsweringRef = useRef(false)

  useImperativeHandle(ref, () => ({
    getTranscript: () => messagesRef.current
      .filter((m) => !m.streaming && String(m.content || '').trim())
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content).trim(),
      })),
    stopInterview: () => stopInterviewRef.current(),
    isCandidateAnswering: () => candidateAnsweringRef.current,
  }), [])

  const [input, setInput] = useState('')
  const [interimText, setInterimText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [ttsEnabled, setTtsEnabled] = useState(true)
  const [currentAgent, setCurrentAgent] = useState(null)
  const [initError, setInitError] = useState(null)
  const isPractice = mode === 'practice' && Boolean(practiceController)

  const messagesEndRef = useRef(null)
  const userPipVideoRef = useRef(null)

  useEffect(() => {
    const el = userPipVideoRef.current
    if (!el) return
    const stream = userCameraStream && userCameraStream.getVideoTracks?.().length ? userCameraStream : null
    el.srcObject = stream || null
    if (stream) {
      el.play().catch(() => { })
    }
  }, [userCameraStream])
  // ── BUGFIX: useRef instead of useState prevents React StrictMode
  //   double-invocation from triggering the opening twice.
  //   React 18 Strict Mode runs effect cleanup + re-setup, but ref.current
  //   is preserved between those two cycles (state is restored).
  const isFirstMsg = useRef(true)
  const openingLatchRef = useRef(true)
  const liveInputMessageIdRef = useRef(null)
  const liveOutputMessageIdRef = useRef(null)

  useEffect(() => {
    if (!isPractice) return
    const next = Array.isArray(practiceController.messages) ? practiceController.messages : []
    messagesRef.current = next
    setMessages(next)
    setInput(practiceController.answer || '')
    setInterimText('')
  }, [isPractice, practiceController?.messages, practiceController?.answer])

  useLayoutEffect(() => {
    openingLatchRef.current = true
  }, [position])
  const deferGateRef = useRef(deferFirstAudioGate)
  const onInterviewReadyRef = useRef(onInterviewUiReady)
  const ttsEnabledRef = useRef(ttsEnabled)

  useLayoutEffect(() => {
    deferGateRef.current = deferFirstAudioGate
  }, [deferFirstAudioGate])
  useLayoutEffect(() => {
    onInterviewReadyRef.current = onInterviewUiReady
  }, [onInterviewUiReady])
  useLayoutEffect(() => {
    ttsEnabledRef.current = ttsEnabled
  }, [ttsEnabled])

  const releaseOpeningGate = useCallback(() => {
    if (!deferGateRef.current || !openingLatchRef.current) return
    openingLatchRef.current = false
    onInterviewReadyRef.current?.()
  }, [])

  const nativeLiveEnabled = digitalHuman
  const legacyTts = useStreamingTTS(language, interviewerStyle, ttsEnabled)
  const legacyStt = useSpeechRecognition(
    language,
    useCallback(t => setInput(normalizeCjkSpacing(t)), []),
    useCallback(t => setInterimText(normalizeCjkSpacing(t)), []),
  )

  const handleLiveReady = useCallback(() => {
    if (isPractice) {
      setIsStreaming(false)
      setCurrentAgent(null)
      onInterviewReadyRef.current?.()
      return
    }
    setCurrentAgent({ name: 'opening' })
    setIsStreaming(true)
  }, [isPractice])

  const handleLiveAudioStart = useCallback(() => {
    releaseOpeningGate()
  }, [releaseOpeningGate])

  const handleLiveInputTranscript = useCallback((text) => {
    const content = normalizeCjkSpacing(String(text || '').trim())
    if (!content) return
    if (isPractice) {
      setInterimText(content)
      practiceController.setAnswer(normalizeCjkSpacing([speechBaseForPracticeRef.current, content].filter(Boolean).join(' ').trim()))
      return
    }
    setInterimText(content)
    let id = liveInputMessageIdRef.current
    if (!id) {
      id = Date.now()
      liveInputMessageIdRef.current = id
      setMessages(prev => [...prev, { id, role: 'user', content, streaming: true }])
    } else {
      setMessages(prev => prev.map(message => message.id === id ? { ...message, content } : message))
    }
  }, [isPractice, practiceController])

  const handleLiveOutputTranscript = useCallback((text) => {
    const content = sanitizeSquareBrackets(String(text || '').trim())
    if (!content) return
    if (isPractice) return
    releaseOpeningGate()
    setIsStreaming(true)
    const agent = openingLatchRef.current ? 'opening' : 'explore'
    setCurrentAgent({ name: agent })
    let id = liveOutputMessageIdRef.current
    if (!id) {
      id = Date.now() + 1
      liveOutputMessageIdRef.current = id
      setMessages(prev => [...prev, { id, role: 'assistant', content, streaming: true, agent }])
    } else {
      setMessages(prev => prev.map(message => message.id === id ? { ...message, content, agent } : message))
    }
  }, [releaseOpeningGate, isPractice])

  const handleLiveTurnComplete = useCallback(({ inputText, outputText }) => {
    const inputId = liveInputMessageIdRef.current
    const outputId = liveOutputMessageIdRef.current
    const finalInput = normalizeCjkSpacing(String(inputText || '').trim())
    const finalOutput = sanitizeSquareBrackets(String(outputText || '').trim())

    if (isPractice) {
      if (finalInput) {
        const accumulatedAnswer = normalizeCjkSpacing([speechBaseForPracticeRef.current, finalInput].filter(Boolean).join(' ').trim())
        speechBaseForPracticeRef.current = accumulatedAnswer
        practiceController.setAnswer(accumulatedAnswer)
      }
      setInterimText('')
      setIsStreaming(false)
      setCurrentAgent(null)
      return
    }

    setMessages(prev => {
      let next = prev.map(message => {
        if (message.id === inputId) return { ...message, content: finalInput || message.content, streaming: false }
        if (message.id === outputId) return { ...message, content: finalOutput || message.content, streaming: false }
        return message
      })
      if (finalInput && !inputId) next = [...next, { id: Date.now(), role: 'user', content: finalInput, streaming: false }]
      if (finalOutput && !outputId) {
        const agent = openingLatchRef.current ? 'opening' : 'explore'
        next = [...next, { id: Date.now() + 1, role: 'assistant', content: finalOutput, streaming: false, agent }]
      }
      messagesRef.current = next
      return next
    })

    liveInputMessageIdRef.current = null
    liveOutputMessageIdRef.current = null
    setInput('')
    setInterimText('')
    setIsStreaming(false)
    setCurrentAgent(null)
    releaseOpeningGate()
    if (finalInput) window.setTimeout(() => onCandidateAnswerSubmitted?.(), 0)
  }, [releaseOpeningGate, onCandidateAnswerSubmitted, isPractice, practiceController])

  const handleLiveError = useCallback((error) => {
    setInitError(t('chat.connErr', { msg: error?.message || 'Gemini Live error' }))
    setIsStreaming(false)
    setCurrentAgent(null)
    releaseOpeningGate()
  }, [releaseOpeningGate, t])

  const live = useGeminiLiveInterview({
    enabled: nativeLiveEnabled,
    config: {
      interviewId: persistInterviewId,
      position,
      jobDescription,
      language,
      duration,
      resumeSnapshot,
      roleTrack,
      interviewerStyle,
      interviewerType,
    },
    audioEnabled: ttsEnabled,
    onReady: handleLiveReady,
    onAudioStart: handleLiveAudioStart,
    onInputTranscript: handleLiveInputTranscript,
    onOutputTranscript: handleLiveOutputTranscript,
    onTurnComplete: handleLiveTurnComplete,
    onError: handleLiveError,
  })

  const autoMicStartedRef = useRef(false)
  const speechBaseForPracticeRef = useRef('')
  const spokenPracticeQuestionRef = useRef(null)
  useEffect(() => {
    if (!live.connected) spokenPracticeQuestionRef.current = null
  }, [live.connected])
  useEffect(() => {
    if (!nativeLiveEnabled) return
    if (!live.connected) {
      autoMicStartedRef.current = false
      return
    }
    if (isPractice || autoMicStartedRef.current) return
    autoMicStartedRef.current = true
    void live.startMic()
  }, [nativeLiveEnabled, live.connected, live.startMic, isPractice])

  useEffect(() => {
    if (!isPractice || !live.connected || practiceController.paused || !practiceController.currentQuestion) return
    const question = practiceController.currentQuestion
    if (spokenPracticeQuestionRef.current === question.id) return
    spokenPracticeQuestionRef.current = question.id
    live.sendText(`[PRACTICE_CONTROL] Read this question exactly once in the interview language, without commentary: ${question.question_text}`)
  }, [isPractice, live.connected, live.sendText, practiceController])

  const tts = nativeLiveEnabled
    ? { speaking: live.speaking, stop: live.stopAudio, enqueue: () => {} }
    : legacyTts
  const stt = nativeLiveEnabled
    ? {
        active: live.recording,
        start: live.startMic,
        stop: live.stopMic,
        supported: live.supported,
        listeningRef: live.listeningRef,
        syncAccumulatedFromUser: () => {},
      }
    : legacyStt

  candidateAnsweringRef.current = Boolean(stt.active || input.trim() || interimText.trim())

  const ttsRef = useRef(tts)
  const sttRef = useRef(stt)
  useLayoutEffect(() => {
    ttsRef.current = tts
    sttRef.current = stt
  }, [tts, stt])

  useLayoutEffect(() => {
    stopInterviewRef.current = () => {
      const frozenMessages = messagesRef.current.map(message => (
        message.streaming ? { ...message, streaming: false } : message
      ))
      messagesRef.current = frozenMessages
      setMessages(frozenMessages)
      live.disconnect()
      legacyTts.stop()
      try { legacyStt.stop() } catch { /* ignore */ }
      try { window.speechSynthesis?.cancel() } catch { /* ignore */ }
      setIsStreaming(false)
      setCurrentAgent(null)
    }
  }, [legacyStt, legacyTts, live])

  // ── 离开面试页：立刻停语音与麦克风 ──
  useEffect(() => {
    return () => {
      ttsRef.current.stop()
      try { sttRef.current.stop() } catch { /* ignore */ }
      try { window.speechSynthesis?.cancel() } catch { /* ignore */ }
    }
  }, [])

  // ── Auto-scroll ───────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── 面试中途：防抖保存对话到 Supabase（结束面试时 finalize 会再写入完整稿）──
  useEffect(() => {
    if (!persistInterviewId) return
    const tmr = window.setTimeout(() => { void saveTranscriptToBackend() }, 6000)
    return () => window.clearTimeout(tmr)
  }, [persistSig, persistInterviewId, saveTranscriptToBackend])

  useEffect(() => {
    if (!persistInterviewId) return
    return () => { void saveTranscriptToBackend() }
  }, [persistInterviewId, saveTranscriptToBackend])

  // ── Kick off interview — AbortController prevents StrictMode double-fire ──
  // React 18 Strict Mode: effect runs → cleanup → effect runs again.
  // The AbortController lets the cleanup cancel the in-flight fetch from the
  // first run, so only the second run's fetch reaches the backend.
  useEffect(() => {
    if (!position || nativeLiveEnabled) return

    const controller = new AbortController()
    const trigger = language === 'Deutsch'
      ? t('chat.startTriggerDe')
      : language === 'Chinese'
        ? t('chat.startTriggerZh')
        : t('chat.startTriggerEn')

    // Let React StrictMode finish its synthetic setup/cleanup cycle before
    // starting the real opening request.
    const startTimer = window.setTimeout(() => {
      void runGraph([{ role: 'user', content: trigger }], /* isSystem */ true, controller.signal)
    }, 0)

    return () => {
      window.clearTimeout(startTimer)
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, nativeLiveEnabled])

  // ── Core: call backend LangGraph via SSE ──────────────────────
  const runGraph = useCallback(async (messageHistory, isSystem = false, signal = null) => {
    let sessionResult
    try {
      sessionResult = await supabase.auth.getSession()
    } catch (err) {
      if (signal?.aborted) return
      console.error('[ChatInterface] Failed to read auth session', err)
      setInitError(t('chat.sessionReadFail'))
      releaseOpeningGate()
      return
    }

    const token = sessionResult.data.session?.access_token
    if (!token) {
      if (signal?.aborted) return
      setInitError(t('chat.sessionMissing'))
      releaseOpeningGate()
      return
    }
    if (signal?.aborted) return   // already cancelled before we even started

    tts.stop()
    if (stt.active) stt.stop()

    // Reset server session on very first call
    const needsReset = isFirstMsg.current
    if (needsReset) {
      isFirstMsg.current = false
      try {
        await fetch(`${BACKEND_URL}/api/chat/reset`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            interviewId: persistInterviewIdRef.current,
            position,
            jobDescription,
            language,
            duration,
            resumeSnapshot,
            roleTrack,
            interviewerStyle,
            interviewerType,
          }),
          signal,
        })
      } catch { /* non-fatal (may be AbortError) */ }
    }

    if (signal?.aborted) return   // cancelled during reset

    const aiId = Date.now()
    /** 开启语音时：SSE 正文先不落屏，等 TTS 真正开始播放再一次性展示，与声音对齐 */
    const deferAssistantText = ttsEnabledRef.current
    setMessages(prev => [...prev, { id: aiId, role: 'assistant', content: '', streaming: true, agent: null }])
    setIsStreaming(true)
    setCurrentAgent(null)

    let fullText = ''
    let sentenceBuffer = ''
    let firstChunkSent = false
    let lastAgentName = null
    let sseDone = false
    let hasError = false
    let didTimeout = false
    const requestController = new AbortController()
    const abortFromParent = () => requestController.abort(signal?.reason)
    if (signal) signal.addEventListener('abort', abortFromParent, { once: true })
    const requestTimeout = window.setTimeout(() => {
      didTimeout = true
      requestController.abort()
    }, CHAT_REQUEST_TIMEOUT_MS)

    try {
      const res = await fetch(`${BACKEND_URL}/api/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          interviewId: persistInterviewIdRef.current,
          idempotencyKey: newRequestId(),
          messages: messageHistory,
          position,
          jobDescription,
          language,
          duration,
          resumeSnapshot,
          roleTrack,
          interviewerStyle,
          interviewerType,
        }),
        signal: requestController.signal,
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      sse: while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue
          let evt
          try { evt = JSON.parse(raw) } catch { continue }

          if (evt.type === 'agent') {
            lastAgentName = evt.name
            setCurrentAgent(evt)
            setMessages(prev => prev.map(m => m.id === aiId ? { ...m, agent: evt.name } : m))
          }

          if (evt.type === 'text' && evt.content) {
            const chunk = evt.content
            fullText += chunk
            sentenceBuffer += chunk

               // Real-time TTS trigger — larger chunks to save API quota
               if (ttsEnabledRef.current && lastAgentName !== 'feedback') {
                  const sentenceEndMatch = sentenceBuffer.match(/[。！？.!?\n]/)
                  const commaMatch = sentenceBuffer.match(/[，,;；]/)
                  let splitIdx = -1

                   if (sentenceEndMatch && (sentenceBuffer.length >= 15 || firstChunkSent)) {
                     splitIdx = sentenceEndMatch.index + 1
                   } else if (!firstChunkSent && sentenceBuffer.length >= 40) {
                     const boundary = sentenceBuffer.match(/[。！？.!?，,;；:：\n]/)
                     if (boundary) splitIdx = boundary.index + 1
                     else if (sentenceBuffer.length >= 60) {
                        const lastSpace = sentenceBuffer.lastIndexOf(' ')
                        if (lastSpace >= 20) splitIdx = lastSpace + 1
                     }
                   } else if (commaMatch && sentenceBuffer.length >= 100) {
                     splitIdx = commaMatch.index + 1
                   } else if (sentenceBuffer.length >= 150) {
                     const lastSpace = sentenceBuffer.lastIndexOf(' ')
                     splitIdx = lastSpace > 80 ? lastSpace + 1 : sentenceBuffer.length
                   }

                   if (splitIdx !== -1) {
                     const toSend = sanitizeSquareBrackets(sentenceBuffer.slice(0, splitIdx))
                     if (toSend.trim()) {
                       tts.enqueue(toSend, token)
                       sentenceBuffer = sentenceBuffer.slice(splitIdx)
                       firstChunkSent = true 
                     }
                   }
               }

            // UI Text Update: Use fullText to guarantee no truncation
            setMessages(prev => prev.map(m =>
              m.id === aiId ? { ...m, content: fullText } : m
            ))
          }

          if (evt.type === 'done') {
            if (requestController.signal.aborted) break sse
            // Finalize remaining buffer
            if (ttsEnabledRef.current && sentenceBuffer.trim() && lastAgentName !== 'feedback') {
               tts.enqueue(sanitizeSquareBrackets(sentenceBuffer), token)
            }
            sseDone = true
            
            const deferOpen = deferGateRef.current && openingLatchRef.current
            if (deferOpen) {
              openingLatchRef.current = false
              // Since we're now streaming, "ready" might be better defined as "first audio started"
              // but for now, we'll keep it at the end of text stream to be safe.
              onInterviewReadyRef.current?.()
            }
            break sse
          }

          if (evt.type === 'error') {
            hasError = true
            releaseOpeningGate()
            setInitError(t('chat.connErr', { msg: evt.message || t('chat.streamFailed') }))
            setMessages(prev => prev.map(m =>
              m.id === aiId ? { ...m, content: m.content || t('chat.errRetry'), streaming: false } : m
            ))
          }
        }
      }

      if (!sseDone && !hasError && !requestController.signal.aborted) {
        throw new Error(t('chat.streamEnded'))
      }

      if (!hasError || fullText) {
        setMessages(prev => prev.map(m =>
          m.id === aiId ? { ...m, content: sanitizeSquareBrackets(fullText || m.content), streaming: false } : m
        ))
      }
    } catch (err) {
      if (err.name === 'AbortError' && !didTimeout) {
        // StrictMode cancelled the first call — silently remove the orphan bubble
        setMessages(prev => prev.filter(m => m.id !== aiId))
        setIsStreaming(false)
        return
      }
      console.error('[ChatInterface]', err)
      releaseOpeningGate()
      setInitError(didTimeout
        ? t('chat.requestTimeout')
        : t('chat.connErr', { msg: err.message }))
      setMessages(prev => prev.map(m =>
        m.id === aiId ? { ...m, content: t('chat.connFail'), streaming: false } : m
      ))
    } finally {
      window.clearTimeout(requestTimeout)
      if (signal) signal.removeEventListener('abort', abortFromParent)
      setIsStreaming(false)
      setCurrentAgent(null)
      if (!sseDone) {
        setMessages(prev => prev.map(m => m.id === aiId ? { ...m, streaming: false } : m))
      }
    }
  }, [position, jobDescription, language, duration, resumeSnapshot, roleTrack, interviewerStyle, interviewerType, tts, stt, t, releaseOpeningGate])

  // ── Send message ──────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    const trimmed = normalizeCjkSpacing(text?.trim())
    if (!trimmed || isStreaming) return
    if (isPractice) {
      if (stt.active) stt.stop()
      setInterimText('')
      await practiceController.submitAnswer(trimmed)
      return
    }
    if (nativeLiveEnabled) {
      if (stt.active) {
        stt.stop()
        setInput('')
        setInterimText('')
        return
      }
      if (!live.sendText(trimmed)) {
        setInitError(t('chat.connErr', { msg: 'Live interview is not connected' }))
        return
      }
      setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: trimmed, streaming: false }])
      setInput('')
      setInterimText('')
      setIsStreaming(true)
      return
    }
    if (stt.active) stt.stop()
    tts.stop()
    setInput('')
    setInterimText('')

    const userMsg = { id: Date.now(), role: 'user', content: trimmed }
    const updated = [...messages, userMsg]
    messagesRef.current = updated
    setMessages(updated)

    if (onCandidateAnswerSubmitted?.() === true) return

    const history = updated
      .filter(m => m.content)
      .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))

    await runGraph(history, false)
  }, [isStreaming, messages, stt, tts, runGraph, nativeLiveEnabled, live, t, onCandidateAnswerSubmitted, isPractice, practiceController])

  /** 录音中为已落稿 + 实时识别；非录音即输入框 */
  const inputDraft = isPractice
    ? String(practiceController.answer || '')
    : stt.active ? `${input}${interimText}` : input

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (stt.active) stt.stop()
      sendMessage(inputDraft)
    }
  }

  const displayMessages = messages.filter(m => (m.content || m.streaming) && m.agent !== 'feedback')

  const interviewerThinking = isStreaming || Boolean(currentAgent)
  const interactionBusy = isStreaming || Boolean(practiceController?.busy)
  const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant')
  const activeAgentName = currentAgent?.name || lastAssistantMsg?.agent
  const activeAgentLabel = activeAgentName ? (agentMap[activeAgentName]?.label || activeAgentName) : 'Interviewer'

  const digitalStateLabel = stt.active
    ? t('interview.digitalStateListening')
    : tts.speaking
      ? t('interview.digitalStateSpeaking')
      : interviewerThinking
        ? t('interview.digitalStateThinking')
        : t('interview.digitalStateIdle')

  const HR_PORTRAIT_SRC = `${String(import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')}images/interviewer-hr.png`

  const liveConnectionOk = nativeLiveEnabled ? live.connected : !initError

  const messageItems = (
    <>
      {displayMessages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full min-h-[8rem] gap-3 opacity-50">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-violet">
            <BrainCircuit className="h-6 w-6 text-white" />
          </div>
          <p className="text-[13px] text-brand-muted">{t('chat.preparing')}</p>
          <TypingDots />
        </div>
      )}

      {displayMessages.map(msg => {
        const cfg = agentMap[msg.agent] || agentMap.opening
        const { Icon } = cfg
        return (
          <div
            key={msg.id}
            className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && !digitalHuman && (
              <div className={`w-10 h-10 rounded-2xl ${cfg.color} flex items-center justify-center flex-shrink-0 mt-8 shadow-sm`}>
                <Icon className="w-5 h-5" />
              </div>
            )}

            <div className={`flex flex-col gap-2 ${digitalHuman ? 'max-w-full' : 'max-w-[85%]'} ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`px-4 py-3 text-[13px] leading-relaxed ${msg.role === 'user'
                  ? 'rounded-2xl rounded-tr-none bg-brand-ink font-medium text-brand-on-ink'
                  : 'rounded-2xl rounded-tl-none border border-brand-line bg-brand-card text-brand-ink'
                }`}>
                {msg.streaming && !msg.content
                  ? <TypingDots />
                  : <div className="whitespace-pre-wrap">{sanitizeSquareBrackets(msg.content)}</div>}
              </div>
            </div>
          </div>
        )
      })}

      <div ref={messagesEndRef} />
    </>
  )

  const inputBarSection = (
    <div className="relative z-10 flex-shrink-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl px-6 py-4 space-y-4 border-t border-slate-200 dark:border-slate-900">

      {/* Status Indicators */}
      <div className="flex items-center justify-between gap-4 h-6">
        <div className="flex items-center gap-4">
          {stt.active && (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-50 dark:bg-red-950/20 rounded-full border border-red-100 dark:border-red-900/30">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-red-600 dark:text-red-400">{t('chat.recording')}</span>
            </div>
          )}

          {interactionBusy && (
            <div className="flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                {currentAgent ? (agentMap[currentAgent.name]?.label ?? currentAgent.label) : t('chat.analyzing')}
              </span>
            </div>
          )}

          {tts.speaking && !stt.active && (
            <div className="flex items-center gap-3">
              <WaveIcon active />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{t('chat.ttsPlaying')}</span>
            </div>
          )}
        </div>

        <button
          onClick={() => { setTtsEnabled(v => !v); tts.stop() }}
          className={`group flex items-center gap-2 px-3 py-1 rounded-lg transition-all ${ttsEnabled ? 'text-slate-900 dark:text-white' : 'text-slate-400'
            }`}
        >
          {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          <span className="text-[10px] font-semibold uppercase tracking-widest">{ttsEnabled ? t('chat.voiceOn') : t('chat.voiceOff')}</span>
        </button>
      </div>

      <div className="flex gap-4 items-end max-w-5xl mx-auto w-full">
        <button
          onClick={() => {
            if (stt.active) stt.stop()
            else {
              if (isPractice) speechBaseForPracticeRef.current = String(practiceController.answer || '').trim()
              stt.start(isPractice ? practiceController.answer : input)
            }
          }}
          disabled={!stt.supported || interactionBusy || Boolean(practiceController?.paused)}
          aria-pressed={stt.active}
          aria-label={stt.active ? 'Microphone on — click to mute' : 'Microphone off — click to unmute'}
          title={stt.active ? 'Microphone on — click to mute' : 'Microphone off — click to unmute'}
          className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${stt.active
              ? 'bg-red-600 text-white shadow-xl shadow-red-600/20'
              : 'bg-slate-100 dark:bg-slate-900 text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
            } disabled:opacity-50`}
        >
          {stt.active ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
        </button>

        <div className="flex-1 relative group">
          <textarea
            value={isPractice ? practiceController.answer : stt.active ? input + interimText : input}
            onChange={e => {
              const v = e.target.value
              if (isPractice) {
                practiceController.setAnswer(v)
                return
              }
              if (stt.listeningRef.current) {
                stt.syncAccumulatedFromUser(v)
                setInterimText('')
                setInput(v)
                return
              }
              setInput(v)
            }}
            onKeyDown={handleKeyDown}
            placeholder={stt.active ? t('chat.listening') : t('chat.placeholder', { lang: language || 'English' })}
            rows={1}
            disabled={interactionBusy || Boolean(practiceController && !practiceController.canDraftAnswer)}
            className="w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 text-sm font-medium rounded-2xl px-6 py-4.5 min-h-[56px] max-h-32 resize-none focus:outline-none border border-slate-100 dark:border-slate-800 focus:border-slate-900 dark:focus:border-white transition-all disabled:opacity-50"
          />
          {interimText && stt.active && (
            <div className="absolute left-6 bottom-4 text-[10px] font-medium text-slate-400 italic pointer-events-none">
              {interimText}
            </div>
          )}
        </div>

        <button
          onClick={() => {
            const text = stt.active ? `${input}${interimText}` : input
            if (stt.active) stt.stop()
            sendMessage(text)
          }}
          disabled={!inputDraft.trim() || interactionBusy || Boolean(practiceController && !practiceController.canDraftAnswer)}
          className="flex-shrink-0 w-14 h-14 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl flex items-center justify-center hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-xl shadow-slate-900/10 disabled:opacity-50"
        >
          {interactionBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </div>

      <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        {stt.supported ? t('chat.hintFull') : t('chat.hintType')}
      </p>
    </div>
  )

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col bg-brand-paper text-brand-ink ${interviewUiVisible
          ? ''
          : 'absolute inset-0 z-0 opacity-0 pointer-events-none overflow-hidden min-h-0'
        }`}
      aria-hidden={!interviewUiVisible}
    >
      {/* Error banner */}
      {initError && (
        <div className="flex flex-shrink-0 items-center gap-2 border-b border-brand-danger/30 bg-brand-danger/[0.08] px-4 py-2 text-[12px] text-brand-ink">
          ⚠️ {initError}
          <button
            onClick={() => {
              setInitError(null)
              isFirstMsg.current = true
              setMessages([])
              liveInputMessageIdRef.current = null
              liveOutputMessageIdRef.current = null
              openingLatchRef.current = true
              if (nativeLiveEnabled) {
                live.reconnect()
                return
              }
              const controller = new AbortController()
              const trigger = language === 'Deutsch'
                ? t('chat.startTriggerDe')
                : language === 'Chinese'
                  ? t('chat.startTriggerZh')
                  : t('chat.startTriggerEn')
              // Restart opening generation. Previously this button only cleared UI state.
              void runGraph([{ role: 'user', content: trigger }], /* isSystem */ true, controller.signal)
            }}
            className="ml-auto flex items-center gap-1 font-bold text-brand-danger transition-opacity hover:opacity-70"
          >
            <RefreshCw className="w-3 h-3" /> {t('chat.retry')}
          </button>
        </div>
      )}

      {digitalHuman ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-transparent">
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
            {/* Stage 1: AI Interviewer (40% Width) */}
            <main
              className="relative m-3 h-[30vh] shrink-0 overflow-hidden rounded-[20px] bg-brand-ink lg:m-4 lg:h-auto lg:flex-[4]"
              aria-label={t('interview.digitalHuman')}
            >
              <img
                src={HR_PORTRAIT_SRC}
                alt=""
                className={`absolute inset-0 h-full w-full object-cover object-[center_20%] transition-all duration-1000 ${tts.speaking ? 'scale-[1.05] opacity-100 blur-[0.5px]' : 'opacity-90'}`}
                decoding="async"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />

              {/* AI Status Header */}
              <div className="pointer-events-none absolute left-5 top-5 z-20 flex items-center gap-2">
                <div className="flex items-center gap-2.5 rounded-full bg-black/55 px-3.5 py-1.5 backdrop-blur">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-brand-danger" />
                  <span className="text-[11px] font-bold text-white">{t('interview.digitalZoomLive')}</span>
                </div>
                <div className="rounded-full bg-white/10 px-3.5 py-1.5 text-[11px] font-bold text-white/70 backdrop-blur">
                   {activeAgentLabel}
                </div>
              </div>

              {/* AI Name & Visualizer */}
              <div className="pointer-events-none absolute bottom-5 left-5 z-20 flex flex-col gap-2">
                <div className="flex items-center gap-4">
                  <h3 className="font-brand text-[22px] font-semibold leading-none tracking-tight text-white">{t('interview.digitalHuman')}</h3>
                  {tts.speaking && (
                    <div className="flex h-6 items-end gap-1.5 rounded-full bg-white/10 px-3 py-1 backdrop-blur">
                      {[4, 7, 5, 9, 6].map((h, i) => (
                        <div key={i} className="w-1 rounded-full bg-brand-violet animate-dh-wave" style={{ height: `${h * 2}px`, animationDelay: `${i * 100}ms` }} />
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                   <div className="h-1.5 w-1.5 rounded-full bg-brand-violet" />
                   <span className="text-[11px] font-bold text-white/75">{digitalStateLabel}</span>
                </div>
              </div>
            </main>

            {/* Stage 2: Candidate (User) (40% Width) */}
            <div className="group relative m-3 h-[22vh] shrink-0 overflow-hidden rounded-[20px] bg-brand-ink lg:m-4 lg:h-auto lg:flex-[4]">
               {userCameraStream?.getVideoTracks?.()?.length ? (
                  <video
                    ref={userPipVideoRef}
                    className="h-full w-full object-cover"
                    playsInline
                    muted
                    autoPlay
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                    <div className="grid h-14 w-14 place-items-center rounded-full bg-white/10">
                       <VideoOff className="h-6 w-6 text-white/40" />
                    </div>
                    <span className="text-[12px] text-white/45">{t('interview.cameraOff')}</span>
                  </div>
                )}
                
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />

                {/* Candidate Label */}
                <div className="pointer-events-none absolute left-5 top-5 z-20 flex items-center gap-2">
                  <div className="flex items-center gap-2.5 rounded-full bg-black/55 px-3.5 py-1.5 backdrop-blur">
                    <div className="h-2 w-2 rounded-full bg-brand-violet" />
                    <span className="text-[11px] font-bold text-white">{t('interview.candidateLabel', { defaultValue: 'Candidate' })}</span>
                  </div>
                </div>

                <div className="pointer-events-none absolute bottom-5 left-5 z-20 flex flex-col gap-2">
                   <h3 className="font-brand text-[22px] font-semibold leading-none tracking-tight text-white">{t('chat.you')}</h3>
                   <div className="flex items-center gap-2">
                     <div className="h-1.5 w-1.5 rounded-full bg-brand-violet" />
                     <span className="text-[11px] font-bold text-white/75">{t('interview.onScreen')}</span>
                   </div>
                </div>
            </div>

            {/* Chat Sidebar: Meeting Transcript (20% Width) */}
            <aside className={`brand-float relative m-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] lg:m-0 lg:my-4 lg:mr-4 ${isPractice ? 'lg:flex-[3]' : 'lg:flex-[2]'}`}>
              
              <div className="relative z-20 flex flex-shrink-0 flex-col gap-4 border-b border-brand-line px-5 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[12.5px] font-bold text-brand-ink">{t('interview.transcriptTitle')}</h3>
                  {/* Timer: Compact style */}
                  <div className="flex items-center gap-2 rounded-lg border border-brand-line bg-brand-inset px-2.5 py-1">
                    <Clock className={`h-3.5 w-3.5 ${timerStatus === 'critical' ? 'animate-pulse text-brand-danger' : 'text-brand-muted'}`} />
                    <span className={`text-[13px] font-bold tabular-nums ${timerStatus === 'critical' ? 'text-brand-danger' : 'text-brand-ink'}`}>
                      {timerDisplay}
                    </span>
                  </div>
                </div>
              </div>

              <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto scroll-smooth px-5 py-5">
                {messageItems}
              </div>

              {isPractice && (
                <div className="custom-scrollbar relative z-20 max-h-[58%] space-y-3 overflow-y-auto border-t border-brand-line bg-brand-inset p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[12.5px] font-semibold text-brand-ink">{t('interview.practice.title')}</span>
                    <button type="button" disabled={practiceController.busy} onClick={() => {
                      if (!practiceController.paused) live.stopMic()
                      void practiceController.togglePause()
                    }} className="rounded-lg border border-brand-line bg-brand-card px-2.5 py-1.5 text-[11.5px] font-bold text-brand-ink transition-colors hover:border-brand-ink">
                      {practiceController.paused ? t('interview.practice.resume') : t('interview.practice.pause')}
                    </button>
                  </div>

                  <div className="text-[11.5px] text-brand-muted">
                    {t('interview.practice.progress', {
                      current: practiceController.workspace.interview.question_index || 0,
                      total: practiceController.workspace.practiceLimits?.questionLimit || '–',
                      difficulty: practiceController.workspace.interview.current_difficulty,
                      type: t(`setup.type${interviewerType === 'hr' ? 'Hr' : interviewerType === 'technical' ? 'Technical' : 'Mixed'}`),
                    })}
                  </div>

                  {practiceController.error && <div className="rounded-xl border border-brand-danger/30 bg-brand-danger/[0.07] p-2.5 text-[12px] text-brand-ink">{practiceController.error}</div>}
                  {practiceController.paused ? (
                    <div className="rounded-xl border border-brand-line bg-brand-card p-3 text-[12px] text-brand-ink">{t('interview.practice.pausedMessage')}</div>
                  ) : (
                    <>
                      <textarea
                        value={practiceController.answer}
                        onChange={event => practiceController.setAnswer(event.target.value)}
                        rows={4}
                        disabled={practiceController.busy || !practiceController.canDraftAnswer}
                        placeholder={practiceController.attempts.length ? t('interview.practice.refinePlaceholder') : t('interview.practice.answerPlaceholder')}
                        className="w-full resize-none rounded-xl border border-brand-line bg-brand-card p-3 text-[12.5px] leading-relaxed text-brand-ink outline-none focus:border-brand-ink disabled:opacity-60"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" disabled={practiceController.busy || !practiceController.answer.trim() || !practiceController.canDraftAnswer} onClick={() => void practiceController.submitAnswer()} className="rounded-xl bg-brand-ink px-3 py-2.5 text-[11.5px] font-semibold text-brand-on-ink disabled:opacity-40">
                          {practiceController.attempts.length ? t('interview.practice.submitRetry') : t('interview.practice.submit')}
                        </button>
                        <button type="button" disabled={practiceController.busy || practiceController.hintsExhausted} onClick={() => void practiceController.nextHint()} className="rounded-xl border border-brand-violet/50 px-3 py-2.5 text-[11.5px] font-semibold text-brand-violet disabled:opacity-40">
                          {practiceController.hintsExhausted ? t('interview.practice.hintsExhausted') : t('interview.practice.nextHint')}
                        </button>
                        {practiceController.attempts.length > 0 && !practiceController.retrying && <button type="button" disabled={practiceController.busy} onClick={() => void practiceController.beginRetry()} className="rounded-xl border border-brand-line px-3 py-2.5 text-[11.5px] font-semibold text-brand-ink">{t('interview.practice.retry')}</button>}
                        <button type="button" disabled={practiceController.busy || practiceController.attempts.length === 0} onClick={() => void practiceController.masterNext()} className="rounded-xl border border-brand-line px-3 py-2.5 text-[11.5px] font-semibold text-brand-ink disabled:opacity-40">{t('interview.practice.masterNext')}</button>
                        <button type="button" disabled={practiceController.busy} onClick={() => void practiceController.skipNext()} className="rounded-xl border border-brand-line px-3 py-2.5 text-[11.5px] font-semibold text-brand-muted">{t('interview.practice.skipNext')}</button>
                      </div>

                      {practiceController.hints.map(hint => <div key={hint.id} className="rounded-xl border border-brand-violet/30 bg-brand-violet/[0.06] p-3 text-[12px] text-brand-ink"><div className="mb-1 text-[11px] font-semibold text-brand-violet">{t(`interview.practice.hintLevels.${hint.level}`)}</div>{hint.content}</div>)}
                      {practiceController.latestFeedback && <div className="rounded-xl border border-brand-line bg-brand-card p-3 text-[12px] text-brand-ink"><div className="font-semibold">{t('interview.practice.score', { score: practiceController.latestFeedback.score })}</div>{(practiceController.latestFeedback.strengths || []).slice(0, 2).map(item => <p key={item} className="mt-1">✓ {item}</p>)}{(practiceController.latestFeedback.gaps || []).slice(0, 2).map(item => <p key={item} className="mt-1">→ {item}</p>)}</div>}
                      <details className="rounded-xl border border-brand-line bg-brand-card p-3 text-[12px]">
                        <summary className="cursor-pointer font-semibold text-brand-muted">{t('interview.practice.privateNotes')}</summary>
                        <textarea value={practiceController.note} onChange={event => practiceController.setNote(event.target.value)} rows={2} className="mt-3 w-full resize-none rounded-lg border border-brand-line bg-brand-inset p-2 text-brand-ink outline-none focus:border-brand-ink" />
                        <button type="button" disabled={practiceController.busy} onClick={() => void practiceController.saveNote()} className="mt-2 rounded-lg border border-brand-line px-3 py-1.5 text-[11.5px] font-bold text-brand-ink">{t('interview.practice.saveNote')}</button>
                      </details>
                    </>
                  )}
                </div>
              )}

            </aside>
          </div>

          {/* 控制条：原来外层 px-10 套内层 px-10 再加 gap-12，最少需要约 830px 才排得下，
              且没有任何断点。改成自适应换行 + 紧凑间距。 */}
          <div className="relative z-50 mt-auto flex-shrink-0 px-3 pb-3 lg:px-4 lg:pb-4">
            <div className="brand-float flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-[18px] px-4 py-3 lg:px-6">

              <div className="flex items-center gap-5">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] leading-none text-brand-muted">{t('interview.audioControls')}</span>
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => {
                        if (stt.active) stt.stop()
                        else {
                          if (isPractice) speechBaseForPracticeRef.current = String(practiceController.answer || '').trim()
                          stt.start(isPractice ? practiceController.answer : input)
                        }
                      }}
                      disabled={interactionBusy || Boolean(practiceController?.paused) || Boolean(practiceController && !practiceController.canDraftAnswer)}
                      aria-pressed={stt.active}
                      aria-label={stt.active ? t('chat.micStop') : t('chat.micTitleNo')}
                      title={stt.active ? t('chat.micStop') : t('chat.micTitleNo')}
                      className={`grid h-11 w-11 place-items-center rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${stt.active ? 'bg-brand-danger text-white' : 'border border-brand-line bg-brand-card text-brand-ink hover:border-brand-ink'}`}
                    >
                      {stt.active ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={() => {
                        const next = !ttsEnabled
                        setTtsEnabled(next)
                        if (!next) tts.stop()
                        else window.speechSynthesis?.resume()
                      }}
                      aria-pressed={ttsEnabled}
                      aria-label={ttsEnabled ? t('chat.voiceOn') : t('chat.voiceOff')}
                      title={ttsEnabled ? t('chat.voiceOn') : t('chat.voiceOff')}
                      className={`grid h-11 w-11 place-items-center rounded-xl transition-colors ${ttsEnabled ? 'border border-brand-line bg-brand-card text-brand-ink hover:border-brand-ink' : 'border border-brand-danger/30 bg-brand-danger/[0.08] text-brand-danger'}`}
                    >
                      {ttsEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="hidden h-10 w-px bg-brand-line sm:block" />

                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] leading-none text-brand-muted">{t('interview.videoCamera')}</span>
                  <button
                    onClick={() => onToggleCamera?.()}
                    aria-pressed={isCameraOn}
                    aria-label={isCameraOn ? t('interview.videoCamera') : t('interview.cameraOff')}
                    title={isCameraOn ? t('interview.videoCamera') : t('interview.cameraOff')}
                    className={`grid h-11 w-11 place-items-center rounded-xl transition-colors ${isCameraOn ? 'border border-brand-line bg-brand-card text-brand-ink hover:border-brand-ink' : 'border border-brand-danger/30 bg-brand-danger/[0.08] text-brand-danger'}`}
                  >
                    {isCameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* 连接状态读真实的 live.connected；原来是写死的绿点，断线了也显示"稳定" */}
              <div className="hidden flex-col items-center gap-1.5 xl:flex">
                <span className="text-[11px] leading-none text-brand-muted">{t('interview.connectionLabel')}</span>
                <div className="flex items-center gap-2 rounded-full border border-brand-line bg-brand-inset px-3.5 py-1.5">
                  <span className={`h-2 w-2 rounded-full ${liveConnectionOk ? 'bg-brand-success' : 'animate-pulse bg-brand-muted'}`} />
                  <span className="text-[11.5px] font-bold text-brand-ink">
                    {liveConnectionOk ? t('interview.connectionOk') : t('interview.connectionWait')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => {
                    stopInterviewRef.current()
                    window.location.href = '/setup'
                  }}
                  className="rounded-xl border border-brand-line bg-brand-card px-5 py-2.5 text-[12.5px] font-bold text-brand-muted transition-colors hover:border-brand-ink hover:text-brand-ink"
                >
                  {t('interview.exitDirectly', { defaultValue: 'Exit Without Saving' })}
                </button>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('interview-end-request'))}
                  className="rounded-xl bg-brand-danger px-6 py-2.5 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90"
                >
                  {t('interview.leaveRoom', { defaultValue: 'End Session' })}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5">
            {messageItems}
          </div>
          {inputBarSection}
        </>
      )}
    </div>
  )
})

ChatInterface.displayName = 'ChatInterface'
export default ChatInterface
