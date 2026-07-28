import { useState } from 'react'

const KEY = 'repertorio_uppercase'

/** Preferencia de vista local (no compartida): mostrar la letra en mayúsculas. */
export function useUppercase() {
  const [uppercase, setUppercaseState] = useState(() => localStorage.getItem(KEY) === '1')

  function setUppercase(value: boolean) {
    localStorage.setItem(KEY, value ? '1' : '0')
    setUppercaseState(value)
  }

  return [uppercase, setUppercase] as const
}
