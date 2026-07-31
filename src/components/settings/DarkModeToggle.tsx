import { Moon, Sun } from 'lucide-react'
import { useDarkMode } from '../../hooks/useDarkMode'

export default function DarkModeToggle() {
  const [darkMode, setDarkMode] = useDarkMode()

  return (
    <div className="space-y-2">
      <label className="field-label">Apariencia</label>
      <button
        onClick={() => setDarkMode(!darkMode)}
        className="w-full flex items-center justify-between rounded-xl bg-s2 border border-br px-3 py-2.5"
      >
        <span className="flex items-center gap-2 text-sm text-t1">
          {darkMode ? <Moon size={16} className="text-accent-500" /> : <Sun size={16} className="text-accent-500" />}
          Modo oscuro
        </span>
        <span
          className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-colors ${darkMode ? 'bg-accent-500 justify-end' : 'bg-br justify-start'}`}
        >
          <span className="w-5 h-5 rounded-full bg-white shadow" />
        </span>
      </button>
    </div>
  )
}
