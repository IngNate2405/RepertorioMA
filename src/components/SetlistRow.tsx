import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Pencil, Play, Star } from 'lucide-react'
import SwipeToDelete from './SwipeToDelete'
import { transposeChord } from '../lib/chordpro'
import type { Setlist, Song } from '../types'

interface Props {
  setlist: Setlist
  songMap: Map<string, Song>
  pinned?: boolean
  /** "presentar": tocar entra a modo presentación (Inicio). "editar": tocar lleva a editar el setlist (Admin). */
  variant: 'presentar' | 'editar'
  /** Si se pasa, la fila queda envuelta en SwipeToDelete. */
  onDelete?: () => void
}

/** Fila de setlist colapsable — por defecto solo nombre/fecha, se expande para ver las canciones. */
export default function SetlistRow({ setlist, songMap, pinned, variant, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false)
  const isAdmin = variant === 'editar'
  const primaryTo = isAdmin ? `/admin/setlists/${setlist.id}/editar` : `/setlists/${setlist.id}/presentar`

  const content = (
    <div className={`card overflow-hidden ${pinned ? 'card-pinned' : ''}`}>
      <div className="flex items-center gap-2 px-3 py-3">
        <button onClick={() => setExpanded(v => !v)} className="flex-1 min-w-0 flex items-center gap-2 text-left">
          <ChevronDown size={16} className={`text-t3 shrink-0 transition-transform ${expanded ? '' : '-rotate-90'}`} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-t1 truncate">{setlist.name}</span>
              {pinned && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-accent-500 bg-accent-500/15 rounded-full px-2 py-0.5 shrink-0">
                  <Star size={10} /> Fijada
                </span>
              )}
            </div>
            <div className="text-xs text-t3">{setlist.date} · {setlist.songs.length} canciones</div>
          </div>
        </button>
        {(isAdmin || setlist.songs.length > 0) && (
          <Link
            to={primaryTo}
            className="shrink-0 flex items-center gap-1 rounded-full bg-accent-500 text-black text-xs font-semibold px-3 py-1.5"
          >
            {isAdmin ? <Pencil size={12} /> : <Play size={12} />} {isAdmin ? 'Editar' : 'Presentar'}
          </Link>
        )}
      </div>

      {expanded && (
        <div className="border-t border-br divide-y divide-br">
          {setlist.songs.length === 0 ? (
            <div className="px-3 py-3 text-xs text-t3 text-center">Sin canciones.</div>
          ) : (
            setlist.songs.map((entry, i) => {
              const song = songMap.get(entry.songId)
              const key = song ? transposeChord(song.originalKey, entry.keyOverrideSemitones ?? 0) : '?'
              return (
                <Link
                  key={entry.songId}
                  to={primaryTo}
                  state={isAdmin ? undefined : { index: i }}
                  className="flex items-center gap-3 px-3 py-2.5"
                >
                  <div className="w-6 h-6 rounded-lg bg-accent-500/15 flex items-center justify-center shrink-0 text-[11px] text-accent-500 font-semibold">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1 text-sm text-t1 truncate">{song?.title ?? 'Canción'}</div>
                  <div className="text-xs text-t3 shrink-0">{key}</div>
                </Link>
              )
            })
          )}
        </div>
      )}
    </div>
  )

  return onDelete ? <SwipeToDelete onDelete={onDelete}>{content}</SwipeToDelete> : content
}
