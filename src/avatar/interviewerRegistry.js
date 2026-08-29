import { getBackendBaseUrl } from '../lib/backendBase'

/**
 * Interviewer roster for the UI.
 *
 * Metadata is fetched from the backend, which owns it — see
 * docs/AVATAR_ASSET_PIPELINE.md for why it lives there and not here.
 * Only the *pixels* are frontend-local, and they are resolved below.
 */

/**
 * Vite resolves these at build time. Using a glob rather than static imports is
 * deliberate: the files do not exist yet, and a missing static import is a hard
 * build failure. A glob simply yields fewer entries, so the app builds today and
 * starts showing portraits the moment they are dropped into the folders.
 */
const PORTRAITS = import.meta.glob('../assets/interviewers/*/portrait_main.png', {
  eager: true, query: '?url', import: 'default',
})
const THUMBS = import.meta.glob('../assets/interviewers/*/card_thumb.png', {
  eager: true, query: '?url', import: 'default',
})
const NEUTRALS = import.meta.glob('../assets/interviewers/*/neutral.png', {
  eager: true, query: '?url', import: 'default',
})

/** '../assets/interviewers/avatar_03/portrait_main.png' -> 'avatar_03' */
function idFromPath(path) {
  return path.split('/').at(-2)
}

function indexByAvatarId(globResult) {
  return Object.fromEntries(
    Object.entries(globResult).map(([path, url]) => [idFromPath(path), url]),
  )
}

const PORTRAIT_BY_ID = indexByAvatarId(PORTRAITS)
const THUMB_BY_ID = indexByAvatarId(THUMBS)
const NEUTRAL_BY_ID = indexByAvatarId(NEUTRALS)

/** Existing single interviewer image, used until per-interviewer portraits land. */
const LEGACY_FALLBACK = `${String(import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')}images/interviewer-hr.png`

/**
 * Local image URLs for one interviewer.
 *
 * The two portrait-ish assets substitute for each other in both directions:
 * a neutral frame is a perfectly good still, and a portrait is a fine neutral.
 * That matters because assets arrive incrementally — an interviewer that has
 * only `neutral.png` should still render its own face, not the legacy stand-in.
 */
export function resolveAssets(id) {
  const portraitFile = PORTRAIT_BY_ID[id] || null
  const neutralFile = NEUTRAL_BY_ID[id] || null

  const portrait = portraitFile || neutralFile
  const neutral = neutralFile || portraitFile

  return {
    portrait,
    thumb: THUMB_BY_ID[id] || portrait,
    neutral,
    // What the <img> should actually use right now, never null.
    displayPortrait: portrait || LEGACY_FALLBACK,
    // Reported per *file*, so validation can still say what is genuinely absent.
    hasPortrait: Boolean(portraitFile),
    hasThumb: Boolean(THUMB_BY_ID[id]),
    hasNeutral: Boolean(neutralFile),
    // True when we can show this interviewer's own face at all.
    hasOwnImage: Boolean(portrait),
  }
}

/** Which avatar ids currently have at least one local image present. */
export function locallyAvailableIds() {
  return Object.keys(PORTRAIT_BY_ID).sort()
}

/**
 * Fetch the roster and merge in local assets.
 * @param {{ language?: string, signal?: AbortSignal }} [opts]
 * @returns {Promise<Array<object>>}
 */
export async function fetchInterviewers(opts = {}) {
  const url = new URL(`${getBackendBaseUrl()}/api/interviewers`)
  if (opts.language) url.searchParams.set('language', opts.language)

  const res = await fetch(url, { signal: opts.signal })
  if (!res.ok) throw new Error(`Failed to load interviewers (HTTP ${res.status})`)

  const { interviewers } = await res.json()
  return (interviewers ?? []).map((it) => ({ ...it, assets: resolveAssets(it.id) }))
}

export async function fetchInterviewer(id, opts = {}) {
  const res = await fetch(`${getBackendBaseUrl()}/api/interviewers/${id}`, { signal: opts.signal })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Failed to load interviewer ${id} (HTTP ${res.status})`)

  const { interviewer } = await res.json()
  return { ...interviewer, assets: resolveAssets(interviewer.id) }
}
