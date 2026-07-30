import { apiPost } from '../lib/api'
import type { Tag } from '../types'

/** Reemplaza la lista completa de etiquetas. Requiere el PIN de admin. */
export function saveTags(pin: string, tags: Tag[]) {
  return apiPost<{ ok: true }>('/api/save-tags', { pin, tags })
}
