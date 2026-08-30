import { useEffect, useState } from 'react'

function storageKey(setlistId: string, songId: string) {
  return `repertorio_local_key_${setlistId}_${songId}`
}

/**
 * Ajuste de tono PERSONAL (solo este teléfono, nunca se comparte) — un
 * usuario normal no puede cambiar el tono compartido del setlist, pero sí
 * puede "nudgearlo" para sí mismo encima del tono que haya fijado el admin.
 * Se guarda por setlist+canción en localStorage, así queda para la próxima
 * vez que abra ese mismo setlist en ese mismo teléfono.
 */
export function useLocalKeyAdjust(setlistId: string | undefined, songId: string | undefined) {
  const [delta, setDeltaState] = useState(0)

  useEffect(() => {
    if (!setlistId || !songId) {
      setDeltaState(0)
      return
    }
    const stored = Number(localStorage.getItem(storageKey(setlistId, songId)))
    setDeltaState(Number.isFinite(stored) ? stored : 0)
  }, [setlistId, songId])

  function setDelta(next: number) {
    if (!setlistId || !songId) return
    setDeltaState(next)
    const key = storageKey(setlistId, songId)
    if (next === 0) localStorage.removeItem(key)
    else localStorage.setItem(key, String(next))
  }

  return {
    delta,
    increase: () => setDelta(delta + 1),
    decrease: () => setDelta(delta - 1),
  }
}
