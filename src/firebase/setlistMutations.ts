import { apiPost } from '../lib/api'
import type { SetlistSongRef } from '../types'

export interface SaveSetlistInput {
  id?: string
  name: string
  date: string
  songs: SetlistSongRef[]
}

/** Crea o actualiza un setlist. Requiere el PIN de admin. */
export function saveSetlist(pin: string, input: SaveSetlistInput) {
  return apiPost<{ id: string }>('/api/save-setlist', { pin, ...input })
}

/** Marca un setlist como "current" — el que ve el usuario en Inicio. Desmarca cualquier otro. */
export function markSetlistCurrent(pin: string, id: string) {
  return apiPost<{ ok: true }>('/api/mark-setlist-current', { pin, id })
}

/** Marca un setlist como tocado y suma 1 a las estadísticas de cada canción incluida. */
export function markSetlistPlayed(pin: string, id: string) {
  return apiPost<{ ok: true }>('/api/mark-setlist-played', { pin, id })
}

/** Elimina un setlist. Requiere el PIN de admin. */
export function deleteSetlist(pin: string, id: string) {
  return apiPost<{ ok: true }>('/api/delete-setlist', { pin, id })
}
