/**
 * Provider-agnostic contract for a talking-avatar backend.
 *
 * Implementations must not assume anything about where audio comes from.
 * The caller (AudioRouter) owns the audio stream; a provider only receives
 * chunks it is told about. This is what lets MuseTalk be swapped for Tavus,
 * Simli or Volcengine without touching the interview pipeline.
 *
 * Lifecycle:
 *
 *   initialize(config)  once, cheap, may prefetch — must not open sockets
 *   startSession()      opens the live connection / begins rendering
 *   pushAudio(chunk)    called for every PCM chunk while speaking
 *   interrupt()         barge-in: drop queued audio and stop the mouth NOW
 *   stopSession()       end of turn or interview; connection may be reused
 *   destroy()           release everything; instance is unusable afterwards
 *
 * Every method may be called defensively and out of order. Implementations
 * must be idempotent rather than throwing — a broken avatar must never take
 * the interview down with it.
 */

/** @typedef {'idle'|'initializing'|'ready'|'active'|'stopped'|'destroyed'|'error'} AvatarState */

export const AVATAR_STATE = Object.freeze({
  IDLE: 'idle',
  INITIALIZING: 'initializing',
  READY: 'ready',
  ACTIVE: 'active',
  STOPPED: 'stopped',
  DESTROYED: 'destroyed',
  ERROR: 'error',
})

export class AvatarProvider {
  /** @param {{name?: string}} [opts] */
  constructor(opts = {}) {
    if (new.target === AvatarProvider) {
      throw new TypeError('AvatarProvider is abstract — extend it')
    }
    this.name = opts.name || 'unknown'
    this.state = AVATAR_STATE.IDLE
    this.config = null
    this._listeners = new Set()
  }

  /**
   * Subscribe to state changes. Returns an unsubscribe function.
   * @param {(state: AvatarState, meta: object) => void} fn
   */
  onStateChange(fn) {
    this._listeners.add(fn)
    return () => this._listeners.delete(fn)
  }

  /** @protected */
  _setState(state, meta = {}) {
    this.state = state
    for (const fn of this._listeners) {
      try { fn(state, meta) } catch { /* a bad listener must not break the provider */ }
    }
  }

  /** True once the provider can accept audio. */
  get isLive() {
    return this.state === AVATAR_STATE.ACTIVE || this.state === AVATAR_STATE.READY
  }

  /**
   * Whether this provider can run right now (assets present, id assigned,
   * browser capable). Checked before the UI offers avatar mode.
   * @returns {Promise<{available: boolean, reason?: string}>}
   */
  // eslint-disable-next-line class-methods-use-this
  async checkAvailability() {
    return { available: false, reason: 'checkAvailability() not implemented' }
  }

  /* eslint-disable class-methods-use-this, no-unused-vars */
  async initialize(interviewerConfig) { throw new Error('initialize() not implemented') }
  async startSession() { throw new Error('startSession() not implemented') }
  pushAudio(audioChunk) { throw new Error('pushAudio() not implemented') }
  interrupt() { throw new Error('interrupt() not implemented') }
  async stopSession() { throw new Error('stopSession() not implemented') }
  destroy() { throw new Error('destroy() not implemented') }
  /* eslint-enable class-methods-use-this, no-unused-vars */
}
