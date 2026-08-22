import { lazy } from 'react'

const RELOAD_PARAM = '__chunk_reload'

function isChunkLoadError(error) {
  const message = String(error?.message || error || '')
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Load failed/i.test(message)
}

/**
 * Recover once when a user still has an older HTML/entry bundle after a deploy.
 * The cache-busting query forces Firebase Hosting to return the current index.
 */
export function lazyWithReload(importer) {
  return lazy(async () => {
    const reloadKey = `chunk-reload:${window.location.pathname}`

    try {
      const module = await importer()
      sessionStorage.removeItem(reloadKey)

      const url = new URL(window.location.href)
      if (url.searchParams.has(RELOAD_PARAM)) {
        url.searchParams.delete(RELOAD_PARAM)
        window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
      }

      return module
    } catch (error) {
      if (isChunkLoadError(error) && sessionStorage.getItem(reloadKey) !== '1') {
        sessionStorage.setItem(reloadKey, '1')
        const url = new URL(window.location.href)
        url.searchParams.set(RELOAD_PARAM, Date.now().toString())
        window.location.replace(url.toString())
        return new Promise(() => {})
      }

      throw error
    }
  })
}
