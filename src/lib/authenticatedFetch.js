import { supabase } from './supabase'

let refreshPromise = null

async function refreshSessionOnce() {
  if (!refreshPromise) {
    refreshPromise = supabase.auth.refreshSession()
      .finally(() => { refreshPromise = null })
  }
  const { data, error } = await refreshPromise
  if (error || !data.session?.access_token) {
    const authError = new Error(error?.message || 'Authentication session expired')
    authError.code = 'AUTH_EXPIRED'
    throw authError
  }
  return data.session
}

export async function getValidSession(forceRefresh = false, rejectedAccessToken = '') {
  if (forceRefresh) {
    // Another request may already have refreshed the session while this one
    // was waiting for its 401 response. Reuse that newer token instead of
    // rotating the refresh token again.
    if (rejectedAccessToken) {
      const { data } = await supabase.auth.getSession()
      const current = data.session
      if (current?.access_token && current.access_token !== rejectedAccessToken) return current
    }
    return refreshSessionOnce()
  }

  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.access_token) {
    const authError = new Error(error?.message || 'Missing authenticated session')
    authError.code = 'AUTH_EXPIRED'
    throw authError
  }

  const expiresAtMs = Number(data.session.expires_at || 0) * 1000
  if (expiresAtMs && expiresAtMs <= Date.now() + 60_000) return refreshSessionOnce()
  return data.session
}

export async function authenticatedFetch(url, options = {}) {
  const send = (accessToken) => fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const session = await getValidSession()
  let response = await send(session.access_token)
  if (response.status !== 401) return response

  const refreshedSession = await getValidSession(true, session.access_token)
  response = await send(refreshedSession.access_token)
  if (response.status === 401) {
    // The backend has rejected both the stored token and a newly refreshed
    // token. Keeping that session in browser storage leaves protected pages
    // accessible but every API call fails, so clear it and let the route guard
    // take the user back to sign-in.
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
    const authError = new Error('Backend rejected a freshly renewed session')
    authError.code = 'AUTH_REJECTED'
    throw authError
  }
  return response
}
