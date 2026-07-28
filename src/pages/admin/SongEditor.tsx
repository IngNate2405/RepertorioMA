import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import ChordSheetEditor from '../../components/ChordSheetEditor'
import ImageLightbox from '../../components/ImageLightbox'
import { listenSong, findSongByNormalizedTitle } from '../../firebase/songService'
import { saveSong } from '../../firebase/songMutations'
import { normalizeTitle } from '../../lib/text'
import { parseChordSheet, serializeChordSheet } from '../../lib/chordpro'
import { useRole } from '../../contexts/RoleContext'

interface ScanPrefill {
  title?: string
  originalKey?: string
  chordProText?: string
  photos?: { base64: string; page: number }[]
}

export default function SongEditor() {
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)
  const { pin } = useRole()
  const navigate = useNavigate()
  const location = useLocation()
  const loadedRef = useRef(false)
  const prefill = (location.state as ScanPrefill | null) ?? null

  const [title, setTitle] = useState(prefill?.title ?? '')
  const [artist, setArtist] = useState('')
  const [originalKey, setOriginalKey] = useState(prefill?.originalKey ?? '')
  const [chordProText, setChordProText] = useState(prefill?.chordProText ?? '')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [spotifyUrl, setSpotifyUrl] = useState('')
  const [scannedPhotos] = useState(prefill?.photos ?? [])

  const [duplicate, setDuplicate] = useState<{ id: string; title: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  // ChordSheetEditor solo lee su valor inicial una vez (para no perder lo que el
  // admin escribe si el prop cambiara después) — así que en modo edición hay que
  // esperar a que llegue el dato real de Firestore antes de montarlo.
  const [loaded, setLoaded] = useState(!isEditing)

  useEffect(() => {
    if (!id) return
    return listenSong(id, song => {
      if (song && !loadedRef.current) {
        loadedRef.current = true
        setTitle(song.title)
        setArtist(song.artist ?? '')
        setOriginalKey(song.originalKey)
        // Round-trip por parse/serialize migra automáticamente el formato viejo
        // de corchetes si esta canción se guardó antes del cambio de formato.
        setChordProText(serializeChordSheet(parseChordSheet(song.chordProText)))
        setYoutubeUrl(song.youtubeUrl ?? '')
        setSpotifyUrl(song.spotifyUrl ?? '')
        setLoaded(true)
      }
    })
  }, [id])

  async function checkDuplicate() {
    if (isEditing || !title.trim()) return
    const match = await findSongByNormalizedTitle(normalizeTitle(title))
    setDuplicate(match && match.id !== id ? { id: match.id, title: match.title } : null)
  }

  async function handleSave() {
    if (!pin) return
    setError('')
    setSaving(true)
    try {
      const { id: savedId } = await saveSong(pin, {
        id,
        title: title.trim(),
        artist: artist.trim(),
        originalKey: originalKey.trim(),
        chordProText,
        youtubeUrl: youtubeUrl.trim(),
        spotifyUrl: spotifyUrl.trim(),
        photos: scannedPhotos.length > 0 ? scannedPhotos : undefined,
      })
      navigate(`/canciones/${savedId}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la canción')
    } finally {
      setSaving(false)
    }
  }

  const canSave = title.trim() && originalKey.trim() && chordProText.trim() && !saving

  return (
    <Layout title={isEditing ? 'Editar canción' : 'Nueva canción'}>
      <div className="pt-3 space-y-3 pb-6">
        <div>
          <label className="field-label mb-1">Título</label>
          <input
            className="input-base"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={checkDuplicate}
            placeholder="Nombre de la canción"
          />
          {duplicate && (
            <p className="text-xs text-accent-500 mt-1">
              Ya existe "{duplicate.title}" —{' '}
              <Link to={`/admin/canciones/${duplicate.id}/editar`} className="underline">
                abrir esa canción
              </Link>{' '}
              en vez de crear una nueva.
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="field-label mb-1">Artista</label>
            <input className="input-base" value={artist} onChange={e => setArtist(e.target.value)} placeholder="Opcional" />
          </div>
          <div className="w-24">
            <label className="field-label mb-1">Tono</label>
            <input className="input-base" value={originalKey} onChange={e => setOriginalKey(e.target.value)} placeholder="D#" />
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="field-label mb-1">Link de YouTube</label>
            <input className="input-base" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="Opcional" />
          </div>
          <div className="flex-1">
            <label className="field-label mb-1">Link de Spotify</label>
            <input className="input-base" value={spotifyUrl} onChange={e => setSpotifyUrl(e.target.value)} placeholder="Opcional" />
          </div>
        </div>

        {scannedPhotos.length > 0 && (
          <div>
            <label className="field-label mb-1">Foto original (para comparar)</label>
            <div className="grid grid-cols-2 gap-2">
              {scannedPhotos.map((photo, i) => (
                <button key={i} onClick={() => setLightboxSrc(photo.base64)} className="block">
                  <img src={photo.base64} alt={`Página ${photo.page}`} className="rounded-xl border border-br w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="field-label mb-1">Letra y acordes</label>
          <p className="text-[11px] text-t3 mb-1.5">
            Escribe la letra abajo y el acorde arriba, usando espacios para ubicarlo donde suena.
          </p>
          {loaded ? (
            <div className="card p-3">
              <ChordSheetEditor value={chordProText} onChange={setChordProText} />
            </div>
          ) : (
            <div className="card p-4 text-center text-t3 text-sm">Cargando…</div>
          )}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          onClick={handleSave}
          disabled={!canSave}
          className="w-full rounded-xl bg-accent-500 text-black font-semibold py-2.5 disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar canción'}
        </button>
      </div>

      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </Layout>
  )
}
