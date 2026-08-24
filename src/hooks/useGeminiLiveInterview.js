import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getBackendBaseUrl } from '../lib/backendBase'

const INPUT_SAMPLE_RATE = 16_000

function websocketUrl() {
  const url = new URL(getBackendBaseUrl())
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.pathname = '/api/chat/live'
  url.search = ''
  url.hash = ''
  return url.toString()
}

function base64ToInt16(base64) {
  const binary = window.atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const usable = bytes.byteLength & ~1
  return new Int16Array(bytes.buffer.slice(0, usable))
}

function resampleToPcm16(input, sourceRate) {
  if (!input?.length) return new Int16Array(0)
  const ratio = sourceRate / INPUT_SAMPLE_RATE
  const length = Math.max(1, Math.floor(input.length / ratio))
  const output = new Int16Array(length)

  for (let i = 0; i < length; i++) {
    const position = i * ratio
    const left = Math.floor(position)
    const right = Math.min(left + 1, input.length - 1)
    const mix = position - left
    const sample = input[left] * (1 - mix) + input[right] * mix
    const clamped = Math.max(-1, Math.min(1, sample))
    output[i] = clamped < 0 ? clamped * 32768 : clamped * 32767
  }
  return output
}

export function useGeminiLiveInterview({
  enabled,
  config,
  audioEnabled,
  onReady,
  onAudioStart,
  onInputTranscript,
  onOutputTranscript,
  onTurnComplete,
  onError,
}) {
  const [connected, setConnected] = useState(false)
  const [recording, setRecording] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [error, setError] = useState(null)
  const [connectionGeneration, setConnectionGeneration] = useState(0)
  const socketRef = useRef(null)
  const micRef = useRef(null)
  const outputContextRef = useRef(null)
  const outputSourcesRef = useRef(new Set())
  const nextAudioTimeRef = useRef(0)
  const listeningRef = useRef(false)
  const callbacksRef = useRef({})
  const audioEnabledRef = useRef(audioEnabled)

  useLayoutEffect(() => {
    callbacksRef.current = { onReady, onAudioStart, onInputTranscript, onOutputTranscript, onTurnComplete, onError }
  }, [onReady, onAudioStart, onInputTranscript, onOutputTranscript, onTurnComplete, onError])

  useLayoutEffect(() => { audioEnabledRef.current = audioEnabled }, [audioEnabled])

  const stableConfig = useMemo(() => ({
    interviewId: config.interviewId,
    position: config.position,
    jobDescription: config.jobDescription,
    language: config.language,
    duration: config.duration,
    resumeSnapshot: config.resumeSnapshot,
    roleTrack: config.roleTrack,
    interviewerStyle: config.interviewerStyle,
  }), [config.interviewId, config.position, config.jobDescription, config.language, config.duration, config.resumeSnapshot, config.roleTrack, config.interviewerStyle])

  const stopAudio = useCallback(() => {
    for (const source of outputSourcesRef.current) {
      try { source.stop(); source.disconnect() } catch { /* ignore */ }
    }
    outputSourcesRef.current.clear()
    nextAudioTimeRef.current = 0
    setSpeaking(false)
  }, [])

  const playAudioChunk = useCallback((base64, mimeType = '') => {
    if (!audioEnabledRef.current || !base64) return
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    if (!outputContextRef.current || outputContextRef.current.state === 'closed') {
      outputContextRef.current = new AC({ sampleRate: 24_000 })
    }
    const context = outputContextRef.current
    if (context.state === 'suspended') void context.resume()

    const rate = Number(mimeType.match(/rate=(\d+)/)?.[1]) || 24_000
    const pcm = base64ToInt16(base64)
    if (!pcm.length) return
    const floats = new Float32Array(pcm.length)
    for (let i = 0; i < pcm.length; i++) floats[i] = pcm[i] / 32768

    const buffer = context.createBuffer(1, floats.length, rate)
    buffer.getChannelData(0).set(floats)
    const source = context.createBufferSource()
    source.buffer = buffer
    source.connect(context.destination)
    const startAt = Math.max(context.currentTime + 0.01, nextAudioTimeRef.current)
    source.start(startAt)
    nextAudioTimeRef.current = startAt + buffer.duration
    outputSourcesRef.current.add(source)
    setSpeaking(true)
    source.onended = () => {
      outputSourcesRef.current.delete(source)
      if (!outputSourcesRef.current.size) setSpeaking(false)
    }
  }, [])

  const stopMic = useCallback(() => {
    listeningRef.current = false
    setRecording(false)
    const mic = micRef.current
    micRef.current = null
    if (mic) {
      try { mic.processor.disconnect() } catch { /* ignore */ }
      try { mic.source.disconnect() } catch { /* ignore */ }
      try { mic.gain.disconnect() } catch { /* ignore */ }
      mic.stream.getTracks().forEach((track) => track.stop())
      void mic.context.close().catch(() => {})
    }
    const socket = socketRef.current
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'audio_end' }))
  }, [])

  const startMic = useCallback(async () => {
    if (!enabled || !connected || listeningRef.current) return
    if (!navigator.mediaDevices?.getUserMedia) {
      const nextError = new Error('Microphone capture is not supported in this browser')
      setError(nextError.message)
      callbacksRef.current.onError?.(nextError)
      return
    }

    stopAudio()
    let stream
    let context
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      })
      const AC = window.AudioContext || window.webkitAudioContext
      context = new AC()
      const source = context.createMediaStreamSource(stream)
      const processor = context.createScriptProcessor(4096, 1, 1)
      const gain = context.createGain()
      gain.gain.value = 0
      processor.onaudioprocess = (event) => {
        const socket = socketRef.current
        if (!listeningRef.current || socket?.readyState !== WebSocket.OPEN) return
        const pcm = resampleToPcm16(event.inputBuffer.getChannelData(0), context.sampleRate)
        if (pcm.byteLength) socket.send(pcm.buffer)
      }
      source.connect(processor)
      processor.connect(gain)
      gain.connect(context.destination)
      micRef.current = { context, stream, source, processor, gain }
      listeningRef.current = true
      setRecording(true)
      setError(null)
    } catch (cause) {
      stream?.getTracks().forEach((track) => track.stop())
      if (context?.state !== 'closed') void context?.close().catch(() => {})
      micRef.current = null
      listeningRef.current = false
      setRecording(false)
      const nextError = new Error(cause?.message || 'Microphone access was not granted')
      setError(nextError.message)
      callbacksRef.current.onError?.(nextError)
    }
  }, [connected, enabled, stopAudio])

  const sendText = useCallback((text) => {
    const trimmed = String(text || '').trim()
    const socket = socketRef.current
    if (!trimmed || socket?.readyState !== WebSocket.OPEN) return false
    socket.send(JSON.stringify({ type: 'text', text: trimmed }))
    return true
  }, [])

  const reconnect = useCallback(() => {
    setConnected(false)
    setError(null)
    setConnectionGeneration(generation => generation + 1)
  }, [])

  const disconnect = useCallback(() => {
    stopMic()
    stopAudio()
    const socket = socketRef.current
    socketRef.current = null
    try {
      if (socket?.readyState === WebSocket.CONNECTING || socket?.readyState === WebSocket.OPEN) {
        socket.close(1000, 'Interview ended')
      }
    } catch { /* ignore */ }
    if (outputContextRef.current?.state !== 'closed') {
      void outputContextRef.current?.close().catch(() => {})
    }
    setConnected(false)
  }, [stopAudio, stopMic])

  useEffect(() => {
    if (!enabled) return undefined
    let disposed = false
    let socket

    ;(async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        if (!session?.access_token) throw new Error('Your login session has expired')
        if (disposed) return

        socket = new WebSocket(websocketUrl())
        socket.binaryType = 'arraybuffer'
        socketRef.current = socket
        socket.onopen = () => {
          socket.send(JSON.stringify({ type: 'start', token: session.access_token, config: stableConfig }))
        }
        socket.onmessage = (event) => {
          if (typeof event.data !== 'string') return
          let message
          try { message = JSON.parse(event.data) } catch { return }
          if (message.type === 'ready') {
            setConnected(true)
            setError(null)
            callbacksRef.current.onReady?.(message)
          } else if (message.type === 'input_transcript') {
            callbacksRef.current.onInputTranscript?.(message.text)
          } else if (message.type === 'output_transcript') {
            callbacksRef.current.onOutputTranscript?.(message.text)
          } else if (message.type === 'audio') {
            callbacksRef.current.onAudioStart?.()
            playAudioChunk(message.data, message.mimeType)
          } else if (message.type === 'turn_complete') {
            callbacksRef.current.onTurnComplete?.(message)
          } else if (message.type === 'interrupted') {
            stopAudio()
          } else if (message.type === 'error') {
            const nextError = new Error(message.message || 'Gemini Live error')
            setError(nextError.message)
            callbacksRef.current.onError?.(nextError)
          }
        }
        socket.onerror = () => {
          const nextError = new Error('Unable to connect to the live interview service')
          setError(nextError.message)
          callbacksRef.current.onError?.(nextError)
        }
        socket.onclose = (event) => {
          setConnected(false)
          stopMic()
          if (!disposed && event.code !== 1000) {
            const nextError = new Error(event.reason || 'Live interview connection closed')
            setError(nextError.message)
            callbacksRef.current.onError?.(nextError)
          }
        }
      } catch (nextError) {
        if (disposed) return
        setError(nextError.message)
        callbacksRef.current.onError?.(nextError)
      }
    })()

    return () => {
      disposed = true
      stopMic()
      stopAudio()
      if (socket?.readyState === WebSocket.OPEN) socket.close(1000, 'Component unmounted')
      socketRef.current = null
      if (outputContextRef.current?.state !== 'closed') void outputContextRef.current?.close().catch(() => {})
    }
  }, [enabled, stableConfig, connectionGeneration, playAudioChunk, stopAudio, stopMic])

  useEffect(() => {
    if (!audioEnabled) stopAudio()
  }, [audioEnabled, stopAudio])

  return {
    connected,
    recording,
    speaking,
    error,
    supported: typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,
    listeningRef,
    startMic,
    stopMic,
    stopAudio,
    sendText,
    reconnect,
    disconnect,
  }
}
