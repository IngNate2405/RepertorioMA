import { createContext, useContext, useState, type ReactNode } from 'react'

export type Role = 'user' | 'admin' | null

// localStorage (no sessionStorage) a propósito — la sesión debe sobrevivir a
// cerrar y reabrir la app (PWA), no solo mientras la pestaña siga abierta.
// Se limpia únicamente con logout().
const STORAGE_KEY = 'repertorio_role'
const PIN_STORAGE_KEY = 'repertorio_pin'

interface RoleContextValue {
  role: Role
  /** El PIN de admin, necesario para autorizar cada función de escritura. Solo presente si role === 'admin'. */
  pin: string | null
  login: (pin: string) => Promise<Role>
  logout: () => void
}

const RoleContext = createContext<RoleContextValue | null>(null)

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'admin' || stored === 'user' ? stored : null
  })
  const [pin, setPin] = useState<string | null>(() => localStorage.getItem(PIN_STORAGE_KEY))

  async function login(candidatePin: string): Promise<Role> {
    const res = await fetch('/api/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: candidatePin }),
    })
    if (!res.ok) throw new Error('No se pudo verificar el PIN')
    const data = (await res.json()) as { role: Role }
    if (data.role) {
      localStorage.setItem(STORAGE_KEY, data.role)
      setRole(data.role)
      if (data.role === 'admin') {
        localStorage.setItem(PIN_STORAGE_KEY, candidatePin)
        setPin(candidatePin)
      }
    }
    return data.role
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(PIN_STORAGE_KEY)
    setRole(null)
    setPin(null)
  }

  return <RoleContext.Provider value={{ role, pin, login, logout }}>{children}</RoleContext.Provider>
}

export function useRole() {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error('useRole debe usarse dentro de RoleProvider')
  return ctx
}
