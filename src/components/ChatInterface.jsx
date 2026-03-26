import {
  useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect,
  forwardRef, useImperativeHandle,
} from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { getBackendBaseUrl } from '../lib/backendBase'
import {
  Send, Volume2, VolumeX, Loader2,
  Mic, StopCircle, RefreshCw, BrainCircuit,
  FlaskConical, Users, ClipboardList, Search, FolderOpen,
} from 'lucide-react'

const BACKEND_URL = getBackendBaseUrl()

/* ── Agent display config ─────────────────────────────────────── */

const AGENT_STYLE = {
  opening:    { emoji: '👔', color: 'from-primary-600 to-violet-600',  Icon: BrainCircuit },
  explore:    { emoji: '📎', color: 'from-indigo-600 to-violet-500',   Icon: FolderOpen },
  technical:  { emoji: '💡', color: 'from-blue-600   to-cyan-500',     Icon: FlaskConical },
  behavioral: { emoji: '🤝', color: 'from-emerald-600 to-teal-500',    Icon: Users },
  feedback:   { emoji: '📋', color: 'from-amber-500  to-orange-500',   Icon: ClipboardList },
  analyzer:   { emoji: '🔍', color: 'from-slate-600  to-slate-500',    Icon: Search },
}

/* ── Tiny helpers ─────────────────────────────────────────────── */

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-0.5">
      {[0, 150, 300].map(d => (
        <div key={d} className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce"
          style={{ animationDelay: `${d}ms` }} />
      ))}
    </div>
  )
}

function AgentBadge({ name, streaming, agentMap }) {
  const c = agentMap[name] || agentMap.opening
  const { Icon } = c
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
      bg-gradient-to-r ${c.color} text-white shadow-md mb-1.5`}>
      <Icon className="w-3 h-3" />
      {c.emoji} {c.label}
      {streaming && <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse ml-0.5" />}
    </div>
  )
}

function WaveIcon({ active }) {
  return (
    <div className={`flex items-end gap-[2px] h-4 transition-opacity ${active ? 'opacity-100' : 'opacity-25'}`}>
      {[3, 6, 4, 7, 5, 3, 6].map((h, i) => (
        <div key={i} className={`w-[3px] rounded-full ${active ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-slate-400 dark:bg-slate-500'}`}
          style={{ height: `${h * 2}px`,
            animation: active ? `wavebar 0.5s ${i * 0.07}s infinite alternate ease-in-out` : 'none' }} />
      ))}
      <style>{`@keyframes wavebar{from{height:4px}to{height:14px}}`}</style>
    </div>
  )
}

/* ── Gemini TTS hook (with browser-TTS fallback) ──────────────── */

/** Chrome 等浏览器常在首次调用时 voices 仍为空，需等 voiceschanged */
function waitForSpeechVoices(timeoutMs = 2500) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return Promise.resolve()
  if (window.speechSynthesis.getVoices().length > 0) return Promise.resolve()
  return new Promise((resolve) => {
    const synth = window.speechSynthesis
    const done = () => {
      synth.removeEventListener('voiceschanged', done)
      resolve()
    }
    synth.addEventListener('voiceschanged', done)
    setTimeout(() => {
      synth.removeEventListener('voiceschanged', done)
      resolve()
    }, timeoutMs)
  })
}

