import { MuseTalkAvatarProvider } from './MuseTalkAvatarProvider.js'
import { NullAvatarProvider } from './NullAvatarProvider.js'

/**
 * Provider registry. Adding a vendor means adding one factory here and one
 * `avatarProvider` enum value in the backend schema — nothing in the interview
 * pipeline changes.
 *
 * @type {Record<string, (opts: object) => import('./AvatarProvider.js').AvatarProvider>}
 */
const FACTORIES = {
  none: () => new NullAvatarProvider(),
  musetalk: (opts) => new MuseTalkAvatarProvider(opts),
  // TODO: tavus, simli, volcengine
}

export function isProviderRegistered(name) {
  return Object.prototype.hasOwnProperty.call(FACTORIES, name)
}

export function registeredProviders() {
  return Object.keys(FACTORIES)
}

/**
 * Build a provider by name. Unknown names fall back to the null provider so a
 * profile referencing a not-yet-implemented vendor degrades to a static
 * portrait instead of crashing the interview screen.
 *
 * @param {string} name
 * @param {object} [opts]
 * @returns {{ provider: import('./AvatarProvider.js').AvatarProvider, fellBack: boolean, reason?: string }}
 */
export function createAvatarProvider(name, opts = {}) {
  const factory = FACTORIES[name]
  if (!factory) {
    return {
      provider: new NullAvatarProvider(),
      fellBack: true,
      reason: `Unknown avatar provider "${name}" — falling back to static portrait`,
    }
  }
  return { provider: factory(opts), fellBack: false }
}

/**
 * Build the requested provider, but fall back to the null provider when it
 * reports itself unavailable. This is the call the UI should use.
 */
export async function createAvailableAvatarProvider(name, opts = {}) {
  const { provider, fellBack, reason } = createAvatarProvider(name, opts)
  if (fellBack) return { provider, fellBack, reason }

  const { available, reason: why } = await provider.checkAvailability()
  if (available) return { provider, fellBack: false }

  provider.destroy()
  return {
    provider: new NullAvatarProvider(),
    fellBack: true,
    reason: why || `Provider "${name}" unavailable`,
  }
}
