import { collection, doc, getDocs, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { db } from './config'
import type { Song, SongPhoto } from '../types'

const songsCol = collection(db, 'songs')

export function listenSongs(callback: (songs: Song[]) => void) {
  const q = query(songsCol, orderBy('title'))
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Song))
  })
}

export function listenSong(songId: string, callback: (song: Song | null) => void) {
  return onSnapshot(doc(db, 'songs', songId), snap => {
    callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as Song) : null)
  })
}

export function listenSongPhotos(songId: string, callback: (photos: SongPhoto[]) => void) {
  const q = query(collection(db, 'songs', songId, 'photos'), orderBy('page'))
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }) as SongPhoto))
  })
}

/** Búsqueda puntual (no listener) para detectar si ya existe una canción con ese título — no requiere PIN, es lectura. */
export async function findSongByNormalizedTitle(titleNormalized: string): Promise<Song | null> {
  const q = query(songsCol, where('titleNormalized', '==', titleNormalized), limit(1))
  const snap = await getDocs(q)
  return snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as Song)
}
