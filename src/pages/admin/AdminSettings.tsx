import { useEffect, useState } from 'react'
import { Moon, Plus, Sun, Trash2 } from 'lucide-react'
import Layout from '../../components/layout/Layout'
import { getPins, updatePins } from '../../firebase/accessMutations'
import { listenTags } from '../../firebase/tagService'
import { saveTags } from '../../firebase/tagMutations'
import { useDarkMode } from '../../hooks/useDarkMode'
import { useRole } from '../../contexts/RoleContext'
import type { Tag } from '../../types'

function newTagId() {
  return crypto.randomUUID()
}

function TagsSection({ pin }: { pin: string | null }) {
  const [tags, setTags] = useState<Tag[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => listenTags(loaded => setTags(prev => (prev === null ? loaded : prev))), [])

  function updateName(id: string, name: string) {
    setTags(prev => (prev ? prev.map(t => (t.id === id ? { ...t, name } : t)) : prev))
    setSuccess(false)
  }

  function addTag() {
    setTags(prev => [...(prev ?? []), { id: newTagId(), name: '' }])
    setSuccess(false)
  }

  function removeTag(id: string) {
    setTags(prev => (prev ? prev.filter(t => t.id !== id) : prev))
    setSuccess(false)
  }

  async function handleSave() {
    if (!pin || !tags) return
    setError('')
    setSaving(true)
    try {
      await saveTags(pin, tags)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar las etiquetas')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3 pt-2 border-t border-br2">
      <div>
        <label className="field-label">Etiquetas de canciones</label>
        <p className="text-[11px] text-t3 mt-1">Ej. Adoración, Alabanza — se usan para clasificar y filtrar canciones.</p>
      </div>

      {tags === null ? (
        <div className="text-center text-t3 text-sm py-2">Cargando…</div>
      ) : (
        <div className="space-y-2">
          {tags.map(tag => (
            <div key={tag.id} className="flex items-center gap-2">
              <input
                className="input-base"
                value={tag.name}
                onChange={e => updateName(tag.id, e.target.value)}
                placeholder="Nombre de la etiqueta"
              />
              <button onClick={() => removeTag(tag.id)} className="text-t4 shrink-0" aria-label="Quitar etiqueta">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {tags.length === 0 && (
            <p className="text-xs text-t3 text-center py-2">Todavía no hay etiquetas.</p>
          )}
        </div>
      )}

      <button onClick={addTag} disabled={tags === null} className="flex items-center gap-1 text-xs text-accent-500 font-medium">
        <Plus size={13} /> Agregar etiqueta
      </button>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {success && <p className="text-sm text-accent-500">Etiquetas actualizadas.</p>}

      <button
        onClick={handleSave}
        disabled={tags === null || saving}
        className="w-full rounded-xl bg-s2 border border-br text-t1 font-semibold py-2.5 disabled:opacity-50"
      >
        {saving ? 'Guardando…' : 'Guardar etiquetas'}
      </button>
    </div>
  )
}

function DarkModeSection() {
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
        <DarkModeSection />

        <div className="pt-2 border-t border-br2">
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

        <TagsSection pin={pin} />
      </div>
    </Layout>
  )
}
