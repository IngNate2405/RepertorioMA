import { apiPost } from '../lib/api'

export interface SaveSongInput {
  id?: string
  title: string
  artist?: string
  originalKey: string
  chordProText: string
  youtubeUrl?: string
  spotifyUrl?: string
  photos?: { base64: string; page: number }[]
}

/** Crea o actualiza una canción. Requiere el PIN de admin — pasa por una función Netlify con firebase-admin. */
export function saveSong(pin: string, input: SaveSongInput) {
  return apiPost<{ id: string }>('/api/save-song', { pin, ...input })
}

/** Elimina una canción y sus fotos de referencia. Requiere el PIN de admin. */
export function deleteSong(pin: string, id: string) {
  return apiPost<{ ok: true }>('/api/delete-song', { pin, id })
}