function useGeminiTTS(language, enabled) {
  const audioRef   = useRef(null)   // current HTMLAudioElement
  const enabledRef = useRef(enabled)
  /** 每次 stop() +1；异步 TTS 在 play 前比对，避免已离开页面仍开播 */
  const playGenRef = useRef(0)
  const [speaking, setSpeaking] = useState(false)
  const langCode   = language === 'Deutsch' ? 'de-DE' : 'en-US'

  useLayoutEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

  /** Stop any currently playing audio immediately */
  const stop = useCallback(() => {
    playGenRef.current += 1
    if (audioRef.current) {
      try {
        const a = audioRef.current
        a.pause()
        a.currentTime = 0
        a.src = ''
        a.removeAttribute('src')
        a.load()
      } catch { /* ignore */ }
      audioRef.current = null
    }
    try {
      window.speechSynthesis?.cancel()
    } catch { /* ignore */ }
    setSpeaking(false)
  }, [])

  /**
   * Speak `text` using Gemini neural TTS.
   * Falls back to browser SpeechSynthesis on API error.
   */
  const speak = useCallback(async (text, authToken) => {
    if (!enabledRef.current || !text?.trim()) return
    stop()
    const genAfterStop = playGenRef.current

    setSpeaking(true)

    // ── Try Gemini TTS first ─────────────────────────────────
    try {
      const res = await fetch(`${BACKEND_URL}/api/chat/tts`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body:    JSON.stringify({ text, language }),
      })

      if (!enabledRef.current || playGenRef.current !== genAfterStop) {
        setSpeaking(false)
        return
      }

      if (!res.ok) {
        let detail = ''
        try {
          const bodyText = await res.text()
          try {
            const j = JSON.parse(bodyText)
            detail = String(j.details || j.hint || j.error || bodyText)
          } catch {
            detail = bodyText
          }
        } catch { /* ignore */ }
        const msg = detail ? detail.slice(0, 280) : ''
        throw new Error(`TTS HTTP ${res.status}${msg ? ` — ${msg}` : ''}`)
      }

      const blob  = await res.blob()
      if (!enabledRef.current || playGenRef.current !== genAfterStop) {
        setSpeaking(false)
        return
      }

      const url   = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio

      audio.onended = audio.onerror = () => {
        URL.revokeObjectURL(url)
        audioRef.current = null
        setSpeaking(false)
      }

      try {
        // 用户可能在 await fetch 期间关掉语音或离开页面
        if (!enabledRef.current || playGenRef.current !== genAfterStop) {
          URL.revokeObjectURL(url)
          audioRef.current = null
          setSpeaking(false)
          return
        }
        setSpeaking(true)
        audio.volume = 1
        await audio.play()
        if (playGenRef.current !== genAfterStop) {
          audio.onended = audio.onerror = null
          URL.revokeObjectURL(url)
          try {
            audio.pause()
            audio.src = ''
          } catch { /* ignore */ }
          if (audioRef.current === audio) audioRef.current = null
          setSpeaking(false)
          return
        }
        return
      } catch (playErr) {
        URL.revokeObjectURL(url)
        audioRef.current = null
        console.warn('[TTS] Audio play blocked or failed, trying browser TTS:', playErr?.message)
      }
    } catch (err) {
      console.warn('[TTS] Gemini TTS failed, falling back to browser TTS:', err.message)
    }

    if (!enabledRef.current || playGenRef.current !== genAfterStop) {
      setSpeaking(false)
      return
    }

    // ── Browser SpeechSynthesis fallback ────────────────────
    try {
      const synth = window.speechSynthesis
      synth.cancel()
      await waitForSpeechVoices()

      if (playGenRef.current !== genAfterStop) {
        setSpeaking(false)
        return
      }

      const voices  = synth.getVoices()
      const pre     = langCode.split('-')[0]
      // Prefer OS neural / premium voices; slightly slower rate reads less "robotic"
      const voice   =
        voices.find(v => v.lang.startsWith(langCode) && /neural|premium|natural|online natural/i.test(v.name)) ||
        voices.find(v => v.lang.startsWith(langCode) && /microsoft.*(hedda|katja|conrad|ingrid|stefan)/i.test(v.name)) ||
        voices.find(v => v.lang.startsWith(langCode) && /google|samantha|daniel|karen|moira|fiona|serena/i.test(v.name)) ||
        voices.find(v => v.lang.startsWith(langCode) && /natural|online/i.test(v.name)) ||
        voices.find(v => v.lang.startsWith(langCode) && /google/i.test(v.name))         ||
        voices.find(v => v.lang.startsWith(langCode))                                    ||
        voices.find(v => v.lang.startsWith(pre))                                         ||
        null

      const utt     = new SpeechSynthesisUtterance(text)
      utt.lang      = langCode
      utt.rate      = langCode.startsWith('de') ? 0.9 : 0.92
      utt.pitch     = 0.98
      if (voice) utt.voice = voice

      utt.onend = utt.onerror = () => setSpeaking(false)
      if (playGenRef.current !== genAfterStop) {
        setSpeaking(false)
        return
      }
      setSpeaking(true)
      synth.speak(utt)
    } catch {
      setSpeaking(false)
    }
  }, [language, langCode, stop])

  /**
   * 神经 TTS 先拉取并等到真正开始出声（playing / utterance.onstart），再让调用方展示文字，避免「字先出、声晚到」。
   */
  const speakWhenPlaying = useCallback(async (text, authToken) => {
    if (!text?.trim() || !enabledRef.current) return
    stop()
    const genAfterStop = playGenRef.current
    setSpeaking(true)

    try {
      const res = await fetch(`${BACKEND_URL}/api/chat/tts`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body:    JSON.stringify({ text, language }),
      })
      if (playGenRef.current !== genAfterStop) {
        setSpeaking(false)
        return
      }
      if (!res.ok) throw new Error(`TTS HTTP ${res.status}`)
      const blob = await res.blob()
      if (playGenRef.current !== genAfterStop) {
        setSpeaking(false)
        return
      }
      const objectUrl = URL.createObjectURL(blob)
      const audio = new Audio(objectUrl)
      audioRef.current = audio
      audio.volume = 1
      const revokeAndClear = () => {
        URL.revokeObjectURL(objectUrl)
        if (audioRef.current === audio) audioRef.current = null
        setSpeaking(false)
      }
      audio.onended = revokeAndClear
      audio.onerror = revokeAndClear

      await new Promise((resolve, reject) => {
        const onPlaying = () => {
          audio.removeEventListener('playing', onPlaying)
          resolve()
        }
        audio.addEventListener('playing', onPlaying, { once: true })
        audio.play().catch((err) => {
          audio.removeEventListener('playing', onPlaying)
          revokeAndClear()
          reject(err)
        })
      })
      if (playGenRef.current !== genAfterStop) {
        revokeAndClear()
      }
    } catch (err) {
      if (playGenRef.current !== genAfterStop) {
        setSpeaking(false)
        return
      }
      try {
        const synth = window.speechSynthesis
        synth.cancel()
        await waitForSpeechVoices()
        if (playGenRef.current !== genAfterStop) {
          setSpeaking(false)
          return
        }
        const voices = synth.getVoices()
        const pre = langCode.split('-')[0]
        const voice =
          voices.find(v => v.lang.startsWith(langCode) && /neural|premium|natural|online natural/i.test(v.name)) ||
          voices.find(v => v.lang.startsWith(langCode) && /microsoft.*(hedda|katja|conrad|ingrid|stefan)/i.test(v.name)) ||
          voices.find(v => v.lang.startsWith(langCode) && /google|samantha|daniel|karen|moira|fiona|serena/i.test(v.name)) ||
          voices.find(v => v.lang.startsWith(langCode) && /natural|online/i.test(v.name)) ||
          voices.find(v => v.lang.startsWith(langCode) && /google/i.test(v.name)) ||
          voices.find(v => v.lang.startsWith(langCode)) ||
          voices.find(v => v.lang.startsWith(pre)) ||
          null

        const utt = new SpeechSynthesisUtterance(text)
        utt.lang = langCode
        utt.rate = langCode.startsWith('de') ? 0.9 : 0.92
        utt.pitch = 0.98
        if (voice) utt.voice = voice

        await new Promise((resolve, reject) => {
          utt.onstart = () => resolve()
          utt.onend = utt.onerror = () => setSpeaking(false)
          if (playGenRef.current !== genAfterStop) {
            setSpeaking(false)
            reject(new Error('cancelled'))
            return
          }
          setSpeaking(true)
          synth.speak(utt)
        })
      } catch {
        setSpeaking(false)
        throw err
      }
    }
  }, [language, langCode, stop])

  return { speak, stop, speaking, speakWhenPlaying }
}

