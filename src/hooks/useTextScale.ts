import { useState } from 'react'

const KEY = 'repertorio_text_scale'
export const TEXT_SCALE_MIN = 0.7
export const TEXT_SCALE_MAX = 1.6
const STEP = 0.1
const DEFAULT_SCALE = 1

/** Preferencia de vista local (no compartida): tamaño de letra en modo presentación. */
export function useTextScale() {
  const [scale, setScaleState] = useState(() => {
    const stored = Number(localStorage.getItem(KEY))
    return stored >= TEXT_SCALE_MIN && stored <= TEXT_SCALE_MAX ? stored : DEFAULT_SCALE
  })

  function setScale(value: number) {
    const clamped = Math.min(TEXT_SCALE_MAX, Math.max(TEXT_SCALE_MIN, Math.round(value * 10) / 10))
    localStorage.setItem(KEY, String(clamped))
    setScaleState(clamped)
  }

  return {
    scale,
    increase: () => setScale(scale + STEP),
    decrease: () => setScale(scale - STEP),
  }
}
