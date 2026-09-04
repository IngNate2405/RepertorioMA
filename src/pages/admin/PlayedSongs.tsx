import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp } from 'lucide-react'
import Layout from '../../components/layout/Layout'
import BackButton from '../../components/layout/BackButton'
import { listenSongs } from '../../firebase/songService'
import { formatDateDMY } from '../../lib/date'
import type { Song } from '../../types'

export default function PlayedSongs() {
  const [songs, setSongs] = useState<Song[] | null>(null)

  useEffect(() => listenSongs(setSongs), [])

  const played = useMemo(
    () => (songs ?? []).filter(s => s.timesPlayed > 0).sort((a, b) => b.timesPlayed - a.timesPlayed),
    [songs]
  )

  return (
    <Layout title="Canciones tocadas" headerLeft={<BackButton />}>
      <div className="pt-3 space-y-2 pb-6">
        {songs === null && <div className="pt-8 text-center text-t3 text-sm">Cargando…</div>}

        {songs !== null && played.length === 0 && (
          <div className="text-center text-t3 text-sm py-10">
            Todavía no se ha marcado ningún setlist como tocado.
          </div>
        )}

        {played.length > 0 && (
          <div className="card divide-y divide-br">
            {played.map(song => (
              <Link key={song.id} to={`/canciones/${song.id}`} className="flex items-center gap-3 px-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-t1 truncate">{song.title}</div>
                  {song.lastPlayedAt && (
                    <div className="text-xs text-t3">Última vez: {formatDateDMY(new Date(song.lastPlayedAt))}</div>
                  )}
                </div>
                <div className="flex items-center gap-1 text-accent-500 text-xs font-semibold shrink-0">
                  <TrendingUp size={12} /> {song.timesPlayed}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
