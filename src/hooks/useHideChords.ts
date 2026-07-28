import { useState } from 'react'

const KEY = 'repertorio_hide_chords'

/** Preferencia de vista local (no compartida): ocultar acordes para cantantes. */
export function useHideChords() {
  const [hideChords, setHideChordsState] = useState(() => localStorage.getItem(KEY) === '1')

  function setHideChords(value: boolean) {
    localStorage.setItem(KEY, value ? '1' : '0')
    setHideChordsState(value)
  }

  return [hideChords, setHideChords] as const
}
