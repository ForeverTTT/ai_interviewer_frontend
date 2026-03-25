/**
 * Backend API origin for fetch calls. Set VITE_BACKEND_URL in .env (see .env.example).
 */
export function getBackendBaseUrl() {
  const raw = import.meta.env.VITE_BACKEND_URL
  if (raw != null && String(raw).trim() !== '') {
    return String(raw).replace(/\/$/, '')
  }
  return 'http://localhost:5000'
}
