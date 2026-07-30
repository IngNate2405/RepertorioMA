import { apiPost } from '../lib/api'

/** Lee los PINs actuales (admin/usuario). Requiere el PIN de admin. */
export function getPins(pin: string) {
  return apiPost<{ adminPin: string; userPin: string }>('/api/get-pins', { pin })
}

/** Cambia los PINs de admin/usuario. Requiere el PIN de admin actual para autorizar el cambio. */
export function updatePins(pin: string, next: { adminPin: string; userPin: string }) {
  return apiPost<{ ok: true }>('/api/update-pins', { pin, ...next })
}
