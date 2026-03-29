import {
  useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect,
  forwardRef, useImperativeHandle,
} from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { getBackendBaseUrl } from '../lib/backendBase'
import {
  Send, Volume2, VolumeX, Loader2, Video, VideoOff,
  Mic, StopCircle, RefreshCw, BrainCircuit, Clock,
  FlaskConical, Users, ClipboardList, Search, FolderOpen,
} from 'lucide-react'

const BACKEND_URL = getBackendBaseUrl()

/* ── Agent display config ─────────────────────────────────────── */

const AGENT_STYLE = {
  opening: { emoji: '👔', color: 'bg-slate-900 dark:bg-white text-white dark:text-slate-900', Icon: BrainCircuit },
  explore: { emoji: '📎', color: 'bg-indigo-600 text-white', Icon: FolderOpen },
  technical: { emoji: '💡', color: 'bg-blue-600 text-white', Icon: FlaskConical },
  behavioral: { emoji: '🤝', color: 'bg-emerald-600 text-white', Icon: Users },
  feedback: { emoji: '📋', color: 'bg-primary-600 text-white', Icon: ClipboardList },
  analyzer: { emoji: '🔍', color: 'bg-slate-500 text-white', Icon: Search },
}

/* ── Tiny helpers ─────────────────────────────────────────────── */

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 py-2">
      {[0, 150, 300].map(d => (
        <div
          key={d}
          className="w-1.5 h-1.5 bg-slate-900 dark:bg-white rounded-full animate-bounce"
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
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${c.color} shadow-sm mb-3`}>
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
        <div key={i} className={`w-[2.5px] rounded-full ${active ? 'bg-slate-900 dark:bg-white' : 'bg-slate-400 dark:bg-slate-500'}`}
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

function useStreamingTTS(language, enabled) {
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
    
    // --- Precise Anti-Pop Ramp (Synced to startAt) ---
    const fadeTime = 0.020 // 20ms fade-in window
    gainNode.gain.setValueAtTime(0, startAt)
    gainNode.gain.linearRampToValueAtTime(1, startAt + fadeTime)

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
    utter.lang = language === 'Deutsch' ? 'de-DE' : 'en-US'
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
            body: JSON.stringify({ text, language }),
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
          body: JSON.stringify({ text, language }),
          signal,
        })
        if (gen !== playGenRef.current) return

        if (res.status === 429) {
          quotaExhaustedRef.current = true
        } else if (res.ok && res.body) {
          handled = true
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
      } catch (streamErr) {
        if (streamErr.name === 'AbortError') { return }
        console.warn('[TTS-stream] Streaming failed, falling back', streamErr)
      }

      if (!handled && !quotaExhaustedRef.current && gen === playGenRef.current) {
        try {
          const res = await fetch(`${BACKEND_URL}/api/chat/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
            body: JSON.stringify({ text, language }),
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
  }, [language, hasWebAudio, getCtx, scheduleChunk, checkIdle, speakWithBrowserTTS])

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
    r.lang = langRef.current === 'Deutsch' ? 'de-DE' : 'en-US'
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
        body: JSON.stringify({ messages: rows }),
        keepalive: true,
      })
    } catch { /* ignore */ }
  }, [])

  useImperativeHandle(ref, () => ({
    getTranscript: () => messagesRef.current
      .filter((m) => !m.streaming && String(m.content || '').trim())
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content).trim(),
      })),
  }), [])

  const [input, setInput] = useState('')
  const [interimText, setInterimText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [ttsEnabled, setTtsEnabled] = useState(true)
  const [currentAgent, setCurrentAgent] = useState(null)
  const [initError, setInitError] = useState(null)

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
  const initDoneRef = useRef(false)
  const isFirstMsg = useRef(true)
  const openingLatchRef = useRef(true)

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

  const tts = useStreamingTTS(language, ttsEnabled)
  const stt = useSpeechRecognition(
    language,
    useCallback(t => setInput(t), []),
    useCallback(t => setInterimText(t), []),
  )

  const ttsRef = useRef(tts)
  const sttRef = useRef(stt)
  useLayoutEffect(() => {
    ttsRef.current = tts
    sttRef.current = stt
  }, [tts, stt])

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
    if (!position) return

    const controller = new AbortController()
    const trigger = language === 'Deutsch'
      ? t('chat.startTriggerDe')
      : t('chat.startTriggerEn')

    runGraph([{ role: 'user', content: trigger }], /* isSystem */ true, controller.signal)

    return () => controller.abort()   // cancel if StrictMode re-runs or component unmounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position])

  // ── Core: call backend LangGraph via SSE ──────────────────────
  const runGraph = useCallback(async (messageHistory, isSystem = false, signal = null) => {
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    if (!token) return
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
            position,
            jobDescription,
            language,
            duration,
            resumeSnapshot,
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

    try {
      const res = await fetch(`${BACKEND_URL}/api/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messages: messageHistory,
          position,
          jobDescription,
          language,
          duration,
          resumeSnapshot,
          sessionId: needsReset ? 'new' : undefined,
        }),
        signal,
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
            if (signal?.aborted) break sse
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
            setMessages(prev => prev.map(m =>
              m.id === aiId ? { ...m, content: m.content || t('chat.errRetry'), streaming: false } : m
            ))
          }
        }
      }

      if (!hasError || fullText) {
        setMessages(prev => prev.map(m =>
          m.id === aiId ? { ...m, content: sanitizeSquareBrackets(fullText || m.content), streaming: false } : m
        ))
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        // StrictMode cancelled the first call — silently remove the orphan bubble
        setMessages(prev => prev.filter(m => m.id !== aiId))
        setIsStreaming(false)
        return
      }
      console.error('[ChatInterface]', err)
      if (deferGateRef.current && openingLatchRef.current) {
        openingLatchRef.current = false
        onInterviewReadyRef.current?.()
      }
      setInitError(t('chat.connErr', { msg: err.message }))
      setMessages(prev => prev.map(m =>
        m.id === aiId ? { ...m, content: t('chat.connFail'), streaming: false } : m
      ))
    } finally {
      setIsStreaming(false)
      setCurrentAgent(null)
      if (!sseDone) {
        setMessages(prev => prev.map(m => m.id === aiId ? { ...m, streaming: false } : m))
      }
    }
  }, [position, jobDescription, language, duration, resumeSnapshot, tts, stt, t])

  // ── Send message ──────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    const trimmed = text?.trim()
    if (!trimmed || isStreaming) return
    if (stt.active) stt.stop()
    tts.stop()
    setInput('')
    setInterimText('')

    const userMsg = { id: Date.now(), role: 'user', content: trimmed }
    const updated = [...messages, userMsg]
    setMessages(updated)

    const history = updated
      .filter(m => m.content)
      .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))

    await runGraph(history, false)
  }, [isStreaming, messages, stt, tts, runGraph])

  /** 录音中为已落稿 + 实时识别；非录音即输入框 */
  const inputDraft = stt.active ? `${input}${interimText}` : input

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (stt.active) stt.stop()
      sendMessage(inputDraft)
    }
  }

  const displayMessages = messages.filter(m => (m.content || m.streaming) && m.agent !== 'feedback')

  const interviewerThinking = isStreaming || Boolean(currentAgent)
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

  const messageItems = (
    <>
      {displayMessages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full min-h-[8rem] gap-3 opacity-50">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-600 to-violet-600 flex items-center justify-center">
            <BrainCircuit className="w-8 h-8 text-white" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{t('chat.preparing')}</p>
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
              <div className={`px-4 py-3 text-[0.8rem] leading-snug tracking-tight shadow-sm ${msg.role === 'user'
                  ? 'bg-slate-900 text-white rounded-2xl rounded-tr-none dark:bg-white dark:text-slate-900 font-bold'
                  : 'bg-white/60 dark:bg-white/10 backdrop-blur-md text-slate-800 dark:text-slate-100 border border-slate-200/50 dark:border-white/10 rounded-2xl rounded-tl-none font-serif'
                }`}>
                {msg.streaming && !msg.content
                  ? <TypingDots />
                  : <div className={`whitespace-pre-wrap ${msg.streaming ? 'typing-cursor' : ''}`}>{sanitizeSquareBrackets(msg.content)}</div>}
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
              <span className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">{t('chat.recording')}</span>
            </div>
          )}

          {isStreaming && (
            <div className="flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {currentAgent ? (agentMap[currentAgent.name]?.label ?? currentAgent.label) : t('chat.analyzing')}
              </span>
            </div>
          )}

          {tts.speaking && !stt.active && (
            <div className="flex items-center gap-3">
              <WaveIcon active />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('chat.ttsPlaying')}</span>
            </div>
          )}
        </div>

        <button
          onClick={() => { setTtsEnabled(v => !v); tts.stop() }}
          className={`group flex items-center gap-2 px-3 py-1 rounded-lg transition-all ${ttsEnabled ? 'text-slate-900 dark:text-white' : 'text-slate-400'
            }`}
        >
          {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          <span className="text-[10px] font-black uppercase tracking-widest">{ttsEnabled ? t('chat.voiceOn') : t('chat.voiceOff')}</span>
        </button>
      </div>

      <div className="flex gap-4 items-end max-w-5xl mx-auto w-full">
        <button
          onClick={() => stt.active ? stt.stop() : stt.start(input)}
          disabled={!stt.supported || isStreaming}
          className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${stt.active
              ? 'bg-red-600 text-white shadow-xl shadow-red-600/20'
              : 'bg-slate-100 dark:bg-slate-900 text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
            } disabled:opacity-50`}
        >
          {stt.active ? <StopCircle className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        <div className="flex-1 relative group">
          <textarea
            value={stt.active ? input + interimText : input}
            onChange={e => {
              const v = e.target.value
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
            disabled={isStreaming}
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
          disabled={!inputDraft.trim() || isStreaming}
          className="flex-shrink-0 w-14 h-14 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl flex items-center justify-center hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-xl shadow-slate-900/10 disabled:opacity-50"
        >
          {isStreaming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </div>

      <p className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
        {stt.supported ? t('chat.hintFull') : t('chat.hintType')}
      </p>
    </div>
  )

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col bg-transparent text-slate-900 dark:text-white ${interviewUiVisible
          ? ''
          : 'absolute inset-0 z-0 opacity-0 pointer-events-none overflow-hidden min-h-0'
        }`}
      aria-hidden={!interviewUiVisible}
    >
      {/* Error banner */}
      {initError && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-100 border-b border-red-200 text-red-800 dark:bg-red-900/40 dark:border-red-700/40 dark:text-red-300 text-xs flex-shrink-0">
          ⚠️ {initError}
          <button
            onClick={() => {
              setInitError(null)
              initDoneRef.current = false
              isFirstMsg.current = true
              setMessages([])
              const controller = new AbortController()
              const trigger = language === 'Deutsch'
                ? t('chat.startTriggerDe')
                : t('chat.startTriggerEn')
              // Restart opening generation. Previously this button only cleared UI state.
              void runGraph([{ role: 'user', content: trigger }], /* isSystem */ true, controller.signal)
            }}
            className="ml-auto flex items-center gap-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> {t('chat.retry')}
          </button>
        </div>
      )}

      {digitalHuman ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-transparent">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row relative">
            {/* Stage 1: AI Interviewer (40% Width) */}
            <main
              className="relative lg:flex-[4] flex-shrink-0 flex flex-col items-center justify-center bg-black overflow-hidden m-4 rounded-[2.5rem] border border-white/5 shadow-2xl"
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
              <div className="absolute top-8 left-8 flex items-center gap-3 pointer-events-none z-20">
                <div className="px-4 py-2 bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.6)]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">{t('interview.digitalZoomLive')}</span>
                </div>
                <div className="px-4 py-2 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/50">
                   {activeAgentLabel}
                </div>
              </div>

              {/* AI Name & Visualizer */}
              <div className="absolute bottom-10 left-10 flex flex-col gap-3 pointer-events-none z-20">
                <div className="flex items-center gap-4">
                  <h3 className="text-3xl font-black text-white uppercase tracking-tighter drop-shadow-2xl font-serif leading-none">{t('interview.digitalHuman')}</h3>
                  {tts.speaking && (
                    <div className="flex items-end gap-1.5 h-6 bg-primary-600/20 px-3 py-1 rounded-full backdrop-blur-md border border-primary-500/30">
                      {[4, 7, 5, 9, 6].map((h, i) => (
                        <div key={i} className="w-1 rounded-full bg-primary-400 animate-dh-wave" style={{ height: `${h * 2}px`, animationDelay: `${i * 100}ms` }} />
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-primary-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-primary-400 drop-shadow-md">{digitalStateLabel}</span>
                </div>
              </div>
            </main>

            {/* Stage 2: Candidate (User) (40% Width) */}
            <div className="relative lg:flex-[4] flex-shrink-0 flex flex-col items-center justify-center bg-slate-900 overflow-hidden m-4 rounded-[2.5rem] border border-white/5 shadow-2xl group transition-all duration-500">
               {userCameraStream?.getVideoTracks?.()?.length ? (
                  <video
                    ref={userPipVideoRef}
                    className="h-full w-full object-cover"
                    playsInline
                    muted
                    autoPlay
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-4 bg-slate-900 p-12 text-center">
                    <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center border border-white/10 shadow-inner">
                       <VideoOff className="w-8 h-8 text-white/20" />
                    </div>
                    <span className="text-xs font-black text-white/40 uppercase tracking-widest leading-relaxed">Camera Off</span>
                  </div>
                )}
                
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />

                {/* Candidate Label */}
                <div className="absolute top-8 left-8 flex items-center gap-3 pointer-events-none z-20">
                  <div className="px-4 py-2 bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">{t('interview.candidateLabel', { defaultValue: 'Candidate' })}</span>
                  </div>
                </div>

                <div className="absolute bottom-10 left-10 flex flex-col gap-2 pointer-events-none z-20">
                   <h3 className="text-3xl font-black text-white uppercase tracking-tighter drop-shadow-2xl font-serif leading-none">{t('chat.you')}</h3>
                   <div className="flex items-center gap-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 drop-shadow-md">On-Screen</span>
                   </div>
                </div>
            </div>

            {/* Chat Sidebar: Meeting Transcript (20% Width) */}
            <aside className="w-full lg:flex-[2] flex flex-col bg-transparent lg:my-4 lg:mr-4 rounded-[2.5rem] border border-slate-200/50 dark:border-white/5 overflow-hidden transition-all duration-300 relative">
              {/* Glass background for sidebar */}
              <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/40 backdrop-blur-3xl -z-10" />
              
              <div className="flex-shrink-0 px-6 py-5 border-b border-slate-200/50 dark:border-white/10 flex flex-col gap-4 relative z-20">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Transcript</h3>
                  {/* Timer: Compact style */}
                  <div className="flex items-center gap-2 px-3 py-1 bg-white/50 dark:bg-black/40 rounded-xl border border-slate-200/50 dark:border-white/10 shadow-sm transition-all animate-in slide-in-from-top duration-500">
                    <Clock className={`w-3.5 h-3.5 ${timerStatus === 'critical' ? 'text-red-500 animate-pulse' : timerStatus === 'warning' ? 'text-amber-500' : 'text-primary-500'}`} />
                    <span className={`text-sm font-mono font-bold tabular-nums tracking-tight ${timerStatus === 'critical' ? 'text-red-600 dark:text-red-400' : timerStatus === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                      {timerDisplay}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scroll-smooth scrollbar-hide">
                {messageItems}
              </div>

              <div className="p-6 border-t border-slate-200/50 dark:border-white/10 space-y-4">
                <div className="flex gap-3 items-end">
                  <div className="flex-1 relative">
                    <textarea
                      value={stt.active ? input + interimText : input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="..."
                      className="w-full bg-white dark:bg-black/40 text-slate-900 dark:text-white text-[0.85rem] font-medium rounded-2xl px-4 py-3 min-h-[48px] max-h-32 resize-none focus:outline-none border border-slate-200 dark:border-white/5 transition-all disabled:opacity-50"
                      disabled={isStreaming}
                    />
                  </div>
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || isStreaming}
                    className="w-12 h-12 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[1.5rem] flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-xl"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </aside>
          </div>

          <div className="h-24 px-10 flex-shrink-0 relative z-50 mt-auto">
            <div className="h-full flex items-center justify-between px-10 bg-white/80 dark:bg-slate-900/40 backdrop-blur-3xl rounded-t-[3.5rem] border-t border-x border-slate-200/50 dark:border-white/10 shadow-[0_-15px_60px_rgba(0,0,0,0.15)] dark:shadow-[0_-20px_50px_rgba(0,0,0,0.4)]">
              <div className="flex items-center gap-12">
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest leading-none">Audio Controls</span>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => stt.active ? stt.stop() : stt.start(input)}
                      className={`w-12 h-12 rounded-[1.25rem] flex items-center justify-center transition-all ${stt.active ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] scale-110' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/10 border border-transparent'}`}
                    >
                      {stt.active ? <Mic className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                    </button>
                    <button
                      onClick={() => {
                        const next = !ttsEnabled
                        setTtsEnabled(next)
                        if (!next) tts.stop()
                        else window.speechSynthesis?.resume()
                      }}
                      className={`w-12 h-12 rounded-[1.25rem] flex items-center justify-center transition-all ${ttsEnabled ? 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/80' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}
                    >
                      {ttsEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                    </button>
                  </div>
                </div>

                <div className="w-px h-10 bg-slate-200 dark:bg-white/10" />

                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest leading-none">Video Camera</span>
                  <button
                    onClick={() => onToggleCamera?.()}
                    className={`w-12 h-12 rounded-[1.25rem] flex items-center justify-center transition-all ${isCameraOn ? 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/80' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}
                  >
                    {isCameraOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                  </button>
                </div>
              </div>

              <div className="hidden xl:flex items-center gap-10">
                <div className="flex flex-col items-center gap-2">
                   <span className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest leading-none">Interview Status</span>
                   <div className="px-5 py-2 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full border border-emerald-500/10 flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Connection: Stable</span>
                   </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => window.location.href = '/setup'}
                  className="px-8 py-3.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all border border-slate-200 dark:border-white/10"
                >
                  {t('interview.exitDirectly', { defaultValue: 'Exit Without Saving' })}
                </button>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('interview-end-request'))}
                  className="px-10 py-3.5 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-2xl shadow-red-600/30 font-bold"
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
