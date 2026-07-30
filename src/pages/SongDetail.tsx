import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CaseUpper, Eye, EyeOff, Pencil, CirclePlay, Music2 } from 'lucide-react'
import Layout from '../components/layout/Layout'
import ChordProView from '../components/ChordProView'
import TransposeControls from '../components/TransposeControls'
import { listenSong } from '../firebase/songService'
import { listenTags } from '../firebase/tagService'
import { useHideChords } from '../hooks/useHideChords'
import { useUppercase } from '../hooks/useUppercase'
import { useRole } from '../contexts/RoleContext'
import type { Song, Tag } from '../types'

export default function SongDetail() {
  const { id } = useParams<{ id: string }>()
  const { role } = useRole()
  const [song, setSong] = useState<Song | null | undefined>(undefined)
  const [tags, setTags] = useState<Tag[]>([])
  const [semitones, setSemitones] = useState(0)
  const [hideChords, setHideChords] = useHideChords()
  const [uppercase, setUppercase] = useUppercase()

  useEffect(() => {
    if (!id) return
    setSemitones(0)
    return listenSong(id, setSong)
  }, [id])

  useEffect(() => listenTags(setTags), [])

  const tag = song && song.tagId ? tags.find(t => t.id === song.tagId) : undefined

  if (song === undefined) {
    return (
      <Layout title="Canción">
        <div className="pt-10 text-center text-t3 text-sm">Cargando…</div>
      </Layout>
    )
  }

  if (song === null) {
    return (
      <Layout title="Canción">
        <div className="pt-10 text-center text-t3 text-sm">No se encontró esta canción.</div>
      </Layout>
    )
  }

  return (
    <Layout
      title={song.title}
      headerRight={
        role === 'admin' && (
          <Link
            to={`/admin/canciones/${song.id}/editar`}
            className="w-9 h-9 rounded-full bg-s2 border border-br flex items-center justify-center text-t1"
          >
            <Pencil size={16} />
          </Link>
        )
      }
    >
      <div className="pt-3 space-y-3">
        {(song.artist || tag) && (
          <div className="flex items-center gap-2 -mt-1">
            {song.artist && <div className="text-sm text-t3">{song.artist}</div>}
            {tag && (
              <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-accent-500/15 text-accent-500 border border-accent-500/30">
                {tag.name}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="flex-1">
            <TransposeControls originalKey={song.originalKey} semitones={semitones} onChange={setSemitones} />
          </div>
          <button
            onClick={() => setUppercase(!uppercase)}
            className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${uppercase ? 'bg-accent-500/15 border-accent-500/40 text-accent-500' : 'bg-s2 border-br text-t1'}`}
            aria-label={uppercase ? 'Ver letra original' : 'Ver letra en mayúsculas'}
          >
            <CaseUpper size={18} />
          </button>
          <button
            onClick={() => setHideChords(!hideChords)}
            className="w-10 h-10 rounded-xl bg-s2 border border-br flex items-center justify-center text-t1 shrink-0"
            aria-label={hideChords ? 'Mostrar acordes' : 'Ocultar acordes'}
          >
            {hideChords ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {(song.youtubeUrl || song.spotifyUrl) && (
          <div className="flex gap-2">
            {song.youtubeUrl && (
              <a href={song.youtubeUrl} target="_blank" rel="noreferrer" className="card flex items-center gap-1.5 px-3 py-1.5 text-xs text-t2">
                <CirclePlay size={14} className="text-red-400" /> YouTube
              </a>
            )}
            {song.spotifyUrl && (
              <a href={song.spotifyUrl} target="_blank" rel="noreferrer" className="card flex items-center gap-1.5 px-3 py-1.5 text-xs text-t2">
                <Music2 size={14} className="text-green-400" /> Spotify
              </a>
            )}
          </div>
        )}

        <div className="card p-4">
          <ChordProView chordProText={song.chordProText} transposeSemitones={semitones} hideChords={hideChords} uppercase={uppercase} />
        </div>
      </div>
    </Layout>
  )
}
