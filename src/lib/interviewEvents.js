import { getBackendBaseUrl } from './backendBase'

export function createInterviewRequestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `web-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

/** Best-effort diagnostics; failure must never interrupt the interview. */
export async function recordInterviewClientEvent({
  interviewId,
  token,
  requestId,
  eventType,
  stage,
  httpStatus,
  errorMessage,
  messageCount,
  metadata,
  keepalive = false,
}) {
  if (!interviewId || !token || !eventType) return false

  try {
    const response = await fetch(`${getBackendBaseUrl()}/api/interviews/${interviewId}/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
      },
      body: JSON.stringify({
        requestId,
        eventType,
        stage,
        httpStatus,
        errorMessage: errorMessage ? String(errorMessage).slice(0, 500) : undefined,
        messageCount,
        metadata,
      }),
      keepalive,
    })
    return response.ok
  } catch {
    return false
  }
}
