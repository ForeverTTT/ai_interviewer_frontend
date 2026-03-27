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
  const audioRef = useRef(null)   // current HTMLAudioElement
  const enabledRef = useRef(enabled)
  /** 每次 stop() +1；异步 TTS 在 play 前比对，避免已离开页面仍开播 */
  const playGenRef = useRef(0)
  const [speaking, setSpeaking] = useState(false)
  const langCode = language === 'Deutsch' ? 'de-DE' : 'en-US'

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
      window.speechSynthesis?.resume() // Force unblock
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ text, language }),
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

      const blob = await res.blob()
      if (!enabledRef.current || playGenRef.current !== genAfterStop) {
        setSpeaking(false)
        return
      }

      const url = URL.createObjectURL(blob)
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

      const voices = synth.getVoices()
      const pre = langCode.split('-')[0]
      // Prefer OS neural / premium voices; slightly slower rate reads less "robotic"
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

      utt.onend = utt.onerror = () => setSpeaking(false)
      if (playGenRef.current !== genAfterStop) {
        setSpeaking(false)
        return
      }
      setSpeaking(true)
      window.speechSynthesis?.resume() // Safety wake
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ text, language }),
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
        // Safety timeout: if it doesn't start playing in 5 seconds, proceed anyway
        const tmr = setTimeout(() => {
          audio.removeEventListener('playing', onPlaying)
          resolve()
        }, 5000)

        audio.addEventListener('playing', onPlaying, { once: true })
        audio.play().catch((err) => {
          clearTimeout(tmr)
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
  const recRef = useRef(null)
  const accRef = useRef('')
  const interimRef = useRef('')
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
    const r = new SR()
    r.continuous = true; r.interimResults = true
    r.lang = language === 'Deutsch' ? 'de-DE' : 'en-US'
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
    r.onerror = (evt) => {
      console.warn('[STT] error:', evt.error, evt.message)
      onDone()
    }
    r.onend = onDone
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

  const tts = useGeminiTTS(language, ttsEnabled)
  const stt = useSpeechRecognition(
    language,
    useCallback(t => setInput(t), []),
    useCallback(t => setInterimText(t), []),
  )

  const ttsStopRef = useRef(tts.stop)
  const sttRef = useRef(stt)
  useLayoutEffect(() => {
    ttsStopRef.current = tts.stop
    sttRef.current = stt
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

    let fullText = ''   // accumulate for TTS
    let sseDoneInfo = null
    let lastAgentName = null  // track which agent is responding

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
      let streamHadError = false

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
            if (!deferAssistantText) {
              setMessages(prev => prev.map(m =>
                m.id === aiId ? { ...m, content: m.content + chunk } : m
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
        const body = sanitizeSquareBrackets(String(ft || ''))

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
            className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && !digitalHuman && (
              <div className={`w-10 h-10 rounded-2xl ${cfg.color} flex items-center justify-center flex-shrink-0 mt-8 shadow-sm`}>
                <Icon className="w-5 h-5" />
              </div>
            )}

            <div className={`flex flex-col gap-1 ${digitalHuman ? 'max-w-full' : 'max-w-[85%]'} ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              {msg.role === 'assistant' && msg.agent && (
                <AgentBadge name={msg.agent} streaming={msg.streaming} agentMap={agentMap} />
              )}

              <div className={`px-6 py-4 text-sm leading-relaxed tracking-tight ${msg.role === 'user'
                  ? 'bg-slate-900 text-white rounded-[2rem] rounded-tr-none shadow-lg shadow-slate-900/10'
                  : 'bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-100 border border-slate-100 dark:border-slate-800 rounded-[2rem] rounded-tl-none font-serif'
                }`}>
                {msg.streaming && !msg.content
                  ? <TypingDots />
                  : <div className={`whitespace-pre-wrap ${msg.streaming ? 'typing-cursor' : ''}`}>{sanitizeSquareBrackets(msg.content)}</div>}
              </div>
            </div>

            {msg.role === 'user' && !digitalHuman && (
              <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 mt-8 text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700">
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
      className={`flex min-h-0 flex-1 flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white ${interviewUiVisible
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
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-950">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row relative">
            {/* Zoom 主画面：专业 HR 形象 (30% Width) */}
            <main
              className="relative lg:flex-[3] flex-shrink-0 flex flex-col items-center justify-center bg-black overflow-hidden"
              aria-label={t('interview.digitalHuman')}
            >
              <img
                src={HR_PORTRAIT_SRC}
                alt=""
                className={`absolute inset-0 h-full w-full object-cover object-[center_20%] transition-all duration-700 ${tts.speaking ? 'scale-[1.02] opacity-100' : 'opacity-80'}`}
                decoding="async"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40" />

              {/* Status Header */}
              <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-6 pointer-events-none">
                <div className="flex items-center gap-4">
                  <div className="px-4 py-2 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    <span className="text-xs font-black uppercase tracking-widest text-white/90">{t('interview.digitalZoomLive')}</span>
                  </div>
                  <div className="px-4 py-2 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 text-xs font-bold text-white/70">
                    {t('interview.digitalZoomTitle')}: {position}
                  </div>
                </div>
              </div>

              {/* AI Name Label - Lowered slightly */}
              <div className="absolute bottom-4 left-8 flex flex-col gap-2 pointer-events-none z-20">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight drop-shadow-lg">{t('interview.digitalHuman')}</h3>
                  {tts.speaking && (
                    <div className="flex items-end gap-1 h-6">
                      {[4, 7, 5, 9, 6, 8, 4].map((h, i) => (
                        <div key={i} className="w-1 rounded-full bg-primary-400 animate-dh-wave" style={{ height: `${h * 2}px`, animationDelay: `${i * 100}ms` }} />
                      ))}
                    </div>
                  )}
                </div>
                <div className="px-3 py-1 bg-black/20 backdrop-blur-sm rounded-lg self-start border border-white/5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary-400">{digitalStateLabel}</span>
                </div>
              </div>

              {/* User PiP - Lowered slightly while maintaining clearance */}
              <div className="absolute bottom-24 right-4 w-72 aspect-video rounded-3xl overflow-hidden bg-slate-900 border-2 border-white/20 shadow-2xl group transition-all hover:scale-105 hover:border-white/40">
                {userCameraStream?.getVideoTracks?.()?.length ? (
                  <video
                    ref={userPipVideoRef}
                    className="h-full w-full object-cover"
                    playsInline
                    muted
                    autoPlay
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-1 bg-slate-800">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{t('chat.you')}</span>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white/90 backdrop-blur-sm">
                  {t('digitalParticipantYou', { defaultValue: 'You' })}
                </div>
              </div>
            </main>

            {/* Chat Sidebar - Professional Zoom Style (70% Width) - Glassmorphic */}
            <aside className="w-full lg:flex-[7] flex flex-col bg-white/70 dark:bg-slate-900/60 backdrop-blur-3xl border-l border-slate-200/50 dark:border-white/5 transition-all duration-300">
              <div className="flex-shrink-0 px-6 py-5 border-b border-slate-200/50 dark:border-white/5 flex items-center justify-between bg-white/40 dark:bg-black/20 backdrop-blur-md relative z-20">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">{t('interview.digitalChatTitle')}</h3>
                
                {/* Embedded Countdown in Sidebar Header */}
                <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-50 dark:bg-black/40 rounded-lg border border-slate-100 dark:border-white/5 transition-all">
                  <Clock className={`w-3.5 h-3.5 ${timerStatus === 'critical' ? 'text-red-500 animate-pulse' : timerStatus === 'warning' ? 'text-amber-500' : 'text-slate-400'}`} />
                  <span className={`text-sm font-mono font-bold tabular-nums ${timerStatus === 'critical' ? 'text-red-600 dark:text-red-400' : timerStatus === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'}`}>
                    {timerDisplay}
                  </span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                {messageItems}
              </div>

              <div className="p-6 border-t border-slate-200/50 dark:border-white/5 space-y-4 bg-white/40 dark:bg-black/30 backdrop-blur-md">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span>{stt.active ? t('chat.recording') : isStreaming ? t('chat.analyzing') : t('chat.ready')}</span>
                  {tts.speaking && <WaveIcon active />}
                </div>

                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <textarea
                      value={stt.active ? input + interimText : input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={t('chat.placeholder', { lang: language })}
                      className="w-full bg-white dark:bg-slate-800 text-sm font-medium rounded-xl px-4 py-3 min-h-[48px] max-h-32 resize-none focus:outline-none border border-slate-200 dark:border-slate-700 transition-all disabled:opacity-50"
                      disabled={isStreaming}
                    />
                  </div>
                  <button
                    onClick={() => sendMessage(inputDraft)}
                    disabled={!inputDraft.trim() || isStreaming}
                    className="w-12 h-12 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl flex items-center justify-center transition-all disabled:opacity-50 shadow-lg shadow-slate-900/10"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </aside>
          </div>

          {/* Bottom Control Bar - High-End Digital Meeting Style */}
          <div className="h-20 bg-black/95 backdrop-blur-2xl border-t border-white/10 flex items-center justify-between px-10 flex-shrink-0">
            <div className="flex items-center gap-8">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none mb-1.5">{t('interview.audio')}</span>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => stt.active ? stt.stop() : stt.start(input)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${stt.active ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'}`}
                  >
                    {stt.active ? <Mic className="w-5 h-5 shadow-inner" /> : <Mic className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => {
                      const next = !ttsEnabled
                      setTtsEnabled(next)
                      if (!next) tts.stop()
                      else window.speechSynthesis?.resume()
                    }}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${ttsEnabled ? 'bg-white/5 text-white' : 'bg-red-500/10 text-red-400'}`}
                  >
                    {ttsEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="h-10 w-px bg-white/10" />

              <div className="flex flex-col">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none mb-1.5">{t('interview.video')}</span>
                <button
                  onClick={() => onToggleCamera?.()}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isCameraOn ? 'bg-white/5 text-white' : 'bg-red-500/10 text-red-400'}`}
                >
                  {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none mb-1.5">{t('interview.meetingTime')}</span>
                <div className="px-4 py-1.5 bg-white/5 rounded-lg border border-white/10 text-xs font-mono font-bold text-white tabular-nums">
                  LIVE
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => window.location.href = '/setup'}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white/50 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-white/5 hover:border-white/20 backdrop-blur-sm"
              >
                {t('interview.exitDirectly', { defaultValue: 'Exit' })}
              </button>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('interview-end-request'))}
                className="px-8 py-3 bg-red-600/90 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-red-600/20 backdrop-blur-sm"
              >
                {t('interview.leaveRoom', { defaultValue: 'Leave' })}
              </button>
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
