import { useEffect } from 'react'

/** Mantiene la pantalla encendida mientras el componente está montado (ej. modo presentación).
 *  Progressive enhancement — no falla si el navegador no soporta la API. */
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return

    let sentinel: WakeLockSentinel | null = null
    let cancelled = false

    async function request() {
      try {
        sentinel = await navigator.wakeLock.request('screen')
      } catch {
        // el usuario puede haber denegado o el dispositivo no lo soporta en este contexto — no es crítico
      }
    }

    function handleVisibility() {
      if (document.visibilityState === 'visible' && !cancelled) request()
    }

    request()
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibility)
      sentinel?.release().catch(() => {})
    }
  }, [enabled])
}