/* ── Web Speech API (STT) ────────────────────────────────────── */

function useSpeechRecognition(language, onFinal, onInterim) {
  const recRef       = useRef(null)
  const accRef       = useRef('')
  const interimRef   = useRef('')
  /** Sync ref — false immediately on stop, before React re-renders.
   *  Fixes: onChange still sees stt.active===true for one frame and ignores typing. */
  const listeningRef = useRef(false)
  const [active, setActive] = useState(false)
  const supported = !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  const flushInterimToFinal = useCallback(() => {
    const tail = interimRef.current?.trim()
    interimRef.current = ''
    if (tail) {
      accRef.current = `${accRef.current}${accRef.current && !accRef.current.endsWith(' ') ? ' ' : ''}${tail}`
      onFinal(accRef.current)
    }
  }, [onFinal])

  const start = useCallback((existing = '') => {
    if (!supported) return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const r  = new SR()
    r.continuous = true; r.interimResults = true
    r.lang       = language === 'Deutsch' ? 'de-DE' : 'en-US'
    accRef.current = existing
    interimRef.current = ''
    listeningRef.current = true

    r.onresult = e => {
      if (!listeningRef.current) return
      let fin = '', int = ''
      for (let i = e.resultIndex; i < e.results.length; i++)
        e.results[i].isFinal ? (fin += e.results[i][0].transcript + ' ') : (int += e.results[i][0].transcript)
      if (fin) { accRef.current += fin; onFinal(accRef.current) }
      interimRef.current = int
      onInterim(int)
    }
    const onDone = () => {
      flushInterimToFinal()
      onInterim('')
      interimRef.current = ''
      listeningRef.current = false
      setActive(false)
    }
    r.onerror = onDone
    r.onend   = onDone
    recRef.current = r
    r.start()
    setActive(true)
  }, [language, onFinal, onInterim, flushInterimToFinal, supported])

  const stop = useCallback(() => {
    /** 必须先置 false，避免 stop() 之后浏览器仍投递 onresult，把已发送的文本写回输入框 */
    listeningRef.current = false
    flushInterimToFinal()
    recRef.current?.stop()
    onInterim('')
    interimRef.current = ''
    setActive(false)
  }, [onInterim, flushInterimToFinal])

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
}, ref) {
  const { t, i18n } = useTranslation()
  const agentMap = useMemo(
    () => ({
      opening:    { ...AGENT_STYLE.opening,    label: t('chat.agent.opening') },
      explore:    { ...AGENT_STYLE.explore,    label: t('chat.agent.explore') },
      technical:  { ...AGENT_STYLE.technical,  label: t('chat.agent.technical') },
      behavioral: { ...AGENT_STYLE.behavioral, label: t('chat.agent.behavioral') },
      feedback:   { ...AGENT_STYLE.feedback,   label: t('chat.agent.feedback') },
      analyzer:   { ...AGENT_STYLE.analyzer,   label: t('chat.agent.analyzer') },
    }),
    [t, i18n.language],
  )

  const resumeSnapshot = useMemo(
    () => (typeof resumeContext === 'string' ? resumeContext.trim().slice(0, 50_000) : ''),
    [resumeContext],
  )

  const [messages,    setMessages]    = useState([])
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

  const [input,       setInput]       = useState('')
  const [interimText, setInterimText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [ttsEnabled,  setTtsEnabled]  = useState(true)
  const [currentAgent, setCurrentAgent] = useState(null)
  const [initError,   setInitError]   = useState(null)

  const messagesEndRef = useRef(null)
  const userPipVideoRef = useRef(null)

  useEffect(() => {
    const el = userPipVideoRef.current
    if (!el) return
    const stream = userCameraStream && userCameraStream.getVideoTracks?.().length ? userCameraStream : null
    el.srcObject = stream || null
    if (stream) {
      el.play().catch(() => {})
    }
  }, [userCameraStream])
  // ── BUGFIX: useRef instead of useState prevents React StrictMode
  //   double-invocation from triggering the opening twice.
  //   React 18 Strict Mode runs effect cleanup + re-setup, but ref.current
  //   is preserved between those two cycles (state is restored).
  const initDoneRef    = useRef(false)
  const isFirstMsg     = useRef(true)
  const openingLatchRef = useRef(true)

  useLayoutEffect(() => {
    openingLatchRef.current = true
  }, [position])
  const deferGateRef     = useRef(deferFirstAudioGate)
  const onInterviewReadyRef = useRef(onInterviewUiReady)
  const ttsEnabledRef    = useRef(ttsEnabled)

  useLayoutEffect(() => {
    deferGateRef.current = deferFirstAudioGate
  }, [deferFirstAudioGate])
  useLayoutEffect(() => {
    onInterviewReadyRef.current = onInterviewUiReady
  }, [onInterviewUiReady])
  useLayoutEffect(() => {
    ttsEnabledRef.current = ttsEnabled
  }, [ttsEnabled])

  const tts = useGeminiTTS(language, ttsEnabled)
  const stt = useSpeechRecognition(
    language,
    useCallback(t => setInput(t), []),
    useCallback(t => setInterimText(t), []),
  )

  const ttsStopRef = useRef(tts.stop)
  const sttRef     = useRef(stt)
  useLayoutEffect(() => {
    ttsStopRef.current = tts.stop
    sttRef.current     = stt
  }, [tts, stt])

  // ── 离开面试页：立刻停神经语音、浏览器朗读与麦克风（须用 ref，避免 effect 闭包拿到旧的 stop）──
  useEffect(() => {
    return () => {
      ttsStopRef.current()
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
    const trigger    = language === 'Deutsch'
      ? t('chat.startTriggerDe')
      : t('chat.startTriggerEn')

    runGraph([{ role: 'user', content: trigger }], /* isSystem */ true, controller.signal)

    return () => controller.abort()   // cancel if StrictMode re-runs or component unmounts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position])

  // ── Core: call backend LangGraph via SSE ──────────────────────
  const runGraph = useCallback(async (messageHistory, isSystem = false, signal = null) => {
    const session  = await supabase.auth.getSession()
    const token    = session.data.session?.access_token
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
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body:    JSON.stringify({
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

    let fullText = ''   // accumulate for TTS
    let sseDoneInfo = null
    let lastAgentName = null  // track which agent is responding

    try {
      const res = await fetch(`${BACKEND_URL}/api/chat/message`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          messages:      messageHistory,
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

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let   buf     = ''
      let   streamHadError = false

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
            fullText += evt.content
            if (!deferAssistantText) {
              setMessages(prev => prev.map(m =>
                m.id === aiId ? { ...m, content: m.content + evt.content } : m
              ))
            }
          }

          if (evt.type === 'done') {
            if (signal?.aborted) break sse
            const deferOpen = deferGateRef.current && openingLatchRef.current
            if (deferOpen) openingLatchRef.current = false
            sseDoneInfo = { fullText, deferOpen }
            break sse
          }

          if (evt.type === 'error') {
            streamHadError = true
            setMessages(prev => prev.map(m =>
              m.id === aiId ? { ...m, content: m.content || t('chat.errRetry'), streaming: false } : m
            ))
          }
        }
      }

      // 流异常结束未收到 done 时，仍尽量把已缓冲正文与语音对齐（已 error 落屏则不覆盖）
      if (!sseDoneInfo && fullText.trim() && !streamHadError) {
        sseDoneInfo = { fullText, deferOpen: false }
      }

      if (sseDoneInfo) {
        const { fullText: ft, deferOpen } = sseDoneInfo
        const body = String(ft || '')

        // For feedback agent: TTS only the closing remark before '---', not the report
        let ttsBody = body
        if (lastAgentName === 'feedback') {
          const sepIdx = body.search(/\n---\n|^---$/m)
          ttsBody = sepIdx !== -1 ? body.slice(0, sepIdx).trim() : ''
        }

        const wantSpeak = ttsEnabledRef.current && ttsBody.trim()
        if (wantSpeak && deferAssistantText) {
          try {
            await tts.speakWhenPlaying(ttsBody, token)
          } catch (e) {
            console.warn('[TTS] speakWhenPlaying failed', e)
          }
        }
        setMessages(prev => prev.map(m =>
          m.id === aiId ? { ...m, content: body, streaming: false } : m
        ))
        if (wantSpeak && !deferAssistantText) {
          tts.speak(ttsBody, token)
        }
        if (deferOpen) {
          onInterviewReadyRef.current?.()
        }
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
      if (!sseDoneInfo) {
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
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && !digitalHuman && (
              <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${cfg.color} flex items-center justify-center flex-shrink-0 mt-5 shadow-lg`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
            )}

            <div className={`flex flex-col gap-0.5 ${digitalHuman ? 'max-w-[min(100%,36rem)]' : 'max-w-[78%]'} ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              {msg.role === 'assistant' && msg.agent && (
                <AgentBadge name={msg.agent} streaming={msg.streaming} agentMap={agentMap} />
              )}

              <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-tr-sm shadow-lg shadow-primary-900/25 border border-primary-500/20'
                  : 'bg-white text-slate-800 rounded-tl-sm border border-slate-200 shadow-md shadow-slate-900/5 dark:bg-slate-800/95 dark:text-slate-100 dark:border-slate-600/50 dark:shadow-black/20 dark:ring-1 dark:ring-white/[0.04]'
              }`}>
                {msg.streaming && !msg.content
                  ? <TypingDots />
                  : <p className={`whitespace-pre-wrap ${msg.streaming ? 'typing-cursor' : ''}`}>{msg.content}</p>}
              </div>
            </div>

            {msg.role === 'user' && !digitalHuman && (
              <div className="w-9 h-9 rounded-full bg-slate-300 text-slate-800 dark:bg-slate-600 dark:text-white flex items-center justify-center flex-shrink-0 mt-1 text-xs font-bold">
                {t('chat.you')}
              </div>
            )}
          </div>
        )
      })}

      <div ref={messagesEndRef} />
    </>
  )

  const inputBarSection = (
    <div className="relative z-[1] flex-shrink-0 border-t border-slate-200/90 bg-white/95 backdrop-blur-md px-4 py-3 space-y-2 shadow-[0_-8px_32px_-8px_rgba(15,23,42,0.12)] dark:border-slate-800/80 dark:bg-slate-900/95 dark:shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.35)]">

      {/* Status row */}
      <div className="flex items-center gap-3 min-h-[20px]">

        {stt.active && (
          <div className="flex items-center gap-2">
            <div className="relative w-3 h-3">
              <span className="absolute inset-0 rounded-full bg-red-500 opacity-75 animate-ping" />
              <span className="w-3 h-3 rounded-full bg-red-500 block" />
            </div>
            <span className="text-xs text-red-600 dark:text-red-400 font-semibold">{t('chat.recording')}</span>
            {interimText && (
              <span className="text-xs text-slate-500 dark:text-slate-500 italic truncate max-w-[180px]">
                &quot;{interimText}&quot;
              </span>
            )}
          </div>
        )}

        {isStreaming && currentAgent && currentAgent.name !== 'feedback' && !stt.active && (
          <div className="flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            {agentMap[currentAgent.name]?.emoji} {agentMap[currentAgent.name]?.label ?? currentAgent.label}
          </div>
        )}

        {isStreaming && !currentAgent && !stt.active && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-500">
            <Search className="w-3 h-3 animate-pulse" />
            {t('chat.analyzing')}
          </div>
        )}

        {tts.speaking && !stt.active && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <WaveIcon active />
            <span>{t('chat.ttsPlaying')}</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => { setTtsEnabled(v => !v); tts.stop() }}
          title={ttsEnabled ? t('chat.voiceOn') : t('chat.voiceOff')}
          className={`ml-auto flex shrink-0 items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
            ttsEnabled
              ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-400'
              : 'border-slate-400 bg-slate-100 text-slate-700 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-800 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-800'
          }`}
        >
          {ttsEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
          {ttsEnabled ? t('chat.voiceOn') : t('chat.voiceOff')}
        </button>
      </div>

      <div className="flex gap-2 items-end">
        <button
          onClick={() => stt.active ? stt.stop() : stt.start(input)}
          disabled={!stt.supported || isStreaming}
          title={!stt.supported ? t('chat.micTitleNo') : stt.active ? t('chat.micStop') : t('chat.micStart')}
          className={`relative flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
            stt.active
              ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-900/50'
              : stt.supported && !isStreaming
                ? 'bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600'
          }`}
        >
          {stt.active && (
            <span className="absolute inset-0 rounded-xl bg-red-500 opacity-50 animate-ping" />
          )}
          {stt.active
            ? <StopCircle className="w-5 h-5 text-white relative z-10" />
            : <Mic className="w-5 h-5 relative z-10" />
          }
        </button>

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
          rows={2}
          disabled={isStreaming}
          className={`flex-1 bg-white dark:bg-slate-800 border text-slate-900 placeholder-slate-400 dark:text-slate-100 dark:placeholder-slate-500 text-sm
            rounded-xl px-4 py-2.5 resize-none focus:outline-none focus:ring-1 transition-colors
            disabled:opacity-50 ${
            stt.active
              ? 'border-red-500/50 focus:ring-red-500/30'
              : 'border-slate-300 focus:border-primary-500 focus:ring-primary-500 dark:border-slate-700'
          }`}
        />

        <button
          onClick={() => {
            const text = stt.active ? `${input}${interimText}` : input
            if (stt.active) stt.stop()
            sendMessage(text)
          }}
          disabled={!inputDraft.trim() || isStreaming}
          className="flex-shrink-0 w-11 h-11 bg-primary-600 rounded-xl flex items-center justify-center
            hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg"
        >
          {isStreaming
            ? <Loader2 className="w-4 h-4 text-white animate-spin" />
            : <Send className="w-4 h-4 text-white" />
          }
        </button>
      </div>

      <p className="text-center text-xs text-slate-500 dark:text-slate-600">
        {stt.supported ? t('chat.hintFull') : t('chat.hintType')}
      </p>
    </div>
  )

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white ${
        interviewUiVisible
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
              isFirstMsg.current  = true
              setMessages([])
            }}
            className="ml-auto flex items-center gap-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> {t('chat.retry')}
          </button>
        </div>
      )}

      {digitalHuman ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
            {/* Zoom 主画面：专业 HR 形象 */}
            <aside
              className="flex flex-col w-full flex-shrink-0 overflow-hidden border-b border-slate-200 bg-slate-950 dark:border-slate-800 lg:w-[min(100%,300px)] xl:w-[min(100%,336px)] lg:min-h-0 lg:border-b-0 lg:border-r lg:self-stretch h-[min(52vh,380px)] lg:h-auto"
              aria-label={t('interview.digitalHuman')}
            >
              {/* 上半部分：面试官画面 */}
              <div className="relative flex-[3] min-h-0 overflow-hidden">
                <img
                  src={HR_PORTRAIT_SRC}
                  alt=""
                  className={`absolute inset-0 h-full w-full object-cover object-[center_18%] transition-transform duration-700 ${tts.speaking ? 'animate-dh-breathe' : ''}`}
                  decoding="async"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/25" />

                <div className="absolute left-0 right-0 top-0 flex items-center justify-between gap-2 border-b border-white/10 bg-black/40 px-3 py-2 backdrop-blur-md">
                  <span className="truncate text-left text-[11px] font-semibold text-white/95 sm:text-xs">
                    {t('interview.digitalZoomTitle')}
                    <span className="mx-1.5 text-white/40">·</span>
                    <span className="font-medium text-white/80">{position}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-200">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                    {t('interview.digitalZoomLive')}
                  </span>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3">
                  <p className="text-base font-black tracking-tight text-white drop-shadow-md sm:text-lg">{t('interview.digitalHuman')}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    {tts.speaking && (
                      <span className="inline-flex h-5 items-end gap-0.5 rounded-md bg-emerald-500/25 px-1.5 py-0.5">
                        {[4, 7, 5, 9, 6].map((h, i) => (
                          <span
                            key={i}
                            className="w-0.5 rounded-full bg-emerald-400 animate-dh-wave"
                            style={{ height: `${h}px`, animationDelay: `${i * 80}ms` }}
                          />
                        ))}
                      </span>
                    )}
                    <p className="text-xs text-white/85">{digitalStateLabel}</p>
                  </div>
                </div>
              </div>

              {/* 下半部分：我的画面 */}
              <div className="relative flex-[2] min-h-0 overflow-hidden border-t border-white/10 bg-slate-900">
                {userCameraStream?.getVideoTracks?.()?.length ? (
                  <video
                    ref={userPipVideoRef}
                    className="h-full w-full object-cover"
                    playsInline
                    muted
                    autoPlay
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-slate-700 to-slate-900 px-3">
                    <span className="text-sm font-bold text-white">{t('chat.you')}</span>
                    <span className="text-center text-xs leading-tight text-white/55">{t('interview.digitalYouPip')}</span>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-semibold text-white/80 backdrop-blur-sm">
                  {t('chat.you')}
                </div>
              </div>
            </aside>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-slate-50 dark:bg-slate-950">
              <div className="flex-shrink-0 border-b border-slate-200/90 bg-white/95 px-3 py-2 backdrop-blur-sm dark:border-slate-800/90 dark:bg-slate-900/95">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{t('interview.digitalChatTitle')}</span>
              </div>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4">
                {messageItems}
              </div>
            </div>
          </div>
          {inputBarSection}
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
