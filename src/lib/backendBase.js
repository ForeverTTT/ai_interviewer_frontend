/**
 * Backend API origin for fetch calls. Set VITE_BACKEND_URL in .env (see .env.example).
 */
export function getBackendBaseUrl() {
  const raw = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL
  if (raw != null && String(raw).trim() !== '') {
    return String(raw).replace(/\/$/, '')
  }
  // Fallback to a smart guess if we are on a production-like domain
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    // If we're online but VITE_API_URL is missing, we should at least not hit localhost.
    // In your specific case, I'll point it to the known Cloud Run URL as a ultimate fallback.
    return 'https://interview-backend-530979174916.us-central1.run.app'
  }
  return 'http://localhost:5000'
}
