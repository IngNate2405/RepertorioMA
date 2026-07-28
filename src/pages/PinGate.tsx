import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Music } from 'lucide-react'
import { useRole } from '../contexts/RoleContext'

export default function PinGate() {
  const { login } = useRole()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') || '/'
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const role = await login(pin)
      if (!role) {
        setError('PIN incorrecto')
        return
      }
      navigate(next, { replace: true })
    } catch {
      setError('No se pudo verificar el PIN. Revisa tu conexión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-bg px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-accent-500/15 flex items-center justify-center mb-4">
        <Music size={28} className="text-accent-500" />
      </div>
      <h1 className="text-xl font-bold text-t1">Repertorio</h1>
      <p className="text-t3 text-sm mt-1 mb-6">Ingresa el PIN de tu grupo</p>
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-3">
        <input
          className="input-base text-center tracking-widest text-lg"
          type="password"
          inputMode="text"
          autoFocus
          placeholder="PIN"
          value={pin}
          onChange={e => setPin(e.target.value)}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading || !pin}
          className="w-full rounded-xl bg-accent-500 text-black font-semibold py-2.5 disabled:opacity-50"
        >
          {loading ? 'Verificando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
