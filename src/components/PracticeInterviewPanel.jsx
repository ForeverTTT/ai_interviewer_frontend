import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { getBackendBaseUrl } from '../lib/backendBase'

const API = getBackendBaseUrl()

function requestId() {
  return globalThis.crypto?.randomUUID?.() || `practice-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function speechLanguage(language) {
  if (language === 'Deutsch') return 'de-DE'
  if (language === 'Chinese') return 'zh-CN'
  return 'en-US'
}

const PracticeInterviewPanel = forwardRef(function PracticeInterviewPanel({
  interviewId,
  language = 'English',
  interviewerType = 'mixed',
  onInterviewUiReady,
  onPracticeState,
  onLimitReached,
}, ref) {
  const { t } = useTranslation()
  const [workspace, setWorkspace] = useState(null)
  const [answer, setAnswer] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [retrying, setRetrying] = useState(false)
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const recognitionRef = useRef(null)
  const speechBaseRef = useRef('')
  const answerRef = useRef(null)
  const limitNotifiedRef = useRef(false)

  const notifyLimit = useCallback((reason) => {
    if (limitNotifiedRef.current) return
    limitNotifiedRef.current = true
    onLimitReached?.(reason)
  }, [onLimitReached])

  const api = useCallback(async (path, options = {}) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error(t('interview.practice.authMissing'))
    let response = null
    let networkError = null
    for (let attempt = 0; attempt < 2 && !response; attempt += 1) {
      try {
        response = await fetch(`${API}/api/interview-sessions/${interviewId}${path}`, {
          ...options,
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            ...(options.headers || {}),
          },
        })
      } catch (cause) {
        networkError = cause
        if (attempt === 0) await new Promise(resolve => window.setTimeout(resolve, 400))
      }
    }
    if (!response) throw networkError || new Error(t('interview.practice.networkFailed'))
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      const failure = new Error(body.error || `HTTP ${response.status}`)
      failure.code = body.code
      throw failure
    }
    return body
  }, [interviewId, t])

  const reload = useCallback(async () => {
    const next = await api('')
    setWorkspace(next)
    const currentNote = next.notes?.find(item => item.question_id === next.interview.current_question_id)
    setNote(currentNote?.content || '')
    onPracticeState?.({
      paused: next.interview.status === 'paused',
      limits: next.practiceLimits,
      interview: next.interview,
    })
    return next
  }, [api, onPracticeState])

  const run = useCallback(async (operation) => {
    setBusy(true)
    setError(null)
    try {
      await operation()
      return await reload()
    } catch (cause) {
      if (['PRACTICE_TIME_LIMIT', 'PRACTICE_QUESTION_LIMIT'].includes(cause.code)) {
        notifyLimit(cause.code)
      } else {
        setError(cause.message || t('interview.practice.operationFailed'))
      }
      return null
    } finally {
      setBusy(false)
    }
  }, [reload, notifyLimit, t])

  const generateNext = useCallback(() => run(() => api('/questions/next', {
    method: 'POST',
    body: JSON.stringify({ idempotencyKey: requestId() }),
  })), [api, run])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const initial = await reload()
        if (cancelled) return
        if (!initial.interview.current_question_id && initial.interview.status === 'active') {
          if (initial.practiceLimits?.timeLimitReached || initial.practiceLimits?.questionLimitReached) {
            notifyLimit(initial.practiceLimits.timeLimitReached ? 'PRACTICE_TIME_LIMIT' : 'PRACTICE_QUESTION_LIMIT')
          } else {
            await generateNext()
          }
        }
        if (!cancelled) onInterviewUiReady?.()
      } catch (cause) {
        if (!cancelled) setError(cause.message || t('interview.practice.restoreFailed'))
      }
    })()
    return () => { cancelled = true }
  }, [generateNext, notifyLimit, onInterviewUiReady, reload, t])

  useEffect(() => () => {
    try { recognitionRef.current?.abort() } catch { /* ignore */ }
    try { window.speechSynthesis?.cancel() } catch { /* ignore */ }
  }, [])

  const currentQuestion = useMemo(() => workspace?.questions?.find(
    question => question.id === workspace.interview.current_question_id,
  ) || null, [workspace])
  const attempts = useMemo(() => workspace?.attempts?.filter(
    attempt => attempt.question_id === currentQuestion?.id,
  ) || [], [currentQuestion, workspace])
  const hints = useMemo(() => workspace?.hints?.filter(
    hint => hint.question_id === currentQuestion?.id,
  ) || [], [currentQuestion, workspace])
  const latestFeedback = attempts.at(-1)?.feedback_json
  const hintsExhausted = hints.length >= 4
  const canDraftAnswer = attempts.length === 0 || retrying

  useImperativeHandle(ref, () => ({
    getTranscript: () => (workspace?.questions || []).flatMap(question => [
      { role: 'assistant', content: question.question_text },
      ...(workspace?.attempts || [])
        .filter(attempt => attempt.question_id === question.id)
        .map(attempt => ({ role: 'user', content: attempt.answer_text })),
    ]),
    stopInterview: () => {
      try { recognitionRef.current?.abort() } catch { /* ignore */ }
      try { window.speechSynthesis?.cancel() } catch { /* ignore */ }
    },
  }), [workspace])

  const submitAnswer = () => {
    const text = answer.trim()
    if (!text || !currentQuestion || !canDraftAnswer) return
    void run(async () => {
      await api(`/questions/${currentQuestion.id}/answer`, {
        method: 'POST',
        body: JSON.stringify({ answerText: text, idempotencyKey: requestId() }),
      })
      setAnswer('')
      setRetrying(false)
    })
  }

  const action = (name, body = {}) => run(() => api(`/${name}`, {
    method: 'POST',
    body: JSON.stringify({ ...body, idempotencyKey: requestId() }),
  }))

  const questionAction = (name, body = {}) => run(() => api(`/questions/${currentQuestion.id}/${name}`, {
    method: 'POST',
    body: JSON.stringify({ ...body, idempotencyKey: requestId() }),
  }))

  const beginRetry = async () => {
    const result = await questionAction('retry')
    if (!result) return
    setRetrying(true)
    setAnswer('')
    window.setTimeout(() => answerRef.current?.focus(), 0)
  }

  const resolveAndContinue = async (name, body = {}) => {
    const resolved = await questionAction(name, body)
    if (!resolved) return
    setRetrying(false)
    setAnswer('')
    if (resolved.practiceLimits?.timeLimitReached || resolved.practiceLimits?.questionLimitReached) {
      notifyLimit(resolved.practiceLimits.timeLimitReached ? 'PRACTICE_TIME_LIMIT' : 'PRACTICE_QUESTION_LIMIT')
      return
    }
    await generateNext()
  }

  const toggleDictation = () => {
    if (listening) {
      recognitionRef.current?.stop()
      return
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Recognition) {
      setError(t('interview.practice.speechUnsupported'))
      return
    }
    const recognition = new Recognition()
    recognition.lang = speechLanguage(language)
    recognition.continuous = true
    recognition.interimResults = true
    speechBaseRef.current = answer.trim()
    recognition.onresult = event => {
      let transcript = ''
      for (let index = 0; index < event.results.length; index += 1) transcript += event.results[index][0]?.transcript || ''
      setAnswer([speechBaseRef.current, transcript.trim()].filter(Boolean).join(' '))
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = event => {
      setListening(false)
      if (event.error !== 'aborted') setError(t('interview.practice.speechFailed'))
    }
    recognitionRef.current = recognition
    setListening(true)
    recognition.start()
  }

  const speakQuestion = () => {
    if (!currentQuestion || !window.speechSynthesis) {
      setError(t('interview.practice.speechUnsupported'))
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(currentQuestion.question_text)
    utterance.lang = speechLanguage(language)
    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }

  if (!workspace) {
    return <div className="flex flex-1 items-center justify-center text-sm text-slate-500">{t('interview.practice.loading')}</div>
  }

  const paused = workspace.interview.status === 'paused'
  const effectiveType = workspace.interview.interviewer_type || interviewerType
  const typeLabel = t(`setup.type${effectiveType === 'hr' ? 'Hr' : effectiveType === 'technical' ? 'Technical' : 'Mixed'}`)

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white dark:bg-slate-950">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
        <div>
          <div className="text-xs font-black uppercase tracking-widest text-emerald-600">{t('interview.practice.title')}</div>
          <div className="mt-1 text-xs text-slate-500">
            {t('interview.practice.progress', {
              current: workspace.interview.question_index || 0,
              total: workspace.practiceLimits?.questionLimit || '–',
              difficulty: workspace.interview.current_difficulty,
              type: typeLabel,
            })}
          </div>
        </div>
        <button type="button" disabled={busy} onClick={() => void action(paused ? 'resume' : 'pause')} className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold dark:border-slate-700">
          {paused ? t('interview.practice.resume') : t('interview.practice.pause')}
        </button>
      </div>

      {error && <div className="border-b border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="flex-1 overflow-y-auto p-6">
        {paused ? (
          <div className="mx-auto max-w-xl rounded-3xl border border-amber-200 bg-amber-50 p-10 text-center text-amber-900">{t('interview.practice.pausedMessage')}</div>
        ) : currentQuestion ? (
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <span>{currentQuestion.question_type}</span><span>•</span><span>{currentQuestion.competency}</span><span>•</span><span>{currentQuestion.difficulty}</span>
              </div>
              <p className="text-lg font-bold leading-relaxed text-slate-900 dark:text-white">{currentQuestion.question_text}</p>
              <button type="button" disabled={speaking} onClick={speakQuestion} className="mt-4 rounded-xl border px-3 py-2 text-xs font-bold">
                {speaking ? t('interview.practice.speaking') : t('interview.practice.readQuestion')}
              </button>
            </div>

            {attempts.map(attempt => (
              <div key={attempt.id} className="space-y-3 rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
                <div className="text-xs font-black uppercase text-slate-500">{t('interview.practice.attempt', { number: attempt.attempt_number })}</div>
                <p className="whitespace-pre-wrap text-sm">{attempt.answer_text}</p>
                {attempt.feedback_json && (
                  <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100">
                    <div className="font-black">{t('interview.practice.score', { score: attempt.feedback_json.score })}</div>
                    {(attempt.feedback_json.strengths || []).map(item => <p key={item} className="mt-2">✓ {item}</p>)}
                    {(attempt.feedback_json.gaps || []).map(item => <p key={item} className="mt-2">→ {item}</p>)}
                  </div>
                )}
              </div>
            ))}

            {hints.map(hint => (
              <div key={hint.id} className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950 dark:bg-violet-950/30 dark:text-violet-100">
                <div className="mb-1 text-[10px] font-black uppercase tracking-wider">{t(`interview.practice.hintLevels.${hint.level}`)}</div>
                {hint.content}
              </div>
            ))}

            {attempts.length > 0 && !retrying && <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">{t('interview.practice.retryPrompt')}</div>}
            <textarea
              ref={answerRef}
              value={answer}
              onChange={event => setAnswer(event.target.value)}
              disabled={busy || !canDraftAnswer}
              rows={5}
              placeholder={attempts.length ? t('interview.practice.refinePlaceholder') : t('interview.practice.answerPlaceholder')}
              className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm disabled:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:disabled:bg-slate-950"
            />
            <div className="flex flex-wrap gap-3">
              <button type="button" disabled={busy || !answer.trim() || !canDraftAnswer} onClick={submitAnswer} className="rounded-xl bg-slate-900 px-5 py-3 text-xs font-bold text-white disabled:opacity-50 dark:bg-white dark:text-slate-900">
                {attempts.length ? t('interview.practice.submitRetry') : t('interview.practice.submit')}
              </button>
              <button type="button" disabled={busy || !canDraftAnswer} onClick={toggleDictation} className="rounded-xl border px-4 py-3 text-xs font-bold">{listening ? t('interview.practice.stopDictation') : t('interview.practice.startDictation')}</button>
              <button type="button" disabled={busy || hintsExhausted} onClick={() => void questionAction('hint')} className="rounded-xl border px-4 py-3 text-xs font-bold disabled:opacity-50">{hintsExhausted ? t('interview.practice.hintsExhausted') : t('interview.practice.nextHint')}</button>
              {attempts.length > 0 && !retrying && <button type="button" disabled={busy} onClick={() => void beginRetry()} className="rounded-xl border px-4 py-3 text-xs font-bold">{t('interview.practice.retry')}</button>}
              <button type="button" disabled={busy || attempts.length === 0} onClick={() => void resolveAndContinue('master')} className="rounded-xl border border-emerald-300 px-4 py-3 text-xs font-bold text-emerald-700 disabled:opacity-50">{t('interview.practice.masterNext')}</button>
              <button type="button" disabled={busy} onClick={() => {
                const reason = window.prompt(t('interview.practice.skipReason')) || ''
                void resolveAndContinue('skip', { reason })
              }} className="rounded-xl border border-amber-300 px-4 py-3 text-xs font-bold text-amber-700">{t('interview.practice.skipNext')}</button>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
              <div className="mb-3 text-xs font-black uppercase tracking-wider text-slate-500">{t('interview.practice.privateNotes')}</div>
              <textarea value={note} onChange={event => setNote(event.target.value)} rows={3} className="w-full rounded-xl border p-3 text-sm dark:border-slate-700 dark:bg-slate-900" />
              <button type="button" disabled={busy} onClick={() => void run(() => api(`/questions/${currentQuestion.id}/note`, {
                method: 'PUT', body: JSON.stringify({ content: note, idempotencyKey: requestId() }),
              }))} className="mt-3 rounded-xl border px-4 py-2 text-xs font-bold">{t('interview.practice.saveNote')}</button>
            </div>

            {latestFeedback?.nextSteps?.length > 0 && <div className="text-xs text-slate-500">{t('interview.practice.nextFocus')}: {latestFeedback.nextSteps.join(' · ')}</div>}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <button type="button" disabled={busy} onClick={() => void generateNext()} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white">{t('interview.practice.generateNext')}</button>
          </div>
        )}
      </div>
    </div>
  )
})

export default PracticeInterviewPanel
