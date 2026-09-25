import { isProviderRegistered } from './createAvatarProvider.js'

/**
 * Client-side readiness checks for one interviewer.
 *
 * Complements the backend's schema validation rather than repeating it: the
 * backend cannot see which image files Vite bundled, and the frontend cannot
 * see whether the reference video exists on the server. Each side checks what
 * it can actually observe.
 */

export const ISSUE = Object.freeze({
  MISSING_PORTRAIT: 'MISSING_PORTRAIT',
  MISSING_THUMBNAIL: 'MISSING_THUMBNAIL',
  MISSING_REFERENCE_VIDEO: 'MISSING_REFERENCE_VIDEO',
  INVALID_VOICE_CONFIG: 'INVALID_VOICE_CONFIG',
  UNSUPPORTED_LANGUAGE: 'UNSUPPORTED_LANGUAGE',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  PROVIDER_ID_UNASSIGNED: 'PROVIDER_ID_UNASSIGNED',
})

const VALID_PACE = new Set(['slow', 'medium', 'fast'])

/** `blocking: true` means do not attempt avatar mode; the interview still runs. */
function issue(code, message, blocking = false) {
  return { code, message, blocking }
}

/**
 * @param {object} interviewer merged record from interviewerRegistry
 * @param {{ language?: string }} [ctx]
 * @returns {{ ok: boolean, canUseAvatar: boolean, issues: Array<object> }}
 */
export function validateInterviewer(interviewer, ctx = {}) {
  const issues = []

  if (!interviewer) {
    return { ok: false, canUseAvatar: false, issues: [issue('NOT_FOUND', 'Interviewer not found', true)] }
  }

  const { assets, voice, supportedLanguages, avatarProvider, avatarProviderId } = interviewer

  // Only a total absence of imagery is worth reporting: neutral.png standing in
  // for portrait_main.png is a supported arrangement, not a defect.
  if (!assets?.hasOwnImage) {
    issues.push(issue(
      ISSUE.MISSING_PORTRAIT,
      `No portrait_main.png or neutral.png for ${interviewer.id} — using legacy fallback image`,
    ))
  }
  if (!assets?.hasThumb) {
    issues.push(issue(ISSUE.MISSING_THUMBNAIL, `card_thumb.png missing for ${interviewer.id}`))
  }

  if (!voice || typeof voice.defaultVoiceId !== 'string' || !voice.defaultVoiceId.trim()) {
    issues.push(issue(ISSUE.INVALID_VOICE_CONFIG, 'voice.defaultVoiceId is missing or empty', true))
  } else if (!VALID_PACE.has(voice.pace)) {
    issues.push(issue(ISSUE.INVALID_VOICE_CONFIG, `voice.pace "${voice.pace}" is not slow|medium|fast`))
  }

  if (ctx.language && Array.isArray(supportedLanguages) && !supportedLanguages.includes(ctx.language)) {
    issues.push(issue(
      ISSUE.UNSUPPORTED_LANGUAGE,
      `${interviewer.id} does not support "${ctx.language}" (has: ${supportedLanguages.join(', ')})`,
      true,
    ))
  }

  if (avatarProvider && avatarProvider !== 'none') {
    if (!isProviderRegistered(avatarProvider)) {
      issues.push(issue(
        ISSUE.PROVIDER_UNAVAILABLE,
        `No adapter registered for provider "${avatarProvider}"`,
      ))
    }
    if (!avatarProviderId) {
      issues.push(issue(
        ISSUE.PROVIDER_ID_UNASSIGNED,
        `avatarProviderId not assigned — run ${avatarProvider} preprocessing`,
      ))
    }
    // The backend owns reference-video existence; it reports it via avatarReady.
    if (interviewer.avatarReady === false && avatarProviderId) {
      issues.push(issue(ISSUE.MISSING_REFERENCE_VIDEO, 'Backend reports avatar assets incomplete'))
    }
  }

  const blocking = issues.filter((i) => i.blocking)
  return {
    ok: blocking.length === 0,
    // Avatar mode needs a clean bill of health; anything else falls back to a portrait.
    canUseAvatar: issues.length === 0 && avatarProvider !== 'none',
    issues,
  }
}

/** Validate the whole roster; useful at boot to log what content is still missing. */
export function validateRoster(interviewers, ctx = {}) {
  return interviewers.map((it) => ({ id: it.id, ...validateInterviewer(it, ctx) }))
}
