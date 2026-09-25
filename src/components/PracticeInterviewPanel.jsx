import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { getBackendBaseUrl } from '../lib/backendBase'
import ChatInterface from './ChatInterface'

const API = getBackendBaseUrl()

function requestId() {
  return globalThis.crypto?.randomUUID?.() || `practice-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const PracticeInterviewPanel = forwardRef(function PracticeInterviewPanel({
  interviewId,
  language = 'English',
  interviewerType = 'mixed',
  onInterviewUiReady,
  onPracticeState,
  onLimitReached,
  position = '',
  jobDescription = '',
  resumeContext = '',
  roleTrack = 'work',
  interviewerStyle = 'balanced',
  interviewUiVisible = true,
  userCameraStream = null,
  isCameraOn = false,
  onToggleCamera,
}, ref) {
  const { t } = useTranslation()
  const [workspace, setWorkspace] = useState(null)
  const [answer, setAnswer] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [retrying, setRetrying] = useState(false)
  const [restoreAttempt, setRestoreAttempt] = useState(0)
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
      const controller = new AbortController()
      const timeoutId = window.setTimeout(() => controller.abort(), 20_000)
      try {
        response = await fetch(`${API}/api/interview-sessions/${interviewId}${path}`, {
          ...options,
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            ...(options.headers || {}),
          },
        })
      } catch (cause) {
        networkError = cause?.name === 'AbortError'
          ? new Error(t('interview.practice.networkFailed'))
          : cause
        if (attempt === 0) await new Promise(resolve => window.setTimeout(resolve, 400))
      } finally {
        window.clearTimeout(timeoutId)
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
        // Match formal mode: reveal the interview room as soon as its persisted
        // session is restored. First-question generation continues inside it.
        onInterviewUiReady?.()
        if (!initial.interview.current_question_id && initial.interview.status === 'active') {
          if (initial.practiceLimits?.timeLimitReached || initial.practiceLimits?.questionLimitReached) {
            notifyLimit(initial.practiceLimits.timeLimitReached ? 'PRACTICE_TIME_LIMIT' : 'PRACTICE_QUESTION_LIMIT')
          } else {
            await generateNext()
          }
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause.message || t('interview.practice.restoreFailed'))
          onInterviewUiReady?.()
        }
      }
    })()
    return () => { cancelled = true }
  }, [generateNext, notifyLimit, onInterviewUiReady, reload, restoreAttempt, t])

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

  const submitAnswer = async (draft = answer) => {
    const text = String(draft || '').trim()
    if (!text || !currentQuestion || !canDraftAnswer) return
    return run(async () => {
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
    setAnswer(attempts.at(-1)?.answer_text || '')
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

  if (!workspace) return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-brand-paper px-6 text-center text-[13px] text-brand-muted">
      <span>{error || t('interview.practice.loading')}</span>
      {error && (
        <button
          type="button"
          onClick={() => { setError(null); setRestoreAttempt(value => value + 1) }}
          className="rounded-xl bg-brand-ink px-4 py-2 text-[12.5px] font-semibold text-brand-on-ink"
        >
          {t('chat.retry')}
        </button>
      )}
    </div>
  )

  const paused = workspace.interview.status === 'paused'
  const messages = (workspace.questions || []).flatMap(question => [
    { id: `question-${question.id}`, role: 'assistant', content: question.question_text, agent: question.question_type || 'opening' },
    ...(workspace.attempts || []).filter(item => item.question_id === question.id).map(item => ({
      id: `attempt-${item.id}`,
      role: 'user',
      content: item.answer_text,
    })),
  ])
  const controller = {
    workspace, currentQuestion, attempts, hints, latestFeedback, hintsExhausted,
    answer, setAnswer, note, setNote, busy, error, paused, retrying, canDraftAnswer,
    messages, submitAnswer, beginRetry,
    nextHint: () => questionAction('hint'),
    masterNext: () => resolveAndContinue('master'),
    skipNext: () => {
      const reason = window.prompt(t('interview.practice.skipReason')) || ''
      return resolveAndContinue('skip', { reason })
    },
    togglePause: () => action(paused ? 'resume' : 'pause'),
    saveNote: () => run(() => api(`/questions/${currentQuestion.id}/note`, {
      method: 'PUT', body: JSON.stringify({ content: note, idempotencyKey: requestId() }),
    })),
    generateNext,
  }

  return <ChatInterface
    ref={ref}
    mode="practice"
    practiceController={controller}
    position={position}
    jobDescription={jobDescription}
    language={language}
    duration={workspace.interview.duration}
    resumeContext={resumeContext}
    roleTrack={roleTrack}
    interviewerStyle={interviewerStyle}
    interviewerType={workspace.interview.interviewer_type || interviewerType}
    persistInterviewId={interviewId}
    interviewUiVisible={interviewUiVisible}
    onInterviewUiReady={onInterviewUiReady}
    digitalHuman
    userCameraStream={userCameraStream}
    isCameraOn={isCameraOn}
    onToggleCamera={onToggleCamera}
    timerDisplay={t('setup.practiceUnlimited')}
    timerStatus="normal"
  />
})

export default PracticeInterviewPanel
