/**
 * Fans one audio stream out to several independent sinks.
 *
 *   Gemini Live PCM ──► AudioRouter ──┬──► local playback (Web Audio)
 *                                     └──► AvatarProvider.pushAudio()
 *
 * Why this exists: without it, adding lip-sync means reaching into the Gemini
 * Live playback path and calling MuseTalk from inside it. That couples the
 * speech model to the avatar vendor — the exact thing we are avoiding, and it
 * would have to be undone to switch to Tavus or Simli later.
 *
 * Guarantees:
 *  - Local playback is the PRIMARY sink. A throwing or slow avatar sink can
 *    never prevent audio from reaching the user's speakers.
 *  - Sinks are isolated: one throwing does not stop the others.
 *  - A sink that throws repeatedly is detached rather than left to spam errors.
 */

const DEFAULT_MAX_SINK_ERRORS = 5

export class AudioRouter {
  /**
   * @param {{ onSinkError?: (name: string, error: Error) => void, maxSinkErrors?: number }} [opts]
   */
  constructor(opts = {}) {
    /** @type {Map<string, {handler: Function, primary: boolean, errors: number}>} */
    this._sinks = new Map()
    this._onSinkError = opts.onSinkError || null
    this._maxSinkErrors = opts.maxSinkErrors ?? DEFAULT_MAX_SINK_ERRORS
    this._chunkCount = 0
  }

  /**
   * @param {string} name
   * @param {(chunk: any, meta: object) => void} handler
   * @param {{ primary?: boolean }} [opts] primary sinks run first and are never auto-detached
   * @returns {() => void} detach
   */
  addSink(name, handler, opts = {}) {
    if (typeof handler !== 'function') throw new TypeError(`sink "${name}" handler must be a function`)
    this._sinks.set(name, { handler, primary: Boolean(opts.primary), errors: 0 })
    return () => this.removeSink(name)
  }

  removeSink(name) {
    return this._sinks.delete(name)
  }

  hasSink(name) {
    return this._sinks.has(name)
  }

  get sinkNames() {
    return [...this._sinks.keys()]
  }

  /**
   * Attach an AvatarProvider as a non-primary sink.
   * @param {import('./AvatarProvider.js').AvatarProvider} provider
   */
  attachAvatarProvider(provider, name = 'avatar') {
    return this.addSink(name, (chunk, meta) => {
      // Barge-in arrives through the same channel as audio, flagged in meta.
      // It must reach interrupt() — routing it to pushAudio(null) would leave
      // the avatar's mouth moving after the user has cut the interviewer off.
      if (meta?.interrupted) {
        provider.interrupt()
        return
      }
      // Providers are told to be defensive, but guard anyway: a provider that
      // is not live must never see audio it would queue and later flush.
      if (provider.isLive) provider.pushAudio(chunk)
    })
  }

  /**
   * Push one chunk to every sink. Primary sinks first, in insertion order.
   * @param {any} chunk
   * @param {object} [meta]
   */
  push(chunk, meta = {}) {
    this._chunkCount += 1
    const enriched = { ...meta, index: this._chunkCount }

    const ordered = [...this._sinks.entries()].sort(
      ([, a], [, b]) => Number(b.primary) - Number(a.primary),
    )

    for (const [name, sink] of ordered) {
      try {
        sink.handler(chunk, enriched)
      } catch (error) {
        sink.errors += 1
        this._onSinkError?.(name, error)
        if (!sink.primary && sink.errors >= this._maxSinkErrors) {
          this._sinks.delete(name)
          this._onSinkError?.(name, new Error(
            `sink "${name}" detached after ${sink.errors} consecutive failures`,
          ))
        }
      }
    }
  }

  /**
   * Barge-in. Broadcast to every sink that knows how to stop, then reset.
   * Called when Gemini Live reports `interrupted`, or when the user takes the mic.
   */
  interrupt() {
    for (const [name, sink] of this._sinks) {
      try {
        sink.handler(null, { interrupted: true, index: this._chunkCount })
      } catch (error) {
        this._onSinkError?.(name, error)
      }
    }
    this._chunkCount = 0
  }

  /** Detach everything. Does not destroy providers — the owner does that. */
  reset() {
    this._sinks.clear()
    this._chunkCount = 0
  }
}
