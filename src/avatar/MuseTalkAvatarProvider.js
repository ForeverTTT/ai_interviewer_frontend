import { AVATAR_STATE, AvatarProvider } from './AvatarProvider.js'

/**
 * MuseTalk / LiveTalking adapter — PLACEHOLDER.
 *
 * Everything that talks to the network is stubbed and marked TODO. The class
 * exists now so the rest of the system can be built, wired and reviewed against
 * a real shape instead of an imagined one.
 *
 * Intended architecture (LiveTalking is a self-hosted Python service):
 *
 *   browser ──PCM 16k──► LiveTalking ──WebRTC video──► browser <video>
 *
 * The avatar's *video* comes back over WebRTC; its *audio* keeps playing
 * through our own Web Audio path, because we already schedule that precisely
 * and re-deriving it from the video track would add latency and drift.
 * That means the two streams must be kept in sync by timestamp, not by
 * assuming the video track carries the audio — see AVATAR_ASSET_PIPELINE.md.
 */
export class MuseTalkAvatarProvider extends AvatarProvider {
  /**
   * @param {{ endpoint?: string, avatarProviderId?: string|null, fetchImpl?: typeof fetch }} [opts]
   */
  constructor(opts = {}) {
    super({ name: 'musetalk' })
    // TODO: point at the deployed LiveTalking service (VITE_MUSETALK_ENDPOINT).
    this.endpoint = opts.endpoint || null
    this.avatarProviderId = opts.avatarProviderId ?? null
    this._fetch = opts.fetchImpl || (typeof fetch === 'function' ? fetch.bind(globalThis) : null)

    /** @type {RTCPeerConnection|null} */
    this.peerConnection = null
    /** @type {WebSocket|null} */
    this.socket = null
    /** @type {MediaStream|null} */
    this.videoStream = null

    this._pendingChunks = []
  }

  /**
   * A provider is only "available" when it has somewhere to connect AND the
   * interviewer has been through preprocessing. Reporting these separately
   * matters: one is an ops problem, the other a content-pipeline problem.
   */
  async checkAvailability() {
    if (!this.endpoint) {
      return { available: false, reason: 'MuseTalk endpoint not configured (VITE_MUSETALK_ENDPOINT)' }
    }
    if (!this.avatarProviderId) {
      return { available: false, reason: 'avatarProviderId not assigned — run MuseTalk preprocessing first' }
    }
    if (typeof RTCPeerConnection === 'undefined') {
      return { available: false, reason: 'Browser does not support WebRTC' }
    }
    // TODO: probe `GET ${this.endpoint}/health` and confirm the id is loaded.
    return { available: false, reason: 'MuseTalkAvatarProvider is a placeholder — not yet implemented' }
  }

  async initialize(interviewerConfig) {
    this._setState(AVATAR_STATE.INITIALIZING)
    this.config = interviewerConfig ?? null
    this.avatarProviderId = interviewerConfig?.avatarProviderId ?? this.avatarProviderId

    const { available, reason } = await this.checkAvailability()
    if (!available) {
      this._setState(AVATAR_STATE.ERROR, { reason })
      throw new Error(`MuseTalk unavailable: ${reason}`)
    }

    // TODO: negotiate the WebRTC offer/answer and attach this.videoStream.
    this._setState(AVATAR_STATE.READY)
  }

  async startSession() {
    if (this.state !== AVATAR_STATE.READY) {
      throw new Error(`startSession() requires state "ready", got "${this.state}"`)
    }
    // TODO: open the audio uplink socket and begin rendering.
    this._setState(AVATAR_STATE.ACTIVE)
  }

  /**
   * @param {ArrayBuffer|Int16Array} audioChunk PCM16 mono. Resampling to whatever
   *   rate LiveTalking expects belongs here, not in the caller — that detail is
   *   provider-specific and must not leak into AudioRouter.
   */
  pushAudio(audioChunk) {
    if (this.state !== AVATAR_STATE.ACTIVE) return
    // TODO: resample to the service's expected rate and send over this.socket.
    this._pendingChunks.push(audioChunk)
    if (this._pendingChunks.length > 512) this._pendingChunks.shift() // bound the stub's memory
  }

  interrupt() {
    // Barge-in must be immediate: drop everything queued, do not drain it.
    this._pendingChunks.length = 0
    // TODO: send the service's interrupt/flush control frame.
  }

  async stopSession() {
    this.interrupt()
    // TODO: close the uplink socket but keep the peer connection for reuse.
    this._setState(AVATAR_STATE.STOPPED)
  }

  destroy() {
    this.interrupt()
    try { this.socket?.close() } catch { /* ignore */ }
    try { this.peerConnection?.close() } catch { /* ignore */ }
    this.socket = null
    this.peerConnection = null
    this.videoStream = null
    this._listeners.clear()
    this._setState(AVATAR_STATE.DESTROYED)
  }
}
