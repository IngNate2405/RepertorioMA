import { useEffect, useState } from 'react'
import Layout from '../../components/layout/Layout'
import { getPins, updatePins } from '../../firebase/accessMutations'
import { useRole } from '../../contexts/RoleContext'

export default function AdminSettings() {
  const { pin, login } = useRole()
  const [adminPin, setAdminPin] = useState('')
  const [userPin, setUserPin] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!pin) return
    getPins(pin)
      .then(data => {
        setAdminPin(data.adminPin)
        setUserPin(data.userPin)
        setLoaded(true)
      })
      .catch(err => setError(err instanceof Error ? err.message : 'No se pudieron cargar los PINs'))
  }, [pin])

  async function handleSave() {
    if (!pin) return
    setError('')
    setSuccess(false)
    setSaving(true)
    try {
      await updatePins(pin, { adminPin: adminPin.trim(), userPin: userPin.trim() })
      // Refresca la sesión con el PIN de admin nuevo — si no, las siguientes
      // acciones de admin fallarían con "PIN inválido" hasta volver a entrar.
      await login(adminPin.trim())
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los PINs')
    } finally {
      setSaving(false)
    }
  }

  const canSave = loaded && adminPin.trim().length >= 4 && userPin.trim().length >= 4 && !saving

  return (
    <Layout title="Configuración">
      <div className="pt-3 space-y-4 pb-6">
        <div>
          <label className="field-label mb-1">PIN de administrador</label>
          <input
            className="input-base"
            value={adminPin}
            onChange={e => { setAdminPin(e.target.value); setSuccess(false) }}
            placeholder={loaded ? '' : 'Cargando…'}
            disabled={!loaded}
          />
        </div>

        <div>
          <label className="field-label mb-1">PIN de usuario</label>
          <input
            className="input-base"
            value={userPin}
            onChange={e => { setUserPin(e.target.value); setSuccess(false) }}
            placeholder={loaded ? '' : 'Cargando…'}
            disabled={!loaded}
          />
        </div>

        <p className="text-[11px] text-t3">
          Los músicos que ya entraron a la app no se ven afectados por el cambio — solo necesitarán el PIN
          nuevo la próxima vez que inicien sesión desde cero.
        </p>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {success && <p className="text-sm text-accent-500">PINs actualizados.</p>}

        <button
          onClick={handleSave}
          disabled={!canSave}
          className="w-full rounded-xl bg-accent-500 text-black font-semibold py-2.5 disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </Layout>
  )
}
