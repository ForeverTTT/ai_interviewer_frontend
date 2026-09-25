import { AVATAR_STATE, AvatarProvider } from './AvatarProvider.js'

/**
 * The current behaviour, expressed as a provider: a static portrait, no lip-sync.
 *
 * This is the default so that adding the abstraction changes nothing at runtime.
 * It also gives every other provider a guaranteed fallback: if MuseTalk is
 * unreachable, swap in this one and the interview continues with a still image.
 *
 * `speaking` is tracked so the UI can keep its existing subtle scale/blur cue.
 */
export class NullAvatarProvider extends AvatarProvider {
  constructor() {
    super({ name: 'none' })
    this.speaking = false
    this._silenceTimer = null
  }

  async checkAvailability() {
    return { available: true }
  }

  async initialize(interviewerConfig) {
    this.config = interviewerConfig ?? null
    this._setState(AVATAR_STATE.READY)
  }

  async startSession() {
    this._setState(AVATAR_STATE.ACTIVE)
  }

  /**
   * No rendering — only a speaking flag, debounced so the portrait does not
   * flicker between PCM chunks that arrive a few milliseconds apart.
   */
  pushAudio(_audioChunk) {
    if (this.state === AVATAR_STATE.DESTROYED) return
    this.speaking = true
    clearTimeout(this._silenceTimer)
    this._silenceTimer = setTimeout(() => { this.speaking = false }, 250)
  }

  interrupt() {
    clearTimeout(this._silenceTimer)
    this.speaking = false
  }

  async stopSession() {
    this.interrupt()
    this._setState(AVATAR_STATE.STOPPED)
  }

  destroy() {
    this.interrupt()
    this._listeners.clear()
    this._setState(AVATAR_STATE.DESTROYED)
  }
}
