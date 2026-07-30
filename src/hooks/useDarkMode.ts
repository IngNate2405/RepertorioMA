import { useState } from 'react'

const KEY = 'repertorio_dark_mode'

/** Preferencia de vista local (no compartida): tema oscuro para toda la app. */
export function useDarkMode() {
  const [darkMode, setDarkModeState] = useState(() => localStorage.getItem(KEY) === '1')

  function setDarkMode(value: boolean) {
    localStorage.setItem(KEY, value ? '1' : '0')
    document.documentElement.classList.toggle('dark', value)
    setDarkModeState(value)
  }

  return [darkMode, setDarkMode] as const
}
